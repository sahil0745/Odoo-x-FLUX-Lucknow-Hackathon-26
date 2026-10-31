export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  details?: unknown;
  timestamp?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  customerProfileId?: string | null;
  staffProfileId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
