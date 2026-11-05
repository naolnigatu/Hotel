import React, { useState, useEffect, useRef } from 'react';
import { 
  Languages, 
  Check, 
  RotateCcw, 
  X, 
  ChevronDown, 
  Sparkles 
} from 'lucide-react';
import { 
  SUPPORTED_LANGUAGES, 
  SupportedLanguage, 
  getCurrentGoogleTranslateLanguage, 
  applyGoogleTranslateLanguage,
  resetToOriginalEnglish 
} from '@/lib/googleTranslateService';

interface GoogleTranslateSelectorProps {
  variant?: 'header' | 'mobile' | 'floating';
  className?: string;
  onSelectLanguage?: () => void;
}

export default function GoogleTranslateSelector({ 
  variant = 'header', 
  className = '', 
  onSelectLanguage 
}: GoogleTranslateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<string>('en');
  const [isChanging, setIsChanging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect active language from Google Translate cookie
    const active = getCurrentGoogleTranslateLanguage();
    setCurrentLang(active);

    // Close on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (lang: SupportedLanguage) => {
    if (lang.code === currentLang && lang.code === 'en') {
      setIsOpen(false);
      return;
    }

    setIsChanging(true);
    setCurrentLang(lang.code);
    applyGoogleTranslateLanguage(lang.code);
    setIsOpen(false);
    if (onSelectLanguage) onSelectLanguage();
  };

  const handleReset = () => {
    setIsChanging(true);
    setCurrentLang('en');
    resetToOriginalEnglish();
    setIsOpen(false);
    if (onSelectLanguage) onSelectLanguage();
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  // Mobile Drawer Inline Display
  if (variant === 'mobile') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 uppercase tracking-wider">
            <Languages className="w-4 h-4 text-neutral-800" />
            <span>Website Translation</span>
          </div>
          {currentLang !== 'en' && (
            <button
              onClick={handleReset}
              className="text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset (English)
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = currentLang === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                    : 'bg-white text-neutral-800 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <div>
                  <p className="font-bold text-xs">{lang.name}</p>
                  <p className={`text-[11px] ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    {lang.nativeName}
                  </p>
                </div>
                {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Header & Floating Trigger Dropdown
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Dedicated Translate Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer border ${
          currentLang !== 'en'
            ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs hover:bg-neutral-800'
            : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900 shadow-2xs'
        }`}
        title="Translate Website using Google Translate"
        aria-label="Translate Website"
        aria-expanded={isOpen}
      >
        <Languages className={`w-4 h-4 shrink-0 ${currentLang !== 'en' ? 'text-emerald-400' : 'text-neutral-600'}`} />
        <span className="hidden xs:inline">
          {currentLang !== 'en' ? currentLangObj.nativeName : 'Translate'}
        </span>
        {currentLang !== 'en' && (
          <span className="inline-block xs:hidden text-[11px] font-bold">
            {currentLang.toUpperCase()}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Language Selector Popover Modal */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-neutral-800" />
              <div>
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Select Language</h4>
                <p className="text-[10px] text-neutral-500">Google Translate Element</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md hover:bg-neutral-200/50 cursor-pointer"
              aria-label="Close language selector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Language Options List (Strictly 5 Supported Languages) */}
          <div className="p-2 space-y-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = currentLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-2xs font-semibold'
                      : 'hover:bg-neutral-100 text-neutral-800'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{lang.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        isSelected ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {lang.code.toUpperCase()}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 truncate ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      {lang.nativeName} <span className="opacity-75 text-[10px]">({lang.region})</span>
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer with Reset to Original English */}
          <div className="p-3 border-t border-neutral-100 bg-neutral-50/50 flex flex-col gap-2">
            {currentLang !== 'en' && (
              <button
                type="button"
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-neutral-800 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-xl transition cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-neutral-600" />
                <span>Switch Back to Original English</span>
              </button>
            )}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-400">
              <Sparkles className="w-3 h-3 text-neutral-400" />
              <span>Official Google Website Translation Widget</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
