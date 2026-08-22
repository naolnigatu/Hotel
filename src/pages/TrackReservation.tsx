import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Search, 
  Loader2, 
  Calendar, 
  Users, 
  Hotel, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  X, 
  RefreshCw, 
  Phone, 
  Mail, 
  CreditCard,
  Building,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Booking } from '../types';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import TrackingTabsHeader from '../components/TrackingTabsHeader';
import { 
  getRecentReservations, 
  saveRecentReservation, 
  updateRecentReservationStatus, 
  removeRecentReservation, 
  RecentReservation 
} from '../lib/trackingStorage';

export default function TrackReservation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryCode = searchParams.get('code') || searchParams.get('id') || '';
  const { currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState(queryCode);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [recentList, setRecentList] = useState<RecentReservation[]>([]);
  const [activeCode, setActiveCode] = useState<string>('');

  // Refresh recent list from storage
  const refreshRecent = () => {
    setRecentList(getRecentReservations());
  };

  useEffect(() => {
    refreshRecent();
  }, []);

  // Fetch logged in user's bookings if recent storage is empty
  useEffect(() => {
    if (currentUser && recentList.length === 0) {
      const fetchUserBookings = async () => {
        try {
          const q = query(collection(db, 'bookings'), where('guestDetails.email', '==', currentUser.email));
          const snap = await getDocs(q);
          snap.docs.forEach(docSnap => {
            const data = docSnap.data() as Booking;
            if (data.reservationCode) {
              saveRecentReservation({
                code: data.reservationCode,
                id: docSnap.id,
                categoryName: 'Room',
                guestName: `${data.guestDetails?.firstName || ''} ${data.guestDetails?.lastName || ''}`.trim(),
                guestPhone: data.guestDetails?.phone,
                guestEmail: data.guestDetails?.email,
                checkIn: data.checkIn,
                checkOut: data.checkOut,
                numberOfGuests: data.numberOfGuests,
                totalAmount: data.totalAmount,
                status: data.status,
                createdAt: data.createdAt || Date.now()
              });
            }
          });
          refreshRecent();
        } catch (e) {
          console.error('Error fetching user bookings:', e);
        }
      };
      fetchUserBookings();
    }
  }, [currentUser]);

  // Automatically catch code from URL or most recent reservation on load
  useEffect(() => {
    if (queryCode) {
      setSearchTerm(queryCode);
      fetchBookingByCode(queryCode);
    } else {
      const recents = getRecentReservations();
      if (recents.length > 0) {
        // Automatically load the latest reservation
        const latest = recents[0];
        setSearchTerm(latest.code);
        fetchBookingByCode(latest.code);
      }
    }
  }, [queryCode]);

  // Real-time listener on active booking ID
  useEffect(() => {
    if (!booking?.id) return;

    const unsub = onSnapshot(doc(db, 'bookings', booking.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Booking;
        const updatedBooking = { ...data, id: docSnap.id };
        setBooking(updatedBooking);
        if (data.status) {
          updateRecentReservationStatus(data.reservationCode || docSnap.id, data.status);
          refreshRecent();
        }
      }
    });

    return () => unsub();
  }, [booking?.id]);

  const fetchBookingByCode = async (codeToSearch: string) => {
    const code = codeToSearch.trim().toUpperCase();
    if (!code) return;

    setLoading(true);
    setError('');
    setSearched(true);
    setActiveCode(code);

    try {
      // 1. Try search by reservationCode
      const q = query(collection(db, 'bookings'), where('reservationCode', '==', code));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = docSnap.data() as Booking;
        const fullBooking = { ...data, id: docSnap.id };
        setBooking(fullBooking);

        // Update / save in recents
        saveRecentReservation({
          code: data.reservationCode || code,
          id: docSnap.id,
          categoryName: 'Room',
          guestName: `${data.guestDetails?.firstName || ''} ${data.guestDetails?.lastName || ''}`.trim(),
          guestPhone: data.guestDetails?.phone,
          guestEmail: data.guestDetails?.email,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          numberOfGuests: data.numberOfGuests,
          totalAmount: data.totalAmount,
          status: data.status,
          createdAt: data.createdAt || Date.now()
        });
        refreshRecent();
      } else {
        // 2. Try doc ID match
        const docRef = doc(db, 'bookings', codeToSearch.trim());
        const directSnap = await getDocs(query(collection(db, 'bookings'), where('id', '==', codeToSearch.trim())));
        if (!directSnap.empty) {
          const d = directSnap.docs[0].data() as Booking;
          setBooking({ ...d, id: directSnap.docs[0].id });
        } else {
          setError(`No reservation found with ID "${code}". Please check the code and try again.`);
          setBooking(null);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch reservation details. Please check your connection.');
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setSearchParams({ code: searchTerm.trim().toUpperCase() });
    fetchBookingByCode(searchTerm);
  };

  const handleSelectRecent = (rec: RecentReservation) => {
    setSearchTerm(rec.code);
    setSearchParams({ code: rec.code });
    fetchBookingByCode(rec.code);
  };

  const handleRemoveRecent = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    removeRecentReservation(code);
    refreshRecent();
    if (activeCode === code) {
      setBooking(null);
      setSearched(false);
      setActiveCode('');
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Pending':
      case 'Deposit Pending':
      case 'Awaiting Payment Verification':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-200',
          dot: 'bg-amber-500'
        };
      case 'Approved':
      case 'Confirmed':
      case 'Checked In':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500'
        };
      case 'Checked Out':
        return {
          bg: 'bg-blue-100 text-blue-800 border-blue-200',
          dot: 'bg-blue-500'
        };
      case 'Cancelled':
      case 'Rejected':
      case 'Refunded':
      case 'No Show':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-200',
          dot: 'bg-rose-500'
        };
      default:
        return {
          bg: 'bg-neutral-100 text-neutral-800 border-neutral-200',
          dot: 'bg-neutral-500'
        };
    }
  };

  return (
    <div className="pt-20 pb-16 min-h-screen bg-neutral-50 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Unified Dual-Tab Switcher */}
        <TrackingTabsHeader activeTab="reservation" />

        {/* Header Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight flex items-center justify-center gap-2">
            <Hotel className="w-8 h-8 text-neutral-800" />
            Track Room Reservation
          </h1>
          <p className="text-sm text-neutral-600 max-w-xl mx-auto">
            View live status, check-in dates, payment verification, and stay details.
          </p>
        </div>

        {/* Automatically Caught Recent Reservations Pills / Selector */}
        {recentList.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Recent Reservations ({recentList.length})
              </span>
              <span className="text-[11px] text-neutral-400">Click any card to auto-load</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {recentList.map((rec) => {
                const isSelected = activeCode === rec.code;
                const badge = getStatusBadge(rec.status as Booking['status'] || 'Pending');

                return (
                  <div
                    key={rec.code}
                    onClick={() => handleSelectRecent(rec)}
                    className={`cursor-pointer p-3 rounded-xl border transition-all text-left relative flex flex-col justify-between group ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-900/5 ring-1 ring-neutral-900 shadow-xs'
                        : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-mono font-bold text-xs text-neutral-900">
                        {rec.code}
                      </span>
                      <button
                        onClick={(e) => handleRemoveRecent(e, rec.code)}
                        className="text-neutral-400 hover:text-rose-600 p-0.5 rounded transition opacity-0 group-hover:opacity-100"
                        title="Remove from recent list"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-xs text-neutral-600 space-y-0.5 mb-2">
                      {rec.guestName && <p className="font-medium text-neutral-900 truncate">{rec.guestName}</p>}
                      {rec.checkIn && (
                        <p className="text-[11px] text-neutral-500">
                          {format(rec.checkIn, 'MMM d')} - {rec.checkOut ? format(rec.checkOut, 'MMM d, yyyy') : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-neutral-100 text-[11px]">
                      <span className={`px-2 py-0.5 rounded-full font-bold border text-[10px] flex items-center gap-1 ${badge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {rec.status || 'Pending'}
                      </span>
                      {Boolean(rec.totalAmount) && (
                        <span className="font-bold text-neutral-900">{rec.totalAmount?.toLocaleString()} ETB</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="relative flex items-center shadow-xs rounded-xl overflow-hidden border border-neutral-200 focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900 transition-all bg-white">
            <Search className="absolute left-4 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by code (e.g. WH-K928XQ)..."
              className="w-full pl-12 pr-28 py-3.5 border-none focus:ring-0 text-sm uppercase font-mono tracking-wide"
            />
            <button
              type="submit"
              disabled={loading || !searchTerm.trim()}
              className="absolute right-2 px-5 py-2 bg-neutral-900 text-white text-xs font-bold rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Track'}
            </button>
          </div>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-center text-sm font-medium">
            {error}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
          </div>
        )}

        {/* Searched & Not Found */}
        {searched && !loading && !error && !booking && (
          <div className="text-center text-neutral-500 py-12 bg-white rounded-2xl border border-neutral-200 p-8">
            <Hotel className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-600 font-medium">No reservation found matching this code.</p>
            <p className="text-xs text-neutral-400 mt-1">Please ensure you entered the exact reservation code from your booking confirmation.</p>
          </div>
        )}

        {/* Active Booking Card */}
        {booking && (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden space-y-0">
            {/* Card Header */}
            <div className="p-6 sm:p-7 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900 text-white">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Reservation Code</span>
                  <span className="text-neutral-400">•</span>
                  <span className="text-xs text-neutral-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" /> Live Updates
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black font-mono tracking-wider">{booking.reservationCode}</h2>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`px-4 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 ${getStatusBadge(booking.status).bg}`}>
                  <div className={`w-2 h-2 rounded-full ${getStatusBadge(booking.status).dot}`} />
                  {booking.status}
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Guest & Stay Details */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Guest Information</h3>
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-2">
                    <p className="font-bold text-base text-neutral-900">{booking.guestDetails?.firstName} {booking.guestDetails?.lastName}</p>
                    {booking.guestDetails?.email && (
                      <p className="text-xs text-neutral-600 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-neutral-400" /> {booking.guestDetails.email}
                      </p>
                    )}
                    {booking.guestDetails?.phone && (
                      <p className="text-xs text-neutral-600 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-neutral-400" /> {booking.guestDetails.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Stay & Room Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                      <div className="w-9 h-9 rounded-lg bg-neutral-200 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4 text-neutral-700" />
                      </div>
                      <div>
                        <p className="text-[11px] text-neutral-500 font-medium">Check-In / Check-Out</p>
                        <p className="text-xs font-bold text-neutral-900">
                          {format(booking.checkIn, 'EEE, MMM d, yyyy')} → {format(booking.checkOut, 'EEE, MMM d, yyyy')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                      <div className="w-9 h-9 rounded-lg bg-neutral-200 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-neutral-700" />
                      </div>
                      <div>
                        <p className="text-[11px] text-neutral-500 font-medium">Guests & Capacity</p>
                        <p className="text-xs font-bold text-neutral-900">{booking.numberOfGuests} Guests</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Summary & Status Notes */}
              <div className="space-y-6">
                <div className="p-5 bg-neutral-50 rounded-xl border border-neutral-100 space-y-3">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Financial & Payment Details</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-neutral-600">
                      <span>Total Booking Amount</span>
                      <span className="font-bold text-neutral-900 text-sm">ETB {booking.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Payment Method</span>
                      <span className="font-semibold text-neutral-900">{booking.paymentMethod}</span>
                    </div>
                    {booking.transactionId && (
                      <div className="flex justify-between text-neutral-600">
                        <span>Transaction Reference</span>
                        <span className="font-mono text-neutral-900 font-bold">{booking.transactionId}</span>
                      </div>
                    )}
                  </div>
                  
                  {booking.paymentProofUrl && (
                    <div className="mt-3 pt-3 border-t border-neutral-200">
                      <a 
                        href={booking.paymentProofUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
                      >
                        View Uploaded Receipt <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Status-specific Callouts */}
                {['Pending', 'Awaiting Payment Verification', 'Deposit Pending'].includes(booking.status) && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1.5 shrink-0 animate-ping" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">Verification in Progress</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Our reception team is currently reviewing your reservation request and payment slip. You will receive real-time updates right here.
                      </p>
                    </div>
                  </div>
                )}
                
                {['Approved', 'Confirmed', 'Checked In'].includes(booking.status) && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-900">Reservation Approved & Confirmed</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Your room is reserved and ready for your arrival. We look forward to welcoming you!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Activity Timeline */}
            {booking.timeline && booking.timeline.length > 0 && (
              <div className="p-6 sm:p-8 bg-neutral-50 border-t border-neutral-100">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neutral-600" /> Activity Timeline
                </h3>
                <div className="space-y-4">
                  {booking.timeline.slice().reverse().map((event, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="relative flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 z-10" />
                        {idx !== booking.timeline!.length - 1 && (
                          <div className="w-0.5 h-full bg-neutral-200 absolute top-2.5" />
                        )}
                      </div>
                      <div className="-mt-1 pb-3">
                        <p className="text-xs font-bold text-neutral-900">{event.status}</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">{format(event.timestamp, 'MMM d, yyyy h:mm a')}</p>
                        {event.notes && <p className="text-xs text-neutral-600 mt-1 italic">{event.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
