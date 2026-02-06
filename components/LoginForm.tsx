"use client";
import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, KeyRound, Eye, EyeOff, Sun, Moon } from 'lucide-react'; // Added Sun/Moon
import { LoginFormData, OTPFormData } from '@/type/form';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onOTPLogin?: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onOTPLogin }) => {
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [loginForm, setLoginForm] = useState<LoginFormData>({ email: '', password: '' });
  const [otpForm, setOtpForm] = useState<OTPFormData>({ email: '', otp: '' });
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Sync theme with system and localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const handlePasswordLogin = async (): Promise<void> => {
    setError('');
    setIsLoading(true);
    try {
      const result = await onLogin(loginForm.email, loginForm.password);
      if (!result.success) {
        setError(result.error || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async (): Promise<void> => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpForm.email }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        setSuccess('OTP sent to your email! Please check your inbox.');
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (): Promise<void> => {
    if (!onOTPLogin) return;
    
    setError('');
    setIsLoading(true);
    try {
      const result = await onOTPLogin(otpForm.email, otpForm.otp);
      if (!result.success) {
        setError(result.error || 'Invalid OTP');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (mode: 'password' | 'otp'): void => {
    setLoginMode(mode);
    setError('');
    setSuccess('');
    setOtpSent(false);
    setLoginForm({ email: '', password: '' });
    setOtpForm({ email: '', otp: '' });
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
      
      {/* Theme Toggle Button */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          className="p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 w-full max-w-md transition-colors duration-300">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4">
            <User className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Leave Management</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">Sign in to continue</p>
        </div>

        {/* Toggle Buttons */}
        <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => switchMode('password')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              loginMode === 'password'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4 inline mr-2" />
            Password
          </button>
          <button
            onClick={() => switchMode('otp')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              loginMode === 'otp'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4 inline mr-2" />
            OTP
          </button>
        </div>

        {/* Password Login Form */}
        {loginMode === 'password' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-900 outline-none"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-900 outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">{error}</div>
            )}
            <button
              onClick={handlePasswordLogin}
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-indigo-400"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        )}

        {/* OTP Login Form */}
        {loginMode === 'otp' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={otpForm.email}
                onChange={(e) => setOtpForm({ ...otpForm, email: e.target.value })}
                disabled={isLoading || otpSent}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-900 outline-none"
                placeholder="your@email.com"
              />
            </div>

            {!otpSent ? (
              <button
                onClick={handleSendOTP}
                disabled={isLoading || !otpForm.email}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-indigo-400"
              >
                {isLoading ? 'Sending...' : 'Send OTP'}
              </button>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Enter OTP</label>
                  <input
                    type="text"
                    value={otpForm.otp}
                    onChange={(e) => setOtpForm({ ...otpForm, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-900 text-center text-2xl tracking-widest outline-none"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
                <button
                  onClick={handleVerifyOTP}
                  disabled={isLoading || otpForm.otp.length !== 6}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-indigo-400"
                >
                  {isLoading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button
                  onClick={() => setOtpSent(false)}
                  className="w-full text-indigo-600 dark:text-indigo-400 py-2 text-sm hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  Resend OTP
                </button>
              </>
            )}

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">{error}</div>
            )}
            {success && (
              <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-900/30">{success}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};