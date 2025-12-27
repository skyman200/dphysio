import { useState } from "react";
import { format, addMonths, subMonths, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MeetingFormState {
    title: string;
    date: string;
    time: string;
    location: string;
    description: string;
}

interface MeetingFormProps {
    meeting: MeetingFormState;
    setMeeting: (meeting: MeetingFormState) => void;
    onSubmit: () => void;
    onCancel: () => void;
    loading: boolean;
    editingId: string | null;
}

const TIME_OPTIONS = Array.from({ length: 24 }, (_, hour) =>
    ["00", "30"].map((min) => ({
        value: `${hour.toString().padStart(2, "0")}:${min}`,
        label: `${hour >= 12 ? "오후" : "오전"} ${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:${min}`,
    }))
).flat();

export function MeetingForm({
    meeting,
    setMeeting,
    onSubmit,
    onCancel,
    loading,
    editingId,
}: MeetingFormProps) {
    const [expandedSection, setExpandedSection] = useState<"date" | "time" | null>(null);
    const [viewMonth, setViewMonth] = useState(meeting.date ? parseISO(meeting.date) : new Date());

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return { firstDay, daysInMonth };
    };

    const handleDateSelect = (day: number) => {
        const selectedDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
        setMeeting({ ...meeting, date: format(selectedDate, "yyyy-MM-dd") });
        setExpandedSection(null);
    };

    const { firstDay, daysInMonth } = getDaysInMonth(viewMonth);

    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr) return "날짜 선택";
        try {
            return format(parseISO(dateStr), "yyyy. M. d.", { locale: ko });
        } catch {
            return "날짜 선택";
        }
    };

    const getTimeLabel = (timeStr: string) => {
        const option = TIME_OPTIONS.find((t) => t.value === timeStr);
        return option?.label || "시간 선택";
    };

    return (
        <div className="space-y-4 mt-4">
            {/* Title */}
            <div>
                <Input
                    placeholder="제목"
                    value={meeting.title}
                    onChange={(e) => setMeeting({ ...meeting, title: e.target.value })}
                    className="text-lg font-medium bg-transparent border-0 border-b border-border/50 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                />
            </div>

            {/* Location */}
            <div>
                <Input
                    placeholder="위치 또는 영상 통화"
                    value={meeting.location}
                    onChange={(e) => setMeeting({ ...meeting, location: e.target.value })}
                    className="bg-transparent border-0 border-b border-border/50 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary text-muted-foreground"
                />
            </div>

            {/* Apple-style Date/Time Section */}
            <div className="bg-muted/30 rounded-2xl overflow-hidden">
                {/* Date Row */}
                <div className="border-b border-border/30">
                    <div className="flex items-center px-4 py-3">
                        <span className="text-sm text-muted-foreground w-12">날짜</span>
                        <button
                            type="button"
                            onClick={() => setExpandedSection(expandedSection === "date" ? null : "date")}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                expandedSection === "date" ? "bg-primary/20 text-primary" : "bg-muted/50 hover:bg-muted"
                            )}
                        >
                            {formatDisplayDate(meeting.date)}
                        </button>
                    </div>

                    {/* Inline Calendar */}
                    {expandedSection === "date" && (
                        <div className="px-4 pb-4">
                            <div className="flex items-center justify-between mb-3">
                                <button type="button" className="text-sm font-semibold text-primary">
                                    {format(viewMonth, "yyyy년 M월", { locale: ko })}
                                </button>
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => setViewMonth(subMonths(viewMonth, 1))} className="text-primary hover:text-primary/80">
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, 1))} className="text-primary hover:text-primary/80">
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
                                    const dateStr = format(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day), "yyyy-MM-dd");
                                    const isSelected = meeting.date === dateStr;
                                    const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;
                                    return (
                                        <button
                                            type="button"
                                            key={day}
                                            onClick={() => handleDateSelect(day)}
                                            className={cn(
                                                "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                                                isSelected && "bg-primary text-primary-foreground",
                                                isToday && !isSelected && "text-primary font-bold",
                                                !isSelected && !isToday && "hover:bg-muted"
                                            )}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Time Row */}
                <div>
                    <div className="flex items-center px-4 py-3">
                        <span className="text-sm text-muted-foreground w-12">시간</span>
                        <button
                            type="button"
                            onClick={() => setExpandedSection(expandedSection === "time" ? null : "time")}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                expandedSection === "time" ? "bg-primary/20 text-primary" : "bg-muted/50 hover:bg-muted"
                            )}
                        >
                            {getTimeLabel(meeting.time)}
                        </button>
                    </div>

                    {/* Inline Time Wheel Picker */}
                    {expandedSection === "time" && (
                        <div className="px-4 pb-4">
                            <div className="flex justify-center gap-2 bg-muted/20 rounded-xl p-2">
                                {/* Period (오전/오후) */}
                                <div className="flex flex-col h-32 overflow-y-auto snap-y snap-mandatory scrollbar-hide">
                                    {["오전", "오후"].map((period) => {
                                        const currentHour = parseInt(meeting.time.split(":")[0]);
                                        const isCurrentPeriod = (period === "오후" && currentHour >= 12) || (period === "오전" && currentHour < 12);
                                        return (
                                            <button
                                                type="button"
                                                key={period}
                                                onClick={() => {
                                                    const [h, m] = meeting.time.split(":");
                                                    let hour = parseInt(h);
                                                    if (period === "오후" && hour < 12) hour += 12;
                                                    if (period === "오전" && hour >= 12) hour -= 12;
                                                    setMeeting({ ...meeting, time: `${hour.toString().padStart(2, "0")}:${m}` });
                                                }}
                                                className={cn(
                                                    "px-4 py-2 text-sm snap-center whitespace-nowrap",
                                                    isCurrentPeriod ? "bg-background rounded-lg font-semibold" : "text-muted-foreground"
                                                )}
                                            >
                                                {period}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Hour */}
                                <div className="flex flex-col h-32 overflow-y-auto snap-y snap-mandatory scrollbar-hide">
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => {
                                        const currentHour = parseInt(meeting.time.split(":")[0]);
                                        const displayHour = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
                                        return (
                                            <button
                                                type="button"
                                                key={hour}
                                                onClick={() => {
                                                    const [h, m] = meeting.time.split(":");
                                                    const isPM = parseInt(h) >= 12;
                                                    const newHour = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
                                                    setMeeting({ ...meeting, time: `${newHour.toString().padStart(2, "0")}:${m}` });
                                                }}
                                                className={cn(
                                                    "px-4 py-2 text-sm snap-center",
                                                    displayHour === hour ? "bg-background rounded-lg font-semibold" : "text-muted-foreground"
                                                )}
                                            >
                                                {hour}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Minute */}
                                <div className="flex flex-col h-32 overflow-y-auto snap-y snap-mandatory scrollbar-hide">
                                    {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((min) => {
                                        const currentMin = meeting.time.split(":")[1];
                                        return (
                                            <button
                                                type="button"
                                                key={min}
                                                onClick={() => {
                                                    const [h] = meeting.time.split(":");
                                                    setMeeting({ ...meeting, time: `${h}:${min}` });
                                                }}
                                                className={cn(
                                                    "px-4 py-2 text-sm snap-center",
                                                    currentMin === min ? "bg-background rounded-lg font-semibold" : "text-muted-foreground"
                                                )}
                                            >
                                                {min}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Description */}
            <div>
                <Input
                    placeholder="회의 안건..."
                    value={meeting.description}
                    onChange={(e) => setMeeting({ ...meeting, description: e.target.value })}
                    className="bg-transparent border-0 border-b border-border/50 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary text-muted-foreground"
                />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onCancel}>
                    취소
                </Button>
                <Button onClick={onSubmit} disabled={loading}>
                    {loading ? (editingId ? "수정 중..." : "추가 중...") : (editingId ? "수정" : "추가")}
                </Button>
            </div>
        </div>
    );
}
