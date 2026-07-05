import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService.js';
import * as userRepo from '../repositories/userRepository.js';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name, role } = req.body;
    const result = await authService.registerUser(email, password, name, role);
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    return res.json(result);
  } catch (err: any) {
    return res.status(401).json({ error: err.message });
  }
}

export async function googleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, name, uid } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Google Email is required' });
    }
    const result = await authService.googleLoginUser(email, name, uid);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function getProfile(req: any, res: Response, next: NextFunction) {
  try {
    const user = await userRepo.findUserByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at
    });
  } catch (err) {
    next(err);
  }
}
