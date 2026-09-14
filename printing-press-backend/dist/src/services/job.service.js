"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchOtherStageJobsForUser = exports.fetchOtherStageJobs = exports.fetchOperatorDashboard = exports.fetchAllMachines = exports.assignMachine = exports.startJob = exports.updateJobStatus = exports.updateJobPreStartDetails = exports.convertQuotationToJob = exports.fetchJobStageLogs = exports.fetchJobById = exports.fetchAllJobs = void 0;
const db_1 = __importDefault(require("../config/db"));
const notification_service_1 = require("./notification.service");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const machine_scheduling_service_1 = require("./machine-scheduling.service");
const date_1 = require("../utils/date");
// Local helper to convert a date or date-like value to YYYY-MM-DD
const dateOnly = (d) => (0, date_1.dateInColombo)(d);
// Local fallback: check if a machine is available for a given date.
const isMachineAvailable = async (machineId, date, excludeJobId) => {
    const [machineRows] = await db_1.default.query(`SELECT is_active FROM machine WHERE machine_id = ? LIMIT 1`, [machineId]);
    if (!machineRows.length || !machineRows[0].is_active)
        return false;
    const [rows] = await db_1.default.query(`SELECT COUNT(*) AS total
     FROM job_ticket
     WHERE machine_id = ? AND DATE(scheduled_date) = ?
       AND (? IS NULL OR job_id <> ?)`, [machineId, date, excludeJobId ?? null, excludeJobId ?? null]);
    const total = rows[0]?.total || 0;
    return total < 5;
};
const operator_assignment_service_1 = require("./operator-assignment.service");
const generateJobNumber = async (db = db_1.default) => {
    const [rows] = await db.query(`SELECT COALESCE(MAX(job_id), 0) + 1 AS next FROM job_ticket`);
    const next = Number(rows[0]?.next || 1);
    return `JT-${String(next).padStart(4, '0')}`;
};
const STAGE_FLOW = {
    PRINTING: 'CUTTING',
    CUTTING: 'FOLDING',
    FOLDING: 'BINDING',
    BINDING: 'PACKING',
    PACKING: 'COMPLETED',
    COMPLETED: null
};
const todayOnly = date_1.todayInColombo;
const getAssignedMachineIdsForToday = async (userId) => {
    const [rows] = await db_1.default.query(`SELECT mda.machine_id
     FROM machine_daily_assignment mda
     JOIN machine m ON m.machine_id = mda.machine_id
     WHERE mda.user_id = ? AND mda.assignment_date = ? AND m.is_active = 1`, [userId, todayOnly()]);
    return rows.map(row => Number(row.machine_id));
};
const jobDetailsSelect = `
  jt.*,
  c.name AS customer_name,
  c.phone AS customer_phone,
  c.email AS customer_email,
  c.address AS customer_address,
  m.name AS machine_name,
  q.quotation_number,
  q.status AS quotation_status,
  q.dateCreated AS quotation_date_created,
  q.job_name AS quotation_job_name,
  q.job_type AS quotation_job_type,
  q.base_cost,
  q.extra_charges,
  q.profit_margin,
  q.total_cost AS quotation_total_cost,
  qi.item_id,
  qi.description AS item_description,
  qi.quantity AS item_quantity,
  qi.width AS item_width,
  qi.height AS item_height,
  qi.pages AS item_pages,
  qi.material_id,
  qi.front_color_pages,
  qi.back_color_pages,
  qi.cover_front_color_pages,
  qi.cover_back_color_pages,
  qi.binding_id AS item_binding_id,
  qi.lamination_id AS item_lamination_id,
  qi.total_cost AS item_total_cost,
  mat.material_name AS material_name,
  mat.unit_price AS material_unit_price,
  mat.width AS material_width,
  mat.height AS material_height,
  bt.binding_name,
  bt.min_pages AS binding_min_pages,
  bt.max_pages AS binding_max_pages,
  bt.price AS binding_price,
  lt.lamination_name,
  lt.price_per_unit AS lamination_price,
  ls.size_name AS lamination_size_name,
  ls.width AS lamination_width,
  ls.height AS lamination_height
`;
const jobDetailsJoins = `
  LEFT JOIN customer c ON jt.customer_id = c.customer_id
  LEFT JOIN machine m ON m.machine_id = jt.machine_id
  LEFT JOIN quotation q ON q.id = jt.quotation_id
  LEFT JOIN quotation_item qi ON qi.quotation_id = jt.quotation_id
  LEFT JOIN material mat ON mat.material_id = qi.material_id
  LEFT JOIN binding_type bt ON bt.binding_id = jt.binding_id
  LEFT JOIN lamination_type lt ON lt.lamination_id = jt.lamination_id
  LEFT JOIN standards ls ON ls.size_id = lt.size_id
`;
const calculateLayout = (sheetW, sheetH, pieceW, pieceH) => {
    const cols = Math.floor(sheetW / pieceW);
    const rows = Math.floor(sheetH / pieceH);
    const mainPieces = cols * rows;
    const rightStripW = sheetW - (cols * pieceW);
    const bottomStripH = sheetH - (rows * pieceH);
    let extraRight = 0;
    let extraRightCols = 0;
    let extraRightRows = 0;
    if (rightStripW >= pieceH) {
        extraRightCols = Math.floor(rightStripW / pieceH);
        extraRightRows = Math.floor(sheetH / pieceW);
        extraRight = extraRightCols * extraRightRows;
    }
    let extraBottom = 0;
    let extraBottomCols = 0;
    let extraBottomRows = 0;
    if (bottomStripH >= pieceW) {
        extraBottomRows = Math.floor(bottomStripH / pieceW);
        extraBottomCols = Math.floor(sheetW / pieceH);
        extraBottom = extraBottomRows * extraBottomCols;
    }
    const extraIsRight = extraRight >= extraBottom;
    const level1Extra = extraIsRight ? extraRight : extraBottom;
    const extraCols = extraIsRight ? extraRightCols : extraBottomCols;
    const extraRows = extraIsRight ? extraRightRows : extraBottomRows;
    let level2Extra = 0;
    if (extraIsRight) {
        if (bottomStripH >= pieceW)
            level2Extra = Math.floor(bottomStripH / pieceW) * Math.floor((cols * pieceW) / pieceH);
    }
    else if (rightStripW >= pieceH) {
        level2Extra = Math.floor(rightStripW / pieceH) * Math.floor((rows * pieceH) / pieceW);
    }
    return { total: mainPieces + level1Extra + level2Extra, mainPieces, cols, rows, level1Extra, level2Extra, extraIsRight, extraCols, extraRows };
};
const computeCutting = (job) => {
    const sheetH = Number(job.material_height || 0);
    const sheetW = Number(job.material_width || 0);
    const pieceH = Number(job.item_height || job.height || 0);
    const pieceW = Number(job.item_width || job.width || 0);
    const quantity = Number(job.item_quantity || job.quantity || 0);
    const pages = Number(job.item_pages || job.pages || 0);
    if (!sheetH || !sheetW || !pieceH || !pieceW)
        return null;
    const normal = calculateLayout(sheetW, sheetH, pieceW, pieceH);
    const rotated = calculateLayout(sheetW, sheetH, pieceH, pieceW);
    const useRotated = rotated.total > normal.total;
    const best = useRotated ? rotated : normal;
    const piecesPerSheet = best.total;
    const sheetsPerBook = piecesPerSheet > 0 && job.job_type === 'book' && pages > 0
        ? Math.ceil(pages / (piecesPerSheet * 2))
        : 0;
    const sheetsNeeded = piecesPerSheet > 0
        ? job.job_type === 'book' && pages > 0
            ? quantity * sheetsPerBook
            : Math.ceil(quantity / piecesPerSheet)
        : 0;
    return {
        piecesPerSheet,
        rows: best.rows,
        cols: best.cols,
        rotated: useRotated,
        sheetsPerBook,
        sheetsNeeded,
        mainPieces: best.mainPieces,
        extraPieces: best.level1Extra + best.level2Extra,
        extraCols: best.extraCols,
        extraRows: best.extraRows,
        extraIsRight: best.extraIsRight
    };
};
const enrichJobs = async (rows) => {
    const quotationIds = [...new Set(rows.map(row => Number(row.quotation_id || 0)).filter(Boolean))];
    const artworkByQuotation = new Map();
    if (quotationIds.length > 0) {
        const [artworkRows] = await db_1.default.query(`SELECT * FROM artwork WHERE quotation_id IN (?) ORDER BY uploaded_at DESC`, [quotationIds]);
        for (const artwork of artworkRows) {
            artwork.file_available = fs_1.default.existsSync(path_1.default.join(process.cwd(), String(artwork.file_path).replace(/^[/\\]+/, '')));
            const key = Number(artwork.quotation_id);
            artworkByQuotation.set(key, [...(artworkByQuotation.get(key) || []), artwork]);
        }
    }
    return rows.map(row => ({
        ...row,
        quantity: row.item_quantity ?? row.quantity,
        width: row.item_width ?? row.width,
        height: row.item_height ?? row.height,
        pages: row.item_pages ?? row.pages,
        artwork: artworkByQuotation.get(Number(row.quotation_id)) || [],
        cutting: computeCutting(row)
    }));
};
// ── READ ALL ──────────────────────────────────────────────────
const fetchAllJobs = async () => {
    const [rows] = await db_1.default.query(`
    SELECT
      jt.*,
      c.name AS customer_name,
      m.name AS machine_name,
      qi.material_id,
      qi.front_color_pages,
      qi.back_color_pages,
      qi.cover_front_color_pages,
      qi.cover_back_color_pages,
      CASE WHEN active.assignment_id IS NULL THEN 0 ELSE 1 END AS is_printing_started,
      CASE WHEN jt.status = 'PRINTING' AND active.assignment_id IS NULL THEN 1 ELSE 0 END AS can_edit_pre_start
    FROM job_ticket jt
    LEFT JOIN customer c ON jt.customer_id = c.customer_id
    LEFT JOIN machine  m ON jt.machine_id  = m.machine_id
    LEFT JOIN quotation_item qi ON qi.quotation_id = jt.quotation_id
    LEFT JOIN (
      SELECT job_id, MIN(assignment_id) AS assignment_id
      FROM job_assignment
      WHERE finished_at IS NULL
      GROUP BY job_id
    ) active ON active.job_id = jt.job_id
    ORDER BY jt.created_at DESC
  `);
    return rows;
};
exports.fetchAllJobs = fetchAllJobs;
// ── READ ONE ──────────────────────────────────────────────────
const fetchJobById = async (id) => {
    const [rows] = await db_1.default.query(`
    SELECT
      jt.*,
      c.name AS customer_name,
      m.name AS machine_name,
      qi.material_id,
      qi.front_color_pages,
      qi.back_color_pages,
      qi.cover_front_color_pages,
      qi.cover_back_color_pages,
      CASE WHEN active.assignment_id IS NULL THEN 0 ELSE 1 END AS is_printing_started,
      CASE WHEN jt.status = 'PRINTING' AND active.assignment_id IS NULL THEN 1 ELSE 0 END AS can_edit_pre_start
    FROM job_ticket jt
    LEFT JOIN customer c ON jt.customer_id = c.customer_id
    LEFT JOIN machine  m ON jt.machine_id  = m.machine_id
    LEFT JOIN quotation_item qi ON qi.quotation_id = jt.quotation_id
    LEFT JOIN (
      SELECT job_id, MIN(assignment_id) AS assignment_id
      FROM job_assignment
      WHERE finished_at IS NULL
      GROUP BY job_id
    ) active ON active.job_id = jt.job_id
    WHERE jt.job_id = ?
  `, [id]);
    return rows[0];
};
exports.fetchJobById = fetchJobById;
// ── READ STAGE LOGS ───────────────────────────────────────────
const fetchJobStageLogs = async (jobId) => {
    const [rows] = await db_1.default.query(`SELECT * FROM job_stage_log WHERE job_id = ? ORDER BY timestamp ASC`, [jobId]);
    return rows;
};
exports.fetchJobStageLogs = fetchJobStageLogs;
// ── CONVERT QUOTATION → JOB ───────────────────────────────────
const convertQuotationToJob = async (data) => {
    if (!data.due_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.due_date) || data.due_date < todayOnly()) {
        throw new Error('PAST_DUE_DATE');
    }
    const connection = await db_1.default.getConnection();
    let jobId;
    let jobNumber;
    try {
        await connection.beginTransaction();
        const [qRows] = await connection.query(`
      SELECT
        q.id AS quotation_id, q.status AS quotation_status, q.customer_id, q.job_name, q.job_type,
        qi.quantity, qi.width, qi.height, qi.pages,
        qi.binding_id, qi.lamination_id, qi.material_id,
        mat.width AS material_width, mat.height AS material_height,
        existing.job_id AS existing_job_id
      FROM quotation q
      LEFT JOIN quotation_item qi ON qi.quotation_id = q.id
      LEFT JOIN material mat      ON mat.material_id = qi.material_id
      LEFT JOIN job_ticket existing ON existing.quotation_id = q.id
      WHERE q.id = ?
      LIMIT 1
    `, [data.quotation_id]);
        if (!qRows.length)
            throw new Error('Quotation not found');
        const q = qRows[0];
        if (q.quotation_status !== 'CONFIRMED') {
            throw new Error('Only confirmed quotations can be converted to jobs');
        }
        if (q.existing_job_id) {
            throw new Error('This quotation has already been converted to a job');
        }
        if (!q.material_width || !q.material_height) {
            throw new Error('No material selected on quotation. Job ticket was not created.');
        }
        jobNumber = await generateJobNumber(connection);
        const schedulePlan = await (0, machine_scheduling_service_1.planScheduleForNewJob)(q.material_width, q.material_height, data.due_date, jobNumber);
        const [result] = await connection.query(`
      INSERT INTO job_ticket (
        job_number, job_name, job_type,
        customer_id, quantity, width, height, pages,
        material_id, binding_id, lamination_id,
        priority, due_date,
        quotation_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PRINTING')
    `, [
            jobNumber, q.job_name, q.job_type, q.customer_id,
            q.quantity, q.width, q.height, q.pages,
            q.material_id || null,
            q.binding_id || null, q.lamination_id || null,
            schedulePlan.priority, data.due_date, data.quotation_id
        ]);
        jobId = result.insertId;
        await (0, machine_scheduling_service_1.applySchedulePlan)(jobId, jobNumber, schedulePlan, connection);
        await connection.query(`UPDATE quotation SET status = 'CONFIRMED' WHERE id = ?`, [data.quotation_id]);
        await connection.commit();
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
    await (0, notification_service_1.createNotificationForRoles)(['Admin', 'Manager'], `New job ticket ${jobNumber} created from quotation`, 'JOB');
    return await (0, exports.fetchJobById)(jobId);
};
exports.convertQuotationToJob = convertQuotationToJob;
// ── CREATE DIRECT JOB ─────────────────────────────────────────
const updateJobPreStartDetails = async (jobId, data) => {
    const connection = await db_1.default.getConnection();
    try {
        await connection.beginTransaction();
        const [jobRows] = await connection.query(`SELECT job_id, quotation_id, status FROM job_ticket WHERE job_id = ? LIMIT 1`, [jobId]);
        if (jobRows.length === 0)
            throw new Error('Job not found');
        const job = jobRows[0];
        if (job.status !== 'PRINTING') {
            throw new Error('Job details can only be edited while the job is in PRINTING');
        }
        if (!job.quotation_id) {
            throw new Error('Only quotation-created jobs can be edited in this version');
        }
        const [startedRows] = await connection.query(`SELECT assignment_id FROM job_assignment WHERE job_id = ? AND finished_at IS NULL LIMIT 1`, [jobId]);
        if (startedRows.length > 0) {
            throw new Error('Job has already been started by an operator');
        }
        const quantity = data.quantity ?? null;
        const bindingId = data.binding_id ?? null;
        const laminationId = data.lamination_id ?? null;
        await connection.query(`UPDATE job_ticket
       SET quantity = COALESCE(?, quantity),
           binding_id = ?,
           lamination_id = ?
       WHERE job_id = ?`, [quantity, bindingId, laminationId, jobId]);
        await connection.query(`UPDATE quotation_item
       SET quantity = COALESCE(?, quantity),
           material_id = ?,
           binding_id = ?,
           lamination_id = ?,
           front_color_pages = ?,
           back_color_pages = ?,
           cover_front_color_pages = ?,
           cover_back_color_pages = ?
       WHERE quotation_id = ?`, [
            quantity,
            data.material_id ?? null,
            bindingId,
            laminationId,
            data.front_color_pages ?? null,
            data.back_color_pages ?? null,
            data.cover_front_color_pages ?? null,
            data.cover_back_color_pages ?? null,
            job.quotation_id
        ]);
        await connection.commit();
        return await (0, exports.fetchJobById)(jobId);
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
};
exports.updateJobPreStartDetails = updateJobPreStartDetails;
// ── UPDATE STATUS ─────────────────────────────────────────────
const updateJobStatus = async (jobId, status, remarks, user) => {
    const previousJob = await (0, exports.fetchJobById)(jobId);
    if (!previousJob) {
        throw new Error('Job not found');
    }
    if (!user || user.role !== 'Operator') {
        throw new Error('Only operators can change production stages');
    }
    const nextStatus = STAGE_FLOW[previousJob.status];
    if (!nextStatus || status !== nextStatus) {
        throw new Error(`Invalid stage change. Next stage from ${previousJob.status} is ${nextStatus || 'none'}`);
    }
    const assignedMachineIds = await getAssignedMachineIdsForToday(user.id);
    const isMachineAssignedOperator = assignedMachineIds.length > 0;
    if (previousJob.status === 'PRINTING') {
        if (!previousJob.machine_id || !assignedMachineIds.includes(Number(previousJob.machine_id))) {
            throw new Error('Only the operator assigned to this machine today can end printing');
        }
        const [activeRows] = await db_1.default.query(`SELECT assignment_id FROM job_assignment
       WHERE job_id = ? AND user_id = ? AND finished_at IS NULL
       LIMIT 1`, [jobId, user.id]);
        if (activeRows.length === 0) {
            throw new Error('Start this job before ending printing');
        }
    }
    else if (isMachineAssignedOperator) {
        throw new Error('Machine-assigned operators can only work on printing jobs. Other stages are for unassigned operators.');
    }
    const connection = await db_1.default.getConnection();
    try {
        await connection.beginTransaction();
        if (status === 'COMPLETED') {
            await connection.query(`UPDATE job_ticket SET status = ?, completed_at = NOW() WHERE job_id = ?`, [status, jobId]);
        }
        else {
            await connection.query(`UPDATE job_ticket SET status = ? WHERE job_id = ?`, [status, jobId]);
        }
        // Complete the stage the operator just finished, not the new stage.
        await connection.query(`INSERT INTO job_stage_log (job_id, stage, status, remarks) VALUES (?, ?, 'COMPLETED', ?)`, [jobId, previousJob.status, remarks || null]);
        // The next production stage starts as soon as the previous one is ended.
        if (status !== 'COMPLETED') {
            await connection.query(`INSERT INTO job_stage_log (job_id, stage, status, remarks) VALUES (?, ?, 'STARTED', ?)`, [jobId, status, `Moved from ${previousJob.status}`]);
        }
        // Leaving PRINTING releases the physical machine immediately.
        if (previousJob.status === 'PRINTING') {
            await connection.query(`UPDATE job_assignment SET finished_at = NOW() WHERE job_id = ? AND finished_at IS NULL`, [jobId]);
        }
        await connection.commit();
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
    const job = await (0, exports.fetchJobById)(jobId);
    const [operatorRows] = await db_1.default.query(`SELECT full_name FROM users WHERE id = ? LIMIT 1`, [user.id]);
    const operatorName = operatorRows[0]?.full_name || `Operator #${user.id}`;
    await (0, notification_service_1.createNotificationForRoles)(['Admin', 'Manager'], `Job ${job.job_number} moved from ${previousJob.status} to ${status} by ${operatorName}`, 'STATUS_UPDATE');
    // Once printing ends, notify only active operators who have no machine
    // assignment today; these are the operators eligible for other-stage work.
    if (previousJob.status === 'PRINTING' && status === 'CUTTING') {
        const [eligibleOperators] = await db_1.default.query(`
      SELECT u.id
      FROM users u
      JOIN role r ON r.role_id = u.role_id
      WHERE r.role_name = 'Operator' AND u.is_active = 1
        AND NOT EXISTS (
          SELECT 1 FROM machine_daily_assignment mda
          WHERE mda.user_id = u.id AND mda.assignment_date = ?
        )
    `, [todayOnly()]);
        for (const eligible of eligibleOperators) {
            await db_1.default.query(`INSERT INTO notification (user_id, message, type, is_read) VALUES (?, ?, 'STATUS_UPDATE', 0)`, [eligible.id, `Job ${job.job_number} finished printing and is ready for CUTTING`]);
        }
    }
    return job;
};
exports.updateJobStatus = updateJobStatus;
// ── START JOB — operator begins working on a specific job/machine ─
const startJob = async (jobId, userId) => {
    const job = await (0, exports.fetchJobById)(jobId);
    if (!job)
        throw new Error('Job not found');
    if (job.status !== 'PRINTING')
        throw new Error('Only jobs in the PRINTING stage can be started on a machine');
    if (!job.machine_id)
        throw new Error('Job has no machine assigned yet');
    if (!job.job_number)
        throw new Error('Job number is missing');
    return await (0, operator_assignment_service_1.startPrintingOnMachine)(jobId, job.job_number, job.machine_id, userId);
};
exports.startJob = startJob;
// ── ASSIGN MACHINE (manual override — validates availability, no operator attached here) ─
const assignMachine = async (jobId, machineId) => {
    const job = await (0, exports.fetchJobById)(jobId);
    // scheduled_date may not be declared on JobTicket type — access safely
    const scheduledRaw = job.scheduled_date;
    const date = scheduledRaw ? dateOnly(scheduledRaw) : (0, date_1.todayInColombo)();
    const available = await isMachineAvailable(machineId, date, jobId);
    if (!available) {
        throw new Error(`Machine is already booked on ${date}`);
    }
    await db_1.default.query(`UPDATE job_ticket SET machine_id = ?, scheduled_date = ? WHERE job_id = ?`, [machineId, date, jobId]);
    await db_1.default.query(`DELETE FROM machine_assignment WHERE job_id = ?`, [jobId]);
    await db_1.default.query(`INSERT INTO machine_assignment (job_id, machine_id, assigned_date) VALUES (?, ?, ?)`, [jobId, machineId, date]);
    return await (0, exports.fetchJobById)(jobId);
};
exports.assignMachine = assignMachine;
// ── FETCH MACHINES ────────────────────────────────────────────
const fetchAllMachines = async () => {
    const [rows] = await db_1.default.query(`SELECT * FROM machine WHERE is_active = 1 ORDER BY machine_id ASC`);
    return rows;
};
exports.fetchAllMachines = fetchAllMachines;
// ── DELETE ────────────────────────────────────────────────────
const fetchOperatorDashboard = async (userId) => {
    const today = todayOnly();
    const assignedMachines = await (0, operator_assignment_service_1.getOperatorMachineAssignments)(userId, today);
    const [machineRows] = await db_1.default.query(`SELECT mda.machine_id
     FROM machine_daily_assignment mda
     JOIN machine m ON m.machine_id = mda.machine_id
     WHERE mda.user_id = ? AND mda.assignment_date = ? AND m.is_active = 1`, [userId, today]);
    const machineIds = machineRows.map(r => r.machine_id);
    if (machineIds.length === 0) {
        return { assignedMachines, activeJob: null, queue: [], completedCount: 0, delayedCount: 0 };
    }
    // Their currently active job (started, not finished) — covers substituting on any machine too
    const [activeRows] = await db_1.default.query(`
    SELECT ${jobDetailsSelect}
    FROM job_assignment ja
    JOIN job_ticket jt ON jt.job_id = ja.job_id
    ${jobDetailsJoins}
    WHERE ja.user_id = ? AND ja.finished_at IS NULL AND jt.status = 'PRINTING'
    LIMIT 1
  `, [userId]);
    const enrichedActiveRows = await enrichJobs(activeRows);
    const activeJob = enrichedActiveRows[0] || null;
    // Queue on their fixed machine(s), excluding the active job, priority-ordered
    const [queueRows] = await db_1.default.query(`
    SELECT ${jobDetailsSelect}
    FROM job_ticket jt
    ${jobDetailsJoins}
    WHERE jt.machine_id IN (?)
      AND jt.status = 'PRINTING'
      AND DATE(jt.scheduled_date) <= ?
      ${activeJob ? 'AND jt.job_id != ?' : ''}
    ORDER BY CASE jt.priority WHEN 'URGENT' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END ASC, jt.due_date ASC
  `, activeJob ? [machineIds, today, activeJob.job_id] : [machineIds, today]);
    const [completedRows] = await db_1.default.query(`SELECT COUNT(*) AS total FROM job_ticket WHERE machine_id IN (?) AND status = 'COMPLETED'`, [machineIds]);
    const [delayedRows] = await db_1.default.query(`SELECT COUNT(*) AS total FROM job_ticket WHERE machine_id IN (?) AND status != 'COMPLETED' AND due_date < ?`, [machineIds, today]);
    return {
        activeJob,
        assignedMachines,
        queue: await enrichJobs(queueRows),
        completedCount: completedRows[0].total,
        delayedCount: delayedRows[0].total
    };
};
exports.fetchOperatorDashboard = fetchOperatorDashboard;
const fetchOtherStageJobs = async () => {
    const [rows] = await db_1.default.query(`
    SELECT ${jobDetailsSelect}
    FROM job_ticket jt
    ${jobDetailsJoins}
    WHERE jt.status IN ('CUTTING','FOLDING','BINDING','PACKING')
    ORDER BY CASE jt.priority WHEN 'URGENT' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END ASC, jt.due_date ASC
  `);
    return enrichJobs(rows);
};
exports.fetchOtherStageJobs = fetchOtherStageJobs;
const fetchOtherStageJobsForUser = async (user) => {
    if (user.role !== 'Operator') {
        return (0, exports.fetchOtherStageJobs)();
    }
    const assignedMachineIds = await getAssignedMachineIdsForToday(user.id);
    if (assignedMachineIds.length > 0) {
        return [];
    }
    return (0, exports.fetchOtherStageJobs)();
};
exports.fetchOtherStageJobsForUser = fetchOtherStageJobsForUser;
