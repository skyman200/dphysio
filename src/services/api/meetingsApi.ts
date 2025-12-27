import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    where,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ============================================
// Meeting Items API 서비스
// ============================================

export type MeetingItemType = "decision" | "action" | "link";
export type MeetingItemStatus = "open" | "doing" | "done";

export interface MeetingItem {
    id: string;
    event_id: string;
    type: MeetingItemType;
    content: string;
    owner_id: string | null;
    due_at: string | null;
    status: MeetingItemStatus;
    source_message_id: string | null;
    created_by: string;
    created_at: string;
}

export interface MeetingItemFormData {
    type: MeetingItemType;
    content: string;
    owner_id?: string;
    due_at?: string;
    source_message_id?: string;
    created_by: string;
}

export interface ApiResult<T> {
    data?: T;
    error: Error | null;
}

type MeetingItemsSubscriber = (items: MeetingItem[]) => void;

export const meetingsApi = {
    /**
     * 특정 이벤트의 meeting items 실시간 구독
     */
    subscribeByEvent: (
        eventId: string,
        callback: MeetingItemsSubscriber
    ): (() => void) => {
        const itemsRef = collection(db, "meeting_items");
        const q = query(
            itemsRef,
            where("event_id", "==", eventId),
            orderBy("created_at", "desc")
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const items: MeetingItem[] = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        // Convert Firestore Timestamp to string
                        created_at: data.created_at?.toDate().toISOString() || new Date().toISOString(),
                        due_at: data.due_at ? (typeof data.due_at === 'string' ? data.due_at : data.due_at.toDate().toISOString()) : null,
                    } as MeetingItem;
                });
                callback(items);
            },
            (error) => {
                console.error("Error fetching meeting items:", error);
            }
        );

        return unsubscribe;
    },

    /**
     * 모든 meeting items 실시간 구독
     */
    subscribeAll: (callback: MeetingItemsSubscriber): (() => void) => {
        const itemsRef = collection(db, "meeting_items");
        const q = query(itemsRef, orderBy("created_at", "desc"));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const items: MeetingItem[] = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        created_at: data.created_at?.toDate().toISOString() || new Date().toISOString(),
                        due_at: data.due_at ? (typeof data.due_at === 'string' ? data.due_at : data.due_at.toDate().toISOString()) : null,
                    } as MeetingItem;
                });
                callback(items);
            },
            (error) => {
                console.error("Error fetching all meeting items:", error);
            }
        );

        return unsubscribe;
    },

    /**
     * Meeting item 생성
     */
    create: async (
        eventId: string,
        data: MeetingItemFormData
    ): Promise<ApiResult<MeetingItem>> => {
        try {
            const docRef = await addDoc(collection(db, "meeting_items"), {
                event_id: eventId,
                type: data.type,
                content: data.content,
                owner_id: data.owner_id || null,
                due_at: data.due_at || null,
                source_message_id: data.source_message_id || null,
                created_by: data.created_by,
                status: "open",
                created_at: serverTimestamp(),
            });

            return {
                data: {
                    id: docRef.id,
                    event_id: eventId,
                    type: data.type,
                    content: data.content,
                    owner_id: data.owner_id || null,
                    due_at: data.due_at || null,
                    source_message_id: data.source_message_id || null,
                    created_by: data.created_by,
                    status: "open",
                    created_at: new Date().toISOString(),
                },
                error: null,
            };
        } catch (error) {
            console.error("Error creating meeting item:", error);
            return { error: error as Error };
        }
    },

    /**
     * Meeting item 상태 업데이트
     */
    updateStatus: async (
        itemId: string,
        status: MeetingItemStatus
    ): Promise<ApiResult<void>> => {
        try {
            await updateDoc(doc(db, "meeting_items", itemId), { status });
            return { error: null };
        } catch (error) {
            console.error("Error updating meeting item status:", error);
            return { error: error as Error };
        }
    },

    /**
     * Meeting item 삭제
     */
    delete: async (itemId: string): Promise<ApiResult<void>> => {
        try {
            await deleteDoc(doc(db, "meeting_items", itemId));
            return { error: null };
        } catch (error) {
            console.error("Error deleting meeting item:", error);
            return { error: error as Error };
        }
    },
};
