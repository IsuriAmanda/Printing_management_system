import pool from '../config/db';
import { RowDataPacket } from 'mysql2';
import {
  CreateQuotationRequest,
  QuotationPayload
} from '../models/quotation.model';
import { createNotificationForRoles } from './notification.service';
import { requireValidEmail } from '../utils/email-validation';

const inactiveCustomerError = () =>
  new Error('New quotations cannot be created for an inactive customer');


// ── READ ALL (OPTIMIZED WITH SINGLE JOIN FETCH) ────────────────────────────────
export const fetchAllQuotations = async () => {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT 
      q.*,
      c.name  AS customer_name,
      c.phone AS phone,
      c.email AS email,
      c.address AS address,
      j.job_id AS associated_job_id
    FROM quotation q
    LEFT JOIN customer c ON q.customer_id = c.customer_id
    LEFT JOIN job_ticket j ON q.id = j.quotation_id
    ORDER BY q.id DESC
  `);
  return rows;
};


// ── READ ONE (OPTIMIZED WITH TRACKING ATTRIBUTE) ────────────────────────────────
export const fetchQuotationById = async (id: number) => {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT
      q.*,
      c.name  AS customer_name,
      c.phone AS phone,
      c.email AS email,
      c.address AS address,
      j.job_id AS associated_job_id,
      qi.item_id,
      qi.quantity,
      qi.width,
      qi.height,
      qi.pages,
      qi.front_color_pages,
      qi.back_color_pages,
      qi.cover_front_color_pages,
      qi.cover_back_color_pages,
      qi.material_id,
      qi.binding_id,
      qi.lamination_id,
      qi.total_cost    AS item_total_cost
    FROM quotation q
    LEFT JOIN customer    c  ON q.customer_id  = c.customer_id
    LEFT JOIN job_ticket  j  ON q.id           = j.quotation_id
    LEFT JOIN quotation_item qi ON q.id        = qi.quotation_id
    WHERE q.id = ?
    LIMIT 1
  `, [id]);
  return rows[0];
};


// ── CREATE / QUICK-CONFIRM FLOW ────────────────────────────────────────────────
export const createQuotation = async (data: CreateQuotationRequest) => {
  requireValidEmail(data.email, true);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const phone = data.phone;
    const email = data.email;
    
    // Explicit Fallback validation to support custom structural overrides
    const targetedStatus = data.status ? data.status.toUpperCase() : 'DRAFT';

    // 1. Find existing customer by email OR phone
    const [customerRows]: any = await connection.query(
      `SELECT customer_id, status FROM customer 
       WHERE email = ? OR phone = ? 
       LIMIT 1`,
      [email, phone]
    );

    let customerId: number;

    if (customerRows.length > 0) {
      if (customerRows[0].status === 'Inactive') throw inactiveCustomerError();
      customerId = customerRows[0].customer_id;
    } else {
      const [newCustomer]: any = await connection.query(
        `INSERT INTO customer (name, phone, email, address)
         VALUES (?, ?, ?, ?)`,
        [data.customer_name, phone, email, data.address || '']
      );
      customerId = newCustomer.insertId;
    }

    // 2. Insert quotation row — using targetedStatus configuration bypass values
    // 1. Generate a temporary unique quotation number
    const tempQuotationNumber = `QT-${Date.now()}`;

    // 2. Insert quotation row
    const [result]: any = await connection.query(
      `INSERT INTO quotation
         (quotation_number, customer_id, base_cost, extra_charges,
          profit_margin, total_cost, status, job_name, job_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tempQuotationNumber, 
        customerId,
        0.00,
        0.00,
        0.00,
        0.00,
        targetedStatus,
        data.job_name || '',
        data.job_type || 'book'
      ]
    );

    if (targetedStatus === 'CONFIRMED') {
      await createNotificationForRoles(
        ['Admin'],
        `Quotation ${tempQuotationNumber} has been confirmed`,
        'STATUS_UPDATE'
      );
    }

    await connection.commit();

    return {
      id: result.insertId,
      customer_id: customerId,
      customer_name: data.customer_name,
      job_name: data.job_name,
      job_type: data.job_type,
      status: targetedStatus,
      associated_job_id: null
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};


// ── SAVE DETAILS (Step 2) ─────────────────────────────────────────────────────
const requireValidQuotationDetails = (quotation: any, item: any): void => {
  const validJobType = quotation?.job_type === 'book' || quotation?.job_type === 'leaflet';
  const validPages = quotation?.job_type !== 'book' ||
    (Number.isInteger(Number(item?.pages)) && Number(item.pages) > 0);
  if (!quotation?.job_name?.trim() || !validJobType ||
      !Number.isFinite(Number(item?.quantity)) || Number(item.quantity) <= 0 ||
      !Number.isFinite(Number(item?.width)) || Number(item.width) <= 0 ||
      !Number.isFinite(Number(item?.height)) || Number(item.height) <= 0 ||
      !validPages || !Number.isInteger(Number(item?.material_id)) || Number(item.material_id) <= 0) {
    throw new Error('INVALID_QUOTATION_DETAILS');
  }
};

const requireJobFitsMaterial = async (db: any, item: any): Promise<void> => {
  const [materials]: any = await db.query(
    `SELECT width, height FROM material WHERE material_id=? LIMIT 1`,
    [Number(item.material_id)]
  );
  if (!materials.length) throw new Error('INVALID_QUOTATION_DETAILS');
  const jobWidth = Number(item.width);
  const jobHeight = Number(item.height);
  const sheetWidth = Number(materials[0].width);
  const sheetHeight = Number(materials[0].height);
  const fitsNormally = jobWidth <= sheetWidth && jobHeight <= sheetHeight;
  const fitsRotated = jobWidth <= sheetHeight && jobHeight <= sheetWidth;
  if (!fitsNormally && !fitsRotated) throw new Error('JOB_LARGER_THAN_MATERIAL');
};

const requireMatchingPrintingSlabs = async (db: any, quotation: any, item: any): Promise<void> => {
  const requirements: Array<{ color: string; quantity: number }> = [];
  const addRequirement = (colorPages: unknown, quantity: number) => {
    const color = Number(colorPages) === 4 ? '4color' : Number(colorPages) === 1 ? '1color' : null;
    if (color && quantity > 0 && !requirements.some(r => r.color === color && r.quantity === quantity)) {
      requirements.push({ color, quantity });
    }
  };

  const jobQty = Number(item.quantity);
  if (quotation.job_type === 'book') {
    const insideUnitsPerBook = Math.ceil(Math.max(Number(item.pages) - 2, 0) / 2);
    addRequirement(item.front_color_pages, insideUnitsPerBook);
    addRequirement(item.back_color_pages, insideUnitsPerBook);
    addRequirement(item.cover_front_color_pages, jobQty);
    addRequirement(item.cover_back_color_pages, jobQty);
  } else {
    addRequirement(item.front_color_pages, jobQty);
    addRequirement(item.back_color_pages, jobQty);
  }

  for (const requirement of requirements) {
    const [rows]: any = await db.query(
      `SELECT slab_id FROM printing_slab
       WHERE color_type=? AND min_qty<=? AND max_qty>=? LIMIT 1`,
      [requirement.color, requirement.quantity, requirement.quantity]
    );
    if (!rows.length) {
      throw new Error(`MISSING_PRINTING_SLAB:${requirement.color}:${requirement.quantity}`);
    }
  }
};

export const createQuotationWithDetails = async (payload: any) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { customer = {}, quotation, item } = payload;
    requireValidEmail(customer.email, true);
    requireValidQuotationDetails(quotation, item);
    await requireJobFitsMaterial(connection, item);
    await requireMatchingPrintingSlabs(connection, quotation, item);
    const phone = customer.phone || '';
    const email = customer.email || '';
    let customerId = Number(customer.customer_id) || null;

    if (customerId) {
      const [selectedCustomers]: any = await connection.query(
        `SELECT status FROM customer WHERE customer_id = ? LIMIT 1`,
        [customerId]
      );

      if (!selectedCustomers.length) {
        throw new Error('Selected customer not found');
      }
      if (selectedCustomers[0].status === 'Inactive') {
        throw inactiveCustomerError();
      }
    }

    if (!customerId && (email || phone)) {
      const clauses: string[] = [];
      const params: any[] = [];

      if (email) {
        clauses.push('email = ?');
        params.push(email);
      }

      if (phone) {
        clauses.push('phone = ?');
        params.push(phone);
      }

      const [customerRows]: any = await connection.query(
        `SELECT customer_id, status FROM customer WHERE ${clauses.join(' OR ')} LIMIT 1`,
        params
      );

      if (customerRows.length > 0) {
        if (customerRows[0].status === 'Inactive') throw inactiveCustomerError();
        customerId = customerRows[0].customer_id;
      }
    }

    if (!customerId) {
      const [newCustomer]: any = await connection.query(
        `INSERT INTO customer (name, phone, email, address)
         VALUES (?, ?, ?, ?)`,
        [
          customer.customer_name || customer.name || '',
          phone,
          email,
          customer.address || ''
        ]
      );
      customerId = newCustomer.insertId;
    }

    const quotationNumber = `QT-${Date.now()}`;
    const status = (quotation.status || 'DRAFT').toUpperCase();

    const [quotationResult]: any = await connection.query(
      `INSERT INTO quotation
         (quotation_number, customer_id, base_cost, extra_charges,
          profit_margin, total_cost, status, job_name, job_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quotationNumber,
        customerId,
        quotation.base_cost || 0,
        quotation.extra_charges || 0,
        quotation.profit_margin || 0,
        quotation.total_cost || 0,
        status,
        quotation.job_name || '',
        quotation.job_type || 'book'
      ]
    );

    const quotationId = quotationResult.insertId;

    await connection.query(
      `INSERT INTO quotation_item
         (quotation_id, description, quantity, width, height,
          pages, front_color_pages, back_color_pages,
          cover_front_color_pages, cover_back_color_pages,
          material_id, binding_id, lamination_id, total_cost)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quotationId,
        item.description || '',
        item.quantity || 0,
        item.width || 0,
        item.height || 0,
        item.pages || 0,
        item.front_color_pages ?? null,
        item.back_color_pages ?? null,
        item.cover_front_color_pages ?? null,
        item.cover_back_color_pages ?? null,
        item.material_id ?? null,
        item.binding_id ?? null,
        item.lamination_id ?? null,
        item.total_cost || 0
      ]
    );

    await connection.commit();

    const finalQuotation = await fetchQuotationById(quotationId);

    if (status === 'CONFIRMED') {
      await createNotificationForRoles(
        ['Admin'],
        `Quotation ${finalQuotation?.quotation_number ?? quotationId} has been confirmed`,
        'STATUS_UPDATE'
      );
    }

    return finalQuotation;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const saveQuotationDetails = async (
  id: number,
  payload: QuotationPayload
) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { quotation, item } = payload;
    requireValidQuotationDetails(quotation, item);
    await requireJobFitsMaterial(connection, item);
    await requireMatchingPrintingSlabs(connection, quotation, item);

    // 1. Update the quotation row with job details and calculated costs
    await connection.query(
      `UPDATE quotation
       SET job_name      = ?,
           job_type      = ?,
           base_cost     = ?,
           extra_charges = ?,
           profit_margin = ?,
           total_cost    = ?,
           status        = ?
       WHERE id = ?`,
      [
        quotation.job_name,
        quotation.job_type,
        quotation.base_cost     || 0,
        quotation.extra_charges || 0,
        quotation.profit_margin || 0,
        quotation.total_cost    || 0,
        (quotation.status       || 'DRAFT').toUpperCase(),
        id
      ]
    );

    // 2. Check if quotation_item already exists for this quotation
    const [existingItem]: any = await connection.query(
      `SELECT item_id FROM quotation_item WHERE quotation_id = ? LIMIT 1`,
      [id]
    );

    if (existingItem.length > 0) {
      await connection.query(
        `UPDATE quotation_item
         SET description             = ?,
             quantity                = ?,
             width                   = ?,
             height                  = ?,
             pages                   = ?,
             front_color_pages       = ?,
             back_color_pages        = ?,
             cover_front_color_pages = ?,
             cover_back_color_pages  = ?,
             material_id             = ?,
             binding_id              = ?,
             lamination_id           = ?,
             total_cost              = ?
         WHERE quotation_id = ?`,
        [
          item.description             || '',
          item.quantity                || 0,
          item.width                   || 0,
          item.height                  || 0,
          item.pages                   || 0,
          item.front_color_pages       ?? null,
          item.back_color_pages        ?? null,
          item.cover_front_color_pages ?? null,
          item.cover_back_color_pages  ?? null,
          item.material_id             ?? null,
          item.binding_id              ?? null,
          item.lamination_id           ?? null,
          item.total_cost              || 0,
          id
        ]
      );
    } else {
      // FIX: Added the missing 15th '?' placeholder to match the column lists exactly
      await connection.query(
        `INSERT INTO quotation_item
           (quotation_id, description, quantity, width, height,
            pages, front_color_pages, back_color_pages,
            cover_front_color_pages, cover_back_color_pages,
            material_id, binding_id, lamination_id, total_cost)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          item.description             || '',
          item.quantity                || 0,
          item.width                   || 0,
          item.height                  || 0,
          item.pages                   || 0,
          item.front_color_pages       ?? null,
          item.back_color_pages        ?? null,
          item.cover_front_color_pages ?? null,
          item.cover_back_color_pages  ?? null,
          item.material_id             ?? null,
          item.binding_id              ?? null,
          item.lamination_id           ?? null,
          item.total_cost              || 0
        ]
      );
    }

    await connection.commit();
    
    const finalQuotation = await fetchQuotationById(id);
    
    // Check if it was just saved as CONFIRMED
    const upperStatus = (quotation.status || 'DRAFT').toUpperCase();
    if (upperStatus === 'CONFIRMED') {
      await createNotificationForRoles(
        ['Admin'],
        `Quotation ${finalQuotation?.quotation_number ?? id} has been confirmed`,
        'STATUS_UPDATE'
      );
    }

    return finalQuotation;

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};


// ── CHANGE STATUS ─────────────────────────────────────────────────────────────
export const updateStatus = async (id: number, status: string) => {
  const upperStatus = status.toUpperCase();

  await pool.query(
    `UPDATE quotation SET status = ? WHERE id = ?`,
    [upperStatus, id]
  );

  if (upperStatus === 'CONFIRMED') {
    const quotation = await fetchQuotationById(id);
    await createNotificationForRoles(
      ['Admin'],
      `Quotation ${quotation?.quotation_number ?? id} has been confirmed`,
      'STATUS_UPDATE'
    );
  }

  return await fetchQuotationById(id);
};


// ── DELETE ────────────────────────────────────────────────────────────────────
export const deleteQuotation = async (id: number) => {
  await pool.query(`DELETE FROM quotation WHERE id = ?`, [id]);
  return { message: 'Deleted successfully' };
};


// ── INLINE QUICK-SAVE MODIFICATIONS ───────────────────────────────────────────
export const updateQuotationBasic = async (id: number, data: any) => {
  const upperStatus = (data.status || 'DRAFT').toUpperCase();
  
  await pool.query(
    `UPDATE quotation 
     SET job_name  = ?,
         total_cost = ?,
         status    = ?
     WHERE id = ?`,
    [
      data.job_name,
      data.total_cost || 0,
      upperStatus,
      id
    ]
  );
  
  const updatedQuotation = await fetchQuotationById(id);
  
  if (upperStatus === 'CONFIRMED') {
    await createNotificationForRoles(
      ['Admin'],
      `Quotation ${updatedQuotation?.quotation_number ?? id} has been confirmed`,
      'STATUS_UPDATE'
    );
  }
  
  return updatedQuotation;
};
