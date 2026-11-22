import { describe, it, expect } from 'vitest';
import {
  canTransitionBookingStatus,
  canMutateRoom,
  canMutateBooking,
  RBACContext
} from '../rbac';

describe('RBAC & Booking State Transitions', () => {
  describe('canTransitionBookingStatus', () => {
    it('allows administrators to approve any pending reservation', () => {
      const res = canTransitionBookingStatus('Pending', 'Approved', 'admin');
      expect(res.allowed).toBe(true);
    });

    it('allows administrators to reject any pending reservation', () => {
      const res = canTransitionBookingStatus('Pending', 'Rejected', 'admin');
      expect(res.allowed).toBe(true);
    });

    it('denies students or faculty from self-approving reservations', () => {
      const studentRes = canTransitionBookingStatus('Pending', 'Approved', 'student');
      expect(studentRes.allowed).toBe(false);
      expect(studentRes.reason).toContain('Only administrators have authority to approve');

      const facultyRes = canTransitionBookingStatus('Pending', 'Approved', 'faculty');
      expect(facultyRes.allowed).toBe(false);
    });

    it('allows students or faculty to cancel their pending reservation', () => {
      const res = canTransitionBookingStatus('Pending', 'Cancelled', 'student');
      expect(res.allowed).toBe(true);
    });

    it('allows check-in only when reservation is already Approved', () => {
      expect(canTransitionBookingStatus('Approved', 'CheckedIn', 'student').allowed).toBe(true);
      expect(canTransitionBookingStatus('Pending', 'CheckedIn', 'student').allowed).toBe(false);
      expect(canTransitionBookingStatus('Rejected', 'CheckedIn', 'student').allowed).toBe(false);
    });

    it('returns true when current status is identical to next status', () => {
      expect(canTransitionBookingStatus('Approved', 'Approved', 'student').allowed).toBe(true);
      expect(canTransitionBookingStatus('Pending', 'Pending', 'student').allowed).toBe(true);
    });
  });

  describe('canMutateRoom', () => {
    it('grants room mutations only to administrators', () => {
      expect(canMutateRoom('admin')).toBe(true);
      expect(canMutateRoom('faculty')).toBe(false);
      expect(canMutateRoom('student')).toBe(false);
      expect(canMutateRoom('user')).toBe(false);
    });
  });

  describe('canMutateBooking', () => {
    const adminUser: RBACContext = {
      role: 'admin',
      userId: 'usr-admin',
      email: 'admin@iitbhu.ac.in',
    };

    const studentOwner: RBACContext = {
      role: 'student',
      userId: 'usr-student-1',
      email: 'student1@iitbhu.ac.in',
    };

    const studentOther: RBACContext = {
      role: 'student',
      userId: 'usr-student-2',
      email: 'student2@iitbhu.ac.in',
    };

    it('allows admin to mutate any booking', () => {
      expect(canMutateBooking('usr-student-1', 'student1@iitbhu.ac.in', adminUser)).toBe(true);
    });

    it('allows booking owner to mutate their own booking', () => {
      expect(canMutateBooking('usr-student-1', 'student1@iitbhu.ac.in', studentOwner)).toBe(true);
    });

    it('denies third-party users from mutating someone elses booking', () => {
      expect(canMutateBooking('usr-student-1', 'student1@iitbhu.ac.in', studentOther)).toBe(false);
    });
  });
});
