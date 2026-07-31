/**
 * Utility to generate direct "Add to Google Calendar" URLs without OAuth or API tokens.
 * Works seamlessly across all desktop & mobile browsers for any Google account.
 */

export interface BookingCalendarDetails {
  title: string;
  roomName: string;
  building?: string;
  startTime: string; // ISO string or YYYY-MM-THH:mm
  endTime: string;   // ISO string or YYYY-MM-THH:mm
  date?: string;
  description?: string;
  organizer?: string;
  organizerEmail?: string;
  attendees?: string[];
  notes?: string;
}

/**
 * Format date into ISO string compatible with Google Calendar render template: YYYYMMDDTHHmmssZ
 */
function formatGCalDateTime(dateInput: string): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().replace(/-|:|\.\d{3}/g, '');
  } catch {
    return '';
  }
}

/**
 * Creates a direct template URL to pre-fill a new Google Calendar event in the user's browser.
 */
export function createGoogleCalendarUrl(booking: BookingCalendarDetails): string {
  const startFormatted = formatGCalDateTime(booking.startTime);
  const endFormatted = formatGCalDateTime(booking.endTime);
  const datesParam = startFormatted && endFormatted ? `${startFormatted}/${endFormatted}` : '';

  const location = [booking.roomName, booking.building].filter(Boolean).join(', ') || 'IIT (BHU) Campus';

  const detailsParts = [
    `🏛️ Facility: ${booking.roomName}`,
    booking.building ? `📍 Building / Location: ${booking.building}` : null,
    booking.organizer ? `👤 Organizer: ${booking.organizer}${booking.organizerEmail ? ` (${booking.organizerEmail})` : ''}` : null,
    booking.description ? `📝 Agenda: ${booking.description}` : null,
    booking.notes ? `📌 Meeting Notes: ${booking.notes}` : null,
    booking.attendees && booking.attendees.length > 0 ? `👥 Invites: ${booking.attendees.join(', ')}` : null,
    `\n---\nBooked via IIT (BHU) Smart Room Scheduler`
  ].filter(Boolean);

  const details = detailsParts.join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: booking.title || `Room Booking - ${booking.roomName}`,
    dates: datesParam,
    details: details,
    location: location,
  });

  if (booking.attendees && booking.attendees.length > 0) {
    params.set('add', booking.attendees.join(','));
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Formats full meeting details into clean multi-line plain text for copying to clipboard.
 */
export function buildMeetingDetailsText(booking: BookingCalendarDetails): string {
  const startObj = new Date(booking.startTime);
  const endObj = new Date(booking.endTime);

  const formattedDate = !isNaN(startObj.getTime())
    ? startObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : (booking.date || '');

  const formattedStartTime = !isNaN(startObj.getTime())
    ? startObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : booking.startTime;

  const formattedEndTime = !isNaN(endObj.getTime())
    ? endObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : booking.endTime;

  return [
    `📅 ROOM BOOKING DETAILS`,
    `----------------------------------------`,
    `📌 Meeting Title: ${booking.title || 'Room Reservation'}`,
    `🏛️ Facility: ${booking.roomName}${booking.building ? ` (${booking.building})` : ''}`,
    `🗓️ Date: ${formattedDate}`,
    `⏰ Time: ${formattedStartTime} - ${formattedEndTime}`,
    booking.organizer ? `👤 Organizer: ${booking.organizer}${booking.organizerEmail ? ` (${booking.organizerEmail})` : ''}` : null,
    booking.attendees && booking.attendees.length > 0 ? `👥 Attendees: ${booking.attendees.join(', ')}` : null,
    (booking.description || booking.notes) ? `📝 Description / Notes: ${booking.description || booking.notes}` : null,
    `----------------------------------------`,
    `Smart Room Reservation System • IIT (BHU)`
  ].filter(Boolean).join('\n');
}
