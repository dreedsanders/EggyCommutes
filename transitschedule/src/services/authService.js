import api from '../config/api';
import {
  storeAuthData,
  clearAuthData,
  getStoredUser,
  getStoredToken,
  isAuthenticated,
  extractErrorMessage,
} from '../utils/authHelpers';

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - User data and token
 */
export const login = async (email, password) => {
  try {
    const response = await api.post('/api/v1/auth/login', {
      email,
      password,
    });
    
    storeAuthData(response.data.user, response.data.token);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
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

