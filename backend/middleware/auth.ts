import { Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService.js';
import { logger } from '../utils/logger.js';

export function authenticateToken(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  try {
    const user = verifyToken(token);
    req.user = user;
    next();
  } catch (err) {
    logger.warn('Token verification failed:', err);
    return res.status(403).json({ error: 'Invalid or expired session token' });
  }
}

export function requireAdmin(req: any, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrative clearance required.' });
  }
  next();
}

export function requireRole(allowedRoles: ('admin' | 'user')[]) {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized role clearance.' });
    }
    next();
  };
}
