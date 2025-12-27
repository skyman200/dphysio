import 'dotenv/config';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// ============================================
// CORS 및 보안 설정
// ============================================
// 허용된 도메인 목록 (프로덕션 + 개발 환경)
const ALLOWED_ORIGINS = [
    'https://physio-materials.web.app',
    'https://physio-materials.firebaseapp.com',
    'http://localhost:5173',  // Vite 개발 서버
    'http://localhost:3000',  // 대체 개발 서버
];

// 공통 Cloud Function 옵션
const FUNCTION_OPTIONS = {
    cors: ALLOWED_ORIGINS,
    maxInstances: 10,
};

// R2 Configuration (from environment variables)
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_ENDPOINT = process.env.R2_ENDPOINT || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'physio-materials';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

// Naver Configuration
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || '';
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || '';

// Initialize S3 Client for R2
const r2Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});


/**
 * Generate a presigned URL for direct upload to R2
 * Client can use this URL to upload files directly to R2
 */
export const getR2UploadUrl = onCall(FUNCTION_OPTIONS, async (request) => {
    // Verify authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { fileName, contentType, category } = request.data;

    if (!fileName || !contentType) {
        throw new HttpsError('invalid-argument', 'fileName and contentType are required');
    }

    // Generate unique file key
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileKey = `materials/${category || 'general'}/${timestamp}_${sanitizedFileName}`;

    try {
        // Create presigned URL for upload (valid for 15 minutes)
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileKey,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 });

        // Generate public URL for the file
        const publicUrl = R2_PUBLIC_URL
            ? `${R2_PUBLIC_URL}/${fileKey}`
            : `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${fileKey}`;

        return {
            uploadUrl,
            fileKey,
            publicUrl,
        };
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        throw new HttpsError('internal', 'Failed to generate upload URL');
    }
});

/**
 * Confirm upload and save metadata to Firestore
 */
export const confirmR2Upload = onCall(FUNCTION_OPTIONS, async (request) => {
    // Verify authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const {
        fileKey,
        publicUrl,
        title,
        description,
        category,
        fileName,
        fileSize,
        fileType
    } = request.data;

    if (!fileKey || !publicUrl || !title) {
        throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    try {
        // Save metadata to Firestore
        const docRef = await db.collection('materials').add({
            title,
            description: description || '',
            fileUrl: publicUrl,
            fileName,
            fileType: fileType || 'other',
            fileSize: fileSize || 0,
            category: category || 'general',
            uploadedBy: request.auth.uid,
            uploaderName: request.auth.token.name || 'Unknown',
            storageType: 'r2', // Identify as R2 storage
            fileKey, // Store for deletion later
            createdAt: FieldValue.serverTimestamp(),
            downloadCount: 0,
        });

        return {
            success: true,
            materialId: docRef.id,
        };
    } catch (error) {
        console.error('Error saving metadata:', error);
        throw new HttpsError('internal', 'Failed to save file metadata');
    }
});

/**
 * Delete file from R2 storage
 */
export const deleteR2File = onCall(FUNCTION_OPTIONS, async (request) => {
    // Verify authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { fileKey, materialId } = request.data;

    if (!fileKey || !materialId) {
        throw new HttpsError('invalid-argument', 'fileKey and materialId are required');
    }

    try {
        // Delete from R2
        const command = new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileKey,
        });
        await r2Client.send(command);

        // Delete from Firestore
        await db.collection('materials').doc(materialId).delete();

        return { success: true };
    } catch (error) {
        console.error('Error deleting file:', error);
        throw new HttpsError('internal', 'Failed to delete file');
    }
});

// AI API key retrieval moved inside functions to ensure secrets are populated

// AI parsing prompt template
const SCHEDULE_PARSE_PROMPT = (userInput: string, currentDate: string) => `
You are a schedule parsing assistant. Parse the following natural language input into structured event data.

Current date and time: ${currentDate}

User input: "${userInput}"

Parse this input and return a JSON object with the following structure:
{
  "title": "event title extracted from input",
  "start_date": "ISO 8601 date-time string (e.g., 2025-12-26T15:00:00+09:00)",
  "end_date": "ISO 8601 date-time string or null if not specified",
  "location": "location if mentioned, otherwise null",
  "description": "brief description or null",
  "category": "one of: meeting, education, trip, counseling, personal, report, admin, other"
}

Rules:
- If only date is mentioned without time, default to 09:00
- If duration is mentioned (e.g., "30분", "2시간"), calculate end_date accordingly
- If no duration is mentioned, default to 1 hour
- "내일" means tomorrow, "모레" means day after tomorrow
- "다음주" means next week
- "다음주" means next week
- "오전" means AM (before 12:00), "오후" means PM (after 12:00)
- Categorize the event based on context:
  - "학생상담", "상담", "면담" -> counseling
  - "회의", "미팅" -> meeting
  - "수업", "특강", "교육", "연수" -> education
  - "출장", "외근" -> trip
  - "보고서", "기안" -> report
  - "행정", "업무" -> admin
  - "개인", "병원", "식사" -> personal
  - Default -> other
- Use Korean timezone (KST, +09:00)

Return ONLY the JSON object, no other text.
`;

interface ParsedEvent {
    title: string;
    start_date: string;
    end_date: string | null;
    location: string | null;
    description: string | null;
    category: string;
}

// Parse with Gemini
async function parseWithGemini(userInput: string, currentDate: string, apiKey: string): Promise<ParsedEvent> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });

    const prompt = SCHEDULE_PARSE_PROMPT(userInput, currentDate);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Failed to parse Gemini response');
    }

    return JSON.parse(jsonMatch[0]) as ParsedEvent;
}

// Parse with OpenAI
async function parseWithOpenAI(userInput: string, currentDate: string, apiKey: string): Promise<ParsedEvent> {
    const OpenAI = (await import('openai')).default;

    const openai = new OpenAI({ apiKey: apiKey });

    const prompt = SCHEDULE_PARSE_PROMPT(userInput, currentDate);
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are a schedule parsing assistant. Return only valid JSON.' },
            { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
    });

    const text = completion.choices[0]?.message?.content || '';
    return JSON.parse(text) as ParsedEvent;
}

// Parse with Grok (xAI) - uses OpenAI-compatible API
async function parseWithGrok(userInput: string, currentDate: string, apiKey: string): Promise<ParsedEvent> {
    const OpenAI = (await import('openai')).default;

    const grok = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.x.ai/v1',
    });

    const prompt = SCHEDULE_PARSE_PROMPT(userInput, currentDate);
    const completion = await grok.chat.completions.create({
        model: 'grok-3-mini',
        messages: [
            { role: 'system', content: 'You are a schedule parsing assistant. Return only valid JSON.' },
            { role: 'user', content: prompt }
        ],
    });

    const text = completion.choices[0]?.message?.content || '';
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Failed to parse Grok response');
    }
    return JSON.parse(jsonMatch[0]) as ParsedEvent;
}

/**
 * Parse natural language input into structured schedule data using AI
 * Uses fallback: Gemini -> OpenAI -> Grok
 */
export const parseScheduleWithAI = onCall(FUNCTION_OPTIONS, async (request) => {
    // Verify authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { prompt, currentDate } = request.data;

    if (!prompt) {
        throw new HttpsError('invalid-argument', 'prompt is required');
    }

    const dateToUse = currentDate || new Date().toISOString();

    // Log environment key presence (not the actual keys for security)
    console.log('API Keys available:', {
        gemini: !!process.env.GEMINI_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        grok: !!process.env.GROK_API_KEY,
    });

    // Try Gemini first
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (geminiKey) {
        try {
            console.log('Attempting to parse with Gemini...');
            const result = await parseWithGemini(prompt, dateToUse, geminiKey);
            console.log('Gemini parsing succeeded');
            return { success: true, event: result, model: 'gemini' };
        } catch (error: any) {
            console.error('Gemini parsing failed:', error?.message || error);
        }
    } else {
        console.log('Gemini API key not available');
    }

    // Fallback to OpenAI
    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    if (openaiKey) {
        try {
            console.log('Attempting to parse with OpenAI...');
            const result = await parseWithOpenAI(prompt, dateToUse, openaiKey);
            console.log('OpenAI parsing succeeded');
            return { success: true, event: result, model: 'openai' };
        } catch (error: any) {
            console.error('OpenAI parsing failed:', error?.message || error);
        }
    } else {
        console.log('OpenAI API key not available');
    }

    // Fallback to Grok (xAI)
    const grokKey = process.env.GROK_API_KEY?.trim();
    if (grokKey) {
        try {
            console.log('Attempting to parse with Grok...');
            const result = await parseWithGrok(prompt, dateToUse, grokKey);
            console.log('Grok parsing succeeded');
            return { success: true, event: result, model: 'grok' };
        } catch (error: any) {
            console.error('Grok parsing failed:', error?.message || error);
        }
    } else {
        console.log('Grok API key not available');
    }

    // No API keys configured or all attempts failed
    const hasKeys = geminiKey || openaiKey || grokKey;
    if (!hasKeys) {
        console.error('No AI API keys configured.');
        throw new HttpsError(
            'failed-precondition',
            'AI API 키가 설정되지 않았습니다. 관리자에게 문의하세요.'
        );
    }

    throw new HttpsError(
        'internal',
        '모든 AI 모델이 응답하지 않습니다. 잠시 후 다시 시도해주세요.'
    );
});

/**
 * Exchange Naver Authorization Code for a Firebase Custom Token
 */
export const getNaverCustomToken = onCall(FUNCTION_OPTIONS, async (request) => {
    const { code, state } = request.data;

    if (!code) {
        throw new HttpsError('invalid-argument', 'Authorization code is required');
    }

    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
        throw new HttpsError('failed-precondition', 'Naver API keys are not configured in Cloud Functions');
    }

    try {
        // 1. Exchange code for Naver Access Token
        const tokenResponse = await fetch('https://nid.naver.com/oauth2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: NAVER_CLIENT_ID,
                client_secret: NAVER_CLIENT_SECRET,
                code: code,
                state: state || 'random_state',
            }).toString(),
        });

        const tokenData = await tokenResponse.json() as any;
        if (!tokenData.access_token) {
            console.error('Naver Token Error:', tokenData);
            throw new HttpsError('internal', `Failed to get access token from Naver: ${tokenData.error_description || 'Unknown error'}`);
        }

        // 2. Fetch User Profile from Naver
        const profileResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const profileData = await profileResponse.json() as any;
        if (profileData.resultcode !== '00') {
            console.error('Naver Profile Error:', profileData);
            throw new HttpsError('internal', 'Failed to get user profile from Naver');
        }

        const naverUser = profileData.response;
        const uid = `naver:${naverUser.id}`; // Unique UID for Naver users

        // 3. Create or update user in Firebase
        try {
            await getAuth().updateUser(uid, {
                email: naverUser.email,
                displayName: naverUser.name || naverUser.nickname,
            });
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                await getAuth().createUser({
                    uid: uid,
                    email: naverUser.email,
                    displayName: naverUser.name || naverUser.nickname,
                });
            } else {
                throw error;
            }
        }

        // 4. Generate Firebase Custom Token
        const customToken = await getAuth().createCustomToken(uid);

        return {
            customToken,
            profile: {
                email: naverUser.email,
                name: naverUser.name || naverUser.nickname,
                id: naverUser.id
            }
        };

    } catch (error: any) {
        console.error('Naver Custom Auth Error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Internal server error during Naver login');
    }
});
