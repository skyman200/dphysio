import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Calendar, Clock, MapPin, Sparkles, Check, BookOpen, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSmartDictionary } from '@/hooks/useSmartDictionary';
import { parseScheduleText, formatDateFriendly, ParsedSchedule } from '@/utils/scheduleParser';
import { toast } from 'sonner';

// ============================================
// 스마트 일정 입력 컴포넌트
// ============================================

interface SmartInputProps {
    onScheduleConfirm: (schedule: ParsedSchedule) => void;
    placeholder?: string;
    className?: string;
}

// TypeScript에서 Web Speech API 선언
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export function SmartInput({
    onScheduleConfirm,
    placeholder = "예: 다음주 수요일 오후 2시 학과장님 미팅",
    className
}: SmartInputProps) {
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [result, setResult] = useState<ParsedSchedule | null>(null);
    const [showLearnDialog, setShowLearnDialog] = useState(false);
    const [learnKeyword, setLearnKeyword] = useState('');
    const [learnReplacement, setLearnReplacement] = useState('');

    const recognitionRef = useRef<any>(null);
    const debounceRef = useRef<NodeJS.Timeout>();

    // 스마트 사전 훅
    const { preprocessText, learnWord, findMatches, dictionary } = useSmartDictionary();

    // 음성 인식 초기화
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0].transcript)
                .join('');
            setInput(transcript);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                toast.error('마이크 권한이 필요합니다.');
            }
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // 이미 중지됨
                }
            }
        };
    }, []);

    // 입력 변경 시 파싱 (디바운스 적용)
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (!input.trim()) {
            setResult(null);
            return;
        }

        debounceRef.current = setTimeout(() => {
            // 1. 사전 기반 전처리
            const processed = preprocessText(input);

            // 2. 자연어 파싱
            const parsed = parseScheduleText(processed);
            setResult(parsed);
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [input, preprocessText]);

    // 음성 인식 토글
    const toggleListening = useCallback(() => {
        if (!recognitionRef.current) {
            toast.error('이 브라우저는 음성 인식을 지원하지 않습니다.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            try {
                recognitionRef.current.start();
                setIsListening(true);
                toast.info('🎤 말씀해 주세요...', { duration: 2000 });
            } catch (error) {
                console.error('Failed to start recognition:', error);
                toast.error('음성 인식을 시작할 수 없습니다.');
            }
        }
    }, [isListening]);

    // 일정 확정
    const handleConfirm = useCallback(() => {
        if (!result) return;

        onScheduleConfirm(result);
        setInput('');
        setResult(null);
        toast.success('일정이 추가되었습니다!');
    }, [result, onScheduleConfirm]);

    // 단어 학습
    const handleLearnWord = useCallback(async () => {
        if (!learnKeyword || !learnReplacement) return;

        await learnWord(learnKeyword, learnReplacement, 'title');
        setShowLearnDialog(false);
        setLearnKeyword('');
        setLearnReplacement('');
    }, [learnKeyword, learnReplacement, learnWord]);

    // 매칭된 사전 항목 표시
    const matchedItems = input ? findMatches(input) : [];

    return (
        <div className={cn("space-y-4", className)}>
            {/* 입력 영역 */}
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Sparkles className="h-5 w-5 text-primary/60" />
                </div>

                <Input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={placeholder}
                    className="pl-10 pr-12 py-6 text-base border-2 border-primary/20 focus:border-primary/50 rounded-xl shadow-sm transition-all"
                />

                <button
                    onClick={toggleListening}
                    className={cn(
                        "absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all",
                        isListening
                            ? "bg-red-100 text-red-600 animate-pulse"
                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                >
                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
            </div>

            {/* 사전 매칭 표시 */}
            {matchedItems.length > 0 && (
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

            {/* 파싱 결과 카드 */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="bg-card border-2 border-primary/20 rounded-xl shadow-lg overflow-hidden"
                    >
                        {/* 헤더 */}
                        <div className="bg-primary/5 px-4 py-3 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                <span className="font-semibold text-primary">분석 결과</span>
                            </div>
                            <Badge
                                variant={result.confidence > 0.7 ? "default" : "secondary"}
                                className={cn(
                                    "text-xs",
                                    result.confidence > 0.7
                                        ? "bg-green-100 text-green-800"
                                        : "bg-yellow-100 text-yellow-800"
                                )}
                            >
                                {result.confidence > 0.7 ? '높은 신뢰도' : '확인 필요'}
                            </Badge>
                        </div>

                        {/* 내용 */}
                        <div className="p-4 space-y-4">
                            {/* 제목 */}
                            <div className="flex items-start gap-3">
                                <div className="flex-1">
                                    <p className="text-sm text-muted-foreground mb-1">일정 제목</p>
                                    <p className="text-xl font-bold text-foreground">{result.title}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* 날짜 */}
                                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">날짜</p>
                                        <p className="font-medium">{formatDateFriendly(result.date)}</p>
                                    </div>
                                </div>

                                {/* 시간 */}
                                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">시간</p>
                                        <p className={cn("font-medium", !result.hasTime && "text-muted-foreground")}>
                                            {result.hasTime
                                                ? result.date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                                                : '종일'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 장소 (있을 경우) */}
                            {result.location && (
                                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">장소</p>
                                        <p className="font-medium">{result.location}</p>
                                    </div>
                                </div>
                            )}

                            {/* 신뢰도 낮을 때 경고 */}
                            {result.confidence <= 0.7 && (
                                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                                    <p className="text-sm text-yellow-800">
                                        인식 결과를 확인해 주세요. 원하시는 정보가 아니라면 수정 후 다시 시도해주세요.
                                    </p>
                                </div>
                            )}

                            {/* 버튼 영역 */}
                            <div className="flex gap-2 pt-2">
                                <Button
                                    onClick={handleConfirm}
                                    className="flex-1 gap-2"
                                    size="lg"
                                >
                                    <Check className="h-4 w-4" />
                                    이대로 추가하기
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={() => setShowLearnDialog(true)}
                                    className="gap-2"
                                >
                                    <BookOpen className="h-4 w-4" />
                                    학습
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 사전 학습 다이얼로그 */}
            <AnimatePresence>
                {showLearnDialog && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                        onClick={() => setShowLearnDialog(false)}
                    >
                        <div
                            className="bg-card p-6 rounded-xl shadow-xl max-w-md w-full mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-primary" />
                                새 단어 학습
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">약어/별칭</label>
                                    <Input
                                        value={learnKeyword}
                                        onChange={(e) => setLearnKeyword(e.target.value)}
                                        placeholder="예: 종총"
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">치환할 단어</label>
                                    <Input
                                        value={learnReplacement}
                                        onChange={(e) => setLearnReplacement(e.target.value)}
                                        placeholder="예: 종강총회"
                                        className="mt-1"
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button onClick={handleLearnWord} className="flex-1">
                                        학습시키기
                                    </Button>
                                    <Button variant="outline" onClick={() => setShowLearnDialog(false)}>
                                        취소
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 사전 현황 표시 (디버그용, 필요시 제거) */}
            {Object.keys(dictionary).length > 0 && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    사전에 {Object.keys(dictionary).length}개 단어 등록됨
                </div>
            )}
        </div>
    );
}
