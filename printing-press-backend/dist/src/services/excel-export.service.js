"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProductionReportExcel = exports.buildQuotationReportExcel = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const report_service_1 = require("./report.service");
const styleHeader = (row) => {
    row.font = { bold: true };
    row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E3D5' } };
    });
};
const buildQuotationReportExcel = async (from, to) => {
    const data = await (0, report_service_1.getQuotationReport)(from, to);
    const wb = new exceljs_1.default.Workbook();
    const summarySheet = wb.addWorksheet('Summary');
    summarySheet.columns = [{ header: 'Metric', key: 'metric', width: 25 }, { header: 'Value', key: 'value', width: 20 }];
    styleHeader(summarySheet.getRow(1));
    Object.entries(data.summary).forEach(([k, v]) => summarySheet.addRow({ metric: k, value: v }));
    const quotationsSheet = wb.addWorksheet('Quotations');
    quotationsSheet.columns = [
        { header: 'Quote No', key: 'quotation_number', width: 18 },
        { header: 'Customer', key: 'customer_name', width: 20 },
        { header: 'Job Name', key: 'job_name', width: 20 },
        { header: 'Total Cost', key: 'total_cost', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Date', key: 'dateCreated', width: 15 },
    ];
    styleHeader(quotationsSheet.getRow(1));
    data.recent.forEach((row) => quotationsSheet.addRow(row));
    const topCustomersSheet = wb.addWorksheet('Top Customers');
    topCustomersSheet.columns = [
        { header: 'Customer', key: 'customer_name', width: 20 },
        { header: 'Quotations', key: 'quotation_count', width: 15 },
        { header: 'Total Value', key: 'total_value', width: 15 },
    ];
    styleHeader(topCustomersSheet.getRow(1));
    data.topCustomers.forEach((row) => topCustomersSheet.addRow(row));
    return wb;
};
exports.buildQuotationReportExcel = buildQuotationReportExcel;
const buildProductionReportExcel = async (from, to) => {
    const data = await (0, report_service_1.getProductionReport)(from, to);
    const wb = new exceljs_1.default.Workbook();
    const summarySheet = wb.addWorksheet('Summary');
    summarySheet.columns = [{ header: 'Metric', key: 'metric', width: 25 }, { header: 'Value', key: 'value', width: 20 }];
    styleHeader(summarySheet.getRow(1));
    Object.entries(data.summary).forEach(([k, v]) => summarySheet.addRow({ metric: k, value: v }));
    const jobsSheet = wb.addWorksheet('Job Tickets');
    jobsSheet.columns = [
        { header: 'Job No', key: 'job_number', width: 15 },
        { header: 'Job Name', key: 'job_name', width: 20 },
        { header: 'Customer', key: 'customer_name', width: 20 },
        { header: 'Machine', key: 'machine_name', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Priority', key: 'priority', width: 12 },
        { header: 'Due Date', key: 'due_date', width: 15 },
    ];
    styleHeader(jobsSheet.getRow(1));
    data.recentJobs.forEach((row) => jobsSheet.addRow(row));
    const machineSheet = wb.addWorksheet('Machine Utilization');
    machineSheet.columns = [
        { header: 'Machine', key: 'name', width: 15 },
        { header: 'Total Jobs', key: 'total_jobs', width: 15 },
        { header: 'Completed', key: 'completed_jobs', width: 15 },
        { header: 'Active', key: 'active_jobs', width: 15 },
    ];
    styleHeader(machineSheet.getRow(1));
    data.machineStats.forEach((row) => machineSheet.addRow(row));
    return wb;
};
exports.buildProductionReportExcel = buildProductionReportExcel;
