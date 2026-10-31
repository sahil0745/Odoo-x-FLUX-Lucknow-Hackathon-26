import axios, { AxiosError } from 'axios';
import { ApiErrorResponse } from '../types';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for centralized error transformation
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const errorPayload = error.response?.data || {
      success: false,
      statusCode: error.response?.status || 500,
      message: error.message || 'An unexpected network error occurred',
    };
    return Promise.reject(errorPayload);
  }
);
