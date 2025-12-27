import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Eye, EyeOff, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEvents } from "@/hooks/useEvents";
import { useProfiles } from "@/hooks/useProfiles";
import { useAllEventsReadStatus } from "@/hooks/useEventReadStatus";

interface EventReadStatusCardProps {
  onEventClick: (eventId: string) => void;
}

const PROFESSOR_COLORS = [
  "from-professor-terracotta to-professor-terracotta/80",
  "from-professor-burgundy to-professor-burgundy/80",
  "from-professor-sage to-professor-sage/80",
  "from-professor-gold to-professor-gold/80",
  "from-professor-mauve to-professor-mauve/80",
];

export function EventReadStatusCard({ onEventClick }: EventReadStatusCardProps) {
  const { events } = useEvents();
  const { profiles } = useProfiles();
  const { getReadCount, totalProfiles } = useAllEventsReadStatus();

  const getProfileColor = (userId: string) => {
    const idx = profiles.findIndex((p) => p.user_id === userId);
    return PROFESSOR_COLORS[idx % PROFESSOR_COLORS.length];
  };

  // Get recent events with read status
  const recentEventsWithReadStatus = useMemo(() => {
    return events
      .filter((e) => new Date(e.start_date) >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
      .slice(0, 8)
      .map((event) => ({
        ...event,
        readCount: getReadCount(event.id),
        totalCount: totalProfiles,
      }));
  }, [events, getReadCount, totalProfiles]);

  // Events that haven't been read by everyone
  const unreadEvents = recentEventsWithReadStatus.filter(
    (e) => e.readCount < e.totalCount
  );

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          일정 열람 현황
          {unreadEvents.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadEvents.length}개 미확인
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[280px] pr-3">
          <div className="space-y-3">
            {recentEventsWithReadStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                최근 일정이 없습니다
              </p>
            ) : (
              recentEventsWithReadStatus.map((event) => {
                const allRead = event.readCount >= event.totalCount;
                const creator = profiles.find((p) => p.user_id === event.created_by);
                const readPercentage = event.totalCount > 0 
                  ? Math.round((event.readCount / event.totalCount) * 100) 
                  : 0;

                return (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event.id)}
                    className={cn(
                      "p-3 rounded-xl cursor-pointer transition-all hover:bg-muted/50",
                      allRead ? "bg-muted/20" : "bg-primary/5 border border-primary/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">{event.title}</p>
                          {!allRead && (
                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(parseISO(event.start_date), "M/d (EEE)", { locale: ko })}
                          </span>
                          {creator && (
                            <>
                              <span>·</span>
                              <span>{creator.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Read status indicator */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <div className="flex -space-x-1">
                              {profiles.slice(0, 3).map((profile, idx) => (
                                <Avatar
                                  key={profile.id}
                                  className={cn(
                                    "h-6 w-6 border-2 border-background",
                                    idx >= event.readCount && "opacity-30"
                                  )}
                                >
                                  <AvatarFallback
                                    className={cn(
                                      "text-white text-[10px] font-medium bg-gradient-to-br",
                                      getProfileColor(profile.user_id)
                                    )}
                                  >
                                    {profile.name[0]}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            <Badge
                              variant={allRead ? "default" : "secondary"}
                              className="text-[10px] px-1.5"
                            >
                              {event.readCount}/{event.totalCount}
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p>{readPercentage}% 열람 완료</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-500",
                          allRead ? "bg-primary" : "bg-primary/60"
                        )}
                        style={{ width: `${readPercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
