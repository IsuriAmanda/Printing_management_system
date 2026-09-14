"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetUserPassword = exports.deleteUser = exports.updateUser = exports.createUser = exports.fetchUserById = exports.fetchAllUsers = void 0;
const db_1 = __importDefault(require("../config/db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const SELECT_FIELDS = `
  u.id, u.full_name, u.email, u.role_id, r.role_name,
  u.is_active, u.created_at
`;
// ── READ ALL ──────────────────────────────────────────────────
const fetchAllUsers = async () => {
    const [rows] = await db_1.default.query(`
    SELECT ${SELECT_FIELDS}
    FROM users u
    JOIN role r ON u.role_id = r.role_id
    ORDER BY u.id DESC
  `);
    return rows;
};
exports.fetchAllUsers = fetchAllUsers;
// ── READ ONE ──────────────────────────────────────────────────
const fetchUserById = async (id) => {
    const [rows] = await db_1.default.query(`
    SELECT ${SELECT_FIELDS}
    FROM users u
    JOIN role r ON u.role_id = r.role_id
    WHERE u.id = ?
  `, [id]);
    return rows[0];
};
exports.fetchUserById = fetchUserById;
// ── CREATE ────────────────────────────────────────────────────
const createUser = async (data) => {
    const [existing] = await db_1.default.query(`SELECT id FROM users WHERE email = ?`, [data.email]);
    if (existing.length > 0) {
        throw new Error('EMAIL_EXISTS');
    }
    const hashedPassword = await bcryptjs_1.default.hash(data.password, 10);
    const [result] = await db_1.default.query(`
    INSERT INTO users (full_name, email, password, role_id)
    VALUES (?, ?, ?, ?)
  `, [data.full_name.trim(), data.email.trim(), hashedPassword, data.role_id]);
    return (await (0, exports.fetchUserById)(result.insertId));
};
exports.createUser = createUser;
// ── UPDATE ────────────────────────────────────────────────────
const updateUser = async (id, data) => {
    const existing = await (0, exports.fetchUserById)(id);
    if (!existing)
        return null;
    await db_1.default.query(`
    UPDATE users
    SET full_name = ?, email = ?, role_id = ?, is_active = ?
    WHERE id = ?
  `, [
        data.full_name ?? existing.full_name,
        data.email ?? existing.email,
        data.role_id ?? existing.role_id,
        data.is_active !== undefined ? data.is_active : existing.is_active,
        id
    ]);
    return (0, exports.fetchUserById)(id);
};
exports.updateUser = updateUser;
// ── DELETE ────────────────────────────────────────────────────
const deleteUser = async (id) => {
    const [result] = await db_1.default.query(`DELETE FROM users WHERE id = ?`, [id]);
    return result.affectedRows > 0;
};
exports.deleteUser = deleteUser;
// ── RESET PASSWORD ────────────────────────────────────────────
const resetUserPassword = async (id, newPassword) => {
    const hashed = await bcryptjs_1.default.hash(newPassword, 10);
    const [result] = await db_1.default.query(`UPDATE users SET password = ? WHERE id = ?`, [hashed, id]);
    return result.affectedRows > 0;
};
exports.resetUserPassword = resetUserPassword;
