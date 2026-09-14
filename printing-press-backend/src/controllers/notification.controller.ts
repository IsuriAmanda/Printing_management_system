import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  fetchNotificationsForUser, markNotificationRead, markAllNotificationsRead
} from '../services/notification.service';

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const data = await fetchNotificationsForUser(req.user.id);
    res.json(data);
  } catch (err) {
    console.error('getMyNotifications error:', err);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

export const markRead = async (req: AuthRequest, res: Response) => {
  try {
    const success = await markNotificationRead(Number(req.params.id), req.user.id);
    if (!success) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error('markRead error:', err);
    res.status(500).json({ message: 'Failed to update notification' });
  }
};

export const markAllRead = async (req: AuthRequest, res: Response) => {
  try {
    await markAllNotificationsRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('markAllRead error:', err);
    res.status(500).json({ message: 'Failed to update notifications' });
  }
};