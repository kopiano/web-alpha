import { useMemo, useState } from "react";
import { ChevronDown, Maximize2, Settings } from "lucide-react";

type Period = "1D" | "5D" | "1M" | "6M" | "YTD" | "1Y" | "5Y" | "All";
type StockSymbol = "SPCX" | "AAPL" | "NVDA" | "TSLA";

type StockPoint = {
  t: number;
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type StockPayload = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  market_state?: string;
  regular?: {
    price?: number;
    change?: number;
    change_percent?: number;
    time?: string;
  };
  pre_market?: {
    price?: number;
    change?: number;
    change_percent?: number;
    time?: string;
  };
  points?: StockPoint[];
};

const PERIODS: Period[] = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "All"];
const SYMBOLS: { symbol: StockSymbol; label: string }[] = [
  { symbol: "SPCX", label: "SPCX" },
  { symbol: "AAPL", label: "AAPL" },
  { symbol: "NVDA", label: "NVDA" },
  { symbol: "TSLA", label: "TSLA" },
];

type TimeStep = {
  minutes: number;
  label: string;
};

function formatPrice(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatSigned(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatPrice(value)}`;
}

function formatPercent(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function buildPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

function extent(points: StockPoint[]) {
  const lows = points.map((p) => p.low);
  const highs = points.map((p) => p.high);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const pad = (max - min) * 0.12 || max * 0.01;
  return { min: min - pad, max: max + pad };
}

function yTicks(min: number, max: number, count = 5) {
  if (min === max) return [min];
  const raw = (max - min) / Math.max(1, count - 1);
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / pow;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * pow;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.25; v += step) ticks.push(v);
  return ticks.length > 1 ? ticks : [min, max];
}

function formatTickLabel(point: StockPoint, period: Period) {
  if (period === "5D") {
    return new Date(point.t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  if (period === "1D") {
    return new Date(point.t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  return new Date(point.t).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" });
}

function xTickIndexes(period: Period, length: number) {
  if (length <= 1) return [0];
  const list =
    period === "5D"
      ? [0, Math.floor(length * 0.2), Math.floor(length * 0.4), Math.floor(length * 0.6), Math.floor(length * 0.8), length - 1]
      : period === "1M"
        ? [0, 5, 10, 15, 20, 25, length - 1]
        : period === "6M"
          ? [0, 21, 42, 63, 84, 105, length - 1]
          : [0, 42, 84, 126, 168, 210, length - 1];
  return [...new Set(list.map((i) => Math.max(0, Math.min(length - 1, i))))];
}

function QuoteRow({
  label,
  price,
  change,
  changePercent,
  time,
}: {
  label: string;
  price?: number;
  change?: number;
  changePercent?: number;
  time?: string;
}) {
  const up = (change ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.24em] text-white/40">{label}</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[24px] font-semibold tabular-nums text-white">${formatPrice(price)}</span>
        <span className={`text-[12px] font-medium tabular-nums ${up ? "text-emerald-300" : "text-rose-300"}`}>
          {formatSigned(change)} ({formatPercent(changePercent)})
        </span>
      </div>
      <div className="mt-1 text-[11px] text-white/35">{label}: {time || "--"}</div>
    </div>
  );
}

function getPeriodConfig(period: Period): TimeStep[] {
  const now = new Date();
  const steps: TimeStep[] = [];

  if (period === "1D") {
    const startMinutes = 60 * 6;
    for (let minute = startMinutes; minute <= 60 * 13; minute += 10) {
      steps.push({ minutes: minute, label: new Date(now.getTime() - (60 * 13 - minute) * 60_000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) });
    }
    return steps;
  }

  if (period === "5D") {
    for (let day = 4; day >= 0; day -= 1) {
      const base = new Date(now);
      base.setDate(base.getDate() - day);
      const sessionStart = new Date(base);
      sessionStart.setHours(9, 30, 0, 0);
      for (let minute = 0; minute <= (6 * 60 + 20); minute += 10) {
        const d = new Date(sessionStart.getTime() + minute * 60_000);
        steps.push({ minutes: Math.round((d.getTime() - now.getTime()) / 60_000), label: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) });
      }
    }
    return steps;
  }

  if (period === "1M") {
    for (let day = 29; day >= 0; day -= 1) {
      const d = new Date(now);
      d.setDate(d.getDate() - day);
      steps.push({ minutes: Math.round((d.getTime() - now.getTime()) / 60_000), label: d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" }) });
    }
    return steps;
  }

  const count = period === "6M" ? 90 : period === "YTD" ? Math.max(1, now.getMonth() * 4 + now.getDate() / 7) : period === "1Y" ? 52 : period === "5Y" ? 60 : 72;
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    if (period === "6M") d.setDate(d.getDate() - i * 2);
    else if (period === "YTD") d.setDate(d.getDate() - i * 7);
    else if (period === "1Y") d.setDate(d.getDate() - i * 7);
    else if (period === "5Y") d.setMonth(d.getMonth() - i);
    else d.setMonth(d.getMonth() - i);
    steps.push({ minutes: Math.round((d.getTime() - now.getTime()) / 60_000), label: d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" }) });
  }
  return steps;
}

function mockSeries(symbol: StockSymbol, period: Period): StockPayload {
  const baseBySymbol: Record<StockSymbol, number> = {
    SPCX: 151.4,
    AAPL: 217.62,
    NVDA: 128.44,
    TSLA: 243.18,
  };
  const base = baseBySymbol[symbol];
  const steps = getPeriodConfig(period);
  const now = Date.now();
  const points: StockPoint[] = [];
  let close = base * (1 - 0.03);
  const drift = symbol === "TSLA" ? 0.0008 : symbol === "NVDA" ? 0.00045 : 0.0002;
  const volatility = period === "1D" || period === "5D" ? 0.006 : period === "1M" ? 0.01 : 0.015;

  steps.forEach((step, index) => {
    const seed = Math.sin(index * 1.37 + symbol.charCodeAt(0)) * 0.6 + Math.cos(index * 0.41) * 0.4;
    const ridge = Math.sin(index * 0.18 + symbol.charCodeAt(0) * 0.02) * 0.9;
    const move = drift + seed * volatility * 0.28 + ridge * volatility * 0.16;
    const open = close;
    close = Math.max(1, open * (1 + move));
    const swing = open * (volatility * 0.9);
    const high = Math.max(open, close) + Math.abs(seed) * swing * 0.45;
    const low = Math.min(open, close) - Math.abs(seed) * swing * 0.45;
    const volumeBase = period === "1D" ? 1.8e6 : period === "5D" ? 4.5e6 : 9.5e6;
    const volume = Math.round(volumeBase * (0.65 + Math.abs(seed) * 0.75));
    points.push({
      t: now + step.minutes * 60_000,
      label: step.label,
      open,
      high,
      low,
      close,
      volume,
    });
  });

  const last = points[points.length - 1];
  const prev = points[points.length - 2] ?? last;
  const change = last.close - prev.close;
  const changePercent = prev.close ? (change / prev.close) * 100 : 0;

  return {
    symbol,
    name:
      symbol === "SPCX"
        ? "Space Exploration Tech"
        : symbol === "AAPL"
          ? "Apple Inc."
          : symbol === "NVDA"
            ? "NVIDIA Corp."
            : "Tesla Inc.",
    exchange: symbol === "SPCX" ? "NASDAQ" : "NYSE",
    currency: "USD",
    market_state: "regular",
    regular: {
      price: last.close,
      change,
      change_percent: changePercent,
      time: new Date(last.t).toLocaleString("en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
    },
    points,
  };
}

export const StockChart = ({ className = "" }: { className?: string }) => {
  const [period, setPeriod] = useState<Period>("5D");
  const [symbol, setSymbol] = useState<StockSymbol>("SPCX");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const payload = useMemo(() => mockSeries(symbol, period), [period, symbol]);
  const points = payload.points || [];
  const { min, max } = useMemo(() => (points.length ? extent(points) : { min: 0, max: 1 }), [points]);
  const width = 1240;
  const height = 420;
  const pad = { left: 30, right: 30, top: 28, bottom: 44 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const plotted = points.map((p, index) => ({
    x: pad.left + (index / Math.max(1, points.length - 1)) * chartW,
    y: pad.top + chartH - ((p.close - min) / (max - min || 1)) * chartH,
    ...p,
  }));

  const linePath = buildPath(plotted);
  const areaPath = plotted.length
    ? `${linePath} L ${plotted[plotted.length - 1].x} ${pad.top + chartH} L ${plotted[0].x} ${pad.top + chartH} Z`
    : "";
  const hovered = hoverIndex !== null ? plotted[hoverIndex] : plotted[plotted.length - 1];
  const regular = payload?.regular;
  const preMarket = payload?.pre_market;
  const last = regular?.price ?? plotted[plotted.length - 1]?.close ?? 0;
  const prev = points[0]?.close ?? last;
  const diff = regular?.change ?? (last - prev);
  const diffPct = regular?.change_percent ?? (prev ? (diff / prev) * 100 : 0);
  const isUp = (diff ?? 0) >= 0;
  const yTickList = points.length ? yTicks(min, max, 5) : [];
  const xTicks = xTickIndexes(period, plotted.length);
  const lineLength = Math.max(2200, plotted.length * 55);
  const hoveredPoint = hovered;
  const currentPoint = plotted[plotted.length - 1];
  const mountainLine = "#F87171";
  const mountainGradientTop = "rgba(248, 113, 113, 0.30)";
  const mountainGradientBottom = "rgba(248, 113, 113, 0.03)";

  return (
    <section className={`relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(10,12,18,0.94),rgba(7,8,12,0.92))] shadow-[0_30px_80px_rgba(0,0,0,0.35)] ${className}`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-20%] h-[320px] w-[320px] rounded-full bg-cyan-500/10 blur-[110px]" />
        <div className="absolute right-[-12%] top-[10%] h-[340px] w-[340px] rounded-full bg-violet-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 p-5 md:p-6 lg:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] md:text-[16px] font-semibold tracking-[0.01em] text-white">{payload?.symbol || symbol}</h3>
                <span className="rounded-full border border-white/[0.10] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium tracking-[0.18em] text-white/45">{payload?.exchange || "NASDAQ"}</span>
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/35">{payload?.name || symbol}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/42">
                <span>{period}</span>
                <span>·</span>
                <span>{period === "5D" ? "10 minute intervals" : period === "1M" ? "1 day intervals" : period === "1D" ? "10 minute intervals" : "daily intervals"}</span>
                <span>·</span>
                <span>{payload?.currency || "USD"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 xl:items-end">
            <div className="text-right">
              <div className="text-[38px] md:text-[42px] font-semibold leading-none tracking-[-0.06em] tabular-nums text-white">${formatPrice(last)}</div>
              <div className={`mt-1 text-[13px] font-medium tabular-nums ${isUp ? "text-emerald-300" : "text-rose-300"}`}>
                {formatSigned(diff)} ({formatPercent(diffPct)})
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <QuoteRow label="At close" price={regular?.price} change={regular?.change} changePercent={regular?.change_percent} time={regular?.time} />
          <QuoteRow label="Pre-market" price={preMarket?.price} change={preMarket?.change} changePercent={preMarket?.change_percent} time={preMarket?.time} />
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
            {SYMBOLS.map((item) => (
              <button
                key={item.symbol}
                onClick={() => {
                  setSymbol(item.symbol);
                  setHoverIndex(null);
                }}
                className={`rounded-full px-4 py-2 text-[12px] font-medium transition-all ${
                  symbol === item.symbol ? "bg-white text-black shadow-[0_8px_20px_rgba(255,255,255,0.15)]" : "text-white/42 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 lg:ml-auto">
            {PERIODS.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setPeriod(item);
                  setHoverIndex(null);
                }}
                className={`rounded-full px-4 py-2 text-[12px] font-medium transition-all ${
                  period === item ? "bg-white text-black shadow-[0_8px_20px_rgba(255,255,255,0.15)]" : "text-white/42 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.012))] p-[30px]">
          <div className="relative">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-[310px] w-full overflow-visible"
              onMouseLeave={() => setHoverIndex(null)}
              onMouseMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const x = ((event.clientX - rect.left) / rect.width) * width;
                const nextIndex = Math.max(0, Math.min(plotted.length - 1, Math.round(((x - pad.left) / chartW) * (plotted.length - 1))));
                setHoverIndex(nextIndex);
              }}
            >
              <defs>
                <linearGradient id="stockLineGradient" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#FCA5A5" />
                  <stop offset="100%" stopColor={mountainLine} />
                </linearGradient>
                <linearGradient id="stockFillGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={mountainGradientTop} />
                  <stop offset="100%" stopColor={mountainGradientBottom} />
                </linearGradient>
              </defs>

              {yTickList.map((tick) => {
                const y = pad.top + chartH - ((tick - min) / (max - min || 1)) * chartH;
                return (
                  <g key={tick}>
                    <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 8" />
                    <text x={width - 14} y={y + 4} textAnchor="end" className="fill-white/35 text-[12px]">
                      {tick.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {xTicks.map((index) => {
                const p = plotted[index];
                if (!p) return null;
                return (
                  <g key={index}>
                    <line x1={p.x} y1={pad.top} x2={p.x} y2={pad.top + chartH} stroke="rgba(255,255,255,0.04)" />
                    <text x={p.x} y={height - 8} textAnchor="middle" className="fill-white/35 text-[12px]">
                      {formatTickLabel(points[index], period)}
                    </text>
                  </g>
                );
              })}

              <path d={areaPath} fill="url(#stockFillGradient)" />
              <path
                d={linePath}
                fill="none"
                stroke="url(#stockLineGradient)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: lineLength,
                  strokeDashoffset: lineLength,
                  animation: "stock-draw 500ms ease-out forwards",
                }}
              />

              {hoveredPoint ? (
                <>
                  <line x1={hoveredPoint.x} y1={pad.top} x2={hoveredPoint.x} y2={pad.top + chartH} stroke="rgba(255,255,255,0.16)" strokeDasharray="4 6" />
                  <line x1={pad.left} y1={hoveredPoint.y} x2={width - pad.right} y2={hoveredPoint.y} stroke="rgba(255,255,255,0.14)" strokeDasharray="4 6" />
                </>
              ) : null}

              {currentPoint ? (
                <>
                  <line x1={pad.left} y1={currentPoint.y} x2={width - pad.right} y2={currentPoint.y} stroke={mountainLine} strokeDasharray="6 6" opacity="0.85" />
                  <g transform={`translate(${width - pad.right + 8}, ${currentPoint.y})`}>
                    <rect x="0" y="-12" width="72" height="24" rx="12" fill="#0F7A4D" />
                    <text x="36" y="5" textAnchor="middle" className="fill-white text-[12px] font-semibold">
                      151.40
                    </text>
                  </g>
                </>
              ) : null}
            </svg>

            {hoveredPoint ? (
              <div
                className="pointer-events-none absolute rounded-2xl border border-white/[0.12] bg-[#0b0f18]/95 px-3 py-2 text-xs text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
                style={{
                  left: Math.min(Math.max(hoveredPoint.x + 12, 12), width - 180),
                  top: Math.max(16, hoveredPoint.y - 58),
                }}
              >
                <div className="text-white/45">{hoveredPoint.label}</div>
                <div className="mt-1 flex items-center gap-2">
                  <span>Close</span>
                  <span className="font-semibold tabular-nums text-white">${formatPrice(hoveredPoint.close)}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};
