import { motion } from "framer-motion";
import { format, parseISO, isPast, differenceInHours } from "date-fns";
import { AlertTriangle, Clock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAllMeetingItems } from "@/hooks/useMeetingItems";
import { useProfiles } from "@/hooks/useProfiles";
import { useEvents } from "@/hooks/useEvents";

interface UrgentActionsCardProps {
  onActionClick?: (eventId: string) => void;
}

export function UrgentActionsCard({ onActionClick }: UrgentActionsCardProps) {
  const { incompleteActions, loading } = useAllMeetingItems();
  const { profiles, currentProfile } = useProfiles();
  const { events } = useEvents();

  // Filter urgent actions (due within 48 hours or overdue)
  const urgentActions = incompleteActions.filter((action) => {
    if (!action.due_at) return false;
    const dueDate = parseISO(action.due_at);
    const hoursUntilDue = differenceInHours(dueDate, new Date());
    return hoursUntilDue <= 48 || isPast(dueDate);
  });

  const getEventTitle = (eventId: string) => {
    return events.find((e) => e.id === eventId)?.title || "일정";
  };

  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return "미지정";
    return profiles.find((p) => p.id === ownerId)?.name || "Unknown";
  };

  const getDueStatus = (dueAt: string) => {
    const dueDate = parseISO(dueAt);
    if (isPast(dueDate)) {
      return { label: "마감 지남", color: "bg-destructive text-destructive-foreground" };
    }
    const hoursUntilDue = differenceInHours(dueDate, new Date());
    if (hoursUntilDue <= 24) {
      return { label: "24h 이내", color: "bg-professor-terracotta text-white" };
    }
    return { label: "48h 이내", color: "bg-professor-gold text-white" };
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
          <AlertTriangle className="h-5 w-5 text-professor-terracotta" />
          마감 임박 Action
        </h3>
        {urgentActions.length > 0 && (
          <div className="flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-professor-terracotta text-white text-sm font-bold">
            {urgentActions.length}
          </div>
        )}
      </div>

      {urgentActions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          마감 임박 Action이 없습니다 ✓
        </p>
      ) : (
        <div className="space-y-2">
          {urgentActions.slice(0, 5).map((action, idx) => {
            const dueStatus = action.due_at ? getDueStatus(action.due_at) : null;
            const isMyAction = action.owner_id === currentProfile?.id;

            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onActionClick?.(action.event_id)}
                className={cn(
                  "p-3 rounded-xl border cursor-pointer hover:scale-[1.01] transition-all group",
                  isMyAction
                    ? "bg-professor-terracotta/10 border-professor-terracotta/30"
                    : "bg-muted/30 border-border/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{action.content}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground truncate">
                        {getEventTitle(action.event_id)}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {getOwnerName(action.owner_id)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {dueStatus && (
                      <Badge className={cn("text-[10px]", dueStatus.color)}>
                        {dueStatus.label}
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
