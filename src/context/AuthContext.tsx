'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const router = useRouter();
  const pathname = usePathname();

  // Initialize theme and check session
  useEffect(() => {
    // 1. Theme initialization
    const savedTheme = localStorage.getItem('vd_theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 2. Session check
    checkSession();
  }, []);

  // Watch pathname to redirect based on auth status
  useEffect(() => {
    if (!loading) {
      const isPublicPath = pathname === '/' || pathname.startsWith('/auth/');
      
      if (!user) {
        if (!isPublicPath) {
          router.push('/');
        }
      } else {
        // Logged-in user checks
        if (user.mustChangePassword) {
          // Force reset page intercept
          if (pathname !== '/auth/change-password') {
            router.push('/auth/change-password');
          }
        } else {
          // Standard redirects
          if (isPublicPath || pathname === '/auth/change-password') {
            router.push('/dashboard');
          }
        }
      }
    }
  }, [user, loading, pathname, router]);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        
        if (data.mustChangePassword) {
          router.push('/auth/change-password');
        } else {
          router.push('/dashboard');
        }
        return { success: true };
      } else {
        return { success: false, error: data.error || data.message || 'Login failed' };
      }
    } catch (err) {
      return { success: false, error: 'Network error occurred' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth?action=logout', { method: 'POST' });
      setUser(null);
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('vd_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, theme, toggleTheme, login, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
