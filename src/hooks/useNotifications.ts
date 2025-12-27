import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useProfiles } from "@/hooks/useProfiles";

interface UnreadEvent {
  event_id: string;
  event_title: string;
  unread_count: number;
}

interface NotificationCounts {
  unreadMessagesCount: number;
  urgentActionsCount: number;
  unreadEvents: UnreadEvent[];
  loading: boolean;
}

interface MessageData {
  event_id: string;
  user_id: string;
  created_at: Date;
}

export function useNotifications(): NotificationCounts {
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [urgentActionsCount, setUrgentActionsCount] = useState(0);
  const [unreadEvents, setUnreadEvents] = useState<UnreadEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { currentProfile } = useProfiles();

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // 1. 사용자의 thread_reads 가져오기 (1번 쿼리)
      const threadReadsQ = query(
        collection(db, "thread_reads"),
        where("user_id", "==", user.uid)
      );
      const threadReadsSnap = await getDocs(threadReadsQ);
      const readMap = new Map<string, Date>();
      threadReadsSnap.docs.forEach((doc) => {
        const data = doc.data();
        const lastRead = data.last_read_at?.toDate?.() || new Date(data.last_read_at);
        readMap.set(data.event_id, lastRead);
      });

      // 2. 최근 이벤트들 가져오기 (1번 쿼리)
      const eventsQ = query(
        collection(db, "events"),
        orderBy("created_at", "desc"),
        limit(50)
      );
      const eventsSnap = await getDocs(eventsQ);

      // 이벤트 ID 목록과 제목 맵 생성
      const eventIds = eventsSnap.docs.map(d => d.id);
      const eventTitles = new Map<string, string>();
      eventsSnap.docs.forEach(d => {
        eventTitles.set(d.id, d.data().title);
      });

      // 3. 모든 관련 메시지를 한 번에 가져오기 (1번 쿼리 - N+1 해결!)
      // Firestore 'in' 쿼리는 최대 30개까지 지원
      const messagesByEvent = new Map<string, MessageData[]>();

      // 이벤트를 30개씩 나눠서 쿼리 (in 쿼리 제한)
      const chunks = [];
      for (let i = 0; i < eventIds.length; i += 30) {
        chunks.push(eventIds.slice(i, i + 30));
      }

      for (const chunk of chunks) {
        if (chunk.length === 0) continue;

        const messagesQ = query(
          collection(db, "thread_messages"),
          where("event_id", "in", chunk),
          where("user_id", "!=", user.uid)  // 내가 쓴 건 제외
        );
        const messagesSnap = await getDocs(messagesQ);

        messagesSnap.docs.forEach((msgDoc) => {
          const msgData = msgDoc.data();
          const eventId = msgData.event_id;
          const msgDate = msgData.created_at?.toDate?.() || new Date(msgData.created_at);

          if (!messagesByEvent.has(eventId)) {
            messagesByEvent.set(eventId, []);
          }
          messagesByEvent.get(eventId)!.push({
            event_id: eventId,
            user_id: msgData.user_id,
            created_at: msgDate,
          });
        });
      }

      // 4. JavaScript에서 읽지 않은 메시지 계산 (DB 호출 없음!)
      const unreadEventsList: UnreadEvent[] = [];
      let totalUnread = 0;

      messagesByEvent.forEach((messages, eventId) => {
        const lastReadAt = readMap.get(eventId) || new Date(0);
        const unreadCount = messages.filter(msg => msg.created_at > lastReadAt).length;

        if (unreadCount > 0) {
          unreadEventsList.push({
            event_id: eventId,
            event_title: eventTitles.get(eventId) || "Unknown",
            unread_count: unreadCount,
          });
          totalUnread += unreadCount;
        }
      });

      setUnreadEvents(unreadEventsList);
      setUnreadMessagesCount(totalUnread);

      // 5. 긴급 Action 카운트 (1번 쿼리)
      if (currentProfile) {
        const now = new Date();
        const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

        const actionsQ = query(
          collection(db, "meeting_items"),
          where("type", "==", "action"),
          where("owner_id", "==", currentProfile.id)
        );
        const actionsSnap = await getDocs(actionsQ);

        let urgentCount = 0;
        actionsSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.status !== "done") {
            if (!data.due_at) {
              urgentCount++;
            } else {
              const dueDate = data.due_at?.toDate?.() || new Date(data.due_at);
              if (dueDate <= in48Hours) {
                urgentCount++;
              }
            }
          }
        });
        setUrgentActionsCount(urgentCount);
      }

    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user, currentProfile]);

  useEffect(() => {
    // 초기 조회
    fetchNotifications();

    // 🔧 백그라운드 상태 감지 추가 (배터리 절약)
    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!interval) {
        interval = setInterval(fetchNotifications, 30000);
      }
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 앱이 백그라운드로 가면 폴링 중지
        stopPolling();
      } else {
        // 앱이 포그라운드로 오면 즉시 갱신 + 폴링 재시작
        fetchNotifications();
        startPolling();
      }
    };

    // 초기 폴링 시작
    startPolling();

    // visibilitychange 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchNotifications]);

  // 참고: 전체 컬렉션 구독 제거됨

  // 이전에는 onSnapshot(collection(db, "thread_messages"))로 모든 메시지 변경에 반응했음
  // 이제는 30초 폴링만 사용하여 Firestore 비용 대폭 절감

  return {
    unreadMessagesCount,
    urgentActionsCount,
    unreadEvents,
    loading,
  };
}

// Hook for marking thread as read
export function useThreadRead() {
  const { user } = useAuth();

  const markAsRead = async (eventId: string) => {
    if (!user) return;

    try {
      const { setDoc, doc, serverTimestamp } = await import("firebase/firestore");
      await setDoc(doc(db, "thread_reads", `${eventId}_${user.uid}`), {
        event_id: eventId,
        user_id: user.uid,
        last_read_at: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error marking thread as read:", error);
    }
  };

  return { markAsRead };
}

