import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
  gradient?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, className, gradient }: StatsCardProps) {
  return (
    <div
      className={cn(
        "glass-card p-6 hover:shadow-2xl transition-all duration-300 animate-scale-in group",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-4xl font-bold text-foreground mt-2 tracking-tight">{value}</p>
          {trend && (
            <p
              className={cn(
                "text-xs font-medium mt-3",
                trend.positive ? "text-success" : "text-destructive"
              )}
            >
              {trend.positive ? "↑" : "↓"} {trend.value}% 지난 주 대비
            </p>
          )}
        </div>
        <div className={cn(
          "p-3.5 rounded-2xl transition-transform group-hover:scale-110",
          gradient || "bg-gradient-to-br from-primary/20 to-accent/20"
        )}>
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}