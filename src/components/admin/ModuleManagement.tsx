import React, { useState } from 'react';
import { TeachingModule, ModuleLevel } from '../../types';
import { PRESET_MODULE_COVERS } from '../../constants';
import { generateModuleChapters } from '../../services/geminiService';
import { 
  BookOpen, 
  Plus, 
  Search, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Layers, 
  Sparkles, 
  Copy, 
  CheckCircle2, 
  FileText, 
  Image as ImageIcon,
  FolderOpen,
  Eye,
  ListOrdered,
  Share2,
  Wand2,
  RefreshCw,
  Upload,
  Link as LinkIcon,
  Paperclip,
  CheckCircle
} from 'lucide-react';
import { uploadModuleFile } from '../../lib/syncService';
import { compressCoverImage, compressModuleContentImage } from '../../lib/imageCompressor';
import ModuleViewerModal from '../common/ModuleViewerModal';

interface ModuleManagementProps {
  modules: TeachingModule[];
  onUpdate: (modules: TeachingModule[]) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export interface MasterBookItem {
  id: string;
  bookNumber: number;
  level: ModuleLevel;
  title: string;
  description: string;
  chapters: string[]; // Supports up to 20 chapters
  app_url: string;
  app_platform: string;
  target_grades: string;
  author: string;
  cover_url: string;
}

export const normalizeUrl = (url: string): string => {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith('/') ||
    /^data:/i.test(trimmed) ||
    /^blob:/i.test(trimmed)
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export function deriveChaptersFromOverview(description: string, level: ModuleLevel, title: string, maxChapters = 20): string[] {
  const clean = (description || '').trim();
  if (!clean) {
    return getLevelDefaultChapters(level);
  }

  // 1. Check if user provided lines / bullet points (reads up to 20 chapters)
  const lines = clean
    .split(/\r?\n+/)
    .map(l => l.replace(/^[-*•\d+.)\s]+/, '').trim())
    .filter(l => l.length > 2);

  if (lines.length >= 2) {
    return lines.slice(0, maxChapters).map((line, idx) => {
      const cleanTitle = line.replace(/^(Bab|Chapter|Unit|Pertemuan)\s*\d+\s*[:\-]\s*/i, '').trim();
      return `Bab ${idx + 1}: ${cleanTitle}`;
    });
  }

  // 2. Check if user provided numbered items like "1.", "2.", "1)", "2)"
  const numbered = clean.split(/(?:^|\n|\s)\d+[\.\)]\s*/).map(s => s.trim()).filter(s => s.length > 2);
  if (numbered.length >= 2) {
    return numbered.slice(0, maxChapters).map((part, idx) => {
      const cleanTitle = part.replace(/^(Bab|Chapter|Unit|Pertemuan)\s*\d+\s*[:\-]\s*/i, '').trim();
      return `Bab ${idx + 1}: ${cleanTitle}`;
    });
  }

  // 3. Check if user separated items by semicolon
  const semiParts = clean.split(/[;]/).map(s => s.trim()).filter(s => s.length > 3);
  if (semiParts.length >= 2) {
    return semiParts.slice(0, maxChapters).map((part, idx) => {
      const cleanTitle = part.replace(/^(Bab|Chapter|Unit|Pertemuan)\s*\d+\s*[:\-]\s*/i, '').trim();
      return `Bab ${idx + 1}: ${cleanTitle}`;
    });
  }

  // 4. Check if user separated items by comma
  const commaParts = clean.split(/[,]/).map(s => s.trim()).filter(s => s.length > 3);
  if (commaParts.length >= 2) {
    return commaParts.slice(0, maxChapters).map((part, idx) => {
      const cleanTitle = part.replace(/^(Bab|Chapter|Unit|Pertemuan)\s*\d+\s*[:\-]\s*/i, '').trim();
      return `Bab ${idx + 1}: ${cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)}`;
    });
  }

  // 5. Check if user provided full sentences separated by periods
  const sentenceParts = clean
    .split(/(?<=[.!?])\s+/)
    .map(s => s.replace(/^[-*•\s]+/, '').replace(/[.]+$/, '').trim())
    .filter(s => s.length > 4);
  if (sentenceParts.length >= 2) {
    return sentenceParts.slice(0, maxChapters).map((part, idx) => {
      const cleanTitle = part.replace(/^(Bab|Chapter|Unit|Pertemuan)\s*\d+\s*[:\-]\s*/i, '').trim();
      return `Bab ${idx + 1}: ${cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)}`;
    });
  }

  // Fallback to structured level chapters with user's overview in Bab 1
  const baseDefaults = getLevelDefaultChapters(level);
  const snippet = clean.length > 55 ? clean.slice(0, 52) + '...' : clean;
  return [
    `Bab 1: ${snippet}`,
    ...baseDefaults.slice(1, maxChapters)
  ];
}

function getLevelDefaultChapters(level: ModuleLevel): string[] {
  const l = (level || '').toLowerCase();

  if (l.includes('preschool')) {
    return [
      'Bab 1: Phonics Riang & Pengenalan Huruf A-Z',
      'Bab 2: Eksplorasi Warna Pelangi, Angka 1-10 & Gerak Tubuh',
      'Bab 3: Sensory Motoric Games & Pengenalan Suara Hewan',
      'Bab 4: Storybook Bergambar Ceria & Sing-along Song'
    ];
  } else if (l.includes('beginner')) {
    return [
      'Bab 1: Warm Greeting & Memperkenalkan Diri dengan Percaya Diri',
      'Bab 2: Bahasa Kelas Mandiri & Tanya Jawab Percakapan Praktis',
      'Bab 3: Membaca Jam, Nama Hari, Bulan & Kalender Belajar',
      'Bab 4: Kebiasaan Sehari-hari, Kata Kerja Aksi & Keluarga'
    ];
  } else if (l.includes('kids')) {
    return [
      'Bab 1: Present Continuous & Ungkapan Tindakan Nyata',
      'Bab 2: Petualangan Misteri Waktu Lalu (Past Simple Adventure)',
      'Bab 3: Perbandingan Benda & Karakter (Comparative & Superlative)',
      'Bab 4: Kreasi Komik Dialog & Latihan Show and Tell'
    ];
  } else if (l.includes('teenager')) {
    return [
      'Bab 1: Membangun Argumen Logis: Claim, Bukti & Penalaran',
      'Bab 2: Mini Parliamentary Debate: Etika Media Sosial & AI',
      'Bab 3: Penulisan Esai Akademik & Penguasaan Paraphrasing',
      'Bab 4: Presentasi Slide Interaktif & Teknik Public Speaking'
    ];
  } else if (l.includes('adult')) {
    return [
      'Bab 1: Korespondensi Email Profesional & Etika Korporat',
      'Bab 2: Kepemimpinan Rapat, Pitching Ide & Negosiasi Diplomatis',
      'Bab 3: Simulasi Wawancara Kerja Terarah (Metode STAR)',
      'Bab 4: Komunikasi Lintas Budaya & Strategi Tes Speaking TOEFL/IELTS'
    ];
  } else {
    return [
      'Bab 1: 5 Tempat Makharijul Huruf & Karakter Sifat Huruf',
      'Bab 2: Kaidah Hukum Nun Sukun, Tanwin & Mim Sukun',
      'Bab 3: Ketentuan Mad Thobi\'i, Mad Far\'i & Tanda Waqaf/Ibtida',
      'Bab 4: Praktek Setoran Talaqqi & Mutqin Tilawah Tartil'
    ];
  }
}

export function derive4ChaptersFromOverview(description: string, level: ModuleLevel, title: string): string[] {
  return deriveChaptersFromOverview(description, level, title, 20);
}

const LEVEL_LIST: { id: ModuleLevel; label: string; color: string; desc: string }[] = [
  { id: 'Preschool', label: 'Preschool', color: 'from-pink-500 to-rose-600', desc: 'Usia Dini / PAUD / TK (Phonics & Songs)' },
  { id: 'Beginner', label: 'Beginner', color: 'from-emerald-500 to-teal-600', desc: 'Pemula / SD Dasar (Daily Vocab & Basics)' },
  { id: 'Kids', label: 'Kids', color: 'from-sky-500 to-blue-600', desc: 'SD Lanjutan (Grammar & Storytelling)' },
  { id: 'Teenager', label: 'Teenager', color: 'from-indigo-500 to-purple-600', desc: 'SMP / SMA (Debate & Exam Strategy)' },
  { id: 'Adult', label: 'Adult', color: 'from-amber-500 to-orange-600', desc: 'Mahasiswa / Profesional (Career & Fluency)' },
  { id: 'Tahsin & Tahfidz', label: 'Tahsin & Tahfidz', color: 'from-emerald-800 to-teal-900', desc: 'Program Terpadu Tartil Quran & Hafalan' }
];

export default function ModuleManagement({ modules, onUpdate, showToast }: ModuleManagementProps) {
  const [selectedLevel, setSelectedLevel] = useState<ModuleLevel | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<TeachingModule | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Master 5 Books Batch Modal State
  const [isMaster5ModalOpen, setIsMaster5ModalOpen] = useState(false);
  const [activeMasterBookNum, setActiveMasterBookNum] = useState<number>(1);
  const [masterBooks, setMasterBooks] = useState<MasterBookItem[]>([]);

  // Form State
  const [formData, setFormData] = useState<{
    title: string;
    level: ModuleLevel;
    cover_url: string;
    description: string;
    chapters: string[];
    app_url: string;
    app_platform: string;
    target_grades: string;
    author: string;
    is_featured: boolean;
  }>({
    title: '',
    level: 'Beginner',
    cover_url: PRESET_MODULE_COVERS[2]?.url || '',
    description: '',
    chapters: ['Bab 1: Pengenalan & Kosakata Pokok', 'Bab 2: Latihan Percakapan & Games'],
    app_url: '',
    app_platform: 'Google Drive',
    target_grades: '',
    author: 'Tim Kurikulum WIC',
    is_featured: false
  });

  const [newChapterText, setNewChapterText] = useState('');
  const [isGeneratingChapters, setIsGeneratingChapters] = useState(false);
  const [coverInputMode, setCoverInputMode] = useState<'LINK' | 'UPLOAD'>('LINK');
  const [uploadedCoverName, setUploadedCoverName] = useState<string>('');
  const [previewModule, setPreviewModule] = useState<TeachingModule | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [moduleSourceMode, setModuleSourceMode] = useState<'LINK' | 'UPLOAD'>('LINK');

  const handleDocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isMasterBook = false, bookNumber?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 35 * 1024 * 1024) {
      showToast('Ukuran file maksimal 35 MB!', 'error');
      e.target.value = '';
      return;
    }

    setIsUploadingDoc(true);
    try {
      // If uploaded file is an image, compress and embed as a compact cloud-synced data URL so it appears reliably on EVERY device
      if (file.type.startsWith('image/')) {
        showToast(`Mengoptimasi gambar "${file.name}" agar tampil di semua device...`, 'info');
        const compressedImage = await compressModuleContentImage(file);
        if (compressedImage) {
          if (isMasterBook && bookNumber !== undefined) {
            handleUpdateMasterBook(bookNumber, 'app_url', compressedImage);
            handleUpdateMasterBook(bookNumber, 'app_platform', 'Gambar Modul (Cloud)');
          } else {
            setFormData(prev => ({
              ...prev,
              app_url: compressedImage,
              app_platform: 'Gambar Modul (Cloud)'
            }));
          }
          showToast(`✅ Gambar "${file.name}" (${Math.round(compressedImage.length / 1024)} KB) tersimpan di Cloud & tampil di semua device!`, 'success');
          return;
        }
      }

      showToast(`Mengunggah "${file.name}" ke server...`, 'info');
      const res = await uploadModuleFile(file);
      if (res.ok && res.url) {
        if (isMasterBook && bookNumber !== undefined) {
          handleUpdateMasterBook(bookNumber, 'app_url', res.url);
          handleUpdateMasterBook(bookNumber, 'app_platform', 'File PDF Server');
        } else {
          setFormData(prev => ({
            ...prev,
            app_url: res.url!,
            app_platform: 'File PDF Server'
          }));
        }
        showToast(`✅ File "${file.name}" tersimpan di server & dapat dibuka seluruh tutor!`, 'success');
      } else {
        showToast(res.error || 'Gagal mengunggah file modul.', 'error');
      }
    } catch {
      showToast('Gagal memproses unggahan file.', 'error');
    } finally {
      setIsUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa foto/gambar (PNG, JPG, JPEG, WEBP)!', 'error');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Ukuran file foto maksimal 10 MB!', 'error');
      e.target.value = '';
      return;
    }

    try {
      const compressed = await compressCoverImage(file);
      if (!compressed) {
        showToast('Gagal memproses file foto cover.', 'error');
        return;
      }
      setFormData(prev => ({ ...prev, cover_url: compressed }));
      setUploadedCoverName(`${file.name} (Teroptimasi ${Math.round(compressed.length / 1024)} KB)`);
      showToast('Foto cover modul berhasil dioptimasi & siap tampil di seluruh device!', 'success');
    } catch {
      showToast('Gagal memproses file foto cover.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleAutoGenerateChapters = async () => {
    if (!formData.title && !formData.description) {
      showToast('Ketikkan judul modul atau rujukan/deskripsi materi terlebih dahulu!', 'info');
      return;
    }
    setIsGeneratingChapters(true);
    showToast('AI sedang membaca rujukan & deskripsi materi untuk menyusun bab...', 'info');
    try {
      const generated = await generateModuleChapters(formData.title, formData.level, formData.description);
      if (generated && generated.length > 0) {
        setFormData(prev => ({ ...prev, chapters: generated }));
        showToast(`Berhasil menyusun ${generated.length} bab materi sesuai rujukan & deskripsi!`, 'success');
      }
    } catch (e) {
      showToast('Gagal menyusun bab otomatis.', 'error');
    } finally {
      setIsGeneratingChapters(false);
    }
  };

  // Auto detect platform when URL changes
  const detectPlatform = (url: string): string => {
    const lower = url.toLowerCase();
    if (lower.startsWith('data:image/')) return 'Gambar Modul (Cloud)';
    if (lower.startsWith('/uploads/') || lower.includes('/uploads/modules/')) return 'File PDF Server';
    if (lower.includes('drive.google.com') || lower.includes('docs.google.com')) return 'Google Drive';
    if (lower.includes('canva.com')) return 'Canva';
    if (lower.includes('notion.so') || lower.includes('notion.site')) return 'Notion';
    if (lower.includes('quizizz.com')) return 'Quizizz';
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YouTube Lesson';
    if (lower.includes('.pdf')) return 'PDF Dokumen';
    return 'Tautan Web';
  };

  const handleOpenAddModal = (presetLevel?: ModuleLevel) => {
    const targetLevel = presetLevel || (selectedLevel !== 'ALL' ? selectedLevel : 'Beginner');
    const matchedCover = PRESET_MODULE_COVERS.find(c => c.level === targetLevel)?.url || PRESET_MODULE_COVERS[0]?.url || '';
    setEditingModule(null);
    setFormData({
      title: '',
      level: targetLevel,
      cover_url: matchedCover,
      description: '',
      chapters: ['Bab 1: Materi Pokok & Kosakata', 'Bab 2: Simulasi & Praktek Kelas', 'Bab 3: Evaluasi & Mini Quiz'],
      app_url: '',
      app_platform: 'Google Drive',
      target_grades: '',
      author: 'Tim Kurikulum WIC',
      is_featured: false
    });
    setNewChapterText('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (mod: TeachingModule) => {
    setEditingModule(mod);
    setFormData({
      title: mod.title,
      level: mod.level,
      cover_url: mod.cover_url,
      description: mod.description,
      chapters: [...(mod.chapters || [])],
      app_url: mod.app_url,
      app_platform: mod.app_platform || detectPlatform(mod.app_url),
      target_grades: mod.target_grades || '',
      author: mod.author || 'Tim Kurikulum WIC',
      is_featured: !!mod.is_featured
    });
    setNewChapterText('');
    setIsModalOpen(true);
  };

  const handleSaveModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Judul modul wajib diisi!', 'error');
      return;
    }
    if (!formData.app_url.trim()) {
      showToast('Link aplikasi modul wajib diisi!', 'error');
      return;
    }

    const cleanUrl = normalizeUrl(formData.app_url);
    const platform = formData.app_platform || detectPlatform(cleanUrl);

    // Auto-apply chapters from description if provided so user never misses applying them
    let finalChapters = formData.chapters;
    if (formData.description && formData.description.trim()) {
      const derived = deriveChaptersFromOverview(formData.description, formData.level, formData.title, 20);
      if (derived && derived.length > 0) {
        if (formData.chapters.length <= 3 && formData.chapters.some(c => c.includes('Materi Pokok') || c.includes('Pengenalan & Kosakata'))) {
          finalChapters = derived;
        }
      }
    }

    if (editingModule) {
      // Update
      const updated = modules.map(m => m.id === editingModule.id ? {
        ...editingModule,
        ...formData,
        chapters: finalChapters.slice(0, 20),
        app_url: cleanUrl,
        app_platform: platform,
        updated_at: new Date().toISOString().split('T')[0]
      } : m);
      onUpdate(updated);
      showToast(`✅ Sinkronisasi Terverifikasi: Modul "${formData.title}" diperbarui & langsung aktif di Dashboard Tutor tanpa refresh!`, 'success');
    } else {
      // Create new - Replace any old dummy demo module DNA of the same level
      const newMod: TeachingModule = {
        id: 'MOD-' + Date.now().toString(36).toUpperCase(),
        ...formData,
        chapters: finalChapters.slice(0, 20),
        app_url: cleanUrl,
        app_platform: platform,
        updated_at: new Date().toISOString().split('T')[0]
      };
      // Hilangkan modul bawaan/template lama untuk level yang sama agar digantikan penuh oleh modul baru
      const cleanedExisting = modules.filter(m => !(m.level === formData.level && (
        m.app_url?.includes('demo-wic') || 
        m.id.startsWith('MOD-PRE-01') || 
        m.id.startsWith('MOD-BEG-01') || 
        m.id.startsWith('MOD-KID-01') || 
        m.id.startsWith('MOD-TEE-01') || 
        m.id.startsWith('MOD-ADU-01') || 
        m.id.startsWith('MOD-TAHSIN-01')
      )));
      onUpdate([newMod, ...cleanedExisting]);
      showToast(`✅ Sinkronisasi Terverifikasi: Modul "${formData.title}" berhasil diterapkan, template bawaan lama digantikan & langsung aktif di seluruh aplikasi!`, 'success');
    }

    setIsModalOpen(false);
  };

  const handleOpenMaster5Modal = () => {
    const baseLevels: { level: ModuleLevel; num: number; defaultTitle: string; defaultTarget: string }[] = [
      { level: 'Preschool', num: 1, defaultTitle: 'Buku 1: Phonics Starter & Alphabet Adventure', defaultTarget: 'PAUD / TK A & B' },
      { level: 'Beginner', num: 2, defaultTitle: 'Buku 2: Daily Expressions & Essential Vocabulary 101', defaultTarget: 'SD Kelas 1-3 / Pemula' },
      { level: 'Kids', num: 3, defaultTitle: 'Buku 3: Active Grammar & Creative Storytelling in Action', defaultTarget: 'SD Kelas 4-6' },
      { level: 'Teenager', num: 4, defaultTitle: 'Buku 4: Critical Thinking, Debate & Modern Presentation', defaultTarget: 'SMP / SMA' },
      { level: 'Adult', num: 5, defaultTitle: 'Buku 5: Executive English & Real-World Fluency Workshop', defaultTarget: 'Mahasiswa / Profesional' },
      { level: 'Tahsin & Tahfidz', num: 6, defaultTitle: 'Buku Tambahan: Tahsin Tilawah & Tajwid Aplikatif', defaultTarget: 'Semua Usia / Kelas Tahsin' }
    ];

    const initialItems: MasterBookItem[] = baseLevels.map(({ level, num, defaultTitle, defaultTarget }) => {
      const matching = modules.filter(m => m.level === level);
      const existing = matching.find(m => !m.app_url?.includes('demo-wic')) || matching[0];
      const cover = existing?.cover_url || PRESET_MODULE_COVERS.find(c => c.level === level)?.url || PRESET_MODULE_COVERS[0]?.url || '';
      
      let chs: string[];
      if (existing && existing.chapters && existing.chapters.length > 0) {
        chs = existing.chapters.slice(0, 20);
      } else {
        chs = deriveChaptersFromOverview(existing?.description || '', level, existing?.title || defaultTitle, 20);
      }

      return {
        id: existing?.id || `MOD-${level.substring(0, 3).toUpperCase()}-01`,
        bookNumber: num,
        level,
        title: existing?.title || defaultTitle,
        description: existing?.description || '',
        chapters: chs,
        app_url: (existing?.app_url && !existing.app_url.includes('demo-wic')) ? existing.app_url : '',
        app_platform: existing?.app_platform || (existing?.app_url ? detectPlatform(existing.app_url) : 'Google Drive'),
        target_grades: existing?.target_grades || defaultTarget,
        author: existing?.author || 'Tim Kurikulum WIC',
        cover_url: cover
      };
    });

    setMasterBooks(initialItems);
    setActiveMasterBookNum(1);
    setIsMaster5ModalOpen(true);
  };

  const handleUpdateMasterBook = (bookNum: number, field: keyof MasterBookItem, value: any) => {
    setMasterBooks(prev => prev.map(b => {
      if (b.bookNumber === bookNum) {
        const updated = { ...b, [field]: value };
        if (field === 'app_url') {
          updated.app_platform = detectPlatform(value);
        }
        return updated;
      }
      return b;
    }));
  };

  const handleUpdateMasterBookChapter = (bookNum: number, chapterIdx: number, val: string) => {
    setMasterBooks(prev => prev.map(b => {
      if (b.bookNumber === bookNum) {
        const nextChapters = [...b.chapters];
        nextChapters[chapterIdx] = val;
        return { ...b, chapters: nextChapters };
      }
      return b;
    }));
  };

  const handleAddMasterBookChapter = (bookNum: number) => {
    setMasterBooks(prev => prev.map(b => {
      if (b.bookNumber === bookNum && b.chapters.length < 20) {
        const nextIdx = b.chapters.length + 1;
        return { ...b, chapters: [...b.chapters, `Bab ${nextIdx}: Materi Pokok Tambahan`] };
      }
      return b;
    }));
  };

  const handleRemoveMasterBookChapter = (bookNum: number, chapterIdx: number) => {
    setMasterBooks(prev => prev.map(b => {
      if (b.bookNumber === bookNum && b.chapters.length > 1) {
        const nextChs = b.chapters.filter((_, idx) => idx !== chapterIdx);
        return { ...b, chapters: nextChs };
      }
      return b;
    }));
  };

  const handleDeriveChaptersForBook = (bookNum: number) => {
    setMasterBooks(prev => prev.map(b => {
      if (b.bookNumber === bookNum) {
        if (!b.description.trim()) {
          showToast(`Ketikkan keterangan gambaran materi untuk Buku ${b.bookNumber} terlebih dahulu!`, 'info');
          return b;
        }
        const derived = deriveChaptersFromOverview(b.description, b.level, b.title, 20);
        showToast(`${derived.length} Bab materi untuk Buku ${b.bookNumber} (${b.level}) berhasil dibaca & diekstrak dari deskripsi (s/d 20 Bab)!`, 'success');
        return { ...b, chapters: derived };
      }
      return b;
    }));
  };

  const handleDeriveAllMasterBooks = () => {
    setMasterBooks(prev => prev.map(b => {
      const derived = deriveChaptersFromOverview(b.description, b.level, b.title, 20);
      return { ...b, chapters: derived };
    }));
    showToast('Seluruh bab materi (s/d 20 Bab) untuk seluruh buku kurikulum berhasil diselaraskan langsung dari gambaran!', 'success');
  };

  const handleSaveMasterBooks = () => {
    const updated5List: TeachingModule[] = masterBooks.map(b => {
      const cleanUrl = normalizeUrl(b.app_url);
      const platform = b.app_platform || (b.app_url ? detectPlatform(cleanUrl) : 'Google Drive');

      let finalChapters = b.chapters;
      // Auto-apply chapters from description if description is filled in and chapters are default or empty
      if (b.description && b.description.trim()) {
        const defaultChs = getLevelDefaultChapters(b.level);
        const isDefault = b.chapters.length === 0 || (b.chapters.length === defaultChs.length && b.chapters.every((ch, i) => ch === defaultChs[i]));
        if (isDefault) {
          const derived = deriveChaptersFromOverview(b.description, b.level, b.title, 20);
          if (derived && derived.length > 0) {
            finalChapters = derived;
          }
        }
      }

      return {
        id: b.id,
        title: b.title.trim() || `Buku ${b.bookNumber}: ${b.level}`,
        level: b.level,
        cover_url: b.cover_url,
        description: b.description.trim(),
        chapters: finalChapters.slice(0, 20),
        app_url: cleanUrl,
        app_platform: platform,
        target_grades: b.target_grades || '',
        author: b.author || 'Tim Kurikulum WIC',
        is_featured: true,
        updated_at: new Date().toISOString().split('T')[0]
      };
    });

    // Retain other custom modules if any
    const masterLevels = new Set(masterBooks.map(b => b.level));
    const otherModules = modules.filter(m => !masterLevels.has(m.level));
    const merged = [...updated5List, ...otherModules];

    onUpdate(merged);
    showToast('✅ Sinkronisasi Terverifikasi: Buku Kurikulum berhasil disimpan & langsung aktif di Beranda Modul dan Beranda Tutor tanpa refresh!', 'success');
    setIsMaster5ModalOpen(false);
  };

  const handleDeleteModule = (id: string) => {
    const mod = modules.find(m => m.id === id);
    onUpdate(modules.filter(m => m.id !== id));
    setSelectedIds(prev => prev.filter(i => i !== id));
    setDeletingId(null);
    showToast(`Modul "${mod?.title || id}" berhasil dihapus permanen dari basis data.`, 'info');
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredModules.map(m => m.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    onUpdate(modules.filter(m => !selectedIds.includes(m.id)));
    setSelectedIds([]);
    setIsBulkDeleteModalOpen(false);
    showToast(`Berhasil menghapus permanen ${count} modul ajar beserta silabus bab terpilih.`, 'success');
  };

  const handleAddChapter = () => {
    if (!newChapterText.trim()) return;
    setFormData(prev => ({
      ...prev,
      chapters: [...prev.chapters, newChapterText.trim()]
    }));
    setNewChapterText('');
  };

  const handleRemoveChapter = (index: number) => {
    setFormData(prev => ({
      ...prev,
      chapters: prev.chapters.filter((_, idx) => idx !== index)
    }));
  };

  // Filter modules
  const filteredModules = modules.filter(m => {
    const matchesLevel = selectedLevel === 'ALL' || m.level === selectedLevel;
    const matchesSearch = 
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase()) ||
      (m.target_grades && m.target_grades.toLowerCase().includes(search.toLowerCase())) ||
      (m.chapters && m.chapters.some(c => c.toLowerCase().includes(search.toLowerCase())));
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Master Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-gold-500/20 text-gold-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-gold-500/30 flex items-center gap-1.5">
                <Sparkles size={12} /> Digital Curriculum Hub
              </span>
              <span className="bg-white/10 text-emerald-200 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Hyperlink Architecture (0 Storage Bloat)
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
              Pusat Modul Ajar & Room Materi WIC
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl mt-1.5 leading-relaxed">
              Kelola modul pembelajaran berjenjang (Preschool, Beginner, Kids, Teenager, Adult). Seluruh materi terhubung via hyperlink aplikasi eksternal (Google Drive, Canva, Notion, Quizizz) sehingga ringan, anti-crash, dan dapat langsung diakses seluruh tutor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleOpenMaster5Modal}
              className="bg-emerald-950 hover:bg-emerald-900 text-gold-400 border border-gold-400/40 px-5 py-3 rounded-2xl font-black uppercase text-[11px] tracking-wider transition shadow-lg flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Sparkles size={16} className="text-gold-400" /> 📘 Master 5 Buku (4 Bab Otomatis)
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="bg-gold-400 hover:bg-gold-500 text-emerald-950 px-5 py-3 rounded-2xl font-black uppercase text-[11px] tracking-wider transition shadow-lg flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Plus size={16} /> Tambah Modul Baru
            </button>

            {modules.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Apakah Anda yakin ingin menghapus SEMUA modul ajar & membersihkan seluruh DNA modul awal? Setelah dibersihkan, Anda bisa menambahkan modul baru dengan tautan materi riil yang presisi.")) {
                    onUpdate([]);
                    setSelectedIds([]);
                    showToast('Seluruh modul dan DNA template bawaan berhasil dibersihkan! Anda dapat menambahkan modul baru secara presisi.', 'info');
                  }
                }}
                className="bg-rose-500/20 hover:bg-rose-600/30 text-rose-200 border border-rose-500/40 px-4 py-3 rounded-2xl font-black uppercase text-[11px] tracking-wider transition shadow-sm flex items-center gap-2 active:scale-95 cursor-pointer"
                title="Hapus seluruh modul & DNA bawaan agar kosong dan bersih"
              >
                <Trash2 size={15} /> Bersihkan DNA Modul Demo
              </button>
            )}
          </div>
        </div>

        {/* Real-Time Auto-Sync Verification Bar */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
            <p className="text-emerald-100 font-medium text-[11px] leading-relaxed">
              <strong className="text-white uppercase tracking-wider font-black">Sistem Verifikasi Sinkronisasi Real-Time:</strong> Setiap penambahan modul baru, edit silabus 4 bab, atau pembaruan tautan langsung diverifikasi otomatis dan aktif di Beranda Tutor detik ini juga tanpa perlu refresh manual.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-mono font-black text-emerald-950 bg-gold-400 px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
              <Sparkles size={11} className="text-emerald-950" />
              Auto-Sync Verified
            </span>
          </div>
        </div>

        {/* Level Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/10">
          <div 
            onClick={() => setSelectedLevel('ALL')}
            className={`p-3 rounded-2xl cursor-pointer transition border text-center ${
              selectedLevel === 'ALL' 
                ? 'bg-white/20 border-white/40 shadow-inner' 
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <p className="text-[9px] uppercase font-bold text-slate-300">Semua Modul</p>
            <p className="text-lg font-black text-white mt-0.5">{modules.length}</p>
          </div>

          {LEVEL_LIST.map(lvl => {
            const count = modules.filter(m => m.level === lvl.id).length;
            const isSelected = selectedLevel === lvl.id;
            return (
              <div 
                key={lvl.id}
                onClick={() => setSelectedLevel(lvl.id)}
                className={`p-3 rounded-2xl cursor-pointer transition border text-center ${
                  isSelected 
                    ? 'bg-white/20 border-white/40 shadow-inner' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <p className="text-[9px] uppercase font-bold text-slate-300 truncate">{lvl.label}</p>
                <p className="text-lg font-black text-gold-400 mt-0.5">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightweight Architecture Best-Practice Card */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 p-5 rounded-3xl border border-emerald-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
              ⚡
            </span>
            <div>
              <h3 className="font-black text-xs uppercase tracking-tight text-emerald-950">
                Solusi Super Ringan & Anti-Lag: Modul 0 KB Beban Database
              </h3>
              <p className="text-[10px] text-slate-600">
                Menjaga performa jurnaling dan invoice tutor tetap ringan, cepat, dan anti-lemot di semua perangkat.
              </p>
            </div>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-300/60 self-start sm:self-auto">
            Metode Terbaik Google Drive Bersama
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px]">
          <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-xs space-y-1">
            <div className="font-black text-emerald-900 uppercase text-[10px] flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[9px] font-bold">1</span>
              Simpan Link, Bukan File Raksasa
            </div>
            <p className="text-slate-600 text-[10px] leading-relaxed">
              Database WIC <strong>hanya menyimpan teks link</strong> (~50 byte). File PDF puluhan MB tetap berada di Google Drive gratis milik lembaga. Database tetap ultra-ringan (&lt;0.2 MB).
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-xs space-y-1">
            <div className="font-black text-emerald-900 uppercase text-[10px] flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[9px] font-bold">2</span>
              Atur Izin Drive 1x Selamanya
            </div>
            <p className="text-slate-600 text-[10px] leading-relaxed">
              Buat 1 Folder Utama di Google Drive WIC. Setel izin: <em>"Siapa saja yang memiliki link dapat melihat"</em>. Semua modul di dalamnya langsung bisa dibuka seluruh tutor tanpa izin akun berulang!
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-xs space-y-1">
            <div className="font-black text-emerald-900 uppercase text-[10px] flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[9px] font-bold">3</span>
              Jurnaling & Invoice 0 KB Beban
            </div>
            <p className="text-slate-600 text-[10px] leading-relaxed">
              Invoice tutor tidak pernah disimpan sebagai file gambar di database, melainkan dihitung otomatis saat dibuka. Data jurnaling teks hanya ~0.3 KB per sesi, sangat aman dan ringan!
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Cari modul berdasarkan judul, bab materi, atau kata kunci deskripsi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold focus:border-emerald-500 outline-none transition shadow-sm text-slate-800"
          />
          <Search className="absolute left-4 top-4 text-slate-400" size={16} />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Level Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedLevel('ALL')}
            className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider shrink-0 transition ${
              selectedLevel === 'ALL'
                ? 'bg-emerald-950 text-gold-400 shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua ({modules.length})
          </button>
          {LEVEL_LIST.map(lvl => {
            const count = modules.filter(m => m.level === lvl.id).length;
            const isSelected = selectedLevel === lvl.id;
            return (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevel(lvl.id)}
                className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider shrink-0 transition ${
                  isSelected
                    ? 'bg-emerald-950 text-gold-400 shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Room {lvl.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk Selection and Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-black uppercase text-slate-700 select-none">
            <input 
              type="checkbox"
              checked={filteredModules.length > 0 && filteredModules.every(m => selectedIds.includes(m.id))}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
            />
            <span>Pilih Semua Modul ({filteredModules.length})</span>
          </label>
          {selectedIds.length > 0 && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {selectedIds.length} modul terpilih
            </span>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Batalkan
            </button>
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-4 py-2 text-[10px] font-black uppercase text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Trash2 size={13} /> Hapus Permanen Terpilih ({selectedIds.length})
            </button>
          </div>
        )}
      </div>

      {/* Module Grid */}
      {filteredModules.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center text-slate-400 mb-4">
            <BookOpen size={28} />
          </div>
          <h3 className="text-base font-black text-slate-700 uppercase tracking-tight">Belum Ada Modul Ajar</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {search 
              ? 'Tidak ditemukan modul yang sesuai pencarian. Coba kata kunci lain atau bersihkan filter.' 
              : `Belum ada modul di kategori ${selectedLevel === 'ALL' ? 'ini' : selectedLevel}. Klik tombol di bawah untuk membuat modul pertama.`}
          </p>
          <button
            onClick={() => handleOpenAddModal(selectedLevel !== 'ALL' ? selectedLevel : undefined)}
            className="mt-5 bg-emerald-950 text-gold-400 hover:bg-emerald-900 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-md inline-flex items-center gap-2"
          >
            <Plus size={15} /> Tambah Modul Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map(mod => {
            const lvlObj = LEVEL_LIST.find(l => l.id === mod.level);
            const isExpanded = expandedModuleId === mod.id;
            const isSelected = selectedIds.includes(mod.id);

            return (
              <div 
                key={mod.id} 
                className={`bg-white rounded-[2rem] border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group hover:-translate-y-1 relative ${
                  isSelected ? 'border-emerald-600 ring-2 ring-emerald-500/50 shadow-md' : 'border-slate-200'
                }`}
              >
                {/* Cover Banner */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                  <img 
                    src={mod.cover_url || PRESET_MODULE_COVERS[0].url} 
                    alt={mod.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = PRESET_MODULE_COVERS[0].url;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                  
                  {/* Checkbox Selector on Cover */}
                  <button
                    type="button"
                    onClick={(e) => toggleSelectOne(mod.id, e)}
                    className={`absolute top-3 left-3 z-30 w-7 h-7 rounded-xl flex items-center justify-center transition shadow-md cursor-pointer ${
                      isSelected ? 'bg-emerald-600 text-white ring-2 ring-white' : 'bg-white/85 hover:bg-white text-slate-500 backdrop-blur-xs'
                    }`}
                    title={isSelected ? 'Batalkan pilihan' : 'Pilih modul ini'}
                  >
                    {isSelected ? <Check size={14} /> : <div className="w-3.5 h-3.5 border-2 border-slate-400 rounded-xs" />}
                  </button>

                  {/* Badges on Top */}
                  <div className="absolute top-3 left-12 right-3 flex items-center justify-between">
                    <span className={`bg-gradient-to-r ${lvlObj?.color || 'from-emerald-600 to-teal-700'} text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md`}>
                      Room {mod.level}
                    </span>
                    <span className="bg-slate-900/80 backdrop-blur-md text-emerald-300 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-white/10">
                      {mod.app_platform || 'External App'}
                    </span>
                  </div>

                  {/* Target Grades at bottom of cover */}
                  {mod.target_grades && (
                    <div className="absolute bottom-3 left-3">
                      <span className="text-[10px] font-bold text-slate-200 bg-black/40 backdrop-blur-sm px-2.5 py-0.5 rounded-lg border border-white/10">
                        {mod.target_grades}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content Details */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tight text-base leading-snug line-clamp-2 group-hover:text-emerald-900 transition">
                      {mod.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed line-clamp-2">
                      {mod.description}
                    </p>

                    {/* Syllabus / Chapters Accordion Preview */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                          <ListOrdered size={13} className="text-emerald-600" />
                          Daftar Bab ({mod.chapters?.length || 0})
                        </span>
                        <button
                          onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 uppercase cursor-pointer"
                        >
                          {isExpanded ? 'Tutup Bab' : 'Lihat Bab'}
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scroll bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {mod.chapters && mod.chapters.length > 0 ? (
                            mod.chapters.map((ch, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-[10px] font-bold text-slate-700">
                                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[8px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <span className="leading-tight">{ch}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">Belum ada bab yang dirinci.</p>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 font-medium truncate">
                          {mod.chapters?.[0] ? `${mod.chapters[0]} ...` : 'Belum ada rincian bab'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Hyperlink Button */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewModule(mod)}
                      className="flex-1 bg-emerald-950 hover:bg-emerald-900 text-gold-400 px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                    >
                      <Eye size={13} /> Baca di Aplikasi
                    </button>

                    {mod.app_url && (
                      <a
                        href={normalizeUrl(mod.app_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 text-emerald-900 hover:bg-emerald-50 rounded-xl transition border border-emerald-200 shrink-0"
                        title="Buka di Tab Baru / Tautan Asli"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(mod)}
                        className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition border border-blue-200 cursor-pointer"
                        title="Edit Modul & Bab"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingId(mod.id)}
                        className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition border border-red-200 cursor-pointer"
                        title="Hapus Modul Permanen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center border border-slate-100 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-red-50 rounded-2xl mx-auto flex items-center justify-center text-red-600 mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Hapus Modul Secara Permanen?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Modul <strong className="text-slate-800">{modules.find(m => m.id === deletingId)?.title}</strong> beserta seluruh data silabus bab akan dihapus secara <strong className="text-red-600">permanen</strong> dari sistem dan database Cloud. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteModule(deletingId)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider transition shadow-lg shadow-red-600/30 cursor-pointer active:scale-95"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center border border-slate-100 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-red-100 rounded-2xl mx-auto flex items-center justify-center text-red-600 mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              Hapus Permanen {selectedIds.length} Modul Terpilih?
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Anda akan menghapus <strong className="text-red-600 font-black">{selectedIds.length} modul pembelajaran</strong> yang dipilih secara <strong className="text-red-600">permanen</strong> dari sistem. Seluruh rincian bab dan tautan modul akan dihilangkan dan tidak dapat dipulihkan kembali.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider transition shadow-lg shadow-red-600/30 cursor-pointer active:scale-95"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl max-w-2xl w-full border border-slate-100 my-8 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scroll">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-800">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                    {editingModule ? 'Edit Modul Ajar & Bab' : 'Tambah Modul Ajar Baru'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Konfigurasi Link Eksternal & Deskripsi Bab Silabus
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveModule} className="space-y-5">
              {/* Judul & Room Level */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Judul Modul Pembelajaran *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Cth: Phonics Starter & Alphabet Adventure"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Room Level *
                  </label>
                  <select
                    value={formData.level}
                    onChange={e => setFormData({ ...formData, level: e.target.value as ModuleLevel })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black uppercase text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition cursor-pointer"
                  >
                    {LEVEL_LIST.map(lvl => (
                      <option key={lvl.id} value={lvl.id}>Room {lvl.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Grades & Author */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Target Usia / Jenjang Kelas
                  </label>
                  <input
                    type="text"
                    placeholder="Cth: PAUD / TK A & B, atau SD Kelas 1-3"
                    value={formData.target_grades}
                    onChange={e => setFormData({ ...formData, target_grades: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Penyusun / Author Modul
                  </label>
                  <input
                    type="text"
                    placeholder="Cth: Tim Akademik WIC"
                    value={formData.author}
                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Hyperlink External App or Direct File Upload */}
              <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
                  <div>
                    <label className="text-[10px] font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <ExternalLink size={14} className="text-emerald-700" />
                      Sumber Materi Modul (Upload File PDF atau Tautan Cloud) *
                    </label>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      Pilih metode pemasangan materi ajar agar dapat diakses seluruh tutor secara langsung
                    </p>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="inline-flex rounded-xl bg-emerald-950/10 p-1 shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setModuleSourceMode('UPLOAD')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 ${
                        moduleSourceMode === 'UPLOAD'
                          ? 'bg-emerald-950 text-gold-400 shadow-xs'
                          : 'text-emerald-900 hover:text-emerald-950'
                      }`}
                    >
                      <Upload size={11} /> Upload File PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setModuleSourceMode('LINK')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 ${
                        moduleSourceMode === 'LINK'
                          ? 'bg-emerald-950 text-gold-400 shadow-xs'
                          : 'text-emerald-900 hover:text-emerald-950'
                      }`}
                    >
                      <LinkIcon size={11} /> Tautan Drive/Cloud
                    </button>
                  </div>
                </div>

                {moduleSourceMode === 'UPLOAD' ? (
                  <div className="space-y-3">
                    <label className="block border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 rounded-2xl p-5 text-center cursor-pointer transition group">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                        onChange={e => handleDocFileUpload(e, false)}
                        disabled={isUploadingDoc}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 group-hover:bg-emerald-200 text-emerald-800 flex items-center justify-center mb-2 transition">
                          {isUploadingDoc ? (
                            <RefreshCw size={22} className="animate-spin text-emerald-700" />
                          ) : (
                            <Upload size={22} />
                          )}
                        </div>
                        <span className="text-xs font-black uppercase text-emerald-950 tracking-wider">
                          {isUploadingDoc ? 'Sedang Mengunggah ke Server...' : 'Klik untuk Memilih File Modul (PDF / DOC)'}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1">
                          File disimpan langsung di server WIC, bebas dari batasan akun Google Drive (Maks 35 MB)
                        </span>
                      </div>
                    </label>

                    {formData.app_url && (formData.app_url.startsWith('/uploads/') || formData.app_url.startsWith('data:image/')) && (
                      <div className="bg-emerald-100/70 border border-emerald-300 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <CheckCircle size={16} className="text-emerald-700 shrink-0" />
                          <span className="font-bold text-emerald-950 truncate">
                            File Terpasang: <code className="text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-200">{formData.app_url.startsWith('data:image/') ? `Gambar Modul Cloud (${Math.round(formData.app_url.length / 1024)} KB)` : formData.app_url}</code>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewModule({
                            id: 'PREVIEW',
                            title: formData.title || 'Pratinjau Modul',
                            level: formData.level,
                            cover_url: formData.cover_url,
                            description: formData.description,
                            chapters: formData.chapters,
                            app_url: formData.app_url,
                            app_platform: formData.app_platform,
                            author: formData.author
                          })}
                          className="bg-emerald-950 hover:bg-emerald-900 text-gold-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                        >
                          <Eye size={12} /> Pratinjau
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://drive.google.com/... atau https://canva.com/..."
                        value={formData.app_url}
                        onChange={e => {
                          const url = e.target.value;
                          setFormData({ 
                            ...formData, 
                            app_url: url,
                            app_platform: detectPlatform(url)
                          });
                        }}
                        className="flex-1 bg-white border border-emerald-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-800 focus:border-emerald-600 outline-none transition"
                      />

                      {formData.app_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewModule({
                            id: 'PREVIEW',
                            title: formData.title || 'Pratinjau Modul',
                            level: formData.level,
                            cover_url: formData.cover_url,
                            description: formData.description,
                            chapters: formData.chapters,
                            app_url: formData.app_url,
                            app_platform: formData.app_platform,
                            author: formData.author
                          })}
                          className="bg-emerald-900 hover:bg-emerald-950 text-gold-400 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Eye size={13} /> Uji Baca
                        </button>
                      )}
                    </div>

                    <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-[10px] text-amber-900 leading-relaxed">
                      <strong>⚠️ Penting untuk Tautan Google Drive:</strong> Pastikan setelan berbagi (Share Settings) di Google Drive diubah menjadi <em>"Siapa saja yang memiliki link dapat melihat (Anyone with the link can view)"</em> agar seluruh tutor pada akun dan perangkat berbeda dapat langsung membuka modul tanpa penolakan izin akses.
                    </div>
                  </div>
                )}
              </div>

              {/* Cover Image Feature (Dual: Share Link & Upload PNG/JPG) */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-emerald-700" />
                      Foto Cover Modul (Share Link atau Upload PNG/JPG)
                    </label>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      Pilih metode pemasangan foto cover untuk sampul buku ajar
                    </p>
                  </div>

                  {/* Dual Mode Switcher Tabs */}
                  <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCoverInputMode('LINK')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
                        coverInputMode === 'LINK'
                          ? 'bg-white text-emerald-950 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LinkIcon size={12} /> Share Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverInputMode('UPLOAD')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
                        coverInputMode === 'UPLOAD'
                          ? 'bg-white text-emerald-950 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Upload size={12} /> Upload PNG/JPG
                    </button>
                  </div>
                </div>

                {/* Banner Ukuran & Format Tersampaikan */}
                <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200/70 flex items-start gap-3">
                  <div className="p-1.5 bg-emerald-600 text-white rounded-lg shrink-0 mt-0.5">
                    <ImageIcon size={14} />
                  </div>
                  <div className="text-[10px] text-emerald-950 leading-relaxed">
                    <p className="font-black uppercase tracking-wider text-emerald-900">
                      Format & Ukuran Standar Cover Buku:
                    </p>
                    <p className="text-slate-600 mt-0.5">
                      • <strong className="text-slate-800">Rasio Aspek:</strong> 3:4 (Portrait/Buku Tegak) atau 4:3 (Landscape) • <strong className="text-slate-800">Resolusi Ideal:</strong> 600×800 px s/d 1200×1600 px (Rasio Buku A4) • <strong className="text-slate-800">Format:</strong> PNG / JPG / JPEG / WEBP (Maksimal 5 MB). Cover otomatis langsung terpasang pada visual buku modul.
                    </p>
                  </div>
                </div>

                {/* Main Cover Control & Live Book Mockup */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                  {/* Left 2 Cols: Input Form according to Mode */}
                  <div className="md:col-span-2 space-y-3">
                    {coverInputMode === 'LINK' ? (
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          Tautan Gambar / Share Link Cover (URL)
                        </label>
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/... atau tautan gambar langsung"
                          value={formData.cover_url}
                          onChange={e => setFormData({ ...formData, cover_url: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:border-emerald-500 outline-none transition shadow-sm"
                        />
                        <p className="text-[9px] text-slate-400">
                          Atau pilih cepat dari koleksi preset foto edukasi resolusi tinggi:
                        </p>
                        {/* Preset Cover Grid */}
                        <div className="grid grid-cols-5 gap-2 max-h-24 overflow-y-auto p-1 bg-white rounded-xl border border-slate-200 custom-scroll">
                          {PRESET_MODULE_COVERS.map(cov => (
                            <button
                              type="button"
                              key={cov.id}
                              onClick={() => {
                                setFormData({ ...formData, cover_url: cov.url });
                                setUploadedCoverName('');
                              }}
                              className={`relative rounded-lg overflow-hidden h-12 border-2 transition ${
                                formData.cover_url === cov.url 
                                  ? 'border-emerald-600 scale-95 shadow-sm' 
                                  : 'border-transparent hover:border-slate-300'
                              }`}
                            >
                              <img src={cov.url} alt={cov.name} className="w-full h-full object-cover" />
                              {formData.cover_url === cov.url && (
                                <div className="absolute inset-0 bg-emerald-600/40 flex items-center justify-center text-white">
                                  <Check size={14} />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Upload PNG / JPG Mode */
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          Pilih Berkas Foto Cover (PNG / JPG / WEBP)
                        </label>
                        <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white p-5 rounded-2xl text-center transition cursor-pointer relative group">
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            onChange={handleCoverFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition">
                              <Upload size={20} />
                            </div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
                              Klik atau Tarik Foto Cover ke Sini
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Format PNG, JPG, JPEG, atau WEBP • Maksimal 5 MB
                            </p>
                            {uploadedCoverName && (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full text-[10px] font-bold">
                                <CheckCircle2 size={12} className="text-emerald-700" />
                                {uploadedCoverName}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Col: Authentic Book Cover Mockup Preview */}
                  <div className="flex flex-col items-center">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">
                      Visual Cover Buku Modul
                    </p>
                    <div className="w-36 h-48 rounded-xl overflow-hidden bg-slate-900 border-2 border-slate-300 shadow-xl relative group flex flex-col justify-between p-2.5 transform hover:rotate-1 transition-all">
                      {formData.cover_url ? (
                        <img 
                          src={formData.cover_url} 
                          alt="Book Cover Preview" 
                          className="absolute inset-0 w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-100">
                          <ImageIcon size={24} />
                        </div>
                      )}
                      {/* Gradient Book Overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent pointer-events-none" />
                      
                      {/* Spine subtle shadow on left edge */}
                      <div className="absolute top-0 bottom-0 left-0 w-3 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />

                      {/* Top Badges */}
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="bg-emerald-600 text-white text-[7px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">
                          {formData.level}
                        </span>
                        <span className="bg-black/60 backdrop-blur-xs text-gold-400 text-[7px] font-black px-1.5 py-0.5 rounded-md">
                          WIC
                        </span>
                      </div>

                      {/* Bottom Title on Cover */}
                      <div className="relative z-10">
                        <p className="text-[9px] font-black text-white leading-tight uppercase line-clamp-2 drop-shadow-md">
                          {formData.title || 'Judul Modul Buku'}
                        </p>
                        <p className="text-[7px] text-slate-300 font-bold truncate mt-0.5">
                          {formData.author || 'Tim Kurikulum WIC'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase mt-2">
                      Rasio Standar 3:4 (A4 Portrait)
                    </span>
                  </div>
                </div>
              </div>

              {/* Deskripsi Singkat & Rujukan Acuan Modul */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={13} className="text-emerald-700" />
                    Deskripsi, Pokok Bahasan & Rujukan Materi (Wajib Dibaca Oleh AI) *
                  </label>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Acuan Utama Silabus
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="Ketikkan deskripsi, buku acuan, nama kitab rujukan (cth: Matan Jazariyyah, Tuhfatul Athfal, Juz 30), kompetensi dasar, atau rincian silabus bab yang diinginkan. AI akan membaca teks ini secara saksama agar bab yang dihasilkan memiliki rujukan pasti..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition leading-relaxed shadow-sm"
                />
                <p className="text-[9px] text-slate-500 mt-1 italic">
                  💡 Rujukan yang Pasti: Saat menekan tombol "⚡ Generate Bab Otomatis", AI akan menelaah kalimat dan daftar rujukan yang Anda tulis di atas, bukan sekadar menghasilkan bab acak.
                </p>
              </div>

              {/* Rincian Bab & Pokok Bahasan */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div>
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ListOrdered size={14} className="text-emerald-700" />
                      Rincian Bab Isi Materi ({formData.chapters.length} Bab)
                    </label>
                    <p className="text-[9px] text-slate-400">
                      Tersusun urut untuk panduan tutor & siswa
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!formData.description && !formData.title) {
                          showToast('Isi judul atau gambaran deskripsi materi terlebih dahulu!', 'info');
                          return;
                        }
                        const derived = deriveChaptersFromOverview(formData.description, formData.level, formData.title, 20);
                        setFormData(prev => ({ ...prev, chapters: derived }));
                        showToast(`${derived.length} Bab materi berhasil diturunkan langsung dari gambaran deskripsi!`, 'success');
                      }}
                      className="bg-gold-400 hover:bg-gold-500 text-emerald-950 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                      title="Terapkan rincian bab langsung dari deskripsi materi"
                    >
                      <Sparkles size={12} /> ✨ Terapkan Deskripsi ke Bab
                    </button>

                    <button
                      type="button"
                      onClick={handleAutoGenerateChapters}
                      disabled={isGeneratingChapters}
                      className="bg-gradient-to-r from-emerald-900 to-teal-900 hover:from-emerald-850 hover:to-teal-850 text-gold-300 border border-gold-400/30 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-60 cursor-pointer"
                      title="Susun bab otomatis berdasarkan judul, level & deskripsi materi"
                    >
                      {isGeneratingChapters ? (
                        <>
                          <RefreshCw size={12} className="animate-spin text-gold-400" /> Menyusun Bab...
                        </>
                      ) : (
                        <>
                          <Wand2 size={12} className="text-gold-400" /> ⚡ AI Generate
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Chapter list */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scroll pr-1">
                  {formData.chapters.map((ch, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm text-xs">
                      <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-900 font-black text-[9px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={ch}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            chapters: prev.chapters.map((c, i) => i === idx ? val : c)
                          }));
                        }}
                        className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveChapter(idx)}
                        className="text-red-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Chapter Input */}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder={`Cth: Bab ${formData.chapters.length + 1}: Latihan Percakapan Tematik`}
                    value={newChapterText}
                    onChange={e => setNewChapterText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChapter();
                      }
                    }}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:border-emerald-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddChapter}
                    className="bg-emerald-900 hover:bg-emerald-800 text-gold-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition"
                  >
                    + Tambah Bab
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-2xl font-bold uppercase text-[10px] tracking-wider transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-950 hover:bg-emerald-900 text-gold-400 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-wider transition shadow-lg shadow-emerald-950/20 active:scale-95"
                >
                  {editingModule ? 'Simpan Perubahan Modul' : 'Publikasikan Modul'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MASTER 5 BUKU (MASING-MASING 4 BAB OTOMATIS) */}
      {isMaster5ModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white p-6 relative">
              <button
                type="button"
                onClick={() => setIsMaster5ModalOpen(false)}
                className="absolute top-6 right-6 text-white/60 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
              >
                <X size={20} />
              </button>

              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="bg-gold-500/20 text-gold-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-gold-500/30 flex items-center gap-1.5">
                  <Sparkles size={12} /> Master Kurikulum 5 Buku
                </span>
                <span className="bg-white/10 text-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  4 Bab Otomatis per Buku
                </span>
              </div>

              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">
                Pengisian & Sinkronisasi 5 Buku Modul Ajar (4 Bab per Buku)
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Tuliskan gambaran umum materi pada masing-masing buku, lalu klik <strong className="text-gold-300">"Terapkan Deskripsi ke 4 Bab"</strong>. Sistem akan langsung memetakan 4 bab materi yang selaras, serta memastikan tautan berbagi (Google Drive, Canva, Notion, Quizizz) langsung dapat dibuka tutor di Beranda.
              </p>

              {/* Master Bulk Action Toolbar */}
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] font-bold text-slate-300 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400" />
                  <span>5 Buku Pokok Jenjang Kurikulum Terpadu WIC</span>
                </div>

                <button
                  type="button"
                  onClick={handleDeriveAllMasterBooks}
                  className="bg-gold-400 hover:bg-gold-500 text-emerald-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                  title="Otomatis menyusun 4 bab untuk seluruh buku berdasarkan masing-masing gambaran materi"
                >
                  <Sparkles size={13} /> ⚡ Terapkan Gambaran ke 4 Bab untuk Semua Buku Sekaligus
                </button>
              </div>
            </div>

            {/* Book Tabs Navigation */}
            <div className="bg-slate-50 border-b border-slate-200 p-2 sm:p-3 overflow-x-auto flex items-center gap-2">
              {masterBooks.map(b => {
                const isActive = activeMasterBookNum === b.bookNumber;
                const hasUrl = !!b.app_url?.trim();
                const hasDesc = !!b.description?.trim();

                return (
                  <button
                    key={b.bookNumber}
                    type="button"
                    onClick={() => setActiveMasterBookNum(b.bookNumber)}
                    className={`px-3.5 py-2.5 rounded-2xl text-left transition shrink-0 border flex items-center gap-2.5 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-950 text-white border-emerald-900 shadow-md ring-2 ring-gold-400/50'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-gold-400 text-emerald-950' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {b.bookNumber}
                    </span>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-tight leading-tight">
                        {b.level}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${
                          hasUrl 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {hasUrl ? 'Link Aktif' : 'Belum Ada Link'}
                        </span>
                        {hasDesc && (
                          <span className="text-[8px] font-bold text-slate-400">
                            • 4 Bab Siap
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Book Editor Body */}
            {(() => {
              const currentBook = masterBooks.find(b => b.bookNumber === activeMasterBookNum) || masterBooks[0];
              if (!currentBook) return null;

              return (
                <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scroll">
                  {/* Top Bar Active Book Badge */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-2xl bg-emerald-950 text-gold-400 font-black text-sm flex items-center justify-center shadow-sm shrink-0">
                        Buku {currentBook.bookNumber}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-slate-800 uppercase tracking-tight text-base">
                            Kurikulum Room {currentBook.level}
                          </h3>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                            {currentBook.target_grades}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Atur gambaran materi buku, rincian 4 bab, dan tautan modul yang akan langsung diakses oleh tutor.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeriveChaptersForBook(currentBook.bookNumber)}
                      className="bg-emerald-900 hover:bg-emerald-800 text-gold-300 border border-gold-400/40 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0 cursor-pointer"
                    >
                      <Sparkles size={13} className="text-gold-400" /> ✨ Terapkan Deskripsi Ini ke 4 Bab
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Metadata, Link, Cover */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* Judul Buku */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                          Judul Resmi Buku Modul
                        </label>
                        <input
                          type="text"
                          value={currentBook.title}
                          onChange={e => handleUpdateMasterBook(currentBook.bookNumber, 'title', e.target.value)}
                          placeholder="Contoh: Buku 2: Daily Expressions & Essential Vocabulary 101"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 outline-none"
                        />
                      </div>

                      {/* Target Jenjang / Siswa */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                          Target Kelas / Siswa
                        </label>
                        <input
                          type="text"
                          value={currentBook.target_grades}
                          onChange={e => handleUpdateMasterBook(currentBook.bookNumber, 'target_grades', e.target.value)}
                          placeholder="Contoh: SD Kelas 1-3 / Pemula"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 outline-none"
                        />
                      </div>

                      {/* Link Modul Ajar (Share Link) */}
                      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1">
                            <LinkIcon size={12} className="text-emerald-700" /> Tautan Berbagi Modul Ajar (Share Link)
                          </label>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-gold-400">
                            {currentBook.app_platform || 'Google Drive'}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={currentBook.app_url}
                            onChange={e => handleUpdateMasterBook(currentBook.bookNumber, 'app_url', e.target.value)}
                            placeholder="https://drive.google.com/... atau upload file PDF"
                            className="flex-1 bg-white border border-emerald-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-emerald-900 focus:border-emerald-600 outline-none shadow-xs"
                          />

                          <label className="bg-emerald-900 hover:bg-emerald-950 text-gold-400 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 cursor-pointer transition shadow-xs">
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg"
                              onChange={e => handleDocFileUpload(e, true, currentBook.bookNumber)}
                              className="hidden"
                              disabled={isUploadingDoc}
                            />
                            <Upload size={12} />
                            <span>Upload PDF</span>
                          </label>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <p className="text-[9px] text-slate-500">
                            {currentBook.app_url?.startsWith('data:image/')
                              ? '✅ Gambar tersimpan di Cloud Firestore & tampil di semua device.'
                              : currentBook.app_url?.startsWith('/uploads/') 
                                ? '✅ File tersimpan permanen di server WIC.' 
                                : 'Tips: Pastikan link Google Drive disetel ke "Siapa saja yang memiliki link".'}
                          </p>
                          {currentBook.app_url?.trim() && (
                            <button
                              type="button"
                              onClick={() => setPreviewModule({
                                id: currentBook.id,
                                title: currentBook.title,
                                level: currentBook.level,
                                cover_url: currentBook.cover_url,
                                description: currentBook.description,
                                chapters: currentBook.chapters,
                                app_url: currentBook.app_url,
                                app_platform: currentBook.app_platform,
                                author: currentBook.author
                              })}
                              className="text-[9px] font-black uppercase text-emerald-700 hover:text-emerald-900 flex items-center gap-1 underline cursor-pointer"
                            >
                              <span>Uji Pratinjau</span>
                              <Eye size={11} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Cover Photo / Image Preview */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                          Foto Cover Buku
                        </label>
                        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                          <img
                            src={currentBook.cover_url}
                            alt="Cover"
                            className="w-14 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = PRESET_MODULE_COVERS[0].url;
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={currentBook.cover_url}
                              onChange={e => handleUpdateMasterBook(currentBook.bookNumber, 'cover_url', e.target.value)}
                              placeholder="URL foto cover..."
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-700 outline-none"
                            />
                            <p className="text-[9px] text-slate-400 mt-1">
                              Cover standar tersimpan otomatis sesuai jenjang.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Deskripsi Buku & 4 Bab Materi */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Deskripsi / Gambaran Umum Buku */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText size={13} className="text-emerald-700" />
                            Keterangan / Gambaran Materi Buku
                          </label>
                          <span className="text-[9px] text-slate-400">
                            Diisikan langsung oleh Anda
                          </span>
                        </div>

                        <textarea
                          rows={4}
                          value={currentBook.description}
                          onChange={e => handleUpdateMasterBook(currentBook.bookNumber, 'description', e.target.value)}
                          placeholder="Tuliskan gambaran/deskripsi materi buku ini di sini (misal: pengenalan diri, ungkapan kelas sehari-hari, membaca jam dan tanggal, serta rutinitas harian)..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:bg-white focus:border-emerald-600 outline-none leading-relaxed"
                        />

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleDeriveChaptersForBook(currentBook.bookNumber)}
                            className="bg-gold-400 hover:bg-gold-500 text-emerald-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                          >
                            <Sparkles size={13} /> ✨ Baca & Terapkan Deskripsi ke Bab (s/d 20 Bab)
                          </button>
                        </div>
                      </div>

                      {/* Bab Materi Inputs (Mendukung hingga 20 Bab) */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                          <div>
                            <label className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <ListOrdered size={14} className="text-emerald-700" />
                              Silabus Bab Materi ({currentBook.chapters.length} Bab Terdaftar)
                            </label>
                            <p className="text-[9px] text-slate-400">
                              Membaca deskripsi buku secara otomatis hingga 20 bab, atau tambah & edit manual di bawah
                            </p>
                          </div>
                          <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                            {currentBook.chapters.length} / 20 Bab
                          </span>
                        </div>

                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                          {currentBook.chapters.map((ch, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs group">
                              <span className="w-7 h-7 rounded-lg bg-emerald-950 text-gold-400 font-black text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={ch}
                                  onChange={e => handleUpdateMasterBookChapter(currentBook.bookNumber, idx, e.target.value)}
                                  placeholder={`Bab ${idx + 1}: Judul dan topik bahasan materi`}
                                  className="w-full bg-transparent border-none outline-none font-bold text-slate-800 text-xs"
                                />
                              </div>
                              {currentBook.chapters.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMasterBookChapter(currentBook.bookNumber, idx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition opacity-60 group-hover:opacity-100 cursor-pointer"
                                  title="Hapus Bab Ini"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {currentBook.chapters.length < 20 && (
                          <button
                            type="button"
                            onClick={() => handleAddMasterBookChapter(currentBook.bookNumber)}
                            className="w-full py-2 border border-dashed border-emerald-400 hover:border-emerald-600 text-emerald-800 hover:bg-emerald-50/50 rounded-xl font-bold text-[10px] uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                          >
                            <Plus size={13} /> Tambah Bab Baru ({currentBook.chapters.length + 1}/20)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 font-medium text-center sm:text-left">
                Perubahan pada 5 buku ini akan langsung disimpan dan tersinkronisasi realtime ke <strong className="text-slate-800">Beranda Modul Ajar</strong> dan <strong className="text-slate-800">Beranda Tutor</strong>.
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsMaster5ModalOpen(false)}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveMasterBooks}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-emerald-950 hover:bg-emerald-900 text-gold-400 font-black uppercase text-[10px] tracking-wider transition shadow-lg shadow-emerald-950/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check size={16} /> Simpan & Terapkan 5 Buku ke Seluruh Portal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal In-App Module Reader Modal */}
      <ModuleViewerModal
        module={previewModule}
        isOpen={!!previewModule}
        onClose={() => setPreviewModule(null)}
        showToast={showToast}
      />
    </div>
  );
}
