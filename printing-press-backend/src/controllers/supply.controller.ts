import { Request, Response } from 'express';
import {
  fetchAllMaterials, createMaterial, updateMaterial, deleteMaterial,
  fetchAllPrintingSlabs, createPrintingSlab, updatePrintingSlab, deletePrintingSlab,
  fetchAllBindingTypes, createBindingType, updateBindingType, deleteBindingType,
  fetchAllLaminationTypes, createLaminationType, updateLaminationType, deleteLaminationType,
  fetchAllStandards, createStandard, updateStandard, deleteStandard
} from '../services/supply.service';

// ── MATERIALS ─────────────────────────────────────────────────
export const getMaterials    = async (req: Request, res: Response) => {
  try { res.json(await fetchAllMaterials()); }
  catch(e) { res.status(500).json({ message: 'Failed' }); }
};
export const addMaterial     = async (req: Request, res: Response) => {
  try { res.status(201).json(await createMaterial(req.body)); }
  catch(e: any) {
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
export const editMaterial    = async (req: Request, res: Response) => {
  try { res.json(await updateMaterial(Number(req.params.id), req.body)); }
  catch(e: any) {
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
export const removeMaterial  = async (req: Request, res: Response) => {
  try { res.json(await deleteMaterial(Number(req.params.id))); }
  catch(e) { res.status(500).json({ message: 'Failed' }); }
};

// ── PRINTING ──────────────────────────────────────────────────
export const getPrintingSlabs   = async (req: Request, res: Response) => {
  try { res.json(await fetchAllPrintingSlabs()); }
  catch(e) { res.status(500).json({ message: 'Failed' }); }
};
export const addPrintingSlab    = async (req: Request, res: Response) => {
  try { res.status(201).json(await createPrintingSlab(req.body)); }
  catch(e: any) {
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
export const editPrintingSlab   = async (req: Request, res: Response) => {
  try { res.json(await updatePrintingSlab(Number(req.params.id), req.body)); }
  catch(e: any) {
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
export const removePrintingSlab = async (req: Request, res: Response) => {
  try { res.json(await deletePrintingSlab(Number(req.params.id))); }
  catch(e) { res.status(500).json({ message: 'Failed' }); }
};

// ── BINDING ───────────────────────────────────────────────────
export const getBindingTypes   = async (req: Request, res: Response) => {
  try { res.json(await fetchAllBindingTypes()); }
  catch(e) { res.status(500).json({ message: 'Failed' }); }
};
export const addBindingType    = async (req: Request, res: Response) => {
  try { res.status(201).json(await createBindingType(req.body)); }
  catch(e: any) {
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
export const editBindingType   = async (req: Request, res: Response) => {
  try { res.json(await updateBindingType(Number(req.params.id), req.body)); }
  catch(e: any) {
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
export const removeBindingType = async (req: Request, res: Response) => {
  try { res.json(await deleteBindingType(Number(req.params.id))); }
  catch(e) { res.status(500).json({ message: 'Failed' }); }
};

// ── LAMINATION ────────────────────────────────────────────────
export const getLaminationTypes   = async (req: Request, res: Response) => {
  try { res.json(await fetchAllLaminationTypes()); }
  catch(e) { res.status(500).json({ message: 'Failed' }); }
};
export const addLaminationType    = async (req: Request, res: Response) => {
  try { res.status(201).json(await createLaminationType(req.body)); }
  catch(e: any) {
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
export const editLaminationType   = async (req: Request, res: Response) => {
  try { res.json(await updateLaminationType(Number(req.params.id), req.body)); }
  catch(e: any) {
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
export const removeLaminationType = async (req: Request, res: Response) => {
  try { res.json(await deleteLaminationType(Number(req.params.id))); }
  catch(e) { res.status(500).json({ message: 'Failed' }); }
};
//standards
export const getStandards = async (req: Request, res: Response) => {
  try {
    const data = await fetchAllStandards();
    res.json(data);
  } catch (err) {
    console.error('getStandards error:', err);
    res.status(500).json({ message: 'Failed to fetch standards' });
  }
};

export const addStandard = async (req: Request, res: Response) => {
  try {
    res.status(201).json(await createStandard(req.body));
  } catch (err: any) {
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

export const editStandard = async (req: Request, res: Response) => {
  try {
    res.json(await updateStandard(Number(req.params.id), req.body));
  } catch (err: any) {
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

export const removeStandard = async (req: Request, res: Response) => {
  try {
    res.json(await deleteStandard(Number(req.params.id)));
  } catch (err) {
    console.error('removeStandard error:', err);
    res.status(500).json({ message: 'Failed to delete standard' });
  }
};
