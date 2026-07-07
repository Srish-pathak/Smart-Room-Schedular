import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Booking } from '../types';
import { authAPI } from '../lib/api';
import { 
  User as UserIcon, 
  Mail, 
  Building, 
  Phone, 
  Clock, 
  CheckCircle, 
  Calendar, 
  Save, 
  Camera, 
  Check, 
  Award, 
  ShieldCheck 
} from 'lucide-react';

interface UserProfileViewProps {
  user: any;
  bookings: Booking[];
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

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  user,
  bookings,
  isDarkMode,
  onProfileUpdated,
  addToast
}) => {
  const [name, setName] = useState(user?.fullName || user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || PRESET_AVATARS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

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
              src={profilePhoto} 
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
                    <img src={avatar} alt={`Avatar ${idx}`} className="w-12 h-12 object-cover" />
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
    </div>
  );
};
