import { useState, useEffect } from "react";
import { useResources, Resource } from "@/hooks/useResources";
import { useProfiles } from "@/hooks/useProfiles";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, Zap, Plus, Building2 } from "lucide-react";
import { seedResources } from "@/utils/seedResources";
import { toast } from "sonner";

// Warm user colors matching the design system
const USER_COLORS = [
  { bg: "from-[hsl(12,70%,55%)] to-[hsl(12,70%,45%)]", light: "bg-[hsl(12,70%,55%,0.1)]", border: "border-[hsl(12,70%,55%,0.3)]" },
  { bg: "from-[hsl(350,45%,45%)] to-[hsl(350,45%,35%)]", light: "bg-[hsl(350,45%,45%,0.1)]", border: "border-[hsl(350,45%,45%,0.3)]" },
  { bg: "from-[hsl(152,55%,40%)] to-[hsl(152,55%,30%)]", light: "bg-[hsl(152,55%,40%,0.1)]", border: "border-[hsl(152,55%,40%,0.3)]" },
  { bg: "from-[hsl(38,85%,50%)] to-[hsl(38,85%,40%)]", light: "bg-[hsl(38,85%,50%,0.1)]", border: "border-[hsl(38,85%,50%,0.3)]" },
  { bg: "from-[hsl(280,50%,50%)] to-[hsl(280,50%,40%)]", light: "bg-[hsl(280,50%,50%,0.1)]", border: "border-[hsl(280,50%,50%,0.3)]" },
  { bg: "from-[hsl(330,60%,55%)] to-[hsl(330,60%,45%)]", light: "bg-[hsl(330,60%,55%,0.1)]", border: "border-[hsl(330,60%,55%,0.3)]" },
];

interface ResourceStatusDashboardProps {
  onQuickReserve: (resource: Resource) => void;
}

export function ResourceStatusDashboard({ onQuickReserve }: ResourceStatusDashboardProps) {
  const { resources, getResourceStatus } = useResources();
  const { profiles } = useProfiles();
  const [seeding, setSeeding] = useState(false);
  const [, setTick] = useState(0); // Force re-render

  // Update timer every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const getProfileName = (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.name || "알 수 없음";
  };

  const getUserColorIndex = (userId: string) => {
    const index = profiles.findIndex((p) => p.user_id === userId);
    return index >= 0 ? index % USER_COLORS.length : 0;
  };

  const handleSeedResources = async () => {
    setSeeding(true);
    try {
      const result = await seedResources();
      if (result.seeded) {
        toast.success(`${result.count}개의 공간이 추가되었습니다.`);
        window.location.reload();
      } else if ((result as any).updated) {
        toast.success("수용 인원이 업데이트되었습니다.");
        window.location.reload();
      } else {
        toast.info("이미 공간이 등록되어 있습니다.");
      }
    } catch (error) {
      console.error("Seed error:", error);
      toast.error("공간 추가 중 오류가 발생했습니다.");
    } finally {
      setSeeding(false);
    }
  };

  // Empty state
  if (resources.length === 0) {
    return (
      <div className="glass-card p-12 rounded-3xl text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-primary/10">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground mb-1">등록된 공간이 없습니다</h3>
            <p className="text-sm text-muted-foreground mb-4">
              기본 공간(멀티미디어실 1/2/3, 401호, 427호)을 추가하시겠습니까?
            </p>
          </div>
          <Button
            onClick={handleSeedResources}
            disabled={seeding}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {seeding ? "추가 중..." : "기본 공간 추가"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      {resources.map((resource, idx) => {
        const statusInfo = getResourceStatus(resource.id);
        const { status, reservation, currentCount, capacity, remainingMinutes, activeReservations, isFull } = statusInfo as any;

        // For shared resources, show the first user's color or a neutral one
        const displayReservation = activeReservations?.[0] || reservation;
        const userColorIndex = displayReservation
          ? getUserColorIndex(displayReservation.user_id)
          : 0;
        const colorScheme = USER_COLORS[userColorIndex];

        // Status Logic
        const isOccupiedFully = status === "occupied";
        const isPartial = status === "partial";

        // Clickable if available or partial (not full)
        const isClickable = !isFull;

        return (
          <Card
            key={resource.id}
            className={`
              glass-card cursor-pointer overflow-hidden group transition-all duration-300
              ${isOccupiedFully
                ? `${colorScheme.light} ${colorScheme.border} border-l-4`
                : isPartial
                  ? "border-l-4 border-l-warning bg-warning/5 hover:bg-warning/10" // Partial state styling
                  : "border-l-4 border-l-success hover:border-l-success/80" // Available state
              }
            `}
            onClick={() => isClickable && onQuickReserve(resource)}
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`
                      w-3 h-3 rounded-full transition-all duration-500
                      ${isOccupiedFully
                        ? "bg-primary animate-pulse"
                        : isPartial
                          ? "bg-warning animate-pulse"
                          : "bg-success"
                      }
                    `}
                  />
                  <span className="font-display text-lg text-foreground">
                    {resource.name}
                  </span>
                </div>
                {isClickable && (
                  <Zap className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${isPartial ? "text-warning" : "text-success"}`} strokeWidth={1.5} />
                )}
              </div>

              {/* Status Content */}
              {isOccupiedFully || isPartial ? (
                <div className="space-y-3">
                  {/* User Info (Show first user + count if multiple) */}
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorScheme.bg} flex items-center justify-center text-white text-xs font-medium`}>
                      {displayReservation ? getProfileName(displayReservation.user_id)[0] : "?"}
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm text-foreground/90 font-medium leading-none mb-1">
                        {displayReservation ? getProfileName(displayReservation.user_id) : "사용 중"}
                      </p>
                      {activeReservations.length > 1 && (
                        <p className="text-xs text-muted-foreground">
                          외 {activeReservations.length - 1}명 사용 중
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Timer & Capacity */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span className="tabular-nums font-medium">{remainingMinutes}분 남음</span>
                    </div>

                    {/* Capacity Indicator for Shared Resources */}
                    {capacity > 1 && (
                      <div className={`flex items-center gap-1.5 font-bold ${isFull ? "text-destructive" : "text-primary"}`}>
                        <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>{currentCount}/{capacity}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.max(10, 100 - (remainingMinutes / 60) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="text-xs font-medium text-success border-success/40 bg-success/5 rounded-full px-3"
                    >
                      사용 가능
                    </Badge>
                  </div>
                  {resource.capacity && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>수용 {resource.capacity}명</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}