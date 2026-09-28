import React, { useState, useEffect, useMemo } from 'react';
import {
  Building,
  Plus,
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle,
  MapPin,
  FileText,
  Camera,
  Calendar,
  UserCheck,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  X,
  Upload,
  Download,
  Check,
  Compass,
  Tag,
  DollarSign,
  Clock,
  Briefcase,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { Asset, Employee } from '../types';
import AssetMapPicker from '../components/AssetMapPicker';
import { useAuth } from '../context/AuthContext';
import { getZoneOfficerDesignation } from '../utils/zoneUtils';
import { sanitizeDateYear, validate4DigitYear } from '../utils/dateValidation';

const CATEGORIES = [
  'Water & Sanitation',
  'Buildings & Offices',
  'Roads & Drainage',
  'Lighting Infrastructure',
  'Panchayath Vehicles',
  'Parks & Recreation',
  'Schools & Healthcare',
];

const WARDS = [
  'Ward 1',
  'Ward 2',
  'Ward 3',
  'Ward 4',
  'Ward 5',
  'Gollahalli Village',
  'Yelahanka Sector',
  'Whitefield Area',
];

const DEPARTMENTS = [
  'Public Works',
  'Water & Sanitation',
  'Electrical & Energy',
  'Health & Hygiene',
  'Revenue & Admin',
];

const DEFAULT_OFFICERS_FALLBACK = [
  'Ananya Rao',
  'Karthik Gowda',
  'Sunita Sharma',
  'Vijay Deshmukh',
  'Rajesh Kumar Singh',
];

const AREA_OFFICER_MAP: Record<string, { name: string; role: string }> = {
  'Bengaluru North': { name: 'Vijay Deshmukh', role: getZoneOfficerDesignation('Bengaluru North') },
  'Bengaluru East': { name: 'Ananya Rao', role: getZoneOfficerDesignation('Bengaluru East') },
  'Bengaluru South': { name: 'Sunita Sharma', role: getZoneOfficerDesignation('Bengaluru South') },
  'Bengaluru West': { name: 'Karthik Gowda', role: getZoneOfficerDesignation('Bengaluru West') },
};

const LIFESPANS = [
  '1 Year',
  '3 Years',
  '5 Years',
  '10 Years',
  '15 Years',
  '20+ Years',
];

const CONDITIONS = [
  {
    label: 'Excellent',
    color: 'bg-emerald-500',
    text: 'text-emerald-950 bg-emerald-100 border-emerald-500 dark:text-emerald-300 dark:bg-emerald-950/80 dark:border-emerald-500',
  },
  {
    label: 'Good',
    color: 'bg-yellow-500',
    text: 'text-yellow-950 bg-yellow-100 border-yellow-500 dark:text-yellow-300 dark:bg-yellow-950/80 dark:border-yellow-500',
  },
  {
    label: 'Needs Repair',
    color: 'bg-orange-500',
    text: 'text-orange-950 bg-orange-100 border-orange-500 dark:text-orange-300 dark:bg-orange-950/80 dark:border-orange-500',
  },
  {
    label: 'Damaged',
    color: 'bg-rose-500',
    text: 'text-rose-950 bg-rose-100 border-rose-500 dark:text-rose-300 dark:bg-rose-950/80 dark:border-rose-500',
  },
];

const getUserJurisdictionZone = (currentUser: any): string => {
  if (!currentUser) return 'Bengaluru South';
  if (currentUser.role === 'admin') return 'All Zones';

  if (currentUser.assignedZone && currentUser.assignedZone !== 'All' && currentUser.assignedZone !== 'All Zones') {
    return currentUser.assignedZone;
  }
  if (currentUser.zone && currentUser.zone !== 'All' && currentUser.zone !== 'All Zones') {
    return currentUser.zone;
  }
  if (currentUser.role === 'officer') return '';

  const str = `${currentUser.taluk || ''} ${currentUser.gramPanchayath || ''} ${currentUser.district || ''} ${currentUser.address || ''}`;
  if (/north/i.test(str)) return 'Bengaluru North';
  if (/east/i.test(str)) return 'Bengaluru East';
  if (/west/i.test(str)) return 'Bengaluru West';
  if (/south/i.test(str)) return 'Bengaluru South';

  return 'Bengaluru South';
};

const getAssetZone = (asset: Asset): string => {
  if (asset.zone && asset.zone !== 'All' && asset.zone !== 'All Zones') return asset.zone;
  if (asset.responsibleOfficer === 'Vijay Deshmukh') return 'Bengaluru North';
  if (asset.responsibleOfficer === 'Ananya Rao') return 'Bengaluru East';
  if (asset.responsibleOfficer === 'Sunita Sharma') return 'Bengaluru South';
  if (asset.responsibleOfficer === 'Karthik Gowda') return 'Bengaluru West';

  const str = `${asset.location || ''} ${asset.ward || ''} ${asset.description || ''}`;
  if (/north/i.test(str)) return 'Bengaluru North';
  if (/east/i.test(str)) return 'Bengaluru East';
  if (/west/i.test(str)) return 'Bengaluru West';
  if (/south/i.test(str)) return 'Bengaluru South';

  return 'Bengaluru South';
};

const mapAssetCategoryToGrievanceCategory = (assetCat?: string): string => {
  if (!assetCat) return 'Others';
  if (assetCat.includes('Water')) return 'Water Supply';
  if (assetCat.includes('Lighting') || assetCat.includes('Street')) return 'Street Light';
  if (assetCat.includes('Roads')) return 'Road Damage';
  if (assetCat.includes('Drainage')) return 'Drainage';
  return 'Others';
};

const getUserDefaultAreaAndOfficer = (currentUser: any) => {
  if (currentUser) {
    if (currentUser.role === 'officer') {
      const zone = currentUser.assignedZone || currentUser.zone || '';
      return {
        area: zone,
        officer: currentUser.name || 'Officer',
        role: AREA_OFFICER_MAP[zone]?.role || getZoneOfficerDesignation(zone),
      };
    }
    if (currentUser.role === 'admin') {
      return {
        area: 'Bengaluru South',
        officer: currentUser.name || 'Rajesh Kumar Singh',
        role: 'Chief Panchayath Administrator (Admin HQ)',
      };
    }
  }
  return { area: 'Bengaluru South', officer: 'Sunita Sharma', role: getZoneOfficerDesignation('Bengaluru South') };
};

export default function AdminAssetMgmt() {
  const { user } = useAuth();
  const initialDefaults = getUserDefaultAreaAndOfficer(user);

  const cachedAssets = api.getCachedSync('assets');
  const [assets, setAssets] = useState<Asset[]>(cachedAssets || []);
  const [loading, setLoading] = useState(!cachedAssets);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);

  // Compute dynamic officer names from active employees directory
  const dynamicOfficers = useMemo(() => {
    const activeEmps = employeesList.filter(e => !e.status || e.status === 'Active');
    const names = activeEmps.map(e => e.name).filter(Boolean);
    if (names.length === 0) {
      DEFAULT_OFFICERS_FALLBACK.forEach(defName => {
        if (!names.includes(defName)) {
          names.push(defName);
        }
      });
    }
    if (user?.role === 'officer' && user?.name && !names.includes(user.name)) {
      names.push(user.name);
    }
    return names;
  }, [employeesList, user]);

  const getDynamicAreaOfficer = (zone: string) => {
    const activeEmps = employeesList.filter(e => !e.status || e.status === 'Active');
    const norm = (zone || '').trim().toLowerCase();
    const found = activeEmps.find(e => {
      const ez = (e.assignedZone || '').trim().toLowerCase();
      return ez === norm || ez.includes(norm.replace('bengaluru', '').trim());
    });
    if (found) {
      return { name: found.name, role: found.role || getZoneOfficerDesignation(zone) };
    }
    return { name: `${zone} Officer`, role: getZoneOfficerDesignation(zone) };
  };

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedWard, setSelectedWard] = useState<string>('All');
  const [selectedCondition, setSelectedCondition] = useState<string>('All');
  const [adminZoneFilter, setAdminZoneFilter] = useState<string>('All Zones');

  // Report Issue Modal State (for Citizens)
  const [assetForReport, setAssetForReport] = useState<Asset | null>(null);
  const [reportCategory, setReportCategory] = useState<string>('Water Supply');
  const [reportUrgency, setReportUrgency] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState('');

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAssetForView, setSelectedAssetForView] = useState<Asset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; name: string; code?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form Fields
  const [assetIdCode, setAssetIdCode] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Water & Sanitation');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [ward, setWard] = useState('');
  const [selectedArea, setSelectedArea] = useState(initialDefaults.area);
  const [latitude, setLatitude] = useState<number | null>(12.9063);
  const [longitude, setLongitude] = useState<number | null>(77.5857);
  const [installationDate, setInstallationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [cost, setCost] = useState('');
  const [expectedLifespan, setExpectedLifespan] = useState('5 Years');
  const [department, setDepartment] = useState('Public Works');
  const [responsibleOfficer, setResponsibleOfficer] = useState(initialDefaults.officer);
  const [status, setStatus] = useState('Active');
  const [condition, setCondition] = useState('Good');
  const [photoData, setPhotoData] = useState<string>('');
  const [invoiceData, setInvoiceData] = useState<string>('');
  const [invoiceName, setInvoiceName] = useState<string>('');
  const [remarks, setRemarks] = useState('');

  const [saving, setSaving] = useState(false);

  const loadAssets = async () => {
    try {
      const list = await api.getAssets();
      if (list && Array.isArray(list)) {
        setAssets(list);
      }
    } catch (err) {
      console.error('Error loading assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const list = await api.getEmployees();
      if (list && Array.isArray(list)) {
        setEmployeesList(list);
      }
    } catch (err) {
      console.error('Error loading employees in Asset Management:', err);
    }
  };

  const generateNewAssetCode = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `AST-${new Date().getFullYear()}-${randomNum}`;
  };

  useEffect(() => {
    loadAssets();
    loadEmployees();

    const handleSync = () => {
      loadEmployees();
      loadAssets();
    };
    window.addEventListener('officers-synced', handleSync);
    return () => window.removeEventListener('officers-synced', handleSync);
  }, []);

  useEffect(() => {
    if (user && !editingAsset) {
      if (user.role === 'officer') {
        setResponsibleOfficer(user.name);
        const zone = user.assignedZone || user.zone;
        if (zone && AREA_OFFICER_MAP[zone]) {
          setSelectedArea(zone);
        }
      } else if (user.role === 'admin') {
        setResponsibleOfficer(user.name || 'Rajesh Kumar Singh');
      }
    }
  }, [user, editingAsset]);

  const resetForm = () => {
    const defs = getUserDefaultAreaAndOfficer(user);
    setEditingAsset(null);
    setAssetIdCode(generateNewAssetCode());
    setTitle('');
    setCategory('Water & Sanitation');
    setDescription('');
    setLocation('');
    setWard('');
    setSelectedArea(defs.area);
    setLatitude(12.9063);
    setLongitude(77.5857);
    setInstallationDate(new Date().toISOString().split('T')[0]);
    setCost('');
    setExpectedLifespan('5 Years');
    setDepartment('Public Works');

    if (user?.role === 'officer') {
      setResponsibleOfficer(user.name);
    } else {
      setResponsibleOfficer(user?.name || defs.officer);
    }

    setStatus('Active');
    setCondition('Good');
    setPhotoData('');
    setInvoiceData('');
    setInvoiceName('');
    setRemarks('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setAssetIdCode(
      asset.assetIdCode ||
        `AST-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
    );
    setTitle(asset.title || asset.name || '');
    setCategory(asset.category || 'Water & Sanitation');
    setDescription(asset.description || '');
    setLocation(asset.location || '');
    setWard(asset.ward || '');

    // Infer Area/Zone from responsible officer or location/ward
    let initialArea = user?.role === 'officer' ? (user.assignedZone || user.zone || '') : (asset.zone || 'Bengaluru East');
    if (user?.role !== 'officer') {
      if (asset.responsibleOfficer === 'Vijay Deshmukh') initialArea = 'Bengaluru North';
      else if (asset.responsibleOfficer === 'Ananya Rao') initialArea = 'Bengaluru East';
      else if (asset.responsibleOfficer === 'Sunita Sharma') initialArea = 'Bengaluru South';
      else if (asset.responsibleOfficer === 'Karthik Gowda') initialArea = 'Bengaluru West';
    }

    setSelectedArea(initialArea);

    if (user?.role === 'officer') {
      setResponsibleOfficer(user.name);
    } else {
      setResponsibleOfficer(asset.responsibleOfficer || user?.name || 'Rajesh Kumar Singh');
    }

    setLatitude(asset.latitude !== undefined ? asset.latitude : 12.9063);
    setLongitude(asset.longitude !== undefined ? asset.longitude : 77.5857);
    setInstallationDate(
      asset.installationDate || new Date().toISOString().split('T')[0]
    );
    setCost(asset.cost !== undefined ? String(asset.cost) : '');
    setExpectedLifespan(asset.expectedLifespan || '5 Years');
    setDepartment(asset.department || 'Public Works');
    setStatus(asset.status || 'Active');
    setCondition(asset.condition || 'Good');
    setPhotoData(asset.photoData || '');
    setInvoiceData(asset.invoiceData || '');
    setInvoiceName(asset.invoiceName || '');
    setRemarks(asset.remarks || '');
    setShowModal(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo size exceeds 5MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('File size exceeds 8MB limit.');
      return;
    }
    setInvoiceName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setInvoiceData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Asset Title is required.');
      return;
    }
    if (!location.trim()) {
      alert('Location is required.');
      return;
    }
    if (!cost) {
      alert('Valuation Cost is required.');
      return;
    }

    if (installationDate) {
      const err = validate4DigitYear(installationDate, 1900, 2099, 'Purchase / Installation Date');
      if (err) {
        alert(err);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        assetIdCode,
        name: title.trim(),
        title: title.trim(),
        category,
        type: category,
        description,
        location,
        ward,
        latitude,
        longitude,
        zone: selectedArea,
        installationDate,
        cost: Number(cost),
        expectedLifespan,
        department,
        responsibleOfficer: user?.role === 'officer' ? user.name : (responsibleOfficer || user?.name || 'Rajesh Kumar Singh'),
        status,
        condition,
        photoData,
        invoiceData,
        invoiceName,
        remarks,
      };

      if (editingAsset) {
        await api.updateAsset(editingAsset.id, payload);
      } else {
        await api.createAsset(payload);
      }

      setShowModal(false);
      resetForm();
      await loadAssets();
    } catch (err: any) {
      alert(err.message || 'Failed to save asset lifecycle record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string, code?: string) => {
    setAssetToDelete({ id, name, code });
  };

  const confirmDeleteAsset = async () => {
    if (!assetToDelete) return;
    setDeleting(true);
    try {
      await api.deleteAsset(assetToDelete.id);
      if (selectedAssetForView?.id === assetToDelete.id) {
        setSelectedAssetForView(null);
      }
      setAssetToDelete(null);
      await loadAssets();
    } catch (err: any) {
      alert(err.message || 'Failed to delete asset.');
    } finally {
      setDeleting(false);
    }
  };

  // Status & condition color badges
  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'Active':
      case 'Operational':
        return 'bg-emerald-600 dark:bg-emerald-600 text-white border-emerald-500 shadow-xs';
      case 'Maintenance':
      case 'Maintenance Required':
        return 'bg-[#8B4513] dark:bg-[#8B4513] text-white dark:text-white border-[#8B4513] dark:border-[#8B4513] shadow-xs font-bold';
      case 'Under Repair':
        return 'bg-red-600 dark:bg-red-600 text-white dark:text-white border-red-600 dark:border-red-600 shadow-xs font-bold';
      case 'Decommissioned':
        return 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700';
    }
  };

  const getConditionStyle = (cond?: string) => {
    switch (cond) {
      case 'Excellent':
        return { dot: 'bg-emerald-500', badge: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-300 border-emerald-400 dark:border-emerald-600' };
      case 'Good':
        return { dot: 'bg-yellow-500', badge: 'bg-yellow-100 dark:bg-yellow-950/80 text-yellow-950 dark:text-yellow-300 border-yellow-400 dark:border-yellow-600' };
      case 'Needs Repair':
        return { dot: 'bg-orange-500', badge: 'bg-orange-100 dark:bg-orange-950/80 text-orange-950 dark:text-orange-300 border-orange-400 dark:border-orange-600' };
      case 'Damaged':
        return { dot: 'bg-rose-500', badge: 'bg-rose-100 dark:bg-rose-950/80 text-rose-950 dark:text-rose-300 border-rose-400 dark:border-rose-600' };
      default:
        return { dot: 'bg-slate-400', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700' };
    }
  };

  const handleOpenReportModal = (asset: Asset) => {
    setAssetForReport(asset);
    setReportCategory(mapAssetCategoryToGrievanceCategory(asset.category));
    setReportUrgency('Medium');
    setReportTitle(`Issue reported for asset: ${asset.title || asset.name}`);
    setReportDescription(`Reporting maintenance issue with Panchayath Asset [${asset.assetIdCode || asset.id}]: "${asset.title || asset.name}" located at ${asset.location}. `);
    setReportSuccess('');
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForReport) return;
    if (!reportTitle.trim() || !reportDescription.trim()) {
      alert('Please enter both issue title and description.');
      return;
    }

    if (reportDescription.trim().length > 500) {
      alert('Problem description cannot exceed 500 characters.');
      return;
    }

    setSubmittingReport(true);
    try {
      const payload = {
        title: reportTitle.trim(),
        description: reportDescription.trim(),
        category: reportCategory,
        urgency: reportUrgency,
        location: assetForReport.location,
        zone: assetForReport.zone || getUserJurisdictionZone(user),
        latitude: assetForReport.latitude,
        longitude: assetForReport.longitude,
        image: assetForReport.photoData || undefined,
      };

      await api.submitGrievance(payload);
      setReportSuccess(`Grievance ticket successfully raised for "${assetForReport.title || assetForReport.name}"! Assigned to Zonal Officer.`);
      setTimeout(() => {
        setAssetForReport(null);
        setReportSuccess('');
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit grievance report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Role & Jurisdiction flags
  const userZone = getUserJurisdictionZone(user);
  const isCitizen = user?.role === 'citizen';
  const isOfficer = user?.role === 'officer';
  const isAdmin = user?.role === 'admin';

  // Filtered Assets list
  const filteredAssets = assets.filter((asset) => {
    const assetZone = getAssetZone(asset);
    // 1. Role-Based Zone / Jurisdiction Filtering
    if (isCitizen) {
      if (assetZone !== userZone) return false;
    } else if (isOfficer) {
      if (assetZone !== userZone) return false;
    } else if (isAdmin && adminZoneFilter !== 'All Zones') {
      if (assetZone !== adminZoneFilter) return false;
    }

    const assetTitle = (asset.title || asset.name || '').toLowerCase();
    const assetCode = (asset.assetIdCode || '').toLowerCase();
    const assetLoc = (asset.location || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      !query ||
      assetTitle.includes(query) ||
      assetCode.includes(query) ||
      assetLoc.includes(query);

    const matchesCategory =
      selectedCategory === 'All' || asset.category === selectedCategory;
    const matchesWard = selectedWard === 'All' || asset.ward === selectedWard;
    const matchesCondition =
      selectedCondition === 'All' || asset.condition === selectedCondition;

    return matchesSearch && matchesCategory && matchesWard && matchesCondition;
  });

  const availableWards = useMemo(() => {
    const set = new Set<string>(WARDS);
    assets.forEach((a) => {
      if (a.ward && a.ward.trim()) {
        set.add(a.ward.trim());
      }
    });
    return Array.from(set);
  }, [assets]);

  // Calculate Metrics from filtered assets for the current jurisdiction
  const totalAssetsCount = filteredAssets.length;
  const totalValuation = filteredAssets.reduce((sum, a) => sum + (a.cost || 0), 0);
  const needsAttentionCount = filteredAssets.filter(
    (a) => a.condition === 'Needs Repair' || a.condition === 'Damaged' || a.status === 'Under Repair'
  ).length;
  const activeCount = filteredAssets.filter((a) => a.status === 'Active' || a.status === 'Operational').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-blue-100 dark:bg-blue-950/60 p-2 text-blue-700 dark:text-blue-300 border border-transparent dark:border-blue-800/50">
              <Building className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-extrabold text-slate-800 dark:text-[#F8FAFC]">
                Panchayath Assets & Infrastructure
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-[#CBD5E1]">
                Lifecycle tracking, GPS location mapping, and maintenance monitoring
              </p>
            </div>
          </div>
        </div>

        {!isCitizen && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Log Infrastructure Asset</span>
          </button>
        )}
      </div>

      {/* Role-Based Jurisdiction Banner */}
      {isOfficer && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/90 dark:bg-[#172033] p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-xs">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800 dark:text-indigo-400">
                Officer Zonal Jurisdiction
              </p>
              <p className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] mt-0.5">
                Assigned Area: <span className="text-indigo-700 dark:text-indigo-300 font-black">{userZone}</span> ({user?.name})
              </p>
              <p className="text-[11px] font-semibold text-slate-600 dark:text-[#CBD5E1]">
                Manage, maintain, and update public infrastructure assets assigned to your official jurisdiction.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-950/60 px-3 py-1 text-[11px] font-extrabold text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
            <UserCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Officer Control</span>
          </span>
        </div>
      )}

      {isAdmin && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/90 dark:bg-[#172033] p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-xs">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Admin HQ Central Register
              </p>
              <p className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] mt-0.5">
                Full Access across all <span className="text-emerald-700 dark:text-emerald-300 font-black">Gram Panchayath Zones</span>
              </p>
              <p className="text-[11px] font-semibold text-slate-600 dark:text-[#CBD5E1]">
                Master administration access to audit, create, modify, and manage public assets across all zones.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Master Admin Access</span>
          </span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4 shadow-2xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold border border-transparent dark:border-blue-800/40">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
              Total Logged Assets
            </p>
            <p className="font-display text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">
              {totalAssetsCount} <span className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">items</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4 shadow-2xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold border border-transparent dark:border-emerald-800/40">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
              Valuation Capital
            </p>
            <p className="font-display text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">
              ₹{totalValuation.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4 shadow-2xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-bold border border-transparent dark:border-amber-800/40">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
              Active & Operational
            </p>
            <p className="font-display text-2xl font-black text-slate-900 dark:text-[#F8FAFC]">
              {activeCount}{' '}
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                ({totalAssetsCount ? Math.round((activeCount / totalAssetsCount) * 100) : 0}%)
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4 shadow-2xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold border border-transparent dark:border-rose-800/40">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
              Needs Repair / Attention
            </p>
            <p className="font-display text-2xl font-black text-rose-700 dark:text-rose-400">
              {needsAttentionCount} <span className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">assets</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, Asset ID (AST-...), or location..."
              className="w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] pl-10 pr-4 py-2 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
            {/* Admin Zone Filter */}
            {isAdmin && (
              <select
                value={adminZoneFilter}
                onChange={(e) => setAdminZoneFilter(e.target.value)}
                className="rounded-xl border border-emerald-400 dark:border-emerald-600/80 bg-emerald-50 dark:bg-emerald-950/70 px-3 py-2 text-xs font-bold text-emerald-950 dark:text-white dark:!text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="All Zones" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Panchayath Zones</option>
                <option value="Bengaluru North" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Bengaluru North</option>
                <option value="Bengaluru South" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Bengaluru South</option>
                <option value="Bengaluru East" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Bengaluru East</option>
                <option value="Bengaluru West" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Bengaluru West</option>
              </select>
            )}

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#172033] px-3 py-2 text-xs font-bold text-slate-700 dark:text-white dark:!text-white focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {cat}
                </option>
              ))}
            </select>

            {/* Ward Filter */}
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#172033] px-3 py-2 text-xs font-bold text-slate-700 dark:text-white dark:!text-white focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Wards/Villages</option>
              {availableWards.map((w) => (
                <option key={w} value={w} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {w}
                </option>
              ))}
            </select>

            {/* Condition Filter */}
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#172033] px-3 py-2 text-xs font-bold text-slate-700 dark:text-white dark:!text-white focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Conditions</option>
              {CONDITIONS.map((c) => (
                <option key={c.label} value={c.label} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Assets Grid / Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="flex items-center gap-3 text-slate-500 text-xs font-semibold">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span>Loading Panchayath infrastructure records...</span>
          </div>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-12 text-center">
          <Building className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <h4 className="mt-3 text-sm font-bold text-slate-700 dark:text-[#F8FAFC]">No Assets Found</h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#94A3B8] max-w-sm mx-auto">
            No assets match your search or filter parameters. Try clearing your filters or logging a new asset.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Log Asset Now
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAssets.map((asset) => {
            const condStyle = getConditionStyle(asset.condition);
            return (
              <div
                key={asset.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-2xs hover:border-blue-400 dark:hover:border-emerald-500 hover:shadow-md transition-all"
              >
                <div>
                  {/* Card Header Tag Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/60">
                        {asset.assetIdCode || `AST-${asset.id.slice(0, 6)}`}
                      </span>
                      <span className="rounded bg-slate-100 dark:bg-[#172033] px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-[#CBD5E1] uppercase border border-slate-200/60 dark:border-[#334155]">
                        {asset.category || 'Infrastructure'}
                      </span>
                    </div>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 shrink-0 ${getStatusBadge(
                        asset.status
                      )}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                      <span>{asset.status}</span>
                    </span>
                  </div>

                  {/* Asset Photo Preview (if available) */}
                  {asset.photoData && (
                    <div className="mt-3 relative h-32 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-100 dark:bg-[#172033]">
                      <img
                        src={asset.photoData}
                        alt={asset.title || asset.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Title & Description */}
                  <h4 className="mt-3.5 font-display text-sm font-bold text-slate-900 dark:text-[#F8FAFC] line-clamp-1">
                    {asset.title || asset.name}
                  </h4>

                  {asset.description && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-[#CBD5E1] line-clamp-2 leading-relaxed">
                      {asset.description}
                    </p>
                  )}

                  {/* Location & GPS Info */}
                  <div className="mt-4 rounded-xl bg-slate-50/80 dark:bg-[#172033] border border-slate-100 dark:border-[#334155] p-2.5 flex flex-col gap-1.5 text-xs text-slate-600 dark:text-[#CBD5E1]">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <span className="font-semibold text-slate-800 dark:text-[#F8FAFC] line-clamp-1">
                        {asset.location}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 dark:border-[#334155]">
                      <span className="font-medium text-slate-500 dark:text-[#94A3B8]">
                        📍 {asset.ward || 'General'}
                      </span>

                      {asset.latitude && asset.longitude && (
                        <span className="font-mono text-[10px] text-blue-700 dark:text-blue-300 font-bold bg-blue-100/60 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-transparent dark:border-blue-800/40">
                          {asset.latitude.toFixed(4)}°, {asset.longitude.toFixed(4)}°
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Asset Attributes Grid */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 dark:bg-[#172033] p-2 border border-slate-100 dark:border-[#334155]">
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase">
                        Condition
                      </span>
                      <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 dark:text-[#F8FAFC]">
                        <span className={`h-2 w-2 rounded-full ${condStyle.dot}`}></span>
                        <span>{asset.condition || 'Good'}</span>
                      </span>
                    </div>

                    <div className="rounded-lg bg-slate-50 dark:bg-[#172033] p-2 border border-slate-100 dark:border-[#334155]">
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase">
                        Valuation Cost
                      </span>
                      <span className="mt-0.5 font-display text-xs font-black text-slate-900 dark:text-[#F8FAFC]">
                        ₹{(asset.cost || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Officer & Department */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-[#94A3B8]">
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      <span>{asset.responsibleOfficer || 'Sunita Sharma'}</span>
                    </span>
                    <span className="font-semibold text-slate-600 dark:text-[#CBD5E1]">
                      {asset.department || 'Public Works'}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-[#334155] pt-3">
                  <button
                    onClick={() => setSelectedAssetForView(asset)}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-emerald-400 hover:text-blue-800 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View & Map</span>
                  </button>

                  {!isCitizen && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(asset)}
                        className="p-1.5 text-slate-500 dark:text-[#CBD5E1] hover:text-blue-600 dark:hover:text-emerald-400 hover:bg-blue-50 dark:hover:bg-[#172033] rounded-lg transition-colors cursor-pointer"
                        title="Edit Asset"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(asset.id, asset.title || asset.name, asset.assetIdCode)}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Retire Asset"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LOG / EDIT ASSET MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="my-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 font-bold">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-extrabold text-slate-900">
                    {editingAsset ? 'Edit Infrastructure Asset' : 'Log Infrastructure Asset'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track asset throughout its complete lifecycle
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
              {/* Row 1: Title & Auto-Generated Asset ID */}
              <div className="grid gap-4 sm:grid-cols-12">
                <div className="sm:col-span-8">
                  <label className="text-xs font-extrabold text-slate-800">
                    Asset Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Overhead Water Storage Pump"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 px-3.5 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="text-xs font-extrabold text-slate-800">
                    Asset ID <span className="text-slate-400 font-normal">(Auto Generated)</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={assetIdCode}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 font-mono text-xs font-bold text-blue-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Category & Department */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-extrabold text-slate-800">
                    Asset Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        ▼ {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-800">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        ▼ {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800">Description</label>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {description.length} / 500
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide technical specs, location details, or purpose of asset..."
                  className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              {/* Location Address, Ward & Area/Zone */}
              <div className="grid gap-4 sm:grid-cols-12">
                <div className="sm:col-span-5">
                  <label className="text-xs font-extrabold text-slate-800">
                    Location Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Main Road, Near Community Hall"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 px-3.5 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-xs font-extrabold text-slate-800">
                    Ward / Village <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    placeholder="Enter ward or village..."
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 px-3.5 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="text-xs font-extrabold text-slate-800">
                    Area / Zone <span className="text-rose-500">*</span>
                  </label>
                  {isOfficer ? (
                    <input
                      type="text"
                      required
                      readOnly
                      value={selectedArea}
                      aria-readonly="true"
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-slate-100 px-3.5 text-xs font-bold text-slate-800 cursor-not-allowed"
                    />
                  ) : (
                    <select
                      value={selectedArea}
                      onChange={(e) => {
                        const area = e.target.value;
                        setSelectedArea(area);
                        const assignedOff = getDynamicAreaOfficer(area);
                        setResponsibleOfficer(assignedOff.name || user?.name || 'Chief Administrator');
                      }}
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none cursor-pointer"
                    >
                      {Object.keys(AREA_OFFICER_MAP).map((a) => (
                        <option key={a} value={a}>
                          ▼ {a}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Leaflet Map Integration */}
              <div>
                <AssetMapPicker
                  latitude={latitude}
                  longitude={longitude}
                  locationAddress={location}
                  onChangeLocation={(lat, lng, addr) => {
                    setLatitude(lat);
                    setLongitude(lng);
                    if (addr && !location) setLocation(addr);
                  }}
                />
              </div>

              {/* Purchase Date, Valuation Cost & Lifespan */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-800">
                    Purchase / Installation Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min="1900-01-01"
                    max="2099-12-31"
                    value={installationDate}
                    onChange={(e) => setInstallationDate(sanitizeDateYear(e.target.value))}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-800">
                    Valuation Cost (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="e.g. 240000"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 px-3.5 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-800">Expected Lifespan</label>
                  <select
                    value={expectedLifespan}
                    onChange={(e) => setExpectedLifespan(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    {LIFESPANS.map((life) => (
                      <option key={life} value={life}>
                        ▼ {life}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Responsible Officer (Auto Assigned for Officer / Selectable for Admin) & Operational Status */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-[#F8FAFC] block mb-1.5">
                    Responsible Officer <span className="text-rose-500">*</span>
                  </label>
                  {user?.role === 'officer' ? (
                    <div className="rounded-2xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/90 dark:bg-blue-950/50 p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-extrabold text-blue-950 dark:text-blue-200 uppercase tracking-wider">
                          Logged-in Officer
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          <Check className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
                          <span>Read-Only</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl bg-white dark:bg-[#172033] p-3 border border-blue-200 dark:border-blue-900/80 shadow-xs">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm shadow-xs">
                          👤
                        </div>
                        <div>
                          <h5 className="text-xs font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                            {user.name}
                          </h5>
                          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {getZoneOfficerDesignation(user.assignedZone)}
                          </p>
                          <p className="text-[10px] font-extrabold text-blue-800 dark:text-blue-400 mt-0.5">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-slate-50/90 dark:bg-[#172033] p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-extrabold text-slate-700 dark:text-[#CBD5E1] uppercase tracking-wider">
                          Assigned Officer
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-950/80 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                          <UserCheck className="h-3 w-3 text-blue-700 dark:text-blue-400" />
                          <span>Admin Control</span>
                        </span>
                      </div>
                      <select
                        value={responsibleOfficer}
                        onChange={(e) => setResponsibleOfficer(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#0F172A] px-3.5 text-xs font-bold text-slate-900 dark:text-[#F8FAFC] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none cursor-pointer shadow-xs"
                      >
                        {dynamicOfficers.map((offName) => (
                          <option key={offName} value={offName}>
                            👤 {offName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-800">Operational Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Active">▼ Active & Online</option>
                    <option value="Maintenance">▼ Scheduled Maintenance</option>
                    <option value="Under Repair">▼ Under Repair</option>
                    <option value="Decommissioned">▼ Decommissioned</option>
                  </select>
                </div>
              </div>

              {/* Condition (with dots as requested in prompt) */}
              <div>
                <label className="text-xs font-extrabold text-slate-900 dark:text-[#F8FAFC] block mb-2">Condition</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {CONDITIONS.map((condOption) => {
                    const isSelected = condition === condOption.label;
                    return (
                      <button
                        key={condOption.label}
                        type="button"
                        onClick={() => setCondition(condOption.label)}
                        className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? `${condOption.text} border-2 shadow-xs scale-[1.02]`
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${condOption.color}`}></span>
                        <span>{condOption.label}</span>
                        {isSelected && <Check className="ml-auto h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* File Uploads: Photo & Invoice/Warranty */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Upload Asset Photo */}
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 mb-2">
                    <Camera className="h-4 w-4 text-blue-600" />
                    <span>Upload Asset Photo 📷</span>
                  </label>

                  {photoData ? (
                    <div className="relative h-28 w-full overflow-hidden rounded-xl border border-slate-200">
                      <img
                        src={photoData}
                        alt="Asset preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPhotoData('')}
                        className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                      <Upload className="h-5 w-5 text-slate-400" />
                      <span className="mt-1 text-[11px] font-bold text-slate-700">Choose Image File</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Upload Invoice/Warranty */}
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 mb-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>Upload Invoice / Warranty (Optional) 📄</span>
                  </label>

                  {invoiceData ? (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold truncate">{invoiceName || 'Invoice_Document.pdf'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setInvoiceData('');
                          setInvoiceName('');
                        }}
                        className="text-rose-600 hover:text-rose-800 font-bold ml-2 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                      <Upload className="h-5 w-5 text-slate-400" />
                      <span className="mt-1 text-[11px] font-bold text-slate-700">Choose PDF / Doc</span>
                      <span className="text-[10px] text-slate-400">PDF, Image up to 8MB</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,image/*"
                        onChange={handleInvoiceUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="text-xs font-extrabold text-slate-800">Remarks</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter maintenance schedule notes, warranty terms, or officer remarks..."
                  className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="mt-2 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{saving ? 'Logging asset...' : editingAsset ? 'Update Asset' : 'Log Asset'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSET LIFECYCLE & GPS MAP VIEW MODAL */}
      {selectedAssetForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="my-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg">
                    {selectedAssetForView.assetIdCode || `AST-${selectedAssetForView.id}`}
                  </span>
                  <span className="rounded-full border px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-700">
                    {selectedAssetForView.category}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-bold flex items-center gap-1.5 ${getStatusBadge(
                      selectedAssetForView.status
                    )}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                    <span>{selectedAssetForView.status}</span>
                  </span>
                </div>
                <h3 className="mt-2 font-display text-lg font-black text-slate-900">
                  {selectedAssetForView.title || selectedAssetForView.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAssetForView(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-5 flex flex-col gap-6">
              {/* Image & Key Metrics Banner */}
              <div className="grid gap-4 sm:grid-cols-12">
                {selectedAssetForView.photoData && (
                  <div className="sm:col-span-5 h-48 w-full overflow-hidden rounded-2xl border border-slate-200">
                    <img
                      src={selectedAssetForView.photoData}
                      alt={selectedAssetForView.title || selectedAssetForView.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div
                  className={`${
                    selectedAssetForView.photoData ? 'sm:col-span-7' : 'sm:col-span-12'
                  } grid grid-cols-2 gap-3 text-xs`}
                >
                  <div className="rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#172033] p-3">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Valuation Cost</span>
                    <p className="mt-1 font-display text-base font-black text-slate-900 dark:text-[#F8FAFC]">
                      ₹{(selectedAssetForView.cost || 0).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#172033] p-3">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Asset Condition</span>
                    <p className="mt-1 font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-1.5">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          getConditionStyle(selectedAssetForView.condition).dot
                        }`}
                      ></span>
                      <span>{selectedAssetForView.condition || 'Good'}</span>
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#172033] p-3">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Department</span>
                    <p className="mt-1 font-bold text-slate-900 dark:text-[#F8FAFC]">
                      {selectedAssetForView.department || 'Public Works'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#172033] p-3">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                      Responsible Officer
                    </span>
                    <p className="mt-1 font-bold text-slate-900 dark:text-[#F8FAFC]">
                      {selectedAssetForView.responsibleOfficer || 'Sunita Sharma'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Map Section */}
              <div>
                <p className="text-xs font-extrabold text-slate-900 dark:text-[#F8FAFC] mb-2 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>GPS Location & Site Pin</span>
                </p>

                <AssetMapPicker
                  readOnly={true}
                  latitude={selectedAssetForView.latitude || 12.9063}
                  longitude={selectedAssetForView.longitude || 77.5857}
                  locationAddress={selectedAssetForView.location}
                  onChangeLocation={() => {}}
                />
              </div>

              {/* Lifecycle Info Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-slate-50/80 dark:bg-[#172033] p-4 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-[#F8FAFC] mb-3 flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Asset Lifecycle Details</span>
                </h4>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Ward / Village</span>
                    <p className="font-semibold text-slate-900 dark:text-[#F8FAFC] mt-0.5">
                      {selectedAssetForView.ward || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Installation Date</span>
                    <p className="font-semibold text-slate-900 dark:text-[#F8FAFC] mt-0.5">
                      {selectedAssetForView.installationDate || '2024-03-15'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Expected Lifespan</span>
                    <p className="font-semibold text-slate-900 dark:text-[#F8FAFC] mt-0.5">
                      {selectedAssetForView.expectedLifespan || '5 Years'}
                    </p>
                  </div>
                </div>

                {selectedAssetForView.remarks && (
                  <div className="mt-3 border-t border-slate-200/60 dark:border-slate-700/60 pt-3">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block">Remarks</span>
                    <p className="mt-1 text-slate-800 dark:text-[#CBD5E1] font-medium leading-relaxed">
                      {selectedAssetForView.remarks}
                    </p>
                  </div>
                )}

                {selectedAssetForView.invoiceData && (
                  <div className="mt-3 border-t border-slate-200/60 pt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      <span className="font-bold">
                        Attached Document: {selectedAssetForView.invoiceName || 'Invoice_Warranty.pdf'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedAssetForView.invoiceData && selectedAssetForView.invoiceData.startsWith('data:')) {
                          const link = document.createElement('a');
                          link.href = selectedAssetForView.invoiceData;
                          link.download = selectedAssetForView.invoiceName || `${selectedAssetForView.title || selectedAssetForView.name || 'Asset'}_Document.png`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        } else {
                          const textContent = `NAMMA PANCHAYATH OFFICIAL ASSET ATTESTATION RECORD\n\nAsset: ${selectedAssetForView.title || selectedAssetForView.name}\nCode: ${selectedAssetForView.code || selectedAssetForView.id}\nCategory: ${selectedAssetForView.category}\nZone / Location: ${selectedAssetForView.zone || 'Panchayath Zone'} - ${selectedAssetForView.location || 'Gram Panchayath'}\nStatus: ${selectedAssetForView.status}\nInvoice / Ref: ${selectedAssetForView.invoiceName || 'Official Document'}\nRecorded Value: ₹${(selectedAssetForView.purchaseCost || selectedAssetForView.value || 0).toLocaleString('en-IN')}\nGenerated Date: ${new Date().toLocaleString()}\nChecksum: GP-ASSET-2026-${Math.floor(100000 + Math.random() * 900000)}`;
                          const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${(selectedAssetForView.invoiceName || selectedAssetForView.title || selectedAssetForView.name || 'Asset_Record').replace(/\s+/g, '_')}.txt`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                        }
                      }}
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
              {isCitizen ? (
                <button
                  type="button"
                  onClick={() => setSelectedAssetForView(null)}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close View
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const asset = selectedAssetForView;
                      if (asset) {
                        handleDelete(asset.id, asset.title || asset.name, asset.assetIdCode);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    <span>Delete Asset</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const toEdit = selectedAssetForView;
                      setSelectedAssetForView(null);
                      handleOpenEditModal(toEdit);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Edit className="h-3.5 w-3.5 text-blue-600" />
                    <span>Edit Asset Records</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAssetForView(null)}
                    className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Close View
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REPORT ISSUE MODAL (For Citizens & Users) */}
      {assetForReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 font-bold">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-base font-extrabold text-slate-900">
                    Report Asset Issue / Grievance
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    Log an official issue for Gram Panchayath officer inspection
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAssetForReport(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="my-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-center">
                <CheckCircle className="mx-auto h-10 w-10 text-emerald-600" />
                <h4 className="mt-2 font-display text-sm font-bold text-emerald-900">
                  Grievance Submitted Successfully!
                </h4>
                <p className="mt-1 text-xs font-semibold text-emerald-700 leading-relaxed">
                  {reportSuccess}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="mt-4 flex flex-col gap-4 text-xs">
                {/* Target Asset Summary Box */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
                  <Building className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono text-[10px] font-extrabold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                      {assetForReport.assetIdCode || `AST-${assetForReport.id.slice(0, 6)}`}
                    </span>
                    <h4 className="mt-1 font-bold text-slate-900 text-xs">
                      {assetForReport.title || assetForReport.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>{assetForReport.location}</span>
                    </p>
                  </div>
                </div>

                {/* Grievance Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Grievance Category
                  </label>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Water Supply">Water Supply & Pipeline</option>
                    <option value="Street Light">Street Light & Electrical</option>
                    <option value="Road Damage">Road Damage & Potholes</option>
                    <option value="Drainage">Drainage & Sewage overflow</option>
                    <option value="Garbage">Garbage & Waste dumping</option>
                    <option value="Others">Others / Public Facility</option>
                  </select>
                </div>

                {/* Issue Urgency */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Severity / Urgency Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Low', 'Medium', 'High'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setReportUrgency(lvl)}
                        className={`rounded-xl py-2 text-center text-xs font-bold border transition-all cursor-pointer ${
                          reportUrgency === lvl
                            ? lvl === 'High'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : lvl === 'Medium'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                              : 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {lvl} Priority
                      </button>
                    ))}
                  </div>
                </div>

                {/* Issue Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Issue Brief Summary <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="e.g., Streetlight solar panel damaged / Water pump leaking"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Detailed Problem Description <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {reportDescription.length} / 500
                    </span>
                  </div>
                  <textarea
                    required
                    maxLength={500}
                    rows={3}
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Describe what is broken, when it started, and how it affects the locality..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Buttons */}
                <div className="mt-2 flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setAssetForReport(null)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/20 disabled:opacity-50"
                  >
                    {submittingReport ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Submitting Ticket...</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        <span>Submit Issue Ticket</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-base font-extrabold text-slate-900">
                  Retire & Remove Asset?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm permanent deletion from Gram Panchayath register
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-3.5 text-xs text-slate-700">
              <p className="font-medium">
                Are you sure you want to permanently delete the asset record for{' '}
                <strong className="text-slate-900 font-extrabold">
                  "{assetToDelete.name}"
                </strong>
                {assetToDelete.code && (
                  <span className="font-mono text-[11px] font-bold text-blue-700 ml-1">
                    ({assetToDelete.code})
                  </span>
                )}
                ?
              </p>
              <p className="mt-2 text-[11px] font-semibold text-rose-600">
                ⚠️ This action cannot be undone and will remove all lifecycle and valuation records.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAssetToDelete(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAsset}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Yes, Delete Asset</span>
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
