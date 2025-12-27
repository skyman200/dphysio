import React from 'react';
import { motion } from 'framer-motion';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DashboardEvent } from '@/types';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

interface CdrWeeklyScheduleProps {
    events: DashboardEvent[];
    onEventClick?: (event: DashboardEvent) => void;
}

export function CdrWeeklySchedule({ events, onEventClick }: CdrWeeklyScheduleProps) {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // Monday start

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i));

    return (
        <div className="bg-white/60 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/20 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                    <CalendarIcon className="text-professor-gold" size={20} />
                    이번 주 작전 타임라인
                </h3>
                <span className="text-xs font-bold text-professor-gold bg-professor-gold/10 px-3 py-1 rounded-full uppercase tracking-wider">
                    WEEK {format(today, 'w')}
                </span>
            </div>

            <div className="grid grid-cols-7 gap-2 flex-1 min-h-0">
                {weekDays.map((day) => {
                    const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
                    const isSelectDay = isToday(day);

                    return (
                        <div key={day.toString()} className="flex flex-col gap-2 h-full">
                            {/* Day Header */}
                            <div className={cn(
                                "text-center p-2 rounded-2xl transition-all",
                                isSelectDay ? "bg-professor-gold text-white shadow-lg shadow-professor-gold/20" : "bg-gray-50 text-gray-400"
                            )}>
                                <div className="text-[10px] font-black uppercase opacity-60">
                                    {format(day, 'EEE', { locale: ko })}
                                </div>
                                <div className="text-lg font-black tracking-tighter">
                                    {format(day, 'd')}
                                </div>
                            </div>

                            {/* Event List for the Day */}
                            <div className="flex-1 bg-gray-50/50 rounded-2xl p-1.5 space-y-1.5 overflow-y-auto scrollbar-hide border border-gray-100/50">
                                {dayEvents.length === 0 ? (
                                    <div className="h-full flex items-center justify-center opacity-10">
                                        <div className="w-1 h-1 bg-gray-400 rounded-full" />
                                    </div>
                                ) : (
                                    dayEvents.map((event) => (
                                        <motion.div
                                            key={event.id}
                                            whileHover={{ scale: 1.02 }}
                                            onClick={() => onEventClick?.(event)}
                                            className={cn(
                                                "p-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all border",
                                                event.type === 'URGENT'
                                                    ? "bg-red-50 text-red-600 border-red-100"
                                                    : event.type === 'NOTICE'
                                                        ? "bg-blue-50 text-blue-600 border-blue-100"
                                                        : "bg-white text-gray-600 border-gray-100"
                                            )}
                                        >
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1 opacity-60 font-black text-[9px]">
                                                    <Clock size={10} />
                                                    {format(new Date(event.date), 'HH:mm')}
                                                </div>
                                                <div className="truncate line-clamp-2 leading-tight">
                                                    {event.title}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
