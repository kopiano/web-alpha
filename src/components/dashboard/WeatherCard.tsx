import { useEffect, useState } from "react"
import { CloudSun } from "lucide-react"
import { fetchWeather } from "@/api/weather"
import { useAuth } from "@/components/dashboard/AuthProvider"

interface WeatherDay {
  day: string
  date: number
  icon: string
  iconColor: string
  bgGradient: string
  low: number
  high: number
  current?: number
  aqi: number
  humidity: number
}

/* ─── Condition → emoji mapping ─── */
const CONDITION_MAP: Record<string, { icon: string; iconColor: string; bgGradient: string }> = {
  "Sunny":              { icon: "☀️", iconColor: "text-amber-300", bgGradient: "from-amber-500/10 to-orange-500/5" },
  "Clear":              { icon: "☀️", iconColor: "text-amber-300", bgGradient: "from-amber-500/10 to-orange-500/5" },
  "Mostly Sunny":       { icon: "🌤️", iconColor: "text-amber-100", bgGradient: "from-sky-500/10 to-amber-400/5" },
  "Partly Cloudy":      { icon: "⛅", iconColor: "text-amber-200", bgGradient: "from-amber-400/10 to-yellow-500/5" },
  "Cloudy":             { icon: "☁️", iconColor: "text-white/50",  bgGradient: "from-white/5 to-white/[0.02]" },
  "Overcast":           { icon: "☁️", iconColor: "text-white/50",  bgGradient: "from-white/5 to-white/[0.02]" },
  "Light Rain Shower":  { icon: "🌧️", iconColor: "text-sky-300",   bgGradient: "from-sky-500/15 to-blue-500/10" },
  "Light Rain":         { icon: "🌧️", iconColor: "text-sky-300",   bgGradient: "from-sky-500/15 to-blue-500/10" },
  "Moderate Rain":      { icon: "🌧️", iconColor: "text-sky-300",   bgGradient: "from-sky-500/15 to-blue-500/10" },
  "Heavy Rain":         { icon: "🌧️", iconColor: "text-sky-300",   bgGradient: "from-sky-500/15 to-blue-500/10" },
  "Thunderstorm":       { icon: "⛈️", iconColor: "text-indigo-300", bgGradient: "from-indigo-500/15 to-sky-500/10" },
  "Light Snow":         { icon: "🌨️", iconColor: "text-sky-100",   bgGradient: "from-sky-500/10 to-white/5" },
  "Snow":               { icon: "❄️", iconColor: "text-sky-100",   bgGradient: "from-sky-500/10 to-white/5" },
  "Foggy":              { icon: "🌫️", iconColor: "text-white/40",  bgGradient: "from-white/5 to-white/[0.02]" },
  "Hazy":               { icon: "🌫️", iconColor: "text-white/40",  bgGradient: "from-white/5 to-white/[0.02]" },
  "Windy":              { icon: "💨", iconColor: "text-cyan-300",   bgGradient: "from-cyan-500/10 to-white/5" },
};

function conditionToStyle(condition: string) {
  return CONDITION_MAP[condition] || { icon: "🌤️", iconColor: "text-amber-100", bgGradient: "from-sky-500/10 to-amber-400/5" }
}

function getWeekFromMonday(): WeatherDay[] {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const icons = [
    { icon: "☀️", iconColor: "text-amber-300", bgGradient: "from-amber-500/10 to-orange-500/5", low: 22, high: 35 },
    { icon: "⛅", iconColor: "text-amber-200", bgGradient: "from-amber-400/10 to-yellow-500/5", low: 20, high: 31 },
    { icon: "🌤️", iconColor: "text-amber-100", bgGradient: "from-sky-500/10 to-amber-400/5", low: 21, high: 30 },
    { icon: "🌧️", iconColor: "text-sky-300", bgGradient: "from-sky-500/15 to-blue-500/10", low: 19, high: 26 },
    { icon: "⛈️", iconColor: "text-indigo-300", bgGradient: "from-indigo-500/15 to-sky-500/10", low: 18, high: 24 },
    { icon: "☁️", iconColor: "text-white/50", bgGradient: "from-white/5 to-white/[0.02]", low: 17, high: 23 },
    { icon: "🌥️", iconColor: "text-white/60", bgGradient: "from-white/8 to-white/[0.02]", low: 18, high: 25 },
  ]

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + mondayOffset + i)
    const isToday = i === dayOfWeek - 1 || (dayOfWeek === 0 && i === 6)

    const c = icons[i]
    return {
      day: days[i],
      date: d.getDate(),
      ...c,
      current: isToday ? 28 : undefined,
      aqi: [32, 45, 28, 55, 68, 42, 38][i],
      humidity: [45, 52, 38, 65, 78, 55, 48][i],
    }
  })
}

export const WeatherCard = () => {
  const [week, setWeek] = useState<WeatherDay[]>([])
  const { user } = useAuth()
  const loggedIn = !!user

  useEffect(() => {
    if (!loggedIn) {
      // Guest → show mock immediately
      setWeek(getWeekFromMonday())
      return
    }

    // Logged in → fetch real data, no mock fallback
    fetchWeather()
      .then((res) => {
        const list: any[] = res.data?.data
        if (!list || !Array.isArray(list) || list.length === 0) return

        // Build map: "YYYY-MM-DD" → API day data
        const apiMap = new Map<string, any>()
        for (const d of list) {
          const ds = d.date?.slice(0, 10)
          if (ds) apiMap.set(ds, d)
        }

        const todayStr = new Date().toISOString().slice(0, 10)
        const mockWeek = getWeekFromMonday()

        // Compute current week's Monday
        const now = new Date()
        const dayOfWeek = now.getDay()
        const monday = new Date(now)
        monday.setDate(now.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek))

        setWeek(
          mockWeek.map((slot, i) => {
            const slotDate = new Date(monday)
            slotDate.setDate(monday.getDate() + i)
            const slotDateStr = slotDate.toISOString().slice(0, 10)
            const apiDay = apiMap.get(slotDateStr)
            if (!apiDay) return slot // fallback to mock

            const style = conditionToStyle(apiDay.condition || "")
            const isToday = slotDateStr === todayStr
            return {
              ...slot,
              ...style,
              current: isToday ? (apiDay.temp_current ?? slot.current) : undefined,
              low: apiDay.temp_low ?? slot.low,
              high: apiDay.temp_high ?? slot.high,
              aqi: apiDay.aqi ?? slot.aqi,
              humidity: slot.humidity,
            }
          }),
        )
      })
      .catch(() => { /* no mock fallback for logged-in users */ })
  }, [loggedIn])

  const today = week.find((d) => d.current !== undefined)

  // Logged in but no data yet (loading or API failed) → render nothing
  if (loggedIn && week.length === 0) return null

  function aqiLevel(aqi: number) {
    if (aqi <= 50) return { label: "优", color: "text-emerald-400", bar: "bg-emerald-400" }
    if (aqi <= 100) return { label: "良", color: "text-emerald-400", bar: "bg-emerald-400" }
    if (aqi <= 150) return { label: "轻度", color: "text-yellow-400", bar: "bg-yellow-400" }
    if (aqi <= 200) return { label: "中度", color: "text-orange-400", bar: "bg-orange-400" }
    return { label: "重度", color: "text-red-400", bar: "bg-red-400" }
  }

  return (
    <div className="glass glass-hover noise rounded-3xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[50%]
bg-gradient-to-br from-sky-400 to-cyan-300 grid place-items-center shadow-[0_0_15px_hsla(190,100%,55%,0.25)]">
            <CloudSun size={14} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-white/40 font-medium tracking-widest uppercase">Weather</p>
            <h4 className="text-sm font-semibold flex items-center gap-2">
              杭州
              <span className="text-[10px] font-normal text-white/30">Hangzhou</span>
            </h4>
          </div>
        </div>
        {today && (
          <div className="flex items-center gap-2">
            <span className="text-2xl">{today.icon}</span>
            <div className="text-right">
              <p className="text-xl font-bold tabular-nums">{today.current ?? today.high}°</p>
              <p className="text-[10px] text-white/40">
                {today.low}° / {today.high}°
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AQI only */}
      {today && (
        <div className="flex items-center gap-4 mb-5 px-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold ${aqiLevel(today.aqi).color}`}>
              AQI {today.aqi} {aqiLevel(today.aqi).label}
            </span>
            <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full ${aqiLevel(today.aqi).bar}`}
                style={{ width: `${Math.min(today.aqi, 150)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {week.map((d, idx) => {
          const isToday = week.some((w) => w.current !== undefined) && d.current !== undefined
          return (
            <div
              key={`${d.day}-${d.date}`}
              className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all duration-300 ${
                isToday
                  ? `bg-gradient-to-b ${d.bgGradient} shadow-[0_0_20px_-5px_hsla(190,100%,55%,0.2)] ring-1 ring-white/10`
                  : "hover:bg-white/5"
              }`}
            >
              <span className={`text-[9px] font-semibold tracking-wider uppercase ${isToday ? "text-white/90" : "text-white/40"}`}>
                {d.day}
              </span>
              <span className={`text-[11px] font-medium ${isToday ? "text-white/70" : "text-white/40"}`}>
                {d.date}
              </span>
              <span className={`text-lg leading-none ${d.iconColor}`}>{d.icon}</span>
              <div className="flex flex-col items-center leading-tight">
                <span className="text-xs font-bold text-white/80">{d.high}°</span>
                <span className="text-[9px] text-white/30">{d.low}°</span>
              </div>
              {isToday && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-400 shadow-[0_0_6px_hsla(190,100%,55%,0.8)]" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
