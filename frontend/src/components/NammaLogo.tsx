import React from 'react';

interface NammaLogoSvgProps {
  className?: string;
  size?: number | string;
  preserveAspectRatio?: string;
}

/**
 * Pure inline SVG vector for the official NAMMA Panchayath emblem & typography.
 * Zero network request, zero load delay, instant paint at any resolution.
 */
export function NammaLogoSvg({
  className = '',
  size = '100%',
  preserveAspectRatio = 'xMidYMid slice',
}: NammaLogoSvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 550"
      width={size}
      height={size}
      preserveAspectRatio={preserveAspectRatio}
      className={className}
      aria-label="Namma Panchayath Logo"
    >
      <defs>
        <style>
          {`
            .logo-navy-text { font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 800; fill: #124370; letter-spacing: 2px; }
            .logo-green-text { font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 800; fill: #3F8A43; }
            .logo-sub-text { font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 500; fill: #64748B; letter-spacing: 0.5px; }
          `}
        </style>
      </defs>

      {/* Cream Canvas Background */}
      <rect width="500" height="550" fill="#FDFBF7" rx="24" />

      {/* EMBLEM GROUP (Center 250, 185) */}
      <g transform="translate(0, 5)">
        {/* Top Gold Star */}
        <polygon
          points="250,38 253.5,48.5 264.5,48.5 255.5,55 259,65.5 250,59 241,65.5 244.5,55 235.5,48.5 246.5,48.5"
          fill="#C6A052"
        />

        {/* Outer Swirling Arches */}
        {/* Left Navy Arch */}
        <path
          d="M 230,52 C 140,65 75,135 75,225 C 75,295 125,355 195,370 C 135,345 100,290 100,225 C 100,150 155,90 230,75 Z"
          fill="#124370"
        />
        <path
          d="M 240,60 C 160,72 105,135 105,215 C 105,275 145,325 200,345 C 150,325 122,275 122,215 C 122,150 170,95 240,80 Z"
          fill="#185287"
          opacity="0.6"
        />

        {/* Right Green Arch */}
        <path
          d="M 270,52 C 360,65 425,135 425,225 C 425,295 375,355 305,370 C 365,345 400,290 400,225 C 400,150 345,90 270,75 Z"
          fill="#3F8A43"
        />
        <path
          d="M 260,60 C 340,72 395,135 395,215 C 395,275 355,325 300,345 C 350,325 378,275 378,215 C 378,150 330,95 260,80 Z"
          fill="#2E7D32"
          opacity="0.6"
        />

        {/* Golden Sun in Upper Center */}
        <circle cx="250" cy="148" r="16" fill="#E2A645" />

        {/* Protective Navy Hands Roof Arch */}
        <path
          d="M 148,198 C 158,155 190,122 246,108 C 210,128 185,150 162,185 C 155,195 150,200 148,198 Z"
          fill="#124370"
        />
        <path
          d="M 148,198 C 175,170 212,130 250,122 C 228,135 195,160 170,198 Z"
          fill="#124370"
        />

        <path
          d="M 352,198 C 342,155 310,122 254,108 C 290,128 315,150 338,185 C 345,195 350,200 352,198 Z"
          fill="#124370"
        />
        <path
          d="M 352,198 C 325,170 288,130 250,122 C 272,135 305,160 330,198 Z"
          fill="#124370"
        />

        {/* Village Hill Mound */}
        <path d="M 130,250 Q 250,215 370,250 Q 250,270 130,250 Z" fill="#3F8A43" />

        {/* Houses on Hill */}
        <path
          d="M 170,240 L 170,225 L 190,210 L 210,225 L 210,240 Z"
          fill="#FFFFFF"
          stroke="#124370"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <polygon points="166,226 190,207 214,226" fill="#124370" />
        <rect x="184" y="226" width="12" height="14" fill="#124370" />

        {/* Center Main House */}
        <path
          d="M 220,238 L 220,208 L 250,186 L 280,208 L 280,238 Z"
          fill="#FFFFFF"
          stroke="#124370"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <polygon points="214,210 250,182 286,210" fill="#124370" />
        <rect x="240" y="210" width="20" height="28" fill="#124370" />
        <rect x="228" y="200" width="8" height="8" fill="#124370" />
        <rect x="264" y="200" width="8" height="8" fill="#124370" />

        {/* Right House */}
        <path
          d="M 290,240 L 290,222 L 312,206 L 334,222 L 334,240 Z"
          fill="#FFFFFF"
          stroke="#3F8A43"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <polygon points="286,223 312,203 338,223" fill="#3F8A43" />
        <rect x="306" y="224" width="12" height="16" fill="#3F8A43" />

        {/* Trees flanking village */}
        <path
          d="M 152,240 Q 142,220 152,205 Q 165,220 152,240 Z"
          fill="#3F8A43"
          stroke="#2E7D32"
          strokeWidth="2"
        />
        <path
          d="M 348,240 Q 338,220 348,205 Q 361,220 348,240 Z"
          fill="#3F8A43"
          stroke="#2E7D32"
          strokeWidth="2"
        />

        {/* Deep Rooted Tree (Banyan Roots below Hill) */}
        <path
          d="M 242,250 C 242,270 220,290 190,305 M 250,250 L 250,320 M 258,250 C 258,270 280,290 310,305 M 245,270 C 220,280 200,295 175,310 M 255,270 C 280,280 300,295 325,310"
          stroke="#124370"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Foliage / Leaves around Roots */}
        <path d="M 175,270 Q 185,260 195,270 Q 185,280 175,270 Z" fill="#3F8A43" />
        <path d="M 200,260 Q 210,250 220,260 Q 210,270 200,260 Z" fill="#3F8A43" />
        <path d="M 280,260 Q 290,250 300,260 Q 290,270 280,260 Z" fill="#3F8A43" />
        <path d="M 305,270 Q 315,260 325,270 Q 315,280 305,270 Z" fill="#3F8A43" />
        <path d="M 180,290 Q 190,280 200,290 Q 190,300 180,290 Z" fill="#3F8A43" />
        <path d="M 300,290 Q 310,280 320,290 Q 310,300 300,290 Z" fill="#3F8A43" />
        <path d="M 215,295 Q 225,285 235,295 Q 225,305 215,295 Z" fill="#3F8A43" />
        <path d="M 265,295 Q 275,285 285,295 Q 275,305 265,295 Z" fill="#3F8A43" />
      </g>

      {/* TYPOGRAPHY BRANDING */}
      <text x="250" y="415" textAnchor="middle" className="logo-navy-text" fontSize="44">
        NAMMA
      </text>
      <text x="250" y="465" textAnchor="middle" className="logo-green-text" fontSize="42">
        Panchayath
      </text>
      <text x="250" y="502" textAnchor="middle" className="logo-sub-text" fontSize="16">
        Gram Panchayath Management Platform
      </text>
    </svg>
  );
}
