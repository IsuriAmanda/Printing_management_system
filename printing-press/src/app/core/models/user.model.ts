export type UserRole = 'Admin' | 'Manager' | 'Operator';

export interface User {
  id: number;
  full_name: string;
  email: string;
  role_id: number;
  role_name: UserRole;
  is_active: boolean;
  created_at?: string;
}

export interface CreateUserRequest {
  full_name: string;
  email: string;
  password: string;
  role_id: number;
}

export interface UpdateUserRequest {
  full_name?: string;
  email?: string;
  role_id?: number;
  is_active?: boolean;
}