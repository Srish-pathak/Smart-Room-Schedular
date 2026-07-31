import React, { useState, useEffect } from 'react';
import { Room, Booking } from '../types';
import { Clock, Calendar, CheckCircle2, AlertCircle, Play, Users, MapPin, Sparkles, ChevronRight, RefreshCw, X } from 'lucide-react';
import { motion } from 'motion/react';

interface DigitalDisplayViewProps {
  rooms: Room[];
  bookings: Booking[];
  onQuickBook15Min: (room: Room) => void;
  isDarkMode: boolean;
  onCloseKiosk?: () => void;
}

export function DigitalDisplayView({
  rooms,
  bookings,
  onQuickBook15Min,
  isDarkMode,
  onCloseKiosk
}: DigitalDisplayViewProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];

  // Find active booking right now
  const roomBookings = bookings.filter(b => b.room_id === selectedRoom?.id || b.roomId === selectedRoom?.id);
  const now = currentTime.getTime();

  const currentBooking = roomBookings.find(b => {
    const start = new Date(b.startTime || b.start_time || '').getTime();
    const end = new Date(b.endTime || b.end_time || '').getTime();
    return now >= start && now <= end;
  });

  const upcomingBookings = roomBookings
    .filter(b => new Date(b.startTime || b.start_time || '').getTime() > now)
    .sort((a, b) => new Date(a.startTime || a.start_time || '').getTime() - new Date(b.startTime || b.start_time || '').getTime());

  const isOccupied = Boolean(currentBooking);

  return (
    <div className={`min-h-screen p-6 font-sans transition-colors flex flex-col justify-between ${
      isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-900 text-white'
    }`}>
      
      {/* KIOSK HEADER CONTROL BAR */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-mono font-bold tracking-widest text-indigo-400 uppercase">DIGITAL DOOR PLAQUE KIOSK</span>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-extrabold text-indigo-300 outline-none"
          >
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({r.building || 'Main'})</option>
            ))}
          </select>

          {onCloseKiosk && (
            <button
              onClick={onCloseKiosk}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-all cursor-pointer"
              title="Exit Kiosk Mode"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* MAIN KIOSK BOARD */}
      <div className="grid lg:grid-cols-12 gap-8 my-auto py-8">
        
        {/* LEFT COLUMN: LIVE ROOM STATUS */}
        <div className="lg:col-span-7 space-y-6 flex flex-col justify-center">
          <div className="space-y-2">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <MapPin className="w-4 h-4 text-indigo-400" />
              {selectedRoom?.building || 'IIT BHU Academic Building'} • Floor {selectedRoom?.floor || '1'}
            </span>
            <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-white">{selectedRoom?.name}</h1>
            <p className="text-slate-400 text-sm flex items-center gap-3">
              <span>Capacity: <strong className="text-indigo-300">{selectedRoom?.capacity} seats</strong></span>
              <span>•</span>
              <span>Buffer: <strong className="text-indigo-300">{selectedRoom?.buffer_time || 15} mins</strong></span>
            </p>
          </div>

          {/* STATUS BADGE BOX */}
          <div className={`p-8 rounded-3xl border-2 transition-all flex items-center justify-between gap-6 ${
            isOccupied
              ? 'bg-rose-950/40 border-rose-600/80 text-rose-100 shadow-2xl shadow-rose-950/50'
              : 'bg-emerald-950/40 border-emerald-500/80 text-emerald-100 shadow-2xl shadow-emerald-950/50'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full ${isOccupied ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`} />
                <span className="text-xs font-mono font-black uppercase tracking-widest text-slate-300">LIVE STATUS</span>
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight">
                {isOccupied ? 'ROOM OCCUPIED' : 'ROOM AVAILABLE'}
              </h2>
              <p className="text-xs opacity-80">
                {isOccupied 
                  ? `In Session: ${currentBooking?.summary || 'Private Meeting'}`
                  : 'Ready for scheduled sessions or walk-in quick reservations.'}
              </p>
            </div>

            {!isOccupied && (
              <button
                onClick={() => selectedRoom && onQuickBook15Min(selectedRoom)}
                className="px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all cursor-pointer shrink-0 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Quick Book 15m</span>
              </button>
            )}
          </div>

          {/* CURRENT MEETING DETAILS */}
          {currentBooking && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-indigo-400 font-bold">
                <span>CURRENT SESSION</span>
                <span>{new Date(currentBooking.startTime || currentBooking.start_time || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(currentBooking.endTime || currentBooking.end_time || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <h3 className="text-xl font-bold text-white">{currentBooking.summary}</h3>
              <p className="text-xs text-slate-400">Host: <strong className="text-slate-200">{currentBooking.creatorName || currentBooking.creator_name || 'Faculty Member'}</strong></p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: TIMELINE & DIGITAL CLOCK */}
        <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
          
          {/* DIGITAL CLOCK CARD */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-1">
            <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="text-5xl font-black font-mono text-indigo-400 tracking-wider">
              {currentTime.toLocaleTimeString()}
            </div>
          </div>

          {/* TODAY'S UPCOMING SCHEDULE */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>UPCOMING SESSIONS TODAY</span>
              </h3>

              {upcomingBookings.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-2xl">
                  No further scheduled sessions for today. Room is open.
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {upcomingBookings.map((b, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono text-indigo-300 font-bold">
                        <span>{new Date(b.startTime || b.start_time || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-[10px] text-slate-500 font-normal">Upcoming</span>
                      </div>
                      <div className="text-sm font-bold text-white">{b.summary}</div>
                      <div className="text-[11px] text-slate-400">{b.creatorName || b.creator_email}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-850 text-center">
              <span className="text-[10px] text-slate-500 font-mono">IIT BHU Digital Door Display Engine • Live Auto-Refresh</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
