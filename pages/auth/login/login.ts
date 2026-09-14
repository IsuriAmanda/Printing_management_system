import { Component, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import {FormBuilder,  ReactiveFormsModule,  Validators} from '@angular/forms';

import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';



@Component({

  selector: 'app-login',

  standalone: true,

  imports: [

    CommonModule,
    ReactiveFormsModule

  ],

  templateUrl: './login.html',

  styleUrls: ['./login.scss']

})

export class Login {

  

  private readonly fb = inject(FormBuilder);

  private readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);

  constructor() {
    if (this.route.snapshot.queryParamMap.get('reason') === 'session-expired') {
      this.errorMessage.set('Your session is invalid or has expired. Please log in again.');
    }
  }



  loading = signal(false);

  errorMessage =signal('');

  successMessage =
    signal('');

  form = this.fb.group({
    role: [

      '',

      Validators.required

    ],

    email: [

      '',

      [

        Validators.required,
        Validators.email

      ]

    ],

    password: [

      '',

      Validators.required

    ]

  });



  login(): void {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.successMessage.set('');

      const email = this.form.controls.email;
      const role = this.form.controls.role;
      const password = this.form.controls.password;

      if (email.hasError('required')) {
        this.errorMessage.set('Username or email is required');
      } else if (email.hasError('email')) {
        this.errorMessage.set('Enter a valid email address');
      } else if (role.hasError('required')) {
        this.errorMessage.set('User role is required');
      } else if (password.hasError('required')) {
        this.errorMessage.set('Password is required');
      } else {
        this.errorMessage.set('Please complete all required fields');
      }
      return;
    }



    this.loading.set(true);

    this.errorMessage.set('');
    this.successMessage.set('');

    const credentials = this.form.getRawValue() as any;

    this.authService.login({
      email: credentials.email,
      password: credentials.password
    }).subscribe({

      next: (response) => {

        if (response.user.role !== credentials.role) {
          this.authService.logout();
          this.errorMessage.set(`This account is registered as ${response.user.role}. Please select the correct user type.`);
          this.loading.set(false);
          return;
        }


        this.router.navigate(['/']);

      },

      error: (err) => {

        console.error(err);

        this.errorMessage.set(

          err.error?.message
          || 'Login failed'

        );

        this.loading.set(false);

      },

      complete: () => {

        this.loading.set(false);

      }

    });

  }

  forgotPassword(): void {
    const email = this.form.controls.email.value?.trim();

    if (!email) {
      this.errorMessage.set('Enter your email address first');
      return;
    }

    if (this.form.controls.email.invalid) {
      this.form.controls.email.markAsTouched();
      this.errorMessage.set('Enter a valid email address');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.forgotPassword(email).subscribe({
      next: (res) => {
        this.successMessage.set(res.message);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to send password reset email');
        this.loading.set(false);
      }
    });
  }

}
