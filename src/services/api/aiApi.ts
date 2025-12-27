// AI API Service - Cloud Functions 호출 래퍼
// AI 관련 Cloud Functions 호출을 캡슐화

import { getFunctions, httpsCallable } from "firebase/functions";
import type { ParsedEvent, ParseResponse, ApiResult } from "@/types";

export const aiApi = {
    /**
     * AI로 자연어 일정 파싱
     * @param prompt 사용자 입력 (예: "내일 오후 3시 회의")
     * @param currentDate 기준 날짜
     * @returns 파싱된 이벤트 정보
     */
    parseSchedule: async (
        prompt: string,
        currentDate: Date = new Date()
    ): Promise<ApiResult<{ event: ParsedEvent; model: string }>> => {
        try {
            const functions = getFunctions();
            const parseScheduleWithAI = httpsCallable<
                { prompt: string; currentDate: string },
                ParseResponse
            >(functions, "parseScheduleWithAI");

            const result = await parseScheduleWithAI({
                prompt: prompt.trim(),
                currentDate: currentDate.toISOString(),
            });

            if (result.data.success && result.data.event) {
                return {
                    data: {
                        event: result.data.event,
                        model: result.data.model,
                    },
                    error: null,
                };
            }

            return {
                error: new Error("AI 파싱 실패"),
            };
        } catch (error: unknown) {
            console.error("AI parsing error:", error);

            // Firebase function error에서 메시지 추출
            let errorMessage = "일정 파싱에 실패했습니다";
            if (error && typeof error === "object") {
                const firebaseError = error as { details?: string; message?: string };
                errorMessage = firebaseError.details || firebaseError.message || errorMessage;
            }

            return {
                error: new Error(errorMessage),
            };
        }
    },
};
