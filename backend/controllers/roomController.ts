import { Request, Response, NextFunction } from 'express';
import * as roomService from '../services/roomService.js';
import { pushNotification } from '../repositories/notificationRepository.js';

export async function getRooms(req: Request, res: Response, next: NextFunction) {
  try {
    const rooms = await roomService.getRoomsWithLiveStatus();
    return res.json(rooms);
  } catch (err) {
    next(err);
  }
}

export async function createRoom(req: any, res: Response, next: NextFunction) {
  try {
    const room = await roomService.createRoom(req.body);
    await pushNotification(
      'New Space Added 🏢',
      `${req.user.name} added a new booking resource: "${room.name}".`,
      'success'
    );
    return res.status(201).json(room);
  } catch (err) {
    next(err);
  }
}

export async function bulkAddRooms(req: any, res: Response, next: NextFunction) {
  try {
    const rooms = req.body;
    if (!Array.isArray(rooms)) {
      return res.status(400).json({ error: 'Body must be an array of rooms' });
    }

    const inserted: any[] = [];
    for (const r of rooms) {
      const room = await roomService.createRoom(r);
      inserted.push(room);
    }
    
    await pushNotification(
      'Bulk Rooms Added 🏢',
      `${req.user.name} bulk-imported ${inserted.length} space locations.`,
      'info'
    );
    
    return res.status(201).json(inserted);
  } catch (err) {
    next(err);
  }
}

export async function editRoom(req: any, res: Response, next: NextFunction) {
  try {
    const room = await roomService.updateRoom(req.params.id, req.body);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    await pushNotification(
      'Space Updated 🏢',
      `${req.user.name} updated the configurations of "${room.name}".`,
      'info'
    );
    return res.json(room);
  } catch (err) {
    next(err);
  }
}

export async function deleteRoom(req: any, res: Response, next: NextFunction) {
  try {
    const success = await roomService.deleteRoom(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Room not found' });
    }
    await pushNotification(
      'Space Deleted ✕',
      `${req.user.name} removed booking resource with ID: ${req.params.id}.`,
      'warn'
    );
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
