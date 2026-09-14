import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AssignedMachine, JobService } from '../../../../core/services/job.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { JobTicket } from '../../../../core/models/job.models';
import { ArtworkService } from '../../../../core/services/artwork.service';
import { Artwork } from '../../../../core/models/artwork.model';

@Component({
  selector: 'app-operator-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './operator-dashboard.html',
  styleUrls: ['./operator-dashboard.scss']
})
export class OperatorDashboard implements OnInit {
  private jobService = inject(JobService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private artworkService = inject(ArtworkService);
  private platformId = inject(PLATFORM_ID);

  readonly currentUser = this.authService.getUser();
  readonly notifications = this.notificationService.notifications;

  activeJob = signal<JobTicket | null>(null);
  assignedMachines = signal<AssignedMachine[]>([]);
  queue = signal<JobTicket[]>([]);
  completedCount = signal(0);
  delayedCount = signal(0);
  loading = signal(true);
  starting = signal(false);
  otherStageJobs = signal<JobTicket[]>([]);
  viewingArtworkJob = signal<JobTicket | null>(null);
  viewingArtworkList = signal<Artwork[]>([]);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.load();
    this.notificationService.fetchAll().subscribe();
  }

load(): void {
  this.loading.set(true);
  this.jobService.getMyDashboard().subscribe({
    next: (data) => {
      this.assignedMachines.set(data.assignedMachines || []);
      this.activeJob.set(data.activeJob);
      this.queue.set(data.queue);
      this.completedCount.set(data.completedCount);
      this.delayedCount.set(data.delayedCount);
      this.loading.set(false);
    },
    error: () => this.loading.set(false)
  });
  this.jobService.getOtherStageJobs().subscribe(list => this.otherStageJobs.set(list));
}
advanceStage(job: JobTicket): void {
  const flow: Record<string, string> = { PRINTING: 'CUTTING', CUTTING: 'FOLDING', FOLDING: 'BINDING', BINDING: 'PACKING', PACKING: 'COMPLETED' };
  const next = flow[job.status!];
  if (!next) return;
  this.jobService.updateStatus(job.job_id!, next as any).subscribe({
    next: () => this.load(),
    error: (err) => alert(err.error?.message || 'Failed to update status')
  });
}
  startNext(job: JobTicket): void {
    this.starting.set(true);
    this.jobService.startJob(job.job_id!).subscribe({
      next: (res) => { alert(res.message); this.starting.set(false); this.load(); },
      error: (err) => { alert(err.error?.message || 'Failed to start job'); this.starting.set(false); }
    });
  }

  isOverdue(job: JobTicket): boolean {
    if (!job.due_date || job.status === 'COMPLETED') return false;
    return new Date(job.due_date) < new Date();
  }

  nextStageLabel(job: JobTicket): string {
    const flow: Record<string, string> = { PRINTING: 'End Printing', CUTTING: 'Move to Folding', FOLDING: 'Move to Binding', BINDING: 'Move to Packing', PACKING: 'Complete Job' };
    return flow[job.status || ''] || 'Advance';
  }

  openArtwork(job: JobTicket): void {
    if (!job.job_id) return;
    this.viewingArtworkJob.set(job);
    this.viewingArtworkList.set(job.artwork || []);
    if (job.artwork?.length) return;

    this.artworkService.getForJob(job.job_id).subscribe({
      next: (list) => this.viewingArtworkList.set(list),
      error: () => this.viewingArtworkList.set([])
    });
  }

  closeArtwork(): void {
    this.viewingArtworkJob.set(null);
    this.viewingArtworkList.set([]);
  }

  fileUrl(path: string): string {
    return `http://localhost:3000${path}`;
  }

  downloadUrl(path: string): string {
    const filename = path.split('/').pop() || '';
    return `http://localhost:3000/uploads/artwork/${encodeURIComponent(filename)}/download`;
  }

  colorLabel(value: number | null | undefined): string {
    if (Number(value) === 4) return '4 Color';
    if (Number(value) === 1) return '1 Color';
    return 'None';
  }

  displayNumber(value: number | string | null | undefined): string {
    return Number(value || 0).toFixed(2);
  }

  toCm(value: number | string | null | undefined): string {
    return (Number(value || 0) * 2.54).toFixed(2);
  }

  toMm(value: number | string | null | undefined): string {
    return (Number(value || 0) * 25.4).toFixed(2);
  }

  artworkCount(job: JobTicket): number {
    return job.artwork?.length || 0;
  }
}
