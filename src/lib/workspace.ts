import { getAccessToken } from './auth';
import { Booking, DriveFile, ChatSpace } from '../types';

/**
 * Universal helper to make authenticated fetch requests to Google APIs.
 */
async function googleFetch(url: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No Google access token available. Please sign in again.');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errText = await response.text();
    let parsedErr;
    try {
      parsedErr = JSON.parse(errText);
    } catch {
      parsedErr = errText;
    }
    throw new Error(
      parsedErr?.error?.message || `Google API Error (${response.status}): ${errText}`
    );
  }

  // Some operations (like DELETE) return 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Google Calendar API Helpers
 */
export const CalendarAPI = {
  async listEvents(): Promise<any[]> {
    const now = new Date();
    // Fetch upcoming events from primary calendar
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&orderBy=startTime&singleEvents=true&maxResults=25`;
    const data = await googleFetch(url);
    return data.items || [];
  },

  async createEvent(booking: Omit<Booking, 'id'>): Promise<any> {
    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all';
    const descriptionLines = [
      `Smart Room Booking for ${booking.roomName}.`,
      `Booked by Faculty: ${booking.creatorName} (${booking.creatorEmail}).`,
    ];
    if (booking.facultyId) {
      descriptionLines.push(`Faculty Name/ID: ${booking.facultyId}`);
    }
    if (booking.attendeeEmail) {
      descriptionLines.push(`Added Attendee: ${booking.attendeeEmail}`);
    }

    const attendees = [
      { email: booking.creatorEmail, displayName: booking.creatorName }
    ];
    if (booking.attendeeEmail) {
      attendees.push({ email: booking.attendeeEmail, displayName: 'Meeting Attendee' });
    }

    const payload = {
      summary: `[Scheduled] ${booking.summary}`,
      location: booking.roomName,
      description: descriptionLines.join('\n'),
      start: {
        dateTime: booking.startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: booking.endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees,
    };

    return googleFetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteEvent(eventId: string): Promise<void> {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
    await googleFetch(url, {
      method: 'DELETE',
    });
  },
};

/**
 * Google Drive API Helpers
 */
export const DriveAPI = {
  async listFiles(): Promise<DriveFile[]> {
    // List non-trashed files. We can filter for text/csv booking receipts or general files.
    const url = 'https://www.googleapis.com/drive/v3/files?pageSize=15&fields=files(id,name,mimeType,webViewLink)&q=trashed=false';
    const data = await googleFetch(url);
    return data.files || [];
  },

  /**
   * Creates a modern booking log summary in Google Drive.
   * Leverages a multi-part creation flow or simplified text creation.
   */
  async createLogFile(filename: string, content: string): Promise<DriveFile> {
    // Step 1: Create file metadata
    const createMetaUrl = 'https://www.googleapis.com/drive/v3/files';
    const fileMetadata = {
      name: filename,
      mimeType: 'text/html',
    };

    const metadataResponse = await googleFetch(createMetaUrl, {
      method: 'POST',
      body: JSON.stringify(fileMetadata),
    });

    const fileId = metadataResponse.id;

    // Step 2: Upload content to the created file using PATCH with media
    const token = await getAccessToken();
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    
    const response = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/html',
      },
      body: content,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload content for file ${fileId}`);
    }

    return response.json();
  },
};

/**
 * Gmail API Helpers
 */
export const GmailAPI = {
  async sendEmail(to: string, subject: string, htmlBody: string): Promise<any> {
    const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
    
    const emailParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      htmlBody,
    ];

    const emailString = emailParts.join('\r\n');
    
    // Safely encode to standard Base64url format
    const base64UrlEmail = btoa(unescape(encodeURIComponent(emailString)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return googleFetch(url, {
      method: 'POST',
      body: JSON.stringify({ raw: base64UrlEmail }),
    });
  },
};

/**
 * Google Forms API Helpers
 */
export const FormsAPI = {
  async getForm(formId: string): Promise<any> {
    const url = `https://forms.googleapis.com/v1/forms/${formId}`;
    return googleFetch(url);
  },
};

/**
 * Google Chat API Helpers
 */
export const ChatAPI = {
  async listSpaces(): Promise<ChatSpace[]> {
    const url = 'https://chat.googleapis.com/v1/spaces';
    const data = await googleFetch(url);
    return data.spaces || [];
  },

  async postMessage(spaceName: string, text: string): Promise<any> {
    const url = `https://chat.googleapis.com/v1/${spaceName}/messages`;
    return googleFetch(url, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },
};
