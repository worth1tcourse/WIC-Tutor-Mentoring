import React from 'react';
import { Sparkles, Quote, Camera, Users, Rocket, Wallet, Download, Database, Shuffle, FileUp, FileSpreadsheet } from 'lucide-react';
import { generateQuote } from '../../services/geminiService';
import { formatCurrency, compressImageFile } from '../../lib/utils';
import { calculateTutorPayroll, isRecordForTutor } from '../../lib/payroll';
import { AppData, User } from '../../types';
import AttendanceHeatmap from './AttendanceHeatmap';
import ImportFormatGuidanceModal from '../common/ImportFormatGuidanceModal';

interface AdminSummaryProps {
  appData: AppData;
  user: User;
  onUpdateQuote: (newQuote: string) => void;
  onUpdateUser: (updatedUser: User) => void;
  onOpenSettingsTab?: (tab: 'HONOR' | 'PROJECTS' | 'QUOTES' | 'BASIC') => void;
}

export default function AdminSummary({ 
  appData, 
  user, 
  onUpdateQuote, 
  onUpdateUser,
  onOpenSettingsTab 
}: AdminSummaryProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [topic, setTopic] = React.useState('');
  const [isGuidanceOpen, setIsGuidanceOpen] = React.useState(false);

  // Unified payroll engine handles all tutor rates and sessions

  const downloadCSV = () => {
    // Helper to escape CSV values
    const escape = (val: any) => {
      if (val === undefined || val === null) return '""';
      if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
      return val;
    };

    const separator = "\n\n" + "=".repeat(50) + "\n";

    // 1. Tutor Tunjangan
    const tutorHeader = "Nama Tutor,Username,Password,No. WA,Status Tutor\n";
    const tutorRows = appData.users
      .filter(u => u.role === 'TUTOR')
      .map(u => `${escape(u.name)},${escape(u.username)},${escape(u.password)},${escape(u.wa)},${escape(u.status_tutor)}`)
      .join("\n");

    // 2. Database Siswa
    const studentHeader = "Id Siswa,Nama,Program 1,Program 2,Status Dual Program,Hari 1,Shift 1,Hari 2,Shift 2\n";
    const studentRows = (appData.students && appData.students.length > 0)
      ? appData.students.map(s => `${escape(s.id)},${escape(s.name)},${escape(s.level)},${escape(s.level2 || '')},${s.is_dual_program || s.level2 ? 'YA' : 'TIDAK'},${escape(s.hari1)},${escape(s.shift1)},${escape(s.hari2)},${escape(s.shift2)}`).join("\n")
      : Array.from(new Set(appData.attendance.map(a => a.level))).map((lvl, idx) => `S-${idx+101},Siswa Sample ${idx+1},${lvl},,TIDAK,Selasa,08.00 – 09.30,,`).join("\n");

    // 3. Master Penilaian
    const gradeHeader = "Nama Siswa,ID Siswa,Program Dinilai,Program Utama,M1,M2,M3,M4,M5,M6,M7,M8,CS,Ujian,Catatan Khusus\n";
    const gradeRows = (appData.assessments && appData.assessments.length > 0)
      ? appData.assessments.map(as => {
          const st = appData.students.find(s => s.id === as.student_id);
          return `${escape(st?.name || as.student_id)},${escape(as.student_id)},${escape(as.program || st?.level || 'WIC')},${escape(st?.level || 'WIC')},${as.m1},${as.m2},${as.m3},${as.m4},${as.m5},${as.m6},${as.m7},${as.m8},${as.cs},${as.exam},${escape(as.note || '')}`;
        }).join("\n")
      : Array.from(new Set(appData.attendance.map(a => a.level))).map((lvl, idx) => `Siswa Sample ${idx+1},S-${idx+101},${lvl},${lvl},80,85,90,75,80,85,90,80,85,90,"Aktif Berdiskusi"`).join("\n");

    // 4. Verifikasi Proyek
    const projectHeader = "Bulan,Nama & Tgl,Jenis Proyek,File Link,Status Diterima\n";
    const projectRows = appData.projects.map(p => {
      const tutor = appData.users.find(u => isRecordForTutor(p.tutor_wa, u))?.name || p.tutor_wa;
      return `${escape(appData.settings.period_text)},${escape(tutor + " - " + p.date)},${escape(p.type)},${escape(p.file_url)},${escape(p.status)}`;
    }).join("\n");

    // 5. Review Jurnal
    const journalHeader = "Nama Tutor,Level Kelas,Keterangan Materi,Sumber Buku,Deskripsi Mode\n";
    const journalRows = appData.attendance.map(a => {
      const tutor = a.tutor_name || appData.users.find(u => isRecordForTutor(a.tutor_wa, u, a.tutor_id))?.name || a.tutor_wa;
      const moduleNote = a.module_created ? ` [Modul: ${a.module_title || 'Tersusun'}]` : '';
      return `${escape(tutor)},${escape(a.level)},${escape(a.material)},${escape(a.source)},"${a.shift} - ${a.mode}${moduleNote}"`;
    }).join("\n");

    // 6. Rekap Penggajian (Calculated dynamically)
    const payrollHeader = "Bulan Periode,Nama Tutor,Status Tutor,Tersertifikasi,Sesi Mandiri,Sesi Team,Sesi Private,Sesi Semi Private,Bonus Modul,Fee Proyek,Tunjangan,Lain-lain,Total\n";
    const payrollRows = appData.users
      .filter(u => u.role === 'TUTOR')
      .map(u => {
        const calc = calculateTutorPayroll(u, appData);
        return `${escape(appData.settings.period_text)},${escape(u.name)},${escape(u.status_tutor)},${calc.isCertified ? 'YA' : 'TIDAK'},${calc.mandiriCount},${calc.teamCount},${calc.privateCount},${calc.semiPrivateCount},${calc.moduleTotal},${calc.projectTotal},${calc.allowance},${calc.otherFee},${calc.grandTotal}`;
      })
      .join("\n");

    const combined = [
      "=== 1. TUTOR TUNJANGAN ===", tutorHeader + tutorRows,
      "=== 2. DATABASE SISWA ===", studentHeader + studentRows,
      "=== 3. MASTER PENILAIAN ===", gradeHeader + gradeRows,
      "=== 4. VERIFIKASI PROYEK ===", projectHeader + projectRows,
      "=== 5. REVIEW JURNAL ===", journalHeader + journalRows,
      "=== 6. REKAP PENGGAJIAN ===", payrollHeader + payrollRows
    ].join(separator);
    
    const blob = new Blob([combined], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `WIC_FULL_DATABASE_${appData.settings.period}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadGASScript = () => {
    const period = appData.settings.period_text;
    
    const tutorData = appData.users.filter(u => u.role === 'TUTOR').map(u => [u.name, u.username, u.password, u.wa, u.status_tutor]);
    const studentData = (appData.students && appData.students.length > 0)
      ? appData.students.map((s, idx) => [s.id || `S-${idx+101}`, s.name, s.level])
      : Array.from(new Set(appData.attendance.map(a => a.level))).map((lvl, idx) => [`S-${idx+101}`, `Siswa Sample ${idx+1}`, lvl]);

    const gradeData = (appData.assessments && appData.assessments.length > 0)
      ? appData.assessments.map(as => {
          const st = appData.students.find(s => s.id === as.student_id);
          return [st?.name || as.student_id, as.student_id, st?.level || 'WIC', as.m1, as.m2, as.m3, as.m4, as.m5, as.m6, as.m7, as.m8, as.cs, as.exam, as.note || ''];
        })
      : Array.from(new Set(appData.attendance.map(a => a.level))).map((lvl, idx) => [`Siswa Sample ${idx+1}`, `S-${idx+101}`, lvl, 80, 85, 90, 75, 80, 85, 90, 80, 85, 90, "Aktif Berdiskusi"]);

    const projectData = appData.projects.map(p => {
       const tutor = appData.users.find(u => isRecordForTutor(p.tutor_wa, u))?.name || p.tutor_wa;
       return [period, tutor + " - " + p.date, p.type, p.file_url, p.status];
    });
    const journalData = appData.attendance.map(a => {
       const tutor = a.tutor_name || appData.users.find(u => isRecordForTutor(a.tutor_wa, u, a.tutor_id))?.name || a.tutor_wa;
       return [tutor, a.level, a.material, a.source, `${a.shift} - ${a.mode}`];
    });
    const payrollData = appData.users.filter(u => u.role === 'TUTOR').map(u => {
        const calc = calculateTutorPayroll(u, appData);
        return [period, u.name, u.status_tutor, calc.teamCount, calc.mandiriCount, calc.projectTotal, calc.allowance, calc.otherFee, calc.grandTotal];
    });

    const scriptCode = `/**
 * WIC MASTER SYNC SCRIPT
 * Generate Date: ${new Date().toLocaleString()}
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('WIC Automation')
      .addItem('Sync Master Data', 'updateWICSheets')
      .addToUi();
}

function updateWICSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const sheets = {
    "Tutor Tunjangan": {
      header: ["Nama Tutor", "Username", "Password", "No. WA", "Status Tutor"],
      data: ${JSON.stringify(tutorData)}
    },
    "Database Siswa": {
      header: ["Id Siswa", "Nama", "Level"],
      data: ${JSON.stringify(studentData)}
    },
    "Master Penilaian": {
      header: ["Nama Siswa", "ID Siswa", "Level Kelas", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "CS", "Ujian", "Catatan Khusus"],
      data: ${JSON.stringify(gradeData)}
    },
    "Verifikasi Proyek": {
      header: ["Bulan", "Nama & Tgl", "Jenis Proyek", "File Link", "Status Diterima"],
      data: ${JSON.stringify(projectData)}
    },
    "Review Jurnal": {
      header: ["Nama Tutor", "Level Kelas", "Keterangan Materi", "Sumber Buku", "Deskripsi"],
      data: ${JSON.stringify(journalData)}
    },
    "Rekap Penggajian": {
      header: ["Bulan Periode", "Nama Tutor", "Status Tutor", "Sesi Team", "Sesi Mandiri", "Fee Proyek", "Tunjangan", "Lain-lain", "Total"],
      data: ${JSON.stringify(payrollData)}
    }
  };

  for (const [name, config] of Object.entries(sheets)) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    sheet.clear();
    
    // Header
    sheet.appendRow(config.header);
    sheet.getRange(1, 1, 1, config.header.length)
         .setBackground("#064e3b")
         .setFontColor("#ffffff")
         .setFontWeight("bold");
         
    // Data
    if (config.data && config.data.length > 0) {
      sheet.getRange(2, 1, config.data.length, config.header.length).setValues(config.data);
    }
    
    sheet.autoResizeColumns(1, config.header.length);
  }
  
  SpreadsheetApp.getUi().alert("Sinkronisasi WIC Berhasil!");
}
`;

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WIC GAS Master Script</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; line-height: 1.6; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
        h1 { color: #064e3b; font-weight: 900; margin-top: 0; }
        .instruction { background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; }
        pre { background: #1e293b; color: #f8fafc; padding: 30px; border-radius: 12px; overflow-x: auto; font-size: 13px; position: relative; }
        .copy-btn { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; float: right; }
        li { margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>WIC Master Data Sync</h1>
        <p>Gunakan kode di bawah ini untuk menghubungkan aplikasi WIC dengan Google Sheets Anda secara otomatis.</p>
        
        <div class="instruction">
            <strong>Cara Menggunakan:</strong>
            <ol>
                <li>Buka Spreadsheet Anda di Google Sheets.</li>
                <li>Klik menu <strong>Extensions</strong> > <strong>Apps Script</strong>.</li>
                <li>Hapus semua kode yang ada, lalu <strong>Paste</strong> kode di bawah ini.</li>
                <li>Klik tombol <strong>Save</strong> (ikon disket) dan beri nama "WIC Sync".</li>
                <li>Refresh halaman Google Sheets Anda, akan muncul menu baru <strong>"WIC Automation"</strong>.</li>
            </ol>
        </div>

        <button class="copy-btn" onclick="copyCode()">Copy Code</button>
        <pre id="codeBlock">${scriptCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    </div>

    <script>
        function copyCode() {
            const code = document.getElementById('codeBlock').innerText;
            navigator.clipboard.writeText(code).then(() => {
                alert('Kode berhasil disalin!');
            });
        }
    </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `WIC_MASTER_GAS_${appData.settings.period}.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran foto maksimal 5MB!");
        return;
      }
      const compressed = await compressImageFile(file, 200, 0.8);
      if (compressed) {
        onUpdateUser({ ...user, photo: compressed });
      }
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const quote = await generateQuote(topic);
    onUpdateQuote(quote);
    setIsGenerating(false);
  };

  const handleRandomFromCollection = () => {
    const list = appData.settings.quotes_list || [];
    if (list.length > 0) {
      const pick = list[Math.floor(Math.random() * list.length)];
      onUpdateQuote(pick.text);
    }
  };

  const activeTutors = appData.users.filter(u => u.role === 'TUTOR').length;
  const pendingProjects = appData.projects.filter(p => p.status === 'Belum ditinjau').length;
  
  // Total dynamic payroll calculation using unified payroll engine
  const totalPayrollEstimate = appData.users.filter(u => u.role === 'TUTOR').reduce((acc, u) => {
    return acc + calculateTutorPayroll(u, appData).grandTotal;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
         <div className="relative group/aphoto">
            <img src={user.photo} className="w-20 h-20 rounded-full border-4 border-slate-100 object-cover z-10 shadow-sm" alt={user.name} />
            <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover/aphoto:opacity-100 cursor-pointer transition-opacity z-20">
               <Camera size={14} className="text-white" />
               <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
         </div>
         <div className="relative z-10 text-center md:text-left flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">Administrator Master Portal</p>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">{user.name}</h2>
            <p className="text-[9px] text-gold-600 font-bold uppercase mt-1">Logged in as {user.username} • Sistem Transaksi Dinamis</p>
         </div>

         {onOpenSettingsTab && (
            <div className="flex flex-wrap gap-2">
               <button
                  onClick={() => setIsGuidanceOpen(true)}
                  className="bg-gold-400 hover:bg-gold-500 text-emerald-950 font-black px-3.5 py-2 rounded-xl text-[10px] uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Panduan Format & Template Import Data"
               >
                  <FileSpreadsheet size={13} /> Panduan Format Data
               </button>
               <button
                  onClick={() => onOpenSettingsTab('QUOTES')}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase transition flex items-center gap-1.5"
               >
                  <FileUp size={13} /> Impor Quotes CSV
               </button>
               <button
                  onClick={() => onOpenSettingsTab('HONOR')}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase transition flex items-center gap-1.5"
               >
                  Kustom Honor
               </button>
            </div>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Tutor Aktif</p>
            <h3 className="text-2xl font-black text-slate-800">{activeTutors}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-gold-500">
          <div className="w-12 h-12 rounded-full bg-gold-50 text-gold-600 flex items-center justify-center">
            <Rocket size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Pending Proyek</p>
            <h3 className="text-2xl font-black text-slate-800">{pendingProjects}</h3>
          </div>
        </div>

        <div className="bg-emerald-900 p-6 rounded-2xl shadow-md flex items-center gap-4 text-white">
          <div className="w-12 h-12 rounded-full bg-white/10 text-gold-400 flex items-center justify-center">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-300 uppercase">Total Estimasi Gaji</p>
            <h3 className="text-lg font-black text-white tracking-tight font-mono">
              {formatCurrency(totalPayrollEstimate)}
            </h3>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
             onClick={downloadCSV}
             className="flex-1 bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-md flex flex-col justify-center text-white hover:bg-slate-800 transition group text-left"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-emerald-400 uppercase">Backup Data</span>
              <Download size={14} className="text-slate-400 group-hover:scale-110 transition" />
            </div>
            <h3 className="text-xs font-black text-white uppercase tracking-tight">
               Download CSV
            </h3>
          </button>

          <button 
             onClick={downloadGASScript}
             className="flex-1 bg-emerald-950 border border-emerald-800 p-4 rounded-2xl shadow-md flex flex-col justify-center text-white hover:bg-emerald-900 transition group text-left"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-gold-400 uppercase">Sheets GAS</span>
              <Rocket size={14} className="text-amber-400 group-hover:scale-110 transition" />
            </div>
            <h3 className="text-xs font-black text-white uppercase tracking-tight">
               Sync GAS Code
            </h3>
          </button>
        </div>
      </div>

      {/* Recharts Heatmap & Attendance Peak Matrix */}
      <AttendanceHeatmap 
        attendance={appData.attendance} 
        tutors={appData.users} 
        currentPeriod={appData.settings.period_text} 
      />

      {/* Quote Card with CSV Import support */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1 w-full">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-black text-emerald-900 uppercase text-lg flex items-center gap-2">
              <Sparkles className="text-gold-500" size={20} /> Quotes Inspirasi Tutor
            </h3>
            {appData.settings.quotes_list && appData.settings.quotes_list.length > 1 && (
              <button
                onClick={handleRandomFromCollection}
                className="text-[10px] font-bold text-slate-500 hover:text-emerald-700 uppercase flex items-center gap-1"
                title="Pilih quote acak dari daftar tersimpan"
              >
                <Shuffle size={12} /> Acak Quote ({appData.settings.quotes_list.length})
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mb-4">
            Quote ditampilkan di beranda seluruh tutor. Anda bisa memasukkan quote dari file CSV melalui menu Pengaturan Sistem.
          </p>
          <div className="flex gap-3">
            <input 
              type="text" 
              placeholder="Topik AI (Cth: loyalitas, kreativitas, ujian)" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="input-premium py-2 text-xs flex-1" 
            />
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-emerald-900 text-white px-5 rounded-xl font-bold uppercase text-[10px] hover:bg-emerald-800 transition disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate & Save'}
            </button>
          </div>
        </div>
        <div className="flex-1 w-full bg-amber-50 p-6 rounded-xl border border-amber-100 relative min-h-[100px] flex items-center justify-center">
          <Quote className="absolute text-amber-200 w-10 h-10 -top-2 -left-2" />
          <p className="font-handwriting text-2xl text-emerald-900 relative z-10 leading-relaxed text-center italic font-bold">
            "{appData.settings.quote}"
          </p>
        </div>
      </div>

      {/* Guidance Modal for Data Formats */}
      <ImportFormatGuidanceModal 
        isOpen={isGuidanceOpen} 
        onClose={() => setIsGuidanceOpen(false)} 
        defaultTab="STUDENT"
      />
    </div>
  );
}
