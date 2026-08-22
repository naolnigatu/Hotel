import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Hotel, Utensils, Clock, Sparkles } from 'lucide-react';
import { getRecentReservations, getRecentOrders, RecentReservation, RecentOrder } from '../lib/trackingStorage';

interface Props {
  activeTab: 'reservation' | 'order';
}

export default function TrackingTabsHeader({ activeTab }: Props) {
  const location = useLocation();
  const [recentReservations, setRecentReservations] = useState<RecentReservation[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    setRecentReservations(getRecentReservations());
    setRecentOrders(getRecentOrders());

    const handleStorage = () => {
      setRecentReservations(getRecentReservations());
      setRecentOrders(getRecentOrders());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div className="bg-neutral-100 p-1.5 rounded-2xl flex items-center gap-1.5 shadow-inner border border-neutral-200">
        <Link
          to="/track-reservation"
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'reservation'
              ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/80'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
          }`}
        >
          <Hotel className={`w-4 h-4 ${activeTab === 'reservation' ? 'text-neutral-900' : 'text-neutral-500'}`} />
          <span>Room Reservations</span>
          {recentReservations.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'reservation' ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-700'
            }`}>
              {recentReservations.length}
            </span>
          )}
        </Link>

        <Link
          to="/restaurant/track"
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'order'
              ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/80'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
          }`}
        >
          <Utensils className={`w-4 h-4 ${activeTab === 'order' ? 'text-emerald-600' : 'text-neutral-500'}`} />
          <span>Food & Drink Orders</span>
          {recentOrders.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'order' ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-700'
            }`}>
              {recentOrders.length}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
