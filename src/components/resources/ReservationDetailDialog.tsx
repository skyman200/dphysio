import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { MapPin, Clock, User, FileText, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReservationDetailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: any; // Using any for flexibility or strictly typed if possible
    resourceName: string;
    userName: string;
}

export function ReservationDetailDialog({
    isOpen,
    onClose,
    reservation,
    resourceName,
    userName,
}: ReservationDetailDialogProps) {
    if (!reservation) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl rounded-3xl border-0 shadow-2xl">
                <DialogHeader className="mb-4">
                    <DialogTitle className="font-display text-2xl flex items-center gap-2">
                        <span className="bg-primary/10 p-2 rounded-full text-primary">
                            <Calendar className="w-5 h-5" />
                        </span>
                        예약 상세 정보
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header Info */}
                    <div className="bg-muted/30 p-5 rounded-2xl flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg text-foreground">{reservation.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" /> {resourceName}
                                </p>
                            </div>
                            <Badge variant={reservation.status === "confirmed" ? "default" : "secondary"}>
                                {reservation.status === "confirmed" ? "확정됨" : reservation.status}
                            </Badge>
                        </div>

                        <div className="h-px bg-border/50 w-full" />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground font-semibold uppercase">예약자</span>
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">
                                        <User className="w-3.5 h-3.5" />
                                    </span>
                                    {userName}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground font-semibold uppercase">시간</span>
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <div className="flex flex-col text-xs leading-tight">
                                        <span>{format(new Date(reservation.start_time), "M월 d일 (EEE)", { locale: ko })}</span>
                                        <span>
                                            {format(new Date(reservation.start_time), "HH:mm", { locale: ko })} - {format(new Date(reservation.end_time), "HH:mm", { locale: ko })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {reservation.description && (
                        <div className="space-y-2">
                            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                추가 설명
                            </span>
                            <div className="bg-muted/20 p-4 rounded-xl text-sm text-foreground/80 leading-relaxed min-h-[80px]">
                                {reservation.description}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
