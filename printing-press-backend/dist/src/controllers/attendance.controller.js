"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAttendance = exports.getAttendanceForDate = void 0;
const db_1 = __importDefault(require("../config/db"));
const operator_assignment_service_1 = require("../services/operator-assignment.service");
const getAttendanceForDate = async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const [rows] = await db_1.default.query(`
      SELECT u.id AS user_id, u.full_name,
             COALESCE(oa.is_present, 1) AS is_present
      FROM users u
      JOIN role r ON u.role_id = r.role_id
      LEFT JOIN operator_attendance oa ON oa.user_id = u.id AND oa.attendance_date = ?
      WHERE r.role_name = 'Operator' AND u.is_active = 1
      ORDER BY u.full_name ASC
    `, [date]);
        res.json(rows);
    }
    catch (err) {
        console.error('getAttendanceForDate error:', err);
        res.status(500).json({ message: 'Failed to fetch attendance' });
    }
};
exports.getAttendanceForDate = getAttendanceForDate;
const setAttendance = async (req, res) => {
    try {
        const { user_id, date, is_present } = req.body;
        if (!user_id || !date) {
            res.status(400).json({ message: 'user_id and date are required' });
            return;
        }
        await (0, operator_assignment_service_1.markAttendance)(user_id, date, !!is_present);
        res.json({ message: 'Attendance updated' });
    }
    catch (err) {
        console.error('setAttendance error:', err);
        res.status(500).json({ message: 'Failed to update attendance' });
    }
};
exports.setAttendance = setAttendance;
