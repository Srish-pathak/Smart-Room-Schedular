import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import defaultConfig from '../../firebase-applet-config.json';

// Support environment variables with default fallback
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultConfig.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
};

// Ensure initializeApp is called only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const dbId = import.meta.env.VITE_FIRESTORE_DATABASE_ID || (defaultConfig as any).firestoreDatabaseId;

// In iframe environments, use long-polling; in standard production browser use high-speed streaming
const isIframe = typeof window !== 'undefined' && window.self !== window.top;
export const db = initializeFirestore(
  app,
  isIframe
    ? ({ experimentalForceLongPolling: true, useFetchStreams: false } as any)
    : {},
  dbId || undefined
);

export const auth = getAuth(app);
