import { useEffect, useState } from "react";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  office: string | null;
  avatar_url: string | null;
  color: string | null;
}

/**
 * 프로필 관리 훅
 * 
 * 🔧 개선사항:
 * - getDocs 대신 onSnapshot 사용하여 실시간 갱신
 * - 새 사용자 가입 시 자동으로 목록에 반영
 * - 에러 시 사용자 알림 추가
 */
export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 🔧 onSnapshot으로 실시간 구독 (이전: getDocs 한 번만 조회)
    const usersRef = collection(db, "users");
    const unsubscribe = onSnapshot(
      usersRef,
      (snapshot) => {
        const profilesData: Profile[] = snapshot.docs.map((d) => ({
          id: d.id,
          user_id: d.id,
          name: d.data().name || d.data().email?.split("@")[0] || "Unknown",
          role: d.data().role || null,
          position: null,
          email: d.data().email || null,
          phone: null,
          office: null,
          avatar_url: null,
          color: null,
        }));
        setProfiles(profilesData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching profiles:", error);
        toast.error("프로필 목록을 불러오는데 실패했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      await updateDoc(doc(db, "users", user.uid), updates);
      // 🔧 실시간 구독으로 자동 갱신되므로 수동 상태 업데이트 불필요
      return { error: null };
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("프로필 업데이트에 실패했습니다.");
      return { error: error as Error };
    }
  };

  const currentProfile = profiles.find((p) => p.user_id === user?.uid);

  return { profiles, loading, updateProfile, currentProfile };
}