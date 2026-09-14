"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateQuotationCost = void 0;
const findPrintingSlabPrice = (slabs, colorValue, quantity) => {
    if (!colorValue || colorValue === 'none')
        return 0;
    const colorType = colorValue === '4' ? '4color' : '1color';
    const match = slabs.find(s => s.name === colorType &&
        quantity >= Number(s.min_qty) &&
        quantity <= Number(s.max_qty));
    if (!match) {
        throw new Error(`MISSING_PRINTING_SLAB:${colorType}:${quantity}`);
    }
    return Number(match.price) * quantity;
};
const findBindingPrice = (bindingTypes, bindingId, pagesQty, jobQty) => {
    if (!bindingId)
        return 0;
    const selected = bindingTypes.find(b => b.sid === bindingId);
    if (!selected)
        return 0;
    const ranges = bindingTypes
        .filter(b => b.name === selected.name)
        .sort((a, b) => Number(a.min_pages || 0) - Number(b.min_pages || 0));
    const inRange = ranges.find(b => pagesQty >= Number(b.min_pages || 0) && pagesQty <= Number(b.max_pages || 0));
    const nextHigher = ranges.find(b => pagesQty <= Number(b.max_pages || 0));
    const match = inRange || nextHigher || ranges[ranges.length - 1];
    return match ? Number(match.price) * jobQty : 0;
};
const findLaminationPrice = (laminationTypes, laminationId, laminationName, jobHeightIn, jobWidthIn, jobQty, jobType) => {
    if (!laminationId && (!laminationName || laminationName === 'none'))
        return 0;
    const selected = laminationTypes.find(l => l.sid === laminationId);
    const name = laminationName || selected?.name;
    if (!name)
        return 0;
    const matches = laminationTypes.filter(l => l.name === name);
    if (!matches.length)
        return 0;
    const jobLong = Math.max(jobHeightIn, jobWidthIn);
    const jobShort = Math.min(jobHeightIn, jobWidthIn);
    const jobArea = jobLong * jobShort;
    let closest = matches[0];
    let bestScore = Infinity;
    // Preserve the existing closest-standard-size selection algorithm.
    for (const lamination of matches) {
        const lamLong = Math.max(Number(lamination.height), Number(lamination.width));
        const lamShort = Math.min(Number(lamination.height), Number(lamination.width));
        const lamArea = lamLong * lamShort;
        const fits = lamLong >= jobLong && lamShort >= jobShort;
        const waste = lamArea - jobArea;
        const score = fits ? waste : Math.abs(waste) + 1000000;
        if (score < bestScore) {
            bestScore = score;
            closest = lamination;
        }
    }
    const quantity = jobType === 'book' ? jobQty * 2 : jobQty;
    return Number(closest.price) * quantity;
};
// This is the server-side equivalent of the existing Angular calculation.
// Formula order and rounding are intentionally unchanged.
const calculateQuotationCost = (params) => {
    const materialCost = params.materialSheetsNeeded * params.materialUnitPrice;
    let pagesPrintingCost;
    if (params.jobType === 'book') {
        const insideUnitsPerBook = Math.ceil(Math.max(params.pagesQty - 2, 0) / 2);
        const insideFrontCostPerBook = findPrintingSlabPrice(params.printingSlabs, params.pagesFrontColor, insideUnitsPerBook);
        const insideBackCostPerBook = findPrintingSlabPrice(params.printingSlabs, params.pagesBackColor, insideUnitsPerBook);
        pagesPrintingCost = (insideFrontCostPerBook + insideBackCostPerBook) * params.jobQty;
    }
    else {
        pagesPrintingCost =
            findPrintingSlabPrice(params.printingSlabs, params.pagesFrontColor, params.jobQty) +
                findPrintingSlabPrice(params.printingSlabs, params.pagesBackColor, params.jobQty);
    }
    const coverPrintingCost = findPrintingSlabPrice(params.printingSlabs, params.coverFrontColor, params.jobQty) +
        findPrintingSlabPrice(params.printingSlabs, params.coverBackColor, params.jobQty);
    const printingCost = pagesPrintingCost + coverPrintingCost;
    const bindingCost = findBindingPrice(params.bindingTypes, params.bindingId, params.pagesQty, params.jobQty);
    const laminationCost = findLaminationPrice(params.laminationTypes, params.laminationId, params.laminationName, Number(params.jobHeightIn || 0), Number(params.jobWidthIn || 0), params.jobQty, params.jobType);
    const base = materialCost + printingCost + bindingCost + laminationCost;
    const withExtra = base + (base * (params.extraChargesPct / 100));
    const total = withExtra + (withExtra * (params.profitMarginPct / 100));
    return { materialCost, printingCost, bindingCost, laminationCost, base, withExtra, total };
};
exports.calculateQuotationCost = calculateQuotationCost;
