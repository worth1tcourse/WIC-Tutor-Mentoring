import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check, PenTool, Upload, Sparkles, ShieldCheck } from 'lucide-react';
import { compressAssetImage } from '../../lib/imageCompressor';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSignature: (dataUrl: string) => void;
  title?: string;
  initialName?: string;
}

export default function SignaturePadModal({
  isOpen,
  onClose,
  onSaveSignature,
  title = 'Bubuhi Tanda Tangan Digital',
  initialName = ''
}: SignaturePadModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [inkColor, setInkColor] = useState('#0f172a'); // default deep black/navy
  const [penSize, setPenSize] = useState(2.5);
  const [activeTab, setActiveTab] = useState<'DRAW' | 'UPLOAD'>('DRAW');

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI canvas
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 2;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Initial clear
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = await compressAssetImage(canvas).catch(() => canvas.toDataURL('image/png'));
    if (dataUrl) {
      onSaveSignature(dataUrl);
      onClose();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressAssetImage(file);
      if (compressed) {
        onSaveSignature(compressed);
        onClose();
      }
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-800 text-gold-400 rounded-xl">
              <PenTool size={18} />
            </span>
            <div>
              <h3 className="font-black uppercase text-sm tracking-wide text-white">{title}</h3>
              <p className="text-[10px] text-emerald-300">
                {initialName ? `Atas Nama: ${initialName}` : 'Goreskan tanda tangan digital resmi Anda'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-6 pt-3">
          <button
            onClick={() => setActiveTab('DRAW')}
            className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'DRAW'
                ? 'border-emerald-700 text-emerald-900 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PenTool size={14} /> Gores di Layar
          </button>
          <button
            onClick={() => setActiveTab('UPLOAD')}
            className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'UPLOAD'
                ? 'border-emerald-700 text-emerald-900 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload size={14} /> Upload Gambar
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {activeTab === 'DRAW' ? (
            <div className="space-y-4">
              {/* Color & Pen options */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tinta:</span>
                  {[
                    { color: '#0f172a', label: 'Hitam Pekat' },
                    { color: '#1e3a8a', label: 'Biru Tua' },
                    { color: '#064e3b', label: 'Hijau WIC' }
                  ].map(c => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setInkColor(c.color)}
                      className={`w-6 h-6 rounded-full border-2 transition ${
                        inkColor === c.color ? 'border-amber-400 scale-110 shadow-sm' : 'border-slate-200'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-[10px] font-black uppercase text-slate-500 hover:text-red-600 flex items-center gap-1 bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
                >
                  <RotateCcw size={12} /> Hapus & Ulangi
                </button>
              </div>

              {/* Drawing Area */}
              <div className="relative border-2 border-dashed border-emerald-300 rounded-2xl bg-slate-50/60 overflow-hidden shadow-inner h-48 touch-none">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400">
                    <PenTool size={28} className="mb-2 opacity-40 text-emerald-700" />
                    <p className="text-xs font-semibold">Tanda tangani di sini dengan jari atau mouse</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Akan otomatis disimpan berlatar transparan</p>
                  </div>
                )}
                {/* Horizontal Baseline Guideline */}
                <div className="absolute bottom-10 left-6 right-6 border-b border-dashed border-slate-300/80 pointer-events-none flex justify-end">
                  <span className="text-[8px] font-mono text-slate-400 -mb-3 bg-white/70 px-1">Garis Tanda Tangan</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <label className="border-2 border-dashed border-emerald-400 hover:border-emerald-600 bg-emerald-50/40 p-8 rounded-2xl text-center cursor-pointer flex flex-col items-center justify-center transition group">
                <Upload size={32} className="text-emerald-700 group-hover:scale-110 transition mb-2" />
                <p className="font-black text-sm text-slate-800 uppercase">Pilih File Tanda Tangan</p>
                <p className="text-xs text-slate-500 mt-1">Disarankan format PNG transparan atau JPG bersih</p>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
            <ShieldCheck size={12} className="text-emerald-600" /> Dokumen Sah Elektronik
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-600 hover:bg-slate-200 transition"
            >
              Batal
            </button>
            {activeTab === 'DRAW' && (
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasDrawn}
                className="bg-emerald-950 hover:bg-emerald-900 disabled:opacity-40 text-gold-400 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-md"
              >
                <Check size={14} /> Terapkan TTD
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
