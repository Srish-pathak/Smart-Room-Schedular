import React, { useState } from 'react';
import { NotificationItem } from '../types';
import { Bell, CheckCircle2, AlertTriangle, Mail, RefreshCw, X, Trash2, Calendar, ShieldAlert } from 'lucide-react';

interface NotificationFeedProps {
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onClose?: () => void;
  isDarkMode: boolean;
}

export function NotificationFeed({
  notifications,
  onMarkAsRead,
  onClearAll,
  onClose,
  isDarkMode
}: NotificationFeedProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'emails'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`p-6 rounded-3xl border shadow-2xl max-w-md w-full space-y-4 ${
      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-5 h-5 text-indigo-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            )}
          </div>
          <h3 className="font-extrabold text-base">Activity & Email Alerts</h3>
        </div>

        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              Clear All
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
            activeTab === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Activity ({notifications.length})
        </button>
        <button
          onClick={() => setActiveTab('emails')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'emails' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Email Logs</span>
        </button>
      </div>

      {/* NOTIFICATIONS LIST */}
      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
            No active notifications at this time.
          </div>
        ) : (
          notifications
            .filter(n => activeTab === 'all' || (activeTab === 'emails' && n.emailSent))
            .map((item) => (
              <div 
                key={item.id}
                onClick={() => onMarkAsRead(item.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                  !item.read 
                    ? 'bg-indigo-950/30 border-indigo-500/40' 
                    : isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.type === 'approval' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {item.type === 'rejection' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                    {item.type === 'sync' && <RefreshCw className="w-4 h-4 text-purple-400 shrink-0" />}
                    {item.type === 'confirmation' && <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />}
                    <h4 className="font-extrabold text-xs text-white">{item.title}</h4>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">{item.timestamp}</span>
                </div>

                <p className="text-xs text-slate-300 leading-normal pl-6">{item.message}</p>

                {item.emailSent && (
                  <div className="pl-6 pt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                    <Mail className="w-3 h-3" />
                    <span>Email notification dispatched to recipient</span>
                  </div>
                )}
              </div>
            ))
        )}
      </div>

    </div>
  );
}
