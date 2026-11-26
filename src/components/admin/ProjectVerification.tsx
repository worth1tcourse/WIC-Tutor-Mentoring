import React, { useState, useMemo } from 'react';
import { Project, User, ProjectType, ProjectClassification, Settings } from '../../types';
import { DEFAULT_PROJECT_CLASSIFICATIONS } from '../../constants';
import { 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Settings2, 
  Trash2, 
  Layers, 
  Printer, 
  Plus, 
  FolderPlus, 
  Edit3, 
  Check, 
  X, 
  Filter, 
  Search,
  BookOpen,
  Film,
  Award,
  Building2,
  Sparkles,
  Upload,
  FileJson,
  FileSpreadsheet
} from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import {
  exportProjectCatalogCSV,
  exportProjectCatalogJSON,
  importProjectCatalogFromFile
} from '../../lib/dataExportImport';
import ProjectRecapReportModal from './ProjectRecapReportModal';
import FormatTemplateModal from '../common/FormatTemplateModal';

interface ProjectVerificationProps {
  projects: Project[];
  tutors: User[];
  projectTypes: ProjectType[];
  classifications?: ProjectClassification[];
  settings: Settings;
  onUpdate: (projects: Project[]) => void;
  onUpdateSettings?: (settings: Settings) => void;
  onOpenSettings: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function ProjectVerification({ 
  projects, 
  tutors, 
  projectTypes, 
  classifications = DEFAULT_PROJECT_CLASSIFICATIONS,
  settings, 
  onUpdate, 
  onUpdateSettings,
  onOpenSettings,
  showToast
}: ProjectVerificationProps) {
  const [tutorFilter, setTutorFilter] = useState('ALL');
  const [classificationFilter, setClassificationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Belum ditinjau' | 'Diterima' | 'Ditolak'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCustomClassModalOpen, setIsCustomClassModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showFormatModal, setShowFormatModal] = useState(false);
  
  // Custom Classification state for management modal
  const [activeClassList, setActiveClassList] = useState<ProjectClassification[]>(
    classifications && classifications.length > 0 ? classifications : DEFAULT_PROJECT_CLASSIFICATIONS
  );
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemFee, setNewItemFee] = useState<number>(35000);
  const [selectedClassIdForNewItem, setSelectedClassIdForNewItem] = useState(activeClassList[0]?.id || 'modul');

  // Keep activeClassList in sync when classifications prop changes from SystemSettings
  React.useEffect(() => {
    if (classifications && classifications.length > 0) {
      setActiveClassList(classifications);
      if (!classifications.some(c => c.id === selectedClassIdForNewItem)) {
        setSelectedClassIdForNewItem(classifications[0]?.id || 'modul');
      }
    }
  }, [classifications]);

  // Normalize project classification
  const getProjectClassification = (p: Project): string => {
    if (p.classification) return p.classification;
    const lower = (p.type || '').toLowerCase();
    if (lower.includes('modul') || lower.includes('silabus') || lower.includes('worksheet')) return 'Modul';
    if (lower.includes('video') || lower.includes('medsos') || lower.includes('content') || lower.includes('canva') || lower.includes('media')) return 'Content';
    if (lower.includes('event') || lower.includes('lomba') || lower.includes('spelling') || lower.includes('workshop')) return 'Event';
    if (lower.includes('sekolah') || lower.includes('kemitraan') || lower.includes('mitra')) return 'Sekolah';
    return 'Modul';
  };

  // Filtered projects
  const filtered = useMemo(() => {
    return projects.filter(p => {
      const pClass = getProjectClassification(p);
      if (tutorFilter !== 'ALL' && p.tutor_wa !== tutorFilter) return false;
      if (classificationFilter !== 'ALL' && pClass.toLowerCase() !== classificationFilter.toLowerCase()) return false;
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const tName = tutors.find(t => t.wa === p.tutor_wa || t.username === p.tutor_wa)?.name || '';
        return p.type.toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q) || tName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [projects, tutorFilter, classificationFilter, statusFilter, searchQuery, tutors]);

  const pending = filtered.filter(p => p.status === 'Belum ditinjau');

  // Summary per classification
  const recapPerClassification = useMemo(() => {
    return activeClassList.map(cls => {
      const matched = projects.filter(p => getProjectClassification(p).toLowerCase() === cls.name.toLowerCase());
      const approved = matched.filter(p => p.status === 'Diterima');
      const pendingCount = matched.filter(p => p.status === 'Belum ditinjau' || p.status === 'Pending').length;
      const approvedFee = approved.reduce((sum, p) => sum + (p.fee || 0), 0);
      return {
        ...cls,
        totalSubmitted: matched.length,
        approvedCount: approved.length,
        pendingCount,
        approvedFee
      };
    });
  }, [activeClassList, projects]);

  const handleStatusChange = (id: string, status: Project['status'], fee?: number) => {
    onUpdate(projects.map(p => p.id === id ? { ...p, status, fee: fee !== undefined ? fee : p.fee } : p));
  };

  const handleBulkAccept = () => {
    if (selectedIds.length === 0) return;
    onUpdate(projects.map(p => selectedIds.includes(p.id) ? { ...p, status: 'Diterima' as const } : p));
    setSelectedIds([]);
  };

  const handleBulkReject = () => {
    if (selectedIds.length === 0) return;
    onUpdate(projects.map(p => selectedIds.includes(p.id) ? { ...p, status: 'Ditolak' as const } : p));
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    onUpdate(projects.filter(p => !selectedIds.includes(p.id)));
    setSelectedIds([]);
    setIsBulkDeleteModalOpen(false);
  };

  const handleSingleDelete = (id: string) => {
    onUpdate(projects.filter(p => p.id !== id));
    setSelectedIds(prev => prev.filter(i => i !== id));
    setDeletingProjectId(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    const visibleIds = filtered.map(p => p.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const getTutorName = (wa: string) => tutors.find(t => t.wa === wa || t.username === wa)?.name || wa;

  // Custom classification management handlers
  const handleAddClassification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const newCls: ProjectClassification = {
      id: 'custom-' + Date.now(),
      name: newClassName.trim(),
      description: newClassDesc.trim() || `Klasifikasi kustom ${newClassName.trim()}`,
      badgeColor: 'from-purple-600 to-indigo-700',
      items: [
        {
          id: 'item-' + Date.now(),
          name: `Pengerjaan Proyek ${newClassName.trim()}`,
          defaultFee: 35000,
          description: `Tugas terstruktur bidang ${newClassName.trim()}`
        }
      ]
    };
    const updated = [...activeClassList, newCls];
    setActiveClassList(updated);
    if (onUpdateSettings) {
      const flattenedTypes: ProjectType[] = updated.flatMap(cls => 
        (cls.items || []).map(it => ({
          name: it.name,
          fee: it.defaultFee,
          classification: cls.name
        }))
      );
      onUpdateSettings({ ...settings, project_classifications: updated, project_types: flattenedTypes });
    }
    setNewClassName('');
    setNewClassDesc('');
  };

  const handleAddItemToClassification = (classId: string) => {
    if (!newItemName.trim()) return;
    const updated = activeClassList.map(cls => {
      if (cls.id !== classId) return cls;
      return {
        ...cls,
        items: [
          ...cls.items,
          {
            id: 'item-' + Date.now(),
            name: newItemName.trim(),
            defaultFee: newItemFee || 35000,
            description: `Rincian proyek ${newItemName.trim()}`
          }
        ]
      };
    });
    setActiveClassList(updated);
    if (onUpdateSettings) {
      const flattenedTypes: ProjectType[] = updated.flatMap(cls => 
        (cls.items || []).map(it => ({
          name: it.name,
          fee: it.defaultFee,
          classification: cls.name
        }))
      );
      onUpdateSettings({ ...settings, project_classifications: updated, project_types: flattenedTypes });
    }
    setNewItemName('');
  };

  const handleDeleteClassification = (classId: string) => {
    if (activeClassList.length <= 1) {
      return;
    }
    const updated = activeClassList.filter(c => c.id !== classId);
    setActiveClassList(updated);
    if (onUpdateSettings) {
      const flattenedTypes: ProjectType[] = updated.flatMap(cls => 
        (cls.items || []).map(it => ({
          name: it.name,
          fee: it.defaultFee,
          classification: cls.name
        }))
      );
      onUpdateSettings({ ...settings, project_classifications: updated, project_types: flattenedTypes });
    }
  };

  const handleImportProjectCatalogFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { classifications: nextCls, projectTypes: nextTypes, added, updated } =
        await importProjectCatalogFromFile(file, activeClassList);
      setActiveClassList(nextCls);
      if (onUpdateSettings) {
        onUpdateSettings({
          ...settings,
          project_classifications: nextCls,
          project_types: nextTypes
        });
      }
      if (showToast) {
        showToast(`Import Master Nama Proyek berhasil! (+${added} proyek baru, ${updated} diperbarui)`, 'success');
      }
    } catch (err: any) {
      if (showToast) {
        showToast(err?.message || 'Gagal mengimpor file Master Nama Proyek (CSV/JSON).', 'error');
      }
    } finally {
      e.target.value = '';
    }
  };

  const getClassificationBadge = (clsName: string) => {
    switch (clsName.toLowerCase()) {
      case 'modul':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'content':
        return 'bg-pink-50 text-pink-800 border-pink-200';
      case 'event':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'sekolah':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-purple-50 text-purple-800 border-purple-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-emerald-950 text-gold-400 rounded-2xl shadow-sm">
                <Layers size={22} />
              </span>
              <div>
                <h3 className="font-black text-slate-900 uppercase text-lg tracking-tight">
                  Verifikasi & Rekapitulasi Proyek per Klasifikasi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pembagian klasifikasi terstruktur: Modul, Content, Event, Sekolah & Proyek Kustom
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="bg-emerald-950 hover:bg-emerald-900 text-gold-400 border border-gold-400/30 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer"
              title="Unduh laporan resmi format kertas A4"
            >
              <Printer size={15} /> Unduh Rekap Proyek (PDF A4)
            </button>

            <button
              type="button"
              onClick={() => {
                exportProjectCatalogCSV(activeClassList);
                if (showToast) showToast('Daftar Master Nama Proyek (CSV) berhasil diekspor!', 'info');
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-1.5 border border-slate-200 cursor-pointer"
              title="Ekspor Master Nama Proyek ke CSV"
            >
              <FileSpreadsheet size={14} className="text-emerald-700" /> Export CSV
            </button>

            <button
              type="button"
              onClick={() => {
                exportProjectCatalogJSON(activeClassList);
                if (showToast) showToast('Daftar Master Nama Proyek (JSON) berhasil diekspor!', 'info');
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-1.5 border border-slate-200 cursor-pointer"
              title="Ekspor Master Nama Proyek ke JSON"
            >
              <FileJson size={14} className="text-blue-700" /> Export JSON
            </button>

            <label
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 border border-emerald-200 cursor-pointer"
              title="Impor Master Nama Proyek dari file CSV atau JSON"
            >
              <Upload size={14} className="text-emerald-700" /> Import CSV/JSON
              <input
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={handleImportProjectCatalogFile}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => setShowFormatModal(true)}
              className="bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 border border-amber-200 cursor-pointer"
              title="Lihat & unduh contoh format CSV/JSON Master Nama Proyek"
            >
              <BookOpen size={14} className="text-amber-700" /> Contoh Format
            </button>

            <button
              onClick={() => setIsCustomClassModalOpen(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 border border-slate-200 cursor-pointer"
              title="Kustomisasi klasifikasi dan rincian proyek"
            >
              <FolderPlus size={15} className="text-emerald-700" /> Kelola Klasifikasi
            </button>

            <button 
              onClick={onOpenSettings} 
              className="p-2.5 bg-white text-slate-500 hover:text-emerald-700 rounded-xl border border-slate-200 hover:border-slate-300 transition cursor-pointer"
              title="Pengaturan Sistem"
            >
              <Settings2 size={16} />
            </button>
          </div>
        </div>

        {/* Rekapitulasi per Klasifikasi Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {recapPerClassification.map((item) => (
            <div 
              key={item.id}
              onClick={() => setClassificationFilter(classificationFilter === item.name ? 'ALL' : item.name)}
              className={cn(
                "p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group hover:shadow-md",
                classificationFilter === item.name 
                  ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/50" 
                  : "bg-slate-50 hover:bg-white text-slate-900 border-slate-200"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
                  classificationFilter === item.name 
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30" 
                    : getClassificationBadge(item.name)
                )}>
                  Proyek {item.name}
                </span>
                <span className={cn(
                  "text-xs font-mono font-bold",
                  classificationFilter === item.name ? "text-gold-400" : "text-emerald-800"
                )}>
                  {formatCurrency(item.approvedFee)}
                </span>
              </div>

              <div className="mt-2">
                <p className="text-lg font-black tracking-tight font-mono">
                  {item.totalSubmitted} <span className="text-[10px] font-bold uppercase text-slate-400">Pengajuan</span>
                </p>
                <div className="flex items-center gap-3 text-[10px] font-bold mt-1">
                  <span className={classificationFilter === item.name ? "text-emerald-300" : "text-emerald-700"}>
                    ✓ {item.approvedCount} Diterima
                  </span>
                  <span className={classificationFilter === item.name ? "text-amber-300" : "text-amber-700"}>
                    ⏳ {item.pendingCount} Pending
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/80 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Classification & Status Quick Filter Chips */}
          <div className="flex flex-col gap-2 w-full lg:w-auto">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setClassificationFilter('ALL')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition cursor-pointer",
                  classificationFilter === 'ALL'
                    ? "bg-emerald-950 text-gold-400 shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                )}
              >
                Semua ({projects.length})
              </button>
              {activeClassList.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => setClassificationFilter(cls.name)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition flex items-center gap-1 cursor-pointer",
                    classificationFilter === cls.name
                      ? "bg-emerald-950 text-gold-400 shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {cls.name}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] font-black uppercase text-slate-400 mr-1">Status:</span>
              {(['ALL', 'Belum ditinjau', 'Diterima', 'Ditolak'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition border cursor-pointer",
                    statusFilter === st
                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {st === 'ALL' ? 'Semua Status' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-1.5 animate-in zoom-in-50">
                <button 
                  onClick={handleBulkAccept}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase shadow-md transition cursor-pointer"
                  title="Terima semua proyek terpilih"
                >
                  Terima ({selectedIds.length})
                </button>
                <button 
                  onClick={handleBulkReject}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase shadow-md transition cursor-pointer"
                  title="Tolak semua proyek terpilih"
                >
                  Tolak ({selectedIds.length})
                </button>
                <button 
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase shadow-md transition flex items-center gap-1 cursor-pointer active:scale-95"
                  title="Hapus permanen semua proyek terpilih"
                >
                  <Trash2 size={12} /> Hapus Permanen ({selectedIds.length})
                </button>
              </div>
            )}

            <div className="relative flex-1 sm:w-48">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari proyek / tutor..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none"
              />
            </div>

            <select 
              value={tutorFilter} 
              onChange={(e) => setTutorFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none"
            >
              <option value="ALL">Semua Tutor</option>
              {tutors.filter(t => t.role === 'TUTOR').map(t => (
                <option key={t.wa} value={t.wa}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={filtered.length > 0 && filtered.every(p => selectedIds.includes(p.id))}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    title="Pilih / Batalkan Semua Proyek"
                  />
                </th>
                <th className="px-6 py-4">Tutor & Tgl</th>
                <th className="px-6 py-4">Klasifikasi</th>
                <th className="px-6 py-4">Nama Proyek</th>
                <th className="px-6 py-4">Tautan Berkas</th>
                <th className="px-6 py-4">Nominal Akseptasi</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {filtered.map(p => {
                const pClass = getProjectClassification(p);
                return (
                  <tr key={p.id} className={cn("hover:bg-slate-50 transition group", selectedIds.includes(p.id) && "bg-emerald-50/40")}>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        title={selectedIds.includes(p.id) ? 'Batalkan pilihan' : 'Pilih proyek ini'}
                      />
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-black text-slate-800 uppercase">{getTutorName(p.tutor_wa)}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{p.date}</p>
                    </td>

                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase border", getClassificationBadge(pClass))}>
                        {pClass}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-slate-800">{p.type}</p>
                        {(p.quantity || 1) > 1 && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-mono font-black">
                            {p.quantity} {p.unit_label || 'Item'} × {formatCurrency(p.unit_fee || Math.round((p.fee || 0) / (p.quantity || 1)))}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 italic truncate max-w-[240px]" title={p.desc}>{p.desc}</p>
                      {p.admin_note && (
                        <p className="text-[9px] text-amber-700 font-bold truncate max-w-[240px]" title={p.admin_note}>
                          Catatan Admin: {p.admin_note}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {p.file_url ? (
                        <a 
                          href={p.file_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1 font-bold text-[10px] transition"
                        >
                          <ExternalLink size={11} /> Buka Tautan
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">-</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-xs font-mono">Rp</span>
                        <input 
                          type="number" 
                          value={p.fee} 
                          onChange={(e) => handleStatusChange(p.id, p.status, parseInt(e.target.value) || 0)}
                          className="w-28 p-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:border-emerald-500 outline-none bg-slate-50 focus:bg-white" 
                        />
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-black border",
                        p.status === 'Diterima' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        p.status === 'Ditolak' ? "bg-red-50 text-red-700 border-red-200" :
                        "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {p.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-1.5">
                        <button 
                          onClick={() => setEditingProject({ ...p })}
                          className="p-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition border border-blue-200 cursor-pointer"
                          title="Edit Rincian Proyek (Jenis, Klasifikasi, Fee & Link)"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button 
                          onClick={() => handleStatusChange(p.id, 'Diterima')}
                          className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition border border-emerald-200 cursor-pointer"
                          title="Terima Proyek"
                        >
                          <CheckCircle size={15} />
                        </button>
                        <button 
                          onClick={() => handleStatusChange(p.id, 'Ditolak')}
                          className="p-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-600 hover:text-white transition border border-red-200 cursor-pointer"
                          title="Tolak Proyek"
                        >
                          <XCircle size={15} />
                        </button>
                        <button 
                          onClick={() => setDeletingProjectId(p.id)}
                          className="p-1.5 bg-slate-100 text-slate-400 rounded-lg hover:bg-red-500 hover:text-white transition border border-slate-200 cursor-pointer"
                          title="Hapus Permanen Proyek"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 italic">
                    Tidak ada data proyek yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Kelola & Kustom Klasifikasi Proyek */}
      {isCustomClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto custom-scroll space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-900 uppercase text-base flex items-center gap-2">
                  <FolderPlus size={18} className="text-emerald-700" /> Kelola & Kustom Klasifikasi Proyek
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tambah klasifikasi baru dan atur rincian tugas proyek serta standar honornya
                </p>
              </div>
              <button
                onClick={() => setIsCustomClassModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* List of Current Classifications */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">
                Daftar Klasifikasi Aktif ({activeClassList.length})
              </h4>
              <div className="space-y-3">
                {activeClassList.map(cls => (
                  <div key={cls.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800 uppercase text-xs">{cls.name}</span>
                        <span className="text-[10px] text-slate-400">({cls.items.length} jenis pekerjaan)</span>
                      </div>
                      {cls.id.startsWith('custom-') && (
                        <button
                          onClick={() => handleDeleteClassification(cls.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold"
                          title="Hapus klasifikasi kustom ini"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">{cls.description}</p>
                    
                    {/* Items chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cls.items.map(it => (
                        <span key={it.id} className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center gap-1.5">
                          {it.name} • <strong className="text-emerald-800">{formatCurrency(it.defaultFee)}</strong>
                          {it.allowQuantity && (
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Qty/{it.unitLabel || 'Item'}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form: Tambah Klasifikasi Kustom Baru */}
            <form onSubmit={handleAddClassification} className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-3">
              <h4 className="text-xs font-black uppercase text-emerald-950 tracking-wider flex items-center gap-1.5">
                <Plus size={14} className="text-emerald-700" /> Tambah Klasifikasi Proyek Baru (Custom)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Nama Klasifikasi (Cth: Olimpiade, R&D)"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  className="bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                />
                <input
                  type="text"
                  placeholder="Keterangan singkat..."
                  value={newClassDesc}
                  onChange={e => setNewClassDesc(e.target.value)}
                  className="bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-950 hover:bg-emerald-900 text-gold-400 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition"
              >
                + Simpan Klasifikasi Baru
              </button>
            </form>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsCustomClassModalOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Official Standard A4 Printable Report */}
      {isReportModalOpen && (
        <ProjectRecapReportModal
          projects={filtered}
          tutors={tutors}
          classifications={activeClassList}
          settings={settings}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {/* Modal: Konfirmasi Hapus Permanen Tunggal */}
      {deletingProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center border border-slate-100 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-red-50 rounded-2xl mx-auto flex items-center justify-center text-red-600 mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Hapus Proyek Secara Permanen?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Pengajuan proyek <strong className="text-slate-800">{projects.find(p => p.id === deletingProjectId)?.type}</strong> akan dihapus secara <strong className="text-red-600">permanen</strong> dari sistem dan database Cloud. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeletingProjectId(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleSingleDelete(deletingProjectId)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider transition shadow-lg shadow-red-600/30 cursor-pointer active:scale-95"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Permanen Terpilih (Bulk) */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center border border-slate-100 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-red-100 rounded-2xl mx-auto flex items-center justify-center text-red-600 mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              Hapus Permanen {selectedIds.length} Proyek Terpilih?
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Anda akan menghapus <strong className="text-red-600 font-black">{selectedIds.length} pengajuan proyek</strong> yang dipilih secara <strong className="text-red-600">permanen</strong>. Data transaksi ini akan dihapus dari riwayat sistem dan tidak dapat dipulihkan.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider transition shadow-lg shadow-red-600/30 cursor-pointer active:scale-95"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cek & Edit Penuh Data Proyek Tutor (Hak Istimewa Admin) */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-950 to-slate-900 text-white p-6 relative">
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="absolute top-6 right-6 text-white/60 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X size={20} />
              </button>
              <span className="bg-gold-500/20 text-gold-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-gold-500/30">
                Hak Istimewa Admin • Cek & Edit Pengajuan Tutor
              </span>
              <h3 className="text-xl font-black uppercase tracking-tight text-white mt-2">
                Inspeksi & Edit Rincian Proyek, Kuantiti & Fee
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Periksa dan perbarui tutor pengaju, tanggal, klasifikasi, kuantiti, tarif satuan, tautan bukti, catatan admin, maupun status.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingProject) return;
                const cleanQty = Math.max(1, Number(editingProject.quantity) || 1);
                const normalizedProject: Project = {
                  ...editingProject,
                  quantity: cleanQty,
                  unit_label: (editingProject.unit_label || 'Item').trim() || 'Item',
                  unit_fee: editingProject.unit_fee !== undefined
                    ? Number(editingProject.unit_fee) || 0
                    : Math.round((Number(editingProject.fee) || 0) / cleanQty),
                  fee: Number(editingProject.fee) || 0
                };
                onUpdate(projects.map(p => p.id === normalizedProject.id ? normalizedProject : p));
                setEditingProject(null);
              }}
              className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scroll"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Tutor Pengaju
                  </label>
                  <select
                    value={editingProject.tutor_wa}
                    onChange={e => setEditingProject({ ...editingProject, tutor_wa: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 outline-none cursor-pointer"
                  >
                    {tutors.filter(t => t.role === 'TUTOR').map(t => (
                      <option key={t.id || t.wa} value={t.wa || t.username}>
                        {t.name} ({t.wa || t.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Tanggal Pengajuan
                  </label>
                  <input
                    type="text"
                    value={editingProject.date || ''}
                    onChange={e => setEditingProject({ ...editingProject, date: e.target.value })}
                    placeholder="DD/MM/YYYY atau YYYY-MM-DD"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Klasifikasi Proyek
                  </label>
                  <select
                    value={editingProject.classification || 'Modul'}
                    onChange={e => setEditingProject({ ...editingProject, classification: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 outline-none cursor-pointer"
                  >
                    {activeClassList.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Jenis / Nama Proyek
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProject.type}
                    onChange={e => setEditingProject({ ...editingProject, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 outline-none"
                    placeholder="Contoh: Pembuatan Modul Ajar Baru / Video Reels"
                  />
                </div>
              </div>

              {/* Kuantiti, Satuan, Fee per Unit, dan Total Fee */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-3">
                <span className="text-[10px] font-black uppercase text-indigo-950 block">
                  Kalkulasi Kuantiti & Honor Proyek
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[9px] font-black text-indigo-900 uppercase mb-1">Kuantiti (Qty)</label>
                    <input
                      type="number"
                      min={1}
                      value={editingProject.quantity || 1}
                      onChange={e => {
                        const nextQty = Math.max(1, parseInt(e.target.value) || 1);
                        const prevQty = Math.max(1, Number(editingProject.quantity) || 1);
                        const currentUnitFee = editingProject.unit_fee !== undefined
                          ? Number(editingProject.unit_fee) || 0
                          : Math.round((Number(editingProject.fee) || 0) / prevQty);
                        setEditingProject({
                          ...editingProject,
                          quantity: nextQty,
                          unit_fee: currentUnitFee,
                          fee: currentUnitFee * nextQty
                        });
                      }}
                      className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-indigo-900 uppercase mb-1">Satuan</label>
                    <input
                      type="text"
                      value={editingProject.unit_label || 'Item'}
                      onChange={e => setEditingProject({ ...editingProject, unit_label: e.target.value })}
                      placeholder="Item / Video"
                      className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-indigo-900 uppercase mb-1">Fee / Satuan (Rp)</label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={editingProject.unit_fee !== undefined
                        ? editingProject.unit_fee
                        : Math.round((Number(editingProject.fee) || 0) / Math.max(1, Number(editingProject.quantity) || 1))}
                      onChange={e => {
                        const nextUnitFee = parseInt(e.target.value) || 0;
                        const qty = Math.max(1, Number(editingProject.quantity) || 1);
                        setEditingProject({
                          ...editingProject,
                          unit_fee: nextUnitFee,
                          fee: nextUnitFee * qty
                        });
                      }}
                      className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-emerald-900 uppercase mb-1">Total Fee Final (Rp)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={1000}
                      value={editingProject.fee}
                      onChange={e => setEditingProject({ ...editingProject, fee: parseInt(e.target.value) || 0 })}
                      className="w-full bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-emerald-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  Tautan Bukti / Google Drive / URL Hasil Kerja
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingProject.file_url || ''}
                    onChange={e => setEditingProject({ ...editingProject, file_url: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-emerald-600 outline-none"
                  />
                  {editingProject.file_url && (
                    <a
                      href={editingProject.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink size={12} /> Cek Link
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  Deskripsi / Keterangan Proyek dari Tutor
                </label>
                <textarea
                  rows={3}
                  value={editingProject.desc || ''}
                  onChange={e => setEditingProject({ ...editingProject, desc: e.target.value })}
                  placeholder="Catatan hasil pengerjaan proyek..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:bg-white focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-amber-800 uppercase tracking-wider mb-1">
                  Catatan Verifikasi / Koreksi Admin (Opsional — Terlihat oleh Tutor)
                </label>
                <input
                  type="text"
                  value={editingProject.admin_note || ''}
                  onChange={e => setEditingProject({ ...editingProject, admin_note: e.target.value })}
                  placeholder="Contoh: Disetujui 3 video, honor disesuaikan..."
                  className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  Status Peninjauan
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Belum ditinjau', 'Diterima', 'Ditolak'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditingProject({ ...editingProject, status: st })}
                      className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase transition border cursor-pointer ${
                        editingProject.status === st
                          ? st === 'Diterima' ? 'bg-emerald-950 text-gold-400 border-emerald-900 shadow-sm'
                            : st === 'Ditolak' ? 'bg-red-950 text-red-200 border-red-900 shadow-sm'
                            : 'bg-amber-950 text-amber-200 border-amber-900 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-gold-400 font-black uppercase text-[10px] tracking-wider transition shadow-md cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <Check size={14} /> Simpan Perubahan Proyek
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <FormatTemplateModal
        domain={showFormatModal ? 'PROJECTS' : null}
        onClose={() => setShowFormatModal(false)}
        showToast={showToast}
      />
    </div>
  );
}
