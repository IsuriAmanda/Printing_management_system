import { Injectable, computed, inject } from '@angular/core';
import { QuotationService } from './quotation.service';
import { JobService } from './job.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private quotationService = inject(QuotationService);
  private jobService       = inject(JobService);

  readonly quotations = this.quotationService.quotations;
  readonly jobs       = this.jobService.jobs;

  // ── Quotation Metrics ─────────────────────────────────────

  readonly totalQuotations = computed(() =>
    this.quotations().length
  );

  readonly confirmedQuotations = computed(() =>
    this.quotations().filter(q => q.status === 'CONFIRMED').length
  );

  readonly cancelledQuotations = computed(() =>
    this.quotations().filter(q => q.status === 'CANCELLED').length
  );

  readonly totalQuotationValue = computed(() =>
    this.quotations().reduce((sum, q) => sum + (q.total_cost ?? 0), 0)
  );

  readonly averageQuotationValue = computed(() => {
    const count = this.totalQuotations();
    return count ? this.totalQuotationValue() / count : 0;
  });

  // ── Job Metrics ───────────────────────────────────────────
  // Status values match DB enum: PRINTING, CUTTING, FOLDING,
  // BINDING, PACKING, COMPLETED — all uppercase

  readonly completedJobs = computed(() =>
    this.jobs().filter(j => j.status === 'COMPLETED').length
  );

  readonly pendingJobs = computed(() =>
    this.jobs().filter(j => j.status !== 'COMPLETED').length
  );

  readonly printingJobs = computed(() =>
    this.jobs().filter(j => j.status === 'PRINTING').length
  );

  readonly bindingJobs = computed(() =>
    this.jobs().filter(j => j.status === 'BINDING').length
  );

  readonly packingJobs = computed(() =>
    this.jobs().filter(j => j.status === 'PACKING').length
  );

  // ── Delayed Jobs ──────────────────────────────────────────
  // A job is delayed if due_date has passed and it is not COMPLETED

  readonly delayedJobs = computed(() => {
    const now = new Date();
    return this.jobs().filter(job => {
      const dueDate = job.due_date
        ? new Date(job.due_date as string)
        : null;
      return dueDate !== null
        && dueDate < now
        && job.status !== 'COMPLETED';
    }).length;
  });
}