import { useState, useCallback } from "react";
import { collection, query, addDoc, deleteDoc, doc, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ScheduleParticipant {
  id: string;
  event_id: string;
  profile_id: string;
  created_at: string;
}

/**
 * 일정 참여자 관리 훅
 * 
 * 🔧 개선사항:
 * - 전체 컬렉션 구독 제거 (Firestore 비용 절감)
 * - 필요할 때만 특정 이벤트의 참여자 조회
 * - Promise.all로 병렬 삭제 처리
 * - 에러 시 사용자 토스트 알림
 */
export function useScheduleParticipants() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // 캐시된 참여자 맵 (eventId -> participants[])
  const [participantsCache, setParticipantsCache] = useState<Map<string, ScheduleParticipant[]>>(new Map());

  /**
   * 특정 이벤트의 참여자 조회 (온디맨드)
   */
  const fetchParticipantsByEvent = useCallback(async (eventId: string): Promise<ScheduleParticipant[]> => {
    if (!user) return [];

    try {
      const q = query(
        collection(db, "schedule_participants"),
        where("event_id", "==", eventId)
      );
      const snapshot = await getDocs(q);
      const participants = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ScheduleParticipant[];

      // 캐시 업데이트
      setParticipantsCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(eventId, participants);
        return newCache;
      });

      return participants;
    } catch (error) {
      console.error("Error fetching participants:", error);
      toast.error("참여자 목록을 불러오는데 실패했습니다.");
      return [];
    }
  }, [user]);

  /**
   * 특정 프로필의 참여 이벤트 조회
   */
  const fetchEventsByParticipant = useCallback(async (profileId: string): Promise<ScheduleParticipant[]> => {
    if (!user) return [];

    try {
      const q = query(
        collection(db, "schedule_participants"),
        where("profile_id", "==", profileId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ScheduleParticipant[];
    } catch (error) {
      console.error("Error fetching participant events:", error);
      toast.error("참여 일정을 불러오는데 실패했습니다.");
      return [];
    }
  }, [user]);

  /**
   * 참여자 추가
   */
  const addParticipant = useCallback(async (eventId: string, profileId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    setLoading(true);
    try {
      await addDoc(collection(db, "schedule_participants"), {
        event_id: eventId,
        profile_id: profileId,
        user_id: user.uid, // 보안: 생성자 ID 추가
        created_at: serverTimestamp(),
      });

      // 캐시 무효화
      setParticipantsCache((prev) => {
        const newCache = new Map(prev);
        newCache.delete(eventId);
        return newCache;
      });

      return { error: null };
    } catch (error) {
      console.error("Error adding participant:", error);
      toast.error("참여자 추가에 실패했습니다.");
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * 참여자 삭제 (병렬 처리로 성능 개선)
   */
  const removeParticipant = useCallback(async (eventId: string, profileId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    setLoading(true);
    try {
      const q = query(
        collection(db, "schedule_participants"),
        where("event_id", "==", eventId),
        where("profile_id", "==", profileId)
      );
      const snapshot = await getDocs(q);

      // 🔧 병렬 삭제 (이전: for loop + await)
      await Promise.all(
        snapshot.docs.map((docSnap) =>
          deleteDoc(doc(db, "schedule_participants", docSnap.id))
        )
      );

      // 캐시 무효화
      setParticipantsCache((prev) => {
        const newCache = new Map(prev);
        newCache.delete(eventId);
        return newCache;
      });

      return { error: null };
    } catch (error) {
      console.error("Error removing participant:", error);
      toast.error("참여자 삭제에 실패했습니다.");
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * 캐시된 참여자 반환 (있으면 캐시, 없으면 빈 배열 + 비동기 조회 트리거)
   */
  const getParticipantsByEvent = useCallback((eventId: string) => {
    const cached = participantsCache.get(eventId);
    if (cached !== undefined) {
      return cached;
    }

    // 캐시 미스: 비동기 조회 트리거 (결과는 나중에 캐시됨)
    fetchParticipantsByEvent(eventId);
    return [];
  }, [participantsCache, fetchParticipantsByEvent]);

  /**
   * 캐시 강제 갱신
   */
  const refreshParticipants = useCallback(async (eventId: string) => {
    await fetchParticipantsByEvent(eventId);
  }, [fetchParticipantsByEvent]);

  return {
    loading,
    addParticipant,
    removeParticipant,
    getParticipantsByEvent,
    fetchParticipantsByEvent,
    fetchEventsByParticipant,
    refreshParticipants,
  };
}

