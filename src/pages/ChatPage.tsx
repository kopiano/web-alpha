import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, Smile, Image, Send, ChevronDown,
  FileText, Download, AlignJustify,
} from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";

/* ─── Types ─── */
interface Contact {
  id: number; name: string; avatar: string; lastMsg: string;
  time: string; unread: number; online: boolean; typing?: boolean;
}
interface Message {
  id: number; sender: "me" | "them";
  type: "text" | "emoji" | "image" | "file";
  content: string; time: string;
  fileName?: string; fileSize?: string; fileData?: string;
}

/* ─── Data ─── */
const CONTACTS: Contact[] = [
  { id: 1, name: "Sarah Chen", avatar: "SC", lastMsg: "Sure, sending the deck now", time: "2:41 PM", unread: 3, online: true, typing: true },
  { id: 2, name: "Alex Morgan", avatar: "AM", lastMsg: "You: Sounds great!", time: "1:22 PM", unread: 0, online: true },
  { id: 3, name: "Marcus Webb", avatar: "MW", lastMsg: "The build passed all tests ✅", time: "11:05 AM", unread: 1, online: false },
  { id: 4, name: "Priya Kapoor", avatar: "PK", lastMsg: "Can we sync at 3?", time: "Yesterday", unread: 0, online: true },
  { id: 5, name: "James Liu", avatar: "JL", lastMsg: "Updated the Figma file", time: "Yesterday", unread: 0, online: false },
  { id: 6, name: "Elena Rossi", avatar: "ER", lastMsg: "Coffee run? ☕", time: "Mon", unread: 2, online: true, typing: true },
  { id: 7, name: "Dev Team", avatar: "DT", lastMsg: "Sprint review at 4pm", time: "Mon", unread: 5, online: false },
];

interface ChatData { messages: Message[]; pinned?: string; }
const CHATS: Record<number, ChatData> = {
  1: {
    pinned: "📌 Sprint planning at 3pm — don't miss it!",
    messages: [
      { id: 1, sender: "them", type: "text", content: "Hey! Are you free today?", time: "2:30 PM" },
      { id: 2, sender: "me", type: "text", content: "Yes! Just wrapped up the design review", time: "2:31 PM" },
      { id: 3, sender: "them", type: "emoji", content: "😄", time: "2:31 PM" },
      { id: 4, sender: "them", type: "text", content: "Let's jump into the meeting in 10 mins", time: "2:32 PM" },
      { id: 5, sender: "me", type: "text", content: "Perfect, I'll set up the Zoom link", time: "2:33 PM" },
      { id: 6, sender: "them", type: "text", content: "Also, can you share the latest mockups?", time: "2:34 PM" },
      { id: 7, sender: "me", type: "image", content: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&h=350&fit=crop", time: "2:35 PM" },
      { id: 8, sender: "them", type: "text", content: "Looks amazing! The gradients are 👌", time: "2:36 PM" },
      { id: 9, sender: "them", type: "text", content: "Great, meeting link received. Joining now 🚀", time: "2:40 PM" },
    ],
  },
  2: {
    messages: [
      { id: 1, sender: "them", type: "text", content: "How's the new dashboard coming along?", time: "1:00 PM" },
      { id: 2, sender: "me", type: "text", content: "Really good! Almost done with the animations", time: "1:05 PM" },
      { id: 3, sender: "them", type: "text", content: "Can I see a preview?", time: "1:10 PM" },
      { id: 4, sender: "me", type: "text", content: "Sure! Here's a sneak peek 👀", time: "1:15 PM" },
      { id: 5, sender: "me", type: "image", content: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=500&h=350&fit=crop", time: "1:16 PM" },
      { id: 6, sender: "them", type: "emoji", content: "🔥", time: "1:18 PM" },
      { id: 7, sender: "them", type: "text", content: "That looks incredible! The glass effects are on point", time: "1:20 PM" },
      { id: 8, sender: "me", type: "text", content: "Thanks! Still tweaking the holographic feel", time: "1:22 PM" },
    ],
  },
};

function defaultMessages(): Message[] {
  return [
    { id: 1, sender: "them", type: "text", content: "Hey! How's it going?", time: "10:00 AM" },
    { id: 2, sender: "me", type: "text", content: "All good! Working on the new features", time: "10:05 AM" },
  ];
}

const EMOJI_LIST = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
  "🙂", "😉", "😍", "😘", "😋", "😎", "🤩", "🥳", "🤔", "🤗",
  "👍", "👌", "👏", "🙌", "💪", "🙏", "🎉", "✨", "🔥", "🚀",
  "🌩️", "🌨️", "🌧️", "🌦️", "🌥️", "🌤️", "⛈️", "⛅", "☁️", "🌍",
  "🥉","🥈","🥇","🏅","🥬","🍇","🍉"
];
const AVATAR_GRADS = [
  "from-violet-500 to-cyan-400", "from-pink-500 to-violet-500",
  "from-cyan-400 to-blue-500", "from-emerald-400 to-cyan-400",
  "from-fuchsia-500 to-pink-500", "from-violet-500 to-fuchsia-500",
  "from-blue-400 to-cyan-400",
];

/* ─── Main Chat Page ─── */
const ChatPage = () => {
  const [activeContact, setActiveContact] = useState(0);
  const [chatData, setChatData] = useState<Record<number, ChatData>>(CHATS);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const contact = CONTACTS[activeContact];
  const currentChat = chatData[contact.id] || { messages: defaultMessages() };
  const messages = currentChat.messages;

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, activeContact]);

  useEffect(() => {
    if (contact.typing) { setIsTyping(true); const t = setTimeout(() => setIsTyping(false), 2200); return () => clearTimeout(t); }
    else setIsTyping(false);
  }, [activeContact]);

  const switchContact = useCallback((i: number) => {
    if (i === activeContact) return;
    setTransitioning(true); setActiveContact(i);
    setTimeout(() => setTransitioning(false), 300);
  }, [activeContact]);

  const addMessage = (msg: Message) => {
    setChatData(prev => ({
      ...prev,
      [contact.id]: { ...prev[contact.id], messages: [...(prev[contact.id]?.messages || defaultMessages()), msg] },
    }));
  };

  const sendMessage = () => {
    const content = input.trim();
    if (!content) return;
    const isEmoji = /^\p{Emoji}+$/u.test(content);
    addMessage({
      id: Date.now(), sender: "me", type: isEmoji ? "emoji" : "text", content,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    });
    setInput(""); setShowEmoji(false);
    setIsTyping(true); setTimeout(() => setIsTyping(false), 2500);
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreviewImg(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const sendImage = () => {
    if (!previewImg) return;
    addMessage({
      id: Date.now(), sender: "me", type: "image", content: previewImg,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    });
    setPreviewImg(null);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      addMessage({
        id: Date.now(), sender: "me", type: "file", content: file.name,
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        fileData: reader.result as string,
        time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const filteredContacts = CONTACTS.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{
        background: "radial-gradient(circle at 30% 20%, rgba(138,92,246,0.15), transparent 35%), radial-gradient(circle at 70% 80%, rgba(0,212,255,0.1), transparent 30%), #070707",
        padding: "36px",
      }}
    >
      {/* Vignette overlay */}
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.5) 100%)" }} />

      {/* Floating micro particles */}
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
              {CONTACTS.reduce((s, c) => s + c.unread, 0) > 0 && (
                <span className="text-[10px] font-bold text-violet-300 bg-violet-500/10 px-2.5 py-1 rounded-full border border-violet-400/15 animate-pulse-glow">
                  {CONTACTS.reduce((s, c) => s + c.unread, 0)}
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
            {filteredContacts.map((c, i) => {
              const isActive = i === activeContact;
              return (
                <button key={c.id} onClick={() => switchContact(i)}
                  className={`w-full text-left px-3 py-2.5 rounded-2xl flex items-center gap-3.5 transition-all duration-300 group relative mb-0.5 ${
                    isActive
                      ? "scale-[1.02]"
                      : "hover:bg-white/[0.02]"
                  }`}
                  style={isActive ? {
                    background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.08))",
                    border: "1px solid rgba(139,92,246,0.2)",
                    boxShadow: "0 4px 20px -8px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
                  } : { border: "1px solid transparent" }}>
                  <div className="relative shrink-0">
                    <div className={`w-11 h-11 rounded-full grid place-items-center text-[11px] font-bold bg-gradient-to-br ${AVATAR_GRADS[i%7]} shadow-lg transition-shadow duration-500 ${
                      isActive ? "shadow-[0_0_25px_-3px_rgba(139,92,246,0.5)] ring-2 ring-violet-400/25" : ""
                    }`}>{c.avatar}</div>
                    {c.online && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-[3px] border-[#0c0c14] shadow-[0_0_12px_rgba(52,211,153,0.7)]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className={`text-[13px] font-semibold truncate ${isActive ? "text-white" : "text-white/80"}`}>{c.name}</p>
                      <span className="text-[10px] text-white/15 ml-1.5 shrink-0">{c.time}</span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className={`text-[11px] truncate ${isActive ? "text-white/35" : "text-white/20"}`}>{c.lastMsg}</p>
                      {c.unread > 0 && !isActive && (
                        <span className="text-[10px] font-bold bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white min-w-[20px] h-[20px] rounded-full grid place-items-center leading-none ml-1.5 shrink-0 shadow-[0_0_14px_rgba(139,92,246,0.5)] animate-pulse" style={{ animationDuration: "2s" }}>{c.unread}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-4 border-t border-white/[0.03]">
            <div className="flex items-center gap-3 px-2.5 py-2 rounded-2xl hover:bg-white/[0.02] transition-all cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 via-violet-500 to-cyan-400 grid place-items-center text-[10px] font-bold shadow-lg ring-1 ring-white/10">YO</div>
              <div className="flex-1 min-w-0"><p className="text-[12px] font-semibold">You</p><p className="text-[10px] text-emerald-300/50">Online</p></div>
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
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_GRADS[activeContact%7]} grid place-items-center text-[10px] font-bold shadow-lg ring-1 ring-white/10`}>{contact.avatar}</div>
              {contact.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-[3px] border-[#0a0a14] shadow-[0_0_10px_rgba(52,211,153,0.6)]" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white/90">{contact.name}</p>
              <p className="text-[10px] text-white/20">
                {isTyping ? <span className="text-violet-300/60">typing...</span> : contact.online ? "Online" : "Last seen recently"}
              </p>
            </div>
          </div>

          {/* Pinned */}
          {currentChat.pinned && (
            <div className="mx-4 mt-3 px-4 py-2.5 rounded-2xl flex items-center gap-3 text-[11px] animate-slide-up"
              style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.12)" }}>
              <span className="text-violet-400">📌</span>
              <span className="text-white/50 flex-1 truncate">{currentChat.pinned}</span>
            </div>
          )}

          {/* Messages */}
          <div className={`flex-1 overflow-y-auto scrollbar-none px-5 py-4 space-y-1.5 transition-opacity duration-300 ${transitioning ? "opacity-50" : "opacity-100"}`}>
            {messages.map((m, i) => {
              const showAvatar = m.sender === "them" && (i === 0 || messages[i-1]?.sender !== "them");
              return (
                <div key={m.id} className={`flex ${m.sender === "me" ? "justify-end" : "justify-start"}`}
                  style={{ animation: "slide-up 0.35s ease forwards", animationDelay: `${Math.min(i * 20, 200)}ms`, opacity: 0 }}>
                  <div className={`flex ${m.sender === "me" ? "flex-row-reverse" : ""} gap-2.5 max-w-[68%]`}>
                    {m.sender === "them" && (
                      <div className="shrink-0 mt-1">
                        {showAvatar ? (
                          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${AVATAR_GRADS[activeContact%7]} grid place-items-center text-[9px] font-bold ring-1 ring-white/10`}>{contact.avatar}</div>
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
                            <a
                              href={m.fileData}
                              download={m.fileName}
                              className="w-7 h-7 rounded-lg grid place-items-center hover:bg-white/10 transition-all"
                            >
                              <Download size={12} className="text-white/30 hover:text-white/60" />
                            </a>
                          ) : (
                            <button className="w-7 h-7 rounded-lg grid place-items-center hover:bg-white/10 transition-all">
                              <Download size={12} className="text-white/30" />
                            </button>
                          )}
                        </div>
                      )}
                      <span className="text-[9px] text-white/10 px-1">{m.time}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="flex gap-2.5" style={{ animation: "slide-up 0.35s ease forwards", opacity: 0 }}>
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${AVATAR_GRADS[activeContact%7]} grid place-items-center text-[9px] font-bold shrink-0 mt-1`}>{contact.avatar}</div>
                <div className="px-4 py-3 rounded-[20px] rounded-bl-sm flex items-center gap-1"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  {[0,160,320].map(d => <span key={d} className="w-[5px] h-[5px] rounded-full bg-violet-300/30 animate-bounce" style={{ animationDelay: `${d}ms`, animationDuration: "0.8s" }} />)}
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
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-white/15 px-2" />
              <button onClick={sendMessage} disabled={!input.trim()}
                className={`w-10 h-10 rounded-full grid place-items-center transition-all duration-300 ${
                  input.trim()
                    ? "bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_30px_-6px_rgba(139,92,246,0.6)] hover:scale-105 active:scale-95"
                    : "bg-white/[0.03] text-white/8 cursor-not-allowed"
                }`}>
                <Send size={15} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
