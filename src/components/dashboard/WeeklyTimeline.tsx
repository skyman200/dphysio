import { useState, useMemo } from "react";
import { format, startOfWeek, addDays, isSameDay, isToday, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, startOfDay, endOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Building2, User, ExternalLink, Users, BookOpen, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEvents } from "@/hooks/useEvents";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MultiDayEventBar, isMultiDayEvent } from "@/components/calendar/MultiDayEventBar";
import { getUserEventStyle, getUserChipStyle } from "@/lib/colors";

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  type: string;
  category: string;
  priority: string;
  location: string | null;
  created_by: string;
}

interface WeeklyTimelineProps {
  events: Event[];
  profiles: { id: string; user_id: string; name: string; color: string | null }[];
  onEventClick?: (event: Event) => void;
}

const LAYERS = [
  { id: "department", label: "학과", icon: Building2, color: "bg-professor-gold" },
  { id: "professor", label: "교수", icon: User, color: "bg-professor-sage" },
  { id: "external", label: "외부", icon: ExternalLink, color: "bg-professor-mauve" },
  { id: "meeting", label: "회의", icon: Users, color: "bg-professor-burgundy" },
  { id: "class", label: "수업", icon: BookOpen, color: "bg-professor-terracotta" },
  { id: "event", label: "행사", icon: Calendar, color: "bg-professor-rose" },
];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

type ViewMode = "day" | "week" | "month";

export function WeeklyTimeline({ events, profiles, onEventClick }: WeeklyTimelineProps) {
  const { addEvent } = useEvents();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeLayers, setActiveLayers] = useState<string[]>(["department", "professor", "external", "meeting", "class", "event"]);
  const [viewMode, setViewMode] = useState<ViewMode>("week");

  // Multi-day drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
  const [dragEndDate, setDragEndDate] = useState<Date | null>(null);

  // Add event dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    endDate: "",
    time: "09:00",
    endTime: "18:00",
    location: "",
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfMonth = monthStart.getDay();

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesType = activeLayers.includes(event.type);
      const matchesCategory = activeLayers.includes(event.category);
      return matchesType || matchesCategory;
    });
  }, [events, activeLayers]);

  // Get only single-day events for individual day cells
  const getSingleDayEventsForDay = (day: Date) => {
    return filteredEvents.filter((event) => {
      if (isMultiDayEvent(event)) return false;
      const eventDate = parseISO(event.start_date);
      return isSameDay(eventDate, day);
    });
  };

  // Get style for multi-day event bar
  const getMultiDayEventStyle = (event: Event) => {
    // Force center alignment for multi-day bars
    return cn(getUserEventStyle(event.created_by), "justify-center text-center");
  };

  const toggleLayer = (layerId: string) => {
    setActiveLayers((prev) =>
      prev.includes(layerId)
        ? prev.filter((id) => id !== layerId)
        : [...prev, layerId]
    );
  };

  const getEventStyle = (event: Event) => {
    return getUserChipStyle(event.created_by);
  };

  // Multi-day drag handlers
  const handleMouseDown = (day: Date) => {
    setIsDragging(true);
    setDragStartDate(day);
    setDragEndDate(day);
  };

  const handleMouseEnter = (day: Date) => {
    if (isDragging && dragStartDate) {
      setDragEndDate(day);
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragStartDate && dragEndDate) {
      const startDay = dragStartDate < dragEndDate ? dragStartDate : dragEndDate;
      const endDay = dragStartDate < dragEndDate ? dragEndDate : dragStartDate;

      setNewEvent({
        title: "",
        date: format(startDay, "yyyy-MM-dd"),
        endDate: format(endDay, "yyyy-MM-dd"),
        time: "09:00",
        endTime: "18:00",
        location: "",
      });
      setDialogOpen(true);
    }
    setIsDragging(false);
    setDragStartDate(null);
    setDragEndDate(null);
  };

  const isInDragRange = (day: Date) => {
    if (!isDragging || !dragStartDate || !dragEndDate) return false;
    const start = dragStartDate < dragEndDate ? dragStartDate : dragEndDate;
    const end = dragStartDate < dragEndDate ? dragEndDate : dragStartDate;
    return day >= start && day <= end;
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      toast({ title: "제목과 날짜를 입력해주세요", variant: "destructive" });
      return;
    }

    const startDate = new Date(`${newEvent.date}T${newEvent.time}:00`);
    let endDate: Date | undefined;
    if (newEvent.endDate && newEvent.endDate !== newEvent.date) {
      endDate = new Date(`${newEvent.endDate}T${newEvent.endTime}:00`);
    } else if (newEvent.endTime) {
      endDate = new Date(`${newEvent.date}T${newEvent.endTime}:00`);
    }

    await addEvent({
      title: newEvent.title,
      start_date: startDate,
      end_date: endDate,
      location: newEvent.location || undefined,
    });

    toast({ title: "일정이 추가되었습니다" });
    setDialogOpen(false);
    setNewEvent({
      title: "",
      date: "",
      endDate: "",
      time: "09:00",
      endTime: "18:00",
      location: "",
    });
  };

  const navigatePrev = () => {
    if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, -1));
    } else if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const getHeaderTitle = () => {
    if (viewMode === "day") {
      return format(currentDate, "yyyy년 M월 d일 (EEEE)", { locale: ko });
    } else if (viewMode === "week") {
      return format(weekStart, "yyyy년 M월", { locale: ko });
    }
    return format(currentDate, "yyyy년 M월", { locale: ko });
  };

  // Day View
  const renderDayView = () => {
    const dayEvents = filteredEvents.filter((event) => isSameDay(parseISO(event.start_date), currentDate));
    return (
      <div className="min-h-[300px] p-4">
        <div className={cn(
          "text-center p-4 mb-4 rounded-xl",
          isToday(currentDate) && "bg-primary/10"
        )}>
          <div className="text-xs text-muted-foreground">
            {format(currentDate, "EEEE", { locale: ko })}
          </div>
          <div className={cn(
            "text-3xl font-bold mt-1",
            isToday(currentDate) ? "text-primary" : "text-foreground"
          )}>
            {format(currentDate, "d")}
          </div>
        </div>

        <div className="space-y-2">
          {dayEvents.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              일정이 없습니다
            </div>
          ) : (
            dayEvents.map((event, idx) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onEventClick?.(event)}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.01]",
                  getEventStyle(event),
                  event.priority === "important" && "font-semibold border-2"
                )}
              >
                <div className="font-medium">{event.title}</div>
                <div className="text-sm opacity-70 mt-1">
                  {format(parseISO(event.start_date), "HH:mm")}
                  {event.location && ` • ${event.location}`}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Week View
  const renderWeekView = () => (
    <div
      className="overflow-x-auto select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (isDragging) {
          setIsDragging(false);
          setDragStartDate(null);
          setDragEndDate(null);
        }
      }}
    >
      <div className="min-w-[700px]">
        <div className="grid grid-cols-7 border-b border-border/30">
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "p-3 text-center border-r border-border/20 last:border-r-0",
                isToday(day) && "bg-primary/10"
              )}
            >
              <div className="text-xs text-muted-foreground">
                {format(day, "EEE", { locale: ko })}
              </div>
              <div
                className={cn(
                  "text-lg font-semibold mt-1",
                  isToday(day) ? "text-primary" : "text-foreground"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>

        {/* Multi-day event bars */}
        <div className="border-b border-border/20 py-1 px-1 bg-muted/10">
          <MultiDayEventBar
            events={filteredEvents}
            weekDays={weekDays}
            onEventClick={onEventClick}
            getEventStyle={getMultiDayEventStyle}
          />
        </div>

        <div className="grid grid-cols-7 min-h-[200px]">
          {weekDays.map((day) => {
            const dayEvents = getSingleDayEventsForDay(day);
            const isSelected = isInDragRange(day);
            return (
              <div
                key={day.toISOString()}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleMouseDown(day);
                }}
                onMouseEnter={() => handleMouseEnter(day)}
                className={cn(
                  "p-2 border-r border-border/20 last:border-r-0 min-h-[200px] cursor-pointer",
                  isToday(day) && "bg-primary/5",
                  isSelected && "bg-primary/20 ring-2 ring-primary/50 ring-inset"
                )}
              >
                <AnimatePresence>
                  {dayEvents.map((event, idx) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => onEventClick?.(event)}
                      className={cn(
                        "mb-2 p-2 rounded-lg border cursor-pointer transition-all hover:scale-[1.02]",
                        getEventStyle(event),
                        event.priority === "important" && "font-semibold border-2"
                      )}
                    >
                      <div className="text-xs font-medium truncate">{event.title}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">
                        {format(parseISO(event.start_date), "HH:mm")}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Month View
  const renderMonthView = () => {
    const paddingDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    return (
      <div
        className="overflow-hidden select-none"
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (isDragging) {
            setIsDragging(false);
            setDragStartDate(null);
            setDragEndDate(null);
          }
        }}
      >
        <div className="grid grid-cols-7 border-b border-border/30">
          {DAYS.map((day, i) => (
            <div
              key={day}
              className={cn(
                "p-2 text-center text-xs font-medium",
                i === 0 && "text-destructive",
                i === 6 && "text-primary"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {paddingDays.map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[80px] p-1 border-r border-b border-border/10 bg-muted/20" />
          ))}

          {monthDays.map((day) => {
            const dayEvents = filteredEvents.filter((event) => !isMultiDayEvent(event) && isSameDay(parseISO(event.start_date), day));
            const isSunday = day.getDay() === 0;
            const isSaturday = day.getDay() === 6;
            const isSelected = isInDragRange(day);

            return (
              <div
                key={day.toISOString()}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleMouseDown(day);
                }}
                onMouseEnter={() => handleMouseEnter(day)}
                className={cn(
                  "min-h-[80px] p-1 border-r border-b border-border/10 cursor-pointer",
                  isToday(day) && "bg-primary/5",
                  isSelected && "bg-primary/20 ring-2 ring-primary/50 ring-inset"
                )}
              >
                <div className={cn(
                  "text-xs font-medium mb-1 px-1",
                  isToday(day) && "text-primary font-bold",
                  isSunday && "text-destructive",
                  isSaturday && "text-primary"
                )}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      className={cn(
                        "text-[10px] px-1 py-0.5 rounded truncate cursor-pointer",
                        getEventStyle(event)
                      )}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-muted-foreground px-1">
                      +{dayEvents.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={navigatePrev}
              className="h-8 w-8 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold text-foreground min-w-[200px] text-center">
              {getHeaderTitle()}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={navigateNext}
              className="h-8 w-8 rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="text-xs"
            >
              오늘
            </Button>

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="day" className="text-xs px-3">일</TabsTrigger>
                <TabsTrigger value="week" className="text-xs px-3">주</TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-3">월</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Layer Toggles */}
        <div className="flex flex-wrap gap-2">
          {LAYERS.map((layer) => (
            <Toggle
              key={layer.id}
              pressed={activeLayers.includes(layer.id)}
              onPressedChange={() => toggleLayer(layer.id)}
              size="sm"
              className="gap-1.5 text-xs data-[state=on]:bg-primary/20"
            >
              <layer.icon className="h-3 w-3" />
              {layer.label}
            </Toggle>
          ))}
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === "day" && renderDayView()}
      {viewMode === "week" && renderWeekView()}
      {viewMode === "month" && renderMonthView()}

      {/* Add Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md glass-card border-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              새 일정 추가
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>제목 *</Label>
              <Input
                placeholder="일정 제목"
                value={newEvent.title}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                className="rounded-xl bg-muted/30 border-0"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>시작 날짜</Label>
                <Input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, date: e.target.value }))}
                  className="rounded-xl bg-muted/30 border-0"
                />
              </div>
              <div className="space-y-2">
                <Label>종료 날짜</Label>
                <Input
                  type="date"
                  value={newEvent.endDate}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="rounded-xl bg-muted/30 border-0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>시작 시간</Label>
                <Input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, time: e.target.value }))}
                  className="rounded-xl bg-muted/30 border-0"
                />
              </div>
              <div className="space-y-2">
                <Label>종료 시간</Label>
                <Input
                  type="time"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, endTime: e.target.value }))}
                  className="rounded-xl bg-muted/30 border-0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>장소</Label>
              <Input
                placeholder="장소 (선택)"
                value={newEvent.location}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, location: e.target.value }))}
                className="rounded-xl bg-muted/30 border-0"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleAddEvent}>
                추가
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
