import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Room, Booking } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Users, 
  Calendar, 
  Plus,
  Compass
} from 'lucide-react';

interface WeeklyCalendarGridProps {
  rooms: Room[];
  bookings: Booking[];
  isDarkMode: boolean;
  onSlotClick: (dateStr: string, timeStr: string, roomId?: string) => void;
  onEventClick?: (booking: Booking) => void;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 AM to 8:00 PM (12 hours span)

export const WeeklyCalendarGrid: React.FC<WeeklyCalendarGridProps> = ({
  rooms = [],
  bookings = [],
  isDarkMode,
  onSlotClick,
  onEventClick
}) => {
  const [baseDate, setBaseDate] = useState<Date>(new Date());
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [currentIndicatorTime, setCurrentIndicatorTime] = useState<Date>(new Date());

  // Update current time indicator every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndicatorTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Compute weekdays starting from Monday of baseDate's week
  const weekDays = useMemo(() => {
    const currentDay = baseDate.getDay();
    const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay; // Sunday maps to -6, Monday to 0
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + distanceToMon);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [baseDate]);

  // Navigate weeks
  const handlePrevWeek = () => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - 7);
    setBaseDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + 7);
    setBaseDate(d);
  };

  const handleToday = () => {
    setBaseDate(new Date());
  };

  // Convert time to decimal hour (e.g. "09:30" -> 9.5)
  const getDecimalHour = (dateTimeStr: string | undefined): number => {
    if (!dateTimeStr) return 8;
    try {
      const tPart = dateTimeStr.includes('T') ? dateTimeStr.split('T')[1] : dateTimeStr;
      const [hStr, mStr] = tPart.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      return h + m / 60;
    } catch {
      return 8;
    }
  };

  // Filter and map events that fall within the current week and filter criteria
  const mappedEvents = useMemo(() => {
    const startOfWeek = weekDays[0];
    const endOfWeek = new Date(weekDays[6]);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekStartStr = startOfWeek.toISOString().split('T')[0];
    const weekEndStr = endOfWeek.toISOString().split('T')[0];

    return bookings.filter(b => {
      // Must be approved
      const isApproved = b.status === 'Approved' || b.status?.toLowerCase() === 'approved';
      if (!isApproved) return false;

      // Filter by room
      if (selectedRoomFilter !== 'all') {
        const isThisRoom = b.roomId === selectedRoomFilter || b.room_id === selectedRoomFilter;
        if (!isThisRoom) return false;
      }

      // Check if within date span
      const dateStr = b.date;
      return dateStr >= weekStartStr && dateStr <= weekEndStr;
    });
  }, [bookings, weekDays, selectedRoomFilter]);

  // Format date display range (e.g., "Oct 12 - Oct 18, 2026")
  const formattedWeekRange = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[6];
    const optionMonth: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const optionYear: Intl.DateTimeFormatOptions = { year: 'numeric' };
    return `${first.toLocaleDateString([], optionMonth)} – ${last.toLocaleDateString([], optionMonth)}, ${last.toLocaleDateString([], optionYear)}`;
  }, [weekDays]);

  // Is "today" within the current week?
  const todayIndex = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return weekDays.findIndex(d => d.toISOString().split('T')[0] === todayStr);
  }, [weekDays]);

  // Decimal hour for current time indicator
  const currentIndicatorHour = useMemo(() => {
    return currentIndicatorTime.getHours() + currentIndicatorTime.getMinutes() / 60;
  }, [currentIndicatorTime]);

  return (
    <div className={`p-5 rounded-3xl border flex flex-col h-full text-left ${
      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200 shadow-sm'
    }`}>
      {/* Calendar Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/40 mb-4">
        <div className="space-y-1">
          <span className={`text-[10px] font-extrabold uppercase font-mono tracking-widest ${isDarkMode ? 'text-indigo-400' : 'text-[#0a4735]'}`}>
            Weekly Planner View
          </span>
          <h2 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-[#0a4735]'}`}>
            {formattedWeekRange}
          </h2>
        </div>

        {/* Room Filter Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedRoomFilter}
            onChange={(e) => setSelectedRoomFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              isDarkMode 
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:outline-none' 
                : 'bg-stone-50 border-stone-200 text-[#0a4735] focus:outline-none'
            }`}
          >
            <option value="all">🏢 All Campus Rooms</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>
                📍 {r.name} ({r.building || 'IIT BHU'})
              </option>
            ))}
          </select>

          <div className="flex items-center border border-slate-850 rounded-xl overflow-hidden shrink-0">
            <button
              onClick={handlePrevWeek}
              className={`p-2 transition-all cursor-pointer ${
                isDarkMode ? 'bg-slate-950 text-slate-300 hover:bg-slate-850' : 'bg-stone-100 text-[#0a4735] hover:bg-stone-200'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className={`px-3 py-2 text-xs font-bold font-mono transition-all border-x cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-950 text-indigo-400 border-slate-850 hover:bg-slate-850' 
                  : 'bg-stone-100 text-[#0a4735] border-stone-200 hover:bg-stone-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={handleNextWeek}
              className={`p-2 transition-all cursor-pointer ${
                isDarkMode ? 'bg-slate-950 text-slate-300 hover:bg-slate-850' : 'bg-stone-100 text-[#0a4735] hover:bg-stone-200'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-x-auto min-h-[500px] border border-slate-800/10 rounded-2xl relative">
        <div className="min-w-[800px] relative flex flex-col h-full">
          {/* Weekday Column Headers */}
          <div className={`grid grid-cols-8 border-b text-center py-2 font-mono text-[10px] font-bold ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/60 text-slate-400' : 'bg-stone-50 border-stone-150 text-stone-500'
          }`}>
            {/* Hour spacer */}
            <div className="border-r border-slate-800/20 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>TIME</span>
            </div>

            {/* Days Mon-Sun */}
            {weekDays.map((day, idx) => {
              const isToday = todayIndex === idx;
              return (
                <div 
                  key={idx}
                  className={`flex flex-col items-center justify-center py-0.5 leading-tight border-r border-slate-800/10 ${
                    isToday ? (isDarkMode ? 'bg-indigo-950/20 text-indigo-300 font-extrabold' : 'bg-indigo-50/50 text-[#0a4735] font-extrabold') : ''
                  }`}
                >
                  <span className="uppercase text-[9px]">{day.toLocaleDateString([], { weekday: 'short' })}</span>
                  <span className={`text-sm mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ${
                    isToday ? 'bg-indigo-600 text-white shadow-sm' : ''
                  }`}>
                    {day.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Hourly Slots Content Area */}
          <div className="relative flex-1 grid grid-cols-8 h-[600px]">
            {/* Left Hour Column (Y Axis) */}
            <div className={`border-r flex flex-col justify-between py-1 text-[10px] font-mono text-center relative font-bold ${
              isDarkMode ? 'border-slate-800/60 text-slate-500 bg-slate-950/10' : 'border-stone-150 text-stone-400 bg-stone-50/20'
            }`}>
              {HOURS.map((hour) => {
                const isPM = hour >= 12;
                const formattedHour = hour > 12 ? hour - 12 : hour;
                const ampm = isPM ? 'PM' : 'AM';
                return (
                  <div key={hour} className="h-[46px] flex items-start justify-center pt-1.5 border-b border-slate-800/5">
                    {formattedHour}:00 {ampm}
                  </div>
                );
              })}
            </div>

            {/* Daily grid cells (7 columns) */}
            {weekDays.map((day, dayIdx) => {
              const dayStr = day.toISOString().split('T')[0];
              const isToday = todayIndex === dayIdx;

              // Filter events that belong to this specific day column
              const dayEvents = mappedEvents.filter(e => e.date === dayStr);

              return (
                <div 
                  key={dayIdx} 
                  className={`relative border-r flex flex-col justify-between group/col h-full ${
                    isDarkMode 
                      ? 'border-slate-800/40 bg-slate-900/10 hover:bg-slate-950/10' 
                      : 'border-stone-100 bg-white hover:bg-stone-50/30'
                  }`}
                >
                  {/* Grid cells backdrop lines */}
                  {HOURS.map((hour) => {
                    const formattedHourStr = String(hour).padStart(2, '0') + ':00';
                    return (
                      <div
                        key={hour}
                        onClick={() => onSlotClick(dayStr, formattedHourStr)}
                        className={`h-[46px] border-b border-dashed transition-all cursor-crosshair flex items-center justify-center ${
                          isDarkMode 
                            ? 'border-slate-800/20 hover:bg-indigo-950/15' 
                            : 'border-stone-100 hover:bg-[#faf8f2]/40'
                        }`}
                        title={`Click to quick book a slot at ${hour}:00 on ${dayStr}`}
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-500/0 group-hover/col:text-slate-500/20 transition-all pointer-events-none" />
                      </div>
                    );
                  })}

                  {/* Render Booked Events onto this specific day column */}
                  {dayEvents.map((b) => {
                    const sh = getDecimalHour(b.startTime);
                    const eh = getDecimalHour(b.endTime);
                    const duration = Math.max(0.5, eh - sh); // minimum 30 minutes box height

                    // Offset formulas: bounds are 8 AM (0%) to 8 PM (100%)
                    const topPercent = Math.max(0, ((sh - 8) / 12) * 100);
                    const heightPercent = Math.min(100 - topPercent, (duration / 12) * 100);

                    // Generate colorful styles
                    const colorIndex = (b.roomName || '').charCodeAt(0) % 5;
                    const borderColors = [
                      'border-indigo-500 bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300',
                      'border-emerald-500 bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300',
                      'border-amber-500 bg-amber-950/90 hover:bg-amber-900 text-amber-300',
                      'border-pink-500 bg-pink-950/90 hover:bg-pink-900 text-pink-300',
                      'border-purple-500 bg-purple-950/90 hover:bg-purple-900 text-purple-300'
                    ];
                    const lightColors = [
                      'border-indigo-400 bg-indigo-50/95 hover:bg-indigo-100 text-indigo-950',
                      'border-emerald-400 bg-emerald-50/95 hover:bg-emerald-100 text-emerald-950',
                      'border-amber-400 bg-amber-50/95 hover:bg-amber-100 text-amber-950',
                      'border-pink-400 bg-pink-50/95 hover:bg-pink-100 text-pink-950',
                      'border-purple-400 bg-purple-50/95 hover:bg-purple-100 text-purple-950'
                    ];

                    const styleClasses = isDarkMode ? borderColors[colorIndex] : lightColors[colorIndex];

                    return (
                      <div
                        key={b.id}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent grid click
                          if (onEventClick) onEventClick(b);
                        }}
                        style={{
                          top: `${topPercent}%`,
                          height: `${heightPercent}%`,
                          position: 'absolute',
                          left: '4%',
                          right: '4%'
                        }}
                        className={`p-2 rounded-xl border-l-4 shadow-md overflow-hidden transition-all duration-200 z-10 text-[10.5px] leading-tight flex flex-col justify-between hover:shadow-lg hover:scale-[1.01] cursor-pointer ${styleClasses}`}
                      >
                        <div className="min-h-0 flex-1 flex flex-col">
                          <strong className="block truncate text-[11px] font-black">{b.summary || b.purpose}</strong>
                          <span className="opacity-75 font-medium truncate mt-0.5 flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            {b.roomName || b.room_name}
                          </span>
                          {duration >= 1 && (
                            <span className="opacity-60 block truncate font-mono text-[9.5px] mt-0.5">
                              👤 {b.creatorName || 'Host'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Current Time Indicator horizontal red line */}
                  {isToday && currentIndicatorHour >= 8 && currentIndicatorHour <= 20 && (
                    <div 
                      style={{
                        top: `${((currentIndicatorHour - 8) / 12) * 100}%`,
                        position: 'absolute',
                        left: 0,
                        right: 0
                      }}
                      className="z-20 pointer-events-none"
                    >
                      <div className="w-2 h-2 rounded-full bg-rose-500 absolute -left-1 -top-0.5 shadow-md" />
                      <div className="h-0.5 bg-rose-500 w-full" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer explanation */}
      <div className="mt-3 text-[10px] text-slate-500 flex justify-between items-center flex-wrap gap-2">
        <span>💡 Clicking on any blank dotted hourly grid cell instantly opens the booking module prefilled.</span>
        <span>🕒 Displaying Indian Standard Time (IST) / Academic Hours (8:00 AM – 8:00 PM)</span>
      </div>
    </div>
  );
};
