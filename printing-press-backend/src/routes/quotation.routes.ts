// routes/quotation.routes.ts

import { Router } from 'express';
import {
  getAllQuotations,
  getQuotationById,
  addQuotation,
  addQuotationWithDetails,
  saveDetails,
  changeStatus,
  removeQuotation,
  editQuotation,
  downloadPdf,
  sendEmail,
  calculateQuotation
} from '../controllers/quotation.controller';
import { verifyToken, allowRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(verifyToken, allowRoles('Admin', 'Manager'));

router.get('/',                 getAllQuotations); 
router.post('/calculate',       calculateQuotation);
router.get('/:id/pdf',          downloadPdf);  
router.get('/:id',              getQuotationById);  
router.post('/details',         addQuotationWithDetails);
router.post('/',                addQuotation); 
router.post('/:id/send-email',  sendEmail);     
router.put('/:id/details',      saveDetails);       
router.patch('/:id/status',     changeStatus);      
router.delete('/:id',           removeQuotation);  
router.put('/:id',              editQuotation);     
export default router;
