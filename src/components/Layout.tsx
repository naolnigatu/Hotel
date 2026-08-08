import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, Globe, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import Footer from './Footer';

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      {/* Navigation */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="p-2 -ml-2 rounded-md hover:bg-neutral-100 lg:hidden">
              <Menu className="w-5 h-5 text-neutral-600" />
            </button>
            <Link to="/" className="text-xl font-bold text-neutral-900 tracking-tight">
              {t('hotel_name')}
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
              <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-lg shadow-lg border border-neutral-100 py-1 hidden group-hover:block">
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
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
