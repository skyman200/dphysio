import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { User, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfileSetupPage() {
    const { user, profile, isProfileComplete, refreshProfile, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                navigate("/auth");
            } else if (isProfileComplete) {
                navigate("/");
            }
        }
    }, [user, isProfileComplete, authLoading, navigate]);

    useEffect(() => {
        if (profile) {
            setName(profile.name || "");
            setRole(profile.role || "");
        }
    }, [profile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !name || !role) return;

        setLoading(true);
        try {
            // setDoc with merge: true - 문서가 없으면 생성, 있으면 업데이트
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                name,
                role,
                profileCompleted: true,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            await refreshProfile();
            setIsSuccess(true);

            setTimeout(() => {
                navigate("/");
            }, 1500);
        } catch (error) {
            console.error("Profile setup error:", error);
            toast.error("프로필 저장 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-gray-100"
            >
                <AnimatePresence mode="wait">
                    {!isSuccess ? (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 bg-professor-gold/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                    <User className="text-professor-gold w-10 h-10" />
                                </div>
                                <h1 className="text-2xl font-black text-gray-900">프로필 완성하기</h1>
                                <p className="text-gray-500 mt-2 font-medium">본인의 이름과 역할을 정확하게 입력해주세요. 🫡</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-sm font-black text-gray-700 ml-1">성함</Label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="예: 홍길동"
                                            className="h-14 pl-12 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white transition-all text-lg font-bold"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-black text-gray-700 ml-1">나의 역할</Label>
                                    <Select value={role} onValueChange={setRole} required>
                                        <SelectTrigger className="h-14 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white transition-all text-lg font-bold px-4">
                                            <SelectValue placeholder="역할을 선택하세요" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-gray-100 shadow-xl overflow-hidden p-1">
                                            <SelectItem value="학과장" className="rounded-xl h-12 font-bold cursor-pointer hover:bg-professor-gold/10 focus:bg-professor-gold/10">학과장 🫡 (관리자 권한)</SelectItem>
                                            <SelectItem value="교수" className="rounded-xl h-12 font-bold cursor-pointer hover:bg-professor-gold/10 focus:bg-professor-gold/10">교수 🧑‍🏫</SelectItem>
                                            <SelectItem value="외래교수" className="rounded-xl h-12 font-bold cursor-pointer hover:bg-professor-gold/10 focus:bg-professor-gold/10">외래교수 🏫</SelectItem>
                                            <SelectItem value="조교" className="rounded-xl h-12 font-bold cursor-pointer hover:bg-professor-gold/10 focus:bg-professor-gold/10">조교 📋</SelectItem>
                                            <SelectItem value="학생" className="rounded-xl h-12 font-bold cursor-pointer hover:bg-professor-gold/10 focus:bg-professor-gold/10">학생 🎓</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading || !name || !role}
                                    className="w-full h-14 rounded-2xl bg-professor-gold hover:bg-amber-600 text-white text-lg font-black shadow-lg shadow-professor-gold/20 gap-2 transition-all mt-4"
                                >
                                    {loading ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            시작하기
                                            <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-12"
                        >
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="text-green-500 w-12 h-12" />
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 mb-2">환영합니다!</h2>
                            <p className="text-gray-500 font-medium">프로필이 완성되었습니다.<br />대시보드로 이동합니다.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
