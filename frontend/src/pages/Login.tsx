import React, { useState } from 'react';
import { Shield, Mail, Lock, LogIn, ArrowRight, Bot, Compass, HeartHandshake, Eye, EyeOff, Sun, Moon, AlertCircle, RotateCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Panchayath3DAnimation from '../components/Panchayath3DAnimation';
import PanchayathLogo from '../components/PanchayathLogo';
import LoginBackground from '../components/LoginBackground';

interface LoginProps {
  onRegisterClick: () => void;
  onBackToHome?: () => void;
  onForgotPasswordClick?: () => void;
}

export default function Login({ onRegisterClick, onBackToHome, onForgotPasswordClick }: LoginProps) {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address (e.g., citizen@example.com).');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login({ email: cleanEmail, password });
      setError('');
    } catch (err: any) {
      // Requirement 7: Clear the password field after an unsuccessful login attempt
      // Requirement 6: Keep entered email intact in the email field
      setPassword('');

      // Requirement 16: Handle network/server connectivity errors separately
      if (
        err?.isNetworkError ||
        err?.status >= 500 ||
        err?.message?.includes('Unable to connect') ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError')
      ) {
        setError('Unable to connect to the server. Please try again.');
      } else {
        setError(err?.message || 'Incorrect email or password. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#0B1120] p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      {/* Background with e-Governance & Panchayath Themes */}
      <LoginBackground />

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/90 dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-2xl shadow-slate-900/10 dark:shadow-black/60 lg:grid-cols-12 backdrop-blur-xs transition-colors duration-300">
        
        {/* Left column - Branding & Details */}
        <div className="relative flex flex-col justify-between bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 dark:from-emerald-900 dark:via-[#0F2F35] dark:to-[#0B1120] p-8 text-white lg:col-span-5 lg:p-12">
          {/* Top Logo */}
          <div className="flex items-center gap-3">
            <PanchayathLogo size="xl" />
            <div>
              <span className="font-display text-lg font-bold tracking-tight">Namma Panchayath</span>
              <p className="text-[10px] uppercase tracking-widest text-slate-300">Panchayath Portal</p>
            </div>
          </div>

          <div className="my-6">
            <Panchayath3DAnimation />
          </div>

          {/* Localized stats summary */}
          <div className="flex flex-col gap-4 border-t border-white/10 pt-8">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <Compass className="h-4.5 w-4.5" />
              </div>
              <p className="text-[11px] font-medium text-slate-200">
                Citizens are connected to their respective Panchayath Officer and local services.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
                <Bot className="h-4.5 w-4.5" />
              </div>
              <p className="text-[11px] font-medium text-slate-200">
                AI Mitra Assistant for swift grievance categorization and plan design.
              </p>
            </div>
          </div>
        </div>

        {/* Right column - Login Form */}
        <div className="flex flex-col justify-center p-8 lg:col-span-7 lg:p-12 bg-white dark:bg-[#1E293B] transition-colors duration-300">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-display text-2xl font-bold text-slate-800 dark:text-[#F8FAFC]">Welcome Back</h3>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Sign in to access your dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="group relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#243044] text-slate-600 dark:text-amber-400 transition-all duration-200 hover:scale-105 hover:border-amber-300 hover:bg-amber-50/80 hover:text-amber-600 hover:shadow-[0_0_12px_rgba(251,191,36,0.35)] active:scale-95 dark:hover:border-amber-500/60 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 dark:hover:shadow-[0_0_16px_rgba(251,191,36,0.45)] cursor-pointer"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400 transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-600 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110 group-hover:text-amber-600 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                )}
              </button>
              {onBackToHome && (
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-[#334155] cursor-pointer"
                >
                  ← Public Home
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {/* Email field */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</label>
              <div className="relative mt-1.5 flex items-center">
                <Mail className={`absolute left-3 h-4.5 w-4.5 ${error ? 'text-rose-500' : 'text-slate-400'}`} />
                <input
                  type="email"
                  disabled={loading}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter your email address"
                  className={`h-11 w-full rounded-xl border ${
                    error
                      ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/25 dark:bg-rose-950/25 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] focus:border-blue-500 dark:focus:border-emerald-400 focus:ring-blue-500/10 dark:focus:ring-emerald-500/20'
                  } pl-10 pr-4 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 transition-shadow focus:outline-none focus:ring-4 disabled:opacity-60`}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Password</label>
              </div>
              <div className="relative mt-1.5 flex items-center">
                <Lock className={`absolute left-3 h-4.5 w-4.5 ${error ? 'text-rose-500' : 'text-slate-400'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  disabled={loading}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="••••••••"
                  className={`h-11 w-full rounded-xl border ${
                    error
                      ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/25 dark:bg-rose-950/25 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] focus:border-blue-500 dark:focus:border-emerald-400 focus:ring-blue-500/10 dark:focus:ring-emerald-500/20'
                  } pl-10 pr-10 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 transition-shadow focus:outline-none focus:ring-4 disabled:opacity-60`}
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer disabled:opacity-50"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>

              {/* Clearly visible Forgot Password link below the password field */}
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={onForgotPasswordClick}
                  className="text-xs font-semibold text-blue-600 dark:text-emerald-400 hover:text-blue-700 dark:hover:text-emerald-300 hover:underline cursor-pointer transition-colors disabled:opacity-50"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            {/* Error message directly below password field / credentials */}
            {error && (
              <div
                id="login-error-alert"
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-2.5 rounded-xl border border-rose-200 dark:border-rose-900/80 bg-rose-50 dark:bg-rose-950/60 p-3 text-xs font-medium text-rose-800 dark:text-rose-200 shadow-xs animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div className="flex-1 leading-relaxed font-semibold">
                  {error}
                </div>
              </div>
            )}

            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 dark:bg-emerald-600 font-display text-xs font-bold text-white shadow-lg shadow-blue-600/20 dark:shadow-emerald-900/40 hover:bg-blue-700 dark:hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-[0_0_12px_rgba(37,99,235,0.35)] dark:hover:shadow-[0_0_12px_rgba(16,185,129,0.35)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Access My Dashboard</span>
                  <LogIn className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Message */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500 dark:text-slate-400">
            <span>🔒</span>
            <span>Your information is securely handled within the Namma Panchayath portal.</span>
          </div>

          {/* Toggle Register */}
          <div className="mt-6 flex items-center justify-center gap-1 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Need a citizen account?</span>
            <button onClick={onRegisterClick} className="font-semibold text-blue-600 dark:text-emerald-400 hover:underline cursor-pointer">
              Create an account
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
