import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityLogger } from "./useActivityLogger";

export interface Resource {
  id: string;
  name: string;
  type: string;
  description: string | null;
  capacity: number | null;
  created_at: string;
}

export interface Reservation {
  id: string;
  resource_id: string;
  user_id: string;
  todo_id: string | null;
  booker_name?: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
}

export function useResources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { logReservationCreate, logReservationCancel } = useActivityLogger();

  useEffect(() => {
    if (!user) {
      setResources([]);
      setReservations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Subscribe to resources
    const resourcesRef = collection(db, "resources");
    const resourcesQ = query(resourcesRef, orderBy("name"));
    const unsubResources = onSnapshot(resourcesQ, (snapshot) => {
      setResources(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Resource[]);
    });

    // Subscribe to reservations
    const reservationsRef = collection(db, "reservations");
    const reservationsQ = query(reservationsRef, orderBy("start_time"));
    const unsubReservations = onSnapshot(reservationsQ, (snapshot) => {
      setReservations(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Reservation[]);
      setLoading(false);
    });

    return () => {
      unsubResources();
      unsubReservations();
    };
  }, [user]);

  const addReservation = async (reservation: {
    resource_id: string;
    title: string;
    description?: string;
    start_time: Date;
    end_time: Date;
    todo_id?: string;
    booker_name?: string;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      const { runTransaction } = await import("firebase/firestore");

      const result = await runTransaction(db, async (transaction) => {
        // 1. Resource 정보(수용 인원) 조회
        const resourceRef = doc(db, "resources", reservation.resource_id);
        const resourceSnap = await transaction.get(resourceRef);
        if (!resourceSnap.exists()) {
          throw { type: "NOT_FOUND", message: "Resource not found" };
        }
        const resourceData = resourceSnap.data();
        const capacity = resourceData.capacity || 1;

        // 2. 해당 자원의 모든 'confirmed' 예약 조회
        // (Firestore 쿼리 한계로 status와 resource_id로만 필터링하고, 메모리에서 시간 겹침 처리)
        const reservationsRef = collection(db, "reservations");
        const conflictQ = query(
          reservationsRef,
          where("resource_id", "==", reservation.resource_id),
          where("status", "==", "confirmed")
        );
        const existingSnap = await getDocs(conflictQ);

        // 3. Peak Usage Algorithm (최대 동시 사용 인원 계산)
        interface TimePoint {
          time: number;
          type: 1 | -1; // 1: start, -1: end
          id: string;
        }

        const events: TimePoint[] = [];

        // 3-1. 신규 예약 추가
        events.push({ time: reservation.start_time.getTime(), type: 1, id: "new_reservation" });
        events.push({ time: reservation.end_time.getTime(), type: -1, id: "new_reservation" });

        // 3-2. 기존 예약 중 겹치는 것만 필터링하여 이벤트 추가
        const overlappingReservations = existingSnap.docs.filter((docSnap) => {
          const data = docSnap.data();
          const existingStart = new Date(data.start_time).getTime();
          const existingEnd = new Date(data.end_time).getTime();
          const myStart = reservation.start_time.getTime();
          const myEnd = reservation.end_time.getTime();

          // 교집합이 있는지 확인
          if (existingStart < myEnd && existingEnd > myStart) {
            events.push({ time: existingStart, type: 1, id: docSnap.id });
            events.push({ time: existingEnd, type: -1, id: docSnap.id });
            return true;
          }
          return false;
        });

        // 3-3. 시간순 정렬 (동시간대일 경우 종료 이벤트를 먼저 처리하여 '사이' 틈새 허용)
        events.sort((a, b) => {
          if (a.time !== b.time) return a.time - b.time;
          return a.type - b.type;
        });

        // 3-4. 순회하며 Peak 계산
        let currentUsage = 0;
        let maxUsage = 0;

        for (const event of events) {
          currentUsage += event.type;
          if (currentUsage > maxUsage) {
            maxUsage = currentUsage;
          }
        }

        // 4. 수용 인원 체크
        if (maxUsage > capacity) {
          // 충돌 발생. 겹치는 예약자 중 한 명의 ID 반환 (UI용)
          // overlappingReservations[0]가 없을 수도 있나? maxUsage > capacity인데?
          // 자기 자신만으로 capacity 넘는 경우는 없음 (capacity >= 1 가정)
          const conflictUserId = overlappingReservations.length > 0
            ? overlappingReservations[0].data().user_id
            : "unknown";

          throw { type: "CONFLICT", userId: conflictUserId, currentCount: maxUsage - 1, capacity }; // -1 for excluding self
        }

        // 5. 예약 생성
        const newDocRef = doc(collection(db, "reservations"));
        transaction.set(newDocRef, {
          resource_id: reservation.resource_id,
          user_id: user.uid,
          booker_name: reservation.booker_name || null,
          title: reservation.title,
          description: reservation.description || null,
          start_time: reservation.start_time.toISOString(),
          end_time: reservation.end_time.toISOString(),
          todo_id: reservation.todo_id || null,
          status: "confirmed",
          created_at: new Date().toISOString(),
        });

        return newDocRef.id;
      });

      if (result) {
        logReservationCreate(result, reservation.title);
      }

      return { error: null, reservationId: result };
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "type" in error) {
        const customError = error as { type: string; userId?: string; currentCount?: number; capacity?: number };
        if (customError.type === "CONFLICT") {
          return {
            error: new Error("CONFLICT"),
            conflictUserId: customError.userId,
            details: {
              currentCount: customError.currentCount,
              capacity: customError.capacity
            }
          };
        }
      }
      return { error: error as Error };
    }
  };

  const deleteReservation = async (id: string) => {
    try {
      await deleteDoc(doc(db, "reservations", id));
      logReservationCancel(id, 'Reservation Cancelled');
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const getResourceStatus = (resourceId: string) => {
    const now = new Date();

    // 현재 시간과 겹치는 모든 예약 찾기
    const activeReservations = reservations.filter(
      (r) =>
        r.resource_id === resourceId &&
        r.status === "confirmed" &&
        new Date(r.start_time) <= now &&
        new Date(r.end_time) > now
    );

    const resource = resources.find(r => r.id === resourceId);
    const capacity = resource?.capacity || 1;
    const currentCount = activeReservations.length;

    if (activeReservations.length > 0) {
      // 가장 빨리 끝나는 예약 기준으로 남은 시간 표시 (또는 다른 로직?)
      // 여기서는 첫 번째(혹은 가장 빨리 끝나는) 예약의 남은 시간을 표시하되,
      // UI에서 "N/M 명 사용 중"으로 표시할 것임.

      // 예약 중 하나라도 있으면 occupied 상태로 보되, detail을 반환
      const sortedByEnd = [...activeReservations].sort((a, b) =>
        new Date(a.end_time).getTime() - new Date(b.end_time).getTime()
      );

      const nextEndTime = new Date(sortedByEnd[0].end_time);
      const remainingMinutes = Math.ceil((nextEndTime.getTime() - now.getTime()) / (1000 * 60));

      return {
        status: currentCount >= capacity ? "occupied" : "partial" as const,
        reservation: activeReservations[0], // 대표 예약 하나 (하위 호환성)
        activeReservations: activeReservations, // 전체 예약 리스트
        remainingMinutes,
        currentCount,
        capacity,
        isFull: currentCount >= capacity
      };
    }

    return {
      status: "available" as const,
      reservation: null,
      activeReservations: [],
      remainingMinutes: 0,
      currentCount: 0,
      capacity,
      isFull: false
    };
  };

  return {
    resources,
    reservations,
    loading,
    addReservation,
    deleteReservation,
    getResourceStatus,
  };
}
