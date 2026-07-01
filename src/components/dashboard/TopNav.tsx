import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Bell, X, ChevronDown } from "lucide-react";
import { VisitorCounter } from "./VisitorCounter";
import { useAuth } from "./AuthProvider";
import { useNotifications } from "./NotificationProvider";
import { SettingsModal } from "./SettingsModal";
import { resolveAvatar } from "@/lib/avatar";

function formatRelativeTime(date: Date): string {
  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const TopNav = () => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const [profileDropdownPos, setProfileDropdownPos] = useState({ top: 0, right: 0 });
  const bellRef = useRef<HTMLButtonElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const { user, openAuth, logout, refreshUser } = useAuth();
  const { notifications, unreadCount, markAllRead } = useNotifications();

  const updateDropdownPos = useCallback(() => {
    if (bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, []);

  useEffect(() => {
    if (notifOpen) {
      updateDropdownPos();
      window.addEventListener("scroll", updateDropdownPos, true);
      window.addEventListener("resize", updateDropdownPos);
    }
    return () => {
      window.removeEventListener("scroll", updateDropdownPos, true);
      window.removeEventListener("resize", updateDropdownPos);
    };
  }, [notifOpen, updateDropdownPos]);

  const updateProfilePos = useCallback(() => {
    if (avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setProfileDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, []);

  useEffect(() => {
    if (profileOpen) {
      updateProfilePos();
      window.addEventListener("scroll", updateProfilePos, true);
      window.addEventListener("resize", updateProfilePos);
    }
    return () => {
      window.removeEventListener("scroll", updateProfilePos, true);
      window.removeEventListener("resize", updateProfilePos);
    };
  }, [profileOpen, updateProfilePos]);

  const [avatarErr, setAvatarErr] = useState(false);
  const prevUserIdRef = useRef(user?.id);

  useEffect(() => {
    if (prevUserIdRef.current !== user?.id) {
      setAvatarErr(false);
      prevUserIdRef.current = user?.id;
    }
  }, [user?.id]);

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "AM";

  const isLoading = user === undefined;
  const avatarUrl = !avatarErr && user?.avatar ? resolveAvatar(user.avatar) : null;

  return (
    <>
    <header className="flex items-center gap-4 mb-8 animate-fade-in">
      <div>
        <p className="text-xs text-white/40 font-medium tracking-widest uppercase">
          {new Date().toLocaleDateString("en-US", { weekday: "long" })} ·{" "}
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Welcome back, <span className="gradient-text">{user?.username || "Alex"}</span>
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <VisitorCounter />

        {/* Notification Bell */}
        <button
          ref={bellRef}
          className="w-11 h-11 rounded-[50%] grid place-items-center relative active:scale-[0.95] transition-transform"
          style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(32px)", border: "none" }}
          onClick={() => setNotifOpen(!notifOpen)}
        >
          <Bell size={16} className="text-white/70" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-neon-cyan text-[10px] font-bold text-black grid place-items-center px-1 shadow-[0_0_10px_hsl(var(--neon-cyan))]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* User profile pill */}
        <button
          ref={avatarRef}
          className="group flex items-center gap-3 px-2 h-12 rounded-full transition-all duration-300 ease-out cursor-pointer overflow-hidden select-none"
          style={{
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
          onClick={() => setProfileOpen(!profileOpen)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.16)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
          }}
        >
          {isLoading ? null : (
            <>
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user?.username} className="w-full h-full object-cover" onError={() => setAvatarErr(true)} />
                ) : (
                  <div className="w-full h-full grid place-items-center text-xs font-semibold text-white/80 bg-gradient-to-br from-violet-500 to-indigo-500">
                    {(user?.username || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {/* Username */}
              <span className="text-[13px] font-medium truncate max-w-[100px]" style={{ color: "rgba(255,255,255,0.9)" }}>
                {user?.username || "Guest"}
              </span>
              {/* Chevron */}
              <ChevronDown
                size={12}
                className="shrink-0 transition-transform duration-300"
                style={{ color: "rgba(255,255,255,0.5)", transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </>
          )}
        </button>
      </div>

      {/* Profile Dropdown — Portal to document.body */}
      {profileOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999]">
            <div className="absolute inset-0" onClick={() => setProfileOpen(false)} />
            <div
              className="absolute w-44 glass-strong rounded-2xl p-1.5 animate-dropdown-in overflow-hidden"
              style={{
                top: `${profileDropdownPos.top}px`,
                right: `${profileDropdownPos.right}px`,
              }}
            >
              {user ? (
                <>
                  <div className="px-3 py-2 border-b border-white/5 mb-1">
                    <p className="text-xs font-medium text-white">{user.username}</p>
                    {user.email && <p className="text-[10px] text-white/40 truncate">{user.email}</p>}
                  </div>
                  <button
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-white/70 hover:bg-white/5 transition-colors"
                    onClick={() => { setProfileOpen(false); setSettingsOpen(true); }}
                  >
                    Settings
                  </button>
                  <button
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-white/40 hover:bg-white/5 transition-colors"
                    onClick={() => { setProfileOpen(false); logout(); }}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-white/80 hover:bg-white/5 transition-colors"
                    onClick={() => { setProfileOpen(false); openAuth("login"); }}
                  >
                    Sign In
                  </button>
                  <button
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-white/80 hover:bg-white/5 transition-colors"
                    onClick={() => { setProfileOpen(false); openAuth("signup"); }}
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* Notification Dropdown — Portal to document.body */}
      {notifOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999]">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={() => { setNotifOpen(false); markAllRead(); }} />
            {/* Dropdown */}
            <div
              className="absolute w-80 glass-strong rounded-2xl p-2 animate-dropdown-in overflow-hidden"
              style={{
                top: `${dropdownPos.top}px`,
                right: `${dropdownPos.right}px`,
              }}
            >
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-xs font-semibold">Notifications</p>
                <button
                  className="text-[10px] text-white/40 hover:text-white transition-colors"
                  onClick={() => setNotifOpen(false)}
                >
                  <X size={12} />
                </button>
              </div>
              <div className="space-y-0.5 max-h-[320px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-[11px] text-white/30 text-center py-6">No notifications yet</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors flex items-start gap-3"
                    >
                      <span
                        className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                          n.unread
                            ? "bg-neon-cyan shadow-[0_0_6px_hsl(var(--neon-cyan))]"
                            : "bg-white/20"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-white/80 leading-relaxed">{n.text}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{formatRelativeTime(n.time)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-3 pt-2 pb-1 border-t border-white/5 mt-1">
                <button className="text-[10px] text-neon-cyan hover:text-white transition-colors w-full text-center">
                  View all notifications
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </header>

      {/* Settings Modal */}
      {settingsOpen && user && (
        <SettingsModal
          user={{ id: user.id, username: user.username, email: user.email, avatar: user.avatar }}
          onClose={() => setSettingsOpen(false)}
          onSaved={refreshUser}
        />
      )}
    </>
  );
};
