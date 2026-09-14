import { Router } from 'express';
import {
  quotationReport,
  productionReport,
  dashboardStats,
  exportQuotationReport,
  exportProductionReport
} from '../controllers/report.controller';
import { verifyToken, allowRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(verifyToken, allowRoles('Admin', 'Manager'));

router.get('/dashboard',   dashboardStats);
router.get('/quotations',  quotationReport);
router.get('/production',  productionReport);

router.get('/quotations/export', exportQuotationReport);
router.get('/production/export', exportProductionReport);

export default router;
