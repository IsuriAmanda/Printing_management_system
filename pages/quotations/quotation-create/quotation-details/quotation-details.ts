import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
  OnInit,
  Inject,
  inject,
  signal
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { QuotationService } from '../../../../core/services/quotation.service';
import { SupplyService }    from '../../../../core/services/supply.service';
import {
  QuotationCalcService,
  SizeUnit,
  CuttingResult,
  CostBreakdown
} from '../../../../core/services/quotation-calc.service';
import { Quotation, QuotationPayload } from '../../../../core/models/quotation.model';
import { ArtworkService } from '../../../../core/services/artwork.service';
import { Artwork } from '../../../../core/models/artwork.model';
import { debounceTime, forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-quotation-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './quotation-details.html',
  styleUrls: ['./quotation-details.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuotationDetails implements OnInit {

  private quotationService = inject(QuotationService);
  private supplyService    = inject(SupplyService);
  private calc             = inject(QuotationCalcService);
  private fb               = inject(FormBuilder);
  private router           = inject(Router);
  private route            = inject(ActivatedRoute);
  private cdr              = inject(ChangeDetectorRef);
  private destroyRef       = inject(DestroyRef);
  private artworkService = inject(ArtworkService);
  private readonly isBrowser: boolean;
  artworks = signal<Artwork[]>([]);
  uploading = signal(false);
  downloadingPdf = signal(false);
  pendingArtworkFiles: File[] = [];

  form;
  total          = 0;
  costBreakdown: CostBreakdown | null = null;
  isViewMode     = false;
  isJobQuotationView = false;
  isSaving       = false;
  isLoading      = true;
  quotation: Quotation | null = null;
  private quotationId: number | null = null;
  private draftCustomer: any = null;

  materials:       any[] = [];
  bindingTypes:    any[] = [];
  laminationTypes: any[] = [];
  printingSlabs:   any[] = [];
  standards:       any[] = [];

  cuttingResult: CuttingResult = {
    piecesPerSheet: 0, rows: 0, cols: 0,
    rotated: false,   sheetsPerBook: 0, sheetsNeeded: 0,
    mainPieces: 0,    extraPieces: 0,
    extraCols: 0,     extraRows: 0, extraIsRight: true
  };
  cuttingGrid: number[] = [];
  extraGrid:   number[] = [];

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.form = this.fb.group({
      jobName:         [''],
      jobType:         [''],
      jobQty:          [0],
      sizeUnit:        ['mm' as SizeUnit],
      standardSizeId:  [''],
      jobSizeHeight:   [0],
      jobSizeWidth:    [0],
      marginSize:      [0],
      pagesQty:        [0],
      hpMaterial:      [false],
      pagesMaterialId: [''],
      pagesFrontColor: ['none'],
      pagesBackColor:  ['none'],
      coverFrontColor: ['none'],
      coverBackColor:  ['none'],
      laminate:        ['none'],
      binding:         ['none'],
      extraChargesPct: [5],
      profitMarginPct: [10],
    });
  }

  ngOnInit(): void {
    this.isJobQuotationView = this.route.snapshot.data['jobQuotationView'] === true;
    if (this.isJobQuotationView) {
      this.isViewMode = true;
      this.form.disable({ emitEvent: false });
    }

    const idParam = this.route.snapshot.paramMap.get('id');
    this.quotationId = idParam ? Number(idParam) : null;

    if (!this.quotationId) {
      const draft = this.quotationService.getDraftQuotation();
      this.draftCustomer = draft?.customer ?? null;

      if (!this.draftCustomer) {
        this.router.navigate(['/quotations/quotation-create']);
        return;
      }

      this.quotation = {
        job_name: '',
        job_type: '',
        status: 'DRAFT',
        customer_id: this.draftCustomer.customer_id,
        customer_name: this.draftCustomer.customer_name
      };
      this.isLoading = false;
    } else {
      this.loadQuotation();
      this.loadArtwork();
    }

    this.loadSupplies();

    this.form.valueChanges
      .pipe(debounceTime(120), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.isViewMode) this.recalculateCuttingPreview();
      });
  }

  // ── Load quotation ─────────────────────────────────────────
  private loadQuotation(): void {
    if (!this.quotationId) return;
    this.quotationService.getQuotationById(this.quotationId).subscribe({
      next: (q) => {
        this.quotation = q;

        const colorVal = (n: number | null | undefined): string => {
          if (n === 4) return '4';
          if (n === 1) return '1';
          return 'none';
        };

        const unit: SizeUnit = 'in';
        const toUnit = (mmVal: number | null | undefined): number => {
          if (!mmVal) return 0;
          return Math.round(Number(mmVal) * 100) / 100;
        };

        const hasItem = !!(q as any).item_id;

        this.form.patchValue({
          jobName:         q.job_name  ?? '',
          jobType:         q.job_type  ?? '',
          extraChargesPct: q.extra_charges || 5,
          profitMarginPct: q.profit_margin || 10,
          ...(hasItem ? {
            sizeUnit:        unit,
            jobQty:          (q as any).quantity      || 0,
            jobSizeHeight:   toUnit((q as any).height),
            jobSizeWidth:    toUnit((q as any).width),
            pagesQty:        (q as any).pages         || 0,
            pagesMaterialId: (q as any).material_id
              ? String((q as any).material_id)
              : '',
            pagesFrontColor: colorVal((q as any).front_color_pages),
            pagesBackColor:  colorVal((q as any).back_color_pages),
            coverFrontColor: colorVal((q as any).cover_front_color_pages),
            coverBackColor:  colorVal((q as any).cover_back_color_pages),
            binding:         (q as any).binding_id    ? String((q as any).binding_id)    : 'none',
            laminate:        (q as any).lamination_id ? String((q as any).lamination_id) : 'none',
          } : {})
        }, { emitEvent: false });

        this.isLoading = false;
        if (this.isJobQuotationView) {
          this.form.disable({ emitEvent: false });
        }
        this.cdr.markForCheck();

        this.recalculateCuttingPreview();
        this.prepareJobQuotationView();
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/quotations']);
      }
    });
  }

  // ── Load supplies ──────────────────────────────────────────
  private loadSupplies(): void {
    forkJoin({
      materials: this.supplyService.getMaterials(),
      bindingTypes: this.supplyService.getBinding(),
      laminationTypes: this.supplyService.getLamination(),
      printingSlabs: this.supplyService.getPrinting(),
      standards: this.supplyService.getStandards()
    }).subscribe({
      next: ({ materials, bindingTypes, laminationTypes, printingSlabs, standards }) => {
        this.materials = materials;
        this.bindingTypes = bindingTypes;
        this.laminationTypes = laminationTypes;
        this.printingSlabs = printingSlabs;
        this.standards = standards;
        this.recalculateCuttingPreview();
        this.prepareJobQuotationView();
        this.cdr.markForCheck();
      }
    });
  }

  // ── Lamination helpers ─────────────────────────────────────
  get uniqueLaminationNames(): string[] {
    const names = this.laminationTypes.map((l: any) => l.name as string);
    return [...new Set(names)];
  }

  get selectedLaminationName(): string {
    const v = this.form.getRawValue();
    if (!v.laminate || v.laminate === 'none') return 'none';
    const match = this.laminationTypes.find((l: any) => l.sid === Number(v.laminate));
    return match?.name || 'none';
  }

  get selectedLaminationInfo(): string {
    const v = this.form.getRawValue();
    if (!v.laminate || v.laminate === 'none') return '';
    const match = this.laminationTypes.find((l: any) => l.sid === Number(v.laminate));
    if (!match) return '';
    return `${match.size} — LKR ${Number(match.price).toFixed(2)}/unit`;
  }

  // Auto-selects lamination sid closest to job size
  private getBestLaminationId(name: string): number | null {
    if (!name || name === 'none') return null;

    const v      = this.form.getRawValue();
    const unit   = v.sizeUnit as SizeUnit;
    const jobHIn = this.calc.toInches(v.jobSizeHeight || 0, unit);
    const jobWIn = this.calc.toInches(v.jobSizeWidth  || 0, unit);
    const jobLong = Math.max(jobHIn, jobWIn);
    const jobShort = Math.min(jobHIn, jobWIn);
    const jobArea = jobLong * jobShort;

    const matches = this.laminationTypes.filter((l: any) => l.name === name);
    if (!matches.length) return null;

    let best     = matches[0];
    let bestScore = Infinity;

    for (const lam of matches) {
      const lamLong = Math.max(Number(lam.height), Number(lam.width));
      const lamShort = Math.min(Number(lam.height), Number(lam.width));
      const lamArea = lamLong * lamShort;
      const fits = lamLong >= jobLong && lamShort >= jobShort;
      const waste = lamArea - jobArea;
      const score = fits ? waste : Math.abs(waste) + 1_000_000;
      if (score < bestScore) { bestScore = score; best = lam; }
    }
    return best.sid;
  }

  onLaminationNameChange(name: string): void {
    if (!name || name === 'none') {
      this.form.patchValue({ laminate: 'none' }, { emitEvent: false });
    } else {
      const sid = this.getBestLaminationId(name);
      this.form.patchValue(
        { laminate: sid ? String(sid) : 'none' },
        { emitEvent: false }
      );
    }
    this.cdr.markForCheck();
  }

  get uniqueBindingNames(): string[] {
    return [...new Set(this.bindingTypes.map((b: any) => b.name as string).filter(Boolean))];
  }

  get selectedBindingName(): string {
    const id = Number(this.form.get('binding')?.value);
    return this.bindingTypes.find((b: any) => Number(b.sid) === id)?.name || 'none';
  }

  get selectedBindingInfo(): string {
    const id = Number(this.form.get('binding')?.value);
    const binding = this.bindingTypes.find((b: any) => Number(b.sid) === id);
    return binding
      ? `${binding.min_pages}–${binding.max_pages} pages — LKR ${Number(binding.price).toFixed(2)}`
      : '';
  }

  private getBindingIdForPages(name: string, pages: number): number | null {
    const ranges = this.bindingTypes
      .filter((b: any) => b.name === name)
      .sort((a: any, b: any) => Number(a.min_pages) - Number(b.min_pages));
    if (!ranges.length) return null;
    const exact = ranges.find((b: any) =>
      pages >= Number(b.min_pages) && pages <= Number(b.max_pages)
    );
    const nextHigher = ranges.find((b: any) => pages <= Number(b.max_pages));
    return Number((exact || nextHigher || ranges[ranges.length - 1]).sid);
  }

  onBindingNameChange(name: string): void {
    const id = name === 'none'
      ? null
      : this.getBindingIdForPages(name, Number(this.form.get('pagesQty')?.value) || 0);
    this.form.patchValue({ binding: id ? String(id) : 'none' }, { emitEvent: false });
    this.cdr.markForCheck();
  }

  private syncSelectedBindingRange(): void {
    const name = this.selectedBindingName;
    if (name === 'none') return;
    const id = this.getBindingIdForPages(name, Number(this.form.get('pagesQty')?.value) || 0);
    this.form.patchValue({ binding: id ? String(id) : 'none' }, { emitEvent: false });
  }

  // ── Job type change ────────────────────────────────────────
  onJobTypeChange(newType: string): void {
    const pagesControl = this.form.get('pagesQty');
    if (newType === 'book') {
      pagesControl?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      pagesControl?.clearValidators();
    }

    if (newType === 'leaflet') {
      this.form.patchValue({
        pagesQty: 0,
        coverFrontColor: 'none', coverBackColor: 'none', binding: 'none'
      }, { emitEvent: false });
    }
    pagesControl?.updateValueAndValidity({ emitEvent: false });
    this.recalculateCuttingPreview();
    this.cdr.markForCheck();
  }

  // ── Standard size picker ───────────────────────────────────
  onStandardSizeChange(sizeId: string): void {
    if (!sizeId) return;
    const std  = this.standards.find(s => s.size_id === Number(sizeId));
    if (!std) return;
    const unit = this.form.get('sizeUnit')!.value as SizeUnit;

    this.form.patchValue({
      jobSizeHeight: Math.round(this.calc.fromInches(Number(std.height), unit) * 100) / 100,
      jobSizeWidth:  Math.round(this.calc.fromInches(Number(std.width),  unit) * 100) / 100
    }, { emitEvent: false });

    this.recalculateCuttingPreview();
    this.cdr.markForCheck();
  }

  // ── Unit change ────────────────────────────────────────────
  onUnitChange(newUnit: SizeUnit): void {
    const v       = this.form.getRawValue();
    const oldUnit = v.sizeUnit as SizeUnit;
    if (oldUnit === newUnit) return;

    const conv = (val: number | null): number =>
      Math.round(
        this.calc.fromInches(this.calc.toInches(val || 0, oldUnit), newUnit) * 100
      ) / 100;

    this.form.patchValue({
      sizeUnit:      newUnit,
      jobSizeHeight: conv(v.jobSizeHeight),
      jobSizeWidth:  conv(v.jobSizeWidth),
      marginSize:    conv(v.marginSize)
    }, { emitEvent: false });

    this.recalculateCuttingPreview();
    this.cdr.markForCheck();
  }

  // ── Live cutting preview ───────────────────────────────────
  private recalculateCuttingPreview(): void {
    const v = this.form.getRawValue();

    const pagesMaterial = this.materials.find(
      m => m.sid === Number(v.pagesMaterialId)
    );

    if (!pagesMaterial || !v.jobSizeHeight || !v.jobSizeWidth) {
      this.cuttingResult = {
        piecesPerSheet: 0, rows: 0, cols: 0,
        rotated: false,   sheetsPerBook: 0, sheetsNeeded: 0,
        mainPieces: 0,    extraPieces: 0,
        extraCols: 0,     extraRows: 0, extraIsRight: true
      };
      this.cuttingGrid = [];
      this.extraGrid   = [];
      return;
    }

    const unit     = v.sizeUnit as SizeUnit;
    const marginIn = this.calc.toInches(v.marginSize || 0, unit);
    const pieceHIn = this.calc.toInches(v.jobSizeHeight, unit) + (marginIn * 2);
    const pieceWIn = this.calc.toInches(v.jobSizeWidth,  unit) + (marginIn * 2);

    this.cuttingResult = this.calc.computeCuttingLayout(
      Number(pagesMaterial.height),
      Number(pagesMaterial.width),
      pieceHIn, pieceWIn,
      v.jobQty   || 0,
      v.jobType  || 'leaflet',
      v.pagesQty || 0
    );

    this.cuttingGrid = Array.from(
      { length: this.cuttingResult.mainPieces }, (_, i) => i
    );
    this.extraGrid = Array.from(
      { length: this.cuttingResult.extraPieces }, (_, i) => i
    );

    this.cdr.markForCheck();
  }

  // ── VIEW ───────────────────────────────────────────────────
  private validateQuotationDetails(): boolean {
    this.syncSelectedBindingRange();
    const v = this.form.getRawValue();
    const errors: string[] = [];
    if (!v.jobName?.trim()) errors.push('Job name is required.');
    if (v.jobType !== 'book' && v.jobType !== 'leaflet') errors.push('Select a valid job type.');
    if (!Number.isFinite(Number(v.jobQty)) || Number(v.jobQty) <= 0) errors.push('Quantity must be greater than zero.');
    if (!Number.isFinite(Number(v.jobSizeHeight)) || Number(v.jobSizeHeight) <= 0) errors.push('Height must be greater than zero.');
    if (!Number.isFinite(Number(v.jobSizeWidth)) || Number(v.jobSizeWidth) <= 0) errors.push('Width must be greater than zero.');
    if (v.jobType === 'book' && (!Number.isInteger(Number(v.pagesQty)) || Number(v.pagesQty) <= 0)) {
      errors.push('Pages per book must be a whole number greater than zero.');
    }
    if (!v.pagesMaterialId || !this.materials.some(m => Number(m.sid) === Number(v.pagesMaterialId))) {
      errors.push('Select a valid material.');
    } else if (Number(v.jobSizeHeight) > 0 && Number(v.jobSizeWidth) > 0) {
      const material = this.materials.find(m => Number(m.sid) === Number(v.pagesMaterialId));
      const unit = v.sizeUnit as SizeUnit;
      const marginIn = this.calc.toInches(Number(v.marginSize) || 0, unit);
      const jobHeightIn = this.calc.toInches(Number(v.jobSizeHeight), unit) + (marginIn * 2);
      const jobWidthIn = this.calc.toInches(Number(v.jobSizeWidth), unit) + (marginIn * 2);
      const sheetHeight = Number(material.height);
      const sheetWidth = Number(material.width);
      const fitsNormally = jobHeightIn <= sheetHeight && jobWidthIn <= sheetWidth;
      const fitsRotated = jobHeightIn <= sheetWidth && jobWidthIn <= sheetHeight;
      if (!fitsNormally && !fitsRotated) {
        errors.push(
          `Job size including margins (${jobWidthIn.toFixed(2)} × ${jobHeightIn.toFixed(2)} in) ` +
          `is larger than the selected material sheet (${sheetWidth.toFixed(2)} × ${sheetHeight.toFixed(2)} in).`
        );
      }
    }
    if (errors.length) {
      alert(`Please correct the following:\n\n${errors.join('\n')}`);
      return false;
    }
    return true;
  }

  viewQuotation(): void {
    if (!this.validateQuotationDetails()) return;
    const v = this.form.getRawValue();
    this.recalculateCuttingPreview();

    const isLeaflet     = v.jobType === 'leaflet';
    const pagesMaterial = this.materials.find(m => m.sid === Number(v.pagesMaterialId));
    const calculationInput = {
      materialSheetsNeeded: this.cuttingResult.sheetsNeeded,
      materialUnitPrice:    pagesMaterial ? Number(pagesMaterial.costPerUnit) : 0,
      printingSlabs:        this.printingSlabs,
      pagesFrontColor:      v.pagesFrontColor ?? 'none',
      pagesBackColor:       v.pagesBackColor  ?? 'none',
      coverFrontColor:      isLeaflet ? 'none' : (v.coverFrontColor ?? 'none'),
      coverBackColor:       isLeaflet ? 'none' : (v.coverBackColor  ?? 'none'),
      jobQty:               v.jobQty   || 0,
      jobType:              v.jobType  || 'leaflet',
      pagesQty:             v.pagesQty || 0,
      bindingTypes:         this.bindingTypes,
      bindingId:            isLeaflet ? null
        : (!v.binding  || v.binding  === 'none') ? null : Number(v.binding),
      laminationTypes:      this.laminationTypes,
      laminationId:         (!v.laminate || v.laminate === 'none') ? null : Number(v.laminate),
      laminationName:       this.selectedLaminationName,
      jobHeightIn:          this.calc.toInches(v.jobSizeHeight || 0, v.sizeUnit as SizeUnit),
      jobWidthIn:           this.calc.toInches(v.jobSizeWidth || 0, v.sizeUnit as SizeUnit),
      extraChargesPct:      v.extraChargesPct || 0,
      profitMarginPct:      v.profitMarginPct || 0
    };

    this.quotationService.calculateQuotation(calculationInput).subscribe({
      next: breakdown => {
        this.costBreakdown = breakdown;
        this.total = breakdown.total;
        this.isViewMode = true;
        setTimeout(() => { this.form.disable(); this.cdr.markForCheck(); }, 0);
      },
      error: err => {
        console.error('Quotation calculation failed:', err);
        alert(err.error?.message || 'Failed to calculate quotation. Please check that the backend is running.');
      }
    });
  }

  // ── SAVE ───────────────────────────────────────────────────
  saveQuotation(): void {
    if (this.isSaving) return;
    if (!this.validateQuotationDetails()) return;
    this.isSaving = true;

    const v         = this.form.getRawValue();
    const unit      = v.sizeUnit as SizeUnit;
    const isLeaflet = v.jobType === 'leaflet';

    const colorToInt = (val: string | null | undefined): number => {
      if (val === '4') return 4;
      if (val === '1') return 1;
      return 0;
    };

    const payload: QuotationPayload = {
      quotation: {
        id:            this.quotationId ?? undefined,
        job_name:      v.jobName ?? '',
        job_type:      v.jobType as 'leaflet' | 'book',
        base_cost:     this.costBreakdown?.base ?? 0,
        extra_charges: v.extraChargesPct || 0,
        profit_margin: v.profitMarginPct || 0,
        total_cost:    this.total,
        status:        'DRAFT'
      },
      item: {
        quotation_id:             this.quotationId ?? undefined,
        description:              v.jobName ?? '',
        quantity:                 v.jobQty  || 0,
        width:                    Math.round(this.calc.toInches(v.jobSizeWidth  ?? 0, unit) * 100) / 100,
        height:                   Math.round(this.calc.toInches(v.jobSizeHeight ?? 0, unit) * 100) / 100,
        pages:                    isLeaflet ? 0 : (v.pagesQty || 0),
        front_color_pages:        colorToInt(v.pagesFrontColor),
        back_color_pages:         colorToInt(v.pagesBackColor),
        cover_front_color_pages:  isLeaflet ? 0 : colorToInt(v.coverFrontColor),
        cover_back_color_pages:   isLeaflet ? 0 : colorToInt(v.coverBackColor),
        binding_id:               isLeaflet ? null
          : (!v.binding || v.binding === 'none') ? null : Number(v.binding),
        lamination_id:            (!v.laminate || v.laminate === 'none') ? null : Number(v.laminate),
        material_id:              v.pagesMaterialId ? Number(v.pagesMaterialId) : null,
        total_cost:               this.total
      } as any
    };

    const request$ = this.quotationId
      ? this.quotationService.saveQuotationDetails(this.quotationId, payload)
      : this.quotationService.createQuotationWithDetails({
          customer: this.draftCustomer,
          quotation: payload.quotation,
          item: payload.item
        });

    request$.subscribe({
      next:  (savedQuotation) => {
        const savedId = savedQuotation.id;
        if (!savedId || this.pendingArtworkFiles.length === 0) {
          if (!this.quotationId) this.quotationService.clearDraftQuotation();
          this.router.navigate(['/quotations']);
          return;
        }

        this.uploading.set(true);
        forkJoin(
          this.pendingArtworkFiles.map(file =>
            this.artworkService.upload(savedId, file)
          )
        ).subscribe({
          next: () => {
            this.pendingArtworkFiles = [];
            this.uploading.set(false);
            if (!this.quotationId) this.quotationService.clearDraftQuotation();
            this.router.navigate(['/quotations']);
          },
          error: () => {
            this.uploading.set(false);
            this.isSaving = false;
            alert('Quotation was saved, but artwork upload failed. You can reopen the quotation and upload the files again.');
            this.cdr.markForCheck();
          }
        });
      },
      error: (err) => {
        console.error('Save failed:', err);
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ── PDF DOWNLOAD ───────────────────────────────────────────
  downloadQuotation(): void {
    if (!this.isBrowser || !this.quotationId || this.downloadingPdf()) return;

    const quotationId = this.quotationId;
    this.downloadingPdf.set(true);
    this.quotationService.downloadPdf(quotationId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `quotation-${quotationId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        this.downloadingPdf.set(false);
      },
      error: (err) => {
        console.error('PDF download failed:', err);
        alert(err.status === 401
          ? 'Your session has expired. Please log in again.'
          : 'Failed to download quotation PDF.');
        this.downloadingPdf.set(false);
      }
    });
  }

  // ── BACK ───────────────────────────────────────────────────
  goBack(): void {
    if (this.isJobQuotationView) {
      this.router.navigate(['/jobs']);
      return;
    }
    if (this.isViewMode) {
      this.isViewMode = false;
      this.form.enable();
      this.cdr.markForCheck();
    } else {
      this.router.navigate(['/quotations']);
    }
  }

  private prepareJobQuotationView(): void {
    if (!this.isJobQuotationView || this.isLoading || !this.quotation || !this.materials.length) return;
    this.viewQuotation();
  }

  private loadArtwork(): void {
  if (!this.quotationId) return;
  this.artworkService.getForQuotation(this.quotationId).subscribe({
    next: (list) => { this.artworks.set(list); this.cdr.markForCheck(); }
  });
}

onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!this.quotationId) {
    this.pendingArtworkFiles = [file, ...this.pendingArtworkFiles];
    input.value = '';
    this.cdr.markForCheck();
    return;
  }

  this.uploading.set(true);
  this.artworkService.upload(this.quotationId, file).subscribe({
    next: (artwork) => {
      this.artworks.update(list => [artwork, ...list]);
      this.uploading.set(false);
      input.value = '';
      this.cdr.markForCheck();
    },
    error: () => {
      alert('Upload failed — only JPG, PNG, and PDF up to 10MB are allowed');
      this.uploading.set(false);
      this.cdr.markForCheck();
    }
  });
}

removePendingArtwork(index: number): void {
  this.pendingArtworkFiles = this.pendingArtworkFiles.filter((_, i) => i !== index);
  this.cdr.markForCheck();
}

deleteArtwork(a: Artwork): void {
  if (!confirm(`Delete "${a.file_name}"?`)) return;
  this.artworkService.delete(a.artwork_id).subscribe({
    next: () => {
      this.artworks.update(list => list.filter(x => x.artwork_id !== a.artwork_id));
      this.cdr.markForCheck();
    },
    error: () => alert('Failed to delete file')
  });
}

fileUrl(path: string): string {
  return `http://localhost:3000${path}`;
}
}
