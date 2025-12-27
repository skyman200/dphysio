import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

type VoiceMode = 'GLOBAL' | 'LOCAL';

interface VoiceContextType {
    isListening: boolean;
    mode: VoiceMode;
    transcript: string;
    isActive: boolean; // GLOBAL mode: Wake word detected / LOCAL mode: Always true if listening
    lastGlobalCommand: string | null;
    setLastGlobalCommand: (command: string | null) => void;
    startGlobal: (active?: boolean) => void;
    startLocal: () => void;
    stop: () => void;
    speak: (text: string, onEnd?: () => void) => void;
    stopSpeaking: () => void;
    isSpeaking: boolean;
    volume: number; // 0 to 100
    permissionsGranted: boolean;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
    const [isListening, setIsListening] = useState(false); // Hardware mic is on
    const [mode, setMode] = useState<VoiceMode>('GLOBAL');
    const [transcript, setTranscript] = useState('');
    const [isActive, setIsActive] = useState(false); // Logic state (processing command or dictating)
    const [lastGlobalCommand, setLastGlobalCommand] = useState<string | null>(null);
    const [volume, setVolume] = useState(0);
    const [permissionsGranted, setPermissionsGranted] = useState(false);

    // TTS State
    const [isSpeaking, setIsSpeaking] = useState(false);
    const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Refs for safe access in event handlers
    const isListeningRef = useRef(isListening);
    const modeRef = useRef(mode);
    const isActiveRef = useRef(isActive);
    const recognitionRef = useRef<any>(null);

    // Audio Analysis Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Sync refs
    useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
    useEffect(() => { modeRef.current = mode; }, [mode]);
    useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

    // Cleanup on mount/unmount
    useEffect(() => {
        return () => {
            stopAudioAnalysis();
            stopRecognitionInstance();
        };
    }, []);

    // Audio Analysis (Visualizer)
    const startAudioAnalysis = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setPermissionsGranted(true);

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            const audioContext = audioContextRef.current;
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            const microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);

            analyserRef.current = analyser;
            microphoneRef.current = microphone;

            // Start Volume metering
            if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
            volumeIntervalRef.current = setInterval(() => {
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(dataArray);

                // Calculate average volume
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;

                // Normalize roughly to 0-100
                setVolume(Math.min(100, Math.round((average / 128) * 100)));
            }, 100);

            return stream;
        } catch (e) {
            console.error('[VoiceContext] Audio analysis failed:', e);
            return null;
        }
    };

    const stopAudioAnalysis = () => {
        if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
        if (microphoneRef.current) microphoneRef.current.disconnect();
        // Do not close AudioContext as we might reuse it
        setVolume(0);
    };


    // TTS Function
    const speak = useCallback((text: string, onEnd?: () => void) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            if (onEnd) onEnd();
        };
        utterance.onerror = () => setIsSpeaking(false);

        synthesisRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, []);

    const stopSpeaking = useCallback(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, []);

    // Initialize Recognition
    const startRecognitionInstance = useCallback(async () => {
        if (recognitionRef.current) return;

        // Start Audio Analysis first (to get permission and volume)
        // Note: SpeechRecognition uses its own stream, but asking getUserMedia first ensures permission is granted
        // and gives us volume data.
        await startAudioAnalysis();

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('이 브라우저는 음성 인식을 지원하지 않습니다.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            console.log('[VoiceContext] Started');
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interimTranscript += result[0].transcript;
                }
            }

            const currentTranscript = finalTranscript || interimTranscript;
            setTranscript(currentTranscript);

            // Debug log every result
            if (currentTranscript.trim()) {
                console.log('[VoiceContext] Hearing:', currentTranscript);
            }

            // GLOBAL MODE Logic: Wake Word
            if (modeRef.current === 'GLOBAL') {
                if (!isActiveRef.current) {
                    const normalized = currentTranscript.toLowerCase().replace(/\s/g, '').replace(/[.,!?]/g, '');
                    const wakeWords = ['헤이디피티', '헤이dpt', '디피티', 'dpt', '야', '저기']; // Added simpler wake words for testing

                    if (wakeWords.some(w => normalized.includes(w))) {
                        console.log('[VoiceContext] Wake word detected');
                        setIsActive(true);
                        speak('네?');
                        setTranscript(''); // Clear buffer
                    }
                } else {
                    // Command Processing (after wake word)
                    if (finalTranscript) {
                        console.log('[VoiceContext] Global Command Captured:', finalTranscript);
                        setLastGlobalCommand(finalTranscript);
                        setTranscript(''); // Clear buffer
                        setIsActive(false); // Reset active state
                    }
                }
            }
            // LOCAL MODE Logic: Just update transcript (handled by hook/consumer)
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'no-speech') {
                // Silently ignore
                return;
            }
            console.log('[VoiceContext] Error:', event.error);
            if (event.error === 'not-allowed') {
                setIsListening(false);
                toast.error('마이크 권한이 없습니다.');
            }
        };

        recognition.onend = () => {
            // Auto-restart logic with throttle
            if (isListeningRef.current) {
                setTimeout(() => {
                    if (isListeningRef.current && recognitionRef.current) {
                        try {
                            recognitionRef.current.start();
                        } catch (e) {
                            // Ignore start errors
                        }
                    }
                }, 1000); // 1.0s delay to prevent loop causing rapid firing
            } else {
                // Real stop
                setIsActive(false);
                stopAudioAnalysis();
                recognitionRef.current = null;
            }
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            // Ignore
        }
    }, [speak]);

    const stopRecognitionInstance = useCallback(() => {
        setIsListening(false);
        setIsActive(false);
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        stopAudioAnalysis();
    }, []);

    // Public Methods
    const startGlobal = useCallback((active = false) => {
        setMode('GLOBAL');
        setIsActive(active); // If active=true, skip wake word requirement
        if (active) {
            // Give feedback if starting active
            toast.info("듣고 있습니다...");
        }
        startRecognitionInstance();
    }, [startRecognitionInstance]);

    const startLocal = useCallback(() => {
        setMode('LOCAL');
        setIsActive(true); // Always active in local mode (dictation)
        startRecognitionInstance();
    }, [startRecognitionInstance]);

    const stop = useCallback(() => {
        stopRecognitionInstance();
    }, [stopRecognitionInstance]);

    return (
        <VoiceContext.Provider value={{
            isListening,
            mode,
            transcript,
            isActive,
            lastGlobalCommand,
            setLastGlobalCommand,
            startGlobal,
            startLocal,
            stop,
            speak,
            stopSpeaking,
            isSpeaking,
            volume,
            permissionsGranted
        }}>
            {children}
        </VoiceContext.Provider>
    );
}

export function useVoiceContext() {
    const context = useContext(VoiceContext);
    if (!context) {
        throw new Error('useVoiceContext must be used within a VoiceProvider');
    }
    return context;
}
