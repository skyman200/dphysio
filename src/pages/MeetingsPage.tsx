import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useEvents } from "@/hooks/useEvents";
import { useProfiles } from "@/hooks/useProfiles";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { motion } from "framer-motion";
import { Users, Calendar, Plus, Search, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();
  const { profiles } = useProfiles();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newMeeting, setNewMeeting] = useState({
    title: "",
    date: "",
    time: "14:00",
    endDate: "",
    endTime: "15:00",
    isAllDay: false,
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

    const startDateTimeStr = newMeeting.isAllDay
      ? `${newMeeting.date}T00:00:00`
      : `${newMeeting.date}T${newMeeting.time}`;

    const endDateStr = newMeeting.endDate || newMeeting.date;
    const endDateTimeStr = newMeeting.isAllDay
      ? `${endDateStr}T23:59:59`
      : `${endDateStr}T${newMeeting.endTime || newMeeting.time}`;

    const eventData = {
      title: newMeeting.title,
      start_date: new Date(startDateTimeStr),
      end_date: new Date(endDateTimeStr),
      location: newMeeting.location || null,
      description: newMeeting.description || null,
      category: "meeting",
      type: "department",
    };

    if (editingId) {
      // UPDATE Existing
      const { error: updateError } = await updateEvent(editingId, eventData);

      if (updateError) {
        toast({ title: "오류", description: "수정 실패", variant: "destructive" });
      } else {
        toast({ title: "수정 완료", description: "회의가 수정되었습니다." });
        setDialogOpen(false);
        setNewMeeting({
          title: "", date: "", time: "14:00",
          endDate: "", endTime: "15:00", isAllDay: false,
          location: "", description: ""
        });
        setEditingId(null);
      }
    } else {
      // CREATE New
      const { error: addError } = await addEvent(eventData);

      if (addError) {
        toast({ title: "오류", description: "추가 실패", variant: "destructive" });
      } else {
        toast({ title: "추가 완료", description: "새 회의가 추가되었습니다." });
        setDialogOpen(false);
        setNewMeeting({
          title: "", date: "", time: "14:00",
          endDate: "", endTime: "15:00", isAllDay: false,
          location: "", description: ""
        });
      }
    }
    setLoading(false);
  };

  const handleEditMeeting = (meeting: any) => {
    setEditingId(meeting.id);
    const startDate = new Date(meeting.start_date);
    const endDate = meeting.end_date ? new Date(meeting.end_date) : new Date(startDate.getTime() + 60 * 60 * 1000);

    setNewMeeting({
      title: meeting.title,
      date: format(startDate, "yyyy-MM-dd"),
      time: format(startDate, "HH:mm"),
      endDate: format(endDate, "yyyy-MM-dd"),
      endTime: format(endDate, "HH:mm"),
      isAllDay: false,
      location: meeting.location || "",
      description: meeting.description || "",
    });
    setDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-display font-medium text-foreground">
              학과 회의 <span className="text-primary">.Meeting</span>
            </h1>
            <p className="text-muted-foreground mt-2 font-light">
              학과 및 교수 회의 일정을 관리합니다.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingId(null);
              setNewMeeting({
                title: "", date: format(new Date(), "yyyy-MM-dd"), time: "14:00",
                endDate: format(new Date(), "yyyy-MM-dd"), endTime: "15:00", isAllDay: false,
                location: "", description: ""
              });
              setDialogOpen(true);
            }}
            className="btn-elegant shadow-lg hover:shadow-xl"
          >
            <Plus className="mr-2 h-4 w-4" /> 새 회의 추가
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="회의 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 bg-white/50 backdrop-blur-sm border-0 focus-visible:ring-1 focus-visible:ring-primary/50 text-base"
          />
        </div>

        {/* Meetings List */}
        <div className="space-y-4">
          {filteredMeetings.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground font-light">
              예정된 회의가 없습니다.
            </div>
          ) : (
            filteredMeetings.map((meeting) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                key={meeting.id}
                className="group relative bg-white/40 backdrop-blur-md rounded-2xl p-6 border border-white/60 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Date Badge */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary">
                    <span className="text-xs font-medium uppercase tracking-wider">
                      {format(new Date(meeting.start_date), "MMM")}
                    </span>
                    <span className="text-2xl font-display font-medium">
                      {format(new Date(meeting.start_date), "dd")}
                    </span>
                    <span className="text-xs opacity-70">
                      {format(new Date(meeting.start_date), "EEE", { locale: ko })}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-grow space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="text-xl font-medium text-foreground group-hover:text-primary transition-colors">
                        {meeting.title}
                      </h3>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => handleEditMeeting(meeting)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            if (confirm('정말 삭제하시겠습니까?')) {
                              await deleteEvent(meeting.id);
                              toast({ title: "삭제 완료", description: "회의가 삭제되었습니다." });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary/70" />
                        {format(new Date(meeting.start_date), "a h:mm", { locale: ko })}
                        {meeting.end_date && ` - ${format(new Date(meeting.end_date), "a h:mm", { locale: ko })}`}
                      </div>
                      {meeting.location && (
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                          {meeting.location}
                        </div>
                      )}
                    </div>

                    {meeting.description && (
                      <p className="text-sm text-muted-foreground/80 leading-relaxed font-light">
                        {meeting.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <Avatar className="h-6 w-6 ring-2 ring-background">
                        <AvatarFallback className={cn("text-[10px] text-white", getProfessorInfo(meeting.created_by).color)}>
                          {getProfessorInfo(meeting.created_by).name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        작성자: {getProfessorInfo(meeting.created_by).name}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Add Meeting Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setEditingId(null);
          setNewMeeting({
            title: "", date: format(new Date(), "yyyy-MM-dd"), time: "14:00",
            endDate: format(new Date(), "yyyy-MM-dd"), endTime: "15:00", isAllDay: false,
            location: "", description: ""
          });
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
