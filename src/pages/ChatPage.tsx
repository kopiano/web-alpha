import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Smile, Image, Send, ChevronDown, FileText, Download, AlignJustify, Plus } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useAuth } from "@/components/dashboard/AuthProvider";
import { useOnlineStatus } from "@/components/dashboard/OnlineStatusProvider";
import { resolveAvatar } from "@/lib/avatar";
import { createConversation, fetchConversationMessages, sendChatMessage, getChatUserInfo, markConversationRead } from "@/api/chat";
// import { getUsers } from "@/api/user";

/* ─── Types ─── */
interface ChatUser { id: number; username: string; email?: string; avatar?: string; status?: string; last_login_at?: string; }
interface ChatMsg { id?: number; user_id: number; username?: string; sender_username?: string; avatar?: string; type: string; content: string; file_name?: string; file_url?: string; CreatedAt?: string; created_at?: string; }
interface Contact { id: number; name: string; avatar: string; lastMsg: string; time: string; lastTimeRaw: string; unread: number; online: boolean; userData?: ChatUser; lastSeen?: string; convId?: number; }
interface Message { id: number; sender: "me"|"them"; type: "text"|"emoji"|"image"|"file"; content: string; time: string; fileName?: string; fileSize?: string; fileData?: string; username?: string; }

const AVATAR_GRADS = ["from-violet-500 to-cyan-400","from-pink-500 to-violet-500","from-cyan-400 to-blue-500","from-emerald-400 to-cyan-400","from-fuchsia-500 to-pink-500","from-violet-500 to-fuchsia-500","from-blue-400 to-cyan-400"];
const EMOJI_LIST = ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","😉","😍","😘","😋","😎","🤩","🥳","🤔","🤗","👍","👌","👏","🙌","💪","🙏","🎉","✨","🔥","🚀","💯","❤️"];

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

const ChatPage = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { onlineUsers } = useOnlineStatus();
  const [previewImg, setPreviewImg] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);
  const [showMobileContacts, setShowMobileContacts] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket|null>(null);
  const midRef = useRef(0);
  const meRef = useRef("Me");
  const activeContactIdRef = useRef(0);
  const activeConvIdRef = useRef(0);
  const msgCacheRef = useRef<Map<number, Message[]>>(new Map());

  const me = user;
  const meName = me?.username||"Me";
  const meId = me?.id||0;
  const meInit = initials(meName);
  const meAvatar = me?.avatar ? resolveAvatar(me.avatar) : null;
  meRef.current = meName;

  /* ─── WebSocket (direct connection for messages) ─── */
  const connectWS = useCallback(() => {
    try {
      const p = location.protocol==="https:"?"wss:":"ws:";
      const ws = new WebSocket(`${p}//${location.host}/api/v1/chat/ws?user_id=${meId}&username=${encodeURIComponent(meRef.current)}&avatar=${encodeURIComponent(meInit)}`);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if(d.type==="message"&&d.content) {
            const isMe = d.username===meRef.current||d.sender_username===meRef.current;
            if(isMe) return;
            const msgTime = d.time || timeFmt(new Date().toISOString())
            // 不是当前会话 → 只更新 sidebar 和缓存
            if(activeConvIdRef.current && d.conversation_id && d.conversation_id !== activeConvIdRef.current) {
              setContacts(prev => prev.map(c =>
                c.id === d.sender_id ? { ...c, lastMsg: d.content, time: msgTime, unread: (c.unread||0) + 1 } : c
              ))
              const cached = msgCacheRef.current.get(d.sender_id) || []
              msgCacheRef.current.set(d.sender_id, [...cached, {id:++midRef.current,sender:"them",type:d.msg_type||d.type||"text",content:d.content,time:msgTime,fileName:d.file_name,fileData:d.file_url,username:d.username||d.sender_username}])
              return
            }
            // 更新联系人列表
            setContacts(prev => prev.map(c =>
              c.id === d.sender_id ? { ...c, lastMsg: d.content, time: msgTime } : c
            ))
            const newMsg: Message = {id:++midRef.current,sender:"them",type:d.msg_type||d.type||"text",content:d.content,time:d.time||timeFmt(new Date().toISOString()),fileName:d.file_name,fileData:d.file_url,username:d.username||d.sender_username}
            setMessages(p=>[...p,newMsg])
            const cached = msgCacheRef.current.get(d.sender_id) || []
            msgCacheRef.current.set(d.sender_id, [...cached, {...newMsg}])
            setIsTyping(true); setTimeout(()=>setIsTyping(false),1500);
          }
          if(d.type==="recall") setMessages(p=>p.map(m=>m.id===d.msg_id?{...m,content:"[Message recalled]",type:"text"}:m));
        } catch {}
      };
      ws.onclose = (e) => { if(e.code!==1000) setTimeout(connectWS,2000); };
      ws.onerror = () => { if(ws.readyState===WebSocket.OPEN) ws.close(); };
    } catch {}
  }, [meInit, meId]);

  /* ─── Load data ─── */
  const loadAll = useCallback(() => {
    const my = meRef.current;
    getChatUserInfo().then(res => {
      const rawContacts: any[] = res.data?.data?.contacts ?? [];
      if (!rawContacts.length) { console.warn("getChatUserInfo: empty contacts", res.data); }
      const cs = rawContacts
        .filter((c: any) => c.user_id !== me?.id)
        .map((c: any) => {
          const u: ChatUser = { id: c.user_id, username: c.username, avatar: c.avatar, status: c.online ? "active" : "inactive" }
          const contact = buildContact(u, c.last_msg || "", c.last_time || "")
          contact.online = c.online
          contact.unread = c.unread || 0
          if (c.avatar) contact.userData = u
          return contact
        })

      // 恢复上次选中的联系人
      const savedId = localStorage.getItem("chat_active_contact")
      let initialContactIdx = -1
      let firstContactId = 0
      let firstConvId = 0
      if (savedId && cs.length > 0) {
        const savedIdx = cs.findIndex(c => c.id === Number(savedId))
        if (savedIdx >= 0) {
          initialContactIdx = savedIdx
          firstContactId = cs[savedIdx].id
          firstConvId = cs[savedIdx].convId || 0
        }
      }
      setContacts(cs.length ? cs : [{ id: 0, name: "No users", avatar: "??", lastMsg: "Register to start chatting", time: "", lastTimeRaw: "", unread: 0, online: false }])
      setActiveIdx(initialContactIdx)
      if (initialContactIdx >= 0) {
        activeContactIdRef.current = firstContactId
        activeConvIdRef.current = firstConvId
      }

      // 有保存的联系人则自动加载消息
      if (initialContactIdx >= 0 && cs.length > 0) {
        const targetId = firstContactId
        const convId = cs[0].convId
        const toMessages = (msgs: ChatMsg[]): Message[] =>
          msgs.map(m => ({
            id: ++midRef.current, sender: (m.sender_username || m.username) === my ? "me" : "them",
            type: (m.type as any) || "text", content: m.content,
            time: timeFmt(m.created_at || m.CreatedAt || ""), fileName: m.file_name,
            fileData: m.file_url, username: m.sender_username || m.username || ""
          }))
        const loadMsgs = (cid: number, uid: number) => {
          fetchConversationMessages(cid, { limit: 500 }).then(res => {
            const d = res.data?.data
            if (!d || res.data?.code !== 200) { console.error("Load messages failed:", res.data?.message); return }
            const parsed = toMessages(d?.messages ?? [])
            msgCacheRef.current.set(uid, parsed)
            setMessages(parsed)
          }).catch(e => console.error("Load messages failed:", e))
        }

        if (convId) {
          loadMsgs(convId, targetId)
        } else {
          // 没有会话 → 创建
          createConversation(targetId).then(r => {
            const newConv = r.data?.data
            if (newConv?.id) {
              cs[0].convId = newConv.id
              loadMsgs(newConv.id, targetId)
            }
          }).catch(e => console.error("Create conversation failed:", e))
        }
      }
    }).catch(e => { console.error("Load contacts failed:", e); setContacts([{ id: 0, name: "Server offline", avatar: "!!", lastMsg: "Backend not reachable", time: "", lastTimeRaw: "", unread: 0, online: false }]); })
      .finally(() => setLoading(false))
  }, [me?.id])

  const loadForUser = useCallback((userId: number) => {
    // 先显示缓存（如果有），同时后台刷新
    const cached = msgCacheRef.current.get(userId)
    if (cached) setMessages(cached)

    const my = meRef.current

    const toMessages = (msgs: ChatMsg[]): Message[] =>
      msgs.map(m => ({
        id: ++midRef.current, sender: (m.sender_username || m.username) === my ? "me" : "them",
        type: (m.type as any) || "text", content: m.content,
        time: timeFmt(m.created_at || m.CreatedAt || ""), fileName: m.file_name,
        fileData: m.file_url, username: m.sender_username || m.username || ""
      }))

    const loadMsgs = (cid: number) => {
      fetchConversationMessages(cid, { limit: 500 }).then(res => {
        const d = res.data?.data
        if (!d || res.data?.code !== 200) { console.error("Load messages failed:", res.data?.message); return }
        const apiMsgs = toMessages(d?.messages ?? [])
        const cached = msgCacheRef.current.get(userId) || []
        const apiIds = new Set(apiMsgs.map(m => m.id))
        const newCached = cached.filter(m => !apiIds.has(m.id))
        const merged = [...apiMsgs, ...newCached]
        msgCacheRef.current.set(userId, merged)
        setMessages(merged)
      }).catch(e => console.error("Load messages failed:", e))
    }

    // 通过 createConversation 获取会话 ID（查找或创建）
    createConversation(userId).then(r => {
      const newConv = r.data?.data
      if (newConv?.id) loadMsgs(newConv.id)
    }).catch(e => console.error("Create conversation failed:", e))
  }, []);

  useEffect(()=>{if(!me){setLoading(false);return;}connectWS();loadAll();return()=>{const w=wsRef.current;if(w&&w.readyState!==WebSocket.CONNECTING)w.close(1000);};},[me]);

  /* ─── Switch contact → load private messages ─── */
  const switchContact = (contactId: number) => {
    const idx = contacts.findIndex(c=>c.id===contactId);
    if(idx<0) return;
    setActiveIdx(idx);
    activeContactIdRef.current = contactId;
    activeConvIdRef.current = contacts[idx]?.convId || 0;
    localStorage.setItem("chat_active_contact", String(contactId));
    // 标记已读：调用后端 API（不改变本地 unread，避免排序跳动）
    const convId = contacts[idx]?.convId
    if (convId) markConversationRead(convId).catch(() => {})
    loadForUser(contactId);
    if (window.innerWidth < 768) setShowMobileContacts(false);
  };

  /* ─── Send ─── */
  const sendMsg = useCallback((type: string, content: string, fileName?: string, fileData?: string) => {
    const c = contacts[activeIdx];
    const local: Message = {id:++midRef.current,sender:"me",type:type as any,content,time:timeFmt(new Date().toISOString()),fileName,fileData};
    setMessages(p=>[...p,local]);
    // 写入缓存
    const cached = msgCacheRef.current.get(c?.id) || []
    msgCacheRef.current.set(c?.id, [...cached, {...local}])
    let messageType = 1; // text
    if (type==="emoji") messageType = 2;
    else if (type==="image") messageType = 3;
    else if (type==="file") messageType = 4;
    sendChatMessage({recipient_id:c?.id||0,message_type:messageType,content,file_name:fileName||"",file_url:fileData||""}).catch(e=>console.error("Send failed:", e));
  }, [contacts,activeIdx]);

  const sendText = () => { const v=input.trim(); if(!v) return; sendMsg(/^\p{Emoji}+$/u.test(v)?"emoji":"text",v); setInput(""); setShowEmoji(false); };
  const sendImg = () => { if(!previewImg) return; sendMsg("image",previewImg,"image.png",previewImg); setPreviewImg(null); };
  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>sendMsg("file",f.name,f.name,r.result as string); r.readAsDataURL(f); e.target.value=""; };
  const pickImg = (e: React.ChangeEvent<HTMLInputElement>) => { const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>setPreviewImg(r.result as string); r.readAsDataURL(f); e.target.value=""; };

  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages.length]);

  const grad = (i: number) => AVATAR_GRADS[i%7];
  const online = (c: Contact) => c.online;
  const activeContactId = activeIdx >= 0 ? contacts[activeIdx]?.id : null
  const filtered = contacts
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
    });
  const contact = contacts[activeIdx];

  useEffect(()=>{activeContactIdRef.current=contact?.id||0;},[contact]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{background:"radial-gradient(circle at 30% 80%, rgba(164,89,255,0.35), transparent 30%), radial-gradient(circle at 70% 20%, rgba(110,0,255,0.25), transparent 25%), linear-gradient(135deg, #070707, #111111)"}}>
      {/* Glow blobs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-20 bottom-1/4 w-[400px] h-[400px] rounded-full opacity-20 max-md:w-[200px] max-md:h-[200px]" style={{background:"#A855F7",filter:"blur(120px)"}}/>
        <div className="absolute right-0 top-1/4 w-[300px] h-[300px] rounded-full opacity-15 max-md:w-[150px] max-md:h-[150px]" style={{background:"#6D28D9",filter:"blur(100px)"}}/>
        <div className="absolute left-1/3 -top-10 w-[250px] h-[250px] rounded-full opacity-10 max-md:w-[120px] max-md:h-[120px]" style={{background:"#7C3AED",filter:"blur(90px)"}}/>
      </div>
      <style>{`.csb{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.08) transparent}.csb::-webkit-scrollbar{width:4px}.csb::-webkit-scrollbar-track{background:transparent}.csb::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:10px}.csb::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.15)}`}</style>
      <Sidebar/>

      {/* Main glass panel */}
      <div className="relative z-10 w-full max-w-[1600px] h-screen md:h-[calc(100vh-72px)] flex flex-col md:flex-row ml-0 lg:ml-24 mr-0 lg:mr-[30px] pb-0 rounded-none md:rounded-[20px] lg:rounded-[32px] overflow-hidden"
        style={{background:"rgba(255,255,255,0.06)",backdropFilter:"blur(30px) saturate(180%)",WebkitBackdropFilter:"blur(30px) saturate(180%)",border:"1px solid rgba(255,255,255,0.12)",boxShadow:"0 32px 80px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)"}}>

        {/* LEFT — Glass sidebar (redesigned) */}
        <div className={`w-full md:w-[280px] lg:w-[320px] shrink-0 flex flex-col h-full ${showMobileContacts ? "flex" : "hidden"} md:flex`}
          style={{background:"rgba(255,255,255,0.03)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderRight:"1px solid rgba(255,255,255,0.08)"}}>

          {/* Header */}
          <div className="px-5 pt-6 pb-4" style={{borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold text-violet-400/50 uppercase tracking-[0.25em] mb-1">chat box</p>
                <h2 className="text-xl md:text-[24px] font-bold tracking-tight" style={{background:"linear-gradient(135deg, #fff, #c4b5fd, #67e8f9)",WebkitBackgroundClip:"text",backgroundClip:"text",WebkitTextFillColor:"transparent",color:"transparent"}}>Chat</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-white/40 w-7 h-7 rounded-full grid place-items-center border border-white/20">{contacts.filter(c=>c.id!==0).length}</span>
                <span className="text-[10px] font-medium text-emerald-400/70 w-7 h-7 rounded-full grid place-items-center border border-emerald-400/30">{contacts.filter(c => c.online).length}</span>
              </div>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20"/>
              <input placeholder="Search contacts..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                className="w-full rounded-2xl pl-9 pr-4 py-2.5 text-[11px] outline-none placeholder:text-white/15 text-white/70"
                style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)"}}/>
            </div>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto csb">
            {loading?<div className="space-y-2 px-5 py-4">{[1,2,3,4].map(i=><div key={i} className="h-[84px] flex items-center gap-4"><div className="w-[52px] h-[52px] rounded-full bg-white/[0.03] animate-pulse shrink-0"/><div className="flex-1 space-y-2"><div className="h-3 w-3/4 rounded bg-white/[0.03] animate-pulse"/><div className="h-2 w-1/2 rounded bg-white/[0.02] animate-pulse"/></div></div>)}</div>
            :filtered.length===0?<div className="text-center py-10 text-white/20 text-[12px]">{contacts.length===0?"Server offline":"No matches"}</div>
            :<>
              {/* Team section */}
              <div className="px-5 pt-6 pb-3" style={{fontSize:"18px",fontWeight:500,color:"rgba(255,255,255,0.85)"}}>Team</div>

              {/* Default team group — shown if no group chats exist */}
              <button className="w-full flex items-center gap-4 px-5" style={{height:"84px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                <div className="w-[52px] h-[52px] rounded-full grid place-items-center shrink-0"
                  style={{background:"linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.3))",border:"1px solid rgba(255,255,255,0.15)"}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-baseline">
                    <p className="text-[15px] font-medium text-white/85 truncate">General</p>
                    <span className="text-[10px] text-white/20 shrink-0 ml-1.5 font-mono">12:30</span>
                  </div>
                  <p className="text-[12px] text-white/25 truncate mt-0.5">Welcome to the team channel</p>
                </div>
              </button>

              {/* Personal section */}
              <div className="px-5 pt-6 pb-3" style={{fontSize:"18px",fontWeight:500,color:"rgba(255,255,255,0.85)"}}>Personal</div>

              {filtered.map((c,i)=>{
              const isActive = c.id === contacts[activeIdx]?.id;
              const on=online(c);
              return (
                <button key={c.id} onClick={()=>switchContact(c.id)}
                  className={`w-full flex items-center gap-4 px-5 text-left transition-all duration-300 ${isActive?"scale-[1.01]":""}`}
                  style={{height:"72px",borderBottom:"1px solid rgba(255,255,255,0.05)",background:isActive?"rgba(0,0,0,0.25)":"transparent",backdropFilter:isActive?"blur(20px)":"none",WebkitBackdropFilter:isActive?"blur(20px)":"none",boxShadow:isActive?"inset 0 1px 0 rgba(255,255,255,0.06)":"none"}}>
                  <div className="relative shrink-0">
                    <div className="w-[52px] h-[52px] rounded-full grid place-items-center text-[13px] font-bold overflow-hidden shadow-lg ring-1 ring-white/10"
                      style={c.userData?.avatar?{}:{background:"rgba(255,255,255,0.08)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.15)"}}>
                      {c.userData?.avatar?<img src={c.userData.avatar.startsWith('http')?c.userData.avatar:resolveAvatar(c.userData.avatar)} alt="" className="w-full h-full object-cover" onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>:null}
                      <span className={c.userData?.avatar?"hidden":""}>{c.avatar}</span>
                    </div>
                    {on&&<span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-[3px] border-[#0c0c14] shadow-[0_0_12px_rgba(52,211,153,0.7)]"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className="text-[15px] font-medium truncate" style={{color:isActive?"rgba(255,255,255,0.95)":"rgba(255,255,255,0.8)"}}>{c.name}</p>
                      <span className="text-[10px] text-white/25 font-mono shrink-0 ml-1.5">{c.time}</span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className="text-[12px] truncate" style={{color:isActive?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.25)"}}>{c.lastMsg || ""}</p>
                      {c.unread>0&&<span className={`w-[16px] h-[16px] rounded-full grid place-items-center text-[8px] font-medium text-white/35 border border-white/20 leading-none shrink-0 ml-1.5 ${isActive?"hidden":""}`}>{c.unread>99?"99+":c.unread}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
            </>}
          </div>

          {/* Bottom profile */}
          <div className="px-5 py-4" style={{borderTop:"1px solid rgba(255,255,255,0.05)"}}>
            <div className="flex items-center gap-4" style={{height:"52px"}}>
              <div className="w-[52px] h-[52px] rounded-full grid place-items-center text-[13px] font-bold shadow-lg ring-1 ring-white/10 overflow-hidden shrink-0"
                style={meAvatar?{}:{background:"rgba(255,255,255,0.10)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.18)"}}>
                {meAvatar?<img src={meAvatar} alt="" className="w-full h-full object-cover"/>:meInit}
              </div>
              <div className="flex-1 min-w-0"><p className="text-[14px] font-medium text-white/85">{meName}</p><p className="text-[11px] text-emerald-400/60">Online</p></div>
              <ChevronDown size={14} className="text-white/20"/>
            </div>
          </div>
        </div>

        {/* CENTER — Chat area */}
        <div className={`flex-1 flex flex-col h-full min-w-0 overflow-hidden ${showMobileContacts ? "hidden md:flex" : "flex"}`}
          style={{background:"rgba(255,255,255,0.01)"}}>
          <div className="px-5 py-3 flex items-center gap-3 shrink-0" style={{borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(255,255,255,0.015)"}}>
            {/* Mobile back to contacts button */}
            {!showMobileContacts && (
              <button onClick={()=>setShowMobileContacts(true)} className="md:hidden w-8 h-8 rounded-full grid place-items-center text-white/40 hover:text-white hover:bg-white/[0.08] shrink-0 active:scale-90 transition-all duration-200">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
            )}
            {loading ? (
              <>
                <div className="w-9 h-9 rounded-full bg-white/[0.06] animate-pulse shrink-0"/>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3 w-24 rounded-full bg-white/[0.06] animate-pulse"/>
                  <div className="h-2 w-16 rounded-full bg-white/[0.04] animate-pulse"/>
                </div>
              </>
            ) : (
              <>
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full grid place-items-center text-[10px] font-bold shadow-lg ring-1 ring-white/10 overflow-hidden"
                    style={contact?.userData?.avatar?{}:{background:"rgba(255,255,255,0.10)",backdropFilter:"blur(20px)"}}>
                    {contact?.userData?.avatar?<img src={contact.userData.avatar.startsWith('http')?contact.userData.avatar:resolveAvatar(contact.userData.avatar)} alt="" className="w-full h-full object-cover" onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>:null}
                    <span className={contact?.userData?.avatar?"hidden":""}>{contact?.avatar||"??"}</span>
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
          <div className="flex-1 overflow-y-auto csb px-5 py-4 space-y-1.5 transition-opacity duration-300">
            {loading?<div className="flex items-center justify-center h-full"><p className="text-[13px] text-white/10 animate-pulse">Loading...</p></div>
            :!contact||contact.id===0?<div className="flex items-center justify-center h-full"><p className="text-[13px] text-white/20">Select a contact to start chatting</p></div>
            :messages.length===0?<div className="flex items-center justify-center h-full"><p className="text-[13px] text-white/20">Send a message to start</p></div>
            :messages.map((m,i)=>{
              const isMe=m.sender==="me";
              const prevSame=i>0&&messages[i-1]?.sender===m.sender;
              const showAv=!prevSame;
              const avEl=isMe
                ?(meAvatar?<img src={meAvatar} alt="" className="w-full h-full object-cover"/>:<span>{meInit}</span>)
                :(contact?.userData?.avatar?<img src={contact.userData.avatar.startsWith('http')?contact.userData.avatar:resolveAvatar(contact.userData.avatar)} alt="" className="w-full h-full object-cover"/>:<span>{contact?.avatar||"?"}</span>);
              return (
                <div key={m.id} className={`flex ${isMe?"justify-end":"justify-start"} transition-all duration-200`}>
                  <div className={`flex items-start gap-2.5 max-w-[72%] ${isMe?"":"flex-row-reverse"}`}>
                    {/* Message content — me: left of avatar / them: right of avatar */}
                    <div className={`flex flex-col ${isMe?"items-end":"items-start"} gap-0.5 min-w-0`}>
                      {m.type==="text"||m.type==="emoji"&&m.content.length>2?<div className={`px-5 py-3 text-[13px] leading-relaxed rounded-[3rem] ${isMe?"rounded-br-lg text-white/95":"rounded-bl-lg text-white/88"}`}
                        style={isMe?{background:"linear-gradient(135deg, #7c3aed, #06b6d4)",boxShadow:"0 6px 20px -6px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.15)"}:{background:"rgba(255,255,255,0.06)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.06)",boxShadow:"0 4px 12px -4px rgba(0,0,0,0.15)"}}>{m.content}</div>
                      :m.type==="emoji"?<div className="text-[40px] leading-none select-none">{m.content}</div>
                      :m.type==="image"?<img src={m.content} alt="" className="max-w-[280px] rounded-2xl object-cover cursor-pointer hover:scale-[1.02] transition-transform"/>
                      :m.type==="file"?<div className="flex items-center gap-3 px-4 py-3 rounded-[20px] max-w-[280px]" style={{background:"rgba(255,255,255,0.05)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.06)"}}>
                        <FileText size={16} className="text-violet-400 shrink-0"/><div className="flex-1 min-w-0"><p className="text-[11px] font-medium truncate">{m.fileName}</p></div>
                        {m.fileData&&<a href={m.fileData} download={m.fileName} className="w-7 h-7 rounded-lg grid place-items-center hover:bg-white/10"><Download size={12} className="text-white/30 hover:text-white/60"/></a>}
                      </div>:null}
                      <span className="text-[9px] text-white/40 px-1">{m.time}</span>
                    </div>
                    {/* Avatar + username — me: right side / them: left side */}
                    <div className="shrink-0 flex flex-col items-center gap-0.5">
                      {showAv?<div className={`w-7 h-7 rounded-full overflow-hidden grid place-items-center text-[9px] font-bold ring-1 ring-white/10 ${isMe?"":`bg-gradient-to-br ${grad(activeIdx)}`}`}
                        style={isMe&&!meAvatar?{background:"rgba(255,255,255,0.10)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.18)"}:{}}>{avEl}</div>:<div className="w-7"/>}
                      {showAv&&<span className="text-[9px] text-white font-medium px-0.5 whitespace-nowrap">{isMe?meName:m.username}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {isTyping&&<div className="flex justify-start transition-opacity duration-200">
              <div className="flex flex-row-reverse items-start gap-2.5 max-w-[72%]">
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
            <img src={previewImg} alt="" className="w-12 h-12 rounded-xl object-cover"/>
            <span className="text-[11px] text-white/50 flex-1">Image ready</span>
            <button onClick={()=>setPreviewImg(null)} className="text-white/20 hover:text-white/60 text-xs px-2">✕</button>
            <button onClick={sendImg} className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-500 to-cyan-400 text-white">Send</button>
          </div>}

          <div className="px-3 md:px-4 pb-3 md:pb-4 pt-2 shrink-0">
            <div className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 h-[50px] md:h-[56px] rounded-full"
              style={{background:"rgba(255,255,255,0.04)",backdropFilter:"blur(30px)",border:"1px solid rgba(255,255,255,0.15)",boxShadow:"0 8px 32px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)"}}>
              <div className="relative">
                <button onClick={()=>setShowEmoji(!showEmoji)} disabled={!contact||contact.id===0} className={`w-8 h-8 md:w-9 md:h-9 rounded-full grid place-items-center transition-all active:scale-90 ${showEmoji?"bg-white/[0.08] text-violet-400":"text-white/25 hover:text-white/60 hover:bg-white/[0.04]"} ${(!contact||contact.id===0)&&"opacity-20 cursor-not-allowed"}`}><Smile size={15}/></button>
                {showEmoji&&<div className="absolute bottom-full left-0 mb-3 rounded-2xl p-3 w-[280px] md:w-[304px] z-50" style={{background:"rgba(18,16,30,0.97)",backdropFilter:"blur(60px)",border:"1px solid rgba(255,255,255,0.1)",boxShadow:"0 20px 50px -10px rgba(0,0,0,0.7)"}}>
                  <div className="grid grid-cols-8 gap-1.5">{EMOJI_LIST.map(e=><button key={e} onClick={()=>{setInput(p=>p+e);setShowEmoji(false);}} className="w-7 h-7 md:w-8 md:h-8 rounded-lg grid place-items-center text-lg md:text-xl hover:bg-white/10 hover:scale-[1.15] active:scale-95">{e}</button>)}</div>
                </div>}
              </div>
              <button onClick={()=>imgRef.current?.click()} disabled={!contact||contact.id===0} className={`w-8 h-8 md:w-9 md:h-9 rounded-full grid place-items-center text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all active:scale-90 ${(!contact||contact.id===0)&&"opacity-20 cursor-not-allowed"}`}><Image size={15}/></button>
              <input ref={imgRef} type="file" accept="image/*" onChange={pickImg} className="hidden"/>
              <button onClick={()=>fileRef.current?.click()} disabled={!contact||contact.id===0} className={`w-8 h-8 md:w-9 md:h-9 rounded-full grid place-items-center text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all active:scale-90 ${(!contact||contact.id===0)&&"opacity-20 cursor-not-allowed"}`}><AlignJustify size={15}/></button>
              <input ref={fileRef} type="file" onChange={pickFile} className="hidden"/>
              <input type="text" placeholder={contact&&contact.id>0?"Message...":"Select a contact to chat"} value={input} onChange={e=>setInput(e.target.value)}
                disabled={!contact||contact.id===0}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();sendText();}}}
                className="flex-1 bg-transparent outline-none text-[12px] md:text-[13px] placeholder:text-white/15 px-1.5 md:px-2 disabled:opacity-20"/>
              <button onClick={sendText} disabled={!input.trim()||!contact||contact.id===0} className={`w-8 h-8 md:w-9 md:h-9 rounded-full grid place-items-center transition-all active:scale-90 ${input.trim()&&contact&&contact.id>0?"bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-[0_0_18px_rgba(124,58,237,0.4)] scale-100":"text-white/20 scale-95"}`}><Send size={13}/></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
