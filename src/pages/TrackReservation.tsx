import React, { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Loader2, Calendar, Users, Hotel, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Booking } from '../types';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function TrackReservation() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError('');
    setBooking(null);
    setSearched(true);

    try {
      const q = query(collection(db, 'bookings'), where('reservationCode', '==', searchTerm.trim().toUpperCase()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError('No reservation found with that ID. Please check the ID and try again.');
      } else {
        const data = snap.docs[0].data() as Booking;
        setBooking({ ...data, id: snap.docs[0].id });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch reservation details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'Pending':
      case 'Awaiting Payment Verification':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Confirmed':
      case 'Checked In':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Checked Out':
      case 'Completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Cancelled':
      case 'Rejected':
      case 'Refunded':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  return (
    <div className="pt-24 pb-16 min-h-screen bg-neutral-50 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-neutral-900 mb-4">Track Your Reservation</h1>
          <p className="text-neutral-600 max-w-xl mx-auto">
            Enter your Reservation ID (e.g., WH-XFY38Q) to check the current status of your booking.
          </p>
        </div>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative flex items-center max-w-xl mx-auto shadow-sm rounded-xl overflow-hidden border border-neutral-200 focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900 transition-all bg-white">
            <Search className="absolute left-4 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Reservation ID (e.g. WH-...)"
              className="w-full pl-12 pr-32 py-4 border-none focus:ring-0 text-lg uppercase"
            />
            <button
              type="submit"
              disabled={loading || !searchTerm.trim()}
              className="absolute right-2 px-6 py-2.5 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Track'}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-center">
            {error}
          </div>
        )}

        {searched && !loading && !error && !booking && (
          <div className="text-center text-neutral-500 py-12">
            No results to display.
          </div>
        )}

        {booking && (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-500 font-medium mb-1">Reservation ID</p>
                <h2 className="text-2xl font-bold text-neutral-900 font-mono tracking-tight">{booking.reservationCode}</h2>
              </div>
              <div className={`px-4 py-1.5 rounded-full border text-sm font-bold flex items-center gap-1.5 w-fit ${getStatusColor(booking.status)}`}>
                <div className="w-2 h-2 rounded-full bg-current opacity-75" />
                {booking.status}
              </div>
            </div>

            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">Guest Details</h3>
                  <div className="space-y-2 text-neutral-900">
                    <p className="font-medium text-lg">{booking.guestDetails?.firstName} {booking.guestDetails?.lastName}</p>
                    {booking.guestDetails?.email && <p className="text-neutral-600 text-sm">{booking.guestDetails.email}</p>}
                    {booking.guestDetails?.phone && <p className="text-neutral-600 text-sm">{booking.guestDetails.phone}</p>}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">Stay Details</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-neutral-700">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-neutral-600" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500">Dates</p>
                        <p className="font-medium">{format(booking.checkIn, 'MMM d, yyyy')} - {format(booking.checkOut, 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-neutral-700">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-neutral-600" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500">Guests</p>
                        <p className="font-medium">{booking.numberOfGuests} Guests</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-5 bg-neutral-50 rounded-xl border border-neutral-100">
                  <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">Payment Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-neutral-600">
                      <span>Total Amount</span>
                      <span className="font-medium text-neutral-900">ETB {booking.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-neutral-600">
                      <span>Payment Method</span>
                      <span className="font-medium text-neutral-900">{booking.paymentMethod}</span>
                    </div>
                    {booking.transactionId && (
                      <div className="flex justify-between text-sm text-neutral-600">
                        <span>Transaction ID</span>
                        <span className="font-mono text-neutral-900">{booking.transactionId}</span>
                      </div>
                    )}
                  </div>
                  
                  {booking.paymentProofUrl && (
                    <div className="mt-4 pt-4 border-t border-neutral-200">
                      <a 
                        href={booking.paymentProofUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
                      >
                        View Uploaded Receipt <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>

                {booking.status === 'Awaiting Payment Verification' && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0 animate-pulse" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Verification in Progress</p>
                      <p className="text-xs text-amber-700 mt-1">Our staff is currently verifying your payment. Your booking will be confirmed shortly.</p>
                    </div>
                  </div>
                )}
                
                {booking.status === 'Confirmed' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">Booking Confirmed</p>
                      <p className="text-xs text-emerald-700 mt-1">Your reservation is fully confirmed. We look forward to hosting you!</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {booking.timeline && booking.timeline.length > 0 && (
              <div className="p-6 sm:p-8 bg-neutral-50 border-t border-neutral-100">
                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">Activity Timeline</h3>
                <div className="space-y-4">
                  {booking.timeline.slice().reverse().map((event, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="relative flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-neutral-400 z-10" />
                        {idx !== booking.timeline!.length - 1 && (
                          <div className="w-0.5 h-full bg-neutral-200 absolute top-2.5" />
                        )}
                      </div>
                      <div className="-mt-1.5 pb-4">
                        <p className="text-sm font-medium text-neutral-900">{event.status}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{format(event.timestamp, 'MMM d, yyyy h:mm a')}</p>
                        {event.notes && <p className="text-sm text-neutral-600 mt-1">{event.notes}</p>}
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
