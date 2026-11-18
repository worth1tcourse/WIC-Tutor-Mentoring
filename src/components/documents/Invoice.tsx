import React from 'react';
import { User, AppData } from '../../types';
import { WIC_ASSETS, EMBEDDED_WIC_LOGO } from '../../constants';
import { terbilang, formatCurrency } from '../../lib/utils';
import { calculateTutorPayroll, normalizeTeachingMode } from '../../lib/payroll';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Download, 
  Printer, 
  X, 
  Award, 
  BookOpen, 
  ShieldCheck, 
  ZoomIn, 
  ZoomOut, 
  Smartphone, 
  CreditCard, 
  Banknote, 
  Building2, 
  MapPin, 
  FileText, 
  Coins, 
  UserCheck, 
  User as UserIcon, 
  Phone 
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';

interface InvoiceProps {
  user: User;
  appData: AppData;
  onClose: () => void;
}

export default function Invoice({ user, appData, onClose }: InvoiceProps) {
  const payroll = calculateTutorPayroll(user, appData);
  const periodAtt = payroll.periodAttendance;
  const mandiriCount = payroll.mandiriCount;
  const teamCount = payroll.teamCount;
  const privateCount = payroll.privateCount;
  const semiPrivateCount = payroll.semiPrivateCount;

  const moduleSessions = periodAtt.filter(
    a => normalizeTeachingMode(a.mode) === 'Semi Private' && Boolean(a.module_created)
  );
  const moduleCount = payroll.moduleCount;
  const moduleBonusRate = Number(appData.settings.semi_private_module_bonus) || 25000;

  const statusRate = payroll.rate;
  const subMandiri = payroll.subMandiri;
  const subTeam = payroll.subTeam;
  const subPrivate = payroll.subPrivate;
  const subSemiPrivate = payroll.subSemiPrivate;
  const subModule = payroll.moduleTotal;

  const approvedProjects = payroll.approvedProjects;
  const projectTotal = payroll.projectTotal;
  const grandTotal = payroll.grandTotal;

  const [isDownloading, setIsDownloading] = React.useState(false);
  const [docHeight, setDocHeight] = React.useState(1160);

  // Measure rendered height of the invoice element
  React.useEffect(() => {
    const el = document.getElementById('invoice-capture');
    if (el) {
      setDocHeight(Math.max(1160, el.scrollHeight));
    }
  }, [user, periodAtt, approvedProjects]);

  // Robust offscreen capture guaranteeing 100% full desktop PC layout export on mobile & desktop
  const handleDownload = async () => {
    const originalEl = document.getElementById('invoice-capture');
    if (!originalEl || isDownloading) return;

    setIsDownloading(true);
    let offscreenWrapper: HTMLDivElement | null = null;
    try {
      // 1. Create an isolated off-screen desktop viewport container
      offscreenWrapper = document.createElement('div');
      offscreenWrapper.style.position = 'fixed';
      offscreenWrapper.style.left = '-99999px';
      offscreenWrapper.style.top = '0';
      offscreenWrapper.style.width = '820px';
      offscreenWrapper.style.minWidth = '820px';
      offscreenWrapper.style.maxWidth = '820px';
      offscreenWrapper.style.height = 'auto';
      offscreenWrapper.style.overflow = 'visible';
      offscreenWrapper.style.zIndex = '-99999';
      offscreenWrapper.style.backgroundColor = '#ffffff';

      // 2. Clone the invoice DOM tree
      const clone = originalEl.cloneNode(true) as HTMLElement;
      clone.id = 'invoice-export-clone';
      // Force absolute unscaled desktop dimensions on the clone
      clone.style.transform = 'none';
      clone.style.webkitTransform = 'none';
      clone.style.transformOrigin = 'top left';
      clone.style.margin = '0';
      clone.style.width = '820px';
      clone.style.minWidth = '820px';
      clone.style.maxWidth = '820px';
      clone.style.boxShadow = 'none';
      clone.style.borderRadius = '0';

      offscreenWrapper.appendChild(clone);
      document.body.appendChild(offscreenWrapper);

      // 3. Ensure all images in the clone are loaded before capturing
      const images = Array.from(clone.querySelectorAll('img'));
      await Promise.all(
        images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(res => {
            img.onload = res;
            img.onerror = res;
          });
        })
      );

      // Brief delay to allow layout engine & fonts to settle
      await new Promise(res => setTimeout(res, 150));

      const captureHeight = Math.max(1160, clone.scrollHeight || docHeight);

      // 4. Capture at 2x resolution (1640px wide) - ultra crisp, print-ready, zero memory crash
      const dataUrl = await domToPng(clone, {
        scale: 2,
        width: 820,
        height: captureHeight,
        backgroundColor: '#ffffff',
        quality: 1
      });

      // 5. Trigger download
      const cleanPeriod = (appData.settings.period_text || 'Periode').replace(/\s+/g, '_');
      const cleanName = (user.name || user.username || 'Tutor').replace(/\s+/g, '_');
      const link = document.createElement('a');
      link.download = `Invoice_Honorarium_${cleanName}_${cleanPeriod}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export invoice error:", err);
      alert("Gagal mengunduh gambar otomatis. Silakan coba tombol 'Cetak / Unduh PDF A4'.");
    } finally {
      if (offscreenWrapper && document.body.contains(offscreenWrapper)) {
        document.body.removeChild(offscreenWrapper);
      }
      setIsDownloading(false);
    }
  };

  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const isCertified = payroll.isCertified;
  const tutorBarcodeId = `T-${user.id || '1792681123438'}`;

  // Responsive Full Viewer A4 scale calculation for HP & PC
  const [windowWidth, setWindowWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [isFitScreen, setIsFitScreen] = React.useState(true);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [paymentMethod, setPaymentMethod] = React.useState<'TF' | 'CASH'>(
    appData.settings.default_payment_method || 'TF'
  );

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const standardA4Width = 820;
  const standardA4Height = 1160;

  // On Mobile (HP): auto-fit width so the entire A4 sheet is visible as a Full Viewer without horizontal scrolling
  const isMobile = windowWidth < 880;
  const fitScale = Math.max(0.34, Math.min(1, (windowWidth - 28) / standardA4Width));
  const activeScale = isFitScreen && isMobile ? fitScale : zoomLevel;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md overflow-y-auto p-2 sm:p-4 md:p-8 custom-scroll animate-in fade-in">
       {/* Embedded Standard A4 Print Stylesheet */}
       <style>{`
         @media print {
           @page {
             size: A4 portrait;
             margin: 6mm 4mm;
           }
           html, body {
             margin: 0 !important;
             padding: 0 !important;
             background: white !important;
             -webkit-print-color-adjust: exact !important;
             print-color-adjust: exact !important;
           }
           .no-print {
             display: none !important;
           }
           #invoice-scalable-outer {
             width: 100% !important;
             height: auto !important;
             margin: 0 !important;
             padding: 0 !important;
             overflow: visible !important;
           }
           #invoice-capture {
             transform: none !important;
             width: 100% !important;
             max-width: 100% !important;
             min-height: auto !important;
             box-shadow: none !important;
             border: none !important;
             margin: 0 !important;
             padding: 4mm !important;
           }
         }
       `}</style>

       {/* Top Action Controls & View Mode Toolbar */}
       <div className="max-w-[880px] mx-auto w-full mb-4 flex flex-col sm:flex-row justify-between items-center gap-3 no-print animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
             <button 
                onClick={() => window.print()} 
                className="bg-white hover:bg-slate-100 text-slate-900 px-4 py-2.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                title="Cetak format kertas A4 atau simpan sebagai PDF"
             >
                <Printer size={15} /> Cetak / Unduh PDF A4
             </button>
             <button 
                onClick={handleDownload} 
                disabled={isDownloading}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-75 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                title="Unduh visual slip invoice resolusi tinggi utuh mode PC"
             >
                {isDownloading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memproses HD (PC)...</span>
                  </>
                ) : (
                  <>
                    <Download size={15} /> Unduh Gambar HD (PC)
                  </>
                )}
             </button>

             {/* Segmented Toggle Sistem Penerimaan Cash atau TF */}
             <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/20 text-white">
                <span className="text-[9px] font-bold uppercase px-2 text-slate-300 hidden sm:inline">Penerimaan:</span>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('TF')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition cursor-pointer ${
                    paymentMethod === 'TF'
                      ? 'bg-emerald-950 text-gold-400 border border-gold-400/40 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Penerimaan via Transfer Bank"
                >
                  <CreditCard size={13} /> TF
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition cursor-pointer ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-950 text-gold-400 border border-gold-400/40 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Penerimaan via Tunai Kasir"
                >
                  <Banknote size={13} /> Cash
                </button>
             </div>
          </div>

          {/* Viewer Mode & Zoom Controls for HP / PC */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
             {isMobile ? (
                <div className="flex items-center gap-1.5">
                   <button
                      onClick={() => {
                        setIsFitScreen(!isFitScreen);
                        if (isFitScreen) setZoomLevel(1);
                      }}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 border transition cursor-pointer ${
                        isFitScreen
                          ? 'bg-emerald-950 text-gold-400 border-gold-400/40 shadow-sm'
                          : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                      }`}
                      title="Beralih antara pas layar HP dan ukuran asli PC 100%"
                   >
                      <Smartphone size={13} /> {isFitScreen ? 'Pas Layar HP' : 'Mode PC 100%'}
                   </button>

                   <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/20 text-white">
                      <button
                        onClick={() => {
                          setIsFitScreen(false);
                          setZoomLevel(prev => Math.max(0.5, prev - 0.15));
                        }}
                        className="p-1 hover:bg-white/20 rounded text-xs"
                        title="Perkecil"
                      >
                        <ZoomOut size={13} />
                      </button>
                      <span className="px-1.5 text-[9px] font-mono font-bold">
                        {Math.round(activeScale * 100)}%
                      </span>
                      <button
                        onClick={() => {
                          setIsFitScreen(false);
                          setZoomLevel(prev => Math.min(1.4, prev + 0.15));
                        }}
                        className="p-1 hover:bg-white/20 rounded text-xs"
                        title="Perbesar"
                      >
                        <ZoomIn size={13} />
                      </button>
                   </div>
                </div>
             ) : (
                <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/20 text-white">
                   <button
                     onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.1))}
                     className="p-1.5 hover:bg-white/20 rounded-lg text-xs cursor-pointer"
                     title="Perkecil"
                   >
                     <ZoomOut size={14} />
                   </button>
                   <span className="px-2 text-[10px] font-mono font-bold">
                     {Math.round(activeScale * 100)}%
                   </span>
                   <button
                     onClick={() => setZoomLevel(prev => Math.min(1.4, prev + 0.1))}
                     className="p-1.5 hover:bg-white/20 rounded-lg text-xs cursor-pointer"
                     title="Perbesar"
                   >
                     <ZoomIn size={14} />
                   </button>
                   <button
                     onClick={() => setZoomLevel(1)}
                     className="px-2 py-1 text-[9px] font-black uppercase hover:bg-white/20 rounded-md ml-1 cursor-pointer"
                   >
                     Reset
                   </button>
                </div>
             )}

             <button 
                onClick={onClose} 
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer"
                title="Tutup Invoice"
             >
                <X size={18} />
             </button>
          </div>
       </div>

       {/* Invoice Document Paper Container with Full-Viewer A4 Scalable Box */}
       <div 
          className="flex-1 w-full overflow-x-auto flex flex-col items-center pb-12 custom-scroll"
       >
          <div
             id="invoice-scalable-outer"
             className="transition-all duration-200"
             style={{
                width: isMobile && isFitScreen ? `${standardA4Width * activeScale}px` : `${standardA4Width * zoomLevel}px`,
                height: isMobile && isFitScreen ? `${docHeight * activeScale}px` : undefined,
                minWidth: isMobile && !isFitScreen ? `${standardA4Width * zoomLevel}px` : undefined,
                overflow: isMobile && isFitScreen ? 'hidden' : 'visible'
             }}
          >
             <div 
                id="invoice-capture" 
                className="w-[820px] bg-white text-slate-900 p-10 shadow-2xl relative flex flex-col border border-slate-300 rounded-sm shrink-0 transition-transform origin-top-left overflow-hidden"
                style={{ 
                  minHeight: `${standardA4Height}px`,
                  transform: activeScale !== 1 ? `scale(${activeScale})` : undefined,
                  transformOrigin: 'top left',
                  backgroundImage: `radial-gradient(circle at top right, rgba(6, 78, 59, 0.03) 0%, transparent 60%)` 
                }}
             >
             {/* Decorative Corner Geometric Bands (Design as in Image 3) */}
             {/* Top-Left Geometric Corner */}
             <div className="absolute top-0 left-0 w-32 h-32 pointer-events-none overflow-hidden z-20">
                <div className="absolute -top-16 -left-16 w-32 h-32 bg-[#031d16] transform rotate-45 shadow-md" />
                <div className="absolute -top-14 -left-14 w-32 h-32 border-4 border-[#c28e2b]/60 transform rotate-45" />
             </div>

             {/* Top-Right Geometric Corner */}
             <div className="absolute top-0 right-0 w-36 h-36 pointer-events-none overflow-hidden z-20">
                <div className="absolute -top-18 -right-18 w-36 h-36 bg-[#031d16] transform rotate-45 shadow-md" />
                <div className="absolute -top-16 -right-16 w-36 h-36 border-4 border-[#c28e2b]/60 transform rotate-45" />
             </div>

             {/* Bottom-Left Geometric Corner */}
             <div className="absolute bottom-0 left-0 w-28 h-28 pointer-events-none overflow-hidden z-20">
                <div className="absolute -bottom-14 -left-14 w-28 h-28 bg-[#031d16] transform rotate-45 shadow-md" />
                <div className="absolute -bottom-12 -left-12 w-28 h-28 border-4 border-[#c28e2b]/60 transform rotate-45" />
             </div>

             {/* Bottom-Right Geometric Corner */}
             <div className="absolute bottom-0 right-0 w-28 h-28 pointer-events-none overflow-hidden z-20">
                <div className="absolute -bottom-14 -right-14 w-28 h-28 bg-[#031d16] transform rotate-45 shadow-md" />
                <div className="absolute -bottom-12 -right-12 w-28 h-28 border-4 border-[#c28e2b]/60 transform rotate-45" />
             </div>

             {/* Guilloche Frame Border */}
             <div className="absolute inset-3 border border-emerald-950/20 pointer-events-none rounded-sm" />
             <div className="absolute inset-4 border border-[#c28e2b]/30 pointer-events-none rounded-sm" />

             {/* Background Watermark Logo */}
             <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none">
                 <img 
                   src={appData.settings.logo_url || WIC_ASSETS.LOGO} 
                   className="w-[520px] object-contain" 
                   alt="Watermark WIC" 
                   onError={(e) => { (e.target as HTMLImageElement).src = WIC_ASSETS.LOGO_FALLBACK_URL; }}
                 />
             </div>

             {/* Top Header Banner */}
             <div className="relative z-10 -mx-10 -mt-10 mb-6 bg-gradient-to-r from-[#031c15] via-[#073226] to-[#041e17] text-white px-10 py-6 border-b-4 border-[#c28e2b] shadow-md flex justify-between items-center">
                <div className="flex items-center gap-6 pl-4">
                   {/* Logo Ukuran Lebih Besar Sesuai Permintaan */}
                   <div className="relative shrink-0 flex items-center justify-center">
                      <img 
                        crossOrigin="anonymous" 
                        src={appData.settings.logo_url || WIC_ASSETS.LOGO} 
                        alt="WIC Logo" 
                        className="h-28 w-auto max-w-[160px] object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] transform hover:scale-105 transition" 
                        onError={(e) => { (e.target as HTMLImageElement).src = WIC_ASSETS.LOGO_FALLBACK_URL; }}
                      />
                   </div>

                   {/* Identitas Lembaga */}
                   <div className="space-y-1 text-left">
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase font-serif drop-shadow-sm">
                        {appData.settings.institution_name || 'WORTH IT COURSE (WIC)'}
                      </h1>
                      <div className="flex items-center gap-2">
                        <span className="h-px w-6 bg-[#c28e2b]/70" />
                        <p className="text-[10px] sm:text-[11px] tracking-[0.25em] font-bold text-[#c28e2b] uppercase drop-shadow-xs">
                          {appData.settings.institution_tagline || 'WHOEVER WE ARE, WE ARE WORTH IT'}
                        </p>
                        <span className="h-px w-6 bg-[#c28e2b]/70" />
                      </div>
                      <p className="text-[9px] sm:text-[9.5px] text-slate-300 max-w-lg leading-relaxed flex items-center gap-1.5 pt-0.5">
                        <MapPin size={11} className="text-[#c28e2b] shrink-0 inline" />
                        <span>{appData.settings.institution_address || 'Ruko Perkantoran Boulevard Blok A08/12, Citra Raya Jambi, Ds. Pematang Gajah, Kec. Jambi Luar Kota, Kab. Muaro Jambi – 081359199251'}</span>
                      </p>
                   </div>
                </div>

                {/* Header Kanan: Status & Referensi Sesuai Gambar 3 */}
                <div className="text-right pr-4 space-y-1 shrink-0">
                   <div className="flex flex-col items-end gap-1">
                      <div className="bg-[#031d16]/90 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest shadow-inner">
                         SLIP PENGHASILAN RESMI
                      </div>
                      <span className="bg-[#c28e2b] text-slate-950 text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-xs">
                         V2 OFFICIAL
                      </span>
                   </div>
                   <div className="pt-1.5 text-right font-mono">
                      <p className="text-[10px] text-slate-300 font-bold tracking-wider">
                        REF : <span className="text-white font-black">WIC/{appData.settings.period}/{user.username.toUpperCase()}</span>
                      </p>
                      <p className="text-[9.5px] text-slate-300 font-bold uppercase">
                        PERIODE : <strong className="text-[#c28e2b]">{appData.settings.period_text.toUpperCase()}</strong>
                      </p>
                   </div>
                </div>
             </div>

             {/* Headline Judul INVOICE HONORARIUM Sesuai Gambar 3 */}
             <div className="flex flex-row items-center justify-between gap-4 pb-4 mb-5 border-b-2 border-emerald-950/20 relative z-10">
                <div className="flex flex-col">
                   <div className="flex items-baseline gap-2.5">
                      <h2 className="text-4xl font-black font-serif tracking-tight text-emerald-950">
                        INVOICE
                      </h2>
                      <h2 className="text-4xl font-black font-serif tracking-tight text-[#b8860b]">
                        HONORARIUM
                      </h2>
                   </div>
                   <p className="text-xs font-bold uppercase tracking-[0.35em] text-slate-700 mt-0.5">
                      TUTOR WORTH IT COURSE (WIC)
                   </p>
                </div>

                {/* Box Penerimaan Bersih Tanpa Bold Berlebih Sesuai Gambar 3 */}
                <div className="flex items-center gap-3 bg-emerald-50/80 border border-emerald-300/80 rounded-xl px-4 py-2.5 text-emerald-950 shadow-2xs self-center">
                   <div className="w-8 h-8 rounded-lg bg-emerald-100/90 text-emerald-900 flex items-center justify-center shrink-0">
                      <FileText size={18} />
                   </div>
                   <div className="text-left">
                      <p className="text-[8.5px] font-bold uppercase tracking-wider text-emerald-800">
                        PENERIMAAN :
                      </p>
                      <p className="text-xs font-black uppercase tracking-tight text-emerald-950">
                        {paymentMethod === 'TF' ? 'TRANSFER BANK (TF)' : 'TUNAI LANGSUNG (CASH)'}
                      </p>
                   </div>
                </div>
             </div>

             {/* Tutor Details Grid Banner (Sesuai Gambar 3) */}
             <div className="grid grid-cols-2 gap-6 mb-6 text-xs relative z-10">
                {/* Kartu Kiri: Penerima Honorarium / Tutor */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                   <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[9px] font-black uppercase tracking-wider">
                      <UserCheck size={12} className="text-emerald-700" /> PENERIMA HONORARIUM / TUTOR
                   </div>
                   <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight font-sans">
                      {user.name}
                   </h3>
                   <div className="space-y-1 text-slate-600 font-mono text-[11px] pt-1">
                      <div className="flex items-center gap-2">
                        <UserIcon size={12} className="text-slate-400" />
                        <span>ID Tutor : <strong className="text-slate-800">{user.id || tutorBarcodeId}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="text-slate-400" />
                        <span>WhatsApp : <strong className="text-slate-800">{user.wa || user.username || '-'}</strong></span>
                      </div>
                   </div>
                </div>

                {/* Kartu Kanan: Status Jabatan / Jenjang Honor */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                   <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[9px] font-black uppercase tracking-wider self-start">
                      <Award size={12} className="text-emerald-700" /> STATUS JABATAN / JENJANG HONOR
                   </div>
                   <div className="my-auto py-2">
                      <div className="bg-emerald-950 text-white font-black text-center py-2.5 px-4 rounded-xl text-base tracking-wider uppercase shadow-xs">
                         {user.status_tutor || 'PROBATION'}
                      </div>
                      <div className="bg-slate-100 text-slate-700 text-center py-1.5 px-3 rounded-lg text-[9.5px] font-black tracking-wider uppercase mt-2">
                         {isCertified ? 'BERIJAZAH TERSERTIFIKASI' : 'STANDAR TERVERIFIKASI'}
                         {user.certification_name && ` (${user.certification_name})`}
                      </div>
                   </div>
                </div>
             </div>

             {/* Calculation Table (Sesuai Gambar 3) */}
             <div className="relative z-10 flex-1">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-emerald-950 text-white text-[10px] font-black uppercase tracking-wider">
                         <th className="py-3 px-3 text-center w-12 rounded-tl-xl">NO</th>
                         <th className="py-3 px-4">DESKRIPSI KOMPONEN HONORARIUM</th>
                         <th className="py-3 px-4 text-center">VOLUME</th>
                         <th className="py-3 px-4 text-right">TARIF SATUAN</th>
                         <th className="py-3 px-4 text-right rounded-tr-xl">SUBTOTAL</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 text-xs">
                      {/* Sesi Mandiri (No 1) */}
                      <tr className="hover:bg-slate-50/80 transition-colors">
                         <td className="py-3.5 px-3 text-center">
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold text-xs inline-flex items-center justify-center">
                               1
                            </span>
                         </td>
                         <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 uppercase">SESI MENGAJAR KELAS MANDIRI</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Tutor memandu kelas mandiri reguler terjadwal</p>
                         </td>
                         <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">{mandiriCount} Sesi</td>
                         <td className="py-3.5 px-4 text-right font-mono text-slate-600">{formatCurrency(statusRate.mandiri)}</td>
                         <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{formatCurrency(subMandiri)}</td>
                      </tr>

                      {/* Sesi Team Teaching (No 2) */}
                      <tr className="hover:bg-slate-50/80 transition-colors">
                         <td className="py-3.5 px-3 text-center">
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold text-xs inline-flex items-center justify-center">
                               2
                            </span>
                         </td>
                         <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 uppercase">SESI MENGAJAR TEAM TEACHING</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Kolaborasi pembelajaran terpadu dua pengajar</p>
                         </td>
                         <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">{teamCount} Sesi</td>
                         <td className="py-3.5 px-4 text-right font-mono text-slate-600">{formatCurrency(statusRate.team)}</td>
                         <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{formatCurrency(subTeam)}</td>
                      </tr>

                      {/* Sesi Private (No 3) */}
                      <tr className="hover:bg-slate-50/80 transition-colors">
                         <td className="py-3.5 px-3 text-center">
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold text-xs inline-flex items-center justify-center">
                               3
                            </span>
                         </td>
                         <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 uppercase">SESI MENGAJAR KELAS PRIVATE</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Pendampingan privat personal (Tarif Mandiri – 10%)</p>
                         </td>
                         <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">{privateCount} Sesi</td>
                         <td className="py-3.5 px-4 text-right font-mono text-slate-600">{formatCurrency(statusRate.private)}</td>
                         <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{formatCurrency(subPrivate)}</td>
                      </tr>

                      {/* Sesi Semi Private (Jika Ada) */}
                      {semiPrivateCount > 0 && (
                        <tr className="hover:bg-slate-50/80 transition-colors">
                           <td className="py-3.5 px-3 text-center">
                              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold text-xs inline-flex items-center justify-center">
                                 4
                              </span>
                           </td>
                           <td className="py-3.5 px-4">
                              <p className="font-bold text-slate-900 uppercase">SESI MENGAJAR SEMI PRIVATE</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Program intensif kelompok kecil terarah</p>
                           </td>
                           <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">{semiPrivateCount} Sesi</td>
                           <td className="py-3.5 px-4 text-right font-mono text-slate-600">{formatCurrency(statusRate.semi_private)}</td>
                           <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{formatCurrency(subSemiPrivate)}</td>
                        </tr>
                      )}

                      {/* Honor Pembuatan Modul Materi Semi Private */}
                      {moduleCount > 0 && (
                        <tr className="hover:bg-slate-50/80 transition-colors">
                           <td className="py-3.5 px-3 text-center">
                              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs inline-flex items-center justify-center">
                                 +
                              </span>
                           </td>
                           <td className="py-3.5 px-4">
                              <p className="font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                                <BookOpen size={13} /> Honor Pembuatan Modul Materi Semi Private
                              </p>
                              <div className="text-[10px] text-slate-500 space-y-0.5 mt-0.5">
                                 {moduleSessions.map((m, idx) => (
                                    <p key={idx}>• Modul: {m.module_title || m.material} ({m.date})</p>
                                 ))}
                              </div>
                           </td>
                           <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-900">{moduleCount} Modul</td>
                           <td className="py-3.5 px-4 text-right font-mono text-slate-600">{formatCurrency(moduleBonusRate)}</td>
                           <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-900">{formatCurrency(subModule)}</td>
                        </tr>
                      )}

                      {/* Proyek Tambahan */}
                      {approvedProjects.length > 0 && (
                         <tr className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-3 text-center">
                               <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs inline-flex items-center justify-center">
                                  +
                               </span>
                            </td>
                            <td className="py-3.5 px-4">
                               <p className="font-bold text-slate-900 uppercase">Kompensasi Proyek Ekstrakurikuler Disetujui</p>
                               <div className="text-[10px] text-slate-500 space-y-0.5 mt-0.5">
                                  {approvedProjects.map((p, i) => (
                                     <p key={i}>• {p.type}: {formatCurrency(p.fee)} ({p.date})</p>
                                  ))}
                               </div>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold">{approvedProjects.length} Item</td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-400">-</td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-900">{formatCurrency(projectTotal)}</td>
                         </tr>
                      )}

                      {/* Tunjangan Operasional */}
                      {user.manual_allowance > 0 && (
                         <tr className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-3 text-center">
                               <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 font-bold text-xs inline-flex items-center justify-center">
                                  +
                               </span>
                            </td>
                            <td className="py-3.5 px-4">
                               <p className="font-bold text-slate-900 uppercase">Tunjangan Operasional & Kinerja</p>
                               <p className="text-[10px] text-slate-400 mt-0.5">{user.allowance_note || 'Tunjangan kinerja & transportasi'}</p>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold">1 Bulan</td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-400">-</td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-900">{formatCurrency(user.manual_allowance)}</td>
                         </tr>
                      )}

                      {/* Bonus Lainnya */}
                      {user.other_fee > 0 && (
                         <tr className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-3 text-center">
                               <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold text-xs inline-flex items-center justify-center">
                                  +
                               </span>
                            </td>
                            <td className="py-3.5 px-4">
                               <p className="font-bold text-slate-900 uppercase">Penghargaan / Bonus Tambahan</p>
                               <p className="text-[10px] text-slate-400 mt-0.5">{user.other_fee_note || 'Bonus prestasi pengajar'}</p>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold">1 Periode</td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-400">-</td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-900">{formatCurrency(user.other_fee)}</td>
                         </tr>
                      )}
                   </tbody>
                </table>

                {/* Banner Total Penghasilan Bersih (Take Home Pay) Sesuai Gambar 3 */}
                <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-[#0a2f24] to-emerald-950 text-white p-4 sm:p-5 flex items-center justify-between shadow-md my-5 relative z-10">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#c28e2b]/20 border border-[#c28e2b]/40 flex items-center justify-center text-[#c28e2b] shrink-0">
                         <Coins size={22} />
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-white">
                         TOTAL PENGHASILAN BERSIH (TAKE HOME PAY)
                      </h4>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="h-8 w-px bg-emerald-700/60 block" />
                      <span className="text-3xl font-black font-mono text-gold-400 tracking-tight">
                         {formatCurrency(grandTotal)}
                      </span>
                   </div>
                </div>

                {/* Terbilang & Sistem Penerimaan Box (Sesuai Gambar 3) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 relative z-10">
                   <div className="flex flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                         <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">TERBILANG :</p>
                         <p className="font-serif italic font-normal text-slate-800 text-sm tracking-wide mt-0.5 leading-relaxed">
                            {terbilang(grandTotal)}
                         </p>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9.5px] font-mono font-black uppercase tracking-wider bg-emerald-50 text-emerald-900 border border-emerald-300">
                            <CreditCard size={13} className="text-emerald-700" />
                            {paymentMethod === 'TF' ? 'LUNAS VIA TRANSFER BANK (TF)' : 'LUNAS TUNAI LANGSUNG (CASH)'}
                         </span>
                      </div>
                   </div>

                   {/* Rincian Rekening & Verifikasi ID */}
                   <div className="flex flex-row items-center justify-between gap-2 text-[9px] text-slate-600">
                      <div className="flex items-center gap-3">
                         <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                            <Building2 size={14} />
                         </div>
                         <div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">METODE PENERIMAAN :</p>
                            <p className="font-black text-slate-900 uppercase">
                               {paymentMethod === 'TF' ? 'TRANSFER BANK (TF)' : 'PEMBAYARAN TUNAI (CASH)'}
                            </p>
                         </div>
                      </div>

                      <div className="flex-1 px-4">
                         <p className="text-[8px] font-bold text-slate-400 uppercase">Rekening Tujuan:</p>
                         <p className="font-bold text-slate-800">
                            {paymentMethod === 'TF' 
                               ? `${user.bank_name || 'BCA / Mandiri / BRI'} (Terverifikasi di Profil Tutor) a.n. ${user.bank_holder || user.name}`
                               : 'Kasir Administrasi Keuangan WIC Pusat • Pembayaran Tunai Sah'
                            }
                         </p>
                      </div>

                      <div className="text-[8.5px] font-mono font-bold text-emerald-950 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                         VERIFIKASI ID: <span className="text-emerald-700 font-black">SAH</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Signatures & Formal Verification Section (Sesuai Gambar 3) */}
             <div className="mt-7 pt-5 border-t-2 border-emerald-950/20 grid grid-cols-3 gap-6 items-end relative z-10 text-xs">
                {/* 1. Direktur Utama (Patented) */}
                <div className="text-center space-y-2 flex flex-col items-center">
                   <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">DISETUJUI OLEH,</p>
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-wider">DIREKTUR UTAMA WIC</p>
                   </div>

                   {/* Full Proportional TTD Container */}
                   <div className="h-24 w-full flex items-center justify-center p-1 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                      <img 
                        src={
                          (appData.settings.director_sign && !appData.settings.director_sign.includes('iili.io'))
                            ? appData.settings.director_sign 
                            : WIC_ASSETS.TTD_DIREKTUR
                        } 
                        alt="TTD Direktur Khoirul Mahmud" 
                        className="max-h-24 max-w-full w-auto object-contain drop-shadow-xs" 
                      />
                   </div>

                   <div>
                      <p className="font-black text-slate-900 text-[11px] underline uppercase tracking-tight">
                        {(appData.settings.director_name && appData.settings.director_name !== 'Ahmad Zaki, M.Pd.')
                          ? appData.settings.director_name
                          : 'Khoirul Mahmud, S. Pd., S. Kom.'}
                      </p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">DIREKSI & PENJAMIN MUTU</p>
                   </div>
                </div>

                {/* 2. Tengah: Bukti Penerimaan Resmi (QR Kode Tutor & Stempel Resmi) */}
                <div className="flex flex-col items-center justify-between relative p-3 rounded-2xl bg-white border-2 border-slate-300 shadow-sm text-center h-full min-h-[160px]">
                   <span className="text-[9px] font-black uppercase text-emerald-900 tracking-wider mb-1.5 flex items-center gap-1">
                      <Award size={13} className="text-[#c28e2b]" /> BUKTI PENERIMAAN RESMI
                   </span>

                   {/* Container QR Kartu Tutor & Stempel Resmi WIC */}
                   <div className="relative flex items-center justify-center my-auto w-full p-2 bg-slate-50/80 rounded-xl border border-slate-200">
                      <div className="relative z-10 p-1.5 bg-white rounded-xl shadow-xs border border-slate-200">
                         <QRCodeSVG 
                            value={`WIC-HONORARIUM:${user.username}:${grandTotal}:${appData.settings.period_text || 'Mei 2026'}:${paymentMethod}`}
                            size={64}
                            level="M"
                         />
                      </div>

                      {/* Stempel Resmi Lembaga WIC */}
                      <img 
                         src={
                           (appData.settings.stempel_url && !appData.settings.stempel_url.includes('iili.io'))
                             ? appData.settings.stempel_url
                             : WIC_ASSETS.STEMPEL
                         } 
                         alt="Stempel Resmi Pembayaran WIC" 
                         className="w-20 h-20 object-contain absolute -right-2 -top-2 opacity-85 pointer-events-none transform rotate-12 z-20 filter drop-shadow-xs select-none" 
                      />
                   </div>

                   <div className="mt-2 text-center w-full">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                        NAMA TUTOR PENERIMA
                      </p>
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight font-sans">
                        {user.name}
                      </p>
                      <div className="mt-1 bg-emerald-950 text-white text-[7.5px] font-bold py-1 px-2 rounded-md uppercase tracking-wider">
                        {paymentMethod === 'TF' ? 'LUNAS VIA TRANSFER BANK' : 'LUNAS VIA TUNAI KASIR'}
                      </div>
                   </div>
                </div>

                {/* 3. Manajemen Keuangan WIC (Patented) */}
                <div className="text-center space-y-2 flex flex-col items-center">
                   <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">DITERBITKAN OLEH,</p>
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                        {appData.settings.cfo_title || 'MANAJEMEN KEUANGAN WIC'}
                      </p>
                   </div>

                   {/* Full Proportional TTD Container */}
                   <div className="h-24 w-full flex items-center justify-center p-1 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                      <img 
                        src={
                          (appData.settings.cfo_sign && !appData.settings.cfo_sign.includes('iili.io'))
                            ? appData.settings.cfo_sign
                            : WIC_ASSETS.TTD
                        } 
                        alt="TTD Manajemen Keuangan Rodhotul Jannah" 
                        className="max-h-24 max-w-full w-auto object-contain drop-shadow-xs" 
                      />
                   </div>

                   <div>
                      <p className="font-black text-slate-900 text-[11px] underline uppercase tracking-tight">
                        {(!appData.settings.cfo_name || appData.settings.cfo_name.includes('Rodhotul Janah'))
                          ? 'Rodhotul Jannah, S. Th. I., M. Ag.'
                          : appData.settings.cfo_name}
                      </p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">DIVISI PEMBUKUAN & PENGGAJIAN</p>
                   </div>
                </div>
             </div>

             {/* Footer Legal Note (Sesuai Gambar 3) */}
             <div className="mt-6 pt-3 -mx-10 -mb-10 bg-emerald-950 text-white px-10 py-3 flex justify-between items-center text-[8px] uppercase font-mono tracking-wider border-t-2 border-[#c28e2b]">
                <span className="flex items-center gap-2">
                   <span>DOKUMEN SAH ELEKTRONIK WIC MASTER MANAGEMENT V2</span>
                   <span className="w-1.5 h-1.5 rounded-full bg-[#c28e2b]"></span>
                   <span>WORTH IT COURSE</span>
                </span>
                <span>WAKTU CETAK : {today}</span>
             </div>
          </div>
       </div>
    </div>
 </div>
);
}
