import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, Lock, Save, Shield, Key, ArrowLeft,
  Users, Phone, Mail, MapPin, ChevronRight, X, ShieldCheck,
  Copy, Check, Building2, Eye, EyeOff, Briefcase, Award,
  CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Employee } from '../types';
import { detectZoneFromCoordsAndAddress, getZoneOfficerTagline, getZoneOfficerDesignation } from '../utils/zoneUtils';
import { validatePhoneNumber, sanitizePhoneInput } from '../utils/phoneValidation';
import { validatePassword } from '../utils/passwordValidation';
import { validateName, sanitizeNameInput, MAX_NAME_LENGTH } from '../utils/nameValidation';

interface ProfilePageProps {
  onNavigate?: (tab: string) => void;
}

export default function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, refreshUser } = useAuth();

  // Profile form state details
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [age, setAge] = useState(user?.age !== undefined && user?.age !== null ? user.age.toString() : '');
  const [gender, setGender] = useState(user?.gender || 'Male');
  const [occupation, setOccupation] = useState(user?.occupation || '');
  const [income, setIncome] = useState(
    user?.income !== undefined && user?.income !== null 
      ? user.income.toString() 
      : (user?.familyIncome !== undefined && user?.familyIncome !== null ? user.familyIncome.toString() : '')
  );
  const [address, setAddress] = useState(user?.address || '');
  
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [freshLoading, setFreshLoading] = useState(false);

  // Officer Directory state for citizens
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [showOfficerPanel, setShowOfficerPanel] = useState(false);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Fetch the latest authenticated user profile from the database on mount to guarantee fresh data for this tab
  useEffect(() => {
    let isMounted = true;
    async function fetchFreshUser() {
      setFreshLoading(true);
      try {
        const freshUser = await api.getMe();
        if (isMounted && freshUser) {
          setName(freshUser.name || '');
          setEmail(freshUser.email || '');
          setPhone(freshUser.phone || '');
          setAge(freshUser.age !== undefined && freshUser.age !== null ? freshUser.age.toString() : '');
          setGender(freshUser.gender || 'Male');
          setOccupation(freshUser.occupation || '');
          setIncome(
            freshUser.income !== undefined && freshUser.income !== null 
              ? freshUser.income.toString() 
              : (freshUser.familyIncome !== undefined && freshUser.familyIncome !== null ? freshUser.familyIncome.toString() : '')
          );
          setAddress(freshUser.address || '');
        }
      } catch (err) {
        console.warn('Could not fetch fresh user details on mount:', err);
      } finally {
        if (isMounted) setFreshLoading(false);
      }
    }

    fetchFreshUser();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync state if user from context updates
  useEffect(() => {
    if (user) {
      setName(prev => prev || user.name || '');
      setEmail(prev => prev || user.email || '');
      setPhone(prev => prev || user.phone || '');
      setAge(prev => prev || (user.age !== undefined && user.age !== null ? user.age.toString() : ''));
      setGender(prev => prev || user.gender || 'Male');
      setOccupation(prev => prev || user.occupation || '');
      setIncome(prev => prev || (user.income !== undefined && user.income !== null ? user.income.toString() : ''));
      setAddress(prev => prev || user.address || '');
    }
  }, [user]);

  // Load employees for Officer Directory if user is citizen with real-time sync listener
  const fetchOfficersForDirectory = useCallback(() => {
    if (user?.role === 'citizen') {
      setLoadingEmployees(true);
      api.getEmployees()
        .then((data) => {
          if (Array.isArray(data)) {
            setEmployees(data);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch employees for officer directory:', err);
        })
        .finally(() => {
          setLoadingEmployees(false);
        });
    }
  }, [user]);

  useEffect(() => {
    fetchOfficersForDirectory();
    window.addEventListener('officers-synced', fetchOfficersForDirectory);
    return () => window.removeEventListener('officers-synced', fetchOfficersForDirectory);
  }, [fetchOfficersForDirectory]);

  // Close directory panel on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showOfficerPanel) {
        setShowOfficerPanel(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showOfficerPanel]);

  if (!user) return null;

  // Automatically identify registered zone
  const registeredZone = user.zone || user.assignedZone || detectZoneFromCoordsAndAddress(0, 0, user.address) || 'Bengaluru South';

  // Filter active officers strictly belonging to the citizen's registered zone
  const zoneOfficers = employees.filter((emp, index, self) => {
    if (emp.status && emp.status !== 'Active') return false;
    const empZone = emp.assignedZone || '';
    const normEmp = empZone.toLowerCase().trim();
    const normReg = registeredZone.toLowerCase().trim();
    const matchesZone = normEmp === normReg || normEmp.includes(normReg.replace('bengaluru', '').trim());
    if (!matchesZone) return false;
    return self.findIndex(o => (o.id && o.id === emp.id) || (o.name && o.name.toLowerCase() === emp.name?.toLowerCase())) === index;
  });

  const handleCopyPhone = (id: string, phoneNum: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phoneNum);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);

    const nameValidation = validateName(name, true, MAX_NAME_LENGTH);
    if (!nameValidation.isValid) {
      setProfileError(nameValidation.error || 'Full Name must contain only letters and cannot exceed 20 characters.');
      return;
    }

    if (!email || !email.trim() || !email.includes('@') || !email.includes('.')) {
      setProfileError('Please provide a valid email address.');
      return;
    }

    const phoneValidation = validatePhoneNumber(phone, true);
    if (!phoneValidation.isValid) {
      setProfileError(phoneValidation.error || 'Please provide a valid 10-digit Indian mobile number.');
      return;
    }

    setUpdatingProfile(true);
    try {
      await api.updateProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phoneValidation.cleaned,
        age: age ? Number(age) : undefined,
        gender,
        occupation: user.role === 'citizen' ? occupation : undefined,
        income: user.role === 'citizen' ? (income !== '' && !isNaN(Number(income)) && Number(income) > 0 ? Number(income) : null) : undefined,
        familyIncome: user.role === 'citizen' ? (income !== '' && !isNaN(Number(income)) && Number(income) > 0 ? Number(income) : null) : undefined,
        address: address.trim()
      });
      await refreshUser();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 5000);
    } catch (err: any) {
      setProfileError(err.message || 'Error updating profile details.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setPasswordError('Please fill in both current and new password fields.');
      return;
    }

    const pwdValidation = validatePassword(newPassword);
    if (!pwdValidation.isValid) {
      setPasswordError(pwdValidation.error || 'New password must contain at least 6 characters, one number, and one special character.');
      return;
    }

    setUpdatingPassword(true);
    setPasswordSuccess(false);
    setPasswordError('');
    try {
      await api.changePassword({ currentPassword: oldPassword, newPassword });
      setOldPassword('');
      setNewPassword('');
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Role display configuration
  const roleDisplay = {
    citizen: {
      title: 'Resident Citizen Profile',
      subtitle: 'Resident profile parameters, verified contact info, and welfare scheme demographic details',
      badge: 'Citizen Resident',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60',
      icon: User
    },
    officer: {
      title: 'Panchayat Officer Profile',
      subtitle: 'Authorized Panchayat Development Officer credentials, contact numbers, and jurisdiction assignment',
      badge: getZoneOfficerDesignation(user.assignedZone),
      badgeColor: 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700/60',
      icon: Briefcase
    },
    admin: {
      title: 'Sarpanch & Administrator Profile',
      subtitle: 'Gram Panchayath Chief Administrator profile, governance parameters, and supervisory controls',
      badge: 'Sarpanch Admin',
      badgeColor: 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700/60',
      icon: Award
    }
  }[user.role] || {
    title: 'User Profile',
    subtitle: 'Manage personal profile parameters and account security credentials',
    badge: user.role,
    badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    icon: User
  };

  return (
    <div className="flex flex-col gap-6 relative max-w-7xl mx-auto w-full pb-12">
      {/* Top Bar with Back Button & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate ? onNavigate('dashboard') : window.history.back()}
            className="flex items-center gap-2 rounded-xl border border-slate-250 dark:border-[#334155] bg-white dark:bg-[#1E293B] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#243247] shadow-2xs transition-all cursor-pointer active:scale-95"
            title="Return to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>
          <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-400">/</span>
          <span className="hidden sm:inline text-xs font-semibold text-slate-600 dark:text-slate-300">My Profile</span>
        </div>

        {/* Tab & Authenticated User Status Capsule */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] px-3 py-1.5 shadow-2xs text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Session: <strong className="text-slate-800 dark:text-white">{user.name}</strong></span>
            <span className="text-slate-300 dark:text-slate-400">|</span>
            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">UID: {user.id}</span>
          </div>
        </div>
      </div>

      {/* Main Profile Header Banner */}
      <div className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] px-5 py-3 sm:py-3.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-3.5">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 dark:bg-emerald-600 text-white font-display text-lg font-bold shadow-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">
                  {roleDisplay.title}
                </h1>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${roleDisplay.badgeColor}`}>
                  {roleDisplay.badge}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {roleDisplay.subtitle}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2.5 sm:gap-3 text-[11px] text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Mail className="h-3 w-3 text-slate-400 dark:text-slate-400" />
                  {user.email}
                </span>
                <span className="inline-flex items-center gap-1 font-medium">
                  <Phone className="h-3 w-3 text-slate-400 dark:text-slate-400" />
                  +91 {user.phone || 'Not provided'}
                </span>
                <span className="inline-flex items-center gap-1 font-medium">
                  <MapPin className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  Jurisdiction: <strong className="text-slate-800 dark:text-slate-100">{registeredZone}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-100 dark:border-slate-700/60 pt-2 sm:pt-0 shrink-0">
            <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              Account Authority
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
              {user.role} Account
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="h-3 w-3" />
              Verified e-Panchayath User
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Side: Demographic & Personal Details Form */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">
                    {user.role === 'citizen' 
                      ? 'Resident Demographics & Personal Details' 
                      : user.role === 'admin' 
                        ? 'Administrator Details' 
                        : 'Officer Details & Credentials'}
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-400">
                    {user.role === 'citizen' 
                      ? 'Demographics needed to evaluate Welfare Scheme compatibility & certificate applications' 
                      : user.role === 'admin'
                        ? 'Chief Panchayath governance and official administrative parameters'
                        : 'Official Panchayat Development Officer jurisdiction and contact parameters'}
                  </p>
                </div>
              </div>

              {freshLoading && (
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Syncing...</span>
                </div>
              )}
            </div>

            {profileSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20 dark:ring-emerald-800/60 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Success! Your profile details have been synchronized with the Gram e-Service ledger.</span>
              </div>
            )}

            {profileError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/20 dark:ring-rose-800/60 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name *</label>
                  {name.length === 20 && (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      20/20 max letters reached
                    </span>
                  )}
                </div>
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
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. resident@gram.gov.in"
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number *</label>
                <div className="relative mt-1.5 flex items-center">
                  <div className="absolute left-3 flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs font-bold border-r border-slate-200 dark:border-[#334155] pr-2 pointer-events-none">
                    <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                    placeholder="10-digit number"
                    className={`h-10 w-full rounded-xl border pl-16 pr-3 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] focus:outline-none transition-colors ${
                      phone.length > 0 && !validatePhoneNumber(phone).isValid
                        ? 'border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-950/20 focus:border-amber-500'
                        : 'border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] focus:border-blue-500'
                    }`}
                  />
                </div>
                {phone.length > 0 && !validatePhoneNumber(phone).isValid && (
                  <p className="mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    {validatePhoneNumber(phone).error}
                  </p>
                )}
              </div>

              {/* Age */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {user.role === 'citizen' ? 'Resident Age *' : 'Age'}
                </label>
                <input
                  type="number"
                  required={user.role === 'citizen'}
                  min="1"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 35"
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Occupation - Only applicable for Citizen residents */}
              {user.role === 'citizen' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Primary Occupation</label>
                  <input
                    id="profile-citizen-occupation"
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g. Agriculture / Weaver / Shopkeep"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {user.role === 'officer' ? 'Official / Office Address' : 'Physical Residential Address *'}
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House no., Ward no., Gram Panchayath, Karnataka"
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="mt-2 flex justify-end sm:col-span-2">
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer shadow-md shadow-blue-600/15 active:scale-95 transition-all"
                >
                  <Save className="h-4 w-4" />
                  {updatingProfile 
                    ? 'Saving profile...' 
                    : (user.role === 'citizen' ? 'Save Demographics & Profile' : 'Save Profile Details')}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Role Overview, Officer Directory & Password Management */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Compact Officer Directory Card for Citizens */}
          {user.role === 'citizen' && (
            <div
              onClick={() => setShowOfficerPanel(true)}
              className="group cursor-pointer rounded-2xl border border-slate-200 dark:border-[#334155] bg-gradient-to-br from-white via-white to-emerald-50/30 dark:from-[#1E293B] dark:via-[#1E293B] dark:to-emerald-950/30 p-5 shadow-sm transition-all duration-200 hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:shadow-md hover:to-emerald-50/50"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20 dark:ring-emerald-800/60 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-slate-800 dark:text-[#F8FAFC] group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
                      Officer Directory
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Contact registered ward officers</p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  <MapPin className="mr-1 h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {registeredZone}
                </span>
              </div>

              <div className="mt-3.5 space-y-2">
                {loadingEmployees ? (
                  <div className="flex items-center justify-center py-4 text-xs text-slate-400 dark:text-slate-500">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mr-2"></div>
                    Loading officers...
                  </div>
                ) : zoneOfficers.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {zoneOfficers.slice(0, 2).map((officer, idx) => (
                      <div
                        key={officer.id ? `${officer.id}-${idx}` : `off-${idx}`}
                        className="flex items-center justify-between rounded-xl bg-white dark:bg-[#172033] border border-slate-150 dark:border-[#334155] p-2.5 shadow-2xs group-hover:border-emerald-200 dark:group-hover:border-emerald-800/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            {officer.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC] truncate">{officer.name}</p>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">{getZoneOfficerTagline(officer.assignedZone)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 text-slate-500 dark:text-slate-400">
                          <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300">{officer.phone}</span>
                        </div>
                      </div>
                    ))}
                    {zoneOfficers.length > 2 && (
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 text-center pt-0.5">
                        +{zoneOfficers.length - 2} more officer{zoneOfficers.length - 2 > 1 ? 's' : ''} in {registeredZone}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center py-2">
                    No officers found assigned to {registeredZone}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-[#334155] pt-3 text-xs font-bold text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-800 dark:group-hover:text-emerald-300">
                <span>View All Zone Officers ({zoneOfficers.length})</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          )}

          {/* Officer Jurisdiction Info Card for Officers */}
          {user.role === 'officer' && (
            <div className="rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-gradient-to-br from-white via-white to-blue-50/40 dark:from-[#1E293B] dark:via-[#1E293B] dark:to-blue-950/40 p-5 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-blue-100 dark:border-blue-800/40 pb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">
                    Panchayat Officer Desk
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Jurisdiction & administrative role</p>
                </div>
              </div>
              <div className="mt-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-white dark:bg-[#172033] border border-slate-150 dark:border-[#334155] p-2.5">
                  <span className="text-slate-500 dark:text-slate-400">Designation</span>
                  <span className="font-bold text-blue-700 dark:text-blue-400">{getZoneOfficerDesignation(user.assignedZone)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white dark:bg-[#172033] border border-slate-150 dark:border-[#334155] p-2.5">
                  <span className="text-slate-500 dark:text-slate-400">Assigned Zone</span>
                  <span className="font-bold text-slate-800 dark:text-white">{registeredZone}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white dark:bg-[#172033] border border-slate-150 dark:border-[#334155] p-2.5">
                  <span className="text-slate-500 dark:text-slate-400">Escalation Priority</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Active Duty</span>
                </div>
              </div>
            </div>
          )}

          {/* Admin Governance Info Card for Admins */}
          {user.role === 'admin' && (
            <div className="rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-gradient-to-br from-white via-white to-purple-50/40 dark:from-[#1E293B] dark:via-[#1E293B] dark:to-purple-950/40 p-5 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-purple-100 dark:border-purple-800/40 pb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">
                    Sarpanch Oversight
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Executive panchayath authority</p>
                </div>
              </div>
              <div className="mt-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-white dark:bg-[#172033] border border-slate-150 dark:border-[#334155] p-2.5">
                  <span className="text-slate-500 dark:text-slate-400">Supervisory Scope</span>
                  <span className="font-bold text-purple-700 dark:text-purple-400">All Gram Wards & Zones</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white dark:bg-[#172033] border border-slate-150 dark:border-[#334155] p-2.5">
                  <span className="text-slate-500 dark:text-slate-400">Audit Authority</span>
                  <span className="font-bold text-slate-800 dark:text-white">Full Ledger Access</span>
                </div>
              </div>
            </div>
          )}

          {/* Change Password Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#334155] pb-3">
              <Key className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="font-display text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">Change Password</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-400">Update password for your current account</p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="mt-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 p-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/10 dark:ring-emerald-800/60 flex items-center gap-1.5 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Password updated successfully!</span>
              </div>
            )}

            {passwordError && (
              <div className="mt-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 p-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/10 dark:ring-rose-800/60 flex items-center gap-1.5 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Current Password</label>
                <div className="relative mt-1 flex items-center">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-9 w-full rounded-lg border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] pl-3 pr-8 text-xs text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer"
                    title={showOldPassword ? "Hide password" : "Show password"}
                  >
                    {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300">New Password</label>
                <div className="relative mt-1 flex items-center">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-9 w-full rounded-lg border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] pl-3 pr-8 text-xs text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer"
                    title={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 text-[9px]">
                    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium ${
                      newPassword.length >= 6 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' : 'bg-slate-100 dark:bg-[#172033] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#334155]'
                    }`}>
                      {newPassword.length >= 6 ? <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" /> : <X className="h-2.5 w-2.5 text-slate-400" />}
                      6+ chars
                    </span>
                    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium ${
                      /\d/.test(newPassword) ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' : 'bg-slate-100 dark:bg-[#172033] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#334155]'
                    }`}>
                      {/\d/.test(newPassword) ? <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" /> : <X className="h-2.5 w-2.5 text-slate-400" />}
                      1+ Number
                    </span>
                    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium ${
                      /[^A-Za-z0-9]/.test(newPassword) ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' : 'bg-slate-100 dark:bg-[#172033] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#334155]'
                    }`}>
                      {/[^A-Za-z0-9]/.test(newPassword) ? <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" /> : <X className="h-2.5 w-2.5 text-slate-400" />}
                      1+ Symbol
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={updatingPassword}
                className="mt-2 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer active:scale-95 transition-all"
              >
                {updatingPassword ? 'Changing...' : 'Update Password'}
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* Side Panel / Slide-Over Drawer for Officer Directory */}
      {showOfficerPanel && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setShowOfficerPanel(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in" 
          />

          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-md bg-white dark:bg-[#1E293B] shadow-2xl flex flex-col transform transition-transform animate-slide-left border-l border-slate-200 dark:border-slate-700">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-700 px-6 py-5 bg-slate-50/80 dark:bg-[#172033]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 dark:bg-emerald-700 text-white shadow-xs">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">Officer Directory</h3>
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        {registeredZone}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Official ward officers and contact numbers</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowOfficerPanel(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="Close Directory"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Informational Banner */}
              <div className="mx-6 mt-5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-900 dark:text-emerald-200">Jurisdiction Officer Roster</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5 leading-relaxed">
                    Exclusively displaying officers assigned to <strong>{registeredZone}</strong>. Use these verified contacts for certificate escalations, tax queries, or emergency civic complaints.
                  </p>
                </div>
              </div>

              {/* Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingEmployees ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                    <span className="text-xs font-medium">Fetching officer records...</span>
                  </div>
                ) : zoneOfficers.length > 0 ? (
                  zoneOfficers.map((officer, idx) => (
                    <div
                      key={officer.id ? `${officer.id}-${idx}` : `off-dir-${idx}`}
                      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-4 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-500/60 transition-all flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-sm font-extrabold text-white shadow-xs border border-emerald-500/30">
                            {officer.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h4 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">{officer.name}</h4>
                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{getZoneOfficerTagline(officer.assignedZone)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-700/60 pt-3 grid gap-2">
                        {/* Phone Row */}
                        <div className="flex items-center justify-between rounded-lg bg-slate-50/80 dark:bg-[#172033] px-3 py-2 border border-slate-150 dark:border-slate-700/60">
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <a
                              href={`tel:${officer.phone}`}
                              className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline"
                            >
                              +91 {officer.phone}
                            </a>
                          </div>

                          <button
                            onClick={(e) => handleCopyPhone(officer.id, officer.phone, e)}
                            className="flex items-center gap-1 rounded-md bg-white dark:bg-[#243044] px-2 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title="Copy Phone Number"
                          >
                            {copiedPhoneId === officer.id ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 text-slate-400 dark:text-slate-400" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Email Row */}
                        <div className="flex items-center justify-between rounded-lg bg-slate-50/80 dark:bg-[#172033] px-3 py-2 border border-slate-150 dark:border-slate-700/60">
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-emerald-400 shrink-0" />
                            <a
                              href={`mailto:${officer.email}`}
                              className="text-xs font-mono font-medium text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-emerald-400 hover:underline truncate"
                            >
                              {officer.email}
                            </a>
                          </div>

                          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 shrink-0">Official Mail</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-[#CBD5E1] pt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                          Jurisdiction: <strong className="text-slate-800 dark:text-slate-200">{officer.assignedZone}</strong>
                        </span>
                        <span className="font-medium text-slate-600 dark:text-[#CBD5E1]">Office Hours: 9:00 AM - 5:30 PM</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Building2 className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Officers Found</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                      No officers are currently registered in the database for {registeredZone}.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-150 dark:border-slate-700 p-4 bg-slate-50 dark:bg-[#172033] text-center text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Read-Only Contact Directory • Namma Panchayath Digital Portal
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
