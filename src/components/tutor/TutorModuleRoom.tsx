import React, { useState } from 'react';
import { TeachingModule, ModuleLevel, User } from '../../types';
import { 
  BookOpen, 
  ExternalLink, 
  Search, 
  Sparkles, 
  Copy, 
  Check, 
  ListOrdered, 
  FolderOpen, 
  ChevronRight,
  GraduationCap,
  Layers,
  ArrowUpRight,
  Zap,
  ShieldCheck,
  Share2,
  RefreshCw,
  Eye,
  Printer,
  Lock
} from 'lucide-react';
import { normalizeUrl } from '../../lib/utils';
import ModuleViewerModal from '../common/ModuleViewerModal';
import { fetchServerModules } from '../../lib/syncService';

interface TutorModuleRoomProps {
  modules: TeachingModule[];
  user: User;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenSyncModal?: () => void;
  onRefreshModules?: () => Promise<void>;
  lastSyncTimestamp?: string;
}

const ROOM_TABS: { id: ModuleLevel; label: string; badge: string; color: string; desc: string; icon: string }[] = [
  { 
    id: 'Preschool', 
    label: 'Preschool', 
    badge: 'PAUD / TK (3-6 Tahun)', 
    color: 'from-pink-500 to-rose-600', 
    desc: 'Pengenalan alfabet dasar, phonics riang, lagu anak, warna & angka awal dengan metode visual sensory.',
    icon: '🧸'
  },
  { 
    id: 'Beginner', 
    label: 'Beginner', 
    badge: 'SD Dasar / Pemula', 
    color: 'from-emerald-500 to-teal-600', 
    desc: 'Fondasi kosakata esensial, ungkapan percakapan sehari-hari, dan pemahaman instruksi kelas mandiri.',
    icon: '🌱'
  },
  { 
    id: 'Kids', 
    label: 'Kids', 
    badge: 'SD Kelas 4-6', 
    color: 'from-sky-500 to-blue-600', 
    desc: 'Penguatan struktur grammar aktif, penulisan cerita pendek interaktif, dan simulasi speaking tematik.',
    icon: '🚀'
  },
  { 
    id: 'Teenager', 
    label: 'Teenager', 
    badge: 'SMP - SMA', 
    color: 'from-indigo-500 to-purple-600', 
    desc: 'Latihan debat santai, opini kritis, kosakata modern/slang, dan persiapan materi akademik sekolah.',
    icon: '🎯'
  },
  { 
    id: 'Adult', 
    label: 'Adult', 
    badge: 'Mahasiswa & Umum', 
    color: 'from-amber-500 to-orange-600', 
    desc: 'Bahasa Inggris korporat, korespondensi bisnis formal, presentasi profesional, serta simulasi tes TOEFL/IELTS.',
    icon: '💼'
  },
  { 
    id: 'Tahsin & Tahfidz', 
    label: 'Tahsin & Tahfidz', 
    badge: 'Kelas Terpadu Al-Quran', 
    color: 'from-emerald-800 to-teal-900', 
    desc: 'Makharijul huruf, tajwid tartil aplikatif, kaidah waqaf & ibtida, serta bimbingan talaqqi dan setoran hafalan Al-Quran.',
    icon: '🕌'
  }
];

export default function TutorModuleRoom({ 
  modules = [], 
  user, 
  showToast,
  onOpenSyncModal,
  onRefreshModules,
  lastSyncTimestamp
}: TutorModuleRoomProps) {
  const [activeRoom, setActiveRoom] = useState<ModuleLevel>('Beginner');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewerModule, setViewerModule] = useState<TeachingModule | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefreshModules) {
        await onRefreshModules();
      } else {
        const res = await fetchServerModules();
        if (res.ok) {
          if (showToast) showToast(`Sinkronisasi Server: ${res.modules.length} modul aktif terverifikasi.`, 'success');
        } else {
          if (showToast) showToast('Modul lokal telah termutakhir.', 'info');
        }
      }
    } catch {
      if (showToast) showToast('Gagal memeriksa pembaruan modul.', 'error');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const currentRoomInfo = ROOM_TABS.find(r => r.id === activeRoom) || ROOM_TABS[0];
  const roomModules = modules.filter(m => m.level === activeRoom);

  const filteredModules = roomModules.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      (m.target_grades && m.target_grades.toLowerCase().includes(q)) ||
      (m.chapters && m.chapters.some(c => c.toLowerCase().includes(q)))
    );
  });

  const handleCopyLink = (mod: TeachingModule) => {
    const url = normalizeUrl(mod.app_url);
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(mod.id);
    if (showToast) {
      showToast(`Link modul "${mod.title}" disalin ke clipboard!`, 'success');
    }
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShareWa = (mod: TeachingModule) => {
    const url = normalizeUrl(mod.app_url);
    if (!url) return;
    const msg = `Halo Adik-adik & Ayah/Bunda! 🌟\n\nBerikut link materi & modul pembelajaran resmi WIC:\n📖 *${mod.title}* (${mod.level})\n🔗 Akses Modul: ${url}\n\nSilakan dibuka dan dipersiapkan sebelum sesi dimulai ya. Semangat belajar! ✨\n- ${user.name} (Tutor WIC)`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gold-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-gold-500/20 text-gold-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-gold-500/30 flex items-center gap-1.5">
                <Sparkles size={12} /> Digital Curriculum Room
              </span>
              <span className="bg-white/10 text-emerald-200 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Portal Modul & Silabus Ajar Tutor
              </span>
            </div>

            {/* Auto-Sync Verified Badge & Refresh */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[9px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Auto-Sync Real-Time
              </span>
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-xs cursor-pointer border border-white/20 disabled:opacity-50"
                title="Sinkronkan Modul Sekarang"
              >
                <RefreshCw size={11} className={isRefreshing ? 'animate-spin text-gold-400' : ''} />
                <span>{isRefreshing ? 'Memeriksa...' : 'Cek Update'}</span>
              </button>
              {onOpenSyncModal && (
                <button
                  type="button"
                  onClick={onOpenSyncModal}
                  className="bg-gold-400 hover:bg-gold-500 text-emerald-950 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <ShieldCheck size={11} /> Status
                </button>
              )}
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
            Room Modul Ajar WIC
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl mt-1.5 leading-relaxed">
            Pilih Room jenjang kelas di bawah ini untuk mengakses silabus materi, buku ajar, dan slide presentasi yang terhubung langsung ke aplikasi (Google Drive, Canva, Notion, Quizizz). Perubahan modul dari Admin terupdate langsung tanpa perlu refresh manual.
          </p>

          {/* Quick Room Nav Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mt-6 pt-6 border-t border-white/10">
            {ROOM_TABS.map(tab => {
              const count = modules.filter(m => m.level === tab.id).length;
              const isActive = activeRoom === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveRoom(tab.id);
                    setSearch('');
                  }}
                  className={`p-3.5 rounded-2xl text-left transition-all duration-300 border flex flex-col justify-between ${
                    isActive
                      ? 'bg-white text-slate-900 border-gold-400 shadow-xl scale-102 ring-2 ring-gold-400/50'
                      : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{tab.icon}</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                      isActive ? 'bg-emerald-950 text-gold-400' : 'bg-white/10 text-slate-300'
                    }`}>
                      {count} Modul
                    </span>
                  </div>
                  <div className="mt-2">
                    <p className={`font-black text-xs uppercase tracking-tight ${isActive ? 'text-emerald-950' : 'text-white'}`}>
                      Room {tab.label}
                    </p>
                    <p className={`text-[9px] truncate font-medium mt-0.5 ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                      {tab.badge}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Room Focus Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-3xl p-3 bg-slate-50 rounded-2xl border border-slate-100">
            {currentRoomInfo.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                Room Pembelajaran: {currentRoomInfo.label}
              </h2>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                {currentRoomInfo.badge}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              {currentRoomInfo.desc}
            </p>
          </div>
        </div>

        {/* Search within this room */}
        <div className="w-full md:w-72 relative">
          <input
            type="text"
            placeholder={`Cari topik di Room ${currentRoomInfo.label}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-9 pr-3 text-xs font-bold focus:bg-white focus:border-emerald-500 outline-none transition"
          />
          <Search className="absolute left-3 top-3 text-slate-400" size={14} />
        </div>
      </div>

      {/* Module Grid */}
      {filteredModules.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center text-slate-400 mb-4">
            <BookOpen size={28} />
          </div>
          <h3 className="text-base font-black text-slate-700 uppercase tracking-tight">Belum Ada Modul di Room Ini</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {search 
              ? 'Tidak ada modul yang cocok dengan kata kunci pencarian.' 
              : 'Admin kurikulum sedang mempersiapkan materi untuk room ini. Silakan cek kembali nanti.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map(mod => {
            const isExpanded = expandedId === mod.id;

            return (
              <div 
                key={mod.id}
                className="bg-white rounded-[2.2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group hover:-translate-y-1"
              >
                {/* Cover Image */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                  <img 
                    src={mod.cover_url || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80'} 
                    alt={mod.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />

                  {/* Badges on Top */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="bg-emerald-950/90 text-gold-400 text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md border border-gold-500/20">
                      Room {mod.level}
                    </span>
                    <span className="bg-white/90 backdrop-blur-md text-emerald-900 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                      {mod.app_platform || 'Link Aplikasi'}
                    </span>
                  </div>

                  {/* Target Grades */}
                  {mod.target_grades && (
                    <div className="absolute bottom-3 left-3">
                      <span className="text-[10px] font-bold text-white bg-black/50 backdrop-blur-sm px-2.5 py-0.5 rounded-lg border border-white/20">
                        {mod.target_grades}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tight text-base leading-snug group-hover:text-emerald-900 transition line-clamp-2">
                      {mod.title}
                    </h3>

                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed line-clamp-3">
                      {mod.description}
                    </p>

                    {/* Chapters List / Syllabus preview */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                          <ListOrdered size={13} className="text-emerald-600" />
                          Silabus Bab ({mod.chapters?.length || 0})
                        </span>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : mod.id)}
                          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 uppercase"
                        >
                          {isExpanded ? 'Tutup Bab' : 'Lihat Bab'}
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scroll bg-slate-50 p-2.5 rounded-xl border border-slate-100 animate-in fade-in duration-200">
                          {mod.chapters && mod.chapters.length > 0 ? (
                            mod.chapters.map((ch, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-[10px] font-bold text-slate-700">
                                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[8px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <span className="leading-tight">{ch}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">Belum ada rincian bab.</p>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 font-medium truncate">
                          {mod.chapters?.[0] ? `${mod.chapters[0]} ...` : 'Belum ada rincian bab'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Permission Indicators & Action CTA Buttons */}
                  {(() => {
                    const canPrint = Boolean(mod.allow_print);
                    const canOpenExternal = mod.allow_external_link !== false;

                    return (
                      <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
                        {/* Active Policy Badges */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {canPrint ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Printer size={10} /> Boleh Print
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                              <Lock size={10} /> Print Dikunci
                            </span>
                          )}

                          {canOpenExternal ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                              <ArrowUpRight size={10} /> Link Aplikasi Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                              <Lock size={10} /> Hanya Baca di Dashboard
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewerModule(mod)}
                            className="flex-1 bg-emerald-950 hover:bg-emerald-900 text-gold-400 py-2.5 px-3 rounded-2xl font-black uppercase text-[10px] tracking-wider transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/20 active:scale-95 cursor-pointer"
                          >
                            {canPrint ? <Printer size={14} /> : <Eye size={14} />}
                            <span>{canPrint ? 'Baca & Print di Aplikasi' : 'Baca di Aplikasi'}</span>
                          </button>

                          {canOpenExternal && mod.app_url && (
                            <a
                              href={normalizeUrl(mod.app_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition shadow-xs"
                              title="Buka Langsung di Tab Baru / Google Drive"
                            >
                              <ArrowUpRight size={14} />
                            </a>
                          )}

                          {canOpenExternal && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleShareWa(mod)}
                                className="p-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition shadow-xs cursor-pointer"
                                title="Bagikan Link ke Siswa (WhatsApp)"
                              >
                                <Share2 size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyLink(mod)}
                                className={`p-2.5 rounded-2xl border transition cursor-pointer ${
                                  copiedId === mod.id
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                                }`}
                                title="Salin Hyperlink Modul"
                              >
                                {copiedId === mod.id ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-App Interactive Universal Module Viewer Modal */}
      <ModuleViewerModal
        module={viewerModule}
        isOpen={!!viewerModule}
        onClose={() => setViewerModule(null)}
        showToast={showToast}
        isAdmin={false}
      />
    </div>
  );
}
