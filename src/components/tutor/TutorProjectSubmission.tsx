import React, { useState, useMemo } from 'react';
import { Project, ProjectType, ProjectClassification } from '../../types';
import { DEFAULT_PROJECT_CLASSIFICATIONS } from '../../constants';
import { 
  Rocket, 
  Link2, 
  ExternalLink, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Eye, 
  Copy, 
  Check,
  FolderOpen,
  Layers,
  BookOpen,
  Film,
  Award,
  Building2
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';

interface TutorProjectSubmissionProps {
  tutorWa: string;
  projectTypes: ProjectType[];
  classifications?: ProjectClassification[];
  driveUrl: string;
  history: Project[];
  onSubmit: (project: Project) => void;
}

export default function TutorProjectSubmission({ 
  tutorWa, 
  projectTypes, 
  classifications = DEFAULT_PROJECT_CLASSIFICATIONS,
  driveUrl, 
  history, 
  onSubmit 
}: TutorProjectSubmissionProps) {
  const classList = useMemo(() => {
    return classifications && classifications.length > 0 ? classifications : DEFAULT_PROJECT_CLASSIFICATIONS;
  }, [classifications]);

  const [selectedClassification, setSelectedClassification] = useState(classList[0]?.name || 'Modul');

  // Items for currently selected classification
  const availableItems = useMemo(() => {
    const matched = classList.find(c => c.name.toLowerCase() === selectedClassification.toLowerCase());
    if (matched && matched.items && matched.items.length > 0) {
      return matched.items.map(it => ({
        name: it.name,
        fee: it.defaultFee,
        desc: it.description,
        allowQuantity: Boolean(it.allowQuantity),
        defaultQuantity: Math.max(1, Number(it.defaultQuantity) || 1),
        unitLabel: it.unitLabel || 'Item'
      }));
    }
    // Fallback to projectTypes
    return projectTypes.map(p => ({
      name: p.name,
      fee: p.fee,
      desc: '',
      allowQuantity: Boolean(p.allowQuantity),
      defaultQuantity: Math.max(1, Number(p.defaultQuantity) || 1),
      unitLabel: p.unitLabel || 'Item'
    }));
  }, [classList, selectedClassification, projectTypes]);

  const [formData, setFormData] = useState({
    type: availableItems[0]?.name || '',
    desc: '',
    share_link: '',
    platform: 'Google Drive',
    quantity: availableItems[0]?.defaultQuantity || 1
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  // When classification changes, auto-select first item
  const handleClassificationChange = (clsName: string) => {
    setSelectedClassification(clsName);
    const matched = classList.find(c => c.name.toLowerCase() === clsName.toLowerCase());
    const firstItem = matched?.items?.[0];
    setFormData(prev => ({
      ...prev,
      type: firstItem?.name || projectTypes[0]?.name || '',
      quantity: Math.max(1, Number(firstItem?.defaultQuantity) || 1)
    }));
  };

  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  // Auto-detect common link platforms
  const detectPlatform = (url: string): string => {
    const lower = url.toLowerCase();
    if (lower.includes('drive.google.com') || lower.includes('docs.google.com')) return 'Google Drive / Docs';
    if (lower.includes('canva.com')) return 'Canva Deck / Media';
    if (lower.includes('notion.so') || lower.includes('notion.site')) return 'Notion Workspace';
    if (lower.includes('figma.com')) return 'Figma Design';
    if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('loom.com')) return 'Video Bukti (Loom/YT)';
    if (lower.includes('quizizz.com')) return 'Quizizz Interaktif';
    return 'Tautan Web / Cloud';
  };

  const handleLinkChange = (url: string) => {
    setFormData(prev => ({
      ...prev,
      share_link: url,
      platform: url.trim() ? detectPlatform(url) : 'Google Drive'
    }));
  };

  const selectedItemObj = availableItems.find(t => t.name === formData.type) || availableItems[0];
  const activeUnitLabel = selectedItemObj?.unitLabel || 'Item';
  const activeUnitFee = selectedItemObj?.fee || 0;
  const activeQty = Math.max(1, Number(formData.quantity) || 1);
  const computedTotalFee = activeUnitFee * activeQty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!formData.share_link.trim()) {
      setSubmitError("Silakan masukkan tautan (share link) bukti proyek!");
      return;
    }

    const finalProjectName = formData.type || selectedItemObj?.name || 'Proyek Mandiri';

    const newProject: Project = {
      id: 'P-' + Date.now(),
      tutor_wa: tutorWa,
      classification: selectedClassification,
      type: finalProjectName,
      fee: computedTotalFee,
      unit_fee: activeUnitFee,
      quantity: activeQty,
      unit_label: activeUnitLabel,
      status: 'Belum ditinjau',
      date: new Date().toLocaleDateString('id-ID'),
      desc: formData.desc,
      file_url: formData.share_link.trim(),
      file_name: formData.platform || 'Tautan Bukti Proyek'
    };

    onSubmit(newProject);
    setFormData({
      type: availableItems[0]?.name || '',
      desc: '',
      share_link: '',
      platform: 'Google Drive',
      quantity: availableItems[0]?.defaultQuantity || 1
    });
    setIsSubmittedSuccess(true);
    setTimeout(() => setIsSubmittedSuccess(false), 4000);
  };

  const getClassificationBadge = (clsName?: string) => {
    switch ((clsName || '').toLowerCase()) {
      case 'modul':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'content':
        return 'bg-pink-50 text-pink-800 border-pink-200';
      case 'event':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'sekolah':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-purple-50 text-purple-800 border-purple-200';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start animate-in fade-in duration-300">
      {/* Form Submission */}
      <form onSubmit={handleSubmit} className="flex-1 w-full bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
           <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Rocket size={20} />
                </span>
                <h3 className="font-black text-slate-800 uppercase text-lg tracking-tight">
                  Pengajuan Proyek per Klasifikasi
                </h3>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                Pilih Klasifikasi: {classList.map(c => c.name).join(' • ')}
              </p>
           </div>

           {driveUrl && (
             <a 
                href={driveUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-xl transition flex items-center gap-1.5 border border-emerald-200 shrink-0 shadow-sm"
             >
                <FolderOpen size={13} /> Drive Utama Lembaga <ExternalLink size={11} />
             </a>
           )}
        </div>

        {isSubmittedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            <div className="text-xs">
              <p className="font-black uppercase">Pengajuan Proyek Berhasil Dikirim!</p>
              <p className="text-slate-600 text-[11px] mt-0.5">Tautan bukti proyek Anda telah tercatat dan siap ditinjau oleh Master Admin.</p>
            </div>
          </div>
        )}

        {submitError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-2xl flex items-center gap-3 animate-in fade-in">
            <AlertCircle size={18} className="text-red-600 shrink-0" />
            <p className="text-xs font-bold">{submitError}</p>
          </div>
        )}

        <div className="space-y-5">
           {/* Step 1: Pilih Klasifikasi Proyek */}
           <div>
             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
               1. Pilih Klasifikasi Proyek *
             </label>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
               {classList.map(cls => (
                 <button
                   key={cls.id}
                   type="button"
                   onClick={() => handleClassificationChange(cls.name)}
                   className={cn(
                     "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                     selectedClassification.toLowerCase() === cls.name.toLowerCase()
                       ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/50"
                       : "bg-slate-50 hover:bg-white text-slate-700 border-slate-200"
                   )}
                 >
                   <div className="flex items-center justify-between">
                     <span className="font-black text-xs uppercase tracking-tight">{cls.name}</span>
                     {selectedClassification.toLowerCase() === cls.name.toLowerCase() && (
                       <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                     )}
                   </div>
                   <p className={cn(
                     "text-[9px] mt-1 line-clamp-1",
                     selectedClassification.toLowerCase() === cls.name.toLowerCase() ? "text-slate-300" : "text-slate-400"
                   )}>
                     {cls.items.length} opsi proyek
                   </p>
                 </button>
               ))}
             </div>
           </div>

           {/* Step 2: Jenis Proyek spesifik dari Klasifikasi yang Dipilih (Hanya Daftar Resmi Admin) */}
           <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  2. Jenis Pekerjaan Proyek ({selectedClassification}) *
                </label>
                {selectedItemObj && (
                  <span className="text-[10px] font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Tarif Standar: {formatCurrency(selectedItemObj.fee)} / {activeUnitLabel}
                  </span>
                )}
              </div>

              <select 
                value={formData.type} 
                onChange={e => {
                  const chosen = availableItems.find(it => it.name === e.target.value);
                  setFormData({
                    ...formData,
                    type: e.target.value,
                    quantity: Math.max(1, Number(chosen?.defaultQuantity) || 1)
                  });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-black uppercase text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition cursor-pointer"
                required
              >
                 {availableItems.map((item, idx) => (
                   <option key={idx} value={item.name}>
                     {item.name} ({formatCurrency(item.fee)} / {item.unitLabel})
                   </option>
                 ))}
              </select>
              {selectedItemObj?.desc && (
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                  {selectedItemObj.desc}
                </p>
              )}
           </div>

           {/* Step 3: Kuantiti Pekerjaan (Khusus Input Kuantiti Saja, Tanpa Fitur Custom Tutor) */}
           <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                3. Kuantiti ({activeUnitLabel}) *
              </label>
              <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-black uppercase text-indigo-950 block">
                    Jumlah Kuantiti yang Dikerjakan
                  </span>
                  <span className="text-[10px] text-indigo-700 font-medium">
                    Tarif standar: {formatCurrency(activeUnitFee)} per {activeUnitLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="flex items-center bg-white rounded-xl border border-indigo-200 overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(1, (prev.quantity || 1) - 1) }))}
                      className="px-3.5 py-2 text-indigo-900 hover:bg-indigo-50 font-black text-sm cursor-pointer"
                      aria-label="Kurangi kuantiti"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      required
                      value={formData.quantity}
                      onChange={e => setFormData(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="w-16 text-center py-2 text-xs font-mono font-black text-slate-900 outline-none border-x border-indigo-100"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, quantity: (prev.quantity || 1) + 1 }))}
                      className="px-3.5 py-2 text-indigo-900 hover:bg-indigo-50 font-black text-sm cursor-pointer"
                      aria-label="Tambah kuantiti"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right min-w-[110px]">
                    <span className="text-[9px] font-bold uppercase text-indigo-700 block">
                      {activeQty} {activeUnitLabel} × {formatCurrency(activeUnitFee)}
                    </span>
                    <span className="text-sm font-mono font-black text-emerald-800">
                      {formatCurrency(computedTotalFee)}
                    </span>
                  </div>
                </div>
              </div>
           </div>

           {/* Step 4: Deskripsi & Rincian */}
           <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                4. Deskripsi & Rincian Hasil Pekerjaan *
              </label>
              <textarea 
                value={formData.desc} 
                onChange={e => setFormData({...formData, desc: e.target.value})}
                placeholder="Jelaskan secara ringkas hasil pekerjaan Anda (Cth: Menyusun modul 8 bab, membuat video Reels 60s, kepanitiaan spelling bee)..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition leading-relaxed" 
                required 
              />
           </div>

           {/* Step 5: Share Link Bukti Proyek */}
           <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Link2 size={14} className="text-emerald-700" /> 5. Share Link Bukti Pekerjaan (URL Cloud / Drive) *
                </label>
                <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {formData.platform}
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  placeholder="Paste link di sini: https://drive.google.com/... atau https://canva.com/..."
                  value={formData.share_link}
                  onChange={e => handleLinkChange(e.target.value)}
                  className="flex-1 bg-white border border-emerald-300 rounded-xl px-4 py-3 text-xs font-mono text-slate-800 focus:border-emerald-600 outline-none transition shadow-sm"
                />

                {formData.share_link && (
                  <a
                    href={formData.share_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-900 hover:bg-emerald-950 text-gold-400 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition shadow-sm"
                    title="Uji buka link di tab baru"
                  >
                    <Eye size={14} /> Uji Buka
                  </a>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[9px] text-slate-500">
                <span className="font-bold text-slate-600 uppercase">Mendukung:</span>
                <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">Google Drive</span>
                <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">Canva</span>
                <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">Notion</span>
                <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">Figma / Loom</span>
                <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">YouTube</span>
              </div>
           </div>

           <button 
              type="submit" 
              className="w-full bg-emerald-950 hover:bg-emerald-900 text-gold-400 font-black py-4 rounded-2xl shadow-xl hover:shadow-emerald-950/20 transition tracking-widest uppercase text-xs flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
           >
              <Rocket size={16} /> Kirim Pengajuan Proyek
           </button>
           
           <div className="flex items-center gap-2 text-slate-400 p-2 text-center justify-center">
              <AlertCircle size={13} />
              <p className="text-[10px] font-medium leading-none">
                Data diverifikasi transparan oleh Manajemen Keuangan WIC & otomatis tercatat pada slip gaji saat disetujui.
              </p>
           </div>
        </div>
      </form>

      {/* History Sidebar */}
      <div className="w-full lg:w-96 shrink-0 bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col">
         <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
               <div className="w-8 h-8 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
                  <Calendar size={15} />
               </div>
               <div>
                  <h3 className="font-black text-slate-800 uppercase text-xs tracking-tight">Riwayat Pengajuan</h3>
                  <p className="text-[9px] text-slate-400 font-bold">Total: {history.length} Proyek</p>
               </div>
            </div>
         </div>
         
         <div className="space-y-3 flex-1 overflow-y-auto custom-scroll pr-1 max-h-[550px]">
            {history.slice().reverse().map(p => (
              <div 
                key={p.id} 
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-md hover:border-emerald-300 transition-all duration-300 space-y-2 group"
              >
                 <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase border", getClassificationBadge(p.classification))}>
                        {p.classification || 'Modul'}
                      </span>
                      <p className="font-black text-xs text-slate-800 uppercase tracking-tight leading-tight mt-1">
                        {p.type}
                      </p>
                    </div>
                    <span className={cn(
                       "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border shrink-0",
                       p.status === 'Diterima' ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                       p.status === 'Ditolak' ? "bg-red-100 text-red-800 border-red-300" :
                       "bg-amber-100 text-amber-800 border-amber-300"
                    )}>
                       {p.status}
                    </span>
                 </div>

                  {p.desc && (
                   <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                     {p.desc}
                   </p>
                 )}

                 {(p.quantity || 1) > 1 && (
                   <p className="text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg inline-block border border-indigo-200">
                     Qty: {p.quantity} {p.unit_label || 'Item'} × {formatCurrency(p.unit_fee || Math.round((p.fee || 0) / (p.quantity || 1)))}
                   </p>
                 )}

                 {p.admin_note && (
                   <p className="text-[9px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                     <strong>Catatan Admin:</strong> {p.admin_note}
                   </p>
                 )}

                 <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                    <span className="font-mono font-bold text-slate-400 flex items-center gap-1">
                      <Calendar size={11} /> {p.date}
                    </span>
                    <span className="font-mono font-black text-emerald-700">
                      {formatCurrency(p.fee)}
                    </span>
                 </div>

                 {p.file_url && (
                   <div className="pt-1">
                     <a
                       href={p.file_url}
                       target="_blank"
                       rel="noreferrer"
                       className="text-[9px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                     >
                       <ExternalLink size={10} /> {p.file_name || 'Buka Berkas Bukti'}
                     </a>
                   </div>
                 )}
              </div>
            ))}

            {history.length === 0 && (
              <div className="py-12 text-center text-slate-400 italic text-xs">
                Belum ada pengajuan proyek.
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
