import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { login as authLogin, createAccount as authCreateAccount, logout as authLogout } from '../../services/authService';
import { getStoredUser, getStoredToken } from '../../utils/authHelpers';
import api from '../../config/api';

const initialState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

/**
 * Load user from localStorage on app start
 */
export const loadUserFromStorage = createAsyncThunk(
  'auth/loadUserFromStorage',
  async () => {
    const user = getStoredUser();
    const token = getStoredToken();
    return { user, token, isAuthenticated: !!token };
  }
);

/**
 * Fetch current user data from Rails backend
 */
export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { getState, rejectWithValue }) => {
    try {
      // Try to get current user endpoint - common patterns:
      // GET /api/v1/users/me
      // GET /api/v1/auth/me
      // GET /api/v1/current_user
      
      let response;
      try {
        response = await api.get('/api/v1/users/me');
      } catch (error) {
        // Try alternative endpoint
        if (error.response?.status === 404) {
          try {
            response = await api.get('/api/v1/auth/me');
          } catch (error2) {
            if (error2.response?.status === 404) {
              try {
                response = await api.get('/api/v1/current_user');
              } catch (error3) {
                // If all endpoints fail, return stored user
                const user = getStoredUser();
                if (user) {
                  return { user, fromStorage: true };
                }
                throw error3;
              }
            } else {
              throw error2;
            }
          }
        } else {
          throw error;
        }
      }
      
      return { user: response.data.user || response.data, fromStorage: false };
    } catch (error) {
      // If fetch fails, fall back to stored user
      const user = getStoredUser();
      if (user) {
        return { user, fromStorage: true };
      }
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch user data');
    }
  }
);

/**
 * Login action
 */
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await authLogin(email, password);
      return {
        user: response.user || response.data?.user,
        token: response.token || response.data?.token,
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

/**
 * Create account action
 */
export const createAccount = createAsyncThunk(
  'auth/createAccount',
  async ({ name, email, password, passwordConfirmation }, { rejectWithValue }) => {
    try {
      const response = await authCreateAccount(name, email, password, passwordConfirmation);
      return {
        user: response.user || response.data?.user,
        token: response.token || response.data?.token,
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Account creation failed');
    }
  }
);

/**
 * Logout action
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    authLogout();
    return null;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      // Also update in localStorage
      if (state.user) {
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Load user from storage
      .addCase(loadUserFromStorage.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = action.payload.isAuthenticated;
      })
      // Fetch current user
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        // Update localStorage if we got fresh data from backend
        if (!action.payload.fromStorage && action.payload.user) {
          localStorage.setItem('user', JSON.stringify(action.payload.user));
        }
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Create account
      .addCase(createAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(createAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { clearError, updateUser } = authSlice.actions;

// Selectors
export const selectUser = (state) => state.auth.user;
export const selectToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;

export default authSlice.reducer;

