import React, { useState, useEffect } from 'react';
import { DocumentPreviewModal, PreviewDocData } from '../components/DocumentPreviewModal';
import AiSchemeCheckerModal from '../components/AiSchemeCheckerModal';
import {
  Search,
  Plus,
  Bot,
  Sparkles,
  Upload,
  FileCheck2,
  FileText,
  CheckCircle2,
  X,
  Paperclip,
  Trash2,
  Check,
  ShieldCheck,
  Clock,
  XCircle,
  Award,
  Gift,
  ArrowRight,
  Eye,
  Filter,
  CheckCircle,
  UserCheck,
  Building2,
  AlertCircle,
  RotateCcw,
  Users,
  MapPin,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Scheme, SchemeApplication, SchemeApplicationDoc } from '../types';

const CATEGORIES = [
  'All',
  'Housing',
  'Agriculture',
  'Education',
  'Women',
  'Senior Citizens',
  'Health'
];

const REQUIRED_DOCUMENTS_LIST = [
  'Aadhaar Card',
  'Income Certificate',
  'Ration Card',
  'Bank Passbook',
  'Passport Photo'
];

interface VerifyActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}

export const VerifyActionButton: React.FC<VerifyActionButtonProps> = ({
  onClick,
  disabled = false,
  className = '',
  title = 'Verify & Action'
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-9 w-[138px] min-w-[138px] max-w-[138px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 dark:bg-emerald-600 px-3.5 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 dark:hover:bg-emerald-700 active:scale-98 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <UserCheck className="h-3.5 w-3.5 shrink-0" />
      <span className="whitespace-nowrap font-bold text-xs">Verify & Action</span>
    </button>
  );
};

const TIMELINE_STAGES = [
  { key: 'Application Submitted', label: 'Application Submitted', desc: 'Received at Panchayat portal' },
  { key: 'Under Verification', label: 'Under Verification', desc: 'Assigned to Zone Panchayath Officer' },
  { key: 'Documents Verified', label: 'Documents Verified', desc: 'Verified Aadhaar, Income & Bank docs' },
  { key: 'Approved', label: 'Approved', desc: 'Sanctioned by Gram Panchayat' },
  { key: 'Benefits Released', label: 'Benefits Released', desc: 'Funds/Subsidies credited to account' }
];

export default function Schemes() {
  const { user } = useAuth();
  const cachedSchemes = api.getCachedSync('schemes');
  const cachedApps = api.getCachedSync('scheme_apps');
  const [schemes, setSchemes] = useState<Scheme[]>(cachedSchemes || []);
  const [applications, setApplications] = useState<SchemeApplication[]>(cachedApps || []);
  const [loading, setLoading] = useState(!cachedSchemes);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'schemes' | 'officer_desk'>('schemes');

  // Citizen Application Modal & Upload State
  const [applyModalScheme, setApplyModalScheme] = useState<Scheme | null>(null);
  const [attachedDocs, setAttachedDocs] = useState<Record<string, { fileName: string; fileSize: string; fileData?: string; uploadedAt: string }>>({});
  const [submittingApp, setSubmittingApp] = useState(false);

  // View Submitted Application & Timeline Modal
  const [viewDocsApp, setViewDocsApp] = useState<SchemeApplication | null>(null);

  // Officer Review Modal
  const [reviewApp, setReviewApp] = useState<SchemeApplication | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [docChecklist, setDocChecklist] = useState<Record<string, boolean>>({});

  // Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState<PreviewDocData | null>(null);

  // View All Applications Modal
  const [selectedSchemeForApplications, setSelectedSchemeForApplications] = useState<Scheme | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalZoneFilter, setModalZoneFilter] = useState('All');
  const [modalStatusFilter, setModalStatusFilter] = useState('All');

  // Admin Scheme Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [benefits, setBenefits] = useState('');
  const [eligibilityCriteria, setEligibilityCriteria] = useState('');
  const [department, setDepartment] = useState('Administration');
  const [category, setCategory] = useState('Housing');
  const [savingScheme, setSavingScheme] = useState(false);

  // Admin Scheme Deletion State
  const [schemeToDelete, setSchemeToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingScheme, setDeletingScheme] = useState(false);

  // Scheme Application Deletion State (Officer Only - Confirmation Modal)
  const [applicationToDelete, setApplicationToDelete] = useState<{ id: string; citizenName: string; schemeName: string } | null>(null);
  const [deletingApplication, setDeletingApplication] = useState(false);

  // AI Scheme Eligibility Advisor State
  const [showAiChecker, setShowAiChecker] = useState(false);

  const isOfficerOrAdmin = user?.role === 'officer' || user?.role === 'admin';

  // Helper to verify if the logged-in user is the respective designated zone officer
  const isRespectiveOfficer = (app?: SchemeApplication) => {
    if (user?.role !== 'officer') return false;
    if (!app || !app.zone || !user?.assignedZone) return true;
    const userZone = user.assignedZone.toLowerCase().trim();
    const appZone = app.zone.toLowerCase().trim();
    return userZone === 'all' || userZone === 'all zones' || userZone === appZone;
  };

  useEffect(() => {
    loadData();

    // Automatic Live Synchronization: Poll every 4 seconds for fresh schemes and applications
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData(true, true);
      }
    }, 4000);

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

    if (!isOfficerOrAdmin) {
      const handleOpenAiChecker = () => setShowAiChecker(true);
      window.addEventListener('open-ai-scheme-checker', handleOpenAiChecker);
      return () => {
        clearInterval(intervalId);
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('open-ai-scheme-checker', handleOpenAiChecker);
      };
    }

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOfficerOrAdmin, user]);

  const loadData = async (bypassCache = false, isBackground = false) => {
    try {
      const activeList = await api.getSchemes();
      if (activeList) setSchemes(activeList);
      if (user) {
        const userApps = await api.getSchemeApplications(bypassCache);
        if (userApps) {
          setApplications(userApps);
          setReviewApp(prev => {
            if (!prev) return null;
            const updated = userApps.find(a => a.id === prev.id);
            return updated || prev;
          });
          setViewDocsApp(prev => {
            if (!prev) return null;
            const updated = userApps.find(a => a.id === prev.id);
            return updated || prev;
          });
        }
      }
    } catch (err) {
      if (!isBackground) {
        console.error('Error loading schemes data:', err);
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  // Filter schemes
  const filteredSchemes = schemes.filter(s => {
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.benefits.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleOpenApplyModal = (scheme: Scheme) => {
    if (user?.role === 'citizen') {
      const existing = applications.find(a => a.schemeId === scheme.id && a.citizenId === user.id);
      if (existing && existing.status !== 'Rejected') {
        alert(`You have already submitted an active application for "${scheme.name}" (Status: ${existing.status}). Please check your progress timeline on the scheme card.`);
        return;
      }
    }
    setApplyModalScheme(scheme);
    setAttachedDocs({});
  };

  const handleFileUpload = (docName: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.round(file.size / 1024)} KB`;

      setAttachedDocs(prev => ({
        ...prev,
        [docName]: {
          fileName: file.name,
          fileSize: sizeStr,
          fileData: e.target?.result as string || '',
          uploadedAt: new Date().toISOString()
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (docName: string) => {
    setAttachedDocs(prev => {
      const copy = { ...prev };
      delete copy[docName];
      return copy;
    });
  };

  const handleAutoAttachSampleDocs = () => {
    const now = new Date().toISOString();
    setAttachedDocs({
      'Aadhaar Card': { fileName: 'Aadhaar_Card_Verified_7821.pdf', fileSize: '340 KB', uploadedAt: now },
      'Income Certificate': { fileName: 'Income_Certificate_2026.pdf', fileSize: '215 KB', uploadedAt: now },
      'Ration Card': { fileName: 'Ration_Card_Family_BPL.pdf', fileSize: '180 KB', uploadedAt: now },
      'Bank Passbook': { fileName: 'Passbook_Front_Statement.pdf', fileSize: '480 KB', uploadedAt: now },
      'Passport Photo': { fileName: 'Passport_Photo_Digital.jpg', fileSize: '92 KB', uploadedAt: now },
    });
  };

  const handleConfirmSubmitApplication = async () => {
    if (!applyModalScheme) return;
    
    const requiredDocs = applyModalScheme.requiredDocuments || REQUIRED_DOCUMENTS_LIST;
    const attachedKeys = Object.keys(attachedDocs);
    const missingDocs = requiredDocs.filter(d => !attachedKeys.includes(d));

    if (missingDocs.length > 0) {
      if (!window.confirm(`You have not attached: ${missingDocs.join(', ')}. Do you want to continue with auto-attached default copies?`)) {
        return;
      }
      handleAutoAttachSampleDocs();
    }

    setSubmittingApp(true);
    try {
      const docsArray: SchemeApplicationDoc[] = Object.entries(attachedDocs).map(([docName, val]: [string, any]) => ({
        docName,
        fileName: val.fileName,
        fileSize: val.fileSize,
        fileData: val.fileData || '',
        uploadedAt: val.uploadedAt || new Date().toISOString()
      }));

      await api.applyScheme(applyModalScheme.id, docsArray);
      alert(`Application submitted successfully for ${applyModalScheme.name}! All ${docsArray.length} required documents have been uploaded for verification.`);
      setApplyModalScheme(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Application failed.');
    } finally {
      setSubmittingApp(false);
    }
  };

  const handleOpenReview = (app: SchemeApplication) => {
    if (user?.role !== 'officer') {
      alert('Access Restricted: Only designated Panchayath Officers are authorized to verify, approve, or reject welfare scheme applications.');
      return;
    }
    if (!isRespectiveOfficer(app)) {
      alert(`Access Restricted: Only the designated officer for zone "${app.zone || 'assigned jurisdiction'}" can verify, approve, or reject this application.`);
      return;
    }
    setReviewApp(app);
    setReviewRemarks(app.remarks || '');
    const initialChecklist: Record<string, boolean> = {};
    const docs = app.documents && app.documents.length > 0 ? app.documents.map(d => d.docName) : REQUIRED_DOCUMENTS_LIST;
    docs.forEach(d => {
      initialChecklist[d] = true;
    });
    setDocChecklist(initialChecklist);
  };

  const handleUpdateApplicationStatus = async (newStatus: string) => {
    if (!reviewApp) return;
    setReviewing(true);
    try {
      await api.reviewSchemeApplication(reviewApp.id, newStatus, reviewRemarks);
      alert(`Application status updated to "${newStatus}". Notification sent to citizen ${reviewApp.citizenName}.`);
      setReviewApp(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update application status.');
    } finally {
      setReviewing(false);
    }
  };

  const handleCreateScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !eligibilityCriteria.trim()) {
      alert('Please fill in all required fields (Scheme Name, Description, and Eligibility Criteria).');
      return;
    }

    if (description.trim().length > 1000) {
      alert('Scheme Description cannot exceed 1000 characters.');
      return;
    }

    setSavingScheme(true);
    try {
      await api.createScheme({ 
        name: name.trim(), 
        description: description.trim(), 
        benefits: benefits.trim(), 
        eligibilityCriteria: eligibilityCriteria.trim(), 
        department,
        category,
        requiredDocuments: REQUIRED_DOCUMENTS_LIST
      });
      setShowCreateModal(false);
      setName('');
      setDescription('');
      setBenefits('');
      setEligibilityCriteria('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create scheme.');
    } finally {
      setSavingScheme(false);
    }
  };

  const handleConfirmDeleteScheme = async () => {
    if (!schemeToDelete) return;
    setDeletingScheme(true);
    try {
      await api.deleteScheme(schemeToDelete.id);
      if (selectedSchemeForApplications?.id === schemeToDelete.id) {
        setSelectedSchemeForApplications(null);
      }
      setSchemeToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete scheme.');
    } finally {
      setDeletingScheme(false);
    }
  };

  const getApplication = (schemeId: string) => {
    if (user?.role !== 'citizen') return undefined;
    return applications.find(a => a.schemeId === schemeId && a.citizenId === user?.id);
  };

  const getSchemeApplicationsList = (schemeId: string) => {
    return applications.filter(a => a.schemeId === schemeId);
  };

  const getSchemeZoneBreakdown = (schemeId: string) => {
    const schemeApps = applications.filter(a => a.schemeId === schemeId);
    const total = schemeApps.length;
    let south = 0;
    let north = 0;
    let east = 0;
    let west = 0;

    schemeApps.forEach(a => {
      const z = (a.zone || '').toLowerCase();
      if (z.includes('south')) south++;
      else if (z.includes('north')) north++;
      else if (z.includes('east')) east++;
      else if (z.includes('west')) west++;
      else south++;
    });

    return { total, south, north, east, west, schemeApps };
  };

  const getRecentApplicants = (schemeId: string, limit = 3) => {
    const schemeApps = applications.filter(a => a.schemeId === schemeId);
    return [...schemeApps]
      .sort((a, b) => new Date(b.appliedAt || 0).getTime() - new Date(a.appliedAt || 0).getTime())
      .slice(0, limit);
  };

  const getVerificationStatusBadge = (app: SchemeApplication) => {
    const verifiedCount = (app.documents || []).filter(d => d.verified).length;
    const totalCount = (app.documents || []).length || 5;

    if (app.status === 'Approved' || app.status === 'Benefits Released') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          Verified & Sanctioned
        </span>
      );
    }
    if (app.status === 'Documents Verified') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <FileCheck2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          Docs Verified ({verifiedCount}/{totalCount})
        </span>
      );
    }
    if (app.status === 'Under Verification') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          <Clock className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
          Under Officer Review
        </span>
      );
    }
    if (app.status === 'Rejected') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <XCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
          Rejected / Re-upload Needed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
        Pending Inspection ({totalCount} Docs)
      </span>
    );
  };

  const handleConfirmDeleteApplication = async () => {
    if (!applicationToDelete) return;
    setDeletingApplication(true);
    try {
      await api.deleteSchemeApplication(applicationToDelete.id);
      setApplications(prev => prev.filter(a => a.id !== applicationToDelete.id));
      setApplicationToDelete(null);
      await loadData();
    } catch (err: any) {
      console.error('Failed to delete application:', err);
      alert(err.message || 'Failed to delete application.');
    } finally {
      setDeletingApplication(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
      case 'Application Submitted':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60';
      case 'Under Verification':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800/60';
      case 'Documents Verified':
        return 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800/60';
      case 'Approved':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60';
      case 'Benefits Released':
        return 'bg-teal-100 dark:bg-teal-950/60 text-teal-900 dark:text-teal-300 border-teal-300 dark:border-teal-800/60';
      case 'Rejected':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800/60';
      default:
        return 'bg-slate-100 dark:bg-[#243044] text-slate-800 dark:text-[#CBD5E1] border-slate-300 dark:border-[#334155]';
    }
  };

  const getStageIndex = (status: string) => {
    if (status === 'Rejected') return -1;
    switch (status) {
      case 'Pending':
      case 'Application Submitted':
        return 0;
      case 'Under Verification':
        return 1;
      case 'Documents Verified':
        return 2;
      case 'Approved':
        return 3;
      case 'Benefits Released':
        return 4;
      default:
        return 0;
    }
  };

  // Timeline Renderer
  const renderProgressTimeline = (currentStatus: string, remarks?: string, onReapply?: () => void) => {
    if (currentStatus === 'Rejected') {
      return (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/90 dark:bg-rose-950/40 p-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md">
              <XCircle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h5 className="font-display font-bold text-rose-900 dark:text-rose-200 text-sm">Application Rejected</h5>
                <span className="rounded bg-rose-200/80 dark:bg-rose-900/60 px-2 py-0.5 text-[10px] font-bold text-rose-900 dark:text-rose-200 uppercase">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                Application did not fulfill verification criteria or uploaded documents need correction.
              </p>

              {/* Officer Remarks Display */}
              <div className="mt-3 rounded-xl border border-rose-300/80 dark:border-rose-900/60 bg-white dark:bg-[#1E293B] p-3 text-xs text-slate-800 dark:text-[#F8FAFC] shadow-2xs">
                <p className="font-extrabold text-rose-900 dark:text-rose-400 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  Officer Remarks:
                </p>
                <p className="font-semibold text-slate-800 dark:text-[#CBD5E1] leading-relaxed italic">
                  "{remarks ? remarks : 'No specific remarks were entered by the reviewing officer.'}"
                </p>
              </div>

              {/* Reapply Button - available ONLY when application got rejected */}
              {user?.role === 'citizen' && onReapply && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={onReapply}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 transition-all cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reapply for Scheme
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    const activeIdx = getStageIndex(currentStatus);

    return (
      <div className="py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Progress Timeline
          </span>
        </div>

        {/* Stepper Bar */}
        <div className="relative flex items-center justify-between mt-4 mb-2">
          {/* Connector Line */}
          <div className="absolute left-0 top-1/2 -z-0 h-1 w-full -translate-y-1/2 bg-slate-200 dark:bg-[#334155] rounded" />
          <div
            className="absolute left-0 top-1/2 -z-0 h-1 -translate-y-1/2 bg-emerald-500 transition-all duration-500 rounded"
            style={{ width: `${(activeIdx / (TIMELINE_STAGES.length - 1)) * 100}%` }}
          />

          {TIMELINE_STAGES.map((stage, idx) => {
            const isDone = idx < activeIdx;
            const isCurrent = idx === activeIdx;

            return (
              <div key={idx} className="relative z-10 flex flex-col items-center group">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs transition-all shadow-sm ${
                    isDone
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/60'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-950/60 animate-pulse'
                      : 'bg-white dark:bg-[#1E293B] text-slate-400 dark:text-slate-400 border-2 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span className={`mt-2 text-[10px] font-bold text-center max-w-[70px] leading-tight ${
                  isCurrent ? 'text-blue-700 dark:text-blue-400 font-extrabold' : isDone ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-400'
                }`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-800 dark:text-[#F8FAFC]">Gram Welfare Schemes & Direct Benefits</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {user?.role === 'citizen'
              ? 'Access central & state rural schemes, track progress timeline, and submit verification documents'
              : 'Manage welfare schemes, review incoming applications, and track verification records'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">


          {(user?.role === 'officer' || user?.role === 'admin') && (
            <div className="flex rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-100 dark:bg-[#172033] p-1 text-xs font-bold">
              <button
                onClick={() => setActiveTab('schemes')}
                className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${activeTab === 'schemes' ? 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-[#F8FAFC] shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
              >
                All Schemes
              </button>
              <button
                onClick={() => setActiveTab('officer_desk')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all cursor-pointer ${activeTab === 'officer_desk' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                {user?.role === 'admin' ? 'Applications Overview Desk' : 'Officer Verification Desk'} ({applications.filter(a => a.status !== 'Approved' && a.status !== 'Rejected' && a.status !== 'Benefits Released').length})
              </button>
            </div>
          )}

          {(user?.role === 'admin' || user?.role === 'officer') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/15 transition-all hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create Scheme
            </button>
          )}
        </div>
      </div>

      {/* Featured AI Scheme Checker Banner - ONLY for Citizens */}
      {!isOfficerOrAdmin && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-3.5 sm:p-4 text-white shadow-md shadow-emerald-600/10">
          <div className="relative z-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-md border border-white/30 shadow-inner">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-100">
                    Conversational Advisor
                  </span>
                  <span className="rounded-full bg-emerald-400/30 px-1.5 py-0.5 text-[9px] font-bold text-white border border-white/20">
                    Gram Mitra AI
                  </span>
                </div>
                <h3 className="font-display text-sm sm:text-base font-bold text-white mt-0.5">
                  Check Welfare Scheme Eligibility with AI
                </h3>
                <p className="text-[11px] leading-snug text-emerald-100/90 max-w-xl">
                  Interact with Gram Mitra to check live Panchayat scheme criteria and find schemes you qualify for.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center">
              <button
                id="schemes-banner-start-ai-btn"
                onClick={() => setShowAiChecker(true)}
                className="flex items-center gap-1.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 px-3.5 py-1.5 text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer hover:scale-102 active:scale-95 whitespace-nowrap"
              >
                <Bot className="h-3.5 w-3.5 text-emerald-700" />
                <span>Start AI Eligibility Check</span>
                <ArrowRight className="h-3 w-3 text-emerald-700" />
              </button>
            </div>
          </div>

          {/* Decorative background glow circles */}
          <div className="absolute -right-10 -bottom-10 h-28 w-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-teal-400/20 blur-xl pointer-events-none" />
        </div>
      )}

      {/* Search & Category Filter Section */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-80 shrink-0">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Scheme..."
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] pl-10 pr-8 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 focus:border-blue-500 dark:focus:border-emerald-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <Filter className="h-4 w-4 text-slate-400 shrink-0 ml-1 hidden sm:block" />
            {CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat;
              const count = cat === 'All' 
                ? schemes.length 
                : schemes.filter(s => s.category === cat).length;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15'
                      : 'border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#172033] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#243044] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat}
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-[#243044] text-slate-700 dark:text-[#CBD5E1]'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* OFFICER & ADMIN VERIFICATION DESK SECTION */}
      {(user?.role === 'officer' || user?.role === 'admin') && activeTab === 'officer_desk' && (
        <div className="rounded-3xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-900/50 pb-4">
            <div>
              <span className="rounded bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                {user?.role === 'admin' ? 'Admin Welfare Overview (Read-Only)' : 'Respective Zone Officer Inspection Console'}
              </span>
              <h3 className="font-display text-lg font-bold text-slate-800 dark:text-[#F8FAFC] mt-1 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                {user?.role === 'admin' ? 'Jurisdiction Welfare Requests (All Zones Overview)' : `Jurisdiction Welfare Requests Pipeline (${user?.assignedZone || 'Zone Officer'})`}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {user?.role === 'admin'
                  ? 'View incoming scheme applications across all wards. Approvals, stage verifications, and rejections are authorized only for respective Zone Officers.'
                  : 'Review incoming scheme applications for your zone, verify attached citizen documents, and update approval/rejection status.'}
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-[#1E293B] px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
              {applications.length} Total Applications
            </span>
          </div>

          {applications.length === 0 ? (
            <p className="text-center py-10 text-xs text-slate-400 dark:text-slate-500 italic">No incoming scheme applications recorded in your jurisdiction.</p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {applications.map(app => (
                <div key={app.id} className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4.5 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block truncate">
                          Applicant: {app.citizenName}
                        </span>
                        <h4 className="font-display text-sm font-bold text-slate-800 dark:text-[#F8FAFC] mt-0.5 leading-snug">{app.schemeName}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Zone: {app.zone || 'Bengaluru South'} • Applied: {new Date(app.appliedAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-bold border ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </div>

                    {/* Document Verification Status */}
                    <div className="mt-3.5 rounded-xl border border-slate-100 dark:border-[#334155] bg-slate-50/80 dark:bg-[#172033] p-3 text-xs">
                      <p className="font-bold text-[11px] text-slate-700 dark:text-[#CBD5E1] flex items-center gap-1.5 mb-1.5">
                        <FileCheck2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        Uploaded Documents ({app.documents?.length || 0} / 5)
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        {REQUIRED_DOCUMENTS_LIST.map((doc, dIdx) => {
                          const docMeta = app.documents?.find(d => d.docName === doc);
                          const isUploaded = !!docMeta;
                          return (
                            <div key={dIdx} className="flex items-center justify-between rounded bg-white dark:bg-[#1E293B] px-2 py-1 border border-slate-100 dark:border-[#334155] text-slate-700 dark:text-[#CBD5E1] font-medium">
                              <div className="flex items-center gap-1.5 truncate">
                                {isUploaded ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                ) : (
                                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                                )}
                                <span className="truncate text-[10px] font-semibold">{doc}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setPreviewDoc({
                                  docName: doc,
                                  fileName: docMeta?.fileName || `${doc.replace(/\s+/g, '_')}_Verified.pdf`,
                                  fileSize: docMeta?.fileSize || '340 KB',
                                  fileData: docMeta?.fileData,
                                  citizenName: app.citizenName,
                                  schemeName: app.schemeName,
                                  uploadedAt: docMeta?.uploadedAt || app.appliedAt
                                })}
                                className="ml-1 flex items-center gap-0.5 rounded text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline shrink-0 cursor-pointer"
                              >
                                <Eye className="h-2.5 w-2.5" /> View
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-[#334155] pt-3">
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2 leading-relaxed block" title={app.remarks ? `Remarks: ${app.remarks}` : 'No remarks added'}>
                        {app.remarks ? `Remarks: ${app.remarks}` : 'No remarks added'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {user?.role === 'officer' && isRespectiveOfficer(app) ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setApplicationToDelete({
                              id: app.id,
                              citizenName: app.citizenName || 'Resident',
                              schemeName: app.schemeName
                            })}
                            className="flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors shadow-2xs cursor-pointer"
                            title="Delete Scheme Application (Officer Only)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                          <VerifyActionButton onClick={() => handleOpenReview(app)} />
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setViewDocsApp(app)}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#243044] transition-colors shadow-2xs cursor-pointer"
                          title="View Application Details & Documents"
                        >
                          <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MAIN SCHEMES LIST */}
      <div className="flex flex-col gap-6 w-full">
        {/* Active Schemes List */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Active Schemes List</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{filteredSchemes.length} Schemes Available</span>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>
            ) : filteredSchemes.length === 0 ? (
              <div className="text-center py-10">
                <Search className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">No schemes found matching "{searchQuery}" in category "{selectedCategory}".</p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                  className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Clear search & filter
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-5">
                {filteredSchemes.map(s => {
                  const existingApp = getApplication(s.id);
                  const reqDocs = s.requiredDocuments || REQUIRED_DOCUMENTS_LIST;

                  return (
                    <div key={s.id} className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4.5 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-slate-100 dark:bg-[#243044] px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-[#CBD5E1] uppercase tracking-wide">
                              {s.department} Dept
                            </span>
                            <span className="rounded bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[9px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide border border-blue-100 dark:border-blue-800/60">
                              {s.category || 'Housing'}
                            </span>
                          </div>
                          <h4 className="mt-1 font-display text-base font-bold text-slate-800 dark:text-[#F8FAFC]">{s.name}</h4>
                        </div>

                        {/* Actions: Admin/Officer delete or Citizen status tracker / apply button */}
                        <div className="flex items-start gap-2 shrink-0 -mt-0.5">
                          {(user?.role === 'admin' || user?.role === 'officer') && (
                            <button
                              onClick={() => setSchemeToDelete({ id: s.id, name: s.name })}
                              title="Delete Scheme"
                              className="flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 px-2 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all cursor-pointer shadow-2xs -mt-0.5"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Delete</span>
                            </button>
                          )}

                          {existingApp ? (
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span className={`rounded-full px-3 py-1 text-[10px] font-bold border ${getStatusColor(existingApp.status)}`}>
                                {existingApp.status}
                              </span>
                              {existingApp.status === 'Rejected' && user?.role === 'citizen' && (
                                <button
                                  onClick={() => handleOpenApplyModal(s)}
                                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 transition-all cursor-pointer"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Reapply Now
                                </button>
                              )}
                              <button
                                onClick={() => setViewDocsApp(existingApp)}
                                className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-0.5 cursor-pointer"
                              >
                                <Eye className="h-3 w-3" />
                                View Timeline & Docs
                              </button>
                            </div>
                          ) : (
                            user?.role === 'citizen' && (
                              <button
                                onClick={() => handleOpenApplyModal(s)}
                                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/15 hover:bg-blue-700 transition-all shrink-0 cursor-pointer"
                              >
                                <Upload className="h-3.5 w-3.5" />
                                Apply Now
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{s.description}</p>
                      
                      <div className="mt-3 grid gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        <p>🔹 <span className="font-bold text-slate-700 dark:text-[#CBD5E1]">Benefits:</span> {s.benefits}</p>
                        <p>🔸 <span className="font-bold text-slate-700 dark:text-[#CBD5E1]">Eligibility Limits:</span> {s.eligibilityCriteria}</p>
                      </div>

                      {/* Required Documents Section */}
                      <div className="mt-3.5 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/30 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-800 dark:text-[#F8FAFC] flex items-center gap-1.5">
                            <FileCheck2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            Required Documents Before Applying
                          </span>
                          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/60 px-2 py-0.5 rounded-md">
                            {reqDocs.length} Verification Docs
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                          {reqDocs.map((doc, idx) => (
                            <div key={idx} className="flex items-center gap-2 rounded-lg border border-blue-100/80 dark:border-blue-900/60 bg-white dark:bg-[#1E293B] px-2.5 py-1.5 font-semibold text-slate-700 dark:text-[#CBD5E1] shadow-2xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="truncate">{doc}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Application Summary & Recent Applicants Section (Admin Only) */}
                      {user?.role === 'admin' && (() => {
                        const schemeStats = getSchemeZoneBreakdown(s.id);
                        const recentApplicants = getRecentApplicants(s.id, 3);

                        return (
                          <div className="mt-3.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50/80 dark:bg-[#172033]/90 p-3.5">
                            {/* Summary Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shadow-2xs">
                                  <Users className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Application Summary</span>
                                    <span className="rounded bg-blue-100 dark:bg-blue-950 px-1.5 py-0.2 text-[9px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80">
                                      All Zones
                                    </span>
                                  </div>
                                  <p className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">
                                    Total Applications: <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm ml-0.5">{schemeStats.total}</span>
                                  </p>
                                </div>
                              </div>

                              {/* View All Applications Button */}
                              <button
                                onClick={() => {
                                  setModalSearch('');
                                  setModalZoneFilter('All');
                                  setModalStatusFilter('All');
                                  setSelectedSchemeForApplications(s);
                                }}
                                className="flex items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#1E293B] px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 shadow-2xs hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-all cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View All Applications ({schemeStats.total})
                              </button>
                            </div>

                            {/* Recent Applicants Section */}
                            <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-[#243044]">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  Recent Applicants
                                </span>
                                {schemeStats.total > 0 && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                    Showing {recentApplicants.length} of {schemeStats.total}
                                  </span>
                                )}
                              </div>

                              {recentApplicants.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-200 dark:border-[#334155] bg-white/50 dark:bg-[#1E293B]/50 p-3 text-center">
                                  <p className="text-xs text-slate-500 dark:text-slate-400">No resident applications received for this scheme yet.</p>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {recentApplicants.map((applicant) => (
                                    <div
                                      key={applicant.id}
                                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/60 dark:border-[#334155] bg-white dark:bg-[#1E293B] px-3 py-2 text-xs shadow-2xs"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 font-bold text-[10px] text-blue-700 dark:text-blue-300">
                                          {applicant.citizenName ? applicant.citizenName.charAt(0).toUpperCase() : 'R'}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-bold text-slate-800 dark:text-[#F8FAFC] truncate">{applicant.citizenName}</p>
                                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                                            <span className="truncate">{applicant.zone || 'Bengaluru South'}</span>
                                            <span>•</span>
                                            <span>{new Date(applicant.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusColor(applicant.status)}`}>
                                          {applicant.status}
                                        </span>
                                        <button
                                          onClick={() => setViewDocsApp(applicant)}
                                          title="View Applicant Details & Documents"
                                          className="rounded-md p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-[#243044] cursor-pointer"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Embedded Progress Timeline for Citizen Applications ONLY */}
                      {user?.role === 'citizen' && existingApp && (
                        <div className="mt-4 border-t border-slate-100 dark:border-[#334155] pt-3">
                          {renderProgressTimeline(
                            existingApp.status,
                            existingApp.remarks,
                            () => handleOpenApplyModal(s)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Citizen Submitted Applications */}
          {user?.role === 'citizen' && applications.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="font-display text-sm font-bold text-slate-800 dark:text-[#F8FAFC] flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  My Submitted Applications ({applications.length})
                </h4>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Track and review all applied schemes
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                {applications.map(app => {
                  const matchingScheme = schemes.find(s => s.id === app.schemeId);
                  return (
                    <div
                      key={app.id}
                      className="rounded-xl border border-slate-200/80 dark:border-[#334155] bg-slate-50/70 dark:bg-[#172033]/70 hover:bg-slate-50 dark:hover:bg-[#172033] p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-xs text-slate-800 dark:text-[#F8FAFC]">{app.schemeName}</p>
                          {matchingScheme?.department && (
                            <span className="rounded bg-blue-100/70 dark:bg-blue-900/40 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 dark:text-blue-300">
                              {matchingScheme.department}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Applied on: <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(app.appliedAt).toLocaleDateString()}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold border ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>

                        <button
                          onClick={() => setViewDocsApp(app)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] px-3 py-1 text-[11px] font-bold text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#243044] hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          View Details
                        </button>

                        {app.status === 'Rejected' && matchingScheme && user?.role === 'citizen' && (
                          <button
                            onClick={() => handleOpenApplyModal(matchingScheme)}
                            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-rose-700 transition-all cursor-pointer"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Reapply
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      {/* Citizen Upload & Apply Modal */}
      {applyModalScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#334155] pb-4">
                <div>
                  <span className="rounded bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 text-[9px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    {applyModalScheme.department} Department
                  </span>
                  <h3 className="font-display text-lg font-bold text-slate-800 dark:text-[#F8FAFC] mt-1">
                    Apply for {applyModalScheme.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Attach all 5 required verification documents below to complete your application.
                  </p>
                </div>
                <button
                  onClick={() => setApplyModalScheme(null)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#243044] hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Required Docs Header */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-bold text-slate-800 dark:text-[#F8FAFC] text-xs">Required Verification Documents</span>
                  <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                    {Object.keys(attachedDocs).length} / 5 Uploaded
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAutoAttachSampleDocs}
                  className="flex items-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all shadow-2xs cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Auto-Attach Sample Documents
                </button>
              </div>

              {/* Documents Upload Grid */}
              <div className="mt-3 flex flex-col gap-3">
                {(applyModalScheme.requiredDocuments || REQUIRED_DOCUMENTS_LIST).map((docName, idx) => {
                  const attached = attachedDocs[docName];

                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl border p-3.5 transition-all ${
                        attached
                          ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/30'
                          : 'border-slate-200 dark:border-[#334155] bg-slate-50/60 dark:bg-[#172033] hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                            attached ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200 dark:bg-[#243044] text-slate-600 dark:text-[#CBD5E1]'
                          }`}>
                            {attached ? <Check className="h-4 w-4" /> : `0${idx + 1}`}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-800 dark:text-[#F8FAFC] flex items-center gap-1.5">
                              ✓ {docName}
                              {attached ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:text-emerald-300">
                                  Uploaded
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">*Required for verification</span>
                              )}
                            </p>

                            {attached ? (
                              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium mt-0.5 flex items-center gap-1">
                                <Paperclip className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                {attached.fileName} <span className="text-slate-400">({attached.fileSize})</span>
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Select or drag PDF/image file of {docName}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {attached ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(docName)}
                              className="flex items-center gap-1 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-[#1E293B] px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          ) : (
                            <label className="cursor-pointer flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all">
                              <Upload className="h-3.5 w-3.5" />
                              Upload File
                              <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.webp"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleFileUpload(docName, e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 border-t border-slate-100 dark:border-[#334155] pt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {Object.keys(attachedDocs).length} of 5 documents ready
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={submittingApp}
                  onClick={() => setApplyModalScheme(null)}
                  className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-4 py-2 text-xs font-bold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#172033] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingApp}
                  onClick={handleConfirmSubmitApplication}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/15 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {submittingApp ? 'Submitting Application...' : 'Submit Application & Documents'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFFICER REVIEW & VERIFICATION MODAL */}
      {reviewApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                    Designated Zone Officer Console
                  </span>
                  <span className="rounded bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[9px] font-semibold text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/60">
                    Zone: {reviewApp.zone || 'Assigned Jurisdiction'}
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-slate-800 dark:text-[#F8FAFC] mt-1">
                  Verify Application: {reviewApp.citizenName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{reviewApp.schemeName}</p>
              </div>
              <button
                onClick={() => setReviewApp(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#243044] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Document Checklist for Officer */}
            <div className="mt-4">
              <h4 className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC] flex items-center gap-1.5 mb-2">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Step 1: Verify Submitted Documents
              </h4>
              <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 dark:border-[#334155] bg-slate-50/70 dark:bg-[#172033] p-3">
                {REQUIRED_DOCUMENTS_LIST.map((doc, idx) => {
                  const isChecked = docChecklist[doc] ?? true;
                  const docMeta = reviewApp.documents?.find(d => d.docName === doc);

                  return (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => setDocChecklist({ ...docChecklist, [doc]: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="font-bold text-slate-800 dark:text-[#F8FAFC]">{doc}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {docMeta ? `${docMeta.fileName} (${docMeta.fileSize || '300 KB'})` : 'Auto-Verified Document'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            docName: doc,
                            fileName: docMeta?.fileName || `${doc.replace(/\s+/g, '_')}_Verified.pdf`,
                            fileSize: docMeta?.fileSize || '340 KB',
                            fileData: docMeta?.fileData,
                            citizenName: reviewApp.citizenName,
                            schemeName: reviewApp.schemeName,
                            uploadedAt: docMeta?.uploadedAt || reviewApp.appliedAt
                          })}
                          className="flex items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all shadow-2xs shrink-0 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          View Document
                        </button>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isChecked ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'
                        }`}>
                          {isChecked ? 'Verified' : 'Flagged'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Officer Remarks */}
            <div className="mt-4">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Step 2: Officer Review Remarks / Notes</label>
              <textarea
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="Enter PDO verification notes or instructions for the citizen..."
                rows={2}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] p-3 text-xs text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Step 3: Transition Progress Stage */}
            <div className="mt-4 border-t border-slate-100 dark:border-[#334155] pt-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC] mb-2">Step 3: Update Progress Stage</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleUpdateApplicationStatus('Under Verification')}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/50 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Under Verification
                </button>
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleUpdateApplicationStatus('Documents Verified')}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/50 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer"
                >
                  <FileCheck2 className="h-3.5 w-3.5" />
                  Documents Verified
                </button>
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleUpdateApplicationStatus('Approved')}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve Application
                </button>
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleUpdateApplicationStatus('Benefits Released')}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 py-2 text-xs font-bold text-white hover:bg-teal-800 shadow-sm cursor-pointer"
                >
                  <Gift className="h-3.5 w-3.5" />
                  Release Benefits
                </button>
              </div>

              <div className="mt-2.5 flex items-center justify-between">
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleUpdateApplicationStatus('Rejected')}
                  className="flex items-center gap-1 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 cursor-pointer"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject Application
                </button>

                <button
                  type="button"
                  onClick={() => setReviewApp(null)}
                  className="rounded-xl border border-slate-200 dark:border-[#334155] px-4 py-1.5 text-xs font-bold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#243044] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Application Details & Documents Modal (Timeline only for Citizens) */}
      {viewDocsApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-800 dark:text-[#F8FAFC]">
                  {user?.role === 'citizen' ? 'Application Details & Timeline' : 'Application Details & Documents'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{viewDocsApp.schemeName}</p>
              </div>
              <button
                onClick={() => setViewDocsApp(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#243044] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Progress Timeline - CITIZENS ONLY */}
            {user?.role === 'citizen' && (
              <div className="mt-4 border-b border-slate-100 dark:border-[#334155] pb-4">
                {renderProgressTimeline(
                  viewDocsApp.status,
                  viewDocsApp.remarks,
                  () => {
                    const sch = schemes.find(s => s.id === viewDocsApp.schemeId);
                    setViewDocsApp(null);
                    if (sch) handleOpenApplyModal(sch);
                  }
                )}
              </div>
            )}

            {/* Attached Verification Documents */}
            <div className="mt-4">
              <h4 className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC] mb-2 flex items-center gap-1.5">
                <Paperclip className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Attached Verification Documents ({viewDocsApp.documents?.length || 0})
              </h4>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {viewDocsApp.documents && viewDocsApp.documents.length > 0 ? (
                  viewDocsApp.documents.map((doc, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50/80 dark:bg-[#172033] p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-800 dark:text-[#F8FAFC]">{doc.docName}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">{doc.fileName} • {doc.fileSize || '250 KB'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            docName: doc.docName,
                            fileName: doc.fileName,
                            fileSize: doc.fileSize,
                            fileData: doc.fileData,
                            citizenName: viewDocsApp.citizenName,
                            schemeName: viewDocsApp.schemeName,
                            uploadedAt: doc.uploadedAt || viewDocsApp.appliedAt
                          })}
                          className="flex items-center gap-1 rounded-lg border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all shadow-2xs shrink-0 cursor-pointer"
                        >
                          <Eye className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          View
                        </button>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
                          Verified
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-xs text-slate-400 dark:text-slate-500">No documents attached.</p>
                )}
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 dark:border-[#334155] pt-3 flex items-center justify-between">
              {viewDocsApp.status === 'Rejected' && user?.role === 'citizen' ? (
                <button
                  type="button"
                  onClick={() => {
                    const sch = schemes.find(s => s.id === viewDocsApp.schemeId);
                    setViewDocsApp(null);
                    if (sch) handleOpenApplyModal(sch);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 transition-all cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reapply Now
                </button>
              ) : <div />}
              <button
                onClick={() => setViewDocsApp(null)}
                className="rounded-xl bg-slate-800 dark:bg-slate-700 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 dark:hover:bg-slate-600 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View All Applications Modal (Admin Only) */}
      {user?.role === 'admin' && selectedSchemeForApplications && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-[#334155] bg-slate-50/90 dark:bg-[#172033] px-6 py-4.5 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-100 dark:bg-blue-950/80 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide border border-blue-200 dark:border-blue-800">
                    {selectedSchemeForApplications.category || 'Welfare Scheme'}
                  </span>
                  <span className="rounded bg-slate-100 dark:bg-[#243044] px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-[#CBD5E1] uppercase">
                    {selectedSchemeForApplications.department} Dept
                  </span>
                </div>
                <h3 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">
                  {selectedSchemeForApplications.name} — All Applications
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Complete list of registered residents and verification records across Panchayat zones
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSchemeToDelete({ id: selectedSchemeForApplications.id, name: selectedSchemeForApplications.name })}
                  title="Delete Scheme (Admin Only)"
                  className="flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 px-2 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => setSelectedSchemeForApplications(null)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-[#243044] hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body with Stats and Application Table */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Application Summary Banner */}
              {(() => {
                const stats = getSchemeZoneBreakdown(selectedSchemeForApplications.id);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/40 p-3 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Applications</p>
                      <p className="mt-1 text-2xl font-black text-blue-700 dark:text-blue-300">{stats.total}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] p-3 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">South Zone</p>
                      <p className="mt-1 text-2xl font-black text-slate-800 dark:text-[#F8FAFC]">{stats.south}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] p-3 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">North Zone</p>
                      <p className="mt-1 text-2xl font-black text-slate-800 dark:text-[#F8FAFC]">{stats.north}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] p-3 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">East Zone</p>
                      <p className="mt-1 text-2xl font-black text-slate-800 dark:text-[#F8FAFC]">{stats.east}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] p-3 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">West Zone</p>
                      <p className="mt-1 text-2xl font-black text-slate-800 dark:text-[#F8FAFC]">{stats.west}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Filters & Search Controls */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search resident name, Citizen ID, or zone..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] pl-9.5 pr-3.5 py-2 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 shrink-0">
                  <select
                    value={modalZoneFilter}
                    onChange={(e) => setModalZoneFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 py-2 text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] focus:outline-none"
                  >
                    <option value="All">All Zones</option>
                    <option value="South">South Zone</option>
                    <option value="North">North Zone</option>
                    <option value="East">East Zone</option>
                    <option value="West">West Zone</option>
                  </select>

                  <select
                    value={modalStatusFilter}
                    onChange={(e) => setModalStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 py-2 text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] focus:outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Under Verification">Under Verification</option>
                    <option value="Documents Verified">Documents Verified</option>
                    <option value="Approved">Approved</option>
                    <option value="Benefits Released">Benefits Released</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Filtered Application Records */}
              {(() => {
                const schemeApps = applications.filter(a => a.schemeId === selectedSchemeForApplications.id);
                const filtered = schemeApps.filter(a => {
                  if (modalZoneFilter !== 'All') {
                    const z = (a.zone || '').toLowerCase();
                    if (!z.includes(modalZoneFilter.toLowerCase())) return false;
                  }
                  if (modalStatusFilter !== 'All') {
                    if (a.status !== modalStatusFilter) return false;
                  }
                  if (modalSearch.trim()) {
                    const q = modalSearch.toLowerCase();
                    const matchesName = (a.citizenName || '').toLowerCase().includes(q);
                    const matchesId = (a.citizenId || '').toLowerCase().includes(q);
                    const matchesZone = (a.zone || '').toLowerCase().includes(q);
                    const matchesStatus = (a.status || '').toLowerCase().includes(q);
                    if (!matchesName && !matchesId && !matchesZone && !matchesStatus) return false;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-[#172033]/50">
                      <Users className="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" />
                      <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                        No applications match the current search or filters.
                      </p>
                      {(modalSearch || modalZoneFilter !== 'All' || modalStatusFilter !== 'All') && (
                        <button
                          onClick={() => {
                            setModalSearch('');
                            setModalZoneFilter('All');
                            setModalStatusFilter('All');
                          }}
                          className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#334155]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-[#334155] bg-slate-50/90 dark:bg-[#172033] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Resident Name</th>
                          <th className="py-3 px-3">Citizen ID</th>
                          <th className="py-3 px-3">Zone</th>
                          <th className="py-3 px-3">Applied Date</th>
                          <th className="py-3 px-3">Application Status</th>
                          <th className="py-3 px-3">Verification Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#243044] bg-white dark:bg-[#1E293B]">
                        {filtered.map(app => (
                          <tr key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-[#243044]/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 font-bold text-[11px] text-blue-700 dark:text-blue-300">
                                  {app.citizenName ? app.citizenName.charAt(0).toUpperCase() : 'R'}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 dark:text-[#F8FAFC]">{app.citizenName}</p>
                                  <p className="text-[10px] text-slate-400">ID: {app.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#243044] px-2 py-0.5 rounded border border-slate-200/60 dark:border-[#334155]">
                                {app.citizenId || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                {app.zone || 'Bengaluru South'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {new Date(app.appliedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusColor(app.status)}`}>
                                {app.status}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {getVerificationStatusBadge(app)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setViewDocsApp(app)}
                                  className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#243044] cursor-pointer shadow-2xs"
                                  title={user?.role === 'citizen' ? 'View Uploaded Documents & Timeline' : 'View Uploaded Documents'}
                                >
                                  <Eye className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                  View
                                </button>
                                {user?.role === 'officer' && isRespectiveOfficer(app) && (
                                  <button
                                    onClick={() => handleOpenReview(app)}
                                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-emerald-700 cursor-pointer transition-colors"
                                    title="Review & Verify Application"
                                  >
                                    <UserCheck className="h-3 w-3" />
                                    Review
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-[#334155] bg-slate-50/90 dark:bg-[#172033] px-6 py-3.5 shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {getSchemeZoneBreakdown(selectedSchemeForApplications.id).total} total applications on record
              </span>
              <button
                onClick={() => setSelectedSchemeForApplications(null)}
                className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#243044] cursor-pointer transition-colors shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scheme Creation Modal (Admin) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-hidden">
          <div className="w-full max-w-md max-h-[90vh] sm:max-h-[calc(100vh-40px)] flex flex-col rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-2xl overflow-hidden">
            {/* Fixed Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-4 bg-white dark:bg-[#1E293B] shrink-0">
              <div>
                <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">Launch Welfare Program</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Publish a new scheme on the citizen board</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form wrapping scrollable content and sticky footer */}
            <form onSubmit={handleCreateScheme} className="flex flex-1 flex-col overflow-hidden">
              {/* Scrollable Form Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Scheme Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Gramin Awas Yojana"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Category Sector</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Housing">Housing</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="Education">Education</option>
                    <option value="Women">Women</option>
                    <option value="Senior Citizens">Senior Citizens</option>
                    <option value="Health">Health</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Scheme Description <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                      {description.length} / 1000
                    </span>
                  </div>
                  <textarea
                    required
                    maxLength={1000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Summarize the core focus and subsidy benefits..."
                    rows={3}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] p-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Key Benefits</label>
                  <input
                    type="text"
                    value={benefits}
                    onChange={(e) => setBenefits(e.target.value)}
                    placeholder="e.g. up to 1.5 Lakhs financial support"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Eligibility Criteria</label>
                  <input
                    type="text"
                    required
                    value={eligibilityCriteria}
                    onChange={(e) => setEligibilityCriteria(e.target.value)}
                    placeholder="e.g. Annual Income below 2,00,000"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Panchayat Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] px-3 text-xs text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Administration">Administration</option>
                    <option value="Revenue">Revenue</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Health">Health</option>
                    <option value="Water">Water</option>
                  </select>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 z-10 shrink-0 border-t border-slate-100 dark:border-slate-700 bg-slate-50/95 dark:bg-[#172033]/95 backdrop-blur-xs px-6 py-3.5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingScheme}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {savingScheme ? 'Publishing...' : 'Launch Scheme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Conversational AI Scheme Eligibility Advisor Modal - ONLY for Citizens */}
      {!isOfficerOrAdmin && (
        <AiSchemeCheckerModal
          isOpen={showAiChecker}
          onClose={() => setShowAiChecker(false)}
          onApplyScheme={(scheme) => handleOpenApplyModal(scheme)}
          allSchemes={schemes}
        />
      )}

      {/* Global Document Viewer Modal */}
      <DocumentPreviewModal
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onVerifyToggle={(docName, isVerified) => setDocChecklist(prev => ({ ...prev, [docName]: isVerified }))}
        isVerified={previewDoc ? (docChecklist[previewDoc.docName] ?? true) : true}
      />

      {/* Delete Scheme Confirmation Modal (Admin & Officer) */}
      {(user?.role === 'admin' || user?.role === 'officer') && schemeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-slate-800 dark:text-[#F8FAFC]">
                  Delete Welfare Scheme
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Officer &amp; Admin Management
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 p-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <p>
                Are you sure you want to permanently delete the scheme{' '}
                <strong className="font-bold text-slate-900 dark:text-[#F8FAFC]">
                  "{schemeToDelete.name}"
                </strong>
                ?
              </p>
              <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                This action cannot be undone and removes this scheme from the portal.
              </p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deletingScheme}
                onClick={() => setSchemeToDelete(null)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#172033] px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#243044] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingScheme}
                onClick={handleConfirmDeleteScheme}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deletingScheme ? 'Deleting...' : 'Yes, Delete Scheme'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Scheme Application Confirmation Modal (Officer Only) */}
      {applicationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-slate-800 dark:text-[#F8FAFC]">
                  Confirm Application Deletion
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Officer Authorization Required
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 p-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <p>
                Are you sure you want to permanently delete the application for{' '}
                <strong className="font-bold text-slate-900 dark:text-[#F8FAFC]">
                  "{applicationToDelete.schemeName}"
                </strong>{' '}
                submitted by{' '}
                <strong className="font-bold text-slate-900 dark:text-[#F8FAFC]">
                  {applicationToDelete.citizenName}
                </strong>
                ?
              </p>
              <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                This application and its attached verification records will be permanently removed from the Panchayat register.
              </p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deletingApplication}
                onClick={() => setApplicationToDelete(null)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#172033] px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#243044] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingApplication}
                onClick={handleConfirmDeleteApplication}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deletingApplication ? 'Deleting...' : 'Yes, Delete Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
