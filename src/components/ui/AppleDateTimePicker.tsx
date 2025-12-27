import { useState, useRef, useEffect } from "react";
import { format, addMonths, subMonths, setHours, setMinutes, addHours } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface AppleDateTimePickerProps {
    startDate: Date;
    endDate: Date;
    onStartDateChange: (date: Date) => void;
    onEndDateChange: (date: Date) => void;
    showAllDay?: boolean;
    isAllDay?: boolean;
    onAllDayChange?: (allDay: boolean) => void;
}

export function AppleDateTimePicker({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    showAllDay = true,
    isAllDay = false,
    onAllDayChange,
}: AppleDateTimePickerProps) {
    const [expandedSection, setExpandedSection] = useState<"startDate" | "startTime" | "endDate" | "endTime" | null>(null);
    const [viewMonth, setViewMonth] = useState(startDate);

    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
    const periods = ["오전", "오후"];

    const handleDateSelect = (day: number, isStart: boolean) => {
        const newDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
        if (isStart) {
            const newStart = setHours(setMinutes(newDate, startDate.getMinutes()), startDate.getHours());
            onStartDateChange(newStart);
            // Auto-adjust end if needed
            if (newStart > endDate) {
                onEndDateChange(addHours(newStart, 1));
            }
        } else {
            const newEnd = setHours(setMinutes(newDate, endDate.getMinutes()), endDate.getHours());
            if (newEnd >= startDate) {
                onEndDateChange(newEnd);
            }
        }
        setExpandedSection(null);
    };

    const handleTimeChange = (isStart: boolean, hour: number, minute: number, period: string) => {
        const hour24 = period === "오후" ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
        if (isStart) {
            const newStart = setHours(setMinutes(startDate, minute), hour24);
            onStartDateChange(newStart);
            if (newStart >= endDate) {
                onEndDateChange(addHours(newStart, 1));
            }
        } else {
            const newEnd = setHours(setMinutes(endDate, minute), hour24);
            onEndDateChange(newEnd);
        }
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return { firstDay, daysInMonth };
    };

    const { firstDay, daysInMonth } = getDaysInMonth(viewMonth);

    const formatTime = (date: Date) => {
        const hour = date.getHours();
        const minute = date.getMinutes();
        const period = hour >= 12 ? "오후" : "오전";
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${period} ${hour12}:${minute.toString().padStart(2, "0")}`;
    };

    const getHour12 = (date: Date) => {
        const hour = date.getHours();
        return hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    };

    const getPeriod = (date: Date) => date.getHours() >= 12 ? "오후" : "오전";

    return (
        <div className="bg-zinc-800/50 rounded-2xl overflow-hidden">
            {/* All Day Toggle */}
            {showAllDay && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700/50">
                    <span className="text-sm font-medium">하루 종일</span>
                    <Switch
                        checked={isAllDay}
                        onCheckedChange={onAllDayChange}
                    />
                </div>
            )}

            {/* Start Date/Time */}
            <div className="border-b border-zinc-700/50">
                <div className="flex items-center px-4 py-3">
                    <span className="text-sm text-muted-foreground w-12">시작</span>
                    <button
                        onClick={() => setExpandedSection(expandedSection === "startDate" ? null : "startDate")}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                            expandedSection === "startDate" ? "bg-red-500/20 text-red-400" : "bg-zinc-700/50 hover:bg-zinc-600/50"
                        )}
                    >
                        {format(startDate, "yyyy. M. d.", { locale: ko })}
                    </button>
                    {!isAllDay && (
                        <button
                            onClick={() => setExpandedSection(expandedSection === "startTime" ? null : "startTime")}
                            className={cn(
                                "ml-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                expandedSection === "startTime" ? "bg-red-500/20 text-red-400" : "bg-zinc-700/50 hover:bg-zinc-600/50"
                            )}
                        >
                            {formatTime(startDate)}
                        </button>
                    )}
                </div>

                {/* Inline Calendar for Start */}
                {expandedSection === "startDate" && (
                    <div className="px-4 pb-4">
                        <div className="flex items-center justify-between mb-3">
                            <button onClick={() => setViewMonth(viewMonth)} className="text-sm font-semibold text-red-400">
                                {format(viewMonth, "yyyy년 M월", { locale: ko })}
                            </button>
                            <div className="flex gap-4">
                                <button onClick={() => setViewMonth(subMonths(viewMonth, 1))} className="text-red-400 hover:text-red-300">
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button onClick={() => setViewMonth(addMonths(viewMonth, 1))} className="text-red-400 hover:text-red-300">
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
                            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                                <div key={d} className="py-1">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-sm">
                            {Array.from({ length: firstDay }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                                const isSelected = startDate.getDate() === day &&
                                    startDate.getMonth() === viewMonth.getMonth() &&
                                    startDate.getFullYear() === viewMonth.getFullYear();
                                const isToday = new Date().getDate() === day &&
                                    new Date().getMonth() === viewMonth.getMonth() &&
                                    new Date().getFullYear() === viewMonth.getFullYear();
                                return (
                                    <button
                                        key={day}
                                        onClick={() => handleDateSelect(day, true)}
                                        className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                                            isSelected && "bg-red-500 text-white",
                                            isToday && !isSelected && "text-red-400",
                                            !isSelected && !isToday && "hover:bg-zinc-700/50"
                                        )}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Inline Time Picker for Start */}
                {expandedSection === "startTime" && (
                    <div className="px-4 pb-4">
                        <div className="flex justify-center gap-2">
                            {/* Period */}
                            <div className="flex flex-col h-32 overflow-y-auto snap-y snap-mandatory scrollbar-hide">
                                {periods.map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => handleTimeChange(true, getHour12(startDate), startDate.getMinutes(), p)}
                                        className={cn(
                                            "px-4 py-2 text-sm snap-center",
                                            getPeriod(startDate) === p ? "bg-zinc-600/80 rounded-lg font-semibold" : "text-muted-foreground"
                                        )}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                            {/* Hour */}
                            <div className="flex flex-col h-32 overflow-y-auto snap-y snap-mandatory scrollbar-hide">
                                {hours.map((h) => (
                                    <button
                                        key={h}
                                        onClick={() => handleTimeChange(true, h, startDate.getMinutes(), getPeriod(startDate))}
                                        className={cn(
                                            "px-4 py-2 text-sm snap-center",
                                            getHour12(startDate) === h ? "bg-zinc-600/80 rounded-lg font-semibold" : "text-muted-foreground"
                                        )}
                                    >
                                        {h}
                                    </button>
                                ))}
                            </div>
                            {/* Minute */}
                            <div className="flex flex-col h-32 overflow-y-auto snap-y snap-mandatory scrollbar-hide">
                                {minutes.map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => handleTimeChange(true, getHour12(startDate), parseInt(m), getPeriod(startDate))}
                                        className={cn(
                                            "px-4 py-2 text-sm snap-center",
                                            startDate.getMinutes() === parseInt(m) ? "bg-zinc-600/80 rounded-lg font-semibold" : "text-muted-foreground"
                                        )}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* End Date/Time */}
            <div>
                <div className="flex items-center px-4 py-3">
                    <span className="text-sm text-muted-foreground w-12">종료</span>
                    <button
                        onClick={() => setExpandedSection(expandedSection === "endDate" ? null : "endDate")}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                            expandedSection === "endDate" ? "bg-red-500/20 text-red-400" : "bg-zinc-700/50 hover:bg-zinc-600/50"
                        )}
                    >
                        {format(endDate, "yyyy. M. d.", { locale: ko })}
                    </button>
                    {!isAllDay && (
                        <button
                            onClick={() => setExpandedSection(expandedSection === "endTime" ? null : "endTime")}
                            className={cn(
                                "ml-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                expandedSection === "endTime" ? "bg-red-500/20 text-red-400" : "bg-zinc-700/50 hover:bg-zinc-600/50"
                            )}
                        >
                            {formatTime(endDate)}
                        </button>
                    )}
                </div>

                {/* Inline Calendar for End */}
                {expandedSection === "endDate" && (
                    <div className="px-4 pb-4">
                        <div className="flex items-center justify-between mb-3">
                            <button className="text-sm font-semibold text-red-400">
                                {format(viewMonth, "yyyy년 M월", { locale: ko })}
                            </button>
                            <div className="flex gap-4">
                                <button onClick={() => setViewMonth(subMonths(viewMonth, 1))} className="text-red-400 hover:text-red-300">
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button onClick={() => setViewMonth(addMonths(viewMonth, 1))} className="text-red-400 hover:text-red-300">
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
                            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                                <div key={d} className="py-1">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-sm">
                            {Array.from({ length: firstDay }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                                const isSelected = endDate.getDate() === day &&
                                    endDate.getMonth() === viewMonth.getMonth() &&
                                    endDate.getFullYear() === viewMonth.getFullYear();
                                return (
                                    <button
                                        key={day}
                                        onClick={() => handleDateSelect(day, false)}
                                        className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                                            isSelected && "bg-red-500 text-white",
                                            !isSelected && "hover:bg-zinc-700/50"
                                        )}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Inline Time Picker for End */}
                {expandedSection === "endTime" && (
                    <div className="px-4 pb-4">
                        <div className="flex justify-center gap-2">
                            {/* Period */}
                            <div className="flex flex-col h-32 overflow-y-auto snap-y snap-mandatory scrollbar-hide">
                                {periods.map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => handleTimeChange(false, getHour12(endDate), endDate.getMinutes(), p)}
                                        className={cn(
                                            "px-4 py-2 text-sm snap-center",
                                            getPeriod(endDate) === p ? "bg-zinc-600/80 rounded-lg font-semibold" : "text-muted-foreground"
                                        )}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                            {/* Hour */}
                            <div className="flex flex-col h-32 overflow-y-auto snap-y snap-mandatory scrollbar-hide">
                                {hours.map((h) => (
                                    <button
                                        key={h}
                                        onClick={() => handleTimeChange(false, h, endDate.getMinutes(), getPeriod(endDate))}
                                        className={cn(
                                            "px-4 py-2 text-sm snap-center",
                                            getHour12(endDate) === h ? "bg-zinc-600/80 rounded-lg font-semibold" : "text-muted-foreground"
                                        )}
                                    >
                                        {h}
                                    </button>
                                ))}
                            </div>
                            {/* Minute */}
                            <div className="flex flex-col h-32 overflow-y-auto snap-y snap-mandatory scrollbar-hide">
                                {minutes.map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => handleTimeChange(false, getHour12(endDate), parseInt(m), getPeriod(endDate))}
                                        className={cn(
                                            "px-4 py-2 text-sm snap-center",
                                            endDate.getMinutes() === parseInt(m) ? "bg-zinc-600/80 rounded-lg font-semibold" : "text-muted-foreground"
                                        )}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
