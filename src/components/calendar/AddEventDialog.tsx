import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_TYPES, EVENT_CATEGORIES, NewEventFormState } from "@/types";

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
                        <Label>제목 *</Label>
                        <Input
                            placeholder="일정 제목"
                            value={formState.title}
                            onChange={(e) => onUpdateField("title", e.target.value)}
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>시작 날짜 *</Label>
                            <Input
                                type="date"
                                value={formState.date}
                                onChange={(e) => onUpdateField("date", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>종료 날짜</Label>
                            <Input
                                type="date"
                                value={formState.endDate}
                                onChange={(e) => onUpdateField("endDate", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>시작 시간 *</Label>
                            <Input
                                type="time"
                                value={formState.time}
                                onChange={(e) => onUpdateField("time", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>종료 시간</Label>
                            <Input
                                type="time"
                                value={formState.endTime}
                                onChange={(e) => onUpdateField("endTime", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Type & Category */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>대상</Label>
                            <Select
                                value={formState.type}
                                onValueChange={(value) => onUpdateField("type", value)}
                            >
                                <SelectTrigger>
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
                            <Label>카테고리 *</Label>
                            <Select
                                value={formState.category}
                                onValueChange={(value) => onUpdateField("category", value)}
                            >
                                <SelectTrigger>
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

                    {/* Location */}
                    <div className="space-y-2">
                        <Label>장소</Label>
                        <Input
                            placeholder="장소"
                            value={formState.location}
                            onChange={(e) => onUpdateField("location", e.target.value)}
                        />
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                        <Label>중요도</Label>
                        <Select
                            value={formState.priority}
                            onValueChange={(value) => onUpdateField("priority", value)}
                        >
                            <SelectTrigger>
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
                        <Label>메모</Label>
                        <Textarea
                            placeholder="추가 설명..."
                            value={formState.description}
                            onChange={(e) => onUpdateField("description", e.target.value)}
                            rows={3}
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
