"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supply_controller_1 = require("../controllers/supply.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.verifyToken, (0, auth_middleware_1.allowRoles)('Admin', 'Manager'));
// Materials
router.get('/materials', supply_controller_1.getMaterials);
router.post('/materials', supply_controller_1.addMaterial);
router.put('/materials/:id', supply_controller_1.editMaterial);
router.delete('/materials/:id', supply_controller_1.removeMaterial);
// Printing
router.get('/printing', supply_controller_1.getPrintingSlabs);
router.post('/printing', supply_controller_1.addPrintingSlab);
router.put('/printing/:id', supply_controller_1.editPrintingSlab);
router.delete('/printing/:id', supply_controller_1.removePrintingSlab);
// Binding
router.get('/binding', supply_controller_1.getBindingTypes);
router.post('/binding', supply_controller_1.addBindingType);
router.put('/binding/:id', supply_controller_1.editBindingType);
router.delete('/binding/:id', supply_controller_1.removeBindingType);
// Lamination
router.get('/lamination', supply_controller_1.getLaminationTypes);
router.post('/lamination', supply_controller_1.addLaminationType);
router.put('/lamination/:id', supply_controller_1.editLaminationType);
router.delete('/lamination/:id', supply_controller_1.removeLaminationType);
// Standards
router.get('/standards', supply_controller_1.getStandards);
router.post('/standards', (0, auth_middleware_1.allowRoles)('Admin', 'Manager'), supply_controller_1.addStandard);
router.put('/standards/:id', (0, auth_middleware_1.allowRoles)('Admin', 'Manager'), supply_controller_1.editStandard);
router.delete('/standards/:id', (0, auth_middleware_1.allowRoles)('Admin', 'Manager'), supply_controller_1.removeStandard);
exports.default = router;
