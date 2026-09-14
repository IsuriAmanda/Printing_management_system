import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Quotation, QuotationStatus,QuotationPayload,CreateQuotationRequest,QuotationItem  } from '../models/quotation.model';
import { Observable, tap } from 'rxjs';
import{JobService} from './job.service';
import { CostBreakdown } from './quotation-calc.service';

@Injectable({
  providedIn: 'root'
})
export class QuotationService {
 private http = inject(HttpClient);
 private apiUrl = 'http://localhost:3000/api/quotations';

  private quotationsSignal = signal<Quotation[]>([]);
  quotations = this.quotationsSignal.asReadonly();

  private draftQuotationSignal = signal<any>(null);
  draftQuotation = this.draftQuotationSignal.asReadonly();
  
  setDraftQuotation(data: any): void {
    this.draftQuotationSignal.set(data);
  }

  getDraftQuotation(): any {
    return this.draftQuotationSignal();
  }
  clearDraftQuotation(): void {
    this.draftQuotationSignal.set(null);
  }



 getAll(): Observable<Quotation[]> {
    return this.http.get<Quotation[]>(this.apiUrl).pipe(
      tap(data => this.quotationsSignal.set(data))  
    );
  }

  getQuotationById(id: number): Observable<Quotation>{
    return this.http.get<Quotation>(`${this.apiUrl}/${id}`);
  }

addQuotation(payload: CreateQuotationRequest): Observable<Quotation> {
    return this.http.post<Quotation>(this.apiUrl, payload).pipe(
      tap(created => {
        this.quotationsSignal.update(list => [...list, created]);
      })
    );
  }

  calculateQuotation(payload: any): Observable<CostBreakdown> {
    return this.http.post<CostBreakdown>(`${this.apiUrl}/calculate`, payload);
  }

  createQuotationWithDetails(payload: any): Observable<Quotation> {
    return this.http.post<Quotation>(`${this.apiUrl}/details`, payload).pipe(
      tap(created => {
        this.quotationsSignal.update(list => [...list, created]);
      })
    );
  }
  
    saveQuotationDetails(id: number, payload: QuotationPayload): Observable<Quotation> {
    return this.http.put<Quotation>(`${this.apiUrl}/${id}/details`, payload).pipe(
      tap(updated => {
        // Update the signal so list page reflects the saved data immediately
        this.quotationsSignal.update(list =>
          list.map(q => q.id === updated.id ? updated : q)
        );
      })
    );
  }


  changeStatus(id: number, status: QuotationStatus): Observable<Quotation> {
    return this.http.patch<Quotation>(
      `${this.apiUrl}/${id}/status`,
      { status }
    ).pipe(
      tap(updated => {
        this.quotationsSignal.update(list =>
          list.map(q => q.id === updated.id ? updated : q)
        );
      })
    );
  }


isValidStatusTransition(
  current: QuotationStatus,
  next: QuotationStatus
): boolean {
  const flow: Record<QuotationStatus, QuotationStatus[]> = {
    DRAFT: ['PENDING'],
    PENDING: ['CONFIRMED', 'CANCELLED'], 
    CONFIRMED: [],
    CANCELLED: []
  };

  return flow[current]?.includes(next) ?? false;
}

 deleteQuotation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() =>
        this.quotationsSignal.update(list => list.filter(q => q.id !== id))
      )
    );
  }
updateQuotation(id: number, changes: Partial<Quotation>): Observable<Quotation> {
  return this.http.put<Quotation>(`${this.apiUrl}/${id}`, changes).pipe(
    tap(updated =>
      this.quotationsSignal.update(list =>
        list.map(q => q.id === updated.id ? updated : q)
      )
    )
  );
}

sendQuotationEmail(
  id: number,
  customMessage?: string
): Observable<{ message: string }> {
  return this.http.post<{ message: string }>(
    `${this.apiUrl}/${id}/send-email`,
    { customMessage: customMessage || '' }
  );
}

downloadPdf(id: number): Observable<Blob> {
  return this.http.get(`${this.apiUrl}/${id}/pdf`, {
    responseType: 'blob'
  });
}
// Add this method inside your QuotationService class (frontend)
convertToJob(
  quotationId: number,
  dueDate: string
): Observable<any> {
  return this.http.post<any>(
    `http://localhost:3000/api/jobs/convert`,
   {
      quotation_id: quotationId,  // ← snake_case
      due_date:     dueDate       // ← snake_case
    }
  ).pipe(
    tap(() => {
      this.quotationsSignal.update(list =>
        list.map(q =>
          q.id === quotationId
            ? { ...q, status: 'CONFIRMED' as any }
            : q
        )
      );
    })
  );
}

}
