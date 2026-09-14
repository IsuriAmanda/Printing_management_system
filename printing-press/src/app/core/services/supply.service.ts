import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

const API = 'http://localhost:3000/api/supplies';

@Injectable({ providedIn: 'root' })
export class SupplyService {
  private http = inject(HttpClient);

  // ── Signals ────────────────────────────────────────────────
  private materialsSignal   = signal<any[]>([]);
  private printingSignal    = signal<any[]>([]);
  private bindingSignal     = signal<any[]>([]);
  private laminationSignal  = signal<any[]>([]);

  materials  = this.materialsSignal.asReadonly();
  printing   = this.printingSignal.asReadonly();
  binding    = this.bindingSignal.asReadonly();
  lamination = this.laminationSignal.asReadonly();

  // ── Materials ──────────────────────────────────────────────
  getMaterials(): Observable<any[]> {
    return this.http.get<any[]>(`${API}/materials`).pipe(
      tap(d => this.materialsSignal.set(d))
    );
  }
  addMaterial(data: any): Observable<any> {
    return this.http.post<any>(`${API}/materials`, data).pipe(
      tap(created => this.materialsSignal.update(l => [...l, created]))
    );
  }
  updateMaterial(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${API}/materials/${id}`, data).pipe(
      tap(updated => this.materialsSignal.update(l =>
        l.map(i => i.sid === updated.sid ? updated : i)))
    );
  }
  deleteMaterial(id: number): Observable<any> {
    return this.http.delete<any>(`${API}/materials/${id}`).pipe(
      tap(() => this.materialsSignal.update(l => l.filter(i => i.sid !== id)))
    );
  }

  // ── Printing ───────────────────────────────────────────────
  getPrinting(): Observable<any[]> {
    return this.http.get<any[]>(`${API}/printing`).pipe(
      tap(d => this.printingSignal.set(d))
    );
  }
  addPrinting(data: any): Observable<any> {
    return this.http.post<any>(`${API}/printing`, data).pipe(
      tap(created => this.printingSignal.update(l => [...l, created]))
    );
  }
  updatePrinting(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${API}/printing/${id}`, data).pipe(
      tap(updated => this.printingSignal.update(l =>
        l.map(i => i.sid === updated.sid ? updated : i)))
    );
  }
  deletePrinting(id: number): Observable<any> {
    return this.http.delete<any>(`${API}/printing/${id}`).pipe(
      tap(() => this.printingSignal.update(l => l.filter(i => i.sid !== id)))
    );
  }

  // ── Binding ────────────────────────────────────────────────
  getBinding(): Observable<any[]> {
    return this.http.get<any[]>(`${API}/binding`).pipe(
      tap(d => this.bindingSignal.set(d))
    );
  }
  addBinding(data: any): Observable<any> {
    return this.http.post<any>(`${API}/binding`, data).pipe(
      tap(created => this.bindingSignal.update(l => [...l, created]))
    );
  }
  updateBinding(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${API}/binding/${id}`, data).pipe(
      tap(updated => this.bindingSignal.update(l =>
        l.map(i => i.sid === updated.sid ? updated : i)))
    );
  }
  deleteBinding(id: number): Observable<any> {
    return this.http.delete<any>(`${API}/binding/${id}`).pipe(
      tap(() => this.bindingSignal.update(l => l.filter(i => i.sid !== id)))
    );
  }

  // ── Lamination ─────────────────────────────────────────────
  getLamination(): Observable<any[]> {
    return this.http.get<any[]>(`${API}/lamination`).pipe(
      tap(d => this.laminationSignal.set(d))
    );
  }
  addLamination(data: any): Observable<any> {
    return this.http.post<any>(`${API}/lamination`, data).pipe(
      tap(created => this.laminationSignal.update(l => [...l, created]))
    );
  }
  updateLamination(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${API}/lamination/${id}`, data).pipe(
      tap(updated => this.laminationSignal.update(l =>
        l.map(i => i.sid === updated.sid ? updated : i)))
    );
  }
  deleteLamination(id: number): Observable<any> {
    return this.http.delete<any>(`${API}/lamination/${id}`).pipe(
      tap(() => this.laminationSignal.update(l => l.filter(i => i.sid !== id)))
    );
  }

// ── Standards ──────────────────────────────────────────────
private standardsSignal = signal<any[]>([]);
standards = this.standardsSignal.asReadonly();

getStandards(): Observable<any[]> {
  return this.http.get<any[]>(`${API}/standards`).pipe(
    tap(d => this.standardsSignal.set(d))
  );
}

addStandard(data: any): Observable<any> {
  return this.http.post<any>(`${API}/standards`, data).pipe(
    tap(created => this.standardsSignal.update(l => [...l, created]))
  );
}

updateStandard(id: number, data: any): Observable<any> {
  return this.http.put<any>(`${API}/standards/${id}`, data).pipe(
    tap(updated => this.standardsSignal.update(l =>
      l.map(i => i.size_id === updated.size_id ? updated : i)))
  );
}

deleteStandard(id: number): Observable<any> {
  return this.http.delete<any>(`${API}/standards/${id}`).pipe(
    tap(() => this.standardsSignal.update(l => l.filter(i => i.size_id !== id)))
  );
}

}
