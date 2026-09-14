import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SupplyService } from '../../core/services/supply.service';

@Component({
  selector: 'app-supplies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supplies.html',
  styleUrls: ['./supplies.scss']
})
export class Supplies implements OnInit {
  private supplyService = inject(SupplyService);

  searchTerm  = signal('');
  isLoading   = false;
  isSaving    = signal<number | null>(null);

  supplies    = this.supplyService.materials;
  editRowId   = signal<number | null>(null);
  editCache: any = {};

  ngOnInit(): void {
    this.isLoading = true;
    this.supplyService.getMaterials().subscribe({
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
    const heightMissing = this.editCache.height === null || this.editCache.height === undefined || this.editCache.height === '';
    const widthMissing = this.editCache.width === null || this.editCache.width === undefined || this.editCache.width === '';
    const costMissing = this.editCache.costPerUnit === null || this.editCache.costPerUnit === undefined || this.editCache.costPerUnit === '';

    if (nameMissing && heightMissing && widthMissing && costMissing) {
      alert('All required fields are empty. Enter the material name, height, width, and unit price.');
      return;
    }
    if (nameMissing) {
      alert('Material name is required.');
      return;
    }
    if (heightMissing || Number(this.editCache.height) <= 0) {
      alert('Material height is required and must be greater than zero.');
      return;
    }
    if (widthMissing || Number(this.editCache.width) <= 0) {
      alert('Material width is required and must be greater than zero.');
      return;
    }
    if (costMissing || Number(this.editCache.costPerUnit) <= 0) {
      alert('Cost per unit is required and must be greater than zero.');
      return;
    }
    this.isSaving.set(sid);
    const request$ = sid === 0
      ? this.supplyService.addMaterial(this.editCache)
      : this.supplyService.updateMaterial(sid, this.editCache);
    request$.subscribe({
      next: () => {
        this.isSaving.set(null);
        this.cancelEdit();
      },
      error: (err) => {
        this.isSaving.set(null);
        alert(err.error?.message || 'Failed to save material.');
      }
    });
  }

  delete(sid: number): void {
    if (!confirm(`Delete material ${sid}?`)) return;
    this.supplyService.deleteMaterial(sid).subscribe();
  }

  addNewMaterial(): void {
    if (this.editRowId() !== null) return;
    this.editCache = {
      name: '', category: 'MATERIAL', costPerUnit: null,
      height: null, width: null
    };
    this.editRowId.set(0);
  }
}
