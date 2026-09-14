import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { createNotification, createNotificationForRoles } from './notification.service';
// TEMPORARILY DISABLED (requires internet/SMTP):
// import { sendOperatorMachineAssignmentEmail } from './email.service';

const dateOnly = (value: Date = new Date()): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeAssignmentDate = (date: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Invalid assignment date');
  }

  const today = dateOnly();
  if (date > today) {
    throw new Error('Future operator assignments are not allowed. Assign operators only for the working day.');
  }

  return date;
};

// ── Manager assigns an operator to a machine for a specific day ─
export const setDailyAssignment = async (machineId: number, userId: number, date: string): Promise<void> => {
  const assignmentDate = normalizeAssignmentDate(date);

  const [machineRows] = await pool.query<RowDataPacket[]>(
    `SELECT is_active FROM machine WHERE machine_id = ? LIMIT 1`,
    [machineId]
  );

  if (!machineRows.length) {
    throw new Error('Machine not found');
  }

  if (!machineRows[0].is_active) {
    throw new Error('Cannot assign an operator to an inactive machine');
  }

  const [attendanceRows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(oa.is_present, 1) AS is_present
     FROM users u
     LEFT JOIN operator_attendance oa ON oa.user_id = u.id AND oa.attendance_date = ?
     WHERE u.id = ? AND u.role_id = 3
     LIMIT 1`,
    [assignmentDate, userId]
  );

  if (!attendanceRows.length) {
    throw new Error('Operator not found');
  }

  if (!attendanceRows[0].is_present) {
    throw new Error('Cannot assign an absent operator');
  }

  await pool.query(
    `INSERT INTO machine_daily_assignment (machine_id, user_id, assignment_date) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
    [machineId, userId, assignmentDate]
  );

  const [details] = await pool.query<RowDataPacket[]>(`
    SELECT u.full_name, u.email, m.name AS machine_name
    FROM users u CROSS JOIN machine m
    WHERE u.id = ? AND m.machine_id = ?
    LIMIT 1
  `, [userId, machineId]);
  const detail = details[0];
  if (detail) {
    await createNotification(
      userId,
      `You are assigned to machine ${detail.machine_name} for ${assignmentDate}`,
      'ASSIGNMENT'
    );
    if (detail.email) {
      /* TEMPORARILY DISABLED (requires internet/SMTP)
      sendOperatorMachineAssignmentEmail(detail.email, detail.full_name, detail.machine_name, assignmentDate)
        .catch(error => console.error('Operator assignment email failed:', error));
      */
    }
  }
};

export const getDailyAssignments = async (date: string) => {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT m.machine_id, m.name AS machine_name, m.is_active, mda.user_id, u.full_name AS operator_name
    FROM machine m
    LEFT JOIN machine_daily_assignment mda ON mda.machine_id = m.machine_id AND mda.assignment_date = ?
    LEFT JOIN users u ON u.id = mda.user_id
    ORDER BY m.machine_id ASC
  `, [date]);
  return rows;
};

export const getMachineStatusBoard = async (date: string) => {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT
      m.machine_id,
      m.name AS machine_name,
      m.is_active,
      mda.user_id,
      u.full_name AS operator_name,
      active.job_id AS active_job_id,
      active.job_number AS active_job_number,
      active.job_name AS active_job_name,
      active.status AS active_job_status,
      active.priority AS active_job_priority,
      active.due_date AS active_job_due_date,
      active.started_at,
      COALESCE(queue.queue_count, 0) AS queue_count,
      next_job.job_id AS next_job_id,
      next_job.job_number AS next_job_number,
      next_job.job_name AS next_job_name,
      next_job.priority AS next_job_priority,
      next_job.due_date AS next_job_due_date
    FROM machine m
    LEFT JOIN machine_daily_assignment mda
      ON mda.machine_id = m.machine_id AND mda.assignment_date = ?
    LEFT JOIN users u ON u.id = mda.user_id
    LEFT JOIN (
      SELECT ja.machine_id, jt.job_id, jt.job_number, jt.job_name, jt.status,
             jt.priority, jt.due_date, ja.started_at
       FROM job_assignment ja
       JOIN job_ticket jt ON jt.job_id = ja.job_id
       WHERE ja.finished_at IS NULL AND jt.status = 'PRINTING'
    ) active ON active.machine_id = m.machine_id
    LEFT JOIN (
      SELECT machine_id, COUNT(*) AS queue_count
      FROM job_ticket
      WHERE status = 'PRINTING'
        AND job_id NOT IN (SELECT job_id FROM job_assignment WHERE finished_at IS NULL)
      GROUP BY machine_id
    ) queue ON queue.machine_id = m.machine_id
    LEFT JOIN job_ticket next_job ON next_job.job_id = (
      SELECT jt2.job_id
      FROM job_ticket jt2
       WHERE jt2.machine_id = m.machine_id
        AND jt2.status = 'PRINTING'
        AND jt2.job_id NOT IN (SELECT job_id FROM job_assignment WHERE finished_at IS NULL)
      ORDER BY CASE jt2.priority WHEN 'URGENT' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END ASC,
               jt2.due_date ASC,
               jt2.created_at ASC
      LIMIT 1
    )
    ORDER BY m.machine_id ASC
  `, [date]);
  return rows;
};

export const getOperatorMachineAssignments = async (userId: number, date: string) => {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT m.machine_id, m.name AS machine_name
    FROM machine_daily_assignment mda
    JOIN machine m ON m.machine_id = mda.machine_id
    WHERE mda.user_id = ? AND mda.assignment_date = ? AND m.is_active = 1
    ORDER BY m.machine_id ASC
  `, [userId, date]);
  return rows;
};

export const updateMachineStatus = async (machineId: number, isActive: boolean) => {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE machine SET is_active = ? WHERE machine_id = ?`,
    [isActive ? 1 : 0, machineId]
  );

  if (result.affectedRows === 0) {
    throw new Error('Machine not found');
  }

  if (!isActive) {
    await pool.query(
      `DELETE FROM machine_daily_assignment WHERE machine_id = ? AND assignment_date >= CURDATE()`,
      [machineId]
    );
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT machine_id, name AS machine_name, is_active FROM machine WHERE machine_id = ?`,
    [machineId]
  );
  return rows[0];
};

const getAssignedOperatorForMachineToday = async (machineId: number, date: string): Promise<number | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM machine_daily_assignment WHERE machine_id = ? AND assignment_date = ?`,
    [machineId, date]
  );
  return rows.length ? rows[0].user_id : null;
};

export const markAttendance = async (userId: number, date: string, isPresent: boolean): Promise<void> => {
  await pool.query(
    `INSERT INTO operator_attendance (user_id, attendance_date, is_present) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE is_present = VALUES(is_present)`,
    [userId, date, isPresent ? 1 : 0]
  );
};

// ── Is this machine currently locked by an in-progress job? ──
const getActiveAssignmentForMachine = async (machineId: number): Promise<RowDataPacket | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ja.*
     FROM job_assignment ja
     JOIN job_ticket jt ON jt.job_id = ja.job_id
     WHERE ja.machine_id = ? AND ja.finished_at IS NULL AND jt.status = 'PRINTING'
     LIMIT 1`,
    [machineId]
  );
  return rows.length ? rows[0] : null;
};

// ── OPERATOR CLICKS "START JOB" ────────────────────────────────
// Only the operator manually assigned to this machine TODAY can start it.
export const startPrintingOnMachine = async (
  jobId: number, jobNumber: string, machineId: number, requestingUserId: number
): Promise<{ success: boolean; message: string }> => {
  const [jobRows] = await pool.query<RowDataPacket[]>(
    `SELECT status, machine_id, scheduled_date FROM job_ticket WHERE job_id = ? LIMIT 1`,
    [jobId]
  );
  if (!jobRows.length || jobRows[0].status !== 'PRINTING') {
    return { success: false, message: 'Only a job in the PRINTING stage can be started.' };
  }
  if (Number(jobRows[0].machine_id) !== machineId) {
    return { success: false, message: 'This job is not scheduled on the selected machine.' };
  }

  const [machineRows] = await pool.query<RowDataPacket[]>(
    `SELECT is_active FROM machine WHERE machine_id = ? LIMIT 1`,
    [machineId]
  );

  if (!machineRows.length || !machineRows[0].is_active) {
    return { success: false, message: 'This machine is inactive and cannot be used.' };
  }

  const active = await getActiveAssignmentForMachine(machineId);
  if (active) {
    if (active.job_id === jobId) {
      return { success: true, message: 'This job is already in progress on this machine' };
    }
    return { success: false, message: `Machine is currently busy with another job (job_id ${active.job_id}). Finish it first.` };
  }

  const today = new Date().toISOString().split('T')[0];
  const assignedOperatorId = await getAssignedOperatorForMachineToday(machineId, today);

  if (!assignedOperatorId) {
    return { success: false, message: 'No operator has been assigned to this machine today. Ask your manager.' };
  }

  if (assignedOperatorId !== requestingUserId) {
    return { success: false, message: 'You are not the operator assigned to this machine today.' };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query<ResultSetHeader>(
      `INSERT INTO job_assignment (job_id, user_id, machine_id, assigned_date, started_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [jobId, requestingUserId, machineId, today]
    );
    await connection.query(
      `INSERT INTO job_stage_log (job_id, stage, status, remarks)
       SELECT ?, 'PRINTING', 'STARTED', 'Operator started printing'
       WHERE NOT EXISTS (
         SELECT 1 FROM job_stage_log WHERE job_id = ? AND stage = 'PRINTING' AND status = 'STARTED'
       )`,
      [jobId, jobId]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await createNotificationForRoles(['Admin', 'Manager'], `Job ${jobNumber}: operator started the job`, 'ASSIGNMENT');
  return { success: true, message: 'Job started' };
};

// ── Frees the machine when the job leaves the PRINTING stage ─
export const finishPrintingForJob = async (jobId: number): Promise<void> => {
  await pool.query(
    `UPDATE job_assignment SET finished_at = NOW() WHERE job_id = ? AND finished_at IS NULL`,
    [jobId]
  );
};
