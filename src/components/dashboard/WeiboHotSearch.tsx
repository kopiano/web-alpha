import { useState, useEffect } from "react"
import { getHotSearch } from "@/api/hotSearch"
import { RefreshCw, Globe, Tags, Calendar } from "lucide-react"

interface HotSearchItem {
  rank: number
  title: string
  hot: number
  label?: string
  url?: string
  category?: string
}

const rankColors = [
  "from-red-500 via-orange-400 to-yellow-400",
  "from-orange-400 to-amber-400",
  "from-amber-400 to-yellow-300",
]

const rankGlow = [
  "shadow-[0_0_12px_hsla(0,100%,60%,0.5)]",
  "shadow-[0_0_10px_hsla(30,100%,55%,0.4)]",
  "shadow-[0_0_8px_hsla(45,100%,50%,0.3)]",
]

function formatHot(hot: unknown) {
  if (typeof hot !== "number" || hot <= 0) return "0"
  if (hot >= 100_000_000) return (hot / 100_000_000).toFixed(2) + "亿"
  if (hot >= 10_000) return (hot / 10_000).toFixed(1) + "万"
  return String(hot)
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "国际": {
    bg: "bg-pink-500/10",
    text: "text-pink-300",
    border: "border-pink-400/25",
  },
  "科技": {
    bg: "bg-violet-500/10",
    text: "text-violet-300",
    border: "border-violet-400/25",
  },
  // "社会": {
  //   bg: "bg-amber-500/10",
  //   text: "text-amber-300",
  //   border: "border-amber-400/25",
  // },
  // "娱乐": {
    // bg: "bg-pink-500/10",
    // text: "text-pink-300",
    // border: "border-pink-400/25",
  // },
  // "体育": {
  //   bg: "bg-emerald-500/10",
  //   text: "text-emerald-300",
  //   border: "border-emerald-400/25",
  // },
}

const LABEL_STYLES: Record<string, string> = {
  "新": "bg-cyan-500/20 text-cyan-300 border-cyan-400/30",
  "热": "bg-red-500/20 text-red-300 border-red-400/30",
  "荐": "bg-amber-500/20 text-amber-300 border-amber-400/30",
  "沸": "bg-orange-500/20 text-orange-300 border-orange-400/30",
  "爆": "bg-rose-500/20 text-rose-300 border-rose-400/30",
}

function CategoryBadge({ category }: { category: string }) {
  const style = CATEGORY_STYLES[category]
  if (style) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold
        backdrop-blur-md border ${style.bg} ${style.text} ${style.border} shadow-sm`}>
        {category}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold
      bg-white/[0.04] text-white/25 border border-white/10 backdrop-blur-md">
      {category || "其他"}
    </span>
  )
}

function WeiboLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 30" fill="none" className="w-5 h-5">
      <mask id="a" fill="#fff"><path fillRule="evenodd" d="M.257.642h24.837v18.902H.257z"/></mask>
      <mask id="b" fill="#fff"><path fillRule="evenodd" d="M.28.654h5.148v4.971H.28z"/></mask>
      <mask id="c" fill="#fff"><path fillRule="evenodd" d="M.57.654h4.795v4.971H.571z"/></mask>
      <g fill="none" fillRule="evenodd">
        <path fill="#fefefe" d="M2.715 20.11c0 4.203 5.6 7.613 12.506 7.613s12.506-3.41 12.506-7.613-5.6-7.612-12.506-7.612S2.715 15.907 2.715 20.11"/>
        <path fill="#d52c2b" d="M15.513 27.102c-6.114.59-11.39-2.111-11.788-6.035-.397-3.922 4.239-7.581 10.35-8.172 6.115-.591 11.39 2.11 11.789 6.032.395 3.924-4.238 7.584-10.35 8.175M27.74 14.078c-.521-.152-.878-.255-.604-.924.59-1.45.65-2.701.011-3.593-1.2-1.675-4.48-1.584-8.239-.045 0-.001-1.18.505-.878-.41.579-1.818.49-3.34-.409-4.219-2.039-1.995-7.464.075-12.115 4.62C2.023 12.914 0 16.523 0 19.643c0 5.97 7.831 9.598 15.492 9.598 10.043 0 16.724-5.702 16.724-10.231 0-2.737-2.358-4.29-4.476-4.932"/>
        <path fill="#e79115" d="M34.409 3.154C31.984.526 28.405-.476 25.103.21c-.764.16-1.251.894-1.088 1.64.162.747.914 1.224 1.678 1.063 2.35-.487 4.891.226 6.617 2.093a6.69 6.69 0 0 1 1.452 6.647c-.241.727.165 1.505.91 1.74.743.235 1.54-.162 1.782-.888V12.5a9.39 9.39 0 0 0-2.045-9.346"/>
        <path fill="#e79115" d="M30.684 6.44c-1.181-1.28-2.923-1.766-4.532-1.432a1.19 1.19 0 0 0-.935 1.413c.14.64.787 1.053 1.442.913v.002a2.37 2.37 0 0 1 2.217.698c.578.626.733 1.479.484 2.227h.002a1.187 1.187 0 0 0 .783 1.5c.64.199 1.326-.142 1.532-.768a4.57 4.57 0 0 0-.993-4.553"/>
        <path fill="#060101" d="M15.85 19.996c-.213.358-.686.53-1.057.38-.364-.146-.479-.545-.27-.897.212-.349.666-.52 1.03-.378.369.131.501.535.297.895m-1.947 2.445c-.593.921-1.859 1.325-2.812.9-.94-.418-1.217-1.49-.626-2.388.583-.897 1.808-1.295 2.754-.907.958.4 1.263 1.463.684 2.395m2.22-6.526c-2.909-.741-6.197.676-7.46 3.183-1.287 2.555-.042 5.392 2.897 6.32 3.043.96 6.632-.512 7.88-3.269 1.23-2.697-.306-5.474-3.317-6.234"/>
      </g>
    </svg>
  )
}

export const WeiboHotSearch = () => {
  const [items, setItems] = useState<HotSearchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [taggedOnly, setTaggedOnly] = useState(false)
  const [selectedDate, setSelectedDate] = useState("")
  const [dateOpen, setDateOpen] = useState(false)

  const getDateStr = (offset: number) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }

  const today = getDateStr(0)
  const yesterday = getDateStr(-1)

  const dateOptions = [today, yesterday, getDateStr(-2), getDateStr(-3), getDateStr(-4)]

  const formatLabel = (d: string) => {
    if (d === today) return "今天"
    if (d === yesterday) return "昨天"
    return d
  }

  const fetchData = async (date?: string) => {
    try {
      setError(false)
      const res = await getHotSearch(date || undefined)
      const body = res.data
      setItems((Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : []).slice(0, 50))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleDateSelect = async (date: string) => {
    setSelectedDate(date)
    setDateOpen(false)
    setLoading(true)
    await fetchData(date)
  }

  const handleRefresh = async () => {
    setLoading(true)
    await fetchData(selectedDate || undefined)
  }

  const displayItems = taggedOnly
    ? items.filter((item) => item.category && CATEGORY_STYLES[item.category])
    : items

  return (
    <>
      {/* Date overlay + dropdown */}
      {dateOpen && (
        <>
          <div className="fixed inset-0 z-[999]" onClick={() => setDateOpen(false)} />
          <div className="fixed z-[999] top-[710px] mt-3 right-[30px] glass rounded-2xl p-1.5 animate-dropdown-in flex gap-1 opacity-60">
            {dateOptions.map((d) => {
              const active = d === selectedDate
              return (
                <button
                  key={d}
                  onClick={() => handleDateSelect(active ? "" : d)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all whitespace-nowrap ${
                    active
                      ? "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                      : "text-white/40 hover:bg-white/10 hover:text-white/60"
                  }`}
                >
                  {formatLabel(d)}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Card */}
      <div className="glass glass-hover noise rounded-3xl p-[1px]">
      <div className="relative rounded-[calc(1.75rem-1px)]">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500/0 via-red-500/60 to-red-500/0" />

        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-[50%] bg-white/10 backdrop-blur-md border border-white/15 grid place-items-center shadow-lg">
              <WeiboLogo />
            </div>
            <div>
              <p className="text-[10px] text-white/40 font-medium tracking-[0.2em] uppercase">Weibo</p>
              <h4 className="text-sm font-bold flex items-center gap-2">
                微博热搜
                <span className="text-[9px] font-medium text-emerald-300/80 tracking-wider bg-emerald-400/10 px-1.5 py-0.5 rounded-full border border-emerald-400/20">
                  LIVE
                </span>
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Date picker button (dropdown rendered outside card) */}
            <div className="relative">
              <button
                onClick={() => setDateOpen(!dateOpen)}
                className={`w-8 h-8 rounded-[50%] grid place-items-center active:scale-90 transition-all ${
                  selectedDate
                    ? "bg-sky-500/20 text-sky-400 shadow-[0_0_10px_hsla(200,100%,55%,0.25)]"
                    : "bg-white/5 text-white/30 hover:bg-white/10"
                }`}
              >
                <Calendar size={13} />
              </button>
            </div>

            {/* Filter: tagged categories only */}
            <button
              onClick={() => setTaggedOnly(!taggedOnly)}
              className={`w-8 h-8 rounded-[50%] grid place-items-center active:scale-90 transition-all ${
                taggedOnly
                  ? "bg-amber-500/20 text-amber-400 shadow-[0_0_10px_hsla(40,100%,55%,0.25)]"
                  : "bg-white/5 text-white/30 hover:bg-white/10"
              }`}
            >
              <Tags size={13} />
            </button>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              className="w-8 h-8 rounded-[50%] bg-white/5 grid place-items-center hover:bg-white/10 active:scale-90 transition-all"
            >
              <RefreshCw size={13} className="text-white/40" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="px-2 pb-2 max-h-[455px] overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="space-y-3 px-4 py-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-7 h-6 rounded-lg bg-white/5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-3/4 rounded-lg bg-white/5" />
                    <div className="h-3 w-1/3 rounded-lg bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-white/30">
              <Globe size={28} />
              <p className="text-sm font-medium text-white/40">没有缓存当日数据!</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {displayItems.map((item, index) => {
                const isTop3 = index < 3
                const labelStyle = item.label ? LABEL_STYLES[item.label] : null

                return (
                  <a
                    key={`${item.rank}-${item.title}`}
                    href={item.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 px-4 py-2.5 rounded-2xl hover:bg-white/[0.06] transition-all duration-200 group no-underline"
                  >
                    {/* Rank */}
                    <span
                      className={`relative flex-shrink-0 w-7 h-6 rounded-lg grid place-items-center text-[11px] font-extrabold tabular-nums mt-0.5 ${
                        isTop3
                          ? `bg-gradient-to-br ${rankColors[index]} text-white ${rankGlow[index]}`
                          : "text-white/40 bg-white/[0.04]"
                      }`}
                    >
                      {item.rank}
                      {isTop3 && (
                        <span className="absolute inset-0 rounded-lg animate-pulse opacity-40 bg-white/20" />
                      )}
                    </span>

                    {/* Title + Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium truncate text-white/65 group-hover:text-white/85 transition-colors">
                          {item.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <CategoryBadge category={item.category || ""} />
                        <span className="text-[10px] text-white/20 tabular-nums font-medium">
                          {formatHot(item.hot)}
                        </span>
                      </div>
                    </div>

                    {/* Label — right aligned */}
                    {item.label && labelStyle && (
                      <span className={`flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border self-center ${labelStyle}`}>
                        {item.label}
                      </span>
                    )}
                  </a>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && items.length > 0 && (
          <div className="px-6 pb-3 pt-1">
            <div className="h-px bg-gradient-to-r from-white/0 via-white/5 to-white/0 mb-2" />
            <div className="flex items-center justify-between text-[10px] text-white/20">
              <span>{new Date().toLocaleTimeString("zh-CN", { hour12: false })} 更新</span>
              <span>共 {items.length} 条</span>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  )
}
