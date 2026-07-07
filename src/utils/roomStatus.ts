import { Room, Booking } from '../types';

export type RoomAvailabilityStatus = 'available' | 'reserved_soon' | 'occupied';

export interface RoomStatusInfo {
  status: RoomAvailabilityStatus;
  badgeColor: string;
  badgeText: string;
  nextMessage: string;
  currentBooking: Booking | null;
  nextBooking: Booking | null;
}

export function calculateRoomStatus(room: Room, bookings: Booking[]): RoomStatusInfo {
  const now = new Date();
  
  // Format local date part to match "YYYY-MM-DD"
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  // Filter approved bookings for this room on the current date
  const roomBookingsToday = bookings.filter((b) => {
    const isThisRoom = b.room_id === room.id || 
                       b.roomName?.toLowerCase() === room.name?.toLowerCase() || 
                       b.room_name?.toLowerCase() === room.name?.toLowerCase();
    const isApproved = b.status === 'Approved' || b.status?.toLowerCase() === 'approved';
    const startStr = b.startTime || b.start_time || '';
    const isToday = startStr.startsWith(todayStr);
    return isThisRoom && isApproved && isToday;
  });

  // Sort bookings chronologically by start time
  roomBookingsToday.sort((a, b) => {
    const aStart = a.startTime || a.start_time || '';
    const bStart = b.startTime || b.start_time || '';
    return aStart.localeCompare(bStart);
  });

  let currentBooking: Booking | null = null;
  let nextBooking: Booking | null = null;

  for (const b of roomBookingsToday) {
    const startStr = b.startTime || b.start_time || '';
    const endStr = b.endTime || b.end_time || '';
    const start = new Date(startStr);
    const end = new Date(endStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

    if (now >= start && now <= end) {
      currentBooking = b;
    } else if (now < start) {
      if (!nextBooking) {
        nextBooking = b;
      }
    }
  }

  // Format time beautifully in 12-hour format (e.g. "11:30 AM")
  const formatTimeStr = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return isoStr;
    }
  };

  if (currentBooking) {
    const endTimeStr = currentBooking.endTime || currentBooking.end_time || '';
    return {
      status: 'occupied',
      badgeColor: 'bg-rose-550/15 text-rose-400 border border-rose-500/30',
      badgeText: '🔴 Occupied',
      nextMessage: `Occupied until ${formatTimeStr(endTimeStr)}`,
      currentBooking,
      nextBooking,
    };
  }

  if (nextBooking) {
    const nextStartStr = nextBooking.startTime || nextBooking.start_time || '';
    const nextStart = new Date(nextStartStr);
    const diffMins = Math.round((nextStart.getTime() - now.getTime()) / (60 * 1000));

    // If next booking starts within 45 minutes, mark as "Reserved Soon"
    if (diffMins <= 45) {
      return {
        status: 'reserved_soon',
        badgeColor: 'bg-amber-550/15 text-amber-400 border border-amber-500/30',
        badgeText: '🟡 Reserved Soon',
        nextMessage: `Reserved starting at ${formatTimeStr(nextStartStr)}`,
        currentBooking: null,
        nextBooking,
      };
    }

    return {
      status: 'available',
      badgeColor: 'bg-emerald-550/15 text-emerald-400 border border-emerald-500/30',
      badgeText: '🟢 Available',
      nextMessage: `Available until ${formatTimeStr(nextStartStr)}`,
      currentBooking: null,
      nextBooking,
    };
  }

  return {
    status: 'available',
    badgeColor: 'bg-emerald-550/15 text-emerald-400 border border-emerald-500/30',
    badgeText: '🟢 Available',
    nextMessage: 'Available all day',
    currentBooking: null,
    nextBooking: null,
  };
}
