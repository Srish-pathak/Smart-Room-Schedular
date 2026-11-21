import { useState, useMemo } from 'react';
import { 
  Plus, 
  Upload, 
  Users, 
  Trash2, 
  Shield, 
  FileSpreadsheet, 
  Upload as UploadIcon, 
  Check,
  X,
  Clock,
  ShieldAlert,
  Edit2
} from 'lucide-react';
import { Room, Booking, User } from '../types';
import { roomsAPI, adminAPI, bookingsAPI, auditAPI, defaultIITBHURooms } from '../lib/api';
import { ALL_IITBHU_DEPARTMENTS } from '../firebase/seedRooms';
import { GoogleCalendarService } from '../services/GoogleCalendarService';
import { DashboardStats } from './DashboardStats';

interface AdminPanelProps {
  rooms: Room[];
  adminBookings: Booking[];
  adminUsers: any[];
  user: User;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshData: () => void;
  setConfirmModal: (modal: any) => void;
  auditLogs: any[];
  setAuditLogs: React.Dispatch<React.SetStateAction<any[]>>;
  isDarkMode?: boolean;
}

export function AdminPanel({
  rooms,
  adminBookings,
  adminUsers,
  user,
  addToast,
  onRefreshData,
  setConfirmModal,
  auditLogs,
  setAuditLogs,
  isDarkMode = true,
}: AdminPanelProps) {
  // Tabs & Views States
  const [adminRoomTab, setAdminRoomTab] = useState<'single' | 'bulk'>('single');
  const [adminTrendView, setAdminTrendView] = useState<'daily' | 'weekly'>('daily');

  // Approval flow states
  const [rejectingBookingId, setRejectingBookingId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<string | null>(null);

  // Single Room creation form state
  const [adminRoomName, setAdminRoomName] = useState('');
  const [adminRoomBuilding, setAdminRoomBuilding] = useState('Department Building');
  const [adminRoomFloor, setAdminRoomFloor] = useState('Ground Floor');
  const [adminRoomDepartment, setAdminRoomDepartment] = useState('Computer Science & Engineering');
  const [adminRoomType, setAdminRoomType] = useState('Conference Room');
  const [adminRoomCapacity, setAdminRoomCapacity] = useState<number>(50);
  const [adminRoomBufferTime, setAdminRoomBufferTime] = useState<number>(15);
  const [adminRoomColor, setAdminRoomColor] = useState('emerald');
  const [adminRoomFeatures, setAdminRoomFeatures] = useState('Projector, Smart Board, AC, Wi-Fi');
  const [adminRoomImage, setAdminRoomImage] = useState('');
  const [adminRoomVerificationSource, setAdminRoomVerificationSource] = useState('Administrator Verified Entry');

  // Edit Room Modal state
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editName, setEditName] = useState('');
  const [editBuilding, setEditBuilding] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRoomType, setEditRoomType] = useState('');
  const [editCapacity, setEditCapacity] = useState<number>(0);
  const [editFacilities, setEditFacilities] = useState('');
  const [editVerificationSource, setEditVerificationSource] = useState('');
  const [editIsVerified, setEditIsVerified] = useState(true);

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setEditName(room.name || '');
    setEditBuilding(room.building || '');
    setEditDepartment(room.contactDepartment || room.department || 'Central Administration & Academic Affairs');
    setEditRoomType(room.roomType || room.category || 'Conference Room');
    setEditCapacity(room.capacity || 0);
    setEditFacilities((room.facilities || room.features || []).join(', '));
    setEditVerificationSource(room.verificationSource || 'Verified by Admin');
    setEditIsVerified(room.isVerified !== false);
  };

  const handleSaveEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    try {
      const facilitiesArr = editFacilities.split(',').map(f => f.trim()).filter(Boolean);
      await roomsAPI.update(editingRoom.id, {
        name: editName,
        building: editBuilding,
        contactDepartment: editDepartment,
        department: editDepartment,
        roomType: editRoomType,
        category: editRoomType,
        capacity: Number(editCapacity),
        facilities: facilitiesArr,
        features: facilitiesArr,
        verificationSource: editVerificationSource,
        isVerified: editIsVerified
      });
      addToast(`Updated room details for "${editName}" successfully!`, 'success');
      setEditingRoom(null);
      onRefreshData();
    } catch (err: any) {
      addToast(`Update error: ${err.message}`, 'error');
    }
  };

  const handleReseedIITBHURooms = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reseed Official IIT (BHU) Rooms Dataset?',
      message: `This will seed/refresh all verified IIT (BHU) Varanasi rooms, auditoriums, lecture halls, and laboratories into Firestore.\n\nTotal rooms to seed: ${defaultIITBHURooms.length} spaces.`,
      confirmText: 'Seed Dataset',
      cancelText: 'Cancel',
      isDanger: false,
      onConfirm: async () => {
        try {
          await roomsAPI.seedAllIITBHURooms();
          addToast(`Successfully seeded ${defaultIITBHURooms.length} verified IIT (BHU) rooms into Firestore!`, 'success');
          onRefreshData();
        } catch (err: any) {
          addToast(`Failed to seed dataset: ${err.message}`, 'error');
        }
      }
    });
  };

  // Bulk CSV States
  const [csvText, setCsvText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [parsedRooms, setParsedRooms] = useState<any[]>([]);

  // Calculate statistics for the dashboard
  const occupancyStats = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    const roomMap: Record<string, number> = {};
    const dayOfWeekMap: Record<string, number> = {
      'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
    };

    let totalHours = 0;

    adminBookings.forEach((b) => {
      const startVal = b.start_time || b.startTime;
      const endVal = b.end_time || b.endTime;
      if (!startVal || !endVal) return;

      const start = new Date(startVal);
      const end = new Date(endVal);
      const diffMs = end.getTime() - start.getTime();
      const durationHours = Math.max(0, diffMs / (1000 * 60 * 60));

      totalHours += durationHours;

      // Group by date
      const year = start.getFullYear();
      const month = String(start.getMonth() + 1).padStart(2, '0');
      const day = String(start.getDate()).padStart(2, '0');
      const isoDate = `${year}-${month}-${day}`;

      dailyMap[isoDate] = (dailyMap[isoDate] || 0) + durationHours;

      // Group by room
      const rName = b.room_name || b.roomName || 'Unknown Space';
      roomMap[rName] = (roomMap[rName] || 0) + durationHours;

      // Group by day of week
      const weekday = start.toLocaleDateString([], { weekday: 'short' });
      if (weekday in dayOfWeekMap) {
        dayOfWeekMap[weekday] += durationHours;
      } else {
        const dayIndex = start.getDay();
        const mapDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayStr = mapDays[dayIndex];
        dayOfWeekMap[dayStr] = (dayOfWeekMap[dayStr] || 0) + durationHours;
      }
    });

    // Format daily data chronologically
    const dailyData = Object.keys(dailyMap)
      .sort()
      .map(isoDate => {
        const [y, m, d] = isoDate.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
        return {
          date: formattedDate,
          rawDate: isoDate,
          hours: parseFloat(dailyMap[isoDate].toFixed(1))
        };
      })
      .slice(-10);

    // Format room data
    const roomData = Object.keys(roomMap)
      .map(room => ({
        room: room.length > 18 ? room.substring(0, 16) + '..' : room,
        fullName: room,
        hours: parseFloat(roomMap[room].toFixed(1))
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8);

    // Format day of week data
    const daysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dowData = daysOrder.map(day => ({
      day,
      hours: parseFloat(dayOfWeekMap[day].toFixed(1))
    }));

    const avgDuration = adminBookings.length > 0 ? (totalHours / adminBookings.length) : 0;

    let mostPopularRoom = 'N/A';
    let maxRoomHours = 0;
    Object.keys(roomMap).forEach(r => {
      if (roomMap[r] > maxRoomHours) {
        maxRoomHours = roomMap[r];
        mostPopularRoom = r;
      }
    });

    return {
      dailyData,
      roomData,
      dowData,
      totalHours: parseFloat(totalHours.toFixed(1)),
      avgDuration: parseFloat(avgDuration.toFixed(1)),
      mostPopularRoom,
      totalBookingsCount: adminBookings.length
    };
  }, [adminBookings]);

  // Handle addition of a single room space
  const handleAdminAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const facilitiesArr = adminRoomFeatures.split(',').map(f => f.trim()).filter(Boolean);
      const payload = {
        name: adminRoomName,
        roomName: adminRoomName,
        building: adminRoomBuilding,
        floor: adminRoomFloor,
        contactDepartment: adminRoomDepartment,
        department: adminRoomDepartment,
        category: adminRoomType,
        roomType: adminRoomType,
        capacity: Number(adminRoomCapacity),
        buffer_time: Number(adminRoomBufferTime),
        features: facilitiesArr,
        facilities: facilitiesArr,
        image: adminRoomImage || undefined,
        color: adminRoomColor,
        isVerified: true,
        verificationSource: adminRoomVerificationSource || 'Administrator Verified Entry'
      };
      await roomsAPI.create(payload);
      addToast(`New verified room "${adminRoomName}" created successfully!`, 'success');
      setAdminRoomName('');
      setAdminRoomFeatures('Projector, Smart Board, AC, Wi-Fi');
      setAdminRoomBufferTime(15);
      setAdminRoomImage('');
      onRefreshData();
    } catch (err: any) {
      addToast(`Admin operation error: ${err.message}`, 'error');
    }
  };

  // Parse CSV payload for bulk room imports
  const handleParseCsv = (text: string) => {
    try {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length === 0) {
        setParsedRooms([]);
        setCsvErrors(['No content provided.']);
        return;
      }

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
      onRefreshData();
    } catch (err: any) {
      addToast(`Bulk entry error: ${err.message}`, 'error');
    }
  };

  const handleAdminDeleteRoom = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Decommission Smart Space?',
      message: `Are you sure you want to permanently decommission "${name}"?\n\nThis is a highly destructive database operation that will instantly purge all academic Schedules and user Bookings linked with this room space.`,
      confirmText: 'Decommission',
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        try {
          await roomsAPI.delete(id);
          addToast(`Space ${name} decommissioned from database.`, 'success');
          onRefreshData();
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
      onRefreshData();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="p-4.5 bg-slate-900 rounded-2xl border border-red-950/40 text-left flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-rose-300">Administrative Oversight</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verify registered academic accounts, modify structural permissions, manage rooms metadata, or force-delete booked slots.
          </p>
        </div>
        <button
          onClick={handleReseedIITBHURooms}
          className="px-3.5 py-2 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>🌱 Seed Official IIT (BHU) Dataset</span>
        </button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Room Name / Number*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE Conference Room / Room 201"
                    value={adminRoomName}
                    onChange={(e) => setAdminRoomName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Department*</label>
                  <select
                    value={adminRoomDepartment}
                    onChange={(e) => setAdminRoomDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-teal-500"
                  >
                    {ALL_IITBHU_DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Building Name*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE Department Building"
                    value={adminRoomBuilding}
                    onChange={(e) => setAdminRoomBuilding(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Room Type*</label>
                  <select
                    value={adminRoomType}
                    onChange={(e) => setAdminRoomType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-teal-500"
                  >
                    <option value="Seminar Hall">Seminar Hall</option>
                    <option value="Conference Room">Conference Room</option>
                    <option value="Classroom">Classroom</option>
                    <option value="Lab">Lab</option>
                    <option value="Meeting Room">Meeting Room</option>
                    <option value="Auditorium">Auditorium</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Capacity (seats)*</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={adminRoomCapacity}
                    onChange={(e) => setAdminRoomCapacity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Available Facilities (Comma split)</label>
                <input
                  type="text"
                  placeholder="e.g. Projector, Smart Board, AC, Video Conferencing, Wi-Fi"
                  value={adminRoomFeatures}
                  onChange={(e) => setAdminRoomFeatures(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Verification Source</label>
                  <input
                    type="text"
                    placeholder="e.g. Official Departmental Website / Records"
                    value={adminRoomVerificationSource}
                    onChange={(e) => setAdminRoomVerificationSource(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Photo URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. https://images.unsplash.com/photo-1517502884422"
                    value={adminRoomImage}
                    onChange={(e) => setAdminRoomImage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase cursor-pointer transition-colors shadow-md"
              >
                + Add Verified Room Entry
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
                  <p className="text-xs font-semibold text-slate-300">Drag &amp; Drop room .csv file here</p>
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
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder:text-slate-705 outline-none focus:border-indigo-500 font-mono"
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
                            <span className={`w-3 h-3 rounded-full bg-gradient-to-tr ${room.color}`} style={{ width: '12px', height: '12px' }} />
                            <strong className="text-slate-200">{room.name}</strong>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {room.features.slice(0, 3).map((feat: string, fidx: number) => (
                              <span key={fidx} className="px-1.5 py-0.5 bg-slate-900 border border-slate-850 rounded text-[9px] text-slate-400">
                                {feat}
                              </span>
                            ))}
                            {room.features.length > 3 && (
                              <span className="text-[9px] text-slate-500 self-center">
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
                    className="w-full bg-indigo-600 hover:bg-indigo-505 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 transition-colors mt-2 cursor-pointer"
                  >
                    <UploadIcon className="w-4 h-4" />
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
                      'border-amber-900 text-amber-400'
                    }`}
                  >
                    <option value="user">User</option>
                    <option value="admin">Platform Admin</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RENDER DYNAMIC DASHBOARD CHARTS */}
      <DashboardStats 
        occupancyStats={occupancyStats}
        adminTrendView={adminTrendView}
        setAdminTrendView={setAdminTrendView}
        isDarkMode={isDarkMode}
      />

      {/* Pending Academic Booking Approvals */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl mb-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-850 mb-4 text-left">
          <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
          Pending Academic Booking Approvals ({adminBookings.filter(b => b.status === 'Pending').length})
        </h3>
        {adminBookings.filter(b => b.status === 'Pending').length === 0 ? (
          <p className="text-slate-500 italic text-xs py-6 text-center bg-slate-950/40 border border-slate-850/40 rounded-xl">
            No pending reservations require attention. Great job!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
            {adminBookings.filter(b => b.status === 'Pending').map((b) => (
              <div
                key={b.id}
                className="p-4 bg-slate-950 border border-amber-900/30 rounded-xl flex flex-col justify-between text-xs gap-3 text-left animate-fade-in relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 bg-amber-500/10 text-amber-450 px-2 py-0.5 rounded-bl-lg font-bold tracking-wider font-mono text-[9px] uppercase animate-pulse">
                  Pending
                </div>
                
                <div className="space-y-1.5 w-full">
                  <span className="font-extrabold text-indigo-300 block text-sm">Space: {b.room_name}</span>
                  <span className="font-semibold text-slate-200 block text-xs">Purpose: {b.summary}</span>
                  {b.agenda && (
                    <span className="text-slate-400 block italic bg-slate-900/40 p-2 rounded border border-slate-850/50">
                      Agenda: {b.agenda}
                    </span>
                  )}
                  <div className="space-y-0.5 pt-1 text-slate-400 font-mono text-[10px]">
                    <span className="block">📅 Date: {new Date(b.start_time).toLocaleDateString()}</span>
                    <span className="block">🕒 Time: {new Date(b.start_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} - {new Date(b.end_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                    <span className="block text-slate-450">👤 Requester: <strong className="text-slate-300">{b.creator_name}</strong> ({b.creator_email})</span>
                    {b.faculty_id && <span className="block text-slate-450">🎓 Sponsor ID: <strong className="text-slate-300">{b.faculty_id}</strong></span>}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-850/70 flex items-center justify-end gap-2.5">
                  <button
                    disabled={isSubmittingApproval !== null}
                    onClick={async () => {
                      setRejectingBookingId(b.id);
                      setRejectionReasonInput('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/50 text-rose-300 hover:bg-rose-900 border border-rose-800/40 text-[10px] font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject Request
                  </button>
                  <button
                    disabled={isSubmittingApproval !== null}
                    onClick={async () => {
                      try {
                        setIsSubmittingApproval(b.id);
                        addToast(`Approving slot and generating Meet & Calendar invites...`, 'info');
                        await bookingsAPI.approve(b.id);
                        addToast('Booking successfully approved and synced!', 'success');
                        onRefreshData();
                      } catch (err: any) {
                        addToast(err.message || 'Approval failed', 'error');
                      } finally {
                        setIsSubmittingApproval(null);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/40 text-[10px] font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmittingApproval === b.id ? (
                      <span className="w-3.5 h-3.5 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Approve & Sync
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
                className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex items-start justify-between text-xs gap-3 text-left animate-fade-in"
              >
                <div className="space-y-1 w-full">
                  <span className="font-extrabold text-indigo-300 block">Location: {b.room_name}</span>
                  <span className="font-semibold text-slate-200 block">Title: {b.summary}</span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    Date: {new Date(b.start_time).toLocaleDateString()} | {new Date(b.start_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} - {new Date(b.end_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  </span>
                  <span className="text-[9px] text-slate-500 block font-mono">Reserved by: {b.creator_name} ({b.creator_email})</span>

                  {/* Google Calendar Sync status tracking */}
                  <div className="mt-2 pt-2 border-t border-slate-800/85 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Sync:</span>
                      {b.google_sync_status === 'synced' ? (
                        <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-400" />
                          Synced ✓
                        </span>
                      ) : b.google_sync_status === 'failed' ? (
                        <span className="text-[10px] text-rose-450 font-medium bg-rose-950/40 border border-rose-900/30 px-1.5 py-0.5 rounded flex items-center gap-1" title={b.google_sync_error || 'Synchronization failed'}>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-450 animate-pulse" />
                          Failed ✕
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-450 font-medium bg-amber-950/40 border border-amber-900/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-amber-450" />
                          No Sync
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
                                onRefreshData();
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
                              onRefreshData();
                            }
                          }}
                          className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 hover:bg-indigo-900 border border-indigo-800/40 text-[9px] font-semibold cursor-pointer transition-colors"
                        >
                          Resync ↻
                        </button>
                      )}

                      {b.google_calendar_link && (
                        <a
                          href={b.google_calendar_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 hover:bg-teal-900 border border-teal-800/40 text-[9px] font-semibold transition-colors"
                        >
                          Open Calendar
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: 'Decommission Booking Request',
                      message: `Are you sure you want to permanently delete the booking "${b.summary}" for room "${b.room_name}"?\n\nThis academic slot will become instantly vacant for other user schedules.`,
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
                          addToast('Booking dismissed.', 'success');
                          onRefreshData();
                        } catch (err: any) {
                          addToast(err.message, 'error');
                        }
                      }
                    });
                  }}
                  className="text-slate-400 hover:text-rose-450 p-2 hover:bg-slate-900 rounded-full transition-all shrink-0 cursor-pointer"
                  title="Force Clear reservation slot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Space Management & Decommission List */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-slate-850 mb-4 text-left flex items-center justify-between">
          <span>Manage Registered Spaces ({rooms.length})</span>
          <span className="text-xs text-slate-400 font-normal">Edit information, missing fields, or decommission spaces</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map((item) => (
            <div
              key={item.id}
              className="p-3.5 bg-slate-950 border border-slate-855 rounded-xl flex items-center justify-between text-xs gap-3"
            >
              <div className="text-left space-y-1">
                <div className="flex items-center gap-2">
                  <strong className="text-slate-200 block text-sm">{item.name}</strong>
                  {item.isVerified ? (
                    <span className="text-[9px] bg-teal-950 text-teal-300 border border-teal-800/60 px-1.5 py-0.5 rounded font-mono">
                      Verified ✓
                    </span>
                  ) : (
                    <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800/60 px-1.5 py-0.5 rounded font-mono">
                      Unverified
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-teal-400 font-medium">
                  {item.contactDepartment || item.department || 'General Department'} ({item.building || 'Main Campus'})
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                  <span>Type: <strong className="text-slate-300">{item.roomType || item.category || 'N/A'}</strong></span>
                  <span>•</span>
                  <span>Capacity: <strong className="text-slate-300">{item.capacity || 'N/A'}</strong></span>
                </div>
                {item.missingInfo && item.missingInfo.length > 0 && (
                  <span className="text-[9.5px] text-amber-400 block font-mono">
                    ⚠️ Missing: {item.missingInfo.join(', ')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openEditModal(item)}
                  className="bg-teal-950 hover:bg-teal-900 text-teal-200 py-1.5 px-2.5 border border-teal-800/60 rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleAdminDeleteRoom(item.id, item.name)}
                  className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-350 py-1.5 px-2.5 border border-rose-900/40 rounded-lg font-bold font-mono text-[10px] cursor-pointer transition-colors"
                >
                  Purge
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Room Modal */}
      {editingRoom && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg animate-scale-in text-left space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-teal-400" />
                Edit Room Details: {editingRoom.name}
              </h4>
              <button
                onClick={() => setEditingRoom(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRoom} className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Room Name / Number</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Department</label>
                  <select
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none focus:border-teal-500"
                  >
                    {ALL_IITBHU_DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Building</label>
                  <input
                    type="text"
                    required
                    value={editBuilding}
                    onChange={(e) => setEditBuilding(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Room Type</label>
                  <select
                    value={editRoomType}
                    onChange={(e) => setEditRoomType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none focus:border-teal-500"
                  >
                    <option value="Seminar Hall">Seminar Hall</option>
                    <option value="Conference Room">Conference Room</option>
                    <option value="Classroom">Classroom</option>
                    <option value="Lab">Lab</option>
                    <option value="Meeting Room">Meeting Room</option>
                    <option value="Auditorium">Auditorium</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Facilities (comma split)</label>
                <input
                  type="text"
                  value={editFacilities}
                  onChange={(e) => setEditFacilities(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Verification Source</label>
                <input
                  type="text"
                  value={editVerificationSource}
                  onChange={(e) => setEditVerificationSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editIsVerified"
                  checked={editIsVerified}
                  onChange={(e) => setEditIsVerified(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-teal-500 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="editIsVerified" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Mark as Publicly Verified Room
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Academic Security & Audit Trail Logs (Admin Only) */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-left space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-855">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-5 h-5 text-indigo-400" />
              Academic Security &amp; System Audit Trail Logs
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Immutable ledger logging all security triggers, registrations, credentials authorization adjustments, and room reservation check-ins.
            </p>
          </div>
          <button
            onClick={async () => {
              try {
                const logs = await auditAPI.listLogs();
                setAuditLogs(Array.isArray(logs) ? logs : []);
                addToast('Audit trail ledger successfully refreshed!', 'success');
              } catch (err: any) {
                addToast(err.message || 'Ledger refresh failed', 'error');
              }
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 text-xs font-mono font-bold transition-colors cursor-pointer shrink-0"
          >
            REFRESH LEDGER
          </button>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-slate-500 italic text-xs py-4 text-center">No system events logged in security schemas yet.</p>
        ) : (
          <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
            {[...auditLogs].reverse().map((log: any, logIdx: number) => {
              const isSuccess = log.status === 'success';
              return (
                <div
                  key={log.id || logIdx}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-855 text-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-left transition-all hover:border-slate-800"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                        isSuccess
                          ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30'
                          : 'bg-rose-950/50 text-rose-450 border border-rose-900/30'
                      }`}>
                        {log.status}
                      </span>
                      <span className="font-extrabold text-indigo-300 font-mono text-[10px] uppercase tracking-wider">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono font-medium">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-sans mt-1">
                      {log.details}
                    </p>
                  </div>
                  <div className="md:text-right shrink-0">
                    <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider font-bold block">Operator:</span>
                    <span className="text-[10px] text-indigo-400/90 font-semibold block truncate max-w-[200px]" title={log.email}>
                      {log.email}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rejection Reason Prompt Modal */}
      {rejectingBookingId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md animate-scale-in text-left">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              Specify Rejection Reason
            </h4>
            <p className="text-slate-400 text-xs mb-4">
              Please enter the academic justification or scheduling reason for rejecting this booking request. An automated email will notify the student.
            </p>
            <textarea
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder="e.g. Overlapping department exam session, or Room closed for maintenance."
              className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg p-3 min-h-[100px] mb-4 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRejectingBookingId(null)}
                className="px-4 py-2 text-xs bg-slate-950 text-slate-400 rounded-lg hover:bg-slate-850 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={!rejectionReasonInput.trim()}
                onClick={async () => {
                  try {
                    const id = rejectingBookingId;
                    setRejectingBookingId(null);
                    addToast('Processing rejection and cleaning schedules...', 'info');
                    await bookingsAPI.reject(id, rejectionReasonInput);
                    addToast('Booking successfully rejected.', 'success');
                    onRefreshData();
                  } catch (err: any) {
                    addToast(err.message || 'Rejection failed', 'error');
                  }
                }}
                className="px-4 py-2 text-xs bg-rose-950/70 text-rose-300 rounded-lg border border-rose-800/40 hover:bg-rose-900 transition-all font-semibold disabled:opacity-40"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
