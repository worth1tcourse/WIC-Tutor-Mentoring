import React from 'react';
import { AlertOctagon, RotateCcw, RefreshCw, ShieldAlert, Copy, Check } from 'lucide-react';
import { purgeStaleStorageKeys, safeSetItem } from '../../lib/safeStorage';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  copied: boolean;
}

export default class SystemErrorBoundary extends React.Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    // If it's a quota error, immediately purge stale caches
    if (error?.message?.includes('quota') || error?.name === 'QuotaExceededError') {
      purgeStaleStorageKeys();
    }
    return {
      hasError: true,
      error
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SystemErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });

    // Auto purge stale caches if storage quota was exceeded
    if (error?.message?.includes('quota') || error?.name === 'QuotaExceededError') {
      purgeStaleStorageKeys();
    }

    try {
      const crashLog = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      };
      safeSetItem('wic_last_system_crash', JSON.stringify(crashLog));
    } catch (e) {
      console.warn(e);
    }
  }

  handleReload = () => {
    purgeStaleStorageKeys();
    window.location.reload();
  };

  handleSafeMode = () => {
    try {
      purgeStaleStorageKeys();
      localStorage.removeItem('wic_session');
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  handleRestoreEmergency = () => {
    try {
      const snapRaw = localStorage.getItem('wic_emergency_rollback_snapshot');
      if (snapRaw) {
        const snap = JSON.parse(snapRaw);
        if (snap.data) {
          localStorage.setItem('wic_app_data_v2', JSON.stringify(snap.data));
          alert('Snapshot darurat berhasil dipasang. Aplikasi akan memuat ulang.');
          window.location.reload();
          return;
        }
      }
      alert('Snapshot darurat tidak ditemukan.');
    } catch (e) {
      alert('Gagal memulihkan snapshot darurat.');
    }
  };

  handleCopyLog = () => {
    const text = `WIC SYSTEM CRASH LOG\nTime: ${new Date().toISOString()}\nError: ${this.state.error?.message}\nStack: ${this.state.error?.stack}\nComponent Stack: ${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 3000);
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 select-none font-sans">
          <div className="max-w-2xl w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden space-y-6 animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

            <div className="relative z-10 flex items-start gap-4 border-b border-slate-800 pb-6">
              <div className="w-14 h-14 bg-red-500/20 text-red-400 border border-red-500/40 rounded-2xl flex items-center justify-center shrink-0">
                <AlertOctagon size={32} />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-red-400 uppercase bg-red-950/80 px-3 py-1 rounded-full border border-red-800">
                  Mode Pemulihan Darurat Sistem
                </span>
                <h2 className="text-xl font-black uppercase text-white mt-2 tracking-tight">
                  Terjadi Kendala Teknis pada Aplikasi
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Sistem keamanan WIC mendeteksi gangguan eksekusi antarmuka. Anda dapat memilih salah satu langkah pemulihan di bawah ini untuk mengembalikan operasional normal tanpa kehilangan data.
                </p>
              </div>
            </div>

            {/* Error detail */}
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 font-mono text-[11px] text-red-300 overflow-x-auto max-h-36 custom-scroll">
              <p className="font-bold text-red-400">Pesan Kesalahan:</p>
              <p className="mt-1">{this.state.error?.message || 'Unknown runtime error'}</p>
            </div>

            {/* Recovery Actions */}
            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Opsi Pemulihan Mandiri:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={this.handleReload}
                  className="p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  <RefreshCw size={16} /> Muat Ulang Aplikasi
                </button>

                <button
                  onClick={this.handleSafeMode}
                  className="p-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
                >
                  <ShieldAlert size={16} /> Mode Aman (Reset Sesi)
                </button>

                <button
                  onClick={this.handleRestoreEmergency}
                  className="p-4 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-2xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw size={16} /> Pulihkan Snapshot Darurat
                </button>

                <button
                  onClick={this.handleCopyLog}
                  className="p-4 bg-white/5 hover:bg-white/10 text-slate-300 border border-slate-800 rounded-2xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {this.state.copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  <span>{this.state.copied ? 'Log Disalin!' : 'Salin Log Error'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 text-center border-t border-slate-800">
              <p className="text-[10px] text-slate-500 font-bold uppercase">
                Worth It Course (WIC) Enterprise Recovery Engine • Firestore Real-Time Active
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
