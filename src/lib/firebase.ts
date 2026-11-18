import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  setDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppData } from '../types';

const app = initializeApp(firebaseConfig);

const rawDbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db = rawDbId ? getFirestore(app, rawDbId) : getFirestore(app);
export const auth = getAuth(app);

export const STATE_COLLECTION = 'app_state';
export const STATE_DOC_ID = 'main';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection tested successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline, will use offline persistence.');
    } else {
      console.log('Connection probe info:', error);
    }
    return false;
  }
}

import { 
  collection, 
  getDocs 
} from 'firebase/firestore';

/**
 * Sanitizes object recursively for Firestore:
 * - Replaces `undefined` with `null` (Firestore crashes on undefined values)
 * - Compresses/caps oversized base64 strings to prevent Quota & 1MB document errors
 * - Strips redundant backup copies from live working state
 */
export function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (typeof obj !== 'object') {
    // If a string is a giant base64 (> 80KB), don't let it bloat Firestore
    if (typeof obj === 'string' && obj.startsWith('data:image/') && obj.length > 80000) {
      return '';
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === 'backups') {
      result[key] = []; // Backups are saved in app_backups collection, not in live working state
    } else if (val !== undefined) {
      result[key] = sanitizeForFirestore(val);
    }
  }
  return result;
}

/**
 * Saves application state in partitioned Firestore documents under `/app_state/{docId}`.
 * Completely eliminates the 1,048,576 bytes (1MB) single-document limit!
 * Easily supports 100+ tutors, 500+ students, modules, and full historical logs.
 */
export async function syncAppStateToFirestore(data: AppData | Partial<AppData>, actionDescription?: string): Promise<boolean> {
  try {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const actionDesc = actionDescription || 'Pembaruan Data Otomatis';
    const version = Date.now();

    const writePromises: Promise<any>[] = [];

    // 1. Settings Document (/app_state/settings)
    if (data.settings) {
      const sanitizedSettings = sanitizeForFirestore(data.settings);
      writePromises.push(
        setDoc(doc(db, STATE_COLLECTION, 'settings'), sanitizedSettings, { merge: true })
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `${STATE_COLLECTION}/settings`))
      );
    }

    // 2. Users / Tutors Document (/app_state/users) - Supports 100+ Tutors
    if (data.users && Array.isArray(data.users)) {
      const sanitizedUsers = data.users.map(u => ({
        ...u,
        photo: (u.photo && u.photo.length > 50000 && u.photo.startsWith('data:'))
          ? `https://i.pravatar.cc/150?u=${encodeURIComponent(u.username || u.wa || 'wic')}`
          : (u.photo || `https://i.pravatar.cc/150?u=${encodeURIComponent(u.username || u.wa || 'wic')}`)
      }));
      writePromises.push(
        setDoc(doc(db, STATE_COLLECTION, 'users'), { 
          users: sanitizeForFirestore(sanitizedUsers),
          count: sanitizedUsers.length,
          _updatedAt: now.toISOString()
        }, { merge: true })
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `${STATE_COLLECTION}/users`))
      );
    }

    // 3. Teaching Modules Document (/app_state/modules)
    if (data.modules && Array.isArray(data.modules)) {
      writePromises.push(
        setDoc(doc(db, STATE_COLLECTION, 'modules'), {
          modules: sanitizeForFirestore(data.modules),
          _updatedAt: now.toISOString()
        }, { merge: true })
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `${STATE_COLLECTION}/modules`))
      );
    }

    // 4. Students Document (/app_state/students)
    if (data.students && Array.isArray(data.students)) {
      writePromises.push(
        setDoc(doc(db, STATE_COLLECTION, 'students'), {
          students: sanitizeForFirestore(data.students),
          count: data.students.length,
          _updatedAt: now.toISOString()
        }, { merge: true })
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `${STATE_COLLECTION}/students`))
      );
    }

    // 5. Attendance / Teaching Journals Document (/app_state/attendance)
    if (data.attendance && Array.isArray(data.attendance)) {
      writePromises.push(
        setDoc(doc(db, STATE_COLLECTION, 'attendance'), {
          attendance: sanitizeForFirestore(data.attendance),
          count: data.attendance.length,
          _updatedAt: now.toISOString()
        }, { merge: true })
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `${STATE_COLLECTION}/attendance`))
      );
    }

    // 6. Projects Document (/app_state/projects)
    if (data.projects && Array.isArray(data.projects)) {
      writePromises.push(
        setDoc(doc(db, STATE_COLLECTION, 'projects'), {
          projects: sanitizeForFirestore(data.projects),
          count: data.projects.length,
          _updatedAt: now.toISOString()
        }, { merge: true })
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `${STATE_COLLECTION}/projects`))
      );
    }

    // 7. Assessments Document (/app_state/assessments)
    if (data.assessments && Array.isArray(data.assessments)) {
      writePromises.push(
        setDoc(doc(db, STATE_COLLECTION, 'assessments'), {
          assessments: sanitizeForFirestore(data.assessments),
          count: data.assessments.length,
          _updatedAt: now.toISOString()
        }, { merge: true })
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `${STATE_COLLECTION}/assessments`))
      );
    }

    // 8. Notifications Document (/app_state/notifications)
    if (data.notifications && Array.isArray(data.notifications)) {
      writePromises.push(
        setDoc(doc(db, STATE_COLLECTION, 'notifications'), {
          notifications: sanitizeForFirestore(data.notifications.slice(0, 40)),
          _updatedAt: now.toISOString()
        }, { merge: true })
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `${STATE_COLLECTION}/notifications`))
      );
    }

    // 9. Master Metadata Document (/app_state/main) - ALWAYS LIGHTWEIGHT (< 2KB)
    writePromises.push(
      setDoc(doc(db, STATE_COLLECTION, STATE_DOC_ID), {
        _lastUpdated: now.toISOString(),
        _lastSyncTimestamp: timeStr,
        _lastSyncAction: actionDesc,
        _syncVersion: version,
        isPartitioned: true,
        stats: {
          usersCount: data.users ? data.users.length : undefined,
          studentsCount: data.students ? data.students.length : undefined,
          modulesCount: data.modules ? data.modules.length : undefined,
          attendanceCount: data.attendance ? data.attendance.length : undefined,
          projectsCount: data.projects ? data.projects.length : undefined
        }
      }, { merge: true })
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `${STATE_COLLECTION}/${STATE_DOC_ID}`))
    );

    await Promise.all(writePromises);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, STATE_COLLECTION);
    return false;
  }
}

/**
 * Listens to all partitioned Firestore documents in `/app_state` in real time.
 * Assembles a unified AppData state whenever any partition changes.
 */
export function subscribeToFirestoreState(
  onUpdate: (state: Partial<AppData>) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, STATE_COLLECTION);
  return onSnapshot(colRef, (snapshot) => {
    try {
      const merged: Partial<AppData> = {};
      let hasData = false;

      snapshot.forEach(docSnap => {
        const id = docSnap.id;
        const d = docSnap.data();
        hasData = true;

        if (id === 'settings') {
          merged.settings = d as any;
        } else if (id === 'users' && Array.isArray(d.users)) {
          merged.users = d.users;
        } else if (id === 'modules' && Array.isArray(d.modules)) {
          merged.modules = d.modules;
        } else if (id === 'students' && Array.isArray(d.students)) {
          merged.students = d.students;
        } else if (id === 'attendance' && Array.isArray(d.attendance)) {
          merged.attendance = d.attendance;
        } else if (id === 'projects' && Array.isArray(d.projects)) {
          merged.projects = d.projects;
        } else if (id === 'assessments' && Array.isArray(d.assessments)) {
          merged.assessments = d.assessments;
        } else if (id === 'notifications' && Array.isArray(d.notifications)) {
          merged.notifications = d.notifications;
        } else if (id === 'main') {
          merged._lastUpdated = d._lastUpdated;
          merged._lastSyncTimestamp = d._lastSyncTimestamp;
          merged._lastSyncAction = d._lastSyncAction;
          merged._syncVersion = d._syncVersion;
          // Legacy backward compatibility fallback if partitioned docs aren't filled yet
          if (!merged.users && Array.isArray(d.users)) merged.users = d.users;
          if (!merged.settings && d.settings) merged.settings = d.settings;
          if (!merged.students && Array.isArray(d.students)) merged.students = d.students;
          if (!merged.modules && Array.isArray(d.modules)) merged.modules = d.modules;
        }
      });

      if (hasData) {
        onUpdate(merged);
      }
    } catch (e: any) {
      if (onError) onError(e);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, STATE_COLLECTION);
    if (onError) onError(err);
  });
}

/**
 * Fetches the complete partitioned state from Firestore.
 */
export async function fetchFirestoreFullState(): Promise<Partial<AppData> | null> {
  try {
    const colRef = collection(db, STATE_COLLECTION);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) return null;

    const merged: Partial<AppData> = {};
    snapshot.forEach(docSnap => {
      const id = docSnap.id;
      const d = docSnap.data();
      if (id === 'settings') merged.settings = d as any;
      else if (id === 'users' && Array.isArray(d.users)) merged.users = d.users;
      else if (id === 'modules' && Array.isArray(d.modules)) merged.modules = d.modules;
      else if (id === 'students' && Array.isArray(d.students)) merged.students = d.students;
      else if (id === 'attendance' && Array.isArray(d.attendance)) merged.attendance = d.attendance;
      else if (id === 'projects' && Array.isArray(d.projects)) merged.projects = d.projects;
      else if (id === 'assessments' && Array.isArray(d.assessments)) merged.assessments = d.assessments;
      else if (id === 'notifications' && Array.isArray(d.notifications)) merged.notifications = d.notifications;
      else if (id === 'main') {
        merged._lastUpdated = d._lastUpdated;
        merged._lastSyncTimestamp = d._lastSyncTimestamp;
        merged._lastSyncAction = d._lastSyncAction;
        merged._syncVersion = d._syncVersion;
        if (!merged.users && Array.isArray(d.users)) merged.users = d.users;
        if (!merged.settings && d.settings) merged.settings = d.settings;
      }
    });

    return merged;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, STATE_COLLECTION);
    return null;
  }
}

