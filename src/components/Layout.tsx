import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, Globe, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import Footer from './Footer';

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      {/* Navigation */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 -ml-2 rounded-md hover:bg-neutral-100 lg:hidden focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-neutral-900" /> : <Menu className="w-5 h-5 text-neutral-600" />}
            </button>
            <Link to="/" className="text-xl font-bold text-neutral-900 tracking-tight">
              {displayHotelName}
            </Link>
          </div>
          
          <nav className="hidden lg:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
              {t('home')}
            </Link>
            <Link to="/about" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
              About
            </Link>
            <Link to="/rooms" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
              {t('rooms')}
            </Link>
            <Link to="/halls" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
              Halls & Events
            </Link>
            <Link to="/restaurant" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
              {t('restaurant')}
            </Link>
            <Link to="/gallery" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
              Gallery
            </Link>
            <Link to="/contact" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <button className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
                <Globe className="w-4 h-4" />
                <span className="uppercase">{i18n.language}</span>
              </button>
              <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-lg shadow-lg border border-neutral-100 py-1 hidden group-hover:block z-50">
                <button onClick={() => changeLanguage('en')} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">English</button>
                <button onClick={() => changeLanguage('am')} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">አማርኛ</button>
                <button onClick={() => changeLanguage('om')} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">Afaan Oromo</button>
              </div>
            </div>
            
            {currentUser ? (
              <div className="flex items-center gap-4">
                <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{userData?.name?.split(' ')[0] || 'Dashboard'}</span>
                </Link>
                <button onClick={handleLogout} className="text-neutral-500 hover:text-neutral-900" title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{t('login')}</span>
              </Link>
            )}
            
            <Link to="/rooms" className="hidden sm:inline-flex items-center justify-center px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors">
              {t('book_now')}
            </Link>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-neutral-200 px-4 pt-3 pb-6 space-y-3 shadow-lg">
            <Link onClick={() => setMobileMenuOpen(false)} to="/" className="block text-base font-medium text-neutral-800 hover:text-neutral-900 py-1.5">
              {t('home')}
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/about" className="block text-base font-medium text-neutral-800 hover:text-neutral-900 py-1.5">
              About
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/rooms" className="block text-base font-medium text-neutral-800 hover:text-neutral-900 py-1.5">
              {t('rooms')}
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/halls" className="block text-base font-medium text-neutral-800 hover:text-neutral-900 py-1.5">
              Halls & Events
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/restaurant" className="block text-base font-medium text-neutral-800 hover:text-neutral-900 py-1.5">
              {t('restaurant')}
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/amenities" className="block text-base font-medium text-neutral-800 hover:text-neutral-900 py-1.5">
              Amenities
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/offers" className="block text-base font-medium text-neutral-800 hover:text-neutral-900 py-1.5">
              Special Offers
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/attractions" className="block text-base font-medium text-neutral-800 hover:text-neutral-900 py-1.5">
              Attractions
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/gallery" className="block text-base font-medium text-neutral-800 hover:text-neutral-900 py-1.5">
              Gallery
            </Link>
            <Link onClick={() => setMobileMenuOpen(false)} to="/contact" className="block text-base font-medium text-neutral-800 hover:text-neutral-900 py-1.5">
              Contact
            </Link>
            
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Language</span>
              <div className="flex gap-2">
                <button onClick={() => changeLanguage('en')} className={`px-2.5 py-1 text-xs rounded font-medium ${i18n.language === 'en' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700'}`}>EN</button>
                <button onClick={() => changeLanguage('am')} className={`px-2.5 py-1 text-xs rounded font-medium ${i18n.language === 'am' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700'}`}>አማ</button>
                <button onClick={() => changeLanguage('om')} className={`px-2.5 py-1 text-xs rounded font-medium ${i18n.language === 'om' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700'}`}>OM</button>
              </div>
            </div>

            <div className="pt-2">
              <Link onClick={() => setMobileMenuOpen(false)} to="/rooms" className="block w-full py-3 text-center bg-neutral-900 text-white rounded-xl font-bold text-sm">
                {t('book_now')}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
