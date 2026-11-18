export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  password?: string;
  role: 'ADMIN' | 'TUTOR';
  photo: string;
  status_tutor: string;
  manual_allowance: number;
  allowance_note: string;
  wa: string;
  other_fee: number;
  other_fee_note: string;
  gender?: 'Mr.' | 'Miss' | 'Mrs.' | 'Ms.' | 'Laki-laki' | 'Perempuan' | 'L' | 'P' | string;
  title?: 'Mr.' | 'Miss' | string;
  is_certified?: boolean; // Ijazah / Sertifikasi Tersertifikasi Resmi
  certification_name?: string; // Gelar atau sertifikat (misal: S.Pd, TEFL, dsb.)
  payment_method?: 'TRANSFER' | 'CASH'; // Metode Penyaluran: Transfer Bank (TF) atau Tunai (Cash)
  bank_name?: string; // Nama Bank Tutor (Cth: BCA, BSI, Mandiri, BRI)
  bank_account?: string; // Nomor Rekening Tutor
  bank_holder?: string; // Nama Pemilik Rekening
}

export interface Student {
  id: string;
  name: string;
  nickname?: string;
  wa?: string;
  email?: string;
  parent_name?: string;
  address?: string;
  school?: string;
  grade?: string;
  goals?: string;
  registered_at?: string;
  level: string; // Program 1 / Level Utama (Preschool, Beginner, Kids, Teenager, Adult, Tahsin, Tahfidz, Tahsin & Tahfidz, Private)
  level2?: string; // Program 2 (Opsional jika siswa mengambil 2 program, misal "Tahsin & Tahfidz")
  is_dual_program?: boolean; // Penanda siswa mengambil 2 program sekaligus
  photo?: string;
  // Jadwal Program 1 (2x seminggu)
  hari1: string;
  shift1: string;
  hari2: string;
  shift2: string;
  // Jadwal Program 2 (2x seminggu jika ambil 2 program)
  prog2_hari1?: string;
  prog2_shift1?: string;
  prog2_hari2?: string;
  prog2_shift2?: string;
  // Fallback compatibility
  schedule_days?: string;
  schedule_shift?: string;
  status?: 'ACTIVE' | 'CUTI' | 'INACTIVE' | 'GRADUATED' | string;
  // Field Data Cuti Siswa
  leave_start_date?: string;   // Tanggal Mulai Cuti (YYYY-MM-DD)
  leave_end_date?: string;     // Tanggal Selesai Cuti / Rencana Masuk Kembali (YYYY-MM-DD)
  leave_reason?: string;       // Alasan Cuti (Ujian Sekolah, Sakit, Mudik/Pulang Kampung, Urusan Keluarga, Lainnya)
  leave_note?: string;         // Catatan Tambahan Cuti
  leave_recorded_at?: string;  // Waktu Pencatatan Cuti
  hari_prog2?: string;
  shift_prog2?: string;
  tutor_id?: string;
  notes?: string;
}

export type TeachingMode = 'Mandiri' | 'Team' | 'Private' | 'Semi Private';

export interface TahsinStudentSetoran {
  student_name: string;
  surah_name: string;
  ayat_range: string;
  status: 'Lancar' | 'Ulang';
  note?: string;
}

export interface Attendance {
  id: string;
  tutor_wa: string;
  tutor_id?: string;
  tutor_name?: string;
  date: string;
  shift: string;
  level: string;
  mode: TeachingMode;
  material_origin: 'WIC' | 'Sekolah';
  book_source: string;
  material: string;
  notes: string;
  students: string[]; // List of student names or IDs
  makeup_students?: string[];
  is_makeup_session?: boolean; // Sesi pengganti / Make Up Class
  makeup_notes?: string; // Catatan sesi Make Up
  recall_reviewed?: boolean; // Konfirmasi pelaksanaan Recall & Review Materi Sebelumnya
  recall_notes?: string; // Poin materi sebelumnya yang di-recall/direview
  period: string;
  source: string;
  module_created?: boolean; // Pembuatan modul materi untuk program Semi Private
  module_title?: string;
  // Jurnal Khusus Program Tahsin & Tahfidz:
  surah_name?: string; // Nama Surat Al-Quran yang disetor
  ayat_range?: string; // Ayat yang disetor (misal: "Ayat 1 - 15", "Ayat 1 - 30")
  tahsin_status?: 'Lancar' | 'Ulang'; // Status kelancaran setoran
  tahsin_records?: TahsinStudentSetoran[]; // Rincian setoran per anak (opsional)
}

export interface Project {
  id: string;
  tutor_wa: string;
  classification?: string; // 'Modul' | 'Content' | 'Event' | 'Sekolah' | custom
  type: string;
  fee: number;
  status: 'Belum ditinjau' | 'Diterima' | 'Ditolak' | 'Pending';
  date: string;
  desc: string;
  file_url: string;
  file_name?: string;
}

export interface ProjectItemDefinition {
  id: string;
  name: string;
  defaultFee: number;
  description?: string;
}

export interface ProjectClassification {
  id: string;
  name: string; // 'Modul' | 'Content' | 'Event' | 'Sekolah' | or custom
  badgeColor?: string;
  description: string;
  items: ProjectItemDefinition[];
}

export interface Notification {
  id: string;
  userId: string; // Target user's WA or 'ADMIN'
  title: string;
  message: string;
  type: 'PROJECT' | 'STUDENT' | 'PAYROLL' | 'SYSTEM' | 'SCHEDULE';
  isRead: boolean;
  createdAt: string;
}

export interface Assessment {
  student_id: string;
  program?: string; // Kategori Program (Preschool, Beginner, Kids, Teenager, Adult, Tahsin & Tahfidz) untuk mendukung penilaian siswa 2 program
  period?: string;
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  m5: number;
  m6: number;
  m7: number;
  m8: number;
  exam: number;
  cs: number;
  note: string;
  locked?: boolean;
}

export interface ProjectType {
  name: string;
  fee: number;
  classification?: string;
}

export interface HonorRateItem {
  id: string;
  name: string;
  mandiri: number;
  team: number;
  private?: number; // Fee Mandiri - 10%
  semi_private?: number; // Fee Semi Private
}

export interface QuoteItem {
  id: string;
  text: string;
  author?: string;
  category?: string;
}

export interface Settings {
  period: string;
  period_text: string;
  period_start_date?: string; // Tanggal Mulai Periode (YYYY-MM-DD)
  period_end_date?: string;   // Tanggal Selesai Periode (YYYY-MM-DD)
  quote: string;
  cfo_name: string; // Manajemen Keuangan WIC
  cfo_title?: string; // "Manajemen Keuangan WIC"
  cfo_sign: string;
  director_name: string;
  director_sign: string;
  logo_url?: string; // Logo Resmi Lembaga WIC (Kop Invoice, ID Card, Header, Watermark)
  stempel_url?: string; // Foto Stempel Resmi Lembaga WIC
  institution_name?: string; // Nama Resmi Lembaga
  institution_tagline?: string; // Tagline Resmi Lembaga
  institution_address?: string; // Alamat Resmi Lembaga
  institution_contact?: string; // Kontak Resmi Lembaga
  default_payment_method?: 'TF' | 'CASH'; // Sistem Penerimaan Invoice (Transfer Bank atau Tunai/Cash)
  project_drive_url: string;
  project_types: ProjectType[];
  project_classifications?: ProjectClassification[];
  honor_rates: HonorRateItem[];
  quotes_list?: QuoteItem[];
  // Temporal control by Master Admin for Semi Private:
  enable_semi_private: boolean; // Aktifkan/sembunyikan program semi private (temporal)
  semi_private_certified_only: boolean; // Hanya untuk jenis tutor berijazah tersertifikasi
  semi_private_module_bonus: number; // Honor tambahan membuatkan modul materi (misal Rp 25.000)
}

export type ModuleLevel = 'Preschool' | 'Beginner' | 'Kids' | 'Teenager' | 'Adult' | 'Tahsin & Tahfidz';

export interface PeriodBackup {
  id: string;
  period: string;
  period_text: string;
  createdAt: string;
  createdBy: string;
  notes?: string;
  stats: {
    studentsCount: number;
    tutorsCount: number;
    attendanceCount: number;
    projectsCount: number;
    assessmentsCount: number;
  };
  data: AppData;
}

export interface TeachingModule {
  id: string;
  title: string;
  level: ModuleLevel;
  cover_url: string;
  description: string;
  chapters: string[]; // List of bab / materi pokok
  app_url: string; // Hyperlink to external application (Google Drive, Canva, Notion, LMS, etc.)
  app_platform?: 'Google Drive' | 'Canva' | 'Notion' | 'Quizizz' | 'PDF / Cloud' | 'Web LMS' | string;
  target_grades?: string;
  author?: string;
  is_featured?: boolean;
  updated_at?: string;
}

export interface AppData {
  users: User[];
  students: Student[];
  attendance: Attendance[];
  projects: Project[];
  assessments: Assessment[];
  settings: Settings;
  notifications?: Notification[];
  modules?: TeachingModule[];
  backups?: PeriodBackup[];
  _lastUpdated?: string;
  _lastSyncTimestamp?: string;
  _lastSyncAction?: string;
  _syncVersion?: number;
}
