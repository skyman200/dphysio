import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp,
    increment,
} from 'firebase/firestore';
import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
} from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { uploadToR2, deleteFromR2, shouldUseR2 } from './r2Service';

// ============================================
// 타입 정의
// ============================================

export interface Material {
    id: string;
    title: string;
    description?: string;
    fileUrl: string;
    fileName: string;
    fileType: 'pdf' | 'hwp' | 'other';
    fileSize: number;
    category: string;
    uploadedBy: string;
    uploaderName: string;
    createdAt: Timestamp;
    downloadCount: number;
    // R2 specific fields
    storageType?: 'firebase' | 'r2';
    fileKey?: string;
}

export interface UploadProgress {
    progress: number;
    status: 'uploading' | 'completed' | 'error';
    error?: string;
}

// ============================================
// 자료 서비스
// ============================================

// 모든 자료 가져오기
export async function getMaterials(categoryFilter?: string): Promise<Material[]> {
    try {
        let q = query(
            collection(db, 'materials'),
            orderBy('createdAt', 'desc')
        );

        if (categoryFilter) {
            q = query(
                collection(db, 'materials'),
                where('category', '==', categoryFilter),
                orderBy('createdAt', 'desc')
            );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Material[];
    } catch (error) {
        console.error('자료 목록 가져오기 실패:', error);
        throw error;
    }
}

// 단일 자료 가져오기
export async function getMaterial(id: string): Promise<Material | null> {
    try {
        const docRef = doc(db, 'materials', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Material;
        }
        return null;
    } catch (error) {
        console.error('자료 가져오기 실패:', error);
        throw error;
    }
}

// 파일 업로드 (자동으로 R2 또는 Firebase Storage 선택)
export async function uploadMaterial(
    file: File,
    metadata: {
        title: string;
        description?: string;
        category: string;
        uploadedBy: string;
        uploaderName: string;
    },
    onProgress?: (progress: UploadProgress) => void
): Promise<Material> {
    try {
        // 100MB 이상의 파일은 R2로 업로드
        if (shouldUseR2(file.size)) {
            return await uploadMaterialToR2(file, metadata, onProgress);
        }

        // 100MB 미만의 파일은 Firebase Storage로 업로드
        return await uploadMaterialToFirebase(file, metadata, onProgress);
    } catch (error) {
        console.error('파일 업로드 실패:', error);
        throw error;
    }
}

// R2로 업로드 (대용량 파일)
async function uploadMaterialToR2(
    file: File,
    metadata: {
        title: string;
        description?: string;
        category: string;
        uploadedBy: string;
        uploaderName: string;
    },
    onProgress?: (progress: UploadProgress) => void
): Promise<Material> {
    const result = await uploadToR2(file, {
        title: metadata.title,
        description: metadata.description,
        category: metadata.category,
    }, (r2Progress) => {
        // R2 진행률을 UploadProgress로 변환
        onProgress?.({
            progress: r2Progress.progress,
            status: r2Progress.status === 'completed' ? 'completed'
                : r2Progress.status === 'error' ? 'error'
                    : 'uploading',
            error: r2Progress.error,
        });
    });

    const newMaterial = await getMaterial(result.materialId);
    return newMaterial!;
}

// Firebase Storage로 업로드 (일반 파일)
async function uploadMaterialToFirebase(
    file: File,
    metadata: {
        title: string;
        description?: string;
        category: string;
        uploadedBy: string;
        uploaderName: string;
    },
    onProgress?: (progress: UploadProgress) => void
): Promise<Material> {
    // 파일 형식 결정
    const fileType = getFileType(file.name);

    // Storage에 업로드
    const storageRef = ref(storage, `materials/${metadata.category}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    // 업로드 진행률 추적
    return new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress?.({ progress, status: 'uploading' });
            },
            (error) => {
                onProgress?.({ progress: 0, status: 'error', error: error.message });
                reject(error);
            },
            async () => {
                try {
                    // 다운로드 URL 가져오기
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                    // Firestore에 메타데이터 저장
                    const docRef = await addDoc(collection(db, 'materials'), {
                        title: metadata.title,
                        description: metadata.description || '',
                        fileUrl: downloadURL,
                        fileName: file.name,
                        fileType,
                        fileSize: file.size,
                        category: metadata.category,
                        uploadedBy: metadata.uploadedBy,
                        uploaderName: metadata.uploaderName,
                        storageType: 'firebase',
                        createdAt: serverTimestamp(),
                        downloadCount: 0,
                    });

                    onProgress?.({ progress: 100, status: 'completed' });

                    const newMaterial = await getMaterial(docRef.id);
                    resolve(newMaterial!);
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
}

// 자료 삭제 (R2 및 Firebase Storage 모두 지원)
export async function deleteMaterial(material: Material): Promise<void> {
    try {
        // R2에 저장된 파일인 경우
        if (material.storageType === 'r2' && material.fileKey) {
            await deleteFromR2(material.fileKey, material.id);
        } else {
            // Firebase Storage에서 파일 삭제
            const storageRef = ref(storage, material.fileUrl);
            await deleteObject(storageRef);
            // Firestore에서 문서 삭제
            await deleteDoc(doc(db, 'materials', material.id));
        }
    } catch (error) {
        console.error('자료 삭제 실패:', error);
        throw error;
    }
}

// 다운로드 카운트 증가
export async function incrementDownloadCount(id: string): Promise<void> {
    try {
        const docRef = doc(db, 'materials', id);
        await updateDoc(docRef, {
            downloadCount: increment(1),
        });
    } catch (error) {
        console.error('다운로드 카운트 업데이트 실패:', error);
    }
}

// 다운로드 로그 기록
export async function logDownload(
    materialId: string,
    userId: string,
    materialTitle: string
): Promise<void> {
    try {
        await addDoc(collection(db, 'downloadLogs'), {
            materialId,
            userId,
            materialTitle,
            downloadedAt: serverTimestamp(),
        });

        // 다운로드 카운트도 증가
        await incrementDownloadCount(materialId);
    } catch (error) {
        console.error('다운로드 로그 기록 실패:', error);
    }
}

// ============================================
// 카테고리 서비스
// ============================================

export async function getCategories(): Promise<string[]> {
    try {
        const snapshot = await getDocs(collection(db, 'categories'));
        return snapshot.docs.map(doc => doc.data().name as string);
    } catch (error) {
        console.error('카테고리 가져오기 실패:', error);
        // 기본 카테고리 반환
        return ['해부학', '생리학', '운동치료', '물리치료', '기타'];
    }
}

// ============================================
// 헬퍼 함수
// ============================================

function getFileType(fileName: string): 'pdf' | 'hwp' | 'other' {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return 'pdf';
    if (extension === 'hwp' || extension === 'hwpx') return 'hwp';
    return 'other';
}

// 파일 크기 포맷팅
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
