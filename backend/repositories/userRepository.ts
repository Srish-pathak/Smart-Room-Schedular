import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { firestoreDb, isFirebaseActive, supabase, handleFirestoreError, OperationType } from '../config/firebase.js';
import { readLocalDB, writeLocalDB } from './localDb.js';
import { getFirestoreCollection, setFirestoreDoc } from './firestoreBase.js';
import { User } from '../models/index.js';

export async function findUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase();
  
  if (isFirebaseActive && firestoreDb) {
    try {
      const colRef = collection(firestoreDb, 'users');
      const q = query(colRef, where('email', '==', normalizedEmail));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        return { id: d.id, ...d.data() } as User;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users');
    }
  }
  
  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('email', normalizedEmail).single();
      if (!error && data) return data as User;
    } catch {
      // safe ignore, fallback below
    }
  }

  const db = readLocalDB();
  return db.users.find((u: any) => u.email.toLowerCase() === normalizedEmail) || null;
}

export async function createUser(user: User): Promise<User> {
  if (isFirebaseActive && firestoreDb) {
    await setFirestoreDoc('users', user.id, user);
    return user;
  }
  
  if (supabase) {
    try {
      await supabase.from('users').insert([user]);
    } catch {
      // safe ignore
    }
  }

  const db = readLocalDB();
  db.users.push(user);
  writeLocalDB(db);
  return user;
}

export async function updateUserRole(userId: string, role: 'admin' | 'user'): Promise<User | null> {
  if (isFirebaseActive && firestoreDb) {
    try {
      const docRef = doc(firestoreDb, 'users', userId);
      await updateDoc(docRef, { role });
      const updatedDoc = await getDoc(docRef);
      if (updatedDoc.exists()) {
        return { id: updatedDoc.id, ...updatedDoc.data() } as User;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  }
  
  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').update({ role }).eq('id', userId).select();
      if (!error && data && data.length > 0) return data[0] as User;
    } catch {
      // fallback
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

export async function getUsers(): Promise<User[]> {
  if (isFirebaseActive && firestoreDb) {
    const users = await getFirestoreCollection('users');
    if (users.length > 0) return users as User[];
  }
  
  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (!error && data) return data as User[];
    } catch {
      // fallback
    }
  }
  
  return readLocalDB().users as User[];
}
