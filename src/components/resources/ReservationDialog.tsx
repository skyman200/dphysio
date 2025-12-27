import { useState, useEffect } from "react";
import { useResources, Resource } from "@/hooks/useResources";
import { useTodos } from "@/hooks/useTodos";
import { useProfiles } from "@/hooks/useProfiles";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, Clock, MapPin, FileText, Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: Resource | null;
  selectedDate: Date;
  selectedHour: number | null;
}

export function ReservationDialog({
  open,
  onOpenChange,
  resource,
  selectedDate,
  selectedHour,
}: ReservationDialogProps) {
  const { addReservation } = useResources();
  const { todos } = useTodos();
  const { profiles } = useProfiles();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [bookerName, setBookerName] = useState("");
  const [description, setDescription] = useState("");

  // Date & Time State
  const [startDate, setStartDate] = useState<Date>(selectedDate);
  const [endDate, setEndDate] = useState<Date>(selectedDate);
  const [startHour, setStartHour] = useState("9");
  const [endHour, setEndHour] = useState("10");

  const [selectedTodo, setSelectedTodo] = useState<string>("none");
  const [conflict, setConflict] = useState<{
    show: boolean;
    userName: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const incompleteTodos = todos.filter((t) => !t.completed);

  // Initialize state when props change
  useEffect(() => {
    if (open) {
      setStartDate(selectedDate);
      setEndDate(selectedDate);
      if (selectedHour !== null) {
        setStartHour(selectedHour.toString());
        setEndHour((selectedHour + 1).toString());
      }
    }
  }, [open, selectedDate, selectedHour]);

  const handleSubmit = async () => {
    if (!resource || !title.trim()) {
      toast({ title: "제목을 입력해주세요", variant: "destructive" });
      return;
    }

    const startDateTime = new Date(startDate);
    startDateTime.setHours(parseInt(startHour), 0, 0, 0);

    const endDateTime = new Date(endDate);
    endDateTime.setHours(parseInt(endHour), 0, 0, 0);

    // Validation
    if (endDateTime <= startDateTime) {
      toast({ title: "종료 시간은 시작 시간보다 뒤여야 합니다", variant: "destructive" });
      return;
    }

    setLoading(true);
    const result = await addReservation({
      resource_id: resource.id,
      title,
      description: description || undefined,
      start_time: startDateTime,
      end_time: endDateTime,
      todo_id: selectedTodo !== "none" ? selectedTodo : undefined,
      booker_name: bookerName || undefined,
    });

    if (result.error) {
      if (result.error.message === "CONFLICT" && result.conflictUserId) {
        const conflictUser = profiles.find(
          (p) => p.user_id === result.conflictUserId
        );
        setConflict({
          show: true,
          userName: conflictUser?.name || "다른 사용자",
        });
      } else {
        toast({ title: "예약 실패", variant: "destructive" });
      }
    } else {
      toast({ title: "예약이 완료되었습니다" });
      resetForm();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setTitle("");
    setBookerName("");
    setDescription("");
    setStartDate(selectedDate);
    setEndDate(selectedDate);
    setStartHour(selectedHour?.toString() || "9");
    setEndHour(((selectedHour || 9) + 1).toString());
    setSelectedTodo("none");
    setConflict(null);
  };

  const hours = Array.from({ length: 15 }, (_, i) => i + 9);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
      modal={true}
    >
      <DialogContent
        className="sm:max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-xl rounded-3xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-4">
          <DialogTitle className="font-display text-2xl flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" strokeWidth={1.5} />
            {resource?.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-light">
            새로운 예약을 생성합니다
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {conflict?.show && (
            <Alert variant="destructive" className="rounded-2xl animate-scale-in">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>예약 충돌</AlertTitle>
              <AlertDescription>
                해당 시간에 {conflict.userName}님이 이미 예약했습니다.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-foreground/80">
              예약 제목 *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 영상 편집, 녹음 작업"
              className="rounded-2xl h-12 bg-white/60 border-border/40 focus:bg-white focus:border-primary/40 transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bookerName" className="text-sm font-medium text-foreground/80">
              예약자명 (선택)
            </Label>
            <Input
              id="bookerName"
              value={bookerName}
              onChange={(e) => setBookerName(e.target.value)}
              placeholder="예: 학생회, 홍길동 (미입력 시 본인 이름)"
              className="rounded-2xl h-12 bg-white/60 border-border/40 focus:bg-white focus:border-primary/40 transition-all"
            />
          </div>

          {/* Date & Time Selection Area */}
          <div className="bg-muted/30 p-4 rounded-2xl space-y-4">
            {/* Start */}
            <div className="grid grid-cols-[80px_1fr] items-center gap-4">
              <Label className="text-right text-xs font-semibold text-muted-foreground">시작</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal rounded-xl h-10 bg-white border-0 shadow-sm", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                      {startDate ? format(startDate, "M월 d일 (EEE)", { locale: ko }) : <span>날짜</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} initialFocus locale={ko} />
                  </PopoverContent>
                </Popover>

                <Select value={startHour} onValueChange={setStartHour}>
                  <SelectTrigger className="w-[100px] rounded-xl h-10 bg-white border-0 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {hours.map((h) => (
                      <SelectItem key={`start-${h}`} value={h.toString()} className="rounded-lg">
                        {h.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* End */}
            <div className="grid grid-cols-[80px_1fr] items-center gap-4">
              <Label className="text-right text-xs font-semibold text-muted-foreground">종료</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal rounded-xl h-10 bg-white border-0 shadow-sm", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                      {endDate ? format(endDate, "M월 d일 (EEE)", { locale: ko }) : <span>날짜</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={(date) => date && setEndDate(date)} initialFocus locale={ko} disabled={(date) => date < startDate} />
                  </PopoverContent>
                </Popover>

                <Select value={endHour} onValueChange={setEndHour}>
                  <SelectTrigger className="w-[100px] rounded-xl h-10 bg-white border-0 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {hours.map((h) => (
                      <SelectItem key={`end-${h}`} value={h.toString()} className="rounded-lg">
                        {h.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!isSameDay(startDate, endDate) && (
              <div className="text-xs text-primary flex items-center justify-end gap-1 px-1">
                <AlertCircle className="w-3 h-3" />
                <span>여러 날짜(Multi-day)에 걸쳐 예약됩니다.</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
              연결할 할 일
            </Label>
            <Select value={selectedTodo} onValueChange={setSelectedTodo}>
              <SelectTrigger className="rounded-2xl h-12 bg-white/60">
                <SelectValue placeholder="선택 안함" />
              </SelectTrigger>
              <SelectContent className="glass rounded-2xl">
                <SelectItem value="none" className="rounded-xl">선택 안함</SelectItem>
                {incompleteTodos.map((todo) => (
                  <SelectItem key={todo.id} value={todo.id} className="rounded-xl">
                    {todo.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-foreground/80">
              설명 (선택)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="추가 설명..."
              rows={2}
              className="rounded-2xl bg-white/60 border-border/40 focus:bg-white transition-all resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="btn-outline-elegant"
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-elegant"
            >
              {loading ? "저장 중..." : "예약하기"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}