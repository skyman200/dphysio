import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  meetingsApi,
  MeetingItem,
  MeetingItemType,
  MeetingItemStatus,
} from "@/services/api/meetingsApi";
import { useActivityLogger } from "./useActivityLogger";

// 타입 re-export (기존 코드 호환성)
export type { MeetingItem, MeetingItemType, MeetingItemStatus } from "@/services/api/meetingsApi";

export function useMeetingItems(eventId: string | null) {
  const [items, setItems] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { logMeetingItemAdd, logActivity } = useActivityLogger();

  useEffect(() => {
    if (!user || !eventId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // meetingsApi 서비스 레이어 사용
    const unsubscribe = meetingsApi.subscribeByEvent(eventId, (itemsData) => {
      setItems(itemsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, eventId]);

  const addItem = useCallback(async (item: {
    type: MeetingItemType;
    content: string;
    owner_id?: string;
    due_at?: string;
    source_message_id?: string;
    created_by: string;
  }) => {
    if (!user || !eventId) return { error: new Error("Not authenticated or no event") };

    const result = await meetingsApi.create(eventId, item);
    if (result.error) {
      return { error: result.error };
    }
    if (result.data?.id) {
      logMeetingItemAdd(result.data.id, item.type, eventId);
    }
    return { error: null };
  }, [user, eventId, logMeetingItemAdd]);

  const updateItemStatus = useCallback(async (itemId: string, status: MeetingItemStatus) => {
    const result = await meetingsApi.updateStatus(itemId, status);
    if (result.error) {
      return { error: result.error };
    }
    return { error: null };
  }, []);

  const deleteItem = useCallback(async (itemId: string) => {
    const result = await meetingsApi.delete(itemId);
    if (result.error) {
      return { error: result.error };
    }
    logActivity({ type: 'meeting_item_delete', targetId: itemId });
    return { error: null };
  }, [logActivity]);

  const decisions = items.filter((i) => i.type === "decision");
  const actions = items.filter((i) => i.type === "action");
  const links = items.filter((i) => i.type === "link");

  return {
    items,
    decisions,
    actions,
    links,
    loading,
    addItem,
    updateItemStatus,
    deleteItem
  };
}

// Hook for fetching all actions (for dashboard)
export function useAllMeetingItems() {
  const [items, setItems] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // meetingsApi 서비스 레이어 사용
    const unsubscribe = meetingsApi.subscribeAll((itemsData) => {
      setItems(itemsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const incompleteActions = items.filter(
    (i) => i.type === "action" && i.status !== "done"
  );
  const recentDecisions = items
    .filter((i) => i.type === "decision")
    .slice(0, 5);

  return { items, incompleteActions, recentDecisions, loading };
}

