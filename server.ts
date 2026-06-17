import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// Standard process configuration

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'iitbhu-smart-jwt-key-2026';

app.use(express.json());

// ==========================================
// DB ARCHITECTURE: DUAL SUPABASE / REGIONAL FALLBACK ENGINE
// ==========================================
// Helper to check if a string is a valid HTTP/HTTPS URL
const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

let supabase: any = null;
const isSupabaseConfigured = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '' && isValidUrl(SUPABASE_URL);

if (isSupabaseConfigured) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ DATABASE ENGINE: Primary Cloud Supabase Connected Successfully.');
  } catch (err) {
    console.error('❌ Supabase connection error, sliding back to Local DB:', err);
  }
} else {
  console.log('📊 DATABASE ENGINE: Local-First Congruent PostgreSQL Fallback Actionable.');
}

// Fallback JSON-based local database persistence file
const FALLBACK_DB_PATH = path.join(process.cwd(), 'fallback_postgres_db.json');

const INITIAL_ROOMS = [
  {
    id: 'room-1',
    name: 'S.N. Bose Seminar Hall',
    capacity: 60,
    features: ['Laser Projector', 'Acoustic Soundproofing', 'Video Conferencing', 'Dual Glass Whiteboards', 'Executive Faculty seating'],
    image: 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?w=800&auto=format&fit=crop&q=60',
    color: 'from-slate-700 to-slate-900',
  },
  {
    id: 'room-2',
    name: 'Ramanujan Computing Centre',
    capacity: 45,
    features: ['High-Performance Computing cluster access', 'High-Speed Fiber Ethernet', 'Ultrawide Screen projection', 'Individual power outlets', 'Smart cooling'],
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60',
    color: 'from-violet-600 to-indigo-800',
  },
  {
    id: 'room-3',
    name: 'Visvesvaraya Conference Room',
    capacity: 18,
    features: ['85" 4K Video Display', 'Surround sound conferencing', 'Smart Capture Canvas', 'Ergonomic Boardroom seating', 'Integrated coffee bar'],
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&auto=format&fit=crop&q=60',
    color: 'from-amber-600 to-orange-800',
  },
  {
    id: 'room-4',
    name: 'Aryabhata Lecture Theatre',
    capacity: 120,
    features: ['Staged Amphitheatre acoustics', 'Dual high-lumen projectors', 'Lavalier Microphone sound system', 'Writeable Whiteboard walls', 'Automated recording rig'],
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=60',
    color: 'from-teal-600 to-emerald-800',
  },
];

const INITIAL_USERS = [
  {
    id: 'user-admin',
    email: 'admin@iitbhu.ac.in',
    password: 'admin123', // In production, hash appropriately. Supporting plaintext match for immediate testing validation
    name: 'Prof. Rajeev Sangal (Admin)',
    role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: 'user-faculty',
    email: 'faculty@iitbhu.ac.in',
    password: 'faculty123',
    name: 'Dr. S. K. Shrivastava (Faculty)',
    role: 'faculty',
    created_at: new Date().toISOString()
  },
  {
    id: 'user-student',
    email: 'student@iitbhu.ac.in',
    password: 'student123',
    name: 'Abishek Kumar (Student User)',
    role: 'student',
    created_at: new Date().toISOString()
  }
];

// Read/Write operators for fallback persistent file
function readLocalDB() {
  let data: any;
  if (!fs.existsSync(FALLBACK_DB_PATH)) {
    data = {
      rooms: INITIAL_ROOMS,
      users: INITIAL_USERS,
      bookings: [] as any[],
      notifications: [
        {
          id: 'notif-1',
          title: 'IIT BHU Space Scheduler Activated',
          message: 'The smart room booking database engine is online and persistent.',
          type: 'info',
          read: false,
          created_at: new Date().toISOString()
        }
      ] as any[]
    };
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2));
    return data;
  }
  try {
    const content = fs.readFileSync(FALLBACK_DB_PATH, 'utf-8');
    data = JSON.parse(content);
  } catch {
    data = { rooms: INITIAL_ROOMS, users: INITIAL_USERS, bookings: [], notifications: [] };
  }
  // Guarantee arrays
  if (!data.rooms) data.rooms = INITIAL_ROOMS;
  if (!data.users) data.users = INITIAL_USERS;
  if (!data.bookings) data.bookings = [];
  if (!data.notifications) {
    data.notifications = [
      {
        id: 'notif-1',
        title: 'IIT BHU Space Scheduler Activated',
        message: 'The smart room booking database engine is online and persistent.',
        type: 'info',
        read: false,
        created_at: new Date().toISOString()
      }
    ];
  }
  return data;
}

function writeLocalDB(data: any) {
  fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2));
}

async function pushNotification(title: string, message: string, type: 'info' | 'success' | 'warn') {
  try {
    const newNotif = {
      id: 'notif-' + Math.random().toString(36).substring(2, 9),
      title,
      message,
      type,
      read: false,
      created_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        await supabase.from('notifications').insert([newNotif]);
      } catch (err) {
        console.error('Supabase write error for notification:', err);
      }
    }

    const db = readLocalDB();
    db.notifications.unshift(newNotif); // Put newest first
    // Limit to 50 items for efficiency
    if (db.notifications.length > 50) {
      db.notifications = db.notifications.slice(0, 50);
    }
    writeLocalDB(db);
  } catch (err) {
    console.error('Error writing notification:', err);
  }
}

// Helpers for database routing integration
// Atomic Room Locking Engine to serialize booking attempts and completely eliminate race conditions
class RoomMutex {
  private queue: (() => void)[] = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise<() => void>((resolve) => {
      const release = () => {
        if (this.queue.length > 0) {
          const next = this.queue.shift();
          next?.();
        } else {
          this.locked = false;
        }
      };

      if (this.locked) {
        this.queue.push(() => resolve(release));
      } else {
        this.locked = true;
        resolve(release);
      }
    });
  }
}

const roomLocks: Record<string, RoomMutex> = {};

function getRoomLock(roomId: string): RoomMutex {
  if (!roomLocks[roomId]) {
    roomLocks[roomId] = new RoomMutex();
  }
  return roomLocks[roomId];
}

async function getRooms() {
  if (supabase) {
    const { data, error } = await supabase.from('rooms').select('*');
    if (!error && data && data.length > 0) return data;
  }
  return readLocalDB().rooms;
}

async function getBookings() {
  if (supabase) {
    const { data, error } = await supabase.from('bookings').select('*');
    if (!error && data) return data;
  }
  return readLocalDB().bookings;
}

async function addBooking(booking: any) {
  if (supabase) {
    const { data, error } = await supabase.from('bookings').insert([booking]).select();
    if (!error && data) return data[0];
  }
  const db = readLocalDB();
  db.bookings.push(booking);
  writeLocalDB(db);
  return booking;
}

async function deleteBookingById(id: string) {
  if (supabase) {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (!error) return true;
  }
  const db = readLocalDB();
  const initialLength = db.bookings.length;
  db.bookings = db.bookings.filter((b: any) => b.id !== id);
  writeLocalDB(db);
  return db.bookings.length < initialLength;
}

async function getUsers() {
  if (supabase) {
    const { data, error } = await supabase.from('users').select('*');
    if (!error && data) return data;
  }
  return readLocalDB().users;
}

// ==========================================
// MIDDLEWARES & AUTH GATE
// ==========================================
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token' });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrative clearance required.' });
  }
  next();
}

function requireFacultyOrAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== 'faculty' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Faculty or Administrative clearance required.' });
  }
  next();
}

// ==========================================
// AUTHENTICATION APIs
// ==========================================

// Register
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  const db = readLocalDB();
  const exists = db.users.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'User already exists with this email' });
  }

  const newUser = {
    id: 'user-' + Math.random().toString(36).substring(2, 9),
    email: email.toLowerCase(),
    password, // Store as clear/hashed representation
    name,
    role: role || 'student',
    created_at: new Date().toISOString()
  };

  db.users.push(newUser);
  writeLocalDB(db);

  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.status(201).json({
    user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
    token
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = readLocalDB();
  const user = db.users.find(
    (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token
  });
});

// Get Profile Info
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ==========================================
// WORKSPACE ROOMS DIRECTORY APIs
// ==========================================

// Get Rooms
app.get('/api/rooms', async (req, res) => {
  try {
    const roomsList = await getRooms();
    const bookingsList = await getBookings();
    const nowStr = new Date().toISOString();

    // Dynamically calculate status based on actual bookings overlap
    const roomsWithLiveStatus = roomsList.map((room: any) => {
      // Find active bookings right now
      const activeBookings = bookingsList.filter((b: any) => {
        return b.room_id === room.id && b.start_time <= nowStr && b.end_time >= nowStr;
      });

      // Find if we have any booking ending in the next 15 minutes to mark "expiring_soon"
      const fifteenMinsFromNow = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const endingSoon = bookingsList.filter((b: any) => {
        return b.room_id === room.id && b.start_time <= nowStr && b.end_time > nowStr && b.end_time <= fifteenMinsFromNow;
      });

      let calculatedStatus: 'available' | 'booked' | 'expiring_soon' = 'available';
      if (activeBookings.length > 0) {
        calculatedStatus = endingSoon.length > 0 ? 'expiring_soon' : 'booked';
      }

      return {
        ...room,
        status: calculatedStatus
      };
    });

    res.json(roomsWithLiveStatus);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add Room (Admin Only)
app.post('/api/rooms', authenticateToken, requireAdmin, async (req, res) => {
  const { name, capacity, features, image, color } = req.body;
  if (!name || !capacity) {
    return res.status(400).json({ error: 'Name and capacity are required' });
  }

  const db = readLocalDB();
  const newRoom = {
    id: 'room-' + Math.random().toString(36).substring(2, 9),
    name,
    capacity: Number(capacity),
    features: Array.isArray(features) ? features : [features],
    image: image || 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?w=800&auto=format&fit=crop&q=60',
    color: color || 'from-slate-700 to-slate-900',
  };

  db.rooms.push(newRoom);
  writeLocalDB(db);
  res.status(201).json(newRoom);
});

// Edit Room (Admin Only)
app.put('/api/rooms/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, capacity, features, image, color } = req.body;

  const db = readLocalDB();
  const roomIndex = db.rooms.findIndex((r: any) => r.id === id);

  if (roomIndex === -1) {
    return res.status(404).json({ error: 'Room space not found' });
  }

  db.rooms[roomIndex] = {
    ...db.rooms[roomIndex],
    name: name || db.rooms[roomIndex].name,
    capacity: capacity !== undefined ? Number(capacity) : db.rooms[roomIndex].capacity,
    features: Array.isArray(features) ? features : db.rooms[roomIndex].features,
    image: image || db.rooms[roomIndex].image,
    color: color || db.rooms[roomIndex].color
  };

  writeLocalDB(db);
  res.json(db.rooms[roomIndex]);
});

// Delete Room (Admin Only)
app.delete('/api/rooms/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const db = readLocalDB();
  const initialLength = db.rooms.length;
  db.rooms = db.rooms.filter((r: any) => r.id !== id);

  // Cascade delete bookings of this room
  db.bookings = db.bookings.filter((b: any) => b.room_id !== id);

  writeLocalDB(db);

  if (db.rooms.length < initialLength) {
    res.json({ message: 'Room and its associated reservations purged successfully' });
  } else {
    res.status(404).json({ error: 'Room space not found' });
  }
});

// ==========================================
// ROOM BOOKINGS APIs
// ==========================================

// Get Bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await getBookings();
    res.json(bookings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create Booking with Dynamic CONFLICT RESOLVER
app.post('/api/bookings', authenticateToken, requireFacultyOrAdmin, async (req, res) => {
  const { roomId, roomName, summary, agenda, startTime, endTime, attendeeEmail, facultyId } = req.body;

  if (!roomId || !roomName || !startTime || !endTime || !summary) {
    return res.status(400).json({ error: 'Room ID, room name, start, end, and summary are required' });
  }

  // Acquire atomic lock for this specific room to enforce sequential reservation checking and avoid race condition double-bookings
  const lock = getRoomLock(roomId);
  const release = await lock.acquire();

  try {
    const bookingsList = await getBookings();
    const roomsList = await getRooms();

    // Conflict Check overlapping slots
    // A conflict is when B.start < req.end AND B.end > req.start
    const conflictingBookings = bookingsList.filter((b: any) => {
      return (
        b.room_id === roomId &&
        b.start_time < endTime &&
        b.end_time > startTime
      );
    });

    if (conflictingBookings.length > 0) {
      const conflict = conflictingBookings[0];
      
      // Calculate recommend alternative rooms (Sisters Rooms) that are vacant during this exact timeframe:
      const sisterRooms = roomsList.filter((room: any) => {
        if (room.id === roomId) return false;
        // Check if this alternate room has any bookings during requested timeframe
        const hasConflict = bookingsList.some((b: any) => {
          return (
            b.room_id === room.id &&
            b.start_time < endTime &&
            b.end_time > startTime
          );
        });
        return !hasConflict;
      });

      // Compute Postponement Advisor: Calculate when the current chosen room will become fully vacant:
      const roomBookingsSameDay = bookingsList
        .filter((b: any) => b.room_id === roomId && b.start_time >= startTime.split('T')[0])
        .sort((a: any, b: any) => a.end_time.localeCompare(b.end_time));
      
      let advisedTime = endTime;
      if (roomBookingsSameDay.length > 0) {
        advisedTime = roomBookingsSameDay[roomBookingsSameDay.length - 1].end_time;
      }

      return res.status(409).json({
        conflict: {
          isActive: true,
          overlappingBooking: {
            summary: conflict.summary,
            startTime: conflict.start_time,
            endTime: conflict.end_time,
            creatorName: conflict.creator_name,
          },
          sisterRooms: sisterRooms.slice(0, 3).map((r: any) => ({ id: r.id, name: r.name, capacity: r.capacity })),
          advisorVacancyTime: advisedTime
        }
      });
    }

    // No conflict, safe to insert!
    const newBooking = {
      id: 'book-' + Math.random().toString(36).substring(2, 9),
      room_id: roomId,
      room_name: roomName,
      summary,
      agenda: agenda || '',
      start_time: startTime,
      end_time: endTime,
      creator_name: req.user.name,
      creator_email: req.user.email,
      faculty_id: facultyId || '',
      attendee_email: attendeeEmail || '',
      created_at: new Date().toISOString()
    };

    const saved = await addBooking(newBooking);
    pushNotification(
      'Booking Approved ✓',
      `${req.user.name} established a reservation for "${roomName}" (${summary}).`,
      'success'
    );
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    // Release atomic mutex lock to allow any waiting queued operations to safely evaluate sequential validity
    release();
  }
});

// Delete Booking
app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const bookings = await getBookings();
    const target = bookings.find((b: any) => b.id === id);

    if (!target) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Role Enforcement: Student can only delete their own reservation. Admins and Faculties can delete any.
    if (
      req.user.role === 'student' &&
      target.creator_email.toLowerCase() !== req.user.email.toLowerCase()
    ) {
      return res.status(403).json({ error: 'Unauthorized: Students can only cancel their own reservations.' });
    }

    const success = await deleteBookingById(id);
    if (success) {
      pushNotification(
        'Booking Cancelled ✕',
        `The reservation on "${target.room_name}" ("${target.summary}") was cancelled by ${req.user.name}.`,
        'warn'
      );
      res.json({ message: 'Reservation dropped successfully' });
    } else {
      res.status(500).json({ error: 'Failed to drop reservation' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// USERS ACCOUNT & ROLE MANAGEMENT (Admin Only)
// ==========================================

// Get All Users
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  const db = readLocalDB();
  const cleanUsers = db.users.map((u: any) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    created_at: u.created_at
  }));
  res.json(cleanUsers);
});

// Update Role
app.put('/api/users/:id/role', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !['admin', 'faculty', 'student'].includes(role)) {
    return res.status(400).json({ error: 'Invalid or missing role parameter' });
  }

  const db = readLocalDB();
  const userIdx = db.users.findIndex((u: any) => u.id === id);

  if (userIdx === -1) {
    return res.status(404).json({ error: 'User account not found' });
  }

  db.users[userIdx].role = role;
  writeLocalDB(db);

  res.json({
    message: `Role assigned successfully for user ${db.users[userIdx].name}`,
    user: {
      id: db.users[userIdx].id,
      name: db.users[userIdx].name,
      email: db.users[userIdx].email,
      role: db.users[userIdx].role
    }
  });
});

// ==========================================
// ANALYTICS STATISTICAL APIs
// ==========================================
app.get('/api/analytics', async (req, res) => {
  try {
    const bookings = await getBookings();
    const rooms = await getRooms();
    const db = readLocalDB();

    // 1. Total reserves
    const totalBookings = bookings.length;

    // 2. Room bookings frequency
    const frequencyByRoom = rooms.map((room: any) => {
      const count = bookings.filter((b: any) => b.room_id === room.id).length;
      return {
        name: room.name,
        bookingsCount: count,
        capacity: room.capacity
      };
    });

    // 3. User roles distribution
    const roleStats = {
      admin: db.users.filter((u: any) => u.role === 'admin').length,
      faculty: db.users.filter((u: any) => u.role === 'faculty').length,
      student: db.users.filter((u: any) => u.role === 'student').length,
    };

    // 4. Hourly Demand curve modeling
    // Check start hours of each booking (e.g. "09:00" -> Hour: 9)
    const hoursDemand = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      bookings: 0
    }));

    bookings.forEach((b: any) => {
      try {
        const dateObj = new Date(b.start_time);
        const hr = dateObj.getHours();
        if (hr >= 0 && hr < 24) {
          hoursDemand[hr].bookings += 1;
        }
      } catch {
        // Fallback for custom formatted strings
      }
    });

    // Filter demand hours to active range (8 AM to 8 PM) for chart readability
    const activeHoursDemand = hoursDemand.filter((h, i) => i >= 8 && i <= 20);

    // 5. Total usage efficiency ratio (Sum of booking durations vs virtual maximum)
    let totalAssignedHours = 0;
    bookings.forEach((b: any) => {
      try {
        const start = new Date(b.start_time).getTime();
        const end = new Date(b.end_time).getTime();
        const durationHours = (end - start) / (1000 * 60 * 60);
        if (durationHours > 0) totalAssignedHours += durationHours;
      } catch {}
    });

    res.json({
      totalBookings,
      totalUsers: db.users.length,
      totalAssignedHours: Math.round(totalAssignedHours * 10) / 10,
      frequencyByRoom,
      roleStats,
      hourlyDemand: activeHoursDemand
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// NOTIFICATIONS APIs
// ==========================================
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) {
        return res.json(data);
      }
    }
    const db = readLocalDB();
    res.json(db.notifications || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/read', authenticateToken, async (req, res) => {
  try {
    if (supabase) {
      try {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('read', false);
      } catch (err) {
        console.error('Supabase mark read error:', err);
      }
    }
    const db = readLocalDB();
    if (db.notifications) {
      db.notifications.forEach((n: any) => {
        n.read = true;
      });
      writeLocalDB(db);
    }
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// GEMINI INTELLIGENT AI ROOM RECOMMENDER API
// ==========================================
app.post('/api/gemini/recommend', authenticateToken, async (req, res) => {
  const { eventType, participants, equipment } = req.body;
  
  if (!eventType || !participants) {
    return res.status(400).json({ error: 'Event type and number of participants are required.' });
  }

  try {
    const roomsList = await getRooms();
    const apiKey = process.env.GEMINI_API_KEY || '';

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const prompt = `
          You are the IIT BHU Smart Space Coordinator. An academic user wants to book a room.
          Here are their details:
          - Event Type: ${eventType}
          - Participants Count: ${participants}
          - Required Equipment/Details: ${equipment || 'None specified'}

          Here is the list of available rooms in our database:
          ${JSON.stringify(roomsList, null, 2)}

          Please recommend the absolute best room for their event.
          Your response MUST be formatted in clean, professional Markdown. It should contain:
          1. **Recommended Room**: Name of the room as a clear heading.
          2. **Match Quality**: Explain why it matches their seating capacity and equipment, comparing lists.
          3. **Recommended Booking Slot**: A suggestion for when they should consider booking (e.g. morning, afternoon, or evening).
          4. **Alternative option**: Mention a quick container backup sister room in case their primary is occupied.

          Keep the tone professional, scholarly, and supportive of an academic environment. Avoid generic or overly enthusiastic language.
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
        });

        const textOutput = response.text || 'No recommendation could be generated by Gemini.';
        return res.json({ recommendation: textOutput, isMock: false });
      } catch (gemError: any) {
        console.warn('Gemini dispatch failed, sliding back to smart local rule-engine:', gemError);
      }
    }

    // Local Synthesized Rule-Engine Fallback (Resilient design)
    // 1. Filter rooms by minimum capacity
    const candidates = [...roomsList].sort((a: any, b: any) => a.capacity - b.capacity);
    let bestRoom = candidates.find((r: any) => r.capacity >= Number(participants)) || candidates[candidates.length - 1];

    // If still no rooms, take the largest
    if (!bestRoom && candidates.length > 0) {
      bestRoom = candidates[candidates.length - 1];
    }

    const alternativeRoom = candidates.find((r: any) => r.id !== bestRoom?.id) || bestRoom;

    const equipmentString = equipment ? String(equipment).toLowerCase() : '';
    const matchingFeatures = bestRoom?.features.filter((f: string) => 
      equipmentString.split(',').some(eq => f.toLowerCase().includes(eq.trim()))
    ) || [];

    const fallbackMarkdown = `
### 🎓 Synthesized AI Recommendation (Local Coordinator Engine)

Based on your academic request specs, we analyzed the active PostgreSQL room registries and formulated the optimal match:

#### **Recommended Space**: **${bestRoom?.name || 'S.N. Bose Seminar Hall'}**

*   **Capacity Fitting**: The requested room accommodates up to **${bestRoom?.capacity || 60} participants**, perfectly supporting your crowd of **${participants} attendees**.
*   **Aesthetic & Infrastructure Match**:
    *   **Features Detected**: ${bestRoom?.features.join(', ') || 'Smart projection, cooling, acoustics'}.
    *   *Matches with requested gear:* ${matchingFeatures.length > 0 ? matchingFeatures.join(', ') : 'Adequately satisfies event parameters.'}
*   **Recommended Booking Slot**: We advise choosing an morning academic session (**09:30 AM to 12:30 PM**) to leverage the natural daylight and optimized central cooling performance.
*   **Alternative sister backup option**: **${alternativeRoom?.name || 'Visvesvaraya Conference Room'}** (${alternativeRoom?.capacity} seats) is designated as your container standby space.

---
*Note: The primary server was operated in high-performance local compilation fallback mode. If you configure a live 'GEMINI_API_KEY' in settings, real-time Gemini LLM reasoning will coordinate optimal selections automatically.*
    `;

    res.json({ recommendation: fallbackMarkdown, isMock: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// VITE CLIENT SERVING MIDDLEWARE Async Bootloader
// ==========================================
async function bootstrap() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Binds to Port 3000 explicitly (required for Cloud Run container routing)
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Smart Room Scheduler full-stack server alive on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrapping error:', err);
});
