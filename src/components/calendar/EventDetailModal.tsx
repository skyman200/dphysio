import { useState, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { EVENT_CATEGORIES } from "@/types";
import { ko } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, MapPin, Clock, Send,
  CheckSquare, Pin, Link2, Users, FileText,
  Trash2, ExternalLink, Check, CheckCheck, Pencil, X, Save, MessageSquare
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useThreadMessages } from "@/hooks/useThreadMessages";
import { useMeetingItems, MeetingItemType, MeetingItemStatus } from "@/hooks/useMeetingItems";
import { useProfiles } from "@/hooks/useProfiles";
import { useScheduleParticipants } from "@/hooks/useScheduleParticipants";
import { useAuth } from "@/contexts/AuthContext";
import { useThreadRead } from "@/hooks/useNotifications";
import { useMessageReadStatus } from "@/hooks/useMessageReadStatus";
import { useEvents } from "@/hooks/useEvents";

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  description: string | null;
  created_by: string;
  source?: "local" | "caldav";
  category?: string;
}

interface EventDetailModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

const PROFESSOR_COLORS = [
  "from-professor-terracotta to-professor-terracotta/80",
  "from-professor-burgundy to-professor-burgundy/80",
  "from-professor-sage to-professor-sage/80",
  "from-professor-gold to-professor-gold/80",
  "from-professor-mauve to-professor-mauve/80",
  "from-professor-rose to-professor-rose/80",
];

export function EventDetailModal({ event, isOpen, onClose }: EventDetailModalProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [messageInput, setMessageInput] = useState("");
  const [showItemForm, setShowItemForm] = useState<MeetingItemType | null>(null);
  const [itemContent, setItemContent] = useState("");
  const [itemOwner, setItemOwner] = useState<string>("");
  const [itemDueDate, setItemDueDate] = useState("");
  const [postToNotice, setPostToNotice] = useState(false); // New: Decision to Notice
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { markAsRead } = useThreadRead();

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("event");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { user } = useAuth();
  const { profiles, currentProfile } = useProfiles();
  const { messages, sendMessage } = useThreadMessages(event?.id || null);
  const { decisions, actions, links, addItem, updateItemStatus, deleteItem } = useMeetingItems(event?.id || null);
  const { getParticipantsByEvent, addParticipant, removeParticipant } = useScheduleParticipants();
  const { getReadByUsers, getUnreadUsers, hasEveryoneRead } = useMessageReadStatus(event?.id || null);
  const { updateEvent, deleteEvent, addEvent } = useEvents(); // Added addEvent
  const [isDeleting, setIsDeleting] = useState(false);

  const participants = event ? getParticipantsByEvent(event.id) : [];
  const participantProfiles = profiles.filter((p) =>
    participants.some((part) => part.profile_id === p.id)
  );

  const hasChiefRole = currentProfile?.role === 'admin' || currentProfile?.role === '학과장' || currentProfile?.role === 'chief';
  const isCalDAVEvent = event?.source === "caldav" || event?.id.startsWith("caldav-");
  const canEdit = (!isCalDAVEvent) && ((event?.created_by === user?.uid) || hasChiefRole);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark thread as read when chat tab is opened - OR since chat is always visible in new layout, mark read on open?
  // Let's mark read when modal opens.
  useEffect(() => {
    if (isOpen && event?.id) {
      markAsRead(event.id);
    }
  }, [isOpen, event?.id, markAsRead]);

  // Initialize edit form when entering edit mode
  useEffect(() => {
    if (isEditing && event) {
      setEditTitle(event.title);
      setEditCategory(event.category || "event");
      setEditDescription(event.description || "");
      setEditLocation(event.location || "");
      const startDate = parseISO(event.start_date);
      setEditStartDate(format(startDate, "yyyy-MM-dd"));
      setEditStartTime(format(startDate, "HH:mm"));
      if (event.end_date) {
        const endDate = parseISO(event.end_date);
        setEditEndDate(format(endDate, "yyyy-MM-dd"));
        setEditEndTime(format(endDate, "HH:mm"));
      } else {
        setEditEndDate("");
        setEditEndTime("");
      }
    }
  }, [isEditing, event]);

  // Reset edit mode when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setPostToNotice(false);
    }
  }, [isOpen]);

  const handleStartEdit = () => {
    if (!canEdit) {
      if (isCalDAVEvent) {
        toast.error("CalDAV 이벤트는 원본 캘린더에서 수정해주세요");
      } else {
        toast.error("본인이 생성한 일정만 수정할 수 있습니다");
      }
      return;
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!event || !editTitle.trim()) {
      toast.error("제목을 입력해주세요");
      return;
    }

    setIsSaving(true);
    try {
      const startDateTime = new Date(`${editStartDate}T${editStartTime}`);
      const endDateTime = editEndDate && editEndTime
        ? new Date(`${editEndDate}T${editEndTime}`)
        : null;

      const { error } = await updateEvent(event.id, {
        title: editTitle.trim(),
        category: editCategory,
        description: editDescription.trim() || null,
        location: editLocation.trim() || null,
        start_date: startDateTime,
        end_date: endDateTime,
      });

      if (error) {
        toast.error(error.message || "일정 수정 실패");
      } else {
        toast.success("일정이 수정되었습니다");
        setIsEditing(false);
      }
    } catch (err) {
      toast.error("일정 수정 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!event) return;

    if (!canEdit) {
      if (isCalDAVEvent) {
        toast.error("CalDAV 이벤트는 원본 캘린더에서 삭제해주세요");
      } else {
        toast.error("본인이 생성한 일정만 삭제할 수 있습니다");
      }
      return;
    }

    if (!confirm('정말 이 일정을 삭제하시겠습니까?')) return;

    setIsDeleting(true);
    try {
      const { error } = await deleteEvent(event.id);
      if (error) {
        toast.error(error.message || "일정 삭제 실패");
      } else {
        toast.success("일정이 삭제되었습니다");
        onClose();
      }
    } catch (err) {
      toast.error("일정 삭제 중 오류가 발생했습니다");
    } finally {
      setIsDeleting(false);
    }
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

    if (user) {
      if (hasAction) {
        await addItem({ type: "action", content: content.replace("@action", "").trim(), created_by: user.uid });
        toast.success("Action 후보가 등록되었습니다");
      }
      if (hasDecision) {
        await addItem({ type: "decision", content: content.replace("@decision", "").trim(), created_by: user.uid });
        toast.success("결정사항 후보가 등록되었습니다");
      }
      if (hasLink) {
        await addItem({ type: "link", content: content.replace("@link", "").trim(), created_by: user.uid });
        toast.success("자료/링크가 등록되었습니다");
      }
    }
    setMessageInput("");
  };

  const handleCreateItemFromMessage = async (messageContent: string, type: MeetingItemType, messageId: string) => {
    if (!user) return;
    await addItem({ type, content: messageContent, source_message_id: messageId, created_by: user.uid });
    toast.success(type === "action" ? "Action으로 등록됨" : type === "decision" ? "결정사항으로 핀됨" : "자료로 저장됨");
  };

  const handleAddItem = async () => {
    if (!itemContent.trim() || !showItemForm) return;
    if (!user) { toast.error("로그인 정보가 없습니다."); return; }

    const { error } = await addItem({
      type: showItemForm,
      content: itemContent.trim(),
      owner_id: itemOwner || undefined,
      due_at: itemDueDate || undefined,
      created_by: user.uid,
    });

    if (error) {
      toast.error("항목 추가 실패: " + error.message);
      return;
    }

    // Auto-Notice for Decision
    if (showItemForm === "decision" && postToNotice) {
      await addEvent({
        title: `[결정] ${itemContent.trim()}`,
        start_date: new Date(),
        category: "notice",
        type: "department",
        description: `회의(${event?.title})에서 결정된 사항입니다.\n\n${itemContent.trim()}`
      });
      toast.success("공지사항으로도 등록되었습니다");
    }

    toast.success("항목이 추가되었습니다");
    setShowItemForm(null);
    setItemContent("");
    setItemOwner("");
    setItemDueDate("");
    setPostToNotice(false);
  };

  const handleStatusChange = async (itemId: string, status: MeetingItemStatus) => {
    await updateItemStatus(itemId, status);
    toast.success("상태가 변경되었습니다");
  };

  const getProfileColor = (userId: string) => {
    const idx = profiles.findIndex((p) => p.user_id === userId);
    return PROFESSOR_COLORS[idx % PROFESSOR_COLORS.length];
  };

  const getProfileById = (profileId: string) => profiles.find((p) => p.id === profileId);

  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-7xl h-[90vh] p-0 glass-dialog overflow-hidden flex flex-col lg:flex-row">
        {/* LEFT COLUMN: Main Content & Tabs */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border/50">
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <DialogDescription className="sr-only">
              이벤트의 상세 정보, 참여자 목록, 회의록 및 채팅을 확인할 수 있습니다.
            </DialogDescription>
            <DialogTitle className="text-xl font-semibold flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-professor-gold" />
                {isEditing ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xl font-semibold h-auto py-1"
                    placeholder="일정 제목"
                  />
                ) : (
                  <span>{event.title}</span>
                )}
              </div>
              {canEdit && !isEditing && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={handleStartEdit} className="h-8 w-8">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDeleteEvent}
                    disabled={isDeleting}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {isEditing && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={handleCancelEdit} className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                  <Button variant="default" size="icon" onClick={handleSaveEdit} disabled={isSaving} className="h-8 w-8">
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full justify-start px-6 bg-transparent border-b border-border/30 rounded-none h-auto py-0 flex-shrink-0">
              <TabsTrigger value="info" className="gap-2 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <Calendar className="h-4 w-4" />
                정보
              </TabsTrigger>
              <TabsTrigger value="participants" className="gap-2 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <Users className="h-4 w-4" />
                참여자
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-2 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <FileText className="h-4 w-4" />
                회의록 & 자료
              </TabsTrigger>
            </TabsList>

            {/* Info Tab */}
            <TabsContent value="info" className="p-0 m-0 flex-1 min-h-0 relative">
              <ScrollArea className="h-full p-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">시작일</label>
                        <Input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">시작시간</label>
                        <Input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">카테고리</label>
                        <Select value={editCategory} onValueChange={setEditCategory}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {EVENT_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">종료일 (선택)</label>
                        <Input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">종료시간 (선택)</label>
                        <Input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1 block">장소</label>
                      <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="장소 입력" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1 block">설명</label>
                      <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="설명 입력" rows={3} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Clock className="h-5 w-5" />
                      <span>
                        {format(parseISO(event.start_date), "yyyy년 M월 d일 (EEE) a h:mm", { locale: ko })}
                        {event.end_date && ` ~ ${format(parseISO(event.end_date), "a h:mm", { locale: ko })}`}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <MapPin className="h-5 w-5" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.description && (
                      <div className="mt-4 p-4 rounded-xl bg-muted/30">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Participants Tab */}
            <TabsContent value="participants" className="p-0 m-0 flex-1 min-h-0 relative">
              <ScrollArea className="h-full p-6">
                <div className="space-y-3">
                  {participantProfiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">아직 참여자가 없습니다</p>
                  ) : (
                    participantProfiles.map((profile, idx) => (
                      <div key={profile.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className={cn("text-white font-medium bg-gradient-to-br", PROFESSOR_COLORS[idx % PROFESSOR_COLORS.length])}>
                            {profile.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{profile.name}</p>
                          <p className="text-xs text-muted-foreground">{profile.role || "교수"}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="p-0 m-0 flex-1 min-h-0 relative">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6">
                  {/* Decisions */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Pin className="h-4 w-4 text-professor-gold" />
                        결정사항 ({decisions.length})
                      </h4>
                      <Button variant="ghost" size="sm" onClick={() => setShowItemForm("decision")}>
                        + 추가
                      </Button>
                    </div>
                    {decisions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">결정사항이 없습니다</p>
                    ) : (
                      <div className="space-y-2">
                        {decisions.map((item) => (
                          <div key={item.id} className="p-3 rounded-xl bg-professor-gold/10 border border-professor-gold/30">
                            <p className="text-sm">{item.content}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(item.created_at), "M/d HH:mm")}
                              </span>
                              <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => deleteItem(item.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-professor-sage" />
                        Action Items ({actions.length})
                      </h4>
                      <Button variant="ghost" size="sm" onClick={() => setShowItemForm("action")}>
                        + 추가
                      </Button>
                    </div>
                    {actions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Action이 없습니다</p>
                    ) : (
                      <div className="space-y-2">
                        {actions.map((item) => {
                          const owner = item.owner_id ? getProfileById(item.owner_id) : null;
                          const isOverdue = item.due_at && new Date(item.due_at) < new Date() && item.status !== "done";
                          const isDueSoon = item.due_at && !isOverdue &&
                            new Date(item.due_at) <= new Date(Date.now() + 48 * 60 * 60 * 1000) &&
                            item.status !== "done";

                          return (
                            <div key={item.id} className={cn("p-3 rounded-xl border", isOverdue ? "bg-destructive/10 border-destructive/50" : isDueSoon ? "bg-amber-500/10 border-amber-500/50" : "bg-professor-sage/10 border-professor-sage/30")}>
                              <div className="flex items-start gap-3">
                                <Checkbox checked={item.status === "done"} onCheckedChange={(c) => handleStatusChange(item.id, c ? "done" : "open")} className="mt-0.5" />
                                <div className="flex-1">
                                  <p className={cn("text-sm", item.status === "done" && "line-through text-muted-foreground")}>{item.content}</p>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    {owner && <Badge variant="outline" className="text-xs">{owner.name}</Badge>}
                                    {item.due_at && (
                                      <Badge variant={isOverdue ? "destructive" : isDueSoon ? "secondary" : "outline"} className="text-xs">
                                        {isOverdue && "⚠️ "}마감: {format(parseISO(item.due_at), "M/d")}
                                      </Badge>
                                    )}
                                    <Badge variant={item.status === "done" ? "default" : item.status === "doing" ? "secondary" : "outline"} className="text-xs">
                                      {item.status === "done" ? "완료" : item.status === "doing" ? "진행중" : "대기"}
                                    </Badge>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => deleteItem(item.id)}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Links/Files */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-professor-mauve" />
                        자료/링크 ({links.length})
                      </h4>
                      <Button variant="ghost" size="sm" onClick={() => setShowItemForm("link")}>
                        + 추가
                      </Button>
                    </div>
                    {links.length === 0 ? (
                      <p className="text-sm text-muted-foreground">자료가 없습니다</p>
                    ) : (
                      <div className="space-y-2">
                        {links.map((item) => {
                          // Simply render links
                          const content = String(item.content || "");
                          const isFile = content.startsWith("[FILE]");
                          let displayText = content;
                          let url = "";

                          if (isFile) {
                            const parts = content.replace("[FILE] ", "").split("|");
                            displayText = parts[0];
                            url = parts[1] || "";
                          } else if (content.startsWith("http")) {
                            url = content;
                          }

                          return (
                            <div key={item.id} className="p-3 rounded-xl bg-muted/50 flex items-center gap-3">
                              {isFile ? <FileText className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                              <div className="flex-1 min-w-0">
                                {url ? (
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline truncate block">
                                    {displayText}
                                  </a>
                                ) : (
                                  <span className="text-sm truncate block">{displayText}</span>
                                )}
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Inline Item Form */}
                  <AnimatePresence>
                    {showItemForm && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="bg-muted/30 p-4 rounded-xl overflow-hidden">
                        <h5 className="font-medium mb-3 text-sm">
                          {showItemForm === "action" ? "Action 추가" : showItemForm === "decision" ? "결정사항 추가" : "자료/링크 추가"}
                        </h5>

                        {showItemForm === "link" ? (
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <Input placeholder="링크 URL or 설명" value={itemContent} onChange={e => setItemContent(e.target.value)} className="flex-1" />
                              <div className="relative">
                                <input type="file" id="modal-file-upload-inline" className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const toastId = toast.loading("파일 업로드 중...");
                                    try {
                                      const { uploadFile } = await import("@/hooks/useFileResources").then(m => m.useFileResources());
                                      const result = await uploadFile(file, { title: file.name, description: "Inline Upload", category: "meeting" });
                                      if (result.publicUrl) {
                                        setItemContent(`[FILE] ${file.name}|${result.publicUrl}`);
                                        toast.success("파일 첨부됨");
                                      }
                                      toast.dismiss(toastId);
                                    } catch (e) { console.error(e); toast.error("업로드 실패"); toast.dismiss(toastId); }
                                  }}
                                />
                                <Button variant="outline" size="sm" onClick={() => document.getElementById('modal-file-upload-inline')?.click()}>
                                  <Link2 className="h-4 w-4 mr-2" /> 파일
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <Textarea value={itemContent} onChange={e => setItemContent(e.target.value)} placeholder="내용 입력..." rows={2} />
                        )}

                        {showItemForm === "decision" && (
                          <div className="flex items-center space-x-2 mt-3 mb-2">
                            <Checkbox id="notice-post" checked={postToNotice} onCheckedChange={(c) => setPostToNotice(!!c)} />
                            <label htmlFor="notice-post" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              결정사항을 공지사항으로 등록
                            </label>
                          </div>
                        )}

                        {showItemForm === "action" && (
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <Select value={itemOwner} onValueChange={setItemOwner}>
                              <SelectTrigger><SelectValue placeholder="담당자" /></SelectTrigger>
                              <SelectContent>
                                {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input type="date" value={itemDueDate} onChange={e => setItemDueDate(e.target.value)} />
                          </div>
                        )}

                        <div className="flex justify-end gap-2 mt-3">
                          <Button size="sm" variant="ghost" onClick={() => setShowItemForm(null)}>취소</Button>
                          <Button size="sm" onClick={handleAddItem}>추가</Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT COLUMN: Chat (Persistent) */}
        <div className="w-full lg:w-[420px] bg-muted/5 flex flex-col h-[50vh] lg:h-auto border-t lg:border-t-0 lg:border-l border-border/50">
          <div className="p-4 border-b border-border/10 bg-white/50 backdrop-blur-sm flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              실시간 소통
            </h3>
            {/* File Upload in Chat Toolbar? */}
            <div className="relative">
              <input type="file" id="chat-file-upload" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const { uploadFile } = await import("@/hooks/useFileResources").then(m => m.useFileResources());
                    toast.info("파일 전송 중...");
                    const result = await uploadFile(file, { title: file.name, description: "Chat Upload", category: "meeting" });
                    if (result.publicUrl) {
                      // Send message with link
                      await sendMessage(`[FILE] ${file.name} | ${result.publicUrl}`);
                      // Also add to links? Optional. The user said "attach immediately".
                      toast.success("파일 전송 완료");
                    }
                  } catch (err) { toast.error("전송 실패"); }
                }}
              />
              <Button variant="ghost" size="sm" className="h-8 w-8" onClick={() => document.getElementById('chat-file-upload')?.click()}>
                <Link2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg) => {
                const sender = profiles.find(p => p.user_id === msg.user_id);
                const isMe = msg.user_id === user?.uid;
                // Check if message is a file link
                const content = String(msg.content || "");
                const isFileMsg = content.startsWith("[FILE]");
                let displayContent = content;
                let fileUrl = "";
                if (isFileMsg) {
                  const parts = content.replace("[FILE]", "").split("|");
                  displayContent = parts[0]?.trim();
                  fileUrl = parts[1]?.trim();
                }

                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-3", isMe && "flex-row-reverse")}>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={cn("text-white text-xs font-medium bg-gradient-to-br", getProfileColor(msg.user_id))}>{sender?.name[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className={cn("max-w-[75%]", isMe && "text-right")}>
                      <p className="text-[10px] text-muted-foreground mb-1">{sender?.name} · {format(parseISO(msg.created_at), "HH:mm")}</p>
                      <div className={cn("p-3 rounded-2xl text-sm text-left", isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-white border shadow-sm rounded-tl-sm")}>
                        {isFileMsg ? (
                          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
                            <FileText className="h-4 w-4" />
                            {displayContent}
                          </a>
                        ) : msg.content}
                      </div>
                      {!isMe && (
                        <div className="flex gap-1 mt-1 opacity-50 hover:opacity-100">
                          {/* Quick Actions */}
                          <button onClick={() => handleCreateItemFromMessage(msg.content, "action", msg.id)} className="p-1 hover:bg-muted rounded"><CheckSquare className="h-3 w-3" /></button>
                          <button onClick={() => handleCreateItemFromMessage(msg.content, "decision", msg.id)} className="p-1 hover:bg-muted rounded"><Pin className="h-3 w-3" /></button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          <div className="p-3 border-t bg-white">
            <div className="flex gap-2">
              <Input value={messageInput} onChange={e => setMessageInput(e.target.value)} placeholder="메시지 (@action, @decision)" onKeyPress={e => e.key === "Enter" && handleSendMessage()} />
              <Button size="icon" onClick={handleSendMessage}><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
