import { useMemo } from 'react';
import { useEvents } from '@/hooks/useEvents';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import { DashboardEvent } from '@/types';

export const useDashboardData = () => {
    const { events } = useEvents();

    const dashboardEvents: DashboardEvent[] = useMemo(() => {
        const today = startOfDay(new Date());

        return events.map((event) => {
            const eventDate = parseISO(event.start_date);
            const dDay = differenceInDays(startOfDay(eventDate), today);

            let type: 'URGENT' | 'NOTICE' | 'NORMAL' = 'NORMAL';

            // Determine Type
            // 1. Urgent: D-Day is between 0 and 3 (inclusive)
            if (dDay >= 0 && dDay <= 3) {
                type = 'URGENT';
            }
            // 2. Notice: Category is 'notice' (checking various casing/fields just in case)
            else if (event.category === 'notice' || event.type === 'notice') {
                type = 'NOTICE';
            }

            return {
                id: event.id,
                title: event.title,
                type,
                dDay: dDay >= 0 ? dDay : undefined,
                date: event.start_date, // Keep ISO string for now, format later
                content: event.description || '상세 내용이 없습니다.',
                category: event.category || 'general',
                originalDate: eventDate,
                createdBy: event.created_by,
                read_by: event.read_by || [],
                location: event.location || undefined,
                end_date: event.end_date || null,
            };
        }).filter(e => {
            // Optional: Filter out past events if desired, or keep them. 
            // For now, let's keep everything but maybe sort past events to bottom?
            // Actually, let's filter out events older than yesterday for the "Action" list?
            // Keeping it simple: Show all valid future/recent events.
            return true;
        });
    }, [events]);

    return { dashboardEvents };
};
