import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReportService } from '../../core/services/report.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss'],
})
export class Reports implements OnInit {
  private reportService = inject(ReportService);

  filters = { from: '', to: '' };
  stats   = signal<any>(null);
  isLoading = true;

  // Static report card navigation — these never change
  readonly reportCards = [
    {
      title: 'Quotation Report',
      route: '/reports/quotations',
      description: 'Track quotation count, confirmed vs cancelled, average value, and high-value requests.',
      metrics: ['Total quotations', 'Status split', 'Monthly value'],
    },
    {
      title: 'Production Report',
      route: '/reports/production',
      description: 'View jobs by stage, delayed jobs, machine workload, and completion progress.',
      metrics: ['Stage counts', 'Late jobs', 'Machine workload'],
    },

  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.reportService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  getStatusClass(status: string): string {
    return (status || '').toLowerCase().replace(' ', '-');
  }


  
}