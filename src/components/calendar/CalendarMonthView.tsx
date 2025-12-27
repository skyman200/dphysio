import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO, eachWeekOfInterval, startOfDay, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { getUserEventStyle, getUserChipStyle, getEventTypeStyle } from "@/lib/colors";
import type { TransformedEvent, ProcessedEvent } from "@/types";

interface CalendarMonthViewProps {
    currentDate: Date;
    filteredEvents: TransformedEvent[];
    isDragging: boolean;
    isInDragRange: (day: Date) => boolean;
    onMouseDown: (day: Date) => void;
    onMouseEnter: (day: Date) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    onDayClick: (day: Date) => void;
    onEventClick: (event: TransformedEvent) => void;
    isSelectMode?: boolean;
    selectedEventIds?: string[];
    presentationMode?: 'detailed' | 'compact' | 'stack';
}

export function CalendarMonthView({
    currentDate,
    filteredEvents,
    isDragging,
    isInDragRange,
    onMouseDown,
    onMouseEnter,
    onMouseUp,
    onMouseLeave,
    onDayClick,
    onEventClick,
    isSelectMode = false,
    selectedEventIds = [],
    presentationMode = 'detailed',
}: CalendarMonthViewProps) {
    // Get weeks for month view
    const weeksInMonth = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
        return weeks.map((weekStart) => {
            const days: Date[] = [];
            for (let i = 0; i < 7; i++) {
                days.push(addDays(weekStart, i));
            }
            return days;
        });
    }, [currentDate]);

    // Helper to get processed events for a week
    const getProcessedEventsForWeek = (weekStart: Date): ProcessedEvent[] => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

        // 1. Filter events overlapping with this week
        const weekEvents = filteredEvents.filter(event => {
            const eventStart = parseISO(event.start_date);
            const eventEnd = event.end_date ? parseISO(event.end_date) : eventStart;
            return eventStart <= weekEnd && eventEnd >= weekStart;
        });

        // 2. Map to processed events with span info
        const processedEvents = weekEvents.map(event => {
            const eventStart = parseISO(event.start_date);
            const eventEnd = event.end_date ? parseISO(event.end_date) : eventStart;

            const startInWeek = eventStart < weekStart ? weekStart : eventStart;
            const endInWeek = eventEnd > weekEnd ? weekEnd : eventEnd;

            // Calculate span (add 1 because inclusive)
            const span = differenceInDays(startOfDay(endInWeek), startOfDay(startInWeek)) + 1;

            // Calculate start offset (0 to 6)
            const startOffset = differenceInDays(startOfDay(startInWeek), startOfDay(weekStart));

            // Calculate logic for single-day vs multi-day
            const isMultiDay = span > 1 || (event.end_date && differenceInDays(parseISO(event.end_date), eventStart) >= 1);

            return {
                ...event,
                span,
                startOffset,
                isContinuedBefore: eventStart < weekStart,
                isContinuedAfter: eventEnd > weekEnd,
                isMultiDay,
                originalStart: eventStart,
                originalEnd: eventEnd,
                rowIndex: 0,
            };
        });

        // 3. Sort events
        processedEvents.sort((a, b) => {
            if (a.isMultiDay !== b.isMultiDay) return a.isMultiDay ? -1 : 1;
            if (a.span !== b.span) return b.span - a.span;
            return a.title.localeCompare(b.title);
        });

        // 4. Assign Rows (Simple Packing Algorithm)
        const rows = new Array(7).fill(0);
        const eventsWithRow = processedEvents.map(event => {
            let rowIndex = 0;
            while (true) {
                let fits = true;
                for (let i = 0; i < event.span; i++) {
                    if (rows[event.startOffset + i] > rowIndex) {
                        fits = false;
                        break;
                    }
                }
                if (fits) break;
                rowIndex++;
            }

            for (let i = 0; i < event.span; i++) {
                rows[event.startOffset + i] = rowIndex + 1;
            }

            return { ...event, rowIndex };
        });

        return eventsWithRow;
    };

    const getMultiDayEventStyle = (event: TransformedEvent) => {
        // 1. Check for specific event type styling first (Department, Professor, etc.)
        const typeStyle = getEventTypeStyle(event.type);
        if (typeStyle) return typeStyle;

        // 2. Fallback to CalDAV specific logic
        if (event.source === "caldav" || event.type === "caldav") {
            return event.caldav_calendar_color
                ? `text-white`
                : "bg-[#FF6B6B] text-white";
        }

        // 3. Fallback to User color
        return getUserEventStyle(event.created_by);
    };

    const getMultiDayEventBgColor = (event: TransformedEvent) => {
        // If type style is used, we don't want to override bg color with undefined
        if (getEventTypeStyle(event.type)) return undefined;

        if ((event.source === "caldav" || event.type === "caldav") && event.caldav_calendar_color) {
            return event.caldav_calendar_color;
        }
        return undefined;
    };

    return (
        <div
            className="glass-card rounded-2xl overflow-hidden select-none"
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
        >
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-border/30">
                {["월", "화", "수", "목", "금", "토", "일"].map((day) => (
                    <div
                        key={day}
                        className="p-3 text-center text-sm font-medium text-muted-foreground"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Weeks with Unified Grid */}
            <div className="flex flex-col border-l border-border/20">
                {weeksInMonth.map((week, weekIdx) => {
                    const weekStart = week[0];
                    const weekEvents = getProcessedEventsForWeek(weekStart);

                    return (
                        <div key={weekIdx} className="flex-1 min-h-[140px] border-b border-border/20 relative group">
                            {/* Background Grid for Day Cells */}
                            <div className="absolute inset-0 grid grid-cols-7 z-0">
                                {week.map((day, dayIdx) => {
                                    const isCurrentMonth = isSameMonth(day, currentDate);
                                    const isCurrentDay = isSameDay(day, new Date());
                                    const isSelected = isInDragRange(day);

                                    return (
                                        <div
                                            key={dayIdx}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                onMouseDown(day);
                                            }}
                                            onMouseEnter={() => onMouseEnter(day)}
                                            onClick={() => {
                                                if (!isDragging) onDayClick(day);
                                            }}
                                            className={cn(
                                                "h-full border-r border-border/20 transition-colors p-1",
                                                !isCurrentMonth && "bg-muted/10 opacity-60",
                                                isCurrentDay && "bg-primary/5",
                                                isSelected && "bg-primary/20",
                                                !isSelected && !isCurrentDay && "hover:bg-muted/30"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ml-auto",
                                                    isCurrentDay && "bg-primary text-primary-foreground",
                                                    !isCurrentMonth && "text-muted-foreground/50",
                                                    !isCurrentDay && dayIdx === 6 && "text-destructive",
                                                    !isCurrentDay && dayIdx !== 6 && "text-foreground"
                                                )}
                                            >
                                                {format(day, "d")}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Events Layer */}
                            <div className="relative z-10 grid grid-cols-7 gap-y-1 px-1 pointer-events-none"
                                style={{
                                    minHeight: presentationMode === 'compact' ? '40px' : '80px',
                                    marginTop: presentationMode === 'compact' ? '0px' : '28px'
                                }}
                            >
                                {presentationMode === 'compact' ? (
                                    // Compact View: Render dots at the bottom of the cell
                                    week.map((day, dayIdx) => {
                                        const dayEvents = weekEvents.filter(e => {
                                            const start = new Date(e.start_date);
                                            const end = e.end_date ? new Date(e.end_date) : start;
                                            return start <= day && end >= day && isSameDay(day, start); // Only dot on start day? Or every day? User said "color dot". Usually every day event exists.
                                            // Actually user said "일정에 색깔 dot를 찍게 해주고".
                                            // Should be dot for each event on that day.
                                        });

                                        // Filter events that actually span this day
                                        const eventsOnDay = weekEvents.filter(e => {
                                            const start = startOfDay(new Date(e.start_date));
                                            const end = e.end_date ? startOfDay(new Date(e.end_date)) : start;
                                            const current = startOfDay(day);
                                            return current >= start && current <= end;
                                        });

                                        if (eventsOnDay.length === 0) return null;

                                        return (
                                            <div key={dayIdx} className="col-start-[auto] row-start-1 flex justify-center items-end h-full pb-1 gap-0.5" style={{ gridColumnStart: dayIdx + 1 }}>
                                                {eventsOnDay.slice(0, 5).map(event => (
                                                    <div
                                                        key={`${event.id}-${dayIdx}`}
                                                        className={cn(
                                                            "w-1.5 h-1.5 rounded-full",
                                                            getMultiDayEventStyle(event)?.replace('bg-', 'bg-') || "bg-primary" // Ensure bg color
                                                        )}
                                                    />
                                                ))}
                                                {eventsOnDay.length > 5 && <span className="text-[8px] text-muted-foreground">+</span>}
                                            </div>
                                        );
                                    })
                                ) : (
                                    // Detailed & Stack View
                                    weekEvents.map((event) => {
                                        // For stack view, show more events by reducing height and hiding title
                                        const isStack = presentationMode === 'stack';
                                        if (!isStack && event.rowIndex > 4) return null; // Detailed limit
                                        if (isStack && event.rowIndex > 10) return null; // Stack limit (higher)

                                        const isSelected = selectedEventIds.includes(event.id);
                                        const barStyle = getMultiDayEventStyle(event);
                                        const bgColor = getMultiDayEventBgColor(event);
                                        const isSingleDay = !event.isMultiDay;

                                        const stackStyle = isStack
                                            ? "h-1.5 mb-0.5 hover:h-4 transition-all"
                                            : "text-xs px-2 py-0.5 mb-0.5";

                                        const finalStyle = isSingleDay
                                            ? cn(
                                                "truncate cursor-pointer hover:scale-105 transition-all font-medium pointer-events-auto rounded text-foreground bg-transparent",
                                                !isStack && "border-l-2 px-1 py-0.5",
                                                isStack && "h-1.5 w-1.5 rounded-full mx-auto mb-0.5", // Stack single day -> dot? Or bar?
                                                // User said "스택처럼 그 날짜에 색깔을 달리해서 쌓이게"
                                                // Let's make single day also a bar in stack mode for consistency? Or dot.
                                                // If stack mode, single day events should ideally stack too.
                                                // Let's use bar for all in stack mode.
                                                isStack && "w-full h-1.5 mb-0.5 rounded-sm",
                                                getUserChipStyle(event.created_by),
                                                isSelectMode && isSelected && "ring-2 ring-primary ring-offset-1 bg-primary/10",
                                                isStack && (barStyle || "bg-primary") // Force bg in stack
                                            )
                                            : cn(
                                                "truncate cursor-pointer hover:brightness-110 transition-all shadow-sm font-medium pointer-events-auto rounded-md text-white",
                                                event.isContinuedBefore && "rounded-l-none mx-0 border-l border-white/20",
                                                event.isContinuedAfter && "rounded-r-none mx-0 border-r border-white/20",
                                                stackStyle,
                                                barStyle,
                                                isSelectMode && isSelected && "ring-2 ring-primary ring-offset-1"
                                            );

                                        return (
                                            <div
                                                key={`${event.id}-${weekIdx}-${event.rowIndex}`}
                                                className={finalStyle}
                                                style={{
                                                    gridColumnStart: event.startOffset + 1,
                                                    gridColumnEnd: `span ${event.span}`,
                                                    gridRowStart: event.rowIndex + 1,
                                                    backgroundColor: (!isSingleDay || isStack) ? bgColor : undefined,
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEventClick(event);
                                                }}
                                                title={event.title}
                                            >
                                                {!isStack && (
                                                    <span className={cn("truncate flex items-center gap-1", !isSingleDay && "justify-center w-full")}>
                                                        {isSelectMode && (
                                                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}>
                                                                {isSelected && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                            </div>
                                                        )}
                                                        {(event.source === 'caldav' || event.type === 'caldav') && <span className="text-[10px]">🍎</span>}
                                                        {event.title}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
