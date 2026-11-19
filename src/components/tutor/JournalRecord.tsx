import React from 'react';
import { Attendance, Student, Settings, User, TeachingMode, TahsinStudentSetoran, TeachingModule } from '../../types';
import { WIC_LEVELS, WIC_SHIFTS, POPULAR_TAHSIN_SURAHS, ALL_QURAN_SURAHS } from '../../constants';
import { getDayName, formatCurrency, normalizeUrl } from '../../lib/utils';
import { 
  CalendarDays, 
  Send, 
  Check, 
  Award, 
  Lock, 
  BookOpen, 
  AlertCircle, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  Search, 
  UserCheck, 
  Repeat, 
  History,
  ExternalLink,
  CalendarOff,
  Eye
} from 'lucide-react';
import { cn } from '../../lib/utils';
import ModuleViewerModal from '../common/ModuleViewerModal';

interface JournalRecordProps {
  students: Student[];
  tutorWa: string;
  periodText: string;
  onSubmit: (data: Attendance) => void;
  history: Attendance[];
  allAttendance?: Attendance[];
  tutors?: User[];
  settings?: Settings;
  tutorUser?: User;
  modules?: TeachingModule[];
}

function matchShift(shiftA?: string, shiftB?: string): boolean {
  if (!shiftA || !shiftB) return false;
  const a = shiftA.replace(/[–—]/g, '-').replace(/\s+/g, '').toLowerCase();
  const b = shiftB.replace(/[–—]/g, '-').replace(/\s+/g, '').toLowerCase();
  if (a === 'belumdiatur' || b === 'belumdiatur' || !a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  // Extract starting time: e.g. "08.00", "08:00", "14.30"
  const timeA = a.match(/\d{1,2}[.:]\d{2}/);
  const timeB = b.match(/\d{1,2}[.:]\d{2}/);
  if (timeA && timeB) {
    const normA = timeA[0].replace(':', '.');
    const normB = timeB[0].replace(':', '.');
    const padA = normA.length === 4 ? `0${normA}` : normA;
    const padB = normB.length === 4 ? `0${normB}` : normB;
    if (padA === padB) {
      return true;
    }
  }

  // Extract shift index e.g. "shift1", "shift 1", "shift-1"
  const shA = a.match(/shift[-_ ]*(\d+)/i);
  const shB = b.match(/shift[-_ ]*(\d+)/i);
  if (shA && shB && shA[1] === shB[1]) return true;

  return false;
}

function matchDay(dayA?: string, dayB?: string): boolean {
  if (!dayA || !dayB) return false;
  const a = dayA.trim().toLowerCase();
  const b = dayB.trim().toLowerCase();
  if (a === 'belum diatur' || b === 'belum diatur' || !a || !b) return false;
  if (a === b) return true;

  const daysInA = a.split(/[\s,&/]+/).filter(Boolean);
  const daysInB = b.split(/[\s,&/]+/).filter(Boolean);
  return daysInA.includes(b) || daysInB.includes(a) || a.includes(b) || b.includes(a);
}

export default function JournalRecord({ 
  students, 
  tutorWa, 
  periodText, 
  onSubmit, 
  history,
  allAttendance = [],
  tutors = [],
  settings,
  tutorUser,
  modules = []
}: JournalRecordProps) {
  const initialDate = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = React.useState({
    date: initialDate,
    day: getDayName(initialDate),
    shift: '',
    level: '',
    mode: 'Mandiri' as TeachingMode,
    material_origin: 'WIC' as 'WIC' | 'Sekolah',
    book_source: '',
    material: '',
    notes: '',
    selectedStudents: [] as string[],
    module_created: false,
    module_title: '',
    // Data Khusus Tahsin & Tahfidz
    surah_name: 'An-Naba\'',
    ayat_range: 'Ayat 1 - 15',
    tahsin_status: 'Lancar' as 'Lancar' | 'Ulang',
    perStudentRecords: {} as Record<string, { surah_name: string; ayat_range: string; status: 'Lancar' | 'Ulang'; note?: string }>,
    // Data Khusus Sesi Pengganti (Make Up Class)
    is_makeup_session: false,
    makeup_students: [] as string[],
    makeup_notes: '',
    // Data Khusus Recall & Review Materi Sebelumnya
    recall_reviewed: true,
    recall_notes: ''
  });

  const [showMakeupSelector, setShowMakeupSelector] = React.useState(false);
  const [makeupSearchTerm, setMakeupSearchTerm] = React.useState('');
  const [isClassHistoryModalOpen, setIsClassHistoryModalOpen] = React.useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = React.useState('');
  const [viewerModule, setViewerModule] = React.useState<TeachingModule | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const dayName = getDayName(formData.date);
  const effectiveDay = formData.day || dayName;
  
  // Periksa apakah tanggal di luar durasi kalender periode aktif
  const isOutsidePeriod = React.useMemo(() => {
    if (!settings?.period_start_date || !settings?.period_end_date) return false;
    return formData.date < settings.period_start_date || formData.date > settings.period_end_date;
  }, [formData.date, settings?.period_start_date, settings?.period_end_date]);

  // Is current session a Tahsin & Tahfidz program?
  const isTahsinSession = React.useMemo(() => {
    if (!formData.level) return false;
    const l = formData.level.toLowerCase();
    return l.includes('tahsin') || l.includes('tahfidz');
  }, [formData.level]);

  // Modul ajar resmi yang terkoneksi langsung dengan level aktif
  const connectedLevelModules = React.useMemo(() => {
    if (!formData.level) return [];
    return (modules || []).filter(m => m.level?.toLowerCase() === formData.level?.toLowerCase());
  }, [modules, formData.level]);

  // Modul yang cocok dengan buku sumber yang dipilih saat ini
  const activeMatchedModule = React.useMemo(() => {
    if (!connectedLevelModules.length) return null;
    if (formData.book_source) {
      const found = connectedLevelModules.find(m => m.title.toLowerCase() === formData.book_source.toLowerCase());
      if (found) return found;
    }
    return connectedLevelModules[0];
  }, [connectedLevelModules, formData.book_source]);

  // Siswa pada level/shift ini yang sedang dalam masa cuti resmi
  const onLeaveStudents = React.useMemo(() => {
    if (!formData.level) return [];
    return students.filter(s => 
      s.status === 'CUTI' && (s.level === formData.level || s.level2 === formData.level)
    );
  }, [students, formData.level]);

  // 1. Siswa reguler yang terjadwal secara presisi di Shift, Hari, & Level ini (disetting oleh admin)
  const shiftStudents = React.useMemo(() => {
    if (!formData.level || !formData.shift || !effectiveDay) return [];
    const targetLevel = (formData.level || '').toLowerCase().trim();

    return students.filter(s => {
      if (s.status === 'CUTI' || s.status === 'NONAKTIF') return false;
      const isProg1 = (s.level || '').toLowerCase().trim() === targetLevel;
      const isProg2 = (s.level2 || '').toLowerCase().trim() === targetLevel;
      if (!isProg1 && !isProg2) return false;

      // Program 1 Schedule Matches:
      const hasExplicitProg1 = Boolean(s.hari1 || s.hari2);
      const matchProg1_1 = isProg1 && matchDay(s.hari1, effectiveDay) && matchShift(s.shift1, formData.shift);
      const matchProg1_2 = isProg1 && matchDay(s.hari2, effectiveDay) && matchShift(s.shift2, formData.shift);
      const matchProg1_comb = isProg1 && !hasExplicitProg1 && matchDay(s.schedule_days, effectiveDay) && matchShift(s.schedule_shift, formData.shift);

      // Program 2 (Dual Program) Schedule Matches:
      const prog2_h1 = s.prog2_hari1 || s.hari_prog2;
      const prog2_s1 = s.prog2_shift1 || s.shift_prog2;
      const matchProg2_1 = isProg2 && matchDay(prog2_h1, effectiveDay) && matchShift(prog2_s1, formData.shift);
      const matchProg2_2 = isProg2 && matchDay(s.prog2_hari2, effectiveDay) && matchShift(s.prog2_shift2, formData.shift);

      return matchProg1_1 || matchProg1_2 || matchProg1_comb || matchProg2_1 || matchProg2_2;
    });
  }, [students, formData.level, effectiveDay, formData.shift]);

  // Siswa yang ditambahkan via Make Up Class
  const makeupStudentsList = React.useMemo(() => {
    if (!formData.makeup_students || formData.makeup_students.length === 0) return [];
    const makeupSet = new Set(formData.makeup_students);
    return students.filter(s => makeupSet.has(s.name));
  }, [students, formData.makeup_students]);

  // Daftar hadir aktif:
  // HANYA siswa yang terjadwal pada Shift, Hari, dan Level yang dipilih (+ siswa make up pengganti jika ada)
  const baseRosterStudents = React.useMemo(() => {
    return shiftStudents;
  }, [shiftStudents]);

  const activeRosterStudents = React.useMemo(() => {
    const baseIds = new Set(baseRosterStudents.map(s => s.id));
    const additionalMakeup = makeupStudentsList.filter(s => !baseIds.has(s.id));
    return [...baseRosterStudents, ...additionalMakeup];
  }, [baseRosterStudents, makeupStudentsList]);

  // Filtered by quick search term di tabel absensi
  const displayedStudents = React.useMemo(() => {
    if (!studentSearchTerm.trim()) return activeRosterStudents;
    const q = studentSearchTerm.toLowerCase();
    return activeRosterStudents.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.nickname && s.nickname.toLowerCase().includes(q)) || 
      s.id.toLowerCase().includes(q)
    );
  }, [activeRosterStudents, studentSearchTerm]);

  // Seluruh kandidat siswa untuk fitur Make Up Class (dengan pencarian & scrolling)
  const allMakeupCandidates = React.useMemo(() => {
    const scheduledIds = new Set(baseRosterStudents.map(s => s.id));
    // Ambil seluruh siswa aktif WIC di luar yang sudah terjadwal di shift ini
    const candidates = students.filter(s => s.status !== 'CUTI' && !scheduledIds.has(s.id));
    if (!makeupSearchTerm.trim()) {
      // Prioritaskan siswa dengan level yang sama di urutan teratas
      return candidates.sort((a, b) => {
        const aSame = (a.level === formData.level || a.level2 === formData.level) ? 1 : 0;
        const bSame = (b.level === formData.level || b.level2 === formData.level) ? 1 : 0;
        return bSame - aSame;
      });
    }
    const q = makeupSearchTerm.toLowerCase();
    return candidates.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.nickname && s.nickname.toLowerCase().includes(q)) || 
      s.id.toLowerCase().includes(q) || 
      (s.level && s.level.toLowerCase().includes(q)) || 
      (s.level2 && s.level2.toLowerCase().includes(q))
    );
  }, [students, baseRosterStudents, formData.level, makeupSearchTerm]);

  // Riwayat seluruh pertemuan di kelas / level ini dari SEMUA tutor
  const classAttendanceHistory = React.useMemo(() => {
    if (!formData.level) return [];
    const pool = (allAttendance && allAttendance.length > 0) ? allAttendance : history;
    return pool
      .filter(h => (h.level || '').toLowerCase() === (formData.level || '').toLowerCase())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allAttendance, history, formData.level]);

  // Rujukan materi pertemuan terakhir di kelas ini (dari pengajar sebelumnya siapapun itu)
  const lastClassSession = React.useMemo(() => {
    if (!formData.level) return null;
    const pool = (allAttendance && allAttendance.length > 0) ? allAttendance : history;
    return pool
      .filter(h => (h.level || '').toLowerCase() === (formData.level || '').toLowerCase() && h.date <= formData.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;
  }, [formData.level, formData.date, allAttendance, history]);

  // Nama Tutor yang mengajar pertemuan terakhir
  const lastSessionTutorName = React.useMemo(() => {
    if (!lastClassSession) return null;
    if (tutors && tutors.length > 0) {
      const found = tutors.find(t => 
        (t.wa && t.wa === lastClassSession.tutor_wa) || 
        (t.username && t.username.toLowerCase() === (lastClassSession.tutor_wa || '').toLowerCase())
      );
      if (found) {
        const isFemale = found.gender === 'P' || found.gender === 'Perempuan' || found.title === 'Miss';
        return `${isFemale ? 'Miss' : 'Mr.'} ${found.name}`;
      }
    }
    return lastClassSession.tutor_wa || 'Tutor WIC';
  }, [lastClassSession, tutors]);

  const toggleStudent = (name: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedStudents.includes(name);
      const nextSelected = isSelected
        ? prev.selectedStudents.filter(n => n !== name)
        : [...prev.selectedStudents, name];

      // Init per-student setoran record if added
      const nextPerStudent = { ...prev.perStudentRecords };
      if (!isSelected && !nextPerStudent[name]) {
        nextPerStudent[name] = {
          surah_name: prev.surah_name || 'An-Naba\'',
          ayat_range: prev.ayat_range || 'Ayat 1 - 15',
          status: prev.tahsin_status
        };
      }

      return {
        ...prev,
        selectedStudents: nextSelected,
        perStudentRecords: nextPerStudent
      };
    });
  };

  // Eligibility checks for Semi Private
  const isSemiPrivateEnabled = settings?.enable_semi_private !== false;
  const isCertifiedRequired = settings?.semi_private_certified_only !== false;
  const isTutorCertified = Boolean(
    tutorUser?.is_certified || 
    tutorUser?.status_tutor?.toLowerCase().includes('sertifikasi')
  );
  const canAccessSemiPrivate = isSemiPrivateEnabled && (!isCertifiedRequired || isTutorCertified);

  const handleApplyToAllStudents = () => {
    const updated: Record<string, { surah_name: string; ayat_range: string; status: 'Lancar' | 'Ulang'; note?: string }> = {};
    formData.selectedStudents.forEach(sName => {
      updated[sName] = {
        surah_name: formData.surah_name,
        ayat_range: formData.ayat_range,
        status: formData.tahsin_status
      };
    });
    setFormData(prev => ({ ...prev, perStudentRecords: updated }));
  };

  const handleUpdateStudentSetoran = (studentName: string, field: 'surah_name' | 'ayat_range' | 'status' | 'note', val: any) => {
    setFormData(prev => ({
      ...prev,
      perStudentRecords: {
        ...prev.perStudentRecords,
        [studentName]: {
          ...(prev.perStudentRecords[studentName] || {
            surah_name: prev.surah_name,
            ayat_range: prev.ayat_range,
            status: prev.tahsin_status
          }),
          [field]: val
        }
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.shift || !formData.level) {
      setSubmitError("Mohon pilih Waktu / Shift dan Program / Level Kelas terlebih dahulu.");
      return;
    }

    // Jika materi kosong dan sesi Tahsin, buat deskripsi otomatis
    let materialFinal = formData.material.trim();
    if (isTahsinSession && !materialFinal) {
      materialFinal = `Setoran Surat ${formData.surah_name} (${formData.ayat_range}) • Status: ${formData.tahsin_status}`;
    }

    if (!materialFinal) {
      setSubmitError("Mohon isi Deskripsi Ringkas Materi pembelajaran hari ini.");
      return;
    }

    // Build per-student tahsin records
    let tahsinRecordsList: TahsinStudentSetoran[] | undefined = undefined;
    if (isTahsinSession && formData.selectedStudents.length > 0) {
      tahsinRecordsList = formData.selectedStudents.map(sName => {
        const item = formData.perStudentRecords[sName] || {
          surah_name: formData.surah_name,
          ayat_range: formData.ayat_range,
          status: formData.tahsin_status
        };
        return {
          student_name: sName,
          surah_name: item.surah_name,
          ayat_range: item.ayat_range,
          status: item.status,
          note: item.note
        };
      });
    }

    const resolvedTutorWa = (tutorUser?.wa || '').trim() || (tutorWa || '').trim() || (tutorUser?.username || '').trim() || (tutorUser?.id || '');

    const record: Attendance = {
      id: 'JRN-' + Date.now(),
      tutor_wa: resolvedTutorWa,
      tutor_id: tutorUser?.id,
      tutor_name: tutorUser?.name,
      date: formData.date,
      shift: formData.shift,
      level: formData.level,
      mode: formData.mode,
      material_origin: formData.material_origin,
      book_source: formData.book_source || (isTahsinSession ? 'Al-Qur\'an / Mushaf Tajwid' : ''),
      material: materialFinal,
      notes: formData.notes,
      students: formData.selectedStudents,
      period: periodText,
      source: 'Internal Portal',
      module_created: formData.mode === 'Semi Private' ? formData.module_created : false,
      module_title: (formData.mode === 'Semi Private' && formData.module_created) ? formData.module_title : '',
      // Tahsin & Tahfidz fields:
      surah_name: isTahsinSession ? formData.surah_name : undefined,
      ayat_range: isTahsinSession ? formData.ayat_range : undefined,
      tahsin_status: isTahsinSession ? formData.tahsin_status : undefined,
      tahsin_records: tahsinRecordsList,
      // Sesi Pengganti (Make Up Class):
      makeup_students: formData.makeup_students,
      is_makeup_session: formData.is_makeup_session || (formData.makeup_students.length > 0),
      makeup_notes: formData.makeup_notes,
      // Recall & Review Materi Sebelumnya:
      recall_reviewed: formData.recall_reviewed,
      recall_notes: formData.recall_notes
    };

    onSubmit(record);
    setFormData(prev => ({ 
      ...prev, 
      material: '', 
      notes: '', 
      selectedStudents: [], 
      book_source: '',
      module_created: false,
      module_title: '',
      perStudentRecords: {},
      is_makeup_session: false,
      makeup_students: [],
      makeup_notes: '',
      recall_reviewed: true,
      recall_notes: ''
    }));
    setShowMakeupSelector(false);
  };

  // History Review state
  const [reviewingSession, setReviewingSession] = React.useState<Attendance | null>(null);

  const moduleBonusAmount = settings?.semi_private_module_bonus || 25000;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start animate-in fade-in duration-300">
      <form onSubmit={handleSubmit} className="flex-1 w-full bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-black text-slate-800 uppercase text-lg flex items-center gap-2">
              <CalendarDays className="text-emerald-700" size={22} /> Form Jurnal Pengajaran
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Input materi harian, absensi kehadiran, dan sistem pengajaran resmi
            </p>
          </div>
          <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
             Periode: {periodText}
          </span>
        </div>

        {isOutsidePeriod && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
             <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
             <div>
                <p className="text-xs font-black uppercase text-amber-900">Info Rentang Kalender Periode</p>
                <p className="text-[10px] text-amber-800 font-medium mt-0.5">
                  Kalender acuan admin disetel {settings?.period_start_date} s/d {settings?.period_end_date}. Jurnal Anda tetap otomatis terekam dan terhitung ke dalam Slip Gaji Periode Aktif (<strong>{periodText}</strong>).
                </p>
             </div>
          </div>
        )}

        {/* Baris Tanggal, Hari & Shift */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500">Tanggal Mengajar</label>
              <input 
                type="date" 
                value={formData.date} 
                onChange={e => {
                  const newDate = e.target.value;
                  const newDay = getDayName(newDate);
                  setFormData(prev => ({ ...prev, date: newDate, day: newDay }));
                }} 
                className="input-premium font-bold" 
                required 
              />
           </div>
           <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500">Hari Mengajar</label>
              <select
                value={effectiveDay}
                onChange={e => setFormData(prev => ({ ...prev, day: e.target.value }))}
                className="input-premium font-bold text-emerald-950"
                required
              >
                {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <p className="text-[9px] font-bold text-emerald-800 mt-1">
                 Sinkron dengan jadwal shift siswa
              </p>
           </div>
           <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500">Pilih Waktu / Shift</label>
              <select 
                value={formData.shift} 
                onChange={e => setFormData(prev => ({...prev, shift: e.target.value}))} 
                className="input-premium font-bold" 
                required
              >
                 <option value="">-- Pilih Waktu / Shift --</option>
                 {WIC_SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <p className="text-[9px] font-bold text-slate-400 mt-1">
                 {formData.shift ? `Shift: ${formData.shift}` : 'Wajib dipilih'}
              </p>
           </div>
        </div>

        {/* Level / Program & Pilihan Materi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold uppercase text-slate-500">Program / Level Kelas</label>
                {isTahsinSession && (
                  <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    📖 Mode Al-Qur'an Aktif
                  </span>
                )}
              </div>
              <select 
                value={formData.level} 
                onChange={e => setFormData({...formData, level: e.target.value})} 
                className={cn(
                  "input-premium font-bold",
                  isTahsinSession && "border-emerald-500 bg-emerald-50/30 text-emerald-950 ring-1 ring-emerald-500"
                )} 
                required
              >
                 <option value="">-- Pilih Program / Level --</option>
                 <option value="Tahsin & Tahfidz">⭐ Tahsin & Tahfidz (Program Quran)</option>
                 {WIC_LEVELS.filter(l => l !== 'Tahsin & Tahfidz').map(l => (
                   <option key={l} value={l}>{l}</option>
                 ))}
              </select>
           </div>
           <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500">Pilihan Materi Ajar</label>
              <select 
                value={formData.material_origin} 
                onChange={e => setFormData({...formData, material_origin: e.target.value as any})} 
                className="input-premium" 
                required
              >
                 <option value="WIC">Kurikulum WIC (Standar)</option>
                 <option value="Sekolah">Tugas / Ujian Sekolah</option>
              </select>
           </div>
        </div>

        {/* SEKSI KHUSUS TAHSIN & TAHFIDZ (INPUT NAMA SURAT, AYAT, DAN KETERANGAN LANCAR/ULANG) */}
        {isTahsinSession && (
          <div className="p-5 bg-gradient-to-br from-emerald-50 via-teal-50 to-white rounded-3xl border-2 border-emerald-500 shadow-sm space-y-4 animate-in fade-in">
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-emerald-200 pb-3">
               <div className="flex items-center gap-2">
                 <div className="p-2 bg-emerald-900 text-gold-400 rounded-xl">
                   <BookOpen size={18} />
                 </div>
                 <div>
                   <h4 className="text-xs font-black uppercase text-emerald-950">
                     Review Jurnal Program Tahsin & Tahfidz
                   </h4>
                   <p className="text-[10px] text-emerald-700 font-medium">
                     Input nama surat, rentang ayat yang disetor, dan keterangan (Lancar / Ulang)
                   </p>
                 </div>
               </div>
               <span className="text-[9px] font-black uppercase text-emerald-900 bg-emerald-100 px-3 py-1 rounded-full self-start sm:self-auto">
                 Setoran Tilawah & Hafalan
               </span>
             </div>

             {/* Chip Pilihan Cepat Surat Populer / Juz Amma */}
             <div>
               <label className="block text-[9px] font-black uppercase text-emerald-800 mb-1.5 flex items-center gap-1">
                 <Sparkles size={11} className="text-emerald-600" /> Pilih Cepat Surat (Juz 'Amma & Populer):
               </label>
               <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scroll p-1 bg-white/70 rounded-xl border border-emerald-200">
                 {POPULAR_TAHSIN_SURAHS.slice(0, 20).map(s => (
                   <button
                     key={s}
                     type="button"
                     onClick={() => setFormData({ ...formData, surah_name: s })}
                     className={cn(
                       "px-2 py-1 rounded-lg text-[9px] font-black uppercase transition",
                       formData.surah_name === s 
                         ? "bg-emerald-900 text-gold-300 shadow-sm" 
                         : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                     )}
                   >
                     {s}
                   </button>
                 ))}
               </div>
             </div>

             {/* Baris Input Nama Surat, Ayat, dan Keterangan Status */}
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
               <div>
                 <label className="block text-[10px] font-black uppercase text-emerald-900 mb-1">
                   Nama Surat Al-Qur'an *
                 </label>
                 <select 
                   value={formData.surah_name} 
                   onChange={e => setFormData({ ...formData, surah_name: e.target.value })}
                   className="input-premium font-black text-xs text-emerald-950 bg-white"
                 >
                   <option value="">-- Pilih Surat --</option>
                   {ALL_QURAN_SURAHS.map(sn => (
                     <option key={sn} value={sn.replace(/^\d+\.\s*/, '')}>
                       {sn}
                     </option>
                   ))}
                 </select>
               </div>

               <div>
                 <label className="block text-[10px] font-black uppercase text-emerald-900 mb-1">
                   Ayat yang Disetor *
                 </label>
                 <input 
                   type="text" 
                   value={formData.ayat_range}
                   onChange={e => setFormData({ ...formData, ayat_range: e.target.value })}
                   placeholder="Contoh: Ayat 1 - 15"
                   className="input-premium font-bold text-xs bg-white"
                   required={isTahsinSession}
                 />
               </div>

               <div>
                 <label className="block text-[10px] font-black uppercase text-emerald-900 mb-1">
                   Keterangan Status *
                 </label>
                 <div className="grid grid-cols-2 gap-2">
                   {/* Tombol Lancar */}
                   <button
                     type="button"
                     onClick={() => setFormData({ ...formData, tahsin_status: 'Lancar' })}
                     className={cn(
                       "py-2 px-2 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5 transition border-2",
                       formData.tahsin_status === 'Lancar'
                         ? "bg-emerald-700 text-white border-emerald-800 shadow-md"
                         : "bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50"
                     )}
                   >
                     <CheckCircle2 size={13} />
                     <span>Lancar</span>
                   </button>

                   {/* Tombol Ulang */}
                   <button
                     type="button"
                     onClick={() => setFormData({ ...formData, tahsin_status: 'Ulang' })}
                     className={cn(
                       "py-2 px-2 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5 transition border-2",
                       formData.tahsin_status === 'Ulang'
                         ? "bg-amber-600 text-white border-amber-700 shadow-md"
                         : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
                     )}
                   >
                     <RotateCcw size={13} />
                     <span>Ulang</span>
                   </button>
                 </div>
               </div>
             </div>

             {/* Rincian Setoran Per Siswa Hadir (Jika Ada Lebih Dari 1 Siswa Terpilih) */}
             {formData.selectedStudents.length > 0 && (
               <div className="bg-white p-4 rounded-2xl border border-emerald-200 space-y-3">
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                   <span className="text-[10px] font-black uppercase text-emerald-900">
                     Rincian Setoran Per Siswa Hadir ({formData.selectedStudents.length} siswa)
                   </span>
                   <button
                     type="button"
                     onClick={handleApplyToAllStudents}
                     className="text-[9px] font-black uppercase text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto transition"
                   >
                     ⚡ Samakan Semua ({formData.surah_name}: {formData.ayat_range} - {formData.tahsin_status})
                   </button>
                 </div>

                 <div className="space-y-2 max-h-48 overflow-y-auto custom-scroll pr-1">
                   {formData.selectedStudents.map(sName => {
                     const item = formData.perStudentRecords[sName] || {
                       surah_name: formData.surah_name,
                       ayat_range: formData.ayat_range,
                       status: formData.tahsin_status
                     };

                     return (
                       <div key={sName} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                         <span className="font-black text-slate-800 uppercase sm:w-36 truncate">{sName}</span>
                         <input 
                           type="text" 
                           value={item.surah_name} 
                           onChange={e => handleUpdateStudentSetoran(sName, 'surah_name', e.target.value)}
                           placeholder="Surat"
                           className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-800 sm:w-32"
                         />
                         <input 
                           type="text" 
                           value={item.ayat_range} 
                           onChange={e => handleUpdateStudentSetoran(sName, 'ayat_range', e.target.value)}
                           placeholder="Ayat"
                           className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-800 sm:w-28"
                         />
                         <div className="flex gap-1 shrink-0">
                           <button
                             type="button"
                             onClick={() => handleUpdateStudentSetoran(sName, 'status', 'Lancar')}
                             className={cn(
                               "px-2.5 py-1 rounded text-[9px] font-black uppercase transition",
                               item.status === 'Lancar' ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200"
                             )}
                           >
                             Lancar
                           </button>
                           <button
                             type="button"
                             onClick={() => handleUpdateStudentSetoran(sName, 'status', 'Ulang')}
                             className={cn(
                               "px-2.5 py-1 rounded text-[9px] font-black uppercase transition",
                               item.status === 'Ulang' ? "bg-amber-600 text-white" : "bg-white text-slate-600 border border-slate-200"
                             )}
                           >
                             Ulang
                           </button>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
             )}
          </div>
        )}

        <div>
           <div className="flex items-center justify-between mb-1">
             <label className="block text-[10px] font-bold uppercase text-slate-500">
               Sumber Materi Ajar (Buku/Modul/Mushaf)
             </label>
             {activeMatchedModule?.app_url && (
               <button
                 type="button"
                 onClick={() => setViewerModule(activeMatchedModule)}
                 className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-800 hover:text-emerald-950 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 px-3 py-1 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
               >
                 <Eye size={13} className="text-emerald-700" />
                 <span>Baca Buku Modul ({activeMatchedModule.title.slice(0, 24)}...)</span>
               </button>
             )}
           </div>

           {/* Connected Modules Quick Selector for Selected Level */}
           {connectedLevelModules.length > 0 && (
             <div className="mb-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
               <div className="flex items-center justify-between mb-1.5">
                 <span className="text-[9px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1">
                   <BookOpen size={11} /> Modul Tersinkron Level {formData.level} ({connectedLevelModules.length}):
                 </span>
                 <span className="text-[8px] font-bold text-emerald-600">Klik untuk langsung pilih buku</span>
               </div>
               <div className="flex flex-wrap gap-1.5">
                 {connectedLevelModules.map(m => {
                   const isSelected = formData.book_source === m.title;
                   return (
                     <button
                       key={m.id}
                       type="button"
                       onClick={() => setFormData({ ...formData, book_source: m.title })}
                       className={cn(
                         "px-2.5 py-1 rounded-xl text-[10px] font-bold transition flex items-center gap-1.5 border",
                         isSelected
                           ? "bg-emerald-950 text-gold-400 border-emerald-900 shadow-xs"
                           : "bg-white text-slate-700 border-emerald-200 hover:bg-emerald-100/50"
                       )}
                     >
                       <span>{m.title}</span>
                       {isSelected && <Check size={11} />}
                     </button>
                   );
                 })}
               </div>
             </div>
           )}

           <input 
            type="text" 
            value={formData.book_source} 
            onChange={e => setFormData({...formData, book_source: e.target.value})} 
            className="input-premium" 
            placeholder={isTahsinSession ? "Contoh: Mushaf Tajwid Madinah / Buku Tahsin WIC" : "Contoh: English for Fun Vol. 2 / Modul Mandiri"} 
           />
        </div>

        {/* SISTEM PENGAJARAN (4 MODES) */}
        <div>
           <div className="flex justify-between items-center mb-2">
             <label className="block text-[10px] font-bold uppercase text-slate-500">
               Sistem Mengajar Sesi Ini
             </label>
             <span className="text-[9px] font-bold text-slate-400">
               Pilih salah satu mode pengajaran resmi
             </span>
           </div>

           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* 1. Mandiri */}
              <button 
                type="button" 
                onClick={() => setFormData({...formData, mode: 'Mandiri'})}
                className={cn(
                  "p-3 rounded-2xl border-2 font-black text-[11px] uppercase transition flex flex-col items-center justify-center gap-1",
                  formData.mode === 'Mandiri' 
                    ? "bg-emerald-900 text-white border-emerald-950 shadow-md" 
                    : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
                )}
              >
                <span>MANDIRI</span>
                <span className="text-[8px] font-bold opacity-80">Tarif Standar</span>
              </button>

              {/* 2. Team Teaching */}
              <button 
                type="button" 
                onClick={() => setFormData({...formData, mode: 'Team'})}
                className={cn(
                  "p-3 rounded-2xl border-2 font-black text-[11px] uppercase transition flex flex-col items-center justify-center gap-1",
                  formData.mode === 'Team' 
                    ? "bg-emerald-900 text-white border-emerald-950 shadow-md" 
                    : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
                )}
              >
                <span>TEAM</span>
                <span className="text-[8px] font-bold opacity-80">Kolaborasi</span>
              </button>

              {/* 3. Private */}
              <button 
                type="button" 
                onClick={() => setFormData({...formData, mode: 'Private'})}
                className={cn(
                  "p-3 rounded-2xl border-2 font-black text-[11px] uppercase transition flex flex-col items-center justify-center gap-1 relative overflow-hidden",
                  formData.mode === 'Private' 
                    ? "bg-purple-900 text-white border-purple-950 shadow-md" 
                    : "bg-white text-purple-900 border-slate-200 hover:border-purple-300"
                )}
              >
                <span>PRIVATE</span>
                <span className="text-[8px] font-bold text-amber-300 bg-black/20 px-1.5 py-0.5 rounded">
                  Fee Mandiri -10%
                </span>
              </button>

              {/* 4. Semi Private */}
              {canAccessSemiPrivate ? (
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, mode: 'Semi Private'})}
                  className={cn(
                    "p-3 rounded-2xl border-2 font-black text-[11px] uppercase transition flex flex-col items-center justify-center gap-1 relative",
                    formData.mode === 'Semi Private' 
                      ? "bg-blue-900 text-white border-blue-950 shadow-md ring-2 ring-gold-400" 
                      : "bg-white text-blue-900 border-slate-200 hover:border-blue-300"
                  )}
                >
                  <span className="flex items-center gap-1">
                    SEMI PRIVATE <Award size={12} className="text-gold-400" />
                  </span>
                  <span className="text-[8px] font-bold text-emerald-300 bg-black/20 px-1.5 py-0.5 rounded">
                    + Modul Materi
                  </span>
                </button>
              ) : (
                <div 
                  className="p-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-400 flex flex-col items-center justify-center text-center gap-1 cursor-not-allowed opacity-75"
                  title={!isSemiPrivateEnabled 
                    ? "Program Semi Private saat ini ditutup sementara oleh Master Admin." 
                    : "Program Semi Private dibatasi khusus untuk Tutor Berijazah Tersertifikasi."}
                >
                  <span className="text-[10px] font-black uppercase flex items-center gap-1 text-slate-400">
                    <Lock size={12} /> SEMI PRIVATE
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 leading-tight">
                    {!isSemiPrivateEnabled ? 'Ditutup Temporal' : 'Khusus Tersertifikasi'}
                  </span>
                </div>
              )}
           </div>

           {/* Special card when Semi Private is selected */}
           {formData.mode === 'Semi Private' && (
             <div className="mt-4 p-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 rounded-2xl border border-blue-200 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Award className="text-gold-600" size={18} />
                  <h4 className="text-xs font-black uppercase text-blue-950">
                    Program Khusus Semi Private (Tutor Tersertifikasi)
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Program ini ditujukan bagi pengajar tersertifikasi dengan fasilitas penyusunan modul materi kustom.
                </p>

                <div className="bg-white p-4 rounded-xl border border-blue-100 space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.module_created}
                      onChange={e => setFormData({...formData, module_created: e.target.checked})}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mt-0.5"
                    />
                    <div>
                      <span className="text-[11px] font-black uppercase text-slate-800 block">
                        Sekalian Membuatkan Modul Materi Ajar Baru
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                        ✨ Bonus honor tambahan: +{formatCurrency(moduleBonusAmount)} otomatis masuk ke slip gaji periode ini!
                      </span>
                    </div>
                  </label>

                  {formData.module_created && (
                    <div className="pt-2 animate-in fade-in">
                      <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500">
                        Judul / Topik Modul Materi yang Dibuat *
                      </label>
                      <input 
                        type="text" 
                        required={formData.module_created}
                        value={formData.module_title}
                        onChange={e => setFormData({...formData, module_title: e.target.value})}
                        placeholder="Contoh: Modul Grammar & Daily Conversation Level Intermediate"
                        className="input-premium text-xs font-bold"
                      />
                    </div>
                  )}
                </div>
             </div>
           )}
        </div>

        {/* Absensi Siswa Berbasis Nama Panggilan - Hanya Menampilkan Shift & Level Terpilih */}
        <div className="space-y-3">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
             <div>
               <label className="block text-[10px] font-bold uppercase text-slate-500">
                 Absensi Siswa ({displayedStudents.length} siswa) • {formData.level ? `Level ${formData.level}` : '-'} • {effectiveDay}, Shift {formData.shift || '-'}
               </label>
               <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {shiftStudents.length > 0 ? (
                    <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      {shiftStudents.length} Siswa Terjadwal ({effectiveDay}, {formData.shift})
                    </span>
                  ) : (formData.level && formData.shift) ? (
                    <span className="text-[9px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                      0 Siswa Terjadwal pada Shift Ini ({effectiveDay}, {formData.shift})
                    </span>
                  ) : null}
                </div>
             </div>

             <div className="flex items-center gap-2 flex-wrap">
               {displayedStudents.length > 0 && (
                 <button
                   type="button"
                   onClick={() => {
                     const allNames = displayedStudents.map(s => s.name);
                     const isAllSelected = allNames.every(n => formData.selectedStudents.includes(n));
                     setFormData(prev => ({
                       ...prev,
                       selectedStudents: isAllSelected ? [] : allNames
                     }));
                   }}
                   className="text-[9px] font-black uppercase text-emerald-700 hover:underline px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-200 cursor-pointer"
                 >
                   {displayedStudents.every(s => formData.selectedStudents.includes(s.name)) ? 'Batal Semua' : 'Pilih Semua Hadir'}
                 </button>
               )}
             </div>
           </div>

           {/* Quick Search Student by Nickname or Full Name */}
           {formData.level && displayedStudents.length > 4 && (
             <div className="relative">
               <input
                 type="text"
                 value={studentSearchTerm}
                 onChange={e => setStudentSearchTerm(e.target.value)}
                 placeholder="Cari nama panggilan siswa di shift ini (cth: Atar, Alfatih, Uwais, dsb.)..."
                 className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500"
               />
               {studentSearchTerm && (
                 <button
                   type="button"
                   onClick={() => setStudentSearchTerm('')}
                   className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                 >
                   ✕
                 </button>
               )}
             </div>
           )}

           {/* Banner Informasi Siswa Sedang Cuti Resmi */}
           {Boolean(formData.level && onLeaveStudents.length > 0) && (
             <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3 text-xs text-amber-950 flex items-start gap-2.5">
               <CalendarOff size={16} className="text-amber-700 shrink-0 mt-0.5" />
               <div className="flex-1">
                 <div className="flex items-center gap-2 flex-wrap">
                   <span className="font-bold text-amber-900">
                     {onLeaveStudents.length} Siswa Sedang Cuti Belajar Resmi:
                   </span>
                   <div className="flex flex-wrap gap-1.5">
                     {onLeaveStudents.map(ls => (
                       <span 
                         key={ls.id} 
                         className="bg-white border border-amber-300 px-2 py-0.5 rounded-lg text-[10px] font-bold text-amber-950 flex items-center gap-1 shadow-2xs" 
                         title={`${ls.name} - Alasan: ${ls.leave_reason || 'Cuti'} ${ls.leave_note ? `(${ls.leave_note})` : ''}`}
                       >
                         <span>{ls.nickname || ls.name}</span>
                         {ls.leave_end_date && <span className="text-[9px] text-amber-700">(s.d {ls.leave_end_date})</span>}
                         {ls.leave_reason && <span className="text-[9px] text-slate-500">· {ls.leave_reason}</span>}
                       </span>
                     ))}
                   </div>
                 </div>
                 <p className="text-[10px] text-amber-700 mt-1">
                   Siswa di atas terdaftar izin cuti resmi di sistem, sehingga otomatis tidak dihitung sebagai absen alpha.
                 </p>
               </div>
             </div>
           )}

           <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 min-h-[90px]">
              {formData.shift && formData.level ? (
                displayedStudents.length > 0 ? (
                  displayedStudents.map(s => {
                    const isDual = Boolean(s.is_dual_program || s.level2);
                    const isPresent = formData.selectedStudents.includes(s.name);
                    const isMakeup = formData.makeup_students.includes(s.name);
                    const isShiftMatch = shiftStudents.some(sm => sm.id === s.id);
                    const nick = s.nickname ? s.nickname : s.name.split(' ')[0];

                    return (
                      <div
                        key={s.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 border rounded-xl transition text-left shadow-xs",
                          isPresent 
                            ? isMakeup 
                              ? "bg-amber-50/90 border-amber-500 text-amber-950 ring-1 ring-amber-500/30" 
                              : "bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500/30 shadow-sm" 
                            : "bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-slate-50"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleStudent(s.name)}
                          className="flex items-center gap-2.5 cursor-pointer flex-1"
                        >
                          <div className={cn(
                            "w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition",
                            isPresent 
                              ? (isMakeup ? "bg-amber-600 text-white" : "bg-emerald-600 text-white") 
                              : "bg-slate-100 text-slate-400 border border-slate-200"
                          )}>
                            {isPresent && <Check size={11} strokeWidth={3} />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black uppercase text-slate-900 tracking-tight">
                                {nick}
                              </span>
                              {isShiftMatch && (
                                <span className="text-[8px] bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded font-black border border-emerald-200">
                                  Shift Sesuai
                                </span>
                              )}
                              {isMakeup && (
                                <span className="text-[8px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-black shadow-2xs">
                                  Make-Up
                                </span>
                              )}
                              {isDual && (
                                <span className="text-[8px] bg-purple-100 text-purple-800 px-1 py-0.2 rounded font-black border border-purple-200">
                                  Dual
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400 font-medium truncate max-w-[140px]" title={s.name}>
                              {s.name}
                            </span>
                          </div>
                        </button>

                        {isMakeup && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Remove from makeup and attendance
                              setFormData(prev => ({
                                ...prev,
                                makeup_students: prev.makeup_students.filter(n => n !== s.name),
                                selectedStudents: prev.selectedStudents.filter(n => n !== s.name),
                                is_makeup_session: prev.makeup_students.filter(n => n !== s.name).length > 0
                              }));
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                            title="Lepas siswa dari sesi Make-Up ini"
                          >
                            <AlertCircle size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center w-full py-8 px-4 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto shadow-2xs">
                      <UserCheck size={22} />
                    </div>
                    <p className="text-xs font-black uppercase text-amber-950">
                      Tidak Ada Siswa Terjadwal di Shift Ini
                    </p>
                    <p className="text-[11px] text-slate-600 max-w-md mx-auto leading-relaxed">
                      Belum ada siswa Program <strong>{formData.level}</strong> yang dijadwalkan pada hari <strong className="text-emerald-900">{effectiveDay}</strong>, shift <strong className="text-emerald-900">{formData.shift}</strong>.
                    </p>
                    <p className="text-[10px] text-slate-400 max-w-md mx-auto">
                      Daftar hadir jurnal otomatis memfilter hanya siswa yang sesuai jadwal shift. Jika ada siswa pengganti dari jadwal lain yang hadir mengganti kelas hari ini, silakan klik tombol di bawah untuk melampirkan siswa.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowMakeupSelector(true)}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase shadow-xs transition cursor-pointer"
                    >
                      <UserCheck size={13} /> + Cari & Lampirkan Siswa Make Up (Pengganti)
                    </button>
                  </div>
                )
              ) : (
                <div className="text-center w-full py-6 px-4 space-y-1">
                  <p className="text-xs font-bold text-slate-600">
                    Pilih Program / Level Kelas dan Shift di atas untuk memuat daftar absensi siswa.
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Daftar hadir otomatis disaring sesuai shift yang telah disetting admin, dengan tampilan nama panggilan.
                  </p>
                </div>
              )}
           </div>
        </div>

        {/* FITUR 1: SISTEM SESI PENGGANTI (MAKE UP CLASS) - PENCARIAN & SCROLLING */}
        <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 p-4 rounded-2xl border border-amber-200/90 space-y-3">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
             <div className="flex items-center gap-2.5">
               <span className="p-2 bg-amber-500 text-white rounded-xl shadow-2xs">
                 <Repeat size={16} />
               </span>
               <div>
                 <h4 className="text-xs font-black uppercase tracking-tight text-amber-950 flex items-center gap-2">
                   <span>Sistem Sesi Pengganti (Make Up Class)</span>
                   {formData.makeup_students.length > 0 && (
                     <span className="bg-amber-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                       {formData.makeup_students.length} Siswa Terlampir
                     </span>
                   )}
                 </h4>
                 <p className="text-[10px] text-amber-800">
                   Gunakan fitur ini untuk mencari dan melampirkan siswa dari jadwal lain yang hadir mengganti sesi.
                 </p>
               </div>
             </div>

             <button
               type="button"
               onClick={() => setShowMakeupSelector(!showMakeupSelector)}
               className="text-[10px] font-black uppercase text-amber-950 bg-amber-200 hover:bg-amber-300 px-3.5 py-2 rounded-xl border border-amber-300/80 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs"
             >
               <UserCheck size={13} />
               {showMakeupSelector ? 'Tutup Pencarian Siswa' : '+ Cari & Tambah Siswa Make Up'}
             </button>
           </div>

           {/* Pilihan Siswa Make Up dengan Search & Scrolling */}
           {showMakeupSelector && (
             <div className="bg-white p-4 rounded-2xl border border-amber-200 space-y-3 shadow-sm animate-in fade-in">
               <div className="flex items-center justify-between gap-2">
                 <p className="text-[10px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                   <Search size={12} className="text-amber-600" /> Cari & Lampirkan Siswa Pengganti ({allMakeupCandidates.length} siswa tersedia):
                 </p>
                 <span className="text-[9px] text-slate-400">Ketik nama/panggilan dan klik untuk melampirkan</span>
               </div>

               {/* Input Pencarian Siswa Make Up */}
               <div className="relative">
                 <input
                   type="text"
                   value={makeupSearchTerm}
                   onChange={e => setMakeupSearchTerm(e.target.value)}
                   placeholder="Ketik nama lengkap, nama panggilan, ID, atau program siswa..."
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-amber-500 focus:bg-white"
                 />
                 {makeupSearchTerm && (
                   <button
                     type="button"
                     onClick={() => setMakeupSearchTerm('')}
                     className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                   >
                     ✕
                   </button>
                 )}
               </div>

               {/* Daftar Siswa dengan Scrolling Halus */}
               {allMakeupCandidates.length > 0 ? (
                 <div className="max-h-72 overflow-y-auto custom-scroll p-1 space-y-1.5 border border-slate-100 rounded-xl bg-slate-50/50">
                   {allMakeupCandidates.map(ms => {
                     const isChosen = formData.makeup_students.includes(ms.name);
                     const isSameLevel = (ms.level === formData.level || ms.level2 === formData.level);
                     const nick = ms.nickname || ms.name.split(' ')[0];

                     return (
                       <div
                         key={ms.id}
                         className={cn(
                           "flex items-center justify-between gap-2 p-2.5 rounded-xl border transition",
                           isChosen
                             ? "bg-amber-50 border-amber-400 shadow-2xs"
                             : "bg-white border-slate-200 hover:border-amber-200"
                         )}
                       >
                         <div className="flex items-center gap-2.5 min-w-0">
                           <div className={cn(
                             "w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] shrink-0",
                             isChosen ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
                           )}>
                             {nick.charAt(0).toUpperCase()}
                           </div>
                           <div className="flex flex-col min-w-0">
                             <div className="flex items-center gap-1.5 flex-wrap">
                               <span className="text-xs font-black uppercase text-slate-900">
                                 {nick}
                               </span>
                               {isSameLevel && (
                                 <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                   Level Sama
                                 </span>
                               )}
                             </div>
                             <span className="text-[9px] text-slate-500 truncate max-w-[200px]" title={ms.name}>
                               {ms.name} • {ms.level}
                             </span>
                           </div>
                         </div>

                         <button
                           type="button"
                           onClick={() => {
                             const isAlready = formData.makeup_students.includes(ms.name);
                             if (isAlready) {
                               setFormData(prev => ({
                                 ...prev,
                                 makeup_students: prev.makeup_students.filter(n => n !== ms.name),
                                 selectedStudents: prev.selectedStudents.filter(n => n !== ms.name),
                                 is_makeup_session: prev.makeup_students.filter(n => n !== ms.name).length > 0
                               }));
                             } else {
                               setFormData(prev => ({
                                 ...prev,
                                 makeup_students: [...prev.makeup_students, ms.name],
                                 selectedStudents: prev.selectedStudents.includes(ms.name)
                                   ? prev.selectedStudents
                                   : [...prev.selectedStudents, ms.name],
                                 is_makeup_session: true
                               }));
                             }
                           }}
                           className={cn(
                             "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition cursor-pointer shrink-0",
                             isChosen 
                               ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" 
                               : "bg-amber-500 hover:bg-amber-600 text-white shadow-2xs"
                           )}
                         >
                           {isChosen ? 'Lepas' : '+ Lampirkan'}
                         </button>
                       </div>
                     );
                   })}
                 </div>
               ) : (
                 <p className="text-[10px] text-slate-400 italic text-center py-4">
                   Tidak ada siswa ditemukan untuk pencarian "{makeupSearchTerm}".
                 </p>
               )}

                {/* Make up notes */}
                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">
                    Keterangan Tanggal / Shift Pengganti:
                  </label>
                  <input
                    type="text"
                    value={formData.makeup_notes}
                    onChange={e => setFormData({ ...formData, makeup_notes: e.target.value })}
                    placeholder="Contoh: Mengganti sesi Kamis shift 14.30 yang berhalangan sakit"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>
            )}

            {/* List Siswa Make Up Aktif */}
            {formData.makeup_students.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1 bg-white/60 p-2.5 rounded-xl border border-amber-200">
                <span className="text-[9px] font-black uppercase text-amber-900">Siswa Terlampir di Sesi Make-Up:</span>
                {formData.makeup_students.map(name => (
                  <span key={name} className="bg-amber-200 text-amber-950 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border border-amber-300 flex items-center gap-1 shadow-2xs">
                    ★ {name}
                  </span>
                ))}
              </div>
            )}
         </div>

         {/* FITUR 2: RECALL & REVIEW MATERI SEBELUMNYA (CROSS-TUTOR MATERIAL HISTORY) */}
         <div className="bg-gradient-to-r from-purple-50/90 via-indigo-50/70 to-purple-50/90 p-4 rounded-2xl border border-purple-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-purple-600 text-white rounded-xl shadow-2xs">
                  <History size={16} />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-tight text-purple-950 flex items-center gap-2">
                    <span>Sistem Recall & Review Materi Terakhir</span>
                    <span className="bg-purple-200 text-purple-950 text-[9px] px-2 py-0.5 rounded-full font-bold">
                      Cross-Tutor Sync
                    </span>
                  </h4>
                  <p className="text-[10px] text-purple-700">
                    Klausul pedagogis WIC: Apersepsi awal 5-10 menit mereview materi lampau yang diajarkan oleh tutor sebelumnya.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {classAttendanceHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsClassHistoryModalOpen(true)}
                    className="text-[9px] font-black uppercase text-purple-900 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-xl border border-purple-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    <BookOpen size={11} /> Riwayat Lengkap Kelas Ini ({classAttendanceHistory.length})
                  </button>
                )}

                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-purple-200 shadow-xs">
                  <input
                    type="checkbox"
                    checked={formData.recall_reviewed}
                    onChange={e => setFormData({ ...formData, recall_reviewed: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                  />
                  <span className="text-[10px] font-black uppercase text-purple-950">
                    Telah Melakukan Recall
                  </span>
                </label>
              </div>
            </div>

            {/* Info Rujukan Materi Pertemuan Terakhir dari Pengajar Sebelumnya */}
            {lastClassSession ? (
              <div className="bg-white p-3.5 rounded-xl border border-purple-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-2">
                  <div className="text-[10px] text-slate-700">
                    <span className="font-black text-purple-900 uppercase block text-[11px]">
                      📖 Arsip Materi Pertemuan Terakhir ({lastClassSession.date} • {lastClassSession.shift}):
                    </span>
                    <span className="text-[9px] text-purple-700 font-bold">
                      Diajarkan oleh: <strong className="text-slate-900">{lastSessionTutorName}</strong> • Mode: {lastClassSession.mode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        recall_notes: `Review materi sebelumnya (${lastClassSession.date}): ${lastClassSession.material}`
                      }));
                    }}
                    className="text-[9px] font-black uppercase text-purple-800 bg-purple-100 hover:bg-purple-200 px-2.5 py-1 rounded-lg transition shrink-0 self-start sm:self-auto cursor-pointer"
                  >
                    📋 Salin ke Poin Recall
                  </button>
                </div>

                <div className="text-xs text-slate-800">
                  <p className="font-bold text-slate-900 line-clamp-2">
                    "{lastClassSession.material}"
                  </p>
                  {lastClassSession.notes && (
                    <p className="text-[10px] text-slate-500 italic mt-0.5">
                      📝 Catatan Evaluasi Siswa: "{lastClassSession.notes}"
                    </p>
                  )}
                </div>
              </div>
            ) : (
              formData.level && (
                <div className="p-3 bg-white/70 rounded-xl border border-purple-100 text-[10px] text-slate-500 italic">
                  Belum ada catatan riwayat materi sebelumnya untuk kelas {formData.level}. Sesi ini akan menjadi catatan awal kurikulum kelas ini.
                </div>
              )
            )}

            {/* Catatan Khusus Recall Review */}
            {formData.recall_reviewed && (
              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">
                  Catatan Poin Recall & Review Siswa:
                </label>
                <input
                  type="text"
                  value={formData.recall_notes}
                  onChange={e => setFormData({ ...formData, recall_notes: e.target.value })}
                  placeholder="Contoh: Drill kosa kata chapter 3 dan evaluasi tajwid mad thabi'i..."
                  className="w-full bg-white border border-purple-200 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-800 outline-none"
                />
              </div>
            )}
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
               <div className="flex items-center justify-between mb-1">
                 <label className="block text-[10px] font-bold uppercase text-slate-500">
                   Deskripsi Ringkas Materi {isTahsinSession ? '(Atau Otomatis dari Surat & Ayat)' : '*'}
                 </label>
                 {activeMatchedModule?.chapters && activeMatchedModule.chapters.length > 0 && (
                   <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                     Pilih Bab Modul di Bawah
                   </span>
                 )}
               </div>

               {/* Quick Chapter Selector from Connected Module */}
               {activeMatchedModule?.chapters && activeMatchedModule.chapters.length > 0 && !isTahsinSession && (
                 <div className="mb-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                   <div className="flex items-center justify-between text-[8px] font-bold text-slate-500 uppercase mb-1">
                     <span>Bab Silabus ({activeMatchedModule.title}):</span>
                     <span className="text-emerald-700">Klik bab untuk mengisi materi</span>
                   </div>
                   <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scroll pr-1">
                     {activeMatchedModule.chapters.map((ch, idx) => (
                       <button
                         key={idx}
                         type="button"
                         onClick={() => {
                           const current = formData.material.trim();
                           if (!current) {
                             setFormData({ ...formData, material: ch });
                           } else if (!current.includes(ch)) {
                             setFormData({ ...formData, material: `${current}; ${ch}` });
                           }
                         }}
                         className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-800 text-[9px] font-semibold transition text-left"
                       >
                         {ch}
                       </button>
                     ))}
                   </div>
                 </div>
               )}

               <textarea 
                 value={formData.material} 
                 onChange={e => setFormData({...formData, material: e.target.value})} 
                 className="input-premium h-24" 
                 placeholder={isTahsinSession ? `Contoh: Setoran Surat ${formData.surah_name || 'An-Naba'} (${formData.ayat_range || 'Ayat 1-15'}) - Status: ${formData.tahsin_status}` : "Apa pokok bahasan yang dipelajari siswa hari ini? (Bisa klik bab di atas)"} 
                 required={!isTahsinSession}
               />
            </div>
            <div>
               <label className="block text-[10px] font-bold uppercase mb-1 text-slate-500">Catatan / Kendala Siswa</label>
               <textarea 
                 value={formData.notes} 
                 onChange={e => setFormData({...formData, notes: e.target.value})} 
                 className="input-premium h-24" 
                 placeholder={isTahsinSession ? "Misal: Perlu pemantapan mad thabi'i dan makhraj huruf 'Ain..." : "Misal: Siswa A sudah lancar speaking, siswa B butuh pengulangan vocabulary..."} 
               />
            </div>
         </div>

        {submitError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-red-800">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <button type="submit" className="w-full bg-emerald-950 text-gold-400 font-black py-4 rounded-2xl uppercase text-xs tracking-wider shadow-xl hover:bg-emerald-900 transition flex items-center justify-center gap-2 cursor-pointer">
           <Send size={16} /> Kirim Jurnal Pembelajaran
        </button>
      </form>

      {/* Riwayat Mengajar Sidebar */}
      <div className="w-full lg:w-80 shrink-0 space-y-4">
         <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="font-black text-slate-800 uppercase text-xs mb-4">Riwayat Jurnal Sesi Anda</h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scroll pr-1">
               {history.slice().reverse().map(h => {
                 let borderClass = "border-l-emerald-500";
                 let badgeBg = "bg-emerald-50 text-emerald-800";
                 if (h.mode === 'Team') {
                   borderClass = "border-l-gold-500";
                   badgeBg = "bg-amber-50 text-amber-800";
                 } else if (h.mode === 'Private') {
                   borderClass = "border-l-purple-500";
                   badgeBg = "bg-purple-50 text-purple-800";
                 } else if (h.mode === 'Semi Private') {
                   borderClass = "border-l-blue-500";
                   badgeBg = "bg-blue-50 text-blue-800";
                 }

                 const isTahsin = Boolean(h.surah_name || h.level?.toLowerCase().includes('tahsin') || h.level?.toLowerCase().includes('tahfidz'));

                 return (
                   <button 
                    key={h.id} 
                    onClick={() => setReviewingSession(h)}
                    className={cn(
                     "w-full text-left p-3.5 rounded-2xl border-l-4 bg-slate-50 border border-slate-100 hover:bg-slate-100 transition",
                     borderClass
                   )}>
                     <div className="flex justify-between items-center mb-1">
                       <p className="font-black text-[10px] text-slate-800 uppercase">{h.date} | {h.shift}</p>
                       <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full", badgeBg)}>
                         {h.mode}
                       </span>
                     </div>
                     <p className="text-[9px] text-slate-500 font-bold uppercase">{h.level} • {h.material_origin}</p>
                     
                     {/* Preview Tahsin Surat & Status */}
                     {isTahsin && (h.surah_name || h.tahsin_status) && (
                       <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                         <span className="text-[8px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                           📖 {h.surah_name} {h.ayat_range && `(${h.ayat_range})`}
                         </span>
                         <span className={cn(
                           "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                           h.tahsin_status === 'Ulang' ? "bg-amber-100 text-amber-800" : "bg-emerald-600 text-white"
                         )}>
                           {h.tahsin_status || 'Lancar'}
                         </span>
                       </div>
                     )}

                     {h.module_created && (
                       <p className="text-[8px] text-emerald-700 font-black uppercase mt-1 flex items-center gap-1">
                         <BookOpen size={10} /> Modul: {h.module_title || 'Tersusun'}
                       </p>
                     )}
                   </button>
                 );
               })}
               {history.length === 0 && <p className="text-[10px] text-slate-400 italic text-center py-6">Belum ada riwayat jurnal yang dikirim.</p>}
            </div>
         </div>

         {reviewingSession && (
           <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-start mb-3">
                 <h4 className="font-black text-emerald-950 uppercase text-xs">Detil Sesi Pengajaran</h4>
                 <button onClick={() => setReviewingSession(null)} className="text-emerald-500 hover:text-emerald-700 font-bold text-[10px] uppercase">Tutup</button>
              </div>
              <div className="space-y-2 text-xs">
                 <p className="text-slate-700 font-bold"><span className="text-emerald-700 uppercase text-[9px] block">Program & Sesi:</span> {reviewingSession.level} ({reviewingSession.date} - {reviewingSession.shift})</p>
                 <p className="text-slate-700 font-bold"><span className="text-emerald-700 uppercase text-[9px] block">Mode Mengajar:</span> {reviewingSession.mode}</p>
                 
                 {/* Detail Tahsin jika ada */}
                 {(reviewingSession.surah_name || reviewingSession.tahsin_status) && (
                   <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1">
                     <span className="text-[9px] font-black uppercase text-emerald-800 block">Setoran Tahsin & Tahfidz:</span>
                     <p className="text-[11px] font-black text-slate-900">
                       Surat {reviewingSession.surah_name || '-'} ({reviewingSession.ayat_range || '-'})
                     </p>
                     <div className="flex items-center gap-2 pt-0.5">
                       <span className="text-[9px] font-bold text-slate-500 uppercase">Keterangan:</span>
                       <span className={cn(
                         "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                         reviewingSession.tahsin_status === 'Ulang' ? "bg-amber-100 text-amber-800" : "bg-emerald-600 text-white"
                       )}>
                         {reviewingSession.tahsin_status || 'Lancar'}
                       </span>
                     </div>
                   </div>
                 )}

                 <p className="text-slate-700 font-bold leading-snug"><span className="text-emerald-700 uppercase text-[9px] block">Materi Pokok:</span> {reviewingSession.material}</p>
                 {reviewingSession.module_created && (
                   <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
                     <span className="text-[9px] font-black uppercase text-emerald-800 block">Modul Materi Dibuat:</span>
                     <p className="text-[11px] font-bold text-slate-800">{reviewingSession.module_title || '-'}</p>
                   </div>
                 )}
                 <p className="italic text-slate-500"><span className="text-emerald-700 uppercase text-[9px] block">Catatan:</span> {reviewingSession.notes || '-'}</p>
                 <div className="pt-2">
                    <span className="text-emerald-700 uppercase text-[9px] block mb-1">Siswa Hadir ({reviewingSession.students.length}):</span>
                    <div className="flex flex-wrap gap-1">
                       {reviewingSession.students.map(s => (
                         <span key={s} className="bg-white border border-emerald-200 text-[8px] font-bold px-2 py-0.5 rounded-lg uppercase">{s}</span>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
         )}
      </div>

      {/* Modal Riwayat Lengkap Pembelajaran Kelas Ini (Antar-Tutor) */}
      {isClassHistoryModalOpen && formData.level && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-400/30">
                  <BookOpen size={18} />
                </span>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                    <span>Riwayat Materi Terakhir • Kelas {formData.level}</span>
                    <span className="bg-purple-500/30 text-purple-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {classAttendanceHistory.length} Sesi Terdata
                    </span>
                  </h3>
                  <p className="text-[10px] text-purple-200">
                    Arsip pembelajaran lintas tutor yang pernah mengajar di kelas ini.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClassHistoryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto custom-scroll space-y-3">
              {classAttendanceHistory.length > 0 ? (
                classAttendanceHistory.map((sess, idx) => {
                  const tUser = tutors.find(t => 
                    (t.wa && t.wa === sess.tutor_wa) || 
                    (t.username && t.username.toLowerCase() === (sess.tutor_wa || '').toLowerCase())
                  );
                  const isF = tUser?.gender === 'P' || tUser?.gender === 'Perempuan' || tUser?.title === 'Miss';
                  const tName = tUser ? `${isF ? 'Miss' : 'Mr.'} ${tUser.name}` : (sess.tutor_wa || 'Tutor WIC');

                  return (
                    <div 
                      key={sess.id || idx} 
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-purple-50/40 transition space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-purple-900 text-white text-[10px] font-black px-2.5 py-0.5 rounded-lg">
                            {sess.date}
                          </span>
                          <span className="text-[10px] font-bold text-slate-700">
                            Shift: {sess.shift}
                          </span>
                          <span className="bg-white border border-slate-200 text-slate-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                            {sess.mode}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded-lg">
                          👤 Pengajar: {tName}
                        </span>
                      </div>

                      <div className="text-xs text-slate-800 space-y-1">
                        <p className="font-black text-slate-900 leading-snug">
                          "{sess.material}"
                        </p>
                        {(sess.surah_name || sess.tahsin_status) && (
                          <p className="text-[10px] text-emerald-900 font-bold">
                            🕌 Setoran Al-Quran: Surat {sess.surah_name} ({sess.ayat_range || '-'}) • Status: {sess.tahsin_status || 'Lancar'}
                          </p>
                        )}
                        {sess.notes && (
                          <p className="text-[10px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-200">
                            📝 Catatan / PR: "{sess.notes}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="text-[9px] text-slate-400">
                          {sess.students ? `${sess.students.length} siswa hadir` : ''}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              recall_notes: `Review materi sesi sebelumnya (${sess.date} oleh ${tName}): ${sess.material}`,
                              book_source: sess.book_source || prev.book_source
                            }));
                            setIsClassHistoryModalOpen(false);
                          }}
                          className="text-[9px] font-black uppercase text-purple-800 hover:text-purple-950 bg-white hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                        >
                          📋 Gunakan Sebagai Referensi Sesi Ini
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-8">
                  Belum ada catatan riwayat sesi pembelajaran untuk kelas {formData.level}.
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsClassHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black uppercase hover:bg-slate-900 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal In-App Module Reader Modal */}
      <ModuleViewerModal
        module={viewerModule}
        isOpen={!!viewerModule}
        onClose={() => setViewerModule(null)}
      />
    </div>
  );
}
