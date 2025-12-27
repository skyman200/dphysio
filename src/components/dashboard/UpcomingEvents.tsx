import { Clock, MapPin } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useEvents } from "@/hooks/useEvents";
import { useProfiles } from "@/hooks/useProfiles";

const colors = [
  "bg-primary",
  "bg-accent",
  "bg-success",
  "bg-warning",
  "bg-destructive",
];

export function UpcomingEvents() {
  const { events, loading } = useEvents();
  const { profiles } = useProfiles();

  const getProfileName = (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.name || "?";
  };

  const getProfileColor = (userId: string) => {
    const index = profiles.findIndex((p) => p.user_id === userId);
    return colors[index % colors.length] || colors[0];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "오늘";
    if (date.toDateString() === tomorrow.toDateString()) return "내일";
    return date.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  };

  // Get upcoming events (from now onwards, limited to 5)
  const upcomingEvents = events
    .filter((e) => new Date(e.start_date) >= new Date())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="glass-card p-8 animate-fade-in">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-border/30 flex items-center justify-between">
        <h3 className="font-bold text-foreground">다가오는 일정</h3>
        <a href="/calendar" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
          전체 보기
        </a>
      </div>

      <div className="divide-y divide-border/30">
        {upcomingEvents.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            예정된 일정이 없습니다
          </div>
        ) : (
          upcomingEvents.map((event, index) => (
            <div
              key={event.id}
              className="p-5 hover:bg-muted/30 transition-all cursor-pointer animate-slide-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex gap-4">
                <div className={cn("w-1 rounded-full flex-shrink-0", getProfileColor(event.created_by))} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-full">
                      {formatDate(event.start_date)}
                    </span>
                  </div>
                  <h4 className="font-semibold text-foreground">{event.title}</h4>
                  <div className="flex items-center gap-4 mt-2.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(event.start_date)}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.location}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-3">
                    <Avatar className="h-7 w-7 border-2 border-card ring-2 ring-background">
                      <AvatarFallback
                        className={cn(
                          "text-[10px] font-bold text-primary-foreground",
                          getProfileColor(event.created_by)
                        )}
                      >
                        {getProfileName(event.created_by)[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {getProfileName(event.created_by)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}