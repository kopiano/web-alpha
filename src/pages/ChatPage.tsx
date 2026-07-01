import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Smile, Image, Send, ChevronDown, FileText, Download, AlignJustify, Plus } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useAuth } from "@/components/dashboard/AuthProvider";
import { resolveAvatar } from "@/lib/avatar";
import { fetchChat, sendChatMessage } from "@/api/chat";
import { getUsers } from "@/api/user";

/* ─── Types ─── */
interface ChatUser { id: number; username: string; email?: string; avatar?: string; status?: string; last_login_at?: string; }
interface ChatMsg { id?: number; user_id: number; username: string; avatar?: string; type: string; content: string; file_name?: string; file_url?: string; CreatedAt?: string; }
interface Contact { id: number; name: string; avatar: string; lastMsg: string; time: string; unread: number; online: boolean; userData?: ChatUser; lastSeen?: string; }
interface Message { id: number; sender: "me"|"them"; type: "text"|"emoji"|"image"|"file"; content: string; time: string; fileName?: string; fileSize?: string; fileData?: string; username?: string; }

const AVATAR_GRADS = ["from-violet-500 to-cyan-400","from-pink-500 to-violet-500","from-cyan-400 to-blue-500","from-emerald-400 to-cyan-400","from-fuchsia-500 to-pink-500","from-violet-500 to-fuchsia-500","from-blue-400 to-cyan-400"];
const EMOJI_LIST = ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","😉","😍","😘","😋","😎","🤩","🥳","🤔","🤗","👍","👌","👏","🙌","💪","🙏","🎉","✨","🔥","🚀","💯","❤️"];

function initials(n: string) { return n?.slice(0,2).toUpperCase()||"??"; }
function timeFmt(ts: string) { if(!ts) return ""; try{return new Date(ts).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true});}catch{return ts;} }
function ago(iso: string) { if(!iso) return ""; const d=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/1000)); if(d<60) return "just now"; if(d<3600) return `${Math.floor(d/60)}m ago`; if(d<86400) return `${Math.floor(d/3600)}h ago`; if(d<604800) return `${Math.floor(d/86400)}d ago`; return ""; }

function buildContact(u: ChatUser, lastMsg: string, lastTime: string): Contact {
  return { id: u.id, name: u.username, avatar: initials(u.username), lastMsg, time: timeFmt(lastTime), unread: 0, online: false, userData: u, lastSeen: u.last_login_at||"" };
}

const ChatPage = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [previewImg, setPreviewImg] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket|null>(null);
  const midRef = useRef(0);
  const meRef = useRef("Me");

  const me = user;
  const meName = me?.username||"Me";
  const meInit = initials(meName);
  const meAvatar = me?.avatar ? resolveAvatar(me.avatar) : null;
  meRef.current = meName;

  /* ─── WebSocket ─── */
  const connectWS = useCallback(() => {
    try {
      const p = location.protocol==="https:"?"wss:":"ws:";
      const ws = new WebSocket(`${p}//${location.host}/api/v1/chat/ws?username=${encodeURIComponent(meRef.current)}&avatar=${encodeURIComponent(meInit)}`);
      wsRef.current = ws;
      ws.onopen = () => console.log("[WS] ok");
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if(d.type==="online"&&d.users) setOnlineUsers(new Set(d.users.map((u:any)=>u.user_id)));
          if(d.type==="message"&&d.content) {
            const isMe = d.username===meRef.current||d.sender_username===meRef.current;
            if(isMe) return;
            setMessages(p=>[...p,{id:++midRef.current,sender:"them",type:d.msg_type||d.type||"text",content:d.content,time:d.time||timeFmt(new Date().toISOString()),fileName:d.file_name,fileData:d.file_url,username:d.username||d.sender_username}]);
            setIsTyping(true); setTimeout(()=>setIsTyping(false),1500);
          }
          if(d.type==="recall") setMessages(p=>p.map(m=>m.id===d.msg_id?{...m,content:"[Message recalled]",type:"text"}:m));
        } catch {}
      };
      ws.onclose = (e) => { if(e.code!==1000) setTimeout(connectWS,3000); };
      ws.onerror = () => { if(ws.readyState===WebSocket.OPEN) ws.close(); };
    } catch {}
  }, [meInit]);

  /* ─── Load data ─── */
  const loadAll = useCallback(() => {
    getUsers().then(res=>{
      const users: ChatUser[] = res.data?.data ?? [];
      const cs = users.filter(u=>u.id!==me?.id).map(u=>buildContact(u,"",""));
      setContacts(cs.length?cs:[{id:0,name:"No users",avatar:"??",lastMsg:"Register to start chatting",time:"",unread:0,online:false}]);
    }).catch(()=>setContacts([{id:0,name:"Server offline",avatar:"!!",lastMsg:"Backend not reachable",time:"",unread:0,online:false}])).finally(()=>setLoading(false));
  }, [me?.id]);

  const loadForUser = useCallback((userId: number) => {
    fetchChat({with_user:userId,limit:200}).then(res=>{
      const d = res.data?.data??res.data;
      const msgs: ChatMsg[] = d?.messages??[];
      const my = meRef.current;
      setMessages(msgs.map(m=>({id:++midRef.current,sender:m.username===my?"me":"them",type:(m.type as any)||"text",content:m.content,time:timeFmt(m.CreatedAt||""),fileName:m.file_name,fileData:m.file_url,username:m.username})));
    }).catch(()=>{});
  }, []);

  useEffect(()=>{if(!me)return;connectWS();loadAll();return()=>{const w=wsRef.current;if(w&&w.readyState!==WebSocket.CONNECTING)w.close(1000);};},[me]);

  /* ─── Switch contact → load private messages ─── */
  const switchContact = (i: number) => {
    setActiveIdx(i);
    const c = contacts[i];
    if(c&&c.id>0) loadForUser(c.id);
  };

  /* ─── Send ─── */
  const sendMsg = useCallback((type: string, content: string, fileName?: string, fileData?: string) => {
    const c = contacts[activeIdx];
    const local: Message = {id:++midRef.current,sender:"me",type:type as any,content,time:timeFmt(new Date().toISOString()),fileName,fileData};
    setMessages(p=>[...p,local]);
    sendChatMessage({user_id:me?.id||0,recipient_id:c?.id||0,username:meRef.current,avatar:meInit,type,content,file_name:fileName||"",file_url:fileData||""}).catch(()=>{});
  }, [me?.id,meInit,contacts,activeIdx]);

  const sendText = () => { const v=input.trim(); if(!v) return; sendMsg(/^\p{Emoji}+$/u.test(v)?"emoji":"text",v); setInput(""); setShowEmoji(false); };
  const sendImg = () => { if(!previewImg) return; sendMsg("image",previewImg,"image.png",previewImg); setPreviewImg(null); };
  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>sendMsg("file",f.name,f.name,r.result as string); r.readAsDataURL(f); e.target.value=""; };
  const pickImg = (e: React.ChangeEvent<HTMLInputElement>) => { const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>setPreviewImg(r.result as string); r.readAsDataURL(f); e.target.value=""; };

  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages.length]);

  const grad = (i: number) => AVATAR_GRADS[i%7];
  const filtered = contacts.filter(c=>c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const contact = contacts[activeIdx];
  const online = (c: Contact) => onlineUsers.has(c.id)||String(c.userData?.status||"").toLowerCase()==="active";

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{background:"radial-gradient(circle at 30% 20%, rgba(138,92,246,0.15), transparent 35%), radial-gradient(circle at 70% 80%, rgba(0,212,255,0.1), transparent 30%), #070707",padding:"36px"}}>
      <div className="pointer-events-none fixed inset-0 z-0" style={{background:"radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.5) 100%)"}}/>
      <style>{`.csb::-webkit-scrollbar{width:4px}.csb::-webkit-scrollbar-track{background:transparent}.csb::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:10px}.csb::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.15)}`}</style>
      <Sidebar/>
      <div className="relative z-10 w-full max-w-[1600px] h-[calc(100vh-72px)] flex gap-0 ml-24">

        {/* LEFT */}
        <div className="w-[320px] shrink-0 flex flex-col h-full rounded-l-[32px] overflow-hidden"
          style={{background:"rgba(255,255,255,0.03)",backdropFilter:"blur(30px) saturate(180%)",borderTop:"1px solid rgba(255,255,255,0.07)",borderBottom:"1px solid rgba(255,255,255,0.07)",borderLeft:"1px solid rgba(255,255,255,0.07)",borderRight:"1px solid rgba(255,255,255,0.04)",boxShadow:"0 20px 60px -20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)"}}>
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold text-violet-400/40 uppercase tracking-[0.3em] mb-1">Inbox</p>
                <h2 className="text-[22px] font-bold tracking-tight" style={{background:"linear-gradient(to right, #fff, #c4b5fd 70%, #67e8f9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Chat</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-white/20 bg-white/[0.04] px-2.5 py-1 rounded-full">{contacts.filter(c=>c.id!==0).length} total</span>
                <span className="text-[10px] font-bold text-emerald-400/80 bg-emerald-500/8 px-2.5 py-1 rounded-full">{onlineUsers.size} online</span>
              </div>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/15"/>
              <input placeholder="Search..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full rounded-[1.25rem] pl-9 pr-4 py-2.5 text-[11px] outline-none placeholder:text-white/10 border border-white/[0.04]" style={{background:"rgba(255,255,255,0.03)"}}/>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto csb px-3 pb-3">
            {loading?<div className="space-y-3 px-3 py-4">{[1,2,3,4].map(i=><div key={i} className="h-16 rounded-2xl bg-white/[0.03] animate-pulse"/>)}</div>
            :filtered.length===0?<div className="text-center py-10 text-white/20 text-[12px]">{contacts.length===0?"Server offline":"No matches"}</div>
            :filtered.map((c,i)=>{
              const isActive=i===activeIdx;
              const on=online(c);
              return (
                <button key={c.id} onClick={()=>switchContact(i)}
                  className={`w-full text-left px-3 py-2.5 rounded-[2rem] flex items-center gap-3.5 transition-all duration-300 mb-0.5 ${isActive?"scale-[1.02]":"hover:bg-white/[0.02]"}`}
                  style={isActive?{background:"rgba(255,255,255,0.08)",backdropFilter:"blur(24px) saturate(180%)",border:"1px solid rgba(255,255,255,0.15)",boxShadow:"0 4px 20px -8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)"}:{border:"1px solid transparent"}}>
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full grid place-items-center text-[11px] font-bold overflow-hidden shadow-lg"
                      style={c.userData?.avatar?{}:{background:"rgba(255,255,255,0.10)",backdropFilter:"blur(20px) saturate(180%)",border:"1px solid rgba(255,255,255,0.18)",boxShadow:"0 4px 24px -8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)"}}>
                      {c.userData?.avatar?<img src={c.userData.avatar.startsWith('http')?c.userData.avatar:resolveAvatar(c.userData.avatar)} alt="" className="w-full h-full object-cover" onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>:null}
                      <span className={c.userData?.avatar?"hidden":""}>{c.avatar}</span>
                    </div>
                    {on&&<span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-[3px] border-[#0c0c14] shadow-[0_0_12px_rgba(52,211,153,0.7)]"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className={`text-[13px] font-semibold truncate ${isActive?"text-white":"text-white/80"}`}>{c.name}</p>
                      <span className="text-[9px] text-white/25 ml-1.5 shrink-0 font-mono">{c.time}</span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className={`text-[10px] truncate ${isActive?"text-white/30":"text-white/18"}`}>{c.lastMsg||(on?"Say hi 👋":"")}</p>
                      {c.unread>0&&!isActive&&<span className="text-[9px] font-bold bg-emerald-400 text-white min-w-[18px] h-[18px] rounded-full grid place-items-center leading-none ml-1.5 shrink-0">{c.unread>99?"99+":c.unread}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="p-4 border-t border-white/[0.03]">
            <div className="flex items-center gap-3 px-2.5 py-2 rounded-2xl">
              <div className="w-10 h-10 rounded-full grid place-items-center text-[10px] font-bold shadow-lg ring-1 ring-white/10 overflow-hidden"
                style={meAvatar?{}:{background:"rgba(255,255,255,0.10)",backdropFilter:"blur(20px) saturate(180%)",border:"1px solid rgba(255,255,255,0.18)"}}>
                {meAvatar?<img src={meAvatar} alt="" className="w-full h-full object-cover"/>:meInit}
              </div>
              <div className="flex-1 min-w-0"><p className="text-[12px] font-semibold text-white/80">{meName}</p><p className="text-[10px] text-emerald-300/50">Online</p></div>
              <ChevronDown size={14} className="text-white/10"/>
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div className="flex-1 flex flex-col h-full min-w-0 rounded-r-[32px] overflow-hidden"
          style={{background:"rgba(255,255,255,0.02)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,0.06)",borderBottom:"1px solid rgba(255,255,255,0.06)",borderRight:"1px solid rgba(255,255,255,0.06)",boxShadow:"0 20px 60px -20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)"}}>
          <div className="px-5 py-3 flex items-center gap-3 shrink-0 border-b border-white/[0.03]" style={{background:"rgba(255,255,255,0.015)",backdropFilter:"blur(40px)"}}>
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
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto csb px-5 py-4 space-y-1.5">
            {!contact||contact.id===0?<div className="flex items-center justify-center h-full"><p className="text-[13px] text-white/20">Select a contact to start chatting</p></div>
            :messages.length===0?<div className="flex items-center justify-center h-full"><p className="text-[13px] text-white/20">Send a message to start</p></div>
            :messages.map((m,i)=>{
              const isMe=m.sender==="me";
              const prevSame=i>0&&messages[i-1]?.sender===m.sender;
              const showAv=!prevSame;
              const avEl=isMe
                ?(meAvatar?<img src={meAvatar} alt="" className="w-full h-full object-cover"/>:<span>{meInit}</span>)
                :(contact?.userData?.avatar?<img src={contact.userData.avatar.startsWith('http')?contact.userData.avatar:resolveAvatar(contact.userData.avatar)} alt="" className="w-full h-full object-cover"/>:<span>{contact?.avatar||"?"}</span>);
              return (
                <div key={m.id} className={`flex ${isMe?"justify-end":"justify-start"}`} style={{animation:"slide-up 0.35s ease forwards",opacity:0}}>
                  <div className="flex items-start gap-2.5 max-w-[72%]">
                    {/* Message content — always on the left of avatar */}
                    <div className={`flex flex-col ${isMe?"items-end":"items-start"} gap-0.5 min-w-0`}>
                      {m.type==="text"||m.type==="emoji"&&m.content.length>2?<div className={`px-5 py-3 text-[13px] leading-relaxed rounded-[3rem] rounded-br-lg ${isMe?"text-white/95":"text-white/88"}`}
                        style={isMe?{background:"linear-gradient(135deg, #7c3aed, #06b6d4)",boxShadow:"0 6px 20px -6px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.15)"}:{background:"rgba(255,255,255,0.06)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.06)",boxShadow:"0 4px 12px -4px rgba(0,0,0,0.15)"}}>{m.content}</div>
                      :m.type==="emoji"?<div className="text-[40px] leading-none select-none">{m.content}</div>
                      :m.type==="image"?<img src={m.content} alt="" className="max-w-[280px] rounded-2xl object-cover cursor-pointer hover:scale-[1.02] transition-transform"/>
                      :m.type==="file"?<div className="flex items-center gap-3 px-4 py-3 rounded-[20px] max-w-[280px]" style={{background:"rgba(255,255,255,0.05)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.06)"}}>
                        <FileText size={16} className="text-violet-400 shrink-0"/><div className="flex-1 min-w-0"><p className="text-[11px] font-medium truncate">{m.fileName}</p></div>
                        {m.fileData&&<a href={m.fileData} download={m.fileName} className="w-7 h-7 rounded-lg grid place-items-center hover:bg-white/10"><Download size={12} className="text-white/30 hover:text-white/60"/></a>}
                      </div>:null}
                      <span className="text-[9px] text-white/40 px-1">{m.time}</span>
                    </div>
                    {/* Avatar + username — always on the right */}
                    <div className="shrink-0 flex flex-col items-center gap-0.5">
                      {showAv?<div className={`w-7 h-7 rounded-full overflow-hidden grid place-items-center text-[9px] font-bold ring-1 ring-white/10 ${isMe?"":`bg-gradient-to-br ${grad(activeIdx)}`}`}
                        style={isMe&&!meAvatar?{background:"rgba(255,255,255,0.10)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.18)"}:{}}>{avEl}</div>:<div className="w-7"/>}
                      {showAv&&<span className="text-[9px] text-white font-medium px-0.5 whitespace-nowrap">{isMe?meName:m.username}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {isTyping&&<div className="flex justify-start" style={{animation:"slide-up 0.35s ease forwards",opacity:0}}>
              <div className="flex items-start gap-2.5 max-w-[72%]">
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

          <div className="px-4 pb-4 pt-2 shrink-0">
            <div className="flex items-center gap-2 px-3 h-[56px] rounded-full"
              style={{background:"rgba(255,255,255,0.04)",backdropFilter:"blur(30px)",border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 8px 32px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)"}}>
              <div className="relative">
                <button onClick={()=>setShowEmoji(!showEmoji)} disabled={!contact||contact.id===0} className={`w-9 h-9 rounded-full grid place-items-center transition-all ${showEmoji?"bg-white/[0.08] text-violet-400":"text-white/25 hover:text-white/60 hover:bg-white/[0.04]"} ${(!contact||contact.id===0)&&"opacity-30 cursor-not-allowed"}`}><Smile size={17}/></button>
                {showEmoji&&<div className="absolute bottom-full left-0 mb-3 rounded-2xl p-3 w-[304px] z-50" style={{background:"rgba(18,16,30,0.97)",backdropFilter:"blur(60px)",border:"1px solid rgba(255,255,255,0.1)",boxShadow:"0 20px 50px -10px rgba(0,0,0,0.7)"}}>
                  <div className="grid grid-cols-8 gap-1.5">{EMOJI_LIST.map(e=><button key={e} onClick={()=>{setInput(p=>p+e);setShowEmoji(false);}} className="w-8 h-8 rounded-lg grid place-items-center text-xl hover:bg-white/10 hover:scale-[1.15] active:scale-95">{e}</button>)}</div>
                </div>}
              </div>
              <button onClick={()=>imgRef.current?.click()} disabled={!contact||contact.id===0} className={`w-9 h-9 rounded-full grid place-items-center text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all ${(!contact||contact.id===0)&&"opacity-30 cursor-not-allowed"}`}><Image size={17}/></button>
              <input ref={imgRef} type="file" accept="image/*" onChange={pickImg} className="hidden"/>
              <button onClick={()=>fileRef.current?.click()} disabled={!contact||contact.id===0} className={`w-9 h-9 rounded-full grid place-items-center text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all ${(!contact||contact.id===0)&&"opacity-30 cursor-not-allowed"}`}><AlignJustify size={17}/></button>
              <input ref={fileRef} type="file" onChange={pickFile} className="hidden"/>
              <input type="text" placeholder={contact&&contact.id>0?"Message...":"Select a contact to chat"} value={input} onChange={e=>setInput(e.target.value)}
                disabled={!contact||contact.id===0}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();sendText();}}}
                className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-white/15 px-2 disabled:opacity-30"/>
              <button onClick={sendText} disabled={!input.trim()||!contact||contact.id===0} className={`w-9 h-9 rounded-full grid place-items-center transition-all ${input.trim()&&contact&&contact.id>0?"bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-[0_0_18px_rgba(124,58,237,0.4)] scale-100":"text-white/20 scale-95"}`}><Send size={14}/></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
