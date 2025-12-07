/**
 * Authentication Helper Functions
 * 
 * Shared utilities for authentication operations
 */

/**
 * Store authentication data in localStorage
 * @param {Object} user - User object
 * @param {string} token - JWT token
 */
export const storeAuthData = (user, token) => {
  console.log("[authHelpers] storeAuthData called");
  console.log("[authHelpers] Has token:", !!token);
  console.log("[authHelpers] Has user:", !!user);
  console.log("[authHelpers] User ID:", user?.id);
  console.log("[authHelpers] User email:", user?.email);
  
  if (token) {
    console.log("[authHelpers] Storing token to localStorage");
    localStorage.setItem('token', token);
    console.log("[authHelpers] Storing user to localStorage");
    localStorage.setItem('user', JSON.stringify(user));
    console.log("[authHelpers] Auth data stored successfully");
  } else {
    console.warn("[authHelpers] No token provided, not storing auth data");
  }
};

/**
 * Clear authentication data from localStorage
 */
export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Get current user from localStorage
 * @returns {Object|null} - User object or null
 */
export const getStoredUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }
  return null;
};

/**
 * Get stored token from localStorage
 * @returns {string|null} - Token or null
 */
export const getStoredToken = () => {
  return localStorage.getItem('token');
};

/**
 * Check if user is authenticated
 * @returns {boolean} - True if token exists
 */
export const isAuthenticated = () => {
  return !!getStoredToken();
};

/**
 * Extract error message from API error response
 * @param {Object} error - Error object from API call
 * @returns {string} - Error message
 */
export const extractErrorMessage = (error) => {
  console.log("[authHelpers] extractErrorMessage called");
  console.log("[authHelpers] Error has response:", !!error.response);
  
  if (error.response) {
    const data = error.response.data;
    console.log("[authHelpers] Response data:", data);
    console.log("[authHelpers] Response status:", error.response.status);
    
    // Handle validation errors
    if (data.errors) {
      console.log("[authHelpers] Found errors object:", data.errors);
      if (Array.isArray(data.errors)) {
        const message = data.errors.join(', ');
        console.log("[authHelpers] Returning array errors:", message);
        return message;
      }
      const message = Object.values(data.errors).flat().join(', ');
      console.log("[authHelpers] Returning object errors:", message);
      return message;
    }
    
    // Handle single error message
    if (data.error) {
      console.log("[authHelpers] Found single error:", data.error);
      return data.error;
    }
    
    console.log("[authHelpers] No specific error found in response");
  } else {
    console.log("[authHelpers] No response object, checking request");
    console.log("[authHelpers] Has request:", !!error.request);
    if (error.request) {
      console.log("[authHelpers] Request made but no response (network error)");
    }
  }
  
  // Default error message
  console.log("[authHelpers] Returning default error message");
  return 'Network error. Please try again.';
};

