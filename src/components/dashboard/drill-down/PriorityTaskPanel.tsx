import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Pin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DashboardEvent } from '@/hooks/useDashboardData';
import { cn } from '@/lib/utils';
import { getUserEventStyle } from '@/lib/colors';
import { DetailCardModal } from './DetailCardModal';
import SwipeableItemWrapper from '@/components/common/SwipeableItemWrapper';

interface PriorityTaskPanelProps {
    tasks: DashboardEvent[];
    onEdit?: (event: DashboardEvent) => void;
    onDelete?: (event: DashboardEvent) => void;
}

export function PriorityTaskPanel({ tasks, onEdit, onDelete }: PriorityTaskPanelProps) {
    // Detail Modal State
    const [selectedTask, setSelectedTask] = useState<DashboardEvent | null>(null);

    // Sort priority: Urgent > Notice > Normal
    const sortedTasks = [...tasks].sort((a, b) => {
        const score = { URGENT: 3, NOTICE: 2, NORMAL: 1 };
        return score[b.type] - score[a.type];
    });

    return (
        <>
            <div className="bg-white/50 backdrop-blur-md rounded-2xl p-6 h-full shadow-sm border border-border/40 flex flex-col">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    ⚡️ 오늘의 액션
                </h2>

                <div className="space-y-3 overflow-y-auto pr-2 flex-1 scrollbar-hide">
                    {sortedTasks.length === 0 ? (
                        <div className="text-center text-muted-foreground py-10">
                            예정된 일정이 없습니다.
                        </div>
                    ) : (
                        sortedTasks.map((task) => (
                            <SwipeableItemWrapper
                                key={task.id}
                                onDelete={() => onDelete?.(task)}
                                onEdit={() => onEdit?.(task)}
                                className="mb-0" // override default margin if any, relying on space-y-3
                            >
                                <motion.div
                                    layout
                                    className={cn(
                                        "rounded-xl border p-4 transition-all duration-200 group relative bg-white", // Added bg-white explicitly for swipe overlay
                                        task.type === 'URGENT'
                                            ? 'bg-red-50/95 border-red-200 hover:border-red-300 hover:shadow-red-500/10 hover:shadow-lg' // Increased opacity
                                            : task.type === 'NOTICE'
                                                ? 'bg-blue-50/95 border-blue-200 hover:border-blue-300 hover:shadow-blue-500/10 hover:shadow-lg'
                                                : 'bg-white/95 border-transparent hover:border-gray-200 hover:shadow-md'
                                    )}
                                    // Remove framer hover/tap scales to avoid conflict with swipe drag? 
                                    // Actually keeps them but drag takes precedence.
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {/* 1. Header Area (Always Visible) */}
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {/* Icon Branching */}
                                            {task.type === 'URGENT' && <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0" />}
                                            {task.type === 'NOTICE' && <Pin className="text-blue-500 w-5 h-5 flex-shrink-0" />}
                                            {task.type === 'NORMAL' && (
                                                <div className={cn("w-2 h-2 rounded-full ml-1.5 flex-shrink-0", (getUserEventStyle(task.createdBy) || "").split(' ')[0]?.replace('bg-', 'bg-') || "bg-gray-400")} />
                                            )}

                                            <div className="min-w-0">
                                                <h3 className={cn(
                                                    "font-semibold truncate",
                                                    task.type === 'URGENT' ? 'text-red-600' :
                                                        task.type === 'NOTICE' ? 'text-blue-600' : 'text-foreground'
                                                )}>
                                                    {task.title}
                                                </h3>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(task.date), "M월 d일 (EEE) HH:mm", { locale: ko })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* D-Day Badge */}
                                        {task.dDay !== undefined && task.dDay >= 0 && task.dDay <= 3 && (
                                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ml-2 shadow-sm animate-pulse">
                                                D-{task.dDay === 0 ? 'Day' : task.dDay}
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            </SwipeableItemWrapper>
                        ))
                    )}
                </div>
            </div>

            {/* Detail Modal Removed as per user request */}
        </>
    );
}
