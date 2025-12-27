import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Calendar, Users, FileText, CheckCircle2, MapPin, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useEvents } from "@/hooks/useEvents";
import { useProfiles } from "@/hooks/useProfiles";
import { useTodos } from "@/hooks/useTodos";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

// Warm elegant colors for professors
const PROFESSOR_COLORS = [
  { bg: "from-terracotta/20 to-terracotta/10", border: "border-terracotta/60", text: "text-terracotta" },
  { bg: "from-burgundy/20 to-burgundy/10", border: "border-burgundy/60", text: "text-burgundy" },
  { bg: "from-sage/30 to-sage/20", border: "border-sage/60", text: "text-sage" },
  { bg: "from-gold/20 to-gold/10", border: "border-gold/60", text: "text-gold" },
  { bg: "from-mauve/20 to-mauve/10", border: "border-mauve/60", text: "text-mauve" },
  { bg: "from-rose/20 to-rose/10", border: "border-rose/60", text: "text-rose" },
];

const DEPARTMENT_KEYWORDS = ["학술제", "시험", "입시", "졸업", "학과", "세미나", "워크샵", "OT", "행사"];

export function AcademicMatrix() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEventDialogOpen, setNewEventDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", location: "", date: "", isDepartment: false });
  const [showSuccess, setShowSuccess] = useState(false);

  const { events, loading, addEvent } = useEvents();
  const { todos } = useTodos();
  const { profiles } = useProfiles();
  const { toast } = useToast();

  // Get week days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Navigate weeks
  const prevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const goToday = () => setCurrentDate(new Date());

  // Categorize events
  const { departmentEvents, professorEvents } = useMemo(() => {
    const dept: any[] = [];
    const prof: any[] = [];

    events.forEach((event) => {
      const isDeptEvent = DEPARTMENT_KEYWORDS.some((keyword) => 
        event.title.includes(keyword) || (event.description || "").includes(keyword)
      );
      if (isDeptEvent) {
        dept.push(event);
      } else {
        prof.push(event);
      }
    });

    return { departmentEvents: dept, professorEvents: prof };
  }, [events]);

  // Get events for a specific day
  const getEventsForDay = (day: Date, eventList: any[]) => {
    return eventList.filter((event) => {
      const eventDate = parseISO(event.start_date);
      return isSameDay(eventDate, day);
    });
  };

  // Get professor color
  const getProfessorColor = (userId: string) => {
    const index = profiles.findIndex((p) => p.user_id === userId);
    return PROFESSOR_COLORS[index % PROFESSOR_COLORS.length];
  };

  // Get profile name
  const getProfileName = (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.name || "알 수 없음";
  };

  // Handle add event with success animation
  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      toast({
        title: "입력 오류",
        description: "제목과 날짜를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const title = newEvent.isDepartment ? `[학과] ${newEvent.title}` : newEvent.title;

    const { error } = await addEvent({
      title,
      start_date: new Date(newEvent.date),
      location: newEvent.location || undefined,
    });

    if (error) {
      toast({ title: "오류", description: "일정을 추가하지 못했습니다.", variant: "destructive" });
    } else {
      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setNewEvent({ title: "", location: "", date: "", isDepartment: false });
        setNewEventDialogOpen(false);
      }, 1500);
    }
  };

  // Get todos for professor
  const getTodosForProfessor = (userId: string) => {
    return todos.filter((t) => t.created_by === userId && !t.completed);
  };

  if (loading) {
    return (
      <div className="glass-card p-12 animate-fade-in flex items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Navigation */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h2 className="font-display text-3xl tracking-tight">
              <span className="text-foreground">{format(currentDate, "yyyy년 M월", { locale: ko })}</span>
              <span className="text-muted-foreground/50 ml-3 text-xl font-light">
                {format(weekStart, "M/d")} - {format(addDays(weekStart, 6), "M/d")}
              </span>
            </h2>
            <div className="flex items-center gap-1 glass rounded-full p-1">
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={prevWeek}>
                <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={nextWeek}>
                <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goToday} className="rounded-full text-muted-foreground">
              오늘
            </Button>
            <Button 
              onClick={() => setNewEventDialogOpen(true)}
              className="btn-elegant gap-2"
            >
              <Plus className="h-4 w-4" />
              일정 추가
            </Button>
          </div>
        </div>
      </div>

      {/* Top Layer: Department Events Ribbon */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gold/30 to-amber-200/20 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-gold" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-medium text-foreground/60 tracking-wide">학과 공통 일정</span>
        </div>
        
        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border/20">
            {weekDays.map((day, i) => (
              <div
                key={i}
                className={cn(
                  "py-4 text-center border-r border-border/10 last:border-r-0",
                  isSameDay(day, new Date()) && "bg-primary/5"
                )}
              >
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-1">
                  {format(day, "EEE", { locale: ko })}
                </div>
                <div className={cn(
                  "text-lg font-light",
                  isSameDay(day, new Date()) && "text-primary font-medium"
                )}>
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 min-h-[100px]">
            {weekDays.map((day, i) => {
              const dayEvents = getEventsForDay(day, departmentEvents);
              return (
                <div
                  key={i}
                  className={cn(
                    "p-3 border-r border-border/10 last:border-r-0 min-h-[100px]",
                    isSameDay(day, new Date()) && "bg-primary/5"
                  )}
                >
                  <AnimatePresence>
                    {dayEvents.map((event, eventIndex) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: eventIndex * 0.05 }}
                        onClick={() => {
                          setSelectedEvent(event);
                          setDialogOpen(true);
                        }}
                        className="mb-2 p-3 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
                          bg-gradient-to-br from-gold/20 via-amber-100/10 to-transparent
                          border border-gold/30 backdrop-blur-sm group"
                      >
                        <div className="text-xs font-medium text-foreground/80 truncate group-hover:text-foreground">
                          {event.title.replace("[학과] ", "")}
                        </div>
                        {event.location && (
                          <div className="text-[10px] text-muted-foreground/60 mt-1 truncate">
                            {event.location}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Layer: Professor Timelines */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-terracotta/30 to-terracotta/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-terracotta" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-medium text-foreground/60 tracking-wide">교수님 개인 일정</span>
        </div>

        <div className="glass-card overflow-hidden">
          {/* Time Header */}
          <div className="grid grid-cols-[200px_1fr] border-b border-border/20">
            <div className="p-4 border-r border-border/20 bg-muted/20">
              <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">교수님</span>
            </div>
            <div className="grid grid-cols-7">
              {weekDays.map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    "py-4 text-center border-r border-border/10 last:border-r-0",
                    isSameDay(day, new Date()) && "bg-primary/5"
                  )}
                >
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-1">
                    {format(day, "EEE", { locale: ko })}
                  </div>
                  <div className={cn(
                    "text-lg font-light",
                    isSameDay(day, new Date()) && "text-primary font-medium"
                  )}>
                    {format(day, "d")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Professor Rows */}
          {profiles.slice(0, 6).map((profile, profileIndex) => {
            const colors = PROFESSOR_COLORS[profileIndex % PROFESSOR_COLORS.length];
            const professorTodos = getTodosForProfessor(profile.user_id);

            return (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: profileIndex * 0.1 }}
                className="grid grid-cols-[200px_1fr] border-b border-border/10 last:border-b-0 group/row hover:bg-muted/5 transition-colors"
              >
                {/* Professor Info */}
                <div className="p-4 border-r border-border/20 flex items-center gap-3">
                  <Avatar className={cn("h-10 w-10 ring-2 ring-offset-2 ring-offset-background", colors.border)}>
                    <AvatarFallback className={cn("bg-gradient-to-br text-white font-display text-sm", colors.bg.replace("/20", "").replace("/10", ""))}>
                      {profile.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground/90 truncate">{profile.name}</div>
                    <div className="text-xs text-muted-foreground/50 truncate">{profile.position || profile.role}</div>
                  </div>
                  {professorTodos.length > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary">
                      <CheckCircle2 className="h-3 w-3" />
                      <span className="text-[10px] font-medium">{professorTodos.length}</span>
                    </div>
                  )}
                </div>

                {/* Timeline Grid */}
                <div className="grid grid-cols-7">
                  {weekDays.map((day, dayIndex) => {
                    const dayEvents = getEventsForDay(day, professorEvents).filter(
                      (e) => e.created_by === profile.user_id
                    );

                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          "p-2 border-r border-border/10 last:border-r-0 min-h-[80px] relative",
                          isSameDay(day, new Date()) && "bg-primary/5"
                        )}
                      >
                        {/* Vertical Guide Line on hover */}
                        <div className="absolute inset-0 opacity-0 group-hover/row:opacity-100 transition-opacity pointer-events-none">
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/30" />
                        </div>

                        <AnimatePresence>
                          {dayEvents.map((event, eventIndex) => (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              whileHover={{ scale: 1.03, y: -2 }}
                              transition={{ delay: eventIndex * 0.05 }}
                              onClick={() => {
                                setSelectedEvent(event);
                                setDialogOpen(true);
                              }}
                              className={cn(
                                "mb-2 p-2.5 rounded-xl cursor-pointer transition-all duration-300",
                                "bg-gradient-to-br backdrop-blur-sm border",
                                colors.bg, colors.border
                              )}
                            >
                              <div className={cn("text-[11px] font-medium truncate", colors.text)}>
                                {event.title}
                              </div>
                              {event.location && (
                                <div className="text-[9px] text-muted-foreground/50 mt-0.5 truncate">
                                  {event.location}
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        {/* Empty state indicator */}
                        {dayEvents.length === 0 && (
                          <div className="h-full flex items-center justify-center opacity-0 group-hover/row:opacity-30 transition-opacity">
                            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-0 max-w-md p-0 overflow-hidden bg-gradient-to-br from-background via-background to-muted/30 backdrop-blur-2xl rounded-3xl shadow-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Header with gradient */}
            <div className="relative p-8 pb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />
              <DialogHeader className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                    <Calendar className="h-5 w-5 text-white" strokeWidth={1.5} />
                  </div>
                  <DialogTitle className="font-display text-2xl tracking-tight">
                    {selectedEvent?.title}
                  </DialogTitle>
                </div>
              </DialogHeader>
            </div>
            
            {selectedEvent && (
              <div className="px-8 pb-8 space-y-4">
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/30"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">날짜 및 시간</div>
                    <div className="text-sm font-medium text-foreground">
                      {format(parseISO(selectedEvent.start_date), "yyyy년 M월 d일 (EEE) HH:mm", { locale: ko })}
                    </div>
                  </div>
                </motion.div>

                {selectedEvent.location && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/30"
                  >
                    <div className="w-10 h-10 rounded-xl bg-sage/20 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-sage" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">장소</div>
                      <div className="text-sm font-medium text-foreground">{selectedEvent.location}</div>
                    </div>
                  </motion.div>
                )}

                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/30"
                >
                  <div className="w-10 h-10 rounded-xl bg-terracotta/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-terracotta" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">생성자</div>
                    <div className="text-sm font-medium text-foreground">{getProfileName(selectedEvent.created_by)}</div>
                  </div>
                </motion.div>

                {selectedEvent.description && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-2">설명</div>
                    <div className="text-sm text-foreground/80 leading-relaxed">{selectedEvent.description}</div>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* New Event Dialog */}
      <Dialog open={newEventDialogOpen} onOpenChange={setNewEventDialogOpen}>
        <DialogContent className="border-0 max-w-md p-0 overflow-hidden bg-gradient-to-br from-background via-background to-muted/30 backdrop-blur-2xl rounded-3xl shadow-2xl">
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center justify-center py-20 px-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-success to-sage flex items-center justify-center mb-6 shadow-lg shadow-success/30"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
                  >
                    <Check className="h-10 w-10 text-white" strokeWidth={2.5} />
                  </motion.div>
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="font-display text-2xl text-foreground mb-2"
                >
                  일정이 추가되었습니다
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-muted-foreground text-sm"
                >
                  캘린더에서 확인하세요
                </motion.p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex gap-1 mt-4"
                >
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ delay: 0.7 + i * 0.1, duration: 0.3 }}
                      className="w-2 h-2 rounded-full bg-primary/60"
                    />
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {/* Header */}
                <div className="relative p-8 pb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />
                  <DialogHeader className="relative">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                        <Sparkles className="h-5 w-5 text-white" strokeWidth={1.5} />
                      </div>
                      <DialogTitle className="font-display text-2xl tracking-tight">새 일정 추가</DialogTitle>
                    </div>
                    <p className="text-sm text-muted-foreground/60 mt-1">학과 또는 개인 일정을 추가하세요</p>
                  </DialogHeader>
                </div>

                <div className="px-8 pb-8 space-y-5">
                  {/* Event Type Toggle */}
                  <div className="flex gap-2 p-1.5 rounded-2xl bg-muted/30 border border-border/30">
                    <button
                      type="button"
                      onClick={() => setNewEvent({ ...newEvent, isDepartment: true })}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 text-sm font-medium",
                        newEvent.isDepartment
                          ? "bg-gradient-to-br from-gold/20 to-amber-100/10 text-gold shadow-sm border border-gold/30"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Calendar className="h-4 w-4" />
                      학과 일정
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewEvent({ ...newEvent, isDepartment: false })}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 text-sm font-medium",
                        !newEvent.isDepartment
                          ? "bg-gradient-to-br from-primary/20 to-primary/10 text-primary shadow-sm border border-primary/30"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Users className="h-4 w-4" />
                      개인 일정
                    </button>
                  </div>

                  {/* Title Input */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground/70">제목</Label>
                    <Input
                      placeholder="일정 제목을 입력하세요"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      className="h-12 rounded-xl bg-muted/20 border-border/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {/* Date Input */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground/70">날짜 및 시간</Label>
                    <Input
                      type="datetime-local"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="h-12 rounded-xl bg-muted/20 border-border/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {/* Location Input */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground/70">장소 (선택)</Label>
                    <Input
                      placeholder="장소를 입력하세요"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      className="h-12 rounded-xl bg-muted/20 border-border/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button 
                    onClick={handleAddEvent} 
                    className="w-full h-14 rounded-2xl text-base font-medium bg-gradient-to-r from-primary via-primary to-accent hover:opacity-90 transition-all shadow-lg shadow-primary/25"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    일정 추가
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
