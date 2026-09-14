import { Router } from 'express';
import {
  getMaterials, addMaterial, editMaterial, removeMaterial,
  getPrintingSlabs, addPrintingSlab, editPrintingSlab, removePrintingSlab,
  getBindingTypes, addBindingType, editBindingType, removeBindingType,
  getLaminationTypes, addLaminationType, editLaminationType, removeLaminationType,
  getStandards, addStandard, editStandard, removeStandard
} from '../controllers/supply.controller';
import { verifyToken, allowRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(verifyToken, allowRoles('Admin', 'Manager'));

// Materials
router.get('/materials',          getMaterials);
router.post('/materials',         addMaterial);
router.put('/materials/:id',      editMaterial);
router.delete('/materials/:id',   removeMaterial);

// Printing
router.get('/printing',           getPrintingSlabs);
router.post('/printing',          addPrintingSlab);
router.put('/printing/:id',       editPrintingSlab);
router.delete('/printing/:id',    removePrintingSlab);

// Binding
router.get('/binding',            getBindingTypes);
router.post('/binding',           addBindingType);
router.put('/binding/:id',        editBindingType);
router.delete('/binding/:id',     removeBindingType);

// Lamination
router.get('/lamination',         getLaminationTypes);
router.post('/lamination',        addLaminationType);
router.put('/lamination/:id',     editLaminationType);
router.delete('/lamination/:id',  removeLaminationType);

// Standards
router.get('/standards',           getStandards);
router.post('/standards',          allowRoles('Admin', 'Manager'), addStandard);
router.put('/standards/:id',       allowRoles('Admin', 'Manager'), editStandard);
router.delete('/standards/:id',    allowRoles('Admin', 'Manager'), removeStandard);

export default router;
