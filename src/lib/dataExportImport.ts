import Papa from 'papaparse';
import {
  User,
  Student,
  TeachingModule,
  ModuleLevel,
  Assessment,
  ProjectClassification,
  ProjectType,
  ProjectItemDefinition
} from '../types';

// ---------- Generic File Helpers ----------

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCSV(rows: Record<string, any>[], filename: string) {
  const csv = '\uFEFF' + Papa.unparse(rows);
  triggerDownload(csv, filename.endsWith('.csv') ? filename : `${filename}.csv`, 'text/csv;charset=utf-8;');
}

export function downloadJSON(payload: any, filename: string) {
  const json = JSON.stringify(payload, null, 2);
  triggerDownload(json, filename.endsWith('.json') ? filename : `${filename}.json`, 'application/json;charset=utf-8;');
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file dari perangkat.'));
    reader.readAsText(file, 'UTF-8');
  });
}

function parseBooleanValue(val: any): boolean {
  if (typeof val === 'boolean') return val;
  const s = String(val ?? '').trim().toLowerCase();
  return ['true', '1', 'ya', 'yes', 'aktif', 'y', 'ya (dual)', 'tersertifikasi'].includes(s);
}

function parseNumberValue(val: any, fallback = 0): number {
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  const cleaned = String(val ?? '').replace(/[^0-9.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeNameKey(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isJsonFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.json') || file.type === 'application/json';
}

function parseCsvRows(text: string): Record<string, any>[] {
  const cleanText = text.replace(/^\uFEFF/, '');
  const res = Papa.parse<Record<string, any>>(cleanText, {
    header: true,
    skipEmptyLines: true
  });
  return Array.isArray(res.data) ? res.data : [];
}

// =====================================================================
// 1. TUTOR & TUNJANGAN (CSV & JSON)
// =====================================================================

export function exportTutorsCSV(users: User[]) {
  const tutors = users.filter(u => u.role === 'TUTOR');
  const rows = tutors.map(t => ({
    'ID Tutor': t.id || '',
    'Nama Lengkap': t.name || '',
    'Username': t.username || '',
    'Password': t.password || '',
    'No WA': t.wa || '',
    'Email': t.email || '',
    'Sapaan / Gender': t.gender || '',
    'Status Tutor': t.status_tutor || 'Probation',
    'Tersertifikasi': t.is_certified ? 'YA' : 'TIDAK',
    'Nama Sertifikasi': t.certification_name || '',
    'Tunjangan Reguler': t.manual_allowance || 0,
    'Catatan Tunjangan': t.allowance_note || '',
    'Fee Tambahan': t.other_fee || 0,
    'Catatan Fee Tambahan': t.other_fee_note || '',
    'Metode Bayar': t.payment_method || '',
    'Nama Bank': t.bank_name || '',
    'No Rekening': t.bank_account || '',
    'Atas Nama Rekening': t.bank_holder || '',
    'Foto URL': t.photo || ''
  }));
  const dateTag = new Date().toISOString().split('T')[0];
  downloadCSV(rows, `WIC_Tutor_Tunjangan_${dateTag}.csv`);
}

export function exportTutorsJSON(users: User[]) {
  const tutors = users.filter(u => u.role === 'TUTOR');
  const dateTag = new Date().toISOString().split('T')[0];
  downloadJSON(
    {
      type: 'WIC_TUTORS_EXPORT',
      exportedAt: new Date().toISOString(),
      count: tutors.length,
      tutors
    },
    `WIC_Tutor_Tunjangan_${dateTag}.json`
  );
}

export async function importTutorsFromFile(
  file: File,
  existingUsers: User[]
): Promise<{ users: User[]; added: number; updated: number }> {
  const text = await readFileAsText(file);
  let rawItems: any[] = [];

  if (isJsonFile(file)) {
    const parsed = JSON.parse(text);
    rawItems = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.tutors)
        ? parsed.tutors
        : Array.isArray(parsed?.users)
          ? parsed.users
          : Array.isArray(parsed?.data?.users)
            ? parsed.data.users
            : [];
  } else {
    rawItems = parseCsvRows(text);
  }

  if (!rawItems.length) {
    throw new Error('File tidak berisi data tutor yang valid.');
  }

  const nextUsers: User[] = [...existingUsers];
  let added = 0;
  let updated = 0;

  rawItems.forEach((row, idx) => {
    const roleVal = String(row.role || row.Role || 'TUTOR').toUpperCase();
    if (roleVal === 'ADMIN') return; // Jangan timpa akun ADMIN saat import tutor

    const name = String(row['Nama Lengkap'] || row['Nama Tutor'] || row.Nama || row.name || '').trim();
    const rawWa = String(row['No WA'] || row['No. WA'] || row.WA || row.wa || '').trim().replace(/\D/g, '');
    const username = String(row['Username'] || row.username || rawWa || name.replace(/\s+/g, '').toLowerCase()).trim();
    if (!name && !username && !rawWa) return;

    const incomingId = String(row['ID Tutor'] || row.ID || row.id || '').trim();
    const statusTutor = String(row['Status Tutor'] || row.Status || row.status_tutor || 'Probation').trim();
    const isCert =
      row['Tersertifikasi'] !== undefined
        ? parseBooleanValue(row['Tersertifikasi'])
        : row.is_certified !== undefined
          ? parseBooleanValue(row.is_certified)
          : statusTutor.toLowerCase().includes('sertifikasi');

    const incoming: Partial<User> = {
      name: name || username,
      username,
      wa: rawWa || String(row['No WA'] || row.wa || '').trim(),
      email: String(row['Email'] || row.email || `${username}@wic.com`).trim(),
      gender: String(row['Sapaan / Gender'] || row.Gender || row.gender || '').trim() || undefined,
      status_tutor: statusTutor,
      is_certified: isCert,
      certification_name: String(row['Nama Sertifikasi'] || row.certification_name || '').trim(),
      manual_allowance: parseNumberValue(row['Tunjangan Reguler'] ?? row.manual_allowance, 0),
      allowance_note: String(row['Catatan Tunjangan'] ?? row.allowance_note ?? '').trim(),
      other_fee: parseNumberValue(row['Fee Tambahan'] ?? row.other_fee, 0),
      other_fee_note: String(row['Catatan Fee Tambahan'] ?? row.other_fee_note ?? '').trim(),
      payment_method: (String(row['Metode Bayar'] || row.payment_method || '').toUpperCase() === 'CASH'
        ? 'CASH'
        : String(row['Metode Bayar'] || row.payment_method || '').toUpperCase() === 'TRANSFER'
          ? 'TRANSFER'
          : undefined) as User['payment_method'],
      bank_name: String(row['Nama Bank'] || row.bank_name || '').trim() || undefined,
      bank_account: String(row['No Rekening'] || row.bank_account || '').trim() || undefined,
      bank_holder: String(row['Atas Nama Rekening'] || row.bank_holder || '').trim() || undefined,
      role: 'TUTOR'
    };

    const incomingPassword = String(row['Password'] || row.password || '').trim();
    const incomingPhoto = String(row['Foto URL'] || row.photo || '').trim();

    const matchIdx = nextUsers.findIndex(u => {
      if (u.role !== 'TUTOR') return false;
      if (incomingId && u.id === incomingId) return true;
      if (rawWa && u.wa && u.wa.replace(/\D/g, '') === rawWa) return true;
      if (username && u.username && u.username.toLowerCase() === username.toLowerCase()) return true;
      return false;
    });

    if (matchIdx >= 0) {
      const prev = nextUsers[matchIdx];
      nextUsers[matchIdx] = {
        ...prev,
        ...incoming,
        id: prev.id,
        password: incomingPassword || prev.password || '123456',
        photo: incomingPhoto || prev.photo || `https://i.pravatar.cc/150?u=${encodeURIComponent(username)}`
      };
      updated++;
    } else {
      nextUsers.push({
        id: incomingId || `T-${Date.now()}-${idx}`,
        name: incoming.name || `Tutor ${idx + 1}`,
        username: incoming.username || `tutor${Date.now()}${idx}`,
        password: incomingPassword || '123456',
        wa: incoming.wa || '',
        email: incoming.email || `${username}@wic.com`,
        role: 'TUTOR',
        photo: incomingPhoto || `https://i.pravatar.cc/150?u=${encodeURIComponent(username || String(idx))}`,
        status_tutor: incoming.status_tutor || 'Probation',
        is_certified: Boolean(incoming.is_certified),
        certification_name: incoming.certification_name || '',
        manual_allowance: incoming.manual_allowance || 0,
        allowance_note: incoming.allowance_note || '',
        other_fee: incoming.other_fee || 0,
        other_fee_note: incoming.other_fee_note || '',
        gender: incoming.gender,
        payment_method: incoming.payment_method,
        bank_name: incoming.bank_name,
        bank_account: incoming.bank_account,
        bank_holder: incoming.bank_holder
      });
      added++;
    }
  });

  if (added === 0 && updated === 0) {
    throw new Error('Tidak ada baris tutor yang berhasil dibaca dari file.');
  }

  return { users: nextUsers, added, updated };
}

// =====================================================================
// 2. MODUL AJAR (CSV & JSON)
// =====================================================================

const VALID_MODULE_LEVELS: ModuleLevel[] = [
  'Preschool',
  'Beginner',
  'Kids',
  'Teenager',
  'Adult',
  'Tahsin & Tahfidz'
];

function normalizeModuleLevel(raw: string): ModuleLevel {
  const s = String(raw || '').trim().toLowerCase();
  if (s.includes('preschool')) return 'Preschool';
  if (s.includes('beginner')) return 'Beginner';
  if (s.includes('kids')) return 'Kids';
  if (s.includes('teen')) return 'Teenager';
  if (s.includes('adult')) return 'Adult';
  if (s.includes('tahsin') || s.includes('tahfidz')) return 'Tahsin & Tahfidz';
  const exact = VALID_MODULE_LEVELS.find(l => l.toLowerCase() === s);
  return exact || 'Kids';
}

export function exportModulesCSV(modules: TeachingModule[]) {
  const rows = modules.map(m => ({
    'ID Modul': m.id || '',
    'Judul Modul': m.title || '',
    'Level Program': m.level || 'Kids',
    'Deskripsi': m.description || '',
    'Daftar Bab': Array.isArray(m.chapters) ? m.chapters.join(' | ') : '',
    'Link Aplikasi / File': m.app_url || '',
    'Platform': m.app_platform || 'Google Drive',
    'Target Kelas': m.target_grades || '',
    'Penyusun / Author': m.author || 'Tim Kurikulum WIC',
    'Cover URL': m.cover_url || '',
    'Unggulan': m.is_featured ? 'YA' : 'TIDAK',
    'Izinkan Print': m.allow_print ? 'YA' : 'TIDAK',
    'Izinkan Buka Link': m.allow_external_link !== false ? 'YA' : 'TIDAK',
    'Terakhir Diperbarui': m.updated_at || ''
  }));
  const dateTag = new Date().toISOString().split('T')[0];
  downloadCSV(rows, `WIC_Modul_Ajar_${dateTag}.csv`);
}

export function exportModulesJSON(modules: TeachingModule[]) {
  const dateTag = new Date().toISOString().split('T')[0];
  downloadJSON(
    {
      type: 'WIC_MODULES_EXPORT',
      exportedAt: new Date().toISOString(),
      count: modules.length,
      modules
    },
    `WIC_Modul_Ajar_${dateTag}.json`
  );
}

export async function importModulesFromFile(
  file: File,
  existingModules: TeachingModule[]
): Promise<{ modules: TeachingModule[]; added: number; updated: number }> {
  const text = await readFileAsText(file);
  let rawItems: any[] = [];

  if (isJsonFile(file)) {
    const parsed = JSON.parse(text);
    rawItems = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.modules)
        ? parsed.modules
        : Array.isArray(parsed?.data?.modules)
          ? parsed.data.modules
          : [];
  } else {
    rawItems = parseCsvRows(text);
  }

  if (!rawItems.length) {
    throw new Error('File tidak berisi data modul ajar yang valid.');
  }

  const nextModules: TeachingModule[] = [...existingModules];
  let added = 0;
  let updated = 0;

  rawItems.forEach((row, idx) => {
    const title = String(row['Judul Modul'] || row.Judul || row.title || row.name || '').trim();
    if (!title) return;

    const id = String(row['ID Modul'] || row.ID || row.id || '').trim();
    const level = normalizeModuleLevel(row['Level Program'] || row.Level || row.level || 'Kids');
    const rawChapters = row['Daftar Bab'] ?? row.chapters ?? row.Bab ?? '';
    const chapters: string[] = Array.isArray(rawChapters)
      ? rawChapters.map(c => String(c).trim()).filter(Boolean)
      : String(rawChapters)
          .split(/\s*\|\s*|\r?\n+/)
          .map(s => s.trim())
          .filter(Boolean);

    const modObj: TeachingModule = {
      id: id || `MOD-${Date.now()}-${idx}`,
      title,
      level,
      description: String(row['Deskripsi'] || row.description || '').trim(),
      chapters: chapters.length > 0 ? chapters : ['Bab 1: Materi Pokok'],
      app_url: String(row['Link Aplikasi / File'] || row.Link || row.app_url || row.url || '').trim(),
      app_platform: String(row['Platform'] || row.app_platform || 'Google Drive').trim(),
      target_grades: String(row['Target Kelas'] || row.target_grades || '').trim(),
      author: String(row['Penyusun / Author'] || row.author || 'Tim Kurikulum WIC').trim(),
      cover_url: String(row['Cover URL'] || row.cover_url || '').trim(),
      is_featured:
        row['Unggulan'] !== undefined
          ? parseBooleanValue(row['Unggulan'])
          : Boolean(row.is_featured),
      allow_print:
        row['Izinkan Print'] !== undefined
          ? parseBooleanValue(row['Izinkan Print'])
          : row.allow_print !== undefined
            ? Boolean(row.allow_print)
            : false,
      allow_external_link:
        row['Izinkan Buka Link'] !== undefined
          ? parseBooleanValue(row['Izinkan Buka Link'])
          : row.allow_external_link !== undefined
            ? Boolean(row.allow_external_link)
            : true,
      updated_at: String(row['Terakhir Diperbarui'] || row.updated_at || new Date().toISOString().split('T')[0]).trim()
    };

    const matchIdx = nextModules.findIndex(
      m =>
        (id && m.id === id) ||
        (m.title.toLowerCase() === title.toLowerCase() && m.level === level)
    );

    if (matchIdx >= 0) {
      nextModules[matchIdx] = {
        ...nextModules[matchIdx],
        ...modObj,
        id: nextModules[matchIdx].id,
        cover_url: modObj.cover_url || nextModules[matchIdx].cover_url
      };
      updated++;
    } else {
      nextModules.push(modObj);
      added++;
    }
  });

  if (added === 0 && updated === 0) {
    throw new Error('Tidak ada modul ajar valid yang ditemukan di dalam file.');
  }

  return { modules: nextModules, added, updated };
}

// =====================================================================
// 3. DATABASE SISWA + SHIFT MASUK (CSV & JSON)
// =====================================================================

export function exportStudentsCSV(students: Student[]) {
  const rows = students.map(s => ({
    'ID Siswa': s.id,
    'Nama Lengkap': s.name,
    'Nama Panggilan': s.nickname || '',
    'Status': s.status === 'CUTI' ? 'CUTI' : 'AKTIF',
    'Tgl Mulai Cuti': s.leave_start_date || '',
    'Tgl Selesai Cuti': s.leave_end_date || '',
    'Alasan Cuti': s.leave_reason || '',
    'Catatan Cuti': s.leave_note || '',
    'Program 1': s.level || '',
    'Program 2': s.level2 || '',
    'Status 2 Program': (s.is_dual_program || s.level2) ? 'Ya (Dual)' : 'Tidak',
    'No WA': s.wa || '',
    'Email': s.email || '',
    'Nama Wali': s.parent_name || '',
    'Asal Sekolah': s.school || '',
    'Kelas': s.grade || '',
    'Alamat': s.address || '',
    'Tujuan Kursus': s.goals || '',
    'Prog1 Hari Sesi 1': s.hari1 || '',
    'Prog1 Shift Sesi 1': s.shift1 || '',
    'Prog1 Hari Sesi 2': s.hari2 || '',
    'Prog1 Shift Sesi 2': s.shift2 || '',
    'Prog2 Hari Sesi 1': s.prog2_hari1 || s.hari_prog2 || '',
    'Prog2 Shift Sesi 1': s.prog2_shift1 || s.shift_prog2 || '',
    'Prog2 Hari Sesi 2': s.prog2_hari2 || '',
    'Prog2 Shift Sesi 2': s.prog2_shift2 || '',
    'Catatan': s.notes || ''
  }));
  const dateTag = new Date().toISOString().split('T')[0];
  downloadCSV(rows, `WIC_Database_Siswa_Shift_${dateTag}.csv`);
}

export function exportStudentsJSON(students: Student[]) {
  const dateTag = new Date().toISOString().split('T')[0];
  downloadJSON(
    {
      type: 'WIC_STUDENTS_EXPORT',
      exportedAt: new Date().toISOString(),
      count: students.length,
      students
    },
    `WIC_Database_Siswa_Shift_${dateTag}.json`
  );
}

export async function importStudentsFromFile(
  file: File,
  existingStudents: Student[]
): Promise<{ students: Student[]; added: number; updated: number }> {
  const text = await readFileAsText(file);
  let rawItems: any[] = [];

  if (isJsonFile(file)) {
    const parsed = JSON.parse(text);
    rawItems = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.students)
        ? parsed.students
        : Array.isArray(parsed?.data?.students)
          ? parsed.data.students
          : [];
  } else {
    rawItems = parseCsvRows(text);
  }

  if (!rawItems.length) {
    throw new Error('File tidak berisi data siswa yang valid.');
  }

  const nextStudents: Student[] = [...existingStudents];
  let added = 0;
  let updated = 0;

  rawItems.forEach((row, idx) => {
    const rawName = String(
      row['Nama Lengkap'] || row.Nama || row.nama || row.name || ''
    ).trim();
    if (!rawName) return;

    const incomingId = String(row['ID Siswa'] || row.ID || row.id || '').trim();
    const rawNick = String(row['Nama Panggilan'] || row.Panggilan || row.nickname || row.panggilan || '').trim();
    const nickname = rawNick || rawName.split(' ')[0] || '';

    const rawLevel1 = String(
      row['Program 1'] || row['Pilihan Program'] || row.Level || row.level || ''
    ).trim();
    const normalizedLevel1 =
      rawLevel1 === 'Tahsin' || rawLevel1 === 'Tahfidz' ? 'Tahsin & Tahfidz' : rawLevel1;

    const rawProg2 = String(
      row['Program 2'] || row['Level 2'] || row['Program 2 (Opsional)'] || row.level2 || ''
    ).trim();
    const normalizedLevel2 =
      rawProg2 === 'Tahsin' || rawProg2 === 'Tahfidz' ? 'Tahsin & Tahfidz' : rawProg2;
    const isDual =
      Boolean(normalizedLevel2) ||
      parseBooleanValue(row['Status 2 Program'] ?? row.is_dual_program);

    const h1 = String(row['Prog1 Hari Sesi 1'] ?? row['Hari 1'] ?? row.Hari1 ?? row.hari1 ?? '').trim();
    const s1 = String(row['Prog1 Shift Sesi 1'] ?? row['Shift 1'] ?? row.Shift1 ?? row.shift1 ?? '').trim();
    const h2 = String(row['Prog1 Hari Sesi 2'] ?? row['Hari 2'] ?? row.Hari2 ?? row.hari2 ?? '').trim();
    const s2 = String(row['Prog1 Shift Sesi 2'] ?? row['Shift 2'] ?? row.Shift2 ?? row.shift2 ?? '').trim();

    const p2h1 = String(
      row['Prog2 Hari Sesi 1'] ?? row['Prog2 Hari 1'] ?? row['Hari Prog 2 Sesi 1'] ?? row['Hari Prog 2'] ?? row.prog2_hari1 ?? row.hari_prog2 ?? ''
    ).trim();
    const p2s1 = String(
      row['Prog2 Shift Sesi 1'] ?? row['Prog2 Shift 1'] ?? row['Shift Prog 2 Sesi 1'] ?? row['Shift Prog 2'] ?? row.prog2_shift1 ?? row.shift_prog2 ?? ''
    ).trim();
    const p2h2 = String(
      row['Prog2 Hari Sesi 2'] ?? row['Prog2 Hari 2'] ?? row['Hari Prog 2 Sesi 2'] ?? row.prog2_hari2 ?? ''
    ).trim();
    const p2s2 = String(
      row['Prog2 Shift Sesi 2'] ?? row['Prog2 Shift 2'] ?? row['Shift Prog 2 Sesi 2'] ?? row.prog2_shift2 ?? ''
    ).trim();

    const rawStatus = String(row['Status'] || row['Status Siswa'] || row.status || '').trim().toUpperCase();
    const isCuti = rawStatus.includes('CUTI') || Boolean(row['Alasan Cuti'] || row.leave_reason);

    const hasShiftColumnsInRow =
      'Prog1 Hari Sesi 1' in row ||
      'Hari 1' in row ||
      'hari1' in row ||
      'Prog1 Shift Sesi 1' in row ||
      'Shift 1' in row ||
      'shift1' in row;

    const matchIdx = nextStudents.findIndex(st => {
      if (incomingId && st.id === incomingId) return true;
      return normalizeNameKey(st.name) === normalizeNameKey(rawName);
    });

    if (matchIdx >= 0) {
      const prev = nextStudents[matchIdx];
      nextStudents[matchIdx] = {
        ...prev,
        name: rawName,
        nickname: rawNick || prev.nickname || nickname,
        level: normalizedLevel1 || prev.level || 'Kids',
        level2: isDual ? (normalizedLevel2 || prev.level2) : (rawProg2 === '' && ('Program 2' in row || 'level2' in row) ? undefined : prev.level2),
        is_dual_program: ('Program 2' in row || 'Status 2 Program' in row || 'is_dual_program' in row || 'level2' in row)
          ? isDual
          : prev.is_dual_program,
        wa: String(row['No WA'] || row['No.Wa (aktif)'] || row.WA || row.wa || '').trim() || prev.wa,
        email: String(row['Email'] || row['Email Address'] || row.email || '').trim() || prev.email,
        parent_name: String(row['Nama Wali'] || row.Wali || row.parent_name || '').trim() || prev.parent_name,
        school: String(row['Asal Sekolah'] || row['Asal Sekolah  (misal : Al-Azhar 57 Jambi)'] || row.Sekolah || row.school || '').trim() || prev.school,
        grade: String(row['Kelas'] || row.grade || row.kelas || '').trim() || prev.grade,
        address: String(row['Alamat'] || row['Alamat '] || row.alamat || row.address || '').trim() || prev.address,
        goals: String(row['Tujuan Kursus'] || row['Tujuan dan Harapan ikut Kursus'] || row.Tujuan || row.goals || '').trim() || prev.goals,
        status: rawStatus ? (isCuti ? 'CUTI' : 'ACTIVE') : prev.status,
        leave_start_date: String(row['Tgl Mulai Cuti'] ?? row.leave_start_date ?? '').trim() || (rawStatus && !isCuti ? undefined : prev.leave_start_date),
        leave_end_date: String(row['Tgl Selesai Cuti'] ?? row.leave_end_date ?? '').trim() || (rawStatus && !isCuti ? undefined : prev.leave_end_date),
        leave_reason: String(row['Alasan Cuti'] ?? row.leave_reason ?? '').trim() || (rawStatus && !isCuti ? undefined : prev.leave_reason),
        leave_note: String(row['Catatan Cuti'] ?? row.leave_note ?? '').trim() || (rawStatus && !isCuti ? undefined : prev.leave_note),
        hari1: hasShiftColumnsInRow ? h1 : prev.hari1,
        shift1: hasShiftColumnsInRow ? s1 : prev.shift1,
        hari2: hasShiftColumnsInRow ? h2 : prev.hari2,
        shift2: hasShiftColumnsInRow ? s2 : prev.shift2,
        prog2_hari1: isDual ? (p2h1 || prev.prog2_hari1) : undefined,
        prog2_shift1: isDual ? (p2s1 || prev.prog2_shift1) : undefined,
        prog2_hari2: isDual ? (p2h2 || prev.prog2_hari2) : undefined,
        prog2_shift2: isDual ? (p2s2 || prev.prog2_shift2) : undefined,
        hari_prog2: isDual ? (p2h1 || prev.hari_prog2) : undefined,
        shift_prog2: isDual ? (p2s1 || prev.shift_prog2) : undefined,
        notes: String(row['Catatan'] ?? row.notes ?? '').trim() || prev.notes
      };
      updated++;
    } else {
      nextStudents.push({
        id: incomingId || `WIC-${Date.now().toString(36).toUpperCase()}-${idx + 1}`,
        name: rawName,
        nickname,
        level: normalizedLevel1 || 'Kids',
        level2: isDual ? normalizedLevel2 : undefined,
        is_dual_program: isDual,
        wa: String(row['No WA'] || row['No.Wa (aktif)'] || row.WA || row.wa || '').trim() || undefined,
        email: String(row['Email'] || row['Email Address'] || row.email || '').trim() || undefined,
        parent_name: String(row['Nama Wali'] || row.Wali || row.parent_name || '').trim() || undefined,
        school: String(row['Asal Sekolah'] || row['Asal Sekolah  (misal : Al-Azhar 57 Jambi)'] || row.Sekolah || row.school || '').trim() || undefined,
        grade: String(row['Kelas'] || row.grade || row.kelas || '').trim() || undefined,
        address: String(row['Alamat'] || row['Alamat '] || row.alamat || row.address || '').trim() || undefined,
        goals: String(row['Tujuan Kursus'] || row['Tujuan dan Harapan ikut Kursus'] || row.Tujuan || row.goals || '').trim() || undefined,
        status: isCuti ? 'CUTI' : 'ACTIVE',
        leave_start_date: String(row['Tgl Mulai Cuti'] || row.leave_start_date || '').trim() || undefined,
        leave_end_date: String(row['Tgl Selesai Cuti'] || row.leave_end_date || '').trim() || undefined,
        leave_reason: String(row['Alasan Cuti'] || row.leave_reason || '').trim() || undefined,
        leave_note: String(row['Catatan Cuti'] || row.leave_note || '').trim() || undefined,
        hari1: h1,
        shift1: s1,
        hari2: h2,
        shift2: s2,
        prog2_hari1: isDual ? p2h1 : undefined,
        prog2_shift1: isDual ? p2s1 : undefined,
        prog2_hari2: isDual ? p2h2 : undefined,
        prog2_shift2: isDual ? p2s2 : undefined,
        hari_prog2: isDual ? p2h1 : undefined,
        shift_prog2: isDual ? p2s1 : undefined,
        notes: String(row['Catatan'] || row.notes || 'Diimpor oleh Admin').trim()
      });
      added++;
    }
  });

  if (added === 0 && updated === 0) {
    throw new Error('Tidak ada baris siswa valid yang ditemukan di dalam file.');
  }

  return { students: nextStudents, added, updated };
}

// =====================================================================
// 4. MASTER PENILAIAN (CSV & JSON)
// =====================================================================

export function exportAssessmentsCSV(
  assessments: Assessment[],
  students: Student[],
  programFilter?: string
) {
  const studentMap = new Map(students.map(s => [s.id, s]));

  // Build rows covering either filtered program students or all assessments
  let rows: Record<string, any>[] = [];

  if (programFilter) {
    const enrolled = students.filter(
      s => s.level === programFilter || ((s.is_dual_program || s.level2) && s.level2 === programFilter)
    );
    rows = enrolled.map(s => {
      const ass = assessments.find(
        a => a.student_id === s.id && (a.program ? a.program === programFilter : true)
      );
      return {
        'ID Siswa': s.id,
        'Nama Siswa': s.name,
        'Program': programFilter,
        'Periode': ass?.period || '',
        'M1': ass?.m1 || 0,
        'M2': ass?.m2 || 0,
        'M3': ass?.m3 || 0,
        'M4': ass?.m4 || 0,
        'M5': ass?.m5 || 0,
        'M6': ass?.m6 || 0,
        'M7': ass?.m7 || 0,
        'M8': ass?.m8 || 0,
        'Exam': ass?.exam || 0,
        'CS': ass?.cs || 0,
        'Catatan Khusus': ass?.note || ''
      };
    });
  } else {
    rows = assessments.map(ass => {
      const s = studentMap.get(ass.student_id);
      return {
        'ID Siswa': ass.student_id,
        'Nama Siswa': s?.name || '',
        'Program': ass.program || s?.level || '',
        'Periode': ass.period || '',
        'M1': ass.m1 || 0,
        'M2': ass.m2 || 0,
        'M3': ass.m3 || 0,
        'M4': ass.m4 || 0,
        'M5': ass.m5 || 0,
        'M6': ass.m6 || 0,
        'M7': ass.m7 || 0,
        'M8': ass.m8 || 0,
        'Exam': ass.exam || 0,
        'CS': ass.cs || 0,
        'Catatan Khusus': ass.note || ''
      };
    });
  }

  const dateTag = new Date().toISOString().split('T')[0];
  const suffix = programFilter ? programFilter.replace(/[^a-zA-Z0-9]/g, '_') : 'Semua_Program';
  downloadCSV(rows, `WIC_Master_Penilaian_${suffix}_${dateTag}.csv`);
}

export function exportAssessmentsJSON(assessments: Assessment[], students: Student[]) {
  const studentMap = new Map(students.map(s => [s.id, s.name]));
  const enriched = assessments.map(a => ({
    ...a,
    student_name: studentMap.get(a.student_id) || ''
  }));
  const dateTag = new Date().toISOString().split('T')[0];
  downloadJSON(
    {
      type: 'WIC_ASSESSMENTS_EXPORT',
      exportedAt: new Date().toISOString(),
      count: enriched.length,
      assessments: enriched
    },
    `WIC_Master_Penilaian_${dateTag}.json`
  );
}

export async function importAssessmentsFromFile(
  file: File,
  existingAssessments: Assessment[],
  students: Student[],
  fallbackProgram: string
): Promise<{ assessments: Assessment[]; added: number; updated: number }> {
  const text = await readFileAsText(file);
  let rawItems: any[] = [];

  if (isJsonFile(file)) {
    const parsed = JSON.parse(text);
    rawItems = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.assessments)
        ? parsed.assessments
        : Array.isArray(parsed?.data?.assessments)
          ? parsed.data.assessments
          : [];
  } else {
    rawItems = parseCsvRows(text);
  }

  if (!rawItems.length) {
    throw new Error('File tidak berisi data penilaian siswa yang valid.');
  }

  const nextAssessments: Assessment[] = [...existingAssessments];
  let added = 0;
  let updated = 0;

  rawItems.forEach(row => {
    const rawId = String(row['ID Siswa'] || row.student_id || row.id || '').trim();
    const rawName = String(row['Nama Siswa'] || row.student_name || row.Nama || '').trim();

    let matchedStudent = students.find(s => rawId && s.id === rawId);
    if (!matchedStudent && rawName) {
      matchedStudent = students.find(s => normalizeNameKey(s.name) === normalizeNameKey(rawName));
    }

    const studentId = matchedStudent?.id || rawId;
    if (!studentId) return;

    const rawProgram = String(
      row['Program'] || row['Program Yang Dinilai'] || row.program || matchedStudent?.level || fallbackProgram || 'Kids'
    ).trim();
    const program = rawProgram === 'Tahsin' || rawProgram === 'Tahfidz' ? 'Tahsin & Tahfidz' : rawProgram;

    const entry: Assessment = {
      student_id: studentId,
      program,
      period: String(row['Periode'] || row.period || '').trim() || undefined,
      m1: parseNumberValue(row['M1'] ?? row.m1, 0),
      m2: parseNumberValue(row['M2'] ?? row.m2, 0),
      m3: parseNumberValue(row['M3'] ?? row.m3, 0),
      m4: parseNumberValue(row['M4'] ?? row.m4, 0),
      m5: parseNumberValue(row['M5'] ?? row.m5, 0),
      m6: parseNumberValue(row['M6'] ?? row.m6, 0),
      m7: parseNumberValue(row['M7'] ?? row.m7, 0),
      m8: parseNumberValue(row['M8'] ?? row.m8, 0),
      exam: parseNumberValue(row['Exam'] ?? row.exam, 0),
      cs: parseNumberValue(row['CS'] ?? row.cs, 0),
      note: String(row['Catatan Khusus'] ?? row['Catatan'] ?? row.note ?? '').trim(),
      locked: row.locked !== undefined ? parseBooleanValue(row.locked) : undefined
    };

    const existingIdx = nextAssessments.findIndex(
      a => a.student_id === studentId && (a.program ? a.program === program : true)
    );

    if (existingIdx >= 0) {
      nextAssessments[existingIdx] = { ...nextAssessments[existingIdx], ...entry };
      updated++;
    } else {
      nextAssessments.push(entry);
      added++;
    }
  });

  if (added === 0 && updated === 0) {
    throw new Error('Tidak ada baris penilaian valid yang dapat diimpor.');
  }

  return { assessments: nextAssessments, added, updated };
}

// =====================================================================
// 5. NAMA PROYEK / KLASIFIKASI PROYEK (CSV & JSON)
// =====================================================================

export function flattenClassificationsToProjectTypes(classifications: ProjectClassification[]): ProjectType[] {
  return classifications.flatMap(cls =>
    (cls.items || []).map(it => ({
      name: it.name,
      fee: it.defaultFee,
      classification: cls.name,
      allowQuantity: it.allowQuantity,
      defaultQuantity: it.defaultQuantity,
      unitLabel: it.unitLabel
    }))
  );
}

export function exportProjectCatalogCSV(classifications: ProjectClassification[]) {
  const rows: Record<string, any>[] = [];
  classifications.forEach(cls => {
    (cls.items || []).forEach(it => {
      rows.push({
        'ID Klasifikasi': cls.id,
        'Klasifikasi': cls.name,
        'Deskripsi Klasifikasi': cls.description || '',
        'ID Proyek': it.id,
        'Nama Proyek': it.name,
        'Fee': it.defaultFee || 0,
        'Aktifkan Kuantiti': it.allowQuantity ? 'YA' : 'TIDAK',
        'Kuantiti Default': it.defaultQuantity || 1,
        'Satuan Kuantiti': it.unitLabel || 'Item',
        'Deskripsi': it.description || ''
      });
    });
  });
  const dateTag = new Date().toISOString().split('T')[0];
  downloadCSV(rows, `WIC_Master_Nama_Proyek_${dateTag}.csv`);
}

export function exportProjectCatalogJSON(classifications: ProjectClassification[]) {
  const dateTag = new Date().toISOString().split('T')[0];
  downloadJSON(
    {
      type: 'WIC_PROJECT_CATALOG_EXPORT',
      exportedAt: new Date().toISOString(),
      classificationsCount: classifications.length,
      itemsCount: classifications.reduce((sum, c) => sum + (c.items?.length || 0), 0),
      project_classifications: classifications,
      project_types: flattenClassificationsToProjectTypes(classifications)
    },
    `WIC_Master_Nama_Proyek_${dateTag}.json`
  );
}

export async function importProjectCatalogFromFile(
  file: File,
  existingClassifications: ProjectClassification[]
): Promise<{
  classifications: ProjectClassification[];
  projectTypes: ProjectType[];
  added: number;
  updated: number;
}> {
  const text = await readFileAsText(file);
  const nextList: ProjectClassification[] = JSON.parse(JSON.stringify(existingClassifications || []));
  let added = 0;
  let updated = 0;

  const upsertItem = (
    clsName: string,
    clsDesc: string,
    clsId: string | undefined,
    item: Partial<ProjectItemDefinition> & { name: string }
  ) => {
    const cleanClsName = clsName.trim() || 'Modul';
    let clsObj = nextList.find(
      c => (clsId && c.id === clsId) || c.name.toLowerCase() === cleanClsName.toLowerCase()
    );
    if (!clsObj) {
      clsObj = {
        id: clsId || `cls-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanClsName,
        badgeColor: 'from-blue-600 to-indigo-700',
        description: clsDesc || `Program klasifikasi ${cleanClsName}`,
        items: []
      };
      nextList.push(clsObj);
    } else if (clsDesc && !clsObj.description) {
      clsObj.description = clsDesc;
    }

    clsObj.items = clsObj.items || [];
    const existingIdx = clsObj.items.findIndex(
      it => (item.id && it.id === item.id) || it.name.toLowerCase() === item.name.toLowerCase()
    );

    if (existingIdx >= 0) {
      clsObj.items[existingIdx] = {
        ...clsObj.items[existingIdx],
        name: item.name,
        defaultFee: item.defaultFee ?? clsObj.items[existingIdx].defaultFee,
        description: item.description !== undefined ? item.description : clsObj.items[existingIdx].description,
        allowQuantity: item.allowQuantity !== undefined ? item.allowQuantity : clsObj.items[existingIdx].allowQuantity,
        defaultQuantity: item.defaultQuantity !== undefined ? item.defaultQuantity : clsObj.items[existingIdx].defaultQuantity,
        unitLabel: item.unitLabel !== undefined ? item.unitLabel : clsObj.items[existingIdx].unitLabel
      };
      updated++;
    } else {
      clsObj.items.push({
        id: item.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: item.name,
        defaultFee: item.defaultFee ?? 0,
        description: item.description || '',
        allowQuantity: Boolean(item.allowQuantity),
        defaultQuantity: item.defaultQuantity || 1,
        unitLabel: item.unitLabel || 'Item'
      });
      added++;
    }
  };

  if (isJsonFile(file)) {
    const parsed = JSON.parse(text);
    const clsArray: any[] = Array.isArray(parsed?.project_classifications)
      ? parsed.project_classifications
      : Array.isArray(parsed?.data?.settings?.project_classifications)
        ? parsed.data.settings.project_classifications
        : Array.isArray(parsed) && parsed[0]?.items
          ? parsed
          : [];

    if (clsArray.length > 0) {
      clsArray.forEach(cls => {
        const cName = String(cls.name || 'Modul').trim();
        const cDesc = String(cls.description || '').trim();
        const cId = cls.id ? String(cls.id) : undefined;
        (cls.items || []).forEach((it: any) => {
          const itemName = String(it.name || '').trim();
          if (!itemName) return;
          upsertItem(cName, cDesc, cId, {
            id: it.id ? String(it.id) : undefined,
            name: itemName,
            defaultFee: parseNumberValue(it.defaultFee ?? it.fee, 0),
            description: String(it.description || '').trim(),
            allowQuantity: it.allowQuantity !== undefined ? Boolean(it.allowQuantity) : undefined,
            defaultQuantity: it.defaultQuantity !== undefined ? Math.max(1, parseNumberValue(it.defaultQuantity, 1)) : undefined,
            unitLabel: it.unitLabel ? String(it.unitLabel).trim() : undefined
          });
        });
      });
    } else {
      // Flat array of project_types / rows in JSON
      const flatArray: any[] = Array.isArray(parsed?.project_types)
        ? parsed.project_types
        : Array.isArray(parsed)
          ? parsed
          : [];
      flatArray.forEach(r => {
        const itemName = String(r.name || r['Nama Proyek'] || '').trim();
        if (!itemName) return;
        upsertItem(
          String(r.classification || r['Klasifikasi'] || 'Modul'),
          String(r['Deskripsi Klasifikasi'] || ''),
          r['ID Klasifikasi'] ? String(r['ID Klasifikasi']) : undefined,
          {
            id: r.id ? String(r.id) : undefined,
            name: itemName,
            defaultFee: parseNumberValue(r.defaultFee ?? r.fee ?? r['Fee'], 0),
            description: String(r.description || r['Deskripsi'] || '').trim(),
            allowQuantity: r.allowQuantity !== undefined ? parseBooleanValue(r.allowQuantity) : undefined,
            defaultQuantity: r.defaultQuantity !== undefined ? Math.max(1, parseNumberValue(r.defaultQuantity, 1)) : undefined,
            unitLabel: r.unitLabel ? String(r.unitLabel).trim() : undefined
          }
        );
      });
    }
  } else {
    const rows = parseCsvRows(text);
    rows.forEach(r => {
      const clsName = String(
        r['Klasifikasi'] || r['Kategori'] || r.kategori || r.Classification || r.classification || 'Modul'
      ).trim();
      const clsDesc = String(r['Deskripsi Klasifikasi'] || '').trim();
      const clsId = String(r['ID Klasifikasi'] || '').trim() || undefined;
      const itemName = String(
        r['Nama Proyek'] || r['Jenis Proyek'] || r.Proyek || r.nama || r.Name || r.name || ''
      ).trim();
      if (!itemName) return;

      const fee = parseNumberValue(
        r['Fee'] ?? r.fee ?? r['Honor'] ?? r['Tarif'] ?? r['Biaya'] ?? r['insentif'],
        0
      );
      const allowQtyRaw = r['Aktifkan Kuantiti'] ?? r.allowQuantity;
      const defQtyRaw = r['Kuantiti Default'] ?? r.defaultQuantity;
      const unitLabelRaw = r['Satuan Kuantiti'] ?? r.unitLabel;

      upsertItem(clsName, clsDesc, clsId, {
        id: String(r['ID Proyek'] || r.id || '').trim() || undefined,
        name: itemName,
        defaultFee: fee,
        description: String(r['Deskripsi'] || r.desc || r['Keterangan'] || r.description || '').trim(),
        allowQuantity: allowQtyRaw !== undefined && String(allowQtyRaw).trim() !== '' ? parseBooleanValue(allowQtyRaw) : undefined,
        defaultQuantity: defQtyRaw !== undefined && String(defQtyRaw).trim() !== '' ? Math.max(1, parseNumberValue(defQtyRaw, 1)) : undefined,
        unitLabel: unitLabelRaw !== undefined && String(unitLabelRaw).trim() !== '' ? String(unitLabelRaw).trim() : undefined
      });
    });
  }

  if (added === 0 && updated === 0) {
    throw new Error('Tidak ada data nama proyek valid yang ditemukan di dalam file.');
  }

  return {
    classifications: nextList,
    projectTypes: flattenClassificationsToProjectTypes(nextList),
    added,
    updated
  };
}

// =====================================================================
// 6. REFERENSI FORMAT & TEMPLATE CONTOH (100% SINKRON CSV & JSON)
// =====================================================================

export type ExportImportDomain =
  | 'TUTORS'
  | 'MODULES'
  | 'STUDENTS'
  | 'ASSESSMENTS'
  | 'PROJECTS';

export interface FormatColumnSpec {
  column: string;
  jsonKey: string;
  required: boolean;
  example: string;
  note: string;
}

export interface DomainFormatGuide {
  domain: ExportImportDomain;
  title: string;
  subtitle: string;
  syncRule: string;
  csvFilename: string;
  jsonFilename: string;
  columns: FormatColumnSpec[];
  sampleCsvRows: Record<string, any>[];
  sampleJsonPayload: Record<string, any>;
}

export const DOMAIN_FORMAT_GUIDES: Record<ExportImportDomain, DomainFormatGuide> = {
  TUTORS: {
    domain: 'TUTORS',
    title: 'Format Export & Import: Tutor & Tunjangan',
    subtitle: 'Skema resmi data pengajar, kredensial login, status honor, tunjangan reguler, fee tambahan, dan rekening bank.',
    syncRule: 'Saat Import CSV/JSON, sistem otomatis mencocokkan data berdasarkan ID Tutor, No WA, atau Username. Data yang cocok akan diperbarui (update), sedangkan data baru akan ditambahkan. Akun ADMIN tidak akan tertimpa.',
    csvFilename: 'Contoh_Template_Tutor_Tunjangan_WIC.csv',
    jsonFilename: 'Contoh_Template_Tutor_Tunjangan_WIC.json',
    columns: [
      { column: 'ID Tutor', jsonKey: 'id', required: false, example: 'T-001', note: 'Kosongkan untuk tutor baru (dibuat otomatis).' },
      { column: 'Nama Lengkap', jsonKey: 'name', required: true, example: 'Aisyah Rahmawati', note: 'Nama lengkap pengajar.' },
      { column: 'Username', jsonKey: 'username', required: true, example: 'aisyah', note: 'Dipakai untuk login ke portal tutor.' },
      { column: 'Password', jsonKey: 'password', required: false, example: '123456', note: 'Default 123456 jika dikosongkan pada tutor baru.' },
      { column: 'No WA', jsonKey: 'wa', required: true, example: '081234567890', note: 'Nomor WhatsApp aktif (angka saja).' },
      { column: 'Status Tutor', jsonKey: 'status_tutor', required: true, example: 'Senior', note: 'Sesuai level di Pengaturan Honor (Probation, Active < 1th, Senior, dll).' },
      { column: 'Tersertifikasi', jsonKey: 'is_certified', required: false, example: 'YA / TIDAK', note: 'Di JSON gunakan true / false.' },
      { column: 'Tunjangan Reguler', jsonKey: 'manual_allowance', required: false, example: '150000', note: 'Angka nominal rupiah tanpa titik/Rp.' },
      { column: 'Fee Tambahan', jsonKey: 'other_fee', required: false, example: '50000', note: 'Angka bonus/insentif tambahan.' },
      { column: 'Metode Bayar', jsonKey: 'payment_method', required: false, example: 'TRANSFER / CASH', note: 'Opsional, untuk invoice & payroll.' }
    ],
    sampleCsvRows: [
      {
        'ID Tutor': 'T-CONTOH-01',
        'Nama Lengkap': 'Aisyah Rahmawati',
        'Username': 'aisyah',
        'Password': 'password123',
        'No WA': '081234567890',
        'Email': 'aisyah@wic.com',
        'Sapaan / Gender': 'Miss',
        'Status Tutor': 'Senior',
        'Tersertifikasi': 'YA',
        'Nama Sertifikasi': 'S.Pd / TEFL',
        'Tunjangan Reguler': 150000,
        'Catatan Tunjangan': 'Tunjangan transport bulanan',
        'Fee Tambahan': 50000,
        'Catatan Fee Tambahan': 'Bonus kedisiplinan',
        'Metode Bayar': 'TRANSFER',
        'Nama Bank': 'BSI',
        'No Rekening': '7123456789',
        'Atas Nama Rekening': 'Aisyah Rahmawati',
        'Foto URL': ''
      },
      {
        'ID Tutor': 'T-CONTOH-02',
        'Nama Lengkap': 'Muhammad Farhan',
        'Username': 'farhan',
        'Password': 'password123',
        'No WA': '082298765432',
        'Email': 'farhan@wic.com',
        'Sapaan / Gender': 'Mr.',
        'Status Tutor': 'Active < 1th',
        'Tersertifikasi': 'TIDAK',
        'Nama Sertifikasi': '',
        'Tunjangan Reguler': 100000,
        'Catatan Tunjangan': 'Transport rutin',
        'Fee Tambahan': 0,
        'Catatan Fee Tambahan': '',
        'Metode Bayar': 'CASH',
        'Nama Bank': '',
        'No Rekening': '',
        'Atas Nama Rekening': '',
        'Foto URL': ''
      }
    ],
    sampleJsonPayload: {
      type: 'WIC_TUTORS_EXPORT',
      exportedAt: '2026-11-26T00:00:00.000Z',
      count: 2,
      tutors: [
        {
          id: 'T-CONTOH-01',
          name: 'Aisyah Rahmawati',
          username: 'aisyah',
          password: 'password123',
          wa: '081234567890',
          email: 'aisyah@wic.com',
          gender: 'Miss',
          role: 'TUTOR',
          status_tutor: 'Senior',
          is_certified: true,
          certification_name: 'S.Pd / TEFL',
          manual_allowance: 150000,
          allowance_note: 'Tunjangan transport bulanan',
          other_fee: 50000,
          other_fee_note: 'Bonus kedisiplinan',
          payment_method: 'TRANSFER',
          bank_name: 'BSI',
          bank_account: '7123456789',
          bank_holder: 'Aisyah Rahmawati',
          photo: ''
        }
      ]
    }
  },

  MODULES: {
    domain: 'MODULES',
    title: 'Format Export & Import: Modul Ajar',
    subtitle: 'Skema resmi daftar buku & modul digital berjenjang beserta daftar bab dan link aplikasi eksternal.',
    syncRule: 'Saat Import CSV/JSON, sistem mencocokkan berdasarkan ID Modul atau kombinasi Judul Modul + Level Program. Di format CSV, pisahkan beberapa bab menggunakan tanda garis tegak " | ".',
    csvFilename: 'Contoh_Template_Modul_Ajar_WIC.csv',
    jsonFilename: 'Contoh_Template_Modul_Ajar_WIC.json',
    columns: [
      { column: 'ID Modul', jsonKey: 'id', required: false, example: 'MOD-KIDS-01', note: 'Kosongkan untuk modul baru.' },
      { column: 'Judul Modul', jsonKey: 'title', required: true, example: 'English Fun Kids Book 1', note: 'Nama buku atau modul ajar.' },
      { column: 'Level Program', jsonKey: 'level', required: true, example: 'Kids', note: 'Pilihan: Preschool, Beginner, Kids, Teenager, Adult, Tahsin & Tahfidz.' },
      { column: 'Deskripsi', jsonKey: 'description', required: false, example: 'Modul dasar percakapan & grammar SD', note: 'Ringkasan isi modul.' },
      { column: 'Daftar Bab', jsonKey: 'chapters', required: false, example: 'Bab 1: Greeting | Bab 2: Numbers', note: 'Di CSV pisahkan dengan " | "; di JSON berbentuk array string.' },
      { column: 'Link Aplikasi / File', jsonKey: 'app_url', required: false, example: 'https://drive.google.com/...', note: 'URL Google Drive, Canva, Notion, atau file PDF.' },
      { column: 'Platform', jsonKey: 'app_platform', required: false, example: 'Google Drive', note: 'Google Drive, Canva, Notion, Quizizz, Web LMS, dll.' },
      { column: 'Unggulan', jsonKey: 'is_featured', required: false, example: 'YA / TIDAK', note: 'Di JSON gunakan true / false.' },
      { column: 'Izinkan Print', jsonKey: 'allow_print', required: false, example: 'YA / TIDAK', note: 'YA = tutor boleh mencetak modul dari aplikasi; TIDAK = print dikunci.' },
      { column: 'Izinkan Buka Link', jsonKey: 'allow_external_link', required: false, example: 'YA / TIDAK', note: 'TIDAK = hanya bisa dibaca di dashboard (link eksternal & bagikan dikunci).' }
    ],
    sampleCsvRows: [
      {
        'ID Modul': 'MOD-KIDS-01',
        'Judul Modul': 'WIC Active Kids Book 1',
        'Level Program': 'Kids',
        'Deskripsi': 'Modul percakapan aktif, vocabulary sehari-hari, dan grammar dasar untuk jenjang SD.',
        'Daftar Bab': 'Bab 1: Daily Greetings | Bab 2: My Family & Home | Bab 3: Present Continuous | Bab 4: Mini Storytelling',
        'Link Aplikasi / File': 'https://drive.google.com/file/d/CONTOH_LINK/view',
        'Platform': 'Google Drive',
        'Target Kelas': 'SD Kelas 3 - 5',
        'Penyusun / Author': 'Tim Kurikulum WIC',
        'Cover URL': '',
        'Unggulan': 'YA',
        'Izinkan Print': 'YA',
        'Izinkan Buka Link': 'TIDAK',
        'Terakhir Diperbarui': '2026-11-26'
      }
    ],
    sampleJsonPayload: {
      type: 'WIC_MODULES_EXPORT',
      exportedAt: '2026-11-26T00:00:00.000Z',
      count: 1,
      modules: [
        {
          id: 'MOD-KIDS-01',
          title: 'WIC Active Kids Book 1',
          level: 'Kids',
          description: 'Modul percakapan aktif, vocabulary sehari-hari, dan grammar dasar untuk jenjang SD.',
          chapters: [
            'Bab 1: Daily Greetings',
            'Bab 2: My Family & Home',
            'Bab 3: Present Continuous',
            'Bab 4: Mini Storytelling'
          ],
          app_url: 'https://drive.google.com/file/d/CONTOH_LINK/view',
          app_platform: 'Google Drive',
          target_grades: 'SD Kelas 3 - 5',
          author: 'Tim Kurikulum WIC',
          cover_url: '',
          is_featured: true,
          allow_print: true,
          allow_external_link: false,
          updated_at: '2026-11-26'
        }
      ]
    }
  },

  STUDENTS: {
    domain: 'STUDENTS',
    title: 'Format Export & Import: Database Siswa & Jadwal Shift Masuk',
    subtitle: 'Skema resmi data siswa lengkap dengan jadwal shift masuk Program 1 & Program 2 (Dual Program) serta status cuti.',
    syncRule: 'Hasil Export CSV/JSON dapat langsung diedit jadwal shift-nya lalu di-Import kembali. Sistem otomatis mencocokkan ID Siswa atau Nama Lengkap (smart merge) sehingga jadwal shift ter-update tanpa menduplikasi siswa.',
    csvFilename: 'Contoh_Template_Siswa_Shift_WIC.csv',
    jsonFilename: 'Contoh_Template_Siswa_Shift_WIC.json',
    columns: [
      { column: 'ID Siswa', jsonKey: 'id', required: false, example: 'WIC-101', note: 'Pertahankan ID dari hasil Export agar update shift akurat.' },
      { column: 'Nama Lengkap', jsonKey: 'name', required: true, example: 'Muhammad Rayhan Pratama', note: 'Nama lengkap siswa.' },
      { column: 'Status', jsonKey: 'status', required: false, example: 'AKTIF / CUTI', note: 'Default AKTIF.' },
      { column: 'Program 1', jsonKey: 'level', required: true, example: 'Kids', note: 'Preschool, Beginner, Kids, Teenager, Adult, Tahsin & Tahfidz, Private.' },
      { column: 'Program 2', jsonKey: 'level2', required: false, example: 'Tahsin & Tahfidz', note: 'Isi hanya jika siswa mengambil 2 program.' },
      { column: 'Prog1 Hari Sesi 1', jsonKey: 'hari1', required: false, example: 'Selasa', note: 'Hari masuk sesi 1 (Senin s.d. Sabtu).' },
      { column: 'Prog1 Shift Sesi 1', jsonKey: 'shift1', required: false, example: '16.15 – 17.45', note: 'Jam shift masuk sesi 1.' },
      { column: 'Prog1 Hari Sesi 2', jsonKey: 'hari2', required: false, example: 'Kamis', note: 'Hari masuk sesi 2.' },
      { column: 'Prog1 Shift Sesi 2', jsonKey: 'shift2', required: false, example: '16.15 – 17.45', note: 'Jam shift masuk sesi 2.' },
      { column: 'Prog2 Hari Sesi 1 / 2', jsonKey: 'prog2_hari1 / prog2_hari2', required: false, example: 'Rabu / Jumat', note: 'Jadwal hari untuk Program 2 (jika dual program).' }
    ],
    sampleCsvRows: [
      {
        'ID Siswa': 'WIC-CONTOH-01',
        'Nama Lengkap': 'Muhammad Rayhan Pratama',
        'Nama Panggilan': 'Rayhan',
        'Status': 'AKTIF',
        'Tgl Mulai Cuti': '',
        'Tgl Selesai Cuti': '',
        'Alasan Cuti': '',
        'Catatan Cuti': '',
        'Program 1': 'Kids',
        'Program 2': 'Tahsin & Tahfidz',
        'Status 2 Program': 'Ya (Dual)',
        'No WA': '081234567890',
        'Email': 'ortu.rayhan@email.com',
        'Nama Wali': 'Hendra Pratama',
        'Asal Sekolah': 'SD Al-Azhar 57 Jambi',
        'Kelas': 'Kelas 3',
        'Alamat': 'CitraRaya City Jambi',
        'Tujuan Kursus': 'Lancar speaking dan tahfidz juz 30',
        'Prog1 Hari Sesi 1': 'Selasa',
        'Prog1 Shift Sesi 1': '16.15 – 17.45',
        'Prog1 Hari Sesi 2': 'Kamis',
        'Prog1 Shift Sesi 2': '16.15 – 17.45',
        'Prog2 Hari Sesi 1': 'Rabu',
        'Prog2 Shift Sesi 1': '14.30 – 16.00',
        'Prog2 Hari Sesi 2': 'Jumat',
        'Prog2 Shift Sesi 2': '14.30 – 16.00',
        'Catatan': 'Aktif dan antusias'
      },
      {
        'ID Siswa': 'WIC-CONTOH-02',
        'Nama Lengkap': 'Farel Aditya Rahman',
        'Nama Panggilan': 'Farel',
        'Status': 'CUTI',
        'Tgl Mulai Cuti': '2026-11-01',
        'Tgl Selesai Cuti': '2026-11-20',
        'Alasan Cuti': 'Ujian Sekolah (PTS / PAS)',
        'Catatan Cuti': 'Izin fokus ujian sekolah',
        'Program 1': 'Teenager',
        'Program 2': '',
        'Status 2 Program': 'Tidak',
        'No WA': '081399887766',
        'Email': '',
        'Nama Wali': 'Bambang Rahman',
        'Asal Sekolah': 'SMPN 1 Kota Jambi',
        'Kelas': 'Kelas 8',
        'Alamat': 'Telanaipura Jambi',
        'Tujuan Kursus': 'Persiapan lomba debat',
        'Prog1 Hari Sesi 1': 'Senin',
        'Prog1 Shift Sesi 1': '16.15 – 17.45',
        'Prog1 Hari Sesi 2': 'Rabu',
        'Prog1 Shift Sesi 2': '16.15 – 17.45',
        'Prog2 Hari Sesi 1': '',
        'Prog2 Shift Sesi 1': '',
        'Prog2 Hari Sesi 2': '',
        'Prog2 Shift Sesi 2': '',
        'Catatan': ''
      }
    ],
    sampleJsonPayload: {
      type: 'WIC_STUDENTS_EXPORT',
      exportedAt: '2026-11-26T00:00:00.000Z',
      count: 1,
      students: [
        {
          id: 'WIC-CONTOH-01',
          name: 'Muhammad Rayhan Pratama',
          nickname: 'Rayhan',
          status: 'ACTIVE',
          level: 'Kids',
          level2: 'Tahsin & Tahfidz',
          is_dual_program: true,
          wa: '081234567890',
          email: 'ortu.rayhan@email.com',
          parent_name: 'Hendra Pratama',
          school: 'SD Al-Azhar 57 Jambi',
          grade: 'Kelas 3',
          address: 'CitraRaya City Jambi',
          goals: 'Lancar speaking dan tahfidz juz 30',
          hari1: 'Selasa',
          shift1: '16.15 – 17.45',
          hari2: 'Kamis',
          shift2: '16.15 – 17.45',
          prog2_hari1: 'Rabu',
          prog2_shift1: '14.30 – 16.00',
          prog2_hari2: 'Jumat',
          prog2_shift2: '14.30 – 16.00',
          notes: 'Aktif dan antusias'
        }
      ]
    }
  },

  ASSESSMENTS: {
    domain: 'ASSESSMENTS',
    title: 'Format Export & Import: Master Penilaian',
    subtitle: 'Skema resmi buku nilai capaian belajar siswa (M1–M8, Exam, CS, dan Catatan Khusus per program).',
    syncRule: 'Saat Import CSV/JSON, sistem otomatis mencocokkan ID Siswa (atau Nama Siswa) + Program, lalu langsung menyimpan dan menyinkronkan nilai ke seluruh perangkat.',
    csvFilename: 'Contoh_Template_Master_Penilaian_WIC.csv',
    jsonFilename: 'Contoh_Template_Master_Penilaian_WIC.json',
    columns: [
      { column: 'ID Siswa', jsonKey: 'student_id', required: true, example: 'WIC-101', note: 'Gunakan ID Siswa dari Export CSV/JSON (atau cocok otomatis via Nama Siswa).' },
      { column: 'Nama Siswa', jsonKey: 'student_name', required: false, example: 'Muhammad Rayhan Pratama', note: 'Memudahkan pembacaan & pencocokan cadangan.' },
      { column: 'Program', jsonKey: 'program', required: true, example: 'Kids', note: 'Program yang dinilai (Preschool, Beginner, Kids, Teenager, Adult, Tahsin & Tahfidz).' },
      { column: 'Periode', jsonKey: 'period', required: false, example: '2026-11', note: 'Kode periode opsional (YYYY-MM).' },
      { column: 'M1 s.d. M8', jsonKey: 'm1 .. m8', required: false, example: '85', note: 'Nilai pertemuan mingguan (angka 0–100).' },
      { column: 'Exam', jsonKey: 'exam', required: false, example: '90', note: 'Nilai ujian evaluasi (angka 0–100).' },
      { column: 'CS', jsonKey: 'cs', required: false, example: '88', note: 'Nilai Customer Service / sikap & komunikasi (0–100).' },
      { column: 'Catatan Khusus', jsonKey: 'note', required: false, example: 'Sangat aktif saat sesi speaking', note: 'Catatan perkembangan siswa.' }
    ],
    sampleCsvRows: [
      {
        'ID Siswa': 'WIC-CONTOH-01',
        'Nama Siswa': 'Muhammad Rayhan Pratama',
        'Program': 'Kids',
        'Periode': '2026-11',
        'M1': 85,
        'M2': 88,
        'M3': 90,
        'M4': 87,
        'M5': 92,
        'M6': 89,
        'M7': 91,
        'M8': 93,
        'Exam': 90,
        'CS': 95,
        'Catatan Khusus': 'Perkembangan speaking dan pronunciation sangat baik.'
      }
    ],
    sampleJsonPayload: {
      type: 'WIC_ASSESSMENTS_EXPORT',
      exportedAt: '2026-11-26T00:00:00.000Z',
      count: 1,
      assessments: [
        {
          student_id: 'WIC-CONTOH-01',
          student_name: 'Muhammad Rayhan Pratama',
          program: 'Kids',
          period: '2026-11',
          m1: 85,
          m2: 88,
          m3: 90,
          m4: 87,
          m5: 92,
          m6: 89,
          m7: 91,
          m8: 93,
          exam: 90,
          cs: 95,
          note: 'Perkembangan speaking dan pronunciation sangat baik.'
        }
      ]
    }
  },

  PROJECTS: {
    domain: 'PROJECTS',
    title: 'Format Export & Import: Master Nama Proyek & Klasifikasi',
    subtitle: 'Skema resmi katalog klasifikasi proyek, nama item pekerjaan, tarif fee, dan konfigurasi kuantiti/satuan.',
    syncRule: 'Saat Import CSV/JSON, sistem otomatis mengelompokkan item berdasarkan Klasifikasi, memperbarui fee & pengaturan kuantiti jika nama proyek sudah ada, serta menambahkan proyek baru.',
    csvFilename: 'Contoh_Template_Nama_Proyek_WIC.csv',
    jsonFilename: 'Contoh_Template_Nama_Proyek_WIC.json',
    columns: [
      { column: 'ID Klasifikasi', jsonKey: 'id (classification)', required: false, example: 'modul', note: 'Kosongkan untuk kategori baru.' },
      { column: 'Klasifikasi', jsonKey: 'name (classification)', required: true, example: 'Modul', note: 'Kategori utama (Modul, Content, Event, Sekolah, atau kustom).' },
      { column: 'ID Proyek', jsonKey: 'id (item)', required: false, example: 'item-01', note: 'Kosongkan untuk item proyek baru.' },
      { column: 'Nama Proyek', jsonKey: 'name (item)', required: true, example: 'Pembuatan Worksheet Interaktif', note: 'Nama pekerjaan yang dipilih tutor.' },
      { column: 'Fee', jsonKey: 'defaultFee', required: true, example: '35000', note: 'Honor per 1 satuan (angka rupiah tanpa Rp/titik).' },
      { column: 'Aktifkan Kuantiti', jsonKey: 'allowQuantity', required: false, example: 'YA / TIDAK', note: 'YA agar tutor dapat mengisi jumlah kuantiti.' },
      { column: 'Kuantiti Default', jsonKey: 'defaultQuantity', required: false, example: '1', note: 'Nilai awal kuantiti (minimal 1).' },
      { column: 'Satuan Kuantiti', jsonKey: 'unitLabel', required: false, example: 'Lembar / Video / Bab', note: 'Label satuan yang muncul di form & rekap.' },
      { column: 'Deskripsi', jsonKey: 'description', required: false, example: 'Penyusunan latihan tematik per bab', note: 'Keterangan tugas proyek.' }
    ],
    sampleCsvRows: [
      {
        'ID Klasifikasi': 'modul',
        'Klasifikasi': 'Modul',
        'Deskripsi Klasifikasi': 'Penyusunan buku, silabus, dan lembar kerja pembelajaran',
        'ID Proyek': 'item-contoh-01',
        'Nama Proyek': 'Pembuatan Worksheet Interaktif',
        'Fee': 25000,
        'Aktifkan Kuantiti': 'YA',
        'Kuantiti Default': 1,
        'Satuan Kuantiti': 'Set',
        'Deskripsi': 'Penyusunan latihan soal bergambar sesuai level kelas'
      },
      {
        'ID Klasifikasi': 'content',
        'Klasifikasi': 'Content',
        'Deskripsi Klasifikasi': 'Produksi konten edukasi media sosial & video pembelajaran',
        'ID Proyek': 'item-contoh-02',
        'Nama Proyek': 'Produksi Video Reels Edukasi',
        'Fee': 35000,
        'Aktifkan Kuantiti': 'YA',
        'Kuantiti Default': 1,
        'Satuan Kuantiti': 'Video',
        'Deskripsi': 'Video pendek bahasa Inggris berdurasi 30-60 detik'
      }
    ],
    sampleJsonPayload: {
      type: 'WIC_PROJECT_CATALOG_EXPORT',
      exportedAt: '2026-11-26T00:00:00.000Z',
      classificationsCount: 2,
      itemsCount: 2,
      project_classifications: [
        {
          id: 'modul',
          name: 'Modul',
          badgeColor: 'from-blue-600 to-indigo-700',
          description: 'Penyusunan buku, silabus, dan lembar kerja pembelajaran',
          items: [
            {
              id: 'item-contoh-01',
              name: 'Pembuatan Worksheet Interaktif',
              defaultFee: 25000,
              allowQuantity: true,
              defaultQuantity: 1,
              unitLabel: 'Set',
              description: 'Penyusunan latihan soal bergambar sesuai level kelas'
            }
          ]
        },
        {
          id: 'content',
          name: 'Content',
          badgeColor: 'from-pink-500 to-rose-600',
          description: 'Produksi konten edukasi media sosial & video pembelajaran',
          items: [
            {
              id: 'item-contoh-02',
              name: 'Produksi Video Reels Edukasi',
              defaultFee: 35000,
              allowQuantity: true,
              defaultQuantity: 1,
              unitLabel: 'Video',
              description: 'Video pendek bahasa Inggris berdurasi 30-60 detik'
            }
          ]
        }
      ]
    }
  }
};

export function downloadSampleTemplateCSV(domain: ExportImportDomain) {
  const guide = DOMAIN_FORMAT_GUIDES[domain];
  downloadCSV(guide.sampleCsvRows, guide.csvFilename);
}

export function downloadSampleTemplateJSON(domain: ExportImportDomain) {
  const guide = DOMAIN_FORMAT_GUIDES[domain];
  downloadJSON(guide.sampleJsonPayload, guide.jsonFilename);
}

export function getSampleCsvPreviewText(domain: ExportImportDomain): string {
  const guide = DOMAIN_FORMAT_GUIDES[domain];
  return Papa.unparse(guide.sampleCsvRows);
}

