import { doc, updateDoc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { firestoreDb, isFirebaseActive, supabase, handleFirestoreError, OperationType } from '../config/firebase.js';
import { readLocalDB, writeLocalDB } from './localDb.js';
import { getFirestoreCollection, setFirestoreDoc, deleteFirestoreDoc } from './firestoreBase.js';
import { Room } from '../models/index.js';

export async function getRooms(): Promise<Room[]> {
  let rooms: any[] = [];
  if (isFirebaseActive && firestoreDb) {
    rooms = await getFirestoreCollection('rooms');
  } else if (supabase) {
    try {
      const { data, error } = await supabase.from('rooms').select('*');
      if (!error && data && data.length > 0) {
        rooms = data;
      } else {
        rooms = readLocalDB().rooms;
      }
    } catch {
      rooms = readLocalDB().rooms;
    }
  } else {
    rooms = readLocalDB().rooms;
  }

  // Deduplicate rooms by ID
  const uniqueRooms: Room[] = [];
  const seenIds = new Set<string>();
  for (const r of rooms) {
    if (r && r.id && !seenIds.has(r.id)) {
      seenIds.add(r.id);
      uniqueRooms.push(r as Room);
    }
  }
  return uniqueRooms;
}

export async function createRoom(room: Room): Promise<Room> {
  if (isFirebaseActive && firestoreDb) {
    await setFirestoreDoc('rooms', room.id, room);
    return room;
  }
  if (supabase) {
    try {
      await supabase.from('rooms').insert([room]);
    } catch {
      // safe ignore
    }
  }
  const db = readLocalDB();
  db.rooms.push(room);
  writeLocalDB(db);
  return room;
}

export async function updateRoom(roomId: string, roomData: Partial<Room>): Promise<Room | null> {
  if (isFirebaseActive && firestoreDb) {
    try {
      const docRef = doc(firestoreDb, 'rooms', roomId);
      await updateDoc(docRef, roomData as any);
      const updatedDoc = await getDoc(docRef);
      if (updatedDoc.exists()) {
        return { id: updatedDoc.id, ...updatedDoc.data() } as Room;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
    }
  }
  if (supabase) {
    try {
      const { data, error } = await supabase.from('rooms').update(roomData).eq('id', roomId).select();
      if (!error && data && data.length > 0) return data[0] as Room;
    } catch {
      // safe fallback
    }
  }
  const db = readLocalDB();
  const idx = db.rooms.findIndex((r: any) => r.id === roomId);
  if (idx !== -1) {
    db.rooms[idx] = { ...db.rooms[idx], ...roomData };
    writeLocalDB(db);
    return db.rooms[idx] as Room;
  }
  return null;
}

export async function deleteRoom(roomId: string): Promise<boolean> {
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
  if (supabase) {
    try {
      await supabase.from('rooms').delete().eq('id', roomId);
      await supabase.from('bookings').delete().eq('room_id', roomId);
    } catch {
      // safe ignore
    }
  }
  const db = readLocalDB();
  db.rooms = db.rooms.filter((r: any) => r.id !== roomId);
  db.bookings = db.bookings.filter((b: any) => b.room_id !== roomId);
  writeLocalDB(db);
  return true;
}
