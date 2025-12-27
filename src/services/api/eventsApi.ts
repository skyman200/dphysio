// Events API Service - Firestore 접근 레이어
// 이 파일만 Firestore를 직접 import하고, hooks는 이 서비스를 사용

import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    getDocs,
    where,
    limit
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event, EventFormData, ApiResult } from "@/types";

// 실시간 구독을 위한 콜백 타입
type EventsSubscriber = (events: Event[]) => void;

export const eventsApi = {
    /**
     * 이벤트 목록 실시간 구독
     * @returns unsubscribe 함수
     */
    subscribe: (callback: EventsSubscriber) => {
        const q = query(
            collection(db, "events"),
            orderBy("start_date", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const events = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
                created_at: d.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
            })) as Event[];
            callback(events);
        }, (error) => {
            console.error("Events subscription error:", error);
        });

        return unsubscribe;
    },

    /**
     * 이벤트 생성
     */
    create: async (data: EventFormData, userId: string): Promise<ApiResult<Event>> => {
        try {
            const docRef = await addDoc(collection(db, "events"), {
                title: data.title,
                description: data.description || null,
                start_date: data.start_date.toISOString(),
                end_date: data.end_date?.toISOString() || null,
                location: data.location || null,
                category: data.category || "event",
                type: data.type || "department",
                created_by: userId,
                created_at: serverTimestamp(),
            });

            return {
                data: {
                    id: docRef.id,
                    title: data.title,
                    description: data.description || null,
                    start_date: data.start_date.toISOString(),
                    end_date: data.end_date?.toISOString() || null,
                    location: data.location || null,
                    category: data.category || "event",
                    type: data.type || "department",
                    created_by: userId,
                    created_at: new Date().toISOString(),
                },
                error: null,
            };
        } catch (error) {
            console.error("Error creating event:", error);
            return { error: error as Error };
        }
    },

    /**
     * 이벤트 수정
     */
    update: async (
        eventId: string,
        data: Partial<EventFormData>
    ): Promise<ApiResult<void>> => {
        try {
            const updateData: Record<string, unknown> = {};

            if (data.title !== undefined) updateData.title = data.title;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.location !== undefined) updateData.location = data.location;
            if (data.start_date !== undefined) updateData.start_date = data.start_date.toISOString();
            if (data.end_date !== undefined) updateData.end_date = data.end_date?.toISOString() || null;

            await updateDoc(doc(db, "events", eventId), updateData);
            return { error: null };
        } catch (error) {
            console.error("Error updating event:", error);
            return { error: error as Error };
        }
    },

    /**
     * 이벤트 삭제
     */
    delete: async (eventId: string): Promise<ApiResult<void>> => {
        try {
            await deleteDoc(doc(db, "events", eventId));
            return { error: null };
        } catch (error) {
            console.error("Error deleting event:", error);
            return { error: error as Error };
        }
    },

    /**
     * 특정 기간의 이벤트 조회 (일회성)
     */
    getByDateRange: async (
        startDate: Date,
        endDate: Date
    ): Promise<ApiResult<Event[]>> => {
        try {
            const q = query(
                collection(db, "events"),
                where("start_date", ">=", startDate.toISOString()),
                where("start_date", "<=", endDate.toISOString()),
                orderBy("start_date", "asc")
            );

            const snapshot = await getDocs(q);
            const events = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            })) as Event[];

            return { data: events, error: null };
        } catch (error) {
            console.error("Error fetching events by date range:", error);
            return { error: error as Error };
        }
    },

    /**
     * 최근 이벤트 조회
     */
    getRecent: async (count: number = 10): Promise<ApiResult<Event[]>> => {
        try {
            const q = query(
                collection(db, "events"),
                orderBy("created_at", "desc"),
                limit(count)
            );

            const snapshot = await getDocs(q);
            const events = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            })) as Event[];

            return { data: events, error: null };
        } catch (error) {
            console.error("Error fetching recent events:", error);
            return { error: error as Error };
        }
    },
    /**
     * 이벤트를 읽음 상태로 표시
     */
    /**
     * @description Mark event as read
     */
    markAsRead: async (eventId: string, userId: string): Promise<ApiResult<void>> => {
        try {
            const { arrayUnion } = await import("firebase/firestore");
            await updateDoc(doc(db, "events", eventId), {
                read_by: arrayUnion(userId)
            });
            return { error: null };
        } catch (error) {
            console.error("Error marking event as read:", error);
            return { error: error as Error };
        }
    },

    /**
     * 일괄 삭제 (Bulk Delete)
     * @description 여러 이벤트를 한 번에 삭제합니다. (최대 500개)
     */
    bulkDelete: async (eventIds: string[]): Promise<ApiResult<void>> => {
        try {
            const { writeBatch } = await import("firebase/firestore");
            const batch = writeBatch(db);

            eventIds.forEach((id) => {
                const docRef = doc(db, "events", id);
                batch.delete(docRef);
            });

            await batch.commit();
            return { error: null };
        } catch (error) {
            console.error("Error bulk deleting events:", error);
            return { error: error as Error };
        }
    },
};
