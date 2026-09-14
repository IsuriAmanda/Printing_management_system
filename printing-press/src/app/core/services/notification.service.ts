import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { Notification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/notifications';
  private readonly visibleLimit = 10;

  private notificationsSignal = signal<Notification[]>([]);
  readonly notifications = this.notificationsSignal.asReadonly();

  fetchAll() {
    return this.http.get<Notification[]>(this.apiUrl).pipe(
      tap(data => this.notificationsSignal.set(data.slice(0, this.visibleLimit)))
    );
  }

  markAsRead(id: number) {
    return this.http.patch(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => this.notificationsSignal.update(list =>
        list
          .map(n => n.notification_id === id ? { ...n, is_read: true } : n)
          .slice(0, this.visibleLimit)
      ))
    );
  }

  markAllAsRead() {
    return this.http.patch(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => this.notificationsSignal.update(list =>
        list.map(n => ({ ...n, is_read: true })).slice(0, this.visibleLimit)
      ))
    );
  }
}
