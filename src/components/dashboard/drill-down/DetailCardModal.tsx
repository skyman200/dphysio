import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DashboardEvent } from '@/hooks/useDashboardData';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AlertCircle, Pin, Clock, CheckCircle, Calendar, User, Trash2, Edit2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface DetailCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: DashboardEvent | null;
    onEdit?: (event: DashboardEvent) => void;
    onDelete?: (event: DashboardEvent) => void;
}

export function DetailCardModal({ isOpen, onClose, event, onEdit, onDelete }: DetailCardModalProps) {
    const { user } = useAuth();

    if (!event) return null;

    const isUrgent = event.type === 'URGENT';
    const isNotice = event.type === 'NOTICE';
    const isCreator = user?.uid === event.createdBy;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className={cn(
                "max-w-xl p-0 overflow-hidden border-0 shadow-2xl rounded-3xl",
                isUrgent ? "bg-red-50/30" : isNotice ? "bg-blue-50/30" : "bg-white"
            )}>
                {/* Header Banner */}
                <div className={cn(
                    "px-8 py-6 flex items-start gap-4",
                    isUrgent ? "bg-gradient-to-r from-red-500/10 to-red-500/5 text-red-900" :
                        isNotice ? "bg-gradient-to-r from-blue-500/10 to-blue-500/5 text-blue-900" :
                            "bg-gray-100 text-gray-900"
                )}>
                    <div className={cn(
                        "p-3 rounded-2xl shadow-sm",
                        isUrgent ? "bg-white text-red-600" :
                            isNotice ? "bg-white text-blue-600" :
                                "bg-white text-gray-600"
                    )}>
                        {isUrgent ? <AlertCircle size={28} /> :
                            isNotice ? <Pin size={28} /> :
                                <Calendar size={28} />}
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            {isUrgent && <span className="text-xs font-bold bg-red-100/80 text-red-600 px-2.5 py-1 rounded-full border border-red-200">긴급 (D-{event.dDay})</span>}
                            {isNotice && <span className="text-xs font-bold bg-blue-100/80 text-blue-600 px-2.5 py-1 rounded-full border border-blue-200">공지</span>}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock size={12} /> {format(new Date(event.date), "yyyy.MM.dd HH:mm", { locale: ko })}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold leading-tight">{event.title}</h2>
                    </div>

                    <Button variant="ghost" size="icon" onClick={onClose} className="-mr-2 -mt-2">
                        <X className="w-5 h-5 text-current opacity-50" />
                    </Button>
                </div>

                {/* Content Body */}
                <div className="p-8 bg-white/60 backdrop-blur-3xl space-y-6">
                    {/* Detailed Description */}
                    <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed bg-white/50 p-6 rounded-2xl border border-gray-100 shadow-sm min-h-[100px] whitespace-pre-wrap">
                        {event.content || "상세 내용이 없습니다."}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <User size={14} className="text-gray-500" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-400">등록자</div>
                                <div className="font-semibold text-sm">시스템/관리자</div>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <Calendar size={14} className="text-gray-500" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-400">카테고리</div>
                                <div className="font-semibold text-sm">{event.category}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-gray-50/50 flex justify-between items-center border-t border-gray-100">
                    <div className="flex gap-2">
                        {isCreator && (
                            <>
                                <Button
                                    variant="ghost"
                                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                    onClick={() => onDelete?.(event)}
                                >
                                    <Trash2 size={18} className="mr-2" /> 삭제
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="text-gray-600 hover:bg-gray-100"
                                    onClick={() => onEdit?.(event)}
                                >
                                    <Edit2 size={18} className="mr-2" /> 수정
                                </Button>
                            </>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} className="rounded-xl h-12 px-6">닫기</Button>
                        <Button className={cn(
                            "rounded-xl h-12 px-6 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] flex items-center gap-2",
                            isUrgent ? "bg-red-500 hover:bg-red-600" :
                                isNotice ? "bg-blue-500 hover:bg-blue-600" : ""
                        )} onClick={onClose}>
                            <CheckCircle size={18} />
                            확인 완료
                        </Button>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}
