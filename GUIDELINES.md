# Devroder Studio 코드 품질 가이드라인

> **용도:** AI 코딩 에이전트에게 전달할 프롬프트
> **스택:** React + TypeScript + Tailwind CSS + Shadcn/ui + Firebase (Firestore + Auth + Functions + Storage) + Cloudflare R2

---

## 🎯 핵심 원칙

당신은 시니어 풀스택 개발자입니다. 아래 원칙을 반드시 따라 코드를 작성하세요.

---

## 1. 기본 개발 원칙

### DRY (Don't Repeat Yourself)
- 동일한 코드를 2번 이상 작성하지 마세요
- 반복되는 로직은 함수, 훅, 컴포넌트로 추출하세요
- 상수는 별도 파일(`lib/constants.ts`)에 정의하세요

```typescript
// ❌ Bad
const API_URL = "https://api.example.com";
// 다른 파일에서 또
const API_URL = "https://api.example.com";

// ✅ Good
// lib/constants.ts
export const API_URL = "https://api.example.com";
```

### KISS (Keep It Simple, Stupid)
- 복잡한 로직보다 단순하고 읽기 쉬운 코드를 작성하세요
- 한 함수는 한 가지 일만 하세요
- 중첩을 최소화하세요 (최대 3단계)

```typescript
// ❌ Bad
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {
      // do something
    }
  }
}

// ✅ Good (Early Return)
if (!user) return;
if (!user.isActive) return;
if (!user.hasPermission) return;
// do something
```

### YAGNI (You Aren't Gonna Need It)
- 현재 필요한 기능만 구현하세요
- "나중에 필요할 것 같은" 기능은 구현하지 마세요
- 과도한 추상화를 피하세요

### SoC (Separation of Concerns)
- UI 로직과 비즈니스 로직을 분리하세요
- 데이터 fetching은 커스텀 훅에서 처리하세요
- 스타일, 로직, 마크업을 명확히 분리하세요

---

## 2. SOLID 원칙

### S - Single Responsibility (단일 책임)
- 하나의 컴포넌트/함수는 하나의 책임만 가집니다
- **컴포넌트가 200줄을 넘으면 반드시 분리하세요**
- **페이지 컴포넌트는 조합만 하고, 로직은 훅에 위임하세요**

```typescript
// ❌ Bad - 너무 많은 책임 (850줄짜리 파일)
function DepartmentCalendarPage() {
  // 상태 관리 20개
  // 이벤트 핸들러 15개
  // 유틸리티 함수 10개
  // 렌더링 코드 500줄
}

// ✅ Good - 책임 분리
function DepartmentCalendarPage() {
  const calendarState = useCalendarState();
  const { events } = useEvents();
  
  return (
    <MainLayout>
      <CalendarHeader {...calendarState} />
      <CalendarMonthView events={events} />
      <EventFormDialog />
    </MainLayout>
  );
}
```

### O - Open/Closed (개방/폐쇄)
- 확장에는 열려있고, 수정에는 닫혀있어야 합니다
- Props와 composition을 활용하세요

### L - Liskov Substitution (리스코프 치환)
- 자식 컴포넌트는 부모 컴포넌트를 대체할 수 있어야 합니다

### I - Interface Segregation (인터페이스 분리)
- 필요한 props만 받으세요
- 거대한 interface보다 작은 interface 여러 개가 낫습니다

### D - Dependency Inversion (의존성 역전)
- 구체적인 구현이 아닌 추상화에 의존하세요
- **Firestore를 직접 import하지 말고, 서비스 레이어를 통해 접근하세요**

---

## 3. 파일 구조 (⭐ 중요)

```
src/
├── components/
│   ├── ui/              # Shadcn 기본 컴포넌트 (수정 X)
│   ├── layout/          # 레이아웃 컴포넌트
│   └── features/        # 기능별 컴포넌트 그룹
│       ├── calendar/    # 캘린더 관련 전부
│       │   ├── CalendarPage.tsx       # 진입점 (조합만)
│       │   ├── MonthView.tsx          # 월 보기
│       │   ├── EventForm.tsx          # 이벤트 폼
│       │   └── useCalendarState.ts    # 상태 관리 훅
│       └── dashboard/
├── services/            # ⭐ 외부 서비스 연동 (API 레이어)
│   ├── api/
│   │   ├── eventsApi.ts    # Firestore events 작업
│   │   ├── usersApi.ts     # Firestore users 작업
│   │   └── aiApi.ts        # Cloud Functions AI 호출
│   └── firebase/
│       ├── client.ts       # Firebase 인스턴스
│       └── functions.ts    # Cloud Functions 래퍼
├── hooks/               # 도메인 훅 (services 사용)
│   └── useEvents.ts     # eventsApi를 사용
├── contexts/
│   └── AuthContext.tsx
├── pages/               # 페이지 (조합만, 로직 최소화)
├── lib/
│   ├── utils.ts
│   └── constants.ts
└── types/               # ⭐ 타입 정의 중앙화
    ├── event.ts
    ├── user.ts
    └── api.ts
```

---

## 4. TypeScript 베스트 프랙티스

### ⚠️ any 타입 절대 금지

```typescript
// ❌ Bad - any 사용
const handleDelete = async (event: any) => {
  await deleteEvent(event.id);  // event.id가 없으면 크래시
}

recognition.onresult = (event: any) => {
  const transcript = event.results[0][0].transcript;
}

// ✅ Good - 정확한 타입 정의
interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  created_by: string;
}

const handleDelete = async (event: CalendarEvent) => {
  await deleteEvent(event.id);
}

// Web Speech API 타입
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

recognition.onresult = (event: SpeechRecognitionEvent) => {
  const transcript = event.results[0][0].transcript;
}
```

### 타입 중앙화

```typescript
// types/event.ts - 모든 이벤트 관련 타입을 한 곳에
export interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
  category?: string;
  type?: string;
}

export type EventFormData = Omit<Event, 'id' | 'created_at' | 'created_by'>;

// types/api.ts - API 응답 타입
export interface ApiResponse<T> {
  data?: T;
  error?: Error | null;
}
```

---

## 5. Firebase/Firestore 베스트 프랙티스 (⭐ 핵심)

### 🔴 N+1 쿼리 절대 금지

```typescript
// ❌ Bad - N+1 쿼리 (시한폭탄!)
// 50개 이벤트 × 각각 메시지 조회 = 50번 DB 호출 💀
for (const eventDoc of eventsSnap.docs) {
  const messagesQ = query(
    collection(db, "thread_messages"),
    where("event_id", "==", eventDoc.id)
  );
  const messagesSnap = await getDocs(messagesQ);  // 매번 호출!
}

// ✅ Good - 한 번에 가져와서 JS로 그룹화
const allMessagesSnap = await getDocs(
  query(collection(db, "thread_messages"))
);
const messagesByEvent = new Map<string, Message[]>();
allMessagesSnap.docs.forEach(doc => {
  const data = doc.data();
  const eventId = data.event_id;
  if (!messagesByEvent.has(eventId)) {
    messagesByEvent.set(eventId, []);
  }
  messagesByEvent.get(eventId)!.push({ id: doc.id, ...data });
});

// ✅ Better - 필요한 이벤트의 메시지만
const eventIds = eventsSnap.docs.map(d => d.id);
const messagesSnap = await getDocs(
  query(
    collection(db, "thread_messages"),
    where("event_id", "in", eventIds.slice(0, 10))  // in은 최대 10개
  )
);
```

### 🔴 동시 수정은 반드시 Transaction

```typescript
// ❌ Bad - Race Condition 위험
const addReservation = async (reservation) => {
  // 클라이언트 캐시로 체크 후
  const conflicting = reservations.find(...);
  if (conflicting) return { error: new Error("CONFLICT") };
  
  // 별도로 저장 → 두 사람이 동시에 하면 둘 다 성공!
  await addDoc(collection(db, "reservations"), reservation);
}

// ✅ Good - Transaction으로 원자적 처리
import { runTransaction } from "firebase/firestore";

const addReservation = async (reservation) => {
  return runTransaction(db, async (transaction) => {
    // 1. 충돌 체크 (트랜잭션 내에서)
    const conflictQuery = query(
      collection(db, "reservations"),
      where("resource_id", "==", reservation.resource_id),
      where("start_time", "<", reservation.end_time),
      where("end_time", ">", reservation.start_time)
    );
    const conflicts = await getDocs(conflictQuery);
    
    if (!conflicts.empty) {
      throw new Error("CONFLICT");
    }
    
    // 2. 저장 (같은 트랜잭션에서)
    const docRef = doc(collection(db, "reservations"));
    transaction.set(docRef, reservation);
    return docRef.id;
  });
}
```

### 🔴 전체 컬렉션 구독 금지

```typescript
// ❌ Bad - 모든 메시지 변경에 반응
onSnapshot(collection(db, "thread_messages"), () => {
  fetchNotifications();  // 아무나 메시지 쓰면 전체 재조회
});

// ✅ Good - 필터링된 쿼리로 구독
onSnapshot(
  query(
    collection(db, "thread_messages"),
    where("event_id", "in", myEventIds),
    orderBy("created_at", "desc"),
    limit(50)
  ),
  (snapshot) => {
    setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  }
);
```

### 🟡 Listener 중복 방지

```typescript
// ❌ Bad - 같은 데이터를 여러 컴포넌트가 각자 구독
// Dashboard.tsx에서 useEvents() → onSnapshot
// Sidebar.tsx에서 useEvents() → 또 onSnapshot
// Calendar.tsx에서 useEvents() → 또 onSnapshot

// ✅ Good - 전역 상태로 중앙화 (Zustand 예시)
// stores/eventsStore.ts
import { create } from 'zustand';

interface EventsStore {
  events: Event[];
  loading: boolean;
  subscribe: () => () => void;
}

export const useEventsStore = create<EventsStore>((set) => ({
  events: [],
  loading: true,
  subscribe: () => {
    const unsubscribe = onSnapshot(
      query(collection(db, "events"), orderBy("start_date", "asc")),
      (snapshot) => {
        set({ 
          events: snapshot.docs.map(d => ({ id: d.id, ...d.data() })),
          loading: false 
        });
      }
    );
    return unsubscribe;
  }
}));

// App.tsx에서 한 번만 구독
useEffect(() => {
  const unsubscribe = useEventsStore.getState().subscribe();
  return unsubscribe;
}, []);
```

---

## 6. 보안 베스트 프랙티스 (⭐ 필수)

### 🔴 API 키 절대로 코드에 노출 금지

```typescript
// ❌ Bad - 코드에 직접 키 작성
const OPENAI_KEY = "sk-proj-abc123...";
const firebaseConfig = {
  apiKey: "AIzaSy...",  // 이것도 안됨!
};

// ✅ Good - 환경 변수 사용
// Frontend (.env.local)
VITE_FIREBASE_API_KEY=AIzaSy...

// Backend (functions/.env)
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIzaSy...
```

### 🔴 .gitignore 필수 항목

```gitignore
# 반드시 포함!
.env
.env.local
.env.*.local
functions/.env
functions/.env.local

# Firebase
.firebase/
firebase-debug.log
```

### 🔴 Firestore Rules - 소유자 체크 필수

```javascript
// ❌ Bad - 로그인만 하면 누구나 수정 가능
match /events/{eventId} {
  allow update: if isAuthenticated();
}

// ✅ Good - 본인 또는 관리자만 수정 가능
match /events/{eventId} {
  allow update: if isAuthenticated() && 
    (resource.data.created_by == request.auth.uid || isAdmin());
  allow delete: if isAuthenticated() && 
    (resource.data.created_by == request.auth.uid || isAdmin());
}
```

### Custom Claims 설정

```typescript
// Cloud Function에서 역할 설정
import { getAuth } from 'firebase-admin/auth';

export const setUserRole = onCall(async (request) => {
  // 관리자 검증 후
  await getAuth().setCustomUserClaims(request.data.uid, { 
    role: request.data.role 
  });
});
```

---

## 7. 컴포넌트 크기 제한 (⭐ 필수)

### 파일 크기 제한

| 파일 유형 | 최대 줄 수 | 초과 시 조치 |
|----------|-----------|-------------|
| 페이지 컴포넌트 | 150줄 | 하위 컴포넌트로 분리 |
| 일반 컴포넌트 | 200줄 | 작은 컴포넌트로 분리 |
| 커스텀 훅 | 100줄 | 여러 훅으로 분리 |
| 유틸리티 함수 | 50줄 | 함수 분리 |

```typescript
// ❌ Bad - 850줄짜리 페이지 컴포넌트
// DepartmentCalendarPage.tsx (850 lines)
function DepartmentCalendarPage() {
  // 상태 20개
  // 핸들러 15개
  // 렌더링 500줄
}

// ✅ Good - 분리된 구조
// DepartmentCalendarPage.tsx (80 lines)
function DepartmentCalendarPage() {
  return (
    <CalendarProvider>
      <CalendarHeader />
      <CalendarView />
      <EventDialog />
    </CalendarProvider>
  );
}

// components/calendar/CalendarView.tsx (150 lines)
// components/calendar/EventDialog.tsx (100 lines)
// hooks/useCalendarState.ts (80 lines)
```

---

## 8. 에러 처리 패턴

### 표준 에러 처리 유틸리티

```typescript
// lib/errorHandler.ts
import { FirebaseError } from 'firebase/app';

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  'permission-denied': '권한이 없습니다.',
  'not-found': '데이터를 찾을 수 없습니다.',
  'already-exists': '이미 존재하는 데이터입니다.',
  'resource-exhausted': '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  'unauthenticated': '로그인이 필요합니다.',
  'invalid-argument': '잘못된 입력입니다.',
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return FIREBASE_ERROR_MESSAGES[error.code] || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '알 수 없는 오류가 발생했습니다.';
}

// 사용
} catch (error) {
  toast.error(getErrorMessage(error));
  console.error('Operation failed:', error);  // 개발자용 로그
}
```

### API 응답 타입 통일

```typescript
// types/api.ts
export interface ApiResult<T> {
  data?: T;
  error: Error | null;
}

// 훅에서 사용
const addEvent = async (event: EventFormData): Promise<ApiResult<Event>> => {
  try {
    const docRef = await addDoc(collection(db, "events"), event);
    return { data: { id: docRef.id, ...event }, error: null };
  } catch (error) {
    return { error: error as Error };
  }
};
```

---

## 9. Cloud Functions 베스트 프랙티스

### 파일 분리

```
functions/src/
├── index.ts          # export만 (5줄)
├── ai/
│   └── parseSchedule.ts
├── auth/
│   └── naverLogin.ts
├── storage/
│   └── r2Upload.ts
└── utils/
    └── errorHandler.ts
```

```typescript
// functions/src/index.ts
export { parseScheduleWithAI } from './ai/parseSchedule';
export { getNaverCustomToken } from './auth/naverLogin';
export { getR2UploadUrl, confirmR2Upload } from './storage/r2Upload';
```

### Rate Limiting

```typescript
// 간단한 rate limiting
const RATE_LIMIT = 10; // 분당 10회
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export const parseScheduleWithAI = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');

  // Rate limit 체크
  const now = Date.now();
  const userLimit = rateLimitMap.get(uid);
  
  if (userLimit && userLimit.resetAt > now) {
    if (userLimit.count >= RATE_LIMIT) {
      throw new HttpsError('resource-exhausted', '요청 한도 초과. 1분 후 다시 시도해주세요.');
    }
    userLimit.count++;
  } else {
    rateLimitMap.set(uid, { count: 1, resetAt: now + 60000 });
  }

  // 실제 로직...
});
```

---

## 10. React 베스트 프랙티스

### 커스텀 훅 구조

```typescript
// hooks/useEvents.ts
import { useState, useEffect, useCallback } from 'react';
import { eventsApi } from '@/services/api/eventsApi';
import type { Event, EventFormData, ApiResult } from '@/types';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = eventsApi.subscribe((newEvents) => {
      setEvents(newEvents);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const addEvent = useCallback(async (data: EventFormData): Promise<ApiResult<Event>> => {
    return eventsApi.create(data);
  }, []);

  return { events, loading, error, addEvent };
}
```

### 메모이제이션 규칙

```typescript
// ✅ 사용해야 할 때
// 1. 비용이 큰 계산
const sortedEvents = useMemo(() => 
  events.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()),
  [events]
);

// 2. 자식 컴포넌트에 전달하는 객체/함수
const handleClick = useCallback(() => {
  // ...
}, [dependency]);

// ❌ 사용하지 말아야 할 때
// 단순 값 (오버헤드만 증가)
const name = useMemo(() => user.name, [user.name]);  // 불필요
```

---

## 11. Tailwind CSS 베스트 프랙티스

### 클래스 정렬 순서

```typescript
// 레이아웃 → 크기 → 여백 → 배경 → 테두리 → 텍스트 → 효과
<div className="flex items-center justify-between w-full h-12 p-4 bg-background border border-border rounded-lg text-sm text-foreground shadow-md hover:bg-muted transition-colors">
```

### cn() 유틸리티 활용

```typescript
<div className={cn(
  "base-styles",
  isActive && "active-styles",
  variant === "danger" && "danger-styles"
)}>
```

---

## 📋 코드 리뷰 체크리스트 (⭐ 필수 확인)

### 기본
- [ ] TypeScript 에러가 없는가?
- [ ] ESLint 경고가 없는가?
- [ ] 불필요한 console.log가 없는가?
- [ ] **any 타입이 없는가?**

### 구조
- [ ] **컴포넌트가 200줄 이하인가?**
- [ ] **페이지가 150줄 이하인가?**
- [ ] 중첩이 3단계 이하인가?
- [ ] 파일이 적절한 위치에 있는가?

### Firestore (⭐ 중요)
- [ ] **for문 안에서 getDocs 호출이 없는가?** (N+1 방지)
- [ ] **전체 컬렉션 구독이 없는가?** (필터 필수)
- [ ] **동시 수정 가능한 곳에 Transaction을 썼는가?**
- [ ] limit()을 사용했는가?

### 보안
- [ ] **API 키가 코드에 없는가?**
- [ ] **.env 파일이 .gitignore에 있는가?**
- [ ] Firestore Rules에 소유자 체크가 있는가?
- [ ] 사용자 입력이 검증되는가?

### 에러 처리
- [ ] API 호출에 try-catch가 있는가?
- [ ] 에러 메시지가 사용자 친화적인가?
- [ ] 로딩 상태가 표시되는가?

### 성능
- [ ] 불필요한 리렌더링이 없는가?
- [ ] 무거운 컴포넌트는 lazy import를 썼는가?
- [ ] 같은 데이터를 중복 구독하지 않는가?

---

## 🚨 절대 하지 말 것 (Red Flags)

```typescript
// ❌ 절대 금지 목록

// 1. any 타입
const data: any = await fetch(...);

// 2. 코드에 API 키 하드코딩
const API_KEY = "sk-proj-...";

// 3. for문 안에서 DB 호출 (N+1)
for (const item of items) {
  await getDocs(query(...));  // 💀
}

// 4. 전체 컬렉션 구독
onSnapshot(collection(db, "messages"), callback);  // 💀

// 5. Transaction 없는 동시 수정
if (!exists) await addDoc(...);  // Race condition 💀

// 6. useEffect에서 직접 async
useEffect(async () => {  // ❌
  await fetchData();
}, []);

// 7. 거대한 컴포넌트 (200줄+)
function MegaComponent() {
  // 800줄의 코드...  💀
}

// 8. 배열 인덱스를 key로
{items.map((item, index) => <Item key={index} />)}

// 9. dangerouslySetInnerHTML with user input
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// 10. 민감 정보 로깅
console.log("API Key:", apiKey);  // 💀
```

---

## 🔧 문제 발생 시 디버깅 체크리스트

### Firestore 비용이 급증할 때
1. N+1 쿼리가 있는지 확인 (for문 안에 getDocs)
2. 전체 컬렉션 구독이 있는지 확인
3. limit() 없이 큰 컬렉션 조회하는지 확인
4. 동일 데이터 중복 구독하는지 확인

### 동시 접속 시 데이터 이상할 때
1. Transaction 사용 여부 확인
2. 클라이언트 캐시로 체크 후 저장하는 패턴 있는지 확인

### 새 개발자가 코드 이해 못할 때
1. 200줄 넘는 파일 분리
2. any 타입 제거
3. 주석으로 "왜" 설명 추가

---

> **이 가이드라인을 따라 깔끔하고, 안전하고, 확장 가능한 코드를 작성하세요.**
> **특히 Firestore 관련 규칙은 비용과 직결되므로 반드시 준수하세요!**

