import { useEffect, useState, useCallback } from "react";
import { collection, query, onSnapshot, where, setDoc, doc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useProfiles } from "@/hooks/useProfiles";

export function useEventReadStatus(eventId: string | null) {
  const [readByUsers, setReadByUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { profiles } = useProfiles();

  const fetchReadStatus = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    try {
      const q = query(collection(db, "event_reads"), where("event_id", "==", eventId));
      const snapshot = await getDocs(q);
      setReadByUsers(snapshot.docs.map((d) => d.data().user_id));
    } catch (error) {
      console.error("Error fetching event read status:", error);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchReadStatus();
  }, [fetchReadStatus]);

  // Subscribe to changes
  useEffect(() => {
    if (!eventId) return;

    const q = query(collection(db, "event_reads"), where("event_id", "==", eventId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReadByUsers(snapshot.docs.map((d) => d.data().user_id));
    });

    return () => unsubscribe();
  }, [eventId]);

  const markEventAsRead = async () => {
    if (!user || !eventId) return;

    try {
      await setDoc(doc(db, "event_reads", `${eventId}_${user.uid}`), {
        event_id: eventId,
        user_id: user.uid,
        read_at: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error marking event as read:", error);
    }
  };

  const getReadByProfiles = () => {
    return profiles.filter((p) => readByUsers.includes(p.user_id));
  };

  const getUnreadProfiles = (participantUserIds: string[]) => {
    return profiles.filter(
      (p) => participantUserIds.includes(p.user_id) && !readByUsers.includes(p.user_id)
    );
  };

  const hasUserRead = (userId: string) => {
    return readByUsers.includes(userId);
  };

  return {
    readByUsers,
    loading,
    markEventAsRead,
    getReadByProfiles,
    getUnreadProfiles,
    hasUserRead,
  };
}

// Hook to get all events' read status for dashboard
export function useAllEventsReadStatus() {
  const [eventReadCounts, setEventReadCounts] = useState<Map<string, number>>(new Map());
  const { user } = useAuth();
  const { profiles } = useProfiles();

  const fetchAllEventReads = useCallback(async () => {
    if (!user) return;

    try {
      const snapshot = await getDocs(collection(db, "event_reads"));
      const countMap = new Map<string, number>();
      snapshot.docs.forEach((d) => {
        const eventId = d.data().event_id;
        countMap.set(eventId, (countMap.get(eventId) || 0) + 1);
      });
      setEventReadCounts(countMap);
    } catch (error) {
      console.error("Error fetching all event reads:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchAllEventReads();
  }, [fetchAllEventReads]);

  // Subscribe to changes
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, "event_reads"), () => {
      fetchAllEventReads();
    });

    return () => unsubscribe();
  }, [user, fetchAllEventReads]);

  const getReadCount = (eventId: string) => {
    return eventReadCounts.get(eventId) || 0;
  };

  const hasCurrentUserRead = async (eventId: string) => {
    if (!user) return false;

    try {
      const q = query(
        collection(db, "event_reads"),
        where("event_id", "==", eventId),
        where("user_id", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (_error) {
      return false;
    }
  };

  return {
    eventReadCounts,
    getReadCount,
    hasCurrentUserRead,
    totalProfiles: profiles.length,
  };
}
