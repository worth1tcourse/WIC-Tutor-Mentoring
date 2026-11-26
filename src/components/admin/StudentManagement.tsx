import React, { useState } from 'react';
import { Student } from '../../types';
import { WIC_PROGRAM_CATEGORIES, WIC_LEVELS, WIC_DAYS, WIC_SHIFTS, WIC_ASSETS, EMBEDDED_WIC_LOGO } from '../../constants';
import { 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Search, 
  GraduationCap, 
  BookOpen, 
  Layers, 
  Sparkles, 
  Users, 
  Download, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Edit3,
  X,
  AlertTriangle,
  Check,
  MessageCircle,
  Eye,
  School,
  MapPin,
  Mail,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Phone,
  UserCheck,
  CalendarOff,
  UserMinus,
  RotateCcw,
  FileText,
  CheckCircle2,
  Info,
  CalendarDays,
  Upload,
  FileJson
} from 'lucide-react';
import Papa from 'papaparse';
import { domToPng } from 'modern-screenshot';
import { cn } from '../../lib/utils';
import { INITIAL_IMPORTED_STUDENTS, mergeNewImportedStudents } from '../../data/importedStudents';
import { exportStudentsCSV, exportStudentsJSON, importStudentsFromFile } from '../../lib/dataExportImport';
import FormatTemplateModal from '../common/FormatTemplateModal';

interface StudentManagementProps {
  students: Student[];
  onUpdate: (students: Student[]) => void;
  logoUrl?: string;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function StudentManagement({ students, onUpdate, logoUrl, showToast }: StudentManagementProps) {
  const [filter, setFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CUTI'>('ALL');
  const [viewMode, setViewMode] = useState<'DIRECTORY' | 'LEAVE_RECAP'>('DIRECTORY');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Student | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);

  // Leave / Cuti Modal State
  const [leaveModalStudent, setLeaveModalStudent] = useState<Student | null>(null);
  const [leaveFormData, setLeaveFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    reason: 'Ujian Sekolah (PTS / PAS)',
    customReason: '',
    note: ''
  });
  const [isBulkLeaveModalOpen, setIsBulkLeaveModalOpen] = useState(false);
  const [bulkLeaveData, setBulkLeaveData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    reason: 'Ujian Sekolah (PTS / PAS)',
    note: ''
  });
  const [quickAddLeaveStudentId, setQuickAddLeaveStudentId] = useState('');

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // New Student Form State for Modal
  const [newStudentData, setNewStudentData] = useState<Partial<Student>>({
    name: '',
    nickname: '',
    wa: '',
    email: '',
    school: '',
    grade: '',
    parent_name: '',
    address: '',
    goals: '',
    level: 'Kids',
    is_dual_program: false,
    level2: 'Tahsin & Tahfidz',
    hari1: 'Selasa',
    shift1: WIC_SHIFTS[0],
    hari2: 'Kamis',
    shift2: WIC_SHIFTS[0],
    prog2_hari1: 'Rabu',
    prog2_shift1: WIC_SHIFTS[0],
    prog2_hari2: 'Jumat',
    prog2_shift2: WIC_SHIFTS[0],
    notes: ''
  });

  // Status & Leave Metrics
  const totalStudents = students.length;
  const cutiStudents = students.filter(s => s.status === 'CUTI');
  const cutiCount = cutiStudents.length;
  const activeStudentsCount = students.filter(s => s.status !== 'CUTI').length;
  const dualProgramCount = students.filter(s => s.is_dual_program || s.level2).length;
  const tahsinTahfidzCount = students.filter(s => 
    s.level === 'Tahsin & Tahfidz' || s.level2 === 'Tahsin & Tahfidz'
  ).length;

  const calculateDaysRemaining = (endDateStr?: string) => {
    if (!endDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleOpenLeaveModal = (student: Student) => {
    setLeaveModalStudent(student);
    const todayStr = new Date().toISOString().split('T')[0];
    setLeaveFormData({
      startDate: student.leave_start_date || todayStr,
      endDate: student.leave_end_date || '',
      reason: student.leave_reason || 'Ujian Sekolah (PTS / PAS)',
      customReason: '',
      note: student.leave_note || ''
    });
  };

  const handleSaveLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveModalStudent) return;
    const finalReason = leaveFormData.reason === 'Lainnya' && leaveFormData.customReason.trim()
      ? leaveFormData.customReason.trim()
      : leaveFormData.reason;

    const next = students.map(s => {
      if (s.id === leaveModalStudent.id) {
        return {
          ...s,
          status: 'CUTI' as const,
          leave_start_date: leaveFormData.startDate,
          leave_end_date: leaveFormData.endDate,
          leave_reason: finalReason,
          leave_note: leaveFormData.note,
          leave_recorded_at: new Date().toISOString()
        };
      }
      return s;
    });

    onUpdate(next);
    setLeaveModalStudent(null);
  };

  const handleReactivateStudent = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const todayStr = new Date().toLocaleDateString('id-ID');
    const next = students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          status: 'ACTIVE' as const,
          notes: s.notes ? `${s.notes} (Selesai cuti: ${todayStr})` : `Selesai cuti: ${todayStr}`
        };
      }
      return s;
    });

    onUpdate(next);
    if (leaveModalStudent?.id === studentId) {
      setLeaveModalStudent(null);
    }
  };

  const handleBulkSetLeave = () => {
    if (selectedStudentIds.length === 0) return;
    const next = students.map(s => {
      if (selectedStudentIds.includes(s.id)) {
        return {
          ...s,
          status: 'CUTI' as const,
          leave_start_date: bulkLeaveData.startDate,
          leave_end_date: bulkLeaveData.endDate,
          leave_reason: bulkLeaveData.reason,
          leave_note: bulkLeaveData.note,
          leave_recorded_at: new Date().toISOString()
        };
      }
      return s;
    });
    onUpdate(next);
    setSelectedStudentIds([]);
    setIsBulkLeaveModalOpen(false);
  };

  const handleBulkReactivate = () => {
    if (selectedStudentIds.length === 0) return;
    const todayStr = new Date().toLocaleDateString('id-ID');
    const next = students.map(s => {
      if (selectedStudentIds.includes(s.id)) {
        return {
          ...s,
          status: 'ACTIVE' as const,
          notes: s.notes ? `${s.notes} (Selesai cuti: ${todayStr})` : `Selesai cuti: ${todayStr}`
        };
      }
      return s;
    });
    onUpdate(next);
    setSelectedStudentIds([]);
  };

  const handleSendWaLeaveConfirmation = (student: Student) => {
    if (!student.wa) return;
    const phone = student.wa.replace(/\D/g, '').replace(/^0/, '62');
    const msg = `Halo Ayah/Bunda dari ananda *${student.name}*,%0A%0AKami dari Manajemen *Worth It Course (WIC)* mengonfirmasi permohonan status cuti belajar ananda:%0A• *Periode Cuti:* ${student.leave_start_date || '-'} s.d ${student.leave_end_date || 'Konfirmasi Lanjutan'}%0A• *Alasan Cuti:* ${student.leave_reason || '-'}%0A• *Program:* ${student.level}${student.level2 ? ` & ${student.level2}` : ''}%0A%0ASemoga urusan ananda dilancarkan dan kami nantikan kehadiran ananda kembali belajar bersama keluarga besar WIC.%0A%0ATerima kasih banyak. 🙏`;
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const filtered = students.filter(s => {
    // Filter Status Keaktifan
    if (statusFilter === 'ACTIVE' && s.status === 'CUTI') return false;
    if (statusFilter === 'CUTI' && s.status !== 'CUTI') return false;

    // Filter Level Program
    let matchesLevel = true;
    if (filter === 'ALL') {
      matchesLevel = true;
    } else if (filter === 'DUAL') {
      matchesLevel = Boolean(s.is_dual_program || s.level2);
    } else {
      matchesLevel = s.level === filter || s.level2 === filter;
    }

    const term = searchTerm.toLowerCase().trim();
    if (!term) return matchesLevel;

    const matchesSearch = 
      s.name.toLowerCase().includes(term) || 
      s.id.toLowerCase().includes(term) ||
      Boolean(s.nickname && s.nickname.toLowerCase().includes(term)) ||
      Boolean(s.wa && s.wa.includes(term)) ||
      Boolean(s.school && s.school.toLowerCase().includes(term)) ||
      Boolean(s.parent_name && s.parent_name.toLowerCase().includes(term)) ||
      Boolean(s.grade && s.grade.toLowerCase().includes(term)) ||
      Boolean(s.address && s.address.toLowerCase().includes(term)) ||
      Boolean(s.leave_reason && s.leave_reason.toLowerCase().includes(term)) ||
      Boolean(s.leave_note && s.leave_note.toLowerCase().includes(term));

    return matchesLevel && matchesSearch;
  });

  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedStudents = pageSize === -1 
    ? filtered 
    : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSyncGoogleFormData = () => {
    const merged = mergeNewImportedStudents(students, INITIAL_IMPORTED_STUDENTS);
    if (merged.changed) {
      onUpdate(merged.students);
    }
  };

  const handleUpdateField = (id: string, field: keyof Student, value: any) => {
    const next = students.map(s => {
      if (s.id === id) {
        const updated = { ...s, [field]: value };
        if (field === 'prog2_hari1') updated.hari_prog2 = value;
        if (field === 'prog2_shift1') updated.shift_prog2 = value;
        if (field === 'hari1' || field === 'hari2') {
          updated.schedule_days = [updated.hari1, updated.hari2].filter(Boolean).join(' & ') || updated.hari1 || '';
        }
        if (field === 'shift1') {
          updated.schedule_shift = value;
        }
        return updated;
      }
      return s;
    });
    onUpdate(next);
  };

  const handleToggleDualProgram = (id: string) => {
    const student = students.find(s => s.id === id);
    if (!student) return;
    const isNowDual = !student.is_dual_program;
    const next = students.map(s => {
      if (s.id === id) {
        return {
          ...s,
          is_dual_program: isNowDual,
          level2: isNowDual ? (s.level2 || 'Tahsin & Tahfidz') : undefined,
          prog2_hari1: isNowDual ? (s.prog2_hari1 || s.hari_prog2 || 'Rabu') : undefined,
          prog2_shift1: isNowDual ? (s.prog2_shift1 || s.shift_prog2 || WIC_SHIFTS[0]) : undefined,
          prog2_hari2: isNowDual ? (s.prog2_hari2 || 'Jumat') : undefined,
          prog2_shift2: isNowDual ? (s.prog2_shift2 || WIC_SHIFTS[0]) : undefined,
          hari_prog2: isNowDual ? (s.prog2_hari1 || s.hari_prog2 || 'Rabu') : undefined,
          shift_prog2: isNowDual ? (s.prog2_shift1 || s.shift_prog2 || WIC_SHIFTS[0]) : undefined
        };
      }
      return s;
    });
    onUpdate(next);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { students: mergedStudents, added, updated } = await importStudentsFromFile(file, students);
      onUpdate(mergedStudents);
      if (showToast) {
        showToast(`Import Database Siswa & Shift berhasil! (+${added} siswa baru, ${updated} jadwal/profil diperbarui)`, 'success');
      }
    } catch (err: any) {
      if (showToast) {
        showToast(err?.message || 'Gagal mengimpor file database siswa (CSV/JSON).', 'error');
      }
    } finally {
      e.target.value = '';
    }
  };

  const handleDownloadCSVTemplate = () => {
    const templateRows = [
      {
        'Nama Lengkap': 'Muhammad Rayhan Pratama',
        'Nama Panggilan': 'Rayhan',
        'Status': 'AKTIF',
        'Pilihan Program': 'Kids',
        'Program 2 (Opsional)': 'Tahsin & Tahfidz',
        'No WA': '081234567890',
        'Nama Wali': 'Hendra Pratama',
        'Asal Sekolah': 'SD Al-Azhar 57 Jambi',
        'Kelas': 'Kelas 3',
        'Alamat': 'Perumahan CitraRaya City Jambi',
        'Hari 1': 'Selasa',
        'Shift 1': '16.15 – 17.45',
        'Hari 2': 'Kamis',
        'Shift 2': '16.15 – 17.45',
        'Tgl Mulai Cuti': '',
        'Tgl Selesai Cuti': '',
        'Alasan Cuti': '',
        'Catatan': 'Peminatan Active Speaking'
      },
      {
        'Nama Lengkap': 'Farel Aditya Rahman',
        'Nama Panggilan': 'Farel',
        'Status': 'CUTI',
        'Pilihan Program': 'Teenager',
        'Program 2 (Opsional)': '',
        'No WA': '081399887766',
        'Nama Wali': 'Bambang Rahman',
        'Asal Sekolah': 'SMPN 1 Kota Jambi',
        'Kelas': 'Kelas 8',
        'Alamat': 'Telanaipura Jambi',
        'Hari 1': 'Rabu',
        'Shift 1': '14.30 – 16.00',
        'Hari 2': 'Jumat',
        'Shift 2': '14.30 – 16.00',
        'Tgl Mulai Cuti': '2026-11-01',
        'Tgl Selesai Cuti': '2026-11-20',
        'Alasan Cuti': 'Ujian Sekolah (PTS)',
        'Catatan': 'Izin cuti 3 minggu selama ujian tengah semester'
      }
    ];

    const csvContent = Papa.unparse(templateRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Template_Data_Siswa_WIC.csv`;
    link.click();
  };

  const handleExportCSV = () => {
    exportStudentsCSV(students);
    if (showToast) showToast('Database Siswa & Jadwal Shift (CSV) berhasil diekspor!', 'info');
  };

  const handleExportJSON = () => {
    exportStudentsJSON(students);
    if (showToast) showToast('Database Siswa & Jadwal Shift (JSON) berhasil diekspor!', 'info');
  };

  const handleExportPNG = async () => {
    const element = document.getElementById('student-table-capture');
    if (element) {
      const dataUrl = await domToPng(element, { scale: 2 });
      const link = document.createElement('a');
      link.download = `Students-${filter}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentData.name) return;

    const isDual = Boolean(newStudentData.is_dual_program);
    const trimmedName = newStudentData.name.trim();
    const trimmedNick = newStudentData.nickname?.trim();
    const finalNickname = trimmedNick || (trimmedName ? trimmedName.split(' ')[0] : undefined);

    const newStudent: Student = {
      id: 'WIC-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      name: trimmedName,
      nickname: finalNickname,
      level: newStudentData.level || 'Kids',
      level2: isDual ? (newStudentData.level2 || 'Tahsin & Tahfidz') : undefined,
      is_dual_program: isDual,
      hari1: newStudentData.hari1 || 'Selasa',
      shift1: newStudentData.shift1 || WIC_SHIFTS[0],
      hari2: newStudentData.hari2 || 'Kamis',
      shift2: newStudentData.shift2 || WIC_SHIFTS[0],
      prog2_hari1: isDual ? (newStudentData.prog2_hari1 || 'Rabu') : undefined,
      prog2_shift1: isDual ? (newStudentData.prog2_shift1 || WIC_SHIFTS[0]) : undefined,
      prog2_hari2: isDual ? (newStudentData.prog2_hari2 || 'Jumat') : undefined,
      prog2_shift2: isDual ? (newStudentData.prog2_shift2 || WIC_SHIFTS[0]) : undefined,
      hari_prog2: isDual ? (newStudentData.prog2_hari1 || 'Rabu') : undefined,
      shift_prog2: isDual ? (newStudentData.prog2_shift1 || WIC_SHIFTS[0]) : undefined,
      notes: newStudentData.notes || ''
    };

    onUpdate([...students, newStudent]);
    setIsAddModalOpen(false);
    setNewStudentData({
      name: '',
      nickname: '',
      level: 'Kids',
      is_dual_program: false,
      level2: 'Tahsin & Tahfidz',
      hari1: 'Selasa',
      shift1: WIC_SHIFTS[0],
      hari2: 'Kamis',
      shift2: WIC_SHIFTS[0],
      prog2_hari1: 'Rabu',
      prog2_shift1: WIC_SHIFTS[0],
      prog2_hari2: 'Jumat',
      prog2_shift2: WIC_SHIFTS[0],
      notes: ''
    });
  };

  const handleSaveEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const isDual = Boolean(editingStudent.is_dual_program);
    const trimmedName = editingStudent.name.trim();
    const trimmedNick = editingStudent.nickname?.trim();

    const updated: Student = {
      ...editingStudent,
      name: trimmedName,
      nickname: trimmedNick ? trimmedNick : (trimmedName ? trimmedName.split(' ')[0] : undefined),
      level2: isDual ? (editingStudent.level2 || 'Tahsin & Tahfidz') : undefined,
      is_dual_program: isDual,
      schedule_days: [editingStudent.hari1, editingStudent.hari2].filter(Boolean).join(' & ') || editingStudent.hari1 || editingStudent.schedule_days || '',
      schedule_shift: editingStudent.shift1 || editingStudent.schedule_shift || '',
      prog2_hari1: isDual ? (editingStudent.prog2_hari1 || 'Rabu') : undefined,
      prog2_shift1: isDual ? (editingStudent.prog2_shift1 || WIC_SHIFTS[0]) : undefined,
      prog2_hari2: isDual ? (editingStudent.prog2_hari2 || 'Jumat') : undefined,
      prog2_shift2: isDual ? (editingStudent.prog2_shift2 || WIC_SHIFTS[0]) : undefined,
      hari_prog2: isDual ? (editingStudent.prog2_hari1 || 'Rabu') : undefined,
      shift_prog2: isDual ? (editingStudent.prog2_shift1 || WIC_SHIFTS[0]) : undefined
    };

    onUpdate(students.map(s => s.id === updated.id ? updated : s));
    setEditingStudent(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingStudent) return;
    onUpdate(students.filter(s => s.id !== deletingStudent.id));
    setDeletingStudent(null);
  };

  const toggleSelectAll = () => {
    const visibleIds = filtered.map(s => s.id);
    const allSelected = visibleIds.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteStudents = () => {
    if (selectedStudentIds.length === 0) return;
    onUpdate(students.filter(s => !selectedStudentIds.includes(s.id)));
    setSelectedStudentIds([]);
    setIsBulkDeleteModalOpen(false);
  };

  const allAvailablePrograms = WIC_PROGRAM_CATEGORIES;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Sub-Tabs Navigation: Direktori Utama vs Rekapitulasi Siswa Cuti */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setViewMode('DIRECTORY');
              setStatusFilter('ALL');
            }}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2",
              viewMode === 'DIRECTORY'
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Users size={14} className={viewMode === 'DIRECTORY' ? "text-emerald-700" : "text-slate-400"} />
            <span>Direktori Siswa & Jadwal</span>
            <span className="text-[10px] font-mono font-bold text-slate-400">({totalStudents})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('LEAVE_RECAP')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2",
              viewMode === 'LEAVE_RECAP'
                ? "bg-amber-600 text-white shadow-xs font-black"
                : "text-amber-800 hover:text-amber-950"
            )}
          >
            <CalendarOff size={14} className={viewMode === 'LEAVE_RECAP' ? "text-white" : "text-amber-600"} />
            <span>Rekapitulasi Siswa Cuti</span>
            <span className={cn(
              "text-[10px] font-mono px-2 py-0.5 rounded-full font-bold",
              viewMode === 'LEAVE_RECAP' ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-900"
            )}>
              {cutiCount} Cuti
            </span>
          </button>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex items-center gap-2">
          {cutiCount > 0 && viewMode === 'DIRECTORY' && (
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'CUTI' ? 'ALL' : 'CUTI')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition flex items-center gap-1.5 border cursor-pointer",
                statusFilter === 'CUTI'
                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                  : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
              )}
            >
              <CalendarOff size={12} />
              <span>{statusFilter === 'CUTI' ? 'Tampilkan Semua Status' : `Filter Hanya Cuti (${cutiCount})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Metrics Strip (4 Kartu Lengkap: Total, Aktif, Cuti, Dual) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Siswa */}
        <div 
          onClick={() => {
            setViewMode('DIRECTORY');
            setStatusFilter('ALL');
          }}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-300 transition"
        >
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Siswa Terdaftar</p>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">{totalStudents}</h3>
            <p className="text-[9px] text-slate-500 font-bold mt-0.5">Semua Kategori & Level</p>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        {/* Siswa Aktif Belajar */}
        <div 
          onClick={() => {
            setViewMode('DIRECTORY');
            setStatusFilter('ACTIVE');
          }}
          className={cn(
            "bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition",
            statusFilter === 'ACTIVE' ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200 hover:border-emerald-300"
          )}
        >
          <div>
            <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Siswa Aktif Belajar</p>
            <h3 className="text-2xl font-black text-emerald-950 mt-0.5">{activeStudentsCount}</h3>
            <p className="text-[9px] text-emerald-700 font-bold mt-0.5">Jadwal & absensi aktif</p>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
            <UserCheck size={20} />
          </div>
        </div>

        {/* Siswa Sedang Cuti */}
        <div 
          onClick={() => {
            setViewMode('LEAVE_RECAP');
          }}
          className={cn(
            "bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition",
            viewMode === 'LEAVE_RECAP' || statusFilter === 'CUTI' 
              ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30" 
              : "border-slate-200 hover:border-amber-300"
          )}
        >
          <div>
            <p className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Siswa Sedang Cuti</p>
            <h3 className="text-2xl font-black text-amber-950 mt-0.5">{cutiCount}</h3>
            <p className="text-[9px] text-amber-700 font-bold mt-0.5">
              {cutiCount > 0 ? "Disisihkan dari absen alpha" : "Tidak ada siswa cuti"}
            </p>
          </div>
          <div className="w-11 h-11 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center">
            <CalendarOff size={20} />
          </div>
        </div>

        {/* Siswa 2 Program (Dual) */}
        <div 
          onClick={() => {
            setViewMode('DIRECTORY');
            setFilter(filter === 'DUAL' ? 'ALL' : 'DUAL');
          }}
          className={cn(
            "bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition",
            filter === 'DUAL' ? "border-purple-500 ring-2 ring-purple-500/20" : "border-slate-200 hover:border-purple-300"
          )}
        >
          <div>
            <p className="text-[10px] font-black uppercase text-purple-600 tracking-wider">Siswa 2 Program (Dual)</p>
            <h3 className="text-2xl font-black text-purple-950 mt-0.5">{dualProgramCount}</h3>
            <p className="text-[9px] text-purple-700 font-bold mt-0.5">Tiap Program: 2 Jadwal / Minggu</p>
          </div>
          <div className="w-11 h-11 bg-purple-50 text-purple-700 rounded-xl flex items-center justify-center">
            <Layers size={20} />
          </div>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar */}
      {selectedStudentIds.length > 0 && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="text-xs font-black uppercase tracking-wider">
              {selectedStudentIds.length} Siswa Dipilih
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkLeaveModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarOff size={13} />
              <span>Set Cuti Massal</span>
            </button>

            <button
              type="button"
              onClick={handleBulkReactivate}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck size={13} />
              <span>Aktifkan Massal</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="bg-red-600 hover:bg-red-500 text-white px-3.5 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Hapus Siswa</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] transition cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 w-full">
          <div className="relative flex-1 min-w-[220px]">
             <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input 
                type="text" 
                placeholder="Cari Nama / Panggilan / No. WA / Sekolah / Alasan Cuti..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
             />
          </div>

          {/* Filter Status Keaktifan (Semua / Aktif / Cuti) */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className={cn(
              "border rounded-2xl px-3.5 py-2.5 text-xs font-black uppercase outline-none cursor-pointer focus:bg-white",
              statusFilter === 'CUTI' 
                ? "bg-amber-50 border-amber-300 text-amber-900" 
                : statusFilter === 'ACTIVE'
                  ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                  : "bg-slate-50 border-slate-200 text-slate-700"
            )}
          >
            <option value="ALL">Status: Semua ({students.length})</option>
            <option value="ACTIVE">✓ Status: Siswa Aktif ({activeStudentsCount})</option>
            <option value="CUTI">⏸ Status: Sedang Cuti ({cutiCount})</option>
          </select>

          {/* Filter Level / Program */}
          <select 
            value={filter} 
            onChange={(e) => {
              setFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-black uppercase text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-emerald-500"
          >
            <option value="ALL">Semua Program ({students.length})</option>
            <option value="DUAL">⚡ Khusus 2 Program ({dualProgramCount})</option>
            {allAvailablePrograms.map(p => (
              <option key={p} value={p}>Program: {p}</option>
            ))}
          </select>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:bg-white"
            title="Jumlah data per halaman"
          >
            <option value={25}>25 / hal</option>
            <option value={50}>50 / hal</option>
            <option value={100}>100 / hal</option>
            <option value={-1}>Semua ({filtered.length})</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            type="button"
            onClick={handleSyncGoogleFormData}
            className="bg-emerald-800 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            title="Sinkronkan data dengan 222 respons formulir Google Form pendaftaran resmi"
          >
            <RefreshCw size={13} className="text-emerald-200" /> Sinkron Data Form (222)
          </button>
          <button
            type="button"
            onClick={() => setShowFormatModal(true)}
            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-3.5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            title="Lihat & unduh contoh format CSV/JSON Database Siswa & Shift Masuk"
          >
            <BookOpen size={13} className="text-amber-700" /> Contoh Format
          </button>
          <label
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 px-3.5 py-2.5 rounded-xl font-black uppercase text-[10px] transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Impor Database Siswa & Jadwal Shift dari CSV atau JSON (otomatis merge sesuai ID/Nama)"
          >
            <Upload size={14} className="text-emerald-700" /> Import CSV/JSON
            <input type="file" className="hidden" accept=".csv,.json,text/csv,application/json" onChange={handleImport} />
          </label>
          <button 
            type="button"
            onClick={handleExportCSV} 
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold uppercase text-[10px] transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Ekspor Database Siswa beserta Shift Masuk yang sudah diedit ke CSV"
          >
            <FileSpreadsheet size={14} className="text-emerald-700" /> Export CSV
          </button>
          <button 
            type="button"
            onClick={handleExportJSON} 
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold uppercase text-[10px] transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Ekspor Database Siswa beserta Shift Masuk yang sudah diedit ke JSON"
          >
            <FileJson size={14} className="text-blue-700" /> Export JSON
          </button>
          <button 
            onClick={handleExportPNG} 
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3.5 py-2.5 rounded-xl font-bold uppercase text-[10px] transition border border-emerald-200 flex items-center gap-1.5"
          >
            <ImageIcon size={15} /> PNG
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)} 
            className="bg-emerald-950 hover:bg-emerald-900 text-gold-400 px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <Plus size={15} /> Tambah Siswa Baru
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div id="student-table-capture" className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 md:p-8">
        <div className="hidden peer-print:flex items-center gap-6 border-b-4 border-emerald-900 pb-6 mb-8">
            <img 
              src={logoUrl || WIC_ASSETS.LOGO} 
              className="h-16 object-contain" 
              alt="WIC Logo" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = WIC_ASSETS.LOGO_FALLBACK_URL;
              }}
            />
            <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase">Worth It Course</h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                  Database Siswa Resmi • Model 2 Program (Tiap Program 2 Jadwal/Minggu) • Filter: {filter}
                </p>
            </div>
        </div>

        {viewMode === 'DIRECTORY' ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap min-w-[1350px]">
                 <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                       <th className="px-4 py-4 w-10 text-center">
                         <input 
                           type="checkbox" 
                           checked={paginatedStudents.length > 0 && paginatedStudents.every(s => selectedStudentIds.includes(s.id))}
                           onChange={toggleSelectAll}
                           className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                           title="Pilih semua siswa di halaman ini"
                         />
                       </th>
                       <th className="px-4 py-4 w-24">ID Siswa</th>
                       <th className="px-5 py-4 min-w-[280px]">Nama Siswa, Status & Kontak</th>
                       <th className="px-5 py-4 min-w-[240px]">Kategori Program (1 & 2)</th>
                       <th className="px-5 py-4 min-w-[160px]">Prog 1: Sesi 1</th>
                       <th className="px-5 py-4 min-w-[160px]">Prog 1: Sesi 2</th>
                       <th className="px-5 py-4 min-w-[160px]">Prog 2: Sesi 1</th>
                       <th className="px-5 py-4 min-w-[160px]">Prog 2: Sesi 2</th>
                       <th className="px-5 py-4 text-center w-36 no-print">Aksi & Cuti</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 text-xs">
                    {paginatedStudents.map(s => {
                       const isDual = Boolean(s.is_dual_program || s.level2);
                       const isSelected = selectedStudentIds.includes(s.id);
                       const isCuti = s.status === 'CUTI';
                       const daysRemaining = isCuti ? calculateDaysRemaining(s.leave_end_date) : null;

                       return (
                         <tr 
                           key={s.id} 
                           className={cn(
                             "transition group",
                             isSelected ? "bg-emerald-50/50" : isCuti ? "bg-amber-50/25 hover:bg-amber-50/60" : "hover:bg-slate-50/80"
                           )}
                         >
                            {/* Checkbox */}
                            <td className="px-4 py-3.5 text-center">
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => toggleSelectOne(s.id, e as any)}
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>

                            {/* ID Siswa */}
                            <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-400">
                              #{s.id}
                            </td>

                            {/* Nama Siswa, Status & Kontak */}
                            <td className="px-5 py-3.5">
                               <div className="flex items-center gap-2 flex-wrap">
                                 <input 
                                    type="text" 
                                    value={s.name} 
                                    onChange={(e) => handleUpdateField(s.id, 'name', e.target.value)}
                                    className="bg-transparent border-b border-transparent focus:border-emerald-500 outline-none font-black text-xs uppercase text-slate-800 py-0.5 min-w-[130px]"
                                    placeholder="Nama Siswa..."
                                    title="Klik untuk langsung ubah nama lengkap siswa"
                                 />
                                 <div 
                                   className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md px-1.5 py-0.5 text-amber-900 shadow-2xs transition"
                                   title="Edit nama panggilan (otomatis dipakai untuk absensi presensi di jurnal tutor)"
                                 >
                                   <span className="text-[8px] font-bold text-amber-700 uppercase tracking-tight shrink-0">Pgl:</span>
                                   <input 
                                     type="text" 
                                     value={s.nickname || ''} 
                                     onChange={(e) => handleUpdateField(s.id, 'nickname', e.target.value)}
                                     placeholder="+ panggilan"
                                     className="w-18 bg-transparent text-[10px] font-black uppercase text-amber-950 outline-none placeholder:text-amber-400 placeholder:normal-case placeholder:font-normal focus:w-28 focus:bg-white focus:px-1 rounded transition-all"
                                   />
                                 </div>
                               </div>

                               {/* Indikator Status Siswa Cuti vs Aktif */}
                               {isCuti ? (
                                 <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                   <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-md shadow-2xs">
                                     <CalendarOff size={10} className="text-amber-700" />
                                     <span>Sedang Cuti</span>
                                     {s.leave_end_date && <span>s.d {s.leave_end_date}</span>}
                                   </span>
                                   {daysRemaining !== null && (
                                     <span className={cn(
                                       "text-[8px] font-bold px-1.5 py-0.2 rounded border",
                                       daysRemaining < 0 
                                         ? "bg-red-50 text-red-700 border-red-200" 
                                         : daysRemaining === 0 
                                           ? "bg-emerald-50 text-emerald-800 border-emerald-300" 
                                           : "bg-amber-50 text-amber-800 border-amber-200"
                                     )}>
                                       {daysRemaining < 0 
                                         ? `Lewat ${Math.abs(daysRemaining)}h` 
                                         : daysRemaining === 0 
                                           ? 'Hari ini masuk' 
                                           : `Sisa ${daysRemaining}h`}
                                     </span>
                                   )}
                                   {s.leave_reason && (
                                     <span className="text-[9px] font-semibold text-slate-500 italic truncate max-w-[170px]" title={s.leave_reason}>
                                       "{s.leave_reason}"
                                     </span>
                                   )}
                                 </div>
                               ) : isDual ? (
                                 <div className="flex items-center gap-1.5 mt-1">
                                   <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                                     <Sparkles size={9} /> 2 Program: {s.level} + {s.level2}
                                   </span>
                                 </div>
                               ) : (
                                 <div className="flex items-center gap-1 mt-0.5">
                                   <span className="text-[8px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                     Aktif Belajar
                                   </span>
                                 </div>
                               )}

                               <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                 {s.wa && (
                                   <a 
                                     href={`https://wa.me/${s.wa.replace(/^0/, '62')}`} 
                                     target="_blank" 
                                     rel="noopener noreferrer" 
                                     className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full transition"
                                     title="Klik untuk Hubungi via WhatsApp"
                                   >
                                     <MessageCircle size={10} className="text-emerald-600" />
                                     <span>{s.wa}</span>
                                   </a>
                                 )}
                                 {s.school && (
                                   <span className="inline-flex items-center gap-1 text-[9px] text-slate-500 font-medium bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full max-w-[210px] truncate" title={`${s.school} ${s.grade ? `(${s.grade})` : ''}`}>
                                     <School size={10} className="text-slate-400 shrink-0" />
                                     <span className="truncate">{s.school}</span>
                                     {s.grade && <span className="text-slate-400 font-bold shrink-0">({s.grade})</span>}
                                   </span>
                                 )}
                               </div>
                            </td>

                            {/* Program & Dual Program Selection */}
                            <td className="px-5 py-3.5">
                              <div className="space-y-1.5">
                                {/* Program 1 */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 w-14 text-center shrink-0">
                                    Prog 1
                                  </span>
                                  <select 
                                     value={s.level} 
                                     onChange={(e) => handleUpdateField(s.id, 'level', e.target.value)}
                                     className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold uppercase text-emerald-900 cursor-pointer outline-none focus:border-emerald-500 w-full"
                                  >
                                     {allAvailablePrograms.map(l => (
                                       <option key={l} value={l}>{l}</option>
                                     ))}
                                  </select>
                                </div>

                                {/* Program 2 (Dual Program) */}
                                {isDual ? (
                                  <div className="flex items-center gap-1.5 animate-in fade-in">
                                    <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 w-14 text-center shrink-0">
                                      Prog 2
                                    </span>
                                    <select 
                                       value={s.level2 || 'Tahsin & Tahfidz'} 
                                       onChange={(e) => handleUpdateField(s.id, 'level2', e.target.value)}
                                       className="bg-purple-50 border border-purple-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase text-purple-900 cursor-pointer outline-none focus:border-purple-500 w-full"
                                    >
                                       {allAvailablePrograms.map(l => (
                                         <option key={l} value={l}>{l}</option>
                                       ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleDualProgram(s.id)}
                                      className="text-red-400 hover:text-red-600 text-[11px] font-bold px-1.5 hover:bg-red-50 rounded shrink-0 cursor-pointer"
                                      title="Batalkan Program 2"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDualProgram(s.id)}
                                    className="text-[9px] font-black text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <Plus size={11} /> Tambah Program 2 (Tahsin & Tahfidz)
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Jadwal Sesi 1 (Program 1) */}
                            <td className="px-5 py-3.5">
                              <div className="flex gap-1.5">
                                 <select 
                                   value={s.hari1} 
                                   onChange={(e) => handleUpdateField(s.id, 'hari1', e.target.value)} 
                                   className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] uppercase font-bold text-slate-700 outline-none"
                                 >
                                    <option value="">- Hari -</option>
                                    {WIC_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                 </select>
                                 <select 
                                   value={s.shift1} 
                                   onChange={(e) => handleUpdateField(s.id, 'shift1', e.target.value)} 
                                   className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] uppercase font-bold text-slate-700 outline-none"
                                 >
                                    <option value="">- Shift -</option>
                                    {WIC_SHIFTS.map(sh => <option key={sh} value={sh}>{sh}</option>)}
                                 </select>
                              </div>
                            </td>

                            {/* Jadwal Sesi 2 (Program 1) */}
                            <td className="px-5 py-3.5">
                              <div className="flex gap-1.5">
                                 <select 
                                   value={s.hari2} 
                                   onChange={(e) => handleUpdateField(s.id, 'hari2', e.target.value)} 
                                   className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] uppercase font-bold text-slate-700 outline-none"
                                 >
                                    <option value="">- Hari -</option>
                                    {WIC_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                 </select>
                                 <select 
                                   value={s.shift2} 
                                   onChange={(e) => handleUpdateField(s.id, 'shift2', e.target.value)} 
                                   className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] uppercase font-bold text-slate-700 outline-none"
                                 >
                                    <option value="">- Shift -</option>
                                    {WIC_SHIFTS.map(sh => <option key={sh} value={sh}>{sh}</option>)}
                                 </select>
                              </div>
                            </td>

                            {/* Jadwal Sesi 1 (Program 2 - Dual) */}
                            <td className="px-5 py-3.5">
                              {isDual ? (
                                <div className="flex gap-1.5 bg-purple-50/70 p-1 rounded-lg border border-purple-200">
                                   <select 
                                     value={s.prog2_hari1 || s.hari_prog2 || 'Rabu'} 
                                     onChange={(e) => handleUpdateField(s.id, 'prog2_hari1', e.target.value)} 
                                     className="p-1 bg-white border border-purple-200 rounded text-[9px] uppercase font-bold text-purple-900 outline-none"
                                   >
                                      {WIC_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                   </select>
                                   <select 
                                     value={s.prog2_shift1 || s.shift_prog2 || WIC_SHIFTS[0]} 
                                     onChange={(e) => handleUpdateField(s.id, 'prog2_shift1', e.target.value)} 
                                     className="p-1 bg-white border border-purple-200 rounded text-[9px] uppercase font-bold text-purple-900 outline-none"
                                   >
                                      {WIC_SHIFTS.map(sh => <option key={sh} value={sh}>{sh}</option>)}
                                   </select>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300 font-mono italic">
                                  - Bukan Dual -
                                </span>
                              )}
                            </td>

                            {/* Jadwal Sesi 2 (Program 2 - Dual) */}
                            <td className="px-5 py-3.5">
                              {isDual ? (
                                <div className="flex gap-1.5 bg-purple-50/70 p-1 rounded-lg border border-purple-200">
                                   <select 
                                     value={s.prog2_hari2 || 'Jumat'} 
                                     onChange={(e) => handleUpdateField(s.id, 'prog2_hari2', e.target.value)} 
                                     className="p-1 bg-white border border-purple-200 rounded text-[9px] uppercase font-bold text-purple-900 outline-none"
                                   >
                                      {WIC_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                   </select>
                                   <select 
                                     value={s.prog2_shift2 || WIC_SHIFTS[0]} 
                                     onChange={(e) => handleUpdateField(s.id, 'prog2_shift2', e.target.value)} 
                                     className="p-1 bg-white border border-purple-200 rounded text-[9px] uppercase font-bold text-purple-900 outline-none"
                                   >
                                      {WIC_SHIFTS.map(sh => <option key={sh} value={sh}>{sh}</option>)}
                                   </select>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300 font-mono italic">
                                  - Bukan Dual -
                                </span>
                              )}
                            </td>

                            {/* Aksi, Cuti & Edit Lengkap */}
                            <td className="px-5 py-3.5 text-center no-print">
                               <div className="flex items-center justify-center gap-1">
                                 {/* Tombol Kelola / Catat Cuti */}
                                 <button 
                                   type="button"
                                   onClick={() => handleOpenLeaveModal(s)} 
                                   className={cn(
                                     "p-2 rounded-xl transition border cursor-pointer",
                                     isCuti 
                                       ? "text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300 shadow-2xs font-bold" 
                                       : "text-slate-400 hover:text-amber-700 hover:bg-amber-50 border-transparent hover:border-amber-200"
                                   )}
                                   title={isCuti ? "Kelola / Ubah Periode Cuti" : "Catat Cuti Siswa Ini"}
                                 >
                                    <CalendarOff size={15} />
                                 </button>

                                 {/* Tombol Aktifkan Kembali jika Sedang Cuti */}
                                 {isCuti && (
                                   <button
                                     type="button"
                                     onClick={() => handleReactivateStudent(s.id)}
                                     className="p-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition border border-emerald-200 cursor-pointer"
                                     title="Selesaikan Cuti & Aktifkan Kembali Siswa Ini"
                                   >
                                     <UserCheck size={15} />
                                   </button>
                                 )}

                                 <button 
                                   type="button"
                                   onClick={() => setSelectedStudentDetail(s)} 
                                   className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition border border-transparent hover:border-emerald-200 cursor-pointer"
                                   title="Lihat Detail Profil & Formulir Registrasi"
                                 >
                                    <Eye size={15} />
                                 </button>
                                 <button 
                                   type="button"
                                   onClick={() => setEditingStudent({ ...s })} 
                                   className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition border border-transparent hover:border-emerald-200 cursor-pointer"
                                   title="Edit Data Siswa Lengkap"
                                 >
                                    <Edit3 size={15} />
                                 </button>
                                 <button 
                                   type="button"
                                   onClick={() => setDeletingStudent(s)} 
                                   className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition border border-transparent hover:border-red-200 cursor-pointer"
                                   title="Hapus Siswa Permanen"
                                 >
                                    <Trash2 size={15} />
                                 </button>
                               </div>
                            </td>
                         </tr>
                       );
                    })}
                 </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase">
                  Tidak ada data siswa ditemukan dengan filter yang dipilih
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {filtered.length > 0 && pageSize !== -1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 mt-4 border-t border-slate-100 text-xs text-slate-500">
                <div className="font-bold">
                  Menampilkan <span className="text-slate-800 font-black">{Math.min((currentPage - 1) * pageSize + 1, filtered.length)}</span> - <span className="text-slate-800 font-black">{Math.min(currentPage * pageSize, filtered.length)}</span> dari <span className="text-emerald-800 font-black">{filtered.length}</span> siswa terdaftar
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <ChevronLeft size={14} /> Sebelumnya
                  </button>

                  <span className="px-3.5 py-1.5 text-xs font-black text-slate-800 bg-slate-50 rounded-xl border border-slate-200">
                    Halaman {currentPage} dari {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    Selanjutnya <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Dedicated View: Rekapitulasi Siswa Cuti */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <CalendarOff size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-amber-950">Rekapitulasi & Monitoring Siswa Cuti</h3>
                  <p className="text-[11px] text-amber-800 font-medium">
                    Total {cutiCount} siswa tercatat sedang cuti. Siswa cuti disisihkan dari absensi harian tutor tanpa dicatat sebagai alpha.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={quickAddLeaveStudentId}
                  onChange={e => {
                    const sid = e.target.value;
                    setQuickAddLeaveStudentId('');
                    const found = students.find(s => s.id === sid);
                    if (found) handleOpenLeaveModal(found);
                  }}
                  className="bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-amber-950 outline-none cursor-pointer shadow-2xs"
                >
                  <option value="">+ Catat Cuti Siswa Lain...</option>
                  {students.filter(s => s.status !== 'CUTI').map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.nickname || s.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {cutiStudents.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 p-8">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={28} />
                </div>
                <h4 className="text-sm font-black uppercase text-slate-800">Tidak Ada Siswa yang Sedang Cuti</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 font-medium">
                  Seluruh {totalStudents} siswa saat ini berstatus aktif belajar di kelas dan mengikuti jadwal kurikulum WIC reguler.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const firstActive = students.find(s => s.status !== 'CUTI');
                    if (firstActive) handleOpenLeaveModal(firstActive);
                  }}
                  className="mt-4 px-4 py-2 bg-emerald-950 text-gold-400 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-900 transition shadow-xs cursor-pointer"
                >
                  Catat Siswa Cuti Baru
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap min-w-[1000px]">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-4 w-24">ID Siswa</th>
                      <th className="px-5 py-4 min-w-[220px]">Nama Siswa & Sekolah</th>
                      <th className="px-5 py-4 min-w-[180px]">Program & Jadwal</th>
                      <th className="px-5 py-4 min-w-[210px]">Periode & Sisa Cuti</th>
                      <th className="px-5 py-4 min-w-[220px]">Alasan & Keterangan</th>
                      <th className="px-5 py-4 min-w-[160px]">Kontak Wali</th>
                      <th className="px-5 py-4 text-center w-40">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {cutiStudents.map(s => {
                      const daysLeft = calculateDaysRemaining(s.leave_end_date);
                      const isOverdue = daysLeft !== null && daysLeft < 0;
                      const isToday = daysLeft === 0;

                      return (
                        <tr key={s.id} className="hover:bg-amber-50/40 transition group">
                          <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-400">
                            #{s.id}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-black text-xs uppercase text-slate-800 flex items-center gap-1.5 flex-wrap">
                              <span>{s.name}</span>
                              <div 
                                className="inline-flex items-center gap-1 bg-amber-100/90 border border-amber-300 rounded px-1.5 py-0.5 text-amber-900 shadow-2xs"
                                title="Edit nama panggilan (dipakai di absensi jurnal tutor)"
                              >
                                <span className="text-[8px] font-bold text-amber-700 uppercase">Pgl:</span>
                                <input 
                                  type="text" 
                                  value={s.nickname || ''} 
                                  onChange={(e) => handleUpdateField(s.id, 'nickname', e.target.value)}
                                  placeholder="+ pgl"
                                  className="w-16 bg-transparent text-[9px] font-black uppercase text-amber-950 outline-none placeholder:text-amber-500 focus:w-24 focus:bg-white focus:px-1 rounded transition-all"
                                />
                              </div>
                            </div>
                            {s.school && (
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                {s.school} {s.grade ? `(${s.grade})` : ''}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-slate-800 uppercase text-xs">{s.level}</p>
                            {s.level2 && <p className="text-[10px] font-bold text-purple-700 uppercase">+ {s.level2}</p>}
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {s.hari1} {s.shift1} {s.hari2 ? `· ${s.hari2} ${s.shift2}` : ''}
                            </p>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-slate-800">
                                {s.leave_start_date || '-'} s.d {s.leave_end_date || 'Belum ditentukan'}
                              </span>
                              {daysLeft !== null ? (
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-md inline-block w-fit border",
                                  isOverdue 
                                    ? "bg-red-50 text-red-700 border-red-200" 
                                    : isToday 
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-black" 
                                      : "bg-amber-50 text-amber-800 border-amber-200"
                                )}>
                                  {isOverdue 
                                    ? `Jadwal kembali lewat (${Math.abs(daysLeft)} hari lalu)` 
                                    : isToday 
                                      ? "Rencana masuk kembali HARI INI" 
                                      : `Sisa masa cuti: ${daysLeft} hari lagi`}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Tanggal kembali fleksibel</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-black text-amber-950 text-xs">
                              {s.leave_reason || 'Izin Cuti'}
                            </p>
                            {s.leave_note && (
                              <p className="text-[10px] text-slate-500 mt-0.5 italic">
                                "{s.leave_note}"
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            {s.wa ? (
                              <button
                                type="button"
                                onClick={() => handleSendWaLeaveConfirmation(s)}
                                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-xl transition cursor-pointer"
                                title="Kirim konfirmasi / follow up via WhatsApp"
                              >
                                <MessageCircle size={12} className="text-emerald-600" />
                                <span>{s.wa}</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Tidak ada nomor</span>
                            )}
                            {s.parent_name && (
                              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                                Wali: {s.parent_name}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleReactivateStudent(s.id)}
                                className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Aktifkan kembali siswa ini ke kelas"
                              >
                                <UserCheck size={12} />
                                <span>Aktifkan</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenLeaveModal(s)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] transition cursor-pointer"
                                title="Ubah detail / perpanjang cuti"
                              >
                                <Edit3 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Tambah Siswa Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <GraduationCap size={20} />
                </span>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900">Pendaftaran Siswa Baru</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Mendukung 2 Program (Tiap Program 2 Jadwal/Minggu)</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Muhammad Rayhan" 
                    value={newStudentData.name || ''}
                    onChange={e => setNewStudentData({ ...newStudentData, name: e.target.value })}
                    className="input-premium py-2.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 flex items-center justify-between">
                    <span>Nama Panggilan (Nickname)</span>
                    <span className="text-[9px] text-amber-600 font-bold lowercase">untuk absensi jurnal</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Rayhan" 
                    value={newStudentData.nickname || ''}
                    onChange={e => setNewStudentData({ ...newStudentData, nickname: e.target.value })}
                    className="input-premium py-2.5 text-xs font-bold bg-amber-50/40 border-amber-200 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* SEKSI PROGRAM 1 (2 JADWAL PER MINGGU) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-emerald-950 flex items-center gap-1.5">
                    <BookOpen size={14} className="text-emerald-700" /> Program Utama (Program 1)
                  </h4>
                  <span className="text-[9px] font-bold text-slate-500 uppercase bg-white px-2 py-0.5 rounded border border-slate-200">
                    2 Jadwal / Minggu
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Pilihan Program *
                    </label>
                    <select 
                      value={newStudentData.level}
                      onChange={e => setNewStudentData({ ...newStudentData, level: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold"
                    >
                      {allAvailablePrograms.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Sesi 1 (Hari & Shift)
                    </label>
                    <div className="flex gap-1.5">
                      <select 
                        value={newStudentData.hari1}
                        onChange={e => setNewStudentData({ ...newStudentData, hari1: e.target.value })}
                        className="w-1/2 bg-white border border-slate-200 rounded-xl p-2 text-[10px] font-bold uppercase"
                      >
                        {WIC_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select 
                        value={newStudentData.shift1}
                        onChange={e => setNewStudentData({ ...newStudentData, shift1: e.target.value })}
                        className="w-1/2 bg-white border border-slate-200 rounded-xl p-2 text-[10px] font-bold"
                      >
                        {WIC_SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Sesi 2 (Hari & Shift)
                    </label>
                    <div className="flex gap-1.5">
                      <select 
                        value={newStudentData.hari2}
                        onChange={e => setNewStudentData({ ...newStudentData, hari2: e.target.value })}
                        className="w-1/2 bg-white border border-slate-200 rounded-xl p-2 text-[10px] font-bold uppercase"
                      >
                        {WIC_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select 
                        value={newStudentData.shift2}
                        onChange={e => setNewStudentData({ ...newStudentData, shift2: e.target.value })}
                        className="w-1/2 bg-white border border-slate-200 rounded-xl p-2 text-[10px] font-bold"
                      >
                        {WIC_SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* TOGGLE ENROLL DUA PROGRAM */}
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer p-4 bg-purple-50 rounded-2xl border-2 border-purple-200 w-full hover:border-purple-300 transition">
                  <input 
                    type="checkbox" 
                    checked={Boolean(newStudentData.is_dual_program)}
                    onChange={e => setNewStudentData({ ...newStudentData, is_dual_program: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded border-purple-300 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-black uppercase text-purple-950 block leading-tight flex items-center gap-1.5">
                      <Sparkles size={14} className="text-purple-600" /> Aktifkan 2 Program Sekaligus (Dual Program)
                    </span>
                    <span className="text-[10px] text-purple-700 font-medium">
                      Program terpadu: Program Reguler (English) + Tahsin & Tahfidz (2 jadwal tambahan/minggu)
                    </span>
                  </div>
                </label>
              </div>

              {/* SEKSI PROGRAM 2 (2 JADWAL PER MINGGU) */}
              {newStudentData.is_dual_program && (
                <div className="p-4 bg-purple-50/80 rounded-2xl border border-purple-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-purple-950 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-purple-600" /> Detail Program Ke-2 (Tahsin & Tahfidz)
                    </h4>
                    <span className="text-[9px] font-black text-purple-700 uppercase bg-white px-2 py-0.5 rounded border border-purple-200">
                      2 Jadwal Tambahan / Minggu
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-purple-900 mb-1">
                        Pilihan Program Ke-2
                      </label>
                      <select 
                        value={newStudentData.level2}
                        onChange={e => setNewStudentData({ ...newStudentData, level2: e.target.value })}
                        className="w-full bg-white border border-purple-300 rounded-xl p-2 text-xs font-black text-purple-950"
                      >
                        <option value="Tahsin & Tahfidz">⭐ Tahsin & Tahfidz (1 Program)</option>
                        {allAvailablePrograms.filter(p => p !== 'Tahsin & Tahfidz').map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-purple-900 mb-1">
                        Prog 2: Sesi 1 (Hari & Shift)
                      </label>
                      <div className="flex gap-1.5">
                        <select 
                          value={newStudentData.prog2_hari1}
                          onChange={e => setNewStudentData({ ...newStudentData, prog2_hari1: e.target.value })}
                          className="w-1/2 bg-white border border-purple-300 rounded-xl p-2 text-[10px] font-bold uppercase text-purple-950"
                        >
                          {WIC_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select 
                          value={newStudentData.prog2_shift1}
                          onChange={e => setNewStudentData({ ...newStudentData, prog2_shift1: e.target.value })}
                          className="w-1/2 bg-white border border-purple-300 rounded-xl p-2 text-[10px] font-bold text-purple-950"
                        >
                          {WIC_SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-purple-900 mb-1">
                        Prog 2: Sesi 2 (Hari & Shift)
                      </label>
                      <div className="flex gap-1.5">
                        <select 
                          value={newStudentData.prog2_hari2}
                          onChange={e => setNewStudentData({ ...newStudentData, prog2_hari2: e.target.value })}
                          className="w-1/2 bg-white border border-purple-300 rounded-xl p-2 text-[10px] font-bold uppercase text-purple-950"
                        >
                          {WIC_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select 
                          value={newStudentData.prog2_shift2}
                          onChange={e => setNewStudentData({ ...newStudentData, prog2_shift2: e.target.value })}
                          className="w-1/2 bg-white border border-purple-300 rounded-xl p-2 text-[10px] font-bold text-purple-950"
                        >
                          {WIC_SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea 
                  rows={2}
                  placeholder="Misal: Target hafalan Juz 30, preferensi bimbingan, dll."
                  value={newStudentData.notes}
                  onChange={e => setNewStudentData({ ...newStudentData, notes: e.target.value })}
                  className="input-premium py-2 text-xs font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold uppercase text-[10px] transition"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-gold-400 font-black uppercase text-[10px] tracking-wider transition shadow-md"
                >
                  Daftarkan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Siswa Lengkap */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Edit3 size={20} />
                </span>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900">Edit Data Siswa Lengkap</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">ID: #{editingStudent.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditStudent} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={editingStudent.name}
                    onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    className="input-premium py-2.5 text-xs font-bold"
                    placeholder="Nama lengkap siswa..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 flex items-center justify-between">
                    <span>Nama Panggilan (Nickname)</span>
                    <span className="text-[9px] text-amber-600 font-bold lowercase">dipakai di absensi jurnal</span>
                  </label>
                  <input 
                    type="text" 
                    value={editingStudent.nickname || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, nickname: e.target.value })}
                    className="input-premium py-2.5 text-xs font-bold bg-amber-50/40 border-amber-200 focus:border-amber-500"
                    placeholder="Contoh: Rizi, Alesha, Rayhan..."
                  />
                </div>
              </div>

              {/* Edit Program 1 (2 Jadwal/Minggu) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-emerald-950 flex items-center gap-1.5">
                    <BookOpen size={14} className="text-emerald-700" /> Program Utama (Program 1)
                  </h4>
                  <span className="text-[9px] font-bold text-slate-500 uppercase bg-white px-2 py-0.5 rounded border border-slate-200">
                    2 Jadwal / Minggu
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Pilihan Program
                    </label>
                    <select 
                      value={editingStudent.level}
                      onChange={e => setEditingStudent({ ...editingStudent, level: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold"
                    >
                      {allAvailablePrograms.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Sesi 1 (Hari & Shift)
                    </label>
                    <div className="flex gap-1.5">
                      <select 
                        value={editingStudent.hari1}
                        onChange={e => setEditingStudent({ ...editingStudent, hari1: e.target.value })}
                        className="w-1/2 bg-white border border-slate-200 rounded-xl p-2 text-[10px] font-bold uppercase"
                      >
                        {WIC_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select 
                        value={editingStudent.shift1}
                        onChange={e => setEditingStudent({ ...editingStudent, shift1: e.target.value })}
                        className="w-1/2 bg-white border border-slate-200 rounded-xl p-2 text-[10px] font-bold"
                      >
                        {WIC_SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Sesi 2 (Hari & Shift)
                    </label>
                    <div className="flex gap-1.5">
                      <select 
                        value={editingStudent.hari2}
                        onChange={e => setEditingStudent({ ...editingStudent, hari2: e.target.value })}
                        className="w-1/2 bg-white border border-slate-200 rounded-xl p-2 text-[10px] font-bold uppercase"
                      >
                        {WIC_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select 
                        value={editingStudent.shift2}
                        onChange={e => setEditingStudent({ ...editingStudent, shift2: e.target.value })}
                        className="w-1/2 bg-white border border-slate-200 rounded-xl p-2 text-[10px] font-bold"
                      >
                        {WIC_SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toggle Dual Program */}
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer p-4 bg-purple-50 rounded-2xl border-2 border-purple-200 w-full">
                  <input 
                    type="checkbox" 
                    checked={Boolean(editingStudent.is_dual_program)}
                    onChange={e => setEditingStudent({ ...editingStudent, is_dual_program: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded border-purple-300 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-black uppercase text-purple-950 block leading-tight flex items-center gap-1.5">
                      <Sparkles size={14} className="text-purple-600" /> Ambil 2 Program Sekaligus (Dual Program)
                    </span>
                    <span className="text-[10px] text-purple-700 font-medium">
                      Program terpadu: Program Reguler + Tahsin & Tahfidz (2 jadwal tambahan/minggu)
                    </span>
                  </div>
                </label>
              </div>

              {/* Edit Program 2 jika dual */}
              {editingStudent.is_dual_program && (
                <div className="p-4 bg-purple-50/80 rounded-2xl border border-purple-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-purple-950 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-purple-600" /> Detail Program Ke-2 (Tahsin & Tahfidz)
                    </h4>
                    <span className="text-[9px] font-black text-purple-700 uppercase bg-white px-2 py-0.5 rounded border border-purple-200">
                      2 Jadwal Tambahan / Minggu
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-purple-900 mb-1">
                        Pilihan Program Ke-2
                      </label>
                      <select 
                        value={editingStudent.level2 || 'Tahsin & Tahfidz'}
                        onChange={e => setEditingStudent({ ...editingStudent, level2: e.target.value })}
                        className="w-full bg-white border border-purple-300 rounded-xl p-2 text-xs font-black text-purple-950"
                      >
                        {allAvailablePrograms.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-purple-900 mb-1">
                        Prog 2: Sesi 1 (Hari & Shift)
                      </label>
                      <div className="flex gap-1.5">
                        <select 
                          value={editingStudent.prog2_hari1 || editingStudent.hari_prog2 || 'Rabu'}
                          onChange={e => setEditingStudent({ ...editingStudent, prog2_hari1: e.target.value })}
                          className="w-1/2 bg-white border border-purple-300 rounded-xl p-2 text-[10px] font-bold uppercase text-purple-950"
                        >
                          {WIC_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select 
                          value={editingStudent.prog2_shift1 || editingStudent.shift_prog2 || WIC_SHIFTS[0]}
                          onChange={e => setEditingStudent({ ...editingStudent, prog2_shift1: e.target.value })}
                          className="w-1/2 bg-white border border-purple-300 rounded-xl p-2 text-[10px] font-bold text-purple-950"
                        >
                          {WIC_SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-purple-900 mb-1">
                        Prog 2: Sesi 2 (Hari & Shift)
                      </label>
                      <div className="flex gap-1.5">
                        <select 
                          value={editingStudent.prog2_hari2 || 'Jumat'}
                          onChange={e => setEditingStudent({ ...editingStudent, prog2_hari2: e.target.value })}
                          className="w-1/2 bg-white border border-purple-300 rounded-xl p-2 text-[10px] font-bold uppercase text-purple-950"
                        >
                          {WIC_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select 
                          value={editingStudent.prog2_shift2 || WIC_SHIFTS[0]}
                          onChange={e => setEditingStudent({ ...editingStudent, prog2_shift2: e.target.value })}
                          className="w-1/2 bg-white border border-purple-300 rounded-xl p-2 text-[10px] font-bold text-purple-950"
                        >
                          {WIC_SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pengaturan Status Siswa & Cuti */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                      <CalendarOff size={13} className="text-amber-600" /> Status Keaktifan Belajar
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {editingStudent.status === 'CUTI' ? 'Siswa sedang masa cuti (disisihkan dari absen alpha)' : 'Siswa aktif mengikuti jadwal kelas'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingStudent({ ...editingStudent, status: 'ACTIVE' })}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer",
                        editingStudent.status !== 'CUTI' 
                          ? "bg-emerald-700 text-white shadow-xs" 
                          : "bg-white text-slate-600 border border-slate-200"
                      )}
                    >
                      ✓ Siswa Aktif
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingStudent({ 
                        ...editingStudent, 
                        status: 'CUTI', 
                        leave_start_date: editingStudent.leave_start_date || new Date().toISOString().split('T')[0] 
                      })}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1",
                        editingStudent.status === 'CUTI' 
                          ? "bg-amber-600 text-white shadow-xs font-black" 
                          : "bg-white text-amber-800 border border-amber-200"
                      )}
                    >
                      <CalendarOff size={12} /> Sedang Cuti
                    </button>
                  </div>
                </div>

                {editingStudent.status === 'CUTI' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/70 animate-in fade-in">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Tgl Mulai Cuti *
                      </label>
                      <input 
                        type="date"
                        value={editingStudent.leave_start_date || ''}
                        onChange={e => setEditingStudent({ ...editingStudent, leave_start_date: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Rencana Masuk Kembali
                      </label>
                      <input 
                        type="date"
                        value={editingStudent.leave_end_date || ''}
                        onChange={e => setEditingStudent({ ...editingStudent, leave_end_date: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Alasan Cuti *
                      </label>
                      <input 
                        type="text"
                        value={editingStudent.leave_reason || ''}
                        onChange={e => setEditingStudent({ ...editingStudent, leave_reason: e.target.value })}
                        placeholder="Contoh: Ujian Sekolah (PTS / PAS), Sakit, Mudik, Urusan Keluarga..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Catatan Tambahan Cuti
                      </label>
                      <input 
                        type="text"
                        value={editingStudent.leave_note || ''}
                        onChange={e => setEditingStudent({ ...editingStudent, leave_note: e.target.value })}
                        placeholder="Keterangan izin dari orang tua..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Catatan Tambahan
                </label>
                <textarea 
                  rows={2}
                  value={editingStudent.notes || ''}
                  onChange={e => setEditingStudent({ ...editingStudent, notes: e.target.value })}
                  className="input-premium py-2 text-xs font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setEditingStudent(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold uppercase text-[10px] transition"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-gold-400 font-black uppercase text-[10px] tracking-wider transition shadow-md flex items-center gap-1.5"
                >
                  <Check size={14} /> Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Siswa Permanen */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200 animate-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 text-red-700 rounded-2xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-black uppercase text-slate-900">
                  Hapus Siswa Permanen
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Tindakan ini tidak dapat dibatalkan
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <p className="font-black text-slate-800 uppercase">{deletingStudent.name}</p>
              <p className="text-slate-500 font-mono text-[10px]">ID: #{deletingStudent.id}</p>
              <p className="text-emerald-700 font-bold uppercase text-[10px]">
                Program: {deletingStudent.level} {deletingStudent.level2 ? `+ ${deletingStudent.level2}` : ''}
              </p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus siswa ini dari database WIC secara permanen?
            </p>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold uppercase text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs tracking-wider transition shadow-md flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Profil & Registrasi Google Form */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-700 text-gold-400 flex items-center justify-center font-black text-xl shadow-md border-2 border-gold-400/40 shrink-0">
                  {selectedStudentDetail.nickname ? selectedStudentDetail.nickname[0].toUpperCase() : selectedStudentDetail.name[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black uppercase text-slate-900">{selectedStudentDetail.name}</h3>
                    <button
                      type="button"
                      onClick={() => {
                        const s = selectedStudentDetail;
                        setSelectedStudentDetail(null);
                        setEditingStudent({ ...s });
                      }}
                      className="text-[10px] font-black uppercase bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                      title="Klik untuk mengedit data & nama panggilan siswa"
                    >
                      <span>Panggilan: {selectedStudentDetail.nickname || selectedStudentDetail.name.split(' ')[0]}</span>
                      <Edit3 size={10} className="text-amber-600" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-bold mt-1">
                    <span className="font-mono">#{selectedStudentDetail.id}</span>
                    {selectedStudentDetail.registered_at && (
                      <span className="text-[11px] text-slate-500 font-normal">
                        📅 Terdaftar: {selectedStudentDetail.registered_at}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Program Badge Strip */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
                <span className="text-[9px] font-black uppercase text-emerald-700 block mb-0.5">Program Utama (Prog 1)</span>
                <span className="text-sm font-black text-slate-900 uppercase">{selectedStudentDetail.level}</span>
                <div className="text-[10px] text-slate-500 font-bold mt-1 flex items-center gap-1">
                  <Clock size={11} className="text-emerald-600" />
                  <span>{selectedStudentDetail.hari1 || selectedStudentDetail.schedule_days} • {selectedStudentDetail.shift1 || selectedStudentDetail.schedule_shift}</span>
                </div>
              </div>

              {selectedStudentDetail.is_dual_program || selectedStudentDetail.level2 ? (
                <div className="bg-purple-50/80 p-3 rounded-xl border border-purple-200 shadow-xs">
                  <span className="text-[9px] font-black uppercase text-purple-700 block mb-0.5">Program Kedua (Dual)</span>
                  <span className="text-sm font-black text-purple-950 uppercase">{selectedStudentDetail.level2 || 'Tahsin & Tahfidz'}</span>
                  <div className="text-[10px] text-purple-700 font-bold mt-1 flex items-center gap-1">
                    <Clock size={11} className="text-purple-600" />
                    <span>{selectedStudentDetail.prog2_hari1 || selectedStudentDetail.hari_prog2 || 'Rabu'} & {selectedStudentDetail.prog2_hari2 || 'Jumat'} • {selectedStudentDetail.prog2_shift1 || selectedStudentDetail.shift_prog2 || selectedStudentDetail.shift1}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold">
                  Status: Program Reguler Tunggal
                </div>
              )}
            </div>

            {/* Cuti Status Banner if On Leave */}
            {selectedStudentDetail.status === 'CUTI' && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <CalendarOff size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-900">Status: Sedang Cuti</span>
                      {selectedStudentDetail.leave_end_date && (
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-md">
                          Sisa: {calculateDaysRemaining(selectedStudentDetail.leave_end_date)} hari
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-amber-900 mt-1">
                      <span className="font-bold">Periode:</span> {selectedStudentDetail.leave_start_date || 'Mulai cuti'} s.d. {selectedStudentDetail.leave_end_date || 'Sampai pemberitahuan'}
                    </p>
                    {selectedStudentDetail.leave_reason && (
                      <p className="text-xs text-amber-800 mt-0.5">
                        <span className="font-bold">Alasan:</span> {selectedStudentDetail.leave_reason}
                      </p>
                    )}
                    {selectedStudentDetail.leave_note && (
                      <p className="text-xs text-amber-700 mt-0.5 italic">
                        <span className="font-bold">Catatan:</span> {selectedStudentDetail.leave_note}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const s = selectedStudentDetail;
                      setSelectedStudentDetail(null);
                      handleOpenLeaveModal(s);
                    }}
                    className="px-3.5 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-black rounded-xl transition cursor-pointer"
                  >
                    Ubah Cuti
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const s = selectedStudentDetail;
                      setSelectedStudentDetail(null);
                      handleReactivateStudent(s.id);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    <UserCheck size={14} /> Aktifkan Kembali
                  </button>
                </div>
              </div>
            )}

            {/* Quick Action Contact Strip */}
            <div className="flex flex-wrap items-center gap-3">
              {selectedStudentDetail.wa && (
                <a
                  href={`https://wa.me/${selectedStudentDetail.wa.replace(/^0/, '62')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-[200px] bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase px-4 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <MessageCircle size={16} /> Hubungi via WhatsApp ({selectedStudentDetail.wa})
                </a>
              )}
              {selectedStudentDetail.email && (
                <a
                  href={`mailto:${selectedStudentDetail.email}`}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 transition"
                >
                  <Mail size={16} /> Email
                </a>
              )}
            </div>

            {/* Profile Grid Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="font-black uppercase text-slate-700 text-[10px] tracking-wider flex items-center gap-1.5">
                  <School size={13} className="text-emerald-700" /> Sekolah & Tingkat
                </h4>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Asal Sekolah</p>
                  <p className="font-bold text-slate-800">{selectedStudentDetail.school || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Kelas / Jenjang</p>
                  <p className="font-bold text-slate-800">{selectedStudentDetail.grade || '-'}</p>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="font-black uppercase text-slate-700 text-[10px] tracking-wider flex items-center gap-1.5">
                  <Users size={13} className="text-emerald-700" /> Wali & Domisili
                </h4>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Nama Wali</p>
                  <p className="font-bold text-slate-800">{selectedStudentDetail.parent_name || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Alamat</p>
                  <p className="font-bold text-slate-800">{selectedStudentDetail.address || '-'}</p>
                </div>
              </div>
            </div>

            {/* Goals & Expectations */}
            {selectedStudentDetail.goals && (
              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-1.5">
                <h4 className="text-[10px] font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-700" /> Tujuan & Harapan Kursus di WIC
                </h4>
                <p className="text-xs text-slate-700 italic leading-relaxed font-medium">
                  "{selectedStudentDetail.goals}"
                </p>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const s = selectedStudentDetail;
                    setSelectedStudentDetail(null);
                    handleOpenLeaveModal(s);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold uppercase text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CalendarOff size={14} /> {selectedStudentDetail.status === 'CUTI' ? 'Atur Cuti' : 'Tandai Cuti'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const s = selectedStudentDetail;
                    setSelectedStudentDetail(null);
                    setEditingStudent({ ...s });
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold uppercase text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 size={14} /> Edit Siswa
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudentDetail(null)}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs tracking-wider transition shadow-sm cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Management Modal for Single Student */}
      {leaveModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <CalendarOff size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base leading-tight">Pengaturan Cuti Belajar</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Siswa: <strong className="text-slate-800">{leaveModalStudent.name}</strong> ({leaveModalStudent.nickname || '-'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLeaveModalStudent(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Current Status Badge */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Status Saat Ini</span>
                <span className={cn(
                  "font-black uppercase text-xs",
                  leaveModalStudent.status === 'CUTI' ? "text-amber-800" : "text-emerald-700"
                )}>
                  {leaveModalStudent.status === 'CUTI' ? 'Sedang Cuti Belajar' : 'Siswa Aktif'}
                </span>
              </div>
              {leaveModalStudent.status === 'CUTI' && (
                <button
                  type="button"
                  onClick={() => handleReactivateStudent(leaveModalStudent.id)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <UserCheck size={14} /> Aktifkan Siswa Sekarang
                </button>
              )}
            </div>

            <form onSubmit={handleSaveLeave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    Tanggal Mulai Cuti
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveFormData.startDate}
                    onChange={(e) => setLeaveFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    Perkiraan Selesai / Masuk Kembali
                  </label>
                  <input
                    type="date"
                    value={leaveFormData.endDate}
                    onChange={(e) => setLeaveFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                  Alasan Cuti
                </label>
                <select
                  value={leaveFormData.reason}
                  onChange={(e) => setLeaveFormData(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="Ujian Sekolah (PTS / PAS)">Ujian Sekolah (PTS / PAS)</option>
                  <option value="Sakit / Pemulihan Kesehatan">Sakit / Pemulihan Kesehatan</option>
                  <option value="Ke Luar Kota / Pindah Sementara">Ke Luar Kota / Pindah Sementara</option>
                  <option value="Libur Semester / Mudik">Libur Semester / Mudik</option>
                  <option value="Kendala Finansial / Pribadi">Kendala Finansial / Pribadi</option>
                  <option value="Lainnya">Alasan Lainnya (Ketik Manual)...</option>
                </select>
              </div>

              {leaveFormData.reason === 'Lainnya' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    Ketik Alasan Cuti
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Mengikuti karantina olimpiade / lomba..."
                    value={leaveFormData.customReason}
                    onChange={(e) => setLeaveFormData(prev => ({ ...prev, customReason: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan dari orang tua atau kesepakatan kompensasi materi..."
                  value={leaveFormData.note}
                  onChange={(e) => setLeaveFormData(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-900">
                <Info size={15} className="text-amber-700 shrink-0 mt-0.5" />
                <p>
                  Siswa dengan status <strong>CUTI</strong> tidak akan muncul di daftar absensi harian tutor sehingga tidak tercatat alfa atau mengurangi persentase kehadiran kelas.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                {leaveModalStudent.wa ? (
                  <button
                    type="button"
                    onClick={() => handleSendWaLeaveConfirmation(leaveModalStudent)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    <MessageCircle size={14} /> Konfirmasi via WA
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveModalStudent(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-700 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <CalendarOff size={14} /> Simpan Status Cuti
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Set Leave Modal */}
      {isBulkLeaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <CalendarOff size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Tetapkan Cuti Massal</h3>
                  <p className="text-[11px] text-slate-500 font-bold">{selectedStudentIds.length} Siswa Terpilih</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkLeaveModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Mulai Cuti</label>
                  <input
                    type="date"
                    value={bulkLeaveData.startDate}
                    onChange={(e) => setBulkLeaveData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Perkiraan Masuk</label>
                  <input
                    type="date"
                    value={bulkLeaveData.endDate}
                    onChange={(e) => setBulkLeaveData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Alasan Cuti</label>
                <select
                  value={bulkLeaveData.reason}
                  onChange={(e) => setBulkLeaveData(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800"
                >
                  <option value="Ujian Sekolah (PTS / PAS)">Ujian Sekolah (PTS / PAS)</option>
                  <option value="Sakit / Pemulihan Kesehatan">Sakit / Pemulihan Kesehatan</option>
                  <option value="Ke Luar Kota / Liburan">Ke Luar Kota / Liburan</option>
                  <option value="Libur Semester / Mudik">Libur Semester / Mudik</option>
                  <option value="Cuti Masif Periode">Cuti Masif Periode</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="Contoh: Periode Ujian Akhir Semester Genap..."
                  value={bulkLeaveData.note}
                  onChange={(e) => setBulkLeaveData(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBulkLeaveModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleBulkSetLeave}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white font-black rounded-xl text-xs shadow-xs cursor-pointer"
                >
                  Terapkan Cuti ke {selectedStudentIds.length} Siswa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-black text-slate-900 text-base">Hapus {selectedStudentIds.length} Siswa Terpilih?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tindakan ini akan menghapus data {selectedStudentIds.length} siswa yang Anda pilih dari sistem secara permanen.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteStudents}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase shadow-xs transition cursor-pointer"
              >
                Ya, Hapus {selectedStudentIds.length} Siswa
              </button>
            </div>
          </div>
        </div>
      )}

      <FormatTemplateModal
        domain={showFormatModal ? 'STUDENTS' : null}
        onClose={() => setShowFormatModal(false)}
        showToast={showToast}
      />
    </div>
  );
}
