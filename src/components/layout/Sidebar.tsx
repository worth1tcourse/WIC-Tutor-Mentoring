import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Award, 
  CheckCircle, 
  Wallet, 
  Settings, 
  Home, 
  CalendarDays, 
  FileEdit, 
  Rocket, 
  Receipt,
  LogOut,
  Menu,
  X,
  BookOpen,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { User } from '../../types';
import { WIC_ASSETS, EMBEDDED_WIC_LOGO } from '../../constants';
import { cn, formatTutorDisplayName } from '../../lib/utils';

interface SidebarProps {
  user: User;
  activeId: string;
  onNavigate: (id: string, title: string) => void;
  onLogout: () => void;
  logoUrl?: string;
}

export default function Sidebar({ user, activeId, onNavigate, onLogout, logoUrl }: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const adminItems = [
    { id: 'DASH_ADMIN', label: 'Monitoring Dasbor', icon: LayoutDashboard },
    { id: 'MAN_TUTOR', label: 'Tutor & Tunjangan', icon: Users },
    { id: 'MAN_MODULES', label: 'Modul Ajar (Digital Hub)', icon: BookOpen },
    { id: 'MAN_STUDENT', label: 'Database Siswa', icon: GraduationCap },
    { id: 'MAN_ASSESSMENT', label: 'Master Penilaian', icon: Award },
    { id: 'MAN_PROJECT', label: 'Verifikasi Proyek', icon: CheckCircle },
    { id: 'MAN_JOURNAL', label: 'Review Jurnal', icon: CalendarDays },
    { id: 'MAN_PAYROLL', label: 'Rekap Penggajian', icon: Wallet },
    { id: 'MAN_BROADCAST', label: 'WA Broadcaster', icon: MessageSquare },
    { id: 'MAN_BACKUP', label: 'Backup & Recovery', icon: ShieldCheck },
    { id: 'MAN_SET', label: 'Pengaturan Sistem', icon: Settings }
  ];

  const tutorItems = [
    { id: 'DASH_TUTOR', label: 'Beranda Tutor', icon: Home },
    { id: 'TUTOR_MODULES', label: 'Modul Ajar (Room Siswa)', icon: BookOpen },
    { id: 'JURNAL_SHIFT', label: 'Jurnal Shift', icon: CalendarDays },
    { id: 'ASSESSMENT_TUTOR', label: 'Input Nilai', icon: FileEdit },
    { id: 'PROJEK_TAMBAHAN', label: 'Pengajuan Proyek', icon: Rocket },
    { id: 'PAYROLL_TUTOR', label: 'Slip Gaji Digital', icon: Receipt }
  ];

  const items = user.role === 'ADMIN' ? adminItems : tutorItems;

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-emerald-900 text-white rounded-lg shadow-lg"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-emerald-950 text-slate-300 flex flex-col shadow-2xl transition-transform duration-300 md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center gap-4 border-b border-emerald-900/50 bg-emerald-900/20">
          <img 
            src={logoUrl || WIC_ASSETS.LOGO} 
            alt="WIC Logo" 
            className="w-10 h-10 object-contain bg-white rounded-lg p-1" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = WIC_ASSETS.LOGO_FALLBACK_URL;
            }}
          />
          <div>
            <h3 className="font-black text-sm uppercase text-white leading-none tracking-tight">WIC Master</h3>
            <p className="text-[9px] text-gold-400 font-bold uppercase tracking-widest mt-1">Management V2</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scroll">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id, item.label);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left group",
                activeId === item.id 
                  ? "bg-emerald-800 text-white shadow-lg" 
                  : "text-slate-400 hover:bg-emerald-800 hover:text-white"
              )}
            >
              <item.icon size={16} />
              <span className="font-bold text-[11px] uppercase tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-5 bg-emerald-900/30 border-t border-emerald-900/50">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={user.photo} 
              alt={user.name} 
              className="w-10 h-10 rounded-full border border-emerald-700 object-cover bg-white" 
            />
            <div className="overflow-hidden">
              <p className="font-bold text-xs truncate text-white">
                {user.role === 'TUTOR' ? formatTutorDisplayName(user) : user.name}
              </p>
              <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">{user.role}</p>
            </div>
          </div>

          {/* Live Sync Verification Indicator */}
          <div className="p-2.5 bg-emerald-900/40 rounded-xl border border-emerald-800/40 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[9px] font-black uppercase text-white tracking-wider">Live Sync Aktif</span>
            </div>
            <span className="text-[8px] font-mono font-bold text-gold-400 bg-emerald-950 px-2 py-0.5 rounded border border-gold-400/20">
              Real-Time
            </span>
          </div>

          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2.5 rounded-lg text-[10px] font-bold uppercase transition"
          >
            <LogOut size={14} /> Keluar
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
