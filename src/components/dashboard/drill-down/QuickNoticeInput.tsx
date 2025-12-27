import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Megaphone, Loader2 } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export function QuickNoticeInput() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addEvent } = useEvents();
    const { user } = useAuth();

    const handleSubmit = async () => {
        if (!message.trim()) return;
        if (!user) {
            toast.error("로그인이 필요합니다.");
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await addEvent({
                title: message,
                description: "빠른 공지입니다.",
                start_date: new Date(),
                end_date: new Date(),
                category: 'notice',
                type: 'department', // Default scope
            });

            if (error) throw error;

            toast.success("공지가 등록되었습니다.");
            setMessage("");
            setIsOpen(false);
        } catch (e) {
            toast.error("공지 등록 실패");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={cn(
            "relative transition-all duration-300 ease-in-out overflow-hidden",
            isOpen ? "w-full" : "w-auto"
        )}>
            {!isOpen ? (
                <Button
                    variant="outline"
                    onClick={() => setIsOpen(true)}
                    className="rounded-full bg-white/50 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 shadow-sm"
                >
                    <Megaphone className="w-4 h-4 mr-2" />
                    공지 올리기
                </Button>
            ) : (
                <div className="flex gap-2 items-center bg-white border border-blue-200 rounded-full p-1 pl-4 shadow-lg animate-in fade-in slide-in-from-right-4">
                    <Megaphone className="w-4 h-4 text-blue-500 shrink-0" />
                    <Input
                        autoFocus
                        placeholder="새로운 공지 내용을 입력하세요..."
                        className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-9 min-w-[300px]"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSubmit();
                            if (e.key === 'Escape') setIsOpen(false);
                        }}
                    />
                    <div className="flex items-center gap-1 pr-1">
                        <Button
                            size="sm"
                            className="rounded-full h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full h-8 px-3 text-xs text-muted-foreground hover:bg-gray-100"
                            onClick={() => setIsOpen(false)}
                        >
                            취소
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
