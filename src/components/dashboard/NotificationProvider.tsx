import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef, type ReactNode } from "react";

export type NotificationKind =
  | "auth_login"
  | "auth_logout"
  | "auth_register"
  | "new_visitor"
  | "settings_update"
  | "comment"
  | "like"
  | "reply"
  | "csv_upload"
  | "transaction_cleared";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  actor?: string;
  object?: string;
  title: string;
  text: string;
  dedupeKey?: string;
  time: Date;
  unread: boolean;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  push: (input: { kind: NotificationKind; actor?: string; object?: string; title: string; text: string; dedupeKey?: string }) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  push: () => {},
  markAllRead: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

const SEEN_KEY = "notification_seen_keys";
const MAX_NOTIFICATIONS = 50;

function readSeenKeys(): Record<string, true> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeSeenKeys(keys: Record<string, true>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(keys));
  } catch {
    // ignore
  }
}

const ALLOWED_KINDS = new Set<NotificationKind>([
  "auth_login",
  "auth_logout",
  "auth_register",
  "new_visitor",
  "settings_update",
  "comment",
  "like",
  "reply",
  "csv_upload",
  "transaction_cleared",
]);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const seenKeysRef = useRef<Record<string, true>>({});

  useEffect(() => {
    seenKeysRef.current = readSeenKeys();
  }, []);

  const push = useCallback((input: { kind: NotificationKind; actor?: string; object?: string; title: string; text: string; dedupeKey?: string }) => {
    if (!ALLOWED_KINDS.has(input.kind)) return;
    const key = input.dedupeKey;
    const seen = seenKeysRef.current;
    if (key && seen[key]) return;
    if (key) {
      seen[key] = true;
      writeSeenKeys(seen);
    }
    const notif: AppNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: input.kind,
      actor: input.actor,
      object: input.object,
      title: input.title,
      text: input.text,
      dedupeKey: key,
      time: new Date(),
      unread: true,
    };
    setNotifications(prev => [notif, ...prev].slice(0, MAX_NOTIFICATIONS));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  }, []);

  const unreadCount = useMemo(() => notifications.reduce((count, n) => count + (n.unread ? 1 : 0), 0), [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, push, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
};
