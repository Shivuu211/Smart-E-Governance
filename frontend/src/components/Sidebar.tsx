import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  FileSignature,
  FileCheck2,
  Coins,
  BadgeAlert,
  Building2,
  Megaphone,
  Briefcase,
  FileBarChart2,
  Bot
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  className?: string;
}

export default function Sidebar({ activeTab, onSelectTab, className = '' }: SidebarProps) {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role;

  // Define menu config based on role
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['citizen', 'officer', 'admin'] },
    
    // Citizen-specific
    { id: 'grievances', label: 'My Grievances', icon: BadgeAlert, roles: ['citizen'] },
    { id: 'certificates', label: 'Certificates', icon: FileSignature, roles: ['citizen'] },
    { id: 'taxes', label: 'Tax Center', icon: Coins, roles: ['citizen'] },
    { 
      id: 'schemes', 
      label: 'Welfare Schemes', 
      icon: FileSpreadsheet, 
      roles: ['citizen'],
      badge: { text: 'AI Fit', icon: Bot }
    },
    
    // Officer-specific
    { id: 'officer-grievances', label: 'Resolve Complaints', icon: BadgeAlert, roles: ['officer'] },
    { id: 'officer-certificates', label: 'Approve Certificates', icon: FileCheck2, roles: ['officer'] },
    { id: 'officer-schemes', label: 'Scheme Applications', icon: FileSpreadsheet, roles: ['officer'] },
    { id: 'officer-citizens', label: 'Jurisdiction Citizens', icon: Users, roles: ['officer'] },
    { id: 'tax-mgmt', label: 'Gram Tax & Revenue Desk', icon: Coins, roles: ['officer', 'admin'] },
    
    // Admin-specific
    { id: 'citizen-mgmt', label: 'Citizen Database', icon: Users, roles: ['admin'] },
    { id: 'employee-mgmt', label: 'Officer Management', icon: Briefcase, roles: ['admin'] },
    { id: 'asset-mgmt', label: 'Panchayath Assets', icon: Building2, roles: ['citizen', 'officer', 'admin'] },
    { id: 'admin-grievances', label: 'All Grievances', icon: BadgeAlert, roles: ['admin'] },
    { id: 'admin-certificates', label: 'All Certificates', icon: FileCheck2, roles: ['admin'] },
    { id: 'admin-schemes', label: 'Manage Schemes', icon: FileSpreadsheet, roles: ['admin'] },

    // Common
    { id: 'notices', label: 'Public Notices', icon: Megaphone, roles: ['citizen', 'officer', 'admin'] },
    { id: 'reports', label: 'Reports & Audits', icon: FileBarChart2, roles: ['admin', 'officer'] },
  ];

  // Filter items based on active user role
  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <aside className={`w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 ${className || 'hidden md:block'}`}>
      <div className="flex flex-col gap-1.5">
        <span className="px-3 py-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-400 uppercase">
          Menu Navigation
        </span>

        {filteredItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const BadgeIcon = item.badge?.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-lg shadow-emerald-600/15'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1E293B] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span
                  className={`ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold transition-all shrink-0 animate-pulse ${
                    isActive
                      ? 'bg-white/25 text-white border border-white/40 shadow-xs shadow-white/20'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-400 dark:bg-emerald-950/90 dark:text-emerald-300 dark:border-emerald-600/80 shadow-xs shadow-emerald-500/20'
                  }`}
                >
                  {BadgeIcon && <BadgeIcon className="h-3 w-3 shrink-0" />}
                  <span>{item.badge.text}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Decorative localized Sarpanch quote or helper */}
      <div className="mt-8 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-4">
        <p className="font-display text-xs font-bold text-emerald-900 dark:text-emerald-300">Digital Panchayath</p>
        <p className="mt-1 text-[11px] leading-relaxed text-emerald-700/90 dark:text-emerald-400/90">
          Bridging gaps between governance and the grassroots level via smart e-services.
        </p>
      </div>
    </aside>
  );
}
