import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, format 
} from 'date-fns';
import { 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Users, 
  Building2, 
  UtensilsCrossed, 
  Calendar,
  Sparkles,
  Wrench,
  Download
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Booking, Order, Room, RoomCategory, HousekeepingTask, MaintenanceReport, ServiceRequest } from '../../types';

type DateRangeOption = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'prevMonth' | 'custom';

interface DateRange {
  start: number;
  end: number;
}

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#0891b2', '#be123c'];

export default function AdminAnalytics() {
  const [rangeOption, setRangeOption] = useState<DateRangeOption>('last30');
  const [customStart, setCustomStart] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'hotel' | 'restaurant' | 'operations'>('overview');

  // Data states
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);

  const dateRange = useMemo<DateRange>(() => {
    const now = new Date();
    switch (rangeOption) {
      case 'today':
        return { start: startOfDay(now).getTime(), end: endOfDay(now).getTime() };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday).getTime(), end: endOfDay(yesterday).getTime() };
      case 'last7':
        return { start: startOfDay(subDays(now, 7)).getTime(), end: endOfDay(now).getTime() };
      case 'last30':
        return { start: startOfDay(subDays(now, 30)).getTime(), end: endOfDay(now).getTime() };
      case 'thisMonth':
        return { start: startOfMonth(now).getTime(), end: endOfMonth(now).getTime() };
      case 'prevMonth':
        const prev = subMonths(now, 1);
        return { start: startOfMonth(prev).getTime(), end: endOfMonth(prev).getTime() };
      case 'custom':
        return { 
          start: startOfDay(new Date(customStart)).getTime(), 
          end: endOfDay(new Date(customEnd)).getTime() 
        };
    }
  }, [rangeOption, customStart, customEnd]);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Base data (not date filtered)
      const roomsSnap = await getDocs(collection(db, 'rooms'));
      setRooms(roomsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Room)));

      const catSnap = await getDocs(collection(db, 'room_categories'));
      setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() } as RoomCategory)));

      // Bookings (created or overlapping with range)
      // For simplicity, we fetch created within range, OR we could fetch all active. 
      // To be safe and efficient, we query bookings created in range. 
      // If we need occupancy we might need a wider net, but we'll stick to creation date for reservations, and overlapping for occupancy.
      // Firestore doesn't easily do OR queries across different fields well for dates without composite indexes.
      // We will just fetch bookings where createdAt >= start and <= end.
      const bookingsQ = query(
        collection(db, 'bookings'),
        where('createdAt', '>=', dateRange.start),
        where('createdAt', '<=', dateRange.end)
      );
      const bookingsSnap = await getDocs(bookingsQ);
      setBookings(bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));

      // Orders
      const ordersQ = query(
        collection(db, 'restaurant_orders'),
        where('createdAt', '>=', dateRange.start),
        where('createdAt', '<=', dateRange.end)
      );
      const ordersSnap = await getDocs(ordersQ);
      setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));

      // Housekeeping
      const tasksQ = query(
        collection(db, 'housekeeping_tasks'),
        where('createdAt', '>=', dateRange.start),
        where('createdAt', '<=', dateRange.end)
      );
      const tasksSnap = await getDocs(tasksQ);
      setTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as HousekeepingTask)));

      // Maintenance
      const reportsQ = query(
        collection(db, 'maintenance_reports'),
        where('createdAt', '>=', dateRange.start),
        where('createdAt', '<=', dateRange.end)
      );
      const reportsSnap = await getDocs(reportsQ);
      setReports(reportsSnap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceReport)));

      // Service Requests
      const srQ = query(
        collection(db, 'service_requests'),
        where('createdAt', '>=', dateRange.start),
        where('createdAt', '<=', dateRange.end)
      );
      const srSnap = await getDocs(srQ);
      setServiceRequests(srSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRequest)));

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    }
    setLoading(false);
  };

  // Calculations
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'Approved' || b.status === 'Checked In' || b.status === 'Checked Out').length;
  const cancelledBookings = bookings.filter(b => b.status === 'Cancelled').length;
  const noShowBookings = bookings.filter(b => b.status === 'No Show').length;
  
  const roomRevenue = bookings
    .filter(b => ['Approved', 'Checked In', 'Checked Out'].includes(b.status))
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  // Note: True occupancy would require overlapping logic. We do a simplified version:
  // (Nights booked in this period) / (Available rooms * Nights in period)
  const totalDays = Math.max(1, Math.round((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24)));
  const availableRoomNights = rooms.filter(r => r.status !== 'Out of Service').length * totalDays;
  
  let occupiedRoomNights = 0;
  bookings.filter(b => b.type === 'room' && ['Approved', 'Checked In', 'Checked Out'].includes(b.status)).forEach(b => {
    // Find overlap between booking and range
    const overlapStart = Math.max(b.checkIn, dateRange.start);
    const overlapEnd = Math.min(b.checkOut, dateRange.end);
    if (overlapEnd > overlapStart) {
      occupiedRoomNights += Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
    }
  });
  const occupancyRate = availableRoomNights > 0 ? (occupiedRoomNights / availableRoomNights) * 100 : 0;

  // Restaurant calculations
  const pendingBookings = bookings.filter(b => b.status === 'Pending').length;
  const checkedInBookings = bookings.filter(b => b.status === 'Checked In').length;
  const checkedOutBookings = bookings.filter(b => b.status === 'Checked Out').length;

  const validOrders = orders.filter(o => o.status === 'Completed' || o.status === 'Paid');
  const restaurantRevenue = validOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const avgOrderValue = validOrders.length > 0 ? restaurantRevenue / validOrders.length : 0;

  // Best selling items
  const itemSales: Record<string, { name: string, qty: number, revenue: number, category: string }> = {};
  validOrders.forEach(o => {
    o.items.forEach(item => {
      if (!itemSales[item.itemId]) {
        itemSales[item.itemId] = { name: item.name, qty: 0, revenue: 0, category: item.category || 'Other' };
      }
      itemSales[item.itemId].qty += item.quantity;
      itemSales[item.itemId].revenue += (item.price * item.quantity);
    });
  });
  const topItems = Object.values(itemSales).sort((a, b) => b.qty - a.qty).slice(0, 10);

  // Orders by channel
  const ordersByChannel = orders.reduce((acc, o) => {
    acc[o.type] = (acc[o.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const channelData = Object.keys(ordersByChannel).map(k => ({ name: k, value: ordersByChannel[k] }));

  // Operations
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const openReports = reports.filter(r => r.status === 'Open' || r.status === 'In Progress').length;
  
  // Kitchen Prep Time
  let totalPrepTime = 0;
  let prepCount = 0;
  validOrders.forEach(o => {
    const received = o.timeline?.find(t => t.status === 'Kitchen Received')?.timestamp;
    const ready = o.timeline?.find(t => t.status === 'Ready')?.timestamp;
    if (received && ready && ready > received) {
      totalPrepTime += (ready - received);
      prepCount++;
    }
  });
  const avgPrepTimeMins = prepCount > 0 ? Math.round(totalPrepTime / prepCount / 60000) : 0;

  // Revenue trend (by day)
  const revenueByDay: Record<string, { room: number, restaurant: number }> = {};
  bookings.filter(b => ['Approved', 'Checked In', 'Checked Out'].includes(b.status)).forEach(b => {
    const day = format(new Date(b.createdAt), 'MMM dd');
    if (!revenueByDay[day]) revenueByDay[day] = { room: 0, restaurant: 0 };
    revenueByDay[day].room += b.totalAmount;
  });
  validOrders.forEach(o => {
    const day = format(new Date(o.createdAt), 'MMM dd');
    if (!revenueByDay[day]) revenueByDay[day] = { room: 0, restaurant: 0 };
    revenueByDay[day].restaurant += o.totalAmount;
  });
  
  const trendData = Object.keys(revenueByDay).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()).map(k => ({
    name: k,
    Room: revenueByDay[k].room,
    Restaurant: revenueByDay[k].restaurant
  }));

  // Room performance
  const roomPerformance = categories.map(cat => {
    const catRooms = rooms.filter(r => r.categoryId === cat.id);
    const catBookings = bookings.filter(b => b.categoryId === cat.id && ['Approved', 'Checked In', 'Checked Out'].includes(b.status));
    const catRev = catBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    
    let catNights = 0;
    catBookings.forEach(b => {
      const overlapStart = Math.max(b.checkIn, dateRange.start);
      const overlapEnd = Math.min(b.checkOut, dateRange.end);
      if (overlapEnd > overlapStart) {
        catNights += Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
      }
    });
    
    const catAvailableNights = catRooms.length * totalDays;
    const catOcc = catAvailableNights > 0 ? (catNights / catAvailableNights) * 100 : 0;
    
    return {
      name: cat.name,
      rooms: catRooms.length,
      reservations: catBookings.length,
      nights: catNights,
      occupancy: catOcc,
      revenue: catRev
    };
  });

  const handleExportCSV = () => {
    // Generate CSV for bookings
    let csv = "--- ROOM & HALL RESERVATIONS ---\n";
    csv += "Reservation Code,Guest Name,Type,Status,Check-In,Check-Out,Total Amount,Source\n";
    bookings.forEach(b => {
      csv += `${b.reservationCode},${b.guestDetails?.firstName} ${b.guestDetails?.lastName},${b.type},${b.status},${format(new Date(b.checkIn), 'yyyy-MM-dd')},${format(new Date(b.checkOut), 'yyyy-MM-dd')},${b.totalAmount},${b.bookingSource || 'Unknown'}\n`;
    });
    
    // Generate CSV for restaurant orders
    csv += "\n--- RESTAURANT ORDERS ---\n";
    csv += "Order Number,Customer Name,Type,Location,Status,Payment Method,Payment Status,Total Amount\n";
    orders.forEach(o => {
      csv += `${o.orderNumber},${o.customerName || 'Unknown'},${o.type},${o.locationRef || 'N/A'},${o.status},${o.paymentMethod || 'Unknown'},${o.paymentStatus || 'Pending'},${o.totalAmount}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hotel_and_restaurant_report_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Reports & Analytics</h1>
          <p className="text-sm text-neutral-500">Track hotel and restaurant performance.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <select 
            value={rangeOption}
            onChange={(e) => setRangeOption(e.target.value as DateRangeOption)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="prevMonth">Previous Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {rangeOption === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              />
              <span className="text-neutral-500">-</span>
              <input 
                type="date" 
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              />
            </div>
          )}
          
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-800 transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex border-b border-neutral-200 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'overview' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <PieChartIcon className="w-4 h-4 inline-block mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('hotel')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'hotel' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Building2 className="w-4 h-4 inline-block mr-2" />
              Hotel Performance
            </button>
            <button
              onClick={() => setActiveTab('restaurant')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'restaurant' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4 inline-block mr-2" />
              Restaurant Performance
            </button>
            <button
              onClick={() => setActiveTab('operations')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'operations' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Wrench className="w-4 h-4 inline-block mr-2" />
              Operations
            </button>
          </div>

          <div className="mt-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-neutral-600">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <h3 className="font-medium text-sm">Room Revenue</h3>
                    </div>
                    <p className="text-2xl font-bold text-neutral-900">{roomRevenue.toLocaleString()} ETB</p>
                    <p className="text-xs text-neutral-500 mt-1">{totalBookings} total bookings</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-neutral-600">
                      <UtensilsCrossed className="w-5 h-5 text-amber-600" />
                      <h3 className="font-medium text-sm">Restaurant Revenue</h3>
                    </div>
                    <p className="text-2xl font-bold text-neutral-900">{restaurantRevenue.toLocaleString()} ETB</p>
                    <p className="text-xs text-neutral-500 mt-1">{validOrders.length} completed orders</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-neutral-600">
                      <Users className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-medium text-sm">Occupancy Rate</h3>
                    </div>
                    <p className="text-2xl font-bold text-neutral-900">{occupancyRate.toFixed(1)}%</p>
                    <p className="text-xs text-neutral-500 mt-1">{occupiedRoomNights} occupied room nights</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-neutral-600">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                      <h3 className="font-medium text-sm">Avg Order Value</h3>
                    </div>
                    <p className="text-2xl font-bold text-neutral-900">{Math.round(avgOrderValue).toLocaleString()} ETB</p>
                  </div>
                </div>

                {/* Revenue Trend Chart */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                  <h3 className="text-lg font-bold text-neutral-900 mb-6">Revenue Trend</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dx={-10} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Line type="monotone" dataKey="Room" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Restaurant" stroke="#d97706" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'hotel' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                    <h3 className="font-medium text-sm text-neutral-600">Total Reservations</h3>
                    <p className="text-2xl font-bold text-neutral-900 mt-2">{totalBookings}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                    <h3 className="font-medium text-sm text-neutral-600">Confirmed</h3>
                    <p className="text-2xl font-bold text-neutral-900 mt-2">{confirmedBookings}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                    <h3 className="font-medium text-sm text-neutral-600">Checked In</h3>
                    <p className="text-2xl font-bold text-emerald-600 mt-2">{checkedInBookings}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                    <h3 className="font-medium text-sm text-neutral-600">No Shows</h3>
                    <p className="text-2xl font-bold text-rose-600 mt-2">{noShowBookings}</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-neutral-200">
                    <h3 className="text-lg font-bold text-neutral-900">Room Category Performance</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-neutral-600">
                      <thead className="bg-neutral-50 text-xs uppercase font-semibold text-neutral-500">
                        <tr>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Rooms</th>
                          <th className="px-6 py-4">Reservations</th>
                          <th className="px-6 py-4">Nights Sold</th>
                          <th className="px-6 py-4">Occupancy</th>
                          <th className="px-6 py-4 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {roomPerformance.map((cat, idx) => (
                          <tr key={idx} className="hover:bg-neutral-50 transition">
                            <td className="px-6 py-4 font-bold text-neutral-900">{cat.name}</td>
                            <td className="px-6 py-4">{cat.rooms}</td>
                            <td className="px-6 py-4">{cat.reservations}</td>
                            <td className="px-6 py-4">{cat.nights}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                cat.occupancy > 70 ? 'bg-emerald-100 text-emerald-700' :
                                cat.occupancy > 40 ? 'bg-amber-100 text-amber-700' :
                                'bg-rose-100 text-rose-700'
                              }`}>
                                {cat.occupancy.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-neutral-900">{cat.revenue.toLocaleString()} ETB</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'restaurant' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Items */}
                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-neutral-200">
                      <h3 className="text-lg font-bold text-neutral-900">Best-Selling Menu Items</h3>
                    </div>
                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left text-sm text-neutral-600">
                        <thead className="bg-neutral-50 text-xs uppercase font-semibold text-neutral-500">
                          <tr>
                            <th className="px-4 py-3">Item</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3 text-right">Qty</th>
                            <th className="px-4 py-3 text-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {topItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-neutral-50">
                              <td className="px-4 py-3 font-medium text-neutral-900">{item.name}</td>
                              <td className="px-4 py-3">{item.category}</td>
                              <td className="px-4 py-3 text-right font-bold">{item.qty}</td>
                              <td className="px-4 py-3 text-right text-emerald-600">{item.revenue.toLocaleString()}</td>
                            </tr>
                          ))}
                          {topItems.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">No items sold in this period.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Channel Chart */}
                  <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-neutral-900 mb-6">Orders by Channel</h3>
                    <div className="flex-1 min-h-[250px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={channelData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {channelData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'operations' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Kitchen */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 border-b border-neutral-100 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                      <UtensilsCrossed className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-900">Kitchen</h3>
                      <p className="text-xs text-neutral-500">Preparation metrics</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Avg Prep Time</span>
                      <span className="font-bold text-neutral-900">{avgPrepTimeMins} mins</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Completed Orders</span>
                      <span className="font-bold text-neutral-900">{validOrders.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Cancelled Orders</span>
                      <span className="font-bold text-rose-600">{orders.filter(o => o.status === 'Cancelled').length}</span>
                    </div>
                  </div>
                </div>

                {/* Housekeeping */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 border-b border-neutral-100 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-900">Housekeeping</h3>
                      <p className="text-xs text-neutral-500">Task metrics</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Tasks Created</span>
                      <span className="font-bold text-neutral-900">{tasks.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Tasks Completed</span>
                      <span className="font-bold text-emerald-600">{completedTasks}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Completion Rate</span>
                      <span className="font-bold text-neutral-900">
                        {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Maintenance */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 border-b border-neutral-100 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-900">Maintenance</h3>
                      <p className="text-xs text-neutral-500">Issue tracking</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Total Tickets</span>
                      <span className="font-bold text-neutral-900">{reports.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Open Tickets</span>
                      <span className="font-bold text-rose-600">{openReports}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Resolved</span>
                      <span className="font-bold text-emerald-600">{reports.filter(r => r.status === 'Resolved').length}</span>
                    </div>
                  </div>
                </div>
                {/* Waiter / Service */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 border-b border-neutral-100 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-900">Service</h3>
                      <p className="text-xs text-neutral-500">Waitstaff & Requests</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Total Requests</span>
                      <span className="font-bold text-neutral-900">{serviceRequests.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Pending Requests</span>
                      <span className="font-bold text-rose-600">{serviceRequests.filter(sr => sr.status === 'Pending').length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Completed Requests</span>
                      <span className="font-bold text-emerald-600">{serviceRequests.filter(sr => sr.status === 'Completed').length}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
