import React from 'react';
import { Bell, Check, Trash2, Rocket, Users, Calendar, Wallet } from 'lucide-react';
import { Notification } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationCenterProps {
  notifications: Notification[];
  currentUserWa: string;
  isAdmin: boolean;
  onMarkRead: (id: string) => void;
  onClear: () => void;
}

export default function NotificationCenter({ notifications, currentUserWa, isAdmin, onMarkRead, onClear }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const filtered = notifications.filter(n => {
    if (isAdmin) return n.userId === 'ADMIN';
    return n.userId === currentUserWa;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = filtered.filter(n => !n.isRead).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'PROJECT': return <Rocket size={14} />;
      case 'STUDENT': return <Users size={14} />;
      case 'SCHEDULE': return <Calendar size={14} />;
      case 'PAYROLL': return <Wallet size={14} />;
      default: return <Bell size={14} />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-80 bg-white rounded-[2rem] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest flex items-center gap-2">
                   Notifikasi {unreadCount > 0 && <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[8px]">{unreadCount} Baru</span>}
                </h3>
                <button onClick={onClear} className="text-slate-400 hover:text-red-500 transition">
                  <Trash2 size={12} />
                </button>
              </div>

              <div className="max-h-[350px] overflow-y-auto custom-scroll">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center">
                    <Bell className="mx-auto text-slate-200 mb-3" size={32} />
                    <p className="text-[10px] font-bold text-slate-400 uppercase italic">Belum ada notifikasi</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {filtered.map(n => (
                      <div 
                        key={n.id} 
                        className={cn(
                          "p-4 transition-colors relative group",
                          !n.isRead ? "bg-emerald-50/30" : "hover:bg-slate-50"
                        )}
                      >
                        <div className="flex gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                            !n.isRead ? "bg-emerald-100 text-emerald-600 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"
                          )}>
                            {getIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-[11px] leading-tight mb-0.5", !n.isRead ? "font-black text-slate-800" : "font-bold text-slate-600")}>
                              {n.title}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-2">
                              {n.message}
                            </p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase">
                              {new Date(n.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {!n.isRead && (
                            <button 
                              onClick={() => onMarkRead(n.id)}
                              className="w-6 h-6 bg-white rounded-lg flex items-center justify-center border border-emerald-100 text-emerald-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Check size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {filtered.length > 0 && (
                <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">WIC MASTER MONITORING SYSTEM</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
