import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import * as roomController from '../controllers/roomController.js';
import * as bookingController from '../controllers/bookingController.js';
import * as userController from '../controllers/userController.js';
import * as notificationController from '../controllers/notificationController.js';

import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { 
  validateRegistration, 
  validateLogin, 
  validateBooking, 
  validateRoom 
} from '../middleware/validation.js';

const router = Router();

// Authentication Endpoints
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/google-login', authController.googleLogin);
router.get('/profile', authenticateToken, authController.getProfile);

// Room Directory Endpoints
router.get('/rooms', authenticateToken, roomController.getRooms);
router.post('/rooms', authenticateToken, requireAdmin, validateRoom, roomController.createRoom);
router.post('/rooms/bulk', authenticateToken, requireAdmin, roomController.bulkAddRooms);
router.put('/rooms/:id', authenticateToken, requireAdmin, roomController.editRoom);
router.delete('/rooms/:id', authenticateToken, requireAdmin, roomController.deleteRoom);

// Booking Flow Endpoints
router.get('/bookings', authenticateToken, bookingController.getBookings);
router.post('/bookings', authenticateToken, validateBooking, bookingController.createBooking);
router.put('/bookings/:id', authenticateToken, validateBooking, bookingController.updateBooking);
router.delete('/bookings/:id', authenticateToken, bookingController.deleteBooking);
router.post('/bookings/:id/check-in', authenticateToken, bookingController.qrCheckIn);

// User Directory Administration
router.get('/users', authenticateToken, requireAdmin, userController.getUsers);
router.post('/users/role', authenticateToken, requireAdmin, userController.updateUserRole);

// System Logs & Analytics
router.get('/analytics', authenticateToken, bookingController.getAnalytics);
router.get('/audit-logs', authenticateToken, requireAdmin, bookingController.getAuditLogsList);

// Live Notification Feed Endpoints
router.get('/notifications', authenticateToken, notificationController.getNotifications);
router.post('/notifications/read', authenticateToken, notificationController.markAllNotificationsAsRead);

export default router;
