import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Users, 
  Building2, 
  UtensilsCrossed, 
  Sparkles, 
  PieChart, 
  Settings, 
  Calendar, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ChefHat, 
  FileText, 
  Image as ImageIcon, 
  Home, 
  Phone, 
  Info, 
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  Megaphone
} from 'lucide-react';
import { Booking, Room, Order, HousekeepingTask } from '../../types';

interface ModuleItem {
  name: string;
  path: string;
  icon: any;
  description: string;
  category: 'Front Desk' | 'Restaurant & Kitchen' | 'Management' | 'CMS & Website';
  roles: string[];
  badge?: string;
}

export default function AdminDashboardIndex() {
  const { userData } = useAuth();
  const userRole = userData?.role || 'admin';

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for bookings
    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snap) => {
      const bList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
      setBookings(bList);
      setLoading(false);
    }, (err) => {
      console.warn("Bookings listener warning:", err);
      setLoading(false);
    });

    // Real-time listener for rooms
    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snap) => {
      const rList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Room[];
      setRooms(rList);
    }, (err) => {
      console.warn("Rooms listener warning:", err);
    });

    // Real-time listener for restaurant orders
    const unsubOrders = onSnapshot(collection(db, 'restaurant_orders'), (snap) => {
      const oList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      setOrders(oList);
    }, (err) => {
      console.warn("Orders listener warning:", err);
    });

    // Real-time listener for housekeeping
    const unsubTasks = onSnapshot(collection(db, 'housekeeping_tasks'), (snap) => {
      const tList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HousekeepingTask[];
      setTasks(tList);
    }, (err) => {
      console.warn("Tasks listener warning:", err);
    });

    return () => {
      unsubBookings();
      unsubRooms();
      unsubOrders();
      unsubTasks();
    };
  }, []);

  // Calculate Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'checked-in');
  const todayCheckIns = bookings.filter(b => b.checkInDate === todayStr || (b as any).checkIn === todayStr);
  
  const occupiedRoomsCount = rooms.filter(r => r.status === 'Occupied' || r.condition === 'Occupied').length;
  const availableRoomsCount = rooms.filter(r => r.status === 'Available' && (r.condition === 'Clean' || r.condition === 'Ready')).length;
  const dirtyRoomsCount = rooms.filter(r => r.condition === 'Dirty' || r.condition === 'Needs Cleaning' || r.condition === 'Cleaning In Progress').length;

  const activeOrdersCount = orders.filter(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready').length;
  const pendingTasksCount = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;

  const allModules: ModuleItem[] = [
    // Front Desk
    {
      name: 'Reservations',
      path: '/admin/reservations',
      icon: Users,
      description: 'Manage bookings, guest check-ins, payments, and calendar.',
      category: 'Front Desk',
      roles: ['admin', 'reception'],
      badge: activeBookings.length > 0 ? `${activeBookings.length} Active` : undefined,
    },
    {
      name: 'Room Inventory',
      path: '/admin/room-inventory',
      icon: Building2,
      description: 'Real-time room availability matrix, status updates, and floors.',
      category: 'Front Desk',
      roles: ['admin', 'reception', 'housekeeping'],
      badge: `${availableRoomsCount} Available`,
    },
    {
      name: 'Rooms & Categories',
      path: '/admin/rooms',
      icon: Building2,
      description: 'Configure room types, pricing, amenities, and photo galleries.',
      category: 'Front Desk',
      roles: ['admin', 'reception'],
    },
    {
      name: 'Halls & Events',
      path: '/admin/halls',
      icon: Users,
      description: 'Conference halls, wedding venues, capacity, and event bookings.',
      category: 'Front Desk',
      roles: ['admin'],
    },

    // Restaurant & Kitchen
    {
      name: 'Waiter Dashboard',
      path: '/admin/waiter',
      icon: UtensilsCrossed,
      description: 'Table order management, bill settlement, and guest service.',
      category: 'Restaurant & Kitchen',
      roles: ['admin', 'waiter'],
    },
    {
      name: 'Kitchen KDS',
      path: '/admin/kitchen',
      icon: ChefHat,
      description: 'Live kitchen display screen with prep times and ticket status.',
      category: 'Restaurant & Kitchen',
      roles: ['admin', 'kitchen'],
      badge: activeOrdersCount > 0 ? `${activeOrdersCount} Pending` : undefined,
    },
    {
      name: 'Restaurant Menu',
      path: '/admin/menu',
      icon: UtensilsCrossed,
      description: 'Dish items, pricing, categories, ingredients, and availability.',
      category: 'Restaurant & Kitchen',
      roles: ['admin'],
    },
    {
      name: 'Restaurant Tables',
      path: '/admin/tables',
      icon: UtensilsCrossed,
      description: 'Dining table arrangement, floor layout, and QR code generation.',
      category: 'Restaurant & Kitchen',
      roles: ['admin'],
    },
    {
      name: 'Stations',
      path: '/admin/stations',
      icon: ChefHat,
      description: 'Order routing to Grill, Bar, Pastry, and Hot Kitchen stations.',
      category: 'Restaurant & Kitchen',
      roles: ['admin'],
    },
    {
      name: 'Restaurant Settings',
      path: '/admin/restaurant-settings',
      icon: Settings,
      description: 'Tax rates, service charge, order modes, and receipt config.',
      category: 'Restaurant & Kitchen',
      roles: ['admin'],
    },

    // Management & Operations
    {
      name: 'Housekeeping',
      path: '/admin/housekeeping',
      icon: Sparkles,
      description: 'Room cleaning assignments, inspection reports, and maintenance.',
      category: 'Management',
      roles: ['admin', 'reception', 'housekeeping'],
      badge: pendingTasksCount > 0 ? `${pendingTasksCount} Tasks` : undefined,
    },
    {
      name: 'Analytics & Reports',
      path: '/admin/analytics',
      icon: PieChart,
      description: 'Revenue reports, occupancy charts, and operational insights.',
      category: 'Management',
      roles: ['admin'],
    },
    {
      name: 'Staff Management',
      path: '/admin/staff',
      icon: Users,
      description: 'Add staff accounts, configure roles, and set PIN permissions.',
      category: 'Management',
      roles: ['admin'],
    },
    {
      name: 'Hotel & Payment Settings',
      path: '/admin/settings',
      icon: Settings,
      description: 'Telebirr, CBE Birr, bank accounts, Wi-Fi, and hotel info.',
      category: 'Management',
      roles: ['admin'],
    },
    {
      name: 'Audit Logs',
      path: '/admin/audit-logs',
      icon: FileText,
      description: 'Trace system changes, reservation modifications, and logins.',
      category: 'Management',
      roles: ['admin'],
    },

    // CMS & Website
    {
      name: 'CMS: Home Page',
      path: '/admin/cms/home',
      icon: Home,
      description: 'Hero banners, headings, featured sections, and guest reviews.',
      category: 'CMS & Website',
      roles: ['admin'],
    },
    {
      name: 'Hotel Announcements',
      path: '/admin/announcements',
      icon: Megaphone,
      description: 'Publish public hotel news, notices, and events with pictures and formatted text.',
      category: 'CMS & Website',
      roles: ['admin', 'reception'],
    },
    {
      name: 'Special Offers',
      path: '/admin/cms/offers',
      icon: FileText,
      description: 'Create discounts, holiday stay packages, and promo codes.',
      category: 'CMS & Website',
      roles: ['admin'],
    },
    {
      name: 'Photo Gallery',
      path: '/admin/cms/gallery',
      icon: ImageIcon,
      description: 'Organize high-resolution photos of rooms, garden, and spa.',
      category: 'CMS & Website',
      roles: ['admin'],
    },
    {
      name: 'Amenities & Facilities',
      path: '/admin/cms/amenities',
      icon: Info,
      description: 'Swimming pool, hot spring spa, gym, and Wi-Fi features.',
      category: 'CMS & Website',
      roles: ['admin'],
    },
    {
      name: 'Nearby Attractions',
      path: '/admin/cms/attractions',
      icon: Info,
      description: 'Local tourist spots, hot springs, and excursion highlights.',
      category: 'CMS & Website',
      roles: ['admin'],
    },
    {
      name: 'CMS: About & Story',
      path: '/admin/cms/about',
      icon: Info,
      description: 'Hotel heritage, vision, and core hospitality values.',
      category: 'CMS & Website',
      roles: ['admin'],
    },
    {
      name: 'CMS: Contact & Location',
      path: '/admin/cms/contact',
      icon: Phone,
      description: 'Official phone numbers, email, address, and map position.',
      category: 'CMS & Website',
      roles: ['admin'],
    },
    {
      name: 'Hotel Policies',
      path: '/admin/cms/policies',
      icon: ShieldCheck,
      description: 'Check-in rules, cancellation policies, and guest privacy.',
      category: 'CMS & Website',
      roles: ['admin'],
    },
    {
      name: 'CMS: Footer Content',
      path: '/admin/cms/footer',
      icon: Info,
      description: 'Footer social links, copyrights, and contact shortcuts.',
      category: 'CMS & Website',
      roles: ['admin'],
    },
  ];

  // Filter modules by user role
  const userModules = allModules.filter(m => m.roles.includes(userRole));

  // Group modules by category
  const categories = Array.from(new Set(userModules.map(m => m.category)));

  // Format today's date
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-neutral-900 text-white rounded-2xl p-5 sm:p-7 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-bold rounded-full uppercase tracking-wider">
                {userRole} Portal
              </span>
              <span className="text-neutral-400 text-xs flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {todayFormatted}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome back, {userData?.name || 'Staff Member'}
            </h1>
            <p className="text-neutral-300 text-sm mt-1 max-w-xl">
              Real-time operational dashboard for Woliso Hotel management and guest services.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-xs transition shadow-2xs"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View Guest Site</span>
            </Link>

            {(userRole === 'admin' || userRole === 'reception') && (
              <Link
                to="/admin/reservations"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-neutral-950 hover:bg-neutral-100 rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Users className="w-4 h-4 text-neutral-900" />
                <span>Reservations</span>
              </Link>
            )}

            {userRole === 'kitchen' && (
              <Link
                to="/admin/kitchen"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-neutral-950 hover:bg-neutral-100 rounded-xl text-xs font-bold transition shadow-sm"
              >
                <ChefHat className="w-4 h-4 text-neutral-900" />
                <span>Kitchen Screen</span>
              </Link>
            )}

            {userRole === 'waiter' && (
              <Link
                to="/admin/waiter"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-neutral-950 hover:bg-neutral-100 rounded-xl text-xs font-bold transition shadow-sm"
              >
                <UtensilsCrossed className="w-4 h-4 text-neutral-900" />
                <span>Waiter Desk</span>
              </Link>
            )}

            {userRole === 'housekeeping' && (
              <Link
                to="/admin/housekeeping"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-neutral-950 hover:bg-neutral-100 rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-neutral-900" />
                <span>Housekeeping Tasks</span>
              </Link>
            )}
          </div>
        </div>

        {/* Background decorative styling */}
        <div className="absolute right-0 -bottom-10 opacity-5 pointer-events-none">
          <Building2 className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* Live Operational KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Bookings KPI */}
        <Link
          to={(userRole === 'admin' || userRole === 'reception') ? '/admin/reservations' : '#'}
          className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-2xs hover:shadow-sm hover:border-neutral-300 transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Reservations</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-neutral-900">
              {loading ? '...' : activeBookings.length}
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {todayCheckIns.length} check-in(s) today
            </p>
          </div>
        </Link>

        {/* Room Status KPI */}
        <Link
          to={(userRole === 'admin' || userRole === 'reception' || userRole === 'housekeeping') ? '/admin/room-inventory' : '#'}
          className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-2xs hover:shadow-sm hover:border-neutral-300 transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Room Status</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-neutral-900">
              {loading ? '...' : `${availableRoomsCount} / ${rooms.length || 0}`}
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {occupiedRoomsCount} occupied, {dirtyRoomsCount} cleaning
            </p>
          </div>
        </Link>

        {/* Restaurant Orders KPI */}
        <Link
          to={(userRole === 'admin' || userRole === 'kitchen') ? '/admin/kitchen' : (userRole === 'waiter' ? '/admin/waiter' : '#')}
          className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-2xs hover:shadow-sm hover:border-neutral-300 transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Active Food Orders</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-neutral-900">
              {loading ? '...' : activeOrdersCount}
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Kitchen & table service
            </p>
          </div>
        </Link>

        {/* Housekeeping Tasks KPI */}
        <Link
          to={(userRole === 'admin' || userRole === 'reception' || userRole === 'housekeeping') ? '/admin/housekeeping' : '#'}
          className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-2xs hover:shadow-sm hover:border-neutral-300 transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Pending Tasks</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-neutral-900">
              {loading ? '...' : pendingTasksCount}
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Housekeeping & maintenance
            </p>
          </div>
        </Link>
      </div>

      {/* Modules Quick Access Navigation */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
            Authorized Modules & Navigation
          </h2>
          <span className="text-xs text-neutral-500 font-medium">
            {userModules.length} sections available
          </span>
        </div>

        {categories.map((category) => {
          const categoryModules = userModules.filter(m => m.category === category);
          if (categoryModules.length === 0) return null;

          return (
            <div key={category} className="space-y-3">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                {category}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {categoryModules.map((mod) => (
                  <Link
                    key={mod.path}
                    to={mod.path}
                    className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200/90 shadow-2xs hover:shadow-md hover:border-neutral-400 transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-neutral-100 group-hover:bg-neutral-900 text-neutral-800 group-hover:text-white rounded-xl transition-colors shrink-0">
                          {React.createElement(mod.icon, { className: "w-5 h-5" })}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-neutral-900 group-hover:text-neutral-950 transition-colors">
                            {mod.name}
                          </h4>
                          {mod.badge && (
                            <span className="inline-block mt-0.5 px-2 py-0.5 bg-neutral-100 text-neutral-700 font-semibold text-[10px] rounded-full">
                              {mod.badge}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                    </div>
                    <p className="text-xs text-neutral-500 mt-2.5 line-clamp-2 leading-relaxed">
                      {mod.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Bookings Quick Table (Only for Admin & Reception) */}
      {(userRole === 'admin' || userRole === 'reception') && bookings.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-neutral-700" />
              <h3 className="font-bold text-base text-neutral-900">Recent Bookings Overview</h3>
            </div>
            <Link
              to="/admin/reservations"
              className="text-xs font-bold text-neutral-700 hover:text-neutral-950 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 uppercase font-semibold">
                  <th className="pb-3">Guest Name</th>
                  <th className="pb-3">Dates</th>
                  <th className="pb-3">Room / Category</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {bookings.slice(0, 5).map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 font-semibold text-neutral-900">
                      {b.guestName || 'Guest'}
                    </td>
                    <td className="py-3 text-neutral-600">
                      {b.checkInDate || (b as any).checkIn || '—'} → {b.checkOutDate || (b as any).checkOut || '—'}
                    </td>
                    <td className="py-3 text-neutral-600">
                      {b.roomCategoryName || (b.rooms && b.rooms[0]?.categoryName) || 'Room'}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'confirmed' || b.status === 'checked-in'
                          ? 'bg-emerald-50 text-emerald-700'
                          : b.status === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-neutral-900">
                      {b.totalPrice ? `${b.totalPrice.toLocaleString()} ETB` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
