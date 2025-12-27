import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Check, Calendar, MapPin, Clock, Mic, MicOff, BookOpen, Zap, Cloud } from "lucide-react";
import { useEvents } from "@/hooks/useEvents";
import { getFunctions, httpsCallable } from "firebase/functions";
import { format, parseISO, addHours } from "date-fns";
import { ko } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { useSmartDictionary } from "@/hooks/useSmartDictionary";
import { parseScheduleText, formatDateFriendly, ParsedSchedule } from "@/utils/scheduleParser";
import { cn } from "@/lib/utils";
import { useVoiceContext } from "@/contexts/VoiceContext";
import AddToIosButton from "@/components/common/AddToIosButton";

interface ParsedEvent {
    title: string;
    start_date: string;
    end_date: string | null;
    location: string | null;
    description: string | null;
}

interface ParseResponse {
    success: boolean;
    event: ParsedEvent;
    model: string;
}

type ParseMethod = 'local' | 'ai' | null;

export function AIScheduleInput() {
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [parsedEvent, setParsedEvent] = useState<ParsedEvent | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [parseMethod, setParseMethod] = useState<ParseMethod>(null);
    const [localResult, setLocalResult] = useState<ParsedSchedule | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const toLocalISOString = (date: Date) => {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };

    // Success State for iOS Calendar
    const [lastAddedEvent, setLastAddedEvent] = useState<ParsedEvent | null>(null);

    // 음성 인식 후처리 학습을 위한 상태
    const [lastVoiceInput, setLastVoiceInput] = useState<string | null>(null); // 음성 인식 원본
    const [showLearnModal, setShowLearnModal] = useState(false);
    const [learnSuggestion, setLearnSuggestion] = useState<{
        original: string;
        corrected: string;
    } | null>(null);

    const { addEvent } = useEvents();
    const { toast: toastOld } = useToast();
    const { preprocessText, findMatches, learnWord } = useSmartDictionary();

    // Context 사용
    const {
        isListening,
        transcript,
        startLocal,
        stop
    } = useVoiceContext();

    const debounceRef = useRef<NodeJS.Timeout>();

    // Transcript update logic
    useEffect(() => {
        if (isListening && transcript) {
            // 원본 음성 입력 저장 (학습용)
            setLastVoiceInput(transcript);

            // 사전 적용 후 입력창에 표시
            const processed = preprocessText(transcript);
            setPrompt(processed);
        }
    }, [isListening, transcript, preprocessText]);


    // 음성 인식 토글
    const toggleListening = useCallback(() => {
        if (isListening) {
            stop();
        } else {
            startLocal();
            toast.info('🎤 말씀해 주세요...', { duration: 3000 });
        }
    }, [isListening, startLocal, stop]);


    // 실시간 로컬 파싱 (디바운스)
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (!prompt.trim()) {
            setLocalResult(null);
            return;
        }

        debounceRef.current = setTimeout(() => {
            // 1. 사전 기반 전처리
            const processed = preprocessText(prompt);

            // 2. 로컬 자연어 파싱
            const parsed = parseScheduleText(processed);

            if (parsed) {
                parsed.title = preprocessText(parsed.title);
            }

            setLocalResult(parsed);
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [prompt, preprocessText]);

    // 로컬 파싱 결과 확정
    const useLocalResult = () => {
        if (!localResult) return;

        // BUG FIX: Use parsed endDate if available, otherwise default to 1 hour
        const endDate = localResult.endDate
            ? localResult.endDate
            : (localResult.hasTime ? addHours(localResult.date, 1) : null);

        setParsedEvent({
            title: localResult.title,
            start_date: localResult.date.toISOString(),
            end_date: endDate?.toISOString() || null,
            location: localResult.location || null,
            description: null,
        });
        setParseMethod('local');
        setShowPreview(true);
    };

    // AI Fallback (Disabled)
    const handleAIParse = async () => {
        // AI logic disabled by user request
        return;
    };

    // 스마트 파싱 (로컬 전용)
    const handleSmartParse = async () => {
        if (!prompt.trim()) return;

        toast.info('⚡ 분석 중...');

        // 1. 전처리 및 로컬 파싱
        const processed = preprocessText(prompt);
        const localParsed = parseScheduleText(processed);

        if (localParsed) {
            localParsed.title = preprocessText(localParsed.title);
        }

        if (localParsed && localParsed.confidence > 0.4) {
            // 로컬 파싱 성공
            useLocalResultLogic(localParsed);
        } else {
            toast.error('📅 날짜와 시간을 좀 더 정확히 말씀해 주세요 (예: "내일 3시")', {
                description: "현재 로컬 분석 모드입니다."
            });
        }
    };

    const useLocalResultLogic = (localParsed: ParsedSchedule) => {
        // BUG FIX: Use parsed endDate if available
        const endDate = localParsed.endDate
            ? localParsed.endDate
            : (localParsed.hasTime ? addHours(localParsed.date, 1) : null);

        setParsedEvent({
            title: localParsed.title,
            start_date: localParsed.date.toISOString(),
            end_date: endDate?.toISOString() || null,
            location: localParsed.location || null,
            description: null,
        });
        setParseMethod('local');
        setShowPreview(true);
        toast.success('⚡ 로컬에서 빠르게 분석했습니다!');
    }

    // 음성 인식 오류 감지 및 학습 제안
    const detectCorrectionAndSuggestLearning = (original: string, final: string) => {
        console.log('[Learning] Comparing:', { original, final });

        // 단어 단위로 비교
        const originalWords = original.split(/\s+/).filter(w => w.length > 0);
        const finalWords = final.split(/\s+/).filter(w => w.length > 0);

        // 원본에는 있지만 최종에는 없는 단어 (삭제/수정된 단어)
        const missingWords = originalWords.filter(w =>
            !finalWords.some(fw => fw.toLowerCase() === w.toLowerCase())
        );

        // 최종에는 있지만 원본에는 없는 단어 (새로 추가된 단어)
        const newWords = finalWords.filter(w =>
            !originalWords.some(ow => ow.toLowerCase() === w.toLowerCase())
        );

        // 하나씩 삭제/추가된 경우 = 수정으로 판단
        if (missingWords.length === 1 && newWords.length === 1) {
            const originalWord = missingWords[0];
            const correctedWord = newWords[0];

            // 너무 짧은 단어는 무시 (1글자)
            if (originalWord.length > 1 && correctedWord.length > 1) {
                setLearnSuggestion({ original: originalWord, corrected: correctedWord });
                setShowLearnModal(true);
            }
        }
    };

    const handleConfirm = async () => {
        if (!parsedEvent) return;

        try {
            // 1. 음성 인식 후처리 학습: 원본과 최종 텍스트(Prompt) 비교
            if (lastVoiceInput && prompt !== lastVoiceInput) {
                detectCorrectionAndSuggestLearning(lastVoiceInput, prompt);
            }

            // 2. 결과 수정 학습: 파서 결과와 최종 수정된 제목 비교
            if (localResult && parsedEvent.title.trim() !== localResult.title.trim()) {
                console.log('[Learning] Title corrected:', localResult.title, '->', parsedEvent.title);
                setLearnSuggestion({ original: localResult.title, corrected: parsedEvent.title });
                setShowLearnModal(true);
            }

            const { error } = await addEvent({
                title: parsedEvent.title,
                description: parsedEvent.description || undefined,
                start_date: new Date(parsedEvent.start_date),
                end_date: parsedEvent.end_date ? new Date(parsedEvent.end_date) : undefined,
                location: parsedEvent.location || undefined,
            });

            if (error) {
                throw error;
            }

            toastOld({
                title: "일정 추가 완료",
                description: `"${parsedEvent.title}" 일정이 캘린더에 추가되었습니다.`,
            });

            // Show Success State with iOS Button
            setLastAddedEvent(parsedEvent);

            // Reset form but keep success state for a moment or until dismissed
            setPrompt("");
            setParsedEvent(null);
            setShowPreview(false);
            setLocalResult(null);
            setParseMethod(null);
            setLastVoiceInput(null); // 초기화
        } catch (error) {
            console.error("Event creation error:", error);
            toastOld({
                title: "오류",
                description: "일정 추가에 실패했습니다.",
                variant: "destructive",
            });
        }
    };

    // Close Success View
    const handleSuccessClose = () => {
        setLastAddedEvent(null);
    };

    // 학습 확인 처리
    const handleLearnConfirm = async () => {
        if (!learnSuggestion) return;

        try {
            await learnWord(
                learnSuggestion.original,
                learnSuggestion.corrected,
                'correction' // 음성 인식 교정 타입
            );
            toast.success(`"학습 완료! "${learnSuggestion.original}" → "${learnSuggestion.corrected}"`);
        } catch (error) {
            console.error('[Learning] Failed to save:', error);
            toast.error('학습 저장에 실패했습니다.');
        } finally {
            setShowLearnModal(false);
            setLearnSuggestion(null);
        }
    };

    // 학습 취소
    const handleLearnCancel = () => {
        setShowLearnModal(false);
        setLearnSuggestion(null);
    };

    const handleCancel = () => {
        setParsedEvent(null);
        setShowPreview(false);
        setParseMethod(null);
    };

    const formatEventTime = (startDate: string, endDate: string | null) => {
        const start = parseISO(startDate);
        const formattedStart = format(start, "M월 d일 (E) a h:mm", { locale: ko });

        if (endDate) {
            const end = parseISO(endDate);
            const formattedEnd = format(end, "a h:mm", { locale: ko });
            return `${formattedStart} ~ ${formattedEnd}`;
        }

        return formattedStart;
    };

    // 사전 매칭 항목
    const matchedItems = prompt ? findMatches(prompt) : [];

    return (
        <>
            <Card className="mt-4 border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Sparkles className="h-5 w-5 text-primary" />
                        스마트 일정 생성
                        <Badge variant="outline" className="text-xs font-normal bg-green-50 text-green-700 border-green-200">
                            <Zap className="h-3 w-3 mr-1 fill-current" />
                            로컬 분석
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Input Section */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                placeholder='예: "내일 오후 3시 김교수님 면담 30분"'
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSmartParse();
                                    }
                                }}
                                disabled={isLoading || showPreview}
                                className="pr-10"
                            />
                            <button
                                onClick={toggleListening}
                                disabled={isLoading || showPreview}
                                className={cn(
                                    "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all",
                                    isListening
                                        ? "bg-red-100 text-red-600 animate-pulse"
                                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            </button>
                        </div>
                        <Button
                            onClick={handleSmartParse}
                            disabled={!prompt.trim() || isLoading || showPreview}
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "생성"
                            )}
                        </Button>
                    </div>

                    {/* 사전 매칭 표시 */}
                    {matchedItems.length > 0 && !showPreview && (
                        <div className="flex flex-wrap gap-2">
                            {matchedItems.map(({ keyword, item }) => (
                                <Badge
                                    key={keyword}
                                    variant="secondary"
                                    className="text-xs bg-amber-100 text-amber-800 border-amber-200"
                                >
                                    <BookOpen className="h-3 w-3 mr-1" />
                                    "{keyword}" → "{item.replacement}"
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* 실시간 로컬 파싱 미리보기 */}
                    {localResult && !showPreview && (
                        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                                <Zap className="h-4 w-4 text-yellow-500" />
                                <span className="text-muted-foreground">실시간 분석:</span>
                                <span className="font-medium">{localResult.title}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">{formatDateFriendly(localResult.date)}</span>
                                {localResult.hasTime && (
                                    <>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="text-muted-foreground">
                                            {localResult.date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={useLocalResult} className="gap-1 w-full">
                                    <Zap className="h-3 w-3" />
                                    바로 적용
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Preview Section */}
                    {showPreview && parsedEvent && (
                        <div className="rounded-lg border bg-card p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                            {/* Editable Preview Content */}
                            <div className="flex items-start justify-between">
                                <div className="space-y-3 w-full">
                                    <div className="flex items-center gap-2">
                                        {isEditing ? (
                                            <Input
                                                value={parsedEvent.title}
                                                onChange={(e) => setParsedEvent({ ...parsedEvent, title: e.target.value })}
                                                className="font-semibold text-lg"
                                                placeholder="일정 제목"
                                            />
                                        ) : (
                                            <>
                                                <h4 className="font-semibold text-foreground text-lg cursor-pointer hover:underline underline-offset-4 decoration-primary/30" onClick={() => setIsEditing(true)}>
                                                    {parsedEvent.title}
                                                </h4>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs bg-green-100 text-green-800 shrink-0"
                                                >
                                                    <Zap className="h-3 w-3 mr-1" />로컬 분석
                                                </Badge>
                                            </>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Clock className="h-4 w-4 shrink-0" />
                                            {isEditing ? (
                                                <div className="flex items-center gap-2 w-full">
                                                    <Input
                                                        type="datetime-local"
                                                        value={toLocalISOString(new Date(parsedEvent.start_date))}
                                                        onChange={(e) => {
                                                            const date = new Date(e.target.value);
                                                            if (!isNaN(date.getTime())) {
                                                                setParsedEvent({ ...parsedEvent, start_date: date.toISOString() });
                                                            }
                                                        }}
                                                        className="h-8 text-xs"
                                                    />
                                                    <span>~</span>
                                                    <Input
                                                        type="datetime-local"
                                                        value={parsedEvent.end_date ? toLocalISOString(new Date(parsedEvent.end_date)) : ''}
                                                        onChange={(e) => {
                                                            const date = new Date(e.target.value);
                                                            if (!isNaN(date.getTime())) {
                                                                setParsedEvent({ ...parsedEvent, end_date: date.toISOString() });
                                                            }
                                                        }}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                            ) : (
                                                <span onClick={() => setIsEditing(true)} className="cursor-pointer hover:text-primary">
                                                    {formatEventTime(parsedEvent.start_date, parsedEvent.end_date)}
                                                </span>
                                            )}
                                        </div>
                                        {parsedEvent.location && !isEditing && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <MapPin className="h-4 w-4" />
                                                {parsedEvent.location}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {!isEditing && <Calendar className="h-8 w-8 text-primary/50" />}
                            </div>

                            {isEditing && (
                                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                                    💡 내용을 수정하면 디피티가 이를 학습하여 다음에는 더 똑똑해집니다.
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <Button
                                    onClick={handleConfirm}
                                    className="flex-1"
                                    size="sm"
                                >
                                    <Check className="h-4 w-4 mr-1" />
                                    {isEditing ? (
                                        "수정 및 캘린더 추가"
                                    ) : (
                                        "캘린더에 추가"
                                    )}
                                </Button>
                                {isEditing ? (
                                    <Button
                                        onClick={() => setIsEditing(false)}
                                        variant="outline"
                                        size="sm"
                                    >
                                        취소
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => setIsEditing(true)}
                                        variant="outline"
                                        size="sm"
                                    >
                                        수정하기
                                    </Button>
                                )}
                                <Button
                                    onClick={handleCancel}
                                    variant="ghost"
                                    size="sm"
                                    className="px-2"
                                >
                                    취소
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Success View with iOS Calendar Button */}
                    {lastAddedEvent && (
                        <div className="rounded-lg border bg-green-50/50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 border-green-200">
                            <div className="flex items-center gap-2 text-green-700 font-medium">
                                <Check className="h-5 w-5" />
                                일정이 추가되었습니다!
                            </div>
                            <div className="pl-7 text-sm text-muted-foreground">
                                "{lastAddedEvent.title}"
                            </div>

                            <AddToIosButton
                                title={lastAddedEvent.title}
                                date={new Date(lastAddedEvent.start_date)}
                                endDate={lastAddedEvent.end_date ? new Date(lastAddedEvent.end_date) : undefined}
                                location={lastAddedEvent.location || undefined}
                            />

                            <Button onClick={handleSuccessClose} variant="ghost" size="sm" className="w-full mt-2">
                                닫기
                            </Button>
                        </div>
                    )}

                    {/* Helper Text */}
                    {!showPreview && !localResult && !lastAddedEvent && (
                        <p className="text-xs text-muted-foreground">
                            💡 예시: "다음주 월요일 10시 학과회의 2시간", "오늘 저녁 7시 저녁식사"
                            <br />
                            ⚡ 빠르고 안전한 **로컬 분석**을 사용합니다.
                            <br />
                            📚 음성 인식 오류를 수정하면 자동으로 학습합니다.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* 음성 인식 교정 학습 모달 */}
            {
                showLearnModal && learnSuggestion && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
                        <div className="bg-card rounded-xl shadow-xl p-6 max-w-md mx-4 space-y-4 animate-in zoom-in-95">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <BookOpen className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">음성 인식 학습</h3>
                                    <p className="text-sm text-muted-foreground">
                                        오타를 수정한 것 같습니다
                                    </p>
                                </div>
                            </div>

                            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-red-500 line-through">
                                        "{learnSuggestion.original}"
                                    </span>
                                    <span className="text-muted-foreground">→</span>
                                    <span className="text-green-600 font-medium">
                                        "{learnSuggestion.corrected}"
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    앞으로 "{learnSuggestion.original}"라고 들리면
                                    "{learnSuggestion.corrected}"로 자동 변환됩니다.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    onClick={handleLearnConfirm}
                                    className="flex-1 gap-2"
                                >
                                    <Check className="h-4 w-4" />
                                    학습하기
                                </Button>
                                <Button
                                    onClick={handleLearnCancel}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    건너뛰기
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
