import { useState, useMemo } from "react";
import { useResources, Reservation } from "@/hooks/useResources";
import { useProfiles } from "@/hooks/useProfiles";
import { useTodos } from "@/hooks/useTodos";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Trash2, Calendar, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 9);

// Warm user colors
const USER_COLORS = [
  "from-[hsl(12,70%,55%)] to-[hsl(12,70%,45%)]",
  "from-[hsl(350,45%,45%)] to-[hsl(350,45%,35%)]",
  "from-[hsl(152,55%,40%)] to-[hsl(152,55%,30%)]",
  "from-[hsl(38,85%,50%)] to-[hsl(38,85%,40%)]",
  "from-[hsl(280,50%,50%)] to-[hsl(280,50%,40%)]",
  "from-[hsl(330,60%,55%)] to-[hsl(330,60%,45%)]",
];

interface ResourceTimelineProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onSlotClick: (resourceId: string, hour: number) => void;
}

export function ResourceTimeline({
  selectedDate,
  onDateChange,
  onSlotClick,
}: ResourceTimelineProps) {
  const { resources, reservations, deleteReservation } = useResources();
  const { profiles } = useProfiles();
  const { todos } = useTodos();
  const { user } = useAuth();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<Reservation | null>(null);

  const getProfileName = (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.name || "알 수 없음";
  };

  const getUserColorIndex = (userId: string) => {
    const index = profiles.findIndex((p) => p.user_id === userId);
    return index >= 0 ? index % USER_COLORS.length : 0;
  };

  const getTodoTitle = (todoId: string | null) => {
    if (!todoId) return null;
    const todo = todos.find((t) => t.id === todoId);
    return todo?.title;
  };

  const dayReservations = useMemo(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    return reservations.filter((r) => {
      const start = new Date(r.start_time);
      const end = new Date(r.end_time);
      return (
        r.status === "confirmed" &&
        start < endOfDay &&
        end > startOfDay
      );
    });
  }, [reservations, selectedDate]);

  const getReservationsForSlot = (resourceId: string, hour: number) => {
    const slotStart = new Date(selectedDate);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(selectedDate);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    return dayReservations.filter((r) => {
      const start = new Date(r.start_time);
      const end = new Date(r.end_time);
      return r.resource_id === resourceId && start < slotEnd && end > slotStart;
    });
  };

  const getReservationSpan = (reservation: Reservation, hour: number) => {
    const start = new Date(reservation.start_time);
    const end = new Date(reservation.end_time);
    const slotStart = new Date(selectedDate);
    slotStart.setHours(hour, 0, 0, 0);

    const isFirstSlot = start.getHours() === hour ||
      (start < slotStart && slotStart.getHours() === 9);

    const startHour = Math.max(start.getHours(), 9);
    const endHour = Math.min(Math.ceil(end.getHours() + end.getMinutes() / 60), 23);
    const span = endHour - startHour;

    return { isFirstSlot, span };
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await deleteReservation(deleteTarget.id);
    if (error) {
      toast({ title: "삭제 실패", variant: "destructive" });
    } else {
      toast({ title: "예약이 삭제되었습니다" });
    }
    setDeleteTarget(null);
  };

  const prevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  const goToday = () => {
    onDateChange(new Date());
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const coveredSlots = useMemo(() => {
    const covered = new Set<string>();

    resources.forEach((resource) => {
      HOURS.forEach((hour) => {
        const reservationsInSlot = getReservationsForSlot(resource.id, hour);
        reservationsInSlot.forEach((res) => {
          const { isFirstSlot, span } = getReservationSpan(res, hour);
          if (isFirstSlot && span > 1) {
            for (let i = 1; i < span && hour + i <= 22; i++) {
              covered.add(`${resource.id}-${hour + i}`);
            }
          }
        });
      });
    });

    return covered;
  }, [resources, dayReservations, selectedDate]);

  return (
    <div className="glass-card overflow-hidden">
      {/* Date Navigation */}
      <div className="flex items-center justify-between p-6 border-b border-border/20">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevDay}
          className="rounded-full w-10 h-10 hover:bg-muted/50 transition-all"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
        </Button>

        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-primary" strokeWidth={1.5} />
          <h3 className={`font-display text-xl ${isToday(selectedDate) ? 'text-primary' : 'text-foreground'}`}>
            {formatDate(selectedDate)}
          </h3>
          {!isToday(selectedDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToday}
              className="rounded-full text-xs font-medium px-4"
            >
              오늘
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={nextDay}
          className="rounded-full w-10 h-10 hover:bg-muted/50 transition-all"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
        </Button>
      </div>

      {/* Timeline Grid */}
      <div className="overflow-x-auto smooth-scroll">
        <div className="min-w-[1100px]">
          {/* Time Header */}
          <div className="flex border-b border-border/15">
            <div className="w-40 flex-shrink-0 p-4 font-medium text-sm text-muted-foreground border-r border-border/15">
              공간
            </div>
            {HOURS.map((hour) => {
              const now = new Date();
              const isCurrentHour = isToday(selectedDate) && now.getHours() === hour;

              return (
                <div
                  key={hour}
                  className={`
                    flex-1 min-w-[75px] p-4 text-center text-xs font-medium border-r border-border/15 last:border-r-0
                    ${isCurrentHour ? 'bg-primary/8 text-primary' : 'text-muted-foreground'}
                  `}
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>
              );
            })}
          </div>

          {/* Resource Rows */}
          {resources.map((resource, resourceIdx) => (
            <div
              key={resource.id}
              className={`
                flex border-b border-border/10 last:border-b-0 transition-colors
                ${resourceIdx % 2 === 0 ? 'bg-card/30' : 'bg-transparent'}
              `}
            >
              <div className="w-40 flex-shrink-0 p-5 font-display text-base border-r border-border/15 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary/40" />
                {resource.name}
              </div>

              {HOURS.map((hour) => {
                const slotKey = `${resource.id}-${hour}`;

                if (coveredSlots.has(slotKey)) {
                  return null;
                }

                const reservationsInSlot = getReservationsForSlot(resource.id, hour);
                const reservation = reservationsInSlot[0];

                const now = new Date();
                const isCurrentHour = isToday(selectedDate) && now.getHours() === hour;

                if (reservation) {
                  const { span } = getReservationSpan(reservation, hour);
                  const colorIndex = getUserColorIndex(reservation.user_id);
                  const colorClass = USER_COLORS[colorIndex];
                  const todoTitle = getTodoTitle(reservation.todo_id);
                  const isOwner = user?.uid === reservation.user_id;
                  const displaySpan = Math.min(span, 23 - hour);

                  return (
                    <div
                      key={hour}
                      className="relative timeline-slot border-r border-border/10 last:border-r-0"
                      style={{
                        flex: displaySpan,
                        minWidth: `${displaySpan * 75}px`
                      }}
                    >
                      <div
                        className={`
                          timeline-reservation bg-gradient-to-r ${colorClass} text-white p-3.5 group
                          shadow-lg
                        `}
                        title={`${reservation.title}\n${getProfileName(reservation.user_id)}${todoTitle ? `\n📋 ${todoTitle}` : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">
                              {reservation.title}
                            </div>
                            <div className="text-xs opacity-80 truncate mt-0.5">
                              {getProfileName(reservation.user_id)}
                            </div>
                            {todoTitle && (
                              <div className="flex items-center gap-1.5 text-[11px] opacity-70 mt-1.5">
                                <FileText className="w-3 h-3" strokeWidth={1.5} />
                                <span className="truncate">{todoTitle}</span>
                              </div>
                            )}
                          </div>
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 bg-black/15 hover:bg-black/30 transition-all rounded-xl"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(reservation);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-white" strokeWidth={1.5} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={hour}
                    className={`
                      flex-1 min-w-[75px] timeline-slot border-r border-border/10 last:border-r-0 
                      cursor-pointer
                      ${isCurrentHour ? 'bg-primary/5' : ''}
                    `}
                    onClick={() => onSlotClick(resource.id, hour)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="p-5 border-t border-border/15">
        <div className="flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
          <span className="font-medium">구성원:</span>
          {profiles.slice(0, 6).map((profile, index) => {
            const colorClass = USER_COLORS[index % USER_COLORS.length];
            return (
              <div key={profile.id} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${colorClass}`} />
                <span>{profile.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="glass-card border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">예약 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 예약을 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-full bg-destructive hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}