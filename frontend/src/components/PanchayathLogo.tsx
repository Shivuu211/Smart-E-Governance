import React from 'react';
import { NammaLogoSvg } from './NammaLogo';

interface PanchayathLogoProps {
  className?: string;
  imgClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export default function PanchayathLogo({
  className = '',
  imgClassName = '',
  size = 'md',
  showText = false,
}: PanchayathLogoProps) {
  const containerSizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-14 w-14',
    xl: 'h-16 w-16',
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200/80 bg-[#FDFBF7] p-0.5 shadow-sm transition-transform hover:scale-105 ${containerSizeClasses}`}
      >
        <NammaLogoSvg className={`h-full w-full object-cover rounded-full ${imgClassName}`} />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className="font-display font-black tracking-wider text-[#124370] leading-none text-base">
            NAMMA
          </span>
          <span className="font-display font-extrabold text-[#3F8A43] leading-none text-sm mt-0.5">
            Panchayath
          </span>
          <span className="text-[9.5px] font-semibold text-slate-500 tracking-tight mt-0.5">
            Gram Panchayath Management Platform
          </span>
        </div>
      )}
    </div>
  );
}


