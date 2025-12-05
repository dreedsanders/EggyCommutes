import api from '../config/api';

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
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Login failed');
    }
    throw new Error('Network error. Please try again.');
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
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error) {
    if (error.response && error.response.data.errors) {
      const errors = error.response.data.errors;
      if (Array.isArray(errors)) {
        throw new Error(errors.join(', '));
      }
      throw new Error(Object.values(errors).flat().join(', '));
    }
    if (error.response && error.response.data.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error('Network error. Please try again.');
  }
};

/**
 * Logout user by removing token from localStorage
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Get current user from localStorage
 * @returns {Object|null} - User object or null
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    return JSON.parse(userStr);
  }
  return null;
};

/**
 * Check if user is authenticated
 * @returns {boolean} - True if token exists
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

