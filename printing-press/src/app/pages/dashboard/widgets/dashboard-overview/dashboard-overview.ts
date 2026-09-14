import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { ReportService } from '../../../../core/services/report.service';
import { QuotationService } from '../../../../core/services/quotation.service';
import { JobService, MachineStatus } from '../../../../core/services/job.service';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, BaseChartDirective],
  templateUrl: './dashboard-overview.html',
  styleUrls: ['./dashboard-overview.scss']
})
export class DashboardOverview implements OnInit {
  private reportService    = inject(ReportService);
  private quotationService = inject(QuotationService);
  private jobService       = inject(JobService);

  stats = signal<any>(null);
  machineStatuses = signal<MachineStatus[]>([]);
  isLoading = true;

  readonly doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '66%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          padding: 14
        }
      }
    }
  };

  readonly barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#667268' }
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: '#667268'
        },
        grid: { color: '#edf1ea' }
      }
    }
  };

  ngOnInit(): void {
    // Load signals for other components
    this.quotationService.getAll().subscribe();
    this.jobService.getAll().subscribe();
    this.jobService.getMachineStatuses().subscribe({
      next: (data) => this.machineStatuses.set(data),
      error: () => this.machineStatuses.set([])
    });

    // Load real DB stats
    this.reportService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  quotationStatusData(): ChartData<'doughnut'> {
    const quotations = this.stats()?.quotations ?? {};
    return {
      labels: ['Confirmed', 'Pending', 'Draft', 'Cancelled'],
      datasets: [{
        data: [
          Number(quotations.confirmed || 0),
          Number(quotations.pending || 0),
          Number(quotations.draft || 0),
          Number(quotations.cancelled || 0)
        ],
        backgroundColor: ['#c1ccc3', '#f4ead8', '#d8ded6', '#efdada'],
        borderColor: '#ffffff',
        borderWidth: 3
      }]
    };
  }

  productionStageData(): ChartData<'bar'> {
    const jobs = this.stats()?.jobs ?? {};
    return {
      labels: ['Printing', 'Cutting', 'Folding', 'Binding', 'Packing'],
      datasets: [{
        data: [
          Number(jobs.printing || 0),
          Number(jobs.cutting || 0),
          Number(jobs.folding || 0),
          Number(jobs.binding || 0),
          Number(jobs.packing || 0)
        ],
        backgroundColor: ['#dbe7ec', '#e7e1ee', '#ddebed', '#f4ead8', '#e4f0e8'],
        borderRadius: 5,
        maxBarThickness: 42
      }]
    };
  }

  jobHealthData(): ChartData<'doughnut'> {
    const jobs = this.stats()?.jobs ?? {};
    const completed = Number(jobs.completed || 0);
    const delayed = Number(jobs.delayed || 0);
    const inProgress = Math.max(Number(jobs.in_progress || 0) - delayed, 0);

    return {
      labels: ['Completed', 'In Progress', 'Delayed'],
      datasets: [{
        data: [completed, inProgress, delayed],
        backgroundColor: ['#e4f0e8', '#dbe7ec', '#efdada'],
        borderColor: '#ffffff',
        borderWidth: 3
      }]
    };
  }

  machineLoadPercent(machine: MachineStatus): number {
    const maxVisibleQueue = 5;
    const queued = Number(machine.queue_count || 0);
    if (!machine.is_active) return 0;
    return Math.min(((machine.active_job_id ? 1 : 0) + queued) / maxVisibleQueue * 100, 100);
  }
}
