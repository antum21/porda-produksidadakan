/**
 * Utility to compress image files and base64 strings to ensure
 * document payloads remain well below Firestore's 1MB limit.
 */

export async function compressImageFile(
  file: File,
  maxDimension = 800,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Basic verification
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      compressDataUrl(rawDataUrl, maxDimension, quality)
        .then(resolve)
        .catch(() => resolve(rawDataUrl)); // Fallback to raw if canvas fails
    };
    reader.readAsDataURL(file);
  });
}

export async function compressDataUrl(
  dataUrl: string,
  maxDimension = 800,
  quality = 0.72
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    return dataUrl;
  }

  // If already very compact (< 60KB base64), return as is
  if (dataUrl.length < 60 * 1024) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width <= 0 || height <= 0) {
          resolve(dataUrl);
          return;
        }

        // Scale down keeping aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Fill background white for transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with optimized quality (producing 20KB - 70KB)
        let compressed = canvas.toDataURL('image/jpeg', quality);

        // If still over 150KB, compress more aggressively
        if (compressed.length > 150 * 1024) {
          compressed = canvas.toDataURL('image/jpeg', 0.55);
        }

        resolve(compressed);
      } catch (e) {
        console.warn('Canvas compression error:', e);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}

/**
 * Optimizes all design preview images in an order before Firestore persistence
 */
export async function sanitizeApparelDesignsForStorage<T extends { apparel_designs?: any[] }>(
  payload: T
): Promise<T> {
  if (!payload.apparel_designs || !Array.isArray(payload.apparel_designs)) {
    return payload;
  }

  const updatedDesigns = await Promise.all(
    payload.apparel_designs.map(async (design) => {
      if (design && design.gambar_preview && typeof design.gambar_preview === 'string') {
        const optimized = await compressDataUrl(design.gambar_preview, 800, 0.7);
        return { ...design, gambar_preview: optimized };
      }
      return design;
    })
  );

  return {
    ...payload,
    apparel_designs: updatedDesigns,
  };
}
