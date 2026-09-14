import pool from '../config/db';
import { RowDataPacket } from 'mysql2';

const requireUniqueMaterialDimensions = async (
  name: string,
  height: number,
  width: number,
  excludeMaterialId?: number
): Promise<void> => {
  const params: Array<string | number> = [name.trim().toLowerCase(), height, width];
  let sql = `
    SELECT material_id
    FROM material
    WHERE LOWER(TRIM(material_name)) = ?
      AND height = ?
      AND width = ?`;
  if (excludeMaterialId !== undefined) {
    sql += ' AND material_id <> ?';
    params.push(excludeMaterialId);
  }
  sql += ' LIMIT 1';

  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  if (rows.length) throw new Error('DUPLICATE_MATERIAL');
};

// ── MATERIALS ─────────────────────────────────────────────────
export const fetchAllMaterials = async () => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       m.material_id  AS sid,
       m.material_name AS name,
       m.unit_price   AS costPerUnit,
       m.height,
       m.width,
       s.category     AS category
     FROM material m
     LEFT JOIN supply s ON m.supply_id = s.supply_id
     ORDER BY m.material_id ASC`
  );
  return rows;
};

export const createMaterial = async (data: any) => {
  const cost = Number(data.costPerUnit);
  const height = Number(data.height);
  const width = Number(data.width);
  if (!data.name?.trim() || cost <= 0 || height <= 0 || width <= 0) {
    throw new Error('INVALID_MATERIAL');
  }
  await requireUniqueMaterialDimensions(data.name, height, width);
  const [result]: any = await pool.query(
    `INSERT INTO material (material_name, unit_price, height, width, supply_id)
     VALUES (?, ?, ?, ?, 1)`,
    [data.name.trim(), cost, height, width]
  );
  return { sid: result.insertId, ...data };
};

export const updateMaterial = async (id: number, data: any) => {
  const cost = Number(data.costPerUnit);
  const height = Number(data.height);
  const width = Number(data.width);
  if (!data.name?.trim() || cost <= 0 || height <= 0 || width <= 0) {
    throw new Error('INVALID_MATERIAL');
  }
  await requireUniqueMaterialDimensions(data.name, height, width, id);
  await pool.query(
    `UPDATE material
     SET material_name=?, unit_price=?, height=?, width=?
     WHERE material_id=?`,
    [data.name.trim(), cost, height, width, id]
  );
  return { sid: id, ...data };
};

export const deleteMaterial = async (id: number) => {
  await pool.query(`DELETE FROM material WHERE material_id=?`, [id]);
  return { message: 'Deleted' };
};


// ── PRINTING SLABS ────────────────────────────────────────────
// ── PRINTING SLABS ───────────────────────────────────────────
export const fetchAllPrintingSlabs = async () => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       slab_id    AS sid,
       color_type AS name,
       min_qty,
       max_qty,
       price_per_unit AS price
     FROM printing_slab
     ORDER BY color_type ASC, min_qty ASC`
  );
  return rows;
};

export const createPrintingSlab = async (data: any) => {
  const color = data.name;
  const minQty = Number(data.min_qty);
  const maxQty = Number(data.max_qty);
  const price = Number(data.price);
  if (!['1color', '4color'].includes(color) || !Number.isInteger(minQty) || minQty <= 0 ||
      !Number.isInteger(maxQty) || maxQty <= 0 || minQty > maxQty ||
      !Number.isFinite(price) || price <= 0) throw new Error('INVALID_PRINTING_SLAB');
  const [duplicates] = await pool.query<RowDataPacket[]>(
    `SELECT slab_id FROM printing_slab WHERE color_type=? AND min_qty=? AND max_qty=? LIMIT 1`,
    [color, minQty, maxQty]
  );
  if (duplicates.length) throw new Error('DUPLICATE_PRINTING_SLAB');
  const [overlaps] = await pool.query<RowDataPacket[]>(
    `SELECT slab_id, min_qty, max_qty
     FROM printing_slab
     WHERE color_type=? AND min_qty<=? AND max_qty>=?
     LIMIT 1`,
    [color, maxQty, minQty]
  );
  if (overlaps.length) throw new Error('OVERLAPPING_PRINTING_SLAB');
  const [result]: any = await pool.query(
    `INSERT INTO printing_slab (color_type, min_qty, max_qty, price_per_unit, supply_id)
     VALUES (?, ?, ?, ?, 2)`,
    [color, minQty, maxQty, price]
  );
  return { sid: result.insertId, ...data };
};

export const updatePrintingSlab = async (id: number, data: any) => {
  const color = data.name;
  const minQty = Number(data.min_qty);
  const maxQty = Number(data.max_qty);
  const price = Number(data.price);
  if (!['1color', '4color'].includes(color) || !Number.isInteger(minQty) || minQty <= 0 ||
      !Number.isInteger(maxQty) || maxQty <= 0 || minQty > maxQty ||
      !Number.isFinite(price) || price <= 0) throw new Error('INVALID_PRINTING_SLAB');
  const [duplicates] = await pool.query<RowDataPacket[]>(
    `SELECT slab_id FROM printing_slab
     WHERE color_type=? AND min_qty=? AND max_qty=? AND slab_id<>? LIMIT 1`,
    [color, minQty, maxQty, id]
  );
  if (duplicates.length) throw new Error('DUPLICATE_PRINTING_SLAB');
  const [overlaps] = await pool.query<RowDataPacket[]>(
    `SELECT slab_id, min_qty, max_qty
     FROM printing_slab
     WHERE color_type=? AND min_qty<=? AND max_qty>=? AND slab_id<>?
     LIMIT 1`,
    [color, maxQty, minQty, id]
  );
  if (overlaps.length) throw new Error('OVERLAPPING_PRINTING_SLAB');
  await pool.query(
    `UPDATE printing_slab
     SET color_type=?, min_qty=?, max_qty=?, price_per_unit=?
     WHERE slab_id=?`,
    [color, minQty, maxQty, price, id]
  );
  return { sid: id, ...data };
};

export const deletePrintingSlab = async (id: number) => {
  await pool.query(`DELETE FROM printing_slab WHERE slab_id=?`, [id]);
  return { message: 'Deleted' };
};


// ── BINDING TYPES ─────────────────────────────────────────────
export const fetchAllBindingTypes = async () => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT binding_id AS sid, binding_name AS name,
            min_pages, max_pages, price
     FROM binding_type ORDER BY binding_id ASC`
  );
  return rows;
};

export const createBindingType = async (data: any) => {
  const name = data.name?.trim();
  const minPages = Number(data.min_pages);
  const maxPages = Number(data.max_pages);
  const price = Number(data.price);
  if (!name || !Number.isInteger(minPages) || minPages <= 0 ||
      !Number.isInteger(maxPages) || maxPages <= 0 || minPages > maxPages ||
      !Number.isFinite(price) || price <= 0) throw new Error('INVALID_BINDING_TYPE');
  const [duplicates] = await pool.query<RowDataPacket[]>(
    `SELECT binding_id FROM binding_type
     WHERE LOWER(TRIM(binding_name))=LOWER(?) AND min_pages=? AND max_pages=? LIMIT 1`,
    [name, minPages, maxPages]
  );
  if (duplicates.length) throw new Error('DUPLICATE_BINDING_RANGE');
  const [overlaps] = await pool.query<RowDataPacket[]>(
    `SELECT binding_id FROM binding_type
     WHERE LOWER(TRIM(binding_name))=LOWER(?) AND min_pages<=? AND max_pages>=? LIMIT 1`,
    [name, maxPages, minPages]
  );
  if (overlaps.length) throw new Error('OVERLAPPING_BINDING_RANGE');
  const [result]: any = await pool.query(
    `INSERT INTO binding_type (binding_name, min_pages, max_pages, price, supply_id)
     VALUES (?, ?, ?, ?, 3)`,
    [name, minPages, maxPages, price]
  );
  return { sid: result.insertId, ...data };
};

export const updateBindingType = async (id: number, data: any) => {
  const name = data.name?.trim();
  const minPages = Number(data.min_pages);
  const maxPages = Number(data.max_pages);
  const price = Number(data.price);
  if (!name || !Number.isInteger(minPages) || minPages <= 0 ||
      !Number.isInteger(maxPages) || maxPages <= 0 || minPages > maxPages ||
      !Number.isFinite(price) || price <= 0) throw new Error('INVALID_BINDING_TYPE');
  const [duplicates] = await pool.query<RowDataPacket[]>(
    `SELECT binding_id FROM binding_type
     WHERE LOWER(TRIM(binding_name))=LOWER(?) AND min_pages=? AND max_pages=?
       AND binding_id<>? LIMIT 1`,
    [name, minPages, maxPages, id]
  );
  if (duplicates.length) throw new Error('DUPLICATE_BINDING_RANGE');
  const [overlaps] = await pool.query<RowDataPacket[]>(
    `SELECT binding_id FROM binding_type
     WHERE LOWER(TRIM(binding_name))=LOWER(?) AND min_pages<=? AND max_pages>=?
       AND binding_id<>? LIMIT 1`,
    [name, maxPages, minPages, id]
  );
  if (overlaps.length) throw new Error('OVERLAPPING_BINDING_RANGE');
  await pool.query(
    `UPDATE binding_type
     SET binding_name=?, min_pages=?, max_pages=?, price=?
     WHERE binding_id=?`,
    [name, minPages, maxPages, price, id]
  );
  return { sid: id, ...data };
};

export const deleteBindingType = async (id: number) => {
  await pool.query(`DELETE FROM binding_type WHERE binding_id=?`, [id]);
  return { message: 'Deleted' };
};


// ── LAMINATION TYPES ──────────────────────────────────────────
export const fetchAllLaminationTypes = async () => {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT
      lt.lamination_id  AS sid,
      lt.lamination_name AS name,
      lt.price_per_unit  AS price,
      lt.size_id,
      s.size_name        AS size,
      s.height,
      s.width
    FROM lamination_type lt
    LEFT JOIN standards s ON lt.size_id = s.size_id
    ORDER BY lt.lamination_id ASC
  `);
  return rows;
};

export const createLaminationType = async (data: any) => {
  const name = data.name?.trim();
  const price = Number(data.price);
  const sizeId = Number(data.size_id);
  if (!name || !Number.isFinite(price) || price <= 0 || !Number.isInteger(sizeId) || sizeId <= 0) {
    throw new Error('INVALID_LAMINATION_TYPE');
  }
  const [sizes] = await pool.query<RowDataPacket[]>(`SELECT size_id FROM standards WHERE size_id=? LIMIT 1`, [sizeId]);
  if (!sizes.length) throw new Error('INVALID_LAMINATION_TYPE');
  const [duplicates] = await pool.query<RowDataPacket[]>(
    `SELECT lamination_id FROM lamination_type
     WHERE LOWER(TRIM(lamination_name))=LOWER(?) AND size_id=? LIMIT 1`, [name, sizeId]
  );
  if (duplicates.length) throw new Error('DUPLICATE_LAMINATION_TYPE');
  const [result]: any = await pool.query(
    `INSERT INTO lamination_type (lamination_name, price_per_unit, supply_id, size_id)
     VALUES (?, ?, 4, ?)`,
    [name, price, sizeId]
  );
  return { sid: result.insertId, ...data };
};

export const updateLaminationType = async (id: number, data: any) => {
  const name = data.name?.trim();
  const price = Number(data.price);
  const sizeId = Number(data.size_id);
  if (!name || !Number.isFinite(price) || price <= 0 || !Number.isInteger(sizeId) || sizeId <= 0) {
    throw new Error('INVALID_LAMINATION_TYPE');
  }
  const [sizes] = await pool.query<RowDataPacket[]>(`SELECT size_id FROM standards WHERE size_id=? LIMIT 1`, [sizeId]);
  if (!sizes.length) throw new Error('INVALID_LAMINATION_TYPE');
  const [duplicates] = await pool.query<RowDataPacket[]>(
    `SELECT lamination_id FROM lamination_type
     WHERE LOWER(TRIM(lamination_name))=LOWER(?) AND size_id=? AND lamination_id<>? LIMIT 1`,
    [name, sizeId, id]
  );
  if (duplicates.length) throw new Error('DUPLICATE_LAMINATION_TYPE');
  await pool.query(
    `UPDATE lamination_type
     SET lamination_name = ?,
         price_per_unit  = ?,
         size_id         = ?
     WHERE lamination_id = ?`,
    [name, price, sizeId, id]
  );
  return await fetchLaminationById(id);
};

// Helper — fetch single after update
const fetchLaminationById = async (id: number) => {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT
      lt.lamination_id  AS sid,
      lt.lamination_name AS name,
      lt.price_per_unit  AS price,
      lt.size_id,
      s.size_name        AS size,
      s.height,
      s.width
    FROM lamination_type lt
    LEFT JOIN standards s ON lt.size_id = s.size_id
    WHERE lt.lamination_id = ?
  `, [id]);
  return rows[0];
};

export const deleteLaminationType = async (id: number) => {
  await pool.query(`DELETE FROM lamination_type WHERE lamination_id=?`, [id]);
  return { message: 'Deleted' };
};

// ── STANDARDS ─────────────────────────────────────────────────
export const fetchAllStandards = async () => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT size_id, size_name, height, width
     FROM standards
     ORDER BY size_id ASC`
  );
  return rows;
};

export const createStandard = async (data: any) => {
  const name = data.size_name?.trim();
  const height = Number(data.height);
  const width = Number(data.width);
  if (!name || !Number.isFinite(height) || height <= 0 || !Number.isFinite(width) || width <= 0) {
    throw new Error('INVALID_STANDARD');
  }
  const [result]: any = await pool.query(
    `INSERT INTO standards (size_name, height, width)
     VALUES (?, ?, ?)`,
    [name, height, width]
  );
  return {
    size_id: result.insertId,
    size_name: name,
    height,
    width
  };
};

export const updateStandard = async (id: number, data: any) => {
  const name = data.size_name?.trim();
  const height = Number(data.height);
  const width = Number(data.width);
  if (!name || !Number.isFinite(height) || height <= 0 || !Number.isFinite(width) || width <= 0) {
    throw new Error('INVALID_STANDARD');
  }
  await pool.query(
    `UPDATE standards
     SET size_name = ?,
         height = ?,
         width = ?
     WHERE size_id = ?`,
    [name, height, width, id]
  );
  return {
    size_id: id,
    size_name: name,
    height,
    width
  };
};

export const deleteStandard = async (id: number) => {
  await pool.query(`DELETE FROM standards WHERE size_id = ?`, [id]);
  return { message: 'Deleted' };
};
