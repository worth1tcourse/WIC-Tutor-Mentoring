import React, { useState } from 'react';
import { User, AppData, TeachingModule } from '../../types';
import { WIC_ASSETS, EMBEDDED_WIC_LOGO } from '../../constants';
import { isTutorFemale, getTutorSalutation, formatTutorDisplayName } from '../../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Download, 
  GraduationCap, 
  Rocket, 
  CalendarCheck, 
  BookOpen, 
  ChevronRight, 
  Sparkles, 
  ArrowUpRight, 
  ExternalLink, 
  Copy, 
  Check, 
  ListOrdered,
  ShieldCheck,
  Zap,
  RefreshCw,
  History,
  Search,
  Wallet
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { normalizeUrl, compressImageFile, cn, formatCurrency } from '../../lib/utils';
import { calculateTutorPayroll, isRecordForTutor } from '../../lib/payroll';

interface TutorDashProps {
  user: User;
  appData: AppData;
  onUpdateUser: (updatedUser: User) => void;
  onNavigate?: (id: string, title: string) => void;
  onOpenSyncModal?: () => void;
  lastSyncTimestamp?: string;
  isCloudSynced?: boolean;
  syncPulse?: boolean;
}

export default function TutorDash({ 
  user, 
  appData, 
  onUpdateUser, 
  onNavigate,
  onOpenSyncModal,
  lastSyncTimestamp,
  isCloudSynced = true,
  syncPulse = false
}: TutorDashProps) {
  const [copiedModuleId, setCopiedModuleId] = useState<string | null>(null);
  const [selectedClassHistoryLevel, setSelectedClassHistoryLevel] = useState<string>('Semua');

  const handleCopyModuleLink = (mod: TeachingModule) => {
    const url = normalizeUrl(mod.app_url);
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedModuleId(mod.id);
      setTimeout(() => setCopiedModuleId(null), 2000);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran foto maksimal 5MB!");
        return;
      }
      const compressed = await compressImageFile(file, 200, 0.8);
      if (compressed) {
        onUpdateUser({ ...user, photo: compressed });
      }
    }
  };

  const handleDownloadCard = async () => {
    const element = document.getElementById('ecard-capture');
    if (element) {
      const dataUrl = await domToPng(element, { scale: 3 });
      const link = document.createElement('a');
      link.download = `IDCard-${user.username}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const totalModules = appData.modules?.length || 5;

  const isFemale = isTutorFemale(user);
  const salutation = getTutorSalutation(user);
  const displayName = formatTutorDisplayName(user);

  const tutorPayroll = calculateTutorPayroll(user, appData);
  const sessionsCount = tutorPayroll.totalSessions;
  const projectCount = tutorPayroll.approvedProjects.length;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start animate-in fade-in">
      <div className="flex-1 w-full space-y-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
           <div className="relative group/photo">
              <img src={user.photo || '/assets/aistudio/WIC_Tutor_ID_Badge_Illustration_e3b40afc.png'} className="w-24 h-24 rounded-full border-4 border-emerald-100 object-cover z-10 shadow-sm" alt={user.name} />
              <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover/photo:opacity-100 cursor-pointer transition-opacity z-20">
                 <span className="text-[10px] font-black text-white uppercase">Ganti Foto</span>
                 <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </label>
           </div>
           <div className="relative z-10 text-center md:text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">
                Selamat Datang di WIC Master Portal • Halo, {salutation} {user.name.split(' ')[0]}
              </p>
              <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-2">{displayName}</h2>
              <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm">
                  {user.status_tutor}
                </span>
                {(user.is_certified || user.status_tutor?.toLowerCase().includes('sertifikasi')) && (
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm flex items-center gap-1">
                    🎓 {user.certification_name || 'Tersertifikasi WIC'}
                  </span>
                )}
                <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border border-slate-200">
                  {isFemale ? 'Pendidik (Miss)' : 'Pendidik (Mr.)'}
                </span>
              </div>
           </div>
           <GraduationCap className="absolute -right-6 -bottom-6 w-40 h-40 text-slate-50 opacity-50" />
        </div>

        {/* Banner Status Registrasi Resmi Lembaga WIC Pusat */}
        <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-6 rounded-3xl border border-emerald-800/40 shadow-lg relative overflow-hidden">
           <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
              <div className="space-y-1.5 text-center sm:text-left">
                 <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[9px] font-black uppercase text-gold-400 tracking-[0.2em]">
                       Status Lembaga WIC Pusat
                    </span>
                 </div>
                 <h4 className="text-base font-black uppercase tracking-tight text-white">
                    {appData.settings.institution_name || 'Worth It Course (WIC)'}
                 </h4>
                 <p className="text-[11px] text-slate-300 max-w-xl">
                    Kartu pengajar dan dokumen evaluasi Anda sah teregistrasi di bawah supervisi Manajemen WIC untuk Periode {appData.settings.period_text}.
                 </p>
                 <p className="text-[9.5px] text-slate-400 font-mono">
                    Direktur Lembaga: {appData.settings.director_name}
                 </p>
              </div>

              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl shrink-0">
                 <ShieldCheck size={20} className="text-emerald-400" />
                 <div className="text-left">
                    <p className="text-[8px] font-mono text-gold-300 uppercase tracking-wider">Status Tutor</p>
                    <p className="text-xs font-black uppercase text-white tracking-tight">{user.status_tutor || 'Aktif'}</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="p-8 bg-emerald-900 rounded-3xl text-center shadow-lg relative overflow-hidden group">
           <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all duration-700"></div>
           <p className="text-[10px] font-black text-gold-400 uppercase tracking-[0.3em] mb-4">#WICQuotes</p>
           <p className="font-handwriting text-3xl text-white leading-relaxed font-bold italic">
             "{appData.settings.quote}"
           </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
           <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
              <span className="text-[9px] font-bold text-emerald-600 uppercase">Mandiri</span>
              <h4 className="text-xl font-black text-slate-800">{tutorPayroll.mandiriCount}</h4>
              <p className="text-[9px] text-slate-400">Sesi • {formatCurrency(tutorPayroll.subMandiri)}</p>
           </div>
           <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
              <span className="text-[9px] font-bold text-amber-600 uppercase">Team</span>
              <h4 className="text-xl font-black text-slate-800">{tutorPayroll.teamCount}</h4>
              <p className="text-[9px] text-slate-400">Sesi • {formatCurrency(tutorPayroll.subTeam)}</p>
           </div>
           <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
              <span className="text-[9px] font-bold text-purple-600 uppercase">Private</span>
              <h4 className="text-xl font-black text-slate-800">{tutorPayroll.privateCount}</h4>
              <p className="text-[9px] text-slate-400">Sesi • {formatCurrency(tutorPayroll.subPrivate)}</p>
           </div>
           <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
              <span className="text-[9px] font-bold text-blue-600 uppercase">Semi Private</span>
              <h4 className="text-xl font-black text-slate-800">{tutorPayroll.semiPrivateCount}</h4>
              <p className="text-[9px] text-slate-400">Sesi • {formatCurrency(tutorPayroll.subSemiPrivate)}</p>
           </div>
        </div>

        {/* Ringkasan Otomatis Kinerja ke Slip Gaji */}
        <div
           onClick={() => onNavigate && onNavigate('PAYROLL_TUTOR', 'Slip Gaji')}
           className="bg-emerald-50/90 hover:bg-emerald-100/80 border border-emerald-200 rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer transition shadow-2xs"
        >
           <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-950 text-gold-400 flex items-center justify-center shrink-0">
                 <Wallet size={18} />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">
                    Estimasi Honorarium Otomatis ({sessionsCount} Sesi {projectCount > 0 ? `+ ${projectCount} Proyek` : ''})
                 </p>
                 <p className="text-base font-black font-mono text-emerald-950">
                    {formatCurrency(tutorPayroll.grandTotal)}
                 </p>
              </div>
           </div>
           <span className="text-[10px] font-black uppercase text-emerald-950 bg-white px-3.5 py-2 rounded-xl border border-emerald-300 flex items-center gap-1.5 shadow-2xs shrink-0">
              Buka Slip Gaji Digital <ChevronRight size={14} />
           </span>
        </div>

        {/* Modul Ajar Quick Access Banner */}
        <div 
           onClick={() => onNavigate && onNavigate('TUTOR_MODULES', 'Modul Ajar (Room Siswa)')}
           className="mt-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 p-5 rounded-3xl border border-emerald-800/40 text-white flex items-center justify-between gap-4 cursor-pointer hover:shadow-xl transition group"
        >
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-gold-400 border border-white/10 shrink-0 group-hover:scale-110 transition">
                 <BookOpen size={24} />
              </div>
              <div>
                 <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-gold-400 tracking-wider">Digital Curriculum Room</span>
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">{totalModules} Modul Siap</span>
                 </div>
                 <h4 className="font-black text-sm uppercase tracking-tight mt-0.5 text-white">
                    Pusat Modul Ajar & Silabus Bab
                 </h4>
                 <p className="text-[10px] text-slate-300 mt-0.5">
                    Buka buku materi, slide presentasi Canva/Drive, dan kuis interaktif sesuai level siswa Anda.
                 </p>
              </div>
           </div>
           <div className="w-9 h-9 rounded-xl bg-gold-400 text-emerald-950 flex items-center justify-center shrink-0 group-hover:translate-x-1 transition shadow-md">
              <ChevronRight size={18} />
           </div>
        </div>

        {/* PUSAT AKSI CEPAT PENGAJAR: KLIK CEPAT JURNAL & MODUL */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                 <div className="flex items-center gap-2 mb-1">
                    <span className="bg-gold-500/20 text-gold-600 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-gold-500/30 flex items-center gap-1">
                       <Zap size={11} className="text-gold-500" /> Akses Cepat Pengajar
                    </span>
                    <span className="bg-emerald-50 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                       Fokus Utama Sesi Mengajar
                    </span>
                 </div>
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                    Pusat Akses Jurnal & Modul Ajar WIC
                 </h3>
                 <p className="text-xs text-slate-500 mt-0.5">
                    Akses instan untuk mengisi absensi & jurnal mengajar per shift, serta membuka seluruh Room Modul Ajar kurikulum resmi tanpa penumpukan di beranda.
                 </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                 {lastSyncTimestamp && (
                    <span className="text-[9px] font-mono font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                       Sinkron: {lastSyncTimestamp}
                    </span>
                 )}
                 {onOpenSyncModal && (
                    <button
                       type="button"
                       onClick={onOpenSyncModal}
                       className="bg-emerald-950 hover:bg-emerald-900 text-gold-400 px-3 py-1.5 rounded-xl font-black uppercase text-[9px] tracking-wider transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                       <ShieldCheck size={12} />
                       <span>Uji Sinkron</span>
                    </button>
                 )}
              </div>
           </div>

           {/* 2 Big Focused Action Cards */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Card 1: Jurnal Mengajar */}
              <div 
                 onClick={() => onNavigate && onNavigate('JURNAL_SHIFT', 'Jurnal Shift')}
                 className="group relative bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white rounded-3xl p-6 border-2 border-emerald-800/80 shadow-md hover:shadow-2xl hover:border-gold-400 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
              >
                 <div className="absolute top-0 right-0 w-36 h-36 bg-gold-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                 
                 <div className="relative z-10 space-y-3">
                    <div className="flex items-center justify-between">
                       <div className="w-12 h-12 rounded-2xl bg-gold-400 text-emerald-950 flex items-center justify-center font-black shadow-md group-hover:scale-110 transition-transform">
                          <CalendarCheck size={24} />
                       </div>
                       <span className="bg-white/10 text-emerald-200 text-[9px] font-black uppercase px-3 py-1 rounded-full border border-white/10 tracking-wider">
                          Presensi & Materi
                       </span>
                    </div>

                    <div>
                       <h4 className="text-lg font-black uppercase tracking-tight text-white group-hover:text-gold-300 transition">
                          Isi Jurnal Mengajar Shift
                       </h4>
                       <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
                          Catat kehadiran siswa sesuai shift & level kelas, review materi sebelumnya, setoran Tahsin Al-Qur'an, dan klaim honor sesi.
                       </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                       <span className="text-[8px] font-bold bg-black/30 text-gold-300 px-2 py-0.5 rounded-md">
                          ✓ Nama Panggilan Siswa
                       </span>
                       <span className="text-[8px] font-bold bg-black/30 text-gold-300 px-2 py-0.5 rounded-md">
                          ✓ Sesuai Jadwal Shift
                       </span>
                       <span className="text-[8px] font-bold bg-black/30 text-gold-300 px-2 py-0.5 rounded-md">
                          ✓ Kelas Pengganti (Make Up)
                       </span>
                    </div>
                 </div>

                 <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-gold-400 tracking-wider flex items-center gap-1">
                       Buka Form Jurnal <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </span>
                    <span className="text-[10px] text-emerald-300 font-bold">
                       Klik Cepat
                    </span>
                 </div>
              </div>

              {/* Card 2: Room Modul Ajar */}
              <div 
                 onClick={() => onNavigate && onNavigate('TUTOR_MODULES', 'Modul Ajar')}
                 className="group relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 border-2 border-slate-700/80 shadow-md hover:shadow-2xl hover:border-gold-400 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
              >
                 <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

                 <div className="relative z-10 space-y-3">
                    <div className="flex items-center justify-between">
                       <div className="w-12 h-12 rounded-2xl bg-white text-slate-900 flex items-center justify-center font-black shadow-md group-hover:scale-110 transition-transform">
                          <BookOpen size={24} className="text-emerald-700" />
                       </div>
                       <span className="bg-white/10 text-gold-300 text-[9px] font-black uppercase px-3 py-1 rounded-full border border-white/10 tracking-wider">
                          Room Kurikulum
                       </span>
                    </div>

                    <div>
                       <h4 className="text-lg font-black uppercase tracking-tight text-white group-hover:text-gold-300 transition">
                          Buka Room Modul Ajar Resmi
                       </h4>
                       <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Masuk ke Room kurikulum terpadu (Preschool, Beginner, Kids, Teenager, Adult, Tahsin). Dilengkapi silabus 20 bab & tautan materi eksternal.
                       </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                       <span className="text-[8px] font-bold bg-white/10 text-slate-300 px-2 py-0.5 rounded-md">
                          ✓ Google Drive
                       </span>
                       <span className="text-[8px] font-bold bg-white/10 text-slate-300 px-2 py-0.5 rounded-md">
                          ✓ Canva Slides
                       </span>
                       <span className="text-[8px] font-bold bg-white/10 text-slate-300 px-2 py-0.5 rounded-md">
                          ✓ Notion & Quizizz
                       </span>
                       <span className="text-[8px] font-bold bg-white/10 text-slate-300 px-2 py-0.5 rounded-md">
                          ✓ Silabus Bab
                       </span>
                    </div>
                 </div>

                 <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-gold-400 tracking-wider flex items-center gap-1">
                       Masuk ke Room Modul <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                       Klik Cepat
                    </span>
                 </div>
              </div>
           </div>
        </div>

        {/* Cross-Tutor Knowledge Sharing: Riwayat Materi Terakhir di Seluruh Kelas */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-4">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                 <div className="p-2.5 bg-purple-100 text-purple-900 rounded-2xl">
                    <History size={20} />
                 </div>
                 <div>
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                       <span>Pantauan Materi Terakhir Seluruh Kelas</span>
                       <span className="bg-purple-100 text-purple-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                          Arsip Antar-Tutor
                       </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                       Cek perkembangan materi yang diajarkan oleh rekan pengajar lain sebelum memulai sesi kelas Anda.
                    </p>
                 </div>
              </div>

              {onNavigate && (
                 <button
                   type="button"
                   onClick={() => onNavigate('JURNAL_SHIFT', 'Jurnal Shift')}
                   className="bg-emerald-950 hover:bg-emerald-900 text-gold-400 px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                 >
                    <span>Isi Jurnal Shift</span>
                    <ArrowUpRight size={12} />
                 </button>
              )}
           </div>

           {/* Filter Level Tabs */}
           <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scroll">
              {['Semua', 'Preschool', 'Beginner', 'Kids', 'Teenager', 'Adult', 'Tahsin & Tahfidz'].map(lvl => (
                 <button
                   key={lvl}
                   type="button"
                   onClick={() => setSelectedClassHistoryLevel(lvl)}
                   className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition shrink-0 cursor-pointer border",
                      selectedClassHistoryLevel === lvl
                        ? "bg-purple-900 text-white border-purple-950 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                   )}
                 >
                    {lvl}
                 </button>
              ))}
           </div>

           {/* List of Recent Teaching Records across all tutors */}
           {(() => {
              const allAtt = appData.attendance || [];
              const filtered = selectedClassHistoryLevel === 'Semua'
                 ? allAtt
                 : allAtt.filter(a => (a.level || '').toLowerCase() === selectedClassHistoryLevel.toLowerCase());
              
              const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

              if (sorted.length === 0) {
                 return (
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-1">
                       <p className="text-xs font-bold text-slate-500">
                          Belum ada arsip materi jurnal yang tercatat {selectedClassHistoryLevel !== 'Semua' ? `untuk kelas ${selectedClassHistoryLevel}` : 'di sistem'}.
                       </p>
                       <p className="text-[10px] text-slate-400">
                          Setelah Anda atau rekan tutor lain mengisi Jurnal Shift, catatan materi dan PR akan otomatis tampil di sini secara real-time.
                       </p>
                    </div>
                 );
              }

              return (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sorted.map((item, idx) => {
                       const tUser = (appData.users || []).find(u => 
                          isRecordForTutor(item.tutor_wa, u, item.tutor_id)
                       );
                       const tutorDisplayName = tUser ? formatTutorDisplayName(tUser) : (item.tutor_name || item.tutor_wa || 'Tutor');

                       return (
                          <div 
                             key={item.id || idx}
                             className="p-3.5 bg-slate-50 hover:bg-purple-50/30 rounded-2xl border border-slate-200 space-y-2 transition shadow-2xs"
                          >
                             <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 pb-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                   <span className="bg-emerald-950 text-gold-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-lg">
                                      {item.level}
                                   </span>
                                   <span className="text-[9px] font-bold text-slate-700">
                                      {item.date} • {item.shift}
                                   </span>
                                </div>
                                <span className="text-[9px] font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md">
                                   {tutorDisplayName}
                                </span>
                             </div>

                             <div className="text-xs space-y-1">
                                <p className="font-bold text-slate-900 line-clamp-2 leading-snug">
                                   "{item.material}"
                                </p>
                                {(item.surah_name || item.tahsin_status) && (
                                   <p className="text-[10px] text-emerald-900 font-bold">
                                      🕌 Setoran: Surat {item.surah_name} ({item.ayat_range || '-'})
                                   </p>
                                )}
                                {item.notes && (
                                   <p className="text-[9px] text-slate-500 italic line-clamp-1">
                                      📝 Catatan: "{item.notes}"
                                   </p>
                                )}
                             </div>
                          </div>
                       );
                    })}
                 </div>
              );
           })()}
        </div>
      </div>

      <div className="w-full lg:w-[360px] flex flex-col items-center space-y-4">
         {/* Redesigned Tutor ID Card Matching WIC_Tutor_ID_Badge_Illustration_e3b40afc.png */}
         <div 
           id="ecard-capture" 
           className="w-[340px] bg-white rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col items-center border-2 border-emerald-950/20 select-none"
         >
            {/* Top Emerald Header */}
            <div className="bg-[#052e20] w-full pt-4 pb-14 px-4 relative flex flex-col items-center overflow-hidden">
               {/* Background subtle geometric facets */}
               <div className="absolute inset-0 opacity-15 pointer-events-none">
                  <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-[#d4af37]/30 to-transparent transform rotate-45"></div>
                  <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-transparent"></div>
               </div>

               {/* Header Brand Bar */}
               <div className="relative z-10 flex items-center justify-center gap-2.5 w-full">
                  {/* WIC Monogram Logo */}
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center p-1 shrink-0 shadow-inner overflow-hidden">
                     <img 
                       src={appData.settings.logo_url || WIC_ASSETS.LOGO} 
                       alt="WIC Logo" 
                       className="h-full w-auto object-contain" 
                       onError={(e) => {
                         (e.target as HTMLImageElement).src = EMBEDDED_WIC_LOGO;
                       }}
                     />
                  </div>

                  {/* Vertical Thin Divider */}
                  <div className="h-8 w-[1.5px] bg-white/30"></div>

                  {/* Institution Brand & Motto */}
                  <div className="text-left">
                     <h3 className="font-black text-white text-[12.5px] uppercase tracking-wider leading-none">
                        {appData.settings.institution_name || 'WORTH IT COURSE (WIC)'}
                     </h3>
                     <div className="flex items-center gap-1.5 mt-1">
                        <span className="h-[1px] w-3 bg-[#d4af37]"></span>
                        <p className="text-[7.5px] font-bold text-[#d4af37] tracking-tight uppercase">
                           {appData.settings.institution_tagline || 'Whoever We Are, We Are WORTH IT'}
                        </p>
                        <span className="h-[1px] w-3 bg-[#d4af37]"></span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Hexagonal Gold-Framed Portrait Intersecting Header & Body */}
            <div className="-mt-11 relative z-20 flex items-center justify-center">
               {/* Outer Gold Hexagon Border */}
               <div 
                 className="p-[3.5px] bg-gradient-to-b from-[#f3e198] via-[#d4af37] to-[#8d6e1b] shadow-xl"
                 style={{
                   clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                 }}
               >
                  {/* Inner Dark Emerald Hexagon Frame */}
                  <div 
                    className="p-[3.5px] bg-[#052e20]"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                    }}
                  >
                     {/* Photo / 3D Illustration Container */}
                     <div 
                       className="w-40 h-44 bg-slate-900 overflow-hidden flex items-center justify-center"
                       style={{
                         clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                       }}
                     >
                        <img 
                          src={user.photo || '/assets/aistudio/WIC_Tutor_ID_Badge_Illustration_e3b40afc.png'} 
                          className="w-full h-full object-cover object-top" 
                          alt={user.name} 
                        />
                     </div>
                  </div>
               </div>
            </div>

            {/* Tutor Name & Gender Salutation (Mr. / Miss) */}
            <div className="mt-2.5 text-center px-4 w-full relative z-10 flex flex-col items-center">
               <h2 className="font-black text-[#052e20] uppercase text-2xl tracking-tight leading-tight">
                  {salutation} {user.name}
               </h2>

               {/* Active • Tersertifikasi Pill Badge */}
               <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#dcf3e7] text-[#0d6840] font-black text-[10.5px] uppercase tracking-wider shadow-2xs mt-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#0d6840] text-white flex items-center justify-center text-[8px] font-black">
                     ✓
                  </span>
                  <span>Active • {user.is_certified ? 'Tersertifikasi' : (user.status_tutor || 'Tersertifikasi')}</span>
               </div>
            </div>

            {/* 3 Information Rows with Rounded Icon Badges & Dividers */}
            <div className="w-full px-6 mt-3 space-y-2 text-xs">
               {/* Row 1: ID Tutor */}
               <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                     <span className="w-6 h-6 rounded-md bg-[#052e20] text-white flex items-center justify-center text-[10px]">
                        🪪
                     </span>
                     <span className="font-bold text-slate-800 text-[11px]">ID Tutor</span>
                  </div>
                  <span className="text-slate-300 font-light mx-2">|</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px] tracking-tight">
                     T-{user.id ? String(user.id).replace(/^T-?/i, '') : '1791953853979'}
                  </span>
               </div>

               {/* Row 2: Username */}
               <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                     <span className="w-6 h-6 rounded-md bg-[#052e20] text-white flex items-center justify-center text-[10px]">
                        👤
                     </span>
                     <span className="font-bold text-slate-800 text-[11px]">Username</span>
                  </div>
                  <span className="text-slate-300 font-light mx-2">|</span>
                  <span className="font-bold text-slate-900 text-[11px] tracking-tight uppercase">
                     @{user.username.toUpperCase()}
                  </span>
               </div>

               {/* Row 3: Status Tutor */}
               <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                     <span className="w-6 h-6 rounded-md bg-[#052e20] text-white flex items-center justify-center text-[10px]">
                        🛡️
                     </span>
                     <span className="font-bold text-slate-800 text-[11px]">Status Tutor</span>
                  </div>
                  <span className="text-slate-300 font-light mx-2">|</span>
                  <span className="font-bold text-[#0d6840] text-[11px] tracking-tight">
                     Active • {user.is_certified ? 'Tersertifikasi' : (user.status_tutor || 'Tersertifikasi')}
                  </span>
               </div>
            </div>

            {/* Centered QR Code with 4 Dark Green Corner Brackets */}
            <div className="my-3 flex items-center justify-center">
               <div className="relative p-2.5">
                  {/* Top-Left Bracket */}
                  <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-[#052e20]"></div>
                  {/* Top-Right Bracket */}
                  <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-[#052e20]"></div>
                  {/* Bottom-Left Bracket */}
                  <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-[#052e20]"></div>
                  {/* Bottom-Right Bracket */}
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-[#052e20]"></div>

                  <QRCodeSVG 
                     value={`WIC-TUTOR:${user.username}:${user.id}`} 
                     size={88} 
                     fgColor="#052e20" 
                     bgColor="#ffffff" 
                     level="M" 
                  />
               </div>
            </div>

            {/* Dark Emerald Rounded Bottom Bar with Gold Accent Line */}
            <div className="bg-[#052e20] w-full py-2.5 px-4 rounded-b-[30px] flex items-center justify-center gap-2">
               <span className="h-[1px] w-12 bg-[#d4af37]"></span>
               <p className="text-[8.5px] font-black text-[#d4af37] tracking-[0.2em] uppercase">
                  WORTH IT COURSE (WIC)
               </p>
               <span className="h-[1px] w-12 bg-[#d4af37]"></span>
            </div>
         </div>

         <button 
           onClick={handleDownloadCard}
           className="w-full bg-[#052e20] hover:bg-emerald-900 text-[#d4af37] font-black py-3.5 rounded-2xl uppercase text-[11px] tracking-wider shadow-lg transition flex items-center justify-center gap-2 cursor-pointer border border-[#d4af37]/30"
         >
           <Download size={16} /> Simpan ID Card
         </button>
      </div>
    </div>
  );
}
