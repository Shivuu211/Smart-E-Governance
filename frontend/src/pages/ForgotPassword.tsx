import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Mail, 
  Lock, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  RotateCw, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  Sparkles, 
  Clock, 
  Sun, 
  Moon, 
  HelpCircle,
  Inbox
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import PanchayathLogo from '../components/PanchayathLogo';
import LoginBackground from '../components/LoginBackground';
import { getPasswordRequirements, SPECIAL_CHAR_REGEX, NUMERICAL_REGEX } from '../utils/passwordValidation';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
  onBackToHome?: () => void;
}

type RecoveryStep = 'email' | 'otp' | 'new-password' | 'success';

export default function ForgotPassword({ onBackToLogin, onBackToHome }: ForgotPasswordProps) {
  const { theme, toggleTheme } = useTheme();

  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Cooldown timer (in seconds) for Resend OTP
  const [cooldown, setCooldown] = useState(0);
  // OTP expiration timer (300 seconds = 5 minutes)
  const [otpExpiresIn, setOtpExpiresIn] = useState(300);

  // Dev fallback support: allow inspecting simulated e-Gov mailbox in preview
  const [isDevFallback, setIsDevFallback] = useState(false);
  const [simulatedEmails, setSimulatedEmails] = useState<any[]>([]);
  const [showDevMailbox, setShowDevMailbox] = useState(false);

  // Focus first OTP input on transition to 'otp' step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Handle cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle OTP 5-minute expiry countdown
  useEffect(() => {
    if (step !== 'otp' || otpExpiresIn <= 0) return;
    const timer = setInterval(() => {
      setOtpExpiresIn((prev) => {
        if (prev <= 1) {
          setError('Verification code has expired. Please request a new code.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, otpExpiresIn]);

  // Fetch simulated emails for dev inspection if in fallback mode
  const fetchDevMailbox = async (targetEmail?: string) => {
    try {
      const data = await api.getDevSimulatedMailbox(targetEmail || email);
      if (data?.emails) {
        setSimulatedEmails(data.emails);
      }
    } catch {
      // ignore
    }
  };

  // Step 1: Send OTP to Email
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email format (e.g. user@example.com).');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await api.requestPasswordResetOtp(cleanEmail);
      setIsDevFallback(Boolean(res.devFallback));
      setCooldown(res.cooldownSeconds || 60);
      setOtpExpiresIn(300); // 5 minutes
      setOtpDigits(['', '', '', '', '', '']);
      setStep('otp');
      setSuccessMsg(res.message || 'Verification code dispatched to your email.');

      if (res.devFallback) {
        fetchDevMailbox(cleanEmail);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.requestPasswordResetOtp(email.trim().toLowerCase());
      setCooldown(res.cooldownSeconds || 60);
      setOtpExpiresIn(300);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg('A fresh verification code has been dispatched.');
      if (isDevFallback) {
        fetchDevMailbox(email.trim().toLowerCase());
      }
    } catch (err: any) {
      setError(err.message || 'Unable to resend verification code. Please wait and retry.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit input changes
  const handleOtpChange = (index: number, value: string) => {
    // If pasted full 6-digit code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...otpDigits];
      digits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(digits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    const cleanChar = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = cleanChar;
    setOtpDigits(newDigits);

    if (cleanChar && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('').trim();

    if (fullOtp.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await api.verifyPasswordResetOtp(email.trim().toLowerCase(), fullOtp);
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setStep('new-password');
        setSuccessMsg('Code verified successfully! Now create your new secure password.');
      } else {
        throw new Error('Verification session could not be established.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Password Requirements Evaluation
  const pwdReqs = getPasswordRequirements(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Step 3: Create & Submit New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }

    if (!pwdReqs.isValid) {
      setError('Password must be at least 6 characters and include at least 1 number and 1 special character.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.resetPasswordWithToken({
        email: email.trim().toLowerCase(),
        resetToken,
        newPassword,
        confirmPassword,
      });

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please restart the recovery flow.');
    } finally {
      setLoading(false);
    }
  };

  // Format expiry time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#0B1120] p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <LoginBackground />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200/90 dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-2xl shadow-slate-900/10 dark:shadow-black/60 backdrop-blur-xs transition-colors duration-300">
        
        {/* Header Ribbon */}
        <div className="relative bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 p-6 text-white sm:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PanchayathLogo size="lg" />
              <div>
                <span className="font-display text-base font-bold tracking-tight">Namma Panchayath</span>
                <p className="text-[10px] uppercase tracking-widest text-emerald-300">Password Recovery</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-slate-100" />}
              </button>
            </div>
          </div>

          {/* Stepper Progress Bar (Only when not success) */}
          {step !== 'success' && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold">
                <div className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition-colors ${
                  step === 'email' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'text-slate-300'
                }`}>
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white">1</span>
                  <span>Email</span>
                </div>
                <div className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition-colors ${
                  step === 'otp' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'text-slate-300'
                }`}>
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white">2</span>
                  <span>Verify OTP</span>
                </div>
                <div className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition-colors ${
                  step === 'new-password' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'text-slate-300'
                }`}>
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white">3</span>
                  <span>New Password</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8">

          {/* Error Banner */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-rose-800 dark:text-rose-200 shadow-sm animate-shake">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="text-xs leading-relaxed font-medium">{error}</div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 1: ENTER REGISTERED EMAIL */}
          {/* ==================================================== */}
          {step === 'email' && (
            <div>
              <div className="mb-6">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">
                  Recover Your Account Access
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Enter your registered Panchayath email address below. We will dispatch a secure 6-digit one-time verification code (OTP) valid for 5 minutes.
                </p>
              </div>

              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Registered Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative mt-1.5 flex items-center">
                    <Mail className="absolute left-3.5 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="e.g. ramesh@gmail.com or officer@gram.gov.in"
                      className="h-11 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] pl-10 pr-4 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 transition-all"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                  <Shield className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <span>
                    Supported for all account types: <strong>Citizen</strong>, <strong>Officer</strong>, and <strong>Administrator</strong>.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-600 font-display text-xs font-bold text-white shadow-lg shadow-emerald-700/20 hover:bg-emerald-700 dark:hover:bg-emerald-500 hover:shadow-[0_0_12px_rgba(16,185,129,0.35)] hover:scale-[1.01] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin" />
                      <span>Sending Verification Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send 6-Digit OTP Code</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 2: VERIFY 6-DIGIT OTP */}
          {/* ==================================================== */}
          {step === 'otp' && (
            <div>
              <div className="mb-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">
                    Verify One-Time Code
                  </h2>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <Clock className="h-3 w-3" />
                    {formatTime(otpExpiresIn)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Enter the 6-digit code sent to <strong className="text-slate-800 dark:text-slate-200">{email}</strong>.
                  This OTP expires in 5 minutes.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {/* 6-box segmented OTP inputs */}
                <div>
                  <label className="block text-center text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Enter 6-Digit Code
                  </label>
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="h-13 w-11 sm:h-14 sm:w-12 text-center font-mono text-xl font-bold text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20 focus:outline-none transition-all"
                      />
                    ))}
                  </div>
                </div>

                {/* Resend OTP button with cooldown */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#334155] pt-3 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setError('');
                    }}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline cursor-pointer"
                  >
                    Change Email
                  </button>

                  <button
                    type="button"
                    disabled={cooldown > 0 || loading}
                    onClick={handleResendOtp}
                    className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Verification Code'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length !== 6}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-600 font-display text-xs font-bold text-white shadow-lg shadow-emerald-700/20 hover:bg-emerald-700 dark:hover:bg-emerald-500 hover:shadow-[0_0_12px_rgba(16,185,129,0.35)] hover:scale-[1.01] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Code & Continue</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Dev Mailbox Fallback Viewer */}
              {isDevFallback && (
                <div className="mt-6 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
                      <Inbox className="h-4 w-4 text-emerald-600" />
                      <span>Simulated e-Gov Mailbox (Development Sandbox)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDevMailbox(!showDevMailbox);
                        fetchDevMailbox();
                      }}
                      className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      {showDevMailbox ? 'Hide Inbox' : 'View Dispatched Email'}
                    </button>
                  </div>

                  {showDevMailbox && (
                    <div className="mt-3 space-y-2 border-t border-emerald-200/60 dark:border-emerald-800/40 pt-3">
                      {simulatedEmails.length === 0 ? (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">No simulated emails found yet.</p>
                      ) : (
                        simulatedEmails.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-3 text-slate-700 dark:text-slate-200 shadow-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{item.subject}</span>
                              <span className="text-[10px] text-slate-400">{new Date(item.sentAt).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">To: {item.to}</p>
                            {item.devVerificationCode && (
                              <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-100/70 dark:bg-emerald-900/40 px-2.5 py-1.5">
                                <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                                  Dispatched OTP Code: <strong className="font-mono text-sm tracking-wider">{item.devVerificationCode}</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const code = String(item.devVerificationCode).split('');
                                    setOtpDigits(code);
                                  }}
                                  className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
                                >
                                  Autofill Code
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 3: CREATE NEW PASSWORD */}
          {/* ==================================================== */}
          {step === 'new-password' && (
            <div>
              <div className="mb-5">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">
                  Create New Secure Password
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Verification successful. Please enter and confirm your new account password below.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative mt-1.5 flex items-center">
                    <Lock className="absolute left-3.5 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="••••••••"
                      className="h-11 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] pl-10 pr-10 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative mt-1.5 flex items-center">
                    <Lock className="absolute left-3.5 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="••••••••"
                      className="h-11 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] pl-10 pr-10 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Visual Password Requirements Checklist */}
                <div className="rounded-2xl border border-slate-100 dark:border-[#334155] bg-slate-50 dark:bg-[#243044]/60 p-3.5 space-y-1.5 text-[11px]">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Password Requirements:</p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    <div className={`flex items-center gap-1.5 ${pwdReqs.hasMinLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {pwdReqs.hasMinLength ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-400 ml-1 mr-1" />}
                      <span>At least 6 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${pwdReqs.hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {pwdReqs.hasNumber ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-400 ml-1 mr-1" />}
                      <span>At least one number (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${pwdReqs.hasSpecialChar ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {pwdReqs.hasSpecialChar ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-400 ml-1 mr-1" />}
                      <span>At least one special symbol (!@#$...)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {passwordsMatch ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-400 ml-1 mr-1" />}
                      <span>Passwords match</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !pwdReqs.isValid || !passwordsMatch}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-600 font-display text-xs font-bold text-white shadow-lg shadow-emerald-700/20 hover:bg-emerald-700 dark:hover:bg-emerald-500 hover:shadow-[0_0_12px_rgba(16,185,129,0.35)] hover:scale-[1.01] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin" />
                      <span>Updating Password Securely...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      <span>Reset Password</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ==================================================== */}
          {/* SUCCESS SCREEN */}
          {/* ==================================================== */}
          {step === 'success' && (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/60 shadow-lg shadow-emerald-500/20 animate-scale-up">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <h2 className="mt-5 font-display text-xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                Password Reset Successful
              </h2>

              <p className="mx-auto mt-2 max-w-md text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Your password has been updated and securely encrypted in the Namma Panchayath portal. All previous recovery tokens have been invalidated.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 font-display text-xs font-bold text-white shadow-lg shadow-emerald-700/25 hover:bg-emerald-700 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:scale-105 transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Login</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer Back to Login link (when not on success screen) */}
          {step !== 'success' && (
            <div className="mt-6 border-t border-slate-100 dark:border-[#334155] pt-5 text-center">
              <button
                type="button"
                onClick={onBackToLogin}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Login</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
