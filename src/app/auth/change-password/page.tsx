'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function ChangePasswordPage() {
  const { user, checkSession } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validations
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        // Refresh Auth Context session flags (clears mustChangePassword)
        await checkSession();
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        setError(data.error || 'Failed to update password.');
      }
    } catch (err) {
      setError('Network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-[-25%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-50 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-20%] w-[60%] h-[60%] rounded-full bg-teal-50 blur-[130px] pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-lg z-10 relative">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-primary" />

        {/* Brand Header */}
        <div className="text-center mb-6 flex flex-col items-center justify-center">
          <img src="/logo.png" alt="Saraban CRM Logo" className="h-14 w-auto object-contain mb-2.5" />
          <h2 className="font-display font-bold text-lg text-gray-900 tracking-tight">
            Security Configuration Required
          </h2>
          <p className="text-xs text-gray-500 tracking-wider font-semibold uppercase mt-0.5">
            Reset Default Password
          </p>
        </div>

        {/* Warning Banner */}
        {!success && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg mb-6 flex gap-2.5 items-start text-xs leading-normal">
            <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={15} />
            <div>
              <span className="font-bold block">First-Time Login Intercept</span>
              <span>
                To secure your account, you are required to change your seeded default password (`admin123`) before accessing CRM modules.
              </span>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3.5 rounded-lg mb-6 flex gap-2.5 items-start font-semibold animate-fade-in">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          /* Success Screen */
          <div className="text-center space-y-4 py-4 animate-fade-in text-xs">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 mb-2">
              <ShieldCheck size={24} />
            </div>
            <h3 className="font-display font-semibold text-base">Password Updated</h3>
            <p className="text-gray-500">
              Your credentials have been updated securely. Redirecting to workspace...
            </p>
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mt-2" />
          </div>
        ) : (
          /* Reset Password Form */
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Current Password
              </label>
              <div className="relative flex items-center bg-white border border-gray-200 rounded-lg focus-within:border-primary/50 transition-colors">
                <Lock className="absolute left-3 text-gray-500" size={16} />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="Enter current password"
                  className="w-full bg-transparent py-2.5 pl-10 pr-10 text-sm outline-none text-gray-900 placeholder-gray-400 font-mono"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                New Password (Min 8 Characters)
              </label>
              <div className="relative flex items-center bg-white border border-gray-200 rounded-lg focus-within:border-primary/50 transition-colors">
                <Lock className="absolute left-3 text-gray-500" size={16} />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="Create strong password"
                  className="w-full bg-transparent py-2.5 pl-10 pr-10 text-sm outline-none text-gray-900 placeholder-gray-400 font-mono"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Confirm New Password
              </label>
              <div className="relative flex items-center bg-white border border-gray-200 rounded-lg focus-within:border-primary/50 transition-colors">
                <Lock className="absolute left-3 text-gray-500" size={16} />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="Retype new password"
                  className="w-full bg-transparent py-2.5 pl-10 pr-10 text-sm outline-none text-gray-900 placeholder-gray-400 font-mono"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:opacity-90 active:scale-[0.98] transition-all py-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-sm mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Secure My Account
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
