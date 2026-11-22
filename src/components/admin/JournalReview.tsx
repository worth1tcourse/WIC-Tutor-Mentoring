import React, { useMemo, useState } from 'react';
import { AppData, Attendance, TahsinStudentSetoran, TeachingMode } from '../../types';
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
  Repeat,
  History,
  Plus,
  RotateCcw,
  Layers,
  Users,
  CheckSquare
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { isRecordForTutor } from '../../lib/payroll';
import { WIC_LEVELS, WIC_SHIFTS, ALL_QURAN_SURAHS } from '../../constants';

interface JournalReviewProps {
  appData: AppData;
  onUpdate: (data: Partial<AppData>) => void;
}

const ALL_WEEK_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const;
const INDONESIAN_DAY_MAP = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;

function getIndonesianDayName(dateStr?: string): string {
  if (!dateStr) return '';
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const localDate = new Date(year, month - 1, day);
    if (!Number.isNaN(localDate.getTime())) {
      return INDONESIAN_DAY_MAP[localDate.getDay()] || '';
    }
  }
  const fallback = new Date(dateStr);
  if (!Number.isNaN(fallback.getTime())) {
    return INDONESIAN_DAY_MAP[fallback.getDay()] || '';
  }
  return '';
}

function formatLocalDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function JournalReview({ appData, onUpdate }: JournalReviewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJournal, setSelectedJournal] = useState<Attendance | null>(null);
  const [modeFilter, setModeFilter] = useState<'ALL' | TeachingMode>('ALL');

  // Filter Kalender / Waktu, Hari, Shift (Sebagian / Keseluruhan), dan Tutor
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('ALL');
  const [selectedDays, setSelectedDays] = useState<string[]>([]); // kosong = Semua Hari
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]); // kosong = Keseluruhan Shift
  const [tutorFilter, setTutorFilter] = useState<string>('ALL');

  // Modals & Editor Auxiliary Inputs
  const [editingJournal, setEditingJournal] = useState<Attendance | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [newMakeupStudentName, setNewMakeupStudentName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedJournalIds, setSelectedJournalIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Daftar seluruh shift yang tersedia (Standar WIC + shift unik yang ada di database jurnal)
  const allAvailableShifts = useMemo(() => {
    const shiftSet = new Set<string>(WIC_SHIFTS);
    appData.attendance.forEach(a => {
      if (a.shift && a.shift.trim()) {
        shiftSet.add(a.shift.trim());
      }
    });
    return Array.from(shiftSet);
  }, [appData.attendance]);

  const tutorList = useMemo(() => {
    return appData.users
      .filter(u => u.role === 'TUTOR' || u.role === 'ADMIN')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [appData.users]);

  const applyDatePreset = (preset: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'ALL') {
      setDateFrom('');
      setDateTo('');
      return;
    }
    const todayStr = formatLocalDateISO(now);
    if (preset === 'TODAY') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
      return;
    }
    if (preset === 'WEEK') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      setDateFrom(formatLocalDateISO(start));
      setDateTo(todayStr);
      return;
    }
    if (preset === 'MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(formatLocalDateISO(start));
      setDateTo(todayStr);
    }
  };

  const toggleDayFilter = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleShiftFilter = (shift: string) => {
    setSelectedShifts(prev =>
      prev.includes(shift) ? prev.filter(s => s !== shift) : [...prev, shift]
    );
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    modeFilter !== 'ALL' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    selectedDays.length > 0 ||
    selectedShifts.length > 0 ||
    tutorFilter !== 'ALL';

  const resetAllFilters = () => {
    setSearchTerm('');
    setModeFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setDatePreset('ALL');
    setSelectedDays([]);
    setSelectedShifts([]);
    setTutorFilter('ALL');
  };

  const openEditModal = (journal: Attendance) => {
    setEditingJournal({
      ...journal,
      students: [...(journal.students || [])],
      makeup_students: [...(journal.makeup_students || [])],
      tahsin_records: (journal.tahsin_records || []).map(r => ({ ...r }))
    });
    setNewStudentName('');
    setNewMakeupStudentName('');
  };

  const filteredJournals = useMemo(() => {
    return appData.attendance
      .filter(a => {
        const tutor = appData.users.find(u => isRecordForTutor(a.tutor_wa, u, a.tutor_id));
        const tutorName = (tutor?.name || a.tutor_name || '').toLowerCase();
        const material = (a.material || '').toLowerCase();
        const search = searchTerm.trim().toLowerCase();
        const surah = (a.surah_name || '').toLowerCase();
        const studentsText = (a.students || []).join(' ').toLowerCase();
        const notesText = (a.notes || '').toLowerCase();
        const shiftText = (a.shift || '').toLowerCase();

        const matchesSearch =
          !search ||
          tutorName.includes(search) ||
          material.includes(search) ||
          (a.level || '').toLowerCase().includes(search) ||
          surah.includes(search) ||
          studentsText.includes(search) ||
          notesText.includes(search) ||
          shiftText.includes(search);

        const matchesMode = modeFilter === 'ALL' || a.mode === modeFilter;

        // Filter Kalender / Rentang Tanggal
        const recordDate = (a.date || '').slice(0, 10);
        const matchesDateFrom = !dateFrom || (recordDate !== '' && recordDate >= dateFrom);
        const matchesDateTo = !dateTo || (recordDate !== '' && recordDate <= dateTo);

        // Filter Hari (berdasarkan tanggal sesi)
        const dayName = getIndonesianDayName(a.date);
        const matchesDay = selectedDays.length === 0 || (dayName !== '' && selectedDays.includes(dayName));

        // Filter Shift (keseluruhan atau sebagian)
        const matchesShift =
          selectedShifts.length === 0 || selectedShifts.includes((a.shift || '').trim());

        // Filter Tutor
        let matchesTutor = true;
        if (tutorFilter !== 'ALL') {
          const targetTutor = appData.users.find(u => u.id === tutorFilter);
          if (targetTutor) {
            matchesTutor = isRecordForTutor(a.tutor_wa, targetTutor, a.tutor_id);
          } else {
            matchesTutor = a.tutor_wa === tutorFilter || a.tutor_id === tutorFilter;
          }
        }

        return (
          matchesSearch &&
          matchesMode &&
          matchesDateFrom &&
          matchesDateTo &&
          matchesDay &&
          matchesShift &&
          matchesTutor
        );
      })
      .sort((a, b) => {
        const dateCmp = (b.date || '').localeCompare(a.date || '');
        if (dateCmp !== 0) return dateCmp;
        return (b.shift || '').localeCompare(a.shift || '');
      });
  }, [
    appData.attendance,
    appData.users,
    searchTerm,
    modeFilter,
    dateFrom,
    dateTo,
    selectedDays,
    selectedShifts,
    tutorFilter
  ]);

  const totalFilteredStudents = useMemo(
    () => filteredJournals.reduce((sum, j) => sum + (j.students?.length || 0), 0),
    [filteredJournals]
  );

  const toggleSelectAll = () => {
    const visibleIds = filteredJournals.map(j => j.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedJournalIds.includes(id));
    if (allSelected) {
      setSelectedJournalIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedJournalIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent | React.ChangeEvent) => {
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
    setSelectedJournalIds(prev => prev.filter(id => id !== deletingId));
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

  const handleAddStudentToEdit = () => {
    if (!editingJournal) return;
    const trimmed = newStudentName.trim();
    if (!trimmed) return;
    if (!editingJournal.students.includes(trimmed)) {
      setEditingJournal({
        ...editingJournal,
        students: [...editingJournal.students, trimmed]
      });
    }
    setNewStudentName('');
  };

  const handleRemoveStudentFromEdit = (studentName: string) => {
    if (!editingJournal) return;
    setEditingJournal({
      ...editingJournal,
      students: editingJournal.students.filter(s => s !== studentName)
    });
  };

  const handleAddMakeupStudentToEdit = () => {
    if (!editingJournal) return;
    const trimmed = newMakeupStudentName.trim();
    if (!trimmed) return;
    const current = editingJournal.makeup_students || [];
    if (!current.includes(trimmed)) {
      setEditingJournal({
        ...editingJournal,
        is_makeup_session: true,
        makeup_students: [...current, trimmed]
      });
    }
    setNewMakeupStudentName('');
  };

  const handleRemoveMakeupStudentFromEdit = (studentName: string) => {
    if (!editingJournal) return;
    const nextMakeup = (editingJournal.makeup_students || []).filter(s => s !== studentName);
    setEditingJournal({
      ...editingJournal,
      makeup_students: nextMakeup
    });
  };

  const handleAddTahsinRecord = () => {
    if (!editingJournal) return;
    const nextRecords: TahsinStudentSetoran[] = [
      ...(editingJournal.tahsin_records || []),
      {
        student_name: editingJournal.students[0] || '',
        surah_name: editingJournal.surah_name || '',
        ayat_range: editingJournal.ayat_range || '',
        status: 'Lancar'
      }
    ];
    setEditingJournal({ ...editingJournal, tahsin_records: nextRecords });
  };

  const handleUpdateTahsinRecord = (
    idx: number,
    patch: Partial<TahsinStudentSetoran>
  ) => {
    if (!editingJournal) return;
    const nextRecords = (editingJournal.tahsin_records || []).map((rec, i) =>
      i === idx ? { ...rec, ...patch } : rec
    );
    setEditingJournal({ ...editingJournal, tahsin_records: nextRecords });
  };

  const handleRemoveTahsinRecord = (idx: number) => {
    if (!editingJournal) return;
    const nextRecords = (editingJournal.tahsin_records || []).filter((_, i) => i !== idx);
    setEditingJournal({ ...editingJournal, tahsin_records: nextRecords });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJournal) return;

    const cleanPeriod =
      editingJournal.period?.trim() ||
      (editingJournal.date ? editingJournal.date.slice(0, 7) : '');

    const cleanTahsinRecords = (editingJournal.tahsin_records || []).filter(
      r => r.student_name.trim() || r.surah_name.trim()
    );

    const updatedRecord: Attendance = {
      ...editingJournal,
      period: cleanPeriod,
      material: editingJournal.material.trim(),
      book_source: (editingJournal.book_source || '').trim(),
      notes: (editingJournal.notes || '').trim(),
      students: editingJournal.students.filter(s => s.trim() !== ''),
      makeup_students: (editingJournal.makeup_students || []).filter(s => s.trim() !== ''),
      makeup_notes: (editingJournal.makeup_notes || '').trim(),
      recall_notes: (editingJournal.recall_notes || '').trim(),
      module_title: (editingJournal.module_title || '').trim(),
      surah_name: (editingJournal.surah_name || '').trim(),
      ayat_range: (editingJournal.ayat_range || '').trim(),
      tahsin_records: cleanTahsinRecords
    };

    const next = appData.attendance.map(a =>
      a.id === updatedRecord.id ? updatedRecord : a
    );
    onUpdate({ attendance: next });
    setSelectedJournal(updatedRecord);
    setEditingJournal(null);
  };

  const selectedTutor = selectedJournal
    ? appData.users.find(u => isRecordForTutor(selectedJournal.tutor_wa, u, selectedJournal.tutor_id))
    : undefined;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start animate-in fade-in duration-300">
      <div className="flex-1 w-full bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
              Review Jurnal Pembelajaran
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Inspeksi & edit penuh Admin • Filter hari, kalender waktu & pilihan shift
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Cari Tutor, Siswa, Materi, Surat..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold focus:bg-white focus:border-emerald-500 transition-all outline-none"
            />
            <Search className="absolute left-4 top-3 text-slate-400" size={18} />
          </div>
        </div>

        {/* Panel Filter Lengkap: Kalender Waktu, Hari, Pilihan Shift (Sebagian/Keseluruhan), Tutor & Mode */}
        <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 md:p-5 mb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-emerald-700" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                Filter Pemilahan Jurnal
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {filteredJournals.length} / {appData.attendance.length} Jurnal • {totalFilteredStudents} Kehadiran
              </span>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw size={12} /> Reset Filter
              </button>
            )}
          </div>

          {/* Baris 1: Kalender Waktu & Filter Tutor */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-end">
            <div className="xl:col-span-5 space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                <Calendar size={12} className="text-emerald-600" /> Kalender & Rentang Waktu
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { key: 'ALL', label: 'Semua Waktu' },
                    { key: 'TODAY', label: 'Hari Ini' },
                    { key: 'WEEK', label: '7 Hari' },
                    { key: 'MONTH', label: 'Bulan Ini' }
                  ] as const
                ).map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyDatePreset(p.key)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition cursor-pointer',
                      datePreset === p.key
                        ? 'bg-emerald-950 text-gold-400 border-emerald-950 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="xl:col-span-4 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => {
                    setDateFrom(e.target.value);
                    setDatePreset(e.target.value || dateTo ? 'CUSTOM' : 'ALL');
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => {
                    setDateTo(e.target.value);
                    setDatePreset(dateFrom || e.target.value ? 'CUSTOM' : 'ALL');
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="xl:col-span-3">
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">
                Filter Tutor Pengajar
              </label>
              <select
                value={tutorFilter}
                onChange={e => setTutorFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">Semua Tutor ({tutorList.length})</option>
                {tutorList.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Baris 2: Filter Hari (Bisa Pilih Sebagian atau Semua Hari) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                <Calendar size={12} className="text-amber-600" /> Pilihan Hari
              </span>
              <span className="text-[9px] font-bold uppercase text-slate-400">
                {selectedDays.length === 0
                  ? 'Semua Hari (Keseluruhan)'
                  : `${selectedDays.length} Hari Dipilih`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedDays([])}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition cursor-pointer',
                  selectedDays.length === 0
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                )}
              >
                Semua Hari
              </button>
              {ALL_WEEK_DAYS.map(day => {
                const active = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDayFilter(day)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer',
                      active
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Baris 3: Filter Pilihan Shift (Sebagian atau Keseluruhan) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                <Clock size={12} className="text-indigo-600" /> Pilihan Shift (Sebagian / Keseluruhan)
              </span>
              <span
                className={cn(
                  'text-[9px] font-black uppercase px-2 py-0.5 rounded-full border',
                  selectedShifts.length === 0
                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                )}
              >
                {selectedShifts.length === 0
                  ? `Keseluruhan (${allAvailableShifts.length} Shift)`
                  : `Sebagian (${selectedShifts.length} Shift Dipilih)`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedShifts([])}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition cursor-pointer flex items-center gap-1',
                  selectedShifts.length === 0
                    ? 'bg-indigo-950 text-white border-indigo-950 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                )}
              >
                <CheckSquare size={11} /> Keseluruhan Shift
              </button>
              {allAvailableShifts.map(shift => {
                const active = selectedShifts.includes(shift);
                return (
                  <button
                    key={shift}
                    type="button"
                    onClick={() => toggleShiftFilter(shift)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wide border transition cursor-pointer flex items-center gap-1',
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/60'
                    )}
                  >
                    {active && <Check size={10} />}
                    {shift}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Baris 4: Filter Mode Mengajar */}
          <div className="flex items-center gap-2 overflow-x-auto pt-1 custom-scroll">
            <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1 shrink-0 mr-1">
              <Layers size={12} /> Mode:
            </span>
            {(['ALL', 'Mandiri', 'Team', 'Private', 'Semi Private'] as const).map(m => {
              const count =
                m === 'ALL'
                  ? appData.attendance.length
                  : appData.attendance.filter(a => a.mode === m).length;

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModeFilter(m)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition whitespace-nowrap border cursor-pointer',
                    modeFilter === m
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  {m === 'ALL' ? 'Semua Mode' : m} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Bulk Selection Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 mb-4">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={
                filteredJournals.length > 0 &&
                filteredJournals.every(j => selectedJournalIds.includes(j.id))
              }
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-[10px] font-black uppercase text-slate-700">
              {selectedJournalIds.length > 0
                ? `${selectedJournalIds.length} Jurnal Terpilih`
                : `Pilih Semua Jurnal Terfilter (${filteredJournals.length})`}
            </span>
          </div>

          {selectedJournalIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedJournalIds([])}
                className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
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

        {/* Daftar Jurnal */}
        <div className="space-y-4">
          {filteredJournals.map(a => {
            const tutor = appData.users.find(u => isRecordForTutor(a.tutor_wa, u, a.tutor_id));
            const dayLabel = getIndonesianDayName(a.date);

            let modeBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            if (a.mode === 'Team') modeBadge = 'bg-amber-50 text-amber-800 border-amber-200';
            if (a.mode === 'Private') modeBadge = 'bg-indigo-50 text-indigo-800 border-indigo-200';
            if (a.mode === 'Semi Private')
              modeBadge = 'bg-purple-50 text-purple-800 border-purple-200';

            const isTahsin =
              a.surah_name ||
              a.tahsin_status ||
              a.level?.toLowerCase().includes('tahsin') ||
              a.level?.toLowerCase().includes('tahfidz');
            const hasMakeup =
              a.is_makeup_session || (a.makeup_students && a.makeup_students.length > 0);
            const isSelected = selectedJournalIds.includes(a.id);

            return (
              <div
                key={a.id}
                onClick={() => setSelectedJournal(a)}
                className={cn(
                  'p-5 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md',
                  selectedJournal?.id === a.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-[1.01]'
                    : isSelected
                      ? 'bg-red-50/50 border-red-300'
                      : 'bg-slate-50/50 hover:bg-white border-slate-200/80'
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Checkbox Individual */}
                  <div onClick={e => e.stopPropagation()} className="shrink-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => toggleSelectOne(a.id, e)}
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
                      <h4 className="font-black text-sm uppercase leading-none">
                        {tutor?.name || a.tutor_name || 'Tutor'}
                      </h4>
                      <span
                        className={cn(
                          'text-[9px] font-black uppercase px-2 py-0.5 rounded-full border',
                          selectedJournal?.id === a.id
                            ? 'bg-white/10 text-white border-white/20'
                            : modeBadge
                        )}
                      >
                        {a.mode || 'Mandiri'}
                      </span>
                      {a.module_created && (
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                          + Modul Materi
                        </span>
                      )}
                      {hasMakeup && (
                        <span
                          className={cn(
                            'text-[8px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1',
                            selectedJournal?.id === a.id
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          )}
                        >
                          <Repeat size={9} /> Make Up ({a.makeup_students?.length || 1})
                        </span>
                      )}
                      {a.recall_reviewed && (
                        <span
                          className={cn(
                            'text-[8px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1',
                            selectedJournal?.id === a.id
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-purple-100 text-purple-900 border-purple-300'
                          )}
                        >
                          <History size={9} /> Recall Selesai
                        </span>
                      )}
                      {isTahsin && (
                        <span
                          className={cn(
                            'text-[8px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1',
                            selectedJournal?.id === a.id
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          )}
                        >
                          <BookOpen size={10} /> Tahsin & Tahfidz
                          {a.surah_name && ` : ${a.surah_name}`}
                          {a.tahsin_status && ` (${a.tahsin_status})`}
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-wider mt-1.5',
                        selectedJournal?.id === a.id ? 'text-slate-300' : 'text-slate-500'
                      )}
                    >
                      {dayLabel ? `${dayLabel}, ` : ''}
                      {a.date} • {a.shift} • {a.level} • {a.material_origin}
                    </p>
                    <p
                      className={cn(
                        'text-xs font-medium line-clamp-1 mt-1',
                        selectedJournal?.id === a.id ? 'text-slate-300' : 'text-slate-600'
                      )}
                    >
                      {a.material}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase block text-slate-400">
                      Hadir:
                    </span>
                    <span className="text-xs font-black uppercase">
                      {a.students.length} Siswa
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedJournal(a);
                      openEditModal(a);
                    }}
                    className={cn(
                      'px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border transition cursor-pointer',
                      selectedJournal?.id === a.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500 hover:text-white'
                        : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white'
                    )}
                    title="Cek & Edit Jurnal Ini"
                  >
                    <Edit3 size={11} /> Edit
                  </button>
                  <ChevronRight
                    size={18}
                    className={cn(
                      'transition-transform',
                      selectedJournal?.id === a.id
                        ? 'text-white translate-x-1'
                        : 'text-slate-300'
                    )}
                  />
                </div>
              </div>
            );
          })}

          {filteredJournals.length === 0 && (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                Tidak ada data jurnal yang sesuai filter saat ini.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-4 py-2 rounded-xl bg-emerald-950 text-gold-400 text-[10px] font-black uppercase tracking-wider cursor-pointer"
                >
                  Tampilkan Semua Jurnal
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail Jurnal Sidebar Panel */}
      <div className="w-full lg:w-96 shrink-0 sticky top-8">
        {selectedJournal ? (
          <div className="bg-slate-900 rounded-[2.5rem] p-7 text-white shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>

            <div className="relative z-10 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[1.5rem] bg-white/10 p-1 shrink-0">
                  <img
                    src={
                      selectedTutor?.photo ||
                      `https://i.pravatar.cc/150?u=${selectedJournal.tutor_wa}`
                    }
                    className="w-full h-full rounded-[1.2rem] object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-base leading-tight uppercase truncate">
                    {selectedTutor?.name || selectedJournal.tutor_name || 'Tutor'}
                  </h3>
                  <p className="text-emerald-400 text-[9px] font-black uppercase tracking-widest mt-1">
                    {getIndonesianDayName(selectedJournal.date)
                      ? `${getIndonesianDayName(selectedJournal.date)}, `
                      : ''}
                    {selectedJournal.date} • {selectedJournal.shift}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    <span className="bg-white/20 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                      {selectedJournal.mode}
                    </span>
                    <span className="bg-emerald-500/30 text-emerald-300 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                      {selectedJournal.level}
                    </span>
                    {selectedJournal.period && (
                      <span className="bg-white/10 text-slate-300 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                        Periode: {selectedJournal.period}
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(selectedJournal)}
                    className="p-2 bg-emerald-600/80 hover:bg-emerald-500 rounded-xl transition text-white cursor-pointer"
                    title="Edit Penuh Jurnal (Admin)"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingId(selectedJournal.id)}
                    className="p-2 bg-white/10 hover:bg-red-500 rounded-xl transition text-white/60 hover:text-white cursor-pointer"
                    title="Hapus Jurnal Permanen"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                {/* KARTU REVIEW SETORAN TAHSIN & TAHFIDZ */}
                {(selectedJournal.surah_name ||
                  selectedJournal.tahsin_status ||
                  (selectedJournal.tahsin_records && selectedJournal.tahsin_records.length > 0) ||
                  selectedJournal.level?.toLowerCase().includes('tahsin') ||
                  selectedJournal.level?.toLowerCase().includes('tahfidz')) && (
                  <div>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <BookOpen size={14} /> Jurnal Setoran Tahsin & Tahfidz
                    </p>
                    <div className="bg-gradient-to-br from-emerald-950/90 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[9px] text-emerald-400 font-bold uppercase block">
                            Nama Surat & Ayat:
                          </span>
                          <h4 className="text-base font-black text-white uppercase mt-0.5">
                            Surat {selectedJournal.surah_name || '-'}
                          </h4>
                          <p className="text-xs text-emerald-300 font-bold mt-0.5">
                            {selectedJournal.ayat_range || 'Ayat Lengkap'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">
                            Keterangan:
                          </span>
                          <span
                            className={cn(
                              'inline-block mt-1 text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-md',
                              selectedJournal.tahsin_status === 'Ulang'
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-emerald-400 text-slate-950'
                            )}
                          >
                            {selectedJournal.tahsin_status === 'Ulang' ? '⚠️ ULANG' : '✅ LANCAR'}
                          </span>
                        </div>
                      </div>

                      {selectedJournal.tahsin_records &&
                        selectedJournal.tahsin_records.length > 0 && (
                          <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
                            <span className="text-[9px] font-black uppercase text-emerald-400 block">
                              Rincian Per Siswa:
                            </span>
                            <div className="space-y-1 max-h-36 overflow-y-auto custom-scroll pr-1">
                              {selectedJournal.tahsin_records.map((rec, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between items-center bg-white/5 px-2.5 py-1.5 rounded-lg text-[10px] gap-2"
                                >
                                  <span className="font-black uppercase text-slate-200 truncate">
                                    {rec.student_name}
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-slate-400">
                                      {rec.surah_name} ({rec.ayat_range || '-'})
                                    </span>
                                    <span
                                      className={cn(
                                        'font-black px-1.5 py-0.5 rounded text-[8px] uppercase',
                                        rec.status === 'Ulang'
                                          ? 'bg-amber-500/20 text-amber-300'
                                          : 'bg-emerald-500/20 text-emerald-300'
                                      )}
                                    >
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

                {/* Bonus Pembuatan Modul */}
                {selectedJournal.module_created && (
                  <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 flex items-start gap-3">
                    <Award className="text-gold-400 shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-[10px] font-black text-emerald-300 uppercase">
                        Honor Tambahan Pembuatan Modul
                      </p>
                      <p className="text-xs text-white/90 font-bold mt-0.5">
                        {selectedJournal.module_title ||
                          'Tutor mengajukan pembuatan materi modul khusus pada sesi ini.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Recall & Review */}
                {(selectedJournal.recall_reviewed || selectedJournal.recall_notes) && (
                  <div className="bg-purple-950/40 border border-purple-500/30 rounded-2xl p-4 space-y-1.5">
                    <p className="text-[10px] font-black text-purple-300 uppercase tracking-widest flex items-center gap-1.5">
                      <History size={13} /> Recall & Review Materi
                    </p>
                    <p className="text-xs text-purple-100/90">
                      {selectedJournal.recall_notes || 'Recall materi pertemuan sebelumnya telah dilaksanakan.'}
                    </p>
                  </div>
                )}

                {/* Sesi Make Up */}
                {(selectedJournal.is_makeup_session ||
                  (selectedJournal.makeup_students && selectedJournal.makeup_students.length > 0)) && (
                  <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 space-y-2">
                    <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
                      <Repeat size={13} /> Sesi Make Up Class
                    </p>
                    {selectedJournal.makeup_students &&
                      selectedJournal.makeup_students.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedJournal.makeup_students.map(ms => (
                            <span
                              key={ms}
                              className="bg-amber-500/20 border border-amber-400/30 text-amber-200 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase"
                            >
                              {ms}
                            </span>
                          ))}
                        </div>
                      )}
                    {selectedJournal.makeup_notes && (
                      <p className="text-xs text-amber-100/80 italic">
                        "{selectedJournal.makeup_notes}"
                      </p>
                    )}
                  </div>
                )}

                {/* Materi Pembelajaran */}
                <div>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <BookOpen size={14} /> Materi Pembelajaran
                  </p>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <p className="text-sm font-bold leading-relaxed">{selectedJournal.material}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black px-2 py-1 rounded-full uppercase">
                        Asal: {selectedJournal.material_origin}
                      </span>
                      <span className="bg-white/10 text-slate-300 text-[8px] font-black px-2 py-1 rounded-full uppercase">
                        Buku: {selectedJournal.book_source || 'Tanpa Buku'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Absensi Siswa */}
                <div>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <UserIcon size={14} /> Absensi Siswa ({selectedJournal.students.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedJournal.students.map(s => (
                      <span
                        key={s}
                        className="bg-white/5 border border-white/10 text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-tighter"
                      >
                        {s}
                      </span>
                    ))}
                    {selectedJournal.students.length === 0 && (
                      <span className="text-[11px] text-slate-400 italic">Belum ada siswa tercatat.</span>
                    )}
                  </div>
                </div>

                {/* Catatan & Kendala */}
                {selectedJournal.notes && (
                  <div>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <MessageSquare size={14} /> Catatan & Kendala
                    </p>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <p className="text-xs text-slate-300 italic">"{selectedJournal.notes}"</p>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => openEditModal(selectedJournal)}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Edit3 size={14} /> Edit Lengkap Jurnal Ini
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center text-center space-y-4 h-full min-h-[400px]">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
              <Calendar className="text-slate-200" size={32} />
            </div>
            <p className="text-slate-400 text-xs italic">
              Pilih jurnal untuk melihat detil laporan
              <br />
              atau klik tombol Edit untuk koreksi langsung
            </p>
          </div>
        )}
      </div>

      {/* Modal Edit Penuh Jurnal (Privilege Admin) */}
      {editingJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-950 text-gold-400 flex items-center justify-center">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">
                    Inspeksi & Edit Penuh Jurnal Mengajar (Admin)
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Seluruh perubahan langsung tersinkronisasi ke Payroll & Cloud Firestore
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingJournal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="overflow-y-auto p-6 space-y-5 custom-scroll">
              {/* Identitas Sesi: Tutor, Tanggal, Shift, Periode */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1.5">
                  <Calendar size={12} className="text-emerald-600" /> Identitas Sesi & Jadwal
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                      Tutor Pengajar
                    </label>
                    <select
                      value={
                        appData.users.find(u =>
                          isRecordForTutor(editingJournal.tutor_wa, u, editingJournal.tutor_id)
                        )?.id || ''
                      }
                      onChange={e => {
                        const chosen = appData.users.find(u => u.id === e.target.value);
                        if (chosen) {
                          setEditingJournal({
                            ...editingJournal,
                            tutor_id: chosen.id,
                            tutor_wa: chosen.wa,
                            tutor_name: chosen.name
                          });
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Pertahankan ({editingJournal.tutor_name || editingJournal.tutor_wa}) --</option>
                      {tutorList.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.status_tutor})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                      Tanggal Sesi{' '}
                      {editingJournal.date && (
                        <span className="text-emerald-700">
                          ({getIndonesianDayName(editingJournal.date)})
                        </span>
                      )}
                    </label>
                    <input
                      type="date"
                      value={(editingJournal.date || '').slice(0, 10)}
                      onChange={e => {
                        const nextDate = e.target.value;
                        setEditingJournal({
                          ...editingJournal,
                          date: nextDate,
                          period: nextDate ? nextDate.slice(0, 7) : editingJournal.period
                        });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                      Shift Mengajar
                    </label>
                    <select
                      value={editingJournal.shift}
                      onChange={e =>
                        setEditingJournal({ ...editingJournal, shift: e.target.value })
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500"
                    >
                      {allAvailableShifts.map(sh => (
                        <option key={sh} value={sh}>
                          {sh}
                        </option>
                      ))}
                      {!allAvailableShifts.includes(editingJournal.shift) &&
                        editingJournal.shift && (
                          <option value={editingJournal.shift}>{editingJournal.shift}</option>
                        )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                      Periode Penggajian (YYYY-MM)
                    </label>
                    <input
                      type="text"
                      value={editingJournal.period || ''}
                      onChange={e =>
                        setEditingJournal({ ...editingJournal, period: e.target.value })
                      }
                      placeholder="Misal: 2026-11"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Mode, Level, Asal Materi, Sumber Buku */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Mode Mengajar
                  </label>
                  <select
                    value={editingJournal.mode}
                    onChange={e =>
                      setEditingJournal({
                        ...editingJournal,
                        mode: e.target.value as TeachingMode
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase outline-none focus:border-emerald-500"
                  >
                    <option value="Mandiri">Mandiri</option>
                    <option value="Team">Team</option>
                    <option value="Private">Private</option>
                    <option value="Semi Private">Semi Private</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Level / Program
                  </label>
                  <select
                    value={editingJournal.level}
                    onChange={e =>
                      setEditingJournal({ ...editingJournal, level: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase outline-none focus:border-emerald-500"
                  >
                    {WIC_LEVELS.map(lvl => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                    {!WIC_LEVELS.includes(editingJournal.level) && editingJournal.level && (
                      <option value={editingJournal.level}>{editingJournal.level}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Asal Materi
                  </label>
                  <select
                    value={editingJournal.material_origin || 'WIC'}
                    onChange={e =>
                      setEditingJournal({
                        ...editingJournal,
                        material_origin: e.target.value as 'WIC' | 'Sekolah'
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase outline-none focus:border-emerald-500"
                  >
                    <option value="WIC">Kurikulum WIC</option>
                    <option value="Sekolah">Materi Sekolah</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Sumber Buku / Modul Referensi
                  </label>
                  <input
                    type="text"
                    value={editingJournal.book_source || ''}
                    onChange={e =>
                      setEditingJournal({ ...editingJournal, book_source: e.target.value })
                    }
                    placeholder="Nama buku / halaman / modul..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Materi Pokok */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Materi Pokok / Pembelajaran
                </label>
                <textarea
                  rows={3}
                  value={editingJournal.material}
                  onChange={e =>
                    setEditingJournal({ ...editingJournal, material: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Absensi Siswa Hadir */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                    <Users size={13} className="text-emerald-600" /> Daftar Absensi Siswa Hadir (
                    {editingJournal.students.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {editingJournal.students.map(s => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase text-slate-700"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => handleRemoveStudentFromEdit(s)}
                        className="text-red-400 hover:text-red-600 cursor-pointer"
                        title="Hapus siswa dari absensi"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  {editingJournal.students.length === 0 && (
                    <span className="text-[11px] text-slate-400 italic">
                      Belum ada siswa tercatat.
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    list="wic-students-datalist"
                    value={newStudentName}
                    onChange={e => setNewStudentName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddStudentToEdit();
                      }
                    }}
                    placeholder="Ketik atau pilih nama siswa untuk ditambahkan..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddStudentToEdit}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus size={12} /> Tambah
                  </button>
                </div>
                <datalist id="wic-students-datalist">
                  {appData.students.map(st => (
                    <option key={st.id} value={st.name} />
                  ))}
                </datalist>
              </div>

              {/* Opsi Tambahan: Modul Semi Private, Recall & Review, Make Up Class */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Bonus Modul */}
                <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/70 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingJournal.module_created)}
                      onChange={e =>
                        setEditingJournal({
                          ...editingJournal,
                          module_created: e.target.checked
                        })
                      }
                      className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] font-black uppercase text-emerald-900">
                      Bonus Pembuatan Modul Materi
                    </span>
                  </label>
                  {editingJournal.module_created && (
                    <input
                      type="text"
                      value={editingJournal.module_title || ''}
                      onChange={e =>
                        setEditingJournal({
                          ...editingJournal,
                          module_title: e.target.value
                        })
                      }
                      placeholder="Judul / rincian modul yang dibuat..."
                      className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-emerald-500"
                    />
                  )}
                </div>

                {/* Recall & Review */}
                <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-purple-200/70 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingJournal.recall_reviewed)}
                      onChange={e =>
                        setEditingJournal({
                          ...editingJournal,
                          recall_reviewed: e.target.checked
                        })
                      }
                      className="w-4 h-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[10px] font-black uppercase text-purple-900">
                      Recall & Review Materi Selesai
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editingJournal.recall_notes || ''}
                    onChange={e =>
                      setEditingJournal({
                        ...editingJournal,
                        recall_notes: e.target.value
                      })
                    }
                    placeholder="Poin materi yang di-recall..."
                    className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Make Up Class */}
              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingJournal.is_makeup_session)}
                    onChange={e =>
                      setEditingJournal({
                        ...editingJournal,
                        is_makeup_session: e.target.checked
                      })
                    }
                    className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-[10px] font-black uppercase text-amber-900 flex items-center gap-1.5">
                    <Repeat size={12} /> Sesi Pengganti / Make Up Class
                  </span>
                </label>

                {(editingJournal.is_makeup_session ||
                  (editingJournal.makeup_students && editingJournal.makeup_students.length > 0)) && (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {(editingJournal.makeup_students || []).map(ms => (
                        <span
                          key={ms}
                          className="inline-flex items-center gap-1.5 bg-white border border-amber-300 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase text-amber-900"
                        >
                          {ms}
                          <button
                            type="button"
                            onClick={() => handleRemoveMakeupStudentFromEdit(ms)}
                            className="text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        list="wic-students-datalist"
                        value={newMakeupStudentName}
                        onChange={e => setNewMakeupStudentName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMakeupStudentToEdit();
                          }
                        }}
                        placeholder="Tambah siswa peserta Make Up..."
                        className="flex-1 bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddMakeupStudentToEdit}
                        className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase cursor-pointer shrink-0"
                      >
                        + Siswa
                      </button>
                    </div>
                    <input
                      type="text"
                      value={editingJournal.makeup_notes || ''}
                      onChange={e =>
                        setEditingJournal({
                          ...editingJournal,
                          makeup_notes: e.target.value
                        })
                      }
                      placeholder="Catatan Make Up Class..."
                      className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Setoran Tahsin & Tahfidz Fields */}
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase text-emerald-800 flex items-center gap-1.5">
                    <BookOpen size={13} /> Data Setoran Al-Qur'an (Tahsin & Tahfidz)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddTahsinRecord}
                    className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[9px] font-black uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={10} /> Rincian Per Siswa
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-emerald-700 mb-1">
                      Nama Surat
                    </label>
                    <input
                      type="text"
                      list="surah-list-edit"
                      value={editingJournal.surah_name || ''}
                      onChange={e =>
                        setEditingJournal({ ...editingJournal, surah_name: e.target.value })
                      }
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
                    <label className="block text-[9px] font-black uppercase text-emerald-700 mb-1">
                      Rentang Ayat
                    </label>
                    <input
                      type="text"
                      value={editingJournal.ayat_range || ''}
                      onChange={e =>
                        setEditingJournal({ ...editingJournal, ayat_range: e.target.value })
                      }
                      placeholder="Misal: Ayat 1-15"
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-emerald-700 mb-1">
                    Status Kelancaran
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingJournal({ ...editingJournal, tahsin_status: 'Lancar' })
                      }
                      className={cn(
                        'py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer',
                        editingJournal.tahsin_status === 'Lancar'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                          : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      )}
                    >
                      ✅ LANCAR
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingJournal({ ...editingJournal, tahsin_status: 'Ulang' })
                      }
                      className={cn(
                        'py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer',
                        editingJournal.tahsin_status === 'Ulang'
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow'
                          : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
                      )}
                    >
                      ⚠️ ULANG
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const { tahsin_status: _removed, ...rest } = editingJournal;
                        setEditingJournal(rest);
                      }}
                      className={cn(
                        'py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border cursor-pointer',
                        !editingJournal.tahsin_status
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                {/* Editable Rincian Tahsin Per Siswa */}
                {editingJournal.tahsin_records && editingJournal.tahsin_records.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-emerald-200">
                    <span className="text-[9px] font-black uppercase text-emerald-800 block">
                      Rincian Setoran Per Siswa ({editingJournal.tahsin_records.length})
                    </span>
                    {editingJournal.tahsin_records.map((rec, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-1.5 items-center bg-white p-2 rounded-xl border border-emerald-200"
                      >
                        <input
                          type="text"
                          list="wic-students-datalist"
                          value={rec.student_name}
                          onChange={e =>
                            handleUpdateTahsinRecord(idx, { student_name: e.target.value })
                          }
                          placeholder="Nama Siswa"
                          className="col-span-4 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-bold outline-none"
                        />
                        <input
                          type="text"
                          list="surah-list-edit"
                          value={rec.surah_name}
                          onChange={e =>
                            handleUpdateTahsinRecord(idx, { surah_name: e.target.value })
                          }
                          placeholder="Surat"
                          className="col-span-3 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-bold outline-none"
                        />
                        <input
                          type="text"
                          value={rec.ayat_range}
                          onChange={e =>
                            handleUpdateTahsinRecord(idx, { ayat_range: e.target.value })
                          }
                          placeholder="Ayat"
                          className="col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-medium outline-none"
                        />
                        <select
                          value={rec.status}
                          onChange={e =>
                            handleUpdateTahsinRecord(idx, {
                              status: e.target.value as 'Lancar' | 'Ulang'
                            })
                          }
                          className="col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1.5 text-[10px] font-black outline-none"
                        >
                          <option value="Lancar">Lancar</option>
                          <option value="Ulang">Ulang</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveTahsinRecord(idx)}
                          className="col-span-1 flex items-center justify-center p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Hapus baris"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Catatan Tambahan & Kendala
                </label>
                <textarea
                  rows={2}
                  value={editingJournal.notes || ''}
                  onChange={e =>
                    setEditingJournal({ ...editingJournal, notes: e.target.value })
                  }
                  placeholder="Catatan kelas, kendala, atau koreksi Admin..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-emerald-500"
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
                  <Check size={14} /> Simpan Perubahan Jurnal
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
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              Hapus Jurnal Permanen?
            </h3>
            <p className="text-xs text-slate-500 mt-2 mb-6">
              Catatan jurnal mengajar ini akan dihapus secara permanen dari database sistem & Cloud
              Firestore.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
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
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              Hapus {selectedJournalIds.length} Jurnal Permanen?
            </h3>
            <p className="text-xs text-slate-500 mt-2 mb-6">
              Seluruh ({selectedJournalIds.length}) catatan jurnal mengajar yang Anda pilih akan
              dihapus secara permanen dari database Cloud Firestore.
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
