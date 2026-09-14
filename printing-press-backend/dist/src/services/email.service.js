"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOperatorMachineAssignmentEmail = exports.sendTemporaryPasswordEmail = exports.sendQuotationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const pdf_service_1 = require("./pdf.service");
const db_1 = __importDefault(require("../config/db"));
// ── TRANSPORTER ───────────────────────────────────────────────
// Configured once — reused for every email sent
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
const transientEmailErrors = new Set([
    'EDNS', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNECTION', 'ETIMEDOUT', 'ECONNRESET'
]);
const sendMail = async (options) => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            await transporter.sendMail(options);
            return;
        }
        catch (error) {
            const code = error.code;
            if (attempt === 3 || !code || !transientEmailErrors.has(code))
                throw error;
            console.warn(`Temporary email connection error (${code}); retrying (${attempt}/3)...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
    }
};
// Avoid treating a temporary DNS/network outage as an application startup failure.
if (process.env.EMAIL_VERIFY_ON_STARTUP === 'true') {
    transporter.verify()
        .then(() => console.log('Email transporter ready'))
        .catch((error) => console.warn(`Email transporter unavailable at startup (${error.code || error.message})`));
}
// ── FETCH CUSTOMER EMAIL ──────────────────────────────────────
// Get customer email for the quotation
const fetchCustomerEmail = async (quotationId) => {
    const [rows] = await db_1.default.query(`
    SELECT
      c.email        AS customer_email,
      c.name         AS customer_name,
      q.job_name,
      q.total_cost,
      q.status,
      q.quotation_number,
      q.id
    FROM quotation q
    JOIN customer c ON q.customer_id = c.customer_id
    WHERE q.id = ?
  `, [quotationId]);
    return rows[0];
};
// ── SEND QUOTATION EMAIL ──────────────────────────────────────
// Generates PDF and sends it as attachment to customer
const sendQuotationEmail = async (quotationId, customMessage) => {
    // 1. Get customer details
    const data = await fetchCustomerEmail(quotationId);
    if (!data) {
        throw new Error('Quotation not found');
    }
    if (!data.customer_email) {
        throw new Error('Customer has no email address on record');
    }
    // 2. Generate PDF buffer
    const pdfBuffer = await (0, pdf_service_1.generateQuotationPdf)(quotationId);
    // 3. Build quotation number display
    const qNum = data.quotation_number ||
        `Q-${String(data.id).padStart(4, '0')}`;
    // 4. Build email body
    const defaultMessage = `Dear ${data.customer_name},

Please find attached our quotation ${qNum} for your reference.

Job Details:
  Job Name  : ${data.job_name}
  Total     : LKR ${Number(data.total_cost).toFixed(2)}

This quotation is valid for 7 days from the date of issue.

Should you have any questions or require any amendments, 
please do not hesitate to contact us.

Thank you for choosing Harshana Printers.

Best regards,
Harshana Printers
222/7, 1st Lane, Kalapaluwawa, Rajagiriya
Tel: 011-XXXXXXX
Email: ${process.env.EMAIL_USER}`;
    const emailBody = customMessage
        ? `${customMessage}\n\n---\nHarshana Printers`
        : defaultMessage;
    // 5. Send email with PDF attached
    await sendMail({
        from: process.env.EMAIL_FROM,
        to: data.customer_email,
        subject: `Quotation ${qNum} - ${data.job_name} | Harshana Printers`,
        text: emailBody,
        attachments: [
            {
                filename: `Quotation-${qNum}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ]
    });
    console.log(`Email sent to ${data.customer_email} for quotation ${qNum}`);
};
exports.sendQuotationEmail = sendQuotationEmail;
const sendTemporaryPasswordEmail = async (to, fullName, temporaryPassword) => {
    const emailBody = `Dear ${fullName},

We received a request to reset your Harshana Printers account password.

Your temporary password is:
${temporaryPassword}

Please log in with this temporary password and change it from Settings as soon as possible.

If you did not request this reset, please contact an administrator immediately.

Best regards,
Harshana Printers`;
    await sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject: 'Password reset - Harshana Printers',
        text: emailBody
    });
};
exports.sendTemporaryPasswordEmail = sendTemporaryPasswordEmail;
const sendOperatorMachineAssignmentEmail = async (to, fullName, machineName, assignmentDate) => {
    await sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject: `Machine assignment for ${assignmentDate} - Harshana Printers`,
        text: `Dear ${fullName},\n\nYou have been assigned to machine ${machineName} for ${assignmentDate}.\n\nYour eligible printing jobs will appear in your operator dashboard. Start a job from the queue before operating the machine.\n\nBest regards,\nHarshana Printers`
    });
};
exports.sendOperatorMachineAssignmentEmail = sendOperatorMachineAssignmentEmail;
