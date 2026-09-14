import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AttendanceRow {
  user_id: number;
  full_name: string;
  is_present: number | boolean;
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/attendance';

  getForDate(date: string): Observable<AttendanceRow[]> {
    return this.http.get<AttendanceRow[]>(`${this.apiUrl}?date=${date}`);
  }

  setAttendance(userId: number, date: string, isPresent: boolean): Observable<any> {
    return this.http.patch(this.apiUrl, { user_id: userId, date, is_present: isPresent });
  }
}