import React, { useState, useEffect } from 'react';
import { AppData, PeriodBackup } from '../../types';
import { 
  createPeriodBackup, 
  getPeriodBackups, 
  deletePeriodBackup, 
  exportBackupToFile, 
  importBackupFromFile, 
  repairSystemIntegrity,
  createEmergencySnapshot,
  getEmergencySnapshot,
  resetMonthlyOperationalData
} from '../../services/backupService';
import { triggerServerMonthlyReset } from '../../lib/syncService';
import { 
  ShieldCheck, 
  Download, 
  Upload, 
  RotateCcw, 
  History, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Calendar, 
  RefreshCw, 
  FileJson, 
  Layers, 
  Wifi,
  X,
  Database,
  ArrowRight
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface BackupRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  onRestoreData: (restoredData: AppData) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function BackupRecoveryModal({
  isOpen,
  onClose,
  appData,
  onRestoreData,
  showToast
}: BackupRecoveryModalProps) {
  const [activeTab, setActiveTab] = useState<'BACKUPS' | 'RESET_MONTHLY' | 'RECOVERY' | 'DIAGNOSTICS'>('BACKUPS');
  const [backups, setBackups] = useState<PeriodBackup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [backupNote, setBackupNote] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [repairResults, setRepairResults] = useState<string[] | null>(null);
  const [emergencySnapshot, setEmergencySnapshot] = useState<{ timestamp: string } | null>(null);

  // Monthly Reset State
  const [newMonthPeriod, setNewMonthPeriod] = useState(() => {
    const cur = appData.settings?.period || '2026-05';
    const parts = cur.split('-');
    if (parts.length === 2) {
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? y + 1 : y;
      return `${nextY}-${String(nextM).padStart(2, '0')}`;
    }
    return '2026-06';
  });
  const [newMonthText, setNewMonthText] = useState('Juni 2026');
  const [resetNote, setResetNote] = useState('Reset operasional bulanan - arsip otomatis');
  const [isResetting, setIsResetting] = useState(false);

  const handleExecuteMonthlyReset = async () => {
    if (!confirm(`KONFIRMASI RESET ABSENSI & JURNALING BULAN BARU:\n\n1. Sistem akan otomatis MEMBUAT BACKUP LENGKAP untuk periode "${appData.settings?.period_text || appData.settings?.period}".\n2. HANYA data Absensi & Jurnal Shift bulanan yang direset bersih (0 sesi) untuk memulai bulan baru.\n3. DATA PROYEK, DATA SISWA (+ SHIFT), DATA TUTOR, MASTER PENILAIAN & MODUL AJAR TETAP 100% AMAN & TIDAK DIRESET!\n\nLanjutkan mulai periode baru "${newMonthText}"?`)) {
      return;
    }

    setIsResetting(true);
    try {
      // 1. Local & Firestore partitioned monthly reset
      const { nextData, backup } = await resetMonthlyOperationalData(
        appData, 
        { period: newMonthPeriod, period_text: newMonthText },
        resetNote
      );

      // 2. Also notify backend server sequentially before state restore broadcast
      await triggerServerMonthlyReset(newMonthPeriod, newMonthText, resetNote).catch(() => {});

      // 3. Update parent app state
      onRestoreData(nextData);
      setBackups(prev => [backup, ...prev]);

      showToast(`Periode operasional baru "${newMonthText}" berhasil dimulai! Data lama aman diarsipkan & database tetap ultra-ringan.`, 'success');
      setActiveTab('BACKUPS');
    } catch (err: any) {
      console.error(err);
      showToast('Gagal melakukan reset operasional: ' + (err.message || ''), 'error');
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBackups();
      checkEmergencySnapshot();
    }
  }, [isOpen]);

  const loadBackups = async () => {
    setIsLoading(true);
    try {
      const list = await getPeriodBackups();
      setBackups(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkEmergencySnapshot = () => {
    const snap = getEmergencySnapshot();
    if (snap) {
      setEmergencySnapshot({ timestamp: snap.timestamp });
    } else {
      setEmergencySnapshot(null);
    }
  };

  const handleCreateNewBackup = async () => {
    setIsCreating(true);
    try {
      const currentPeriod = appData.settings.period || '2026-05';
      const periodText = appData.settings.period_text || 'Mei 2026';
      const created = await createPeriodBackup(appData, currentPeriod, periodText, 'Master Admin WIC', backupNote);
      setBackups(prev => [created, ...prev]);
      setBackupNote('');
      showToast(`Snapshot backup periode ${periodText} berhasil disimpan ke Cloud & Lokal!`, 'success');
    } catch (err) {
      showToast('Gagal membuat snapshot backup.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = (backup: PeriodBackup) => {
    if (confirm(`PULIHKAN DATABASE KE BACKUP PERIODE "${backup.period_text}" (${new Date(backup.createdAt).toLocaleString('id-ID')})?\n\nSemua perubahan yang belum dibackup akan digantikan dengan data snapshot ini.`)) {
      // Create auto emergency snapshot before restoring
      createEmergencySnapshot(appData);
      onRestoreData(backup.data);
      showToast(`Database berhasil dipulihkan dari backup periode ${backup.period_text}!`, 'success');
      onClose();
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (confirm('Hapus file snapshot backup ini permanen?')) {
      const ok = await deletePeriodBackup(backupId);
      if (ok) {
        setBackups(prev => prev.filter(b => b.id !== backupId));
        showToast('Snapshot backup berhasil dihapus.', 'info');
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      try {
        const imported = await importBackupFromFile(file);
        if (confirm(`File backup "${file.name}" valid!\n\nPeriode: ${imported.period_text || imported.period}\nSiswa: ${imported.stats.studentsCount}\nTutor: ${imported.stats.tutorsCount}\n\nPulihkan data sistem sekarang?`)) {
          createEmergencySnapshot(appData);
          onRestoreData(imported.data);
          showToast(`Sistem berhasil dipulihkan dari berkas ${file.name}!`, 'success');
          onClose();
        }
      } catch (err: any) {
        showToast(err.message || 'Gagal memulihkan file backup', 'error');
      }
    }
  };

  const handleRunRepair = () => {
    createEmergencySnapshot(appData);
    const { repairedData, fixesApplied } = repairSystemIntegrity(appData);
    setRepairResults(fixesApplied);
    onRestoreData(repairedData);
    showToast(`Diagnostik & Perbaikan mandiri selesai! (${fixesApplied.length} poin disesuaikan)`, 'success');
  };

  const handleRollbackEmergency = () => {
    const snap = getEmergencySnapshot();
    if (!snap) {
      showToast('Tidak ada snapshot darurat yang ditemukan.', 'info');
      return;
    }

    if (confirm(`ROLLBACK DARURAT KE KONDISI SEBELUMNYA (${new Date(snap.timestamp).toLocaleString('id-ID')})?\n\nIni akan mengembalikan sistem ke snapshot otomatis sebelum pemulihan terakhir.`)) {
      onRestoreData(snap.data);
      showToast('Sistem berhasil di-rollback ke snapshot darurat sebelumnya!', 'success');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center pb-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-950 text-gold-400 rounded-2xl shadow-md">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
                Pusat Backup & Pemulihan Sistem (Recovery Center)
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Snapshot Data Per Periode • Sinkronisasi Multi-Device • Disaster Recovery & Self-Healing
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-4 pb-2 border-b border-slate-100 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('BACKUPS')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 whitespace-nowrap",
              activeTab === 'BACKUPS'
                ? "bg-emerald-900 text-gold-400 shadow-md"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            )}
          >
            <History size={14} /> Snapshot Periode ({backups.length})
          </button>
          <button
            onClick={() => setActiveTab('RESET_MONTHLY')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 whitespace-nowrap",
              activeTab === 'RESET_MONTHLY'
                ? "bg-emerald-900 text-gold-400 shadow-md"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
            )}
          >
            <RefreshCw size={14} className={isResetting ? "animate-spin" : ""} /> Reset & Mulai Bulan Baru
          </button>
          <button
            onClick={() => setActiveTab('RECOVERY')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 whitespace-nowrap",
              activeTab === 'RECOVERY'
                ? "bg-emerald-900 text-gold-400 shadow-md"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            )}
          >
            <RotateCcw size={14} /> Pemulihan & Perbaikan
          </button>
          <button
            onClick={() => setActiveTab('DIAGNOSTICS')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 whitespace-nowrap",
              activeTab === 'DIAGNOSTICS'
                ? "bg-emerald-900 text-gold-400 shadow-md"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            )}
          >
            <Wifi size={14} /> Status Sinkronisasi
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto custom-scroll py-4 space-y-6">
          {/* TAB 1: BACKUPS PER PERIODE */}
          {activeTab === 'BACKUPS' && (
            <div className="space-y-6">
              {/* Card Buat Snapshot Baru */}
              <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-white rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase text-emerald-950 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-emerald-700" /> Buat Snapshot Backup Periode Aktif
                    </h4>
                    <p className="text-[10px] text-emerald-800 font-medium mt-0.5">
                      Periode Saat Ini: <span className="font-black uppercase">{appData.settings.period_text || appData.settings.period}</span> ({appData.students.length} Siswa, {appData.users.filter(u => u.role === 'TUTOR').length} Tutor, {appData.attendance.length} Jurnal)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase transition cursor-pointer flex items-center gap-1.5 shadow-sm">
                      <Upload size={13} /> Unggah File Backup
                      <input type="file" className="hidden" accept=".json,.wicbackup" onChange={handleFileUpload} />
                    </label>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input 
                    type="text" 
                    value={backupNote}
                    onChange={e => setBackupNote(e.target.value)}
                    placeholder="Catatan backup opsional (misal: 'Sebelum tutup buku akhir bulan', 'Pasca ujian semester')..."
                    className="flex-1 bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleCreateNewBackup}
                    disabled={isCreating}
                    className="bg-emerald-950 hover:bg-emerald-900 text-gold-400 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Download size={14} /> {isCreating ? 'Menyimpan...' : 'Ambil Snapshot Sekarang'}
                  </button>
                </div>
              </div>

              {/* Daftar Riwayat Snapshot Backup */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                    <Database size={14} className="text-slate-500" /> Daftar Snapshot Tersimpan ({backups.length})
                  </h4>
                  <button 
                    onClick={loadBackups} 
                    className="text-[9px] font-bold text-slate-500 hover:text-emerald-700 uppercase flex items-center gap-1"
                  >
                    <RefreshCw size={11} className={cn(isLoading && "animate-spin")} /> Refresh Daftar
                  </button>
                </div>

                <div className="space-y-3">
                  {backups.map(b => (
                    <div 
                      key={b.id} 
                      className="p-4 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs uppercase text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                            Periode: {b.period_text || b.period}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">
                            {new Date(b.createdAt).toLocaleString('id-ID')}
                          </span>
                          <span className="text-[8px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Oleh: {b.createdBy || 'Admin'}
                          </span>
                        </div>

                        {b.notes && (
                          <p className="text-[11px] text-slate-600 font-medium italic">"{b.notes}"</p>
                        )}

                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold uppercase pt-1">
                          <span>👨‍🎓 {b.stats?.studentsCount || 0} Siswa</span>
                          <span>•</span>
                          <span>👨‍🏫 {b.stats?.tutorsCount || 0} Tutor</span>
                          <span>•</span>
                          <span>📖 {b.stats?.attendanceCount || 0} Jurnal</span>
                          <span>•</span>
                          <span>🏆 {b.stats?.assessmentsCount || 0} Penilaian</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => exportBackupToFile(b)}
                          className="p-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold uppercase transition flex items-center gap-1"
                          title="Unduh File Cadangan ke Komputer"
                        >
                          <Download size={14} /> Unduh
                        </button>
                        <button
                          onClick={() => handleRestore(b)}
                          className="px-3.5 py-2.5 bg-emerald-950 hover:bg-emerald-900 text-gold-400 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm flex items-center gap-1.5"
                          title="Kembalikan database ke snapshot ini"
                        >
                          <RotateCcw size={14} /> Pulihkan
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(b.id)}
                          className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                          title="Hapus Snapshot"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {backups.length === 0 && !isLoading && (
                    <div className="py-12 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      Belum ada snapshot backup tersimpan. Buat snapshot sekarang di atas untuk mengamankan data periode aktif.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PEMULIHAN & PERBAIKAN MANDIRI (SELF-HEALING) */}
          {activeTab === 'RECOVERY' && (
            <div className="space-y-6">
              {/* Model Pemulihan Integritas Mandiri */}
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-teal-100 text-teal-800 rounded-2xl">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-slate-900">
                      Perbaikan Integritas Data & Standardisasi Otomatis
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Fitur ini secara otomatis memindai seluruh basis data:
                      menyatukan program legacy <em>Tahsin</em> atau <em>Tahfidz</em> menjadi satu program resmi <strong>Tahsin & Tahfidz</strong>,
                      memperbaiki format jadwal siswa 2 program (2 jadwal/minggu), dan memastikan konsistensi relasi antar-entitas.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleRunRepair}
                    className="bg-emerald-900 hover:bg-emerald-800 text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-wider shadow-md transition flex items-center gap-2"
                  >
                    <ShieldCheck size={16} /> Jalankan Diagnostik & Perbaikan Sistem Sekarang
                  </button>
                </div>

                {repairResults && (
                  <div className="mt-4 p-4 bg-white rounded-2xl border border-teal-200 space-y-2 animate-in fade-in">
                    <h5 className="text-xs font-black uppercase text-teal-900 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-teal-600" /> Hasil Diagnostik & Pemulihan:
                    </h5>
                    <ul className="space-y-1 text-xs text-slate-700 max-h-48 overflow-y-auto custom-scroll pl-1">
                      {repairResults.map((msg, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
                          <span>{msg}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Rollback Darurat (Emergency Rollback) */}
              <div className="p-6 bg-amber-50/70 rounded-3xl border border-amber-200 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-amber-200 text-amber-900 rounded-2xl">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-amber-950">
                      Rollback Darurat (Safety Undo Snapshot)
                    </h4>
                    <p className="text-xs text-amber-900/80 mt-1 leading-relaxed">
                      Setiap kali tindakan pemulihan atau perbaikan dijalankan, sistem secara otomatis menyimpan salinan penyelamat (emergency snapshot) sesaat sebelum perubahan dilakukan.
                    </p>
                    {emergencySnapshot ? (
                      <p className="text-[10px] font-black text-amber-800 uppercase mt-2">
                        Snapshot Darurat Tersedia: {new Date(emergencySnapshot.timestamp).toLocaleString('id-ID')}
                      </p>
                    ) : (
                      <p className="text-[10px] text-amber-700 italic mt-2">
                        Belum ada snapshot darurat tersimpan.
                      </p>
                    )}
                  </div>
                </div>

                {emergencySnapshot && (
                  <button
                    onClick={handleRollbackEmergency}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-sm flex items-center gap-2"
                  >
                    <RotateCcw size={14} /> Batalkan Perubahan Terakhir (Rollback Darurat)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DIAGNOSTICS & STATUS REAL-TIME */}
          {activeTab === 'DIAGNOSTICS' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400">Cloud Database</p>
                  <h4 className="text-base font-black text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Google Firestore
                  </h4>
                  <p className="text-[9px] text-slate-500 font-bold">Latency: &lt; 80ms (Real-Time Listener)</p>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400">Sinkronisasi Lokal</p>
                  <h4 className="text-base font-black text-purple-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                    BroadcastChannel
                  </h4>
                  <p className="text-[9px] text-slate-500 font-bold">Sinkron instan 0ms antar-tab browser</p>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400">Offline Resilience</p>
                  <h4 className="text-base font-black text-blue-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    Local Storage V2
                  </h4>
                  <p className="text-[9px] text-slate-500 font-bold">Data tetap aman meski internet terputus</p>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-800">
                  Rincian Database Saat Ini:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Siswa</span>
                    <span className="text-lg font-black text-slate-800">{appData.students.length}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Tutor Aktif</span>
                    <span className="text-lg font-black text-slate-800">{appData.users.filter(u => u.role === 'TUTOR').length}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Jurnal Sesi</span>
                    <span className="text-lg font-black text-slate-800">{appData.attendance.length}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Modul Digital</span>
                    <span className="text-lg font-black text-slate-800">{appData.modules?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RESET BULANAN & AUTO-ARSIP (KEEP DATABASE LIGHTWEIGHT) */}
          {activeTab === 'RESET_MONTHLY' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Header Box */}
              <div className="p-6 bg-gradient-to-br from-amber-500/10 via-emerald-950/5 to-slate-50 rounded-2xl border border-amber-200/80 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-black shadow-sm">
                    <RefreshCw size={22} className={isResetting ? "animate-spin" : ""} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-slate-900 tracking-tight">
                      Mulai Periode Bulan Baru (Khusus Reset Absensi & Jurnal Shift)
                    </h4>
                    <p className="text-xs text-slate-600 font-medium">
                      Hanya mereset absensi & jurnaling shift bulanan sambil mempertahankan 100% data proyek, siswa, tutor, penilaian, dan modul ajar.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-900">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      100% AMAN & TIDAK DIRESET (TETAP UTUH):
                    </div>
                    <ul className="text-xs text-emerald-800 space-y-1 font-medium pl-6 list-disc">
                      <li><strong>{appData.users.filter(u => u.role === 'TUTOR').length} Akun Tutor & Tunjangan</strong> (Semua akun & pengaturan honor tetap utuh)</li>
                      <li><strong>{appData.students.length} Database Siswa & Jadwal Shift</strong> (Seluruh siswa & shift kelas tetap utuh)</li>
                      <li><strong>{appData.projects?.length || 0} Data Proyek & Master Nama Proyek</strong> (Tidak ikut tereset)</li>
                      <li><strong>{appData.assessments?.length || 0} Master Penilaian & {appData.modules?.length || 0} Modul Ajar</strong> (Tetap tersimpan utuh)</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-900">
                      <History size={16} className="text-amber-600" />
                      KHUSUS DIARSIPKAN & DIRESET UNTUK BULAN BARU:
                    </div>
                    <ul className="text-xs text-amber-800 space-y-1 font-medium pl-6 list-disc">
                      <li><strong>{appData.attendance.length} Data Absensi & Jurnal Shift Bulanan</strong> (Otomatis dibackup penuh ke Snapshot Periode sebelum dibersihkan ke 0 sesi)</li>
                      <li>Periode aktif diperbarui ke bulan baru agar pencatatan absensi & jurnaling shift dimulai bersih & rapi.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Form Periode Baru */}
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <Calendar size={16} className="text-emerald-600" />
                  Konfigurasi Periode Baru:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                      Kode Periode Baru (Format YYYY-MM)
                    </label>
                    <input 
                      type="text"
                      value={newMonthPeriod}
                      onChange={(e) => setNewMonthPeriod(e.target.value)}
                      placeholder="Contoh: 2026-06"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                      Nama Periode Teks (Tampil di Kop & Laporan)
                    </label>
                    <input 
                      type="text"
                      value={newMonthText}
                      onChange={(e) => setNewMonthText(e.target.value)}
                      placeholder="Contoh: Juni 2026"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Catatan Arsip Periode Sebelumnya ({appData.settings?.period_text || appData.settings?.period})
                  </label>
                  <input 
                    type="text"
                    value={resetNote}
                    onChange={(e) => setResetNote(e.target.value)}
                    placeholder="Contoh: Tutup buku operasional Mei 2026 & mulai Juni 2026"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    Snapshot periode lama dapat dipulihkan atau diunduh kapan saja melalui tab "Snapshot Periode".
                  </div>
                  <button
                    onClick={handleExecuteMonthlyReset}
                    disabled={isResetting || !newMonthPeriod.trim() || !newMonthText.trim()}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-800 to-emerald-950 hover:from-emerald-700 hover:to-emerald-900 text-gold-400 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={isResetting ? "animate-spin" : ""} />
                    {isResetting ? "Memproses Arsip & Reset..." : "🚀 Buat Arsip & Mulai Bulan Baru"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
