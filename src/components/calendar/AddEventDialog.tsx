import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_TYPES, EVENT_CATEGORIES, NewEventFormState } from "@/types";
import { AppleDateTimePicker } from "@/components/ui/AppleDateTimePicker";

interface AddEventDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    formState: NewEventFormState;
    onUpdateField: <K extends keyof NewEventFormState>(field: K, value: NewEventFormState[K]) => void;
    onSubmit: () => void;
    onCancel: () => void;
}

export function AddEventDialog({
    isOpen,
    onOpenChange,
    formState,
    onUpdateField,
    onSubmit,
    onCancel,
}: AddEventDialogProps) {
    const [isAllDay, setIsAllDay] = useState(false);

    // Initial check for all day if time is empty
    useState(() => {
        if (formState.date && !formState.time) {
            setIsAllDay(true);
        }
    });

    const handleDateTimeUpdate = (field: "date" | "time" | "endDate" | "endTime", value: string) => {
        onUpdateField(field as any, value);
    };

    const handleAllDayChange = (checked: boolean) => {
        setIsAllDay(checked);
        if (checked) {
            onUpdateField("time", "");
            onUpdateField("endTime", "");
        } else {
            // Default times if switching off all day
            if (!formState.time) onUpdateField("time", "09:00");
            if (!formState.endTime) onUpdateField("endTime", "10:00");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] glass-dialog max-h-[90vh] overflow-y-auto">
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

                    {/* Apple-style Date/Time Section Component */}
                    <AppleDateTimePicker
                        date={formState.date}
                        time={formState.time}
                        endDate={formState.endDate}
                        endTime={formState.endTime}
                        isAllDay={isAllDay}
                        onAllDayChange={handleAllDayChange}
                        onUpdate={handleDateTimeUpdate}
                    />

                    {/* Type & Category */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">대상</Label>
                            <Select
                                value={formState.type}
                                onValueChange={(value) => onUpdateField("type", value)}
                            >
                                <SelectTrigger className="bg-muted/30 border-0 h-9">
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
                                <SelectTrigger className="bg-muted/30 border-0 h-9">
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
                            <SelectTrigger className="bg-muted/30 border-0 h-9">
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
                            rows={3}
                            className="bg-muted/30 border-0 resize-none rounded-xl"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={onCancel} className="btn-outline-elegant border-border/50">
                        취소
                    </Button>
                    <Button onClick={onSubmit} className="btn-elegant">
                        추가
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
