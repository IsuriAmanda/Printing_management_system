import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-edit-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './edit-user.html',
  styleUrls: ['./edit-user.scss'],
})
export class EditUser implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);
  private authService = inject(AuthService);

  userId!: number;
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  isSelf = signal(false);

  roles = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Manager' },
    { id: 3, name: 'Operator' },
  ];

  form = this.fb.group({
    full_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role_id: [3, Validators.required],
    is_active: [true],
  });

  ngOnInit(): void {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));
    this.isSelf.set(this.authService.getUser()?.id === this.userId);

    this.userService.getById(this.userId).subscribe({
      next: (u) => {
        this.form.patchValue({
          full_name: u.full_name, email: u.email,
          role_id: u.role_id, is_active: u.is_active,
        });
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load user'); this.loading.set(false); }
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.userService.update(this.userId, this.form.getRawValue() as any).subscribe({
      next: () => this.router.navigate(['/users/view', this.userId]),
      error: (err) => { alert(err.error?.message || 'Failed to update user'); this.saving.set(false); }
    });
  }

  deactivate(): void {
    if (this.isSelf()) { alert("You can't deactivate your own account"); return; }
    if (!confirm('Deactivate this user?')) return;
    this.userService.update(this.userId, { is_active: false }).subscribe({
      next: () => this.router.navigate(['/users']),
      error: (err) => alert(err.error?.message || 'Failed to deactivate user')
    });
  }
}