import { Calendar, CalendarDays, AlertTriangle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface KPIBarProps {
  todayEvents: number;
  weekEvents: number;
  conflicts: number;
  externalEvents: number;
}

export function KPIBar({ todayEvents, weekEvents, conflicts, externalEvents }: KPIBarProps) {
  const kpis = [
    {
      label: "오늘 일정",
      value: todayEvents,
      icon: Calendar,
      color: "from-professor-terracotta to-professor-terracotta/80",
    },
    {
      label: "이번 주 일정",
      value: weekEvents,
      icon: CalendarDays,
      color: "from-professor-sage to-professor-sage/80",
    },
    {
      label: "겹침(충돌)",
      value: conflicts,
      icon: AlertTriangle,
      color: "from-professor-burgundy to-professor-burgundy/80",
    },
    {
      label: "외부 일정",
      value: externalEvents,
      icon: ExternalLink,
      color: "from-professor-mauve to-professor-mauve/80",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="glass-card p-5 rounded-2xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">{kpi.label}</p>
              <p className="text-3xl font-bold text-foreground mt-1">{kpi.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center`}>
              <kpi.icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
