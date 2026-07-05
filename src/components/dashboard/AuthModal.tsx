import { useState, useRef, useCallback } from "react"
import { User, Lock, Loader2, Camera } from "lucide-react"
import { toast } from "sonner"
import { login, register } from "@/api/auth"
import { useNotifications } from "./NotificationProvider"
import { compressImageToBlob, compressImageToDataUrl } from "@/lib/avatar"

interface AuthModalProps {
  onClose: () => void;
  initialMode?: "login" | "signup";
  onAuthSuccess?: () => void;
}

export const AuthModal = ({ onClose, initialMode = "login", onAuthSuccess }: AuthModalProps) => {
  const { push: pushNotification } = useNotifications();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Compress & preview on client side so even large phone photos display instantly
    try {
      const dataUrl = await compressImageToDataUrl(file, 256, 0.8)
      setAvatarPreview(dataUrl)
      setAvatar(file) // keep original file ref; we'll compress at submit time
    } catch {
      // fallback: use raw FileReader if compression fails
      const reader = new FileReader()
      reader.onloadend = () => setAvatarPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error("Username and password are required");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const res = await login({ username: username.trim(), password });
        if (res?.data?.code !== 200) {
          toast.error(res?.data?.message || "Login failed");
          return;
        }
        const token = res?.data?.data?.token;
        if (!token) {
          toast.error("Login failed: no token received");
          return;
        }
        localStorage.setItem("token", token);
        toast.success("Signed in successfully");
        onAuthSuccess?.();
        onClose();
      } else {
        const formData = new FormData()
        formData.append("username", username.trim())
        formData.append("password", password)
        if (email.trim()) formData.append("email", email.trim())
        if (avatar) {
          // Compress avatar before upload so the server stores a smaller image
          const compressed = await compressImageToBlob(avatar, 256, 0.8)
          const compressedFile = new File([compressed], avatar.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
          formData.append("avatar", compressedFile)
        }
        await register(formData)
        toast.success("Account created successfully");
        pushNotification({
          kind: "auth_register",
          actor: username.trim(),
          title: "registered",
          text: `${username.trim()} registered`,
          dedupeKey: `auth_register:${username.trim().toLowerCase()}`,
        });
        setMode("login");
        setAvatar(null);
        setAvatarPreview(null);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Network error - please check your connection";
      toast.error(message);
      console.error("Auth error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-[calc(100vw-24px)] max-w-[400px] max-h-[calc(100vh-24px)] overflow-y-auto glass-strong rounded-2xl p-5 md:p-8 animate-dropdown-in">
        <button
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
          onClick={onClose}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="text-center mb-7">
          <h2 className="text-xl font-semibold text-white">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-xs text-white/40 mt-1.5">
            {mode === "login"
              ? "Sign in to your account to continue"
              : "Get started with a free account"}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-6">
          <SocialIconButton icon={<GithubIcon />} />
          <SocialIconButton icon={<XIcon />} />
          <SocialIconButton icon={<GoogleIcon />} />
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
            or continue with username
          </span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        <form className="space-y-3.5" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-16 h-16 rounded-full overflow-hidden bg-white/5 border border-white/[0.06] hover:border-white/15 transition-all group"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={18} className="text-white/40 absolute inset-0 m-auto" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center">
                  <Camera size={16} className="text-white" />
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5 font-medium">
              Username
            </label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input
                type="text"
                placeholder="your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl text-base md:text-xs text-white bg-white/5 border border-white/[0.06] placeholder:text-white/20
                  focus:outline-none focus:border-neon-cyan/50 focus:bg-white/[0.07] transition-all"
              />
            </div>
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5 font-medium">
                Email <span className="text-white/20">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl text-base md:text-xs text-white bg-white/5 border border-white/[0.06] placeholder:text-white/20
                    focus:outline-none focus:border-neon-cyan/50 focus:bg-white/[0.07] transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5 font-medium">
              Password
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl text-base md:text-xs text-white bg-white/5 border border-white/[0.06] placeholder:text-white/20
                  focus:outline-none focus:border-neon-cyan/50 focus:bg-white/[0.07] transition-all"
              />
            </div>
          </div>

          {mode === "login" && (
            <div className="text-right">
              <button type="button" className="text-[10px] text-white/30 hover:text-neon-cyan transition-colors">
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-xl text-base md:text-xs font-semibold text-white
              bg-gradient-to-r from-neon-purple to-neon-cyan
              hover:opacity-90 disabled:opacity-50 transition-opacity active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="text-center mt-5 text-xs text-white/30">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            className="text-neon-cyan hover:text-white transition-colors font-medium"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setAvatarPreview(null); setAvatar(null); }}
          >
            {mode === "login" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
};

const SocialIconButton = ({ icon }: { icon: React.ReactNode }) => (
  <button
    className="w-11 h-11 rounded-full grid place-items-center text-white/60
      bg-white/5 border border-white/[0.06] hover:bg-white/10 hover:text-white hover:border-white/15
      transition-all active:scale-[0.95]"
  >
    {icon}
  </button>
);

const GithubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);
