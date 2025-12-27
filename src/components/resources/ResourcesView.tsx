import { useState, useMemo } from "react";
import { useResources, Resource, Reservation } from "@/hooks/useResources";
import { useProfiles } from "@/hooks/useProfiles";
import { ResourceStatusDashboard } from "./ResourceStatusDashboard";
import { ResourceTimeline } from "./ResourceTimeline";
import { ReservationDialog } from "./ReservationDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Sparkles, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

type ViewMode = "day" | "week" | "month";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

// Color mapping for users
const USER_COLORS = [
  "bg-professor-terracotta",
  "bg-professor-burgundy",
  "bg-professor-sage",
  "bg-professor-gold",
  "bg-professor-mauve",
  "bg-professor-rose",
];

import { ReservationListModal } from "./ReservationListModal";

export function ResourcesView() {
  const { resources, reservations, loading } = useResources();
  const { profiles } = useProfiles();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [listModalTab, setListModalTab] = useState<"today" | "week" | "all">("today");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("day");

  const handleSlotClick = (resourceId: string, hour: number) => {
    const resource = resources.find((r) => r.id === resourceId);
    if (resource) {
      setSelectedResource(resource);
      setSelectedHour(hour);
      setDialogOpen(true);
    }
  };

  const handleQuickReserve = (resource: Resource) => {
    const now = new Date();
    const currentHour = now.getHours();
    setSelectedResource(resource);
    setSelectedHour(currentHour >= 9 && currentHour < 22 ? currentHour : 9);
    setDialogOpen(true);
  };

  const getUserColor = (userId: string) => {
    const index = profiles.findIndex((p) => p.user_id === userId);
    return USER_COLORS[index >= 0 ? index % USER_COLORS.length : 0];
  };

  const getProfileName = (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.name || "알 수 없음";
  };

  const navigatePrev = () => {
    if (viewMode === "day") {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() - 1);
      setSelectedDate(newDate);
    } else if (viewMode === "week") {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() - 7);
      setSelectedDate(newDate);
    } else {
      setSelectedDate(subMonths(selectedDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === "day") {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + 1);
      setSelectedDate(newDate);
    } else if (viewMode === "week") {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + 7);
      setSelectedDate(newDate);
    } else {
      setSelectedDate(addMonths(selectedDate, 1));
    }
  };

  const getHeaderTitle = () => {
    if (viewMode === "day") {
      return format(selectedDate, "yyyy년 M월 d일 (EEEE)", { locale: ko });
    } else if (viewMode === "week") {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      return format(weekStart, "yyyy년 M월", { locale: ko });
    }
    return format(selectedDate, "yyyy년 M월", { locale: ko });
  };

  const getReservationsForDay = (day: Date) => {
    const startOfDay = new Date(day);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);

    return reservations.filter((r) => {
      const start = new Date(r.start_time);
      const end = new Date(r.end_time);
      return r.status === "confirmed" && start < endOfDay && end > startOfDay;
    });
  };

  // Week View
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Month View
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfMonth = monthStart.getDay();

  const renderWeekView = () => (
    <div className="glass-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border/30">
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "p-3 text-center border-r border-border/20 last:border-r-0",
              isToday(day) && "bg-primary/10"
            )}
          >
            <div className="text-xs text-muted-foreground">
              {format(day, "EEE", { locale: ko })}
            </div>
            <div
              className={cn(
                "text-lg font-semibold mt-1",
                isToday(day) ? "text-primary" : "text-foreground"
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {weekDays.map((day) => {
          const dayReservations = getReservationsForDay(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[200px] p-2 border-r border-border/20 last:border-r-0",
                isToday(day) && "bg-primary/5"
              )}
            >
              {dayReservations.map((res) => (
                <div
                  key={res.id}
                  className={cn(
                    "mb-2 p-2 rounded-lg text-white text-xs",
                    getUserColor(res.user_id)
                  )}
                >
                  <div className="font-medium truncate">{res.title}</div>
                  <div className="opacity-80 truncate">
                    {resources.find(r => r.id === res.resource_id)?.name}
                  </div>
                  <div className="opacity-70 mt-0.5">
                    {format(new Date(res.start_time), "HH:mm")} - {format(new Date(res.end_time), "HH:mm")}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderMonthView = () => {
    const paddingDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    return (
      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border/30">
          {DAYS.map((day, i) => (
            <div
              key={day}
              className={cn(
                "p-2 text-center text-xs font-medium",
                i === 0 && "text-destructive",
                i === 6 && "text-primary"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {paddingDays.map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[80px] p-1 border-r border-b border-border/10 bg-muted/20" />
          ))}

          {monthDays.map((day) => {
            const dayReservations = getReservationsForDay(day);
            const isSunday = day.getDay() === 0;
            const isSaturday = day.getDay() === 6;

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[80px] p-1 border-r border-b border-border/10",
                  isToday(day) && "bg-primary/5"
                )}
              >
                <div className={cn(
                  "text-xs font-medium mb-1 px-1",
                  isToday(day) && "text-primary font-bold",
                  isSunday && "text-destructive",
                  isSaturday && "text-primary"
                )}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayReservations.slice(0, 2).map((res) => (
                    <div
                      key={res.id}
                      className={cn(
                        "text-[10px] px-1 py-0.5 rounded truncate text-white",
                        getUserColor(res.user_id)
                      )}
                    >
                      {res.title}
                    </div>
                  ))}
                  {dayReservations.length > 2 && (
                    <div className="text-[10px] text-muted-foreground px-1">
                      +{dayReservations.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Overview Summary
  const overviewStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const todayReservations = reservations.filter((r) => {
      const start = new Date(r.start_time);
      return r.status === "confirmed" && start >= today && start <= endOfToday;
    });

    const thisWeekReservations = reservations.filter((r) => {
      const start = new Date(r.start_time);
      const weekEnd = addDays(today, 7);
      return r.status === "confirmed" && start >= today && start <= weekEnd;
    });

    const usageByResource = resources.map((resource) => {
      const resourceReservations = thisWeekReservations.filter(r => r.resource_id === resource.id);
      return {
        name: resource.name,
        count: resourceReservations.length,
      };
    });

    return {
      todayCount: todayReservations.length,
      weekCount: thisWeekReservations.length,
      usageByResource,
    };
  }, [reservations, resources]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-[500px] rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-full bg-gradient-to-br from-primary/15 to-accent/10">
            <Building2 className="w-7 h-7 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-display text-2xl text-foreground">공간 현황</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
              실시간으로 업데이트됩니다
            </p>
          </div>
        </div>
        {resources.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const { seedResources } = await import("@/utils/seedResources");
              const result = await seedResources();
              if ((result as any).updated) {
                window.location.reload();
              }
            }}
            className="text-xs"
          >
            수용 인원 새로고침
          </Button>
        )}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => {
            setListModalTab("today");
            setListModalOpen(true);
          }}
          className="glass-card p-4 rounded-2xl cursor-pointer hover:shadow-md transition-all active:scale-95 group"
        >
          <div className="flex justify-between items-start">
            <div className="text-2xl font-bold text-primary group-hover:scale-110 transition-transform origin-left">{overviewStats.todayCount}</div>
            <div className="p-1.5 rounded-full bg-primary/10 text-primary">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm text-muted-foreground mt-1">오늘 예약</div>
        </div>

        <div
          onClick={() => {
            setListModalTab("week");
            setListModalOpen(true);
          }}
          className="glass-card p-4 rounded-2xl cursor-pointer hover:shadow-md transition-all active:scale-95 group"
        >
          <div className="flex justify-between items-start">
            <div className="text-2xl font-bold text-foreground group-hover:scale-110 transition-transform origin-left">{overviewStats.weekCount}</div>
            <div className="p-1.5 rounded-full bg-muted text-muted-foreground">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm text-muted-foreground mt-1">이번 주 예약</div>
        </div>

        <div className="glass-card p-4 rounded-2xl col-span-2 flex flex-col justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-2 flex justify-between items-center">
              <span>공간별 이용 현황 (이번 주)</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 text-muted-foreground hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setListModalTab("all");
                  setListModalOpen(true);
                }}
              >
                전체 보기 <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {overviewStats.usageByResource.slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs bg-muted/50 px-2 py-1 rounded-full">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-primary font-bold">{item.count}</span>
                </div>
              ))}
              {overviewStats.usageByResource.length > 4 && (
                <div className="text-xs text-muted-foreground px-1 py-1">
                  +{overviewStats.usageByResource.length - 4} 더보기
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Status Dashboard */}
      <ResourceStatusDashboard onQuickReserve={handleQuickReserve} />

      {/* View Toggle and Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={navigatePrev} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-medium min-w-[200px] text-center">{getHeaderTitle()}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={navigateNext} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
            className="text-xs"
          >
            오늘
          </Button>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="day" className="text-xs px-3">일</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-3">주</TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-3">월</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === "day" && (
        <ResourceTimeline
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onSlotClick={handleSlotClick}
        />
      )}
      {viewMode === "week" && renderWeekView()}
      {viewMode === "month" && renderMonthView()}

      {/* Member Legend */}
      <div className="glass-card p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium">구성원:</span>
          {profiles.slice(0, 6).map((profile, index) => (
            <div key={profile.id} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", USER_COLORS[index % USER_COLORS.length])} />
              <span>{profile.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reservation Dialog - Fixed positioning */}
      <ReservationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resource={selectedResource}
        selectedDate={selectedDate}
        selectedHour={selectedHour}
      />

      <ReservationListModal
        isOpen={listModalOpen}
        onClose={() => setListModalOpen(false)}
        reservations={reservations}
        resources={resources}
        initialTab={listModalTab}
      />
    </div>
  );
}
