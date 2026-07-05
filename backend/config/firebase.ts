import { initializeApp } from 'firebase/app';
import { getFirestore, terminate } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import { env } from './environment.js';
import { logger } from '../utils/logger.js';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
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
  logger.error('Firestore Error: ', errInfo);
  throw new Error(JSON.stringify(errInfo));
}

let firebaseApp: any = null;
let firestoreDb: any = null;
let isFirebaseActive = false;

// Initialize Firebase if config exists
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
      
      let dbId = config.firestoreDatabaseId;
      if (!dbId) {
        try {
          const firebaseJsonPath = path.join(process.cwd(), 'firebase.json');
          if (fs.existsSync(firebaseJsonPath)) {
            const fbJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf-8'));
            if (fbJson && fbJson.firestore && fbJson.firestore.database) {
              dbId = fbJson.firestore.database;
              logger.info(`Auto-detected databaseId from firebase.json: ${dbId}`);
            }
          }
        } catch (fbJsonErr) {
          logger.warn('Could not check or parse firebase.json for custom databaseId:', fbJsonErr);
        }
      }

      if (dbId) {
        firestoreDb = getFirestore(firebaseApp, dbId);
      } else {
        firestoreDb = getFirestore(firebaseApp);
      }
      isFirebaseActive = true;
      logger.info('DATABASE ENGINE: Persistent Cloud Firestore Connected Successfully!');
    }
  }
} catch (err) {
  logger.error('Firebase Initialization Error, relying on local DB fallback:', err);
}

// Initialize Supabase if configured
let supabase: any = null;
const isSupabaseConfigured = env.SUPABASE_URL !== '' && env.SUPABASE_ANON_KEY !== '' && (() => {
  try {
    const parsed = new URL(env.SUPABASE_URL);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
})();

if (isSupabaseConfigured) {
  try {
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    logger.info('DATABASE ENGINE: Primary Cloud Supabase Connected Successfully.');
  } catch (err) {
    logger.error('Supabase connection error, sliding back to Local DB:', err);
  }
} else {
  logger.info('DATABASE ENGINE: Local-First Congruent PostgreSQL Fallback Actionable.');
}

export { firebaseApp, firestoreDb, isFirebaseActive, supabase };
export function setFirebaseInactive() {
  isFirebaseActive = false;
}
