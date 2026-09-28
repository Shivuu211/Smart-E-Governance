import React, { useState, useEffect } from 'react';
import { DocumentPreviewModal, PreviewDocData } from '../components/DocumentPreviewModal';
import {
  Users,
  Plus,
  Trash2,
  Edit,
  Search,
  Mail,
  Phone,
  Eye,
  EyeOff,
  MapPin,
  X,
  BadgeAlert,
  FileCheck2,
  Coins,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Briefcase,
  DollarSign,
  UserCheck,
  Calendar,
  Star
} from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';
import { validatePassword } from '../utils/passwordValidation';
import { useAuth } from '../context/AuthContext';
import { validatePhoneNumber, sanitizePhoneInput } from '../utils/phoneValidation';
import { validateName, sanitizeNameInput, MAX_NAME_LENGTH } from '../utils/nameValidation';

export default function AdminCitizenMgmt() {
  const { user } = useAuth();
  const isOfficer = user?.role === 'officer';
  const officerZone = user?.assignedZone || 'Bengaluru South';

  const cachedCitizens = api.getCachedSync('citizens');
  const [citizens, setCitizens] = useState<User[]>(cachedCitizens || []);
  const [loading, setLoading] = useState(!cachedCitizens);
  const [search, setSearch] = useState('');

  // Add / Edit Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState<number | ''>(35);
  const [occupation, setOccupation] = useState('Agriculture');
  const [income, setIncome] = useState<number | ''>(120000);
  const [ward, setWard] = useState('Ward 01');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [zone, setZone] = useState(isOfficer ? officerZone : 'Bengaluru South');
  const [saving, setSaving] = useState(false);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; email?: string; phone?: string; zone?: string; ward?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  // Customer Details Modal State
  const [selectedCitizenDetails, setSelectedCitizenDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'grievances' | 'certificates' | 'taxes' | 'schemes'>('overview');
  const [previewDoc, setPreviewDoc] = useState<PreviewDocData | null>(null);

  useEffect(() => {
    loadCitizens();
  }, []);

  const loadCitizens = async () => {
    try {
      const list = await api.getCitizens();
      if (list) setCitizens(list);
    } catch (err) {
      console.error('Error loading citizens:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setGender('Male');
    setAge(30);
    setOccupation('Agriculture');
    setIncome(120000);
    setWard('Ward 01');
    setPassword('citizen123');
    setZone(isOfficer ? officerZone : 'Bengaluru South');
    setShowModal(true);
  };

  const handleOpenEdit = (c: User) => {
    setEditingId(c.id);
    setName(c.name || '');
    setEmail(c.email || '');
    setPhone(c.phone || '');
    setAddress(c.address || '');
    setGender(c.gender || 'Male');
    setAge(c.age || 30);
    setOccupation(c.occupation || '');
    setIncome(c.income || 0);
    setWard(c.ward || 'Ward 01');
    setPassword('');
    setZone(c.zone || (isOfficer ? officerZone : 'Bengaluru South'));
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !address) {
      alert('Please fill in required fields (Name, Email, Phone, Address).');
      return;
    }

    const phoneValidation = validatePhoneNumber(phone, true);
    if (!phoneValidation.isValid) {
      alert(phoneValidation.error || 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const nameValidation = validateName(name, true, MAX_NAME_LENGTH);
    if (!nameValidation.isValid) {
      alert(nameValidation.error || 'Full Name must contain only letters and cannot exceed 20 characters.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.updateCitizen(editingId, {
          name,
          email,
          phone: phoneValidation.cleaned,
          address,
          gender,
          age: age ? Number(age) : undefined,
          occupation,
          income: income ? Number(income) : 0,
          ward,
          zone: isOfficer ? officerZone : zone,
        });
      } else {
        if (!password) {
          alert('Please enter an initial password for the resident.');
          setSaving(false);
          return;
        }
        const pwdValidation = validatePassword(password);
        if (!pwdValidation.isValid) {
          alert(pwdValidation.error || 'Password must contain at least one number and one special character.');
          setSaving(false);
          return;
        }
        await api.addCitizen({
          name,
          email,
          phone: phoneValidation.cleaned,
          address,
          gender,
          age: age ? Number(age) : undefined,
          occupation,
          income: income ? Number(income) : 0,
          ward,
          password,
          zone: isOfficer ? officerZone : zone,
          taluk: isOfficer ? officerZone : zone,
        });
      }

      setShowModal(false);
      await loadCitizens();
    } catch (err: any) {
      alert(err.message || 'Failed to save resident details.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDelete = (c: User | { id: string; name: string; email?: string; phone?: string; zone?: string; ward?: string }) => {
    setDeleteError(null);
    setDeleteTarget({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      zone: c.zone,
      ward: c.ward
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await api.deleteCitizen(deleteTarget.id);
      if (res && res.success === false) {
        throw new Error(res.message || 'Failed to delete citizen account.');
      }
      const deletedId = deleteTarget.id;
      const deletedName = deleteTarget.name;
      
      setDeleteTarget(null);
      if (selectedCitizenDetails?.citizen?.id === deletedId) {
        setSelectedCitizenDetails(null);
      }
      
      // Reload citizen list immediately to reflect removal
      await loadCitizens();
      setDeleteSuccessMsg(`Citizen "${deletedName}" was deleted successfully.`);
      setTimeout(() => setDeleteSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Citizen deletion error:', err);
      setDeleteError(err.message || 'Failed to delete citizen account. Please check permissions and try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleViewDetails = async (c: User) => {
    setLoadingDetails(true);
    setSelectedCitizenDetails(null);
    setActiveDetailTab('overview');
    try {
      const details = await api.getCitizenDetails(c.id);
      setSelectedCitizenDetails(details);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch customer details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const filtered = citizens.filter(c =>
    (c.id && c.id.toLowerCase().includes(search.toLowerCase())) ||
    (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search)) ||
    (c.ward && c.ward.toLowerCase().includes(search.toLowerCase())) ||
    (c.zone && c.zone.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Jurisdiction Scope */}
      {deleteSuccessMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-sm flex items-center justify-between gap-3 text-xs text-emerald-900 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-emerald-950">Citizen Account Permanently Deleted</p>
              <p className="text-[11px] text-emerald-800">{deleteSuccessMsg}</p>
            </div>
          </div>
          <button
            onClick={() => setDeleteSuccessMsg(null)}
            className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold text-slate-800 dark:text-[#F8FAFC]">
              {isOfficer ? 'Jurisdiction Citizens Module' : 'Gram Resident Directory'}
            </h2>
            <span className="rounded-full bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 px-3 py-0.5 text-xs font-extrabold text-blue-900 dark:text-white dark:!text-white shadow-sm flex items-center gap-1">
              <MapPin className="h-3 w-3 text-blue-600 dark:text-blue-300" />
              {isOfficer ? `Jurisdiction: ${officerZone}` : 'All Panchayath Zones'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#CBD5E1]">
            {isOfficer
              ? `Manage resident profiles, inspect customer service history, and monitor applications within ${officerZone}`
              : 'Panchayath-wide citizen directory, demographic records, and service history logs'}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/15 hover:bg-blue-700 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {isOfficer ? 'Register Area Resident' : 'Add Citizen Profile'}
        </button>
      </div>

      {/* Jurisdiction Info Banner for Officer */}
      {isOfficer && (
        <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-white dark:from-[#172033] dark:via-[#1E293B] dark:to-[#172033] p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-300">Assigned Area Jurisdiction: {officerZone}</h4>
              <p className="mt-0.5 text-[11px] text-slate-600 dark:text-[#CBD5E1]">
                You are authorized to access, inspect customer history, and manage citizen accounts assigned to <strong className="dark:text-[#F8FAFC]">{officerZone}</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-indigo-900 dark:text-indigo-300 shrink-0 bg-white/80 dark:bg-[#1E293B] px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800/60">
            <UserCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>{filtered.length} Registered Residents</span>
          </div>
        </div>
      )}

      {/* Directory Table Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-sm">
        {/* Search & Counter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, or ward..."
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] pl-10 pr-4 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <p className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">
            Showing <strong className="text-slate-800 dark:text-[#F8FAFC]">{filtered.length}</strong> resident(s)
          </p>
        </div>

        {/* Citizens List Table */}
        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="flex py-12 justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">No matching citizens recorded in this jurisdiction.</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Click "Register Area Resident" above to add new citizens.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#334155] bg-slate-50 dark:bg-[#172033] text-slate-700 dark:text-[#CBD5E1] font-bold">
                  <th className="p-3">Resident Name</th>
                  <th className="p-3">Jurisdiction / Ward</th>
                  <th className="p-3">Contact (Email / Phone)</th>
                  <th className="p-3">Demographics</th>
                  <th className="p-3 text-right">Actions & Customer Records</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#334155] font-medium text-slate-700 dark:text-[#CBD5E1]">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-[#172033]/80 transition-all">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/60 font-bold text-blue-800 dark:text-blue-300 text-xs uppercase shrink-0 border border-transparent dark:border-blue-800/40">
                          {c.name.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-[#F8FAFC]">{c.name}</p>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">ID: {c.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="rounded-md bg-blue-100 dark:bg-blue-950/80 border border-blue-300 dark:border-blue-800/80 px-2 py-0.5 text-[10px] font-bold text-blue-950 dark:text-blue-300 w-fit flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-blue-700 dark:text-blue-400" />
                          {c.zone || officerZone}
                        </span>
                        <span className="text-[10px] text-slate-600 dark:text-[#CBD5E1] font-semibold">{c.ward || 'Ward 01'}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-0.5 text-slate-700 dark:text-[#CBD5E1]">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Mail className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                          {c.email}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-[#CBD5E1]">
                          <Phone className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                          {c.phone || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">
                          {c.occupation || 'Resident'}
                        </span>
                        <span className="text-[10px] text-slate-600 dark:text-[#CBD5E1] font-medium">
                          {c.gender || 'Male'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(c)}
                          className="flex items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all shadow-sm cursor-pointer"
                          title="View complete customer history, complaints, certificates, and tax records"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Customer Details
                        </button>

                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-2 py-1 text-xs font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1E293B] cursor-pointer"
                          title="Edit resident details"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </button>

                        <button
                          onClick={() => handleOpenDelete(c)}
                          className="flex items-center gap-1 rounded-lg border border-rose-100 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 cursor-pointer"
                          title="Permanently delete citizen account and all associated records"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Citizen Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-base font-bold text-slate-800">
                {editingId ? 'Edit Resident Profile' : isOfficer ? 'Register Resident in Jurisdiction' : 'Add Citizen Profile'}
              </h3>
              <button onClick={() => setShowModal(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Resident Full Name *</label>
                    {name.length === 20 && (
                      <span className="text-[10px] font-bold text-amber-600 animate-fade-in">
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
                    title="Resident Full Name must contain only letters and spaces"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Phone Number *</label>
                    <span className={`text-[10px] font-medium ${
                      phone.length === 10 ? 'text-emerald-600 font-bold' : phone.length > 0 ? 'text-amber-600' : 'text-slate-400'
                    }`}>
                      {phone.length}/10
                    </span>
                  </div>
                  <div className="relative mt-1 flex items-center">
                    <div className="absolute left-2.5 flex items-center gap-1 text-slate-400 text-xs font-bold pointer-events-none">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                      placeholder=""
                      className={`h-10 w-full rounded-xl border pl-8 pr-3 text-xs focus:outline-none transition-colors ${
                        phone.length === 10 && validatePhoneNumber(phone).isValid
                          ? 'border-emerald-400 bg-emerald-50/20 focus:border-emerald-500'
                          : phone.length > 0 && !validatePhoneNumber(phone).isValid
                          ? 'border-amber-400 bg-amber-50/20 focus:border-amber-500'
                          : 'border-slate-200 focus:border-blue-500'
                      }`}
                    />
                  </div>
                  {phone.length > 0 && !validatePhoneNumber(phone).isValid && (
                    <p className="mt-1 text-[10px] font-semibold text-amber-600">
                      {validatePhoneNumber(phone).error}
                    </p>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700">Assigned Zone</label>
                  <input
                    type="text"
                    disabled={isOfficer}
                    value={isOfficer ? officerZone : zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-600 focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Residential Address *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House No, Street name, Gram Panchayath Area"
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 focus:border-blue-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Ward No.</label>
                  <input
                    type="text"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Occupation</label>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g. Agriculture / Business"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Annual Family Income (₹)</label>
                  <input
                    type="number"
                    value={income}
                    onChange={(e) => setIncome(e.target.value ? Number(e.target.value) : '')}
                    placeholder="120000"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 focus:border-blue-500"
                  />
                </div>
              </div>

              {!editingId && (
                <div>
                  <label className="font-bold text-slate-700">Initial Account Password *</label>
                  <div className="relative mt-1 flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10 w-full rounded-xl border border-slate-200 pl-3 pr-10 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-600/15"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Profile' : 'Register Citizen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Details Modal / Drawer */}
      {(loadingDetails || selectedCitizenDetails) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {loadingDetails ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent mx-auto" />
                <p className="mt-3 text-xs font-semibold text-slate-500">Retrieving customer history & service records...</p>
              </div>
            ) : selectedCitizenDetails ? (
              <>
                {/* Modal Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold text-lg shadow-md">
                      {selectedCitizenDetails.citizen.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
                        {selectedCitizenDetails.citizen.name}
                        <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          Active Resident
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>📍 {selectedCitizenDetails.citizen.zone || officerZone}</span>
                        <span>•</span>
                        <span>{selectedCitizenDetails.citizen.email}</span>
                        <span>•</span>
                        <span>📞 {selectedCitizenDetails.citizen.phone || 'N/A'}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedCitizenDetails(null)}
                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 mt-3 gap-2 overflow-x-auto text-xs font-bold">
                  <button
                    onClick={() => setActiveDetailTab('overview')}
                    className={`flex items-center gap-1.5 pb-2 px-3 border-b-2 transition-all ${
                      activeDetailTab === 'overview'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <UserCheck className="h-4 w-4" />
                    Resident Summary
                  </button>

                  <button
                    onClick={() => setActiveDetailTab('grievances')}
                    className={`flex items-center gap-1.5 pb-2 px-3 border-b-2 transition-all ${
                      activeDetailTab === 'grievances'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <BadgeAlert className="h-4 w-4" />
                    Grievances ({selectedCitizenDetails.grievances?.length || 0})
                  </button>

                  <button
                    onClick={() => setActiveDetailTab('certificates')}
                    className={`flex items-center gap-1.5 pb-2 px-3 border-b-2 transition-all ${
                      activeDetailTab === 'certificates'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileCheck2 className="h-4 w-4" />
                    Certificates ({selectedCitizenDetails.certificates?.length || 0})
                  </button>

                  <button
                    onClick={() => setActiveDetailTab('taxes')}
                    className={`flex items-center gap-1.5 pb-2 px-3 border-b-2 transition-all ${
                      activeDetailTab === 'taxes'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Coins className="h-4 w-4" />
                    Taxes & Dues ({selectedCitizenDetails.taxes?.length || 0})
                  </button>

                  <button
                    onClick={() => setActiveDetailTab('schemes')}
                    className={`flex items-center gap-1.5 pb-2 px-3 border-b-2 transition-all ${
                      activeDetailTab === 'schemes'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Welfare Schemes ({selectedCitizenDetails.applications?.length || 0})
                  </button>
                </div>

                {/* Tab Content Body */}
                <div className="flex-1 overflow-y-auto pt-4 pb-2 text-xs">
                  {/* OVERVIEW TAB */}
                  {activeDetailTab === 'overview' && (
                    <div className="flex flex-col gap-4">
                      {/* Metric Summary Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Grievances Filed</p>
                          <p className="text-xl font-bold text-slate-800 mt-1">
                            {selectedCitizenDetails.grievances?.length || 0}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Certificates Requested</p>
                          <p className="text-xl font-bold text-slate-800 mt-1">
                            {selectedCitizenDetails.certificates?.length || 0}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Tax Invoices</p>
                          <p className="text-xl font-bold text-slate-800 mt-1">
                            {selectedCitizenDetails.taxes?.length || 0}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Welfare Schemes</p>
                          <p className="text-xl font-bold text-slate-800 mt-1">
                            {selectedCitizenDetails.applications?.length || 0}
                          </p>
                        </div>
                      </div>

                      {/* Personal Demographics Info */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h4 className="font-bold text-slate-800 text-xs mb-3 flex items-center gap-1.5">
                          <UserCheck className="h-4 w-4 text-indigo-600" />
                          Resident Demographics & Identity
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] font-semibold block">Full Name</span>
                            <span className="font-bold text-slate-800">{selectedCitizenDetails.citizen.name}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] font-semibold block">Gender & Age</span>
                            <span className="font-semibold text-slate-700">
                              {selectedCitizenDetails.citizen.gender || 'Male'} • {selectedCitizenDetails.citizen.age || 'N/A'} yrs
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] font-semibold block">Occupation</span>
                            <span className="font-semibold text-slate-700">{selectedCitizenDetails.citizen.occupation || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] font-semibold block">Annual Family Income</span>
                            <span className="font-bold text-emerald-700">
                              ₹{selectedCitizenDetails.citizen.income ? selectedCitizenDetails.citizen.income.toLocaleString('en-IN') : '0'} / year
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] font-semibold block">Gram Panchayath Ward</span>
                            <span className="font-semibold text-slate-700">{selectedCitizenDetails.citizen.ward || 'Ward 01'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] font-semibold block">Jurisdiction Zone</span>
                            <span className="font-bold text-blue-900">{selectedCitizenDetails.citizen.zone || officerZone}</span>
                          </div>
                        </div>

                        <div className="mt-3 border-t border-slate-100 pt-3">
                          <span className="text-slate-400 text-[10px] font-semibold block">Residential Address</span>
                          <span className="font-semibold text-slate-700">{selectedCitizenDetails.citizen.address || 'Address not listed'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GRIEVANCES TAB */}
                  {activeDetailTab === 'grievances' && (
                    <div className="flex flex-col gap-3">
                      {selectedCitizenDetails.grievances?.length === 0 ? (
                        <p className="text-center py-8 text-slate-400 italic">No grievances submitted by this resident.</p>
                      ) : (
                        selectedCitizenDetails.grievances.map((g: any) => (
                          <div key={g.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 text-xs">{g.title}</span>
                              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                                g.status === 'Resolved'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : g.status === 'In Progress'
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-rose-100 text-rose-800 border-rose-200'
                              }`}>
                                {g.status}
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px]">{g.description}</p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200/60 pt-2 mt-1">
                              <span>Category: {g.category}</span>
                              <span>Filed: {g.createdAt ? new Date(g.createdAt).toLocaleDateString() : 'N/A'}</span>
                            </div>

                            {/* Citizen Rating Feedback if present */}
                            {g.rating && (
                              <div className="mt-1 rounded-xl bg-amber-50/80 border border-amber-200 p-2 flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                  <span>Citizen Feedback: {g.rating} / 5 Stars</span>
                                  <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[9px]">
                                    {g.ratingFeedback || 'Satisfied'}
                                  </span>
                                </div>
                                {g.citizenFeedbackNote && (
                                  <span className="text-slate-600 italic font-medium">"{g.citizenFeedbackNote}"</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* CERTIFICATES TAB */}
                  {activeDetailTab === 'certificates' && (
                    <div className="flex flex-col gap-3">
                      {selectedCitizenDetails.certificates?.length === 0 ? (
                        <p className="text-center py-8 text-slate-400 italic">No certificate applications filed by this resident.</p>
                      ) : (
                        selectedCitizenDetails.certificates.map((cert: any) => (
                          <div key={cert.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-800">{cert.type} Certificate</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">Application ID: {cert.id}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Applied on: {cert.appliedAt ? new Date(cert.appliedAt).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                            <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold border ${
                              cert.status === 'Approved'
                                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60'
                                : cert.status === 'Rejected'
                                ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800/60'
                                : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
                            }`}>
                              {cert.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAXES TAB */}
                  {activeDetailTab === 'taxes' && (
                    <div className="flex flex-col gap-3">
                      {selectedCitizenDetails.taxes?.length === 0 ? (
                        <p className="text-center py-8 text-slate-400 italic">No tax invoices recorded for this resident.</p>
                      ) : (
                        selectedCitizenDetails.taxes.map((tax: any) => (
                          <div key={tax.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-800">{tax.taxType || tax.type || 'Panchayath Tax'}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">Due Date: {tax.dueDate || 'N/A'}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Billing Period: {tax.billingPeriod || 'Current FY'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-900 text-sm">₹{tax.amount?.toLocaleString('en-IN')}</p>
                              <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                tax.status === 'Paid'
                                  ? 'status-badge-paid bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border-emerald-500/60 shadow-xs'
                                  : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-400 dark:border-rose-600/50'
                              }`}>
                                {tax.status || 'Pending'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* SCHEMES TAB */}
                  {activeDetailTab === 'schemes' && (
                    <div className="flex flex-col gap-3">
                      {selectedCitizenDetails.applications?.length === 0 ? (
                        <p className="text-center py-8 text-slate-400 italic">No welfare scheme applications filed by this resident.</p>
                      ) : (
                        selectedCitizenDetails.applications.map((app: any) => (
                          <div key={app.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-slate-800">{app.schemeName || app.schemeTitle || 'Welfare Scheme'}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Application Date: {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'N/A'}</p>
                              </div>
                              <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold border ${
                                app.status === 'Approved'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : app.status === 'Rejected'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}>
                                {app.status || 'Under Review'}
                              </span>
                            </div>

                            {app.remarks && (
                              <p className="mt-1 text-xs text-rose-800 font-medium bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
                                <span className="font-bold">Officer Remarks:</span> {app.remarks}
                              </p>
                            )}

                            {/* Attached verification documents */}
                            {app.documents && app.documents.length > 0 && (
                              <div className="mt-2 border-t border-slate-200/60 pt-2 text-xs">
                                <p className="font-bold text-[10px] uppercase text-slate-500 tracking-wider mb-1.5">
                                  Uploaded Verification Documents ({app.documents.length}):
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {app.documents.map((doc: any, dIdx: number) => (
                                    <div key={dIdx} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                                      <span className="font-semibold text-slate-700 text-[11px] truncate">✓ {doc.docName}</span>
                                      <button
                                        type="button"
                                        onClick={() => setPreviewDoc({
                                          docName: doc.docName,
                                          fileName: doc.fileName,
                                          fileSize: doc.fileSize,
                                          fileData: doc.fileData,
                                          citizenName: selectedCitizenDetails.name,
                                          schemeName: app.schemeName || app.schemeTitle,
                                          uploadedAt: doc.uploadedAt || app.appliedAt
                                        })}
                                        className="flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100 transition-all shrink-0 ml-1"
                                      >
                                        <Eye className="h-3 w-3 text-blue-600" /> View
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="border-t border-slate-100 pt-3 mt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedCitizenDetails(null)}
                    className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all"
                  >
                    Close Records View
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 font-bold text-rose-600 shadow-sm">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-slate-800">
                  Delete Citizen Account
                </h3>
                <p className="text-xs text-slate-500">Citizen Management</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Are you sure you want to delete the account for <strong className="text-rose-900 font-bold">{deleteTarget.name}</strong> ({deleteTarget.email || deleteTarget.phone})?
              </p>
            </div>

            {/* Error Message Display */}
            {deleteError && (
              <div className="mt-3 rounded-2xl border border-rose-300 bg-rose-100/90 p-3 text-xs text-rose-900 font-semibold flex items-center gap-2">
                <X className="h-4 w-4 text-rose-700 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="mt-5 flex items-center justify-end gap-2.5 text-xs pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Deleting...' : 'Delete Citizen'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Document Viewer Modal */}
      <DocumentPreviewModal
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
}
