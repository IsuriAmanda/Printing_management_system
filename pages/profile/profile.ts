import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
})
export class Profile {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  saving = signal(false);
  message = signal('');
  error = signal('');

  user = this.authService.currentUser;

  form = this.fb.group({
    full_name: [this.user()?.full_name ?? '', Validators.required],
    email: [this.user()?.email ?? '', [Validators.required, Validators.email]],
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();

    this.saving.set(true);
    this.message.set('');
    this.error.set('');

    this.authService.updateProfile({
      full_name: values.full_name ?? '',
      email: values.email ?? ''
    }).subscribe({
      next: () => {
        this.message.set('Profile updated successfully');
        this.saving.set(false);
      },
      error: (err) => { this.error.set(err.error?.message || 'Failed to update profile'); this.saving.set(false); }
    });
  }
}
