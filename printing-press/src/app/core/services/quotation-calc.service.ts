import { Injectable } from '@angular/core';

export type SizeUnit = 'in' | 'cm' | 'mm';

export interface CuttingResult {
  piecesPerSheet: number;
  rows:           number;
  cols:           number;
  rotated:        boolean;
  sheetsPerBook:  number;
  sheetsNeeded:   number;
  mainPieces:     number;
  extraPieces:    number;
  extraCols:      number;
  extraRows:      number;
  extraIsRight:   boolean;
}

export interface CostBreakdown {
  materialCost:      number;
  printingCost:      number;
  bindingCost:       number;
  laminationCost:    number;
  base:              number;
  withExtra:         number;
  total:             number;
}

@Injectable({ providedIn: 'root' })
export class QuotationCalcService {

  // ── Unit Conversion ──────────────────────────────────────
  toInches(value: number, unit: SizeUnit): number {
    if (!value) return 0;
    switch (unit) {
      case 'in': return value;
      case 'cm': return value / 2.54;
      case 'mm': return value / 25.4;
    }
  }

  fromInches(valueInInches: number, unit: SizeUnit): number {
    switch (unit) {
      case 'in': return valueInInches;
      case 'cm': return valueInInches * 2.54;
      case 'mm': return valueInInches * 25.4;
    }
  }

  toMm(value: number, unit: SizeUnit): number {
    return this.fromInches(this.toInches(value, unit), 'mm');
  }

  // ── Internal: single orientation layout (exact pseudocode) ─
  private calculateLayout(
    SW: number, SH: number,
    PW: number, PH: number
  ): {
    total: number; mainPieces: number;
    cols: number; rows: number;
    level1Extra: number; level2Extra: number;
    extraIsRight: boolean; extraCols: number; extraRows: number;
  } {
    // STEP 1: Main grid
    const cols       = Math.floor(SW / PW);
    const rows       = Math.floor(SH / PH);
    const mainPieces = cols * rows;

    // STEP 2: Leftover strips
    const rightStripW  = SW - (cols * PW);
    const bottomStripH = SH - (rows * PH);

    // STEP 3: Extra from right strip (rotated pieces fit rotated)
    let extraRight = 0;
    let extraRightCols = 0, extraRightRows = 0;
    if (rightStripW >= PH) {
      extraRightCols = Math.floor(rightStripW / PH);
      extraRightRows = Math.floor(SH / PW);
      extraRight     = extraRightCols * extraRightRows;
    }

    // STEP 4: Extra from bottom strip
    let extraBottom = 0;
    let extraBottomCols = 0, extraBottomRows = 0;
    if (bottomStripH >= PW) {
      extraBottomRows = Math.floor(bottomStripH / PW);
      extraBottomCols = Math.floor(SW / PH);
      extraBottom     = extraBottomRows * extraBottomCols;
    }

    // STEP 5: Select best first strip
    let level1Extra: number;
    let extraIsRight: boolean;
    let extraCols: number;
    let extraRows: number;

    if (extraRight >= extraBottom) {
      level1Extra  = extraRight;
      extraIsRight = true;
      extraCols    = extraRightCols;
      extraRows    = extraRightRows;
    } else {
      level1Extra  = extraBottom;
      extraIsRight = false;
      extraCols    = extraBottomCols;
      extraRows    = extraBottomRows;
    }

    // STEP 6: Second leftover strip. Keep it non-overlapping with the first
    // selected strip so the shared corner is not counted twice.
    let level2Extra = 0;
    if (extraIsRight) {
      // Used right strip first — now try bottom
      if (bottomStripH >= PW) {
        level2Extra = Math.floor(bottomStripH / PW) * Math.floor((cols * PW) / PH);
      }
    } else {
      // Used bottom strip first — now try right
      if (rightStripW >= PH) {
        level2Extra = Math.floor(rightStripW / PH) * Math.floor((rows * PH) / PW);
      }
    }

    // STEP 7: Total
    const total = mainPieces + level1Extra + level2Extra;

    return {
      total, mainPieces, cols, rows,
      level1Extra, level2Extra,
      extraIsRight, extraCols, extraRows
    };
  }

  // ── Public cutting layout ─────────────────────────────────
  computeCuttingLayout(
    sheetH:   number,
    sheetW:   number,
    pieceH:   number,
    pieceW:   number,
    jobQty:   number,
    jobType:  string = 'leaflet',
    pagesQty: number = 0
  ): CuttingResult {

    if (!sheetH || !sheetW || !pieceH || !pieceW) {
      return {
        piecesPerSheet: 0, rows: 0, cols: 0,
        rotated: false,   sheetsPerBook: 0, sheetsNeeded: 0,
        mainPieces: 0,    extraPieces: 0,
        extraCols: 0,     extraRows: 0, extraIsRight: true
      };
    }

    // STEP 8: Both orientations
    const normalLayout  = this.calculateLayout(sheetW, sheetH, pieceW, pieceH);
    const rotatedLayout = this.calculateLayout(sheetW, sheetH, pieceH, pieceW);

    // STEP 9: Select best (normal wins on tie per pseudocode)
    const useRotated = rotatedLayout.total > normalLayout.total;
    const best       = useRotated ? rotatedLayout : normalLayout;

    const piecesPerSheet = best.total;
    const cols           = best.cols;
    const rows           = best.rows;
    const mainPieces     = best.mainPieces;
    const extraPieces    = best.level1Extra + best.level2Extra;
    const extraCols      = best.extraCols;
    const extraRows      = best.extraRows;
    const extraIsRight   = best.extraIsRight;

    // STEP 10: Sheets needed
    let sheetsNeeded = 0;
    let sheetsPerBook = 0;
    if (piecesPerSheet > 0) {
      if (jobType === 'book' && pagesQty > 0) {
        // A book cannot share the unused capacity of its final sheet with
        // another book, so round per book before multiplying by the run size.
        sheetsPerBook = Math.ceil(pagesQty / (piecesPerSheet * 2));
        sheetsNeeded = jobQty * sheetsPerBook;
      } else {
        sheetsNeeded = Math.ceil(jobQty / piecesPerSheet);
      }
    }

    return {
      piecesPerSheet, rows, cols,
      rotated: useRotated, sheetsPerBook, sheetsNeeded,
      mainPieces, extraPieces,
      extraCols, extraRows, extraIsRight
    };
  }

  // ── Printing Cost ────────────────────────────────────────
  findPrintingSlabPrice(
    slabs:      any[],
    colorValue: string,
    quantity:   number
  ): number {
    if (!colorValue || colorValue === 'none') return 0;
    const colorType = colorValue === '4' ? '4color' : '1color';
    const match = slabs.find(s =>
      s.name === colorType &&
      quantity >= Number(s.min_qty) &&
      quantity <= Number(s.max_qty)
    );
    if (!match) return 0;
    return Number(match.price) * quantity;
  }

  // ── Material Cost ─────────────────────────────────────────
  computeMaterialCost(sheetsNeeded: number, unitPrice: number): number {
    return sheetsNeeded * unitPrice;
  }

  // ── Binding Cost ──────────────────────────────────────────
  findBindingPrice(
    bindingTypes: any[],
    bindingId:    number | null,
    pagesQty:     number,
    jobQty:       number
  ): number {
    if (!bindingId) return 0;
    const selected = bindingTypes.find(b => b.sid === bindingId);
    if (!selected) return 0;

    const ranges = bindingTypes
      .filter(b => b.name === selected.name)
      .sort((a, b) => Number(a.min_pages || 0) - Number(b.min_pages || 0));

    const inRange = ranges.find(b =>
      pagesQty >= Number(b.min_pages || 0) &&
      pagesQty <= Number(b.max_pages || 0)
    );
    const nextHigher = ranges.find(b => pagesQty <= Number(b.max_pages || 0));
    const fallback = ranges[ranges.length - 1];
    const match = inRange || nextHigher || fallback;

    return match ? Number(match.price) * jobQty : 0;
  }

  // ── Lamination Cost ───────────────────────────────────────
  findLaminationPrice(
    laminationTypes: any[],
    laminationId:    number | null,
    jobQty:          number,
    jobType:         string,
    pagesQty:        number
  ): number {
    if (!laminationId) return 0;
    const match = laminationTypes.find(l => l.sid === laminationId);
    if (!match) return 0;
    const quantity = jobType === 'book' ? pagesQty * jobQty : jobQty;
    return Number(match.price) * quantity;
  }

  // ── Full Cost Breakdown ───────────────────────────────────
  computeFullCost(params: {
    materialSheetsNeeded: number;
    materialUnitPrice:    number;
    printingSlabs:        any[];
    pagesFrontColor:      string;
    pagesBackColor:       string;
    coverFrontColor:      string;
    coverBackColor:       string;
    jobQty:               number;
    jobType:              string;
    pagesQty:             number;
    bindingTypes:         any[];
    bindingId:            number | null;
    laminationTypes:      any[];
    laminationId:         number | null;
    extraChargesPct:      number;
    profitMarginPct:      number;
  }): CostBreakdown {

    const materialCost = this.computeMaterialCost(
      params.materialSheetsNeeded, params.materialUnitPrice
    );
    let pagesPrintingCost: number;

    if (params.jobType === 'book') {
      // Two pages are treated as the front and back covers. Split the remaining
      // inside pages equally between the front and back printing passes.
      const insideUnitsPerBook = Math.ceil(Math.max(params.pagesQty - 2, 0) / 2);

      const insideFrontCostPerBook = this.findPrintingSlabPrice(
        params.printingSlabs,
        params.pagesFrontColor,
        insideUnitsPerBook
      );
      const insideBackCostPerBook = this.findPrintingSlabPrice(
        params.printingSlabs,
        params.pagesBackColor,
        insideUnitsPerBook
      );

      pagesPrintingCost =
        (insideFrontCostPerBook + insideBackCostPerBook) * params.jobQty;
    } else {
      pagesPrintingCost =
        this.findPrintingSlabPrice(params.printingSlabs, params.pagesFrontColor, params.jobQty) +
        this.findPrintingSlabPrice(params.printingSlabs, params.pagesBackColor, params.jobQty);
    }

    // Covers are priced using the total number of finished books/leaflets.
    const coverPrintingCost =
      this.findPrintingSlabPrice(params.printingSlabs, params.coverFrontColor, params.jobQty) +
      this.findPrintingSlabPrice(params.printingSlabs, params.coverBackColor, params.jobQty);

    const printingCost = pagesPrintingCost + coverPrintingCost;

    const bindingCost = this.findBindingPrice(
      params.bindingTypes, params.bindingId, params.pagesQty, params.jobQty
    );
    const laminationCost = this.findLaminationPrice(
      params.laminationTypes, params.laminationId, params.jobQty, params.jobType, params.pagesQty
    );

    const base      = materialCost + printingCost + bindingCost + laminationCost;
    const withExtra = base + (base * (params.extraChargesPct / 100));
    const total     = withExtra + (withExtra * (params.profitMarginPct / 100));

    return {
      materialCost, printingCost,
      bindingCost,  laminationCost,    base, withExtra, total
    };
  }
}
