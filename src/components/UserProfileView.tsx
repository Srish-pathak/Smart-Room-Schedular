import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Booking, Room } from '../types';
import { authAPI } from '../lib/api';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { 
  User as UserIcon, 
  Mail, 
  Building, 
  Phone, 
  Clock, 
  CheckCircle, 
  Save, 
  Camera, 
  Check, 
  Award, 
  ShieldCheck,
  Wrench,
  Send,
  MessageSquare,
  FileText,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface UserProfileViewProps {
  user: any;
  bookings: Booking[];
  rooms?: Room[];
  isDarkMode: boolean;
  onProfileUpdated: (updatedUser: any) => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Abishek',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Rajeev',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Nisha',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Vikram',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Ananya',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Kabir'
];

export const UserProfileView = ({
  user,
  bookings,
  rooms = [],
  isDarkMode,
  onProfileUpdated,
  addToast
}: UserProfileViewProps) => {
  const [name, setName] = useState(user?.fullName || user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || PRESET_AVATARS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  // Feedback specific states
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [issueType, setIssueType] = useState('it_equipment');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [myFeedback, setMyFeedback] = useState<any[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const fetchMyFeedback = async () => {
    if (!user?.uid && !user?.id) return;
    setLoadingFeedback(true);
    try {
      const userId = user.id || user.uid;
      const q = query(
        collection(db, 'feedback'),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyFeedback(list);
    } catch (err) {
      console.error('Error fetching feedback:', err);
    } finally {
      setLoadingFeedback(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyFeedback();
    }
  }, [user]);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      addToast('Please select a room', 'error');
      return;
    }
    if (!issueTitle.trim() || !issueDesc.trim()) {
      addToast('Please fill in all fields', 'error');
      return;
    }
    
    setIsSubmittingFeedback(true);
    try {
      const selectedRoom = (rooms || []).find(r => r.id === selectedRoomId);
      const userId = user.id || user.uid;
      const feedbackDoc = {
        userId,
        reporterName: user.fullName || user.name || 'Faculty Member',
        reporterEmail: user.email,
        roomId: selectedRoomId,
        roomName: selectedRoom ? selectedRoom.name : 'Unknown Room',
        issueType,
        title: issueTitle.trim(),
        description: issueDesc.trim(),
        priority,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'feedback'), feedbackDoc);
      addToast('Maintenance issue reported successfully!', 'success');
      
      // Clear form
      setSelectedRoomId('');
      setIssueTitle('');
      setIssueDesc('');
      setPriority('medium');
      
      // Refresh list
      await fetchMyFeedback();
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      addToast(err.message || 'Failed to report issue', 'error');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Compute stats
  const nowStr = new Date().toISOString();
  const userBookings = bookings.filter(b => b.creatorEmail?.toLowerCase() === user?.email?.toLowerCase() || b.userId === user?.uid || b.userId === user?.id);
  
  const totalBookingsCount = userBookings.length;
  
  const upcomingBookingsCount = userBookings.filter(b => {
    return b.status === 'Approved' && b.startTime >= nowStr;
  }).length;

  const completedBookingsCount = userBookings.filter(b => {
    return b.status === 'Approved' && b.endTime < nowStr;
  }).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Name is required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await authAPI.updateProfile(user.id || user.uid, {
        name: name.trim(),
        fullName: name.trim(),
        department: department.trim(),
        phoneNumber: phoneNumber.trim(),
        profilePhoto: profilePhoto
      });
      onProfileUpdated(updated);
      addToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Welcome & Identity Card */}
      <div className={`p-6 rounded-3xl border relative overflow-hidden ${
        isDarkMode 
          ? 'bg-gradient-to-br from-indigo-950/40 to-slate-900 border-indigo-900/30' 
          : 'bg-gradient-to-br from-[#faf8f2] to-white border-[#ead29c]/40 shadow-sm'
      }`}>
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="relative group">
            <img 
              src={profilePhoto || undefined} 
              alt="Profile" 
              className="w-24 h-24 rounded-2xl border-2 border-indigo-500/30 object-cover bg-slate-850 p-1"
            />
            <button
              onClick={() => setShowAvatarSelector(!showAvatarSelector)}
              className="absolute -bottom-2 -right-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all cursor-pointer shadow-md flex items-center justify-center border border-indigo-400/20"
              title="Change avatar"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-[#0a4735]'}`}>
                  {name || 'IIT BHU Member'}
                </h2>
                {user?.role === 'admin' && (
                  <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-550/15 border border-red-500/30 text-red-400">
                    <ShieldCheck className="w-3 h-3" />
                    Admin
                  </span>
                )}
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-mono mt-0.5`}>
                {user?.email}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center md:justify-start text-xs font-mono">
              {department && (
                <span className={`px-2.5 py-1 rounded-lg border ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-stone-50 border-stone-200 text-stone-650'
                }`}>
                  🏢 {department}
                </span>
              )}
              {phoneNumber && (
                <span className={`px-2.5 py-1 rounded-lg border ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-stone-50 border-stone-200 text-stone-650'
                }`}>
                  📞 {phoneNumber}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Avatar Selection Drawer / Dropdown */}
        {showAvatarSelector && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-4 border rounded-2xl ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-stone-50 border-stone-200'
            }`}
          >
            <div className="flex justify-between items-center mb-3">
              <span className={`text-[10px] font-extrabold uppercase font-mono tracking-wider ${isDarkMode ? 'text-[#dfb965]' : 'text-[#0a4735]'}`}>
                Select Avatar Preset
              </span>
              <button 
                onClick={() => setShowAvatarSelector(false)}
                className="text-xs text-slate-400 hover:underline"
              >
                Done
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_AVATARS.map((avatar, idx) => {
                const isSelected = profilePhoto === avatar;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setProfilePhoto(avatar);
                    }}
                    className={`relative p-1 rounded-xl border-2 transition-all cursor-pointer bg-slate-900 ${
                      isSelected ? 'border-indigo-500 scale-105' : 'border-transparent hover:border-slate-700'
                    }`}
                  >
                    <img src={avatar || undefined} alt={`Avatar ${idx}`} className="w-12 h-12 object-cover" />
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[4px]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-3.5 pt-3.5 border-t border-slate-800/40">
              <label className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-slate-400 block mb-1">
                Or enter custom image URL
              </label>
              <input
                type="url"
                value={profilePhoto}
                onChange={(e) => setProfilePhoto(e.target.value)}
                className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono transition-all ${
                  isDarkMode 
                    ? 'bg-slate-900 border-slate-800 text-white focus:border-indigo-500 focus:outline-none' 
                    : 'bg-white border-stone-200 text-stone-800 focus:border-[#0a4735] focus:outline-none'
                }`}
                placeholder="https://example.com/avatar.png"
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Profile Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border flex items-center gap-4 ${
          isDarkMode ? 'bg-slate-900/50 border-slate-800/60' : 'bg-white border-stone-200/60 shadow-sm'
        }`}>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="text-left leading-snug">
            <span className="text-[9px] text-slate-500 block font-mono uppercase tracking-widest font-bold">Total Reservations</span>
            <strong className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-[#0a4735]'}`}>
              {totalBookingsCount}
            </strong>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border flex items-center gap-4 ${
          isDarkMode ? 'bg-slate-900/50 border-slate-800/60' : 'bg-white border-stone-200/60 shadow-sm'
        }`}>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-left leading-snug">
            <span className="text-[9px] text-slate-500 block font-mono uppercase tracking-widest font-bold">Upcoming Secured</span>
            <strong className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-[#0a4735]'}`}>
              {upcomingBookingsCount}
            </strong>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border flex items-center gap-4 ${
          isDarkMode ? 'bg-slate-900/50 border-slate-800/60' : 'bg-white border-stone-200/60 shadow-sm'
        }`}>
          <div className="p-3 rounded-xl bg-[#dfb965]/10 text-[#dfb965] border border-[#dfb965]/20 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="text-left leading-snug">
            <span className="text-[9px] text-slate-500 block font-mono uppercase tracking-widest font-bold">Completed Events</span>
            <strong className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-[#0a4735]'}`}>
              {completedBookingsCount}
            </strong>
          </div>
        </div>
      </div>

      {/* Editing Form Card */}
      <div className={`p-6 rounded-3xl border text-left ${
        isDarkMode ? 'bg-slate-900 border-slate-800/80' : 'bg-white border-stone-200 shadow-sm'
      }`}>
        <h3 className={`text-base font-extrabold mb-5 flex items-center gap-2 border-b pb-3 ${
          isDarkMode ? 'text-white border-slate-800' : 'text-[#0a4735] border-stone-100'
        }`}>
          <UserIcon className="w-4 h-4 text-indigo-400" />
          <span>Edit Profile Specifications</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-slate-400 block">
                Full Display Name
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:outline-none' 
                      : 'bg-stone-50 border-stone-200 text-stone-800 focus:border-[#0a4735] focus:outline-none'
                  }`}
                  placeholder="e.g. Abishek Kumar"
                  required
                />
              </div>
            </div>

            {/* Email (Read Only) */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-slate-400 block">
                Primary Academic Email (Immutable)
              </label>
              <div className="relative opacity-65">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs font-mono font-bold cursor-not-allowed ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-850 text-slate-400' 
                      : 'bg-[#faf8f2] border-stone-100 text-stone-500'
                  }`}
                />
              </div>
            </div>

            {/* Department */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-slate-400 block">
                IIT BHU Department / School
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Building className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:outline-none' 
                      : 'bg-stone-50 border-stone-200 text-stone-800 focus:border-[#0a4735] focus:outline-none'
                  }`}
                  placeholder="e.g. Computer Science & Engineering"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-slate-400 block">
                Mobile Contact Number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:outline-none' 
                      : 'bg-stone-50 border-stone-200 text-stone-800 focus:border-[#0a4735] focus:outline-none'
                  }`}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-2 ${
                isSubmitting
                  ? 'bg-slate-850 text-slate-500 cursor-not-allowed'
                  : isDarkMode
                    ? 'bg-indigo-600 hover:bg-indigo-550 text-white'
                    : 'bg-[#0a4735] hover:bg-[#063325] text-white'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Updating...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ==========================================
          SECTION: ROOM MAINTENANCE & ISSUE FEEDBACK
          ========================================== */}
      <div className={`p-6 rounded-3xl border text-left ${
        isDarkMode ? 'bg-slate-900 border-slate-800/80' : 'bg-white border-stone-200 shadow-sm'
      }`}>
        <h3 className={`text-base font-extrabold mb-2 flex items-center gap-2 border-b pb-3 ${
          isDarkMode ? 'text-white border-slate-800' : 'text-[#0a4735] border-stone-100'
        }`}>
          <Wrench className="w-4 h-4 text-indigo-400" />
          <span>Room Maintenance & Issue Feedback</span>
        </h3>

        {/* Render a friendly preview badge if student/user */}
        {user?.role !== 'faculty' && user?.role !== 'admin' && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 mt-3 ${
            isDarkMode ? 'bg-indigo-950/20 border-indigo-900/30 text-indigo-350' : 'bg-[#faf8f2] border-[#ead29c]/40 text-[#604c1e]'
          }`}>
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-indigo-400" />
            <div className="text-xs leading-relaxed text-left">
              <p className="font-bold">IIT BHU Preview: Student Submissions Enabled</p>
              <p className="opacity-80">In production, maintenance tickets are restricted to Faculty/Admins. In this workspace preview, student-level feedback has been unlocked so you can fully test this component.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-5">
            {/* Form Column */}
            <form onSubmit={handleFeedbackSubmit} className="lg:col-span-7 space-y-4">
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-4`}>
                Identify and report any hardware failures, maintenance needs, or clean-up requests for lecture halls and smart rooms.
              </p>

              {/* Room Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-slate-400 block">
                  Select Affected Space / Room *
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  required
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:outline-none' 
                      : 'bg-stone-50 border-stone-200 text-stone-800 focus:border-[#0a4735] focus:outline-none'
                  }`}
                >
                  <option value="">-- Choose Room --</option>
                  {(rooms || []).map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} {room.building ? `(${room.building})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Issue Type & Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-slate-400 block">
                    Category of Issue *
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    required
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:outline-none' 
                        : 'bg-stone-50 border-stone-200 text-stone-800 focus:border-[#0a4735] focus:outline-none'
                    }`}
                  >
                    <option value="it_equipment">💻 Projector / Display / IT Hardware</option>
                    <option value="maintenance">❄️ Air Conditioning / Ventilation</option>
                    <option value="electrical">💡 Lighting & Electrical Outlets</option>
                    <option value="furniture">🪑 Seating & Classroom Furniture</option>
                    <option value="cleanliness">🧹 Cleanliness & Janitorial Need</option>
                    <option value="other">❓ Other / Miscellaneous</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-slate-400 block">
                    Urgency / Priority *
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {['low', 'medium', 'high', 'critical'].map((p) => {
                      const colors: Record<string, string> = {
                        low: 'hover:border-emerald-500 text-emerald-500 checked:bg-emerald-500',
                        medium: 'hover:border-yellow-500 text-yellow-500 checked:bg-yellow-500',
                        high: 'hover:border-orange-500 text-orange-500 checked:bg-orange-500',
                        critical: 'hover:border-red-500 text-red-500 checked:bg-red-500',
                      };
                      const activeColors: Record<string, string> = {
                        low: 'bg-emerald-500/10 border-emerald-500 text-emerald-500',
                        medium: 'bg-yellow-500/10 border-yellow-550 text-yellow-500',
                        high: 'bg-orange-500/10 border-orange-500 text-orange-400',
                        critical: 'bg-red-500/10 border-red-500 text-red-400',
                      };
                      const isSelected = priority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected 
                              ? activeColors[p] 
                              : isDarkMode 
                                ? 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-300' 
                                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-slate-400 block">
                  Short Issue Title *
                </label>
                <input
                  type="text"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  placeholder="e.g. Projector bulb flickering in room LH-101"
                  required
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:outline-none' 
                      : 'bg-stone-50 border-stone-200 text-stone-800 focus:border-[#0a4735] focus:outline-none'
                  }`}
                />
              </div>

              {/* Detailed Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-slate-400 block">
                  Detailed Description *
                </label>
                <textarea
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  rows={4}
                  placeholder="Describe the exact location and symptoms of the issue (e.g. 'The projector screen fails to retract and the projection lamp flickers red, making presentations unreadable on the left board.')"
                  required
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all resize-none ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:outline-none' 
                      : 'bg-stone-50 border-stone-200 text-stone-800 focus:border-[#0a4735] focus:outline-none'
                  }`}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className={`px-5 py-2.5 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-2 ${
                    isSubmittingFeedback
                      ? 'bg-slate-850 text-slate-500 cursor-not-allowed'
                      : isDarkMode
                        ? 'bg-indigo-600 hover:bg-indigo-550 text-white'
                        : 'bg-[#0a4735] hover:bg-[#063325] text-white'
                  }`}
                >
                  {isSubmittingFeedback ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Reporting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* History Column */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <h4 className={`text-xs font-extrabold uppercase font-mono tracking-wider flex items-center gap-2 ${
                isDarkMode ? 'text-[#dfb965]' : 'text-[#0a4735]'
              }`}>
                <FileText className="w-3.5 h-3.5" />
                <span>Your Reported Issues ({myFeedback.length})</span>
              </h4>

              {loadingFeedback ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs font-mono">Loading history...</span>
                </div>
              ) : myFeedback.length === 0 ? (
                <div className={`p-8 rounded-2xl border text-center flex flex-col items-center justify-center ${
                  isDarkMode ? 'bg-slate-950/40 border-slate-800/60' : 'bg-stone-50/50 border-stone-200/50'
                }`}>
                  <MessageSquare className="w-8 h-8 text-slate-400 opacity-60 mb-2" />
                  <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-200'}`}>No issues reported</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">Your submitted tickets will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {myFeedback.map((ticket) => {
                    const statusColors: Record<string, string> = {
                      pending: 'bg-yellow-500/15 border-yellow-500 text-yellow-500',
                      in_progress: 'bg-blue-500/15 border-blue-400 text-blue-400',
                      resolved: 'bg-emerald-500/15 border-emerald-500 text-emerald-400',
                    };
                    const priorityLabels: Record<string, string> = {
                      low: '🟢 Low',
                      medium: '🟡 Medium',
                      high: '🟠 High',
                      critical: '🔴 Critical',
                    };
                    const dateStr = ticket.createdAt 
                      ? new Date(ticket.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Unknown Date';

                    return (
                      <div
                        key={ticket.id}
                        className={`p-4 rounded-xl border text-xs leading-normal relative transition-all ${
                          isDarkMode ? 'bg-slate-950 border-slate-850/80 hover:border-slate-800' : 'bg-stone-50 border-stone-200/60 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold font-mono uppercase tracking-widest border ${
                            statusColors[ticket.status] || 'bg-slate-500/10 text-slate-400'
                          }`}>
                            {ticket.status}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {dateStr}
                          </span>
                        </div>

                        <h5 className={`font-bold text-xs ${isDarkMode ? 'text-slate-200' : 'text-stone-850'}`}>
                          {ticket.title}
                        </h5>
                        <p className={`text-[11px] font-mono mt-1 font-semibold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-800'}`}>
                          📍 Room: {ticket.roomName}
                        </p>
                        <p className={`text-[10px] line-clamp-2 mt-1.5 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-stone-650'}`}>
                          {ticket.description}
                        </p>

                        <div className="mt-3 pt-2.5 border-t border-dashed border-slate-800/40 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>Priority: <strong className="font-bold">{priorityLabels[ticket.priority] || ticket.priority}</strong></span>
                          <span className="capitalize">{ticket.issueType.replace('_', ' ')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};
