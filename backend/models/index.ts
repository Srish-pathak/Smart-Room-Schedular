export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  features: string[];
  image: string;
  color: string;
  building?: string;
  category?: string;
  floor?: string;
  bestFor?: string;
  contactDepartment?: string;
  buffer_time?: number;
  status?: 'available' | 'booked' | 'expiring_soon';
}

export interface Booking {
  id: string;
  room_id: string;
  room_name: string;
  summary: string;
  agenda?: string;
  start_time: string;
  end_time: string;
  creator_name: string;
  creator_email: string;
  faculty_id?: string;
  attendee_email?: string;
  created_at: string;
  status?: 'pending' | 'checked_in' | 'expired';
  checked_in_at?: string;
  reminder_sent?: boolean;
  google_event_id?: string | null;
  google_calendar_link?: string | null;
  google_sync_status?: string;
  google_sync_error?: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string;
  email: string;
  action: string;
  status: 'success' | 'failed';
  details: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warn';
  read: boolean;
  created_at: string;
}
