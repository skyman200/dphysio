import { useMemo } from "react";
import { startOfWeek, endOfWeek, parseISO, isWithinInterval } from "date-fns";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
}

interface Event {
  id: string;
  start_date: string;
  created_by: string;
}

interface ProfessorHeatmapProps {
  profiles: Profile[];
  events: Event[];
}

const PROFESSOR_COLORS = [
  "from-professor-terracotta to-professor-terracotta/80",
  "from-professor-burgundy to-professor-burgundy/80",
  "from-professor-sage to-professor-sage/80",
  "from-professor-gold to-professor-gold/80",
  "from-professor-mauve to-professor-mauve/80",
  "from-professor-rose to-professor-rose/80",
];

export function ProfessorHeatmap({ profiles, events }: ProfessorHeatmapProps) {
  const navigate = useNavigate();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const professorEventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    profiles.forEach((profile) => {
      counts[profile.user_id] = 0;
    });

    events.forEach((event) => {
      const eventDate = parseISO(event.start_date);
      if (isWithinInterval(eventDate, { start: weekStart, end: weekEnd })) {
        if (counts[event.created_by] !== undefined) {
          counts[event.created_by]++;
        }
      }
    });

    return counts;
  }, [profiles, events, weekStart, weekEnd]);

  const maxEvents = Math.max(...Object.values(professorEventCounts), 1);

  const getBusyLevel = (count: number): string => {
    const ratio = count / maxEvents;
    if (ratio === 0) return "여유";
    if (ratio < 0.3) return "보통";
    if (ratio < 0.6) return "바쁨";
    return "매우 바쁨";
  };

  const getBusyColor = (count: number): string => {
    const ratio = count / maxEvents;
    if (ratio === 0) return "bg-muted/50";
    if (ratio < 0.3) return "bg-professor-sage/30";
    if (ratio < 0.6) return "bg-professor-gold/40";
    return "bg-professor-terracotta/50";
  };

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        교수 일정 현황
      </h3>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {profiles.slice(0, 6).map((profile, index) => {
          const eventCount = professorEventCounts[profile.user_id] || 0;
          const busyLevel = getBusyLevel(eventCount);
          const barWidth = Math.max((eventCount / maxEvents) * 100, 10);

          return (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/professor-calendar?id=${profile.user_id}`)}
              className="flex-shrink-0 w-[140px] p-3 rounded-xl bg-card/50 border border-border/30 cursor-pointer hover:bg-card/80 transition-all hover:scale-[1.02]"
            >
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className={cn(
                      "text-white text-xs font-medium bg-gradient-to-br",
                      PROFESSOR_COLORS[index % PROFESSOR_COLORS.length]
                    )}
                  >
                    {profile.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {profile.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {eventCount}건
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={cn("h-full rounded-full", getBusyColor(eventCount))}
                />
              </div>

              <div className="text-[10px] text-muted-foreground mt-1 text-center">
                {busyLevel}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
