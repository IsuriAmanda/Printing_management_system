"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeArtwork = exports.uploadArtwork = exports.getArtworkForJob = exports.getArtworkForQuotation = void 0;
const artwork_service_1 = require("../services/artwork.service");
const getArtworkForQuotation = async (req, res) => {
    try {
        res.json(await (0, artwork_service_1.fetchArtworkForQuotation)(Number(req.params.quotationId)));
    }
    catch (err) {
        console.error('getArtworkForQuotation error:', err);
        res.status(500).json({ message: 'Failed to fetch artwork' });
    }
};
exports.getArtworkForQuotation = getArtworkForQuotation;
const getArtworkForJob = async (req, res) => {
    try {
        res.json(await (0, artwork_service_1.fetchArtworkForJob)(Number(req.params.jobId)));
    }
    catch (err) {
        console.error('getArtworkForJob error:', err);
        res.status(500).json({ message: 'Failed to fetch artwork' });
    }
};
exports.getArtworkForJob = getArtworkForJob;
const uploadArtwork = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }
        const quotationId = Number(req.params.quotationId);
        const relativePath = `/uploads/artwork/${req.file.filename}`;
        const record = await (0, artwork_service_1.saveArtworkRecord)(quotationId, req.file.originalname, relativePath);
        res.status(201).json(record);
    }
    catch (err) {
        console.error('uploadArtwork error:', err);
        res.status(500).json({ message: 'Failed to upload artwork' });
    }
};
exports.uploadArtwork = uploadArtwork;
const removeArtwork = async (req, res) => {
    try {
        const deleted = await (0, artwork_service_1.deleteArtworkRecord)(Number(req.params.id));
        if (!deleted) {
            res.status(404).json({ message: 'Artwork not found' });
            return;
        }
        res.json({ message: 'Artwork deleted' });
    }
    catch (err) {
        console.error('removeArtwork error:', err);
        res.status(500).json({ message: 'Failed to delete artwork' });
    }
};
exports.removeArtwork = removeArtwork;
