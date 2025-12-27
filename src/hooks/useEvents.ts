import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { eventsApi } from "@/services/api/eventsApi";
import type { Event, EventFormData } from "@/types";
import { useActivityLogger } from "./useActivityLogger";

// Event 타입 re-export (기존 코드 호환성)
export type { Event } from "@/types";

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { logEventCreate, logEventUpdate, logEventDelete } = useActivityLogger();

  useEffect(() => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('Setting up events listener for user:', user.uid);

    // eventsApi 서비스 레이어 사용 (직접 Firestore 호출 대신)
    const unsubscribe = eventsApi.subscribe((eventsData) => {
      console.log('Events snapshot received:', eventsData.length, 'events');
      // source 필드 추가 (로컬 이벤트로 표시)
      const eventsWithSource = eventsData.map(event => ({
        ...event,
        source: "local" as const,
      }));
      setEvents(eventsWithSource);
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up events listener for user:', user.uid);
      unsubscribe();
    };
  }, [user]);

  const addEvent = useCallback(async (event: {
    title: string;
    description?: string;
    start_date: Date;
    end_date?: Date;
    location?: string;
    category?: string;
    type?: string;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };

    console.log('Creating event with data:', event);

    const formData: EventFormData = {
      title: event.title,
      description: event.description,
      start_date: event.start_date,
      end_date: event.end_date,
      location: event.location,
      category: event.category || "event",
      type: event.type || "department",
    };

    const result = await eventsApi.create(formData, user.uid);

    if (result.error) {
      console.error("Error adding event:", result.error);
      return { error: result.error };
    }

    console.log('Event created successfully with ID:', result.data?.id);
    if (result.data?.id) {
      logEventCreate(result.data.id, event.title);
    }
    return { error: null };
  }, [user, logEventCreate]);

  const updateEvent = useCallback(async (
    id: string,
    event: {
      title?: string;
      description?: string | null;
      start_date?: Date;
      end_date?: Date | null;
      location?: string | null;
      category?: string;
    }
  ) => {
    if (!user) return { error: new Error("Not authenticated") };

    const formData: Partial<EventFormData> = {};
    if (event.title !== undefined) formData.title = event.title;
    if (event.description !== undefined) formData.description = event.description || undefined;
    if (event.start_date !== undefined) formData.start_date = event.start_date;
    if (event.end_date !== undefined) formData.end_date = event.end_date || undefined;
    if (event.location !== undefined) formData.location = event.location || undefined;
    if (event.category !== undefined) formData.category = event.category;

    const result = await eventsApi.update(id, formData);

    if (result.error) {
      console.error("Error updating event:", result.error);
      return { error: result.error };
    }

    if (id) {
      logEventUpdate(id, event.title || 'Event Updated');
    }

    return { error: null };
  }, [user, logEventUpdate]); // Note: We might miss the title update here if not provided, but it's acceptable for now

  const deleteEvent = useCallback(async (id: string) => {
    const result = await eventsApi.delete(id);

    if (result.error) {
      console.error("Error deleting event:", result.error);
      return { error: result.error };
    }

    logEventDelete(id, 'Event Deleted');
    return { error: null };
  }, [logEventDelete]);

  const markAsRead = useCallback(async (id: string) => {
    if (!user) return { error: new Error("Not authenticated") };
    return await eventsApi.markAsRead(id, user.uid);
  }, [user]);

  return {
    events,
    localEvents: events,
    caldavEvents: [],
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    deleteEvents: async (ids: string[]) => {
      if (!user) return { error: new Error("Not authenticated") };
      const result = await eventsApi.bulkDelete(ids);
      if (result.error) {
        console.error("Error bulk deleting events:", result.error);
        return { error: result.error };
      }
      logEventDelete(ids.join(','), 'Bulk Event Deleted');
      return { error: null };
    },
    markAsRead,
    refreshCalDAVEvents: () => { },
  };
}