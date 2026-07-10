import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Building2, Clock3, Compass, Tv, Wifi, Wind, BookOpen, Accessibility, X } from 'lucide-react';

interface RoomDetailsDrawerProps {
  selectedRoomForDetails: any;
  onClose: () => void;
  isDarkMode: boolean;
  onReserveClick: (room: any) => void;
  onViewScheduleClick: (room: any) => void;
}

export const RoomDetailsDrawer: React.FC<RoomDetailsDrawerProps> = ({
  selectedRoomForDetails,
  onClose,
  isDarkMode,
  onReserveClick,
  onViewScheduleClick,
}) => {
  if (!selectedRoomForDetails) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Dark blur backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 cursor-pointer"
        />

        {/* Slide-out drawer panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className={`fixed right-0 top-0 bottom-0 w-full sm:max-w-md border-l shadow-2xl z-50 flex flex-col h-full overflow-hidden text-left ${
            isDarkMode 
              ? 'bg-slate-900 border-slate-800 text-slate-100' 
              : 'bg-white border-[#ead29c]/50 text-[#0a4735]'
          }`}
        >
          {/* Cover Image Header */}
          <div className="relative h-56 shrink-0 bg-stone-100">
            <img 
              src={selectedRoomForDetails.image || undefined} 
              alt={selectedRoomForDetails.name} 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a4735] via-[#0a4735]/40 to-transparent" />
            
            {/* Close Button overlay */}
            <button
              onClick={onClose}
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
                ? (isDarkMode ? 'bg-emerald-950/40 border-emerald-900/30 text-emerald-400' : 'bg-emerald-50/70 border-emerald-200/60 text-emerald-800')
                : (isDarkMode ? 'bg-rose-950/40 border-rose-900/30 text-rose-450' : 'bg-rose-50/70 border-rose-200/60 text-rose-800')
            }`}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  selectedRoomForDetails.status === 'available' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`} />
                <span className="text-xs font-mono font-extrabold uppercase tracking-wider">
                  {selectedRoomForDetails.status === 'available' ? 'SPACE IS VACANT' : 'SPACE IS RESERVED'}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-500">Real-time status</span>
            </div>

            {/* Core Specifications */}
            <div className={`border rounded-2xl p-4.5 space-y-3.5 ${
              isDarkMode 
                ? 'bg-slate-950/60 border-slate-800/80' 
                : 'bg-[#faf8f2] border-[#ead29c]/30'
            }`}>
              <h4 className="text-[10px] font-extrabold text-[#c09728] uppercase tracking-widest font-mono">
                Core Specifications
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 text-left">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Seating</span>
                  <div className={`flex items-center gap-1 font-bold text-xs ${isDarkMode ? 'text-slate-200' : 'text-slate-850'}`}>
                    <Users className={`w-3.5 h-3.5 ${isDarkMode ? 'text-[#dfb965]' : 'text-[#0a4735]'}`} />
                    <span>{selectedRoomForDetails.capacity} Seats</span>
                  </div>
                </div>
                <div className="space-y-1 text-left">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Venue</span>
                  <div className={`flex items-center gap-1 font-bold text-xs ${isDarkMode ? 'text-slate-200' : 'text-slate-850'}`}>
                    <Building2 className={`w-3.5 h-3.5 ${isDarkMode ? 'text-[#dfb965]' : 'text-[#0a4735]'}`} />
                    <span className="truncate">{selectedRoomForDetails.building || 'IIT (BHU)'}</span>
                  </div>
                </div>
                <div className="space-y-1 text-left">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Gap Buffer</span>
                  <div className={`flex items-center gap-1 font-bold text-xs ${isDarkMode ? 'text-slate-200' : 'text-slate-850'}`}>
                    <Clock3 className={`w-3.5 h-3.5 ${isDarkMode ? 'text-[#dfb965]' : 'text-[#0a4735]'}`} />
                    <span>{selectedRoomForDetails.buffer_time !== undefined ? selectedRoomForDetails.buffer_time : 15} mins</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Suitability */}
            {selectedRoomForDetails.bestFor && (
              <div className="space-y-2 text-left">
                <h4 className="text-[10px] font-extrabold text-[#c09728] uppercase tracking-widest font-mono">
                  Academic Suitability
                </h4>
                <p className={`${isDarkMode ? 'text-slate-300' : 'text-slate-500'} text-xs leading-relaxed font-serif font-light`}>
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
                {(selectedRoomForDetails.features || []).map((feature: string, idx: number) => {
                  const text = feature.toLowerCase();
                  let icon = <Compass className="w-4 h-4" />;
                  let featureDesc = "Fully integrated & certified for academic applications.";
                  
                  if (text.includes('projector') || text.includes('display') || text.includes('screen')) {
                    icon = <Tv className="w-4 h-4" />;
                    featureDesc = "Ultra-high-definition presentation output.";
                  } else if (text.includes('sound') || text.includes('audio') || text.includes('video') || text.includes('conferencing')) {
                    icon = <Wifi className="w-4 h-4" />;
                    featureDesc = "Optimized for hybrid lectures & remote participants.";
                  } else if (text.includes('ac') || text.includes('air conditioning') || text.includes('wind')) {
                    icon = <Wind className="w-4 h-4 text-sky-650" />;
                    featureDesc = "Temperature-controlled climate feedback.";
                  } else if (text.includes('whiteboard') || text.includes('glass')) {
                    icon = <BookOpen className="w-4 h-4" />;
                    featureDesc = "Writable surfaces for diagramming.";
                  } else if (text.includes('ergonomic') || text.includes('seating') || text.includes('chairs')) {
                    icon = <Accessibility className="w-4 h-4" />;
                    featureDesc = "Comfortable seating for extended seminars.";
                  }

                  return (
                    <div key={idx} className={`flex items-start gap-3 p-3 border rounded-xl ${
                      isDarkMode 
                        ? 'bg-slate-950/40 border-slate-800/40' 
                        : 'bg-[#faf8f2]/40 border-[#ead29c]/20'
                    }`}>
                      <div className={`p-2 rounded-lg border shrink-0 shadow-sm ${
                        isDarkMode 
                          ? 'bg-slate-900 border-slate-800 text-[#dfb965]' 
                          : 'bg-white border-[#ead29c]/45 text-[#0a4735]'
                      }`}>
                        {icon}
                      </div>
                      <div className="space-y-0.5 text-left">
                        <span className={`text-xs font-bold block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{feature}</span>
                        <span className={`text-[10.5px] block leading-tight ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{featureDesc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Booking contact and department */}
            {selectedRoomForDetails.contactDepartment && (
              <div className={`p-4 border rounded-2xl text-left space-y-1 ${
                isDarkMode 
                  ? 'bg-slate-950/60 border-slate-800/80' 
                  : 'bg-stone-50 border-stone-200/65'
              }`}>
                <span className="text-[9px] font-bold uppercase tracking-widest font-mono text-slate-500">
                  Administrative Custodian
                </span>
                <div className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Primary contact: <strong className={`font-extrabold ${isDarkMode ? 'text-[#dfb965]' : 'text-[#0a4735]'}`}>{selectedRoomForDetails.contactDepartment}</strong>
                </div>
                <p className="text-[10px] text-slate-500">
                  Subject to booking criteria of the coordinating department.
                </p>
              </div>
            )}
          </div>

          {/* Action footer */}
          <div className={`p-6 border-t shrink-0 flex items-center gap-3 ${
            isDarkMode 
              ? 'bg-slate-950 border-slate-850' 
              : 'bg-[#faf8f2]/60 border-[#ead29c]/30'
          }`}>
            <button
              onClick={onClose}
              className={`flex-1 py-3 border font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm text-center font-display ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850' 
                  : 'bg-white border-[#ead29c] text-[#0a4735] hover:bg-[#faf8f2]'
              }`}
            >
              Close Details
            </button>
            {selectedRoomForDetails.status === 'available' ? (
              <button
                onClick={() => onReserveClick(selectedRoomForDetails)}
                className={`flex-1 py-3 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md text-center font-display ${
                  isDarkMode 
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white' 
                    : 'bg-[#0a4735] hover:bg-[#063325] text-white'
                }`}
              >
                Reserve Now
              </button>
            ) : (
              <button
                onClick={() => onViewScheduleClick(selectedRoomForDetails)}
                className={`flex-1 py-3 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md text-center font-display ${
                  isDarkMode 
                    ? 'bg-[#dfb965] hover:bg-[#dfb965]/95 text-slate-950' 
                    : 'bg-[#dfb965] hover:bg-[#d4af37] text-[#0a4735]'
                }`}
              >
                View Schedule
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
