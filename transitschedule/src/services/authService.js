import api from '../config/api';
import {
  storeAuthData,
  clearAuthData,
  getStoredUser,
  isAuthenticated,
  extractErrorMessage,
} from '../utils/authHelpers';

const API_BASE_URL = 'http://localhost:3001';

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - User data and token
 */
export const login = async (email, password) => {
  console.log("[authService] login called");
  console.log("[authService] Email:", email ? "provided" : "missing");
  console.log("[authService] Password:", password ? "provided" : "missing");
  
  try {
    console.log("[authService] Making POST request to /api/v1/auth/login");
    console.log("[authService] Request payload:", { email, password: password ? "***" : "missing" });
    
    const requestPromise = api.post('/api/v1/auth/login', {
      email,
      password,
    });
    
    console.log("[authService] Request promise created, waiting for response...");
    
    // Add timeout logging
    const timeoutId = setTimeout(() => {
      console.warn("[authService] Request taking longer than 5 seconds...");
      console.warn("[authService] Check if backend is running at:", API_BASE_URL || 'http://localhost:3001');
    }, 5000);
    
    let response;
    try {
      response = await requestPromise;
      clearTimeout(timeoutId);
    } catch (timeoutError) {
      clearTimeout(timeoutId);
      // Re-throw to be caught by outer catch
      throw timeoutError;
    }
    console.log("[authService] Login response received");
    console.log("[authService] Response status:", response.status);
    console.log("[authService] Response status text:", response.statusText);
    console.log("[authService] Response headers:", response.headers);
    console.log("[authService] Response data keys:", Object.keys(response.data || {}));
    console.log("[authService] Has user:", !!response.data?.user);
    console.log("[authService] Has token:", !!response.data?.token);
    console.log("[authService] Full response data:", JSON.stringify(response.data, null, 2));
    
    console.log("[authService] Storing auth data...");
    storeAuthData(response.data.user, response.data.token);
    console.log("[authService] Auth data stored successfully");
    
    return response.data;
  } catch (error) {
    console.error("[authService] Login error caught");
    console.error("[authService] Error type:", error.constructor.name);
    console.error("[authService] Error name:", error.name);
    console.error("[authService] Error message:", error.message);
    console.error("[authService] Error code:", error.code);
    
    // Check if it's a network error (no response)
    if (!error.response) {
      console.error("[authService] NO RESPONSE - This is likely a network error");
      console.error("[authService] Error request:", error.request);
      console.error("[authService] Request URL:", error.config?.url);
      console.error("[authService] Request baseURL:", error.config?.baseURL);
      console.error("[authService] Full request config:", error.config);
      
      if (error.code === 'ECONNREFUSED') {
        console.error("[authService] Connection refused - backend may not be running");
      } else if (error.code === 'ERR_NETWORK') {
        console.error("[authService] Network error - check CORS or backend connection");
      } else if (error.message?.includes('timeout')) {
        console.error("[authService] Request timeout - backend may be slow or not responding");
      }
    } else {
      console.error("[authService] Error response received");
      console.error("[authService] Error response status:", error.response.status);
      console.error("[authService] Error response status text:", error.response.statusText);
      console.error("[authService] Error response headers:", error.response.headers);
      console.error("[authService] Error response data:", error.response.data);
      console.error("[authService] Full error response:", JSON.stringify(error.response.data, null, 2));
    }
    
    const errorMessage = extractErrorMessage(error);
    console.error("[authService] Extracted error message:", errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Create a new user account
 * @param {string} name - User name
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} passwordConfirmation - Password confirmation
 * @returns {Promise<Object>} - User data and token
 */
export const createAccount = async (name, email, password, passwordConfirmation) => {
  try {
    const response = await api.post('/api/v1/users', {
      user: {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      },
    });
    
    storeAuthData(response.data.user, response.data.token);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Logout user by removing token from localStorage
 */
export const logout = () => {
  clearAuthData();
};

/**
 * Get current user from localStorage
 * @returns {Object|null} - User object or null
 */
export const getCurrentUser = () => {
  return getStoredUser();
};

// Re-export authentication check for convenience
export { isAuthenticated };

