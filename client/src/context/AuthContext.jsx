/**
 * Auth Context
 * 
 * Provides authentication state and methods throughout the app.
 */

import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  // Return empty object with defaults if context is not available
  // This prevents errors during initial render
  if (!context) {
    return { user: null, loading: true, logout: () => {} };
  }
  return context;
};

export default AuthContext;
