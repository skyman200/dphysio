import * as chrono from 'chrono-node';
import { addWeeks, setDay, addDays, getDay } from 'date-fns';

// ============================================
// 자연어 일정 파서 (Enhanced V2)
// ============================================

export interface ParsedSchedule {
    title: string;
    date: Date;
    endDate?: Date;
    hasTime: boolean;
    hasEndTime: boolean;
    location?: string;
    confidence: number;
    originalText: string;
}

// ============================================
// 정규 표현식 패턴
// ============================================

const PATTERNS = {
    // 날짜: 10월 5일, 10.5, 10/5
    DATE_ABSOLUTE: /(\d{1,2})\s*[월./]\s*(\d{1,2})(?:\s*일)?/,

    // 상대 날짜: 오늘, 내일, 모레, 글피
    DATE_RELATIVE: /(오늘|내일|모레|글피)/,

    // 주간 이동: 다음주(담주) 월요일, 다다음주, 이번주
    DATE_WEEKLY: /(이번|다음|다다음|담)\s*주\s*([월화수목금토일])요일/,

    // 시간 범위: "오후 2시부터 6시", "10~12시", "10:00 - 16:00"
    // Capture groups: 1:StartMeridiem, 2:StartHour, 3:StartMin, 4:EndMeridiem, 5:EndHour, 6:EndMin
    TIME_RANGE: /(오전|오후|아침|점심|저녁|밤)?\s*(\d{1,2})(?:\s*시|:(\d{2}))?\s*(?:부터|~|-)\s*(오전|오후|아침|점심|저녁|밤)?\s*(\d{1,2})(?:\s*시|:(\d{2}))?(?:까지)?/,

    // 시간: 오후 2시, 14:00, 2시 30분
    TIME_MERIDIEM: /(오전|오후|아침|점심|저녁|밤)\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/,
    TIME_24HR: /(\d{1,2}):(\d{2})/,
    TIME_SIMPLE: /(\d{1,2})시(?:\s*(\d{1,2})분)?/,
};

// ============================================
// 헬퍼 함수
// ============================================

function inferHour(hour: number, meridiem?: string): number {
    if (meridiem) {
        if (['오후', '저녁', '밤'].includes(meridiem)) {
            return hour < 12 ? hour + 12 : hour;
        }
        if (['오전', '아침'].includes(meridiem)) {
            return hour === 12 ? 0 : hour;
        }
        if (meridiem === '점심') {
            return hour < 10 ? hour + 12 : hour;
        }
    } else {
        // 단순 숫자 추론 (7~11: 오전, 1~6: 오후, 12: 12)
        if (hour < 7) return hour + 12;
    }
    return hour;
}

// ============================================
// 파서 로직
// ============================================

export function parseScheduleText(text: string, referenceDate?: Date): ParsedSchedule | null {
    if (!text?.trim()) return null;

    const now = referenceDate || new Date();
    let targetDate = new Date(now);
    let endDate: Date | undefined = undefined;

    let hasDate = false;
    let hasTime = false;
    let hasEndTime = false;

    // 매칭된 문자열들을 기록해서 나중에 제목에서 제거
    let matchedStrings: string[] = [];

    // 1. 날짜 추출

    // 1-1. 주간 이동 (다음주, 담주) - 우선순위 높음 (구체적)
    const matchWeekly = text.match(PATTERNS.DATE_WEEKLY);
    if (matchWeekly) {
        const modifier = matchWeekly[1]; // 이번, 다음, 다다음, 담
        const dayChar = matchWeekly[2]; // 월, 화...

        const dayMap: Record<string, number> = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
        const targetDayIndex = dayMap[dayChar];

        targetDate = setDay(now, targetDayIndex, { weekStartsOn: 0 });

        if (modifier === '다음' || modifier === '담') {
            targetDate = addWeeks(targetDate, 1);
        } else if (modifier === '다다음') {
            targetDate = addWeeks(targetDate, 2);
        } else if (modifier === '이번') {
            if (targetDate < now && targetDayIndex !== now.getDay()) {
                // 과거라면? 보통 미래. 여기선 단순 유지.
            }
        }

        hasDate = true;
        matchedStrings.push(matchWeekly[0]);
    } else {
        // 1-2. 절대 날짜
        const matchAbsolute = text.match(PATTERNS.DATE_ABSOLUTE);
        if (matchAbsolute) {
            const month = parseInt(matchAbsolute[1]);
            const day = parseInt(matchAbsolute[2]);
            const currentMonth = now.getMonth() + 1;
            let year = now.getFullYear();
            if (currentMonth > month + 2) year++;

            targetDate = new Date(year, month - 1, day);
            if (targetDate < now) targetDate.setFullYear(year + 1);

            hasDate = true;
            matchedStrings.push(matchAbsolute[0]);
        }

        // 1-3. 상대 날짜
        const matchRelative = text.match(PATTERNS.DATE_RELATIVE);
        if (!hasDate && matchRelative) {
            const keyword = matchRelative[1];
            if (keyword === '내일') targetDate = addDays(now, 1);
            else if (keyword === '모레') targetDate = addDays(now, 2);
            else if (keyword === '글피') targetDate = addDays(now, 3);

            hasDate = true;
            matchedStrings.push(matchRelative[0]);
        }
    }

    // 2. 시간 추출

    // 2-0. 시간 범위 (N시부터 M시까지) - 가장 우선
    const matchRange = text.match(PATTERNS.TIME_RANGE);
    if (matchRange) {
        const startMeridiem = matchRange[1];
        let startHour = parseInt(matchRange[2]);
        const startMin = matchRange[3] ? parseInt(matchRange[3]) : 0;

        const endMeridiem = matchRange[4];
        let endHour = parseInt(matchRange[5]);
        const endMin = matchRange[6] ? parseInt(matchRange[6]) : 0;

        // Start Hour 추론
        startHour = inferHour(startHour, startMeridiem);

        // End Hour 추론
        if (endMeridiem) {
            endHour = inferHour(endHour, endMeridiem);
            // Case: 오후 10시 ~ 1시 (익일 1시) -> 날짜 변경 필요하나 현재 구조상 당일 처리, End < Start면 +12 or +24?
            // 여기서는 단순 시간 계산만 수행
            if (endHour < startHour) endHour += 24; // 다음날로 취급
        } else {
            // End Meridiem이 없는 경우 (10시 ~ 4시)
            endHour = inferHour(endHour); // 기본 추론 적용 (<7 -> +12)

            // 만약 기본 추론 후에도 End < Start라면? (10am ~ 2(14)) -> OK
            // (14pm ~ 6(18)) -> OK
            // (10am ~ 9am) -> ??? 보통 10am ~ 9pm.
            if (endHour < startHour) {
                endHour += 12;
            }
        }

        targetDate.setHours(startHour, startMin, 0, 0);

        // End Date Setup
        endDate = new Date(targetDate);
        // 날짜가 넘어가는 경우 (23시 ~ 01시)
        if (endHour >= 24) {
            endDate.setDate(endDate.getDate() + 1);
            endHour -= 24;
        }
        endDate.setHours(endHour, endMin, 0, 0);

        hasTime = true;
        hasEndTime = true;
        matchedStrings.push(matchRange[0]);
    } else {
        // 2-1. 기존 단일 시간 로직
        const matchMeridiem = text.match(PATTERNS.TIME_MERIDIEM);
        if (matchMeridiem) {
            const meridiem = matchMeridiem[1];
            let hour = parseInt(matchMeridiem[2]);
            const minute = matchMeridiem[3] ? parseInt(matchMeridiem[3]) : 0;

            hour = inferHour(hour, meridiem);

            targetDate.setHours(hour, minute, 0, 0);
            hasTime = true;
            matchedStrings.push(matchMeridiem[0]);
        } else {
            const match24 = text.match(PATTERNS.TIME_24HR);
            if (match24) {
                const hour = parseInt(match24[1]);
                const minute = parseInt(match24[2]);
                targetDate.setHours(hour, minute, 0, 0);
                hasTime = true;
                matchedStrings.push(match24[0]);
            } else {
                const matchSimple = text.match(PATTERNS.TIME_SIMPLE);
                if (matchSimple) {
                    let hour = parseInt(matchSimple[1]);
                    const minute = matchSimple[2] ? parseInt(matchSimple[2]) : 0;
                    hour = inferHour(hour);
                    targetDate.setHours(hour, minute, 0, 0);
                    hasTime = true;
                    matchedStrings.push(matchSimple[0]);
                }
            }
        }
    }

    // 3. 제목 추출 및 정리
    let title = text;

    // 매칭된 날짜/시간 문자열 제거
    matchedStrings.forEach(s => {
        title = title.replace(s, ' ');
    });

    // 장소 추출
    let location = undefined;
    const locationKeywords = ['에서', '호', '실', '관', '카페', '식당'];
    const locationMatch = title.split(/\s+/).find(word => locationKeywords.some(k => word.endsWith(k)));
    if (locationMatch) {
        location = locationMatch;
        title = title.replace(locationMatch, ' ');
    }

    // 조사 및 불필요한 단어 제거
    title = title.trim()
        .replace(/^(은|는|이|가|을|를|에|로)\s*/, '')
        .replace(/\s*(입니다|잡아줘|할게|하자|있어|추가해줘|등록해줘)$/, '')
        .replace(/\s+/g, ' ') // 다중 공백 -> 단일 공백
        .trim();

    // Clean trailing/leading particles.
    title = title.replace(/^(에|부터|까지)\s+/, '').replace(/\s+(에|부터|까지)$/, '');


    // 신뢰도 계산
    let confidence = 0.2;
    if (hasDate && hasTime) confidence = 0.95;
    else if (hasDate || hasTime) confidence = 0.6;

    if (!title) {
        // If everything was consumed, use a default
        title = "일정";
    }

    return {
        title: title || '새로운 일정',
        date: targetDate,
        endDate,
        hasTime,
        hasEndTime,
        location,
        confidence,
        originalText: text
    };
}

export function formatDateFriendly(date: Date): string {
    const today = new Date();
    const isToday = today.toDateString() === date.toDateString();

    // 내일
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrow = tomorrow.toDateString() === date.toDateString();

    if (isToday) return `오늘`;
    if (isTomorrow) return `내일`;

    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}
