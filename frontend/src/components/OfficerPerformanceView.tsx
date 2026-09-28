import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, FileSignature, FileSpreadsheet, Clock, ChevronRight, X, UserCheck, ShieldCheck, Mail, Phone, MapPin, Search } from 'lucide-react';
import { api } from '../services/api';
import { OfficerPerformance, Grievance, Certificate, SchemeApplication } from '../types';
import { getZoneOfficerDesignation } from '../utils/zoneUtils';

export default function OfficerPerformanceView() {
  const [officers, setOfficers] = useState<OfficerPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerPerformance | null>(null);
  const [activeTab, setActiveTab] = useState<'grievances' | 'certificates' | 'schemes'>('grievances');

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      const data = await api.getOfficerPerformance();
      if (data && Array.isArray(data)) {
        setOfficers(data);
      }
    } catch (err) {
      console.error('Failed to load officer performance:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOfficers = officers.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.assignedZone.toLowerCase().includes(search.toLowerCase()) ||
    o.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Table Card Container */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-100 dark:border-emerald-800/40">
                <Award className="h-4 w-4" />
              </span>
              <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">
                Respective Officers Work Performance
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Select an officer to inspect detailed logs of resolved complaints, approved certificates, and scheme enrollments.
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by officer name or zone..."
              className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#243044] pl-9 pr-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="flex py-12 justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            </div>
          ) : filteredOfficers.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400 dark:text-slate-400">No officer performance records found.</p>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-[#172033] text-slate-500 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-3.5 pl-4">Officer</th>
                  <th className="p-3.5 text-center">Complaints Resolved</th>
                  <th className="p-3.5 text-center">Certificates Approved</th>
                  <th className="p-3.5 text-center">Schemes Approved</th>
                  <th className="p-3.5 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium text-slate-700 dark:text-slate-200">
                {filteredOfficers.map((off, index) => (
                  <tr
                    key={off.id ? `${off.id}-${index}` : `off-${index}`}
                    onClick={() => setSelectedOfficer(off)}
                    className="group hover:bg-slate-50/80 dark:hover:bg-[#243044] transition-colors cursor-pointer"
                  >
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#243044] border border-slate-200 dark:border-slate-700 font-bold text-emerald-700 dark:text-emerald-400 text-xs shadow-2xs">
                          {off.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {off.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">{getZoneOfficerDesignation(off.assignedZone)}</p>
                          <span className="mt-0.5 inline-block text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 px-1.5 py-0.2 rounded">
                            📍 {off.assignedZone}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/40">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        {off.complaintsResolved}
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 text-xs font-bold text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-800/40">
                        <FileSignature className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        {off.certificatesApproved}
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800/40">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                        {off.schemesApproved}
                      </span>
                    </td>

                    <td className="p-3.5 text-right pr-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOfficer(off);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-900 dark:bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors cursor-pointer"
                      >
                        Inspect Work
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Officer Work Audit Modal */}
      {selectedOfficer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-[#1E293B] p-6 shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col gap-5 max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 dark:bg-emerald-700 font-display text-base font-bold text-white shadow-md shadow-emerald-600/20">
                  {selectedOfficer.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-lg">{selectedOfficer.name}</h3>
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300">
                      📍 {selectedOfficer.assignedZone}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{getZoneOfficerDesignation(selectedOfficer.assignedZone)}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedOfficer(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-[#243044] text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-emerald-100 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/40 p-3.5 text-center">
                <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Complaints Resolved</p>
                <p className="mt-1 font-display text-xl font-bold text-emerald-900 dark:text-emerald-200">{selectedOfficer.complaintsResolved}</p>
              </div>

              <div className="rounded-2xl border border-teal-100 dark:border-teal-800/50 bg-teal-50/50 dark:bg-teal-950/40 p-3.5 text-center">
                <p className="text-[10px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">Certificates Approved</p>
                <p className="mt-1 font-display text-xl font-bold text-teal-900 dark:text-teal-200">{selectedOfficer.certificatesApproved}</p>
              </div>

              <div className="rounded-2xl border border-purple-100 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/40 p-3.5 text-center">
                <p className="text-[10px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">Schemes Approved</p>
                <p className="mt-1 font-display text-xl font-bold text-purple-900 dark:text-purple-200">{selectedOfficer.schemesApproved}</p>
              </div>

              <div className="rounded-2xl border border-amber-100 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/40 p-3.5 text-center">
                <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Avg. Resolution Speed</p>
                <p className="mt-1 font-display text-xl font-bold text-amber-900 dark:text-amber-200">{selectedOfficer.avgResolutionTime}</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-700 text-xs font-bold gap-2">
              <button
                onClick={() => setActiveTab('grievances')}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'grievances'
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Resolved Grievances ({selectedOfficer.complaintsResolved})
              </button>
              <button
                onClick={() => setActiveTab('certificates')}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'certificates'
                    ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Approved Certificates ({selectedOfficer.certificatesApproved})
              </button>
              <button
                onClick={() => setActiveTab('schemes')}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'schemes'
                    ? 'border-purple-600 text-purple-700 dark:text-purple-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Approved Welfare Schemes ({selectedOfficer.schemesApproved})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto pr-1">
              {activeTab === 'grievances' && (
                <div className="flex flex-col gap-3">
                  {selectedOfficer.resolvedGrievancesList && selectedOfficer.resolvedGrievancesList.length > 0 ? (
                    selectedOfficer.resolvedGrievancesList.map((g, idx) => (
                      <div key={g.id ? `${g.id}-${idx}` : `g-${idx}`} className="rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-[#172033] p-3.5 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-900 dark:text-slate-100">{g.title}</span>
                          <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 text-[10px]">
                            ✓ Resolved
                          </span>
                        </div>
                        <p className="mt-1 text-slate-600 dark:text-slate-300 text-[11px]">{g.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                          <span>Citizen: <strong className="text-slate-700 dark:text-slate-200">{g.citizenName}</strong></span>
                          <span>Category: <strong className="text-slate-700 dark:text-slate-200">{g.category}</strong></span>
                          <span>Zone: <strong className="text-slate-700 dark:text-slate-200">{g.zone || selectedOfficer.assignedZone}</strong></span>
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {(g.severity === 'Critical' || g.urgency === 'High') ? '🔴 Critical' : (g.severity === 'High' ? '🟠 High' : (g.severity === 'Low' || g.urgency === 'Low') ? '🟢 Low' : '🟡 Medium')}
                          </span>
                          {g.resolutionRemarks && <span className="text-emerald-700 dark:text-emerald-400 font-normal italic">Remarks: "{g.resolutionRemarks}"</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50/30 dark:bg-[#172033]/50">
                      <p className="font-bold text-slate-700 dark:text-slate-300">Baseline Records Verified ({selectedOfficer.complaintsResolved} resolved)</p>
                      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-400">
                        {selectedOfficer.complaintsResolved} complaints recorded in historical archive ledger for {selectedOfficer.assignedZone}.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'certificates' && (
                <div className="flex flex-col gap-3">
                  {selectedOfficer.approvedCertificatesList && selectedOfficer.approvedCertificatesList.length > 0 ? (
                    selectedOfficer.approvedCertificatesList.map((c, idx) => (
                      <div key={c.id ? `${c.id}-${idx}` : `c-${idx}`} className="rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-[#172033] p-3.5 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-900 dark:text-slate-100">{c.type} Certificate</span>
                          <span className="rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40 px-2 py-0.5 text-[10px]">
                            Approved & Verified
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                          <span>Applicant: <strong className="text-slate-700 dark:text-slate-200">{c.citizenName}</strong></span>
                          <span>Reg ID: <strong className="text-slate-700 dark:text-slate-200">{c.id}</strong></span>
                          <span>Approved By: <strong className="text-slate-700 dark:text-slate-200">{selectedOfficer.name}</strong></span>
                          {c.remarks && <span className="text-teal-700 dark:text-teal-400 font-normal italic">Remarks: "{c.remarks}"</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50/30 dark:bg-[#172033]/50">
                      <p className="font-bold text-slate-700 dark:text-slate-300">Baseline Records Verified ({selectedOfficer.certificatesApproved} approved)</p>
                      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-400">
                        {selectedOfficer.certificatesApproved} birth/income certificates approved in official register for {selectedOfficer.assignedZone}.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'schemes' && (
                <div className="flex flex-col gap-3">
                  {selectedOfficer.approvedSchemesList && selectedOfficer.approvedSchemesList.length > 0 ? (
                    selectedOfficer.approvedSchemesList.map((s, idx) => (
                      <div key={s.id ? `${s.id}-${idx}` : `s-${idx}`} className="rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-[#172033] p-3.5 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-900 dark:text-slate-100">{s.schemeName}</span>
                          <span className="rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 px-2 py-0.5 text-[10px]">
                            Enrolled & Approved
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                          <span>Beneficiary: <strong className="text-slate-700 dark:text-slate-200">{s.citizenName}</strong></span>
                          <span>App ID: <strong className="text-slate-700 dark:text-slate-200">{s.id}</strong></span>
                          <span>Status: <strong className="text-slate-700 dark:text-slate-200">{s.status}</strong></span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50/30 dark:bg-[#172033]/50">
                      <p className="font-bold text-slate-700 dark:text-slate-300">Baseline Records Verified ({selectedOfficer.schemesApproved} approved)</p>
                      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-400">
                        {selectedOfficer.schemesApproved} welfare applications verified and granted enrollment in {selectedOfficer.assignedZone}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setSelectedOfficer(null)}
                className="rounded-xl bg-slate-900 dark:bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                Close Audit Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
