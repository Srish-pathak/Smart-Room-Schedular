import React from 'react';
import { motion } from 'motion/react';
import { Room, Booking } from '../types';
import { calculateRoomStatus } from '../utils/roomStatus';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Sparkles, 
  Check, 
  X, 
  ArrowRight, 
  Plus, 
  TrendingUp, 
  Building, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  Undo
} from 'lucide-react';

interface DashboardViewProps {
  user: any;
  rooms: Room[];
  bookings: Booking[];
  isDarkMode: boolean;
  onNavigateTab: (tab: 'dashboard' | 'rooms' | 'calendar' | 'admin' | 'profile') => void;
  onApproveBooking?: (id: string) => Promise<void>;
  onRejectBooking?: (id: string, reason: string) => Promise<void>;
  onSelectRoomForDetails: (room: Room) => void;
  onBookRoom: (room: Room) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  rooms = [],
  bookings = [],
  isDarkMode,
  onNavigateTab,
  onApproveBooking,
  onRejectBooking,
  onSelectRoomForDetails,
  onBookRoom
}) => {
  const role = user?.role || 'student';
  const isAdmin = role === 'admin';

  // Current ISO date string
  const todayStr = new Date().toISOString().split('T')[0];

  // Global processed variables
  const roomStatusList = rooms.map(room => ({
    room,
    statusInfo: calculateRoomStatus(room, bookings)
  }));

  const occupiedRooms = roomStatusList.filter(item => item.statusInfo.status === 'occupied');
  const availableRooms = roomStatusList.filter(item => item.statusInfo.status === 'available');
  const reservedSoonRooms = roomStatusList.filter(item => item.statusInfo.status === 'reserved_soon');

  // Today's approved bookings across the campus
  const todayBookings = bookings.filter(b => {
    const isApproved = b.status === 'Approved' || b.status?.toLowerCase() === 'approved';
    const isToday = b.date === todayStr || (b.startTime && b.startTime.startsWith(todayStr));
    return isApproved && isToday;
  });

  // User-specific bookings
  const userBookings = bookings.filter(b => b.userId === user?.uid || b.userId === user?.id || b.creatorEmail?.toLowerCase() === user?.email?.toLowerCase());
  
  // Next upcoming approved booking for user
  const userUpcomingBooking = userBookings
    .filter(b => b.status === 'Approved' && new Date(b.startTime) >= new Date())
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

  // Handle Quick Approve/Reject Action with inline prompt
  const handleRejectPrompt = async (id: string) => {
    const reason = window.prompt('Please enter the reason for rejection:');
    if (reason === null) return; // User cancelled
    if (!reason.trim()) {
      alert('A rejection reason is required.');
      return;
    }
    if (onRejectBooking) {
      await onRejectBooking(id, reason.trim());
    }
  };

  // Helper: Format Time elegantly (e.g., "11:30 AM")
  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return timeStr;
    }
  };

  // Helper: Format Date elegantly (e.g., "Oct 12")
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // --- RENDER STUDENT/FACULTY DASHBOARD ---
  const renderStudentDashboard = () => {
    // Recently Added Rooms (Newest 3 based on array order or ID)
    const recentlyAdded = [...rooms].reverse().slice(0, 3);

    return (
      <div className="space-y-6">
        {/* Modern Greeting Hero Card */}
        <div className={`p-6 bg-gradient-to-r ${
          isDarkMode 
            ? 'from-indigo-950/80 to-slate-900 border-indigo-900/40 text-white' 
            : 'from-emerald-950 to-[#0a4735] text-white'
        } border rounded-3xl text-left relative overflow-hidden shadow-xl`}>
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${isDarkMode ? 'text-indigo-400' : 'text-[#dfb965]'}`}>
                IIT BHU Campus Scheduler 👋
              </span>
              <h2 className="text-xl font-black tracking-tight">
                Welcome back, {user?.name || user?.fullName || 'Academic Member'}!
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Check your upcoming agenda, find vacant lecture halls or department meeting rooms instantly, and secure your learning spaces securely.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => onNavigateTab('calendar')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-2 ${
                  isDarkMode 
                    ? 'bg-indigo-600 hover:bg-indigo-550 text-white' 
                    : 'bg-[#dfb965] hover:bg-[#d4af37] text-[#0a4735]'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Book a Slot</span>
              </button>
            </div>
          </div>
        </div>

        {/* First Row: Upcoming Agenda Card & Stats summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Upcoming Secured Slot */}
          <div className="lg:col-span-8 flex flex-col">
            <div className={`p-5 rounded-2xl border text-left flex-1 flex flex-col justify-between ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200/80 shadow-sm'
            }`}>
              <div>
                <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-800/40">
                  <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    My Upcoming Reservation
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Secured</span>
                </div>

                {userUpcomingBooking ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-indigo-950/50 text-indigo-300' : 'bg-indigo-50 text-indigo-800'} shrink-0`}>
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <strong className={`text-sm block font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-850'}`}>
                          {userUpcomingBooking.summary || userUpcomingBooking.purpose}
                        </strong>
                        <span className={`text-xs block font-semibold flex items-center gap-1.5 ${isDarkMode ? 'text-slate-350' : 'text-slate-650'}`}>
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {userUpcomingBooking.roomName || userUpcomingBooking.room_name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(userUpcomingBooking.startTime)} ({formatTime(userUpcomingBooking.startTime)} - {formatTime(userUpcomingBooking.endTime)})
                        </span>
                      </div>
                    </div>
                    {userUpcomingBooking.agenda && (
                      <div className={`p-3 rounded-xl text-xs font-serif italic ${isDarkMode ? 'bg-slate-950 text-slate-400' : 'bg-stone-50 text-stone-600'}`}>
                        " {userUpcomingBooking.agenda} "
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-xs text-slate-400 italic">No upcoming approved reservations scheduled.</p>
                    <button
                      onClick={() => onNavigateTab('rooms')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                    >
                      Browse Vacant Rooms
                    </button>
                  </div>
                )}
              </div>

              {userUpcomingBooking && (
                <div className="mt-4 pt-3 border-t border-slate-800/20 flex justify-end">
                  <button
                    onClick={() => onNavigateTab('calendar')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-extrabold inline-flex items-center gap-1"
                  >
                    <span>Manage Reservations</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="lg:col-span-4 grid grid-cols-1 gap-4">
            <div className={`p-4 rounded-2xl border text-left leading-snug flex flex-col justify-between ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200/80 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] text-slate-500 font-bold uppercase font-mono tracking-widest">Available Rooms Now</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div>
                <strong className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-[#0a4735]'}`}>
                  {availableRooms.length}
                </strong>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">out of {rooms.length} total facilities</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border text-left leading-snug flex flex-col justify-between ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200/80 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] text-slate-500 font-bold uppercase font-mono tracking-widest">Today's Reservations</span>
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <strong className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-[#0a4735]'}`}>
                  {todayBookings.length}
                </strong>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">approved events taking place today</span>
              </div>
            </div>
          </div>
        </div>

        {/* Available Rooms Grid */}
        <div className="space-y-3 text-left">
          <div className="flex justify-between items-center">
            <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-[#0a4735]'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Available Right Now
            </h3>
            <button
              onClick={() => onNavigateTab('rooms')}
              className="text-xs text-indigo-400 hover:underline font-extrabold"
            >
              View Directory
            </button>
          </div>

          {availableRooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availableRooms.slice(0, 3).map(({ room, statusInfo }) => (
                <div 
                  key={room.id}
                  className={`border p-4.5 rounded-2xl flex flex-col justify-between transition-all hover:scale-[1.01] ${
                    isDarkMode 
                      ? 'bg-slate-900 border-slate-800/80 hover:border-indigo-500/30' 
                      : 'bg-white border-stone-200 shadow-sm hover:border-emerald-500/30'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[9px] font-bold font-mono text-slate-500 uppercase block">
                          {room.building || 'IIT BHU'}
                        </span>
                        <strong className={`text-sm font-extrabold block truncate ${isDarkMode ? 'text-white' : 'text-slate-850'}`}>
                          {room.name}
                        </strong>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
                        Vacant
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        Capacity {room.capacity}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-850/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectRoomForDetails(room)}
                      className="text-xs text-slate-400 hover:text-slate-350 underline cursor-pointer"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => onBookRoom(room)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider cursor-pointer ${
                        isDarkMode 
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white' 
                          : 'bg-[#0a4735] hover:bg-[#063325] text-white'
                      }`}
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`p-6 rounded-2xl border text-center text-xs italic ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-stone-50 border-stone-200 text-stone-500'}`}>
              No spaces are vacant at this exact moment. Browse our full directory to schedule future dates.
            </div>
          )}
        </div>

        {/* Recently Added Rooms & Today's Schedule Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
          {/* Today's Campus Overview Schedule */}
          <div className="lg:col-span-8 space-y-3">
            <h3 className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-[#0a4735]'}`}>
              📅 Today's Campus Booking Schedule
            </h3>
            
            <div className={`p-4 rounded-2xl border ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200 shadow-sm'
            }`}>
              {todayBookings.length > 0 ? (
                <div className="divide-y divide-slate-800/40 space-y-3">
                  {todayBookings.slice(0, 5).map((b, idx) => (
                    <div key={b.id} className={`flex items-center justify-between gap-4 pt-3 ${idx === 0 ? 'pt-0' : ''}`}>
                      <div className="space-y-1">
                        <strong className={`text-xs block font-bold ${isDarkMode ? 'text-white' : 'text-slate-850'}`}>
                          {b.summary || b.purpose}
                        </strong>
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" />
                          {b.roomName || b.room_name} &nbsp;|&nbsp; 👤 {b.creatorName || 'Faculty'}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10.5px] font-mono font-bold text-indigo-400 block">
                          {formatTime(b.startTime).split(' ')[0]} - {formatTime(b.endTime)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {todayBookings.length > 5 && (
                    <div className="pt-3 text-center">
                      <button 
                        onClick={() => onNavigateTab('calendar')}
                        className="text-xs text-indigo-400 hover:underline font-extrabold"
                      >
                        And {todayBookings.length - 5} more events. View Interactive Calendar
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500 italic">
                  No reservations are scheduled on campus for today.
                </div>
              )}
            </div>
          </div>

          {/* Newest Added Rooms Discovery */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-[#0a4735]'}`}>
              🆕 Discover New Spaces
            </h3>

            <div className={`p-4 rounded-2xl border space-y-4 ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200 shadow-sm'
            }`}>
              {recentlyAdded.map(room => (
                <div key={room.id} className="flex items-center gap-3">
                  <img 
                    src={room.image} 
                    alt={room.name} 
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700/30 shrink-0 bg-stone-100"
                  />
                  <div className="min-w-0 flex-1 leading-tight text-left">
                    <span className="text-[9px] font-mono text-slate-500 block uppercase">{room.building || 'IIT BHU'}</span>
                    <strong className={`text-xs block font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{room.name}</strong>
                    <span className="text-[10px] text-slate-400 block font-mono">Seats {room.capacity}</span>
                  </div>
                  <button
                    onClick={() => onSelectRoomForDetails(room)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white shrink-0 cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- RENDER ADMIN DASHBOARD ---
  const renderAdminDashboard = () => {
    // Bookings pending approval
    const pendingBookings = bookings.filter(b => b.status === 'Pending' || b.status?.toLowerCase() === 'pending');
    
    // Utilization percentage computation
    const totalRoomsCount = rooms.length || 1;
    const occupiedRoomsCount = occupiedRooms.length;
    const currentUtilization = Math.round((occupiedRoomsCount / totalRoomsCount) * 100);

    return (
      <div className="space-y-6">
        {/* Welcome Admin Banner */}
        <div className={`p-6 bg-gradient-to-r ${
          isDarkMode 
            ? 'from-indigo-950/80 to-slate-900 border-indigo-900/40 text-white' 
            : 'from-indigo-950 to-[#0a4735] text-white'
        } border rounded-3xl text-left relative overflow-hidden shadow-xl`}>
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${isDarkMode ? 'text-indigo-400' : 'text-[#dfb965]'}`}>
                IIT BHU Control Suite 🔒
              </span>
              <h2 className="text-xl font-black tracking-tight">
                Academic Administration Center
              </h2>
              <p className="text-xs text-slate-350 max-w-2xl leading-relaxed">
                Welcome, <strong className="text-indigo-300">Admin</strong>. Direct live room allocations, approve student meeting requests, and monitor overall utilization indices in real-time.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => onNavigateTab('admin')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-2 ${
                  isDarkMode 
                    ? 'bg-indigo-600 hover:bg-indigo-550 text-white' 
                    : 'bg-[#dfb965] hover:bg-[#d4af37] text-[#0a4735]'
                }`}
              >
                <span>Room Manager</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5-Column High-density Metrics Row (Requirement 2) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Rooms */}
          <div className={`p-4 rounded-2xl border text-left flex flex-col justify-between ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200/80 shadow-sm'
          }`}>
            <span className="text-[10px] text-slate-500 font-bold uppercase font-mono tracking-widest">Total Rooms</span>
            <div className="flex items-baseline gap-1 mt-1">
              <strong className="text-2xl font-black text-white">{rooms.length}</strong>
              <span className="text-xs text-slate-500">managed</span>
            </div>
          </div>

          {/* Active Bookings */}
          <div className={`p-4 rounded-2xl border text-left flex flex-col justify-between ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200/80 shadow-sm'
          }`}>
            <span className="text-[10px] text-slate-500 font-bold uppercase font-mono tracking-widest">Active Bookings</span>
            <div className="flex items-baseline gap-1 mt-1">
              <strong className="text-2xl font-black text-indigo-400">
                {bookings.filter(b => b.status === 'Approved').length}
              </strong>
              <span className="text-xs text-slate-500">approved</span>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className={`p-4 rounded-2xl border text-left flex flex-col justify-between relative overflow-hidden ${
            pendingBookings.length > 0 
              ? 'bg-amber-950/20 border-amber-800/40' 
              : isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200/80 shadow-sm'
          }`}>
            <span className="text-[10px] text-slate-500 font-bold uppercase font-mono tracking-widest">Pending Approvals</span>
            <div className="flex items-baseline gap-1 mt-1">
              <strong className={`text-2xl font-black ${pendingBookings.length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {pendingBookings.length}
              </strong>
              <span className="text-xs text-slate-500">requests</span>
            </div>
            {pendingBookings.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>

          {/* Rooms Currently Occupied */}
          <div className={`p-4 rounded-2xl border text-left flex flex-col justify-between ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200/80 shadow-sm'
          }`}>
            <span className="text-[10px] text-slate-500 font-bold uppercase font-mono tracking-widest">Rooms Occupied</span>
            <div className="flex items-baseline gap-1 mt-1">
              <strong className={`text-2xl font-black ${occupiedRoomsCount > 0 ? 'text-rose-400' : 'text-white'}`}>
                {occupiedRoomsCount}
              </strong>
              <span className="text-xs text-slate-500">now</span>
            </div>
          </div>

          {/* Today's Utilization % */}
          <div className={`p-4 rounded-2xl border text-left flex flex-col justify-between ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200/80 shadow-sm'
          }`}>
            <span className="text-[10px] text-indigo-400 font-bold uppercase font-mono tracking-widest">Live Utilization</span>
            <div className="flex items-baseline gap-1 mt-1">
              <strong className="text-2xl font-black text-indigo-300">
                {currentUtilization}%
              </strong>
              <span className="text-xs text-slate-500">active occupancy</span>
            </div>
          </div>
        </div>

        {/* Actionable Pending Approvals List */}
        <div className="space-y-3 text-left">
          <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-[#0a4735]'}`}>
            <span>📥 Actionable Booking Requests ({pendingBookings.length})</span>
            {pendingBookings.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />}
          </h3>

          <div className={`border rounded-2xl divide-y divide-slate-800/40 overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200 shadow-sm'
          }`}>
            {pendingBookings.length > 0 ? (
              pendingBookings.map((b) => (
                <div key={b.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className={`text-xs font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                        {b.summary || b.purpose}
                      </strong>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-slate-950 text-indigo-400' : 'bg-indigo-50 text-indigo-700'}`}>
                        {b.roomName || b.room_name}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      📅 {formatDate(b.startTime)} &nbsp;|&nbsp; ⏰ {formatTime(b.startTime)} - {formatTime(b.endTime)}
                    </div>
                    <div className="text-[10.5px] text-slate-400">
                      Requested by <strong className="text-indigo-300">{b.creatorName}</strong> ({b.creatorEmail})
                    </div>
                    {b.agenda && (
                      <p className="text-[11px] text-slate-500 italic mt-1 font-serif">
                        Agenda: "{b.agenda}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => handleRejectPrompt(b.id)}
                      className="px-3 py-1.5 border border-rose-500/30 bg-rose-550/10 hover:bg-rose-550/25 text-rose-400 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => onApproveBooking && onApproveBooking(b.id)}
                      className="px-3 py-1.5 border border-emerald-500/30 bg-emerald-550/10 hover:bg-emerald-550/25 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 italic flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <span>Excellent! All student reservation bookings are processed and resolved.</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Occupancy Status of all Rooms */}
        <div className="space-y-3 text-left">
          <h3 className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-[#0a4735]'}`}>
            🏢 Live Room Occupancy Board
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {roomStatusList.map(({ room, statusInfo }) => (
              <div 
                key={room.id}
                className={`p-4 rounded-2xl border text-left space-y-2.5 transition-all ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <strong className={`text-xs block font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{room.name}</strong>
                  <span className={`text-[8.5px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${statusInfo.badgeColor}`}>
                    {statusInfo.status === 'occupied' ? '🔴 OCCUPIED' : statusInfo.status === 'reserved_soon' ? '🟡 SOON' : '🟢 VACANT'}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 font-mono flex flex-col gap-0.5">
                  <span>🏢 {room.building || 'Main Campus'}</span>
                  <span>👤 custodian: {room.contactDepartment || 'Academic Dept'}</span>
                </div>

                <div className={`p-2 rounded-lg text-[10px] font-mono ${
                  statusInfo.status === 'occupied' ? 'bg-rose-950/20 text-rose-450 border border-rose-900/10' :
                  statusInfo.status === 'reserved_soon' ? 'bg-amber-950/20 text-amber-450 border border-amber-900/10' :
                  'bg-emerald-950/20 text-emerald-450 border border-emerald-900/10'
                }`}>
                  {statusInfo.nextMessage}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {isAdmin ? renderAdminDashboard() : renderStudentDashboard()}
    </div>
  );
};
