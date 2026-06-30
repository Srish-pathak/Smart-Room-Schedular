import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  limit, 
  orderBy, 
  initializeFirestore 
} from 'firebase/firestore';

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

// ==========================================
// FIREBASE / CLOUD FIRESTORE REGIONAL ENGINE
// ==========================================
let firebaseApp: any = null;
let firestoreDb: any = null;
let isFirebaseActive = false;

try {
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const configRaw = fs.readFileSync(firebaseConfigPath, 'utf-8');
    const config = JSON.parse(configRaw);
    if (config.apiKey && config.projectId) {
      firebaseApp = initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId
      });
      if (config.firestoreDatabaseId) {
        firestoreDb = getFirestore(firebaseApp, config.firestoreDatabaseId);
      } else {
        firestoreDb = getFirestore(firebaseApp);
      }
      isFirebaseActive = true;
      console.log('🔥 DATABASE ENGINE: Persistent Cloud Firestore Connected Successfully!');
    }
  }
} catch (err) {
  console.error('⚠️ Firebase Initialization Error, relying on local DB fallback:', err);
}

// Firestore Error Interface definitions according to Firebase Skill
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Fallback JSON-based local database persistence file
const FALLBACK_DB_PATH = path.join(process.cwd(), 'fallback_postgres_db.json');

const INITIAL_ROOMS = [
  {
    id: 'room-1',
    name: 'Senate Hall',
    building: 'Swatantrata Bhawan',
    category: 'Central Institute Facility',
    floor: 'Ground Floor',
    capacity: 400,
    features: ['Projector', 'Audio System', 'AC', 'Wheelchair Accessible', 'Microphone', 'Recording Facility'],
    bestFor: 'Conferences, Institute Meetings, Convocations',
    contactDepartment: 'Registrar Academic Section',
    image: 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?w=800&auto=format&fit=crop&q=60',
    color: 'from-amber-700 to-orange-900'
  },
  {
    id: 'room-2',
    name: 'Institute Board Room',
    building: 'Administration Block',
    category: 'Central Institute Facility',
    floor: '1st Floor',
    capacity: 35,
    features: ['Projector', 'AC', 'Wi-Fi', 'Smart Board'],
    bestFor: 'Board Meetings, Administrative Meetings',
    contactDepartment: 'Directorate Secretariat',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60',
    color: 'from-blue-700 to-cyan-900'
  },
  {
    id: 'room-3',
    name: 'GTAC Conference Hall',
    building: 'Gandhi Technology Alumni Centre (GTAC)',
    category: 'Guest House Facility',
    floor: 'Ground Floor',
    capacity: 120,
    features: ['Projector', 'AC', 'Audio System', 'Wi-Fi', 'Microphone'],
    bestFor: 'Seminars, Workshops, Committee Meetings',
    contactDepartment: 'GTAC In-charge',
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&auto=format&fit=crop&q=60',
    color: 'from-indigo-700 to-purple-900'
  },
  {
    id: 'room-4',
    name: 'GTAC Waiting Room',
    building: 'Gandhi Technology Alumni Centre (GTAC)',
    category: 'Guest House Facility',
    floor: 'Ground Floor',
    capacity: 15,
    features: ['AC', 'Wi-Fi'],
    bestFor: 'Small Meetings, Guest Discussions',
    contactDepartment: 'GTAC Reception desk',
    image: 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?w=800&auto=format&fit=crop&q=60',
    color: 'from-teal-700 to-slate-900'
  },
  {
    id: 'room-5',
    name: 'Department Committee Room – Mechanical Engineering',
    building: 'Mechanical Engineering Department',
    category: 'Department Committee Room',
    floor: 'Ground Floor',
    capacity: 25,
    features: ['Whiteboard', 'Projector', 'AC', 'Wi-Fi'],
    bestFor: 'Faculty Meetings, Viva',
    contactDepartment: 'Mechanical Engg Office',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=60',
    color: 'from-orange-700 to-red-900'
  },
  {
    id: 'room-6',
    name: 'Department Committee Room – Civil Engineering',
    building: 'Civil Engineering Department',
    category: 'Department Committee Room',
    floor: '1st Floor',
    capacity: 25,
    features: ['Projector', 'AC', 'Whiteboard'],
    bestFor: 'Department Meetings',
    contactDepartment: 'Civil Engg Office',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=60',
    color: 'from-amber-600 to-stone-900'
  },
  {
    id: 'room-7',
    name: 'Department Committee Room – Chemical Engineering',
    building: 'Chemical Engineering Department',
    category: 'Department Committee Room',
    floor: 'Ground Floor',
    capacity: 25,
    features: ['Whiteboard', 'AC', 'Projector', 'Wi-Fi'],
    bestFor: 'Academic Meetings',
    contactDepartment: 'Chemical Engg Office',
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&auto=format&fit=crop&q=60',
    color: 'from-emerald-700 to-teal-950'
  },
  {
    id: 'room-8',
    name: 'Department Committee Room – Electrical Engineering',
    building: 'Electrical Engineering Department',
    category: 'Department Committee Room',
    floor: '1st Floor',
    capacity: 25,
    features: ['Smart Display', 'AC', 'Whiteboard', 'Wi-Fi'],
    bestFor: 'Faculty Meetings',
    contactDepartment: 'Electrical Engg Office',
    image: 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?w=800&auto=format&fit=crop&q=60',
    color: 'from-violet-700 to-fuchsia-950'
  },
  {
    id: 'room-9',
    name: 'Department Committee Room – Computer Science & Engineering',
    building: 'Computer Science & Engineering Department',
    category: 'Department Committee Room',
    floor: '2nd Floor',
    capacity: 25,
    features: ['Smart Display', 'Wi-Fi', 'AC', 'Whiteboard', 'Video Conferencing'],
    bestFor: 'Project Reviews, Faculty Meetings',
    contactDepartment: 'CSE Office',
    image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=60',
    color: 'from-indigo-600 to-slate-900'
  },
  {
    id: 'room-10',
    name: 'Department Committee Room – Electronics Engineering',
    building: 'Electronics Engineering Department',
    category: 'Department Committee Room',
    floor: '1st Floor',
    capacity: 25,
    features: ['Projector', 'AC', 'Whiteboard', 'Wi-Fi'],
    bestFor: 'Meetings, Seminars',
    contactDepartment: 'Electronics Engg Office',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=60',
    color: 'from-rose-600 to-indigo-950'
  },
  {
    id: 'room-11',
    name: 'Department Committee Room – Mining Engineering',
    building: 'Mining Engineering Department',
    category: 'Department Committee Room',
    floor: 'Ground Floor',
    capacity: 25,
    features: ['Whiteboard', 'AC', 'Projector'],
    bestFor: 'Faculty Meetings',
    contactDepartment: 'Mining Engg Office',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60',
    color: 'from-yellow-700 to-amber-950'
  },
  {
    id: 'room-12',
    name: 'Department Committee Room – Ceramic Engineering',
    building: 'Ceramic Engineering Department',
    category: 'Department Committee Room',
    floor: 'Ground Floor',
    capacity: 25,
    features: ['Projector', 'AC', 'Whiteboard'],
    bestFor: 'Academic Discussions',
    contactDepartment: 'Ceramic Engg Office',
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&auto=format&fit=crop&q=60',
    color: 'from-sky-700 to-slate-900'
  },
  {
    id: 'room-13',
    name: 'Department Committee Room – Metallurgical Engineering',
    building: 'Metallurgical Engineering Department',
    category: 'Department Committee Room',
    floor: '1st Floor',
    capacity: 25,
    features: ['Projector', 'AC', 'Whiteboard'],
    bestFor: 'Committee Meetings',
    contactDepartment: 'Metallurgy Office',
    image: 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?w=800&auto=format&fit=crop&q=60',
    color: 'from-orange-800 to-stone-900'
  },
  {
    id: 'room-14',
    name: 'Department Committee Room – Biochemical Engineering',
    building: 'Biochemical Engineering Department',
    category: 'Department Committee Room',
    floor: 'Ground Floor',
    capacity: 25,
    features: ['Smart Display', 'AC', 'Whiteboard'],
    bestFor: 'Research Meetings',
    contactDepartment: 'Biochemical Office',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=60',
    color: 'from-teal-600 to-emerald-950'
  },
  {
    id: 'room-15',
    name: 'Smart Classroom – Mechanical',
    building: 'Mechanical Engineering Department',
    category: 'Smart Classroom',
    floor: '1st Floor',
    capacity: 60,
    features: ['Smart Board', 'Video Conferencing', 'AC', 'Wi-Fi', 'Recording Facility'],
    bestFor: 'Hybrid Classes, Thesis Defense',
    contactDepartment: 'Academic Dean Office',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=60',
    color: 'from-blue-600 to-indigo-900'
  },
  {
    id: 'room-16',
    name: 'Smart Classroom – Computer Science',
    building: 'Computer Science & Engineering Department',
    category: 'Smart Classroom',
    floor: '1st Floor',
    capacity: 60,
    features: ['Smart Board', 'Wi-Fi', 'AC', 'Video Conferencing', 'Recording Facility'],
    bestFor: 'Online Meetings, Presentations',
    contactDepartment: 'CSE Dept Office',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=60',
    color: 'from-indigo-700 to-purple-950'
  },
  {
    id: 'room-17',
    name: 'Smart Classroom – Electrical',
    building: 'Electrical Engineering Department',
    category: 'Smart Classroom',
    floor: '2nd Floor',
    capacity: 60,
    features: ['Projector', 'Video Conferencing', 'AC', 'Wi-Fi', 'Recording Facility'],
    bestFor: 'Hybrid Lectures',
    contactDepartment: 'Electrical Office',
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&auto=format&fit=crop&q=60',
    color: 'from-teal-600 to-slate-900'
  },
  {
    id: 'room-18',
    name: 'TPC Interview Room 1',
    building: 'Training & Placement Cell',
    category: 'Placement Facility',
    floor: 'Ground Floor',
    capacity: 8,
    features: ['AC', 'Wi-Fi'],
    bestFor: 'Interviews',
    contactDepartment: 'TPC Coordinator',
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&auto=format&fit=crop&q=60',
    color: 'from-emerald-600 to-teal-900'
  },
  {
    id: 'room-19',
    name: 'TPC Interview Room 2',
    building: 'Training & Placement Cell',
    category: 'Placement Facility',
    floor: 'Ground Floor',
    capacity: 8,
    features: ['AC', 'Wi-Fi'],
    bestFor: 'Technical Interviews',
    contactDepartment: 'TPC Representative',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60',
    color: 'from-indigo-600 to-cyan-950'
  },
  {
    id: 'room-20',
    name: 'TPC Group Discussion Room 1',
    building: 'Training & Placement Cell',
    category: 'Placement Facility',
    floor: '1st Floor',
    capacity: 15,
    features: ['Whiteboard', 'AC', 'Wi-Fi'],
    bestFor: 'Group Discussions',
    contactDepartment: 'TPC Coordinator',
    image: 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?w=800&auto=format&fit=crop&q=60',
    color: 'from-violet-600 to-slate-950'
  },
  {
    id: 'room-21',
    name: 'TPC Group Discussion Room 2',
    building: 'Training & Placement Cell',
    category: 'Placement Facility',
    floor: '1st Floor',
    capacity: 15,
    features: ['Smart Display', 'AC', 'Wi-Fi'],
    bestFor: 'Pre-placement Activities',
    contactDepartment: 'TPC Liaison Officer',
    image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=60',
    color: 'from-fuchsia-700 to-indigo-950'
  }
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
    id: 'user-bandana',
    email: 'bandanapathak12@gmail.com',
    password: 'password123',
    name: 'Bandana Pathak (Admin)',
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
  if (!data.rooms || data.rooms.length < INITIAL_ROOMS.length) {
    data.rooms = INITIAL_ROOMS;
    writeLocalDB(data);
  }
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

// Firestore Database Interface Utilities
async function getFirestoreCollection(collectionName: string): Promise<any[]> {
  if (!isFirebaseActive || !firestoreDb) return [];
  try {
    const colRef = collection(firestoreDb, collectionName);
    const snapshot = await getDocs(colRef);
    const docs: any[] = [];
    snapshot.forEach((d) => {
      docs.push({ ...d.data(), id: d.id });
    });
    return docs;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, collectionName);
  }
}

async function setFirestoreDoc(collectionName: string, docId: string, data: any): Promise<boolean> {
  if (!isFirebaseActive || !firestoreDb) return false;
  try {
    const docRef = doc(firestoreDb, collectionName, docId);
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${docId}`);
  }
}

async function deleteFirestoreDoc(collectionName: string, docId: string): Promise<boolean> {
  if (!isFirebaseActive || !firestoreDb) return false;
  try {
    const docRef = doc(firestoreDb, collectionName, docId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${docId}`);
  }
}

async function seedFirestoreIfNeeded() {
  if (!isFirebaseActive || !firestoreDb) return;
  try {
    // 1. Check and seed Rooms
    const rooms = await getFirestoreCollection('rooms');
    if (rooms.length < INITIAL_ROOMS.length) {
      console.log('🌱 Seeding/syncing Firestore with modern Initial Rooms...');
      for (const room of INITIAL_ROOMS) {
        await setFirestoreDoc('rooms', room.id, room);
      }
    }

    // 2. Check and seed Users
    const users = await getFirestoreCollection('users');
    if (users.length === 0) {
      console.log('🌱 Seeding Firestore with Initial Users...');
      for (const user of INITIAL_USERS) {
        await setFirestoreDoc('users', user.id, user);
      }
    }

    // 3. Check and seed Notifications
    const notifications = await getFirestoreCollection('notifications');
    if (notifications.length === 0) {
      console.log('🌱 Seeding Firestore with Initial Notifications...');
      const firstNotif = {
        id: 'notif-1',
        title: 'IIT BHU Space Scheduler Activated',
        message: 'The smart room booking database engine is online and persistent in Firebase Cloud Firestore.',
        type: 'info',
        read: false,
        created_at: new Date().toISOString()
      };
      await setFirestoreDoc('notifications', firstNotif.id, firstNotif);
    }
    console.log('✅ Firestore seeding and verification complete!');
  } catch (err) {
    console.error('⚠️ Seeding Firestore failed:', err);
  }
}

// Trigger Seeding asynchronously
if (isFirebaseActive) {
  seedFirestoreIfNeeded();
}

// Dual Fallback User Managers
async function findUserByEmail(email: string) {
  if (isFirebaseActive && firestoreDb) {
    try {
      const colRef = collection(firestoreDb, 'users');
      const q = query(colRef, where('email', '==', email.toLowerCase()));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        return { id: d.id, ...d.data() };
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users');
    }
  }
  const db = readLocalDB();
  return db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

async function createUser(user: any) {
  if (isFirebaseActive && firestoreDb) {
    await setFirestoreDoc('users', user.id, user);
    return user;
  }
  const db = readLocalDB();
  db.users.push(user);
  writeLocalDB(db);
  return user;
}

async function updateUserRole(userId: string, role: string) {
  if (isFirebaseActive && firestoreDb) {
    try {
      const docRef = doc(firestoreDb, 'users', userId);
      await updateDoc(docRef, { role });
      const updatedDoc = await getDoc(docRef);
      if (updatedDoc.exists()) {
        return { id: updatedDoc.id, ...updatedDoc.data() };
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  }
  const db = readLocalDB();
  const idx = db.users.findIndex((u: any) => u.id === userId);
  if (idx !== -1) {
    db.users[idx].role = role;
    writeLocalDB(db);
    return db.users[idx];
  }
  return null;
}

// Dual Fallback Room Managers
async function createRoom(room: any) {
  if (isFirebaseActive && firestoreDb) {
    await setFirestoreDoc('rooms', room.id, room);
    return room;
  }
  const db = readLocalDB();
  db.rooms.push(room);
  writeLocalDB(db);
  return room;
}

async function updateRoom(roomId: string, roomData: any) {
  if (isFirebaseActive && firestoreDb) {
    try {
      const docRef = doc(firestoreDb, 'rooms', roomId);
      await updateDoc(docRef, roomData);
      const updatedDoc = await getDoc(docRef);
      if (updatedDoc.exists()) {
        return { id: updatedDoc.id, ...updatedDoc.data() };
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
    }
  }
  const db = readLocalDB();
  const idx = db.rooms.findIndex((r: any) => r.id === roomId);
  if (idx !== -1) {
    db.rooms[idx] = { ...db.rooms[idx], ...roomData };
    writeLocalDB(db);
    return db.rooms[idx];
  }
  return null;
}

async function deleteRoom(roomId: string) {
  if (isFirebaseActive && firestoreDb) {
    await deleteFirestoreDoc('rooms', roomId);
    try {
      const colRef = collection(firestoreDb, 'bookings');
      const q = query(colRef, where('room_id', '==', roomId));
      const snapshot = await getDocs(q);
      for (const d of snapshot.docs) {
        await deleteDoc(doc(firestoreDb, 'bookings', d.id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'bookings');
    }
    return true;
  }
  const db = readLocalDB();
  db.rooms = db.rooms.filter((r: any) => r.id !== roomId);
  db.bookings = db.bookings.filter((b: any) => b.room_id !== roomId);
  writeLocalDB(db);
  return true;
}

// Push system notification with live fallback
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

    if (isFirebaseActive && firestoreDb) {
      await setFirestoreDoc('notifications', newNotif.id, newNotif);
    }

    if (supabase) {
      try {
        await supabase.from('notifications').insert([newNotif]);
      } catch (err) {
        console.error('Supabase write error for notification:', err);
      }
    }

    const db = readLocalDB();
    db.notifications.unshift(newNotif);
    if (db.notifications.length > 50) {
      db.notifications = db.notifications.slice(0, 50);
    }
    writeLocalDB(db);
  } catch (err) {
    console.error('Error writing notification:', err);
  }
}

async function getNotifications() {
  if (isFirebaseActive && firestoreDb) {
    const notifications = await getFirestoreCollection('notifications');
    return notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);
  }
  if (supabase) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) return data;
  }
  return readLocalDB().notifications || [];
}

async function markAllNotificationsAsRead() {
  if (isFirebaseActive && firestoreDb) {
    try {
      const colRef = collection(firestoreDb, 'notifications');
      const q = query(colRef, where('read', '==', false));
      const snapshot = await getDocs(q);
      for (const d of snapshot.docs) {
        await updateDoc(doc(firestoreDb, 'notifications', d.id), { read: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'notifications');
    }
  }
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
  let rooms: any[] = [];
  if (isFirebaseActive && firestoreDb) {
    rooms = await getFirestoreCollection('rooms');
  } else if (supabase) {
    const { data, error } = await supabase.from('rooms').select('*');
    if (!error && data) rooms = data;
  } else {
    rooms = readLocalDB().rooms;
  }

  // Deduplicate rooms by id to avoid duplicate key issues
  const uniqueRooms: any[] = [];
  const seenIds = new Set<string>();
  for (const r of rooms) {
    if (r && r.id && !seenIds.has(r.id)) {
      seenIds.add(r.id);
      uniqueRooms.push(r);
    }
  }
  return uniqueRooms;
}

async function getBookings() {
  if (isFirebaseActive && firestoreDb) {
    return await getFirestoreCollection('bookings');
  }
  if (supabase) {
    const { data, error } = await supabase.from('bookings').select('*');
    if (!error && data) return data;
  }
  return readLocalDB().bookings;
}

async function addBooking(booking: any) {
  const bookingId = booking.id || 'book-' + Math.random().toString(36).substring(2, 9);
  const enrichedBooking = { ...booking, id: bookingId };
  if (isFirebaseActive && firestoreDb) {
    await setFirestoreDoc('bookings', bookingId, enrichedBooking);
    return enrichedBooking;
  }
  if (supabase) {
    const { data, error } = await supabase.from('bookings').insert([enrichedBooking]).select();
    if (!error && data) return data[0];
  }
  const db = readLocalDB();
  db.bookings.push(enrichedBooking);
  writeLocalDB(db);
  return enrichedBooking;
}

async function deleteBookingById(id: string) {
  if (isFirebaseActive && firestoreDb) {
    return await deleteFirestoreDoc('bookings', id);
  }
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
  if (isFirebaseActive && firestoreDb) {
    const users = await getFirestoreCollection('users');
    if (users.length > 0) return users;
  }
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
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid academic or professional email address' });
  }

  const exists = await findUserByEmail(email);
  if (exists) {
    return res.status(400).json({ error: 'User already exists with this email address' });
  }

  // Hash password cleanly using bcrypt
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = {
    id: 'user-' + Math.random().toString(36).substring(2, 9),
    email: email.toLowerCase(),
    password: hashedPassword,
    name,
    role: role || 'student',
    created_at: new Date().toISOString()
  };

  await createUser(newUser);

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
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  let user = await findUserByEmail(email);

  if (user) {
    // If user exists, cleanly verify password with bcrypt / plain-text fallback
    let isPasswordCorrect = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isPasswordCorrect = await bcrypt.compare(password, user.password);
    } else {
      isPasswordCorrect = user.password === password;
    }

    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Incorrect password. Please verify credentials.' });
    }
  } else {
    // If user doesn't exist, auto-create them to make testing with any email seamless and frictionless,
    // but cleanly hash their password so all subsequent log-ins are fully secured!
    const formattedName = email.split('@')[0]
      .split('.')
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'password123', salt);

    user = {
      id: `user-${Date.now()}`,
      email: email.toLowerCase(),
      password: hashedPassword,
      name: formattedName || 'Academic Member',
      role: 'student', // Default role; admins can change this
      created_at: new Date().toISOString()
    };
    await createUser(user);
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

// Google Auth Login & Sync to Firestore
app.post('/api/auth/google-login', async (req, res) => {
  const { email, name, uid } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required from Google Auth' });
  }

  try {
    let user = await findUserByEmail(email);

    if (!user) {
      // Determine default role: If email includes faculty-like keywords, make them faculty, else student.
      let role = 'student';
      const lowEmail = email.toLowerCase();
      if (
        lowEmail.includes('faculty') || 
        lowEmail.includes('prof') || 
        lowEmail.includes('staff') || 
        lowEmail.includes('admin') ||
        lowEmail === 'pathaksrishti2208@gmail.com'
      ) {
        role = 'faculty';
      }

      user = {
        id: `google-${uid || Math.random().toString(36).substring(2, 9)}`,
        email: email.toLowerCase(),
        password: 'google-authenticated-account',
        name: name || email.split('@')[0],
        role: role,
        created_at: new Date().toISOString()
      };
      await createUser(user);
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
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Google login failed on backend' });
  }
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

  const newRoom = {
    id: 'room-' + Math.random().toString(36).substring(2, 9),
    name,
    capacity: Number(capacity),
    features: Array.isArray(features) ? features : [features],
    image: image || 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?w=800&auto=format&fit=crop&q=60',
    color: color || 'from-slate-700 to-slate-900',
  };

  const saved = await createRoom(newRoom);
  res.status(201).json(saved);
});

// Bulk Add Rooms (Admin Only)
app.post('/api/rooms/bulk', authenticateToken, requireAdmin, async (req, res) => {
  const { rooms } = req.body;
  if (!Array.isArray(rooms) || rooms.length === 0) {
    return res.status(400).json({ error: 'An array of rooms is required.' });
  }

  const createdRooms = [];

  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i];
    if (!r.name) {
      return res.status(400).json({ error: `Room space at index ${i} requires a valid display name.` });
    }
    const capNum = Number(r.capacity);
    if (isNaN(capNum) || capNum <= 0) {
      return res.status(400).json({ error: `Room "${r.name}" has an invalid capacity list.` });
    }

    let featuresList: string[] = [];
    if (Array.isArray(r.features)) {
      featuresList = r.features;
    } else if (typeof r.features === 'string') {
      featuresList = r.features.split(',').map((f: string) => f.trim()).filter((f: string) => f.length > 0);
    }

    const newRoom = {
      id: 'room-' + Math.random().toString(36).substring(2, 9),
      name: String(r.name).trim(),
      capacity: capNum,
      features: featuresList,
      image: r.image?.trim() || 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?w=800&auto=format&fit=crop&q=60',
      color: r.color?.trim() || 'from-slate-700 to-slate-900',
    };

    if (supabase) {
      try {
        await supabase.from('rooms').insert([newRoom]);
      } catch (err) {
        console.warn('Primary Supabase bulk room insert failure:', err);
      }
    }

    await createRoom(newRoom);
    createdRooms.push(newRoom);
  }

  await pushNotification(
    'Central Directory bulk import complete',
    `Successfully bulk-imported ${createdRooms.length} room spaces in Central Core Directory.`,
    'success'
  );

  res.status(201).json({ success: true, count: createdRooms.length, rooms: createdRooms });
});

// Edit Room (Admin Only)
app.put('/api/rooms/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, capacity, features, image, color } = req.body;

  const roomData: any = {};
  if (name) roomData.name = name;
  if (capacity !== undefined) roomData.capacity = Number(capacity);
  if (features) roomData.features = Array.isArray(features) ? features : [features];
  if (image) roomData.image = image;
  if (color) roomData.color = color;

  const updated = await updateRoom(id, roomData);
  if (!updated) {
    return res.status(404).json({ error: 'Room space not found' });
  }

  res.json(updated);
});

// Delete Room (Admin Only)
app.delete('/api/rooms/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const success = await deleteRoom(id);

  if (success) {
    res.json({ message: 'Room and its associated reservations purged successfully' });
  } else {
    res.status(404).json({ error: 'Room space not found' });
  }
});

// ==========================================
// ROOM BOOKINGS APIs
// ==========================================

/**
 * Server-side validation function to check for overlapping bookings before
 * allowing a new reservation to be created in the bookings database.
 * 
 * @param roomId - ID of the room being reserved
 * @param startTime - Requested reservation starting ISO timestamp
 * @param endTime - Requested reservation ending ISO timestamp
 * @param bookingsList - List of all existing bookings in database
 * @param excludeBookingId - Optional ID of booking to exclude (useful during edits)
 * @returns Array of any conflicting bookings found
 */
export function checkOverlappingBookings(
  roomId: string,
  startTime: string,
  endTime: string,
  bookingsList: any[],
  excludeBookingId?: string
): any[] {
  return bookingsList.filter((b: any) => {
    if (excludeBookingId && b.id === excludeBookingId) return false;
    return (
      b.room_id === roomId &&
      b.start_time < endTime &&
      b.end_time > startTime
    );
  });
}

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
  const { roomId, roomName, summary, agenda, startTime, endTime, attendeeEmail, facultyId, bypassConflict } = req.body;

  if (!roomId || !roomName || !startTime || !endTime || !summary) {
    return res.status(400).json({ error: 'Room ID, room name, start, end, and summary are required' });
  }

  // Acquire atomic lock for this specific room to enforce sequential reservation checking and avoid race condition double-bookings
  const lock = getRoomLock(roomId);
  const release = await lock.acquire();

  try {
    const bookingsList = await getBookings();
    const roomsList = await getRooms();

    // Conflict Check overlapping slots using our dedicated server-side validation function
    const conflictingBookings = checkOverlappingBookings(roomId, startTime, endTime, bookingsList);

    if (conflictingBookings.length > 0 && !bypassConflict) {
      const conflict = conflictingBookings[0];
      
      // Calculate recommend alternative rooms (Sisters Rooms) that are vacant during this exact timeframe:
      const sisterRooms = roomsList.filter((room: any) => {
        if (room.id === roomId) return false;
        // Check if this alternate room has any bookings during requested timeframe using our validation helper
        const hasConflict = checkOverlappingBookings(room.id, startTime, endTime, bookingsList).length > 0;
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
  try {
    const usersList = await getUsers();
    const cleanUsers = usersList.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      created_at: u.created_at
    }));
    res.json(cleanUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Role
app.put('/api/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !['admin', 'faculty', 'student'].includes(role)) {
    return res.status(400).json({ error: 'Invalid or missing role parameter' });
  }

  const updatedUser = await updateUserRole(id, role);
  if (!updatedUser) {
    return res.status(404).json({ error: 'User account not found' });
  }

  res.json({
    message: `Role assigned successfully for user ${updatedUser.name}`,
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role
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
    const users = await getUsers();

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
      admin: users.filter((u: any) => u.role === 'admin').length,
      faculty: users.filter((u: any) => u.role === 'faculty').length,
      student: users.filter((u: any) => u.role === 'student').length,
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
      totalUsers: users.length,
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
    const list = await getNotifications();
    res.json(list || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/read', authenticateToken, async (req, res) => {
  try {
    await markAllNotificationsAsRead();
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
// GEMINI GOOGLE MAPS GROUNDING API
// ==========================================
app.post('/api/gemini/maps', authenticateToken, async (req, res) => {
  const { prompt, latitude, longitude } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Search prompt is required.' });
  }

  // IIT BHU, Varanasi, India coordinates as defaults
  const lat = latitude !== undefined && latitude !== null ? Number(latitude) : 25.2635;
  const lng = longitude !== undefined && longitude !== null ? Number(longitude) : 82.9891;

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

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Query about surroundings or logistics: "${prompt}" relative to current academic hub. Provide practical guidance or options.`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: lat,
                longitude: lng
              }
            }
          }
        },
      });

      const text = response.text || 'No coordinates search could be generated by Gemini.';
      
      // Parse grounding chunks
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources: any[] = [];
      const seenUris = new Set<string>();

      for (const chunk of groundingChunks) {
        if (chunk?.maps) {
          const uri = chunk.maps.uri;
          if (uri && !seenUris.has(uri)) {
            seenUris.add(uri);
            sources.push({
              type: 'maps',
              title: chunk.maps.title || 'Google Maps Location',
              uri: uri,
              snippets: chunk.maps.placeAnswerSources?.reviewSnippets?.map((s: any) => s.text) || []
            });
          }
        } else if (chunk?.web) {
          const uri = chunk.web.uri;
          if (uri && !seenUris.has(uri)) {
            seenUris.add(uri);
            sources.push({
              type: 'web',
              title: chunk.web.title || 'Web Source',
              uri: uri,
              snippets: []
            });
          }
        }
      }

      return res.json({ text, sources, isMock: false });
    } catch (gemError: any) {
      console.warn('Gemini Maps grounding query failed, fallback to local database recommendations:', gemError);
    }
  }

  // Highly-contextual Varanasi/IIT BHU Surroundings Fallback
  let matchedSources: any[] = [];
  let responseText = '';

  const queryLower = prompt.toLowerCase();
  if (queryLower.includes('hotel') || queryLower.includes('stay') || queryLower.includes('accommodation')) {
    responseText = `### 🏨 Recommended Accommodations near IIT BHU, Varanasi

Here are high-quality lodging choices for visiting scholars, parents, or conference attendees near the IIT BHU campus:

1. **IIT BHU Guest House (Inside Campus)**: The primary option for academic delegates. Offers clean, quiet executive rooms with central dining facilities.
2. **The Gateway Hotel Ganges Varanasi (Nadesar)**: Premium luxury heritage stay, about 8 km from campus. Preferred for executive guests.
3. **Hotel Temple on Ganges (Assi Ghat)**: Scenic and boutique budget riverside stay, within 2 km of the campus. Highly convenient for exploring Varanasi's culture.
4. **Hostels & Homestays near Lanka**: Multiple budget-friendly guest rooms and student-friendly PG accommodations are situated directly outside the Lanka Gate.`;

    matchedSources = [
      {
        type: 'maps',
        title: 'IIT BHU Guest House, Varanasi',
        uri: 'https://maps.google.com/?q=IIT+BHU+Guest+House+Varanasi',
        snippets: ['Excellent stay inside campus', 'Peaceful green environment, strictly for academic guests']
      },
      {
        type: 'maps',
        title: 'Assi Ghat, Varanasi',
        uri: 'https://maps.google.com/?q=Assi+Ghat+Varanasi',
        snippets: ['Just 1.8km from IIT BHU main gate', 'Morning Ganga Aarti is highly recommended']
      },
      {
        type: 'maps',
        title: 'Lanka Market Crossing, Varanasi',
        uri: 'https://maps.google.com/?q=Lanka+Crossing+Varanasi',
        snippets: ['The primary food and shopping street right outside IIT BHU gate']
      }
    ];
  } else if (queryLower.includes('food') || queryLower.includes('restaurant') || queryLower.includes('cafe') || queryLower.includes('eat') || queryLower.includes('dinner')) {
    responseText = `### 🍽️ Culinary Guide & Dining around IIT BHU

Varanasi is famous for its culinary heritage. Here are top places to eat or order catering from, located in close proximity to the campus:

1. **IIT BHU Cafetaria / Limbdi Corner**: The vibrant hub inside the campus for quick tea, samosas, and South Indian snacks.
2. **Keshari Restaurant (Lanka)**: Extremely popular for authentic North Indian thalis and pure vegetarian delicacies, just outside Lanka Gate.
3. **Pizzeria Vaatika Cafe (Assi Ghat)**: Iconic outdoor cafe overlooking the Ganges, famous for woodfired apple pies and pizzas. Approx. 2km away.
4. **Roma’s Cafe Diner (Lanka)**: A premium multi-cuisine student-favorite spot for Continental, Italian, and shakes.`;

    matchedSources = [
      {
        type: 'maps',
        title: 'Limbdi Corner, IIT BHU',
        uri: 'https://maps.google.com/?q=Limbdi+Corner+IIT+BHU',
        snippets: ['Campus core snack hub', 'Samosa, tea, cold coffee and student groups']
      },
      {
        type: 'maps',
        title: 'Pizzeria Vaatika Cafe, Assi Ghat',
        uri: 'https://maps.google.com/?q=Pizzeria+Vaatika+Cafe+Varanasi',
        snippets: ['Woodfired apple pie is legendary', 'Beautiful sunset river view']
      }
    ];
  } else {
    responseText = `### 📍 Campus Surroundings & Varanasi Transit Hubs

Varanasi (Kashi) is a historic spiritual and academic center. Here are critical transport and essential locations relative to **IIT BHU, Varanasi**:

1. **Varanasi Junction Railway Station (BSB)**: The primary railway terminal, located ~8 km north of the campus (approx. 30-40 mins by auto-rickshaw).
2. **Lal Bahadur Shastri International Airport (VNS - Babatpur)**: Located ~30 km from the campus (approx. 1 hour by taxi via the bypass highway).
3. **Assi Ghat**: The nearest major ghat to the campus (~1.8 km), famous for the "Subah-e-Banaras" morning spiritual routine and boat rides.
4. **Shri Vishwanath Mandir (VT)**: The famous marble temple located right in the center of the Banaras Hindu University (BHU) campus, renowned for its architectural majesty.`;

    matchedSources = [
      {
        type: 'maps',
        title: 'Shri Vishwanath Mandir (New VT), BHU',
        uri: 'https://maps.google.com/?q=New+Vishwanath+Temple+BHU',
        snippets: ['Tallest temple spire, gorgeous white marble', 'Located in the heart of the university campus']
      },
      {
        type: 'maps',
        title: 'Varanasi Junction Railway Station (BSB)',
        uri: 'https://maps.google.com/?q=Varanasi+Junction+Railway+Station',
        snippets: ['Major railway connectivity across India']
      }
    ];
  }

  return res.json({
    text: responseText + '\n\n*Note: Simulated search grounding applied. Configure a live GEMINI_API_KEY in Settings to enable real-time live Google Maps search results with location-specific coordinates.*',
    sources: matchedSources,
    isMock: true
  });
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
