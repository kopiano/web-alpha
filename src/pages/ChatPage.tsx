import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { Search, Smile, Image, Send, ChevronDown, FileText, Download, AlignJustify, Plus } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useAuth } from "@/components/dashboard/AuthProvider";
import { useOnlineStatus, type WsMessage } from "@/components/dashboard/OnlineStatusProvider";
import { resolveAvatar } from "@/lib/avatar";
import { sendChatMessage, getConversations, markConversationRead } from "@/api/chat";
import { EMOJI_LIST } from "@/config/chat";
import { useChatMessages } from "@/hooks/chat/useChatMessages";
import { useChatStore } from "@/store/chatStore";
import { patchConversation, setUnread, setTyping } from "@/store/chatStore";
import teamAvatar from "@/assets/teamGroup.png";
// import { getUsers } from "@/api/user";

/* ─── Types ─── */
interface ChatUser { id: number; username: string; email?: string; avatar?: string; status?: string; last_login_at?: string; }
interface ChatMsg { id?: number; user_id: number; username?: string; sender_username?: string; sender_avatar?: string; avatar?: string; type: string; content: string; file_name?: string; file_url?: string; CreatedAt?: string; created_at?: string; }
interface Contact { id: number; name: string; avatar: string; lastMsg: string; time: string; lastTimeRaw: string; unread: number; online: boolean; userData?: ChatUser; lastSeen?: string; convId?: string; }
interface Message { id: number; sender: "me"|"them"; type: "text"|"emoji"|"image"|"file"; content: string; time: string; fileName?: string; fileSize?: string; fileData?: string; username?: string; senderAvatar?: string; }

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
  return { id: u.id, name: u.username, avatar: initials(u.username), lastMsg, time: timeFmt(lastTime), lastTimeRaw: lastTime, unread: 0, online: false, userData: u, lastSeen: u.last_login_at||"" };
}

function messageTypeToNumber(type?: string) {
  if (type === "emoji") return 2;
  if (type === "image") return 3;
  if (type === "file") return 4;
  return 1;
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
  onSelect: (id: number) => void;
  online: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(contact.id)}
      className={`w-full flex items-center gap-3 md:gap-4 px-4 md:px-5 text-left transition-all duration-300 contact-btn ${active ? "active scale-[1.01]" : ""}`}
      style={{height:"64px",borderBottom:"1px solid rgba(255,255,255,0.05)",background:active?"rgba(0,0,0,0.25)":"transparent",backdropFilter:active?"blur(20px)":"none",WebkitBackdropFilter:active?"blur(20px)":"none",boxShadow:active?"inset 0 1px 0 rgba(255,255,255,0.06)":"none"}}
    >
      <div className="relative shrink-0">
        <div className="w-[52px] h-[52px] rounded-full grid place-items-center text-[13px] font-bold overflow-hidden shadow-lg ring-1 ring-white/10"
          style={contact.userData?.avatar?{boxShadow:"0 0 8px rgba(59,246,243,0.83), 0 0 24px rgba(201,68,242,0.61)"}:{background:"rgba(255,255,255,0.08)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.15)"}}>
          {contact.userData?.avatar ? (
            <>
              <img
                src={contact.userData.avatar.startsWith('http')?contact.userData.avatar:resolveAvatar(contact.userData.avatar)}
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
          <p className="text-[15px] font-medium truncate" style={{color:active?"rgba(255,255,255,0.95)":"rgba(255,255,255,0.8)"}}>{contact.name}</p>
          <span className="text-[10px] text-white/25 font-mono shrink-0 ml-1.5">{contact.time}</span>
        </div>
        <div className="flex justify-between items-center mt-0.5">
          <p className="text-[12px] truncate" style={{color:active?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.25)"}}>{contact.lastMsg || ""}</p>
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
  const [teamConv, setTeamConv] = useState<{ id: number; name: string; members: { user_id: number; username?: string; avatar?: string }[] } | null>(null);
  const teamConvRef = useRef(teamConv);
  useEffect(() => { teamConvRef.current = teamConv; }, [teamConv]);
  const [previewImg, setPreviewImg] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
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
  const msgCacheRef = useRef<Map<number, Message[]>>(new Map());
  const convIdCacheRef = useRef<Map<number, string>>(new Map());
  const loadAllRef = useRef<() => void>(() => {});
  const onlineUsersRef = useRef<Set<number>>(new Set());

  const me = user;
  const authLoading = user === undefined;
  const isGuest = user === null;
  const meName = isGuest ? "Quest" : (me?.username||"");
  const meId = me?.id||0;
  const meInit = initials(meName);
  const meAvatar = me?.avatar ? resolveAvatar(me.avatar) : null;
  meRef.current = meName;
  onlineUsersRef.current = onlineUsers;
  const storeConversationOrder = useChatStore((s) => s.conversationOrder);
  const storeConversations = useChatStore((s) => s.conversations);
  const storeContacts = useMemo(() => {
    return storeConversationOrder
      .map((id) => storeConversations[id])
      .filter(Boolean)
      .filter((item) => item.type === "private" && item.members?.[0]?.user_id)
      .map((item) => {
        const peer = item.members[0];
        const u: ChatUser = { id: peer.user_id, username: peer.username || "", avatar: peer.avatar, status: "active" };
        const contact = buildContact(u, item.lastMessage || "", item.lastMessageAt || "");
        contact.online = onlineUsersRef.current.has(peer.user_id);
        contact.unread = item.unreadCount || 0;
        contact.convId = item.conversationId;
        if (peer.avatar) contact.userData = u;
        return contact;
      });
  }, [storeConversationOrder, storeConversations, onlineUsers]);

  /* ─── WebSocket messages via global provider ─── */
  useEffect(() => {
    const unsub = subscribe((d: WsMessage) => {
      if((d.event==="message.new" || d.type==="message") && d.content) {
        const isMe = d.username===meRef.current||d.sender_username===meRef.current;
        if(isMe) return;
        const msgTime = d.time || timeFmt(new Date().toISOString())
        const isTeamMsg = d.chat_type === "group"
        if(isTeamMsg) {
          if(activeConvIdRef.current !== d.conversation_id) return
        } else if(activeConvIdRef.current && d.conversation_id && d.conversation_id !== activeConvIdRef.current) {
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
          msgCacheRef.current.set(d.sender_id, [...cached, {id:d.id||++midRef.current,sender:"them",type:d.msg_type||d.type||"text",content:d.content,time:msgTime,fileName:d.file_name,fileData:d.file_url,username:d.username||d.sender_username,senderAvatar:d.sender_avatar||""}])
          return
        }
        if(!isTeamMsg) {
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
        const newMsg: Message = {id:d.id||++midRef.current,sender:"them",type:d.msg_type||d.type||"text",content:d.content,time:d.time||timeFmt(new Date().toISOString()),fileName:d.file_name,fileData:d.file_url,username:d.username||d.sender_username,senderAvatar:d.sender_avatar||""}
        setMessages(p=>[...p,newMsg])
        const cached = msgCacheRef.current.get(d.sender_id) || []
        msgCacheRef.current.set(d.sender_id, [...cached, {...newMsg}])
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

  const baseContacts = contacts.length ? contacts : storeContacts;
  const activeContact = activeIdx >= 0 ? baseContacts.find((c) => c.id === activeContactIdRef.current) || baseContacts[activeIdx] : null;
  const activeConversationId = selectedConversationId || (activeIdx === -2 ? (teamConv ? String(teamConv.id) : "") : (activeContact?.convId || ""));
  const activeMessagesQuery = useChatMessages(activeConversationId || undefined, !!activeConversationId);

  /* ─── Load data ─── */
  const loadAll = useCallback(() => {
    getConversations().then(res => {
      const body = res.data?.data || {};
      const rawConversations: any[] = body.conversations ?? [];
      const rawUsers: any[] = body.users ?? [];
      const savedSelection = localStorage.getItem("chat_active_contact");
      const convMap = new Map<number, any>();
      rawConversations
        .filter((c: any) => c.type === "private" && Array.isArray(c.users) && c.users[0]?.user_id)
        .forEach((c: any) => {
          const peer = c.users?.[0];
          if (peer?.user_id) convMap.set(peer.user_id, c);
        });
      const cs = rawUsers
        .filter((u: any) => u?.user_id && u.user_id !== me?.id)
        .map((u: any) => {
          const contactUser: ChatUser = { id: u.user_id, username: u.username || "", avatar: u.avatar, status: "active" };
          const conv = convMap.get(u.user_id);
          const contact = buildContact(contactUser, conv?.last_message || u.last_msg || "", conv?.last_message_at || u.last_time || "");
          contact.online = Boolean(u.online || onlineUsersRef.current.has(u.user_id));
          contact.unread = conv?.unread_count || u.unread || 0;
          contact.convId = conv?.conversation_id || u.conversation_id || convIdCacheRef.current.get(u.user_id) || undefined;
          if (contact.convId && u.user_id) convIdCacheRef.current.set(u.user_id, contact.convId);
          if (u.avatar) contact.userData = contactUser;
          return contact;
        })
      if (body.team?.id) {
        setTeamConv({ id: body.team.id, name: body.team.name || "Team", members: body.team.members || [] })
      }

      // 恢复上次选中的联系人或群聊
      let initialContactIdx = -1
      let firstContactId = 0
      let firstConvId = ""
      const shouldRestoreTeam = savedSelection === "team"
      if (!shouldRestoreTeam && savedSelection && cs.length > 0) {
        const savedId = Number(savedSelection)
        if (!Number.isNaN(savedId)) {
          const savedIdx = cs.findIndex(c => c.id === savedId)
          if (savedIdx >= 0) {
            initialContactIdx = savedIdx
            firstContactId = cs[savedIdx].id
            firstConvId = cs[savedIdx].convId || ""
          }
        }
      }
      if (shouldRestoreTeam) {
        initialContactIdx = -2
        firstConvId = body.team?.id ? String(body.team.id) : ""
      }
      setContacts(cs.length ? cs : [{ id: -1, name: "No users", avatar: "??", lastMsg: "Register to start chatting", time: "", lastTimeRaw: "", unread: 0, online: false }])
      setActiveIdx(initialContactIdx)
      if (initialContactIdx >= 0) {
        activeContactIdRef.current = firstContactId
        activeConvIdRef.current = firstConvId
        setSelectedConversationId(firstConvId)
      } else if (initialContactIdx === -2) {
        activeConvIdRef.current = firstConvId
        setSelectedConversationId(firstConvId)
      }

    }).catch(e => { console.error("Load contacts failed:", e); setContacts([{ id: -2, name: "⚠", avatar: "!", lastMsg: me ? "Backend not reachable" : "Login to chat", time: "", lastTimeRaw: "", unread: 0, online: false }]); })
      .finally(() => setLoading(false))
  }, [me?.id])
  // 同步 loadAllRef，避免 WebSocket 闭包中的 TDZ 问题
  useEffect(() => { loadAllRef.current = loadAll; }, [loadAll]);

  useEffect(() => {
    const pages = activeMessagesQuery.data?.pages || [];
    if (!pages.length || !activeConversationId) return;
    const flat = pages.flat();
    if (!flat.length) return;
    const my = meRef.current;
    const parsed = flat.map((m: any) => ({
      id: m.id || ++midRef.current,
      sender: (m.sender_username || m.username) === my ? "me" : "them",
      type: (m.type as any) || "text",
      content: m.content,
      time: timeFmt(m.created_at || m.CreatedAt || ""),
      fileName: m.file_name,
      fileData: m.file_url,
      username: m.sender_username || m.username || "",
      senderAvatar: m.sender_avatar || "",
    }))
    setMessages(parsed)
    setLoadingMessages(activeMessagesQuery.isFetching)
  }, [activeMessagesQuery.data, activeMessagesQuery.isFetching, activeConversationId]);

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

  useEffect(()=>{if(!me){setLoading(false);return;}loadAll();},[me]);

  /* ─── Switch contact → load private messages ─── */
  const switchContact = useCallback((contactId: number) => {
    const idx = baseContacts.findIndex(c=>c.id===contactId);
    if(idx<0) return;
    setActiveIdx(idx);
    const nextContact = baseContacts[idx];
    setSelectedConversationId(nextContact?.convId || "");
    activeContactIdRef.current = contactId;
    activeConvIdRef.current = nextContact?.convId || "";
    localStorage.setItem("chat_active_contact", String(contactId));
    // 标记已读：调用后端 API + 更新本地未读计数
    const convId = nextContact?.convId
    if (convId) {
      markConversationRead(convId).catch(() => {})
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, unread: 0 } : c))
      convIdCacheRef.current.set(contactId, convId)
      setUnread(convId, 0)
    }
    if (window.innerWidth < 768) setShowMobileContacts(false);
  }, [baseContacts]);

  /* ─── Send ─── */
  const sendMsg = useCallback((type: string, content: string, fileName?: string, fileData?: string) => {
    const isTeam = activeIdx === -2
    const local: Message = {id:++midRef.current,sender:"me",type:type as any,content,time:timeFmt(new Date().toISOString()),fileName,fileData};
    setMessages(p=>[...p,local]);
    let messageType = 1;
    if (type==="emoji") messageType = 2;
    else if (type==="image") messageType = 3;
    else if (type==="file") messageType = 4;
    if (isTeam && teamConv) {
      sendChatMessage({chat_type:"group", group_id: teamConv.id, message_type:messageType, content, file_name:fileName||"", file_url:fileData||""}).catch(e=>console.error("Send failed:", e));
    } else {
      const c = activeContact || baseContacts[activeIdx];
      sendChatMessage({chat_type:"private",receiver_id:c?.id||0,message_type:messageType,content,file_name:fileName||"",file_url:fileData||""}).catch(e=>console.error("Send failed:", e));
    }
    if (activeConversationId) {
      upsertConversationSummary(activeConversationId, {
        id: meId,
        name: meName,
        avatar: meAvatar || "",
        lastMsg: content,
        lastTimeRaw: new Date().toISOString(),
        unread: 0,
        lastMessageType: messageType,
      })
    }
  }, [baseContacts,activeIdx,teamConv,activeConversationId,meAvatar,meId,meName,upsertConversationSummary,activeContact]);

  const sendText = () => { const v=input.trim(); if(!v) return; sendMsg(/^\p{Emoji}+$/u.test(v)?"emoji":"text",v); setInput(""); setShowEmoji(false); };
  const sendImg = () => { if(!previewImg) return; sendMsg("image",previewImg,"image.png",previewImg); setPreviewImg(null); };
  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>sendMsg("file",f.name,f.name,r.result as string); r.readAsDataURL(f); e.target.value=""; };
  const pickImg = (e: React.ChangeEvent<HTMLInputElement>) => { const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>setPreviewImg(r.result as string); r.readAsDataURL(f); e.target.value=""; };

  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages.length]);

  const grad = (i: number) => AVATAR_GRADS[i%7];
  const userGrad = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }
    return AVATAR_GRADS[Math.abs(hash) % 7];
  }
  const online = (c: Contact) => c.online;
  const filtered = useMemo(() => baseContacts
    .filter(c=>c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a,b) => {
      const aOn = online(a) ? 1 : 0
      const bOn = online(b) ? 1 : 0
      if (aOn !== bOn) return bOn - aOn
      // 在线：按最新消息 → 有头像 → 名称
      if (aOn && bOn) {
        const aTime = a.lastTimeRaw || ""
        const bTime = b.lastTimeRaw || ""
        if (aTime && bTime && aTime !== bTime) return bTime.localeCompare(aTime)
        if (aTime && !bTime) return -1
        if (!aTime && bTime) return 1
        const aAv = a.userData?.avatar ? 1 : 0
        const bAv = b.userData?.avatar ? 1 : 0
        if (aAv !== bAv) return bAv - aAv
        return a.name.localeCompare(b.name)
      }
      // 离线：按有头像 → 名称
      const aAv = a.userData?.avatar ? 1 : 0
      const bAv = b.userData?.avatar ? 1 : 0
      if (aAv !== bAv) return bAv - aAv
      return a.name.localeCompare(b.name)
    }), [baseContacts, searchQuery]);
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
      <style>{`.csb{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.08) transparent}.csb::-webkit-scrollbar{width:4px}.csb::-webkit-scrollbar-track{background:transparent}.csb::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:10px}.csb::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.15)}
@keyframes msgIn{0%{opacity:0;transform:translateY(16px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes msgInMe{0%{opacity:0;transform:translateY(16px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}
.msg-anim{animation:msgIn .28s cubic-bezier(.16,1,.3,1) both}
.msg-anim-me{animation:msgInMe .28s cubic-bezier(.16,1,.3,1) both}
.contact-btn{transition:all .25s cubic-bezier(.16,1,.3,1);position:relative}
.contact-btn::before{content:"";position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:0;border-radius:0 3px 3px 0;background:linear-gradient(to bottom,#a855f7,#06b6d4);transition:all .25s cubic-bezier(.16,1,.3,1);opacity:0}
.contact-btn.active::before{height:40%;opacity:1}
.contact-btn:hover{background:rgba(255,255,255,0.04)!important}
.contact-btn:active{transform:scale(.98)}`}</style>
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
            {loading?<div className="space-y-2 px-5 py-4">{[1,2,3,4].map(i=><div key={i} className="h-[84px] flex items-center gap-4"><div className="w-[52px] h-[52px] rounded-full bg-white/[0.03] animate-pulse shrink-0"/><div className="flex-1 space-y-2"><div className="h-3 w-3/4 rounded bg-white/[0.03] animate-pulse"/><div className="h-2 w-1/2 rounded bg-white/[0.02] animate-pulse"/></div></div>)}</div>
            :filtered.length===0?<div className="text-center py-10 text-white/20 text-[12px]">{baseContacts.length===0?(isGuest?<span>Login to view contacts — <button onClick={()=>openAuth("login")} className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">Login →</button></span>:<span className="text-white/10">{authLoading?"":"No contacts"}</span>):"No matches"}</div>
            :<>
              {/* Team section */}
              <div className="px-4 md:px-5 pt-4 md:pt-6 pb-2 md:pb-3 text-base md:text-lg" style={{fontWeight:500,color:"rgba(255,255,255,0.85)"}}>Team</div>

              {/* Team group chat */}
              {teamConv && (
                <button onClick={() => {
                  const idx = baseContacts.findIndex(c => c.id === -1)
                  if (idx >= 0) { switchContact(-1); return }
                  setActiveIdx(-2)
                  activeConvIdRef.current = String(teamConv.id)
                  setSelectedConversationId(String(teamConv.id))
                  localStorage.setItem("chat_active_contact", "team")
                  if (window.innerWidth < 768) setShowMobileContacts(false)
                }}
                  className="w-full flex items-center gap-3 md:gap-4 px-4 md:px-5 text-left transition-all duration-300 contact-btn"
                  style={{height:"68px",borderBottom:"1px solid rgba(255,255,255,0.05)",background:activeIdx===-2?"rgba(0,0,0,0.25)":"transparent",backdropFilter:activeIdx===-2?"blur(20px)":"none",WebkitBackdropFilter:activeIdx===-2?"blur(20px)":"none",boxShadow:activeIdx===-2?"inset 0 1px 0 rgba(255,255,255,0.06)":"none"}}>
                  <div className="w-[52px] h-[52px] rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                    style={{background:"linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.3))",border:"1px solid rgba(255,255,255,0.15)",boxShadow:"0 0 8px rgba(59,246,243,0.83), 0 0 24px rgba(201,68,242,0.61)"}}>
                    <img src={TEAM_AVATAR} alt="Team" className="w-full h-full object-cover" loading="lazy" decoding="async"/>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-baseline">
                      <p className="text-[15px] font-medium text-white/85 truncate">{teamConv.name}</p>
                      <span className="text-[10px] text-white/20 shrink-0 ml-1.5 font-mono">{teamConv.members.length} members</span>
                    </div>
                  </div>
                </button>
              )}

              {/* Personal section */}
              <div className="px-4 md:px-5 pt-4 md:pt-6 pb-2 md:pb-3" style={{fontWeight:500,color:"rgba(255,255,255,0.85)"}}>Personal</div>

              {filtered.map((c) => (
                <ContactItem key={`contact-${c.id}`} contact={c} active={c.id === activeContact?.id} onSelect={switchContact} online={online(c)} />
              ))}
            </>}
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
            ) : activeIdx === -2 && teamConv ? (
              <>
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                  style={{background:"linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.3))",border:"1px solid rgba(255,255,255,0.15)",boxShadow:"0 0 8px rgba(59,246,243,0.83), 0 0 24px rgba(201,68,242,0.61)"}}>
                  <img src={TEAM_AVATAR} alt="Team" className="w-full h-full object-cover" loading="lazy" decoding="async"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white/90">{teamConv.name}</p>
                  <p className="text-[10px] text-white/20">{teamConv.members.length} members</p>
                </div>
                <div className="flex items-center -space-x-2 shrink-0 ml-2">
                  {teamConv.members.slice(0, 5).map((m: any, idx) => (
                    <div key={`team-member-${m.user_id ?? m.username ?? idx}`} className="w-7 h-7 rounded-full border-2 border-[#0c0c14] overflow-hidden grid place-items-center text-[8px] font-bold ring-1 ring-white/10"
                      style={m.avatar?{}:{background:"rgba(255,255,255,0.10)"}}>
                      {m.avatar ? (
                        <>
                          <img src={resolveAvatar(m.avatar)||''} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" onError={e=>{const img=e.currentTarget as HTMLImageElement; img.style.display='none'; const fb=img.parentElement?.querySelector<HTMLElement>('[data-avatar-fallback]'); if (fb) fb.style.display='grid';}}/>
                          <span data-avatar-fallback className="hidden w-full h-full place-items-center">{(m.username||'?').slice(0,2).toUpperCase()}</span>
                        </>
                      ) : <span>{m.username?.slice(0,2).toUpperCase()||"?"}</span>
                      }
                    </div>
                  ))}
                  {teamConv.members.length > 5 && <div className="w-7 h-7 rounded-full border-2 border-[#0c0c14] grid place-items-center text-[8px] font-bold text-white/40 bg-white/10">+{teamConv.members.length-5}</div>}
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
            :(!contact||contact.id===0)&&activeIdx!==-2?<div className="flex items-center justify-center h-full flex-col gap-2"><p className="text-[13px] text-white/20">{isGuest ? "Login to start chatting" : (authLoading ? "" : "Select a contact to start chatting")}</p>{isGuest && <button onClick={()=>openAuth("login")} className="text-[12px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors">Login →</button>}</div>
            :loadingMessages?<div className="flex items-center justify-center h-full"><p className="text-[13px] text-white/20 animate-pulse">Loading messages...</p></div>
            :activeMessagesQuery.isFetchingPreviousPage?<div className="flex items-center justify-center py-2"><p className="text-[11px] text-white/18 animate-pulse">Loading older messages...</p></div>
            :messages.length===0?<div className="flex items-center justify-center h-full"><p className="text-[13px] text-white/20">Send a message to start</p></div>
            :messages.map((m,i)=>{
              const isMe=m.sender==="me";
              const prevSame=i>0&&messages[i-1]?.sender===m.sender;
              const showAv=!prevSame;
              const avEl=isMe
                ?(meAvatar?<img src={meAvatar} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async"/>:<span>{meInit}</span>)
                :(activeIdx===-2
                  ? (m.senderAvatar
                    ? <img src={resolveAvatar(m.senderAvatar)||''} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" onError={e=>{const t=e.target as HTMLImageElement;t.style.display='none';t.parentElement&&(t.parentElement.innerHTML=`<span style="font-size:8px;font-weight:700">${(m.username||'?').slice(0,2).toUpperCase()}</span>`)}}/>
                    : <span>{(m.username||'?').slice(0,2).toUpperCase()}</span>)
                  : (contact?.userData?.avatar
                    ? <>
                        <img src={resolveAvatar(contact.userData.avatar)||''} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" onError={e=>{const img=e.currentTarget as HTMLImageElement; img.style.display='none'; const fb=img.parentElement?.querySelector<HTMLElement>('[data-avatar-fallback]'); if (fb) fb.style.display='grid';}}/>
                        <span data-avatar-fallback className="hidden w-full h-full place-items-center">{(contact?.name||'?').slice(0,2).toUpperCase()}</span>
                      </>
                    : <span>{contact?.avatar||"?"}</span>));
              return (
                <div key={`msg-${m.id ?? i}`} className={`flex ${isMe?"justify-end":"justify-start"} ${isMe?"msg-anim-me":"msg-anim"}`}>
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
                      {showAv?<div className={`w-7 h-7 rounded-full overflow-hidden grid place-items-center text-[9px] font-bold ring-1 ring-white/10 ${isMe?"":`bg-gradient-to-br ${activeIdx===-2?userGrad(m.username||''):grad(activeIdx)}`}`}
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

          <div className="px-3 md:px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] md:pb-4 pt-2 shrink-0">
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
              <button onClick={sendText} disabled={!input.trim()||((!contact||contact.id===0)&&activeIdx!==-2)} className={`w-8 h-8 md:w-9 md:h-9 rounded-full grid place-items-center shrink-0 aspect-square transition-all active:scale-90 ${(input.trim()&&contact&&contact.id>0)||(input.trim()&&activeIdx===-2)?"bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-[0_0_18px_rgba(124,58,237,0.4)] scale-100":"text-white/20 scale-95"}`}><Send size={13}/></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
