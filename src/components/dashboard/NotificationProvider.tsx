import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface AppNotification {
  id: string;
  text: string;
  time: Date;
  unread: boolean;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  push: (text: string) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  push: () => {},
  markAllRead: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const push = useCallback((text: string) => {
    const notif: AppNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      time: new Date(),
      unread: true,
    };
    setNotifications(prev => [notif, ...prev].slice(0, 50)); // keep last 50
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  }, []);

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, push, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
};
