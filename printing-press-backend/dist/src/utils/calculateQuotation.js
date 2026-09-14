"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateQuotationFromDatabase = exports.fetchQuotationRates = exports.calculateQuotation = exports.computeFullCost = exports.findLaminationPrice = exports.findBindingPrice = exports.computeMaterialCost = exports.findPrintingSlabPrice = exports.normalizeColorValue = exports.computeCuttingLayout = exports.toMm = exports.fromInches = exports.toInches = exports.roundMoney = void 0;
const db_1 = __importDefault(require("../config/db"));
const emptyCuttingResult = () => ({
    piecesPerSheet: 0,
    rows: 0,
    cols: 0,
    rotated: false,
    sheetsNeeded: 0,
    mainPieces: 0,
    extraPieces: 0,
    extraCols: 0,
    extraRows: 0,
    extraIsRight: true
});
const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const rateId = (rate) => rate.sid ?? rate.material_id ?? rate.slab_id ?? rate.binding_id ?? rate.lamination_id;
const roundMoney = (value) => Math.round(value * 100) / 100;
exports.roundMoney = roundMoney;
const toInches = (value, unit = 'mm') => {
    if (!value)
        return 0;
    switch (unit) {
        case 'in':
            return value;
        case 'cm':
            return value / 2.54;
        case 'mm':
            return value / 25.4;
    }
};
exports.toInches = toInches;
const fromInches = (valueInInches, unit = 'mm') => {
    switch (unit) {
        case 'in':
            return valueInInches;
        case 'cm':
            return valueInInches * 2.54;
        case 'mm':
            return valueInInches * 25.4;
    }
};
exports.fromInches = fromInches;
const toMm = (value, unit = 'mm') => (0, exports.fromInches)((0, exports.toInches)(value, unit), 'mm');
exports.toMm = toMm;
const calculateLayout = (sheetWidth, sheetHeight, pieceWidth, pieceHeight) => {
    const cols = Math.floor(sheetWidth / pieceWidth);
    const rows = Math.floor(sheetHeight / pieceHeight);
    const mainPieces = cols * rows;
    const rightStripWidth = sheetWidth - cols * pieceWidth;
    const bottomStripHeight = sheetHeight - rows * pieceHeight;
    let extraRight = 0;
    let extraRightCols = 0;
    let extraRightRows = 0;
    if (rightStripWidth >= pieceHeight) {
        extraRightCols = Math.floor(rightStripWidth / pieceHeight);
        extraRightRows = Math.floor(sheetHeight / pieceWidth);
        extraRight = extraRightCols * extraRightRows;
    }
    let extraBottom = 0;
    let extraBottomCols = 0;
    let extraBottomRows = 0;
    if (bottomStripHeight >= pieceWidth) {
        extraBottomRows = Math.floor(bottomStripHeight / pieceWidth);
        extraBottomCols = Math.floor(sheetWidth / pieceHeight);
        extraBottom = extraBottomRows * extraBottomCols;
    }
    const extraIsRight = extraRight >= extraBottom;
    const level1Extra = extraIsRight ? extraRight : extraBottom;
    const extraCols = extraIsRight ? extraRightCols : extraBottomCols;
    const extraRows = extraIsRight ? extraRightRows : extraBottomRows;
    let level2Extra = 0;
    if (extraIsRight && bottomStripHeight >= pieceWidth) {
        level2Extra = Math.floor(bottomStripHeight / pieceWidth) * Math.floor((cols * pieceWidth) / pieceHeight);
    }
    if (!extraIsRight && rightStripWidth >= pieceHeight) {
        level2Extra = Math.floor(rightStripWidth / pieceHeight) * Math.floor((rows * pieceHeight) / pieceWidth);
    }
    return {
        total: mainPieces + level1Extra + level2Extra,
        mainPieces,
        cols,
        rows,
        level1Extra,
        level2Extra,
        extraIsRight,
        extraCols,
        extraRows
    };
};
const computeCuttingLayout = (sheetHeight, sheetWidth, pieceHeight, pieceWidth, jobQty, jobType = 'leaflet', pagesQty = 0) => {
    if (!sheetHeight || !sheetWidth || !pieceHeight || !pieceWidth) {
        return emptyCuttingResult();
    }
    const normalLayout = calculateLayout(sheetWidth, sheetHeight, pieceWidth, pieceHeight);
    const rotatedLayout = calculateLayout(sheetWidth, sheetHeight, pieceHeight, pieceWidth);
    const useRotated = rotatedLayout.total > normalLayout.total;
    const best = useRotated ? rotatedLayout : normalLayout;
    const piecesPerSheet = best.total;
    const printUnits = jobType === 'book' && pagesQty > 0 ? jobQty * pagesQty : jobQty;
    const sheetsNeeded = piecesPerSheet > 0
        ? Math.ceil(jobType === 'book' && pagesQty > 0 ? printUnits / (piecesPerSheet * 2) : jobQty / piecesPerSheet)
        : 0;
    return {
        piecesPerSheet,
        rows: best.rows,
        cols: best.cols,
        rotated: useRotated,
        sheetsNeeded,
        mainPieces: best.mainPieces,
        extraPieces: best.level1Extra + best.level2Extra,
        extraCols: best.extraCols,
        extraRows: best.extraRows,
        extraIsRight: best.extraIsRight
    };
};
exports.computeCuttingLayout = computeCuttingLayout;
const normalizeColorValue = (value) => {
    if (value === 4 || value === '4')
        return '4';
    if (value === 1 || value === '1')
        return '1';
    return 'none';
};
exports.normalizeColorValue = normalizeColorValue;
const findPrintingSlabPrice = (slabs, colorValue, quantity) => {
    const normalized = (0, exports.normalizeColorValue)(colorValue);
    if (normalized === 'none' || quantity <= 0)
        return 0;
    const colorType = normalized === '4' ? '4color' : '1color';
    const match = slabs.find((slab) => {
        const slabColor = slab.name ?? slab.color_type;
        return slabColor === colorType &&
            quantity >= toNumber(slab.min_qty) &&
            quantity <= toNumber(slab.max_qty);
    });
    return match ? toNumber(match.price ?? match.price_per_unit) * quantity : 0;
};
exports.findPrintingSlabPrice = findPrintingSlabPrice;
const computeMaterialCost = (sheetsNeeded, unitPrice) => sheetsNeeded * unitPrice;
exports.computeMaterialCost = computeMaterialCost;
const findBindingPrice = (bindingTypes, bindingId, pagesQty, jobQty) => {
    if (!bindingId || jobQty <= 0)
        return 0;
    const selected = bindingTypes.find((binding) => rateId(binding) === bindingId);
    if (!selected)
        return 0;
    const selectedName = selected.name ?? selected.binding_name;
    const ranges = bindingTypes
        .filter((binding) => (binding.name ?? binding.binding_name) === selectedName)
        .sort((a, b) => toNumber(a.min_pages) - toNumber(b.min_pages));
    const inRange = ranges.find((binding) => pagesQty >= toNumber(binding.min_pages) &&
        pagesQty <= toNumber(binding.max_pages));
    const nextHigher = ranges.find((binding) => pagesQty <= toNumber(binding.max_pages));
    const fallback = ranges[ranges.length - 1];
    const match = inRange || nextHigher || fallback;
    return match ? toNumber(match.price) * jobQty : 0;
};
exports.findBindingPrice = findBindingPrice;
const findLaminationPrice = (laminationTypes, laminationId, jobQty, jobType, pagesQty) => {
    if (!laminationId || jobQty <= 0)
        return 0;
    const match = laminationTypes.find((lamination) => rateId(lamination) === laminationId);
    if (!match)
        return 0;
    const quantity = jobType === 'book' ? pagesQty * jobQty : jobQty;
    return toNumber(match.price ?? match.price_per_unit) * quantity;
};
exports.findLaminationPrice = findLaminationPrice;
const computeFullCost = (params) => {
    const materialCost = (0, exports.computeMaterialCost)(params.materialSheetsNeeded, params.materialUnitPrice);
    const printUnits = params.jobType === 'book'
        ? params.pagesQty * params.jobQty
        : params.jobQty;
    const printingCost = (0, exports.findPrintingSlabPrice)(params.printingSlabs, params.pagesFrontColor, printUnits) +
        (0, exports.findPrintingSlabPrice)(params.printingSlabs, params.pagesBackColor, printUnits) +
        (0, exports.findPrintingSlabPrice)(params.printingSlabs, params.coverFrontColor, params.jobQty) +
        (0, exports.findPrintingSlabPrice)(params.printingSlabs, params.coverBackColor, params.jobQty);
    const bindingCost = (0, exports.findBindingPrice)(params.bindingTypes, params.bindingId, params.pagesQty, params.jobQty);
    const laminationCost = (0, exports.findLaminationPrice)(params.laminationTypes, params.laminationId, params.jobQty, params.jobType, params.pagesQty);
    const base = materialCost + printingCost + bindingCost + laminationCost;
    const withExtra = base + base * (params.extraChargesPct / 100);
    const total = withExtra + withExtra * (params.profitMarginPct / 100);
    return {
        materialCost: (0, exports.roundMoney)(materialCost),
        printingCost: (0, exports.roundMoney)(printingCost),
        bindingCost: (0, exports.roundMoney)(bindingCost),
        laminationCost: (0, exports.roundMoney)(laminationCost),
        base: (0, exports.roundMoney)(base),
        withExtra: (0, exports.roundMoney)(withExtra),
        total: (0, exports.roundMoney)(total)
    };
};
exports.computeFullCost = computeFullCost;
const calculateQuotation = (input, rates) => {
    const material = rates.materials.find((item) => rateId(item) === input.materialId);
    const unit = input.sizeUnit ?? 'mm';
    const marginIn = (0, exports.toInches)(input.marginSize ?? 0, unit);
    const pieceHeightIn = (0, exports.toInches)(input.jobSizeHeight, unit) + marginIn * 2;
    const pieceWidthIn = (0, exports.toInches)(input.jobSizeWidth, unit) + marginIn * 2;
    const isLeaflet = input.jobType === 'leaflet';
    const cutting = material
        ? (0, exports.computeCuttingLayout)(toNumber(material.height), toNumber(material.width), pieceHeightIn, pieceWidthIn, input.jobQty, input.jobType || 'leaflet', input.pagesQty ?? 0)
        : emptyCuttingResult();
    const costs = (0, exports.computeFullCost)({
        materialSheetsNeeded: cutting.sheetsNeeded,
        materialUnitPrice: material ? toNumber(material.costPerUnit ?? material.unit_price) : 0,
        printingSlabs: rates.printingSlabs,
        pagesFrontColor: input.pagesFrontColor ?? 'none',
        pagesBackColor: input.pagesBackColor ?? 'none',
        coverFrontColor: isLeaflet ? 'none' : input.coverFrontColor ?? 'none',
        coverBackColor: isLeaflet ? 'none' : input.coverBackColor ?? 'none',
        jobQty: input.jobQty,
        jobType: input.jobType || 'leaflet',
        pagesQty: input.pagesQty ?? 0,
        bindingTypes: rates.bindingTypes,
        bindingId: isLeaflet ? null : input.bindingId ?? null,
        laminationTypes: rates.laminationTypes,
        laminationId: input.laminationId ?? null,
        extraChargesPct: input.extraChargesPct ?? 0,
        profitMarginPct: input.profitMarginPct ?? 0
    });
    return { cutting, costs };
};
exports.calculateQuotation = calculateQuotation;
const fetchQuotationRates = async () => {
    const [materials] = await db_1.default.query(`
    SELECT material_id, material_id AS sid, height, width, unit_price, unit_price AS costPerUnit
    FROM material
  `);
    const [printingSlabs] = await db_1.default.query(`
    SELECT slab_id, slab_id AS sid, color_type, color_type AS name, min_qty, max_qty,
           price_per_unit, price_per_unit AS price
    FROM printing_slab
  `);
    const [bindingTypes] = await db_1.default.query(`
    SELECT binding_id, binding_id AS sid, binding_name, binding_name AS name,
           min_pages, max_pages, price
    FROM binding_type
  `);
    const [laminationTypes] = await db_1.default.query(`
    SELECT lamination_id, lamination_id AS sid, lamination_name, lamination_name AS name,
           price_per_unit, price_per_unit AS price
    FROM lamination_type
  `);
    return {
        materials: materials,
        printingSlabs: printingSlabs,
        bindingTypes: bindingTypes,
        laminationTypes: laminationTypes
    };
};
exports.fetchQuotationRates = fetchQuotationRates;
const calculateQuotationFromDatabase = async (input) => (0, exports.calculateQuotation)(input, await (0, exports.fetchQuotationRates)());
exports.calculateQuotationFromDatabase = calculateQuotationFromDatabase;
