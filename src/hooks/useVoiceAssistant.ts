import { useVoiceContext } from '@/contexts/VoiceContext';
import { useEffect } from 'react';

/**
 * VoiceContext를 사용하는 래퍼 훅
 * 기존 컴포넌트 호환성을 위해 유지
 */
export function useVoiceAssistant(onCommand?: (transcript: string) => void) {
    const {
        isListening,
        isActive,
        isSpeaking,
        transcript,
        lastGlobalCommand,
        setLastGlobalCommand,
        startGlobal,
        stop,
        speak,
        stopSpeaking,
        volume
    } = useVoiceContext();

    // Command handling from Context
    useEffect(() => {
        if (lastGlobalCommand && onCommand) {
            onCommand(lastGlobalCommand);
            setLastGlobalCommand(null); // Consume command
        }
    }, [lastGlobalCommand, onCommand, setLastGlobalCommand]);

    return {
        isListening,
        isActive,
        isSpeaking,
        transcript,
        startListening: startGlobal, // Map startListening to startGlobal
        stopListening: stop,
        speak,
        stopSpeaking,
        volume,
    };
}
