import fs from 'fs';
import path from 'path';
import { INITIAL_ROOMS, INITIAL_USERS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

const FALLBACK_DB_PATH = path.join(process.cwd(), 'fallback_postgres_db.json');

export function readLocalDB() {
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
      ] as any[],
      audit_logs: [] as any[]
    };
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2));
    return data;
  }
  try {
    const content = fs.readFileSync(FALLBACK_DB_PATH, 'utf-8');
    data = JSON.parse(content);
  } catch {
    data = { rooms: INITIAL_ROOMS, users: INITIAL_USERS, bookings: [], notifications: [], audit_logs: [] };
  }
  
  // Guarantee arrays and run self-healing
  if (!data.rooms || data.rooms.length < INITIAL_ROOMS.length) {
    data.rooms = INITIAL_ROOMS;
    writeLocalDB(data);
  } else {
    let localHealed = false;
    for (let i = 0; i < data.rooms.length; i++) {
      const initialMatch = INITIAL_ROOMS.find(r => r.id === data.rooms[i].id);
      if (initialMatch) {
        const hasBrokenImage = !data.rooms[i].image || data.rooms[i].image.trim() === '' || data.rooms[i].image.includes('1517502884422-41eaaced0168');
        if (hasBrokenImage || data.rooms[i].id === 'room-13' || data.rooms[i].id === 'room-1') {
          data.rooms[i].image = initialMatch.image;
          localHealed = true;
        }
      }
      if (data.rooms[i].buffer_time === undefined) {
        data.rooms[i].buffer_time = 15;
        localHealed = true;
      }
    }
    if (localHealed) {
      logger.info('🩺 DATABASE ENGINE: Healed missing or incorrect room images / buffer times in fallback database.');
      writeLocalDB(data);
    }
  }
  if (!data.users) data.users = INITIAL_USERS;
  if (!data.bookings) data.bookings = [];
  if (!data.audit_logs) data.audit_logs = [];
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

export function writeLocalDB(data: any) {
  fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2));
}
