import { useState } from "react";
import { format } from "date-fns";

interface DragState {
    isDragging: boolean;
    dragStartDate: Date | null;
    dragEndDate: Date | null;
}

export function useCalendarDrag() {
    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        dragStartDate: null,
        dragEndDate: null,
    });

    const handleMouseDown = (day: Date) => {
        setDragState({
            isDragging: true,
            dragStartDate: day,
            dragEndDate: day,
        });
    };

    const handleMouseEnter = (day: Date) => {
        if (dragState.isDragging && dragState.dragStartDate) {
            setDragState(prev => ({
                ...prev,
                dragEndDate: day,
            }));
        }
    };

    const handleMouseUp = (onComplete: (startDate: string, endDate: string) => void) => {
        if (dragState.isDragging && dragState.dragStartDate && dragState.dragEndDate) {
            const startDay = dragState.dragStartDate < dragState.dragEndDate
                ? dragState.dragStartDate
                : dragState.dragEndDate;
            const endDay = dragState.dragStartDate < dragState.dragEndDate
                ? dragState.dragEndDate
                : dragState.dragStartDate;

            onComplete(format(startDay, "yyyy-MM-dd"), format(endDay, "yyyy-MM-dd"));
        }
        resetDrag();
    };

    const resetDrag = () => {
        setDragState({
            isDragging: false,
            dragStartDate: null,
            dragEndDate: null,
        });
    };

    const isInDragRange = (day: Date): boolean => {
        if (!dragState.isDragging || !dragState.dragStartDate || !dragState.dragEndDate) {
            return false;
        }
        const start = dragState.dragStartDate < dragState.dragEndDate
            ? dragState.dragStartDate
            : dragState.dragEndDate;
        const end = dragState.dragStartDate < dragState.dragEndDate
            ? dragState.dragEndDate
            : dragState.dragStartDate;
        return day >= start && day <= end;
    };

    return {
        ...dragState,
        handleMouseDown,
        handleMouseEnter,
        handleMouseUp,
        resetDrag,
        isInDragRange,
    };
}
