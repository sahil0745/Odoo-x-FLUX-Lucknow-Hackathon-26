import { apiClient, setAccessToken } from './api';
import {
  User,
  RegisterPayload,
} from '../types';

export interface AuthSuccessResponse {
  user: User;
  accessToken: string;
}

export const authService = {
  /**
   * Register a new Customer account
   */
  async register(payload: RegisterPayload): Promise<AuthSuccessResponse> {
    const res = await apiClient.post('/auth/register', payload);
    const data = res.data.data;
    setAccessToken(data.accessToken);
    return data;
  },

  /**
   * Authenticate user with email and password
   */
  async login(credentials: { email: string; password: string }): Promise<AuthSuccessResponse> {
    const res = await apiClient.post('/auth/login', credentials);
    const data = res.data.data;
    setAccessToken(data.accessToken);
    return data;
  },

  /**
   * Invalidate session and clear server-side HttpOnly cookie
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },

  /**
   * Retrieve current user profile and permission manifest
   */
  async getMe(): Promise<User> {
    const res = await apiClient.get('/auth/me');
    return res.data.data;
  },

  /**
   * Silently refresh access token using HttpOnly cookie
   */
  async refresh(): Promise<AuthSuccessResponse> {
    const res = await apiClient.post('/auth/refresh');
    const data = res.data.data;
    setAccessToken(data.accessToken);
    return data;
  },

  /**
   * Request password reset email
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return res.data;
  },

  /**
   * Submit new password with reset token
   */
  async resetPassword(payload: {
    token: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ message: string }> {
    const res = await apiClient.post('/auth/reset-password', payload);
    return res.data;
  },
};
