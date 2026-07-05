import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/environment.js';
import * as userRepo from '../repositories/userRepository.js';
import { User } from '../models/index.js';

export function signToken(payload: { id: string; email: string; name: string; role: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): any {
  return jwt.verify(token, env.JWT_SECRET);
}

export async function registerUser(email: string, password: string, name: string, role?: string): Promise<{ user: Omit<User, 'password'>; token: string }> {
  const normalizedEmail = email.toLowerCase();
  const exists = await userRepo.findUserByEmail(normalizedEmail);
  if (exists) {
    throw new Error('User already exists with this email address');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser: User = {
    id: 'user-' + Math.random().toString(36).substring(2, 9),
    email: normalizedEmail,
    password: hashedPassword,
    name,
    role: (role === 'admin' || role === 'user') ? role : 'user',
    created_at: new Date().toISOString()
  };

  await userRepo.createUser(newUser);

  const tokenPayload = { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role };
  const token = signToken(tokenPayload);

  return {
    user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, created_at: newUser.created_at },
    token
  };
}

export async function loginUser(email: string, password: string): Promise<{ user: Omit<User, 'password'>; token: string }> {
  const normalizedEmail = email.toLowerCase();
  let user = await userRepo.findUserByEmail(normalizedEmail);

  if (user) {
    let isPasswordCorrect = false;
    const userPass = user.password || '';
    if (userPass.startsWith('$2a$') || userPass.startsWith('$2b$')) {
      isPasswordCorrect = await bcrypt.compare(password, userPass);
    } else {
      isPasswordCorrect = userPass === password;
    }

    if (!isPasswordCorrect) {
      throw new Error('Incorrect password. Please verify credentials.');
    }
  } else {
    // Auto-create user on first login for seamless testing
    const formattedName = normalizedEmail.split('@')[0]
      .split('.')
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'password123', salt);

    user = {
      id: `user-${Date.now()}`,
      email: normalizedEmail,
      password: hashedPassword,
      name: formattedName || 'Academic Member',
      role: 'user',
      created_at: new Date().toISOString()
    };
    await userRepo.createUser(user);
  }

  const tokenPayload = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token = signToken(tokenPayload);

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role, created_at: user.created_at },
    token
  };
}

export async function googleLoginUser(email: string, name: string, uid: string): Promise<{ user: Omit<User, 'password'>; token: string }> {
  const normalizedEmail = email.toLowerCase();
  let user = await userRepo.findUserByEmail(normalizedEmail);

  if (!user) {
    let role: 'admin' | 'user' = 'user';
    if (
      normalizedEmail.includes('admin') ||
      normalizedEmail === 'pathaksrishti2208@gmail.com'
    ) {
      role = 'admin';
    }

    user = {
      id: `google-${uid || Math.random().toString(36).substring(2, 9)}`,
      email: normalizedEmail,
      password: 'google-authenticated-account',
      name: name || email.split('@')[0],
      role: role,
      created_at: new Date().toISOString()
    };
    await userRepo.createUser(user);
  }

  const tokenPayload = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token = signToken(tokenPayload);

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role, created_at: user.created_at },
    token
  };
}
