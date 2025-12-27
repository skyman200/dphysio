import { useMemo, useState, useRef } from "react";
import { format, parseISO, isSameDay, startOfWeek, addDays, startOfDay, addHours } from "date-fns";
import { ko } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useProfiles } from "@/hooks/useProfiles";
import { useEventUnreadStatus } from "@/hooks/useEventUnreadStatus";
import { getUserEventStyle, getEventTypeStyle } from "@/lib/colors";
import { DAY_INDEX } from "@/constants/calendar";

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  created_by: string;
  source?: "local" | "caldav";
  caldav_calendar_color?: string;
  type?: string;
}

interface WeekViewProps {
  date: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
  onSlotClick: (date: Date, hour: number) => void;
  onDragCreate?: (date: Date, startHour: number, endHour: number) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0am to 11pm
const SLOT_HEIGHT = 48;

// CalDAV event default color
const CALDAV_DEFAULT_COLOR = "#FF6B6B";

export function CalendarWeekView({
  date,
  events,
  onEventClick,
  onSlotClick,
  onDragCreate
}: WeekViewProps) {
  const { profiles } = useProfiles();
  const { hasUnreadMessages } = useEventUnreadStatus();
  const [dragState, setDragState] = useState<{
    dayIndex: number;
    startHour: number;
    endHour: number;
  } | null>(null);
  const isDragging = useRef(false);

  const weekStart = useMemo(() => startOfWeek(date, { weekStartsOn: 1 }), [date]);
  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const getProfileColor = (userId: string) => {
    return getUserEventStyle(userId);
  };

  const getEventColorStyle = (event: Event) => {
    // 0. Special case for Professor events: Use User Color
    if (event.type === 'professor') {
      return {
        backgroundColor: undefined,
        className: getProfileColor(event.created_by)
      };
    }

    // 1. Check for specific event type styling first
    const typeStyle = getEventTypeStyle(event.type || "");
    if (typeStyle) {
      return {
        backgroundColor: undefined,
        className: typeStyle
      };
    }

    // 2. CalDAV events use their calendar color or a distinct default
    if (event.source === "caldav") {
      return {
        backgroundColor: event.caldav_calendar_color || CALDAV_DEFAULT_COLOR,
        className: "",
      };
    }

    // 3. Fallback to User color
    return {
      backgroundColor: undefined,
      className: getProfileColor(event.created_by),
    };
  };

  // 로컬 시간대 기준으로 날짜 변환
  const getLocalDate = (dateString: string): Date => {
    return new Date(parseISO(dateString).getTime());
  };

  const getEventsForDay = (day: Date) => {
    return events.filter((e) => {
      const eventDate = startOfDay(getLocalDate(e.start_date));
      const calendarDay = startOfDay(day);
      return isSameDay(eventDate, calendarDay);
    });
  };

  const getEventPosition = (event: Event) => {
    const start = getLocalDate(event.start_date);
    const end = event.end_date ? getLocalDate(event.end_date) : addHours(start, 1);

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;

    const top = startHour * SLOT_HEIGHT;
    const height = Math.max((endHour - startHour) * SLOT_HEIGHT, 24);

    return { top, height };
  };

  const handleMouseDown = (dayIndex: number, hour: number) => {
    isDragging.current = true;
    setDragState({ dayIndex, startHour: hour, endHour: hour + 1 });
  };

  const handleMouseMove = (hour: number) => {
    if (!isDragging.current || !dragState) return;
    setDragState((prev) => prev ? { ...prev, endHour: Math.max(hour + 1, prev.startHour + 1) } : null);
  };

  const handleMouseUp = () => {
    if (dragState && onDragCreate) {
      const day = weekDays[dragState.dayIndex];
      onDragCreate(day, dragState.startHour, dragState.endHour);
    }
    isDragging.current = false;
    setDragState(null);
  };

  return (
    <div className="flex-1 overflow-auto" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="flex min-w-[800px]">
        {/* Time labels */}
        <div className="w-14 flex-shrink-0 border-r border-border/30">
          <div className="h-12 border-b border-border/30" />
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="border-b border-border/20 text-[11px] text-muted-foreground pr-2 pt-1 text-right"
              style={{ height: SLOT_HEIGHT }}
            >
              {format(addHours(startOfDay(date), hour), "HH:mm")}
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex-1 flex">
          {weekDays.map((day, dayIndex) => {
            const dayEvents = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isSunday = day.getDay() === DAY_INDEX.SUNDAY;
            const isSaturday = day.getDay() === DAY_INDEX.SATURDAY;

            return (
              <div
                key={dayIndex}
                className={cn(
                  "flex-1 border-r border-border/20 last:border-r-0 min-w-[100px]",
                  (isSunday || isSaturday) && "bg-muted/10"
                )}
              >
                {/* Day header */}
                <div
                  className={cn(
                    "h-12 border-b border-border/30 flex flex-col items-center justify-center sticky top-0 bg-background/95 backdrop-blur z-10",
                    isToday && "bg-primary/10"
                  )}
                >
                  <span className={cn(
                    "text-xs font-medium",
                    isSunday && "text-destructive",
                    isSaturday && "text-primary"
                  )}>
                    {format(day, "EEE", { locale: ko })}
                  </span>
                  <span className={cn(
                    "text-lg font-bold",
                    isToday && "w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                  )}>
                    {format(day, "d")}
                  </span>
                </div>

                {/* Time slots */}
                <div className="relative">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className={cn(
                        "border-b border-border/10 cursor-pointer transition-colors",
                        dragState?.dayIndex === dayIndex &&
                        hour >= dragState.startHour &&
                        hour < dragState.endHour && "bg-primary/20"
                      )}
                      style={{ height: SLOT_HEIGHT }}
                      onMouseDown={() => handleMouseDown(dayIndex, hour)}
                      onMouseMove={() => handleMouseMove(hour)}
                      onClick={() => !isDragging.current && onSlotClick(day, hour)}
                    />
                  ))}

                  {/* Events overlay */}
                  <AnimatePresence>
                    {dayEvents.map((event) => {
                      const { top, height } = getEventPosition(event);
                      const hasUnread = hasUnreadMessages(event.id);
                      const colorStyle = getEventColorStyle(event);
                      const isCalDAV = event.source === "caldav";

                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={cn(
                            "absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-white cursor-pointer shadow-md hover:shadow-lg transition-shadow overflow-hidden",
                            colorStyle.className,
                            event.type === 'professor' && "border-l-[3px] border-emerald-500/80 pl-2"
                          )}
                          style={{
                            top,
                            height,
                            minHeight: 24,
                            backgroundColor: colorStyle.backgroundColor,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                        >
                          <div className="flex items-start gap-1">
                            {isCalDAV && <span className="text-[10px]">🍎</span>}
                            <p className="font-medium text-[11px] leading-tight truncate flex-1">
                              {event.title}
                            </p>
                            {hasUnread && (
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse flex-shrink-0 mt-0.5" />
                            )}
                          </div>
                          {height > 30 && (
                            <p className="text-[10px] opacity-80 truncate">
                              {format(parseISO(event.start_date), "HH:mm")}
                            </p>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Current time indicator */}
                  {isToday && (
                    <div
                      className="absolute left-0 right-0 border-t-2 border-destructive z-10 pointer-events-none"
                      style={{
                        top: (new Date().getHours() + new Date().getMinutes() / 60) * SLOT_HEIGHT,
                      }}
                    >
                      <div className="absolute -left-0.5 -top-1 w-2 h-2 rounded-full bg-destructive" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
