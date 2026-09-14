import { Request, Response } from 'express';
import {
  getQuotationReport,
  getProductionReport,
  getDashboardStats
} from '../services/report.service';
import {
  buildQuotationReportExcel,
  buildProductionReportExcel
} from '../services/excel-export.service';

export const quotationReport = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const data = await getQuotationReport(from, to);
    res.json(data);
  } catch (err) {
    console.error('quotationReport error:', err);
    res.status(500).json({ message: 'Failed to generate quotation report' });
  }
};

export const productionReport = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const data = await getProductionReport(from, to);
    res.json(data);
  } catch (err) {
    console.error('productionReport error:', err);
    res.status(500).json({ message: 'Failed to generate production report' });
  }
};

export const dashboardStats = async (req: Request, res: Response) => {
  try {
    const data = await getDashboardStats();
    res.json(data);
  } catch (err) {
    console.error('dashboardStats error:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};

// ── EXCEL EXPORTS ──────────────────────────────────────────────

const sendExcel = async (res: Response, workbook: any, filename: string) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
};

export const exportQuotationReport = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const wb = await buildQuotationReportExcel(from, to);
    await sendExcel(res, wb, `quotation-report-${Date.now()}.xlsx`);
  } catch (err) {
    console.error('exportQuotationReport error:', err);
    res.status(500).json({ message: 'Failed to export quotation report' });
  }
};

export const exportProductionReport = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const wb = await buildProductionReportExcel(from, to);
    await sendExcel(res, wb, `production-report-${Date.now()}.xlsx`);
  } catch (err) {
    console.error('exportProductionReport error:', err);
    res.status(500).json({ message: 'Failed to export production report' });
  }
};

