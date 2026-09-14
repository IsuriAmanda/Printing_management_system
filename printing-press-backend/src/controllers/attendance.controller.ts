import { Request, Response } from 'express';
import pool from '../config/db';
import { RowDataPacket } from 'mysql2';
import { markAttendance } from '../services/operator-assignment.service';

export const getAttendanceForDate = async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT u.id AS user_id, u.full_name,
             COALESCE(oa.is_present, 1) AS is_present
      FROM users u
      JOIN role r ON u.role_id = r.role_id
      LEFT JOIN operator_attendance oa ON oa.user_id = u.id AND oa.attendance_date = ?
      WHERE r.role_name = 'Operator' AND u.is_active = 1
      ORDER BY u.full_name ASC
    `, [date]);
    res.json(rows);
  } catch (err) {
    console.error('getAttendanceForDate error:', err);
    res.status(500).json({ message: 'Failed to fetch attendance' });
  }
};

export const setAttendance = async (req: Request, res: Response) => {
  try {
    const { user_id, date, is_present } = req.body;
    if (!user_id || !date) {
      res.status(400).json({ message: 'user_id and date are required' });
      return;
    }
    await markAttendance(user_id, date, !!is_present);
    res.json({ message: 'Attendance updated' });
  } catch (err) {
    console.error('setAttendance error:', err);
    res.status(500).json({ message: 'Failed to update attendance' });
  }
};