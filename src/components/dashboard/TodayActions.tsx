import { useMemo } from "react";
import { format, parseISO, isToday, differenceInMinutes } from "date-fns";
import { ko } from "date-fns/locale";
import { motion } from "framer-motion";
import { Clock, Star, User, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  type: string;
  category: string;
  priority: string;
  location: string | null;
  created_by: string;
}

interface TodayActionsProps {
  events: Event[];
  currentUserId: string | undefined;
  onEventClick?: (event: Event) => void;
}

export function TodayActions({ events, currentUserId, onEventClick }: TodayActionsProps) {
  const now = new Date();

  const todayEvents = useMemo(() => {
    return events
      .filter((event) => isToday(parseISO(event.start_date)))
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [events]);

  const departmentEvents = todayEvents.filter((e) => e.type === "department");
  const myEvents = todayEvents.filter((e) => e.created_by === currentUserId);
  const upcomingEvents = todayEvents.filter((e) => {
    const eventTime = parseISO(e.start_date);
    const minutesUntil = differenceInMinutes(eventTime, now);
    return minutesUntil > 0 && minutesUntil <= 30;
  });

  const renderEventItem = (event: Event, showTime = true) => (
    <motion.div
      key={event.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => onEventClick?.(event)}
      className={cn(
        "p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02]",
        "bg-gradient-to-r from-card/80 to-card/40 border border-border/30",
        event.priority === "important" && "border-l-4 border-l-professor-gold"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {event.title}
          </div>
          {showTime && (
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(parseISO(event.start_date), "a h:mm", { locale: ko })}
              {event.location && (
                <span className="ml-2 truncate">• {event.location}</span>
              )}
            </div>
          )}
        </div>
        {event.priority === "important" && (
          <Star className="h-4 w-4 text-professor-gold flex-shrink-0" />
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="glass-card rounded-2xl p-5 h-full">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        오늘의 액션
      </h3>

      <div className="space-y-5">
        {/* Upcoming in 30 minutes */}
        {upcomingEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-professor-terracotta" />
              <span className="text-xs font-medium text-professor-terracotta">
                30분 내 시작
              </span>
            </div>
            <div className="space-y-2">
              {upcomingEvents.map((event) => renderEventItem(event))}
            </div>
          </div>
        )}

        {/* Department Events */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-professor-gold" />
            <span className="text-xs font-medium text-muted-foreground">
              학과 일정 ({departmentEvents.length})
            </span>
          </div>
          {departmentEvents.length > 0 ? (
            <div className="space-y-2">
              {departmentEvents.slice(0, 3).map((event) => renderEventItem(event))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60 py-2">
              오늘 학과 일정이 없습니다
            </p>
          )}
        </div>

        {/* My Events */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-professor-sage" />
            <span className="text-xs font-medium text-muted-foreground">
              내 일정 ({myEvents.length})
            </span>
          </div>
          {myEvents.length > 0 ? (
            <div className="space-y-2">
              {myEvents.slice(0, 3).map((event) => renderEventItem(event))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60 py-2">
              오늘 내 일정이 없습니다
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
