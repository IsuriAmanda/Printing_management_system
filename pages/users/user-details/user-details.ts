import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-details.html',
  styleUrls: ['./user-details.scss'],
})
export class UserDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);

  user = signal<User | null>(null);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.userService.getById(id).subscribe({
      next: (u) => { this.user.set(u); this.loading.set(false); },
      error: () => { this.error.set('User not found'); this.loading.set(false); }
    });
  }
}