import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAnalytics, TimeRange } from '@/hooks/useAnalytics';
import { Button } from '@/components/ui/button';
import { Download, Calendar as CalendarIcon, Loader2, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface StatisticsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function StatisticsModal({ isOpen, onClose }: StatisticsModalProps) {
    const { stats, loading, fetchStats } = useAnalytics();
    const [activeTab, setActiveTab] = useState<TimeRange>('day');
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        if (isOpen) {
            fetchStats(activeTab, currentDate);
        }
    }, [isOpen, activeTab, currentDate, fetchStats]);

    const handleExport = () => {
        const data = stats.map(s => ({
            이름: s.name,
            직책: s.role,
            총활동: s.totalActions,
            예약: s.breakdown.reservations,
            공지작성: s.breakdown.notices,
            업무처리: s.breakdown.tasks,
            파일업로드: s.breakdown.files,
            메시지: s.breakdown.messages,
            기타: s.breakdown.others
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "활동통계");
        XLSX.writeFile(wb, `학과활동통계_${format(currentDate, 'yyyy-MM-dd')}.xlsx`);
    };

    const totalActions = stats.reduce((acc, curr) => acc + curr.totalActions, 0);
    const topContributor = stats.length > 0 ? stats[0] : null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-white/95 backdrop-blur-xl rounded-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl flex items-center gap-2">
                        <BarChart2 className="w-6 h-6 text-primary" />
                        학과 활동 통계 (사령관 전용)
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                    {/* Controls */}
                    <div className="flex justify-between items-center">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TimeRange)} className="w-[300px]">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="day">일간</TabsTrigger>
                                <TabsTrigger value="week">주간</TabsTrigger>
                                <TabsTrigger value="month">월간</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                오늘로 복귀
                            </Button>
                            <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700">
                                <Download className="w-4 h-4 mr-2" />
                                엑셀 다운로드
                            </Button>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">총 활동량</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalActions}건</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">최다 기여자</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-primary">{topContributor ? topContributor.name : '-'}</div>
                                <p className="text-xs text-muted-foreground">{topContributor ? `${topContributor.totalActions}건 활동` : ''}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">조회 기간</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg font-bold">
                                    {format(currentDate, activeTab === 'day' ? 'yyyy-MM-dd' : activeTab === 'week' ? "'W'w, yyyy" : 'yyyy-MM')}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Data Table */}
                    <ScrollArea className="flex-1 border rounded-xl bg-white">
                        {loading ? (
                            <div className="h-64 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>이름</TableHead>
                                        <TableHead>직책</TableHead>
                                        <TableHead className="text-right">총 활동</TableHead>
                                        <TableHead className="text-right">예약</TableHead>
                                        <TableHead className="text-right">공지/일정</TableHead>
                                        <TableHead className="text-right">업무처리</TableHead>
                                        <TableHead className="text-right">자료</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.map((stat) => (
                                        <TableRow key={stat.userId}>
                                            <TableCell className="font-medium">{stat.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px]">{stat.role}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold">{stat.totalActions}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{stat.breakdown.reservations}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{stat.breakdown.notices}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{stat.breakdown.tasks}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{stat.breakdown.files}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
