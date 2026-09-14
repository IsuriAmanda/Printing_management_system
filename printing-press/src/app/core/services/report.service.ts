import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

const API = 'http://localhost:3000/api/reports';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private http = inject(HttpClient);

  getDashboardStats(): Observable<any> {
    return this.http.get(`${API}/dashboard`);
  }

  getQuotationReport(from?: string, to?: string): Observable<any> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get(`${API}/quotations`, { params });
  }

  getProductionReport(from?: string, to?: string): Observable<any> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get(`${API}/production`, { params });
  }

  downloadQuotationReport(from?: string, to?: string): Observable<Blob> {
    return this.http.get(`${API}/quotations/export`, {
      params: this.dateParams(from, to),
      responseType: 'blob'
    });
  }

  downloadProductionReport(from?: string, to?: string): Observable<Blob> {
    return this.http.get(`${API}/production/export`, {
      params: this.dateParams(from, to),
      responseType: 'blob'
    });
  }

  private dateParams(from?: string, to?: string): HttpParams {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return params;
  }

}
