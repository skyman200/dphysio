import { useState, useEffect } from "react";
import { format, addMonths, subMonths, parseISO, addMinutes, setHours, setMinutes } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WheelPicker } from "./WheelPicker";
import { Switch } from "@/components/ui/switch";

interface AppleDateTimePickerProps {
    date: string;
    time: string;
    endDate: string;
    endTime: string;
    isAllDay: boolean;
    onAllDayChange: (checked: boolean) => void;
    onUpdate: (field: "date" | "time" | "endDate" | "endTime", value: string) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: (i + 1).toString()
}));

const MINUTES = Array.from({ length: 12 }, (_, i) => ({
    value: (i * 5).toString().padStart(2, "0"),
    label: (i * 5).toString().padStart(2, "0")
}));

const PERIODS = [
    { value: "AM", label: "오전" },
    { value: "PM", label: "오후" }
];

export function AppleDateTimePicker({
    date,
    time,
    endDate,
    endTime,
    isAllDay,
    onAllDayChange,
    onUpdate,
}: AppleDateTimePickerProps) {
    const [expandedSection, setExpandedSection] = useState<"start" | "end" | null>(null);
    const [viewMonth, setViewMonth] = useState(date ? parseISO(date) : new Date());

    // Helper to parse time string "HH:mm" to parts
    const parseTime = (timeStr: string) => {
        if (!timeStr) return { period: "AM", hour: "12", minute: "00" };
        const [h, m] = timeStr.split(":").map(Number);
        const period = h >= 12 ? "PM" : "AM";
        const hour = h % 12 === 0 ? 12 : h % 12;
        // Snap minute to nearest 5
        const minute = Math.round(m / 5) * 5;
        return {
            period,
            hour: hour.toString(),
            minute: (minute === 60 ? 0 : minute).toString().padStart(2, "0")
        };
    };

    // Helper to construct "HH:mm" from parts
    const constructTime = (period: string, hour: string, minute: string) => {
        let h = parseInt(hour);
        if (period === "PM" && h !== 12) h += 12;
        if (period === "AM" && h === 12) h = 0;
        return `${h.toString().padStart(2, "0")}:${minute}`;
    };

    const getDaysInMonth = (currentDate: Date) => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return { firstDay, daysInMonth };
    };

    const handleDateSelect = (day: number, isStart: boolean) => {
        const selectedDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
        const dateStr = format(selectedDate, "yyyy-MM-dd");

        if (isStart) {
            onUpdate("date", dateStr);
            // If start date is after end date, move end date
            if (endDate && dateStr > endDate) {
                onUpdate("endDate", dateStr);
            }
        } else {
            onUpdate("endDate", dateStr);
        }
    };

    const { firstDay, daysInMonth } = getDaysInMonth(viewMonth);

    const formatDisplayDate = (dateStr: string, timeStr: string) => {
        if (!dateStr) return "날짜 선택";
        const datePart = format(parseISO(dateStr), "yyyy. M. d.", { locale: ko });
        if (isAllDay) return datePart;

        const { period, hour, minute } = parseTime(timeStr);
        const periodLabel = period === "AM" ? "오전" : "오후";
        return `${datePart} ${periodLabel} ${hour}:${minute}`;
    };

    const renderExpandedContent = (isStart: boolean) => {
        const currentDateStr = isStart ? date : endDate;
        const currentTimeStr = isStart ? time : endTime;
        const { period, hour, minute } = parseTime(currentTimeStr);

        const updateTime = (p: string, h: string, m: string) => {
            const newTime = constructTime(p, h, m);
            onUpdate(isStart ? "time" : "endTime", newTime);
        };

        return (
            <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4 pt-2">
                    <span className="text-sm font-semibold text-foreground ml-1">
                        {format(viewMonth, "yyyy년 M월", { locale: ko })}
                    </span>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setViewMonth(subMonths(viewMonth, 1))} className="p-1 hover:bg-muted rounded-full transition-colors text-primary">
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, 1))} className="p-1 hover:bg-muted rounded-full transition-colors text-primary">
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center mb-6">
                    {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                        <div key={d} className={cn("text-xs font-medium", i === 0 ? "text-destructive" : "text-muted-foreground")}>{d}</div>
                    ))}

                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}

                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                        const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
                        const dStr = format(d, "yyyy-MM-dd");
                        const isSelected = currentDateStr === dStr;
                        const isToday = format(new Date(), "yyyy-MM-dd") === dStr;

                        return (
                            <button
                                type="button"
                                key={day}
                                onClick={() => handleDateSelect(day, isStart)}
                                className={cn(
                                    "h-9 w-9 rounded-full flex items-center justify-center text-sm transition-all duration-200",
                                    isSelected ? "bg-primary text-primary-foreground font-semibold shadow-md scale-105" : "hover:bg-muted text-foreground",
                                    isToday && !isSelected && "text-primary font-bold ring-1 ring-primary/30"
                                )}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>

                {/* Time Wheel Picker (Only if not All Day) */}
                {!isAllDay && (
                    <div className="mt-4 pt-4 border-t border-border/40">
                        <div className="grid grid-cols-3 gap-0 relative h-[160px]">
                            {/* Selection Overlay handled inside WheelPicker, but we can add global one if needed. 
                             WheelPicker has its own mask. */}

                            <WheelPicker
                                options={PERIODS}
                                value={period}
                                onChange={(v) => updateTime(v, hour, minute)}
                                height={160}
                                className="w-full"
                            />
                            <WheelPicker
                                options={HOURS}
                                value={hour} // Already string 1-12
                                onChange={(v) => updateTime(period, v, minute)}
                                height={160}
                                className="w-full"
                            />
                            <WheelPicker
                                options={MINUTES}
                                value={minute}
                                onChange={(v) => updateTime(period, hour, v)}
                                height={160}
                                className="w-full"
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-muted/30 rounded-2xl overflow-hidden border border-border/50 shadow-sm">
            {/* All Day Toggle */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40 bg-card/40 backdrop-blur-sm">
                <span className="text-[15px] font-medium text-foreground">하루 종일</span>
                <Switch
                    checked={isAllDay}
                    onCheckedChange={onAllDayChange}
                    className="scale-90"
                />
            </div>

            {/* Start Date/Time */}
            <div className="border-b border-border/40 bg-card/20">
                <button
                    type="button"
                    onClick={() => setExpandedSection(expandedSection === "start" ? null : "start")}
                    className={cn(
                        "w-full flex items-center justify-between px-4 py-3.5 transition-colors",
                        expandedSection === "start" ? "bg-muted/50" : "hover:bg-muted/30"
                    )}
                >
                    <span className="text-[15px] font-medium text-foreground">시작</span>
                    <span className={cn(
                        "text-[15px] transition-colors",
                        expandedSection === "start" ? "text-primary font-semibold" : "text-muted-foreground"
                    )}>
                        {formatDisplayDate(date, time)}
                    </span>
                </button>

                {expandedSection === "start" && renderExpandedContent(true)}
            </div>

            {/* End Date/Time */}
            <div className="bg-card/20">
                <button
                    type="button"
                    onClick={() => setExpandedSection(expandedSection === "end" ? null : "end")}
                    className={cn(
                        "w-full flex items-center justify-between px-4 py-3.5 transition-colors",
                        expandedSection === "end" ? "bg-muted/50" : "hover:bg-muted/30"
                    )}
                >
                    <span className="text-[15px] font-medium text-foreground">종료</span>
                    <span className={cn(
                        "text-[15px] transition-colors",
                        expandedSection === "end" ? "text-primary font-semibold" : "text-muted-foreground"
                    )}>
                        {formatDisplayDate(endDate || date, endTime || time)}
                    </span>
                </button>

                {expandedSection === "end" && renderExpandedContent(false)}
            </div>
        </div>
    );
}
