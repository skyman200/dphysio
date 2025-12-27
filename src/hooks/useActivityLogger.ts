import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

export type ActivityType =
    | 'event_create'
    | 'event_update'
    | 'event_delete'
    | 'reservation_create'
    | 'reservation_cancel'
    | 'meeting_item_add'
    | 'meeting_item_update'
    | 'meeting_item_delete'
    | 'message_send'
    | 'file_upload'
    | 'file_delete'
    | 'announcement_create'
    | 'page_view';

interface ActivityLogData {
    type: ActivityType;
    targetId?: string;
    metadata?: Record<string, unknown>;
}

export function useActivityLogger() {
    const { user } = useAuth();

    const logActivity = useCallback(async (data: ActivityLogData) => {
        if (!user) return;

        try {
            await addDoc(collection(db, 'activity_logs'), {
                user_id: user.uid,
                action_type: data.type,
                target_id: data.targetId || null,
                metadata: data.metadata || null,
                created_at: serverTimestamp(),
            });
        } catch (error) {
            // Silently fail - logging should not block user actions
            console.error('[ActivityLogger] Failed to log activity:', error);
        }
    }, [user]);

    // Convenience methods for common actions
    const logEventCreate = useCallback((eventId: string, title: string) => {
        return logActivity({ type: 'event_create', targetId: eventId, metadata: { title } });
    }, [logActivity]);

    const logEventUpdate = useCallback((eventId: string, title: string) => {
        return logActivity({ type: 'event_update', targetId: eventId, metadata: { title } });
    }, [logActivity]);

    const logEventDelete = useCallback((eventId: string, title: string) => {
        return logActivity({ type: 'event_delete', targetId: eventId, metadata: { title } });
    }, [logActivity]);

    const logReservationCreate = useCallback((reservationId: string, resourceName: string) => {
        return logActivity({ type: 'reservation_create', targetId: reservationId, metadata: { resourceName } });
    }, [logActivity]);

    const logReservationCancel = useCallback((reservationId: string, resourceName: string) => {
        return logActivity({ type: 'reservation_cancel', targetId: reservationId, metadata: { resourceName } });
    }, [logActivity]);

    const logMeetingItemAdd = useCallback((itemId: string, itemType: string, eventId: string) => {
        return logActivity({ type: 'meeting_item_add', targetId: itemId, metadata: { itemType, eventId } });
    }, [logActivity]);

    const logMessageSend = useCallback((messageId: string, eventId: string) => {
        return logActivity({ type: 'message_send', targetId: messageId, metadata: { eventId } });
    }, [logActivity]);

    const logFileUpload = useCallback((fileId: string, fileName: string, fileSize: number) => {
        return logActivity({ type: 'file_upload', targetId: fileId, metadata: { fileName, fileSize } });
    }, [logActivity]);

    const logAnnouncementCreate = useCallback((announcementId: string, title: string) => {
        return logActivity({ type: 'announcement_create', targetId: announcementId, metadata: { title } });
    }, [logActivity]);

    const logPageView = useCallback((path: string) => {
        return logActivity({ type: 'page_view', metadata: { path } });
    }, [logActivity]);

    return {
        logActivity,
        logEventCreate,
        logEventUpdate,
        logEventDelete,
        logReservationCreate,
        logReservationCancel,
        logMeetingItemAdd,
        logMessageSend,
        logFileUpload,
        logAnnouncementCreate,
        logPageView,
    };
}
