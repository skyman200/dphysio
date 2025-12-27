import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Pin, CheckCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DashboardEvent } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface BriefingOverlayProps {
    isOpen: boolean;
    items: DashboardEvent[];
    onConfirm: () => void;
}

export function BriefingOverlay({ isOpen, items, onConfirm }: BriefingOverlayProps) {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleCardClick = (item: DashboardEvent) => {
        // Deep Link Logic
        if (item.category === 'meeting') {
            navigate('/meetings');
        } else if (item.type === 'NOTICE' || item.category === 'notice') {
            navigate('/announcements');
        } else {
            // Default to Department Calendar
            navigate('/department-calendar');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#FDFBF7] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-8 pb-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="inline-block px-3 py-1 bg-black/5 rounded-full text-xs font-medium text-muted-foreground mb-4"
                    >
                        {format(new Date(), "yyyy.MM.dd EEEE", { locale: ko })} 브리핑
                    </motion.div>
                    <h2 className="text-2xl font-bold text-[#2A2A2A] leading-tight">
                        교수님, 오늘 꼭 확인해야 할<br />
                        <span className="text-primary decoration-wavy underline decoration-primary/30 underline-offset-4">
                            {items.length}가지 긴급 사항
                        </span>이 있습니다.
                    </h2>
                </div>

                {/* Content Cards */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {items.map((item, index) => (
                        <BriefingCard
                            key={item.id}
                            item={item}
                            index={index}
                            onClick={() => handleCardClick(item)}
                        />
                    ))}
                </div>

                {/* Footer / Action */}
                <div className="p-6 pt-2 bg-gradient-to-t from-[#FDFBF7] to-transparent">
                    <Button
                        onClick={onConfirm}
                        size="lg"
                        className="w-full text-lg font-bold h-14 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                    >
                        <CheckCircle className="mr-2 h-5 w-5" />
                        모두 확인했습니다
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}

function BriefingCard({ item, index, onClick }: { item: DashboardEvent; index: number; onClick: () => void }) {
    const isUrgent = item.type === 'URGENT';
    const isNotice = item.type === 'NOTICE';

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + (index * 0.1) }}
            onClick={onClick}
            className={cn(
                "relative p-5 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md group",
                isUrgent ? "bg-red-50/50 border-red-100 hover:border-red-200" :
                    isNotice ? "bg-blue-50/50 border-blue-100 hover:border-blue-200" :
                        "bg-white border-gray-100 hover:border-gray-200"
            )}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex gap-2 items-center">
                    {isUrgent && (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full ring-1 ring-red-200">
                            <AlertCircle className="w-3 h-3" />
                            오늘 마감
                        </span>
                    )}
                    {isNotice && (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full ring-1 ring-blue-200">
                            <Pin className="w-3 h-3" />
                            필독 공지
                        </span>
                    )}
                    {!isUrgent && !isNotice && (
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            일반
                        </span>
                    )}
                </div>
            </div>

            <h3 className={cn(
                "text-lg font-bold mb-1 group-hover:underline decoration-2 underline-offset-2",
                isUrgent ? "text-red-900 decoration-red-200" :
                    isNotice ? "text-blue-900 decoration-blue-200" : "text-gray-900"
            )}>
                {item.title}
            </h3>

            <p className="text-sm text-gray-500 line-clamp-1">
                {item.content || "터치하여 상세 내용을 확인하세요."}
            </p>

            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="text-gray-400" />
            </div>
        </motion.div>
    );
}
