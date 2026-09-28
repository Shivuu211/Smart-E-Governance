import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, ArrowRight, Eye, X, ChevronRight, ChevronLeft, 
  Calendar, FileText, CheckCircle, Bot, Users, Award, ShieldCheck, 
  HelpCircle, Phone, Mail, MapPin, Globe, FileSignature, Coins, 
  BadgeAlert, Sparkles, Building, ListFilter, Clock, Star, ArrowUpRight,
  Sun, Moon, Landmark, Info, ArrowDown, UserCheck, BellRing, CheckCheck,
  Workflow, GitFork
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import PanchayathLogo from '../components/PanchayathLogo';
import { NammaLogoSvg } from '../components/NammaLogo';
import svgLogo from '../assets/images/namma_panchayath_logo.svg';
import { api } from '../services/api';

interface HomeProps {
  onEnterPortal: () => void;
  onEnterRegister: () => void;
  onPlayIntro?: () => void;
}

const DEFAULT_LANDING_VIDEO_URL = '/assets/default-landing-video.mp4';

export default function Home({ onEnterPortal, onEnterRegister, onPlayIntro }: HomeProps) {
  const { theme, toggleTheme } = useTheme();
  const [time, setTime] = useState(new Date());
  const videoRef = useRef<HTMLVideoElement>(null);
  const [backgroundVideoUrl, setBackgroundVideoUrl] = useState<string>(DEFAULT_LANDING_VIDEO_URL);

  // Initialize landing-page video from the backend (persistent single source of truth)
  useEffect(() => {
    let isMounted = true;
    try {
      localStorage.removeItem('namma_custom_bg_video');
    } catch {
      // ignore
    }

    const fetchActiveLandingVideo = async () => {
      try {
        const res = await api.getActiveLandingVideo(true);
        if (isMounted && res) {
          if (res.hasCustomVideo && (res.video?.url || res.videoUrl)) {
            const activeUrl = res.video?.url || res.videoUrl;
            setBackgroundVideoUrl(activeUrl);
          } else {
            setBackgroundVideoUrl(res.defaultVideoUrl || DEFAULT_LANDING_VIDEO_URL);
          }
        }
      } catch (err) {
        console.warn('Could not fetch active landing video from server, fallback to default:', err);
      }
    };

    fetchActiveLandingVideo();
    return () => {
      isMounted = false;
    };
  }, []);

  // Ensure background promotional video autoplays reliably across all browsers
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay notice:", err);
        });
      }
    }
  }, [backgroundVideoUrl]);

  const cachedPublicStats = api.getCachedSync('public_stats');
  const [registeredCitizensCount, setRegisteredCitizensCount] = useState<number>(cachedPublicStats?.registeredCitizens || 5);

  // Fetch live registered citizens count
  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const data = await api.getPublicStats();
        if (isMounted && data && typeof data.registeredCitizens === 'number') {
          setRegisteredCitizensCount(data.registeredCitizens);
        }
      } catch (err) {
        // Handled gracefully via safe fallback
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, []);

  // Clock update effect
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);


  // Photo Gallery category filters
  const galleryItems = [
    {
      id: 1,
      category: "Infrastructure",
      title: "Village Solar Farm Grid",
      description: "150kW grid supplying continuous power to our submersible pumps and street light systems.",
      image: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=800"
    },
    {
      id: 2,
      category: "Education",
      title: "Namma Panchayath Primary School",
      description: "Digital smart boards, high-speed fiber internet, and interactive learning equipment for students.",
      image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=800"
    },
    {
      id: 3,
      category: "Water",
      title: "Reverse Osmosis Treatment Station",
      description: "Clean water purification plant providing certified safe drinking water to all 6 wards.",
      image: "https://images.unsplash.com/photo-1574482620811-1aa16ffe3c82?auto=format&fit=crop&q=80&w=800"
    },
    {
      id: 4,
      category: "Panchayath",
      title: "Digital Facilitation Desk",
      description: "Laptops and secure terminal access for on-spot assistance with government documents.",
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800"
    },
    {
      id: 5,
      category: "Infrastructure",
      title: "Modern Cement-Paved Roads",
      description: "High-integrity concrete roads and smart deep drainage corridors engineered for heavy rain.",
      image: "https://images.unsplash.com/photo-1476820865390-c52aeebb9891?auto=format&fit=crop&q=80&w=800"
    },
    {
      id: 6,
      category: "Water",
      title: "Drip Irrigation Controller",
      description: "High-efficiency localized watering modules minimizing soil run-off in cotton and wheat crops.",
      image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=800"
    }
  ];

  const [activeCategory, setActiveCategory] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filteredGallery = activeCategory === "All" 
    ? galleryItems 
    : galleryItems.filter(item => item.category === activeCategory);

  // FAQ interactive accordion states
  const faqs = [
    {
      q: "How do I download my certified documents online?",
      a: "Simply log into the citizen portal using your registered email and password, click on the 'Certificates' tab, and apply for Birth, Income, or Residence certificates. Once verified by the Panchayath Officer, a digital PDF certificate with a valid secure QR code will be generated for instant download."
    },
    {
      q: "What is the timeline for resolving a registered civic grievance?",
      a: "Once you register an infrastructure complaint (e.g., street light broken, water pump leak), our system uses local AI patterns to suggest immediate remediation instructions and dispatches a verified ward officer (technician, plumber, or operator) within 24 to 48 hours. Live status updates will be sent directly to your notification tab."
    },
    {
      q: "How does the AI Scheme Eligibility Advisor work?",
      a: "Our e-governance engine analyzes details in your Panchayath Profile—such as family income limits, age, occupation, and demographics—against the benefits, policies, and requirements of active state schemes. It then suggests direct matches and allows quick portal applications without paper file work."
    },
    {
      q: "Is there any offline assistance at the Panchayath Bhavan?",
      a: "Yes! The Namma Panchayath Bhavan has a dedicated 'Digital Facilitation Desk' managed by trained administrative officers from Monday to Saturday, 9:00 AM to 5:00 PM, to assist elderly or offline residents with account registrations and direct document submissions."
    }
  ];

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Live notices feed
  const liveNotices = [
    "📅 Next Gram Sabha Scheduled: Sunday, July 5th at 10:00 AM in Panchayath Community Hall.",
    "🌾 Organic Fertilizer Subsidy applications are open under Scheme No. SG-12.",
    "💧 Ward 3 Water Pump Maintenance completed ahead of schedule • Flow Restored.",
    "🩺 Free Health and Eyesight Screening Camp: July 8th, Smart Primary School."
  ];

  const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0);

  const scrollToAbout = () => {
    const aboutSection = document.getElementById('about-section');
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToServices = () => {
    const servicesSection = document.getElementById('services-section');
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToContact = () => {
    const contactSection = document.getElementById('contact-section');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const noticeInterval = setInterval(() => {
      setCurrentNoticeIndex(prev => (prev + 1) % liveNotices.length);
    }, 4500);
    return () => clearInterval(noticeInterval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] font-sans">
      
      {/* 1. PUBLIC HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0F172A]/90 px-4 py-3.5 backdrop-blur-md sm:px-6 md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <PanchayathLogo size="lg" />
            <div>
               <h1 className="font-display text-base font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-lg">
                Namma Panchayath
              </h1>
              <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <MapPin className="h-3 w-3 text-emerald-500" />
                e-Governance Public Hub
              </p>
            </div>
          </div>

          {/* Navigation, Quick Info & Portal Access */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* About Navigation Link - Smooth Scrolls to About Section */}
            <button
              onClick={scrollToAbout}
              id="header_about_btn"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-2 text-xs font-bold text-slate-700 transition-all hover:border-emerald-300 hover:bg-emerald-50/80 hover:text-emerald-700 active:scale-95 shadow-2xs dark:border-white/10 dark:bg-[#0F172A] dark:text-slate-200 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 cursor-pointer"
              title="Learn more About Namma Panchayath"
            >
              <Info className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>About</span>
            </button>

            {/* Services Navigation Link - Smooth Scrolls to Services Section */}
            <button
              onClick={scrollToServices}
              id="header_services_btn"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-2 text-xs font-bold text-slate-700 transition-all hover:border-blue-300 hover:bg-blue-50/80 hover:text-blue-700 active:scale-95 shadow-2xs dark:border-white/10 dark:bg-[#0F172A] dark:text-slate-200 dark:hover:border-blue-500/50 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 cursor-pointer"
              title="Explore Namma Panchayath Services"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Services</span>
            </button>

            {/* Contact Navigation Link - Smooth Scrolls to Contact Section */}
            <button
              onClick={scrollToContact}
              id="header_contact_btn"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-2 text-xs font-bold text-slate-700 transition-all hover:border-amber-300 hover:bg-amber-50/80 hover:text-amber-700 active:scale-95 shadow-2xs dark:border-white/10 dark:bg-[#0F172A] dark:text-slate-200 dark:hover:border-amber-500/50 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 cursor-pointer"
              title="Panchayath Bhavan Contact & Help Desk"
            >
              <Phone className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Contact</span>
            </button>

            {/* Theme Toggle Button with Hover Glow / Lighting Effect */}
            <button
              onClick={toggleTheme}
              id="header_theme_toggle_btn"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="group relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-all duration-200 hover:scale-105 hover:border-amber-300 hover:bg-amber-50/80 hover:text-amber-600 hover:shadow-[0_0_12px_rgba(251,191,36,0.35)] active:scale-95 dark:border-white/10 dark:bg-[#0F172A] dark:text-amber-400 dark:hover:border-amber-500/60 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 dark:hover:shadow-[0_0_16px_rgba(251,191,36,0.45)] cursor-pointer shadow-2xs"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400 transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110 group-hover:text-amber-600 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
              )}
            </button>

            <div className="hidden items-center gap-2 rounded-xl bg-slate-100 dark:bg-[#0F172A] dark:border dark:border-white/10 px-3.5 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 md:flex">
              <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
              <span>{time.toLocaleTimeString()}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>{time.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <button
              onClick={onEnterPortal}
              id="header_portal_btn"
              className="rounded-xl border border-blue-600 px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 dark:border-blue-500 transition-all hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
            >
              Portal Login
            </button>
            <button
              onClick={onEnterRegister}
              id="header_register_btn"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/15 transition-all hover:bg-blue-700 hover:shadow-blue-700/20 cursor-pointer"
            >
              Register Account
            </button>
          </div>
        </div>
      </header>

      {/* LIVE NOTICE TICKER */}
      <div className="bg-emerald-900 py-2.5 text-center text-xs font-bold text-white shadow-inner">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-center gap-2.5 overflow-hidden">
          <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-extrabold uppercase animate-pulse shrink-0 text-white">
            Live Update
          </span>
          <p className="truncate transition-all duration-500 ease-in-out text-emerald-100">
            {liveNotices[currentNoticeIndex]}
          </p>
        </div>
      </div>

      {/* 2. DYNAMIC HERO SECTION WITH PROMOTIONAL VIDEO */}
      <section className="relative w-full overflow-hidden bg-slate-950 py-20 text-white md:py-28">
        {/* Background Promotional Video */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <video
            key={backgroundVideoUrl}
            ref={videoRef}
            src={backgroundVideoUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="h-full w-full object-cover object-center"
          >
            <source src={backgroundVideoUrl} type="video/mp4" />
            <source src="/assets/default-landing-video.mp4" type="video/mp4" />
            <source src="/default-landing-video.mp4" type="video/mp4" />
            <source src="/assets/promotional-video.mp4" type="video/mp4" />
            <source src="/promotional-video.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Dynamic Gradient Overlay:
            - Left side provides dark contrast so white text headlines and buttons are easily readable
            - Right side is translucent so the animated video graphics and logo are clearly visible */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950/80 pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-12">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400 border border-blue-500/20">
                <Sparkles className="h-3.5 w-3.5" />
                Smart Gram Panchayath • Digital Governance
              </span>
            </div>

            {/* Hero Content Wrapper */}
            <div className="mt-6 min-h-[180px] flex flex-col justify-end">
              <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl leading-tight text-white">
                Smart Governance. Better Services. Stronger Communities.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300 md:text-base max-w-xl">
                Namma Panchayath brings local government services, citizen support, grievance management, certificates, welfare schemes, and zone-based governance together on one digital platform.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={onEnterPortal}
                id="hero_portal_btn"
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-xs font-bold text-white shadow-xl shadow-blue-600/25 transition-all hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98]"
              >
                Access Portal Console
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={onEnterRegister}
                id="hero_register_btn"
                className="rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3.5 text-xs font-bold text-slate-200 backdrop-blur-md transition-all hover:bg-slate-800 hover:border-slate-500"
              >
                Create Resident Profile
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT NAMMA PANCHAYATH SECTION */}
      <section id="about-section" className="scroll-mt-20 border-y border-slate-200/80 dark:border-white/10 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/60 dark:bg-none dark:bg-[#0F172A] py-16 lg:py-20 transition-colors duration-300">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            {/* Left Side: Namma Panchayath Official Logo */}
            <div className="relative flex items-center justify-center lg:col-span-5">
              <div className="relative flex w-full max-w-sm flex-col items-center justify-center rounded-3xl border border-slate-200/90 dark:border-white/10 bg-[#FDFBF7] dark:bg-[#0F172A] p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/50 transition-all hover:shadow-2xl">
                <div className="relative aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl flex items-center justify-center">
                  <NammaLogoSvg preserveAspectRatio="xMidYMid meet" className="h-full w-full object-contain" />
                </div>
              </div>
            </div>

            {/* Right Side: Content */}
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 border border-emerald-500/20">
                <Landmark className="h-3.5 w-3.5 text-emerald-600" />
                Smart Gram Panchayath Management System
              </span>
              <h3 className="mt-4 font-display text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl md:text-4xl tracking-tight">
                About Namma Panchayath
              </h3>
              <p className="mt-4 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
                Namma Panchayath is a Smart Gram Panchayath Management System that digitally connects citizens, Panchayath Officers, and administrators on a single unified platform. Built with a vision to make local governance accessible, transparent, and citizen-centric, it simplifies public administration and delivers key civic services directly to residents' fingertips.
              </p>

              {/* Key Highlights Quick List */}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0F172A] p-3 shadow-2xs">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-900 dark:text-slate-100">Zone-Based Routing</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Direct ward officer links</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0F172A] p-3 shadow-2xs">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-900 dark:text-slate-100">Real-Time Tracking</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Track applications and requests instantly</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* OUR SERVICES SECTION HEADING */}
          <div id="services-section" className="mt-20 scroll-mt-24 border-t border-slate-200/80 dark:border-white/10 pt-16 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-blue-700 border border-blue-500/20">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Digital Governance
            </span>
            <h3 className="mt-4 font-display text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl md:text-4xl tracking-tight">
              Our Services
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-600 md:text-base">
              Explore digital services designed to make local governance simpler and more accessible.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            
            {/* 1. Grievance Management */}
            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] p-6 shadow-xs transition-all hover:border-rose-400 hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <BadgeAlert className="h-5.5 w-5.5" />
              </div>
              <h4 className="mt-4 font-display text-sm font-bold text-slate-900 dark:text-white">Digital Grievance Management</h4>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Report local infrastructure and civic issues online, receive automatic zone officer assignment, and monitor real-time resolution updates.
              </p>
            </div>

            {/* 2. Certificate Applications & Tracking */}
            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] p-6 shadow-xs transition-all hover:border-blue-400 hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileSignature className="h-5.5 w-5.5" />
              </div>
              <h4 className="mt-4 font-display text-sm font-bold text-slate-900 dark:text-white">Certificates & Application Tracking</h4>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Apply for Birth, Death, Residence, and Income certificates with step-by-step application tracking and secure digital downloads.
              </p>
            </div>

            {/* 3. Welfare Schemes & Gram Mitra AI */}
            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] p-6 shadow-xs transition-all hover:border-indigo-400 hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Bot className="h-5.5 w-5.5" />
              </div>
              <h4 className="mt-4 font-display text-sm font-bold text-slate-900 dark:text-white">Welfare Schemes & Gram Mitra AI</h4>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Explore government subsidies and benefits with Gram Mitra AI, offering personalized scheme recommendations based on profile demographics.
              </p>
            </div>

            {/* 4. Panchayath Assets & Public Notices */}
            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] p-6 shadow-xs transition-all hover:border-amber-400 hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Building className="h-5.5 w-5.5" />
              </div>
              <h4 className="mt-4 font-display text-sm font-bold text-slate-900 dark:text-white">Panchayath Assets & Public Notices</h4>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Access public listings of Gram Panchayath assets and stay informed on upcoming Gram Sabha meetings, tenders, and official announcements.
              </p>
            </div>

            {/* 5. Zone-Based Services & Officer Directory */}
            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] p-6 shadow-xs transition-all hover:border-emerald-400 hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Users className="h-5.5 w-5.5" />
              </div>
              <h4 className="mt-4 font-display text-sm font-bold text-slate-900 dark:text-white">Zone-Based Services & Officer Directory</h4>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Ward-based routing automatically connects citizens with dedicated Panchayath Officers for swift local assistance.
              </p>
            </div>

            {/* 6. Tax Management & Status Tracking */}
            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] p-6 shadow-xs transition-all hover:border-teal-400 hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Coins className="h-5.5 w-5.5" />
              </div>
              <h4 className="mt-4 font-display text-sm font-bold text-slate-900 dark:text-white">Tax Management & Payments</h4>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Check outstanding municipal House, Water, and Property tax dues, make secure payments, and generate official payment receipts.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE PHOTO GALLERY */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-12">
        <div className="flex flex-col justify-between items-start gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Gram Infrastructure Showcase
            </span>
            <h3 className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
              Village Achievements in High Definition
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              A chronological photo ledger verifying public works, digital schools, clean energy installations, and water pumps.
            </p>
          </div>
          
          {/* Category Filters */}
          <div className="flex flex-wrap gap-1.5">
            {["All", "Infrastructure", "Education", "Water", "Panchayath"].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeCategory === cat 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGallery.map((item, idx) => (
            <div 
              key={item.id}
              onClick={() => setLightboxIndex(galleryItems.findIndex(g => g.id === item.id))}
              className="group relative cursor-pointer overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] p-3 shadow-xs hover:border-blue-500 transition-all hover:shadow-md"
            >
              <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-100 dark:bg-[#0F172A]">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1574482620811-1aa16ffe3c82?auto=format&fit=crop&q=80&w=800";
                  }}
                />
                <span className="absolute left-3 top-3 rounded-md bg-white/95 dark:bg-[#0F172A]/90 dark:text-slate-200 dark:border dark:border-white/10 px-2 py-0.5 text-[8px] font-bold text-slate-600 uppercase shadow-xs">
                  {item.category}
                </span>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-800 shadow-md">
                    <Eye className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="mt-3.5 px-1 pb-1">
                <h4 className="font-display text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">{item.title}</h4>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. LIGHTBOX VIEWER OVERLAY */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-sm">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="relative max-w-4xl w-full flex items-center justify-center">
            {/* Left Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(prev => (prev! === 0 ? galleryItems.length - 1 : prev! - 1));
              }}
              className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            {/* Active Image */}
            <div className="mx-14 flex flex-col items-center">
              <img
                src={galleryItems[lightboxIndex].image}
                alt={galleryItems[lightboxIndex].title}
                className="max-h-[70vh] rounded-2xl object-contain shadow-2xl"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1574482620811-1aa16ffe3c82?auto=format&fit=crop&q=80&w=800";
                }}
              />
              <div className="mt-5 text-center text-white max-w-xl">
                <span className="rounded bg-blue-600 px-2.5 py-0.5 text-[9px] font-bold uppercase">
                  {galleryItems[lightboxIndex].category}
                </span>
                <h4 className="mt-2 font-display text-base font-bold">{galleryItems[lightboxIndex].title}</h4>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">{galleryItems[lightboxIndex].description}</p>
              </div>
            </div>

            {/* Right Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(prev => (prev! + 1) % galleryItems.length);
              }}
              className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* 7. LIVE METRICS & ACHIEVEMENTS */}
      <section className="bg-[#0F172A] border-y border-slate-800 dark:border-white/10 py-16 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xs text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                <Users className="h-6 w-6" />
              </div>
              <p className="mt-4 font-display text-3xl font-extrabold text-white">{registeredCitizensCount.toLocaleString()}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">Registered Citizens</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xs text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <p className="mt-4 font-display text-3xl font-extrabold text-white">100%</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">Solar Lighting Audited</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xs text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                <Award className="h-6 w-6" />
              </div>
              <p className="mt-4 font-display text-3xl font-extrabold text-white">Grade A++</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">State e-Gov Ranking</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xs text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
                <Building className="h-6 w-6" />
              </div>
              <p className="mt-4 font-display text-3xl font-extrabold text-white">24 / 7</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">Piped Drinking Grid</p>
            </div>

          </div>
        </div>
      </section>

      {/* 8. TESTIMONIAL SLIDER */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-12">
        <div className="text-center">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Resident Feedback
          </span>
          <h3 className="mt-2 font-display text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
            Trusted by the Gram Panchayath
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-xs text-slate-500 dark:text-slate-400">
            Hear what families and farmers say about our smart digital village transformation.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          
          <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] p-6 shadow-xs">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="mt-4 text-xs italic text-slate-600 dark:text-slate-300 leading-relaxed">
              "Filing my property tax was a matter of five minutes on this platform. I got my digital receipt immediately. e-Governance is truly a blessing for us elderly."
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20 text-xs font-bold text-blue-700 dark:text-blue-400">
                RP
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-white">Ramesh Patel</h5>
                <p className="text-[9px] text-slate-400">Ward No. 3 Resident • Farmer</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] p-6 shadow-xs">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="mt-4 text-xs italic text-slate-600 dark:text-slate-300 leading-relaxed">
              "My submersible pump issue was resolved within 24 hours of filing a grievance online. I kept getting notifications on my phone at every stage. Incredibly fast!"
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                SS
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-white">Savitri Sharma</h5>
                <p className="text-[9px] text-slate-400">Ward No. 1 Resident • Teacher</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] p-6 shadow-xs">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="mt-4 text-xs italic text-slate-600 dark:text-slate-300 leading-relaxed">
              "The AI Advisor found a state educational scholarship scheme my daughter was eligible for. We applied through the portal and her subsidy got approved instantly."
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                AK
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-white">Amit Kumar</h5>
                <p className="text-[9px] text-slate-400">Ward No. 4 Resident • Shop Owner</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 9. FAQ ACCORDION */}
      <section className="bg-slate-100 dark:bg-[#0F172A] border-t border-slate-200/80 dark:border-white/10 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Got Questions?
            </span>
            <h3 className="mt-2 font-display text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
              Frequently Asked Questions
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Learn how to maximize your e-governance portal benefits.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx}
                  className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] shadow-xs overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between px-6 py-4.5 text-left font-display text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="text-blue-600 dark:text-blue-400 text-base">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-[#0F172A] px-6 py-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. PUBLIC FOOTER */}
      <footer id="contact-section" className="bg-[#0F172A] border-t border-slate-800 dark:border-white/10 text-slate-400 py-12 px-6 lg:px-12 text-xs">
        <div className="mx-auto max-w-7xl grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-white">
              <PanchayathLogo size="sm" />
              <span className="font-display font-bold text-sm tracking-tight">Namma Panchayath</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Leveraging advanced digital technologies, artificial intelligence integration, and solar networks to build an inclusive model rural ecosystem.
            </p>
          </div>

          <div>
            <h5 className="font-bold text-white text-[11px] uppercase tracking-wider">Citizen Assistance</h5>
            <div className="mt-4 flex flex-col gap-2 font-medium">
              <button onClick={onEnterPortal} className="text-left hover:text-white transition-colors">Download Certificate</button>
              <button onClick={onEnterPortal} className="text-left hover:text-white transition-colors">File Infrastructure Complaint</button>
              <button onClick={onEnterPortal} className="text-left hover:text-white transition-colors">Pay Outstanding Bills</button>
              <button onClick={onEnterPortal} className="text-left hover:text-white transition-colors">AI Eligibility Advisor</button>
            </div>
          </div>

          <div>
            <h5 className="font-bold text-white text-[11px] uppercase tracking-wider">Panchayath Bhavan Contact</h5>
            <div className="mt-4 flex flex-col gap-2 font-medium">
              <p className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 text-slate-500" />
                <span>Namma Panchayath Bhavan, Main Road, Ward No. 1</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 shrink-0 text-slate-500" />
                <span>+91 98765-43210</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 shrink-0 text-slate-500" />
                <span>governance@nammapanchayath.gov.in</span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#1E293B] p-4 border border-slate-700/80 shadow-xs flex flex-col gap-3">
            <h6 className="font-bold text-white text-[10px] uppercase tracking-wider">Emergency Help Desk</h6>
            <p className="text-[10px] text-slate-300">Available 24/7 for community water leaks, transformer repairs, or medical dispatch.</p>
            <p className="text-sm font-extrabold text-emerald-400 flex items-center gap-1.5">
              <Phone className="h-4.5 w-4.5 text-emerald-500" />
              <span>1800-419-5500</span>
            </p>
          </div>

        </div>

        <div className="mx-auto max-w-7xl mt-12 border-t border-slate-800 pt-6 flex flex-col items-center justify-between gap-4 sm:flex-row text-[11px] text-slate-500">
          <p>© 2026 Namma Panchayath e-Panchayath Initiative. All rights reserved.</p>
          <div className="flex items-center gap-4 font-semibold">
            {onPlayIntro && (
              <button
                onClick={onPlayIntro}
                className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="Replay animated digital introduction"
              >
                <span>Replay Intro Animation</span>
              </button>
            )}
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-600">NIC Compliant</span>
            <span className="text-slate-600">W3C Validated</span>
            <span className="text-slate-600">SSL Encrypted</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
