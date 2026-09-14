"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotificationForRoles = exports.markAllNotificationsRead = exports.markNotificationRead = exports.fetchNotificationsForUser = exports.createNotificationForRole = exports.createNotificationForAll = exports.createNotification = void 0;
const db_1 = __importDefault(require("../config/db"));
// ── Create for ONE specific user ─────────────────────────────
const createNotification = async (userId, message, type) => {
    await db_1.default.query(`INSERT INTO notification (user_id, message, type, is_read)
     VALUES (?, ?, ?, 0)`, [userId, message, type]);
};
exports.createNotification = createNotification;
// ── Create for ALL active users (broadcast) ──────────────────
const createNotificationForAll = async (message, type) => {
    const [users] = await db_1.default.query(`SELECT id FROM users WHERE is_active = 1`);
    if (users.length === 0)
        return;
    const values = users.map(u => [u.id, message, type, 0]);
    await db_1.default.query(`INSERT INTO notification (user_id, message, type, is_read) VALUES ?`, [values]);
};
exports.createNotificationForAll = createNotificationForAll;
// ── Create for all users with a specific role (e.g. all Admins) ─
const createNotificationForRole = async (roleName, message, type) => {
    const [users] = await db_1.default.query(`SELECT u.id FROM users u
     JOIN role r ON u.role_id = r.role_id
     WHERE r.role_name = ? AND u.is_active = 1`, [roleName]);
    if (users.length === 0)
        return;
    const values = users.map(u => [u.id, message, type, 0]);
    await db_1.default.query(`INSERT INTO notification (user_id, message, type, is_read) VALUES ?`, [values]);
};
exports.createNotificationForRole = createNotificationForRole;
// ── Fetch for the logged-in user ─────────────────────────────
const fetchNotificationsForUser = async (userId) => {
    const [rows] = await db_1.default.query(`SELECT notification_id, user_id, message, type, is_read, created_at
     FROM notification
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 10`, [userId]);
    return rows;
};
exports.fetchNotificationsForUser = fetchNotificationsForUser;
// ── Mark one as read (only if it belongs to this user) ───────
const markNotificationRead = async (id, userId) => {
    const [result] = await db_1.default.query(`UPDATE notification SET is_read = 1 WHERE notification_id = ? AND user_id = ?`, [id, userId]);
    return result.affectedRows > 0;
};
exports.markNotificationRead = markNotificationRead;
// ── Mark all as read for this user ────────────────────────────
const markAllNotificationsRead = async (userId) => {
    await db_1.default.query(`UPDATE notification SET is_read = 1 WHERE user_id = ?`, [userId]);
};
exports.markAllNotificationsRead = markAllNotificationsRead;
const createNotificationForRoles = async (roleNames, message, type) => {
    const [users] = await db_1.default.query(`SELECT u.id FROM users u
     JOIN role r ON u.role_id = r.role_id
     WHERE r.role_name IN (?) AND u.is_active = 1`, [roleNames]);
    if (users.length === 0)
        return;
    const values = users.map(u => [u.id, message, type, 0]);
    await db_1.default.query(`INSERT INTO notification (user_id, message, type, is_read) VALUES ?`, [values]);
};
exports.createNotificationForRoles = createNotificationForRoles;
