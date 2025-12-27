import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEvents } from "@/hooks/useEvents";
import { useProfiles } from "@/hooks/useProfiles";
import { useTodos } from "@/hooks/useTodos";
import { useToast } from "@/hooks/use-toast";
import { useEventUnreadStatus } from "@/hooks/useEventUnreadStatus";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

const DEFAULT_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

// CalDAV event indicator color
const CALDAV_INDICATOR_COLOR = "#FF6B6B";

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", location: "", date: "" });
  
  const { events, loading, addEvent } = useEvents();
  const { todos } = useTodos();
  const { profiles } = useProfiles();
  const { toast } = useToast();
  const { hasUnreadMessages } = useEventUnreadStatus();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const getProfileName = (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.name || "?";
  };

  const getProfileColor = (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    if (profile?.color) return profile.color;
    const index = profiles.findIndex((p) => p.user_id === userId);
    return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  };

  const getEventColor = (event: { created_by: string; source?: string; caldav_calendar_color?: string }) => {
    // CalDAV events use their calendar color or a distinct default
    if (event.source === "caldav") {
      return event.caldav_calendar_color || CALDAV_INDICATOR_COLOR;
    }
    return getProfileColor(event.created_by);
  };

  const getEventsForDay = (day: number) =>
    events.filter((e) => {
      const eventDate = new Date(e.start_date);
      return (
        eventDate.getFullYear() === year &&
        eventDate.getMonth() === month &&
        eventDate.getDate() === day
      );
    });

  const getTodosForDay = (day: number) =>
    todos.filter((t) => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return (
        dueDate.getFullYear() === year &&
        dueDate.getMonth() === month &&
        dueDate.getDate() === day
      );
    });

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      toast({
        title: "입력 오류",
        description: "제목과 날짜를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await addEvent({
      title: newEvent.title,
      start_date: new Date(newEvent.date),
      location: newEvent.location || undefined,
    });

    if (error) {
      toast({
        title: "오류",
        description: "일정을 추가하지 못했습니다.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "일정 추가됨",
        description: "새로운 일정이 추가되었습니다.",
      });
      setNewEvent({ title: "", location: "", date: "" });
      setDialogOpen(false);
    }
  };

  const renderDays = () => {
    const days = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(
        <div key={`prev-${i}`} className="calendar-cell opacity-40">
          <span className="text-sm text-muted-foreground font-medium">{daysInPrevMonth - i}</span>
        </div>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const isWeekend = (firstDay + day - 1) % 7 === 0 || (firstDay + day - 1) % 7 === 6;
      const isSunday = (firstDay + day - 1) % 7 === 0;
      const dayEvents = getEventsForDay(day);
      const dayTodos = getTodosForDay(day);
      const allItems = [
        ...dayEvents.map((e) => ({ type: "event" as const, ...e })),
        ...dayTodos.map((t) => ({ type: "todo" as const, id: t.id, title: t.title, created_by: t.created_by, completed: t.completed })),
      ];
      days.push(
        <div
          key={day}
          className={cn(
            "calendar-cell group",
            isToday(day) && "calendar-today",
            isWeekend && "calendar-weekend"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={cn(
                "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-all",
                isToday(day) && "bg-primary text-primary-foreground shadow-lg shadow-primary/30",
                isSunday && !isToday(day) && "text-destructive"
              )}
            >
              {day}
            </span>
          </div>
          <div className="space-y-1.5 overflow-hidden">
            {allItems.slice(0, 3).map((item) => {
              const hasUnread = item.type === "event" && hasUnreadMessages(item.id);
              const isCalDAV = item.type === "event" && (item as any).source === "caldav";
              const itemColor = item.type === "event" 
                ? getEventColor(item as any) 
                : getProfileColor(item.created_by);
              
              return (
                <div
                  key={item.id}
                  className={cn(
                    "event-pill text-white relative",
                    item.type === "todo" && item.completed && "opacity-50 line-through"
                  )}
                  style={{ backgroundColor: itemColor }}
                  title={`${item.type === "todo" ? "📋 " : isCalDAV ? "🍎 " : "📅 "}${item.title} - ${isCalDAV ? "Apple Calendar" : getProfileName(item.created_by)}`}
                >
                  {item.type === "todo" && <CheckCircle2 className="h-3 w-3 mr-1 flex-shrink-0" />}
                  {isCalDAV && <span className="mr-1">🍎</span>}
                  {item.title}
                  {/* Unread message indicator */}
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                  )}
                </div>
              );
            })}
            {allItems.length > 3 && (
              <button className="text-xs text-muted-foreground hover:text-foreground transition-colors pl-2">
                +{allItems.length - 3}개 더보기
              </button>
            )}
          </div>
        </div>
      );
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(
        <div key={`next-${i}`} className="calendar-cell opacity-40">
          <span className="text-sm text-muted-foreground font-medium">{i}</span>
        </div>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <div className="glass-card p-8 animate-fade-in">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden animate-fade-in">
      {/* Calendar Header */}
      <div className="p-6 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {year}년 {MONTHS[month]}
            </h2>
            <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1">
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goToday} className="rounded-full">
              오늘
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full gap-2 shadow-lg shadow-primary/25">
                  <Plus className="h-4 w-4" />
                  일정 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card border-0">
                <DialogHeader>
                  <DialogTitle>새 일정 추가</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>제목</Label>
                    <Input
                      placeholder="일정 제목"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      className="rounded-xl bg-muted/30 border-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>날짜</Label>
                    <Input
                      type="datetime-local"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="rounded-xl bg-muted/30 border-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>장소 (선택)</Label>
                    <Input
                      placeholder="장소"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      className="rounded-xl bg-muted/30 border-0"
                    />
                  </div>
                  <Button onClick={handleAddEvent} className="w-full rounded-xl">
                    추가
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Member Legend */}
        <div className="flex items-center gap-3 mt-5 flex-wrap">
          {profiles.map((profile) => (
            <div key={profile.id} className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback
                  className="text-[10px] font-bold text-white"
                  style={{ backgroundColor: getProfileColor(profile.user_id) }}
                >
                  {profile.name[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{profile.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 bg-muted/20 border-b border-border/30">
        {DAYS.map((day, i) => (
          <div
            key={day}
            className={cn(
              "py-3 text-center text-xs font-semibold uppercase tracking-wider",
              i === 0 && "text-destructive",
              i === 6 && "text-primary"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">{renderDays()}</div>
    </div>
  );
}