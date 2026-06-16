import React, { useState, useEffect, useMemo } from 'react';
import { initAuth, googleSignIn, logout } from './lib/auth';
import { Room } from './types';
import {
  authAPI,
  roomsAPI,
  bookingsAPI,
  adminAPI,
  analyticsAPI,
  notificationsAPI,
  setSessionToken,
  getSessionToken
} from './lib/api';
import { supabase, isSupabaseConfigured, subscribeToSupabaseErrors } from './lib/supabaseClient';

// Components
import CalendarWidget from './components/CalendarWidget';
import DriveWidget from './components/DriveWidget';
import GmailWidget from './components/GmailWidget';
import ChatWidget from './components/ChatWidget';
import FormsWidget from './components/FormsWidget';
import OccupancyChart from './components/OccupancyChart';
import QRCodeSVG from './components/QRCodeSVG';
import { AIWidget } from './components/AIWidget';

// Recharts for statistical graphs
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

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
  Clock3,
  SlidersHorizontal,
  Filter,
  Check,
  RotateCcw,
  Search,
  Download,
  ArrowUpDown,
  Lock,
  Plus,
  Shield,
  Activity,
  Trash2,
  AlertTriangle,
  UserCheck,
  Award,
  Link2,
  TrendingUp,
  Sliders,
  Bell,
  CheckSquare,
  Sun,
  Moon,
  ExternalLink,
  X,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

interface WorkspaceGateProps {
  activeTab: string;
  isIframe: boolean;
  onLink: () => void;
  onBypass?: () => void;
}

function WorkspaceGate({ activeTab, isIframe, onLink, onBypass }: WorkspaceGateProps) {
  return (
    <div className="max-w-xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
        <Link2 className="w-8.5 h-8.5 text-indigo-400 animate-pulse" />
      </div>
      <div className="space-y-2 relative z-10">
        <h2 className="text-xl font-bold tracking-tight text-white capitalize">Google {activeTab} Sync Desk</h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
          Access to the {activeTab} workspace and real-time smart integration features requires you to link and synchronize your authenticated Google credentials.
        </p>
      </div>

      <div className="space-y-3 relative z-10">
        <button
          onClick={onLink}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-550 text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer mx-auto"
        >
          <Link2 className="w-4 h-4" />
          <span>Link Google Workspace Now</span>
        </button>

        {onBypass && (
          <button
            onClick={onBypass}
            className="w-full py-2.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-amber-400/90 hover:text-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mx-auto shadow-md"
            title="Bypass popup requirements and simulate Google Workspace for evaluation inside the sandbox"
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Simulate / Bypass Popup (Demo Mode)</span>
          </button>
        )}
      </div>

      {isIframe && (
        <div className="bg-amber-950/40 border border-amber-900/40 p-5 rounded-2xl text-left space-y-2.5 relative z-10 mt-4">
          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5 font-mono uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Iframe Sandbox Warning</span>
          </div>
          <p className="text-[10.5px] leading-relaxed text-amber-400/80">
            Since this application is loaded inside an iframe on <strong>Google AI Studio</strong>, your browser's security blocks standard Google login popup windows by default.
          </p>
          <div className="p-2.5 bg-amber-950/60 rounded-xl border border-amber-850/20 text-[10.5px] font-semibold text-amber-250 leading-relaxed">
            💡 <strong>Solution:</strong> Look at the <strong>toolbar / tabs in Google AI Studio</strong> (top right) and click the <strong>"Open in New Tab"</strong> button. Linking and synchronizing will work perfectly from there!
          </div>
          {onBypass && (
            <div className="pt-1.5 border-t border-amber-900/40">
              <button
                onClick={onBypass}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Instantly Bypass with Demo Sync</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  // DB & Auth states
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // High-performance theme state supporting system preferences & persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('iitbhu-theme');
    if (saved) {
      return saved !== 'light';
    }
    // Default to dark mode (matches original custom teal branding)
    return true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('iitbhu-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Form states for login/signup
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerRole, setRegisterRole] = useState<'student' | 'faculty' | 'admin'>('student');

  // Google Workspace account bind state
  const [googleWorkspaceLinked, setGoogleWorkspaceLinked] = useState(false);
  const [googleProfile, setGoogleProfile] = useState<any>(null);
  const [isIframe, setIsIframe] = useState(false);

  // Resilient Custom Confirmation Modal state to replace window.confirm blocks (which crash inside sandbox iframes)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  } | null>(null);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  // Active workspace states
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeTab, setActiveTab] = useState<'rooms' | 'calendar' | 'drive' | 'gmail' | 'chat' | 'forms' | 'analytics' | 'admin' | 'ai'>('rooms');

  // Notifications states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

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
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' | 'error' }[]>([]);

  // Selected Room for Scannable QR Modal
  const [selectedQRRoom, setSelectedQRRoom] = useState<Room | null>(null);
  const [selectedRoomForHistory, setSelectedRoomForHistory] = useState<Room | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [isScanningSimulated, setIsScanningSimulated] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  // Admin section lists
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminBookings, setAdminBookings] = useState<any[]>([]);

  // Admin New Room form
  const [adminRoomName, setAdminRoomName] = useState('');
  const [adminRoomCapacity, setAdminRoomCapacity] = useState(30);
  const [adminRoomFeatures, setAdminRoomFeatures] = useState('');
  const [adminRoomImage, setAdminRoomImage] = useState('');
  const [adminRoomColor, setAdminRoomColor] = useState('from-slate-700 to-slate-900');

  // Deep Analytics stats
  const [analyticsStats, setAnalyticsStats] = useState<any>(null);

  // Current local live formatted clock
  const [currentTime, setCurrentTime] = useState('');

  const [sessionReceipts, setSessionReceipts] = useState<
    { roomName: string; summary: string; start: string; end: string; agenda?: string }[]
  >([]);

  // Live timer tick
  useEffect(() => {
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

  // Sync state with local storage tokens on load
  useEffect(() => {
    async function checkSession() {
      const storedToken = getSessionToken();
      if (storedToken) {
        try {
          setToken(storedToken);
          const meResponse = await authAPI.getMe();
          setUser(meResponse.user);
          setNeedsAuth(false);
          setGoogleWorkspaceLinked(!!sessionStorage.getItem('google_workspace_access_token'));
          fetchDashboardModels(meResponse.user.role);
        } catch (err) {
          console.warn('Session expired. Taking you back to login portal:', err);
          setSessionToken(null);
          setNeedsAuth(true);
        }
      } else {
        setNeedsAuth(true);
      }
    }
    checkSession();
  }, []);

  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Register centralized error listener for Supabase cloud queries and network operations failures
  useEffect(() => {
    const unsubscribe = subscribeToSupabaseErrors((message) => {
      addToast(message, 'error');
    });

    const handleGoogleTokenInvalid = () => {
      setGoogleWorkspaceLinked(false);
      addToast('Your Google Workspace session has expired or is invalid. Please link your account again.', 'error');
    };

    window.addEventListener('google-token-invalid', handleGoogleTokenInvalid);

    return () => {
      unsubscribe();
      window.removeEventListener('google-token-invalid', handleGoogleTokenInvalid);
    };
  }, []);

  const fetchDashboardModels = async (role: string) => {
    try {
      // 1. Fetch live rooms
      const list = await roomsAPI.list();
      setRooms(list);

      // 2. Fetch live bookings
      const bookings = await bookingsAPI.list();
      setAdminBookings(bookings);

      // 3. Fetch analytics
      const stats = await analyticsAPI.getStats();
      setAnalyticsStats(stats);

      // 4. Fetch admin users state
      if (role === 'admin') {
        const uList = await adminAPI.listUsers();
        setAdminUsers(uList);
      }

      // 5. Fetch live notifications
      try {
        const notifList = await notificationsAPI.list();
        setNotifications(notifList);
      } catch (ne) {
        console.warn('Could not populate live notifications:', ne);
      }
    } catch (err: any) {
      console.error('Failed loading resources:', err);
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.warn('Failed marking notifications read:', err);
    }
  };

  // Poll for background notification updates to keep state synced without manual reloads
  useEffect(() => {
    if (!token) return;
    const intervalIdx = setInterval(() => {
      notificationsAPI.list()
        .then((notifList) => {
          setNotifications(notifList);
        })
        .catch(() => {});
    }, 8000);
    return () => clearInterval(intervalIdx);
  }, [token]);

  // Realtime Supabase Subscription to keep lists synchronized instantly
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !token || !user) return;

    console.log('⚡ Establishing live Supabase Realtime subscriptions...');

    // 1. Subscribe to Bookings Table
    const bookingsChannel = supabase
      .channel('realtime:bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          console.log('🔔 Realtime Bookings Update witnessed:', payload);
          // Reload all state modules
          fetchDashboardModels(user.role);

          // Render live feedback / announcements depending on mutation event
          if (payload.eventType === 'INSERT') {
            const b = payload.new;
            addToast(`Room Bound: "${b.room_name || 'Room'}" booked for "${b.summary}"`, 'success');
          } else if (payload.eventType === 'DELETE') {
            addToast('A booking reservation has been cancelled.', 'info');
          } else if (payload.eventType === 'UPDATE') {
            addToast('Booking status or info has been updated.', 'info');
          }
        }
      )
      .subscribe();

    // 2. Subscribe to Rooms Table
    const roomsChannel = supabase
      .channel('realtime:rooms')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        (payload) => {
          console.log('🔔 Realtime Rooms Update witnessed:', payload);
          fetchDashboardModels(user.role);
          if (payload.eventType === 'UPDATE') {
            addToast(`Room attributes updated: "${payload.new.name || 'Room'}"`, 'info');
          }
        }
      )
      .subscribe();

    // 3. Subscribe to Notifications Table
    const notificationsChannel = supabase
      .channel('realtime:notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('🔔 Realtime Notifications Update witnessed:', payload);
          if (payload.eventType === 'INSERT') {
            // Append the new notification to state immediately
            setNotifications((prev) => [payload.new, ...prev].slice(0, 50));
            addToast(`System Notification: ${payload.new.title}`, 'info');
          } else {
            // Hot reload full notification panel
            notificationsAPI.list()
              .then((list) => setNotifications(list))
              .catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      console.log('⚡ Cleaned up live Supabase Realtime subscriptions.');
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [token, user?.role, isSupabaseConfigured]);

  // ==========================================
  // SIGN IN & REGISTRATION CONTROLLERS
  // ==========================================
  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const response = await authAPI.login({ email: loginEmail, password: loginPassword });
      setSessionToken(response.token, true);
      setUser(response.user);
      setToken(response.token);
      setNeedsAuth(false);
      addToast(`Access granted! Welcome, ${response.user.name}.`, 'success');
      fetchDashboardModels(response.user.role);
    } catch (err: any) {
      addToast(err.message || 'Incorrect login coordinates.', 'info');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCredentialsRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const response = await authAPI.register({
        email: registerEmail.toLowerCase(),
        password: registerPassword,
        name: registerName,
        role: registerRole
      });
      setSessionToken(response.token, true);
      setUser(response.user);
      setToken(response.token);
      setNeedsAuth(false);
      addToast(`Account registered successfully. Custom role assigned: ${response.user.role}`, 'success');
      fetchDashboardModels(response.user.role);
    } catch (err: any) {
      addToast(err.message || 'Registration failed.', 'info');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignout = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Sign Out Account?',
      message: 'Are you sure you want to sign out of the academic scheduling office? This will end your current secure browser session.',
      confirmText: 'Sign Out',
      cancelText: 'Keep Session Open',
      isDanger: true,
      onConfirm: () => {
        setSessionToken(null);
        sessionStorage.removeItem('google_workspace_access_token');
        setUser(null);
        setToken(null);
        setGoogleWorkspaceLinked(false);
        setNeedsAuth(true);
        addToast('Credentials session closed safely.', 'info');
      }
    });
  };

  const bypassGoogleWorkspaceAuthSimulated = () => {
    const mockUser = {
      displayName: user?.name || 'Prof. Rajeev Kumar',
      email: user?.email || 'rajeev.kumar@iitbhu.ac.in',
      photoURL: null,
      uid: 'mock-google-user-id'
    };
    sessionStorage.setItem('google_workspace_access_token', 'mock_google_workspace_token');
    setGoogleProfile(mockUser);
    setGoogleWorkspaceLinked(true);
    addToast('Bypassed browser blocker! Google Workspace Simulator active inside sandbox.', 'success');
  };

  const linkGoogleWorkspaceAccount = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        sessionStorage.setItem('google_workspace_access_token', result.accessToken);
        setGoogleProfile(result.user);
        setGoogleWorkspaceLinked(true);
        addToast('Google Workspace authentication linked! Active widgets enabled.', 'success');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Popup blocker active or login dismissed.';
      addToast(msg, 'info');

      // Intercept and detect popup blocks typical in Google AI Studio iframes
      const lowerMsg = msg.toLowerCase();
      const isPopupBlock = 
        lowerMsg.includes('popup-blocked') || 
        lowerMsg.includes('popup blocked') || 
        lowerMsg.includes('popup blocker') ||
        lowerMsg.includes('timeout') ||
        lowerMsg.includes('timed out') ||
        lowerMsg.includes('cancelled-popup') ||
        lowerMsg.includes('closed');

      if (isPopupBlock) {
        setTimeout(() => {
          setConfirmModal({
            isOpen: true,
            title: 'Google Login Popup Blocked',
            message: 'To bypass browser popup blockers standard within iframe sandboxes, you can:\n\n1. Use the "Open in New Tab" button in the top-right to log in using standard SSO, OR\n2. Activate the integrated Workspace Simulator (Demo Mode) to immediately unlock and evaluate scheduling modules.',
            confirmText: 'Activate Workspace Simulator',
            cancelText: 'Cancel & Open New Tab',
            isDanger: false,
            onConfirm: () => {
              bypassGoogleWorkspaceAuthSimulated();
            }
          });
        }, 300);
      }
    }
  };

  const triggerFastCheckIn = (room: Room) => {
    // 1. Flip room state to booked visually
    setRooms((prev) =>
      prev.map((r) => (r.id === room.id ? { ...r, status: 'booked' } : r))
    );

    // 2. Add announcement in Chat
    const timestampStr = new Date().toLocaleTimeString();
    const checkInMessage = `📢 QR Mobile Sensor Check-In: ${user?.name || 'Authorized User'} has checked in to "${room.name}" via QR placa reader. DB status marked: [OCCUPIED]`;
    setChatLog((prev) => [
      {
        space: 'General Space Alerts',
        text: checkInMessage,
        time: timestampStr,
      },
      ...prev,
    ]);

    // 3. Add email log list
    const emailSubject = `[Live Sensor Alert] Desk Checked: ${room.name}`;
    const emailBody = `Automated check-in trace at IIT BHU.\n\nUser ${user?.name} has authorized check-in utilizing the dynamic QR generator. Space status is now reserved in SQL schemas.`;
    setGmailLog((prev) => [
      {
        to: 'classroom-mgmt@iitbhu.ac.in',
        subject: emailSubject,
        body: emailBody,
        time: timestampStr,
      },
      ...prev,
    ]);

    addToast(`⚡ RAPID Check-In success for ${room.name}!`);
  };

  // ==========================================
  // ROOM INVENTORY ADD/EDIT (Admin Role)
  // ==========================================
  const handleAdminAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: adminRoomName,
        capacity: Number(adminRoomCapacity),
        features: adminRoomFeatures.split(',').map(f => f.trim()).filter(Boolean),
        image: adminRoomImage || undefined,
        color: adminRoomColor
      };
      await roomsAPI.create(payload);
      addToast(`New space "${adminRoomName}" created successfully!`, 'success');
      setAdminRoomName('');
      setAdminRoomFeatures('');
      fetchDashboardModels(user.role);
    } catch (err: any) {
      addToast(`Admin operation error: ${err.message}`, 'error');
    }
  };

  const handleAdminDeleteRoom = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Decommission Smart Space?',
      message: `Are you sure you want to permanently decommission "${name}"?\n\nThis is a highly destructive database operation that will instantly purge all academic Schedules and student Bookings linked with this room space.`,
      confirmText: 'Decommission',
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        try {
          await roomsAPI.delete(id);
          addToast(`Space ${name} decommissioned from database.`, 'success');
          fetchDashboardModels(user.role);
        } catch (err: any) {
          addToast(err.message, 'error');
        }
      }
    });
  };

  const handleAdminUpdateUserRole = async (userId: string, targetRole: string) => {
    try {
      await adminAPI.updateUserRole(userId, targetRole);
      addToast('User organizational authorization level changed.', 'success');
      fetchDashboardModels(user.role);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // ==========================================
  // FILTERS AND SEARCH
  // ==========================================
  const matchesFeature = (room: Room, f: string) => {
    const normFeatures = room.features.map(feat => feat.toLowerCase());
    if (f === 'Projector') return normFeatures.some(feat => feat.includes('projector') || feat.includes('laser'));
    if (f === 'Whiteboard') return normFeatures.some(feat => feat.includes('whiteboard'));
    if (f === 'Display/Screen') return normFeatures.some(feat => feat.includes('display') || feat.includes('screen') || feat.includes('projection'));
    if (f === 'Audio/Video') return normFeatures.some(feat => feat.includes('audio') || feat.includes('conferencing') || feat.includes('surround'));
    if (f === 'Ergonomics/Seating') return normFeatures.some(feat => feat.includes('seating') || feat.includes('chair') || feat.includes('boardroom'));
    return false;
  };

  const filteredRooms = useMemo(() => {
    const list = [...rooms];
    const filtered = list.filter((room) => {
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
        if (!matchesName && !matchesFeatureDescription) return false;
      }
      return true;
    });

    if (sortKey === 'capacity-asc') {
      filtered.sort((a, b) => a.capacity - b.capacity);
    } else if (sortKey === 'capacity-desc') {
      filtered.sort((a, b) => b.capacity - a.capacity);
    } else if (sortKey === 'available-first') {
      filtered.sort((a, b) => {
        const priority = { available: 0, expiring_soon: 1, booked: 2 };
        return priority[a.status] - priority[b.status];
      });
    } else if (sortKey === 'booked-first') {
      filtered.sort((a, b) => {
        const priority = { booked: 0, expiring_soon: 1, available: 2 };
        return priority[a.status] - priority[b.status];
      });
    }
    return filtered;
  }, [rooms, minCapacity, selectedFeatureToggles, searchQuery, sortKey]);

  const handleDownloadCSV = () => {
    const escapeCSV = (val: string | number) => {
      const str = String(val).replace(/"/g, '""');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str}"`;
      return str;
    };
    const headers = ['Room ID', 'Room Name', 'Capacity (Seats)', 'Status', 'Features List'];
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
    link.setAttribute('download', `iit_bhu_rooms_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNewBookingRegistered = (roomName: string, summary: string, start: string, end: string, agenda?: string) => {
    setSessionReceipts((prev) => [...prev, { roomName, summary, start, end, agenda }]);
    
    // Add dynamically to logs
    const timestampStr = new Date().toLocaleTimeString();
    setChatLog((prev) => [
      {
        space: 'General Space Alerts',
        text: `📅 APPROVED: ${summary} has reserved Room: "${roomName}" from ${new Date(start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
        time: timestampStr
      },
      ...prev
    ]);

    setGmailLog((prev) => [
      {
        to: user?.email,
        subject: `[Booking Confirmed] Space Reserved: ${roomName}`,
        body: `Hello ${user?.name},\n\nYour session reservation coordinates have been secured in our relational database schemas for classroom ${roomName}. You can view receipts in your active dashboard.`,
        time: timestampStr
      },
      ...prev
    ]);

    addToast(`Space reservation secured!`, 'success');
    fetchDashboardModels(user.role);
  };

  const syncRoomsStatusFromCalendar = () => {
    addToast('Synchronizing database models...', 'success');
    fetchDashboardModels(user.role);
  };

  // Prepopulate form triggers
  const fillPredefinedCredentials = (role: 'admin' | 'faculty' | 'student') => {
    if (role === 'admin') {
      setLoginEmail('admin@iitbhu.ac.in');
      setLoginPassword('admin123');
    } else if (role === 'faculty') {
      setLoginEmail('faculty@iitbhu.ac.in');
      setLoginPassword('faculty123');
    } else {
      setLoginEmail('student@iitbhu.ac.in');
      setLoginPassword('student123');
    }
  };

  // ==========================================
  // VIEW RENDER Gate
  // ==========================================
  if (needsAuth || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-6 text-white relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full max-w-xl mx-auto pt-2 z-10 relative">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700 transition-all font-semibold text-xs cursor-pointer select-none"
            title="Toggle Light / Dark mode themes"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
            <span className="font-mono text-[9.5px] tracking-wider uppercase">
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          <div className="self-end sm:self-auto text-right font-mono text-xs text-slate-500 flex items-center gap-1.5">
            <Clock3 className="w-3.5 h-3.5 text-indigo-400" />
            <span>BHU Office Clock: {currentTime || 'Loading...'}</span>
          </div>
        </div>

        <div className="max-w-xl w-full mx-auto my-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
          <div className="text-center space-y-3">
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">
              Indian Institute of Technology (BHU) Varanasi
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
              IIT BHU Smart Room Scheduler
            </h1>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Full-Stack Room Scheduler with Role-Based Access Control, Persistent PostgreSQL, and optional Google Workspace integrations.
            </p>
          </div>

          {/* Tester Helper Cards */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-indigo-900/40 space-y-2">
            <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest block font-mono">
              ⚡ Quick Tester Profiles (Click to prefill coordinates):
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillPredefinedCredentials('admin')}
                className="bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/40 text-[10px] font-semibold text-indigo-200 py-1 px-2 rounded-lg transition-all"
              >
                Prof. Rajeev (Admin)
              </button>
              <button
                type="button"
                onClick={() => fillPredefinedCredentials('faculty')}
                className="bg-teal-950/40 hover:bg-teal-900/50 border border-teal-800/40 text-[10px] font-semibold text-teal-200 py-1 px-2 rounded-lg transition-all"
              >
                Dr. S. K. (Faculty)
              </button>
              <button
                type="button"
                onClick={() => fillPredefinedCredentials('student')}
                className="bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/40 text-[10px] font-semibold text-amber-200 py-1 px-2 rounded-lg transition-all"
              >
                Abishek (Student User)
              </button>
            </div>
          </div>

          {/* Custom Tabs */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setIsRegisterMode(false)}
              className={`flex-1 text-center py-2 text-xs font-bold uppercase transition-all ${
                !isRegisterMode ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Credentials Sign In
            </button>
            <button
              onClick={() => setIsRegisterMode(true)}
              className={`flex-1 text-center py-2 text-xs font-bold uppercase transition-all ${
                isRegisterMode ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Create Account
            </button>
          </div>

          <AnimatePresence mode="wait">
            {!isRegisterMode ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleCredentialsLogin}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Email Coordinates</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. faculty@iitbhu.ac.in"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 placeholder:text-slate-750 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Account Secret Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 placeholder:text-slate-750 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-2.5 rounded-xl transition-all shadow-lg text-center"
                >
                  {isLoggingIn ? 'Logging you in...' : 'Sign In Now'}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="register-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleCredentialsRegister}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. A.K. Tripathi"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 placeholder:text-slate-750 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">IIT Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. tripathi.cs@iitbhu.ac.in"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 placeholder:text-slate-750 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Create Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 placeholder:text-slate-750 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Desired Status Role</label>
                  <select
                    value={registerRole}
                    onChange={(e: any) => setRegisterRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="student">Student Account (Role constraints apply)</option>
                    <option value="faculty">Faculty Member (Authorization to Reserv rooms)</option>
                    <option value="admin">Admin Authority (Full Master clearing bounds)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-2.5 rounded-xl transition-all shadow-lg text-center"
                >
                  {isLoggingIn ? 'Registering Account...' : 'Create Account & Log In'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className="text-center font-mono text-[9px] text-slate-600 uppercase tracking-widest pt-4">
          <span>IIT BHU Secure Full-Stack Portal • Academic Scheduling Node</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between">
      <div>
        {/* Core Header Navigation Bar */}
        <header className="bg-slate-900/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40 px-6 py-4.5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-indigo-500 to-violet-600 p-2 rounded-xl border border-indigo-400/20 shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 64 64"
                  fill="none"
                  className="w-6.5 h-6.5 text-white animate-pulse"
                >
                  {/* Outer Sacred Lotus Ring & Shield Border */}
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2" opacity="0.35" />
                  <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
                  
                  {/* Traditional Flourishing Lotus Base Accent */}
                  <path d="M19 44c3.5-1.5 8.5-2.5 13-2.5s9.5 1 13 2.5c-2 3.5-5.5 5.5-13 5.5s-11-2-13-5.5z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
                  
                  {/* Open Sacred Book of Knowledge representing BHU's academic legacy */}
                  <path d="M32 40c-2.5-2-5.5-3-9-3s-6.5.8-9 2.5V26c2.5-1.7 5.5-2.5 9-2.5s6.5.8 9 2.5c2.5-1.7 5.5-2.5 9-2.5s6.5.8 9 2.5v14c-2.5-1.7-5.5-2.5-9-2.5s-6.5 1-9 3z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  
                  {/* Central Halo of spiritual & technical wisdom */}
                  <circle cx="32" cy="20" r="9" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
                  
                  {/* Flaming Torch center stem */}
                  <path d="M32 29v7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  {/* Flame representing the light of learning */}
                  <path d="M32 12c-2.5 3.5-4 5-4 7a4 4 0 1 0 8 0c0-2-1.5-3.5-4-7z" fill="currentColor" opacity="0.95" />
                  
                  {/* Dynamic Radiance Sunburst Rays */}
                  <line x1="32" y1="5" x2="32" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="21" y1="9" x2="23" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="43" y1="9" x2="41" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="16" y1="18" x2="19" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="48" y1="18" x2="45" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight">IIT BHU Smart Room Scheduler</h1>
                <p className="text-[9px] text-indigo-400 font-mono tracking-wider uppercase mt-0.5">
                  Academic Full-Stack Database Nodes Active
                </p>
              </div>
            </div>

            {/* Profile info & Signout */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* Theme Toggle Button */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-1000/60 p-2.5 hover:border-slate-700 text-slate-400 hover:text-white transition-all font-semibold text-xs cursor-pointer select-none"
                title="Switch Theme (Light/Dark)"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                <span className="hidden sm:inline font-mono text-[9.5px] tracking-wider uppercase">
                  {isDarkMode ? 'Light' : 'Dark'}
                </span>
              </button>

              <div className="font-mono text-[11px] text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 hidden lg:block">
                {currentTime || 'Syncing...'}
              </div>

              {/* Notifications Alarm Bell button with badge dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications) {
                      handleMarkNotificationsRead();
                    }
                  }}
                  className={`relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                    notifications.some((n) => !n.read)
                      ? 'bg-indigo-950/60 border-indigo-800 text-indigo-300 animate-pulse'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Academy Schedule System Notifications Inbox"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.some((n) => !n.read) && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-slate-950" />
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden text-left"
                    >
                      <div className="p-4 border-b border-slate-850 flex justify-between items-center bg-slate-1000/60">
                        <span className="text-xs font-bold text-slate-200">System Notifications</span>
                        <button
                          onClick={() => {
                            setNotifications([]);
                            setShowNotifications(false);
                          }}
                          className="text-[10px] text-slate-500 hover:text-white uppercase font-mono cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                      
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-850/60">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500 italic">No notifications registered.</div>
                        ) : (
                          notifications.map((notif) => (
                            <div key={notif.id} className="p-3.5 space-y-1 hover:bg-slate-950 transition-colors">
                              <div className="flex justify-between items-start gap-2">
                                <span className={`text-[10.5px] font-bold block leading-snug ${
                                  notif.type === 'success' ? 'text-emerald-400' :
                                  notif.type === 'warn' ? 'text-rose-450' : 'text-indigo-400'
                                }`}>
                                  {notif.title}
                                </span>
                                {!notif.read && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1" />
                                )}
                              </div>
                              <p className="text-[10.5px] text-slate-450 leading-normal">{notif.message}</p>
                              <span className="text-[8.5px] font-mono text-slate-600 block">
                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Dynamic Google Link pill */}
              <button
                onClick={linkGoogleWorkspaceAccount}
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase py-1.5 px-3 rounded-xl border transition-all ${
                  googleWorkspaceLinked
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
                    : 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border-rose-800/40 animate-pulse'
                }`}
                title="Google Account Auth scope binder button"
              >
                <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Google Sync: {googleWorkspaceLinked ? 'CONNECTED' : 'UNLINKED / LINK NOW'}</span>
              </button>

              {/* Identity tag */}
              <div className="flex items-center gap-3 bg-slate-950 p-1.5 pr-3.5 rounded-full border border-slate-800">
                <div className="w-8 h-8 rounded-full bg-indigo-900/80 border border-indigo-700/60 flex items-center justify-center font-bold text-xs uppercase text-indigo-200">
                  {user.name.charAt(0)}
                </div>
                <div className="text-left leading-tight">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold block text-slate-200">{user.name}</span>
                    <span className={`text-[8px] font-extrabold uppercase py-0.5 px-1.5 rounded font-mono ${
                      user.role === 'admin' ? 'bg-red-950 text-red-300 border border-red-800/35' : 
                      user.role === 'faculty' ? 'bg-teal-950 text-teal-350 border border-teal-800/35' :
                      'bg-amber-950 text-amber-350 border border-amber-800/35'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 block max-w-[130px] truncate">{user.email}</span>
                </div>
                <button
                  onClick={handleSignout}
                  className="p-1.5 text-slate-400 hover:text-rose-450 rounded-full hover:bg-slate-900 transition-colors cursor-pointer"
                  title="Log out of IIT BHU credentials portal"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </header>

        {/* Navigation Tabs Bar */}
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          <div className="overflow-x-auto pb-1">
            <div className="flex items-center gap-2 border-b border-slate-800/80 mb-2">
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
                onClick={() => setActiveTab('ai')}
                className={`flex items-center gap-2 font-medium text-xs uppercase tracking-wider py-3.5 px-4.5 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'ai'
                    ? 'border-indigo-505 text-white bg-indigo-950/25'
                    : 'border-transparent text-slate-400 hover:text-slate-205 hover:bg-slate-900/30'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                AI Advisor
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-2 font-medium text-xs uppercase tracking-wider py-3.5 px-4.5 border-b-2 transition-all ${
                  activeTab === 'analytics'
                    ? 'border-indigo-500 text-white bg-indigo-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <Activity className="w-4 h-4 text-rose-400" />
                Analytics Dashboard
              </button>

              {user.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center gap-2 font-medium text-xs uppercase tracking-wider py-3.5 px-4.5 border-b-2 transition-all ${
                    activeTab === 'admin'
                      ? 'border-rose-500 text-rose-200 bg-rose-950/20'
                      : 'border-transparent text-slate-400 hover:text-rose-450 hover:bg-slate-900/30'
                  }`}
                >
                  <Shield className="w-4 h-4 text-red-400 animate-pulse" />
                  Admin Center
                </button>
              )}

              <div className="border-l border-slate-800/80 pl-2 ml-2 flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('drive')}
                  className={`flex items-center gap-1.5 font-medium text-[11px] uppercase tracking-wider py-2 px-3 rounded-lg border border-slate-800 transition-all ${
                    activeTab === 'drive'
                      ? 'bg-indigo-950/40 text-indigo-200 border-indigo-900/30'
                      : 'text-slate-500 hover:text-slate-350 bg-slate-950/25'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  Drive
                </button>
                <button
                  onClick={() => setActiveTab('gmail')}
                  className={`flex items-center gap-1.5 font-medium text-[11px] uppercase tracking-wider py-2 px-3 rounded-lg border border-slate-800 transition-all ${
                    activeTab === 'gmail'
                      ? 'bg-indigo-950/40 text-indigo-200 border-indigo-900/30'
                      : 'text-slate-500 hover:text-slate-350 bg-slate-950/25'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Gmail
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-1.5 font-medium text-[11px] uppercase tracking-wider py-2 px-3 rounded-lg border border-slate-800 transition-all ${
                    activeTab === 'chat'
                      ? 'bg-indigo-950/40 text-indigo-200 border-indigo-900/30'
                      : 'text-slate-500 hover:text-slate-350 bg-slate-950/25'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat Space
                </button>
                <button
                  onClick={() => setActiveTab('forms')}
                  className={`flex items-center gap-1.5 font-medium text-[11px] uppercase tracking-wider py-2 px-3 rounded-lg border border-slate-800 transition-all ${
                    activeTab === 'forms'
                      ? 'bg-indigo-950/40 text-indigo-200 border-indigo-900/30'
                      : 'text-slate-500 hover:text-slate-350 bg-slate-950/25'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Forms
                </button>
              </div>

            </div>
          </div>

          {isIframe && !googleWorkspaceLinked && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-950/90 border border-amber-800/60 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-left relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-start gap-3 relative z-10">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-amber-300 text-xs uppercase tracking-wider font-mono">Google AI Studio Sandbox Guard</h4>
                  <p className="text-xs text-amber-200/95 leading-relaxed max-w-2xl">
                    This app experiences iframe restrictions inside Google AI Studio's preview window which may block standard Google SSO popup windows.
                  </p>
                  <p className="text-[11.5px] font-semibold text-amber-400/90 leading-relaxed">
                    💡 <strong>To link successfully:</strong> Click the <strong>"Open in New Tab"</strong> button in the upper-right corner of AI Studio, and link authentication from there!
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  window.open(window.location.href, '_blank');
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10.5px] uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-md shrink-0 cursor-pointer flex items-center gap-1.5 select-none relative z-10 ml-auto md:ml-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open In New Tab
              </button>
            </motion.div>
          )}

          {/* Active Tab transition bounds */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {/* ==========================================
                  TAB: ROOMS DIRECTORY
                  ========================================== */}
              {activeTab === 'rooms' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4.5 bg-slate-900 rounded-2xl border border-slate-800 gap-4">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight">Active Room Directory</h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Inspect custom built-in configurations and track space utilization states in real time.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-stretch sm:self-auto justify-stretch">
                      <button
                        onClick={handleDownloadCSV}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-xl transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
                      >
                        <Download className="w-4 h-4 shrink-0" />
                        Download CSV ({filteredRooms.length})
                      </button>
                      <button
                        onClick={syncRoomsStatusFromCalendar}
                        className="flex-1 sm:flex-none font-bold text-xs uppercase tracking-wider bg-slate-850 hover:bg-slate-800 border border-slate-700/60 text-slate-300 py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                      >
                        🔄 System Sync
                      </button>
                    </div>
                  </div>

                  {/* Filter Controls */}
                  <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Refining Filters</span>
                      </div>
                      {(minCapacity > 0 || selectedFeatureToggles.length > 0 || searchQuery.trim() !== '' || sortKey !== 'default') && (
                        <button
                          onClick={() => {
                            setMinCapacity(0);
                            setSelectedFeatureToggles([]);
                            setSearchQuery('');
                            setSortKey('default');
                          }}
                          className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-rose-450 hover:text-rose-450 bg-rose-950/20 px-2.5 py-1.5 rounded-lg border border-rose-900/30 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Clear all
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Search */}
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search rooms by name or equipment (e.g. Whiteboard, Projector)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder:text-slate-600 outline-none transition-all"
                        />
                      </div>
                      {/* Sort dropdown */}
                      <div className="lg:w-64 relative">
                        <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                        <select
                          value={sortKey}
                          onChange={(e) => setSortKey(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 outline-none appearance-none cursor-pointer"
                        >
                          <option value="default">Sort: Default Featured</option>
                          <option value="available-first font-mono">Available First</option>
                          <option value="booked-first font-mono">Booked First</option>
                          <option value="capacity-asc">Capacity (Low to High)</option>
                          <option value="capacity-desc">Capacity (High to Low)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                      <div className="space-y-2">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-mono">Minimum Capacity Seats</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[0, 15, 30, 50, 100].map((cap) => {
                            const active = minCapacity === cap;
                            return (
                              <button
                                key={cap}
                                onClick={() => setMinCapacity(cap)}
                                className={`text-[10px] font-extrabold py-1 px-2.5 rounded-lg border transition-all ${
                                  active ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                                }`}
                              >
                                {cap === 0 ? 'Any Seats' : `${cap}+ Seats`}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-mono">Amenities & Features</span>
                        <div className="flex flex-wrap gap-1.5">
                          {['Projector', 'Whiteboard', 'Display/Screen', 'Audio/Video', 'Ergonomics/Seating'].map((feat) => {
                            const isSelected = selectedFeatureToggles.includes(feat);
                            return (
                              <button
                                key={feat}
                                onClick={() => {
                                  setSelectedFeatureToggles(prev =>
                                    isSelected ? prev.filter(t => t !== feat) : [...prev, feat]
                                  );
                                }}
                                className={`text-[10.5px] font-semibold py-1 px-2.5 rounded-lg border transition-all flex items-center gap-1 ${
                                  isSelected ? 'bg-indigo-950 text-indigo-300 border-indigo-800' : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-350'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
                                {feat}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rooms Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {filteredRooms.map((room) => (
                      <div
                        key={room.id}
                        className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between"
                      >
                        <div>
                          {/* Image area with status badge overlay */}
                          <div className="relative h-48 overflow-hidden">
                            <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                            
                            {/* Role based constraint sign */}
                            <div className="absolute top-4 left-4">
                              <span className={`text-[10px] font-extrabold uppercase py-1 px-2 rounded-lg font-mono border flex items-center gap-1 ${
                                room.status === 'available' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40' :
                                room.status === 'booked' ? 'bg-rose-950/80 text-rose-300 border-rose-800/40' :
                                'bg-amber-950/80 text-amber-300 border-amber-800/40'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${room.status === 'available' ? 'bg-emerald-400' : room.status === 'booked' ? 'bg-rose-400' : 'bg-amber-400animate-ping'}`} />
                                {room.status === 'available' ? 'AVAILABLE' : room.status === 'booked' ? 'OCCUPIED' : 'EXPIRING SOON'}
                              </span>
                            </div>

                            <div className="absolute bottom-4 left-4 right-4">
                              <h3 className="text-lg font-black text-white drop-shadow-md">{room.name}</h3>
                              <span className="text-xs text-slate-300 font-mono">Capacity: {room.capacity} seats</span>
                            </div>
                          </div>

                          {/* Room Features */}
                          <div className="p-6 space-y-4">
                            <div className="flex flex-wrap gap-1.5">
                              {room.features.map((f, i) => (
                                <span key={i} className="bg-slate-950 text-slate-400 border border-slate-850 py-1 px-2.5 rounded-lg text-[10.5px] font-medium">
                                  {f}
                                </span>
                              ))}
                            </div>

                            {/* Active Reservations isomorphically mapped for room tracking */}
                            <div className="pt-3 border-t border-slate-800/65 mt-2 text-left">
                              {(() => {
                                const roomBookings = adminBookings.filter(b => 
                                  b.room_name?.toLowerCase().includes(room.name.toLowerCase()) || 
                                  room.name?.toLowerCase().includes(b.room_name?.toLowerCase())
                                );

                                return (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-mono flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Scheduled Timeline
                                      </span>
                                      <button
                                        onClick={() => setSelectedRoomForHistory(room)}
                                        className="text-[10px] font-bold text-indigo-400/95 hover:text-indigo-350 transition-all cursor-pointer underline underline-offset-2 decoration-indigo-500/30 font-mono"
                                      >
                                        View Activity History →
                                      </button>
                                    </div>

                                    {roomBookings.length === 0 ? (
                                      <p className="text-[10.5px] text-slate-500 italic">This space is completely vacant. Click below to book!</p>
                                    ) : (
                                      <div className="space-y-1.5 max-h-[145px] overflow-y-auto pr-1">
                                        {roomBookings.map((b) => {
                                          const startDate = new Date(b.start_time);
                                          const endDate = new Date(b.end_time);
                                          const isToday = startDate.toDateString() === new Date().toDateString();
                                          
                                          const dateStr = isToday 
                                            ? 'Today' 
                                            : startDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                                          
                                          const timeStr = `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                                          return (
                                            <div key={b.id} className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-850/65 text-left space-y-0.5 hover:border-indigo-500/30 transition-all">
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-slate-200 text-[11.5px] truncate max-w-[150px]" title={b.summary}>
                                                  {b.summary}
                                                </span>
                                                <span className="text-[8.5px] bg-indigo-950/80 text-indigo-300 font-bold px-1 rounded uppercase tracking-wider font-mono">
                                                  {dateStr}
                                                </span>
                                              </div>
                                              <div className="flex items-center justify-between text-[10px] text-slate-450 font-mono">
                                                <span>{timeStr}</span>
                                                <span className="truncate max-w-[90px]" title={b.creator_name}>
                                                  By: {b.creator_name?.split(' ')[0]}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Card bottom CTA */}
                        <div className="p-6 pt-0 border-t border-slate-850/50 flex items-center justify-between gap-3 bg-slate-950/40 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedQRRoom(room);
                              setScanComplete(false);
                            }}
                            className="bg-slate-850 hover:bg-slate-800 border border-slate-700/60 text-slate-300 py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                          >
                            QR SCANNER
                          </button>
                          
                          {room.status === 'available' ? (
                            <button
                              onClick={() => {
                                // Double caution check
                                setConfirmRoomSelection(room);
                                setPreselectedRoomId(room.id);
                              }}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-950/30 transition-all cursor-pointer"
                            >
                              CHOOSE SLOT
                            </button>
                          ) : (
                            <button
                              disabled
                              className="bg-slate-850/50 text-slate-600 py-2 px-4.5 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-not-allowed"
                            >
                              OCCUPIED
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ==========================================
                  TAB: CALENDAR SCHEDULER
                  ========================================== */}
              {activeTab === 'calendar' && (
                <div className="space-y-2">
                  {!googleWorkspaceLinked ? (
                    <WorkspaceGate
                      activeTab="calendar"
                      isIframe={isIframe}
                      onLink={linkGoogleWorkspaceAccount}
                      onBypass={bypassGoogleWorkspaceAuthSimulated}
                    />
                  ) : (
                    <CalendarWidget
                      rooms={rooms}
                      userEmail={user.email}
                      userName={user.name}
                      onRefreshRoomsStatus={syncRoomsStatusFromCalendar}
                      onBookingAdded={handleNewBookingRegistered}
                      defaultSelectedRoomId={preselectedRoomId}
                    />
                  )}
                </div>
              )}

              {/* ==========================================
                  TAB: AI ADVISOR RECOMMENDATIONS
                  ========================================== */}
              {activeTab === 'ai' && (
                <div className="space-y-2">
                  <AIWidget
                    onPreselectRoom={(roomId) => {
                      setPreselectedRoomId(roomId);
                      setActiveTab('calendar');
                      addToast(`Room selection pre-selected! Configure schedule inside the calendar view.`, 'info');
                    }}
                    addToast={addToast}
                    availableRooms={rooms}
                  />
                </div>
              )}

              {/* ==========================================
                  TAB: ANALYTICS DASHBOARD
                  ========================================== */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <div className="p-4.5 bg-slate-900 rounded-2xl border border-slate-800 text-left">
                    <h2 className="text-lg font-bold tracking-tight">PostgreSQL Statistical Analysis</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Aggregated metric distributions derived cleanly from relational tables and query sequences.
                    </p>
                  </div>

                  {/* Summary metric cubes */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                      <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-widest">TOTAL BOOKINGS SECURED</span>
                      <strong className="text-3xl font-black text-indigo-400 block mt-1">{analyticsStats?.totalBookings || adminBookings.length}</strong>
                    </div>
                    <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                      <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-widest">TOTAL ACADEMIC USERS</span>
                      <strong className="text-3xl font-black text-teal-400 block mt-1">{analyticsStats?.totalUsers || adminUsers.length || 3}</strong>
                    </div>
                    <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                      <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-widest">ALLOCATED HOURS</span>
                      <strong className="text-3xl font-black text-amber-400 block mt-1">{analyticsStats?.totalAssignedHours || 0} Hours</strong>
                    </div>
                    <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                      <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-widest">SEAT DENSITY INDEX</span>
                      <strong className="text-3xl font-black text-violet-400 block mt-1">94.2%</strong>
                    </div>
                  </div>

                  {analyticsStats ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Hourly booking demand */}
                      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <div className="mb-4">
                          <h3 className="text-sm font-bold text-slate-350 flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-indigo-400" />
                            Hourly Reservation Demand Wave (8 AM - 8 PM)
                          </h3>
                        </div>
                        <div className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analyticsStats.hourlyDemand}>
                              <defs>
                                <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="hour" stroke="#64748b" fontSize={9} />
                              <YAxis stroke="#64748b" fontSize={9} />
                              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1f2937' }} />
                              <Area name="Active overlap load" type="monotone" dataKey="bookings" stroke="#6366f1" fillOpacity={1} fill="url(#colorHr)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* User composition Pie */}
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-350">Credential Roles Decomposition</h3>
                        </div>
                        <div className="h-[180px] w-full mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Admins', value: analyticsStats.roleStats?.admin || 1 },
                                  { name: 'Faculties', value: analyticsStats.roleStats?.faculty || 1 },
                                  { name: 'Students', value: analyticsStats.roleStats?.student || 1 },
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {[0, 1, 2].map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1f2937' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 text-[10px] font-mono mt-2 uppercase text-slate-400">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" /> Admin</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Faculty</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Student</span>
                        </div>
                      </div>

                    </div>
                  ) : null}

                  {/* Standard 7-Day Space Allocation Rates */}
                  <OccupancyChart sessionReceipts={sessionReceipts} />
                </div>
              )}

              {/* ==========================================
                  TAB: ADMIN OFFICE MASTER CONTROL CENTER
                  ========================================== */}
              {activeTab === 'admin' && user.role === 'admin' && (
                <div className="space-y-8">
                  <div className="p-4.5 bg-slate-900 rounded-2xl border border-red-950/40 text-left">
                    <h2 className="text-lg font-bold tracking-tight text-rose-300">Administrative Oversight</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Verify registered academic accounts, modify structural permissions, manage rooms metadata, or force-delete booked slots.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Add Room form panel */}
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-850">
                        <Plus className="w-5 h-5 text-indigo-400" />
                        De novo Room Creation Panel
                      </h3>
                      <form onSubmit={handleAdminAddRoom} className="space-y-4 text-left">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Space Display Name*</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Satish Dhawan Lecture Suite"
                            value={adminRoomName}
                            onChange={(e) => setAdminRoomName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Seating capacity*</label>
                            <input
                              type="number"
                              required
                              value={adminRoomCapacity}
                              onChange={(e) => setAdminRoomCapacity(Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Visual Gradient color</label>
                            <select
                              value={adminRoomColor}
                              onChange={(e) => setAdminRoomColor(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none"
                            >
                              <option value="from-slate-705 to-slate-900">Charcoal Slate</option>
                              <option value="from-violet-600 to-indigo-805">Violet Indigo</option>
                              <option value="from-amber-600 to-orange-805">Amber Boardroom</option>
                              <option value="from-teal-600 to-emerald-805">Teal Lecture</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Features / Equipment list (Comma split)</label>
                          <input
                            type="text"
                            placeholder="e.g. Acoustic soundproofing, Laser Projector, Smart Cooler"
                            value={adminRoomFeatures}
                            onChange={(e) => setAdminRoomFeatures(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Photo URL placeholder</label>
                          <input
                            type="text"
                            placeholder="e.g. Unsplash photo URL"
                            value={adminRoomImage}
                            onChange={(e) => setAdminRoomImage(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-3 rounded-xl text-xs uppercase"
                        >
                          De novo Create Room
                        </button>
                      </form>
                    </div>

                    {/* Manage user roles and credentials panel */}
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between">
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-850">
                          <Users className="w-5 h-5 text-indigo-400" />
                          Academic Credentials Directory ({adminUsers.length})
                        </h3>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                          {adminUsers.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 bg-slate-950 rounded-xl border border-slate-855 flex items-center justify-between text-xs"
                            >
                              <div className="text-left space-y-0.5">
                                <strong className="text-slate-200 block">{item.name}</strong>
                                <span className="text-[10px] text-slate-500 block font-mono">{item.email}</span>
                              </div>
                              <select
                                value={item.role}
                                onChange={(e) => handleAdminUpdateUserRole(item.id, e.target.value)}
                                className={`bg-slate-900 border rounded py-1 px-1.5 text-[10px] font-bold uppercase ${
                                  item.role === 'admin' ? 'border-red-900 text-red-400' :
                                  item.role === 'faculty' ? 'border-teal-900 text-teal-400' :
                                  'border-amber-900 text-amber-400'
                                }`}
                              >
                                <option value="student">Student</option>
                                <option value="faculty">Faculty</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Bookings Master Sweep */}
                  <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-3 border-b border-slate-850 mb-4 text-left">
                      <Trash2 className="w-5 h-5 text-rose-500" />
                      Active Reservation Clearing master sweep ({adminBookings.length})
                    </h3>
                    {adminBookings.length === 0 ? (
                      <p className="text-slate-500 italic text-xs py-4 text-center">No bookings exist in central schemas.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                        {adminBookings.map((b) => (
                          <div
                            key={b.id}
                            className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex items-start justify-between text-xs gap-3 text-left"
                          >
                            <div className="space-y-1">
                              <span className="font-extrabold text-indigo-300 block">Location: {b.room_name}</span>
                              <span className="font-semibold text-slate-200 block">Title: {b.summary}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                Date: {new Date(b.start_time).toLocaleDateString()} | {new Date(b.start_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} - {new Date(b.end_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                              </span>
                              <span className="text-[9px] text-slate-550 block font-mono">Reserved by: {b.creator_name} ({b.creator_email})</span>
                            </div>
                            <button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Decommission Booking Request',
                                  message: `Are you sure you want to permanently delete the booking "${b.summary}" for room "${b.room_name}"?\n\nThis academic slot will become instantly vacant for other student schedules.`,
                                  confirmText: 'Drop Booking',
                                  cancelText: 'Keep Booking',
                                  isDanger: true,
                                  onConfirm: async () => {
                                    try {
                                      await bookingsAPI.delete(b.id);
                                      addToast('Booking dismissed.', 'success');
                                      fetchDashboardModels(user.role);
                                    } catch (err: any) {
                                      addToast(err.message, 'error');
                                    }
                                  }
                                });
                              }}
                              className="text-slate-400 hover:text-rose-400 p-2 hover:bg-slate-900 rounded-full transition-all shrink-0 cursor-pointer"
                              title="Force Clear reservation slot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Active Space Decommission list */}
                  <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-slate-850 mb-4 text-left">
                      Decommission Custom Spaces
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {rooms.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-slate-950 border border-slate-855 rounded-xl flex items-center justify-between text-xs gap-3"
                        >
                          <div className="text-left">
                            <strong className="text-slate-200 block">{item.name}</strong>
                            <span className="text-[10px] text-slate-500 block">Capacity: {item.capacity} seats</span>
                          </div>
                          <button
                            onClick={() => handleAdminDeleteRoom(item.id, item.name)}
                            className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 py-1.5 px-3 border border-rose-900/40 rounded-lg shrink-0 font-bold font-mono text-[10px]"
                          >
                            Purge Room
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* ==========================================
                  OTHER TABS: DECORATED INTEGRATED SYSTEM PANELS
                  ========================================== */}
              {activeTab === 'drive' && (
                !googleWorkspaceLinked ? (
                  <WorkspaceGate
                    activeTab="drive"
                    isIframe={isIframe}
                    onLink={linkGoogleWorkspaceAccount}
                    onBypass={bypassGoogleWorkspaceAuthSimulated}
                  />
                ) : (
                  <DriveWidget receiptLogs={sessionReceipts} />
                )
              )}

              {activeTab === 'gmail' && (
                !googleWorkspaceLinked ? (
                  <WorkspaceGate
                    activeTab="gmail"
                    isIframe={isIframe}
                    onLink={linkGoogleWorkspaceAccount}
                    onBypass={bypassGoogleWorkspaceAuthSimulated}
                  />
                ) : (
                  <GmailWidget 
                    userEmail={user.email} 
                    gmailLog={gmailLog}
                    setGmailLog={setGmailLog}
                  />
                )
              )}

              {activeTab === 'chat' && (
                !googleWorkspaceLinked ? (
                  <WorkspaceGate
                    activeTab="chat"
                    isIframe={isIframe}
                    onLink={linkGoogleWorkspaceAccount}
                    onBypass={bypassGoogleWorkspaceAuthSimulated}
                  />
                ) : (
                  <ChatWidget 
                    chatLog={chatLog}
                    setChatLog={setChatLog}
                  />
                )
              )}

              {activeTab === 'forms' && (
                !googleWorkspaceLinked ? (
                  <WorkspaceGate
                    activeTab="forms"
                    isIframe={isIframe}
                    onLink={linkGoogleWorkspaceAccount}
                    onBypass={bypassGoogleWorkspaceAuthSimulated}
                  />
                ) : (
                  <FormsWidget />
                )
              )}

            </motion.div>
          </AnimatePresence>

        </main>
      </div>

      {/* Floating Action Notifications Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ transform: 'translateY(50px) scale(0.9)', opacity: 0 }}
              animate={{ transform: 'translateY(0) scale(1)', opacity: 1 }}
              exit={{ transform: 'translateY(-20px) scale(0.9)', opacity: 0 }}
              className={`p-4 rounded-xl border-2 shadow-2xl flex items-start gap-3 w-full ${
                t.type === 'error'
                  ? 'bg-rose-950/95 border-rose-800 text-rose-200 shadow-rose-950/50'
                  : t.type === 'success'
                  ? 'bg-indigo-950/95 border-indigo-805 text-indigo-150'
                  : 'bg-slate-900/95 border-slate-800 text-slate-200'
              }`}
            >
              {t.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              ) : (
                <CheckCircle className={`w-5 h-5 shrink-0 mt-0.5 ${t.type === 'success' ? 'text-indigo-400' : 'text-slate-400'}`} />
              )}
              <div className="flex-1 space-y-0.5 text-left">
                <p className="text-[10.5px] font-bold uppercase tracking-wider font-mono opacity-80">
                  {t.type === 'error' ? 'SYSTEM ERROR' : t.type === 'success' ? 'SUCCESS' : 'INFO'}
                </p>
                <p className="text-xs font-semibold leading-relaxed text-left">{t.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* MODAL: QR Sensor Simulator Overlay */}
      <AnimatePresence>
        {selectedQRRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-805 rounded-3xl p-6 max-w-sm w-full space-y-6 text-center"
            >
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest font-mono">QR PLAQUE SENSOR DECODER</span>
                <h3 className="text-lg font-black text-white">{selectedQRRoom.name}</h3>
                <p className="text-slate-450 text-[11px]">Hold your mobile device up to the academic doorway QR matrix.</p>
              </div>

              <div className="flex justify-center p-4 bg-white rounded-2xl max-w-[200px] mx-auto border border-slate-250 shadow-inner">
                {/* SVG matrix template */}
                <QRCodeSVG value={`https://room-booking.iitbhu.ac.in/check-in/${selectedQRRoom.id}`} />
              </div>

              {!isScanningSimulated ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsScanningSimulated(true);
                    setTimeout(() => {
                      setIsScanningSimulated(false);
                      setScanComplete(true);
                      triggerFastCheckIn(selectedQRRoom);
                      setTimeout(() => {
                        setSelectedQRRoom(null);
                      }, 2000);
                    }, 1800);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase"
                >
                  SIMULATE MOBILE CAMERA SCAN
                </button>
              ) : (
                <div className="space-y-2 py-2">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <span className="text-xs text-slate-400 font-mono">Decoding sensory trace index...</span>
                </div>
              )}

              {scanComplete && (
                <div className="text-indigo-400 text-xs font-mono py-1 font-bold">
                  ✓ check-in sensor processed. Dashboard updated!
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => setSelectedQRRoom(null)}
                  className="text-xs text-slate-500 hover:text-white"
                >
                  Cancel Scanner
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION SLOT SELECTION DIALOG */}
      <AnimatePresence>
        {confirmRoomSelection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-805 rounded-3xl p-6 max-w-sm w-full space-y-6 text-center"
            >
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block font-mono">Confirm Space Selection</span>
                <h3 className="text-lg font-black text-white">{confirmRoomSelection.name}</h3>
                <p className="text-[11px] text-slate-450 leading-relaxed pt-1.5">
                  You are selecting this classroom. You will be redirected to the **Calendar Scheduler** tab with this space pre-assigned.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmRoomSelection(null)}
                  className="flex-1 bg-slate-850 hover:bg-slate-800 border border-slate-700/60 text-slate-300 py-2.5 rounded-xl text-xs font-bold uppercase transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setConfirmRoomSelection(null);
                    setActiveTab('calendar');
                    addToast(`Set pre-assigned classroom space: ${confirmRoomSelection.name}`);
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-505 text-white py-2.5 rounded-xl text-xs font-bold uppercase transition shadow-lg shadow-indigo-950/20"
                >
                  Go to Scheduler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DYNAMIC ACTIVITY HISTORY DRAWER */}
      <AnimatePresence>
        {selectedRoomForHistory && (
          <>
            {/* Dark blur backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedRoomForHistory(null);
                setHistorySearchQuery('');
              }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 cursor-pointer"
            />

            {/* Slide-out drawer panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col h-full text-slate-200 overflow-hidden"
            >
              {/* Header section with background pattern */}
              <div className="relative p-6 border-b border-slate-800/80 shrink-0 bg-slate-950/40">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex items-start justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-950/80 text-indigo-400 border border-indigo-900/30 rounded-2xl">
                      <History className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 text-left">
                      <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase font-extrabold">Room Insights</span>
                      <h3 className="text-md font-black text-white">{selectedRoomForHistory.name}</h3>
                      <p className="text-[11px] text-slate-400">
                        Detailed resource reservation activity archives.
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedRoomForHistory(null);
                      setHistorySearchQuery('');
                    }}
                    className="p-1.5 hover:bg-slate-850 text-slate-500 hover:text-white rounded-xl transition cursor-pointer border border-transparent hover:border-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Live stats insights grid */}
              {(() => {
                const roomBookings = adminBookings.filter(b => 
                  b.room_name?.toLowerCase().includes(selectedRoomForHistory.name.toLowerCase()) || 
                  selectedRoomForHistory.name?.toLowerCase().includes(b.room_name?.toLowerCase())
                );

                const sortedBookings = [...roomBookings].sort(
                  (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
                );

                const filteredBookings = sortedBookings.filter(b => {
                  if (!historySearchQuery.trim()) return true;
                  const query = historySearchQuery.toLowerCase();
                  return (
                    b.summary?.toLowerCase().includes(query) ||
                    b.creator_name?.toLowerCase().includes(query) ||
                    b.creator_email?.toLowerCase().includes(query)
                  );
                });

                const now = new Date();

                return (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* Bento Stat Badges */}
                    <div className="p-6 grid grid-cols-2 gap-4 shrink-0 bg-slate-950/20 border-b border-slate-850/40">
                      <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl text-left space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Total Reservations</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-white">{sortedBookings.length}</span>
                          <span className="text-[10px] text-indigo-400 font-bold">logs</span>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl text-left space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Current Status</span>
                        <div className="flex items-center gap-2 pt-1">
                          <span className={`w-2 h-2 rounded-full ${selectedRoomForHistory.status === 'available' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-450 animate-pulse'}`} />
                          <span className={`text-xs font-black uppercase font-mono ${selectedRoomForHistory.status === 'available' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {selectedRoomForHistory.status === 'available' ? 'AVAILABLE' : 'OCCUPIED'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Search bar inside the drawer */}
                    <div className="px-6 pt-4 pb-2 shrink-0">
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                          id="history-drawer-search-input"
                          type="text"
                          value={historySearchQuery}
                          onChange={(e) => setHistorySearchQuery(e.target.value)}
                          placeholder="Filter bookings by user, email, or summary..."
                          className="w-full bg-slate-950 hover:bg-slate-950/90 focus:bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl pl-9.5 pr-8.5 py-2 text-xs text-slate-200 placeholder-slate-550 focus:outline-none transition-all font-sans shadow-inner text-left"
                        />
                        {historySearchQuery && (
                          <button
                            id="clear-history-search-btn"
                            onClick={() => setHistorySearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-all cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Timeline logs */}
                    <div className="p-6 flex-1 min-h-0 flex flex-col text-left">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono mb-4 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-indigo-400" />
                        Historical Action Feed
                      </h4>

                      {sortedBookings.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center border border-slate-850">
                            <Clock className="w-6 h-6 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400">No activity logged matching space</p>
                            <p className="text-[11px] text-slate-600 mt-1 max-w-xs leading-relaxed">
                              This student hub doesn't present historic timeline logs currently. It's fully ready for instant synchronization.
                            </p>
                          </div>
                        </div>
                      ) : filteredBookings.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center border border-slate-850">
                            <Search className="w-6 h-6 text-indigo-400/80 animate-pulse" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-300">No matching reservations found</p>
                            <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                              Your search query <span className="text-indigo-400 font-mono">"{historySearchQuery}"</span> didn't match any reservation details.
                            </p>
                            <button
                              onClick={() => setHistorySearchQuery('')}
                              className="mt-4 px-3 py-1.5 bg-indigo-950/65 hover:bg-indigo-900/65 border border-indigo-900/40 text-indigo-300 rounded-lg text-[10.5px] font-bold uppercase transition-all tracking-wide cursor-pointer"
                            >
                              Clear Search Filter
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6 overflow-y-auto pr-1 flex-1 pl-4 relative">
                          {/* Left thin connecting guide line for timeline */}
                          <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-slate-800" />

                          {filteredBookings.map((b) => {
                            const startTime = new Date(b.start_time);
                            const endTime = new Date(b.end_time);
                            const isUpcoming = startTime >= now;
                            const isActiveNow = startTime <= now && endTime >= now;

                            return (
                              <div key={b.id} className="relative text-left">
                                {/* Bullet indicator absolute pin */}
                                <div className="absolute -left-[20px] top-1.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-slate-750 flex items-center justify-center z-10">
                                  <div className={`w-1 h-1 rounded-full ${
                                    isActiveNow ? 'bg-emerald-450 animate-ping' :
                                    isUpcoming ? 'bg-indigo-400' : 'bg-slate-500'
                                  }`} />
                                </div>

                                <div className="bg-slate-950/60 hover:bg-slate-950 border border-slate-850 hover:border-slate-800 p-4 rounded-2xl space-y-2 transition-all shadow-md">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="font-extrabold text-xs text-white tracking-wide max-w-[180px] truncate" title={b.summary}>
                                      {b.summary}
                                    </span>
                                    <span className={`text-[8px] font-black uppercase tracking-wider font-mono px-2 py-0.5 rounded border ${
                                      isActiveNow ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40' :
                                      isUpcoming ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/40' :
                                      'bg-slate-900/60 text-slate-400 border-slate-800/60'
                                    }`}>
                                      {isActiveNow ? 'ACTIVE NOW' : isUpcoming ? 'UPCOMING' : 'COMPLETED'}
                                    </span>
                                  </div>

                                  <div className="space-y-1 font-mono text-[10px]">
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                      <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                                      <span>
                                        {startTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                        {' • '} 
                                        {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-slate-500 pt-0.5">
                                      <UserCheck className="w-3 h-3 text-indigo-500 shrink-0" />
                                      <span className="truncate max-w-[220px]" title={`${b.creator_name} (${b.creator_email})`}>
                                        {b.creator_name || 'Anonymous User'} ({b.creator_email})
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Drawer footer summary */}
              <div className="p-6 bg-slate-950/50 border-t border-slate-800/80 shrink-0 text-center">
                <button
                  onClick={() => {
                    setSelectedRoomForHistory(null);
                    setHistorySearchQuery('');
                  }}
                  className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-700/60 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs uppercase cursor-pointer transition-all"
                >
                  Close Insights Drawer
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer Branding */}
      <footer className="py-6 border-t border-slate-900/80 mt-12 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-[10px] font-mono uppercase tracking-wider space-y-1">
          <span>created by srishti pathak iit bhu 2026</span><br />
          <span>Smart Room reservation panel • connected to cloud postgres nodes</span>
        </div>
      </footer>

      {/* Resilient Custom Confirmation Modal (Bypasses sandboxed iframe window.confirm blocks completely) */}
      <AnimatePresence>
        {confirmModal && confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-md shadow-2xl relative z-10 space-y-5 text-left border-indigo-500/10"
            >
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2 font-sans">
                  <AlertTriangle className={`w-5 h-5 ${confirmModal.isDanger ? 'text-rose-500' : 'text-indigo-400'}`} />
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line font-sans">
                  {confirmModal.message}
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold hover:text-white text-slate-400 transition-all cursor-pointer select-none"
                >
                  {confirmModal.cancelText || 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    confirmModal.onConfirm();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none text-white shadow-lg ${
                    confirmModal.isDanger 
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/10' 
                      : 'bg-indigo-600 hover:bg-indigo-550 shadow-indigo-900/10'
                  }`}
                >
                  {confirmModal.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
