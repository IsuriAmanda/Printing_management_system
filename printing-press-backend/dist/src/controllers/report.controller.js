"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportProductionReport = exports.exportQuotationReport = exports.dashboardStats = exports.productionReport = exports.quotationReport = void 0;
const report_service_1 = require("../services/report.service");
const excel_export_service_1 = require("../services/excel-export.service");
const quotationReport = async (req, res) => {
    try {
        const { from, to } = req.query;
        const data = await (0, report_service_1.getQuotationReport)(from, to);
        res.json(data);
    }
    catch (err) {
        console.error('quotationReport error:', err);
        res.status(500).json({ message: 'Failed to generate quotation report' });
    }
};
exports.quotationReport = quotationReport;
const productionReport = async (req, res) => {
    try {
        const { from, to } = req.query;
        const data = await (0, report_service_1.getProductionReport)(from, to);
        res.json(data);
    }
    catch (err) {
        console.error('productionReport error:', err);
        res.status(500).json({ message: 'Failed to generate production report' });
    }
};
exports.productionReport = productionReport;
const dashboardStats = async (req, res) => {
    try {
        const data = await (0, report_service_1.getDashboardStats)();
        res.json(data);
    }
    catch (err) {
        console.error('dashboardStats error:', err);
        res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
};
exports.dashboardStats = dashboardStats;
// ── EXCEL EXPORTS ──────────────────────────────────────────────
const sendExcel = async (res, workbook, filename) => {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
};
const exportQuotationReport = async (req, res) => {
    try {
        const { from, to } = req.query;
        const wb = await (0, excel_export_service_1.buildQuotationReportExcel)(from, to);
        await sendExcel(res, wb, `quotation-report-${Date.now()}.xlsx`);
    }
    catch (err) {
        console.error('exportQuotationReport error:', err);
        res.status(500).json({ message: 'Failed to export quotation report' });
    }
};
exports.exportQuotationReport = exportQuotationReport;
const exportProductionReport = async (req, res) => {
    try {
        const { from, to } = req.query;
        const wb = await (0, excel_export_service_1.buildProductionReportExcel)(from, to);
        await sendExcel(res, wb, `production-report-${Date.now()}.xlsx`);
    }
    catch (err) {
        console.error('exportProductionReport error:', err);
        res.status(500).json({ message: 'Failed to export production report' });
    }
};
exports.exportProductionReport = exportProductionReport;
