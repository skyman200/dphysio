import { motion } from "framer-motion";
import { MessageCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";

interface UnreadMessagesCardProps {
  onEventClick?: (eventId: string) => void;
}

export function UnreadMessagesCard({ onEventClick }: UnreadMessagesCardProps) {
  const { unreadMessagesCount, unreadEvents, loading } = useNotifications();

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-5 animate-pulse">
        <div className="h-6 bg-muted/50 rounded w-1/2 mb-4" />
        <div className="space-y-3">
          <div className="h-12 bg-muted/30 rounded-xl" />
          <div className="h-12 bg-muted/30 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          읽지 않은 메시지
        </h3>
        {unreadMessagesCount > 0 && (
          <div className="flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-primary text-primary-foreground text-sm font-bold">
            {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
          </div>
        )}
      </div>

      {unreadEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          모든 메시지를 읽었습니다 ✓
        </p>
      ) : (
        <div className="space-y-2">
          {unreadEvents.slice(0, 5).map((event, idx) => (
            <motion.div
              key={event.event_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onEventClick?.(event.event_id)}
              className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors group"
            >
              {/* Unread dot */}
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{event.event_title}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-primary">
                  {event.unread_count}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
