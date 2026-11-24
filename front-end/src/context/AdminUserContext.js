import { createContext, useContext } from 'react';

// Holds the verified admin user (set by <RequireAdmin>).
export const AdminUserContext = createContext({ user: null, setUser: () => {} });

export const useAdminUser = () => useContext(AdminUserContext);
