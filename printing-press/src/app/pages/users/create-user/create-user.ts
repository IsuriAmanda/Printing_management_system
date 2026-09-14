import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-create-user',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HttpClientModule],
  templateUrl: './create-user.html',
  styleUrls: ['./create-user.scss'],
})
export class CreateUser {
  user = {
    fullName: '',
    email: '',
    phone: '',
    role: 'Operator',
    status: 'Active',
    temporaryPassword: '',
  };

  roles = ['Admin', 'Manager', 'Operator'];

  roleMap: any = {
    Admin: 1,
    Manager: 2,
    Operator: 3,
  };

  constructor(private http: HttpClient, private router: Router) {}

saveUser() {
  const payload = {
    full_name: this.user.fullName.trim(),
    email: this.user.email.trim(),
    password: this.user.temporaryPassword,
    role_id: this.roleMap[this.user.role],
  };

  const token = localStorage.getItem('token');

  this.http.post('http://localhost:3000/api/users', payload, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).subscribe({
    next: () => {
      alert('User saved successfully');
      this.router.navigate(['/users']);
    },
    error: (err) => {
      console.error('Create user failed:', err);
      alert(err.error?.message || 'Failed to create user');
    }
  });
}
}
