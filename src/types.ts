export interface Room {
  id: string;
  name: string;
  roomName?: string;
  roomNumber?: string;
  capacity: number;
  status: 'available' | 'booked' | 'expiring_soon';
  features: string[];
  facilities?: string[];
  image: string;
  color: string;
  building?: string;
  category?: 'Seminar Hall' | 'Conference Room' | 'Classroom' | 'Lab' | 'Meeting Room' | 'Auditorium' | string;
  roomType?: 'Seminar Hall' | 'Conference Room' | 'Classroom' | 'Lab' | 'Meeting Room' | 'Auditorium' | string;
  floor?: string;
  bestFor?: string;
  contactDepartment?: string;
  department?: string;
  buffer_time?: number;
  rating?: number;
  favorite_count?: number;
  isVerified?: boolean;
  verificationSource?: string;
  missingInfo?: string[];
}

export interface Booking {
  id: string;
  roomName: string;
  summary: string;
  startTime: string;
  endTime: string;
  creatorName: string;
  creatorEmail: string;
  facultyId?: string;
  attendeeEmail?: string;
  eventId?: string;
  agenda?: string;
  google_event_id?: string | null;
  google_calendar_link?: string | null;
  google_meet_link?: string | null;
  google_sync_status?: string;
  google_sync_error?: string | null;
  room_id?: string;
  room_name?: string;
  start_time?: string;
  end_time?: string;
  creator_name?: string;
  creator_email?: string;
  faculty_id?: string;
  attendee_email?: string;
  status?: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string;
  rejection_reason?: string;
  userId?: string;
  user_id?: string;
  date?: string;
  purpose?: string;
  roomId?: string;
  checkedIn?: boolean;
  checkInTime?: string;
  attendees?: string[];
  isRecurring?: boolean;
  recurrenceRule?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'approval' | 'rejection' | 'confirmation' | 'reminder' | 'sync' | 'system';
  bookingId?: string;
  emailSent?: boolean;
}

export interface WaitlistEntry {
  id: string;
  roomId: string;
  roomName: string;
  userName: string;
  userEmail: string;
  desiredStartTime: string;
  desiredEndTime: string;
  status: 'waiting' | 'notified' | 'cancelled';
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'faculty' | 'student' | 'staff' | 'user';
  department?: string;
  avatarUrl?: string;
  favoriteRooms?: string[];
}

export interface DepartmentStat {
  department: string;
  totalBookings: number;
  totalHours: number;
  occupancyRate: number;
}

