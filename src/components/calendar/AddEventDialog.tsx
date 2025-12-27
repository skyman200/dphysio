import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { EVENT_TYPES, EVENT_CATEGORIES, NewEventFormState } from "@/types";
import { format, addMonths, subMonths, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddEventDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    formState: NewEventFormState;
    onUpdateField: <K extends keyof NewEventFormState>(field: K, value: NewEventFormState[K]) => void;
    onSubmit: () => void;
    onCancel: () => void;
}

const TIME_OPTIONS = Array.from({ length: 24 }, (_, hour) =>
    ["00", "30"].map((min) => ({
        value: `${hour.toString().padStart(2, "0")}:${min}`,
        label: `${hour >= 12 ? "오후" : "오전"} ${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:${min}`,
    }))
).flat();

export function AddEventDialog({
    isOpen,
    onOpenChange,
    formState,
    onUpdateField,
    onSubmit,
    onCancel,
}: AddEventDialogProps) {
    const [isAllDay, setIsAllDay] = useState(false);
    const [expandedSection, setExpandedSection] = useState<"startDate" | "endDate" | null>(null);
    const [viewMonth, setViewMonth] = useState(new Date());

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return { firstDay, daysInMonth };
    };

    const handleDateSelect = (day: number, isStart: boolean) => {
        const selectedDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        if (isStart) {
            onUpdateField("date", dateStr);
            if (!formState.endDate || dateStr > formState.endDate) {
                onUpdateField("endDate", dateStr);
            }
        } else {
            onUpdateField("endDate", dateStr);
        }
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
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] glass-dialog">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">새 일정 추가</DialogTitle>
                    <DialogDescription>학과 일정을 추가합니다.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Input
                            placeholder="제목"
                            value={formState.title}
                            onChange={(e) => onUpdateField("title", e.target.value)}
                            className="text-lg font-medium bg-transparent border-0 border-b border-border/50 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                        />
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <Input
                            placeholder="위치 또는 영상 통화"
                            value={formState.location}
                            onChange={(e) => onUpdateField("location", e.target.value)}
                            className="bg-transparent border-0 border-b border-border/50 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary text-muted-foreground"
                        />
                    </div>

                    {/* Apple-style Date/Time Section */}
                    <div className="bg-muted/30 rounded-2xl overflow-hidden">
                        {/* All Day Toggle */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                            <span className="text-sm font-medium">하루 종일</span>
                            <Switch
                                checked={isAllDay}
                                onCheckedChange={(checked) => {
                                    setIsAllDay(checked);
                                    if (checked) {
                                        onUpdateField("time", "");
                                        onUpdateField("endTime", "");
                                    } else {
                                        onUpdateField("time", "09:00");
                                        onUpdateField("endTime", "10:00");
                                    }
                                }}
                            />
                        </div>

                        {/* Start Row */}
                        <div className="border-b border-border/30">
                            <div className="flex items-center px-4 py-3">
                                <span className="text-sm text-muted-foreground w-12">시작</span>
                                <button
                                    type="button"
                                    onClick={() => setExpandedSection(expandedSection === "startDate" ? null : "startDate")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                        expandedSection === "startDate" ? "bg-primary/20 text-primary" : "bg-muted/50 hover:bg-muted"
                                    )}
                                >
                                    {formatDisplayDate(formState.date)}
                                </button>
                                {!isAllDay && (
                                    <select
                                        value={formState.time}
                                        onChange={(e) => onUpdateField("time", e.target.value)}
                                        className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-muted/50 hover:bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        {TIME_OPTIONS.map((t) => (
                                            <option key={t.value} value={t.value}>
                                                {t.label}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Inline Calendar for Start */}
                            {expandedSection === "startDate" && (
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
                                            const isSelected = formState.date === dateStr;
                                            const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;
                                            return (
                                                <button
                                                    type="button"
                                                    key={day}
                                                    onClick={() => handleDateSelect(day, true)}
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

                        {/* End Row */}
                        <div>
                            <div className="flex items-center px-4 py-3">
                                <span className="text-sm text-muted-foreground w-12">종료</span>
                                <button
                                    type="button"
                                    onClick={() => setExpandedSection(expandedSection === "endDate" ? null : "endDate")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                        expandedSection === "endDate" ? "bg-primary/20 text-primary" : "bg-muted/50 hover:bg-muted"
                                    )}
                                >
                                    {formatDisplayDate(formState.endDate || formState.date)}
                                </button>
                                {!isAllDay && (
                                    <select
                                        value={formState.endTime}
                                        onChange={(e) => onUpdateField("endTime", e.target.value)}
                                        className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-muted/50 hover:bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        {TIME_OPTIONS.map((t) => (
                                            <option key={t.value} value={t.value}>
                                                {t.label}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Inline Calendar for End */}
                            {expandedSection === "endDate" && (
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
                                            const isSelected = (formState.endDate || formState.date) === dateStr;
                                            return (
                                                <button
                                                    type="button"
                                                    key={day}
                                                    onClick={() => handleDateSelect(day, false)}
                                                    className={cn(
                                                        "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                                                        isSelected && "bg-primary text-primary-foreground",
                                                        !isSelected && "hover:bg-muted"
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
                    </div>

                    {/* Type & Category */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">대상</Label>
                            <Select
                                value={formState.type}
                                onValueChange={(value) => onUpdateField("type", value)}
                            >
                                <SelectTrigger className="bg-muted/30 border-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {EVENT_TYPES.map((type) => (
                                        <SelectItem key={type.id} value={type.id}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">카테고리</Label>
                            <Select
                                value={formState.category}
                                onValueChange={(value) => onUpdateField("category", value)}
                            >
                                <SelectTrigger className="bg-muted/30 border-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {EVENT_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">중요도</Label>
                        <Select
                            value={formState.priority}
                            onValueChange={(value) => onUpdateField("priority", value)}
                        >
                            <SelectTrigger className="bg-muted/30 border-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="normal">보통</SelectItem>
                                <SelectItem value="important">중요</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Textarea
                            placeholder="메모"
                            value={formState.description}
                            onChange={(e) => onUpdateField("description", e.target.value)}
                            rows={2}
                            className="bg-muted/30 border-0 resize-none"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onCancel}>
                        취소
                    </Button>
                    <Button onClick={onSubmit}>
                        추가
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
