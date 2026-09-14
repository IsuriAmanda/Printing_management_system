import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { QuotationService } from '../../../core/services/quotation.service';
import { CustomerService, Customer } from '../../../core/services/customer.service';

@Component({
  selector: 'app-quot-primary',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './quotation-create.html',
  styleUrls: ['./quotation-create.scss'],
})
export class QuotPrimary implements OnInit {

  private fb               = inject(FormBuilder);
  private router           = inject(Router);
  private quotationService = inject(QuotationService);
  private customerService  = inject(CustomerService);

  form: FormGroup;
  isSubmitting  = false;
  isNewCustomer = false;

  // Customers from DB
  customers: Customer[] = [];
  isLoadingCustomers = true;

  constructor() {
    this.form = this.fb.group({
      // Selection mode — pick existing or create new
      mode:         ['existing'],

      // Existing customer
      customerId:   [null],

      // New customer fields
      customerName: [''],
      email:        ['', Validators.email],
      phoneNumber:  [''],
      address:      ['']
    });
  }

  ngOnInit(): void {
    this.customerService.getAll().subscribe({
      next: (data) => {
        // Inactive customers remain in quotation history, but cannot be
        // selected for a new quotation.
        this.customers = data.filter(customer => customer.status !== 'Inactive');
        this.isLoadingCustomers = false;
      },
      error: () => { this.isLoadingCustomers = false; }
    });
  }

  get mode(): string {
    return this.form.get('mode')?.value;
  }

  switchMode(m: 'existing' | 'new'): void {
    this.form.patchValue({ mode: m });
    // Clear fields when switching
    if (m === 'existing') {
      this.form.patchValue({ customerName: '', email: '', phoneNumber: '', address: '' });
    } else {
      this.form.patchValue({ customerId: null });
    }
  }

  submit(): void {
    if (this.isSubmitting) return;

    const v = this.form.value;

    if (v.mode === 'existing') {
      if (!v.customerId) {
        alert('Please select a customer');
        return;
      }

      // Find selected customer details
      const selected = this.customers.find(
        c => c.customer_id === Number(v.customerId)
      );

      if (!selected) {
        alert('Selected customer not found');
        return;
      }

      if (selected.status === 'Inactive') {
        alert('New quotations cannot be created for an inactive customer');
        return;
      }

      this.isSubmitting = true;

      const payload = {
        customer_id:   selected.customer_id,
        customer_name: selected.name,
        email:         selected.email   || '',
        phone:         selected.phone   || '',
        address:       selected.address || ''
      };

      this.continueToDetails(payload);

    } else {
      // New customer — validate required fields
      if (!v.customerName?.trim()) {
        alert('Customer name is required');
        return;
      }
      const emailControl = this.form.get('email');
      if (v.email?.trim() && emailControl?.invalid) {
        emailControl.markAsTouched();
        alert('Enter a valid email address, for example name@example.com');
        return;
      }

      this.isSubmitting = true;

      const payload = {
        customer_name: v.customerName.trim(),
        email:         v.email?.trim() || '',
        phone:         v.phoneNumber || '',
        address:       v.address     || ''
      };

      this.continueToDetails(payload);
    }
  }

  private continueToDetails(customer: any): void {
    this.quotationService.setDraftQuotation({ customer });
    this.router.navigate(['/quotations/quotation-create/quotations-details']);
  }
}
