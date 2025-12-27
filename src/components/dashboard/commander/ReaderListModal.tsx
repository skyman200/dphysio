import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Profile } from "@/types/user";
import { Users, Loader2, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReaderListModalProps {
    isOpen: boolean;
    onClose: () => void;
    readByUids: string[];
    totalExpected?: number;
}

export function ReaderListModal({ isOpen, onClose, readByUids, totalExpected = 4 }: ReaderListModalProps) {
    const [readers, setReaders] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchReaders = async () => {
            if (!isOpen || readByUids.length === 0) {
                setReaders([]);
                return;
            }

            setLoading(true);
            try {
                const usersRef = collection(db, "users");
                // Note: 'in' query supports up to 30 IDs. 
                // For a department scale, this is usually sufficient.
                const q = query(usersRef, where("__name__", "in", readByUids.slice(0, 30)));
                const querySnapshot = await getDocs(q);
                const readerProfiles = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Profile[];
                setReaders(readerProfiles);
            } catch (error) {
                console.error("Error fetching readers:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReaders();
    }, [isOpen, readByUids]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none bg-white shadow-2xl">
                <DialogHeader className="p-6 bg-gray-50/50 border-b border-gray-100">
                    <DialogTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <Users className="text-professor-gold" />
                        수신 확인 현황
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
                            <Loader2 className="animate-spin w-8 h-8" />
                            <p className="font-bold text-sm tracking-tight text-gray-400">명단 불러오는 중...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4 bg-professor-gold/5 p-4 rounded-2xl">
                                <div>
                                    <p className="text-xs font-black text-professor-gold uppercase tracking-wider">전체 확인 현황</p>
                                    <p className="text-2xl font-black text-gray-900">
                                        {readByUids.length} <span className="text-sm text-gray-400 font-bold">/ {totalExpected} 명</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider">확인율</p>
                                    <p className="text-xl font-black text-gray-900">
                                        {Math.round((readByUids.length / totalExpected) * 100)}%
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-black text-gray-500 ml-1 mb-2">확인한 명단</p>
                                {readers.length === 0 ? (
                                    <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        <p className="text-sm font-bold text-gray-300">아직 확인한 사람이 없습니다.</p>
                                    </div>
                                ) : (
                                    readers.map((reader) => (
                                        <div
                                            key={reader.id}
                                            className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                                                    <CheckCircle2 size={20} className="text-green-500" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 leading-tight">{reader.name}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">{reader.role}</p>
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                READ
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
