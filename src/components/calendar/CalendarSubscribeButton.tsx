import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar, Copy, ExternalLink, Check, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CalendarSubscribeButtonProps {
    type: 'department' | 'professor';
    userId?: string;
    className?: string;
}

// Cloud Function URL
const FUNCTION_BASE_URL = "https://us-central1-physio-materials.cloudfunctions.net";

export function CalendarSubscribeButton({ type, userId, className }: CalendarSubscribeButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    // Generate URLs
    const params = new URLSearchParams({ type });
    if (userId) params.append('userId', userId);

    const httpsUrl = `${FUNCTION_BASE_URL}/getCalendarFeed?${params.toString()}`;
    const webcalUrl = httpsUrl.replace('https://', 'webcal://');

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(webcalUrl);
            setCopied(true);
            toast.success("URL이 클립보드에 복사되었습니다!");
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error("복사에 실패했습니다.");
        }
    };

    const handleOpenWebcal = () => {
        // Open webcal:// URL - iPhone will recognize it as a calendar subscription
        window.location.href = webcalUrl;
    };

    const handleDownloadICS = () => {
        // Direct download of .ics file
        window.open(httpsUrl, '_blank');
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(true)}
                className={cn("gap-2", className)}
            >
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">캘린더 구독</span>
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md glass-dialog">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            iPhone 캘린더 구독
                        </DialogTitle>
                        <DialogDescription>
                            {type === 'department' ? '학과' : '교수'} 캘린더를 iPhone 기본 캘린더에 연동하세요.
                            일정이 변경되면 자동으로 동기화됩니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* URL Display */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">
                                구독 URL
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    value={webcalUrl}
                                    readOnly
                                    className="font-mono text-xs bg-muted/50"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleCopy}
                                    className="flex-shrink-0"
                                >
                                    {copied ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid gap-2">
                            <Button
                                onClick={handleOpenWebcal}
                                className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80"
                            >
                                <ExternalLink className="w-4 h-4" />
                                iPhone에서 바로 구독하기
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handleDownloadICS}
                                className="w-full gap-2"
                            >
                                <Calendar className="w-4 h-4" />
                                .ics 파일 다운로드
                            </Button>
                        </div>

                        {/* Instructions */}
                        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">📱 iPhone 구독 방법</p>
                            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                                <li>"iPhone에서 바로 구독하기" 버튼 클릭</li>
                                <li>iPhone 캘린더 앱이 열리면 "구독" 선택</li>
                                <li>완료! 일정이 자동으로 동기화됩니다.</li>
                            </ol>
                            <p className="text-xs text-muted-foreground mt-2">
                                💡 PC에서는 URL을 복사해서 Google Calendar나 Outlook에 붙여넣기하세요.
                            </p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
