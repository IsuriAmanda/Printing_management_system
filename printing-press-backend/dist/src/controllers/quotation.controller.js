"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = exports.downloadPdf = exports.editQuotation = exports.removeQuotation = exports.changeStatus = exports.saveDetails = exports.addQuotationWithDetails = exports.addQuotation = exports.getQuotationById = exports.getAllQuotations = exports.calculateQuotation = void 0;
const quotation_service_1 = require("../services/quotation.service");
const pdf_service_1 = require("../services/pdf.service");
// TEMPORARILY DISABLED (requires internet/SMTP):
// import { sendQuotationEmail } from '../services/email.service';
const quotation_calculation_service_1 = require("../services/quotation-calculation.service");
const calculateQuotation = (req, res) => {
    try {
        res.json((0, quotation_calculation_service_1.calculateQuotationCost)(req.body));
    }
    catch (err) {
        console.error('calculateQuotation error:', err);
        if (err.message?.startsWith('MISSING_PRINTING_SLAB:')) {
            const [, color, quantity] = err.message.split(':');
            res.status(422).json({
                message: `No printing price slab covers ${color} at quantity ${quantity}. Add a matching slab before saving the quotation.`
            });
            return;
        }
        res.status(400).json({ message: 'Failed to calculate quotation' });
    }
};
exports.calculateQuotation = calculateQuotation;
// GET /api/quotations
const getAllQuotations = async (req, res) => {
    try {
        const data = await (0, quotation_service_1.fetchAllQuotations)();
        res.json(data);
    }
    catch (err) {
        console.error('getAllQuotations error:', err);
        res.status(500).json({ message: 'Failed to fetch quotations' });
    }
};
exports.getAllQuotations = getAllQuotations;
// GET /api/quotations/:id
const getQuotationById = async (req, res) => {
    try {
        const data = await (0, quotation_service_1.fetchQuotationById)(Number(req.params.id));
        if (!data) {
            res.status(404).json({ message: 'Quotation not found' });
            return;
        }
        res.json(data);
    }
    catch (err) {
        console.error('getQuotationById error:', err);
        res.status(500).json({ message: 'Failed to fetch quotation' });
    }
};
exports.getQuotationById = getQuotationById;
// POST /api/quotations
// Step 1 OR Auto-Confirm Bypass Flow Route
const addQuotation = async (req, res) => {
    try {
        // If frontend sends an explicit status (like CONFIRMED), createQuotation respects it
        const result = await (0, quotation_service_1.createQuotation)(req.body);
        res.status(201).json(result);
    }
    catch (err) {
        console.error('addQuotation error:', err);
        const isCustomerError = err.message?.includes('customer');
        res.status(isCustomerError ? 400 : 500).json({
            message: isCustomerError ? err.message : 'Failed to create quotation'
        });
    }
};
exports.addQuotation = addQuotation;
// POST /api/quotations/details
const addQuotationWithDetails = async (req, res) => {
    try {
        const result = await (0, quotation_service_1.createQuotationWithDetails)(req.body);
        res.status(201).json(result);
    }
    catch (err) {
        console.error('addQuotationWithDetails error:', err);
        if (err.message === 'INVALID_EMAIL') {
            res.status(400).json({ message: 'Enter a valid email address' });
            return;
        }
        if (err.message === 'JOB_LARGER_THAN_MATERIAL') {
            res.status(400).json({ message: 'Job size is larger than the selected material sheet in both orientations' });
            return;
        }
        if (err.message?.startsWith('MISSING_PRINTING_SLAB:')) {
            const [, color, quantity] = err.message.split(':');
            res.status(422).json({ message: `No printing price slab covers ${color} at quantity ${quantity}. Add a matching slab before saving the quotation.` });
            return;
        }
        if (err.message === 'INVALID_QUOTATION_DETAILS') {
            res.status(400).json({ message: 'Job name, job type, positive quantity, width, height, required book pages, and material are required' });
            return;
        }
        const isCustomerError = err.message?.includes('customer');
        res.status(isCustomerError ? 400 : 500).json({
            message: isCustomerError ? err.message : 'Failed to create quotation details'
        });
    }
};
exports.addQuotationWithDetails = addQuotationWithDetails;
// PUT /api/quotations/:id/details
const saveDetails = async (req, res) => {
    try {
        const result = await (0, quotation_service_1.saveQuotationDetails)(Number(req.params.id), req.body);
        res.json(result);
    }
    catch (err) {
        console.error('saveDetails error:', err);
        if (err.message === 'INVALID_QUOTATION_DETAILS') {
            res.status(400).json({ message: 'Job name, job type, positive quantity, width, height, required book pages, and material are required' });
            return;
        }
        if (err.message === 'JOB_LARGER_THAN_MATERIAL') {
            res.status(400).json({ message: 'Job size is larger than the selected material sheet in both orientations' });
            return;
        }
        if (err.message?.startsWith('MISSING_PRINTING_SLAB:')) {
            const [, color, quantity] = err.message.split(':');
            res.status(422).json({ message: `No printing price slab covers ${color} at quantity ${quantity}. Add a matching slab before saving the quotation.` });
            return;
        }
        res.status(500).json({ message: 'Failed to save quotation details' });
    }
};
exports.saveDetails = saveDetails;
// PATCH /api/quotations/:id/status
const changeStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            res.status(400).json({ message: 'Status is required' });
            return;
        }
        const result = await (0, quotation_service_1.updateStatus)(Number(req.params.id), status);
        res.json(result);
    }
    catch (err) {
        console.error('changeStatus error:', err);
        res.status(500).json({ message: 'Failed to update status' });
    }
};
exports.changeStatus = changeStatus;
// DELETE /api/quotations/:id
const removeQuotation = async (req, res) => {
    try {
        const result = await (0, quotation_service_1.deleteQuotation)(Number(req.params.id));
        res.json(result);
    }
    catch (err) {
        console.error('removeQuotation error:', err);
        res.status(500).json({ message: 'Failed to delete quotation' });
    }
};
exports.removeQuotation = removeQuotation;
// PUT /api/quotations/:id
const editQuotation = async (req, res) => {
    try {
        const result = await (0, quotation_service_1.updateQuotationBasic)(Number(req.params.id), req.body);
        res.json(result);
    }
    catch (err) {
        console.error('editQuotation error:', err);
        res.status(500).json({ message: 'Failed to update quotation' });
    }
};
exports.editQuotation = editQuotation;
// GET /api/quotations/:id/pdf
const downloadPdf = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const pdfBuffer = await (0, pdf_service_1.generateQuotationPdf)(id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="quotation-${id}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (err) {
        console.error('PDF generation error:', err);
        res.status(500).json({ message: 'Failed to generate PDF' });
    }
};
exports.downloadPdf = downloadPdf;
// POST /api/quotations/:id/email
const sendEmail = async (req, res) => {
    // Keep the endpoint safe and predictable while outbound email is disabled.
    return res.status(503).json({
        message: 'Quotation email is temporarily unavailable'
    });
    /* TEMPORARILY DISABLED (requires internet/SMTP)
    try {
      const id = Number(req.params.id);
      const { customMessage } = req.body;
  
      await sendQuotationEmail(id, customMessage);
      res.json({ message: 'Email sent successfully' });
    } catch (err: any) {
      console.error('sendEmail error:', err);
      res.status(500).json({
        message: err.message || 'Failed to send email'
      });
    }
    */
};
exports.sendEmail = sendEmail;
