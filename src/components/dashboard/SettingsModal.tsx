import { useState, useRef } from "react";
import { User, Lock, Mail, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateSettings } from "@/api/auth";
import { useNotifications } from "./NotificationProvider";
import { resolveAvatar } from "@/lib/avatar";

interface SettingsModalProps {
  user: { id: number; username: string; email: string; avatar: string | null };
  onClose: () => void;
  onSaved: () => void;
}

export const SettingsModal = ({ user, onClose, onSaved }: SettingsModalProps) => {
  const { push: pushNotification } = useNotifications();
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user.avatar ? resolveAvatar(user.avatar) : null,
  );
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", username.trim());
      formData.append("email", email.trim());
      if (password) formData.append("password", password);
      if (avatarFile) formData.append("avatar", avatarFile);

      await updateSettings(formData);
      pushNotification({ kind: "settings_update", actor: username.trim(), title: "updated settings", text: `${username.trim()} updated settings` });
      toast.success("Settings saved");
      onSaved();
      onClose();
    } catch (err: any) {
      console.error("[SettingsModal] save failed:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-[calc(100vw-24px)] max-w-[400px] max-h-[calc(100vh-24px)] overflow-y-auto p-5 md:p-8 rounded-2xl animate-dropdown-in"
        style={{
          background: "linear-gradient(135deg, rgba(20,14,30,0.95), rgba(30,18,48,0.92))",
          backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset, 0 20px 60px -10px rgba(0,0,0,0.6), 0 0 40px rgba(168,85,247,0.1)",
        }}
      >
        <div className="text-center mb-7">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <p className="text-xs text-white/40 mt-1.5">Update your profile</p>
        </div>

        <form className="space-y-3.5" onSubmit={handleSubmit}>
          {/* Avatar */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-16 h-16 rounded-full overflow-hidden bg-white/5 border border-white/[0.06] hover:border-white/15 transition-all group"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <Camera size={18} className="text-white/40 absolute inset-0 m-auto" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center">
                <Camera size={16} className="text-white" />
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Username */}
          <div>
            <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5 font-medium">Username</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl text-base md:text-xs text-white bg-white/5 border border-white/[0.06] placeholder:text-white/20 focus:outline-none focus:border-neon-cyan/50 focus:bg-white/[0.07] transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5 font-medium">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl text-base md:text-xs text-white bg-white/5 border border-white/[0.06] placeholder:text-white/20 focus:outline-none focus:border-neon-cyan/50 focus:bg-white/[0.07] transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5 font-medium">
              New Password <span className="text-white/20">(optional)</span>
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input
                type="password"
                placeholder="Leave blank to keep"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl text-base md:text-xs text-white bg-white/5 border border-white/[0.06] placeholder:text-white/20 focus:outline-none focus:border-neon-cyan/50 focus:bg-white/[0.07] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-xl text-base md:text-xs font-semibold text-white bg-gradient-to-r from-neon-purple to-neon-cyan hover:opacity-90 disabled:opacity-50 transition-opacity active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
};
