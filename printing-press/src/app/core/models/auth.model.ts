export interface LoginPayload {
  email: string;
  password: string;
  role?: string;
}

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  role_id: number;
  role: string;   // 'Admin' | 'Manager' | 'Operator'
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
export interface UpdateProfilePayload {
  full_name: string;
  email: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
