import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Bell, Clock, Trash2, Calendar, MapPin, Lock, ShieldAlert, Filter, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getZoneOfficerDesignation } from '../utils/zoneUtils';
import { api } from '../services/api';
import { Notice } from '../types';

export default function PublicNotices() {
  const { user } = useAuth();
  const cachedNotices = api.getCachedSync('notices');
  const [notices, setNotices] = useState<Notice[]>(cachedNotices || []);
  const [loading, setLoading] = useState(!cachedNotices);

  // Form states (Admin & Officers)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [targetZone, setTargetZone] = useState<string>('All Areas');
  const [adminAreaFilter, setAdminAreaFilter] = useState<string>('All');
  const [savingNotice, setSavingNotice] = useState(false);

  // Delete modal state
  const [noticeToDelete, setNoticeToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Helper to get user jurisdiction area
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

  const userArea = getUserJurisdictionArea(user);
  const isCitizen = user?.role === 'citizen';
  const isOfficer = user?.role === 'officer';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isOfficer) {
      setTargetZone(user?.assignedZone || userArea);
    } else if (isAdmin) {
      setTargetZone('All Areas');
    }
    loadNotices();
  }, [user]);

  const loadNotices = async () => {
    try {
      const list = await api.getNotices();
      if (list) setNotices(list);
    } catch (err) {
      console.error('Error loading notices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Please fill in both announcement title and content.');
      return;
    }

    if (content.trim().length > 1500) {
      alert('Notice content cannot exceed 1500 characters.');
      return;
    }

    setSavingNotice(true);
    try {
      // Officer area is automatically assigned to officer's own area
      const assignedArea = isOfficer ? (user?.assignedZone || userArea) : targetZone;

      await api.publishNotice({
        title: title.trim(),
        content: content.trim(),
        category,
        targetZone: assignedArea,
        targetArea: assignedArea,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      setShowCreateModal(false);
      setTitle('');
      setContent('');
      await loadNotices();
    } catch (err: any) {
      alert(err.message || 'Error publishing notice.');
    } finally {
      setSavingNotice(false);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'Emergency':
        return 'bg-rose-100 dark:bg-rose-950/80 text-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700';
      case 'Welfare':
        return 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
      case 'Taxation':
        return 'bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 border-slate-300 dark:border-slate-700';
    }
  };

  // Filtered notices by area visibility rules
  const filteredNotices = notices.filter((notice) => {
    const noticeArea = notice.targetZone || (notice as any).targetArea || 'All Areas';
    const isAllAreas = noticeArea === 'All' || noticeArea === 'All Areas' || noticeArea === 'All Zones';

    if (isCitizen) {
      // Citizens see ONLY notices targeted to their registered area + notices targeted to 'All Areas'
      return isAllAreas || noticeArea === userArea;
    }

    if (isOfficer) {
      // Officers see notices for their assigned area + All Areas
      const officerZone = user?.assignedZone || userArea;
      return isAllAreas || noticeArea === officerZone;
    }

    if (isAdmin) {
      // Admins can filter list by selected area filter
      if (adminAreaFilter === 'All' || adminAreaFilter === 'All Areas') return true;
      return noticeArea === adminAreaFilter;
    }

    return isAllAreas || noticeArea === userArea;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header Section */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-800 dark:text-[#F8FAFC]">Gram Announcement Board</h2>
          <p className="text-xs text-slate-500 dark:text-[#CBD5E1]">Official directives, area-based circulars, and public notices</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-[#CBD5E1]">Filter Area:</span>
              <select
                value={adminAreaFilter}
                onChange={(e) => setAdminAreaFilter(e.target.value)}
                className="rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/60 px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 focus:border-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="All">All Panchayath Areas</option>
                <option value="Bengaluru North">Bengaluru North</option>
                <option value="Bengaluru South">Bengaluru South</option>
                <option value="Bengaluru East">Bengaluru East</option>
                <option value="Bengaluru West">Bengaluru West</option>
              </select>
            </div>
          )}

          {(isAdmin || isOfficer) && (
            <button
              onClick={() => {
                if (isOfficer) setTargetZone(user?.assignedZone || userArea);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/15 hover:bg-blue-700 cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>
                {isOfficer ? `Publish Area Notice (${user?.assignedZone || userArea})` : 'Publish Public Notice'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Area Visibility Informational Banner */}
      {isCitizen && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/90 dark:bg-[#172033] p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-xs">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 dark:text-blue-400">
                Registered Area Visibility Active
              </p>
              <p className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] mt-0.5">
                Registered Area: <span className="text-blue-700 dark:text-blue-300 font-black">{userArea}</span>
              </p>
              <p className="text-[11px] font-semibold text-slate-600 dark:text-[#CBD5E1]">
                You are viewing official announcements targeted to <span className="font-bold text-slate-800 dark:text-[#F8FAFC]">{userArea}</span> and <span className="font-bold text-slate-800 dark:text-[#F8FAFC]">All Areas</span>. Notices for other areas are hidden.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-blue-100 dark:bg-blue-950/60 px-3 py-1 text-[11px] font-extrabold text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
            <ShieldAlert className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Area Filtered</span>
          </span>
        </div>
      )}

      {isOfficer && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/90 dark:bg-[#172033] p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-xs">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800 dark:text-indigo-400">
                {getZoneOfficerDesignation(user?.assignedZone || userArea)} Jurisdiction
              </p>
              <p className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] mt-0.5">
                Assigned Area: <span className="text-indigo-700 dark:text-indigo-300 font-black">{user?.assignedZone || userArea}</span>
              </p>
              <p className="text-[11px] font-semibold text-slate-600 dark:text-[#CBD5E1]">
                Notices you create are automatically assigned to your area and cannot be broadcasted to other areas.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-950/60 px-3 py-1 text-[11px] font-extrabold text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
            <ShieldAlert className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Jurisdiction Locked</span>
          </span>
        </div>
      )}

      {/* Notices List Grid */}
      {loading ? (
        <div className="flex py-12 justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] py-12 text-center">
          <Megaphone className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 animate-pulse" />
          <p className="mt-3 text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">No Announcements Found</p>
          <p className="text-xs text-slate-400 dark:text-[#94A3B8]">There are no active notices for your area at this time.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredNotices.map((notice) => {
            const noticeArea = notice.targetZone || (notice as any).targetArea || 'All Areas';
            const isAll = noticeArea === 'All' || noticeArea === 'All Areas' || noticeArea === 'All Zones';

            return (
              <div key={notice.id} className="group relative rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`rounded px-2 py-0.5 text-[9px] font-extrabold uppercase border ${getCategoryBadge(notice.category)}`}>
                      {notice.category}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-[9px] font-extrabold border ${
                      isAll
                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                    }`}>
                      📍 Area: {noticeArea}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-[#94A3B8] shrink-0">
                    <Calendar className="h-3 w-3" />
                    {new Date(notice.publishedAt || (notice as any).createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="mt-3.5 font-display text-sm font-bold text-slate-800 dark:text-[#F8FAFC] group-hover:text-blue-600 dark:group-hover:text-emerald-400 transition-colors">
                  {notice.title}
                </h3>
                <p className="mt-2 text-xs text-slate-600 dark:text-[#CBD5E1] leading-relaxed whitespace-pre-wrap">
                  {notice.content}
                </p>
                {notice.authorName && (
                  <p className="mt-3.5 text-[10px] font-bold text-slate-400 dark:text-[#94A3B8]">
                    Issued by: <span className="text-slate-600 dark:text-[#CBD5E1]">{notice.authorName}</span>
                  </p>
                )}

                {(isAdmin || isOfficer) && (
                  <div className="mt-4 flex justify-end border-t border-slate-100 dark:border-[#334155] pt-3">
                    <button
                      onClick={() => setNoticeToDelete({ id: notice.id, title: notice.title })}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Retract Notice</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Retract/Delete Notice Confirmation Modal */}
      {noticeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1E293B] p-6 shadow-2xl border border-slate-100 dark:border-[#334155] flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-slate-900 dark:text-[#F8FAFC] text-base">Retract Public Notice</h3>
                <p className="text-xs text-slate-500 dark:text-[#CBD5E1]">Confirm announcement removal</p>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-100 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 p-3.5 text-xs text-rose-900 dark:text-rose-200">
              <p className="font-bold">Are you sure you want to retract this notice?</p>
              <p className="mt-1 text-slate-800 dark:text-[#F8FAFC] font-bold italic">"{noticeToDelete.title}"</p>
              <p className="mt-2 text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                This action will permanently remove the announcement from the Gram Announcement Board for citizens.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-[#334155]">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setNoticeToDelete(null)}
                className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-4 py-2 text-xs font-bold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#243044] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await api.deleteNotice(noticeToDelete.id);
                    setNoticeToDelete(null);
                    await loadNotices();
                  } catch (err: any) {
                    alert(err.message || 'Failed to delete notice.');
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {deleting ? 'Retracting...' : 'Yes, Delete Notice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notice Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-3">
              <div>
                <h3 className="font-display text-base font-extrabold text-slate-800 dark:text-[#F8FAFC]">
                  Publish Announcement
                </h3>
                <p className="text-xs font-medium text-slate-500 dark:text-[#CBD5E1]">
                  Broadcast official directive or notice
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#172033] hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-4">
              {/* Target Area Field */}
              {isOfficer ? (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] flex items-center justify-between mb-1">
                    <span>Target Area / Jurisdiction</span>
                    <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
                      <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" /> Read-Only
                    </span>
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-100 dark:bg-[#172033] px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">
                    <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>{user?.assignedZone || userArea}</span>
                  </div>
                  <p className="mt-1 text-[10px] font-medium text-slate-500 dark:text-[#94A3B8]">
                    Notice will automatically be assigned to your area ({user?.assignedZone || userArea}). Officers cannot publish to other areas.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] mb-1 block">
                    Target Area / Jurisdiction
                  </label>
                  <select
                    value={targetZone}
                    onChange={(e) => setTargetZone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 dark:focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="All Areas">All Areas (Panchayath-wide)</option>
                    <option value="Bengaluru North">Bengaluru North</option>
                    <option value="Bengaluru South">Bengaluru South</option>
                    <option value="Bengaluru East">Bengaluru East</option>
                    <option value="Bengaluru West">Bengaluru West</option>
                  </select>
                  <p className="mt-1 text-[10px] font-medium text-slate-500 dark:text-[#94A3B8]">
                    Select a specific area or 'All Areas' to reach all Panchayath residents.
                  </p>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] mb-1 block">Notice Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 dark:focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="General">General Notice</option>
                  <option value="Emergency">Emergency Directive</option>
                  <option value="Welfare">Welfare & Schemes</option>
                  <option value="Taxation">Taxes & Revenue</option>
                  <option value="Water">Water & Sanitation</option>
                  <option value="Engineering">Roads & Engineering</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] mb-1 block">Notice Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Schedule for Drinking Water Distribution in Ward 4"
                  className="w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-3 py-2 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] block">
                    Notice Content <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                    {content.length} / 1500
                  </span>
                </div>
                <textarea
                  required
                  maxLength={1500}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write official directive or public message..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] p-3 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>

              <div className="mt-2 flex justify-end gap-2.5 border-t border-slate-100 dark:border-[#334155] pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#243044] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNotice}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingNotice ? 'Publishing...' : 'Publish Board Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

