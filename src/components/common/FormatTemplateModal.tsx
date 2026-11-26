import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  FileJson,
  Download,
  Copy,
  Check,
  CheckCircle2,
  BookOpen,
  Table2,
  Code2
} from 'lucide-react';
import {
  ExportImportDomain,
  DOMAIN_FORMAT_GUIDES,
  downloadSampleTemplateCSV,
  downloadSampleTemplateJSON,
  getSampleCsvPreviewText
} from '../../lib/dataExportImport';
import { cn } from '../../lib/utils';

interface FormatTemplateModalProps {
  domain: ExportImportDomain | null;
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function FormatTemplateModal({
  domain,
  onClose,
  showToast
}: FormatTemplateModalProps) {
  const [activeTab, setActiveTab] = useState<'COLUMNS' | 'CSV' | 'JSON'>('COLUMNS');
  const [copiedType, setCopiedType] = useState<'CSV' | 'JSON' | null>(null);

  if (!domain) return null;

  const guide = DOMAIN_FORMAT_GUIDES[domain];
  const csvText = getSampleCsvPreviewText(domain);
  const jsonText = JSON.stringify(guide.sampleJsonPayload, null, 2);

  const handleCopy = (type: 'CSV' | 'JSON', content: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(content);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
      if (showToast) {
        showToast(`Contoh format ${type} berhasil disalin ke clipboard!`, 'success');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-950 to-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-gold-400/20 border border-gold-400/40 text-gold-300 rounded-2xl shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-white">
                {guide.title}
              </h3>
              <p className="text-[11px] text-emerald-100/80 mt-0.5 leading-relaxed">
                {guide.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sync Parity Guarantee Banner */}
        <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200/80 flex items-start gap-2.5 shrink-0">
          <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
          <p className="text-[11px] text-emerald-950 leading-relaxed font-medium">
            <strong className="font-black uppercase">100% Sinkron Export ↔ Import:</strong> {guide.syncRule}
          </p>
        </div>

        {/* Tab Bar + Quick Download Actions */}
        <div className="px-6 pt-4 pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('COLUMNS')}
              className={cn(
                'px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer',
                activeTab === 'COLUMNS'
                  ? 'bg-emerald-950 text-gold-400 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Table2 size={13} /> Panduan Kolom
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CSV')}
              className={cn(
                'px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer',
                activeTab === 'CSV'
                  ? 'bg-emerald-950 text-gold-400 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <FileSpreadsheet size={13} /> Contoh CSV
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('JSON')}
              className={cn(
                'px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer',
                activeTab === 'JSON'
                  ? 'bg-emerald-950 text-gold-400 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Code2 size={13} /> Contoh JSON
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                downloadSampleTemplateCSV(domain);
                if (showToast) showToast(`File contoh ${guide.csvFilename} berhasil diunduh!`, 'success');
              }}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={13} className="text-emerald-700" /> Unduh Contoh CSV
            </button>
            <button
              type="button"
              onClick={() => {
                downloadSampleTemplateJSON(domain);
                if (showToast) showToast(`File contoh ${guide.jsonFilename} berhasil diunduh!`, 'success');
              }}
              className="bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileJson size={13} className="text-blue-700" /> Unduh Contoh JSON
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-4">
          {activeTab === 'COLUMNS' && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4 font-black">Kolom CSV</th>
                    <th className="py-3 px-4 font-black">Key JSON</th>
                    <th className="py-3 px-4 font-black">Status</th>
                    <th className="py-3 px-4 font-black">Contoh Isi</th>
                    <th className="py-3 px-4 font-black">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {guide.columns.map((col, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {col.column}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-blue-800 whitespace-nowrap">
                        {col.jsonKey}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {col.required ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            Wajib
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-100 text-slate-600">
                            Opsional
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-emerald-800">
                        {col.example}
                      </td>
                      <td className="py-2.5 px-4 text-[11px] text-slate-600">
                        {col.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'CSV' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">
                  Preview isi file <span className="font-mono text-emerald-800">{guide.csvFilename}</span> (UTF-8, siap dibuka di Excel / Google Sheets):
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy('CSV', csvText)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedType === 'CSV' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  {copiedType === 'CSV' ? 'Tersalin!' : 'Salin Teks CSV'}
                </button>
              </div>
              <pre className="bg-slate-900 text-emerald-200 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto whitespace-pre leading-relaxed border border-slate-800">
                {csvText}
              </pre>
            </div>
          )}

          {activeTab === 'JSON' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">
                  Preview struktur file <span className="font-mono text-blue-800">{guide.jsonFilename}</span> (100% sama dengan hasil Export JSON):
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy('JSON', jsonText)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedType === 'JSON' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  {copiedType === 'JSON' ? 'Tersalin!' : 'Salin Teks JSON'}
                </button>
              </div>
              <pre className="bg-slate-900 text-sky-200 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto whitespace-pre leading-relaxed border border-slate-800">
                {jsonText}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-slate-500 font-medium">
            Tips: Cara paling cepat untuk edit massal adalah klik <strong>Export CSV/JSON</strong> → edit datanya → lalu klik <strong>Import CSV/JSON</strong>.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
