import { logger } from '../utils/logger.js';

export interface CalendarEventPayload {
  summary: string;
  description: string;
  startTime: string;
  endTime: string;
  attendees: string[];
}

export class CalendarService {
  /**
   * Helper to format a booking into a standard Google Calendar event object
   */
  static formatEvent(booking: any): CalendarEventPayload {
    return {
      summary: booking.summary,
      description: booking.agenda || '',
      startTime: booking.start_time,
      endTime: booking.end_time,
      attendees: booking.attendee_email ? [booking.attendee_email] : []
    };
  }

  /**
   * Stub/proxy method if server-side calendar API synchronization is expanded.
   */
  static async syncEvent(bookingId: string, event: CalendarEventPayload): Promise<{ eventId: string; link: string } | null> {
    logger.info(`Syncing booking ${bookingId} to Google Calendar...`);
    // Return null since sync logic is handled client-side or on-demand
    return null;
  }
}
