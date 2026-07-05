import * as bookingRepo from '../repositories/bookingRepository.js';
import * as roomRepo from '../repositories/roomRepository.js';
import { createAuditLog } from '../repositories/auditLogRepository.js';
import { pushNotification } from '../repositories/notificationRepository.js';
import { checkOverlappingBookings } from '../utils/date.js';
import { 
  sendBookingConfirmationEmail, 
  sendBookingUpdateEmail, 
  sendBookingCancellationEmail, 
  sendCheckInEmail 
} from './emailService.js';
import { Booking } from '../models/index.js';

// Atomic Room Locking Engine to serialize booking attempts and completely eliminate race conditions
class RoomMutex {
  private queue: (() => void)[] = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise<() => void>((resolve) => {
      const release = () => {
        if (this.queue.length > 0) {
          const next = this.queue.shift();
          next?.();
        } else {
          this.locked = false;
        }
      };

      if (this.locked) {
        this.queue.push(() => resolve(release));
      } else {
        this.locked = true;
        resolve(release);
      }
    });
  }
}

const roomLocks: Record<string, RoomMutex> = {};

export function getRoomLock(roomId: string): RoomMutex {
  if (!roomLocks[roomId]) {
    roomLocks[roomId] = new RoomMutex();
  }
  return roomLocks[roomId];
}

export async function createBooking(bookingData: any, bypassConflict: boolean, user: any): Promise<any> {
  const { roomId, roomName, summary, agenda, startTime, endTime, attendeeEmail, facultyId } = bookingData;
  
  const lock = getRoomLock(roomId);
  const release = await lock.acquire();

  try {
    const bookingsList = await bookingRepo.getBookings();
    const roomsList = await roomRepo.getRooms();

    // Conflict Check overlapping slots
    const conflictingBookings = checkOverlappingBookings(roomId, startTime, endTime, bookingsList, undefined, roomsList);

    if (conflictingBookings.length > 0 && !bypassConflict) {
      const conflict = conflictingBookings[0];
      
      // Calculate alternative sister rooms
      const sisterRooms = roomsList.filter((room: any) => {
        if (room.id === roomId) return false;
        const hasConflict = checkOverlappingBookings(room.id, startTime, endTime, bookingsList, undefined, roomsList).length > 0;
        return !hasConflict;
      });

      // Postponement Advisor
      const roomBookingsSameDay = bookingsList
        .filter((b: any) => b.room_id === roomId && b.start_time >= startTime.split('T')[0])
        .sort((a: any, b: any) => a.end_time.localeCompare(b.end_time));
      
      let advisedTime = endTime;
      if (roomBookingsSameDay.length > 0) {
        advisedTime = roomBookingsSameDay[roomBookingsSameDay.length - 1].end_time;
      }

      return {
        conflictDetected: true,
        conflict: {
          isActive: true,
          overlappingBooking: {
            summary: conflict.summary,
            startTime: conflict.start_time,
            endTime: conflict.end_time,
            creatorName: conflict.creator_name,
          },
          sisterRooms: sisterRooms.slice(0, 3).map((r: any) => ({ id: r.id, name: r.name, capacity: r.capacity })),
          advisorVacancyTime: advisedTime
        }
      };
    }

    // Create the booking
    const newBooking: Booking = {
      id: 'book-' + Math.random().toString(36).substring(2, 9),
      room_id: roomId,
      room_name: roomName,
      summary,
      agenda: agenda || '',
      start_time: startTime,
      end_time: endTime,
      creator_name: user.name,
      creator_email: user.email,
      faculty_id: facultyId || '',
      attendee_email: attendeeEmail || '',
      created_at: new Date().toISOString(),
      google_event_id: bookingData.google_event_id || null,
      google_calendar_link: bookingData.google_calendar_link || null,
      google_sync_status: bookingData.google_sync_status || 'not_connected',
      google_sync_error: bookingData.google_sync_error || null
    };

    const saved = await bookingRepo.addBooking(newBooking);
    await createAuditLog(user.id, user.email, 'Create Booking', 'success', `Successfully reserved ${roomName} for: "${summary}"`);
    await sendBookingConfirmationEmail(newBooking).catch(err => console.error('Booking confirmation email failed:', err));

    await pushNotification(
      'Booking Approved ✓',
      `${user.name} established a reservation for "${roomName}" (${summary}).`,
      'success'
    );

    return { conflictDetected: false, booking: saved };
  } finally {
    release();
  }
}

export async function updateBooking(id: string, bookingData: any, bypassConflict: boolean, user: any): Promise<any> {
  const { roomId, roomName, summary, agenda, startTime, endTime, attendeeEmail, facultyId } = bookingData;

  const lock = getRoomLock(roomId);
  const release = await lock.acquire();

  try {
    const bookingsList = await bookingRepo.getBookings();
    const target = bookingsList.find((b: any) => b.id === id);

    if (!target) {
      return { notFound: true };
    }

    // Role Enforcement: Platform Admin can modify any booking. User can only modify their own.
    if (
      user.role !== 'admin' &&
      target.creator_email.toLowerCase() !== user.email.toLowerCase()
    ) {
      return { unauthorized: true };
    }

    // Overlap check
    const roomsList = await roomRepo.getRooms();
    const otherBookings = bookingsList.filter((b: any) => b.id !== id);
    const conflictingBookings = checkOverlappingBookings(roomId, startTime, endTime, otherBookings, id, roomsList);

    if (conflictingBookings.length > 0 && !bypassConflict) {
      const conflict = conflictingBookings[0];
      
      const sisterRooms = roomsList.filter((room: any) => {
        if (room.id === roomId) return false;
        const hasConflict = checkOverlappingBookings(room.id, startTime, endTime, bookingsList, undefined, roomsList).length > 0;
        return !hasConflict;
      });

      const roomBookingsSameDay = bookingsList
        .filter((b: any) => b.room_id === roomId && b.id !== id && b.start_time >= startTime.split('T')[0])
        .sort((a: any, b: any) => a.end_time.localeCompare(b.end_time));
      
      let advisedTime = endTime;
      if (roomBookingsSameDay.length > 0) {
        advisedTime = roomBookingsSameDay[roomBookingsSameDay.length - 1].end_time;
      }

      return {
        conflictDetected: true,
        conflict: {
          isActive: true,
          overlappingBooking: {
            summary: conflict.summary,
            startTime: conflict.start_time,
            endTime: conflict.end_time,
            creatorName: conflict.creator_name,
          },
          sisterRooms: sisterRooms.slice(0, 3).map((r: any) => ({ id: r.id, name: r.name, capacity: r.capacity })),
          advisorVacancyTime: advisedTime
        }
      };
    }

    const updatedData = {
      ...target,
      room_id: roomId,
      room_name: roomName,
      summary,
      agenda: agenda || '',
      start_time: startTime,
      end_time: endTime,
      faculty_id: facultyId || '',
      attendee_email: attendeeEmail || '',
      google_event_id: bookingData.google_event_id !== undefined ? bookingData.google_event_id : target.google_event_id,
      google_calendar_link: bookingData.google_calendar_link !== undefined ? bookingData.google_calendar_link : target.google_calendar_link,
      google_sync_status: bookingData.google_sync_status !== undefined ? bookingData.google_sync_status : target.google_sync_status,
      google_sync_error: bookingData.google_sync_error !== undefined ? bookingData.google_sync_error : target.google_sync_error
    };

    const saved = await bookingRepo.updateBooking(id, updatedData);
    await createAuditLog(user.id, user.email, 'Edit Booking', 'success', `Updated booking ID ${id} for ${roomName} ("${summary}")`);
    await sendBookingUpdateEmail(saved).catch(err => console.error('Booking update email failed:', err));

    await pushNotification(
      'Booking Modified ✓',
      `${user.name} updated the reservation for "${roomName}" (${summary}).`,
      'info'
    );

    return { conflictDetected: false, booking: saved };
  } finally {
    release();
  }
}

export async function deleteBooking(id: string, user: any): Promise<any> {
  const bookings = await bookingRepo.getBookings();
  const target = bookings.find((b: any) => b.id === id);

  if (!target) {
    return { notFound: true };
  }

  // Role Enforcement: Platform Admin can cancel any booking. User can only cancel their own.
  if (
    user.role !== 'admin' &&
    target.creator_email.toLowerCase() !== user.email.toLowerCase()
  ) {
    return { unauthorized: true };
  }

  const success = await bookingRepo.deleteBookingById(id);
  if (success) {
    await createAuditLog(user.id, user.email, 'Cancel Booking', 'success', `Cancelled booking ID ${id} for ${target.room_name} ("${target.summary}")`);
    await sendBookingCancellationEmail(target).catch(err => console.error('Booking cancellation email failed:', err));

    await pushNotification(
      'Booking Cancelled ✕',
      `The reservation on "${target.room_name}" ("${target.summary}") was cancelled by ${user.name}.`,
      'warn'
    );
    return { success: true };
  }
  
  return { success: false };
}

export async function qrCheckIn(id: string, user: any): Promise<any> {
  const bookings = await bookingRepo.getBookings();
  const booking = bookings.find((b: any) => b.id === id);
  if (!booking) {
    await createAuditLog(user.id, user.email, 'QR Check-in', 'failed', `Booking ${id} not found`);
    return { notFound: true };
  }

  if (user.role !== 'admin' && booking.creator_email.toLowerCase() !== user.email.toLowerCase()) {
    await createAuditLog(user.id, user.email, 'QR Check-in', 'failed', `Unauthorized check-in attempt for booking ${id}`);
    return { unauthorized: true };
  }

  const now = new Date();
  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);

  // Allow check-in starting 30 minutes before booking start up to booking end
  const allowedCheckInStart = new Date(start.getTime() - 30 * 60 * 1000);
  if (now < allowedCheckInStart) {
    await createAuditLog(user.id, user.email, 'QR Check-in', 'failed', `Too early to check-in for booking ${booking.id} (Starts at ${booking.start_time})`);
    return { badRequest: true, message: 'Too early. Check-in starts 30 minutes before scheduled start.' };
  }
  if (now > end) {
    await createAuditLog(user.id, user.email, 'QR Check-in', 'failed', `Booking ${booking.id} has already ended`);
    return { badRequest: true, message: 'This booking session has already ended.' };
  }

  booking.status = 'checked_in';
  booking.checked_in_at = now.toISOString();

  await bookingRepo.updateBooking(id, booking);

  // Update room status to booked
  const targetRoom = await roomRepo.updateRoom(booking.room_id, { status: 'booked' });

  await createAuditLog(user.id, user.email, 'QR Check-in', 'success', `Checked in for ${booking.room_name} (${booking.summary})`);

  await pushNotification(
    'QR Check-In Success ⚡',
    `${user.name} checked into "${booking.room_name}" via academic QR sensor plaque.`,
    'success'
  );

  await sendCheckInEmail(booking);

  return { success: true, booking };
}
