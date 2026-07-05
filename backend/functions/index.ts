import * as bookingRepo from '../repositories/bookingRepository.js';
import { sendBookingReminderEmail } from '../services/emailService.js';
import { logger } from '../utils/logger.js';

export function startBackgroundScheduler() {
  logger.info('⏱ BACKGROUND FUNCTIONS: Spawning upcoming booking reminder scheduler loop (every 5 minutes).');
  
  setInterval(async () => {
    try {
      const bookings = await bookingRepo.getBookings();
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;
      
      for (const b of bookings) {
        const bStart = new Date(b.start_time).getTime();
        if (!isNaN(bStart)) {
          const diff = bStart - now;
          // If start is within 30 minutes, in the future, and reminder not sent
          if (diff > 0 && diff <= thirtyMinutes && !b.reminder_sent) {
            logger.info(`⏱ Background Scheduler: Booking "${b.summary}" for room "${b.room_name}" is starting soon. Dispatching reminder.`);
            await sendBookingReminderEmail(b).catch(err => logger.error('Scheduler email error:', err));
            
            await bookingRepo.updateBooking(b.id, { reminder_sent: true });
          }
        }
      }
    } catch (err: any) {
      logger.error('Background Scheduler Error: ', err);
    }
  }, 5 * 60 * 1000);
}
