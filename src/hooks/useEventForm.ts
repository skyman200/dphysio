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
        setIsDialogOpen(true);
    }, []);

    const resetForm = useCallback(() => {
        setFormState(INITIAL_EVENT_FORM_STATE);
    }, []);

    const closeDialog = useCallback(() => {
        setIsDialogOpen(false);
        resetForm();
    }, [resetForm]);

    const handleSubmit = useCallback(async (): Promise<boolean> => {
        if (!formState.title || !formState.date || !formState.time || !formState.category || !user) {
            toast.error("필수 항목을 모두 입력해주세요 (카테고리 포함)");
            return false;
        }

        const startDate = new Date(`${formState.date}T${formState.time}:00`);

        let endDate: Date | undefined;
        if (formState.endDate && formState.endDate !== formState.date) {
            endDate = new Date(`${formState.endDate}T${formState.endTime || "23:59"}:00`);
        } else if (formState.endTime) {
            endDate = new Date(`${formState.date}T${formState.endTime}:00`);
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
            toast.error("일정 추가에 실패했습니다. 데이터베이스 설정을 확인해주세요.");
            return false;
        }

        toast.success("일정이 추가되었습니다");
        closeDialog();
        return true;
    }, [formState, user, addEvent, closeDialog]);

    return {
        isDialogOpen,
        setIsDialogOpen,
        formState,
        updateField,
        openDialogForDay,
        openDialogForDrag,
        openDialogForDragCreate,
        resetForm,
        closeDialog,
        handleSubmit,
    };
}
