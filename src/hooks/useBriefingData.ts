import { useMemo } from 'react';
import { useEvents } from './useEvents';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, isSameDay, startOfDay, parseISO, isAfter } from 'date-fns';

export type BriefingItemType = 'urgent' | 'notice' | 'schedule';

export interface BriefingItem {
    id: string;
    type: BriefingItemType;
    title: string;
    description: string;
    date?: Date;
    link?: string;
    actionLabel?: string;
}

export function useBriefingData() {
    const { events, loading } = useEvents();
    const { user } = useAuth();

    const briefingItems = useMemo(() => {
        if (!events || events.length === 0) return [];

        const items: BriefingItem[] = [];
        const now = new Date();
        const today = startOfDay(now);
        const tomorrow = addDays(today, 1);

        // 1. Urgent Tasks: High Priority or Deadline Today/Tomorrow
        // We treat events ending today or tomorrow as urgent if they are NOT 'meeting' type (assuming tasks/deadlines)
        // or if they explicitly have 'urgent' in title.
        const urgentEvents = events.filter(e => {
            if (!e.end_date) return false;
            const end = parseISO(e.end_date);
            const isImminent = isSameDay(end, today) || isSameDay(end, tomorrow);
            // Exclude past events
            if (isAfter(now, end)) return false;

            // Simple heuristic: if it's not a meeting (e.g. it's a deadline) or title has '마감'/'제출'
            const isTaskLike = e.type !== 'meeting' || e.title.includes('마감') || e.title.includes('제출');

            return isImminent && isTaskLike;
        });

        urgentEvents.forEach(e => {
            const end = parseISO(e.end_date!);
            items.push({
                id: e.id,
                type: 'urgent',
                title: `🚨 마감 임박: ${e.title}`,
                description: `마감 시간: ${end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}. 잊지 않으셨나요?`,
                date: end,
                actionLabel: '확인했습니다'
            });
        });

        // 2. Notices: Recent notices (created or starting within last 3 days or future)
        // Filter by category 'notice'
        const notices = events
            .filter(e => e.category === 'notice')
            .sort((a, b) => b.created_at.localeCompare(a.created_at)) // Newest first
            .slice(0, 2); // Take top 2

        notices.forEach(e => {
            items.push({
                id: e.id,
                type: 'notice',
                title: `📢 공지: ${e.title}`,
                description: e.description ? (e.description.length > 50 ? e.description.substring(0, 50) + '...' : e.description) : '새로운 필수 공지사항입니다.',
                date: parseISO(e.start_date),
                actionLabel: '내용 확인'
            });
        });

        // 3. Schedule: First meeting of today that hasn't passed yet
        const todayMeetings = events
            .filter(e => {
                const start = parseISO(e.start_date);
                return isSameDay(start, today) && isAfter(start, now) && e.category !== 'notice';
            })
            .sort((a, b) => a.start_date.localeCompare(b.start_date));

        if (todayMeetings.length > 0) {
            const firstMeeting = todayMeetings[0];
            const start = parseISO(firstMeeting.start_date);
            items.push({
                id: firstMeeting.id,
                type: 'schedule',
                title: `🗓️ 다음 일정: ${firstMeeting.title}`,
                description: `${start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 시작입니다. 준비되셨나요?`,
                date: start,
                actionLabel: '준비 완료'
            });
        }

        // Sort items by priority: urgent > notice > schedule
        // We already added them in roughly that order, but `items` is just pushed.
        // If we want mixed sort, we could do it here. But grouped is fine for "Story" flow.
        // Urgent first is good.

        return items;
    }, [events]);

    return { briefingItems, loading };
}
