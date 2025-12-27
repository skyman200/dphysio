import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useEvents } from "@/hooks/useEvents";
import { useProfiles } from "@/hooks/useProfiles";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfWeek, addDays, parseISO, isSameDay, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth, endOfWeek, isSameMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Search, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CalendarDayView } from "@/components/calendar/CalendarDayView";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { EventDetailModal } from "@/components/calendar/EventDetailModal";

import { EVENT_CATEGORIES } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ViewMode = "month" | "week" | "day";

import { getUserColor, getUserEventStyle, getUserChipStyle, getUserAvatarStyle } from "@/lib/colors";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8am to 7pm

const ProfessorCalendarPage = () => {
  const { events, addEvent } = useEvents();
  const { profiles } = useProfiles();
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedProfessors, setSelectedProfessors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    time: "",
    endTime: "",
    location: "",
    category: "meeting", // Default
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [profiles, searchQuery]);

  const toggleProfessor = (profileId: string) => {
    setSelectedProfessors((prev) =>
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId]
    );
  };

  const selectAll = () => {
    if (selectedProfessors.length === filteredProfiles.length) {
      setSelectedProfessors([]);
    } else {
      setSelectedProfessors(filteredProfiles.map((p) => p.user_id));
    }
  };

  // Get events for selected professors
  const selectedEvents = useMemo(() => {
    if (selectedProfessors.length === 0) {
      // @ts-ignore
      return events.filter(e => e.type !== 'department');
    }
    return events.filter((e) => {
      // Exclude department events
      // @ts-ignore - 'type' might not be strictly typed on raw Event interface yet but exists in Firestore
      if (e.type === 'department') return false;

      return selectedProfessors.includes(e.created_by);
    });
  }, [events, selectedProfessors]);

  // Find common available time slots
  const findCommonAvailability = () => {
    if (selectedProfessors.length < 2) {
      toast.error("2명 이상의 교수를 선택해주세요");
      return;
    }

    const busySlots: Record<string, Set<string>> = {};
    selectedProfessors.forEach((profId) => {
      busySlots[profId] = new Set();
    });

    selectedEvents.forEach((event) => {
      const eventDate = parseISO(event.start_date);
      weekDays.forEach((day) => {
        if (isSameDay(eventDate, day)) {
          const hour = eventDate.getHours();
          const key = `${format(day, "yyyy-MM-dd")}-${hour}`;
          if (busySlots[event.created_by]) {
            busySlots[event.created_by].add(key);
          }
        }
      });
    });

    const availableSlots: string[] = [];
    weekDays.forEach((day) => {
      HOURS.forEach((hour) => {
        const key = `${format(day, "yyyy-MM-dd")}-${hour}`;
        const allFree = selectedProfessors.every(
          (profId) => !busySlots[profId]?.has(key)
        );
        if (allFree) {
          availableSlots.push(`${format(day, "M/d (EEE)", { locale: ko })} ${hour}:00`);
        }
      });
    });

    if (availableSlots.length === 0) {
      toast.error("이번 주 공통 가용 시간이 없습니다");
    } else {
      toast.success(`공통 가용 시간: ${availableSlots.slice(0, 5).join(", ")}${availableSlots.length > 5 ? ` 외 ${availableSlots.length - 5}개` : ""}`);
    }
  };

  const getEventsForSlot = (day: Date, hour: number) => {
    return selectedEvents.filter((event) => {
      const eventDate = parseISO(event.start_date);
      return isSameDay(eventDate, day) && eventDate.getHours() === hour;
    });
  };

  const getProfessorColor = (userId: string) => {
    return getUserEventStyle(userId);
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time || !newEvent.category || !user) {
      toast.error("필수 항목을 모두 입력해주세요");
      return;
    }

    const startDate = new Date(`${newEvent.date}T${newEvent.time}:00`);
    const endDate = newEvent.endTime ? new Date(`${newEvent.date}T${newEvent.endTime}:00`) : undefined;

    const { error } = await addEvent({
      title: newEvent.title,
      start_date: startDate,
      end_date: endDate,
      location: newEvent.location || undefined,
      category: newEvent.category,
    });

    if (error) {
      console.error("Event creation error:", error);
      toast.error("일정 추가에 실패했습니다. 데이터베이스 설정을 확인해주세요.");
      return;
    }

    toast.success("일정이 추가되었습니다");
    setIsDialogOpen(false);
    setNewEvent({ title: "", date: "", time: "", endTime: "", location: "", category: "meeting" });
  };

  const handleDayClick = (day: Date, hour?: number) => {
    setNewEvent((prev) => ({
      ...prev,
      date: format(day, "yyyy-MM-dd"),
      time: hour !== undefined ? `${hour.toString().padStart(2, "0")}:00` : prev.time,
      endTime: hour !== undefined ? `${(hour + 1).toString().padStart(2, "0")}:00` : prev.endTime,
    }));
    setIsDialogOpen(true);
  };

  const handleDragCreate = (day: Date, startHour: number, endHour: number) => {
    setNewEvent((prev) => ({
      ...prev,
      date: format(day, "yyyy-MM-dd"),
      time: `${startHour.toString().padStart(2, "0")}:00`,
      endTime: `${endHour.toString().padStart(2, "0")}:00`,
    }));
    setIsDialogOpen(true);
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
      const wStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const wEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(wStart, "M월 d일", { locale: ko })} - ${format(wEnd, "M월 d일", { locale: ko })}`;
    }
    return format(currentDate, "yyyy년 M월 d일 (EEE)", { locale: ko });
  };

  // Month view calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  const getEventsForDay = (day: Date) => {
    return selectedEvents.filter((event) => isSameDay(parseISO(event.start_date), day));
  };

  return (
    <MainLayout title="교수 캘린더">
      <div className="flex gap-6 h-[calc(100vh-180px)]">
        {/* Left Panel - Professor List */}
        <div className="w-[280px] flex-shrink-0 glass-card rounded-2xl p-4 overflow-hidden flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-3">교수 선택</h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={selectAll}
                className="text-xs text-primary hover:underline"
              >
                {selectedProfessors.length === filteredProfiles.length
                  ? "전체 해제"
                  : "전체 선택"}
              </button>
              <span className="text-xs text-muted-foreground">
                {selectedProfessors.length}명 선택
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredProfiles.map((profile, index) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border-l-4",
                  selectedProfessors.includes(profile.user_id)
                    ? getUserEventStyle(profile.user_id)
                    : "hover:bg-muted/50 border-transparent"
                )}
                onClick={() => toggleProfessor(profile.user_id)}
              >
                <Checkbox
                  checked={selectedProfessors.includes(profile.user_id)}
                  className="pointer-events-none"
                />
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className={cn(
                      "text-xs font-medium text-white",
                      // Using getUserAvatarStyle for solid color to match event border
                      getUserAvatarStyle(profile.user_id)
                    )}
                  >
                    {profile.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {profile.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {profile.role || "교수"}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="pt-4 border-t border-border/30 mt-4 space-y-2">
            <Button
              onClick={findCommonAvailability}
              disabled={selectedProfessors.length < 2}
              className="w-full gap-2"
              variant="outline"
            >
              <Clock className="h-4 w-4" />
              공통 가용시간 찾기
            </Button>
            <Button onClick={() => setIsDialogOpen(true)} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              일정 추가
            </Button>
          </div>
        </div>

        {/* Right Panel - Calendar */}
        <div className="flex-1 glass-card rounded-2xl overflow-hidden flex flex-col">
          {/* Calendar Header */}
          <div className="p-4 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={navigatePrev}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h3 className="text-lg font-semibold min-w-[200px] text-center">
                {getDateRangeLabel()}
              </h3>
              <Button variant="ghost" size="icon" onClick={navigateNext}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                오늘
              </Button>
            </div>
          </div>

          {/* Calendar Views */}
          <div className="flex-1 overflow-auto">
            {viewMode === "month" && (
              <div className="h-full">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b border-border/30 sticky top-0 bg-card z-10">
                  {["월", "화", "수", "목", "금", "토", "일"].map((day, i) => (
                    <div
                      key={day}
                      className={cn(
                        "p-2 text-center text-xs font-medium",
                        i === 5 && "text-primary",
                        i === 6 && "text-destructive"
                      )}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, idx) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isCurrentDay = isSameDay(day, new Date());

                    return (
                      <div
                        key={idx}
                        onClick={() => handleDayClick(day)}
                        className={cn(
                          "min-h-[80px] p-1 border-b border-r border-border/20 cursor-pointer transition-colors hover:bg-muted/30",
                          !isCurrentMonth && "bg-muted/10 opacity-50",
                          isCurrentDay && "bg-primary/5"
                        )}
                      >
                        <span
                          className={cn(
                            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                            isCurrentDay && "bg-primary text-primary-foreground"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                        <div className="space-y-0.5 mt-0.5">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                                setIsDetailModalOpen(true);
                              }}
                              className={cn(
                                "text-[10px] p-0.5 rounded text-white truncate cursor-pointer bg-gradient-to-r",
                                getProfessorColor(event.created_by)
                              )}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[10px] text-muted-foreground">
                              +{dayEvents.length - 2}
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
              <CalendarWeekView
                date={currentDate}
                events={selectedEvents}
                onEventClick={(event) => {
                  setSelectedEvent(event);
                  setIsDetailModalOpen(true);
                }}
                onSlotClick={(day, hour) => handleDayClick(day, hour)}
                onDragCreate={handleDragCreate}
              />
            )}

            {viewMode === "day" && (
              <CalendarDayView
                date={currentDate}
                events={selectedEvents}
                onEventClick={(event) => {
                  setSelectedEvent(event);
                  setIsDetailModalOpen(true);
                }}
                onSlotClick={(day, hour) => handleDayClick(day, hour)}
                onDragCreate={handleDragCreate}
              />
            )}
          </div>
        </div>

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

              <div className="space-y-2">
                <Label>카테고리 *</Label>
                <Select
                  value={newEvent.category}
                  onValueChange={(value) => setNewEvent((prev) => ({ ...prev, category: value }))}
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

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>날짜 *</Label>
                  <Input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>
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

export default ProfessorCalendarPage;
