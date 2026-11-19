import { AppData } from '../types';
import { syncAppStateToFirestore } from './firebase';

export interface SyncHealthInfo {
  serverHealthy: boolean;
  activeClients: number;
  lastUpdate: string;
}

let activeEventSource: EventSource | null = null;
let reconnectTimer: any = null;
let lastServerSyncVersion = 0;
let pushQueue: Promise<any> = Promise.resolve();
let pendingWriteCount = 0;

export const SYNC_CLIENT_ID = `wic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function getLastServerSyncVersion(): number {
  return lastServerSyncVersion;
}

export function getPendingWriteCount(): number {
  return pendingWriteCount;
}

/**
 * Initializes real-time Server-Sent Events (SSE) synchronization.
 * Subscribes this browser/tab to instantaneous state updates pushed from the server.
 */
export function initRealtimeSync(
  onStateUpdate: (state: AppData, actionName?: string, source?: 'BOOT' | 'SSE' | 'POLL' | 'WAKE') => void,
  onConnectionChange?: (connected: boolean) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  let isDestroyed = false;

  const deliverIfNewer = (
    incoming: AppData | null,
    actionName: string | undefined,
    source: 'BOOT' | 'SSE' | 'POLL' | 'WAKE',
    force: boolean = false
  ) => {
    if (!incoming || isDestroyed) return;
    const ver = Number(incoming._syncVersion || 0);
    if (!force && ver > 0 && ver <= lastServerSyncVersion) {
      return;
    }
    if (ver > lastServerSyncVersion) {
      lastServerSyncVersion = ver;
    }
    onStateUpdate(incoming, actionName, source);
  };

  // 1. Fetch current server state immediately on boot
  fetchServerState().then(initialState => {
    deliverIfNewer(initialState, 'Sinkronisasi Awal', 'BOOT', true);
  }).catch(err => {
    console.warn('[SyncService] Initial state fetch error:', err);
  });

  // 2. Setup EventSource stream
  function connectStream() {
    if (isDestroyed) return;
    try {
      if (activeEventSource) {
        activeEventSource.close();
      }

      const es = new EventSource('/api/sync/stream');
      activeEventSource = es;

      es.onopen = () => {
        if (onConnectionChange) onConnectionChange(true);
        // Refresh state upon reconnect only if server version advanced
        fetchServerState().then(fresh => {
          deliverIfNewer(fresh, 'Sinkronisasi Ulang Koneksi', 'WAKE', false);
        }).catch(() => {});
      };

      es.addEventListener('state_update', (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.data && !isDestroyed) {
            deliverIfNewer(parsed.data, parsed.action, 'SSE', false);
          }
        } catch (e) {
          console.warn('[SyncService] Failed to parse state_update event:', e);
        }
      });

      es.onerror = () => {
        if (onConnectionChange) onConnectionChange(false);
        es.close();
        if (!reconnectTimer && !isDestroyed) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connectStream();
          }, 3500);
        }
      };
    } catch (e) {
      console.warn('[SyncService] EventSource initialization failed:', e);
    }
  }

  connectStream();

  // 3. Multi-Device Wake-Up & Visibility Listener:
  // Mobile browsers (Android/iOS) cut SSE when locked or when switching apps.
  // When user returns/unlocks screen, immediately catch up with server state!
  const handleVisibilityOrFocus = () => {
    if (document.visibilityState === 'visible' && !isDestroyed) {
      fetchServerState().then(fresh => {
        deliverIfNewer(fresh, 'Sinkronisasi Layar Aktif', 'WAKE', false);
      }).catch(() => {});
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityOrFocus);
  window.addEventListener('focus', handleVisibilityOrFocus);

  // 4. Periodic background safety catch-up every 15 seconds (only notifies UI if version changed)
  const pollInterval = setInterval(() => {
    if (!isDestroyed && document.visibilityState === 'visible') {
      fetchServerState().then(fresh => {
        deliverIfNewer(fresh, 'Auto-Check Berkala', 'POLL', false);
      }).catch(() => {});
    }
  }, 15000);

  return () => {
    isDestroyed = true;
    clearInterval(pollInterval);
    document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    window.removeEventListener('focus', handleVisibilityOrFocus);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (activeEventSource) {
      activeEventSource.close();
      activeEventSource = null;
    }
  };
}

/**
 * Fetches the master state directly from the backend server
 */
export async function fetchServerState(): Promise<AppData | null> {
  try {
    const res = await fetch('/api/state', {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.ok && json.data) {
      return json.data as AppData;
    }
    return null;
  } catch (err) {
    console.warn('[SyncService] fetchServerState error:', err);
    return null;
  }
}

/**
 * Pushes updated state or patch to the backend server in strict sequential order.
 * The server immediately propagates this update to all other connected clients via SSE.
 * Simultaneously performs a serialized update to Cloud Firestore using the authoritative version.
 */
export function pushLiveUpdate(
  patchOrFullState: { patch?: Partial<AppData>; fullState?: AppData },
  actionName: string = 'Pembaruan Data Otomatis'
): Promise<boolean> {
  pendingWriteCount++;
  const run = async (): Promise<boolean> => {
    let serverOk = false;
    let authoritativeVersion: number | undefined;

    try {
      try {
        const res = await fetch('/api/state', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...patchOrFullState,
            actionName,
            clientId: SYNC_CLIENT_ID
          })
        });

        if (res.ok) {
          const data = await res.json();
          serverOk = Boolean(data.ok);
          if (data.version && Number(data.version) > lastServerSyncVersion) {
            lastServerSyncVersion = Number(data.version);
          }
          if (data.version) {
            authoritativeVersion = Number(data.version);
          }
        }
      } catch (err) {
        console.warn('[SyncService] pushLiveUpdate server error:', err);
      }

      // Serialized Firestore cloud sync (awaited inside queue so rapid updates never commit out of order)
      const dataToSync = patchOrFullState.fullState || patchOrFullState.patch;
      if (dataToSync) {
        try {
          const nextVer = Math.max(authoritativeVersion || 0, Date.now(), lastServerSyncVersion + 1);
          lastServerSyncVersion = Math.max(lastServerSyncVersion, nextVer);
          await syncAppStateToFirestore(
            {
              ...dataToSync,
              _syncVersion: nextVer,
              _lastSyncClientId: SYNC_CLIENT_ID
            } as any,
            actionName
          );
          serverOk = true;
        } catch (firestoreErr) {
          console.warn('[SyncService] Secondary Firestore sync notice:', firestoreErr);
        }
      }

      return serverOk;
    } finally {
      pendingWriteCount = Math.max(0, pendingWriteCount - 1);
    }
  };

  const chained = pushQueue.then(run, run);
  pushQueue = chained.catch(() => false);
  return chained;
}

/**
 * Registers a new tutor atomically on the backend server.
 * Instantly broadcasts to admin dashboard & locks tutor persistently.
 */
export async function registerTutorOnServer(tutor: any): Promise<{ ok: boolean; user?: any; totalTutors?: number; error?: string }> {
  try {
    const res = await fetch('/api/tutors/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tutor })
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.warn('[SyncService] registerTutorOnServer error:', err);
    return { ok: false, error: err.message || 'Gagal menghubungi server' };
  }
}

/**
 * Triggers monthly operational reset on backend server with auto-backup snapshot.
 */
export async function triggerServerMonthlyReset(
  newPeriod?: string,
  newPeriodText?: string,
  adminNotes?: string
): Promise<{ ok: boolean; backupId?: string; tutorsPreserved?: number; error?: string }> {
  try {
    const res = await fetch('/api/monthly-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newPeriod, newPeriodText, adminNotes })
    });
    return await res.json();
  } catch (err: any) {
    console.warn('[SyncService] triggerServerMonthlyReset error:', err);
    return { ok: false, error: err.message || 'Gagal menghubungi server' };
  }
}

/**
 * Updates teaching modules atomically on backend server and broadcasts via SSE to all tutors.
 */
export async function updateServerModules(
  modules: any[],
  actionName: string = 'Pembaruan Modul Ajar Resmi'
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modules, actionName })
    });
    const json = await res.json();
    return { ok: Boolean(json.ok) };
  } catch (err: any) {
    console.warn('[SyncService] updateServerModules error:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Atomically submits a teaching journal attendance record to the backend server,
 * preventing race conditions and broadcasting immediately to all connected dashboards.
 */
export async function submitAttendanceOnServer(
  record: any,
  notification?: any,
  actionName?: string
): Promise<{ ok: boolean; totalAttendance?: number; version?: number; data?: AppData; error?: string }> {
  pendingWriteCount++;
  try {
    const res = await fetch('/api/attendance/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record, notification, actionName, clientId: SYNC_CLIENT_ID })
    });
    const json = await res.json();
    if (json.version && Number(json.version) > lastServerSyncVersion) {
      lastServerSyncVersion = Number(json.version);
    }
    return json;
  } catch (err: any) {
    console.warn('[SyncService] submitAttendanceOnServer error:', err);
    return { ok: false, error: err.message || 'Gagal mengirim jurnal ke server' };
  } finally {
    pendingWriteCount = Math.max(0, pendingWriteCount - 1);
  }
}

/**
 * Checks server health and active live clients
 */
export async function checkSyncHealth(): Promise<SyncHealthInfo> {
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      const data = await res.json();
      return {
        serverHealthy: data.status === 'healthy',
        activeClients: data.activeSseClients || 0,
        lastUpdate: data.lastUpdate || '-'
      };
    }
  } catch {
    // offline or error
  }
  return {
    serverHealthy: false,
    activeClients: 0,
    lastUpdate: '-'
  };
}

/**
 * Fetches teaching modules directly from the backend server.
 */
export async function fetchServerModules(): Promise<{ ok: boolean; modules: any[]; version: number }> {
  try {
    const res = await fetch('/api/modules', { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[SyncService] fetchServerModules error:', e);
  }
  return { ok: false, modules: [], version: 0 };
}

/**
 * Uploads a local module document file (PDF, Word, PPT, Image) directly to the server.
 * Returns permanent URL accessible by all devices without Google Drive permission hurdles.
 */
export async function uploadModuleFile(
  file: File
): Promise<{ ok: boolean; url?: string; fileName?: string; originalName?: string; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch('/api/upload-module-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileData: base64Data,
            mimeType: file.type
          })
        });
        const json = await res.json();
        resolve(json);
      } catch (err: any) {
        resolve({ ok: false, error: err.message || 'Gagal mengupload file ke server' });
      }
    };
    reader.onerror = () => {
      resolve({ ok: false, error: 'Gagal membaca file dari memori perangkat' });
    };
    reader.readAsDataURL(file);
  });
}
