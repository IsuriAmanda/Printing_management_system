"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStandard = exports.updateStandard = exports.createStandard = exports.fetchAllStandards = exports.deleteLaminationType = exports.updateLaminationType = exports.createLaminationType = exports.fetchAllLaminationTypes = exports.deleteBindingType = exports.updateBindingType = exports.createBindingType = exports.fetchAllBindingTypes = exports.deletePrintingSlab = exports.updatePrintingSlab = exports.createPrintingSlab = exports.fetchAllPrintingSlabs = exports.deleteMaterial = exports.updateMaterial = exports.createMaterial = exports.fetchAllMaterials = void 0;
const db_1 = __importDefault(require("../config/db"));
const requireUniqueMaterialDimensions = async (name, height, width, excludeMaterialId) => {
    const params = [name.trim().toLowerCase(), height, width];
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
    const [rows] = await db_1.default.query(sql, params);
    if (rows.length)
        throw new Error('DUPLICATE_MATERIAL');
};
// ── MATERIALS ─────────────────────────────────────────────────
const fetchAllMaterials = async () => {
    const [rows] = await db_1.default.query(`SELECT
       m.material_id  AS sid,
       m.material_name AS name,
       m.unit_price   AS costPerUnit,
       m.height,
       m.width,
       s.category     AS category
     FROM material m
     LEFT JOIN supply s ON m.supply_id = s.supply_id
     ORDER BY m.material_id ASC`);
    return rows;
};
exports.fetchAllMaterials = fetchAllMaterials;
const createMaterial = async (data) => {
    const cost = Number(data.costPerUnit);
    const height = Number(data.height);
    const width = Number(data.width);
    if (!data.name?.trim() || cost <= 0 || height <= 0 || width <= 0) {
        throw new Error('INVALID_MATERIAL');
    }
    await requireUniqueMaterialDimensions(data.name, height, width);
    const [result] = await db_1.default.query(`INSERT INTO material (material_name, unit_price, height, width, supply_id)
     VALUES (?, ?, ?, ?, 1)`, [data.name.trim(), cost, height, width]);
    return { sid: result.insertId, ...data };
};
exports.createMaterial = createMaterial;
const updateMaterial = async (id, data) => {
    const cost = Number(data.costPerUnit);
    const height = Number(data.height);
    const width = Number(data.width);
    if (!data.name?.trim() || cost <= 0 || height <= 0 || width <= 0) {
        throw new Error('INVALID_MATERIAL');
    }
    await requireUniqueMaterialDimensions(data.name, height, width, id);
    await db_1.default.query(`UPDATE material
     SET material_name=?, unit_price=?, height=?, width=?
     WHERE material_id=?`, [data.name.trim(), cost, height, width, id]);
    return { sid: id, ...data };
};
exports.updateMaterial = updateMaterial;
const deleteMaterial = async (id) => {
    await db_1.default.query(`DELETE FROM material WHERE material_id=?`, [id]);
    return { message: 'Deleted' };
};
exports.deleteMaterial = deleteMaterial;
// ── PRINTING SLABS ────────────────────────────────────────────
// ── PRINTING SLABS ───────────────────────────────────────────
const fetchAllPrintingSlabs = async () => {
    const [rows] = await db_1.default.query(`SELECT
       slab_id    AS sid,
       color_type AS name,
       min_qty,
       max_qty,
       price_per_unit AS price
     FROM printing_slab
     ORDER BY color_type ASC, min_qty ASC`);
    return rows;
};
exports.fetchAllPrintingSlabs = fetchAllPrintingSlabs;
const createPrintingSlab = async (data) => {
    const color = data.name;
    const minQty = Number(data.min_qty);
    const maxQty = Number(data.max_qty);
    const price = Number(data.price);
    if (!['1color', '4color'].includes(color) || !Number.isInteger(minQty) || minQty <= 0 ||
        !Number.isInteger(maxQty) || maxQty <= 0 || minQty > maxQty ||
        !Number.isFinite(price) || price <= 0)
        throw new Error('INVALID_PRINTING_SLAB');
    const [duplicates] = await db_1.default.query(`SELECT slab_id FROM printing_slab WHERE color_type=? AND min_qty=? AND max_qty=? LIMIT 1`, [color, minQty, maxQty]);
    if (duplicates.length)
        throw new Error('DUPLICATE_PRINTING_SLAB');
    const [overlaps] = await db_1.default.query(`SELECT slab_id, min_qty, max_qty
     FROM printing_slab
     WHERE color_type=? AND min_qty<=? AND max_qty>=?
     LIMIT 1`, [color, maxQty, minQty]);
    if (overlaps.length)
        throw new Error('OVERLAPPING_PRINTING_SLAB');
    const [result] = await db_1.default.query(`INSERT INTO printing_slab (color_type, min_qty, max_qty, price_per_unit, supply_id)
     VALUES (?, ?, ?, ?, 2)`, [color, minQty, maxQty, price]);
    return { sid: result.insertId, ...data };
};
exports.createPrintingSlab = createPrintingSlab;
const updatePrintingSlab = async (id, data) => {
    const color = data.name;
    const minQty = Number(data.min_qty);
    const maxQty = Number(data.max_qty);
    const price = Number(data.price);
    if (!['1color', '4color'].includes(color) || !Number.isInteger(minQty) || minQty <= 0 ||
        !Number.isInteger(maxQty) || maxQty <= 0 || minQty > maxQty ||
        !Number.isFinite(price) || price <= 0)
        throw new Error('INVALID_PRINTING_SLAB');
    const [duplicates] = await db_1.default.query(`SELECT slab_id FROM printing_slab
     WHERE color_type=? AND min_qty=? AND max_qty=? AND slab_id<>? LIMIT 1`, [color, minQty, maxQty, id]);
    if (duplicates.length)
        throw new Error('DUPLICATE_PRINTING_SLAB');
    const [overlaps] = await db_1.default.query(`SELECT slab_id, min_qty, max_qty
     FROM printing_slab
     WHERE color_type=? AND min_qty<=? AND max_qty>=? AND slab_id<>?
     LIMIT 1`, [color, maxQty, minQty, id]);
    if (overlaps.length)
        throw new Error('OVERLAPPING_PRINTING_SLAB');
    await db_1.default.query(`UPDATE printing_slab
     SET color_type=?, min_qty=?, max_qty=?, price_per_unit=?
     WHERE slab_id=?`, [color, minQty, maxQty, price, id]);
    return { sid: id, ...data };
};
exports.updatePrintingSlab = updatePrintingSlab;
const deletePrintingSlab = async (id) => {
    await db_1.default.query(`DELETE FROM printing_slab WHERE slab_id=?`, [id]);
    return { message: 'Deleted' };
};
exports.deletePrintingSlab = deletePrintingSlab;
// ── BINDING TYPES ─────────────────────────────────────────────
const fetchAllBindingTypes = async () => {
    const [rows] = await db_1.default.query(`SELECT binding_id AS sid, binding_name AS name,
            min_pages, max_pages, price
     FROM binding_type ORDER BY binding_id ASC`);
    return rows;
};
exports.fetchAllBindingTypes = fetchAllBindingTypes;
const createBindingType = async (data) => {
    const name = data.name?.trim();
    const minPages = Number(data.min_pages);
    const maxPages = Number(data.max_pages);
    const price = Number(data.price);
    if (!name || !Number.isInteger(minPages) || minPages <= 0 ||
        !Number.isInteger(maxPages) || maxPages <= 0 || minPages > maxPages ||
        !Number.isFinite(price) || price <= 0)
        throw new Error('INVALID_BINDING_TYPE');
    const [duplicates] = await db_1.default.query(`SELECT binding_id FROM binding_type
     WHERE LOWER(TRIM(binding_name))=LOWER(?) AND min_pages=? AND max_pages=? LIMIT 1`, [name, minPages, maxPages]);
    if (duplicates.length)
        throw new Error('DUPLICATE_BINDING_RANGE');
    const [overlaps] = await db_1.default.query(`SELECT binding_id FROM binding_type
     WHERE LOWER(TRIM(binding_name))=LOWER(?) AND min_pages<=? AND max_pages>=? LIMIT 1`, [name, maxPages, minPages]);
    if (overlaps.length)
        throw new Error('OVERLAPPING_BINDING_RANGE');
    const [result] = await db_1.default.query(`INSERT INTO binding_type (binding_name, min_pages, max_pages, price, supply_id)
     VALUES (?, ?, ?, ?, 3)`, [name, minPages, maxPages, price]);
    return { sid: result.insertId, ...data };
};
exports.createBindingType = createBindingType;
const updateBindingType = async (id, data) => {
    const name = data.name?.trim();
    const minPages = Number(data.min_pages);
    const maxPages = Number(data.max_pages);
    const price = Number(data.price);
    if (!name || !Number.isInteger(minPages) || minPages <= 0 ||
        !Number.isInteger(maxPages) || maxPages <= 0 || minPages > maxPages ||
        !Number.isFinite(price) || price <= 0)
        throw new Error('INVALID_BINDING_TYPE');
    const [duplicates] = await db_1.default.query(`SELECT binding_id FROM binding_type
     WHERE LOWER(TRIM(binding_name))=LOWER(?) AND min_pages=? AND max_pages=?
       AND binding_id<>? LIMIT 1`, [name, minPages, maxPages, id]);
    if (duplicates.length)
        throw new Error('DUPLICATE_BINDING_RANGE');
    const [overlaps] = await db_1.default.query(`SELECT binding_id FROM binding_type
     WHERE LOWER(TRIM(binding_name))=LOWER(?) AND min_pages<=? AND max_pages>=?
       AND binding_id<>? LIMIT 1`, [name, maxPages, minPages, id]);
    if (overlaps.length)
        throw new Error('OVERLAPPING_BINDING_RANGE');
    await db_1.default.query(`UPDATE binding_type
     SET binding_name=?, min_pages=?, max_pages=?, price=?
     WHERE binding_id=?`, [name, minPages, maxPages, price, id]);
    return { sid: id, ...data };
};
exports.updateBindingType = updateBindingType;
const deleteBindingType = async (id) => {
    await db_1.default.query(`DELETE FROM binding_type WHERE binding_id=?`, [id]);
    return { message: 'Deleted' };
};
exports.deleteBindingType = deleteBindingType;
// ── LAMINATION TYPES ──────────────────────────────────────────
const fetchAllLaminationTypes = async () => {
    const [rows] = await db_1.default.query(`
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
exports.fetchAllLaminationTypes = fetchAllLaminationTypes;
const createLaminationType = async (data) => {
    const name = data.name?.trim();
    const price = Number(data.price);
    const sizeId = Number(data.size_id);
    if (!name || !Number.isFinite(price) || price <= 0 || !Number.isInteger(sizeId) || sizeId <= 0) {
        throw new Error('INVALID_LAMINATION_TYPE');
    }
    const [sizes] = await db_1.default.query(`SELECT size_id FROM standards WHERE size_id=? LIMIT 1`, [sizeId]);
    if (!sizes.length)
        throw new Error('INVALID_LAMINATION_TYPE');
    const [duplicates] = await db_1.default.query(`SELECT lamination_id FROM lamination_type
     WHERE LOWER(TRIM(lamination_name))=LOWER(?) AND size_id=? LIMIT 1`, [name, sizeId]);
    if (duplicates.length)
        throw new Error('DUPLICATE_LAMINATION_TYPE');
    const [result] = await db_1.default.query(`INSERT INTO lamination_type (lamination_name, price_per_unit, supply_id, size_id)
     VALUES (?, ?, 4, ?)`, [name, price, sizeId]);
    return { sid: result.insertId, ...data };
};
exports.createLaminationType = createLaminationType;
const updateLaminationType = async (id, data) => {
    const name = data.name?.trim();
    const price = Number(data.price);
    const sizeId = Number(data.size_id);
    if (!name || !Number.isFinite(price) || price <= 0 || !Number.isInteger(sizeId) || sizeId <= 0) {
        throw new Error('INVALID_LAMINATION_TYPE');
    }
    const [sizes] = await db_1.default.query(`SELECT size_id FROM standards WHERE size_id=? LIMIT 1`, [sizeId]);
    if (!sizes.length)
        throw new Error('INVALID_LAMINATION_TYPE');
    const [duplicates] = await db_1.default.query(`SELECT lamination_id FROM lamination_type
     WHERE LOWER(TRIM(lamination_name))=LOWER(?) AND size_id=? AND lamination_id<>? LIMIT 1`, [name, sizeId, id]);
    if (duplicates.length)
        throw new Error('DUPLICATE_LAMINATION_TYPE');
    await db_1.default.query(`UPDATE lamination_type
     SET lamination_name = ?,
         price_per_unit  = ?,
         size_id         = ?
     WHERE lamination_id = ?`, [name, price, sizeId, id]);
    return await fetchLaminationById(id);
};
exports.updateLaminationType = updateLaminationType;
// Helper — fetch single after update
const fetchLaminationById = async (id) => {
    const [rows] = await db_1.default.query(`
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
const deleteLaminationType = async (id) => {
    await db_1.default.query(`DELETE FROM lamination_type WHERE lamination_id=?`, [id]);
    return { message: 'Deleted' };
};
exports.deleteLaminationType = deleteLaminationType;
// ── STANDARDS ─────────────────────────────────────────────────
const fetchAllStandards = async () => {
    const [rows] = await db_1.default.query(`SELECT size_id, size_name, height, width
     FROM standards
     ORDER BY size_id ASC`);
    return rows;
};
exports.fetchAllStandards = fetchAllStandards;
const createStandard = async (data) => {
    const name = data.size_name?.trim();
    const height = Number(data.height);
    const width = Number(data.width);
    if (!name || !Number.isFinite(height) || height <= 0 || !Number.isFinite(width) || width <= 0) {
        throw new Error('INVALID_STANDARD');
    }
    const [result] = await db_1.default.query(`INSERT INTO standards (size_name, height, width)
     VALUES (?, ?, ?)`, [name, height, width]);
    return {
        size_id: result.insertId,
        size_name: name,
        height,
        width
    };
};
exports.createStandard = createStandard;
const updateStandard = async (id, data) => {
    const name = data.size_name?.trim();
    const height = Number(data.height);
    const width = Number(data.width);
    if (!name || !Number.isFinite(height) || height <= 0 || !Number.isFinite(width) || width <= 0) {
        throw new Error('INVALID_STANDARD');
    }
    await db_1.default.query(`UPDATE standards
     SET size_name = ?,
         height = ?,
         width = ?
     WHERE size_id = ?`, [name, height, width, id]);
    return {
        size_id: id,
        size_name: name,
        height,
        width
    };
};
exports.updateStandard = updateStandard;
const deleteStandard = async (id) => {
    await db_1.default.query(`DELETE FROM standards WHERE size_id = ?`, [id]);
    return { message: 'Deleted' };
};
exports.deleteStandard = deleteStandard;
