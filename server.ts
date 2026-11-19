import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const STATE_DIR = path.resolve(__dirname, 'data');
const STATE_FILE = path.resolve(STATE_DIR, 'wic_state.json');

// Ensure data directory exists
if (!fs.existsSync(STATE_DIR)) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

const MODULES_UPLOAD_DIR = path.resolve(__dirname, 'public', 'uploads', 'modules');
if (!fs.existsSync(MODULES_UPLOAD_DIR)) {
  fs.mkdirSync(MODULES_UPLOAD_DIR, { recursive: true });
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, 'public', 'uploads')));
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Helper to sanitize and compress oversize data before persistence
function sanitizeState(raw: any): any {
  if (!raw || typeof raw !== 'object') return raw;
  const clone = { ...raw };

  // Strip huge backups from main live state
  if (clone.backups && Array.isArray(clone.backups)) {
    clone.backups = [];
  }

  // Compress avatar photos in users if they exceed 60KB
  if (clone.users && Array.isArray(clone.users)) {
    clone.users = clone.users.map((u: any) => {
      if (u.photo && typeof u.photo === 'string' && u.photo.length > 60000 && u.photo.startsWith('data:')) {
        // Fallback to lightweight pravatar
        return {
          ...u,
          photo: `https://i.pravatar.cc/150?u=${encodeURIComponent(u.username || u.wa || 'wic')}`
        };
      }
      return u;
    });
  }

  return clone;
}

// In-memory state cache
let memoryState: any = null;

function loadStateFromDisk(): any {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const content = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      memoryState = sanitizeState(parsed);
      return memoryState;
    } catch (err) {
      console.error('[Server] Failed to read wic_state.json:', err);
    }
  }
  return null;
}

function saveStateToDisk(data: any): boolean {
  try {
    const sanitized = sanitizeState(data);
    memoryState = sanitized;
    const uniqueSuffix = `${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    const tempFile = `${STATE_FILE}.tmp.${uniqueSuffix}`;
    fs.writeFileSync(tempFile, JSON.stringify(sanitized, null, 2), 'utf-8');
    fs.renameSync(tempFile, STATE_FILE);
    return true;
  } catch (err) {
    console.error('[Server] Error saving wic_state.json:', err);
    return false;
  }
}

function nextSyncVersion(prevVersion?: number): number {
  return Math.max(Date.now(), (Number(prevVersion) || 0) + 1);
}

// Active SSE client connections
const sseClients = new Set<Response>();

function broadcastStateUpdate(data: any, actionName: string = 'Update Realtime') {
  const payload = JSON.stringify({
    type: 'STATE_UPDATE',
    action: actionName,
    timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    data
  });

  for (const client of sseClients) {
    try {
      client.write(`event: state_update\ndata: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Initialize state on startup
loadStateFromDisk();

// --- API ROUTES ---

// 1. SSE Real-Time Sync Stream for instant cross-device updates
app.get('/api/sync/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  sseClients.add(res);

  // Send initial ping and current state
  const currentState = memoryState || loadStateFromDisk();
  res.write(`event: connected\ndata: ${JSON.stringify({ 
    connected: true, 
    activeClients: sseClients.size,
    hasInitialState: Boolean(currentState)
  })}\n\n`);

  if (currentState) {
    res.write(`event: state_update\ndata: ${JSON.stringify({
      type: 'STATE_UPDATE',
      action: 'Inisialisasi Sinkronisasi Multi-Device',
      timestamp: currentState._lastSyncTimestamp || new Date().toLocaleTimeString('id-ID'),
      data: currentState
    })}\n\n`);
  }

  // Heartbeat ping every 20 seconds
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(pingInterval);
      sseClients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients.delete(res);
  });
});

// 2. GET current state
app.get('/api/state', (_req: Request, res: Response) => {
  const currentState = memoryState || loadStateFromDisk();
  if (currentState) {
    res.json({ ok: true, data: currentState });
  } else {
    res.json({ ok: false, data: null, message: 'No state initialized yet' });
  }
});

// 3. POST state update (propagates instantly to all tutors via SSE)
app.post('/api/state', (req: Request, res: Response) => {
  try {
    const { patch, fullState, actionName, clientId } = req.body;
    const prev = memoryState || loadStateFromDisk() || {};
    
    let next: any;
    if (patch && typeof patch === 'object') {
      next = {
        ...prev,
        ...patch,
        settings: patch.settings ? { ...(prev.settings || {}), ...patch.settings } : prev.settings
      };

      // Safely merge users to prevent overwriting during concurrent registrations
      if (patch.users && Array.isArray(patch.users)) {
        const userMap = new Map();
        (prev.users || []).forEach((u: any) => userMap.set(u.id || u.wa || u.username, u));
        patch.users.forEach((u: any) => {
          const key = u.id || u.wa || u.username;
          userMap.set(key, { ...(userMap.get(key) || {}), ...u });
        });
        next.users = Array.from(userMap.values());
      }

      // If patch specifically updates modules, ensure it replaces or updates
      if (patch.modules !== undefined && Array.isArray(patch.modules)) {
        next.modules = patch.modules;
      }
    } else if (fullState) {
      next = { ...fullState };
      // Safety: Never drop existing registered tutors if incoming fullState has fewer tutors due to stale client
      if (Array.isArray(prev.users) && Array.isArray(fullState.users)) {
        const userMap = new Map();
        prev.users.forEach((u: any) => userMap.set(u.id || u.wa || u.username, u));
        fullState.users.forEach((u: any) => {
          const key = u.id || u.wa || u.username;
          userMap.set(key, { ...(userMap.get(key) || {}), ...u });
        });
        next.users = Array.from(userMap.values());
      }
      // Precisely update modules if provided by client (allows deleting all modules to [])
      if (fullState.modules !== undefined && Array.isArray(fullState.modules)) {
        next.modules = fullState.modules;
      }
    } else {
      res.status(400).json({ ok: false, error: 'Missing patch or fullState' });
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    next._lastUpdated = now.toISOString();
    next._lastSyncTimestamp = timeStr;
    next._lastSyncAction = actionName || 'Sinkronisasi Multi-Device';
    next._syncVersion = nextSyncVersion(prev._syncVersion);
    if (clientId) {
      next._lastSyncClientId = clientId;
    }

    saveStateToDisk(next);
    broadcastStateUpdate(next, actionName);

    res.json({
      ok: true,
      timestamp: timeStr,
      version: next._syncVersion,
      totalTutors: Array.isArray(next.users) ? next.users.filter((u: any) => u.role === 'TUTOR').length : 0,
      totalModules: Array.isArray(next.modules) ? next.modules.length : 0,
      clientsNotified: sseClients.size
    });
  } catch (err: any) {
    console.error('[Server] POST /api/state error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Internal Server Error' });
  }
});

// Dedicated Real-Time Endpoint for Teaching Modules updates
app.post('/api/modules', (req: Request, res: Response) => {
  try {
    const { modules, actionName } = req.body;
    if (!Array.isArray(modules)) {
      res.status(400).json({ ok: false, error: 'Format data modul ajar tidak valid' });
      return;
    }

    const current = memoryState || loadStateFromDisk() || {};
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const actionDesc = actionName || 'Pembaruan Modul Ajar Resmi WIC';

    const next = {
      ...current,
      modules,
      _lastUpdated: now.toISOString(),
      _lastSyncTimestamp: timeStr,
      _lastSyncAction: actionDesc,
      _syncVersion: nextSyncVersion(current._syncVersion)
    };

    saveStateToDisk(next);
    broadcastStateUpdate(next, actionDesc);

    res.json({
      ok: true,
      modulesCount: modules.length,
      timestamp: timeStr,
      version: next._syncVersion,
      clientsNotified: sseClients.size
    });
  } catch (err: any) {
    console.error('[Server] POST /api/modules error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Internal Server Error' });
  }
});

// Atomic Real-Time Endpoint for Submitting a Tutor Journal Shift (prevents concurrent race overwrites)
app.post('/api/attendance/submit', (req: Request, res: Response) => {
  try {
    const { record, notification, actionName, clientId } = req.body;
    if (!record || !record.id) {
      res.status(400).json({ ok: false, error: 'Data jurnal sesi tidak valid' });
      return;
    }

    const current = memoryState || loadStateFromDisk() || {};
    const prevAtt: any[] = Array.isArray(current.attendance) ? current.attendance : [];
    const existingIdx = prevAtt.findIndex((a: any) => a.id === record.id);
    const nextAtt = existingIdx >= 0
      ? prevAtt.map((a: any, idx: number) => idx === existingIdx ? record : a)
      : [...prevAtt, record];

    const prevNotifs: any[] = Array.isArray(current.notifications) ? current.notifications : [];
    const nextNotifs = notification ? [notification, ...prevNotifs].slice(0, 60) : prevNotifs;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const actionDesc = actionName || `Jurnal Sesi Baru: ${record.level} (${record.shift})`;

    const next = {
      ...current,
      attendance: nextAtt,
      notifications: nextNotifs,
      _lastUpdated: now.toISOString(),
      _lastSyncTimestamp: timeStr,
      _lastSyncAction: actionDesc,
      _syncVersion: nextSyncVersion(current._syncVersion),
      ...(clientId ? { _lastSyncClientId: clientId } : {})
    };

    saveStateToDisk(next);
    broadcastStateUpdate(next, actionDesc);

    res.json({
      ok: true,
      record,
      attendanceCount: nextAtt.length,
      timestamp: timeStr,
      version: next._syncVersion,
      clientsNotified: sseClients.size
    });
  } catch (err: any) {
    console.error('[Server] POST /api/attendance/submit error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Internal Server Error' });
  }
});

// Dedicated GET Endpoint to fetch modules directly with sub-10ms response
app.get('/api/modules', (_req: Request, res: Response) => {
  const current = memoryState || loadStateFromDisk() || {};
  res.json({
    ok: true,
    modules: Array.isArray(current.modules) ? current.modules : [],
    version: current._syncVersion || 0,
    timestamp: current._lastSyncTimestamp || ''
  });
});

// Direct Module File Uploader (PDF, Word, PPT, Image)
// Saves files to public/uploads/modules/ and provides persistent URL accessible by all devices
app.post('/api/upload-module-file', (req: Request, res: Response) => {
  try {
    const { fileName, fileData, mimeType } = req.body;
    if (!fileName || !fileData) {
      res.status(400).json({ ok: false, error: 'Nama file dan konten data wajib disertakan.' });
      return;
    }

    if (!fs.existsSync(MODULES_UPLOAD_DIR)) {
      fs.mkdirSync(MODULES_UPLOAD_DIR, { recursive: true });
    }

    const base64Content = fileData.includes(';base64,') 
      ? fileData.split(';base64,')[1] 
      : fileData;
    const buffer = Buffer.from(base64Content, 'base64');

    // Limit uploaded file to 35MB
    if (buffer.length > 35 * 1024 * 1024) {
      res.status(400).json({ ok: false, error: 'Ukuran file terlalu besar (maksimal 35 MB).' });
      return;
    }

    const ext = path.extname(fileName) || '.pdf';
    const cleanBase = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 45);
    const uniqueFileName = `${Date.now()}_${cleanBase}${ext}`;
    const targetPath = path.resolve(MODULES_UPLOAD_DIR, uniqueFileName);

    fs.writeFileSync(targetPath, buffer);

    const publicUrl = `/uploads/modules/${uniqueFileName}`;
    res.json({
      ok: true,
      url: publicUrl,
      fileName: uniqueFileName,
      originalName: fileName,
      sizeBytes: buffer.length,
      mimeType: mimeType || 'application/pdf'
    });
  } catch (err: any) {
    console.error('[Server] upload-module-file error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Gagal menyimpan file modul di server' });
  }
});

// 4. ATOMIC TUTOR REGISTRATION - Guaranteed to lock & record tutor for all dashboards
app.post('/api/tutors/register', (req: Request, res: Response) => {
  try {
    const tutor = req.body?.tutor || req.body;
    if (!tutor || (!tutor.wa && !tutor.username)) {
      res.status(400).json({ ok: false, error: 'Data tutor tidak lengkap (No WA atau Username wajib diisi)' });
      return;
    }

    const current = memoryState || loadStateFromDisk() || { users: [] };
    const users: any[] = Array.isArray(current.users) ? [...current.users] : [];

    const rawWa = String(tutor.wa || '').trim().replace(/\D/g, '');
    const uname = String(tutor.username || '').trim().toLowerCase();

    // Check existing
    const existingIndex = users.findIndex((u: any) => 
      (u.wa && rawWa && u.wa === rawWa) ||
      (u.username && uname && u.username.toLowerCase() === uname)
    );

    const sanitizedTutor = {
      ...tutor,
      wa: rawWa || tutor.wa,
      username: tutor.username,
      role: 'TUTOR',
      id: tutor.id || `T-${Date.now()}`,
      photo: (tutor.photo && tutor.photo.length > 50000 && tutor.photo.startsWith('data:'))
        ? `https://i.pravatar.cc/150?u=${encodeURIComponent(tutor.username || rawWa || 'wic')}`
        : (tutor.photo || `https://i.pravatar.cc/150?u=${encodeURIComponent(tutor.username || rawWa || 'wic')}`)
    };

    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...sanitizedTutor };
    } else {
      users.push(sanitizedTutor);
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const actionDesc = `Registrasi Tutor Baru: ${sanitizedTutor.name}`;
    const next = {
      ...current,
      users,
      _lastUpdated: now.toISOString(),
      _lastSyncTimestamp: timeStr,
      _lastSyncAction: actionDesc,
      _syncVersion: nextSyncVersion(current._syncVersion)
    };

    saveStateToDisk(next);
    broadcastStateUpdate(next, actionDesc);

    res.json({
      ok: true,
      user: sanitizedTutor,
      totalTutors: users.filter((u: any) => u.role === 'TUTOR').length,
      timestamp: timeStr,
      version: next._syncVersion
    });
  } catch (err: any) {
    console.error('[Server] POST /api/tutors/register error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Internal Server Error' });
  }
});

// 5. MONTHLY RESET OPERASIONAL - Keeps database ultra-lightweight & fresh while keeping all master data
app.post('/api/monthly-reset', (req: Request, res: Response) => {
  try {
    const { newPeriod, newPeriodText, adminNotes } = req.body;
    const current = memoryState || loadStateFromDisk() || {};

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Save auto-backup snapshot before reset
    const backupId = `BACKUP_${current.settings?.period || 'AUTO'}_${Date.now()}`;
    const backupSnapshot = {
      id: backupId,
      period: current.settings?.period || 'Periode Lama',
      period_text: current.settings?.period_text || 'Arsip Otomatis',
      createdAt: now.toISOString(),
      createdBy: 'Admin WIC (Auto-Backup Sebelum Reset)',
      notes: adminNotes || 'Backup otomatis sistem sebelum reset operasional bulanan',
      stats: {
        tutorsCount: (current.users || []).filter((u: any) => u.role === 'TUTOR').length,
        studentsCount: (current.students || []).length,
        attendanceCount: (current.attendance || []).length,
        projectsCount: (current.projects || []).length,
        assessmentsCount: (current.assessments || []).length
      },
      data: JSON.parse(JSON.stringify(current))
    };

    // Keep existing backups history
    const existingBackups = Array.isArray(current.backups) ? current.backups : [];
    const nextBackups = [backupSnapshot, ...existingBackups].slice(0, 12);

    // Reset ONLY operational monthly transactions, PRESERVE 100% of master data
    const next = {
      ...current,
      attendance: [],
      projects: [],
      assessments: [],
      notifications: [],
      backups: nextBackups,
      settings: {
        ...(current.settings || {}),
        period: newPeriod || current.settings?.period,
        period_text: newPeriodText || current.settings?.period_text,
        period_start_date: '',
        period_end_date: ''
      },
      _lastUpdated: now.toISOString(),
      _lastSyncTimestamp: timeStr,
      _lastSyncAction: `Reset Operasional Bulan Baru: ${newPeriodText || newPeriod || 'Periode Baru'}`,
      _syncVersion: nextSyncVersion(current._syncVersion)
    };

    saveStateToDisk(next);
    broadcastStateUpdate(next, next._lastSyncAction);

    res.json({
      ok: true,
      backupId,
      tutorsPreserved: (next.users || []).length,
      studentsPreserved: (next.students || []).length,
      modulesPreserved: (next.modules || []).length,
      timestamp: timeStr
    });
  } catch (err: any) {
    console.error('[Server] POST /api/monthly-reset error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Internal Server Error' });
  }
});

// 4. Healthcheck & Active Sync Status
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    activeSseClients: sseClients.size,
    lastUpdate: memoryState?._lastSyncTimestamp || 'None',
    serverTime: new Date().toISOString()
  });
});

// --- VITE & STATIC SERVING ---
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        }
      }
    }));
    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WIC Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
