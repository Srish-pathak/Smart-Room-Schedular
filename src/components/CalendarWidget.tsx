import React, { useState, useEffect, useMemo } from 'react';
import { Room } from '../types';
import { bookingsAPI } from '../lib/api';
import { createGoogleCalendarUrl, buildMeetingDetailsText } from '../utils/calendarUrl';
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
  ArrowRight,
  ExternalLink,
  Edit2,
  Copy,
  CheckCircle2,
  Share2,
  QrCode
} from 'lucide-react';
import { motion } from 'motion/react';

interface CalendarWidgetProps {
  rooms: Room[];
  userEmail: string;
  userName: string;
  userRole?: string;
  onRefreshRoomsStatus: () => void;
  onBookingAdded: (roomName: string, summary: string, startTime: string, endTime: string, agenda?: string) => void;
  defaultSelectedRoomId?: string;
}

export default function CalendarWidget({
  rooms = [],
  userEmail,
  userName,
  userRole = 'student',
  onRefreshRoomsStatus,
  onBookingAdded,
  defaultSelectedRoomId,
}: CalendarWidgetProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverConflict, setServerConflict] = useState<any>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

  // Success Confirmation Modal State
  const [successBooking, setSuccessBooking] = useState<{
    id?: string;
    title: string;
    roomName: string;
    building?: string;
    startTime: string;
    endTime: string;
    date?: string;
    description?: string;
    organizer?: string;
    organizerEmail?: string;
    attendees?: string[];
    notes?: string;
  } | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [conflictResolverData, setConflictResolverData] = useState<{
    requestedRoom: Room;
    requestedStartTime: string;
    requestedEndTime: string;
    requestedDate: string;
    conflictingEvents: {
      summary: string;
      startTime: string;
      endTime: string;
      creatorName: string;
    }[];
    suggestedTimes: {
      start: string;
      end: string;
      label: string;
      differenceText: string;
    }[];
    alternativeRoomsList: any[];
  } | null>(null);

  // Form states
  const [selectedRoomId, setSelectedRoomId] = useState(defaultSelectedRoomId || (rooms && rooms[0]?.id) || '');
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
  const selectedRoom = useMemo(() => (rooms || []).find((r) => r.id === selectedRoomId), [rooms, selectedRoomId]);
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

      return (rooms || []).filter((r) => {
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

  // Find next optimal slot on the same day when this room is completely free without nested conflicts
  const suggestedTimeCorrection = useMemo(() => {
    if (conflicts.length === 0) return null;
    try {
      const startMs = new Date(`${date}T${startTime}:00`).getTime();
      const endMs = new Date(`${date}T${endTime}:00`).getTime();
      const durationMs = endMs - startMs;
      const finalDuration = durationMs > 0 ? durationMs : 3600000;

      const dayStart = new Date(`${date}T07:00:00`);
      const dayEnd = new Date(`${date}T21:00:00`);

      let scanStart = dayStart;
      const now = new Date();
      // If date is today, don't propose past slots
      if (date === now.toISOString().split('T')[0]) {
        const currentMs = now.getTime();
        const min15 = 15 * 60 * 1000;
        const roundedCurrent = new Date(Math.ceil(currentMs / min15) * min15);
        if (roundedCurrent > scanStart) {
          scanStart = roundedCurrent;
        }
      }

      const endLimit = new Date(dayEnd.getTime() - finalDuration);

      // Filter events belonging to selected room
      const roomEvents = events.filter((e) => {
        const loc = (e.location || '').toLowerCase();
        if (!selectedRoomName || !loc.includes(selectedRoomName.toLowerCase())) return false;
        const sDate = e.start?.dateTime || e.start?.date;
        if (!sDate) return false;
        return new Date(sDate).toISOString().split('T')[0] === date;
      });

      // Scan in 15-minute increments
      let candidate = new Date(scanStart.getTime());
      let foundSlot = null;

      while (candidate <= endLimit) {
        const condStart = candidate.getTime();
        const condEnd = condStart + finalDuration;

        const hasOverlap = roomEvents.some((e) => {
          const eStart = new Date(e.start?.dateTime || e.start?.date || '').getTime();
          const eEnd = new Date(e.end?.dateTime || e.end?.date || '').getTime();
          if (isNaN(eStart) || isNaN(eEnd)) return false;

          return condStart < eEnd && condEnd > eStart;
        });

        if (!hasOverlap) {
          foundSlot = new Date(condStart);
          break;
        }

        candidate = new Date(candidate.getTime() + 15 * 60 * 1000);
      }

      if (foundSlot) {
        const foundEnd = new Date(foundSlot.getTime() + finalDuration);

        const pad = (num: number) => String(num).padStart(2, '0');
        const startStr = `${pad(foundSlot.getHours())}:${pad(foundSlot.getMinutes())}`;
        const endStr = `${pad(foundEnd.getHours())}:${pad(foundEnd.getMinutes())}`;

        return {
          start: startStr,
          end: endStr,
          readable: `${startStr} – ${endStr}`,
        };
      }
      return null;
    } catch {
      return null;
    }
  }, [conflicts, date, startTime, endTime, events, selectedRoomName]);

  // Compute adjacent buffer warnings (within 15 minutes buffer window) to identify high-density back-to-back slot congestion
  const bufferWarnings = useMemo(() => {
    if (!selectedRoomName || conflicts.length > 0) return [];
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

        const disBefore = selectedStart.getTime() - eend.getTime();
        const disAfter = estart.getTime() - selectedEnd.getTime();

        return (disBefore >= 0 && disBefore < 900000) || (disAfter >= 0 && disAfter < 900000);
      });
    } catch {
      return [];
    }
  }, [events, selectedRoomName, date, startTime, endTime, conflicts]);

  // Compute database and calendar events for the selected room on the selected date for visual timeline layout
  const dailyOccupancy = useMemo(() => {
    if (!selectedRoomName) return [];
    try {
      return events.filter((e) => {
        const loc = (e.location || '').toLowerCase();
        if (!loc.includes(selectedRoomName.toLowerCase())) return false;

        const sDate = e.start?.dateTime || e.start?.date;
        if (!sDate) return false;

        const d = new Date(sDate).toISOString().split('T')[0];
        return d === date;
      }).map((e) => {
        const sStr = e.start?.dateTime || e.start?.date || '';
        const eStr = e.end?.dateTime || e.end?.date || '';
        const st = new Date(sStr);
        const et = new Date(eStr);
        
        const startMin = st.getHours() * 60 + st.getMinutes();
        const endMin = et.getHours() * 60 + et.getMinutes();
        
        return {
          id: e.id,
          summary: e.summary || 'Reserved Slot',
          startMin,
          endMin,
          startStr: st.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          endStr: et.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      });
    } catch {
      return [];
    }
  }, [events, selectedRoomName, date]);

  // Translate user-selected start/end times into minutes from midnight for layout positioning
  const userSelectedRange = useMemo(() => {
    try {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
      return {
        startMin: sh * 60 + sm,
        endMin: eh * 60 + em,
      };
    } catch {
      return null;
    }
  }, [startTime, endTime]);

  const fetchCalendarEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const dbBookings = await bookingsAPI.list();
      const bookingsArray = Array.isArray(dbBookings) ? dbBookings : [];
      
      const mappedDbEvents = bookingsArray.map((b: any) => ({
        id: b.id,
        summary: b.summary,
        description: b.agenda,
        location: b.room_name,
        creator: { email: b.creator_email, displayName: b.creator_name },
        start: { dateTime: b.start_time },
        end: { dateTime: b.end_time },
        attendees: b.attendee_email ? [{ email: b.attendee_email }] : [],
        faculty_id: b.faculty_id || ''
      }));

      setEvents(mappedDbEvents);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not fetch central space schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
  }, [rooms]);

  const triggerConflictResolver = (localConflicts: any[]) => {
    if (!selectedRoom) return;

    const [stH, stM] = startTime.split(':').map(Number);
    const [etH, etM] = endTime.split(':').map(Number);
    const proposedDurationMin = (etH * 60 + etM) - (stH * 60 + stM);
    const durationMs = proposedDurationMin * 60 * 1000;

    const suggestions: { start: string; end: string; label: string; differenceText: string }[] = [];

    const formatHM = (d: Date) => {
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    };

    const isSlotCandidateFree = (sTime: string, eTime: string) => {
      if (!selectedRoomName) return false;
      const sDateStr = `${date}T${sTime}:00`;
      const eDateStr = `${date}T${eTime}:00`;
      const reqStart = new Date(sDateStr);
      const reqEnd = new Date(eDateStr);
      
      if (reqStart >= reqEnd) return false;

      const dayStart = new Date(`${date}T07:00:00`);
      const dayEnd = new Date(`${date}T21:00:00`);
      if (reqStart < dayStart || reqEnd > dayEnd) return false;

      const now = new Date();
      if (date === now.toISOString().split('T')[0] && reqStart.getTime() <= now.getTime()) {
        return false;
      }

      return !events.some((e) => {
        const loc = e.location || '';
        if (!loc.toLowerCase().includes(selectedRoomName.toLowerCase())) return false;
        const estart = new Date(e.start?.dateTime || e.start?.date || '');
        const eend = new Date(e.end?.dateTime || e.end?.date || '');
        if (isNaN(estart.getTime()) || isNaN(eend.getTime())) return false;
        return reqStart < eend && reqEnd > estart;
      });
    };

    const firstConflict = localConflicts[0];
    const cStart = new Date(firstConflict.start?.dateTime || firstConflict.start?.date || '');
    const cEnd = new Date(firstConflict.end?.dateTime || firstConflict.end?.date || '');

    if (!isNaN(cStart.getTime()) && !isNaN(cEnd.getTime())) {
      const earlierStart = new Date(cStart.getTime() - durationMs);
      const earlierStartStr = formatHM(earlierStart);
      const earlierEndStr = formatHM(cStart);
      if (isSlotCandidateFree(earlierStartStr, earlierEndStr)) {
        suggestions.push({
          start: earlierStartStr,
          end: earlierEndStr,
          label: 'Shift earlier to finish clean before existing meeting starts',
          differenceText: `Starts ${earlierStartStr} — Ends ${earlierEndStr} (${proposedDurationMin} min duration)`
        });
      }

      const laterEnd = new Date(cEnd.getTime() + durationMs);
      const laterStartStr = formatHM(cEnd);
      const laterEndStr = formatHM(laterEnd);
      if (isSlotCandidateFree(laterStartStr, laterEndStr)) {
        suggestions.push({
          start: laterStartStr,
          end: laterEndStr,
          label: 'Postpone later to start right after the current occupant vacates',
          differenceText: `Starts ${laterStartStr} — Ends ${laterEndStr} (${proposedDurationMin} min duration)`
        });
      }
    }

    if (suggestedTimeCorrection) {
      const alreadyAdded = suggestions.some(
        s => s.start === suggestedTimeCorrection.start && s.end === suggestedTimeCorrection.end
      );
      if (!alreadyAdded && isSlotCandidateFree(suggestedTimeCorrection.start, suggestedTimeCorrection.end)) {
        suggestions.push({
          start: suggestedTimeCorrection.start,
          end: suggestedTimeCorrection.end,
          label: 'Select next fully vacant standard booking window',
          differenceText: `Starts ${suggestedTimeCorrection.start} — Ends ${suggestedTimeCorrection.end}`
        });
      }
    }

    if (suggestions.length === 0) {
      const offsets = [-30, 30, -60, 60, -90, 90, -120, 120];
      for (const offset of offsets) {
        const baseStart = new Date(`${date}T${startTime}:00`);
        const offsetStart = new Date(baseStart.getTime() + offset * 60 * 1000);
        const offsetEnd = new Date(offsetStart.getTime() + durationMs);
        const sStr = formatHM(offsetStart);
        const eStr = formatHM(offsetEnd);
        if (isSlotCandidateFree(sStr, eStr)) {
          suggestions.push({
            start: sStr,
            end: eStr,
            label: `Shift schedule by ${Math.abs(offset)} minutes ${offset < 0 ? 'earlier' : 'later'}`,
            differenceText: `Starts ${sStr} — Ends ${eStr}`
          });
          if (suggestions.length >= 3) break;
        }
      }
    }

    setConflictResolverData({
      requestedRoom: selectedRoom,
      requestedStartTime: startTime,
      requestedEndTime: endTime,
      requestedDate: date,
      conflictingEvents: localConflicts.map(c => ({
        summary: c.summary,
        startTime: c.start?.dateTime || c.start?.date,
        endTime: c.end?.dateTime || c.end?.date,
        creatorName: c.creator?.displayName || c.creator?.email || 'Student Occupant'
      })),
      suggestedTimes: suggestions,
      alternativeRoomsList: alternativeRooms || []
    });
  };

  const triggerServerConflictResolver = (conflict: any) => {
    if (!selectedRoom) return;

    const [stH, stM] = startTime.split(':').map(Number);
    const [etH, etM] = endTime.split(':').map(Number);
    const proposedDurationMin = (etH * 60 + etM) - (stH * 60 + stM);
    const durationMs = proposedDurationMin * 60 * 1000;

    const suggestions: { start: string; end: string; label: string; differenceText: string }[] = [];

    const formatHM = (d: Date) => {
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    };

    const isSlotCandidateFree = (sTime: string, eTime: string) => {
      if (!selectedRoomName) return false;
      const sDateStr = `${date}T${sTime}:00`;
      const eDateStr = `${date}T${eTime}:00`;
      const reqStart = new Date(sDateStr);
      const reqEnd = new Date(eDateStr);
      
      if (reqStart >= reqEnd) return false;

      const dayStart = new Date(`${date}T07:00:00`);
      const dayEnd = new Date(`${date}T21:00:00`);
      if (reqStart < dayStart || reqEnd > dayEnd) return false;

      const now = new Date();
      if (date === now.toISOString().split('T')[0] && reqStart.getTime() <= now.getTime()) {
        return false;
      }

      return !events.some((e) => {
        const loc = e.location || '';
        if (!loc.toLowerCase().includes(selectedRoomName.toLowerCase())) return false;
        const estart = new Date(e.start?.dateTime || e.start?.date || '');
        const eend = new Date(e.end?.dateTime || e.end?.date || '');
        if (isNaN(estart.getTime()) || isNaN(eend.getTime())) return false;
        return reqStart < eend && reqEnd > estart;
      });
    };

    const cOB = conflict.overlappingBooking;
    if (cOB) {
      const cStart = new Date(cOB.startTime);
      const cEnd = new Date(cOB.endTime);

      if (!isNaN(cStart.getTime()) && !isNaN(cEnd.getTime())) {
        const earlierStart = new Date(cStart.getTime() - durationMs);
        const earlierStartStr = formatHM(earlierStart);
        const earlierEndStr = formatHM(cStart);
        if (isSlotCandidateFree(earlierStartStr, earlierEndStr)) {
          suggestions.push({
            start: earlierStartStr,
            end: earlierEndStr,
            label: 'Shift earlier to finish solid before conflict starts',
            differenceText: `Starts ${earlierStartStr} — Ends ${earlierEndStr} (${proposedDurationMin} min duration)`
          });
        }

        const laterEnd = new Date(cEnd.getTime() + durationMs);
        const laterStartStr = formatHM(cEnd);
        const laterEndStr = formatHM(laterEnd);
        if (isSlotCandidateFree(laterStartStr, laterEndStr)) {
          suggestions.push({
            start: laterStartStr,
            end: laterEndStr,
            label: 'Postpone later to start right after the conflict clears',
            differenceText: `Starts ${laterStartStr} — Ends ${laterEndStr} (${proposedDurationMin} min duration)`
          });
        }
      }
    }

    if (conflict.advisorVacancyTime) {
      const vacantDate = new Date(conflict.advisorVacancyTime);
      const vacantEnd = new Date(vacantDate.getTime() + durationMs);
      const sStr = formatHM(vacantDate);
      const eStr = formatHM(vacantEnd);
      if (isSlotCandidateFree(sStr, eStr)) {
        suggestions.push({
          start: sStr,
          end: eStr,
          label: 'Default optimal vacancy window recommendation',
          differenceText: `Starts ${sStr} — Ends ${eStr}`
        });
      }
    }

    setConflictResolverData({
      requestedRoom: selectedRoom,
      requestedStartTime: startTime,
      requestedEndTime: endTime,
      requestedDate: date,
      conflictingEvents: [{
        summary: cOB?.summary || 'Existing Reservation',
        startTime: cOB?.startTime,
        endTime: cOB?.endTime,
        creatorName: cOB?.creatorName || 'Student Occupant'
      }],
      suggestedTimes: suggestions,
      alternativeRoomsList: (conflict.sisterRooms || []).map((sr: any) => {
        return (rooms || []).find(r => r.id === sr.id) || { id: sr.id, name: sr.name, capacity: sr.capacity, features: [], status: 'available' };
      })
    });
  };

  const applySuggestionAndBook = async (suggestedTime?: { start: string, end: string }, suggestedRoomId?: string) => {
    setIsSubmitting(true);
    let targetStart = startTime;
    let targetEnd = endTime;
    let targetRoomId = selectedRoomId;
    let targetRoomName = selectedRoomName;

    if (suggestedTime) {
      targetStart = suggestedTime.start;
      targetEnd = suggestedTime.end;
      setStartTime(suggestedTime.start);
      setEndTime(suggestedTime.end);
    }
    
    if (suggestedRoomId) {
      targetRoomId = suggestedRoomId;
      const rDetail = (rooms || []).find(r => r.id === suggestedRoomId);
      if (rDetail) {
        targetRoomName = rDetail.name;
        setSelectedRoomId(suggestedRoomId);
      }
    }

    const startDateTime = new Date(`${date}T${targetStart}:00`).toISOString();
    const endDateTime = new Date(`${date}T${targetEnd}:00`).toISOString();

    try {
      await bookingsAPI.create({
        roomId: targetRoomId,
        roomName: targetRoomName,
        summary: summary || 'Room Reservation',
        agenda,
        startTime: startDateTime,
        endTime: endDateTime,
        attendeeEmail: attendeeEmail || undefined,
        facultyId: facultyId || undefined,
        bypassConflict: true
      });

      const confirmedData = {
        title: summary || 'Room Reservation',
        roomName: targetRoomName,
        building: (rooms || []).find(r => r.id === targetRoomId)?.building || 'Main Campus',
        startTime: startDateTime,
        endTime: endDateTime,
        date,
        description: agenda,
        organizer: userName || 'Faculty Member',
        organizerEmail: userEmail || 'user@iitbhu.ac.in',
        attendees: attendeeEmail ? [attendeeEmail] : [],
        notes: agenda
      };

      setConflictResolverData(null);
      setShowBookModal(false);
      setSummary('');
      setAgenda('');
      setFacultyId('');
      setAttendeeEmail('');

      setSuccessBooking(confirmedData);
      onBookingAdded(targetRoomName, summary || 'Room Reservation', startDateTime, endDateTime, agenda || '');
      await fetchCalendarEvents();
    } catch (err: any) {
      alert(`Conflict Resolver Booking Error: ${err.message || 'Error occurred.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;

    if (conflicts.length > 0 && !bypassConflict && !isEditing) {
      triggerConflictResolver(conflicts);
      return;
    }

    setServerConflict(null);
    setIsSubmitting(true);
    const roomName = selectedRoom ? selectedRoom.name : 'Unknown Room';

    const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();

    try {
      if (isEditing && editingBookingId) {
        await bookingsAPI.update(editingBookingId, {
          roomId: selectedRoomId,
          roomName,
          summary,
          agenda,
          startTime: startDateTime,
          endTime: endDateTime,
          attendeeEmail: attendeeEmail || undefined,
          facultyId: facultyId || undefined,
          bypassConflict: bypassConflict
        });
      } else {
        await bookingsAPI.create({
          roomId: selectedRoomId,
          roomName,
          summary,
          agenda,
          startTime: startDateTime,
          endTime: endDateTime,
          attendeeEmail: attendeeEmail || undefined,
          facultyId: facultyId || undefined,
          bypassConflict: bypassConflict
        });
      }

      const confirmedData = {
        title: summary,
        roomName,
        building: selectedRoom?.building || 'Main Campus',
        startTime: startDateTime,
        endTime: endDateTime,
        date,
        description: agenda,
        organizer: userName || 'Faculty Member',
        organizerEmail: userEmail || 'user@iitbhu.ac.in',
        attendees: attendeeEmail ? [attendeeEmail] : [],
        notes: agenda
      };

      setShowBookModal(false);
      setSummary('');
      setAgenda('');
      setFacultyId('');
      setAttendeeEmail('');
      setIsEditing(false);
      setEditingBookingId(null);

      setSuccessBooking(confirmedData);
      onBookingAdded(roomName, summary, startDateTime, endDateTime, agenda || '');
      await fetchCalendarEvents();
    } catch (err: any) {
      if (err.status === 409 && err.conflict) {
        setServerConflict(err.conflict);
        triggerServerConflictResolver(err.conflict);
      } else {
        alert(`Reservation Error: ${err.message || 'Conflict occurred. Check your timeline settings.'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string, summary: string) => {
    const isApproved = window.confirm(`Are you sure you want to cancel the meeting: "${summary}"?`);
    if (!isApproved) return;

    try {
      setLoading(true);
      await bookingsAPI.delete(eventId);
      await fetchCalendarEvents();
      onRefreshRoomsStatus();
    } catch (err: any) {
      alert(`Deletion Error: ${err.message || 'Action restricted.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="calendar_events_panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-semibold tracking-tight">Interactive Booking Schedule</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCalendarEvents}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-lg disabled:opacity-50"
            title="Refresh bookings directory"
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

      {/* Direct Calendar Add Information Banner */}
      <div className="mb-6 p-4 rounded-xl border bg-[#18A999]/10 border-[#18A999]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#18A999]/20 text-[#18A999] border border-[#18A999]/30">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-slate-200">
              Direct Google Calendar Integration
            </h4>
            <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
              Book your room seamlessly in Firestore and click <strong className="text-[#18A999]">"📅 Add to Google Calendar"</strong> after confirmation to save meetings directly into your personal calendar without any OAuth setup!
            </p>
          </div>
        </div>
      </div>

      {loading && events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
          <Loader className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-sm font-medium">Fetching real-time room reservations...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-900/30">
          <Calendar className="w-10 h-10 text-slate-700 mb-3" />
          <p className="text-sm font-medium text-slate-400">No upcoming room reservations scheduled</p>
          <p className="text-xs text-slate-500 max-w-sm mt-1 px-4">
            Book a room above to place a room reservation!
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
                <div className="flex items-center justify-between w-full flex-wrap gap-2">
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

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Add to Google Calendar Button */}
                    <a
                      href={createGoogleCalendarUrl({
                        title: event.summary || 'IIT (BHU) Room Booking',
                        roomName: event.location || 'IIT (BHU) Campus',
                        startTime: event.start?.dateTime || new Date().toISOString(),
                        endTime: event.end?.dateTime || new Date().toISOString(),
                        description: event.description,
                        organizer: event.creator?.displayName,
                        organizerEmail: event.creator?.email,
                        notes: event.description
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#18A999] bg-[#18A999]/10 hover:bg-[#18A999]/20 border border-[#18A999]/30 rounded-lg transition-all"
                      title="Add to Google Calendar in new tab"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Add to Calendar</span>
                    </a>

                    {/* Edit Booking (Only if owner) */}
                    {(event.creator?.email?.toLowerCase() === userEmail.toLowerCase()) && (
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setEditingBookingId(event.id);
                          setSummary(event.summary || '');
                          setAgenda(event.description || '');

                          const matchedRoom = rooms.find(
                            (r) => r.name.toLowerCase() === (event.location || '').toLowerCase()
                          );
                          if (matchedRoom) {
                            setSelectedRoomId(matchedRoom.id);
                          }

                          if (start) {
                            setDate(start.toISOString().split('T')[0]);
                            const shStr = String(start.getHours()).padStart(2, '0') + ':' + String(start.getMinutes()).padStart(2, '0');
                            setStartTime(shStr);
                          }
                          if (end) {
                            const ehStr = String(end.getHours()).padStart(2, '0') + ':' + String(end.getMinutes()).padStart(2, '0');
                            setEndTime(ehStr);
                          }

                          setFacultyId(event.faculty_id || '');
                          setAttendeeEmail(event.attendees?.[0]?.email || '');
                          setShowBookModal(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/20 rounded-lg transition-all"
                        title="Edit meeting details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete Booking */}
                    {((event.creator?.email?.toLowerCase() === userEmail.toLowerCase()) || userRole === 'admin') && (
                      <button
                        onClick={() => handleDeleteEvent(event.id, event.summary)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                        title="Cancel reservation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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
                {isEditing ? 'Modify Scheduled Reservation' : 'Book Room on Google Calendar'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isEditing 
                  ? 'Updates the active meeting details on the central database and Google Calendar.'
                  : 'Creates a real-world calendar event on your Google Account with full tracking.'}
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
                      : bufferWarnings.length > 0
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800/40'
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${conflicts.length > 0 ? 'bg-rose-400 animate-pulse' : bufferWarnings.length > 0 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                    {conflicts.length > 0 ? 'OVERLAP CONFLICT' : bufferWarnings.length > 0 ? 'TIGHT SCHEDULE' : 'SAFE & AVAILABLE'}
                  </span>
                </div>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {(rooms || []).map((room) => (
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

              {/* DYNAMIC TIMELINE & VISUAL OVERLAP WARNING */}
              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-3.5 mt-4 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-350 flex items-center gap-1.5 font-sans">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    Timeline Availability Indicator
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                    7:00 AM – 9:00 PM
                  </span>
                </div>

                {/* Timeline visual bar track */}
                <div className="relative h-15 bg-slate-950 border border-slate-900/40 rounded-xl overflow-hidden select-none">
                  {/* Grid Lines for Hours (Every 2 hours) */}
                  {[8, 10, 12, 14, 16, 18, 20].map((hour) => {
                    const pct = ((hour * 60 - 420) / 840) * 100;
                    return (
                      <div
                        key={hour}
                        className="absolute inset-y-0 border-l border-slate-900/60 pointer-events-none flex flex-col justify-end pb-1 z-0"
                        style={{ left: `${pct}%` }}
                      >
                        <span className="text-[8px] font-mono text-slate-650 block pl-1 transform scale-90 origin-left font-bold">
                          {hour > 12 ? `${hour - 12}PM` : hour === 12 ? '12PM' : `${hour}AM`}
                        </span>
                      </div>
                    );
                  })}

                  {/* Layer 1: Existing Occupied slots in Room */}
                  {dailyOccupancy.map((occ, idx) => {
                    const left = Math.max(0, Math.min(100, ((occ.startMin - 420) / 840) * 100));
                    const right = Math.max(0, Math.min(100, ((occ.endMin - 420) / 840) * 100));
                    const width = Math.max(1.5, right - left);
                    return (
                      <div
                        key={occ.id || idx}
                        className="absolute top-2 h-6 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-md text-[9px] font-mono flex items-center justify-center text-slate-400 overflow-hidden px-1.5 cursor-help transition-all group/occ z-10"
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`${occ.summary} (${occ.startStr} - ${occ.endStr})`}
                      >
                        {width > 12 && (
                          <span className="truncate max-w-full scale-90 font-medium block">
                            {occ.summary}
                          </span>
                        )}
                        {/* Interactive tooltip hover element */}
                        <div className="absolute top-full mb-1 opacity-0 group-hover/occ:opacity-100 bg-slate-900 border border-slate-800 text-slate-300 px-2 py-1.5 rounded-lg text-[9px] whitespace-nowrap z-30 transition-all shadow-xl pointer-events-none -translate-y-11">
                          <strong className="text-white block">{occ.summary}</strong>
                          <span className="text-slate-400 font-mono mt-0.5 block">{occ.startStr} – {occ.endStr}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Layer 2: Selected slot highlight with responsive color change if conflict / overlap exists */}
                  {userSelectedRange && (
                    <div
                      className={`absolute top-1.5 h-7 rounded-md flex items-center justify-center transition-all z-20 ${
                        conflicts.length > 0
                          ? 'bg-rose-500/25 border-2 border-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse'
                          : bufferWarnings.length > 0
                          ? 'bg-amber-500/20 border-2 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-450/45'
                          : 'bg-emerald-500/20 border-2 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                      }`}
                      style={{
                        left: `${Math.max(0, Math.min(100, ((userSelectedRange.startMin - 420) / 840) * 100))}%`,
                        width: `${Math.max(2, Math.min(100, (((userSelectedRange.endMin - userSelectedRange.startMin) - 0) / 840) * 100))}%`
                      }}
                    >
                      <span className={`text-[8px] font-mono font-black tracking-wider px-1 text-center scale-90 ${
                        conflicts.length > 0 
                          ? 'text-rose-450 text-shadow-sm animate-pulse' 
                          : bufferWarnings.length > 0
                          ? 'text-amber-450' 
                          : 'text-emerald-450'
                      }`}>
                        {conflicts.length > 0 ? 'OVERLAP ALERT' : bufferWarnings.length > 0 ? 'TIGHT TRANSITION' : 'YOUR SELECTION'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Timeline Status Legends & Conflict warnings */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 font-mono flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-1.5 rounded-sm bg-slate-800 border border-slate-750" />
                      Occupied
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-1.5 rounded-sm bg-emerald-500/20 border border-emerald-500" />
                      Free Selection
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-1.5 rounded-sm bg-amber-500/20 border border-amber-500" />
                      Tight Buffer (&lt;15 min)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-1.5 rounded-sm bg-rose-500/25 border border-rose-500" />
                      Overlap Alert
                    </span>
                  </div>
                  {conflicts.length > 0 ? (
                    <span className="text-rose-400 font-bold flex items-center gap-1 select-none animate-bounce">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      BOOKING OVERLAPS INSTANTLY
                    </span>
                  ) : bufferWarnings.length > 0 ? (
                    <span className="text-amber-400 font-bold flex items-center gap-1 select-none animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      TIGHT TRANSITION CAUTION
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 select-none">
                      ✓ CLEAR SLOT AVAILABLE
                    </span>
                  )}
                </div>
              </div>

              {/* Tight Buffer Advice Section */}
              {bufferWarnings.length > 0 && conflicts.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-amber-950/20 border border-amber-900/30 rounded-xl space-y-2"
                >
                  <div className="flex items-start gap-2.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-left">
                      <span className="font-bold text-amber-300 block">⚠️ Adjacent Scheduling Congestion Advice</span>
                      <span className="text-[11px] text-slate-350 block font-sans">
                        Your selection borders within a 15-minute window of another scheduled event. Ensure there is enough handover/setup time:
                      </span>
                      <ul className="list-disc list-inside text-[10.5px] text-slate-400 space-y-0.5 pl-1 font-sans">
                        {bufferWarnings.map((e, idx) => {
                          const cStart = e.start?.dateTime ? new Date(e.start.dateTime) : null;
                          const cEnd = e.end?.dateTime ? new Date(e.end.dateTime) : null;
                          const timeStr = cStart && cEnd
                            ? `${cStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${cEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : 'All Day';
                          return (
                            <li key={idx}>
                              <span className="text-slate-300 font-semibold">"{e.summary}"</span> is scheduled for {timeStr}.
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Conflict Status Warning & Smart Resolvers Section */}
              {(conflicts.length > 0 || serverConflict) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-rose-950/30 border border-rose-900/40 rounded-xl space-y-3"
                >
                  <div className="flex items-start gap-2.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-450 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-left">
                      <span className="font-bold text-rose-300 block">⚠️ Time-Slot Conflict Detected</span>
                      <span className="text-[11px] text-slate-350 block">
                        {selectedRoomName} has active overlapping booking constraints:
                      </span>
                      {serverConflict?.overlappingBooking ? (
                        <div className="text-[10.5px] text-slate-400 bg-slate-950/40 p-2 rounded border border-rose-900/20 font-mono mt-1">
                          <strong className="text-slate-300 font-sans block">"{serverConflict.overlappingBooking.summary}"</strong>
                          <span>Booked by: {serverConflict.overlappingBooking.creatorName}</span><br />
                          <span>Duration: {new Date(serverConflict.overlappingBooking.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(serverConflict.overlappingBooking.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      ) : (
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
                      )}
                    </div>
                  </div>

                  {/* Smart Solutions suggestions */}
                  <div className="space-y-2.5 pt-2 border-t border-rose-900/30 text-xs text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                      💡 SMART CONFLICT SOLVERS:
                    </span>

                    {/* Move to free alternative room */}
                    {((serverConflict?.sisterRooms && serverConflict.sisterRooms.length > 0) || alternativeRooms.length > 0) ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-slate-400">Available free rooms during this exact block:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(serverConflict?.sisterRooms ? serverConflict.sisterRooms : alternativeRooms).slice(0, 3).map((altRoom: any) => (
                            <button
                              key={altRoom.id}
                              type="button"
                              onClick={() => {
                                setSelectedRoomId(altRoom.id);
                                setServerConflict(null);
                              }}
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
                    {(serverConflict?.advisorVacancyTime || suggestedTimeCorrection) && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400">Postpone to next vacant time:</p>
                        <button
                          type="button"
                          onClick={() => {
                            if (serverConflict?.advisorVacancyTime) {
                              const vacantDate = new Date(serverConflict.advisorVacancyTime);
                              // Set end time 1 hour after vacant date
                              const vacantEnd = new Date(vacantDate.getTime() + 60*60*1000);
                              
                              const pad = (n: number) => String(n).padStart(2, '0');
                              setStartTime(`${pad(vacantDate.getHours())}:${pad(vacantDate.getMinutes())}`);
                              setEndTime(`${pad(vacantEnd.getHours())}:${pad(vacantEnd.getMinutes())}`);
                              setDate(vacantDate.toISOString().split('T')[0]);
                            } else if (suggestedTimeCorrection) {
                              setStartTime(suggestedTimeCorrection.start);
                              setEndTime(suggestedTimeCorrection.end);
                            }
                            setServerConflict(null);
                          }}
                          className="w-full text-left text-[11px] bg-indigo-950/30 text-indigo-300 hover:bg-indigo-900/50 border border-indigo-800/30 py-2 px-3 rounded-lg transition-all flex items-center justify-between cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5 font-bold">
                            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            Reschedule to Next Available Slot
                          </span>
                          <span className="text-[9px] font-mono text-indigo-400 flex items-center gap-1 font-bold uppercase shrink-0">
                            Apply <ArrowRight className="w-3 h-3" />
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Manual Override authorization */}
                    <label className="flex items-center gap-2 pt-2.5 border-t border-rose-900/30 text-[11px] text-rose-300 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bypassConflict}
                        onChange={(e) => setBypassConflict(e.target.checked)}
                        className="rounded bg-slate-950 border-rose-900 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>Overrule and reserve space with bypass authorization</span>
                    </label>

                  </div>
                </motion.div>
              )}

              {/* Dynamic Confirmation Summary Card (Requirement 5) */}
              <div className="p-4 bg-emerald-950/25 border border-emerald-500/30 rounded-2xl space-y-2 text-left">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block font-mono">
                  📋 RESERVATION SUMMARY CONFIRMATION
                </span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[9.5px] uppercase font-mono">Selected Room</span>
                    <strong className="text-white font-extrabold">{selectedRoomName || 'Not Selected'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9.5px] uppercase font-mono">Building Location</span>
                    <strong className="text-emerald-300 font-extrabold">{selectedRoom?.building || 'Main Campus'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9.5px] uppercase font-mono">Scheduled Date</span>
                    <strong className="text-white font-extrabold font-mono">{date || 'TBD'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9.5px] uppercase font-mono">Time Window</span>
                    <strong className="text-white font-extrabold font-mono">
                      {startTime || 'TBD'} – {endTime || 'TBD'}
                    </strong>
                  </div>
                </div>
                {(summary || agenda) && (
                  <div className="pt-2 border-t border-emerald-950/40 text-xs">
                    <span className="text-slate-500 block text-[9.5px] uppercase font-mono">Intended Purpose</span>
                    <p className="text-slate-300 font-medium line-clamp-2 mt-0.5">
                      {summary ? `"${summary}"` : ''} {agenda ? `— ${agenda}` : ''}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 p-3 bg-indigo-950/40 border border-indigo-900/30 rounded-xl text-[11px] text-indigo-300">
                <Users className="w-4 h-4 shrink-0" />
                <span>
                  You will automatically be added as the owner and attendee of the event reservation ({userEmail}).
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowBookModal(false);
                    setIsEditing(false);
                    setEditingBookingId(null);
                  }}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2 rounded-lg shadow-md hover:shadow-indigo-950/50 flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : isEditing ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {isSubmitting ? (isEditing ? 'Updating...' : 'Scheduling...') : isEditing ? 'Save Changes' : 'Reserve Now'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Interactive Scheduling Conflict Advisor Modal */}
      {conflictResolverData && (
        <div id="conflict_resolver_modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col text-left"
          >
            {/* Header */}
            <div className="p-5 bg-rose-950/25 border-b border-rose-900/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-rose-950 border border-rose-800/40 rounded-lg text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide font-mono">
                    Time-Slot Partial Overlap Conflict
                  </h3>
                  <p className="text-xs text-rose-300">
                    Your reservation requests overlap with an existing occupancy constraint. No worries! Select a smart override.
                  </p>
                </div>
              </div>
            </div>

            {/* Core Body Container */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Overlapping Reservation info block */}
              <div className="p-3.5 bg-slate-950 border border-rose-950 rounded-xl space-y-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                  🚨 Overlapping Slot Occupied by Another Reservation:
                </span>
                {conflictResolverData.conflictingEvents.map((evt, idx) => {
                  const sTime = evt.startTime ? new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown';
                  const eTime = evt.endTime ? new Date(evt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown';
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      <div>
                        <div className="text-sm font-semibold text-slate-200">
                          "{evt.summary}"
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Booked by: <span className="text-slate-300 font-medium">{evt.creatorName}</span>
                        </div>
                      </div>
                      <div className="bg-rose-950/40 text-rose-300 border border-rose-900/35 px-2.5 py-1 rounded-md text-xs font-mono font-bold shrink-0 self-start sm:self-auto uppercase">
                        {sTime} – {eTime}
                      </div>
                    </div>
                  );
                })}
                <p className="text-[11px] text-slate-400 italic pl-1 leading-relaxed">
                  Requested parameters: <span className="text-slate-300 font-mono font-bold">{conflictResolverData.requestedRoom.name}</span> on <span className="text-slate-300 font-mono font-bold">{conflictResolverData.requestedDate}</span> @ <span className="text-rose-400 font-mono font-bold">{conflictResolverData.requestedStartTime} - {conflictResolverData.requestedEndTime}</span>.
                </p>
              </div>

              {/* Option Track A: Shifting to alternative free intervals */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider font-mono">
                    Option A: Adjust Time (Smart Alternatives)
                  </span>
                </div>
                {conflictResolverData.suggestedTimes.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {conflictResolverData.suggestedTimes.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => applySuggestionAndBook(suggestion, undefined)}
                        disabled={isSubmitting}
                        className="w-full text-left bg-indigo-950/20 hover:bg-slate-800 border border-indigo-900/35 hover:border-indigo-500/50 p-3.5 rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 group"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-indigo-300 group-hover:text-indigo-200">
                            {suggestion.label}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {suggestion.differenceText}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 bg-indigo-950 group-hover:bg-indigo-600 border border-indigo-800/40 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 group-hover:text-white transition-all uppercase tracking-wider text-[10px] font-bold">
                          <span>Apply</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800 italic text-[11px] text-slate-450">
                    No vacant adjacent window is available today. Shift dates or swap to other spaces in order to bypass this.
                  </div>
                )}
              </div>

              {/* Option Track B: Swapping spaces */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  <span className="text-xs font-bold text-teal-300 uppercase tracking-wider font-mono">
                    Option B: Move to Available Room (Original Time)
                  </span>
                </div>
                {conflictResolverData.alternativeRoomsList.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {conflictResolverData.alternativeRoomsList.slice(0, 3).map((altRoom: any) => (
                      <button
                        key={altRoom.id}
                        type="button"
                        onClick={() => applySuggestionAndBook(undefined, altRoom.id)}
                        disabled={isSubmitting}
                        className="w-full text-left bg-teal-950/10 hover:bg-slate-800 border border-teal-900/30 hover:border-teal-500/50 p-3.5 rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 group"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-200 group-hover:text-teal-300">
                            Switch to Room: {altRoom.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                              Capacity: {altRoom.capacity}
                            </span>
                            <span className="text-[10px] font-bold text-teal-400 font-mono">
                              100% VACANT DURING THIS TIME
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 bg-teal-950 group-hover:bg-teal-600 border border-teal-800/40 px-3 py-1.5 rounded-lg text-xs font-medium text-teal-300 group-hover:text-white transition-all uppercase tracking-wider text-[10px] font-bold">
                          <span>Book Space</span>
                          <Shuffle className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800 italic text-[11px] text-slate-450">
                    All alternate classroom structures are locked during this interval constraint.
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div className="p-5 bg-slate-950 border-t border-slate-800/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setBypassConflict(true);
                  applySuggestionAndBook(undefined, undefined);
                }}
                disabled={isSubmitting}
                className="text-center text-[11px] font-bold text-rose-300 hover:text-rose-200 transition-colors py-2 px-3 hover:bg-rose-950/30 border border-rose-900/25 rounded-xl cursor-pointer order-last sm:order-first"
              >
                Force Overrule Bypass Authorization
              </button>
              
              <button
                type="button"
                onClick={() => setConflictResolverData(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer text-center"
              >
                Modify Schedule Manually
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Booking Confirmed Success Modal */}
      {successBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-lg bg-slate-900 border border-[#18A999]/50 rounded-2xl overflow-hidden shadow-2xl text-left"
          >
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-[#18A999]/20 via-[#128A7E]/10 to-transparent border-b border-[#18A999]/30">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#18A999]/20 border border-[#18A999]/40 rounded-xl text-[#18A999]">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-display">
                    🎉 Booking Confirmed!
                  </h3>
                  <p className="text-xs text-emerald-300/90 mt-0.5">
                    Your room reservation has been successfully stored in Firestore.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {/* Highlight Confirmation Message */}
              <div className="p-4 bg-[#18A999]/10 border border-[#18A999]/30 rounded-xl text-xs text-slate-200 leading-relaxed font-medium">
                Your room has been booked successfully. Click <strong className="text-[#18A999]">Add to Google Calendar</strong> to save this meeting to your personal calendar.
              </div>

              {/* Event Details Grid */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#18A999]">
                  Reservation Details Overview
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Meeting Title</span>
                    <strong className="text-white font-bold">{successBooking.title}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Room & Venue</span>
                    <strong className="text-[#18A999] font-bold">{successBooking.roomName} ({successBooking.building || 'Main Building'})</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Start Time</span>
                    <strong className="text-slate-200 font-mono">
                      {new Date(successBooking.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">End Time</span>
                    <strong className="text-slate-200 font-mono">
                      {new Date(successBooking.endTime).toLocaleTimeString([], { timeStyle: 'short' })}
                    </strong>
                  </div>
                  {successBooking.organizer && (
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-mono block">Organizer</span>
                      <strong className="text-slate-300">{successBooking.organizer}</strong>
                    </div>
                  )}
                  {successBooking.attendees && successBooking.attendees.length > 0 && (
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-mono block">Attendees</span>
                      <strong className="text-slate-300">{successBooking.attendees.join(', ')}</strong>
                    </div>
                  )}
                </div>
                {successBooking.notes && (
                  <div className="pt-2 border-t border-slate-800 text-xs">
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Agenda / Notes</span>
                    <p className="text-slate-300 mt-0.5 italic">"{successBooking.notes}"</p>
                  </div>
                )}
              </div>

              {/* QR Code Pass Card */}
              <div className="p-3.5 bg-slate-950 border border-[#18A999]/30 rounded-xl flex items-center gap-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(`IIT BHU Smart Room Booking Pass\nTitle: ${successBooking.title}\nRoom: ${successBooking.roomName}\nTime: ${new Date(successBooking.startTime).toLocaleString()} - ${new Date(successBooking.endTime).toLocaleTimeString()}\nOrganizer: ${successBooking.organizer || 'User'}`)}`}
                  alt="Booking Verification QR Code"
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-lg border border-slate-800 bg-white p-1 shrink-0"
                />
                <div className="space-y-1 text-left">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#18A999] flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5" /> Official Access Pass QR
                  </span>
                  <p className="text-xs text-slate-300 font-medium">
                    Scan at room terminal or present to department admin for instant verification.
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    ID: {successBooking.id ? successBooking.id.slice(0, 12) + '...' : 'IITBHU-CONFIRMED'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    const url = createGoogleCalendarUrl(successBooking);
                    window.open(url, '_blank');
                  }}
                  className="w-full bg-[#18A999] hover:bg-[#159487] text-white font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#18A999]/20 transition-all text-sm"
                >
                  <Calendar className="w-4 h-4" />
                  <span>📅 Add to Google Calendar</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      const text = buildMeetingDetailsText(successBooking);
                      navigator.clipboard.writeText(text);
                      setCopiedSuccess(true);
                      setTimeout(() => setCopiedSuccess(false), 3000);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all text-xs border border-slate-700"
                  >
                    {copiedSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Details</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setSuccessBooking(null)}
                    className="bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-semibold py-2.5 px-4 rounded-xl cursor-pointer transition-all text-xs border border-slate-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
