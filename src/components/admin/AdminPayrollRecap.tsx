import React, { useState, useMemo } from 'react';
import { AppData, User } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { calculateTutorPayroll, getTutorKey } from '../../lib/payroll';
import { 
  Wallet, 
  Search, 
  Download, 
  Printer, 
  MessageCircle, 
  FileText, 
  Award, 
  CheckCircle, 
  Calendar, 
  Layers, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';

interface AdminPayrollRecapProps {
  appData: AppData;
  onOpenInvoice: (tutorWa: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function AdminPayrollRecap({ appData, onOpenInvoice, showToast }: AdminPayrollRecapProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [certFilter, setCertFilter] = useState<'ALL' | 'CERTIFIED' | 'STANDARD'>('ALL');

  const tutors = useMemo(() => {
    return appData.users.filter(u => u.role === 'TUTOR');
  }, [appData.users]);

  // Calculate detailed payroll for each tutor using unified payroll engine
  const tutorPayrolls = useMemo(() => {
    return tutors.map(u => calculateTutorPayroll(u, appData));
  }, [tutors, appData]);

  // Filtered list
  const filteredPayrolls = useMemo(() => {
    return tutorPayrolls.filter(item => {
      const u = item.tutor;
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            u.wa.includes(searchTerm);
      const matchesStatus = statusFilter === 'ALL' || u.status_tutor?.toLowerCase() === statusFilter.toLowerCase();
      const matchesCert = certFilter === 'ALL' || 
                          (certFilter === 'CERTIFIED' && item.isCertified) ||
                          (certFilter === 'STANDARD' && !item.isCertified);

      return matchesSearch && matchesStatus && matchesCert;
    });
  }, [tutorPayrolls, searchTerm, statusFilter, certFilter]);

  // Aggregate Metrics
  const aggregate = useMemo(() => {
    const totalPayroll = tutorPayrolls.reduce((acc, i) => acc + i.grandTotal, 0);
    const totalSessions = tutorPayrolls.reduce((acc, i) => acc + i.totalSessions, 0);
    const totalProjectFees = tutorPayrolls.reduce((acc, i) => acc + i.projectTotal, 0);
    const totalAllowances = tutorPayrolls.reduce((acc, i) => acc + i.allowance + i.otherFee, 0);

    return { totalPayroll, totalSessions, totalProjectFees, totalAllowances };
  }, [tutorPayrolls]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(tutors.map(u => u.status_tutor).filter(Boolean)));
  }, [tutors]);

  const handleExportCSV = () => {
    const escape = (val: any) => {
      if (val === undefined || val === null) return '""';
      if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
      return val;
    };

    const header = "Periode,Nama Tutor,Username,No. WA,Status Honor,Tersertifikasi,Sesi Mandiri,Sesi Team,Sesi Private,Sesi Semi Private,Bonus Modul,Fee Proyek,Tunjangan Pokok,Bonus Lainnya,Total Gaji Bersih\n";
    const rows = tutorPayrolls.map(i => {
      return [
        escape(appData.settings.period_text),
        escape(i.tutor.name),
        escape(i.tutor.username),
        escape(i.tutor.wa),
        escape(i.tutor.status_tutor),
        i.isCertified ? 'YA' : 'TIDAK',
        i.mandiriCount,
        i.teamCount,
        i.privateCount,
        i.semiPrivateCount,
        i.moduleTotal,
        i.projectTotal,
        i.allowance,
        i.otherFee,
        i.grandTotal
      ].join(',');
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Rekap_Gaji_WIC_${appData.settings.period}.csv`;
    link.click();
    showToast("File CSV Rekapitulasi Gaji berhasil diunduh!", "success");
  };

  const hasCalendarFilter = Boolean(appData.settings.period_start_date && appData.settings.period_end_date);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header and Period Indicator */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-gold-400 text-slate-950 rounded-xl font-black">
                <Wallet size={20} />
              </span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                Rekapitulasi Penggajian Keseluruhan
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Portal rekapitulasi honorium transparan dan akurat. Menghitung tarif dinamis 
              (Mandiri, Team, Private -10%, Semi Private & Modul), kompensasi proyek, tunjangan, dan bonus.
            </p>
          </div>

          <div className="text-left md:text-right bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
            <span className="text-[10px] font-bold text-gold-300 uppercase tracking-widest block mb-0.5">
              Periode Aktif
            </span>
            <p className="text-xl font-black text-white font-mono">
              {appData.settings.period_text}
            </p>
            {hasCalendarFilter ? (
              <p className="text-[9px] text-emerald-300 font-mono mt-0.5">
                🗓️ {appData.settings.period_start_date} s/d {appData.settings.period_end_date}
              </p>
            ) : (
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                (Rentang kalender belum dibatasi)
              </p>
            )}
          </div>
        </div>

        {/* Calendar Constraint Notice if active */}
        {hasCalendarFilter && (
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-[10px] text-emerald-300 relative z-10">
            <Calendar size={13} />
            <span>
              Kalender Periode: Jurnal yang dikirim pada periode aktif <strong>{appData.settings.period_text}</strong> serta sesi dalam rentang <strong>{appData.settings.period_start_date}</strong> s/d <strong>{appData.settings.period_end_date}</strong> otomatis terhitung ke total gaji.
            </span>
          </div>
        )}
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-600">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Anggaran Gaji</p>
            <h3 className="text-xl font-black text-emerald-950 font-mono mt-1">
              {formatCurrency(aggregate.totalPayroll)}
            </h3>
            <p className="text-[9px] text-emerald-700 font-bold mt-0.5">Lengkap Seluruh Tutor</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center">
            <Wallet size={22} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-blue-600">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Sesi Mengajar</p>
            <h3 className="text-xl font-black text-slate-800 font-mono mt-1">
              {aggregate.totalSessions} <span className="text-xs text-slate-400 font-sans">Sesi</span>
            </h3>
            <p className="text-[9px] text-blue-700 font-bold mt-0.5">M | T | P | Semi Private</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center">
            <Layers size={22} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-gold-500">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Fee Proyek</p>
            <h3 className="text-xl font-black text-slate-800 font-mono mt-1">
              {formatCurrency(aggregate.totalProjectFees)}
            </h3>
            <p className="text-[9px] text-amber-700 font-bold mt-0.5">Proyek Disetujui Admin</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center">
            <Sparkles size={22} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-purple-600">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tunjangan & Bonus</p>
            <h3 className="text-xl font-black text-slate-800 font-mono mt-1">
              {formatCurrency(aggregate.totalAllowances)}
            </h3>
            <p className="text-[9px] text-purple-700 font-bold mt-0.5">Operasional & Reward</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-700 rounded-2xl flex items-center justify-center">
            <Award size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Export Toolbar */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 w-full">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari Nama Tutor / WhatsApp..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition"
            />
          </div>

          {/* Status Dropdown */}
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-700 uppercase outline-none focus:bg-white focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">Semua Jenjang Honor</option>
            {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Certification Filter */}
          <select 
            value={certFilter} 
            onChange={e => setCertFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-700 uppercase outline-none focus:bg-white focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">Semua Kualifikasi</option>
            <option value="CERTIFIED">🎓 Khusus Berijazah Tersertifikasi</option>
            <option value="STANDARD">Standar Saja</option>
          </select>
        </div>

        {/* Export Buttons & Quick Invoice Preview */}
        <div className="flex items-center gap-2">
          {tutors.length > 0 && (
            <button 
              onClick={() => onOpenInvoice(getTutorKey(tutors[0]))}
              className="bg-emerald-950 hover:bg-emerald-900 text-gold-400 px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              title="Buka visual hasil invoice lengkap dengan TTD dan Stempel Resmi"
            >
              <FileText size={14} /> Hasil Invoice (TTD & Stempel)
            </button>
          )}
          <button 
            onClick={handleExportCSV}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 shadow-sm"
            title="Download file CSV rekap penggajian lengkap"
          >
            <Download size={14} /> Export CSV
          </button>
          <button 
            onClick={() => window.print()}
            className="bg-emerald-950 hover:bg-emerald-900 text-gold-400 px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <Printer size={14} /> Cetak Rekap
          </button>
        </div>
      </div>

      {/* Clean High-Density Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Tutor / Pengajar</th>
                <th className="px-6 py-4">Rincian Sesi (M | T | P | SP)</th>
                <th className="px-6 py-4 text-right">Fee Proyek</th>
                <th className="px-6 py-4 text-right">Tunjangan</th>
                <th className="px-6 py-4 text-right">Bonus Lain</th>
                <th className="px-6 py-4 text-right bg-emerald-50/60 text-emerald-950">Total Bersih</th>
                <th className="px-6 py-4 text-center">Aksi Dokumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPayrolls.map(item => {
                const u = item.tutor;
                const waMessage = encodeURIComponent(
                  `Halo Kak ${u.name}, rekap penggajian Worth It Course periode ${appData.settings.period_text} sejumlah ${formatCurrency(item.grandTotal)} sudah siap. Silakan akses portal untuk melihat dan mencetak slip gaji resmi.`
                );

                return (
                  <tr key={getTutorKey(u) || u.id} className="hover:bg-slate-50/80 transition group">
                    {/* Tutor Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={u.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"} 
                          alt={u.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
                        />
                        <div>
                          <p className="font-black uppercase text-slate-800 leading-tight">
                            {u.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                              {u.status_tutor}
                            </span>
                            {item.isCertified && (
                              <span className="text-[8px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded border border-emerald-200">
                                Tersertifikasi
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Sesi Mengajar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="bg-emerald-50 text-emerald-800 font-black px-2 py-0.5 rounded border border-emerald-100" title="Mandiri">
                          {item.mandiriCount} M
                        </span>
                        <span className="bg-amber-50 text-amber-800 font-black px-2 py-0.5 rounded border border-amber-100" title="Team Teaching">
                          {item.teamCount} T
                        </span>
                        <span className="bg-purple-50 text-purple-800 font-black px-2 py-0.5 rounded border border-purple-100" title="Private (-10%)">
                          {item.privateCount} P
                        </span>
                        <span className="bg-blue-50 text-blue-800 font-black px-2 py-0.5 rounded border border-blue-100" title="Semi Private">
                          {item.semiPrivateCount} SP
                        </span>
                      </div>
                      {item.moduleCount > 0 && (
                        <p className="text-[9px] text-emerald-700 font-bold mt-1">
                          +{item.moduleCount} Modul (+{formatCurrency(item.moduleTotal)})
                        </p>
                      )}
                    </td>

                    {/* Fee Proyek */}
                    <td className="px-6 py-4 text-right font-mono">
                      <p className="font-bold text-slate-800">
                        {item.projectTotal > 0 ? formatCurrency(item.projectTotal) : '-'}
                      </p>
                      {item.approvedProjects.length > 0 && (
                        <p className="text-[8px] text-slate-400 font-bold uppercase">
                          {item.approvedProjects.length} Proyek Disetujui
                        </p>
                      )}
                    </td>

                    {/* Tunjangan Pokok */}
                    <td className="px-6 py-4 text-right font-mono">
                      <p className="font-bold text-blue-800">
                        {item.allowance > 0 ? formatCurrency(item.allowance) : '-'}
                      </p>
                      {item.allowanceNote && (
                        <p className="text-[8px] text-slate-400 truncate max-w-[90px] ml-auto" title={item.allowanceNote}>
                          {item.allowanceNote}
                        </p>
                      )}
                    </td>

                    {/* Bonus Lainnya */}
                    <td className="px-6 py-4 text-right font-mono">
                      <p className="font-bold text-amber-800">
                        {item.otherFee > 0 ? formatCurrency(item.otherFee) : '-'}
                      </p>
                      {item.otherNote && (
                        <p className="text-[8px] text-slate-400 truncate max-w-[90px] ml-auto" title={item.otherNote}>
                          {item.otherNote}
                        </p>
                      )}
                    </td>

                    {/* Total Bersih */}
                    <td className="px-6 py-4 text-right font-mono font-black text-emerald-950 text-sm bg-emerald-50/50 border-x border-emerald-100">
                      {formatCurrency(item.grandTotal)}
                    </td>

                    {/* Opsi Dokumen & WA */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => onOpenInvoice(getTutorKey(u))} 
                          className="bg-emerald-900 hover:bg-emerald-950 text-gold-400 px-3 py-1.5 rounded-xl font-black uppercase text-[9px] tracking-wider transition flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                          title="Lihat & Cetak Hasil Invoice Lengkap dengan TTD & Stempel Resmi"
                        >
                          <FileText size={12} /> Hasil Invoice TTD & Stempel
                        </button>
                        <a 
                          href={`https://wa.me/${u.wa}?text=${waMessage}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl transition"
                          title="Kirim Notifikasi via WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Total Footer Row */}
            <tfoot className="bg-slate-900 text-white font-black uppercase text-[10px]">
              <tr>
                <td className="px-6 py-4">Total Keseluruhan ({filteredPayrolls.length} Tutor)</td>
                <td className="px-6 py-4 text-slate-300 font-mono">
                  {filteredPayrolls.reduce((acc, i) => acc + i.totalSessions, 0)} Total Sesi
                </td>
                <td className="px-6 py-4 text-right font-mono text-emerald-300">
                  {formatCurrency(filteredPayrolls.reduce((acc, i) => acc + i.projectTotal, 0))}
                </td>
                <td className="px-6 py-4 text-right font-mono text-blue-300">
                  {formatCurrency(filteredPayrolls.reduce((acc, i) => acc + i.allowance, 0))}
                </td>
                <td className="px-6 py-4 text-right font-mono text-amber-300">
                  {formatCurrency(filteredPayrolls.reduce((acc, i) => acc + i.otherFee, 0))}
                </td>
                <td className="px-6 py-4 text-right font-mono text-base text-gold-400 bg-slate-950/80 border-x border-slate-800">
                  {formatCurrency(filteredPayrolls.reduce((acc, i) => acc + i.grandTotal, 0))}
                </td>
                <td className="px-6 py-4 text-center text-slate-400">
                  Resmi WIC
                </td>
              </tr>
            </tfoot>
          </table>

          {filteredPayrolls.length === 0 && (
            <div className="py-16 text-center text-slate-400 text-xs font-bold uppercase">
              Tidak ada data penggajian yang sesuai filter
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
