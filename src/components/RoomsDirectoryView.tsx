import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Room, Booking } from '../types';
import { FloorPlanView } from './FloorPlanView';
import { GoogleCalendarService } from '../services/GoogleCalendarService';
import { bookingsAPI } from '../lib/api';
import { calculateRoomStatus } from '../utils/roomStatus';
import { motion, AnimatePresence } from 'motion/react';
import {
  Scan,
  Plus,
  Calendar,
  Award,
  Clock,
  Trash2,
  Download,
  Search,
  Building2,
  Layers,
  ArrowUpDown,
  SlidersHorizontal,
  RotateCcw,
  Check,
  Star,
  Users,
  Compass,
  Tv,
  Wifi,
  Wind,
  BookOpen,
  Accessibility,
  AlertTriangle,
  Grid,
  Map
} from 'lucide-react';

interface RoomsDirectoryViewProps {
  user: any;
  rooms: Room[];
  adminBookings: Booking[];
  loadingResources: boolean;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warn') => void;
  fetchDashboardModels: (role: string) => void;
  setActiveTab: (tab: any) => void;
  syncRoomsStatusFromCalendar: () => void;
  handleDownloadCSV: () => void;
  setConfirmModal: (modal: any) => void;
  setSelectedRoomForHistory: (room: Room) => void;
  setSelectedRoomForDetails: (room: Room) => void;
  setConfirmRoomSelection: (room: Room) => void;
  setPreselectedRoomId: (id: string | null) => void;
  preselectedRoomId: string | null;
  isDarkMode?: boolean;
}

interface SuggestionItem {
  id: string;
  type: 'building' | 'category' | 'room';
  text: string;
  subtext: string;
  value: string;
}

export function RoomsDirectoryView({
  user,
  rooms,
  adminBookings,
  loadingResources,
  addToast,
  fetchDashboardModels,
  setActiveTab,
  syncRoomsStatusFromCalendar,
  handleDownloadCSV,
  setConfirmModal,
  setSelectedRoomForHistory,
  setSelectedRoomForDetails,
  setConfirmRoomSelection,
  setPreselectedRoomId,
  preselectedRoomId,
  isDarkMode = true,
}: RoomsDirectoryViewProps) {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const [srAnnouncement, setSrAnnouncement] = useState<string>('');
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [sortKey, setSortKey] = useState<'default' | 'capacity-asc' | 'capacity-desc' | 'available-first' | 'booked-first'>('default');
  const [directoryViewMode, setDirectoryViewMode] = useState<'grid' | 'floorplan'>('grid');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'available'>('all');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFeatureToggles, setSelectedFeatureToggles] = useState<string[]>([]);

  // Derived options
  const uniqueBuildings = useMemo(() => {
    const buildingsSet = new Set<string>();
    rooms.forEach((room) => {
      if (room.building) buildingsSet.add(room.building);
    });
    return Array.from(buildingsSet);
  }, [rooms]);

  const uniqueDepartments = useMemo(() => {
    const deptSet = new Set<string>();
    rooms.forEach((room) => {
      if (room.contactDepartment) deptSet.add(room.contactDepartment);
    });
    return Array.from(deptSet);
  }, [rooms]);

  const uniqueCategories = useMemo(() => {
    const catSet = new Set<string>();
    rooms.forEach((room) => {
      if (room.category) catSet.add(room.category);
    });
    return Array.from(catSet);
  }, [rooms]);

  // Derived user bookings
  const userBookings = useMemo(() => {
    if (!user?.email) return [];
    return adminBookings.filter(b => b.creator_email?.toLowerCase() === user.email.toLowerCase());
  }, [adminBookings, user?.email]);

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

    Array.from(suggestedBuildings).slice(0, 3).forEach(b => {
      items.push({
        id: `building-${b}`,
        type: 'building',
        text: b,
        subtext: 'Search rooms in this building',
        value: b
      });
    });

    Array.from(suggestedCategories).slice(0, 3).forEach(c => {
      items.push({
        id: `category-${c}`,
        type: 'category',
        text: c,
        subtext: 'Search rooms of this category',
        value: c
      });
    });

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
      if (selectedDepartment !== 'all' && room.contactDepartment !== selectedDepartment) return false;
      if (selectedCategory !== 'all' && room.category !== selectedCategory) return false;
      for (const f of selectedFeatureToggles) {
        if (!matchesFeature(room, f)) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = room.name.toLowerCase().includes(query);
        const matchesBuilding = room.building?.toLowerCase().includes(query) || false;
        const matchesDepartment = room.contactDepartment?.toLowerCase().includes(query) || false;
        const matchesCategory = room.category?.toLowerCase().includes(query) || false;
        const matchesBestFor = room.bestFor?.toLowerCase().includes(query) || false;
        const matchesFeatureDescription = room.features.some((feature) =>
          feature.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesBuilding && !matchesDepartment && !matchesCategory && !matchesBestFor && !matchesFeatureDescription) return false;
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

  return (
    <div className="space-y-6">
      {/* Modern Welcoming Hero Banner */}
      <div className="p-6 bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-900/40 rounded-3xl text-left relative overflow-hidden shadow-xl">
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">IIT BHU Campus Scheduler 👋</span>
            <h2 className="text-xl font-extrabold tracking-tight text-white">Need to book an academic space today?</h2>
            <p className="text-xs text-slate-350 max-w-2xl leading-relaxed">
              Welcome, <strong className="text-indigo-300">{user?.name || user?.email || 'User'}</strong>. Browse live room statuses below. Click <strong className="text-indigo-300">"CHOOSE SLOT"</strong> to customize a schedule inside our interactive calendar, or click <strong className="text-indigo-300">"Quick Book"</strong> to reserve now!
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
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
              const startDate = new Date(b.start_time || b.startTime);
              const endDate = new Date(b.end_time || b.endTime);
              const isToday = startDate.toDateString() === new Date().toDateString();
              const timeStr = `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

              return (
                <div key={b.id} className="p-4 bg-slate-950/60 border border-indigo-900/20 hover:border-indigo-500/40 rounded-2xl flex flex-col justify-between gap-3.5 shadow-md hover:shadow-lg transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs bg-indigo-900/60 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded-lg border border-indigo-800/45 uppercase tracking-wider">
                        {b.room_name || b.roomName}
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
                                const calEvent = await GoogleCalendarService.createEvent({
                                  roomName: b.room_name || b.roomName,
                                  summary: b.summary,
                                  startTime: b.start_time || b.startTime,
                                  endTime: b.end_time || b.endTime,
                                  agenda: b.agenda || '',
                                  attendeeEmail: b.attendee_email || b.attendeeEmail || '',
                                  creatorName: b.creator_name || b.creatorName,
                                  creatorEmail: b.creator_email || b.creatorEmail,
                                });

                                if (calEvent && calEvent.id) {
                                  await bookingsAPI.update(b.id, {
                                    roomId: b.room_id || b.roomId,
                                    roomName: b.room_name || b.roomName,
                                    summary: b.summary,
                                    agenda: b.agenda,
                                    startTime: b.start_time || b.startTime,
                                    endTime: b.end_time || b.endTime,
                                    attendeeEmail: b.attendee_email || b.attendeeEmail,
                                    facultyId: b.faculty_id || b.facultyId,
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
                                  roomId: b.room_id || b.roomId,
                                  roomName: b.room_name || b.roomName,
                                  summary: b.summary,
                                  agenda: b.agenda,
                                  startTime: b.start_time || b.startTime,
                                  endTime: b.end_time || b.endTime,
                                  attendeeEmail: b.attendee_email || b.attendeeEmail,
                                  facultyId: b.faculty_id || b.facultyId,
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
                          message: `Are you sure you want to release the booking "${b.summary}" for "${b.room_name || b.roomName}"?\n\nThis will permanently cancel your scheduled academic slot.`,
                          confirmText: 'Drop Booking',
                          cancelText: 'Keep Booking',
                          isDanger: true,
                          requiredTextToConfirm: 'DECOMMISSION',
                          onConfirm: async () => {
                            try {
                              const gToken = sessionStorage.getItem('google_workspace_access_token');
                              if (gToken && b.google_event_id) {
                                try {
                                  await GoogleCalendarService.deleteEvent(b.google_event_id);
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
            <h2 className="text-lg font-bold tracking-tight text-white">Active Room Directory</h2>
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
              {(minCapacity > 0 || statusFilter !== 'all' || selectedFeatureToggles.length > 0 || searchQuery.trim() !== '' || sortKey !== 'default' || selectedBuilding !== 'all' || selectedDepartment !== 'all' || selectedCategory !== 'all') && (
                <button
                  onClick={() => {
                    setMinCapacity(0);
                    setStatusFilter('all');
                    setSelectedBuilding('all');
                    setSelectedDepartment('all');
                    setSelectedCategory('all');
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

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-2 text-left">
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-mono">Minimum Seats</span>
                <div className="flex flex-wrap gap-1">
                  {[0, 15, 30, 50, 100].map((cap) => {
                    const active = minCapacity === cap;
                    return (
                      <button
                        key={cap}
                        onClick={() => setMinCapacity(cap)}
                        className={`text-[10px] font-extrabold py-1 px-2 rounded-lg border transition-all cursor-pointer ${
                          active ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {cap === 0 ? 'Any' : `${cap}+`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-mono">Availability</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    { value: 'all', label: 'All Slots' },
                    { value: 'available', label: 'Available' }
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
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-mono">Building / Zone</span>
                <select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  className="text-[11px] font-bold w-full py-2 px-2.5 rounded-lg border transition-all bg-slate-950 border-slate-800 text-slate-300 focus:border-indigo-500 outline-none"
                >
                  <option value="all">All Buildings</option>
                  {uniqueBuildings.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-mono">Department / Unit</span>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="text-[11px] font-bold w-full py-2 px-2.5 rounded-lg border transition-all bg-slate-950 border-slate-800 text-slate-300 focus:border-indigo-500 outline-none"
                >
                  <option value="all">All Departments</option>
                  {uniqueDepartments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-mono">Room Type</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-[11px] font-bold w-full py-2 px-2.5 rounded-lg border transition-all bg-slate-950 border-slate-800 text-slate-300 focus:border-indigo-500 outline-none"
                >
                  <option value="all">All Room Types</option>
                  {uniqueCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-mono">Amenities</span>
                <div className="flex flex-wrap gap-1">
                  {['Projector', 'Whiteboard', 'Display/Screen', 'Audio/Video'].map((feat) => {
                    const isSelected = selectedFeatureToggles.includes(feat);
                    return (
                      <button
                        key={feat}
                        onClick={() => {
                          setSelectedFeatureToggles(prev =>
                            isSelected ? prev.filter(t => t !== feat) : [...prev, feat]
                          );
                        }}
                        className={`text-[9.5px] font-semibold py-1 px-2 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected ? 'bg-indigo-950 text-indigo-300 border-indigo-800' : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-350'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-indigo-400" />}
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
              <SlidersHorizontal className="w-12 h-12 text-teal-500 mx-auto mb-4" />
              <h3 className="text-base font-bold text-slate-200">
                {selectedDepartment !== 'all' 
                  ? `No verified public rooms for ${selectedDepartment}`
                  : 'No matching rooms found'}
              </h3>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                {selectedDepartment !== 'all'
                  ? `There is no publicly available room data published for this department on official IIT (BHU) portals. Administrators can add room details via the Admin Panel.`
                  : `We couldn't find any rooms that match your active criteria. Try clearing filters or searching for another room name.`}
              </p>
              {selectedDepartment !== 'all' && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Go to Admin Panel to Add Room</span>
                </button>
              )}
            </div>
          ) : (
            filteredRooms.map((room) => {
              const rating = room.capacity > 100 ? '4.9' : room.capacity > 30 ? '4.8' : '4.7';
              const reviewCount = room.capacity > 100 ? '42 reviews' : room.capacity > 30 ? '28 reviews' : '15 reviews';
              const liveStatus = calculateRoomStatus(room, adminBookings);

              return (
                <div
                  key={room.id}
                  className="bg-white border border-[#ead29c]/40 rounded-3xl overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group text-slate-900"
                >
                  <div>
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={room.image || undefined}
                        alt={room.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

                      <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
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

                        {room.isVerified ? (
                          <span className="bg-teal-900/90 text-teal-100 border border-teal-500/40 text-[9px] font-bold py-1 px-2.5 rounded-lg shadow backdrop-blur-md flex items-center gap-1" title={room.verificationSource || 'Verified from official IIT (BHU) public sources'}>
                            <Check className="w-3 h-3 text-teal-300" />
                            <span>Publicly Verified IIT (BHU)</span>
                          </span>
                        ) : (
                          <span className="bg-amber-900/90 text-amber-100 border border-amber-500/40 text-[9px] font-bold py-1 px-2.5 rounded-lg shadow backdrop-blur-md flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-300" />
                            <span>Unverified Details</span>
                          </span>
                        )}
                      </div>

                      <div className="absolute top-4 right-4">
                        <div className="bg-[#faf8f2]/95 backdrop-blur-sm border border-[#ead29c] rounded-xl px-2.5 py-1 flex items-center gap-1 shadow-md">
                          <Star className="w-3.5 h-3.5 fill-[#c09728] text-[#c09728]" />
                          <span className="text-[11px] font-extrabold text-[#0a4735] font-mono">{rating}</span>
                          <span className="text-[9px] text-slate-500">({reviewCount})</span>
                        </div>
                      </div>

                      <div className="absolute bottom-4 left-4 right-4 text-left">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          {(room.contactDepartment || room.department) && (
                            <span className="bg-teal-950 text-teal-200 text-[9px] font-extrabold uppercase py-0.5 px-2 rounded-md border border-teal-800/60 tracking-wider font-mono">
                              {room.contactDepartment || room.department}
                            </span>
                          )}
                          {room.category && (
                            <span className="bg-[#dfb965] text-[#0a4735] text-[9px] font-extrabold uppercase py-0.5 px-2 rounded-md border border-[#ead29c]/50 tracking-wider font-mono">
                              {room.category}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-display font-extrabold text-white leading-tight drop-shadow-lg">
                          {room.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 mt-1.5 text-xs text-stone-200 font-sans">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-[#dfb965]" />
                            <strong>{room.capacity > 0 ? room.capacity : 'N/A'}</strong> standard capacity
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

                    <div className="p-6 space-y-4">
                      {/* Missing Info Warning Notice */}
                      {room.missingInfo && room.missingInfo.length > 0 && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-left flex items-start gap-2 text-xs text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-[10.5px] uppercase tracking-wider block text-amber-800 font-mono">
                              Missing Public Info: {room.missingInfo.join(', ')}
                            </span>
                            <span className="text-[10px] text-amber-700 block mt-0.5">
                              This field is not explicitly detailed in public departmental documentation. Admin can update it in Admin Panel.
                            </span>
                          </div>
                        </div>
                      )}
                      {room.bestFor && (
                        <div className="space-y-1 text-xs text-left">
                          <span className="block text-[9px] font-bold text-[#c09728] uppercase tracking-widest font-mono">Best suited for</span>
                          <p className="text-slate-500 leading-relaxed font-serif font-light">{room.bestFor}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {room.features.map((f, i) => {
                          const text = f.toLowerCase();
                          let icon = <Compass className="w-3.5 h-3.5 text-[#0a4735]" />;
                          if (text.includes('projector') || text.includes('display') || text.includes('screen')) {
                            icon = <Tv className="w-3.5 h-3.5 text-[#0a4735]" />;
                          } else if (text.includes('sound') || text.includes('audio') || text.includes('video') || text.includes('conferencing')) {
                            icon = <Wifi className="w-3.5 h-3.5 text-[#c09728]" />;
                          } else if (text.includes('ac') || text.includes('air conditioning') || text.includes('wind')) {
                            icon = <Wind className="w-3.5 h-3.5 text-sky-600" />;
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

                      <div className="pt-4 border-t border-[#ead29c]/30 text-left">
                        {(() => {
                          const roomBookings = adminBookings.filter(b =>
                            (b.room_name || b.roomName || '').toLowerCase().includes(room.name.toLowerCase()) ||
                            room.name.toLowerCase().includes((b.room_name || b.roomName || '').toLowerCase())
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
                                    const startDate = new Date(b.start_time || b.startTime || '');
                                    const endDate = new Date(b.end_time || b.endTime || '');
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
                                          <span className="truncate max-w-[90px]" title={b.creator_name || b.creatorName}>
                                            By: {(b.creator_name || b.creatorName || '').split(' ')[0]}
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

                  <div className="p-5 pt-4 border-t border-[#ead29c]/25 flex items-center justify-end gap-2.5 bg-[#faf8f2]/30 shrink-0">
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
        />
      )}
    </div>
  );
}
