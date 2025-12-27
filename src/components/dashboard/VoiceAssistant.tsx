import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
// import { httpsCallable } from 'firebase/functions'; // Removed
// import { functions } from '@/lib/firebase'; // Removed
import { useEvents } from '@/hooks/useEvents';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useSmartDictionary } from "@/hooks/useSmartDictionary";
import { parseScheduleText, formatDateFriendly } from "@/utils/scheduleParser";
import { addHours } from "date-fns";

interface VoiceAssistantProps {
    className?: string;
}

export default function VoiceAssistant({ className = '' }: VoiceAssistantProps) {
    const { addEvent } = useEvents();
    const { user } = useAuth();
    const [hasGreeted, setHasGreeted] = useState(false);

    const { preprocessText } = useSmartDictionary();

    const handleCommand = async (transcript: string) => {
        try {
            toast.info(`명령 처리 중: "${transcript}"`);

            // 1. Preprocess
            const processed = preprocessText(transcript);

            // 2. Local Parse
            const localParsed = parseScheduleText(processed);

            if (localParsed && localParsed.confidence > 0.4) {
                // Formatting for display/speech
                const dateStr = formatDateFriendly(localParsed.date);
                const timeStr = localParsed.hasTime
                    ? localParsed.date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                    : '종일';

                speak(`네, ${dateStr} ${timeStr}에 ${localParsed.title} 일정을 등록할까요?`);

                // Immediately create event (since it's a voice command assumption)
                // Or maybe just create it? The previous logic created it immediately.
                // Let's create it.

                await addEvent({
                    title: localParsed.title,
                    description: "Voice Command",
                    start_date: localParsed.date,
                    end_date: localParsed.hasTime ? addHours(localParsed.date, 1) : undefined,
                    location: localParsed.location || undefined,
                });

                speak(`일정이 등록되었습니다.`);
                toast.success(`일정 등록 완료: ${localParsed.title}`);

            } else {
                speak('죄송합니다. 날짜와 시간을 정확히 말씀해 주세요.');
                toast.error('날짜/시간 인식 실패');
            }
        } catch (error) {
            console.error('Command processing error:', error);
            speak('죄송합니다. 오류가 발생했습니다.');
            toast.error('명령 처리 중 오류가 발생했습니다.');
        }
    };

    const {
        isListening,
        isActive,
        isSpeaking,
        transcript,
        startListening,
        stopListening,
        speak,
        volume
    } = useVoiceAssistant(handleCommand);

    const toggleListening = () => {
        if (isListening) {
            // If user clicks stop and there is a transcript, execute it immediately
            if (transcript.trim()) {
                handleCommand(transcript);
                speak('처리하겠습니다.');
            }
            stopListening();
        } else {
            startListening(true); // Start in active mode (skip wake word)
            // Greet user on first activation (with user gesture)
            if (!hasGreeted && user) {
                setTimeout(() => {
                    const userName = user.displayName || '교수님';
                    const greeting = `${userName}님, 무엇을 도와드릴까요?`;
                    speak(greeting);
                    setHasGreeted(true);
                }, 500);
            }
        }
    };

    return (
        <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
            {/* Transcript Display */}
            <AnimatePresence>
                {(isListening || isActive) && transcript && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-20 right-0 bg-white rounded-2xl shadow-2xl p-4 max-w-sm border border-gray-200"
                    >
                        <p className="text-sm text-gray-600 mb-1">
                            {isActive ? '🎤 명령 대기 중...' : '👂 듣는 중...'}
                        </p>
                        <p className="text-gray-900 font-medium">{transcript}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mic Button with Volume Visualizer */}
            <motion.button
                onClick={toggleListening}
                className={`relative w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all z-10 ${isListening
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                    }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {/* Visualizer Ring - changes opacity/scale based on volume */}
                {isListening && volume > 0 && (
                    <motion.div
                        className="absolute inset-0 rounded-full bg-white/30"
                        animate={{
                            scale: 1 + (volume / 50), // Map 0-100 to 1.0-3.0 scale
                            opacity: 0.3 + (volume / 200)
                        }}
                        transition={{ duration: 0.1 }}
                    />
                )}

                {isSpeaking ? (
                    <Volume2 className="w-7 h-7 text-white z-20" />
                ) : isListening ? (
                    <Mic className="w-7 h-7 text-white z-20" />
                ) : (
                    <MicOff className="w-7 h-7 text-white z-20" />
                )}
            </motion.button>

            {/* Listening Indicator (Pulse) - only if no volume */}
            {isListening && volume === 0 && (
                <motion.div
                    className="absolute inset-0 rounded-full border-4 border-blue-400"
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.8, 0, 0.8],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 2,
                    }}
                />
            )}

            {/* Status Text */}
            <div className="absolute -top-8 right-0 text-sm text-gray-600 whitespace-nowrap">
                {isActive && '🎤 명령을 말씀하세요'}
                {isListening && !isActive && '👂 "헤이 DPT"'}
                {isSpeaking && '🔊 응답 중...'}
            </div>
        </div>
    );
}
