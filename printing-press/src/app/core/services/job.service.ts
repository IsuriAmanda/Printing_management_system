import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  JobTicket,
  JobStageLog,
  Machine,
  ConvertToJobRequest,
  UpdateJobPreStartRequest
} from '../models/job.models';

export interface MachineStatus {
  machine_id: number;
  machine_name: string;
  is_active: boolean | number;
  user_id: number | null;
  operator_name: string | null;
  active_job_id: number | null;
  active_job_number: string | null;
  active_job_name: string | null;
  active_job_status: string | null;
  active_job_priority: string | null;
  active_job_due_date: string | null;
  started_at: string | null;
  queue_count: number;
  next_job_id: number | null;
  next_job_number: string | null;
  next_job_name: string | null;
  next_job_priority: string | null;
  next_job_due_date: string | null;
}

export interface AssignedMachine {
  machine_id: number;
  machine_name: string;
}

@Injectable({ providedIn: 'root' })
export class JobService {

  private http    = inject(HttpClient);
  private apiUrl  = 'http://localhost:3000/api/jobs';

  // ── Signals ────────────────────────────────────────────────
  private jobsSignal    = signal<JobTicket[]>([]);
  private machinesSignal = signal<Machine[]>([]);

  jobs     = this.jobsSignal.asReadonly();
  machines = this.machinesSignal.asReadonly();

  // ── READ ───────────────────────────────────────────────────

  getAll(): Observable<JobTicket[]> {
    return this.http.get<JobTicket[]>(this.apiUrl).pipe(
      tap(data => this.jobsSignal.set(data))
    );
  }

  getJobById(id: number): Observable<JobTicket> {
    return this.http.get<JobTicket>(`${this.apiUrl}/${id}`);
  }

  getJobLogs(id: number): Observable<JobStageLog[]> {
    return this.http.get<JobStageLog[]>(`${this.apiUrl}/${id}/logs`);
  }

  getMachines(): Observable<Machine[]> {
    return this.http.get<Machine[]>(`${this.apiUrl}/machines`).pipe(
      tap(data => this.machinesSignal.set(data))
    );
  }
getMyDashboard(): Observable<{ assignedMachines: AssignedMachine[]; activeJob: JobTicket | null; queue: JobTicket[]; completedCount: number; delayedCount: number }> {
  return this.http.get<any>(`${this.apiUrl}/my/dashboard`);
}
  // ── CREATE ─────────────────────────────────────────────────

  // Convert confirmed quotation to job
  convertToJob(payload: ConvertToJobRequest): Observable<JobTicket> {
    return this.http.post<JobTicket>(`${this.apiUrl}/convert`, payload).pipe(
      tap(created =>
        this.jobsSignal.update(list => [created, ...list])
      )
    );
  }

  // ── UPDATE ─────────────────────────────────────────────────

  updateStatus(
    id: number,
    status: string,
    remarks?: string
  ): Observable<JobTicket> {
    return this.http.patch<JobTicket>(
      `${this.apiUrl}/${id}/status`,
      { status, remarks }
    ).pipe(
      tap(updated =>
        this.jobsSignal.update(list =>
          list.map(j => j.job_id === updated.job_id ? updated : j)
        )
      )
    );
  }

  assignMachine(id: number, machineId: number): Observable<JobTicket> {
    return this.http.patch<JobTicket>(
      `${this.apiUrl}/${id}/machine`,
      { machine_id: machineId }
    ).pipe(
      tap(updated =>
        this.jobsSignal.update(list =>
          list.map(j => j.job_id === updated.job_id ? updated : j)
        )
      )
    );
  }

  // ── DELETE ─────────────────────────────────────────────────

  updatePreStartDetails(id: number, payload: UpdateJobPreStartRequest): Observable<JobTicket> {
    return this.http.patch<JobTicket>(`${this.apiUrl}/${id}/pre-start-details`, payload).pipe(
      tap(updated =>
        this.jobsSignal.update(list =>
          list.map(j => j.job_id === updated.job_id ? updated : j)
        )
      )
    );
  }


startJob(id: number): Observable<{ success: boolean; message: string }> {
  return this.http.patch<{ success: boolean; message: string }>(`${this.apiUrl}/${id}/start`, {});
}

getOtherStageJobs(): Observable<JobTicket[]> {
  return this.http.get<JobTicket[]>(`${this.apiUrl}/other-stages`);
}

getMachineOperators(date?: string): Observable<any[]> {
  const q = date ? `?date=${date}` : '';
  return this.http.get<any[]>(`${this.apiUrl}/machines/operators${q}`);
}

getMachineStatuses(date?: string): Observable<MachineStatus[]> {
  const q = date ? `?date=${date}` : '';
  return this.http.get<MachineStatus[]>(`${this.apiUrl}/machines/statuses${q}`);
}

setMachineOperator(machineId: number, userId: number, date?: string): Observable<any> {
  return this.http.patch(`${this.apiUrl}/machines/${machineId}/operator`, { user_id: userId, date });
}

setMachineStatus(machineId: number, isActive: boolean): Observable<any> {
  return this.http.patch(`${this.apiUrl}/machines/${machineId}/status`, { is_active: isActive }).pipe(
    tap(() => {
      this.machinesSignal.update(list => (
        isActive ? list : list.filter(machine => machine.machine_id !== machineId)
      ));
    })
  );
}
}
