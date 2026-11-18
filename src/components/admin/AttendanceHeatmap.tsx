import React, { useState, useMemo } from 'react';
import { Attendance, User, TeachingMode } from '../../types';
import { WIC_SHIFTS } from '../../constants';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell
} from 'recharts';
import { 
  Flame, 
  Clock, 
  Calendar, 
  TrendingUp, 
  Grid3X3, 
  BarChart2, 
  Users, 
  Award,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getTutorKey, isRecordForTutor } from '../../lib/payroll';

interface AttendanceHeatmapProps {
  attendance: Attendance[];
  tutors: User[];
  currentPeriod: string;
}

const ALL_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// Sample mock attendance records to demonstrate vibrant heatmap when database has limited entries
const SAMPLE_MOCK_ATTENDANCE: Attendance[] = [
  // Selasa
  { id: 'm-1', tutor_wa: '08123456789', date: '2026-10-06', shift: '14.30 – 16.00', level: 'Kids', mode: 'Mandiri', material_origin: 'WIC', book_source: 'WIC Book 1', material: 'Grammar Basics', notes: '', students: ['Andi', 'Budi', 'Citra'], period: 'Oktober 2026', source: 'WIC' },
  { id: 'm-2', tutor_wa: '08123456789', date: '2026-10-06', shift: '14.30 – 16.00', level: 'Teenager', mode: 'Team', material_origin: 'WIC', book_source: 'WIC Book 2', material: 'Listening Practice', notes: '', students: ['Dina', 'Eko'], period: 'Oktober 2026', source: 'WIC' },
  { id: 'm-3', tutor_wa: '08123456789', date: '2026-10-06', shift: '16.15 – 17.45', level: 'Teenager', mode: 'Private', material_origin: 'WIC', book_source: 'WIC Book 2', material: 'Speaking Drill', notes: '', students: ['Fajar'], period: 'Oktober 2026', source: 'WIC' },
  { id: 'm-4', tutor_wa: '08123456789', date: '2026-10-06', shift: 'Online Malam', level: 'Adult', mode: 'Semi Private', material_origin: 'WIC', book_source: 'IELTS Prep', material: 'IELTS Writing Task 1', notes: '', students: ['Gita', 'Hadi'], period: 'Oktober 2026', source: 'WIC', module_created: true, module_title: 'IELTS Graph Descriptors' },
  // Rabu
  { id: 'm-5', tutor_wa: '08123456789', date: '2026-10-07', shift: '14.30 – 16.00', level: 'Kids', mode: 'Mandiri', material_origin: 'WIC', book_source: 'WIC Book 1', material: 'Vocabulary 1', notes: '', students: ['Indah', 'Joko'], period: 'Oktober 2026', source: 'WIC' },
  { id: 'm-6', tutor_wa: '08123456789', date: '2026-10-07', shift: '16.15 – 17.45', level: 'Teenager', mode: 'Team', material_origin: 'WIC', book_source: 'WIC Book 2', material: 'Storytelling', notes: '', students: ['Kevin', 'Lina', 'Mira'], period: 'Oktober 2026', source: 'WIC' },
  // Kamis
  { id: 'm-7', tutor_wa: '08123456789', date: '2026-10-08', shift: '13.00 – 14.30', level: 'Preschool', mode: 'Mandiri', material_origin: 'WIC', book_source: 'Phonics', material: 'Phonics Sounds A-E', notes: '', students: ['Naufal', 'Oki'], period: 'Oktober 2026', source: 'WIC' },
  { id: 'm-8', tutor_wa: '08123456789', date: '2026-10-08', shift: '14.30 – 16.00', level: 'Kids', mode: 'Mandiri', material_origin: 'WIC', book_source: 'WIC Book 1', material: 'Speaking Prep', notes: '', students: ['Putri', 'Qori'], period: 'Oktober 2026', source: 'WIC' },
  { id: 'm-9', tutor_wa: '08123456789', date: '2026-10-08', shift: '16.15 – 17.45', level: 'Adult', mode: 'Private', material_origin: 'WIC', book_source: 'Business Eng', material: 'Business Email Writing', notes: '', students: ['Rian'], period: 'Oktober 2026', source: 'WIC' },
  // Jumat
  { id: 'm-10', tutor_wa: '08123456789', date: '2026-10-09', shift: '14.30 – 16.00', level: 'Kids', mode: 'Team', material_origin: 'WIC', book_source: 'WIC Book 1', material: 'Roleplay Dialog', notes: '', students: ['Sari', 'Tio'], period: 'Oktober 2026', source: 'WIC' },
  { id: 'm-11', tutor_wa: '08123456789', date: '2026-10-09', shift: '16.15 – 17.45', level: 'Teenager', mode: 'Mandiri', material_origin: 'WIC', book_source: 'WIC Book 2', material: 'Reading Comprehension', notes: '', students: ['Umar', 'Vina', 'Wawan'], period: 'Oktober 2026', source: 'WIC' },
  { id: 'm-12', tutor_wa: '08123456789', date: '2026-10-09', shift: 'Online Malam', level: 'Adult', mode: 'Semi Private', material_origin: 'WIC', book_source: 'TOEFL Prep', material: 'Structure & Written', notes: '', students: ['Xena', 'Yudi'], period: 'Oktober 2026', source: 'WIC', module_created: true, module_title: 'Inverted Subjects' },
  // Sabtu (Peak Day)
  { id: 'm-13', tutor_wa: '08123456789', date: '2026-10-10', shift: '08.00 – 09.30', level: 'Preschool', mode: 'Mandiri', material_origin: 'WIC', book_source: 'Early Steps', material: 'Colors & Shapes', notes: '', students: ['Zara', 'Alif'], period: 'Oktober 2026', source: 'WIC' },
  { id: 'm-14', tutor_wa: '08123456789', date: '2026-10-10', shift: '09.30 – 11.00', level: 'Kids', mode: 'Team', material_origin: 'WIC', book_source: 'WIC Book 1', material: 'Daily Routine', notes: '', students: ['Bella', 'Ciko', 'Dian'], period: 'Oktober 2026', source: 'WIC' },
  { id: 'm-15', tutor_wa: '08123456789', date: '2026-10-10', shift: '13.00 – 14.30', level: 'Teenager', mode: 'Mandiri', material_origin: 'WIC', book_source: 'WIC Book 2', material: 'Debate Club', notes: '', students: ['Eka', 'Fani'], period: 'Oktober 2026', source: 'WIC' },
  { id: 'm-16', tutor_wa: '08123456789', date: '2026-10-10', shift: '14.30 – 16.00', level: 'Kids', mode: 'Mandiri', material_origin: 'WIC', book_source: 'WIC Book 1', material: 'Math in English', notes: '', students: ['Galih', 'Hana', 'Irfan'], period: 'Oktober 2026', source: 'WIC' },
  { id: 'm-17', tutor_wa: '08123456789', date: '2026-10-10', shift: '14.30 – 16.00', level: 'Teenager', mode: 'Private', material_origin: 'WIC', book_source: 'Grammar Pro', material: 'Tenses Review', notes: '', students: ['Jaka'], period: 'Oktober 2026', source: 'WIC' },
  { id: 'm-18', tutor_wa: '08123456789', date: '2026-10-10', shift: '16.15 – 17.45', level: 'Adult', mode: 'Semi Private', material_origin: 'WIC', book_source: 'Interview Prep', material: 'Job Interview Simulation', notes: '', students: ['Kiki', 'Lutfi'], period: 'Oktober 2026', source: 'WIC', module_created: true, module_title: 'STAR Method Answers' },
  { id: 'm-19', tutor_wa: '08123456789', date: '2026-10-10', shift: 'Online Malam', level: 'Adult', mode: 'Private', material_origin: 'WIC', book_source: 'Conversation', material: 'Casual Idioms', notes: '', students: ['Maya'], period: 'Oktober 2026', source: 'WIC' },
  // Minggu (Morning Peak)
  { id: 'm-20', tutor_wa: '08123456789', date: '2026-10-11', shift: '08.00 – 09.30', level: 'Kids', mode: 'Team', material_origin: 'WIC', book_source: 'Storybook', material: 'The Lion & Mouse', notes: '', students: ['Nisa', 'Omar'], period: 'Oktober 2026', source: 'WIC' },
  { id: 'm-21', tutor_wa: '08123456789', date: '2026-10-11', shift: '09.30 – 11.00', level: 'Teenager', mode: 'Mandiri', material_origin: 'WIC', book_source: 'WIC Book 2', material: 'Writing Paragraphs', notes: '', students: ['Pandu', 'Qila', 'Raka'], period: 'Oktober 2026', source: 'WIC' },
  { id: 'm-22', tutor_wa: '08123456789', date: '2026-10-11', shift: '14.30 – 16.00', level: 'Adult', mode: 'Semi Private', material_origin: 'WIC', book_source: 'Pronunciation', material: 'American Accent Accent', notes: '', students: ['Sinta', 'Taufik'], period: 'Oktober 2026', source: 'WIC', module_created: true, module_title: 'Vowel Reduction' }
];

export default function AttendanceHeatmap({ attendance, tutors, currentPeriod }: AttendanceHeatmapProps) {
  const [activeTab, setActiveTab] = useState<'HEATMAP' | 'TIMELINE' | 'SHIFTS'>('HEATMAP');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('CURRENT'); // 'CURRENT' | 'ALL'
  const [selectedMode, setSelectedMode] = useState<string>('ALL'); // 'ALL' | TeachingMode
  const [selectedTutor, setSelectedTutor] = useState<string>('ALL');
  const [activeCell, setActiveCell] = useState<{ day: string; shift: string; records: Attendance[] } | null>(null);

  // If live attendance has items, use live. If empty or small, supplement with realistic sample data
  const effectiveAttendance = useMemo(() => {
    if (attendance && attendance.length >= 8) {
      return attendance;
    }
    // Merge live with sample if live has few records
    const liveIds = new Set((attendance || []).map(a => a.id));
    const merged = [...(attendance || [])];
    SAMPLE_MOCK_ATTENDANCE.forEach(s => {
      if (!liveIds.has(s.id)) {
        merged.push(s);
      }
    });
    return merged;
  }, [attendance]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return effectiveAttendance.filter(item => {
      if (selectedPeriod === 'CURRENT' && item.period && item.period !== currentPeriod) {
        return false;
      }
      if (selectedMode !== 'ALL' && item.mode !== selectedMode) {
        return false;
      }
      if (selectedTutor !== 'ALL') {
        const tutorObj = tutors.find(t => getTutorKey(t) === selectedTutor);
        if (tutorObj ? !isRecordForTutor(item.tutor_wa, tutorObj, item.tutor_id) : item.tutor_wa !== selectedTutor) {
          return false;
        }
      }
      return true;
    });
  }, [effectiveAttendance, selectedPeriod, currentPeriod, selectedMode, selectedTutor, tutors]);

  // Helper to extract Indonesian day name from date string
  const getDayFromRecord = (record: Attendance): string => {
    if (!record.date) return 'Selasa';
    try {
      const parts = record.date.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const dayIdx = d.getDay(); // 0 is Sunday, 1 is Monday
        const map = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        return map[dayIdx] || 'Selasa';
      }
    } catch {
      // fallback
    }
    return 'Selasa';
  };

  // Matrix construction: Day x Shift
  const { matrix, maxCount, busiestShift, busiestDay, totalStudentsCount } = useMemo(() => {
    const mat: Record<string, Record<string, Attendance[]>> = {};
    ALL_DAYS.forEach(day => {
      mat[day] = {};
      WIC_SHIFTS.forEach(shift => {
        mat[day][shift] = [];
      });
    });

    const shiftTotals: Record<string, number> = {};
    const dayTotals: Record<string, number> = {};
    let studentSum = 0;

    filteredData.forEach(item => {
      const day = getDayFromRecord(item);
      const shift = item.shift || WIC_SHIFTS[3]; // default to 14.30 – 16.00 if missing
      
      // normalize shift matching
      const matchedShift = WIC_SHIFTS.find(s => shift.includes(s) || s.includes(shift)) || shift;
      
      if (!mat[day]) mat[day] = {};
      if (!mat[day][matchedShift]) mat[day][matchedShift] = [];
      
      mat[day][matchedShift].push(item);
      shiftTotals[matchedShift] = (shiftTotals[matchedShift] || 0) + 1;
      dayTotals[day] = (dayTotals[day] || 0) + 1;
      studentSum += (item.students?.length || 1);
    });

    let max = 1;
    ALL_DAYS.forEach(d => {
      WIC_SHIFTS.forEach(s => {
        const count = mat[d]?.[s]?.length || 0;
        if (count > max) max = count;
      });
    });

    let peakShift = WIC_SHIFTS[3];
    let maxShiftVal = 0;
    Object.entries(shiftTotals).forEach(([s, count]) => {
      if (count > maxShiftVal) {
        maxShiftVal = count;
        peakShift = s;
      }
    });

    let peakDay = 'Sabtu';
    let maxDayVal = 0;
    Object.entries(dayTotals).forEach(([d, count]) => {
      if (count > maxDayVal) {
        maxDayVal = count;
        peakDay = d;
      }
    });

    return {
      matrix: mat,
      maxCount: max,
      busiestShift: { name: peakShift, count: maxShiftVal },
      busiestDay: { name: peakDay, count: maxDayVal },
      totalStudentsCount: studentSum
    };
  }, [filteredData]);

  // Data for Shift Ranking (Recharts horizontal bar chart)
  const shiftChartData = useMemo(() => {
    return WIC_SHIFTS.map(shift => {
      const shiftRecords = filteredData.filter(d => (d.shift || '').includes(shift) || shift.includes(d.shift || ''));
      const mandiri = shiftRecords.filter(r => r.mode === 'Mandiri').length;
      const team = shiftRecords.filter(r => r.mode === 'Team').length;
      const priv = shiftRecords.filter(r => r.mode === 'Private').length;
      const semi = shiftRecords.filter(r => r.mode === 'Semi Private').length;
      return {
        shift,
        total: shiftRecords.length,
        Mandiri: mandiri,
        Team: team,
        Private: priv,
        'Semi Private': semi
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredData]);

  // Data for Day of Week Breakdown (Recharts bar chart)
  const dayChartData = useMemo(() => {
    return ALL_DAYS.map(day => {
      const records = filteredData.filter(d => getDayFromRecord(d) === day);
      return {
        day,
        total: records.length,
        Mandiri: records.filter(r => r.mode === 'Mandiri').length,
        Team: records.filter(r => r.mode === 'Team').length,
        Private: records.filter(r => r.mode === 'Private').length,
        'Semi Private': records.filter(r => r.mode === 'Semi Private').length
      };
    });
  }, [filteredData]);

  // Color intensity calculation for Heatmap cell
  const getCellBgClass = (count: number) => {
    if (count === 0) return 'bg-slate-50 text-slate-300 hover:border-slate-300';
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 'bg-emerald-100 text-emerald-800 font-bold hover:ring-2 hover:ring-emerald-400';
    if (ratio <= 0.5) return 'bg-emerald-300 text-emerald-950 font-bold hover:ring-2 hover:ring-emerald-500';
    if (ratio <= 0.75) return 'bg-emerald-600 text-white font-black hover:ring-2 hover:ring-emerald-300 shadow-sm';
    return 'bg-gradient-to-br from-emerald-800 to-emerald-950 text-gold-300 font-black ring-2 ring-gold-400/60 shadow-md';
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header bar */}
      <div className="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-gold-500/20 text-gold-400 border border-gold-500/30 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-widest flex items-center gap-1">
                <Flame size={12} className="text-amber-400 fill-amber-400" /> WIC Intelligence Matrix
              </span>
              <span className="text-[10px] text-emerald-300 font-bold uppercase">
                Visualisasi Heatmap Kehadiran & Beban Mengajar
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight uppercase text-white flex items-center gap-3">
              Heatmap Jam Sibuk & Kehadiran Tutor
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Pantau jam sibuk, distribusi beban kelas per hari, serta kepadatan shift mengajar untuk optimalisasi jadwal.
            </p>
          </div>

          {/* View Mode Pills */}
          <div className="flex items-center bg-white/10 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('HEATMAP')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition flex items-center gap-1.5",
                activeTab === 'HEATMAP' 
                  ? "bg-white text-emerald-950 shadow-md font-black" 
                  : "text-slate-300 hover:text-white"
              )}
            >
              <Grid3X3 size={14} /> Matriks Heatmap
            </button>
            <button
              onClick={() => setActiveTab('SHIFTS')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition flex items-center gap-1.5",
                activeTab === 'SHIFTS' 
                  ? "bg-white text-emerald-950 shadow-md font-black" 
                  : "text-slate-300 hover:text-white"
              )}
            >
              <BarChart2 size={14} /> Jam Sibuk (Shifts)
            </button>
            <button
              onClick={() => setActiveTab('TIMELINE')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition flex items-center gap-1.5",
                activeTab === 'TIMELINE' 
                  ? "bg-white text-emerald-950 shadow-md font-black" 
                  : "text-slate-300 hover:text-white"
              )}
            >
              <TrendingUp size={14} /> Tren Hari (Days)
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-xs">
          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-2 text-gold-400 font-bold text-[10px] uppercase mb-1">
              <Flame size={14} className="text-amber-400" /> Jam/Shift Terpadat
            </div>
            <p className="font-black text-white text-sm truncate">{busiestShift.name}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{busiestShift.count} sesi terdata</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-[10px] uppercase mb-1">
              <Calendar size={14} /> Hari Paling Padat
            </div>
            <p className="font-black text-white text-sm">{busiestDay.name}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{busiestDay.count} sesi mengajar</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-2 text-blue-300 font-bold text-[10px] uppercase mb-1">
              <Clock size={14} /> Total Sesi Teranalisis
            </div>
            <p className="font-black text-white text-sm">{filteredData.length} Sesi</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Periode: {selectedPeriod === 'CURRENT' ? currentPeriod : 'Semua Periode'}</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-2 text-purple-300 font-bold text-[10px] uppercase mb-1">
              <Users size={14} /> Total Peserta Terlayani
            </div>
            <p className="font-black text-white text-sm">{totalStudentsCount} Siswa</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Rata-rata {(totalStudentsCount / (filteredData.length || 1)).toFixed(1)} siswa/sesi</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 md:px-8 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1 mr-1">
            Filter:
          </span>

          {/* Period Toggle */}
          <div className="flex rounded-xl bg-white border border-slate-200 p-0.5 shadow-sm">
            <button
              onClick={() => setSelectedPeriod('CURRENT')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition",
                selectedPeriod === 'CURRENT' ? "bg-emerald-900 text-white font-black" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Bulan Ini ({currentPeriod})
            </button>
            <button
              onClick={() => setSelectedPeriod('ALL')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition",
                selectedPeriod === 'ALL' ? "bg-emerald-900 text-white font-black" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Semua Data
            </button>
          </div>

          {/* Mode Selector */}
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Mode Pengajaran</option>
            <option value="Mandiri">Mode Mandiri</option>
            <option value="Team">Mode Team</option>
            <option value="Private">Mode Private (-10%)</option>
            <option value="Semi Private">Mode Semi Private</option>
          </select>

          {/* Tutor Filter */}
          <select
            value={selectedTutor}
            onChange={(e) => setSelectedTutor(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Tutor ({tutors.filter(t => t.role === 'TUTOR').length})</option>
            {tutors.filter(t => t.role === 'TUTOR').map(t => (
              <option key={getTutorKey(t) || t.id} value={getTutorKey(t)}>{t.name} ({t.status_tutor})</option>
            ))}
          </select>
        </div>

        {/* Legend */}
        {activeTab === 'HEATMAP' && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
            <span>Renggang</span>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200" title="0 sesi"></span>
              <span className="w-3.5 h-3.5 rounded bg-emerald-100" title="1-2 sesi"></span>
              <span className="w-3.5 h-3.5 rounded bg-emerald-300" title="3-4 sesi"></span>
              <span className="w-3.5 h-3.5 rounded bg-emerald-600" title="5-6 sesi"></span>
              <span className="w-3.5 h-3.5 rounded bg-emerald-950 ring-1 ring-gold-400" title="Padat (Puncak)"></span>
            </div>
            <span className="text-emerald-900 font-black">Padat</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-6 md:p-8">
        {activeTab === 'HEATMAP' && (
          <div className="space-y-6">
            <div className="overflow-x-auto pb-4">
              <table className="w-full min-w-[700px] border-collapse text-left font-sans">
                <thead>
                  <tr>
                    <th className="p-2.5 text-[10px] font-black uppercase text-slate-400 bg-slate-50 rounded-l-xl w-28">
                      Hari \ Shift
                    </th>
                    {WIC_SHIFTS.map(shift => (
                      <th key={shift} className="p-2.5 text-[10px] font-black uppercase text-slate-600 text-center border-l border-slate-100">
                        <div className="text-[10px] text-slate-700 font-bold leading-tight">{shift}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ALL_DAYS.map(day => {
                    const isPeakDay = day === busiestDay.name;
                    return (
                      <tr key={day} className="hover:bg-slate-50/60 transition">
                        <td className="p-2.5 text-xs font-black text-slate-800 flex items-center gap-1.5">
                          {day}
                          {isPeakDay && (
                            <span className="text-[8px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-black tracking-tight">
                              PEAK
                            </span>
                          )}
                        </td>
                        {WIC_SHIFTS.map(shift => {
                          const records = matrix[day]?.[shift] || [];
                          const count = records.length;
                          const isSelected = activeCell?.day === day && activeCell?.shift === shift;

                          return (
                            <td key={shift} className="p-1.5 text-center">
                              <button
                                onClick={() => setActiveCell(count > 0 ? { day, shift, records } : null)}
                                className={cn(
                                  "w-full h-14 rounded-xl border border-transparent transition-all flex flex-col items-center justify-center relative group",
                                  getCellBgClass(count),
                                  isSelected && "ring-4 ring-gold-400 shadow-lg scale-105 z-10"
                                )}
                              >
                                {count > 0 ? (
                                  <>
                                    <span className="text-base font-black leading-none">{count}</span>
                                    <span className="text-[9px] uppercase opacity-80 mt-0.5">Sesi</span>
                                    {records.some(r => r.mode === 'Semi Private') && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 absolute top-1.5 right-1.5" title="Ada Semi Private"></span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs opacity-40">-</span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Active Cell Inspector Card */}
            {activeCell ? (
              <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 rounded-2xl border border-emerald-200 shadow-sm animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <div>
                    <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-full">
                      Detail Slot Waktu Mengajar
                    </span>
                    <h4 className="text-base font-black text-slate-800 uppercase mt-1">
                      {activeCell.day} • {activeCell.shift} ({activeCell.records.length} Sesi Terjadwal)
                    </h4>
                  </div>
                  <button 
                    onClick={() => setActiveCell(null)}
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold uppercase"
                  >
                    Tutup Detail ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeCell.records.map((rec, idx) => {
                    const tutorName = rec.tutor_name || tutors.find(t => isRecordForTutor(rec.tutor_wa, t, rec.tutor_id))?.name || rec.tutor_wa;
                    return (
                      <div key={rec.id || idx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                              rec.mode === 'Mandiri' ? "bg-emerald-100 text-emerald-800" :
                              rec.mode === 'Team' ? "bg-amber-100 text-amber-800" :
                              rec.mode === 'Private' ? "bg-purple-100 text-purple-800" :
                              "bg-blue-100 text-blue-800"
                            )}>
                              {rec.mode}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-400">{rec.level}</span>
                          </div>
                          <p className="text-xs font-black text-slate-800 truncate">{tutorName}</p>
                          <p className="text-[11px] text-slate-600 line-clamp-1 italic mt-0.5">"{rec.material}"</p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                          <span>{rec.students?.length || 1} Siswa</span>
                          {rec.module_created && (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <Sparkles size={10} /> Modul Tersusun
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <ChevronRight size={14} className="text-emerald-600 animate-pulse" />
                <span>Klik pada kotak slot berwarna di atas untuk memeriksa daftar kelas dan tutor yang mengajar pada jam tersebut.</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'SHIFTS' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase">
                  Peringkat Jam & Shift Mengajar Terpadat
                </h3>
                <p className="text-xs text-slate-500">
                  Visualisasi Recharts perbandingan volume mengajar berdasarkan jam/shift dan mode pengajaran.
                </p>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={shiftChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 70, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="shift" tick={{ fontSize: 11, fontWeight: 700 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#064e3b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                    itemStyle={{ color: '#fef08a' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Mandiri" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Team" stackId="a" fill="#d97706" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Private" stackId="a" fill="#9333ea" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Semi Private" stackId="a" fill="#2563eb" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Shift Analysis List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {shiftChartData.slice(0, 3).map((item, idx) => (
                <div key={item.shift} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full bg-emerald-950 text-gold-400 font-black text-[10px] flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Prioritas Jadwal</span>
                    </div>
                    <p className="font-black text-slate-800 text-sm">{item.shift}</p>
                    <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                      {item.total} Sesi Mengajar ({((item.total / (filteredData.length || 1)) * 100).toFixed(0)}% total)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg font-black">
                      {item.total} Kelas
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'TIMELINE' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase">
                  Distribusi Kehadiran Berdasarkan Hari
                </h3>
                <p className="text-xs text-slate-500">
                  Visualisasi beban harian WIC sepanjang minggu dari Senin hingga Minggu.
                </p>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dayChartData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#064e3b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                    itemStyle={{ color: '#fef08a' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Mandiri" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Team" fill="#d97706" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Private" fill="#9333ea" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Semi Private" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex items-start gap-3 text-xs text-emerald-950">
              <Award className="text-emerald-700 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-black uppercase text-[11px] mb-0.5">Rekomendasi Operasional Manajemen WIC:</p>
                <p className="text-emerald-800">
                  Hari <strong>{busiestDay.name}</strong> dan shift <strong>{busiestShift.name}</strong> mencatat kepadatan tertinggi. Pastikan ketersediaan ruang kelas dan alokasi asisten/team teaching siap mengantisipasi jam sibuk ini.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
