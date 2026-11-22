import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkIntervalOverlap,
  validateBookingInterval,
  findBookingConflicts,
  BookingRecord,
  RoomRecord
} from '../conflictSolver';

describe('Conflict Solver Engine', () => {
  describe('checkIntervalOverlap', () => {
    it('detects partial overlap when new slot starts before and ends inside existing', () => {
      expect(
        checkIntervalOverlap(
          '2026-11-23T10:00:00.000Z',
          '2026-11-23T11:00:00.000Z',
          '2026-11-23T10:30:00.000Z',
          '2026-11-23T12:00:00.000Z'
        )
      ).toBe(true);
    });

    it('detects partial overlap when new slot starts inside and ends after existing', () => {
      expect(
        checkIntervalOverlap(
          '2026-11-23T11:30:00.000Z',
          '2026-11-23T12:30:00.000Z',
          '2026-11-23T11:00:00.000Z',
          '2026-11-23T12:00:00.000Z'
        )
      ).toBe(true);
    });

    it('detects full enclosure (new slot inside existing)', () => {
      expect(
        checkIntervalOverlap(
          '2026-11-23T10:15:00.000Z',
          '2026-11-23T10:45:00.000Z',
          '2026-11-23T10:00:00.000Z',
          '2026-11-23T11:00:00.000Z'
        )
      ).toBe(true);
    });

    it('detects full encompassing (new slot spans across existing)', () => {
      expect(
        checkIntervalOverlap(
          '2026-11-23T09:00:00.000Z',
          '2026-11-23T13:00:00.000Z',
          '2026-11-23T10:00:00.000Z',
          '2026-11-23T11:00:00.000Z'
        )
      ).toBe(true);
    });

    it('allows back-to-back adjacent slots without false positive conflict', () => {
      // Slot 1 ends exactly when Slot 2 starts
      expect(
        checkIntervalOverlap(
          '2026-11-23T10:00:00.000Z',
          '2026-11-23T11:00:00.000Z',
          '2026-11-23T11:00:00.000Z',
          '2026-11-23T12:00:00.000Z'
        )
      ).toBe(false);

      expect(
        checkIntervalOverlap(
          '2026-11-23T11:00:00.000Z',
          '2026-11-23T12:00:00.000Z',
          '2026-11-23T10:00:00.000Z',
          '2026-11-23T11:00:00.000Z'
        )
      ).toBe(false);
    });

    it('returns false for completely disjoint time slots', () => {
      expect(
        checkIntervalOverlap(
          '2026-11-23T08:00:00.000Z',
          '2026-11-23T09:00:00.000Z',
          '2026-11-23T14:00:00.000Z',
          '2026-11-23T15:00:00.000Z'
        )
      ).toBe(false);
    });
  });

  describe('validateBookingInterval', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-23T12:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('passes for a valid future interval', () => {
      const res = validateBookingInterval(
        '2026-11-23T13:00:00.000Z',
        '2026-11-23T14:00:00.000Z'
      );
      expect(res.valid).toBe(true);
    });

    it('rejects when start time is equal to or after end time', () => {
      const res1 = validateBookingInterval(
        '2026-11-23T14:00:00.000Z',
        '2026-11-23T14:00:00.000Z'
      );
      expect(res1.valid).toBe(false);
      expect(res1.error).toContain('Start time must precede end time');

      const res2 = validateBookingInterval(
        '2026-11-23T15:00:00.000Z',
        '2026-11-23T14:00:00.000Z'
      );
      expect(res2.valid).toBe(false);
    });

    it('rejects booking under minimum duration (10 minutes)', () => {
      const res = validateBookingInterval(
        '2026-11-23T13:00:00.000Z',
        '2026-11-23T13:05:00.000Z'
      );
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Minimum booking duration is 10 minutes');
    });

    it('rejects booking over maximum duration (24 hours)', () => {
      const res = validateBookingInterval(
        '2026-11-23T10:00:00.000Z',
        '2026-11-25T10:00:00.000Z'
      );
      expect(res.valid).toBe(false);
      expect(res.error).toContain('cannot exceed 24 hours');
    });

    it('rejects past-time booking for normal users', () => {
      const res = validateBookingInterval(
        '2026-11-23T09:00:00.000Z',
        '2026-11-23T10:00:00.000Z',
        false // non-admin
      );
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Past-time reservations are not permitted');
    });

    it('allows past-time booking when requested by an administrator', () => {
      const res = validateBookingInterval(
        '2026-11-23T09:00:00.000Z',
        '2026-11-23T10:00:00.000Z',
        true // admin override
      );
      expect(res.valid).toBe(true);
    });
  });

  describe('findBookingConflicts', () => {
    const mockRooms: RoomRecord[] = [
      { id: 'room-1', name: 'Boardroom Alpha', capacity: 12 },
      { id: 'room-2', name: 'Seminar Hall B', capacity: 15 },
      { id: 'room-3', name: 'Focus Studio', capacity: 4 },
    ];

    it('returns null when there are no collisions', () => {
      const existing: BookingRecord[] = [
        {
          id: 'b-1',
          roomId: 'room-1',
          startTime: '2026-11-23T09:00:00.000Z',
          endTime: '2026-11-23T10:00:00.000Z',
          status: 'Approved',
          summary: 'Morning Standup'
        }
      ];

      const result = findBookingConflicts(
        'room-1',
        '2026-11-23T10:00:00.000Z',
        '2026-11-23T11:00:00.000Z',
        existing,
        mockRooms
      );
      expect(result).toBeNull();
    });

    it('ignores Pending or Rejected bookings when checking for collisions', () => {
      const existing: BookingRecord[] = [
        {
          id: 'b-1',
          roomId: 'room-1',
          startTime: '2026-11-23T10:00:00.000Z',
          endTime: '2026-11-23T11:00:00.000Z',
          status: 'Pending',
          summary: 'Unapproved Request'
        },
        {
          id: 'b-2',
          roomId: 'room-1',
          startTime: '2026-11-23T10:00:00.000Z',
          endTime: '2026-11-23T11:00:00.000Z',
          status: 'Rejected',
          summary: 'Declined Request'
        }
      ];

      const result = findBookingConflicts(
        'room-1',
        '2026-11-23T10:00:00.000Z',
        '2026-11-23T11:00:00.000Z',
        existing,
        mockRooms
      );
      expect(result).toBeNull();
    });

    it('returns structured 409 conflict with sister rooms and postponement advice on collision', () => {
      const existing: BookingRecord[] = [
        {
          id: 'b-active',
          roomId: 'room-1',
          startTime: '2026-11-23T10:00:00.000Z',
          endTime: '2026-11-23T11:30:00.000Z',
          status: 'Approved',
          summary: 'HOD Executive Council',
          creatorName: 'Prof. Roy'
        }
      ];

      const result = findBookingConflicts(
        'room-1',
        '2026-11-23T10:30:00.000Z',
        '2026-11-23T11:30:00.000Z',
        existing,
        mockRooms
      );

      expect(result).not.toBeNull();
      expect(result?.isActive).toBe(true);
      expect(result?.overlappingBooking.summary).toBe('HOD Executive Council');
      expect(result?.overlappingBooking.creatorName).toBe('Prof. Roy');

      // Sister rooms must exclude the current colliding room
      expect(result?.sisterRooms.map(r => r.id)).toContain('room-2');
      expect(result?.sisterRooms.map(r => r.id)).toContain('room-3');
      expect(result?.sisterRooms.map(r => r.id)).not.toContain('room-1');

      // Vacancy time should be when the blocking booking ends (11:30)
      expect(result?.advisorVacancyTime).toBe('2026-11-23T11:30:00.000Z');
    });
  });
});
