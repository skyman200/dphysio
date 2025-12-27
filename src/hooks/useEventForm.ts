import { useState, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useEvents } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import type { NewEventFormState } from "@/types";
import { INITIAL_EVENT_FORM_STATE } from "@/types";

export function useEventForm() {
    const { addEvent } = useEvents();
    const { user } = useAuth();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formState, setFormState] = useState<NewEventFormState>(INITIAL_EVENT_FORM_STATE);
    const [isAllDay, setIsAllDay] = useState(false);

    const updateField = useCallback(<K extends keyof NewEventFormState>(
        field: K,
        value: NewEventFormState[K]
    ) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    }, []);

    const openDialogForDay = useCallback((day: Date, hour?: number) => {
        setFormState(prev => ({
            ...prev,
            date: format(day, "yyyy-MM-dd"),
            endDate: format(day, "yyyy-MM-dd"),
            time: hour !== undefined ? `${hour.toString().padStart(2, "0")}:00` : "09:00",
            endTime: hour !== undefined ? `${(hour + 1).toString().padStart(2, "0")}:00` : "10:00",
        }));
        setIsAllDay(false);
        setIsDialogOpen(true);
    }, []);

    const openDialogForDrag = useCallback((startDate: string, endDate: string) => {
        setFormState(prev => ({
            ...prev,
            date: startDate,
            endDate: endDate,
            time: "09:00",
            endTime: "18:00",
        }));
        setIsAllDay(false);
        setIsDialogOpen(true);
    }, []);

    const openDialogForDragCreate = useCallback((day: Date, startHour: number, endHour: number) => {
        setFormState(prev => ({
            ...prev,
            date: format(day, "yyyy-MM-dd"),
            endDate: format(day, "yyyy-MM-dd"),
            time: `${startHour.toString().padStart(2, "0")}:00`,
            endTime: `${endHour.toString().padStart(2, "0")}:00`,
        }));
        setIsAllDay(false);
        setIsDialogOpen(true);
    }, []);

    const resetForm = useCallback(() => {
        setFormState(INITIAL_EVENT_FORM_STATE);
        setIsAllDay(false);
    }, []);

    const closeDialog = useCallback(() => {
        setIsDialogOpen(false);
        resetForm();
    }, [resetForm]);

    const handleSubmit = useCallback(async (): Promise<boolean> => {
        const missingFields = [];
        if (!formState.title) missingFields.push("제목");
        if (!formState.date) missingFields.push("날짜");
        if (!isAllDay && !formState.time) missingFields.push("시작 시간");
        if (!formState.category) missingFields.push("카테고리");

        if (missingFields.length > 0) {
            toast.error(`다음 항목을 입력해주세요: ${missingFields.join(", ")}`);
            return false;
        }

        const startDateTimeStr = isAllDay
            ? `${formState.date}T00:00:00`
            : `${formState.date}T${formState.time}:00`;
        const startDate = new Date(startDateTimeStr);

        let endDate: Date | undefined;
        // Default end date logic
        const endDateStr = (formState.endDate && formState.endDate !== formState.date)
            ? formState.endDate
            : formState.date;

        const removeSeconds = (t: string) => t.length > 5 ? t.substring(0, 5) : t;

        if (isAllDay) {
            endDate = new Date(`${endDateStr}T23:59:59`);
        } else {
            const endTimeStr = formState.endTime ? removeSeconds(formState.endTime) : "23:59";
            endDate = new Date(`${endDateStr}T${endTimeStr}:00`);
        }

        const { error } = await addEvent({
            title: formState.title,
            start_date: startDate,
            end_date: endDate,
            location: formState.location || undefined,
            description: formState.description || undefined,
            category: formState.category,
            type: formState.type,
        });

        if (error) {
            console.error("Event creation error:", error);
            toast.error("일정 추가에 실패했습니다.");
            return false;
        }

        toast.success("일정이 추가되었습니다");
        closeDialog();
        return true;
    }, [formState, user, addEvent, closeDialog, isAllDay]);

    return {
        isDialogOpen,
        setIsDialogOpen,
        formState,
        isAllDay,
        setIsAllDay,
        updateField,
        openDialogForDay,
        openDialogForDrag,
        openDialogForDragCreate,
        resetForm,
        closeDialog,
        handleSubmit,
    };
}
