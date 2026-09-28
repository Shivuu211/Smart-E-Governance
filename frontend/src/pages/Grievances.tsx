import React, { useState, useEffect } from 'react';
import {
  BadgeAlert,
  Plus,
  Bot,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
  Send,
  MessageSquare,
  Image as ImageIcon,
  UploadCloud,
  X,
  Camera,
  Eye,
  Maximize2,
  Trash2,
  Sparkles,
  Star,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  CheckCircle2,
  Check,
  ChevronDown,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Grievance, Employee } from '../types';
import GrievanceMapPicker from '../components/GrievanceMapPicker';
import GrievanceMapDisplay from '../components/GrievanceMapDisplay';
import { isLocationInZone, getZoneOfficerDesignation } from '../utils/zoneUtils';
import { sanitizeDateYear, validate4DigitYear } from '../utils/dateValidation';
import { MapPin } from 'lucide-react';

const AREA_OFFICER_MAP: Record<string, { name: string; role: string }> = {
  'Bengaluru North': { name: 'Vijay Deshmukh', role: getZoneOfficerDesignation('Bengaluru North') },
  'Bengaluru East': { name: 'Ananya Rao', role: getZoneOfficerDesignation('Bengaluru East') },
  'Bengaluru South': { name: 'Sunita Sharma', role: getZoneOfficerDesignation('Bengaluru South') },
  'Bengaluru West': { name: 'Rajesh Kumar Singh', role: getZoneOfficerDesignation('Bengaluru West') },
};

const getUserDefaultAreaAndOfficer = (currentUser: any) => {
  if (currentUser) {
    const zone = currentUser.assignedZone || currentUser.zone;
    if (zone && AREA_OFFICER_MAP[zone]) {
      return { area: zone, officer: AREA_OFFICER_MAP[zone].name, role: AREA_OFFICER_MAP[zone].role };
    }
    if (currentUser.name) {
      for (const [area, info] of Object.entries(AREA_OFFICER_MAP)) {
        if (
          info.name.toLowerCase() === currentUser.name.toLowerCase() ||
          currentUser.name.toLowerCase().includes(info.name.split(' ')[0].toLowerCase())
        ) {
          return { area, officer: info.name, role: info.role };
        }
      }
      if (currentUser.role === 'officer') {
        return { area: 'Bengaluru South', officer: currentUser.name, role: getZoneOfficerDesignation('Bengaluru South') };
      }
    }
  }
  return { area: 'Bengaluru South', officer: 'Sunita Sharma', role: getZoneOfficerDesignation('Bengaluru South') };
};


const SAMPLE_RESOLUTION_PHOTOS = [
  {
    label: 'Repaired Pipeline 📷',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Fixed Road Patch 📷',
    url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Cleaned Waste Dump 📷',
    url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Working LED Light 📷',
    url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
  },
];

function CitizenRatingSection({
  grievance,
  onRatingSubmit,
}: {
  grievance: Grievance;
  onRatingSubmit: (id: string, rating: number, ratingFeedback: 'Satisfied' | 'Not Satisfied', citizenFeedbackNote?: string) => Promise<void>;
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(grievance.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [ratingFeedback, setRatingFeedback] = useState<'Satisfied' | 'Not Satisfied'>(
    (grievance.ratingFeedback as 'Satisfied' | 'Not Satisfied') || 'Satisfied'
  );
  const [note, setNote] = useState<string>(grievance.citizenFeedbackNote || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<boolean>(!!grievance.rating);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onRatingSubmit(grievance.id, rating, ratingFeedback, note);
    setSubmitting(false);
    setSubmitted(true);
  };

  const isSubmitted = submitted || !!grievance.rating;

  // Render read-only feedback view if user is not a citizen, or if feedback has already been submitted
  if (user?.role !== 'citizen' || isSubmitted) {
    const finalRating = grievance.rating || rating || 5;
    const finalFeedback = grievance.ratingFeedback || ratingFeedback || 'Satisfied';
    const finalNote = grievance.citizenFeedbackNote || note;

    return (
      <div className="mt-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-[#1E293B] p-3.5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-2 mb-2">
          <span className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC] flex items-center gap-1.5">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            Citizen Feedback & Rating
          </span>
          {isSubmitted ? (
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
              ✓ Rating Submitted
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
              Pending Review
            </span>
          )}
        </div>
        {isSubmitted ? (
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Satisfaction Rating:</span>
              <div className="flex items-center gap-0.5 text-amber-500">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${star <= finalRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                  />
                ))}
              </div>
              <span className="font-bold text-slate-700 dark:text-[#F8FAFC]">{finalRating} / 5 Stars</span>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold border ${
                finalFeedback === 'Satisfied'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
              }`}>
                {finalFeedback}
              </span>
            </div>
            {finalNote && (
              <p className="text-slate-600 dark:text-[#CBD5E1] bg-slate-50 dark:bg-[#172033] p-2 rounded-lg italic border border-slate-100 dark:border-[#334155] mt-1">
                "{finalNote}"
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-400 italic">No feedback submitted by citizen yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-[#1E293B] p-3.5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-2 mb-2">
        <span className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC] flex items-center gap-1.5">
          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          Rate Complaint Resolution Service
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
        <div>
          <label className="font-bold text-slate-700 dark:text-[#CBD5E1] block mb-1">Your Satisfaction Score:</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110 focus:outline-none cursor-pointer"
              >
                <Star
                  className={`h-5 w-5 ${
                    star <= (hoverRating || rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 font-bold text-slate-700 dark:text-[#F8FAFC]">{rating} / 5 Stars</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-bold text-slate-700 dark:text-[#CBD5E1]">Are you satisfied?</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRatingFeedback('Satisfied')}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                ratingFeedback === 'Satisfied'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-[#243044] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#334155]'
              }`}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              Satisfied
            </button>
            <button
              type="button"
              onClick={() => setRatingFeedback('Not Satisfied')}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                ratingFeedback === 'Not Satisfied'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-[#243044] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#334155]'
              }`}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              Not Satisfied
            </button>
          </div>
        </div>

        <div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add feedback remarks regarding the completed resolution work..."
            rows={2}
            className="w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] p-2 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-fit self-end rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all disabled:opacity-50 cursor-pointer"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
}

export default function Grievances() {
  const { user } = useAuth();
  const initialDefaults = getUserDefaultAreaAndOfficer(user);

  const cachedGrievs = api.getCachedSync('grievances');
  const [grievances, setGrievances] = useState<Grievance[]>(cachedGrievs || []);
  const [loading, setLoading] = useState(!cachedGrievs);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [filter, setFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState<'All' | 'Critical' | 'High' | 'Medium' | 'Low'>('All');

  const getDynamicAreaOfficer = (zone: string) => {
    const activeOfficers = employeesList.filter(e => !e.status || e.status === 'Active');
    const norm = (zone || '').trim().toLowerCase();
    const found = activeOfficers.find(e => {
      const ez = (e.assignedZone || '').trim().toLowerCase();
      return ez === norm || ez.includes(norm.replace('bengaluru', '').trim());
    });
    if (found) {
      return { name: found.name, role: found.role || getZoneOfficerDesignation(zone) };
    }
    return { name: `${zone} Officer`, role: getZoneOfficerDesignation(zone) };
  };

  // Submit states
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Water Supply');
  const [severity, setSeverity] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('Medium');
  const [description, setDescription] = useState('');
  const [areaZone, setAreaZone] = useState(initialDefaults.area);
  const [images, setImages] = useState<string[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [isLocationValid, setIsLocationValid] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Lightbox view state
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  // Review states (Officer/Admin)
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [remarks, setRemarks] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Resolution Form states
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionRemarks, setResolutionRemarks] = useState('');
  const [resolutionPhotos, setResolutionPhotos] = useState<string[]>([]);
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);
  const [resolutionError, setResolutionError] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // Delete states (Officer/Admin)
  const [grievanceToDelete, setGrievanceToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadGrievances();
    loadEmployees();

    const handleSync = () => {
      loadEmployees();
      loadGrievances(true, true);
    };
    window.addEventListener('officers-synced', handleSync);

    // Automatic Live Synchronization: Poll every 3 seconds for fresh grievances from backend
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadGrievances(true, true);
      }
    }, 3000);

    // Auto-refresh immediately when user switches tabs or window regains focus
    const handleFocus = () => {
      loadGrievances(true, true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadGrievances(true, true);
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('officers-synced', handleSync);
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (user) {
      setAreaZone(getUserDefaultAreaAndOfficer(user).area);
    }
  }, [user]);

  const loadEmployees = async () => {
    try {
      const list = await api.getEmployees();
      if (list && Array.isArray(list)) {
        setEmployeesList(list);
      }
    } catch (err) {
      console.error('Error loading employees in Grievances:', err);
    }
  };

  const loadGrievances = async (bypassCache = false, isBackground = false) => {
    try {
      const list = await api.getGrievances(bypassCache);
      if (list && Array.isArray(list)) {
        setGrievances(list);
        // If a grievance detail view is currently open, seamlessly update it with latest status/data
        setSelectedGrievance(prev => {
          if (!prev) return null;
          const updated = list.find(g => g.id === prev.id);
          return updated || prev;
        });
      }
    } catch (err) {
      if (!isBackground) {
        console.error('Error loading grievances:', err);
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const fileList = Array.from(files);
    fileList.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImages(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || !description.trim()) {
      setFormError('Please fill in both the Complain Subject and Detailed Description.');
      return;
    }

    if (description.trim().length > 1000) {
      setFormError('Detailed Description cannot exceed 1000 characters.');
      return;
    }

    const userZone = user?.assignedZone || user?.zone || areaZone || 'Bengaluru South';
    const newLat = latitude;
    const newLng = longitude;
    const newLocation = locationAddress;

    if (!newLat || !newLng || !isLocationInZone(newLat, newLng, newLocation, userZone)) {
      setFormError('Please select a location inside your zone.');
      setIsLocationValid(false);
      return;
    }

    const newCategory = category;
    const newSeverity = severity;
    const newTitle = title.trim();
    const newDesc = description.trim();
    const newImages = [...images];

    // Optimistic item creation for instant UI responsiveness
    const tempGrievance: Grievance = {
      id: `grv_${Date.now()}`,
      citizenId: user?.id || 'citizen_1',
      citizenName: user?.name || 'Citizen User',
      title: newTitle,
      description: newDesc,
      category: newCategory as any,
      status: 'Pending',
      image: newImages[0] || '',
      images: newImages,
      location: newLocation,
      latitude: newLat || undefined,
      longitude: newLng || undefined,
      urgency: newSeverity === 'Critical' || newSeverity === 'High' ? 'High' : newSeverity === 'Low' ? 'Low' : 'Medium',
      severity: newSeverity,
      aiSuggestedPlan: `AI Insights: Auto-triaged under ${newCategory} (Severity: ${newSeverity}). Dispatched for Panchayath inspection.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Instant UI update
    setGrievances(prev => [tempGrievance, ...prev]);
    setSelectedGrievance(tempGrievance);
    setTitle('');
    setDescription('');
    setSeverity('Medium');
    setImages([]);
    setLatitude(null);
    setLongitude(null);
    setLocationAddress('');
    setShowSubmitModal(false);
    setSuccessToast('Grievance filed successfully with pinpoint location! Auto-categorized and queued for Panchayath action.');
    setTimeout(() => setSuccessToast(''), 5000);

    // Sync to backend asynchronously
    try {
      const created = await api.submitGrievance({
        title: newTitle,
        description: newDesc,
        category: newCategory,
        severity: newSeverity,
        images: newImages,
        image: newImages[0] || '',
        location: newLocation,
        latitude: newLat || undefined,
        longitude: newLng || undefined,
      });
      if (created && created.id) {
        setGrievances(prev => prev.map(g => g.id === tempGrievance.id ? created : g));
        setSelectedGrievance(created);
      }
    } catch (err: any) {
      console.error('Submit grievance background sync:', err);
    }
  };

  const handleDirectResolutionFiles = (files: FileList | null) => {
    if (!files) return;
    const fileList = Array.from(files);
    fileList.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const newPhoto = e.target.result as string;
          setResolutionPhotos(prev => {
            const updated = [...prev, newPhoto];
            if (selectedGrievance) {
              const updatedGrievance = { ...selectedGrievance, resolutionPhotos: updated };
              setSelectedGrievance(updatedGrievance);
              setGrievances(list => list.map(g => g.id === selectedGrievance.id ? updatedGrievance : g));
            }
            return updated;
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const addSampleDirectResolutionPhoto = (url: string) => {
    setResolutionPhotos(prev => {
      if (prev.includes(url)) return prev;
      const updated = [...prev, url];
      if (selectedGrievance) {
        const updatedGrievance = { ...selectedGrievance, resolutionPhotos: updated };
        setSelectedGrievance(updatedGrievance);
        setGrievances(list => list.map(g => g.id === selectedGrievance.id ? updatedGrievance : g));
      }
      return updated;
    });
  };

  const handleResolutionFiles = (files: FileList | null) => {
    if (!files) return;
    const fileList = Array.from(files);
    fileList.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setResolutionPhotos(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const addSampleResolutionImage = (url: string) => {
    if (!resolutionPhotos.includes(url)) {
      setResolutionPhotos(prev => [...prev, url]);
    }
  };

  const removeResolutionImage = (index: number) => {
    setResolutionPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const openResolutionModal = (grievance: Grievance) => {
    setSelectedGrievance(grievance);
    setResolutionRemarks(remarks || grievance.resolutionRemarks || '');
    setResolutionPhotos(grievance.resolutionPhotos || []);
    setCompletionDate(grievance.completedDate || new Date().toISOString().split('T')[0]);
    setResolutionError('');
    setShowResolutionModal(true);
  };

  const handleSaveResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrievance) return;
    setResolutionError('');

    if (!resolutionRemarks.trim()) {
      setResolutionError('Resolution Remarks are required.');
      return;
    }

    if (resolutionRemarks.trim().length > 500) {
      setResolutionError('Resolution Remarks cannot exceed 500 characters.');
      return;
    }

    if (!resolutionPhotos || resolutionPhotos.length === 0) {
      setResolutionError('Please upload at least one resolution photo before marking the complaint as resolved.');
      return;
    }

    if (completionDate) {
      const dateErr = validate4DigitYear(completionDate, 1900, 2099, 'Completion Date');
      if (dateErr) {
        setResolutionError(dateErr);
        return;
      }
    }

    setSubmittingResolution(true);
    const targetId = selectedGrievance.id;
    const remarksText = resolutionRemarks.trim();
    const dateStr = completionDate || new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    // Optimistic UI update
    const updatedGrievance: Grievance = {
      ...selectedGrievance,
      status: 'Resolved',
      resolutionRemarks: remarksText,
      remarks: remarksText,
      resolutionPhotos: resolutionPhotos.length > 0 ? [...resolutionPhotos] : undefined,
      completedDate: dateStr,
      resolvedAt: nowIso,
      updatedAt: nowIso
    };

    setSelectedGrievance(updatedGrievance);
    setGrievances(prev => prev.map(g => g.id === targetId ? updatedGrievance : g));
    setShowResolutionModal(false);
    setRemarks('');
    setSuccessToast('Complaint marked as Resolved. Citizen notified!');
    setTimeout(() => setSuccessToast(''), 5000);

    try {
      await api.updateGrievanceStatus(targetId, {
        status: 'Resolved',
        remarks: remarksText,
        resolutionRemarks: remarksText,
        resolutionPhotos: resolutionPhotos,
        completedDate: dateStr,
        resolvedAt: nowIso
      });
    } catch (err: any) {
      console.error('Error syncing resolution to backend:', err);
    } finally {
      setSubmittingResolution(false);
    }
  };

  const handleFeedbackSubmit = async (grievanceId: string, rating: number, ratingFeedback: 'Satisfied' | 'Not Satisfied', citizenFeedbackNote?: string) => {
    const updatedGrievance: Grievance = {
      ...(grievances.find(g => g.id === grievanceId) || selectedGrievance!),
      rating,
      ratingFeedback,
      citizenFeedbackNote,
      updatedAt: new Date().toISOString()
    };

    if (selectedGrievance?.id === grievanceId) {
      setSelectedGrievance(updatedGrievance);
    }
    setGrievances(prev => prev.map(g => g.id === grievanceId ? updatedGrievance : g));
    setSuccessToast('Thank you for rating the service! Your feedback has been logged.');
    setTimeout(() => setSuccessToast(''), 4000);

    try {
      await api.submitGrievanceFeedback(grievanceId, {
        rating,
        ratingFeedback,
        citizenFeedbackNote
      });
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  const handleUpdateStatus = async (status: 'Assigned' | 'In Progress' | 'Resolved' | 'Rejected') => {
    if (!selectedGrievance || updatingStatus) return;

    setUpdatingStatus(true);
    const targetId = selectedGrievance.id;
    const currentRemarks = remarks.trim();

    // 1. INSTANT OPTIMISTIC STATE UPDATE
    const updatedGrievance: Grievance = {
      ...selectedGrievance,
      status,
      remarks: currentRemarks ? currentRemarks : selectedGrievance.remarks,
      updatedAt: new Date().toISOString(),
    };

    // Instantly update active card and list view
    setSelectedGrievance(updatedGrievance);
    setGrievances(prev => prev.map(g => g.id === targetId ? updatedGrievance : g));
    setRemarks('');

    setSuccessToast(`Status updated to "${status}" instantly!`);
    setTimeout(() => setSuccessToast(''), 4000);

    // 2. Perform backend sync asynchronously
    try {
      await api.updateGrievanceStatus(targetId, { status, remarks: currentRemarks });
    } catch (err: any) {
      console.error('Background status update sync error:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteGrievance = async () => {
    if (!grievanceToDelete) return;
    setDeleting(true);
    const targetId = grievanceToDelete.id;
    const targetTitle = grievanceToDelete.title;

    // Check if citizen is attempting to delete a complaint that has already moved to 'In Progress' or later
    const target = grievances.find(g => g.id === targetId) || (selectedGrievance?.id === targetId ? selectedGrievance : null);
    if (user?.role === 'citizen' && target && !['Submitted', 'Pending', 'Assigned'].includes(target.status)) {
      setFormError('This complaint cannot be deleted because the assigned officer has already started work.');
      setGrievanceToDelete(null);
      setDeleting(false);
      return;
    }

    try {
      await api.deleteGrievance(targetId);

      // Remove from dashboard state
      setGrievances(prev => prev.filter(g => g.id !== targetId));
      if (selectedGrievance?.id === targetId) {
        setSelectedGrievance(null);
      }
      setGrievanceToDelete(null);
      setSuccessToast(`Complaint "${targetTitle}" deleted successfully.`);
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err: any) {
      console.error('Error deleting grievance:', err);
      const errMsg = err?.message || 'This complaint cannot be deleted because the assigned officer has already started work.';
      setFormError(errMsg);
      setGrievanceToDelete(null);
      loadGrievances();
    } finally {
      setDeleting(false);
    }
  };

  const filteredGrievances = grievances.filter(g => {
    const matchesStatus = filter === 'All' || g.status === filter;
    const effectiveSeverity = g.severity || (g.urgency === 'High' ? 'High' : g.urgency === 'Low' ? 'Low' : 'Medium');
    const matchesSeverity = severityFilter === 'All' || effectiveSeverity === severityFilter;
    return matchesStatus && matchesSeverity;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-100 dark:bg-amber-950/70 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60';
      case 'Assigned':
        return 'bg-blue-100 dark:bg-blue-950/70 text-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60';
      case 'In Progress':
        return 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800/60';
      case 'Resolved':
        return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60';
      case 'Rejected':
        return 'bg-rose-100 dark:bg-rose-950/70 text-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700';
    }
  };

  const getSeverityStyle = (severity?: string, urgency?: string) => {
    const eff = severity || (urgency === 'High' ? 'High' : urgency === 'Low' ? 'Low' : 'Medium');
    switch (eff) {
      case 'Critical':
        return {
          badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60',
          emoji: '🔴',
          label: 'Critical'
        };
      case 'High':
        return {
          badge: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60',
          emoji: '🟠',
          label: 'High'
        };
      case 'Low':
        return {
          badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60',
          emoji: '🟢',
          label: 'Low'
        };
      case 'Medium':
      default:
        return {
          badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60',
          emoji: '🟡',
          label: 'Medium'
        };
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title & Submission Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold text-slate-800 dark:text-[#F8FAFC]">Citizen Grievance Desk</h2>
            {user?.role === 'officer' && (
              <span className="rounded-full bg-blue-100 dark:bg-blue-950/60 px-3 py-1 text-xs font-extrabold text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shadow-sm">
                Jurisdiction: {user.assignedZone || 'Bengaluru South'}
              </span>
            )}
            {user?.role === 'citizen' && user.zone && (
              <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                Zone: {user.zone}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {user?.role === 'officer'
              ? `Showing complaints filed by residents within your assigned jurisdiction: ${user.assignedZone || 'Bengaluru South'}`
              : 'Report civic problems or trace resolution steps with automatic zone-based officer assignment'}
          </p>
        </div>
        {user?.role === 'citizen' && (
          <button
            onClick={() => {
              setFormError('');
              setShowSubmitModal(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/15 transition-all hover:bg-blue-700 hover:shadow-blue-700/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            File Grievance
          </button>
        )}
      </div>

      {/* Success Banner Toast */}
      {successToast && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-sm animate-fade-in">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Grid: Complaint Triage / Form details */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* Left Side: Complaints List */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Status and Severity Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] px-4 py-3 shadow-sm">
            {/* Status Filter buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">
                <Filter className="h-4 w-4 text-slate-400 dark:text-slate-400" />
                <span>Status:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected'].map(st => (
                  <button
                    key={st}
                    onClick={() => setFilter(st)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                      filter === st
                        ? 'bg-slate-800 dark:bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-50 dark:bg-[#172033] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#243044]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Filter Dropdown */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">
                <AlertTriangle className="h-4 w-4 text-slate-400 dark:text-slate-400" />
                <span className="whitespace-nowrap">Severity:</span>
              </div>
              <div className="relative">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as any)}
                  className="h-8.5 appearance-none rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#172033] pl-3 pr-8 text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-xs"
                >
                  <option value="All">All Severities</option>
                  <option value="Critical">🔴 Critical</option>
                  <option value="High">🟠 High</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="Low">🟢 Low</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex h-36 items-center justify-center rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B]">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : filteredGrievances.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] py-12 text-center">
              <BadgeAlert className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
              <h4 className="mt-3 text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">No complaints found</h4>
              <p className="text-xs text-slate-400 dark:text-slate-400">Everything looks clean in this sector!</p>
            </div>
          ) : (
            filteredGrievances.map(g => (
              <div
                key={g.id}
                onClick={() => setSelectedGrievance(g)}
                className={`group relative rounded-2xl border p-5 shadow-sm transition-all cursor-pointer hover:shadow-md ${
                  selectedGrievance?.id === g.id
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-blue-300 dark:hover:border-emerald-500/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${getStatusStyle(g.status)}`}>
                        {g.status}
                      </span>
                      {(() => {
                        const sevStyle = getSeverityStyle(g.severity, g.urgency);
                        return (
                          <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold ${sevStyle.badge}`}>
                            <span>{sevStyle.emoji}</span>
                            <span>{sevStyle.label}</span>
                          </span>
                        );
                      })()}
                      <span className="rounded bg-slate-100 dark:bg-[#172033] px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] border border-transparent dark:border-[#334155]">
                        {g.category}
                      </span>
                      {g.zone && (
                        <span className="rounded bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 text-[9px] font-bold text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                          📍 {g.zone}
                        </span>
                      )}
                      {((g.images && g.images.length > 0) || g.image) && (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50">
                          <ImageIcon className="h-3 w-3" />
                          {(g.images && g.images.length > 0) ? g.images.length : 1} Photo
                        </span>
                      )}
                    </div>
                    {user?.role !== 'citizen' && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-[#172033] px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-[#CBD5E1] border border-slate-200/80 dark:border-[#334155]">
                          <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          <span className="text-slate-500 dark:text-slate-400">Filed by:</span>
                          <strong className="font-bold text-slate-800 dark:text-[#F8FAFC]">
                            {g.citizenName || 'Registered Citizen'}
                          </strong>
                        </span>
                      </div>
                    )}
                    <h3 className="mt-2 font-display text-sm font-bold text-slate-800 dark:text-[#F8FAFC] group-hover:text-blue-600 dark:group-hover:text-emerald-400 transition-colors">
                      {g.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-[#CBD5E1] leading-relaxed max-w-2xl">
                      {g.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8]">
                      {new Date(g.createdAt).toLocaleDateString()}
                    </span>
                    {user?.role === 'officer' && (!user.assignedZone || !g.zone || g.zone === user.assignedZone) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGrievanceToDelete({ id: g.id, title: g.title });
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
                        title="Delete grievance (Zone Officer)"
                      >
                        <Trash2 className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                        <span>Delete</span>
                      </button>
                    )}
                    {user?.role === 'citizen' && (g.citizenId === user.id || g.citizenName === user.name || !g.citizenId) && ['Submitted', 'Pending', 'Assigned'].includes(g.status) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGrievanceToDelete({ id: g.id, title: g.title });
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
                        title="Delete complaint"
                      >
                        <Trash2 className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Map Display if location or coords exist */}
                {(g.latitude && g.longitude) || g.location ? (
                  <div className="mt-3.5">
                    <GrievanceMapDisplay
                      latitude={g.latitude}
                      longitude={g.longitude}
                      locationAddress={g.location}
                      title={g.title}
                    />
                  </div>
                ) : null}

                {/* Problem Images attached */}
                {((g.images && g.images.length > 0) || g.image) && (
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    {((g.images && g.images.length > 0) ? g.images : [g.image!]).map((imgUrl, i) => (
                      <div
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveLightboxImage(imgUrl);
                        }}
                        className="group/img relative h-16 w-20 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm transition-all hover:scale-105 hover:ring-2 hover:ring-blue-500"
                      >
                        <img src={imgUrl} alt={`Problem Evidence ${i + 1}`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover/img:opacity-100">
                          <Eye className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Plan badge if present */}
                {g.aiSuggestedPlan && (
                  <div className="mt-4 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/30 p-3 text-[11px] text-indigo-900 dark:text-indigo-200 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
                      <Bot className="h-4 w-4 shrink-0" />
                      <span>SOP Resolution Plan (AI Suggested)</span>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-[#CBD5E1]">{g.aiSuggestedPlan}</p>
                  </div>
                )}

                {/* Officer remarks if present */}
                {g.remarks && g.status !== 'Resolved' && (
                  <div className="mt-3.5 rounded-xl border border-slate-100 dark:border-[#334155] bg-slate-50 dark:bg-[#172033] p-3 text-[11px] text-slate-700 dark:text-[#CBD5E1] leading-relaxed">
                    <span className="font-bold text-slate-800 dark:text-[#F8FAFC]">Officer Remarks:</span>
                    <p className="mt-0.5 text-slate-500 dark:text-slate-400">{g.remarks}</p>
                  </div>
                )}

                {/* Resolution Details for Resolved complaints */}
                {g.status === 'Resolved' && (
                  <div className="mt-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/60 pb-2 mb-3 gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-display text-xs font-bold text-emerald-900 dark:text-emerald-300">Complaint Marked Resolved</span>
                      </div>
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
                        Completion Date: {g.completedDate || (g.resolvedAt ? new Date(g.resolvedAt).toLocaleDateString() : '04-08-2026')}
                      </span>
                    </div>

                    {/* Complaint Photos: Before (Citizen) & After (Officer) */}
                    <div className="mb-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-[#1E293B] p-3 shadow-2xs">
                      <h5 className="font-bold text-xs text-slate-800 dark:text-[#F8FAFC] mb-2 flex items-center gap-1.5 border-b border-slate-100 dark:border-[#334155] pb-1.5">
                        <Camera className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Complaint Photos</span>
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 📷 Before (Citizen) */}
                        <div className="rounded-lg border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20 p-2">
                          <div className="flex items-center gap-1 mb-1.5">
                            <span className="rounded bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/60 px-1.5 py-0.5 text-[9px] font-black text-amber-900 dark:text-amber-300 uppercase">
                              📷 BEFORE (CITIZEN)
                            </span>
                          </div>
                          {((g.images && g.images.length > 0) || g.image) ? (
                            <div className="flex flex-wrap gap-1.5">
                              {((g.images && g.images.length > 0) ? g.images : [g.image!]).map((img, i) => (
                                <img
                                  key={i}
                                  src={img}
                                  alt={`Before ${i + 1}`}
                                  onClick={(e) => { e.stopPropagation(); setActiveLightboxImage(img); }}
                                  className="h-24 w-full object-cover rounded-lg border border-amber-200 dark:border-amber-800/60 cursor-pointer hover:opacity-90"
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="h-24 flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30 text-[10px] text-amber-700 dark:text-amber-300 italic border border-dashed border-amber-200 dark:border-amber-800/60">
                              No before photo attached
                            </div>
                          )}
                        </div>

                        {/* 📷 After (Officer) */}
                        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/20 p-2">
                          <div className="flex items-center gap-1 mb-1.5">
                            <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-black text-white uppercase shadow-xs">
                              📷 AFTER (OFFICER)
                            </span>
                          </div>
                          {g.resolutionPhotos && g.resolutionPhotos.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {g.resolutionPhotos.map((img, i) => (
                                <img
                                  key={i}
                                  src={img}
                                  alt={`After ${i + 1}`}
                                  onClick={(e) => { e.stopPropagation(); setActiveLightboxImage(img); }}
                                  className="h-24 w-full object-cover rounded-lg border border-emerald-300 dark:border-emerald-800/60 cursor-pointer hover:opacity-90 ring-1 ring-emerald-500/20"
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="h-24 flex flex-col items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center border border-dashed border-emerald-300 dark:border-emerald-800/60">
                              <Camera className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mb-1" />
                              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">Verified Work Completed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Officer Resolution Remarks */}
                    {(g.resolutionRemarks || g.remarks) && (
                      <div className="rounded-xl bg-white dark:bg-[#1E293B] p-3 border border-emerald-200/80 dark:border-emerald-800/60 text-xs text-slate-800 dark:text-[#F8FAFC] leading-relaxed mb-3">
                        <span className="font-bold text-emerald-900 dark:text-emerald-300 block mb-0.5">Resolution Remarks:</span>
                        <p className="text-slate-700 dark:text-[#CBD5E1] font-medium">{g.resolutionRemarks || g.remarks}</p>
                      </div>
                    )}

                    {/* Citizen Rating & Feedback Component (Citizen rates, Officer sees read-only) */}
                    <CitizenRatingSection grievance={g} onRatingSubmit={handleFeedbackSubmit} />
                  </div>
                )}

                {/* Quick actions indicator for officers / admins */}
                {user?.role !== 'citizen' && g.status !== 'Resolved' && (
                  <div className="mt-4 flex items-center justify-end gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    <span>Manage Complaint</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right Side: Operations Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* AI Info Card */}
          <div className="rounded-3xl border border-blue-100 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/30 dark:to-indigo-950/20 p-5 shadow-sm">
            <h4 className="font-display text-sm font-bold text-slate-800 dark:text-[#F8FAFC] flex items-center gap-1.5">
              <Bot className="h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-bounce" />
              Smart Triage Process
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-[#CBD5E1]">
              When a citizen submits a complaint, our server-side **Gemini 3.5 AI** immediately evaluates the impact, classifies the category, highlights the urgency level, and generates a structured operational resolution plan for the officers to review!
            </p>
          </div>

          {/* Active Review Box / Resolution Console (Officers & Admins ONLY) */}
          {user?.role !== 'citizen' && (
            <div className="rounded-3xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-sm">
              <h4 className="font-display text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">
                {user?.role === 'admin' ? 'Complaint Inspection Console (Admin View)' : 'Zone Officer Resolution Console'}
              </h4>
              {selectedGrievance ? (
                <div className="mt-4 flex flex-col gap-4">
                  {/* Admin Read-Only Notice */}
                  {user?.role === 'admin' && (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200 shadow-2xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                        <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Admin View (Read-Only)</span>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-[#CBD5E1] text-[11px] leading-relaxed">
                        Admins can view complaints across all zones. The approval, rejection, and resolution processes are performed by the respective Zone Officers.
                      </p>
                    </div>
                  )}

                  {/* Officer Zone Mismatch Notice */}
                  {user?.role === 'officer' && user.assignedZone && selectedGrievance.zone && selectedGrievance.zone !== user.assignedZone && (
                    <div className="rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 p-3.5 text-xs text-blue-900 dark:text-blue-200 shadow-2xs">
                      <div className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-300">
                        <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>Zone Restricted ({selectedGrievance.zone})</span>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-[#CBD5E1] text-[11px] leading-relaxed">
                        This complaint belongs to <strong>{selectedGrievance.zone}</strong>. Only the assigned <strong>{getZoneOfficerDesignation(selectedGrievance.zone)}</strong> can approve, reject, or resolve this issue.
                      </p>
                    </div>
                  )}

                  <div className="rounded-xl bg-slate-50 dark:bg-[#172033] p-3 text-xs border border-slate-100 dark:border-[#334155]">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-[#334155] pb-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${getStatusStyle(selectedGrievance.status)}`}>
                          {selectedGrievance.status}
                        </span>
                        {(() => {
                          const sevStyle = getSeverityStyle(selectedGrievance.severity, selectedGrievance.urgency);
                          return (
                            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold ${sevStyle.badge}`}>
                              <span>{sevStyle.emoji}</span>
                              <span>{sevStyle.label} Severity</span>
                            </span>
                          );
                        })()}
                      </div>
                      <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px]">Grievance Details</span>
                    </div>
                    {user?.role !== 'citizen' && selectedGrievance.citizenName && (
                      <p className="font-semibold text-slate-800 dark:text-[#F8FAFC]">
                        <span className="text-slate-500 dark:text-slate-400 font-normal text-xs">Complainant: </span>
                        {selectedGrievance.citizenName}
                      </p>
                    )}
                    <p className="mt-1 text-slate-600 dark:text-[#CBD5E1] leading-normal font-bold">{selectedGrievance.title}</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 leading-normal">{selectedGrievance.description}</p>
                    
                    {/* Map in console */}
                    {(selectedGrievance.latitude && selectedGrievance.longitude) || selectedGrievance.location ? (
                      <div className="mt-2.5 border-t border-slate-200/60 pt-2">
                        <GrievanceMapDisplay
                          latitude={selectedGrievance.latitude}
                          longitude={selectedGrievance.longitude}
                          locationAddress={selectedGrievance.location}
                          title={selectedGrievance.title}
                        />
                      </div>
                    ) : null}

                    {/* Photos in console: Before & After comparison */}
                    <div className="mt-2.5 border-t border-slate-200/60 pt-2.5">
                      <span className="text-[10px] font-bold text-slate-700 dark:text-[#CBD5E1] uppercase flex items-center gap-1 mb-1.5">
                        <Camera className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        Complaint Photos
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Before (Citizen) */}
                        <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-2">
                          <span className="text-[9px] font-black text-amber-900 dark:text-amber-300 block mb-1">📷 BEFORE (CITIZEN)</span>
                          {((selectedGrievance.images && selectedGrievance.images.length > 0) || selectedGrievance.image) ? (
                            <div className="flex flex-wrap gap-1">
                              {((selectedGrievance.images && selectedGrievance.images.length > 0) ? selectedGrievance.images : [selectedGrievance.image!]).map((imgUrl, idx) => (
                                <img
                                  key={idx}
                                  src={imgUrl}
                                  alt="Before Evidence"
                                  onClick={() => setActiveLightboxImage(imgUrl)}
                                  className="h-14 w-full cursor-pointer rounded-md object-cover ring-1 ring-amber-200 dark:ring-amber-800/60 hover:opacity-90 transition-all"
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="h-14 flex items-center justify-center rounded bg-amber-50 dark:bg-amber-950/30 text-[9px] text-amber-700 dark:text-amber-300 italic border border-dashed border-amber-200 dark:border-amber-800/60">
                              No before photo
                            </div>
                          )}
                        </div>

                        {/* After (Officer) */}
                        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-black text-emerald-900 dark:text-emerald-300">📷 AFTER (OFFICER)</span>
                            {((selectedGrievance.resolutionPhotos && selectedGrievance.resolutionPhotos.length > 0) || resolutionPhotos.length > 0) && (
                              <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60 px-1.5 py-0.5 text-[8px] font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-0.5">
                                ✓ Uploaded
                              </span>
                            )}
                          </div>

                          {((selectedGrievance.resolutionPhotos && selectedGrievance.resolutionPhotos.length > 0) || resolutionPhotos.length > 0) ? (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex flex-wrap gap-1">
                                {((selectedGrievance.resolutionPhotos && selectedGrievance.resolutionPhotos.length > 0)
                                  ? selectedGrievance.resolutionPhotos
                                  : resolutionPhotos).map((imgUrl, idx) => (
                                  <div key={idx} className="relative group/after w-full h-20 rounded-md overflow-hidden border border-emerald-300 dark:border-emerald-800/60 shadow-xs">
                                    <img
                                      src={imgUrl}
                                      alt="Resolution Image"
                                      onClick={() => setActiveLightboxImage(imgUrl)}
                                      className="h-full w-full cursor-pointer object-cover ring-1 ring-emerald-300 hover:opacity-90 transition-all"
                                    />
                                  </div>
                                ))}
                              </div>
                              {user?.role === 'officer' && (!user.assignedZone || !selectedGrievance.zone || selectedGrievance.zone === user.assignedZone) && (
                                <label className="inline-flex items-center justify-center gap-1 rounded bg-white dark:bg-[#172033] px-2 py-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors">
                                  <Camera className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                  Change / Add Photo
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => handleDirectResolutionFiles(e.target.files)}
                                    className="hidden"
                                  />
                                </label>
                              )}
                            </div>
                          ) : (
                            user?.role === 'officer' && (!user.assignedZone || !selectedGrievance.zone || selectedGrievance.zone === user.assignedZone) ? (
                              <div className="flex flex-col gap-1.5">
                                <div className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-emerald-300 dark:border-emerald-800/60 bg-white dark:bg-[#172033] p-3 text-center hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 transition-all cursor-pointer group">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => handleDirectResolutionFiles(e.target.files)}
                                    className="absolute inset-0 z-10 cursor-pointer opacity-0"
                                  />
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 mb-0.5 group-hover:scale-110 transition-transform">
                                    <Camera className="h-3.5 w-3.5" />
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-800 dark:text-[#F8FAFC]">
                                    📷 Upload Resolution Photo
                                  </p>
                                  <p className="text-[8px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Click or Drag & Drop
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => addSampleDirectResolutionPhoto(SAMPLE_RESOLUTION_PHOTOS[0].url)}
                                  className="w-full text-center rounded bg-emerald-100/70 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-1.5 py-1 text-[9px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition-colors cursor-pointer"
                                >
                                  ✨ Attach Sample Proof Photo
                                </button>
                              </div>
                            ) : (
                              <div className="h-14 flex items-center justify-center rounded bg-emerald-50 dark:bg-emerald-950/30 text-[9px] text-emerald-700 dark:text-emerald-300 italic border border-dashed border-emerald-200 dark:border-emerald-800/60">
                                No after photo
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Officer Action Controls (Respective Zone Officer Only) */}
                  {user?.role === 'officer' && (!user.assignedZone || !selectedGrievance.zone || selectedGrievance.zone === user.assignedZone) && (
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Add Action Remarks</label>
                        <textarea
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder=""
                          rows={3}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] p-3 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                        />
                      </div>

                      {(() => {
                        const status = selectedGrievance.status;
                        const isStartWorkDisabled = updatingStatus || status === 'In Progress' || status === 'Resolved' || status === 'Rejected';
                        const isMarkResolvedDisabled = updatingStatus || status !== 'In Progress';
                        const isAssignTaskforceDisabled = updatingStatus || status === 'Resolved' || status === 'Rejected';
                        const isRejectIssueDisabled = updatingStatus || status === 'In Progress' || status === 'Resolved' || status === 'Rejected';

                        return (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                disabled={isStartWorkDisabled}
                                onClick={() => handleUpdateStatus('In Progress')}
                                className="rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 py-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                Start Work
                              </button>
                              <button
                                type="button"
                                disabled={isMarkResolvedDisabled}
                                onClick={() => openResolutionModal(selectedGrievance)}
                                className="rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/15 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                Mark Resolved
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                disabled={isAssignTaskforceDisabled}
                                onClick={() => handleUpdateStatus('Assigned')}
                                className="rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                Assign Taskforce
                              </button>
                              <button
                                type="button"
                                disabled={isRejectIssueDisabled}
                                onClick={() => handleUpdateStatus('Rejected')}
                                className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                Reject Issue
                              </button>
                            </div>
                          </>
                        );
                      })()}
                    </>
                  )}
                  {/* Citizen Action Controls (Complaint Owner) */}
                  {user?.role === 'citizen' && (selectedGrievance.citizenId === user.id || selectedGrievance.citizenName === user.name || !selectedGrievance.citizenId) && (
                    <div className="pt-3 border-t border-slate-100 dark:border-[#334155]">
                      {['Submitted', 'Pending', 'Assigned'].includes(selectedGrievance.status) ? (
                        <button
                          type="button"
                          onClick={() => setGrievanceToDelete({ id: selectedGrievance.id, title: selectedGrievance.title })}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 hover:border-rose-300 transition-all active:scale-95 shadow-2xs cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                          <span>Delete Complaint</span>
                        </button>
                      ) : (
                        <div className="rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#172033] p-3 text-xs text-slate-600 dark:text-[#CBD5E1]">
                          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-[#F8FAFC] mb-1">
                            <Trash2 className="h-4 w-4 text-slate-400 shrink-0" />
                            <span>Delete Complaint (Disabled)</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                            This complaint cannot be deleted because the assigned officer has already started work.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-center py-6 text-xs text-slate-400 dark:text-slate-400">
                  Select a complaint card from the left panel to view details.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Citizen Submission Modal */}
      {showSubmitModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 dark:bg-black/80 p-4 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setShowSubmitModal(false)}
        >
          <div
            className="relative my-auto w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-6 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#334155] pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-800 dark:text-[#F8FAFC]">File Civic Grievance</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Provide details. Our AI engine will auto-categorize and score it.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-[#243044] text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#334155] hover:text-slate-800 dark:hover:text-white transition-colors"
                title="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Category & Area/Zone */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                  >
                    <option value="Water Supply">Water Supply (leakages, muddy water, hours disruption)</option>
                    <option value="Road Damage">Road Damage (potholes, water-logging)</option>
                    <option value="Electricity">Electricity (fluctuation, cutouts, faulty transformers)</option>
                    <option value="Garbage">Garbage Dumping (filth, public waste piles)</option>
                    <option value="Street Light">Street Light Failure (dark roads, safety risk)</option>
                    <option value="Drainage">Drainage Overflow (foul smell, blocks)</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1]">Area / Zone</label>
                  <select
                    value={user?.role === 'citizen' ? (user?.assignedZone || user?.zone || 'Bengaluru South') : areaZone}
                    onChange={(e) => setAreaZone(e.target.value)}
                    disabled={user?.role === 'citizen'}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer disabled:bg-slate-100 dark:disabled:bg-[#1E293B] disabled:text-slate-900 dark:disabled:text-white disabled:border-slate-300 dark:disabled:border-slate-700 disabled:cursor-not-allowed shadow-2xs"
                  >
                    {Object.keys(AREA_OFFICER_MAP).map((a) => (
                      <option key={a} value={a} className="bg-white dark:bg-[#172033] text-slate-900 dark:text-white">
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Severity Dropdown */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] block mb-1">
                  Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as 'Critical' | 'High' | 'Medium' | 'Low')}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="Critical">🔴 Critical — Immediate attention required</option>
                  <option value="High">🟠 High — Urgent issue</option>
                  <option value="Medium">🟡 Medium — Normal priority</option>
                  <option value="Low">🟢 Low — Minor issue</option>
                </select>
              </div>

              {/* Auto Assigned Responsible Officer */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] block mb-1">
                  Responsible Officer
                </label>
                <div className="rounded-2xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/90 dark:bg-blue-950/50 p-3 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold text-blue-950 dark:text-blue-200 uppercase tracking-wider">
                      Area Assigned Officer
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      <Check className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
                      <span>Auto Assigned</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-white dark:bg-[#1E293B] p-2.5 border border-blue-200 dark:border-blue-900/80 shadow-xs">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs">
                      👤
                    </div>
                    <div>
                      <h5 className="text-xs font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                        {getDynamicAreaOfficer(areaZone).name}
                      </h5>
                      <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {getDynamicAreaOfficer(areaZone).role}
                      </p>
                      <p className="text-[10px] font-extrabold text-blue-800 dark:text-blue-400 mt-0.5">
                        {areaZone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">
                  Complain Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder="e.g. Broken main drinking pipe causing water leakage"
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">
                    Detailed Description <span className="text-rose-500">*</span>
                  </label>
                  <span
                    className={`text-[10px] font-semibold transition-colors ${
                      description.trim().length === 0
                        ? 'text-slate-400 dark:text-slate-500'
                        : description.trim().length > 1000
                        ? 'text-rose-500'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {description.length} / 1000
                  </span>
                </div>
                <textarea
                  required
                  value={description}
                  maxLength={1000}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder="Write clear details of the problem so we can dispatch maintenance officers instantly..."
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] p-3 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              {/* Pinpoint Location Map Picker */}
              <div>
                <GrievanceMapPicker
                  latitude={latitude}
                  longitude={longitude}
                  locationAddress={locationAddress}
                  userZone={user?.assignedZone || user?.zone || areaZone || 'Bengaluru South'}
                  onChangeLocation={(lat, lng, addr) => {
                    setLatitude(lat);
                    setLongitude(lng);
                    setLocationAddress(addr);
                    const cz = user?.assignedZone || user?.zone || areaZone || 'Bengaluru South';
                    const valid = isLocationInZone(lat, lng, addr, cz);
                    setIsLocationValid(valid);
                    if (!valid) {
                      setFormError('Please select a location inside your zone.');
                    } else {
                      if (formError && (formError.includes('registered zone') || formError.includes('inside your zone'))) {
                        setFormError('');
                      }
                    }
                  }}
                  onValidationChange={(isValid, validationMsg) => {
                    setIsLocationValid(isValid);
                    if (!isValid) {
                      setFormError(validationMsg);
                    } else {
                      if (formError && (formError.includes('registered zone') || formError.includes('inside your zone'))) {
                        setFormError('');
                      }
                    }
                  }}
                  onZoneError={(errMsg) => setFormError(errMsg)}
                />
              </div>

              {/* Attach Problem Photos */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Attach Photos of Issue <span className="text-[10px] font-normal text-slate-400 dark:text-slate-400">(Optional)</span>
                  </label>
                  {images.length > 0 && (
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800/60">
                      {images.length} photo{images.length > 1 ? 's' : ''} attached
                    </span>
                  )}
                </div>

                {/* Dropzone / Upload Box */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`mt-1.5 relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-3 text-center transition-all ${
                    isDragging ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/50' : 'border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-[#172033]/50 hover:bg-slate-50 dark:hover:bg-[#172033]'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFiles(e.target.files)}
                    className="absolute inset-0 z-10 cursor-pointer opacity-0"
                  />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <UploadCloud className="h-4 w-4" />
                  </div>
                  <p className="mt-1 text-xs font-bold text-slate-700 dark:text-[#F8FAFC]">
                    Click or Drag & Drop photo of issue
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400">Upload photos from camera or gallery</p>
                </div>


                {/* Attached Thumbnails List */}
                {images.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#172033] p-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative group h-14 w-16 rounded-lg overflow-hidden border border-slate-200 dark:border-[#334155] shadow-sm bg-white dark:bg-[#1E293B]">
                        <img src={img} alt={`Attached ${i + 1}`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white shadow hover:bg-rose-700"
                          title="Remove photo"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#334155] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !isLocationValid || !latitude || !longitude || !title.trim() || !description.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/15 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? 'Submitting...' : 'Submit to Panchayath'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Officer Complaint Resolution Modal */}
      {showResolutionModal && selectedGrievance && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 dark:bg-black/80 p-4 backdrop-blur-sm flex items-center justify-center animate-fade-in"
          onClick={() => setShowResolutionModal(false)}
        >
          <div
            className="relative my-auto w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-[#1E293B] p-6 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-800 dark:text-[#F8FAFC]">Complaint Resolution</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Provide resolution remarks and completion date to resolve complaint</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResolutionModal(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-[#243044] text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#334155] hover:text-slate-800 dark:hover:text-white transition-colors"
                title="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveResolution} className="mt-4 flex flex-col gap-4">
              {resolutionError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{resolutionError}</span>
                </div>
              )}

              {/* Complaint Summary Context */}
              <div className="rounded-2xl border border-slate-100 dark:border-[#334155] bg-slate-50 dark:bg-[#172033] p-3 text-xs">
                <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px]">Resolving Complaint</span>
                <p className="font-bold text-slate-800 dark:text-[#F8FAFC] mt-0.5">{selectedGrievance.title}</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate mt-0.5">{selectedGrievance.location || selectedGrievance.zone}</p>
              </div>

              {/* Resolution Remarks * */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">
                    Resolution Remarks <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                    {resolutionRemarks.length} / 500
                  </span>
                </div>
                <textarea
                  required
                  value={resolutionRemarks}
                  maxLength={500}
                  onChange={(e) => {
                    setResolutionRemarks(e.target.value);
                    if (resolutionError) setResolutionError('');
                  }}
                  placeholder=""
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] p-3 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                />
              </div>

              {/* Upload Resolution Photo(s) (Optional) */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Upload Completed Work Image(s)
                  </label>
                  {resolutionPhotos.length > 0 && (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                      {resolutionPhotos.length} photo{resolutionPhotos.length > 1 ? 's' : ''} attached
                    </span>
                  )}
                </div>

                {/* Upload Dropzone */}
                <div
                  className="mt-1.5 relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/30 p-4 text-center hover:bg-emerald-50/60 dark:hover:bg-emerald-950/50 transition-all cursor-pointer"
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleResolutionFiles(e.target.files)}
                    className="absolute inset-0 z-10 cursor-pointer opacity-0"
                  />
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 mb-1">
                    <Camera className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">
                    Click or Drag & Drop <span className="font-normal text-slate-500 dark:text-slate-400">to upload work photo</span> 📷
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">Attach clear picture proof of repaired site</p>
                </div>

                {/* Photo Previews */}
                {resolutionPhotos.length > 0 && (
                  <div className="mt-3 border-t border-slate-100 dark:border-[#334155] pt-2">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Attached Work Proof Preview:</span>
                    <div className="flex flex-wrap gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/30 p-2">
                      {resolutionPhotos.map((img, i) => (
                        <div key={i} className="relative group h-16 w-20 rounded-lg overflow-hidden border border-emerald-300 dark:border-emerald-700 shadow-sm bg-white dark:bg-[#1E293B]">
                          <img src={img} alt={`After Photo ${i + 1}`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => removeResolutionImage(i)}
                            className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white shadow hover:bg-rose-700"
                            title="Remove photo"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Completion Date */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Completion Date
                </label>
                <input
                  type="date"
                  min="1900-01-01"
                  max="2099-12-31"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(sanitizeDateYear(e.target.value))}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowResolutionModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#334155] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResolution}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <CheckCircle className="h-4 w-4" />
                  {submittingResolution ? 'Submitting Resolution...' : 'Submit & Mark Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {activeLightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setActiveLightboxImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-slate-900 p-2 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setActiveLightboxImage(null)}
              className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={activeLightboxImage} alt="Problem Evidence Detail" className="max-h-[82vh] w-auto max-w-full rounded-xl object-contain" referrerPolicy="no-referrer" />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {grievanceToDelete && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 dark:bg-black/80 p-4 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setGrievanceToDelete(null)}
        >
          <div
            className="relative my-auto w-full max-w-md rounded-3xl border border-rose-100 dark:border-rose-900/60 bg-white dark:bg-[#1E293B] p-6 shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 shadow-sm">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-slate-800 dark:text-[#F8FAFC]">Delete Complaint</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Confirm complaint removal</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 dark:border-[#334155] bg-slate-50 dark:bg-[#172033] p-3 text-xs text-slate-700 dark:text-[#CBD5E1]">
              <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px] block mb-1">Complaint Title:</span>
              <p className="font-bold text-slate-800 dark:text-[#F8FAFC]">{grievanceToDelete.title}</p>
            </div>

            <p className="mt-4 text-xs text-slate-600 dark:text-[#CBD5E1] font-medium leading-relaxed">
              Are you sure you want to delete this complaint? This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setGrievanceToDelete(null)}
                className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#243044] px-4 py-2 text-xs font-bold text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#334155] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteGrievance}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
