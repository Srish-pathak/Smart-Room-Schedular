import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestoreDb, isFirebaseActive, supabase, handleFirestoreError, OperationType } from '../config/firebase.js';
import { readLocalDB, writeLocalDB } from './localDb.js';
import { getFirestoreCollection, setFirestoreDoc, deleteFirestoreDoc } from './firestoreBase.js';
import { Booking } from '../models/index.js';

export async function getBookings(): Promise<Booking[]> {
  if (isFirebaseActive && firestoreDb) {
    return await getFirestoreCollection('bookings') as Booking[];
  }
  if (supabase) {
    try {
      const { data, error } = await supabase.from('bookings').select('*');
      if (!error && data) return data as Booking[];
    } catch {
      // safe fallback below
    }
  }
  return readLocalDB().bookings as Booking[];
}

export async function addBooking(booking: Booking): Promise<Booking> {
  const bookingId = booking.id || 'book-' + Math.random().toString(36).substring(2, 9);
  const enrichedBooking = { ...booking, id: bookingId };
  
  if (isFirebaseActive && firestoreDb) {
    await setFirestoreDoc('bookings', bookingId, enrichedBooking);
    return enrichedBooking;
  }
  if (supabase) {
    try {
      const { data, error } = await supabase.from('bookings').insert([enrichedBooking]).select();
      if (!error && data) return data[0] as Booking;
    } catch {
      // safe fallback
    }
  }
  const db = readLocalDB();
  db.bookings.push(enrichedBooking);
  writeLocalDB(db);
  return enrichedBooking;
}

export async function updateBooking(id: string, updatedBooking: Partial<Booking>): Promise<Booking | null> {
  if (isFirebaseActive && firestoreDb) {
    await setFirestoreDoc('bookings', id, updatedBooking);
    return updatedBooking as Booking;
  }
  if (supabase) {
    try {
      const { data, error } = await supabase.from('bookings').update(updatedBooking).eq('id', id).select();
      if (!error && data) return data[0] as Booking;
    } catch {
      // fallback
    }
  }
  const db = readLocalDB();
  const idx = db.bookings.findIndex((b: any) => b.id === id);
  if (idx !== -1) {
    db.bookings[idx] = { ...db.bookings[idx], ...updatedBooking };
    writeLocalDB(db);
    return db.bookings[idx] as Booking;
  }
  return null;
}

export async function deleteBookingById(id: string): Promise<boolean> {
  if (isFirebaseActive && firestoreDb) {
    return await deleteFirestoreDoc('bookings', id);
  }
  if (supabase) {
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (!error) return true;
    } catch {
      // fallback
    }
  }
  const db = readLocalDB();
  const initialLength = db.bookings.length;
  db.bookings = db.bookings.filter((b: any) => b.id !== id);
  writeLocalDB(db);
  return db.bookings.length < initialLength;
}
