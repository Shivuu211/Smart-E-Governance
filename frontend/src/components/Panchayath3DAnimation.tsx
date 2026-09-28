import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Shield, Compass, Bot, Landmark, FileText, HeartHandshake } from 'lucide-react';

export default function Panchayath3DAnimation() {
  const [isHovered, setIsHovered] = useState(false);
  const [activeSegment, setActiveSegment] = useState(0);

  // Mouse tracking for perspective tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 120, mass: 0.5 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-15, 15]), springConfig);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left - width / 2;
    const mouseY = event.clientY - rect.top - height / 2;
    x.set(mouseX / width);
    y.set(mouseY / height);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  // Automate central active segment highlights
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSegment((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="relative flex h-80 w-full items-center justify-center overflow-visible py-4 select-none"
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Dynamic Background Glow Grid */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12),transparent_65%)] animate-pulse" />

      {/* 3D Container */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="relative flex h-64 w-64 items-center justify-center transition-shadow duration-300"
      >
        {/* Background Rotating Ring (Outer Orbit) */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          style={{ transformStyle: 'preserve-3d' }}
          className="absolute h-56 w-56 rounded-full border border-dashed border-emerald-500/30"
        />

        {/* Counter-Rotating Inner Orbit Ring with Dash offsets */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          style={{ transformStyle: 'preserve-3d', translateZ: -20 }}
          className="absolute h-44 w-44 rounded-full border border-dotted border-teal-400/40"
        />

        {/* Floating 3D Central Glass Cube / Card */}
        <motion.div
          animate={{
            y: isHovered ? [0, -6, 0] : [0, -10, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ 
            transformStyle: 'preserve-3d',
            translateZ: 40 
          }}
          className="relative flex h-36 w-36 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-md shadow-2xl shadow-emerald-950/20"
        >
          {/* Inner holographic core */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-teal-500/15" />
          
          {/* Animated corner decorations */}
          <div className="absolute top-2 left-2 h-2.5 w-2.5 border-t border-l border-emerald-400/60" />
          <div className="absolute top-2 right-2 h-2.5 w-2.5 border-t border-r border-emerald-400/60" />
          <div className="absolute bottom-2 left-2 h-2.5 w-2.5 border-b border-l border-emerald-400/60" />
          <div className="absolute bottom-2 right-2 h-2.5 w-2.5 border-b border-r border-emerald-400/60" />

          {/* Core dynamic content changing based on active segment */}
          <motion.div
            key={activeSegment}
            initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
            transition={{ duration: 0.5 }}
            className="z-10 flex flex-col items-center gap-1.5"
          >
            {activeSegment === 0 && (
              <>
                <Landmark className="h-8 w-8 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                <span className="font-display text-[10px] font-bold uppercase tracking-widest text-emerald-300">Panchayath Hub</span>
                <p className="text-[9px] text-slate-300">Unified local governance</p>
              </>
            )}
            {activeSegment === 1 && (
              <>
                <Shield className="h-8 w-8 text-teal-400 drop-shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
                <span className="font-display text-[10px] font-bold uppercase tracking-widest text-teal-300">Safe Records</span>
                <p className="text-[9px] text-slate-300">Tamper-proof storage</p>
              </>
            )}
            {activeSegment === 2 && (
              <>
                <Bot className="h-8 w-8 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                <span className="font-display text-[10px] font-bold uppercase tracking-widest text-emerald-300">AI Mitra Support</span>
                <p className="text-[9px] text-slate-300">Fast grievance routing</p>
              </>
            )}
            {activeSegment === 3 && (
              <>
                <FileText className="h-8 w-8 text-teal-400 drop-shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
                <span className="font-display text-[10px] font-bold uppercase tracking-widest text-teal-300">Instant Docs</span>
                <p className="text-[9px] text-slate-300">Verified state certificates</p>
              </>
            )}
          </motion.div>
        </motion.div>

        {/* Floating 3D Satellites / Nodes revolving around the central card */}
        {/* Node 1 */}
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          style={{ transformStyle: 'preserve-3d', position: 'absolute' }}
          className="h-48 w-48"
        >
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            style={{ translateZ: 60 }}
            className="absolute top-0 left-1/2 -ml-3.5 flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-950/80 text-emerald-400 shadow-lg shadow-emerald-950/50 backdrop-blur-xs"
          >
            <Landmark className="h-3.5 w-3.5" />
          </motion.div>
        </motion.div>

        {/* Node 2 */}
        <motion.div
          animate={{
            rotate: -360,
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          style={{ transformStyle: 'preserve-3d', position: 'absolute' }}
          className="h-36 w-36"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            style={{ translateZ: 80 }}
            className="absolute bottom-0 right-1/2 -mr-3.5 flex h-7 w-7 items-center justify-center rounded-lg border border-teal-400/40 bg-teal-950/80 text-teal-400 shadow-lg shadow-teal-950/50 backdrop-blur-xs"
          >
            <Shield className="h-3.5 w-3.5" />
          </motion.div>
        </motion.div>

        {/* Node 3 */}
        <motion.div
          animate={{
            rotate: 270,
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          style={{ transformStyle: 'preserve-3d', position: 'absolute' }}
          className="h-40 w-40"
        >
          <motion.div
            animate={{ rotate: -270 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            style={{ translateZ: 50 }}
            className="absolute left-0 top-1/2 -mt-3.5 flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-950/80 text-emerald-400 shadow-lg shadow-emerald-950/50 backdrop-blur-xs"
          >
            <Bot className="h-3.5 w-3.5" />
          </motion.div>
        </motion.div>

        {/* Bottom Support Grid Projection */}
        <div 
          className="absolute bottom-[-10px] h-4 w-40 bg-gradient-to-r from-emerald-500/20 via-teal-500/30 to-emerald-500/20 blur-md rounded-full"
          style={{ transform: 'rotateX(80deg)', translateZ: -40 }}
        />
      </motion.div>
    </div>
  );
}
