import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { GoogleCalendarService } from './GoogleCalendarService';
import { GoogleAuthService } from './GoogleAuthService';

// In-flight concurrency lock to prevent duplicate sync executions
const inFlightSyncs = new Set<string>();

export const BookingSyncService = {
  /**
   * Automatically synchronizes a booking operation with Google Calendar in the background.
   */
  async syncBooking(
    bookingId: string,
    action: 'create' | 'update' | 'delete' | 'approve' | 'reject',
    existingBooking?: any
  ): Promise<void> {
    const syncKey = `${bookingId}_${action}`;
    if (inFlightSyncs.has(syncKey)) {
      console.info(`[BookingSyncService] Concurrent sync already in progress for ${syncKey}. Debouncing.`);
      return;
    }
    inFlightSyncs.add(syncKey);

    console.info(`[BookingSyncService] Sync triggered: ${action} for Booking ID: ${bookingId}`);

    try {
      // 1. If action is delete or reject, remove event from Google Calendar if it exists
      if (action === 'delete' || action === 'reject') {
        const bookingData = existingBooking || await this.fetchBooking(bookingId);
        if (!bookingData) return;

        const eventId = bookingData.google_event_id || bookingData.calendarEventId;
        if (eventId) {
          try {
            await GoogleCalendarService.deleteEvent(eventId);
            console.info(`[BookingSyncService] Successfully deleted Google Event: ${eventId}`);
          } catch (err: any) {
            console.warn('[BookingSyncService] Non-fatal error deleting event on Google Calendar:', err);
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

      // Only Approved bookings are synced to Google Calendar
      if (booking.status !== 'Approved') {
        console.info(`[BookingSyncService] Booking is in ${booking.status} status. Skipping Google Calendar sync.`);
        return;
      }

      // 3. Mark status as 'syncing'
      await this.updateSyncStatus(bookingId, 'syncing', null, null, null);

      // 4. Verify Google Calendar connection
      const isConnected = await GoogleAuthService.isConnected();
      if (!isConnected) {
        console.info('[BookingSyncService] Google account not connected. Marking as not_synced.');
        await this.updateSyncStatus(bookingId, 'not_synced', null, null, 'Google Workspace account not connected. Connect in Profile settings to enable automatic Calendar sync.');
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
          console.warn('[BookingSyncService] Could not retrieve building info:', roomErr);
        }
      }

      // 6. Map booking to calendar event payload
      const payload = {
        summary: booking.summary || booking.purpose || 'Smart Room Reservation',
        roomName: booking.roomName || booking.room_name || 'Campus Room',
        building,
        startTime: booking.startTime || booking.start_time,
        endTime: booking.endTime || booking.end_time,
        agenda: booking.agenda || '',
        creatorName: booking.creatorName || booking.creator_name || 'IIT BHU Member',
        creatorEmail: booking.creatorEmail || booking.creator_email || '',
        attendeeEmail: booking.attendeeEmail || booking.attendee_email || undefined,
        facultyId: booking.facultyId || booking.faculty_id || undefined,
      };

      const existingEventId = booking.google_event_id || booking.calendarEventId;
      let eventResult: any = null;
      let lastError: any = null;
      const maxRetries = 2;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (existingEventId) {
            // Update existing event
            try {
              eventResult = await GoogleCalendarService.updateEvent(existingEventId, payload);
              console.info(`[BookingSyncService] Updated existing Google Calendar event: ${existingEventId}`);
            } catch (updateErr: any) {
              if (updateErr.message && updateErr.message.includes('404')) {
                console.info('[BookingSyncService] Event missing on Calendar. Recreating new event...');
                eventResult = await GoogleCalendarService.createEvent(payload);
              } else {
                throw updateErr;
              }
            }
          } else {
            // Create brand new event
            eventResult = await GoogleCalendarService.createEvent(payload);
            console.info(`[BookingSyncService] Created new Google Calendar event: ${eventResult?.id}`);
          }
          break;
        } catch (apiErr: any) {
          lastError = apiErr;
          console.warn(`[BookingSyncService] Calendar sync attempt ${attempt} failed:`, apiErr);
          if (attempt < maxRetries) {
            await new Promise((res) => setTimeout(res, 1000));
          }
        }
      }

      if (!eventResult && lastError) {
        throw lastError;
      }

      // 7. Save synced IDs & Meet link back to Firestore
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
        console.info(`[BookingSyncService] Booking synchronized successfully: ${bookingId}`);
      } else {
        throw new Error('Google Calendar API returned no Event ID.');
      }
    } catch (error: any) {
      console.error('[BookingSyncService] Synchronization error:', error);
      await this.updateSyncStatus(
        bookingId,
        'failed',
        null,
        null,
        error.message || 'Unknown calendar synchronization error'
      );
    } finally {
      inFlightSyncs.delete(syncKey);
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
    eventId?: string | null,
    calendarLink?: string | null,
    error?: string | null,
    meetLink?: string | null
  ) {
    try {
      const updates: any = {
        google_sync_status: status,
        google_sync_error: error || null,
        updatedAt: new Date().toISOString(),
      };
      if (eventId !== undefined) updates.google_event_id = eventId;
      if (calendarLink !== undefined) updates.google_calendar_link = calendarLink;
      if (meetLink !== undefined) updates.google_meet_link = meetLink;

      await updateDoc(doc(db, 'bookings', bookingId), updates);
    } catch (err) {
      console.warn(`[BookingSyncService] Failed to record sync status in Firestore for ${bookingId}:`, err);
    }
  },
};
