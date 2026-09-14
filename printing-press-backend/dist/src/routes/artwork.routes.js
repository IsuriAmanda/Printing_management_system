"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const upload_1 = require("../config/upload");
const artwork_controller_1 = require("../controllers/artwork.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.verifyToken);
router.get('/quotation/:quotationId', artwork_controller_1.getArtworkForQuotation);
router.get('/job/:jobId', artwork_controller_1.getArtworkForJob);
router.post('/quotation/:quotationId', upload_1.artworkUpload.single('file'), artwork_controller_1.uploadArtwork);
router.delete('/:id', artwork_controller_1.removeArtwork);
exports.default = router;
