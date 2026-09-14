"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteArtworkRecord = exports.saveArtworkRecord = exports.fetchArtworkForJob = exports.fetchArtworkForQuotation = void 0;
const db_1 = __importDefault(require("../config/db"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fetchArtworkForQuotation = async (quotationId) => {
    const [rows] = await db_1.default.query(`SELECT * FROM artwork WHERE quotation_id = ? ORDER BY uploaded_at DESC`, [quotationId]);
    return rows.map(withFileAvailability);
};
exports.fetchArtworkForQuotation = fetchArtworkForQuotation;
const withFileAvailability = (row) => ({
    ...row,
    file_available: fs_1.default.existsSync(path_1.default.join(process.cwd(), String(row.file_path).replace(/^[/\\]+/, '')))
});
// Follows job_ticket.quotation_id to find artwork for a job (read-only view)
const fetchArtworkForJob = async (jobId) => {
    const [rows] = await db_1.default.query(`
    SELECT a.* FROM artwork a
    JOIN job_ticket jt ON jt.quotation_id = a.quotation_id
    WHERE jt.job_id = ?
    ORDER BY a.uploaded_at DESC
  `, [jobId]);
    return rows.map(withFileAvailability);
};
exports.fetchArtworkForJob = fetchArtworkForJob;
const saveArtworkRecord = async (quotationId, fileName, filePath) => {
    const [result] = await db_1.default.query(`INSERT INTO artwork (quotation_id, file_name, file_path) VALUES (?, ?, ?)`, [quotationId, fileName, filePath]);
    return { artwork_id: result.insertId, quotation_id: quotationId, file_name: fileName, file_path: filePath };
};
exports.saveArtworkRecord = saveArtworkRecord;
const deleteArtworkRecord = async (artworkId) => {
    const [rows] = await db_1.default.query(`SELECT file_path FROM artwork WHERE artwork_id = ?`, [artworkId]);
    if (rows.length === 0)
        return false;
    const filePath = path_1.default.join(__dirname, '../../uploads/artwork', path_1.default.basename(rows[0].file_path));
    if (fs_1.default.existsSync(filePath))
        fs_1.default.unlinkSync(filePath);
    const [result] = await db_1.default.query(`DELETE FROM artwork WHERE artwork_id = ?`, [artworkId]);
    return result.affectedRows > 0;
};
exports.deleteArtworkRecord = deleteArtworkRecord;
