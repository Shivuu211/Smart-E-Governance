import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Shield,
  Coins,
  FileSpreadsheet,
  FileSignature,
  BadgeAlert,
  Bot,
  TrendingUp,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Building,
  Building2,
  Sparkles,
  Megaphone
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AnalyticsData, Notice, Asset, Payment } from '../types';
import OfficerPerformanceView from '../components/OfficerPerformanceView';
import { isProfileComplete, getProfileCompleteness, getMissingProfileFields } from '../utils/profileUtils';
import { getZoneOfficerDesignation } from '../utils/zoneUtils';

const sanitizeOfficerText = (text?: string) => {
  if (!text) return '';
  return text
    .replace(/Employees/g, 'Officers')
    .replace(/employees/g, 'officers')
    .replace(/Employee/g, 'Officer')
    .replace(/employee/g, 'officer');
};

export default function Dashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { user } = useAuth();

  const cachedAnalytics = api.getCachedSync('analytics');
  const cachedCerts = api.getCachedSync('certificates');
  const cachedGrievs = api.getCachedSync('grievances');
  const cachedTxs = api.getCachedSync('taxes');
  const cachedApps = api.getCachedSync('scheme_apps');
  const cachedNotices = api.getCachedSync('notices');
  const cachedAssets = api.getCachedSync('assets');
  const cachedPayments = api.getCachedSync('payments');

  const [data, setData] = useState<AnalyticsData | null>(cachedAnalytics || null);
  const [citizenCertificates, setCitizenCertificates] = useState<any[]>(cachedCerts || []);
  const [citizenGrievances, setCitizenGrievances] = useState<any[]>(cachedGrievs || []);
  const [citizenTaxes, setCitizenTaxes] = useState<any[]>(cachedTxs || []);
  const [citizenApplications, setCitizenApplications] = useState<any[]>(cachedApps || []);
  const [citizenNotices, setCitizenNotices] = useState<Notice[]>(cachedNotices || []);
  const [officerAssets, setOfficerAssets] = useState<Asset[]>(cachedAssets || []);
  const [paymentsList, setPaymentsList] = useState<Payment[]>(cachedPayments || []);

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedZone, setSelectedZone] = useState<string>('All Zones');

  const hasCachedData = user?.role === 'citizen'
    ? !!(cachedCerts || cachedGrievs || cachedTxs || cachedApps || cachedNotices)
    : !!(cachedAnalytics || cachedAssets || cachedPayments);

  const [loading, setLoading] = useState(!hasCachedData);

  useEffect(() => {
    async function loadData(bypassCache = false, isBackground = false) {
      try {
        if (user?.role === 'citizen') {
          const [certs, grivs, txs, apps, noticesList] = await Promise.all([
            api.getCertificates(bypassCache),
            api.getGrievances(bypassCache),
            api.getTaxes(),
            api.getSchemeApplications(bypassCache),
            api.getNotices()
          ]);
          if (certs) setCitizenCertificates(certs);
          if (grivs) setCitizenGrievances(grivs);
          if (txs) setCitizenTaxes(txs);
          if (apps) setCitizenApplications(apps);
          if (noticesList) setCitizenNotices(noticesList);
        } else {
          const [stats, assetsList, paymentsData] = await Promise.all([
            api.getAnalytics(bypassCache),
            api.getAssets(),
            api.getPayments()
          ]);
          if (stats) setData(stats);
          if (assetsList && Array.isArray(assetsList)) setOfficerAssets(assetsList);
          if (paymentsData && Array.isArray(paymentsData)) setPaymentsList(paymentsData);
        }
      } catch (err) {
        if (!isBackground) {
          console.error('Error loading dashboard data:', err);
        }
      } finally {
        if (!isBackground) {
          setLoading(false);
        }
      }
    }

    loadData();

    // Automatic Live Synchronization: Poll every 4 seconds for fresh metrics and recent grievances
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData(true, true);
      }
    }, 4000);

    // Auto-refresh data when the window/tab regains focus or visibility
    const handleFocus = () => {
      loadData(true, true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData(true, true);
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Helper to get citizen's jurisdiction area
  const getUserJurisdictionArea = (currentUser: any): string => {
    if (!currentUser) return 'Bengaluru South';
    if (currentUser.assignedZone && currentUser.assignedZone !== 'All' && currentUser.assignedZone !== 'All Zones') {
      return currentUser.assignedZone;
    }
    if (currentUser.zone && currentUser.zone !== 'All' && currentUser.zone !== 'All Zones') {
      return currentUser.zone;
    }
    const str = `${currentUser.taluk || ''} ${currentUser.gramPanchayath || ''} ${currentUser.district || ''} ${currentUser.address || ''}`;
    if (/north/i.test(str)) return 'Bengaluru North';
    if (/east/i.test(str)) return 'Bengaluru East';
    if (/west/i.test(str)) return 'Bengaluru West';
    if (/south/i.test(str)) return 'Bengaluru South';
    return 'Bengaluru South';
  };

  // ==========================================
  // CITIZEN DASHBOARD
  // ==========================================
  if (user?.role === 'citizen') {
    const profileComplete = isProfileComplete(user);
    const profileCompleteness = getProfileCompleteness(user);
    const missingFields = getMissingProfileFields(user);
    const userZone = getUserJurisdictionArea(user);

    // Filter zone-relevant notices (matches citizen's zone or targeted to All Areas)
    const zoneRelevantNotices = (citizenNotices || []).filter(n => {
      const target = n.targetZone || (n as any).targetArea || 'All Areas';
      return target === 'All' || target === 'All Areas' || target === 'All Zones' || target === userZone;
    });

    const latestNotice = zoneRelevantNotices.length > 0 ? zoneRelevantNotices[0] : null;

    // Accurate Scheme status calculations (supports Approved, Benefits Released, Enrolled, Sanctioned, etc.)
    const approvedSchemesCount = citizenApplications.filter(a => {
      const s = (a.status || '').toLowerCase().trim();
      return s === 'approved' || s === 'benefits released' || s === 'enrolled' || s === 'sanctioned';
    }).length;

    const pendingSchemesCount = citizenApplications.filter(a => {
      const s = (a.status || '').toLowerCase().trim();
      return s === 'pending' || s === 'application submitted' || s === 'under verification' || s === 'documents verified' || (s !== '' && s !== 'rejected' && s !== 'approved' && s !== 'benefits released' && s !== 'enrolled' && s !== 'sanctioned');
    }).length;

    const approvedCertsCount = citizenCertificates.filter(c => {
      const s = (c.status || '').toLowerCase().trim();
      return s === 'approved' || s === 'issued' || s === 'ready';
    }).length;

    const pendingCertsCount = citizenCertificates.filter(c => {
      const s = (c.status || '').toLowerCase().trim();
      return s === 'pending' || s === 'under review' || s === 'processing' || (s !== '' && s !== 'rejected' && s !== 'approved' && s !== 'issued' && s !== 'ready');
    }).length;

    const activeGrievancesCount = citizenGrievances.filter(g => {
      const s = (g.status || '').toLowerCase().trim();
      return s !== 'resolved' && s !== 'rejected' && s !== 'closed';
    }).length;

    const resolvedGrievancesCount = citizenGrievances.filter(g => {
      const s = (g.status || '').toLowerCase().trim();
      return s === 'resolved' || s === 'closed';
    }).length;

    return (
      <div className="flex flex-col gap-6">
        {/* Above Banner Action Bar in White Space */}
        <div className="flex items-center justify-end -mt-5 -mb-3">
          <button
            id="public-notices-top-white-space-btn"
            onClick={() => onNavigate('notices')}
            className="flex items-center gap-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/80 px-4 py-1.5 text-xs font-bold shadow-sm shadow-emerald-900/5 hover:shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <span className="text-sm leading-none">📢</span>
            <span>Public Notices</span>
            <span className="rounded-full bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 px-2 py-0.5 text-[10px] font-bold">
              {zoneRelevantNotices.length}
            </span>
          </button>
        </div>

        {/* Welcome Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-white shadow-lg shadow-blue-600/10 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                Citizen Portal
              </span>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Welcome, {user.name}!
              </h2>
              <p className="mt-1 text-xs text-blue-100">
                Manage your civic applications, bills, and grievances seamlessly.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-xs font-semibold backdrop-blur-md">
              <p className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="mt-1 text-[10px] text-blue-200">Current Session • Online Verified</p>
            </div>
          </div>
        </div>

        {/* Profile Completion Alert */}
        {!profileComplete && (
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-300 dark:border-amber-600/40 bg-amber-50/90 dark:bg-amber-950/40 p-4 shadow-sm sm:flex-row sm:items-center">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Complete Your Panchayath Profile ({profileCompleteness}%)
                </p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Missing required details: <span className="font-semibold text-amber-950 dark:text-amber-100">{missingFields.join(', ')}</span>. Please update your profile details to verify eligibility for state & central welfare schemes.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 bg-amber-200 dark:bg-amber-900/60 rounded-full h-2">
                <div className="bg-amber-600 dark:bg-amber-500 h-2 rounded-full transition-all duration-300" style={{ width: `${profileCompleteness}%` }}></div>
              </div>
              <button
                onClick={() => onNavigate('profile')}
                className="shrink-0 rounded-xl bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 dark:hover:bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white dark:text-slate-950 shadow-md shadow-amber-600/10 cursor-pointer transition-all active:scale-95"
              >
                Complete Profile
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Citizen Quick Metrics */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div
            onClick={() => onNavigate('certificates')}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <FileSignature className="h-5 w-5" />
            </div>
            <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400">My Certificates</p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
              {approvedCertsCount} Approved
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              {citizenCertificates.length} Applied • {pendingCertsCount} Pending
            </p>
          </div>

          <div
            onClick={() => onNavigate('grievances')}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <BadgeAlert className="h-5 w-5" />
            </div>
            <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Grievances Status</p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
              {activeGrievancesCount} Active
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              {citizenGrievances.length} Total • {resolvedGrievancesCount} Resolved
            </p>
          </div>

          <div
            onClick={() => onNavigate('taxes')}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Coins className="h-5 w-5" />
            </div>
            <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Taxes</p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
              ₹{(citizenTaxes || []).filter(t => t && t.status === 'Unpaid').reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()} Due
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              {citizenTaxes.filter(t => t.status === 'Unpaid').length} Unpaid bills
            </p>
          </div>

          <div
            onClick={() => onNavigate('schemes')}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Welfare Schemes</p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
              {citizenApplications.length} Applied
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              {pendingSchemesCount} Pending • {approvedSchemesCount} Approved
            </p>
          </div>
        </div>

        {/* Quick links & AI Mitra assistant widget */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* AI Gram Mitra Banner */}
          <div className="gram-mitra-ai-banner rounded-3xl p-6 shadow-sm lg:col-span-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 dark:bg-emerald-500 dark:shadow-emerald-950/40">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  Featured Smart Assistant
                </span>
                <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Talk to Gram Mitra AI
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-[#CBD5E1]">
                  Have doubts about government certificates, property tax calculations, or scheme eligibilities? Speak to Gram Mitra, our localized artificial intelligence assistant.
                </p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-gram-mitra'))}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/15 transition-all hover:bg-emerald-700 hover:shadow-emerald-700/20 cursor-pointer dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:shadow-emerald-950/30"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    Open Gram Mitra AI
                  </button>
                  <button
                    id="dashboard-ai-scheme-checker-btn"
                    onClick={() => {
                      onNavigate('schemes');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('open-ai-scheme-checker')), 150);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-100/90 hover:bg-emerald-200/90 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/80 px-4 py-2 text-xs font-bold transition-all cursor-pointer hover:scale-102"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>AI Scheme Checker</span>
                  </button>
                  {!profileComplete && (
                    <button
                      onClick={() => onNavigate('profile')}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer dark:border-[#334155] dark:bg-[#172033]/80 dark:text-slate-300 dark:hover:bg-[#243247]"
                    >
                      Complete Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tasks List */}
          <div className="flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-6 shadow-sm lg:col-span-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Portal Shortcuts
              </span>
              <h4 className="mt-1.5 font-display text-sm font-bold text-slate-800 dark:text-slate-100">Primary Tasks</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Quickly file details or run transactions</p>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => onNavigate('certificates')}
                className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700/80 p-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-[#243044] cursor-pointer"
              >
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Apply for Birth Certificate</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
              </button>
              <button
                onClick={() => onNavigate('grievances')}
                className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700/80 p-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-[#243044] cursor-pointer"
              >
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Submit Infrastructure Complain</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
              </button>
              <button
                onClick={() => onNavigate('taxes')}
                className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700/80 p-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-[#243044] cursor-pointer"
              >
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Pay Outstanding Utility Bills</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // OFFICER & ADMIN DASHBOARD
  // ==========================================
  const metrics = data?.metrics || {
    totalCitizens: 4,
    totalStaff: 3,
    activeSchemes: 2,
    totalRevenue: 0,
    totalCertificates: cachedCerts ? cachedCerts.length : 0,
    totalGrievances: cachedGrievs ? cachedGrievs.length : 0,
    pendingGrievances: 1,
    resolvedGrievances: 0,
    pendingCertificates: 1,
    approvedCertificates: 1,
  };

  const totalCertificatesCount = metrics.totalCertificates !== undefined 
    ? metrics.totalCertificates 
    : (cachedCerts ? cachedCerts.length : 0);

  const pendingCertificatesCount = metrics.pendingCertificates !== undefined
    ? metrics.pendingCertificates
    : (cachedCerts ? cachedCerts.filter((c: any) => c.status === 'Pending').length : 0);

  const approvedCertificatesCount = metrics.approvedCertificates !== undefined
    ? metrics.approvedCertificates
    : (cachedCerts ? cachedCerts.filter((c: any) => c.status === 'Approved').length : 0);

  const totalGrievancesCount = metrics.totalGrievances !== undefined 
    ? metrics.totalGrievances 
    : (cachedGrievs ? cachedGrievs.length : 0);

  const pendingGrievancesCount = metrics.pendingGrievances !== undefined
    ? metrics.pendingGrievances
    : (cachedGrievs ? cachedGrievs.filter((g: any) => g.status !== 'Resolved' && g.status !== 'Rejected').length : 0);

  const resolvedGrievancesCount = metrics.resolvedGrievances !== undefined
    ? metrics.resolvedGrievances
    : (cachedGrievs ? cachedGrievs.filter((g: any) => g.status === 'Resolved').length : 0);

  const officerZone = user?.assignedZone || user?.zone || 'Bengaluru South';

  // Filter assets belonging to the logged in officer's zone
  const zoneAssets = (officerAssets || []).filter(a => {
    if (!a) return false;
    if (user?.role === 'admin') return true;
    const aZone = a.zone;
    return !aZone || aZone === 'All' || aZone === 'All Zones' || aZone === officerZone;
  });

  const totalZoneAssetsCount = zoneAssets.length > 0 
    ? zoneAssets.length 
    : (metrics.totalAssets !== undefined ? metrics.totalAssets : 0);

  let activeAssetCount = 0;
  let maintenanceAssetCount = 0;
  let issueAssetCount = 0;

  if (zoneAssets.length > 0) {
    zoneAssets.forEach(a => {
      const s = (a.status || '').toLowerCase();
      const c = (a.condition || '').toLowerCase();
      if (c.includes('repair') || c.includes('damaged') || s.includes('issue') || s.includes('decommission') || s.includes('repair')) {
        issueAssetCount++;
      } else if (s.includes('maint')) {
        maintenanceAssetCount++;
      } else {
        activeAssetCount++;
      }
    });
  } else {
    activeAssetCount = metrics.activeAssets || 0;
    maintenanceAssetCount = metrics.maintenanceAssets || 0;
    issueAssetCount = metrics.issueAssets || 0;
  }

  const chartColors = ['#2563eb', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#64748b'];

  const isOfficer = user?.role === 'officer';
  const officerRawZone = user?.assignedZone || user?.zone || '';

  const normalizeZoneDisplayName = (zoneStr?: string) => {
    if (!zoneStr) return 'Assigned Zone';
    const z = zoneStr.toLowerCase();
    if (z.includes('north')) return 'North Zone';
    if (z.includes('south')) return 'South Zone';
    if (z.includes('east')) return 'East Zone';
    if (z.includes('west')) return 'West Zone';
    return zoneStr;
  };

  const officerDisplayZone = normalizeZoneDisplayName(officerRawZone);
  const activeZoneFilter = isOfficer ? (officerRawZone || officerDisplayZone) : selectedZone;
  const activeZoneDisplayLabel = isOfficer ? officerDisplayZone : selectedZone;

  // Zone matching helper
  const matchesZoneFilter = (zoneValue: string | undefined, filter: string) => {
    if (!isOfficer && (!filter || filter === 'All Zones' || filter === 'All')) return true;
    if (!zoneValue) return false;
    const z = zoneValue.toLowerCase();
    const f = filter.toLowerCase();
    if (f.includes('north') && z.includes('north')) return true;
    if (f.includes('south') && z.includes('south')) return true;
    if (f.includes('east') && z.includes('east')) return true;
    if (f.includes('west') && z.includes('west')) return true;
    return z === f;
  };

  // Extract authentic, deduplicated, successful/paid transactions (Single Source of Truth)
  const validDeduplicatedPayments = React.useMemo(() => {
    const seen = new Set<string>();
    const result: Payment[] = [];

    for (const p of paymentsList) {
      if (!p) continue;
      // Deduplicate by transactionId or payment id to prevent duplicate counting
      const uniqueKey = (p.transactionId || p.id || '').trim();
      if (!uniqueKey || seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);

      const status = (p.status || 'paid').toLowerCase().trim();
      // Exclude invalid, pending, failed, cancelled, refunded, reversed, or unpaid transactions
      if (
        status === 'pending' ||
        status === 'failed' ||
        status === 'cancelled' ||
        status === 'canceled' ||
        status === 'rejected' ||
        status === 'refunded' ||
        status === 'reversed' ||
        status === 'unpaid'
      ) {
        continue;
      }

      // Zone filter matching: All Zones or selected zone for Admin, officer's assigned zone for Officer
      if (!matchesZoneFilter(p.zone, activeZoneFilter)) {
        continue;
      }

      result.push(p);
    }
    return result;
  }, [paymentsList, activeZoneFilter, isOfficer]);

  // Total Tax Revenue Collected calculated strictly from citizen payment transaction records
  const totalTaxRevenueCollected = React.useMemo(() => {
    return validDeduplicatedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [validDeduplicatedPayments]);

  // Compute available years dynamically from actual payment transactions
  const currentCalendarYear = new Date().getFullYear();
  const availableYears = React.useMemo(() => {
    const years = new Set<number>([currentCalendarYear, currentCalendarYear - 1]);
    validDeduplicatedPayments.forEach(p => {
      if (p.paymentDate) {
        const y = new Date(p.paymentDate).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [validDeduplicatedPayments, currentCalendarYear]);

  // Compute 12-month data (January–December) from authentic paid transactions
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthFullNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const computedRevenueChart = React.useMemo(() => {
    return monthNames.map((name, index) => {
      const monthPayments = validDeduplicatedPayments.filter(p => {
        const d = new Date(p.paymentDate);
        return !isNaN(d.getTime()) && d.getFullYear() === selectedYear && d.getMonth() === index;
      });

      const revenue = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const transactionsCount = monthPayments.length;

      const breakdown: Record<string, number> = {};
      monthPayments.forEach(p => {
        const cat = p.taxType || p.type || 'Property Tax';
        breakdown[cat] = (breakdown[cat] || 0) + (Number(p.amount) || 0);
      });

      return {
        name,
        fullName: monthFullNames[index],
        monthIndex: index,
        year: selectedYear,
        revenue, // ₹0 if no revenue
        transactionsCount,
        breakdown,
      };
    });
  }, [validDeduplicatedPayments, selectedYear]);

  // Dynamic growth percentage calculation: current month vs previous month
  const { growthRate, growthType, currentMonthLabel, comparisonLabel } = React.useMemo(() => {
    const now = new Date();
    const currentCalYear = now.getFullYear();
    const currentCalMonth = now.getMonth();

    let curMonthIdx = 0;
    if (selectedYear === currentCalYear) {
      curMonthIdx = currentCalMonth;
    } else {
      const active = computedRevenueChart.filter(m => m.revenue > 0);
      curMonthIdx = active.length > 0 ? active[active.length - 1].monthIndex : 11;
    }

    const curMonthData = computedRevenueChart[curMonthIdx];
    const curRev = curMonthData ? curMonthData.revenue : 0;

    let prevRev = 0;
    let prevMonthName = '';

    if (curMonthIdx > 0) {
      const prevMonthData = computedRevenueChart[curMonthIdx - 1];
      prevRev = prevMonthData ? prevMonthData.revenue : 0;
      prevMonthName = monthNames[curMonthIdx - 1];
    } else {
      // January: compare with December of (selectedYear - 1)
      const prevYearDecPayments = validDeduplicatedPayments.filter(p => {
        const d = new Date(p.paymentDate);
        return !isNaN(d.getTime()) && d.getFullYear() === selectedYear - 1 && d.getMonth() === 11;
      });
      prevRev = prevYearDecPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      prevMonthName = `Dec ${selectedYear - 1}`;
    }

    let rate = 0;
    let type: 'increase' | 'decrease' | 'neutral' = 'neutral';

    if (prevRev === 0) {
      if (curRev > 0) {
        rate = 100;
        type = 'increase';
      } else {
        rate = 0;
        type = 'neutral';
      }
    } else {
      const diff = curRev - prevRev;
      rate = Number(((diff / prevRev) * 100).toFixed(1));
      if (rate > 0) {
        type = 'increase';
      } else if (rate < 0) {
        type = 'decrease';
      } else {
        type = 'neutral';
      }
    }

    return {
      growthRate: Math.abs(rate),
      growthType: type,
      currentMonthLabel: monthNames[curMonthIdx],
      comparisonLabel: prevMonthName || 'previous month'
    };
  }, [computedRevenueChart, validDeduplicatedPayments, selectedYear]);

  // Custom rich tooltip for Revenue Stream
  const RevenueCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const { fullName, year, revenue, transactionsCount, breakdown } = dataPoint;
      const categories = Object.entries(breakdown || {});

      return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-[#1E293B]/95 p-4 shadow-xl backdrop-blur-md min-w-[210px] text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2 mb-2.5">
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {fullName} {year}
            </span>
            <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80 px-2 py-0.5 text-[10px] font-bold">
              {transactionsCount} {transactionsCount === 1 ? 'Txn' : 'Txns'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Total Revenue:</span>
              <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                ₹{revenue.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-between items-center px-1">
              <span className="text-slate-500 dark:text-slate-400">Paid Transactions:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {transactionsCount}
              </span>
            </div>

            {categories.length > 0 ? (
              <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-700/80 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Category Breakdown
                </span>
                {categories.map(([category, amount]: [string, any]) => (
                  <div key={category} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                      <span className="truncate max-w-[120px]">{category}</span>
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      ₹{Number(amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              revenue === 0 && (
                <p className="text-[11px] text-slate-400 italic pt-1">
                  ₹0 collected (No paid transactions recorded)
                </p>
              )
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Head */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Welcome to Gram Panchayath Console
            </h2>
            {user?.role === 'officer' && (
              <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 border border-blue-200 dark:border-blue-700 px-3 py-1 text-xs font-extrabold text-blue-900 dark:text-blue-200 shadow-sm">
                Jurisdiction: {user.assignedZone || 'Bengaluru South'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {user?.role === 'admin'
              ? 'Sarpanch Operations Ledger & Jurisdiction Reassignment Desk'
              : `${getZoneOfficerDesignation(user?.assignedZone)} Desk — Monitoring residents and complaints in ${user?.assignedZone || 'Bengaluru South'}`}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <Clock className="mr-1.5 inline-block h-3.5 w-3.5 text-blue-500" />
          Active Status • Live Auditing
        </div>
      </div>

      {/* Statistics Cards */}
      <div className={user?.role === 'admin' ? "grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6" : "grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5"}>
        {user?.role === 'admin' ? (
          <>
            <div 
              onClick={() => onNavigate('residents')}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-5 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/50 transition-all cursor-pointer group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Total Registered Citizens</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.totalCitizens}</p>
            </div>

            <div 
              onClick={() => onNavigate('employees')}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-5 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all cursor-pointer group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <Shield className="h-5 w-5" />
              </div>
              <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Active Officers</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.totalStaff}</p>
            </div>

            <div 
              id="admin-tax-revenue-collected-card"
              onClick={() => onNavigate('admin-taxes')}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-5 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-500/50 transition-all cursor-pointer group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <Coins className="h-5 w-5" />
              </div>
              <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Tax Revenue Collected</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
                ₹{totalTaxRevenueCollected.toLocaleString('en-IN')}
              </p>
            </div>

            <div 
              onClick={() => onNavigate('admin-schemes')}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-5 shadow-sm hover:shadow-md hover:border-purple-300 dark:hover:border-purple-500/50 transition-all cursor-pointer group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                <Building className="h-5 w-5" />
              </div>
              <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Active Welfare Schemes</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.activeSchemes}</p>
            </div>

            <div 
              onClick={() => onNavigate('admin-certificates')}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-5 shadow-sm hover:shadow-md hover:border-teal-300 dark:hover:border-teal-500/50 transition-all cursor-pointer group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform">
                <FileSignature className="h-5 w-5" />
              </div>
              <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Certificates</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">{totalCertificatesCount}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-amber-600 dark:text-amber-400">{pendingCertificatesCount} Pending</span> • <span className="font-semibold text-emerald-600 dark:text-emerald-400">{approvedCertificatesCount} Approved</span>
              </p>
            </div>

            <div 
              onClick={() => onNavigate('admin-grievances')}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-5 shadow-sm hover:shadow-md hover:border-rose-300 dark:hover:border-rose-500/50 transition-all cursor-pointer group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                <BadgeAlert className="h-5 w-5" />
              </div>
              <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Grievances</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">{totalGrievancesCount}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-rose-600 dark:text-rose-400">{pendingGrievancesCount} Pending</span> • <span className="font-semibold text-emerald-600 dark:text-emerald-400">{resolvedGrievancesCount} Resolved</span>
              </p>
            </div>
          </>
        ) : (
          <>
            <div 
              onClick={() => onNavigate('officer-grievances')}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-5 shadow-sm hover:shadow-md hover:border-rose-300 dark:hover:border-rose-500/50 transition-all cursor-pointer group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                <BadgeAlert className="h-5 w-5" />
              </div>
              <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Complaints</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.pendingGrievances}</p>
            </div>

            <div 
              onClick={() => onNavigate('officer-certificates')}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-5 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/50 transition-all cursor-pointer group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                <FileSignature className="h-5 w-5" />
              </div>
              <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Certificates</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.pendingCertificates}</p>
            </div>

            <div 
              onClick={() => onNavigate('officer-grievances')}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-5 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all cursor-pointer group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <CheckCircle className="h-5 w-5" />
              </div>
              <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Resolved Complaints</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.resolvedGrievances}</p>
            </div>

            <div 
              onClick={() => onNavigate('officer-certificates')}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-5 shadow-sm hover:shadow-md hover:border-purple-300 dark:hover:border-purple-500/50 transition-all cursor-pointer group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                <FileSignature className="h-5 w-5" />
              </div>
              <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Approved Certificates</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.approvedCertificates}</p>
            </div>

            {/* 5. Panchayath Assets Card for Officer Dashboard */}
            <div 
              id="officer-panchayath-assets-card"
              onClick={() => onNavigate('asset-mgmt')}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-5 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all cursor-pointer group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                <Building2 className="h-5 w-5" />
              </div>
              <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Panchayath Assets</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">{totalZoneAssetsCount}</p>
            </div>
          </>
        )}
      </div>

      {/* Visual Analytics Charts Section (Admin/Officer only) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Revenue Collection Timeline */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-6 shadow-sm lg:col-span-8 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">
                  Gram Panchayath Revenue Streams
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80">
                  Live Tax Data
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Monthly public utility taxes collected in {selectedYear} • {activeZoneDisplayLabel}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Zone Filter (Admin) or Read-Only Zone Badge (Officer) */}
              {isOfficer ? (
                <div
                  id="officer-assigned-zone-badge"
                  className="flex items-center gap-1.5 rounded-xl border border-blue-200/90 dark:border-blue-800/80 bg-blue-50/90 dark:bg-blue-950/60 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 shadow-xs select-none"
                  title={`Assigned Jurisdiction: ${officerRawZone || officerDisplayZone}`}
                >
                  <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{officerDisplayZone}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 hidden sm:inline" />
                  <select
                    id="revenue-zone-filter"
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="All Zones">All Zones</option>
                    <option value="North Zone">North Zone</option>
                    <option value="South Zone">South Zone</option>
                    <option value="East Zone">East Zone</option>
                    <option value="West Zone">West Zone</option>
                  </select>
                </div>
              )}

              {/* Year Filter */}
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400 hidden sm:inline" />
                <select
                  id="revenue-year-filter"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none transition-colors cursor-pointer"
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Growth / Decline Badge */}
              {growthType === 'increase' && (
                <div 
                  id="revenue-growth-badge"
                  className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-1 rounded-xl shadow-xs"
                  title={`Compared to ${comparisonLabel}`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  +{growthRate}% Growth
                </div>
              )}
              {growthType === 'decrease' && (
                <div 
                  id="revenue-growth-badge"
                  className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 px-2.5 py-1 rounded-xl shadow-xs"
                  title={`Compared to ${comparisonLabel}`}
                >
                  <TrendingDown className="h-3.5 w-3.5" />
                  ↓ {growthRate}% Decline
                </div>
              )}
              {growthType === 'neutral' && (
                <div 
                  id="revenue-growth-badge"
                  className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl"
                  title={`Compared to ${comparisonLabel}`}
                >
                  0% Growth
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={computedRevenueChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-700/50" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tickFormatter={(val) => `₹${val}`} tick={{ fontSize: 11 }} />
                <Tooltip content={<RevenueCustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#2563eb" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)"
                  activeDot={{ r: 5, stroke: '#2563eb', strokeWidth: 2, fill: '#ffffff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Complaints categories distribution */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-6 shadow-sm lg:col-span-4">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">Grievances by Department</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Analysis of reported concerns</p>
          </div>
          <div className="mt-6 h-64 w-full text-xs">
            {data && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={data.grievancesByCategory} 
                  layout="vertical"
                  margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" className="dark:stroke-slate-700/50" />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={105} 
                    stroke="#94a3b8" 
                    interval={0}
                  />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]}>
                    {data.grievancesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Officer Performance Table for Admin */}
      {user?.role === 'admin' && (
        <OfficerPerformanceView />
      )}

      {/* Recent Activity Ledger (Admin) or Pending queues (Officer) */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-6 shadow-sm">
        <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">
          {user?.role === 'admin' ? 'Panchayath Audit Trails & Activity Logs' : 'My Queue Alerts'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {user?.role === 'admin' ? 'Traceable accountability system log' : 'Civic tasks pending resolution'}
        </p>

        <div className="mt-4 overflow-x-auto">
          {user?.role === 'admin' ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-[#172033] text-slate-500 dark:text-slate-300 font-bold">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Officer / User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Operation / Action</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium text-slate-700 dark:text-slate-200">
                {data && data.recentActivities.length > 0 ? (
                  data.recentActivities.map((log, index) => (
                    <tr key={log.id ? `${log.id}-${index}` : `log-${index}`} className="hover:bg-slate-50 dark:hover:bg-[#243044]">
                      <td className="p-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{log.userEmail}</td>
                      <td className="p-3 uppercase text-[10px] text-blue-600 dark:text-blue-400 font-bold">{log.userRole}</td>
                      <td className="p-3 font-semibold">{sanitizeOfficerText(log.action)}</td>
                      <td className="p-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">{sanitizeOfficerText(log.details)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400 dark:text-slate-500">
                      No system interactions logged yet. Perform operations to view audit trails.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#172033] p-4">
                <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center justify-between">
                  <span>Pending Certificates</span>
                  <span className="rounded-full bg-blue-100 dark:bg-blue-950/60 border border-transparent dark:border-blue-800/40 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                    {metrics.pendingCertificates} apps
                  </span>
                </h4>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Verify births, income limits, or residency.</p>
                <button
                  onClick={() => onNavigate('officer-certificates')}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Verify Certificates
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#172033] p-4">
                <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center justify-between">
                  <span>Grievances pending dispatch</span>
                  <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 border border-transparent dark:border-rose-900/40 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                    {metrics.pendingGrievances} complaints
                  </span>
                </h4>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Respond to water leaks, garbage dumps, or dark roads.</p>
                <button
                  onClick={() => onNavigate('officer-grievances')}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  Dispatch Officer
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#172033] p-4">
                <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center justify-between">
                  <span>Jurisdiction Citizens</span>
                  <span className="rounded-full bg-indigo-100 dark:bg-indigo-950/60 border border-transparent dark:border-indigo-800/40 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                    {user?.assignedZone || 'Jurisdiction'}
                  </span>
                </h4>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Manage residents & customer service records in your area.</p>
                <button
                  onClick={() => onNavigate('officer-citizens')}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  View Residents
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
