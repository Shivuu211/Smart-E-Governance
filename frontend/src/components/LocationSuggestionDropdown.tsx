import React from 'react';
import { MapPin } from 'lucide-react';

export interface LocationSuggestionItem {
  lat: string | number;
  lon?: string | number;
  lng?: string | number;
  display_name: string;
  [key: string]: any;
}

interface LocationSuggestionDropdownProps {
  suggestions: LocationSuggestionItem[];
  selectedIndex: number;
  onSelect: (item: LocationSuggestionItem) => void;
  onHover: (index: number) => void;
  pinColor?: 'rose' | 'blue';
  className?: string;
  id?: string;
}

export function parseLocationAddress(displayName: string): { primary: string; secondary: string } {
  if (!displayName) return { primary: '', secondary: '' };
  const commaIndex = displayName.indexOf(',');
  if (commaIndex === -1) {
    return { primary: displayName.trim(), secondary: '' };
  }
  const primary = displayName.slice(0, commaIndex).trim();
  const secondary = displayName.slice(commaIndex + 1).trim();
  return { primary, secondary };
}

export default function LocationSuggestionDropdown({
  suggestions,
  selectedIndex,
  onSelect,
  onHover,
  pinColor = 'rose',
  className = '',
  id = 'location-autocomplete-dropdown',
}: LocationSuggestionDropdownProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div
      id={id}
      className={`location-autocomplete-dropdown absolute top-full left-0 right-0 z-[500] mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0F172A] p-1.5 shadow-2xl ${className}`}
      role="listbox"
      aria-label="Location suggestions"
    >
      {suggestions.map((item, idx) => {
        const isSelected = selectedIndex === idx;
        const { primary, secondary } = parseLocationAddress(item.display_name);

        return (
          <button
            key={idx}
            id={`${id}-item-${idx}`}
            type="button"
            role="option"
            aria-selected={isSelected}
            data-active={isSelected ? 'true' : 'false'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(item);
            }}
            onMouseEnter={() => onHover(idx)}
            className={`location-suggestion-item group w-full rounded-lg px-3 py-2.5 text-left text-xs transition-colors flex items-start gap-2.5 border-b border-slate-100 dark:border-slate-800/80 last:border-none cursor-pointer ${
              isSelected
                ? 'selected bg-[#E6FAF0] border-emerald-300 dark:bg-[#E6FAF0] dark:border-emerald-300'
                : 'hover:bg-[#E6FAF0] hover:border-emerald-300 dark:hover:bg-[#E6FAF0]'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              <MapPin
                className={`location-pin-icon h-4 w-4 transition-colors ${
                  isSelected
                    ? 'text-rose-600 dark:text-rose-600'
                    : pinColor === 'blue'
                    ? 'text-blue-600 dark:text-blue-400 group-hover:text-rose-600'
                    : 'text-rose-600 dark:text-rose-500 group-hover:text-rose-600'
                }`}
              />
            </div>

            <div className="flex-1 min-w-0 text-left">
              {/* Primary Location Name - High Contrast */}
              <div
                className={`location-primary-text font-bold text-xs leading-snug transition-colors ${
                  isSelected
                    ? 'text-[#172033] dark:text-[#172033]'
                    : 'text-slate-900 dark:text-[#F8FAFC] group-hover:text-[#172033]'
                }`}
              >
                {primary}
              </div>

              {/* Secondary Address Details - Natural Multi-line Wrapping */}
              {secondary && (
                <div
                  className={`location-secondary-text text-[11px] leading-relaxed mt-0.5 break-words transition-colors ${
                    isSelected
                      ? 'text-[#334155] dark:text-[#334155] font-medium'
                      : 'text-slate-600 dark:text-[#CBD5E1] group-hover:text-[#334155]'
                  }`}
                >
                  {secondary}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
