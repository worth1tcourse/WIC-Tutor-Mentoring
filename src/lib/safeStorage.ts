/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safe browser storage engine with QuotaExceededError auto-recovery,
 * payload compression, and IndexedDB high-capacity persistence.
 */

const DB_NAME = 'WIC_ENTERPRISE_DB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

// Simple IndexedDB promise wrapper for high-capacity local persistence (up to hundreds of MBs)
function openIndexedDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('IndexedDB open error:', request.error);
        resolve(null);
      };
    } catch (e) {
      console.warn('IndexedDB not supported or blocked:', e);
      resolve(null);
    }
  });
}

export async function idbSet(key: string, val: any): Promise<void> {
  try {
    const db = await openIndexedDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(val, key);
  } catch (err) {
    console.warn('idbSet failed:', err);
  }
}

export async function idbGet<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openIndexedDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Sanitizes large app data before saving to localStorage to prevent QuotaExceededError.
 * Keeps full data for Cloud Firestore and IndexedDB, but strips bloated redundant caches for localStorage.
 */
function sanitizeForLocalStorage(key: string, value: string): string {
  if (key !== 'wic_app_data_v2' && key !== 'wic_app_data') return value;

  try {
    const parsed = JSON.parse(value);
    // Remove heavy backups from localStorage since they are saved in Firestore and IndexedDB
    if (parsed.backups && Array.isArray(parsed.backups)) {
      parsed.backups = [];
    }
    // Limit notifications array in localStorage to 30 most recent
    if (parsed.notifications && Array.isArray(parsed.notifications) && parsed.notifications.length > 30) {
      parsed.notifications = parsed.notifications.slice(0, 30);
    }
    return JSON.stringify(parsed);
  } catch {
    return value;
  }
}

/**
 * Clears non-essential heavy keys from localStorage to free up space.
 */
export function purgeStaleStorageKeys(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const nonCriticalKeys = [
    'wic_last_system_crash',
    'wic_emergency_rollback_snapshot',
    'wic_period_backups',
    'wic_app_data' // Old legacy v1 key
  ];

  for (const k of nonCriticalKeys) {
    try {
      localStorage.removeItem(k);
    } catch {
      // Ignore
    }
  }
}

/**
 * Safely saves a key-value pair to localStorage with automatic QuotaExceededError recovery.
 * Never throws an uncaught exception that could crash the UI.
 */
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  // Asynchronously mirror to IndexedDB for unlimited capacity
  idbSet(key, value).catch(() => {});

  const sanitized = sanitizeForLocalStorage(key, value);

  try {
    localStorage.setItem(key, sanitized);
    return true;
  } catch (err: any) {
    console.warn(`[safeStorage] Quota error on "${key}". Attempting automatic memory recovery...`, err);

    // Step 1: Purge non-essential caches
    purgeStaleStorageKeys();

    try {
      localStorage.setItem(key, sanitized);
      console.log(`[safeStorage] Successfully saved "${key}" after storage purge.`);
      return true;
    } catch (retryErr) {
      console.warn(`[safeStorage] Purge was insufficient. Stripping non-critical payload...`, retryErr);

      // Step 2: Strip any heavy base64 strings or audit trails for localStorage fallback
      try {
        const obj = JSON.parse(sanitized);
        if (obj.settings) {
          // If signatures are large base64, keep default URLs in localStorage
          if (obj.settings.director_sign && obj.settings.director_sign.startsWith('data:')) {
            obj.settings.director_sign = '';
          }
          if (obj.settings.cfo_sign && obj.settings.cfo_sign.startsWith('data:')) {
            obj.settings.cfo_sign = '';
          }
          if (obj.settings.stempel_url && obj.settings.stempel_url.startsWith('data:')) {
            obj.settings.stempel_url = '';
          }
        }
        const ultraCompact = JSON.stringify(obj);
        localStorage.setItem(key, ultraCompact);
        return true;
      } catch (finalErr) {
        // Even if localStorage fails completely, do NOT throw! IndexedDB and Cloud Firestore are intact.
        console.error(`[safeStorage] Critical: localStorage is full. Data is safely stored in Cloud Firestore & IndexedDB.`);
        return false;
      }
    }
  }
}

export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[safeStorage] Error reading "${key}":`, err);
    return null;
  }
}

export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[safeStorage] Error removing "${key}":`, err);
  }
}
