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
