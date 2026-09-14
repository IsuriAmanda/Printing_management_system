import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { JobService } from '../../../core/services/job.service';
import { AttendanceService } from '../../../core/services/attendance.service';

interface MachineOperatorRow {
  machine_id: number;
  machine_name: string;
  is_active: boolean | number;
  user_id: number | null;
  operator_name: string | null;
}

const todayDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

@Component({
  selector: 'app-machine-operators',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './machine-operators.html',
  styleUrls: ['./machine-operators.scss']
})
export class MachineOperators implements OnInit {
  private jobService = inject(JobService);
  private attendanceService = inject(AttendanceService);

  rows = signal<MachineOperatorRow[]>([]);
  operators = signal<{ id: number; full_name: string }[]>([]);
  loading = signal(true);
  error = signal('');
  saving = signal<number | null>(null);
  today = todayDate();
  selectedDate = signal(this.today);

  ngOnInit(): void {
    this.loadAssignments();
  }

loadAssignments(): void {
  this.loadAttendance();
  this.jobService.getMachineOperators(this.selectedDate()).subscribe({
    next: (data: any) => { this.rows.set(data); this.loading.set(false); },
    error: () => { this.error.set('Failed to load assignments'); this.loading.set(false); }
  });
}

loadAttendance(): void {
  this.attendanceService.getForDate(this.selectedDate()).subscribe({
    next: (rows) => this.operators.set(
      rows
        .filter(row => !!row.is_present)
        .map(row => ({ id: row.user_id, full_name: row.full_name }))
    ),
    error: () => this.error.set('Failed to load operator attendance')
  });
}

onDateChange(date: string): void {
  this.selectedDate.set(date);
  this.loading.set(true);
  this.loadAssignments();
}

assign(row: MachineOperatorRow, userId: string): void {
  if (!userId || !this.isActive(row)) return;
  this.saving.set(row.machine_id);
  this.jobService.setMachineOperator(row.machine_id, Number(userId), this.selectedDate()).subscribe({
    next: () => { this.saving.set(null); this.loadAssignments(); },
    error: (err) => { this.saving.set(null); alert(err.error?.message || 'Failed to assign operator'); }
  });
}

toggleMachineStatus(row: MachineOperatorRow, value: string): void {
  const isActive = value === '1';
  this.saving.set(row.machine_id);
  this.jobService.setMachineStatus(row.machine_id, isActive).subscribe({
    next: () => { this.saving.set(null); this.loadAssignments(); },
    error: (err) => {
      this.saving.set(null);
      alert(err.error?.message || 'Failed to update machine status');
      this.loadAssignments();
    }
  });
}

isActive(row: MachineOperatorRow): boolean {
  return row.is_active === true || row.is_active === 1;
}
}
