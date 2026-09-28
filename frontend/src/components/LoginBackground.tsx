import React from 'react';

export default function LoginBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none transition-colors duration-300"
    >
      {/* 1. Base Gradient Canvas */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-[#f5f9f7] to-[#eef6f2] dark:from-[#0B1120] dark:via-[#0F172A] dark:to-[#070D1E] transition-colors duration-300" />

      {/* 2. Soft Ambient Green Radial Glow Behind Card */}
      <div
        className="absolute inset-0 transition-opacity duration-300 dark:opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.05) 45%, rgba(15, 23, 42, 0) 75%)',
        }}
      />

      {/* 3. Subtle Corner Ambient Light Blobs */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-200/25 dark:bg-emerald-600/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-teal-200/25 dark:bg-teal-600/10 blur-3xl" />
      <div className="absolute top-1/4 -right-24 h-72 w-72 rounded-full bg-blue-100/30 dark:bg-blue-600/10 blur-3xl" />

      {/* 4. Fine Digital e-Governance Grid & Topographic Map Lines */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.035] dark:opacity-[0.08]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="gov-grid"
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="#047857"
              strokeWidth="0.8"
              className="dark:stroke-emerald-400"
            />
            <circle cx="0" cy="0" r="1.5" fill="#059669" className="dark:fill-emerald-400" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gov-grid)" />
      </svg>

      {/* 5. Subtle Top Corner Governance Emblems / Mandala Motifs */}
      <div className="absolute top-4 left-6 hidden opacity-[0.06] dark:opacity-[0.12] md:block">
        <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
          <circle cx="90" cy="90" r="80" stroke="#047857" strokeWidth="1" strokeDasharray="3 3" className="dark:stroke-emerald-400" />
          <circle cx="90" cy="90" r="60" stroke="#047857" strokeWidth="1" className="dark:stroke-emerald-400" />
          <circle cx="90" cy="90" r="40" stroke="#047857" strokeWidth="0.8" strokeDasharray="2 2" className="dark:stroke-emerald-400" />
          <circle cx="90" cy="90" r="16" stroke="#047857" strokeWidth="1" className="dark:stroke-emerald-400" />
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 360) / 16;
            return (
              <line
                key={i}
                x1="90"
                y1="90"
                x2={90 + 60 * Math.cos((angle * Math.PI) / 180)}
                y2={90 + 60 * Math.sin((angle * Math.PI) / 180)}
                stroke="#047857"
                strokeWidth="0.6"
                className="dark:stroke-emerald-400"
              />
            );
          })}
        </svg>
      </div>

      <div className="absolute top-4 right-6 hidden opacity-[0.06] dark:opacity-[0.12] md:block">
        <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
          <circle cx="90" cy="90" r="80" stroke="#047857" strokeWidth="1" strokeDasharray="3 3" className="dark:stroke-emerald-400" />
          <circle cx="90" cy="90" r="60" stroke="#047857" strokeWidth="1" className="dark:stroke-emerald-400" />
          <circle cx="90" cy="90" r="40" stroke="#047857" strokeWidth="0.8" className="dark:stroke-emerald-400" />
          <circle cx="90" cy="90" r="16" stroke="#047857" strokeWidth="1" className="dark:stroke-emerald-400" />
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 360) / 16;
            return (
              <line
                key={i}
                x1="90"
                y1="90"
                x2={90 + 60 * Math.cos((angle * Math.PI) / 180)}
                y2={90 + 60 * Math.sin((angle * Math.PI) / 180)}
                stroke="#047857"
                strokeWidth="0.6"
                className="dark:stroke-emerald-400"
              />
            );
          })}
        </svg>
      </div>

      {/* 6. Subtle Digital Network Nodes & Coordinate Markers */}
      <div className="absolute top-12 left-1/4 hidden text-[9px] font-mono tracking-widest text-emerald-900/15 dark:text-emerald-400/30 lg:block">
        + 12° 58&apos; 23&quot; N &nbsp; 77° 35&apos; 45&quot; E &bull; GP-CONNECT SECURE
      </div>
      <div className="absolute top-12 right-1/4 hidden text-[9px] font-mono tracking-widest text-emerald-900/15 dark:text-emerald-400/30 lg:block">
        DIGITAL GRAM PANCHAYATH INITIATIVE &bull; KARNATAKA
      </div>

      {/* Subtle Network Constellation Lines (Left & Right Flanks) */}
      <svg
        className="absolute top-1/4 left-3 hidden h-80 w-64 opacity-20 dark:opacity-40 lg:block"
        viewBox="0 0 240 300"
        fill="none"
      >
        <path
          d="M20 40 L90 80 L60 160 L140 210 L80 280 M90 80 L180 110 L140 210 M20 40 L60 160"
          stroke="#059669"
          strokeWidth="0.75"
          strokeDasharray="4 3"
          className="dark:stroke-emerald-400"
        />
        <circle cx="20" cy="40" r="3" fill="#10b981" />
        <circle cx="90" cy="80" r="2.5" fill="#059669" className="dark:fill-emerald-400" />
        <circle cx="60" cy="160" r="3" fill="#047857" className="dark:fill-emerald-300" />
        <circle cx="180" cy="110" r="2.5" fill="#10b981" />
        <circle cx="140" cy="210" r="3" fill="#059669" className="dark:fill-emerald-400" />
        <circle cx="80" cy="280" r="2.5" fill="#10b981" />
        <text x="30" y="44" fill="#047857" fontSize="7" fontFamily="monospace" className="dark:fill-emerald-300">NODE-01</text>
        <text x="100" y="84" fill="#047857" fontSize="7" fontFamily="monospace" className="dark:fill-emerald-300">TALUK-HUB</text>
        <text x="70" y="164" fill="#047857" fontSize="7" fontFamily="monospace" className="dark:fill-emerald-300">GP-SVC</text>
      </svg>

      <svg
        className="absolute top-1/4 right-3 hidden h-80 w-64 opacity-20 dark:opacity-40 lg:block"
        viewBox="0 0 240 300"
        fill="none"
      >
        <path
          d="M220 50 L150 90 L180 170 L100 220 L160 290 M150 90 L60 120 L100 220 M220 50 L180 170"
          stroke="#059669"
          strokeWidth="0.75"
          strokeDasharray="4 3"
          className="dark:stroke-emerald-400"
        />
        <circle cx="220" cy="50" r="3" fill="#10b981" />
        <circle cx="150" cy="90" r="2.5" fill="#059669" className="dark:fill-emerald-400" />
        <circle cx="180" cy="170" r="3" fill="#047857" className="dark:fill-emerald-300" />
        <circle cx="60" cy="120" r="2.5" fill="#10b981" />
        <circle cx="100" cy="220" r="3" fill="#059669" className="dark:fill-emerald-400" />
        <circle cx="160" cy="290" r="2.5" fill="#10b981" />
        <text x="175" y="54" fill="#047857" fontSize="7" fontFamily="monospace" className="dark:fill-emerald-300">DIST-01</text>
        <text x="105" y="94" fill="#047857" fontSize="7" fontFamily="monospace" className="dark:fill-emerald-300">WARD-NET</text>
        <text x="135" y="174" fill="#047857" fontSize="7" fontFamily="monospace" className="dark:fill-emerald-300">E-SEVA</text>
      </svg>

      {/* 7. Bottom Skyline Landscape: Panchayath Bhavan, Rural Houses, Trees, Fields & Water Canal */}
      <div className="absolute right-0 bottom-0 left-0 h-44 w-full opacity-[0.22] dark:opacity-[0.35] sm:h-52 md:h-60 lg:h-68">
        <svg
          viewBox="0 0 1440 280"
          fill="none"
          preserveAspectRatio="none"
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background Far Agricultural Contours / Hills */}
          <path
            d="M0 210 Q 240 170, 480 200 T 960 190 T 1440 205 L 1440 280 L 0 280 Z"
            fill="#059669"
            fillOpacity="0.08"
            className="dark:fill-emerald-400 dark:fill-opacity-15"
          />
          <path
            d="M0 230 Q 360 190, 720 220 T 1440 215 L 1440 280 L 0 280 Z"
            fill="#047857"
            fillOpacity="0.10"
            className="dark:fill-emerald-500 dark:fill-opacity-20"
          />

          {/* Irrigation Canal / Water Flow Stream */}
          <path
            d="M 580 280 C 640 240, 680 230, 720 220 C 760 210, 800 240, 860 280 Z"
            fill="#0284c7"
            fillOpacity="0.12"
            className="dark:fill-teal-400 dark:fill-opacity-20"
          />
          <path
            d="M 600 280 C 650 250, 685 240, 720 232 C 755 225, 790 250, 840 280"
            stroke="#0284c7"
            strokeWidth="1"
            strokeOpacity="0.25"
            strokeDasharray="4 4"
            className="dark:stroke-teal-300 dark:stroke-opacity-40"
          />

          {/* Agricultural Field Furrow Lines (Left & Right) */}
          <path
            d="M 40 280 L 160 240 M 80 280 L 190 240 M 120 280 L 220 240 M 160 280 L 250 240"
            stroke="#047857"
            strokeWidth="0.8"
            strokeOpacity="0.25"
            className="dark:stroke-emerald-400 dark:stroke-opacity-40"
          />
          <path
            d="M 1400 280 L 1280 240 M 1360 280 L 1250 240 M 1320 280 L 1220 240 M 1280 280 L 1190 240"
            stroke="#047857"
            strokeWidth="0.8"
            strokeOpacity="0.25"
            className="dark:stroke-emerald-400 dark:stroke-opacity-40"
          />

          {/* Rural Houses & Trees (Left Cluster) */}
          {/* Tree 1 */}
          <circle cx="110" cy="205" r="18" fill="#059669" fillOpacity="0.25" className="dark:fill-emerald-400 dark:fill-opacity-30" />
          <circle cx="124" cy="198" r="14" fill="#047857" fillOpacity="0.3" className="dark:fill-emerald-300 dark:fill-opacity-35" />
          <rect x="115" y="215" width="4" height="25" fill="#047857" fillOpacity="0.4" className="dark:fill-emerald-500" />
          
          {/* Village House 1 */}
          <polygon points="140,240 165,215 190,240" fill="#065f46" fillOpacity="0.35" className="dark:fill-emerald-400 dark:fill-opacity-40" />
          <rect x="145" y="240" width="40" height="22" fill="#047857" fillOpacity="0.25" className="dark:fill-emerald-500 dark:fill-opacity-30" />
          <rect x="160" y="248" width="10" height="14" fill="#065f46" fillOpacity="0.4" className="dark:fill-emerald-300" />
          
          {/* Village House 2 */}
          <polygon points="195,244 215,224 235,244" fill="#065f46" fillOpacity="0.3" className="dark:fill-emerald-400 dark:fill-opacity-35" />
          <rect x="200" y="244" width="30" height="18" fill="#047857" fillOpacity="0.2" className="dark:fill-emerald-500 dark:fill-opacity-25" />

          {/* Palm Tree */}
          <path d="M 255 250 Q 257 205, 260 175" stroke="#047857" strokeWidth="2.5" strokeOpacity="0.35" className="dark:stroke-emerald-400 dark:stroke-opacity-50" />
          <path d="M 260 175 Q 240 165, 230 175 M 260 175 Q 250 155, 245 160 M 260 175 Q 265 150, 270 155 M 260 175 Q 280 160, 290 170 M 260 175 Q 285 180, 290 190" stroke="#059669" strokeWidth="1.5" strokeOpacity="0.4" fill="none" className="dark:stroke-emerald-300 dark:stroke-opacity-50" />

          {/* Central Government / Panchayath Bhavan Building (Left-Center) */}
          <g transform="translate(320, 140)">
            {/* Base Steps */}
            <rect x="0" y="90" width="140" height="6" fill="#047857" fillOpacity="0.35" className="dark:fill-emerald-400 dark:fill-opacity-40" />
            <rect x="10" y="84" width="120" height="6" fill="#047857" fillOpacity="0.4" className="dark:fill-emerald-400 dark:fill-opacity-45" />
            {/* Main Hall */}
            <rect x="20" y="45" width="100" height="39" fill="#059669" fillOpacity="0.2" className="dark:fill-emerald-500 dark:fill-opacity-30" />
            {/* Columns */}
            <rect x="26" y="45" width="6" height="39" fill="#047857" fillOpacity="0.4" className="dark:fill-emerald-400 dark:fill-opacity-50" />
            <rect x="46" y="45" width="6" height="39" fill="#047857" fillOpacity="0.4" className="dark:fill-emerald-400 dark:fill-opacity-50" />
            <rect x="67" y="45" width="6" height="39" fill="#047857" fillOpacity="0.4" className="dark:fill-emerald-400 dark:fill-opacity-50" />
            <rect x="88" y="45" width="6" height="39" fill="#047857" fillOpacity="0.4" className="dark:fill-emerald-400 dark:fill-opacity-50" />
            <rect x="108" y="45" width="6" height="39" fill="#047857" fillOpacity="0.4" className="dark:fill-emerald-400 dark:fill-opacity-50" />
            {/* Entablature & Pediment Triangle */}
            <polygon points="15,45 70,18 125,45" fill="#065f46" fillOpacity="0.35" className="dark:fill-emerald-400 dark:fill-opacity-40" />
            {/* Dome on top */}
            <path d="M 52 18 C 52 2, 88 2, 88 18 Z" fill="#047857" fillOpacity="0.4" className="dark:fill-emerald-400 dark:fill-opacity-45" />
            {/* Flagpole & Indian Flag motif */}
            <line x1="70" y1="2" x2="70" y2="-16" stroke="#047857" strokeWidth="1.5" strokeOpacity="0.5" className="dark:stroke-emerald-300" />
            <polygon points="70,-16 85,-11 70,-6" fill="#10b981" fillOpacity="0.5" className="dark:fill-emerald-400" />
          </g>

          {/* Right Cluster: Rural Panchayath Seva Kendra, Windmill & Greenery */}
          {/* Windmill / Solar Eco energy */}
          <g transform="translate(1080, 135)">
            <polygon points="18,110 22,25 26,110" fill="#047857" fillOpacity="0.3" className="dark:fill-emerald-400 dark:fill-opacity-35" />
            <circle cx="22" cy="25" r="3" fill="#047857" fillOpacity="0.5" className="dark:fill-emerald-400" />
            <line x1="22" y1="25" x2="22" y2="-5" stroke="#059669" strokeWidth="1.2" strokeOpacity="0.4" className="dark:stroke-emerald-300" />
            <line x1="22" y1="25" x2="-4" y2="40" stroke="#059669" strokeWidth="1.2" strokeOpacity="0.4" className="dark:stroke-emerald-300" />
            <line x1="22" y1="25" x2="48" y2="40" stroke="#059669" strokeWidth="1.2" strokeOpacity="0.4" className="dark:stroke-emerald-300" />
          </g>

          {/* Solar Panel array */}
          <polygon points="1140,248 1175,235 1205,235 1170,248" fill="#0284c7" fillOpacity="0.25" stroke="#0369a1" strokeWidth="0.6" strokeOpacity="0.4" className="dark:fill-teal-500 dark:fill-opacity-30 dark:stroke-teal-400" />

          {/* Banyan / Shade Tree (Right) */}
          <circle cx="1260" cy="195" r="24" fill="#059669" fillOpacity="0.25" className="dark:fill-emerald-400 dark:fill-opacity-30" />
          <circle cx="1280" cy="188" r="18" fill="#047857" fillOpacity="0.3" className="dark:fill-emerald-300 dark:fill-opacity-35" />
          <circle cx="1245" cy="192" r="16" fill="#065f46" fillOpacity="0.25" className="dark:fill-emerald-400 dark:fill-opacity-30" />
          <rect x="1258" y="215" width="6" height="30" fill="#047857" fillOpacity="0.4" className="dark:fill-emerald-500" />

          {/* Village House (Right) */}
          <polygon points="1310,244 1335,220 1360,244" fill="#065f46" fillOpacity="0.35" className="dark:fill-emerald-400 dark:fill-opacity-40" />
          <rect x="1315" y="244" width="40" height="20" fill="#047857" fillOpacity="0.25" className="dark:fill-emerald-500 dark:fill-opacity-30" />
          <rect x="1330" y="250" width="10" height="14" fill="#065f46" fillOpacity="0.4" className="dark:fill-emerald-300" />

          {/* Ground Baseline */}
          <line x1="0" y1="265" x2="1440" y2="265" stroke="#047857" strokeWidth="1.5" strokeOpacity="0.2" className="dark:stroke-emerald-400 dark:stroke-opacity-30" />
        </svg>
      </div>

      {/* 8. Subtle Bottom Footer Branding Line */}
      <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2 text-[10px] tracking-wider text-slate-500/60 dark:text-slate-400/60 font-medium">
        <span>GOVERNMENT OF KARNATAKA</span>
        <span>&bull;</span>
        <span>RURAL DEVELOPMENT &amp; PANCHAYATH RAJ DEPARTMENT</span>
        <span>&bull;</span>
        <span>NAMMA PANCHAYATH E-PORTAL</span>
      </div>
    </div>
  );
}

