"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeStandard = exports.editStandard = exports.addStandard = exports.getStandards = exports.removeLaminationType = exports.editLaminationType = exports.addLaminationType = exports.getLaminationTypes = exports.removeBindingType = exports.editBindingType = exports.addBindingType = exports.getBindingTypes = exports.removePrintingSlab = exports.editPrintingSlab = exports.addPrintingSlab = exports.getPrintingSlabs = exports.removeMaterial = exports.editMaterial = exports.addMaterial = exports.getMaterials = void 0;
const supply_service_1 = require("../services/supply.service");
// ── MATERIALS ─────────────────────────────────────────────────
const getMaterials = async (req, res) => {
    try {
        res.json(await (0, supply_service_1.fetchAllMaterials)());
    }
    catch (e) {
        res.status(500).json({ message: 'Failed' });
    }
};
exports.getMaterials = getMaterials;
const addMaterial = async (req, res) => {
    try {
        res.status(201).json(await (0, supply_service_1.createMaterial)(req.body));
    }
    catch (e) {
        const isValidation = e.message === 'INVALID_MATERIAL';
        const isDuplicate = e.message === 'DUPLICATE_MATERIAL';
        res.status(isDuplicate ? 409 : isValidation ? 400 : 500).json({
            message: isDuplicate
                ? 'A material with the same name, height, and width already exists'
                : isValidation
                    ? 'Name, height, width and cost greater than zero are required'
                    : 'Failed to create material'
        });
    }
};
exports.addMaterial = addMaterial;
const editMaterial = async (req, res) => {
    try {
        res.json(await (0, supply_service_1.updateMaterial)(Number(req.params.id), req.body));
    }
    catch (e) {
        const isValidation = e.message === 'INVALID_MATERIAL';
        const isDuplicate = e.message === 'DUPLICATE_MATERIAL';
        res.status(isDuplicate ? 409 : isValidation ? 400 : 500).json({
            message: isDuplicate
                ? 'A material with the same name, height, and width already exists'
                : isValidation
                    ? 'Name, height, width and cost greater than zero are required'
                    : 'Failed to update material'
        });
    }
};
exports.editMaterial = editMaterial;
const removeMaterial = async (req, res) => {
    try {
        res.json(await (0, supply_service_1.deleteMaterial)(Number(req.params.id)));
    }
    catch (e) {
        res.status(500).json({ message: 'Failed' });
    }
};
exports.removeMaterial = removeMaterial;
// ── PRINTING ──────────────────────────────────────────────────
const getPrintingSlabs = async (req, res) => {
    try {
        res.json(await (0, supply_service_1.fetchAllPrintingSlabs)());
    }
    catch (e) {
        res.status(500).json({ message: 'Failed' });
    }
};
exports.getPrintingSlabs = getPrintingSlabs;
const addPrintingSlab = async (req, res) => {
    try {
        res.status(201).json(await (0, supply_service_1.createPrintingSlab)(req.body));
    }
    catch (e) {
        if (e.message === 'OVERLAPPING_PRINTING_SLAB') {
            res.status(409).json({ message: 'This quantity range overlaps an existing slab for the selected color type' });
            return;
        }
        if (e.message === 'DUPLICATE_PRINTING_SLAB') {
            res.status(409).json({ message: 'A printing slab with the same color type, minimum quantity, and maximum quantity already exists' });
            return;
        }
        if (e.message === 'INVALID_PRINTING_SLAB') {
            res.status(400).json({ message: 'Enter a valid color type, quantity range, and price greater than zero' });
            return;
        }
        res.status(500).json({ message: 'Failed to create printing slab' });
    }
};
exports.addPrintingSlab = addPrintingSlab;
const editPrintingSlab = async (req, res) => {
    try {
        res.json(await (0, supply_service_1.updatePrintingSlab)(Number(req.params.id), req.body));
    }
    catch (e) {
        if (e.message === 'OVERLAPPING_PRINTING_SLAB') {
            res.status(409).json({ message: 'This quantity range overlaps an existing slab for the selected color type' });
            return;
        }
        if (e.message === 'DUPLICATE_PRINTING_SLAB') {
            res.status(409).json({ message: 'A printing slab with the same color type, minimum quantity, and maximum quantity already exists' });
            return;
        }
        if (e.message === 'INVALID_PRINTING_SLAB') {
            res.status(400).json({ message: 'Enter a valid color type, quantity range, and price greater than zero' });
            return;
        }
        res.status(500).json({ message: 'Failed to update printing slab' });
    }
};
exports.editPrintingSlab = editPrintingSlab;
const removePrintingSlab = async (req, res) => {
    try {
        res.json(await (0, supply_service_1.deletePrintingSlab)(Number(req.params.id)));
    }
    catch (e) {
        res.status(500).json({ message: 'Failed' });
    }
};
exports.removePrintingSlab = removePrintingSlab;
// ── BINDING ───────────────────────────────────────────────────
const getBindingTypes = async (req, res) => {
    try {
        res.json(await (0, supply_service_1.fetchAllBindingTypes)());
    }
    catch (e) {
        res.status(500).json({ message: 'Failed' });
    }
};
exports.getBindingTypes = getBindingTypes;
const addBindingType = async (req, res) => {
    try {
        res.status(201).json(await (0, supply_service_1.createBindingType)(req.body));
    }
    catch (e) {
        if (e.message === 'DUPLICATE_BINDING_RANGE') {
            res.status(409).json({ message: 'A binding type with the same name and page range already exists' });
            return;
        }
        if (e.message === 'OVERLAPPING_BINDING_RANGE') {
            res.status(409).json({ message: 'This page range overlaps an existing range for the same binding name' });
            return;
        }
        res.status(e.message === 'INVALID_BINDING_TYPE' ? 400 : 500).json({
            message: e.message === 'INVALID_BINDING_TYPE'
                ? 'Enter a binding name, valid page range, and price greater than zero'
                : 'Failed to create binding type'
        });
    }
};
exports.addBindingType = addBindingType;
const editBindingType = async (req, res) => {
    try {
        res.json(await (0, supply_service_1.updateBindingType)(Number(req.params.id), req.body));
    }
    catch (e) {
        if (e.message === 'DUPLICATE_BINDING_RANGE') {
            res.status(409).json({ message: 'A binding type with the same name and page range already exists' });
            return;
        }
        if (e.message === 'OVERLAPPING_BINDING_RANGE') {
            res.status(409).json({ message: 'This page range overlaps an existing range for the same binding name' });
            return;
        }
        res.status(e.message === 'INVALID_BINDING_TYPE' ? 400 : 500).json({
            message: e.message === 'INVALID_BINDING_TYPE'
                ? 'Enter a binding name, valid page range, and price greater than zero'
                : 'Failed to update binding type'
        });
    }
};
exports.editBindingType = editBindingType;
const removeBindingType = async (req, res) => {
    try {
        res.json(await (0, supply_service_1.deleteBindingType)(Number(req.params.id)));
    }
    catch (e) {
        res.status(500).json({ message: 'Failed' });
    }
};
exports.removeBindingType = removeBindingType;
// ── LAMINATION ────────────────────────────────────────────────
const getLaminationTypes = async (req, res) => {
    try {
        res.json(await (0, supply_service_1.fetchAllLaminationTypes)());
    }
    catch (e) {
        res.status(500).json({ message: 'Failed' });
    }
};
exports.getLaminationTypes = getLaminationTypes;
const addLaminationType = async (req, res) => {
    try {
        res.status(201).json(await (0, supply_service_1.createLaminationType)(req.body));
    }
    catch (e) {
        if (e.message === 'DUPLICATE_LAMINATION_TYPE') {
            res.status(409).json({ message: 'A lamination type with the same finish name and size already exists' });
            return;
        }
        if (e.message === 'INVALID_LAMINATION_TYPE') {
            res.status(400).json({ message: 'Select a valid finish name and standard size, and enter a price greater than zero' });
            return;
        }
        res.status(500).json({ message: 'Failed to create lamination type' });
    }
};
exports.addLaminationType = addLaminationType;
const editLaminationType = async (req, res) => {
    try {
        res.json(await (0, supply_service_1.updateLaminationType)(Number(req.params.id), req.body));
    }
    catch (e) {
        if (e.message === 'DUPLICATE_LAMINATION_TYPE') {
            res.status(409).json({ message: 'A lamination type with the same finish name and size already exists' });
            return;
        }
        if (e.message === 'INVALID_LAMINATION_TYPE') {
            res.status(400).json({ message: 'Select a valid finish name and standard size, and enter a price greater than zero' });
            return;
        }
        res.status(500).json({ message: 'Failed to update lamination type' });
    }
};
exports.editLaminationType = editLaminationType;
const removeLaminationType = async (req, res) => {
    try {
        res.json(await (0, supply_service_1.deleteLaminationType)(Number(req.params.id)));
    }
    catch (e) {
        res.status(500).json({ message: 'Failed' });
    }
};
exports.removeLaminationType = removeLaminationType;
//standards
const getStandards = async (req, res) => {
    try {
        const data = await (0, supply_service_1.fetchAllStandards)();
        res.json(data);
    }
    catch (err) {
        console.error('getStandards error:', err);
        res.status(500).json({ message: 'Failed to fetch standards' });
    }
};
exports.getStandards = getStandards;
const addStandard = async (req, res) => {
    try {
        res.status(201).json(await (0, supply_service_1.createStandard)(req.body));
    }
    catch (err) {
        console.error('addStandard error:', err);
        const status = err.code === 'ER_DUP_ENTRY' ? 409 : err.message === 'INVALID_STANDARD' ? 400 : 500;
        const message = status === 409
            ? 'Standard size already exists'
            : status === 400
                ? 'Size name, height, and width greater than zero are required'
                : 'Failed to add standard';
        res.status(status).json({ message });
    }
};
exports.addStandard = addStandard;
const editStandard = async (req, res) => {
    try {
        res.json(await (0, supply_service_1.updateStandard)(Number(req.params.id), req.body));
    }
    catch (err) {
        console.error('editStandard error:', err);
        const status = err.code === 'ER_DUP_ENTRY' ? 409 : err.message === 'INVALID_STANDARD' ? 400 : 500;
        const message = status === 409
            ? 'Standard size already exists'
            : status === 400
                ? 'Size name, height, and width greater than zero are required'
                : 'Failed to update standard';
        res.status(status).json({ message });
    }
};
exports.editStandard = editStandard;
const removeStandard = async (req, res) => {
    try {
        res.json(await (0, supply_service_1.deleteStandard)(Number(req.params.id)));
    }
    catch (err) {
        console.error('removeStandard error:', err);
        res.status(500).json({ message: 'Failed to delete standard' });
    }
};
exports.removeStandard = removeStandard;
