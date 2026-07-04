import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { TrendingUp, AlertCircle, UserRound } from "lucide-react";
import * as echarts from "echarts";
import { getMonthlyExpense, getTransactionMonths } from "@/api/transactions";
import { useAuth } from "@/components/dashboard/AuthProvider";
import type { MonthlyEntry } from "@/api/transactions";

const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

/* ─── Guest mock data ─── */
const GUEST_YEAR_DATA: Record<string, number[]> = {
  "2026": [4200, 3850, 5100, 4600, 4300, 5800, 3200, 0, 0, 0, 0, 0],
  "2025": [3800, 4200, 4900, 5200, 4100, 5500, 4800, 3900, 4500, 5300, 5100, 6200],
  "2024": [3500, 3900, 4400, 4800, 3700, 5200, 4300, 3600, 4100, 4900, 4700, 5800],
};

interface Props {
  className?: string;
}

export const MonthlyExpenseChart = ({ className = "" }: Props) => {
  const { user } = useAuth();
  const isGuest = user === null;

  const currentYear = new Date().getFullYear().toString();
  const [year, setYear] = useState(currentYear);
  const [years, setYears] = useState<string[]>([currentYear]);
  const [monthlyData, setMonthlyData] = useState<MonthlyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guest: use mock data directly
  const guestData = useMemo(() => {
    return GUEST_YEAR_DATA[year] || GUEST_YEAR_DATA["2026"] || new Array(12).fill(0);
  }, [year]);

  const fetchYears = useCallback(async () => {
    if (isGuest) {
      setYears(Object.keys(GUEST_YEAR_DATA).sort().reverse());
      return;
    }
    try {
      const res = await getTransactionMonths();
      const months = res.data?.data ?? [];
      const yrSet = new Set(months.map((m: string) => m.split("-")[0]));
      const yrList = [...yrSet].sort().reverse();
      if (yrList.length > 0) {
        setYears(yrList);
        if (!yrList.includes(year)) setYear(yrList[0]);
      }
    } catch {
      // fallback
    }
  }, [isGuest]);

  const fetchData = useCallback(async () => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getMonthlyExpense({ year });
      setMonthlyData(res.data?.data ?? []);
    } catch {
      setError("加载数据失败");
      setMonthlyData([]);
    } finally {
      setLoading(false);
    }
  }, [year, isGuest]);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build 12-month array
  const data = useMemo(() => {
    if (isGuest) return guestData;
    const arr = new Array(12).fill(0);
    for (const entry of monthlyData) {
      const [, mo] = entry.month.split("-");
      const idx = parseInt(mo) - 1;
      if (idx >= 0 && idx < 12) arr[idx] = entry.amount;
    }
    return arr;
  }, [isGuest, guestData, monthlyData]);

  const maxVal = Math.max(...data, 1);
  const total = data.reduce((s, v) => s + v, 0);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
    const chart = chartInstance.current;
    chart.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(8,8,20,0.92)',
        borderColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        textStyle: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
        formatter: (params: any) => {
          const p = params[0];
          return '<span style="color:rgba(255,255,255,0.5)">'+p.name+'</span><br/><span style="color:#93c5fd">支出: ¥'+Number(p.value).toLocaleString()+'</span>';
        }
      },
      grid: { left: '8%', right: '5%', top: '6%', bottom: '14%' },
      xAxis: {
        type: 'category',
        data: MONTH_LABELS,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: 'rgba(255,255,255,0.18)', fontSize: 9, formatter: (v: number) => v >= 1000 ? (v/1000).toFixed(0)+'k' : ''+v },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [{
        type: 'line',
        smooth: true,
        data: data,
        symbol: 'circle',
        symbolSize: (v: number) => v > 0 ? 7 : 0,
        lineStyle: { color: '#60a5fa', width: 2.5 },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(96,165,250,0.25)' },
              { offset: 1, color: 'rgba(96,165,250,0.02)' },
            ]
          }
        },
        itemStyle: { color: '#93c5fd', borderColor: 'rgba(10,12,20,0.9)', borderWidth: 2 },
        animationDuration: 800,
        animationEasing: 'cubicOut',
      }],
    });
    chart.resize();
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); };
  }, [data]);

  return (
    <div className={`glass glass-hover noise rounded-[2rem] p-6 overflow-hidden animate-fade-in ${className}`}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs text-white/40 font-medium tracking-widest uppercase">Monthly Trend</p>
          <h4 className="text-lg font-semibold">月度支出趋势</h4>
        </div>
        <div className="flex items-center gap-2">
          {isGuest && (
            <span className="text-[9px] text-amber-400/50 flex items-center gap-1">
              <UserRound size={10} /> 示例
            </span>
          )}
          <div className="flex items-center gap-1">
            {years.map((y) => (
              <button key={y} onClick={() => setYear(y)}
                className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full transition-all duration-200"
                style={{ background: year === y ? "rgba(255,255,255,0.12)" : "transparent", color: year === y ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)" }}
              >{y}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[240px]">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-blue-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-[240px] gap-2">
          <AlertCircle size={24} className="text-rose-400/40" />
          <p className="text-xs text-rose-400/60">{error}</p>
        </div>
      ) : total === 0 && !isGuest ? (
        <div className="flex flex-col items-center justify-center h-[240px] gap-2">
          <TrendingUp size={24} className="text-white/10" />
          <p className="text-xs text-white/30">暂无数据</p>
          <p className="text-[10px] text-white/15">导入账单后可查看月度支出趋势</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={14} className="text-blue-400/60" />
            <span className="text-xs text-white/30">全年合计</span>
            <span className="text-lg font-bold text-white/80">¥{total.toLocaleString()}</span>
          </div>
          <div ref={chartRef} className="w-full h-[240px]"></div>
        </>
      )}
    </div>
  );
};
