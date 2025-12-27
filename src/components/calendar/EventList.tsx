import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { TransformedEvent } from "@/types";
import { cn } from "@/lib/utils";
import { Clock, MapPin } from "lucide-react";

interface EventListProps {
    date: Date;
    events: TransformedEvent[];
    onEventClick: (event: TransformedEvent) => void;
}

export function EventList({ date, events, onEventClick }: EventListProps) {
    // Sort events by time
    const sortedEvents = [...events].sort((a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-semibold text-foreground">
                    {format(date, "M월 d일 EEEE", { locale: ko })}
                </h3>
                <span className="text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                    {sortedEvents.length}개의 일정
                </span>
            </div>

            <div className="space-y-2">
                {sortedEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground/60 bg-white/30 rounded-2xl glass-card backdrop-blur-sm border-0">
                        <p>일정이 없습니다</p>
                    </div>
                ) : (
                    sortedEvents.map((event) => (
                        <div
                            key={event.id}
                            onClick={() => onEventClick(event)}
                            className="group relative flex items-center gap-4 bg-white/60 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/30 backdrop-blur-md p-4 rounded-xl border border-white/40 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:translate-x-1"
                        >
                            {/* Color Stripe */}
                            <div
                                className={cn("w-1.5 h-10 rounded-full flex-shrink-0",
                                    event.type === 'caldav' ? 'bg-[#FF6B6B]' :
                                        event.type === 'department' ? 'bg-professor-gold' :
                                            'bg-primary'
                                )}
                                style={event.type === 'caldav' && event.caldav_calendar_color ? { backgroundColor: event.caldav_calendar_color } : {}}
                            />

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-base font-medium text-foreground truncate">{event.title}</h4>
                                    {/* Time */}
                                    <div className="flex items-center text-xs font-semibold text-muted-foreground/80 bg-muted/30 px-2 py-0.5 rounded-md flex-shrink-0 ml-2">
                                        {event.start_date.includes("T") ? (
                                            format(new Date(event.start_date), "a h:mm", { locale: ko })
                                        ) : "하루 종일"}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    {/* Location or Description snippet */}
                                    {event.location && (
                                        <div className="flex items-center gap-1 truncate">
                                            <MapPin className="h-3 w-3" />
                                            {event.location}
                                        </div>
                                    )}
                                    {!event.location && event.description && (
                                        <div className="truncate max-w-[200px]">
                                            {event.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
