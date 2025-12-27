import { useMemo } from "react";
import { format, parseISO, isSameDay, differenceInDays, startOfDay, endOfDay, isWithinInterval, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  type?: string;
  priority?: string;
  created_by: string;
  source?: "local" | "caldav";
  caldav_calendar_color?: string;
}

interface MultiDayEventBarProps {
  events: Event[];
  weekDays: Date[];
  onEventClick?: (event: Event) => void;
  getEventStyle?: (event: Event) => string;
  getEventBgColor?: (event: Event) => string | undefined;
}

// 로컬 시간대 기준으로 날짜 변환
const getLocalDate = (dateString: string): Date => {
  return new Date(parseISO(dateString).getTime());
};

export function MultiDayEventBar({ events, weekDays, onEventClick, getEventStyle, getEventBgColor }: MultiDayEventBarProps) {
  // Filter multi-day events and calculate their positions
  const multiDayEvents = useMemo(() => {
    return events
      .filter((event) => {
        if (!event.end_date) return false;
        const start = startOfDay(getLocalDate(event.start_date));
        const end = startOfDay(getLocalDate(event.end_date));
        return differenceInDays(end, start) >= 1;
      })
      .map((event) => {
        const eventStart = startOfDay(getLocalDate(event.start_date));
        const eventEnd = startOfDay(getLocalDate(event.end_date!));

        // Find the start and end positions within the week
        let startIdx = -1;
        let endIdx = -1;

        weekDays.forEach((day, idx) => {
          const dayStart = startOfDay(day);
          if (isSameDay(dayStart, eventStart) || (startIdx === -1 && dayStart > eventStart && dayStart <= eventEnd)) {
            startIdx = idx;
          }
          if (isSameDay(dayStart, eventEnd) || (dayStart < eventEnd && (idx === weekDays.length - 1 || startOfDay(weekDays[idx + 1]) > eventEnd))) {
            endIdx = idx;
          }
        });

        // If event spans before the week starts
        if (startIdx === -1 && eventStart < startOfDay(weekDays[0]) && eventEnd >= startOfDay(weekDays[0])) {
          startIdx = 0;
        }

        // If event extends beyond the week
        if (endIdx === -1 && eventEnd > startOfDay(weekDays[weekDays.length - 1])) {
          endIdx = weekDays.length - 1;
        }

        // Check if event is visible in this week
        const isVisible = startIdx !== -1 && endIdx !== -1 && startIdx <= endIdx;

        return {
          ...event,
          startIdx,
          endIdx,
          span: isVisible ? endIdx - startIdx + 1 : 0,
          isVisible,
          continuesFromPrev: eventStart < startOfDay(weekDays[0]),
          continuestoNext: eventEnd > startOfDay(weekDays[weekDays.length - 1]),
        };
      })
      .filter((event) => event.isVisible);
  }, [events, weekDays]);

  if (multiDayEvents.length === 0) return null;

  const defaultGetEventStyle = (event: Event) => {
    if (event.source === "caldav" || event.type === "caldav") {
      return event.caldav_calendar_color
        ? "text-white"
        : "bg-[#FF6B6B] text-white";
    }
    if (event.type === "department") return "bg-professor-gold text-white";
    if (event.type === "professor") return "bg-professor-sage text-white";
    if (event.type === "external") return "bg-professor-mauve text-white";
    return "bg-primary text-primary-foreground";
  };

  const defaultGetEventBgColor = (event: Event) => {
    if ((event.source === "caldav" || event.type === "caldav") && event.caldav_calendar_color) {
      return event.caldav_calendar_color;
    }
    return undefined;
  };

  const styleGetter = getEventStyle || defaultGetEventStyle;
  const bgColorGetter = getEventBgColor || defaultGetEventBgColor;

  return (
    <div className="relative">
      {multiDayEvents.map((event, rowIdx) => (
        <div
          key={event.id}
          className="grid grid-cols-7 mb-1"
          style={{ marginTop: rowIdx === 0 ? 0 : 2 }}
        >
          {weekDays.map((_, idx) => {
            if (idx === event.startIdx) {
              return (
                <div
                  key={idx}
                  className="relative"
                  style={{
                    gridColumn: `span ${event.span}`,
                    gridColumnStart: idx + 1,
                  }}
                >
                  <div
                    onClick={() => onEventClick?.(event)}
                    className={cn(
                      "absolute inset-x-0 px-2 py-1 text-xs font-medium truncate cursor-pointer",
                      "flex items-center", // Added flex for alignment
                      "transition-all hover:scale-[1.02] hover:shadow-md",
                      "rounded-md shadow-sm",
                      event.continuesFromPrev && "rounded-l-none",
                      event.continuestoNext && "rounded-r-none",
                      styleGetter(event)
                    )}
                    style={{
                      left: event.continuesFromPrev ? 0 : 4,
                      right: event.continuestoNext ? 0 : 4,
                      backgroundColor: bgColorGetter(event),
                    }}
                    title={`${event.source === "caldav" ? "🍎 " : ""}${event.title} (${format(parseISO(event.start_date), "M/d")} - ${format(parseISO(event.end_date!), "M/d")})`}
                  >
                    {event.source === "caldav" && <span className="mr-1">🍎</span>}
                    {event.title}
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      ))}
    </div>
  );
}

// Helper to check if an event is a multi-day event
export function isMultiDayEvent(event: { start_date: string; end_date: string | null }): boolean {
  if (!event.end_date) return false;
  const start = startOfDay(getLocalDate(event.start_date));
  const end = startOfDay(getLocalDate(event.end_date));
  return differenceInDays(end, start) >= 1;
}

// Get single-day events only
export function getSingleDayEvents<T extends { start_date: string; end_date: string | null }>(events: T[]): T[] {
  return events.filter((event) => !isMultiDayEvent(event));
}
