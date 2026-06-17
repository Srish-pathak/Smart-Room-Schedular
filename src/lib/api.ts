/**
 * Client API Service to interface with Supabase directly, or fallback to the Node.js Full-Stack Backend proxy
 */

import { supabase, isSupabaseConfigured, reportSupabaseError } from './supabaseClient';

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

async function request(path: string, options: RequestInit = {}) {
  const token = getSessionToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }

  if (!response.ok) {
    // If it's a conflict status (409), return the detailed structural payload for conflict recommendations
    if (response.status === 409 && data.conflict) {
      throw { status: 409, conflict: data.conflict };
    }
    throw new Error(data.error || `Request failed with code ${response.status}`);
  }

  return data;
}

export const authAPI = {
  async register(payload: any) {
    if (isSupabaseConfigured && supabase) {
      const email = payload.email.toLowerCase();
      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (existing) {
        throw new Error('User already exists with this email');
      }

      const newUser = {
        name: payload.name,
        email,
        password: payload.password,
        role: payload.role || 'student',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single();
      
      if (error) {
        throw reportSupabaseError(error, 'Register Account');
      }

      // Generate base64 mock jwt representation for maintaining UI authentication compatibility
      const dummyToken = btoa(JSON.stringify(data));
      setSessionToken(dummyToken, true);

      return { user: data, token: dummyToken };
    }

    // Fallback:
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(payload: any) {
    if (isSupabaseConfigured && supabase) {
      const email = payload.email.toLowerCase();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', payload.password)
        .maybeSingle();

      if (error) {
        throw reportSupabaseError(error, 'Login Check');
      }
      if (!data) {
        throw new Error('Incorrect email or password');
      }

      const dummyToken = btoa(JSON.stringify(data));
      setSessionToken(dummyToken, true);

      return { user: data, token: dummyToken };
    }

    // Fallback:
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMe() {
    if (isSupabaseConfigured && supabase) {
      const token = getSessionToken();
      if (!token) throw new Error('No active session found');
      try {
        const user = JSON.parse(atob(token));
        return { user };
      } catch {
        throw new Error('Invalid active session token');
      }
    }

    // Fallback:
    return request('/api/auth/me');
  }
};

export const roomsAPI = {
  async list() {
    try {
      let data;
      if (isSupabaseConfigured && supabase) {
        const { data: sData, error } = await supabase
          .from('rooms')
          .select('*')
          .order('capacity', { ascending: false });
        
        if (error) {
          throw reportSupabaseError(error, 'Fetch Rooms');
        }
        data = sData;
      } else {
        data = await request('/api/rooms');
      }
      localStorage.setItem('iitbhu_cached_rooms_v2', JSON.stringify({
        timestamp: Date.now(),
        data
      }));
      window.dispatchEvent(new CustomEvent('iitbhu_sync_status', { 
        detail: { type: 'rooms', source: 'network', timestamp: Date.now() } 
      }));
      return data;
    } catch (err) {
      console.warn("Network offline or fetch error for rooms directory, invoking local cache", err);
      const cached = localStorage.getItem('iitbhu_cached_rooms_v2');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          window.dispatchEvent(new CustomEvent('iitbhu_sync_status', { 
            detail: { type: 'rooms', source: 'cache', timestamp: parsed.timestamp } 
          }));
          return parsed.data;
        } catch (e) {
          // ignore parsing error
        }
      }
      throw err;
    }
  },

  async create(room: any) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('rooms')
        .insert([room])
        .select()
        .single();
      
      if (error) {
        throw reportSupabaseError(error, 'Create Room');
      }
      return data;
    }

    // Fallback:
    return request('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(room),
    });
  },

  async update(id: string, room: any) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('rooms')
        .update(room)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw reportSupabaseError(error, 'Update Room');
      }
      return data;
    }

    // Fallback:
    return request(`/api/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(room),
    });
  },

  async delete(id: string) {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw reportSupabaseError(error, 'Delete Room');
      }
      return { success: true };
    }

    // Fallback:
    return request(`/api/rooms/${id}`, {
      method: 'DELETE',
    });
  }
};

export const bookingsAPI = {
  async list() {
    try {
      let data;
      if (isSupabaseConfigured && supabase) {
        const { data: sData, error } = await supabase
          .from('bookings')
          .select('*')
          .order('start_time', { ascending: true });
        
        if (error) {
          throw reportSupabaseError(error, 'Fetch Bookings');
        }
        data = sData;
      } else {
        data = await request('/api/bookings');
      }
      localStorage.setItem('iitbhu_cached_bookings_v2', JSON.stringify({
        timestamp: Date.now(),
        data
      }));
      window.dispatchEvent(new CustomEvent('iitbhu_sync_status', { 
        detail: { type: 'bookings', source: 'network', timestamp: Date.now() } 
      }));
      return data;
    } catch (err) {
      console.warn("Network offline or fetch error for bookings list, invoking local cache", err);
      const cached = localStorage.getItem('iitbhu_cached_bookings_v2');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          window.dispatchEvent(new CustomEvent('iitbhu_sync_status', { 
            detail: { type: 'bookings', source: 'cache', timestamp: parsed.timestamp } 
          }));
          return parsed.data;
        } catch (e) {
          // ignore parsing error
        }
      }
      throw err;
    }
  },

  async create(payload: any) {
    if (isSupabaseConfigured && supabase) {
      const { roomId, roomName, summary, agenda, startTime, endTime, attendeeEmail, facultyId } = payload;
      
      const token = getSessionToken();
      if (!token) throw new Error('Unauthenticated');
      let currentUser: any;
      try {
        currentUser = JSON.parse(atob(token));
      } catch {
        throw new Error('Invalid session token');
      }

      // Fetch bookings list
      const { data: bookingsList, error: errBookings } = await supabase
        .from('bookings')
        .select('*');
      
      if (errBookings) {
        throw reportSupabaseError(errBookings, 'Verify Overlaps');
      }

      // Fetch rooms list
      const { data: roomsList, error: errRooms } = await supabase
        .from('rooms')
        .select('*');
      
      if (errRooms) {
        throw reportSupabaseError(errRooms, 'Lookup Spaces');
      }

      // Overlap Conflict Check
      const conflictingBookings = (bookingsList || []).filter((b: any) => {
        return (
          b.room_id === roomId &&
          b.start_time < endTime &&
          b.end_time > startTime
        );
      });

      if (conflictingBookings.length > 0) {
        const conflict = conflictingBookings[0];
        
        // Sibling recommended alternative rooms
        const sisterRooms = (roomsList || []).filter((room: any) => {
          if (room.id === roomId) return false;
          const hasConflict = (bookingsList || []).some((b: any) => {
            return (
              b.room_id === room.id &&
              b.start_time < endTime &&
              b.end_time > startTime
            );
          });
          return !hasConflict;
        });

        // Compute Vacancy Postponement Advisor
        const roomBookingsSameDay = (bookingsList || [])
          .filter((b: any) => b.room_id === roomId && b.start_time >= startTime.split('T')[0])
          .sort((a: any, b: any) => a.end_time.localeCompare(b.end_time));
        
        let advisedTime = endTime;
        if (roomBookingsSameDay.length > 0) {
          advisedTime = roomBookingsSameDay[roomBookingsSameDay.length - 1].end_time;
        }

        throw {
          status: 409,
          conflict: {
            isActive: true,
            overlappingBooking: {
              summary: conflict.summary,
              startTime: conflict.start_time,
              endTime: conflict.end_time,
              creatorName: conflict.creator_name,
            },
            sisterRooms: sisterRooms.slice(0, 3).map((r: any) => ({ id: r.id, name: r.name, capacity: r.capacity })),
            advisorVacancyTime: advisedTime
          }
        };
      }

      // Record insertion configuration
      const newBooking = {
        id: 'book-' + Math.random().toString(36).substring(2, 9),
        room_id: roomId,
        room_name: roomName,
        summary,
        agenda: agenda || '',
        start_time: startTime,
        end_time: endTime,
        creator_name: currentUser.name,
        creator_email: currentUser.email,
        faculty_id: facultyId || '',
        attendee_email: attendeeEmail || '',
        created_at: new Date().toISOString()
      };

      const { data: savedBooking, error: insErr } = await supabase
        .from('bookings')
        .insert([newBooking])
        .select()
        .single();
      
      if (insErr) {
        throw reportSupabaseError(insErr, 'Insert Booking');
      }

      // Construct success log system notification
      try {
        const notif = {
          id: 'notif-' + Math.random().toString(36).substring(2, 9),
          title: 'Booking Approved ✓',
          message: `${currentUser.name} established a reservation for "${roomName}" (${summary}).`,
          type: 'success',
          read: false,
          created_at: new Date().toISOString()
        };
        await supabase.from('notifications').insert([notif]);
      } catch (notifErr) {
        console.error('Failed to dispatch notification:', notifErr);
      }

      return savedBooking;
    }

    // Fallback:
    return request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async delete(id: string) {
    if (isSupabaseConfigured && supabase) {
      const token = getSessionToken();
      if (!token) throw new Error('Unauthenticated');
      let currentUser: any;
      try {
        currentUser = JSON.parse(atob(token));
      } catch {
        throw new Error('Invalid session token');
      }

      // Fetch target booking
      const { data: target, error: errFetch } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (errFetch) {
        throw reportSupabaseError(errFetch, 'Lookup Booking');
      }
      if (!target) {
        throw new Error('Reservation not found');
      }

      // Role Enforcement Check
      if (
        currentUser.role === 'student' &&
        target.creator_email.toLowerCase() !== currentUser.email.toLowerCase()
      ) {
        throw new Error('Unauthorized: Students can only cancel their own reservations.');
      }

      const { error: delErr } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);
      
      if (delErr) {
        throw reportSupabaseError(delErr, 'Cancel Booking');
      }

      // Construct cancellation log system notification
      try {
        const notif = {
          id: 'notif-' + Math.random().toString(36).substring(2, 9),
          title: 'Booking Cancelled ✕',
          message: `The reservation on "${target.room_name}" ("${target.summary}") was cancelled by ${currentUser.name}.`,
          type: 'warn',
          read: false,
          created_at: new Date().toISOString()
        };
        await supabase.from('notifications').insert([notif]);
      } catch (notifErr) {
        console.error('Failed to dispatch notification:', notifErr);
      }

      return { success: true };
    }

    // Fallback:
    return request(`/api/bookings/${id}`, {
      method: 'DELETE',
    });
  }
};

export const adminAPI = {
  async listUsers() {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        throw reportSupabaseError(error, 'Fetch Users List');
      }
      return data;
    }

    // Fallback:
    return request('/api/users');
  },

  async updateUserRole(id: string, role: string) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw reportSupabaseError(error, 'Set User Role');
      }
      return data;
    }

    // Fallback:
    return request(`/api/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }
};

export const analyticsAPI = {
  async getStats() {
    if (isSupabaseConfigured && supabase) {
      // 1. Fetch bookings
      const { data: bookings, error: errB } = await supabase.from('bookings').select('*');
      if (errB) {
        throw reportSupabaseError(errB, 'Fetch Analytics Bookings');
      }

      // 2. Fetch rooms
      const { data: rooms, error: errR } = await supabase.from('rooms').select('*');
      if (errR) {
        throw reportSupabaseError(errR, 'Fetch Analytics Rooms');
      }

      // 3. Fetch users
      const { data: dbUsers, error: errU } = await supabase.from('users').select('*');
      if (errU) {
        throw reportSupabaseError(errU, 'Fetch Analytics Users');
      }

      const totalBookings = (bookings || []).length;

      const frequencyByRoom = (rooms || []).map((room: any) => {
        const count = (bookings || []).filter((b: any) => b.room_id === room.id).length;
        return {
          name: room.name,
          bookingsCount: count,
          capacity: room.capacity
        };
      });

      const roleStats = {
        admin: (dbUsers || []).filter((u: any) => u.role === 'admin').length,
        faculty: (dbUsers || []).filter((u: any) => u.role === 'faculty').length,
        student: (dbUsers || []).filter((u: any) => u.role === 'student').length,
      };

      const hoursDemand = Array.from({ length: 24 }, (_, i) => ({
        hour: `${String(i).padStart(2, '0')}:00`,
        bookings: 0
      }));

      (bookings || []).forEach((b: any) => {
        try {
          const dateObj = new Date(b.start_time);
          const hr = dateObj.getHours();
          if (hr >= 0 && hr < 24) {
            hoursDemand[hr].bookings += 1;
          }
        } catch {}
      });

      const activeHoursDemand = hoursDemand.filter((h, i) => i >= 8 && i <= 20);

      let totalAssignedHours = 0;
      (bookings || []).forEach((b: any) => {
        try {
          const start = new Date(b.start_time).getTime();
          const end = new Date(b.end_time).getTime();
          const durationHours = (end - start) / (1000 * 60 * 60);
          if (durationHours > 0) totalAssignedHours += durationHours;
        } catch {}
      });

      return {
        totalBookings,
        totalUsers: (dbUsers || []).length,
        totalAssignedHours: Math.round(totalAssignedHours * 10) / 10,
        frequencyByRoom,
        roleStats,
        hourlyDemand: activeHoursDemand
      };
    }

    // Fallback:
    return request('/api/analytics');
  }
};

export const geminiAPI = {
  async recommend(payload: { eventType: string; participants: number; equipment: string }) {
    // Recommend queries keep the secret GEMINI_API_KEY server-side so we proxy via Express proxy explicitly.
    return request('/api/gemini/recommend', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
};

export const notificationsAPI = {
  async list() {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        throw reportSupabaseError(error, 'Fetch Notifications');
      }
      return data || [];
    }

    // Fallback:
    return request('/api/notifications');
  },

  async markAllRead() {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);
      
      if (error) {
        throw reportSupabaseError(error, 'Mark Notifications Read');
      }
      return { success: true };
    }

    // Fallback:
    return request('/api/notifications/read', {
      method: 'POST',
    });
  }
};
