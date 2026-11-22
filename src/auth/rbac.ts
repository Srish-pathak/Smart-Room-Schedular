/**
 * RBAC & Booking Lifecycle State Transition Rules
 */

export type UserRole = 'admin' | 'faculty' | 'student' | 'user';
export type BookingStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'CheckedIn';

export interface RBACContext {
  role: UserRole;
  userId: string;
  email: string;
}

/**
 * Validates whether a user role can perform a specific booking state transition.
 */
export function canTransitionBookingStatus(
  currentStatus: BookingStatus | string,
  nextStatus: BookingStatus | string,
  role: UserRole
): { allowed: boolean; reason?: string } {
  if (currentStatus === nextStatus) {
    return { allowed: true };
  }

  // Administrators have full approval, rejection, and override authority
  if (role === 'admin') {
    return { allowed: true };
  }

  // Non-admins cannot self-approve or reject other bookings
  if (nextStatus === 'Approved') {
    return {
      allowed: false,
      reason: 'Only administrators have authority to approve reservations.'
    };
  }

  if (nextStatus === 'Rejected') {
    return {
      allowed: false,
      reason: 'Only administrators have authority to formally reject reservations.'
    };
  }

  // Check-In is permitted when currently Approved
  if (nextStatus === 'CheckedIn') {
    if (currentStatus === 'Approved') {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Cannot check in unless reservation is already in Approved status.'
    };
  }

  // Cancellation is permitted for Pending or Approved bookings
  if (nextStatus === 'Cancelled') {
    if (currentStatus === 'Pending' || currentStatus === 'Approved') {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Cannot cancel a reservation in ${currentStatus} status.`
    };
  }

  return {
    allowed: false,
    reason: `Invalid state transition from ${currentStatus} to ${nextStatus}.`
  };
}

/**
 * Checks whether user has permission to mutate a given room or reservation.
 */
export function canMutateRoom(role: UserRole): boolean {
  return role === 'admin';
}

export function canMutateBooking(
  bookingOwnerId: string,
  bookingOwnerEmail: string,
  user: RBACContext
): boolean {
  if (user.role === 'admin') return true;
  return (
    user.userId === bookingOwnerId ||
    user.email.toLowerCase() === bookingOwnerEmail.toLowerCase()
  );
}
