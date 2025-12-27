// Event Chat Tab - 이벤트 상세 모달의 채팅 탭
import { useState, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { Send, CheckSquare, Pin, Link2, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useThreadMessages, ThreadMessage } from "@/hooks/useThreadMessages";
import { useMeetingItems, MeetingItemType } from "@/hooks/useMeetingItems";
import { useProfiles } from "@/hooks/useProfiles";
import { useAuth } from "@/contexts/AuthContext";
import { useMessageReadStatus } from "@/hooks/useMessageReadStatus";
import type { Profile } from "@/types";

const PROFESSOR_COLORS = [
    "from-professor-terracotta to-professor-terracotta/80",
    "from-professor-burgundy to-professor-burgundy/80",
    "from-professor-sage to-professor-sage/80",
    "from-professor-gold to-professor-gold/80",
    "from-professor-mauve to-professor-mauve/80",
    "from-professor-rose to-professor-rose/80",
];

interface EventChatTabProps {
    eventId: string;
}

export function EventChatTab({ eventId }: EventChatTabProps) {
    const [messageInput, setMessageInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { user } = useAuth();
    const { profiles, currentProfile } = useProfiles();
    const { messages, sendMessage } = useThreadMessages(eventId);
    const { addItem } = useMeetingItems(eventId);
    const { getReadByUsers, getUnreadUsers, hasEveryoneRead } = useMessageReadStatus(eventId);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const getProfileColor = (userId: string) => {
        const idx = profiles.findIndex((p: Profile) => p.user_id === userId);
        return PROFESSOR_COLORS[idx % PROFESSOR_COLORS.length];
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim()) return;

        const content = messageInput.trim();
        const hasAction = content.includes("@action");
        const hasDecision = content.includes("@decision");
        const hasLink = content.includes("@link");

        const { error } = await sendMessage(content);
        if (error) {
            toast.error("메시지 전송 실패");
            return;
        }

        // Auto-create meeting items based on tags
        if (currentProfile) {
            if (hasAction) {
                await addItem({
                    type: "action",
                    content: content.replace("@action", "").trim(),
                    created_by: currentProfile.id,
                });
                toast.success("Action 후보가 등록되었습니다");
            }
            if (hasDecision) {
                await addItem({
                    type: "decision",
                    content: content.replace("@decision", "").trim(),
                    created_by: currentProfile.id,
                });
                toast.success("결정사항 후보가 등록되었습니다");
            }
            if (hasLink) {
                await addItem({
                    type: "link",
                    content: content.replace("@link", "").trim(),
                    created_by: currentProfile.id,
                });
                toast.success("자료/링크가 등록되었습니다");
            }
        }

        setMessageInput("");
    };

    const handleCreateItemFromMessage = async (
        messageContent: string,
        type: MeetingItemType,
        _messageId: string
    ) => {
        if (!currentProfile) return;

        await addItem({
            type,
            content: messageContent,
            created_by: currentProfile.id,
        });

        toast.success(
            type === "action" ? "Action으로 등록됨" :
                type === "decision" ? "결정사항으로 핀됨" :
                    "자료로 저장됨"
        );
    };

    return (
        <div className="flex flex-col h-[400px]">
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.map((msg: ThreadMessage) => {
                        const sender = profiles.find((p: Profile) => p.user_id === msg.user_id);
                        const isMe = msg.user_id === user?.uid;
                        const readByUsers = getReadByUsers(msg.id);
                        const unreadUsers = getUnreadUsers(msg.id, msg.user_id);
                        const allRead = hasEveryoneRead(msg.id);

                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn("flex gap-3", isMe && "flex-row-reverse")}
                            >
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarFallback className={cn("text-white text-xs font-medium bg-gradient-to-br", getProfileColor(msg.user_id))}>
                                        {sender?.name[0] || "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={cn("max-w-[70%]", isMe && "text-right")}>
                                    <p className="text-xs text-muted-foreground mb-1">
                                        {sender?.name || "Unknown"} · {format(parseISO(msg.created_at), "HH:mm")}
                                    </p>
                                    <div className={cn(
                                        "p-3 rounded-2xl text-sm",
                                        isMe
                                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                                            : "bg-muted/50 rounded-tl-sm"
                                    )}>
                                        {msg.content}
                                    </div>
                                    {/* Read status indicator */}
                                    {isMe && (
                                        <div className="flex items-center gap-1 mt-1 justify-end">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                                        {allRead ? (
                                                            <CheckCheck className="h-3.5 w-3.5 text-primary" />
                                                        ) : (
                                                            <Check className="h-3.5 w-3.5" />
                                                        )}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" className="text-xs">
                                                    {readByUsers.length > 1 ? (
                                                        <div>
                                                            <p className="font-medium mb-1">
                                                                읽음: {readByUsers.filter((u: { user_id: string; name: string }) => u.user_id !== msg.user_id).map((u: { name: string }) => u.name).join(", ") || "없음"}
                                                            </p>
                                                            {unreadUsers.length > 0 && (
                                                                <p className="text-muted-foreground">
                                                                    안 읽음: {unreadUsers.map((u: { name: string }) => u.name).join(", ")}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p>아직 아무도 읽지 않음</p>
                                                    )}
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    )}
                                    {/* Quick action buttons */}
                                    {!isMe && (
                                        <div className="flex gap-1 mt-1 opacity-0 hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-xs"
                                                onClick={() => handleCreateItemFromMessage(msg.content, "action", msg.id)}
                                            >
                                                <CheckSquare className="h-3 w-3 mr-1" />
                                                Action
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-xs"
                                                onClick={() => handleCreateItemFromMessage(msg.content, "decision", msg.id)}
                                            >
                                                <Pin className="h-3 w-3 mr-1" />
                                                결정
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-xs"
                                                onClick={() => handleCreateItemFromMessage(msg.content, "link", msg.id)}
                                            >
                                                <Link2 className="h-3 w-3 mr-1" />
                                                자료
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border/30">
                <div className="flex gap-2">
                    <Input
                        placeholder="메시지 입력... (@action, @decision, @link 태그 사용 가능)"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                        className="flex-1"
                    />
                    <Button onClick={handleSendMessage} size="icon">
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
