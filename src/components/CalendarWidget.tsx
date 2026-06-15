import React, { useState, useEffect, useMemo } from 'react';
import { CalendarAPI, DriveAPI } from '../lib/workspace';
import { Room } from '../types';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  MapPin,
  Loader,
  RefreshCw,
  AlertTriangle,
  Users,
  Check,
  Shuffle,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface CalendarWidgetProps {
  rooms: Room[];
  userEmail: string;
  userName: string;
  onRefreshRoomsStatus: () => void;
  onBookingAdded: (roomName: string, summary: string, startTime: string, endTime: string, agenda?: string) => void;
  defaultSelectedRoomId?: string;
}

export default function CalendarWidget({
  rooms,
  userEmail,
  userName,
  onRefreshRoomsStatus,
  onBookingAdded,
  defaultSelectedRoomId,
}: CalendarWidgetProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [selectedRoomId, setSelectedRoomId] = useState(defaultSelectedRoomId || rooms[0]?.id || '');
  const [summary, setSummary] = useState('');
  const [agenda, setAgenda] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [facultyId, setFacultyId] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [bypassConflict, setBypassConflict] = useState(false);

  // Keep selectedRoomId in sync if defaultSelectedRoomId changes
  useEffect(() => {
    if (defaultSelectedRoomId) {
      setSelectedRoomId(defaultSelectedRoomId);
    }
  }, [defaultSelectedRoomId]);

  // Auto-reset conflict bypass when inputs change
  useEffect(() => {
    setBypassConflict(false);
  }, [selectedRoomId, date, startTime, endTime]);

  // Selected room resolution
  const selectedRoom = useMemo(() => rooms.find((r) => r.id === selectedRoomId), [rooms, selectedRoomId]);
  const selectedRoomName = selectedRoom ? selectedRoom.name : '';

  // Get conflicting events for currently scheduled room/time
  const conflicts = useMemo(() => {
    if (!selectedRoomName) return [];
    try {
      const selectedStart = new Date(`${date}T${startTime}:00`);
      const selectedEnd = new Date(`${date}T${endTime}:00`);
      if (isNaN(selectedStart.getTime()) || isNaN(selectedEnd.getTime())) return [];

      return events.filter((e) => {
        const loc = e.location || '';
        if (!loc.toLowerCase().includes(selectedRoomName.toLowerCase())) return false;

        const estart = new Date(e.start?.dateTime || e.start?.date || '');
        const eend = new Date(e.end?.dateTime || e.end?.date || '');
        if (isNaN(estart.getTime()) || isNaN(eend.getTime())) return false;

        // Overlap: start1 < end2 && end1 > start2
        return selectedStart < eend && selectedEnd > estart;
      });
    } catch {
      return [];
    }
  }, [events, selectedRoomName, date, startTime, endTime]);

  // Find other sister rooms completely free during this period
  const alternativeRooms = useMemo(() => {
    if (!selectedRoom || conflicts.length === 0) return [];
    try {
      const selectedStart = new Date(`${date}T${startTime}:00`);
      const selectedEnd = new Date(`${date}T${endTime}:00`);
      if (isNaN(selectedStart.getTime()) || isNaN(selectedEnd.getTime())) return [];

      return rooms.filter((r) => {
        if (r.id === selectedRoomId) return false;
        
        const hasConflicts = events.some((e) => {
          const loc = e.location || '';
          if (!loc.toLowerCase().includes(r.name.toLowerCase())) return false;

          const estart = new Date(e.start?.dateTime || e.start?.date || '');
          const eend = new Date(e.end?.dateTime || e.end?.date || '');
          if (isNaN(estart.getTime()) || isNaN(eend.getTime())) return false;

          return selectedStart < eend && selectedEnd > estart;
        });

        return !hasConflicts;
      });
    } catch {
      return [];
    }
  }, [rooms, events, selectedRoom, selectedRoomId, date, startTime, endTime, conflicts]);

  // Find next optimal slot on the same day when this room is completely free
  const suggestedTimeCorrection = useMemo(() => {
    if (conflicts.length === 0) return null;
    try {
      let maxEnd = new Date(`${date}T${endTime}:00`);
      conflicts.forEach((e) => {
        const eend = new Date(e.end?.dateTime || e.end?.date || '');
        if (!isNaN(eend.getTime()) && eend > maxEnd) {
          maxEnd = eend;
        }
      });

      const startMs = new Date(`${date}T${startTime}:00`).getTime();
      const endMs = new Date(`${date}T${endTime}:00`).getTime();
      const durationMs = endMs - startMs;
      const finalDuration = durationMs > 0 ? durationMs : 3600000;

      const newStart = maxEnd;
      const newEnd = new Date(newStart.getTime() + finalDuration);

      const pad = (num: number) => String(num).padStart(2, '0');
      const startStr = `${pad(newStart.getHours())}:${pad(newStart.getMinutes())}`;
      const endStr = `${pad(newEnd.getHours())}:${pad(newEnd.getMinutes())}`;

      return {
        start: startStr,
        end: endStr,
        readable: `${startStr} - ${endStr}`,
      };
    } catch {
      return null;
    }
  }, [conflicts, date, startTime, endTime]);

  const fetchCalendarEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await CalendarAPI.listEvents();
      setEvents(items);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sync Google Calendar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
  }, []);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;

    if (conflicts.length > 0 && !bypassConflict) {
      alert(`⚠️ Booking Conflict active! ${selectedRoomName} is already occupied during this time frame. Use our instant solver operations below to find free spaces, or confirm the double-book override.`);
      return;
    }

    setIsSubmitting(true);
    const roomName = selectedRoom ? selectedRoom.name : 'Unknown Room';

    const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();

    try {
      await CalendarAPI.createEvent({
        roomName,
        summary,
        startTime: startDateTime,
        endTime: endDateTime,
        creatorName: userName,
        creatorEmail: userEmail,
        facultyId: facultyId || undefined,
        attendeeEmail: attendeeEmail || undefined,
      });

      // Automatically generate and upload receipt and agenda documents directly to Google Drive
      try {
        const timestamp = Date.now();
        
        // 1. Booking Receipt File
        const receiptFilename = `${roomName.replace(/\s+/g, '_')}_Booking_Receipt_${timestamp}.html`;
        const receiptHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Smart Room Booking Receipt</title>
            <style>
              body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
              .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; max-width: 500px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
              h2 { color: #818cf8; border-bottom: 2px solid #334155; padding-bottom: 12px; margin-top: 0; }
              .item { font-size: 14px; margin: 12px 0; }
              .label { color: #94a3b8; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>Smart Room Booking Receipt</h2>
              <div class="item"><span class="label">Room Space:</span> ${roomName}</div>
              <div class="item"><span class="label">Meeting Title:</span> ${summary}</div>
              <div class="item"><span class="label">Reservation Start:</span> ${new Date(startDateTime).toLocaleString()}</div>
              <div class="item"><span class="label">Reservation End:</span> ${new Date(endDateTime).toLocaleString()}</div>
              <div class="item"><span class="label">Faculty Member:</span> ${facultyId || userName}</div>
              <div class="item"><span class="label">Attendee Email:</span> ${attendeeEmail || 'None'}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 30px; text-align: center;">Verified by IIT BHU Smart Room Scheduler Dashboard</div>
            </div>
          </body>
          </html>
        `;
        await DriveAPI.createLogFile(receiptFilename, receiptHtml);

        // 2. Dedicated Meeting Agenda File
        const agendaFilename = `${summary.replace(/\s+/g, '_')}_Meeting_Agenda_${timestamp}.html`;
        const agendaHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Meeting Agenda: ${summary}</title>
            <style>
              body { font-family: sans-serif; background: #0b0f19; color: #e2e8f0; padding: 40px; line-height: 1.6; }
              .container { background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 32px; max-width: 650px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); }
              h1 { color: #6366f1; border-bottom: 2px solid #1f2937; padding-bottom: 12px; font-size: 24px; margin-top: 0; }
              h2 { color: #10b981; font-size: 18px; margin-top: 24px; }
              .meta-box { background: #1f2937; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #6366f1; }
              .meta-item { font-size: 13px; margin: 6px 0; color: #9ca3af; }
              .meta-label { color: #f3f4f6; font-weight: bold; }
              .agenda-text { background: #030712; padding: 20px; border-radius: 8px; border: 1px solid #374151; font-family: inherit; font-size: 14px; white-space: pre-wrap; color: #f3f4f6; }
              footer { font-size: 11px; color: #4b5563; margin-top: 40px; text-align: center; border-top: 1px solid #1f2937; padding-top: 16px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>📝 Meeting Agenda & Details</h1>
              <div class="meta-box">
                <div class="meta-item"><span class="meta-label">Allocation Space:</span> ${roomName}</div>
                <div class="meta-item"><span class="meta-label">Meeting Title:</span> ${summary}</div>
                <div class="meta-item"><span class="meta-label">Date & Time:</span> ${new Date(startDateTime).toLocaleString()} - ${new Date(endDateTime).toLocaleTimeString()}</div>
                <div class="meta-item"><span class="meta-label">Organized By:</span> ${userName} (${userEmail})</div>
                <div class="meta-item"><span class="meta-label">Faculty Member:</span> ${facultyId || 'Not specified'}</div>
                <div class="meta-item"><span class="meta-label">Attendee Email:</span> ${attendeeEmail || 'None'}</div>
              </div>
              <h2>📋 Agenda Details & Discussion Topics</h2>
              <div class="agenda-text">${agenda || 'No agenda details were provided.'}</div>
              <footer>
                Document saved automatically with Google Workspace Drive integration.<br>
                IIT BHU Smart Room Scheduler Dashboard
              </footer>
            </div>
          </body>
          </html>
        `;
        await DriveAPI.createLogFile(agendaFilename, agendaHtml);
      } catch (driveErr: any) {
        console.error('Google Drive sync failed:', driveErr);
      }

      setShowBookModal(false);
      setSummary('');
      setAgenda('');
      setFacultyId('');
      setAttendeeEmail('');
      onBookingAdded(roomName, summary, startDateTime, endDateTime, agenda);
      await fetchCalendarEvents();
      onRefreshRoomsStatus();
    } catch (err: any) {
      alert(err.message || 'Booking failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string, summary: string) => {
    // MANDATORY USER CONFIRMATION
    const confirmed = window.confirm(
      `Are you sure you want to cancel and delete the Google Calendar booking "${summary}"?\nThis will remove it from your primary Google Calendar.`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      await CalendarAPI.deleteEvent(eventId);
      await fetchCalendarEvents();
      onRefreshRoomsStatus();
    } catch (err: any) {
      alert(err.message || 'Cancel failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="calendar_events_panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-semibold tracking-tight">Google Calendar & Schedule</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCalendarEvents}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-lg disabled:opacity-50"
            title="Refresh from Google Calendar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowBookModal(true)}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-md transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Book Room
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4.5 bg-rose-950/40 border border-rose-900/50 text-rose-300 rounded-xl flex items-start gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <div>
            <span className="font-semibold">Sync Alert: </span>
            {error}
          </div>
        </div>
      )}

      {loading && events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
          <Loader className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-sm font-medium">Fetching real-time Google Calendar events...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-900/30">
          <Calendar className="w-10 h-10 text-slate-700 mb-3" />
          <p className="text-sm font-medium text-slate-400">No upcoming meetings listed on your Calendar</p>
          <p className="text-xs text-slate-500 max-w-sm mt-1 px-4">
            Book a room above to place a live scheduling reservation onto your real Google Calendar feed!
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
          {events.map((event) => {
            const start = event.start?.dateTime ? new Date(event.start.dateTime) : null;
            const end = event.end?.dateTime ? new Date(event.end.dateTime) : null;
            const formattedTime = start
              ? `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} @ ${start.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'All day';

            // Find overlapping booked event in list to indicate overbooking
            const overlappingListedEvent = events.find((otherEvent) => {
              if (otherEvent.id === event.id) return false;
              
              // Must be in same room location
              const loc1 = (event.location || '').toLowerCase();
              const loc2 = (otherEvent.location || '').toLowerCase();
              if (!loc1 || !loc2) return false;
              if (!loc1.includes(loc2) && !loc2.includes(loc1)) return false;

              const s2 = otherEvent.start?.dateTime ? new Date(otherEvent.start.dateTime) : null;
              const e2 = otherEvent.end?.dateTime ? new Date(otherEvent.end.dateTime) : null;

              if (!start || !end || !s2 || !e2) return false;
              return start < e2 && end > s2;
            });

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative flex flex-col justify-between p-4 bg-slate-950 border border-slate-800/80 rounded-xl transition-all hover:border-slate-700 hover:shadow-lg"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-start gap-3">
                    <div className="bg-indigo-950/60 p-2.5 rounded-lg border border-indigo-900/40 text-indigo-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-100 text-sm">{event.summary || 'Unscheduled Meeting'}</h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {formattedTime}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1 text-teal-400 bg-teal-950/40 px-1.5 py-0.5 rounded border border-teal-900/30">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteEvent(event.id, event.summary)}
                    className="mr-1 p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Cancel reservation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {overlappingListedEvent && (
                  <div className="flex items-center gap-1.5 mt-2.5 text-[10.5px] text-rose-300 bg-rose-950/40 border border-rose-900/30 px-3 py-1.5 rounded-lg w-fit">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Schedule Overlap: Conflicts with "{overlappingListedEvent.summary}" ({overlappingListedEvent.location})</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Booking Form Dialog */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
          >
            <div className="p-6 bg-slate-950 border-b border-slate-800/60 shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Book Room on Google Calendar
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Creates a real-world calendar event on your Google Account with full tracking.
              </p>
            </div>

            <form onSubmit={handleBookingSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                    Select Room
                  </label>
                  <span className={`text-[10px] font-bold uppercase py-0.5 px-2 rounded-md font-mono flex items-center gap-1 border ${
                    conflicts.length > 0 
                      ? 'bg-rose-950/80 text-rose-300 border-rose-800/40' 
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${conflicts.length > 0 ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'}`} />
                    {conflicts.length > 0 ? 'BUSY' : 'AVAILABLE'}
                  </span>
                </div>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} (Capacity: {room.capacity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                  Faculty Name / ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. A.K. Tripathi / FAC-CS-204"
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                  Attendee Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. student.name@gmail.com"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                  Meeting Title / Summary
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Strategic Planning Session"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                  Meeting Agenda / Details
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Discuss Q3 roadmap, present student research reports, and outline next-step tasks..."
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                    Reservation Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                  End Time
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Conflict Status Warning & Smart Resolvers Section */}
              {conflicts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-rose-950/30 border border-rose-900/40 rounded-xl space-y-3"
                >
                  <div className="flex items-start gap-2.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-450 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold text-rose-300 block">⚠️ Time-Slot Conflict Detected</span>
                      <span className="text-[11px] text-slate-350 block">
                        {selectedRoomName} is already locked because it overlaps with these scheduled meetings:
                      </span>
                      <ul className="list-disc list-inside text-[10.5px] text-slate-400 space-y-0.5 pl-1">
                        {conflicts.map((c, i) => {
                          const cStart = c.start?.dateTime ? new Date(c.start.dateTime) : null;
                          const cEnd = c.end?.dateTime ? new Date(c.end.dateTime) : null;
                          const timeStr = cStart && cEnd
                            ? `${cStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${cEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : 'All Day';
                          return (
                            <li key={i}>
                              <span className="text-slate-300 font-semibold">"{c.summary}"</span> ({timeStr})
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  {/* Smart Solutions suggestions */}
                  <div className="space-y-2.5 pt-2 border-t border-rose-900/30 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                      💡 SMART CONFLICT SOLVERS:
                    </span>

                    {/* Move to free alternative room */}
                    {alternativeRooms.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-slate-400">Available free rooms during this exact block:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {alternativeRooms.slice(0, 3).map((altRoom) => (
                            <button
                              key={altRoom.id}
                              type="button"
                              onClick={() => setSelectedRoomId(altRoom.id)}
                              className="text-[10px] bg-teal-950/40 hover:bg-teal-900/60 border border-teal-800/40 text-teal-350 py-1.5 px-2.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer font-medium"
                            >
                              <Shuffle className="w-3 h-3 text-teal-400 shrink-0" />
                              Move to: {altRoom.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-450 italic">No alternative room is fully vacant right now.</p>
                    )}

                    {/* Reschedule to next open time */}
                    {suggestedTimeCorrection && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400">Postpone to next vacant time:</p>
                        <button
                          type="button"
                          onClick={() => {
                            setStartTime(suggestedTimeCorrection.start);
                            setEndTime(suggestedTimeCorrection.end);
                          }}
                          className="w-full text-left text-[11px] bg-indigo-950/30 text-indigo-300 hover:bg-indigo-900/50 border border-indigo-800/30 py-2 px-3 rounded-lg transition-all flex items-center justify-between cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5 font-bold">
                            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            Reschedule to {suggestedTimeCorrection.readable}
                          </span>
                          <span className="text-[9px] font-mono text-indigo-400 flex items-center gap-1 font-bold uppercase shrink-0">
                            Apply <ArrowRight className="w-3 h-3" />
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Manual Override authorization */}
                  <label className="flex items-center gap-2 pt-2 border-t border-rose-900/30 text-[11px] text-rose-300 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bypassConflict}
                      onChange={(e) => setBypassConflict(e.target.checked)}
                      className="rounded bg-slate-950 border-rose-900 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Yes, authorize double-booking room anyway</span>
                  </label>
                </motion.div>
              )}

              <div className="flex items-center gap-2 p-3 bg-indigo-950/40 border border-indigo-900/30 rounded-xl text-[11px] text-indigo-300">
                <Users className="w-4 h-4 shrink-0" />
                <span>
                  You will automatically be added as the owner and attendee of the event reservation ({userEmail}).
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2 rounded-lg shadow-md hover:shadow-indigo-950/50 flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {isSubmitting ? 'Scheduling...' : 'Reserve Now'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
