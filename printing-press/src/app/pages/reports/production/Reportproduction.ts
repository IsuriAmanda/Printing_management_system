import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReportService } from '../../../core/services/report.service';

@Component({
  selector: 'app-report-production',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './Reportproduction.html',
  styleUrls: ['./Reportproduction.scss']
})
export class ReportProduction implements OnInit {
  private reportService = inject(ReportService);

  filters   = { from: '', to: '' };
  data      = signal<any>(null);
  isLoading = true;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading = true;
    this.reportService
      .getProductionReport(this.filters.from, this.filters.to)
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.isLoading = false;
        },
        error: () => { this.isLoading = false; }
      });
  }

  stagePercent(count: number): number {
    const total = this.data()?.summary?.total_jobs || 1;
    return Math.round((count / total) * 100);
  }

  machineCompletionPercent(machine: any): number {
    const total = Number(machine?.total_jobs || 0);
    if (!total) return 0;
    return Math.round((Number(machine?.completed_jobs || 0) / total) * 100);
  }

  getStatusClass(s: string): string { return s.toLowerCase(); }
  getPriorityClass(p: string): string { return p.toLowerCase(); }

  downloadExcel(): void {
    this.reportService
      .downloadProductionReport(this.filters.from, this.filters.to)
      .subscribe({
        next: blob => this.saveBlob(blob, `production-report-${Date.now()}.xlsx`),
        error: err => alert(err.status === 401
          ? 'Your session has expired. Please log in again.'
          : 'Failed to download production report.')
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
