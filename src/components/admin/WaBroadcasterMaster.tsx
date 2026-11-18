import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, AppData } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { calculateTutorPayroll, getTutorKey } from '../../lib/payroll';
import { 
  MessageSquare, 
  Send, 
  Copy, 
  RotateCcw, 
  Check, 
  Sparkles, 
  UserCheck, 
  Search, 
  Phone, 
  CheckCircle2, 
  Layers, 
  FileText, 
  Smile, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Edit3,
  Smartphone
} from 'lucide-react';

interface WaBroadcasterMasterProps {
  appData: AppData;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Opening Greetings (Bahasa Natural & Emoticon Tidak Berlebihan)
const GREETING_OPTIONS = [
  {
    id: 'islami',
    label: 'Islami (Assalamu\'alaikum Wr. Wb. + Doa)',
    prefix: "Assalamu'alaikum Warahmatullahi Wabarakatuh.\nSemoga keberkahan dan kesehatan senantiasa menyertai {TUTOR_SALUTATION} {TUTOR_NAME}.\n\n"
  },
  {
    id: 'formal',
    label: 'Formal Lembaga (Salam Hormat & Kedinasan)',
    prefix: "Kepada Yth. {TUTOR_SALUTATION} {TUTOR_NAME} ({TUTOR_STATUS}),\nSalam sejahtera kami sampaikan dari Manajemen {INSTITUTION_NAME}.\n\n"
  },
  {
    id: 'semangat',
    label: 'Pendidik (Halo Semangat Pagi)',
    prefix: "Halo, Semangat Pagi {TUTOR_SALUTATION} {TUTOR_NAME}!\nSemoga senantiasa bersemangat dalam membimbing siswa-siswi kita di {INSTITUTION_NAME}.\n\n"
  },
  {
    id: 'kekeluargaan',
    label: 'Santun Kekeluargaan (Salam Hangat)',
    prefix: "Salam hangat untuk {TUTOR_SALUTATION} {TUTOR_NAME} sekeluarga.\nTerima kasih atas dedikasi dan kesungguhan yang selalu dicurahkan di {INSTITUTION_NAME}.\n\n"
  },
  {
    id: 'to_the_point',
    label: 'Ringkas (Yth. Rekan Pengajar)',
    prefix: "Yth. {TUTOR_SALUTATION} {TUTOR_NAME} ({TUTOR_STATUS}) - {INSTITUTION_NAME}.\nBerikut informasi resmi operasional yang kami sampaikan:\n\n"
  },
  {
    id: 'none',
    label: 'Tanpa Salam Pembuka (Langsung ke Isi)',
    prefix: ""
  }
];

// Message Categories
const CATEGORY_OPTIONS = [
  {
    id: 'periode_baru',
    label: '1. Pengumuman Awal Periode Baru (Kalender Mengajar & Target Modul)',
    subject: 'Pengumuman Awal Periode Baru'
  },
  {
    id: 'reminder_jurnal',
    label: '2. Pengingat Pengisian Jurnal Mengajar & Absensi Siswa',
    subject: 'Pengingat Pengisian Jurnal Mengajar'
  },
  {
    id: 'payroll_ready',
    label: '3. Notifikasi Rekap Penggajian / Slip Gaji Siap Dicetak & Ditransfer',
    subject: 'Slip Gaji & Rekap Penggajian Terbit'
  },
  {
    id: 'project_approval',
    label: '4. Verifikasi & Approval Proyek Tambahan Tutor',
    subject: 'Update Persetujuan Proyek Tambahan'
  },
  {
    id: 'assessment_reminder',
    label: '5. Evaluasi & Pengisian Master Nilai Siswa (Buku Nilai / Legger)',
    subject: 'Pengisian Buku Nilai Siswa'
  },
  {
    id: 'meeting_invite',
    label: '6. Undangan Rapat / Briefing Evaluasi Tutor & Manajemen',
    subject: 'Undangan Koordinasi & Briefing Tutor'
  },
  {
    id: 'bonus_appreciation',
    label: '7. Info Tunjangan Khusus / Bonus Prestasi & Apresiasi Tutor',
    subject: 'Apresiasi & Bonus Prestasi Tutor'
  },
  {
    id: 'makeup_class',
    label: '8. Pengingat Sesi Pengganti (Make Up Class) & Modul Ajar',
    subject: 'Koordinasi Sesi Pengganti'
  },
  {
    id: 'custom_free',
    label: '9. Pesan Pengumuman Umum / Kustom Bebas',
    subject: 'Pengumuman Resmi WIC'
  },
  {
    id: 'credential_recovery',
    label: '10. Pemulihan Kredensial Akun (Lupa Username / Password Tutor)',
    subject: 'Informasi Akun & Kredensial Login Tutor'
  }
];

// Tones of Voice
const TONE_OPTIONS = [
  { id: 'santun_edukatif', label: '🌸 Santun & Edukatif', badge: 'Santun', desc: 'Hangat, santun, doa berkah, edukatif' },
  { id: 'bilingual', label: '🇬🇧 Bilingual Modern', badge: 'Global', desc: 'Kombinasi bahasa Inggris akademis & Indonesia santun' },
  { id: 'formal_dinas', label: '🏛️ Formal Kedinasan', badge: 'Resmi', desc: 'Struktur baku lembaga, presisi, tegas dan berwibawa' },
  { id: 'empati', label: '🤝 Empati Kekeluargaan', badge: 'Keluarga', desc: 'Ramah, mengayomi, penuh perhatian dan supportif' },
  { id: 'tegas_disiplin', label: '⚡ Tegas & Disiplin', badge: 'Disiplin', desc: 'Ringkas, jadwal terikat, batas waktu yang jelas' },
  { id: 'apresiasi', label: '🌟 Apresiasi Prestasi', badge: 'Apresiasi', desc: 'Pujian atas kinerja, motivasi tinggi, penuh semangat' },
  { id: 'natural_akrab', label: '💬 Natural & Akrab', badge: 'Akrab', desc: 'Gaya chat santai namun tetap menghormati kode etik' },
  { id: 'kasih_sayang', label: '❤️ Kasih Sayang & Peduli', badge: 'Peduli', desc: 'Perhatian pada kenyamanan tutor dan kemajuan siswa' },
  { id: 'karakter_adab', label: '🌿 Karakter & Adab', badge: 'Adab', desc: 'Mengutamakan nilai moral, keteladanan dan akhlak mulia' },
  { id: 'inspiratif', label: '🚀 Inspiratif Global', badge: 'Visioner', desc: 'Menghubungkan tugas mengajar dengan masa depan generasi bangsa' },
  { id: 'solutif', label: '💡 Solutif & Terbuka', badge: 'Solusi', desc: 'Buka ruang diskusi, siap membantu kendala teknis tutor' }
];

// Closing Signature Tones - Gaya Bahasa & Salam Lembaga Resmi WIC
const SIGNATURE_OPTIONS = [
  {
    id: 'id_formal',
    label: 'Resmi Lembaga (Salam Hormat & Manajemen)',
    text: `\n\n━━━━━━━━━━━━━━━━━━━━
Salam hormat,
*{CFO_TITLE}*
*{INSTITUTION_NAME}*
━━━━━━━━━━━━━━━━━━━━`
  },
  {
    id: 'en_bilingual',
    label: 'Bilingual Formal (Warm Regards)',
    text: `\n\n━━━━━━━━━━━━━━━━━━━━
Warmest regards & highest respect,
*Financial Management & Academic Affairs*
*{INSTITUTION_NAME}*
━━━━━━━━━━━━━━━━━━━━`
  },
  {
    id: 'islami_doa',
    label: 'Islami & Barokah (Wassalamu\'alaikum)',
    text: `\n\n━━━━━━━━━━━━━━━━━━━━
Wassalamu'alaikum Warahmatullahi Wabarakatuh.
Salam ta'dzim & apresiasi,
*Manajemen {INSTITUTION_NAME}*
━━━━━━━━━━━━━━━━━━━━`
  },
  {
    id: 'pendidik_hangat',
    label: 'Keluarga Pendidik (Salam Hangat)',
    text: `\n\n━━━━━━━━━━━━━━━━━━━━
Salam hangat penuh kebersamaan,
*Keluarga Besar {INSTITUTION_NAME}*
━━━━━━━━━━━━━━━━━━━━`
  }
];

export default function WaBroadcasterMaster({ appData, showToast }: WaBroadcasterMasterProps) {
  // State for generator options
  const [selectedGreetingId, setSelectedGreetingId] = useState('islami');
  const [selectedCategoryId, setSelectedCategoryId] = useState('payroll_ready');
  const [selectedToneId, setSelectedToneId] = useState('santun_edukatif');
  const [infoCompleteness, setInfoCompleteness] = useState<'COMPLETE' | 'CONCISE'>('COMPLETE');
  const [includeSignature, setIncludeSignature] = useState(true);
  const [selectedSignatureId, setSelectedSignatureId] = useState('id_formal');

  // Preview & Editor Modes
  const [previewMode, setPreviewMode] = useState<'CHAT' | 'EDITOR'>('CHAT');
  const [customBodyText, setCustomBodyText] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  // Selected Tutor Target
  const tutors = useMemo(() => {
    return appData.users.filter(u => u.role === 'TUTOR');
  }, [appData.users]);

  const [selectedTutorWa, setSelectedTutorWa] = useState<string>(getTutorKey(tutors[0]) || '');
  const [sentTutorWas, setSentTutorWas] = useState<Set<string>>(new Set());
  const [searchTutor, setSearchTutor] = useState('');

  const activeTutor = useMemo(() => {
    return tutors.find(t => getTutorKey(t) === selectedTutorWa || t.wa === selectedTutorWa) || tutors[0] || null;
  }, [tutors, selectedTutorWa]);

  // Tutor's real-time statistics for current period using unified payroll engine
  const tutorData = useMemo(() => {
    if (!activeTutor) {
      return {
        name: 'Tutor WIC',
        salutation: 'Mr.',
        status: 'Senior Tutor',
        wa: '',
        period: appData.settings.period_text,
        sessionCount: 0,
        mandiriCount: 0,
        teamCount: 0,
        privateCount: 0,
        semiPrivateCount: 0,
        moduleBonusTotal: 0,
        projectTotal: 0,
        approvedProjectCount: 0,
        allowance: 0,
        otherFee: 0,
        totalGaji: 0
      };
    }

    const calc = calculateTutorPayroll(activeTutor, appData);

    const isFemale = Boolean(
      activeTutor?.gender === 'P' || 
      activeTutor?.gender === 'Perempuan' || 
      activeTutor?.gender === 'perempuan' || 
      activeTutor?.gender === 'Miss' || 
      activeTutor?.gender === 'Ms.' || 
      activeTutor?.gender === 'Mrs.' ||
      activeTutor?.title === 'Miss'
    );
    const tutorSalutation = isFemale ? 'Miss' : 'Mr.';

    return {
      name: activeTutor.name,
      salutation: tutorSalutation,
      status: activeTutor.status_tutor,
      wa: activeTutor.wa,
      period: appData.settings.period_text,
      sessionCount: calc.totalSessions,
      mandiriCount: calc.mandiriCount,
      teamCount: calc.teamCount,
      privateCount: calc.privateCount,
      semiPrivateCount: calc.semiPrivateCount,
      moduleBonusTotal: calc.moduleTotal,
      projectTotal: calc.projectTotal,
      approvedProjectCount: calc.approvedProjects.length,
      allowance: calc.allowance,
      otherFee: calc.otherFee,
      totalGaji: calc.grandTotal
    };
  }, [activeTutor, appData]);

  // Helper tone-based greetings and intros
  const getToneIntro = (tId: string, category: string, period: string) => {
    switch (category) {
      case 'payroll_ready':
        switch (tId) {
          case 'bilingual':
            return `Dear respected Educator Kak {TUTOR_NAME}, we are pleased to present the official financial remuneration summary and *E-Slip Gaji Digital WIC* for period *${period}* which has been finalized by the Academic & Financial Board.`;
          case 'formal_dinas':
            return `Dengan hormat, berdasarkan hasil verifikasi pembukuan resmi Divisi Keuangan Worth It Course, disampaikan ketetapan rekapitulasi penggajian pengajar untuk periode pembelajaran *${period}*.`;
          case 'empati':
            return `Salam hangat dan doa sejahtera untuk Kak {TUTOR_NAME} sekeluarga. Kami sangat memahami curahan tenaga, kesabaran, dan waktu berharga yang Kakak persembahkan demi membimbing adik-adik siswa. Berikut rekapitulasi hak honorium Kakak periode *${period}*:`;
          case 'tegas_disiplin':
            return `PEMBERITAHUAN RESMI DIVISI KEUANGAN WIC: Rekapitulasi penggajian periode *${period}* telah difinalisasi sesuai ketentuan operasional yang berlaku. Mohon periksa rincian berikut:`;
          case 'apresiasi':
            return `Apresiasi setinggi-tingginya untuk Kak {TUTOR_NAME}! Prestasi dan dedikasi istimewa Kakak dalam membimbing siswa pada periode *${period}* sungguh membanggakan institusi. Berikut rincian honorium kinerja Kakak:`;
          case 'natural_akrab':
            return `Halo Kak {TUTOR_NAME}! Kabar gembira, slip gaji dan rekapitulasi honor mengajar Kakak untuk periode *${period}* sudah selesai dihitung dan siap diakses lho. Cek rinciannya di bawah ya Kak:`;
          case 'kasih_sayang':
            return `Penuh rasa kasih dan terima kasih yang tulus untuk Kak {TUTOR_NAME}. Kehangatan dan kelembutan hati Kakak dalam mendidik adik-adik adalah anugerah terindah bagi keluarga besar WIC. Berikut rekap honor periode *${period}*:`;
          case 'karakter_adab':
            return `Bismillahirrohmanirrohim. Semoga limpahan berkah senantiasa menaungi Kak {TUTOR_NAME} yang istiqomah menanamkan akhlak mulia dan ilmu bermanfaat. Berikut amanah rekapitulasi hak honorarium Kakak periode *${period}*:`;
          case 'inspiratif':
            return `Mencerdaskan kehidupan bangsa berakar dari ketulusan para pendidik visioner seperti Kak {TUTOR_NAME}. Terima kasih telah menjadi lentera inspirasi bagi generasi emas WIC. Berikut rekapitulasi periode *${period}*:`;
          case 'solutif':
            return `Manajemen Keuangan WIC senantiasa menjunjung tinggi prinsip transparansi dan akuntabilitas bagi seluruh rekan pendidik. Berikut rekapitulasi komprehensif honorarium periode *${period}* yang telah kami verifikasi:`;
          case 'santun_edukatif':
          default:
            return `Alhamdulillah, kami sampaikan dengan penuh rasa hormat dan takzim bahwa rekapitulasi penggajian dan *Slip Gaji Digital Resmi* periode *${period}* telah rampung diverifikasi oleh Divisi Keuangan WIC.`;
        }
      case 'periode_baru':
        switch (tId) {
          case 'bilingual':
            return `Welcome to the new academic term *${period}*! Official teaching shifts, student schedules, and interactive learning modules are now fully active on the WIC portal.`;
          case 'formal_dinas':
            return `Diberitahukan secara resmi kepada seluruh rekan pendidik bahwa pelaksanaan kalender akademik periode pembelajaran *${period}* telah dimulai.`;
          case 'apresiasi':
            return `Menyambut periode pembelajaran baru *${period}* dengan semangat juara! Mari kita lanjutkan prestasi gemilang dan bimbingan inspiratif bagi seluruh siswa bimbingan.`;
          default:
            return `Memasuki periode pembelajaran baru *${period}*, kami informasikan bahwa jadwal shift mengajar dan modul ajar digital telah disiapkan pada sistem portal.`;
        }
      case 'reminder_jurnal':
        switch (tId) {
          case 'tegas_disiplin':
            return `PERINGATAN OPERASIONAL: Mohon segera lengkapi *Jurnal Harian Mengajar* dan presensi siswa yang belum terisi. Pengisian tertib adalah syarat mutlak validasi penggajian.`;
          case 'bilingual':
            return `Kindly reminder to complete your *Daily Teaching Journal* and student attendance on the portal for the conducted teaching sessions.`;
          default:
            return `Mengingatkan dengan penuh rasa hormat kepada Kakak mengenai kelengkapan *Jurnal Harian Mengajar* untuk sesi pembelajaran yang telah berlangsung.`;
        }
      default:
        return `Pemberitahuan resmi dari Manajemen Keuangan & Administrasi Akademik Worth It Course untuk rekan pengajar Kak {TUTOR_NAME}.`;
    }
  };

  const getToneOutro = (tId: string) => {
    switch (tId) {
      case 'bilingual':
        return `Thank you for your outstanding passion, professional integrity, and continuous dedication to educational excellence at Worth It Course.`;
      case 'formal_dinas':
        return `Demikian surat pemberitahuan resmi ini disampaikan untuk diketahui dan dijadikan acuan tertib administrasi sebagaimana mestinya.`;
      case 'empati':
        return `Semoga Kakak dan keluarga senantiasa dilimpahi kesehatan, ketenteraman, dan kemudahan dalam setiap langkah. Terima kasih atas ketulusan hati Kakak.`;
      case 'tegas_disiplin':
        return `Konfirmasi atau rekonsiliasi data dilayani maksimal 2x24 jam sejak notifikasi ini diterbitkan melalui helpdesk resmi. Terima kasih atas kepatuhan SOP.`;
      case 'apresiasi':
        return `Terima kasih atas performa gemilang Kakak! Teruslah menyalakan lentera inspirasi dan mencetak generasi pembelajar berprestasi bersama Worth It Course!`;
      case 'natural_akrab':
        return `Makasih banyak ya Kak udah selalu totalitas dan bikin suasana belajar selalu seru dan menyenangkan bagi adik-adik. Semangat terus!`;
      case 'kasih_sayang':
        return `Semoga senyum bahagia dan kemajuan para siswa menjadi saksi atas ketulusan hati Kakak yang tak pernah lelah menebar kasih dan kebaikan.`;
      case 'karakter_adab':
        return `Jazakumullah khairan katsiran atas amanah mendidik dengan adab dan keteladanan. Semoga bernilai pahala jariyah di sisi Allah SWT.`;
      case 'inspiratif':
        return `Teruslah melangkah dengan bangga. Setiap ilmu yang Kakak tanamkan hari ini adalah fondasi kejayaan generasi masa depan bangsa.`;
      case 'solutif':
        return `Apabila terdapat hal yang memerlukan bantuan, konfirmasi, atau diskusi rekonsiliasi teknis, Tim Manajemen Keuangan siap mendampingi dengan senang hati.`;
      case 'santun_edukatif':
      default:
        return `Terima kasih banyak atas ketulusan dan dedikasi pengajaran yang luar biasa. Semoga setiap ikhtiar mendidik berbuah pahala melimpah dan keberkahan.`;
    }
  };

  // Base message template generator tailored to Tutors, Tone of Voice, and Completeness Mode
  const generateBaseTemplate = () => {
    const isComplete = infoCompleteness === 'COMPLETE';
    const period = appData.settings.period_text;
    const toneIntro = getToneIntro(selectedToneId, selectedCategoryId, period);
    const toneOutro = getToneOutro(selectedToneId);

    const portalUrl = typeof window !== 'undefined' ? window.location.origin : 'Portal WIC';
    const institutionName = appData.settings.institution_name || 'Worth It Course (WIC)';

    switch (selectedCategoryId) {
      case 'payroll_ready':
        if (isComplete) {
          return `${toneIntro}

*Rincian Honorarium Periode ${period}:*
• Total Sesi Mengajar: *${tutorData.sessionCount} Sesi* (${tutorData.mandiriCount} Mandiri, ${tutorData.teamCount} Team, ${tutorData.privateCount} Private, ${tutorData.semiPrivateCount} Semi Private)
• Kompensasi Proyek: *${formatCurrency(tutorData.projectTotal)}* (${tutorData.approvedProjectCount} Proyek)
• Tunjangan & Bonus: *${formatCurrency(tutorData.allowance + tutorData.otherFee)}*
━━━━━━━━━━━━━━━━━━━━
*TOTAL PENGHASILAN BERSIH (TAKE HOME PAY):*
*${formatCurrency(tutorData.totalGaji)}*
━━━━━━━━━━━━━━━━━━━━

*Informasi Penyaluran:*
• Metode: ${activeTutor?.payment_method === 'CASH' ? 'Tunai (Cash)' : 'Transfer Bank'}
• Rekening: ${activeTutor?.bank_name || 'Bank Payroll'} a.n. ${activeTutor?.bank_holder || activeTutor?.name}
• Status: Terverifikasi & Diproses Lunas

Slip gaji resmi dan barcode verifikasi dapat langsung diunduh melalui portal:
${portalUrl}

${toneOutro}`;
        } else {
          return `${toneIntro}

*TOTAL TAKE HOME PAY:* *${formatCurrency(tutorData.totalGaji)}* (${tutorData.sessionCount} Sesi)
Penyaluran: ${activeTutor?.payment_method === 'CASH' ? 'Tunai Langsung' : 'Transfer Bank'}
Slip gaji resmi dapat diakses di: ${portalUrl}

${toneOutro}`;
        }

      case 'periode_baru':
        if (isComplete) {
          return `${toneIntro}

*Agenda & Persiapan Awal Periode ${period}:*
1. Pembagian jadwal shift dan siswa binaan telah diperbarui pada sistem.
2. Modul ajar kurikulum digital telah tersedia di Room Modul Tutor.
3. Mohon pastikan jurnal mengajar diisi secara tertib setiap selesai sesi.

Portal Sistem: ${portalUrl}

${toneOutro}`;
        } else {
          return `${toneIntro}
Jadwal mengajar dan modul ajar untuk periode ${period} telah aktif di portal: ${portalUrl}.
Selamat bertugas dan sukses membimbing para siswa!`;
        }

      case 'reminder_jurnal':
        if (isComplete) {
          return `${toneIntro}

*Pengingat Pengisian Jurnal Mengajar:*
Pengisian materi ajar dan presensi kehadiran siswa secara tertib sangat penting untuk memastikan ketepatan rekapitulasi honorarium akhir periode.

Formulir jurnal dapat diakses pada menu Jurnal Shift di portal:
${portalUrl}

${toneOutro}`;
        } else {
          return `${toneIntro}
Mohon kesediaannya melengkapi jurnal mengajar dan presensi siswa yang telah berlangsung di portal: ${portalUrl}. Terima kasih atas kerja samanya.`;
        }

      case 'project_approval':
        return `${toneIntro}
Pengajuan proyek tambahan yang diajukan telah selesai diverifikasi oleh Manajemen ${institutionName}.

*Status:* Diterima & Disetujui
Fee proyek telah dimasukkan ke dalam komponen honorarium periode ${period}.

${toneOutro}`;

      case 'assessment_reminder':
        return `${toneIntro}
Sehubungan dengan evaluasi belajar siswa periode ${period}, mohon kesediaan untuk mengisi Buku Nilai Siswa (M1 s/d M8, Ujian, dan Catatan Perkembangan).

Pengisian dapat dilakukan melalui menu Master Penilaian di portal:
${portalUrl}

${toneOutro}`;

      case 'meeting_invite':
        return `${toneIntro}
Kami mengundang kehadiran pada sesi Koordinasi & Evaluasi Pengajar ${institutionName}.

Pertemuan ini bertujuan menyelaraskan metode pembelajaran, pembaruan modul, dan penjaminan mutu bimbingan. Kehadiran dan masukan sangat kami harapkan.

${toneOutro}`;

      case 'bonus_appreciation':
        return `${toneIntro}
Manajemen ${institutionName} menyampaikan apresiasi atas dedikasi dan kualitas bimbingan yang telah diberikan sepanjang periode ini.

Sebagai wujud terima kasih lembaga, komponen Bonus Apresiasi Kinerja telah ditambahkan pada rekapitulasi penggajian.

${toneOutro}`;

      case 'makeup_class':
        return `${toneIntro}
Koordinasi mengenai pelaksanaan sesi pengganti (Make Up Class) bagi siswa bimbingan. Mohon konfirmasi jadwal dan shift yang disepakati agar tercatat resmi dalam sistem:
${portalUrl}

${toneOutro}`;

      case 'credential_recovery':
        return `${toneIntro}
Berikut adalah informasi akun resmi Anda untuk mengakses Portal Manajemen ${institutionName} (tidak perlu membuat akun baru):

📋 *DATA DIRI & STATUS TERVERIFIKASI:*
• Nama Lengkap: *${activeTutor.name}*
• ID Tutor: *T-${activeTutor.id ? String(activeTutor.id).replace(/^T-?/i, '') : activeTutor.wa}*
• Status Jenjang: *${activeTutor.status_tutor || 'Aktif'}*
• Nomor WhatsApp: *${activeTutor.wa}*

🔑 *KREDENSIAL LOGIN ANDA:*
• Username: *${activeTutor.username}*
• Password: *${activeTutor.password || 'password'}*

🌐 *LINK AKSES PORTAL:*
${portalUrl}

💡 *Panduan Masuk:*
1. Buka tautan portal di atas
2. Masukkan Username dan Password Anda
3. Anda dapat langsung mengelola jadwal, modul ajar, dan slip gaji

Mohon simpan data login ini dengan baik dan jangan membagikannya kepada pihak lain.

${toneOutro}`;

      default:
        return `${toneIntro}
Informasi resmi mengenai kegiatan akademik dan administrasi ${institutionName} dapat dilihat melalui portal:
${portalUrl}

${toneOutro}`;
    }
  };

  // Compile full text with greeting, body, and closing
  const compiledFullMessage = useMemo(() => {
    const institutionName = appData.settings.institution_name || 'Worth It Course (WIC)';
    const cfoTitle = appData.settings.cfo_title || 'Manajemen Keuangan & Administrasi';
    const cfoName = appData.settings.cfo_name || 'Rodhotul Jannah, S. Th. I., M. Ag.';
    const directorName = appData.settings.director_name || 'Khoirul Mahmud, S. Pd., S. Kom.';

    const greetingObj = GREETING_OPTIONS.find(g => g.id === selectedGreetingId);
    let greetingText = greetingObj ? greetingObj.prefix : '';

    // Replace greeting placeholders
    greetingText = greetingText
      .replace(/{TUTOR_NAME}/g, tutorData.name)
      .replace(/{TUTOR_SALUTATION}/g, tutorData.salutation)
      .replace(/{TUTOR_STATUS}/g, tutorData.status)
      .replace(/{INSTITUTION_NAME}/g, institutionName);

    let bodyText = customBodyText;
    if (!bodyText) {
      bodyText = generateBaseTemplate();
    }

    // Replace any variables in body
    bodyText = bodyText
      .replace(/{TUTOR_NAME}/g, tutorData.name)
      .replace(/{TUTOR_SALUTATION}/g, tutorData.salutation)
      .replace(/{TUTOR_STATUS}/g, tutorData.status)
      .replace(/{INSTITUTION_NAME}/g, institutionName)
      .replace(/{CFO_NAME}/g, cfoName)
      .replace(/{DIRECTOR_NAME}/g, directorName)
      .replace(/{TOTAL_GAJI}/g, formatCurrency(tutorData.totalGaji))
      .replace(/{TOTAL_SESI}/g, `${tutorData.sessionCount} Sesi`)
      .replace(/{PERIODE}/g, tutorData.period);

    let closingText = '';
    if (includeSignature) {
      const sigObj = SIGNATURE_OPTIONS.find(s => s.id === selectedSignatureId);
      closingText = sigObj ? sigObj.text : '';
      closingText = closingText
        .replace(/{INSTITUTION_NAME}/g, institutionName)
        .replace(/{CFO_TITLE}/g, cfoTitle)
        .replace(/{CFO_NAME}/g, cfoName)
        .replace(/{DIRECTOR_NAME}/g, directorName);
    }

    return `${greetingText}${bodyText}${closingText}`.trim();
  }, [
    selectedGreetingId, 
    selectedCategoryId, 
    selectedToneId, 
    infoCompleteness, 
    includeSignature, 
    selectedSignatureId, 
    customBodyText, 
    tutorData,
    appData.settings
  ]);

  // Handle resetting custom edit to template
  const handleResetTemplate = () => {
    setCustomBodyText('');
    showToast?.("Template pesan berhasil direset!", "info");
  };

  // Handle Copy
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(compiledFullMessage);
      setIsCopied(true);
      showToast?.("Pesan WhatsApp berhasil disalin ke clipboard!", "success");
      setTimeout(() => setIsCopied(false), 2500);
    } catch (e) {
      showToast?.("Gagal menyalin pesan", "error");
    }
  };

  // Handle Sending via WhatsApp API
  const handleSendWA = (targetWa?: string) => {
    const phone = targetWa || activeTutor?.wa || '';
    if (!phone) {
      showToast?.("Nomor WhatsApp tutor tidak valid", "error");
      return;
    }

    // Clean phone number: remove non-digits
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const encoded = encodeURIComponent(compiledFullMessage);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
    
    // Mark as sent in queue
    setSentTutorWas(prev => new Set(prev).add(cleanPhone).add(phone));

    window.open(waUrl, '_blank');
    showToast?.(`Membuka WhatsApp untuk Kak ${activeTutor?.name}...`, "success");
  };

  // Variable insertion at cursor
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleInsertVariable = (variableTag: string) => {
    if (previewMode !== 'EDITOR') {
      setPreviewMode('EDITOR');
    }

    const currentText = customBodyText || generateBaseTemplate();
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart || currentText.length;
      const end = textarea.selectionEnd || currentText.length;
      const newText = currentText.substring(0, start) + variableTag + currentText.substring(end);
      setCustomBodyText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variableTag.length, start + variableTag.length);
      }, 50);
    } else {
      setCustomBodyText(currentText + ' ' + variableTag);
    }
  };

  // Quick formatting wrapping
  const handleWrapFormat = (symbol: string) => {
    const currentText = customBodyText || generateBaseTemplate();
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const selected = currentText.substring(start, end);
      const replacement = `${symbol}${selected || 'teks'}${symbol}`;
      const newText = currentText.substring(0, start) + replacement + currentText.substring(end);
      setCustomBodyText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + symbol.length, start + replacement.length - symbol.length);
      }, 50);
    }
  };

  // Filtered queue contacts
  const filteredTutors = useMemo(() => {
    if (!searchTutor) return tutors;
    const q = searchTutor.toLowerCase();
    return tutors.filter(t => t.name.toLowerCase().includes(q) || t.wa.includes(q) || t.status_tutor.toLowerCase().includes(q));
  }, [tutors, searchTutor]);

  const sentCount = useMemo(() => {
    return tutors.filter(t => sentTutorWas.has(t.wa) || sentTutorWas.has(t.wa.replace(/[^0-9]/g, ''))).length;
  }, [tutors, sentTutorWas]);

  const activeToneObj = TONE_OPTIONS.find(t => t.id === selectedToneId) || TONE_OPTIONS[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Konfigurasi Generator Pesan (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-slate-200 space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Sparkles size={18} />
            </span>
            <div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm sm:text-base">
                Konfigurasi Generator Pesan
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase">
                Template Cerdas Khusus Tutor / Pengajar WIC
              </p>
            </div>
          </div>

          {/* 1. Salam Pembuka */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1.5 flex items-center gap-1">
              <span>Salam Pembuka (Selalu Mengawali Pesan)</span>
              <span className="text-red-500 font-black">*</span>
            </label>
            <select
              value={selectedGreetingId}
              onChange={e => setSelectedGreetingId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 cursor-pointer transition shadow-sm"
            >
              {GREETING_OPTIONS.map(g => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
              <span>✓</span>
              <span>Pesan dijamin selalu diawali kalimat salam santun sebelum inti informasi.</span>
            </p>
          </div>

          {/* 2. Kategori / Keperluan Pesan */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1.5">
              Kategori / Keperluan Pesan
            </label>
            <select
              value={selectedCategoryId}
              onChange={e => {
                setSelectedCategoryId(e.target.value);
                setCustomBodyText(''); // reset to newly selected category base
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 cursor-pointer transition shadow-sm"
            >
              {CATEGORY_OPTIONS.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* 3. Gaya Bahasa (Tone of Voice Lembaga) */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[11px] font-black uppercase text-slate-700">
                Gaya Bahasa (Tone of Voice Lembaga)
              </label>
              <span className="text-[9px] font-black uppercase bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                {activeToneObj.badge}
              </span>
            </div>

            {/* Chips Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TONE_OPTIONS.map(tone => {
                const isSelected = selectedToneId === tone.id;
                return (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => {
                      setSelectedToneId(tone.id);
                      setCustomBodyText('');
                    }}
                    className={cn(
                      "py-2 px-2.5 rounded-xl text-[10px] font-bold text-left transition flex items-center gap-1.5 border truncate cursor-pointer",
                      isSelected 
                        ? "bg-emerald-950 text-gold-400 border-emerald-950 shadow-sm font-black" 
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    )}
                    title={tone.desc}
                  >
                    <span className="truncate">{tone.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 italic mt-1.5">
              {activeToneObj.desc}
            </p>
          </div>

          {/* 4. Kelengkapan Informasi */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1.5">
              Kelengkapan Informasi
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setInfoCompleteness('COMPLETE');
                  setCustomBodyText('');
                }}
                className={cn(
                  "py-2.5 px-3 rounded-2xl text-xs font-black uppercase tracking-tight transition text-center border cursor-pointer",
                  infoCompleteness === 'COMPLETE'
                    ? "bg-emerald-900 text-white border-emerald-900 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                Mode Lengkap (+ Rekening)
              </button>
              <button
                type="button"
                onClick={() => {
                  setInfoCompleteness('CONCISE');
                  setCustomBodyText('');
                }}
                className={cn(
                  "py-2.5 px-3 rounded-2xl text-xs font-black uppercase tracking-tight transition text-center border cursor-pointer",
                  infoCompleteness === 'CONCISE'
                    ? "bg-emerald-900 text-white border-emerald-900 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                Mode Ringkas (To The Point)
              </button>
            </div>
          </div>

          {/* 5. Sertakan Penutup Salam Hormat Manajemen Keuangan */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSignature}
                  onChange={e => setIncludeSignature(e.target.checked)}
                  className="w-4 h-4 text-emerald-800 rounded border-slate-300 focus:ring-emerald-700"
                />
                <span className="text-xs font-black uppercase text-slate-800">
                  Sertakan Penutup Salam Hormat Manajemen Keuangan
                </span>
              </label>
              <span className="text-[9px] font-black uppercase bg-gold-400/30 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                Resmi WIC
              </span>
            </div>

            {includeSignature && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-in fade-in">
                {SIGNATURE_OPTIONS.map(sig => {
                  const isSelected = selectedSignatureId === sig.id;
                  return (
                    <button
                      key={sig.id}
                      type="button"
                      onClick={() => setSelectedSignatureId(sig.id)}
                      className={cn(
                        "p-2.5 rounded-xl text-[10px] font-black text-left transition border cursor-pointer leading-tight",
                        isSelected
                          ? "bg-amber-500 text-slate-950 border-amber-600 shadow-sm"
                          : "bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50"
                      )}
                    >
                      {sig.label}
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-[10px] text-amber-900/80 font-medium">
              ✓ Salam hormat & takzim, Manajemen Keuangan & Administrasi Worth It Course.
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: Pratinjau Pesan (Bisa Diedit Bebas) (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-emerald-700" />
                <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm sm:text-base">
                  PRATINJAU PESAN (BISA DIEDIT BEBAS)
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tutor terpilih: <strong className="text-emerald-950">{tutorData.name}</strong> ({tutorData.status})
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setPreviewMode(previewMode === 'CHAT' ? 'EDITOR' : 'CHAT')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1 border cursor-pointer",
                  previewMode === 'CHAT'
                    ? "bg-emerald-950 text-gold-400 border-emerald-950 shadow-sm"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                )}
              >
                {previewMode === 'CHAT' ? <Smartphone size={13} /> : <Edit3 size={13} />}
                <span>{previewMode === 'CHAT' ? 'Simulasi Chat WA' : 'Editor Teks'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetTemplate}
                className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase bg-slate-100 hover:bg-slate-200 text-slate-600 transition flex items-center gap-1"
                title="Reset kembali ke template generator default"
              >
                <RotateCcw size={12} /> Reset
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-gold-400 text-slate-950 hover:bg-gold-500 transition flex items-center gap-1 shadow-sm"
              >
                {isCopied ? <Check size={12} /> : <Copy size={12} />}
                <span>{isCopied ? 'Tersalin' : 'Salin Teks'}</span>
              </button>
            </div>
          </div>

          {/* Quick Insert Variables & Format Toolbar */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              SISIPKAN VARIABEL & FORMAT TEKS CEPAT:
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleInsertVariable('{TUTOR_NAME}')}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg text-[10px] font-bold transition"
              >
                + Nama Tutor
              </button>
              <button
                type="button"
                onClick={() => handleInsertVariable('{TUTOR_STATUS}')}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg text-[10px] font-bold transition"
              >
                + Status Tutor
              </button>
              <button
                type="button"
                onClick={() => handleInsertVariable('{PERIODE}')}
                className="bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-lg text-[10px] font-bold transition"
              >
                + Periode Aktif
              </button>
              <button
                type="button"
                onClick={() => handleInsertVariable('{TOTAL_GAJI}')}
                className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg text-[10px] font-bold transition"
              >
                + Total Gaji
              </button>
              <button
                type="button"
                onClick={() => handleInsertVariable('{TOTAL_SESI}')}
                className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg text-[10px] font-bold transition"
              >
                + Sesi Mengajar
              </button>
              <button
                type="button"
                onClick={() => handleInsertVariable('Bank BRI: 6156-01-021226-53-7')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-bold transition"
              >
                + Rekening Lembaga
              </button>
              <button
                type="button"
                onClick={() => handleInsertVariable('+62 822-8941-6677')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-bold transition"
              >
                + No WA CS
              </button>

              <div className="h-4 w-px bg-slate-300 mx-1" />

              {/* Formatting */}
              <button
                type="button"
                onClick={() => handleWrapFormat('*')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1 rounded-lg text-[10px] font-black transition font-mono"
                title="Tebal (*bold*)"
              >
                *B*
              </button>
              <button
                type="button"
                onClick={() => handleWrapFormat('_')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1 rounded-lg text-[10px] font-black transition font-mono italic"
                title="Miring (_italic_)"
              >
                _I_
              </button>
              <button
                type="button"
                onClick={() => handleWrapFormat('~')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1 rounded-lg text-[10px] font-black transition font-mono line-through"
                title="Coret (~strike~)"
              >
                ~S~
              </button>
              <button
                type="button"
                onClick={() => handleWrapFormat('```')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1 rounded-lg text-[10px] font-black transition font-mono"
                title="Monospace (```code```)"
              >
                ```M```
              </button>
            </div>
          </div>

          {/* Message Display Area */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-100/60 p-4">
            {previewMode === 'CHAT' ? (
              /* WhatsApp Realistic Chat Bubble */
              <div className="max-w-2xl mx-auto my-2">
                <div 
                  className="bg-[#dcf8c6] text-slate-900 p-4 sm:p-5 rounded-2xl rounded-tl-sm shadow-sm relative text-xs leading-relaxed border border-emerald-200/50"
                  style={{ wordBreak: 'break-word', whiteSpace: 'pre-line' }}
                >
                  {/* Bubble tail */}
                  <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-[#dcf8c6] border-l-[10px] border-l-transparent" />
                  
                  {compiledFullMessage}

                  {/* Message timestamp & tick */}
                  <div className="flex justify-end items-center gap-1 text-[9px] text-slate-500 mt-2 font-sans font-bold">
                    <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-blue-600 font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Live Text Editor */
              <div className="space-y-2">
                <textarea
                  ref={textareaRef}
                  value={customBodyText || generateBaseTemplate()}
                  onChange={e => setCustomBodyText(e.target.value)}
                  placeholder="Ketik atau edit draf pesan bebas di sini..."
                  rows={14}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 font-mono leading-relaxed outline-none focus:border-emerald-500 transition shadow-inner"
                />
                <p className="text-[10px] text-slate-400 italic">
                  * Catatan: Teks di atas akan digabungkan secara otomatis dengan Salam Pembuka dan Penutup resmi yang dipilih.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Send Action Strip */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2 border-t border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Penerima aktif:
              </span>
              <p className="text-xs font-black text-slate-800">
                {tutorData.name} <span className="font-mono text-emerald-700">({tutorData.wa})</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleSendWA()}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 active:scale-95 text-white font-black uppercase text-xs px-6 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-green-600/30 cursor-pointer"
            >
              <Send size={15} />
              <span>Kirim Pesan Ini ke WA</span>
            </button>
          </div>

        </div>

      </div>

      {/* BOTTOM PANEL: Antrean Tutor Penerima (X Kontak) */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-slate-200 space-y-4">
        
        {/* Queue Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck size={18} className="text-emerald-700" />
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm sm:text-base">
                Antrean Tutor Penerima ({tutors.length} Kontak)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik baris tutor untuk memuat ke editor, atau langsung tekan <strong>Kirim WA</strong> untuk mengirim satu per satu.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="bg-emerald-50 text-emerald-800 text-xs font-black px-3.5 py-1.5 rounded-full border border-emerald-200">
              {sentCount} / {tutors.length} Terkirim
            </span>
            <button
              type="button"
              onClick={() => {
                setSentTutorWas(new Set());
                showToast?.("Status antrean pengiriman berhasil direset!", "info");
              }}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              title="Reset status kirim"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Search Tutor Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Cari nama tutor, nomor WA, atau status honorium..."
            value={searchTutor}
            onChange={e => setSearchTutor(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition"
          />
        </div>

        {/* Tutors Queue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto custom-scroll pr-1">
          {filteredTutors.map(t => {
            const tKey = getTutorKey(t) || t.id;
            const isSelected = tKey === (getTutorKey(activeTutor) || activeTutor?.id);
            const isSent = Boolean(t.wa && (sentTutorWas.has(t.wa) || sentTutorWas.has(t.wa.replace(/[^0-9]/g, ''))));

            return (
              <div
                key={tKey}
                onClick={() => setSelectedTutorWa(tKey)}
                className={cn(
                  "p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer",
                  isSelected
                    ? "bg-emerald-50/80 border-emerald-400 shadow-sm ring-1 ring-emerald-500/30"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={t.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-black text-xs uppercase text-slate-800 truncate leading-tight">
                      {t.name}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase truncate mt-0.5">
                      {t.status_tutor}
                    </p>
                    <p className="text-[10px] text-emerald-800 font-mono font-bold mt-0.5 flex items-center gap-1">
                      <Phone size={10} /> {t.wa || t.username || '-'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {isSent ? (
                    <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Terkirim
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      Siap Kirim
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTutorWa(tKey);
                      setTimeout(() => handleSendWA(t.wa), 50);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-xl transition flex items-center gap-1 active:scale-95 shadow-sm"
                  >
                    <Send size={10} /> Kirim WA
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
