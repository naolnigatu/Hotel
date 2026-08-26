import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, getDocs, where, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { Booking, RoomCategory, Room, BookingStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { 
  Loader2, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Eye, 
  LogIn, 
  LogOut, 
  FileText, 
  Users, 
  Plus, 
  Calendar as CalendarIcon, 
  UserCheck, 
  Sparkles, 
  Wrench, 
  Building2, 
  CreditCard, 
  Clock, 
  ArrowUpDown, 
  Award,
  Send,
  ShieldCheck,
  User,
  X
} from 'lucide-react';
import { format, isToday } from 'date-fns';

import ReservationCalendar from './ReservationCalendar';
import WalkInModal from '../../components/admin/WalkInModal';
import GuestProfileModal from '../../components/admin/GuestProfileModal';
import CopyButton from '../../components/common/CopyButton';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

import { sendNotification } from '../../lib/notificationService';

export default function AdminReservations() {
  const { userData } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [categories, setCategories] = useState<Record<string, RoomCategory>>({});
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Modes: 'list' | 'calendar' | 'guest-directory'
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'guest-directory'>('list');

  // Filters
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<'checkIn' | 'createdAt' | 'guestName' | 'totalAmount'>('createdAt');

  // Modals
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [selectedGuestProfile, setSelectedGuestProfile] = useState<{ phone: string; email: string; name: string } | null>(null);
  const [previewPaymentImage, setPreviewPaymentImage] = useState<string | null>(null);

  // Lock body scroll if any reservation modal or lightboxes are open
  useBodyScrollLock(!!selectedBooking || showWalkInModal || !!selectedGuestProfile || !!previewPaymentImage);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [roomToAssign, setRoomToAssign] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [newStaffNote, setNewStaffNote] = useState('');

  // Setup Firestore real-time listeners for live KPI updates
  useEffect(() => {
    let unsubscribeBookings = () => {};
    let unsubscribeRooms = () => {};

    const setupListeners = async () => {
      try {
        // Categories fetch once
        const catsSnap = await getDocs(collection(db, 'room_categories'));
        const catsMap: Record<string, RoomCategory> = {};
        catsSnap.forEach(d => { catsMap[d.id] = { id: d.id, ...d.data() } as RoomCategory; });
        setCategories(catsMap);

        // Real-time bookings listener
        const bookingsQ = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
        unsubscribeBookings = onSnapshot(bookingsQ, (snap) => {
          const list = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Booking))
            .filter(b => b.type === 'room' || !b.type); // Fallback if type is missing on old records
          setBookings(list);
          setLoading(false);
        }, (err) => {
          console.error("Bookings listener error:", err);
          setLoading(false);
        });

        // Real-time rooms listener
        unsubscribeRooms = onSnapshot(collection(db, 'rooms'), (snap) => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Room));
          setRooms(list);
        }, (err) => {
          console.error("Rooms listener error:", err);
        });

      } catch (error) {
        console.error("Error setting up listeners:", error);
        setLoading(false);
      }
    };

    setupListeners();

    return () => {
      unsubscribeBookings();
      unsubscribeRooms();
    };
  }, []);

  // Update booking status with full validation & audit trail
  const updateBookingStatus = async (id: string, newStatus: BookingStatus, actionNote: string) => {
    setActionLoading(true);
    try {
      const booking = bookings.find(b => b.id === id);
      if (!booking) return;

      // Lifecycle Validations
      if (newStatus === 'Checked In') {
        if (!booking.roomId) {
          alert('Cannot Check In: Please assign a room to this booking first.');
          setActionLoading(false);
          return;
        }
        if (booking.status === 'Checked In') {
          alert('Guest is already checked in.');
          setActionLoading(false);
          return;
        }

        const assignedRoom = rooms.find(r => r.id === booking.roomId);
        const unreadyConditions = [
          'Dirty', 'Needs Cleaning', 'Cleaning In Progress', 'Cleaning', 
          'Awaiting Inspection', 'Inspection Required', 'Maintenance Required', 'Out of Service'
        ];
        if (assignedRoom && unreadyConditions.includes(assignedRoom.condition)) {
          alert(`Cannot Check In: Room ${assignedRoom.roomNumber} is currently "${assignedRoom.condition}". Housekeeping must inspect & mark it Clean & Ready before check-in.`);
          setActionLoading(false);
          return;
        }
      }

      if (newStatus === 'Checked Out') {
        if (booking.status !== 'Checked In') {
          alert('Cannot Check Out: Guest is not currently checked in.');
          setActionLoading(false);
          return;
        }
      }

      if (newStatus === 'Cancelled') {
        if (booking.status === 'Checked Out') {
          alert('Cannot cancel a reservation that is already checked out.');
          setActionLoading(false);
          return;
        }
      }

      const timelineEvent = {
        status: newStatus as any,
        timestamp: Date.now(),
        userId: userData?.uid,
        userName: userData?.name || 'Reception Staff',
        notes: actionNote
      };

      const updatedTimeline = [...(booking.timeline || []), timelineEvent];
      const bookingRef = doc(db, 'bookings', id);

      if (newStatus === 'Checked In' && booking.roomId) {
        // Atomic check-in and room occupation
        await runTransaction(db, async (transaction) => {
          const roomRef = doc(db, 'rooms', booking.roomId!);
          const roomDoc = await transaction.get(roomRef);
          if (!roomDoc.exists() || roomDoc.data().status === 'Occupied') {
            throw new Error(`Room ${booking.roomId} is already occupied. Please assign a different room before checking in.`);
          }
          
          transaction.update(roomRef, { status: 'Occupied' });
          transaction.update(bookingRef, {
            status: newStatus,
            timeline: updatedTimeline,
            updatedAt: Date.now()
          });
        });
      } else {
        // Normal update for other statuses
        await updateDoc(bookingRef, {
          status: newStatus,
          timeline: updatedTimeline,
          updatedAt: Date.now()
        });

        // Update Room status/condition on checkout/cancel
        if (booking.roomId && ['Checked Out', 'Cancelled', 'No Show'].includes(newStatus)) {
          await updateDoc(doc(db, 'rooms', booking.roomId), { 
            status: 'Available', 
            condition: newStatus === 'Checked Out' ? 'Needs Cleaning' : 'Clean' 
          });
        }
      }

      // Trigger Housekeeping notification on Guest Checkout
      if (newStatus === 'Checked Out' && booking.roomId) {
        const roomObj = rooms.find(r => r.id === booking.roomId);
        const roomNum = roomObj ? roomObj.roomNumber : 'assigned room';
        await sendNotification({
          recipientRole: 'housekeeping',
          title: `Room ${roomNum} Checked Out`,
          message: `Guest checked out of Room ${roomNum}. Room condition is now "Needs Cleaning".`,
          type: 'housekeeping',
          relatedEntityId: booking.roomId,
          relatedEntityType: 'housekeeping_task',
          targetRoute: '/admin/housekeeping',
          priority: 'Important',
          eventId: `hk_checkout_${booking.roomId}_${Date.now()}`
        });
      }

      // Trigger notification for guest if guest user ID exists
      if (booking.guestId) {
        await sendNotification({
          recipientUid: booking.guestId,
          title: `Reservation ${newStatus}`,
          message: `Your reservation ${booking.reservationCode} status is now: ${newStatus}.`,
          type: 'reservation',
          relatedEntityId: booking.id,
          relatedEntityType: 'booking',
          priority: newStatus === 'Approved' ? 'Important' : 'Normal',
          eventId: `res_status_${booking.reservationCode}_${newStatus}`
        });

        if (newStatus === 'Checked Out') {
          await sendNotification({
            recipientUid: booking.guestId,
            title: `How was your stay?`,
            message: `Thank you for staying with us! Please share your experience and leave a testimonial.`,
            type: 'system',
            targetRoute: `/testimonials/new?source=booking&id=${booking.id}`,
            priority: 'Normal',
            eventId: `testim_prompt_book_${booking.id}`
          });
        }
      }

      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking({
          ...selectedBooking,
          status: newStatus,
          timeline: updatedTimeline
        });
      }

      setShowRejectInput(false);
      setRejectReason('');
    } catch (err) {
      console.error('Error updating booking status:', err);
      alert('Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Assign or Reassign Room with overlap checks
  const assignRoom = async (id: string) => {
    if (!roomToAssign) {
      alert("Please select a room to assign.");
      return;
    }
    setActionLoading(true);
    try {
      const booking = bookings.find(b => b.id === id);
      if (!booking) return;

      // Re-verify room is still available for these dates
      const bookingsQ = query(collection(db, 'bookings'), where('roomId', '==', roomToAssign));
      const bookingsSnap = await getDocs(bookingsQ);
      
      let hasOverlap = false;
      bookingsSnap.forEach(d => {
        const b = d.data() as Booking;
        if (b.id === id) return;
        if (['Cancelled', 'Rejected', 'Refunded'].includes(b.status)) return;
        if (b.checkIn < booking.checkOut && b.checkOut > booking.checkIn) {
          hasOverlap = true;
        }
      });

      if (hasOverlap) {
        alert("This room is already booked for an overlapping reservation. Please select a different room.");
        setActionLoading(false);
        return;
      }

      const roomObj = rooms.find(r => r.id === roomToAssign);
      const unreadyConditions = [
        'Dirty', 'Needs Cleaning', 'Cleaning In Progress', 'Cleaning', 
        'Awaiting Inspection', 'Inspection Required', 'Maintenance Required', 'Out of Service'
      ];
      if (roomObj && unreadyConditions.includes(roomObj.condition)) {
        alert(`Cannot Assign Room: Room ${roomObj.roomNumber} is currently "${roomObj.condition}". Housekeeping must inspect & mark it Clean & Ready before assignment.`);
        setActionLoading(false);
        return;
      }

      const isReassign = Boolean(booking.roomId);

      const timelineEvent = {
        status: (isReassign ? 'Room Reassigned' : 'Room Assigned') as any,
        timestamp: Date.now(),
        userId: userData?.uid,
        userName: userData?.name || 'Reception Staff',
        notes: `Assigned Room ${roomObj?.roomNumber || roomToAssign}`
      };

      const updatedTimeline = [...(booking.timeline || []), timelineEvent];

      const bookingRef = doc(db, 'bookings', id);
      const newRoomRef = doc(db, 'rooms', roomToAssign);
      const oldRoomRef = (isReassign && booking.roomId) ? doc(db, 'rooms', booking.roomId) : null;

      await runTransaction(db, async (transaction) => {
        // If the booking is checked in, we are moving the guest right now, so we must atomically check and claim the new room.
        if (booking.status === 'Checked In') {
          const newRoomDoc = await transaction.get(newRoomRef);
          if (!newRoomDoc.exists() || newRoomDoc.data().status === 'Occupied') {
            throw new Error('The target room is already occupied. Please select a different room.');
          }

          if (isReassign && oldRoomRef) {
            transaction.update(oldRoomRef, { status: 'Available', condition: 'Needs Cleaning' });
          }
          transaction.update(newRoomRef, { status: 'Occupied' });
        }

        transaction.update(bookingRef, {
          roomId: roomToAssign,
          timeline: updatedTimeline,
          updatedAt: Date.now()
        });
      });

      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking({ 
          ...selectedBooking, 
          roomId: roomToAssign, 
          timeline: updatedTimeline 
        });
      }

      setRoomToAssign('');
    } catch (err) {
      console.error("Error assigning room:", err);
      alert('Failed to assign room.');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Internal Staff Note (Never visible to guests)
  const handleAddStaffNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !newStaffNote.trim()) return;

    setActionLoading(true);
    try {
      const noteObj = {
        id: `note_${Date.now()}`,
        userId: userData?.uid || 'staff',
        userName: userData?.name || 'Reception Staff',
        content: newStaffNote.trim(),
        createdAt: Date.now()
      };

      const updatedNotes = [...(selectedBooking.notes || []), noteObj];
      const updatedTimeline = [
        ...(selectedBooking.timeline || []),
        {
          status: 'Note Added' as const,
          timestamp: Date.now(),
          userId: userData?.uid,
          userName: userData?.name || 'Reception Staff',
          notes: `Staff note added: ${newStaffNote.trim()}`
        }
      ];

      await updateDoc(doc(db, 'bookings', selectedBooking.id), {
        notes: updatedNotes,
        timeline: updatedTimeline,
        updatedAt: Date.now()
      });

      setSelectedBooking({
        ...selectedBooking,
        notes: updatedNotes,
        timeline: updatedTimeline
      });

      setNewStaffNote('');
    } catch (err) {
      console.error("Error adding staff note:", err);
      alert("Failed to add note.");
    } finally {
      setActionLoading(false);
    }
  };

  // KPI Calculations
  const arrivalsToday = bookings.filter(b => isToday(b.checkIn) && ['Approved', 'Checked In'].includes(b.status)).length;
  const departuresToday = bookings.filter(b => isToday(b.checkOut) && ['Checked In'].includes(b.status)).length;
  const currentGuestsCount = bookings.filter(b => b.status === 'Checked In').length;
  const pendingApprovals = bookings.filter(b => b.status === 'Pending').length;
  const pendingVerifications = bookings.filter(b => b.status === 'Awaiting Payment Verification').length;
  const availableRoomsCount = rooms.filter(r => r.status === 'Available').length;
  const occupiedRoomsCount = rooms.filter(r => r.status === 'Occupied').length;
  const cleaningRoomsCount = rooms.filter(r => ['Dirty', 'Needs Cleaning', 'Cleaning'].includes(r.condition)).length;
  const maintenanceRoomsCount = rooms.filter(r => r.condition === 'Maintenance Required' || r.status === 'Out of Service').length;

  // Filtered and Sorted Bookings
  const filteredBookings = bookings.filter(b => {
    const q = search.toLowerCase();
    const assignedRoomNumber = b.roomId ? rooms.find(r => r.id === b.roomId)?.roomNumber || '' : '';
    
    const matchesSearch = 
      b.reservationCode.toLowerCase().includes(q) ||
      b.guestDetails.firstName.toLowerCase().includes(q) ||
      b.guestDetails.lastName.toLowerCase().includes(q) ||
      b.guestDetails.phone.toLowerCase().includes(q) ||
      b.guestDetails.email.toLowerCase().includes(q) ||
      assignedRoomNumber.toLowerCase().includes(q);

    const matchesStatus = statusTab === 'All' || b.status === statusTab;
    const matchesCategory = categoryFilter === 'All' || b.categoryId === categoryFilter;

    let matchesDateRange = true;
    if (dateFrom) {
      const fromTs = new Date(`${dateFrom}T00:00:00`).getTime();
      if (b.checkIn < fromTs) matchesDateRange = false;
    }
    if (dateTo) {
      const toTs = new Date(`${dateTo}T23:59:59`).getTime();
      if (b.checkIn > toTs) matchesDateRange = false;
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesDateRange;
  }).sort((a, b) => {
    if (sortBy === 'checkIn') return a.checkIn - b.checkIn;
    if (sortBy === 'guestName') return a.guestDetails.lastName.localeCompare(b.guestDetails.lastName);
    if (sortBy === 'totalAmount') return b.totalAmount - a.totalAmount;
    return b.createdAt - a.createdAt; // default createdAt
  });

  // Calculate available rooms for a booking
  const getAvailableRoomsForBooking = (booking: Booking) => {
    const overlappingBookings = bookings.filter(b => 
      b.id !== booking.id &&
      b.categoryId === booking.categoryId &&
      b.roomId &&
      !['Cancelled', 'Rejected', 'Refunded'].includes(b.status) &&
      b.checkIn < booking.checkOut && 
      b.checkOut > booking.checkIn
    );
    const occupiedRoomIds = overlappingBookings.map(b => b.roomId);

    return rooms.filter(r => 
      r.categoryId === booking.categoryId && 
      r.status !== 'Out of Service' &&
      !occupiedRoomIds.includes(r.id)
    );
  };

  // Group Unique Guests for Guest Directory View
  const guestMap = new Map<string, { phone: string; email: string; name: string; staysCount: number; totalSpent: number; isVip: boolean }>();
  bookings.forEach(b => {
    const g = b.guestDetails;
    const key = `${g.phone}_${g.email}`.toLowerCase();
    if (!guestMap.has(key)) {
      guestMap.set(key, {
        phone: g.phone,
        email: g.email,
        name: `${g.firstName} ${g.lastName}`,
        staysCount: b.status === 'Checked Out' ? 1 : 0,
        totalSpent: !['Cancelled', 'Rejected'].includes(b.status) ? b.totalAmount : 0,
        isVip: Boolean(b.isVip)
      });
    } else {
      const existing = guestMap.get(key)!;
      if (b.status === 'Checked Out') existing.staysCount += 1;
      if (!['Cancelled', 'Rejected'].includes(b.status)) existing.totalSpent += b.totalAmount;
      if (b.isVip) existing.isVip = true;
    }
  });
  const guestDirectoryList = Array.from(guestMap.values()).filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.phone.toLowerCase().includes(search.toLowerCase()) ||
    g.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-neutral-800" />
        <p className="text-sm font-medium text-neutral-600">Loading Reception Control Center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Title & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">Reception Operations</h1>
          <p className="text-sm text-neutral-500 mt-1">Live Operational Control Center & Reservation Management</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex bg-neutral-200/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3.5 py-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Queue List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3.5 py-2 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Calendar Matrix
            </button>
            <button
              onClick={() => setViewMode('guest-directory')}
              className={`px-3.5 py-2 rounded-lg transition-all ${viewMode === 'guest-directory' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Guest Directory
            </button>
          </div>

          <button
            onClick={() => setShowWalkInModal(true)}
            className="px-4 py-2.5 bg-neutral-900 text-white font-medium text-sm rounded-xl hover:bg-neutral-800 transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            + New Walk-in / Phone Booking
          </button>
        </div>
      </div>

      {/* Live Operational KPI Cards (9 KPI Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs">
          <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Arrivals Today</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{arrivalsToday}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs">
          <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Departures Today</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{departuresToday}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs">
          <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Current Guests</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{currentGuestsCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs">
          <p className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{pendingApprovals}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Payment Verif.</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingVerifications}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Available Rooms</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{availableRoomsCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs">
          <p className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Occupied Rooms</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{occupiedRoomsCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs">
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Needs Cleaning</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{cleaningRoomsCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs">
          <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Maintenance</p>
          <p className="text-2xl font-bold text-rose-700 mt-1">{maintenanceRoomsCount}</p>
        </div>
      </div>

      {/* MAIN VIEW CONTENT */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* Status Queue Tabs */}
          <div className="flex overflow-x-auto border-b border-neutral-200 gap-2 pb-1 scrollbar-none">
            {[
              { label: 'All', value: 'All', count: bookings.length },
              { label: 'Pending', value: 'Pending', count: bookings.filter(b => b.status === 'Pending').length },
              { label: 'Awaiting Payment', value: 'Awaiting Payment Verification', count: bookings.filter(b => b.status === 'Awaiting Payment Verification').length },
              { label: 'Approved', value: 'Approved', count: bookings.filter(b => b.status === 'Approved').length },
              { label: 'Checked In', value: 'Checked In', count: bookings.filter(b => b.status === 'Checked In').length },
              { label: 'Checked Out', value: 'Checked Out', count: bookings.filter(b => b.status === 'Checked Out').length },
              { label: 'Cancelled', value: 'Cancelled', count: bookings.filter(b => b.status === 'Cancelled').length },
              { label: 'No Show', value: 'No Show', count: bookings.filter(b => b.status === 'No Show').length },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusTab(tab.value)}
                className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap flex items-center gap-2 transition-all ${
                  statusTab === tab.value 
                    ? 'bg-neutral-900 text-white shadow-xs' 
                    : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  statusTab === tab.value ? 'bg-neutral-700 text-white' : 'bg-neutral-100 text-neutral-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search, Date Filters, Category Filter, Sort */}
          <div className="bg-white p-4 rounded-xl border border-neutral-200 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Search code, guest name, phone, room..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="border border-neutral-300 rounded-lg p-2 bg-white"
              >
                <option value="All">All Categories</option>
                {(Object.values(categories) as RoomCategory[]).map((cat: RoomCategory) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              {/* Date From */}
              <div className="flex items-center gap-1">
                <span className="text-neutral-500 font-medium">From:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="border border-neutral-300 rounded-lg p-2 bg-white"
                />
              </div>

              {/* Date To */}
              <div className="flex items-center gap-1">
                <span className="text-neutral-500 font-medium">To:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="border border-neutral-300 rounded-lg p-2 bg-white"
                />
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="border border-neutral-300 rounded-lg p-2 bg-white font-medium"
                >
                  <option value="createdAt">Newest First</option>
                  <option value="checkIn">Arrival Date</option>
                  <option value="guestName">Guest Name</option>
                  <option value="totalAmount">Highest Amount</option>
                </select>
              </div>

              {(search || categoryFilter !== 'All' || dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setCategoryFilter('All');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="px-2.5 py-2 text-red-600 hover:underline font-bold"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Table of Reservations */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Code / Source</th>
                    <th className="px-6 py-4">Guest Details</th>
                    <th className="px-6 py-4">Stay Dates</th>
                    <th className="px-6 py-4">Room & Category</th>
                    <th className="px-6 py-4">Amount & Payment</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {filteredBookings.map((booking) => {
                    const assignedRoom = rooms.find(r => r.id === booking.roomId);

                    return (
                      <tr key={booking.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-neutral-900">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <span>{booking.reservationCode}</span>
                              <CopyButton
                                text={booking.reservationCode}
                                size="xs"
                                variant="ghost"
                                tooltip="Copy reservation code"
                              />
                            </div>
                            <span className="text-[10px] text-neutral-500 font-normal mt-0.5">
                              {booking.bookingSource || 'Online'}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-neutral-900 text-sm">
                              {booking.guestDetails.firstName} {booking.guestDetails.lastName}
                            </span>
                            {booking.isVip && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-extrabold flex items-center gap-0.5">
                                <Award className="w-2.5 h-2.5" /> VIP
                              </span>
                            )}
                          </div>
                          <p className="text-neutral-500">{booking.guestDetails.phone}</p>
                          <p className="text-[11px] text-neutral-400">{booking.guestDetails.email}</p>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-semibold text-neutral-900">{format(booking.checkIn, 'MMM d, yyyy')} -</p>
                          <p className="font-semibold text-neutral-900">{format(booking.checkOut, 'MMM d, yyyy')}</p>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-bold text-neutral-800">{categories[booking.categoryId]?.name || 'Standard Room'}</p>
                          {assignedRoom ? (
                            <span className="inline-block mt-1 font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Room {assignedRoom.roomNumber}
                            </span>
                          ) : (
                            <span className="inline-block mt-1 text-[11px] text-neutral-400 italic">
                              Unassigned
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-bold text-neutral-900 text-sm">{booking.totalAmount.toLocaleString()} ETB</p>
                          <p className="text-neutral-500">{booking.paymentMethod}</p>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block 
                            ${['Approved', 'Checked In'].includes(booking.status) ? 'bg-emerald-100 text-emerald-800' : 
                              ['Pending', 'Awaiting Payment Verification'].includes(booking.status) ? 'bg-amber-100 text-amber-800' : 
                              ['Cancelled', 'Rejected'].includes(booking.status) ? 'bg-rose-100 text-rose-800' : 'bg-neutral-100 text-neutral-800'}`
                          }>
                            {booking.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setSelectedBooking(booking)} 
                            className="px-3 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-900 rounded-lg shadow-xs font-semibold text-xs inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" /> Details & Actions
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredBookings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                        <p className="text-sm font-semibold">No reservations found matching your criteria.</p>
                        <p className="text-xs text-neutral-400 mt-1">Try resetting search filters or creating a new walk-in booking.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR MATRIX VIEW */}
      {viewMode === 'calendar' && (
        <ReservationCalendar 
          bookings={bookings} 
          rooms={rooms} 
          categories={categories} 
          onSelectBooking={setSelectedBooking} 
        />
      )}

      {/* GUEST DIRECTORY VIEW */}
      {viewMode === 'guest-directory' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-neutral-200 flex items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Search guest directory by name, phone, email..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-lg text-xs"
              />
            </div>
            <p className="text-xs text-neutral-500 font-medium">Found {guestDirectoryList.length} Unique Guests</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {guestDirectoryList.map((g, idx) => (
              <div 
                key={idx}
                onClick={() => setSelectedGuestProfile({ phone: g.phone, email: g.email, name: g.name })}
                className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs hover:shadow-md transition-all cursor-pointer flex justify-between items-start"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-neutral-900 text-sm">{g.name}</h3>
                    {g.isVip && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">{g.phone}</p>
                  <p className="text-xs text-neutral-400">{g.email}</p>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex gap-4 text-xs">
                    <div>
                      <p className="text-neutral-400 text-[10px]">Total Stays</p>
                      <p className="font-bold text-neutral-900">{g.staysCount}</p>
                    </div>
                    <div>
                      <p className="text-neutral-400 text-[10px]">Total Spent</p>
                      <p className="font-bold text-green-700">{g.totalSpent.toLocaleString()} ETB</p>
                    </div>
                  </div>
                </div>

                <span className="text-xs font-bold text-neutral-600 hover:underline shrink-0">
                  Profile →
                </span>
              </div>
            ))}

            {guestDirectoryList.length === 0 && (
              <div className="col-span-full py-12 text-center text-neutral-500 bg-white rounded-2xl border border-neutral-200">
                No guest profiles found matching your search.
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESERVATION DETAILS & ACTIONS MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
          <div className="bg-white rounded-2xl w-full max-w-4xl my-8 overflow-hidden shadow-2xl overscroll-contain">
            {/* Modal Header */}
            <div className="p-6 bg-neutral-900 text-white flex justify-between items-center sticky top-0 z-10">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold font-mono">Reservation {selectedBooking.reservationCode}</h2>
                  <CopyButton
                    text={selectedBooking.reservationCode}
                    variant="dark"
                    size="sm"
                    label="Copy"
                    showText={true}
                    tooltip="Copy reservation code"
                  />
                  <span className={`px-3 py-0.5 rounded-full text-xs font-extrabold ${
                    ['Approved', 'Checked In'].includes(selectedBooking.status) ? 'bg-emerald-500 text-white' :
                    selectedBooking.status === 'Checked Out' ? 'bg-neutral-700 text-white' :
                    ['Cancelled', 'Rejected'].includes(selectedBooking.status) ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {selectedBooking.status}
                  </span>
                  {selectedBooking.bookingSource && (
                    <span className="bg-neutral-800 text-neutral-300 text-xs px-2.5 py-0.5 rounded border border-neutral-700">
                      {selectedBooking.bookingSource}
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Created {format(selectedBooking.createdAt, 'MMM d, yyyy HH:mm')}
                </p>
              </div>
              <button 
                onClick={() => {
                  setSelectedBooking(null);
                  setShowRejectInput(false);
                }} 
                className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
              {/* Guest & Reservation Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Guest Box */}
                <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
                      <Users className="w-5 h-5 text-neutral-500" /> Guest Details
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedGuestProfile({
                          phone: selectedBooking.guestDetails.phone,
                          email: selectedBooking.guestDetails.email,
                          name: `${selectedBooking.guestDetails.firstName} ${selectedBooking.guestDetails.lastName}`
                        });
                      }}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      View Full History →
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-neutral-200/60">
                      <span className="text-neutral-500">Full Name</span>
                      <span className="font-bold text-neutral-900 flex items-center gap-1">
                        {selectedBooking.guestDetails.firstName} {selectedBooking.guestDetails.lastName}
                        {selectedBooking.isVip && <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-extrabold">VIP</span>}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-neutral-200/60">
                      <span className="text-neutral-500">Phone</span>
                      <span className="font-medium text-neutral-900">{selectedBooking.guestDetails.phone}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-neutral-200/60">
                      <span className="text-neutral-500">Email</span>
                      <span className="font-medium text-neutral-900">{selectedBooking.guestDetails.email}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-500">Guests Count</span>
                      <span className="font-bold text-neutral-900">{selectedBooking.numberOfGuests}</span>
                    </div>

                    {selectedBooking.specialRequests && (
                      <div className="mt-3 pt-2 border-t border-neutral-200">
                        <span className="text-neutral-500 block mb-1 font-semibold">Special Requests (Guest)</span>
                        <p className="text-neutral-800 bg-white p-2 rounded-lg border border-neutral-200 text-xs">
                          {selectedBooking.specialRequests}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Booking Info Box */}
                <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200">
                  <h3 className="font-bold text-neutral-900 text-base mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-neutral-500" /> Booking & Room Info
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-neutral-200/60">
                      <span className="text-neutral-500">Category</span>
                      <span className="font-bold text-neutral-900">{categories[selectedBooking.categoryId]?.name || 'Standard Room'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-neutral-200/60">
                      <span className="text-neutral-500">Assigned Room</span>
                      <span className="font-bold text-blue-700">
                        {selectedBooking.roomId ? `Room ${rooms.find(r => r.id === selectedBooking.roomId)?.roomNumber}` : 'Not Assigned'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-neutral-200/60">
                      <span className="text-neutral-500">Check-In / Out</span>
                      <span className="font-bold text-neutral-900">
                        {format(selectedBooking.checkIn, 'MMM d, yyyy')} - {format(selectedBooking.checkOut, 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-neutral-200/60">
                      <span className="text-neutral-500">Total Amount</span>
                      <span className="font-extrabold text-green-700 text-sm">{selectedBooking.totalAmount.toLocaleString()} ETB</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-neutral-200/60">
                      <span className="text-neutral-500">Payment Method</span>
                      <span className="font-medium text-neutral-900">{selectedBooking.paymentMethod}</span>
                    </div>

                    {selectedBooking.transactionId && (
                      <div className="flex justify-between py-1">
                        <span className="text-neutral-500">Transaction ID</span>
                        <span className="font-mono text-neutral-900">{selectedBooking.transactionId}</span>
                      </div>
                    )}

                    {selectedBooking.paymentProofUrl && (
                      <div className="mt-3 pt-2 border-t border-neutral-200">
                        <button 
                          onClick={() => setPreviewPaymentImage(selectedBooking.paymentProofUrl || null)} 
                          className="text-blue-600 hover:underline font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4 text-blue-600" /> View Bank Payment Proof / Receipt
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Room Assignment / Reassignment Box */}
              <div className="bg-white p-5 border border-neutral-200 rounded-2xl shadow-xs">
                <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-neutral-600" /> Room Assignment & Reassignment
                </h3>

                <div className="flex flex-col sm:flex-row items-end gap-3">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Select Available Room for Category ({categories[selectedBooking.categoryId]?.name})
                    </label>
                    <select
                      value={roomToAssign}
                      onChange={e => setRoomToAssign(e.target.value)}
                      className="w-full border border-neutral-300 rounded-lg p-2.5 text-xs bg-white font-medium"
                    >
                      <option value="">-- Choose a Room --</option>
                      {getAvailableRoomsForBooking(selectedBooking).map(r => (
                        <option key={r.id} value={r.id}>
                          Room {r.roomNumber} ({r.status} • {r.condition})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => assignRoom(selectedBooking.id)}
                    disabled={actionLoading || !roomToAssign}
                    className="px-5 py-2.5 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 shrink-0 flex items-center gap-2"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {selectedBooking.roomId ? 'Reassign Room' : 'Assign Room'}
                  </button>
                </div>
              </div>

              {/* RECEPTION LIFECYCLE ACTION BUTTONS */}
              <div className="bg-neutral-50 p-5 border border-neutral-200 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-neutral-900">Reception Operations Actions</h3>

                {showRejectInput && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                    <label className="block text-xs font-bold text-red-900">Rejection Reason Note *</label>
                    <input
                      type="text"
                      placeholder="e.g. Payment receipt invalid, room unavailable..."
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      className="w-full p-2 text-xs border border-red-300 rounded-lg bg-white"
                    />
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setShowRejectInput(false)}
                        className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:underline"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => updateBookingStatus(selectedBooking.id, 'Rejected', rejectReason || 'Rejected by reception')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2.5">
                  {selectedBooking.status === 'Pending' && (
                    <>
                      <button 
                        onClick={() => updateBookingStatus(selectedBooking.id, 'Approved', 'Approved by reception')} 
                        disabled={actionLoading} 
                        className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve Reservation
                      </button>
                      <button 
                        onClick={() => setShowRejectInput(true)} 
                        disabled={actionLoading} 
                        className="px-4 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 flex items-center gap-1.5 shadow-xs"
                      >
                        <XCircle className="w-4 h-4" /> Reject Reservation
                      </button>
                    </>
                  )}

                  {selectedBooking.status === 'Awaiting Payment Verification' && (
                    <>
                      <button 
                        onClick={() => updateBookingStatus(selectedBooking.id, 'Approved', 'Payment verified by reception')} 
                        disabled={actionLoading} 
                        className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Verify Payment & Approve
                      </button>
                      <button 
                        onClick={() => setShowRejectInput(true)} 
                        disabled={actionLoading} 
                        className="px-4 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 flex items-center gap-1.5 shadow-xs"
                      >
                        <XCircle className="w-4 h-4" /> Reject Payment Proof
                      </button>
                    </>
                  )}

                  {selectedBooking.status === 'Approved' && (
                    <button 
                      onClick={() => updateBookingStatus(selectedBooking.id, 'Checked In', 'Guest checked in at reception')} 
                      disabled={actionLoading || !selectedBooking.roomId} 
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                      title={!selectedBooking.roomId ? 'Must assign a room first' : 'Check in guest'}
                    >
                      <LogIn className="w-4 h-4" /> Check In Guest
                    </button>
                  )}

                  {selectedBooking.status === 'Approved' && (
                    <button 
                      onClick={() => updateBookingStatus(selectedBooking.id, 'No Show', 'Guest marked as No Show')} 
                      disabled={actionLoading} 
                      className="px-4 py-2.5 bg-neutral-700 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 flex items-center gap-1.5"
                    >
                      Mark No Show
                    </button>
                  )}

                  {selectedBooking.status === 'Checked In' && (
                    <button 
                      onClick={() => updateBookingStatus(selectedBooking.id, 'Checked Out', 'Guest checked out at reception')} 
                      disabled={actionLoading} 
                      className="px-4 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 flex items-center gap-1.5 shadow-xs"
                    >
                      <LogOut className="w-4 h-4" /> Check Out Guest
                    </button>
                  )}

                  {!['Cancelled', 'Checked Out', 'Refunded', 'Rejected'].includes(selectedBooking.status) && (
                    <button 
                      onClick={() => {
                        if (window.confirm("Are you sure you want to cancel this reservation?")) {
                          updateBookingStatus(selectedBooking.id, 'Cancelled', 'Cancelled by reception staff');
                        }
                      }} 
                      disabled={actionLoading} 
                      className="px-4 py-2.5 bg-white text-rose-600 border border-neutral-300 rounded-xl text-xs font-bold hover:bg-rose-50 ml-auto"
                    >
                      Cancel Reservation
                    </button>
                  )}
                </div>
              </div>

              {/* PRIVATE STAFF NOTES SECTION */}
              <div className="bg-amber-50/60 border border-amber-200 p-5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" /> Private Staff Notes (Internal Only)
                </h3>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(!selectedBooking.notes || selectedBooking.notes.length === 0) ? (
                    <p className="text-xs text-amber-700 italic">No internal staff notes recorded yet.</p>
                  ) : (
                    selectedBooking.notes.map(n => (
                      <div key={n.id} className="bg-white p-3 rounded-xl border border-amber-200 text-xs space-y-1">
                        <div className="flex justify-between font-bold text-amber-900 text-[11px]">
                          <span>{n.userName}</span>
                          <span className="text-neutral-400 font-normal">{format(n.createdAt, 'MMM d, yyyy HH:mm')}</span>
                        </div>
                        <p className="text-neutral-800">{n.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddStaffNote} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type private staff note (e.g. key deposit collected, extended stay discussed)..."
                    value={newStaffNote}
                    onChange={e => setNewStaffNote(e.target.value)}
                    className="flex-1 text-xs p-2.5 border border-amber-300 rounded-xl bg-white"
                  />
                  <button
                    type="submit"
                    disabled={actionLoading || !newStaffNote.trim()}
                    className="px-4 py-2.5 bg-amber-800 text-white rounded-xl text-xs font-bold hover:bg-amber-900 disabled:opacity-50 flex items-center gap-1 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" /> Save Note
                  </button>
                </form>
              </div>

              {/* AUDIT TRAIL TIMELINE */}
              <div>
                <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neutral-500" /> Complete Operational Audit Trail
                </h3>

                <div className="space-y-3 relative pl-4 border-l-2 border-neutral-200">
                  {selectedBooking.timeline?.map((event, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-neutral-900 border-2 border-white" />
                      <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-xs">
                        <div className="flex justify-between items-center font-bold text-neutral-900">
                          <span>{event.status}</span>
                          <span className="text-[11px] text-neutral-400 font-normal">{format(event.timestamp, 'MMM d, yyyy HH:mm:ss')}</span>
                        </div>
                        <p className="text-neutral-500 text-[11px] mt-0.5">By: {event.userName || event.userId || 'System'}</p>
                        {event.notes && <p className="text-neutral-800 font-medium mt-1 bg-white p-2 rounded border border-neutral-200">{event.notes}</p>}
                      </div>
                    </div>
                  ))}

                  {(!selectedBooking.timeline || selectedBooking.timeline.length === 0) && (
                    <p className="text-xs text-neutral-500 italic">No timeline events recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WALK-IN MODAL */}
      {showWalkInModal && (
        <WalkInModal
          categories={categories}
          rooms={rooms}
          existingBookings={bookings}
          onClose={() => setShowWalkInModal(false)}
          onSuccess={() => setShowWalkInModal(false)}
        />
      )}

      {/* GUEST PROFILE MODAL */}
      {selectedGuestProfile && (
        <GuestProfileModal
          guestPhone={selectedGuestProfile.phone}
          guestEmail={selectedGuestProfile.email}
          guestName={selectedGuestProfile.name}
          bookings={bookings}
          rooms={rooms}
          categories={categories}
          onClose={() => setSelectedGuestProfile(null)}
          onRefresh={() => {}}
        />
      )}

      {/* PAYMENT PROOF MODAL */}
      {previewPaymentImage && (
        <div className="fixed inset-0 z-[100] bg-neutral-900/90 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-neutral-100 shrink-0">
              <h3 className="font-bold text-neutral-900">Payment Proof / Receipt</h3>
              <button 
                onClick={() => setPreviewPaymentImage(null)} 
                className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-neutral-100 flex items-center justify-center p-4">
              {previewPaymentImage.includes('.pdf') || previewPaymentImage.includes('%2Fpdf') ? (
                <div className="text-center p-8">
                  <FileText className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-700 font-medium mb-4">PDF Document Uploaded</p>
                  <a href={previewPaymentImage} target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition">
                    Open Document in New Tab
                  </a>
                </div>
              ) : (
                <img src={previewPaymentImage} alt="Payment Proof" className="max-w-full max-h-[80vh] object-contain rounded shadow-sm" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
