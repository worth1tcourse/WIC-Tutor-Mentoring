import React, { useState } from 'react';
import { AppData, Attendance, TeachingMode } from '../../types';
import { 
  Calendar, 
  Search, 
  BookOpen, 
  User as UserIcon, 
  MessageSquare, 
  ChevronRight, 
  Trash2, 
  Award, 
  Filter,
  Edit3,
  X,
  Check,
  AlertTriangle,
  Clock,
  Sparkles,
  Repeat,
  History
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { isRecordForTutor } from '../../lib/payroll';
import { WIC_LEVELS, WIC_SHIFTS, POPULAR_TAHSIN_SURAHS, ALL_QURAN_SURAHS } from '../../constants';

interface JournalReviewProps {
  appData: AppData;
  onUpdate: (data: Partial<AppData>) => void;
}

export default function JournalReview({ appData, onUpdate }: JournalReviewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJournal, setSelectedJournal] = useState<Attendance | null>(null);
  const [modeFilter, setModeFilter] = useState<'ALL' | TeachingMode>('ALL');
  
  // Modals
  const [editingJournal, setEditingJournal] = useState<Attendance | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedJournalIds, setSelectedJournalIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const toggleSelectAll = () => {
    const visibleIds = filteredJournals.map(j => j.id);
    const allSelected = visibleIds.every(id => selectedJournalIds.includes(id));
    if (allSelected) {
      setSelectedJournalIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedJournalIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedJournalIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirmDelete = () => {
    if (!deletingId) return;
    const next = appData.attendance.filter(a => a.id !== deletingId);
    onUpdate({ attendance: next });
    if (selectedJournal?.id === deletingId) {
      setSelectedJournal(null);
    }
    setDeletingId(null);
  };

  const handleBulkDelete = () => {
    if (selectedJournalIds.length === 0) return;
    const next = appData.attendance.filter(a => !selectedJournalIds.includes(a.id));
    onUpdate({ attendance: next });
    if (selectedJournal && selectedJournalIds.includes(selectedJournal.id)) {
      setSelectedJournal(null);
    }
    setSelectedJournalIds([]);
    setIsBulkDeleteModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJournal) return;

    const next = appData.attendance.map(a => a.id === editingJournal.id ? editingJournal : a);
    onUpdate({ attendance: next });
    setSelectedJournal(editingJournal);
    setEditingJournal(null);
  };

  const filteredJournals = appData.attendance.filter(a => {
    const tutor = appData.users.find(u => isRecordForTutor(a.tutor_wa, u, a.tutor_id));
    const tutorName = (tutor?.name || a.tutor_name || '').toLowerCase();
    const material = a.material.toLowerCase();
    const search = searchTerm.toLowerCase();
    const surah = (a.surah_name || '').toLowerCase();
    const matchesSearch = tutorName.includes(search) || material.includes(search) || a.level.toLowerCase().includes(search) || surah.includes(search);
    const matchesMode = modeFilter === 'ALL' || a.mode === modeFilter;
    return matchesSearch && matchesMode;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start animate-in fade-in duration-300">
      <div className="flex-1 w-full bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
               <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Review Jurnal Pembelajaran</h2>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                 Monitoring materi, absensi, setoran Al-Qur'an (Tahsin & Tahfidz) & sistem ajar
               </p>
            </div>
            <div className="relative w-full md:w-80">
               <input 
                  type="text" 
                  placeholder="Cari Tutor, Materi, Surat, atau Level..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase focus:bg-white focus:border-emerald-500 transition-all outline-none"
               />
               <Search className="absolute left-4 top-3 text-slate-400" size={18} />
            </div>
         </div>

         {/* Filter Mode Pills */}
         <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 custom-scroll">
            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1 shrink-0 mr-1">
               <Filter size={12} /> Mode:
            </span>
            {(['ALL', 'Mandiri', 'Team', 'Private', 'Semi Private'] as const).map((m) => {
               const count = m === 'ALL' 
                  ? appData.attendance.length 
                  : appData.attendance.filter(a => a.mode === m).length;

               return (
                  <button
                     key={m}
                     type="button"
                     onClick={() => setModeFilter(m)}
                     className={cn(
                        "px-3.5 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition whitespace-nowrap border cursor-pointer",
                        modeFilter === m 
                           ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                           : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                     )}
                  >
                     {m === 'ALL' ? 'Semua Mode' : m} ({count})
                  </button>
               );
            })}
         </div>

         {/* Bulk Selection Bar */}
         <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 mb-4">
            <div className="flex items-center gap-2.5">
               <input
                  type="checkbox"
                  checked={filteredJournals.length > 0 && filteredJournals.every(j => selectedJournalIds.includes(j.id))}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
               />
               <span className="text-[10px] font-black uppercase text-slate-700">
                  {selectedJournalIds.length > 0 
                     ? `${selectedJournalIds.length} Jurnal Terpilih` 
                     : `Pilih Semua Jurnal (${filteredJournals.length})`}
               </span>
            </div>

            {selectedJournalIds.length > 0 && (
               <div className="flex items-center gap-2">
                  <button
                     type="button"
                     onClick={() => setSelectedJournalIds([])}
                     className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition"
                  >
                     Batal
                  </button>
                  <button
                     type="button"
                     onClick={() => setIsBulkDeleteModalOpen(true)}
                     className="px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase text-white bg-red-600 hover:bg-red-700 shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                  >
                     <Trash2 size={12} /> Hapus Permanen Terpilih ({selectedJournalIds.length})
                  </button>
               </div>
            )}
         </div>

         <div className="space-y-4">
            {filteredJournals.map(a => {
               const tutor = appData.users.find(u => isRecordForTutor(a.tutor_wa, u, a.tutor_id));
               
               let modeBadge = "bg-emerald-50 text-emerald-800 border-emerald-200";
               if (a.mode === 'Team') modeBadge = "bg-amber-50 text-amber-800 border-amber-200";
               if (a.mode === 'Private') modeBadge = "bg-indigo-50 text-indigo-800 border-indigo-200";
               if (a.mode === 'Semi Private') modeBadge = "bg-purple-50 text-purple-800 border-purple-200";

               const isTahsin = a.surah_name || a.tahsin_status || a.level?.toLowerCase().includes('tahsin') || a.level?.toLowerCase().includes('tahfidz');
               const hasMakeup = a.is_makeup_session || (a.makeup_students && a.makeup_students.length > 0);
               const isSelected = selectedJournalIds.includes(a.id);

               return (
                  <div 
                     key={a.id}
                     onClick={() => setSelectedJournal(a)}
                     className={cn(
                        "p-5 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md",
                        selectedJournal?.id === a.id 
                           ? "bg-slate-900 text-white border-slate-900 shadow-lg scale-[1.01]" 
                           : isSelected 
                              ? "bg-red-50/50 border-red-300" 
                              : "bg-slate-50/50 hover:bg-white border-slate-200/80"
                     )}
                  >
                     <div className="flex items-center gap-4">
                        {/* Checkbox Individual */}
                        <div onClick={e => e.stopPropagation()} className="shrink-0">
                           <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => toggleSelectOne(a.id, e as any)}
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                           />
                        </div>

                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 p-1 shrink-0 overflow-hidden">
                           <img 
                              src={tutor?.photo || `https://i.pravatar.cc/150?u=${a.tutor_wa}`} 
                              className="w-full h-full rounded-xl object-cover" 
                           />
                        </div>
                        <div>
                           <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-sm uppercase leading-none">{tutor?.name || a.tutor_name || 'Tutor'}</h4>
                              <span className={cn(
                                 "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                                 selectedJournal?.id === a.id ? "bg-white/10 text-white border-white/20" : modeBadge
                              )}>
                                 {a.mode || 'Mandiri'}
                              </span>
                              {a.module_created && (
                                 <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                                    + Modul Materi
                                 </span>
                              )}
                              {hasMakeup && (
                                 <span className={cn(
                                    "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1",
                                    selectedJournal?.id === a.id 
                                       ? "bg-amber-500/20 text-amber-300 border-amber-500/30" 
                                       : "bg-amber-100 text-amber-900 border-amber-300"
                                 )}>
                                    <Repeat size={9} /> Make Up ({a.makeup_students?.length || 1})
                                 </span>
                              )}
                              {a.recall_reviewed && (
                                 <span className={cn(
                                    "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1",
                                    selectedJournal?.id === a.id 
                                       ? "bg-purple-500/20 text-purple-300 border-purple-500/30" 
                                       : "bg-purple-100 text-purple-900 border-purple-300"
                                 )}>
                                    <History size={9} /> Recall Selesai
                                 </span>
                              )}
                              {isTahsin && (
                                 <span className={cn(
                                    "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1",
                                    selectedJournal?.id === a.id 
                                       ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                       : "bg-emerald-100 text-emerald-800 border-emerald-300"
                                 )}>
                                    <BookOpen size={10} /> Tahsin & Tahfidz
                                    {a.surah_name && ` : ${a.surah_name}`}
                                    {a.tahsin_status && ` (${a.tahsin_status})`}
                                 </span>
                              )}
                           </div>
                           <p className={cn("text-[10px] font-bold uppercase tracking-wider mt-1.5", selectedJournal?.id === a.id ? "text-slate-400" : "text-slate-400")}>
                              {a.date} • {a.shift} • {a.level} • {a.material_origin}
                           </p>
                           <p className={cn("text-xs font-medium line-clamp-1 mt-1", selectedJournal?.id === a.id ? "text-slate-300" : "text-slate-600")}>
                              {a.material}
                           </p>
                        </div>
                     </div>

                     <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                        <div className="text-right">
                           <span className={cn("text-[9px] font-black uppercase block", selectedJournal?.id === a.id ? "text-slate-400" : "text-slate-400")}>
                              Hadir:
                           </span>
                           <span className="text-xs font-black uppercase">
                              {a.students.length} Siswa
                           </span>
                        </div>
                        <ChevronRight size={18} className={cn("transition-transform", selectedJournal?.id === a.id ? "text-white translate-x-1" : "text-slate-300")} />
                     </div>
                  </div>
               );
            })}

            {filteredJournals.length === 0 && (
               <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tidak ada data jurnal ditemukan.</p>
               </div>
            )}
         </div>
      </div>

      {/* Detail Jurnal Sidebar Panel */}
      <div className="w-full lg:w-96 shrink-0 sticky top-8">
         {selectedJournal ? (
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
               
               <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-4">
                     <div className="w-16 h-16 rounded-[1.5rem] bg-white/10 p-1">
                        <img 
                           src={appData.users.find(u => isRecordForTutor(selectedJournal.tutor_wa, u, selectedJournal.tutor_id))?.photo} 
                           className="w-full h-full rounded-[1.2rem] object-cover" 
                        />
                     </div>
                     <div>
                        <h3 className="font-black text-lg leading-none uppercase">{appData.users.find(u => isRecordForTutor(selectedJournal.tutor_wa, u, selectedJournal.tutor_id))?.name || selectedJournal.tutor_name}</h3>
                        <p className="text-emerald-400 text-[9px] font-black uppercase tracking-widest mt-1">Sesi: {selectedJournal.date} {selectedJournal.shift}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                           <span className="bg-white/20 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                              Mode: {selectedJournal.mode}
                           </span>
                           <span className="bg-emerald-500/30 text-emerald-300 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                              {selectedJournal.level}
                           </span>
                        </div>
                     </div>
                     <div className="ml-auto flex items-center gap-1.5">
                        <button 
                           onClick={() => setEditingJournal(selectedJournal)}
                           className="p-2 bg-white/10 hover:bg-emerald-600 rounded-xl transition text-white/70 hover:text-white cursor-pointer"
                           title="Edit Jurnal"
                        >
                           <Edit3 size={15} />
                        </button>
                        <button 
                           onClick={() => setDeletingId(selectedJournal.id)}
                           className="p-2 bg-white/10 hover:bg-red-500 rounded-xl transition text-white/50 hover:text-white cursor-pointer"
                           title="Hapus Jurnal Permanen"
                        >
                           <Trash2 size={15} />
                        </button>
                     </div>
                  </div>

                  <div className="space-y-6">
                     {/* KARTU REVIEW SETORAN TAHSIN & TAHFIDZ */}
                     {(selectedJournal.surah_name || selectedJournal.tahsin_status || selectedJournal.level?.toLowerCase().includes('tahsin') || selectedJournal.level?.toLowerCase().includes('tahfidz')) && (
                        <div>
                           <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <BookOpen size={14} /> Jurnal Setoran Tahsin & Tahfidz
                           </p>
                           <div className="bg-gradient-to-br from-emerald-950/90 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
                              <div className="flex justify-between items-start">
                                 <div>
                                    <span className="text-[9px] text-emerald-400 font-bold uppercase block">Nama Surat & Ayat:</span>
                                    <h4 className="text-base font-black text-white uppercase mt-0.5">
                                       Surat {selectedJournal.surah_name || '-'}
                                    </h4>
                                    <p className="text-xs text-emerald-300 font-bold mt-0.5">
                                       {selectedJournal.ayat_range || 'Ayat Lengkap'}
                                    </p>
                                 </div>
                                 <div className="text-right">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Keterangan:</span>
                                    <span className={cn(
                                       "inline-block mt-1 text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-md",
                                       selectedJournal.tahsin_status === 'Ulang' 
                                          ? "bg-amber-500 text-slate-950" 
                                          : "bg-emerald-400 text-slate-950"
                                    )}>
                                       {selectedJournal.tahsin_status === 'Ulang' ? '⚠️ ULANG' : '✅ LANCAR'}
                                    </span>
                                 </div>
                              </div>

                              {/* Rincian Per Siswa jika ada */}
                              {selectedJournal.tahsin_records && selectedJournal.tahsin_records.length > 0 && (
                                 <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
                                    <span className="text-[9px] font-black uppercase text-emerald-400 block">Rincian Per Siswa:</span>
                                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scroll pr-1">
                                       {selectedJournal.tahsin_records.map((rec, idx) => (
                                          <div key={idx} className="flex justify-between items-center bg-white/5 px-2.5 py-1.5 rounded-lg text-[10px]">
                                             <span className="font-black uppercase text-slate-200">{rec.student_name}</span>
                                             <div className="flex items-center gap-2">
                                                <span className="text-slate-400">{rec.surah_name} ({rec.ayat_range})</span>
                                                <span className={cn(
                                                   "font-black px-1.5 py-0.5 rounded text-[8px] uppercase",
                                                   rec.status === 'Ulang' ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"
                                                )}>
                                                   {rec.status}
                                                </span>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              )}
                           </div>
                        </div>
                     )}

                     {selectedJournal.module_created && (
                        <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3">
                           <Award className="text-gold-400 shrink-0" size={20} />
                           <div>
                              <p className="text-[10px] font-black text-emerald-300 uppercase">Honor Tambahan Pembuatan Modul</p>
                              <p className="text-xs text-white/80 mt-0.5">Tutor mengajukan pembuatan materi modul khusus pada sesi ini.</p>
                           </div>
                        </div>
                     )}

                     <div>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <BookOpen size={14} /> Materi Pembelajaran
                        </p>
                        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                           <p className="text-sm font-bold leading-relaxed">{selectedJournal.material}</p>
                           <div className="mt-3 flex gap-2">
                              <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black px-2 py-1 rounded-full uppercase">{selectedJournal.material_origin}</span>
                              <span className="bg-white/10 text-slate-300 text-[8px] font-black px-2 py-1 rounded-full uppercase">{selectedJournal.book_source || 'Tanpa Buku'}</span>
                           </div>
                        </div>
                     </div>

                     <div>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <UserIcon size={14} /> Absensi Siswa ({selectedJournal.students.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                           {selectedJournal.students.map(s => (
                              <span key={s} className="bg-white/5 border border-white/10 text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-tighter">{s}</span>
                           ))}
                        </div>
                     </div>

                     {selectedJournal.notes && (
                        <div>
                           <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <MessageSquare size={14} /> Catatan & Kendala
                           </p>
                           <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                              <p className="text-xs text-slate-300 italic">"{selectedJournal.notes}"</p>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         ) : (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center text-center space-y-4 h-full min-h-[400px]">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                  <Calendar className="text-slate-200" size={32} />
               </div>
               <p className="text-slate-400 text-xs italic">Pilih jurnal untuk<br />melihat detil laporan</p>
            </div>
         )}
      </div>

      {/* Edit Journal Modal */}
      {editingJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <Edit3 className="text-emerald-600" size={20} />
                <h3 className="font-black text-slate-800 uppercase tracking-tight text-base">Edit Jurnal Mengajar</h3>
              </div>
              <button 
                onClick={() => setEditingJournal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Mode Mengajar</label>
                  <select 
                    value={editingJournal.mode}
                    onChange={e => setEditingJournal({ ...editingJournal, mode: e.target.value as TeachingMode })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase outline-none focus:border-emerald-500"
                  >
                    <option value="Mandiri">Mandiri</option>
                    <option value="Team">Team</option>
                    <option value="Private">Private</option>
                    <option value="Semi Private">Semi Private</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Level / Program</label>
                  <select 
                    value={editingJournal.level}
                    onChange={e => setEditingJournal({ ...editingJournal, level: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase outline-none focus:border-emerald-500"
                  >
                    {WIC_LEVELS.map(lvl => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Materi Pokok / Pembelajaran</label>
                <textarea 
                  rows={3}
                  value={editingJournal.material}
                  onChange={e => setEditingJournal({ ...editingJournal, material: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Setoran Tahsin & Tahfidz Fields */}
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 space-y-3">
                <span className="text-[10px] font-black uppercase text-emerald-800 block flex items-center gap-1.5">
                  <BookOpen size={13} /> Data Setoran Al-Qur'an (Tahsin & Tahfidz)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-emerald-700 mb-1">Nama Surat</label>
                    <input 
                      type="text"
                      list="surah-list-edit"
                      value={editingJournal.surah_name || ''}
                      onChange={e => setEditingJournal({ ...editingJournal, surah_name: e.target.value })}
                      placeholder="Misal: An-Naba'"
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-600"
                    />
                    <datalist id="surah-list-edit">
                      {ALL_QURAN_SURAHS.map((s, i) => (
                        <option key={i} value={s.replace(/^\d+\.\s*/, '')} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-emerald-700 mb-1">Rentang Ayat</label>
                    <input 
                      type="text"
                      value={editingJournal.ayat_range || ''}
                      onChange={e => setEditingJournal({ ...editingJournal, ayat_range: e.target.value })}
                      placeholder="Misal: Ayat 1-15"
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-emerald-700 mb-1">Status Kelancaran</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingJournal({ ...editingJournal, tahsin_status: 'Lancar' })}
                      className={cn(
                        "py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer",
                        editingJournal.tahsin_status === 'Lancar' 
                          ? "bg-emerald-600 text-white border-emerald-600 shadow" 
                          : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                      )}
                    >
                      ✅ LANCAR
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingJournal({ ...editingJournal, tahsin_status: 'Ulang' })}
                      className={cn(
                        "py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer",
                        editingJournal.tahsin_status === 'Ulang' 
                          ? "bg-amber-500 text-slate-950 border-amber-500 shadow" 
                          : "bg-white text-amber-800 border-amber-300 hover:bg-amber-100"
                      )}
                    >
                      ⚠️ ULANG
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Catatan Tambahan</label>
                <input 
                  type="text"
                  value={editingJournal.notes || ''}
                  onChange={e => setEditingJournal({ ...editingJournal, notes: e.target.value })}
                  placeholder="Catatan kelas, kendala, atau motivasi..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingJournal(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-gold-400 text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Check size={14} /> Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-red-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Hapus Jurnal Permanen?</h3>
            <p className="text-xs text-slate-500 mt-2 mb-6">
              Catatan jurnal mengajar ini akan dihapus secara permanen dari database sistem & Cloud Firestore.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/20 cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-red-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Hapus {selectedJournalIds.length} Jurnal Permanen?</h3>
            <p className="text-xs text-slate-500 mt-2 mb-6">
              Seluruh ({selectedJournalIds.length}) catatan jurnal mengajar yang Anda pilih akan dihapus secara permanen dari database Cloud Firestore.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/20 cursor-pointer"
              >
                Hapus {selectedJournalIds.length} Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
