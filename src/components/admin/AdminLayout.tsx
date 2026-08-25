import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { 
  LayoutDashboard, 
  Settings, 
  Image as ImageIcon,
  FileText,
  Home,
  LogOut,
  Building2,
  UtensilsCrossed,
  Info,
  Phone,
  Users,
  Sparkles,
  ChefHat,
  PieChart,
  Menu,
  X,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  MessageSquareHeart,
  Megaphone
} from 'lucide-react';

import NotificationCenter from './NotificationCenter';

export default function AdminLayout() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [hotelName, setHotelName] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_settings', 'hotel'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().hotelName) {
        setHotelName(docSnap.data().hotelName);
      }
    }, (err) => {
      console.error("Error loading hotel name in AdminLayout:", err);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (userData?.role !== 'admin' && userData?.role !== 'reception' && userData?.role !== 'housekeeping' && userData?.role !== 'kitchen' && userData?.role !== 'waiter') {
    return <div className="p-8 text-center text-red-500 font-bold">Access Denied. Authorized staff only.</div>;
  }

  const allNavItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, roles: ['admin', 'reception', 'kitchen', 'waiter', 'housekeeping'] },
    { name: 'Analytics', path: '/admin/analytics', icon: PieChart, roles: ['admin'] },
    { name: 'Reservations', path: '/admin/reservations', icon: Users, roles: ['admin', 'reception'] },
    { name: 'Housekeeping', path: '/admin/housekeeping', icon: Sparkles, roles: ['admin', 'reception', 'housekeeping'] },
    { name: 'Waiter Dashboard', path: '/admin/waiter', icon: UtensilsCrossed, roles: ['admin', 'waiter'] },
    { name: 'Room Inventory', path: '/admin/room-inventory', icon: Building2, roles: ['admin', 'reception', 'housekeeping'] },
    { name: 'Rooms & Categories', path: '/admin/rooms', icon: Building2, roles: ['admin', 'reception'] },
    { name: 'Halls & Events', path: '/admin/halls', icon: Users, roles: ['admin'] },
    { name: 'Kitchen KDS', path: '/admin/kitchen', icon: UtensilsCrossed, roles: ['admin', 'kitchen'] },
    { name: 'Restaurant Menu', path: '/admin/menu', icon: UtensilsCrossed, roles: ['admin'] },
    { name: 'Restaurant Tables', path: '/admin/tables', icon: UtensilsCrossed, roles: ['admin'] },
    { name: 'Stations', path: '/admin/stations', icon: ChefHat, roles: ['admin'] },
    { name: 'Restaurant Settings', path: '/admin/restaurant-settings', icon: Settings, roles: ['admin'] },
    { name: 'Staff Profiles', path: '/admin/staff', icon: Users, roles: ['admin'] },
    { name: 'Users Management', path: '/admin/users', icon: Users, roles: ['admin'] },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: FileText, roles: ['admin'] },
    { name: 'Special Offers', path: '/admin/cms/offers', icon: FileText, roles: ['admin'] },
    { name: 'Announcements', path: '/admin/announcements', icon: Megaphone, roles: ['admin', 'reception'] },
    { name: 'Testimonials', path: '/admin/testimonials', icon: MessageSquareHeart, roles: ['admin', 'reception'] },
    { name: 'CMS: Home', path: '/admin/cms/home', icon: Home, roles: ['admin'] },
    { name: 'CMS: About', path: '/admin/cms/about', icon: Info, roles: ['admin'] },
    { name: 'CMS: Contact', path: '/admin/cms/contact', icon: Phone, roles: ['admin'] },
    { name: 'CMS: Footer', path: '/admin/cms/footer', icon: Info, roles: ['admin'] },
    { name: 'Amenities', path: '/admin/cms/amenities', icon: Info, roles: ['admin'] },
    { name: 'Nearby Attractions', path: '/admin/cms/attractions', icon: Info, roles: ['admin'] },
    { name: 'Gallery', path: '/admin/cms/gallery', icon: ImageIcon, roles: ['admin'] },
    { name: 'Policies', path: '/admin/cms/policies', icon: FileText, roles: ['admin'] },
    { name: 'Hotel & Payment Settings', path: '/admin/settings', icon: Settings, roles: ['admin'] },
  ];

  const currentRoute = allNavItems.find(item => item.path === location.pathname);
  const userRole = userData?.role || '';

  if (currentRoute && !currentRoute.roles.includes(userRole)) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm max-w-md text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Access Denied</h2>
          <p className="text-sm text-neutral-600">
            Your current role (<span className="font-semibold text-neutral-800 uppercase">{userRole}</span>) is not authorized to access <span className="font-semibold text-neutral-800">{currentRoute.name}</span>.
          </p>
          <button 
            onClick={() => {
              const defaultNav = allNavItems.find(i => i.roles.includes(userRole));
              navigate(defaultNav ? defaultNav.path : '/dashboard');
            }}
            className="w-full py-2.5 bg-neutral-900 text-white font-bold text-sm rounded-xl hover:bg-neutral-800 transition cursor-pointer"
          >
            Go to My Authorized Dashboard
          </button>
        </div>
      </div>
    );
  }

  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  // Determine secondary quick tab for mobile bottom bar
  const getPrimaryActionItem = () => {
    if (userRole === 'kitchen') return navItems.find(i => i.path === '/admin/kitchen') || navItems[0];
    if (userRole === 'waiter') return navItems.find(i => i.path === '/admin/waiter') || navItems[0];
    if (userRole === 'housekeeping') return navItems.find(i => i.path === '/admin/housekeeping') || navItems[0];
    return navItems.find(i => i.path === '/admin/reservations') || navItems[0];
  };

  const getSecondaryActionItem = () => {
    if (userRole === 'kitchen') return navItems.find(i => i.path === '/admin/menu') || navItems[1];
    if (userRole === 'waiter') return navItems.find(i => i.path === '/admin/tables') || navItems[1];
    if (userRole === 'housekeeping') return navItems.find(i => i.path === '/admin/room-inventory') || navItems[1];
    return navItems.find(i => i.path === '/admin/room-inventory') || navItems.find(i => i.path === '/admin/analytics') || navItems[1];
  };

  const primaryItem = getPrimaryActionItem();
  const secondaryItem = getSecondaryActionItem();

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-200">
          <Link to="/" className="flex items-center gap-2 text-neutral-900 font-bold text-lg hover:text-neutral-700 transition">
            <Building2 className="w-6 h-6 text-neutral-900 shrink-0" />
            <span className="truncate">{hotelName ? `${hotelName} Admin` : 'Hotel Admin'}</span>
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/admin'}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-neutral-900 text-white shadow-xs' 
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                    }`
                  }
                >
                  <div className="mr-3 shrink-0">
                    {React.createElement(item.icon, { className: "w-5 h-5" })}
                  </div>
                  <span className="truncate">{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-neutral-200 space-y-2">
          <Link 
            to="/" 
            className="flex items-center w-full px-3 py-2 text-xs font-semibold text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <ExternalLink className="w-4 h-4 mr-2.5 text-neutral-500" />
            View Guest Website
          </Link>
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-xs font-semibold text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 mr-2.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Slide-Out Drawer Navigation */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="h-16 flex items-center justify-between px-5 border-b border-neutral-200">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-6 h-6 text-neutral-900 shrink-0" />
                <span className="font-bold text-base text-neutral-900 truncate">{hotelName ? `${hotelName} Portal` : 'Staff Portal'}</span>
              </div>
              <button 
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer shrink-0"
                aria-label="Close navigation drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile in Drawer */}
            <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {userData.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-neutral-900 truncate">{userData.name}</p>
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-neutral-200 text-neutral-800 rounded-full uppercase tracking-wider">
                  {userData.role}
                </span>
              </div>
            </div>

            {/* Nav list */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  onClick={() => setMobileDrawerOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-neutral-900 text-white font-semibold' 
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    {React.createElement(item.icon, { className: "w-5 h-5 shrink-0" })}
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-40" />
                </NavLink>
              ))}
            </nav>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-neutral-200 space-y-2 bg-white">
              <Link
                to="/"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center w-full px-3 py-2 text-xs font-semibold text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-2 text-neutral-500" />
                View Public Website
              </Link>
              <button 
                onClick={handleLogout}
                className="flex items-center w-full px-3 py-2 text-xs font-semibold text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden pb-16 md:pb-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-4 sm:px-6 md:px-8 shrink-0 sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Back Button */}
            <button
              onClick={() => {
                if (location.pathname === '/admin') {
                  navigate('/');
                } else {
                  navigate(-1);
                }
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
              title={location.pathname === '/admin' ? 'Back to Guest Site' : 'Back to Previous Page'}
              aria-label="Go Back"
            >
              <ArrowLeft className="w-4 h-4 text-neutral-700" />
              <span className="hidden sm:inline">Back</span>
            </button>

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-2 rounded-lg text-neutral-700 hover:bg-neutral-100 md:hidden cursor-pointer"
              aria-label="Open staff navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h2 className="text-sm sm:text-lg md:text-xl font-bold text-neutral-900 truncate max-w-[150px] sm:max-w-xs md:max-w-md">
              {currentRoute?.name || (hotelName ? `${hotelName} Staff Portal` : 'Staff Portal')}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
             <Link 
               to="/" 
               className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition"
               title="Open guest website in new tab"
             >
               <ExternalLink className="w-3.5 h-3.5" />
               <span>Guest Site</span>
             </Link>

             <NotificationCenter />
             <div className="h-6 w-px bg-neutral-200 hidden sm:block" />
             
             <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                 {userData.name.charAt(0).toUpperCase()}
               </div>
               <div className="hidden sm:block text-left">
                 <p className="text-xs font-bold text-neutral-900 leading-tight truncate max-w-[120px]">{userData.name}</p>
                 <p className="text-[10px] text-neutral-500 uppercase font-semibold">{userData.role}</p>
               </div>
             </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-neutral-50 p-4 sm:p-6 md:p-8">
          <Outlet />
        </div>

        {/* Mobile Sticky Bottom Navigation Bar */}
        <nav aria-label="Staff Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-neutral-200 flex items-center justify-around px-2 z-40 shadow-lg">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                isActive ? 'text-neutral-950 font-bold' : 'text-neutral-500 hover:text-neutral-800'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span>Dashboard</span>
          </NavLink>

          {primaryItem && primaryItem.path !== '/admin' && (
            <NavLink
              to={primaryItem.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-neutral-950 font-bold' : 'text-neutral-500 hover:text-neutral-800'
                }`
              }
            >
              {React.createElement(primaryItem.icon, { className: "w-5 h-5 mb-0.5" })}
              <span className="truncate max-w-[70px]">{primaryItem.name}</span>
            </NavLink>
          )}

          {secondaryItem && secondaryItem.path !== '/admin' && secondaryItem.path !== primaryItem?.path && (
            <NavLink
              to={secondaryItem.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-neutral-950 font-bold' : 'text-neutral-500 hover:text-neutral-800'
                }`
              }
            >
              {React.createElement(secondaryItem.icon, { className: "w-5 h-5 mb-0.5" })}
              <span className="truncate max-w-[70px]">{secondaryItem.name}</span>
            </NavLink>
          )}

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1.5 rounded-lg text-[10px] font-semibold text-neutral-500 hover:text-neutral-900 cursor-pointer"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span>All Menus</span>
          </button>
        </nav>
      </main>
    </div>
  );
}
