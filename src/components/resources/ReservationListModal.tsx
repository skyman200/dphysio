import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { format, isSameDay, isWithinInterval, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Reservation, Resource } from "@/hooks/useResources";
import { useProfiles } from "@/hooks/useProfiles";
import { Building2, Clock, Calendar, User, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReservationListModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservations: Reservation[];
    resources: Resource[];
    initialTab?: "today" | "week" | "all";
}

export function ReservationListModal({
    isOpen,
    onClose,
    reservations,
    resources,
    initialTab = "today",
}: ReservationListModalProps) {
    const [activeTab, setActiveTab] = useState<string>(initialTab);
    const { profiles } = useProfiles();

    const getProfileName = (userId: string) => {
        return profiles.find((p) => p.user_id === userId)?.name || "Unknown";
    };

    const getResourceName = (resourceId: string) => {
        return resources.find((r) => r.id === resourceId)?.name || "Unknown Resource";
    };

    const today = new Date();

    const filteredReservations = reservations.filter((r) => {
        const start = new Date(r.start_time);

        // Sort by most recent/upcoming
        if (activeTab === "today") {
            return isSameDay(start, today);
        }
        if (activeTab === "week") {
            const weekStart = startOfWeek(today, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
            return isWithinInterval(start, { start: weekStart, end: weekEnd });
        }
        return true; // "all"
    }).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-white/95 backdrop-blur-xl rounded-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-primary" />
                        예약 현황
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-3 mb-4 rounded-xl bg-muted/50 p-1">
                        <TabsTrigger value="today" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">오늘</TabsTrigger>
                        <TabsTrigger value="week" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">이번 주</TabsTrigger>
                        <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">전체</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                        <div className="space-y-3 pb-4">
                            {filteredReservations.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed">
                                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p>예약 내역이 없습니다.</p>
                                </div>
                            ) : (
                                filteredReservations.map((res) => (
                                    <div
                                        key={res.id}
                                        className="bg-white border border-border/40 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                                    {getResourceName(res.resource_id)}
                                                </Badge>
                                                <h4 className="font-bold text-foreground">{res.title}</h4>
                                            </div>
                                            <Badge variant={res.status === 'confirmed' ? 'default' : 'secondary'} className="text-[10px]">
                                                {res.status === 'confirmed' ? '확정됨' : res.status}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-2 gap-y-2 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <User className="w-3.5 h-3.5" />
                                                <span className={res.booker_name ? "font-medium text-primary" : ""}>
                                                    {res.booker_name ? `${res.booker_name} (대리)` : getProfileName(res.user_id)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>
                                                    {format(new Date(res.start_time), "M월 d일 HH:mm", { locale: ko })} - {format(new Date(res.end_time), "HH:mm")}
                                                </span>
                                            </div>
                                            {res.description && (
                                                <div className="col-span-2 flex items-start gap-2 mt-1 bg-muted/30 p-2 rounded-lg text-xs">
                                                    <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                    <span className="line-clamp-2">{res.description}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
