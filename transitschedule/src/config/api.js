import axios from 'axios';
import { clearAuthData } from '../utils/authHelpers';

const API_BASE_URL = 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add request interceptor to include JWT token in headers
api.interceptors.request.use(
  (config) => {
    console.log("[api] Request interceptor - URL:", config.url);
    console.log("[api] Request interceptor - Method:", config.method);
    console.log("[api] Request interceptor - Base URL:", config.baseURL);
    const token = localStorage.getItem('token');
    console.log("[api] Request interceptor - Token exists:", !!token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("[api] Request interceptor - Authorization header set");
    }
    console.log("[api] Request interceptor - Final config:", {
      url: config.url,
      method: config.method,
      hasAuth: !!config.headers.Authorization,
    });
    return config;
  },
  (error) => {
    console.error("[api] Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log("[api] Response interceptor - Success");
    console.log("[api] Response interceptor - URL:", response.config?.url);
    console.log("[api] Response interceptor - Method:", response.config?.method);
    console.log("[api] Response interceptor - Status:", response.status);
    console.log("[api] Response interceptor - Status text:", response.statusText);
    console.log("[api] Response interceptor - Has data:", !!response.data);
    console.log("[api] Response interceptor - Response headers:", response.headers);
    return response;
  },
  (error) => {
    console.error("[api] Response interceptor - Error caught");
    console.error("[api] Response interceptor - URL:", error.config?.url);
    console.error("[api] Response interceptor - Method:", error.config?.method);
    console.error("[api] Response interceptor - Base URL:", error.config?.baseURL);
    console.error("[api] Response interceptor - Full URL:", error.config?.baseURL + error.config?.url);
    
    // Check if error has a response (server responded)
    if (error.response) {
      console.error("[api] Response interceptor - Server responded with error");
      console.error("[api] Response interceptor - Status:", error.response.status);
      console.error("[api] Response interceptor - Status text:", error.response.statusText);
      console.error("[api] Response interceptor - Response headers:", error.response.headers);
      console.error("[api] Response interceptor - Response data:", error.response.data);
    } else if (error.request) {
      console.error("[api] Response interceptor - NO RESPONSE from server");
      console.error("[api] Response interceptor - Request was made but no response received");
      console.error("[api] Response interceptor - Error code:", error.code);
      console.error("[api] Response interceptor - Error message:", error.message);
      console.error("[api] Response interceptor - This usually means:");
      console.error("[api]   - Backend is not running");
      console.error("[api]   - CORS issue");
      console.error("[api]   - Network connectivity problem");
      console.error("[api]   - Backend URL is incorrect");
    } else {
      console.error("[api] Response interceptor - Error setting up request");
      console.error("[api] Response interceptor - Error message:", error.message);
    }
    
    // Handle 401 Unauthorized - token might be expired or invalid
    if (error.response?.status === 401) {
      console.log("[api] Response interceptor - 401 detected, clearing auth data");
      // Clear auth data when token is invalid
      clearAuthData();
    }
    return Promise.reject(error);
  }
);

export default api;

