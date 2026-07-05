import { collection } from 'firebase/firestore';
import { firestoreDb, isFirebaseActive, supabase } from '../config/firebase.js';
import { readLocalDB, writeLocalDB } from './localDb.js';
import { getFirestoreCollection, setFirestoreDoc } from './firestoreBase.js';
import { AuditLog } from '../models/index.js';

export async function createAuditLog(
  userId: string, 
  email: string, 
  action: string, 
  status: 'success' | 'failed', 
  details: string = ''
): Promise<AuditLog> {
  const log: AuditLog = {
    id: 'log-' + Math.random().toString(36).substring(2, 9),
    user_id: userId || 'anonymous',
    email: email || 'unknown',
    action: action,
    status: status,
    details: details,
    timestamp: new Date().toISOString()
  };
  
  if (isFirebaseActive && firestoreDb) {
    await setFirestoreDoc('audit_logs', log.id, log);
    return log;
  }
  
  if (supabase) {
    try {
      await supabase.from('audit_logs').insert([log]);
      return log;
    } catch {
      // safe fallback
    }
  }

  const db = readLocalDB();
  db.audit_logs = db.audit_logs || [];
  db.audit_logs.push(log);
  writeLocalDB(db);
  return log;
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  if (isFirebaseActive && firestoreDb) {
    return await getFirestoreCollection('audit_logs') as AuditLog[];
  }
  if (supabase) {
    try {
      const { data, error } = await supabase.from('audit_logs').select('*');
      if (!error && data) return data as AuditLog[];
    } catch {
      // safe ignore
    }
  }
  const db = readLocalDB();
  return (db.audit_logs || []) as AuditLog[];
}
