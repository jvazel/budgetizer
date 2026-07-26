import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

interface AuthUser {
  _id: string;
  id?: string;
  name?: string;
  email?: string;
  preferences?: Record<string, unknown>;
}

interface AuthContextType {
  user: AuthUser | null;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
  loading: boolean;
  login: (email: string, password: string) => Promise<unknown>;
  register: (name: string, email: string, password: string) => Promise<unknown>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoggedIn = async () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      if (isLoggedIn === 'true') {
        try {
          const res = await api.get<AuthUser>('/auth/me');
          setUser(res.data);
         } catch (error) {
          console.error("Authentication error", error);
          localStorage.removeItem('isLoggedIn');
         }
       }
      setLoading(false);
     };

    checkLoggedIn();
   }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthUser>('/auth/login', { email, password });
    localStorage.setItem('isLoggedIn', 'true');
    setUser(res.data);
    return res.data;
   };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post<AuthUser>('/auth/register', { name, email, password });
    localStorage.setItem('isLoggedIn', 'true');
    setUser(res.data);
    return res.data;
   };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
     } catch (error) {
      console.error("Error during server logout", error);
     } finally {
      localStorage.removeItem('isLoggedIn');
      setUser(null);
     }
   };

  return (
     <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
       {children}
     </AuthContext.Provider>
   );
};