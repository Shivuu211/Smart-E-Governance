import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Plus, 
  Trash2, 
  Edit, 
  AlertCircle, 
  Search, 
  Mail, 
  Phone, 
  Eye, 
  EyeOff, 
  Lock, 
  X, 
  Check, 
  UserCheck, 
  KeyRound, 
  CheckCircle2 
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Employee } from '../types';
import { getZoneOfficerDesignation } from '../utils/zoneUtils';
import OfficerPerformanceView from '../components/OfficerPerformanceView';
import { validatePhoneNumber, sanitizePhoneInput } from '../utils/phoneValidation';
import { validatePassword } from '../utils/passwordValidation';
import { validateName, sanitizeNameInput, MAX_NAME_LENGTH } from '../utils/nameValidation';
import { useOfficers } from '../context/OfficerContext';

export default function AdminEmployeeMgmt() {
  const { user } = useAuth();
  const { refreshOfficers } = useOfficers();
  const isAdmin = user?.role === 'admin';

  const cachedEmployees = api.getCachedSync('employees');
  const [employees, setEmployees] = useState<Employee[]>(cachedEmployees || []);
  const [loading, setLoading] = useState(!cachedEmployees);
  const [search, setSearch] = useState('');

  // Notification state
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const successTimeoutRef = React.useRef<any>(null);

  const showSuccessToast = (msg: string) => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    setSuccessMsg(msg);
    successTimeoutRef.current = setTimeout(() => {
      setSuccessMsg(null);
    }, 4500);
  };

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // Form states (Enlist)
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Zone Panchayath Officer');
  const [assignedZone, setAssignedZone] = useState('Bengaluru South');
  const [status, setStatus] = useState<'Active' | 'On Leave' | 'Inactive'>('Active');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Officer Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Employee | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('Zone Panchayath Officer');
  const [editAssignedZone, setEditAssignedZone] = useState('Bengaluru South');
  const [editStatus, setEditStatus] = useState<'Active' | 'On Leave' | 'Inactive'>('Active');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editFieldErrors, setEditFieldErrors] = useState<{ [key: string]: string }>({});

  // Separate secure Reset Password action inside Edit modal
  const [showResetPasswordToggle, setShowResetPasswordToggle] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // De-list states
  const [officerToDelete, setOfficerToDelete] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [performanceRefreshKey, setPerformanceRefreshKey] = useState(0);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const list = await api.getEmployees();
      if (list) setEmployees(list);
    } catch (err) {
      console.error('Error loading employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setFormError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone) {
      setFormError('Please fill in required fields (Name, Email, Phone, Password).');
      return;
    }

    const nameValidation = validateName(trimmedName, true, MAX_NAME_LENGTH);
    if (!nameValidation.isValid) {
      setFormError(nameValidation.error || 'Officer Name must contain only letters.');
      return;
    }

    if (!password) {
      setFormError('Please create a login password for the officer.');
      return;
    }

    const pwdValidation = validatePassword(password, 6, true);
    if (!pwdValidation.isValid) {
      setFormError(pwdValidation.error || 'Password must contain at least 6 characters, one numerical digit, and one special character.');
      return;
    }

    const phoneValidation = validatePhoneNumber(trimmedPhone, true);
    if (!phoneValidation.isValid) {
      setFormError(phoneValidation.error || 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setSaving(true);
    try {
      const created = await api.createEmployee({
        name: trimmedName,
        email: trimmedEmail,
        password: password,
        phone: phoneValidation.cleaned,
        role,
        department: 'Jurisdiction Administration',
        assignedZone,
        status,
      });

      // 1. Close modal
      setShowModal(false);

      // 2. Reset form
      setName('');
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setPhone('');
      setFormError(null);
      setSearch('');

      // 3. Refresh directory automatically & ensure newly created officer is listed
      await loadEmployees();
      await refreshOfficers();
      setPerformanceRefreshKey(prev => prev + 1);

      // 4. Show success notification/toast with exactly: “New officer created”
      showSuccessToast('New officer created');
    } catch (err: any) {
      console.error('Error creating officer:', err);
      const rawMsg = err?.message || '';
      if (rawMsg.toLowerCase().includes('already exists')) {
        setFormError('An account with this email already exists.');
      } else if (rawMsg && !rawMsg.includes('Failed to fetch') && !rawMsg.includes('[object Object]')) {
        setFormError(rawMsg);
      } else {
        setFormError('Unable to create officer. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Open Edit modal and pre-fill details
  const handleEditClick = (emp: Employee) => {
    setEditingOfficer(emp);
    setEditName(emp.name || '');
    setEditEmail(emp.email || '');
    setEditPhone(emp.phone || '');
    setEditRole(emp.role || 'Zone Panchayath Officer');
    setEditAssignedZone(emp.assignedZone || 'Bengaluru South');
    setEditStatus((emp.status as 'Active' | 'On Leave' | 'Inactive') || 'Active');
    setEditFormError(null);
    setEditFieldErrors({});
    setShowResetPasswordToggle(false);
    setNewPassword('');
    setShowNewPassword(false);
    setShowEditModal(true);
  };

  // Handle Save Changes in Edit modal
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOfficer) return;

    setEditFormError(null);
    const errors: { [key: string]: string } = {};

    // 1. Officer Name validation
    const trimmedName = editName.trim();
    if (!trimmedName) {
      errors.name = 'Officer Name is required.';
    } else {
      const nameValidation = validateName(trimmedName, true, MAX_NAME_LENGTH);
      if (!nameValidation.isValid) {
        errors.name = nameValidation.error || 'Officer Name must contain only valid letters.';
      }
    }

    // 2. Email validation
    const trimmedEmail = editEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      errors.email = 'Email Address is required.';
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    } else {
      // Prevent duplicate email check against other officers locally
      const duplicateOfficer = employees.some(
        emp => emp.id !== editingOfficer.id && emp.email && emp.email.trim().toLowerCase() === trimmedEmail
      );
      if (duplicateOfficer) {
        errors.email = 'An account with this email already exists.';
      }
    }

    // 3. Phone validation
    const trimmedPhone = editPhone.trim();
    if (!trimmedPhone) {
      errors.phone = 'Phone Number is required.';
    } else {
      const phoneValidation = validatePhoneNumber(trimmedPhone, true);
      if (!phoneValidation.isValid) {
        errors.phone = phoneValidation.error || 'Please enter a valid 10-digit mobile number.';
      }
    }

    // 4. Role validation
    if (!editRole || !editRole.trim()) {
      errors.role = 'Please select a designated role.';
    }

    // 5. Zone validation
    const validZones = ['Bengaluru North', 'Bengaluru South', 'Bengaluru East', 'Bengaluru West'];
    if (!validZones.includes(editAssignedZone)) {
      errors.zone = 'Please select an assigned jurisdiction zone.';
    }

    // 6. Reset Password validation if toggled
    if (showResetPasswordToggle && newPassword) {
      const pwdValidation = validatePassword(newPassword, 6, true);
      if (!pwdValidation.isValid) {
        errors.password = pwdValidation.error || 'Password must contain at least 6 characters, one numerical digit, and one special character.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setEditFieldErrors(errors);
      setEditFormError(Object.values(errors)[0]);
      return;
    }

    setSavingEdit(true);
    try {
      const cleanedPhone = validatePhoneNumber(trimmedPhone, true).cleaned || trimmedPhone;
      await api.updateEmployee(editingOfficer.id, {
        name: trimmedName,
        email: trimmedEmail,
        phone: cleanedPhone,
        role: editRole,
        assignedZone: editAssignedZone,
        status: editStatus,
        resetPassword: showResetPasswordToggle && newPassword ? newPassword : undefined,
      });

      // Refresh directory and audits
      await loadEmployees();
      await refreshOfficers();
      setPerformanceRefreshKey(prev => prev + 1);

      // Close modal and show success feedback
      setShowEditModal(false);
      setEditingOfficer(null);
      showSuccessToast('Officer details updated successfully.');
    } catch (err: any) {
      console.error('Error updating officer:', err);
      const rawMsg = err?.message || '';
      if (rawMsg.toLowerCase().includes('already exists')) {
        setEditFieldErrors({ email: 'An account with this email already exists.' });
        setEditFormError('An account with this email already exists.');
      } else {
        setEditFormError('Unable to update officer details. Please try again.');
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteClick = (emp: Employee) => {
    setDeleteError(null);
    setOfficerToDelete(emp);
  };

  const confirmDelete = async () => {
    if (!officerToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteEmployee(officerToDelete.id);
      await loadEmployees();
      await refreshOfficers();
      setPerformanceRefreshKey(prev => prev + 1);
      setOfficerToDelete(null);
      showSuccessToast('Officer deleted successfully');
    } catch (err: any) {
      setDeleteError(err.message || 'Unable to de-list officer. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.role && e.role.toLowerCase().includes(search.toLowerCase())) ||
    (e.assignedZone && e.assignedZone.toLowerCase().includes(search.toLowerCase())) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 pb-32">
      {/* Respective Officers Work Performance Table & Audit Console (Admin Only) */}
      {isAdmin && <OfficerPerformanceView key={performanceRefreshKey} />}

      {/* Success Notification Banner / Toast */}
      {successMsg && (
        <div
          id="admin-notification-toast"
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/95 dark:bg-emerald-950/70 p-4 shadow-sm flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200 animate-fade-in"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 dark:bg-emerald-700 text-white font-bold shrink-0 shadow-sm">
              <Check className="h-4.5 w-4.5 stroke-[2.5]" />
            </div>
            <p className="font-bold text-emerald-950 dark:text-emerald-100 text-sm">
              {successMsg}
            </p>
          </div>
          <button
            onClick={() => {
              if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
              setSuccessMsg(null);
            }}
            className="rounded-lg p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer transition-colors"
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center pt-2 border-t border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-800 dark:text-slate-100">Gram Panchayath Officer Directory</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Track public utility operators, maintenance clerks, and zone officers</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setFormError(null);
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 dark:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/15 hover:bg-emerald-700 dark:hover:bg-emerald-600 cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" />
            Enlist Officer
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-5 shadow-sm">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400 dark:text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, email, zone..."
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] pl-10 pr-4 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="flex py-10 justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400 dark:text-slate-400">No officers matching recorded.</p>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-[#172033] text-slate-500 dark:text-slate-300 font-bold">
                  <th className="p-3">Officer</th>
                  <th className="p-3">Role Designation</th>
                  <th className="p-3">Jurisdiction Zone</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Status</th>
                  {isAdmin && <th className="p-3 text-right pr-4">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium text-slate-700 dark:text-slate-200">
                {filtered.map((emp, index) => (
                  <tr key={emp.id ? `${emp.id}-${index}` : `emp-${index}`} className="hover:bg-slate-50 dark:hover:bg-[#243044] transition-colors">
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{emp.name}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 font-bold">
                      {emp.role || getZoneOfficerDesignation(emp.assignedZone)}
                    </td>
                    <td className="p-3 font-bold text-emerald-900 dark:text-emerald-300">
                      <span className="rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 text-[10px] text-emerald-800 dark:text-emerald-300">
                        📍 {emp.assignedZone || 'Bengaluru South'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{emp.email}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{emp.phone}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        emp.status === 'Active' || !emp.status
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60' 
                          : emp.status === 'On Leave'
                          ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          emp.status === 'Active' || !emp.status
                            ? 'bg-emerald-500'
                            : emp.status === 'On Leave'
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        }`} />
                        {emp.status || 'Active'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="p-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(emp)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                            title={`Edit ${emp.name}`}
                          >
                            <Edit className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(emp)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/40 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                            title={`De-list ${emp.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            De-list
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Officer Modal (Admin Only) */}
      {isAdmin && showEditModal && editingOfficer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-4 bg-slate-50/70 dark:bg-[#172033]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">
                    Edit Officer Details
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Update profile, role, zone, and duty status for {editingOfficer.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingOfficer(null);
                }}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                {/* Error Banner */}
                {editFormError && (
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{editFormError}</span>
                  </div>
                )}

                {/* Officer Name */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Officer Name *
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {editName.length}/{MAX_NAME_LENGTH}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={MAX_NAME_LENGTH}
                    value={editName}
                    onChange={(e) => {
                      setEditFormError(null);
                      setEditFieldErrors(prev => ({ ...prev, name: '' }));
                      setEditName(sanitizeNameInput(e.target.value));
                    }}
                    placeholder="e.g. Ramesh Kumar"
                    className={`mt-1.5 h-10 w-full rounded-xl border px-3 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-[#243044] focus:outline-none transition-colors ${
                      editFieldErrors.name
                        ? 'border-rose-400 bg-rose-50/20 dark:bg-rose-950/20 focus:border-rose-500'
                        : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                    }`}
                  />
                  {editFieldErrors.name && (
                    <p className="mt-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                      {editFieldErrors.name}
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Email Address *
                  </label>
                  <div className="relative mt-1.5 flex items-center">
                    <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => {
                        setEditFormError(null);
                        setEditFieldErrors(prev => ({ ...prev, email: '' }));
                        setEditEmail(e.target.value);
                      }}
                      placeholder="officer@gram.gov.in"
                      className={`h-10 w-full rounded-xl border pl-9 pr-3 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-[#243044] focus:outline-none transition-colors ${
                        editFieldErrors.email
                          ? 'border-rose-400 bg-rose-50/20 dark:bg-rose-950/20 focus:border-rose-500'
                          : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  {editFieldErrors.email && (
                    <p className="mt-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                      {editFieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Phone Number *
                  </label>
                  <div className="relative mt-1.5 flex items-center">
                    <div className="absolute left-3 flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs font-bold border-r border-slate-200 dark:border-slate-700 pr-2 pointer-events-none">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={editPhone}
                      onChange={(e) => {
                        setEditFormError(null);
                        setEditFieldErrors(prev => ({ ...prev, phone: '' }));
                        setEditPhone(sanitizePhoneInput(e.target.value));
                      }}
                      placeholder="e.g. 9876543210"
                      className={`h-10 w-full rounded-xl border pl-16 pr-3 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-[#243044] focus:outline-none transition-colors ${
                        editFieldErrors.phone
                          ? 'border-rose-400 bg-rose-50/20 dark:bg-rose-950/20 focus:border-rose-500'
                          : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  {editFieldErrors.phone && (
                    <p className="mt-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                      {editFieldErrors.phone}
                    </p>
                  )}
                </div>

                {/* Designated Role */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Designated Role *
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => {
                      setEditFormError(null);
                      setEditFieldErrors(prev => ({ ...prev, role: '' }));
                      setEditRole(e.target.value);
                    }}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] px-3 text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Zone Panchayath Officer">Zone Panchayath Officer</option>
                    <option value="Technician">Maintenance Technician</option>
                    <option value="Sanitation Officer">Sanitation & Garbage Inspector</option>
                    <option value="Clerk">Administrative Clerk</option>
                    <option value="Water Pump Operator">Water Pump Operator</option>
                    <option value="Panchayath Guard">Panchayath Guard</option>
                  </select>
                </div>

                {/* Assigned Jurisdiction Zone */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Assigned Jurisdiction Zone *
                  </label>
                  <select
                    value={editAssignedZone}
                    onChange={(e) => {
                      setEditFormError(null);
                      setEditFieldErrors(prev => ({ ...prev, zone: '' }));
                      setEditAssignedZone(e.target.value);
                    }}
                    className="mt-1.5 h-10 w-full rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/50 px-3 text-xs font-bold text-emerald-900 dark:text-emerald-200 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Bengaluru South">Bengaluru South</option>
                    <option value="Bengaluru North">Bengaluru North</option>
                    <option value="Bengaluru East">Bengaluru East</option>
                    <option value="Bengaluru West">Bengaluru West</option>
                  </select>
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    Future complaints and civic actions will route to this updated zone. Historical records are preserved.
                  </p>
                </div>

                {/* Officer Status */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Officer Status *
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e: any) => {
                      setEditFormError(null);
                      setEditStatus(e.target.value);
                    }}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] px-3 text-xs font-bold text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Active">Active — Normal assigned work</option>
                    <option value="On Leave">On Leave — Temporarily unavailable</option>
                    <option value="Inactive">Inactive — No new assignments; records retained</option>
                  </select>
                </div>

                {/* Separate Secure Password Reset Action (Do not display existing password) */}
                <div className="border-t border-slate-100 dark:border-slate-700/80 pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Officer Account Password
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Existing password is secure and encrypted.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetPasswordToggle(!showResetPasswordToggle);
                        setNewPassword('');
                        setEditFieldErrors(prev => ({ ...prev, password: '' }));
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#243044] px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      {showResetPasswordToggle ? 'Cancel Password Reset' : 'Reset Password'}
                    </button>
                  </div>

                  {showResetPasswordToggle && (
                    <div className="mt-3 rounded-2xl bg-slate-50 dark:bg-[#172033] border border-slate-200/80 dark:border-slate-700 p-3.5 space-y-2 animate-fade-in">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Enter New Login Password *
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
                          <Lock className="h-3.5 w-3.5" />
                        </div>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => {
                            setEditFormError(null);
                            setEditFieldErrors(prev => ({ ...prev, password: '' }));
                            setNewPassword(e.target.value);
                          }}
                          placeholder="Min 6 chars, 1 digit, 1 special character"
                          className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] pl-9 pr-10 text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer"
                          title={showNewPassword ? 'Hide password' : 'Show password'}
                        >
                          {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      {editFieldErrors.password && (
                        <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                          {editFieldErrors.password}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-[#172033] px-6 py-3.5 flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingOfficer(null);
                  }}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-700/20 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {savingEdit ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Saving changes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enlist Officer Modal (Admin Only) */}
      {isAdmin && showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-4">
              <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">Enlist Officer</h3>
              <button
                type="button"
                disabled={saving}
                onClick={() => !saving && setShowModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                {/* Form Error Banner */}
                {formError && (
                  <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 animate-fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                    <span className="font-medium">{formError}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Officer Name *</label>
                    {name.length >= 45 && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 animate-fade-in">
                        {name.length}/{MAX_NAME_LENGTH} max letters
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={MAX_NAME_LENGTH}
                    value={name}
                    onKeyDown={(e) => {
                      if (e.key.length === 1 && !/[a-zA-Z\s]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      setFormError(null);
                      setName(sanitizeNameInput(e.target.value));
                    }}
                    placeholder="Enter officer full name"
                    pattern="[A-Za-z\s]+"
                    title="Officer Full Name must contain only letters and spaces"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                  {name.length > 0 && !validateName(name, false, MAX_NAME_LENGTH).isValid && (
                    <p className="mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      {validateName(name, false, MAX_NAME_LENGTH).error}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setFormError(null);
                      setEmail(e.target.value);
                    }}
                    placeholder="Enter official email address"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Login Password *</label>
                    {password.length > 0 && validatePassword(password, 6, true).isValid && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <Check className="h-3 w-3" /> Strong Password
                      </span>
                    )}
                  </div>
                  <div className="relative mt-1.5 flex items-center">
                    <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => {
                        setFormError(null);
                        setPassword(e.target.value);
                      }}
                      placeholder="Create officer login password"
                      className={`h-10 w-full rounded-xl border pl-9 pr-10 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-[#243044] focus:outline-none transition-colors ${
                        password.length > 0 && !validatePassword(password, 6, true).isValid
                          ? 'border-amber-400 dark:border-amber-500/70 focus:border-amber-500'
                          : password.length > 0 && validatePassword(password, 6, true).isValid
                          ? 'border-emerald-500 dark:border-emerald-600 focus:border-emerald-600'
                          : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {password.length > 0 && !validatePassword(password, 6, true).isValid && (
                    <p className="mt-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      {validatePassword(password, 6, true).error}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Phone Number *</label>
                  <div className="relative mt-1.5 flex items-center">
                    <div className="absolute left-3 flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs font-bold border-r border-slate-200 dark:border-slate-700 pr-2 pointer-events-none">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => {
                        setFormError(null);
                        setPhone(sanitizePhoneInput(e.target.value));
                      }}
                      placeholder="e.g. 9876543210"
                      className={`h-10 w-full rounded-xl border pl-16 pr-3 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-[#243044] focus:outline-none transition-colors ${
                        phone.length > 0 && !validatePhoneNumber(phone).isValid
                          ? 'border-amber-400 bg-amber-50/20 dark:bg-amber-950/20 focus:border-amber-500'
                          : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  {phone.length > 0 && !validatePhoneNumber(phone).isValid && (
                    <p className="mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      {validatePhoneNumber(phone).error}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Designated Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-slate-100"
                  >
                    <option value="Zone Panchayath Officer">Zone Panchayath Officer</option>
                    <option value="Technician">Maintenance Technician</option>
                    <option value="Sanitation Officer">Sanitation & Garbage Inspector</option>
                    <option value="Clerk">Administrative Clerk</option>
                    <option value="Water Pump Operator">Water Pump Operator</option>
                    <option value="Panchayath Guard">Panchayath Guard</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Assigned Jurisdiction Zone *</label>
                  <select
                    value={assignedZone}
                    onChange={(e) => setAssignedZone(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/50 px-3 text-xs font-bold text-emerald-900 dark:text-emerald-200"
                  >
                    <option value="Bengaluru South">Bengaluru South</option>
                    <option value="Bengaluru North">Bengaluru North</option>
                    <option value="Bengaluru East">Bengaluru East</option>
                    <option value="Bengaluru West">Bengaluru West</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Initial Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-slate-100"
                  >
                    <option value="Active">Active Duty</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-[#172033] px-6 py-3.5 flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-700/20 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {saving ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Creating Officer...</span>
                    </>
                  ) : (
                    <span>Enlist Officer</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for De-list / Delete (Admin Only) */}
      {isAdmin && officerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-6 shadow-2xl animate-scale-up">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  Confirm Officer De-list
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to retire and de-list <span className="font-bold text-slate-800 dark:text-slate-100">{officerToDelete.name}</span> ({officerToDelete.role || getZoneOfficerDesignation(officerToDelete.assignedZone)}) from the active register?
                </p>
                <div className="mt-3 rounded-xl bg-slate-50 dark:bg-[#172033] border border-slate-200/80 dark:border-slate-700 p-3 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                  <p><strong className="text-slate-700 dark:text-slate-200">Jurisdiction:</strong> {officerToDelete.assignedZone || 'Bengaluru South'}</p>
                  <p><strong className="text-slate-700 dark:text-slate-200">Contact:</strong> +91 {officerToDelete.phone} • {officerToDelete.email}</p>
                  <p className="text-[10px] text-slate-400 italic mt-1">Historical grievances, certificates, and assets will remain securely preserved.</p>
                </div>
              </div>
            </div>

            {deleteError && (
              <div className="mt-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 p-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setOfficerToDelete(null);
                  setDeleteError(null);
                }}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    De-listing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Confirm De-list
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
