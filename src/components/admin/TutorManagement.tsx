import React, { useState, useMemo } from 'react';
import { User, HonorRateItem } from '../../types';
import { DEFAULT_HONOR_RATES } from '../../constants';
import { cn, getTutorSalutation, isTutorFemale, formatTutorDisplayName } from '../../lib/utils';
import { 
  Phone, 
  QrCode, 
  Trash2, 
  UserPlus, 
  Search, 
  Edit3, 
  X, 
  AlertTriangle, 
  ShieldCheck, 
  Check, 
  Settings2,
  DollarSign,
  Wallet,
  Users,
  Award,
  MessageCircle,
  LayoutGrid,
  List,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  Share2,
  Send,
  KeyRound,
  Copy,
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  BookOpen
} from 'lucide-react';
import { exportTutorsCSV, exportTutorsJSON, importTutorsFromFile } from '../../lib/dataExportImport';
import FormatTemplateModal from '../common/FormatTemplateModal';

interface TutorManagementProps {
  tutors: User[];
  onUpdate: (tutors: User[]) => void;
  onShowBarcode: (user: User) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onDeletePermanent?: (wa: string, cleanAssociatedData: boolean) => void;
  onAddTutor?: (newTutor: User) => void;
  honorRates?: HonorRateItem[];
  onOpenSettings?: () => void;
}

export default function TutorManagement({ 
  tutors, 
  onUpdate, 
  onShowBarcode, 
  showToast,
  onDeletePermanent,
  onAddTutor,
  honorRates,
  onOpenSettings
}: TutorManagementProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCert, setFilterCert] = useState<'ALL' | 'CERTIFIED' | 'STANDARD'>('ALL');
  const [filterAllowance, setFilterAllowance] = useState<'ALL' | 'WITH_ALLOWANCE' | 'NO_ALLOWANCE'>('ALL');
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTutor, setEditingTutor] = useState<User | null>(null);
  const [allowanceTutor, setAllowanceTutor] = useState<User | null>(null);
  const [deletingTutor, setDeletingTutor] = useState<User | null>(null);
  const [cleanAssociatedData, setCleanAssociatedData] = useState(false);
  const [selectedTutorWas, setSelectedTutorWas] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkCleanAssociatedData, setBulkCleanAssociatedData] = useState(false);
  const [waCredentialTutor, setWaCredentialTutor] = useState<User | null>(null);
  const [isCopiedWa, setIsCopiedWa] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);

  // Allowance Form State
  const [allowanceForm, setAllowanceForm] = useState({
    manual_allowance: 0,
    allowance_note: '',
    other_fee: 0,
    other_fee_note: ''
  });

  // Available honor status options derived dynamically from custom settings
  const statusOptions: string[] = useMemo(() => {
    if (honorRates && honorRates.length > 0) {
      return honorRates.map(r => r.name);
    }
    return DEFAULT_HONOR_RATES.map(r => r.name);
  }, [honorRates]);

  // New tutor form state
  const [newTutor, setNewTutor] = useState({
    name: '',
    gender: 'Miss' as 'Mr.' | 'Miss',
    username: '',
    wa: '',
    password: '',
    status_tutor: statusOptions[0] || 'Probation',
    photo: '',
    is_certified: false,
    certification_name: ''
  });

  // Ensure default status is synchronized if statusOptions load
  React.useEffect(() => {
    if (statusOptions.length > 0 && !statusOptions.includes(newTutor.status_tutor)) {
      setNewTutor(prev => ({ ...prev, status_tutor: statusOptions[0] }));
    }
  }, [statusOptions]);

  const tutorList = useMemo(() => tutors.filter(t => t.role === 'TUTOR'), [tutors]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalTutors = tutorList.length;
    const certifiedCount = tutorList.filter(t => t.is_certified || t.status_tutor?.toLowerCase().includes('sertifikasi')).length;
    const totalRegularAllowance = tutorList.reduce((acc, t) => acc + (t.manual_allowance || 0), 0);
    const totalOtherFee = tutorList.reduce((acc, t) => acc + (t.other_fee || 0), 0);
    const grandTotal = totalRegularAllowance + totalOtherFee;
    return {
      totalTutors,
      certifiedCount,
      totalRegularAllowance,
      totalOtherFee,
      grandTotal
    };
  }, [tutorList]);

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  const handleUpdateField = (wa: string, field: keyof User, val: any) => {
    onUpdate(tutors.map(t => t.wa === wa ? { ...t, [field]: val } : t));
  };

  const handleOpenAllowanceModal = (tutor: User) => {
    setAllowanceTutor(tutor);
    setAllowanceForm({
      manual_allowance: tutor.manual_allowance || 0,
      allowance_note: tutor.allowance_note || '',
      other_fee: tutor.other_fee || 0,
      other_fee_note: tutor.other_fee_note || ''
    });
  };

  const handleSaveAllowance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowanceTutor) return;

    const updated = tutors.map(t => t.wa === allowanceTutor.wa ? {
      ...t,
      manual_allowance: Number(allowanceForm.manual_allowance) || 0,
      allowance_note: allowanceForm.allowance_note.trim(),
      other_fee: Number(allowanceForm.other_fee) || 0,
      other_fee_note: allowanceForm.other_fee_note.trim()
    } : t);

    onUpdate(updated);
    setAllowanceTutor(null);
    showToast(`Tunjangan untuk ${formatTutorDisplayName(allowanceTutor)} berhasil diperbarui!`, 'success');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTutor) return;
    
    const cleanWa = editingTutor.wa.trim().replace(/\D/g, '');
    const cleanUsername = editingTutor.username.trim();

    // Check duplicate WA or username among other tutors
    const duplicate = tutors.find(t => 
      t.id !== editingTutor.id && 
      (t.wa === cleanWa || t.username.toLowerCase() === cleanUsername.toLowerCase())
    );
    if (duplicate) {
      showToast('No WA atau Username sudah digunakan oleh tutor lain', 'error');
      return;
    }

    const resolvedGender = getTutorSalutation(editingTutor);
    const updatedUser: User = {
      ...editingTutor,
      wa: cleanWa,
      username: cleanUsername,
      name: editingTutor.name.trim(),
      gender: resolvedGender,
      title: resolvedGender
    };

    onUpdate(tutors.map(t => t.id === editingTutor.id ? updatedUser : t));
    setEditingTutor(null);
    showToast(`Data ${formatTutorDisplayName(updatedUser)} berhasil diperbarui dan disinkronkan ke Cloud!`, 'success');
  };

  const handleCreateTutor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTutor.name || !newTutor.username || !newTutor.wa || !newTutor.password) {
      showToast('Harap lengkapi semua data wajib!', 'error');
      return;
    }

    const cleanWa = newTutor.wa.trim().replace(/\D/g, '');
    const cleanUsername = newTutor.username.trim();

    if (tutors.some(t => t.wa === cleanWa || t.username.toLowerCase() === cleanUsername.toLowerCase())) {
      showToast('No WhatsApp atau Username sudah terdaftar!', 'error');
      return;
    }

    const resolvedGender = newTutor.gender === 'Miss' ? 'Miss' : 'Mr.';
    const created: User = {
      id: 'T-' + Date.now(),
      name: newTutor.name.trim(),
      gender: resolvedGender,
      title: resolvedGender,
      username: cleanUsername,
      wa: cleanWa,
      password: newTutor.password,
      email: `${cleanUsername}@wic.com`,
      role: 'TUTOR',
      photo: newTutor.photo || `https://i.pravatar.cc/150?u=${cleanUsername}`,
      status_tutor: newTutor.status_tutor || statusOptions[0] || 'Probation',
      is_certified: newTutor.is_certified || newTutor.status_tutor?.toLowerCase().includes('sertifikasi'),
      certification_name: newTutor.certification_name || '',
      manual_allowance: 0,
      allowance_note: '',
      other_fee: 0,
      other_fee_note: ''
    };

    if (onAddTutor) {
      onAddTutor(created);
    } else {
      onUpdate([...tutors, created]);
    }

    setIsAddModalOpen(false);
    setNewTutor({
      name: '',
      gender: 'Miss',
      username: '',
      wa: '',
      password: '',
      status_tutor: statusOptions[0] || 'Probation',
      photo: '',
      is_certified: false,
      certification_name: ''
    });
    showToast(`Tutor ${formatTutorDisplayName(created)} berhasil ditambahkan dan disinkronkan ke Cloud!`, 'success');
  };

  const handleImportTutorsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { users: mergedUsers, added, updated } = await importTutorsFromFile(file, tutors);
      onUpdate(mergedUsers);
      showToast(`Import Tutor & Tunjangan berhasil! (+${added} baru, ${updated} diperbarui)`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengimpor file tutor (CSV/JSON).', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const confirmDelete = () => {
    if (!deletingTutor) return;
    const targetWa = deletingTutor.wa;
    const targetName = deletingTutor.name;

    if (onDeletePermanent) {
      onDeletePermanent(targetWa, cleanAssociatedData);
    } else {
      onUpdate(tutors.filter(t => t.wa !== targetWa));
    }

    setDeletingTutor(null);
    setCleanAssociatedData(false);
    showToast(`Tutor ${targetName} berhasil dihapus permanen dari sistem & database Cloud.`, 'success');
  };

  const toggleSelectAllTutors = () => {
    const visibleWas = filteredTutors.map(t => t.wa);
    const allSelected = visibleWas.length > 0 && visibleWas.every(wa => selectedTutorWas.includes(wa));
    if (allSelected) {
      setSelectedTutorWas(prev => prev.filter(wa => !visibleWas.includes(wa)));
    } else {
      setSelectedTutorWas(prev => Array.from(new Set([...prev, ...visibleWas])));
    }
  };

  const toggleSelectTutor = (wa: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTutorWas(prev => prev.includes(wa) ? prev.filter(w => w !== wa) : [...prev, wa]);
  };

  const handleBulkDeleteTutors = () => {
    if (selectedTutorWas.length === 0) return;
    const count = selectedTutorWas.length;
    if (onDeletePermanent) {
      selectedTutorWas.forEach(wa => onDeletePermanent(wa, bulkCleanAssociatedData));
    } else {
      onUpdate(tutors.filter(t => !selectedTutorWas.includes(t.wa)));
    }
    setSelectedTutorWas([]);
    setIsBulkDeleteModalOpen(false);
    setBulkCleanAssociatedData(false);
    showToast(`Berhasil menghapus permanen ${count} data tutor terpilih.`, 'success');
  };

  const filteredTutors = useMemo(() => {
    return tutorList.filter(t => {
      const q = search.toLowerCase();
      const matchesSearch = 
        t.name.toLowerCase().includes(q) ||
        t.username.toLowerCase().includes(q) ||
        t.wa.includes(q);
      
      const matchesStatus = filterStatus === 'ALL' || t.status_tutor === filterStatus;
      
      const isCert = t.is_certified || t.status_tutor?.toLowerCase().includes('sertifikasi');
      const matchesCert = 
        filterCert === 'ALL' || 
        (filterCert === 'CERTIFIED' && isCert) || 
        (filterCert === 'STANDARD' && !isCert);

      const hasAllowance = (t.manual_allowance || 0) > 0 || (t.other_fee || 0) > 0;
      const matchesAllowance = 
        filterAllowance === 'ALL' || 
        (filterAllowance === 'WITH_ALLOWANCE' && hasAllowance) || 
        (filterAllowance === 'NO_ALLOWANCE' && !hasAllowance);

      return matchesSearch && matchesStatus && matchesCert && matchesAllowance;
    });
  }, [tutorList, search, filterStatus, filterCert, filterAllowance]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Master Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Manajemen Tutor & Tunjangan</h2>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
              {tutorList.length} Tutor Terdaftar
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Monitoring data pengajar, status rate honor, kualifikasi ijazah sertifikasi, dan kontrol tunjangan periodik.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-2xl font-bold uppercase text-[10px] tracking-wider transition flex items-center gap-1.5"
            >
              <Settings2 size={15} /> Kustom Honor
            </button>
          )}

          <button
            onClick={() => {
              const origin = window.location.origin;
              const pathname = window.location.pathname;
              const regUrl = `${origin}${pathname}?mode=register`;
              if (navigator.clipboard) {
                navigator.clipboard.writeText(regUrl);
                showToast('Link Pendaftaran Tutor Langsung berhasil disalin! Bagikan ke tutor baru.', 'success');
              }
            }}
            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-4 py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-xs"
            title="Salin Link Pendaftaran Mandiri untuk Calon Pengajar"
          >
            <Share2 size={15} className="text-amber-700" /> Salin Link Daftar Tutor
          </button>

          <button
            type="button"
            onClick={() => {
              exportTutorsCSV(tutors);
              showToast('Data Tutor & Tunjangan (CSV) berhasil diekspor!', 'info');
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-3 rounded-2xl font-bold uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            title="Ekspor Daftar Tutor & Tunjangan ke CSV"
          >
            <FileSpreadsheet size={14} className="text-emerald-700" /> Export CSV
          </button>

          <button
            type="button"
            onClick={() => {
              exportTutorsJSON(tutors);
              showToast('Data Tutor & Tunjangan (JSON) berhasil diekspor!', 'info');
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-3 rounded-2xl font-bold uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            title="Ekspor Daftar Tutor & Tunjangan ke JSON"
          >
            <FileJson size={14} className="text-blue-700" /> Export JSON
          </button>

          <label
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 px-3.5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            title="Impor Data Tutor & Tunjangan dari file CSV atau JSON"
          >
            <Upload size={14} className="text-emerald-700" /> Import CSV/JSON
            <input
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={handleImportTutorsFile}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => setShowFormatModal(true)}
            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-3.5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            title="Lihat & unduh contoh format CSV/JSON Tutor & Tunjangan"
          >
            <BookOpen size={14} className="text-amber-700" /> Contoh Format
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 md:flex-initial bg-emerald-950 text-gold-400 hover:bg-emerald-900 px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
          >
            <UserPlus size={16} /> Tambah Tutor Baru
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar (Clean & Compact) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Pengajar</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-slate-800 font-mono">{metrics.totalTutors}</span>
            <Users size={18} className="text-emerald-700" />
          </div>
          <p className="text-[9px] text-slate-400 mt-1">Akun aktif WIC</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tersertifikasi</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-emerald-800 font-mono">{metrics.certifiedCount}</span>
            <Award size={18} className="text-gold-500" />
          </div>
          <p className="text-[9px] text-emerald-600 font-bold mt-1">
            {metrics.totalTutors > 0 ? Math.round((metrics.certifiedCount / metrics.totalTutors) * 100) : 0}% Pengajar
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tunjangan Reguler</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-base font-black text-blue-900 font-mono">{formatRupiah(metrics.totalRegularAllowance)}</span>
            <Wallet size={18} className="text-blue-600" />
          </div>
          <p className="text-[9px] text-slate-400 mt-1">Transport & pos tetap</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Fee Tambahan</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-base font-black text-amber-900 font-mono">{formatRupiah(metrics.totalOtherFee)}</span>
            <DollarSign size={18} className="text-amber-600" />
          </div>
          <p className="text-[9px] text-slate-400 mt-1">Bonus & insentif khusus</p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-emerald-950 to-emerald-900 text-white p-4 rounded-2xl border border-emerald-800 shadow-md">
          <p className="text-[9px] font-black text-gold-400 uppercase tracking-wider">Total Tunjangan</p>
          <p className="text-lg font-black text-gold-300 font-mono mt-1">{formatRupiah(metrics.grandTotal)}</p>
          <p className="text-[9px] text-emerald-200/80 mt-1">Akumulasi periode berjalan</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari tutor berdasarkan nama, username, atau WhatsApp..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition"
            />
            <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-56">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-black uppercase text-slate-700 focus:bg-white focus:border-emerald-500 outline-none transition cursor-pointer"
            >
              <option value="ALL">Semua Status ({tutorList.length})</option>
              {statusOptions.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'TABLE' ? 'bg-white text-emerald-950 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tampilan Tabel Ringkas"
            >
              <List size={14} /> <span className="hidden sm:inline text-[10px] uppercase">Tabel</span>
            </button>
            <button
              onClick={() => setViewMode('CARDS')}
              className={`p-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'CARDS' ? 'bg-white text-emerald-950 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tampilan Kartu Grid"
            >
              <LayoutGrid size={14} /> <span className="hidden sm:inline text-[10px] uppercase">Grid</span>
            </button>
          </div>
        </div>

        {/* Sub-Filters: Certification & Allowance quick pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-[10px]">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mr-1">Filter Cepat:</span>
          
          {/* Cert filter pills */}
          <button
            onClick={() => setFilterCert('ALL')}
            className={`px-2.5 py-1 rounded-lg font-bold transition ${
              filterCert === 'ALL' ? 'bg-emerald-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Sertifikasi
          </button>
          <button
            onClick={() => setFilterCert('CERTIFIED')}
            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
              filterCert === 'CERTIFIED' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            🎓 Tersertifikasi
          </button>
          <button
            onClick={() => setFilterCert('STANDARD')}
            className={`px-2.5 py-1 rounded-lg font-bold transition ${
              filterCert === 'STANDARD' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📄 Standar
          </button>

          <span className="text-slate-300 mx-1">|</span>

          {/* Allowance filter pills */}
          <button
            onClick={() => setFilterAllowance('ALL')}
            className={`px-2.5 py-1 rounded-lg font-bold transition ${
              filterAllowance === 'ALL' ? 'bg-emerald-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Tunjangan
          </button>
          <button
            onClick={() => setFilterAllowance('WITH_ALLOWANCE')}
            className={`px-2.5 py-1 rounded-lg font-bold transition ${
              filterAllowance === 'WITH_ALLOWANCE' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            💰 Ada Tunjangan
          </button>
          <button
            onClick={() => setFilterAllowance('NO_ALLOWANCE')}
            className={`px-2.5 py-1 rounded-lg font-bold transition ${
              filterAllowance === 'NO_ALLOWANCE' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tanpa Tunjangan (Rp 0)
          </button>

          <span className="ml-auto text-slate-400 font-bold">
            Menampilkan {filteredTutors.length} dari {tutorList.length} Tutor
          </span>
        </div>
      </div>

      {/* Bulk Selection and Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-black uppercase text-slate-700 select-none">
            <input 
              type="checkbox" 
              checked={filteredTutors.length > 0 && filteredTutors.every(t => selectedTutorWas.includes(t.wa))}
              onChange={toggleSelectAllTutors}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
            />
            <span>Pilih Semua Tutor ({filteredTutors.length})</span>
          </label>
          {selectedTutorWas.length > 0 && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {selectedTutorWas.length} tutor terpilih
            </span>
          )}
        </div>

        {selectedTutorWas.length > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in">
            <button
              onClick={() => setSelectedTutorWas([])}
              className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Batalkan
            </button>
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-4 py-2 text-[10px] font-black uppercase text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Trash2 size={13} /> Hapus Permanen Terpilih ({selectedTutorWas.length})
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {filteredTutors.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <p className="text-slate-400 font-bold uppercase text-xs">
            Tidak ada tutor yang sesuai kriteria pencarian dan filter.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setFilterStatus('ALL');
              setFilterCert('ALL');
              setFilterAllowance('ALL');
            }}
            className="mt-4 bg-emerald-950 text-gold-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm cursor-pointer"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : viewMode === 'TABLE' ? (
        /* COMPACT HIGH-DENSITY TABLE (Designed for 50+ tutors) */
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap min-w-[950px]">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 w-10 text-center">
                    <input 
                      type="checkbox" 
                      checked={filteredTutors.length > 0 && filteredTutors.every(t => selectedTutorWas.includes(t.wa))}
                      onChange={toggleSelectAllTutors}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                      title="Pilih / Batalkan Semua Tutor"
                    />
                  </th>
                  <th className="px-5 py-4">Tutor & Kontak</th>
                  <th className="px-5 py-4">Status Honor & Sertifikasi</th>
                  <th className="px-5 py-4">Tunjangan Reguler</th>
                  <th className="px-5 py-4">Fee / Lain-lain</th>
                  <th className="px-5 py-4 text-right">Total Tunjangan</th>
                  <th className="px-5 py-4 text-center">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTutors.map(t => {
                  const isCertified = t.is_certified || t.status_tutor?.toLowerCase().includes('sertifikasi');
                  const regAllowance = t.manual_allowance || 0;
                  const othFee = t.other_fee || 0;
                  const totalTunjangan = regAllowance + othFee;

                  return (
                    <tr key={t.wa} className={cn("hover:bg-slate-50/80 transition group", selectedTutorWas.includes(t.wa) && "bg-emerald-50/40")}>
                      <td className="px-4 py-3.5 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedTutorWas.includes(t.wa)}
                          onChange={() => toggleSelectTutor(t.wa)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                          title={selectedTutorWas.includes(t.wa) ? "Batalkan pilihan" : "Pilih tutor ini"}
                        />
                      </td>
                      {/* 1. Tutor Info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <img 
                            src={t.photo || `https://i.pravatar.cc/150?u=${t.username}`} 
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm shrink-0" 
                            alt={t.name}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextGender: 'Mr.' | 'Miss' = isTutorFemale(t) ? 'Mr.' : 'Miss';
                                  onUpdate(tutors.map(u => u.id === t.id ? { ...u, gender: nextGender, title: nextGender } : u));
                                  showToast(`Panggilan ${t.name} diubah menjadi ${nextGender} (${nextGender === 'Miss' ? 'Perempuan' : 'Laki-laki'})`, 'info');
                                }}
                                className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase border transition cursor-pointer shrink-0 ${
                                  isTutorFemale(t)
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                                }`}
                                title="Klik untuk ganti panggilan gender (Mr. / Miss)"
                              >
                                {getTutorSalutation(t)}
                              </button>
                              <p className="font-black text-slate-800 uppercase tracking-tight text-xs leading-none">
                                {t.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-400 font-bold">@{t.username}</span>
                              <span className="text-slate-300">•</span>
                              <a
                                href={`https://wa.me/${t.wa}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                                title="Chat WhatsApp"
                              >
                                <Phone size={10} /> {t.wa}
                              </a>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Status Honor & Sertifikasi */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1.5">
                          <select 
                            value={t.status_tutor}
                            onChange={e => handleUpdateField(t.wa, 'status_tutor', e.target.value)}
                            className="py-1 px-2.5 border border-slate-200 rounded-lg text-[10px] font-black uppercase bg-slate-50 hover:bg-white focus:border-emerald-500 outline-none transition cursor-pointer max-w-[200px]"
                          >
                            {statusOptions.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>

                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = !isCertified;
                                handleUpdateField(t.wa, 'is_certified', nextVal);
                                showToast(`Status sertifikasi ${t.name}: ${nextVal ? 'TERSERTIFIKASI' : 'STANDAR'}`, 'info');
                              }}
                              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight transition inline-flex items-center gap-1 ${
                                isCertified
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                              }`}
                              title="Klik untuk ubah status sertifikasi"
                            >
                              {isCertified ? '🎓 Tersertifikasi' : '📄 Standar'}
                            </button>
                            {t.certification_name && (
                              <span className="text-[9px] text-slate-400 font-bold ml-1.5 truncate max-w-[100px] inline-block align-middle" title={t.certification_name}>
                                ({t.certification_name})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Tunjangan Reguler */}
                      <td className="px-5 py-3.5">
                        <div 
                          onClick={() => handleOpenAllowanceModal(t)}
                          className="cursor-pointer group/pill inline-block"
                          title="Klik untuk ubah tunjangan"
                        >
                          <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition ${
                            regAllowance > 0 
                              ? 'bg-blue-50 border-blue-200 text-blue-900 group-hover/pill:border-blue-400' 
                              : 'bg-slate-50 border-slate-200 text-slate-400 group-hover/pill:border-slate-300'
                          }`}>
                            <span className="font-mono font-bold text-xs">
                              {regAllowance > 0 ? formatRupiah(regAllowance) : 'Rp 0'}
                            </span>
                            <Edit3 size={11} className="opacity-0 group-hover/pill:opacity-100 text-blue-600 transition" />
                          </div>
                          {t.allowance_note && (
                            <p className="text-[9px] text-slate-400 italic truncate max-w-[140px] mt-0.5">
                              {t.allowance_note}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 4. Fee Lainnya */}
                      <td className="px-5 py-3.5">
                        <div 
                          onClick={() => handleOpenAllowanceModal(t)}
                          className="cursor-pointer group/pill inline-block"
                          title="Klik untuk ubah fee tambahan"
                        >
                          <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition ${
                            othFee > 0 
                              ? 'bg-amber-50 border-amber-200 text-amber-900 group-hover/pill:border-amber-400' 
                              : 'bg-slate-50 border-slate-200 text-slate-400 group-hover/pill:border-slate-300'
                          }`}>
                            <span className="font-mono font-bold text-xs">
                              {othFee > 0 ? formatRupiah(othFee) : 'Rp 0'}
                            </span>
                            <Edit3 size={11} className="opacity-0 group-hover/pill:opacity-100 text-amber-600 transition" />
                          </div>
                          {t.other_fee_note && (
                            <p className="text-[9px] text-slate-400 italic truncate max-w-[140px] mt-0.5">
                              {t.other_fee_note}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 5. Total Tunjangan */}
                      <td className="px-5 py-3.5 text-right font-mono font-black text-xs text-emerald-950">
                        {totalTunjangan > 0 ? formatRupiah(totalTunjangan) : '-'}
                      </td>

                      {/* 6. Quick Action Icons */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Quick Adjust Tunjangan Button */}
                          <button
                            onClick={() => handleOpenAllowanceModal(t)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 px-2.5 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-wider transition border border-emerald-200 flex items-center gap-1"
                            title="Atur Tunjangan & Fee"
                          >
                            <DollarSign size={12} /> Tunjangan
                          </button>

                          {/* Kirim Kredensial Akun WA (Lupa Password / Username) */}
                          <button
                            onClick={() => {
                              setWaCredentialTutor(t);
                              setIsCopiedWa(false);
                            }}
                            className="p-1.5 bg-emerald-950 hover:bg-emerald-900 text-gold-400 rounded-lg transition border border-gold-400/30 flex items-center gap-1"
                            title="Kirim Kredensial Akun via WhatsApp (Lupa Username / Password)"
                          >
                            <MessageCircle size={13} />
                          </button>

                          {/* Edit Profile */}
                          <button 
                            onClick={() => setEditingTutor({ ...t })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition border border-blue-200"
                            title="Edit Data Tutor"
                          >
                            <Edit3 size={13} />
                          </button>

                          {/* Barcode */}
                          <button 
                            onClick={() => onShowBarcode(t)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition border border-slate-200"
                            title="ID Card & Barcode"
                          >
                            <QrCode size={13} />
                          </button>

                          {/* Delete */}
                          <button 
                            onClick={() => {
                              setDeletingTutor(t);
                              setCleanAssociatedData(false);
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition border border-red-200"
                            title="Hapus Akun Tutor"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MODERN CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTutors.map(t => {
            const isCertified = t.is_certified || t.status_tutor?.toLowerCase().includes('sertifikasi');
            const regAllowance = t.manual_allowance || 0;
            const othFee = t.other_fee || 0;
            const totalTunjangan = regAllowance + othFee;
            const isSelected = selectedTutorWas.includes(t.wa);

            return (
              <div 
                key={t.wa}
                className={cn(
                  "bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition flex flex-col justify-between relative",
                  isSelected ? "border-emerald-500 ring-2 ring-emerald-500/50 shadow-md" : "border-slate-200"
                )}
              >
                <div>
                  {/* Top: Avatar, Name, Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => toggleSelectTutor(t.wa, e)}
                        className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center transition border cursor-pointer shrink-0",
                          isSelected ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-400 border-slate-300 hover:border-emerald-500"
                        )}
                        title={isSelected ? "Batalkan pilihan" : "Pilih tutor ini"}
                      >
                        {isSelected && <Check size={11} />}
                      </button>
                      <img 
                        src={t.photo || `https://i.pravatar.cc/150?u=${t.username}`} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 shadow-sm shrink-0" 
                        alt={t.name}
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              const nextGender: 'Mr.' | 'Miss' = isTutorFemale(t) ? 'Mr.' : 'Miss';
                              onUpdate(tutors.map(u => u.id === t.id ? { ...u, gender: nextGender, title: nextGender } : u));
                              showToast(`Panggilan ${t.name} diubah menjadi ${nextGender} (${nextGender === 'Miss' ? 'Perempuan' : 'Laki-laki'})`, 'info');
                            }}
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase border transition cursor-pointer shrink-0 ${
                              isTutorFemale(t)
                                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                            }`}
                            title="Klik untuk ganti panggilan gender (Mr. / Miss)"
                          >
                            {getTutorSalutation(t)}
                          </button>
                          <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">{t.name}</h4>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">@{t.username}</p>
                        <a
                          href={`https://wa.me/${t.wa}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 hover:underline mt-0.5"
                        >
                          <Phone size={10} /> {t.wa}
                        </a>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !isCertified;
                        handleUpdateField(t.wa, 'is_certified', nextVal);
                        showToast(`Status sertifikasi ${t.name}: ${nextVal ? 'TERSERTIFIKASI' : 'STANDAR'}`, 'info');
                      }}
                      className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight shrink-0 transition ${
                        isCertified
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {isCertified ? '🎓 Resmi' : '📄 Standar'}
                    </button>
                  </div>

                  {/* Level Status Selector */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                      Level Honorarium
                    </label>
                    <select 
                      value={t.status_tutor}
                      onChange={e => handleUpdateField(t.wa, 'status_tutor', e.target.value)}
                      className="w-full py-1.5 px-3 border border-slate-200 rounded-xl text-[10px] font-black uppercase bg-slate-50 hover:bg-white focus:border-emerald-500 outline-none transition cursor-pointer"
                    >
                      {statusOptions.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>

                  {/* Allowances Summary Strip */}
                  <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Tunjangan Reguler</p>
                      <p className="text-xs font-mono font-bold text-blue-900 mt-0.5">
                        {regAllowance > 0 ? formatRupiah(regAllowance) : 'Rp 0'}
                      </p>
                      {t.allowance_note && <p className="text-[8px] text-slate-400 truncate italic mt-0.5">{t.allowance_note}</p>}
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Fee Tambahan</p>
                      <p className="text-xs font-mono font-bold text-amber-900 mt-0.5">
                        {othFee > 0 ? formatRupiah(othFee) : 'Rp 0'}
                      </p>
                      {t.other_fee_note && <p className="text-[8px] text-slate-400 truncate italic mt-0.5">{t.other_fee_note}</p>}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenAllowanceModal(t)}
                    className="flex-1 bg-emerald-950 hover:bg-emerald-900 text-gold-400 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1 shadow-sm"
                  >
                    <DollarSign size={13} /> Atur Tunjangan
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setWaCredentialTutor(t);
                        setIsCopiedWa(false);
                      }}
                      className="p-2 text-gold-400 bg-emerald-950 hover:bg-emerald-900 rounded-xl transition border border-gold-400/30"
                      title="Kirim Kredensial Akun via WhatsApp (Lupa Username / Password)"
                    >
                      <MessageCircle size={13} />
                    </button>
                    <button 
                      onClick={() => setEditingTutor({ ...t })}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition border border-blue-200"
                      title="Edit Tutor"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button 
                      onClick={() => onShowBarcode(t)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition border border-slate-200"
                      title="ID Card"
                    >
                      <QrCode size={13} />
                    </button>
                    <button 
                      onClick={() => {
                        setDeletingTutor(t);
                        setCleanAssociatedData(false);
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition border border-red-200"
                      title="Hapus"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QUICK ALLOWANCE MODAL (Slick, focused, easy adjustments) */}
      {allowanceTutor && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-slate-100 animate-in zoom-in-95">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <img 
                  src={allowanceTutor.photo || `https://i.pravatar.cc/150?u=${allowanceTutor.username}`} 
                  alt={allowanceTutor.name}
                  className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm"
                />
                <div>
                  <h3 className="font-black text-slate-800 uppercase tracking-tight text-base">{allowanceTutor.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{allowanceTutor.status_tutor}</p>
                </div>
              </div>
              <button 
                onClick={() => setAllowanceTutor(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAllowance} className="space-y-4 mt-5">
              {/* Tunjangan Reguler */}
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-blue-950 uppercase tracking-wider">
                    Tunjangan Reguler (Transport / Pos Tetap)
                  </label>
                  <span className="text-[9px] font-mono font-bold text-blue-700">
                    {formatRupiah(allowanceForm.manual_allowance)}
                  </span>
                </div>
                
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 font-mono">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={allowanceForm.manual_allowance || ''}
                    onChange={e => setAllowanceForm({ ...allowanceForm, manual_allowance: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full bg-white border border-blue-200 rounded-xl py-2 pl-9 pr-3 text-xs font-mono font-bold text-slate-800 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Quick nominal buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[50000, 100000, 200000, 300000, 500000].map(amt => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setAllowanceForm({ ...allowanceForm, manual_allowance: amt })}
                      className="text-[9px] font-mono font-bold bg-white hover:bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg border border-blue-200 transition"
                    >
                      {amt / 1000}k
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAllowanceForm({ ...allowanceForm, manual_allowance: 0 })}
                    className="text-[9px] font-bold text-red-500 hover:text-red-700 px-1.5 py-0.5"
                  >
                    Nol
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Keterangan (cth: Transport harian & uang makan)"
                  value={allowanceForm.allowance_note}
                  onChange={e => setAllowanceForm({ ...allowanceForm, allowance_note: e.target.value })}
                  className="w-full bg-white border border-blue-200 rounded-xl py-2 px-3 text-[10px] text-slate-700 italic focus:border-blue-500 outline-none"
                />
              </div>

              {/* Fee Lain-lain / Tambahan */}
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-amber-950 uppercase tracking-wider">
                    Fee Tambahan / Bonus Periodik
                  </label>
                  <span className="text-[9px] font-mono font-bold text-amber-700">
                    {formatRupiah(allowanceForm.other_fee)}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 font-mono">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={allowanceForm.other_fee || ''}
                    onChange={e => setAllowanceForm({ ...allowanceForm, other_fee: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full bg-white border border-amber-200 rounded-xl py-2 pl-9 pr-3 text-xs font-mono font-bold text-slate-800 focus:border-amber-500 outline-none"
                  />
                </div>

                {/* Quick nominal buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[25000, 50000, 100000, 150000, 250000].map(amt => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setAllowanceForm({ ...allowanceForm, other_fee: amt })}
                      className="text-[9px] font-mono font-bold bg-white hover:bg-amber-100 text-amber-800 px-2 py-0.5 rounded-lg border border-amber-200 transition"
                    >
                      {amt / 1000}k
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAllowanceForm({ ...allowanceForm, other_fee: 0 })}
                    className="text-[9px] font-bold text-red-500 hover:text-red-700 px-1.5 py-0.5"
                  >
                    Nol
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Keterangan (cth: Insentif koordinator / loyalitas)"
                  value={allowanceForm.other_fee_note}
                  onChange={e => setAllowanceForm({ ...allowanceForm, other_fee_note: e.target.value })}
                  className="w-full bg-white border border-amber-200 rounded-xl py-2 px-3 text-[10px] text-slate-700 italic focus:border-amber-500 outline-none"
                />
              </div>

              {/* Total Live Preview */}
              <div className="flex items-center justify-between p-3 bg-slate-100 rounded-xl text-xs font-bold text-slate-700">
                <span>Total Tunjangan Tutor:</span>
                <span className="font-mono font-black text-emerald-950 text-sm">
                  {formatRupiah((allowanceForm.manual_allowance || 0) + (allowanceForm.other_fee || 0))}
                </span>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAllowanceTutor(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold uppercase text-[10px] tracking-wider transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-950 hover:bg-emerald-900 text-gold-400 py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider transition shadow-lg shadow-emerald-950/20 active:scale-95"
                >
                  Simpan Tunjangan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tambah Tutor Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl max-w-lg w-full relative border border-slate-100 max-h-[90vh] overflow-y-auto custom-scroll animate-in zoom-in-95">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-800">
                <UserPlus size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Tambah Akun Tutor Baru</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Akses Portal & Rate Honorarium</p>
              </div>
            </div>

            <form onSubmit={handleCreateTutor} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                  Nama Lengkap Tutor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Cth: Sarah Jenkins, S.Pd"
                  value={newTutor.name}
                  onChange={e => setNewTutor({ ...newTutor, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition"
                />
              </div>

              {/* Jenis Kelamin / Panggilan Gender */}
              <div>
                <div className="flex items-center justify-between mb-1.5 ml-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Jenis Kelamin & Panggilan (Gender) *
                  </label>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Panggilan: {newTutor.gender} {newTutor.name.trim() || 'Nama Tutor'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewTutor({ ...newTutor, gender: 'Mr.' })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
                      newTutor.gender === 'Mr.'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-sky-50'
                    }`}
                  >
                    <span>Mr. — Laki-laki</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTutor({ ...newTutor, gender: 'Miss' })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
                      newTutor.gender === 'Miss'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50'
                    }`}
                  >
                    <span>Miss — Perempuan</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Username Login *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="sarah_wic"
                    value={newTutor.username}
                    onChange={e => setNewTutor({ ...newTutor, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    No WhatsApp Aktif *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="08123456789"
                    value={newTutor.wa}
                    onChange={e => setNewTutor({ ...newTutor, wa: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                  Password Login Portal *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Minimal 6 karakter"
                  value={newTutor.password}
                  onChange={e => setNewTutor({ ...newTutor, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                  Level / Status Honor Awal *
                </label>
                <select
                  value={newTutor.status_tutor}
                  onChange={e => setNewTutor({ ...newTutor, status_tutor: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition cursor-pointer"
                >
                  {statusOptions.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Sertifikasi Toggle */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-700" />
                    Kualifikasi Sertifikasi Resmi / Ijazah
                  </span>
                  <input
                    type="checkbox"
                    checked={newTutor.is_certified}
                    onChange={e => setNewTutor({ ...newTutor, is_certified: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </div>
                {newTutor.is_certified && (
                  <input
                    type="text"
                    placeholder="Nama sertifikat/gelar (cth: S.Pd Bahasa Inggris / TEFL)"
                    value={newTutor.certification_name}
                    onChange={e => setNewTutor({ ...newTutor, certification_name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-700 outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                  URL Foto Profil (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="https://i.pravatar.cc/..."
                  value={newTutor.photo}
                  onChange={e => setNewTutor({ ...newTutor, photo: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold uppercase text-[10px] tracking-wider transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-950 text-gold-400 hover:bg-emerald-900 py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider transition shadow-lg shadow-emerald-950/20 active:scale-95"
                >
                  Simpan & Buat Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Data Tutor */}
      {editingTutor && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl max-w-lg w-full relative border border-slate-100 max-h-[90vh] overflow-y-auto custom-scroll animate-in zoom-in-95">
            <button 
              onClick={() => setEditingTutor(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <Edit3 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Edit Profil Tutor</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Perbarui Informasi Akun</p>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                  Nama Lengkap Tutor
                </label>
                <input
                  type="text"
                  required
                  value={editingTutor.name}
                  onChange={e => setEditingTutor({ ...editingTutor, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition"
                />
              </div>

              {/* Edit Jenis Kelamin & Panggilan (Gender) */}
              <div>
                <div className="flex items-center justify-between mb-1.5 ml-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Jenis Kelamin & Panggilan (Gender)
                  </label>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Panggilan: {formatTutorDisplayName(editingTutor)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingTutor({ ...editingTutor, gender: 'Mr.', title: 'Mr.' })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
                      !isTutorFemale(editingTutor)
                        ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-sky-50'
                    }`}
                  >
                    <span>Mr. — Laki-laki</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTutor({ ...editingTutor, gender: 'Miss', title: 'Miss' })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
                      isTutorFemale(editingTutor)
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50'
                    }`}
                  >
                    <span>Miss — Perempuan</span>
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 mt-1 ml-1">
                  Otomatis menyelaraskan sapaan (Mr. / Miss) di Beranda Tutor, Jurnal Mengajar, Sidebar & Pesan WhatsApp.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTutor.username}
                    onChange={e => setEditingTutor({ ...editingTutor, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    No WhatsApp
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTutor.wa}
                    onChange={e => setEditingTutor({ ...editingTutor, wa: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                  Password Login
                </label>
                <input
                  type="text"
                  value={editingTutor.password || ''}
                  onChange={e => setEditingTutor({ ...editingTutor, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                  Status Honor
                </label>
                <select
                  value={editingTutor.status_tutor}
                  onChange={e => setEditingTutor({ ...editingTutor, status_tutor: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition cursor-pointer"
                >
                  {statusOptions.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Sertifikasi */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-700" />
                    Status Ijazah / Sertifikasi Tersertifikasi Resmi
                  </span>
                  <input
                    type="checkbox"
                    checked={editingTutor.is_certified}
                    onChange={e => setEditingTutor({ ...editingTutor, is_certified: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </div>
                {editingTutor.is_certified && (
                  <input
                    type="text"
                    placeholder="Nama sertifikat/gelar (cth: S.Pd, TEFL, Cambridge)"
                    value={editingTutor.certification_name || ''}
                    onChange={e => setEditingTutor({ ...editingTutor, certification_name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-700 outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                  Foto Profil URL
                </label>
                <input
                  type="text"
                  value={editingTutor.photo || ''}
                  onChange={e => setEditingTutor({ ...editingTutor, photo: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingTutor(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold uppercase text-[10px] tracking-wider transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-950 text-gold-400 hover:bg-emerald-900 py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider transition shadow-lg active:scale-95"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Hapus Akun Tutor Permanen */}
      {deletingTutor && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full relative border border-slate-100 text-center animate-in zoom-in-95">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-4 border border-red-100">
              <AlertTriangle size={28} />
            </div>

            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Hapus Tutor Permanen?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Anda akan menghapus akun <span className="font-bold text-slate-800 uppercase">{deletingTutor.name}</span> (@{deletingTutor.username}).
            </p>

            <div className="mt-4 p-3 bg-red-50/50 rounded-2xl border border-red-100 text-left">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanAssociatedData}
                  onChange={e => setCleanAssociatedData(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-red-600 rounded cursor-pointer shrink-0"
                />
                <span className="text-[10px] font-bold text-red-900 leading-tight">
                  Bersihkan juga seluruh data riwayat jurnal mengajar & proyek tambahan terkait tutor ini
                </span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeletingTutor(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white hover:bg-red-700 py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider transition shadow-lg shadow-red-600/30 active:scale-95 cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Hapus Permanen Terpilih (Bulk) */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full relative border border-slate-100 text-center animate-in zoom-in-95">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-4 border border-red-200">
              <Trash2 size={26} />
            </div>

            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Hapus Permanen {selectedTutorWas.length} Tutor Terpilih?
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Anda akan menghapus <strong className="text-red-600 font-black">{selectedTutorWas.length} akun pengajar</strong> yang dipilih secara <strong className="text-red-600">permanen</strong> dari sistem dan database Cloud.
            </p>

            <div className="mt-4 p-3 bg-red-50/50 rounded-2xl border border-red-100 text-left">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkCleanAssociatedData}
                  onChange={e => setBulkCleanAssociatedData(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-red-600 rounded cursor-pointer shrink-0"
                />
                <span className="text-[10px] font-bold text-red-900 leading-tight">
                  Bersihkan juga seluruh riwayat absensi, slip gaji & dokumen terkait tutor-tutor ini
                </span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteTutors}
                className="flex-1 bg-red-600 text-white hover:bg-red-700 py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider transition shadow-lg shadow-red-600/30 active:scale-95 cursor-pointer"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Kirim Kredensial Akun Tutor via WhatsApp (Pemulihan Akun Lupa Password/Username) */}
      {waCredentialTutor && (() => {
        const salutation = getTutorSalutation(waCredentialTutor);
        const cleanWa = waCredentialTutor.wa.replace(/[^0-9]/g, '');
        const formattedWa = cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa;
        const tutorIdStr = `T-${waCredentialTutor.id ? String(waCredentialTutor.id).replace(/^T-?/i, '') : waCredentialTutor.wa}`;
        const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-szc25tf5wq6vfvyzbmcsn3-828874496395.asia-southeast1.run.app';

        const waMessage = `*INFORMASI AKUN & KREDENSIAL LOGIN TUTOR WIC*
Lembaga Kursus Worth It Course (WIC)

Kepada Yth. ${salutation} ${waCredentialTutor.name},
Berikut adalah data akun resmi Anda untuk mengakses Portal Manajemen WIC (tidak perlu membuat akun baru):

📋 *DATA DIRI & STATUS TERVERIFIKASI:*
• Nama Lengkap: *${waCredentialTutor.name}*
• ID Tutor: *${tutorIdStr}*
• Status Jenjang: *${waCredentialTutor.status_tutor || 'Aktif'}*
• Nomor WhatsApp: *${waCredentialTutor.wa}*

🔑 *KREDENSIAL LOGIN:*
• Username: *${waCredentialTutor.username}*
• Password: *${waCredentialTutor.password || 'password'}*

🌐 *LINK AKSES PORTAL:*
${originUrl}

💡 *Panduan Masuk:*
1. Klik tautan portal di atas
2. Masukkan Username dan Password Anda
3. Anda langsung dapat mengisi jurnal mengajar, melihat kurikulum modul, dan mencetak slip gaji

Mohon simpan data akun ini dengan aman dan tidak dibagikan kepada pihak lain.
Salam hangat dari Tim Manajemen WIC.`;

        const handleSendWa = () => {
          const url = `https://wa.me/${formattedWa}?text=${encodeURIComponent(waMessage)}`;
          window.open(url, '_blank');
          showToast(`Membuka WhatsApp untuk tutor ${waCredentialTutor.name}...`, 'success');
        };

        const handleCopyWa = () => {
          navigator.clipboard.writeText(waMessage);
          setIsCopiedWa(true);
          showToast('Format pesan berhasil disalin ke clipboard!', 'success');
          setTimeout(() => setIsCopiedWa(false), 3000);
        };

        return (
          <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gold-400/20 border border-gold-400/30 flex items-center justify-center text-gold-400 shrink-0">
                    <KeyRound size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gold-400 tracking-wider">
                      Layanan Bantuan Akun Tutor
                    </span>
                    <h3 className="font-black text-base uppercase tracking-tight text-white mt-0.5">
                      Kirim Kredensial Akun via WhatsApp
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setWaCredentialTutor(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-4 custom-scroll text-xs">
                {/* Tutor Profile Summary Card */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-3.5">
                  <img
                    src={waCredentialTutor.photo || `https://i.pravatar.cc/150?u=${waCredentialTutor.username}`}
                    className="w-12 h-12 rounded-full object-cover border-2 border-emerald-300 shrink-0"
                    alt={waCredentialTutor.name}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm uppercase text-slate-900 truncate">
                        {salutation} {waCredentialTutor.name}
                      </h4>
                      <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-300">
                        {waCredentialTutor.status_tutor}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1.5 text-[10.5px] font-mono text-slate-600">
                      <div>
                        <span className="text-slate-400">Username: </span>
                        <strong className="text-slate-900">@{waCredentialTutor.username}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Password: </span>
                        <strong className="text-emerald-800">{waCredentialTutor.password || 'password'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">ID: </span>
                        <strong className="text-slate-800">{tutorIdStr}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">WA: </span>
                        <strong className="text-slate-800">{waCredentialTutor.wa}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                  <ShieldCheck size={16} className="text-amber-700 shrink-0" />
                  <span>
                    <strong>Tidak perlu membuat akun baru!</strong> Kredensial resmi tutor ini dapat langsung dikirimkan ke nomor WhatsApp yang bersangkutan.
                  </span>
                </div>

                {/* Pre-formatted Message Preview */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                    Preview Teks Pesan WhatsApp yang Akan Dikirim:
                  </label>
                  <pre className="text-[10.5px] font-mono bg-slate-900 text-emerald-300 p-3.5 rounded-2xl overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800 max-h-56">
                    {waMessage}
                  </pre>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyWa}
                  className="w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isCopiedWa ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{isCopiedWa ? 'Tersalin ke Clipboard!' : 'Salin Pesan'}</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setWaCredentialTutor(null)}
                    className="flex-1 sm:flex-none px-4 py-2.5 text-slate-500 hover:text-slate-800 font-bold uppercase text-[10px] rounded-xl transition cursor-pointer"
                  >
                    Tutup
                  </button>

                  <button
                    type="button"
                    onClick={handleSendWa}
                    className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Send size={14} />
                    <span>Kirim via WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <FormatTemplateModal
        domain={showFormatModal ? 'TUTORS' : null}
        onClose={() => setShowFormatModal(false)}
        showToast={showToast}
      />
    </div>
  );
}
