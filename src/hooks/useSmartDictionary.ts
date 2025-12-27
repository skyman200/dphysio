import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ============================================
// 스마트 사전 시스템
// ============================================

export interface DictionaryItem {
    replacement: string;
    type: 'title' | 'place' | 'time' | 'person' | 'correction';
    usageCount?: number;
    createdAt?: any;
    updatedAt?: any;
}

/**
 * 스마트 사전 훅
 * 
 * Firestore의 smart_dictionary 컬렉션과 실시간 동기화
 * 사용자가 자주 쓰는 약어/별칭을 자동으로 치환
 * 
 * 예시:
 * - "종총" → "종강총회"
 * - "305" → "305호 회의실"
 * - "학과장" → "김교수님"
 */
export function useSmartDictionary() {
    const [dictionary, setDictionary] = useState<Record<string, DictionaryItem>>({});
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // 사전 데이터 실시간 구독
    useEffect(() => {
        if (!user) {
            setDictionary({});
            setLoading(false);
            return;
        }

        setLoading(true);

        const unsubscribe = onSnapshot(
            collection(db, 'smart_dictionary'),
            (snapshot) => {
                const newDict: Record<string, DictionaryItem> = {};
                snapshot.forEach((doc) => {
                    newDict[doc.id] = doc.data() as DictionaryItem;
                });
                setDictionary(newDict);
                setLoading(false);
            },
            (error) => {
                console.error('Error loading smart dictionary:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user]);

    /**
     * 문장 전처리 함수 (사전 기반 치환)
     * 긴 키워드부터 먼저 매칭하여 부분 매칭 문제 방지
     */
    const preprocessText = useCallback((text: string): string => {
        let processed = text;

        // 키워드를 길이순으로 정렬 (긴 것부터 매칭)
        const sortedKeywords = Object.keys(dictionary).sort((a, b) => b.length - a.length);

        sortedKeywords.forEach((keyword) => {
            const data = dictionary[keyword];
            // 대소문자 무시 전역 매칭
            const regex = new RegExp(keyword, 'gi');
            processed = processed.replace(regex, data.replacement);
        });

        return processed;
    }, [dictionary]);

    /**
     * 새로운 단어 학습
     */
    const learnWord = useCallback(async (
        keyword: string,
        replacement: string,
        type: DictionaryItem['type'] = 'title'
    ) => {
        if (!keyword?.trim() || !replacement?.trim()) {
            toast.error('키워드와 치환어를 모두 입력해주세요.');
            return { error: new Error('Invalid input') };
        }

        try {
            const normalizedKeyword = keyword.trim().toLowerCase();

            await setDoc(doc(db, 'smart_dictionary', normalizedKeyword), {
                replacement: replacement.trim(),
                type,
                usageCount: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            toast.success(`학습 완료: "${keyword}" → "${replacement}"`);
            return { error: null };
        } catch (error) {
            console.error('학습 실패:', error);
            toast.error('단어 학습에 실패했습니다.');
            return { error: error as Error };
        }
    }, []);

    /**
     * 사용 횟수 증가 (자동 학습 우선순위용)
     */
    const incrementUsage = useCallback(async (keyword: string) => {
        const item = dictionary[keyword.toLowerCase()];
        if (!item) return;

        try {
            await setDoc(doc(db, 'smart_dictionary', keyword.toLowerCase()), {
                ...item,
                usageCount: (item.usageCount || 0) + 1,
                updatedAt: serverTimestamp(),
            }, { merge: true });
        } catch (error) {
            console.error('Usage increment failed:', error);
        }
    }, [dictionary]);

    /**
     * 사전에서 매칭되는 키워드 찾기
     */
    const findMatches = useCallback((text: string): Array<{ keyword: string; item: DictionaryItem }> => {
        const matches: Array<{ keyword: string; item: DictionaryItem }> = [];
        const lowerText = text.toLowerCase();

        Object.entries(dictionary).forEach(([keyword, item]) => {
            if (lowerText.includes(keyword)) {
                matches.push({ keyword, item });
            }
        });

        return matches;
    }, [dictionary]);

    return {
        dictionary,
        loading,
        preprocessText,
        learnWord,
        incrementUsage,
        findMatches,
    };
}
