import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';


export type CustomerStatus = 'Active' | 'Inactive' | 'Lead';
export interface Customer {
  customer_id: number;
  name:        string;
  phone?:      string;
  email?:      string;
  address?:    string;
  status:     CustomerStatus;
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private http   = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/customers';

  private customersSignal = signal<Customer[]>([]);
  customers = this.customersSignal.asReadonly();

  getAll(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.apiUrl).pipe(
      tap(data => this.customersSignal.set(data))
    );
  }

  create(customer: Partial<Customer>): Observable<Customer> {
    return this.http.post<Customer>(this.apiUrl, customer).pipe(
      tap(newCust => {
        this.customersSignal.update(list => [newCust, ...list]);
      })
    );
  }

  update(id: number, customer: Partial<Customer>): Observable<Customer> {
    return this.http.put<Customer>(`${this.apiUrl}/${id}`, customer).pipe(
      tap(updatedCust => {
        this.customersSignal.update(list =>
          list.map(c => (c.customer_id === id ? updatedCust : c))
        );
      })
    );
  }

  /*delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.customersSignal.update(list => list.filter(c => c.customer_id !== id));
      })
    );
  }*/
}