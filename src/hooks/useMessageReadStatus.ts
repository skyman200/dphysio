import { useEffect, useState, useCallback } from "react";
import { collection, query, where, onSnapshot, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useProfiles } from "@/hooks/useProfiles";

export function useMessageReadStatus(eventId: string | null) {
  const [readStatus, setReadStatus] = useState<Map<string, Set<string>>>(new Map());
  const [participantUserIds, setParticipantUserIds] = useState<string[]>([]);
  const { profiles } = useProfiles();

  const fetchReadStatus = useCallback(async () => {
    if (!eventId) return;

    try {
      // Get participants for this event
      const participantsQ = query(collection(db, "schedule_participants"), where("event_id", "==", eventId));
      const participantsSnap = await getDocs(participantsQ);

      // Get event creator
      const eventDoc = await getDoc(doc(db, "events", eventId));

      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        const participantProfileIds = participantsSnap.docs.map((d) => d.data().profile_id);
        const participantProfiles = profiles.filter((p) =>
          participantProfileIds.includes(p.id) || p.user_id === eventData.created_by
        );
        setParticipantUserIds(participantProfiles.map((p) => p.user_id));
      }

      // Get thread reads for all participants
      const readsQ = query(collection(db, "thread_reads"), where("event_id", "==", eventId));
      const readsSnap = await getDocs(readsQ);
      const threadReads = readsSnap.docs.map((d) => d.data());

      // Get messages
      const messagesQ = query(collection(db, "thread_messages"), where("event_id", "==", eventId));
      const messagesSnap = await getDocs(messagesQ);
      const messages = messagesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Build read status map
      const statusMap = new Map<string, Set<string>>();

      messages.forEach((msg: any) => {
        const readers = new Set<string>();
        // Message sender has always read their own message
        readers.add(msg.user_id);

        // Check who else has read this message
        threadReads.forEach((tr: any) => {
          if (tr.user_id !== msg.user_id && new Date(tr.last_read_at?.toDate?.() || tr.last_read_at) >= new Date(msg.created_at?.toDate?.() || msg.created_at)) {
            readers.add(tr.user_id);
          }
        });

        statusMap.set(msg.id, readers);
      });

      setReadStatus(statusMap);
    } catch (error) {
      console.error("Error fetching message read status:", error);
    }
  }, [eventId, profiles]);

  useEffect(() => {
    fetchReadStatus();
  }, [fetchReadStatus]);

  // Subscribe to thread_reads changes
  useEffect(() => {
    if (!eventId) return;

    const q = query(collection(db, "thread_reads"), where("event_id", "==", eventId));
    const unsubscribe = onSnapshot(q, () => {
      fetchReadStatus();
    });

    return () => unsubscribe();
  }, [eventId, fetchReadStatus]);

  const getReadByUsers = (messageId: string) => {
    const readers = readStatus.get(messageId) || new Set();
    return profiles.filter((p) => readers.has(p.user_id));
  };

  const getUnreadUsers = (messageId: string, senderId: string) => {
    const readers = readStatus.get(messageId) || new Set();
    return profiles.filter(
      (p) => participantUserIds.includes(p.user_id) && !readers.has(p.user_id) && p.user_id !== senderId
    );
  };

  const hasEveryoneRead = (messageId: string) => {
    const readers = readStatus.get(messageId) || new Set();
    return participantUserIds.every((userId) => readers.has(userId));
  };

  return {
    getReadByUsers,
    getUnreadUsers,
    hasEveryoneRead,
    participantUserIds,
  };
}
