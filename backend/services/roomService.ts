import * as roomRepo from '../repositories/roomRepository.js';
import * as bookingRepo from '../repositories/bookingRepository.js';
import { Room } from '../models/index.js';

export async function getRoomsWithLiveStatus(): Promise<Room[]> {
  const rooms = await roomRepo.getRooms();
  const bookings = await bookingRepo.getBookings();
  const nowStr = new Date().toISOString();
  const fifteenMinsFromNow = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  return rooms.map((room) => {
    // Check for active bookings right now
    const activeBookings = bookings.filter((b) => {
      return b.room_id === room.id && b.start_time <= nowStr && b.end_time >= nowStr;
    });

    // Check if any booking ends in the next 15 minutes to indicate "expiring_soon"
    const endingSoon = bookings.filter((b) => {
      return b.room_id === room.id && b.start_time <= nowStr && b.end_time > nowStr && b.end_time <= fifteenMinsFromNow;
    });

    let calculatedStatus: 'available' | 'booked' | 'expiring_soon' = 'available';
    if (activeBookings.length > 0) {
      calculatedStatus = endingSoon.length > 0 ? 'expiring_soon' : 'booked';
    }

    return {
      ...room,
      status: calculatedStatus
    };
  });
}

export async function createRoom(roomData: Omit<Room, 'id'>): Promise<Room> {
  const newRoom: Room = {
    ...roomData,
    id: 'room-' + Math.random().toString(36).substring(2, 9),
    capacity: Number(roomData.capacity),
    features: Array.isArray(roomData.features) ? roomData.features : [roomData.features],
    image: roomData.image || 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&auto=format&fit=crop&q=60',
    color: roomData.color || 'from-slate-700 to-slate-900',
    buffer_time: roomData.buffer_time !== undefined ? Number(roomData.buffer_time) : 15,
  };
  return await roomRepo.createRoom(newRoom);
}

export async function updateRoom(roomId: string, roomData: Partial<Room>): Promise<Room | null> {
  return await roomRepo.updateRoom(roomId, roomData);
}

export async function deleteRoom(roomId: string): Promise<boolean> {
  return await roomRepo.deleteRoom(roomId);
}
