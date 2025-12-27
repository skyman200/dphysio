import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useEvents } from "@/hooks/useEvents";
import { useProfiles } from "@/hooks/useProfiles";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { motion } from "framer-motion";
import { Users, Calendar, FileText, Plus, Search, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MeetingForm } from "@/components/meetings/MeetingForm";

const PROFESSOR_COLORS = [
  "from-professor-terracotta to-professor-terracotta/80",
  "from-professor-burgundy to-professor-burgundy/80",
  "from-professor-sage to-professor-sage/80",
  "from-professor-gold to-professor-gold/80",
  "from-professor-mauve to-professor-mauve/80",
  "from-professor-rose to-professor-rose/80",
];

const MeetingsPage = () => {
  const { events, addEvent, updateEvent, deleteEvent } = useEvents(); // Added updateEvent, deleteEvent
  const { profiles } = useProfiles();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // Added editingId
  const [newMeeting, setNewMeeting] = useState({
    title: "",
    date: "",
    time: "14:00",
    location: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  // Filter only meeting events
  const meetings = events
    .filter((e) => {
      const category = (e as any).category || "event";
      return category === "meeting";
    })
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  const filteredMeetings = meetings.filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProfessorInfo = (userId: string) => {
    const idx = profiles.findIndex((p) => p.user_id === userId);
    const profile = profiles[idx];
    return {
      name: profile?.name || "Unknown",
      color: PROFESSOR_COLORS[idx % PROFESSOR_COLORS.length],
    };
  };

  const handleAddMeeting = async () => {
    if (!newMeeting.title || !newMeeting.date) {
      toast({
        title: "입력 오류",
        description: "제목과 날짜를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    if (editingId) {
      // UPDATE Existing
      const dateTimeStr = `${newMeeting.date}T${newMeeting.time}`;
      const { error } = await updateEvent(editingId, {
        title: newMeeting.title,
        start_date: new Date(dateTimeStr),
        location: newMeeting.location || null,
        description: newMeeting.description || null,
      });

      if (error) {
        toast({ title: "오류", description: "수정 실패", variant: "destructive" });
      } else {
        toast({ title: "수정 완료", description: "회의가 수정되었습니다." });
        setDialogOpen(false);
        setNewMeeting({ title: "", date: "", time: "14:00", location: "", description: "" });
        setEditingId(null);
      }
    } else {
      // CREATE New
      const dateTimeStr = `${newMeeting.date}T${newMeeting.time}`;
      const { error } = await addEvent({
        title: newMeeting.title,
        start_date: new Date(dateTimeStr),
        location: newMeeting.location || undefined,
        description: newMeeting.description || undefined,
        category: "meeting",
        type: "department",
      });

      if (error) {
        toast({
          title: "오류",
          description: "회의를 추가하지 못했습니다.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "회의 추가됨",
          description: "새로운 회의가 추가되었습니다.",
        });
        setNewMeeting({ title: "", date: "", time: "14:00", location: "", description: "" });
        setDialogOpen(false);
      }
    }
    setLoading(false);
  };

  return (
    <MainLayout title="회의·위원회">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">회의·위원회</h2>
            <p className="text-muted-foreground">
              학과 회의 및 위원회 일정을 관리합니다
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="회의 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            <Button className="gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              회의 추가
            </Button>
          </div>
        </div>

        {/* Meeting List */}
        <div className="grid gap-4">
          {filteredMeetings.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">
                회의 일정이 없습니다
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-2">
                새 회의를 추가하거나 일정에서 '회의' 유형으로 등록해주세요
              </p>
            </div>
          ) : (
            filteredMeetings.map((meeting, idx) => {
              const creator = getProfessorInfo(meeting.created_by);
              return (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass-card rounded-2xl p-5 hover:scale-[1.01] transition-transform cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-professor-burgundy/20 to-professor-burgundy/10 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-professor-burgundy">
                        {format(parseISO(meeting.start_date), "d")}
                      </span>
                      <span className="text-xs text-professor-burgundy/70">
                        {format(parseISO(meeting.start_date), "MMM", { locale: ko })}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {meeting.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(parseISO(meeting.start_date), "a h:mm", { locale: ko })}
                            </span>
                            {meeting.location && (
                              <span>• {meeting.location}</span>
                            )}
                          </div>
                        </div>

                        <Badge variant="outline" className="flex-shrink-0">
                          회의
                        </Badge>
                      </div>

                      {meeting.description && (
                        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                          {meeting.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback
                              className={cn(
                                "text-white text-xs font-medium bg-gradient-to-br",
                                creator.color
                              )}
                            >
                              {creator.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {creator.name}
                          </span>
                        </div>

                        <div className="ml-auto flex items-center gap-1">
                          {/* Edit/Delete for Creator or Admin */}
                          <div className="flex gap-1 mr-2 border-r pr-2 border-border/50">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                const meetingDate = parseISO(meeting.start_date);
                                setNewMeeting({
                                  title: meeting.title,
                                  date: format(meetingDate, "yyyy-MM-dd"),
                                  time: format(meetingDate, "HH:mm"),
                                  location: meeting.location || "",
                                  description: meeting.description || ""
                                });
                                setEditingId(meeting.id);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm('이 회의를 삭제하시겠습니까?')) {
                                  await deleteEvent(meeting.id);
                                  toast({ title: "삭제됨", description: "회의가 삭제되었습니다." });
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                            <FileText className="h-3.5 w-3.5" />
                            상세보기
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Meeting Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setEditingId(null);
          setNewMeeting({ title: "", date: "", time: "14:00", location: "", description: "" });
        }
      }}>
        <DialogContent className="glass rounded-2xl border-0 sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {editingId ? "회의 수정" : "새 회의 추가"}
            </DialogTitle>
          </DialogHeader>
          <MeetingForm
            meeting={newMeeting}
            setMeeting={setNewMeeting}
            onSubmit={handleAddMeeting}
            onCancel={() => setDialogOpen(false)}
            loading={loading}
            editingId={editingId}
          />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default MeetingsPage;
