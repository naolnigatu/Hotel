/**
 * Google Translate Website Widget (Google Translate Element) Service
 *
 * Controls Google's standard client-side website translation element
 * for the 5 officially supported languages:
 * - English (en) - Default Original
 * - Amharic (am)
 * - Tigrinya (ti)
 * - Somali (so)
 * - Afaan Oromo (om)
 */

export interface SupportedLanguage {
  code: 'en' | 'am' | 'ti' | 'so' | 'om';
  name: string;
  nativeName: string;
  region: string;
  isDefault?: boolean;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    region: 'Original (Default)',
    isDefault: true,
  },
  {
    code: 'am',
    name: 'Amharic',
    nativeName: 'አማርኛ',
    region: 'Ethiopia (Ethiopic)',
  },
  {
    code: 'ti',
    name: 'Tigrinya',
    nativeName: 'ትግርኛ',
    region: 'Ethiopia / Eritrea (Ethiopic)',
  },
  {
    code: 'so',
    name: 'Somali',
    nativeName: 'Soomaali',
    region: 'Horn of Africa',
  },
  {
    code: 'om',
    name: 'Afaan Oromo',
    nativeName: 'Afaan Oromoo',
    region: 'Ethiopia / Oromia',
  },
];

/**
 * Reads the current translation language from the Google Translate cookie.
 * Google Translate stores cookie in format `/en/{targetLanguageCode}`
 */
export function getCurrentGoogleTranslateLanguage(): string {
  if (typeof document === 'undefined') return 'en';

  const cookies = document.cookie.split(';');
  for (const c of cookies) {
    const trimmed = c.trim();
    if (trimmed.startsWith('googtrans=')) {
      const val = trimmed.substring('googtrans='.length);
      const parts = val.split('/');
      // Format is /source/target e.g. /en/am or /en/en
      if (parts.length >= 3 && parts[2]) {
        return parts[2].toLowerCase();
      }
    }
  }

  return 'en';
}

/**
 * Writes the Google Translate cookie across all domain levels and paths
 */
function setGoogleTranslateCookie(targetLang: string) {
  if (typeof document === 'undefined') return;

  const cookieVal = targetLang === 'en' ? '/en/en' : `/en/${targetLang}`;
  const hostname = window.location.hostname;

  // Clear existing cookies
  document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
  document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${hostname};`;

  // Set new cookie
  document.cookie = `googtrans=${cookieVal}; path=/;`;
  if (hostname && hostname !== 'localhost' && !hostname.includes('127.0.0.1')) {
    document.cookie = `googtrans=${cookieVal}; path=/; domain=${hostname};`;
    document.cookie = `googtrans=${cookieVal}; path=/; domain=.${hostname};`;
  }
}

/**
 * Suppresses Google Translate's injected top banner frame and keeps body.top at 0px
 */
export function suppressGoogleTranslateBanner(): void {
  if (typeof document === 'undefined') return;

  if (document.body) {
    if (document.body.style.top && document.body.style.top !== '0px') {
      document.body.style.setProperty('top', '0px', 'important');
    }
    if (document.body.style.position && document.body.style.position !== 'static') {
      document.body.style.setProperty('position', 'static', 'important');
    }
  }

  const frames = document.querySelectorAll(
    '.goog-te-banner-frame, .VIpgJd-ZVi9od-ORHb-OEVmcd, iframe[src*="translate.google"], body > .skiptranslate'
  );
  frames.forEach((el) => {
    if (el.id !== 'google_translate_element' && !el.querySelector('.goog-te-combo')) {
      (el as HTMLElement).style.setProperty('display', 'none', 'important');
      (el as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
      (el as HTMLElement).style.setProperty('height', '0px', 'important');
      (el as HTMLElement).style.setProperty('width', '0px', 'important');
    }
  });
}

/**
 * Switches the website language using Google's standard Translate Element.
 * Supports switching to any of the 5 languages or reverting to original English.
 */
export function applyGoogleTranslateLanguage(targetCode: string): boolean {
  if (typeof window === 'undefined') return false;

  setGoogleTranslateCookie(targetCode);
  suppressGoogleTranslateBanner();

  // Attempt 1: Locate Google Translate combo select element
  const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
  if (combo) {
    combo.value = targetCode;
    combo.dispatchEvent(new Event('change', { bubbles: true }));
    setTimeout(suppressGoogleTranslateBanner, 50);
    setTimeout(suppressGoogleTranslateBanner, 200);

    // If reverting to English, reload may be needed to completely clear Google's DOM alterations
    if (targetCode === 'en') {
      setTimeout(() => {
        window.location.reload();
      }, 150);
    }
    return true;
  }

  // Attempt 2: If the widget has not initialized its DOM yet, reload with the cookie set
  window.location.reload();
  return true;
}

/**
 * Resets the page to original English and clears all Google translation flags
 */
export function resetToOriginalEnglish(): void {
  if (typeof document === 'undefined') return;

  const hostname = window.location.hostname;
  document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
  document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${hostname};`;
  document.cookie = `googtrans=/en/en; path=/;`;

  const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
  if (combo) {
    combo.value = 'en';
    combo.dispatchEvent(new Event('change', { bubbles: true }));
  }

  setTimeout(() => {
    window.location.reload();
  }, 100);
}
