import React from 'react';
import { 
  Settings, 
  User, 
  HonorRateItem, 
  QuoteItem, 
  ProjectType, 
  AppData, 
  ProjectClassification, 
  ProjectItemDefinition 
} from '../../types';
import { DEFAULT_HONOR_RATES, DEFAULT_PROJECT_CLASSIFICATIONS, WIC_ASSETS, EMBEDDED_WIC_LOGO } from '../../constants';
import { compressAssetImage } from '../../lib/imageCompressor';
import WhatsAppBroadcaster from './WhatsAppBroadcaster';
import { 
  Settings as SettingsIcon, 
  MessageSquare, 
  Send, 
  Save, 
  Quote, 
  X, 
  Sparkles, 
  Plus, 
  Trash2, 
  FileUp, 
  Download, 
  Users, 
  FolderGit2, 
  Coins, 
  Shuffle, 
  Check, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Award,
  BookOpen,
  HelpCircle,
  RefreshCw,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  CheckCircle2,
  FileSignature,
  Edit3,
  Layers,
  FolderPlus,
  RotateCcw,
  FileText,
  Tag,
  ChevronRight,
  Building2,
  CreditCard,
  Banknote,
  ExternalLink
} from 'lucide-react';
import Papa from 'papaparse';
import { generateWABroadcast, generateIndividualMessage } from '../../services/geminiService';
import { formatCurrency, cn } from '../../lib/utils';

// Color palette options for classification badges
const BADGE_COLOR_OPTIONS = [
  { label: 'Biru - Indigo (Modul)', value: 'from-blue-600 to-indigo-700', bg: 'bg-gradient-to-r from-blue-600 to-indigo-700' },
  { label: 'Pink - Rose (Content)', value: 'from-pink-500 to-rose-600', bg: 'bg-gradient-to-r from-pink-500 to-rose-600' },
  { label: 'Amber - Orange (Event)', value: 'from-amber-500 to-orange-600', bg: 'bg-gradient-to-r from-amber-500 to-orange-600' },
  { label: 'Emerald - Teal (Sekolah)', value: 'from-emerald-600 to-teal-700', bg: 'bg-gradient-to-r from-emerald-600 to-teal-700' },
  { label: 'Ungu - Violet (Riset/Kreatif)', value: 'from-purple-600 to-violet-700', bg: 'bg-gradient-to-r from-purple-600 to-violet-700' },
  { label: 'Cyan - Sky (Digital Media)', value: 'from-cyan-600 to-blue-700', bg: 'bg-gradient-to-r from-cyan-600 to-blue-700' },
  { label: 'Merah - Crimson (Prioritas)', value: 'from-red-600 to-rose-800', bg: 'bg-gradient-to-r from-red-600 to-rose-800' }
];

interface SystemSettingsProps {
  settings: Settings;
  tutors: User[];
  appData?: AppData;
  onUpdate: (settings: Settings) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToTutors?: () => void;
  onOpenBackupRecovery?: () => void;
}

export default function SystemSettings({ 
  settings, 
  tutors, 
  appData,
  onUpdate, 
  showToast,
  onNavigateToTutors,
  onOpenBackupRecovery
}: SystemSettingsProps) {
  // Ensure default structures exist
  const [localSettings, setLocalSettings] = React.useState<Settings>(() => ({
    ...settings,
    enable_semi_private: settings.enable_semi_private !== undefined ? settings.enable_semi_private : true,
    semi_private_certified_only: settings.semi_private_certified_only !== undefined ? settings.semi_private_certified_only : true,
    semi_private_module_bonus: settings.semi_private_module_bonus || 25000,
    honor_rates: settings.honor_rates && settings.honor_rates.length > 0 
      ? settings.honor_rates.map(r => ({
          ...r,
          private: r.private !== undefined ? r.private : Math.round(r.mandiri * 0.9),
          semi_private: r.semi_private !== undefined ? r.semi_private : r.mandiri
        }))
      : DEFAULT_HONOR_RATES,
    project_classifications: settings.project_classifications && settings.project_classifications.length > 0
      ? settings.project_classifications
      : DEFAULT_PROJECT_CLASSIFICATIONS,
    quotes_list: settings.quotes_list || [
      { id: 'q-1', text: settings.quote || "Masa depan cerah dimulai dari kesungguhan hati dalam mendidik.", author: "WIC Leadership" }
    ]
  }));

  const [activeTab, setActiveTab] = React.useState<'HONOR' | 'PROJECTS' | 'QUOTES' | 'BASIC' | 'BROADCAST'>('HONOR');

  // New Honor Rate Form state
  const [newHonorName, setNewHonorName] = React.useState('');
  const [newHonorMandiri, setNewHonorMandiri] = React.useState(35000);
  const [newHonorTeam, setNewHonorTeam] = React.useState(30000);
  const [newHonorPrivate, setNewHonorPrivate] = React.useState(31500);
  const [newHonorSemiPrivate, setNewHonorSemiPrivate] = React.useState(35000);

  // Sync Private fee automatically when Mandiri changes in Add form
  const handleMandiriAddChange = (val: number) => {
    setNewHonorMandiri(val);
    setNewHonorPrivate(Math.round(val * 0.9));
    setNewHonorSemiPrivate(val);
  };

  // --- PROJECT CLASSIFICATIONS & FEE MANAGEMENT STATES ---
  const [editingClassification, setEditingClassification] = React.useState<ProjectClassification | null>(null);
  const [isAddClassificationModalOpen, setIsAddClassificationModalOpen] = React.useState(false);
  const [newClsName, setNewClsName] = React.useState('');
  const [newClsBadge, setNewClsBadge] = React.useState('from-blue-600 to-indigo-700');
  const [newClsDesc, setNewClsDesc] = React.useState('');

  const [editingItem, setEditingItem] = React.useState<{ classificationId: string; targetClassificationId: string; item: ProjectItemDefinition } | null>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = React.useState(false);
  const [targetClsIdForNewItem, setTargetClsIdForNewItem] = React.useState('');
  const [newItemName, setNewItemName] = React.useState('');
  const [newItemFee, setNewItemFee] = React.useState<number>(35000);
  const [newItemDesc, setNewItemDesc] = React.useState('');

  // Confirmation modal states (replaces window.confirm for reliable execution in iframe)
  const [deleteClsTarget, setDeleteClsTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = React.useState<{ clsId: string; itemId: string; itemName: string } | null>(null);
  const [isResetClsConfirmOpen, setIsResetClsConfirmOpen] = React.useState(false);

  // New Manual Quote Form state
  const [newQuoteText, setNewQuoteText] = React.useState('');
  const [newQuoteAuthor, setNewQuoteAuthor] = React.useState('WIC Leadership');

  // States for Batch Broadcast
  const [waTopic, setWaTopic] = React.useState('periode_baru');
  const [waStyle, setWaStyle] = React.useState('Formal');
  const [waScript, setWaScript] = React.useState('');
  const [waTarget, setWaTarget] = React.useState('ALL');
  const [isGenerating, setIsGenerating] = React.useState(false);

  // States for Individual Personal Message
  const [personalTarget, setPersonalTarget] = React.useState('');
  const [personalGender, setPersonalGender] = React.useState<'Mr.' | 'Ms.'>('Mr.');
  const [personalContent, setPersonalContent] = React.useState('');
  const [personalStyle, setPersonalStyle] = React.useState('Friendly');
  const [personalPolished, setPersonalPolished] = React.useState('');
  const [isPolishing, setIsPolishing] = React.useState(false);

  // Track last committed settings to guard against SSE/polling overwriting active local changes
  const lastSavedSettingsRef = React.useRef<string>(JSON.stringify(settings));

  // Synchronize when settings prop changes externally from Firestore
  React.useEffect(() => {
    const incomingStr = JSON.stringify(settings);
    if (incomingStr !== lastSavedSettingsRef.current) {
      lastSavedSettingsRef.current = incomingStr;
      setLocalSettings(prev => ({
        ...settings,
        enable_semi_private: settings.enable_semi_private !== undefined ? settings.enable_semi_private : (prev.enable_semi_private ?? true),
        semi_private_certified_only: settings.semi_private_certified_only !== undefined ? settings.semi_private_certified_only : (prev.semi_private_certified_only ?? true),
        semi_private_module_bonus: settings.semi_private_module_bonus || prev.semi_private_module_bonus || 25000,
        honor_rates: settings.honor_rates && settings.honor_rates.length > 0 
          ? settings.honor_rates.map(r => ({
              ...r,
              private: r.private !== undefined ? r.private : Math.round(r.mandiri * 0.9),
              semi_private: r.semi_private !== undefined ? r.semi_private : r.mandiri
            }))
          : (prev.honor_rates && prev.honor_rates.length > 0 ? prev.honor_rates : DEFAULT_HONOR_RATES),
        project_classifications: settings.project_classifications && settings.project_classifications.length > 0
          ? settings.project_classifications
          : (prev.project_classifications && prev.project_classifications.length > 0 ? prev.project_classifications : DEFAULT_PROJECT_CLASSIFICATIONS),
        quotes_list: settings.quotes_list || prev.quotes_list || []
      }));
    }
  }, [settings]);

  const [signInputMode, setSignInputMode] = React.useState<{
    logo: 'UPLOAD' | 'LINK';
    director: 'UPLOAD' | 'LINK';
    cfo: 'UPLOAD' | 'LINK';
    stempel: 'UPLOAD' | 'LINK';
  }>({
    logo: 'UPLOAD',
    director: 'UPLOAD',
    cfo: 'UPLOAD',
    stempel: 'UPLOAD'
  });

  const handleImageUpload = async (field: 'logo_url' | 'director_sign' | 'cfo_sign' | 'stempel_url', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa foto/gambar (PNG, JPG, JPEG, WEBP, SVG)!', 'error');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran file foto maksimal 5 MB!', 'error');
      e.target.value = '';
      return;
    }

    try {
      const compressedDataUrl = await compressAssetImage(file);
      if (!compressedDataUrl) {
        showToast('Gagal memproses file foto. Coba pilih gambar lain.', 'error');
        return;
      }

      const nextSettings: Settings = {
        ...localSettings,
        [field]: compressedDataUrl
      };
      lastSavedSettingsRef.current = JSON.stringify(nextSettings);
      setLocalSettings(nextSettings);
      onUpdate(nextSettings);

      const label = field === 'logo_url' 
        ? 'Logo Resmi WIC' 
        : field === 'director_sign' 
          ? 'TTD Direktur' 
          : field === 'cfo_sign' 
            ? 'TTD Keuangan' 
            : 'Stempel Resmi';
      showToast(`Foto ${label} berhasil dioptimasi (${Math.round(compressedDataUrl.length / 1024)} KB) & tersinkron ke seluruh device!`, 'success');
    } catch {
      showToast('Gagal memproses file foto.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveAll = (updated?: Settings) => {
    const toSave = updated || localSettings;
    lastSavedSettingsRef.current = JSON.stringify(toSave);
    onUpdate(toSave);
    showToast("Semua pengaturan sistem berhasil disimpan dan diterapkan ke seluruh dashboard!", "success");
  };

  // --- HONOR RATES MANAGEMENT ---
  const handleAddHonorRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHonorName.trim()) {
      showToast("Nama level honor tidak boleh kosong", "error");
      return;
    }
    const currentRates = localSettings.honor_rates || [];
    if (currentRates.some(r => r.name.toLowerCase() === newHonorName.trim().toLowerCase())) {
      showToast("Level honor dengan nama ini sudah ada", "error");
      return;
    }

    const newItem: HonorRateItem = {
      id: 'hr-' + Date.now(),
      name: newHonorName.trim(),
      mandiri: Number(newHonorMandiri) || 0,
      team: Number(newHonorTeam) || 0,
      private: Number(newHonorPrivate) || Math.round((Number(newHonorMandiri) || 0) * 0.9),
      semi_private: Number(newHonorSemiPrivate) || Number(newHonorMandiri) || 0
    };

    const nextRates = [...currentRates, newItem];
    const updated = { ...localSettings, honor_rates: nextRates };
    setLocalSettings(updated);
    handleSaveAll(updated);
    setNewHonorName('');
    setNewHonorMandiri(35000);
    setNewHonorTeam(30000);
    setNewHonorPrivate(31500);
    setNewHonorSemiPrivate(35000);
    showToast(`Level honor "${newItem.name}" berhasil ditambahkan!`, "success");
  };

  const handleUpdateHonorRate = (id: string, field: 'name' | 'mandiri' | 'team' | 'private' | 'semi_private', val: any) => {
    const nextRates = (localSettings.honor_rates || []).map(r => {
      if (r.id === id) {
        const updatedRate = {
          ...r,
          [field]: field === 'name' ? val : (parseInt(val) || 0)
        };
        // Auto calculate private if mandiri changed and private is not manually locked
        if (field === 'mandiri') {
          updatedRate.private = Math.round((parseInt(val) || 0) * 0.9);
          if (!updatedRate.semi_private) {
            updatedRate.semi_private = parseInt(val) || 0;
          }
        }
        return updatedRate;
      }
      return r;
    });
    const updated = { ...localSettings, honor_rates: nextRates };
    setLocalSettings(updated);
  };

  const handleAutoRecalculatePrivate = () => {
    const nextRates = (localSettings.honor_rates || []).map(r => ({
      ...r,
      private: Math.round(r.mandiri * 0.9)
    }));
    const updated = { ...localSettings, honor_rates: nextRates };
    setLocalSettings(updated);
    handleSaveAll(updated);
    showToast("Seluruh honor Private berhasil dihitung ulang = Mandiri - 10%!", "success");
  };

  const handleDeleteHonorRate = (id: string, name: string) => {
    const nextRates = (localSettings.honor_rates || []).filter(r => r.id !== id);
    const updated = { ...localSettings, honor_rates: nextRates };
    setLocalSettings(updated);
    onUpdate(updated);
    showToast(`Tarif honor "${name}" berhasil dihapus`, "info");
  };

  // --- PROJECT CLASSIFICATIONS & FEE MANAGEMENT HANDLERS ---
  const handleSaveClassifications = (newClassifications: ProjectClassification[], toastMsg?: string) => {
    // Flatten into project_types for backwards compatibility with any component reading project_types
    const flattenedTypes: ProjectType[] = newClassifications.flatMap(cls => 
      (cls.items || []).map(it => ({
        name: it.name,
        fee: it.defaultFee,
        classification: cls.name
      }))
    );

    const updated: Settings = {
      ...localSettings,
      project_classifications: newClassifications,
      project_types: flattenedTypes
    };

    setLocalSettings(updated);
    onUpdate(updated);
    if (toastMsg) {
      showToast(toastMsg, "success");
    }
  };

  const handleCreateClassification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClsName.trim()) {
      showToast("Nama klasifikasi tidak boleh kosong", "error");
      return;
    }
    const currentList = localSettings.project_classifications && localSettings.project_classifications.length > 0
      ? localSettings.project_classifications
      : DEFAULT_PROJECT_CLASSIFICATIONS;

    if (currentList.some(c => c.name.toLowerCase() === newClsName.trim().toLowerCase())) {
      showToast("Klasifikasi dengan nama ini sudah terdaftar", "error");
      return;
    }

    const newCls: ProjectClassification = {
      id: `cls-${Date.now()}`,
      name: newClsName.trim(),
      badgeColor: newClsBadge || 'from-blue-600 to-indigo-700',
      description: newClsDesc.trim(),
      items: []
    };

    const nextList = [...currentList, newCls];
    handleSaveClassifications(nextList, `Klasifikasi "${newCls.name}" berhasil dibuat!`);
    setIsAddClassificationModalOpen(false);
    setNewClsName('');
    setNewClsDesc('');
  };

  const handleSaveEditClassification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClassification || !editingClassification.name.trim()) return;
    const currentList = localSettings.project_classifications && localSettings.project_classifications.length > 0
      ? localSettings.project_classifications
      : DEFAULT_PROJECT_CLASSIFICATIONS;

    const trimmedName = editingClassification.name.trim();
    const nextList = currentList.map(c => {
      if (c.id === editingClassification.id || c.name.toLowerCase() === editingClassification.name.toLowerCase()) {
        return {
          ...c,
          name: trimmedName,
          badgeColor: editingClassification.badgeColor || c.badgeColor,
          description: editingClassification.description ? editingClassification.description.trim() : ''
        };
      }
      return c;
    });
    handleSaveClassifications(nextList, `Klasifikasi "${trimmedName}" berhasil diperbarui!`);
    setEditingClassification(null);
  };

  const handleDeleteClassification = (clsId: string, clsName: string) => {
    setDeleteClsTarget({ id: clsId, name: clsName });
  };

  const confirmDeleteClassification = () => {
    if (!deleteClsTarget) return;
    const { id: clsId, name: clsName } = deleteClsTarget;
    const currentList = localSettings.project_classifications && localSettings.project_classifications.length > 0
      ? localSettings.project_classifications
      : DEFAULT_PROJECT_CLASSIFICATIONS;

    const nextList = currentList.filter(c => c.id !== clsId && c.name.toLowerCase() !== clsName.toLowerCase());
    handleSaveClassifications(nextList, `Klasifikasi "${clsName}" telah dihapus.`);
    setDeleteClsTarget(null);
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      showToast("Nama item proyek tidak boleh kosong", "error");
      return;
    }
    const currentList = localSettings.project_classifications && localSettings.project_classifications.length > 0
      ? localSettings.project_classifications
      : DEFAULT_PROJECT_CLASSIFICATIONS;

    const targetCls = currentList.find(c => c.id === targetClsIdForNewItem) || currentList[0];
    if (!targetCls) {
      showToast("Pilih klasifikasi terlebih dahulu", "error");
      return;
    }

    const newItem: ProjectItemDefinition = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      defaultFee: Number(newItemFee) || 0,
      description: newItemDesc.trim()
    };

    const nextList = currentList.map(c => {
      if (c.id === targetCls.id) {
        return {
          ...c,
          items: [...(c.items || []), newItem]
        };
      }
      return c;
    });

    handleSaveClassifications(nextList, `Item proyek "${newItem.name}" berhasil ditambahkan ke "${targetCls.name}"!`);
    setIsAddItemModalOpen(false);
    setNewItemName('');
    setNewItemFee(35000);
    setNewItemDesc('');
  };

  const handleUpdateItemInline = (clsId: string, itemId: string, field: 'name' | 'defaultFee' | 'description', val: any) => {
    const currentList = localSettings.project_classifications && localSettings.project_classifications.length > 0
      ? localSettings.project_classifications
      : DEFAULT_PROJECT_CLASSIFICATIONS;

    const nextList = currentList.map(c => {
      if (c.id === clsId) {
        return {
          ...c,
          items: (c.items || []).map(it => {
            if (it.id === itemId) {
              return {
                ...it,
                [field]: field === 'defaultFee' ? (parseInt(val) || 0) : val
              };
            }
            return it;
          })
        };
      }
      return c;
    });

    const flattenedTypes: ProjectType[] = nextList.flatMap(cls => 
      (cls.items || []).map(it => ({
        name: it.name,
        fee: it.defaultFee,
        classification: cls.name
      }))
    );

    const updated: Settings = {
      ...localSettings,
      project_classifications: nextList,
      project_types: flattenedTypes
    };

    setLocalSettings(updated);
    onUpdate(updated);
  };

  const handleSaveEditItemModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.item.name.trim()) return;
    const currentList = localSettings.project_classifications && localSettings.project_classifications.length > 0
      ? localSettings.project_classifications
      : DEFAULT_PROJECT_CLASSIFICATIONS;

    const sourceClsId = editingItem.classificationId;
    const destClsId = editingItem.targetClassificationId || editingItem.classificationId;

    const updatedItem: ProjectItemDefinition = {
      ...editingItem.item,
      name: editingItem.item.name.trim(),
      defaultFee: Number(editingItem.item.defaultFee) || 0,
      description: editingItem.item.description ? editingItem.item.description.trim() : ''
    };

    let nextList = currentList;
    if (sourceClsId === destClsId) {
      nextList = currentList.map(c => {
        if (c.id === sourceClsId) {
          return {
            ...c,
            items: (c.items || []).map(it => 
              (it.id === updatedItem.id || it.name === editingItem.item.name) ? updatedItem : it
            )
          };
        }
        return c;
      });
    } else {
      // Pindahkan item ke klasifikasi tujuan yang dipilih
      nextList = currentList.map(c => {
        if (c.id === sourceClsId) {
          return {
            ...c,
            items: (c.items || []).filter(it => it.id !== updatedItem.id && it.name !== editingItem.item.name)
          };
        }
        if (c.id === destClsId) {
          return {
            ...c,
            items: [...(c.items || []), updatedItem]
          };
        }
        return c;
      });
    }

    handleSaveClassifications(nextList, `Item proyek "${updatedItem.name}" berhasil diperbarui!`);
    setEditingItem(null);
  };

  const handleDeleteItem = (clsId: string, itemId: string, itemName: string) => {
    setDeleteItemTarget({ clsId, itemId, itemName });
  };

  const confirmDeleteItem = () => {
    if (!deleteItemTarget) return;
    const { clsId, itemId, itemName } = deleteItemTarget;
    const currentList = localSettings.project_classifications && localSettings.project_classifications.length > 0
      ? localSettings.project_classifications
      : DEFAULT_PROJECT_CLASSIFICATIONS;

    const nextList = currentList.map(c => {
      if (c.id === clsId) {
        return {
          ...c,
          items: (c.items || []).filter(it => it.id !== itemId && it.name !== itemName)
        };
      }
      return c;
    });

    handleSaveClassifications(nextList, `Item proyek "${itemName}" telah dihapus.`);
    setDeleteItemTarget(null);
  };

  const handleResetToDefaultClassifications = () => {
    setIsResetClsConfirmOpen(true);
  };

  const confirmResetToDefaultClassifications = () => {
    handleSaveClassifications(DEFAULT_PROJECT_CLASSIFICATIONS, "Semua klasifikasi & proyek berhasil dikembalikan ke standar WIC!");
    setIsResetClsConfirmOpen(false);
  };

  const handleDownloadProjectCSVTemplate = () => {
    const currentList = localSettings.project_classifications && localSettings.project_classifications.length > 0
      ? localSettings.project_classifications
      : DEFAULT_PROJECT_CLASSIFICATIONS;

    const rows = ["Klasifikasi,Nama Proyek,Fee,Deskripsi"];
    currentList.forEach(c => {
      (c.items || []).forEach(it => {
        rows.push(`"${c.name.replace(/"/g, '""')}","${it.name.replace(/"/g, '""')}",${it.defaultFee},"${(it.description || '').replace(/"/g, '""')}"`);
      });
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Daftar_Klasifikasi_Proyek_WIC.csv";
    link.click();
    showToast("File data klasifikasi & proyek CSV berhasil diunduh!", "info");
  };

  const handleCSVProjectsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        if (!rows || rows.length === 0) {
          showToast("Format CSV tidak sesuai atau file kosong.", "error");
          return;
        }

        const currentList = JSON.parse(JSON.stringify(
          localSettings.project_classifications && localSettings.project_classifications.length > 0
            ? localSettings.project_classifications
            : DEFAULT_PROJECT_CLASSIFICATIONS
        )) as ProjectClassification[];

        let addedCount = 0;
        let updatedCount = 0;

        rows.forEach(r => {
          const clsName = (r['Klasifikasi'] || r['kategori'] || r['Kategori'] || r['Classification'] || r['classification'] || 'Modul').toString().trim();
          const itemName = (r['Nama Proyek'] || r['nama'] || r['Name'] || r['Proyek'] || r['name'] || r['Jenis Proyek'] || '').toString().trim();
          const feeRaw = r['Fee'] || r['fee'] || r['Honor'] || r['Tarif'] || r['Biaya'] || r['insentif'] || 0;
          const fee = Number(String(feeRaw || '').replace(/[^0-9]/g, '')) || 0;
          const desc = (r['Deskripsi'] || r['desc'] || r['Keterangan'] || '').toString().trim();

          if (!itemName) return;

          let clsObj = currentList.find(c => c.name.toLowerCase() === clsName.toLowerCase());
          if (!clsObj) {
            clsObj = {
              id: `cls-csv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: clsName,
              badgeColor: 'from-blue-600 to-indigo-700',
              description: `Program klasifikasi ${clsName}`,
              items: []
            };
            currentList.push(clsObj);
          }

          clsObj.items = clsObj.items || [];
          const existingItemIdx = clsObj.items.findIndex(it => it.name.toLowerCase() === itemName.toLowerCase());
          if (existingItemIdx >= 0) {
            clsObj.items[existingItemIdx].defaultFee = fee;
            if (desc) clsObj.items[existingItemIdx].description = desc;
            updatedCount++;
          } else {
            clsObj.items.push({
              id: `item-csv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: itemName,
              defaultFee: fee,
              description: desc
            });
            addedCount++;
          }
        });

        handleSaveClassifications(currentList, `Impor CSV berhasil: ${addedCount} proyek baru ditambah, ${updatedCount} fee diperbarui!`);
        e.target.value = '';
      },
      error: () => {
        showToast("Gagal membaca file CSV proyek.", "error");
      }
    });
  };

  // --- QUOTES CSV IMPORT & MANAGEMENT ---
  const handleCSVQuotesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedQuotes: QuoteItem[] = [];
          
          results.data.forEach((row: any, idx) => {
            const text = (
              row.quote || 
              row.Quote || 
              row.QUOTES || 
              row.kata_mutiara || 
              row.Text || 
              row.text || 
              Object.values(row)[0]
            )?.toString().trim();

            const author = (
              row.author || 
              row.Author || 
              row.penulis || 
              row.tokoh || 
              "Inspirasi WIC"
            )?.toString().trim();

            const category = (
              row.kategori || 
              row.category || 
              row.Category || 
              "Motivasi"
            )?.toString().trim();

            if (text && text.length > 3) {
              parsedQuotes.push({
                id: `q-csv-${Date.now()}-${idx}`,
                text,
                author,
                category
              });
            }
          });

          if (parsedQuotes.length === 0) {
            showToast("Tidak ada quote valid yang ditemukan dalam file CSV.", "error");
            return;
          }

          // Combine with existing list
          const combined = [...parsedQuotes, ...(localSettings.quotes_list || [])];
          
          // Set current quote to the first one from CSV
          const updated: Settings = {
            ...localSettings,
            quote: parsedQuotes[0].text,
            quotes_list: combined
          };

          setLocalSettings(updated);
          handleSaveAll(updated);
          showToast(`Berhasil mengimpor ${parsedQuotes.length} quotes dari CSV dan mengaktifkan quote utama!`, "success");
        } catch (err) {
          console.error(err);
          showToast("Gagal memproses file CSV.", "error");
        }
      },
      error: () => {
        showToast("Terjadi kesalahan pembacaan CSV.", "error");
      }
    });

    e.target.value = '';
  };

  const handleDownloadCSVTemplate = () => {
    const template = "quote,author,kategori\n" +
      "\"Masa depan adalah milik mereka yang percaya pada keindahan mimpi mereka.\",\"Eleanor Roosevelt\",\"Inspirasi\"\n" +
      "\"Pendidikan adalah senjata paling mematikan di dunia, karena dengan pendidikan Anda dapat mengubah dunia.\",\"Nelson Mandela\",\"Edukasi\"\n" +
      "\"Belajar tanpa berpikir itu sia-sia, berpikir tanpa belajar itu sangatlah berbahaya.\",\"Konfusius\",\"Motivasi\"\n";

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Template_Quotes_WIC.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectQuote = (q: QuoteItem) => {
    const updated = { ...localSettings, quote: q.text };
    setLocalSettings(updated);
    handleSaveAll(updated);
    showToast("Quote aktif dasbor berhasil diganti!", "success");
  };

  const handleRandomizeQuote = () => {
    const list = localSettings.quotes_list || [];
    if (list.length === 0) {
      showToast("Belum ada daftar quote yang tersedia.", "info");
      return;
    }
    const rand = list[Math.floor(Math.random() * list.length)];
    const updated = { ...localSettings, quote: rand.text };
    setLocalSettings(updated);
    handleSaveAll(updated);
    showToast("Quote aktif diacak dari database!", "success");
  };

  const handleAddManualQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteText.trim()) return;

    const newQ: QuoteItem = {
      id: 'q-manual-' + Date.now(),
      text: newQuoteText.trim(),
      author: newQuoteAuthor.trim() || 'WIC Leadership',
      category: 'Manual'
    };

    const nextList = [newQ, ...(localSettings.quotes_list || [])];
    const updated = {
      ...localSettings,
      quote: newQ.text,
      quotes_list: nextList
    };

    setLocalSettings(updated);
    handleSaveAll(updated);
    setNewQuoteText('');
    setNewQuoteAuthor('WIC Leadership');
    showToast("Quote baru ditambahkan dan langsung aktif!", "success");
  };

  const handleDeleteQuote = (id: string) => {
    const nextList = (localSettings.quotes_list || []).filter(q => q.id !== id);
    const updated = { ...localSettings, quotes_list: nextList };
    setLocalSettings(updated);
    handleSaveAll(updated);
    showToast("Quote berhasil dihapus dari daftar.", "info");
  };

  // --- AI BROADCASTER ACTIONS ---
  const handleGenerateScript = async () => {
    setIsGenerating(true);
    const script = await generateWABroadcast(waTopic, waStyle, localSettings.period_text);
    setWaScript(script);
    setIsGenerating(false);
  };

  const handlePersonalPolish = async () => {
    if (!personalTarget || !personalContent) return;
    setIsPolishing(true);
    const target = tutors.find(t => t.wa === personalTarget);
    const script = await generateIndividualMessage(target?.name || 'Tutor', personalGender, personalContent, personalStyle);
    setPersonalPolished(script);
    setIsPolishing(false);
  };

  const handleSendWA = () => {
    if (!waScript) return;
    if (waTarget === 'ALL') {
       alert("Membuka multiple tab WhatsApp mungkin diblokir browser. Disarankan mengirim satu per satu via daftar tutor.");
       return;
    }
    const tutor = tutors.find(t => t.wa === waTarget);
    const personalized = waScript.replace(/\[NAMA\]/g, tutor?.name.split(' ')[0] || 'Tutor');
    window.open(`https://wa.me/${waTarget}?text=${encodeURIComponent(personalized)}`, '_blank');
  };

  const handleSendPersonalWA = () => {
    if (!personalPolished || !personalTarget) return;
    window.open(`https://wa.me/${personalTarget}?text=${encodeURIComponent(personalPolished)}`, '_blank');
  };

  const tutorCount = tutors.filter(t => t.role === 'TUTOR').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-emerald-950 text-gold-400 rounded-2xl shadow-md">
              <SettingsIcon size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Pengaturan Sistem Dinamis</h2>
              <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                Full Custom Transaksi Honor, Sistem Mengajar, Quotes CSV & Master Tutor
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Sistem kini sepenuhnya dinamis tanpa nilai baku (DNA melekat). Anda dapat menambah, mengubah, dan menghapus skema honorium (Mandiri, Team, Private -10%, Semi Private temporal), proyek, kutipan inspirasi, serta data tutor dengan sinkronisasi instan ke Firebase Firestore.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {onOpenBackupRecovery && (
            <button 
              type="button"
              onClick={onOpenBackupRecovery}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-5 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-wider transition flex items-center gap-2 shadow-sm"
            >
              <ShieldCheck size={16} className="text-emerald-700" /> Pusat Backup & Recovery
            </button>
          )}
          <button 
            onClick={() => handleSaveAll()}
            className="flex-1 md:flex-initial bg-emerald-950 text-gold-400 px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-emerald-900 transition flex items-center justify-center gap-2"
          >
            <Save size={16} /> Simpan Semua Perubahan
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 pb-1 custom-scroll">
        <button
          onClick={() => setActiveTab('HONOR')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-tight transition whitespace-nowrap ${
            activeTab === 'HONOR'
              ? 'bg-emerald-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Coins size={16} /> Sistem Pengajaran & Honor ({localSettings.honor_rates?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('PROJECTS')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-tight transition whitespace-nowrap ${
            activeTab === 'PROJECTS'
              ? 'bg-emerald-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <FolderGit2 size={16} /> Jenis Proyek & Fee ({localSettings.project_types?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('QUOTES')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-tight transition whitespace-nowrap ${
            activeTab === 'QUOTES'
              ? 'bg-emerald-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Quote size={16} /> Quotes CSV ({localSettings.quotes_list?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('BASIC')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-tight transition whitespace-nowrap ${
            activeTab === 'BASIC'
              ? 'bg-emerald-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <SettingsIcon size={16} /> Konfigurasi Dasar & TTD
        </button>

        <button
          onClick={() => setActiveTab('BROADCAST')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-tight transition whitespace-nowrap ${
            activeTab === 'BROADCAST'
              ? 'bg-emerald-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <MessageSquare size={16} /> WhatsApp AI Broadcaster
        </button>
      </div>

      {/* TAB 1: HONOR RATES & TEACHING MODES MANAGEMENT */}
      {activeTab === 'HONOR' && (
        <div className="space-y-6">
          
          {/* SPECIAL SECTION: SISTEM PENGAJARAN KHUSUS (SEMI PRIVATE & PRIVATE) */}
          <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-5 mb-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-gold-400 text-slate-950 rounded-xl font-black">
                      <Award size={18} />
                    </span>
                    <h3 className="font-black text-lg uppercase tracking-tight text-gold-300">
                      Sistem Pengajaran & Program Khusus (Semi Private & Private)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Atur aksesibilitas mode pengajaran untuk tutor. Sistem kini mendukung 4 mode: 
                    <strong className="text-white"> Mandiri</strong>, 
                    <strong className="text-white"> Team Teaching</strong>, 
                    <strong className="text-gold-300"> Private (Fee Mandiri - 10%)</strong>, dan 
                    <strong className="text-emerald-300"> Semi Private (Temporal & Modul Materi)</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAutoRecalculatePrivate}
                    className="bg-white/10 hover:bg-gold-500 hover:text-slate-950 text-gold-300 px-4 py-2 rounded-xl font-bold uppercase text-[10px] tracking-wider transition flex items-center gap-2 border border-white/10"
                    title="Hitung ulang seluruh honor Private menjadi tepat 90% dari Mandiri (-10%)"
                  >
                    <RefreshCw size={14} /> Sinkron Private (-10%)
                  </button>
                </div>
              </div>

              {/* Grid 3 Control Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Saklar Temporal Semi Private */}
                <div className="bg-white/10 p-5 rounded-2xl border border-white/10 backdrop-blur-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-gold-300 tracking-wider flex items-center gap-1.5">
                      <BookOpen size={14} /> Program Semi Private
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...localSettings, enable_semi_private: !localSettings.enable_semi_private };
                        setLocalSettings(updated);
                        handleSaveAll(updated);
                        showToast(`Program Semi Private kini ${updated.enable_semi_private ? 'DIBUKA' : 'DITUTUP SEMENTARA'} untuk tutor!`, 'info');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase transition ${
                        localSettings.enable_semi_private 
                          ? 'bg-emerald-500 text-slate-950 shadow-md' 
                          : 'bg-red-500/80 text-white'
                      }`}
                    >
                      {localSettings.enable_semi_private ? (
                        <><ToggleRight size={16} /> AKTIF (DIBUKA)</>
                      ) : (
                        <><ToggleLeft size={16} /> NONAKTIF (DITUTUP)</>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    Saklar temporal Master Admin untuk memunculkan atau menyembunyikan pilihan <em>Semi Private</em> di form input jurnal tutor.
                  </p>
                </div>

                {/* 2. Filter Kualifikasi Tutor Tersertifikasi */}
                <div className="bg-white/10 p-5 rounded-2xl border border-white/10 backdrop-blur-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider flex items-center gap-1.5">
                      <Award size={14} /> Kualifikasi Ijazah
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...localSettings, semi_private_certified_only: !localSettings.semi_private_certified_only };
                        setLocalSettings(updated);
                        handleSaveAll(updated);
                        showToast(`Opsi Semi Private kini ${updated.semi_private_certified_only ? 'DIBATASI KHUSUS TUTOR TERSERTIFIKASI' : 'DAPAT DIAKSES SEMUA TUTOR'}!`, 'info');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase transition ${
                        localSettings.semi_private_certified_only 
                          ? 'bg-gold-400 text-slate-950 font-black' 
                          : 'bg-white/20 text-slate-200'
                      }`}
                    >
                      {localSettings.semi_private_certified_only ? 'KHUSUS TERSERTIFIKASI' : 'SEMUA TUTOR'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    Jika aktif, hanya tutor yang memiliki status berijazah tersertifikasi (ditandai di Database Tutor) yang dapat memilih mode Semi Private.
                  </p>
                </div>

                {/* 3. Honor Pembuatan Modul Materi Baru */}
                <div className="bg-white/10 p-5 rounded-2xl border border-white/10 backdrop-blur-sm space-y-2">
                  <span className="text-[10px] font-black uppercase text-gold-300 tracking-wider flex items-center gap-1.5">
                    <Coins size={14} /> Honor Modul Materi Baru
                  </span>
                  <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-2 rounded-xl border border-white/10">
                    <span className="text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      min={0}
                      step={5000}
                      value={localSettings.semi_private_module_bonus || 25000}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        const updated = { ...localSettings, semi_private_module_bonus: val };
                        setLocalSettings(updated);
                      }}
                      className="bg-transparent border-none text-white font-mono font-black text-sm outline-none w-full"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Kompensasi otomatis jika tutor Semi Private sekaligus menyusun modul materi ajar baru.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN TABLE: CUSTOM HONOR RATES PER STATUS */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <Coins className="text-emerald-700" size={20} />
                  <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">
                    Tabel Skema Tarif Honorium Dinamis (Mandiri, Team, Private, Semi Private)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Atur atau tambahkan status tutor baru. Sesi Private otomatis terhitung Mandiri - 10%, dan Semi Private dapat memiliki tarif khusus.
                </p>
              </div>

              {onNavigateToTutors && (
                <button
                  onClick={onNavigateToTutors}
                  className="bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition border border-slate-200 flex items-center gap-2"
                >
                  <Users size={14} /> Kelola {tutorCount} Tutor Terdaftar
                </button>
              )}
            </div>

            {/* List of current honor rates */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4">Nama Status / Level Honor</th>
                    <th className="px-5 py-4">Mandiri (Rp)</th>
                    <th className="px-5 py-4">Team (Rp)</th>
                    <th className="px-5 py-4">Private (-10%) (Rp)</th>
                    <th className="px-5 py-4">Semi Private (Rp)</th>
                    <th className="px-5 py-4 text-center">Tutor</th>
                    <th className="px-5 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {(localSettings.honor_rates || []).map((rate) => {
                    const tutorUsage = tutors.filter(t => t.status_tutor === rate.name).length;
                    const calculatedPrivate = rate.private !== undefined ? rate.private : Math.round(rate.mandiri * 0.9);
                    const calculatedSemiPrivate = rate.semi_private !== undefined ? rate.semi_private : rate.mandiri;

                    return (
                      <tr key={rate.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-4">
                          <input
                            type="text"
                            value={rate.name}
                            onChange={(e) => handleUpdateHonorRate(rate.id, 'name', e.target.value)}
                            className="bg-transparent border border-transparent hover:border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-2 py-1 text-xs font-black uppercase text-slate-800 outline-none w-full max-w-[240px]"
                            placeholder="Nama Status..."
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 w-32">
                            <span className="text-[10px] font-bold text-slate-400">Rp</span>
                            <input
                              type="number"
                              value={rate.mandiri}
                              onChange={(e) => handleUpdateHonorRate(rate.id, 'mandiri', e.target.value)}
                              className="w-full bg-transparent border-none outline-none text-xs font-mono font-black text-emerald-700"
                            />
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 w-32">
                            <span className="text-[10px] font-bold text-slate-400">Rp</span>
                            <input
                              type="number"
                              value={rate.team}
                              onChange={(e) => handleUpdateHonorRate(rate.id, 'team', e.target.value)}
                              className="w-full bg-transparent border-none outline-none text-xs font-mono font-black text-amber-700"
                            />
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 w-32">
                            <span className="text-[10px] font-bold text-slate-400">Rp</span>
                            <input
                              type="number"
                              value={calculatedPrivate}
                              onChange={(e) => handleUpdateHonorRate(rate.id, 'private', e.target.value)}
                              className="w-full bg-transparent border-none outline-none text-xs font-mono font-black text-purple-700"
                              title="Fee Private default dihitung dari Mandiri - 10%"
                            />
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 w-32">
                            <span className="text-[10px] font-bold text-slate-400">Rp</span>
                            <input
                              type="number"
                              value={calculatedSemiPrivate}
                              onChange={(e) => handleUpdateHonorRate(rate.id, 'semi_private', e.target.value)}
                              className="w-full bg-transparent border-none outline-none text-xs font-mono font-black text-blue-700"
                            />
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold">
                            {tutorUsage} Tutor
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => handleDeleteHonorRate(rate.id, rate.name)}
                            className="p-2 text-slate-300 hover:text-red-600 rounded-lg transition"
                            title="Hapus Skema Honor"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Form Add New Honor Rate */}
            <form onSubmit={handleAddHonorRate} className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
              <h4 className="font-black text-emerald-950 uppercase text-xs mb-3 flex items-center gap-2">
                <Plus size={16} /> Tambah Level Honor Baru
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Nama Status
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Senior Tersertifikasi"
                    value={newHonorName}
                    onChange={(e) => setNewHonorName(e.target.value)}
                    className="input-premium py-2.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Mandiri (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={newHonorMandiri}
                    onChange={(e) => handleMandiriAddChange(Number(e.target.value))}
                    className="input-premium py-2.5 text-xs font-mono font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Team (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={newHonorTeam}
                    onChange={(e) => setNewHonorTeam(Number(e.target.value))}
                    className="input-premium py-2.5 text-xs font-mono font-bold text-amber-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Private (-10%) (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={newHonorPrivate}
                    onChange={(e) => setNewHonorPrivate(Number(e.target.value))}
                    className="input-premium py-2.5 text-xs font-mono font-bold text-purple-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Semi Private (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={newHonorSemiPrivate}
                    onChange={(e) => setNewHonorSemiPrivate(Number(e.target.value))}
                    className="input-premium py-2.5 text-xs font-mono font-bold text-blue-800"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-emerald-950 text-gold-400 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-emerald-900 transition flex items-center gap-2 shadow-md"
                >
                  <Plus size={14} /> Simpan Level Honor Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: PROJECTS MANAGEMENT - MANAJEMEN JENIS TRANSAKSI PROYEK & FEE */}
      {activeTab === 'PROJECTS' && (() => {
        const classList: ProjectClassification[] = localSettings.project_classifications && localSettings.project_classifications.length > 0
          ? localSettings.project_classifications
          : DEFAULT_PROJECT_CLASSIFICATIONS;

        const totalItemsCount = classList.reduce((acc, c) => acc + (c.items?.length || 0), 0);
        const avgFee = totalItemsCount > 0 
          ? Math.round(classList.reduce((acc, c) => acc + (c.items || []).reduce((sum, it) => sum + (it.defaultFee || 0), 0), 0) / totalItemsCount) 
          : 0;

        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Main Actions */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-blue-50 text-blue-700 rounded-2xl">
                      <FolderGit2 size={24} />
                    </span>
                    <div>
                      <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg sm:text-xl">
                        Manajemen Jenis Transaksi Proyek & Fee
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Kustomisasi penuh klasifikasi, item jenis pekerjaan, insentif fee, dan tugas tutor. Seluruh proyek bawaan maupun baru dapat diedit dan dihapus secara bebas.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setNewClsName('');
                      setNewClsDesc('');
                      setNewClsBadge('from-blue-600 to-indigo-700');
                      setIsAddClassificationModalOpen(true);
                    }}
                    className="bg-emerald-950 hover:bg-emerald-900 text-gold-400 px-4 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-wider transition flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <FolderPlus size={15} /> + Tambah Klasifikasi
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetClsIdForNewItem(classList[0]?.id || '');
                      setNewItemName('');
                      setNewItemFee(35000);
                      setNewItemDesc('');
                      setIsAddItemModalOpen(true);
                    }}
                    className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-wider transition flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Plus size={15} /> + Tambah Item Proyek
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadProjectCSVTemplate}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 cursor-pointer"
                    title="Unduh daftar klasifikasi & proyek ke CSV"
                  >
                    <Download size={14} /> Unduh CSV
                  </button>

                  <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 cursor-pointer">
                    <FileUp size={14} /> Impor CSV
                    <input 
                      type="file" 
                      accept=".csv,text/csv" 
                      onChange={handleCSVProjectsUpload} 
                      className="hidden" 
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleResetToDefaultClassifications}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 cursor-pointer"
                    title="Kembalikan semua proyek ke konfigurasi default WIC"
                  >
                    <RotateCcw size={14} /> Reset Standar WIC
                  </button>
                </div>
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Klasifikasi</span>
                  <p className="text-xl font-black text-slate-800 mt-0.5">{classList.length} Kategori</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Jenis Proyek</span>
                  <p className="text-xl font-black text-blue-900 mt-0.5">{totalItemsCount} Item Pekerjaan</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rata-rata Fee Proyek</span>
                  <p className="text-xl font-mono font-black text-emerald-700 mt-0.5">{formatCurrency(avgFee)}</p>
                </div>
              </div>
            </div>

            {/* List of Classifications Cards */}
            <div className="space-y-6">
              {classList.map((cls) => {
                const badgeGradient = cls.badgeColor || 'from-blue-600 to-indigo-700';

                return (
                  <div key={cls.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:border-slate-300">
                    {/* Classification Header */}
                    <div className="p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-start sm:items-center gap-3.5">
                        <span className={cn("px-3.5 py-1.5 rounded-xl text-white font-black text-xs uppercase tracking-wider shadow-xs bg-gradient-to-r", badgeGradient)}>
                          {cls.name}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-800 uppercase tracking-tight text-base">
                              Klasifikasi: {cls.name}
                            </h4>
                            <span className="text-[10px] font-bold bg-white px-2.5 py-0.5 rounded-full border border-slate-200 text-slate-600">
                              {cls.items?.length || 0} Proyek
                            </span>
                          </div>
                          {cls.description && (
                            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                              {cls.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setTargetClsIdForNewItem(cls.id);
                            setNewItemName('');
                            setNewItemFee(35000);
                            setNewItemDesc('');
                            setIsAddItemModalOpen(true);
                          }}
                          className="bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Plus size={13} /> + Item Proyek
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingClassification(cls)}
                          className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Edit nama, deskripsi, & warna badge klasifikasi"
                        >
                          <Edit3 size={13} /> Edit Klasifikasi
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteClassification(cls.id, cls.name)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                          title="Hapus seluruh klasifikasi ini"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Classification Project Items */}
                    <div className="p-6">
                      {(!cls.items || cls.items.length === 0) ? (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <p className="text-xs font-bold text-slate-500">
                            Belum ada jenis proyek pada klasifikasi "{cls.name}".
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetClsIdForNewItem(cls.id);
                              setNewItemName('');
                              setNewItemFee(35000);
                              setNewItemDesc('');
                              setIsAddItemModalOpen(true);
                            }}
                            className="mt-3 bg-emerald-900 text-white px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-emerald-800 transition inline-flex items-center gap-1.5 cursor-pointer shadow"
                          >
                            <Plus size={13} /> Tambah Proyek Pertama
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {cls.items.map((item) => (
                            <div 
                              key={item.id}
                              className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200 transition group"
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                                  <h5 className="font-black text-xs uppercase text-slate-800 tracking-tight truncate">
                                    {item.name}
                                  </h5>
                                </div>
                                {item.description && (
                                  <p className="text-[11px] text-slate-500 mt-1 pl-4 line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
                                {/* Editable Fee Pill */}
                                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                  <span className="text-[10px] font-black text-slate-400">Rp</span>
                                  <input 
                                    type="number" 
                                    value={item.defaultFee} 
                                    min={0}
                                    step={1000}
                                    onChange={(e) => handleUpdateItemInline(cls.id, item.id, 'defaultFee', e.target.value)}
                                    className="w-28 bg-transparent border-none outline-none text-xs font-mono font-black text-emerald-700"
                                    title="Ubah fee proyek langsung di sini"
                                  />
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingItem({ 
                                      classificationId: cls.id, 
                                      targetClassificationId: cls.id, 
                                      item: { ...item } 
                                    })}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition cursor-pointer"
                                    title="Edit rincian item proyek"
                                  >
                                    <Edit3 size={15} />
                                  </button>

                                  <button 
                                    type="button"
                                    onClick={() => handleDeleteItem(cls.id, item.id, item.name)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition cursor-pointer"
                                    title="Hapus item proyek ini"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MODAL 1: Tambah Klasifikasi Baru */}
            {isAddClassificationModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95">
                  <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <FolderPlus className="text-emerald-700" size={20} />
                      <h3 className="font-black text-slate-800 uppercase text-base">Tambah Klasifikasi Baru</h3>
                    </div>
                    <button 
                      onClick={() => setIsAddClassificationModalOpen(false)}
                      className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateClassification} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                        Nama Klasifikasi
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="Contoh: Media Pembelajaran / Riset & Kurikulum"
                        value={newClsName}
                        onChange={(e) => setNewClsName(e.target.value)}
                        className="input-premium py-2.5 text-xs font-bold w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                        Warna & Gaya Badge
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {BADGE_COLOR_OPTIONS.map((col, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setNewClsBadge(col.value)}
                            className={cn(
                              "p-2.5 rounded-xl text-left border flex items-center gap-2 transition cursor-pointer text-xs font-bold",
                              newClsBadge === col.value ? "border-slate-800 bg-slate-50 shadow-xs" : "border-slate-200 hover:bg-slate-50"
                            )}
                          >
                            <span className={cn("w-4 h-4 rounded-full shadow-xs shrink-0", col.bg)}></span>
                            <span className="text-[10px] text-slate-700 truncate">{col.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                        Deskripsi / Panduan Singkat Klasifikasi
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Keterangan cakupan penugasan dan output proyek..."
                        value={newClsDesc}
                        onChange={(e) => setNewClsDesc(e.target.value)}
                        className="input-premium py-2 text-xs w-full resize-none font-medium"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsAddClassificationModalOpen(false)}
                        className="px-4 py-2.5 rounded-xl font-bold uppercase text-[11px] text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="bg-emerald-950 text-gold-400 px-6 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-wider hover:bg-emerald-900 transition flex items-center gap-2 shadow cursor-pointer"
                      >
                        <Plus size={15} /> Buat Klasifikasi
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL 2: Edit Klasifikasi */}
            {editingClassification && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95">
                  <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Edit3 className="text-blue-600" size={20} />
                      <h3 className="font-black text-slate-800 uppercase text-base">Edit Klasifikasi</h3>
                    </div>
                    <button 
                      onClick={() => setEditingClassification(null)}
                      className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditClassification} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                        Nama Klasifikasi
                      </label>
                      <input 
                        type="text"
                        required
                        value={editingClassification.name}
                        onChange={(e) => setEditingClassification({ ...editingClassification, name: e.target.value })}
                        className="input-premium py-2.5 text-xs font-bold w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                        Warna & Gaya Badge
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {BADGE_COLOR_OPTIONS.map((col, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEditingClassification({ ...editingClassification, badgeColor: col.value })}
                            className={cn(
                              "p-2.5 rounded-xl text-left border flex items-center gap-2 transition cursor-pointer text-xs font-bold",
                              editingClassification.badgeColor === col.value ? "border-slate-800 bg-slate-50 shadow-xs" : "border-slate-200 hover:bg-slate-50"
                            )}
                          >
                            <span className={cn("w-4 h-4 rounded-full shadow-xs shrink-0", col.bg)}></span>
                            <span className="text-[10px] text-slate-700 truncate">{col.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                        Deskripsi / Panduan Singkat Klasifikasi
                      </label>
                      <textarea
                        rows={2}
                        value={editingClassification.description}
                        onChange={(e) => setEditingClassification({ ...editingClassification, description: e.target.value })}
                        className="input-premium py-2 text-xs w-full resize-none font-medium"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingClassification(null)}
                        className="px-4 py-2.5 rounded-xl font-bold uppercase text-[11px] text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-900 text-white px-6 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-wider hover:bg-blue-800 transition flex items-center gap-2 shadow cursor-pointer"
                      >
                        <Save size={15} /> Simpan Perubahan
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL 3: Tambah Item Proyek Baru */}
            {isAddItemModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95">
                  <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Plus className="text-emerald-700" size={20} />
                      <h3 className="font-black text-slate-800 uppercase text-base">Tambah Item Proyek Baru</h3>
                    </div>
                    <button 
                      onClick={() => setIsAddItemModalOpen(false)}
                      className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateItem} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                        Pilih Klasifikasi Proyek
                      </label>
                      <select
                        value={classList.some(c => c.id === targetClsIdForNewItem) ? targetClsIdForNewItem : (classList[0]?.id || '')}
                        onChange={(e) => setTargetClsIdForNewItem(e.target.value)}
                        className="input-premium py-2.5 text-xs font-bold w-full cursor-pointer"
                      >
                        {classList.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.items?.length || 0} Proyek)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                        Nama Jenis / Pekerjaan Proyek
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="Contoh: Pembuatan Bank Soal Ujian Semester"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="input-premium py-2.5 text-xs font-bold w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                        Kompensasi Fee (Rp)
                      </label>
                      <input 
                        type="number"
                        required
                        min={0}
                        step={5000}
                        value={newItemFee}
                        onChange={(e) => setNewItemFee(Number(e.target.value))}
                        className="input-premium py-2.5 text-xs font-mono font-bold text-emerald-800 w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                        Deskripsi Tugas / Output
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Keterangan standar hasil kerja dan bukti penugasan..."
                        value={newItemDesc}
                        onChange={(e) => setNewItemDesc(e.target.value)}
                        className="input-premium py-2 text-xs w-full resize-none font-medium"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsAddItemModalOpen(false)}
                        className="px-4 py-2.5 rounded-xl font-bold uppercase text-[11px] text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="bg-emerald-950 text-gold-400 px-6 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-wider hover:bg-emerald-900 transition flex items-center gap-2 shadow cursor-pointer"
                      >
                        <Plus size={15} /> Tambah Item Proyek
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL 4: Edit Item Proyek */}
            {editingItem && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95">
                  <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Edit3 className="text-blue-600" size={20} />
                      <h3 className="font-black text-slate-800 uppercase text-base">Edit Item Proyek</h3>
                    </div>
                    <button 
                      onClick={() => setEditingItem(null)}
                      className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditItemModal} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                        Klasifikasi Proyek
                      </label>
                      <select
                        value={editingItem.targetClassificationId}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          targetClassificationId: e.target.value
                        })}
                        className="input-premium py-2.5 text-xs font-bold w-full cursor-pointer"
                      >
                        {classList.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.items?.length || 0} Proyek)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                        Nama Jenis / Pekerjaan Proyek
                      </label>
                      <input 
                        type="text"
                        required
                        value={editingItem.item.name}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          item: { ...editingItem.item, name: e.target.value }
                        })}
                        className="input-premium py-2.5 text-xs font-bold w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                        Kompensasi Fee (Rp)
                      </label>
                      <input 
                        type="number"
                        required
                        min={0}
                        step={5000}
                        value={editingItem.item.defaultFee}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          item: { ...editingItem.item, defaultFee: Number(e.target.value) }
                        })}
                        className="input-premium py-2.5 text-xs font-mono font-bold text-emerald-800 w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                        Deskripsi Tugas / Output
                      </label>
                      <textarea
                        rows={2}
                        value={editingItem.item.description || ''}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          item: { ...editingItem.item, description: e.target.value }
                        })}
                        className="input-premium py-2 text-xs w-full resize-none font-medium"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingItem(null)}
                        className="px-4 py-2.5 rounded-xl font-bold uppercase text-[11px] text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-900 text-white px-6 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-wider hover:bg-blue-800 transition flex items-center gap-2 shadow cursor-pointer"
                      >
                        <Save size={15} /> Simpan Perubahan
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL 5: Konfirmasi Hapus Klasifikasi (In-App Dialog) */}
            {deleteClsTarget && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95">
                  <div className="flex items-center gap-3 text-rose-600 mb-4">
                    <div className="p-3 bg-rose-50 rounded-2xl">
                      <Trash2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 uppercase text-base">Hapus Klasifikasi Proyek?</h3>
                      <p className="text-xs text-rose-600 font-bold">Tindakan ini permanen</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                    Yakin ingin menghapus klasifikasi <strong className="text-slate-800 font-black">"{deleteClsTarget.name}"</strong> beserta seluruh jenis proyek di dalamnya?
                  </p>
                  <div className="flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDeleteClsTarget(null)}
                      className="px-4 py-2.5 rounded-xl font-bold uppercase text-[11px] text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteClassification}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-wider transition shadow cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Ya, Hapus Klasifikasi
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL 6: Konfirmasi Hapus Item Proyek (In-App Dialog) */}
            {deleteItemTarget && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95">
                  <div className="flex items-center gap-3 text-rose-600 mb-4">
                    <div className="p-3 bg-rose-50 rounded-2xl">
                      <Trash2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 uppercase text-base">Hapus Item Proyek?</h3>
                      <p className="text-xs text-rose-600 font-bold">Tindakan ini permanen</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                    Yakin ingin menghapus jenis proyek <strong className="text-slate-800 font-black">"{deleteItemTarget.itemName}"</strong>?
                  </p>
                  <div className="flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDeleteItemTarget(null)}
                      className="px-4 py-2.5 rounded-xl font-bold uppercase text-[11px] text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteItem}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-wider transition shadow cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Ya, Hapus Item
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL 7: Konfirmasi Reset Standar WIC (In-App Dialog) */}
            {isResetClsConfirmOpen && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95">
                  <div className="flex items-center gap-3 text-amber-600 mb-4">
                    <div className="p-3 bg-amber-50 rounded-2xl">
                      <RotateCcw size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 uppercase text-base">Reset Standar WIC?</h3>
                      <p className="text-xs text-amber-600 font-bold">Kembalikan ke konfigurasi bawaan</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                    Kembalikan seluruh klasifikasi dan item proyek ke pengaturan standar bawaan WIC (Modul, Content, Event, Sekolah)? Semua modifikasi kustom saat ini akan diganti.
                  </p>
                  <div className="flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsResetClsConfirmOpen(false)}
                      className="px-4 py-2.5 rounded-xl font-bold uppercase text-[11px] text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={confirmResetToDefaultClassifications}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-wider transition shadow cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw size={14} /> Ya, Reset Standar WIC
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB 3: QUOTES CSV IMPORT & MANAGEMENT */}
      {activeTab === 'QUOTES' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <Quote className="text-purple-600" size={20} />
                  <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">
                    Manajemen Kutipan Inspirasi & Impor CSV
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Unggah file CSV berisi quotes motivasi/edukasi untuk ditampilkan secara dinamis di dasbor Admin dan Tutor.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCSVTemplate}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-bold uppercase text-[10px] tracking-wider transition flex items-center gap-1.5"
                  title="Unduh format template CSV"
                >
                  <Download size={14} /> Unduh Format CSV
                </button>

                <label className="bg-purple-900 hover:bg-purple-800 text-white px-4 py-2 rounded-xl font-bold uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow">
                  <FileUp size={14} /> Impor dari CSV
                  <input 
                    type="file" 
                    accept=".csv,text/csv" 
                    onChange={handleCSVQuotesUpload} 
                    className="hidden" 
                  />
                </label>

                <button
                  type="button"
                  onClick={handleRandomizeQuote}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-3.5 py-2 rounded-xl font-bold uppercase text-[10px] tracking-wider transition flex items-center gap-1.5"
                >
                  <Shuffle size={14} /> Acak Quote Dasbor
                </button>
              </div>
            </div>

            {/* Current Active Quote Display */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-6 rounded-2xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full mb-2 inline-block">
                  Quote Aktif di Dasbor
                </span>
                <p className="text-sm font-bold text-slate-800 italic">
                  "{localSettings.quote}"
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Total Tersimpan: {localSettings.quotes_list?.length || 0}
                </span>
              </div>
            </div>

            {/* Form Add Manual Quote */}
            <form onSubmit={handleAddManualQuote} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-8">
              <h4 className="font-black text-slate-800 uppercase text-xs mb-3 flex items-center gap-2">
                <Plus size={16} /> Tambah Quote Baru Manual
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Teks Kutipan / Mutiara Kata</label>
                  <input 
                    type="text"
                    required
                    placeholder="Masukkan kutipan..."
                    value={newQuoteText}
                    onChange={(e) => setNewQuoteText(e.target.value)}
                    className="input-premium py-2 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Penulis / Tokoh</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Ki Hajar Dewantara"
                    value={newQuoteAuthor}
                    onChange={(e) => setNewQuoteAuthor(e.target.value)}
                    className="input-premium py-2 text-xs font-bold"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button 
                  type="submit" 
                  className="bg-slate-900 text-white px-5 py-2 rounded-xl font-bold uppercase text-[10px] tracking-wider hover:bg-slate-800 transition flex items-center gap-2"
                >
                  <Plus size={14} /> Terapkan & Simpan
                </button>
              </div>
            </form>

            {/* List of Quotes in Database */}
            <div>
              <h4 className="font-black text-slate-800 uppercase text-xs mb-4">
                Daftar Koleksi Quotes ({localSettings.quotes_list?.length || 0})
              </h4>
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto custom-scroll pr-1">
                {(localSettings.quotes_list || []).map((q) => {
                  const isActive = localSettings.quote === q.text;
                  return (
                    <div 
                      key={q.id}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-4 ${
                        isActive 
                          ? 'bg-purple-50/70 border-purple-400 shadow-sm' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                          "{q.text}"
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                          — {q.author || 'Anonim'} {q.category && `• ${q.category}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isActive ? (
                          <span className="bg-purple-600 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Check size={12} /> Aktif
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectQuote(q)}
                            className="bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-900 text-[10px] font-bold uppercase px-3 py-1.5 rounded-xl transition"
                          >
                            Pilih
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteQuote(q.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition"
                          title="Hapus dari database"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BASIC CONFIGURATION & SIGNATURES */}
      {activeTab === 'BASIC' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">
                  Konfigurasi Lembaga, Periode & Otorisasi Dokumen
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atur identitas lembaga, tagline, alamat, periode kalender, sistem penerimaan, dan otorisasi resmi untuk Slip Gaji & E-Invoice.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <ShieldCheck size={13} className="text-emerald-700" /> Sinkron Seluruh Device
              </span>
            </div>
          </div>

          {/* SECTION 1: PROFIL & IDENTITAS RESMI LEMBAGA (KOP SLIP GAJI & INVOICE) */}
          <div className="bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50 p-6 rounded-2xl border border-slate-200/90 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-emerald-800" />
                <h4 className="text-xs font-black uppercase tracking-tight text-slate-800">
                  Identitas Lembaga, Tagline & Kop Dokumen Resmi
                </h4>
              </div>
              <span className="text-[9px] font-mono font-bold text-emerald-900 bg-emerald-100/80 px-2.5 py-0.5 rounded-md">
                Tampil di E-Invoice & Slip Gaji
              </span>
            </div>

            {/* FITUR UPLOAD LOGO RESMI LEMBAGA WIC */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-200/90 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-950 text-gold-400 flex items-center justify-center shrink-0 shadow-sm">
                    <ImageIcon size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                      Logo Resmi Lembaga WIC
                      <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        Presisi &amp; Kuat
                      </span>
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Logo disematkan otomatis ke Kop Dokumen, E-Invoice, Kartu ID Tutor, Rapor Siswa, Navbar, dan Laporan.
                    </p>
                  </div>
                </div>

                <div className="flex bg-slate-100 p-0.5 rounded-xl text-[9px] font-bold border border-slate-200 shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSignInputMode(p => ({ ...p, logo: 'UPLOAD' }))}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      signInputMode.logo === 'UPLOAD' ? 'bg-emerald-950 text-gold-400 font-black shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload size={12} /> Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignInputMode(p => ({ ...p, logo: 'LINK' }))}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      signInputMode.logo === 'LINK' ? 'bg-emerald-950 text-gold-400 font-black shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LinkIcon size={12} /> Link URL
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-5 pt-1">
                {/* Visual Preview Box */}
                <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-emerald-300 bg-gradient-to-br from-slate-50 to-emerald-50/40 flex flex-col items-center justify-center p-2.5 relative group shrink-0 overflow-hidden shadow-inner">
                  <img 
                    src={localSettings.logo_url || WIC_ASSETS.LOGO} 
                    alt="Logo WIC" 
                    className="max-h-full max-w-full object-contain filter drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = EMBEDDED_WIC_LOGO;
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-emerald-950/80 backdrop-blur-xs py-0.5 text-center opacity-0 group-hover:opacity-100 transition">
                    <span className="text-[7.5px] font-bold text-gold-300 uppercase">Pratinjau Aktif</span>
                  </div>
                </div>

                {/* Controls & Input */}
                <div className="flex-1 w-full space-y-3">
                  {signInputMode.logo === 'UPLOAD' ? (
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-700 mb-1.5">
                        Pilih Berkas Logo Baru (PNG Transparan, JPG, WEBP, SVG)
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 border border-slate-300 hover:border-emerald-600 bg-slate-50 hover:bg-emerald-50/40 rounded-xl px-4 py-2.5 text-xs text-slate-600 cursor-pointer flex items-center justify-between transition group shadow-2xs">
                          <span className="font-semibold text-slate-700 truncate text-[11px] flex items-center gap-2">
                            <Upload size={14} className="text-emerald-700 group-hover:scale-110 transition" />
                            Klik untuk Telusuri &amp; Unggah Logo...
                          </span>
                          <span className="text-[9px] bg-emerald-950 text-gold-400 font-bold px-2.5 py-1 rounded-md shrink-0">
                            Pilih Foto
                          </span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleImageUpload('logo_url', e)} 
                            className="hidden" 
                          />
                        </label>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1.5">
                        Ukuran foto otomatis dioptimasi presisi (~15-25 KB) menggunakan canvas browser sehingga tidak membebani database dan aman saat deploy.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-700 mb-1.5">
                        Tautan URL Langsung Berkas Logo
                      </label>
                      <input 
                        type="text" 
                        value={localSettings.logo_url || ''} 
                        onChange={(e) => setLocalSettings({ ...localSettings, logo_url: e.target.value })}
                        className="input-premium font-mono text-xs w-full" 
                        placeholder="https://.../logo-wic.png" 
                      />
                      <p className="text-[9px] text-slate-400 mt-1.5">
                        Masukkan URL gambar beresolusi tinggi dengan link langsung (direct image URL).
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...localSettings, logo_url: WIC_ASSETS.LOGO };
                        setLocalSettings(updated);
                        handleSaveAll(updated);
                        showToast('Logo resmi WIC berhasil dipatenkan dan diterapkan ke seluruh dashboard!', 'success');
                      }}
                      className="text-[10px] font-black text-slate-700 hover:text-emerald-950 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <RotateCcw size={12} /> Gunakan Logo Standar Resmi WIC (Anti-Hilang)
                    </button>

                    {localSettings.logo_url && (
                      <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-emerald-700" /> Logo Resmi Terpasang
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                  Nama Resmi Lembaga
                </label>
                <input 
                  type="text" 
                  value={localSettings.institution_name || ''} 
                  onChange={(e) => setLocalSettings({ ...localSettings, institution_name: e.target.value })}
                  className="input-premium font-bold text-xs" 
                  placeholder="WORTH IT COURSE (WIC)" 
                />
                <p className="text-[9px] text-slate-400 mt-1">Nama utama yang tercetak tebal pada judul dokumen resmi.</p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                  Tagline / Motto Lembaga
                </label>
                <input 
                  type="text" 
                  value={localSettings.institution_tagline || ''} 
                  onChange={(e) => setLocalSettings({ ...localSettings, institution_tagline: e.target.value })}
                  className="input-premium text-xs font-semibold text-emerald-900" 
                  placeholder="Excellence in English & Modern Academic Education" 
                />
                <p className="text-[9px] text-slate-400 mt-1">Slogan atau visi edukasi yang tercetak di bawah nama lembaga.</p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                  Alamat Lengkap Kantor / Kampus Lembaga
                </label>
                <input 
                  type="text" 
                  value={localSettings.institution_address || ''} 
                  onChange={(e) => setLocalSettings({ ...localSettings, institution_address: e.target.value })}
                  className="input-premium text-xs" 
                  placeholder="Jl. Pendidikan Prestasi No. 88, Metro Edu Center, Jambi" 
                />
                <p className="text-[9px] text-slate-400 mt-1">Alamat fisik resmi yang tertera pada invoice dan slip gaji.</p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                  Kontak Resmi / WA Call Center & Email
                </label>
                <input 
                  type="text" 
                  value={localSettings.institution_contact || ''} 
                  onChange={(e) => setLocalSettings({ ...localSettings, institution_contact: e.target.value })}
                  className="input-premium font-mono text-xs" 
                  placeholder="Telp / WA: +62 822-8941-6677 • info@wic.edu" 
                />
                <p className="text-[9px] text-slate-400 mt-1">Saluran kontak administrasi lembaga untuk verifikasi.</p>
              </div>
            </div>

            {/* SISTEM PENERIMAAN INVOICE & GOOGLE DRIVE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200/60">
              {/* Sistem Penerimaan Default */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <CreditCard size={13} className="text-emerald-700" />
                  Sistem Penerimaan Honor Invoice (Default Lembaga)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocalSettings({ ...localSettings, default_payment_method: 'TF' })}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                      (localSettings.default_payment_method || 'TF') === 'TF'
                        ? 'bg-emerald-950 text-gold-400 border-gold-400/40 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <CreditCard size={16} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-tight">Transfer Bank (TF)</p>
                      <p className={`text-[9px] ${ (localSettings.default_payment_method || 'TF') === 'TF' ? 'text-emerald-200' : 'text-slate-400' }`}>
                        Masuk Rekening Tutor
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocalSettings({ ...localSettings, default_payment_method: 'CASH' })}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                      localSettings.default_payment_method === 'CASH'
                        ? 'bg-emerald-950 text-gold-400 border-gold-400/40 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Banknote size={16} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-tight">Tunai (Cash)</p>
                      <p className={`text-[9px] ${ localSettings.default_payment_method === 'CASH' ? 'text-emerald-200' : 'text-slate-400' }`}>
                        Kasir Administrasi WIC
                      </p>
                    </div>
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">
                  Metode default yang otomatis terpilih saat membuka Slip Gaji / E-Invoice resmi.
                </p>
              </div>

              {/* Google Drive Link */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FolderGit2 size={13} className="text-emerald-700" />
                  Google Drive Folder Proyek & Berkas Lembaga
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={localSettings.project_drive_url || ''} 
                    onChange={(e) => setLocalSettings({ ...localSettings, project_drive_url: e.target.value })}
                    className="input-premium font-mono text-xs flex-1" 
                    placeholder="https://drive.google.com/..." 
                  />
                  {localSettings.project_drive_url && (
                    <a
                      href={localSettings.project_drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                      title="Buka Drive"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
                <p className="text-[9px] text-slate-400 mt-1">
                  Folder induk tempat tutor mengunggah file bukti tugas dan proyek.
                </p>
              </div>
            </div>

            {/* LIVE PREVIEW KOP DOKUMEN & INVOICE */}
            <div className="pt-3 border-t border-slate-200/60">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                Pratinjau Kop Dokumen Resmi (Live Preview):
              </span>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 text-center sm:text-left">
                  <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0">
                    <img 
                      src={localSettings.logo_url || WIC_ASSETS.LOGO} 
                      alt="Logo WIC" 
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = EMBEDDED_WIC_LOGO;
                      }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <h5 className="font-serif font-black text-emerald-950 uppercase text-base tracking-tight">
                        {localSettings.institution_name || 'WORTH IT COURSE (WIC)'}
                      </h5>
                      <span className="bg-gold-500/20 text-gold-800 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-gold-500/30">
                        Official
                      </span>
                    </div>
                    <p className="text-[10px] tracking-[0.2em] font-black text-emerald-800 uppercase mt-0.5">
                      {localSettings.institution_tagline || 'Excellence in English & Modern Academic Education'}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-1">
                      {localSettings.institution_address || 'Jl. Pendidikan Prestasi No. 88, Metro Edu Center, Jambi'} • {localSettings.institution_contact || 'Telp / WA: +62 822-8941-6677'}
                    </p>
                  </div>
                </div>
                <div className="text-center sm:text-right shrink-0">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                    (localSettings.default_payment_method || 'TF') === 'TF'
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    {(localSettings.default_payment_method || 'TF') === 'TF' ? <CreditCard size={12} /> : <Banknote size={12} />}
                    Penerimaan: {(localSettings.default_payment_method || 'TF') === 'TF' ? 'Transfer Bank (TF)' : 'Tunai (Cash)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PERIODE BERJALAN & KALENDER DURASI SESI */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2">
              <SettingsIcon size={16} className="text-emerald-700" />
              <h4 className="text-xs font-black uppercase tracking-tight text-slate-800">
                Periode Berjalan & Batas Durasi Kalender Sesi
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Periode ID (YYYY-MM)</label>
                <input 
                  type="text" 
                  value={localSettings.period} 
                  onChange={(e) => setLocalSettings({ ...localSettings, period: e.target.value })}
                  className="input-premium font-mono font-bold text-xs" 
                  placeholder="2026-05" 
                />
                <p className="text-[9px] text-slate-400 mt-1">Kode unik identifikasi bulan dan tahun periode.</p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Label Periode Teks Resmi</label>
                <input 
                  type="text" 
                  value={localSettings.period_text} 
                  onChange={(e) => setLocalSettings({ ...localSettings, period_text: e.target.value })}
                  className="input-premium font-bold text-xs" 
                  placeholder="Mei 2026" 
                />
                <p className="text-[9px] text-slate-400 mt-1">Label teks yang tertulis pada slip gaji dan laporan evaluasi.</p>
              </div>
            </div>

            {/* Durasi Kalender Start & End */}
            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-emerald-950 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-700" />
                  Filter Kalender Sesi Periode Aktif
                </span>
                <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  {localSettings.period_start_date && localSettings.period_end_date 
                    ? `${localSettings.period_start_date} s/d ${localSettings.period_end_date}` 
                    : 'Semua Tanggal Diterima'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-600 mb-1">
                    Tanggal Mulai Periode (Start Date)
                  </label>
                  <input 
                    type="date"
                    value={localSettings.period_start_date || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, period_start_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800 focus:border-emerald-600 outline-none transition shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-600 mb-1">
                    Tanggal Selesai Periode (End Date)
                  </label>
                  <input 
                    type="date"
                    value={localSettings.period_end_date || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, period_end_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800 focus:border-emerald-600 outline-none transition shadow-2xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: OTORISASI DOKUMEN, TTD DIGITAL & STEMPEL RESMI LEMBAGA */}
          <div className="pt-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                  <FileSignature size={16} className="text-emerald-700" />
                  Otorisasi Dokumen, TTD Digital & Stempel Resmi Lembaga
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Foto TTD Direktur, Manajemen Keuangan, dan Stempel resmi tercetak secara simetris dan proporsional pada Slip Gaji, E-Card, dan E-Invoice.
                </p>
              </div>
              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full self-start sm:self-auto">
                Format: PNG Transparan / JPG (Maks 5 MB)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. TTD Direktur Utama */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-700">1. TTD Direktur Utama</span>
                    <div className="flex bg-slate-200 p-0.5 rounded-lg text-[9px] font-bold">
                      <button
                        type="button"
                        onClick={() => setSignInputMode(p => ({ ...p, director: 'UPLOAD' }))}
                        className={`px-2 py-1 rounded-md transition cursor-pointer ${signInputMode.director === 'UPLOAD' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600'}`}
                      >
                        Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignInputMode(p => ({ ...p, director: 'LINK' }))}
                        className={`px-2 py-1 rounded-md transition cursor-pointer ${signInputMode.director === 'LINK' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600'}`}
                      >
                        Link URL
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Nama Direktur Utama</label>
                    <input 
                      type="text" 
                      value={localSettings.director_name} 
                      onChange={(e) => setLocalSettings({...localSettings, director_name: e.target.value})}
                      className="input-premium font-bold text-xs" 
                      placeholder="Khoirul Mahmud, S. Pd., S. Kom." 
                    />
                  </div>

                  {signInputMode.director === 'UPLOAD' ? (
                    <div className="border border-dashed border-emerald-300 hover:border-emerald-500 bg-white p-3 rounded-xl text-center cursor-pointer relative group transition">
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/jpg, image/webp" 
                        onChange={(e) => handleImageUpload('director_sign', e)} 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                      />
                      <div className="flex flex-col items-center justify-center space-y-1 pointer-events-none">
                        <Upload size={16} className="text-emerald-700 group-hover:scale-110 transition" />
                        <p className="text-[10px] font-bold text-slate-700">Klik / Tarik Foto TTD Direktur</p>
                        <p className="text-[8px] text-slate-400">PNG Transparan Disarankan (Auto-Compressed)</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Tautan URL Foto TTD</label>
                      <input 
                        type="url" 
                        value={localSettings.director_sign} 
                        onChange={(e) => setLocalSettings({...localSettings, director_sign: e.target.value})}
                        className="input-premium font-mono text-[10px]" 
                        placeholder="https://..." 
                      />
                    </div>
                  )}
                </div>

                {/* Live Preview Box */}
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase mb-1.5">
                    <span>Preview TTD Direktur:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { 
                          ...localSettings, 
                          director_name: "Khoirul Mahmud, S. Pd., S. Kom.",
                          director_sign: WIC_ASSETS.TTD_DIREKTUR 
                        };
                        setLocalSettings(updated);
                        handleSaveAll(updated);
                        showToast('TTD Direktur resmi berhasil dipatenkan & diterapkan ke seluruh dashboard!', 'success');
                      }}
                      className="text-emerald-700 hover:underline cursor-pointer font-bold"
                    >
                      Patenkan TTD WIC
                    </button>
                  </div>
                  <div className="h-20 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-2 overflow-hidden shadow-inner">
                    {localSettings.director_sign ? (
                      <img 
                        src={localSettings.director_sign} 
                        alt="Preview TTD Direktur" 
                        className="max-h-full max-w-full w-auto object-contain" 
                      />
                    ) : (
                      <span className="text-[9px] text-slate-400 italic">Belum ada foto TTD</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. TTD Manajemen Keuangan WIC */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-700">2. TTD Manajemen Keuangan</span>
                    <div className="flex bg-slate-200 p-0.5 rounded-lg text-[9px] font-bold">
                      <button
                        type="button"
                        onClick={() => setSignInputMode(p => ({ ...p, cfo: 'UPLOAD' }))}
                        className={`px-2 py-1 rounded-md transition cursor-pointer ${signInputMode.cfo === 'UPLOAD' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600'}`}
                      >
                        Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignInputMode(p => ({ ...p, cfo: 'LINK' }))}
                        className={`px-2 py-1 rounded-md transition cursor-pointer ${signInputMode.cfo === 'LINK' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600'}`}
                      >
                        Link URL
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Nama Pejabat Keuangan</label>
                    <input 
                      type="text" 
                      value={localSettings.cfo_name} 
                      onChange={(e) => setLocalSettings({...localSettings, cfo_name: e.target.value, cfo_title: 'Manajemen Keuangan WIC'})}
                      className="input-premium font-bold text-xs" 
                      placeholder="Rodhotul Jannah, S. Th. I., M. Ag." 
                    />
                  </div>

                  {signInputMode.cfo === 'UPLOAD' ? (
                    <div className="border border-dashed border-emerald-300 hover:border-emerald-500 bg-white p-3 rounded-xl text-center cursor-pointer relative group transition">
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/jpg, image/webp" 
                        onChange={(e) => handleImageUpload('cfo_sign', e)} 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                      />
                      <div className="flex flex-col items-center justify-center space-y-1 pointer-events-none">
                        <Upload size={16} className="text-emerald-700 group-hover:scale-110 transition" />
                        <p className="text-[10px] font-bold text-slate-700">Klik / Tarik Foto TTD Keuangan</p>
                        <p className="text-[8px] text-slate-400">PNG Transparan Disarankan (Auto-Compressed)</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Tautan URL Foto TTD</label>
                      <input 
                        type="url" 
                        value={localSettings.cfo_sign} 
                        onChange={(e) => setLocalSettings({...localSettings, cfo_sign: e.target.value})}
                        className="input-premium font-mono text-[10px]" 
                        placeholder="https://..." 
                      />
                    </div>
                  )}
                </div>

                {/* Live Preview Box */}
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase mb-1.5">
                    <span>Preview TTD Keuangan:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { 
                          ...localSettings, 
                          cfo_name: "Rodhotul Jannah, S. Th. I., M. Ag.",
                          cfo_title: "Manajemen Keuangan WIC",
                          cfo_sign: WIC_ASSETS.TTD 
                        };
                        setLocalSettings(updated);
                        handleSaveAll(updated);
                        showToast('TTD Manajemen Keuangan berhasil dipatenkan & diterapkan ke seluruh dashboard!', 'success');
                      }}
                      className="text-emerald-700 hover:underline cursor-pointer font-bold"
                    >
                      Patenkan TTD WIC
                    </button>
                  </div>
                  <div className="h-20 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-2 overflow-hidden shadow-inner">
                    {localSettings.cfo_sign ? (
                      <img 
                        src={localSettings.cfo_sign} 
                        alt="Preview TTD Keuangan" 
                        className="max-h-full max-w-full w-auto object-contain" 
                      />
                    ) : (
                      <span className="text-[9px] text-slate-400 italic">Belum ada foto TTD</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Stempel Resmi Lembaga WIC */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-700">3. Stempel Resmi Lembaga</span>
                    <div className="flex bg-slate-200 p-0.5 rounded-lg text-[9px] font-bold">
                      <button
                        type="button"
                        onClick={() => setSignInputMode(p => ({ ...p, stempel: 'UPLOAD' }))}
                        className={`px-2 py-1 rounded-md transition cursor-pointer ${signInputMode.stempel === 'UPLOAD' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600'}`}
                      >
                        Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignInputMode(p => ({ ...p, stempel: 'LINK' }))}
                        className={`px-2 py-1 rounded-md transition cursor-pointer ${signInputMode.stempel === 'LINK' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600'}`}
                      >
                        Link URL
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Label Penjamin Mutu</label>
                    <input 
                      type="text" 
                      value={localSettings.institution_name || "Worth It Course (WIC)"} 
                      onChange={(e) => setLocalSettings({...localSettings, institution_name: e.target.value})}
                      className="input-premium font-bold text-xs" 
                      placeholder="Worth It Course" 
                    />
                  </div>

                  {signInputMode.stempel === 'UPLOAD' ? (
                    <div className="border border-dashed border-emerald-300 hover:border-emerald-500 bg-white p-3 rounded-xl text-center cursor-pointer relative group transition">
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/jpg, image/webp" 
                        onChange={(e) => handleImageUpload('stempel_url', e)} 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                      />
                      <div className="flex flex-col items-center justify-center space-y-1 pointer-events-none">
                        <Upload size={16} className="text-emerald-700 group-hover:scale-110 transition" />
                        <p className="text-[10px] font-bold text-slate-700">Klik / Tarik Foto Stempel</p>
                        <p className="text-[8px] text-slate-400">Format PNG Transparan (Auto-Compressed)</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Tautan URL Stempel</label>
                      <input 
                        type="url" 
                        value={localSettings.stempel_url || ''} 
                        onChange={(e) => setLocalSettings({...localSettings, stempel_url: e.target.value})}
                        className="input-premium font-mono text-[10px]" 
                        placeholder="https://..." 
                      />
                    </div>
                  )}
                </div>

                {/* Live Preview Box */}
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase mb-1.5">
                    <span>Preview Stempel:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { 
                          ...localSettings, 
                          stempel_url: WIC_ASSETS.STEMPEL 
                        };
                        setLocalSettings(updated);
                        handleSaveAll(updated);
                        showToast('Stempel resmi WIC berhasil dipatenkan & diterapkan ke seluruh dashboard!', 'success');
                      }}
                      className="text-emerald-700 hover:underline cursor-pointer font-bold"
                    >
                      Patenkan Stempel WIC
                    </button>
                  </div>
                  <div className="h-20 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-2 overflow-hidden shadow-inner relative">
                    <img 
                      src={localSettings.stempel_url || WIC_ASSETS.STEMPEL} 
                      alt="Preview Stempel Lembaga" 
                      className="max-h-full max-w-full w-auto object-contain drop-shadow-xs transform -rotate-6" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS & CLOUD SYNC FOOTER */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-slate-600">
                Data tersimpan otomatis & tersinkronisasi realtime ke seluruh device yang terhubung.
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setLocalSettings({
                    ...localSettings,
                    institution_name: 'WORTH IT COURSE (WIC)',
                    institution_tagline: 'Excellence in English & Modern Academic Education',
                    institution_address: 'Jl. Pendidikan Prestasi No. 88, Metro Edu Center, Jambi',
                    institution_contact: 'Telp / WA: +62 822-8941-6677 • info@wic.edu',
                    default_payment_method: 'TF'
                  });
                  showToast('Identitas lembaga direset ke standar resmi WIC.', 'info');
                }}
                className="px-4 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition cursor-pointer"
              >
                Reset Identitas WIC
              </button>

              <button
                type="button"
                onClick={() => handleSaveAll()}
                className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-gold-400 hover:text-white px-7 py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider shadow-xl hover:shadow-2xl transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 border border-gold-400/20"
              >
                <Save size={16} className="text-gold-400" />
                <span>Simpan &amp; Terapkan ke Seluruh Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: WHATSAPP AI BROADCASTER */}
      {activeTab === 'BROADCAST' && (
        <div className="animate-in fade-in duration-300">
          <WhatsAppBroadcaster 
            appData={appData || {
              users: tutors,
              students: [],
              attendance: [],
              projects: [],
              assessments: [],
              settings: localSettings
            }} 
            showToast={showToast} 
          />
        </div>
      )}
    </div>
  );
}
