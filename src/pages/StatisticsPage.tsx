import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, addDays, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Navigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    Calendar as CalendarIcon, Clock, Users, FileText, MessageSquare,
    TrendingUp, Activity, BarChart3, ChevronLeft, ChevronRight, Download, Timer
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAnalytics, TimeRange } from '@/hooks/useAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles } from '@/hooks/useProfiles';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserStats } from '@/hooks/useAnalytics';

const COLORS = ['#E67E5A', '#8B4A5E', '#5A8B6E', '#D4A84B', '#7B6B8D', '#C77B8B'];

const getActionLabel = (type: string, detail?: string) => {
    switch (type) {
        case 'reservation_create': return '공간 예약';
        case 'reservation_delete': return '예약 취소';
        case 'announcement_create': return '공지 등록';
        case 'event_create': return '일정 등록';
        case 'event_update': return '일정 수정';
        case 'event_delete': return '일정 삭제';
        case 'message_send': return '메시지 전송';
        case 'file_upload': return '자료 업로드';
        case 'task_create': return '회의록/할일 생성';
        case 'task_complete': return '할일 완료';
        default: return type;
    }
};

export default function StatisticsPage() {
    const [activeTab, setActiveTab] = useState<TimeRange>('week');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedUserStat, setSelectedUserStat] = useState<UserStats | null>(null);
    const { loading, stats, fetchStats } = useAnalytics();
    const { currentProfile } = useProfiles();

    const { loading: profilesLoading } = useProfiles();

    // Strict Access Control
    // Must be Chief role AND have verified via PIN in Dashboard session
    const isChiefRole = currentProfile?.role === '학과장' || currentProfile?.role === 'chief' || currentProfile?.role === 'admin';
    const isSessionVerified = sessionStorage.getItem('isChiefVerified') === 'true';
    const isChief = isChiefRole && isSessionVerified;

    // Fetch on mount and changes
    useEffect(() => {
        fetchStats(activeTab, selectedDate);
    }, [activeTab, selectedDate, fetchStats]);

    if (loading || profilesLoading) {
        return (
            <MainLayout title="통계 📊">
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
            </MainLayout>
        );
    }

    if (!isChief) {
        if (!isSessionVerified && isChiefRole) {
            toast.error("대시보드에서 학과장 권한을 먼저 활성화해주세요.");
        }
        return <Navigate to="/" replace />;
    }

    const handleDateChange = (days: number) => {
        const newDate = days > 0 ? addDays(selectedDate, days) : subDays(selectedDate, Math.abs(days));
        setSelectedDate(newDate);
    };

    const handleExportExcel = () => {
        if (stats.length === 0) {
            toast.error("내보낼 데이터가 없습니다.");
            return;
        }

        const data = stats.map((s, index) => ({
            순위: index + 1,
            이름: s.name,
            직책: s.role,
            총활동: s.totalActions,
            일정공지: s.breakdown.notices,
            공간예약: s.breakdown.reservations,
            회의록: s.breakdown.tasks,
            파일업로드: s.breakdown.files,
            메시지: s.breakdown.messages,
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "활동통계");

        // Sheet 2: Detailed Logs
        const logsData = stats.flatMap(s => s.details.map(d => ({
            이름: s.name,
            직책: s.role,
            날짜: d.created_at?.toDate ? format(d.created_at.toDate(), "yyyy-MM-dd HH:mm") : "N/A",
            유형: d.action_type,
            내용: d.details || d.action_target || "N/A"
        })));
        const wsLogs = XLSX.utils.json_to_sheet(logsData);
        XLSX.utils.book_append_sheet(wb, wsLogs, "상세_활동로그");

        // Sheet 3: Time Entries
        const timeData = stats.flatMap(s => s.events.map(e => ({
            이름: s.name,
            직책: s.role,
            날짜: format(new Date(e.start_date), "yyyy-MM-dd"),
            카테고리: e.category,
            제목: e.title,
            시간: e.durationHours ? parseFloat(e.durationHours.toFixed(2)) : 0
        })));
        const wsTime = XLSX.utils.json_to_sheet(timeData);
        XLSX.utils.book_append_sheet(wb, wsTime, "상세_시간활동");

        const dateStr = format(selectedDate, "yyyy-MM-dd");
        XLSX.writeFile(wb, `학과활동통계_상세포함_${dateStr}.xlsx`);
        toast.success("상세 내역이 포함된 엑셀 파일이 다운로드됩니다.");
    };

    // Prepare chart data
    const activityChartData = stats.slice(0, 6).map(s => ({
        name: s.name.slice(0, 4),
        일정: s.breakdown.notices,
        예약: s.breakdown.reservations,
        메시지: s.breakdown.messages,
        회의록: s.breakdown.tasks,
        파일: s.breakdown.files,
    }));

    // Calculate totals
    const totals = {
        totalActions: stats.reduce((acc, s) => acc + s.totalActions, 0),
        activeUsers: stats.filter(s => s.totalActions > 0).length,
        totalReservations: stats.reduce((acc, s) => acc + s.breakdown.reservations, 0),
        totalMessages: stats.reduce((acc, s) => acc + s.breakdown.messages, 0),
        totalTasks: stats.reduce((acc, s) => acc + s.breakdown.tasks, 0),
        totalFiles: stats.reduce((acc, s) => acc + s.breakdown.files, 0),
        totalNotices: stats.reduce((acc, s) => acc + s.breakdown.notices, 0),
        totalTime: stats.reduce((acc, s) => acc + s.timeStats.meetings + s.timeStats.education + s.timeStats.trips, 0)
    };

    // Time Analysis Chart Data
    const timeChartData = stats.slice(0, 6).map(s => ({
        name: s.name.slice(0, 4),
        회의: parseFloat(s.timeStats.meetings.toFixed(1)),
        교육: parseFloat(s.timeStats.education.toFixed(1)),
        출장: parseFloat(s.timeStats.trips.toFixed(1)),
    }));

    const pieData = [
        { name: '일정/공지', value: totals.totalNotices, color: COLORS[0] },
        { name: '공간 예약', value: totals.totalReservations, color: COLORS[1] },
        { name: '채팅 메시지', value: totals.totalMessages, color: COLORS[2] },
        { name: '회의록 작성', value: totals.totalTasks, color: COLORS[3] },
        { name: '파일 업로드', value: totals.totalFiles, color: COLORS[4] },
    ].filter(d => d.value > 0);

    const StatCard = ({ icon: Icon, label, value, suffix, color }: any) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-sm"
        >
            <div className="flex items-center gap-3 mb-2">
                <div className={cn("p-2 rounded-xl", color)}>
                    <Icon size={18} className="text-white" />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-3xl font-black text-gray-900">
                {value}<span className="text-sm text-gray-400 ml-1">{suffix}</span>
            </p>
        </motion.div>
    );

    return (
        <MainLayout title="통계 📊">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
                {/* Header & Controls */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white/50 p-4 rounded-3xl border border-white/40 shadow-sm backdrop-blur-sm">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            학과 활동 통계
                            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">Chief Context</span>
                            <span className="text-[10px] text-blue-500 font-mono">v2.1</span>
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            실시간 활동 분석 및 리포트
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                        {/* Date Navigation */}
                        <div className="flex items-center gap-2 bg-white rounded-full p-1 border shadow-sm">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleDateChange(-1)}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-2 px-2 min-w-[140px] justify-center text-sm font-medium">
                                <CalendarIcon className="h-4 w-4 text-gray-400" />
                                {format(selectedDate, "yyyy년 M월 d일", { locale: ko })}
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleDateChange(1)}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* View Tabs */}
                        <div className="bg-gray-100/80 p-1 rounded-full flex items-center">
                            <Button
                                variant={activeTab === 'day' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTab('day')}
                                className={cn("rounded-full h-8 text-xs", activeTab === 'day' && "bg-white shadow-sm")}
                            >
                                일간
                            </Button>
                            <Button
                                variant={activeTab === 'week' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTab('week')}
                                className={cn("rounded-full h-8 text-xs", activeTab === 'week' && "bg-white shadow-sm")}
                            >
                                주간
                            </Button>
                            <Button
                                variant={activeTab === 'month' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTab('month')}
                                className={cn("rounded-full h-8 text-xs", activeTab === 'month' && "bg-white shadow-sm")}
                            >
                                월간
                            </Button>
                        </div>

                        {/* Export */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportExcel}
                            className="rounded-full gap-2 h-10 px-4 border-professor-sage/30 text-professor-sage hover:bg-professor-sage/10 ml-auto sm:ml-0"
                        >
                            <Download className="h-4 w-4" />
                            엑셀 다운로드
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard icon={Activity} label="총 활동" value={totals.totalActions} suffix="건" color="bg-gradient-to-br from-professor-terracotta to-professor-terracotta/80" />
                            <StatCard icon={Users} label="활성 사용자" value={totals.activeUsers} suffix="명" color="bg-gradient-to-br from-professor-burgundy to-professor-burgundy/80" />
                            <StatCard icon={FileText} label="공지/일정" value={totals.totalNotices} suffix="건" color="bg-gradient-to-br from-professor-sage to-professor-sage/80" />
                            <StatCard icon={Timer} label="누적 활동시간" value={totals.totalTime.toFixed(1)} suffix="시간" color="bg-gradient-to-br from-blue-500 to-blue-400" />
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Activity by User */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-sm"
                            >
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-professor-terracotta" />
                                    활동량 분석
                                </h3>
                                {activityChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={280}>
                                        <BarChart data={activityChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="일정" fill={COLORS[0]} radius={[4, 4, 0, 0]} stackId="a" />
                                            <Bar dataKey="예약" fill={COLORS[1]} radius={[4, 4, 0, 0]} stackId="a" />
                                            <Bar dataKey="메시지" fill={COLORS[2]} radius={[4, 4, 0, 0]} stackId="a" />
                                            <Bar dataKey="회의록" fill={COLORS[3]} radius={[4, 4, 0, 0]} stackId="a" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-[280px] text-gray-400">
                                        데이터가 없습니다
                                    </div>
                                )}
                            </motion.div>

                            {/* Activity Distribution Pie */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-sm"
                            >
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <BarChart3 size={18} className="text-professor-burgundy" />
                                    활동 유형 분포
                                </h3>
                                {pieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={280}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={3}
                                                dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                labelLine={false}
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-[280px] text-gray-400">
                                        데이터가 없습니다
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* Time Analysis Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-sm"
                        >
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Timer size={18} className="text-blue-600" />
                                교수별 활동 시간 상세 분석 (시간)
                            </h3>
                            {timeChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={timeChartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} unit="h" />
                                        <Tooltip formatter={(value) => `${value}시간`} />
                                        <Legend />
                                        <Bar dataKey="회의" fill="#8884d8" name="회의" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="교육" fill="#82ca9d" name="교육/연수" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="출장" fill="#ffc658" name="출장" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[280px] text-gray-400">
                                    데이터가 없습니다
                                </div>
                            )}
                        </motion.div>

                        {/* User Rankings */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-sm"
                        >
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Users size={18} className="text-professor-mauve" />
                                교수별 활동 랭킹
                            </h3>
                            {stats.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-100">
                                                <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase">순위</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase">이름</th>
                                                <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase">일정</th>
                                                <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase">예약</th>
                                                <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase">메시지</th>
                                                <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase">회의록</th>
                                                <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase">회의(h)</th>
                                                <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase">교육(h)</th>
                                                <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase">출장(h)</th>
                                                <th className="text-right py-3 px-4 text-xs font-bold text-gray-400 uppercase">총합</th>
                                                <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase">상세</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.map((stat, index) => (
                                                <tr
                                                    key={stat.userId}
                                                    className="border-b border-gray-50 hover:bg-blue-50/50 cursor-pointer transition-colors"
                                                    onClick={() => setSelectedUserStat(stat)}
                                                >
                                                    <td className="py-3 px-4">
                                                        <span className={cn(
                                                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                                            index === 0 ? "bg-yellow-100 text-yellow-700" :
                                                                index === 1 ? "bg-gray-100 text-gray-600" :
                                                                    index === 2 ? "bg-orange-100 text-orange-700" :
                                                                        "bg-gray-50 text-gray-400"
                                                        )}>
                                                            {index + 1}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 font-medium text-gray-900">{stat.name}</td>
                                                    <td className="py-3 px-4 text-center text-gray-600">{stat.breakdown.notices}</td>
                                                    <td className="py-3 px-4 text-center text-gray-600">{stat.breakdown.reservations}</td>
                                                    <td className="py-3 px-4 text-center text-gray-600">{stat.breakdown.messages}</td>
                                                    <td className="py-3 px-4 text-center text-gray-600">{stat.breakdown.tasks}</td>
                                                    <td className="py-3 px-4 text-center text-blue-600 font-medium">{stat.timeStats.meetings.toFixed(1)}</td>
                                                    <td className="py-3 px-4 text-center text-green-600 font-medium">{stat.timeStats.education.toFixed(1)}</td>
                                                    <td className="py-3 px-4 text-center text-orange-600 font-medium">{stat.timeStats.trips.toFixed(1)}</td>
                                                    <td className="py-3 px-4 text-right font-bold text-professor-terracotta">{stat.totalActions}</td>
                                                    <td className="py-3 px-4 text-center">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedUserStat(stat);
                                                            }}
                                                        >
                                                            조회
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-12 text-gray-400">
                                    활동 데이터가 없습니다
                                </div>
                            )}
                        </motion.div>
                    </>
                )}

                {/* Detail Modal */}
                <Dialog open={!!selectedUserStat} onOpenChange={(open) => !open && setSelectedUserStat(null)}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                <span className="bg-professor-terracotta text-white rounded-lg px-2 py-1 text-sm">{selectedUserStat?.role}</span>
                                {selectedUserStat?.name} 교수님 활동 상세
                            </DialogTitle>
                            <DialogDescription>
                                선택하신 기간 동안의 상세 활동 내역입니다.
                            </DialogDescription>
                        </DialogHeader>

                        <Tabs defaultValue="logs" className="flex-1 overflow-hidden flex flex-col">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="logs">활동 로그 ({selectedUserStat?.details.length})</TabsTrigger>
                                <TabsTrigger value="time">시간 활동 내역 ({selectedUserStat?.events.length})</TabsTrigger>
                            </TabsList>

                            <TabsContent value="logs" className="flex-1 overflow-auto mt-4 pr-4">
                                <div className="space-y-4">
                                    {selectedUserStat?.details && selectedUserStat.details.length > 0 ? (
                                        selectedUserStat.details.map((log: any, i: number) => (
                                            <div key={i} className="flex gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm">
                                                <div className="text-gray-400 font-mono text-xs whitespace-nowrap pt-1">
                                                    {log.created_at?.toDate ? format(log.created_at.toDate(), "MM-dd HH:mm") : "N/A"}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-700 mb-1">{getActionLabel(log.action_type)}</div>
                                                    <div className="text-gray-600">{log.details || log.action_target}</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 text-gray-400">활동 로그가 없습니다.</div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="time" className="flex-1 overflow-auto mt-4 pr-4">
                                <div className="space-y-4">
                                    {selectedUserStat?.events && selectedUserStat.events.length > 0 ? (
                                        selectedUserStat.events.map((event: any, i: number) => (
                                            <div key={i} className="flex gap-4 p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-sm">
                                                <div className="text-blue-400 font-mono text-xs whitespace-nowrap pt-1">
                                                    {format(new Date(event.start_date), "MM-dd")}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-bold text-gray-800">{event.title}</span>
                                                        <span className="bg-white text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">
                                                            {event.durationHours?.toFixed(1)}시간
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2 text-xs text-gray-500">
                                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded">{event.category}</span>
                                                        {event.location && <span>📍 {event.location}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 text-gray-400">시간 활동 내역이 없습니다. (회의/교육/출장)</div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
}
