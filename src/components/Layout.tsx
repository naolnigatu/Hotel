import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, Globe, User, LogOut, ArrowLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '@/lib/supabaseAdapter';
import { signOut } from '@/lib/supabaseAdapter';
import { doc, onSnapshot } from '@/lib/supabaseAdapter';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import Footer from './Footer';
import GoogleTranslateSelector from './common/GoogleTranslateSelector';

const ROUTE_LABELS: Record<string, string> = {
  '/about': 'About Us',
  '/rooms': 'Rooms & Suites',
  '/halls': 'Halls & Events',
  '/restaurant': 'Restaurant & Bar',
  '/restaurant/track': 'Track Food & Drink Order',
  '/track-reservation': 'Track Reservation & Orders',
  '/gallery': 'Photo Gallery',
  '/amenities': 'Amenities',
  '/attractions': 'Attractions',
  '/offers': 'Special Offers',
  '/announcements': 'Announcements & News',
  '/contact': 'Contact Us',
  '/book': 'Make a Reservation',
  '/book-room': 'Book a Room',
  '/privacy': 'Privacy Policy',
  '/terms': 'Terms & Conditions',
  '/login': 'Sign In',
  '/dashboard': 'Guest Dashboard',
};

function getRouteLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  if (pathname.startsWith('/restaurant/track')) return 'Track Order';
  // Fallback: capitalize
  const parts = pathname.replace(/^\//, '').split('/');
  return parts[parts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hotelName, setHotelName] = useState('');

  // Dropdown States
  const [activeDropdown, setActiveDropdown] = useState<'more' | 'language' | 'profile' | null>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useBodyScrollLock(mobileMenuOpen);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_settings', 'hotel'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.hotelName) {
          setHotelName(data.hotelName);
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const closeDropdowns = () => setActiveDropdown(null);
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDropdowns();
    };
    
    document.addEventListener('click', closeDropdowns);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('click', closeDropdowns);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const displayHotelName = hotelName || t('hotel_name');

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setMobileMenuOpen(false);
    setActiveDropdown(null);
    navigate('/');
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleDropdownEnter = (dropdown: 'more' | 'language' | 'profile') => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setActiveDropdown(dropdown);
  };

  const handleDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const toggleDropdown = (e: React.MouseEvent, dropdown: 'more' | 'language' | 'profile') => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropdown(prev => prev === dropdown ? null : dropdown);
  };

  const closeMenu = () => {
    setMobileMenuOpen(false);
  };

  const isSubPage = location.pathname !== '/';
  const isHome = location.pathname === '/';

  return (
    <div className={`min-h-screen ${isHome ? 'bg-neutral-950' : 'bg-neutral-50'} flex flex-col font-sans`}>
      {/* Navigation Header */}
      <header className={`${isHome ? 'bg-neutral-950/85 backdrop-blur-xl border-white/10 text-white' : 'bg-white shadow-xs border-neutral-100 text-neutral-900'} sticky top-0 z-50 border-b transition-colors`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          
          <div className="flex items-center gap-1 sm:gap-3 shrink overflow-hidden">
            <button 
              onClick={(e) => { e.stopPropagation(); setMobileMenuOpen(true); }}
              className={`p-1.5 sm:p-2 -ml-1 sm:-ml-2 rounded-lg ${isHome ? 'hover:bg-white/10 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-700'} lg:hidden focus:outline-none cursor-pointer shrink-0`}
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <Link to="/" className={`font-bold ${isHome ? 'text-white' : 'text-neutral-900'} tracking-tight flex items-center shrink min-w-0`}>
              <span className="text-sm sm:text-lg lg:text-xl line-clamp-2 leading-tight">{displayHotelName}</span>
            </Link>
          </div>
          
          <nav className="hidden lg:flex items-center gap-6 shrink-0">
            <Link to="/" className={`text-sm font-medium transition-colors ${location.pathname === '/' ? (isHome ? 'text-white font-bold' : 'text-neutral-950 font-semibold') : (isHome ? 'text-neutral-300 hover:text-white' : 'text-neutral-600 hover:text-neutral-900')}`}>
              {t('home')}
            </Link>
            <Link to="/rooms" className={`text-sm font-medium transition-colors ${location.pathname === '/rooms' ? 'text-sky-400 font-bold' : (isHome ? 'text-neutral-300 hover:text-white' : 'text-neutral-600 hover:text-neutral-900')}`}>
              {t('rooms')}
            </Link>
            <Link to="/restaurant" className={`text-sm font-medium transition-colors ${location.pathname.startsWith('/restaurant') ? 'text-sky-400 font-bold' : (isHome ? 'text-neutral-300 hover:text-white' : 'text-neutral-600 hover:text-neutral-900')}`}>
              Dining
            </Link>
            <Link to="/halls" className={`text-sm font-medium transition-colors ${location.pathname === '/halls' ? 'text-sky-400 font-bold' : (isHome ? 'text-neutral-300 hover:text-white' : 'text-neutral-600 hover:text-neutral-900')}`}>
              Events
            </Link>
            <Link to="/gallery" className={`text-sm font-medium transition-colors ${location.pathname === '/gallery' ? 'text-sky-400 font-bold' : (isHome ? 'text-neutral-300 hover:text-white' : 'text-neutral-600 hover:text-neutral-900')}`}>
              Gallery
            </Link>
            
            {/* More Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => handleDropdownEnter('more')}
              onMouseLeave={handleDropdownLeave}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={(e) => toggleDropdown(e, 'more')}
                className={`text-sm font-medium transition-colors flex items-center gap-1 ${['/about', '/announcements', '/track-reservation', '/contact', '/amenities', '/attractions', '/offers'].includes(location.pathname) || activeDropdown === 'more' ? (isHome ? 'text-white font-bold' : 'text-neutral-950 font-semibold') : (isHome ? 'text-neutral-300 hover:text-white' : 'text-neutral-600 hover:text-neutral-900')}`}
              >
                More
              </button>
              
              <div className={`absolute left-0 top-full pt-2 w-48 z-50 transition-all duration-200 ${activeDropdown === 'more' ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                <div className={`${isHome ? 'bg-neutral-900 border-white/15 text-neutral-200' : 'bg-white border-neutral-100 text-neutral-700'} rounded-xl shadow-2xl border py-2`}>
                  <Link onClick={() => setActiveDropdown(null)} to="/about" className={`block px-4 py-2 text-sm ${isHome ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-neutral-50 hover:text-neutral-900'}`}>About Us</Link>
                  <Link onClick={() => setActiveDropdown(null)} to="/announcements" className={`block px-4 py-2 text-sm ${isHome ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-neutral-50 hover:text-neutral-900'}`}>Announcements</Link>
                  <Link onClick={() => setActiveDropdown(null)} to="/track-reservation" className={`block px-4 py-2 text-sm ${isHome ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-neutral-50 hover:text-neutral-900'}`}>Track Reservation</Link>
                  <Link onClick={() => setActiveDropdown(null)} to="/amenities" className={`block px-4 py-2 text-sm ${isHome ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-neutral-50 hover:text-neutral-900'}`}>Amenities</Link>
                  <Link onClick={() => setActiveDropdown(null)} to="/attractions" className={`block px-4 py-2 text-sm ${isHome ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-neutral-50 hover:text-neutral-900'}`}>Attractions</Link>
                  <Link onClick={() => setActiveDropdown(null)} to="/offers" className={`block px-4 py-2 text-sm ${isHome ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-neutral-50 hover:text-neutral-900'}`}>Special Offers</Link>
                  <Link onClick={() => setActiveDropdown(null)} to="/contact" className={`block px-4 py-2 text-sm ${isHome ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-neutral-50 hover:text-neutral-900'}`}>Contact</Link>
                </div>
              </div>
            </div>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
            {/* Dedicated Google Translate Button & Selector */}
            <div className="notranslate skiptranslate shrink-0" translate="no">
              <GoogleTranslateSelector variant="header" />
            </div>
            
            {/* Profile Dropdown */}
            {currentUser ? (
              <div 
                className="relative"
                onMouseEnter={() => handleDropdownEnter('profile')}
                onMouseLeave={handleDropdownLeave}
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={(e) => toggleDropdown(e, 'profile')}
                  className={`flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition-colors cursor-pointer ${isHome ? 'bg-white/10 text-white hover:bg-white/20' : (activeDropdown === 'profile' ? 'bg-neutral-200 text-neutral-950' : 'text-neutral-700 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200')}`}
                >
                  <User className="w-4 h-4 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{userData?.name?.split(' ')[0] || 'Profile'}</span>
                </button>
                
                <div className={`absolute right-0 top-full pt-2 w-56 max-w-[calc(100vw-16px)] z-50 transition-all duration-200 ${activeDropdown === 'profile' ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                  <div className={`${isHome ? 'bg-neutral-900 border-white/15 text-white' : 'bg-white border-neutral-100 text-neutral-900'} rounded-xl shadow-2xl border overflow-hidden`}>
                    <div className={`px-4 py-3 border-b ${isHome ? 'border-white/10 bg-white/5' : 'border-neutral-100 bg-neutral-50/50'}`}>
                      <p className="text-sm font-bold truncate">{userData?.name || 'Guest'}</p>
                      <p className={`text-xs truncate mt-0.5 ${isHome ? 'text-neutral-400' : 'text-neutral-500'}`}>{currentUser.email}</p>
                    </div>
                    <div className="py-1">
                      {userData?.role && userData.role !== 'guest' && (
                        <Link onClick={() => setActiveDropdown(null)} to="/dashboard" className={`block px-4 py-2 text-sm font-semibold border-b ${isHome ? 'text-sky-400 border-white/10 hover:bg-white/10' : 'text-neutral-700 border-neutral-100 hover:bg-neutral-50'}`}>
                          Staff Dashboard
                        </Link>
                      )}
                      <Link onClick={() => setActiveDropdown(null)} to="/my-activity" className={`block px-4 py-2 text-sm ${isHome ? 'text-neutral-300 hover:bg-white/10 hover:text-white' : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'}`}>My Activity</Link>
                      <Link onClick={() => setActiveDropdown(null)} to="/track-reservation" className={`block px-4 py-2 text-sm ${isHome ? 'text-neutral-300 hover:bg-white/10 hover:text-white' : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'}`}>My Reservations</Link>
                      <Link onClick={() => setActiveDropdown(null)} to="/restaurant/track" className={`block px-4 py-2 text-sm ${isHome ? 'text-neutral-300 hover:bg-white/10 hover:text-white' : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'}`}>My Orders</Link>
                    </div>
                    <div className={`border-t py-1 ${isHome ? 'border-white/10 bg-white/5' : 'border-neutral-100 bg-neutral-50/50'}`}>
                      <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors">Sign Out</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/login" className={`flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition-colors ${isHome ? 'text-neutral-200 hover:text-white hover:bg-white/10' : 'text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100'}`}>
                <User className="w-4 h-4 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{t('login')}</span>
              </Link>
            )}
            
            <Link to="/book" className={`inline-flex items-center justify-center px-2.5 sm:px-4 py-1.5 sm:py-2 ${isHome ? 'bg-white text-neutral-950 hover:bg-neutral-200' : 'bg-neutral-900 text-white hover:bg-neutral-800'} text-[11px] sm:text-sm font-bold rounded-lg sm:rounded-xl transition-colors shadow-2xs whitespace-nowrap`}>
              {t('book_now')}
            </Link>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[100] flex lg:hidden">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm transition-opacity" 
              onClick={closeMenu} 
              aria-hidden="true"
            />
            
            {/* Drawer */}
            <div className="relative flex flex-col w-[85%] max-w-sm h-full bg-white shadow-2xl animate-in slide-in-from-left duration-300">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-neutral-100 shrink-0">
                <span className="font-bold text-neutral-900 tracking-tight text-lg line-clamp-1">{displayHotelName}</span>
                <button 
                  onClick={closeMenu} 
                  className="p-2 -mr-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-2">
                <div className="space-y-1 pb-6">
                  <Link onClick={closeMenu} to="/" className="block text-base font-semibold text-neutral-900 py-3 border-b border-neutral-50">
                    {t('home')}
                  </Link>
                  <Link onClick={closeMenu} to="/rooms" className="block text-base font-semibold text-neutral-900 py-3 border-b border-neutral-50">
                    {t('rooms')}
                  </Link>
                  <Link onClick={closeMenu} to="/restaurant" className="block text-base font-semibold text-neutral-900 py-3 border-b border-neutral-50">
                    Dining
                  </Link>
                  <Link onClick={closeMenu} to="/halls" className="block text-base font-semibold text-neutral-900 py-3 border-b border-neutral-50">
                    Events
                  </Link>
                  <Link onClick={closeMenu} to="/gallery" className="block text-base font-semibold text-neutral-900 py-3 border-b border-neutral-50">
                    Gallery
                  </Link>
                  
                  <div className="pt-4 pb-2">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">More</span>
                  </div>
                  
                  <Link onClick={closeMenu} to="/about" className="block text-sm font-medium text-neutral-600 hover:text-neutral-900 py-2.5 pl-2">
                    About Us
                  </Link>
                  <Link onClick={closeMenu} to="/announcements" className="block text-sm font-medium text-neutral-600 hover:text-neutral-900 py-2.5 pl-2">
                    Announcements & News
                  </Link>
                  <Link onClick={closeMenu} to="/track-reservation" className="block text-sm font-medium text-neutral-600 hover:text-neutral-900 py-2.5 pl-2">
                    Track Reservation
                  </Link>
                  <Link onClick={closeMenu} to="/amenities" className="block text-sm font-medium text-neutral-600 hover:text-neutral-900 py-2.5 pl-2">
                    Amenities
                  </Link>
                  <Link onClick={closeMenu} to="/offers" className="block text-sm font-medium text-neutral-600 hover:text-neutral-900 py-2.5 pl-2">
                    Special Offers
                  </Link>
                  <Link onClick={closeMenu} to="/attractions" className="block text-sm font-medium text-neutral-600 hover:text-neutral-900 py-2.5 pl-2">
                    Attractions
                  </Link>
                  <Link onClick={closeMenu} to="/contact" className="block text-sm font-medium text-neutral-600 hover:text-neutral-900 py-2.5 pl-2">
                    Contact
                  </Link>
                </div>
              </div>
              
              {/* Drawer Footer (Language & Book) */}
              <div className="p-4 border-t border-neutral-100 bg-neutral-50 shrink-0 space-y-4">
                <div className="notranslate skiptranslate" translate="no">
                  <GoogleTranslateSelector variant="mobile" onSelectLanguage={closeMenu} />
                </div>
                
                <Link onClick={closeMenu} to="/book" className="flex items-center justify-center w-full py-3.5 bg-neutral-900 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-neutral-800 transition-colors">
                  {t('book_now')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Universal Subpage Navigation Bar with Back Button */}
      {isSubPage && (
        <nav aria-label="Subpage Back Navigation" className="bg-white/90 backdrop-blur-md border-b border-neutral-200 sticky top-16 z-40 transition-all shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-12">
              <button 
                onClick={handleBack}
                className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-950 transition-colors pr-4 cursor-pointer group"
              >
                <ArrowLeft className="w-4 h-4 text-neutral-400 group-hover:text-neutral-950 transition-colors" />
                <span>Back</span>
              </button>
              
              <div className="h-4 w-px bg-neutral-300 mx-2 hidden sm:block"></div>
              
              <div className="flex items-center gap-2 overflow-hidden px-2">
                <span className="text-sm font-medium text-neutral-900 truncate">
                  {getRouteLabel(location.pathname)}
                </span>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full flex flex-col">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
