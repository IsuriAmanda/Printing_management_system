import { Request, Response } from 'express';
import {
  fetchArtworkForQuotation, fetchArtworkForJob,
  saveArtworkRecord, deleteArtworkRecord
} from '../services/artwork.service';

export const getArtworkForQuotation = async (req: Request, res: Response) => {
  try {
    res.json(await fetchArtworkForQuotation(Number(req.params.quotationId)));
  } catch (err) {
    console.error('getArtworkForQuotation error:', err);
    res.status(500).json({ message: 'Failed to fetch artwork' });
  }
};

export const getArtworkForJob = async (req: Request, res: Response) => {
  try {
    res.json(await fetchArtworkForJob(Number(req.params.jobId)));
  } catch (err) {
    console.error('getArtworkForJob error:', err);
    res.status(500).json({ message: 'Failed to fetch artwork' });
  }
};

export const uploadArtwork = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }
    const quotationId = Number(req.params.quotationId);
    const relativePath = `/uploads/artwork/${req.file.filename}`;
    const record = await saveArtworkRecord(quotationId, req.file.originalname, relativePath);
    res.status(201).json(record);
  } catch (err) {
    console.error('uploadArtwork error:', err);
    res.status(500).json({ message: 'Failed to upload artwork' });
  }
};

export const removeArtwork = async (req: Request, res: Response) => {
  try {
    const deleted = await deleteArtworkRecord(Number(req.params.id));
    if (!deleted) {
      res.status(404).json({ message: 'Artwork not found' });
      return;
    }
    res.json({ message: 'Artwork deleted' });
  } catch (err) {
    console.error('removeArtwork error:', err);
    res.status(500).json({ message: 'Failed to delete artwork' });
  }
};