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
  if (token) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
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
  if (error.response) {
    const data = error.response.data;
    
    // Handle validation errors
    if (data.errors) {
      if (Array.isArray(data.errors)) {
        return data.errors.join(', ');
      }
      return Object.values(data.errors).flat().join(', ');
    }
    
    // Handle single error message
    if (data.error) {
      return data.error;
    }
  }
  
  // Default error message
  return 'Network error. Please try again.';
};

