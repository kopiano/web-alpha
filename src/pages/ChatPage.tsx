import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, memo, startTransition, useDeferredValue } from "react";
import { Search, Smile, Image, Send, ChevronDown, FileText, Download, AlignJustify, Plus } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useAuth } from "@/components/dashboard/AuthProvider";
import { useOnlineStatus, type WsMessage } from "@/components/dashboard/OnlineStatusProvider";
import { resolveAvatar } from "@/lib/avatar";
import { getConversations, markConversationRead, createConversation, sendChatMessage, fetchConversationMessages } from "@/api/chat";
import { EMOJI_LIST } from "@/config/chat";
import { useChatMessages } from "@/hooks/chat/useChatMessages";
import { useChatConversations } from "@/hooks/chat/useChatConversations";
import { useChatStore } from "@/store/chatStore";
import { patchConversation, setUnread, setTyping, hydrateFromServer } from "@/store/chatStore";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import teamAvatar from "@/assets/teamGroup.webp";
// import { getUsers } from "@/api/user";

/* ─── Types ─── */
interface ChatUser { id: number; username: string; email?: string; avatar?: string; status?: string; last_login_at?: string; }
interface ChatMsg { id?: number; user_id: number; username?: string; sender_username?: string; sender_avatar?: string; avatar?: string; type: string; content: string; file_name?: string; file_url?: string; CreatedAt?: string; created_at?: string; }
interface Contact { id: number; kind: "private" | "group"; name: string; avatar: string; lastMsg: string; time: string; lastTimeRaw: string; unread: number; online: boolean; userData?: ChatUser; lastSeen?: string; convId?: string; members?: ChatUser[]; }
interface ConversationRow {
  conversation_id: string;
  type: "private" | "group";
  title?: string;
  avatar?: string;
  last_message?: string;
  last_message_type?: number;
  last_message_at?: string;
  unread_count?: number;
  users?: { user_id: number; username?: string; avatar?: string }[];
}
interface Message { id: number; sender: "me"|"them"; type: "text"|"emoji"|"image"|"file"; content: string; time: string; rawTime?: string; sortTs?: number; fileName?: string; fileSize?: string; fileData?: string; username?: string; senderAvatar?: string; }

const AVATAR_GRADS = ["from-violet-500 to-cyan-400","from-pink-500 to-violet-500","from-cyan-400 to-blue-500","from-emerald-400 to-cyan-400","from-fuchsia-500 to-pink-500","from-violet-500 to-fuchsia-500","from-blue-400 to-cyan-400"];

function initials(n: string) { return n?.slice(0,2).toUpperCase()||"??"; }
function timeFmt(ts: string) {
  if(!ts) return "";
  try {
    const d = new Date(ts);
    const now = new Date();
    const time = d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true});
    // 不是今天的消息显示日期+时间
    if (d.toDateString() !== now.toDateString()) {
      const mm = String(d.getMonth()+1).padStart(2,"0");
      const dd = String(d.getDate()).padStart(2,"0");
      return `${mm}-${dd} ${time}`;
    }
    return time;
  } catch { return ts; }
}
function ago(iso: string) { if(!iso) return ""; const d=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/1000)); if(d<60) return "just now"; if(d<3600) return `${Math.floor(d/60)}m ago`; if(d<86400) return `${Math.floor(d/3600)}h ago`; if(d<604800) return `${Math.floor(d/86400)}d ago`; return ""; }

function buildContact(u: ChatUser, lastMsg: string, lastTime: string): Contact {
  return { id: u.id, kind: "private", name: u.username, avatar: initials(u.username), lastMsg, time: timeFmt(lastTime), lastTimeRaw: lastTime, unread: 0, online: false, userData: u, lastSeen: u.last_login_at||"" };
}

function resolveImgSrc(src?: string) {
  if (!src) return "";
  return src.startsWith("http") ? src : resolveAvatar(src);
}

function dedupeUsers(users: ChatUser[]) {
  const map = new Map<number, ChatUser>();
  users.forEach((u) => {
    if (u?.id) map.set(u.id, u);
  });
  return [...map.values()];
}

function parseConversationPeerId(conversationId: string, users?: ConversationRow["users"]) {
  const directPeer = users?.find((u) => u?.user_id) || null;
  if (conversationId.startsWith("p_")) {
    return directPeer?.user_id || 0;
  }
  if (conversationId.startsWith("g_")) {
    const groupId = Number(conversationId.slice(2));
    return Number.isNaN(groupId) ? 0 : groupId;
  }
  return directPeer?.user_id || 0;
}

function isGroupConversationId(conversationId?: string) {
  return Boolean(conversationId && conversationId.startsWith("g_"));
}

function getChatSelectionStorageKey() {
  return "chat_active_selection";
}

function makePrivateConversationId(userA: number, userB: number) {
  if (!userA || !userB || userA === userB) return "";
  const [minId, maxId] = userA < userB ? [userA, userB] : [userB, userA];
  return `p_${minId}_${maxId}`;
}

function messageTypeToNumber(type?: string) {
  if (type === "emoji") return 2;
  if (type === "image") return 3;
  if (type === "file") return 4;
  return 1;
}

function messageTypeToString(type?: string, messageType?: number) {
  if (type === "emoji" || messageType === 2) return "emoji";
  if (type === "image" || messageType === 3) return "image";
  if (type === "file" || messageType === 4) return "file";
  return "text";
}

function toMessageTimestamp(value?: string) {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

function normalizeServerMessage(m: any, meName: string, meId: number): Message {
  const senderName = m.sender_username || m.username || "";
  const senderId = Number(m.sender_id || m.user_id || 0);
  const isMe = Boolean(
    senderId && senderId === meId
      || (senderName && senderName === meName)
  );
  return {
    id: m.id || 0,
    sender: isMe ? "me" : "them",
    type: messageTypeToString(m.type, m.message_type),
    content: m.content || "",
    time: timeFmt(m.created_at || m.CreatedAt || m.updated_at || ""),
    rawTime: m.created_at || m.CreatedAt || m.updated_at || "",
    sortTs: toMessageTimestamp(m.created_at || m.CreatedAt || m.updated_at || ""),
    fileName: m.file_name,
    fileData: m.file_url || m.fileData || "",
    username: senderName,
    senderAvatar: m.sender_avatar || "",
  };
}

function makeLocalMessage(messageId: number, type: Message["type"], content: string, fileName?: string, fileData?: string): Message {
  const now = new Date().toISOString();
  return {
    id: messageId,
    sender: "me",
    type,
    content,
    time: timeFmt(now),
    rawTime: now,
    sortTs: toMessageTimestamp(now),
    fileName,
    fileData,
    username: "",
    senderAvatar: "",
  };
}

function extractMessageRows(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.messages)) return payload.messages;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.list)) return payload.list;
  return [];
}

function normalizeAndSortMessages(rows: any[], meName: string, meId: number) {
  const parsed = rows.map((m: any) => normalizeServerMessage(m, meName, meId));
  return parsed.sort((a, b) => (a.sortTs || 0) - (b.sortTs || 0));
}

function getChatErrorMessage(err: any, fallback = "发送失败") {
  const data = err?.response?.data;
  return String(data?.message || data?.msg || data?.error || err?.message || fallback);
}

function extractConversationId(payload: any) {
  return String(
    payload?.conversation_id ||
    payload?.data?.conversation_id ||
    payload?.conversation?.conversation_id ||
    payload?.data?.conversation?.conversation_id ||
    ""
  );
}

function mergeMessages(existing: Message[], incoming: Message[]) {
  const map = new Map<string, Message>();
  for (const msg of existing) {
    map.set(messageKey(msg), msg);
  }
  for (const msg of incoming) {
    map.set(messageKey(msg), msg);
  }
  return [...map.values()].sort((a, b) => (a.sortTs || 0) - (b.sortTs || 0));
}

function appendMessage(existing: Message[], next: Message) {
  const filtered = existing.filter((item) => messageKey(item) !== messageKey(next));
  return [...filtered, next];
}

function messageKey(message: Message) {
  // 优先用后端消息 id 去重，避免同一条消息因时间字段或缓存层差异被重复渲染
  if (message.id && message.id > 0) {
    return `id:${message.id}`;
  }
  return [
    message.sender,
    message.type,
    message.content,
    message.fileName || "",
    message.fileData || "",
  ].join("|");
}

function appendConversationMessages(
  store: Map<string, Message[]>,
  convId: string,
  incoming: Message[],
  activeConvId?: string,
  onActive?: (messages: Message[]) => void,
) {
  if (!convId || incoming.length === 0) return;
  const existing = store.get(convId) || [];
  const next = incoming.reduce((acc, msg) => appendMessage(acc, msg), existing);
  store.set(convId, next);
  if (convId === activeConvId && onActive) onActive(next);
}

function buildSendPayload(params: {
  chatType: "private" | "group";
  recipientId: number;
  groupId: number;
  messageType: number;
  content: string;
  fileName?: string;
  fileUrl?: string;
}) {
  const base = {
    message_type: params.messageType,
    content: params.content,
    ...(params.fileName ? { file_name: params.fileName } : {}),
    ...(params.fileUrl ? { file_url: params.fileUrl } : {}),
  };

  return params.chatType === "group"
    ? {
        chat_type: "group",
        group_id: params.groupId,
        ...base,
      }
    : {
        chat_type: "private",
        recipient_id: params.recipientId,
        receiver_id: params.recipientId,
        ...base,
      };
}

const TEAM_AVATAR = teamAvatar

const ContactItem = memo(function ContactItem({
  contact,
  active,
  onSelect,
  online,
}: {
  contact: Contact;
  active: boolean;
  onSelect: (contact: Contact) => void;
  online: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(contact)}
      className={`w-full flex items-center gap-3 md:gap-4 px-4 md:px-5 text-left contact-btn ${active ? "active" : ""}`}
      style={{
        height:"64px",
        borderBottom:"1px solid rgba(255,255,255,0.05)",
        background:active?"rgba(0,0,0,0.26)":"rgba(255,255,255,0.015)",
        backdropFilter:"blur(18px)",
        WebkitBackdropFilter:"blur(18px)",
        boxShadow:active?"inset 0 1px 0 rgba(255,255,255,0.05)":"none",
        transform:active?"translate3d(0,0,0) scale(1.01)":"translate3d(0,0,0) scale(1)",
        transition:"background-color 240ms cubic-bezier(.16,1,.3,1), box-shadow 240ms cubic-bezier(.16,1,.3,1), transform 240ms cubic-bezier(.16,1,.3,1), color 240ms cubic-bezier(.16,1,.3,1), opacity 240ms cubic-bezier(.16,1,.3,1)",
        willChange:"transform, background-color, box-shadow, opacity",
        overflow:"hidden"
      }}
    >
      <div className="relative shrink-0">
        <div className="w-[52px] h-[52px] rounded-full grid place-items-center text-[13px] font-bold overflow-hidden shadow-lg ring-1 ring-white/10"
          style={contact.convId && isGroupConversationId(contact.convId)
            ? {background:"linear-gradient(135deg, rgba(139,92,246,0.35), rgba(6,182,212,0.28))",border:"1px solid rgba(255,255,255,0.15)",boxShadow:"0 0 8px rgba(59,246,243,0.83), 0 0 24px rgba(201,68,242,0.61)"}
            : contact.userData?.avatar?{boxShadow:"0 0 8px rgba(59,246,243,0.83), 0 0 24px rgba(201,68,242,0.61)"}:{background:"rgba(255,255,255,0.08)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.15)"}}>
          {contact.convId && isGroupConversationId(contact.convId) ? (
            <>
              <img src={TEAM_AVATAR} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
            </>
          ) : contact.userData?.avatar ? (
            <>
              <img
                src={resolveImgSrc(contact.userData.avatar)}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                onError={e=>{const img=e.currentTarget as HTMLImageElement; img.style.display='none'; const fb=img.parentElement?.querySelector<HTMLElement>('[data-avatar-fallback]'); if (fb) fb.style.display='grid';}}
              />
              <span data-avatar-fallback className="hidden w-full h-full place-items-center">{contact.avatar}</span>
            </>
          ) : (
            <span>{contact.avatar}</span>
          )}
        </div>
        {online&&<span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-[3px] border-[#0c0c14] shadow-[0_0_12px_rgba(52,211,153,0.7)]"/>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <p className="text-[15px] font-medium truncate" style={{color:active?"rgba(255,255,255,0.96)":"rgba(255,255,255,0.78)",transition:"color 240ms cubic-bezier(.16,1,.3,1)"}}>{contact.name}</p>
          <span className="text-[10px] text-white/25 font-mono shrink-0 ml-1.5">{contact.time}</span>
        </div>
        <div className="flex justify-between items-center mt-0.5">
          <p className="text-[12px] truncate" style={{color:active?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.25)",transition:"color 240ms cubic-bezier(.16,1,.3,1)"}}>{contact.lastMsg || ""}</p>
          {contact.unread>0&&<span className={`w-[16px] h-[16px] rounded-full grid place-items-center text-[8px] font-medium text-white/35 border border-white/20 leading-none shrink-0 ml-1.5 ${active?"hidden":""}`}>{contact.unread>99?"99+":contact.unread}</span>}
        </div>
      </div>
    </button>
  );
});

const ChatPage = () => {
  const { user, openAuth } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { onlineUsers, subscribe } = useOnlineStatus();
  const [previewImg, setPreviewImg] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendError, setSendError] = useState("");
  const [showMobileContacts, setShowMobileContacts] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<{ height: number; top: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const midRef = useRef(0);
  const meRef = useRef("Me");
  const activeContactIdRef = useRef(0);
  const activeConvIdRef = useRef("");
  const selectedPeerUserIdRef = useRef(0);
  const selectedGroupIdRef = useRef(0);
  const msgCacheRef = useRef<Map<number, Message[]>>(new Map());
  const convoMessagesRef = useRef<Map<string, Message[]>>(new Map());
  const pendingMessagesRef = useRef<Map<string, Message[]>>(new Map());
  const convIdCacheRef = useRef<Map<number, string>>(new Map());
  const loadAllRef = useRef<() => void>(() => {});
  const onlineUsersRef = useRef<Set<number>>(new Set());
  const queryClient = useQueryClient();

  const me = user;
  const authLoading = user === undefined;
  const isGuest = user === null;
  const meName = isGuest ? "Quest" : (me?.username||"");
  const meId = me?.id||0;
  const meInit = initials(meName);
  const meAvatar = me?.avatar ? resolveAvatar(me.avatar) : null;
  meRef.current = meName;
  onlineUsersRef.current = onlineUsers;
  const conversationsQuery = useChatConversations(Boolean(me));
  const storeConversationOrder = useChatStore((s) => s.conversationOrder);
  const storeConversations = useChatStore((s) => s.conversations);
  const hasStoredConversations = storeConversationOrder.length > 0;
  const storeContacts = useMemo(() => {
    return storeConversationOrder
      .map((id) => storeConversations[id])
      .filter(Boolean)
      .map((item) => {
        const members = Array.isArray(item.members) ? item.members : [];
        const peer = item.type === "private"
          ? members.find((m) => m.user_id !== me?.id) || members[0]
          : members[0];
        const peerId = peer?.user_id || 0;
        const contactUser: ChatUser = {
          id: parseConversationPeerId(item.conversationId, members),
          username: item.title || peer?.username || "",
          avatar: item.avatar || peer?.avatar,
          status: "active",
        };
        const contact = buildContact(contactUser, item.lastMessage || "", item.lastMessageAt || "");
        contact.online = item.type === "private" ? Boolean(peerId && onlineUsersRef.current.has(peerId)) : false;
        contact.unread = item.unreadCount || 0;
        contact.convId = item.conversationId;
        if (contactUser.avatar) contact.userData = contactUser;
        return contact;
      });
  }, [storeConversationOrder, storeConversations, onlineUsers]);

  /* ─── WebSocket messages via global provider ─── */
  useEffect(() => {
    const unsub = subscribe((d: WsMessage) => {
      const targetConvId = String(d.conversation_id || activeConvIdRef.current || "");
      const isGroupMsg = d.chat_type === "group";
      const currentConvId = activeConvIdRef.current;
      const isCurrentConversation = targetConvId && currentConvId === targetConvId;
      const pushMessage = (convId: string, msg: Message) =>
        appendConversationMessages(
          convoMessagesRef.current,
          convId,
          [msg],
          currentConvId,
          setMessages,
        );

      if((d.event==="message.new" || d.type==="message") && d.content) {
        const normalized = normalizeServerMessage(d, meRef.current, meId);
        const isMe = normalized.sender === "me";
        if(isMe) return;
        const msgTime = d.time || timeFmt(new Date().toISOString())
        const newMsg: Message = normalized;

        if (isGroupMsg && !isCurrentConversation) {
          pushMessage(targetConvId, newMsg);
          return;
        }
        if(activeConvIdRef.current && d.conversation_id && d.conversation_id !== activeConvIdRef.current) {
          const nextUnread = ((storeContacts.find(c => c.convId === d.conversation_id)?.unread ?? contacts.find(c => c.id === d.sender_id)?.unread ?? 0) + 1)
          upsertConversationSummary(String(d.conversation_id), {
            id: d.sender_id,
            name: d.username || d.sender_username || "",
            avatar: d.sender_avatar || "",
            lastMsg: d.content,
            lastTimeRaw: new Date().toISOString(),
            unread: nextUnread,
            lastMessageType: messageTypeToNumber(d.msg_type),
          })
          if (!storeContacts.length) {
            setContacts(prev => prev.map(c =>
              c.id === d.sender_id ? { ...c, lastMsg: d.content, time: msgTime, unread: nextUnread } : c
            ))
          }
          const cached = msgCacheRef.current.get(d.sender_id) || []
          const cachedMsg = { ...newMsg, time: msgTime, rawTime: d.time || new Date().toISOString() }
          msgCacheRef.current.set(d.sender_id, mergeMessages(cached, [cachedMsg]))
          pushMessage(String(d.conversation_id), newMsg);
          return
        }
        if(!isGroupMsg) {
          upsertConversationSummary(String(d.conversation_id || activeConvIdRef.current), {
            id: d.sender_id,
            name: d.username || d.sender_username || "",
            avatar: d.sender_avatar || "",
            lastMsg: d.content,
            lastTimeRaw: new Date().toISOString(),
            unread: 0,
            lastMessageType: messageTypeToNumber(d.msg_type),
          })
          if (!storeContacts.length) {
            setContacts(prev => prev.map(c =>
              c.id === d.sender_id ? { ...c, lastMsg: d.content, time: msgTime } : c
            ))
          }
        }
        pushMessage(String(d.conversation_id || activeConvIdRef.current), newMsg);
        const cached = msgCacheRef.current.get(d.sender_id) || []
        msgCacheRef.current.set(d.sender_id, mergeMessages(cached, [{ ...newMsg, rawTime: d.time || new Date().toISOString() }]))
        upsertConversationSummary(String(d.conversation_id || activeConvIdRef.current), {
          id: d.sender_id,
          name: d.username || d.sender_username || "",
          avatar: d.sender_avatar || "",
          lastMsg: d.content,
          lastTimeRaw: d.time || new Date().toISOString(),
          unread: 0,
          lastMessageType: messageTypeToNumber(d.msg_type),
        })
        setIsTyping(true); setTimeout(()=>setIsTyping(false),1500);
        return
      }
      if(d.event==="message.edit") {
        setMessages(p=>p.map(m=>m.id===d.id?{...m,content:d.content||m.content}:m))
        return
      }
      if(d.event==="message.delete") {
        setMessages(p=>p.filter(m=>m.id!==d.id))
        return
      }
      if(d.event==="conversation.read" && d.conversation_id) {
        if (!storeContacts.length) {
          setContacts(prev => prev.map(c => c.convId === d.conversation_id ? { ...c, unread: 0 } : c))
        }
        setUnread(String(d.conversation_id), 0)
        upsertConversationSummary(String(d.conversation_id), {
          id: 0,
          name: "",
          avatar: "",
          lastMsg: "",
          lastTimeRaw: new Date().toISOString(),
          unread: 0,
        })
        return
      }
      if(d.event==="conversation.update" && d.conversation_id) {
        upsertConversationSummary(String(d.conversation_id), {
          id: d.user_id || 0,
          name: d.username || "",
          avatar: d.avatar || "",
          lastMsg: d.last_message ?? d.content ?? "",
          lastTimeRaw: d.time || new Date().toISOString(),
          unread: d.unread_count ?? 0,
          lastMessageType: d.last_message_type ?? 1,
        })
        return
      }
      if(d.event==="typing.start" && d.sender_id) {
        if (activeContactIdRef.current === d.sender_id) setIsTyping(true)
        if (d.conversation_id) setTyping(String(d.conversation_id), true)
        return
      }
      if(d.event==="typing.stop") {
        setIsTyping(false)
        if (d.conversation_id) setTyping(String(d.conversation_id), false)
        return
      }
      if(d.event==="user_registered"&&d.user_id!==meRef.current) {
        loadAllRef.current()
        return
      }
      if(d.type==="recall") setMessages(p=>p.map(m=>m.id===d.msg_id?{...m,content:"[Message recalled]",type:"text"}:m));
    })
    return unsub
  }, [subscribe])

  const upsertConversationSummary = useCallback((conversationId: string, patch: Partial<Contact> & { lastMessageType?: number }) => {
    if (!conversationId) return;
    const next: Record<string, any> = {};
    if (patch.name !== undefined) next.title = patch.name;
    if (patch.avatar !== undefined) next.avatar = patch.avatar;
    if (patch.lastMsg !== undefined) next.lastMessage = patch.lastMsg;
    if (patch.lastMessageType !== undefined) next.lastMessageType = patch.lastMessageType;
    if (patch.lastTimeRaw !== undefined) next.lastMessageAt = patch.lastTimeRaw;
    if (patch.unread !== undefined) next.unreadCount = patch.unread;
    patchConversation(conversationId, next as any);
  }, []);

  const preloadConversationMessages = useCallback((conversationId?: string) => {
    if (!conversationId) return;
    const existing = queryClient.getQueryData(["chat", "messages", conversationId]);
    if (existing) return;
    void queryClient.prefetchInfiniteQuery({
      queryKey: ["chat", "messages", conversationId],
      queryFn: async () => {
        const res = await fetchConversationMessages(conversationId, { params: { limit: 30 } });
        return extractMessageRows(res.data?.data);
      },
      initialPageParam: undefined,
    });
  }, [queryClient]);

  const mergeContacts = useCallback((prev: Contact[], next: Contact[]) => {
    const map = new Map<string, Contact>();
    prev.forEach((item) => {
      const key = item.convId || String(item.id);
      map.set(key, item);
    });
    next.forEach((item) => {
      const key = item.convId || String(item.id);
      const current = map.get(key);
      map.set(key, current ? { ...current, ...item, userData: item.userData || current.userData } : item);
    });
    return [...map.values()].sort((a, b) => String(b.lastTimeRaw || "").localeCompare(String(a.lastTimeRaw || "")));
  }, []);

  const baseContacts = contacts.length ? contacts : storeContacts;
  const teamContacts = useMemo(() => baseContacts.filter((c) => isGroupConversationId(c.convId)), [baseContacts]);
  const personalContacts = useMemo(() => baseContacts.filter((c) => !isGroupConversationId(c.convId)), [baseContacts]);
  const activeContact = useMemo(() => {
    if (selectedConversationId) {
      const byConvId = baseContacts.find((c) => c.convId === selectedConversationId);
      if (byConvId) return byConvId;
    }
    if (activeIdx >= 0) {
      return baseContacts.find((c) => c.id === activeContactIdRef.current) || baseContacts[activeIdx] || null;
    }
    return null;
  }, [activeIdx, activeContactIdRef, baseContacts, selectedConversationId]);
  const activeConversationId = activeIdx === -2
    ? (selectedConversationId || "")
    : (activeContact && isGroupConversationId(activeContact.convId) ? activeContact.convId : (selectedConversationId || ""));
  const isActiveGroupConversation = Boolean(activeContact && isGroupConversationId(activeContact.convId));
  const isContactActive = useCallback((contact: Contact) => {
    return Boolean(contact.convId && contact.convId === activeConversationId);
  }, [activeConversationId]);
  const activeMessagesQuery = useChatMessages(activeConversationId || undefined, !!activeConversationId);
  /* ─── Load data ─── */
  const loadAll = useCallback(async () => {
    const queryItems = conversationsQuery.data || [];
    const res = await getConversations();
    const body: any = res.data?.data || { conversations: queryItems };
    const rawConversations: ConversationRow[] = body.conversations ?? [];
    const rawTeam = body.team as { id?: number; name?: string; members?: { user_id: number; username?: string; avatar?: string }[] } | undefined;
    const rawUsers: { user_id: number; username?: string; avatar?: string }[] = body.users ?? [];
    const convMap = new Map<number, ConversationRow>();
    const knownConversationIds = new Set<string>();
    const personalFromConversations = rawConversations
      .filter((conv) => conv.type === "private")
      .map((conv) => {
        knownConversationIds.add(conv.conversation_id);
        const members = Array.isArray(conv.users) ? conv.users : [];
        const peer = members.find((u) => u?.user_id && u.user_id !== me?.id) || members[0];
        const peerId = peer?.user_id || 0;
        if (peerId) convMap.set(peerId, conv);
        const contactUser: ChatUser = {
          id: parseConversationPeerId(conv.conversation_id, members),
          username: conv.title || peer?.username || "",
          avatar: conv.avatar || peer?.avatar,
          status: "active",
        };
        const contact = buildContact(contactUser, conv.last_message || "", conv.last_message_at || "");
        contact.online = Boolean(peerId && onlineUsersRef.current.has(peerId));
        contact.unread = conv.unread_count || 0;
        contact.convId = conv.conversation_id;
        if (contactUser.avatar) contact.userData = contactUser;
        return contact;
      });
    const personalFallback = rawUsers
      .filter((u) => u?.user_id && u.user_id !== me?.id && !convMap.has(u.user_id))
      .map((u) => {
        const contactUser: ChatUser = { id: u.user_id, username: u.username || "", avatar: u.avatar, status: "active" };
        const contact = buildContact(contactUser, "", "");
        contact.online = Boolean(onlineUsersRef.current.has(u.user_id));
        contact.convId = makePrivateConversationId(me?.id || 0, u.user_id);
        if (contactUser.avatar) contact.userData = contactUser;
        return contact;
      });
    const teamMembers = dedupeUsers([
      ...(rawTeam?.members || []).map((m) => ({ id: m.user_id, username: m.username || "", avatar: m.avatar })),
      ...rawUsers.map((u) => ({ id: u.user_id, username: u.username || "", avatar: u.avatar })),
    ]);
    const teamContacts = rawTeam?.id ? [{
      id: rawTeam.id,
      kind: "group",
      name: rawTeam.name || "One Room",
      avatar: "TG",
      lastMsg: "",
      time: "",
      lastTimeRaw: "",
      unread: 0,
      online: false,
      convId: `g_${rawTeam.id}`,
      members: teamMembers,
      userData: teamMembers[0] ? {
        id: teamMembers[0].id,
        username: teamMembers[0].username || "",
        avatar: teamMembers[0].avatar,
      } : undefined,
      } satisfies Contact] : [];
    if (rawTeam?.id) {
      knownConversationIds.add(`g_${rawTeam.id}`);
    }
    const cs = [...teamContacts, ...personalFromConversations, ...personalFallback];
    const savedSelection = localStorage.getItem(getChatSelectionStorageKey());
    const selectedTeam = savedSelection === "team"
      ? cs.find((c) => isGroupConversationId(c.convId))
      : undefined;
    const selectedContact = savedSelection && savedSelection !== "team"
      ? cs.find((c) => !isGroupConversationId(c.convId) && String(c.id) === savedSelection)
      : undefined;

    if (cs.length) {
      hydrateFromServer(
        cs
          .filter((item) => item.convId)
          .map((item) => ({
            conversationId: item.convId || "",
            type: item.convId?.startsWith("g_") ? "group" : "private",
            title: item.name,
            avatar: item.userData?.avatar || item.avatar,
            lastMessage: item.lastMsg,
            lastMessageType: 1,
            lastMessageAt: item.lastTimeRaw,
            unreadCount: item.unread,
            members: item.members?.map((member) => ({
              user_id: member.id,
              username: member.username,
              avatar: member.avatar,
            })) || [],
          }))
      );
    }
    startTransition(() => {
      setContacts((prev) => mergeContacts(prev, cs.length ? cs : [{ id: -1, name: "No users", avatar: "??", lastMsg: "Register to start chatting", time: "", lastTimeRaw: "", unread: 0, online: false }]));
    });

    const preloadTargets = [
      selectedTeam?.convId,
      selectedContact?.convId,
      ...cs
        .filter((item) => item.convId)
        .filter((item) => item.convId && knownConversationIds.has(item.convId))
        .sort((a, b) => String(b.lastTimeRaw || "").localeCompare(String(a.lastTimeRaw || "")))
        .slice(0, 4)
        .map((item) => item.convId),
    ].filter((value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index);
    preloadTargets.forEach((convId) => preloadConversationMessages(convId));

    if (selectedTeam) {
      setActiveIdx(cs.findIndex((c) => c.convId === selectedTeam.convId))
      activeContactIdRef.current = selectedTeam.id
      selectedGroupIdRef.current = selectedTeam.id
      selectedPeerUserIdRef.current = 0
      activeConvIdRef.current = selectedTeam.convId || ""
      setSelectedConversationId(selectedTeam.convId || "")
      const cached = convoMessagesRef.current.get(selectedTeam.convId || "") || []
      setMessages(cached)
      setLoadingMessages(cached.length === 0)
    } else if (selectedContact) {
      const selectedConvId = selectedContact.convId || ""
      setActiveIdx(cs.findIndex((c) => c.id === selectedContact.id))
      activeContactIdRef.current = selectedContact.id
      selectedPeerUserIdRef.current = selectedContact.id
      selectedGroupIdRef.current = 0
      let resolvedConvId = selectedConvId
      if (!resolvedConvId || !knownConversationIds.has(resolvedConvId)) {
        try {
          resolvedConvId = await ensurePrivateConversation(selectedContact.id)
        } catch {
          resolvedConvId = selectedConvId
        }
      }
      activeConvIdRef.current = resolvedConvId
      setSelectedConversationId(resolvedConvId)
      if (resolvedConvId) {
        const cached = convoMessagesRef.current.get(resolvedConvId) || []
        setMessages(cached)
        setLoadingMessages(cached.length === 0)
      } else {
        setMessages([])
        setLoadingMessages(false)
      }
    } else {
      setActiveIdx(-1)
      activeContactIdRef.current = 0
      selectedPeerUserIdRef.current = 0
      selectedGroupIdRef.current = 0
      activeConvIdRef.current = ""
      setSelectedConversationId("")
    }
  }, [me?.id, mergeContacts, preloadConversationMessages, conversationsQuery.data]);
  // 同步 loadAllRef，避免 WebSocket 闭包中的 TDZ 问题
  useEffect(() => { loadAllRef.current = loadAll; }, [loadAll]);

  useEffect(() => {
    const pages = activeMessagesQuery.data?.pages || [];
    if (!activeConversationId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }
    const cached = convoMessagesRef.current.get(activeConversationId) || [];
    if (!pages.length) {
      if (cached.length > 0) {
        setMessages(cached);
        setLoadingMessages(false);
      }
      return;
    }
    const flat = pages.flatMap((page: any) => extractMessageRows(page));
    const my = meRef.current;
    const parsed = normalizeAndSortMessages(flat, my, meId);
    const pending = pendingMessagesRef.current.get(activeConversationId) || [];
    const merged = mergeMessages(cached, mergeMessages(parsed, pending));
    convoMessagesRef.current.set(activeConversationId, merged);
    setMessages(merged);
    setLoadingMessages(false)
  }, [activeMessagesQuery.data, activeMessagesQuery.isFetching, activeConversationId, meId]);

  useEffect(() => {
    if (!activeConversationId) return;
    if (!activeMessagesQuery.isError) return;
    const cached = convoMessagesRef.current.get(activeConversationId) || [];
    if (cached.length > 0) {
      setMessages(cached);
    } else {
      setMessages([]);
    }
    setLoadingMessages(false);
  }, [activeMessagesQuery.isError, activeConversationId]);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    if (activeMessagesQuery.isFetchingPreviousPage && scrollAnchorRef.current) {
      const prev = scrollAnchorRef.current;
      const delta = el.scrollHeight - prev.height;
      el.scrollTop = prev.top + delta;
      scrollAnchorRef.current = null;
      return;
    }
    if (activeConversationId) {
      el.scrollTop = el.scrollHeight;
    }
  }, [activeConversationId, activeMessagesQuery.data, activeMessagesQuery.isFetchingPreviousPage]);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el || !activeMessagesQuery.hasPreviousPage || activeMessagesQuery.isFetchingPreviousPage) return;
    if (el.scrollTop > 120) return;
    scrollAnchorRef.current = { height: el.scrollHeight, top: el.scrollTop };
    void activeMessagesQuery.fetchPreviousPage();
  }, [activeMessagesQuery]);

  useEffect(() => {
    let cancelled = false;
    if (!me) {
      setLoading(false);
      return;
    }
    const hasLocalData = hasStoredConversations || contacts.length > 0;
    setLoading(!hasLocalData);
    (async () => {
      try {
        await loadAll();
        if (cancelled) return;
      } catch (e) {
        if (!cancelled) {
          console.error("Load contacts failed:", e);
          if (!hasLocalData) {
            setContacts([{ id: -2, name: "⚠", avatar: "!", lastMsg: me ? "Backend not reachable" : "Login to chat", time: "", lastTimeRaw: "", unread: 0, online: false }]);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [me, loadAll, hasStoredConversations, contacts.length]);

  useEffect(() => {
    if (!me) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const triggerRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void conversationsQuery.refetch();
      }, 300);
    };
    window.addEventListener("focus", triggerRefresh);
    window.addEventListener("pageshow", triggerRefresh);
    document.addEventListener("visibilitychange", triggerRefresh);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", triggerRefresh);
      window.removeEventListener("pageshow", triggerRefresh);
      document.removeEventListener("visibilitychange", triggerRefresh);
    };
  }, [me, conversationsQuery]);

  /* ─── Switch contact → load private messages ─── */
  const ensurePrivateConversation = useCallback(async (userId: number) => {
    if (!userId || !me?.id) return "";
    const cachedConvId = convIdCacheRef.current.get(userId);
    if (cachedConvId) return cachedConvId;
    const res = await createConversation(userId);
    const convId = String(res.data?.data?.conversation_id || "");
    if (convId) {
      convIdCacheRef.current.set(userId, convId);
    }
    return convId;
  }, [me?.id]);

  const switchContact = useCallback(async (contact: Contact) => {
    const idx = baseContacts.findIndex(c => c.convId === contact.convId && c.id === contact.id);
    if(idx<0) return;
    setActiveIdx(idx);
    const nextContact = baseContacts[idx];
    activeContactIdRef.current = nextContact.id;
    const isTeamContact = isGroupConversationId(nextContact?.convId);
    if (isTeamContact) {
      selectedGroupIdRef.current = nextContact.id
      selectedPeerUserIdRef.current = 0
    } else {
      selectedPeerUserIdRef.current = nextContact.id
      selectedGroupIdRef.current = 0
    }
    localStorage.setItem(getChatSelectionStorageKey(), isTeamContact ? "team" : String(nextContact.id));
    setLoadingMessages(true);
    let convId = nextContact?.convId || "";
    if (!isTeamContact) {
      try {
        convId = convId || (await ensurePrivateConversation(nextContact.id));
      } catch (err) {
        console.error("Ensure private conversation failed:", err);
        convId = convId || makePrivateConversationId(me?.id || 0, nextContact.id);
      }
    }
    setSelectedConversationId(convId);
    activeConvIdRef.current = convId;
    const cached = convoMessagesRef.current.get(convId || "") || [];
    if (cached.length > 0) {
      setMessages(cached);
      setLoadingMessages(false);
    } else {
      setLoadingMessages(true);
    }
    // 标记已读：调用后端 API + 更新本地未读计数
    if (convId) {
      markConversationRead(convId).catch(() => {})
      convIdCacheRef.current.set(nextContact.id, convId)
      setUnread(convId, 0)
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", convId] });
      preloadConversationMessages(convId);
    }
    if (window.innerWidth < 768) setShowMobileContacts(false);
  }, [baseContacts, ensurePrivateConversation, preloadConversationMessages, queryClient, me?.id]);

  /* ─── Send ─── */
  const sendMsg = useCallback(async (type: string, content: string, fileName?: string, fileData?: string) => {
    const targetContact =
      baseContacts.find((c) => c.id === activeContactIdRef.current) ||
      activeContact ||
      baseContacts.find((c) => c.convId === activeConversationId) ||
      null
    const selectedConvId = targetContact?.convId || activeConversationId || selectedConversationId || ""
    const chatType: "private" | "group" = selectedGroupIdRef.current > 0 ? "group" : "private"
    const isGroup = chatType === "group"
    const targetReceiverId = selectedPeerUserIdRef.current || targetContact?.id || activeContactIdRef.current || 0
    const targetGroupId = isGroup ? (selectedGroupIdRef.current || targetContact?.id || 0) : 0
    if (chatType === "private" && targetReceiverId <= 0) {
      return
    }
    if (chatType === "group" && targetGroupId <= 0) {
      return
    }
    const optimisticTime = new Date().toISOString();
    let messageType = 1;
    if (type==="emoji") messageType = 2;
    else if (type==="image") messageType = 3;
    else if (type==="file") messageType = 4;
    const payload = buildSendPayload({
      chatType,
      recipientId: targetReceiverId,
      groupId: targetGroupId,
      messageType,
      content,
      fileName,
      fileUrl: fileData,
    });
    try {
      setSendError("");
      const optimisticMessage = makeLocalMessage(-Date.now(), type === "emoji" ? "emoji" : type === "image" ? "image" : type === "file" ? "file" : "text", content, fileName, fileData);
      optimisticMessage.sortTs = Date.now();
      const optimisticConvId = selectedConvId || activeConversationId;
      if (optimisticConvId) {
        const existing = convoMessagesRef.current.get(optimisticConvId) || [];
        const nextMessages = appendMessage(existing, optimisticMessage);
        convoMessagesRef.current.set(optimisticConvId, nextMessages);
        setMessages((prev) => appendMessage(prev, optimisticMessage));
        requestAnimationFrame(() => {
          messagesScrollRef.current?.scrollTo({ top: messagesScrollRef.current.scrollHeight, behavior: "auto" });
        });
      }
      const res = await sendChatMessage(payload);
      const body = res.data?.data || {};
      const serverConvId = String(body.conversation_id || selectedConvId || activeConversationId || "");
      if (serverConvId) {
        activeConvIdRef.current = serverConvId;
        setSelectedConversationId(serverConvId);
        if (chatType === "private" && targetReceiverId > 0) {
          convIdCacheRef.current.set(targetReceiverId, serverConvId);
        }
      }
      const normalizedBody = Object.keys(body).length
        ? normalizeServerMessage(body, meName, meId)
        : null;
      const serverMessage: Message = normalizedBody
        ? { ...normalizedBody, sender: "me" }
        : {
            ...local,
            rawTime: body.created_at || optimisticTime,
          };
      const effectiveTime = body.created_at || body.CreatedAt || body.updated_at || optimisticTime;
      const messageId = Number(body.id || serverMessage.id || 0);
      if (Number.isFinite(messageId) && messageId > 0) {
        serverMessage.id = messageId;
      }
      serverMessage.type = messageTypeToString(serverMessage.type, body.message_type || messageType);
      serverMessage.content = body.content || serverMessage.content || content;
      serverMessage.fileName = body.file_name || fileName;
      serverMessage.fileData = body.file_url || fileData || serverMessage.fileData;
      serverMessage.rawTime = effectiveTime;
      serverMessage.time = timeFmt(effectiveTime);
      serverMessage.sortTs = toMessageTimestamp(effectiveTime) || Date.now();
      if (serverConvId || activeConversationId) {
        const currentConvId = serverConvId || activeConversationId;
        const existing = convoMessagesRef.current.get(currentConvId) || [];
        const nextMessages = appendMessage(existing, serverMessage);
        convoMessagesRef.current.set(currentConvId, nextMessages);
        setMessages((prev) => appendMessage(prev, serverMessage));
        requestAnimationFrame(() => {
          messagesScrollRef.current?.scrollTo({ top: messagesScrollRef.current.scrollHeight, behavior: "smooth" });
        });
        upsertConversationSummary(currentConvId, {
          id: meId,
          name: meName,
          avatar: meAvatar || "",
          lastMsg: content,
          lastTimeRaw: body.created_at || optimisticTime,
          unread: 0,
          lastMessageType: body.message_type || messageType,
        })
      }
      queryClient.setQueryData(["chat", "messages", serverConvId || activeConversationId], (old: any) => {
        const pages = Array.isArray(old?.pages) ? old.pages : [];
        if (!pages.length) {
          return { ...old, pages: [[serverMessage]], pageParams: [undefined] };
        }
        const firstPage = extractMessageRows(pages[0]);
        const mergedFirst = mergeMessages(firstPage, [serverMessage]);
        return {
          ...old,
          pages: [mergedFirst, ...pages.slice(1)],
        };
      });
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
    } catch (e) {
      const message = getChatErrorMessage(e, "发送失败，请稍后重试");
      console.error("Send failed:", e);
      setSendError(message);
      toast.error(message);
      if (selectedConvId || activeConversationId) {
        const currentConvId = selectedConvId || activeConversationId;
        const cached = convoMessagesRef.current.get(currentConvId) || [];
        convoMessagesRef.current.set(currentConvId, cached);
      }
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
    }
  }, [baseContacts,activeConversationId,meAvatar,meId,meName,upsertConversationSummary,activeContact,queryClient,selectedConversationId]);

  const sendText = () => { const v=input.trim(); if(!v) return; sendMsg(/^\p{Emoji}+$/u.test(v)?"emoji":"text",v); setInput(""); setShowEmoji(false); };
  const sendImg = () => { if(!previewImg) return; sendMsg("image",previewImg,"image.png",previewImg); setPreviewImg(null); };
  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>sendMsg("file",f.name,f.name,r.result as string); r.readAsDataURL(f); e.target.value=""; };
  const pickImg = (e: React.ChangeEvent<HTMLInputElement>) => { const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>setPreviewImg(r.result as string); r.readAsDataURL(f); e.target.value=""; };

  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      messagesScrollRef.current?.scrollTo({ top: messagesScrollRef.current.scrollHeight, behavior: "auto" });
    });
  }, [activeConversationId, messages]);

  const grad = (i: number) => AVATAR_GRADS[i%7];
  const userGrad = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }
    return AVATAR_GRADS[Math.abs(hash) % 7];
  }
  const online = (c: Contact) => c.online;
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const sortAndFilterContacts = useCallback((items: Contact[]) => {
    return [...items]
      .filter(c => c.name.toLowerCase().includes(deferredSearchQuery.toLowerCase()))
      .sort((a,b) => {
        const aOn = online(a) ? 1 : 0
        const bOn = online(b) ? 1 : 0
        if (aOn !== bOn) return bOn - aOn
        if (aOn && bOn) {
          const aTime = a.lastTimeRaw || ""
          const bTime = b.lastTimeRaw || ""
          if (aTime && bTime && aTime !== bTime) return bTime.localeCompare(aTime)
          if (aTime && !bTime) return -1
          if (!aTime && bTime) return 1
        }
        const aAv = a.userData?.avatar ? 1 : 0
        const bAv = b.userData?.avatar ? 1 : 0
        if (aAv !== bAv) return bAv - aAv
        return a.name.localeCompare(b.name)
      })
  }, [deferredSearchQuery]);
  const filteredTeamContacts = useMemo(() => sortAndFilterContacts(teamContacts), [sortAndFilterContacts, teamContacts]);
  const filteredPersonalContacts = useMemo(() => sortAndFilterContacts(personalContacts), [sortAndFilterContacts, personalContacts]);
  const contact = activeContact || baseContacts[activeIdx];

  useEffect(()=>{if(activeIdx!==-2)activeContactIdRef.current=contact?.id||0;},[contact,activeIdx]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{background:"radial-gradient(circle at 30% 80%, rgba(164,89,255,0.35), transparent 30%), radial-gradient(circle at 70% 20%, rgba(110,0,255,0.25), transparent 25%), linear-gradient(135deg, #070707, #111111)"}}>
      {/* Glow blobs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-20 bottom-1/4 w-[400px] h-[400px] rounded-full opacity-20 max-md:w-[200px] max-md:h-[200px]" style={{background:"#A855F7",filter:"blur(120px)"}}/>
        <div className="absolute right-0 top-1/4 w-[300px] h-[300px] rounded-full opacity-15 max-md:w-[150px] max-md:h-[150px]" style={{background:"#6D28D9",filter:"blur(100px)"}}/>
        <div className="absolute left-1/3 -top-10 w-[250px] h-[250px] rounded-full opacity-10 max-md:w-[120px] max-md:h-[120px]" style={{background:"#7C3AED",filter:"blur(90px)"}}/>
      </div>
      <style>{`.csb{scrollbar-width:none;-ms-overflow-style:none}.csb::-webkit-scrollbar{display:none}
@keyframes msgIn{0%{opacity:0;transform:translateY(16px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes msgInMe{0%{opacity:0;transform:translateY(16px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}
.msg-anim{animation:msgIn .28s cubic-bezier(.16,1,.3,1) both}
.msg-anim-me{animation:msgInMe .28s cubic-bezier(.16,1,.3,1) both}
.contact-btn{position:relative}
.contact-btn::before{content:"";position:absolute;left:0;top:50%;width:3px;height:40px;border-radius:0 3px 3px 0;background:linear-gradient(to bottom,#a855f7,#06b6d4);transform:translateY(-50%) scaleY(.15);transform-origin:center;transition:transform .28s cubic-bezier(.16,1,.3,1), opacity .28s cubic-bezier(.16,1,.3,1);opacity:0}
.contact-btn.active::before{transform:translateY(-50%) scaleY(1);opacity:1}
.contact-btn:not(.active):hover{background:rgba(255,255,255,0.04)!important}
.contact-btn.active:hover{background:rgba(0,0,0,0.26)!important}
.contact-btn:active{transform:translate3d(0,0,0) scale(.99)}`}</style>
      <Sidebar/>

      {/* Main glass panel */}
      <div className="relative z-10 w-full max-w-[1600px] h-[100svh] md:h-[calc(100vh-72px)] flex flex-col md:flex-row ml-0 lg:ml-24 mr-0 lg:mr-[30px] pb-0 rounded-none md:rounded-[20px] lg:rounded-[32px] overflow-hidden"
        style={{background:"rgba(255,255,255,0.06)",backdropFilter:"blur(30px) saturate(180%)",WebkitBackdropFilter:"blur(30px) saturate(180%)",border:"1px solid rgba(255,255,255,0.12)",boxShadow:"0 32px 80px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)"}}>

        {/* Mobile drawer overlay */}
        {showMobileContacts && (
          <div className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setShowMobileContacts(false)}/>
        )}

        {/* LEFT — Glass sidebar (redesigned) */}
        <div className={`w-full md:w-[280px] lg:w-[320px] shrink-0 flex flex-col h-full md:flex fixed md:relative z-30 md:z-auto top-0 left-0 transition-transform duration-300 ${showMobileContacts ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          style={{background:"rgba(255,255,255,0.03)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderRight:"1px solid rgba(255,255,255,0.08)"}}>

          {/* Header */}
          <div className="px-5 pt-6 pb-4" style={{borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold text-violet-400/50 uppercase tracking-[0.25em] mb-1">chat box</p>
                <h2 className="text-xl md:text-[24px] font-bold tracking-tight" style={{background:"linear-gradient(135deg, #fff, #c4b5fd, #67e8f9)",WebkitBackgroundClip:"text",backgroundClip:"text",WebkitTextFillColor:"transparent",color:"transparent"}}>Chat</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-white/40 w-7 h-7 rounded-full grid place-items-center border border-white/20">{baseContacts.filter(c=>c.id!==0).length}</span>
                <span className="text-[10px] font-medium text-emerald-400/70 w-7 h-7 rounded-full grid place-items-center border border-emerald-400/30">{baseContacts.filter(c => c.online).length}</span>
              </div>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20"/>
              <input placeholder="Search contacts..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                className="w-full rounded-2xl pl-9 pr-4 py-2.5 text-base md:text-[11px] outline-none placeholder:text-white/15 text-white/70"
                style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)"}}/>
            </div>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto csb">
            {loading ? (
              <div className="space-y-2 px-5 py-4">{[1,2,3,4].map(i=><div key={i} className="h-[84px] flex items-center gap-4"><div className="w-[52px] h-[52px] rounded-full bg-white/[0.03] animate-pulse shrink-0"/><div className="flex-1 space-y-2"><div className="h-3 w-3/4 rounded bg-white/[0.03] animate-pulse"/><div className="h-2 w-1/2 rounded bg-white/[0.02] animate-pulse"/></div></div>)}</div>
            ) : baseContacts.length === 0 ? (
              <div className="text-center py-10 text-white/20 text-[12px]">
                {isGuest ? <span>Login to view contacts - <button onClick={()=>openAuth("login")} className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">Login &rarr;</button></span> : <span className="text-white/10">{authLoading ? "" : "No contacts"}</span>}
              </div>
            ) : (
              <>
                <div className="px-4 md:px-5 pt-4 md:pt-6 pb-2 md:pb-3 text-base md:text-lg" style={{fontWeight:500,color:"rgba(255,255,255,0.85)"}}>Team</div>
                {filteredTeamContacts.length === 0 ? (
                  <div className="px-5 py-4 text-[12px] text-white/15">No team chats</div>
                ) : (
                  filteredTeamContacts.map((c) => (
                    <ContactItem key={`team-${c.convId || c.id}`} contact={c} active={isContactActive(c)} onSelect={switchContact} online={online(c)} />
                  ))
                )}

                <div className="px-4 md:px-5 pt-4 md:pt-6 pb-2 md:pb-3 text-base md:text-lg" style={{fontWeight:500,color:"rgba(255,255,255,0.85)"}}>Personal</div>
                {filteredPersonalContacts.length === 0 ? (
                  <div className="px-5 py-4 text-[12px] text-white/15">No personal chats</div>
                ) : (
                  filteredPersonalContacts.map((c) => (
                    <ContactItem key={`personal-${c.convId || c.id}`} contact={c} active={isContactActive(c)} onSelect={switchContact} online={online(c)} />
                  ))
                )}
              </>
            )}
          </div>

          {/* Bottom profile */}
          <div className="px-5 py-4" style={{borderTop:"1px solid rgba(255,255,255,0.05)"}}>
            <div className="flex items-center gap-4" style={{height:"52px"}}>
              {authLoading ? (
                <div className="w-[52px] h-[52px] rounded-full bg-white/[0.04] animate-pulse shrink-0"/>
              ) : isGuest ? (
                <>
                  <div className="w-[52px] h-[52px] rounded-full grid place-items-center text-[13px] font-bold shadow-lg ring-1 ring-white/10 shrink-0"
                    style={{background:"rgba(255,255,255,0.06)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.12)"}}>
                    <span className="text-white/40 text-[10px]">?</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-white/50">Quest</p>
                    <button onClick={() => openAuth("login")} className="text-[11px] text-cyan-400/70 hover:text-cyan-300 underline underline-offset-2 transition-colors">Login to chat →</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-[52px] h-[52px] rounded-full grid place-items-center text-[13px] font-bold shadow-lg ring-1 ring-white/10 overflow-hidden shrink-0"
                    style={meAvatar?{}:{background:"rgba(255,255,255,0.10)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.18)"}}>
                    {meAvatar?<img src={meAvatar} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async"/>:meInit}
                  </div>
                  <div className="flex-1 min-w-0"><p className="text-[14px] font-medium text-white/85">{meName}</p><p className="text-[11px] text-emerald-400/60">Online</p></div>
                </>
              )}
              <ChevronDown size={14} className="text-white/20"/>
            </div>
          </div>
        </div>

        {/* CENTER — Chat area */}
        <div className={`flex-1 flex flex-col h-full min-w-0 overflow-hidden ${showMobileContacts ? "hidden md:flex" : "flex"} md:flex pb-[88px] lg:pb-0`}
          style={{background:"rgba(255,255,255,0.01)"}}>
          <div className="px-5 py-3 flex items-center gap-3 shrink-0" style={{borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(255,255,255,0.015)"}}>
            {/* Mobile back / toggle contacts button */}
            <button onClick={()=>setShowMobileContacts(true)} className="md:hidden w-8 h-8 rounded-full grid place-items-center text-white/40 hover:text-white hover:bg-white/[0.08] shrink-0 active:scale-90 transition-all duration-200">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
            {loading ? (
              <>
                <div className="w-9 h-9 rounded-full bg-white/[0.06] animate-pulse shrink-0"/>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3 w-24 rounded-full bg-white/[0.06] animate-pulse"/>
                  <div className="h-2 w-16 rounded-full bg-white/[0.04] animate-pulse"/>
                </div>
              </>
            ) : isActiveGroupConversation && contact ? (
              <>
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center"
                    style={{background:"linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.3))",border:"1px solid rgba(255,255,255,0.15)",boxShadow:"0 0 8px rgba(59,246,243,0.83), 0 0 24px rgba(201,68,242,0.61)"}}>
                    <img src={TEAM_AVATAR} alt="Group" className="w-full h-full object-cover" loading="lazy" decoding="async"/>
                  </div>
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-[13px] font-semibold text-white/90">{contact.name}</p>
                  <p className="text-[10px] text-white/20">{(contact.members?.length || 0)} registered users</p>
                </div>
                <div className="relative shrink-0">
                  <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-[-1rem] flex items-center justify-end gap-0.5 max-w-[calc(100vw-11rem)] md:max-w-[260px] overflow-hidden">
                    {(contact.members || []).slice(0, 20).map((member, index) => (
                      <span
                        key={`header-team-mini-${member.id}`}
                        className="w-6 h-6 rounded-full overflow-hidden border border-white/15 shadow-md shrink-0 grid place-items-center text-[8px] font-bold text-white/80"
                        style={{
                          marginLeft: index === 0 ? 0 : -6,
                          background: "rgba(255,255,255,0.10)",
                          backdropFilter: "blur(20px)",
                          WebkitBackdropFilter: "blur(20px)",
                        }}
                        title={member.username || "Member"}
                      >
                        {resolveImgSrc(member.avatar) ? (
                          <img
                            src={resolveImgSrc(member.avatar)}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              const img = e.currentTarget as HTMLImageElement;
                              img.style.display = "none";
                              const fb = img.parentElement?.querySelector<HTMLElement>('[data-avatar-fallback]');
                              if (fb) fb.style.display = 'grid';
                            }}
                          />
                        ) : (
                          <span className="w-full h-full grid place-items-center">
                            {(member.username || "?").slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span data-avatar-fallback className="absolute inset-0 hidden place-items-center">
                          {(member.username || "?").slice(0, 2).toUpperCase()}
                        </span>
                      </span>
                    ))}
                    {(contact.members?.length || 0) > 20 && (
                      <span className="w-6 h-6 rounded-full overflow-hidden border border-white/15 bg-[rgba(255,255,255,0.10)] backdrop-blur-[20px] text-[8px] leading-none font-bold grid place-items-center text-white/70 shadow-md shrink-0">
                        +{(contact.members?.length || 0) - 20}
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full grid place-items-center text-[10px] font-bold shadow-lg ring-1 ring-white/10 overflow-hidden"
                    style={contact?.userData?.avatar?{}:{background:"rgba(255,255,255,0.10)",backdropFilter:"blur(20px)"}}>
                    {contact?.userData?.avatar ? (
                      <>
                        <img src={contact.userData.avatar.startsWith('http')?contact.userData.avatar:resolveAvatar(contact.userData.avatar)} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" onError={e=>{const img=e.currentTarget as HTMLImageElement; img.style.display='none'; const fb=img.parentElement?.querySelector<HTMLElement>('[data-avatar-fallback]'); if (fb) fb.style.display='grid';}}/>
                        <span data-avatar-fallback className="hidden w-full h-full place-items-center">{contact?.avatar||"??"}</span>
                      </>
                    ) : <span>{contact?.avatar||"??"}</span>}
                  </div>
                  {contact&&online(contact)&&<span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-[3px] border-[#0c0c14] shadow-[0_0_12px_rgba(52,211,153,0.7)]"/>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-white/90">{contact?.name||"Select a conversation"}</p>
                  <p className="text-[10px] text-white/20">
                    {isTyping?<span className="text-violet-300/60">typing...</span>
                    :contact&&online(contact)?<span className="text-emerald-400/60">Online</span>
                    :contact?<span className="text-white/15 italic">offline</span>
                    :""}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Messages */}
          <div ref={messagesScrollRef} onScroll={handleMessagesScroll} className="flex-1 overflow-y-auto csb px-5 py-4 space-y-1.5 transition-opacity duration-300">
            {loading?<div className="flex items-center justify-center h-full"><p className="text-[13px] text-white/10 animate-pulse">Loading...</p></div>
            :(!contact||contact.id===0)&&!isActiveGroupConversation?<div className="flex items-center justify-center h-full flex-col gap-2"><p className="text-[13px] text-white/20">{isGuest ? "Login to start chatting" : (authLoading ? "" : "Select a contact to start chatting")}</p>{isGuest && <button onClick={()=>openAuth("login")} className="text-[12px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors">Login →</button>}</div>
            :loadingMessages && messages.length===0 ? (
              <div className="space-y-3 py-4">
                {[1,2,3].map((i)=>(
                  <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[72%]">
                      <div className={`h-10 rounded-[24px] animate-pulse ${i % 2 === 0 ? "bg-white/10" : "bg-white/6"}`} style={{width: i === 2 ? "12rem" : "16rem"}} />
                    </div>
                  </div>
                ))}
              </div>
            ) : activeMessagesQuery.isFetchingPreviousPage?<div className="flex items-center justify-center py-2"><p className="text-[11px] text-white/18 animate-pulse">Loading older messages...</p></div>
            :messages.length===0?<div className="flex items-center justify-center h-full"><p className="text-[13px] text-white/20">Send a message to start</p></div>
            :messages.map((m,i)=>{
              const isMe=m.sender==="me";
              const prevSame=i>0&&messages[i-1]?.sender===m.sender;
              const showAv=!prevSame;
              const avEl=isMe
                ?(meAvatar?<img src={meAvatar} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async"/>:<span>{meInit}</span>)
                :(m.senderAvatar
                  ? <img src={resolveAvatar(m.senderAvatar)||''} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" onError={e=>{const t=e.currentTarget as HTMLImageElement;t.style.display='none';t.parentElement&&(t.parentElement.innerHTML=`<span style="font-size:8px;font-weight:700">${(m.username||'?').slice(0,2).toUpperCase()}</span>`)}}/>
                  : (contact?.userData?.avatar
                    ? <>
                        <img src={resolveAvatar(contact.userData.avatar)||''} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" onError={e=>{const img=e.currentTarget as HTMLImageElement; img.style.display='none'; const fb=img.parentElement?.querySelector<HTMLElement>('[data-avatar-fallback]'); if (fb) fb.style.display='grid';}}/>
                        <span data-avatar-fallback className="hidden w-full h-full place-items-center">{(contact?.name||'?').slice(0,2).toUpperCase()}</span>
                      </>
                    : <span>{contact?.avatar||"?"}</span>));
              return (
                <div key={messageKey(m)} className={`flex ${isMe?"justify-end":"justify-start"} ${isMe?"msg-anim-me":"msg-anim"}`}>
                  <div className={`flex items-start gap-2.5 max-w-[88%] md:max-w-[72%] ${isMe?"":"flex-row-reverse"}`}>
                    {/* Message content — me: left of avatar / them: right of avatar */}
                    <div className={`flex flex-col ${isMe?"items-end":"items-start"} gap-0.5 min-w-0`}>
                      {m.type==="text"||m.type==="emoji"&&m.content.length>2?<div className={`px-5 py-3 text-[13px] leading-relaxed rounded-[3rem] ${isMe?"rounded-br-lg text-white/95":"rounded-bl-lg text-white/88"}`}
                        style={isMe?{background:"linear-gradient(135deg, #7c3aed, #06b6d4)",boxShadow:"0 6px 20px -6px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.15)"}:{background:"rgba(255,255,255,0.06)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.06)",boxShadow:"0 4px 12px -4px rgba(0,0,0,0.15)"}}>{m.content}</div>
                      :m.type==="emoji"?<div className="text-[40px] leading-none select-none">{m.content}</div>
                      :m.type==="image"?<img src={m.content} alt="" className="max-w-[280px] rounded-2xl object-cover cursor-pointer hover:scale-[1.02] transition-transform" loading="lazy" decoding="async"/>
                      :m.type==="file"?<div className="flex items-center gap-3 px-4 py-3 rounded-[20px] max-w-[280px]" style={{background:"rgba(255,255,255,0.05)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.06)"}}>
                        <FileText size={16} className="text-violet-400 shrink-0"/><div className="flex-1 min-w-0"><p className="text-[11px] font-medium truncate">{m.fileName}</p></div>
                        {m.fileData&&<a href={m.fileData} download={m.fileName} className="w-7 h-7 rounded-lg grid place-items-center hover:bg-white/10"><Download size={12} className="text-white/30 hover:text-white/60"/></a>}
                      </div>:null}
                      <span className="text-[9px] text-white/40 px-1">{m.time}</span>
                    </div>
                    {/* Avatar + username — me: right side / them: left side */}
                    <div className="shrink-0 flex flex-col items-center gap-0.5">
                      {showAv?<div className={`w-7 h-7 rounded-full overflow-hidden grid place-items-center text-[9px] font-bold ring-1 ring-white/10 ${isMe?"":`bg-gradient-to-br ${m.senderAvatar?userGrad(m.username||''):grad(activeIdx)}`}`}
                        style={isMe&&!meAvatar?{background:"rgba(255,255,255,0.10)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.18)"}:{}}>{avEl}</div>:<div className="w-7"/>}
                      {showAv&&<span className="text-[9px] text-white font-medium px-0.5 whitespace-nowrap">{isMe?meName:m.username}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {isTyping&&<div className="flex justify-start transition-opacity duration-200">
              <div className="flex flex-row-reverse items-start gap-2.5 max-w-[88%] md:max-w-[72%]">
                <div className="px-4 py-3 rounded-[3rem] rounded-bl-lg flex items-center gap-1" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.04)"}}>
                  {[0,160,320].map(d=><span key={d} className="w-[5px] h-[5px] rounded-full bg-violet-300/30 animate-bounce" style={{animationDelay:`${d}ms`,animationDuration:"0.8s"}}/>)}
                </div>
                <div className="shrink-0 flex flex-col items-center gap-0.5">
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${grad(activeIdx)} grid place-items-center text-[9px] font-bold`}>{contact?.avatar||"?"}</div>
                  <span className="text-[9px] text-white font-medium whitespace-nowrap">{contact?.name||"?"}</span>
                </div>
              </div>
            </div>}
            <div ref={chatEndRef}/>
          </div>

          {previewImg&&<div className="mx-5 mb-1 p-3 rounded-2xl flex items-center gap-3" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)"}}>
            <img src={previewImg} alt="" className="w-12 h-12 rounded-xl object-cover" loading="lazy" decoding="async"/>
            <span className="text-[11px] text-white/50 flex-1">Image ready</span>
            <button onClick={()=>setPreviewImg(null)} className="text-white/20 hover:text-white/60 text-xs px-2">✕</button>
            <button onClick={sendImg} className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-500 to-cyan-400 text-white">Send</button>
          </div>}

          <div className="relative px-3 md:px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] md:pb-4 pt-2 shrink-0">
            <div className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 h-[50px] md:h-[56px] rounded-full"
              style={{background:"rgba(255,255,255,0.04)",backdropFilter:"blur(30px)",border:"1px solid rgba(255,255,255,0.15)",boxShadow:"0 8px 32px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)"}}>
              <div className="relative">
                <button onClick={()=>setShowEmoji(!showEmoji)} disabled={(!contact||contact.id===0)&&activeIdx!==-2} className={`w-8 h-8 md:w-9 md:h-9 rounded-full grid place-items-center shrink-0 aspect-square transition-all active:scale-90 ${showEmoji?"bg-white/[0.08] text-violet-400":"text-white/25 hover:text-white/60 hover:bg-white/[0.04]"} ${(!contact||contact.id===0)&&activeIdx!==-2?"opacity-20 cursor-not-allowed":""}`}><Smile size={15}/></button>
                {showEmoji&&<div className="absolute bottom-full left-0 mb-3 rounded-2xl p-3 w-[280px] md:w-[304px] z-50" style={{background:"rgba(18,16,30,0.97)",backdropFilter:"blur(60px)",border:"1px solid rgba(255,255,255,0.1)",boxShadow:"0 20px 50px -10px rgba(0,0,0,0.7)"}}>
                  <div className="grid grid-cols-8 gap-1.5">{EMOJI_LIST.map(e=><button key={e} onClick={()=>{setInput(p=>p+e);setShowEmoji(false);}} className="w-7 h-7 md:w-8 md:h-8 rounded-lg grid place-items-center text-lg md:text-xl hover:bg-white/10 hover:scale-[1.15] active:scale-95">{e}</button>)}</div>
                </div>}
              </div>
              <button onClick={()=>imgRef.current?.click()} disabled={(!contact||contact.id===0)&&activeIdx!==-2} className={`w-8 h-8 md:w-9 md:h-9 rounded-full grid place-items-center shrink-0 aspect-square text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all active:scale-90 ${(!contact||contact.id===0)&&activeIdx!==-2?"opacity-20 cursor-not-allowed":""}`}><Image size={15}/></button>
              <input ref={imgRef} type="file" accept="image/*" onChange={pickImg} className="hidden"/>
              <button onClick={()=>fileRef.current?.click()} disabled={(!contact||contact.id===0)&&activeIdx!==-2} className={`w-8 h-8 md:w-9 md:h-9 rounded-full grid place-items-center shrink-0 aspect-square text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all active:scale-90 ${(!contact||contact.id===0)&&activeIdx!==-2?"opacity-20 cursor-not-allowed":""}`}><AlignJustify size={15}/></button>
              <input ref={fileRef} type="file" onChange={pickFile} className="hidden"/>
              <input type="text" placeholder={contact&&contact.id>0?"Message...":"Select a contact to chat"} value={input} onChange={e=>setInput(e.target.value)}
                disabled={(!contact||contact.id===0)&&activeIdx!==-2}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();sendText();}}}
                className="flex-1 min-w-0 bg-transparent outline-none text-base md:text-[13px] placeholder:text-white/15 px-1.5 md:px-2 disabled:opacity-20"/>
              {sendError && <span className="absolute -top-8 left-4 right-4 text-center text-[11px] text-rose-300/80">{sendError}</span>}
              <button onClick={sendText} disabled={!input.trim()||(!contact&& !isActiveGroupConversation)} className={`w-8 h-8 md:w-9 md:h-9 rounded-full grid place-items-center shrink-0 aspect-square transition-all active:scale-90 ${(input.trim()&&(contact||isActiveGroupConversation))?"bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-[0_0_18px_rgba(124,58,237,0.4)] scale-100":"text-white/20 scale-95"}`}><Send size={13}/></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
