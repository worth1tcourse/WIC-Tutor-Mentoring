import React, { useState } from 'react';
import { TeachingModule } from '../../types';
import { 
  X, 
  ExternalLink, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  BookOpen, 
  Maximize2, 
  Minimize2, 
  ListOrdered, 
  Sparkles,
  AlertCircle,
  FileText
} from 'lucide-react';
import { normalizeUrl } from '../../lib/utils';

interface ModuleViewerModalProps {
  module: TeachingModule | null;
  isOpen: boolean;
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

/**
 * Transforms external URLs (especially Google Drive & Docs) into clean embeddable preview URLs
 */
export function getEmbeddableUrl(rawUrl: string): { embedUrl: string; isGoogleDrive: boolean; isDirectFile: boolean; isDirectImage: boolean } {
  const url = normalizeUrl(rawUrl);
  if (!url) return { embedUrl: '', isGoogleDrive: false, isDirectFile: false, isDirectImage: false };

  // 0. Direct image data URLs or direct image file URLs
  if (
    /^data:image\//i.test(url) ||
    /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url)
  ) {
    return { embedUrl: url, isGoogleDrive: false, isDirectFile: true, isDirectImage: true };
  }

  // 1. Direct local uploads or direct PDF links
  if (url.startsWith('/uploads/') || url.endsWith('.pdf') || url.includes('.pdf?')) {
    return { embedUrl: url, isGoogleDrive: false, isDirectFile: true, isDirectImage: false };
  }

  // 2. Google Drive File Links
  if (url.includes('drive.google.com')) {
    // Match /file/d/{FILE_ID}
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch && fileMatch[1]) {
      return { 
        embedUrl: `https://drive.google.com/file/d/${fileMatch[1]}/preview`, 
        isGoogleDrive: true, 
        isDirectFile: false,
        isDirectImage: false
      };
    }

    // Match id={FILE_ID}
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return { 
        embedUrl: `https://drive.google.com/file/d/${idMatch[1]}/preview`, 
        isGoogleDrive: true, 
        isDirectFile: false,
        isDirectImage: false
      };
    }

    // Google Drive Folders cannot be iframe-embedded safely, fallback to folder preview
    if (url.includes('/drive/folders/')) {
      return { embedUrl: url, isGoogleDrive: true, isDirectFile: false, isDirectImage: false };
    }
  }

  // 3. Google Docs / Sheets / Slides
  if (url.includes('docs.google.com/document/d/')) {
    const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docMatch && docMatch[1]) {
      return { 
        embedUrl: `https://docs.google.com/document/d/${docMatch[1]}/preview`, 
        isGoogleDrive: true, 
        isDirectFile: false,
        isDirectImage: false
      };
    }
  }

  return { embedUrl: url, isGoogleDrive: false, isDirectFile: false, isDirectImage: false };
}

export default function ModuleViewerModal({
  module,
  isOpen,
  onClose,
  showToast
}: ModuleViewerModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [copied, setCopied] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  if (!isOpen || !module) return null;

  const rawUrl = module.app_url || '';
  const cleanUrl = normalizeUrl(rawUrl);
  const { embedUrl, isGoogleDrive, isDirectFile, isDirectImage } = getEmbeddableUrl(rawUrl);

  const handleCopyLink = () => {
    if (!cleanUrl) return;
    navigator.clipboard.writeText(cleanUrl);
    setCopied(true);
    if (showToast) showToast('Link modul ajar berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWa = () => {
    if (!cleanUrl) return;
    const msg = `*MODUL AJAR RESMI WORTH IT COURSE (WIC)*\n\n📖 *${module.title}*\n🎯 Level: *${module.level}*\n${module.target_grades ? `👥 Sasaran: ${module.target_grades}\n` : ''}\n🔗 Tautan Akses Modul: ${cleanUrl}\n\nSilakan diakses untuk persiapan dan panduan materi pembelajaran.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen 
            ? 'w-full h-full rounded-none fixed inset-0' 
            : 'w-full max-w-5xl h-[92vh] max-h-[850px]'
        }`}
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3 border-b border-emerald-800/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gold-500/20 text-gold-400 border border-gold-500/30 flex items-center justify-center shrink-0">
              <BookOpen size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="bg-gold-500/20 text-gold-400 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-gold-500/30">
                  Room {module.level}
                </span>
                <span className="bg-white/10 text-emerald-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {module.app_platform || 'Modul Digital'}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-white truncate mt-0.5">
                {module.title}
              </h2>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {cleanUrl && (
              <>
                <a
                  href={cleanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-800/60 hover:bg-emerald-700 text-gold-300 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 border border-emerald-700/50"
                  title="Buka di Tab Baru"
                >
                  <ExternalLink size={13} />
                  <span className="hidden sm:inline">Tab Baru</span>
                </a>

                {isDirectFile && (
                  <a
                    href={cleanUrl}
                    download
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5"
                    title="Download File"
                  >
                    <Download size={13} />
                    <span className="hidden sm:inline">Unduh</span>
                  </a>
                )}

                <button
                  onClick={handleShareWa}
                  className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition"
                  title="Bagikan ke WhatsApp"
                >
                  <Share2 size={15} />
                </button>

                <button
                  onClick={handleCopyLink}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                  title="Salin Tautan"
                >
                  {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                </button>
              </>
            )}

            {module.chapters && module.chapters.length > 0 && (
              <button
                onClick={() => setShowChapters(!showChapters)}
                className={`p-2 rounded-xl transition ${
                  showChapters ? 'bg-gold-500 text-emerald-950 font-black' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title="Daftar Bab & Silabus"
              >
                <ListOrdered size={15} />
              </button>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition hidden sm:flex"
              title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 transition"
              title="Tutup Viewer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Notice for Google Drive links */}
        {isGoogleDrive && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-3 text-[11px] text-amber-900 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-600 shrink-0" />
              <span>
                <strong>Tautan Google Drive Terdeteksi:</strong> Jika modul meminta izin atau tidak muncul, pastikan link Drive diatur ke <em>"Siapa saja yang memiliki link dapat melihat"</em>.
              </span>
            </div>
            {cleanUrl && (
              <a
                href={cleanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline text-amber-800 hover:text-amber-950 shrink-0 text-[10px]"
              >
                Buka di Drive ↗
              </a>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative bg-slate-100">
          {/* Document Viewer Frame */}
          <div className="flex-1 h-full flex flex-col relative overflow-hidden">
            {!cleanUrl ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                <div className="w-16 h-16 rounded-3xl bg-slate-200 text-slate-400 flex items-center justify-center mb-3">
                  <FileText size={32} />
                </div>
                <h3 className="font-black text-slate-700 uppercase tracking-tight text-sm">
                  Belum Ada File atau Tautan Materi
                </h3>
                <p className="text-xs text-slate-500 max-w-md mt-1">
                  Admin belum menyematkan link file PDF atau Google Drive untuk modul ini. Silakan tambahkan file materi di menu Kelola Modul Admin.
                </p>
              </div>
            ) : iframeError ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                  <AlertCircle size={32} />
                </div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">
                  Pratinjau Langsung Dibatasi oleh Penyedia File
                </h3>
                <p className="text-xs text-slate-500 max-w-md mt-1 mb-4 leading-relaxed">
                  Penyedia penyimpanan membatasi tampilan di dalam frame. Anda dapat langsung membuka atau mengunduh modul secara utuh di tab baru.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <a
                    href={cleanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-950 hover:bg-emerald-900 text-gold-400 px-5 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider transition flex items-center gap-2 shadow-md"
                  >
                    <ExternalLink size={14} /> Buka Modul di Tab Baru
                  </a>
                  <button
                    onClick={() => setIframeError(false)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-bold uppercase text-xs"
                  >
                    Coba Muat Ulang
                  </button>
                </div>
              </div>
            ) : isDirectImage ? (
              <div className="relative w-full h-full bg-slate-900/95 overflow-auto flex items-center justify-center p-4">
                <img
                  src={embedUrl}
                  alt={module.title}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                />
              </div>
            ) : (
              <div className="relative w-full h-full bg-slate-200">
                <iframe
                  src={embedUrl}
                  title={module.title}
                  className="w-full h-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  onError={() => setIframeError(true)}
                />
              </div>
            )}
          </div>

          {/* Chapters Sidebar (Toggleable) */}
          {showChapters && module.chapters && module.chapters.length > 0 && (
            <div className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 shadow-lg z-20 animate-in slide-in-from-right duration-200">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListOrdered size={16} className="text-emerald-700" />
                  <span className="font-black text-xs uppercase text-slate-800 tracking-wider">
                    Silabus ({module.chapters.length} Bab)
                  </span>
                </div>
                <button
                  onClick={() => setShowChapters(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scroll">
                {module.chapters.map((chap, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/80 transition flex items-start gap-3 group"
                  >
                    <span className="w-6 h-6 rounded-xl bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-600 group-hover:text-white transition">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-950 leading-relaxed">
                      {chap}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer / Info Bar */}
        <div className="bg-white border-t border-slate-200 px-4 py-2.5 sm:px-6 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-emerald-900">
              {module.author || 'Tim Kurikulum WIC'}
            </span>
            {module.target_grades && (
              <span className="hidden sm:inline text-slate-400">
                • Sasaran: {module.target_grades}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Sinkron Multi-Device Aktif
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
