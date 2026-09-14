import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService, Customer, CustomerStatus } from '../../core/services/customer.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.html',
  styleUrls: ['./customers.scss'],
})
export class Customers implements OnInit {
  private customerService = inject(CustomerService);

  customers = this.customerService.customers;
  searchQuery = signal('');
  statusFilter = signal<'' | CustomerStatus>('');

  editRowId = signal<number | null>(null);
  editCache: Partial<Customer> = {};
  isNewRow = false;

  ngOnInit(): void {
    this.customerService.getAll().subscribe({
      error: (err) => console.error('Error loading customers:', err)
    });
  }

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    let list = this.customers();

    if (status) {
      list = list.filter(c => c.status === status);
    }

    if (q) {
      list = list.filter(c => {
        const name = (c.name || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const phone = c.phone || '';
        const address = c.address || '';

        return name.includes(q) || email.includes(q) || phone.includes(q) || address.includes(q);
      });
    }

    return list;
  });

  startEdit(customer: Customer) {
    this.editRowId.set(customer.customer_id);
    this.editCache = { ...customer };
    this.isNewRow = false;
  }

  cancelEdit() {
    this.isNewRow = false;
    this.editRowId.set(null);
    this.editCache = {};
  }

  saveEdit(id: number) {
    if (!this.editCache.name?.trim()) return;

    if (id === 0) {
      this.customerService.create(this.editCache).subscribe({
        next: () => this.cancelEdit(),
        error: (err) => {
          console.error('Error creating customer:', err);
          alert(err.error?.message || 'Failed to create customer');
        }
      });
    } else {
      this.customerService.update(id, this.editCache).subscribe({
        next: () => this.cancelEdit(),
        error: (err) => {
          console.error('Error updating customer:', err);
          alert(err.error?.message || 'Failed to update customer');
        }
      });
    }
  }

 /* deleteCustomer(id: number) {
    if (id === 0) return this.cancelEdit();
    if (!confirm(`Are you sure you want to delete customer reference ${id}?`)) return;

    this.customerService.delete(id).subscribe({
      error: (err) => console.error('Error deleting customer:', err)
    });
  }*/

  addNewCustomerRow() {
    if (this.editRowId() !== null) return;

    this.isNewRow = true;
    this.editRowId.set(0);
    this.editCache = {
      customer_id: 0,
      name: '',
      email: '',
      phone: '',
      address: '',
      status: 'Active'
    };
  }

  initials(c: Customer): string {
    if (!c.name) return '?';
    const parts = c.name.trim().split(/\s+/);
    return parts.length > 1 
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : `${parts[0][0] || ''}`.toUpperCase();
  }

  avatarClass(id: number): string {
    const classes = ['av-blue', 'av-teal', 'av-purple', 'av-coral', 'av-green'];
    return classes[id % classes.length] || 'av-blue';
  }

  trackById(_: number, c: Customer): number {
    return c.customer_id;
  }
}
