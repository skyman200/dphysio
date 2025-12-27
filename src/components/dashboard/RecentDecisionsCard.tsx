import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Pin, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllMeetingItems } from "@/hooks/useMeetingItems";
import { useEvents } from "@/hooks/useEvents";

export function RecentDecisionsCard() {
  const { recentDecisions, loading } = useAllMeetingItems();
  const { events } = useEvents();

  const getEventTitle = (eventId: string) => {
    return events.find((e) => e.id === eventId)?.title || "일정";
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-5 animate-pulse">
        <div className="h-6 bg-muted/50 rounded w-1/2 mb-4" />
        <div className="space-y-3">
          <div className="h-14 bg-muted/30 rounded-xl" />
          <div className="h-14 bg-muted/30 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Pin className="h-5 w-5 text-professor-gold" />
        최근 결정사항
      </h3>

      {recentDecisions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          아직 결정사항이 없습니다
        </p>
      ) : (
        <div className="space-y-3">
          {recentDecisions.map((decision, idx) => (
            <motion.div
              key={decision.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-3 rounded-xl bg-professor-gold/10 border border-professor-gold/30"
            >
              <p className="text-sm font-medium line-clamp-2">{decision.content}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span className="truncate">{getEventTitle(decision.event_id)}</span>
                <span>·</span>
                <span>{format(parseISO(decision.created_at), "M/d")}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
