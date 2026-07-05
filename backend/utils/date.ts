export function isValidDateStr(val: string): boolean {
  if (!val) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

export function checkOverlappingBookings(
  roomId: string,
  startTime: string,
  endTime: string,
  bookingsList: any[],
  excludeBookingId?: string,
  roomsList: any[] = []
): any[] {
  const room = roomsList.find((r: any) => r.id === roomId);
  const bufferMinutes = room && room.buffer_time !== undefined ? Number(room.buffer_time) : 15;

  return bookingsList.filter((b: any) => {
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (b.room_id !== roomId) return false;

    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();
    const reqStart = new Date(startTime).getTime();
    const reqEnd = new Date(endTime).getTime();

    if (isNaN(bStart) || isNaN(bEnd) || isNaN(reqStart) || isNaN(reqEnd)) {
      return b.start_time < endTime && b.end_time > startTime;
    }

    const bufferMs = bufferMinutes * 60 * 1000;
    
    // Conflict if:
    // reqStart < bEnd + bufferMs AND reqEnd + bufferMs > bStart
    return reqStart < bEnd + bufferMs && reqEnd + bufferMs > bStart;
  });
}
