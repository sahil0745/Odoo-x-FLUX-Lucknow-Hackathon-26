import { UserRole } from '@prisma/client';

export interface CustomerRegisterDto {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName?: string;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface AuthSessionResponse {
  user: {
    id: string;
    email: string;
    role: UserRole;
    customerProfile?: {
      id: string;
      contactName: string;
      companyName?: string | null;
    } | null;
    staffProfile?: {
      id: string;
      department?: string | null;
      title?: string | null;
    } | null;
  };
  accessToken: string;
}
