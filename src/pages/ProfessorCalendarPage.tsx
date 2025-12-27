import { useState, useMemo, useEffect } from "react";
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
import { AppleDateTimePicker } from "@/components/ui/AppleDateTimePicker";
import { EventList } from "@/components/calendar/EventList";
import { WeeklyEventList } from "@/components/calendar/WeeklyEventList";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { CalendarViewToggle, ViewType } from "@/components/calendar/CalendarViewToggle";
import { CalendarSubscribeButton } from "@/components/calendar/CalendarSubscribeButton";

import { EVENT_CATEGORIES } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ViewMode = "month" | "week" | "day";

import { getUserColor, getUserEventStyle, getUserChipStyle, getUserAvatarStyle } from "@/lib/colors";
import { TransformedEvent } from "@/types";

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0am to 11pm

const ProfessorCalendarPage = () => {
  const { events, addEvent } = useEvents();
  const { profiles } = useProfiles();
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [presentationMode, setPresentationMode] = useState<ViewType>("detailed");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedProfessors, setSelectedProfessors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    time: "09:00",
    endDate: "",
    endTime: "10:00",
    location: "",
    category: "meeting", // Default
    isAllDay: false,
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    setSelectedDate(currentDate);
  }, [currentDate]);

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
      // @ts-ignore
      if (e.type === 'department') return false;
      return selectedProfessors.includes(e.created_by);
    });
  }, [events, selectedProfessors]);

  // Selected Date Events for List View
  const selectedDateEvents = useMemo(() => {
    return selectedEvents.filter((event) => {
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);
      const target = selectedDate;

      // Check overlap
      const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const t = new Date(target.getFullYear(), target.getMonth(), target.getDate());

      return t >= s && t <= e;
    }) as TransformedEvent[]; // Cast as generic TransformedEvent compatible
  }, [selectedEvents, selectedDate]);

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

  const getProfessorColor = (userId: string) => {
    return getUserEventStyle(userId);
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date || !user) {
      toast.error("제목과 날짜를 입력해주세요");
      return;
    }

    const startDateTimeStr = newEvent.isAllDay
      ? `${newEvent.date}T00:00:00`
      : `${newEvent.date}T${newEvent.time}`;

    // Default end date to start date if not set
    const endDateStr = newEvent.endDate || newEvent.date;
    const endDateTimeStr = newEvent.isAllDay
      ? `${endDateStr}T23:59:59`
      : `${endDateStr}T${newEvent.endTime || newEvent.time}`;

    const { error } = await addEvent({
      title: newEvent.title,
      start_date: new Date(startDateTimeStr),
      end_date: new Date(endDateTimeStr),
      location: newEvent.location || undefined,
      category: newEvent.category,
      type: "professor",
    });

    if (error) {
      console.error("Event creation error:", error);
      toast.error("일정 추가에 실패했습니다.");
      return;
    }

    toast.success("일정이 추가되었습니다");
    setIsDialogOpen(false);
    setNewEvent({ title: "", date: "", time: "09:00", endDate: "", endTime: "10:00", location: "", category: "meeting", isAllDay: false });
  };

  const handleDayClick = (day: Date, hour?: number) => {
    if (presentationMode === 'list') {
      setSelectedDate(day);
    } else {
      setNewEvent((prev) => ({
        ...prev,
        date: format(day, "yyyy-MM-dd"),
        time: hour !== undefined ? `${hour.toString().padStart(2, "0")}:00` : "09:00",
        endDate: format(day, "yyyy-MM-dd"),
        endTime: hour !== undefined ? `${(hour + 1).toString().padStart(2, "0")}:00` : "10:00",
      }));
      setIsDialogOpen(true);
    }
  };

  const handleDragCreate = (day: Date, startHour: number, endHour: number) => {
    setNewEvent((prev) => ({
      ...prev,
      date: format(day, "yyyy-MM-dd"),
      time: `${startHour.toString().padStart(2, "0")}:00`,
      endDate: format(day, "yyyy-MM-dd"),
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

  const handleDateTimeUpdate = (field: "date" | "time" | "endDate" | "endTime", value: string) => {
    setNewEvent(prev => ({ ...prev, [field]: value }));
  };

  return (
    <MainLayout title="교수 캘린더">
      <div className="flex gap-6 h-[calc(100vh-180px)] pb-10">
        {/* Left Panel - Professor List */}
        <div className="w-[280px] flex-shrink-0 glass-card rounded-2xl p-4 overflow-hidden flex flex-col h-full">
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
        <div className="flex-1 glass-card rounded-2xl overflow-hidden flex flex-col h-full">
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
              {/* Presentation Mode Toggle */}
              <div className="bg-muted/50 p-1 rounded-lg">
                <CalendarViewToggle
                  currentView={presentationMode}
                  onViewChange={setPresentationMode}
                />
              </div>

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
              <CalendarSubscribeButton type="professor" userId={user?.uid} />
            </div>
          </div>

          {/* Calendar Views Container */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Calendar Area */}
            <div className={cn(
              "overflow-auto transition-all duration-300",
              presentationMode === 'list' ? 'h-[50%]' : 'h-full'
            )}>
              {viewMode === "month" && (
                <div className="h-full">
                  <CalendarMonthView
                    currentDate={currentDate}
                    filteredEvents={selectedEvents as TransformedEvent[]}
                    isDragging={false}
                    isInDragRange={() => false}
                    onMouseDown={() => { }}
                    onMouseEnter={() => { }}
                    onMouseUp={() => { }}
                    onMouseLeave={() => { }}
                    onDayClick={handleDayClick}
                    onEventClick={(event) => {
                      setSelectedEvent(event);
                      setIsDetailModalOpen(true);
                    }}
                    presentationMode={presentationMode === 'list' ? 'detailed' : presentationMode}
                  />
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

            {/* List View Area */}
            {presentationMode === "list" && (
              <div className="h-[50%] border-t border-border/30 overflow-y-auto bg-background/50 backdrop-blur-sm p-4">
                {viewMode === 'week' ? (
                  <WeeklyEventList
                    currentDate={currentDate}
                    events={selectedEvents as TransformedEvent[]}
                    onEventClick={(event) => {
                      setSelectedEvent(event);
                      setIsDetailModalOpen(true);
                    }}
                  />
                ) : (
                  <EventList
                    date={selectedDate}
                    events={selectedDateEvents as TransformedEvent[]}
                    onEventClick={(event) => {
                      setSelectedEvent(event);
                      setIsDetailModalOpen(true);
                    }}
                  />
                )}
              </div>
            )}

          </div>
        </div>

        {/* Add Event Dialog with AppleDateTimePicker */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] glass-dialog max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">새 일정 추가</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Input
                  placeholder="제목"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                  className="text-lg font-medium bg-transparent border-0 border-b border-border/50 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                />
              </div>

              {/* Apple-style Date/Time Section */}
              <AppleDateTimePicker
                date={newEvent.date}
                time={newEvent.time}
                endDate={newEvent.endDate}
                endTime={newEvent.endTime}
                isAllDay={newEvent.isAllDay}
                onAllDayChange={(checked) => {
                  if (checked) {
                    setNewEvent(prev => ({ ...prev, isAllDay: true, time: "", endTime: "" }));
                  } else {
                    setNewEvent(prev => ({
                      ...prev,
                      isAllDay: false,
                      time: prev.time || "09:00",
                      endTime: prev.endTime || "10:00"
                    }));
                  }
                }}
                onUpdate={handleDateTimeUpdate}
              />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">카테고리</Label>
                <Select
                  value={newEvent.category}
                  onValueChange={(value) => setNewEvent((prev) => ({ ...prev, category: value }))}
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

              <div className="space-y-2">
                <Input
                  placeholder="장소"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, location: e.target.value }))}
                  className="bg-transparent border-0 border-b border-border/50 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary text-muted-foreground"
                />
              </div>

              <Button onClick={handleAddEvent} className="w-full btn-elegant">
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
