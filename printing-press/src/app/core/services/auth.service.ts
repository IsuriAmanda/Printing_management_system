import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthUser, LoginPayload, LoginResponse,UpdateProfilePayload, ChangePasswordPayload } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API_URL = 'http://localhost:3000/api/auth';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);

  currentUser = signal<AuthUser | null>(null);

  constructor() {
    this.loadStoredUser();
  }

  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, payload).pipe(
      tap((response) => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
        }
        this.currentUser.set(response.user);
      })
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.currentUser.set(null);
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  getUser(): AuthUser | null {
    return this.currentUser();
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp || payload.exp * 1000 <= Date.now()) {
        this.logout();
        return false;
      }
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  getUserRole(): string | null {
    return this.currentUser()?.role ?? null;
  }

  // Used by roleGuard below
  hasRole(...roles: string[]): boolean {
    const role = this.getUserRole();
    return !!role && roles.includes(role);
  }

  private loadStoredUser(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (!token || !storedUser) {
        this.currentUser.set(null);
        return;
      }
      try {
        this.currentUser.set(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUser.set(null);
      }
    }
  }
updateProfile(payload: UpdateProfilePayload): Observable<AuthUser> {
  return this.http.put<AuthUser>(`${this.API_URL}/me`, payload).pipe(
    tap((updatedUser) => {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      this.currentUser.set(updatedUser);
    })
  );
}

changePassword(payload: ChangePasswordPayload): Observable<{ message: string }> {
  return this.http.patch<{ message: string }>(`${this.API_URL}/me/password`, payload);
}

forgotPassword(email: string): Observable<{ message: string }> {
  return this.http.post<{ message: string }>(`${this.API_URL}/forgot-password`, { email });
}

}
