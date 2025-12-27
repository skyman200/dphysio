import { useState, useEffect } from 'react';
import { collection, query, orderBy, deleteDoc, doc, getDocs, startAfter, limit } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { parseISO } from 'date-fns';
import { toast } from 'sonner';

export interface FileResource {
    id: string;
    title: string;
    description: string;
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    category: string;
    uploadedBy: string;
    uploaderName: string;
    createdAt: any; // Firestore Timestamp
    fileKey?: string;
}

import { useActivityLogger } from "./useActivityLogger";

export function useFileResources() {
    const [resources, setResources] = useState<FileResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const ITEMS_PER_PAGE = 15;

    const { logFileUpload, logActivity } = useActivityLogger();

    const fetchResources = async (isLoadMore = false) => {
        try {
            setLoading(true);
            let q;

            if (isLoadMore && lastDoc) {
                q = query(
                    collection(db, 'materials'),
                    orderBy('createdAt', 'desc'),
                    startAfter(lastDoc),
                    limit(ITEMS_PER_PAGE)
                );
            } else {
                q = query(
                    collection(db, 'materials'),
                    orderBy('createdAt', 'desc'),
                    limit(ITEMS_PER_PAGE)
                );
            }

            const snapshot = await getDocs(q);

            const docs = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...(docSnap.data() as Omit<FileResource, 'id'>)
            })) as FileResource[];

            if (isLoadMore) {
                setResources(prev => [...prev, ...docs]);
            } else {
                setResources(docs);
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);
        } catch (error: any) {
            console.error("[FileResources] Error fetching resources:", error);
            toast.error(`자료 로드 오류: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResources();
    }, []);

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchResources(true);
        }
    };

    const refresh = () => {
        setLastDoc(null);
        setHasMore(true);
        fetchResources(false);
    };

    const uploadFile = async (file: File, metadata: { title: string; description: string; category: string }) => {
        try {
            // 1. Get Presigned URL
            const getUploadUrl = httpsCallable(functions, 'getR2UploadUrl');
            const { data: uploadData } = await getUploadUrl({
                fileName: file.name,
                contentType: file.type,
                category: metadata.category
            }) as { data: { uploadUrl: string; fileKey: string; publicUrl: string } };

            // 2. Upload to R2
            const uploadResponse = await fetch(uploadData.uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type
                }
            });

            if (!uploadResponse.ok) throw new Error('Failed to upload to R2');

            // 3. Confirm and Save Metadata
            const confirmUpload = httpsCallable(functions, 'confirmR2Upload');
            await confirmUpload({
                fileKey: uploadData.fileKey,
                publicUrl: uploadData.publicUrl,
                title: metadata.title,
                description: metadata.description,
                category: metadata.category,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type
            });

            logFileUpload(uploadData.fileKey, file.name, file.size);

            refresh(); // Refresh list after upload

            return { success: true, publicUrl: uploadData.publicUrl };
        } catch (error) {
            console.error("Upload error:", error);
            return { success: false, error: error as Error };
        }
    };

    const deleteFile = async (id: string, fileKey?: string) => {
        console.log('[FileResources] deleteFile called:', { id, fileKey });

        if (!fileKey) {
            // Legacy or no key, just delete doc
            console.log('[FileResources] No fileKey, deleting Firestore doc only');
            await deleteDoc(doc(db, 'materials', id));
            logActivity({ type: 'file_delete', targetId: id, metadata: { method: 'legacy' } });
            toast.success('파일이 삭제되었습니다.');
            refresh(); // Refresh list after delete
            return;
        }

        try {
            console.log('[FileResources] Calling deleteR2File Cloud Function');
            const deleteR2 = httpsCallable(functions, 'deleteR2File');
            const result = await deleteR2({ fileKey, materialId: id });
            console.log('[FileResources] deleteR2File result:', result);
            logActivity({ type: 'file_delete', targetId: id, metadata: { fileKey } });
            toast.success('파일이 R2 스토리지와 함께 삭제되었습니다.');
            refresh(); // Refresh list after delete
        } catch (error: any) {
            console.error("[FileResources] Delete error:", error);
            console.error("[FileResources] Error code:", error.code);
            console.error("[FileResources] Error message:", error.message);
            console.error("[FileResources] Error details:", error.details);

            // R2 삭제 실패해도 Firestore 문서는 삭제 시도
            try {
                console.log('[FileResources] R2 delete failed, trying to delete Firestore doc only');
                await deleteDoc(doc(db, 'materials', id));
                toast.warning('R2 스토리지 삭제 실패, 메타데이터만 삭제됨');
            } catch (firestoreError) {
                console.error('[FileResources] Firestore delete also failed:', firestoreError);
                throw error; // 원래 에러 throw
            }
        }
    };

    return {
        resources,
        loading,
        uploadFile,
        deleteFile,
        loadMore,
        hasMore,
        refresh
    };
}
