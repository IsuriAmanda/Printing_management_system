import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SupplyService } from '../../../core/services/supply.service';

@Component({
  selector: 'app-standard-sizes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './standard-sizes.html',
  styleUrls: ['./standard-sizes.scss']
})
export class StandardSizes implements OnInit {
  private supplyService = inject(SupplyService);

  searchTerm = signal('');
  isLoading = signal(false);
  isSaving = signal<number | null>(null);
  editStandardId = signal<number | null>(null);

  standards = this.supplyService.standards;
  standardEditCache: any = {};

  ngOnInit(): void {
    this.isLoading.set(true);
    this.supplyService.getStandards().subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false)
    });
  }

  readonly filteredStandards = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.standards();
    return this.standards().filter(s =>
      s.size_id.toString().includes(term) ||
      s.size_name?.toLowerCase().includes(term)
    );
  });

  trackByStandardId(_: number, s: any): number {
    return s.size_id;
  }

  toCm(inches: number): number {
    return Math.round(Number(inches || 0) * 2.54 * 100) / 100;
  }

  toMm(inches: number): number {
    return Math.round(Number(inches || 0) * 25.4 * 100) / 100;
  }

  fromCm(cm: number): number {
    return Math.round((Number(cm || 0) / 2.54) * 100) / 100;
  }

  fromMm(mm: number): number {
    return Math.round((Number(mm || 0) / 25.4) * 100) / 100;
  }

  displayNumber(value: number): string {
    return Number(value || 0).toFixed(2);
  }

  startStandardEdit(s: any): void {
    this.editStandardId.set(s.size_id);
    this.standardEditCache = {
      ...s,
      height: Number(s.height || 0),
      width: Number(s.width || 0)
    };
  }

  cancelStandardEdit(): void {
    this.editStandardId.set(null);
    this.standardEditCache = {};
  }

  setStandardDimension(field: 'height' | 'width', value: number, unit: 'in' | 'cm' | 'mm'): void {
    const numeric = Number(value || 0);
    const inches = unit === 'in'
      ? numeric
      : unit === 'cm'
        ? this.fromCm(numeric)
        : this.fromMm(numeric);

    this.standardEditCache[field] = Math.round(inches * 100) / 100;
  }

  saveStandard(sizeId: number): void {
    const nameMissing = !this.standardEditCache.size_name?.trim();
    const height = Number(this.standardEditCache.height);
    const width = Number(this.standardEditCache.width);

    if (nameMissing && !height && !width) {
      alert('All required fields are empty. Enter the size name, height, and width.');
      return;
    }
    if (nameMissing) {
      alert('Size name is required.');
      return;
    }
    if (!Number.isFinite(height) || height <= 0) {
      alert('Height is required and must be greater than zero.');
      return;
    }
    if (!Number.isFinite(width) || width <= 0) {
      alert('Width is required and must be greater than zero.');
      return;
    }

    this.isSaving.set(sizeId);
    const request$ = sizeId === 0
      ? this.supplyService.addStandard(this.standardEditCache)
      : this.supplyService.updateStandard(sizeId, this.standardEditCache);
    request$.subscribe({
      next: () => {
        this.isSaving.set(null);
        this.cancelStandardEdit();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to save standard size');
        this.isSaving.set(null);
      }
    });
  }

  deleteStandard(sizeId: number): void {
    if (!confirm(`Delete standard size ${sizeId}?`)) return;
    this.supplyService.deleteStandard(sizeId).subscribe({
      error: (err) => alert(err.error?.message || 'Failed to delete standard size')
    });
  }

  addNewStandard(): void {
    if (this.editStandardId() !== null) return;
    this.standardEditCache = { size_name: '', height: null, width: null };
    this.editStandardId.set(0);
  }
}
