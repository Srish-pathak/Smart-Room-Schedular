/**
 * Robust, deterministic conflict solver & validation engine for room bookings.
 */

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface BookingRecord extends TimeSlot {
  id?: string;
  bookingId?: string;
  roomId?: string;
  room_id?: string;
  status?: string;
  summary?: string;
  purpose?: string;
  creatorName?: string;
  creator_name?: string;
}

export interface RoomRecord {
  id: string;
  name: string;
  capacity: number;
  features?: string[];
  facilities?: string[];
  building?: string;
}

export interface StructuredConflict {
  isActive: boolean;
  overlappingBooking: {
    summary: string;
    startTime: string;
    endTime: string;
    creatorName: string;
  };
  sisterRooms: Array<{ id: string; name: string; capacity: number }>;
  advisorVacancyTime: string;
}

/**
 * Checks whether two time intervals overlap.
 * Adjacent/back-to-back intervals (e.g. 10:00-11:00 and 11:00-12:00) do NOT overlap.
 */
export function checkIntervalOverlap(
  startA: string | Date,
  endA: string | Date,
  startB: string | Date,
  endB: string | Date
): boolean {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();

  if (isNaN(sA) || isNaN(eA) || isNaN(sB) || isNaN(eB)) {
    return false;
  }

  return sA < eB && eA > sB;
}

/**
 * Validates requested booking time intervals.
 */
export function validateBookingInterval(
  startTime: string,
  endTime: string,
  isAdmin: boolean = false
): { valid: boolean; error?: string } {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid start or end time format. Expected ISO-8601 string.' };
  }

  if (start.getTime() >= end.getTime()) {
    return { valid: false, error: 'Invalid time interval: Start time must precede end time.' };
  }

  const durationMinutes = (end.getTime() - start.getTime()) / (60 * 1000);
  if (durationMinutes < 10) {
    return { valid: false, error: 'Minimum booking duration is 10 minutes.' };
  }

  if (durationMinutes > 1440) {
    return { valid: false, error: 'Single reservation duration cannot exceed 24 hours.' };
  }

  // Allow 5 minutes clock tolerance for immediate walk-in / tablet kiosk bookings
  const nowWithGrace = Date.now() - 5 * 60 * 1000;
  if (start.getTime() < nowWithGrace && !isAdmin) {
    return { valid: false, error: 'Past-time reservations are not permitted for non-administrative users.' };
  }

  return { valid: true };
}

/**
 * Detects collisions and computes sister room recommendations and earliest postponement time.
 */
export function findBookingConflicts(
  roomId: string,
  startTime: string,
  endTime: string,
  existingBookings: BookingRecord[],
  allRooms: RoomRecord[] = [],
  ignoreBookingId?: string
): StructuredConflict | null {
  const targetStart = new Date(startTime).getTime();
  const targetEnd = new Date(endTime).getTime();
  const durationMs = targetEnd - targetStart;

  // Filter approved bookings for this room
  const conflictingBookings = existingBookings.filter((b) => {
    const bId = b.id || b.bookingId;
    if (ignoreBookingId && bId === ignoreBookingId) return false;

    const bRoomId = b.roomId || b.room_id;
    if (bRoomId !== roomId) return false;

    const isApproved = b.status === 'Approved' || b.status?.toLowerCase() === 'approved';
    if (!isApproved) return false;

    return checkIntervalOverlap(startTime, endTime, b.startTime, b.endTime);
  });

  if (conflictingBookings.length === 0) {
    return null;
  }

  const blockingBooking = conflictingBookings[0];

  // 1. Calculate Sister Rooms (other available rooms matching without conflict)
  const sisterRooms = allRooms
    .filter((room) => {
      if (room.id === roomId) return false;
      const roomConflict = existingBookings.some((b) => {
        const bRoomId = b.roomId || b.room_id;
        if (bRoomId !== room.id) return false;
        const isApproved = b.status === 'Approved' || b.status?.toLowerCase() === 'approved';
        if (!isApproved) return false;
        return checkIntervalOverlap(startTime, endTime, b.startTime, b.endTime);
      });
      return !roomConflict;
    })
    .slice(0, 3)
    .map((r) => ({ id: r.id, name: r.name, capacity: r.capacity }));

  // 2. Calculate Postponement Advisor Vacancy Time
  // Find all approved bookings for this room on the same day, ordered chronologically
  const dateStr = startTime.split('T')[0];
  const sameDayBookings = existingBookings
    .filter((b) => {
      const bRoomId = b.roomId || b.room_id;
      if (bRoomId !== roomId) return false;
      const isApproved = b.status === 'Approved' || b.status?.toLowerCase() === 'approved';
      if (!isApproved) return false;
      const bStartStr = b.startTime.split('T')[0];
      return bStartStr === dateStr;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Find the earliest gap after targetStart that fits the desired duration
  let earliestOpenStart: number | null = null;

  for (let i = 0; i < sameDayBookings.length; i++) {
    const currentEnd = new Date(sameDayBookings[i].endTime).getTime();
    if (currentEnd >= targetStart) {
      const nextBooking = sameDayBookings[i + 1];
      if (!nextBooking) {
        earliestOpenStart = currentEnd;
        break;
      } else {
        const nextStart = new Date(nextBooking.startTime).getTime();
        if (nextStart - currentEnd >= durationMs) {
          earliestOpenStart = currentEnd;
          break;
        }
      }
    }
  }

  if (!earliestOpenStart) {
    const lastBooking = sameDayBookings[sameDayBookings.length - 1];
    earliestOpenStart = lastBooking ? new Date(lastBooking.endTime).getTime() : targetEnd;
  }

  const advisedTime = new Date(earliestOpenStart).toISOString();

  return {
    isActive: true,
    overlappingBooking: {
      summary: blockingBooking.summary || blockingBooking.purpose || 'Existing Approved Session',
      startTime: blockingBooking.startTime,
      endTime: blockingBooking.endTime,
      creatorName: blockingBooking.creatorName || blockingBooking.creator_name || 'Faculty / Admin',
    },
    sisterRooms,
    advisorVacancyTime: advisedTime,
  };
}
