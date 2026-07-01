import { Calendar } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface WeekDay {
  day: number;
  month: number;
  label: string;
  isToday: boolean;
  hasEvent: boolean;
  eventLabel?: string;
}

function getWeekDates(): WeekDay[] {
  const today = new Date();
  const currentDay = today.getDay(); // 0=Sun, 1=Mon...
  // Get Monday of current week
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  // Sample events for demo
  const events: Record<number, string> = {
    [today.getDate() - 1]: "Design Review",
    [today.getDate()]: "Sprint Planning",
    [today.getDate() + 2]: "Client Call",
  };

  return DAYS.map((label, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dayNum = date.getDate();
    const monthNum = date.getMonth();
    const isToday =
      dayNum === today.getDate() && monthNum === today.getMonth();
    return {
      day: dayNum,
      month: monthNum,
      label,
      isToday,
      hasEvent: events[dayNum] !== undefined,
      eventLabel: events[dayNum],
    };
  });
}

function getMonthYear(): string {
  const today = new Date();
  return today.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export const WeeklyCalendar = () => {
  const week = getWeekDates();
  const monthYear = getMonthYear();

  return (
    <div className="glass glass-hover noise rounded-3xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[50%]
bg-gradient-to-br from-neon-purple to-neon-cyan grid place-items-center shadow-lg">
            <Calendar size={14} />
          </div>
          <div>
            <p className="text-xs text-white/40 font-medium tracking-widest uppercase">
              Calendar
            </p>
            <h4 className="text-sm font-semibold">This Week</h4>
          </div>
        </div>
        <span className="text-xs text-white/50 font-medium">{monthYear}</span>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {week.map((d) => (
          <div
            key={d.label}
            className={`relative flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-300 cursor-pointer group ${
              d.isToday
                ? "bg-gradient-to-b from-neon-purple/40 to-neon-cyan/20 shadow-[0_0_20px_-5px_hsl(var(--neon-purple)/0.5)]"
                : "hover:bg-white/5"
            }`}
          >
            {/* Day label */}
            <span
              className={`text-[10px] font-semibold tracking-wider uppercase ${
                d.isToday ? "text-white/90" : "text-white/40"
              }`}
            >
              {d.label}
            </span>

            {/* Date number */}
            <span
              className={`text-lg font-bold leading-none ${
                d.isToday
                  ? "text-white"
                  : "text-white/70 group-hover:text-white"
              }`}
            >
              {d.day}
            </span>

            {/* Event dot */}
            <div className="h-1 flex items-center gap-[2px]">
              {d.hasEvent ? (
                <>
                  <span
                    className={`w-1 h-1 rounded-full ${
                      d.isToday
                        ? "bg-neon-cyan shadow-[0_0_6px_hsl(var(--neon-cyan))]"
                        : "bg-neon-purple/60"
                    }`}
                  />
                  <span
                    className={`w-1 h-1 rounded-full ${
                      d.isToday
                        ? "bg-neon-cyan/60"
                        : "bg-neon-purple/30"
                    }`}
                  />
                </>
              ) : (
                <span className="w-1 h-1 rounded-full bg-white/10" />
              )}
            </div>

            {/* Today indicator ring */}
            {d.isToday && (
              <span className="absolute inset-0 rounded-2xl border border-neon-purple/30" />
            )}

            {/* Hover tooltip for events */}
            {d.hasEvent && d.eventLabel && (
              <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg glass text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {d.eventLabel}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Upcoming events */}
      <div className="mt-5 pt-4 border-t border-white/5">
        <div className="space-y-2">
          {week
            .filter((d) => d.hasEvent && d.eventLabel)
            .slice(0, 2)
            .map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2 rounded-xl
hover:bg-white/5 transition-colors group"
              >
                <div
                  className={`w-8 h-8 rounded-lg grid place-items-center text-xs font-bold shrink-0 ${
                    d.isToday
                      ? "bg-gradient-to-br from-neon-purple to-neon-cyan text-white"
                      : "bg-white/5 text-white/50"
                  }`}
                >
                  {d.day}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-medium truncate ${
                      d.isToday ? "text-white" : "text-white/70"
                    }`}
                  >
                    {d.eventLabel}
                  </p>
                  <p className="text-[10px] text-white/30">
                    {d.label} ·{" "}
                    {i === 0 ? "10:00 AM" : "2:30 PM"}
                  </p>
                </div>
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    d.isToday
                      ? "bg-neon-cyan animate-pulse"
                      : "bg-neon-purple/40"
                  }`}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
