import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class Settings {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  saving = signal(false);
  message = signal('');
  error = signal('');

  form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  save(): void {
    if (this.form.invalid) return;

    const { currentPassword, newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
      this.error.set('New passwords do not match');
      return;
    }

    this.saving.set(true);
    this.message.set('');
    this.error.set('');

    this.authService.changePassword({ currentPassword: currentPassword!, newPassword: newPassword! }).subscribe({
      next: () => { this.message.set('Password changed successfully'); this.saving.set(false); this.form.reset(); },
      error: (err) => { this.error.set(err.error?.message || 'Failed to change password'); this.saving.set(false); }
    });
  }
}