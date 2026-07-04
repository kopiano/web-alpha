import { useEffect, useRef } from "react";
import { recordVisit, sendVisitHeartbeat } from "@/api/visitor";
import { useAuth } from "./AuthProvider";
import { useNotifications } from "./NotificationProvider";
import { useLocation } from "react-router-dom";

const VISITOR_ID_KEY = "visitor_id";
const VISITOR_START_KEY = "visitor_started_at";
const VISITOR_PROFILE_KEY = "visitor_profile";
const VISITOR_LINKED_USER_KEY = "visitor_linked_user";
const VISITOR_ACCOUNT_MAP_KEY = "visitor_account_map";
const DEVICE_FINGERPRINT_KEY = "device_fingerprint";

function getDeviceFingerprint(): string {
  try {
    return [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.platform,
    ].join("|");
  } catch {
    return navigator.userAgent || "unknown";
  }
}

function readDeviceFingerprint(): string {
  const stored = localStorage.getItem(DEVICE_FINGERPRINT_KEY);
  if (stored) return stored;
  const fp = getDeviceFingerprint();
  localStorage.setItem(DEVICE_FINGERPRINT_KEY, fp);
  return fp;
}

type VisitorProfile = {
  ip?: string;
  visitorId?: string;
  country?: string;
  city?: string;
  location?: string;
};

/* ─── localStorage helpers ─── */

function readProfile(): VisitorProfile | null {
  try {
    const raw = localStorage.getItem(VISITOR_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeProfile(profile: VisitorProfile) {
  try {
    localStorage.setItem(VISITOR_PROFILE_KEY, JSON.stringify(profile));
  } catch { /* ignore */ }
}

function readAccountMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(VISITOR_ACCOUNT_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAccountMap(map: Record<string, string>) {
  try {
    localStorage.setItem(VISITOR_ACCOUNT_MAP_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

/* ─── visitor ID strategy ───
 *
 *  Guest → Login (1st account)   : promote guest visitor_id → same record
 *  Login → same account          : reuse persisted visitor_id
 *  Login → different account     : new visitor_id → separate record
 *  Guest (no prior login)        : create visitor_id, keep reusing it
 */

function getOrCreateVisitorId(username?: string): string {
  const currentId = localStorage.getItem(VISITOR_ID_KEY);
  const linkedUser = localStorage.getItem(VISITOR_LINKED_USER_KEY) || "";
  const accountMap = readAccountMap();

  if (username) {
    // 1) Known account → reuse its persisted visitor_id
    if (accountMap[username]) {
      localStorage.setItem(VISITOR_ID_KEY, accountMap[username]);
      localStorage.setItem(VISITOR_LINKED_USER_KEY, username);
      return accountMap[username];
    }

    // 2) Current visitor_id is unlinked (guest session) → promote it
    if (currentId && !linkedUser) {
      accountMap[username] = currentId;
      writeAccountMap(accountMap);
      localStorage.setItem(VISITOR_LINKED_USER_KEY, username);
      return currentId;
    }

    // 3) New / different account → fresh visitor_id
    const newId = crypto.randomUUID();
    accountMap[username] = newId;
    writeAccountMap(accountMap);
    localStorage.setItem(VISITOR_ID_KEY, newId);
    localStorage.setItem(VISITOR_LINKED_USER_KEY, username);
    return newId;
  }

  // Guest — reuse existing or create one
  if (currentId) return currentId;
  const newId = crypto.randomUUID();
  localStorage.setItem(VISITOR_ID_KEY, newId);
  return newId;
}

function getStartTime(visitorId: string) {
  try {
    const key = `${VISITOR_START_KEY}:${visitorId}`;
    const saved = localStorage.getItem(key);
    if (saved) return Number(saved) || Date.now();
    const now = Date.now();
    localStorage.setItem(key, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

function buildPayload(visitorId: string, startAt: number, userName?: string) {
  const duration = Math.max(0, Math.floor((Date.now() - startAt) / 1000));
  return {
    visitor_id: visitorId,
    device_fingerprint: readDeviceFingerprint(),
    duration,
    path: window.location.pathname,
    referrer: document.referrer || undefined,
    title: document.title || undefined,
    user_agent: navigator.userAgent,
    user_name: userName || undefined,
  };
}

function heartbeatUrl() {
  const base = import.meta.env.VITE_API_URL || "";
  return `${base.replace(/\/$/, "")}/visit/heartbeat`;
}

/* ─── component ─── */

export const VisitorTracker = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { push: pushNotification } = useNotifications();
  const username = user?.username;
  const profileRef = useRef<VisitorProfile>(readProfile() || {});
  const visitorIdRef = useRef<string>(getOrCreateVisitorId(username));
  const startAtRef = useRef<number>(getStartTime(visitorIdRef.current));
  const heartbeatRef = useRef<number | null>(null);
  const sentFirstRef = useRef(false);
  const prevUsernameRef = useRef<string | undefined>(username);
  const notifSentRef = useRef(false);

  // When username changes (login / logout / switch account), refresh the
  // visitor_id and trigger a re-send so the backend updates user_name promptly.
  useEffect(() => {
    if (prevUsernameRef.current === username) return;
    prevUsernameRef.current = username;

    const newId = getOrCreateVisitorId(username);
    if (newId !== visitorIdRef.current) {
      visitorIdRef.current = newId;
      startAtRef.current = getStartTime(newId);
    }
    sentFirstRef.current = false;
    notifSentRef.current = false;
  }, [username]);

  useEffect(() => {
    const visitorId = visitorIdRef.current;
    const startAt = startAtRef.current;

    const applyServerProfile = (response: any) => {
      const data = response?.data?.data || response?.data || {};
      const ip = data?.ip || data?.client_ip || data?.clientIp || data?.remote_ip || data?.remoteIp || data?.visitor_ip || null;
      if (!ip) return;
      const country = data?.country ?? profileRef.current.country ?? "";
      const city = data?.city ?? profileRef.current.city ?? "";
      const location = data?.location ?? profileRef.current.location ?? "";
      profileRef.current = { ip, visitorId, country, city, location };
      writeProfile(profileRef.current);
      // Push new-visitor notification once per session when location is first known
      if (!notifSentRef.current && country) {
        notifSentRef.current = true;
        const loc = city && city !== country ? `${city}, ${country}` : country;
        pushNotification(`New visitor from ${loc}`);
      }
      // Notify VisitorCounter to re-read location data
      window.dispatchEvent(new CustomEvent("visitor-profile-updated"));
    };

    const sendVisit = async () => {
      const res = await recordVisit(buildPayload(visitorId, startAt, username)).catch(() => null);
      if (res) applyServerProfile(res);
    };
    const sendHeartbeat = async () => {
      const res = await sendVisitHeartbeat(buildPayload(visitorId, startAt, username)).catch(() => null);
      if (res) applyServerProfile(res);
    };

    if (!sentFirstRef.current) {
      sentFirstRef.current = true;
      sendVisit();
    }

    heartbeatRef.current = window.setInterval(sendHeartbeat, 45000);

    const handlePageHide = () => {
      navigator.sendBeacon?.(
        heartbeatUrl(),
        new Blob([JSON.stringify(buildPayload(visitorId, startAt, username))], { type: "application/json" }),
      );
    };

    window.addEventListener("beforeunload", handlePageHide);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
      window.removeEventListener("beforeunload", handlePageHide);
      window.removeEventListener("pagehide", handlePageHide);
      void sendHeartbeat();
    };
  }, [location.pathname, username]);

  return null;
};
