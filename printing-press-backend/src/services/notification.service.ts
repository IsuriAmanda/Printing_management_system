import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { NotificationType } from '../models/notification.model';

// ── Create for ONE specific user ─────────────────────────────
export const createNotification = async (
  userId: number,
  message: string,
  type: NotificationType
): Promise<void> => {
  await pool.query<ResultSetHeader>(
    `INSERT INTO notification (user_id, message, type, is_read)
     VALUES (?, ?, ?, 0)`,
    [userId, message, type]
  );
};

// ── Create for ALL active users (broadcast) ──────────────────
export const createNotificationForAll = async (
  message: string,
  type: NotificationType
): Promise<void> => {
  const [users] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM users WHERE is_active = 1`
  );
  if (users.length === 0) return;

  const values = users.map(u => [u.id, message, type, 0]);
  await pool.query(
    `INSERT INTO notification (user_id, message, type, is_read) VALUES ?`,
    [values]
  );
};

// ── Create for all users with a specific role (e.g. all Admins) ─
export const createNotificationForRole = async (
  roleName: string,
  message: string,
  type: NotificationType
): Promise<void> => {
  const [users] = await pool.query<RowDataPacket[]>(
    `SELECT u.id FROM users u
     JOIN role r ON u.role_id = r.role_id
     WHERE r.role_name = ? AND u.is_active = 1`,
    [roleName]
  );
  if (users.length === 0) return;

  const values = users.map(u => [u.id, message, type, 0]);
  await pool.query(
    `INSERT INTO notification (user_id, message, type, is_read) VALUES ?`,
    [values]
  );
};

// ── Fetch for the logged-in user ─────────────────────────────
export const fetchNotificationsForUser = async (userId: number) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT notification_id, user_id, message, type, is_read, created_at
     FROM notification
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 10`,
    [userId]
  );
  return rows;
};

// ── Mark one as read (only if it belongs to this user) ───────
export const markNotificationRead = async (id: number, userId: number): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE notification SET is_read = 1 WHERE notification_id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
};

// ── Mark all as read for this user ────────────────────────────
export const markAllNotificationsRead = async (userId: number): Promise<void> => {
  await pool.query(`UPDATE notification SET is_read = 1 WHERE user_id = ?`, [userId]);
};
export const createNotificationForRoles = async (
  roleNames: string[],
  message: string,
  type: NotificationType
): Promise<void> => {
  const [users] = await pool.query<RowDataPacket[]>(
    `SELECT u.id FROM users u
     JOIN role r ON u.role_id = r.role_id
     WHERE r.role_name IN (?) AND u.is_active = 1`,
    [roleNames]
  );
  if (users.length === 0) return;

  const values = users.map(u => [u.id, message, type, 0]);
  await pool.query(
    `INSERT INTO notification (user_id, message, type, is_read) VALUES ?`,
    [values]
  );
};
