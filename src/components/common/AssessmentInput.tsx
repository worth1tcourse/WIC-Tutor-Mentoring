import React, { useState, useEffect, useMemo } from 'react';
import { Student, Assessment } from '../../types';
import { WIC_PROGRAM_CATEGORIES, WIC_LEVELS, WIC_DAYS, WIC_SHIFTS, WIC_ASSETS, EMBEDDED_WIC_LOGO } from '../../constants';
import { 
  Save, 
  AlertCircle, 
  Printer, 
  Award, 
  BookOpen, 
  Sparkles, 
  Users, 
  CheckCircle2, 
  Search,
  Filter,
  Download,
  GraduationCap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import Papa from 'papaparse';

interface AssessmentInputProps {
  students: Student[];
  assessments: Assessment[];
  onSave: (data: Assessment[]) => void;
  isTutor?: boolean;
  logoUrl?: string;
}

export default function AssessmentInput({ 
  students, 
  assessments, 
  onSave, 
  isTutor = false,
  logoUrl
}: AssessmentInputProps) {
  const [selectedProgram, setSelectedProgram] = useState<string>('Kids');
  const [day, setDay] = useState('');
  const [shift, setShift] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [localData, setLocalData] = useState<Assessment[]>(assessments);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setLocalData(assessments);
    setHasUnsavedChanges(false);
  }, [assessments]);

  const handleDownloadLegger = () => {
    window.print();
  };

  // Filter students enrolled in the currently selected program category
  // A student can be enrolled via Program 1 (level) OR Program 2 (level2)
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchProg1 = s.level === selectedProgram;
      const matchProg2 = Boolean(s.is_dual_program || s.level2) && s.level2 === selectedProgram;
      const matchProgram = matchProg1 || matchProg2;

      if (!matchProgram) return false;

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(query);
        const matchesNick = Boolean(s.nickname && s.nickname.toLowerCase().includes(query));
        const matchesId = s.id.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesNick) return false;
      }

      if (isTutor && (day || shift)) {
        const schedule1 = (!day || s.hari1 === day) && (!shift || s.shift1 === shift);
        const schedule2 = (!day || s.hari2 === day) && (!shift || s.shift2 === shift);
        const p2_h1 = s.prog2_hari1 || s.hari_prog2;
        const p2_s1 = s.prog2_shift1 || s.shift_prog2;
        const scheduleProg2_1 = Boolean(p2_h1 && p2_s1) && 
                              (!day || p2_h1 === day) && 
                              (!shift || p2_s1 === shift);
        const scheduleProg2_2 = Boolean(s.prog2_hari2 && s.prog2_shift2) && 
                              (!day || s.prog2_hari2 === day) && 
                              (!shift || s.prog2_shift2 === shift);
        return schedule1 || schedule2 || scheduleProg2_1 || scheduleProg2_2;
      }

      return true;
    });
  }, [students, selectedProgram, searchTerm, isTutor, day, shift]);

  // Retrieve assessment specific to this student AND this program
  const getAssessment = (sid: string) => {
    const existing = localData.find(a => 
      a.student_id === sid && (a.program ? a.program === selectedProgram : true)
    );
    return existing || { 
      student_id: sid, 
      program: selectedProgram,
      m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, 
      exam: 0, cs: 0, note: '' 
    };
  };

  const updateCell = (sid: string, key: keyof Assessment, val: string | number) => {
    setHasUnsavedChanges(true);
    const next = [...localData];
    const idx = next.findIndex(a => 
      a.student_id === sid && (a.program ? a.program === selectedProgram : true)
    );
    const newVal = key === 'note' ? val : (parseInt(val as string) || 0);

    if (idx > -1) {
      next[idx] = { 
        ...next[idx], 
        program: selectedProgram, 
        [key]: newVal 
      };
    } else {
      next.push({ 
        student_id: sid, 
        program: selectedProgram,
        m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, 
        exam: 0, cs: 0, note: '',
        [key]: newVal 
      });
    }
    setLocalData(next);
  };

  const handleSave = () => {
    onSave(localData);
    setHasUnsavedChanges(false);
  };

  const handleExportCSV = () => {
    const exportRows = filteredStudents.map(s => {
      const ass = getAssessment(s.id);
      return {
        'ID Siswa': s.id,
        'Nama Siswa': s.name,
        'Program Yang Dinilai': selectedProgram,
        'Status Siswa': (s.is_dual_program || s.level2) ? '2 Program (Dual)' : 'Reguler',
        'M1': ass.m1 || 0,
        'M2': ass.m2 || 0,
        'M3': ass.m3 || 0,
        'M4': ass.m4 || 0,
        'M5': ass.m5 || 0,
        'M6': ass.m6 || 0,
        'M7': ass.m7 || 0,
        'M8': ass.m8 || 0,
        'Exam': ass.exam || 0,
        'CS': ass.cs || 0,
        'Catatan Khusus': ass.note || ''
      };
    });

    const csv = Papa.unparse(exportRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Legger_Nilai_${selectedProgram}_${Date.now()}.csv`;
    link.click();
  };

  // Program count indicators
  const programCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    WIC_PROGRAM_CATEGORIES.forEach(p => {
      counts[p] = students.filter(s => s.level === p || (s.is_dual_program && s.level2 === p)).length;
    });
    return counts;
  }, [students]);

  // Average stats for this program
  const stats = useMemo(() => {
    if (filteredStudents.length === 0) return { avgExam: 0, avgCs: 0, filledCount: 0 };
    let totalExam = 0;
    let totalCs = 0;
    let filled = 0;

    filteredStudents.forEach(s => {
      const ass = getAssessment(s.id);
      totalExam += (ass.exam || 0);
      totalCs += (ass.cs || 0);
      if (ass.exam > 0 || ass.cs > 0 || ass.m1 > 0) filled++;
    });

    return {
      avgExam: Math.round(totalExam / filteredStudents.length),
      avgCs: Math.round(totalCs / filteredStudents.length),
      filledCount: filled
    };
  }, [filteredStudents, localData, selectedProgram]);

  const isIslamicProgram = selectedProgram === 'Tahsin & Tahfidz';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Program Selector Pills Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4 no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
              <Award className="text-emerald-600" size={20} /> Master Penilaian & Buku Nilai Siswa
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih kategori program untuk mengisi dan meninjau capaian belajar M1-M8, Ujian, serta Customer Service (CS).
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-800 px-3 py-1 rounded-full border border-amber-200 animate-pulse">
                Ada Perubahan Belum Disimpan
              </span>
            )}
            <button 
              onClick={handleSave}
              className="bg-emerald-950 hover:bg-emerald-900 text-gold-400 px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer"
            >
              <Save size={14} /> Simpan Semua Nilai
            </button>
            <button 
              onClick={handleDownloadLegger}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] transition flex items-center gap-1.5 border border-slate-200 shadow-sm"
              title="Cetak Legger / PDF"
            >
              <Printer size={14} /> Cetak Legger
            </button>
            <button 
              onClick={handleExportCSV}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold uppercase text-[10px] transition flex items-center gap-1.5 border border-slate-200 shadow-sm"
              title="Export CSV Nilai"
            >
              <Download size={14} /> CSV
            </button>
          </div>
        </div>

        {/* Categories Tab Selector */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scroll pb-1 pt-1">
          {WIC_PROGRAM_CATEGORIES.map(cat => {
            const isActive = selectedProgram === cat;
            const count = programCounts[cat] || 0;
            const isTahsinOrTahfidz = cat === 'Tahsin & Tahfidz';

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedProgram(cat)}
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shrink-0 border cursor-pointer",
                  isActive 
                    ? isTahsinOrTahfidz 
                      ? "bg-teal-900 text-white border-teal-900 shadow-md ring-2 ring-teal-500/20"
                      : "bg-emerald-900 text-white border-emerald-900 shadow-md ring-2 ring-emerald-500/20"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                )}
              >
                {isTahsinOrTahfidz && <BookOpen size={13} className={isActive ? "text-teal-300" : "text-teal-600"} />}
                <span>{cat}</span>
                <span className={cn(
                  "text-[9px] font-mono font-bold px-2 py-0.5 rounded-full",
                  isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Program Summary KPI Banner (No Print) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 no-print">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Siswa Terdaftar Program</p>
            <h4 className="text-xl font-black text-slate-800 mt-0.5">{filteredStudents.length} Siswa</h4>
            <p className="text-[9px] text-emerald-700 font-bold uppercase mt-0.5">Kategori: {selectedProgram}</p>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Status Input Nilai</p>
            <h4 className="text-xl font-black text-blue-900 mt-0.5">{stats.filledCount} / {filteredStudents.length}</h4>
            <p className="text-[9px] text-blue-600 font-bold mt-0.5">Sudah Terisi</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Rata-rata Ujian</p>
            <h4 className="text-xl font-black text-amber-700 mt-0.5 font-mono">{stats.avgExam}</h4>
            <p className="text-[9px] text-slate-400 font-bold mt-0.5">Skala 0 - 100</p>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center">
            <Award size={18} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Rata-rata CS (Kepuasan)</p>
            <h4 className="text-xl font-black text-emerald-700 mt-0.5 font-mono">{stats.avgCs}</h4>
            <p className="text-[9px] text-slate-400 font-bold mt-0.5">Kehadiran & Sikap</p>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
            <Sparkles size={18} />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input 
            type="text" 
            placeholder={`Cari nama siswa di kelas ${selectedProgram}...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition"
          />
        </div>

        {isTutor && (
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={day} 
              onChange={e => setDay(e.target.value)} 
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase text-slate-700 outline-none"
            >
              <option value="">- Semua Hari -</option>
              {WIC_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select 
              value={shift} 
              onChange={e => setShift(e.target.value)} 
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase text-slate-700 outline-none"
            >
              <option value="">- Semua Shift -</option>
              {WIC_SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Main Table: Legger Nilai Siswa */}
      <div id="legger-table" className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 md:p-8 print:p-0 print:border-none">
        {/* Printable Official Header */}
        <div className="hidden print:flex items-center justify-between border-b-2 border-emerald-950 pb-6 mb-6">
          <div className="flex items-center gap-4">
            <img 
              src={logoUrl || WIC_ASSETS.LOGO} 
              className="h-16 object-contain" 
              alt="WIC Logo" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = EMBEDDED_WIC_LOGO;
              }}
            />
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase font-serif">WORTH IT COURSE</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">
                LEMBAR EVALUASI & BUKU NILAI (LEGGER)
              </p>
              <p className="text-[9px] text-slate-500">
                Program / Jenjang: <strong className="text-emerald-900">{selectedProgram}</strong> • Terbitan Resmi WIC V2
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-700 block">DOKUMEN RESMI WIC</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase">Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center whitespace-nowrap min-w-[1000px]">
             <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b border-slate-200">
                <tr>
                   <th className="p-4 text-left min-w-[240px] sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                     Nama Siswa & Status Program
                   </th>
                   {Array.from({length: 8}, (_,i) => i+1).map(m => (
                      <th key={m} className="p-3 border-r border-slate-200 w-12 text-slate-700">
                        {isIslamicProgram ? `Pert ${m}` : `M${m}`}
                      </th>
                   ))}
                   <th className="p-3 border-r border-slate-200 w-16 bg-gold-50 text-gold-800">
                     {isIslamicProgram ? 'Ujian / Tasmi\'' : 'Exam'}
                   </th>
                   <th className="p-3 border-r border-slate-200 w-16 bg-emerald-50 text-emerald-800">
                     {isIslamicProgram ? 'Adab' : 'CS'}
                   </th>
                   <th className="p-3 text-left min-w-[250px]">Catatan Perkembangan & Target</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map(s => {
                  const ass = getAssessment(s.id);
                  const isDual = Boolean(s.is_dual_program || s.level2);
                  const isPrimaryProg = s.level === selectedProgram;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                       {/* Student Identification with Dual Program Badging */}
                       <td className="p-4 text-left font-black text-xs uppercase text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-sm min-w-[240px]">
                          <div className="flex items-center gap-3">
                             <img 
                                src={s.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=f1f5f9&color=10b981&bold=true`} 
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0"
                                alt={s.name}
                             />
                             <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                   <p className="font-black text-slate-900 leading-tight">{s.name}</p>
                                   {s.nickname && (
                                     <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                                       "{s.nickname}"
                                     </span>
                                   )}
                                </div>
                                <p className="text-[9px] text-slate-400 font-mono font-bold tracking-tight mt-0.5">ID: #{s.id}</p>
                                {isDual ? (
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className="text-[8px] bg-purple-100 text-purple-800 font-black px-1.5 py-0.5 rounded border border-purple-200">
                                      ⚡ 2 Program ({isPrimaryProg ? 'Prog 1 Utama' : 'Prog 2 Kedua'})
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[8px] text-slate-400 font-bold uppercase mt-0.5 block">
                                    Reguler
                                  </span>
                                )}
                             </div>
                          </div>
                       </td>

                       {/* M1 to M8 Scores */}
                       {[1,2,3,4,5,6,7,8].map(m => {
                          const k = `m${m}` as keyof Assessment;
                          return (
                            <td key={m} className="p-2 border-r border-slate-100">
                               <input 
                                  type="number" 
                                  min={0}
                                  max={100}
                                  value={(ass[k] as number) || ''} 
                                  onChange={(e) => updateCell(s.id, k, e.target.value)}
                                  className="w-12 text-center p-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:border-emerald-500 outline-none transition focus:bg-emerald-50/50"
                                  placeholder="0"
                               />
                            </td>
                          );
                       })}

                       {/* Exam Score */}
                       <td className="p-2 border-r border-slate-100 bg-gold-50/30">
                          <input 
                             type="number" 
                             min={0}
                             max={100}
                             value={ass.exam || ''} 
                             onChange={(e) => updateCell(s.id, 'exam', e.target.value)}
                             className="w-14 text-center p-1.5 border border-gold-300 rounded-lg text-xs font-mono font-black text-gold-900 focus:border-gold-600 outline-none transition bg-white"
                             placeholder="0"
                          />
                       </td>

                       {/* CS / Adab Score */}
                       <td className="p-2 border-r border-slate-100 bg-emerald-50/30">
                          <input 
                             type="number" 
                             min={0}
                             max={100}
                             value={ass.cs || ''} 
                             onChange={(e) => updateCell(s.id, 'cs', e.target.value)}
                             className="w-14 text-center p-1.5 border border-emerald-300 rounded-lg text-xs font-mono font-black text-emerald-900 focus:border-emerald-600 outline-none transition bg-white"
                             placeholder="0"
                          />
                       </td>

                       {/* Progress Notes */}
                       <td className="p-2">
                          <input 
                             type="text" 
                             placeholder={isIslamicProgram ? "Catatan kelancaran makharijul huruf / juz..." : "Catatan perkembangan materi & keaktifan..."}
                             value={ass.note || ''} 
                             onChange={(e) => updateCell(s.id, 'note', e.target.value)}
                             className="w-full p-2 border border-slate-200 rounded-lg text-xs italic focus:border-emerald-500 outline-none transition focus:bg-slate-50"
                          />
                       </td>
                    </tr>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                     <td colSpan={13} className="py-20 text-center text-slate-400">
                        <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-xs uppercase">Belum ada siswa terdaftar di program {selectedProgram}.</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Anda dapat mendaftarkan siswa baru atau menambahkan program ini sebagai Program Ke-2 di menu Database Siswa.
                        </p>
                     </td>
                  </tr>
                )}
             </tbody>
          </table>
        </div>

        {/* Printable Signature Footer */}
        <div className="hidden print:grid grid-cols-2 gap-12 mt-12 pt-8 border-t border-slate-200 text-xs">
          <div className="text-center">
            <p className="text-slate-500 font-bold uppercase text-[10px]">Tutor Pengampu / Penilai</p>
            <div className="h-16 flex items-center justify-center font-handwriting text-xl text-slate-700">
              ( Terverifikasi Portal )
            </div>
            <p className="font-black text-slate-900 uppercase">Tutor Kelas {selectedProgram}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-500 font-bold uppercase text-[10px]">Mengetahui,</p>
            <div className="h-16 flex items-center justify-center font-handwriting text-xl text-slate-700">
              ( Manajemen Akademik )
            </div>
            <p className="font-black text-slate-900 uppercase">Manajemen Akademik WIC</p>
          </div>
        </div>
      </div>
    </div>
  );
}
