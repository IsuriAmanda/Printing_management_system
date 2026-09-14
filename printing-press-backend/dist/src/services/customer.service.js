"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchCustomers = exports.deleteCustomer = exports.updateCustomer = exports.createCustomer = exports.fetchCustomerById = exports.fetchAllCustomers = void 0;
const db_1 = __importDefault(require("../config/db"));
const email_validation_1 = require("../utils/email-validation");
const requireUniqueContact = async (email, phone, excludeCustomerId) => {
    const normalizedEmail = email?.trim() || null;
    const normalizedPhone = phone?.trim() || null;
    if (!normalizedEmail && !normalizedPhone)
        return;
    const clauses = [];
    const params = [];
    if (normalizedEmail) {
        clauses.push('email = ?');
        params.push(normalizedEmail);
    }
    if (normalizedPhone) {
        clauses.push('phone = ?');
        params.push(normalizedPhone);
    }
    let sql = `SELECT email, phone FROM customer WHERE (${clauses.join(' OR ')})`;
    if (excludeCustomerId !== undefined) {
        sql += ' AND customer_id <> ?';
        params.push(excludeCustomerId);
    }
    const [rows] = await db_1.default.query(sql, params);
    const duplicateEmail = !!normalizedEmail && rows.some(row => row.email === normalizedEmail);
    const duplicatePhone = !!normalizedPhone && rows.some(row => row.phone === normalizedPhone);
    if (duplicateEmail && duplicatePhone)
        throw new Error('DUPLICATE_EMAIL_AND_PHONE');
    if (duplicateEmail)
        throw new Error('DUPLICATE_EMAIL');
    if (duplicatePhone)
        throw new Error('DUPLICATE_PHONE');
};
// ── READ ALL ──────────────────────────────────────────────────
const fetchAllCustomers = async () => {
    const [rows] = await db_1.default.query(`
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
    return rows;
};
exports.fetchAllCustomers = fetchAllCustomers;
// ── READ ONE ──────────────────────────────────────────────────
const fetchCustomerById = async (id) => {
    const [rows] = await db_1.default.query(`
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
    return rows[0];
};
exports.fetchCustomerById = fetchCustomerById;
// ── CREATE ────────────────────────────────────────────────────
const createCustomer = async (data) => {
    (0, email_validation_1.requireValidEmail)(data.email, true);
    await requireUniqueContact(data.email, data.phone);
    const [result] = await db_1.default.query(`
    INSERT INTO customer
      (name, phone, email, address, status)
    VALUES (?, ?, ?, ?, ?)
  `, [
        data.name.trim(),
        data.phone?.trim() || null,
        data.email?.trim() || null,
        data.address || null,
        data.status || 'Active'
    ]);
    return {
        customer_id: result.insertId,
        name: data.name.trim(),
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        status: data.status || 'Active'
    };
};
exports.createCustomer = createCustomer;
// ── UPDATE ────────────────────────────────────────────────────
const updateCustomer = async (id, data) => {
    (0, email_validation_1.requireValidEmail)(data.email, true);
    await requireUniqueContact(data.email, data.phone, id);
    const [result] = await db_1.default.query(`
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
        data.address || null,
        data.status || 'Active',
        id
    ]);
    if (result.affectedRows === 0)
        return null;
    return {
        customer_id: id,
        name: data.name?.trim() ?? '',
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        status: data.status || 'Active'
    };
};
exports.updateCustomer = updateCustomer;
// ── DELETE ────────────────────────────────────────────────────
const deleteCustomer = async (id) => {
    const [result] = await db_1.default.query(`DELETE FROM customer WHERE customer_id = ?`, [id]);
    return result.affectedRows > 0;
};
exports.deleteCustomer = deleteCustomer;
// ── SEARCH ────────────────────────────────────────────────────
// Used if you ever need server-side search
const searchCustomers = async (query) => {
    const term = `%${query}%`;
    const [rows] = await db_1.default.query(`
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
    return rows;
};
exports.searchCustomers = searchCustomers;
