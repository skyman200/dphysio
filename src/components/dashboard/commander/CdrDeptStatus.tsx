import React from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, Video, MapPin, Bell, FileText, Circle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DeptStats {
    calendarEvents: number;
    urgentEvents: number;
    meetings: number;
    resources: number;
    reservations: number;
    announcements: number;
    files: number;
}

interface CdrDeptStatusProps {
    isChief: boolean;
    professorStatus?: {
        present: number;
        total: number;
    };
    deptStats?: DeptStats;
}

export function CdrDeptStatus({
    isChief,
    professorStatus = { present: 3, total: 5 },
    deptStats = {
        calendarEvents: 0,
        urgentEvents: 0,
        meetings: 0,
        resources: 0,
        reservations: 0,
        announcements: 0,
        files: 0,
    }
}: CdrDeptStatusProps) {
    const navigate = useNavigate();

    const statItems = [
        { icon: Calendar, label: '학과 캘린더', value: deptStats.calendarEvents, suffix: '건', color: 'text-blue-500', path: '/department-calendar' },
        { icon: Calendar, label: '교수 캘린더', value: deptStats.urgentEvents, suffix: '건', color: 'text-orange-500', path: '/professor-calendar' },
        { icon: Video, label: '회의/위원회', value: deptStats.meetings, suffix: '건', color: 'text-purple-500', path: '/meetings' },
        { icon: MapPin, label: '공간 예약', value: deptStats.reservations, suffix: '건', color: 'text-green-500', path: '/resources' },
        { icon: Bell, label: '공지사항', value: deptStats.announcements, suffix: '건', color: 'text-red-500', path: '/announcements' },
        { icon: FileText, label: '자료실', value: deptStats.files, suffix: '개', color: 'text-indigo-500', path: '/announcements?tab=files' },
    ];

    const handleReportClick = () => {
        // TODO: Could open a modal with full report or navigate to a report page
        // For now, scroll to top and show all stats
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/20 h-full flex flex-col"
        >
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <Circle size={8} className="fill-blue-500 text-blue-500 animate-pulse" />
                학과 현황 요약
            </h3>

            <div className="space-y-4 flex-1">
                {/* Professor Status */}
                <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-gray-500 flex items-center gap-2">
                            <Users size={16} className="text-blue-500" />
                            재실 교수진
                        </span>
                        <span className="text-lg font-black text-blue-600">
                            {professorStatus.present}/{professorStatus.total} <span className="text-xs text-gray-400">명</span>
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-blue-500 h-full transition-all duration-1000"
                            style={{ width: `${(professorStatus.present / professorStatus.total) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Stats Grid - Clickable */}
                <div className="grid grid-cols-2 gap-2">
                    {statItems.map((item, idx) => (
                        <button
                            key={idx}
                            onClick={() => navigate(item.path)}
                            className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3 hover:shadow-md hover:border-gray-200 transition-all text-left group"
                        >
                            <div className={`p-2 rounded-lg bg-gray-50 ${item.color} group-hover:scale-110 transition-transform`}>
                                <item.icon size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate flex items-center gap-1">
                                    {item.label}
                                    <ExternalLink size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </p>
                                <p className="text-sm font-black text-gray-800">
                                    {item.value}<span className="text-xs text-gray-400 ml-0.5">{item.suffix}</span>
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chief Only Action */}
            {isChief && (
                <button
                    onClick={handleReportClick}
                    className="w-full mt-6 bg-gray-900 text-white py-4 rounded-2xl text-sm font-black hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                >
                    📊 전체 현황 보고서
                </button>
            )}
        </motion.div>
    );
}
