import {
  ChangeDetectionStrategy,
  Component, OnInit, inject, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { JobService } from '../../../core/services/job.service';
import { JobTicket, JobStatus, UpdateJobPreStartRequest } from '../../../core/models/job.models';
import { ArtworkService } from '../../../core/services/artwork.service';
import { Artwork } from '../../../core/models/artwork.model';
import { SupplyService } from '../../../core/services/supply.service';

@Component({
  selector: 'app-jobs-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './jobs-list.html',
  styleUrls: ['./jobs-list.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobsList implements OnInit {
  private jobService = inject(JobService);
  private artworkService = inject(ArtworkService);
  private supplyService = inject(SupplyService);

  readonly jobs = this.jobService.jobs;
  readonly materials = this.supplyService.materials;
  readonly printingSlabs = this.supplyService.printing;
  readonly bindingTypes = this.supplyService.binding;
  readonly laminationTypes = this.supplyService.lamination;

  readonly searchTerm = signal('');
  readonly statusFilter = signal('All');
  readonly isLoading = signal(false);
  readonly editingJob = signal<JobTicket | null>(null);
  readonly isSavingEdit = signal(false);

  readonly statuses: JobStatus[] = [
    'PRINTING', 'CUTTING', 'FOLDING', 'BINDING', 'PACKING', 'COMPLETED'
  ];

  editForm: UpdateJobPreStartRequest = {};

  readonly filteredJobs = computed<JobTicket[]>(() => {
    let list = this.jobs();
    const status = this.statusFilter();
    if (status !== 'All') list = list.filter(j => j.status === status);

    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return list;

    return list.filter(j =>
      j.job_number?.toLowerCase().includes(term) ||
      j.job_name?.toLowerCase().includes(term) ||
      j.customer_name?.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.loadJobs();
    this.supplyService.getMaterials().subscribe();
    this.supplyService.getPrinting().subscribe();
    this.supplyService.getBinding().subscribe();
    this.supplyService.getLamination().subscribe();
  }

  loadJobs(): void {
    this.isLoading.set(true);
    this.jobService.getAll().subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false)
    });
  }

  openEdit(job: JobTicket): void {
    if (!this.canEditPreStart(job)) {
      alert('This job can only be edited while it is in PRINTING and before the operator starts it.');
      return;
    }

    this.editingJob.set(job);
    this.editForm = {
      quantity: job.quantity ?? null,
      material_id: job.material_id ?? null,
      binding_id: this.isBook(job) ? job.binding_id ?? null : null,
      lamination_id: job.lamination_id ?? null,
      front_color_pages: job.front_color_pages ?? null,
      back_color_pages: job.back_color_pages ?? null,
      cover_front_color_pages: this.isBook(job) ? job.cover_front_color_pages ?? null : 0,
      cover_back_color_pages: this.isBook(job) ? job.cover_back_color_pages ?? null : 0
    };
  }

  closeEdit(): void {
    this.editingJob.set(null);
    this.isSavingEdit.set(false);
    this.editForm = {};
  }

  savePreStartEdit(): void {
    const job = this.editingJob();
    if (!job?.job_id || this.isSavingEdit()) return;

    const payload: UpdateJobPreStartRequest = {
      ...this.editForm,
      binding_id: this.isBook(job) ? this.editForm.binding_id ?? null : null,
      cover_front_color_pages: this.isBook(job) ? this.editForm.cover_front_color_pages ?? 0 : 0,
      cover_back_color_pages: this.isBook(job) ? this.editForm.cover_back_color_pages ?? 0 : 0
    };

    this.isSavingEdit.set(true);

    this.jobService.updatePreStartDetails(job.job_id, payload).subscribe({
      next: () => {
        this.closeEdit();
        this.loadJobs();
      },
      error: (err) => {
        this.isSavingEdit.set(false);
        alert(err.error?.message || 'Failed to update job details');
      }
    });
  }

  canEditPreStart(job: JobTicket): boolean {
    return job.status === 'PRINTING' &&
      (job.can_edit_pre_start === true || job.can_edit_pre_start === 1);
  }

  printingState(job: JobTicket): string {
    if (job.status !== 'PRINTING') return 'Ended';
    return job.is_printing_started === true || job.is_printing_started === 1
      ? 'Printing started'
      : 'Not started';
  }

  priorityClass(priority: string): string {
    const map: Record<string, string> = {
      LOW: 'priority-low',
      MEDIUM: 'priority-medium',
      URGENT: 'priority-high'
    };
    return map[priority] ?? '';
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      PRINTING: 'status-printing',
      CUTTING: 'status-cutting',
      FOLDING: 'status-folding',
      BINDING: 'status-binding',
      PACKING: 'status-packing',
      COMPLETED: 'status-completed'
    };
    return map[status] ?? '';
  }

  trackByJobId(_index: number, job: JobTicket): number | string {
    return job.job_id ?? job.job_number ?? _index;
  }

  trackByArtworkId(_index: number, artwork: Artwork): number | string {
    return artwork.artwork_id ?? artwork.file_path ?? _index;
  }

  trackByValue(_index: number, value: string): string {
    return value;
  }

  trackBySupplyId(_index: number, item: any): number | string {
    return item.sid ?? item.material_id ?? item.binding_id ?? item.lamination_id ?? _index;
  }

  isBook(job: JobTicket | null = this.editingJob()): boolean {
    return (job?.job_type || '').toLowerCase() === 'book';
  }

  readonly colorOptions = computed(() => {
    const options = [{ label: 'None', value: 0 }];
    const hasOneColor = this.printingSlabs().some(s => (s.name || '').toLowerCase() === '1color');
    const hasFourColor = this.printingSlabs().some(s => (s.name || '').toLowerCase() === '4color');

    if (hasOneColor) options.push({ label: '1 Color', value: 1 });
    if (hasFourColor) options.push({ label: '4 Color', value: 4 });
    return options;
  });

  uniqueLaminationNames(): string[] {
    const names = this.laminationTypes().map((l: any) => l.name as string).filter(Boolean);
    return [...new Set(names)];
  }

  selectedLaminationName(): string {
    if (!this.editForm.lamination_id) return 'none';
    const match = this.laminationTypes().find((l: any) => l.sid === Number(this.editForm.lamination_id));
    return match?.name || 'none';
  }

  selectedLaminationInfo(): string {
    if (!this.editForm.lamination_id) return '';
    const match = this.laminationTypes().find((l: any) => l.sid === Number(this.editForm.lamination_id));
    if (!match) return '';
    return `${match.size} - LKR ${Number(match.price).toFixed(2)}/unit`;
  }

  onLaminationNameChange(name: string): void {
    this.editForm.lamination_id = name === 'none'
      ? null
      : this.getBestLaminationId(name);
  }

  private getBestLaminationId(name: string): number | null {
    const job = this.editingJob();
    if (!job || !name) return null;

    const matches = this.laminationTypes().filter((l: any) => l.name === name);
    if (!matches.length) return null;

    const jobHIn = Number(job.height || 0);
    const jobWIn = Number(job.width || 0);
    const jobLong = Math.max(jobHIn, jobWIn);
    const jobShort = Math.min(jobHIn, jobWIn);
    const jobArea = jobLong * jobShort;

    let best = matches[0];
    let bestScore = Infinity;

    for (const lamination of matches) {
      const lamLong = Math.max(Number(lamination.height), Number(lamination.width));
      const lamShort = Math.min(Number(lamination.height), Number(lamination.width));
      const lamArea = lamLong * lamShort;
      const fits = lamLong >= jobLong && lamShort >= jobShort;
      const waste = lamArea - jobArea;
      const score = fits ? waste : Math.abs(waste) + 1_000_000;

      if (score < bestScore) {
        bestScore = score;
        best = lamination;
      }
    }

    return best.sid;
  }

  viewingArtworkJob = signal<JobTicket | null>(null);
  viewingArtworkList = signal<Artwork[]>([]);

  openArtwork(job: JobTicket): void {
    this.viewingArtworkJob.set(job);
    this.viewingArtworkList.set([]);
    this.artworkService.getForJob(job.job_id!).subscribe(list => this.viewingArtworkList.set(list));
  }

  closeArtwork(): void {
    this.viewingArtworkJob.set(null);
    this.viewingArtworkList.set([]);
  }

  fileUrl(path: string): string {
    return `http://localhost:3000${path}`;
  }
}
