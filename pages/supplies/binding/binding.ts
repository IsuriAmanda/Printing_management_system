import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupplyService } from '../../../core/services/supply.service';

@Component({
  selector: 'app-binding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './binding.html',
  styleUrls: ['./binding.scss']
})
export class Binding implements OnInit {
  private supplyService = inject(SupplyService);

  searchTerm = signal('');
  isLoading  = false;
  isSaving   = signal<number | null>(null);

  supplies   = this.supplyService.binding;
  editRowId  = signal<number | null>(null);
  editCache: any = {};

  ngOnInit(): void {
    this.isLoading = true;
    this.supplyService.getBinding().subscribe({
      next:  () => { this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  readonly filtered = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.supplies();
    return this.supplies().filter(s =>
      s.sid.toString().includes(term) ||
      s.name?.toLowerCase().includes(term)
    );
  });

  trackBySupplyId(_: number, s: any): number { return s.sid; }

  startEdit(s: any): void {
    this.editRowId.set(s.sid);
    this.editCache = { ...s };
  }

  cancelEdit(): void {
    this.editRowId.set(null);
    this.editCache = {};
  }

  saveEdit(sid: number): void {
    const nameMissing = !this.editCache.name?.trim();
    const minPages = Number(this.editCache.min_pages);
    const maxPages = Number(this.editCache.max_pages);
    const price = Number(this.editCache.price);
    if (nameMissing && !minPages && !maxPages && !price) {
      alert('All required fields are empty. Enter the binding name, minimum pages, maximum pages, and price.');
      return;
    }
    if (nameMissing) {
      alert('Binding name is required.');
      return;
    }
    if (!Number.isInteger(minPages) || minPages <= 0) {
      alert('Minimum pages must be a whole number greater than zero.');
      return;
    }
    if (!Number.isInteger(maxPages) || maxPages <= 0) {
      alert('Maximum pages must be a whole number greater than zero.');
      return;
    }
    if (minPages > maxPages) {
      alert('Minimum pages cannot be greater than maximum pages.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      alert('Price must be greater than zero.');
      return;
    }
    this.isSaving.set(sid);
    const request$ = sid === 0
      ? this.supplyService.addBinding(this.editCache)
      : this.supplyService.updateBinding(sid, this.editCache);
    request$.subscribe({
      next: () => {
        this.isSaving.set(null);
        this.cancelEdit();
      },
      error: (err) => {
        this.isSaving.set(null);
        alert(err.error?.message || 'Failed to save binding type.');
      }
    });
  }

  delete(sid: number): void {
    if (!confirm(`Delete binding type ${sid}?`)) return;
    this.supplyService.deleteBinding(sid).subscribe();
  }

  addNewBindingType(): void {
    if (this.editRowId() !== null) return;
    this.editCache = { name: '', min_pages: null, max_pages: null, price: null };
    this.editRowId.set(0);
  }
}
