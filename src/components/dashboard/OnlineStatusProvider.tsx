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
  sendMessage: (payload: Record<string, any>) => boolean
}

const OnlineContext = createContext<OnlineContextType>({
  onlineUsers: new Set(),
  subscribe: () => () => {},
  sendMessage: () => false,
})

export const useOnlineStatus = () => useContext(OnlineContext)

export const OnlineStatusProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set())
  const [connectionState, setConnectionState] = useState<"connecting" | "open" | "closed">("closed")
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()
  const handlersRef = useRef<Set<(msg: WsMessage) => void>>(new Set())
  const connectionIdRef = useRef(0)

  const subscribe = useCallback((handler: (msg: WsMessage) => void) => {
    handlersRef.current.add(handler)
    return () => { handlersRef.current.delete(handler) }
  }, [])

  const sendMessage = useCallback((payload: Record<string, any>) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN || connectionState !== "open") return false
    try {
      ws.send(JSON.stringify(payload))
      return true
    } catch {
      return false
    }
  }, [connectionState])

  const connect = useCallback(() => {
    if (!user) return
    const connectionId = ++connectionIdRef.current
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
    setConnectionState("connecting")
    wsRef.current = ws

    ws.onopen = () => {
      if (connectionId === connectionIdRef.current) setConnectionState("open")
    }

    ws.onmessage = (e) => {
      try {
        const d: WsMessage = JSON.parse(e.data)
        if ((d.event === "presence.snapshot" || d.type === "presence") && Array.isArray(d.users)) {
          const ids = d.users
            .map((u: any) => Number(u?.user_id ?? u?.id))
            .filter((id: number) => Number.isFinite(id) && id > 0 && id !== user.id)
          setOnlineUsers(new Set(ids))
        }
        if (d.event === "user.online" && d.user_id) {
          const id = Number(d.user_id)
          if (id > 0 && id !== user.id) setOnlineUsers(prev => new Set([...prev, id]))
        }
        if (d.event === "user.offline" && d.user_id) {
          const id = Number(d.user_id)
          setOnlineUsers(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }
        // 转发所有消息类型到订阅者
        handlersRef.current.forEach(h => h(d))
      } catch { /* ignore */ }
    }
    ws.onclose = (e) => {
      if (connectionId !== connectionIdRef.current) return
      setConnectionState("closed")
      setOnlineUsers(new Set())
      if (e.code !== 1000 && user) {
        reconnectTimer.current = setTimeout(connect, 3000)
      }
    }
    ws.onerror = () => { if (connectionId === connectionIdRef.current && ws.readyState === WebSocket.OPEN) ws.close() }
  }, [user])

  useEffect(() => {
    clearTimeout(reconnectTimer.current)
    setConnectionState("closed")
    setOnlineUsers(new Set())
    connectionIdRef.current += 1
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close(1000)
    }
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      connectionIdRef.current += 1
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close(1000)
      }
    }
  }, [connect, user?.id])

  return (
    <OnlineContext.Provider value={{ onlineUsers, subscribe, sendMessage }}>
      {children}
    </OnlineContext.Provider>
  )
}
