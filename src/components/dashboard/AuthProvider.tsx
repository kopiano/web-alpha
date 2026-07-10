import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { AuthModal } from "./AuthModal";
import { logout as logoutApi } from "@/api/auth";
import { useNotifications } from "./NotificationProvider";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store";
import { bumpUserRefreshVersion, clearUser, mergeUser, refreshUser as refreshUserThunk, type User } from "@/store/authSlice";

// undefined = still loading, null = logged out, User = logged in
type UserState = User | null | undefined;

interface AuthContextType {
  user: UserState;
  userRefreshVersion: number;
  openAuth: (mode?: "login" | "signup") => void;
  logout: () => Promise<void>;
  refreshUser: (notifyLogin?: boolean) => Promise<void>;
  mergeUser: (patch: Partial<User>) => void;
  bumpUserRefreshVersion: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: undefined,
  userRefreshVersion: 0,
  openAuth: () => {},
  logout: async () => {},
  refreshUser: async () => {},
  mergeUser: () => {},
  bumpUserRefreshVersion: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authOpen, setAuthOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<"login" | "signup">("login");
  const prevUserRef = useRef<UserState>(undefined);
  const { push: pushNotification } = useNotifications();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);
  const authStatus = useAppSelector((state) => state.auth.status);
  const userRefreshVersion = useAppSelector((state) => state.auth.userRefreshVersion);
  const user: UserState = authStatus === "loading" ? undefined : authUser;

  const refreshUser = useCallback(async (notifyLogin = false) => {
    const result = await dispatch(refreshUserThunk());
    if (refreshUserThunk.fulfilled.match(result)) {
      const newUser = result.payload;
      if (notifyLogin && newUser && !prevUserRef.current) {
        pushNotification({
          kind: "auth_login",
          actor: newUser.username,
          title: "logged in",
          text: `${newUser.username} logged in`,
        });
      }
      prevUserRef.current = newUser;
    } else if (refreshUserThunk.rejected.match(result) && !result.payload?.transient) {
      prevUserRef.current = null;
    }
  }, [dispatch, pushNotification]);

  const mergeUserValue = useCallback((patch: Partial<User>) => {
    dispatch(mergeUser(patch));
  }, [dispatch]);

  const bumpUserRefresh = useCallback(() => {
    dispatch(bumpUserRefreshVersion());
  }, [dispatch]);

  useEffect(() => {
    void refreshUser(false);
  }, [refreshUser]);

  const logout = useCallback(async () => {
    const username = user?.username;
    try {
      await logoutApi();
    } catch {
      // Still clear local state even if the API call fails
    }
    localStorage.removeItem("token");
    dispatch(clearUser());
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
  }, [dispatch, pushNotification, user?.username]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userRefreshVersion,
        openAuth: (mode) => { setInitialMode(mode ?? "login"); setAuthOpen(true); },
        logout,
        refreshUser,
        mergeUser: mergeUserValue,
        bumpUserRefreshVersion: bumpUserRefresh,
      }}
    >
      {children}
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          initialMode={initialMode}
          onAuthSuccess={(notifyLogin) => void refreshUser(Boolean(notifyLogin))}
        />
      )}
    </AuthContext.Provider>
  );
};
