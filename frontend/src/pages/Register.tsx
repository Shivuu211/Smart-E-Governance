import React, { useState } from 'react';
import { Shield, User, Mail, Phone, MapPin, Lock, UserPlus, ArrowLeft, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Panchayath3DAnimation from '../components/Panchayath3DAnimation';
import PanchayathLogo from '../components/PanchayathLogo';
import LoginBackground from '../components/LoginBackground';
import { validatePhoneNumber, sanitizePhoneInput } from '../utils/phoneValidation';
import { validatePassword, getPasswordRequirements } from '../utils/passwordValidation';
import { validateName, sanitizeNameInput, MAX_NAME_LENGTH } from '../utils/nameValidation';
import { Check, X } from 'lucide-react';

interface RegisterProps {
  onLoginClick: () => void;
  onBackToHome?: () => void;
}

export default function Register({ onLoginClick, onBackToHome }: RegisterProps) {
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [state] = useState('Karnataka');
  const [district] = useState('Bengaluru');
  const [zone, setZone] = useState('Bengaluru South');
  const [taluk, setTaluk] = useState('Bengaluru South');
  const [gramPanchayat, setGramPanchayat] = useState('');
  const [ward, setWard] = useState('');

  const handleZoneChange = (newZone: string) => {
    setZone(newZone);
    setTaluk(newZone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !phone || !address || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const phoneValidation = validatePhoneNumber(phone, true);
    if (!phoneValidation.isValid) {
      setError(phoneValidation.error || 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const nameValidation = validateName(name, true, MAX_NAME_LENGTH);
    if (!nameValidation.isValid) {
      setError(nameValidation.error || 'Full Name must contain only letters and cannot exceed 20 characters.');
      return;
    }

    const pwdValidation = validatePassword(password, 6, true);
    if (!pwdValidation.isValid) {
      setError(pwdValidation.error || 'Password must contain at least one numerical digit and one special character.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await register({
        name,
        email,
        phone: phoneValidation.cleaned,
        address,
        password,
        role: 'citizen',
        state,
        district,
        taluk,
        gramPanchayat,
        ward,
        zone,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Email might already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#0B1120] p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <LoginBackground />
      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/90 dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-2xl shadow-slate-900/10 dark:shadow-black/60 lg:grid-cols-12 backdrop-blur-xs transition-colors duration-300">
        
        {/* Left Column - Branding */}
        <div className="relative flex flex-col justify-between bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 dark:from-emerald-900 dark:via-[#0F2F35] dark:to-[#0B1120] p-8 text-white lg:col-span-5 lg:p-12">
          <div className="flex items-center gap-3">
            <PanchayathLogo size="xl" />
            <div>
              <span className="font-display text-lg font-bold tracking-tight">Namma Panchayath</span>
              <p className="text-[10px] uppercase tracking-widest text-slate-300">Panchayath Portal</p>
            </div>
          </div>

          <div className="my-4">
            <h2 className="font-display text-xl font-bold leading-tight tracking-tight sm:text-2xl">
              Become a Digitally Verified Citizen.
            </h2>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
              Register to access state schemes, track local grievances, pay public utility bills, and download validated PDF certificates.
            </p>
          </div>

          <div className="my-4 flex justify-center">
            <Panchayath3DAnimation />
          </div>

          <div className="border-t border-white/10 pt-8">
            <button
              onClick={onLoginClick}
              className="flex items-center gap-2 text-xs font-semibold text-blue-300 dark:text-emerald-300 transition-colors hover:text-white cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Already registered? Sign In
            </button>
          </div>
        </div>

        {/* Right Column - Register Form */}
        <div className="flex flex-col justify-center p-8 lg:col-span-7 lg:p-12 bg-white dark:bg-[#1E293B] transition-colors duration-300">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-display text-2xl font-bold text-slate-800 dark:text-[#F8FAFC]">Citizen Registration</h3>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Provide details to register in the Gram e-service ledger</p>
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

          {error && (
            <div className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/10 dark:ring-rose-500/30">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Name */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name *</label>
                {name.length === 20 && (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 animate-fade-in">
                    20/20 max letters reached
                  </span>
                )}
              </div>
              <div className="relative mt-1.5 flex items-center">
                <User className="absolute left-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={name}
                  onKeyDown={(e) => {
                    if (e.key.length === 1 && !/[a-zA-Z\s]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => setName(sanitizeNameInput(e.target.value))}
                  placeholder="e.g. Ramesh Patel"
                  pattern="[A-Za-z\s]+"
                  title="Full Name must contain only letters and spaces"
                  className="h-11 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] pl-10 pr-4 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</label>
              <div className="relative mt-1.5 flex items-center">
                <Mail className="absolute left-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@gmail.com"
                  className="h-11 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] pl-10 pr-4 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number *</label>
              <div className="relative mt-1.5 flex items-center">
                <div className="absolute left-3 flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs font-bold border-r border-slate-200 dark:border-[#334155] pr-2 pointer-events-none">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                  placeholder=""
                  className={`h-11 w-full rounded-xl border pl-16 pr-4 text-xs font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 transition-colors ${
                    phone.length > 0 && !validatePhoneNumber(phone).isValid
                      ? 'border-amber-400 bg-amber-50/20 dark:bg-amber-950/20 text-slate-800 dark:text-[#F8FAFC] focus:border-amber-500 focus:ring-amber-500/10'
                      : 'border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 dark:focus:border-emerald-400 focus:ring-blue-500/10 dark:focus:ring-emerald-500/20'
                  }`}
                />
              </div>
              {phone.length > 0 && !validatePhoneNumber(phone).isValid && (
                <p className="mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  {validatePhoneNumber(phone).error}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Residential Address</label>
              <div className="relative mt-1.5 flex items-center">
                <MapPin className="absolute left-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House No., Street Name, Landmark"
                  className="h-11 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] pl-10 pr-4 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Jurisdiction Hierarchy Section */}
            <div className="rounded-2xl border border-blue-100 dark:border-[#334155] bg-blue-50/50 dark:bg-[#243044]/60 p-3.5 sm:col-span-2">
              <p className="text-[11px] font-bold text-blue-900 dark:text-emerald-300">Jurisdiction Hierarchy & Zone Selection</p>
              <p className="mt-0.5 text-[10px] text-blue-700 dark:text-slate-300">Determines your designated Gram Panchayat officer for automatic complaint and service routing.</p>
              
              <div className="mt-3 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                {/* State */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">State</label>
                  <input
                    type="text"
                    value={state}
                    readOnly
                    tabIndex={-1}
                    className="mt-1 h-9 w-full cursor-not-allowed rounded-lg border border-slate-200 dark:border-[#334155] bg-slate-100/90 dark:bg-[#1E293B] px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 select-none focus:outline-none"
                  />
                </div>

                {/* District */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">District</label>
                  <input
                    type="text"
                    value={district}
                    readOnly
                    tabIndex={-1}
                    className="mt-1 h-9 w-full cursor-not-allowed rounded-lg border border-slate-200 dark:border-[#334155] bg-slate-100/90 dark:bg-[#1E293B] px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 select-none focus:outline-none"
                  />
                </div>

                {/* Bengaluru Zone Selection */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Bengaluru Zone *</label>
                  <select
                    value={zone}
                    onChange={(e) => handleZoneChange(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-blue-500 dark:focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-slate-400/10 transition-colors"
                  >
                    <option value="Bengaluru South" className="bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-200">Bengaluru South</option>
                    <option value="Bengaluru North" className="bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-200">Bengaluru North</option>
                    <option value="Bengaluru East" className="bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-200">Bengaluru East</option>
                    <option value="Bengaluru West" className="bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-200">Bengaluru West</option>
                  </select>
                </div>

                {/* Gram Panchayat */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Gram Panchayat</label>
                  <input
                    type="text"
                    value={gramPanchayat}
                    onChange={(e) => setGramPanchayat(e.target.value)}
                    placeholder="e.g. Gram Panchayat name"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] px-2.5 text-xs text-slate-700 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                {/* Ward */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Ward No.</label>
                  <input
                    type="text"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    placeholder="e.g. Ward 12"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] px-2.5 text-xs text-slate-700 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Password</label>
              <div className="relative mt-1.5 flex items-center">
                <Lock className="absolute left-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] pl-10 pr-10 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>

              {/* Live Password Strength Requirements */}
              {password.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition-colors ${
                    password.length >= 6 ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40' : 'bg-slate-100 dark:bg-[#243044] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#334155]'
                  }`}>
                    {password.length >= 6 ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <X className="h-3 w-3 text-slate-400" />}
                    6+ Characters
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition-colors ${
                    /\d/.test(password) ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40' : 'bg-slate-100 dark:bg-[#243044] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#334155]'
                  }`}>
                    {/\d/.test(password) ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <X className="h-3 w-3 text-slate-400" />}
                    1+ Number (0-9)
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition-colors ${
                    /[^A-Za-z0-9]/.test(password) ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40' : 'bg-slate-100 dark:bg-[#243044] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#334155]'
                  }`}>
                    {/[^A-Za-z0-9]/.test(password) ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <X className="h-3 w-3 text-slate-400" />}
                    1+ Special Char (!@#$)
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Confirm Password</label>
              <div className="relative mt-1.5 flex items-center">
                <Lock className="absolute left-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] pl-10 pr-10 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Register button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 dark:bg-emerald-600 font-display text-xs font-bold text-white shadow-lg shadow-blue-600/20 dark:shadow-emerald-900/40 hover:bg-blue-700 dark:hover:bg-emerald-700 disabled:opacity-50 sm:col-span-2 cursor-pointer"
            >
              {loading ? 'Creating Account...' : 'Complete Register & Sign In'}
              <UserPlus className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-1 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Already registered?</span>
            <button onClick={onLoginClick} className="font-semibold text-blue-600 dark:text-emerald-400 hover:underline cursor-pointer">
              Sign In
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
