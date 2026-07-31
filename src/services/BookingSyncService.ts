import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { GoogleCalendarService } from './GoogleCalendarService';
import { GoogleAuthService } from './GoogleAuthService';

export const BookingSyncService = {
  /**
   * Automatically synchronizes a booking operation with Google Calendar in the background.
   */
  async syncBooking(
    bookingId: string,
    action: 'create' | 'update' | 'delete' | 'approve' | 'reject',
    existingBooking?: any
  ): Promise<void> {
    console.info(`[BookingSyncService] Sync triggered: ${action} for Booking ID: ${bookingId}`);

    try {
      // 1. If action is delete or reject, we delete the event if it exists
      if (action === 'delete' || action === 'reject') {
        const bookingData = existingBooking || await this.fetchBooking(bookingId);
        if (!bookingData) return;

        const eventId = bookingData.google_event_id || bookingData.calendarEventId;
        if (eventId) {
          try {
            await GoogleCalendarService.deleteEvent(eventId);
            console.info(`[BookingSyncService] Successfully deleted Google Event: ${eventId}`);
          } catch (err: any) {
            console.error('[BookingSyncService] Failed to delete event on Google Calendar:', err);
          }
        }
        return;
      }

      // 2. Fetch/resolve booking data
      const booking = existingBooking || await this.fetchBooking(bookingId);
      if (!booking) {
        console.warn(`[BookingSyncService] Booking not found for sync: ${bookingId}`);
        return;
      }

      // We only sync Approved bookings to Google Calendar
      if (booking.status !== 'Approved') {
        console.info(`[BookingSyncService] Booking is in ${booking.status} status. Skipping Google Calendar sync.`);
        return;
      }

      // 3. Update status to 'syncing' in Firestore
      await this.updateSyncStatus(bookingId, 'syncing', null, null, null);

      // 4. Check if Google Calendar is authorized
      const isConnected = await GoogleAuthService.isConnected();
      if (!isConnected) {
        console.info('[BookingSyncService] Google account not connected. Marking as not connected.');
        await this.updateSyncStatus(bookingId, 'not_synced', null, null, 'Google Account not connected');
        return;
      }

      // 5. Fetch building info from Room
      let building = '';
      const roomId = booking.roomId || booking.room_id;
      if (roomId) {
        try {
          const roomDoc = await getDoc(doc(db, 'rooms', roomId));
          if (roomDoc.exists()) {
            building = roomDoc.data()?.building || '';
          }
        } catch (roomErr) {
          console.warn('[BookingSyncService] Failed to fetch room building info:', roomErr);
        }
      }

      // 6. Map booking to calendar payload
      const payload = {
        summary: booking.summary || booking.purpose || 'Smart Room Booking',
        roomName: booking.roomName || booking.room_name || 'Smart Room',
        building,
        startTime: booking.startTime || booking.start_time,
        endTime: booking.endTime || booking.end_time,
        agenda: booking.agenda || '',
        creatorName: booking.creatorName || booking.creator_name || 'Smart Rooms User',
        creatorEmail: booking.creatorEmail || booking.creator_email || '',
        attendeeEmail: booking.attendeeEmail || booking.attendee_email || undefined,
        facultyId: booking.facultyId || booking.faculty_id || undefined,
      };

      const existingEventId = booking.google_event_id || booking.calendarEventId;

      let eventResult;
      let lastError: any = null;
      const maxRetries = 2;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (existingEventId) {
            // Update Event
            try {
              eventResult = await GoogleCalendarService.updateEvent(existingEventId, payload);
              console.info(`[BookingSyncService] Updated existing calendar event on attempt ${attempt}: ${existingEventId}`);
            } catch (updateErr: any) {
              if (updateErr.message?.includes('404') || updateErr.message?.includes('Not Found')) {
                console.warn('[BookingSyncService] Google Event not found on server. Creating new one instead.');
                eventResult = await GoogleCalendarService.createEvent(payload);
              } else {
                throw updateErr;
              }
            }
          } else {
            // Create Event
            eventResult = await GoogleCalendarService.createEvent(payload);
            console.info(`[BookingSyncService] Created new calendar event on attempt ${attempt}.`);
          }

          // If succeeded, break out of loop
          if (eventResult && eventResult.id) {
            lastError = null;
            break;
          }
        } catch (attemptErr: any) {
          lastError = attemptErr;
          console.warn(`[BookingSyncService] Attempt ${attempt} failed: ${attemptErr.message}. Retrying...`);
          if (attempt < maxRetries) {
            await new Promise((res) => setTimeout(res, 1000 * attempt));
          }
        }
      }

      if (lastError) {
        throw lastError;
      }

      // 7. Save Event details back to Firestore
      if (eventResult && eventResult.id) {
        const calLink = eventResult.htmlLink || null;
        const meetLink = eventResult.hangoutLink || null;

        await this.updateSyncStatus(
          bookingId,
          'synced',
          eventResult.id,
          calLink,
          null,
          meetLink
        );
        console.info(`[BookingSyncService] Booking synced successfully: ${bookingId}`);
      } else {
        throw new Error('No Event ID returned from Google Calendar API');
      }

    } catch (error: any) {
      console.error(`[BookingSyncService] Synchronization error:`, error);
      await this.updateSyncStatus(
        bookingId,
        'failed',
        null,
        null,
        error.message || 'Unknown calendar sync error'
      );
    }
  },

  /**
   * Helper to retrieve full booking document.
   */
  async fetchBooking(bookingId: string): Promise<any> {
    try {
      const docSnap = await getDoc(doc(db, 'bookings', bookingId));
      return docSnap.exists() ? docSnap.data() : null;
    } catch (err) {
      console.error('[BookingSyncService] Failed to fetch booking:', err);
      return null;
    }
  },

  /**
   * Helper to update synchronization status fields in Firestore.
   */
  async updateSyncStatus(
    bookingId: string,
    status: 'synced' | 'failed' | 'syncing' | 'not_synced',
    eventId: string | null,
    calendarLink: string | null,
    errorMsg: string | null,
    meetLink: string | null = null
  ): Promise<void> {
    try {
      const docRef = doc(db, 'bookings', bookingId);
      const updates: any = {
        google_sync_status: status,
        google_sync_error: errorMsg,
      };

      if (eventId) {
        updates.google_event_id = eventId;
        updates.calendarEventId = eventId; // Store as requested
      }
      if (calendarLink) {
        updates.google_calendar_link = calendarLink;
      }
      if (meetLink) {
        updates.google_meet_link = meetLink;
      }

      await updateDoc(docRef, updates);
    } catch (err) {
      console.error('[BookingSyncService] Failed to write sync status to Firestore:', err);
    }
  }
};
