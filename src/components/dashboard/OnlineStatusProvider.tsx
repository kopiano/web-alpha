import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react"
import { useAuth } from "./AuthProvider"

export interface WsMessage {
  type: string
  chat_type?: string
  content?: string
  sender_id?: number
  sender_username?: string
  username?: string
  msg_type?: string
  time?: string
  file_name?: string
  file_url?: string
  id?: number
  conversation_id?: number
  [key: string]: any
}

interface OnlineContextType {
  onlineUsers: Set<number>
  subscribe: (handler: (msg: WsMessage) => void) => () => void
}

const OnlineContext = createContext<OnlineContextType>({
  onlineUsers: new Set(),
  subscribe: () => () => {},
})

export const useOnlineStatus = () => useContext(OnlineContext)

export const OnlineStatusProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set())
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()
  const handlersRef = useRef<Set<(msg: WsMessage) => void>>(new Set())

  const subscribe = useCallback((handler: (msg: WsMessage) => void) => {
    handlersRef.current.add(handler)
    return () => { handlersRef.current.delete(handler) }
  }, [])

  const connect = () => {
    if (!user) return
    const protocol = location.protocol === "https:" ? "wss:" : "ws:"
    const ws = new WebSocket(
      `${protocol}//${location.host}/api/v1/chat/ws?user_id=${user.id}&username=${encodeURIComponent(user.username)}&avatar=${encodeURIComponent(user.username.slice(0, 2).toUpperCase())}`
    )
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const d: WsMessage = JSON.parse(e.data)
        if (d.type === "online" && d.users) {
          setOnlineUsers(new Set(d.users.map((u: any) => u.user_id)))
        }
        // 转发所有消息类型到订阅者
        handlersRef.current.forEach(h => h(d))
      } catch { /* ignore */ }
    }
    ws.onclose = (e) => {
      if (e.code !== 1000) {
        reconnectTimer.current = setTimeout(connect, 3000)
      }
    }
    ws.onerror = () => { if (ws.readyState === WebSocket.OPEN) ws.close() }
  }

  useEffect(() => {
    connect()
    const poll = async () => {
      if (!user) return
      try {
        const token = localStorage.getItem("token")
        const res = await fetch("/api/v1/chat/user_info", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        const data = await res.json()
        const contacts = data?.data?.contacts ?? []
        setOnlineUsers(new Set(contacts.filter((c: any) => c.online).map((c: any) => c.user_id)))
      } catch { /* ignore */ }
    }
    const timer = setInterval(poll, 15000)
    poll()
    return () => {
      clearInterval(timer)
      clearTimeout(reconnectTimer.current)
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CONNECTING) {
        wsRef.current.close(1000)
      }
    }
  }, [user?.id])

  return (
    <OnlineContext.Provider value={{ onlineUsers, subscribe }}>
      {children}
    </OnlineContext.Provider>
  )
}
