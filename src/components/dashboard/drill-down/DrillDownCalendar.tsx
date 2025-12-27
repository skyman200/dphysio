import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DashboardEvent } from '@/hooks/useDashboardData';

interface DrillDownCalendarProps {
    events: DashboardEvent[];
    urgentFilter?: boolean;
}

type CalendarViewMode = 'MONTH' | 'WEEK' | 'DAY';

export function DrillDownCalendar({ events, urgentFilter }: DrillDownCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [expandedDate, setExpandedDate] = useState<Date | null>(null);
    const [viewMode, setViewMode] = useState<CalendarViewMode>('MONTH');

    // Calendar Grid Generation
    const calendarDays = useMemo(() => {
        let start, end;

        if (viewMode === 'MONTH') {
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);
            start = startOfWeek(monthStart, { weekStartsOn: 1 });
            end = endOfWeek(monthEnd, { weekStartsOn: 1 });
        } else if (viewMode === 'WEEK') {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
        } else { // DAY
            start = currentDate;
            end = currentDate;
        }

        // Guard against infinite loop
        if (start > end) return [start];

        return eachDayOfInterval({ start, end });
    }, [currentDate, viewMode]);

    // Group events by date
    const eventsByDate = useMemo(() => {
        const map = new Map<string, DashboardEvent[]>();
        events.forEach(event => {
            const dateKey = format(event.originalDate, 'yyyy-MM-dd');
            if (!map.has(dateKey)) map.set(dateKey, []);
            map.get(dateKey)?.push(event);
        });
        return map;
    }, [events]);

    const handleDayClick = (day: Date) => {
        // In Month view, click expands.
        if (viewMode === 'MONTH') {
            if (expandedDate && isSameDay(day, expandedDate)) {
                setExpandedDate(null);
            } else {
                setExpandedDate(day);
            }
        }
    };

    const navigate = (direction: 'PREV' | 'NEXT') => {
        if (viewMode === 'MONTH') {
            setCurrentDate(prev => direction === 'PREV' ? subMonths(prev, 1) : addMonths(prev, 1));
        } else if (viewMode === 'WEEK') {
            setCurrentDate(prev => direction === 'PREV' ? subWeeks(prev, 1) : addWeeks(prev, 1));
        } else {
            setCurrentDate(prev => direction === 'PREV' ? subDays(prev, 1) : addDays(prev, 1));
        }
    };

    return (
        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 h-full border border-border/40 flex flex-col relative overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-xl font-bold text-foreground min-w-[140px]">
                    {viewMode === 'MONTH' && format(currentDate, "yyyy년 M월", { locale: ko })}
                    {viewMode === 'WEEK' && format(currentDate, "M월 W주차", { locale: ko })}
                    {viewMode === 'DAY' && format(currentDate, "M월 d일", { locale: ko })}
                </h2>

                <div className="flex items-center gap-2">
                    {/* View Modes */}
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                        {(['MONTH', 'WEEK', 'DAY'] as CalendarViewMode[]).map(mode => (
                            <button
                                key={mode}
                                onClick={() => {
                                    setExpandedDate(null);
                                    setViewMode(mode);
                                }}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                    viewMode === mode ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {mode === 'MONTH' ? '월' : mode === 'WEEK' ? '주' : '일'}
                            </button>
                        ))}
                    </div>

                    {/* Navigation */}
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                        <Button variant="ghost" size="icon" onClick={() => navigate('PREV')} className="h-7 w-7 rounded-sm">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate('NEXT')} className="h-7 w-7 rounded-sm">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Grid Content */}
            <div className={cn(
                "flex-1 overflow-y-auto content-start",
                viewMode === 'MONTH' && "grid grid-cols-7 gap-y-2 gap-x-1",
                viewMode === 'WEEK' && "grid grid-cols-7 gap-2 h-full min-h-0", // Added min-h-0
                viewMode === 'DAY' && "flex flex-col h-full"
            )}>
                {/* Weekday Headers for Month/Week */}
                {viewMode !== 'DAY' && ['월', '화', '수', '목', '금', '토', '일'].map((day, i) => (
                    <div key={day} className={cn(
                        "text-center text-xs font-semibold text-muted-foreground py-2 sticky top-0 bg-white/0 backdrop-blur-sm z-10",
                        i === 5 && "text-blue-500", // Sat
                        i === 6 && "text-red-500"   // Sun
                    )}>
                        {day}
                    </div>
                ))}

                {/* Days */}
                {calendarDays.map((day, idx) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayEvents = eventsByDate.get(dateKey) || [];
                    const hasUrgent = dayEvents.some(e => e.type === 'URGENT');
                    const hasNotice = dayEvents.some(e => e.type === 'NOTICE');
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isDimmed = urgentFilter && !hasUrgent && !isSameDay(day, expandedDate!);

                    // Render Different Views
                    if (viewMode === 'MONTH') {
                        return (
                            <motion.div
                                key={dateKey}
                                layoutId={`day-${dateKey}`}
                                onClick={() => handleDayClick(day)}
                                className={cn(
                                    "relative aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors",
                                    isToday(day) && "bg-black/5 font-bold",
                                    !isCurrentMonth && "opacity-30",
                                    isDimmed ? "opacity-20 blur-[1px]" : "hover:bg-primary/5",
                                    expandedDate && isSameDay(day, expandedDate) && "bg-primary/10 ring-2 ring-primary ring-offset-2 z-10"
                                )}
                            >
                                <span className={cn("text-sm mb-1", isToday(day) && "text-primary")}>{format(day, 'd')}</span>
                                <div className="flex gap-1 h-1.5 flex-wrap justify-center max-w-[80%]">
                                    {hasUrgent && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm" />}
                                    {hasNotice && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm" />}
                                    {!hasUrgent && !hasNotice && dayEvents.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                                </div>
                            </motion.div>
                        );
                    } else if (viewMode === 'WEEK') {
                        // Week View: Improved Layout
                        return (
                            <div key={dateKey} className={cn(
                                "border rounded-xl flex flex-col gap-1 bg-white/40 h-full overflow-hidden",
                                isToday(day) ? "border-primary/50 bg-primary/5" : "border-transparent"
                            )}>
                                <div className={cn("text-center text-xs py-2 border-b border-black/5", isToday(day) && "text-primary font-bold")}>
                                    {format(day, 'd')}
                                </div>
                                <div className="flex-1 overflow-y-auto scrollbar-hide p-1 space-y-1">
                                    {dayEvents.length === 0 ? (
                                        <div className="h-full"></div> // Transparent filler
                                    ) : (
                                        dayEvents.map(event => (
                                            <div key={event.id} className={cn(
                                                "text-[10px] px-1.5 py-1 rounded truncate shadow-sm",
                                                event.type === 'URGENT' ? "bg-red-100 text-red-700" :
                                                    event.type === 'NOTICE' ? "bg-blue-100 text-blue-700" :
                                                        "bg-white border border-gray-100 text-gray-600"
                                            )}>
                                                {event.title}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )
                    } else {
                        // Day View
                        return (
                            <div key={dateKey} className="flex-1 overflow-y-auto">
                                {dayEvents.length === 0 ? (
                                    <div className="flex h-full items-center justify-center text-muted-foreground">일정이 없습니다.</div>
                                ) : (
                                    <div className="space-y-3 p-4">
                                        {dayEvents.map(event => (
                                            <div key={event.id} className="flex gap-4 p-4 rounded-xl border bg-white shadow-sm">
                                                <div className={cn(
                                                    "w-1 h-full rounded-full self-stretch",
                                                    event.type === 'URGENT' ? "bg-red-500" : event.type === 'NOTICE' ? "bg-blue-500" : "bg-gray-300"
                                                )} />
                                                <div>
                                                    <div className="text-lg font-bold">{event.title}</div>
                                                    <div className="text-sm text-gray-500">{event.content}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    }

                })}
            </div>

            {/* Expanded Overlay (Month View Only) */}
            <AnimatePresence>
                {expandedDate && viewMode === 'MONTH' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute inset-x-4 bottom-4 top-24 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border/50 z-20 overflow-hidden flex flex-col"
                    >
                        <div className="p-4 border-b flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-semibold text-lg">
                                {format(expandedDate, "M월 d일 (EEEE)", { locale: ko })}
                            </h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedDate(null)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-3 flex-1">
                            {(eventsByDate.get(format(expandedDate, 'yyyy-MM-dd')) || []).length === 0 ? (
                                <div className="text-center text-muted-foreground py-10">일정이 없습니다.</div>
                            ) : (
                                (eventsByDate.get(format(expandedDate, 'yyyy-MM-dd')) || []).map(event => (
                                    <div key={event.id} className={cn(
                                        "p-3 rounded-lg border text-sm",
                                        event.type === 'URGENT' ? 'bg-red-50 border-red-200' :
                                            event.type === 'NOTICE' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'
                                    )}>
                                        <div className="flex gap-2 items-center mb-1">
                                            {event.type === 'URGENT' && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">긴급</span>}
                                            {event.type === 'NOTICE' && <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">공지</span>}
                                            <span className="font-semibold truncate">{event.title}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">{event.content}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
