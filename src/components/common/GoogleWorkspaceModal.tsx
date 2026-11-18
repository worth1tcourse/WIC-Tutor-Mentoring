import React, { useState, useEffect } from 'react';
import { 
  X, 
  GraduationCap, 
  FileText, 
  Plus, 
  Users, 
  ExternalLink, 
  Send, 
  LogOut, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { User as AppUser, AppData } from '../../types';
import { 
  googleSignInWorkspace, 
  logoutWorkspace, 
  getWorkspaceAccessToken, 
  fetchClassroomCourses, 
  fetchCourseStudents, 
  createClassroomAnnouncement,
  createGoogleDoc,
  ClassroomCourse,
  ClassroomStudent
} from '../../lib/googleWorkspace';
import { User as FirebaseUser } from 'firebase/auth';

interface GoogleWorkspaceModalProps {
  currentUser: AppUser;
  appData: AppData;
  onClose: () => void;
}

export default function GoogleWorkspaceModal({ currentUser, appData, onClose }: GoogleWorkspaceModalProps) {
  const [activeTab, setActiveTab] = useState<'classroom' | 'docs'>('classroom');
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(getWorkspaceAccessToken());
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Classroom States
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<ClassroomCourse | null>(null);
  const [students, setStudents] = useState<ClassroomStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [announcementText, setAnnouncementText] = useState<string>('');
  const [showAnnounceConfirm, setShowAnnounceConfirm] = useState<boolean>(false);

  // Docs States
  const [docTitle, setDocTitle] = useState<string>(`Modul Ajar WIC - ${currentUser.name} - ${appData.settings.period_text}`);
  const [docType, setDocType] = useState<'modul' | 'rpp' | 'rekap'>('modul');
  const [createdDocUrl, setCreatedDocUrl] = useState<string | null>(null);
  const [showDocConfirm, setShowDocConfirm] = useState<boolean>(false);

  const loadCourses = async (authToken: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchClassroomCourses(authToken);
      setCourses(data);
      if (data.length > 0 && !selectedCourse) {
        setSelectedCourse(data[0]);
        loadStudents(data[0].id, authToken);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memuat kelas Google Classroom');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (courseId: string, authToken: string) => {
    setLoadingStudents(true);
    try {
      const data = await fetchCourseStudents(courseId, authToken);
      setStudents(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await googleSignInWorkspace();
      if (res) {
        setGoogleUser(res.user);
        setToken(res.accessToken);
        await loadCourses(res.accessToken);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg('Gagal masuk dengan Google. Pastikan mengizinkan akses Google Classroom & Google Docs.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutWorkspace();
    setGoogleUser(null);
    setToken(null);
    setCourses([]);
    setSelectedCourse(null);
    setStudents([]);
  };

  const handlePublishAnnouncement = async () => {
    if (!selectedCourse || !announcementText.trim() || !token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await createClassroomAnnouncement(selectedCourse.id, announcementText, token);
      setSuccessMsg(`Pengumuman berhasil diposting ke kelas "${selectedCourse.name}"!`);
      setAnnouncementText('');
      setShowAnnounceConfirm(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim pengumuman.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    setCreatedDocUrl(null);

    let content = '';
    const now = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    if (docType === 'modul') {
      content = `WORTH IT COURSE (WIC)
LEMBAGA BIMBINGAN BELAJAR TERPADU
Alamat: ${appData.settings.institution_address}
Kontak: ${appData.settings.institution_contact}

============================================================
MODUL AJAR & PANDUAN MATERI
============================================================
Penyusun: ${currentUser.name} (${currentUser.role === 'ADMIN' ? 'Manajemen WIC' : 'Tutor Pengajar'})
Periode: ${appData.settings.period_text}
Tanggal Penyusunan: ${now}

I. TUJUAN PEMBELAJARAN
1. Siswa mampu memahami konsep dasar materi secara mendalam.
2. Siswa memiliki keterampilan praktis dalam menyelesaikan latihan soal terstruktur.
3. Siswa menunjukkan antusiasme dan karakter belajar aktif selama sesi.

II. ALOKASI WAKTU & METODE
- Durasi: 90 Menit per Pertemuan
- Metode: Interactive Teaching, Practice Drills, & Formative Evaluation

III. RINGKASAN MATERI POKOK
(Tuliskan rangkuman silabus bab, materi penjelasan, dan catatan pendukung di sini)

IV. SOAL LATIHAN & EVALUASI
1. Soal Evaluasi Pemahaman Konseptual
2. Soal Evaluasi Pemecahan Masalah Mandiri

Catatan Supervisor:
Khoirul Mahmud, S. Pd., S. Kom. (Direktur Utama WIC)
`;
    } else if (docType === 'rpp') {
      content = `WORTH IT COURSE (WIC)
RENCANA PELAKSANAAN PEMBELAJARAN (RPP)
Periode: ${appData.settings.period_text}

Mata Pelajaran / Program: Modul Reguler WIC
Pengajar: ${currentUser.name}
Tanggal: ${now}

1. Kompetensi Inti & Dasar:
   - Penguasaan materi pembelajaran tatap muka dan mandiri.
2. Langkah Pembelajaran:
   - Pendahuluan (15 Menit): Pembukaan doa, presensi, review materi lalu.
   - Kegiatan Inti (60 Menit): Pemaparan konsep, demonstrasi soal, pendampingan interaktif.
   - Penutup (15 Menit): Evaluasi singkat, pemberian tugas terarah, doa penutup.
3. Media Pembelajaran: Buku Modul WIC, Papan Tulis, Lembar Kerja Siswa.
`;
    } else {
      content = `WORTH IT COURSE (WIC)
REKAPITULASI DATA PERIODE ${appData.settings.period_text.toUpperCase()}
Dicetak Oleh: ${currentUser.name}
Tanggal Cetak: ${now}

Jumlah Siswa Terdaftar: ${appData.students.length} Siswa
Jumlah Tutor Terdaftar: ${appData.users.filter(u => u.role === 'TUTOR').length} Tutor
Jumlah Sesi Absensi: ${appData.attendance.length} Sesi Terdata
`;
    }

    try {
      const res = await createGoogleDoc(docTitle, content, token);
      setCreatedDocUrl(res.url);
      setSuccessMsg(`Google Doc "${docTitle}" berhasil dibuat dan siap diedit!`);
      setShowDocConfirm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat Google Doc.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-[#052e20] to-[#041d14] text-white p-5 sm:p-6 flex items-center justify-between border-b-2 border-gold-400/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-gold-400/40 flex items-center justify-center text-gold-400 shrink-0 shadow-inner">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white font-serif">
                  Google Workspace
                </h3>
                <span className="bg-emerald-800/80 text-gold-300 text-[9px] font-mono px-2 py-0.5 rounded-full border border-gold-400/30">
                  Resmi
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Integrasi Google Classroom & Google Docs untuk Pembelajaran WIC
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition cursor-pointer"
            title="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {/* Auth Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {token ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs border border-emerald-300">
                  {googleUser?.displayName?.[0] || 'G'}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    {googleUser?.displayName || 'Google Account Terhubung'}
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {googleUser?.email || 'Akun Google aktif terotorisasi'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadCourses(token)}
                  disabled={loading}
                  className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-200 rounded-lg transition"
                  title="Muat Ulang Data"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 text-[10px] font-black uppercase rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1 transition"
                  title="Keluar dari Google Workspace"
                >
                  <LogOut size={12} /> Keluar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <p className="text-xs text-slate-600">
                Masuk dengan akun Google Anda untuk mengakses kelas Classroom dan dokumen Google Docs.
              </p>
              {/* Official Google Material Sign-in Button */}
              <button 
                onClick={handleLogin}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl shadow-xs text-xs font-bold transition active:scale-95 cursor-pointer shrink-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>{loading ? 'Menghubungkan...' : 'Sign in with Google'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 px-5 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('classroom')}
            className={`py-3 px-4 text-xs font-black uppercase flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'classroom'
                ? 'border-emerald-700 text-emerald-950 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <GraduationCap size={16} /> Google Classroom ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`py-3 px-4 text-xs font-black uppercase flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'docs'
                ? 'border-emerald-700 text-emerald-950 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <FileText size={16} /> Google Docs
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="m-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="m-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shrink-0">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {!token ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-800 mx-auto flex items-center justify-center">
                <Sparkles size={32} />
              </div>
              <h4 className="text-base font-black text-slate-800 uppercase">
                Akses Terproteksi Google Workspace
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Silakan klik tombol <strong>"Sign in with Google"</strong> di atas dengan akun pengajar atau admin Anda untuk mengelola Google Classroom dan membuat materi di Google Docs secara langsung.
              </p>
            </div>
          ) : activeTab === 'classroom' ? (
            <div className="space-y-4">
              {courses.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <GraduationCap size={36} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-700">Belum Ada Kelas Classroom Aktif</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
                    Buat kelas baru di Google Classroom atau pastikan akun pengajar Anda terdaftar di kelas aktif.
                  </p>
                  <a
                    href="https://classroom.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-emerald-800 hover:underline"
                  >
                    Buka Google Classroom <ExternalLink size={13} />
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left Column: List of Courses */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Daftar Kelas Anda ({courses.length})
                    </p>
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {courses.map(c => {
                        const isSelected = selectedCourse?.id === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedCourse(c);
                              if (token) loadStudents(c.id, token);
                            }}
                            className={`p-3 rounded-2xl border text-left cursor-pointer transition ${
                              isSelected
                                ? 'bg-emerald-950 text-white border-emerald-800 shadow-md'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <p className="font-bold text-xs line-clamp-1">{c.name}</p>
                            <p className={`text-[10px] mt-0.5 line-clamp-1 ${isSelected ? 'text-gold-300' : 'text-slate-400'}`}>
                              {c.section || c.room || 'Reguler WIC'}
                            </p>
                            {c.enrollmentCode && (
                              <p className={`text-[9px] font-mono mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                Kode: <strong>{c.enrollmentCode}</strong>
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Selected Course Details & Actions */}
                  <div className="md:col-span-2 space-y-4">
                    {selectedCourse && (
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-black text-slate-900 text-sm">{selectedCourse.name}</h4>
                            <p className="text-[10px] text-slate-500">ID Kelas: {selectedCourse.id}</p>
                          </div>
                          {selectedCourse.alternateLink && (
                            <a
                              href={selectedCourse.alternateLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 hover:text-emerald-950 bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs"
                            >
                              Buka di Classroom <ExternalLink size={11} />
                            </a>
                          )}
                        </div>

                        {/* Students Roster */}
                        <div className="pt-2 border-t border-slate-200">
                          <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 flex items-center gap-1">
                            <Users size={12} /> Anggota Siswa ({loadingStudents ? 'Memuat...' : students.length})
                          </p>
                          {students.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                              {students.map(s => (
                                <span key={s.userId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-slate-700 text-[10px] border border-slate-200 font-medium">
                                  {s.profile?.name?.fullName || 'Siswa WIC'}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">
                              {loadingStudents ? 'Sedang menyinkronkan data siswa...' : 'Belum ada siswa yang bergabung.'}
                            </p>
                          )}
                        </div>

                        {/* Post Announcement Section */}
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                          <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                            Kirim Pengumuman ke Forum Kelas
                          </p>
                          <textarea
                            rows={3}
                            value={announcementText}
                            onChange={(e) => setAnnouncementText(e.target.value)}
                            placeholder="Tuliskan jadwal belajar, tautan materi modul, atau pengingat sesi di sini..."
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-emerald-800"
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={() => {
                                if (announcementText.trim()) setShowAnnounceConfirm(true);
                              }}
                              disabled={!announcementText.trim() || loading}
                              className="px-3.5 py-2 bg-emerald-950 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-sm hover:bg-emerald-900 transition disabled:opacity-50 cursor-pointer"
                            >
                              <Send size={13} /> Publikasikan Pengumuman
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Google Docs Tab */
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase">
                      Pembuat Dokumen Pembelajaran Resmi WIC
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Buat file Google Docs terstruktur yang langsung tersimpan di akun Google Drive Anda.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                      Pilih Jenis Dokumen:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDocType('modul');
                          setDocTitle(`Modul Ajar WIC - ${currentUser.name} - ${appData.settings.period_text}`);
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition ${
                          docType === 'modul'
                            ? 'bg-emerald-950 text-white border-emerald-800 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <BookOpen size={14} className="mx-auto mb-1" />
                        Modul Ajar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDocType('rpp');
                          setDocTitle(`RPP Sesi Belajar WIC - ${currentUser.name}`);
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition ${
                          docType === 'rpp'
                            ? 'bg-emerald-950 text-white border-emerald-800 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <FileText size={14} className="mx-auto mb-1" />
                        RPP Pengajar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDocType('rekap');
                          setDocTitle(`Rekap Data Lembaga WIC - ${appData.settings.period_text}`);
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition ${
                          docType === 'rekap'
                            ? 'bg-emerald-950 text-white border-emerald-800 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <Users size={14} className="mx-auto mb-1" />
                        Rekap Siswa
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                      Judul File Google Docs:
                    </label>
                    <input
                      type="text"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setShowDocConfirm(true)}
                      disabled={loading || !docTitle.trim()}
                      className="px-4 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-md active:scale-95 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Plus size={15} /> Buat Dokumen di Google Docs
                    </button>
                  </div>

                  {createdDocUrl && (
                    <div className="mt-4 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-emerald-950">Dokumen Berhasil Dibuat!</p>
                          <p className="text-[10px] text-emerald-800 line-clamp-1">{docTitle}</p>
                        </div>
                      </div>
                      <a
                        href={createdDocUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition shadow-xs shrink-0"
                      >
                        Buka Dokumen <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Modal for Destructive/Mutating Operations (Mandatory Requirement) */}
        {showAnnounceConfirm && selectedCourse && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl border border-slate-200">
              <h4 className="text-sm font-black text-slate-900 uppercase">
                Konfirmasi Kirim Pengumuman
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin memposting pengumuman ini ke kelas <strong>{selectedCourse.name}</strong>? Pengumuman akan langsung terlihat oleh seluruh siswa terdaftar.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAnnounceConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  onClick={handlePublishAnnouncement}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-900 text-white hover:bg-emerald-950"
                >
                  Ya, Kirim Sekarang
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Creating Google Doc */}
        {showDocConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl border border-slate-200">
              <h4 className="text-sm font-black text-slate-900 uppercase">
                Konfirmasi Pembuatan Dokumen
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Aplikasi akan membuat file Google Docs baru berjudul <strong>"{docTitle}"</strong> di akun Google Drive Anda. Lanjutkan proses pembuatan?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowDocConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  onClick={handleCreateDocument}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-700 text-white hover:bg-blue-800"
                >
                  Ya, Buat Dokumen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
