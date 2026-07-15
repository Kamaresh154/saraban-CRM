'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  Lock,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff,
  User,
  CheckCircle,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';

function LoginContent() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Navigation query parameter alerts
  const [urlMessage, setUrlMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tabs & Forms
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset-sent' | 'register-success'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [simulatedVerifyLink, setSimulatedVerifyLink] = useState('');

  // Check URL query parameters on mount
  useEffect(() => {
    const verify = searchParams.get('verify');
    const errParam = searchParams.get('error');
    const msgParam = searchParams.get('message');

    if (verify === 'success') {
      setUrlMessage({ type: 'success', text: 'Email verified successfully! You can now log in.' });
    } else if (verify === 'error') {
      setUrlMessage({ type: 'error', text: msgParam?.replace(/_/g, ' ') || 'Email verification failed.' });
    } else if (errParam) {
      setUrlMessage({ type: 'error', text: errParam.replace(/_/g, ' ') });
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUrlMessage(null);
    setFormLoading(true);

    if (mode === 'login') {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Invalid credentials');
        setFormLoading(false);
      }
    } else if (mode === 'register') {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setSimulatedVerifyLink(data.verifyLink);
          setMode('register-success');
        } else {
          setError(data.error || 'Registration failed');
        }
      } catch (err) {
        setError('Network error occurred during registration.');
      } finally {
        setFormLoading(false);
      }
    } else if (mode === 'forgot') {
      // Simulate forgot password API call
      setTimeout(() => {
        setMode('reset-sent');
        setFormLoading(false);
      }, 1000);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/integrations/google/auth?action=login';
  };

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 p-8 z-10 relative">

      {/* Brand Logo & welcome */}
      <div className="text-center mb-6 flex flex-col items-center justify-center">
        <img src="/logo.png" alt="Saraban Logo" className="h-14 w-auto object-contain mb-2" />
        <p className="text-xs text-gray-500 tracking-wider font-semibold uppercase">
          CRM Portal
        </p>
      </div>

      {/* Dynamic Parameter Toast Messages */}
      {urlMessage && (
        <div className={`border p-3 rounded-lg mb-6 flex gap-2.5 items-start animate-fade-in ${
          urlMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {urlMessage.type === 'success' ? <CheckCircle size={15} className="mt-0.5" /> : <AlertTriangle size={15} className="mt-0.5" />}
          <span className="text-xs font-semibold">{urlMessage.text}</span>
        </div>
      )}

      {/* Form Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3.5 rounded-lg mb-6 flex gap-2.5 items-start font-semibold animate-fade-in">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Controls */}
      {(mode === 'login' || mode === 'register') && (
        <div className="flex bg-gray-100 border border-gray-200 p-0.5 rounded-lg mb-6 text-xs font-semibold">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2 rounded-md transition-all ${
              mode === 'login' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-2 rounded-md transition-all ${
              mode === 'register' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Register
          </button>
        </div>
      )}

      {/* Login Mode */}
      {mode === 'login' && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Email Address
            </label>
            <div className="relative flex items-center bg-gray-50 border border-gray-300 rounded-lg focus-within:border-primary transition-colors">
              <Mail className="absolute left-3 text-gray-400" size={16} />
              <input
                type="email"
                required
                placeholder="name@example.com"
                className="w-full bg-transparent py-2.5 pl-10 pr-4 text-sm outline-none text-gray-900 placeholder-gray-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Password
              </label>
              <button
                type="button"
                onClick={() => { setError(''); setMode('forgot'); }}
                className="text-[11px] text-primary hover:text-primary/80 transition-colors"
              >
                Forgot?
              </button>
            </div>
            <div className="relative flex items-center bg-gray-50 border border-gray-300 rounded-lg focus-within:border-primary transition-colors">
              <Lock className="absolute left-3 text-gray-400" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className="w-full bg-transparent py-2.5 pl-10 pr-10 text-sm outline-none text-gray-900 placeholder-gray-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between py-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-gray-500 hover:text-gray-700">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 bg-white checked:bg-primary accent-primary"
              />
              Remember Me
            </label>
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="w-full bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all py-3 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-2 shadow-sm"
          >
            {formLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Sign In
                <ChevronRight size={16} />
              </>
            )}
          </button>

          {/* Google Authentication */}
          <div className="relative flex items-center justify-center py-2">
            <span className="absolute inset-x-0 h-[1px] bg-gray-200" />
            <span className="relative bg-white px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Or Continue With
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full bg-white text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all py-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2.5 border border-gray-300 shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.74 14.96 1 12 1 7.35 1 3.39 3.67 1.4 7.56l3.8 2.95C6.12 7.02 8.84 5.04 12 5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.74-2.38 3.58l3.7 2.87c2.16-1.99 3.41-4.91 3.41-8.6z" />
              <path fill="#FBBC05" d="M5.2 14.51c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.4 6.98C.51 8.76 0 10.74 0 12.8s.51 4.04 1.4 5.82l3.8-3.11z" />
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.03.69-2.35 1.1-4.26 1.1-3.16 0-5.88-1.98-6.84-4.81l-3.8 2.95C3.39 20.33 7.35 23 12 23z" />
            </svg>
            Sign In with Google
          </button>

        </form>
      )}

      {/* Register Mode */}
      {mode === 'register' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Full Name
            </label>
            <div className="relative flex items-center bg-gray-50 border border-gray-300 rounded-lg focus-within:border-primary transition-colors">
              <User className="absolute left-3 text-gray-400" size={16} />
              <input
                type="text"
                required
                placeholder="Jane Doe"
                className="w-full bg-transparent py-2.5 pl-10 pr-4 text-sm outline-none text-gray-900 placeholder-gray-400"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Email Address
            </label>
            <div className="relative flex items-center bg-gray-50 border border-gray-300 rounded-lg focus-within:border-primary transition-colors">
              <Mail className="absolute left-3 text-gray-400" size={16} />
              <input
                type="email"
                required
                placeholder="jane@example.com"
                className="w-full bg-transparent py-2.5 pl-10 pr-4 text-sm outline-none text-gray-900 placeholder-gray-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <div className="relative flex items-center bg-gray-50 border border-gray-300 rounded-lg focus-within:border-primary transition-colors">
              <Lock className="absolute left-3 text-gray-400" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Minimum 8 characters"
                className="w-full bg-transparent py-2.5 pl-10 pr-10 text-sm outline-none text-gray-900 placeholder-gray-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="w-full bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all py-3 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-2 shadow-sm"
          >
            {formLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Register Account
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </form>
      )}

      {/* Simulated Verification */}
      {mode === 'register-success' && (
        <div className="text-center space-y-5 py-4 animate-fade-in text-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 mb-2">
            <CheckCircle size={24} />
          </div>
          <h3 className="font-display font-semibold text-base text-gray-900">Verification Email Dispatched</h3>
          <p className="text-gray-500 leading-relaxed">
            We've created your account. In production, an activation link is sent to <strong className="text-gray-900">{email}</strong>.
          </p>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-left space-y-2">
            <span className="font-bold text-primary block">Sandbox Activation helper</span>
            <p className="text-[10px] text-gray-500 leading-normal">
              Click this simulated activation link to verify your email and activate your account locally:
            </p>
            <a
              href={simulatedVerifyLink}
              className="text-[10px] text-primary hover:underline break-all font-mono font-medium block bg-white p-2 rounded border border-gray-200"
            >
              {simulatedVerifyLink}
            </a>
          </div>

          <button
            type="button"
            onClick={() => {
              setMode('login');
              setEmail('');
              setPassword('');
              setName('');
            }}
            className="bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-primary/30 transition-all px-6 py-2 rounded-lg font-semibold text-gray-700 text-xs"
          >
            Return to Sign In
          </button>
        </div>
      )}

      {/* Forgot password */}
      {mode === 'forgot' && (
        <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
          <p className="text-xs text-gray-500 leading-relaxed text-center mb-2">
            Enter your email address and we'll send you a password reset link.
          </p>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Email Address
            </label>
            <div className="relative flex items-center bg-gray-50 border border-gray-300 rounded-lg focus-within:border-primary transition-colors">
              <Mail className="absolute left-3 text-gray-400" size={16} />
              <input
                type="email"
                required
                placeholder="name@example.com"
                className="w-full bg-transparent py-2.5 pl-10 pr-4 text-sm outline-none text-gray-900 placeholder-gray-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="w-full bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all py-3 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-2 shadow-sm"
          >
            {formLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Send Reset Link
                <ChevronRight size={16} />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className="w-full text-center text-[11px] text-gray-500 hover:text-gray-700 transition-colors"
          >
            Back to Sign In
          </button>
        </form>
      )}

      {/* Reset Link Sent */}
      {mode === 'reset-sent' && (
        <div className="text-center space-y-5 py-4 animate-fade-in text-xs">
          <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-teal-600 mb-2">
            <RefreshCw size={24} />
          </div>
          <h3 className="font-display font-semibold text-base text-gray-900">Reset Link Dispatched</h3>
          <p className="text-gray-500 leading-relaxed">
            We've sent a recovery email to <strong className="text-gray-900">{email}</strong>. Check your inbox to complete the password configuration.
          </p>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setEmail('');
              setPassword('');
            }}
            className="bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-primary/30 transition-all px-6 py-2 rounded-lg font-semibold text-gray-700"
          >
            Return to Login
          </button>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <Suspense fallback={
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      }>
        <LoginContent />
      </Suspense>
    </div>
  );
}
