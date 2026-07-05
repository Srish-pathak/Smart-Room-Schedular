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
      try {
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
          role: payload.role || 'user',
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
      } catch (err: any) {
        console.warn('Supabase register failed, falling back to server API:', err);
        if (err && err.message && err.message.includes('User already exists')) {
          throw err;
        }
      }
    }

    // Fallback:
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(payload: any) {
    if (isSupabaseConfigured && supabase) {
      try {
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
      } catch (err: any) {
        console.warn('Supabase login failed, falling back to server API:', err);
        if (err && err.message && err.message.includes('Incorrect email')) {
          throw err;
        }
      }
    }

    // Fallback:
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async googleLogin(payload: any) {
    return request('/api/auth/google-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMe() {
    if (isSupabaseConfigured && supabase) {
      try {
        const token = getSessionToken();
        if (!token) throw new Error('No active session found');
        try {
          const user = JSON.parse(atob(token));
          return { user };
        } catch {
          throw new Error('Invalid active session token');
        }
      } catch (err) {
        console.warn('Supabase getMe failed, falling back to server API:', err);
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
        try {
          const { data: sData, error } = await supabase
            .from('rooms')
            .select('*')
            .order('capacity', { ascending: false });
          
          if (error) {
            throw error;
          }
          data = sData;
        } catch (supabaseErr) {
          console.warn('Supabase fetch rooms failed, falling back to server API:', supabaseErr);
          data = await request('/api/rooms');
        }
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
      try {
        const { data, error } = await supabase
          .from('rooms')
          .insert([room])
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        return data;
      } catch (err) {
        console.warn('Supabase create room failed, falling back to server API:', err);
      }
    }

    // Fallback:
    return request('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(room),
    });
  },

  async update(id: string, room: any) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .update(room)
          .eq('id', id)
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        return data;
      } catch (err) {
        console.warn('Supabase update room failed, falling back to server API:', err);
      }
    }

    // Fallback:
    return request(`/api/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(room),
    });
  },

  async bulkCreate(rooms: any[]) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .insert(rooms)
          .select();
        
        if (error) {
          throw error;
        }
        return data;
      } catch (err) {
        console.warn('Supabase bulk create rooms failed, falling back to server API:', err);
      }
    }

    // Fallback:
    return request('/api/rooms/bulk', {
      method: 'POST',
      body: JSON.stringify({ rooms }),
    });
  },

  async delete(id: string) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('rooms')
          .delete()
          .eq('id', id);
        
        if (error) {
          throw error;
        }
        return { success: true };
      } catch (err) {
        console.warn('Supabase delete room failed, falling back to server API:', err);
      }
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
        try {
          const { data: sData, error } = await supabase
            .from('bookings')
            .select('*')
            .order('start_time', { ascending: true });
          
          if (error) {
            throw error;
          }
          data = sData;
        } catch (supabaseErr) {
          console.warn('Supabase fetch bookings failed, falling back to server API:', supabaseErr);
          data = await request('/api/bookings');
        }
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
      try {
        const { roomId, roomName, summary, agenda, startTime, endTime, attendeeEmail, facultyId, bypassConflict } = payload;
        
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

        if (conflictingBookings.length > 0 && !bypassConflict) {
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
      } catch (err: any) {
        if (err && (err.status === 409 || err.conflict)) {
          throw err;
        }
        console.warn('Supabase booking create failed, falling back to server API:', err);
      }
    }

    // Fallback:
    return request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: any) {
    if (isSupabaseConfigured && supabase) {
      try {
        const token = getSessionToken();
        if (!token) throw new Error('Unauthenticated');
        let currentUser: any;
        try {
          currentUser = JSON.parse(atob(token));
        } catch {
          throw new Error('Invalid session token');
        }

        const { data: bookingsList } = await supabase.from('bookings').select('*');
        const conflictingBookings = (bookingsList || []).filter((b: any) => {
          if (b.id === id) return false;
          if (b.room_id !== payload.roomId) return false;
          const s1 = new Date(payload.startTime);
          const e1 = new Date(payload.endTime);
          const s2 = new Date(b.start_time);
          const e2 = new Date(b.end_time);
          return s1 < e2 && e1 > s2;
        });

        if (conflictingBookings.length > 0 && !payload.bypassConflict) {
          const conflict = conflictingBookings[0];
          throw {
            status: 409,
            message: 'Conflict detected: The room is already occupied during these hours.',
            conflict: {
              roomName: payload.roomName,
              startTime: conflict.start_time,
              endTime: conflict.end_time,
              creatorName: conflict.creator_name,
            }
          };
        }

        const updateData = {
          room_id: payload.roomId,
          room_name: payload.roomName,
          summary: payload.summary,
          agenda: payload.agenda || '',
          start_time: payload.startTime,
          end_time: payload.endTime,
          faculty_id: payload.facultyId || '',
          attendee_email: payload.attendeeEmail || '',
          google_event_id: payload.google_event_id,
          google_calendar_link: payload.google_calendar_link,
          google_sync_status: payload.google_sync_status,
          google_sync_error: payload.google_sync_error
        };

        const { data: savedBooking, error: updErr } = await supabase
          .from('bookings')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (updErr) {
          throw reportSupabaseError(updErr, 'Update Booking');
        }

        return savedBooking;
      } catch (err: any) {
        if (err && (err.status === 409 || err.conflict)) {
          throw err;
        }
        console.warn('Supabase booking update failed, falling back to server API:', err);
      }
    }

    return request(`/api/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async delete(id: string) {
    if (isSupabaseConfigured && supabase) {
      try {
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
          currentUser.role !== 'admin' &&
          target.creator_email.toLowerCase() !== currentUser.email.toLowerCase()
        ) {
          throw new Error('Unauthorized: Users can only cancel their own reservations.');
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
      } catch (err: any) {
        if (err && err.message && err.message.includes('Unauthorized')) {
          throw err;
        }
        console.warn('Supabase booking deletion failed, falling back to server API:', err);
      }
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
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('name', { ascending: true });
        
        if (error) {
          throw error;
        }
        return data;
      } catch (err) {
        console.warn('Supabase listUsers failed, falling back to server API:', err);
      }
    }

    // Fallback:
    return request('/api/users');
  },

  async updateUserRole(id: string, role: string) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .update({ role })
          .eq('id', id)
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        return data;
      } catch (err) {
        console.warn('Supabase updateUserRole failed, falling back to server API:', err);
      }
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
      try {
        // 1. Fetch bookings
        const { data: bookings, error: errB } = await supabase.from('bookings').select('*');
        if (errB) {
          throw errB;
        }

        // 2. Fetch rooms
        const { data: rooms, error: errR } = await supabase.from('rooms').select('*');
        if (errR) {
          throw errR;
        }

        // 3. Fetch users
        const { data: dbUsers, error: errU } = await supabase.from('users').select('*');
        if (errU) {
          throw errU;
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
          user: (dbUsers || []).filter((u: any) => u.role === 'user').length,
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
      } catch (err) {
        console.warn('Supabase analytics getStats failed, falling back to server API:', err);
      }
    }

    // Fallback:
    return request('/api/analytics');
  }
};

export const checkInAPI = {
  async checkIn(bookingId: string) {
    return request(`/api/bookings/${bookingId}/check-in`, {
      method: 'POST'
    });
  }
};

export const auditAPI = {
  async listLogs() {
    return request('/api/audit-logs');
  }
};

export const notificationsAPI = {
  async list() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) {
          throw error;
        }
        return data || [];
      } catch (err) {
        console.warn('Supabase list notifications failed, falling back to server API:', err);
      }
    }

    // Fallback:
    return request('/api/notifications');
  },

  async markAllRead() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('read', false);
        
        if (error) {
          throw error;
        }
        return { success: true };
      } catch (err) {
        console.warn('Supabase markAllRead failed, falling back to server API:', err);
      }
    }

    // Fallback:
    return request('/api/notifications/read', {
      method: 'POST',
    });
  }
};
