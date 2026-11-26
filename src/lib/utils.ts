import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { compressImageToBudget } from './imageCompressor';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
}

export function penyebut(nilai: number): string {
  const val = Math.abs(nilai);
  const huruf = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let temp = "";
  if (val < 12) {
    temp = " " + huruf[val];
  } else if (val < 20) {
    temp = penyebut(val - 10) + " Belas";
  } else if (val < 100) {
    temp = penyebut(Math.floor(val / 10)) + " Puluh" + penyebut(val % 10);
  } else if (val < 200) {
    temp = " Seratus" + penyebut(val - 100);
  } else if (val < 1000) {
    temp = penyebut(Math.floor(val / 100)) + " Ratus" + penyebut(val % 100);
  } else if (val < 2000) {
    temp = " Seribu" + penyebut(val - 1000);
  } else if (val < 1000000) {
    temp = penyebut(Math.floor(val / 1000)) + " Ribu" + penyebut(val % 1000);
  } else if (val < 1000000000) {
    temp = penyebut(Math.floor(val / 1000000)) + " Juta" + penyebut(val % 1000000);
  }
  return temp;
}

export function terbilang(nilai: number): string {
  if (nilai === 0) return "Nol Rupiah";
  return (penyebut(nilai) + " Rupiah").trim();
}

export function getDayName(dateString: string): string {
  if (!dateString) return "";
  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const date = new Date(dateString);
  return dayNames[date.getDay()];
}

export function formatPeriodText(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month] = dateStr.split('-');
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export function normalizeUrl(url?: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith('/') ||
    /^data:/i.test(trimmed) ||
    /^blob:/i.test(trimmed)
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function detectPlatform(url: string): string {
  const u = (url || '').toLowerCase();
  if (u.includes('drive.google.com') || u.includes('docs.google.com')) return 'Google Drive';
  if (u.includes('canva.com')) return 'Canva';
  if (u.includes('notion.so') || u.includes('notion.site')) return 'Notion';
  if (u.includes('quizizz.com')) return 'Quizizz';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
  if (u.includes('padlet.com')) return 'Padlet';
  if (u.includes('wordwall.net')) return 'Wordwall';
  return 'Web / Cloud';
}

/**
 * Compresses an image file in the browser using HTML5 Canvas
 * Reduces file size from several MBs to a lightweight ~10-20KB data URL.
 */
export async function compressImageFile(file: File, maxDim: number = 220, quality: number = 0.8): Promise<string> {
  try {
    return await compressImageToBudget(file, {
      maxWidth: maxDim,
      maxHeight: maxDim,
      maxChars: 45000,
      preserveTransparency: false,
      initialQuality: quality,
    });
  } catch {
    return '';
  }
}

/**
 * Determines whether a tutor/user should be addressed as female ('Miss') vs male ('Mr.')
 * across all dashboards, journals, WhatsApp templates, and sidebar views.
 */
export function isTutorFemale(user?: { gender?: string; title?: string } | null): boolean {
  if (!user) return false;
  const g = String(user.gender || '').trim().toLowerCase();
  const t = String(user.title || '').trim().toLowerCase();
  const femaleTokens = new Set([
    'p',
    'perempuan',
    'female',
    'wanita',
    'miss',
    'ms',
    'ms.',
    'mrs',
    'mrs.',
    'ibu',
    'bu',
    'ustadzah',
  ]);
  return femaleTokens.has(g) || femaleTokens.has(t);
}

export function getTutorSalutation(user?: { gender?: string; title?: string } | null): 'Mr.' | 'Miss' {
  return isTutorFemale(user) ? 'Miss' : 'Mr.';
}

export function formatTutorDisplayName(user?: { name?: string; gender?: string; title?: string; role?: string } | null): string {
  if (!user) return 'Tutor WIC';
  const rawName = String(user.name || '').trim();
  if (!rawName) return 'Tutor WIC';
  if (user.role === 'ADMIN') {
    return rawName;
  }
  const salutation = getTutorSalutation(user);
  // Avoid duplicating prefix if name already begins with Mr./Miss/Ms./Mrs.
  if (/^(mr\.?|miss|ms\.?|mrs\.?)\s+/i.test(rawName)) {
    return `${salutation} ${rawName.replace(/^(mr\.?|miss|ms\.?|mrs\.?)\s+/i, '')}`;
  }
  return `${salutation} ${rawName}`;
}


