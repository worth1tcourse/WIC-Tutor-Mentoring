/**
 * Adaptive client-side image compression utility for reliable cross-device Cloud Firestore sync.
 * Guarantees every uploaded image fits comfortably within Firestore & server payload budgets
 * while preserving visual sharpness and optional alpha transparency (logos, signatures, stamps).
 */

export interface CompressImageOptions {
  maxWidth: number;
  maxHeight: number;
  maxChars: number;
  preserveTransparency?: boolean;
  initialQuality?: number;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat gambar untuk optimasi.'));
    img.src = src;
  });
}

function encodeCanvasWithinBudget(
  sourceCanvasOrImg: HTMLImageElement | HTMLCanvasElement,
  sourceW: number,
  sourceH: number,
  options: CompressImageOptions
): string {
  const {
    maxWidth,
    maxHeight,
    maxChars,
    preserveTransparency = false,
    initialQuality = 0.84,
  } = options;

  let width = sourceW;
  let height = sourceH;
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const renderAtSize = (w: number, h: number) => {
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    if (!preserveTransparency) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvasOrImg, 0, 0, w, h);
  };

  // Detect WebP encoding support once when transparency needs to be preserved
  let mimeType = preserveTransparency ? 'image/webp' : 'image/jpeg';
  if (preserveTransparency) {
    const probe = document.createElement('canvas');
    probe.width = 2;
    probe.height = 2;
    const probeUrl = probe.toDataURL('image/webp', 0.8);
    if (!probeUrl.startsWith('data:image/webp')) {
      mimeType = 'image/png';
    }
  }

  const qualitySteps =
    mimeType === 'image/png'
      ? [1]
      : [initialQuality, 0.76, 0.68, 0.6, 0.52, 0.44, 0.36];

  let bestCandidate = '';

  // Progressively scale down dimensions only if quality stepping alone cannot fit the budget
  for (let scaleAttempt = 0; scaleAttempt < 5; scaleAttempt++) {
    const factor = Math.pow(0.8, scaleAttempt);
    const w = Math.max(48, Math.round(width * factor));
    const h = Math.max(48, Math.round(height * factor));
    renderAtSize(w, h);

    for (const q of qualitySteps) {
      const candidate =
        mimeType === 'image/png'
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL(mimeType, q);
      bestCandidate = candidate;
      if (candidate.length <= maxChars) {
        return candidate;
      }
    }
  }

  // Final safety fallback for rare PNG-only browsers: switch to JPEG to stay within cloud budget
  if (bestCandidate.length > maxChars && mimeType === 'image/png') {
    const w = Math.max(48, Math.round(width * 0.5));
    const h = Math.max(48, Math.round(height * 0.5));
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(sourceCanvasOrImg, 0, 0, w, h);
    for (const q of [0.75, 0.6, 0.45, 0.35]) {
      const candidate = canvas.toDataURL('image/jpeg', q);
      bestCandidate = candidate;
      if (candidate.length <= maxChars) return candidate;
    }
  }

  return bestCandidate;
}

export async function compressImageToBudget(
  source: File | HTMLCanvasElement | string,
  options: CompressImageOptions
): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return typeof source === 'string' ? source : '';
  }

  if (source instanceof HTMLCanvasElement) {
    return encodeCanvasWithinBudget(source, source.width, source.height, options);
  }

  const rawDataUrl = typeof source === 'string' ? source : await readFileAsDataUrl(source);
  if (!rawDataUrl) return '';

  // Keep already-compact raster data URLs (except SVG which App normalization rejects for logos)
  if (
    typeof source === 'string' &&
    rawDataUrl.startsWith('data:image/') &&
    !rawDataUrl.startsWith('data:image/svg+xml') &&
    rawDataUrl.length <= options.maxChars
  ) {
    return rawDataUrl;
  }

  const img = await loadImageElement(rawDataUrl);
  const w = img.naturalWidth || img.width || options.maxWidth;
  const h = img.naturalHeight || img.height || options.maxHeight;
  return encodeCanvasWithinBudget(img, w, h, options);
}

/** Profile avatars (Admin & Tutor): crisp square/portrait <= 45KB base64 */
export function compressAvatarImage(file: File): Promise<string> {
  return compressImageToBudget(file, {
    maxWidth: 240,
    maxHeight: 240,
    maxChars: 45000,
    preserveTransparency: false,
    initialQuality: 0.82,
  });
}

/** Module covers: crisp book cover <= 65KB base64 */
export function compressCoverImage(file: File): Promise<string> {
  return compressImageToBudget(file, {
    maxWidth: 420,
    maxHeight: 560,
    maxChars: 65000,
    preserveTransparency: false,
    initialQuality: 0.82,
  });
}

/** Institutional assets (Logo, TTD Direktur, TTD Keuangan, Stempel, SignaturePad): transparent WebP <= 110KB base64 */
export function compressAssetImage(source: File | HTMLCanvasElement | string): Promise<string> {
  return compressImageToBudget(source, {
    maxWidth: 450,
    maxHeight: 450,
    maxChars: 110000,
    preserveTransparency: true,
    initialQuality: 0.85,
  });
}

/** Uploaded image module material: readable high-res image <= 180KB base64 (syncs directly via Cloud Firestore across all devices) */
export function compressModuleContentImage(file: File): Promise<string> {
  return compressImageToBudget(file, {
    maxWidth: 1200,
    maxHeight: 1600,
    maxChars: 180000,
    preserveTransparency: false,
    initialQuality: 0.82,
  });
}
