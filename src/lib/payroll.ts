import { AppData, Attendance, HonorRateItem, Settings, User } from '../types';
import { DEFAULT_HONOR_RATES } from '../constants';

/**
 * Returns a stable non-empty key identifying a user (prefers WA, falls back to username or id).
 */
export function getTutorKey(u?: Partial<User> | null): string {
  if (!u) return '';
  return (u.wa || '').trim() || (u.username || '').trim() || (u.id || '').trim();
}

/**
 * Normalizes Indonesian phone numbers for reliable comparison (e.g. +62812... / 62812... / 0812... -> 0812...)
 */
export function normalizePhone(val?: string): string {
  const digits = (val || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) {
    return '0' + digits.slice(2);
  }
  return digits;
}

/**
 * Checks if a record reference (tutor_wa / tutor_id / tutor_name) belongs to the given tutor user.
 * Never matches empty strings.
 */
export function isRecordForTutor(
  recordRef: string | undefined,
  user?: Partial<User> | null,
  recordTutorId?: string
): boolean {
  if (!user) return false;

  // 1. Direct ID match
  if (recordTutorId && user.id && recordTutorId.trim() === user.id.trim()) {
    return true;
  }

  const ref = (recordRef || '').trim();
  if (!ref) return false;
  const refLower = ref.toLowerCase();

  // 2. Direct string match against wa, username, or id
  if (user.wa && user.wa.trim() && refLower === user.wa.trim().toLowerCase()) return true;
  if (user.username && user.username.trim() && refLower === user.username.trim().toLowerCase()) return true;
  if (user.id && user.id.trim() && refLower === user.id.trim().toLowerCase()) return true;

  // 3. Normalized phone comparison (handles 08xx vs 628xx vs +628xx)
  const normRef = normalizePhone(ref);
  const normUserWa = normalizePhone(user.wa);
  if (normRef.length >= 8 && normUserWa.length >= 8 && normRef === normUserWa) {
    return true;
  }

  return false;
}

/**
 * Normalizes teaching mode string so slight variations still count into the right payroll bucket.
 */
export function normalizeTeachingMode(mode?: string): 'Mandiri' | 'Team' | 'Private' | 'Semi Private' {
  const m = (mode || '').trim().toLowerCase();
  if (m === 'team' || m.includes('team')) return 'Team';
  if (m.includes('semi')) return 'Semi Private';
  if (m === 'private' || m.includes('privat')) return 'Private';
  return 'Mandiri';
}

/**
 * Determines whether an attendance journal entry belongs to the currently active payroll period.
 * Guarantees that journals submitted during the active period ALWAYS register on the tutor's
 * slip gaji and payroll recap, even if the admin's optional calendar bounds were left on a prior month.
 */
export function isAttendanceInActivePeriod(att: Attendance, settings: Settings): boolean {
  const attPeriod = (att.period || '').trim().toLowerCase();
  const activePeriodText = (settings.period_text || '').trim().toLowerCase();
  const activePeriodCode = (settings.period || '').trim().toLowerCase();

  // 1. Matches the active period label/code tagged at submission time
  if (attPeriod && (attPeriod === activePeriodText || (activePeriodCode && attPeriod === activePeriodCode))) {
    return true;
  }

  // 2. Fallback: falls explicitly inside active calendar start/end bounds (handles undated/edited records or updated period_text)
  if (settings.period_start_date && settings.period_end_date && att.date) {
    if (att.date >= settings.period_start_date && att.date <= settings.period_end_date) {
      return true;
    }
  }

  // 3. If both record period and active period are empty
  if (!attPeriod && !activePeriodText) {
    return true;
  }

  return false;
}

/**
 * Resolves the honorarium rate for a tutor's status, with smart fallback matching
 * (e.g., "Senior" matches "Senior Tersertifikasi" instead of silently falling back to Probation).
 */
export function getHonorRateForTutor(
  statusTutor: string | undefined,
  settings: Settings,
  isCertifiedFlag?: boolean
) {
  const rates: HonorRateItem[] = (settings.honor_rates && settings.honor_rates.length > 0)
    ? settings.honor_rates
    : DEFAULT_HONOR_RATES;

  const target = (statusTutor || '').trim().toLowerCase();

  // 1. Exact case-insensitive match
  let matched = rates.find(r => r.name.trim().toLowerCase() === target);

  // 2. Partial/fuzzy match if exact match wasn't found (e.g. "Senior" -> "Senior Tersertifikasi")
  if (!matched && target) {
    matched = rates.find(r => {
      const rName = r.name.trim().toLowerCase();
      return rName.includes(target) || target.includes(rName);
    });
  }

  // 3. Certified fallback if tutor has is_certified flag
  if (!matched && isCertifiedFlag) {
    matched = rates.find(r => r.name.toLowerCase().includes('tersertifikasi'));
  }

  const base: HonorRateItem = matched || rates[0] || {
    id: 'default',
    name: 'Default',
    mandiri: 25000,
    team: 20000,
    private: 22500,
    semi_private: 25000
  };

  return {
    matchedName: base.name,
    mandiri: Number(base.mandiri) || 0,
    team: Number(base.team) || 0,
    private: base.private !== undefined ? Number(base.private) : Math.round((Number(base.mandiri) || 0) * 0.9),
    semi_private: base.semi_private !== undefined ? Number(base.semi_private) : (Number(base.mandiri) || 0)
  };
}

export interface TutorPayrollCalculation {
  tutor: User;
  isCertified: boolean;
  periodAttendance: Attendance[];
  mandiriCount: number;
  teamCount: number;
  privateCount: number;
  semiPrivateCount: number;
  totalSessions: number;
  moduleCount: number;
  moduleTotal: number;
  rate: {
    matchedName: string;
    mandiri: number;
    team: number;
    private: number;
    semi_private: number;
  };
  subMandiri: number;
  subTeam: number;
  subPrivate: number;
  subSemiPrivate: number;
  sessionSubtotal: number;
  approvedProjects: AppData['projects'];
  projectTotal: number;
  allowance: number;
  allowanceNote: string;
  otherFee: number;
  otherNote: string;
  grandTotal: number;
}

/**
 * Single source of truth for calculating a tutor's payroll, session counts, and invoice total.
 */
export function calculateTutorPayroll(user: User, appData: AppData): TutorPayrollCalculation {
  const settings = appData.settings;
  const moduleBonusUnit = Number(settings.semi_private_module_bonus) || 25000;

  const periodAttendance = (appData.attendance || []).filter(a => {
    if (!isRecordForTutor(a.tutor_wa, user, a.tutor_id)) return false;
    return isAttendanceInActivePeriod(a, settings);
  });

  const mandiriCount = periodAttendance.filter(a => normalizeTeachingMode(a.mode) === 'Mandiri').length;
  const teamCount = periodAttendance.filter(a => normalizeTeachingMode(a.mode) === 'Team').length;
  const privateCount = periodAttendance.filter(a => normalizeTeachingMode(a.mode) === 'Private').length;
  const semiPrivateCount = periodAttendance.filter(a => normalizeTeachingMode(a.mode) === 'Semi Private').length;
  const totalSessions = mandiriCount + teamCount + privateCount + semiPrivateCount;

  const moduleCount = periodAttendance.filter(
    a => normalizeTeachingMode(a.mode) === 'Semi Private' && Boolean(a.module_created)
  ).length;
  const moduleTotal = moduleCount * moduleBonusUnit;

  const isCertified = Boolean(user.is_certified || user.status_tutor?.toLowerCase().includes('sertifikasi'));
  const rate = getHonorRateForTutor(user.status_tutor, settings, isCertified);

  const subMandiri = mandiriCount * rate.mandiri;
  const subTeam = teamCount * rate.team;
  const subPrivate = privateCount * rate.private;
  const subSemiPrivate = semiPrivateCount * rate.semi_private;
  const sessionSubtotal = subMandiri + subTeam + subPrivate + subSemiPrivate + moduleTotal;

  const approvedProjects = (appData.projects || []).filter(
    p => isRecordForTutor(p.tutor_wa, user) && p.status === 'Diterima'
  );
  const projectTotal = approvedProjects.reduce((acc, p) => {
    const qty = Math.max(1, Number(p.quantity) || 1);
    const computedFee = p.fee !== undefined && p.fee !== null
      ? Number(p.fee) || 0
      : (Number(p.unit_fee) || 0) * qty;
    return acc + computedFee;
  }, 0);

  const allowance = Number(user.manual_allowance) || 0;
  const otherFee = Number(user.other_fee) || 0;
  const grandTotal = sessionSubtotal + projectTotal + allowance + otherFee;

  return {
    tutor: user,
    isCertified,
    periodAttendance,
    mandiriCount,
    teamCount,
    privateCount,
    semiPrivateCount,
    totalSessions,
    moduleCount,
    moduleTotal,
    rate,
    subMandiri,
    subTeam,
    subPrivate,
    subSemiPrivate,
    sessionSubtotal,
    approvedProjects,
    projectTotal,
    allowance,
    allowanceNote: user.allowance_note || '',
    otherFee,
    otherNote: user.other_fee_note || '',
    grandTotal
  };
}
