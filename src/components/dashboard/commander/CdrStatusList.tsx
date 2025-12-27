import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardEvent } from '@/types';
import SwipeableItemWrapper from '@/components/common/SwipeableItemWrapper';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Clock, MapPin, Bell, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CdrStatusListProps {
    title: string;
    description: string;
    events: DashboardEvent[];
    onEdit?: (event: DashboardEvent) => void;
    onDelete?: (event: DashboardEvent) => void;
}

export function CdrStatusList({ title, ...props }: CdrStatusListProps) {
    return (
        <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 shadow-sm border border-white/20 h-full flex flex-col overflow-hidden">
            <div className="mb-8">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">{title}</h2>
                <p className="text-gray-500 font-medium">{props.description}</p>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 -mr-4 space-y-4 scrollbar-hide">
                {props.events.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                        <Bell size={48} strokeWidth={1} className="mb-4 opacity-20" />
                        <p className="font-bold">표시할 내용이 없습니다.</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {props.events.map((event) => (
                            <SwipeableItemWrapper
                                key={event.id}
                                onDelete={() => props.onDelete?.(event)}
                                onEdit={() => props.onEdit?.(event)}
                                className="mb-0"
                            >
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className={cn(
                                        "bg-white rounded-2xl p-5 border border-gray-100 shadow-sm transition-all hover:shadow-md group flex items-center justify-between",
                                        event.type === 'URGENT' && "border-l-4 border-l-red-500",
                                        event.type === 'NOTICE' && "border-l-4 border-l-blue-500"
                                    )}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            {event.type === 'URGENT' && (
                                                <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                    D-{event.dDay === 0 ? 'Day' : event.dDay}
                                                </span>
                                            )}
                                            <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                                <Clock size={12} />
                                                {format(new Date(event.date), "M월 d일 HH:mm", { locale: ko })}
                                            </span>
                                            {event.location && (
                                                <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                                    <MapPin size={12} />
                                                    {event.location}
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="text-xl font-black text-gray-800 truncate mb-1">
                                            {event.title}
                                        </h4>
                                        <p className="text-sm text-gray-500 line-clamp-1">
                                            {event.content}
                                        </p>
                                    </div>

                                    <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>
                                </motion.div>
                            </SwipeableItemWrapper>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
