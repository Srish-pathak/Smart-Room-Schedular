import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './auth/useAuth';
import { 
  initAuth, 
  logout, 
  googleSignIn, 
  firebaseRegisterWithEmailAndPassword, 
  firebaseSignInWithEmailAndPassword 
} from './lib/auth';
import { Room } from './types';
import { FloorPlanView } from './components/FloorPlanView';
import {
  authAPI,
  roomsAPI,
  bookingsAPI,
  adminAPI,
  notificationsAPI,
  checkInAPI,
  auditAPI,
  setSessionToken,
  getSessionToken
} from './lib/api';
import { collection, onSnapshot, getDocs, query, limit } from 'firebase/firestore';
import { db } from './firebase/firebase';

// Components
import { CalendarAPI } from './lib/workspace';
import CalendarWidget from './components/CalendarWidget';
import QRCodeSVG from './components/QRCodeSVG';
import QRScannerModal from './components/QRScannerModal';
import { LoginView } from './components/LoginView';
import { ConfirmModal } from './components/ConfirmModal';
import { ActivityHistoryDrawer } from './components/ActivityHistoryDrawer';
import { RoomDetailsDrawer } from './components/RoomDetailsDrawer';
import { AdminPanel } from './components/AdminPanel';
import { DashboardView } from './components/DashboardView';
import { UserProfileView } from './components/UserProfileView';
import { calculateRoomStatus } from './utils/roomStatus';

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
  Scan,
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
  ChevronDown,
  ChevronUp,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];



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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rooms' | 'calendar' | 'profile' | 'admin'>('dashboard');
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

  // Selected Room for Scannable QR Modal
  const [selectedQRRoom, setSelectedQRRoom] = useState<Room | null>(null);
  const [selectedRoomForHistory, setSelectedRoomForHistory] = useState<Room | null>(null);
  const [selectedRoomForDetails, setSelectedRoomForDetails] = useState<Room | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyPeriodFilter, setHistoryPeriodFilter] = useState<'all' | 'odd-25' | 'even-26' | 'summer-26' | 'ay-26-27' | 'custom'>('all');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [isScanningSimulated, setIsScanningSimulated] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

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

    console.log('⚡ Establishing live Firestore Realtime subscriptions...');

    // 1. Subscribe to Bookings Table
    const unsubscribeBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      console.log('🔔 Realtime Bookings Update witnessed via Firestore');
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
      console.log('🔔 Realtime Rooms Update witnessed via Firestore');
      fetchDashboardModels(user.role);
    }, (error) => {
      console.warn('Firestore rooms snapshot subscription failed:', error);
    });

    // 3. Subscribe to Notifications Table
    const unsubscribeNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      console.log('🔔 Realtime Notifications Update witnessed via Firestore');
      notificationsAPI.list()
        .then((list) => setNotifications(Array.isArray(list) ? list : []))
        .catch(() => {});
    }, (error) => {
      console.warn('Firestore notifications snapshot subscription failed:', error);
    });

    return () => {
      console.log('⚡ Cleaned up live Firestore Realtime subscriptions.');
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



  const triggerFastCheckIn = async (room: Room) => {
    // Find an ongoing/upcoming booking for this user in this room
    const matchingBooking = adminBookings.find((b: any) => {
      if (b.room_id !== room.id) return false;
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      const now = new Date();
      const allowedStart = new Date(start.getTime() - 30 * 60 * 1000);
      return now >= allowedStart && now <= end;
    });

    if (!matchingBooking) {
      addToast(`No active or upcoming reservation found for "${room.name}" within the check-in window (starts 30 mins before start).`, 'error');
      return;
    }

    try {
      await checkInAPI.checkIn(matchingBooking.id);
      addToast(`⚡ Successfully checked in to room "${room.name}"!`, 'success');
      if (user && user.role) {
        fetchDashboardModels(user.role);
      }
    } catch (err: any) {
      addToast(err.message || 'Check-in failed.', 'error');
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

  // Prepopulate form triggers
  const fillPredefinedCredentials = (role: 'admin' | 'user') => {
    if (role === 'admin') {
      setLoginEmail('admin@iitbhu.ac.in');
      setLoginPassword('admin123');
    } else {
      setLoginEmail('student@iitbhu.ac.in');
      setLoginPassword('student123');
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
                <div className="space-y-6">
                  {/* Modern Welcoming Hero Banner */}
                  <div className="p-6 bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-900/40 rounded-3xl text-left relative overflow-hidden shadow-xl">
                    <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">IIT BHU Campus Scheduler 👋</span>
                        <h2 className="text-xl font-extrabold tracking-tight text-white">Need to book an academic space today?</h2>
                        <p className="text-xs text-slate-350 max-w-2xl leading-relaxed">
                          Welcome, <strong className="text-indigo-300">{user?.name || user?.email || 'User'}</strong>. Browse live room statuses below. Click <strong className="text-indigo-300">"CHOOSE SLOT"</strong> to customize a schedule inside our interactive calendar, or click <button onClick={() => setIsQRScannerOpen(true)} className="text-indigo-300 font-extrabold hover:underline cursor-pointer bg-transparent border-none p-0 inline font-mono">"QR Scanner"</button> to check in instantly!
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <button
                          onClick={() => setIsQRScannerOpen(true)}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-550 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                        >
                          <Scan className="w-4 h-4" />
                          <span>QR Scanner</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('calendar')}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Quick Book</span>
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
                                  <div className="flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] uppercase font-extrabold ${
                                      b.status === 'Approved' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/35' :
                                      b.status === 'Rejected' ? 'bg-rose-950/60 text-rose-400 border border-rose-900/35' :
                                      'bg-amber-950/60 text-amber-400 border border-amber-900/35 animate-pulse'
                                    }`}>
                                      {b.status || 'Approved'}
                                    </span>
                                    <span className="text-[10px] text-indigo-400 font-mono font-black">
                                      {isToday ? 'TODAY' : startDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </span>
                                  </div>
                                </div>
                                <h4 className="text-sm font-bold text-white leading-snug tracking-tight">{b.summary}</h4>
                                {b.status === 'Rejected' && (b.rejectionReason || b.rejection_reason) && (
                                  <p className="text-[10px] text-rose-400 italic bg-rose-950/20 border border-rose-900/30 p-2 rounded-lg mt-1 text-left">
                                    Reason: {b.rejectionReason || b.rejection_reason}
                                  </p>
                                )}
                                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                                  <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  <span>{timeStr}</span>
                                </div>

                                {/* Google Calendar Sync Status for User Bookings */}
                                <div className="mt-2.5 pt-2.5 border-t border-slate-900 flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Sync:</span>
                                    {b.google_sync_status === 'synced' ? (
                                      <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        Synced ✓
                                      </span>
                                    ) : b.google_sync_status === 'failed' ? (
                                      <span className="text-[10px] text-rose-400 font-medium bg-rose-950/40 border border-rose-900/30 px-1.5 py-0.5 rounded flex items-center gap-1" title={b.google_sync_error || 'Sync failed'}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                                        Failed ✕
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-amber-400/80 font-medium bg-amber-950/40 border border-amber-900/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <span className="w-1 h-1 rounded-full bg-amber-400" />
                                        Not Synced
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {(b.google_sync_status === 'failed' || b.google_sync_status === 'not_connected' || b.google_sync_status === 'not_synced' || !b.google_sync_status) && (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const gToken = sessionStorage.getItem('google_workspace_access_token');
                                          if (!gToken) {
                                            addToast('Please connect your Google Account first to resync bookings.', 'info');
                                            return;
                                          }
                                          try {
                                            addToast('Initiating Google Calendar Sync...', 'info');
                                            const calEvent = await CalendarAPI.createEvent({
                                              roomName: b.room_name,
                                              summary: b.summary,
                                              startTime: b.start_time,
                                              endTime: b.end_time,
                                              agenda: b.agenda || '',
                                              attendeeEmail: b.attendee_email || '',
                                              creatorName: b.creator_name,
                                              creatorEmail: b.creator_email,
                                            });

                                            if (calEvent && calEvent.id) {
                                              await bookingsAPI.update(b.id, {
                                                roomId: b.room_id,
                                                roomName: b.room_name,
                                                summary: b.summary,
                                                agenda: b.agenda,
                                                startTime: b.start_time,
                                                endTime: b.end_time,
                                                attendeeEmail: b.attendee_email,
                                                facultyId: b.faculty_id,
                                                google_event_id: calEvent.id,
                                                google_calendar_link: calEvent.htmlLink || null,
                                                google_sync_status: 'synced',
                                                google_sync_error: null,
                                                bypassConflict: true,
                                              });
                                              addToast('Schedules successfully synchronized with Google Calendar!', 'success');
                                              fetchDashboardModels(user.role);
                                            }
                                          } catch (syncErr: any) {
                                            console.error('Resync failed:', syncErr);
                                            addToast(`Resync failed: ${syncErr.message || syncErr}`, 'error');
                                            await bookingsAPI.update(b.id, {
                                              roomId: b.room_id,
                                              roomName: b.room_name,
                                              summary: b.summary,
                                              agenda: b.agenda,
                                              startTime: b.start_time,
                                              endTime: b.end_time,
                                              attendeeEmail: b.attendee_email,
                                              facultyId: b.faculty_id,
                                              google_sync_status: 'failed',
                                              google_sync_error: syncErr.message || 'Unknown calendar error',
                                              bypassConflict: true,
                                            });
                                            fetchDashboardModels(user.role);
                                          }
                                        }}
                                        className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 hover:bg-indigo-900 border border-indigo-800/40 text-[9px] font-semibold cursor-pointer transition-all"
                                      >
                                        Resync ↻
                                      </button>
                                    )}

                                    {b.google_calendar_link && (
                                      <a
                                        href={b.google_calendar_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 hover:bg-teal-900 border border-teal-800/40 text-[9px] font-semibold transition-all"
                                      >
                                        Open Calendar
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="pt-2.5 border-t border-slate-900/80">
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
                                          const gToken = sessionStorage.getItem('google_workspace_access_token');
                                          if (gToken && b.google_event_id) {
                                            try {
                                              await CalendarAPI.deleteEvent(b.google_event_id);
                                            } catch (calErr) {
                                              console.error('Failed to cancel Google Calendar event:', calErr);
                                            }
                                          }
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
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          REAL-TIME
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
                    <div className="md:col-span-7 relative" ref={searchContainerRef}>
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search rooms by name or equipment (e.g. Whiteboard, Projector)..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSuggestions(true);
                          setActiveSuggestionIndex(-1);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={handleKeyDown}
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={showSuggestions && autocompleteSuggestions.length > 0}
                        aria-controls="room-search-suggestions"
                        aria-haspopup="listbox"
                        aria-activedescendant={
                          showSuggestions && activeSuggestionIndex >= 0 && autocompleteSuggestions[activeSuggestionIndex]
                            ? autocompleteSuggestions[activeSuggestionIndex].id
                            : undefined
                        }
                        className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition-all shadow-md text-left"
                      />

                      {/* Screen reader live region for announcements */}
                      <div className="sr-only" aria-live="polite" aria-atomic="true">
                        {srAnnouncement}
                      </div>

                      {/* Autocomplete Suggestions List */}
                      {showSuggestions && autocompleteSuggestions.length > 0 && (
                        <div 
                          className={`absolute left-0 right-0 top-full mt-2 z-50 max-h-72 overflow-y-auto rounded-xl border p-1.5 shadow-2xl backdrop-blur-md transition-all ${
                            isDarkMode 
                              ? 'bg-slate-950/95 border-slate-800 shadow-slate-950/50 text-slate-100' 
                              : 'bg-white/95 border-slate-200 shadow-slate-200/50 text-slate-800'
                          }`}
                          id="room-search-suggestions"
                          role="listbox"
                          aria-label="Room search suggestions"
                        >
                          {autocompleteSuggestions.map((item, index) => {
                            const Icon = item.type === 'building' 
                              ? Building2 
                              : item.type === 'category' 
                              ? Layers 
                              : Search;
                            
                            const isSelected = index === activeSuggestionIndex;
                            
                            return (
                              <button
                                key={item.id}
                                id={item.id}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  setSearchQuery(item.value);
                                  setShowSuggestions(false);
                                  setActiveSuggestionIndex(-1);
                                }}
                                onMouseEnter={() => setActiveSuggestionIndex(index)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                                  isSelected 
                                    ? (isDarkMode ? 'bg-indigo-600/90 text-white' : 'bg-indigo-50 text-indigo-900') 
                                    : (isDarkMode ? 'hover:bg-slate-900/60 text-slate-200' : 'hover:bg-slate-50 text-slate-700')
                                }`}
                              >
                                <div className={`p-1.5 rounded-md ${
                                  isSelected 
                                    ? (isDarkMode ? 'bg-indigo-500/30 text-white' : 'bg-indigo-100 text-indigo-700') 
                                    : (isDarkMode ? 'bg-slate-900 text-indigo-400' : 'bg-slate-100 text-indigo-600')
                                }`}>
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-xs truncate leading-none font-medium ${
                                    isSelected 
                                      ? (isDarkMode ? 'text-white' : 'text-slate-950') 
                                      : (isDarkMode ? 'text-slate-300' : 'text-slate-705')
                                  }`}>
                                    {highlightMatch(item.text, searchQuery, isSelected)}
                                  </div>
                                  <div className={`text-[10px] truncate mt-1 ${
                                    isSelected 
                                      ? (isDarkMode ? 'text-indigo-200' : 'text-indigo-600/80') 
                                      : (isDarkMode ? 'text-slate-400' : 'text-slate-500')
                                  }`}>
                                    {highlightMatch(item.subtext, searchQuery, isSelected)}
                                  </div>
                                </div>
                                <span className="text-[9px] font-mono opacity-60 uppercase tracking-widest px-1.5 py-0.5 rounded border border-current shrink-0">
                                  {item.type}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
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
                        {(minCapacity > 0 || statusFilter !== 'all' || selectedFeatureToggles.length > 0 || selectedBuilding !== 'all') && (
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold">
                            {(minCapacity > 0 ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + selectedFeatureToggles.length + (selectedBuilding !== 'all' ? 1 : 0)}
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
                          {(minCapacity > 0 || statusFilter !== 'all' || selectedFeatureToggles.length > 0 || searchQuery.trim() !== '' || sortKey !== 'default' || selectedBuilding !== 'all') && (
                            <button
                              onClick={() => {
                                setMinCapacity(0);
                                setStatusFilter('all');
                                setSelectedBuilding('all');
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

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 pt-2 text-left">
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
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-mono">Building Campus Zone</span>
                            <select
                              value={selectedBuilding}
                              onChange={(e) => setSelectedBuilding(e.target.value)}
                              className="text-[11px] font-bold w-full py-2 px-3 rounded-lg border transition-all bg-slate-950 border-slate-800 text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            >
                              <option value="all">All Academic Buildings</option>
                              {uniqueBuildings.map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                            </select>
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
                      {loadingResources ? (
                        Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="bg-slate-900 border border-slate-850 rounded-3xl overflow-hidden shadow-md animate-pulse p-5 space-y-5 flex flex-col justify-between">
                            <div className="space-y-4">
                              <div className="h-44 bg-slate-800 rounded-2xl w-full" />
                              <div className="space-y-2">
                                <div className="h-5 bg-slate-800 rounded w-3/4" />
                                <div className="h-3 bg-slate-800 rounded w-1/2" />
                              </div>
                            </div>
                            <div className="flex gap-2 pt-4">
                              <div className="h-10 bg-slate-800 rounded-xl w-24" />
                              <div className="h-10 bg-slate-800 rounded-xl w-24" />
                            </div>
                          </div>
                        ))
                      ) : filteredRooms.length === 0 ? (
                        <div className="col-span-1 md:col-span-2 py-16 text-center bg-slate-900 border border-slate-800 rounded-3xl p-8">
                          <SlidersHorizontal className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">No matching rooms found</h3>
                          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                            We couldn't find any rooms that match your active criteria. Try clearing some filters or searching for another keyphrase.
                          </p>
                        </div>
                      ) : (
                        filteredRooms.map((room) => {
                        // Generate reliable ratings based on room capacity & features
                        const rating = room.capacity > 100 ? '4.9' : room.capacity > 30 ? '4.8' : '4.7';
                        const reviewCount = room.capacity > 100 ? '42 reviews' : room.capacity > 30 ? '28 reviews' : '15 reviews';
                        const liveStatus = calculateRoomStatus(room, adminBookings);
                        
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
                                    liveStatus.status === 'available' 
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60' 
                                      : liveStatus.status === 'reserved_soon'
                                      ? 'bg-amber-50 text-amber-800 border-amber-200/60'
                                      : 'bg-rose-50 text-rose-800 border-rose-200/60'
                                  }`}>
                                    <span className={`w-2 h-2 rounded-full ${
                                      liveStatus.status === 'available' ? 'bg-emerald-500 animate-pulse' : liveStatus.status === 'reserved_soon' ? 'bg-amber-500 animate-bounce' : 'bg-rose-500'
                                    }`} />
                                    {liveStatus.status === 'available' ? 'AVAILABLE' : liveStatus.status === 'reserved_soon' ? 'RESERVED SOON' : 'OCCUPIED'}
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
                                  <div className="mt-2 text-[10.5px] bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-2 flex items-center gap-1.5 text-slate-300 font-mono">
                                    <Clock className="w-3.5 h-3.5 text-[#dfb965] shrink-0" />
                                    <span className="truncate">{liveStatus.nextMessage}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Card Body Features & Details */}
                              <div className="p-6 space-y-4">
                                {room.bestFor && (
                                  <div className="space-y-1 text-xs text-left">
                                    <span className="block text-[9px] font-bold text-[#c09728] uppercase tracking-widest font-mono">Best suited for</span>
                                    <p className="text-slate-500 leading-relaxed font-serif font-light">{room.bestFor}</p>
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
                                          <p className="text-[10.5px] text-slate-500 italic pl-1">This space is completely vacant today. Book below!</p>
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

                                {liveStatus.status === 'available' ? (
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
                                    onClick={() => {
                                      setPreselectedRoomId(room.id);
                                      setActiveTab('calendar');
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="px-4.5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer hover:-translate-y-0.5"
                                    title="View scheduling grid for this space"
                                  >
                                    Schedule
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                      )}
                    </div>
                  ) : (
                  <FloorPlanView
                    rooms={rooms}
                    filteredRooms={filteredRooms}
                    adminBookings={adminBookings}
                    onChooseSlot={(room) => {
                      setConfirmRoomSelection(room);
                      setPreselectedRoomId(room.id);
                    }}
                    onViewHistory={(room) => setSelectedRoomForHistory(room)}
                    onShowQR={(room) => {
                      setSelectedQRRoom(room);
                      setScanComplete(false);
                    }}
                  />
                )}
                </div>
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

      {/* MODAL: QR Sensor Simulator Overlay */}
      <AnimatePresence>
        {selectedQRRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-6 text-center"
            >
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest font-mono">QR PLAQUE SENSOR DECODER</span>
                <h3 className="text-lg font-black text-white">{selectedQRRoom.name}</h3>
                <p className="text-slate-400 text-[11px]">Hold your mobile device up to the academic doorway QR matrix.</p>
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

      {/* MODAL: Full Real-time QR Code Scanner */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        rooms={rooms}
        onCheckInSuccess={triggerFastCheckIn}
      />

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
