import { useState, useMemo, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useEvents } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useCalendarNavigation } from "@/hooks/useCalendarNavigation";
import { useCalendarDrag } from "@/hooks/useCalendarDrag";
import { useEventForm } from "@/hooks/useEventForm";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { CalendarDayView } from "@/components/calendar/CalendarDayView";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { AddEventDialog } from "@/components/calendar/AddEventDialog";
import { EventDetailModal } from "@/components/calendar/EventDetailModal";
import type { TransformedEvent } from "@/types";
import { EventList } from "@/components/calendar/EventList";
import { ViewType } from "@/components/calendar/CalendarViewToggle";

const DepartmentCalendarPage = () => {
  const { events } = useEvents();

  // 커스텀 훅 사용
  const navigation = useCalendarNavigation();
  const drag = useCalendarDrag();
  const eventForm = useEventForm();

  // 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>(["department"]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TransformedEvent | null>(null);

  // View Mode State
  const [presentationMode, setPresentationMode] = useState<ViewType>("detailed");
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Bulk Delete State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const { deleteEvents } = useEvents();
  const { profile } = useAuth();
  const isChief = profile?.role === 'admin' || profile?.role === '학과장' || profile?.role === 'chief';

  // Sync selectedDate with navigation.currentDate when Month changes?
  // Or keep them independent? Usually syncing is nice.
  useEffect(() => {
    setSelectedDate(navigation.currentDate);
  }, [navigation.currentDate]);

  // 이벤트 변환 및 필터링
  const transformedEvents = useMemo(() => {
    return events.map((e) => ({
      ...e,
      type: (e as any).source === "caldav" ? "caldav" : ((e as any).type || "department"),
      category: (e as any).category || "event",
      priority: (e as any).priority || "normal",
      source: (e as any).source,
      caldav_calendar_color: (e as any).caldav_calendar_color,
    })) as TransformedEvent[];
  }, [events]);

  const filteredEvents = useMemo(() => {
    return transformedEvents.filter((event) => {
      const matchesFilter = activeFilters.includes(event.type);
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [transformedEvents, activeFilters, searchQuery]);

  // Selected Date Events for List View
  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter(event => {
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);
      const target = selectedDate;

      // Check overlap: target day vs [start, end]
      // Normalize time
      const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const t = new Date(target.getFullYear(), target.getMonth(), target.getDate());

      return t >= s && t <= e;
    });
  }, [filteredEvents, selectedDate]);

  // 필터 토글
  const toggleFilter = (filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId]
    );
  };

  // 이벤트 핸들러
  const handleDayClick = (day: Date) => {
    // If in list mode, just select the date
    if (presentationMode === 'list') {
      setSelectedDate(day);
    } else {
      // In detailed mode, open dialog
      if (!drag.isDragging) {
        eventForm.openDialogForDay(day);
      }
    }
  };

  const handleDragCreate = (day: Date, startHour: number, endHour: number) => {
    eventForm.openDialogForDragCreate(day, startHour, endHour);
  };

  const handleMouseUp = () => {
    drag.handleMouseUp((startDate, endDate) => {
      eventForm.openDialogForDrag(startDate, endDate);
    });
  };

  const handleEventClick = (event: TransformedEvent) => {
    if (isSelectMode) {
      const newSelected = new Set(selectedEventIds);
      if (newSelected.has(event.id)) {
        newSelected.delete(event.id);
      } else {
        newSelected.add(event.id);
      }
      setSelectedEventIds(newSelected);
      return;
    }
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  };

  const handleBulkDelete = async () => {
    if (selectedEventIds.size === 0) return;
    if (!confirm(`${selectedEventIds.size}개의 일정을 삭제하시겠습니까?`)) return;

    const { error } = await deleteEvents(Array.from(selectedEventIds));
    if (error) {
      alert("삭제 실패: " + error.message);
    } else {
      alert("삭제되었습니다.");
      setSelectedEventIds(new Set());
      setIsSelectMode(false);
    }
  };

  const toggleSelectMode = () => {
    if (isSelectMode) {
      setIsSelectMode(false);
      setSelectedEventIds(new Set());
    } else {
      setIsSelectMode(true);
    }
  };

  return (
    <MainLayout title="학과 캘린더">
      <div className="space-y-6 pb-20">
        {/* 헤더 */}
        <CalendarHeader
          dateRangeLabel={navigation.dateRangeLabel}
          viewMode={navigation.viewMode}
          searchQuery={searchQuery}
          activeFilters={activeFilters}
          presentationMode={presentationMode}
          onPrev={navigation.navigatePrev}
          onNext={navigation.navigateNext}
          onToday={navigation.goToToday}
          onViewModeChange={navigation.setViewMode}
          onPresentationModeChange={setPresentationMode}
          onSearchChange={setSearchQuery}
          onAddClick={() => eventForm.setIsDialogOpen(true)}
          onToggleFilter={toggleFilter}
        />

        {/* Bulk Delete Controls (Chief Only) */}
        {isChief && (
          <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectMode}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isSelectMode ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                {isSelectMode ? '선택 모드 종료' : '일괄 삭제 모드'}
              </button>
              {isSelectMode && <span className="text-sm text-gray-600 font-medium">{selectedEventIds.size}개 선택됨</span>}
            </div>
            {isSelectMode && (
              <button
                onClick={handleBulkDelete}
                disabled={selectedEventIds.size === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                선택 삭제
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-6">
          {/* 캘린더 뷰 */}
          <div className={cn(
            "transition-all duration-300",
            presentationMode === "list" ? "h-[450px]" : "min-h-[600px]" // shrink calendar in list mode
          )}>
            {navigation.viewMode === "month" && (
              <CalendarMonthView
                currentDate={navigation.currentDate}
                filteredEvents={filteredEvents}
                isDragging={drag.isDragging}
                isInDragRange={drag.isInDragRange}
                onMouseDown={drag.handleMouseDown}
                onMouseEnter={drag.handleMouseEnter}
                onMouseUp={handleMouseUp}
                onMouseLeave={drag.resetDrag}
                onDayClick={handleDayClick}
                onEventClick={handleEventClick}
                // Props for Selection
                isSelectMode={isSelectMode}
                selectedEventIds={Array.from(selectedEventIds)}
              />
            )}

            {navigation.viewMode === "week" && (
              <div className="glass-card rounded-2xl overflow-hidden h-full">
                <CalendarWeekView
                  date={navigation.currentDate}
                  events={filteredEvents}
                  onEventClick={(event) => handleEventClick(event as TransformedEvent)}
                  onSlotClick={(day, hour) => eventForm.openDialogForDay(day, hour)}
                  onDragCreate={handleDragCreate}
                />
              </div>
            )}

            {navigation.viewMode === "day" && (
              <div className="glass-card rounded-2xl overflow-hidden h-full">
                <CalendarDayView
                  date={navigation.currentDate}
                  events={filteredEvents}
                  onEventClick={(event) => handleEventClick(event as TransformedEvent)}
                  onSlotClick={(day, hour) => eventForm.openDialogForDay(day, hour)}
                  onDragCreate={handleDragCreate}
                />
              </div>
            )}
          </div>

          {/* List View (Only visible in 'list' mode) */}
          {presentationMode === "list" && (
            <div className="border-t border-border/40 pt-6">
              <EventList
                date={selectedDate}
                events={selectedDateEvents}
                onEventClick={handleEventClick}
              />
            </div>
          )}
        </div>

        {/* 일정 추가 다이얼로그 */}
        <AddEventDialog
          isOpen={eventForm.isDialogOpen}
          onOpenChange={eventForm.setIsDialogOpen}
          formState={eventForm.formState}
          onUpdateField={eventForm.updateField}
          onSubmit={eventForm.handleSubmit}
          onCancel={eventForm.closeDialog}
        />

        {/* 이벤트 상세 모달 */}
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

export default DepartmentCalendarPage;
