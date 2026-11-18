import React from 'react';
import { Project, User, ProjectClassification, Settings } from '../../types';
import { WIC_ASSETS, DEFAULT_PROJECT_CLASSIFICATIONS, EMBEDDED_WIC_LOGO } from '../../constants';
import { formatCurrency } from '../../lib/utils';
import { Printer, Download, X, Layers, Award, CheckCircle2, ShieldCheck, FolderOpen } from 'lucide-react';
import { domToPng } from 'modern-screenshot';

interface ProjectRecapReportModalProps {
  projects: Project[];
  tutors: User[];
  classifications: ProjectClassification[];
  settings: Settings;
  onClose: () => void;
}

export default function ProjectRecapReportModal({
  projects,
  tutors,
  classifications,
  settings,
  onClose
}: ProjectRecapReportModalProps) {
  const [downloading, setDownloading] = React.useState(false);
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Group and summarize by classification
  const classList = classifications && classifications.length > 0 
    ? classifications 
    : DEFAULT_PROJECT_CLASSIFICATIONS;

  const getTutorName = (wa: string) => tutors.find(t => t.wa === wa || t.username === wa)?.name || wa;

  const recapSummary = React.useMemo(() => {
    return classList.map(cls => {
      const clsProjects = projects.filter(p => {
        if (p.classification) return p.classification.toLowerCase() === cls.name.toLowerCase();
        // Fallback auto detect
        const lower = (p.type || '').toLowerCase();
        if (cls.name === 'Modul' && (lower.includes('modul') || lower.includes('silabus') || lower.includes('worksheet'))) return true;
        if (cls.name === 'Content' && (lower.includes('video') || lower.includes('medsos') || lower.includes('content') || lower.includes('canva'))) return true;
        if (cls.name === 'Event' && (lower.includes('event') || lower.includes('lomba') || lower.includes('spelling') || lower.includes('workshop'))) return true;
        if (cls.name === 'Sekolah' && (lower.includes('sekolah') || lower.includes('kemitraan') || lower.includes('mitra'))) return true;
        return false;
      });

      const totalSubmitted = clsProjects.length;
      const approvedList = clsProjects.filter(p => p.status === 'Diterima');
      const pendingList = clsProjects.filter(p => p.status === 'Belum ditinjau' || p.status === 'Pending');
      const rejectedList = clsProjects.filter(p => p.status === 'Ditolak');
      const totalApprovedFee = approvedList.reduce((sum, p) => sum + (p.fee || 0), 0);

      return {
        classification: cls.name,
        description: cls.description,
        total: totalSubmitted,
        approved: approvedList.length,
        pending: pendingList.length,
        rejected: rejectedList.length,
        approvedFee: totalApprovedFee,
        projects: clsProjects
      };
    });
  }, [classList, projects]);

  const grandTotalProjects = projects.length;
  const grandTotalApproved = projects.filter(p => p.status === 'Diterima').length;
  const grandTotalFee = projects.filter(p => p.status === 'Diterima').reduce((sum, p) => sum + (p.fee || 0), 0);

  const handleDownload = async () => {
    const el = document.getElementById('project-recap-a4-capture');
    if (!el) return;
    setDownloading(true);
    try {
      const dataUrl = await domToPng(el, { 
        scale: 3, 
        backgroundColor: '#ffffff',
        quality: 1
      });
      const link = document.createElement('a');
      link.download = `Rekapitulasi_Proyek_WIC_${settings.period_text.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert('Gagal mengunduh gambar. Silakan gunakan tombol Cetak PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md overflow-y-auto p-2 sm:p-4 md:p-8 custom-scroll animate-in fade-in">
      {/* Print Styles for Standard A4 Portrait Layout */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 6mm;
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
          #project-recap-a4-wrapper {
            transform: none !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #project-recap-a4-capture {
            transform: none !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 6mm !important;
          }
        }
      `}</style>

      {/* Top Controls Toolbar */}
      <div className="max-w-[860px] mx-auto w-full mb-4 flex justify-between items-center gap-3 no-print">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="bg-white hover:bg-slate-100 text-slate-900 px-4 py-2.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-1.5 transition shadow-md active:scale-95 cursor-pointer"
          >
            <Printer size={15} /> Cetak / Unduh PDF (A4 Standar)
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-1.5 transition shadow-md active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            <Download size={15} /> {downloading ? 'Memproses...' : 'Unduh Gambar HD'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer"
          title="Tutup Laporan"
        >
          <X size={18} />
        </button>
      </div>

      {/* Printable A4 Container */}
      <div id="project-recap-a4-wrapper" className="flex-1 flex justify-center items-start pb-12 w-full overflow-x-auto">
        <div
          id="project-recap-a4-capture"
          className="w-[820px] bg-white text-slate-900 p-8 sm:p-12 shadow-2xl relative flex flex-col border border-slate-300 rounded-sm shrink-0"
          style={{
            minHeight: '1160px',
            backgroundImage: `radial-gradient(circle at top right, rgba(6, 78, 59, 0.03) 0%, transparent 60%)`
          }}
        >
          {/* Border guilloche */}
          <div className="absolute inset-4 border-2 border-emerald-950/20 pointer-events-none rounded-sm" />
          <div className="absolute inset-5 border border-gold-500/30 pointer-events-none rounded-sm" />

          {/* Letterhead */}
          <div className="flex justify-between items-start border-b-2 border-emerald-950 pb-5 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-18 h-18 bg-emerald-950 rounded-2xl p-2 flex items-center justify-center shadow-md overflow-hidden">
                <img 
                  src={settings.logo_url || WIC_ASSETS.LOGO} 
                  alt="WIC Logo" 
                  className="w-full h-full object-contain filter brightness-110" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = EMBEDDED_WIC_LOGO;
                  }}
                />
              </div>
              <div>
                <h1 className="text-2xl font-black text-emerald-950 tracking-tighter uppercase font-serif">
                  {settings.institution_name || 'WORTH IT COURSE'}
                </h1>
                <p className="text-[10px] tracking-[0.25em] font-black text-emerald-800 uppercase mt-0.5">
                  {settings.institution_tagline || 'Lembaga Pendidikan & Kursus Akademik Modern'}
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5">
                  {settings.institution_address || 'Jl. Kapten Pattimura No. 88, Jambi'} • {settings.institution_contact || 'Telp / WA: +62 822-8941-6677'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-950 to-slate-900 text-gold-400 px-3.5 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase mb-1 border border-gold-400/30">
                <Layers size={13} className="text-gold-400" /> LAPORAN REKAPITULASI PROYEK
              </span>
              <p className="text-[11px] font-mono font-bold text-slate-700">
                Periode: <strong className="text-emerald-900">{settings.period_text}</strong>
              </p>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                Format Cetak: ISO A4 Portrait
              </p>
            </div>
          </div>

          {/* Title Banner */}
          <div className="my-6 p-4 rounded-xl bg-gradient-to-r from-slate-50 via-emerald-50/30 to-slate-50 border border-slate-200 relative z-10">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight text-center">
              REKAPITULASI PENGESAHAN PROYEK EKSTRAKURIKULER & INSENTIF TUTOR
            </h2>
            <p className="text-[10px] text-slate-500 text-center mt-1">
              Klasifikasi Terpadu: Modul Pembelajaran • Konten Digital • Penyelenggaraan Event • Kemitraan Sekolah • Proyek Kustom
            </p>
          </div>

          {/* Table 1: Executive Summary per Klasifikasi */}
          <div className="mb-6 relative z-10">
            <h3 className="text-xs font-black uppercase text-emerald-950 tracking-wider mb-2 flex items-center gap-1.5">
              <Award size={14} className="text-emerald-700" /> I. Ringkasan Eksekutif per Klasifikasi Proyek
            </h3>
            <table className="w-full text-left border-collapse border border-slate-200 text-xs">
              <thead>
                <tr className="bg-emerald-950 text-gold-400 text-[10px] font-black uppercase tracking-wider">
                  <th className="py-2.5 px-3 border border-emerald-900">Klasifikasi Proyek</th>
                  <th className="py-2.5 px-3 text-center border border-emerald-900">Total Pengajuan</th>
                  <th className="py-2.5 px-3 text-center border border-emerald-900">Disetujui</th>
                  <th className="py-2.5 px-3 text-center border border-emerald-900">Pending</th>
                  <th className="py-2.5 px-3 text-center border border-emerald-900">Ditolak</th>
                  <th className="py-2.5 px-3 text-right border border-emerald-900">Total Anggaran Disetujui</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recapSummary.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="py-2.5 px-3 border border-slate-200">
                      <p className="font-black text-slate-900 uppercase">{item.classification}</p>
                      <p className="text-[9px] text-slate-400 italic truncate max-w-xs">{item.description}</p>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono border border-slate-200">{item.total} Item</td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-700 border border-slate-200">{item.approved}</td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono text-amber-600 border border-slate-200">{item.pending}</td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono text-red-600 border border-slate-200">{item.rejected}</td>
                    <td className="py-2.5 px-3 text-right font-black font-mono text-emerald-900 border border-slate-200">
                      {formatCurrency(item.approvedFee)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-900/10 font-black text-slate-900 border-t-2 border-emerald-950">
                  <td className="py-3 px-3 uppercase text-[11px]">TOTAL KESELURUHAN</td>
                  <td className="py-3 px-3 text-center font-mono">{grandTotalProjects} Item</td>
                  <td className="py-3 px-3 text-center font-mono text-emerald-800">{grandTotalApproved} Disetujui</td>
                  <td className="py-3 px-3 text-center font-mono text-slate-500">-</td>
                  <td className="py-3 px-3 text-center font-mono text-slate-500">-</td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-950 text-sm">
                    {formatCurrency(grandTotalFee)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Table 2: Rincian Lengkap Proyek Terverifikasi */}
          <div className="mb-6 relative z-10 flex-1">
            <h3 className="text-xs font-black uppercase text-emerald-950 tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-700" /> II. Daftar Detail Pengajuan & Status Verifikasi
            </h3>
            <table className="w-full text-left border-collapse border border-slate-200 text-[10px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase tracking-wider border-b border-slate-300">
                  <th className="py-2 px-2 text-center w-8 border border-slate-200">No</th>
                  <th className="py-2 px-3 border border-slate-200">Tutor & Tanggal</th>
                  <th className="py-2 px-3 border border-slate-200">Klasifikasi</th>
                  <th className="py-2 px-3 border border-slate-200">Judul / Jenis Proyek</th>
                  <th className="py-2 px-3 border border-slate-200">Rincian Deskripsi</th>
                  <th className="py-2 px-3 text-center border border-slate-200">Status</th>
                  <th className="py-2 px-3 text-right border border-slate-200">Nominal Honor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {projects.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2 px-2 text-center font-bold text-slate-400 border border-slate-200">{idx + 1}</td>
                    <td className="py-2 px-3 border border-slate-200">
                      <p className="font-bold text-slate-900 uppercase">{getTutorName(p.tutor_wa)}</p>
                      <p className="text-[8px] text-slate-400 font-mono">{p.date}</p>
                    </td>
                    <td className="py-2 px-3 border border-slate-200">
                      <span className="px-2 py-0.5 rounded font-black uppercase text-[8px] bg-slate-100 text-slate-800 border border-slate-200">
                        {p.classification || 'Modul'}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-800 border border-slate-200">
                      {p.type}
                    </td>
                    <td className="py-2 px-3 text-slate-500 italic max-w-[180px] truncate border border-slate-200">
                      {p.desc || '-'}
                    </td>
                    <td className="py-2 px-3 text-center border border-slate-200">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        p.status === 'Diterima' ? 'bg-emerald-100 text-emerald-800' :
                        p.status === 'Ditolak' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 border border-slate-200">
                      {formatCurrency(p.fee)}
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      Belum ada data proyek pada periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Signatures & Formal Validation */}
          <div className="mt-8 pt-6 border-t-2 border-emerald-950 grid grid-cols-2 gap-8 items-end relative z-10 text-xs">
            {/* 1. Direktur Utama */}
            <div className="text-center space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Disetujui Oleh,</p>
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Direktur Utama WIC</p>
              <div className="h-16 flex items-center justify-center py-1">
                <img
                  src={settings.director_sign}
                  alt="Director Sign"
                  className="max-h-full max-w-[130px] object-contain"
                />
              </div>
              <p className="font-black text-slate-900 text-[11px] underline uppercase tracking-tight">
                {settings.director_name}
              </p>
              <p className="text-[8px] text-slate-400 font-bold uppercase">Direksi & Penjamin Mutu</p>
            </div>

            {/* 2. CFO & Stempel Lembaga */}
            <div className="text-center space-y-1 relative">
              <img
                src={WIC_ASSETS.STEMPEL}
                alt="Stempel WIC"
                className="w-24 h-24 object-contain absolute opacity-70 pointer-events-none -top-3 left-10 transform -rotate-12 z-20"
              />
              <p className="text-[9px] font-bold text-slate-400 uppercase">Diterbitkan Oleh,</p>
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                {settings.cfo_title || 'Manajemen Keuangan WIC'}
              </p>
              <div className="h-16 flex items-center justify-center py-1">
                <img
                  src={settings.cfo_sign}
                  alt="Manajemen Keuangan Sign"
                  className="max-h-full max-w-[130px] object-contain"
                />
              </div>
              <p className="font-black text-slate-900 text-[11px] underline uppercase tracking-tight">
                {settings.cfo_name || 'Manajemen Keuangan WIC'}
              </p>
              <p className="text-[8px] text-slate-400 font-bold uppercase">Divisi Pembukuan & Verifikasi</p>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 uppercase font-mono">
            <span>Dokumen Rekapitulasi Resmi WIC • Terbit Otomatis Sesuai Regulasi Akademik</span>
            <span>Waktu Cetak: {today}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
