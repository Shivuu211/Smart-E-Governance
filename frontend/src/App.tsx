import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Pages import
import Intro from './pages/Intro';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Grievances from './pages/Grievances';
import Certificates from './pages/Certificates';
import Taxes from './pages/Taxes';
import Schemes from './pages/Schemes';
import PublicNotices from './pages/PublicNotices';
import ProfilePage from './pages/Profile';

// Admin Pages
import AdminAssetMgmt from './pages/AdminAssetMgmt';
import AdminCitizenMgmt from './pages/AdminCitizenMgmt';
import AdminEmployeeMgmt from './pages/AdminEmployeeMgmt';
import Reports from './pages/Reports';

import { Menu, Shield, Bot, HelpCircle, MapPin } from 'lucide-react';

import GramMitraChatWidget from './components/GramMitraChatWidget';

function DashboardRouter() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [isPortalMode, setIsPortalMode] = useState(false);

  // Requirement: Every time the application is opened or the browser page is freshly loaded,
  // it must ALWAYS start from the Intro Page at /intro.
  // 1. Make /intro the default entry route of the application.
  // 2. Do NOT use localStorage/sessionStorage to remember that the Intro Page was already viewed.
  // 3. Existing authentication/session data must NOT cause the application to skip the Intro Page.
  const [showIntro, setShowIntro] = useState(true);

  // Set /intro as the default entry route on initial load/mount
  React.useEffect(() => {
    if (window.location.pathname !== '/intro' && window.location.hash !== '#intro') {
      window.history.replaceState({}, '', '/intro');
    }
  }, []);

  // Listen for direct URL navigations to routes (/intro, /forgot-password, /login, /register, /dashboard)
  React.useEffect(() => {
    const handleUrlChange = () => {
      const pathname = window.location.pathname;
      const hash = window.location.hash;
      if (pathname === '/intro' || hash === '#intro') {
        setShowIntro(true);
        setIsPortalMode(false);
      } else if (pathname === '/forgot-password' || hash === '#forgot-password') {
        setShowIntro(false);
        setIsPortalMode(true);
        setIsRegisterMode(false);
        setIsForgotPasswordMode(true);
      } else if (pathname === '/register' || hash === '#register') {
        setShowIntro(false);
        setIsPortalMode(true);
        setIsRegisterMode(true);
        setIsForgotPasswordMode(false);
      } else if (pathname === '/login' || hash === '#login') {
        setShowIntro(false);
        setIsPortalMode(true);
        setIsRegisterMode(false);
        setIsForgotPasswordMode(false);
      } else if (pathname === '/dashboard' || hash === '#dashboard') {
        setShowIntro(false);
        setIsPortalMode(true);
      } else if (pathname === '/' || pathname === '') {
        setShowIntro(false);
        setIsPortalMode(false);
        setIsRegisterMode(false);
        setIsForgotPasswordMode(false);
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // When user logs out, return to landing page
  const prevUserRef = React.useRef(user);
  React.useEffect(() => {
    if (prevUserRef.current && !user) {
      setIsPortalMode(false);
      setIsRegisterMode(false);
      setIsForgotPasswordMode(false);
      window.history.pushState({}, '', '/');
    }
    prevUserRef.current = user;
  }, [user]);

  React.useEffect(() => {
    if (user) {
      setActiveTab('dashboard');
    }
  }, [user?.id]);

  const handleGuestNavigate = (tab?: string) => {
    if (tab === 'register') {
      setIsRegisterMode(true);
      setIsForgotPasswordMode(false);
      setIsPortalMode(true);
      window.history.pushState({}, '', '/register');
    } else if (tab === 'forgot-password') {
      setIsRegisterMode(false);
      setIsForgotPasswordMode(true);
      setIsPortalMode(true);
      window.history.pushState({}, '', '/forgot-password');
    } else {
      setIsRegisterMode(false);
      setIsForgotPasswordMode(false);
      setIsPortalMode(true);
      window.history.pushState({}, '', '/login');
    }
  };

  const handleOpenLogin = () => {
    setIsRegisterMode(false);
    setIsForgotPasswordMode(false);
    setIsPortalMode(true);
    window.history.pushState({}, '', user ? '/dashboard' : '/login');
  };

  const handleOpenRegister = () => {
    setIsRegisterMode(true);
    setIsForgotPasswordMode(false);
    setIsPortalMode(true);
    window.history.pushState({}, '', '/register');
  };

  const handleOpenForgotPassword = () => {
    setIsRegisterMode(false);
    setIsForgotPasswordMode(true);
    setIsPortalMode(true);
    window.history.pushState({}, '', '/forgot-password');
  };

  const handleBackToHome = () => {
    setIsPortalMode(false);
    setIsRegisterMode(false);
    setIsForgotPasswordMode(false);
    window.history.pushState({}, '', '/');
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
    setIsPortalMode(false);
    setIsRegisterMode(false);
    setIsForgotPasswordMode(false);
    window.history.replaceState({}, '', '/');
  };

  // 1. Initial Animated Intro Screen (ALWAYS shown first on open or browser refresh)
  if (showIntro) {
    return <Intro onComplete={handleIntroComplete} />;
  }

  // 2. Loading state (if auth check is pending after Intro finishes)
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0F172A]">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Connecting to e-Governance Ledger...</p>
        </div>
      </div>
    );
  }

  // 3. Landing Page (Rendered after Intro completes; returning users land here rather than being auto-redirected)
  if (!isPortalMode) {
    return (
      <>
        <Home 
          onEnterPortal={handleOpenLogin}
          onEnterRegister={handleOpenRegister}
          onPlayIntro={() => {
            setShowIntro(true);
            window.history.pushState({}, '', '/intro');
          }}
        />
        <GramMitraChatWidget onNavigate={handleGuestNavigate} />
      </>
    );
  }

  // 4. Portal Mode - Unauthenticated flows (Login, Register, Forgot Password)
  if (!user) {
    if (isForgotPasswordMode) {
      return (
        <>
          <ForgotPassword
            onBackToLogin={handleOpenLogin}
            onBackToHome={handleBackToHome}
          />
          <GramMitraChatWidget onNavigate={handleGuestNavigate} />
        </>
      );
    }

    if (isRegisterMode) {
      return (
        <>
          <Register 
            onLoginClick={handleOpenLogin} 
            onBackToHome={handleBackToHome} 
          />
          <GramMitraChatWidget onNavigate={handleGuestNavigate} />
        </>
      );
    }

    return (
      <>
        <Login 
          onRegisterClick={handleOpenRegister} 
          onBackToHome={handleBackToHome}
          onForgotPasswordClick={handleOpenForgotPassword}
        />
        <GramMitraChatWidget onNavigate={handleGuestNavigate} />
      </>
    );
  }


  // Render Page Content based on tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={(tab) => setActiveTab(tab)} />;
      
      // Grievance management routers (citizen handles submitted, officer & admin resolves)
      case 'grievances':
      case 'officer-grievances':
      case 'admin-grievances':
        return <Grievances />;

      // Certificate center routers (citizen applies, officer & admin verifies)
      case 'certificates':
      case 'officer-certificates':
      case 'admin-certificates':
        return <Certificates />;

      // Taxes & revenue operations
      case 'taxes':
      case 'tax-mgmt':
        return <Taxes />;

      // Welfare schemes operations
      case 'schemes':
      case 'officer-schemes':
      case 'admin-schemes':
        return <Schemes />;

      // Notices Announcement board
      case 'notices':
        return <PublicNotices />;

      // Admin & Officer Directory Pages
      case 'citizen-mgmt':
      case 'officer-citizens':
        return <AdminCitizenMgmt />;
      case 'employee-mgmt':
        return <AdminEmployeeMgmt />;
      case 'asset-mgmt':
        return <AdminAssetMgmt />;
      case 'reports':
        return <Reports />;

      // User Profile
      case 'profile':
        return <ProfilePage onNavigate={(tab) => setActiveTab(tab)} />;

      // Fallback for legacy settings or unspecified route
      case 'settings':
      default:
        return <Dashboard onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-[#F8FAFC]">
      {/* Horizonal Main Header */}
      <Navbar onSelectTab={(tab) => setActiveTab(tab)} />

      {/* Main Panel Frame */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Side Navigation Desk */}
        <Sidebar activeTab={activeTab} onSelectTab={(tab) => {
          setActiveTab(tab);
          setShowMobileSidebar(false);
        }} />

        {/* Mobile menu trigger button */}
        <div className="fixed bottom-4 right-4 z-45 md:hidden">
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-700 text-white shadow-xl"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Sidebar overlay Drawer */}
        {showMobileSidebar && (
          <div className="fixed inset-0 z-40 flex bg-black/40 dark:bg-black/70 backdrop-blur-sm md:hidden">
            <div className="w-64 bg-white dark:bg-[#1E293B] border-r border-slate-200 dark:border-[#334155] p-4 flex flex-col justify-between overflow-y-auto">
              <Sidebar
                activeTab={activeTab}
                className="block w-full border-0 p-0 bg-transparent dark:bg-transparent"
                onSelectTab={(tab) => {
                  setActiveTab(tab);
                  setShowMobileSidebar(false);
                }}
              />
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="mt-6 w-full rounded-xl bg-slate-100 dark:bg-[#243044] py-2.5 text-xs font-bold text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#334155] transition-colors cursor-pointer"
              >
                Close Navigation Menu
              </button>
            </div>
            <div className="flex-grow" onClick={() => setShowMobileSidebar(false)} />
          </div>
        )}

        {/* Scrollable Center viewport container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {renderContent()}
          </div>
        </main>

      </div>

      {/* Global Floating Gram Mitra AI Chat Assistant */}
      <GramMitraChatWidget onNavigate={(tab) => setActiveTab(tab)} />
    </div>
  );
}

import { ThemeProvider } from './context/ThemeContext';
import { OfficerProvider } from './context/OfficerContext';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OfficerProvider>
          <DashboardRouter />
        </OfficerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
