export interface User {
  id?: number;
  full_name: string;
  email: string;
  password?: string;       // never sent back to the client
  role_id: number;
  role_name?: string;       // joined from role table, for display
  is_active?: boolean;
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

export interface UserResponse {
  id: number;
  full_name: string;
  email: string;
  role_id: number;
  role_name: string;
  is_active: boolean;
  created_at: string;
}