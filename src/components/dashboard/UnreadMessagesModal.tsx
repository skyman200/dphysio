import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { MessageCircle, Check, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNotifications, useThreadRead } from "@/hooks/useNotifications";
import { useProfiles } from "@/hooks/useProfiles";
import { useThreadMessages } from "@/hooks/useThreadMessages";
import { useEvents } from "@/hooks/useEvents";

interface UnreadMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllRead: () => void;
}

const PROFESSOR_COLORS = [
  "from-professor-terracotta to-professor-terracotta/80",
  "from-professor-burgundy to-professor-burgundy/80",
  "from-professor-sage to-professor-sage/80",
  "from-professor-gold to-professor-gold/80",
  "from-professor-mauve to-professor-mauve/80",
];

export function UnreadMessagesModal({ isOpen, onClose, onAllRead }: UnreadMessagesModalProps) {
  const { unreadEvents, unreadMessagesCount } = useNotifications();
  const { markAsRead } = useThreadRead();
  const { profiles } = useProfiles();
  const { events } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [readEvents, setReadEvents] = useState<Set<string>>(new Set());

  const { messages } = useThreadMessages(selectedEventId);

  const getProfileColor = (userId: string) => {
    const idx = profiles.findIndex((p) => p.user_id === userId);
    return PROFESSOR_COLORS[idx % PROFESSOR_COLORS.length];
  };

  const getProfileName = (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.name || "?";
  };

  const handleMarkAsRead = async (eventId: string) => {
    await markAsRead(eventId);
    setReadEvents((prev) => new Set([...prev, eventId]));
  };

  const handleMarkAllAsRead = async () => {
    for (const event of unreadEvents) {
      await markAsRead(event.event_id);
    }
    onAllRead();
    onClose();
  };

  const remainingUnread = unreadEvents.filter((e) => !readEvents.has(e.event_id));
  const canProceed = remainingUnread.length === 0;

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] glass-dialog" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            읽지 않은 메시지 확인
            {unreadMessagesCount > 0 && (
              <Badge variant="destructive">{unreadMessagesCount}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-[500px]">
          {/* Left: Unread events list */}
          <div className="w-1/2 flex flex-col">
            <p className="text-sm text-muted-foreground mb-3">
              대시보드에 접근하려면 모든 메시지를 확인해주세요.
            </p>
            
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-2">
                {unreadEvents.map((event) => {
                  const isRead = readEvents.has(event.event_id);
                  const isSelected = selectedEventId === event.event_id;

                  return (
                    <motion.div
                      key={event.event_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "p-3 rounded-xl cursor-pointer transition-all border",
                        isRead
                          ? "bg-muted/20 border-muted/30 opacity-60"
                          : isSelected
                          ? "bg-primary/10 border-primary/50"
                          : "bg-primary/5 border-primary/20 hover:bg-primary/10"
                      )}
                      onClick={() => setSelectedEventId(event.event_id)}
                    >
                      <div className="flex items-center gap-3">
                        {isRead ? (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            isRead && "line-through"
                          )}>
                            {event.event_title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {event.unread_count}개 메시지
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </motion.div>
                  );
                })}

                {unreadEvents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Check className="h-12 w-12 mx-auto mb-2 text-primary" />
                    <p>모든 메시지를 읽었습니다!</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Message preview */}
          <div className="w-1/2 flex flex-col border-l border-border/30 pl-4">
            {selectedEventId && selectedEvent ? (
              <>
                <div className="mb-3">
                  <h4 className="font-semibold text-sm">{selectedEvent.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(selectedEvent.start_date), "M월 d일 (EEE) HH:mm", { locale: ko })}
                  </p>
                </div>

                <ScrollArea className="flex-1 pr-2">
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const sender = profiles.find((p) => p.user_id === msg.user_id);
                      return (
                        <div key={msg.id} className="flex gap-2">
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarFallback
                              className={cn(
                                "text-white text-[10px] font-medium bg-gradient-to-br",
                                getProfileColor(msg.user_id)
                              )}
                            >
                              {sender?.name[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-medium">{sender?.name}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {format(parseISO(msg.created_at), "M/d HH:mm")}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/90 mt-0.5">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                <Button
                  onClick={() => handleMarkAsRead(selectedEventId)}
                  disabled={readEvents.has(selectedEventId)}
                  className="mt-3"
                  size="sm"
                >
                  {readEvents.has(selectedEventId) ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      확인 완료
                    </>
                  ) : (
                    "읽음 표시"
                  )}
                </Button>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p className="text-sm">메시지를 선택하세요</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border/30">
          <p className="text-sm text-muted-foreground">
            {remainingUnread.length > 0
              ? `${remainingUnread.length}개 메시지 미확인`
              : "모든 메시지를 확인했습니다"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              전체 읽음 처리
            </Button>
            <Button onClick={onClose} disabled={!canProceed && unreadEvents.length > 0}>
              {canProceed || unreadEvents.length === 0 ? "대시보드로 이동" : "확인 필요"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
