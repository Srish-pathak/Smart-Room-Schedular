import { collection, query, limit, getDocs, terminate } from 'firebase/firestore';
import { firestoreDb, isFirebaseActive, setFirebaseInactive } from './firebase.js';
import { INITIAL_ROOMS, INITIAL_USERS } from '../constants/index.js';
import { getFirestoreCollection, setFirestoreDoc } from '../repositories/firestoreBase.js';
import { readLocalDB } from '../repositories/localDb.js';
import { logger } from '../utils/logger.js';

export async function seedFirestoreIfNeeded() {
  if (!isFirebaseActive || !firestoreDb) return;
  try {
    // 1. Check and seed Rooms
    const rooms = await getFirestoreCollection('rooms');
    if (rooms.length < INITIAL_ROOMS.length) {
      logger.info('🌱 Seeding/syncing Firestore with modern Initial Rooms...');
      for (const room of INITIAL_ROOMS) {
        await setFirestoreDoc('rooms', room.id, room);
      }
    } else {
      // Self-healing loop: Check if any Firestore room is missing an image
      logger.info('🩺 DATABASE ENGINE: Running self-healing check on Firestore rooms...');
      for (const fbRoom of rooms) {
        const initialMatch = INITIAL_ROOMS.find(r => r.id === fbRoom.id);
        if (initialMatch) {
          let needsUpdate = false;
          const updatedData: any = {};
          
          const hasBrokenImage = !fbRoom.image || fbRoom.image.trim() === '' || fbRoom.image.includes('1517502884422-41eaaced0168');
          
          if (hasBrokenImage) {
            updatedData.image = initialMatch.image;
            needsUpdate = true;
          }
          
          if ((fbRoom.id === 'room-13' || fbRoom.id === 'room-1') && fbRoom.image !== initialMatch.image) {
            updatedData.image = initialMatch.image;
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            logger.info(`🩺 DATABASE ENGINE: Healing image for room ${fbRoom.id} (${fbRoom.name})`);
            await setFirestoreDoc('rooms', fbRoom.id, { ...fbRoom, ...updatedData });
          }
        }
      }
    }

    // 2. Check and seed Users
    const users = await getFirestoreCollection('users');
    if (users.length === 0) {
      logger.info('🌱 Seeding Firestore with Initial Users...');
      for (const user of INITIAL_USERS) {
        await setFirestoreDoc('users', user.id, user);
      }
    }

    // 3. Check and seed Notifications
    const notifications = await getFirestoreCollection('notifications');
    if (notifications.length === 0) {
      logger.info('🌱 Seeding Firestore with Initial Notifications...');
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
    logger.info('✅ Firestore seeding and verification complete!');
  } catch (err) {
    logger.error('⚠️ Seeding Firestore failed:', err);
  }
}

export async function validateAndSeedFirebase() {
  if (!isFirebaseActive || !firestoreDb) return;
  try {
    logger.info('🔍 Validating Cloud Firestore connection...');
    const testCol = collection(firestoreDb, 'rooms');
    const q = query(testCol, limit(1));
    await getDocs(q);
    
    logger.info('✅ DATABASE ENGINE: Persistent Cloud Firestore validated successfully!');
    
    await seedFirestoreIfNeeded();
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    logger.warn('⚠️ Firebase is configured in the config file, but Firestore is either not provisioned or not enabled in your Firebase console.');
    logger.warn(`Firestore Check Error: ${errMsg}`);
    logger.warn('🔄 DATABASE ENGINE: Disabling active Firebase calls and cleanly falling back to Supabase/PostgreSQL Local Engine.');
    setFirebaseInactive();
    try {
      if (firestoreDb) {
        await terminate(firestoreDb);
        logger.info('🛑 DATABASE ENGINE: Terminated failed client-side Firestore connection cleanly.');
      }
    } catch (termErr) {
      logger.warn('⚠️ Could not cleanly terminate failed Firestore connection:', termErr);
    }
  }
}

export function initializeDatabase() {
  // Trigger Seeding and robust connection validation asynchronously
  validateAndSeedFirebase();
  // Force self-healing of fallback local database at server startup
  readLocalDB();
}
