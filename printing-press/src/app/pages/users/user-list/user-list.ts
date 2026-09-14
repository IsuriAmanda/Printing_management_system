import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';
import { AttendanceService } from '../../../core/services/attendance.service';


@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-list.html',
  styleUrls: ['./user-list.scss']
})
export class UserList implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private attendanceService = inject(AttendanceService);
  private platformId = inject(PLATFORM_ID);

  users = this.userService.users;
  loading = signal(true);
  error = signal('');
  attendanceMap = signal<Record<number, boolean>>({});
  today = new Date().toISOString().split('T')[0];


  ngOnInit(): void {
    this.userService.getAll().subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        console.error(err);
        this.error.set('Failed to load users');
        this.loading.set(false);
      }
    });
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.attendanceService.getForDate(this.today).subscribe({
      next: (rows) => {
        const map: Record<number, boolean> = {};
        rows.forEach(r => map[r.user_id] = !!r.is_present);
        this.attendanceMap.set(map);
      },
      error: (err) => {
        console.error(err);
        this.error.set(err.error?.message || 'Failed to load attendance');
      }
    });
  }

  isPresent(user: User): boolean {
    return this.attendanceMap()[user.id] ?? true;
  }

  toggleAttendance(user: User): void {
    const newStatus = !this.isPresent(user);
    this.attendanceService.setAttendance(user.id, this.today, newStatus).subscribe({
      next: () => this.attendanceMap.update(m => ({ ...m, [user.id]: newStatus })),
      error: (err) => alert(err.error?.message || 'Failed to update attendance')
    });
  }


  currentUserId(): number | undefined {
    return this.authService.getUser()?.id;
  }

  deleteUser(user: User): void {
    if (user.id === this.currentUserId()) {
      alert("You can't delete your own account");
      return;
    }
    if (!confirm(`Delete user ${user.full_name}?`)) return;

    this.userService.delete(user.id).subscribe({
      error: (err) => alert(err.error?.message || 'Failed to delete user')
    });
  }
}
