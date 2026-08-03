'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { API } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchSession = async () => {
    try {
      const res = await API.get('/api/auth/me');
      if (res && res.success) {
        setUser(res.user);
      } else {
        setUser(null);
        if (pathname !== '/login' && pathname !== '/') {
          router.replace('/login');
        }
      }
    } catch (err) {
      console.error('Failed to fetch session', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [pathname]);

  const login = async (mobileOrId, password, isStaff) => {
    const endpoint = isStaff ? '/api/auth/subuser-login' : '/api/auth/login';
    const payload = isStaff 
      ? { subUserID: mobileOrId, password } 
      : { mobile: mobileOrId, password };
      
    const res = await API.post(endpoint, payload);
    if (res && res.success) {
      setUser(res.user);
      router.replace('/home');
    }
    return res;
  };

  const logout = async () => {
    try {
      await API.post('/api/auth/logout', {});
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshSession: fetchSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
