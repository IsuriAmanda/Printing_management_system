"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolloverLeftoverJobs = exports.applySchedulePlan = exports.planScheduleForNewJob = exports.calculatePriority = void 0;
const db_1 = __importDefault(require("../config/db"));
const notification_service_1 = require("./notification.service");
const date_1 = require("../utils/date");
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MAX_JOBS_PER_MACHINE_PER_DAY = 5;
const dateOnly = (d) => (0, date_1.dateInColombo)(d);
const addDays = (dateStr, days) => {
    const d = new Date(`${dateStr}T12:00:00+05:30`);
    d.setUTCDate(d.getUTCDate() + days);
    return (0, date_1.dateInColombo)(d);
};
// Due today or overdue -> URGENT, due in 1-3 days -> MEDIUM, otherwise -> LOW.
const calculatePriority = (dueDate, fromDate = (0, date_1.todayInColombo)()) => {
    const diffDays = Math.ceil((new Date(dueDate).getTime() - new Date(fromDate).getTime()) / MS_PER_DAY);
    if (diffDays < 1)
        return 'URGENT';
    if (diffDays <= 3)
        return 'MEDIUM';
    return 'LOW';
};
exports.calculatePriority = calculatePriority;
const getCompatibleMachines = async (materialWidth, materialHeight) => {
    const [rows] = await db_1.default.query(`
    SELECT machine_id, name, width, height
    FROM machine
    WHERE is_active = 1
      AND ((width >= ? AND height >= ?)
       OR (width >= ? AND height >= ?))
    ORDER BY (width * height) ASC
  `, [materialWidth, materialHeight, materialHeight, materialWidth]);
    return rows;
};
const isMachineAvailable = async (machineId, date) => {
    const [machineRows] = await db_1.default.query(`SELECT is_active FROM machine WHERE machine_id = ? LIMIT 1`, [machineId]);
    if (!machineRows.length || !machineRows[0].is_active)
        return false;
    // job_ticket is the scheduling source of truth used by the Job List.
    // Counting machine_assignment allowed missing/stale assignment rows to
    // under-report the number of jobs already scheduled on a machine.
    const [bookedRows] = await db_1.default.query(`SELECT COUNT(*) AS total
     FROM job_ticket
     WHERE machine_id = ?
       AND DATE(scheduled_date) = ?`, [machineId, date]);
    return bookedRows[0].total < MAX_JOBS_PER_MACHINE_PER_DAY;
};
const findEarliestSlot = async (machines, fromDate, toDate) => {
    let cursor = fromDate;
    while (cursor <= toDate) {
        for (const machine of machines) {
            if (await isMachineAvailable(machine.machine_id, cursor)) {
                return { machineId: machine.machine_id, date: cursor };
            }
        }
        cursor = addDays(cursor, 1);
    }
    return null;
};
const commitAssignment = async (jobId, machineId, date, priority, db = db_1.default) => {
    // machine_assignment is the source of truth for the current slot, so a
    // reschedule replaces the old row instead of leaving stale history behind.
    await db.query(`DELETE FROM machine_assignment WHERE job_id = ?`, [jobId]);
    await db.query(`UPDATE job_ticket SET machine_id = ?, scheduled_date = ?, priority = ? WHERE job_id = ?`, [machineId, date, priority, jobId]);
    await db.query(`INSERT INTO machine_assignment (job_id, machine_id, assigned_date) VALUES (?, ?, ?)`, [jobId, machineId, date]);
};
const bumpablePriorities = (newJobPriority) => {
    if (newJobPriority === 'URGENT')
        return ['LOW', 'MEDIUM'];
    if (newJobPriority === 'MEDIUM')
        return ['LOW'];
    return [];
};
// Called before job_ticket creation. If this fails, no production job is created.
const planScheduleForNewJob = async (materialWidth, materialHeight, dueDate, jobNumber) => {
    const today = (0, date_1.todayInColombo)();
    if (!dueDate || dueDate < today) {
        throw new Error('PAST_DUE_DATE');
    }
    const priority = (0, exports.calculatePriority)(dueDate, today);
    const machines = await getCompatibleMachines(materialWidth, materialHeight);
    if (machines.length === 0) {
        await (0, notification_service_1.createNotificationForRoles)(['Admin', 'Manager'], `Job ${jobNumber}: no machine can handle this sheet size. Job ticket was not created.`, 'ALERT');
        throw new Error('No machine can handle this sheet size. Job ticket was not created.');
    }
    const machineIds = machines.map(machine => machine.machine_id);
    const slot = await findEarliestSlot(machines, today, dueDate);
    if (slot) {
        return { ...slot, priority };
    }
    await (0, notification_service_1.createNotificationForRoles)(['Admin', 'Manager'], `Job ${jobNumber}: no available slot exists before the requested due date. Attempting to reschedule a lower-priority job.`, 'ALERT');
    const priorities = bumpablePriorities(priority);
    if (priorities.length === 0) {
        await (0, notification_service_1.createNotificationForRoles)(['Admin', 'Manager'], `Job ${jobNumber}: no capacity found before due date and no lower-priority job can be moved.`, 'ALERT');
        throw new Error('No available slot exists before the requested due date. Please change the due date and try again.');
    }
    const [candidates] = await db_1.default.query(`
    SELECT
      jt.job_id, jt.job_number, jt.machine_id, jt.scheduled_date, jt.due_date, jt.priority,
      mat.width  AS material_width,
      mat.height AS material_height
    FROM job_ticket jt
    JOIN quotation_item qi ON qi.quotation_id = jt.quotation_id
    JOIN material mat      ON mat.material_id = qi.material_id
    WHERE jt.machine_id IN (?)
      AND jt.scheduled_date BETWEEN ? AND ?
      AND jt.priority IN (?)
      AND jt.status != 'COMPLETED'
    ORDER BY CASE jt.priority WHEN 'LOW' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END ASC,
             jt.due_date DESC
    LIMIT 1
  `, [machineIds, today, dueDate, priorities]);
    if (candidates.length > 0) {
        const candidate = candidates[0];
        const candidateMachines = await getCompatibleMachines(candidate.material_width, candidate.material_height);
        const newSlotForCandidate = await findEarliestSlot(candidateMachines, addDays(dateOnly(candidate.scheduled_date), 1), dateOnly(candidate.due_date));
        if (newSlotForCandidate) {
            return {
                machineId: candidate.machine_id,
                date: dateOnly(candidate.scheduled_date),
                priority,
                bumpedJob: {
                    jobId: candidate.job_id,
                    jobNumber: candidate.job_number,
                    fromMachineId: candidate.machine_id,
                    fromDate: dateOnly(candidate.scheduled_date),
                    toMachineId: newSlotForCandidate.machineId,
                    toDate: newSlotForCandidate.date,
                    priority: (0, exports.calculatePriority)(dateOnly(candidate.due_date), today)
                }
            };
        }
    }
    await (0, notification_service_1.createNotificationForRoles)(['Admin', 'Manager'], `Job ${jobNumber}: no capacity found before due date and no lower-priority job could be moved. Ask the customer for a new due date.`, 'ALERT');
    throw new Error('No available slot exists before the requested due date, and no lower-priority job could be rescheduled. Please change the due date and try again.');
};
exports.planScheduleForNewJob = planScheduleForNewJob;
const applySchedulePlan = async (jobId, jobNumber, plan, db = db_1.default) => {
    if (plan.bumpedJob) {
        await commitAssignment(plan.bumpedJob.jobId, plan.bumpedJob.toMachineId, plan.bumpedJob.toDate, plan.bumpedJob.priority, db);
        await (0, notification_service_1.createNotificationForRoles)(['Admin', 'Manager'], `Job ${plan.bumpedJob.jobNumber} rescheduled to ${plan.bumpedJob.toDate} to make room for job ${jobNumber} (now ${plan.bumpedJob.priority} priority)`, 'ALERT');
    }
    await commitAssignment(jobId, plan.machineId, plan.date, plan.priority, db);
    await (0, notification_service_1.createNotificationForRoles)(['Admin', 'Manager'], plan.bumpedJob
        ? `Job ${jobNumber} scheduled on ${plan.date} (${plan.priority} priority, bumped an existing job)`
        : `Job ${jobNumber} scheduled on ${plan.date} (${plan.priority} priority)`, 'ASSIGNMENT');
};
exports.applySchedulePlan = applySchedulePlan;
const rolloverLeftoverJobs = async () => {
    const today = (0, date_1.todayInColombo)();
    const [leftovers] = await db_1.default.query(`
    SELECT jt.job_id, jt.job_number, jt.due_date
    FROM job_ticket jt
    WHERE jt.status = 'PRINTING'
      AND jt.scheduled_date < ?
      AND jt.due_date IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM job_assignment ja
        WHERE ja.job_id = jt.job_id
      )
      AND jt.job_id NOT IN (
        SELECT job_id FROM job_assignment WHERE started_at IS NOT NULL AND finished_at IS NULL
      )
  `, [today]);
    for (const job of leftovers) {
        const newPriority = (0, exports.calculatePriority)(job.due_date, today);
        await db_1.default.query(`UPDATE job_ticket SET scheduled_date = ?, priority = ? WHERE job_id = ?`, [today, newPriority, job.job_id]);
        await db_1.default.query(`UPDATE machine_assignment SET assigned_date = ? WHERE job_id = ?`, [today, job.job_id]);
        await (0, notification_service_1.createNotificationForRoles)(['Admin', 'Manager'], `Job ${job.job_number} carried over to ${today} (now ${newPriority} priority)`, 'ALERT');
    }
};
exports.rolloverLeftoverJobs = rolloverLeftoverJobs;
