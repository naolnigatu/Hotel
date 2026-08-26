import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, Globe, User, LogOut, ArrowLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
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
          
          <nav className="hidden lg:flex items-center gap-6">
            <Link to="/" className={`text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-neutral-950 font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}>
              {t('home')}
            </Link>
            <Link to="/rooms" className={`text-sm font-medium transition-colors ${location.pathname === '/rooms' ? 'text-neutral-950 font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}>
              {t('rooms')}
            </Link>
            <Link to="/restaurant" className={`text-sm font-medium transition-colors ${location.pathname.startsWith('/restaurant') ? 'text-neutral-950 font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}>
              Dining
            </Link>
            <Link to="/halls" className={`text-sm font-medium transition-colors ${location.pathname === '/halls' ? 'text-neutral-950 font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}>
              Events
            </Link>
            <Link to="/gallery" className={`text-sm font-medium transition-colors ${location.pathname === '/gallery' ? 'text-neutral-950 font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}>
              Gallery
            </Link>
            
            {/* More Dropdown */}
            <div className="relative group">
              <button className={`text-sm font-medium transition-colors flex items-center gap-1 ${['/about', '/announcements', '/track-reservation', '/contact', '/amenities', '/attractions', '/offers'].includes(location.pathname) ? 'text-neutral-950 font-semibold' : 'text-neutral-600 hover:text-neutral-900'}`}>
                More
              </button>
              <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-neutral-100 py-2 hidden group-hover:block z-50">
                <Link to="/about" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900">About Us</Link>
                <Link to="/announcements" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900">Announcements</Link>
                <Link to="/track-reservation" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900">Track Reservation</Link>
                <Link to="/amenities" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900">Amenities</Link>
                <Link to="/attractions" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900">Attractions</Link>
                <Link to="/offers" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900">Special Offers</Link>
                <Link to="/contact" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900">Contact</Link>
              </div>
            </div>
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
              <div className="relative group">
                <button className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-neutral-700 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{userData?.name?.split(' ')[0] || 'Profile'}</span>
                </button>
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-neutral-100 py-1.5 hidden group-hover:block z-50">
                  <div className="px-4 py-2 border-b border-neutral-100">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{userData?.name || 'Guest'}</p>
                    <p className="text-xs text-neutral-500 truncate">{currentUser.email}</p>
                  </div>
                  <div className="py-1">
                    {userData?.role && userData.role !== 'guest' && (
                      <Link to="/dashboard" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 font-semibold border-b border-neutral-100">
                        Staff Dashboard
                      </Link>
                    )}
                    <Link to="/my-activity" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900">My Activity</Link>
                    <Link to="/track-reservation" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900">My Reservations</Link>
                    <Link to="/restaurant/track" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900">My Orders</Link>
                  </div>
                  <div className="border-t border-neutral-100 py-1">
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer">Sign Out</button>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-neutral-700 hover:text-neutral-950 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
                <User className="w-4 h-4" />
                <span>{t('login')}</span>
              </Link>
            )}
            
            <Link to="/book" className="inline-flex items-center justify-center px-3.5 py-2 bg-neutral-900 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-neutral-800 transition-colors shadow-2xs">
              {t('book_now')}
            </Link>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-neutral-100 px-4 pt-3 pb-6 space-y-2 shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain">
            <Link onClick={() => setMobileMenuOpen(false)} to="/" className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-2 border-b border-neutral-50">
              {t('home')}
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/rooms" className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-2 border-b border-neutral-50">
              {t('rooms')}
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/restaurant" className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-2 border-b border-neutral-50">
              Dining
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/halls" className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-2 border-b border-neutral-50">
              Events
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/gallery" className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-2 border-b border-neutral-50">
              Gallery
            </Link>
            
            <div className="pt-2 pb-1">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">More</span>
            </div>
            
            <Link onClick={() => setMobileMenuOpen(false)} to="/about" className="block text-sm font-medium text-neutral-600 hover:text-neutral-900 py-1.5 pl-2 border-l-2 border-transparent hover:border-neutral-200">
              About Us
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/announcements" className="block text-sm font-medium text-neutral-600 hover:text-neutral-900 py-1.5 pl-2 border-l-2 border-transparent hover:border-neutral-200">
              Announcements & News
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/track-reservation" className="block text-sm font-medium text-neutral-600 hover:text-neutral-900 py-1.5 pl-2 border-l-2 border-transparent hover:border-neutral-200">
              Track Reservation
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/amenities" className="block text-sm font-medium text-neutral-600 hover:text-neutral-900 py-1.5 pl-2 border-l-2 border-transparent hover:border-neutral-200">
              Amenities
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/offers" className="block text-sm font-medium text-neutral-600 hover:text-neutral-900 py-1.5 pl-2 border-l-2 border-transparent hover:border-neutral-200">
              Special Offers
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/attractions" className="block text-sm font-medium text-neutral-600 hover:text-neutral-900 py-1.5 pl-2 border-l-2 border-transparent hover:border-neutral-200">
              Attractions
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/contact" className="block text-sm font-medium text-neutral-600 hover:text-neutral-900 py-1.5 pl-2 border-l-2 border-transparent hover:border-neutral-200">
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
              <Link onClick={() => setMobileMenuOpen(false)} to="/book" className="block w-full py-2.5 text-center bg-neutral-900 text-white rounded-xl font-bold text-sm shadow-sm">
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
