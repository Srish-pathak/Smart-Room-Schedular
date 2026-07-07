/**
 * Client API Service to interface with Firebase Firestore directly in a serverless client architecture
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';

let cachedToken: string | null = localStorage.getItem('iitbhu_smart_jwt_token') || sessionStorage.getItem('iitbhu_smart_jwt_token');

export function setSessionToken(token: string | null, keepLoggedIn: boolean = false) {
  cachedToken = token;
  if (!token) {
    localStorage.removeItem('iitbhu_smart_jwt_token');
    sessionStorage.removeItem('iitbhu_smart_jwt_token');
  } else {
    if (keepLoggedIn) {
      localStorage.setItem('iitbhu_smart_jwt_token', token);
    } else {
      sessionStorage.setItem('iitbhu_smart_jwt_token', token);
    }
  }
}

export function getSessionToken(): string | null {
  if (!cachedToken) {
    cachedToken = localStorage.getItem('iitbhu_smart_jwt_token') || sessionStorage.getItem('iitbhu_smart_jwt_token');
  }
  return cachedToken;
}

export const authAPI = {
  async register(payload: any) {
    const email = payload.email.toLowerCase();
    const q = query(collection(db, 'users'), where('email', '==', email));
    const checkSnap = await getDocs(q);
    
    if (!checkSnap.empty) {
      throw new Error('User already exists with this email');
    }

    const userId = payload.uid || 'usr-' + Math.random().toString(36).substring(2, 9);
    const newUser = {
      uid: userId,
      name: payload.name,
      fullName: payload.name,
      email,
      role: payload.role || 'student',
      profilePhoto: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(payload.name)}`,
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', userId), newUser);
    const dummyToken = btoa(JSON.stringify(newUser));
    setSessionToken(dummyToken, true);

    return { user: newUser, token: dummyToken };
  },

  async login(payload: any) {
    const email = payload.email.toLowerCase();
    const q = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error('Incorrect email or password');
    }

    const matchedDoc = querySnapshot.docs[0];
    const userData = { id: matchedDoc.id, ...matchedDoc.data() } as any;

    const dummyToken = btoa(JSON.stringify(userData));
    setSessionToken(dummyToken, true);

    return { user: userData, token: dummyToken };
  },

  async googleLogin(payload: any) {
    return { success: true };
  },

  async firebaseLogin(payload: any) {
    return { success: true };
  },

  async getMe() {
    const token = getSessionToken();
    if (!token) throw new Error('No active session found');
    
    try {
      const decoded = JSON.parse(atob(token));
      return { user: decoded };
    } catch {
      throw new Error('Could not decode session token');
    }
  },

  async updateProfile(userId: string, payload: { name: string, fullName: string, profilePhoto?: string, department?: string, phoneNumber?: string }) {
    await setDoc(doc(db, 'users', userId), payload, { merge: true });
    
    // Fetch updated user to store in session
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const updatedUser = { id: userDoc.id, ...userDoc.data() };
      const dummyToken = btoa(JSON.stringify(updatedUser));
      setSessionToken(dummyToken, true);
      return updatedUser;
    }
    throw new Error('User not found after update');
  }
};

export const roomsAPI = {
  async list() {
    const q = query(collection(db, 'rooms'));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(d => {
      const r = d.data();
      return {
        id: d.id,
        roomId: d.id,
        name: r.roomName || r.name,
        roomName: r.roomName || r.name,
        building: r.building || '',
        capacity: Number(r.capacity || 0),
        facilities: r.facilities || r.features || [],
        features: r.facilities || r.features || [],
        status: r.status || 'available',
        image: r.image || '',
        color: r.color || 'indigo',
        createdAt: r.createdAt || new Date().toISOString()
      };
    });

    data.sort((a, b) => b.capacity - a.capacity);
    return data;
  },

  async create(room: any) {
    const roomId = room.roomId || room.id || 'room-' + Math.random().toString(36).substring(2, 9);
    const newRoom = {
      id: roomId,
      roomId: roomId,
      name: room.roomName || room.name,
      roomName: room.roomName || room.name,
      building: room.building || '',
      capacity: Number(room.capacity || 0),
      facilities: room.facilities || room.features || [],
      features: room.facilities || room.features || [],
      status: room.status || 'available',
      image: room.image || '',
      color: room.color || 'indigo',
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'rooms', roomId), newRoom);
    return newRoom;
  },

  async update(id: string, room: any) {
    const updatedRoom = {
      id,
      roomId: id,
      name: room.roomName || room.name,
      roomName: room.roomName || room.name,
      building: room.building || '',
      capacity: Number(room.capacity || 0),
      facilities: room.facilities || room.features || [],
      features: room.features || room.facilities || [],
      status: room.status || 'available',
      image: room.image || '',
      color: room.color || 'indigo',
      createdAt: room.createdAt || new Date().toISOString()
    };

    await setDoc(doc(db, 'rooms', id), updatedRoom, { merge: true });
    return updatedRoom;
  },

  async bulkCreate(rooms: any[]) {
    for (const room of rooms) {
      await this.create(room);
    }
    return rooms;
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'rooms', id));
    return { success: true };
  }
};

export const bookingsAPI = {
  async list() {
    const querySnapshot = await getDocs(collection(db, 'bookings'));
    const data = querySnapshot.docs.map(d => {
      const b = d.data();
      return {
        id: d.id,
        bookingId: d.id,
        room_id: b.roomId || b.room_id,
        roomId: b.roomId || b.room_id,
        room_name: b.roomName || b.room_name,
        roomName: b.roomName || b.room_name,
        summary: b.summary || b.purpose || '',
        purpose: b.summary || b.purpose || '',
        agenda: b.agenda || '',
        start_time: b.startTime || b.start_time,
        startTime: b.startTime || b.start_time,
        end_time: b.endTime || b.end_time,
        endTime: b.endTime || b.end_time,
        creator_name: b.creator_name || b.creatorName || 'User',
        creatorName: b.creator_name || b.creatorName || 'User',
        creator_email: b.creator_email || b.creatorEmail || '',
        creatorEmail: b.creator_email || b.creatorEmail || '',
        userId: b.userId || b.creatorEmail || '',
        faculty_id: b.faculty_id || b.facultyId || '',
        facultyId: b.faculty_id || b.facultyId || '',
        attendee_email: b.attendee_email || b.attendeeEmail || '',
        attendeeEmail: b.attendee_email || b.attendeeEmail || '',
        status: b.status || 'Pending',
        rejectionReason: b.rejectionReason || b.rejection_reason || '',
        rejection_reason: b.rejectionReason || b.rejection_reason || '',
        checkedIn: b.checkedIn || false,
        checkInTime: b.checkInTime || '',
        createdAt: b.createdAt || b.created_at || new Date().toISOString()
      };
    });

    data.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return data;
  },

  async create(payload: any) {
    const token = getSessionToken();
    if (!token) throw new Error('Unauthenticated');
    let currentUser: any;
    try {
      currentUser = JSON.parse(atob(token));
    } catch {
      throw new Error('Invalid session token');
    }

    const roomId = payload.roomId || payload.room_id;
    const roomName = payload.roomName || payload.room_name;
    const startTime = payload.startTime || payload.start_time;
    const endTime = payload.endTime || payload.end_time;
    const summary = payload.summary || payload.purpose || '';

    // Fetch live bookings and rooms for client-side overlap checks
    const bookingsList = await this.list();
    const roomsList = await roomsAPI.list();

    // Prevent double booking check against any approved booking
    const conflictingBookings = bookingsList.filter((b: any) => {
      return (
        b.roomId === roomId &&
        b.status === 'Approved' &&
        b.startTime < endTime &&
        b.endTime > startTime
      );
    });

    if (conflictingBookings.length > 0 && !payload.bypassConflict) {
      const conflict = conflictingBookings[0];
      
      // Calculate alternative sister rooms
      const sisterRooms = roomsList.filter((room: any) => {
        if (room.id === roomId) return false;
        const hasConflict = bookingsList.some((b: any) => {
          return (
            b.roomId === room.id &&
            b.status === 'Approved' &&
            b.startTime < endTime &&
            b.endTime > startTime
          );
        });
        return !hasConflict;
      });

      // Calculate advisary postpone time
      const roomBookingsSameDay = bookingsList
        .filter((b: any) => b.roomId === roomId && b.startTime >= startTime.split('T')[0])
        .sort((a: any, b: any) => a.endTime.localeCompare(b.endTime));
      
      let advisedTime = endTime;
      if (roomBookingsSameDay.length > 0) {
        advisedTime = roomBookingsSameDay[roomBookingsSameDay.length - 1].endTime;
      }

      throw {
        status: 409,
        conflict: {
          isActive: true,
          overlappingBooking: {
            summary: conflict.summary,
            startTime: conflict.startTime,
            endTime: conflict.endTime,
            creatorName: conflict.creatorName,
          },
          sisterRooms: sisterRooms.slice(0, 3).map((r: any) => ({ id: r.id, name: r.name, capacity: r.capacity })),
          advisorVacancyTime: advisedTime
        }
      };
    }

    const bookingId = payload.id || payload.bookingId || 'book-' + Math.random().toString(36).substring(2, 9);
    const newBooking = {
      id: bookingId,
      bookingId: bookingId,
      roomId,
      room_id: roomId,
      roomName,
      room_name: roomName,
      summary,
      purpose: summary,
      agenda: payload.agenda || '',
      startTime,
      start_time: startTime,
      endTime,
      end_time: endTime,
      creatorName: currentUser.fullName || currentUser.name || 'User',
      creator_name: currentUser.fullName || currentUser.name || 'User',
      creatorEmail: currentUser.email,
      creator_email: currentUser.email,
      userId: currentUser.uid || '',
      facultyId: payload.facultyId || '',
      faculty_id: payload.facultyId || '',
      attendeeEmail: payload.attendeeEmail || '',
      attendee_email: payload.attendeeEmail || '',
      status: payload.status || 'Pending',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    await setDoc(doc(db, 'bookings', bookingId), newBooking);

    // Create a real-time notification in Firestore
    try {
      const notifId = 'notif-' + Math.random().toString(36).substring(2, 9);
      const notif = {
        id: notifId,
        userId: currentUser.uid || '',
        title: 'Booking Created',
        message: `${newBooking.creatorName} requested a reservation for "${roomName}" (${summary}).`,
        type: 'success',
        read: false,
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      await setDoc(doc(db, 'notifications', notifId), notif);
    } catch (nErr) {
      console.warn('Failed to dispatch notification:', nErr);
    }

    return newBooking;
  },

  async update(id: string, payload: any) {
    const bookingsList = await this.list();
    const startTime = payload.startTime || payload.start_time;
    const endTime = payload.endTime || payload.end_time;
    const roomId = payload.roomId || payload.room_id;

    const conflictingBookings = bookingsList.filter((b: any) => {
      if (b.id === id) return false;
      if (b.roomId !== roomId) return false;
      return b.status === 'Approved' && startTime < b.endTime && endTime > b.startTime;
    });

    if (conflictingBookings.length > 0 && !payload.bypassConflict) {
      const conflict = conflictingBookings[0];
      throw {
        status: 409,
        message: 'Conflict detected: The room is already occupied during these hours.',
        conflict: {
          roomName: payload.roomName,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          creatorName: conflict.creatorName,
        }
      };
    }

    const updatedBooking = {
      roomId,
      room_id: roomId,
      roomName: payload.roomName || payload.room_name,
      room_name: payload.roomName || payload.room_name,
      summary: payload.summary || payload.purpose || '',
      purpose: payload.summary || payload.purpose || '',
      agenda: payload.agenda || '',
      startTime,
      start_time: startTime,
      endTime,
      end_time: endTime,
      facultyId: payload.facultyId || '',
      faculty_id: payload.facultyId || '',
      attendeeEmail: payload.attendeeEmail || '',
      attendee_email: payload.attendeeEmail || ''
    };

    await setDoc(doc(db, 'bookings', id), updatedBooking, { merge: true });
    return { id, ...updatedBooking };
  },

  async delete(id: string) {
    const token = getSessionToken();
    if (!token) throw new Error('Unauthenticated');
    let currentUser: any;
    try {
      currentUser = JSON.parse(atob(token));
    } catch {
      throw new Error('Invalid session');
    }

    const docRef = doc(db, 'bookings', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Reservation not found');
    }
    const target = docSnap.data();

    if (
      currentUser.role !== 'admin' &&
      target.creatorEmail?.toLowerCase() !== currentUser.email.toLowerCase() &&
      target.creator_email?.toLowerCase() !== currentUser.email.toLowerCase()
    ) {
      throw new Error('Unauthorized: Users can only cancel their own reservations.');
    }

    await deleteDoc(docRef);

    // Dispatch cancellation notification
    try {
      const notifId = 'notif-' + Math.random().toString(36).substring(2, 9);
      const notif = {
        id: notifId,
        userId: currentUser.uid || '',
        title: 'Booking Cancelled',
        message: `The reservation on "${target.roomName || target.room_name}" was cancelled by ${currentUser.fullName || currentUser.name}.`,
        type: 'warn',
        read: false,
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      await setDoc(doc(db, 'notifications', notifId), notif);
    } catch (nErr) {
      console.warn('Failed to dispatch notification:', nErr);
    }

    return { success: true };
  },

  async approve(id: string) {
    await setDoc(doc(db, 'bookings', id), { status: 'Approved' }, { merge: true });
    return { success: true };
  },

  async reject(id: string, reason: string) {
    await setDoc(doc(db, 'bookings', id), { 
      status: 'Rejected', 
      rejectionReason: reason,
      rejection_reason: reason
    }, { merge: true });
    return { success: true };
  }
};

export const adminAPI = {
  async listUsers() {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const data = querySnapshot.docs.map(d => {
      const u = d.data();
      return {
        id: d.id,
        uid: d.id,
        name: u.fullName || u.name || '',
        fullName: u.fullName || u.name || '',
        email: u.email || '',
        role: u.role || 'student',
        profilePhoto: u.profilePhoto || u.photoURL || '',
        createdAt: u.createdAt || new Date().toISOString()
      };
    });

    data.sort((a, b) => a.name.localeCompare(b.name));
    return data;
  },

  async updateUserRole(id: string, role: string) {
    await setDoc(doc(db, 'users', id), { role }, { merge: true });
    return { id, role };
  }
};

export const analyticsAPI = {
  async getStats() {
    const bookingsList = await bookingsAPI.list();
    const roomsList = await roomsAPI.list();
    const usersList = await adminAPI.listUsers();

    const totalBookings = bookingsList.length;

    const frequencyByRoom = roomsList.map((room: any) => {
      const count = bookingsList.filter((b: any) => b.roomId === room.id).length;
      return {
        name: room.name,
        bookingsCount: count,
        capacity: room.capacity
      };
    });

    const roleStats = {
      admin: usersList.filter((u: any) => u.role === 'admin').length,
      user: usersList.filter((u: any) => u.role !== 'admin').length,
    };

    const hoursDemand = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      bookings: 0
    }));

    bookingsList.forEach((b: any) => {
      try {
        const dateObj = new Date(b.startTime);
        const hr = dateObj.getHours();
        if (hr >= 0 && hr < 24) {
          hoursDemand[hr].bookings += 1;
        }
      } catch {}
    });

    const activeHoursDemand = hoursDemand.filter((h, i) => i >= 8 && i <= 20);

    let totalAssignedHours = 0;
    bookingsList.forEach((b: any) => {
      try {
        const start = new Date(b.startTime).getTime();
        const end = new Date(b.endTime).getTime();
        const durationHours = (end - start) / (1000 * 60 * 60);
        if (durationHours > 0) totalAssignedHours += durationHours;
      } catch {}
    });

    return {
      totalBookings,
      totalUsers: usersList.length,
      totalAssignedHours: Math.round(totalAssignedHours * 10) / 10,
      frequencyByRoom,
      roleStats,
      hourlyDemand: activeHoursDemand
    };
  }
};

export const checkInAPI = {
  async checkIn(bookingId: string) {
    await setDoc(doc(db, 'bookings', bookingId), {
      checkedIn: true,
      checkInTime: new Date().toISOString()
    }, { merge: true });
    return { success: true };
  }
};

export const auditAPI = {
  async listLogs() {
    return []; // Audit log collection removed for simplification
  }
};

export const notificationsAPI = {
  async list() {
    const snap = await getDocs(collection(db, 'notifications'));
    const data = snap.docs.map(d => {
      const n = d.data();
      return {
        id: d.id,
        userId: n.userId || '',
        title: n.title || '',
        message: n.message || '',
        read: n.read || false,
        createdAt: n.createdAt || n.created_at || new Date().toISOString(),
        created_at: n.createdAt || n.created_at || new Date().toISOString()
      };
    });
    
    data.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return data.slice(0, 50);
  },

  async markAllRead() {
    const snap = await getDocs(collection(db, 'notifications'));
    for (const d of snap.docs) {
      const notif = d.data();
      if (!notif.read) {
        await updateDoc(doc(db, 'notifications', d.id), { read: true });
      }
    }
    return { success: true };
  }
};
