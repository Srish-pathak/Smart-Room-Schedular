import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, X, Activity, Clock, Search, UserCheck, Calendar } from 'lucide-react';

interface ActivityHistoryDrawerProps {
  selectedRoomForHistory: any;
  onClose: () => void;
  adminBookings: any[];
  historySearchQuery: string;
  setHistorySearchQuery: (val: string) => void;
  historyPeriodFilter: 'all' | 'ay-26-27' | 'summer-26' | 'even-26' | 'odd-25' | 'custom';
  setHistoryPeriodFilter: (val: 'all' | 'ay-26-27' | 'summer-26' | 'even-26' | 'odd-25' | 'custom') => void;
  historyStartDate: string;
  setHistoryStartDate: (val: string) => void;
  historyEndDate: string;
  setHistoryEndDate: (val: string) => void;
}

export const ActivityHistoryDrawer: React.FC<ActivityHistoryDrawerProps> = ({
  selectedRoomForHistory,
  onClose,
  adminBookings,
  historySearchQuery,
  setHistorySearchQuery,
  historyPeriodFilter,
  setHistoryPeriodFilter,
  historyStartDate,
  setHistoryStartDate,
  historyEndDate,
  setHistoryEndDate,
}) => {
  if (!selectedRoomForHistory) return null;

  const roomBookings = adminBookings.filter(b => 
    b.room_name?.toLowerCase().includes(selectedRoomForHistory.name.toLowerCase()) || 
    selectedRoomForHistory.name?.toLowerCase().includes(b.room_name?.toLowerCase())
  );

  const sortedBookings = [...roomBookings].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );

  const filteredBookings = sortedBookings.filter(b => {
    // 1. Text search query filter
    let matchesText = true;
    if (historySearchQuery.trim()) {
      const query = historySearchQuery.toLowerCase();
      matchesText = (
        b.summary?.toLowerCase().includes(query) ||
        b.creator_name?.toLowerCase().includes(query) ||
        b.creator_email?.toLowerCase().includes(query)
      );
    }

    // 2. Date range filter
    let matchesDate = true;
    const bDate = new Date(b.start_time);
    if (!isNaN(bDate.getTime())) {
      if (historyStartDate) {
        const start = new Date(`${historyStartDate}T00:00:00`);
        matchesDate = matchesDate && bDate >= start;
      }
      if (historyEndDate) {
        const end = new Date(`${historyEndDate}T23:59:59`);
        matchesDate = matchesDate && bDate <= end;
      }
    }

    return matchesText && matchesDate;
  });

  const now = new Date();

  const handlePresetChange = (preset: typeof historyPeriodFilter) => {
    setHistoryPeriodFilter(preset);
    switch (preset) {
      case 'all':
        setHistoryStartDate('');
        setHistoryEndDate('');
        break;
      case 'ay-26-27':
        setHistoryStartDate('2026-08-01');
        setHistoryEndDate('2027-07-31');
        break;
      case 'summer-26':
        setHistoryStartDate('2026-06-01');
        setHistoryEndDate('2026-07-31');
        break;
      case 'even-26':
        setHistoryStartDate('2026-01-01');
        setHistoryEndDate('2026-05-31');
        break;
      case 'odd-25':
        setHistoryStartDate('2025-08-01');
        setHistoryEndDate('2025-12-31');
        break;
      case 'custom':
        break;
    }
  };

  const handleStartDateChange = (val: string) => {
    setHistoryStartDate(val);
    setHistoryPeriodFilter('custom');
  };

  const handleEndDateChange = (val: string) => {
    setHistoryEndDate(val);
    setHistoryPeriodFilter('custom');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Dark blur backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
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
                onClick={onClose}
                className="p-1.5 hover:bg-slate-850 text-slate-500 hover:text-white rounded-xl transition cursor-pointer border border-transparent hover:border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

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

            {/* Search & Academic Date Filter controls inside the drawer */}
            <div className="px-6 pt-4 pb-3 shrink-0 space-y-3 bg-slate-950/10 border-b border-slate-850/30">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  id="history-drawer-search-input"
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Filter bookings by user, email, or summary..."
                  className="w-full bg-slate-950 hover:bg-slate-950/90 focus:bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl pl-9.5 pr-8.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all font-sans shadow-inner text-left"
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

              {/* Academic Period Dropdown */}
              <div className="flex flex-col gap-1 text-left">
                <label htmlFor="academic-period-select" className="text-[9px] font-mono tracking-wider text-slate-400 uppercase font-bold flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-indigo-400" /> Academic Term / Semester
                </label>
                <select
                  id="academic-period-select"
                  value={historyPeriodFilter}
                  onChange={(e) => handlePresetChange(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-all cursor-pointer font-sans text-left"
                >
                  <option value="all">All Academic Terms (No date limit)</option>
                  <option value="ay-26-27">Academic Year 2026-2027 (Aug 2026 - Jul 2027)</option>
                  <option value="summer-26">Summer Term 2026 (Jun 2026 - Jul 2026)</option>
                  <option value="even-26">Even Semester 2025-2026 (Jan 2026 - May 2026)</option>
                  <option value="odd-25">Odd Semester 2025-2026 (Aug 2025 - Dec 2025)</option>
                  <option value="custom">Custom Date Range...</option>
                </select>
              </div>

              {/* Custom Date Range Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wide">Start Date</span>
                  <input
                    id="history-start-date-input"
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none [color-scheme:dark]"
                  />
                </div>

                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wide">End Date</span>
                  <input
                    id="history-end-date-input"
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Active Filter Clear Indicators */}
              {(historyStartDate || historyEndDate || historySearchQuery) && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500 italic">
                    Showing filtered search results
                  </span>
                  <button
                    id="reset-all-history-filters-btn"
                    onClick={() => {
                      setHistorySearchQuery('');
                      setHistoryPeriodFilter('all');
                      setHistoryStartDate('');
                      setHistoryEndDate('');
                    }}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wide cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Clear Filters
                  </button>
                </div>
              )}
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
                      This user hub doesn't present historic timeline logs currently. It's fully ready for instant synchronization.
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

          {/* Drawer footer summary */}
          <div className="p-6 bg-slate-950/50 border-t border-slate-800/80 shrink-0 text-center">
            <button
              onClick={onClose}
              className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-700/60 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs uppercase cursor-pointer transition-all"
            >
              Close Insights Drawer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
