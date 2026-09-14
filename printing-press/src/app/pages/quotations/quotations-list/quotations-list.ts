import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { QuotationService } from '../../../core/services/quotation.service';
import { Quotation, QuotationStatus } from '../../../core/models/quotation.model';

@Component({
  selector: 'app-quotations-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './quotations-list.html',
  styleUrls: ['./quotations-list.scss'],
})
export class QuotationsList implements OnInit {
  private readonly router            = inject(Router);
  private readonly quotationService  = inject(QuotationService);

  readonly quotations     = this.quotationService.quotations;
  readonly searchTerm     = signal<string>('');
  readonly selectedStatus = signal<string>('All Status');

  readonly statusOptions: QuotationStatus[] = [
    'DRAFT', 'PENDING', 'CONFIRMED', 'CANCELLED'
  ];

  // Email
  readonly sendingEmailId = signal<number | null>(null);
  readonly downloadingPdfId = signal<number | null>(null);

  // Convert modal
  readonly convertingId   = signal<number | null>(null);
  readonly showConvertForm = signal<boolean>(false);
  readonly convertDueDate  = signal<string>('');
  readonly todayDate = this.localDateString(new Date());

  private localDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  ngOnInit(): void {
    this.quotationService.getAll().subscribe({
      error: (err) => console.error('Failed to load quotations:', err)
    });
  }

  // ── Filtering ────────────────────────────────────────────
  readonly filtered = computed<Quotation[]>(() => {
    let list = this.quotations();

    const status = this.selectedStatus();
    if (status !== 'All Status') {
      list = list.filter(q => q.status === status);
    }

    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return list;

    return list.filter(q =>
      q.id?.toString().includes(term)          ||
      q.job_name?.toLowerCase().includes(term) ||
      q.customer_name?.toLowerCase().includes(term) ||
      q.status?.toLowerCase().includes(term)
    );
  });

  // ── Helpers ──────────────────────────────────────────────
  statusClass(status: string | undefined): string {
    return `status-${(status || 'DRAFT').toLowerCase()}`;
  }

  isConverted(q: Quotation): boolean {
    return !!q.associated_job_id;
  }

  // Lock editing once converted to job
  isEditable(q: Quotation): boolean {
    return !this.isConverted(q);
  }

  trackById(_: number, q: Quotation): number { return q.id ?? 0; }
  trackByStatus(_: number, s: string): string { return s; }

  // ── Navigation ───────────────────────────────────────────
  openCreateDialog(): void {
    this.router.navigate(['/quotations/quotation-create']);
  }

  // Edit navigates to full form (not inline)
  editQuotation(q: Quotation): void {
    if (!q.id) return;
    this.router.navigate([
      '/quotations/quotation-create/quotations-details', q.id
    ]);
  }

  // ── Delete ───────────────────────────────────────────────
  delete(id: number): void {
    if (!confirm(`Delete quotation ${id}? This cannot be undone.`)) return;

    this.quotationService.deleteQuotation(id).subscribe({
      error: (err) => {
        console.error('Delete failed:', err);
        alert('Failed to delete quotation.');
      }
    });
  }

  // ── Status Change ─────────────────────────────────────────
  onStatusChange(q: Quotation, newStatus: QuotationStatus): void {
    if (!q.id || !q.status) return;

    const current = q.status.toUpperCase() as QuotationStatus;

    if (!this.quotationService.isValidStatusTransition(current, newStatus)) {
      alert(`Cannot change from ${current} to ${newStatus}.`);
      this.quotationService.getAll().subscribe(); // reload to reset UI
      return;
    }

    this.quotationService.changeStatus(q.id, newStatus).subscribe({
      error: (err) => {
        console.error('Status change failed:', err);
        alert('Failed to update status.');
      }
    });
  }

  // ── Email ────────────────────────────────────────────────
  sendEmail(q: Quotation): void {
    if (!q.id) return;
    this.sendingEmailId.set(q.id);

    this.quotationService.sendQuotationEmail(q.id).subscribe({
      next: () => {
        alert(`Email sent for quotation ${q.id}`);
        this.sendingEmailId.set(null);
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to send email');
        this.sendingEmailId.set(null);
      }
    });
  }

  // ── Convert to Job ────────────────────────────────────────
  downloadPdf(q: Quotation): void {
    if (!q.id || this.downloadingPdfId() === q.id) return;

    this.downloadingPdfId.set(q.id);
    this.quotationService.downloadPdf(q.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `quotation-${q.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        this.downloadingPdfId.set(null);
      },
      error: (err) => {
        console.error('PDF download failed:', err);
        alert(err.status === 401
          ? 'Your session has expired. Please log in again.'
          : err.error?.message || 'Failed to download quotation PDF.');
        this.downloadingPdfId.set(null);
      }
    });
  }

  openConvertForm(q: Quotation): void {
    if (this.isConverted(q)) {
      alert('Already converted to a job.');
      return;
    }
    this.convertingId.set(q.id ?? null);
    this.convertDueDate.set('');
    this.showConvertForm.set(true);
  }

  closeConvertForm(): void {
    this.convertingId.set(null);
    this.showConvertForm.set(false);
  }

  confirmConvert(): void {
    const id       = this.convertingId();
    const dueDate  = this.convertDueDate();

    if (!id) return;
    if (!dueDate) { alert('Please select a due date.'); return; }
    if (dueDate < this.todayDate) {
      alert('Due date cannot be earlier than today.');
      return;
    }

    this.quotationService.convertToJob(id, dueDate).subscribe({
      next: (job: any) => {
        alert(`Job Ticket ${job.job_number || id} created successfully!`);
        this.closeConvertForm();
        this.quotationService.getAll().subscribe();
      },
      error: (err: any) => {
        alert(err.error?.message || 'Failed to convert to job.');
      }
    });
  }
}
