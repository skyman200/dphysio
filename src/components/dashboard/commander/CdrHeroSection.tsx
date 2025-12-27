import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, ChevronRight, Users, FileText, CheckCircle, AlertCircle, Timer } from 'lucide-react';
import { DashboardEvent } from '@/types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ReaderListModal } from './ReaderListModal';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"

interface CdrHeroSectionProps {
    events: DashboardEvent[];
    activeReservations: any[];
    isChief: boolean;
    totalFacultyCount?: number;
    onEnterMeeting?: (event: DashboardEvent) => void;
    onViewReservation?: (reservation: any) => void;
}

export function CdrHeroSection({
    events = [],
    activeReservations = [],
    isChief,
    totalFacultyCount = 4,
    onEnterMeeting,
    onViewReservation
}: CdrHeroSectionProps) {
    const [isReaderModalOpen, setIsReaderModalOpen] = useState(false);
    const [selectedEventForReader, setSelectedEventForReader] = useState<DashboardEvent | null>(null);

    // Combine all active items
    const allItems = [
        ...events.map(e => ({ type: 'EVENT' as const, data: e })),
        ...activeReservations.map(r => ({ type: 'RESERVATION' as const, data: r }))
    ];

    // Sort items: Active first, then Upcoming (by start time)
    const sortedItems = allItems.sort((a, b) => {
        const now = new Date();
        const getStart = (item: any) => {
            if (item.type === 'EVENT') return new Date(item.data.date);
            return now; // Reservations are always "now" (active)
        };

        const aStart = getStart(a);
        const bStart = getStart(b);

        // If both are active or both upcoming, sort by time
        const aIsActive = a.type === 'RESERVATION' || (a.type === 'EVENT' && aStart <= now);
        const bIsActive = b.type === 'RESERVATION' || (b.type === 'EVENT' && bStart <= now);

        if (aIsActive && !bIsActive) return -1;
        if (!aIsActive && bIsActive) return 1;

        return aStart.getTime() - bStart.getTime();
    });

    if (allItems.length === 0) {
        return (
            <div className="relative overflow-hidden rounded-3xl shadow-lg bg-gradient-to-r from-gray-700 to-gray-800 p-8 text-white min-h-[280px] flex items-center justify-center">
                <div className="relative z-10 text-center">
                    <h2 className="text-3xl font-bold mb-3">현재 진행 중인 작전이 없습니다.</h2>
                    <p className="text-gray-300 text-lg">잠시 여유를 가지셔도 좋습니다. 🫡</p>
                </div>
            </div>
        );
    }

    return (
        <section className="relative w-full">
            <Carousel className="w-full" opts={{ loop: true }}>
                <CarouselContent>
                    {sortedItems.map((item, index) => (
                        <CarouselItem key={index}>
                            {item.type === 'EVENT' ? (
                                <EventCard
                                    event={item.data}
                                    isChief={isChief}
                                    totalFacultyCount={totalFacultyCount}
                                    onEnterMeeting={onEnterMeeting}
                                    onOpenReaderList={(e) => {
                                        setSelectedEventForReader(e);
                                        setIsReaderModalOpen(true);
                                    }}
                                />
                            ) : (
                                <ReservationCard
                                    reservation={item.data}
                                    onClick={() => onViewReservation?.(item.data)}
                                />
                            )}
                        </CarouselItem>
                    ))}
                </CarouselContent>
                {sortedItems.length > 1 && (
                    <>
                        <CarouselPrevious className="left-4 bg-white/10 hover:bg-white/20 border-0 text-white" />
                        <CarouselNext className="right-4 bg-white/10 hover:bg-white/20 border-0 text-white" />
                    </>
                )}
            </Carousel>

            {/* Reader List Modal */}
            {selectedEventForReader && (
                <ReaderListModal
                    isOpen={isReaderModalOpen}
                    onClose={() => setIsReaderModalOpen(false)}
                    readByUids={selectedEventForReader.read_by || []}
                    totalExpected={totalFacultyCount}
                />
            )}
        </section>
    );
}

import { useEffect } from 'react';
import { differenceInMinutes } from 'date-fns';

function EventCard({ event, isChief, totalFacultyCount, onEnterMeeting, onOpenReaderList }: {
    event: DashboardEvent,
    isChief: boolean,
    totalFacultyCount: number,
    onEnterMeeting?: (e: DashboardEvent) => void,
    onOpenReaderList: (e: DashboardEvent) => void
}) {
    const readByCount = event.read_by?.length || 0;
    const unreadCount = Math.max(0, totalFacultyCount - readByCount);
    const isMeeting = event.category === 'meeting';

    // Time Logic
    const now = new Date();
    const startTime = new Date(event.date);
    const endTime = event.end_date
        ? new Date(event.end_date)
        : new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour if not set

    const isActive = now >= startTime && now <= endTime;
    const isUpcoming = now < startTime;

    const minutesRemaining = differenceInMinutes(endTime, now);
    const minutesToStart = differenceInMinutes(startTime, now);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-[2.5rem] shadow-2xl border border-white/20 h-full min-h-[320px]"
        >
            {/* Background Gradient */}
            <div className={`absolute inset-0 z-0 opacity-95 bg-gradient-to-br ${isActive
                    ? 'from-[#1a2a6c] via-[#b21f1f] to-[#fdbb2d]'
                    : 'from-slate-800 via-slate-700 to-indigo-900'
                }`} />
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] z-0" />

            {/* Decor */}
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-[80px] z-0" />

            <div className="relative z-10 p-8 md:p-10 text-white flex flex-col md:flex-row md:items-center justify-between gap-8 h-full">
                {/* Left: Event Info */}
                <div className="flex-1 space-y-5">
                    <div className="flex items-center gap-3 flex-wrap">
                        {isActive && (
                            <span className="bg-red-500 text-white text-[10px] uppercase font-black px-3 py-1 rounded-full animate-pulse shadow-xl shadow-red-500/40 tracking-wider">
                                🚨 진행 중 • LIVE
                            </span>
                        )}
                        {isUpcoming && (
                            <span className="bg-blue-500 text-white text-[10px] uppercase font-black px-3 py-1 rounded-full shadow-xl shadow-blue-500/40 tracking-wider">
                                ⏳ 예정됨 • UPCOMING
                            </span>
                        )}

                        <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-2">
                            <Clock size={14} className="text-blue-200" />
                            <span className="text-xs font-black text-blue-50 tracking-tight">
                                {format(startTime, "a h:mm", { locale: ko })} 시작
                            </span>
                        </div>

                        {/* Dynamic Timer Badge */}
                        <div className={`px-3 py-1 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-2 ${isActive ? 'bg-orange-500/30 text-orange-100' : 'bg-white/10 text-white'
                            }`}>
                            <Timer size={14} />
                            <span className="text-xs font-black tracking-tight tabular-nums">
                                {isActive
                                    ? `${minutesRemaining}분 남음`
                                    : `${minutesToStart}분 후 시작`
                                }
                            </span>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-4xl md:text-5xl font-black mb-3 leading-[1.1] tracking-tighter drop-shadow-2xl">
                            {event.title}
                        </h2>

                        <div className="flex items-center gap-2 text-white/90 bg-black/20 w-fit px-4 py-2 rounded-2xl backdrop-blur-xl border border-white/10 shadow-lg">
                            <MapPin size={18} className="text-red-400" />
                            <span className="font-bold text-sm">{event.location || '작전 장소 미지정'}</span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col items-start md:items-end gap-5 min-w-[240px]">
                    {isMeeting && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onEnterMeeting?.(event)}
                            className="bg-white text-gray-900 hover:bg-gray-50 px-8 py-5 rounded-[1.5rem] font-black flex items-center gap-3 shadow-2xl transition-all w-full md:w-auto justify-center text-xl cursor-pointer"
                        >
                            <FileText size={24} className="text-blue-600" />
                            작전 상황실 입장
                            <ChevronRight size={22} className="text-gray-400" />
                        </motion.button>
                    )}

                    {isChief && (
                        <div
                            onClick={() => onOpenReaderList(event)}
                            className="bg-black/30 backdrop-blur-2xl rounded-[1.5rem] p-5 w-full border border-white/10 shadow-2xl cursor-pointer hover:bg-black/40 transition-all group"
                        >
                            <div className="flex justify-between items-center text-xs mb-3">
                                <span className="text-blue-100 flex items-center gap-2 font-black uppercase tracking-widest">
                                    <Users size={16} /> 하달 사항 확인
                                </span>
                                {unreadCount === 0 ? (
                                    <span className="text-green-400 font-black flex items-center gap-1.5 bg-green-500/20 px-3 py-1 rounded-full">
                                        <CheckCircle size={14} /> 전원 확인
                                    </span>
                                ) : (
                                    <span className="text-amber-400 font-black flex items-center gap-1.5 bg-amber-500/20 px-3 py-1 rounded-full">
                                        <AlertCircle size={14} /> {unreadCount}명 미확인
                                    </span>
                                )}
                            </div>

                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-2">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(readByCount / totalFacultyCount) * 100}%` }}
                                    className="bg-gradient-to-r from-blue-400 to-indigo-400 h-full"
                                />
                            </div>
                            <p className="text-[10px] text-white/50 font-bold text-right tracking-tighter">
                                수신율: {Math.round((readByCount / totalFacultyCount) * 100)}% ({readByCount}/{totalFacultyCount})
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function ReservationCard({ reservation, onClick }: { reservation: any, onClick?: () => void }) {
    const { resourceName, remainingMinutes, currentCount, capacity, userName } = reservation;

    // Calculate estimated end time based on remaining minutes
    const now = new Date();
    const endTime = new Date(now.getTime() + remainingMinutes * 60 * 1000);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-[2.5rem] shadow-2xl transition-all group border border-white/20 cursor-pointer h-full min-h-[320px]"
            onClick={onClick}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-[#11998e] via-[#38ef7d] to-[#0f9b0f] opacity-90 z-0" />
            <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] z-0" />
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/20 rounded-full blur-[80px] z-0" />

            <div className="relative z-10 p-8 md:p-10 text-white flex flex-col md:flex-row md:items-center justify-between gap-8 h-full">
                <div className="flex-1 space-y-5">
                    <div className="flex items-center gap-3">
                        <span className="bg-white/20 text-white text-[10px] uppercase font-black px-3 py-1 rounded-full animate-pulse shadow-xl tracking-wider flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            사용 중 • IN USE
                        </span>
                        <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-2">
                            <Clock size={14} className="text-white" />
                            <span className="text-xs font-black text-white tracking-tight tabular-nums">
                                {remainingMinutes}분 남음
                            </span>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-2">
                            <Timer size={14} className="text-white" />
                            <span className="text-xs font-black text-white tracking-tight tabular-nums">
                                {format(endTime, "a h:mm", { locale: ko })} 종료
                            </span>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-3xl md:text-4xl font-black mb-2 leading-[1.1] tracking-tighter drop-shadow-lg flex items-center gap-3">
                            {resourceName}
                        </h2>
                        <div className="flex items-center gap-2 text-white/90">
                            <span className="text-lg font-bold opacity-90">{userName}</span>
                            <span className="text-sm opacity-75">님이 사용 중입니다</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center min-w-[100px] border border-white/10">
                        <Users className="w-6 h-6 mb-1 text-white/90" />
                        <span className="text-2xl font-black">{currentCount}/{capacity}</span>
                        <span className="text-[10px] uppercase opacity-75 font-bold">Occupancy</span>
                    </div>
                    <div className="bg-white text-emerald-600 rounded-full p-3 shadow-lg group-hover:scale-110 transition-transform">
                        <ChevronRight size={24} />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
