import { useMemo } from "react";
import { useNotifications } from "@/hooks/useNotifications";

export function useEventUnreadStatus() {
  const { unreadEvents } = useNotifications();

  const unreadEventIds = useMemo(() => {
    return new Set(unreadEvents.map((e) => e.event_id));
  }, [unreadEvents]);

  const hasUnreadMessages = (eventId: string) => {
    return unreadEventIds.has(eventId);
  };

  const getUnreadCount = (eventId: string) => {
    const event = unreadEvents.find((e) => e.event_id === eventId);
    return event?.unread_count || 0;
  };

  return { hasUnreadMessages, getUnreadCount, unreadEventIds };
}
