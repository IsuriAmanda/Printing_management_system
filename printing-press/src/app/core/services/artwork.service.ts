import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Artwork } from '../models/artwork.model';

@Injectable({ providedIn: 'root' })
export class ArtworkService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/artwork';

  getForQuotation(quotationId: number): Observable<Artwork[]> {
    return this.http.get<Artwork[]>(`${this.apiUrl}/quotation/${quotationId}`);
  }

  getForJob(jobId: number): Observable<Artwork[]> {
    return this.http.get<Artwork[]>(`${this.apiUrl}/job/${jobId}`);
  }

  upload(quotationId: number, file: File): Observable<Artwork> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Artwork>(`${this.apiUrl}/quotation/${quotationId}`, formData);
  }

  delete(artworkId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${artworkId}`);
  }
}