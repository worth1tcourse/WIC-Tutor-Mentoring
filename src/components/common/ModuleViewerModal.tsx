import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  FileText,
  Printer,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { normalizeUrl } from '../../lib/utils';

interface ModuleViewerModalProps {
  module: TeachingModule | null;
  isOpen: boolean;
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  isAdmin?: boolean;
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

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function ModuleViewerModal({
  module,
  isOpen,
  onClose,
  showToast,
  isAdmin = false
}: ModuleViewerModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [copied, setCopied] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const viewerIframeRef = useRef<HTMLIFrameElement | null>(null);

  const tutorCanPrint = Boolean(module?.allow_print);
  const tutorCanOpenExternal = module ? module.allow_external_link !== false : true;
  const canPrint = Boolean(isAdmin || tutorCanPrint);
  const canOpenExternal = Boolean(isAdmin || tutorCanOpenExternal);

  // Reset iframe error when switching modules
  useEffect(() => {
    setIframeError(false);
  }, [module?.id, module?.app_url]);

  // Block Ctrl+P / Cmd+P keyboard shortcut when print is disabled for tutors
  useEffect(() => {
    if (!isOpen || !module || canPrint) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        if (showToast) {
          showToast('Admin menonaktifkan izin cetak (Print) untuk modul ini.', 'error');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, module, canPrint, showToast]);

  if (!isOpen || !module) return null;

  const rawUrl = module.app_url || '';
  const cleanUrl = normalizeUrl(rawUrl);
  const { embedUrl, isGoogleDrive, isDirectFile, isDirectImage } = getEmbeddableUrl(rawUrl);

  const handleCopyLink = () => {
    if (!cleanUrl || !canOpenExternal) return;
    navigator.clipboard.writeText(cleanUrl);
    setCopied(true);
    if (showToast) showToast('Link modul ajar berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWa = () => {
    if (!cleanUrl || !canOpenExternal) return;
    const msg = `*MODUL AJAR RESMI WORTH IT COURSE (WIC)*\n\n📖 *${module.title}*\n🎯 Level: *${module.level}*\n${module.target_grades ? `👥 Sasaran: ${module.target_grades}\n` : ''}\n🔗 Tautan Akses Modul: ${cleanUrl}\n\nSilakan diakses untuk persiapan dan panduan materi pembelajaran.`;
    const waAnchor = document.createElement('a');
    waAnchor.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    waAnchor.target = '_blank';
    waAnchor.rel = 'noopener noreferrer';
    waAnchor.click();
  };

  const cleanupHiddenFrame = (frame: HTMLIFrameElement) => {
    setTimeout(() => {
      try {
        if (frame.parentNode) frame.parentNode.removeChild(frame);
      } catch {
        // ignore cleanup error
      }
      setIsPrinting(false);
    }, 1500);
  };

  const handlePrintModule = () => {
    if (!canPrint) {
      if (showToast) showToast('Admin menonaktifkan izin cetak (Print) untuk modul ini.', 'error');
      return;
    }
    if (!cleanUrl) {
      if (showToast) showToast('Belum ada file atau tautan materi untuk dicetak.', 'info');
      return;
    }

    setIsPrinting(true);

    // 1. Direct Image (data:image/... or uploaded/external image file)
    if (isDirectImage) {
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.style.visibility = 'hidden';
      document.body.appendChild(printFrame);

      const doc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (!doc || !printFrame.contentWindow) {
        cleanupHiddenFrame(printFrame);
        if (showToast) showToast('Browser tidak dapat membuka dialog cetak.', 'error');
        return;
      }

      const chaptersHtml = (module.chapters && module.chapters.length > 0)
        ? `<div class="chapters"><h3>Silabus Bab (${module.chapters.length})</h3><ol>${module.chapters.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ol></div>`
        : '';

      doc.open();
      doc.write(`<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Print Modul - ${escapeHtml(module.title)}</title>
            <style>
              @page { margin: 14mm; }
              body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 0; }
              .header { border-bottom: 2px solid #064e3b; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
              .brand { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #047857; }
              .title { font-size: 18px; font-weight: 900; margin: 4px 0 0; text-transform: uppercase; }
              .meta { font-size: 11px; color: #475569; text-align: right; }
              .img-wrap { text-align: center; page-break-inside: avoid; }
              .img-wrap img { max-width: 100%; max-height: 82vh; object-fit: contain; border-radius: 8px; }
              .chapters { margin-top: 20px; page-break-before: auto; font-size: 12px; }
              .chapters h3 { font-size: 13px; text-transform: uppercase; color: #064e3b; margin-bottom: 6px; }
              .chapters ol { margin: 0; padding-left: 18px; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="brand">Worth It Course (WIC) • Modul Ajar Resmi</div>
                <div class="title">${escapeHtml(module.title)}</div>
              </div>
              <div class="meta">
                <div><strong>Room:</strong> ${escapeHtml(module.level)}</div>
                <div>${escapeHtml(module.author || 'Tim Kurikulum WIC')}</div>
              </div>
            </div>
            <div class="img-wrap">
              <img id="mod-print-img" src="${escapeHtml(embedUrl)}" alt="${escapeHtml(module.title)}" />
            </div>
            ${chaptersHtml}
          </body>
        </html>`);
      doc.close();

      const img = doc.getElementById('mod-print-img') as HTMLImageElement | null;
      const triggerPrint = () => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch {
          if (showToast) showToast('Gagal memicu dialog print. Silakan coba lagi.', 'error');
        } finally {
          cleanupHiddenFrame(printFrame);
        }
      };

      if (img && !img.complete) {
        img.onload = triggerPrint;
        img.onerror = triggerPrint;
      } else {
        setTimeout(triggerPrint, 250);
      }
      return;
    }

    // 2. Same-origin uploaded PDF / direct server file (/uploads/... or blob:)
    const isSameOriginFile =
      cleanUrl.startsWith('/') ||
      cleanUrl.startsWith('blob:') ||
      (typeof window !== 'undefined' && cleanUrl.startsWith(window.location.origin));

    if (isSameOriginFile) {
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.style.visibility = 'hidden';
      printFrame.src = cleanUrl;
      printFrame.onload = () => {
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch {
            if (showToast) showToast('Gunakan ikon Print bawaan di bilah PDF untuk mencetak dokumen ini.', 'info');
          } finally {
            cleanupHiddenFrame(printFrame);
          }
        }, 350);
      };
      printFrame.onerror = () => {
        cleanupHiddenFrame(printFrame);
        if (showToast) showToast('Gagal memuat dokumen untuk dicetak.', 'error');
      };
      document.body.appendChild(printFrame);
      return;
    }

    // 3. Cross-origin embed (Google Drive / Canva / Notion / External PDF)
    try {
      if (viewerIframeRef.current?.contentWindow) {
        viewerIframeRef.current.contentWindow.focus();
        viewerIframeRef.current.contentWindow.print();
        setIsPrinting(false);
        return;
      }
    } catch {
      // Expected for cross-origin iframes (CORS security policy)
    }

    setIsPrinting(false);
    if (showToast) {
      showToast(
        canOpenExternal
          ? 'File dari Google Drive/Cloud eksternal: klik ikon Print di sudut pratinjau dokumen atau buka lewat tombol "Tab Baru" untuk mencetak.'
          : 'Gunakan ikon Print bawaan yang tersedia di dalam tampilan dokumen (atau minta Admin mengunggah file PDF langsung ke server WIC).',
        'info'
      );
    }
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
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3 border-b border-emerald-800/40 shrink-0 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gold-500/20 text-gold-400 border border-gold-500/30 flex items-center justify-center shrink-0">
              <BookOpen size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="bg-gold-500/20 text-gold-400 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-gold-500/30">
                  Room {module.level}
                </span>
                <span className="bg-white/10 text-emerald-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {module.app_platform || 'Modul Digital'}
                </span>
                {!canOpenExternal && (
                  <span className="bg-amber-500/20 text-amber-200 border border-amber-400/30 text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                    <Lock size={9} /> Hanya Baca di Dashboard
                  </span>
                )}
                {!canPrint && (
                  <span className="bg-rose-500/20 text-rose-200 border border-rose-400/30 text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                    <Lock size={9} /> Print Dikunci
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-white truncate mt-0.5">
                {module.title}
              </h2>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {cleanUrl && canPrint && (
              <button
                type="button"
                onClick={handlePrintModule}
                disabled={isPrinting}
                className="bg-gold-400 hover:bg-gold-500 text-emerald-950 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-60 cursor-pointer"
                title="Cetak / Print Modul Ajar"
              >
                <Printer size={13} />
                <span className="hidden sm:inline">{isPrinting ? 'Menyiapkan...' : 'Print Modul'}</span>
              </button>
            )}

            {cleanUrl && canOpenExternal && (
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
                  type="button"
                  onClick={handleShareWa}
                  className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition cursor-pointer"
                  title="Bagikan ke WhatsApp"
                >
                  <Share2 size={15} />
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title="Salin Tautan"
                >
                  {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                </button>
              </>
            )}

            {module.chapters && module.chapters.length > 0 && (
              <button
                type="button"
                onClick={() => setShowChapters(!showChapters)}
                className={`p-2 rounded-xl transition cursor-pointer ${
                  showChapters ? 'bg-gold-500 text-emerald-950 font-black' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title="Daftar Bab & Silabus"
              >
                <ListOrdered size={15} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition hidden sm:flex cursor-pointer"
              title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 transition cursor-pointer"
              title="Tutup Viewer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Notice for Google Drive links */}
        {isGoogleDrive && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-3 text-[11px] text-amber-900 shrink-0 print:hidden">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-600 shrink-0" />
              <span>
                <strong>Tautan Google Drive Terdeteksi:</strong> Jika modul meminta izin atau tidak muncul, pastikan link Drive diatur ke <em>"Siapa saja yang memiliki link dapat melihat"</em>.
              </span>
            </div>
            {cleanUrl && canOpenExternal && (
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

        {/* Print Shield Notice (only visible if user invokes browser File -> Print on restricted module) */}
        {!canPrint && (
          <div className="hidden print:flex flex-col items-center justify-center p-16 text-center bg-white">
            <h3 className="text-lg font-black uppercase text-slate-900">
              Dokumen Dilindungi — Tidak Diizinkan untuk Dicetak
            </h3>
            <p className="text-sm text-slate-600 mt-2 max-w-md">
              Admin Worth It Course (WIC) menonaktifkan izin cetak (Print) untuk modul "{module.title}". Modul ini hanya diizinkan dibaca melalui Portal Dashboard WIC.
            </p>
          </div>
        )}

        {/* Main Content Area */}
        <div className={`flex-1 flex overflow-hidden relative bg-slate-100 ${!canPrint ? 'print:hidden' : ''}`}>
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
                  {canOpenExternal
                    ? 'Penyedia penyimpanan membatasi tampilan di dalam frame. Anda dapat langsung membuka atau mengunduh modul secara utuh di tab baru.'
                    : 'Penyedia tautan eksternal membatasi pratinjau langsung, sementara Admin mengunci akses link eksternal untuk modul ini. Hubungi Admin agar file diunggah langsung sebagai PDF ke server WIC.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {canOpenExternal && (
                    <a
                      href={cleanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-950 hover:bg-emerald-900 text-gold-400 px-5 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider transition flex items-center gap-2 shadow-md"
                    >
                      <ExternalLink size={14} /> Buka Modul di Tab Baru
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setIframeError(false)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-bold uppercase text-xs cursor-pointer"
                  >
                    Coba Muat Ulang
                  </button>
                </div>
              </div>
            ) : isDirectImage ? (
              <div
                className="relative w-full h-full bg-slate-900/95 overflow-auto flex items-center justify-center p-4"
                onContextMenu={!canPrint && !canOpenExternal ? (e) => e.preventDefault() : undefined}
              >
                <img
                  src={embedUrl}
                  alt={module.title}
                  draggable={canOpenExternal}
                  className={`max-w-full max-h-full object-contain rounded-xl shadow-2xl ${!canOpenExternal ? 'select-none' : ''}`}
                />
              </div>
            ) : (
              <div className="relative w-full h-full bg-slate-200">
                <iframe
                  ref={viewerIframeRef}
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
                  type="button"
                  onClick={() => setShowChapters(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
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
        <div className="bg-white border-t border-slate-200 px-4 py-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 shrink-0 print:hidden">
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
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin ? (
              <span className="text-[10px] font-black bg-slate-900 text-gold-400 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <ShieldCheck size={11} />
                Izin Tutor: Print {tutorCanPrint ? 'Aktif' : 'Dikunci'} • Link Luar {tutorCanOpenExternal ? 'Aktif' : 'Dikunci'}
              </span>
            ) : (
              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                {canPrint ? (
                  <>
                    <Printer size={11} className="text-emerald-700" /> Boleh Print
                  </>
                ) : (
                  <>
                    <Lock size={11} className="text-rose-600" /> Print Dikunci
                  </>
                )}
                <span className="mx-1 text-slate-300">•</span>
                {canOpenExternal ? 'Link Eksternal Aktif' : 'Hanya Baca di Dashboard'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
