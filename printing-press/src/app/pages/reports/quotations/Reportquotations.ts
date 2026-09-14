import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReportService } from '../../../core/services/report.service';

@Component({
  selector: 'app-report-quotations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './Reportquotations.html',
  styleUrls: ['./Reportquotations.scss']
})
export class ReportQuotations implements OnInit {
  private reportService = inject(ReportService);

  filters = { from: '', to: '' };
  data    = signal<any>(null);
  isLoading = true;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.reportService
      .getQuotationReport(this.filters.from, this.filters.to)
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.isLoading = false;
        },
        error: () => { this.isLoading = false; }
      });
  }

  getStatusClass(status: string): string {
    return status.toLowerCase();
  }

  totalPercent(count: number): number {
    const total = this.data()?.summary?.total || 1;
    return Math.round((count / total) * 100);
  }
  downloadExcel(): void {
    this.reportService
      .downloadQuotationReport(this.filters.from, this.filters.to)
      .subscribe({
        next: blob => this.saveBlob(blob, `quotation-report-${Date.now()}.xlsx`),
        error: err => alert(err.status === 401
          ? 'Your session has expired. Please log in again.'
          : 'Failed to download quotation report.')
      });
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}
