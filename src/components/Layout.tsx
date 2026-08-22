import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, Globe, User, LogOut, ArrowLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import Footer from './Footer';

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
  '/contact': 'Contact Us',
  '/book': 'Book a Room',
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

  const displayHotelName = hotelName || t('hotel_name');

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const isSubPage = location.pathname !== '/';

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="bg-white shadow-xs sticky top-0 z-50 border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 -ml-2 rounded-lg hover:bg-neutral-100 lg:hidden focus:outline-none text-neutral-700 cursor-pointer"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-neutral-900" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/" className="text-xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
              <span>{displayHotelName}</span>
            </Link>
          </div>
          
          <nav className="hidden lg:flex items-center gap-7">
            <Link to="/" className={`text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-neutral-950 font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}>
              {t('home')}
            </Link>
            <Link to="/about" className={`text-sm font-medium transition-colors ${location.pathname === '/about' ? 'text-neutral-950 font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}>
              About
            </Link>
            <Link to="/rooms" className={`text-sm font-medium transition-colors ${location.pathname === '/rooms' ? 'text-neutral-950 font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}>
              {t('rooms')}
            </Link>
            <Link to="/halls" className={`text-sm font-medium transition-colors ${location.pathname === '/halls' ? 'text-neutral-950 font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}>
              Halls & Events
            </Link>
            <Link to="/restaurant" className={`text-sm font-medium transition-colors ${location.pathname.startsWith('/restaurant') ? 'text-neutral-950 font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}>
              {t('restaurant')}
            </Link>
            <Link to="/gallery" className={`text-sm font-medium transition-colors ${location.pathname === '/gallery' ? 'text-neutral-950 font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}>
              Gallery
            </Link>
            <Link to="/track-reservation" className={`text-sm font-medium transition-colors ${location.pathname === '/track-reservation' ? 'text-neutral-950 font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}>
              Track Reservation
            </Link>
            <Link to="/contact" className={`text-sm font-medium transition-colors ${location.pathname === '/contact' ? 'text-neutral-950 font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}>
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative group">
              <button className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-neutral-600 hover:text-neutral-900 px-2 py-1 rounded-md hover:bg-neutral-100 transition-colors">
                <Globe className="w-4 h-4" />
                <span className="uppercase font-semibold">{i18n.language}</span>
              </button>
              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-neutral-100 py-1.5 hidden group-hover:block z-50">
                <button onClick={() => changeLanguage('en')} className="block w-full text-left px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">English (EN)</button>
                <button onClick={() => changeLanguage('am')} className="block w-full text-left px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">አማርኛ (AM)</button>
                <button onClick={() => changeLanguage('om')} className="block w-full text-left px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">Afaan Oromoo (OM)</button>
              </div>
            </div>
            
            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link to="/dashboard" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-neutral-700 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1.5 rounded-lg transition-colors">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{userData?.name?.split(' ')[0] || 'Dashboard'}</span>
                </Link>
                <button onClick={handleLogout} className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-neutral-700 hover:text-neutral-950 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
                <User className="w-4 h-4" />
                <span>{t('login')}</span>
              </Link>
            )}
            
            <Link to="/rooms" className="inline-flex items-center justify-center px-3.5 py-2 bg-neutral-900 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-neutral-800 transition-colors shadow-2xs">
              {t('book_now')}
            </Link>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-neutral-100 px-4 pt-3 pb-6 space-y-2 shadow-lg">
            <Link onClick={() => setMobileMenuOpen(false)} to="/" className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-2 border-b border-neutral-50">
              {t('home')}
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/about" className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-2 border-b border-neutral-50">
              About
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/rooms" className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-2 border-b border-neutral-50">
              {t('rooms')}
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/halls" className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-2 border-b border-neutral-50">
              Halls & Events
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/restaurant" className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-2 border-b border-neutral-50">
              {t('restaurant')}
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/amenities" className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-2 border-b border-neutral-50">
              Amenities
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/offers" className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-2 border-b border-neutral-50">
              Special Offers
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/attractions" className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-2 border-b border-neutral-50">
              Attractions
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/gallery" className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-2 border-b border-neutral-50">
              Gallery
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/track-reservation" className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-2 border-b border-neutral-50">
              Track Reservation
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/contact" className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-2 border-b border-neutral-50">
              Contact
            </Link>
            
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Language</span>
              <div className="flex gap-1.5">
                <button onClick={() => changeLanguage('en')} className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${i18n.language === 'en' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700'}`}>EN</button>
                <button onClick={() => changeLanguage('am')} className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${i18n.language === 'am' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700'}`}>አማ</button>
                <button onClick={() => changeLanguage('om')} className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${i18n.language === 'om' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700'}`}>OM</button>
              </div>
            </div>

            <div className="pt-3">
              <Link onClick={() => setMobileMenuOpen(false)} to="/rooms" className="block w-full py-2.5 text-center bg-neutral-900 text-white rounded-xl font-bold text-sm shadow-sm">
                {t('book_now')}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Universal Subpage Navigation Bar with Back Button */}
      {isSubPage && (
        <nav aria-label="Subpage Back Navigation" className="bg-white/90 backdrop-blur-md border-b border-neutral-200 sticky top-16 z-40 transition-all shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-800 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200 active:scale-95 px-3 py-1.5 rounded-lg border border-neutral-200 transition-all cursor-pointer shadow-2xs"
              aria-label="Go back to previous page"
            >
              <ArrowLeft className="w-4 h-4 text-neutral-700" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-1 text-xs text-neutral-500 font-medium truncate">
              <Link to="/" className="hover:text-neutral-900 transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3 text-neutral-400 shrink-0" />
              <span className="text-neutral-900 font-semibold truncate max-w-[170px] sm:max-w-xs">
                {getRouteLabel(location.pathname)}
              </span>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
