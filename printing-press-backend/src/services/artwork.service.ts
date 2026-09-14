import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import fs from 'fs';
import path from 'path';

export const fetchArtworkForQuotation = async (quotationId: number) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM artwork WHERE quotation_id = ? ORDER BY uploaded_at DESC`,
    [quotationId]
  );
  return rows.map(withFileAvailability);
};

const withFileAvailability = (row: RowDataPacket) => ({
  ...row,
  file_available: fs.existsSync(path.join(process.cwd(), String(row.file_path).replace(/^[/\\]+/, '')))
});

// Follows job_ticket.quotation_id to find artwork for a job (read-only view)
export const fetchArtworkForJob = async (jobId: number) => {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT a.* FROM artwork a
    JOIN job_ticket jt ON jt.quotation_id = a.quotation_id
    WHERE jt.job_id = ?
    ORDER BY a.uploaded_at DESC
  `, [jobId]);
  return rows.map(withFileAvailability);
};

export const saveArtworkRecord = async (
  quotationId: number, fileName: string, filePath: string
) => {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO artwork (quotation_id, file_name, file_path) VALUES (?, ?, ?)`,
    [quotationId, fileName, filePath]
  );
  return { artwork_id: result.insertId, quotation_id: quotationId, file_name: fileName, file_path: filePath };
};

export const deleteArtworkRecord = async (artworkId: number): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT file_path FROM artwork WHERE artwork_id = ?`, [artworkId]
  );
  if (rows.length === 0) return false;

  const filePath = path.join(__dirname, '../../uploads/artwork', path.basename(rows[0].file_path));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM artwork WHERE artwork_id = ?`, [artworkId]
  );
  return result.affectedRows > 0;
};
