import { useState, useMemo, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useEvents, Event } from "@/hooks/useEvents";
import { useProfiles } from "@/hooks/useProfiles";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO, addMonths, subMonths, addWeeks, subWeeks, isBefore, isAfter, min, max, differenceInDays, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getProfileColorByProfiles } from "@/lib/colors";
import { DAY_INDEX, DAY_LABELS, CALENDAR_LIMITS, DEFAULT_TIMES } from "@/constants/calendar";
import { toast } from "sonner";
import { EventDetailModal } from "@/components/calendar/EventDetailModal";
import { CalendarDayView } from "@/components/calendar/CalendarDayView";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { useEventUnreadStatus } from "@/hooks/useEventUnreadStatus";

type ViewMode = "month" | "week" | "day";


const CalendarPage = () => {
  const { events, addEvent } = useEvents();
  const { profiles } = useProfiles();
  const { user } = useAuth();
  const { hasUnreadMessages } = useEventUnreadStatus();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Drag to select state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);

  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    time: "",
    endTime: "",
    location: "",
    description: "",
    endDate: "",
  });

  // Reset drag state when mouse leaves window or button is released outside
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  // 중앙화된 색상 함수 사용
  const getProfileColor = useCallback((userId: string) => {
    return getProfileColorByProfiles(profiles, userId);
  }, [profiles]);

  const getProfileName = (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.name || "?";
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [events, searchQuery]);

  // Calendar grid generation for month view
  // We need weeks for the row-based logic to render multi-day bars correctly
  const calendarWeeks = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const weeks: Date[][] = [];
    let day = calendarStart;
    let currentWeek: Date[] = [];

    while (day <= calendarEnd) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      day = addDays(day, 1);
    }

    // Push last partial week if any (though logic above should handle full weeks)
    if (currentWeek.length > 0) weeks.push(currentWeek);

    return weeks;
  }, [currentDate]);

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time || !user) {
      toast.error("필수 항목을 모두 입력해주세요");
      return;
    }

    const startDate = new Date(`${newEvent.date}T${newEvent.time}:00`);

    // Calculate end date based on input
    let endDate: Date | undefined;
    if (newEvent.endDate && newEvent.endTime) {
      endDate = new Date(`${newEvent.endDate}T${newEvent.endTime}:00`);
    } else if (newEvent.endTime) {
      // Only time provided, assume same day
      endDate = new Date(`${newEvent.date}T${newEvent.endTime}:00`);
    }

    const { error } = await addEvent({
      title: newEvent.title,
      start_date: startDate,
      end_date: endDate,
      location: newEvent.location || undefined,
      description: newEvent.description || undefined,
    });

    if (error) {
      console.error("Event creation error:", error);
      toast.error("일정 추가에 실패했습니다. 데이터베이스 설정을 확인해주세요.");
      return;
    }

    toast.success("일정이 추가되었습니다");
    setIsDialogOpen(false);
    setNewEvent({ title: "", date: "", time: "", endTime: "", location: "", description: "", endDate: "" });
  };

  const handleDayClick = (day: Date, hour?: number) => {
    setNewEvent((prev) => ({
      ...prev,
      date: format(day, "yyyy-MM-dd"),
      endDate: format(day, "yyyy-MM-dd"),
      time: hour !== undefined ? `${hour.toString().padStart(2, "0")}:00` : "09:00",
      endTime: hour !== undefined ? `${(hour + 1).toString().padStart(2, "0")}:00` : "10:00",
    }));
    setIsDialogOpen(true);
  };

  const handleDragCreate = (day: Date, startHour: number, endHour: number) => {
    setNewEvent((prev) => ({
      ...prev,
      date: format(day, "yyyy-MM-dd"),
      endDate: format(day, "yyyy-MM-dd"),
      time: `${startHour.toString().padStart(2, "0")}:00`,
      endTime: `${endHour.toString().padStart(2, "0")}:00`,
    }));
    setIsDialogOpen(true);
  };

  // Mouse handlers for drag selection
  const handleMouseDown = (e: React.MouseEvent, day: Date) => {
    e.preventDefault(); // Prevent text selection
    // Only left click
    if (e.button !== 0) return;

    setIsDragging(true);
    setDragStart(day);
    setDragEnd(day);
  };

  const handleMouseEnter = (day: Date) => {
    if (isDragging) {
      setDragEnd(day);
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragStart && dragEnd) {
      setIsDragging(false);

      const start = isBefore(dragStart, dragEnd) ? dragStart : dragEnd;
      const end = isAfter(dragEnd, dragStart) ? dragEnd : dragStart;

      setNewEvent((prev) => ({
        ...prev,
        date: format(start, "yyyy-MM-dd"),
        endDate: format(end, "yyyy-MM-dd"),
        time: "09:00",
        endTime: "10:00",
        title: "",
      }));
      setIsDialogOpen(true);
    }
    setDragStart(null);
    setDragEnd(null);
  };

  const isDaySelected = (day: Date) => {
    if (!dragStart || !dragEnd) return false;
    const start = isBefore(dragStart, dragEnd) ? dragStart : dragEnd;
    const end = isAfter(dragEnd, dragStart) ? dragEnd : dragStart;

    // Normalize to start of day for comparison
    const dayTime = day.getTime();
    const startTime = start.setHours(0, 0, 0, 0);
    const endTime = end.setHours(23, 59, 59, 999);

    return dayTime >= startTime && dayTime <= endTime;
  };

  const navigatePrev = () => {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, -1));
  };

  const navigateNext = () => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const getDateRangeLabel = () => {
    if (viewMode === "month") return format(currentDate, "yyyy년 M월", { locale: ko });
    if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, "M월 d일", { locale: ko })} - ${format(weekEnd, "M월 d일", { locale: ko })}`;
    }
    return format(currentDate, "yyyy년 M월 d일 (EEE)", { locale: ko });
  };

  // Helper to process events for a week row - crucial for multi-day bars
  const getProcessedEventsForWeek = (weekStart: Date) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

    // Filter events overlapping with this week
    const weekEvents = filteredEvents.filter(event => {
      const eventStart = parseISO(event.start_date);
      const eventEnd = event.end_date ? parseISO(event.end_date) : eventStart;
      return eventStart <= weekEnd && eventEnd >= weekStart;
    });

    // Map to processed events with span info
    return weekEvents.map(event => {
      const eventStart = parseISO(event.start_date);
      const eventEnd = event.end_date ? parseISO(event.end_date) : eventStart;

      const startInWeek = eventStart < weekStart ? weekStart : eventStart;
      const endInWeek = eventEnd > weekEnd ? weekEnd : eventEnd;

      // Calculate span (add 1 because inclusive)
      const span = differenceInDays(startOfDay(endInWeek), startOfDay(startInWeek)) + 1;

      // Calculate start offset (0 to 6)
      const startOffset = differenceInDays(startOfDay(startInWeek), startOfDay(weekStart));

      return {
        ...event,
        span,
        startOffset,
        isContinuedBefore: eventStart < weekStart,
        isContinuedAfter: eventEnd > weekEnd,
      };
    });
  };

  return (
    <MainLayout title="캘린더">
      <div className="space-y-6" onMouseUp={handleMouseUp}>
        {/* Header Controls */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={navigatePrev}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-2xl font-bold min-w-[200px] text-center">
                {getDateRangeLabel()}
              </h2>
              <Button variant="ghost" size="icon" onClick={navigateNext}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              오늘
            </Button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
              {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className="text-xs"
                >
                  {mode === "month" ? "월" : mode === "week" ? "주" : "일"}
                </Button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="일정 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>

            {/* Add Event Button */}
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              일정 추가
            </Button>
          </div>
        </div>

        {/* Member Legend */}
        <div className="flex items-center gap-3 flex-wrap">
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

        {/* Calendar Views */}
        {viewMode === "month" && (
          <div className="glass-card rounded-2xl overflow-hidden select-none border border-border/40 shadow-xl">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-border/30 bg-muted/30">
              {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
                <div
                  key={day}
                  className={cn(
                    "p-3 text-center text-sm font-medium",
                    i === 0 && "text-destructive",
                    i === 6 && "text-primary"
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid - Week by Week Row Approach */}
            <div className="flex flex-col">
              {calendarWeeks.map((week, weekIdx) => {
                const weekStart = week[0];
                const weekEvents = getProcessedEventsForWeek(weekStart);

                // Sort events visually: longer span first, then by title
                weekEvents.sort((a, b) => {
                  if (a.span !== b.span) return b.span - a.span; // Long events on top
                  return a.title.localeCompare(b.title);
                });

                return (
                  <div key={weekIdx} className="flex-1 min-h-[140px] border-b border-border/20 relative group">
                    {/* Background Grid for Day Cells */}
                    <div className="absolute inset-0 grid grid-cols-7 z-0">
                      {week.map((day, dayIdx) => {
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const isCurrentDay = isSameDay(day, new Date());
                        const isSelected = isDaySelected(day);

                        return (
                          <div
                            key={dayIdx}
                            onMouseDown={(e) => handleMouseDown(e, day)}
                            onMouseEnter={() => handleMouseEnter(day)}
                            className={cn(
                              "h-full border-r border-border/20 transition-colors p-1",
                              !isCurrentMonth && "bg-muted/10 opacity-60",
                              isCurrentDay && "bg-primary/5",
                              isSelected && "bg-primary/20",
                              !isSelected && !isCurrentDay && "hover:bg-muted/30"
                            )}
                          >
                            <span
                              className={cn(
                                "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ml-auto",
                                isCurrentDay && "bg-primary text-primary-foreground",
                                !isCurrentDay && dayIdx === 0 && "text-destructive",
                                !isCurrentDay && "text-muted-foreground"
                              )}
                            >
                              {format(day, "d")}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Events Layer - Absolute Positioned per Row */}
                    <div className="relative z-10 mt-8 grid grid-cols-7 gap-y-1 px-1 pointer-events-none">
                      {/* 
                           We need to perform layout algorithm here to prevent overlapping 
                           For simplicity in this fix, we are just dumping them in 'grid-flow-row dense' logic
                           Using full grid width and placing items with col-start/span
                        */}
                      {weekEvents.slice(0, 5).map((event) => {
                        const hasUnread = hasUnreadMessages(event.id);
                        return (
                          <div
                            key={`${event.id}-${weekIdx}`}
                            className={cn(
                              "text-xs px-2 py-1 text-white truncate cursor-pointer hover:brightness-110 transition-all shadow-sm font-medium pointer-events-auto rounded-md mb-1 mx-0.5",
                              event.isContinuedBefore && "rounded-l-none mx-0 border-l border-white/20",
                              event.isContinuedAfter && "rounded-r-none mx-0 border-r border-white/20",
                            )}
                            style={{
                              backgroundColor: getProfileColor(event.created_by),
                              gridColumnStart: event.startOffset + 1,
                              gridColumnEnd: `span ${event.span}`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setIsDetailModalOpen(true);
                            }}
                          >
                            <div className="flex items-center gap-1">
                              {/* Only show title if it's the start or if it's continued but first in this row */}
                              <span className="truncate">{event.title}</span>
                              {hasUnread && (
                                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {weekEvents.length > 5 && (
                        <div
                          className="col-span-7 text-xs text-muted-foreground pl-2 mt-1 pointer-events-auto cursor-pointer hover:text-foreground"
                          style={{ gridColumnStart: 1 }}
                        >
                          +{weekEvents.length - 5}개 더보기
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "week" && (
          <div className="glass-card rounded-2xl overflow-hidden h-[600px]">
            {/* Note: Week View also needs similar treatment but prioritizing Month view per request */}
            <CalendarWeekView
              date={currentDate}
              events={filteredEvents}
              onEventClick={(event) => {
                setSelectedEvent(event);
                setIsDetailModalOpen(true);
              }}
              onSlotClick={(day, hour) => handleDayClick(day, hour)}
              onDragCreate={handleDragCreate}
            />
          </div>
        )}

        {viewMode === "day" && (
          <div className="glass-card rounded-2xl overflow-hidden h-[600px]">
            <CalendarDayView
              date={currentDate}
              events={filteredEvents}
              onEventClick={(event) => {
                setSelectedEvent(event);
                setIsDetailModalOpen(true);
              }}
              onSlotClick={(day, hour) => handleDayClick(day, hour)}
              onDragCreate={handleDragCreate}
            />
          </div>
        )}

        {/* Add Event Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] glass-dialog">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">새 일정 추가</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>제목 *</Label>
                <Input
                  placeholder="일정 제목"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>시작 날짜 *</Label>
                  <Input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>종료 날짜</Label>
                  <Input
                    type="date"
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>시작 시간 *</Label>
                  <Input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>종료 시간</Label>
                  <Input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>장소</Label>
                <Input
                  placeholder="장소"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <Button onClick={handleAddEvent} className="w-full">
                추가
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Event Detail Modal */}
        <EventDetailModal
          event={selectedEvent}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedEvent(null);
          }}
        />
      </div>
    </MainLayout>
  );
};

export default CalendarPage;
