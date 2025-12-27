import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import {
    User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// 사용자 역할 타입
export type UserRole = 'student' | 'professor' | 'admin';

// 확장된 사용자 타입
export interface AppUser extends User {
    role?: UserRole;
    name?: string;
}

// 인증 컨텍스트 타입
interface AuthContextType {
    user: AppUser | null;
    loading: boolean;
    error: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    isAdmin: boolean;
    isProfessorOrAdmin: boolean;
}

// Context 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider 컴포넌트
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 사용자 역할 정보 가져오기
    const fetchUserRole = async (firebaseUser: User): Promise<AppUser> => {
        try {
            // Custom Claims에서 역할 가져오기
            const tokenResult = await firebaseUser.getIdTokenResult();
            const role = tokenResult.claims.role as UserRole | undefined;

            // Firestore에서 추가 정보 가져오기
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            const userData = userDoc.data();

            return {
                ...firebaseUser,
                role: role || userData?.role || 'student',
                name: userData?.name || firebaseUser.displayName || undefined,
            };
        } catch (err) {
            console.error('역할 정보 가져오기 실패:', err);
            return { ...firebaseUser, role: 'student' };
        }
    };

    // 인증 상태 감시
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const appUser = await fetchUserRole(firebaseUser);
                setUser(appUser);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // 이메일/비밀번호 로그인
    const signIn = async (email: string, password: string) => {
        try {
            setError(null);
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        }
    };

    // 회원가입
    const signUp = async (email: string, password: string, name: string) => {
        try {
            setError(null);
            const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);

            // Firestore에 사용자 정보 저장
            await setDoc(doc(db, 'users', newUser.uid), {
                email,
                name,
                role: 'student', // 기본 역할
                createdAt: serverTimestamp(),
            });
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        }
    };

    // Google 로그인
    const signInWithGoogle = async () => {
        try {
            setError(null);
            const provider = new GoogleAuthProvider();
            const { user: googleUser } = await signInWithPopup(auth, provider);

            // 첫 로그인인 경우 Firestore에 저장
            const userDoc = await getDoc(doc(db, 'users', googleUser.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(db, 'users', googleUser.uid), {
                    email: googleUser.email,
                    name: googleUser.displayName,
                    role: 'student',
                    createdAt: serverTimestamp(),
                });
            }
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        }
    };

    // 로그아웃
    const logout = async () => {
        try {
            setError(null);
            await signOut(auth);
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        }
    };

    // 비밀번호 재설정
    const resetPassword = async (email: string) => {
        try {
            setError(null);
            await sendPasswordResetEmail(auth, email);
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        }
    };

    // 권한 체크
    const isAdmin = user?.role === 'admin';
    const isProfessorOrAdmin = user?.role === 'admin' || user?.role === 'professor';

    const value = {
        user,
        loading,
        error,
        signIn,
        signUp,
        signInWithGoogle,
        logout,
        resetPassword,
        isAdmin,
        isProfessorOrAdmin,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 커스텀 훅
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth는 AuthProvider 내부에서 사용해야 합니다');
    }
    return context;
}

// 에러 메시지 변환
function getErrorMessage(code: string): string {
    const messages: Record<string, string> = {
        'auth/user-not-found': '등록되지 않은 이메일입니다.',
        'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
        'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
        'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
        'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
        'auth/too-many-requests': '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.',
        'auth/popup-closed-by-user': '로그인이 취소되었습니다.',
    };
    return messages[code] || '오류가 발생했습니다. 다시 시도해주세요.';
}
