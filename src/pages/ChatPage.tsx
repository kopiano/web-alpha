import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, Smile, Image, Send, ChevronDown,
  FileText, Download, AlignJustify,
} from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useAuth } from "@/components/dashboard/AuthProvider";
import { resolveAvatar } from "@/lib/avatar";
import { fetchChat, sendChatMessage } from "@/api/chat";

/* ─── Types ─── */
interface ChatUser {
  ID: number; username: string; email: string; avatar: string; status: string;
  last_login_at?: string;
}
interface ChatMessage {
  id?: number; user_id: number; username: string; avatar: string;
  type: string; content: string; file_name?: string; file_url?: string; CreatedAt?: string;
}
interface Contact {
  id: number; name: string; avatar: string; lastMsg: string;
  time: string; unread: number; online: boolean; typing?: boolean;
  userData?: ChatUser;
  lastSeen?: string; // ISO time string from LastLoginAt
}
interface Message {
  id: number; sender: "me" | "them";
  type: "text" | "emoji" | "image" | "file";
  content: string; time: string;
  fileName?: string; fileSize?: string; fileData?: string;
  username?: string;
}

const AVATAR_GRADS = [
  "from-violet-500 to-cyan-400", "from-pink-500 to-violet-500",
  "from-cyan-400 to-blue-500", "from-emerald-400 to-cyan-400",
  "from-fuchsia-500 to-pink-500", "from-violet-500 to-fuchsia-500",
  "from-blue-400 to-cyan-400",
];

const EMOJI_LIST = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
  "🙂", "😉", "😍", "😘", "😋", "😎", "🤩", "🥳", "🤔", "🤗",
  "👍", "👌", "👏", "🙌", "💪", "🙏", "🎉", "✨", "🔥", "🚀",
  "🌩️", "🌨️", "🌧️", "🌦️", "🌥️", "🌤️", "⛈️", "⛅", "☁️", "🌍",
  "🥉","🥈","🥇","🏅","🥬","🍇","🍉"
];

function getInitials(name: string): string {
  return name?.slice(0, 2).toUpperCase() || "??";
}

function timeLabel(ts: string): string {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return ts;
  }
}

function relativeTime(iso: string): string {
  if (!iso) return "";
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return "";
}

function buildContact(u: ChatUser, lastMsg?: string, lastTime?: string): Contact {
  return {
    id: u.ID,
    name: u.username,
    avatar: getInitials(u.username),
    lastMsg: lastMsg || "",
    time: timeLabel(lastTime || ""),
    unread: 0,
    online: false,
    userData: u,
    lastSeen: (u as any).last_login_at || (u as any).LastLoginAt || "",
  };
}

/* ─── Main Chat Page ─── */
const ChatPage = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const msgIdCounter = useRef(0);

  const currentUser = user;
  const meName = currentUser?.username || "Me";
  const meInitials = getInitials(meName);

  // ─── WebSocket connection ───
  const connectWS = useCallback(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const name = meNameRef.current;
    const wsURL = `${proto}//${host}/api/v1/chat/ws?username=${encodeURIComponent(name)}&avatar=${encodeURIComponent(meInitials)}`;

    const ws = new WebSocket(wsURL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] connected as", meNameRef.current);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          type: string; user_id?: number; username?: string; avatar?: string;
          msg_type?: string; content?: string; file_name?: string; file_url?: string;
          time?: string; users?: { user_id: number; username: string }[];
        };

        if (data.type === "online" && data.users) {
          setOnlineUsers(new Set(data.users.map(u => u.user_id)));
        } else if (data.type === "message") {
          const isMe = data.username === meNameRef.current;
          if (isMe) return;
          setMessages(prev => [...prev, {
            id: ++msgIdCounter.current,
            sender: "them",
            type: (data.msg_type as Message["type"]) || "text",
            content: data.content || "",
            time: data.time || timeLabel(new Date().toISOString()),
            fileName: data.file_name,
            fileData: data.file_url,
            username: data.username,
          }]);
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 1500);
        }
      } catch { /* ignore invalid JSON */ }
    };

    ws.onclose = () => {
      console.log("[WS] disconnected, reconnecting in 3s");
      setTimeout(connectWS, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [meInitials]);

  // Keep meName in a ref so WS handler always uses latest value
  const meNameRef = useRef(meName);
  meNameRef.current = meName;

  // ─── Initial data load ───
  useEffect(() => {
    if (!currentUser) return; // wait until user is loaded
    connectWS();
    setLoading(true);
    fetchChat(200)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        const users: ChatUser[] = data?.users ?? [];
        const msgs: ChatMessage[] = data?.messages ?? [];

        // Build contacts from MySQL user table (all users)
        const cs: Contact[] = users.map((u, i) => {
          const userMsgs = msgs.filter(m => m.user_id === u.ID || m.username === u.username);
          const last = userMsgs[userMsgs.length - 1];
          return buildContact(u, last?.content?.slice(0, 30) || "", last?.CreatedAt || "");
        });
        if (cs.length === 0) {
          cs.push({ id: 0, name: "No users", avatar: "??", lastMsg: "Register to start chatting", time: "", unread: 0, online: false });
        }
        setContacts(cs);

        // Build messages from DB
        const myName = meNameRef.current;
        const serverMsgs: Message[] = msgs.map(m => ({
          id: ++msgIdCounter.current,
          sender: m.username === myName ? "me" : "them",
          type: (m.type as Message["type"]) || "text",
          content: m.content,
          time: timeLabel(m.CreatedAt || ""),
          fileName: m.file_name,
          fileData: m.file_url,
          username: m.username,
        }));
        setMessages(serverMsgs);
      })
      .catch(() => {
        setContacts([{ id: 0, name: "Server offline", avatar: "!!", lastMsg: "Backend not reachable — check your connection", time: "", unread: 0, online: false }]);
      })
      .finally(() => setLoading(false));

    return () => {
      wsRef.current?.close();
    };
  }, [currentUser]);

  // ─── Auto-scroll ───
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ─── Send via WebSocket ───
  // ─── Send via POST /chat (持久化到数据库) ───
  const sendViaAPI = useCallback((msgType: string, content: string, fileName?: string, fileData?: string) => {
    const localMsg: Message = {
      id: ++msgIdCounter.current,
      sender: "me",
      type: msgType as Message["type"],
      content,
      time: timeLabel(new Date().toISOString()),
      fileName,
      fileData,
    };
    // 立即添加到本地（乐观更新）
    setMessages(prev => [...prev, localMsg]);

    const username = meNameRef.current;
    sendChatMessage({
      user_id: currentUser?.id || 0,
      username,
      avatar: meInitials,
      type: msgType,
      content,
      file_name: fileName || "",
      file_url: fileData || "",
    }).catch(() => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "message", username, avatar: meInitials,
          msg_type: msgType, content, file_name: fileName, file_url: fileData,
        }));
      }
    });
  }, [meInitials, currentUser]);

  const sendMessage = () => {
    const content = input.trim();
    if (!content) return;
    const isEmoji = /^\p{Emoji}+$/u.test(content);
    sendViaAPI(isEmoji ? "emoji" : "text", content);
    setInput("");
    setShowEmoji(false);
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreviewImg(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const sendImage = () => {
    if (!previewImg) return;
    sendViaAPI("image", previewImg, "image.png", previewImg);
    setPreviewImg(null);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      sendViaAPI("file", file.name, file.name, reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const contact = contacts[activeContact];
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Contact avatar gradient ───
  const contactGrad = (i: number) => AVATAR_GRADS[i % 7];
  const userAvatarUrl = currentUser?.avatar ? resolveAvatar(currentUser.avatar) : null;

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{
        background: "radial-gradient(circle at 30% 20%, rgba(138,92,246,0.15), transparent 35%), radial-gradient(circle at 70% 80%, rgba(0,212,255,0.1), transparent 30%), #070707",
        padding: "36px",
      }}
    >
      {/* Vignette */}
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.5) 100%)" }} />

      {/* Particles */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className="absolute rounded-full"
            style={{
              left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 80}%`,
              width: `${1 + Math.random() * 2.5}px`, height: `${1 + Math.random() * 2.5}px`,
              background: `hsla(${[270,190,320,220][i%4]}, 80%, 65%, ${0.2 + Math.random() * 0.4})`,
              animation: `float-particle ${15 + Math.random() * 20}s linear ${Math.random() * 10}s infinite`,
            }} />
        ))}
      </div>

      <Sidebar />

      {/* Main wrapper */}
      <div className="relative z-10 w-full max-w-[1600px] h-[calc(100vh-72px)] flex gap-0 ml-24">
        {/* ═══ Left Panel ═══ */}
        <div className="w-[320px] shrink-0 flex flex-col h-full rounded-l-[32px] overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(30px) saturate(180%)",
            WebkitBackdropFilter: "blur(30px) saturate(180%)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            borderLeft: "1px solid rgba(255,255,255,0.07)",
            borderRight: "1px solid rgba(255,255,255,0.04)",
            boxShadow: "0 20px 60px -20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold text-violet-400/40 uppercase tracking-[0.3em] mb-1">Inbox</p>
                <h2 className="text-[22px] font-bold tracking-tight" style={{ background: "linear-gradient(to right, #fff, #c4b5fd 70%, #67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Messages</h2>
              </div>
              {onlineUsers.size > 0 && (
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-400/15">
                  {onlineUsers.size} online
                </span>
              )}
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/15" />
              <input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl pl-9 pr-4 py-2.5 text-[11px] outline-none placeholder:text-white/10 border border-white/[0.04] transition-all duration-300"
                style={{ background: "rgba(255,255,255,0.03)" }} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-none px-3 pb-3">
            {loading ? (
              <div className="space-y-3 px-3 py-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-16 rounded-2xl bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-10 text-white/20 text-[12px]">No contacts found</div>
            ) : (
              filteredContacts.map((c, i) => {
                const isActive = i === activeContact;
                // 在线判断：WebSocket 已连接 或 数据库 status 为 active
                const online = onlineUsers.has(c.id) || String(c.userData?.status || "").toLowerCase() === "active";
                const lastSeenText = relativeTime(c.lastSeen || "");
                return (
                  <button key={c.id} onClick={() => setActiveContact(i)}
                    className={`w-full text-left px-3 py-2.5 rounded-2xl flex items-center gap-3.5 transition-all duration-300 group relative mb-0.5 ${
                      isActive ? "scale-[1.02]" : "hover:bg-white/[0.02]"
                    }`}
                    style={isActive ? {
                      background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.08))",
                      border: "1px solid rgba(139,92,246,0.2)",
                      boxShadow: "0 4px 20px -8px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
                    } : { border: "1px solid transparent" }}>
                    <div className="relative shrink-0">
                      <div className={`w-11 h-11 rounded-full grid place-items-center text-[11px] font-bold overflow-hidden shadow-lg transition-shadow duration-500 ${
                        isActive ? "shadow-[0_0_25px_-3px_rgba(139,92,246,0.5)] ring-2 ring-violet-400/25" : ""
                      }`}
                      style={c.userData?.avatar ? {} : {
                        background: "rgba(255,255,255,0.10)",
                        backdropFilter: "blur(20px) saturate(180%)",
                        border: "1px solid rgba(255,255,255,0.18)",
                        boxShadow: "0 4px 24px -8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
                      }}>
                        {c.userData?.avatar ? (
                          <img src={c.userData.avatar.startsWith('http') ? c.userData.avatar : resolveAvatar(c.userData.avatar)}
                            alt="" className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : null}
                        <span className={c.userData?.avatar ? "hidden" : ""}>{c.avatar}</span>
                      </div>
                      {/* Online indicator */}
                      {online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-[3px] border-[#0c0c14] shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <p className={`text-[13px] font-semibold truncate ${isActive ? "text-white" : "text-white/80"}`}>{c.name}</p>
                        <span className="text-[10px] text-white/15 ml-1.5 shrink-0">{c.time}</span>
                      </div>
                      <div className="flex justify-between items-center mt-0.5">
                        <p className={`text-[11px] truncate ${isActive ? "text-white/35" : "text-white/20"}`}>
                          {online ? c.lastMsg : <span className="text-white/15 italic">last seen {relativeTime(c.lastSeen || "") || "—"}</span>}
                        </p>
                        {c.unread > 0 && !isActive && (
                          <span className="text-[10px] font-bold bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white min-w-[20px] h-[20px] rounded-full grid place-items-center leading-none ml-1.5 shrink-0 shadow-[0_0_14px_rgba(139,92,246,0.5)] animate-pulse" style={{ animationDuration: "2s" }}>{c.unread}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Current user info */}
          <div className="p-4 border-t border-white/[0.03]">
            <div className="flex items-center gap-3 px-2.5 py-2 rounded-2xl hover:bg-white/[0.02] transition-all cursor-pointer">
              <div className="w-10 h-10 rounded-full grid place-items-center text-[10px] font-bold shadow-lg ring-1 ring-white/10 overflow-hidden"
                style={userAvatarUrl ? {} : {
                  background: "rgba(255,255,255,0.10)",
                  backdropFilter: "blur(20px) saturate(180%)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  boxShadow: "0 4px 24px -8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
                }}>
                {userAvatarUrl ? (
                  <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  meInitials
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-white/80">{meName}</p>
                <p className="text-[10px] text-emerald-300/50">Online</p>
              </div>
              <ChevronDown size={14} className="text-white/10" />
            </div>
          </div>
        </div>

        {/* ═══ Center Panel ═══ */}
        <div className="flex-1 flex flex-col h-full min-w-0 rounded-r-[32px] overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.02)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 20px 60px -20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
          }}>
          {/* Header */}
          <div className="px-5 py-3 flex items-center gap-3 shrink-0 border-b border-white/[0.03]"
            style={{ background: "rgba(255,255,255,0.015)", backdropFilter: "blur(40px)" }}>
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full grid place-items-center text-[10px] font-bold shadow-lg ring-1 ring-white/10 overflow-hidden"
                style={contact?.userData?.avatar ? {} : {
                  background: "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05))",
                  backdropFilter: "blur(20px) saturate(180%)",
                }}>
                {contact?.userData?.avatar ? (
                  <img src={contact.userData.avatar.startsWith('http') ? contact.userData.avatar : resolveAvatar(contact.userData.avatar)}
                    alt="" className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : null}
                <span className={contact?.userData?.avatar ? "hidden" : ""}>{contact?.avatar || "??"}</span>
              </div>
              {contact && (onlineUsers.has(contact.id) || String(contact.userData?.status || "").toLowerCase() === "active") && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-[3px] border-[#0c0c14] shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white/90">{contact?.name || "Chat"}</p>
              <p className="text-[10px] text-white/20">
                {isTyping ? (
                  <span className="text-violet-300/60">typing...</span>
                ) : contact && (onlineUsers.has(contact.id) || String(contact.userData?.status || "").toLowerCase() === "active") ? (
                  <span className="text-emerald-400/60">Online</span>
                ) : (
                  <span className="text-white/15 italic">last seen {relativeTime(contact?.lastSeen || "") || "—"}</span>
                )}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-none px-5 py-4 space-y-1.5">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-[13px] text-white/20">Send a message to start the conversation</p>
              </div>
            ) : (
              messages.map((m, i) => {
                const showAvatar = m.sender === "them" && (i === 0 || messages[i - 1]?.sender !== "them");
                return (
                  <div key={m.id} className={`flex ${m.sender === "me" ? "justify-end" : "justify-start"}`}
                    style={{ animation: "slide-up 0.35s ease forwards", animationDelay: `${Math.min(i * 20, 200)}ms`, opacity: 0 }}>
                    <div className={`flex ${m.sender === "me" ? "flex-row-reverse" : ""} gap-2.5 max-w-[68%]`}>
                      {m.sender === "them" && (
                        <div className="shrink-0 mt-1">
                          {showAvatar ? (
                            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${contactGrad(activeContact)} grid place-items-center text-[9px] font-bold ring-1 ring-white/10`}>
                              {contact?.avatar || m.username?.[0]?.toUpperCase() || "?"}
                            </div>
                          ) : <div className="w-7" />}
                        </div>
                      )}
                      <div className={`flex flex-col ${m.sender === "me" ? "items-end" : "items-start"} gap-0.5`}>
                        {m.type === "text" && (
                          <div className={`px-4 py-2.5 text-[13px] leading-relaxed ${
                            m.sender === "me"
                              ? "rounded-[20px] rounded-br-sm text-white/95"
                              : "rounded-[20px] rounded-bl-sm text-white/88"
                          }`}
                          style={m.sender === "me" ? {
                            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                            boxShadow: "0 6px 20px -6px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
                          } : {
                            background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            boxShadow: "0 4px 12px -4px rgba(0,0,0,0.15)",
                          }}>{m.content}</div>
                        )}
                        {m.type === "emoji" && (
                          <div className="text-[44px] leading-none select-none">{m.content}</div>
                        )}
                        {m.type === "image" && (
                          <div className="rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/[0.06] max-w-[300px] group/img cursor-pointer hover:scale-[1.02] transition-transform">
                            <img src={m.content} alt="shared" className="w-full object-cover" />
                          </div>
                        )}
                        {m.type === "file" && (
                          <div className="flex items-center gap-3 px-4 py-3 rounded-[20px] max-w-[280px]"
                            style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="w-9 h-9 rounded-xl bg-white/[0.06] grid place-items-center shrink-0"><FileText size={16} className="text-violet-400" /></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium truncate">{m.fileName}</p>
                              <p className="text-[9px] text-white/20">{m.fileSize}</p>
                            </div>
                            {m.fileData ? (
                              <a href={m.fileData} download={m.fileName}
                                className="w-7 h-7 rounded-lg grid place-items-center hover:bg-white/10 transition-all">
                                <Download size={12} className="text-white/30 hover:text-white/60" />
                              </a>
                            ) : (
                              <button className="w-7 h-7 rounded-lg grid place-items-center hover:bg-white/10 transition-all">
                                <Download size={12} className="text-white/30" />
                              </button>
                            )}
                          </div>
                        )}
                        {m.username && m.sender === "them" && (
                          <span className="text-[9px] text-white/15 px-1">{m.username}</span>
                        )}
                        <span className="text-[9px] text-white/10 px-1">{m.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {isTyping && (
              <div className="flex gap-2.5" style={{ animation: "slide-up 0.35s ease forwards", opacity: 0 }}>
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${contactGrad(activeContact)} grid place-items-center text-[9px] font-bold shrink-0 mt-1`}>
                  {contact?.avatar || "?"}
                </div>
                <div className="px-4 py-3 rounded-[20px] rounded-bl-sm flex items-center gap-1"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  {[0, 160, 320].map(d => (
                    <span key={d} className="w-[5px] h-[5px] rounded-full bg-violet-300/30 animate-bounce"
                      style={{ animationDelay: `${d}ms`, animationDuration: "0.8s" }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Image preview bar */}
          {previewImg && (
            <div className="mx-5 mb-1 p-3 rounded-2xl flex items-center gap-3 animate-slide-up"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <img src={previewImg} alt="preview" className="w-12 h-12 rounded-xl object-cover" />
              <span className="text-[11px] text-white/50 flex-1">Image ready to send</span>
              <button onClick={() => setPreviewImg(null)} className="text-white/20 hover:text-white/60 text-xs px-2">✕</button>
              <button onClick={sendImage} className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-500 to-cyan-400 text-white">Send</button>
            </div>
          )}

          {/* Input bar */}
          <div className="px-4 pb-4 pt-2 shrink-0">
            <div className="flex items-center gap-2 px-3 h-[56px] rounded-full"
              style={{
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(30px)",
                WebkitBackdropFilter: "blur(30px)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 8px 32px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}>
              <div className="relative">
                <button onClick={() => setShowEmoji(!showEmoji)}
                  className={`w-9 h-9 rounded-full grid place-items-center transition-all duration-200 ${showEmoji ? "bg-white/[0.08] text-violet-400" : "text-white/25 hover:text-white/60 hover:bg-white/[0.04]"}`}>
                  <Smile size={17} /></button>
                {showEmoji && (
                  <div className="absolute bottom-full left-0 mb-3 rounded-2xl p-3 w-[304px] animate-dropdown-in z-50"
                    style={{
                      background: "rgba(18,16,30,0.97)", backdropFilter: "blur(60px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      boxShadow: "0 20px 50px -10px rgba(0,0,0,0.7)",
                    }}>
                    <div className="grid grid-cols-8 gap-1.5">
                      {EMOJI_LIST.map(e => (
                        <button key={e}
                          onClick={() => { setInput(p => p + e); setShowEmoji(false); }}
                          className="w-8 h-8 rounded-lg grid place-items-center text-xl hover:bg-white/10 transition-all hover:scale-[1.15] active:scale-95">
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 rounded-full grid place-items-center text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all">
                <AlignJustify size={17} /></button>
              <input ref={fileInputRef} type="file" onChange={handleFilePick} className="hidden" />
              <button onClick={() => imageInputRef.current?.click()}
                className="w-9 h-9 rounded-full grid place-items-center text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all">
                <Image size={17} /></button>
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
              <input type="text" placeholder="Message..." value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); sendMessage(); } }}
                className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-white/15 px-2" />
              <button onClick={sendMessage} disabled={!input.trim()}
                className={`w-9 h-9 rounded-full grid place-items-center transition-all duration-200 ${input.trim() ? "bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-[0_0_18px_rgba(124,58,237,0.4)] scale-100" : "text-white/20 scale-95"}`}>
                <Send size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
