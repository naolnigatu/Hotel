import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Booking, Order, HallBookingRequest } from '../types';
import { format } from 'date-fns';
import { Link, Navigate } from 'react-router-dom';
import { Calendar, UtensilsCrossed, Building, ArrowRight, Loader2, Clock, AlertCircle } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'room' | 'restaurant' | 'hall';
  title: string;
  description: string;
  status: string;
  timestamp: number;
  reference: string;
  link: string;
}

export default function MyActivity() {
  const { currentUser, userData } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    const fetchActivity = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const activityList: ActivityItem[] = [];

        // 1. Fetch Room Bookings
        const bookingsQuery = query(collection(db, 'bookings'), where('guestId', '==', currentUser.uid));
        const bookingsSnap = await getDocs(bookingsQuery);
        bookingsSnap.forEach(docSnap => {
          const data = docSnap.data() as Booking;
          activityList.push({
            id: `room-${docSnap.id}`,
            type: 'room',
            title: 'Room Reservation',
            description: `${data.numberOfGuests} Guest(s) • ${format(data.checkIn, 'MMM d')} - ${format(data.checkOut, 'MMM d')}`,
            status: data.status,
            timestamp: data.createdAt,
            reference: data.reservationCode,
            link: `/track-reservation?code=${data.reservationCode}`
          });
        });

        // 2. Fetch Restaurant Orders
        const ordersQuery = query(collection(db, 'restaurant_orders'), where('customerUid', '==', currentUser.uid));
        const ordersSnap = await getDocs(ordersQuery);
        ordersSnap.forEach(docSnap => {
          const data = docSnap.data() as Order;
          activityList.push({
            id: `restaurant-${docSnap.id}`,
            type: 'restaurant',
            title: 'Restaurant Order',
            description: `${data.items?.length || 0} items • Total: ${data.totalAmount} ETB`,
            status: data.status,
            timestamp: data.createdAt,
            reference: data.orderNumber,
            link: `/restaurant/track/${docSnap.id}`
          });
        });

        // 3. Fetch Hall Booking Requests
        const hallQuery = query(collection(db, 'hall_requests'), where('guestId', '==', currentUser.uid));
        const hallSnap = await getDocs(hallQuery);
        hallSnap.forEach(docSnap => {
          const data = docSnap.data() as HallBookingRequest;
          activityList.push({
            id: `hall-${docSnap.id}`,
            type: 'hall',
            title: 'Event Hall Request',
            description: `${data.hallName} • ${data.eventType}`,
            status: data.status,
            timestamp: data.createdAt,
            reference: data.reservationCode,
            link: `/track-reservation?code=${data.reservationCode}` // Since they share the reservation tracker
          });
        });

        // Sort by most recent
        activityList.sort((a, b) => b.timestamp - a.timestamp);
        
        setActivities(activityList);
      } catch (err) {
        console.error("Error fetching activity:", err);
        setError("Failed to load your activity. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [currentUser]);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('pending') || s.includes('draft') || s.includes('preparing') || s.includes('received')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    if (s.includes('approved') || s.includes('ready') || s.includes('completed') || s.includes('confirmed') || s.includes('paid')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (s.includes('checked in') || s.includes('in progress')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (s.includes('cancelled') || s.includes('rejected') || s.includes('failed') || s.includes('no show')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    return 'bg-neutral-100 text-neutral-800 border-neutral-200';
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'room': return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'restaurant': return <UtensilsCrossed className="w-5 h-5 text-orange-600" />;
      case 'hall': return <Building className="w-5 h-5 text-purple-600" />;
      default: return <Clock className="w-5 h-5 text-neutral-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">My Activity</h1>
          <p className="text-neutral-500 mt-2">View your recent reservations, orders, and requests.</p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-neutral-200 shadow-sm">
            <Loader2 className="w-10 h-10 text-neutral-400 animate-spin mb-4" />
            <p className="text-neutral-500 font-medium">Loading your activity...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 text-red-700 p-6 rounded-3xl flex items-start gap-4 shadow-sm">
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-lg">Error loading activity</h3>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">No activity found</h3>
            <p className="text-neutral-500 mb-8 max-w-sm mx-auto">
              You haven't made any reservations or orders yet. Once you do, they will appear here.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/rooms" className="px-5 py-2.5 bg-neutral-900 text-white font-semibold rounded-xl hover:bg-neutral-800 transition-colors shadow-sm">
                Book a Room
              </Link>
              <Link to="/restaurant" className="px-5 py-2.5 bg-white text-neutral-900 border border-neutral-200 font-semibold rounded-xl hover:bg-neutral-50 transition-colors shadow-sm">
                Order Food
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <Link 
                key={activity.id} 
                to={activity.link}
                className="block bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-all hover:border-neutral-300 group overflow-hidden"
              >
                <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5">
                  
                  {/* Icon & Details */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center shrink-0 shadow-inner">
                      {getIcon(activity.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-neutral-900 text-lg group-hover:text-blue-600 transition-colors">
                          {activity.title}
                        </h3>
                        <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusColor(activity.status)}`}>
                          {activity.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-neutral-600">{activity.description}</p>
                      
                      <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{format(activity.timestamp, 'MMM d, yyyy • h:mm a')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-neutral-100 px-2 py-0.5 rounded-md text-neutral-700">
                          <span className="opacity-70">Ref:</span>
                          <span className="font-bold">{activity.reference}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="pt-4 sm:pt-0 border-t sm:border-t-0 border-neutral-100 flex items-center justify-between sm:justify-end shrink-0 sm:pl-6">
                    <span className="text-sm font-semibold text-blue-600 group-hover:text-blue-700">View Details</span>
                    <ArrowRight className="w-5 h-5 text-neutral-300 group-hover:text-blue-600 transition-colors group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
