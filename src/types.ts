export interface Room {
  id: string;
  name: string;
  capacity: number;
  status: 'available' | 'booked' | 'expiring_soon';
  features: string[];
  image: string;
  color: string;
  building?: string;
  category?: string;
  floor?: string;
  bestFor?: string;
  contactDepartment?: string;
  buffer_time?: number;
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
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

export interface ChatSpace {
  name: string;
  displayName: string;
  type: string;
}

export interface FormMetadata {
  formId: string;
  title: string;
  description?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}
