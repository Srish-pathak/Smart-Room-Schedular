import { GoogleAuthService } from './GoogleAuthService';

export interface CalendarEventPayload {
  summary: string;
  roomName: string;
  building?: string;
  startTime: string;
  endTime: string;
  agenda?: string;
  creatorName: string;
  creatorEmail: string;
  attendeeEmail?: string;
  facultyId?: string;
}

export const GoogleCalendarService = {
  /**
   * Helper to perform authenticated Google API calls.
   */
  async fetchCalendarAPI(url: string, options: RequestInit = {}) {
    const token = await GoogleAuthService.getAccessToken();
    
    // Mock backup to ensure seamless applet preview functionality without real account
    if (!token || token === 'mock_google_workspace_token') {
      console.info('[GoogleCalendarService] Using mock calendar fallback.');
      if (options.method === 'POST') {
        const uniqueId = 'mock-cal-ev-' + Math.random().toString(36).substring(2, 9);
        return {
          id: uniqueId,
          htmlLink: 'https://calendar.google.com',
          hangoutLink: 'https://meet.google.com/mock-meet-link'
        };
      }
      if (options.method === 'PUT') {
        return {
          id: url.split('/').pop()?.split('?')[0] || 'mock-id',
          htmlLink: 'https://calendar.google.com',
          hangoutLink: 'https://meet.google.com/mock-meet-link'
        };
      }
      if (options.method === 'DELETE') {
        return null;
      }
      return {};
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    let response: Response | null = null;
    let lastError: any = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(url, { ...options, headers });
        if (response.ok || response.status === 204) {
          break;
        }

        // Retry on rate limit (429) or server errors (5xx)
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
          await new Promise(res => setTimeout(res, 500 * Math.pow(2, attempt - 1)));
          continue;
        }
        break;
      } catch (networkErr: any) {
        lastError = networkErr;
        if (attempt < maxRetries) {
          await new Promise(res => setTimeout(res, 500 * Math.pow(2, attempt - 1)));
          continue;
        }
      }
    }

    if (!response) {
      throw new Error(`Google Calendar API connection failed: ${lastError?.message || 'Network timeout'}. Please check internet connection.`);
    }

    if (!response.ok) {
      const errText = await response.text();
      let parsedMessage = '';
      try {
        const json = JSON.parse(errText);
        parsedMessage = json.error?.message || json.message || errText;
      } catch {
        parsedMessage = errText;
      }

      const isAuthError = response.status === 401 || response.status === 403 || 
        parsedMessage.toLowerCase().includes('invalid credential') || 
        parsedMessage.toLowerCase().includes('invalid_grant') ||
        parsedMessage.toLowerCase().includes('insufficient permission');

      if (isAuthError) {
        await GoogleAuthService.disconnect();
        throw new Error(`Google Calendar Permission Error (${response.status}): Your access token has expired or requires Calendar permission. Please sign in again.`);
      }

      if (response.status === 404) {
        throw new Error(`Calendar event not found on Google Calendar (404).`);
      }

      throw new Error(`Google Calendar Error (${response.status}): ${parsedMessage}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  },

  /**
   * Creates an event in the primary Google Calendar.
   */
  async createEvent(payload: CalendarEventPayload) {
    // Append conferenceDataVersion=1 to request Google Meet link creation
    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all&conferenceDataVersion=1';
    
    const formattedLocation = payload.building 
      ? `${payload.roomName}, ${payload.building}, IIT BHU Varanasi`
      : `${payload.roomName}, IIT BHU Varanasi`;

    const descriptionLines = [
      `Smart Meeting Room Reservation - IIT BHU`,
      `---------------------------------------`,
      `Room: ${payload.roomName}`,
      payload.building ? `Building: ${payload.building}` : '',
      `Booked By: ${payload.creatorName} (${payload.creatorEmail})`,
      payload.facultyId ? `Faculty ID: ${payload.facultyId}` : '',
      payload.agenda ? `Agenda: ${payload.agenda}` : '',
      `---------------------------------------`,
      `Sync ID: smartrooms-sync-${Date.now()}`
    ].filter(Boolean);

    const attendees = [
      { email: payload.creatorEmail, displayName: payload.creatorName }
    ];
    if (payload.attendeeEmail) {
      attendees.push({ email: payload.attendeeEmail, displayName: 'Invited Attendee' });
    }

    const requestBody = {
      summary: payload.summary,
      location: formattedLocation,
      description: descriptionLines.join('\n'),
      start: {
        dateTime: payload.startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      },
      end: {
        dateTime: payload.endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      },
      attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
          { method: 'popup', minutes: 1440 },
          { method: 'email', minutes: 1440 }
        ]
      },
      conferenceData: {
        createRequest: {
          requestId: 'meet-' + Math.random().toString(36).substring(2, 9),
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    return this.fetchCalendarAPI(url, {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  },

  /**
   * Updates an existing event in the primary Google Calendar.
   */
  async updateEvent(eventId: string, payload: CalendarEventPayload) {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all&conferenceDataVersion=1`;

    const formattedLocation = payload.building 
      ? `${payload.roomName}, ${payload.building}, IIT BHU Varanasi`
      : `${payload.roomName}, IIT BHU Varanasi`;

    const descriptionLines = [
      `Smart Meeting Room Reservation - IIT BHU (Updated)`,
      `---------------------------------------`,
      `Room: ${payload.roomName}`,
      payload.building ? `Building: ${payload.building}` : '',
      `Booked By: ${payload.creatorName} (${payload.creatorEmail})`,
      payload.facultyId ? `Faculty ID: ${payload.facultyId}` : '',
      payload.agenda ? `Agenda: ${payload.agenda}` : '',
      `---------------------------------------`,
      `Sync ID: smartrooms-sync-${Date.now()}`
    ].filter(Boolean);

    const attendees = [
      { email: payload.creatorEmail, displayName: payload.creatorName }
    ];
    if (payload.attendeeEmail) {
      attendees.push({ email: payload.attendeeEmail, displayName: 'Invited Attendee' });
    }

    const requestBody = {
      summary: payload.summary,
      location: formattedLocation,
      description: descriptionLines.join('\n'),
      start: {
        dateTime: payload.startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      },
      end: {
        dateTime: payload.endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      },
      attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
          { method: 'popup', minutes: 1440 },
          { method: 'email', minutes: 1440 }
        ]
      },
      conferenceData: {
        createRequest: {
          requestId: 'meet-' + Math.random().toString(36).substring(2, 9),
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    return this.fetchCalendarAPI(url, {
      method: 'PUT',
      body: JSON.stringify(requestBody)
    });
  },

  /**
   * Deletes an event from the primary Google Calendar.
   */
  async deleteEvent(eventId: string) {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
    return this.fetchCalendarAPI(url, {
      method: 'DELETE'
    });
  }
};
