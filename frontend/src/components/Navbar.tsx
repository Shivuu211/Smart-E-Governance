import React, { useState } from 'react';
import { Bell, User, LogOut, Shield, MapPin, CheckCircle, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PanchayathLogo from './PanchayathLogo';
import { getZoneOfficerDesignation } from '../utils/zoneUtils';

export default function Navbar({ onSelectTab }: { onSelectTab: (tab: string) => void }) {
  const { user, logout, notifications, markNotificationsAsRead, clearAllNotifications } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleClearAll = async () => {
    if (notifications.length === 0 || isClearing) return;
    setIsClearing(true);
    try {
      await clearAllNotifications();
    } catch (err) {
      console.error('Error clearing notifications:', err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      {/* Portal Branding */}
      <div className="flex items-center gap-3">
        <PanchayathLogo size="md" />
        <div>
          <h1 className="font-display text-lg font-bold tracking-tight text-slate-800 dark:text-white">
            Namma Panchayath
          </h1>
          <p className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
            <MapPin className="h-3 w-3 text-emerald-500" />
            e-Governance Portal
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          id="navbar_theme_toggle_btn"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-all duration-200 hover:scale-105 hover:border-amber-300 hover:bg-amber-50/80 hover:text-amber-600 hover:shadow-[0_0_12px_rgba(251,191,36,0.35)] active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-amber-400 dark:hover:border-amber-500/60 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 dark:hover:shadow-[0_0_16px_rgba(251,191,36,0.45)] cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 text-amber-400 transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]" />
          ) : (
            <Moon className="h-5 w-5 text-slate-600 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110 group-hover:text-amber-600 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
          )}
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications && unreadCount > 0) {
                markNotificationsAsRead();
              }
            }}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-800 dark:text-white">Notifications</span>
                <div className="flex items-center gap-2.5">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markNotificationsAsRead}
                      className="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={notifications.length === 0 || isClearing}
                    onClick={handleClearAll}
                    className={`text-[10px] font-medium transition-colors cursor-pointer ${
                      notifications.length === 0 || isClearing
                        ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                        : 'text-rose-600 hover:text-rose-700 hover:underline dark:text-rose-400 dark:hover:text-rose-300'
                    }`}
                  >
                    {isClearing ? 'Clearing...' : 'Clear All'}
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {notifications.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">No notifications yet</p>
                ) : (
                  [...notifications]
                    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                    .map(n => (
                    <div
                      key={n.id}
                      className={`rounded-xl p-2.5 transition-colors ${
                        n.isRead ? 'bg-white dark:bg-slate-800' : 'bg-blue-50/50 dark:bg-blue-950/30'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="text-[11px] font-semibold text-slate-800 leading-tight dark:text-slate-200">{n.title}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500 leading-normal dark:text-slate-400">{n.message}</p>
                          <span className="mt-1 block text-[8px] text-slate-400 dark:text-slate-500">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info Capsule */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onSelectTab('profile')}
            title="Open Profile"
            className="flex items-center gap-3 rounded-xl p-1.5 -m-1.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer group text-left"
          >
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {user.name}
              </p>
              <p className="text-[10px] font-bold capitalize text-blue-600 dark:text-blue-400">
                {user.role === 'admin' ? 'Sarpanch (Admin)' : user.role === 'officer' ? getZoneOfficerDesignation(user.assignedZone) : 'Citizen'}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-700 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-blue-950/60 dark:group-hover:text-blue-300 transition-colors ring-1 ring-slate-200 dark:ring-slate-700 group-hover:ring-blue-300 dark:group-hover:ring-blue-600">
              <User className="h-4.5 w-4.5" />
            </div>
          </button>
          <button
            onClick={logout}
            title="Log Out"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/30 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/50 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
