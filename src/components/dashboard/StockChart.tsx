import { useEffect, useMemo, useRef, useState } from "react";
import { getStockQuote } from "@/api/stocks";

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

type ChartPoint = StockPoint & { x: number; y: number; vY: number };
type QuoteResponse = {
  symbol?: string;
  name?: string;
  exchange?: string;
  currency?: string;
  market_state?: string;
  regular?: StockPayload["regular"];
  pre_market?: StockPayload["pre_market"];
  points?: StockPoint[];
  data?: StockPayload | StockPayload[];
  result?: StockPayload | StockPayload[];
  quote?: StockPayload;
};

type TimeStep = { minutes: number; label: string };

const PERIODS: Period[] = ["1D", "5D", "1M"];
const SYMBOLS: { symbol: StockSymbol; label: string }[] = [
  { symbol: "SPCX", label: "SPCX" },
  { symbol: "AAPL", label: "AAPL" },
  { symbol: "NVDA", label: "NVDA" },
  { symbol: "TSLA", label: "TSLA" },
];

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

function formatCompactVolume(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function binarySearch(points: ChartPoint[], targetX: number) {
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (points[mid].x < targetX) lo = mid + 1;
    else hi = mid;
  }
  if (lo <= 0) return 0;
  if (lo >= points.length) return points.length - 1;
  return Math.abs(points[lo].x - targetX) < Math.abs(points[lo - 1].x - targetX) ? lo : lo - 1;
}

function buildPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

function smoothCurve(points: { x: number; y: number }[]) {
  if (points.length < 2) return buildPath(points);
  const d: string[] = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const steepness = Math.abs(dy) / Math.max(1, Math.abs(dx));
    const clampFactor = steepness > 1.4 ? 0.35 : steepness > 0.9 ? 0.55 : 1;
    const adjC1x = p1.x + (c1x - p1.x) * clampFactor;
    const adjC1y = p1.y + (c1y - p1.y) * clampFactor;
    const adjC2x = p2.x + (c2x - p2.x) * clampFactor;
    const adjC2y = p2.y + (c2y - p2.y) * clampFactor;
    d.push(`C ${adjC1x} ${adjC1y}, ${adjC2x} ${adjC2y}, ${p2.x} ${p2.y}`);
  }
  return d.join(" ");
}

function xTickIndexes(period: Period, length: number) {
  if (length <= 1) return [0];
  const list =
    period === "1D"
      ? [0, Math.floor(length * 0.25), Math.floor(length * 0.5), Math.floor(length * 0.75), length - 1]
      : period === "5D"
        ? [0, Math.floor(length * 0.2), Math.floor(length * 0.4), Math.floor(length * 0.6), Math.floor(length * 0.8), length - 1]
        : period === "1M"
          ? [0, 7, 14, 21, 28, length - 1]
          : period === "6M"
            ? [0, 21, 42, 63, 84, 105, length - 1]
            : [0, Math.floor(length * 0.2), Math.floor(length * 0.4), Math.floor(length * 0.6), Math.floor(length * 0.8), length - 1];
  return [...new Set(list.map((i) => clamp(i, 0, length - 1)))];
}

function yTicks(min: number, max: number, count = 6) {
  if (min === max) return [min];
  const raw = (max - min) / Math.max(1, count - 1);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / pow;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * pow;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.25; v += step) ticks.push(v);
  return ticks.length > 1 ? ticks : [min, max];
}

function computeYDomain(points: StockPoint[]) {
  if (!points.length) return { min: 0, max: 1 };
  const lows = points.map((p) => p.low);
  const highs = points.map((p) => p.high);
  const minValue = Math.min(...lows);
  const maxValue = Math.max(...highs);
  const range = maxValue - minValue || Math.max(1, maxValue * 0.01);
  const center = (maxValue + minValue) / 2;
  const dynamicPad = Math.max(range * 0.12, center * 0.004);
  return {
    min: minValue - dynamicPad,
    max: maxValue + dynamicPad,
  };
}

function safeNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function formatTickLabel(point: StockPoint, period: Period) {
  if (period === "1D") {
    return new Date(point.t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  if (period === "5D" || period === "1M") {
    return new Date(point.t).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" });
  }
  return new Date(point.t).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" });
}

function getPeriodConfig(period: Period): TimeStep[] {
  const now = new Date();
  const steps: TimeStep[] = [];
  if (period === "1D") {
    for (let minute = 0; minute <= 390; minute += 1) {
      const d = new Date(now.getTime() - (390 - minute) * 60_000);
      steps.push({ minutes: minute, label: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) });
    }
    return steps;
  }
  if (period === "5D") {
    for (let day = 4; day >= 0; day -= 1) {
      const base = new Date(now);
      base.setDate(base.getDate() - day);
      const sessionStart = new Date(base);
      sessionStart.setHours(9, 30, 0, 0);
      for (let minute = 0; minute <= 390; minute += 10) {
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
  const count = period === "6M" ? 90 : period === "YTD" ? 120 : period === "1Y" ? 52 : period === "5Y" ? 60 : 72;
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
  const baseBySymbol: Record<StockSymbol, number> = { SPCX: 151.4, AAPL: 217.62, NVDA: 128.44, TSLA: 243.18 };
  const base = baseBySymbol[symbol];
  const steps = getPeriodConfig(period);
  const now = Date.now();
  const points: StockPoint[] = [];
  let close = base * 0.97;
  const drift = symbol === "TSLA" ? 0.0008 : symbol === "NVDA" ? 0.00045 : 0.0002;
  const volatility = period === "1D" ? 0.0045 : period === "5D" ? 0.006 : period === "1M" ? 0.01 : 0.015;

  steps.forEach((step, index) => {
    const seed = Math.sin(index * 1.37 + symbol.charCodeAt(0)) * 0.6 + Math.cos(index * 0.41) * 0.4;
    const ridge = Math.sin(index * 0.18 + symbol.charCodeAt(0) * 0.02) * 0.9;
    const move = drift + seed * volatility * 0.28 + ridge * volatility * 0.16;
    const open = close;
    close = Math.max(1, open * (1 + move));
    const swing = open * (volatility * 0.9);
    const high = Math.max(open, close) + Math.abs(seed) * swing * 0.45;
    const low = Math.min(open, close) - Math.abs(seed) * swing * 0.45;
    const volumeBase = period === "1D" ? 1.2e6 : period === "5D" ? 4.5e6 : 9.5e6;
    const volume = Math.round(volumeBase * (0.65 + Math.abs(seed) * 0.75));
    points.push({ t: now + step.minutes * 60_000, label: step.label, open, high, low, close, volume });
  });

  const last = points[points.length - 1];
  const prev = points[points.length - 2] ?? last;
  const change = last.close - prev.close;
  const changePercent = prev.close ? (change / prev.close) * 100 : 0;

  return {
    symbol,
    name: symbol === "SPCX" ? "Space Exploration Tech" : symbol === "AAPL" ? "Apple Inc." : symbol === "NVDA" ? "NVIDIA Corp." : "Tesla Inc.",
    exchange: symbol === "SPCX" ? "NASDAQ" : "NYSE",
    currency: "USD",
    market_state: "regular",
    regular: {
      price: last.close,
      change,
      change_percent: changePercent,
      time: "10:02:41 AM GMT-4. Market open.",
    },
    points,
  };
}

function normalizeResponse(raw: unknown, fallbackSymbol: StockSymbol, period: Period): StockPayload | null {
  const payload = raw as QuoteResponse | undefined;
  const candidate = Array.isArray(payload?.data)
    ? payload?.data[0]
    : Array.isArray(payload?.result)
      ? payload?.result[0]
      : payload?.data || payload?.result || payload?.quote || payload;

  if (!candidate || typeof candidate !== "object") return null;

  const points = Array.isArray((candidate as StockPayload).points) ? (candidate as StockPayload).points : undefined;
  const regular = (candidate as StockPayload).regular;
  const preMarket = (candidate as StockPayload).pre_market;
  const symbol = (candidate as StockPayload).symbol || payload?.symbol || fallbackSymbol;

  return {
    symbol,
    name: (candidate as StockPayload).name || payload?.name || symbol,
    exchange: (candidate as StockPayload).exchange || payload?.exchange || "NASDAQ",
    currency: (candidate as StockPayload).currency || payload?.currency || "USD",
    market_state: (candidate as StockPayload).market_state || payload?.market_state || "regular",
    regular,
    pre_market: preMarket,
    points:
      period === "5D"
        ? (points && points.length >= 150 ? points : mockSeries(fallbackSymbol, period).points)
        : period === "1D"
          ? (points && points.length >= 200 ? points : mockSeries(fallbackSymbol, period).points)
          : points?.length
            ? points
            : mockSeries(fallbackSymbol, period).points,
  };
}

function QuoteRow({ label, price, change, changePercent, time }: { label: string; price?: number; change?: number; changePercent?: number; time?: string }) {
  const up = (change ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-white/[0.10] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
      <div className="text-[10px] uppercase tracking-[0.24em] text-white/50">{label}</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[24px] font-semibold tabular-nums text-white">${formatPrice(price)}</span>
        <span className={`text-[12px] font-medium tabular-nums ${up ? "text-emerald-300" : "text-rose-300"}`}>{formatSigned(change)} ({formatPercent(changePercent)})</span>
      </div>
      <div className="mt-1 text-[11px] text-white/40">{label}: {time || "--"}</div>
    </div>
  );
}

export const StockChart = ({ className = "" }: { className?: string }) => {
  const [period, setPeriod] = useState<Period>("5D");
  const [symbol, setSymbol] = useState<StockSymbol>("SPCX");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(1240);
  const hoverFrameRef = useRef<number | null>(null);
  const pendingHoverIndexRef = useRef<number | null>(null);
  const periodBarRef = useRef<HTMLDivElement | null>(null);
  const periodButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [periodIndicator, setPeriodIndicator] = useState({ left: 0, width: 0 });

  const [payload, setPayload] = useState<StockPayload>(() => mockSeries(symbol, period));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const nextWidth = Math.max(920, Math.floor(el.getBoundingClientRect().width - 48));
      setChartWidth(nextWidth);
    };

    updateWidth();

    const Observer = typeof ResizeObserver !== "undefined" ? ResizeObserver : null;
    if (!Observer) return;

    const observer = new Observer(() => {
      updateWidth();
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const activeIndex = PERIODS.indexOf(period);
    const btn = periodButtonRefs.current[activeIndex];
    const bar = periodBarRef.current;
    if (!btn || !bar) return;

    const barRect = bar.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setPeriodIndicator({
      left: btnRect.left - barRect.left,
      width: btnRect.width,
    });
  }, [period, chartWidth]);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `stock-chart:${symbol}:${period}`;
    const ttlMs = 12 * 60 * 60 * 1000;

    const readCache = () => {
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (!cachedRaw) return null;
        const cached = JSON.parse(cachedRaw) as { ts: number; payload: StockPayload };
        if (!cached?.ts || !cached?.payload) return null;
        if (Date.now() - cached.ts > ttlMs) return null;
        return cached.payload;
      } catch {
        return null;
      }
    };

    const writeCache = (nextPayload: StockPayload) => {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), payload: nextPayload }));
      } catch {
        // ignore cache write failures
      }
    };

    const cached = readCache();
    if (cached) {
      setPayload(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    const range = period === "6M" ? "6m" : period.toLowerCase();

    void getStockQuote(symbol, range)
      .then((response) => {
        const nextPayload = normalizeResponse(response.data, symbol, period) || mockSeries(symbol, period);
        if (cancelled) return;
        setPayload(nextPayload);
        writeCache(nextPayload);
      })
      .catch(() => {
        if (cancelled) return;
        setPayload(mockSeries(symbol, period));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, symbol]);

  const points = payload.points || [];
  const regular = payload.regular;
  const preMarket = payload.pre_market;
  const last = regular?.price ?? points[points.length - 1]?.close ?? 0;
  const prev = points[points.length - 2]?.close ?? points[0]?.close ?? last;
  const diff = regular?.change ?? last - prev;
  const diffPct = regular?.change_percent ?? (prev ? (diff / prev) * 100 : 0);
  const isUp = diff >= 0;

  const { min, max } = useMemo(() => computeYDomain(points), [points]);

  const width = chartWidth;
  const height = 420;
  const pad = { left: 28, right: 110, top: 30, bottom: 54 };
  const chartW = Math.max(1, safeNumber(width - pad.left - pad.right, 1));
  const chartH = Math.max(1, safeNumber(height - pad.top - pad.bottom, 1));
  const volumeH = 50;

  const plotted: ChartPoint[] = points.map((p, index) => ({
    ...p,
    x: safeNumber(pad.left + (index / Math.max(1, points.length - 1)) * chartW, pad.left),
    y: safeNumber(pad.top + chartH - ((p.close - min) / (max - min || 1)) * (chartH - volumeH), pad.top + chartH / 2),
  }));

  const linePath = smoothCurve(plotted.map(({ x, y }) => ({ x, y })));
  const areaPath = plotted.length ? `${linePath} L ${plotted[plotted.length - 1].x} ${pad.top + chartH - volumeH} L ${plotted[0].x} ${pad.top + chartH - volumeH} Z` : "";
  const yTickList = points.length ? yTicks(min, max, 6) : [];
  const xTicks = xTickIndexes(period, plotted.length);
  const currentPoint = plotted[plotted.length - 1];
  const hoveredPoint = hoverIndex !== null ? plotted[hoverIndex] : null;
  const activePoint = hoveredPoint ?? currentPoint;
  const lineLength = Math.max(2200, plotted.length * 58);
  const xAxisLabels = xTicks.map((index) => ({ index, point: plotted[index] }));
  const bottomLabel = hoveredPoint ? hoveredPoint.label : currentPoint?.label;
  const yLabels = yTickList.map((tick) => ({ tick, y: safeNumber(pad.top + chartH - ((tick - min) / (max - min || 1)) * (chartH - volumeH), pad.top) }));
  const minVolume = points.length ? Math.min(...points.map((p) => p.volume)) : 0;
  const maxVolume = points.length ? Math.max(...points.map((p) => p.volume)) : 1;
  const safeCurrentPoint = currentPoint ?? plotted[0] ?? null;
  const safeActivePoint = activePoint ?? safeCurrentPoint;

  useEffect(() => {
    return () => {
      if (hoverFrameRef.current !== null) {
        cancelAnimationFrame(hoverFrameRef.current);
      }
    };
  }, []);

  return (
    <section className={`rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.06)] backdrop-blur-[30px] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.6),_inset_0_1px_0_rgba(255,255,255,0.06)] ${className}`}>
      <div className="p-5 md:p-6 lg:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-[280px] max-w-[280px] rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.04)] px-5 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="w-[88px] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-[15px] md:text-[16px] font-semibold tracking-[0.01em] text-white">{payload.symbol}</h3>
              <span className="rounded-full border border-white/15 bg-black/20 px-2 py-0.5 text-[10px] font-medium tracking-[0.18em] text-white/70 backdrop-blur-md">{payload.exchange}</span>
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/62 truncate">{payload.name}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/68">
              <span>{period}</span>
              <span>·</span>
              <span>{period === "5D" ? "10 minute intervals" : period === "1M" ? "1 day intervals" : period === "1D" ? "1 minute intervals" : "daily intervals"}</span>
              <span>·</span>
              <span>{payload.currency}</span>
            </div>
            <div className="mt-4">
              <div className="text-[38px] md:text-[42px] font-semibold leading-none tracking-[-0.06em] tabular-nums text-white">{formatPrice(last)}</div>
              <div className={`mt-1 text-[13px] font-medium tabular-nums ${isUp ? "text-emerald-300" : "text-rose-300"}`}>
                {formatSigned(diff)} ({formatPercent(diffPct)})
              </div>
              <div className="mt-1 text-[11px] text-white/62">{loading ? "Loading market data..." : `As of ${regular?.time || "10:02:41 AM GMT-4. Market open."}`}</div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 xl:items-end">
            <div className="grid gap-2 md:grid-cols-2">
              <QuoteRow label="At close" price={regular?.price} change={regular?.change} changePercent={regular?.change_percent} time={regular?.time} />
              <QuoteRow label="Pre-market" price={preMarket?.price} change={preMarket?.change} changePercent={preMarket?.change_percent} time={preMarket?.time} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] p-1 backdrop-blur-xl">
            {SYMBOLS.map((item) => (
              <button
                key={item.symbol}
                onClick={() => {
                  setSymbol(item.symbol);
                  setHoverIndex(null);
                }}
                className={`rounded-full px-4 py-2 text-[12px] font-medium transition-all ${symbol === item.symbol ? "bg-white text-black shadow-[0_8px_20px_rgba(255,255,255,0.15)]" : "text-white/45 hover:text-white"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div ref={periodBarRef} className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] p-1 backdrop-blur-xl lg:ml-auto">
            <span
              className="absolute top-1 bottom-1 rounded-full bg-white shadow-[0_8px_20px_rgba(255,255,255,0.12)] transition-all duration-300 ease-out"
              style={{
                left: periodIndicator.left,
                width: periodIndicator.width,
                opacity: periodIndicator.width ? 1 : 0,
              }}
            />
            {PERIODS.map((item, index) => (
              <button
                key={item}
                ref={(node) => {
                  periodButtonRefs.current[index] = node;
                }}
                onClick={() => {
                  setPeriod(item);
                  setHoverIndex(null);
                }}
                className={`relative z-10 rounded-full px-4 py-2 text-[12px] font-medium transition-all ${period === item ? "bg-white text-black shadow-[0_8px_20px_rgba(255,255,255,0.15)]" : "text-white/45 hover:text-white"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/[0.07] bg-[rgba(255,255,255,0.03)] p-[30px] backdrop-blur-2xl">
          <div ref={chartContainerRef} className="rounded-[16px] p-6">
            <div className="relative">
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="h-[520px] w-full overflow-visible select-none"
                  onMouseLeave={() => {
                    pendingHoverIndexRef.current = null;
                    if (hoverFrameRef.current !== null) {
                      cancelAnimationFrame(hoverFrameRef.current);
                      hoverFrameRef.current = null;
                    }
                    setHoverIndex(null);
                  }}
                onMouseMove={(event) => {
                  if (!plotted.length) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  const x = ((event.clientX - rect.left) / rect.width) * width;
                  const index = binarySearch(plotted, x);
                  pendingHoverIndexRef.current = index;
                  if (hoverFrameRef.current !== null) return;
                  hoverFrameRef.current = requestAnimationFrame(() => {
                    hoverFrameRef.current = null;
                    setHoverIndex(pendingHoverIndexRef.current);
                  });
                }}
              >
                <defs>
                  <pattern id="verticalDots" width="6" height="6" patternUnits="userSpaceOnUse">
                    <circle cx="1.5" cy="1.5" r="0.8" fill="#D9D9D9" opacity="0.18" />
                  </pattern>
                  <linearGradient id="stockFillGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(220,38,38,0.20)" />
                    <stop offset="45%" stopColor="rgba(220,38,38,0.10)" />
                    <stop offset="100%" stopColor="rgba(220,38,38,0)" />
                  </linearGradient>
                  <linearGradient id="stockLineGlowGradient" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#FCA5A5" />
                    <stop offset="100%" stopColor="#F87171" />
                  </linearGradient>
                  <filter id="stockLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feColorMatrix
                      in="blur"
                      type="matrix"
                      values="1 0 0 0 0
                              0 0.42 0 0 0
                              0 0 0.42 0 0
                              0 0 0 0.75 0"
                      result="glow"
                    />
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <clipPath id="areaClip" clipPathUnits="userSpaceOnUse">
                    <path d={areaPath} />
                  </clipPath>
                </defs>

                <rect x={safeNumber(pad.left, 0)} y={safeNumber(pad.top, 0)} width={chartW} height={Math.max(1, chartH - volumeH)} fill="url(#verticalDots)" opacity="0.24" />

                {yLabels.map(({ tick, y }) => (
                  <g key={tick}>
                    <text x={width - 12} y={y + 4} textAnchor="end" className="fill-[#6B7280] text-[12px]">
                      {tick.toFixed(2)}
                    </text>
                  </g>
                ))}

                {xAxisLabels.map(({ index, point }) => {
                  if (!point) return null;
                  return (
                    <g key={index}>
                      <line x1={point.x} y1={pad.top} x2={point.x} y2={pad.top + chartH - volumeH} stroke="#D9D9D9" strokeDasharray="1 7" opacity="0.55" />
                      <text x={point.x} y={height - 12} textAnchor="middle" className="fill-[#6B7280] text-[11px]">
                        {formatTickLabel(points[index], period)}
                      </text>
                    </g>
                  );
                })}

                <g clipPath="url(#areaClip)">
                  <path d={areaPath} fill="url(#stockFillGradient)" opacity="0.9" />
                </g>

                <path d={linePath} fill="none" stroke="#F87171" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.10" filter="url(#stockLineGlow)" />
                <path
                  d={linePath}
                  fill="none"
                  stroke="url(#stockLineGlowGradient)"
                  strokeWidth="1.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#stockLineGlow)"
                  style={{
                    strokeDasharray: lineLength,
                    strokeDashoffset: lineLength,
                    animation: "stock-draw 600ms ease-out forwards",
                  }}
                />

                {points.map((p, index) => {
                  const barHeight = Math.max(2, safeNumber(((p.volume - minVolume) / ((maxVolume - minVolume) || 1)) * 42, 2));
                  const barX = safeNumber(p.x - 1.5, pad.left);
                  const barY = safeNumber(pad.top + chartH - volumeH + (42 - barHeight), pad.top + chartH - volumeH);
                  return (
                    <rect
                      key={p.t}
                      x={barX}
                      y={barY}
                      width="3"
                      height={barHeight}
                      rx="1"
                      fill="#CBD5E1"
                      opacity="0.12"
                    />
                  );
                })}

                {activePoint ? (
                  <>
                    <line x1={safeNumber(safeActivePoint?.x ?? 0, 0)} y1={pad.top} x2={safeNumber(safeActivePoint?.x ?? 0, 0)} y2={pad.top + chartH - volumeH} stroke="#8A8A8A" strokeDasharray="5 5" opacity="0.45" />
                    <line x1={pad.left} y1={safeNumber(safeActivePoint?.y ?? 0, 0)} x2={width - pad.right} y2={safeNumber(safeActivePoint?.y ?? 0, 0)} stroke="#8A8A8A" strokeDasharray="5 5" opacity="0.45" />
                    <line x1={pad.left} y1={safeNumber(safeCurrentPoint?.y ?? 0, 0)} x2={width - pad.right} y2={safeNumber(safeCurrentPoint?.y ?? 0, 0)} stroke="#10B981" strokeDasharray="6 6" opacity="0.7" />
                    <g transform={`translate(${width - pad.right + 10}, ${safeNumber(safeCurrentPoint?.y ?? 0, 0)})`}>
                      <rect x="0" y="-19" width="84" height="38" rx="8" fill="#047857" />
                      <text x="42" y="6" textAnchor="middle" className="fill-white text-[14px] font-medium tabular-nums">
                        {formatPrice(last)}
                      </text>
                    </g>
                    <g transform={`translate(${width - pad.right + 10}, ${safeNumber(safeActivePoint?.y ?? 0, 0)})`}>
                      <rect x="0" y="-16" width="76" height="32" rx="8" fill="#333333" />
                      <text x="38" y="5" textAnchor="middle" className="fill-white text-[13px] font-medium tabular-nums">
                        {formatPrice(safeActivePoint?.close)}
                      </text>
                    </g>
                    {safeCurrentPoint ? <circle cx={safeCurrentPoint.x} cy={safeCurrentPoint.y} r="6" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2" /> : null}
                  </>
                ) : null}

                {safeCurrentPoint ? (
                  <g transform={`translate(${pad.left + 12}, ${pad.top + 12})`}>
                    <rect x="0" y="0" width="88" height="32" rx="10" fill="#DC2626" />
                    <path d="M 24 32 L 34 32 L 29 40 Z" fill="#DC2626" />
                    <text x="44" y="21" textAnchor="middle" className="fill-white text-[14px] font-bold tabular-nums">
                      {formatPercent(diffPct)}
                    </text>
                  </g>
                ) : null}

                {hoveredPoint ? (
                  <g>
                    <circle cx={safeActivePoint.x} cy={safeActivePoint.y} r="4" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2" />
                    <g transform={`translate(${clamp(safeActivePoint.x - 160, 12, width - 332)}, ${clamp(safeActivePoint.y - 180, 12, height - 220)})`}>
                      <rect x="0" y="0" width="320" height="180" rx="16" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.34)" />
                      <rect x="0.5" y="0.5" width="319" height="179" rx="15.5" fill="rgba(255,255,255,0.06)" />
                      <text x="18" y="28" className="fill-white/55 text-[15px] font-normal">Date</text>
                      <text x="302" y="28" textAnchor="end" className="fill-white/90 text-[15px] font-semibold tabular-nums">{safeActivePoint.label}</text>
                      <text x="18" y="58" className="fill-white/55 text-[15px] font-normal">Close</text>
                      <text x="302" y="58" textAnchor="end" className="fill-white/90 text-[15px] font-semibold tabular-nums">${formatPrice(safeActivePoint.close)}</text>
                      <text x="18" y="88" className="fill-white/55 text-[15px] font-normal">Open</text>
                      <text x="302" y="88" textAnchor="end" className="fill-white/90 text-[15px] font-semibold tabular-nums">${formatPrice(safeActivePoint.open)}</text>
                      <text x="18" y="118" className="fill-white/55 text-[15px] font-normal">High</text>
                      <text x="302" y="118" textAnchor="end" className="fill-white/90 text-[15px] font-semibold tabular-nums">${formatPrice(safeActivePoint.high)}</text>
                      <text x="18" y="148" className="fill-white/55 text-[15px] font-normal">Low</text>
                      <text x="302" y="148" textAnchor="end" className="fill-white/90 text-[15px] font-semibold tabular-nums">${formatPrice(safeActivePoint.low)}</text>
                      <text x="18" y="176" className="fill-white/55 text-[15px] font-normal">Volume</text>
                      <text x="302" y="176" textAnchor="end" className="fill-white/90 text-[15px] font-semibold tabular-nums">{formatCompactVolume(safeActivePoint.volume)}</text>
                    </g>
                  </g>
                ) : null}
              </svg>

              {hoveredPoint ? (
                <div
                  className="pointer-events-none absolute rounded-[8px] bg-[#333333] px-[18px] py-[10px] text-[13px] font-medium text-white shadow-[0_10px_24px_rgba(0,0,0,0.14)]"
                  style={{
                      left: clamp((hoveredPoint.x ?? safeCurrentPoint?.x ?? 0) - 48, 12, chartWidth - 124),
                    bottom: 6,
                  }}
                >
                  {bottomLabel}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
