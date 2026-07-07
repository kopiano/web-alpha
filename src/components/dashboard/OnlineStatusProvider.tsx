import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react"
import { useAuth } from "./AuthProvider"

export interface WsMessage {
  type: string
  event?: string
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
    const token = localStorage.getItem("token")
    if (!token) return
    const wsBase = import.meta.env.VITE_API_URL?.startsWith("/api")
      ? `${protocol}//${location.host}`
      : (import.meta.env.VITE_API_URL || `${location.origin}/api/v1`).replace(/\/api\/v1\/?$/, "")
    const params = new URLSearchParams({
      token,
      user_id: String(user.id),
      username: user.username,
      avatar: user.avatar || "",
    })
    const ws = new WebSocket(`${wsBase}/api/v1/chat/ws?${params.toString()}`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const d: WsMessage = JSON.parse(e.data)
        if ((d.event === "presence.snapshot" || d.type === "presence") && d.users) {
          setOnlineUsers(new Set(d.users.map((u: any) => u.user_id)))
        }
        if (d.event === "user.online" && d.user_id) {
          setOnlineUsers(prev => new Set([...prev, d.user_id as number]))
        }
        if (d.event === "user.offline" && d.user_id) {
          setOnlineUsers(prev => {
            const next = new Set(prev)
            next.delete(d.user_id as number)
            return next
          })
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
    return () => {
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
