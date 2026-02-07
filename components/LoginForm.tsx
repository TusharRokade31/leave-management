"use client";
import React, { useState, useEffect } from 'react';
import { User, Lock, KeyRound, Eye, EyeOff, Sun, Moon, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { LoginFormData, OTPFormData } from '@/type/form';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onOTPLogin?: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onOTPLogin }) => {
  const [loginMode, setLoginMode] = useState<'password' | 'otp' | 'forgot'>('password');
  const [loginForm, setLoginForm] = useState<LoginFormData>({ email: '', password: '' });
  const [otpForm, setOtpForm] = useState<OTPFormData>({ email: '', otp: '' });
  
  // Password Reset States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState({ login: false, new: false, confirm: false });
  
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDarkMode;
    setIsDarkMode(newDark);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
  };

  const handlePasswordLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await onLogin(loginForm.email, loginForm.password);
      if (!result.success) setError(result.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpForm.email }),
      });
      if (response.ok) {
        setOtpSent(true);
        setSuccess('OTP sent to your email!');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpForm.email, otp: otpForm.otp, newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Password reset successful! Redirecting...');
        setTimeout(() => switchMode('password'), 2000);
      } else {
        setError(data.error || 'Reset failed');
      }
    } catch (err) {
      setError('Server error');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (mode: 'password' | 'otp' | 'forgot') => {
    setLoginMode(mode);
    setError('');
    setSuccess('');
    setOtpSent(false);
    setNewPassword('');
    setConfirmPassword('');
    setOtpForm({ email: '', otp: '' });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors">
      <div className="absolute top-6 right-6">
        <button onClick={toggleTheme} className="p-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-sm text-gray-700 dark:text-slate-300">
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 w-full max-w-md border dark:border-slate-800">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4">
            <User className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold dark:text-white">
            {loginMode === 'forgot' ? 'Reset Security' : 'Leave Management'}
          </h1>
        </div>

        {loginMode !== 'forgot' ? (
          <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
            <button onClick={() => switchMode('password')} className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${loginMode === 'password' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500'}`}>
              <Lock className="w-4 h-4 inline mr-2" /> Password
            </button>
            <button onClick={() => switchMode('otp')} className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${loginMode === 'otp' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500'}`}>
              <KeyRound className="w-4 h-4 inline mr-2" /> OTP
            </button>
          </div>
        ) : (
          <button onClick={() => switchMode('password')} className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 mb-6 hover:opacity-80">
            <ArrowLeft size={16} className="mr-1" /> Back to Login
          </button>
        )}

        {loginMode === 'password' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium dark:text-slate-300 mb-1">Email</label>
              <input type="email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} className="w-full px-4 py-2 border dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="user@company.com" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium dark:text-slate-300">Password</label>
                <button onClick={() => switchMode('forgot')} className="text-xs text-indigo-600 hover:underline">Forgot Password?</button>
              </div>
              <div className="relative">
                <input type={showPass.login ? "text" : "password"} value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} className="w-full px-4 py-2 border dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass({...showPass, login: !showPass.login})} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass.login ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button onClick={handlePasswordLogin} disabled={isLoading} className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50">
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        )}

        {(loginMode === 'otp' || loginMode === 'forgot') && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium dark:text-slate-300 mb-1">Email</label>
              <input type="email" value={otpForm.email} onChange={(e) => setOtpForm({ ...otpForm, email: e.target.value })} disabled={otpSent} className="w-full px-4 py-2 border dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg outline-none disabled:bg-slate-50 dark:disabled:bg-slate-900" placeholder="user@company.com" />
            </div>

            {!otpSent ? (
              <button onClick={handleSendOTP} disabled={isLoading || !otpForm.email} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium">
                {isLoading ? 'Sending...' : 'Send OTP'}
              </button>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium dark:text-slate-300 mb-1">Verification Code</label>
                  <input type="text" value={otpForm.otp} onChange={(e) => setOtpForm({ ...otpForm, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })} className="w-full px-4 py-2 border dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-center text-xl tracking-widest outline-none" placeholder="000000" />
                </div>

                {loginMode === 'forgot' && (
                  <div className="space-y-4 pt-2 border-t dark:border-slate-800">
                    <div>
                      <label className="block text-sm font-medium dark:text-slate-300 mb-1">New Password</label>
                      <div className="relative">
                        <input type={showPass.new ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2 border dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg outline-none" placeholder="New password" />
                        <button type="button" onClick={() => setShowPass({...showPass, new: !showPass.new})} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {showPass.new ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium dark:text-slate-300 mb-1">Confirm Password</label>
                      <div className="relative">
                        <input type={showPass.confirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-2 border dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg outline-none" placeholder="Confirm password" />
                        <button type="button" onClick={() => setShowPass({...showPass, confirm: !showPass.confirm})} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {showPass.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <button onClick={loginMode === 'forgot' ? handleResetPassword : onOTPLogin?.bind(null, otpForm.email, otpForm.otp)} disabled={isLoading || otpForm.otp.length !== 6} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium">
                  {isLoading ? 'Verifying...' : loginMode === 'forgot' ? 'Update Password' : 'Login with OTP'}
                </button>
                <button onClick={() => setOtpSent(false)} className="w-full text-sm text-gray-500 hover:text-indigo-600">Resend OTP</button>
              </>
            )}
          </div>
        )}

        {error && <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg">{error}</div>}
        {success && <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 text-green-600 dark:text-green-400 text-sm rounded-lg flex items-center"><CheckCircle2 size={16} className="mr-2" /> {success}</div>}
      </div>
    </div>
  );
};