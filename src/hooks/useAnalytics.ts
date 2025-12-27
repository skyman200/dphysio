import { useState, useCallback } from 'react';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useProfiles } from './useProfiles';
import { ActivityType } from './useActivityLogger';

export interface UserStats {
    userId: string;
    name: string;
    role: string;
    totalActions: number;
    breakdown: {
        reservations: number;
        notices: number;
        tasks: number;
        files: number;
        messages: number;
        others: number;
    };
    details: any[]; // Raw logs for drill-down/export
    timeStats: {
        meetings: number;
        counseling: number;
        education: number;
        trips: number;
        personal: number;
        report: number;
        admin: number;
        others: number;
    };
    events: any[]; // Raw calendar events for time tracking details
}

export type TimeRange = 'day' | 'week' | 'month';

export function useAnalytics() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<UserStats[]>([]);
    const { profiles } = useProfiles();

    const fetchStats = useCallback(async (range: TimeRange, date: Date = new Date()) => {
        setLoading(true);
        try {
            let start: Date;
            let end: Date;

            if (range === 'day') {
                start = startOfDay(date);
                end = endOfDay(date);
            } else if (range === 'week') {
                start = startOfWeek(date, { weekStartsOn: 1 });
                end = endOfWeek(date, { weekStartsOn: 1 });
            } else {
                start = startOfMonth(date);
                end = endOfMonth(date);
            }

            const logsRef = collection(db, 'activity_logs');
            const q = query(
                logsRef,
                where('created_at', '>=', start),
                where('created_at', '<=', end),
                orderBy('created_at', 'desc')
            );

            const snapshot = await getDocs(q);
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

            // Aggregation Logic
            const userMap = new Map<string, UserStats>();

            // Initialize map with all profiles to ensure everyone is listed
            if (Array.isArray(profiles)) {
                profiles.forEach(p => {
                    userMap.set(p.user_id, {
                        userId: p.user_id,
                        name: p.name,
                        role: p.role,
                        totalActions: 0,
                        breakdown: { reservations: 0, notices: 0, tasks: 0, files: 0, messages: 0, others: 0 },
                        details: [],
                        timeStats: { meetings: 0, counseling: 0, education: 0, trips: 0, personal: 0, report: 0, admin: 0, others: 0 },
                        events: []
                    });
                });
            }

            logs.forEach(log => {
                const userId = log.user_id;
                if (!userMap.has(userId)) {
                    // If user not in profiles (e.g. deleted user), create placeholder
                    userMap.set(userId, {
                        userId,
                        name: 'Unknown User',
                        role: 'Unknown',
                        totalActions: 0,
                        breakdown: { reservations: 0, notices: 0, tasks: 0, files: 0, messages: 0, others: 0 },
                        details: [],
                        timeStats: { meetings: 0, counseling: 0, education: 0, trips: 0, personal: 0, report: 0, admin: 0, others: 0 },
                        events: []
                    });
                }

                const userStat = userMap.get(userId)!;
                userStat.totalActions++;
                userStat.details.push(log);

                const type = log.action_type as ActivityType;
                if (type.startsWith('reservation_')) userStat.breakdown.reservations++;
                else if (type.startsWith('announcement_') || type === 'event_create') userStat.breakdown.notices++;
                else if (type.startsWith('meeting_item_') || type === 'event_update') userStat.breakdown.tasks++;
                else if (type.startsWith('file_')) userStat.breakdown.files++;
                else if (type === 'message_send') userStat.breakdown.messages++;
                else userStat.breakdown.others++;
            });

            // Fetch Calendar Events for Time Tracking
            const eventsRef = collection(db, 'events');

            // Build event query - simple range query, filtering in memory for category/user might be easier if volume is low,
            // but let's try to be efficient. However, we need ALL users' events to aggregate.
            const eventsQ = query(
                eventsRef,
                where('start_date', '>=', start.toISOString()),
                where('start_date', '<=', end.toISOString())
            );

            const eventsSnapshot = await getDocs(eventsQ);

            eventsSnapshot.docs.forEach(doc => {
                const event = doc.data();
                const userId = event.created_by;
                const userStat = userMap.get(userId);

                if (userStat) {
                    const startDate = new Date(event.start_date);
                    const endDate = event.end_date ? new Date(event.end_date) : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour
                    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

                    // Track strict categories
                    const cat = event.category || 'other';

                    if (cat === 'meeting' || event.title.includes('회의')) userStat.timeStats.meetings += durationHours;
                    else if (cat === 'counseling') userStat.timeStats.counseling += durationHours;
                    else if (cat === 'education' || event.title.includes('교육')) userStat.timeStats.education += durationHours;
                    else if (cat === 'trip' || event.title.includes('출장')) userStat.timeStats.trips += durationHours;
                    else if (cat === 'personal') userStat.timeStats.personal += durationHours;
                    else if (cat === 'report') userStat.timeStats.report += durationHours;
                    else if (cat === 'admin') userStat.timeStats.admin += durationHours;
                    else userStat.timeStats.others += durationHours;

                    // Push to events list with duration
                    userStat.events.push({ ...event, durationHours });
                }
            });

            setStats(Array.from(userMap.values()).sort((a, b) => b.totalActions - a.totalActions));
        } catch (error) {
            console.error("Analytics Error:", error);
        } finally {
            setLoading(false);
        }
    }, [profiles]);

    return {
        loading,
        stats,
        fetchStats
    };
}
