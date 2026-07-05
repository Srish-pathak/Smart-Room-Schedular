import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { firestoreDb, isFirebaseActive, supabase, handleFirestoreError, OperationType } from '../config/firebase.js';
import { readLocalDB, writeLocalDB } from './localDb.js';
import { getFirestoreCollection, setFirestoreDoc } from './firestoreBase.js';
import { Notification } from '../models/index.js';

export async function pushNotification(title: string, message: string, type: 'info' | 'success' | 'warn'): Promise<Notification> {
  const newNotif: Notification = {
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
    } catch {
      // safe ignore
    }
  }

  const db = readLocalDB();
  db.notifications = db.notifications || [];
  db.notifications.unshift(newNotif);
  if (db.notifications.length > 50) {
    db.notifications = db.notifications.slice(0, 50);
  }
  writeLocalDB(db);
  return newNotif;
}

export async function getNotifications(): Promise<Notification[]> {
  if (isFirebaseActive && firestoreDb) {
    const notifications = await getFirestoreCollection('notifications');
    return notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50) as Notification[];
  }
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) return data as Notification[];
    } catch {
      // fallback below
    }
  }
  return (readLocalDB().notifications || []) as Notification[];
}

export async function markAllNotificationsAsRead(): Promise<void> {
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
    } catch {
      // fallback below
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
