import { Request, Response, NextFunction } from 'express';
import * as notifRepo from '../repositories/notificationRepository.js';

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const notifs = await notifRepo.getNotifications();
    return res.json(notifs);
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    await notifRepo.markAllNotificationsAsRead();
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
