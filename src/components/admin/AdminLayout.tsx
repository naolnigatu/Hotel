import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase';
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
  PieChart
} from 'lucide-react';

import NotificationCenter from './NotificationCenter';

export default function AdminLayout() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (userData?.role !== 'admin' && userData?.role !== 'reception' && userData?.role !== 'housekeeping' && userData?.role !== 'kitchen' && userData?.role !== 'waiter') {
    return <div className="p-8 text-center text-red-500 font-bold">Access Denied. Authorized staff only.</div>;
  }

  const allNavItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, roles: ['admin', 'reception'] },
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
    { name: 'Kitchen Stations', path: '/admin/stations', icon: ChefHat, roles: ['admin'] },
    { name: 'Restaurant Settings', path: '/admin/restaurant-settings', icon: Settings, roles: ['admin'] },
    { name: 'Staff Management', path: '/admin/staff', icon: Users, roles: ['admin'] },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: FileText, roles: ['admin'] },
    { name: 'Special Offers', path: '/admin/cms/offers', icon: FileText, roles: ['admin'] },
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
            className="w-full py-2.5 bg-neutral-900 text-white font-bold text-sm rounded-xl hover:bg-neutral-800 transition"
          >
            Go to My Authorized Dashboard
          </button>
        </div>
      </div>
    );
  }

  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-neutral-200">
          <Building2 className="w-6 h-6 text-neutral-900 mr-2" />
          <span className="font-bold text-lg text-neutral-900">Woliso Admin</span>
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
                        ? 'bg-neutral-900 text-white' 
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                    }`
                  }
                >
                  <div className="mr-3">
                    {React.createElement(item.icon, { className: "w-5 h-5" })}
                  </div>
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-neutral-200">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 md:px-8 shrink-0">
          <h2 className="text-xl font-semibold text-neutral-800">
            {currentRoute?.name || 'Woliso Staff Portal'}
          </h2>
          <div className="flex items-center gap-4">
             <NotificationCenter />
             <div className="h-6 w-px bg-neutral-200" />
             <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-sm">
                 {userData.name.charAt(0).toUpperCase()}
               </div>
               <div className="hidden sm:block text-left">
                 <p className="text-xs font-bold text-neutral-900">{userData.name}</p>
                 <p className="text-[10px] text-neutral-500 uppercase font-semibold">{userData.role}</p>
               </div>
             </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-neutral-50 p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
