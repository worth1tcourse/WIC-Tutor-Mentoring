import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Copy, 
  Check, 
  X, 
  HelpCircle, 
  Layers, 
  GraduationCap, 
  Award, 
  Quote, 
  FolderKanban, 
  Info, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Table
} from 'lucide-react';

interface ImportFormatGuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'STUDENT' | 'PROJECT' | 'ASSESSMENT' | 'QUOTES';
}

export default function ImportFormatGuidanceModal({
  isOpen,
  onClose,
  defaultTab = 'STUDENT'
}: ImportFormatGuidanceModalProps) {
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'PROJECT' | 'ASSESSMENT' | 'QUOTES'>(defaultTab);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const downloadCsv = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 1. Template Database Siswa
  const studentCsvSample = `Nama,Program 1,Program 2,Prog1 Hari Sesi 1,Prog1 Shift Sesi 1,Prog1 Hari Sesi 2,Prog1 Shift Sesi 2,Prog2 Hari Sesi 1,Prog2 Shift Sesi 1,Prog2 Hari Sesi 2,Prog2 Shift Sesi 2,Catatan
Anita Mei Putri Pardosi,Teenager,Tahsin & Tahfidz,Selasa,14.30 – 16.00,Kamis,14.30 – 16.00,Rabu,14.30 – 16.00,Jumat,14.30 – 16.00,Siswa aktif 2 program (Teenager & Tahsin Al-Quran)
Muhammad Fatih Al-Ayyubi,Tahsin & Tahfidz,,Rabu,16.15 – 17.45,Jumat,16.15 – 17.45,,,,Target hafalan Juz 30 Tartil
Kenzo Pratama,Kids,Tahsin & Tahfidz,Selasa,13.00 – 14.30,Kamis,13.00 – 14.30,Rabu,13.00 – 14.30,Jumat,13.00 – 14.30,Dual enrollment Bahasa Inggris Kids + Tahsin
Alya Nurul Huda,Preschool,,Selasa,08.00 – 09.30,Kamis,08.00 – 09.30,,,,Phonics & Basic Alphabet
Dave Alexander,Adult,,Sabtu,Online Malam,Minggu,Online Malam,,,,Business English & Career Preparation`;

  // 2. Template Klasifikasi & Item Proyek
  const projectCsvSample = `Nama Proyek,Klasifikasi,Honor Standar (Rp),Deskripsi Item Pekerjaan,Format Bukti Hasil Kerja
Revisi Modul Ajar Level Kids,Modul,50000,Penyusunan materi 4 bab & flashcard interaktif,Link Google Drive / Canva
Pembuatan Bank Soal Ujian Tengah Modul,Modul,45000,30 butir soal pilihan ganda & kunci jawaban,Link Google Drive Docs
Video Reels Kreatif Edukasi Phonics,Content,35000,Video pengucapan benar durasi 60 detik di Medsos WIC,Link Instagram Reels / Drive MP4
Desain Banner Infografis Grammar Tricks,Content,40000,Microlearning slide Canva untuk story murid,Link Canva Editable View
Juri Lomba Internal Spelling Bee,Event,75000,Penjurian 2 babak lomba ejaan tingkat sekolah,Foto & Berita Acara Kegiatan
Pemateri Workshop Public Speaking Siswa,Event,100000,Narasumber pelatihan active presentation 2 jam,Dokumentasi & Presensi
Sosialisasi Program Kemitraan Sekolah,Sekolah,50000,Presentasi penawaran ekstrakurikuler ke SD mitra,Surat Kunjungan & Foto`;

  // 3. Template Master Penilaian (Legger Nilai)
  const assessmentCsvSample = `ID Siswa,Nama Siswa,Program,M1,M2,M3,M4,M5,M6,M7,M8,Ujian,CS,Catatan Perkembangan
WIC-ST01,Anita Mei Putri Pardosi,Teenager,88,85,90,87,92,88,90,91,92,95,Sangat percaya diri dalam active speaking debate
WIC-ST01,Anita Mei Putri Pardosi,Tahsin & Tahfidz,85,88,86,90,92,90,94,92,90,98,Makharijul huruf dan mad thobi'i sangat fasih
WIC-ST02,Muhammad Fatih Al-Ayyubi,Tahsin & Tahfidz,90,92,90,95,94,96,95,98,96,98,Tasmi' surat An-Naba s/d Al-Muthaffifin lancar tanpa salah
WIC-ST03,Kenzo Pratama,Kids,80,85,82,88,85,90,86,88,86,90,Vocabulary story reading meningkat pesat
WIC-ST04,Alya Nurul Huda,Preschool,88,90,85,88,92,90,88,90,90,92,Pengenalan phonics huruf A-Z sudah tuntas`;

  // 4. Template Quotes Generator
  const quotesCsvSample = `ID,Text,Author,Category
q-1,Masa depan cerah dimulai dari kesungguhan hati dalam mendidik.,WIC Leadership,Edukasi
q-2,Pendidik yang hebat tidak sekadar mengajar melainkan menginspirasi jiwa murid.,William Arthur Ward,Inspirasi
q-3,Setiap anak adalah bintang yang memiliki cara dan waktunya sendiri untuk bersinar.,Albert Einstein,Motivasi
q-4,Belajar bukan sekadar menghafal fakta tetapi melatih pikiran untuk berpikir jernih.,Khoirul Mahmud S.Pd. S.Kom.,Edukasi
q-5,Ketekunan kecil yang dilakukan setiap hari melahirkan prestasi besar yang abadi.,Rodhotul Jannah S.Th.I. M.Ag.,Motivasi`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gold-400/20 border border-gold-400/30 flex items-center justify-center text-gold-400 shrink-0">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-gold-400 tracking-wider">
                  Panduan Baku Format Data WIC
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[8.5px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Resmi & Terstandarisasi
                </span>
              </div>
              <h3 className="font-black text-lg uppercase tracking-tight text-white mt-0.5">
                Guidance Pengelolaan & Import Format Data
              </h3>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="Tutup Panduan"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex flex-wrap gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveTab('STUDENT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'STUDENT'
                ? 'bg-emerald-950 text-gold-400 shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <GraduationCap size={15} /> Database Siswa
          </button>

          <button
            onClick={() => setActiveTab('PROJECT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'PROJECT'
                ? 'bg-emerald-950 text-gold-400 shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FolderKanban size={15} /> Klasifikasi Proyek
          </button>

          <button
            onClick={() => setActiveTab('ASSESSMENT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'ASSESSMENT'
                ? 'bg-emerald-950 text-gold-400 shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Award size={15} /> Master Penilaian
          </button>

          <button
            onClick={() => setActiveTab('QUOTES')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'QUOTES'
                ? 'bg-emerald-950 text-gold-400 shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Quote size={15} /> Quotes Generator
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scroll flex-1 text-slate-800">
          {/* TAB 1: DATABASE SISWA */}
          {activeTab === 'STUDENT' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                <h4 className="font-black text-sm text-emerald-950 uppercase tracking-tight flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-700" />
                  Format Database Siswa (Model 2 Program & Shift)
                </h4>
                <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                  Sistem mendukung siswa dengan 1 program reguler maupun <strong>Model 2 Program (Dual Enrollment)</strong>. Setiap program memiliki 2 hari sesi mengajar per minggu dengan shift masing-masing.
                </p>
              </div>

              {/* Kolom yang Diminta */}
              <div>
                <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Spesifikasi Kolom CSV yang Diminta:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">Nama</span>
                    <p className="text-[11px] text-slate-600 mt-1">Nama lengkap siswa (Wajib diisi).</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">Program 1</span>
                    <p className="text-[11px] text-slate-600 mt-1">Preschool / Kids / Teenager / Adult / Tahsin & Tahfidz.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-mono font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded text-[10px]">Program 2</span>
                    <p className="text-[11px] text-slate-600 mt-1">Program kedua jika mengambil 2 program (opsional).</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-mono font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded text-[10px]">Prog1 Hari Sesi 1 & 2</span>
                    <p className="text-[11px] text-slate-600 mt-1">Hari mengajar program utama (contoh: Selasa, Kamis).</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-mono font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded text-[10px]">Prog1 Shift Sesi 1 & 2</span>
                    <p className="text-[11px] text-slate-600 mt-1">Jam shift (contoh: 14.30 – 16.00 atau Online Malam).</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-mono font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded text-[10px]">Prog2 Hari & Shift Sesi 1 & 2</span>
                    <p className="text-[11px] text-slate-600 mt-1">Hari & shift untuk program kedua (contoh: Rabu & Jumat).</p>
                  </div>
                </div>
              </div>

              {/* Box Preview Data & Actions */}
              <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-bold text-gold-400">
                    Sample Data Siap Impor (.CSV):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(studentCsvSample, 'student_csv')}
                      className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedKey === 'student_csv' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedKey === 'student_csv' ? 'Tersalin!' : 'Salin Format'}</span>
                    </button>
                    <button
                      onClick={() => downloadCsv('WIC_Template_Database_Siswa.csv', studentCsvSample)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                      <Download size={12} />
                      <span>Unduh File .CSV</span>
                    </button>
                  </div>
                </div>
                <pre className="text-[10px] font-mono bg-slate-950 p-3 rounded-xl overflow-x-auto text-emerald-400 leading-relaxed border border-slate-800">
                  {studentCsvSample}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: KLASIFIKASI & ITEM PROYEK */}
          {activeTab === 'PROJECT' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200">
                <h4 className="font-black text-sm text-blue-950 uppercase tracking-tight flex items-center gap-2">
                  <FolderKanban size={18} className="text-blue-700" />
                  Format Jenis Proyek Berdasarkan Klasifikasi Resmi WIC
                </h4>
                <p className="text-xs text-blue-900 mt-1 leading-relaxed">
                  Semua pengajuan tugas tambahan tutor harus merujuk pada 4 klasifikasi baku lembaga. Admin dapat mengatur tarif satuan dan melakukan verifikasi bukti hasil kerja (Google Drive / Canva).
                </p>
              </div>

              {/* 4 Klasifikasi Baku */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-950 uppercase">1. Klasifikasi MODUL</span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Rp 45.000 - Rp 50.000</span>
                  </div>
                  <p className="text-[11px] text-emerald-900">
                    Pembuatan & revisi silabus modul 4 bab, bank soal ujian, flashcard, atau lembar kerja siswa.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-amber-950 uppercase">2. Klasifikasi CONTENT</span>
                    <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Rp 35.000 - Rp 40.000</span>
                  </div>
                  <p className="text-[11px] text-amber-900">
                    Video Reels kreatif, media pembelajaran interaktif Canva, poster infografis edukasi di media sosial WIC.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-purple-950 uppercase">3. Klasifikasi EVENT</span>
                    <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Rp 75.000 - Rp 100.000</span>
                  </div>
                  <p className="text-[11px] text-purple-900">
                    Juri lomba internal (Spelling Bee), pemateri workshop siswa, koordinator kompetisi akademik.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-cyan-950 uppercase">4. Klasifikasi SEKOLAH</span>
                    <span className="text-[10px] font-mono font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded">Rp 50.000</span>
                  </div>
                  <p className="text-[11px] text-cyan-900">
                    Sosialisasi kemitraan sekolah mitra, kunjungan presentasi ekstrakurikuler, koordinasi pihak sekolah.
                  </p>
                </div>
              </div>

              {/* Box Preview Data & Actions */}
              <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-bold text-gold-400">
                    Katalog Item Proyek & Standar Fee (.CSV):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(projectCsvSample, 'project_csv')}
                      className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedKey === 'project_csv' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedKey === 'project_csv' ? 'Tersalin!' : 'Salin Format'}</span>
                    </button>
                    <button
                      onClick={() => downloadCsv('WIC_Standar_Jenis_Proyek.csv', projectCsvSample)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                      <Download size={12} />
                      <span>Unduh File .CSV</span>
                    </button>
                  </div>
                </div>
                <pre className="text-[10px] font-mono bg-slate-950 p-3 rounded-xl overflow-x-auto text-gold-300 leading-relaxed border border-slate-800">
                  {projectCsvSample}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: MASTER PENILAIAN */}
          {activeTab === 'ASSESSMENT' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200">
                <h4 className="font-black text-sm text-amber-950 uppercase tracking-tight flex items-center gap-2">
                  <Award size={18} className="text-amber-700" />
                  Format Master Penilaian (Legger Nilai M1–M8, Ujian & CS)
                </h4>
                <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                  Nilai evaluasi murid mencakup 8 pertemuan modul (M1 s/d M8), nilai evaluasi akhir (Exam), dan skor Character & Speaking (CS). Seluruh skor berskala 0 sampai 100.
                </p>
              </div>

              {/* Ketentuan Komponen Nilai */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-black text-slate-800 uppercase text-[11px]">M1 s/d M8 (Modul)</span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Nilai tugas harian tiap pertemuan. Mengukur pemahaman konsep dasar materi bab berjalan.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-black text-slate-800 uppercase text-[11px]">Ujian (Final Exam)</span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Evaluasi komprehensif tertulis atau lisan di penghujung periode pembelajaran.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-black text-slate-800 uppercase text-[11px]">CS (Character & Speaking)</span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Keaktifan berbicara bahasa Inggris, adab, sopan santun, dan keberanian presentasi siswa.
                  </p>
                </div>
              </div>

              {/* Box Preview Data & Actions */}
              <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-bold text-gold-400">
                    Template Format Legger Nilai Murid (.CSV):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(assessmentCsvSample, 'assessment_csv')}
                      className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedKey === 'assessment_csv' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedKey === 'assessment_csv' ? 'Tersalin!' : 'Salin Format'}</span>
                    </button>
                    <button
                      onClick={() => downloadCsv('WIC_Template_Master_Nilai_Siswa.csv', assessmentCsvSample)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                      <Download size={12} />
                      <span>Unduh File .CSV</span>
                    </button>
                  </div>
                </div>
                <pre className="text-[10px] font-mono bg-slate-950 p-3 rounded-xl overflow-x-auto text-emerald-400 leading-relaxed border border-slate-800">
                  {assessmentCsvSample}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: QUOTES GENERATOR */}
          {activeTab === 'QUOTES' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200">
                <h4 className="font-black text-sm text-purple-950 uppercase tracking-tight flex items-center gap-2">
                  <Quote size={18} className="text-purple-700" />
                  Format Quotes Generator & Rotasi Inspirasi Pengajar
                </h4>
                <p className="text-xs text-purple-900 mt-1 leading-relaxed">
                  Kutipan yang diimpor akan masuk ke generator bank quote WIC. Admin dapat memilih satu quote aktif yang otomatis langsung tayang di seluruh beranda tutor (#WICQuotes) secara real-time.
                </p>
              </div>

              {/* 3 Kategori Quote */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-black text-emerald-800 uppercase text-[11px]">Edukasi</span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Prinsip pedagogi, kesungguhan belajar, dan etika mendidik generasi unggul.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-black text-blue-800 uppercase text-[11px]">Inspirasi</span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Keteladanan para tokoh dunia, pesan kepemimpinan, dan visi masa depan.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-black text-amber-800 uppercase text-[11px]">Motivasi</span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Semangat pantang menyerah, ketekunan proses, dan apresiasi perjuangan guru.
                  </p>
                </div>
              </div>

              {/* Box Preview Data & Actions */}
              <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-bold text-gold-400">
                    Template Impor Bank Quotes CSV (.CSV):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(quotesCsvSample, 'quotes_csv')}
                      className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedKey === 'quotes_csv' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedKey === 'quotes_csv' ? 'Tersalin!' : 'Salin Format'}</span>
                    </button>
                    <button
                      onClick={() => downloadCsv('WIC_Template_Bank_Quotes.csv', quotesCsvSample)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                      <Download size={12} />
                      <span>Unduh File .CSV</span>
                    </button>
                  </div>
                </div>
                <pre className="text-[10px] font-mono bg-slate-950 p-3 rounded-xl overflow-x-auto text-purple-300 leading-relaxed border border-slate-800">
                  {quotesCsvSample}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <Sparkles size={14} className="text-gold-500" />
            <span>Format tabel CSV dapat dibuka langsung di Microsoft Excel, Google Sheets, atau text editor.</span>
          </div>
          <button
            onClick={onClose}
            className="bg-emerald-950 text-gold-400 hover:bg-emerald-900 px-6 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider transition cursor-pointer"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
}
