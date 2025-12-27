import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityLogger } from "./useActivityLogger";

export interface ThreadMessage {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export function useThreadMessages(eventId: string | null) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { logMessageSend } = useActivityLogger();

  useEffect(() => {
    if (!user || !eventId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const messagesRef = collection(db, "thread_messages");
    const q = query(messagesRef, where("event_id", "==", eventId), orderBy("created_at", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          created_at: data.created_at?.toDate?.().toISOString() || new Date().toISOString()
        };
      }) as ThreadMessage[]);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching thread messages:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, eventId]);

  const sendMessage = async (content: string) => {
    if (!user || !eventId) return { error: new Error("Not authenticated or no event") };

    try {
      const docRef = await addDoc(collection(db, "thread_messages"), {
        event_id: eventId,
        user_id: user.uid,
        content,
        created_at: serverTimestamp(),
      });
      logMessageSend(docRef.id, eventId);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return { messages, loading, sendMessage };
}
