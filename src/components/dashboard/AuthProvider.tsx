import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthModal } from "./AuthModal";
import { getMe, logout as logoutApi } from "@/api/auth";
import { useNotifications } from "./NotificationProvider";
import { toast } from "sonner";

// undefined = still loading, null = logged out, User = logged in
type UserState = User | null | undefined;

interface User {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
}

interface AuthContextType {
  user: UserState;
  openAuth: (mode?: "login" | "signup") => void;
  logout: () => Promise<void>;
  refreshUser: (notifyLogin?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: undefined,
  openAuth: () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authOpen, setAuthOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<"login" | "signup">("login");
  const [user, setUser] = useState<UserState>(undefined);
  const prevUserRef = useRef<UserState>(undefined);
  const { push: pushNotification } = useNotifications();
  const queryClient = useQueryClient();

  const refreshUser = useCallback(async (notifyLogin = false) => {
    const token = localStorage.getItem("token");
    if (!token) { setUser(null); return; }
    try {
      const res = await getMe();
      const newUser = res.data.data as User;
      setUser(newUser);
      await queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
      void queryClient.prefetchQuery({
        queryKey: ["chat", "conversations"],
        queryFn: async () => {
          const request = await import("@/api/request");
          const res = await request.default.get("/chat/conversations");
          return res.data?.data?.conversations ?? [];
        },
      });
      void queryClient.invalidateQueries({ queryKey: ["chat", "messages"] });
      if (notifyLogin && newUser && !prevUserRef.current) {
        pushNotification({
          kind: "auth_login",
          actor: newUser.username,
          title: "logged in",
          text: `${newUser.username} logged in`,
        });
      }
      prevUserRef.current = newUser;
    } catch {
      localStorage.removeItem("token");
      setUser(null);
      prevUserRef.current = null;
    }
  }, [pushNotification, queryClient]);

  useEffect(() => {
    refreshUser(false);
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        openAuth: (mode) => { setInitialMode(mode ?? "login"); setAuthOpen(true); },
        logout: async () => {
          const username = user?.username;
          try {
            await logoutApi();
          } catch {
            // Still clear local state even if the API call fails
          }
          localStorage.removeItem("token");
          setUser(null);
          prevUserRef.current = null;
          if (username) {
            pushNotification({
              kind: "auth_logout",
              actor: username,
              title: "logged out",
              text: `${username} logged out`,
              dedupeKey: `auth_logout:${username.toLowerCase()}`,
            });
          }
          toast.success("Signed out");
        },
        refreshUser,
      }}
    >
      {children}
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          initialMode={initialMode}
          onAuthSuccess={(notifyLogin) => refreshUser(Boolean(notifyLogin))}
        />
      )}
    </AuthContext.Provider>
  );
};
