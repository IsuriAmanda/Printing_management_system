import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupplyService } from '../../../core/services/supply.service';

@Component({
  selector: 'app-printing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './printing.html',
  styleUrls: ['./printing.scss']
})
export class Printing implements OnInit {
  private supplyService = inject(SupplyService);

  searchTerm = signal('');
  isLoading  = false;
  isSaving   = signal<number | null>(null);

  supplies   = this.supplyService.printing;
  editRowId  = signal<number | null>(null);
  editCache: any = {};

  ngOnInit(): void {
    this.isLoading = true;
    this.supplyService.getPrinting().subscribe({
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
    const color = this.editCache.name;
    const minQty = Number(this.editCache.min_qty);
    const maxQty = Number(this.editCache.max_qty);
    const price = Number(this.editCache.price);
    if (!color && !minQty && !maxQty && !price) {
      alert('All required fields are empty. Select a color type and enter minimum quantity, maximum quantity, and price.');
      return;
    }
    if (color !== '1color' && color !== '4color') {
      alert('Select a valid color type.');
      return;
    }
    if (!Number.isInteger(minQty) || minQty <= 0) {
      alert('Minimum quantity must be a whole number greater than zero.');
      return;
    }
    if (!Number.isInteger(maxQty) || maxQty <= 0) {
      alert('Maximum quantity must be a whole number greater than zero.');
      return;
    }
    if (minQty > maxQty) {
      alert('Minimum quantity cannot be greater than maximum quantity.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      alert('Price per unit must be greater than zero.');
      return;
    }
    this.isSaving.set(sid);
    const request$ = sid === 0
      ? this.supplyService.addPrinting(this.editCache)
      : this.supplyService.updatePrinting(sid, this.editCache);
    request$.subscribe({
      next: () => {
        this.isSaving.set(null);
        this.cancelEdit();
      },
      error: (err) => {
        this.isSaving.set(null);
        alert(err.error?.message || 'Failed to save printing slab.');
      }
    });
  }

  delete(sid: number): void {
    if (!confirm(`Delete printing slab ${sid}?`)) return;
    this.supplyService.deletePrinting(sid).subscribe();
  }

  addNewPrintingPrice(): void {
    if (this.editRowId() !== null) return;
    this.editCache = { name: '', min_qty: null, max_qty: null, price: null };
    this.editRowId.set(0);
  }
}
