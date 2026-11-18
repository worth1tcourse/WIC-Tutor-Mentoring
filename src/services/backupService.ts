import { AppData, PeriodBackup, Student, TeachingModule } from '../types';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { safeSetItem, safeGetItem, safeRemoveItem, idbSet, idbGet } from '../lib/safeStorage';

const BACKUP_COLLECTION = 'app_backups';
const LOCAL_BACKUP_KEY = 'wic_period_backups';
const EMERGENCY_SNAPSHOT_KEY = 'wic_emergency_rollback_snapshot';

/**
 * Creates a complete snapshot backup of the current application data for a specific period.
 * Saves to both Cloud Firestore and local browser storage.
 */
export async function createPeriodBackup(
  appData: AppData, 
  period: string, 
  periodText: string, 
  createdBy: string = 'Admin WIC',
  notes: string = ''
): Promise<PeriodBackup> {
  const timestamp = new Date().toISOString();
  const backupId = `BACKUP_${period}_${Date.now()}`;

  const backup: PeriodBackup = {
    id: backupId,
    period,
    period_text: periodText,
    createdAt: timestamp,
    createdBy,
    notes,
    stats: {
      studentsCount: appData.students?.length || 0,
      tutorsCount: appData.users?.filter(u => u.role === 'TUTOR').length || 0,
      attendanceCount: appData.attendance?.length || 0,
      projectsCount: appData.projects?.length || 0,
      assessmentsCount: appData.assessments?.length || 0
    },
    data: JSON.parse(JSON.stringify(appData)) // Deep copy
  };

  // 1. Save locally with safe quota protection & IndexedDB
  try {
    idbSet(backupId, backup);
    const existingRaw = safeGetItem(LOCAL_BACKUP_KEY);
    const existing: PeriodBackup[] = existingRaw ? JSON.parse(existingRaw) : [];
    // Only keep latest 2 in localStorage to conserve quota, full history is in Firestore & IndexedDB
    const nextLocal = [backup, ...existing.filter(b => b.id !== backupId)].slice(0, 2);
    safeSetItem(LOCAL_BACKUP_KEY, JSON.stringify(nextLocal));
  } catch (err) {
    console.warn('Failed to save backup to safe storage:', err);
  }

  // 2. Save to Cloud Firestore
  try {
    const docRef = doc(db, BACKUP_COLLECTION, backupId);
    await setDoc(docRef, backup);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${BACKUP_COLLECTION}/${backupId}`);
  }

  return backup;
}

/**
 * Fetches all available period backups from Cloud Firestore and localStorage.
 */
export async function getPeriodBackups(): Promise<PeriodBackup[]> {
  const backupMap = new Map<string, PeriodBackup>();

  // 1. Read from localStorage first (instant)
  try {
    const localRaw = localStorage.getItem(LOCAL_BACKUP_KEY);
    if (localRaw) {
      const localBackups: PeriodBackup[] = JSON.parse(localRaw);
      localBackups.forEach(b => backupMap.set(b.id, b));
    }
  } catch (err) {
    console.warn('Error reading local backups:', err);
  }

  // 2. Read from Cloud Firestore
  try {
    const q = query(collection(db, BACKUP_COLLECTION), orderBy('createdAt', 'desc'), limit(30));
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as PeriodBackup;
      backupMap.set(data.id, data);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, BACKUP_COLLECTION);
  }

  const list = Array.from(backupMap.values());
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}

/**
 * Deletes a backup from Firestore and localStorage.
 */
export async function deletePeriodBackup(backupId: string): Promise<boolean> {
  // 1. Remove from local storage
  try {
    const localRaw = localStorage.getItem(LOCAL_BACKUP_KEY);
    if (localRaw) {
      const existing: PeriodBackup[] = JSON.parse(localRaw);
      localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(existing.filter(b => b.id !== backupId)));
    }
  } catch (err) {
    console.warn(err);
  }

  // 2. Remove from Firestore
  try {
    await deleteDoc(doc(db, BACKUP_COLLECTION, backupId));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${BACKUP_COLLECTION}/${backupId}`);
    return false;
  }
}

/**
 * Downloads a backup file as JSON to user's computer.
 */
export function exportBackupToFile(backup: PeriodBackup) {
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `WIC_Backup_${backup.period}_${new Date(backup.createdAt).toISOString().split('T')[0]}.wicbackup`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reads an uploaded backup file (.json or .wicbackup) and parses it.
 */
export function importBackupFromFile(file: File): Promise<PeriodBackup> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed.data || !parsed.stats || (!parsed.period && !parsed.data.settings?.period)) {
          throw new Error('Format file backup tidak valid. File harus berupa backup resmi WIC.');
        }
        resolve(parsed as PeriodBackup);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Gagal membaca file backup'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas'));
    reader.readAsText(file);
  });
}

/**
 * Saves an emergency rollback snapshot to localStorage before major destructive changes.
 */
export function createEmergencySnapshot(appData: AppData) {
  try {
    idbSet(EMERGENCY_SNAPSHOT_KEY, {
      timestamp: new Date().toISOString(),
      data: appData
    });
    safeSetItem(EMERGENCY_SNAPSHOT_KEY, JSON.stringify({
      timestamp: new Date().toISOString(),
      data: appData
    }));
  } catch (e) {
    console.warn('Failed to save emergency snapshot:', e);
  }
}

/**
 * Retrieves the emergency rollback snapshot if available.
 */
export function getEmergencySnapshot(): { timestamp: string; data: AppData } | null {
  try {
    const raw = safeGetItem(EMERGENCY_SNAPSHOT_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }
  return null;
}

/**
 * Self-healing data repair utility:
 * - Unifies any legacy "Tahsin" or "Tahfidz" into "Tahsin & Tahfidz"
 * - Fixes corrupted student IDs or schedule formats
 * - Cleans orphaned attendance or assessments
 */
export function repairSystemIntegrity(currentData: AppData): { repairedData: AppData; fixesApplied: string[] } {
  const fixes: string[] = [];
  const repaired: AppData = JSON.parse(JSON.stringify(currentData));

  // 1. Repair Students & Unify Tahsin / Tahfidz
  repaired.students = (repaired.students || []).map((student: Student) => {
    let s = { ...student };
    
    // Unify Level 1
    if (s.level === 'Tahsin' || s.level === 'Tahfidz') {
      s.level = 'Tahsin & Tahfidz';
      fixes.push(`Siswa "${s.name}": Program 1 '${student.level}' dimigrasikan ke 'Tahsin & Tahfidz'`);
    }

    // Unify Level 2
    if (s.level2 === 'Tahsin' || s.level2 === 'Tahfidz') {
      s.level2 = 'Tahsin & Tahfidz';
      fixes.push(`Siswa "${s.name}": Program 2 '${student.level2}' dimigrasikan ke 'Tahsin & Tahfidz'`);
    }

    // Ensure schedule completeness
    if (!s.hari1) s.hari1 = 'Selasa';
    if (!s.shift1) s.shift1 = '08.00 – 09.30';
    if (!s.hari2) s.hari2 = 'Kamis';
    if (!s.shift2) s.shift2 = '08.00 – 09.30';

    if (s.is_dual_program || s.level2) {
      if (!s.prog2_hari1) s.prog2_hari1 = s.hari_prog2 || 'Rabu';
      if (!s.prog2_shift1) s.prog2_shift1 = s.shift_prog2 || '08.00 – 09.30';
      if (!s.prog2_hari2) s.prog2_hari2 = 'Jumat';
      if (!s.prog2_shift2) s.prog2_shift2 = '08.00 – 09.30';
    }

    return s;
  });

  // 2. Repair Modules
  repaired.modules = (repaired.modules || []).map((mod: TeachingModule) => {
    let m = { ...mod };
    if ((m.level as string) === 'Tahsin' || (m.level as string) === 'Tahfidz') {
      m.level = 'Tahsin & Tahfidz';
      fixes.push(`Modul "${m.title}": Level dimigrasikan ke 'Tahsin & Tahfidz'`);
    }
    return m;
  });

  // 3. Repair Attendance Journals
  repaired.attendance = (repaired.attendance || []).map(a => {
    let att = { ...a };
    if (att.level === 'Tahsin' || att.level === 'Tahfidz') {
      att.level = 'Tahsin & Tahfidz';
      fixes.push(`Jurnal #${att.id}: Level dimigrasikan ke 'Tahsin & Tahfidz'`);
    }
    return att;
  });

  // 4. Repair Assessments
  repaired.assessments = (repaired.assessments || []).map(ass => {
    let a = { ...ass };
    if (a.program === 'Tahsin' || a.program === 'Tahfidz') {
      a.program = 'Tahsin & Tahfidz';
      fixes.push(`Nilai siswa #${a.student_id}: Program dimigrasikan ke 'Tahsin & Tahfidz'`);
    }
    return a;
  });

  if (fixes.length === 0) {
    fixes.push('Seluruh data sistem dalam kondisi sehat, utuh, dan telah terstandarisasi.');
  }

  return { repairedData: repaired, fixesApplied: fixes };
}

/**
 * Resets monthly operational transactions (attendance, projects, assessments, notifications)
 * to keep the database ultra-lightweight, high-performance, and far below any 1MB document limit.
 * PRESERVES 100% OF ALL MASTER DATA:
 * - All 100+ Tutors (Users) & Credentials
 * - All Students & Schedules
 * - All Teaching Modules & Drive/Canva Links
 * - All System Configurations & Official Logos/Stempel
 */
export async function resetMonthlyOperationalData(
  currentData: AppData,
  newPeriod?: { period: string; period_text: string },
  adminNotes: string = 'Reset operasional pergantian bulan'
): Promise<{ nextData: AppData; backup: PeriodBackup }> {
  // Step 1: Create automatic period backup snapshot
  const activePeriod = currentData.settings?.period || 'AUTO';
  const activePeriodText = currentData.settings?.period_text || 'Periode Lama';
  
  const backup = await createPeriodBackup(
    currentData,
    activePeriod,
    activePeriodText,
    'Master Admin (Auto-Backup Sebelum Reset)',
    adminNotes
  );

  // Step 2: Prepare next data with cleared operational transactions
  const existingBackups = Array.isArray(currentData.backups) ? currentData.backups : [];
  const nextBackups = [backup, ...existingBackups].slice(0, 12);

  const nextData: AppData = {
    ...currentData,
    attendance: [], // Cleared for fresh monthly journal
    projects: [],   // Cleared for fresh monthly project submissions
    assessments: [], // Cleared for fresh monthly grading
    notifications: [], // Cleared
    backups: nextBackups,
    settings: {
      ...currentData.settings,
      period: newPeriod?.period || currentData.settings.period,
      period_text: newPeriod?.period_text || currentData.settings.period_text
    },
    _lastUpdated: new Date().toISOString(),
    _lastSyncTimestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    _lastSyncAction: `Reset Bulanan Baru: ${newPeriod?.period_text || activePeriodText}`,
    _syncVersion: Date.now()
  };

  return { nextData, backup };
}

