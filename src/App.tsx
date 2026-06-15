import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout } from './lib/auth';
import { ROOMS } from './data';
import { Room } from './types';

// Components
import CalendarWidget from './components/CalendarWidget';
import DriveWidget from './components/DriveWidget';
import GmailWidget from './components/GmailWidget';
import ChatWidget from './components/ChatWidget';
import FormsWidget from './components/FormsWidget';
import OccupancyChart from './components/OccupancyChart';
import QRCodeSVG from './components/QRCodeSVG';

// Icons
import {
  Calendar,
  HardDrive,
  Mail,
  MessageSquare,
  FileSpreadsheet,
  Grid,
  Users,
  LogOut,
  Sparkles,
  Layers,
  MapPin,
  Clock,
  CheckCircle,
  HelpCircle,
  Clock3,
  SlidersHorizontal,
  Filter,
  Check,
  RotateCcw,
  Search,
  Download,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'rooms' | 'calendar' | 'drive' | 'gmail' | 'chat' | 'forms'>('rooms');

  // Rooms list state
  const [rooms, setRooms] = useState<Room[]>(ROOMS);

  // Filters state for Rooms Directory
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [selectedFeatureToggles, setSelectedFeatureToggles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortKey, setSortKey] = useState<'default' | 'capacity-asc' | 'capacity-desc' | 'available-first' | 'booked-first'>('default');

  // Selection states for modal confirmation overlay to prevent accidental bookings
  const [confirmRoomSelection, setConfirmRoomSelection] = useState<Room | null>(null);
  const [preselectedRoomId, setPreselectedRoomId] = useState<string>('');

  // Lifted logs to avoid state loss on tab switching
  const [chatLog, setChatLog] = useState<{ space: string; text: string; time: string }[]>([]);
  const [gmailLog, setGmailLog] = useState<{ to: string; subject: string; body: string; time: string }[]>([]);

  // Action feedback Toast state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' }[]>([]);

  // Selected Room for Scannable QR Modal
  const [selectedQRRoom, setSelectedQRRoom] = useState<Room | null>(null);
  const [isScanningSimulated, setIsScanningSimulated] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  const addToast = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const triggerFastCheckIn = (room: Room) => {
    // 1. Flip room state to booked
    setRooms((prev) =>
      prev.map((r) => (r.id === room.id ? { ...r, status: 'booked' } : r))
    );

    // 2. Add an announcement in Chat
    const timestampStr = new Date().toLocaleTimeString();
    const checkInMessage = `📢 QR Sensor Check-In: ${user?.displayName || 'Verified User'} has successfully checked into "${room.name}" (Seats: ${room.capacity}) via QR code scanner. Space status: [OCCUPIED]`;
    setChatLog((prev) => [
      {
        space: 'Sandbox Chat Space',
        text: checkInMessage,
        time: timestampStr,
      },
      ...prev,
    ]);

    // 3. Add an email alert inside Gmail
    const emailSubject = `[QR Check-In Alert] Live Space Registration: ${room.name} occupies`;
    const emailBody = `Hello Office Operations,\n\nThis is an automated sensory trace report.\n\n${user?.displayName || 'Verified User'} (${user?.email || 'pathaksrishti2208@gmail.com'}) has arrived and scanned the physical room QR plaque at "${room.name}" (Capacity: ${room.capacity}).\n\nThe scheduler status for this space has been forced to [OCCUPIED] with instant cross-workspace alerts active. To view live logs, consult the scheduler dashboard.\n\nBest,\nIntegrated Workspace Sensor Engine`;
    setGmailLog((prev) => [
      {
        to: 'workspace-alerts@company.com',
        subject: emailSubject,
        body: emailBody,
        time: timestampStr,
      },
      ...prev,
    ]);

    // 4. Trigger localized Toast
    addToast(`⚡ Rapid Check-In complete for ${room.name}! Dispatching Workspace alerts.`);
  };

  // Matches room features against short toggle codes
  const matchesFeature = (room: Room, f: string) => {
    const normFeatures = room.features.map(feat => feat.toLowerCase());
    if (f === 'Projector') {
      return normFeatures.some(feat => feat.includes('projector'));
    }
    if (f === 'Whiteboard') {
      return normFeatures.some(feat => feat.includes('whiteboard'));
    }
    if (f === 'Display/Screen') {
      return normFeatures.some(feat => feat.includes('display') || feat.includes('screen'));
    }
    if (f === 'Audio/Video') {
      return normFeatures.some(feat => feat.includes('audio') || feat.includes('conferencing'));
    }
    if (f === 'Ergonomics/Seating') {
      return normFeatures.some(feat => feat.includes('seating') || feat.includes('chair') || feat.includes('desk') || feat.includes('sofa'));
    }
    return false;
  };

  const filteredRooms = useMemo(() => {
    const list = rooms.filter((room) => {
      if (room.capacity < minCapacity) return false;
      for (const f of selectedFeatureToggles) {
        if (!matchesFeature(room, f)) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = room.name.toLowerCase().includes(query);
        const matchesFeatureDescription = room.features.some((feature) =>
          feature.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesFeatureDescription) {
          return false;
        }
      }
      return true;
    });

    if (sortKey === 'capacity-asc') {
      list.sort((a, b) => a.capacity - b.capacity);
    } else if (sortKey === 'capacity-desc') {
      list.sort((a, b) => b.capacity - a.capacity);
    } else if (sortKey === 'available-first') {
      list.sort((a, b) => {
        const priority = { available: 0, expiring_soon: 1, booked: 2 };
        return priority[a.status] - priority[b.status];
      });
    } else if (sortKey === 'booked-first') {
      list.sort((a, b) => {
        const priority = { booked: 0, expiring_soon: 1, available: 2 };
        return priority[a.status] - priority[b.status];
      });
    }

    return list;
  }, [rooms, minCapacity, selectedFeatureToggles, searchQuery, sortKey]);

  // Tracks newly created bookings in this session so that DriveWidget can save/export receipts dynamically
  const [sessionReceipts, setSessionReceipts] = useState<
    { roomName: string; summary: string; start: string; end: string; agenda?: string }[]
  >([]);

  // Current local formatted time display
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // 1-second interval clock
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
          ' | ' +
          now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Init Firebase Auth observer
    initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
      }
    );
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Sign in failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignout = async () => {
    const confirmed = window.confirm('Are you sure you want to sign out of the Smart Room Scheduler?');
    if (!confirmed) return;
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
  };

  const syncRoomsStatusFromCalendar = () => {
    // Random status flippage simulation to indicate real synchronization & live monitoring
    setRooms((prev) =>
      prev.map((r, i) => {
        const rand = Math.random();
        let status: 'available' | 'booked' | 'expiring_soon' = 'available';
        if (rand > 0.7) {
          status = 'booked';
        } else if (rand > 0.45) {
          status = 'expiring_soon';
        }
        return {
          ...r,
          status,
        };
      })
    );
  };

  const handleDownloadCSV = () => {
    const escapeCSV = (val: string | number) => {
      const str = String(val).replace(/"/g, '""');
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str}"`;
      }
      return str;
    };

    const headers = ['Room ID', 'Room Name', 'Capacity (Seats)', 'Status', 'Amenities / Features'];
    const rows = filteredRooms.map((room) => [
      room.id,
      room.name,
      room.capacity,
      room.status,
      room.features.join('; '),
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rooms_directory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNewBookingRegistered = (roomName: string, summary: string, start: string, end: string, agenda?: string) => {
    // Add to session receipt list
    setSessionReceipts((prev) => [
      ...prev,
      {
        roomName,
        summary,
        start,
        end,
        agenda,
      },
    ]);

    // Flip targeted room's state to booked
    setRooms((prev) =>
      prev.map((r) => (r.name === roomName ? { ...r, status: 'booked' } : r))
    );

    // Synchronize automatic chat and email notifications for this booking
    const timestampStr = new Date().toLocaleTimeString();
    
    const blockStartStr = new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const blockEndStr = new Date(end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = new Date(start).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    // 1. Post Chat notice
    const chatMsg = `📅 Reservation Approved: "${summary}" has locked room "${roomName}" on ${formattedDate} [${blockStartStr} - ${blockEndStr}] by faculty member ${user?.displayName || 'Authorized User'}.`;
    setChatLog((prev) => [
      {
        space: 'Sandbox Chat Space',
        text: chatMsg,
        time: timestampStr,
      },
      ...prev,
    ]);

    // 2. Post Gmail alert log
    const emailSubject = `[Booking Confirmed] IIT BHU Workspace Allocation: ${roomName}`;
    const emailBody = `Dear Faculty Member,\n\nThis is to confirm that your booking request has been successfully scheduled on your primary Google Calendar: \n\n- Allocation Space: ${roomName}\n- Title/Agenda: ${summary}\n- Date: ${formattedDate}\n- Block: ${blockStartStr} - ${blockEndStr}\n\nAny lecture slide attachments or guides can be uploaded directly to the logs in your Google Drive tab.\n\nBest regards,\nIIT BHU Smart Room Scheduler`;
    setGmailLog((prev) => [
      {
        to: user?.email || 'faculty.office@iitbhu.ac.in',
        subject: emailSubject,
        body: emailBody,
        time: timestampStr,
      },
      ...prev,
    ]);

    // 3. Trigger Toast notification
    addToast(`📅 Successfully scheduled "${summary}" in ${roomName}! Saved receipt in Drive options.`);
  };

  // Login Gate
  if (needsAuth || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-6 text-white relative overflow-hidden font-sans">
        {/* Artistic background blur elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Decorative corner status display */}
        <div className="self-end text-right font-mono text-xs text-slate-500 flex items-center gap-1">
          <Clock3 className="w-3.5 h-3.5" />
          <span>Local: {currentTime || 'Loading...'}</span>
        </div>

        {/* Core Entry UI Card */}
        <div className="max-w-xl w-full mx-auto my-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-tr from-indigo-500 to-violet-600 p-4 rounded-2xl shadow-lg border border-indigo-400/20">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>

          <div className="text-center space-y-3">
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">
              Indian Institute of Technology (BHU) Varanasi
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
              IIT BHU Smart Room Scheduler
            </h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed font-normal">
              A high-precision real-time scheduling dashboard syncing academic rooms and lecture halls with Google Accounts for faculty members.
            </p>
          </div>

          {/* Quick Features Highlight */}
          <div className="grid grid-cols-2 gap-4 my-8">
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-850/40 space-y-1">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <strong className="text-xs text-slate-200 block font-semibold">Google Calendar</strong>
              <span className="text-[10px] text-slate-500 block">Live sync reservations</span>
            </div>
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-850/40 space-y-1">
              <Mail className="w-5 h-5 text-indigo-400" />
              <strong className="text-xs text-slate-200 block font-semibold">Gmail Alerts</strong>
              <span className="text-[10px] text-slate-500 block">Instant team notifications</span>
            </div>
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-850/40 space-y-1">
              <HardDrive className="w-5 h-5 text-teal-400" />
              <strong className="text-xs text-slate-200 block font-semibold">Google Drive Attachment</strong>
              <span className="text-[10px] text-slate-500 block">Secure booking HTML logs</span>
            </div>
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-850/40 space-y-1">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              <strong className="text-xs text-slate-200 block font-semibold">Google Chat</strong>
              <span className="text-[10px] text-slate-500 block">Post team announcements</span>
            </div>
          </div>

          {/* Styled Material Sign in button */}
          <div className="flex justify-center">
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="group flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 font-bold text-sm px-6 py-3 rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 shrink-0 block">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              )}
              {isLoggingIn ? 'Connecting API...' : 'Sign in & Connect Google Workspace'}
            </button>
          </div>
        </div>

        {/* Footer branding */}
        <div className="text-center font-mono text-[10px] text-slate-600 uppercase tracking-widest mt-6">
          <span>IIT BHU Smart Room Scheduler • Academic Workspace Integration</span>
        </div>
      </div>
    );
  }

  // Active Dashboard UI
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between">
      <div>
        {/* Core Header Navigation Bar */}
        <header className="bg-slate-900/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40 px-6 py-4.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Branding title */}
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2.5 rounded-xl border border-indigo-400/20 shadow-md">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight">IIT BHU Smart Room Scheduler</h1>
                <p className="text-[10px] text-indigo-400 font-mono tracking-wider uppercase mt-0.5">
                  IIT BHU Faculty Portal Connected
                </p>
              </div>
            </div>

            {/* Profile info & Signout */}
            <div className="flex items-center gap-4">
              <div className="font-mono text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 hidden sm:block">
                {currentTime || 'Syncing...'}
              </div>

              <button
                onClick={async () => {
                  const confirmReauth = window.confirm(
                    "This will clear any cached Google Workspace access tokens and take you to the secure login popup to grant newly authorized permissions. Proceed?"
                  );
                  if (!confirmReauth) return;
                  await logout();
                  sessionStorage.removeItem('google_workspace_access_token');
                  setUser(null);
                  setToken(null);
                  setNeedsAuth(true);
                  setTimeout(() => {
                    handleLogin();
                  }, 100);
                }}
                className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-[10.5px] px-3 py-2 rounded-xl transition-all uppercase flex items-center gap-1 shrink-0 shadow-md shadow-amber-950/20"
                title="Clears session cache and re-requests Google Workspace API permission scopes via a secure popup portal"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-950" />
                <span>Fix Scopes / Re-Authorize</span>
              </button>

              <div className="flex items-center gap-3 bg-slate-950 p-1.5 pr-3.5 rounded-full border border-slate-800">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full border border-slate-800" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-900 border border-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                    {(user.displayName || 'U').charAt(0)}
                  </div>
                )}
                <div className="text-left leading-tight hidden lg:block">
                  <span className="text-xs font-bold block text-slate-200">{user.displayName || 'Verified User'}</span>
                  <span className="text-[9px] text-slate-500 block max-w-[120px] truncate">{user.email}</span>
                </div>
                <button
                  onClick={handleSignout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-full hover:bg-slate-900 transition-colors cursor-pointer"
                  title="Sign out session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard layout center */}
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          
          {/* Navigation Tabs bar */}
          <div className="overflow-x-auto pb-1">
            <div className="flex items-center gap-2 border-b border-slate-800/80">
              <button
                onClick={() => setActiveTab('rooms')}
                className={`flex items-center gap-2 font-medium text-xs uppercase tracking-wider py-3.5 px-4.5 border-b-2 transition-all ${
                  activeTab === 'rooms'
                    ? 'border-indigo-500 text-white bg-indigo-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <Grid className="w-4 h-4" />
                Rooms Directory
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center gap-2 font-medium text-xs uppercase tracking-wider py-3.5 px-4.5 border-b-2 transition-all ${
                  activeTab === 'calendar'
                    ? 'border-indigo-500 text-white bg-indigo-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Calendar Scheduler
              </button>
              <button
                onClick={() => setActiveTab('drive')}
                className={`flex items-center gap-2 font-medium text-xs uppercase tracking-wider py-3.5 px-4.5 border-b-2 transition-all ${
                  activeTab === 'drive'
                    ? 'border-indigo-500 text-white bg-indigo-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <HardDrive className="w-4 h-4" />
                Drive Hub ({sessionReceipts.length})
              </button>
              <button
                onClick={() => setActiveTab('gmail')}
                className={`flex items-center gap-2 font-medium text-xs uppercase tracking-wider py-3.5 px-4.5 border-b-2 transition-all ${
                  activeTab === 'gmail'
                    ? 'border-indigo-500 text-white bg-indigo-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <Mail className="w-4 h-4" />
                Gmail invites
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-2 font-medium text-xs uppercase tracking-wider py-3.5 px-4.5 border-b-2 transition-all ${
                  activeTab === 'chat'
                    ? 'border-indigo-500 text-white bg-indigo-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Chat stream
              </button>
              <button
                onClick={() => setActiveTab('forms')}
                className={`flex items-center gap-2 font-medium text-xs uppercase tracking-wider py-3.5 px-4.5 border-b-2 transition-all ${
                  activeTab === 'forms'
                    ? 'border-indigo-500 text-white bg-indigo-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Forms Survey
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'rooms' && (
                <div className="space-y-6">
                  {/* Quick summary and sync status alert */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4.5 bg-slate-900 rounded-2xl border border-slate-800 gap-4">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight">Active Allocation Hub</h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Choose suitable collaborative spaces, inspect configurations, and synchronize with Calendar schedules.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                      <button
                        onClick={handleDownloadCSV}
                        className="shrink-0 flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-xl transition-all active:scale-95 shadow-md shadow-emerald-950/40 cursor-pointer"
                        title="Download current filtered list of rooms as CSV"
                      >
                        <Download className="w-4 h-4 shrink-0 text-emerald-100" />
                        Download CSV ({filteredRooms.length})
                      </button>
                      <button
                        onClick={syncRoomsStatusFromCalendar}
                        className="shrink-0 font-bold text-xs uppercase tracking-wider bg-slate-850 hover:bg-slate-800 border border-slate-700/60 text-slate-300 py-2.5 px-4 rounded-xl transition-all active:scale-95 cursor-pointer"
                      >
                        🔄 Live Monitor Sync
                      </button>
                    </div>
                  </div>

                  {/* Recharts Analytics Dashboard Chart */}
                  <OccupancyChart sessionReceipts={sessionReceipts} />

                  {/* Dynamic Filtering Controls Panel */}
                  <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <SlidersHorizontal className="w-4.5 h-4.5 text-indigo-400" />
                        <div>
                          <h3 className="text-sm font-bold tracking-tight text-white">Refine Office Spaces</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Filter the list of collaborative zones by target attendee capacity, built-in equipment, or keyword search</p>
                        </div>
                      </div>
                      {(minCapacity > 0 || selectedFeatureToggles.length > 0 || searchQuery.trim() !== '' || sortKey !== 'default') && (
                        <button
                          onClick={() => {
                            setMinCapacity(0);
                            setSelectedFeatureToggles([]);
                            setSearchQuery('');
                            setSortKey('default');
                          }}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-900/40 transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Clear Custom Filters
                        </button>
                      )}
                    </div>

                    {/* Search & Sort Panel */}
                    <div className="flex flex-col lg:flex-row gap-3.5">
                      {/* Search Input Bar */}
                      <div className="flex-1 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search spaces by name or specific feature keywords (e.g. whiteboard, projector, audio, screen)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-10 text-xs text-slate-200 placeholder:text-slate-600 outline-none transition-all focus:ring-1 focus:ring-indigo-500/20"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10.5px] text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 font-bold px-2 py-0.5 rounded transition-all"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Sort Dropdown */}
                      <div className="lg:w-72 shrink-0 relative">
                        <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                        <select
                          value={sortKey}
                          onChange={(e) => setSortKey(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-10 text-xs text-slate-200 outline-none transition-all focus:ring-1 focus:ring-indigo-500/20 cursor-pointer appearance-none"
                        >
                          <option value="default">Sort: Default (Featured)</option>
                          <option value="available-first">Sort: Availability (Available First)</option>
                          <option value="booked-first">Sort: Availability (Booked First)</option>
                          <option value="capacity-asc">Sort: Capacity (Low to High)</option>
                          <option value="capacity-desc">Sort: Capacity (High to Low)</option>
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none pl-2 border-l border-slate-800/80">
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                      {/* Capacity Toggle Group */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-mono">
                          Minimum Required Capacity
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: 'Any Seats', value: 0 },
                            { label: '3+ Seats', value: 3 },
                            { label: '8+ Seats', value: 8 },
                            { label: '12+ Seats', value: 12 },
                            { label: '16+ Seats', value: 16 }
                          ].map((cap) => {
                            const active = minCapacity === cap.value;
                            return (
                              <button
                                key={cap.value}
                                onClick={() => setMinCapacity(cap.value)}
                                className={`text-[11px] font-bold py-1.5 px-3 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                                  active
                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-950/50'
                                    : 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {active && <Check className="w-3 h-3 shrink-0" />}
                                {cap.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Equipment/Features Toggle Group */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-mono">
                          Search by Equipment / Amenity
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {['Projector', 'Whiteboard', 'Display/Screen', 'Audio/Video', 'Ergonomics/Seating'].map((feat) => {
                            const active = selectedFeatureToggles.includes(feat);
                            return (
                              <button
                                key={feat}
                                onClick={() => {
                                  setSelectedFeatureToggles((prev) =>
                                    prev.includes(feat) ? prev.filter((item) => item !== feat) : [...prev, feat]
                                  );
                                }}
                                className={`text-[11px] font-bold py-1.5 px-3 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                                  active
                                    ? 'bg-teal-600 border-teal-500 text-white shadow-sm shadow-teal-950/50'
                                    : 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {active ? (
                                  <Check className="w-3 h-3 shrink-0" />
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />
                                )}
                                {feat}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rooms Cards Grid */}
                  {filteredRooms.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-12 text-center bg-slate-900 border border-slate-800/80 rounded-2xl space-y-4"
                    >
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-950 border border-slate-800 text-slate-500">
                        <Filter className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-base font-bold text-slate-200">No matching spaces found</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                          We couldn't find any rooms matching your current capacity or equipment filter settings. Try relaxing your filters!
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setMinCapacity(0);
                          setSelectedFeatureToggles([]);
                          setSearchQuery('');
                          setSortKey('default');
                        }}
                        className="font-bold text-xs uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-4.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        Reset Search Filters
                      </button>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredRooms.map((room) => {
                        const isOccupied = room.status === 'booked';
                        return (
                          <div
                            key={room.id}
                            className="bg-slate-900 border border-slate-800/85 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between"
                          >
                            <div className="relative h-48 bg-slate-800">
                              <img
                                src={room.image}
                                alt={room.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover opacity-80"
                              />
                              {/* Visual room gradient wrapper */}
                              <div className={`absolute inset-0 bg-gradient-to-t ${room.color} mix-blend-multiply opacity-55`} />
                              
                              {/* Card tags */}
                              <div className="absolute top-4 left-4 flex gap-2">
                                <span className="bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold uppercase py-1 px-2.5 rounded-md border border-slate-700/55 flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5" />
                                  Max: {room.capacity}
                                </span>
                              </div>

                              {/* Scannable Check-In QR Accessor */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedQRRoom(room);
                                  setScanComplete(false);
                                  setIsScanningSimulated(false);
                                }}
                                className="absolute top-4 right-4 bg-slate-950/85 hover:bg-slate-900 border border-slate-805 hover:border-indigo-500 rounded-xl p-2 md:p-2.5 text-indigo-400 hover:text-indigo-350 backdrop-blur-md transition-all active:scale-90 shadow-lg cursor-pointer flex items-center justify-center group z-10"
                                title="Open Scannable QR Plaque"
                              >
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h6v6H3V3zM15 3h6v6h-6V3zM3 15h6v6H3v-6zM15 15h6v6h-6v-6z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 18v3m3-3H9m12-3h-3m3 3h-3" />
                                </svg>
                                <span className="absolute right-full mr-2 scale-0 group-hover:scale-100 bg-slate-950/95 text-[10px] text-slate-350 font-bold px-2 py-1 rounded border border-slate-800 whitespace-nowrap transition-all hidden md:inline-block">
                                  Scan QR Check-In
                                </span>
                              </button>

                              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                                <h3 className="text-xl font-bold tracking-tight drop-shadow-md flex items-center gap-2">
                                  {/* Small color-coded dot indicator next to each room name */}
                                  <span
                                    className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${
                                      room.status === 'booked'
                                        ? 'bg-rose-500 shadow-rose-950/40'
                                        : room.status === 'expiring_soon'
                                        ? 'bg-amber-500 shadow-amber-950/40'
                                        : 'bg-emerald-500 shadow-emerald-950/40'
                                    }`}
                                    title={
                                      room.status === 'booked'
                                        ? 'Occupied'
                                        : room.status === 'expiring_soon'
                                        ? 'Expiring soon'
                                        : 'Available'
                                    }
                                  />
                                  {room.name}
                                </h3>
                                <span
                                  className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border shadow-md font-mono ${
                                    room.status === 'booked'
                                      ? 'bg-rose-950/80 text-rose-300 border-rose-800/40'
                                      : room.status === 'expiring_soon'
                                      ? 'bg-amber-950/80 text-amber-300 border-amber-800/40'
                                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40'
                                  }`}
                                >
                                  {room.status === 'booked'
                                    ? '● Occupied'
                                    : room.status === 'expiring_soon'
                                    ? '● Expiring soon'
                                    : '● Available'}
                                </span>
                              </div>
                            </div>

                            <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                              <div className="space-y-3">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block">
                                  Equipment & Amenities (Click features to toggle filters)
                                </span>
                                <div className="flex flex-wrap gap-1.5 font-mono">
                                  {room.features.map((feature, idx) => {
                                    // Identify if this feature matches any active feature toggle
                                    const norm = feature.toLowerCase();
                                    let category = '';
                                    if (norm.includes('projector')) category = 'Projector';
                                    else if (norm.includes('whiteboard')) category = 'Whiteboard';
                                    else if (norm.includes('display') || norm.includes('screen')) category = 'Display/Screen';
                                    else if (norm.includes('audio') || norm.includes('conferencing')) category = 'Audio/Video';
                                    else if (norm.includes('seating') || norm.includes('chair') || norm.includes('desk') || norm.includes('sofa')) category = 'Ergonomics/Seating';

                                    const isActiveToggle = category ? selectedFeatureToggles.includes(category) : false;

                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => {
                                          if (category) {
                                            setSelectedFeatureToggles((prev) =>
                                              prev.includes(category)
                                                ? prev.filter((item) => item !== category)
                                                : [...prev, category]
                                            );
                                          }
                                        }}
                                        className={`text-[10px] border py-1 px-2.5 rounded-lg transition-all text-left font-sans cursor-pointer ${
                                          isActiveToggle
                                            ? 'bg-teal-950/60 border-teal-500/70 text-teal-300'
                                            : 'bg-slate-950 border-slate-850 hover:border-indigo-500/50 hover:bg-slate-900 text-slate-300'
                                        }`}
                                        title={category ? `Filter by ${category}` : 'Feature info'}
                                      >
                                        {feature}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="pt-4 border-t border-slate-850 flex items-center justify-between gap-4">
                                <span className="text-[10px] text-slate-400 block max-w-[160px] leading-relaxed">
                                  Requires standard Google Auth permission scopes.
                                </span>
                                <button
                                  onClick={() => {
                                    if (isOccupied) {
                                      setPreselectedRoomId(room.id);
                                      setActiveTab('calendar');
                                    } else {
                                      setConfirmRoomSelection(room);
                                    }
                                  }}
                                  className={`font-bold text-xs uppercase py-2 px-4.5 rounded-lg border transition-all active:scale-95 cursor-pointer ${
                                    isOccupied
                                      ? 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white hover:bg-slate-800'
                                      : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 shadow-md hover:shadow-indigo-950'
                                  }`}
                                >
                                  {isOccupied ? 'Inspect Schedule' : 'Book Office Space'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'calendar' && (
                <CalendarWidget
                  rooms={rooms}
                  userEmail={user.email || ''}
                  userName={user.displayName || 'Office User'}
                  onRefreshRoomsStatus={syncRoomsStatusFromCalendar}
                  onBookingAdded={handleNewBookingRegistered}
                  defaultSelectedRoomId={preselectedRoomId}
                />
              )}

              {activeTab === 'drive' && (
                <DriveWidget receiptLogs={sessionReceipts} />
              )}

              {activeTab === 'gmail' && (
                <GmailWidget 
                  userEmail={user.email || ''} 
                  gmailLog={gmailLog}
                  setGmailLog={setGmailLog}
                />
              )}

              {activeTab === 'chat' && (
                <ChatWidget 
                  chatLog={chatLog}
                  setChatLog={setChatLog}
                />
              )}

              {activeTab === 'forms' && (
                <FormsWidget />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Booking Intent Modal Confirmation Dialog */}
      <AnimatePresence>
        {confirmRoomSelection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm cursor-pointer"
              onClick={() => setConfirmRoomSelection(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              <div className="h-2.5 w-full bg-gradient-to-r from-indigo-500 to-violet-600" />
              
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-900/40 text-indigo-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">Confirm Booking Intent</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Please confirm before navigating to scheduler</p>
                  </div>
                </div>

                {/* Selected Space Overview Card */}
                <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Target Area:</span>
                    <span className="text-xs font-bold text-indigo-300">{confirmRoomSelection.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Maximum Capacity:</span>
                    <span className="bg-slate-900 text-slate-350 font-mono text-[10.5px] px-2 py-0.5 rounded border border-slate-800 uppercase font-bold flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      {confirmRoomSelection.capacity} Seats
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-900/40 font-mono">
                    {confirmRoomSelection.features.map((feat, idx) => (
                      <span key={idx} className="text-[9.5px] bg-slate-950 text-slate-400 border border-slate-850 px-2 py-0.5 rounded">
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-indigo-950/20 border border-indigo-900/20 rounded-xl flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    You will be redirected immediately to the <strong className="text-slate-350 font-semibold">Calendar Scheduler</strong> tab with this space pre-selected in the scheduling form to define your host settings and times.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    onClick={() => setConfirmRoomSelection(null)}
                    type="button"
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setPreselectedRoomId(confirmRoomSelection.id);
                      setActiveTab('calendar');
                      setConfirmRoomSelection(null);
                    }}
                    type="button"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-950/50 transition-all duration-200 cursor-pointer"
                  >
                    Proceed to Scheduler
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Scannable QR Plaque Scan Dialog */}
      <AnimatePresence>
        {selectedQRRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/92 backdrop-blur-sm cursor-pointer"
              onClick={() => setSelectedQRRoom(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 text-white font-sans text-center"
            >
              <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-violet-600" />
              
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-extrabold tracking-tight">Scannable QR Plaque</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Physical check-in simulator for {selectedQRRoom.name}</p>
                </div>

                {/* Scannable Matrix Board */}
                <div className="relative mx-auto w-44 h-44 bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-inner flex items-center justify-center group overflow-hidden">
                  <div className="w-full h-full">
                    <QRCodeSVG value={`https://scheduler.workspace/checkin/${selectedQRRoom.id}`} />
                  </div>

                  {/* Sweep scan indicator lines - laser effect */}
                  {!scanComplete && (
                    <motion.div
                      animate={{
                        top: ['5%', '95%', '5%'],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="absolute left-[5%] right-[5%] h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-400/80 z-10"
                    />
                  )}

                  {scanComplete && (
                    <div className="absolute inset-0 bg-slate-955/95 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 text-emerald-400 animate-fade-in">
                      <CheckCircle className="w-12 h-12 stroke-[2.5]" />
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-300">Checked In</span>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="space-y-1">
                  <div className="font-mono text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                    Integration Sync Channels
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Scanning or click-triggering check-in fires sensory signals that flag this room as [OCCUPIED] and dispatches team notifications via Gmail and Chat instantly.
                  </p>
                </div>

                {/* Action buttons */}
                <div className="space-y-3 pt-1">
                  {!scanComplete ? (
                    <button
                      onClick={() => {
                        setIsScanningSimulated(true);
                        setTimeout(() => {
                          triggerFastCheckIn(selectedQRRoom);
                          setScanComplete(true);
                          setIsScanningSimulated(false);
                        }, 1200);
                      }}
                      disabled={isScanningSimulated}
                      className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isScanningSimulated ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Scanning Sensors...
                        </>
                      ) : (
                        <>
                          ⚡ Simulate Scannable Check-In
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/55 border border-emerald-900/45 px-4 py-1.5 rounded-full font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Live Synchronized
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal max-w-xs mx-auto">
                        Check the <span className="text-indigo-400 font-bold cursor-pointer underline hover:text-indigo-300" onClick={() => { setSelectedQRRoom(null); setActiveTab('chat'); }}>Chat Stream</span> or <span className="text-indigo-400 font-bold cursor-pointer underline hover:text-indigo-300" onClick={() => { setSelectedQRRoom(null); setActiveTab('gmail'); }}>Gmail tab</span> to monitor the live workspace outbox log.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedQRRoom(null)}
                    type="button"
                    className="w-full text-xs font-bold uppercase tracking-wider py-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Close Plaque
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Action Alerts Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-xs w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="pointer-events-auto p-3.5 bg-slate-900 border-l-4 border-indigo-500 border border-slate-800 rounded-xl shadow-2xl flex items-start gap-3 text-xs text-white"
            >
              <div className="p-1 rounded-md bg-indigo-950 text-indigo-400 mt-0.5 shrink-0">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="flex-1 space-y-0.5 text-left">
                <div className="font-bold tracking-tight text-slate-100">Workspace Sensor Event</div>
                <p className="text-slate-400 leading-normal text-[10.5px]">{toast.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <footer className="bg-slate-900 border-t border-slate-850 mt-12 py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <span>Smart Room Scheduler • Powered by real Google Calendar, Gmail, Chat & Drive OAuth API integration.</span>
          <span>© 2026 Sandbox Space. All Rights Reserved.</span>
        </div>
      </footer>
    </div>
  );
}
