import { Response, NextFunction } from 'express';
import * as bookingService from '../services/bookingService.js';
import * as bookingRepo from '../repositories/bookingRepository.js';
import * as roomRepo from '../repositories/roomRepository.js';
import * as userRepo from '../repositories/userRepository.js';
import { getAuditLogs } from '../repositories/auditLogRepository.js';

export async function getBookings(req: any, res: Response, next: NextFunction) {
  try {
    const bookings = await bookingRepo.getBookings();
    return res.json(bookings);
  } catch (err) {
    next(err);
  }
}

export async function createBooking(req: any, res: Response, next: NextFunction) {
  try {
    const bypass = req.query.bypassConflict === 'true';
    const result = await bookingService.createBooking(req.body, bypass, req.user);
    if (result.conflictDetected) {
      return res.status(409).json(result);
    }
    return res.status(201).json(result.booking);
  } catch (err) {
    next(err);
  }
}

export async function updateBooking(req: any, res: Response, next: NextFunction) {
  try {
    const bypass = req.query.bypassConflict === 'true';
    const result = await bookingService.updateBooking(req.params.id, req.body, bypass, req.user);
    if (result.notFound) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (result.unauthorized) {
      return res.status(403).json({ error: 'Unauthorized: Booking can only be edited by its creator or an administrator.' });
    }
    if (result.conflictDetected) {
      return res.status(409).json(result);
    }
    return res.json(result.booking);
  } catch (err) {
    next(err);
  }
}

export async function deleteBooking(req: any, res: Response, next: NextFunction) {
  try {
    const result = await bookingService.deleteBooking(req.params.id, req.user);
    if (result.notFound) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (result.unauthorized) {
      return res.status(403).json({ error: 'Unauthorized: Booking can only be cancelled by its creator or an administrator.' });
    }
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function qrCheckIn(req: any, res: Response, next: NextFunction) {
  try {
    const result = await bookingService.qrCheckIn(req.params.id, req.user);
    if (result.notFound) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (result.unauthorized) {
      return res.status(403).json({ error: 'Access denied: You can only check-in to your own bookings.' });
    }
    if (result.badRequest) {
      return res.status(400).json({ error: result.message });
    }
    return res.json(result.booking);
  } catch (err) {
    next(err);
  }
}

export async function getAnalytics(req: any, res: Response, next: NextFunction) {
  try {
    const bookings = await bookingRepo.getBookings();
    const rooms = await roomRepo.getRooms();
    const users = await userRepo.getUsers();

    // 1. Total count
    const totalBookings = bookings.length;

    // 2. Room Frequency
    const frequency: Record<string, number> = {};
    bookings.forEach((b: any) => {
      frequency[b.room_name] = (frequency[b.room_name] || 0) + 1;
    });
    const roomFrequency = Object.entries(frequency).map(([name, value]) => ({ name, value }));

    // 3. Role distribution
    let adminCount = 0;
    let userCount = 0;
    users.forEach((u: any) => {
      if (u.role === 'admin') adminCount++;
      else userCount++;
    });
    const roleDistribution = [
      { name: 'Admin', value: adminCount },
      { name: 'User', value: userCount }
    ];

    // 4. Hourly Demand analysis (00:00 - 23:00)
    const demand: Record<string, number> = {};
    for (let i = 0; i < 24; i++) {
      const label = `${String(i).padStart(2, '0')}:00`;
      demand[label] = 0;
    }
    
    bookings.forEach((b: any) => {
      try {
        const date = new Date(b.start_time);
        if (!isNaN(date.getTime())) {
          const hour = date.getHours();
          const label = `${String(hour).padStart(2, '0')}:00`;
          demand[label] = (demand[label] || 0) + 1;
        }
      } catch {
        // ignore malformed date
      }
    });
    const hourlyDemand = Object.entries(demand).map(([hour, count]) => ({ hour, count }));

    return res.json({
      totalBookings,
      roomFrequency,
      roleDistribution,
      hourlyDemand
    });
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogsList(req: any, res: Response, next: NextFunction) {
  try {
    const logs = await getAuditLogs();
    return res.json(logs);
  } catch (err) {
    next(err);
  }
}
