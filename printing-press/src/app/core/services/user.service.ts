import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { User, CreateUserRequest, UpdateUserRequest } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID); // <-- Added to detect browser vs server
  private apiUrl = 'http://localhost:3000/api/users';

  private usersSignal = signal<User[]>([]);
  users = this.usersSignal.asReadonly();

  getAll(): Observable<User[]> {
    // If running on the server, skip the API call and return an empty array
    if (!isPlatformBrowser(this.platformId)) {
      return of([]);
    }

    // If running in the browser, make the real API call
    return this.http.get<User[]>(this.apiUrl).pipe(
      tap(data => this.usersSignal.set(data))
    );
  }

  getById(id: number): Observable<User> {
    // Prevent SSR crashes when navigating directly to a user details page
    if (!isPlatformBrowser(this.platformId)) {
      return of({} as User);
    }

    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  create(data: CreateUserRequest): Observable<User> {
    return this.http.post<User>(this.apiUrl, data).pipe(
      tap(created => this.usersSignal.update(list => [created, ...list]))
    );
  }

  update(id: number, data: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, data).pipe(
      tap(updated => this.usersSignal.update(list =>
        list.map(u => (u.id === updated.id ? updated : u))
      ))
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.usersSignal.update(list => list.filter(u => u.id !== id)))
    );
  }

  resetPassword(id: number, newPassword: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/password`, { newPassword });
  }
}