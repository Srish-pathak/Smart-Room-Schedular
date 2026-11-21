import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateRoomStatus } from '../roomStatus';
import { Room, Booking } from '../../types';

describe('calculateRoomStatus utility', () => {
  const mockRoom: Room = {
    id: 'room-101',
    name: 'Boardroom Alpha',
    capacity: 12,
    status: 'available',
    features: ['Whiteboard', 'Videoconference'],
    image: 'https://images.unsplash.com/photo-test',
    color: '#6366f1',
  };

  beforeEach(() => {
    // Fix current time to 2026-11-21 14:00:00 local time
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-21T14:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks room as available when there are no bookings for today', () => {
    const result = calculateRoomStatus(mockRoom, []);
    expect(result.status).toBe('available');
    expect(result.badgeText).toContain('Available');
    expect(result.currentBooking).toBeNull();
    expect(result.nextBooking).toBeNull();
  });

  it('marks room as occupied when there is an ongoing approved booking', () => {
    const ongoingBooking: Booking = {
      id: 'book-1',
      room_id: 'room-101',
      roomName: 'Boardroom Alpha',
      summary: 'Executive Quarterly Strategy',
      startTime: '2026-11-21T13:30:00',
      endTime: '2026-11-21T15:00:00',
      creatorName: 'Prof. Sharma',
      creatorEmail: 'sharma@iitbhu.ac.in',
      status: 'Approved',
    };

    const result = calculateRoomStatus(mockRoom, [ongoingBooking]);
    expect(result.status).toBe('occupied');
    expect(result.badgeText).toContain('Occupied');
    expect(result.currentBooking).toEqual(ongoingBooking);
  });

  it('marks room as reserved_soon when next booking begins within 45 minutes', () => {
    const upcomingBooking: Booking = {
      id: 'book-2',
      room_id: 'room-101',
      roomName: 'Boardroom Alpha',
      summary: 'Admissions Panel Interview',
      startTime: '2026-11-21T14:30:00', // 30 minutes from now (14:00)
      endTime: '2026-11-21T15:30:00',
      creatorName: 'Dean Office',
      creatorEmail: 'dean@iitbhu.ac.in',
      status: 'Approved',
    };

    const result = calculateRoomStatus(mockRoom, [upcomingBooking]);
    expect(result.status).toBe('reserved_soon');
    expect(result.badgeText).toContain('Reserved Soon');
    expect(result.nextBooking).toEqual(upcomingBooking);
  });

  it('marks room as available when next booking is more than 45 minutes away', () => {
    const laterBooking: Booking = {
      id: 'book-3',
      room_id: 'room-101',
      roomName: 'Boardroom Alpha',
      summary: 'Evening Seminar',
      startTime: '2026-11-21T17:00:00', // 3 hours away
      endTime: '2026-11-21T18:30:00',
      creatorName: 'Dept of CSE',
      creatorEmail: 'cse@iitbhu.ac.in',
      status: 'Approved',
    };

    const result = calculateRoomStatus(mockRoom, [laterBooking]);
    expect(result.status).toBe('available');
    expect(result.nextBooking).toEqual(laterBooking);
  });

  it('ignores unapproved or pending bookings when computing room occupancy', () => {
    const pendingBooking: Booking = {
      id: 'book-4',
      room_id: 'room-101',
      roomName: 'Boardroom Alpha',
      summary: 'Unapproved Request',
      startTime: '2026-11-21T13:30:00',
      endTime: '2026-11-21T15:00:00',
      creatorName: 'Student Club',
      creatorEmail: 'club@iitbhu.ac.in',
      status: 'Pending',
    };

    const result = calculateRoomStatus(mockRoom, [pendingBooking]);
    expect(result.status).toBe('available');
    expect(result.currentBooking).toBeNull();
  });
});
