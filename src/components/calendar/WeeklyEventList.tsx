import { format, isSameDay, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { TransformedEvent } from "@/types";
import { cn } from "@/lib/utils";
import { getEventTypeStyle, getUserEventStyle } from "@/lib/colors";

interface WeeklyEventListProps {
    currentDate: Date;
    events: TransformedEvent[];
    onEventClick: (event: TransformedEvent) => void;
}

export function WeeklyEventList({ currentDate, events, onEventClick }: WeeklyEventListProps) {
    // 1. Determine Week Range based on currentDate
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

    // 2. Filter events within this week
    const weekEvents = events.filter(e => {
        const start = new Date(e.start_date);
        // End date fallback
        const end = e.end_date ? new Date(e.end_date) : start;

        // Check overlap
        return start <= weekEnd && end >= weekStart;
    });

    // 3. Separate into Past (Done) and Future (Upcoming)
    const now = new Date();

    // Sort by start date
    weekEvents.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    const doneEvents = weekEvents.filter(e => {
        const end = e.end_date ? new Date(e.end_date) : new Date(e.start_date);
        return end < now;
    });

    const upcomingEvents = weekEvents.filter(e => {
        const end = e.end_date ? new Date(e.end_date) : new Date(e.start_date);
        return end >= now;
    });

    if (weekEvents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>이번 주는 일정이 없네요 🍃</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 px-4 pb-12">
            {/* 완료된 일정 */}
            {doneEvents.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wider ml-1">완료됨</h3>
                    <div className="space-y-2">
                        {doneEvents.map(event => (
                            <EventListItem
                                key={event.id}
                                event={event}
                                onClick={onEventClick}
                                isDone
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 예정된 일정 */}
            <div className="space-y-3">
                {upcomingEvents.length > 0 && (
                    <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider ml-1">예정됨</h3>
                )}
                {upcomingEvents.length > 0 ? (
                    <div className="space-y-2">
                        {upcomingEvents.map(event => (
                            <EventListItem
                                key={event.id}
                                event={event}
                                onClick={onEventClick}
                            />
                        ))}
                    </div>
                ) : (
                    null // If no upcoming events but there are done events, just show nothing here.
                )}
            </div>
        </div>
    );
}

function EventListItem({ event, onClick, isDone }: { event: TransformedEvent; onClick: (e: TransformedEvent) => void; isDone?: boolean }) {
    const startDate = new Date(event.start_date);
    const endDate = event.end_date ? new Date(event.end_date) : startDate;
    const isMultiDay = !isSameDay(startDate, endDate);

    // Style logic
    const typeStyle = getEventTypeStyle(event.type);
    const userStyle = getUserEventStyle(event.created_by);
    // Extract bg color class or value nicely? 
    // Usually these helpers return tailwind classes.
    // Let's rely on the color indicator dot.

    return (
        <div
            onClick={() => onClick(event)}
            className={cn(
                "group flex items-center bg-white/50 hover:bg-white border border-border/40 rounded-xl p-3 transition-all cursor-pointer shadow-sm hover:shadow-md",
                isDone && "opacity-60 bg-gray-50/50 grayscale-[0.5]"
            )}
        >
            {/* Date Column */}
            <div className="flex flex-col items-center justify-center w-14 border-r border-border/30 pr-3 mr-3 flex-shrink-0">
                <span className="text-xs text-muted-foreground font-medium uppercase">
                    {format(startDate, "EEE", { locale: ko })}
                </span>
                <span className={cn(
                    "text-xl font-bold",
                    isSameDay(startDate, new Date()) ? "text-primary" : "text-foreground"
                )}>
                    {format(startDate, "d")}
                </span>
            </div>

            {/* Event Details */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    {/* Color Dot */}
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", typeStyle?.replace('bg-', 'bg-') || userStyle?.replace('bg-', 'bg-') || 'bg-primary')} />
                    <h4 className={cn("font-medium truncate text-sm", isDone && "line-through decoration-muted-foreground/50")}>
                        {event.title}
                    </h4>
                </div>
                <div className="flex items-center text-xs text-muted-foreground gap-2">
                    <span>
                        {format(startDate, "a h:mm", { locale: ko })}
                        {isMultiDay ? ` - ${format(endDate, "M.d a h:mm", { locale: ko })}` : ` - ${format(endDate, "a h:mm", { locale: ko })}`}
                    </span>
                    {event.location && (
                        <>
                            <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
                            <span className="truncate max-w-[150px]">{event.location}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Arrow or Action */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity pl-2 text-muted-foreground">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </div>
    );
}
