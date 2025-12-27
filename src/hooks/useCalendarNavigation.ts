import { useState, useMemo } from "react";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, startOfWeek, endOfWeek } from "date-fns";
import { ko } from "date-fns/locale";
import type { ViewMode } from "@/types";

export function useCalendarNavigation(initialDate: Date = new Date()) {
    const [currentDate, setCurrentDate] = useState(initialDate);
    const [viewMode, setViewMode] = useState<ViewMode>("month");

    const navigatePrev = () => {
        if (viewMode === "month") {
            setCurrentDate(subMonths(currentDate, 1));
        } else if (viewMode === "week") {
            setCurrentDate(subWeeks(currentDate, 1));
        } else {
            setCurrentDate(addDays(currentDate, -1));
        }
    };

    const navigateNext = () => {
        if (viewMode === "month") {
            setCurrentDate(addMonths(currentDate, 1));
        } else if (viewMode === "week") {
            setCurrentDate(addWeeks(currentDate, 1));
        } else {
            setCurrentDate(addDays(currentDate, 1));
        }
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const dateRangeLabel = useMemo(() => {
        if (viewMode === "month") {
            return format(currentDate, "yyyy년 M월", { locale: ko });
        } else if (viewMode === "week") {
            const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
            return `${format(weekStart, "M월 d일", { locale: ko })} - ${format(weekEnd, "M월 d일", { locale: ko })}`;
        } else {
            return format(currentDate, "yyyy년 M월 d일 (EEE)", { locale: ko });
        }
    }, [currentDate, viewMode]);

    return {
        currentDate,
        setCurrentDate,
        viewMode,
        setViewMode,
        navigatePrev,
        navigateNext,
        goToToday,
        dateRangeLabel,
    };
}
