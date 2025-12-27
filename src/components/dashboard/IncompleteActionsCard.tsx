import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { CheckSquare, Clock, User } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAllMeetingItems, useMeetingItems, MeetingItemStatus } from "@/hooks/useMeetingItems";
import { useProfiles } from "@/hooks/useProfiles";
import { useEvents } from "@/hooks/useEvents";
import { toast } from "sonner";

export function IncompleteActionsCard() {
  const { incompleteActions, loading } = useAllMeetingItems();
  const { profiles, currentProfile } = useProfiles();
  const { events } = useEvents();

  const myActions = incompleteActions.filter(
    (a) => a.owner_id === currentProfile?.id
  );

  const handleStatusChange = async (itemId: string, eventId: string, status: MeetingItemStatus) => {
    // For now, we'll use a simple approach - refetch via hook
    // A more robust solution would use a global state manager
    try {
      const { updateItemStatus } = useMeetingItems(eventId);
      const { error } = await updateItemStatus(itemId, status);
      if (!error) {
        toast.success("완료 처리되었습니다");
      }
    } catch (e) {
      // Fallback: direct Firestore update
      const { updateDoc, doc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      await updateDoc(doc(db, "meeting_items", itemId), { status });
      toast.success("완료 처리되었습니다");
    }
  };

  const getEventTitle = (eventId: string) => {
    return events.find((e) => e.id === eventId)?.title || "일정";
  };

  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return "미지정";
    return profiles.find((p) => p.id === ownerId)?.name || "Unknown";
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-5 animate-pulse">
        <div className="h-6 bg-muted/50 rounded w-1/2 mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-muted/30 rounded-xl" />
          <div className="h-16 bg-muted/30 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-professor-sage" />
          미완료 Action
        </h3>
        <Badge variant="secondary" className="text-xs">
          {myActions.length}건 (내 담당)
        </Badge>
      </div>

      {incompleteActions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          모든 Action이 완료되었습니다 🎉
        </p>
      ) : (
        <div className="space-y-3">
          {incompleteActions.slice(0, 5).map((action, idx) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "p-3 rounded-xl border transition-all",
                action.owner_id === currentProfile?.id
                  ? "bg-professor-sage/10 border-professor-sage/30"
                  : "bg-muted/30 border-border/30"
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={action.status === "done"}
                  onCheckedChange={(checked) =>
                    handleStatusChange(action.id, action.event_id, checked ? "done" : "open")
                  }
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{action.content}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground truncate">
                      {getEventTitle(action.event_id)}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {getOwnerName(action.owner_id)}
                    </div>
                    {action.due_at && (
                      <div className="flex items-center gap-1 text-xs text-professor-terracotta">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(action.due_at), "M/d")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
