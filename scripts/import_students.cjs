const fs = require('fs');
const path = require('path');

const csvPath = path.resolve('public/assets/aistudio/WIC_FORM_REGISTRASI_MEMBER__Responses__6bcf35f3');
const content = fs.readFileSync(csvPath, 'utf-8');

function parseCSV(text) {
  const lines = [];
  let row = [''];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
    lines.push(row);
  }
  return lines;
}

const rawRows = parseCSV(content);
const headers = rawRows[0].map(h => h.trim());
console.log('Headers:', headers);

const dataRows = rawRows.slice(1).filter(r => r.some(cell => cell.trim().length > 0));
console.log('Valid data rows:', dataRows.length);

function normalizePhone(raw) {
  if (!raw) return '';
  let str = String(raw).trim().replace(/[^\d+]/g, '');
  if (str.startsWith('+62')) {
    str = '0' + str.substring(3);
  } else if (str.startsWith('62')) {
    str = '0' + str.substring(2);
  }
  return str;
}

function mapProgram(progRaw) {
  if (!progRaw) return { level: 'Kids', level2: undefined, isDual: false };
  const p = progRaw.toLowerCase();
  
  const hasKids = p.includes('kid');
  const hasTeen = p.includes('teen');
  const hasAdult = p.includes('adult');
  const hasPreschool = p.includes('preschool') || p.includes('pre-school');
  const hasTahsin = p.includes('tahsin') || p.includes('tahfidz');
  const hasBeginner = p.includes('beginner');
  const hasPrivate = p.includes('private') || p.includes('privat');

  const programs = [];
  if (hasPreschool) programs.push('Preschool');
  if (hasKids) programs.push('Kids');
  if (hasTeen) programs.push('Teenager');
  if (hasBeginner) programs.push('Beginner');
  if (hasAdult) programs.push('Adult');
  if (hasTahsin) programs.push('Tahsin & Tahfidz');
  if (hasPrivate) programs.push('Private');

  if (programs.length === 0) {
    programs.push('Kids');
  }

  return {
    level: programs[0],
    level2: programs.length > 1 ? programs[1] : undefined,
    isDual: programs.length > 1
  };
}

const dayPairs = [
  { h1: 'Selasa', h2: 'Kamis' },
  { h1: 'Rabu', h2: 'Jumat' },
  { h1: 'Sabtu', h2: 'Minggu' }
];

const students = dataRows.map((row, idx) => {
  const timestamp = row[0] || '';
  const email = (row[1] || '').trim();
  const name = (row[2] || '').trim();
  const rawWa = row[3] || '';
  const wa = normalizePhone(rawWa);
  const progRaw = row[4] || '';
  const parentName = (row[5] || '').trim();
  const address = (row[6] || '').trim();
  const school = (row[7] || '').trim();
  const goals = (row[8] || '').trim();
  const grade = (row[9] || '').trim();
  const nickname = (row[10] || '').trim() || name.split(' ')[0] || '';

  const { level, level2, isDual } = mapProgram(progRaw);

  const idNum = String(idx + 1).padStart(3, '0');
  const id = `WIC-ST${idNum}`;

  const pair = dayPairs[idx % dayPairs.length];
  const hari1 = pair.h1;
  const hari2 = pair.h2;

  let shift1 = '16.15 – 17.45';
  if (level === 'Preschool') {
    shift1 = '09.30 – 11.00';
  } else if (level === 'Adult') {
    shift1 = 'Online Malam';
  } else if (idx % 3 === 1) {
    shift1 = '14.30 – 16.00';
  }
  const shift2 = shift1;

  const prog2_hari1 = isDual ? (hari1 === 'Selasa' ? 'Rabu' : 'Selasa') : undefined;
  const prog2_hari2 = isDual ? (hari2 === 'Kamis' ? 'Jumat' : 'Kamis') : undefined;
  const prog2_shift1 = isDual ? shift1 : undefined;
  const prog2_shift2 = isDual ? shift2 : undefined;

  return {
    id,
    name: name || `Siswa ${idNum}`,
    nickname,
    level,
    level2,
    is_dual_program: isDual,
    hari1,
    shift1,
    hari2,
    shift2,
    prog2_hari1,
    prog2_shift1,
    prog2_hari2,
    prog2_shift2,
    hari_prog2: prog2_hari1,
    shift_prog2: prog2_shift1,
    schedule_days: `${hari1} & ${hari2}`,
    schedule_shift: shift1,
    tutor_id: 'WIC-T001',
    status: 'ACTIVE',
    registered_at: timestamp,
    email: email || undefined,
    wa: wa || undefined,
    parent_name: parentName || undefined,
    address: address || undefined,
    school: school || undefined,
    grade: grade || undefined,
    goals: goals || undefined,
    notes: `Pendaftar Form: ${progRaw}`
  };
});

console.log('Sample student:', JSON.stringify(students[0], null, 2));
console.log('Total students generated:', students.length);

// Write to src/data/importedStudents.ts
const tsContent = `// Auto-generated from Google Form Registrasi Member WIC
import { Student } from '../types';

export const INITIAL_IMPORTED_STUDENTS: Student[] = ${JSON.stringify(students, null, 2)};
`;

const targetPath = path.resolve('src/data/importedStudents.ts');
fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, tsContent, 'utf-8');
console.log('Written src/data/importedStudents.ts successfully.');

// Update /data/wic_state.json if it exists
const statePath = path.resolve('data/wic_state.json');
if (fs.existsSync(statePath)) {
  try {
    const stateData = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    stateData.students = students;
    fs.writeFileSync(statePath, JSON.stringify(stateData, null, 2), 'utf-8');
    console.log('Updated data/wic_state.json with imported students.');
  } catch (err) {
    console.error('Error updating wic_state.json:', err);
  }
}
