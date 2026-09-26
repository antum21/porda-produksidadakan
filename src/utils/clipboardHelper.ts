/**
 * Clipboard Image Helper
 * Utility to extract image files from clipboard events or navigator.clipboard.read()
 */

/**
 * Checks if a MIME type is a valid image type for upload.
 */
export function isImageMimeType(type: string): boolean {
  return type.startsWith('image/');
}

/**
 * Converts and optimizes an image blob into a lightweight, fast-to-upload File.
 * Caps maximum dimension at 1600px and converts heavy uncompressed screenshots
 * to high-quality compressed JPEG (~150KB - 250KB instead of 5MB - 10MB),
 * speeding up network upload by 20x to 30x.
 */
export async function convertBlobToImageFile(blob: Blob, customFileName?: string): Promise<File> {
  const fileName = customFileName || `paste-${Date.now()}.jpg`;

  // If blob is already lightweight (< 150KB) and in standard web format, return immediately
  if (blob.size < 150 * 1024 && ['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) {
    return new File([blob], fileName, { type: blob.type });
  }

  // Fast client-side resizing & compression via Canvas
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        const maxDim = 1600;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(new File([blob], fileName, { type: blob.type || 'image/jpeg' }));
          return;
        }

        // Fill background white for transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to image/jpeg at 0.82 quality for instant uploading
        canvas.toBlob(
          (compressedBlob) => {
            if (compressedBlob) {
              const safeName = fileName.replace(/\.[^/.]+$/, '') + '.jpg';
              resolve(new File([compressedBlob], safeName, { type: 'image/jpeg' }));
            } else {
              resolve(new File([blob], fileName, { type: blob.type || 'image/jpeg' }));
            }
          },
          'image/jpeg',
          0.82
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(new File([blob], fileName, { type: blob.type || 'image/png' }));
      };

      img.src = url;
    } catch {
      resolve(new File([blob], fileName, { type: blob.type || 'image/png' }));
    }
  });
}

/**
 * Extracts an image File from a React or native ClipboardEvent.
 */
export async function extractImageFromClipboardEvent(
  event: ClipboardEvent | { clipboardData?: DataTransfer | null }
): Promise<File | null> {
  const clipboardData = (event as any).clipboardData || (typeof window !== 'undefined' && (window as any).clipboardData);
  if (!clipboardData) return null;

  // 1. Try clipboardData.items first
  const items = clipboardData.items;
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          return await convertBlobToImageFile(file, `paste-${Date.now()}.${file.type.split('/')[1] || 'png'}`);
        }
      }
    }
  }

  // 2. Try clipboardData.files
  const files = clipboardData.files;
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type && file.type.startsWith('image/')) {
        return file;
      }
    }
  }

  return null;
}

/**
 * Reads an image directly from the system clipboard using navigator.clipboard.read().
 * Works when user clicks a "Paste Image" button.
 */
export async function readImageFromSystemClipboard(): Promise<{
  file: File | null;
  error?: string;
  isPermissionDenied?: boolean;
}> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return {
      file: null,
      error: 'Clipboard API tidak didukung pada browser ini. Silakan gunakan pintasan keyboard Ctrl + V.',
    };
  }

  if (!navigator.clipboard.read) {
    return {
      file: null,
      error: 'Fitur membaca clipboard otomatis tidak tersedia di browser ini. Silakan gunakan Ctrl + V.',
    };
  }

  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const item of clipboardItems) {
      const imageType = item.types.find((t) => t.startsWith('image/'));
      if (imageType) {
        const blob = await item.getType(imageType);
        const file = await convertBlobToImageFile(
          blob,
          `clipboard-${Date.now()}.${imageType.split('/')[1] || 'png'}`
        );
        return { file };
      }
    }
    return {
      file: null,
      error: 'Tidak ditemukan data gambar di clipboard. Salin gambar terlebih dahulu (Screenshot / Copy Image) lalu tekan Ctrl + V.',
    };
  } catch (err: any) {
    const isPermission =
      err?.name === 'NotAllowedError' ||
      err?.message?.toLowerCase().includes('permission') ||
      err?.message?.toLowerCase().includes('denied');

    return {
      file: null,
      isPermissionDenied: isPermission,
      error: isPermission
        ? 'Izin akses clipboard ditolak. Silakan gunakan tombol keyboard Ctrl + V untuk menempelkan gambar.'
        : err?.message || 'Gagal membaca gambar dari clipboard. Gunakan Ctrl + V.',
    };
  }
}
