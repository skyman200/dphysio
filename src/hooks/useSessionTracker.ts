import { useEffect, useRef, useCallback } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const SESSION_TIMEOUT = 60000; // 1 minute without activity = session end

interface PageVisit {
    path: string;
    entered_at: number;
    duration: number;
}

export function useSessionTracker() {
    const { user } = useAuth();
    const location = useLocation();
    const sessionIdRef = useRef<string | null>(null);
    const sessionStartRef = useRef<number | null>(null);
    const currentPageRef = useRef<{ path: string; enteredAt: number } | null>(null);
    const pagesVisitedRef = useRef<PageVisit[]>([]);
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Start a new session
    const startSession = useCallback(async () => {
        if (!user || sessionIdRef.current) return;

        try {
            const docRef = await addDoc(collection(db, 'user_sessions'), {
                user_id: user.uid,
                started_at: serverTimestamp(),
                ended_at: null,
                duration_seconds: 0,
                pages_visited: [],
                last_heartbeat: serverTimestamp(),
                is_active: true,
            });

            sessionIdRef.current = docRef.id;
            sessionStartRef.current = Date.now();
            console.log('[SessionTracker] Session started:', docRef.id);
        } catch (error) {
            console.error('[SessionTracker] Failed to start session:', error);
        }
    }, [user]);

    // End the current session
    const endSession = useCallback(async () => {
        if (!sessionIdRef.current || !sessionStartRef.current) return;

        // Record last page duration
        if (currentPageRef.current) {
            pagesVisitedRef.current.push({
                path: currentPageRef.current.path,
                entered_at: currentPageRef.current.enteredAt,
                duration: Math.round((Date.now() - currentPageRef.current.enteredAt) / 1000),
            });
        }

        const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);

        try {
            await updateDoc(doc(db, 'user_sessions', sessionIdRef.current), {
                ended_at: serverTimestamp(),
                duration_seconds: durationSeconds,
                pages_visited: pagesVisitedRef.current,
                is_active: false,
            });
            console.log('[SessionTracker] Session ended. Duration:', durationSeconds, 'seconds');
        } catch (error) {
            console.error('[SessionTracker] Failed to end session:', error);
        }

        // Reset refs
        sessionIdRef.current = null;
        sessionStartRef.current = null;
        currentPageRef.current = null;
        pagesVisitedRef.current = [];
    }, []);

    // Update heartbeat
    const updateHeartbeat = useCallback(async () => {
        if (!sessionIdRef.current || !sessionStartRef.current) return;

        const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);

        try {
            await updateDoc(doc(db, 'user_sessions', sessionIdRef.current), {
                last_heartbeat: serverTimestamp(),
                duration_seconds: durationSeconds,
            });
        } catch (error) {
            console.error('[SessionTracker] Failed to update heartbeat:', error);
        }
    }, []);

    // Track page changes
    useEffect(() => {
        if (!sessionIdRef.current) return;

        // Record previous page duration
        if (currentPageRef.current && currentPageRef.current.path !== location.pathname) {
            pagesVisitedRef.current.push({
                path: currentPageRef.current.path,
                entered_at: currentPageRef.current.enteredAt,
                duration: Math.round((Date.now() - currentPageRef.current.enteredAt) / 1000),
            });
        }

        // Start tracking new page
        currentPageRef.current = {
            path: location.pathname,
            enteredAt: Date.now(),
        };
    }, [location.pathname]);

    // Start session on mount, end on unmount
    useEffect(() => {
        if (user) {
            startSession();

            // Set up heartbeat
            heartbeatIntervalRef.current = setInterval(updateHeartbeat, HEARTBEAT_INTERVAL);

            // Handle page unload
            const handleBeforeUnload = () => {
                endSession();
            };

            window.addEventListener('beforeunload', handleBeforeUnload);

            return () => {
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                }
                window.removeEventListener('beforeunload', handleBeforeUnload);
                endSession();
            };
        }
    }, [user, startSession, endSession, updateHeartbeat]);

    return {
        sessionId: sessionIdRef.current,
        endSession,
    };
}
