import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppleDateTimePicker } from "@/components/ui/AppleDateTimePicker";

interface MeetingFormState {
    title: string;
    date: string;
    time: string;
    endDate: string;
    endTime: string;
    isAllDay: boolean;
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

export function MeetingForm({
    meeting,
    setMeeting,
    onSubmit,
    onCancel,
    loading,
    editingId,
}: MeetingFormProps) {

    const handleDateTimeUpdate = (field: "date" | "time" | "endDate" | "endTime", value: string) => {
        setMeeting({ ...meeting, [field]: value });
    };

    const handleAllDayChange = (checked: boolean) => {
        if (checked) {
            setMeeting({ ...meeting, isAllDay: true, time: "", endTime: "" });
        } else {
            setMeeting({
                ...meeting,
                isAllDay: false,
                time: meeting.time || "09:00",
                endTime: meeting.endTime || "10:00"
            });
        }
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
            <AppleDateTimePicker
                date={meeting.date}
                time={meeting.time}
                endDate={meeting.endDate}
                endTime={meeting.endTime}
                isAllDay={meeting.isAllDay}
                onAllDayChange={handleAllDayChange}
                onUpdate={handleDateTimeUpdate}
            />

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
            <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={onCancel} className="btn-outline-elegant border-border/50">
                    취소
                </Button>
                <Button onClick={onSubmit} disabled={loading} className="btn-elegant">
                    {loading ? (editingId ? "수정 중..." : "추가 중...") : (editingId ? "수정" : "추가")}
                </Button>
            </div>
        </div>
    );
}
