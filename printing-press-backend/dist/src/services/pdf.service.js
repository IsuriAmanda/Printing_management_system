"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuotationPdf = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const path_1 = __importDefault(require("path"));
const db_1 = __importDefault(require("../config/db"));
const fetchQuotationForPdf = async (id) => {
    const [rows] = await db_1.default.query(`
    SELECT
      q.id,
      q.quotation_number,
      q.job_name,
      q.job_type,
      q.base_cost,
      q.extra_charges,
      q.profit_margin,
      q.total_cost,
      q.status,
      q.dateCreated,
      c.name        AS customer_name,
      c.phone       AS customer_phone,
      c.email       AS customer_email,
      qi.description,
      qi.quantity,
      qi.width,
      qi.height,
      qi.pages,
      qi.front_color_pages,
      qi.back_color_pages,
      qi.cover_front_color_pages,
      qi.cover_back_color_pages,
      qi.total_cost  AS item_total,
      bt.binding_name,
      lt.lamination_name
    FROM quotation q
    JOIN customer c ON q.customer_id = c.customer_id
    LEFT JOIN quotation_item qi ON qi.quotation_id = q.id
    LEFT JOIN binding_type bt ON qi.binding_id = bt.binding_id
    LEFT JOIN lamination_type lt ON qi.lamination_id = lt.lamination_id
    WHERE q.id = ?
  `, [id]);
    return rows[0];
};
const generateQuotationPdf = async (id) => {
    const data = await fetchQuotationForPdf(id);
    if (!data)
        throw new Error('Quotation not found');
    return new Promise((resolve, reject) => {
        // Disable autoFirstPage so we control everything
        const doc = new pdfkit_1.default({
            size: 'A4',
            margin: 0,
            autoFirstPage: false,
            bufferPages: true // buffer all pages so we can stamp footer on each
        });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        // ── CONSTANTS ─────────────────────────────────────────────
        const GREEN = '#2d6a2d';
        const BLACK = '#000000';
        const GRAY = '#666666';
        const LGRAY = '#f5f5f5';
        const WHITE = '#ffffff';
        const BORDER = '#dddddd';
        const pageW = 595.28; // A4 width  in points
        const pageH = 841.89; // A4 height in points
        const margin = 50;
        const cW = pageW - margin * 2; // content width
        // ── SAFE ZONE ─────────────────────────────────────────────
        // All content must stay above this Y value
        const FOOTER_H = 50;
        const FOOTER_Y = pageH - FOOTER_H;
        const TERMS_H = 90;
        const SAFE_BOTTOM = FOOTER_Y - TERMS_H - 10; // content stops here
        // ── ADD PAGE ──────────────────────────────────────────────
        doc.addPage();
        // ── 1. FOOTER (draw first so content never overlaps it) ───
        doc.rect(0, FOOTER_Y, pageW, FOOTER_H).fill(BLACK);
        doc.fontSize(8).fillColor(WHITE).font('Helvetica')
            .text('Harshana Printers  |  222/7, 1st Lane, Kalapaluwawa, Rajagiriya  |  Tel: 011-XXXXXXX', margin, FOOTER_Y + 12, { width: cW, align: 'center', lineBreak: false });
        doc.fontSize(8).fillColor(WHITE).font('Helvetica')
            .text('Thank you for your business!', margin, FOOTER_Y + 28, { width: cW, align: 'center', lineBreak: false });
        // ── 2. TERMS (draw second, also fixed position) ───────────
        const termsY = FOOTER_Y - TERMS_H;
        doc.moveTo(margin, termsY)
            .lineTo(margin + cW, termsY)
            .strokeColor(BORDER).lineWidth(0.5).stroke();
        doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold')
            .text('TERMS & CONDITIONS', margin, termsY + 8, { lineBreak: false });
        const terms = [
            '• This quotation is valid for 7 days from the date of issue.',
            '• 50% advance payment required before commencement of work.',
            '• Final payment due upon completion before delivery.',
            '• Prices are subject to change without prior notice.'
        ];
        doc.fontSize(8).fillColor(GRAY).font('Helvetica');
        terms.forEach((line, i) => {
            doc.text(line, margin, termsY + 22 + i * 13, { lineBreak: false, width: cW });
        });
        // ── 3. HEADER ─────────────────────────────────────────────
        doc.rect(0, 0, pageW, 120).fill(BLACK);
        // Logo
        try {
            const logoPath = path_1.default.join(__dirname, '../assets/logo.png');
            doc.image(logoPath, margin, 10, { width: 95, height: 95 });
        }
        catch {
            doc.fontSize(16).fillColor(GREEN).font('Helvetica-Bold')
                .text('HARSHANA', margin, 35, { lineBreak: false });
            doc.text('PRINTERS', margin, 55, { lineBreak: false });
        }
        // Company details
        doc.fontSize(9).fillColor(WHITE).font('Helvetica')
            .text('Harshana Printers', pageW - 230, 22, { width: 178, align: 'right', lineBreak: false })
            .text('222/7, 1st Lane,', pageW - 230, 35, { width: 178, align: 'right', lineBreak: false })
            .text('Kalapaluwawa,', pageW - 230, 48, { width: 178, align: 'right', lineBreak: false })
            .text('Rajagiriya, Sri Lanka.', pageW - 230, 61, { width: 178, align: 'right', lineBreak: false })
            .text('Tel: 011-XXXXXXX', pageW - 230, 74, { width: 178, align: 'right', lineBreak: false })
            .text('hp@harshanaprinters.lk', pageW - 230, 87, { width: 178, align: 'right', lineBreak: false });
        // ── 4. TITLE BAR ──────────────────────────────────────────
        doc.rect(0, 120, pageW, 35).fill(GREEN);
        doc.fontSize(18).fillColor(WHITE).font('Helvetica-Bold')
            .text('QUOTATION', margin, 129, { lineBreak: false });
        const qNum = data.quotation_number || `Q-${String(data.id).padStart(4, '0')}`;
        doc.fontSize(11).fillColor(WHITE).font('Helvetica')
            .text(`No: ${qNum}`, pageW - 230, 132, { width: 178, align: 'right', lineBreak: false });
        // ── 5. INFO BOXES ─────────────────────────────────────────
        const infoY = 170;
        const infoH = 95;
        // Left — Bill To
        doc.rect(margin, infoY, cW * 0.55, infoH)
            .fillAndStroke(LGRAY, BORDER);
        doc.fontSize(8).fillColor(GRAY).font('Helvetica-Bold')
            .text('BILL TO', margin + 10, infoY + 10, { lineBreak: false });
        doc.fontSize(11).fillColor(BLACK).font('Helvetica-Bold')
            .text(data.customer_name || '', margin + 10, infoY + 24, { lineBreak: false });
        doc.fontSize(9).fillColor(BLACK).font('Helvetica');
        if (data.customer_phone) {
            doc.text(`Tel: ${data.customer_phone}`, margin + 10, infoY + 42, { lineBreak: false });
        }
        if (data.customer_email) {
            doc.text(`Email: ${data.customer_email}`, margin + 10, infoY + 56, { lineBreak: false });
        }
        // Right — Date/Status box
        const rBoxX = margin + cW * 0.60;
        const rBoxW = cW * 0.40;
        doc.rect(rBoxX, infoY, rBoxW, infoH)
            .fillAndStroke(LGRAY, BORDER);
        const dateCreated = data.dateCreated
            ? new Date(data.dateCreated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const expiry = new Date(data.dateCreated || new Date());
        expiry.setDate(expiry.getDate() + 7);
        const expiryStr = expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const labels = ['DATE', 'EXPIRY', 'STATUS', 'REFERENCE'];
        const values = [dateCreated, expiryStr, data.status || '', data.job_name || ''];
        labels.forEach((lbl, i) => {
            const y = infoY + 12 + i * 18;
            doc.fontSize(8).fillColor(GRAY).font('Helvetica-Bold')
                .text(lbl, rBoxX + 10, y, { lineBreak: false });
            doc.fontSize(8).fillColor(BLACK).font('Helvetica')
                .text(values[i], rBoxX + 90, y, { lineBreak: false });
        });
        // ── 6. ITEMS TABLE ────────────────────────────────────────
        const tY = infoY + infoH + 15;
        // Column x positions
        const col = {
            desc: { x: margin, w: cW * 0.48 },
            qty: { x: margin + cW * 0.48, w: cW * 0.12 },
            size: { x: margin + cW * 0.60, w: cW * 0.22 },
            amt: { x: margin + cW * 0.82, w: cW * 0.18 }
        };
        // Table header
        doc.rect(margin, tY, cW, 22).fill(GREEN);
        doc.fontSize(9).fillColor(WHITE).font('Helvetica-Bold')
            .text('DESCRIPTION', col.desc.x + 5, tY + 7, { width: col.desc.w - 10, lineBreak: false })
            .text('QTY', col.qty.x + 5, tY + 7, { width: col.qty.w - 10, lineBreak: false })
            .text('SIZE (W×H)', col.size.x + 5, tY + 7, { width: col.size.w - 10, lineBreak: false })
            .text('AMOUNT (LKR)', col.amt.x + 5, tY + 7, { width: col.amt.w - 10, align: 'right', lineBreak: false });
        // Item row
        const rowY = tY + 22;
        const rowH = 85;
        doc.rect(margin, rowY, cW, rowH).fillAndStroke(WHITE, BORDER);
        const colorDesc = (v) => v === 4 ? '4 Color' : v === 1 ? '1 Color' : null;
        const descParts = [data.job_name || data.description || ''];
        if (data.job_type)
            descParts.push(`Type: ${data.job_type}`);
        if (data.pages)
            descParts.push(`Pages: ${data.pages}`);
        const fc = colorDesc(data.front_color_pages);
        const bc = colorDesc(data.back_color_pages);
        if (fc)
            descParts.push(`Pages Front: ${fc}`);
        if (bc)
            descParts.push(`Pages Back: ${bc}`);
        if (data.binding_name)
            descParts.push(`Binding: ${data.binding_name}`);
        if (data.lamination_name)
            descParts.push(`Lamination: ${data.lamination_name}`);
        doc.fontSize(9).fillColor(BLACK).font('Helvetica')
            .text(descParts.join('\n'), col.desc.x + 5, rowY + 8, { width: col.desc.w - 10, lineGap: 2, lineBreak: true });
        doc.text(`${data.quantity || 0}`, col.qty.x + 5, rowY + 8, { width: col.qty.w - 10, lineBreak: false });
        doc.text(`${Number(data.width || 0).toFixed(2)} x ${Number(data.height || 0).toFixed(2)} in`, col.size.x + 5, rowY + 8, { width: col.size.w - 10, lineBreak: false });
        doc.text(Number(data.item_total || 0).toFixed(2), col.amt.x + 5, rowY + 8, { width: col.amt.w - 10, align: 'right', lineBreak: false });
        // ── 7. COST SUMMARY ───────────────────────────────────────
        const panelY = rowY + rowH + 12;
        const panelH = 148;
        const leftW = cW * 0.42;
        const rightX = margin + leftW + 16;
        const rightW = cW - leftW - 16;
        // Show the included cost components without inventing historical
        // component prices, which are not stored separately on a quotation.
        doc.roundedRect(margin, panelY, leftW, panelH, 5)
            .fillAndStroke(LGRAY, BORDER);
        doc.fontSize(9).fillColor(GREEN).font('Helvetica-Bold')
            .text('COST INCLUDES', margin + 12, panelY + 12, { lineBreak: false });
        const included = [
            'Material',
            'Printing',
            ...(data.binding_name ? [`Binding - ${data.binding_name}`] : []),
            ...(data.lamination_name ? [`Lamination - ${data.lamination_name}`] : [])
        ];
        included.forEach((label, index) => {
            const y = panelY + 35 + index * 22;
            doc.circle(margin + 17, y + 4, 3).fill(GREEN);
            doc.fontSize(9).fillColor(BLACK).font('Helvetica')
                .text(label, margin + 28, y, { width: leftW - 40, lineBreak: false });
        });
        doc.roundedRect(rightX, panelY, rightW, panelH, 5)
            .fillAndStroke(WHITE, BORDER);
        doc.rect(rightX, panelY, rightW, 28).fill(GREEN);
        doc.fontSize(10).fillColor(WHITE).font('Helvetica-Bold')
            .text('COST BREAKDOWN', rightX + 12, panelY + 9, { lineBreak: false });
        const baseCost = Number(data.base_cost || 0);
        const extraPct = Number(data.extra_charges || 0);
        const profitPct = Number(data.profit_margin || 0);
        const totalCost = Number(data.total_cost || 0);
        const extraAmount = baseCost * (extraPct / 100);
        const profitAmount = Math.max(0, totalCost - baseCost - extraAmount);
        const money = (value) => `LKR ${value.toFixed(2)}`;
        const breakdownRows = [
            ['Base Cost', money(baseCost)],
            [`Extra Charges (${extraPct.toFixed(2)}%)`, money(extraAmount)],
            [`Profit Margin (${profitPct.toFixed(2)}%)`, money(profitAmount)]
        ];
        breakdownRows.forEach(([label, value], index) => {
            const y = panelY + 28 + index * 27;
            if (index % 2 === 0)
                doc.rect(rightX, y, rightW, 27).fill('#fafafa');
            doc.fontSize(9).fillColor(BLACK).font(index === 0 ? 'Helvetica-Bold' : 'Helvetica')
                .text(label, rightX + 12, y + 9, { width: rightW * 0.58, lineBreak: false })
                .text(value, rightX + rightW * 0.58, y + 9, { width: rightW * 0.37, align: 'right', lineBreak: false });
            doc.moveTo(rightX, y + 27).lineTo(rightX + rightW, y + 27)
                .strokeColor(BORDER).lineWidth(0.5).stroke();
        });
        const totalY = panelY + 109;
        doc.rect(rightX, totalY, rightW, 39).fill(GREEN);
        doc.fontSize(11).fillColor(WHITE).font('Helvetica-Bold')
            .text('TOTAL', rightX + 12, totalY + 14, { width: rightW * 0.42, lineBreak: false })
            .text(money(totalCost), rightX + rightW * 0.42, totalY + 14, { width: rightW * 0.53, align: 'right', lineBreak: false });
        // ── DONE ──────────────────────────────────────────────────
        doc.end();
    });
};
exports.generateQuotationPdf = generateQuotationPdf;
