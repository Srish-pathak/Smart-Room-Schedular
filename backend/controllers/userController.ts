import { Request, Response, NextFunction } from 'express';
import * as userRepo from '../repositories/userRepository.js';
import { pushNotification } from '../repositories/notificationRepository.js';

export async function getUsers(req: any, res: Response, next: NextFunction) {
  try {
    const users = await userRepo.getUsers();
    // Return sanitized users list (remove password hash)
    const sanitized = users.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      created_at: u.created_at
    }));
    return res.json(sanitized);
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(req: any, res: Response, next: NextFunction) {
  try {
    const { userId, role } = req.body;
    if (!userId || !role) {
      return res.status(400).json({ error: 'User ID and Role are required' });
    }

    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({ error: 'Role must be either admin or user' });
    }

    const updatedUser = await userRepo.updateUserRole(userId, role);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pushNotification(
      'Role Promotion Applied 🛡',
      `${req.user.name} promoted ${updatedUser.name} to ${role.toUpperCase()}.`,
      'success'
    );

    return res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      created_at: updatedUser.created_at
    });
  } catch (err) {
    next(err);
  }
}
