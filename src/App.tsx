import React, { useState, useEffect, useMemo } from 'react';
import { initAuth, googleSignIn, logout, resetGoogleSignInLock } from './lib/auth';
import { CalendarAPI } from './lib/workspace';
import { Room } from './types';
import { FloorPlanView } from './components/FloorPlanView';
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
  CalendarPlus,
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
  Map,
  Info,
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
  Building2,
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
  History,
  Loader2,
  Upload,
  Eye,
  EyeOff,
  Menu,
  Star,
  Compass,
  Wifi,
  Tv,
  Wind,
  Accessibility,
  BookOpen,
  Heart,
  ChevronRight,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

interface WorkspaceGateProps {
  activeTab: string;
  isIframe: boolean;
  onLink: () => void;
  onBypass?: () => void;
  isLinking?: boolean;
}

function WorkspaceGate({ activeTab, isIframe, onLink, onBypass, isLinking }: WorkspaceGateProps) {
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
          disabled={isLinking}
          className={`w-full py-3 bg-indigo-600 hover:bg-indigo-550 text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer mx-auto ${
            isLinking ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isLinking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
          <span>{isLinking ? 'Linking Google Account...' : 'Link Google Workspace Now'}</span>
        </button>

        {onBypass && (
          <button
            onClick={onBypass}
            disabled={isLinking}
            className={`w-full py-2.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-amber-400/90 hover:text-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mx-auto shadow-md ${
              isLinking ? 'opacity-50 cursor-not-allowed' : ''
            }`}
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
    const saved = localStorage.getItem('iitbhu_dark_mode');
    return saved !== 'false'; // Default to true
  });

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newVal = !prev;
      localStorage.setItem('iitbhu_dark_mode', String(newVal));
      return newVal;
    });
  };

  // High-contrast accessibility theme state specifically for visually impaired faculty
  const isHighContrast = false;

  // Form states for login/signup
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerRole, setRegisterRole] = useState<'student' | 'faculty' | 'admin'>('student');

  // Google Workspace account bind state
  const [googleWorkspaceLinked, setGoogleWorkspaceLinked] = useState<boolean>(() => {
    if (!sessionStorage.getItem('google_workspace_access_token')) {
      sessionStorage.setItem('google_workspace_access_token', 'mock_google_workspace_token');
    }
    return true;
  });
  const [googleProfile, setGoogleProfile] = useState<any>(null);
  const [isIframe, setIsIframe] = useState(false);

  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);

  // Resilient Custom Confirmation Modal state to replace window.confirm blocks (which crash inside sandbox iframes)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onCancel?: () => void;
    requiredTextToConfirm?: string;
  } | null>(null);

  const [confirmInputText, setConfirmInputText] = useState('');

  useEffect(() => {
    if (confirmModal?.isOpen) {
      setConfirmInputText('');
    }
  }, [confirmModal?.isOpen]);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  // Active workspace states
  const [rooms, setRoomsState] = useState<Room[]>([]);
  const setRooms = (newRooms: Room[] | ((prev: Room[]) => Room[])) => {
    setRoomsState((prev) => {
      const resolved = typeof newRooms === 'function' ? newRooms(prev) : newRooms;
      const unique: Room[] = [];
      const seen = new Set<string>();
      for (const r of resolved) {
        if (r && r.id && !seen.has(r.id)) {
          seen.add(r.id);
          unique.push(r);
        }
      }
      return unique;
    });
  };
  const [activeTab, setActiveTab] = useState<'rooms' | 'calendar' | 'drive' | 'gmail' | 'chat' | 'forms' | 'analytics' | 'admin' | 'ai' | 'about' | 'contact'>('rooms');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [compareRooms, setCompareRooms] = useState<Room[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Notifications states
  const [notifications, setNotifications] = useState<any[]>([]);
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const [showNotifications, setShowNotifications] = useState(false);

  // Filters state for Rooms Directory
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'available'>('all');
  const [selectedFeatureToggles, setSelectedFeatureToggles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortKey, setSortKey] = useState<'default' | 'capacity-asc' | 'capacity-desc' | 'available-first' | 'booked-first'>('default');
  const [directoryViewMode, setDirectoryViewMode] = useState<'grid' | 'floorplan'>('grid');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Auto-refresh timer states for Rooms Directory
  const [roomsRefreshCountdown, setRoomsRefreshCountdown] = useState<number>(60);
  const [isRefreshingRooms, setIsRefreshingRooms] = useState<boolean>(false);

  // Offline caching systems tracking state
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [roomsSyncStatus, setRoomsSyncStatus] = useState<{ source: 'network' | 'cache'; timestamp: number | null }>({
    source: 'network',
    timestamp: null
  });
  const [bookingsSyncStatus, setBookingsSyncStatus] = useState<{ source: 'network' | 'cache'; timestamp: number | null }>({
    source: 'network',
    timestamp: null
  });

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
  const [selectedRoomForDetails, setSelectedRoomForDetails] = useState<Room | null>(null);
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

  // Admin Bulk Room CSV import states
  const [adminRoomTab, setAdminRoomTab] = useState<'single' | 'bulk'>('single');
  const [csvText, setCsvText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [parsedRooms, setParsedRooms] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

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
          if (meResponse && meResponse.user) {
            setUser(meResponse.user);
            setNeedsAuth(false);
            setGoogleWorkspaceLinked(true);
            fetchDashboardModels(meResponse.user.role);
            addToast(`Welcome back, ${meResponse.user.name}!`, 'success');
          } else {
            throw new Error('Invalid user profile payload.');
          }
        } catch (err) {
          console.warn('Cached JWT session token verification failed. Returning to sign-in.', err);
          setSessionToken(null);
          setToken(null);
          setUser(null);
          setNeedsAuth(true);
        }
      } else {
        // No session exists, keep credentials portal active for standard sign in or custom registration
        setToken(null);
        setUser(null);
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

  const [syncingBookingId, setSyncingBookingId] = useState<string | null>(null);

  const handleAddToGoogleCalendar = async (b: any) => {
    const confirmed = window.confirm(`Would you like to sync the reservation "${b.summary}" to your Google Calendar?`);
    if (!confirmed) return;

    setSyncingBookingId(b.id);
    try {
      await CalendarAPI.createEvent({
        roomName: b.room_name || 'Classroom/Lab Space',
        summary: b.summary,
        startTime: b.start_time,
        endTime: b.end_time,
        creatorName: b.creator_name || 'Authorized Scholar',
        creatorEmail: b.creator_email || 'authenticated@iitbhu.ac.in',
        facultyId: b.faculty_id,
        attendeeEmail: b.attendee_email,
      });
      addToast(`Sync Successful! "${b.summary}" has been added to your Google Calendar.`, 'success');
    } catch (err: any) {
      console.error('Google Calendar Sync Error:', err);
      const lower = err.message?.toLowerCase() || '';
      if (lower.includes('token') || lower.includes('auth') || lower.includes('credential') || lower.includes('sign in')) {
        const relink = window.confirm('Your Google Workspace link is expired or required. Would you like to connect your Google account now?');
        if (relink) {
          await linkGoogleWorkspaceAccount();
        }
      } else {
        addToast(`Google Calendar Sync Error: ${err.message || err}`, 'error');
      }
    } finally {
      setSyncingBookingId(null);
    }
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

    const handleSyncStatus = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, source, timestamp } = customEvent.detail;
      if (type === 'rooms') {
        setRoomsSyncStatus({ source, timestamp });
      } else if (type === 'bookings') {
        setBookingsSyncStatus({ source, timestamp });
      }
    };

    const handleOnlineStatus = () => {
      setIsOnline(true);
      addToast('Network connection recovered. Live room synchronization is active.', 'success');
    };

    const handleOfflineStatus = () => {
      setIsOnline(false);
      addToast('Network connection lost. Safe-routing cached directory activated.', 'info');
    };

    window.addEventListener('google-token-invalid', handleGoogleTokenInvalid);
    window.addEventListener('iitbhu_sync_status', handleSyncStatus);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);

    return () => {
      unsubscribe();
      window.removeEventListener('google-token-invalid', handleGoogleTokenInvalid);
      window.removeEventListener('iitbhu_sync_status', handleSyncStatus);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
    };
  }, []);

  const fetchDashboardModels = async (role: string) => {
    try {
      // 1. Fetch live rooms
      const list = await roomsAPI.list();
      setRooms(Array.isArray(list) ? list : []);

      // 2. Fetch live bookings
      const bookings = await bookingsAPI.list();
      setAdminBookings(Array.isArray(bookings) ? bookings : []);

      // 3. Fetch analytics
      const stats = await analyticsAPI.getStats();
      setAnalyticsStats(stats);

      // 4. Fetch admin users state
      if (role === 'admin') {
        const uList = await adminAPI.listUsers();
        setAdminUsers(Array.isArray(uList) ? uList : []);
      }

      // 5. Fetch live notifications
      try {
        const notifList = await notificationsAPI.list();
        setNotifications(Array.isArray(notifList) ? notifList : []);
      } catch (ne) {
        console.warn('Could not populate live notifications:', ne);
      }

      // Reset auto-refresh timer upon successful fetch
      setRoomsRefreshCountdown(60);
    } catch (err: any) {
      console.error('Failed loading resources:', err);
    }
  };

  // Implement automatic background refresh timer for Rooms Directory database sync every 60 seconds
  useEffect(() => {
    if (!token) return;

    const intervalId = setInterval(() => {
      setRoomsRefreshCountdown((prev) => {
        if (prev <= 1) {
          setIsRefreshingRooms(true);
          // Fetch fresh rooms and bookings to ensure availability statuses are instantly up-to-date
          Promise.all([roomsAPI.list(), bookingsAPI.list()])
            .then(([refreshedRooms, refreshedBookings]) => {
              setRooms(Array.isArray(refreshedRooms) ? refreshedRooms : []);
              setAdminBookings(Array.isArray(refreshedBookings) ? refreshedBookings : []);
              console.log('🔄 Rooms Directory automatically synced with Postgres database (60s timer)');
            })
            .catch((err) => {
              console.error('Auto-refresh failed:', err);
            })
            .finally(() => {
              setIsRefreshingRooms(false);
            });
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [token]);

  const handleMarkNotificationsRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => (Array.isArray(prev) ? prev : []).map((n) => ({ ...n, read: true })));
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
          setNotifications(Array.isArray(notifList) ? notifList : []);
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
            setNotifications((prev) => [payload.new, ...(Array.isArray(prev) ? prev : [])].slice(0, 50));
            addToast(`System Notification: ${payload.new.title}`, 'info');
          } else {
            // Hot reload full notification panel
            notificationsAPI.list()
              .then((list) => setNotifications(Array.isArray(list) ? list : []))
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
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        // Authenticate Google user with full-stack backend, registering them if needed
        const response = await authAPI.googleLogin({
          email: result.user.email,
          name: result.user.displayName || result.user.email?.split('@')[0] || 'IIT BHU User',
          uid: result.user.uid,
          photoURL: result.user.photoURL,
        });
        
        setSessionToken(response.token, true);
        setUser(response.user);
        setToken(response.token);
        
        // Auto link Workspace credentials
        sessionStorage.setItem('google_workspace_access_token', result.accessToken);
        setGoogleProfile(result.user);
        setGoogleWorkspaceLinked(true);
        
        setNeedsAuth(false);
        addToast(`Successfully identified as ${response.user.name} via secure Google Auth!`, 'success');
        fetchDashboardModels(response.user.role);
      }
    } catch (err: any) {
      resetGoogleSignInLock();
      const msg = err instanceof Error ? err.message : 'Google authentication dismissed or blocked.';
      addToast(msg, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

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
    if (isLinkingGoogle) return;
    setIsLinkingGoogle(true);
    try {
      const result = await googleSignIn();
      if (result) {
        sessionStorage.setItem('google_workspace_access_token', result.accessToken);
        setGoogleProfile(result.user);
        setGoogleWorkspaceLinked(true);
        addToast('Google Workspace authentication linked! Active widgets enabled.', 'success');
      }
    } catch (err: any) {
      resetGoogleSignInLock();
      const msg = err instanceof Error ? err.message : 'Popup blocker active or login dismissed.';
      
      // Intercept and detect popup blocks typical in Google AI Studio iframes
      const lowerMsg = msg.toLowerCase();
      const isPopupBlock = 
        isIframe ||
        lowerMsg.includes('popup') || 
        lowerMsg.includes('blocked') || 
        lowerMsg.includes('timeout') ||
        lowerMsg.includes('timed out') ||
        lowerMsg.includes('cancelled-popup') ||
        lowerMsg.includes('closed') ||
        lowerMsg.includes('progress') ||
        lowerMsg.includes('already in progress');

      if (isPopupBlock) {
        console.warn('Iframe Google popup block/timeout intercepted. Auto-activating Workspace Simulator Fallback.', err);
        bypassGoogleWorkspaceAuthSimulated();
      } else {
        console.warn('Unexpected google link warning:', err);
        addToast(msg, 'info');
      }
    } finally {
      setIsLinkingGoogle(false);
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

  const handleParseCsv = (text: string) => {
    try {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length === 0) {
        setParsedRooms([]);
        setCsvErrors(['No content provided.']);
        return;
      }

      // Check header
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const requiredHeaders = ['name', 'capacity'];
      const missing = requiredHeaders.filter(h => !headers.includes(h));
      if (missing.length > 0) {
        setCsvErrors([`Missing required column headers: ${missing.join(', ')}. Please supply "name" and "capacity".`]);
        setParsedRooms([]);
        return;
      }

      const tempRooms: any[] = [];
      const tempErrors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Split on comma, ignoring commas that are inside quotes
        const rawLine = lines[i];
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < rawLine.length; j++) {
          const char = rawLine[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            parts.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        parts.push(current.trim());

        const cols = parts.map(c => c.trim().replace(/^["']|["']$/g, ''));
        const roomObj: any = {};
        
        headers.forEach((header, index) => {
          roomObj[header] = cols[index] || '';
        });

        const rowNum = i + 1;
        if (!roomObj.name) {
          tempErrors.push(`Row ${rowNum}: Name column can never be blank.`);
          continue;
        }

        const capNum = Number(roomObj.capacity);
        if (isNaN(capNum) || capNum <= 0) {
          tempErrors.push(`Row ${rowNum}: Capacity expects a positive integer. Value supplied: "${roomObj.capacity}".`);
          continue;
        }

        let featuresArr: string[] = [];
        if (roomObj.features) {
          if (roomObj.features.includes(';')) {
            featuresArr = roomObj.features.split(';').map((f: string) => f.trim()).filter(Boolean);
          } else if (roomObj.features.includes('|')) {
            featuresArr = roomObj.features.split('|').map((f: string) => f.trim()).filter(Boolean);
          } else {
            featuresArr = roomObj.features.split(',').map((f: string) => f.trim()).filter(Boolean);
          }
        }

        tempRooms.push({
          name: roomObj.name,
          capacity: capNum,
          features: featuresArr,
          image: roomObj.image || undefined,
          color: roomObj.color || 'from-slate-700 to-slate-900',
        });
      }

      setCsvErrors(tempErrors);
      setParsedRooms(tempRooms);
    } catch (err: any) {
      setCsvErrors([`CSV Parsing Failed: ${err.message}`]);
      setParsedRooms([]);
    }
  };

  const handleAdminBulkImportRooms = async () => {
    if (parsedRooms.length === 0) {
      addToast('No parsed rooms to import. Try pasting or uploading valid CSV data first!', 'info');
      return;
    }
    try {
      await roomsAPI.bulkCreate(parsedRooms);
      addToast(`Bulk import completed successfully! ${parsedRooms.length} room spaces initialized.`, 'success');
      setCsvText('');
      setParsedRooms([]);
      setCsvErrors([]);
      fetchDashboardModels(user.role);
    } catch (err: any) {
      addToast(`Bulk entry error: ${err.message}`, 'error');
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
      if (statusFilter === 'available' && room.status !== 'available') return false;
      for (const f of selectedFeatureToggles) {
        if (!matchesFeature(room, f)) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = room.name.toLowerCase().includes(query);
        const matchesBuilding = room.building?.toLowerCase().includes(query) || false;
        const matchesCategory = room.category?.toLowerCase().includes(query) || false;
        const matchesBestFor = room.bestFor?.toLowerCase().includes(query) || false;
        const matchesFeatureDescription = room.features.some((feature) =>
          feature.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesBuilding && !matchesCategory && !matchesBestFor && !matchesFeatureDescription) return false;
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
  }, [rooms, minCapacity, statusFilter, selectedFeatureToggles, searchQuery, sortKey]);

  const userBookings = useMemo(() => {
    if (!user?.email) return [];
    return adminBookings.filter(b => b.creator_email?.toLowerCase() === user.email.toLowerCase());
  }, [adminBookings, user?.email]);

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
      <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} flex flex-col justify-between p-6 relative overflow-hidden font-sans transition-colors duration-300`}>
        {/* Abstract Architectural Tech Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(13,148,136,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(13,148,136,0.05)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(13,148,136,0.08),transparent_60%)] pointer-events-none" />
        
        {/* Soft Ambient Glow Elements */}
        <motion.div 
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.15, 0.22, 0.15],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-teal-500/10 rounded-full blur-[130px] pointer-events-none" 
        />
        <motion.div 
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.1, 0.18, 0.1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" 
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 w-full max-w-xl mx-auto pt-2 z-10 relative">
          <div className={`self-end sm:self-auto text-right font-mono text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-2`}>
            <Clock3 className="w-3.5 h-3.5 text-indigo-505" />
            <span>BHU Office Clock: {currentTime || 'Loading...'}</span>
          </div>
        </div>

        <div className={`max-w-xl w-full mx-auto my-auto ${
          isDarkMode 
            ? 'bg-slate-900/65 border-slate-800/80 shadow-indigo-950/25' 
            : 'bg-white/95 border-slate-200 shadow-slate-200/50'
        } border rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 backdrop-blur-xl transition-all duration-300`}>
          <div className="text-center space-y-3.5">
            <div className={`text-[10px] font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} uppercase tracking-widest font-mono`}>
              Indian Institute of Technology (BHU) Varanasi
            </div>
            <h1 className={`text-3xl sm:text-4xl font-display font-extrabold tracking-tight ${
              isDarkMode 
                ? 'bg-gradient-to-r from-white via-slate-100 to-indigo-300' 
                : 'bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900'
            } bg-clip-text text-transparent`}>
              IIT BHU Smart Room Scheduler
            </h1>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} max-w-sm mx-auto leading-relaxed`}>
              Full-Stack Room Scheduler with Role-Based Access Control, Persistent PostgreSQL, and optional Google Workspace integrations.
            </p>
          </div>

          {/* Tester Helper Cards */}
          <div className={`p-4 rounded-2xl border ${
            isDarkMode 
              ? 'bg-slate-950/60 border-indigo-950/50' 
              : 'bg-slate-50/80 border-slate-150'
          } space-y-3`}>
            <span className={`text-[9.5px] font-bold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-650'} uppercase tracking-widest block font-mono`}>
              ⚡ Quick Tester Profiles (Click to prefill coordinates):
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillPredefinedCredentials('admin')}
                className={`text-[10px] font-semibold py-2 px-2 rounded-xl transition-all border cursor-pointer ${
                  isDarkMode 
                    ? 'bg-indigo-950/30 hover:bg-indigo-900/40 border-indigo-900/30 text-indigo-200' 
                    : 'bg-indigo-50/80 hover:bg-indigo-100 border-indigo-200/60 text-indigo-700'
                }`}
              >
                Prof. Rajeev (Admin)
              </button>
              <button
                type="button"
                onClick={() => fillPredefinedCredentials('faculty')}
                className={`text-[10px] font-semibold py-2 px-2 rounded-xl transition-all border cursor-pointer ${
                  isDarkMode 
                    ? 'bg-teal-950/30 hover:bg-teal-900/40 border-teal-900/30 text-teal-200' 
                    : 'bg-teal-50/80 hover:bg-teal-100 border-teal-200/60 text-teal-700'
                }`}
              >
                Dr. S. K. (Faculty)
              </button>
              <button
                type="button"
                onClick={() => fillPredefinedCredentials('student')}
                className={`text-[10px] font-semibold py-2 px-2 rounded-xl transition-all border cursor-pointer ${
                  isDarkMode 
                    ? 'bg-amber-950/30 hover:bg-amber-900/40 border-amber-900/30 text-amber-200' 
                    : 'bg-amber-50/80 hover:bg-amber-100 border-amber-200/60 text-amber-700'
                }`}
              >
                Abishek (Student)
              </button>
            </div>
          </div>

          {/* Custom Tabs */}
          <div className={`flex border-b ${isDarkMode ? 'border-slate-800/80' : 'border-slate-200/80'}`}>
            <button
              onClick={() => setIsRegisterMode(false)}
              className={`flex-1 text-center py-2.5 text-xs font-bold uppercase transition-all cursor-pointer ${
                !isRegisterMode 
                  ? 'text-indigo-500 border-b-2 border-indigo-500' 
                  : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-650')
              }`}
            >
              Credentials Sign In
            </button>
            <button
              onClick={() => setIsRegisterMode(true)}
              className={`flex-1 text-center py-2.5 text-xs font-bold uppercase transition-all cursor-pointer ${
                isRegisterMode 
                  ? 'text-indigo-500 border-b-2 border-indigo-500' 
                  : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-650')
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Google Sign-In with Firebase Auth (Securely Identify Users) */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-[0.98] cursor-pointer ${
                isDarkMode
                  ? 'border-slate-800 bg-slate-950 text-white hover:bg-slate-900'
                  : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoggingIn ? 'Connecting...' : 'Secure Sign In with Google'}</span>
            </button>
            <div className="relative flex py-2 items-center">
              <div className={`flex-grow border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}></div>
              <span className={`flex-shrink mx-4 text-[9px] font-mono font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>or use credentials</span>
              <div className={`flex-grow border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}></div>
            </div>
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
                  <label className={`block text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-505'} mb-1.5`}>
                    Email Coordinates (Any email works to instantly connect!)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Enter any email (e.g. resident@gmail.com)"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className={`w-full ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800/80 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500'
                    } border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-505'} mb-1.5`}>
                    Account Secret Password (Optional - any password works!)
                  </label>
                  <input
                    type="password"
                    placeholder="Optional (defaults to password123)"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className={`w-full ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800/80 text-slate-200 placeholder:text-slate-605 focus:border-indigo-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500'
                    } border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
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
                  <label className={`block text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-505'} mb-1.5`}>Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. A.K. Tripathi"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className={`w-full ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800/80 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-905 placeholder:text-slate-400 focus:border-indigo-500'
                    } border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-505'} mb-1.5`}>IIT Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. tripathi.cs@iitbhu.ac.in"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className={`w-full ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800/80 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-905 placeholder:text-slate-400 focus:border-indigo-500'
                    } border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-505'} mb-1.5`}>Create Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className={`w-full ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800/80 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-905 placeholder:text-slate-400 focus:border-indigo-500'
                    } border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-505'} mb-1.5`}>Desired Status Role</label>
                  <select
                    value={registerRole}
                    onChange={(e: any) => setRegisterRole(e.target.value)}
                    className={`w-full ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800/80 text-slate-200 focus:border-indigo-500' 
                        : 'bg-slate-50 border-slate-250 text-slate-900 focus:border-indigo-505'
                    } border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none`}
                  >
                    <option value="student">Student Account (Role constraints apply)</option>
                    <option value="faculty">Faculty Member (Authorization to Reserv rooms)</option>
                    <option value="admin">Admin Authority (Full Master clearing bounds)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
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
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#FAF9F5] text-[#031c14]'} font-sans flex flex-col justify-between transition-colors duration-300`}>
      <div>
        {/* Superior Branding Utility Top Bar */}
        <div className="bg-[#031f16] text-[#dfb965] text-[11px] py-2 px-6 border-b border-[#0d5c43]/40 hidden md:block">
          <div className="max-w-7xl mx-auto flex items-center justify-between font-mono">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#dfb965]" />
                <span className="text-[#f6ebd4]">IIT (BHU), Varanasi, UP 221005, India</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#dfb965]" />
                <span className="text-[#f6ebd4]">+91 542 6702084</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#dfb965]" />
                <span className="text-[#f6ebd4]">registrar@iitbhu.ac.in</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[10px]">
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-[#f6ebd4]">{isOnline ? 'Network Connected' : 'Cached Local Node'}</span>
              </span>
              <span className="text-emerald-800">|</span>
              <span className="text-[#dfb965]">Office Clock: {currentTime || 'Syncing...'}</span>
            </div>
          </div>
        </div>

        {/* Main Brand Sticky Header */}
        <header className={`sticky top-0 z-40 transition-all duration-300 border-b ${
          isSticky 
            ? (isDarkMode ? 'bg-slate-900/95 backdrop-blur-md shadow-lg border-slate-800 py-3.5' : 'bg-white/95 backdrop-blur-md shadow-lg border-[#ead29c]/50 py-3.5') 
            : (isDarkMode ? 'bg-slate-950/90 backdrop-blur-sm border-slate-900 py-5' : 'bg-white/90 backdrop-blur-sm border-slate-200 py-5')
        } px-6`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap md:flex-nowrap">
            
            {/* Elegant Branding with SVG Book Logo */}
            <div 
              className="flex items-center gap-3 cursor-pointer group" 
              onClick={() => { setActiveTab('rooms'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              <div className="bg-[#0a4735] p-2.5 rounded-xl border border-[#dfb965]/30 shadow-md group-hover:scale-105 transition-all">
                <svg
                   xmlns="http://www.w3.org/2000/svg"
                   viewBox="0 0 64 64"
                   fill="none"
                   className="w-7 h-7 text-[#dfb965]"
                >
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                  <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
                  <path d="M19 44c3.5-1.5 8.5-2.5 13-2.5s9.5 1 13 2.5c-2 3.5-5.5 5.5-13 5.5s-11-2-13-5.5z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M32 40c-2.5-2-5.5-3-9-3s-6.5.8-9 2.5V26c2.5-1.7 5.5-2.5 9-2.5s6.5.8 9 2.5c2.5-1.7 5.5-2.5 9-2.5s6.5.8 9 2.5v14c-2.5-1.7-5.5-2.5-9-2.5s-6.5 1-9 3z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <circle cx="32" cy="20" r="9" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
                  <path d="M32 29v7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M32 12c-2.5 3.5-4 5-4 7a4 4 0 1 0 8 0c0-2-1.5-3.5-4-7z" fill="currentColor" opacity="0.95" />
                </svg>
              </div>
              <div className="text-left">
                <h1 className={`text-sm font-display font-bold tracking-widest uppercase transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-[#0a4735]'}`}>IIT (BHU) Varanasi</h1>
                <p className="text-[11px] font-serif font-semibold italic text-[#c09728] tracking-wide">
                  Meeting Room Booking Portal
                </p>
              </div>
            </div>

            {/* Real-time Portal Clock Pill */}
            <div className={`hidden xl:flex items-center gap-2 px-3.5 py-1.5 border rounded-xl font-mono text-[11px] font-bold transition-all duration-300 ${
              isDarkMode 
                ? 'bg-slate-900 border-slate-800 text-[#dfb965]' 
                : 'bg-[#faf8f2] border-[#ead29c]/50 text-[#0a4735]'
            }`}>
              <span className="w-2 h-2 rounded-full bg-[#c09728] animate-pulse" />
              <span>UTC: {currentTime || 'Syncing...'}</span>
            </div>

            {/* Horizontal Navigation Menu for Desktop */}
            <nav className="hidden lg:flex items-center gap-1.5">
              {[
                { label: 'Home', tab: 'rooms', action: () => { setActiveTab('rooms'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
                { label: 'Rooms & Spaces', tab: 'rooms', action: () => { setActiveTab('rooms'); setTimeout(() => document.getElementById('directory-section')?.scrollIntoView({ behavior: 'smooth' }), 100); } },
                { label: 'My Bookings', tab: 'rooms', action: () => { setActiveTab('rooms'); setTimeout(() => document.getElementById('my-bookings-section')?.scrollIntoView({ behavior: 'smooth' }), 100); } },
                { label: 'Calendar', tab: 'calendar' },
                { label: 'Facilities', tab: 'rooms', action: () => { setActiveTab('rooms'); setTimeout(() => document.getElementById('facilities-section')?.scrollIntoView({ behavior: 'smooth' }), 100); } },
                { label: 'AI Advisor', tab: 'ai' },
                { label: 'Workspace Sync', tab: 'drive' },
                { label: 'Analytics', tab: 'analytics' },
                ...(user.role === 'admin' ? [{ label: 'Admin Center', tab: 'admin' }] : []),
                { label: 'About', tab: 'about' },
                { label: 'Contact', tab: 'contact' }
              ].map((item) => {
                const isActive = activeTab === item.tab || (item.tab === 'drive' && ['drive', 'gmail', 'chat', 'forms'].includes(activeTab));
                return (
                  <button
                    key={item.label}
                    onClick={item.action || (() => setActiveTab(item.tab as any))}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? (isDarkMode ? 'text-white bg-slate-900 border-b-2 border-[#dfb965]' : 'text-[#0a4735] bg-[#faf8f2] border-b-2 border-[#d4af37]')
                        : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-900/50' : 'text-[#0a4735]/70 hover:text-[#0a4735] hover:bg-[#faf8f2]/50')
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Right Side Controls & Profile Dropdown */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Premium Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'bg-slate-900 border-slate-800 text-[#dfb965] hover:bg-slate-800' 
                    : 'bg-[#faf8f2] border-[#ead29c]/40 text-[#0a4735] hover:bg-stone-100'
                }`}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Notifications Inbox Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications) handleMarkNotificationsRead();
                  }}
                  className={`relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                    safeNotifications.some((n) => !n.read)
                      ? 'bg-[#faf8f2] border-[#dfb965] text-[#c09728]'
                      : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-[#faf8f2] border-[#ead29c]/40 text-slate-450 hover:text-[#0a4735]')
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  {safeNotifications.some((n) => !n.read) && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
                  )}
                </button>
                
                {/* Notifications Dropdown Panel */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      className={`absolute right-0 mt-3 w-80 border rounded-2xl shadow-xl z-50 overflow-hidden text-left ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-[#ead29c] text-slate-800'
                      }`}
                    >
                      <div className={`p-4 border-b flex justify-between items-center ${
                        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-[#faf8f2] border-[#ead29c]/50'
                      }`}>
                        <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-[#0a4735]'}`}>System Alerts</span>
                        <button
                          onClick={() => { setNotifications([]); setShowNotifications(false); }}
                          className="text-[10px] text-rose-500 hover:text-rose-600 uppercase font-mono cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-850">
                        {safeNotifications.length === 0 ? (
                           <div className="p-6 text-center text-xs text-slate-400 italic">No notifications.</div>
                        ) : (
                          safeNotifications.map((notif) => (
                            <div key={notif.id || Math.random()} className={`p-3.5 space-y-1 transition-colors ${
                              isDarkMode ? 'hover:bg-slate-850/40' : 'hover:bg-[#faf8f2]/30'
                            }`}>
                              <div className="flex justify-between items-start gap-2">
                                <span className={`text-[10.5px] font-bold block leading-snug ${notif.type === 'success' ? (isDarkMode ? 'text-emerald-400' : 'text-[#0a4735]') : 'text-[#c09728]'}`}>
                                  {notif.title}
                                </span>
                                {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] shrink-0 mt-1" />}
                              </div>
                              <p className={`text-[10.5px] leading-normal ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{notif.message}</p>
                              <span className="text-[8.5px] font-mono text-slate-400 block">
                                {new Date(notif.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Google Link Connection Badge */}
              <button
                onClick={linkGoogleWorkspaceAccount}
                disabled={isLinkingGoogle}
                className={`flex items-center gap-1.5 text-[10px] font-extrabold uppercase py-2.5 px-3.5 rounded-xl border transition-all cursor-pointer ${
                  googleWorkspaceLinked
                    ? 'bg-[#10b981]/10 text-emerald-400 border-emerald-900/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-900/30 animate-pulse'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>{googleWorkspaceLinked ? 'Google Linked' : 'Link Google'}</span>
              </button>

              {/* Luxury Profile Pill */}
              <div className={`flex items-center gap-2.5 p-1.5 pr-3.5 rounded-full border ${
                isDarkMode 
                  ? 'border-slate-800 bg-slate-900' 
                  : 'border-[#ead29c]/50 bg-[#faf8f2]'
              }`}>
                <div className="w-8 h-8 rounded-full bg-[#0a4735] border border-[#dfb965]/40 flex items-center justify-center font-bold text-xs text-[#dfb965]">
                  {user.name.charAt(0)}
                </div>
                <div className="text-left leading-none font-sans">
                  <span className={`text-xs font-bold block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{user.name}</span>
                  <span className="text-[9px] text-[#c09728] font-semibold uppercase font-mono">{user.role}</span>
                </div>
                <button
                  onClick={handleSignout}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ml-1 ${
                    isDarkMode ? 'text-slate-500 hover:text-rose-450' : 'text-slate-400 hover:text-rose-650'
                  }`}
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Mobile Hamburger Trigger */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-2.5 rounded-xl border cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 text-slate-300 hover:bg-slate-850/50' 
                    : 'border-[#ead29c]/50 text-[#0a4735] hover:bg-[#faf8f2]/50'
                }`}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </header>

        {/* Mobile Sidebar Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed inset-y-0 right-0 w-80 border-l shadow-2xl z-50 p-6 flex flex-col justify-between lg:hidden text-left ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#ead29c] text-[#0a4735]'
              }`}
            >
              <div className="space-y-6">
                <div className={`flex justify-between items-center pb-4 border-b ${
                  isDarkMode ? 'border-slate-800' : 'border-slate-100'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className="bg-[#0a4735] p-1.5 rounded-lg text-[#dfb965]">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" className="w-5 h-5">
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                        <path d="M19 44c3.5-1.5 8.5-2.5 13-2.5s9.5 1 13 2.5c-2 3.5-5.5 5.5-13 5.5s-11-2-13-5.5z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M32 40c-2.5-2-5.5-3-9-3s-6.5.8-9 2.5V26c2.5-1.7 5.5-2.5 9-2.5s6.5.8 9 2.5v14c-2.5-1.7-5.5-2.5-9-2.5s-6.5 1-9 3z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      </svg>
                    </div>
                    <span className={`font-display font-bold text-sm uppercase ${isDarkMode ? 'text-white' : 'text-[#0a4735]'}`}>IIT (BHU)</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className={`p-1.5 rounded-lg border cursor-pointer ${
                      isDarkMode ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile Navigation Links */}
                <div className="flex flex-col gap-1 text-left">
                  {[
                    { label: 'Home Dashboard', tab: 'rooms', action: () => { setActiveTab('rooms'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
                    { label: 'Rooms Grid', tab: 'rooms', action: () => { setActiveTab('rooms'); setTimeout(() => document.getElementById('directory-section')?.scrollIntoView({ behavior: 'smooth' }), 100); } },
                    { label: 'My Bookings', tab: 'rooms', action: () => { setActiveTab('rooms'); setTimeout(() => document.getElementById('my-bookings-section')?.scrollIntoView({ behavior: 'smooth' }), 100); } },
                    { label: 'Interactive Calendar', tab: 'calendar' },
                    { label: 'Highlight Facilities', tab: 'rooms', action: () => { setActiveTab('rooms'); setTimeout(() => document.getElementById('facilities-section')?.scrollIntoView({ behavior: 'smooth' }), 100); } },
                    { label: 'AI Advisor chatbot', tab: 'ai' },
                    { label: 'Google Workspace', tab: 'drive' },
                    { label: 'Analytics Insights', tab: 'analytics' },
                    ...(user.role === 'admin' ? [{ label: 'Admin Center', tab: 'admin' }] : []),
                    { label: 'About History', tab: 'about' },
                    { label: 'Contact Help', tab: 'contact' }
                  ].map((item) => {
                    const isActive = activeTab === item.tab || (item.tab === 'drive' && ['drive', 'gmail', 'chat', 'forms'].includes(activeTab));
                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          if (item.action) item.action();
                          else setActiveTab(item.tab as any);
                        }}
                        className={`py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-all ${
                          isActive
                            ? (isDarkMode ? 'text-white bg-slate-800 border-l-4 border-[#dfb965]' : 'text-[#0a4735] bg-[#faf8f2] border-l-4 border-[#d4af37]')
                            : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800/40' : 'text-slate-500 hover:text-slate-800 hover:bg-[#faf8f2]/50')
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Profile & Switchers */}
              <div className={`pt-6 border-t space-y-4 ${
                isDarkMode ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0a4735] flex items-center justify-center font-bold text-sm text-[#dfb965]">
                    {user.name.charAt(0)}
                  </div>
                  <div className="text-left leading-tight flex-1 font-sans">
                    <span className={`text-xs font-bold block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{user.name}</span>
                    <span className={`text-[10px] block truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-550'}`}>{user.email}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      toggleDarkMode();
                    }}
                    className={`w-full py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5 ${
                      isDarkMode ? 'border-slate-800 bg-slate-850 text-white' : 'border-slate-200 bg-stone-100 text-[#0a4735]'
                    }`}
                  >
                    {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                    <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={linkGoogleWorkspaceAccount}
                      className={`flex-1 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider text-center ${
                        isDarkMode ? 'border-slate-800 text-slate-300 hover:bg-slate-850' : 'border-slate-200 text-slate-700 hover:bg-[#faf8f2]'
                      }`}
                    >
                      Google Sync
                    </button>
                    <button
                      onClick={handleSignout}
                      className={`flex-grow-0 p-2.5 rounded-xl border ${
                        isDarkMode ? 'border-slate-800 text-rose-400 hover:bg-rose-950/20' : 'border-slate-200 text-rose-650 hover:bg-rose-50/20'
                      }`}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Role Test Center floating tray on bottom-left for easy access during inspection */}
        <div className="fixed bottom-6 left-6 z-40 hidden md:flex items-center gap-2 bg-white/95 border border-[#ead29c] shadow-2xl rounded-2xl p-2.5 backdrop-blur-sm">
          <span className="text-[9.5px] font-extrabold text-[#0a4735] uppercase font-mono tracking-widest pl-2">
            Switch Test Role:
          </span>
          <div className="flex bg-[#faf8f2] p-1 rounded-xl border border-[#ead29c]/50">
            {[
              { role: 'admin', name: 'Prof. Rajeev Kumar', email: 'rajeev.kumar@iitbhu.ac.in', color: 'bg-rose-500/10 text-rose-700' },
              { role: 'faculty', name: 'Dr. S. K.', email: 'faculty@iitbhu.ac.in', color: 'bg-[#0a4735]/10 text-[#0a4735]' },
              { role: 'student', name: 'Abishek', email: 'student@iitbhu.ac.in', color: 'bg-[#c09728]/10 text-[#c09728]' }
            ].map((r) => {
              const active = user?.role === r.role;
              return (
                <button
                  key={r.role}
                  onClick={() => {
                    const nextUser = { ...user, role: r.role, name: r.name, email: r.email };
                    setUser(nextUser);
                    fetchDashboardModels(r.role);
                    addToast(`Role Switched: connected as ${r.name} (${r.role})`, 'success');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    active ? `${r.color} border border-current shadow-sm` : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {r.role}
                </button>
              );
            })}
          </div>
        </div>

        {/* Local Storage Caching & Online/Offline synchronization bar */}
        <div className={`py-2.5 px-6 border-b transition-all duration-300 ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800/80 text-white'
            : 'bg-indigo-50/30 border-slate-240/80 text-slate-800 shadow-sm'
        }`}>
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Status Section */}
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isOnline ? 'bg-emerald-400' : 'bg-amber-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                }`}></span>
              </span>
              <span className={`font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {isOnline ? 'Network Connected' : 'Offline Cached Directory Active'}
              </span>
              <span className={isDarkMode ? 'text-slate-650' : 'text-slate-300'}>|</span>
              <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'} text-[10.5px] font-mono`}>
                IIT BHU Cloud Sync: {isOnline ? 'Live Mode' : 'Local Sandbox Mode'}
              </span>
            </div>

            {/* Sync Times section */}
            <div className="flex flex-wrap items-center gap-4 text-[10.5px] font-mono text-slate-450 animate-fade-in">
              <div className="flex items-center gap-1.5 text-slate-500">
                <span>Rooms:</span>
                <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                  roomsSyncStatus.source === 'network' 
                    ? (isDarkMode ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                    : (isDarkMode ? 'bg-amber-950/60 text-amber-400 border border-amber-900/30' : 'bg-amber-50 text-amber-700 border border-amber-200')
                }`}>
                  {roomsSyncStatus.source === 'network' ? 'LIVE' : 'CACHED'}
                </span>
                {roomsSyncStatus.timestamp && (
                  <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {new Date(roomsSyncStatus.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Bookings:</span>
                <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                  bookingsSyncStatus.source === 'network' 
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/30' 
                    : 'bg-amber-950/60 text-amber-400 border border-amber-900/30'
                }`}>
                  {bookingsSyncStatus.source === 'network' ? 'LIVE' : 'CACHED'}
                </span>
                {bookingsSyncStatus.timestamp && (
                  <span className="text-slate-500">
                    {new Date(bookingsSyncStatus.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>

              {!isOnline && (
                <button
                  onClick={() => {
                    fetchDashboardModels(user.role);
                    addToast('Re-evaluating live IIT BHU server nodes...', 'info');
                  }}
                  className="bg-indigo-950 text-indigo-300 border border-indigo-800/40 hover:bg-indigo-900/40 hover:text-white py-0.5 px-2 rounded text-[9.5px] uppercase font-bold tracking-wider transition-all cursor-pointer"
                >
                  Sync Retry
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Premium Hotel-inspired full-width Hero Section Banner for IIT (BHU) */}
        {activeTab === 'rooms' && (
          <div className="relative w-full overflow-hidden bg-[#0a4735] text-white">
            {/* Background Image with elegant overlay */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay scale-105 transform hover:scale-100 transition-all duration-1000" 
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1517502884422-41eaaced0168?auto=format&fit=crop&q=80&w=1600')" }} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a4735] via-[#0a4735]/65 to-[#021f16]" />
            
            {/* Grid Pattern overlay for elegant depth */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#dfb9650b_1px,transparent_1px),linear-gradient(to_bottom,#dfb9650b_1px,transparent_1px)] bg-[size:24px_24px]" />
            
            <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 relative z-10 space-y-6 text-left">
              {/* Elegant Breadcrumbs */}
              <nav className="flex items-center gap-2 text-xs font-mono text-[#dfb965]/85 uppercase tracking-widest">
                <span>IIT (BHU) Portal</span>
                <ChevronRight className="w-3 h-3 text-[#dfb965]/60" />
                <span>Spaces</span>
                <ChevronRight className="w-3 h-3 text-[#dfb965]/60" />
                <span className="text-white">Meeting Rooms & Spaces</span>
              </nav>

              <div className="space-y-4 max-w-3xl">
                <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight text-white leading-tight">
                  Meeting Rooms <br className="hidden sm:inline" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#dfb965] to-[#f3dfa2] animate-pulse">
                    & Spaces
                  </span>
                </h1>
                <p className="text-sm md:text-base text-[#faf8f2]/90 font-serif leading-relaxed font-light max-w-2xl">
                  Welcome to the premium scheduling ecosystem of IIT (BHU) Varanasi. Reserve state-of-the-art boardrooms, fully equipped lecture theaters, and academic presentation spaces tailored to high-profile institute gatherings.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <button
                  onClick={() => {
                    const section = document.getElementById('directory-section');
                    if (section) section.scrollIntoView({ behavior: 'smooth' });
                    else {
                      window.scrollTo({ top: 600, behavior: 'smooth' });
                    }
                  }}
                  className="px-8 py-4 bg-[#dfb965] hover:bg-[#d4af37] text-[#0a4735] font-display font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Now</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('calendar');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-8 py-4 bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/35 text-white font-display font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-[#dfb965]" />
                  <span>Interactive Scheduler</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
            {/* Left Sidebar on Desktop */}
            <div className="lg:col-span-3 space-y-6 lg:sticky lg:top-24">
              {/* Profile Card (Integrated into the Sidebar for a true Dashboard look) */}
              <div className={`p-5 rounded-2xl border text-left space-y-4 ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800' 
                  : 'bg-white border-slate-200/80 shadow-sm'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-sm uppercase border ${
                    isDarkMode 
                      ? 'bg-indigo-950/80 border-indigo-700/60 text-indigo-300' 
                      : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  }`}>
                    {user.name.charAt(0)}
                  </div>
                  <div className="leading-tight flex-1 min-w-0">
                    <span className={`text-sm font-bold block truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{user.name}</span>
                    <span className={`text-[8.5px] font-extrabold uppercase py-0.5 px-1.5 rounded font-mono inline-block mt-0.5 ${
                      user.role === 'admin' ? (isDarkMode ? 'bg-red-950/80 text-red-300 border border-red-800/35' : 'bg-red-50 text-red-700 border border-red-200') : 
                      user.role === 'faculty' ? (isDarkMode ? 'bg-teal-950/80 text-teal-350 border border-teal-800/35' : 'bg-teal-50 text-teal-700 border border-teal-200') :
                      (isDarkMode ? 'bg-amber-950/80 text-amber-350 border border-amber-800/35' : 'bg-amber-50 text-amber-700 border border-amber-200')
                    }`}>
                      {user.role}
                    </span>
                  </div>
                </div>
                
                {/* Micro statistics or fast indicator */}
                <div className={`pt-3 border-t ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'} grid grid-cols-2 gap-2 text-center`}>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-500 block font-mono uppercase">User Level</span>
                    <strong className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} capitalize`}>{user.role}</strong>
                  </div>
                  <div className="space-y-0.5 border-l border-slate-800/60">
                    <span className="text-[9px] text-slate-500 block font-mono uppercase">Sync State</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 justify-center w-full">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Live
                    </span>
                  </div>
                </div>
              </div>

              {/* Sidebar Navigation Links (Responsive: Desktop sidebar, collapses on mobile) */}
              <div className={`hidden lg:block p-3 rounded-2xl border ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-sm'
              }`}>
                <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                  Scheduling Hub
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveTab('rooms')}
                    className={`w-full flex items-center gap-3 font-semibold text-xs py-3 px-3.5 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'rooms'
                        ? (isDarkMode ? 'bg-indigo-950/50 text-indigo-300 border-l-4 border-indigo-500 font-bold' : 'bg-indigo-50/80 text-indigo-700 border-l-4 border-indigo-500 font-bold')
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Grid className="w-4 h-4 shrink-0" />
                    <span>Rooms Directory</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('calendar')}
                    className={`w-full flex items-center gap-3 font-semibold text-xs py-3 px-3.5 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'calendar'
                        ? (isDarkMode ? 'bg-indigo-950/50 text-indigo-300 border-l-4 border-indigo-500 font-bold' : 'bg-indigo-50/80 text-indigo-700 border-l-4 border-indigo-500 font-bold')
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>Calendar Scheduler</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('ai')}
                    className={`w-full flex items-center gap-3 font-semibold text-xs py-3 px-3.5 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'ai'
                        ? (isDarkMode ? 'bg-indigo-950/50 text-indigo-300 border-l-4 border-indigo-500 font-bold' : 'bg-indigo-50/80 text-indigo-700 border-l-4 border-indigo-500 font-bold')
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 animate-pulse" />
                    <span>AI Assistant</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('analytics')}
                    className={`w-full flex items-center gap-3 font-semibold text-xs py-3 px-3.5 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'analytics'
                        ? (isDarkMode ? 'bg-indigo-950/50 text-indigo-300 border-l-4 border-indigo-500 font-bold' : 'bg-indigo-50/80 text-indigo-700 border-l-4 border-indigo-500 font-bold')
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Activity className="w-4 h-4 text-rose-450 shrink-0" />
                    <span>Analytics</span>
                  </button>
                </div>

                <div className="px-3 pt-4 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono border-t border-slate-850 mt-3">
                  Google Workspace
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveTab('drive')}
                    className={`w-full flex items-center gap-3 font-semibold text-xs py-3 px-3.5 rounded-xl transition-all cursor-pointer ${
                      ['drive', 'gmail', 'chat', 'forms'].includes(activeTab)
                        ? (isDarkMode ? 'bg-indigo-950/50 text-indigo-300 border-l-4 border-indigo-500 font-bold' : 'bg-indigo-50/80 text-indigo-700 border-l-4 border-indigo-500 font-bold')
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <HardDrive className="w-4 h-4 text-emerald-450 shrink-0" />
                    <span>Workspace Sync</span>
                  </button>
                </div>

                {user.role === 'admin' && (
                  <>
                    <div className="px-3 pt-4 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono border-t border-slate-855 mt-3">
                      Security & Control
                    </div>
                    <div className="space-y-1">
                      <button
                        onClick={() => setActiveTab('admin')}
                        className={`w-full flex items-center gap-3 font-semibold text-xs py-3 px-3.5 rounded-xl transition-all cursor-pointer ${
                          activeTab === 'admin'
                            ? (isDarkMode ? 'bg-rose-950/30 text-rose-300 border-l-4 border-rose-500 font-bold' : 'bg-rose-50/80 text-rose-700 border-l-4 border-rose-500 font-bold')
                            : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800/40'
                        }`}
                      >
                        <Shield className="w-4 h-4 text-red-450 shrink-0 animate-pulse" />
                        <span>Admin Center</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right-hand Main Workspace Content area */}
            <div className="lg:col-span-9 space-y-6">
              
              {/* Mobile top-bar horizontal menu (only visible below lg screen width) */}
              <div className="block lg:hidden overflow-x-auto pb-1 mb-4">
                <div className="flex items-center gap-1.5 border-b border-slate-800/60">
                  <button
                    onClick={() => setActiveTab('rooms')}
                    className={`flex items-center gap-2 font-semibold text-xs uppercase tracking-wider py-3 px-4 border-b-2 transition-all cursor-pointer shrink-0 ${
                      activeTab === 'rooms'
                        ? 'border-indigo-500 text-white bg-indigo-950/20 font-bold'
                        : 'border-transparent text-slate-400 hover:text-slate-250'
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5 shrink-0" />
                    <span>Rooms</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className={`flex items-center gap-2 font-semibold text-xs uppercase tracking-wider py-3 px-4 border-b-2 transition-all cursor-pointer shrink-0 ${
                      activeTab === 'calendar'
                        ? 'border-indigo-500 text-white bg-indigo-950/20 font-bold'
                        : 'border-transparent text-slate-400 hover:text-slate-250'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>Calendar</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('ai')}
                    className={`flex items-center gap-2 font-semibold text-xs uppercase tracking-wider py-3 px-4 border-b-2 transition-all cursor-pointer shrink-0 ${
                      activeTab === 'ai'
                        ? 'border-indigo-500 text-white bg-indigo-950/20 font-bold'
                        : 'border-transparent text-slate-400 hover:text-slate-250'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-pulse" />
                    <span>AI Assistant</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className={`flex items-center gap-2 font-semibold text-xs uppercase tracking-wider py-3 px-4 border-b-2 transition-all cursor-pointer shrink-0 ${
                      activeTab === 'analytics'
                        ? 'border-indigo-500 text-white bg-indigo-950/20 font-bold'
                        : 'border-transparent text-slate-400 hover:text-slate-250'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-rose-450 shrink-0" />
                    <span>Analytics</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('drive')}
                    className={`flex items-center gap-2 font-semibold text-xs uppercase tracking-wider py-3 px-4 border-b-2 transition-all cursor-pointer shrink-0 ${
                      ['drive', 'gmail', 'chat', 'forms'].includes(activeTab)
                        ? 'border-indigo-500 text-white bg-indigo-950/20 font-bold'
                        : 'border-transparent text-slate-400 hover:text-slate-250'
                    }`}
                  >
                    <HardDrive className="w-3.5 h-3.5 text-emerald-450 shrink-0" />
                    <span>Workspace</span>
                  </button>
                  {user.role === 'admin' && (
                    <button
                      onClick={() => setActiveTab('admin')}
                      className={`flex items-center gap-2 font-semibold text-xs uppercase tracking-wider py-3 px-4 border-b-2 transition-all cursor-pointer shrink-0 ${
                        activeTab === 'admin'
                          ? 'border-rose-500 text-rose-200 bg-rose-950/20 font-bold'
                          : 'border-transparent text-slate-400 hover:text-rose-400'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>Admin</span>
                    </button>
                  )}
                </div>
              </div>

          {isIframe && !googleWorkspaceLinked && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-950/90 border border-amber-800/60 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-left relative overflow-hidden shadow-2xl mb-6"
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
            <div className="space-y-6">
              {['drive', 'gmail', 'chat', 'forms'].includes(activeTab) && (
                <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 w-full max-w-md mx-auto justify-stretch select-none shadow-lg mb-4">
                  <button
                    onClick={() => setActiveTab('drive')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === 'drive'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Drive</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('gmail')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === 'gmail'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Gmail</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === 'chat'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('forms')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === 'forms'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Forms</span>
                  </button>
                </div>
              )}

              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
              {/* ==========================================
                  TAB: ROOMS DIRECTORY
                  ========================================== */}
              {activeTab === 'rooms' && (
                <div className="space-y-6">
                  {/* Modern Welcoming Hero Banner */}
                  <div className="p-6 bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-900/40 rounded-3xl text-left relative overflow-hidden shadow-xl">
                    <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">IIT BHU Campus Scheduler 👋</span>
                        <h2 className="text-xl font-extrabold tracking-tight text-white">Need to book an academic space today?</h2>
                        <p className="text-xs text-slate-350 max-w-2xl leading-relaxed">
                          Welcome, <strong className="text-indigo-300">{user.name}</strong>. Browse live room statuses below. Click <strong className="text-indigo-300">"CHOOSE SLOT"</strong> to customize a schedule inside our interactive calendar, or click <strong className="text-indigo-300 font-bold">"QR Scanner"</strong> to check in instantly!
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          onClick={() => setActiveTab('calendar')}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Quick Book</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('ai')}
                          className="px-4 py-2.5 bg-slate-950/85 hover:bg-slate-900 text-indigo-400 hover:text-indigo-300 border border-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
                        >
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                          <span>AI Assistant</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Campus Bento metrics row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-left hover:border-indigo-500/25 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase font-mono tracking-widest">Available spaces</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <strong className="text-2xl font-black text-white">{rooms.filter(r => r.status === 'available').length}</strong>
                        <span className="text-xs text-slate-500 font-mono">/ {rooms.length} rooms</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-left hover:border-indigo-500/25 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase font-mono tracking-widest">Campus occupancy</span>
                        <div className="p-1 bg-indigo-950/40 rounded-lg text-[10px] text-indigo-400 font-mono">
                          {rooms.length ? Math.round((rooms.filter(r => r.status === 'booked').length / rooms.length) * 100) : 0}%
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <strong className="text-2xl font-black text-white">{rooms.filter(r => r.status === 'booked').length}</strong>
                        <span className="text-xs text-slate-500 font-mono">occupied now</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-left hover:border-indigo-500/25 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase font-mono tracking-widest">Today's Schedule</span>
                        <Calendar className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <strong className="text-2xl font-black text-white">{adminBookings.length}</strong>
                        <span className="text-xs text-slate-500 font-mono">active events</span>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-900/35 rounded-2xl text-left hover:border-indigo-400/40 transition-all shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-indigo-400 font-bold uppercase font-mono tracking-widest">My Reservations</span>
                        <Award className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <strong className="text-2xl font-black text-indigo-300">{userBookings.length}</strong>
                        <span className="text-xs text-indigo-450 font-mono">slots secured</span>
                      </div>
                    </div>
                  </div>

                  {/* My Active Bookings / Upcoming Agenda Ticket List */}
                  {userBookings.length > 0 && (
                    <div className="p-5 bg-indigo-950/15 border border-indigo-900/30 rounded-3xl text-left space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                            My Upcoming Academic Agenda
                          </h3>
                          <p className="text-[11px] text-indigo-400 font-medium">Quickly track details, download calendar attachments, or modify reservations.</p>
                        </div>
                        <span className="text-[10px] font-mono text-indigo-400/80 bg-indigo-950/80 px-2.5 py-1 rounded-xl border border-indigo-900/30 self-start sm:self-auto">
                          {userBookings.length} ACTIVE RESERVATIONS
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userBookings.map((b) => {
                          const startDate = new Date(b.start_time);
                          const endDate = new Date(b.end_time);
                          const isToday = startDate.toDateString() === new Date().toDateString();
                          const timeStr = `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                          return (
                            <div key={b.id} className="p-4 bg-slate-950/60 border border-indigo-900/20 hover:border-indigo-500/40 rounded-2xl flex flex-col justify-between gap-3.5 shadow-md hover:shadow-lg transition-all">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs bg-indigo-900/60 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded-lg border border-indigo-800/45 uppercase tracking-wider">
                                    {b.room_name}
                                  </span>
                                  <span className="text-[10px] text-indigo-400 font-mono font-black">
                                    {isToday ? 'TODAY' : startDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-white leading-snug tracking-tight">{b.summary}</h4>
                                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                                  <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  <span>{timeStr}</span>
                                </div>
                              </div>

                              <div className="pt-2.5 border-t border-slate-900/80 flex items-center justify-between gap-2">
                                <button
                                  onClick={() => handleAddToGoogleCalendar(b)}
                                  disabled={syncingBookingId === b.id}
                                  className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-550 disabled:opacity-50 text-[10px] font-extrabold text-white rounded-xl flex items-center justify-center gap-1.5 transition-all uppercase tracking-wider cursor-pointer shadow-sm"
                                >
                                  {syncingBookingId === b.id ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Syncing...</span>
                                    </>
                                  ) : (
                                    <>
                                      <CalendarPlus className="w-3.5 h-3.5 text-white" />
                                      <span>Sync to Google</span>
                                    </>
                                  )}
                                </button>
                                
                                <button
                                  onClick={() => {
                                    setConfirmModal({
                                      isOpen: true,
                                      title: 'Cancel Reservation Slot',
                                      message: `Are you sure you want to release the booking "${b.summary}" for "${b.room_name}"?\n\nThis will permanently cancel your scheduled academic slot.`,
                                      confirmText: 'Drop Booking',
                                      cancelText: 'Keep Booking',
                                      isDanger: true,
                                      requiredTextToConfirm: 'DECOMMISSION',
                                      onConfirm: async () => {
                                        try {
                                          await bookingsAPI.delete(b.id);
                                          addToast('Booking successfully cancelled.', 'success');
                                          fetchDashboardModels(user.role);
                                        } catch (err: any) {
                                          addToast(err.message, 'error');
                                        }
                                      }
                                    });
                                  }}
                                  className="p-2 bg-slate-900 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900/40 text-slate-400 hover:text-rose-400 rounded-xl transition-all cursor-pointer"
                                  title="Release booked slot"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4.5 bg-slate-900 rounded-2xl border border-slate-800 gap-4">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg font-bold tracking-tight">Active Room Directory</h2>
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-950/80 text-indigo-400 border border-indigo-900/60 transition-all select-none font-mono">
                          <Clock className={`w-3.5 h-3.5 ${isRefreshingRooms ? 'animate-spin text-emerald-400' : 'text-indigo-400'}`} />
                          {isRefreshingRooms ? 'SYNCING DATABASE...' : `AUTO-SYNC IN ${roomsRefreshCountdown}S`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5">
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

                  {/* Search and Advanced Filters Toggle */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-7 relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search rooms by name or equipment (e.g. Whiteboard, Projector)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition-all shadow-md text-left"
                      />
                    </div>
                    
                    <div className="md:col-span-3 relative">
                      <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400 pointer-events-none" />
                      <select
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-200 outline-none appearance-none cursor-pointer shadow-md text-left font-sans"
                      >
                        <option value="default">Sort: Default Featured</option>
                        <option value="available-first">Available First</option>
                        <option value="booked-first">Booked First</option>
                        <option value="capacity-asc">Capacity (Low to High)</option>
                        <option value="capacity-desc">Capacity (High to Low)</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <button
                        onClick={() => setShowFilters(prev => !prev)}
                        className={`w-full flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl border transition-all cursor-pointer shadow-md ${
                          showFilters 
                            ? 'bg-indigo-950/60 text-indigo-300 border-indigo-850' 
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span>Filters</span>
                        {(minCapacity > 0 || statusFilter !== 'all' || selectedFeatureToggles.length > 0) && (
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold">
                            {(minCapacity > 0 ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + selectedFeatureToggles.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Filter Controls */}
                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4 overflow-hidden"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Refining Filters</span>
                          </div>
                          {(minCapacity > 0 || statusFilter !== 'all' || selectedFeatureToggles.length > 0 || searchQuery.trim() !== '' || sortKey !== 'default') && (
                            <button
                              onClick={() => {
                                setMinCapacity(0);
                                setStatusFilter('all');
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

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 text-left">
                          <div className="space-y-2">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-mono">Minimum Capacity Seats</span>
                            <div className="flex flex-wrap gap-1.5">
                              {[0, 15, 30, 50, 100].map((cap) => {
                                const active = minCapacity === cap;
                                return (
                                  <button
                                    key={cap}
                                    onClick={() => setMinCapacity(cap)}
                                    className={`text-[10px] font-extrabold py-1 px-2.5 rounded-lg border transition-all cursor-pointer ${
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
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-mono">Room Status Availability</span>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { value: 'all', label: 'Include Booked' },
                                { value: 'available', label: 'Only Available' }
                              ].map((option) => {
                                const active = statusFilter === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    onClick={() => setStatusFilter(option.value as any)}
                                    className={`text-[10px] font-extrabold py-1 px-2.5 rounded-lg border transition-all cursor-pointer ${
                                      active ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                                    }`}
                                  >
                                    {option.label}
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
                                    className={`text-[10.5px] font-semibold py-1 px-2.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
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
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Directory View Toggler layout switcher */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl gap-3 text-left">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-950/80 rounded-xl border border-indigo-900/30 text-indigo-400">
                        {directoryViewMode === 'grid' ? (
                          <Grid className="w-4 h-4" />
                        ) : (
                          <Map className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Directory Layout</span>
                        <span className="text-xs font-black text-white">{directoryViewMode === 'grid' ? 'Grid Cards View' : 'Interactive CAD Floor Blueprint'}</span>
                      </div>
                    </div>
                    
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-stretch sm:self-auto justify-stretch">
                      <button
                        onClick={() => setDirectoryViewMode('grid')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold transition-all uppercase tracking-wider cursor-pointer ${
                          directoryViewMode === 'grid'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Grid className="w-3.5 h-3.5" />
                        <span>Grid View</span>
                      </button>
                      <button
                        onClick={() => setDirectoryViewMode('floorplan')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold transition-all uppercase tracking-wider cursor-pointer ${
                          directoryViewMode === 'floorplan'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Map className="w-3.5 h-3.5" />
                        <span>Floor Plan Map</span>
                      </button>
                    </div>
                  </div>

                  {/* Rooms Cards Grid / Floor Plan Mapping Conditional Branch */}
                  {directoryViewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8" id="directory-section">
                      {filteredRooms.map((room) => {
                        // Generate reliable ratings based on room capacity & features
                        const rating = room.capacity > 100 ? '4.9' : room.capacity > 30 ? '4.8' : '4.7';
                        const reviewCount = room.capacity > 100 ? '42 reviews' : room.capacity > 30 ? '28 reviews' : '15 reviews';
                        
                        return (
                          <div
                            key={room.id}
                            className="bg-white border border-[#ead29c]/40 rounded-3xl overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
                          >
                            <div>
                              {/* Luxury Image Area with dynamic status badges */}
                              <div className="relative h-56 overflow-hidden">
                                <img 
                                  src={room.image} 
                                  alt={room.name} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                                
                                {/* Live Availability Status Indicator */}
                                <div className="absolute top-4 left-4">
                                  <span className={`text-[10px] font-extrabold uppercase py-1.5 px-3 rounded-xl font-mono border flex items-center gap-1.5 shadow-md ${
                                    room.status === 'available' 
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60' 
                                      : 'bg-rose-50 text-rose-800 border-rose-200/60'
                                  }`}>
                                    <span className={`w-2 h-2 rounded-full ${
                                      room.status === 'available' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                                    }`} />
                                    {room.status === 'available' ? 'AVAILABLE' : 'OCCUPIED'}
                                  </span>
                                </div>

                                {/* Premium Star Rating badge */}
                                <div className="absolute top-4 right-4">
                                  <div className="bg-[#faf8f2]/95 backdrop-blur-sm border border-[#ead29c] rounded-xl px-2.5 py-1 flex items-center gap-1 shadow-md">
                                    <Star className="w-3.5 h-3.5 fill-[#c09728] text-[#c09728]" />
                                    <span className="text-[11px] font-extrabold text-[#0a4735] font-mono">{rating}</span>
                                    <span className="text-[9px] text-slate-500">({reviewCount})</span>
                                  </div>
                                </div>

                                {/* Room category overlay */}
                                <div className="absolute bottom-4 left-4 right-4 text-left">
                                  {room.category && (
                                    <span className="bg-[#dfb965] text-[#0a4735] text-[9.5px] font-extrabold uppercase py-0.5 px-2 rounded-lg border border-[#ead29c]/50 mb-1.5 inline-block tracking-wider font-mono">
                                      {room.category}
                                    </span>
                                  )}
                                  <h3 className="text-xl font-display font-extrabold text-white leading-tight drop-shadow-lg">
                                    {room.name}
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-x-3 mt-1.5 text-xs text-stone-200 font-sans">
                                    <span className="flex items-center gap-1">
                                      <Users className="w-3.5 h-3.5 text-[#dfb965]" /> 
                                      <strong>{room.capacity}</strong> standard capacity
                                    </span>
                                    {room.building && (
                                      <span className="flex items-center gap-1 border-l border-white/20 pl-3">
                                        <Building2 className="w-3.5 h-3.5 text-[#dfb965]" /> 
                                        {room.building}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Card Body Features & Details */}
                              <div className="p-6 space-y-4">
                                {room.bestFor && (
                                  <div className="space-y-1 text-xs text-left">
                                    <span className="block text-[9px] font-bold text-[#c09728] uppercase tracking-widest font-mono">Best suited for</span>
                                    <p className="text-slate-650 leading-relaxed font-serif font-light">{room.bestFor}</p>
                                  </div>
                                )}

                                {/* Amenity Tags with live icons */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {room.features.map((f, i) => {
                                    // Choose a premium icon based on amenity text
                                    const text = f.toLowerCase();
                                    let icon = <Compass className="w-3.5 h-3.5 text-[#0a4735]" />;
                                    if (text.includes('projector') || text.includes('display') || text.includes('screen')) {
                                      icon = <Tv className="w-3.5 h-3.5 text-[#0a4735]" />;
                                    } else if (text.includes('sound') || text.includes('audio') || text.includes('video') || text.includes('conferencing')) {
                                      icon = <Wifi className="w-3.5 h-3.5 text-[#c09728]" />;
                                    } else if (text.includes('ac') || text.includes('air conditioning') || text.includes('wind')) {
                                      icon = <Wind className="w-3.5 h-3.5 text-sky-650" />;
                                    } else if (text.includes('whiteboard') || text.includes('glass')) {
                                      icon = <BookOpen className="w-3.5 h-3.5 text-[#0a4735]" />;
                                    } else if (text.includes('ergonomic') || text.includes('seating') || text.includes('chairs')) {
                                      icon = <Accessibility className="w-3.5 h-3.5 text-[#0a4735]" />;
                                    }

                                    return (
                                      <span 
                                        key={i} 
                                        className="bg-[#faf8f2] text-[#0a4735] border border-[#ead29c]/30 py-1 px-2.5 rounded-xl text-[10.5px] font-bold flex items-center gap-1.5 shadow-sm hover:bg-[#faf8f2]/90"
                                      >
                                        {icon}
                                        <span>{f}</span>
                                      </span>
                                    );
                                  })}
                                </div>

                                {/* Active Reservations beautifully mapped */}
                                <div className="pt-4 border-t border-[#ead29c]/30 text-left">
                                  {(() => {
                                    const roomBookings = adminBookings.filter(b => 
                                      b.room_name?.toLowerCase().includes(room.name.toLowerCase()) || 
                                      room.name?.toLowerCase().includes(b.room_name?.toLowerCase())
                                    );

                                    return (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-bold text-[#0a4735] uppercase tracking-wider font-mono flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-[#c09728]" />
                                            Active Schedule
                                          </span>
                                          <button
                                            onClick={() => setSelectedRoomForHistory(room)}
                                            className="text-[10px] font-bold text-[#c09728] hover:text-[#0a4735] transition-all cursor-pointer underline underline-offset-2 decoration-[#ead29c]"
                                          >
                                            View History →
                                          </button>
                                        </div>

                                        {roomBookings.length === 0 ? (
                                          <p className="text-[10.5px] text-slate-450 italic pl-1">This space is completely vacant today. Book below!</p>
                                        ) : (
                                          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                                            {roomBookings.map((b) => {
                                              const startDate = new Date(b.start_time);
                                              const endDate = new Date(b.end_time);
                                              const isToday = startDate.toDateString() === new Date().toDateString();
                                              
                                              const dateStr = isToday 
                                                ? 'Today' 
                                                : startDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                              
                                              const timeStr = `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                                              return (
                                                <div 
                                                  key={b.id} 
                                                  className="p-2.5 bg-[#faf8f2] rounded-xl border border-[#ead29c]/25 text-left space-y-0.5 hover:border-[#dfb965] transition-all shadow-sm"
                                                >
                                                  <div className="flex items-center justify-between gap-2">
                                                    <span className="font-bold text-slate-800 text-[11px] truncate max-w-[150px]" title={b.summary}>
                                                      {b.summary}
                                                    </span>
                                                    <span className="text-[8.5px] bg-[#0a4735] text-white font-bold px-1.5 py-0.5 rounded-lg uppercase tracking-wider font-mono">
                                                      {dateStr}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center justify-between text-[9.5px] text-slate-500 font-mono">
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

                            {/* Card Footer actions bar */}
                            <div className="p-5 pt-4 border-t border-[#ead29c]/25 flex items-center justify-between gap-2.5 bg-[#faf8f2]/30 shrink-0">
                              <button
                                onClick={() => {
                                  setSelectedQRRoom(room);
                                  setScanComplete(false);
                                }}
                                className="px-3.5 py-2.5 bg-white hover:bg-[#faf8f2] border border-[#ead29c]/60 hover:border-[#dfb965] text-[#0a4735] rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                                title="Generate dynamic QR Access Code"
                              >
                                QR Access
                              </button>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setSelectedRoomForDetails(room)}
                                  className="px-3.5 py-2.5 bg-white hover:bg-[#faf8f2] border border-[#ead29c]/60 hover:border-[#dfb965] text-[#0a4735] rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  View Details
                                </button>

                                {room.status === 'available' ? (
                                  <button
                                    onClick={() => {
                                      setConfirmRoomSelection(room);
                                      setPreselectedRoomId(room.id);
                                    }}
                                    className="px-4.5 py-2.5 bg-[#0a4735] hover:bg-[#063325] text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer hover:-translate-y-0.5"
                                  >
                                    Book Now
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-not-allowed"
                                  >
                                    Occupied
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                  <FloorPlanView
                    rooms={rooms}
                    filteredRooms={filteredRooms}
                    adminBookings={adminBookings}
                    syncingBookingId={syncingBookingId}
                    onChooseSlot={(room) => {
                      setConfirmRoomSelection(room);
                      setPreselectedRoomId(room.id);
                    }}
                    onViewHistory={(room) => setSelectedRoomForHistory(room)}
                    onShowQR={(room) => {
                      setSelectedQRRoom(room);
                      setScanComplete(false);
                    }}
                    onAddToGoogleCalendar={handleAddToGoogleCalendar}
                  />
                )}
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
                      isLinking={isLinkingGoogle}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Card 1 */}
                    <div className={`p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg relative overflow-hidden flex flex-col justify-between h-36 ${
                      isDarkMode 
                        ? 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/55' 
                        : 'bg-white border-slate-200/80 shadow-sm hover:shadow-indigo-100/50 hover:border-indigo-400'
                    }`}>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex items-start justify-between">
                        <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>TOTAL BOOKINGS SECURED</span>
                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-indigo-950/60 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                          <Calendar className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-4 text-left">
                        <strong className={`text-3xl font-extrabold tracking-tight block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{analyticsStats?.totalBookings || adminBookings.length}</strong>
                        <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 mt-1">
                          <span>↑ 12.4%</span>
                          <span className={`font-normal ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>vs last week</span>
                        </span>
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className={`p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg relative overflow-hidden flex flex-col justify-between h-36 ${
                      isDarkMode 
                        ? 'bg-slate-900/60 border-slate-800 hover:border-violet-500/55' 
                        : 'bg-white border-slate-200/80 shadow-sm hover:shadow-violet-100/50 hover:border-violet-400'
                    }`}>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex items-start justify-between">
                        <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>TOTAL ACADEMIC USERS</span>
                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-violet-950/60 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>
                          <Users className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-4 text-left">
                        <strong className={`text-3xl font-extrabold tracking-tight block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{analyticsStats?.totalUsers || adminUsers.length || 3}</strong>
                        <span className="text-[10px] text-emerald-505 font-semibold flex items-center gap-1 mt-1">
                          <span>Active nodes</span>
                          <span className={`font-normal ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>synchronized</span>
                        </span>
                      </div>
                    </div>

                    {/* Card 3 */}
                    <div className={`p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg relative overflow-hidden flex flex-col justify-between h-36 ${
                      isDarkMode 
                        ? 'bg-slate-900/60 border-slate-800 hover:border-amber-500/55' 
                        : 'bg-white border-slate-200/80 shadow-sm hover:shadow-amber-100/50 hover:border-amber-400'
                    }`}>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex items-start justify-between">
                        <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>ALLOCATED HOURS</span>
                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-amber-950/60 text-amber-400' : 'bg-amber-50 text-amber-650'}`}>
                          <Clock className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-4 text-left">
                        <strong className={`text-3xl font-extrabold tracking-tight block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{analyticsStats?.totalAssignedHours || 0} Hours</strong>
                        <span className="text-[10px] text-indigo-405 font-semibold flex items-center gap-1 mt-1">
                          <span>Weekly block</span>
                          <span className={`font-normal ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>utilization</span>
                        </span>
                      </div>
                    </div>

                    {/* Card 4 */}
                    <div className={`p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg relative overflow-hidden flex flex-col justify-between h-36 ${
                      isDarkMode 
                        ? 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/55' 
                        : 'bg-white border-slate-200/80 shadow-sm hover:shadow-emerald-100/50 hover:border-emerald-400'
                    }`}>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex items-start justify-between">
                        <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>SEAT DENSITY INDEX</span>
                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-950/60 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                          <Activity className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-4 text-left">
                        <strong className={`text-3xl font-extrabold tracking-tight block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>94.2%</strong>
                        <span className="text-[10px] text-emerald-505 font-semibold flex items-center gap-1 mt-1">
                          <span>Optimal load</span>
                          <span className={`font-normal ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>registered</span>
                        </span>
                      </div>
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
                      <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          {adminRoomTab === 'single' ? (
                            <>
                              <Plus className="w-5 h-5 text-indigo-400" />
                              De novo Room Creation
                            </>
                          ) : (
                            <>
                              <Upload className="w-5 h-5 text-indigo-400" />
                              Bulk Room CSV Import
                            </>
                          )}
                        </h3>
                        <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0">
                          <button
                            type="button"
                            onClick={() => setAdminRoomTab('single')}
                            className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                              adminRoomTab === 'single'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Single
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdminRoomTab('bulk')}
                            className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                              adminRoomTab === 'bulk'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Bulk (CSV)
                          </button>
                        </div>
                      </div>

                      {adminRoomTab === 'single' ? (
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
                      ) : (
                        <div className="space-y-4 text-left font-sans">
                          <div className="p-3 bg-indigo-950/20 text-indigo-300 rounded-xl border border-indigo-900/35 text-xs flex flex-col gap-1.5">
                            <span className="font-semibold text-indigo-200">CSV Column Formatting Guide:</span>
                            <span className="font-mono text-[10px] bg-slate-950 p-1.5 rounded border border-slate-900 overflow-x-auto select-all block">
                              name,capacity,features,image,color
                            </span>
                            <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-indigo-900/20">
                              <span className="text-[10px] text-slate-400">Features separation: Semicolon (;) or Comma (,)</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const demoText = `name,capacity,features,image,color\n"Homi Bhabha Lecture Lounge",55,"Laser Projector;Acoustic Soundproofing;Wi-Fi",https://images.unsplash.com/photo-1517502884422-41eaaced0168?w=800,from-violet-600 to-indigo-805\n"Vikram Sarabhai Lab Space",24,"High-Speed Fiber Ethernet;Smart Cooling",,from-teal-600 to-emerald-805\n"Harish-Chandra Seminar Studio",40,"Dual Glass Whiteboards;Ergonomic Seating",,from-amber-600 to-orange-805`;
                                  setCsvText(demoText);
                                  handleParseCsv(demoText);
                                  addToast('Sample academic room spaces pre-filled!', 'success');
                                }}
                                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline font-mono flex items-center gap-0.5 cursor-pointer"
                              >
                                ⚡ Load Live Demo CSV
                              </button>
                            </div>
                          </div>

                          {/* Interactive Dropzone block */}
                          <div
                            onDragEnter={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragActive(true);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragActive(true);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragActive(false);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragActive(false);
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                const file = e.dataTransfer.files[0];
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const text = event.target?.result as string;
                                  setCsvText(text);
                                  handleParseCsv(text);
                                };
                                reader.readAsText(file);
                              }
                            }}
                            className={`p-5 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer relative ${
                              dragActive 
                                ? 'border-indigo-500 bg-indigo-500/5' 
                                : 'border-slate-800 bg-slate-950 hover:border-slate-750'
                            }`}
                          >
                            <input
                              type="file"
                              id="csv-file-upload-input"
                              accept=".csv,text/csv"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const text = event.target?.result as string;
                                    setCsvText(text);
                                    handleParseCsv(text);
                                  };
                                  reader.readAsText(file);
                                }
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400">
                              <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-semibold text-slate-300">Drag & Drop room .csv file here</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">or click inside local explorer to select</p>
                            </div>
                          </div>

                          {/* Paste Textarea alternative */}
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
                              Or Paste raw CSV rows:
                            </label>
                            <textarea
                              rows={4}
                              value={csvText}
                              onChange={(e) => {
                                setCsvText(e.target.value);
                                handleParseCsv(e.target.value);
                              }}
                              placeholder='e.g. "Space A",40,"Whiteboard, Projector"\n"Space B",15,"Wi-Fi"'
                              className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-indigo-500 font-mono"
                            />
                          </div>

                          {/* Real-time parsing Errors feedback */}
                          {csvErrors.length > 0 && (
                            <div className="p-3 bg-amber-950/20 border border-amber-900/30 text-amber-500 rounded-xl text-xs space-y-1">
                              <strong className="font-semibold block text-amber-400">CSV Parsing validation warnings:</strong>
                              <ul className="list-disc pl-4 space-y-0.5 text-[11px] max-h-[100px] overflow-y-auto">
                                {csvErrors.map((err, i) => (
                                  <li key={i}>{err}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Real-time parsed items Preview */}
                          {parsedRooms.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                                  Parsed Inventory Preview ({parsedRooms.length} room spaces)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCsvText('');
                                    setParsedRooms([]);
                                    setCsvErrors([]);
                                  }}
                                  className="text-[10px] font-semibold text-rose-400 hover:text-rose-350 font-mono transition-colors"
                                >
                                  Clear Preview
                                </button>
                              </div>

                              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                                {parsedRooms.map((room, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg flex items-center justify-between text-xs transition-all hover:border-slate-800"
                                  >
                                    <div className="text-left space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`w-24 h-1.5 rounded-full bg-gradient-to-tr ${room.color}`} style={{ width: '12px', height: '12px' }} />
                                        <strong className="text-slate-200">{room.name}</strong>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {room.features.slice(0, 3).map((feat: string, fidx: number) => (
                                          <span key={fidx} className="px-1.5 py-0.5 bg-slate-900 border border-slate-850 rounded text-[9px] text-slate-400">
                                            {feat}
                                          </span>
                                        ))}
                                        {room.features.length > 3 && (
                                          <span className="text-[9px] text-slate-550 self-center">
                                            +{room.features.length - 3} more
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="px-2 py-0.5 bg-indigo-950 border border-indigo-900/40 text-indigo-300 rounded text-[10px] font-mono font-bold shrink-0">
                                      Cap: {room.capacity}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={handleAdminBulkImportRooms}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-3 rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 transition-colors mt-2 cursor-pointer"
                              >
                                <Upload className="w-4 h-4" />
                                Import {parsedRooms.length} Spaces into Database
                              </button>
                            </div>
                          )}
                        </div>
                      )}
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
                                  requiredTextToConfirm: 'DECOMMISSION',
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
                    isLinking={isLinkingGoogle}
                  />
                ) : (
                  <DriveWidget receiptLogs={sessionReceipts} addToast={addToast} />
                )
              )}

              {activeTab === 'gmail' && (
                !googleWorkspaceLinked ? (
                  <WorkspaceGate
                    activeTab="gmail"
                    isIframe={isIframe}
                    onLink={linkGoogleWorkspaceAccount}
                    onBypass={bypassGoogleWorkspaceAuthSimulated}
                    isLinking={isLinkingGoogle}
                  />
                ) : (
                  <GmailWidget 
                    userEmail={user.email} 
                    gmailLog={gmailLog}
                    setGmailLog={setGmailLog}
                    addToast={addToast}
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
                    isLinking={isLinkingGoogle}
                  />
                ) : (
                  <ChatWidget 
                    chatLog={chatLog}
                    setChatLog={setChatLog}
                    addToast={addToast}
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
                    isLinking={isLinkingGoogle}
                  />
                ) : (
                  <FormsWidget />
                )
              )}

            </motion.div>
            </div>
          </AnimatePresence>

            </div> {/* Closing right-hand col-span-9 from sidebar grid */}
          </div> {/* Closing lg:grid lg:grid-cols-12 from sidebar grid */}
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

                                  <div className="pt-2 border-t border-slate-900/60 flex justify-end">
                                    <button
                                      onClick={() => handleAddToGoogleCalendar(b)}
                                      disabled={syncingBookingId === b.id}
                                      className="py-1 px-3 bg-indigo-650/40 hover:bg-indigo-600/70 text-slate-200 text-[10px] font-extrabold uppercase tracking-wider rounded-lg border border-indigo-500/25 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                      {syncingBookingId === b.id ? (
                                        <>
                                          <Loader2 className="w-3 h-3 animate-spin text-indigo-300" />
                                          <span>Syncing...</span>
                                        </>
                                      ) : (
                                        <>
                                          <CalendarPlus className="w-3 h-3 text-indigo-400" />
                                          <span>Add to Google Calendar</span>
                                        </>
                                      )}
                                    </button>
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

      {/* PREMIUM DETAILED ROOM INFO DRAWER */}
      <AnimatePresence>
        {selectedRoomForDetails && (
          <>
            {/* Dark blur backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRoomForDetails(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 cursor-pointer"
            />

            {/* Slide-out drawer panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:max-w-md bg-white border-l border-[#ead29c]/50 shadow-2xl z-50 flex flex-col h-full text-[#0a4735] overflow-hidden text-left"
            >
              {/* Cover Image Header */}
              <div className="relative h-56 shrink-0 bg-stone-100">
                <img 
                  src={selectedRoomForDetails.image} 
                  alt={selectedRoomForDetails.name} 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a4735] via-[#0a4735]/40 to-transparent" />
                
                {/* Close Button overlay */}
                <button
                  onClick={() => setSelectedRoomForDetails(null)}
                  className="absolute top-4 right-4 p-2 bg-black/55 hover:bg-black/75 text-white rounded-full transition-all cursor-pointer backdrop-blur-sm flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="absolute bottom-4 left-6 right-6 text-left">
                  {selectedRoomForDetails.category && (
                    <span className="bg-[#dfb965] text-[#0a4735] text-[9px] font-extrabold uppercase py-0.5 px-2 rounded-lg border border-[#ead29c]/50 mb-1.5 inline-block tracking-wider font-mono">
                      {selectedRoomForDetails.category}
                    </span>
                  )}
                  <h3 className="text-2xl font-display font-extrabold text-white drop-shadow-md leading-tight">
                    {selectedRoomForDetails.name}
                  </h3>
                </div>
              </div>

              {/* Scrollable details */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Live Status indicator banner */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm ${
                  selectedRoomForDetails.status === 'available' 
                    ? 'bg-emerald-50/70 border-emerald-200/60 text-emerald-800' 
                    : 'bg-rose-50/70 border-rose-200/60 text-rose-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      selectedRoomForDetails.status === 'available' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`} />
                    <span className="text-xs font-mono font-extrabold uppercase tracking-wider">
                      {selectedRoomForDetails.status === 'available' ? 'SPACE IS VACANT' : 'SPACE IS RESERVED'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">Real-time status</span>
                </div>

                {/* Core Specifications */}
                <div className="bg-[#faf8f2] border border-[#ead29c]/30 rounded-2xl p-4.5 space-y-3.5">
                  <h4 className="text-[10px] font-extrabold text-[#c09728] uppercase tracking-widest font-mono">
                    Core Specifications
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 text-left">
                      <span className="text-[10.5px] text-slate-400 block font-semibold uppercase tracking-wider">Seating Capacity</span>
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                        <Users className="w-4 h-4 text-[#0a4735]" />
                        <span>{selectedRoomForDetails.capacity} Seats</span>
                      </div>
                    </div>
                    <div className="space-y-1 text-left">
                      <span className="text-[10.5px] text-slate-400 block font-semibold uppercase tracking-wider">Campus Venue</span>
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                        <Building2 className="w-4 h-4 text-[#0a4735]" />
                        <span className="truncate">{selectedRoomForDetails.building || 'IIT (BHU)'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* suitables for description */}
                {selectedRoomForDetails.bestFor && (
                  <div className="space-y-2 text-left">
                    <h4 className="text-[10px] font-extrabold text-[#c09728] uppercase tracking-widest font-mono">
                      Academic Suitability
                    </h4>
                    <p className="text-slate-650 text-xs leading-relaxed font-serif font-light">
                      {selectedRoomForDetails.bestFor}
                    </p>
                  </div>
                )}

                {/* Features & Amenities */}
                <div className="space-y-3 text-left">
                  <h4 className="text-[10px] font-extrabold text-[#c09728] uppercase tracking-widest font-mono">
                    Available Technology & Amenities
                  </h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    {selectedRoomForDetails.features.map((feature, idx) => {
                      // Dynamic Icon Matching
                      const text = feature.toLowerCase();
                      let icon = <Compass className="w-4 h-4 text-[#0a4735]" />;
                      let featureDesc = "Fully integrated & certified for academic applications.";
                      
                      if (text.includes('projector') || text.includes('display') || text.includes('screen')) {
                        icon = <Tv className="w-4 h-4 text-[#0a4735]" />;
                        featureDesc = "Ultra-high-definition presentation output.";
                      } else if (text.includes('sound') || text.includes('audio') || text.includes('video') || text.includes('conferencing')) {
                        icon = <Wifi className="w-4 h-4 text-[#c09728]" />;
                        featureDesc = "Optimized for hybrid lectures & remote participants.";
                      } else if (text.includes('ac') || text.includes('air conditioning') || text.includes('wind')) {
                        icon = <Wind className="w-4 h-4 text-sky-650" />;
                        featureDesc = "Temperature-controlled climate feedback.";
                      } else if (text.includes('whiteboard') || text.includes('glass')) {
                        icon = <BookOpen className="w-4 h-4 text-[#0a4735]" />;
                        featureDesc = "Writable surfaces for diagramming.";
                      } else if (text.includes('ergonomic') || text.includes('seating') || text.includes('chairs')) {
                        icon = <Accessibility className="w-4 h-4 text-[#0a4735]" />;
                        featureDesc = "Comfortable seating for extended seminars.";
                      }

                      return (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-[#faf8f2]/40 border border-[#ead29c]/20 rounded-xl">
                          <div className="p-2 bg-white rounded-lg border border-[#ead29c]/45 shrink-0 shadow-sm">
                            {icon}
                          </div>
                          <div className="space-y-0.5 text-left">
                            <span className="text-xs font-bold text-slate-800 block">{feature}</span>
                            <span className="text-[10.5px] text-slate-500 block leading-tight">{featureDesc}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Booking contact and department */}
                {selectedRoomForDetails.contactDepartment && (
                  <div className="p-4 bg-stone-50 border border-stone-200/65 rounded-2xl text-left space-y-1">
                    <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest font-mono">
                      Administrative Custodian
                    </span>
                    <div className="text-xs text-slate-700">
                      Primary contact: <strong className="text-[#0a4735] font-extrabold">{selectedRoomForDetails.contactDepartment}</strong>
                    </div>
                    <p className="text-[10px] text-slate-450">
                      Subject to booking criteria of the coordinating department.
                    </p>
                  </div>
                )}
              </div>

              {/* Action footer */}
              <div className="p-6 bg-[#faf8f2]/60 border-t border-[#ead29c]/30 shrink-0 flex items-center gap-3">
                <button
                  onClick={() => setSelectedRoomForDetails(null)}
                  className="flex-1 py-3 bg-white hover:bg-[#faf8f2] border border-[#ead29c] text-[#0a4735] font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm text-center font-display"
                >
                  Close Details
                </button>
                {selectedRoomForDetails.status === 'available' ? (
                  <button
                    onClick={() => {
                      setConfirmRoomSelection(selectedRoomForDetails);
                      setPreselectedRoomId(selectedRoomForDetails.id);
                      setSelectedRoomForDetails(null);
                      setActiveTab('calendar');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-1 py-3 bg-[#0a4735] hover:bg-[#063325] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md text-center font-display"
                  >
                    Reserve Now
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedRoomForHistory(selectedRoomForDetails);
                      setSelectedRoomForDetails(null);
                    }}
                    className="flex-1 py-3 bg-[#dfb965] hover:bg-[#d4af37] text-[#0a4735] font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md text-center font-display"
                  >
                    View Schedule
                  </button>
                )}
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
              {confirmModal.requiredTextToConfirm && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                    Accidental Deletion Safeguard: Type "{confirmModal.requiredTextToConfirm}" to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmInputText}
                    onChange={(e) => setConfirmInputText(e.target.value)}
                    placeholder={`Type ${confirmModal.requiredTextToConfirm}`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
              )}
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
                  disabled={confirmModal.requiredTextToConfirm ? confirmInputText !== confirmModal.requiredTextToConfirm : false}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none text-white shadow-lg ${
                    confirmModal.requiredTextToConfirm && confirmInputText !== confirmModal.requiredTextToConfirm
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                      : confirmModal.isDanger 
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
