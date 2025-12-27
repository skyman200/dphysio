import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "@/lib/firebase";

import { Profile } from "@/types/user";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isProfileComplete: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithNaver: () => Promise<{ error: Error | null }>;
  deleteUserAccount: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Firestore에 소셜 로그인 사용자 저장 (회원가입 겸용)
const saveUserToFirestore = async (user: User) => {
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists()) {
    // 첫 로그인 = 자동 회원가입 (프로필 완성 필요)
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      name: user.displayName || "",
      role: null,  // 프로필 설정에서 선택
      profileCompleted: false,
      createdAt: serverTimestamp(),
    });
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const isProfileComplete = !!(profile?.profileCompleted);

  const fetchProfile = async (uid: string) => {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      setProfile({ id: userDoc.id, user_id: uid, ...userDoc.data() } as Profile);
    } else {
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  useEffect(() => {
    const handleCustomAuthRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      if (code && window.location.pathname === '/auth') {
        setLoading(true);
        try {
          const getNaverToken = httpsCallable(functions, 'getNaverCustomToken');
          const result = await getNaverToken({ code, state });
          const { customToken } = result.data as any;

          if (customToken) {
            const userCredential = await signInWithCustomToken(auth, customToken);
            if (userCredential.user) {
              await saveUserToFirestore(userCredential.user);
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        } catch (error) {
          console.error("Naver custom auth error:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    handleCustomAuthRedirect();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 이메일/비밀번호 로그인
  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // 회원가입
  const signUp = async (email: string, password: string) => {
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);

      // Firestore에 기본 사용자 정보 저장 (이름/역할은 프로필 설정 페이지에서 설정)
      await setDoc(doc(db, "users", newUser.uid), {
        email,
        name: null,
        role: null,
        profileCompleted: false,
        createdAt: serverTimestamp(),
      });

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // 로그아웃
  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  // Google 로그인/회원가입 (Popup 방식)
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        await saveUserToFirestore(result.user);
      }
      return { error: null };
    } catch (error: any) {
      console.error("Google sign in error:", error);
      console.error("Error Code:", error.code);
      if (error.code === 'auth/operation-not-allowed') {
        console.error("DEBUG: Google provider might not be enabled in Firebase Console.");
      }
      return { error: error as Error };
    }
  };

  // Naver 로그인/회원가입 (Custom Auth Flow)
  const signInWithNaver = async () => {
    try {
      const clientId = import.meta.env.VITE_NAVER_CLIENT_ID;
      const redirectUri = encodeURIComponent(window.location.origin + '/auth');
      const state = Math.random().toString(36).substring(7);

      const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&state=${state}`;

      window.location.href = naverAuthUrl;
      return { error: null };
    } catch (error: any) {
      console.error("Naver sign in error (Custom):", error);
      return { error: error as Error };
    }
  };

  // 회원 탈퇴
  const deleteUserAccount = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("No user logged in");

      // 1. Firestore 프로필 삭제
      await deleteDoc(doc(db, "users", currentUser.uid));

      // 2. Firebase Auth 계정 삭제
      await currentUser.delete();

      return { error: null };
    } catch (error: any) {
      console.error("Account withdrawal error:", error);
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isProfileComplete,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        signInWithNaver,
        deleteUserAccount,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}