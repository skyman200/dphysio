import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, FileText, X } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useFileResources } from '@/hooks/useFileResources';
import { toast } from 'sonner';

interface NewAnnouncementDialogProps {
    isOpen: boolean;
    onClose: () => void;
    defaultTab?: 'notice' | 'file';
    initialData?: {
        id: string;
        title: string;
        content: string;
        category: string;
        type: 'notice' | 'file';
        date?: string | Date;
    } | null;
}

export function NewAnnouncementDialog({ isOpen, onClose, defaultTab = 'notice', initialData }: NewAnnouncementDialogProps) {
    const [activeTab, setActiveTab] = useState<'notice' | 'file'>(defaultTab);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Notice State
    const [noticeTitle, setNoticeTitle] = useState('');
    const [noticeContent, setNoticeContent] = useState('');
    const [noticeCategory, setNoticeCategory] = useState('학사');
    const [noticeDate, setNoticeDate] = useState('');

    // File State
    const [fileTitle, setFileTitle] = useState('');
    const [fileDescription, setFileDescription] = useState('');
    const [fileCategory, setFileCategory] = useState('자료');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { addEvent, updateEvent } = useEvents();
    const { uploadFile } = useFileResources();

    // Populate form if editing
    useEffect(() => {
        if (initialData) {
            if (initialData.type === 'notice') {
                setActiveTab('notice');
                setNoticeTitle(initialData.title);
                setNoticeContent(initialData.content);
                // Try to map category or default to '학사' if custom
                setNoticeCategory(initialData.category || '학사');
                if (initialData.date) {
                    try {
                        const d = new Date(initialData.date);
                        // Format for datetime-local: YYYY-MM-DDTHH:mm
                        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                        setNoticeDate(localIso);
                    } catch (e) {
                        console.error(e);
                    }
                } else {
                    setNoticeDate('');
                }
            }
            // File editing logic omitted for now as it mostly involves re-upload
        } else {
            // Reset
            setNoticeTitle('');
            setNoticeContent('');
            setFileTitle('');
            setFileDescription('');
            setSelectedFile(null);
            setNoticeDate('');
        }
    }, [initialData, isOpen]);

    const handleNoticeSubmit = async () => {
        if (!noticeTitle.trim()) {
            toast.error('제목을 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (initialData && initialData.type === 'notice') {
                await updateEvent(initialData.id, {
                    title: noticeTitle,
                    description: noticeContent,
                    category: noticeCategory,
                    start_date: noticeDate ? new Date(noticeDate) : undefined,
                });
                toast.success("공지사항이 수정되었습니다.");
            } else {
                await addEvent({
                    title: noticeTitle,
                    description: noticeContent,
                    start_date: noticeDate ? new Date(noticeDate) : new Date(),
                    end_date: noticeDate ? new Date(new Date(noticeDate).getTime() + 3600000) : new Date(),
                    category: 'notice',
                    type: 'department' // Public scope
                });
                toast.success("공지사항이 등록되었습니다.");
            }
            onClose();
        } catch (e) {
            toast.error("처리 실패");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileSubmit = async () => {
        if (!selectedFile || !fileTitle.trim()) {
            toast.error('제목과 파일을 모두 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        try {
            await uploadFile(selectedFile, {
                title: fileTitle,
                description: fileDescription,
                category: fileCategory
            });
            toast.success("자료가 업로드되었습니다.");
            onClose();
            // Reset
            setFileTitle('');
            setFileDescription('');
            setSelectedFile(null);
        } catch (e) {
            toast.error("업로드 실패");
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle>{initialData ? '게시물 수정' : '새로운 게시물 작성'}</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="notice">📢 공지사항</TabsTrigger>
                        <TabsTrigger value="file" disabled={!!initialData}>📂 자료 공유</TabsTrigger>
                    </TabsList>

                    <TabsContent value="notice" className="space-y-4">
                        <div>
                            <Label>제목</Label>
                            <Input
                                value={noticeTitle}
                                onChange={(e) => setNoticeTitle(e.target.value)}
                                placeholder="공지 제목을 입력하세요"
                                className="mt-1"
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="w-1/3">
                                <Label>카테고리</Label>
                                <Select value={noticeCategory} onValueChange={setNoticeCategory}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="학사">학사</SelectItem>
                                        <SelectItem value="행정">행정</SelectItem>
                                        <SelectItem value="장학">장학</SelectItem>
                                        <SelectItem value="행사">행사</SelectItem>
                                        <SelectItem value="기타">기타</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label>일시 (수정 가능)</Label>
                            <Input
                                type="datetime-local"
                                value={noticeDate}
                                onChange={(e) => setNoticeDate(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label>내용</Label>
                            <Textarea
                                value={noticeContent}
                                onChange={(e) => setNoticeContent(e.target.value)}
                                placeholder="공지 내용을 입력하세요"
                                className="mt-1 min-h-[150px]"
                            />
                        </div>

                        <Button className="w-full" onClick={handleNoticeSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {initialData ? '수정하기' : '공지 등록하기'}
                        </Button>
                    </TabsContent>

                    <TabsContent value="file" className="space-y-4">
                        <div>
                            <Label>자료 제목</Label>
                            <Input
                                value={fileTitle}
                                onChange={(e) => setFileTitle(e.target.value)}
                                placeholder="예: 2024학년도 학과 내규"
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label>설명 (선택)</Label>
                            <Input
                                value={fileDescription}
                                onChange={(e) => setFileDescription(e.target.value)}
                                placeholder="자료에 대한 간단한 설명"
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label>파일 첨부</Label>
                            <div
                                className="mt-1 border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {selectedFile ? (
                                    <div className="flex items-center gap-2 text-primary font-medium">
                                        <FileText className="w-6 h-6" />
                                        <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                                        <Button
                                            variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full hover:bg-red-100 hover:text-red-600"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFile(null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                        <p className="text-sm text-gray-500">클릭하여 파일을 선택하세요</p>
                                    </>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                                    }}
                                />
                            </div>
                        </div>

                        <Button className="w-full" onClick={handleFileSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            업로드 및 등록
                        </Button>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
