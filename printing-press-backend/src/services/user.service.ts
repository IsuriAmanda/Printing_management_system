import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcryptjs';
import { CreateUserRequest, UpdateUserRequest, UserResponse } from '../models/user.model';

const SELECT_FIELDS = `
  u.id, u.full_name, u.email, u.role_id, r.role_name,
  u.is_active, u.created_at
`;

// ── READ ALL ──────────────────────────────────────────────────
export const fetchAllUsers = async (): Promise<UserResponse[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT ${SELECT_FIELDS}
    FROM users u
    JOIN role r ON u.role_id = r.role_id
    ORDER BY u.id DESC
  `);
  return rows as UserResponse[];
};

// ── READ ONE ──────────────────────────────────────────────────
export const fetchUserById = async (id: number): Promise<UserResponse | undefined> => {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT ${SELECT_FIELDS}
    FROM users u
    JOIN role r ON u.role_id = r.role_id
    WHERE u.id = ?
  `, [id]);
  return rows[0] as UserResponse | undefined;
};

// ── CREATE ────────────────────────────────────────────────────
export const createUser = async (data: CreateUserRequest): Promise<UserResponse> => {
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM users WHERE email = ?`, [data.email]
  );
  if (existing.length > 0) {
    throw new Error('EMAIL_EXISTS');
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const [result] = await pool.query<ResultSetHeader>(`
    INSERT INTO users (full_name, email, password, role_id)
    VALUES (?, ?, ?, ?)
  `, [data.full_name.trim(), data.email.trim(), hashedPassword, data.role_id]);

  return (await fetchUserById(result.insertId)) as UserResponse;
};

// ── UPDATE ────────────────────────────────────────────────────
export const updateUser = async (id: number, data: UpdateUserRequest): Promise<UserResponse | null> => {
  const existing = await fetchUserById(id);
  if (!existing) return null;

  await pool.query<ResultSetHeader>(`
    UPDATE users
    SET full_name = ?, email = ?, role_id = ?, is_active = ?
    WHERE id = ?
  `, [
    data.full_name ?? existing.full_name,
    data.email     ?? existing.email,
    data.role_id   ?? existing.role_id,
    data.is_active !== undefined ? data.is_active : existing.is_active,
    id
  ]);

  return fetchUserById(id) as Promise<UserResponse>;
};

// ── DELETE ────────────────────────────────────────────────────
export const deleteUser = async (id: number): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM users WHERE id = ?`, [id]
  );
  return result.affectedRows > 0;
};

// ── RESET PASSWORD ────────────────────────────────────────────
export const resetUserPassword = async (id: number, newPassword: string): Promise<boolean> => {
  const hashed = await bcrypt.hash(newPassword, 10);
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE users SET password = ? WHERE id = ?`, [hashed, id]
  );
  return result.affectedRows > 0;
};