import { Request, Response } from 'express';
import {
  fetchAllQuotations,
  fetchQuotationById,
  createQuotation,
  createQuotationWithDetails,
  saveQuotationDetails,
  updateStatus,
  deleteQuotation,
  updateQuotationBasic
} from '../services/quotation.service';
import { generateQuotationPdf } from '../services/pdf.service';
// TEMPORARILY DISABLED (requires internet/SMTP):
// import { sendQuotationEmail } from '../services/email.service';
import { calculateQuotationCost } from '../services/quotation-calculation.service';

export const calculateQuotation = (req: Request, res: Response) => {
  try {
    res.json(calculateQuotationCost(req.body));
  } catch (err: any) {
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


// GET /api/quotations
export const getAllQuotations = async (req: Request, res: Response) => {
  try {
    const data = await fetchAllQuotations();
    res.json(data);
  } catch (err) {
    console.error('getAllQuotations error:', err);
    res.status(500).json({ message: 'Failed to fetch quotations' });
  }
};

// GET /api/quotations/:id
export const getQuotationById = async (req: Request, res: Response) => {
  try {
    const data = await fetchQuotationById(Number(req.params.id));
    if (!data) {
      res.status(404).json({ message: 'Quotation not found' });
      return;
    }
    res.json(data);
  } catch (err) {
    console.error('getQuotationById error:', err);
    res.status(500).json({ message: 'Failed to fetch quotation' });
  }
};

// POST /api/quotations
// Step 1 OR Auto-Confirm Bypass Flow Route
export const addQuotation = async (req: Request, res: Response) => {
  try {
    // If frontend sends an explicit status (like CONFIRMED), createQuotation respects it
    const result = await createQuotation(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    console.error('addQuotation error:', err);
    const isCustomerError = err.message?.includes('customer');
    res.status(isCustomerError ? 400 : 500).json({
      message: isCustomerError ? err.message : 'Failed to create quotation'
    });
  }
};

// POST /api/quotations/details
export const addQuotationWithDetails = async (req: Request, res: Response) => {
  try {
    const result = await createQuotationWithDetails(req.body);
    res.status(201).json(result);
  } catch (err: any) {
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

// PUT /api/quotations/:id/details
export const saveDetails = async (req: Request, res: Response) => {
  try {
    const result = await saveQuotationDetails(
      Number(req.params.id),
      req.body
    );
    res.json(result);
  } catch (err: any) {
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

// PATCH /api/quotations/:id/status
export const changeStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ message: 'Status is required' });
      return;
    }
    const result = await updateStatus(Number(req.params.id), status);
    res.json(result);
  } catch (err) {
    console.error('changeStatus error:', err);
    res.status(500).json({ message: 'Failed to update status' });
  }
};

// DELETE /api/quotations/:id
export const removeQuotation = async (req: Request, res: Response) => {
  try {
    const result = await deleteQuotation(Number(req.params.id));
    res.json(result);
  } catch (err) {
    console.error('removeQuotation error:', err);
    res.status(500).json({ message: 'Failed to delete quotation' });
  }
};

// PUT /api/quotations/:id
export const editQuotation = async (req: Request, res: Response) => {
  try {
    const result = await updateQuotationBasic(
      Number(req.params.id),
      req.body
    );
    res.json(result);
  } catch (err) {
    console.error('editQuotation error:', err);
    res.status(500).json({ message: 'Failed to update quotation' });
  }
};

// GET /api/quotations/:id/pdf
export const downloadPdf = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const pdfBuffer = await generateQuotationPdf(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="quotation-${id}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
};

// POST /api/quotations/:id/email
export const sendEmail = async (req: Request, res: Response) => {
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
