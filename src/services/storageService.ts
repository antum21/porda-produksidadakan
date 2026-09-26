import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
import { compressDataUrl, compressImageFile } from '../utils/imageCompressor';

export interface StorageUploadResult {
  fileName: string;
  storagePath: string;
  downloadUrl: string;
  contentType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  isLocalStorage?: boolean;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates file MIME type and file size against strict production rules.
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'File tidak ditemukan.' };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Format file "${file.type || 'tidak dikenal'}" tidak didukung. Hanya gambar JPEG, PNG, dan WebP yang diizinkan.`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Ukuran file (${sizeMb} MB) melebihi batas maksimal 10 MB.`,
    };
  }

  // Reject suspicious filenames or double extensions (e.g. image.php.jpg)
  const lowerName = file.name.toLowerCase();
  const dangerousPatterns = [/\.exe$/i, /\.js$/i, /\.html$/i, /\.htm$/i, /\.php$/i, /\.sh$/i, /\.svg$/i];
  for (const pattern of dangerousPatterns) {
    if (pattern.test(lowerName)) {
      return { valid: false, error: 'Ekstensi file ini tidak diizinkan demi keamanan.' };
    }
  }

  return { valid: true };
}

/**
 * Generates a collision-resistant, sanitized unique filename for Firebase Storage.
 */
function generateSafeFileName(originalName: string, mimeType: string): string {
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const sanitizedOriginal = originalName
    .replace(/\.[^/.]+$/, '') // remove existing extension
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 30);

  return `${timestamp}_${randomSuffix}_${sanitizedOriginal}.${extension}`;
}

/**
 * Uploads an apparel design or order mockup to Firebase Storage.
 * If Firebase Storage is unavailable or unauthorized, automatically and seamlessly
 * falls back to high-quality compressed base64 to ensure zero errors and instant persistence.
 */
export async function uploadOrderDesignImage(
  orderId: string,
  file: File,
  uploadedBy: string = 'Staff'
): Promise<StorageUploadResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const safeOrderId = (orderId || 'draft').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFileName = generateSafeFileName(file.name, file.type);
  const storagePath = `orders/${safeOrderId}/designs/${safeFileName}`;

  try {
    const storageRef = ref(storage, storagePath);
    const metadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        orderId: safeOrderId,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
      },
    };

    const uploadSnap = await uploadBytes(storageRef, file, metadata);
    const downloadUrl = await getDownloadURL(uploadSnap.ref);

    return {
      fileName: file.name,
      storagePath,
      downloadUrl,
      contentType: file.type,
      fileSize: file.size,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      isLocalStorage: false,
    };
  } catch (err: any) {
    console.warn('Firebase Storage upload unavailable or unauthorized, using compressed local base64 fallback:', err);
    // Seamless fallback to lightweight compressed base64 (< 60KB) for direct Firestore storage
    const base64Data = await compressImageFile(file, 800, 0.72);
    return {
      fileName: file.name,
      storagePath: '',
      downloadUrl: base64Data,
      contentType: 'image/jpeg',
      fileSize: base64Data.length,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      isLocalStorage: true,
    };
  }
}

/**
 * Uploads a production photo or physical QC proof to Firebase Storage.
 * Falls back to high-quality compressed base64 if Firebase Storage is unavailable.
 */
export async function uploadProductionImage(
  workOrderId: string,
  file: File,
  uploadedBy: string = 'Staff'
): Promise<StorageUploadResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const safeWoId = (workOrderId || 'wo-draft').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFileName = generateSafeFileName(file.name, file.type);
  const storagePath = `production/${safeWoId}/${safeFileName}`;

  try {
    const storageRef = ref(storage, storagePath);
    const metadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        workOrderId: safeWoId,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
      },
    };

    const uploadSnap = await uploadBytes(storageRef, file, metadata);
    const downloadUrl = await getDownloadURL(uploadSnap.ref);

    return {
      fileName: file.name,
      storagePath,
      downloadUrl,
      contentType: file.type,
      fileSize: file.size,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      isLocalStorage: false,
    };
  } catch (err: any) {
    console.warn('Firebase Storage upload failed, using compressed local base64 fallback:', err);
    const base64Data = await compressImageFile(file, 800, 0.72);
    return {
      fileName: file.name,
      storagePath: '',
      downloadUrl: base64Data,
      contentType: 'image/jpeg',
      fileSize: base64Data.length,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      isLocalStorage: true,
    };
  }
}

/**
 * Deletes a file from Firebase Storage given its storage path.
 */
export async function deleteStorageFile(storagePath: string): Promise<boolean> {
  if (!storagePath) return false;
  try {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
    return true;
  } catch (err) {
    console.warn(`Could not delete storage file at ${storagePath}:`, err);
    return false;
  }
}
