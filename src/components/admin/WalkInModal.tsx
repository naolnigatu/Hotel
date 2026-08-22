import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, where, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { Booking, RoomCategory, Room, ReservationTimelineEvent } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { cleanFirestoreData } from '../../lib/firestoreUtils';
import { X, Loader2, Calendar, User, Phone, Mail, DollarSign, CheckCircle2, ShieldAlert } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface WalkInModalProps {
  categories: Record<string, RoomCategory>;
  rooms: Room[];
  existingBookings: Booking[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function WalkInModal({ categories, rooms, existingBookings, onClose, onSuccess }: WalkInModalProps) {
  const { userData } = useAuth();
  
  const [bookingSource, setBookingSource] = useState<'Walk-in' | 'Phone' | 'Government/VIP'>('Walk-in');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isVip, setIsVip] = useState(false);

  // Search returning guests
  const [returningGuestQuery, setReturningGuestQuery] = useState('');
  const [matchingGuests, setMatchingGuests] = useState<{ firstName: string; lastName: string; email: string; phone: string }[]>([]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);
  const [guestsCount, setGuestsCount] = useState(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(Object.keys(categories)[0] || '');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'POS' | 'Card' | 'Bank Transfer' | 'Pay at Hotel'>('Cash');
  const [initialStatus, setInitialStatus] = useState<'Approved' | 'Checked In' | 'Pending'>('Approved');
  const [specialRequests, setSpecialRequests] = useState('');
  const [internalNote, setInternalNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter returning guests based on existing bookings
  useEffect(() => {
    if (!returningGuestQuery || returningGuestQuery.length < 2) {
      setMatchingGuests([]);
      return;
    }
    const q = returningGuestQuery.toLowerCase();
    const guestMap = new Map<string, { firstName: string; lastName: string; email: string; phone: string }>();

    existingBookings.forEach(b => {
      const g = b.guestDetails;
      if (
        g.firstName.toLowerCase().includes(q) ||
        g.lastName.toLowerCase().includes(q) ||
        g.phone.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q)
      ) {
        const key = `${g.phone}_${g.email}`;
        if (!guestMap.has(key)) {
          guestMap.set(key, g);
        }
      }
    });

    setMatchingGuests(Array.from(guestMap.values()).slice(0, 5));
  }, [returningGuestQuery, existingBookings]);

  const selectReturningGuest = (g: { firstName: string; lastName: string; email: string; phone: string }) => {
    setFirstName(g.firstName);
    setLastName(g.lastName);
    setEmail(g.email);
    setPhone(g.phone);
    setReturningGuestQuery('');
    setMatchingGuests([]);
  };

  // Compute available rooms for selected category and dates
  const getAvailableRooms = () => {
    if (!selectedCategoryId || !checkInDate || !checkOutDate) return [];

    const startTs = new Date(`${checkInDate}T00:00:00`).getTime();
    const endTs = new Date(`${checkOutDate}T00:00:00`).getTime();

    const overlappingBookings = existingBookings.filter(b => 
      b.categoryId === selectedCategoryId &&
      b.roomId &&
      !['Cancelled', 'Rejected', 'Refunded'].includes(b.status) &&
      b.checkIn < endTs && 
      b.checkOut > startTs
    );
    const occupiedRoomIds = overlappingBookings.map(b => b.roomId);

    const unreadyConditions = [
      'Dirty', 'Needs Cleaning', 'Cleaning In Progress', 'Cleaning', 
      'Awaiting Inspection', 'Inspection Required', 'Maintenance Required', 'Out of Service'
    ];

    return rooms.filter(r => 
      r.categoryId === selectedCategoryId && 
      r.status !== 'Out of Service' &&
      !unreadyConditions.includes(r.condition) &&
      !occupiedRoomIds.includes(r.id)
    );
  };

  const availableRooms = getAvailableRooms();

  // Calculate total nights and total amount
  const startTs = new Date(`${checkInDate}T00:00:00`).getTime();
  const endTs = new Date(`${checkOutDate}T00:00:00`).getTime();
  const nights = Math.max(1, Math.ceil((endTs - startTs) / (1000 * 60 * 60 * 24)));
  const basePrice = categories[selectedCategoryId]?.basePrice || 0;
  const totalAmount = nights * basePrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName || !lastName || !phone) {
      setError('Please fill in Guest First Name, Last Name, and Phone Number.');
      return;
    }

    if (endTs <= startTs) {
      setError('Check-out date must be after Check-in date.');
      return;
    }

    // Validation: Require room assignment if checking in immediately
    if (initialStatus === 'Checked In' && !selectedRoomId) {
      setError('You must assign a room before checking in the guest.');
      return;
    }

    // Validation: Check for duplicate/overlapping active booking for same room
    if (selectedRoomId) {
      const hasOverlap = existingBookings.some(b => 
        b.roomId === selectedRoomId &&
        !['Cancelled', 'Rejected', 'Refunded'].includes(b.status) &&
        b.checkIn < endTs && 
        b.checkOut > startTs
      );
      if (hasOverlap) {
        setError('The selected room is already booked for these dates.');
        return;
      }
    }

    setLoading(true);

    try {
      const id = `booking_${Date.now()}`;
      const code = `WH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const timeline: ReservationTimelineEvent[] = [
        {
          status: 'Created',
          timestamp: Date.now(),
          userId: userData?.uid,
          userName: userData?.name || 'Reception',
          notes: `Created via Reception (${bookingSource})`
        }
      ];

      if (selectedRoomId) {
        const roomObj = rooms.find(r => r.id === selectedRoomId);
        timeline.push({
          status: 'Room Assigned',
          timestamp: Date.now(),
          userId: userData?.uid,
          userName: userData?.name || 'Reception',
          notes: `Assigned room ${roomObj?.roomNumber || selectedRoomId}`
        });
      }

      if (initialStatus === 'Checked In') {
        timeline.push({
          status: 'Guest Checked In',
          timestamp: Date.now(),
          userId: userData?.uid,
          userName: userData?.name || 'Reception',
          notes: 'Guest checked in at walk-in registration'
        });
      }

      const notesArr = internalNote ? [{
        id: `note_${Date.now()}`,
        userId: userData?.uid || 'staff',
        userName: userData?.name || 'Reception',
        content: internalNote,
        createdAt: Date.now()
      }] : [];

      const newBooking: Booking = cleanFirestoreData({
        id,
        reservationCode: code,
        type: 'room',
        guestId: null,
        guestDetails: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || `${phone.replace(/\D/g, '')}@guest.wolisohotel.com`,
          phone: phone.trim()
        },
        categoryId: selectedCategoryId,
        roomId: selectedRoomId || '',
        numberOfGuests: Number(guestsCount),
        specialRequests: specialRequests.trim() || '',
        isVip,
        bookingSource,
        checkIn: startTs,
        checkOut: endTs,
        status: initialStatus,
        totalAmount,
        paymentMethod,
        timeline,
        notes: notesArr,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const bookingRef = doc(db, 'bookings', id);

      if (initialStatus === 'Checked In' && selectedRoomId) {
        const roomRef = doc(db, 'rooms', selectedRoomId);
        await runTransaction(db, async (transaction) => {
          const roomDoc = await transaction.get(roomRef);
          if (!roomDoc.exists() || roomDoc.data().status === 'Occupied') {
            throw new Error('This room was just occupied by another staff member. Please select another room.');
          }
          
          transaction.set(bookingRef, newBooking);
          transaction.update(roomRef, { status: 'Occupied' });
        });
      } else {
        await setDoc(bookingRef, newBooking);
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error creating walk-in reservation:', err);
      setError(err?.message || 'Failed to create reservation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-neutral-900 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">New Manual Reservation</h2>
            <p className="text-xs text-neutral-400">Walk-in, Phone & VIP Bookings</p>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Booking Source Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Booking Source</label>
            <div className="grid grid-cols-3 gap-3">
              {(['Walk-in', 'Phone', 'Government/VIP'] as const).map(source => (
                <button
                  type="button"
                  key={source}
                  onClick={() => {
                    setBookingSource(source);
                    if (source === 'Government/VIP') setIsVip(true);
                  }}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    bookingSource === source 
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm' 
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  {source}
                </button>
              ))}
            </div>
          </div>

          {/* Search Returning Guest */}
          <div className="relative bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Search Returning Guest (Optional)
            </label>
            <input
              type="text"
              placeholder="Type guest name or phone number..."
              value={returningGuestQuery}
              onChange={e => setReturningGuestQuery(e.target.value)}
              className="w-full text-sm p-2 border border-neutral-300 rounded-lg bg-white"
            />
            {matchingGuests.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg z-20 overflow-hidden divide-y">
                {matchingGuests.map((g, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => selectReturningGuest(g)}
                    className="w-full text-left p-3 hover:bg-neutral-50 text-xs flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-neutral-900">{g.firstName} {g.lastName}</p>
                      <p className="text-neutral-500">{g.phone} • {g.email}</p>
                    </div>
                    <span className="text-blue-600 font-medium">Select</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Guest Information */}
          <div>
            <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-neutral-500" /> Guest Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm"
                  placeholder="Abebe"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm"
                  placeholder="Bikila"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm"
                  placeholder="+251 91 123 4567"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm"
                  placeholder="abebe@example.com"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="isVipCheck"
                checked={isVip}
                onChange={e => setIsVip(e.target.checked)}
                className="w-4 h-4 text-neutral-900 rounded"
              />
              <label htmlFor="isVipCheck" className="text-xs font-bold text-amber-700 cursor-pointer">
                Mark as VIP Guest / Government Booking
              </label>
            </div>
          </div>

          {/* Dates & Category */}
          <div>
            <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neutral-500" /> Stay Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Check-In Date</label>
                <input
                  type="date"
                  required
                  value={checkInDate}
                  onChange={e => setCheckInDate(e.target.value)}
                  className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Check-Out Date</label>
                <input
                  type="date"
                  required
                  value={checkOutDate}
                  onChange={e => setCheckOutDate(e.target.value)}
                  className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Guests</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={guestsCount || ''}
                  onChange={e => setGuestsCount(parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {/* Room Category & Room Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Room Category *</label>
              <select
                value={selectedCategoryId}
                onChange={e => {
                  setSelectedCategoryId(e.target.value);
                  setSelectedRoomId('');
                }}
                className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm"
              >
                {(Object.values(categories) as RoomCategory[]).map((cat: RoomCategory) => (
                  <option key={cat.id} value={cat.id}>{cat.name} ({cat.basePrice} ETB/night)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Assign Room ({availableRooms.length} available)
              </label>
              <select
                value={selectedRoomId}
                onChange={e => setSelectedRoomId(e.target.value)}
                className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm"
              >
                <option value="">-- Assign Later --</option>
                {availableRooms.map(r => (
                  <option key={r.id} value={r.id}>
                    Room {r.roomNumber} ({r.condition || r.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing & Payment Method & Initial Status */}
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-4">
            <div className="flex justify-between items-center text-sm font-bold text-neutral-900 border-b border-neutral-200 pb-2">
              <span>Total Estimated Amount ({nights} night{nights > 1 ? 's' : ''})</span>
              <span className="text-lg text-green-700">{totalAmount.toLocaleString()} ETB</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full p-2 border border-neutral-300 rounded-lg text-sm bg-white"
                >
                  <option value="Cash">Cash at Front Desk</option>
                  <option value="POS">POS Terminal Card</option>
                  <option value="Card">Online Credit Card</option>
                  <option value="Bank Transfer">Bank Transfer (Telebirr/CBE)</option>
                  <option value="Pay at Hotel">Pay at Hotel</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Initial Reservation Status</label>
                <select
                  value={initialStatus}
                  onChange={e => setInitialStatus(e.target.value as any)}
                  className="w-full p-2 border border-neutral-300 rounded-lg text-sm bg-white font-medium"
                >
                  <option value="Approved">Approved (Reserved)</option>
                  <option value="Checked In">Check-In Immediately</option>
                  <option value="Pending">Pending (Hold)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Special Requests & Staff Internal Note */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Special Requests (Guest)</label>
              <input
                type="text"
                value={specialRequests}
                onChange={e => setSpecialRequests(e.target.value)}
                placeholder="e.g., Quiet room, late check-in..."
                className="w-full p-2 border border-neutral-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Internal Staff Note (Private)</label>
              <input
                type="text"
                value={internalNote}
                onChange={e => setInternalNote(e.target.value)}
                placeholder="e.g., Guest paid cash, verified ID passport #..."
                className="w-full p-2 border border-neutral-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Create Reservation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
