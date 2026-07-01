import { WeeklyCalendar } from "@/components/dashboard/WeeklyCalendar";
import { WeatherCard } from "@/components/dashboard/WeatherCard";
import { TodoCard } from "@/components/dashboard/TodoCard";
import { WeiboHotSearch } from "@/components/dashboard/WeiboHotSearch";

export const RightCard = () => (
  <div className="flex flex-col gap-5 animate-fade-in" style={{ animationDelay: "0.4s" }}>
    {/* Weekly Calendar */}
    <WeeklyCalendar />

    {/* Weather */}
    <WeatherCard />

    {/* Todo */}
    <TodoCard />

    {/* Weibo Hot Search */}
    <WeiboHotSearch />
  </div>
);
