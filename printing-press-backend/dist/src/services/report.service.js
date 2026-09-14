"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = exports.getProductionReport = exports.getQuotationReport = void 0;
const db_1 = __importDefault(require("../config/db"));
// ── QUOTATION REPORT ──────────────────────────────────────────
const getQuotationReport = async (from, to) => {
    const dateFilter = from && to
        ? `AND q.dateCreated BETWEEN ? AND ?`
        : '';
    const params = from && to ? [from, to] : [];
    // Summary counts
    const [summary] = await db_1.default.query(`
    SELECT
      COUNT(*)                                          AS total,
      SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed,
      SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
      SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END)     AS draft,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END)   AS pending,
      COALESCE(AVG(total_cost), 0)                      AS avg_value,
      COALESCE(SUM(total_cost), 0)                      AS total_value,
      COALESCE(SUM(
        CASE WHEN status = 'CONFIRMED'
        THEN total_cost ELSE 0 END), 0)                 AS confirmed_value
    FROM quotation q
    WHERE 1=1 ${dateFilter}
  `, params);
    // Recent quotations with customer name
    const [recent] = await db_1.default.query(`
    SELECT
      q.id,
      q.quotation_number,
      c.name        AS customer_name,
      q.job_name,
      q.job_type,
      q.total_cost,
      q.status,
      q.dateCreated
    FROM quotation q
    LEFT JOIN customer c ON q.customer_id = c.customer_id
    WHERE 1=1 ${dateFilter}
    ORDER BY q.dateCreated DESC
    LIMIT 20
  `, params);
    // Status breakdown
    const [statusBreakdown] = await db_1.default.query(`
    SELECT
      status,
      COUNT(*) AS count
    FROM quotation q
    WHERE 1=1 ${dateFilter}
    GROUP BY status
  `, params);
    // Top customers by quotation value
    const [topCustomers] = await db_1.default.query(`
    SELECT
      c.name           AS customer_name,
      COUNT(q.id)      AS quotation_count,
      SUM(q.total_cost) AS total_value
    FROM quotation q
    LEFT JOIN customer c ON q.customer_id = c.customer_id
    WHERE q.status = 'CONFIRMED' ${dateFilter ? 'AND' + dateFilter.replace('AND', '') : ''}
    GROUP BY q.customer_id, c.name
    ORDER BY total_value DESC
    LIMIT 5
  `, params);
    return {
        summary: summary[0] || {},
        recent,
        statusBreakdown,
        topCustomers
    };
};
exports.getQuotationReport = getQuotationReport;
// ── PRODUCTION REPORT ─────────────────────────────────────────
const getProductionReport = async (from, to) => {
    const dateFilter = from && to
        ? `AND jt.created_at BETWEEN ? AND ?`
        : '';
    const params = from && to ? [from, to] : [];
    // Stage counts
    const [stageCounts] = await db_1.default.query(`
    SELECT
      status,
      COUNT(*) AS count
    FROM job_ticket jt
    WHERE 1=1 ${dateFilter}
    GROUP BY status
  `, params);
    // Summary
    // Summary
    const [summary] = await db_1.default.query(`
  SELECT
    COUNT(*)                                                                    AS total_jobs,
    SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END)     AS completed,
    SUM(CASE WHEN status != 'COMPLETED' THEN 1 ELSE 0 END)    AS in_progress,
    SUM(CASE WHEN due_date < CURDATE() AND status != 'COMPLETED' THEN 1 ELSE 0 END) AS \`delayed\`
  FROM job_ticket jt
  WHERE 1=1 ${dateFilter}
`, params);
    // Recent job tickets
    const [recentJobs] = await db_1.default.query(`
    SELECT
      jt.job_id,
      jt.job_number,
      jt.job_name,
      jt.status,
      jt.priority,
      jt.due_date,
      c.name  AS customer_name,
      m.name  AS machine_name
    FROM job_ticket jt
    LEFT JOIN customer c ON jt.customer_id = c.customer_id
    LEFT JOIN machine  m ON jt.machine_id  = m.machine_id
    WHERE 1=1 ${dateFilter}
    ORDER BY jt.created_at DESC
    LIMIT 20
  `, params);
    // Machine utilization
    const [machineStats] = await db_1.default.query(`
    SELECT
      m.machine_id,
      m.name,
      COUNT(jt.job_id)              AS total_jobs,
      SUM(CASE WHEN jt.status = 'COMPLETED' THEN 1 ELSE 0 END)  AS completed_jobs,
      SUM(CASE WHEN jt.status != 'COMPLETED' THEN 1 ELSE 0 END) AS active_jobs
    FROM machine m
    LEFT JOIN job_ticket jt ON jt.machine_id = m.machine_id
    GROUP BY m.machine_id, m.name
    ORDER BY total_jobs DESC
  `);
    return {
        summary: summary[0] || {},
        stageCounts,
        recentJobs,
        machineStats
    };
};
exports.getProductionReport = getProductionReport;
// ── REVENUE REPORT ────────────────────────────────────────────
// ── DASHBOARD OVERVIEW ────────────────────────────────────────
const getDashboardStats = async () => {
    const [quotationStats] = await db_1.default.query(`
    SELECT
      COUNT(*)                                              AS total,
      SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed,
      SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
      SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END)     AS draft,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END)   AS pending,
      COALESCE(SUM(total_cost), 0)                          AS total_value,
      COALESCE(AVG(total_cost), 0)                          AS avg_value
    FROM quotation
  `);
    const [jobStats] = await db_1.default.query(`
  SELECT
    COUNT(*)                                                                 AS total,
    SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END)    AS completed,
    SUM(CASE WHEN status != 'COMPLETED' THEN 1 ELSE 0 END)   AS in_progress,
    SUM(CASE WHEN status = 'PRINTING' THEN 1 ELSE 0 END)     AS printing,
    SUM(CASE WHEN status = 'CUTTING' THEN 1 ELSE 0 END)      AS cutting,
    SUM(CASE WHEN status = 'FOLDING' THEN 1 ELSE 0 END)      AS folding,
    SUM(CASE WHEN status = 'BINDING' THEN 1 ELSE 0 END)      AS binding,
    SUM(CASE WHEN status = 'PACKING' THEN 1 ELSE 0 END)      AS packing,
    SUM(CASE WHEN due_date < CURDATE() AND status != 'COMPLETED' THEN 1 ELSE 0 END) AS \`delayed\`
  FROM job_ticket
`);
    const [recentQuotations] = await db_1.default.query(`
    SELECT
      q.id,
      q.quotation_number,
      c.name   AS customer_name,
      q.job_name,
      q.total_cost,
      q.status,
      q.dateCreated
    FROM quotation q
    LEFT JOIN customer c ON q.customer_id = c.customer_id
    ORDER BY q.dateCreated DESC
    LIMIT 5
  `);
    const [recentJobs] = await db_1.default.query(`
    SELECT
      jt.job_id,
      jt.job_number,
      jt.job_name,
      jt.status,
      jt.due_date,
      c.name AS customer_name
    FROM job_ticket jt
    LEFT JOIN customer c ON jt.customer_id = c.customer_id
    ORDER BY jt.created_at DESC
    LIMIT 5
  `);
    return {
        quotations: quotationStats[0] || {},
        jobs: jobStats[0] || {},
        recentQuotations,
        recentJobs
    };
};
exports.getDashboardStats = getDashboardStats;
