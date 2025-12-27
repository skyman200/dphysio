// Event Form Dialog - 일정 추가/수정 폼 다이얼로그
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEvents } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface EventFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: Date | null;
    initialEndDate?: Date | null;
    initialTime?: string;
    initialEndTime?: string;
}

const EVENT_TYPES = [
    { id: "department", label: "학과" },
    { id: "professor", label: "교수" },
    { id: "external", label: "외부" },
];

const EVENT_CATEGORIES = [
    { id: "meeting", label: "회의" },
    { id: "class", label: "수업" },
    { id: "event", label: "행사" },
    { id: "student", label: "학생" },
    { id: "other", label: "기타" },
];

export function EventFormDialog({
    isOpen,
    onClose,
    initialDate,
    initialEndDate,
    initialTime = "09:00",
    initialEndTime = "10:00",
}: EventFormDialogProps) {
    const { addEvent } = useEvents();
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        title: "",
        date: "",
        endDate: "",
        time: initialTime,
        endTime: initialEndTime,
        type: "department",
        category: "event",
        location: "",
        description: "",
        priority: "normal",
    });

    // 초기값 설정
    useEffect(() => {
        if (initialDate) {
            setFormData((prev) => ({
                ...prev,
                date: format(initialDate, "yyyy-MM-dd"),
                endDate: initialEndDate ? format(initialEndDate, "yyyy-MM-dd") : format(initialDate, "yyyy-MM-dd"),
                time: initialTime,
                endTime: initialEndTime,
            }));
        }
    }, [initialDate, initialEndDate, initialTime, initialEndTime]);

    // 폼 리셋
    const resetForm = () => {
        setFormData({
            title: "",
            date: "",
            endDate: "",
            time: "09:00",
            endTime: "10:00",
            type: "department",
            category: "event",
            location: "",
            description: "",
            priority: "normal",
        });
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.date || !formData.time || !user) {
            toast.error("필수 항목을 모두 입력해주세요");
            return;
        }

        const startDate = new Date(`${formData.date}T${formData.time}:00`);
        let endDate: Date | undefined;

        if (formData.endDate && formData.endDate !== formData.date) {
            endDate = new Date(`${formData.endDate}T${formData.endTime || "23:59"}:00`);
        } else if (formData.endTime) {
            endDate = new Date(`${formData.date}T${formData.endTime}:00`);
        }

        const { error } = await addEvent({
            title: formData.title,
            start_date: startDate,
            end_date: endDate,
            location: formData.location || undefined,
            description: formData.description || undefined,
        });

        if (error) {
            console.error("Event creation error:", error);
            toast.error("일정 추가에 실패했습니다.");
            return;
        }

        toast.success("일정이 추가되었습니다");
        resetForm();
        onClose();
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
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
                            value={formData.title}
                            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>시작 날짜 *</Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>종료 날짜</Label>
                            <Input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>시작 시간 *</Label>
                            <Input
                                type="time"
                                value={formData.time}
                                onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>종료 시간</Label>
                            <Input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Type & Category */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>대상</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
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
                            <Label>유형</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
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
                            value={formData.location}
                            onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label>설명</Label>
                        <Textarea
                            placeholder="일정에 대한 설명"
                            value={formData.description}
                            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                            rows={3}
                        />
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                        <Label>중요도</Label>
                        <Select
                            value={formData.priority}
                            onValueChange={(value) => setFormData((prev) => ({ ...prev, priority: value }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="normal">보통</SelectItem>
                                <SelectItem value="important">중요</SelectItem>
                                <SelectItem value="urgent">긴급</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleClose}>
                        취소
                    </Button>
                    <Button onClick={handleSubmit}>
                        일정 추가
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
