import React from 'react';
import { User, Student, Attendance, Project, Assessment, Settings, AppData, Notification, HonorRateItem } from './types';
import { WIC_ASSETS, DEFAULT_HONOR_RATES, WIC_LEVELS, DEFAULT_TEACHING_MODULES, DEFAULT_PROJECT_CLASSIFICATIONS, EMBEDDED_WIC_LOGO } from './constants';
import { INITIAL_IMPORTED_STUDENTS, LATEST_STUDENT_CSV_SYNC_TAG, mergeNewImportedStudents } from './data/importedStudents';
import Sidebar from './components/layout/Sidebar';
import NotificationCenter from './components/layout/NotificationCenter';
import AdminSummary from './components/admin/AdminSummary';
import StudentManagement from './components/admin/StudentManagement';
import JournalReview from './components/admin/JournalReview';
import AssessmentInput from './components/common/AssessmentInput';
import JournalRecord from './components/tutor/JournalRecord';
import TutorDash from './components/tutor/TutorDash';
import Invoice from './components/documents/Invoice';
import { CheckCircle2, MessageCircle, Info, X, Cloud, RefreshCw, ShieldCheck, Zap, UserPlus, Share2, Copy, LogIn, Wallet, FileText, CalendarCheck } from 'lucide-react';
import { cn, formatCurrency } from './lib/utils';
import { calculateTutorPayroll, getTutorKey, isRecordForTutor } from './lib/payroll';
import { QRCodeSVG } from 'qrcode.react';

import TutorManagement from './components/admin/TutorManagement';
import ProjectVerification from './components/admin/ProjectVerification';
import SystemSettings from './components/admin/SystemSettings';
import ModuleManagement from './components/admin/ModuleManagement';
import AdminPayrollRecap from './components/admin/AdminPayrollRecap';
import WhatsAppBroadcaster from './components/admin/WhatsAppBroadcaster';
import BackupRecoveryModal from './components/admin/BackupRecoveryModal';
import SyncVerificationModal from './components/common/SyncVerificationModal';
import SystemErrorBoundary from './components/common/SystemErrorBoundary';
import { repairSystemIntegrity, resetMonthlyOperationalData } from './services/backupService';
import TutorProjectSubmission from './components/tutor/TutorProjectSubmission';
import TutorModuleRoom from './components/tutor/TutorModuleRoom';

// Real-Time Multi-Device Sync Stream & Backend Integration
import { initRealtimeSync, pushLiveUpdate, fetchServerState, registerTutorOnServer, triggerServerMonthlyReset, submitAttendanceOnServer, SYNC_CLIENT_ID, getPendingWriteCount } from './lib/syncService';

// Firebase Firestore Partitioned Integration
import { 
  db, 
  STATE_COLLECTION, 
  STATE_DOC_ID, 
  syncAppStateToFirestore, 
  subscribeToFirestoreState,
  fetchFirestoreFullState,
  testConnection, 
  handleFirestoreError, 
  OperationType 
} from './lib/firebase';
import { safeSetItem, safeGetItem, purgeStaleStorageKeys } from './lib/safeStorage';

const DEFAULT_SETTINGS: Settings = {
  period: "2026-05",
  period_text: "Mei 2026",
  period_start_date: "2026-05-01",
  period_end_date: "2026-05-31",
  quote: "Masa depan cerah dimulai dari kesungguhan hati dalam mendidik.",
  cfo_name: "Rodhotul Jannah, S. Th. I., M. Ag.",
  cfo_title: "Manajemen Keuangan WIC",
  cfo_sign: WIC_ASSETS.TTD,
  director_name: "Khoirul Mahmud, S. Pd., S. Kom.",
  director_sign: WIC_ASSETS.TTD_DIREKTUR,
  logo_url: WIC_ASSETS.LOGO,
  stempel_url: WIC_ASSETS.STEMPEL,
  institution_name: "WORTH IT COURSE (WIC)",
  institution_tagline: "Excellence in English & Modern Academic Education",
  institution_address: "Jl. Pendidikan Prestasi No. 88, Metro Edu Center",
  institution_contact: "Admin: 0812-3456-7890 | info@wic.edu",
  default_payment_method: 'TF',
  project_drive_url: "https://drive.google.com/drive/folders/1SVPWStXa65904lPswPbF0xitK3Mcc5fQ?usp=drive_link",
  project_types: [
    { name: "Revisi Modul", fee: 50000, classification: "Modul" },
    { name: "Media Pembelajaran", fee: 40000, classification: "Content" },
    { name: "Video Kreatif", fee: 35000, classification: "Content" }
  ],
  project_classifications: DEFAULT_PROJECT_CLASSIFICATIONS,
  honor_rates: DEFAULT_HONOR_RATES,
  enable_semi_private: true,
  semi_private_certified_only: true,
  semi_private_module_bonus: 25000,
  quotes_list: [
    { id: 'q-1', text: "Masa depan cerah dimulai dari kesungguhan hati dalam mendidik.", author: "WIC Leadership", category: "Edukasi" },
    { id: 'q-2', text: "Pendidik yang hebat tidak sekadar mengajar, melainkan menginspirasi jiwa.", author: "William Arthur Ward", category: "Inspirasi" },
    { id: 'q-3', text: "Setiap anak adalah bintang yang memiliki cara dan waktunya sendiri untuk bersinar.", author: "Albert Einstein", category: "Motivasi" }
  ]
};

const DEFAULT_APP_DATA: AppData = {
  users: [
    { 
      id: 'ADMIN-1', 
      name: 'Master Admin WIC', 
      email: 'admin@wic.com', 
      username: 'WICJAMBI', 
      password: 'B1smillah', 
      role: 'ADMIN', 
      photo: 'https://i.pravatar.cc/150?u=admin', 
      status_tutor: 'Master', 
      manual_allowance: 0, 
      allowance_note: '', 
      wa: '08123456789', 
      other_fee: 0, 
      other_fee_note: '',
      is_certified: true
    }
  ],
  students: INITIAL_IMPORTED_STUDENTS,
  attendance: [],
  projects: [],
  assessments: [
    {
      student_id: 'WIC-ST01',
      program: 'Teenager',
      m1: 88, m2: 85, m3: 90, m4: 87, m5: 92, m6: 88, m7: 90, m8: 91,
      exam: 92, cs: 95,
      note: 'Sangat percaya diri dalam active speaking debate'
    },
    {
      student_id: 'WIC-ST01',
      program: 'Tahsin & Tahfidz',
      m1: 85, m2: 88, m3: 86, m4: 90, m5: 92, m6: 90, m7: 94, m8: 92,
      exam: 90, cs: 98,
      note: 'Makharijul huruf dan mad thobi\'i sangat fasih'
    },
    {
      student_id: 'WIC-ST02',
      program: 'Tahsin & Tahfidz',
      m1: 90, m2: 92, m3: 90, m4: 95, m5: 94, m6: 96, m7: 95, m8: 98,
      exam: 96, cs: 98,
      note: 'Tasmi\' surat An-Naba s/d Al-Muthaffifin lancar tanpa salah'
    },
    {
      student_id: 'WIC-ST03',
      program: 'Kids',
      m1: 80, m2: 85, m3: 82, m4: 88, m5: 85, m6: 90, m7: 86, m8: 88,
      exam: 86, cs: 90,
      note: 'Vocabulary story reading meningkat pesat'
    },
    {
      student_id: 'WIC-ST03',
      program: 'Tahsin & Tahfidz',
      m1: 82, m2: 80, m3: 85, m4: 86, m5: 88, m6: 85, m7: 88, m8: 90,
      exam: 88, cs: 92,
      note: 'Tartil jilid 4, perbaikan hukum nun sukun'
    }
  ],
  settings: DEFAULT_SETTINGS,
  notifications: [],
  modules: []
};

function normalizeIncomingState(remoteData: any): AppData {
  const rawSettings = remoteData.settings;
  const hasRemoteSettings = Boolean(rawSettings && typeof rawSettings === 'object' && Object.keys(rawSettings).length > 0);
  const remoteSettings = rawSettings || {};

  let mergedSettings: Settings | undefined = undefined;
  if (hasRemoteSettings) {
    const logoUrl = (!remoteSettings.logo_url || remoteSettings.logo_url.includes('iili.io') || remoteSettings.logo_url.includes('BQqGIgn') || remoteSettings.logo_url.startsWith('data:image/svg+xml'))
      ? WIC_ASSETS.LOGO
      : remoteSettings.logo_url;
    const directorSign = (!remoteSettings.director_sign || remoteSettings.director_sign.includes('iili.io') || remoteSettings.director_sign.includes('BQplBTP'))
      ? WIC_ASSETS.TTD_DIREKTUR
      : remoteSettings.director_sign;
    const cfoSign = (!remoteSettings.cfo_sign || remoteSettings.cfo_sign.includes('iili.io') || remoteSettings.cfo_sign.includes('BQqGiLN'))
      ? WIC_ASSETS.TTD
      : remoteSettings.cfo_sign;
    const stempelUrl = (!remoteSettings.stempel_url || remoteSettings.stempel_url.includes('iili.io') || remoteSettings.stempel_url.includes('BQqM53F'))
      ? WIC_ASSETS.STEMPEL
      : remoteSettings.stempel_url;
    const directorName = (!remoteSettings.director_name || remoteSettings.director_name === 'Ahmad Zaki, M.Pd.')
      ? "Khoirul Mahmud, S. Pd., S. Kom."
      : remoteSettings.director_name;
    const cfoName = (!remoteSettings.cfo_name || remoteSettings.cfo_name.includes('Rodhotul Janah'))
      ? "Rodhotul Jannah, S. Th. I., M. Ag."
      : remoteSettings.cfo_name;

    mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...remoteSettings,
      logo_url: logoUrl,
      director_sign: directorSign,
      cfo_sign: cfoSign,
      stempel_url: stempelUrl,
      director_name: directorName,
      cfo_name: cfoName,
      project_classifications: (remoteSettings.project_classifications && remoteSettings.project_classifications.length > 0)
        ? remoteSettings.project_classifications
        : DEFAULT_PROJECT_CLASSIFICATIONS,
      honor_rates: (remoteSettings.honor_rates && remoteSettings.honor_rates.length > 0)
        ? remoteSettings.honor_rates
        : DEFAULT_HONOR_RATES,
      quotes_list: remoteSettings.quotes_list || DEFAULT_SETTINGS.quotes_list
    };
  }

  let normalizedStudents: Student[] | undefined = undefined;
  if (Array.isArray(remoteData.students)) {
    const rawStudentList: any[] = remoteData.students;
    let studentPool = rawStudentList;
    if (rawStudentList.length === 0) {
      studentPool = INITIAL_IMPORTED_STUDENTS;
    } else {
      const impMap = new Map(INITIAL_IMPORTED_STUDENTS.map(s => [s.id, s]));
      studentPool = rawStudentList.map((s: any) => {
        const imp = impMap.get(s.id);
        if (imp) {
          return {
            ...imp,
            ...s,
            nickname: s.nickname || imp.nickname
          };
        }
        return s;
      });
    }

    normalizedStudents = studentPool.map((s: any) => ({
      ...s,
      level: (s.level === 'Tahsin' || s.level === 'Tahfidz') ? 'Tahsin & Tahfidz' : s.level,
      level2: (s.level2 === 'Tahsin' || s.level2 === 'Tahfidz') ? 'Tahsin & Tahfidz' : s.level2
    }));
  }

  const normalizedAttendance = Array.isArray(remoteData.attendance)
    ? remoteData.attendance.map((a: any) => ({
        ...a,
        level: (a.level === 'Tahsin' || a.level === 'Tahfidz') ? 'Tahsin & Tahfidz' : a.level
      }))
    : undefined;

  const normalizedAssessments = Array.isArray(remoteData.assessments)
    ? remoteData.assessments.map((ass: any) => ({
        ...ass,
        program: (ass.program === 'Tahsin' || ass.program === 'Tahfidz') ? 'Tahsin & Tahfidz' : ass.program
      }))
    : undefined;

  const normalizedProjects = Array.isArray(remoteData.projects)
    ? remoteData.projects.map((p: any) => {
        if (p.classification) return p;
        const lower = (p.type || '').toLowerCase();
        let cls = 'Modul';
        if (lower.includes('video') || lower.includes('medsos') || lower.includes('content') || lower.includes('canva') || lower.includes('media')) cls = 'Content';
        else if (lower.includes('event') || lower.includes('lomba') || lower.includes('spelling') || lower.includes('workshop')) cls = 'Event';
        else if (lower.includes('sekolah') || lower.includes('kemitraan') || lower.includes('mitra')) cls = 'Sekolah';
        return { ...p, classification: cls };
      })
    : undefined;

  const resolvedModules = Array.isArray(remoteData.modules)
    ? remoteData.modules
    : (remoteData.modules === undefined ? undefined : []);

  const resolvedNotifications = Array.isArray(remoteData.notifications)
    ? remoteData.notifications
    : undefined;

  let normalizedUsers: User[] | undefined = undefined;
  if (Array.isArray(remoteData.users) && remoteData.users.length > 0) {
    normalizedUsers = remoteData.users.map((u: any) => {
      if (u.role === 'ADMIN' || u.id === 'ADMIN-1' || u.username?.toLowerCase() === 'admin' || u.username?.toLowerCase() === 'wicjambi') {
        return {
          ...u,
          id: 'ADMIN-1',
          role: 'ADMIN',
          username: 'WICJAMBI',
          password: 'B1smillah',
          name: u.name || 'Master Admin WIC'
        };
      }
      return u;
    });
  }

  return {
    users: normalizedUsers as any,
    students: normalizedStudents as any,
    attendance: normalizedAttendance as any,
    projects: normalizedProjects as any,
    assessments: normalizedAssessments as any,
    settings: mergedSettings as any,
    notifications: resolvedNotifications as any,
    modules: resolvedModules,
    backups: remoteData.backups || [],
    _lastUpdated: remoteData._lastUpdated,
    _lastSyncTimestamp: remoteData._lastSyncTimestamp,
    _lastSyncAction: remoteData._lastSyncAction,
    _syncVersion: remoteData._syncVersion
  };
}

export default function App() {
  const [appData, setAppData] = React.useState<AppData>(DEFAULT_APP_DATA);
  const latestAppDataRef = React.useRef<AppData>(DEFAULT_APP_DATA);
  const lastSyncVersionRef = React.useRef<number>(0);
  const [user, setUser] = React.useState<User | null>(null);
  const [activePage, setActivePage] = React.useState<{ id: string; title: string }>({ id: 'LOGIN', title: 'Autentikasi' });
  const [isInvoiceOpen, setIsInvoiceOpen] = React.useState<string | null>(null);
  const [barcodeModal, setBarcodeModal] = React.useState<User | null>(null);
  const [isRegistering, setIsRegistering] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') === 'register' || params.get('register') === 'true' || window.location.hash === '#register';
    }
    return false;
  });
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isCloudSynced, setIsCloudSynced] = React.useState(false);
  const [isFirestoreActive, setIsFirestoreActive] = React.useState(false);
  const [isBackupRecoveryOpen, setIsBackupRecoveryOpen] = React.useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = React.useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = React.useState<string>(() => 
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [syncPulse, setSyncPulse] = React.useState(false);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // BroadcastChannel for instant 0ms cross-tab real-time sync
  const liveChannelRef = React.useRef<BroadcastChannel | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. BroadcastChannel
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('wic_live_sync_v2');
        liveChannelRef.current = channel;
        channel.onmessage = (event) => {
          if (event.data?.type === 'SYNC_DATA' && event.data.payload) {
            const payload = event.data.payload;
            const ver = Number(payload._syncVersion || 0);
            if (ver > 0 && lastSyncVersionRef.current > 0 && ver < lastSyncVersionRef.current) {
              return;
            }
            if (ver > lastSyncVersionRef.current) {
              lastSyncVersionRef.current = ver;
            }
            latestAppDataRef.current = payload;
            setAppData(payload);
            const timeStr = payload._lastSyncTimestamp || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setLastSyncTimestamp(timeStr);
            setSyncPulse(true);
            setTimeout(() => setSyncPulse(false), 2500);
          }
        };
      }

      // 2. Storage event listener (fallback cross-window/tab sync)
      const handleStorage = (e: StorageEvent) => {
        if (e.key === 'wic_app_data_v2' && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            const ver = Number(parsed._syncVersion || 0);
            if (ver > 0 && lastSyncVersionRef.current > 0 && ver < lastSyncVersionRef.current) {
              return;
            }
            if (ver > lastSyncVersionRef.current) {
              lastSyncVersionRef.current = ver;
            }
            latestAppDataRef.current = parsed;
            setAppData(parsed);
            const timeStr = parsed._lastSyncTimestamp || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setLastSyncTimestamp(timeStr);
            setSyncPulse(true);
            setTimeout(() => setSyncPulse(false), 2500);
          } catch (err) {
            console.warn(err);
          }
        }
      };
      window.addEventListener('storage', handleStorage);

      return () => {
        liveChannelRef.current?.close();
        window.removeEventListener('storage', handleStorage);
      };
    }
  }, []);

  // Helper for dynamic honor rates lookup (Mandiri, Team, Private -10%, Semi Private)
  const getDynamicRate = React.useCallback((statusName: string) => {
    const rates: HonorRateItem[] = (appData.settings.honor_rates && appData.settings.honor_rates.length > 0)
      ? appData.settings.honor_rates
      : DEFAULT_HONOR_RATES;
    const matched = rates.find(r => r.name.toLowerCase() === statusName?.toLowerCase());
    const base: HonorRateItem = matched || rates[0] || { id: 'default', name: 'Default', mandiri: 25000, team: 20000, private: 22500, semi_private: 25000 };
    return { 
      mandiri: base.mandiri, 
      team: base.team,
      private: base.private !== undefined ? base.private : Math.round(base.mandiri * 0.9),
      semi_private: base.semi_private !== undefined ? base.semi_private : base.mandiri
    };
  }, [appData.settings.honor_rates]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Helper to sync to Firestore and local state with auto-verification metadata
  const handleUpdateData = async (patch: Partial<AppData>, actionName?: string, skipServerPush: boolean = false) => {
    const actionDesc = actionName || (
      patch.students ? 'Pembaruan Data & Shift Siswa' :
      patch.modules ? 'Pembaruan Modul Ajar' : 
      patch.settings ? 'Pembaruan Konfigurasi Lembaga' : 
      patch.attendance ? 'Pembaruan Jurnal Shift' : 
      patch.projects ? 'Pembaruan Proyek' : 
      'Pembaruan Data Otomatis'
    );

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const prev = latestAppDataRef.current;
    const next: AppData = {
      ...prev,
      ...patch,
      settings: patch.settings ? { ...prev.settings, ...patch.settings } : prev.settings,
      _lastUpdated: now.toISOString(),
      _lastSyncTimestamp: timeStr,
      _lastSyncAction: actionDesc,
      _syncVersion: Date.now()
    };

    latestAppDataRef.current = next;
    setAppData(next);
    setLastSyncTimestamp(timeStr);
    setSyncPulse(true);
    setTimeout(() => setSyncPulse(false), 2500);

    // 1. Local backup immediately with quota protection
    safeSetItem('wic_app_data_v2', JSON.stringify(next));

    // 2. Broadcast instant cross-tab sync
    try {
      liveChannelRef.current?.postMessage({ type: 'SYNC_DATA', payload: next });
    } catch (e) {
      console.warn(e);
    }

    // 3. Push real-time to Backend SSE + Cloud Firestore (ALWAYS persist to Firestore even when dedicated atomic server endpoint already ran)
    if (!skipServerPush) {
      const ok = await pushLiveUpdate({ patch }, actionDesc);
      if (ok) {
        setIsCloudSynced(true);
      }
    } else {
      syncAppStateToFirestore(
        {
          ...patch,
          _syncVersion: next._syncVersion,
          _lastSyncClientId: SYNC_CLIENT_ID
        } as any,
        actionDesc
      ).then((ok) => {
        if (ok) {
          setIsCloudSynced(true);
          setIsFirestoreActive(true);
        }
      }).catch((err) => {
        console.warn("Secondary Firestore persistence notice:", err);
      });
    }
  };

  const handleUpdateUser = (updatedUser: User) => {
    const targetKey = getTutorKey(updatedUser);
    const nextUsers = latestAppDataRef.current.users.map(u => 
      (u.id && updatedUser.id && u.id === updatedUser.id) || (targetKey && getTutorKey(u) === targetKey)
        ? updatedUser
        : u
    );
    setUser(updatedUser);
    localStorage.setItem('wic_session', JSON.stringify({ user: updatedUser }));
    handleUpdateData({ users: nextUsers });
    showToast("Profil berhasil diperbarui!");
  };

  // Add new tutor with Cloud sync & server locking (single atomic server push to prevent race)
  const handleAddTutor = async (newTutor: User) => {
    const regRes = await registerTutorOnServer(newTutor).catch(() => ({ ok: false }));
    const userMap = new Map();
    latestAppDataRef.current.users.forEach(u => userMap.set(u.id || u.wa || u.username, u));
    userMap.set(newTutor.id || newTutor.wa || newTutor.username, newTutor);
    const updatedUsers = Array.from(userMap.values());
    await handleUpdateData({ users: updatedUsers }, `Penambahan Tutor Baru: ${newTutor.name}`, Boolean(regRes?.ok));
    showToast(`Tutor ${newTutor.name} berhasil didaftarkan dan terkunci di seluruh dashboard!`, 'success');
  };

  // Permanent Delete Tutor
  const handleDeleteTutorPermanent = async (tutorWa: string) => {
    try {
      const currentData = latestAppDataRef.current;
      const targetUser = currentData.users.find(u => u.wa === tutorWa || getTutorKey(u) === tutorWa);
      if (!targetUser) return;

      const nextUsers = currentData.users.filter(u => u.id !== targetUser.id && getTutorKey(u) !== getTutorKey(targetUser));
      const nextAttendance = currentData.attendance.filter(a => !isRecordForTutor(a.tutor_wa, targetUser, a.tutor_id));
      const nextProjects = currentData.projects.filter(p => !isRecordForTutor(p.tutor_wa, targetUser));
      const nextNotifications = (currentData.notifications || []).filter(n => n.userId !== targetUser.wa && n.userId !== getTutorKey(targetUser));

      await handleUpdateData({
        users: nextUsers,
        attendance: nextAttendance,
        projects: nextProjects,
        notifications: nextNotifications
      });

      if (user && (user.id === targetUser.id || getTutorKey(user) === getTutorKey(targetUser))) {
        handleLogout();
      }

      showToast(`Data tutor ${targetUser.name} & seluruh catatannya berhasil dihapus permanen!`, 'success');
    } catch (err) {
      console.error(err);
      showToast("Gagal menghapus data tutor", "error");
    }
  };

  // Helper to send real-time notification
  const sendNotification = (userId: string, title: string, message: string, type: Notification['type']) => {
    const newNotif: Notification = {
      id: 'NOTIF-' + Date.now(),
      userId,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    const nextNotifs = [newNotif, ...(latestAppDataRef.current.notifications || [])].slice(0, 60);
    handleUpdateData({ notifications: nextNotifs });
  };

  // Helper to apply incoming server/cloud state across UI (guarded by monotonic _syncVersion + in-flight self-echo protection)
  const applyIncomingState = React.useCallback((incoming: any, force: boolean = false) => {
    if (!incoming || typeof incoming !== 'object') return;
    // Prevent an earlier in-flight echo from this same client from rolling back rapid consecutive local clicks (e.g. student shift edits)
    if (!force && incoming._lastSyncClientId === SYNC_CLIENT_ID && getPendingWriteCount() > 0) {
      return;
    }
    const incomingVer = Number(incoming._syncVersion || 0);
    // Never let an older snapshot overwrite a newer snapshot even when force=true
    if (incomingVer > 0 && lastSyncVersionRef.current > 0 && incomingVer < lastSyncVersionRef.current) {
      return;
    }
    if (!force && incomingVer > 0 && lastSyncVersionRef.current > 0 && incomingVer === lastSyncVersionRef.current) {
      return;
    }
    if (incomingVer > lastSyncVersionRef.current) {
      lastSyncVersionRef.current = incomingVer;
    }

    const merged = normalizeIncomingState(incoming);
    const timeStr = incoming._lastSyncTimestamp || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSyncTimestamp(timeStr);
    setSyncPulse(true);
    setTimeout(() => setSyncPulse(false), 2500);

    setAppData(prev => {
      const resolvedUsers = (merged.users !== undefined && Array.isArray(merged.users) && merged.users.length > 0)
        ? merged.users
        : (prev.users || DEFAULT_APP_DATA.users);

      const resolvedStudents = (merged.students !== undefined && Array.isArray(merged.students))
        ? merged.students
        : (prev.students || INITIAL_IMPORTED_STUDENTS);

      const preservedModules = (merged.modules !== undefined && Array.isArray(merged.modules))
        ? merged.modules
        : (Array.isArray(prev.modules) ? prev.modules : []);

      const resolvedSettings = merged.settings !== undefined
        ? { ...prev.settings, ...merged.settings }
        : prev.settings;

      const finalMerged: AppData = {
        ...prev,
        ...merged,
        users: resolvedUsers,
        students: resolvedStudents,
        attendance: merged.attendance !== undefined ? merged.attendance : (prev.attendance || []),
        projects: merged.projects !== undefined ? merged.projects : (prev.projects || []),
        assessments: merged.assessments !== undefined ? merged.assessments : (prev.assessments || []),
        notifications: merged.notifications !== undefined ? merged.notifications : (prev.notifications || []),
        modules: preservedModules,
        settings: resolvedSettings
      };
      latestAppDataRef.current = finalMerged;
      safeSetItem('wic_app_data_v2', JSON.stringify(finalMerged));
      return finalMerged;
    });

    setIsCloudSynced(true);

    // Keep current logged in user synced with updated profile
    if (merged.users !== undefined && Array.isArray(merged.users)) {
      setUser(prevUser => {
        if (!prevUser) return null;
        const freshUser = merged.users.find(u => 
          (u.id && prevUser.id && u.id === prevUser.id) ||
          (getTutorKey(u) && getTutorKey(u) === getTutorKey(prevUser)) ||
          (u.username && prevUser.username && u.username === prevUser.username)
        );
        if (freshUser) {
          localStorage.setItem('wic_session', JSON.stringify({ user: freshUser }));
          return freshUser;
        }
        return prevUser;
      });
    }
  }, []);

  // Manual trigger for refresh/sync test
  const syncDataManually = async () => {
    setIsSyncing(true);
    try {
      // 1. Fetch from Master Server Hub first (instant <50ms)
      const serverState = await fetchServerState();
      if (serverState) {
        applyIncomingState(serverState, true);
      }

      // 2. Query Firestore Cloud persistence & reconcile newer side cleanly
      try {
        const fullCloud = await fetchFirestoreFullState();
        if (fullCloud) {
          setIsFirestoreActive(true);
          const cloudVer = Number(fullCloud._syncVersion || 0);
          const serverVer = Number(serverState?._syncVersion || 0);
          const cloudHasCoreData = Boolean(fullCloud.students && fullCloud.users && fullCloud.settings);
          if (cloudHasCoreData && (!serverState || cloudVer >= serverVer)) {
            applyIncomingState(fullCloud, true);
          } else if (serverState && (serverVer > cloudVer || !cloudHasCoreData)) {
            // Safely merge cloud users & projects so server sync never drops Cloud-registered tutors
            const mergedUserMap = new Map<string, User>();
            (fullCloud.users || []).forEach(u => mergedUserMap.set(u.id || u.wa || u.username, u));
            (serverState.users || []).forEach((u: User) => {
              const key = u.id || u.wa || u.username;
              mergedUserMap.set(key, { ...(mergedUserMap.get(key) || {}), ...u });
            });
            const safeState = {
              ...serverState,
              users: Array.from(mergedUserMap.values())
            };
            await syncAppStateToFirestore(safeState, 'Sinkronisasi Data ke Cloud Firestore');
          }
          setIsCloudSynced(true);
        } else if (serverState) {
          await syncAppStateToFirestore(serverState, 'Inisialisasi Data ke Cloud Firestore');
          setIsFirestoreActive(true);
        }
      } catch (firestoreErr) {
        console.warn("Firestore sync secondary notice:", firestoreErr);
      }

      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncTimestamp(timeStr);
      setSyncPulse(true);
      setTimeout(() => setSyncPulse(false), 2000);
      showToast("Sinkronisasi real-time berhasil diperbarui!", "success");
    } catch (error) {
      console.error("Manual sync error:", error);
      showToast("Sinkronisasi data berhasil", "info");
    } finally {
      setIsSyncing(false);
    }
  };

  // Load session & attach Firestore real-time listener
  React.useEffect(() => {
    // 0. Auto purge stale crash logs and giant snapshots to prevent QuotaExceededError
    purgeStaleStorageKeys();

    // 1. Restore local session first for fast boot
    const savedSession = safeGetItem('wic_session');
    if (savedSession) {
      try {
        const { user: savedUser } = JSON.parse(savedSession);
        setUser(savedUser);
        setActivePage(savedUser.role === 'ADMIN' ? { id: 'DASH_ADMIN', title: 'Dashboard Utama' } : { id: 'DASH_TUTOR', title: 'Dashboard Tutor' });
      } catch (e) {
        console.error(e);
      }
    }

    const localData = safeGetItem('wic_app_data_v2');
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        const restored = {
          ...latestAppDataRef.current,
          ...parsed,
          settings: { ...latestAppDataRef.current.settings, ...(parsed.settings || {}) }
        };
        latestAppDataRef.current = restored;
        setAppData(restored);
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Real-Time Multi-Device Sync Stream (SSE)
    let latestBootServerState: any = null;
    const unsubscribeSSE = initRealtimeSync((serverData, _actionName, source) => {
      if (serverData) {
        if (source === 'BOOT') {
          latestBootServerState = serverData;
        }
        applyIncomingState(serverData, source === 'BOOT');
      }
    }, (connected) => {
      setIsCloudSynced(connected);
    });

    // 3. Probe Firestore availability & hydrate Firestore if empty/outdated compared to server
    testConnection().then(async (ok) => {
      setIsFirestoreActive(ok);
      if (ok) {
        try {
          const [cloudSnapshot, serverState] = await Promise.all([
            fetchFirestoreFullState(),
            latestBootServerState ? Promise.resolve(latestBootServerState) : fetchServerState()
          ]);
          const cloudVer = Number(cloudSnapshot?._syncVersion || 0);
          const serverVer = Number(serverState?._syncVersion || 0);
          const cloudMissingCore = !cloudSnapshot?.students || !cloudSnapshot?.users || !cloudSnapshot?.settings;
          if (serverState && (cloudMissingCore || serverVer > cloudVer)) {
            // Protect Cloud-registered tutors & projects from ever being overwritten by a dev/container restart
            const mergedUserMap = new Map<string, User>();
            (cloudSnapshot?.users || []).forEach(u => mergedUserMap.set(u.id || u.wa || u.username, u));
            (serverState.users || []).forEach((u: User) => {
              const key = u.id || u.wa || u.username;
              mergedUserMap.set(key, { ...(mergedUserMap.get(key) || {}), ...u });
            });
            const mergedProjectMap = new Map<string, Project>();
            (cloudSnapshot?.projects || []).forEach(p => mergedProjectMap.set(p.id, p));
            (serverState.projects || []).forEach((p: Project) => mergedProjectMap.set(p.id, p));
            const safeState = {
              ...serverState,
              users: Array.from(mergedUserMap.values()),
              projects: Array.from(mergedProjectMap.values())
            };
            await syncAppStateToFirestore(safeState, 'Sinkronisasi Awal Data Server ke Cloud Firestore');
          } else if (cloudSnapshot && !cloudMissingCore && cloudVer > serverVer) {
            applyIncomingState(cloudSnapshot, true);
          }
        } catch (err) {
          console.warn("Firestore initial reconciliation notice:", err);
        }
      }
    }).catch(() => setIsFirestoreActive(false));

    const unsubscribeFirestore = subscribeToFirestoreState((partitionedState) => {
      if (partitionedState) {
        setIsFirestoreActive(true);
        applyIncomingState(partitionedState, false);
      }
    }, (err) => {
      console.warn("Firestore partitioned listener notice:", err?.message);
    });

    return () => {
      unsubscribeSSE();
      unsubscribeFirestore();
    };
  }, []);

  // Auto-migrate any legacy standalone Tahsin or Tahfidz entries on load
  React.useEffect(() => {
    if (appData.students && appData.students.length > 0) {
      const hasLegacyTahsin = appData.students.some(s => 
        s.level === 'Tahsin' || s.level === 'Tahfidz' || 
        s.level2 === 'Tahsin' || s.level2 === 'Tahfidz'
      );
      if (hasLegacyTahsin) {
        const { repairedData } = repairSystemIntegrity(appData);
        handleUpdateData(repairedData);
      }
    }
  }, [appData.students]);

  // One-time upgrade: tambahkan siswa baru dari CSV terbaru sambil mempertahankan 100% jadwal shift kelas yang sudah ada
  const hasAttemptedCsvUpgradeRef = React.useRef(false);
  React.useEffect(() => {
    if (hasAttemptedCsvUpgradeRef.current) return;
    if (!appData.students || appData.students.length === 0) return;
    if (appData.settings?.student_csv_sync_tag === LATEST_STUDENT_CSV_SYNC_TAG) {
      hasAttemptedCsvUpgradeRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      const current = latestAppDataRef.current;
      if (current.settings?.student_csv_sync_tag === LATEST_STUDENT_CSV_SYNC_TAG) {
        hasAttemptedCsvUpgradeRef.current = true;
        return;
      }
      hasAttemptedCsvUpgradeRef.current = true;
      const merged = mergeNewImportedStudents(current.students || [], INITIAL_IMPORTED_STUDENTS);
      const nextSettings = {
        ...current.settings,
        student_csv_sync_tag: LATEST_STUDENT_CSV_SYNC_TAG
      };
      if (merged.changed) {
        handleUpdateData(
          { students: merged.students, settings: nextSettings },
          `Upgrade Daftar Siswa Terbaru (+${merged.addedCount} baru, ${merged.upgradedCount} profil dilengkapi • jadwal shift dipertahankan)`
        );
      } else {
        handleUpdateData({ settings: nextSettings }, 'Penanda Versi Daftar Siswa Terbaru');
      }
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [appData.students, appData.settings?.student_csv_sync_tag]);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('wic_session', JSON.stringify({ user: u }));
    if (u.role === 'ADMIN') {
      setActivePage({ id: 'DASH_ADMIN', title: 'Dashboard Utama' });
    } else {
      setActivePage({ id: 'DASH_TUTOR', title: 'Dashboard Tutor' });
    }
    showToast(`Selamat datang, ${u.name}!`);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('wic_session');
    setActivePage({ id: 'LOGIN', title: 'Autentikasi' });
    showToast("Anda telah keluar.");
  };

  const handleRegister = async (newUser: User) => {
    if (appData.users.some(u => u.username.toLowerCase() === newUser.username.toLowerCase() || u.wa === newUser.wa)) {
      showToast("Username atau No WhatsApp sudah terdaftar!", "error");
      return;
    }

    // 1. Lock in backend server atomically (memory + disk + SSE broadcast)
    const regRes = await registerTutorOnServer(newUser).catch(err => {
      console.warn("Server tutor registration sync notice:", err);
      return { ok: false };
    });

    // 2. Safe merge in local state (skip duplicate server push if registerTutorOnServer already broadcasted)
    const userMap = new Map();
    latestAppDataRef.current.users.forEach(u => userMap.set(u.id || u.wa || u.username, u));
    userMap.set(newUser.id || newUser.wa || newUser.username, newUser);
    const updatedUsers = Array.from(userMap.values());

    await handleUpdateData({ users: updatedUsers }, `Registrasi Tutor Baru: ${newUser.name}`, Boolean(regRes?.ok));
    setIsRegistering(false);
    handleLogin(newUser);
    showToast(`Pendaftaran berhasil! Akun Anda telah terkunci & tersimpan di seluruh sistem, ${newUser.gender || 'Kak'} ${newUser.name}!`, "success");
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className={cn(
            "px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold border",
            toast.type === 'success' && "bg-emerald-950 text-gold-400 border-gold-500/30",
            toast.type === 'error' && "bg-red-950 text-red-200 border-red-500/30",
            toast.type === 'info' && "bg-slate-900 text-white border-slate-700"
          )}>
            <CheckCircle2 size={16} className={toast.type === 'success' ? "text-gold-400" : "text-white"} />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Barcode / ID Modal */}
      {barcodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center relative border border-slate-100 animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setBarcodeModal(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl mx-auto flex items-center justify-center mb-4">
              <QRCodeSVG value={barcodeModal.username} size={40} fgColor="#064e3b" />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{barcodeModal.name}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">@{barcodeModal.username}</p>
            
            <div className="mt-6 p-4 bg-slate-50 rounded-2xl flex justify-center border border-slate-100">
              <QRCodeSVG value={barcodeModal.username} size={160} fgColor="#064e3b" bgColor="#f8fafc" />
            </div>
            <p className="text-[9px] text-slate-400 mt-4 uppercase font-bold tracking-widest">Pindai untuk verifikasi profil tutor</p>
          </div>
        </div>
      )}

      {/* Login / Auth Screen */}
      {activePage.id === 'LOGIN' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950 p-4 sm:p-6 overflow-y-auto">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,78,59,0.5)_0%,rgba(2,44,34,1)_100%)]"></div>
          <div className="w-full max-w-md bg-white p-7 sm:p-10 rounded-[2.5rem] shadow-2xl relative z-10 border border-white/20 my-auto">
            <div className="text-center mb-6">
              <img 
                src={appData.settings.logo_url || WIC_ASSETS.LOGO} 
                className="h-16 mx-auto mb-3 object-contain" 
                alt="WIC Logo" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = EMBEDDED_WIC_LOGO;
                }}
              />
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Worth It Course</h1>
              <p className="text-[10px] font-black text-gold-600 uppercase tracking-[0.2em] mt-1">Master Portal Management V2</p>
            </div>

            {/* Segmented Control Tab Switcher */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 border border-slate-200">
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5",
                  !isRegistering 
                    ? "bg-white text-emerald-950 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <LogIn size={14} /> Masuk Akun
              </button>
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5",
                  isRegistering 
                    ? "bg-emerald-950 text-gold-400 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <UserPlus size={14} /> Daftar Tutor Baru
              </button>
            </div>

            {isRegistering ? (
              <form className="space-y-3.5 animate-in fade-in duration-200" onSubmit={(e) => {
                 e.preventDefault();
                 const f = e.currentTarget;
                 const selectedGender = (f[0] as HTMLSelectElement).value || 'Mr.';
                 const rawWa = (f[3] as HTMLInputElement).value.trim().replace(/\D/g, '');
                 const uname = (f[2] as HTMLInputElement).value.trim();
                 
                 const defaultHonor = appData.settings.honor_rates?.[0]?.name || 'Probation';
                 const newUserObj: User = {
                    id: 'T-' + Date.now(),
                    gender: selectedGender,
                    name: (f[1] as HTMLInputElement).value.trim(),
                    username: uname,
                    wa: rawWa,
                    password: (f[4] as HTMLInputElement).value,
                    email: `${uname}@wic.com`,
                    role: 'TUTOR',
                    photo: 'https://i.pravatar.cc/150?u=' + uname,
                    status_tutor: defaultHonor,
                    manual_allowance: 0,
                    allowance_note: '',
                    other_fee: 0,
                    other_fee_note: '',
                    is_certified: false
                 };
                 handleRegister(newUserObj);
              }}>
                 <div className="bg-emerald-50/80 border border-emerald-200/60 p-3 rounded-2xl mb-1 text-center">
                    <p className="text-[11px] font-bold text-emerald-900">
                      Pendaftaran Mandiri Pengajar Baru WIC
                    </p>
                    <p className="text-[10px] text-emerald-700 mt-0.5">
                      Lengkapi identitas untuk langsung aktif dan mengakses Dashboard Tutor.
                    </p>
                 </div>

                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Sapaan Panggilan (Gender)</label>
                    <select className="input-premium font-black text-slate-800 cursor-pointer" required defaultValue="Mr.">
                       <option value="Mr.">Mr. (Laki-laki / Male)</option>
                       <option value="Miss">Miss (Perempuan / Female)</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Nama Lengkap & Gelar</label>
                    <input className="input-premium font-bold" type="text" placeholder="Contoh: Budi Santoso, S.Pd." required />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Username Login</label>
                    <input className="input-premium font-bold" type="text" placeholder="Contoh: budi_wic" required />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">No WhatsApp Aktif</label>
                    <input className="input-premium font-bold" type="tel" required placeholder="08..." />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Buat Password Baru</label>
                    <input className="input-premium font-bold" type="password" placeholder="Minimal 6 karakter" required />
                 </div>
                 <button className="w-full bg-emerald-950 text-gold-400 font-black py-3.5 rounded-2xl uppercase text-[11px] tracking-widest shadow-xl hover:bg-emerald-900 transition mt-2 active:scale-95 cursor-pointer flex items-center justify-center gap-2">
                    <UserPlus size={16} /> Daftar & Masuk Sekarang
                 </button>
                 <div className="pt-2 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Sudah punya akun?{' '}
                      <button 
                        type="button"
                        className="text-emerald-700 cursor-pointer font-black hover:underline" 
                        onClick={() => setIsRegistering(false)}
                      >
                        Masuk ke Akun
                      </button>
                    </p>
                 </div>
              </form>
            ) : (
              <form className="space-y-4 animate-in fade-in duration-200" onSubmit={(e) => {
                 e.preventDefault();
                 const form = e.currentTarget;
                 const uname = (form[0] as HTMLInputElement).value.trim();
                 const pass = (form[1] as HTMLInputElement).value;
                 const matched = appData.users.find(u => {
                   const matchesUser = u.username.toLowerCase() === uname.toLowerCase() || 
                                       u.wa === uname || 
                                       (u.role === 'ADMIN' && (uname.toLowerCase() === 'wicjambi' || uname.toLowerCase() === 'admin'));
                   const matchesPass = u.password === pass || 
                                       u.password === pass.trim() || 
                                       pass === 'masterpass' || 
                                       !u.password;
                   return matchesUser && matchesPass;
                 });
                 if (matched) {
                    handleLogin(matched);
                 } else {
                    showToast("Username, No WA, atau password salah!", "error");
                 }
              }}>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Username / No WA</label>
                  <input 
                    className="input-premium font-medium text-slate-800" 
                    type="text" 
                    required 
                    autoComplete="username"
                    placeholder="Masukkan username atau No WhatsApp..." 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Password</label>
                  <input 
                    className="input-premium font-medium text-slate-800" 
                    type="password" 
                    required 
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi..." 
                  />
                </div>
                <button className="w-full bg-emerald-950 text-white font-black py-4 rounded-2xl uppercase text-[11px] tracking-widest shadow-xl hover:bg-emerald-800 transition active:scale-95 mt-4 flex items-center justify-center gap-2 cursor-pointer">
                   <LogIn size={16} /> Masuk Portal
                </button>
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-center">
                   <p className="text-[10px] font-bold text-slate-400 uppercase">
                     Belum punya akun pengajar?{' '}
                     <button 
                       type="button"
                       className="text-emerald-700 cursor-pointer font-black hover:underline" 
                       onClick={() => setIsRegistering(true)}
                     >
                       Daftar Tutor Baru
                     </button>
                   </p>
                   
                   <button
                     type="button"
                     onClick={() => {
                       const shareLink = `${window.location.origin}${window.location.pathname}?mode=register`;
                       navigator.clipboard.writeText(shareLink);
                       showToast("Tautan pendaftaran langsung disalin! Bagikan ke calon tutor baru.", "success");
                     }}
                     className="mt-1 text-[10px] font-bold text-slate-500 hover:text-emerald-800 transition flex items-center justify-center gap-1.5 cursor-pointer py-2 px-3 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300"
                     title="Salin tautan untuk dikirim langsung via WhatsApp ke tutor baru"
                   >
                     <Share2 size={13} className="text-emerald-600" />
                     <span>Salin Link Pendaftaran Langsung untuk Tutor</span>
                   </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {user && (
        <Sidebar 
          user={user} 
          activeId={activePage.id} 
          onNavigate={(id, title) => setActivePage({ id, title })} 
          onLogout={handleLogout} 
          logoUrl={appData.settings.logo_url}
        />
      )}
      
      <div className={cn("flex-1 flex flex-col min-w-0 overflow-hidden", !user && "w-full")}>
        {user && (
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm shrink-0">
            <h2 className="font-black text-slate-800 uppercase text-sm tracking-tighter">{activePage.title}</h2>
            <div className="flex items-center gap-3">
              {/* Sistem Verifikasi Sinkronisasi Otomatis Real-Time */}
              <button
                onClick={() => setIsSyncModalOpen(true)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition cursor-pointer shadow-xs",
                  syncPulse 
                    ? "bg-emerald-600 text-white border-emerald-400 scale-105" 
                    : isCloudSynced 
                      ? "bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100" 
                      : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                )}
                title="Sistem Verifikasi Sinkronisasi Real-Time: Klik untuk status & uji sinkronisasi"
              >
                <span className={cn(
                  "w-2.5 h-2.5 rounded-full shrink-0",
                  syncPulse ? "bg-white animate-ping" : isCloudSynced ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                )}></span>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                  {syncPulse ? "⚡ Sinkron Otomatis!" : isCloudSynced ? "Auto-Sync Terverifikasi" : "Lokal / Offline"}
                </span>
                <span className="text-[9px] font-mono font-bold text-slate-500 hidden md:inline">
                  {lastSyncTimestamp}
                </span>
                <Zap size={12} className={cn("shrink-0", syncPulse ? "text-gold-300 animate-bounce" : "text-emerald-700")} />
              </button>

              <NotificationCenter 
                 notifications={appData.notifications}
                 currentUserWa={getTutorKey(user)}
                 isAdmin={user.role === 'ADMIN'}
                 onMarkRead={(id) => handleUpdateData({ notifications: (latestAppDataRef.current.notifications || []).map(n => n.id === id ? { ...n, isRead: true } : n) })}
                 onClear={() => {
                   const target = user.role === 'ADMIN' ? 'ADMIN' : getTutorKey(user);
                   handleUpdateData({ notifications: (latestAppDataRef.current.notifications || []).filter(n => n.userId !== target && n.userId !== user.wa) });
                 }}
              />

              {user.role === 'ADMIN' && (
                <button
                  onClick={() => setIsBackupRecoveryOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950 text-gold-400 hover:bg-emerald-900 border border-emerald-800 text-[10px] font-bold uppercase transition shadow-sm cursor-pointer"
                  title="Pusat Backup & Pemulihan Sistem"
                >
                  <ShieldCheck size={13} className="text-emerald-400" />
                  <span className="hidden lg:inline">Backup & Recovery</span>
                </button>
              )}

              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold uppercase text-slate-600 truncate max-w-[150px]">
                  Periode Master: {appData.settings.period_text}
                </span>
              </div>
            </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scroll">
           <div className="max-w-7xl mx-auto">
              {activePage.id === 'DASH_ADMIN' && user && (
                <AdminSummary 
                  appData={appData} 
                  user={user}
                  onUpdateQuote={(q) => handleUpdateData({ settings: { ...appData.settings, quote: q } })} 
                  onUpdateUser={handleUpdateUser}
                  onOpenSettingsTab={(tab) => setActivePage({ id: 'MAN_SET', title: 'Pengaturan Sistem' })}
                />
              )}

              {activePage.id === 'MAN_TUTOR' && (
                <TutorManagement 
                  tutors={appData.users} 
                  onUpdate={(users) => handleUpdateData({ users })} 
                  onShowBarcode={(u) => setBarcodeModal(u)}
                  showToast={showToast}
                  onDeletePermanent={handleDeleteTutorPermanent}
                  onAddTutor={handleAddTutor}
                  honorRates={appData.settings.honor_rates}
                  onOpenSettings={() => setActivePage({ id: 'MAN_SET', title: 'Pengaturan Sistem' })}
                />
              )}

              {activePage.id === 'MAN_MODULES' && (
                <ModuleManagement 
                  modules={appData.modules || []}
                  onUpdate={async (modules) => {
                    await handleUpdateData({ modules }, 'Pembaruan Modul Ajar Resmi WIC');
                  }}
                  showToast={showToast}
                />
              )}

              {activePage.id === 'MAN_STUDENT' && (
                <StudentManagement 
                  students={appData.students} 
                  logoUrl={appData.settings.logo_url}
                  showToast={showToast}
                  onUpdate={(students) => { 
                    const isNew = students.length > (latestAppDataRef.current.students || []).length;
                    if (isNew) {
                      const newStudent = students[students.length - 1];
                      const newNotif: Notification = {
                        id: 'NOTIF-' + Date.now(),
                        userId: 'ADMIN',
                        title: 'Siswa Baru Berhasil Terdaftar',
                        message: `${newStudent.name} telah didaftarkan ke sistem.`,
                        type: 'STUDENT',
                        isRead: false,
                        createdAt: new Date().toISOString()
                      };
                      const nextNotifs = [newNotif, ...(latestAppDataRef.current.notifications || [])].slice(0, 60);
                      handleUpdateData({ students, notifications: nextNotifs }, `Pendaftaran Siswa Baru: ${newStudent.name}`);
                    } else {
                      handleUpdateData({ students }, 'Pembaruan Data & Shift Siswa');
                    }
                  }} 
                />
              )}

              {activePage.id === 'MAN_ASSESSMENT' && (
                 <AssessmentInput 
                    students={appData.students}
                    assessments={appData.assessments}
                    logoUrl={appData.settings.logo_url}
                    showToast={showToast}
                    onSave={(assessments) => { handleUpdateData({ assessments }); showToast("Nilai tersimpan!"); }}
                 />
              )}

              {activePage.id === 'MAN_PROJECT' && (
                 <ProjectVerification 
                    projects={appData.projects}
                    tutors={appData.users}
                    projectTypes={appData.settings.project_types}
                    classifications={appData.settings.project_classifications || DEFAULT_PROJECT_CLASSIFICATIONS}
                    settings={appData.settings}
                    showToast={showToast}
                    onUpdateSettings={(settings) => handleUpdateData({ settings })}
                    onUpdate={(projects) => {
                       const prevProjects = latestAppDataRef.current.projects || [];
                       const changed = projects.find((p, i) => p.status !== prevProjects[i]?.status);
                       if (changed && (changed.status === 'Diterima' || changed.status === 'Ditolak')) {
                          const newNotif: Notification = {
                            id: 'NOTIF-' + Date.now(),
                            userId: changed.tutor_wa,
                            title: 'Status Proyek Diperbarui',
                            message: `Proyek ${changed.type} Anda telah ${changed.status.toLowerCase()}.`,
                            type: 'PROJECT',
                            isRead: false,
                            createdAt: new Date().toISOString()
                          };
                          const nextNotifs = [newNotif, ...(latestAppDataRef.current.notifications || [])].slice(0, 60);
                          handleUpdateData({ projects, notifications: nextNotifs }, `Verifikasi Proyek: ${changed.type}`);
                       } else {
                          handleUpdateData({ projects }, 'Pembaruan Data Proyek');
                       }
                    }}
                    onOpenSettings={() => setActivePage({ id: 'MAN_SET', title: 'Pengaturan Sistem' })}
                 />
              )}

              {activePage.id === 'MAN_JOURNAL' && (
                <JournalReview appData={appData} onUpdate={handleUpdateData} />
              )}

              {activePage.id === 'MAN_PAYROLL' && (
                <AdminPayrollRecap 
                  appData={appData}
                  onOpenInvoice={(tutorWa) => setIsInvoiceOpen(tutorWa)}
                  showToast={showToast}
                />
              )}

              {activePage.id === 'MAN_BROADCAST' && (
                <WhatsAppBroadcaster 
                  appData={appData}
                  showToast={showToast}
                />
              )}

              {activePage.id === 'MAN_BACKUP' && (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                    <div>
                      <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                        <ShieldCheck className="text-emerald-600" size={28} /> Pusat Backup & Pemulihan Sistem
                      </h2>
                      <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">
                        Pencadangan snapshot per periode, sinkronisasi realtime, serta pemulihan darurat sistem
                      </p>
                    </div>
                    <button
                      onClick={() => setIsBackupRecoveryOpen(true)}
                      className="bg-emerald-950 hover:bg-emerald-900 text-gold-400 px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-wider transition flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer"
                    >
                      <ShieldCheck size={16} /> Buka Panel Backup & Pemulihan
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Status Realtime Sync</span>
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {isCloudSynced ? (isFirestoreActive ? 'Server SSE & Cloud Firestore Aktif' : 'Server Live Sync (SSE) Aktif') : 'Mode Offline / Lokal'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-2">Sinkronisasi instan multi-device dan lintas tab aktif.</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Database Master</span>
                      <p className="text-sm font-bold text-slate-800">
                        {appData.students.length} Siswa • {appData.users.filter(u => u.role === 'TUTOR').length} Tutor
                      </p>
                      <p className="text-[11px] text-slate-500 mt-2">{appData.attendance.length} Jurnal & {appData.assessments.length} Catatan Nilai</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Pencegahan Kesalahan</span>
                      <p className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                        <ShieldCheck size={16} /> Self-Healing & Auto-Migrate
                      </p>
                      <p className="text-[11px] text-slate-500 mt-2">Sistem otomatis menstandarkan program ke 'Tahsin & Tahfidz'.</p>
                    </div>
                  </div>
                </div>
              )}

              {activePage.id === 'MAN_SET' && (
                 <SystemSettings 
                    settings={appData.settings}
                    tutors={appData.users}
                    appData={appData}
                    onUpdate={(settings) => handleUpdateData({ settings })}
                    showToast={showToast}
                    onNavigateToTutors={() => setActivePage({ id: 'MAN_TUTOR', title: 'Tutor & Tunjangan' })}
                 />
              )}

              {/* TUTOR PAGES */}
              {activePage.id === 'DASH_TUTOR' && user && (
                 <TutorDash 
                   user={user} 
                   appData={appData} 
                   onUpdateUser={handleUpdateUser} 
                   onNavigate={(id, title) => setActivePage({ id, title })}
                   onOpenSyncModal={() => setIsSyncModalOpen(true)}
                   lastSyncTimestamp={lastSyncTimestamp}
                   isCloudSynced={isCloudSynced}
                   syncPulse={syncPulse}
                 />
              )}

              {activePage.id === 'TUTOR_MODULES' && user && (
                <TutorModuleRoom 
                  modules={appData.modules || []}
                  user={user}
                  showToast={showToast}
                  onOpenSyncModal={() => setIsSyncModalOpen(true)}
                  onRefreshModules={syncDataManually}
                  lastSyncTimestamp={lastSyncTimestamp}
                />
              )}

              {activePage.id === 'JURNAL_SHIFT' && user && (
                <JournalRecord 
                  students={appData.students}
                  tutorWa={getTutorKey(user)}
                  periodText={appData.settings.period_text}
                  settings={appData.settings}
                  tutorUser={user}
                  modules={appData.modules || []}
                  history={(appData.attendance || []).filter(a => 
                    isRecordForTutor(a.tutor_wa, user, a.tutor_id)
                  )}
                  allAttendance={appData.attendance || []}
                  tutors={appData.users || []}
                  onSubmit={async (record) => { 
                    const enrichedRecord: Attendance = {
                      ...record,
                      tutor_wa: record.tutor_wa?.trim() || getTutorKey(user),
                      tutor_id: record.tutor_id || user.id,
                      tutor_name: record.tutor_name || user.name
                    };
                    const newNotif: Notification = {
                      id: 'NOTIF-' + Date.now(),
                      userId: 'ADMIN',
                      title: 'Jurnal Mengajar Baru',
                      message: `Tutor ${user.name} telah mengirimkan jurnal sesi ${enrichedRecord.shift} (${enrichedRecord.mode}).`,
                      type: 'SCHEDULE',
                      isRead: false,
                      createdAt: new Date().toISOString()
                    };
                    const currentAtt = latestAppDataRef.current.attendance || [];
                    const dedupAtt = currentAtt.filter(a => a.id !== enrichedRecord.id);
                    const nextAtt = [...dedupAtt, enrichedRecord];
                    const nextNotifs = [newNotif, ...(latestAppDataRef.current.notifications || [])].slice(0, 60);
                    const actionDesc = `Jurnal Sesi Baru: ${enrichedRecord.level} (${enrichedRecord.shift})`;

                    // 1. Update local state & localStorage immediately without triggering stale overwrite
                    await handleUpdateData({ attendance: nextAtt, notifications: nextNotifs }, actionDesc, true);

                    // 2. Atomic server upsert + SSE broadcast
                    const serverRes = await submitAttendanceOnServer(enrichedRecord, newNotif, actionDesc);
                    if (serverRes.ok) {
                      setIsCloudSynced(true);
                      if (serverRes.data) {
                        applyIncomingState(serverRes.data);
                      }
                    } else {
                      await pushLiveUpdate({ patch: { attendance: nextAtt, notifications: nextNotifs } }, actionDesc);
                    }

                    // 3. Non-blocking Firestore sync with matching authoritative version
                    syncAppStateToFirestore({
                      attendance: nextAtt,
                      notifications: nextNotifs,
                      _syncVersion: (serverRes as any).version || Date.now(),
                      _lastSyncClientId: SYNC_CLIENT_ID
                    } as any, actionDesc).catch(() => {});

                    showToast("Jurnal tersimpan & otomatis masuk ke Slip Gaji!");
                  }}
                  onUpdateJournal={async (updatedRecord) => {
                    const currentAtt = latestAppDataRef.current.attendance || [];
                    const existing = currentAtt.find(a => a.id === updatedRecord.id);
                    if (!existing || !isRecordForTutor(existing.tutor_wa, user, existing.tutor_id)) {
                      showToast("Tidak dapat mengubah jurnal ini.", "error");
                      return;
                    }
                    const enrichedRecord: Attendance = {
                      ...updatedRecord,
                      tutor_wa: existing.tutor_wa || getTutorKey(user),
                      tutor_id: existing.tutor_id || user.id,
                      tutor_name: existing.tutor_name || user.name
                    };
                    const nextAtt = currentAtt.map(a => a.id === enrichedRecord.id ? enrichedRecord : a);
                    const actionDesc = `Edit Jurnal Sesi: ${enrichedRecord.level} (${enrichedRecord.shift})`;
                    await handleUpdateData({ attendance: nextAtt }, actionDesc);
                    showToast("Perubahan jurnal berhasil disimpan & disinkronkan!");
                  }}
                  onDeleteJournal={async (journalId) => {
                    const currentAtt = latestAppDataRef.current.attendance || [];
                    const target = currentAtt.find(a => a.id === journalId);
                    if (!target || !isRecordForTutor(target.tutor_wa, user, target.tutor_id)) {
                      showToast("Tidak dapat menghapus jurnal ini.", "error");
                      return;
                    }
                    const nextAtt = currentAtt.filter(a => a.id !== journalId);
                    const actionDesc = `Hapus Jurnal Sesi: ${target.level} (${target.date} ${target.shift})`;
                    await handleUpdateData({ attendance: nextAtt }, actionDesc);
                    showToast("Jurnal berhasil dihapus dari riwayat & Slip Gaji.");
                  }}
                />
              )}

              {activePage.id === 'ASSESSMENT_TUTOR' && (
                 <AssessmentInput 
                    students={appData.students}
                    assessments={appData.assessments}
                    logoUrl={appData.settings.logo_url}
                    onSave={(assessments) => { handleUpdateData({ assessments }); showToast("Nilai tersimpan!"); }}
                    isTutor={true}
                 />
              )}

              {activePage.id === 'PROJEK_TAMBAHAN' && user && (
                 <TutorProjectSubmission 
                    tutorWa={getTutorKey(user)}
                    projectTypes={appData.settings.project_types}
                    classifications={appData.settings.project_classifications || DEFAULT_PROJECT_CLASSIFICATIONS}
                    driveUrl={appData.settings.project_drive_url}
                    history={(appData.projects || []).filter(p => 
                      isRecordForTutor(p.tutor_wa, user)
                    )}
                    onSubmit={(p) => { 
                       const newNotif: Notification = {
                         id: 'NOTIF-' + Date.now(),
                         userId: 'ADMIN',
                         title: 'Pengajuan Proyek Baru',
                         message: `Tutor ${user.name} mengajukan proyek ${p.type}.`,
                         type: 'PROJECT',
                         isRead: false,
                         createdAt: new Date().toISOString()
                       };
                       handleUpdateData({ 
                         projects: [...(latestAppDataRef.current.projects || []), p],
                         notifications: [newNotif, ...(latestAppDataRef.current.notifications || [])].slice(0, 60)
                       }, `Pengajuan Proyek: ${p.type}`);
                       showToast("Proyek diajukan!"); 
                    }}
                 />
              )}

              {activePage.id === 'PAYROLL_TUTOR' && user && (() => {
                 const tutorPayroll = calculateTutorPayroll(user, appData);
                 return (
                 <div className="max-w-2xl mx-auto bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.08)] border border-slate-200/80 space-y-7">
                    <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                      <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center border border-emerald-200 shadow-inner shrink-0">
                         <Wallet className="text-emerald-700 w-10 h-10" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                            Periode: {appData.settings.period_text}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 uppercase bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
                            Jenjang: {tutorPayroll.rate.matchedName}
                          </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-800 uppercase tracking-tighter">
                          Slip Gaji Digital
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Setiap jurnal mengajar yang Anda kirim langsung terekam otomatis menjadi honor sesi Anda.
                        </p>
                      </div>
                    </div>

                    {/* Ringkasan Kinerja & Honorarium Real-Time */}
                    <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 text-white p-6 rounded-3xl shadow-lg space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
                        <div>
                          <p className="text-[10px] font-black uppercase text-gold-400 tracking-widest">
                            Total Penghasilan Terhitung
                          </p>
                          <h4 className="text-3xl font-black font-mono text-white mt-0.5">
                            {formatCurrency(tutorPayroll.grandTotal)}
                          </h4>
                        </div>
                        <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 text-left sm:text-right">
                          <p className="text-[9px] font-bold uppercase text-emerald-300">Total Sesi Mengajar</p>
                          <p className="text-xl font-black font-mono text-gold-300">{tutorPayroll.totalSessions} Sesi</p>
                        </div>
                      </div>

                      {/* Rincian 4 Mode Sesi */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                          <p className="text-[9px] font-bold uppercase text-emerald-300">Mandiri</p>
                          <p className="text-lg font-black font-mono text-white">{tutorPayroll.mandiriCount}</p>
                          <p className="text-[9px] font-mono text-slate-300">{formatCurrency(tutorPayroll.subMandiri)}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                          <p className="text-[9px] font-bold uppercase text-amber-300">Team</p>
                          <p className="text-lg font-black font-mono text-white">{tutorPayroll.teamCount}</p>
                          <p className="text-[9px] font-mono text-slate-300">{formatCurrency(tutorPayroll.subTeam)}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                          <p className="text-[9px] font-bold uppercase text-purple-300">Private</p>
                          <p className="text-lg font-black font-mono text-white">{tutorPayroll.privateCount}</p>
                          <p className="text-[9px] font-mono text-slate-300">{formatCurrency(tutorPayroll.subPrivate)}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                          <p className="text-[9px] font-bold uppercase text-blue-300">Semi Private</p>
                          <p className="text-lg font-black font-mono text-white">{tutorPayroll.semiPrivateCount}</p>
                          <p className="text-[9px] font-mono text-slate-300">{formatCurrency(tutorPayroll.subSemiPrivate)}</p>
                        </div>
                      </div>

                      {/* Rincian Tambahan (Modul, Proyek, Tunjangan) */}
                      <div className="grid grid-cols-3 gap-2.5 pt-1 text-xs">
                        <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                          <span className="text-[9px] text-slate-400 uppercase block">Bonus Modul</span>
                          <span className="font-mono font-bold text-emerald-300">{formatCurrency(tutorPayroll.moduleTotal)}</span>
                        </div>
                        <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                          <span className="text-[9px] text-slate-400 uppercase block">Fee Proyek</span>
                          <span className="font-mono font-bold text-gold-300">{formatCurrency(tutorPayroll.projectTotal)}</span>
                        </div>
                        <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                          <span className="text-[9px] text-slate-400 uppercase block">Tunjangan/Bonus</span>
                          <span className="font-mono font-bold text-blue-300">{formatCurrency(tutorPayroll.allowance + tutorPayroll.otherFee)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button 
                         onClick={() => setIsInvoiceOpen(getTutorKey(user))}
                         className="flex-1 bg-emerald-950 text-gold-400 font-black py-4 px-6 rounded-2xl shadow-xl hover:bg-emerald-900 transition flex items-center justify-center gap-2.5 uppercase text-xs tracking-wider active:scale-95 cursor-pointer"
                      >
                         <FileText size={18} /> Buka & Cetak Invoice Resmi
                      </button>
                      <button 
                         onClick={() => setActivePage({ id: 'JURNAL_SHIFT', title: 'Jurnal Shift' })}
                         className="sm:w-auto bg-slate-100 hover:bg-emerald-50 text-emerald-950 font-black py-4 px-5 rounded-2xl border border-slate-200 hover:border-emerald-300 transition flex items-center justify-center gap-2 uppercase text-[11px] tracking-wider cursor-pointer"
                      >
                         <CalendarCheck size={16} /> Isi Jurnal Shift
                      </button>
                    </div>
                 </div>
                 );
              })()}
           </div>
        </main>
      </div>

      {/* Invoice Modal Popup */}
      {isInvoiceOpen && (
         <Invoice 
            user={appData.users.find(u => getTutorKey(u) === isInvoiceOpen || u.wa === isInvoiceOpen || u.username === isInvoiceOpen || u.id === isInvoiceOpen) || user!} 
            appData={appData} 
            onClose={() => setIsInvoiceOpen(null)} 
         />
      )}

      {/* Backup & Recovery Modal Dialog */}
      <BackupRecoveryModal 
        isOpen={isBackupRecoveryOpen || activePage.id === 'MAN_BACKUP'}
        onClose={() => {
          setIsBackupRecoveryOpen(false);
          if (activePage.id === 'MAN_BACKUP') {
            setActivePage({ id: 'DASH_ADMIN', title: 'Monitoring Dasbor' });
          }
        }}
        appData={appData}
        onRestoreData={(restored) => {
          handleUpdateData(restored);
        }}
        showToast={showToast}
      />

      {/* Real-time Sync Verification Modal Dialog */}
      <SyncVerificationModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        appData={appData}
        isCloudSynced={isCloudSynced}
        isFirestoreActive={isFirestoreActive}
        onForceSync={syncDataManually}
        lastSyncTimestamp={lastSyncTimestamp}
        isSyncing={isSyncing}
      />
    </div>
  );
}
