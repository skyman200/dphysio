import { useMemo } from "react";
import { format, parseISO, isSameDay, startOfDay, addHours } from "date-fns";
import { ko } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useProfiles } from "@/hooks/useProfiles";
import { useEventUnreadStatus } from "@/hooks/useEventUnreadStatus";
import { getUserEventStyle, getEventTypeStyle } from "@/lib/colors";

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  created_by: string;
  type?: string;
}

interface DayViewProps {
  date: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
  onSlotClick: (date: Date, hour: number) => void;
  onDragCreate?: (date: Date, startHour: number, endHour: number) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0am to 11pm
const SLOT_HEIGHT = 60;

export function CalendarDayView({
  date,
  events,
  onEventClick,
  onSlotClick,
  onDragCreate
}: DayViewProps) {
  const { profiles } = useProfiles();
  const { hasUnreadMessages } = useEventUnreadStatus();

  // 로컬 시간대 기준으로 날짜 변환
  const getLocalDate = (dateString: string): Date => {
    return new Date(parseISO(dateString).getTime());
  };

  const dayEvents = useMemo(() => {
    return events.filter((e) => {
      const eventDate = startOfDay(getLocalDate(e.start_date));
      const calendarDay = startOfDay(date);
      return isSameDay(eventDate, calendarDay);
    });
  }, [events, date]);

  // 중앙화된 색상 함수 사용
  const getEventStyle = (event: Event) => {
    if (event.type === 'professor') {
      return getUserEventStyle(event.created_by);
    }
    const typeStyle = getEventTypeStyle(event.type || "");
    if (typeStyle) return typeStyle;
    return getUserEventStyle(event.created_by);
  };

  const getProfileName = (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.name || "?";
  };

  const getEventPosition = (event: Event) => {
    const start = getLocalDate(event.start_date);
    const end = event.end_date ? getLocalDate(event.end_date) : addHours(start, 1);

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;

    const top = startHour * SLOT_HEIGHT;
    const height = Math.max((endHour - startHour) * SLOT_HEIGHT, 30);

    return { top, height };
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex">
        {/* Time labels */}
        <div className="w-16 flex-shrink-0 border-r border-border/30">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="border-b border-border/20 text-xs text-muted-foreground pr-2 pt-1 text-right"
              style={{ height: SLOT_HEIGHT }}
            >
              {format(addHours(startOfDay(date), hour), "HH:mm")}
            </div>
          ))}
        </div>

        {/* Day column */}
        <div className="flex-1 relative">
          {/* Time slots */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="border-b border-border/20 hover:bg-muted/20 cursor-pointer transition-colors"
              style={{ height: SLOT_HEIGHT }}
              onClick={() => onSlotClick(date, hour)}
            />
          ))}

          {/* Events overlay */}
          <AnimatePresence>
            {dayEvents.map((event) => {
              const { top, height } = getEventPosition(event);
              const hasUnread = hasUnreadMessages(event.id);

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={cn(
                    "absolute left-2 right-2 rounded-lg p-2 text-white cursor-pointer shadow-lg hover:scale-[1.02] transition-transform",
                    getEventStyle(event),
                    event.type === 'professor' && "border-l-4 border-emerald-500/80 pl-3"
                  )}
                  style={{ top, height, minHeight: 30 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      {height > 40 && (
                        <>
                          <p className="text-xs opacity-80 truncate mt-0.5">
                            {format(parseISO(event.start_date), "HH:mm")}
                            {event.end_date && ` - ${format(parseISO(event.end_date), "HH:mm")}`}
                          </p>
                          {height > 60 && event.location && (
                            <p className="text-xs opacity-70 truncate mt-0.5">
                              📍 {event.location}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {hasUnread && (
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse flex-shrink-0" />
                    )}
                  </div>
                  {/* Creator badge */}
                  {height > 50 && (
                    <div className="absolute bottom-1.5 right-1.5">
                      <span className="text-[10px] bg-white/20 rounded-full px-1.5 py-0.5">
                        {getProfileName(event.created_by)}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Current time indicator */}
          {isSameDay(date, new Date()) && (
            <div
              className="absolute left-0 right-0 border-t-2 border-destructive z-10 pointer-events-none"
              style={{
                top: (new Date().getHours() + new Date().getMinutes() / 60) * SLOT_HEIGHT,
              }}
            >
              <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-destructive" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
