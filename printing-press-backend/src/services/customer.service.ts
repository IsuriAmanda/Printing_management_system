import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest
} from '../models/customer.model';
import { requireValidEmail } from '../utils/email-validation';

const requireUniqueContact = async (
  email: string | null | undefined,
  phone: string | null | undefined,
  excludeCustomerId?: number
): Promise<void> => {
  const normalizedEmail = email?.trim() || null;
  const normalizedPhone = phone?.trim() || null;
  if (!normalizedEmail && !normalizedPhone) return;

  const clauses: string[] = [];
  const params: Array<string | number> = [];
  if (normalizedEmail) { clauses.push('email = ?'); params.push(normalizedEmail); }
  if (normalizedPhone) { clauses.push('phone = ?'); params.push(normalizedPhone); }

  let sql = `SELECT email, phone FROM customer WHERE (${clauses.join(' OR ')})`;
  if (excludeCustomerId !== undefined) {
    sql += ' AND customer_id <> ?';
    params.push(excludeCustomerId);
  }

  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  const duplicateEmail = !!normalizedEmail && rows.some(row => row.email === normalizedEmail);
  const duplicatePhone = !!normalizedPhone && rows.some(row => row.phone === normalizedPhone);

  if (duplicateEmail && duplicatePhone) throw new Error('DUPLICATE_EMAIL_AND_PHONE');
  if (duplicateEmail) throw new Error('DUPLICATE_EMAIL');
  if (duplicatePhone) throw new Error('DUPLICATE_PHONE');
};

// ── READ ALL ──────────────────────────────────────────────────
export const fetchAllCustomers = async (): Promise<Customer[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT
      customer_id,
      name,
      phone,
      email,
      address,
      status
    FROM customer
    ORDER BY customer_id DESC
  `);
  return rows as Customer[];
};

// ── READ ONE ──────────────────────────────────────────────────
export const fetchCustomerById = async (
  id: number
): Promise<Customer | undefined> => {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT
      customer_id,
      name,
      phone,
      email,
      address,
      status
    FROM customer
    WHERE customer_id = ?
  `, [id]);
  return rows[0] as Customer | undefined;
};

// ── CREATE ────────────────────────────────────────────────────
export const createCustomer = async (
  data: CreateCustomerRequest
): Promise<Customer> => {
  requireValidEmail(data.email, true);
  await requireUniqueContact(data.email, data.phone);
  const [result] = await pool.query<ResultSetHeader>(`
    INSERT INTO customer
      (name, phone, email, address, status)
    VALUES (?, ?, ?, ?, ?)
  `, [
    data.name.trim(),
    data.phone?.trim() || null,
    data.email?.trim() || null,
    data.address  || null,
    data.status   || 'Active'
  ]);

  return {
    customer_id: result.insertId,
    name:        data.name.trim(),
    phone:       data.phone    || null,
    email:       data.email    || null,
    address:     data.address  || null,
    status:      data.status   || 'Active'
  } as Customer;
};

// ── UPDATE ────────────────────────────────────────────────────
export const updateCustomer = async (
  id: number,
  data: UpdateCustomerRequest
): Promise<Customer | null> => {
  requireValidEmail(data.email, true);
  await requireUniqueContact(data.email, data.phone, id);
  const [result] = await pool.query<ResultSetHeader>(`
    UPDATE customer
    SET name     = ?,
        phone    = ?,
        email    = ?,
        address  = ?,
        status   = ?
    WHERE customer_id = ?
  `, [
    data.name?.trim(),
    data.phone?.trim() || null,
    data.email?.trim() || null,
    data.address  || null,
    data.status   || 'Active',
    id
  ]);

  if (result.affectedRows === 0) return null;

  return {
    customer_id: id,
    name:        data.name?.trim() ?? '',
    phone:       data.phone    || null,
    email:       data.email    || null,
    address:     data.address  || null,
    status:      data.status   || 'Active'
  } as Customer;
};

// ── DELETE ────────────────────────────────────────────────────
export const deleteCustomer = async (
  id: number
): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM customer WHERE customer_id = ?`,
    [id]
  );
  return result.affectedRows > 0;
};

// ── SEARCH ────────────────────────────────────────────────────
// Used if you ever need server-side search
export const searchCustomers = async (
  query: string
): Promise<Customer[]> => {
  const term = `%${query}%`;
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT
      customer_id,
      name,
      phone,
      email,
      address,
      status
    FROM customer
    WHERE name     LIKE ?
       OR email    LIKE ?
       OR phone    LIKE ?
    ORDER BY customer_id DESC
  `, [term, term, term]);
  return rows as Customer[];
};
