import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './auth/useAuth';
import { Room } from './types';
import {
  authAPI,
  roomsAPI,
  bookingsAPI,
  adminAPI,
  notificationsAPI,
  auditAPI,
  setSessionToken,
  getSessionToken
} from './lib/api';
import { collection, onSnapshot, getDocs, query, limit } from 'firebase/firestore';
import { db } from './firebase/firebase';

// Components
import { CalendarAPI } from './lib/workspace';
import { LoginView } from './components/LoginView';
import { ConfirmModal } from './components/ConfirmModal';
import { DashboardView } from './components/DashboardView';
import { LandingPage } from './components/LandingPage';
import { NotificationFeed } from './components/NotificationFeed';
import { calculateRoomStatus } from './utils/roomStatus';

// Code-split heavy views to optimize initial bundle size
const CalendarWidget = React.lazy(() => import('./components/CalendarWidget'));
const AdminPanel = React.lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const RoomsDirectoryView = React.lazy(() => import('./components/RoomsDirectoryView').then(m => ({ default: m.RoomsDirectoryView })));
const UserProfileView = React.lazy(() => import('./components/UserProfileView').then(m => ({ default: m.UserProfileView })));
const DigitalDisplayView = React.lazy(() => import('./components/DigitalDisplayView').then(m => ({ default: m.DigitalDisplayView })));
const SmartAIRoomAssistant = React.lazy(() => import('./components/SmartAIRoomAssistant').then(m => ({ default: m.SmartAIRoomAssistant })));
const ReportExportModal = React.lazy(() => import('./components/ReportExportModal').then(m => ({ default: m.ReportExportModal })));
const ActivityHistoryDrawer = React.lazy(() => import('./components/ActivityHistoryDrawer').then(m => ({ default: m.ActivityHistoryDrawer })));
const RoomDetailsDrawer = React.lazy(() => import('./components/RoomDetailsDrawer').then(m => ({ default: m.RoomDetailsDrawer })));
const OnboardingTour = React.lazy(() => import('./components/OnboardingTour').then(m => ({ default: m.OnboardingTour })));
const HelpSupportModal = React.lazy(() => import('./components/HelpSupportModal').then(m => ({ default: m.HelpSupportModal })));

const ModuleLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center p-12 min-h-[300px] w-full">
    <div className="w-9 h-9 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-3" />
    <span className="text-xs font-semibold text-slate-400 font-mono tracking-wider uppercase">Loading Workspace Module...</span>
  </div>
);

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
  LayoutDashboard,
  User,
  SlidersHorizontal,
  Filter,
  Check,
  RotateCcw,
  Building2,
  Tv,
  Search,
  Download,
  ArrowUpDown,
  Lock,
  Shield,
  AlertTriangle,
  Bell,
  Sun,
  Moon,
  X,
  Loader2,
  Menu,
  ChevronRight,
  Phone,
  HelpCircle,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { user: authUser, loading: authLoading, signIn, signUp, signInWithGoogle, logout: centralLogout, refreshUser } = useAuth();

  // Startup Firebase connection health check states
  const [checkingFirebase, setCheckingFirebase] = useState(true);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // DB & Auth states
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Startup Health Check to verify Firebase connection and configuration
  useEffect(() => {
    let active = true;
    const checkFirebase = async () => {
      try {
        if (!db) {
          throw new Error("Firestore DB object is undefined. Please ensure your Firebase config in firebase-applet-config.json is valid.");
        }
        // Query rooms with a limit of 1 to verify the connection is active and the database exists
        const roomsCol = collection(db, 'rooms');
        await getDocs(query(roomsCol, limit(1)));
        if (active) {
          setCheckingFirebase(false);
        }
      } catch (err: any) {
        console.error("Firebase connection health check failed:", err);
        const msg = err.message || String(err);
        let userFriendlyMsg = msg;
        if (msg.includes("Database '(default)' not found")) {
          userFriendlyMsg = "The Firestore database '(default)' was not found or is currently being provisioned. Please check your Firebase Console and ensure Firestore is enabled.";
        } else if (msg.includes("permission-denied") || msg.includes("Missing or insufficient permissions")) {
          // If we got permission-denied, that actually means we successfully connected to Firestore!
          // The database exists and rejected the read, which is correct since security rules protect it.
          if (active) {
            setCheckingFirebase(false);
          }
          return;
        } else if (msg.includes("offline") || msg.includes("unavailable") || msg.includes("Failed to get document")) {
          userFriendlyMsg = "Unable to connect to Firestore. Please check your internet connection or try again later.";
        }
        if (active) {
          setFirebaseError(userFriendlyMsg);
          setCheckingFirebase(false);
        }
      }
    };
    checkFirebase();
    return () => {
      active = false;
    };
  }, []);


  useEffect(() => {
    if (!authLoading) {
      if (authUser) {
        const u = {
          name: authUser.fullName,
          fullName: authUser.fullName,
          email: authUser.email,
          role: authUser.role === 'admin' ? 'admin' : 'user',
          uid: authUser.uid,
          profilePhoto: authUser.profilePhoto
        };
        setUser(u);
        const storedToken = getSessionToken();
        setToken(storedToken);
        setNeedsAuth(false);
        // Safely trigger initial model fetch
        try {
          fetchDashboardModels(u.role);
        } catch (e) {
          console.warn('Deferred dashboard models fetch on mount.');
        }
      } else {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    }
  }, [authUser, authLoading]);

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
  const [loginEmail, setLoginEmail] = useState(() => localStorage.getItem('rememberedEmail') || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerRole, setRegisterRole] = useState<'user' | 'admin'>('user');

  const [isIframe, setIsIframe] = useState(false);

  // Transition redirect state
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const [lastAuthUser, setLastAuthUser] = useState<any>(null);

  useEffect(() => {
    if (authUser && !lastAuthUser) {
      setShowWelcomeOverlay(true);
      const timer = setTimeout(() => {
        setShowWelcomeOverlay(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
    setLastAuthUser(authUser);
  }, [authUser, lastAuthUser]);

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
  const [activeTab, setActiveTab] = useState<'landing' | 'dashboard' | 'rooms' | 'calendar' | 'profile' | 'admin' | 'kiosk'>('dashboard');
  const [showAssistantModal, setShowAssistantModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showOnboardingTour, setShowOnboardingTour] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Auto-trigger Onboarding Tour for first-time users
  useEffect(() => {
    if (user && !needsAuth) {
      const hasCompleted = localStorage.getItem('iitbhu_has_completed_tour');
      if (hasCompleted !== 'true') {
        setShowOnboardingTour(true);
      }
    }
  }, [user, needsAuth]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [compareRooms, setCompareRooms] = useState<Room[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  const toggleRole = async () => {
    if (!user) return;
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    setUser((prev: any) => prev ? { ...prev, role: newRole } : null);
    addToast(`Switched view to ${newRole === 'admin' ? 'Platform Admin' : 'Academic Member'}!`, 'success');
    if (activeTab === 'admin' && newRole !== 'admin') {
      setActiveTab('dashboard');
    }
    try {
      await fetchDashboardModels(newRole);
    } catch (e) {
      console.warn('Deferred dashboard models fetch on toggle.');
    }
  };

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
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'available'>('all');
  const [selectedFeatureToggles, setSelectedFeatureToggles] = useState<string[]>([]);
  
  const uniqueBuildings = useMemo(() => {
    const buildingsSet = new Set<string>();
    rooms.forEach((room) => {
      if (room.building) buildingsSet.add(room.building);
    });
    return Array.from(buildingsSet);
  }, [rooms]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const [srAnnouncement, setSrAnnouncement] = useState<string>('');
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  interface SuggestionItem {
    id: string;
    type: 'building' | 'category' | 'room';
    text: string;
    subtext: string;
    value: string;
  }

  const highlightMatch = (text: string, query: string, isSelected: boolean) => {
    if (!query.trim()) return <span>{text}</span>;
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => {
          const isMatch = part.toLowerCase() === query.toLowerCase();
          if (isMatch) {
            return (
              <span
                key={i}
                className={`font-black tracking-wide ${
                  isSelected
                    ? (isDarkMode ? 'text-white underline decoration-white/40 underline-offset-2' : 'text-indigo-950')
                    : (isDarkMode ? 'text-indigo-400' : 'text-indigo-600')
                }`}
              >
                {part}
              </span>
            );
          }
          return (
            <span key={i} className="font-normal opacity-90">
              {part}
            </span>
          );
        })}
      </>
    );
  };

  const autocompleteSuggestions = useMemo<SuggestionItem[]>(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    
    const suggestedBuildings = new Set<string>();
    const suggestedCategories = new Set<string>();
    const suggestedRooms: Room[] = [];
    
    for (const r of rooms) {
      if (r.building && r.building.toLowerCase().includes(query)) {
        suggestedBuildings.add(r.building);
      }
      if (r.category && r.category.toLowerCase().includes(query)) {
        suggestedCategories.add(r.category);
      }
      if (r.name.toLowerCase().includes(query)) {
        suggestedRooms.push(r);
      }
    }
    
    const items: SuggestionItem[] = [];
    
    // Add Building suggestions
    Array.from(suggestedBuildings).slice(0, 3).forEach(b => {
      items.push({
        id: `building-${b}`,
        type: 'building',
        text: b,
        subtext: 'Search rooms in this building',
        value: b
      });
    });
    
    // Add Category suggestions
    Array.from(suggestedCategories).slice(0, 3).forEach(c => {
      items.push({
        id: `category-${c}`,
        type: 'category',
        text: c,
        subtext: 'Search rooms of this category',
        value: c
      });
    });
    
    // Add Room suggestions
    suggestedRooms.slice(0, 4).forEach(r => {
      items.push({
        id: `room-${r.id}`,
        type: 'room',
        text: r.name,
        subtext: r.building ? `${r.building} • Floor: ${r.floor || 'N/A'}` : 'Specific room space',
        value: r.name
      });
    });
    
    return items.slice(0, 8);
  }, [rooms, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (showSuggestions && activeSuggestionIndex >= 0 && activeSuggestionIndex < autocompleteSuggestions.length) {
      const activeItem = autocompleteSuggestions[activeSuggestionIndex];
      setSrAnnouncement(`Suggestion ${activeSuggestionIndex + 1} of ${autocompleteSuggestions.length}: ${activeItem.text}, ${activeItem.subtext} (${activeItem.type})`);
    } else if (showSuggestions && autocompleteSuggestions.length > 0) {
      setSrAnnouncement(`${autocompleteSuggestions.length} suggestions found. Use up and down arrows to navigate, or escape to close.`);
    } else if (showSuggestions && searchQuery.trim() !== '') {
      setSrAnnouncement('No suggestions found.');
    } else {
      setSrAnnouncement('');
    }
  }, [activeSuggestionIndex, autocompleteSuggestions, showSuggestions, searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (autocompleteSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => 
        prev < autocompleteSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => 
        prev > 0 ? prev - 1 : autocompleteSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < autocompleteSuggestions.length) {
        e.preventDefault();
        const selected = autocompleteSuggestions[activeSuggestionIndex];
        setSearchQuery(selected.value);
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const [sortKey, setSortKey] = useState<'default' | 'capacity-asc' | 'capacity-desc' | 'available-first' | 'booked-first'>('default');
  const [directoryViewMode, setDirectoryViewMode] = useState<'grid' | 'floorplan'>('grid');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Loading resources state
  const [loadingResources, setLoadingResources] = useState<boolean>(true);

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

  // Action feedback Toast state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' | 'error' }[]>([]);

  const [selectedRoomForHistory, setSelectedRoomForHistory] = useState<Room | null>(null);
  const [selectedRoomForDetails, setSelectedRoomForDetails] = useState<Room | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyPeriodFilter, setHistoryPeriodFilter] = useState<'all' | 'odd-25' | 'even-26' | 'summer-26' | 'ay-26-27' | 'custom'>('all');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  // Admin section lists
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminBookings, setAdminBookings] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

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

  // Sync dark mode style on document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Sync state with local storage tokens on load
  useEffect(() => {
    async function checkSession() {
      const storedToken = getSessionToken();
      if (storedToken) {
        setToken(storedToken);
        try {
          const meResponse = await authAPI.getMe();
          if (meResponse && meResponse.user) {
            setUser(meResponse.user);
            setNeedsAuth(false);
          }
        } catch (err) {
          console.warn('Eager local session load deferred to AuthProvider.', err);
        }
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



  // Register centralized status listeners
  useEffect(() => {
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

    window.addEventListener('iitbhu_sync_status', handleSyncStatus);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);

    return () => {
      window.removeEventListener('iitbhu_sync_status', handleSyncStatus);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
    };
  }, []);

  const fetchDashboardModels = async (role: string) => {
    setLoadingResources(true);
    try {
      // 1. Fetch live rooms
      try {
        const list = await roomsAPI.list();
        setRooms(Array.isArray(list) ? list : []);
      } catch (err: any) {
        console.error('Failed loading rooms list:', err);
        addToast(`Failed loading rooms: ${err.message || err}`, 'error');
      }

      // 2. Fetch live bookings
      try {
        const bookings = await bookingsAPI.list();
        setAdminBookings(Array.isArray(bookings) ? bookings : []);
      } catch (err: any) {
        console.error('Failed loading bookings list:', err);
        addToast(`Failed loading bookings: ${err.message || err}`, 'error');
      }

      // 4. Fetch admin users state
      if (role === 'admin') {
        try {
          const uList = await adminAPI.listUsers();
          setAdminUsers(Array.isArray(uList) ? uList : []);
        } catch (err: any) {
          console.error('Failed loading admin users list:', err);
          addToast(`Failed loading users: ${err.message || err}`, 'error');
        }

        try {
          const logs = await auditAPI.listLogs();
          setAuditLogs(Array.isArray(logs) ? logs : []);
        } catch (err: any) {
          console.warn('Could not populate audit logs:', err);
        }
      }

      // 5. Fetch live notifications
      try {
        const notifList = await notificationsAPI.list();
        setNotifications(Array.isArray(notifList) ? notifList : []);
      } catch (ne: any) {
        console.warn('Could not populate live notifications:', ne);
      }

    } catch (err: any) {
      console.error('Failed loading resources general error:', err);
    } finally {
      setLoadingResources(false);
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => (Array.isArray(prev) ? prev : []).map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.warn('Failed marking notifications read:', err);
    }
  };

  // Realtime Firestore Subscription to keep lists synchronized instantly
  useEffect(() => {
    if (!token || !user) return;

    console.info('⚡ Establishing live Firestore Realtime subscriptions...');

    // 1. Subscribe to Bookings Table
    const unsubscribeBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      console.info('🔔 Realtime Bookings Update witnessed via Firestore');
      fetchDashboardModels(user.role);

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          // Avoid triggering toast on initial load by checking if the metadata has pending writes
          const b = change.doc.data();
          if (!snapshot.metadata.hasPendingWrites) {
            // Toast can be displayed if a user added a room/booking recently
          }
        }
      });
    }, (error) => {
      console.warn('Firestore bookings snapshot subscription failed:', error);
    });

    // 2. Subscribe to Rooms Table
    const unsubscribeRooms = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      console.info('🔔 Realtime Rooms Update witnessed via Firestore');
      fetchDashboardModels(user.role);
    }, (error) => {
      console.warn('Firestore rooms snapshot subscription failed:', error);
    });

    // 3. Subscribe to Notifications Table
    const unsubscribeNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      console.info('🔔 Realtime Notifications Update witnessed via Firestore');
      notificationsAPI.list()
        .then((list) => setNotifications(Array.isArray(list) ? list : []))
        .catch(() => {});
    }, (error) => {
      console.warn('Firestore notifications snapshot subscription failed:', error);
    });

    return () => {
      console.info('⚡ Cleaned up live Firestore Realtime subscriptions.');
      unsubscribeBookings();
      unsubscribeRooms();
      unsubscribeNotifications();
    };
  }, [token, user?.role]);

  // ==========================================
  // SIGN IN & REGISTRATION CONTROLLERS
  // ==========================================


  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const result = await signIn(loginEmail, loginPassword, true);
      addToast(`Access granted! Welcome, ${result.userProfile.fullName}.`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Incorrect login coordinates.', 'error');
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCredentialsRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const mappedRole = registerRole === 'admin' ? 'admin' : 'student';
      const result = await signUp(registerEmail.toLowerCase(), registerPassword, registerName, mappedRole);
      addToast(`Account registered successfully via Firebase! Welcome, ${result.userProfile.fullName}.`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Registration failed.', 'error');
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const result = await signInWithGoogle();
      addToast(`Google Sign In succeeded! Welcome, ${result.userProfile.fullName}.`, 'success');
    } catch (err: any) {
      console.warn('Google Sign In Notice:', err);
      addToast(err.message || 'Google Sign In failed. Open the app in its own tab or check popup permissions.', 'error');
      throw err;
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
      onConfirm: async () => {
        try {
          await centralLogout();
          addToast('Credentials session closed safely.', 'info');
        } catch (err: any) {
          addToast('Sign out encountered a small issue.', 'info');
        }
      }
    });
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
      if (selectedBuilding !== 'all' && room.building !== selectedBuilding) return false;
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
  }, [rooms, minCapacity, statusFilter, selectedFeatureToggles, searchQuery, sortKey, selectedBuilding]);

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
    
    addToast(`Space reservation secured!`, 'success');
    fetchDashboardModels(user.role);
  };

  const syncRoomsStatusFromCalendar = () => {
    addToast('Synchronizing database models...', 'success');
    fetchDashboardModels(user.role);
  };

  // Prepopulate form triggers with direct instant login
  const fillPredefinedCredentials = async (role: 'admin' | 'user') => {
    const targetEmail = role === 'admin' ? 'admin@iitbhu.ac.in' : 'student@iitbhu.ac.in';
    const targetPassword = role === 'admin' ? 'admin123' : 'student123';
    
    setLoginEmail(targetEmail);
    setLoginPassword(targetPassword);
    
    setIsLoggingIn(true);
    try {
      const result = await signIn(targetEmail, targetPassword, true);
      addToast(`Instant Access Granted! Welcome back, ${result.userProfile.fullName}.`, 'success');
    } catch (err: any) {
      console.warn('Instant login bypass failed, falling back to manual credentials entry:', err);
      addToast(err.message || 'Login credentials mismatch. Please try manual entry.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ==========================================
  // VIEW RENDER Gate
  // ==========================================
  if (checkingFirebase) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="text-center space-y-6 z-10 max-w-sm">
          <div className="relative w-16 h-16 mx-auto">
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin absolute inset-0" />
            <div className="w-12 h-12 rounded-full bg-indigo-950 border border-indigo-500/30 flex items-center justify-center font-bold text-sm text-indigo-400 absolute top-2 left-2 shadow-inner">
              BHU
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold tracking-tight">Verifying Space Scheduler Connection</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Establishing a secure connection with Firestore Database and checking server health...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (firebaseError) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(239,68,68,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(239,68,68,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-red-500/5 rounded-full blur-[90px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-red-900/40 rounded-2xl p-8 max-w-md w-full shadow-2xl z-10 relative space-y-6"
        >
          <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
            <div className="w-12 h-12 rounded-xl bg-red-950/50 border border-red-500/30 flex items-center justify-center text-red-400 shadow-inner">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-white">Connection Interrupted</h3>
              <p className="text-xs text-red-400 font-mono">Firebase Configuration Issue</p>
            </div>
          </div>

          <div className="bg-red-950/25 border border-red-900/30 rounded-xl p-4 font-mono text-xs text-red-300 leading-relaxed">
            {firebaseError}
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">Suggested Remedies</h4>
            <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
              <li>Ensure the Firebase console has <strong className="text-white">Firestore Database</strong> enabled.</li>
              <li>Verify that the <code className="text-indigo-400 font-mono">firebase-blueprint.json</code> database rules are fully applied.</li>
              <li>Check your internet connection or check the dev console logs for detailed error contexts.</li>
            </ul>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-sm tracking-wide text-white transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Connection Setup
          </button>
        </motion.div>
      </div>
    );
  }

  if (needsAuth || !user || showWelcomeOverlay) {
    if (showWelcomeOverlay && user) {
      return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans`}>
          {/* background gradient */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 z-10 relative max-w-md"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-2xl mx-auto shadow-xl shadow-indigo-500/25 animate-bounce">
              IIT
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome Back, {user?.name || user?.email || 'User'}!
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium`}>
                Preparing your IIT BHU Smart Scheduler workspace...
              </p>
            </div>

            {/* Google Account Status Badge immediately after doing login */}
            <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 text-left ${
              isDarkMode 
                ? 'bg-slate-900/90 border-slate-800 text-slate-200' 
                : 'bg-white border-stone-200 text-slate-800 shadow-md'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                </div>
                <div className="font-sans">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>Google Account</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[210px]">
                    {user?.email || 'Connected for Google Calendar Sync'}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/20 shrink-0">
                Connected
              </span>
            </div>
            
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce" />
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <LoginView
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        currentTime={currentTime}
        isRegisterMode={isRegisterMode}
        setIsRegisterMode={setIsRegisterMode}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        registerName={registerName}
        setRegisterName={setRegisterName}
        registerEmail={registerEmail}
        setRegisterEmail={setRegisterEmail}
        registerPassword={registerPassword}
        setRegisterPassword={setRegisterPassword}
        registerRole={registerRole}
        setRegisterRole={setRegisterRole}
        isLoggingIn={isLoggingIn}
        fillPredefinedCredentials={fillPredefinedCredentials}
        handleCredentialsLogin={handleCredentialsLogin}
        handleCredentialsRegister={handleCredentialsRegister}
        handleGoogleSignIn={handleGoogleSignIn}
      />
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
            <nav className="hidden lg:flex items-center gap-2 relative">
              {[
                { label: 'Dashboard', tab: 'dashboard', action: () => { setActiveTab('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
                { label: 'Rooms Directory', tab: 'rooms', action: () => { setActiveTab('rooms'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
                { label: 'Interactive Calendar', tab: 'calendar', action: () => { setActiveTab('calendar'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
                { label: 'My Profile', tab: 'profile', action: () => { setActiveTab('profile'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
                ...(user?.role === 'admin' ? [{ label: 'Admin Center', tab: 'admin', action: () => { setActiveTab('admin'); window.scrollTo({ top: 0, behavior: 'smooth' }); } }] : [])
              ].map((item) => {
                const isActive = activeTab === item.tab;
                return (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
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
              {/* Help & Support Knowledgebase Button */}
              <button
                onClick={() => setShowHelpModal(true)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isDarkMode 
                    ? 'bg-slate-900 border-slate-800 text-indigo-400 hover:text-white hover:bg-slate-800' 
                    : 'bg-[#faf8f2] border-[#ead29c]/40 text-indigo-700 hover:text-indigo-900 hover:bg-stone-100'
                }`}
                title="Help & FAQs"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="text-xs font-bold hidden xl:inline">Help & FAQs</span>
              </button>

              {/* Guided Onboarding Tour Button */}
              <button
                onClick={() => setShowOnboardingTour(true)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isDarkMode 
                    ? 'bg-slate-900 border-slate-800 text-purple-400 hover:text-white hover:bg-slate-800' 
                    : 'bg-[#faf8f2] border-[#ead29c]/40 text-purple-700 hover:text-purple-900 hover:bg-stone-100'
                }`}
                title="Guided Onboarding Tour"
              >
                <Compass className="w-4 h-4" />
                <span className="text-xs font-bold hidden xl:inline">Guided Tour</span>
              </button>

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
                      : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-[#faf8f2] border-[#ead29c]/40 text-slate-500 hover:text-[#0a4735]')
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



              {/* Google Account Status Badge right next to profile after logging in */}
              <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${
                isDarkMode 
                  ? 'border-slate-800 bg-slate-900/90 text-slate-300' 
                  : 'border-[#ead29c]/60 bg-[#faf8f2] text-[#0a4735]'
              }`}>
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span className="font-bold text-[10.5px]">Google Account</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Google Account Connected" />
              </div>

              {/* Luxury Profile Pill */}
              <div className={`flex items-center gap-2.5 p-1.5 pr-3.5 rounded-full border ${
                isDarkMode 
                  ? 'border-slate-800 bg-slate-900' 
                  : 'border-[#ead29c]/50 bg-[#faf8f2]'
              }`}>
                <div className="w-8 h-8 rounded-full bg-[#0a4735] border border-[#dfb965]/40 flex items-center justify-center font-bold text-xs text-[#dfb965]">
                  {(user?.name || user?.email || 'User').charAt(0).toUpperCase()}
                </div>
                <div className="text-left leading-none font-sans">
                  <span className={`text-xs font-bold block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{user?.name || user?.email || 'User'}</span>
                  <span className="text-[9px] text-[#c09728] font-semibold uppercase font-mono">{user?.role === 'admin' ? 'Platform Admin' : 'User'}</span>
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
                <div className="flex flex-col gap-1.5 text-left">
                  <div className="px-3 pb-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                    Core Dashboard
                  </div>
                  {[
                    { label: 'Dashboard', tab: 'dashboard', action: () => { setActiveTab('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
                    { label: 'Rooms Directory', tab: 'rooms', action: () => { setActiveTab('rooms'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
                    { label: 'Interactive Calendar', tab: 'calendar', action: () => { setActiveTab('calendar'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
                    { label: 'My Profile', tab: 'profile', action: () => { setActiveTab('profile'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
                    ...(user.role === 'admin' ? [{ label: 'Admin Center', tab: 'admin', action: () => { setActiveTab('admin'); window.scrollTo({ top: 0, behavior: 'smooth' }); } }] : []),
                  ].map((item) => {
                    const isActive = activeTab === item.tab;
                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          if (item.action) item.action();
                          else setActiveTab(item.tab as any);
                        }}
                        className={`py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-all ${
                          isActive
                            ? (isDarkMode ? 'text-white bg-slate-850 border-l-4 border-[#dfb965]' : 'text-[#0a4735] bg-[#faf8f2] border-l-4 border-[#d4af37]')
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
                    {(user?.name || user?.email || 'User').charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left leading-tight flex-1 font-sans">
                    <span className={`text-xs font-bold block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{user?.name || user?.email || 'User'}</span>
                    <span className={`text-[10px] block truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      toggleRole();
                    }}
                    className={`w-full py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5 ${
                      user?.role === 'admin'
                        ? 'bg-amber-650/15 border-amber-500/30 text-amber-400 hover:bg-amber-650/25'
                        : 'bg-indigo-650/15 border-indigo-500/30 text-indigo-400 hover:bg-indigo-650/25'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>View as {user?.role === 'admin' ? 'Academic Member' : 'Platform Admin'}</span>
                  </button>

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

                  <button
                    onClick={handleSignout}
                    className={`w-full py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5 ${
                      isDarkMode ? 'border-slate-800 text-rose-400 hover:bg-rose-950/20' : 'border-slate-200 text-rose-650 hover:bg-rose-50/20'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>



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
              <span className={isDarkMode ? 'text-slate-600' : 'text-slate-300'}>|</span>
              <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'} text-[10.5px] font-mono`}>
                IIT BHU Cloud Sync: {isOnline ? 'Live Mode' : 'Local Sandbox Mode'}
              </span>
            </div>

            {/* Sync Times section */}
            <div className="flex flex-wrap items-center gap-4 text-[10.5px] font-mono text-slate-500 animate-fade-in">
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
                    {(user?.name || user?.email || 'User').charAt(0).toUpperCase()}
                  </div>
                  <div className="leading-tight flex-1 min-w-0">
                    <span className={`text-sm font-bold block truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{user?.name || user?.email || 'User'}</span>
                    <span className={`text-[8.5px] font-extrabold uppercase py-0.5 px-1.5 rounded font-mono inline-block mt-0.5 ${
                      user?.role === 'admin' ? (isDarkMode ? 'bg-red-950/80 text-red-300 border border-red-800/35' : 'bg-red-50 text-red-700 border border-red-200') : 
                      (isDarkMode ? 'bg-amber-950/80 text-amber-350 border border-amber-800/35' : 'bg-amber-50 text-amber-700 border border-amber-200')
                    }`}>
                      {user?.role === 'admin' ? 'Platform Admin' : 'User'}
                    </span>
                  </div>
                </div>
                
                {/* Micro statistics or fast indicator */}
                <div className={`pt-3 border-t ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'} grid grid-cols-2 gap-2 text-center`}>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-500 block font-mono uppercase">User Level</span>
                    <strong className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} capitalize`}>{user.role === 'admin' ? 'Platform Admin' : 'User'}</strong>
                  </div>
                  <div className="space-y-0.5 border-l border-slate-800/60">
                    <span className="text-[9px] text-slate-500 block font-mono uppercase">Sync State</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 justify-center w-full">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Live
                    </span>
                  </div>
                </div>

                {/* Fast Role Switcher to make every component visible */}
                <div className="pt-3 border-t border-slate-800/40">
                  <button
                    onClick={toggleRole}
                    className={`w-full py-2 px-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      user?.role === 'admin'
                        ? 'bg-amber-650/15 border-amber-500/30 text-amber-400 hover:bg-amber-650/25'
                        : 'bg-indigo-650/15 border-indigo-500/30 text-indigo-400 hover:bg-indigo-650/25'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 shrink-0 text-current" />
                    <span>View as {user?.role === 'admin' ? 'Academic Member' : 'Platform Admin'}</span>
                  </button>
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
                    onClick={() => setActiveTab('landing')}
                    className={`w-full flex items-center gap-3 font-semibold text-xs py-3 px-3.5 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'landing'
                        ? (isDarkMode ? 'bg-indigo-950/50 text-indigo-300 border-l-4 border-indigo-500 font-bold' : 'bg-indigo-50/80 text-indigo-700 border-l-4 border-indigo-500 font-bold')
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Building2 className="w-4 h-4 shrink-0 text-indigo-400" />
                    <span>Landing Page</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`w-full flex items-center gap-3 font-semibold text-xs py-3 px-3.5 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'dashboard'
                        ? (isDarkMode ? 'bg-indigo-950/50 text-indigo-300 border-l-4 border-indigo-500 font-bold' : 'bg-indigo-50/80 text-indigo-700 border-l-4 border-indigo-500 font-bold')
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span>Campus Dashboard</span>
                  </button>

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
                    onClick={() => setShowAssistantModal(true)}
                    className="w-full flex items-center justify-between font-semibold text-xs py-3 px-3.5 rounded-xl transition-all cursor-pointer text-purple-400 hover:bg-purple-950/20"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4 shrink-0 text-purple-400" />
                      <span>AI Room Allocator</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <span>🎙️ Voice</span>
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('kiosk')}
                    className={`w-full flex items-center gap-3 font-semibold text-xs py-3 px-3.5 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'kiosk'
                        ? (isDarkMode ? 'bg-indigo-950/50 text-indigo-300 border-l-4 border-indigo-500 font-bold' : 'bg-indigo-50/80 text-indigo-700 border-l-4 border-indigo-500 font-bold')
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Tv className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Digital Door Plaque</span>
                  </button>

                  <button
                    onClick={() => setShowExportModal(true)}
                    className="w-full flex items-center gap-3 font-semibold text-xs py-3 px-3.5 rounded-xl transition-all cursor-pointer text-indigo-400 hover:bg-indigo-950/20"
                  >
                    <Download className="w-4 h-4 shrink-0 text-indigo-400" />
                    <span>Export Reports</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center gap-3 font-semibold text-xs py-3 px-3.5 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'profile'
                        ? (isDarkMode ? 'bg-indigo-950/50 text-indigo-300 border-l-4 border-indigo-500 font-bold' : 'bg-indigo-50/80 text-indigo-700 border-l-4 border-indigo-500 font-bold')
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <User className="w-4 h-4 shrink-0" />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={() => setShowHelpModal(true)}
                    className="w-full flex items-center gap-3 font-semibold text-xs py-3 px-3.5 rounded-xl transition-all cursor-pointer text-indigo-400 hover:bg-indigo-950/20"
                  >
                    <HelpCircle className="w-4 h-4 shrink-0 text-indigo-400" />
                    <span>Help & FAQs</span>
                  </button>

                  <button
                    onClick={() => setShowOnboardingTour(true)}
                    className="w-full flex items-center gap-3 font-semibold text-xs py-3 px-3.5 rounded-xl transition-all cursor-pointer text-purple-400 hover:bg-purple-950/20"
                  >
                    <Compass className="w-4 h-4 shrink-0 text-purple-400" />
                    <span>Guided Tour</span>
                  </button>

                  {user?.role === 'admin' && (
                    <button
                      onClick={() => setActiveTab('admin')}
                      className={`w-full flex items-center gap-3 font-semibold text-xs py-3 px-3.5 rounded-xl transition-all cursor-pointer ${
                        activeTab === 'admin'
                          ? (isDarkMode ? 'bg-rose-950/30 text-rose-300 border-l-4 border-rose-500 font-bold' : 'bg-rose-50/80 text-rose-700 border-l-4 border-rose-500 font-bold')
                          : 'text-slate-400 hover:text-rose-450 hover:bg-slate-800/40'
                      }`}
                    >
                      <Shield className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>Admin Center</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right-hand Main Workspace Content area */}
            <div className="lg:col-span-9 space-y-6">
              
              {/* Mobile top-bar horizontal menu (only visible below lg screen width) */}
              <div className="block lg:hidden overflow-x-auto pb-1 mb-4">
                <div className="flex items-center gap-1.5 border-b border-slate-800/60">
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-2 font-semibold text-xs uppercase tracking-wider py-3 px-4 border-b-2 transition-all cursor-pointer shrink-0 ${
                      activeTab === 'dashboard'
                        ? 'border-indigo-500 text-white bg-indigo-950/20 font-bold'
                        : 'border-transparent text-slate-400 hover:text-slate-250'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                    <span>Dashboard</span>
                  </button>
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
                    onClick={() => setActiveTab('profile')}
                    className={`flex items-center gap-2 font-semibold text-xs uppercase tracking-wider py-3 px-4 border-b-2 transition-all cursor-pointer shrink-0 ${
                      activeTab === 'profile'
                        ? 'border-indigo-500 text-white bg-indigo-950/20 font-bold'
                        : 'border-transparent text-slate-400 hover:text-slate-250'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span>Profile</span>
                  </button>
                  {user.role === 'admin' && (
                    <button
                      onClick={() => setActiveTab('admin')}
                      className={`flex items-center gap-2 font-semibold text-xs uppercase tracking-wider py-3 px-4 border-b-2 transition-all cursor-pointer shrink-0 ${
                        activeTab === 'admin'
                          ? 'border-indigo-500 text-white bg-indigo-950/20 font-bold'
                          : 'border-transparent text-slate-400 hover:text-slate-250'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5 shrink-0 text-rose-450" />
                      <span>Admin</span>
                    </button>
                  )}
                </div>
              </div>

          {/* Active Tab transition bounds */}
          <AnimatePresence mode="wait">
            <div className="space-y-6">

              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
              <React.Suspense fallback={<ModuleLoadingFallback />}>
              {/* ==========================================
                  TAB: LANDING PAGE
                  ========================================== */}
              {activeTab === 'landing' && (
                <LandingPage
                  rooms={rooms}
                  onEnterApp={() => setActiveTab('dashboard')}
                  onOpenLogin={() => setActiveTab('dashboard')}
                  isDarkMode={isDarkMode}
                  onToggleDarkMode={toggleDarkMode}
                />
              )}

              {/* ==========================================
                  TAB: DIGITAL DOOR PLAQUE KIOSK
                  ========================================== */}
              {activeTab === 'kiosk' && (
                <DigitalDisplayView
                  rooms={rooms}
                  bookings={adminBookings}
                  onQuickBook15Min={(room) => {
                    setConfirmRoomSelection(room);
                    setPreselectedRoomId(room.id);
                    setActiveTab('calendar');
                    addToast(`Quick reservation initiated for ${room.name}`, 'info');
                  }}
                  isDarkMode={isDarkMode}
                  onCloseKiosk={() => setActiveTab('dashboard')}
                />
              )}

              {/* ==========================================
                  TAB: CAMPUS DASHBOARD
                  ========================================== */}
              {activeTab === 'dashboard' && (
                <DashboardView
                  user={user}
                  rooms={rooms}
                  bookings={adminBookings}
                  isDarkMode={isDarkMode}
                  onNavigateTab={(tab) => { setActiveTab(tab); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  onSelectRoomForDetails={(room) => setSelectedRoomForDetails(room)}
                  onBookRoom={(room) => {
                    setConfirmRoomSelection(room);
                    setPreselectedRoomId(room.id);
                    setActiveTab('calendar');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}

              {/* ==========================================
                  TAB: MY PROFILE
                  ========================================== */}
              {activeTab === 'profile' && (
                <UserProfileView
                  user={user}
                  bookings={adminBookings}
                  rooms={rooms}
                  isDarkMode={isDarkMode}
                  onProfileUpdated={async () => {
                    await refreshUser();
                  }}
                  addToast={addToast}
                />
              )}

              {/* ==========================================
                  TAB: ROOMS DIRECTORY
                  ========================================== */}
              {activeTab === 'rooms' && (
                <RoomsDirectoryView
                  user={user}
                  rooms={rooms}
                  adminBookings={adminBookings}
                  loadingResources={loadingResources}
                  addToast={addToast}
                  fetchDashboardModels={fetchDashboardModels}
                  setActiveTab={setActiveTab}
                  syncRoomsStatusFromCalendar={syncRoomsStatusFromCalendar}
                  handleDownloadCSV={handleDownloadCSV}
                  setConfirmModal={setConfirmModal}
                  setSelectedRoomForHistory={setSelectedRoomForHistory}
                  setSelectedRoomForDetails={setSelectedRoomForDetails}
                  setConfirmRoomSelection={setConfirmRoomSelection}
                  setPreselectedRoomId={setPreselectedRoomId}
                  preselectedRoomId={preselectedRoomId}
                  isDarkMode={isDarkMode}
                />
              )}

              {/* ==========================================
                  TAB: CALENDAR SCHEDULER
                  ========================================== */}
              {activeTab === 'calendar' && (
                <div className="space-y-2">
                  <CalendarWidget
                    rooms={rooms}
                    userEmail={user?.email || ''}
                    userName={user?.name || user?.email || 'User'}
                    userRole={user?.role || 'student'}
                    onRefreshRoomsStatus={syncRoomsStatusFromCalendar}
                    onBookingAdded={handleNewBookingRegistered}
                    defaultSelectedRoomId={preselectedRoomId}
                  />
                </div>
              )}

              {/* ==========================================
                  TAB: ADMIN OFFICE MASTER CONTROL CENTER
                  ========================================== */}
              {activeTab === 'admin' && user?.role === 'admin' && (
                <AdminPanel
                  rooms={rooms}
                  adminBookings={adminBookings}
                  adminUsers={adminUsers}
                  user={user}
                  addToast={addToast}
                  onRefreshData={() => fetchDashboardModels(user.role)}
                  setConfirmModal={setConfirmModal}
                  auditLogs={auditLogs}
                  setAuditLogs={setAuditLogs}
                  isDarkMode={isDarkMode}
                />
              )}

              </React.Suspense>
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
                  ? 'bg-indigo-950/95 border-indigo-800 text-indigo-100'
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



      {/* CONFIRMATION SLOT SELECTION DIALOG */}
      <AnimatePresence>
        {confirmRoomSelection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-6 text-center"
            >
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block font-mono">Confirm Space Selection</span>
                <h3 className="text-lg font-black text-white">{confirmRoomSelection.name}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed pt-1.5">
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
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold uppercase transition shadow-lg shadow-indigo-950/20"
                >
                  Go to Scheduler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DYNAMIC ACTIVITY HISTORY DRAWER */}
      <React.Suspense fallback={null}>
      <ActivityHistoryDrawer
        selectedRoomForHistory={selectedRoomForHistory}
        onClose={() => {
          setSelectedRoomForHistory(null);
          setHistorySearchQuery('');
          setHistoryPeriodFilter('all');
          setHistoryStartDate('');
          setHistoryEndDate('');
        }}
        adminBookings={adminBookings}
        historySearchQuery={historySearchQuery}
        setHistorySearchQuery={setHistorySearchQuery}
        historyPeriodFilter={historyPeriodFilter}
        setHistoryPeriodFilter={setHistoryPeriodFilter}
        historyStartDate={historyStartDate}
        setHistoryStartDate={setHistoryStartDate}
        historyEndDate={historyEndDate}
        setHistoryEndDate={setHistoryEndDate}
      />

      {/* PREMIUM DETAILED ROOM INFO DRAWER */}
      <RoomDetailsDrawer
        selectedRoomForDetails={selectedRoomForDetails}
        onClose={() => setSelectedRoomForDetails(null)}
        isDarkMode={isDarkMode}
        onReserveClick={(room) => {
          setConfirmRoomSelection(room);
          setPreselectedRoomId(room.id);
          setSelectedRoomForDetails(null);
          setActiveTab('calendar');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onViewScheduleClick={(room) => {
          setSelectedRoomForHistory(room);
          setSelectedRoomForDetails(null);
        }}
      />

      {/* AI ROOM ALLOCATOR MODAL OVERLAY */}
      {showAssistantModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <SmartAIRoomAssistant
            rooms={rooms}
            onSelectRecommendedRoom={(room) => {
              setShowAssistantModal(false);
              setConfirmRoomSelection(room);
              setPreselectedRoomId(room.id);
              setActiveTab('calendar');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onClose={() => setShowAssistantModal(false)}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      {/* REPORT EXPORT MODAL OVERLAY */}
      {showExportModal && (
        <ReportExportModal
          bookings={adminBookings}
          rooms={rooms}
          onClose={() => setShowExportModal(false)}
          isDarkMode={isDarkMode}
        />
      )}

      {/* INTERACTIVE ONBOARDING GUIDED TOUR */}
      <OnboardingTour
        isOpen={showOnboardingTour}
        onClose={() => setShowOnboardingTour(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isDarkMode={isDarkMode}
      />

      {/* HELP & SUPPORT KNOWLEDGEBASE MODAL */}
      <HelpSupportModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        onRestartTour={() => setShowOnboardingTour(true)}
        isDarkMode={isDarkMode}
      />
      </React.Suspense>

      {/* Footer Branding */}
      <footer className="py-6 border-t border-slate-900/80 mt-12 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-[10px] font-mono uppercase tracking-wider space-y-1">
          <span>created by srishti pathak iit bhu 2026</span><br />
          <span>Smart Room reservation panel • connected to cloud firestore database</span>
        </div>
      </footer>

      {/* Resilient Custom Confirmation Modal (Bypasses sandboxed iframe window.confirm blocks completely) */}
      <ConfirmModal
        isOpen={!!confirmModal && confirmModal.isOpen}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        onConfirm={() => {
          if (confirmModal) {
            setConfirmModal({ ...confirmModal, isOpen: false });
            confirmModal.onConfirm();
          }
        }}
        onCancel={() => {
          if (confirmModal) {
            setConfirmModal({ ...confirmModal, isOpen: false });
            if (confirmModal.onCancel) confirmModal.onCancel();
          }
        }}
        confirmText={confirmModal?.confirmText}
        cancelText={confirmModal?.cancelText}
        isDanger={confirmModal?.isDanger}
        requiredTextToConfirm={confirmModal?.requiredTextToConfirm}
        confirmInputText={confirmInputText}
        setConfirmInputText={setConfirmInputText}
      />
    </div>
  );
}
