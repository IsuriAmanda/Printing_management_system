import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupplyService } from '../../../core/services/supply.service';

@Component({
  selector: 'app-laminating',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './laminating.html',
  styleUrls: ['./laminating.scss']
})
export class Laminating implements OnInit {
  private supplyService = inject(SupplyService);

  searchTerm = signal('');
  isLoading  = false;
  isSaving   = signal<number | null>(null);

  supplies   = this.supplyService.lamination;
  standards  = this.supplyService.standards;  // size options from DB

  editRowId  = signal<number | null>(null);
  editCache: any = {};

  ngOnInit(): void {
    this.isLoading = true;

    // Load both lamination types and standards in parallel
    this.supplyService.getStandards().subscribe();
    this.supplyService.getLamination().subscribe({
      next:  () => { this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  readonly filtered = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.supplies();
    return this.supplies().filter(s =>
      s.sid.toString().includes(term)      ||
      s.name?.toLowerCase().includes(term) ||
      s.size?.toLowerCase().includes(term)
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
    const sizeId = Number(this.editCache.size_id);
    const price = Number(this.editCache.price);
    if (nameMissing && !sizeId && !price) {
      alert('All required fields are empty. Select a finish name and size, then enter the price.');
      return;
    }
    if (nameMissing) {
      alert('Finish name is required.');
      return;
    }
    if (!Number.isInteger(sizeId) || !this.standards().some(s => Number(s.size_id) === sizeId)) {
      alert('Select a valid standard size.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      alert('Price per unit must be greater than zero.');
      return;
    }
    this.isSaving.set(sid);

    const request$ = sid === 0
      ? this.supplyService.addLamination(this.editCache)
      : this.supplyService.updateLamination(sid, this.editCache);
    request$.subscribe({
      next: () => {
        this.isSaving.set(null);
        this.cancelEdit();
        // Reload to get updated size name from join
        this.supplyService.getLamination().subscribe();
      },
      error: (err) => {
        this.isSaving.set(null);
        alert(err.error?.message || 'Failed to save lamination type.');
      }
    });
  }

  delete(sid: number): void {
    if (!confirm(`Delete lamination type ${sid}?`)) return;
    this.supplyService.deleteLamination(sid).subscribe();
  }

  addNewLaminatingPrice(): void {
    if (this.editRowId() !== null) return;
    this.editCache = { name: '', price: null, size_id: '' };
    this.editRowId.set(0);
  }

  selectedStandard(): any | null {
    return this.standards().find(s => Number(s.size_id) === Number(this.editCache.size_id)) || null;
  }
}
