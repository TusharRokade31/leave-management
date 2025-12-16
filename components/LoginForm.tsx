import React, { useState } from 'react';
import { User, Mail, Lock, KeyRound } from 'lucide-react';
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
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-indigo-100 rounded-full mb-4">
            <User className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Leave Management</h1>
          <p className="text-gray-600 mt-2">Sign in to continue</p>
        </div>

        {/* Toggle Buttons */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => switchMode('password')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              loginMode === 'password'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Lock className="w-4 h-4 inline mr-2" />
            Password
          </button>
          <button
            onClick={() => switchMode('otp')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              loginMode === 'otp'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={otpForm.email}
                onChange={(e) => setOtpForm({ ...otpForm, email: e.target.value })}
                disabled={isLoading || otpSent}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
                  <input
                    type="text"
                    value={otpForm.otp}
                    onChange={(e) => setOtpForm({ ...otpForm, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                    disabled={isLoading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 text-center text-2xl tracking-widest"
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
                  className="w-full text-indigo-600 py-2 text-sm hover:text-indigo-700"
                >
                  Resend OTP
                </button>
              </>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
            )}
            {success && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">{success}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};