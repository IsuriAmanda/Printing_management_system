import express from 'express';
import { artworkUpload } from '../config/upload';
import {
  getArtworkForQuotation, getArtworkForJob, uploadArtwork, removeArtwork
} from '../controllers/artwork.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = express.Router();
router.use(verifyToken);

router.get('/quotation/:quotationId', getArtworkForQuotation);
router.get('/job/:jobId', getArtworkForJob);
router.post('/quotation/:quotationId', artworkUpload.single('file'), uploadArtwork);
router.delete('/:id', removeArtwork);

export default router;