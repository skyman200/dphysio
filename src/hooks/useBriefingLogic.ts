import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useBriefingData } from './useBriefingData';

export const useBriefingLogic = () => {
    const { briefingItems, loading } = useBriefingData();
    const [isOpen, setIsOpen] = useState(false);

    // Calculate today's date string for localStorage key
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const STORAGE_KEY = 'briefing_last_checked';

    useEffect(() => {
        if (loading) return;

        // 1. Check if already checked today
        const lastChecked = localStorage.getItem(STORAGE_KEY);
        const hasCheckedToday = lastChecked === todayStr;

        // 2. Determine visibility
        // Show if: (Not checked today AND has items)
        if (!hasCheckedToday && briefingItems.length > 0) {
            setIsOpen(true);
        }

    }, [briefingItems, loading, todayStr]);

    const confirmBriefing = () => {
        localStorage.setItem(STORAGE_KEY, todayStr);
        setIsOpen(false);
    };

    return {
        isOpen,
        briefingItems,
        confirmBriefing
    };
};
