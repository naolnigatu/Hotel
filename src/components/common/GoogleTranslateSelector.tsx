import React, { useState, useEffect } from 'react';
import { 
  SUPPORTED_LANGUAGES, 
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
  const [currentLang, setCurrentLang] = useState<string>('en');

  useEffect(() => {
    // Detect active language from Google Translate cookie
    const active = getCurrentGoogleTranslateLanguage();
    setCurrentLang(active);
  }, []);

  const handleSelect = (langCode: string) => {
    if (langCode === currentLang) return;

    setCurrentLang(langCode);
    if (langCode === 'en') {
      resetToOriginalEnglish();
    } else {
      applyGoogleTranslateLanguage(langCode);
    }
    if (onSelectLanguage) {
      onSelectLanguage();
    }
  };

  // Mobile Drawer Simple Clickable Toggler (No dropdown, no fancy UI)
  if (variant === 'mobile') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          <span>Language</span>
          {currentLang !== 'en' && (
            <button
              type="button"
              onClick={() => handleSelect('en')}
              className="text-[11px] font-bold text-neutral-900 underline cursor-pointer"
            >
              Reset to English
            </button>
          )}
        </div>
        <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Language selection">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = currentLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                title={`${lang.name} (${lang.nativeName})`}
                aria-label={`Translate to ${lang.name}`}
                aria-pressed={isSelected}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-center transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-900 text-white border-neutral-900 font-bold shadow-xs'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <span className="text-xs font-bold">{lang.code.toUpperCase()}</span>
                <span className={`text-[10px] truncate max-w-full leading-tight mt-0.5 ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                  {lang.nativeName}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Header & Floating Simple Clickable Segmented Toggler (No dropdown, no fancy UI)
  return (
    <div 
      className={`inline-flex items-center rounded-lg border border-neutral-200 bg-neutral-100/90 p-0.5 shrink-0 ${className}`}
      role="group"
      aria-label="Language selection"
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isSelected = currentLang === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => handleSelect(lang.code)}
            title={`${lang.name} (${lang.nativeName})`}
            aria-label={`Translate to ${lang.name}`}
            aria-pressed={isSelected}
            className={`px-1.5 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              isSelected
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70 font-semibold'
            }`}
          >
            {lang.code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
