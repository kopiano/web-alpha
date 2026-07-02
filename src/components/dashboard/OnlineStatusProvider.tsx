import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { useAuth } from "./AuthProvider"

interface OnlineContextType {
  onlineUsers: Set<number>
}

const OnlineContext = createContext<OnlineContextType>({ onlineUsers: new Set() })

export const useOnlineStatus = () => useContext(OnlineContext)

export const OnlineStatusProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set())
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()

  const connect = () => {
    if (!user) return
    const protocol = location.protocol === "https:" ? "wss:" : "ws:"
    const ws = new WebSocket(
      `${protocol}//${location.host}/api/v1/chat/ws?user_id=${user.id}&username=${encodeURIComponent(user.username)}&avatar=${encodeURIComponent(user.username.slice(0, 2).toUpperCase())}`
    )
    wsRef.current = ws

    ws.onopen = () => console.log("[Online WS] connected")
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data)
        if (d.type === "online" && d.users) {
          setOnlineUsers(new Set(d.users.map((u: any) => u.user_id)))
        }
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
    <OnlineContext.Provider value={{ onlineUsers }}>
      {children}
    </OnlineContext.Provider>
  )
}
