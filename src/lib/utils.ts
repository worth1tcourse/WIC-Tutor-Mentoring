import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
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
export function compressImageFile(file: File, maxDim: number = 200, quality: number = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawUrl = e.target?.result as string;
      if (!rawUrl) {
        resolve('');
        return;
      }

      if (typeof window === 'undefined' || !window.Image) {
        resolve(rawUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
            return;
          }
        } catch {
          // fallback
        }
        resolve(rawUrl);
      };
      img.onerror = () => resolve(rawUrl);
      img.src = rawUrl;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

