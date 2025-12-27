/**
 * R2 Upload Service
 * 
 * Handles large file uploads to Cloudflare R2 via Firebase Cloud Functions
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/lib/firebase';

// Types
export interface R2UploadUrlResponse {
    uploadUrl: string;
    fileKey: string;
    publicUrl: string;
}

export interface R2UploadProgress {
    progress: number;
    status: 'preparing' | 'uploading' | 'confirming' | 'completed' | 'error';
    error?: string;
}

export interface R2UploadMetadata {
    title: string;
    description?: string;
    category: string;
    fileName: string;
    fileSize: number;
    fileType: 'pdf' | 'hwp' | 'other';
}

// Initialize Functions
const functions = getFunctions(app, 'asia-northeast3'); // Seoul region

// Cloud Function references
const getR2UploadUrlFn = httpsCallable<
    { fileName: string; contentType: string; category: string },
    R2UploadUrlResponse
>(functions, 'getR2UploadUrl');

const confirmR2UploadFn = httpsCallable<
    R2UploadMetadata & { fileKey: string; publicUrl: string },
    { success: boolean; materialId: string }
>(functions, 'confirmR2Upload');

const deleteR2FileFn = httpsCallable<
    { fileKey: string; materialId: string },
    { success: boolean }
>(functions, 'deleteR2File');

/**
 * Upload a file to R2 storage
 */
export async function uploadToR2(
    file: File,
    metadata: Omit<R2UploadMetadata, 'fileName' | 'fileSize' | 'fileType'>,
    onProgress?: (progress: R2UploadProgress) => void
): Promise<{ materialId: string; publicUrl: string }> {
    try {
        // Step 1: Get presigned URL
        onProgress?.({ progress: 0, status: 'preparing' });

        const fileType = getFileType(file.name);
        const { data: urlData } = await getR2UploadUrlFn({
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
            category: metadata.category,
        });

        // Step 2: Upload directly to R2
        onProgress?.({ progress: 10, status: 'uploading' });

        await uploadFileToR2(
            urlData.uploadUrl,
            file,
            (progress) => {
                // Scale progress between 10-90%
                const scaledProgress = 10 + (progress * 0.8);
                onProgress?.({ progress: scaledProgress, status: 'uploading' });
            }
        );

        // Step 3: Confirm upload and save metadata
        onProgress?.({ progress: 90, status: 'confirming' });

        const { data: confirmData } = await confirmR2UploadFn({
            fileKey: urlData.fileKey,
            publicUrl: urlData.publicUrl,
            title: metadata.title,
            description: metadata.description,
            category: metadata.category,
            fileName: file.name,
            fileSize: file.size,
            fileType,
        });

        onProgress?.({ progress: 100, status: 'completed' });

        return {
            materialId: confirmData.materialId,
            publicUrl: urlData.publicUrl,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        onProgress?.({ progress: 0, status: 'error', error: errorMessage });
        throw error;
    }
}

/**
 * Delete a file from R2 storage
 */
export async function deleteFromR2(fileKey: string, materialId: string): Promise<void> {
    await deleteR2FileFn({ fileKey, materialId });
}

/**
 * Direct upload to R2 using presigned URL with progress tracking
 */
async function uploadFileToR2(
    presignedUrl: string,
    file: File,
    onProgress?: (progress: number) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const progress = (event.loaded / event.total) * 100;
                onProgress?.(progress);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
        });

        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
    });
}

/**
 * Determine file type from extension
 */
function getFileType(fileName: string): 'pdf' | 'hwp' | 'other' {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return 'pdf';
    if (extension === 'hwp' || extension === 'hwpx') return 'hwp';
    return 'other';
}

/**
 * Check if a file should use R2 (for large files)
 * Files over 100MB use R2, smaller files use Firebase Storage
 */
export function shouldUseR2(fileSize: number): boolean {
    const R2_THRESHOLD = 100 * 1024 * 1024; // 100MB
    return fileSize >= R2_THRESHOLD;
}
