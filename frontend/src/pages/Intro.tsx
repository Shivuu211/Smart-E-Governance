import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Landmark, ShieldCheck, Cpu, 
  AlertCircle, Award, Sparkles, Coins, MapPin, 
  Shield
} from 'lucide-react';
import svgLogo from '../assets/images/namma_panchayath_logo.svg';
import { NammaLogoSvg } from '../components/NammaLogo';

interface IntroProps {
  onComplete: () => void;
}

export default function Intro({ onComplete }: IntroProps) {
  // Eagerly preload SVG logo asset immediately when Intro component loads
  useEffect(() => {
    const img = new Image();
    img.src = svgLogo;
  }, []);

  // Elapsed time in milliseconds (0 to 7000ms)
  const [elapsed, setElapsed] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const DURATION = 7000; // 7 seconds total

  // Check user preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const handleFinish = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    // Short smooth fade before triggering parent transition
    setTimeout(() => {
      onComplete();
    }, 450);
  }, [isExiting, onComplete]);

  // Main animation timer loop
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = now - startTime;
      if (diff >= DURATION) {
        setElapsed(DURATION);
        clearInterval(interval);
        handleFinish();
      } else {
        setElapsed(diff);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [handleFinish]);

  // Keyboard shortcut: Press Escape or Space or Enter to skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFinish]);

  // Derive animation phases based on elapsed time (ms)
  // Stage 1: 0 - 1100ms: Initial screen & glowing point
  // Stage 2: 1100 - 3100ms: Network connection (Citizen, Panchayath, Officer, Digital Services)
  // Stage 3: 3100 - 5100ms: Services convergence (Grievances, Certificates, Schemes, Taxes, Assets)
  // Stage 4: 5100 - 6200ms: Logo reveal ("NAMMA PANCHAYATH" & Tagline)
  // Stage 5: 6200 - 7000ms: Final slogan ("Your Panchayath. Digitally Connected.")

  const currentStage = 
    elapsed < 1100 ? 1 :
    elapsed < 3100 ? 2 :
    elapsed < 5100 ? 3 :
    elapsed < 6200 ? 4 : 5;

  // Network Nodes for Stage 2
  const networkNodes = [
    {
      id: 'citizen',
      label: 'Citizen',
      icon: Users,
      color: 'from-emerald-400 to-teal-500',
      delayMs: 1200,
      posClass: 'top-1 left-1/2 -translate-x-1/2', // Top (comfortably spaced inside bounds)
      linePos: { x1: '50%', y1: '50%', x2: '50%', y2: '13%' }
    },
    {
      id: 'panchayath',
      label: 'Panchayath',
      icon: Landmark,
      color: 'from-teal-400 to-emerald-600',
      delayMs: 1550,
      posClass: 'top-1/2 right-1 -translate-y-1/2', // Right
      linePos: { x1: '50%', y1: '50%', x2: '87%', y2: '50%' }
    },
    {
      id: 'officer',
      label: 'Officer',
      icon: ShieldCheck,
      color: 'from-emerald-500 to-cyan-500',
      delayMs: 1900,
      posClass: 'bottom-1 left-1/2 -translate-x-1/2', // Bottom (comfortably spaced away from heading)
      linePos: { x1: '50%', y1: '50%', x2: '50%', y2: '87%' }
    },
    {
      id: 'digital',
      label: 'Digital Services',
      icon: Cpu,
      color: 'from-cyan-400 to-emerald-500',
      delayMs: 2250,
      posClass: 'top-1/2 left-1 -translate-y-1/2', // Left
      linePos: { x1: '50%', y1: '50%', x2: '13%', y2: '50%' }
    }
  ];

  // Civic Services for Stage 3
  const servicesList = [
    {
      id: 'grievances',
      label: 'Grievances',
      icon: AlertCircle,
      angle: 0, // deg
      distance: 92, // px (compact and comfortable)
      color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      delayMs: 3150
    },
    {
      id: 'certificates',
      label: 'Certificates',
      icon: Award,
      angle: 72,
      distance: 92,
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      delayMs: 3300
    },
    {
      id: 'schemes',
      label: 'Welfare Schemes',
      icon: Sparkles,
      angle: 144,
      distance: 92,
      color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      delayMs: 3450
    },
    {
      id: 'taxes',
      label: 'Tax & Payments',
      icon: Coins,
      angle: 216,
      distance: 92,
      color: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      delayMs: 3600
    },
    {
      id: 'assets',
      label: 'Panchayath Assets',
      icon: MapPin,
      angle: 288,
      distance: 92,
      color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      delayMs: 3750
    }
  ];

  return (
    <div 
      id="namma-panchayath-intro-page"
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden select-none transition-opacity duration-500 text-white ${
        isExiting ? 'opacity-0 scale-98 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        width: '100vw',
        minHeight: '100vh',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        backgroundColor: '#0B1224',
        background: 'radial-gradient(circle at 50% 50%, #111d38 0%, #0B1224 55%, #060a14 100%)'
      }}
    >
      {/* Background Animated Subtle Cyber Grid & Glowing Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft Radial Ambient Glow in center */}
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[130px] transition-all duration-1000"
          style={{
            width: currentStage >= 4 ? '600px' : '440px',
            height: currentStage >= 4 ? '600px' : '440px',
            opacity: currentStage === 1 ? 0.3 : 0.6
          }}
        />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#3B82F6 1px, transparent 1px), linear-gradient(to right, #3B82F6 1px, transparent 1px)`,
            backgroundSize: '48px 48px'
          }}
        />

        {/* Floating subtle ambient particles */}
        <div className="absolute top-1/4 left-1/4 h-2 w-2 rounded-full bg-cyan-400/40 blur-xs animate-ping" />
        <div className="absolute bottom-1/3 right-1/4 h-2.5 w-2.5 rounded-full bg-blue-400/30 blur-xs animate-pulse" />
        <div className="absolute top-1/3 right-1/3 h-1.5 w-1.5 rounded-full bg-emerald-400/30 blur-xs animate-ping" />
      </div>

      {/* CENTER STAGE: Animated Sequence Canvas */}
      <main className="relative z-10 flex-1 w-full flex flex-col items-center justify-center px-4">
        
        {/* ========================================================================= */}
        {/* STAGE 1: INITIAL GLOWING POINT (0 - 1.1s) */}
        {/* ========================================================================= */}
        {currentStage === 1 && (
          <div className="flex flex-col items-center justify-center text-center animate-fadeIn">
            {/* Glowing Core Pulse */}
            <div className="relative flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-emerald-400 shadow-[0_0_25px_8px_rgba(16,185,129,0.7)] animate-pulse" />
              <div className="absolute h-12 w-12 rounded-full border border-emerald-500/40 animate-ping opacity-60" />
              <div className="absolute h-24 w-24 rounded-full border border-teal-500/20 animate-pulse opacity-40" />
            </div>
            
            <p className="mt-8 text-lg sm:text-xl font-medium tracking-wide text-emerald-100/90 font-display transition-all duration-700">
              Connecting Communities...
            </p>
            <span className="mt-2 text-xs font-mono text-emerald-400/60 uppercase tracking-widest">
              Initializing Secure Civic Network
            </span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 2: DIGITAL CONNECTION NETWORK (1.1s - 3.1s) */}
        {/* ========================================================================= */}
        {currentStage === 2 && (
          <div className="relative flex flex-col items-center justify-center animate-fadeIn w-full max-w-2xl px-2">
            {/* Central Node Hub Canvas (scaled ~18% more compact) */}
            <div className="relative flex items-center justify-center w-60 h-60 sm:w-68 sm:h-68 md:w-72 md:h-72">
              
              {/* Central Glowing Hub */}
              <div className="relative z-10 flex h-13 w-13 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-[0_0_30px_rgba(16,185,129,0.45)] border border-emerald-300/40">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0c1a36] text-emerald-300">
                  <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-400 animate-pulse" />
                </div>
              </div>

              {/* Pulsing concentric rings */}
              <div className="absolute inset-3 sm:inset-4 rounded-full border border-emerald-500/25 animate-ping opacity-30" />
              <div className="absolute inset-8 sm:inset-10 rounded-full border border-teal-500/20 animate-pulse" />
              <div className="absolute inset-14 sm:inset-16 rounded-full border border-dashed border-emerald-400/20" />

              {/* Connecting Lines SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                <line x1="50%" y1="50%" x2="50%" y2="13%" stroke="rgba(16, 185, 129, 0.5)" strokeWidth="1.5" strokeDasharray="3 3" className="animate-pulse" />
                <line x1="50%" y1="50%" x2="87%" y2="50%" stroke="rgba(16, 185, 129, 0.5)" strokeWidth="1.5" strokeDasharray="3 3" className="animate-pulse" />
                <line x1="50%" y1="50%" x2="50%" y2="87%" stroke="rgba(16, 185, 129, 0.5)" strokeWidth="1.5" strokeDasharray="3 3" className="animate-pulse" />
                <line x1="50%" y1="50%" x2="13%" y2="50%" stroke="rgba(16, 185, 129, 0.5)" strokeWidth="1.5" strokeDasharray="3 3" className="animate-pulse" />
              </svg>

              {/* The 4 Network Elements connected to center */}
              {networkNodes.map((node) => {
                const isVisible = elapsed >= node.delayMs || prefersReducedMotion;
                const IconComponent = node.icon;
                return (
                  <div
                    key={node.id}
                    className={`absolute ${node.posClass} z-20 flex flex-col items-center transition-all duration-500 ${
                      isVisible 
                        ? 'opacity-100 scale-100 translate-y-0' 
                        : 'opacity-0 scale-75'
                    }`}
                  >
                    <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-[#111f3d] border border-emerald-400/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:scale-105 transition-transform">
                      <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-300" />
                    </div>
                    <span className="mt-1 text-[10px] sm:text-[11px] font-semibold tracking-wide text-emerald-100 bg-[#0B1224]/95 px-2 py-0.5 rounded-md border border-white/10 whitespace-nowrap shadow-xs">
                      {node.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Subtext with comfortable spacing */}
            <div className="mt-10 sm:mt-12 text-center px-4 max-w-xl z-20">
              <h2 className="text-sm sm:text-base md:text-lg font-bold tracking-wide text-emerald-100 font-display">
                Digitally Connecting Citizens &amp; Local Administration
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-400/80 mt-1 font-sans">
                Real-time synchronized rural e-governance mesh
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 3: SERVICES ANIMATION (3.1s - 5.1s) */}
        {/* ========================================================================= */}
        {currentStage === 3 && (
          <div className="relative flex flex-col items-center justify-center animate-fadeIn w-full max-w-2xl px-2">
            {/* Services Orbital Circle Hub (scaled ~18% more compact) */}
            <div className="relative flex items-center justify-center w-60 h-60 sm:w-68 sm:h-68 md:w-72 md:h-72">
              
              {/* Central Core Pulse */}
              <div className="relative z-10 flex h-14 w-14 sm:h-17 sm:w-17 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-[0_0_30px_rgba(16,185,129,0.45)]">
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#0d1e3d] text-center p-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-200 mt-0.5 leading-tight">
                    Services
                  </span>
                </div>
              </div>

              {/* Orbital guide track */}
              <div className="absolute inset-3 sm:inset-4 rounded-full border border-dashed border-emerald-500/30 animate-spin" style={{ animationDuration: '24s' }} />
              <div className="absolute inset-9 sm:inset-11 rounded-full border border-teal-500/20" />

              {/* The 5 Civic Services orbiting and converging */}
              {servicesList.map((svc) => {
                const isVisible = elapsed >= svc.delayMs || prefersReducedMotion;
                const IconComponent = svc.icon;

                // Calculate position along orbit
                const rad = (svc.angle * Math.PI) / 180;
                // Stage progress ratio (0 to 1 as it converges)
                const convergeProgress = Math.max(0, Math.min(1, (elapsed - 3100) / 1900));
                const currentDist = prefersReducedMotion 
                  ? svc.distance * 0.7 
                  : svc.distance * (1 - convergeProgress * 0.35);

                const x = Math.cos(rad) * currentDist;
                const y = Math.sin(rad) * currentDist;

                return (
                  <div
                    key={svc.id}
                    className={`absolute z-20 flex flex-col items-center transition-all duration-700 ${
                      isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                    }`}
                    style={{
                      transform: `translate(${x}px, ${y}px)`
                    }}
                  >
                    <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg border backdrop-blur-md shadow-md ${svc.color}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <span className="mt-1 text-[9px] sm:text-[10px] font-semibold text-white/90 bg-[#0B1224]/90 px-1.5 py-0.5 rounded-full border border-white/10 whitespace-nowrap shadow-xs">
                      {svc.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Subtext with comfortable spacing */}
            <div className="mt-10 sm:mt-12 text-center px-4 max-w-xl z-20">
              <h2 className="text-sm sm:text-base md:text-lg font-bold tracking-wide text-emerald-100 font-display">
                Grievances • Certificates • Schemes • Taxes • Assets
              </h2>
              <p className="text-[11px] sm:text-xs text-teal-400/80 mt-1 font-sans">
                Unifying Civic Services on One Digital Platform
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 4: LOGO REVEAL (5.1s - 6.2s) */}
        {/* ========================================================================= */}
        {currentStage === 4 && (
          <div className="flex flex-col items-center justify-center text-center animate-fadeIn">
            {/* Logo Container with radiant glowing aura */}
            <div className="relative flex items-center justify-center">
              {/* Glowing backdrops */}
              <div className="absolute h-36 w-36 sm:h-44 sm:w-44 rounded-full bg-emerald-500/20 blur-2xl animate-pulse" />
              <div className="absolute h-32 w-32 sm:h-40 sm:w-40 rounded-full border border-emerald-400/30 animate-ping opacity-30" />
              
              {/* The Official Existing Project Logo */}
              <div className="relative z-10 flex h-24 w-24 sm:h-32 sm:w-32 items-center justify-center rounded-full bg-[#FDFBF7] p-1 shadow-[0_0_40px_rgba(16,185,129,0.5)] border-2 border-emerald-400/60 transition-transform duration-700 hover:scale-105 overflow-hidden">
                <NammaLogoSvg className="h-full w-full rounded-full object-cover" />
              </div>
            </div>

            {/* Platform Title */}
            <h1 className="mt-6 text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-display">
              <span className="text-emerald-400 tracking-wider">NAMMA</span>{' '}
              <span className="text-white">PANCHAYATH</span>
            </h1>

            {/* Official Tagline */}
            <p className="mt-2 text-sm sm:text-base font-medium text-emerald-200/90 max-w-md">
              Smart Gram Panchayath Management Platform
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 5: FINAL SLOGAN & TRANSITION (6.2s - 7.0s) */}
        {/* ========================================================================= */}
        {currentStage === 5 && (
          <div className="flex flex-col items-center justify-center text-center animate-fadeIn">
            {/* Logo compact */}
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-[#FDFBF7] p-1 shadow-[0_0_30px_rgba(16,185,129,0.4)] border border-emerald-400/60 overflow-hidden">
              <NammaLogoSvg className="h-full w-full rounded-full object-cover" />
            </div>

            {/* Slogan */}
            <h2 className="mt-6 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-display">
              Your Panchayath.{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Digitally Connected.
              </span>
            </h2>

            <p className="mt-3 text-xs sm:text-sm text-emerald-200/80 font-mono">
              Loading Citizen & Administration Portal...
            </p>

            {/* Loading indicator bar */}
            <div 
              className="relative mt-6 h-1 sm:h-1.5 w-48 sm:w-52 rounded-full bg-slate-800/90 border border-emerald-500/30 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
              role="progressbar"
              aria-label="Loading Citizen & Administration Portal"
            >
              {/* Visible background track */}
              <div className="absolute inset-0 bg-emerald-950/50" />

              {/* Moving glowing segment */}
              <div 
                className="namma-loading-runner relative h-full w-1/3 rounded-full bg-gradient-to-r from-emerald-500 via-teal-200 to-emerald-400"
              />
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
