// Calendar State Hook - 캘린더 상태 관리 로직 분리
import { useState, useMemo, useCallback } from "react";
import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    eachWeekOfInterval,
    format
} from "date-fns";
import { ko } from "date-fns/locale";
import type { ViewMode } from "@/types";

export interface CalendarState {
    currentDate: Date;
    viewMode: ViewMode;
    selectedDate: Date | null;
    searchQuery: string;
    activeFilters: string[];
    isDragging: boolean;
    dragStartDate: Date | null;
    dragEndDate: Date | null;
}

export interface CalendarActions {
    setCurrentDate: (date: Date) => void;
    setViewMode: (mode: ViewMode) => void;
    setSelectedDate: (date: Date | null) => void;
    setSearchQuery: (query: string) => void;
    toggleFilter: (filterId: string) => void;
    navigatePrev: () => void;
    navigateNext: () => void;
    goToToday: () => void;
    handleMouseDown: (day: Date) => void;
    handleMouseEnter: (day: Date) => void;
    handleMouseUp: () => void;
    isInDragRange: (day: Date) => boolean;
    getDateRangeLabel: () => string;
}

export interface CalendarComputedValues {
    calendarDays: Date[];
    weeksInMonth: Date[][];
}

const DEFAULT_FILTERS = ["department", "professor", "external", "caldav"];

export function useCalendarState() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>("month");
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilters, setActiveFilters] = useState<string[]>(DEFAULT_FILTERS);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
    const [dragEndDate, setDragEndDate] = useState<Date | null>(null);

    // 캘린더 그리드 계산
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

    // 주 단위 배열
    const weeksInMonth = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
        return weeks.map((weekStart) => {
            const days: Date[] = [];
            for (let i = 0; i < 7; i++) {
                days.push(addDays(weekStart, i));
            }
            return days;
        });
    }, [currentDate]);

    // 네비게이션
    const navigatePrev = useCallback(() => {
        if (viewMode === "month") {
            setCurrentDate(subMonths(currentDate, 1));
        } else if (viewMode === "week") {
            setCurrentDate(subWeeks(currentDate, 1));
        } else {
            setCurrentDate(addDays(currentDate, -1));
        }
    }, [viewMode, currentDate]);

    const navigateNext = useCallback(() => {
        if (viewMode === "month") {
            setCurrentDate(addMonths(currentDate, 1));
        } else if (viewMode === "week") {
            setCurrentDate(addWeeks(currentDate, 1));
        } else {
            setCurrentDate(addDays(currentDate, 1));
        }
    }, [viewMode, currentDate]);

    const goToToday = useCallback(() => {
        setCurrentDate(new Date());
    }, []);

    // 필터 토글
    const toggleFilter = useCallback((filterId: string) => {
        setActiveFilters((prev) =>
            prev.includes(filterId)
                ? prev.filter((id) => id !== filterId)
                : [...prev, filterId]
        );
    }, []);

    // 날짜 범위 라벨
    const getDateRangeLabel = useCallback(() => {
        if (viewMode === "month") {
            return format(currentDate, "yyyy년 M월", { locale: ko });
        } else if (viewMode === "week") {
            const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
            return `${format(weekStart, "M월 d일", { locale: ko })} - ${format(weekEnd, "M월 d일", { locale: ko })}`;
        } else {
            return format(currentDate, "yyyy년 M월 d일 (EEE)", { locale: ko });
        }
    }, [viewMode, currentDate]);

    // 드래그 핸들러
    const handleMouseDown = useCallback((day: Date) => {
        setIsDragging(true);
        setDragStartDate(day);
        setDragEndDate(day);
    }, []);

    const handleMouseEnter = useCallback((day: Date) => {
        if (isDragging && dragStartDate) {
            setDragEndDate(day);
        }
    }, [isDragging, dragStartDate]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setDragStartDate(null);
        setDragEndDate(null);
    }, []);

    const isInDragRange = useCallback((day: Date) => {
        if (!isDragging || !dragStartDate || !dragEndDate) return false;
        const start = dragStartDate < dragEndDate ? dragStartDate : dragEndDate;
        const end = dragStartDate < dragEndDate ? dragEndDate : dragStartDate;
        return day >= start && day <= end;
    }, [isDragging, dragStartDate, dragEndDate]);

    // 드래그 범위 반환 (일정 생성용)
    const getDragRange = useCallback(() => {
        if (!dragStartDate || !dragEndDate) return null;
        const start = dragStartDate < dragEndDate ? dragStartDate : dragEndDate;
        const end = dragStartDate < dragEndDate ? dragEndDate : dragStartDate;
        return { startDate: start, endDate: end };
    }, [dragStartDate, dragEndDate]);

    return {
        // State
        currentDate,
        viewMode,
        selectedDate,
        searchQuery,
        activeFilters,
        isDragging,
        dragStartDate,
        dragEndDate,

        // Computed
        calendarDays,
        weeksInMonth,

        // Actions
        setCurrentDate,
        setViewMode,
        setSelectedDate,
        setSearchQuery,
        toggleFilter,
        navigatePrev,
        navigateNext,
        goToToday,
        handleMouseDown,
        handleMouseEnter,
        handleMouseUp,
        isInDragRange,
        getDragRange,
        getDateRangeLabel,
    };
}
