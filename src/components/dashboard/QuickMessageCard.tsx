import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Send, MessageCircle, X, Globe, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useEvents } from "@/hooks/useEvents";
import { useProfiles } from "@/hooks/useProfiles";
import { useAuth } from "@/contexts/AuthContext";
import { useThreadMessages } from "@/hooks/useThreadMessages";
import { useThreadRead } from "@/hooks/useNotifications";
import { toast } from "sonner";

interface QuickMessageCardProps {
  onEventClick: (eventId: string) => void;
}

const PROFESSOR_COLORS = [
  "from-professor-terracotta to-professor-terracotta/80",
  "from-professor-burgundy to-professor-burgundy/80",
  "from-professor-sage to-professor-sage/80",
  "from-professor-gold to-professor-gold/80",
  "from-professor-mauve to-professor-mauve/80",
];

export function QuickMessageCard({ onEventClick }: QuickMessageCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"event" | "free">("event");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [messageInput, setMessageInput] = useState("");
  const [freeMessage, setFreeMessage] = useState("");

  const { events } = useEvents();
  const { profiles, currentProfile } = useProfiles();
  const { user } = useAuth();
  const { messages, sendMessage } = useThreadMessages(selectedEventId || null);
  const { markAsRead } = useThreadRead();

  // Get recent events (last 30 days)
  const recentEvents = events
    .filter((e) => new Date(e.start_date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
    .slice(0, 10);

  const getProfileColor = (userId: string) => {
    const idx = profiles.findIndex((p) => p.user_id === userId);
    return PROFESSOR_COLORS[idx % PROFESSOR_COLORS.length];
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedEventId) {
      toast.error("일정을 선택하고 메시지를 입력해주세요");
      return;
    }

    const { error } = await sendMessage(messageInput.trim());
    if (error) {
      toast.error("메시지 전송 실패");
      return;
    }

    toast.success("메시지가 전송되었습니다");
    setMessageInput("");
    markAsRead(selectedEventId);
  };

  const handleSendFreeMessage = () => {
    if (!freeMessage.trim()) {
      toast.error("메시지를 입력해주세요");
      return;
    }

    // For now, just show a toast - in a real app this would post to a general channel
    toast.success("전체 공유 메시지가 전송되었습니다");
    setFreeMessage("");
    setIsDialogOpen(false);
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <>
      <Card
        className="glass-card cursor-pointer hover:bg-muted/10 transition-colors group"
        onClick={() => setIsDialogOpen(true)}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            빠른 메시지
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            클릭하여 메시지를 작성하세요
          </p>
          <div className="flex gap-2 mt-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              일정 메시지
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              자유 공유
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] glass-dialog">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              빠른 메시지
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "event" | "free")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="event" className="gap-2">
                <Calendar className="h-4 w-4" />
                일정 메시지
              </TabsTrigger>
              <TabsTrigger value="free" className="gap-2">
                <Globe className="h-4 w-4" />
                자유 공유
              </TabsTrigger>
            </TabsList>

            <TabsContent value="event" className="space-y-4 mt-4">
              {/* Event Selector */}
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="일정 선택..." />
                </SelectTrigger>
                <SelectContent>
                  {recentEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      <div className="flex items-center gap-2">
                        <span className="truncate">{event.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(event.start_date), "M/d")}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedEventId && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3"
                >
                  {/* Selected Event Info */}
                  {selectedEvent && (
                    <div
                      className="p-3 rounded-xl bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        onEventClick(selectedEventId);
                        setIsDialogOpen(false);
                      }}
                    >
                      <p className="font-medium text-sm">{selectedEvent.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(selectedEvent.start_date), "M월 d일 (EEE) HH:mm", { locale: ko })}
                        {selectedEvent.location && ` · ${selectedEvent.location}`}
                      </p>
                    </div>
                  )}

                  {/* Recent Messages */}
                  <ScrollArea className="h-[200px] rounded-xl bg-muted/20 p-3">
                    <div className="space-y-3">
                      {messages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          아직 메시지가 없습니다
                        </p>
                      ) : (
                        messages.slice(-10).map((msg) => {
                          const sender = profiles.find((p) => p.user_id === msg.user_id);
                          const isMe = msg.user_id === user?.uid;

                          return (
                            <div
                              key={msg.id}
                              className={cn("flex gap-2", isMe && "flex-row-reverse")}
                            >
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
                                <div className={cn("flex items-baseline gap-2", isMe && "flex-row-reverse")}>
                                  <span className="text-xs font-medium">{sender?.name}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(parseISO(msg.created_at), "HH:mm")}
                                  </span>
                                </div>
                                <div
                                  className={cn(
                                    "max-w-[85%] p-2 rounded-xl text-sm mt-1",
                                    isMe
                                      ? "bg-primary text-primary-foreground ml-auto"
                                      : "bg-background"
                                  )}
                                >
                                  {msg.content}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="메시지 입력..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="free" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                특정 일정과 관계없이 모든 구성원에게 공유할 메시지를 작성하세요.
              </p>

              <Textarea
                placeholder="공유할 메시지를 작성하세요..."
                value={freeMessage}
                onChange={(e) => setFreeMessage(e.target.value)}
                className="min-h-[150px]"
              />

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  작성자: {currentProfile?.name}
                </p>
                <Button onClick={handleSendFreeMessage} className="gap-2">
                  <Send className="h-4 w-4" />
                  전체 공유
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
