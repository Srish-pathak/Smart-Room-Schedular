import { Request, Response, NextFunction } from 'express';
import { validateEmail } from '../utils/validation.js';

export function validateRegistration(req: Request, res: Response, next: NextFunction) {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid academic or professional email address' });
  }

  next();
}

export function validateLogin(req: Request, res: Response, next: NextFunction) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  next();
}

export function validateBooking(req: Request, res: Response, next: NextFunction) {
  const { roomId, roomName, summary, startTime, endTime } = req.body;
  if (!roomId || !roomName || !startTime || !endTime || !summary) {
    return res.status(400).json({ error: 'Room ID, room name, start, end, and summary are required' });
  }
  next();
}

export function validateRoom(req: Request, res: Response, next: NextFunction) {
  const { name, capacity } = req.body;
  if (!name || !capacity) {
    return res.status(400).json({ error: 'Name and capacity are required' });
  }
  next();
}
