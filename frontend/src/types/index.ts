export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface CustomerProfile {
  id: string;
  contactName: string;
  companyName?: string | null;
  phone?: string | null;
  billingAddress?: string | null;
  city?: string | null;
  country?: string | null;
  taxNumber?: string | null;
}

export interface StaffProfile {
  id: string;
  department?: string | null;
  title?: string | null;
  createdBy?: {
    id: string;
    email: string;
  } | null;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  permissions?: string[];
  customerProfile?: CustomerProfile | null;
  staffProfile?: StaffProfile | null;
  createdAt?: string;
}

export interface LoginResponseData {
  user: User;
  accessToken: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName?: string;
  phone?: string;
}

export interface HealthResponse {
  success: boolean;
  application: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  environment: string;
  version: string;
  database: {
    connected: boolean;
    status: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  details?: unknown;
}
