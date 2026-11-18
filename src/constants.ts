/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HonorRateItem, ProjectClassification, TeachingModule } from './types';

// High-fidelity embedded SVG Data URI for WIC official logo - 100% resilient, zero-404, instant render on any device/deploy
export const EMBEDDED_WIC_LOGO = "data:image/svg+xml;utf8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="50%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064e3b"/>
      <stop offset="60%" stop-color="#022c22"/>
      <stop offset="100%" stop-color="#011b15"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Outer Decorative Ring -->
  <circle cx="250" cy="250" r="236" fill="none" stroke="url(#goldGrad)" stroke-width="4" stroke-dasharray="8 6" opacity="0.6"/>
  <circle cx="250" cy="250" r="226" fill="none" stroke="url(#goldGrad)" stroke-width="2"/>
  <!-- Main Shield -->
  <path d="M 250,38 C 360,38 420,70 420,180 C 420,320 330,410 250,455 C 170,410 80,320 80,180 C 80,70 140,38 250,38 Z" 
        fill="url(#shieldGrad)" stroke="url(#goldGrad)" stroke-width="8" filter="url(#shadow)"/>
  <path d="M 250,56 C 342,56 398,82 398,180 C 398,306 318,388 250,430 C 182,388 102,306 102,180 C 102,82 158,56 250,56 Z" 
        fill="none" stroke="url(#goldGrad)" stroke-width="2.5" opacity="0.8"/>
  <!-- Graduation Cap Icon -->
  <g transform="translate(250, 125) scale(1.15)">
    <polygon points="0,-25 45,-8 0,9 -45,-8" fill="url(#goldGrad)"/>
    <polygon points="0,9 32,-3 32,18 0,30 -32,18 -32,-3" fill="#D97706" opacity="0.9"/>
    <!-- Tassel -->
    <path d="M 38,-5 C 44,0 46,15 44,24" stroke="#FDE68A" stroke-width="3" fill="none"/>
    <circle cx="44" cy="26" r="4" fill="#FCD34D"/>
  </g>
  <!-- Central Typography WIC -->
  <text x="250" y="270" text-anchor="middle" font-family="'Cinzel', 'Trajan Pro', 'Georgia', serif" font-weight="900" font-size="105" fill="url(#goldGrad)" letter-spacing="4" filter="url(#shadow)">WIC</text>
  <!-- Subtitle Tagline -->
  <text x="250" y="320" text-anchor="middle" font-family="'Montserrat', 'Helvetica', sans-serif" font-weight="800" font-size="22" fill="#FDE68A" letter-spacing="7">WORTH IT COURSE</text>
  <!-- Est Ribbon -->
  <rect x="175" y="344" width="150" height="26" rx="13" fill="#064e3b" stroke="url(#goldGrad)" stroke-width="2"/>
  <text x="250" y="361" text-anchor="middle" font-family="'Montserrat', sans-serif" font-weight="900" font-size="12" fill="#FCD34D" letter-spacing="3">ACADEMIC &amp; ENGLISH</text>
  <!-- Stars -->
  <g fill="url(#goldGrad)">
    <polygon points="250,386 253,394 261,394 255,399 257,407 250,402 243,407 245,399 239,394 247,394" transform="scale(1.1) translate(-23, -15)"/>
    <polygon points="215,394 217,400 224,400 219,404 221,410 215,406 209,410 211,404 206,400 213,400"/>
    <polygon points="285,394 287,400 294,400 289,404 291,410 285,406 279,410 281,404 276,400 283,400"/>
  </g>
</svg>
`);

export const WIC_ASSETS = {
  LOGO: "/assets/Logo_WIC.png",
  LOGO_ONLINE: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEifnbo7qinUoD5LZ8ZFhzjaUkgbfD6j9dL-eqqnMMC-LRO2E0eij4J2GZgIOGnNDk6F3Qu5MF7HtRDFWqt8AWH2gBdHnzHDX6YWGSeHScLKVe_uiECoGopNoofWbF9GN2Z_YWWlnb1xBARvahYtm4MD9A733QCE4p_PrAbS4cwulFMBzXMVEmkI5-9BMBA/s520/Logo%20WIC%20%281%29.png",
  LOGO_FALLBACK_URL: "/assets/Logo_WIC.png",
  TTD: "/assets/TTD_Keuangan.png",
  TTD_ONLINE: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgjDh518REZoqDqPMLXCEr4LhCrziZAy85tj8mqdpD2HHRi631tJWS0MidGZyYpraB6TbEVwHwi3xYZTALBB_A3qx7VTnri9EUK70ZZBY9qHpSnYv1B508Zac2UXjaUduw7qxVZSozC9TYcyIYHzm7A3Ht6sQoTZ-bIJb1UIiG_zyI-6QRcTouIC5v4T7c/s1429/ChatGPT%20Image%20Oct%202,%202026,%2008_06_37%20PM%20%281%29.png",
  TTD_LOCAL: "/assets/TTD_Keuangan.png",
  TTD_DIREKTUR: "/assets/TTD_Direktur.png",
  TTD_DIREKTUR_ONLINE: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhabuAoQ9Fqf0plPMRWf6bA9acv2Xq60Sj_0XKEzif9Xys7xLmNZumDsi1ZesZi4bJcDLRPJIx0M7rutz-k085e7KyjHPoROC4u9Kr67iGU3o-7Iw_6Rq8r7mF6U5h2N3hyFSjdZ0M286x6e-vYUyzXfvZfe7wb3udk9FPC4QLEmHQRKZrNfFcxJsm05QA/s1665/ChatGPT%20Image%20Oct%202,%202026,%2008_14_05%20PM%20%281%29.png",
  TTD_DIREKTUR_LOCAL: "/assets/TTD_Direktur.png",
  STEMPEL: "/assets/WIC_Honorarium_Payment_Seal.png",
  STEMPEL_ONLINE: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhIAenQoxE5WYyeks4k6VbEfLRP_yO4Qp5Ldykwz7FHveweTsK0zjpkWk4Rfpmx_oBdB3NyKGZSiKPga0otvo-6ziPlP1LHzETgV7szG-0FzmF1N2iZq7uEgtfzA6laZpKWZ2FITCJrC4Gup18Uw93fvOjkFHDNB6mQ_zVxEaaIF6bRbWemYnqjKUXH8Yk/s1254/WIC%20Honorarium%20Payment%20Seal.png",
  STEMPEL_LOCAL: "/assets/WIC_Honorarium_Payment_Seal.png",
  ECARD_BG: "https://iili.io/BQ1lsNs.md.png",
  INVOICE_BG: "https://iili.io/BQ7rOfn.md.png"
};

// Kategori Program Resmi WIC (Tahsin & Tahfidz telah disatukan menjadi 1 program)
export const WIC_PROGRAM_CATEGORIES = [
  "Preschool", 
  "Beginner", 
  "Kids", 
  "Teenager", 
  "Adult", 
  "Tahsin & Tahfidz"
];

export const WIC_LEVELS = [
  "Preschool", 
  "Beginner", 
  "Kids", 
  "Teenager", 
  "Adult", 
  "Tahsin & Tahfidz", 
  "Private", 
  "Semi Private"
];

export const WIC_DAYS = ["Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
export const WIC_SHIFTS = [
  "08.00 – 09.30", 
  "09.30 – 11.00", 
  "13.00 – 14.30", 
  "14.30 – 16.00", 
  "16.15 – 17.45", 
  "Online Siang", 
  "Online Malam"
];

// Surat-surat Al-Quran untuk Jurnal & Setoran Tahsin & Tahfidz
export const POPULAR_TAHSIN_SURAHS = [
  "An-Naba'", "An-Nazi'at", "'Abasa", "At-Takwir", "Al-Infitar", 
  "Al-Muthaffifin", "Al-Insyiqaq", "Al-Buruj", "Ath-Thariq", "Al-A'la", 
  "Al-Ghasyiyah", "Al-Fajr", "Al-Balad", "Asy-Syams", "Al-Lail", 
  "Adh-Dhuha", "Asy-Syarh", "At-Tin", "Al-'Alaq", "Al-Qadr", 
  "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat", "Al-Qari'ah", "At-Takatsur", 
  "Al-'Ashr", "Al-Humazah", "Al-Fil", "Quraisy", "Al-Ma'un", 
  "Al-Kautsar", "Al-Kafirun", "An-Nashr", "Al-Lahab", "Al-Ikhlas", 
  "Al-Falaq", "An-Nas", "Al-Mulk", "Ar-Rahman", "Al-Waqi'ah", "Yasin", "Al-Kahfi", "Al-Fatihah"
];

export const ALL_QURAN_SURAHS = [
  "1. Al-Fatihah", "2. Al-Baqarah", "3. Ali 'Imran", "4. An-Nisa'", "5. Al-Ma'idah",
  "6. Al-An'am", "7. Al-A'raf", "8. Al-Anfal", "9. At-Taubah", "10. Yunus",
  "11. Hud", "12. Yusuf", "13. Ar-Ra'd", "14. Ibrahim", "15. Al-Hijr",
  "16. An-Nahl", "17. Al-Isra'", "18. Al-Kahfi", "19. Maryam", "20. Thaha",
  "21. Al-Anbiya'", "22. Al-Hajj", "23. Al-Mu'minun", "24. An-Nur", "25. Al-Furqan",
  "26. Asy-Syu'ara'", "27. An-Naml", "28. Al-Qashash", "29. Al-'Ankabut", "30. Ar-Rum",
  "31. Luqman", "32. As-Sajdah", "33. Al-Ahzab", "34. Saba'", "35. Fathir",
  "36. Yasin", "37. Ash-Shaffat", "38. Shad", "39. Az-Zumar", "40. Ghafir",
  "41. Fushshilat", "42. Asy-Syura", "43. Az-Zukhruf", "44. Ad-Dukhan", "45. Al-Jatsiyah",
  "46. Al-Ahqaf", "47. Muhammad", "48. Al-Fath", "49. Al-Hujurat", "50. Qaf",
  "51. Adz-Dzariyat", "52. Ath-Thur", "53. An-Najm", "54. Al-Qamar", "55. Ar-Rahman",
  "56. Al-Waqi'ah", "57. Al-Hadid", "58. Al-Mujadilah", "59. Al-Hasyr", "60. Al-Mumtahanah",
  "61. Ash-Shaff", "62. Al-Jumu'ah", "63. Al-Munafiqun", "64. At-Taghabun", "65. Ath-Thalaq",
  "66. At-Tahrim", "67. Al-Mulk", "68. Al-Qalam", "69. Al-Haqqah", "70. Al-Ma'arij",
  "71. Nuh", "72. Al-Jinn", "73. Al-Muzzammil", "74. Al-Muddatstsir", "75. Al-Qiyamah",
  "76. Al-Insan", "77. Al-Mursalat", "78. An-Naba'", "79. An-Nazi'at", "80. 'Abasa",
  "81. At-Takwir", "82. Al-Infitar", "83. Al-Muthaffifin", "84. Al-Insyiqaq", "85. Al-Buruj",
  "86. Ath-Thariq", "87. Al-A'la", "88. Al-Ghasyiyah", "89. Al-Fajr", "90. Al-Balad",
  "91. Asy-Syams", "92. Al-Lail", "93. Adh-Dhuha", "94. Asy-Syarh", "95. At-Tin",
  "96. Al-'Alaq", "97. Al-Qadr", "98. Al-Bayyinah", "99. Az-Zalzalah", "100. Al-'Adiyat",
  "101. Al-Qari'ah", "102. At-Takatsur", "103. Al-'Ashr", "104. Al-Humazah", "105. Al-Fil",
  "106. Quraisy", "107. Al-Ma'un", "108. Al-Kautsar", "109. Al-Kafirun", "110. An-Nashr",
  "111. Al-Lahab", "112. Al-Ikhlas", "113. Al-Falaq", "114. An-Nas"
];

// Baseline defaults with Private (-10% fee Mandiri) and Semi Private
export const DEFAULT_HONOR_RATES: HonorRateItem[] = [
  { id: 'probation', name: "Probation", mandiri: 25000, team: 20000, private: 22500, semi_private: 25000 },
  { id: 'active_under_1', name: "Active < 1th", mandiri: 27500, team: 22500, private: 24750, semi_private: 27500 },
  { id: 'active_1_3', name: "Active 1-3th", mandiri: 30000, team: 25000, private: 27000, semi_private: 30000 },
  { id: 'senior_cert', name: "Senior Tersertifikasi", mandiri: 35000, team: 30000, private: 31500, semi_private: 35000 },
  { id: 'senior_cert_degree', name: "Senior Tersertifikasi dan Berijazah", mandiri: 40000, team: 35000, private: 36000, semi_private: 40000 }
];

// Fallback lookup object for compatibility
export const HONOR_RATES = DEFAULT_HONOR_RATES.reduce((acc, item) => {
  acc[item.name] = { 
    mandiri: item.mandiri, 
    team: item.team, 
    private: item.private || Math.round(item.mandiri * 0.9),
    semi_private: item.semi_private || item.mandiri
  };
  return acc;
}, {} as Record<string, { mandiri: number; team: number; private: number; semi_private: number }>);

export type TutorStatus = string;

export const PRESET_MODULE_COVERS = [
  {
    id: 'preschool_1',
    name: 'Preschool Fun Play',
    level: 'Preschool',
    url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'preschool_2',
    name: 'Phonics & Alphabet',
    level: 'Preschool',
    url: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'beginner_1',
    name: 'Basic English Start',
    level: 'Beginner',
    url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'beginner_2',
    name: 'Vocabulary Explorer',
    level: 'Beginner',
    url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'kids_1',
    name: 'Kids Story & Grammar',
    level: 'Kids',
    url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'kids_2',
    name: 'Creative Writers',
    level: 'Kids',
    url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'teen_1',
    name: 'Teen Conversation Club',
    level: 'Teenager',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'teen_2',
    name: 'Academic English Prep',
    level: 'Teenager',
    url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'adult_1',
    name: 'Business English & Career',
    level: 'Adult',
    url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'adult_2',
    name: 'Professional Speaking & TOEFL',
    level: 'Adult',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'tahsin_1',
    name: 'Tahsin & Makharijul Huruf',
    level: 'Tahsin & Tahfidz',
    url: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'tahfidz_1',
    name: 'Tahfidz Juz Amma & Tartil',
    level: 'Tahsin & Tahfidz',
    url: 'https://images.unsplash.com/photo-1584286595398-a59f21d313f5?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'tahsin_tahfidz_combo',
    name: 'Tahsin & Tahfidz Terpadu',
    level: 'Tahsin & Tahfidz',
    url: 'https://images.unsplash.com/photo-1590076215667-875d4ef2d7ee?auto=format&fit=crop&w=800&q=80'
  }
];

export const DEFAULT_TEACHING_MODULES: TeachingModule[] = [];

export const DEFAULT_PROJECT_CLASSIFICATIONS: ProjectClassification[] = [
  {
    id: 'modul',
    name: 'Modul',
    badgeColor: 'from-blue-600 to-indigo-700',
    description: 'Penyusunan modul ajar baru, pembaruan silabus bab, dan pembuatan paket worksheet.',
    items: [
      { id: 'm-1', name: 'Pembuatan Modul Ajar Baru', defaultFee: 50000, description: 'Modul pembelajaran lengkap dengan silabus & panduan tutor' },
      { id: 'm-2', name: 'Revisi & Update Silabus Bab Modul', defaultFee: 35000, description: 'Pembaruan materi bab atau latihan soal' },
      { id: 'm-3', name: 'Penyusunan Lembar Kerja Siswa (Worksheet)', defaultFee: 25000, description: 'Paket worksheet tematik per level' }
    ]
  },
  {
    id: 'content',
    name: 'Content',
    badgeColor: 'from-pink-500 to-rose-600',
    description: 'Produksi video pembelajaran medsos, infografis feed Canva, dan artikel edukasi.',
    items: [
      { id: 'c-1', name: 'Video Reels / TikTok Pembelajaran', defaultFee: 40000, description: 'Video edukasi singkat 30-90 detik terkonsep' },
      { id: 'c-2', name: 'Desain Feed / Carousel Edukasi Canva', defaultFee: 30000, description: 'Carousel infografis tata bahasa / tips belajar' },
      { id: 'c-3', name: 'Penulisan Artikel / Naskah Edukasi', defaultFee: 25000, description: 'Artikel website / broadcast informatif' }
    ]
  },
  {
    id: 'event',
    name: 'Event',
    badgeColor: 'from-amber-500 to-orange-600',
    description: 'Kepanitiaan lomba (Spelling Bee), workshop parenting, dan pengawasan tryout akbar.',
    items: [
      { id: 'e-1', name: 'Panitia / Juri Spelling Bee & Lomba', defaultFee: 75000, description: 'Pelaksanaan teknis kompetisi dan penilaian siswa' },
      { id: 'e-2', name: 'Fasilitator Workshop / Parenting Talk', defaultFee: 100000, description: 'Pemateri atau pemandu sesi workshop interaktif' },
      { id: 'e-3', name: 'Pengawas Tryout / Simulasi Ujian Akbar', defaultFee: 50000, description: 'Pengawasan dan rekap hasil tes peserta' }
    ]
  },
  {
    id: 'sekolah',
    name: 'Sekolah',
    badgeColor: 'from-emerald-600 to-teal-700',
    description: 'Program kemitraan institusi sekolah, roadshow promosi, dan ekstrakurikuler mitra.',
    items: [
      { id: 's-1', name: 'Kunjungan Kemitraan & Roadshow Sekolah', defaultFee: 60000, description: 'Presentasi dan pendampingan di institusi mitra' },
      { id: 's-2', name: 'Pelaksanaan Diagnostic & Placement Test Sekolah', defaultFee: 45000, description: 'Tes pemetaan level siswa di sekolah mitra' },
      { id: 's-3', name: 'Pengajar Ekstrakurikuler Khusus Sekolah', defaultFee: 50000, description: 'Sesi program khusus di luar jadwal reguler WIC' }
    ]
  }
];
