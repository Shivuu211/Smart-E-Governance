import React, { useState, useEffect } from 'react';
import { Printer, Search, ShieldCheck, Sparkles, Database } from 'lucide-react';
import { api } from '../services/api';

const sanitizeOfficerText = (text?: string) => {
  if (!text) return '';
  return text
    .replace(/Employees/g, 'Officers')
    .replace(/employees/g, 'officers')
    .replace(/Employee/g, 'Officer')
    .replace(/employee/g, 'officer');
};

export default function Reports() {
  const cachedAnalytics = api.getCachedSync('analytics');
  const [activities, setActivities] = useState<any[]>(cachedAnalytics?.recentActivities || []);
  const [loading, setLoading] = useState(!cachedAnalytics);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadAuditTrail() {
      try {
        const stats = await api.getAnalytics();
        if (stats && stats.recentActivities) setActivities(stats.recentActivities);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAuditTrail();
  }, []);

  const filteredLogs = activities.filter(log =>
    (log.userEmail || '').toLowerCase().includes(search.toLowerCase()) ||
    sanitizeOfficerText(log.action).toLowerCase().includes(search.toLowerCase()) ||
    sanitizeOfficerText(log.details).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-800 dark:text-[#F8FAFC]">Panchayat Audits & Report Logs</h2>
          <p className="text-xs text-slate-500 dark:text-[#CBD5E1]">Traceable database logs, audit trails, and financial summaries</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-[#CBD5E1] shadow-sm hover:bg-slate-50 dark:hover:bg-[#243044] cursor-pointer transition-colors"
        >
          <Printer className="h-4 w-4" />
          Print Audit Ledger
        </button>
      </div>

      {/* Grid: Audit stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">System Integrity</p>
          <p className="mt-2 text-xs font-bold text-slate-800 dark:text-[#F8FAFC] flex items-center gap-1">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
            <span>Encrypted Ledger</span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Traceable Events</p>
          <p className="mt-2 text-xs font-bold text-slate-800 dark:text-[#F8FAFC] flex items-center gap-1">
            <Database className="h-4.5 w-4.5 text-blue-500" />
            <span>{activities.length} Recorded Triggers</span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Audit Frequency</p>
          <p className="mt-2 text-xs font-bold text-slate-800 dark:text-[#F8FAFC] flex items-center gap-1">
            <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
            <span>Continuous Real-time</span>
          </p>
        </div>
      </div>

      {/* System events search & ledger */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 dark:border-[#334155] pb-4 sm:flex-row sm:items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Panchayat Ledger Logs</span>
          
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit trail..."
              className="h-9 w-full rounded-lg border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#172033] pl-9 pr-3 text-xs text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="flex py-10 justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>
          ) : filteredLogs.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">No activity logs parsed.</p>
          ) : (
            <table className="w-full text-left border-collapse text-[11px] leading-normal">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#334155] bg-slate-50 dark:bg-[#172033] text-slate-700 dark:text-[#CBD5E1] font-bold">
                  <th className="p-3">Audit Timestamp</th>
                  <th className="p-3">Account Trigger</th>
                  <th className="p-3">User Role</th>
                  <th className="p-3">Action Operation</th>
                  <th className="p-3">Audit Description Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#334155] font-medium text-slate-700 dark:text-[#CBD5E1]">
                {filteredLogs.map((log, index) => (
                  <tr key={log.id ? `${log.id}-${index}` : `rep-${index}`} className="hover:bg-slate-50 dark:hover:bg-[#172033]/80 transition-colors">
                    <td className="p-3 text-slate-600 dark:text-slate-400 font-mono">{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-[#F8FAFC]">{log.userEmail}</td>
                    <td className="p-3 uppercase text-[9px] font-bold text-indigo-700 dark:text-indigo-400">{log.userRole}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-[#F8FAFC]">{sanitizeOfficerText(log.action)}</td>
                    <td className="p-3 text-slate-700 dark:text-[#CBD5E1] max-w-sm truncate">{sanitizeOfficerText(log.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
