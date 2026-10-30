import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from '@/lib/supabaseAdapter';
import { db } from '@/lib/supabaseAdapter';
import { Room, RoomCategory, Booking, Hall, HallBookingRequest } from '../../types';
import { 
  getRoomOccupancyInfo, 
  getRoomsSummary, 
  RoomOccupancyStatus,
  getRoomIntervalOccupancy,
  getRoomsIntervalSummary,
  RoomIntervalOccupancyStatus,
  RoomIntervalOccupancy
} from '../../lib/occupancyUtils';
import ConfirmModal from '../../components/common/ConfirmModal';
import DateIntervalAvailabilityModal from '../../components/admin/DateIntervalAvailabilityModal';
import { 
  Loader2, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Save, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  CalendarRange,
  Building2, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sparkles, 
  Phone, 
  Mail, 
  Eye, 
  ArrowRight,
  Layers,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { 
  format, 
  isSameDay, 
  addDays, 
  differenceInCalendarDays,
  nextFriday,
  nextSunday,
  isFriday,
  isSaturday,
  isSunday
} from 'date-fns';
import { Link } from 'react-router-dom';

export default function AdminRoomInventory() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [hallRequests, setHallRequests] = useState<HallBookingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Inspection mode: 'single' (single date) | 'interval' (date range)
  const [inspectionMode, setInspectionMode] = useState<'single' | 'interval'>('single');

  // Single date inspector
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Interval date inspector (Check-in to Check-out)
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(addDays(new Date(), 2), 'yyyy-MM-dd'));

  // View layout mode: 'grid' | 'table'
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');

  // Filters for single date
  const [statusFilter, setStatusFilter] = useState<'ALL' | RoomOccupancyStatus>('ALL');
  // Filters for interval
  const [intervalStatusFilter, setIntervalStatusFilter] = useState<'ALL' | RoomIntervalOccupancyStatus>('ALL');

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [floorFilter, setFloorFilter] = useState<string>('ALL');

  // Modals
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [inspectingRoom, setInspectingRoom] = useState<Room | null>(null);
  const [showIntervalModal, setShowIntervalModal] = useState(false);

  // Real-time Firestore subscriptions
  useEffect(() => {
    // 1. Rooms listener
    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Room));
      // Sort naturally by room number
      list.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
      setRooms(list);
    });

    // 2. Categories listener
    const unsubCats = onSnapshot(collection(db, 'room_categories'), (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RoomCategory)));
    });

    // 3. Bookings listener
    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const list = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Booking))
        .filter(b => b.type === 'room' || !b.type);
      setBookings(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching bookings for inventory:", error);
      setLoading(false);
    });

    // 4. Halls listener
    const unsubHalls = onSnapshot(collection(db, 'halls'), (snapshot) => {
      setHalls(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Hall)));
    });

    // 5. Hall requests listener
    const unsubHallReqs = onSnapshot(collection(db, 'hall_booking_requests'), (snapshot) => {
      setHallRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as HallBookingRequest)));
    });

    return () => {
      unsubRooms();
      unsubCats();
      unsubBookings();
      unsubHalls();
      unsubHallReqs();
    };
  }, []);

  const targetDateObj = new Date(`${selectedDate}T00:00:00`);
  const isTargetToday = isSameDay(targetDateObj, new Date());

  const startObj = new Date(`${startDate}T00:00:00`);
  const endObj = new Date(`${endDate}T00:00:00`);
  const nightsCount = Math.max(1, differenceInCalendarDays(endObj, startObj));

  // Summaries
  const singleSummary = getRoomsSummary(rooms, bookings, targetDateObj);
  const intervalSummary = getRoomsIntervalSummary(rooms, bookings, startObj, endObj);

  // Quick preset helper
  const applyIntervalPreset = (preset: 'tonight' | 'weekend' | '3days' | '7days') => {
    const now = new Date();
    if (preset === 'tonight') {
      setStartDate(format(now, 'yyyy-MM-dd'));
      setEndDate(format(addDays(now, 1), 'yyyy-MM-dd'));
    } else if (preset === 'weekend') {
      const fri = isFriday(now) ? now : nextFriday(now);
      const sun = isSunday(fri) ? fri : nextSunday(fri);
      setStartDate(format(fri, 'yyyy-MM-dd'));
      setEndDate(format(sun, 'yyyy-MM-dd'));
    } else if (preset === '3days') {
      setStartDate(format(now, 'yyyy-MM-dd'));
      setEndDate(format(addDays(now, 3), 'yyyy-MM-dd'));
    } else if (preset === '7days') {
      setStartDate(format(now, 'yyyy-MM-dd'));
      setEndDate(format(addDays(now, 7), 'yyyy-MM-dd'));
    }
  };

  // Extract unique floors
  const availableFloors = Array.from(new Set(rooms.map(r => r.floor || '1st Floor'))).filter(Boolean);

  // Map category names
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id;

  // Filtered rooms
  const filteredRooms = rooms.filter(room => {
    if (inspectionMode === 'single') {
      const occInfo = getRoomOccupancyInfo(room, bookings, targetDateObj);

      // Status filter
      if (statusFilter !== 'ALL' && occInfo.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'ALL' && room.categoryId !== categoryFilter) {
        return false;
      }

      // Floor filter
      const roomFloor = room.floor || '1st Floor';
      if (floorFilter !== 'ALL' && roomFloor !== floorFilter) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchRoom = room.roomNumber.toLowerCase().includes(q);
        const matchCat = getCategoryName(room.categoryId).toLowerCase().includes(q);
        const matchGuest = occInfo.activeBooking 
          ? `${occInfo.activeBooking.guestDetails.firstName} ${occInfo.activeBooking.guestDetails.lastName}`.toLowerCase().includes(q) ||
            occInfo.activeBooking.reservationCode.toLowerCase().includes(q)
          : false;

        if (!matchRoom && !matchCat && !matchGuest) return false;
      }

      return true;
    } else {
      const intervalOcc = getRoomIntervalOccupancy(room, bookings, startObj, endObj);

      // Interval Status filter
      if (intervalStatusFilter !== 'ALL' && intervalOcc.status !== intervalStatusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'ALL' && room.categoryId !== categoryFilter) {
        return false;
      }

      // Floor filter
      const roomFloor = room.floor || '1st Floor';
      if (floorFilter !== 'ALL' && roomFloor !== floorFilter) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchRoom = room.roomNumber.toLowerCase().includes(q);
        const matchCat = getCategoryName(room.categoryId).toLowerCase().includes(q);
        const matchConflictingGuest = intervalOcc.conflictingBookings.some(b => 
          `${b.guestDetails.firstName} ${b.guestDetails.lastName}`.toLowerCase().includes(q) ||
          b.reservationCode.toLowerCase().includes(q)
        );

        if (!matchRoom && !matchCat && !matchConflictingGuest) return false;
      }

      return true;
    }
  });

  // Group by floors for grid view
  const roomsByFloor: Record<string, Room[]> = {};
  filteredRooms.forEach(r => {
    const floorKey = r.floor || '1st Floor';
    if (!roomsByFloor[floorKey]) roomsByFloor[floorKey] = [];
    roomsByFloor[floorKey].push(r);
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    setSaving(true);
    try {
      const isNew = !editingRoom.id;
      const id = isNew ? `room_${Date.now()}` : editingRoom.id;
      const roomToSave = { 
        ...editingRoom, 
        id,
        roomNumber: editingRoom.roomNumber.trim(),
        floor: editingRoom.floor || '1st Floor'
      };
      await setDoc(doc(db, 'rooms', id), roomToSave);
      setEditingRoom(null);
    } catch (error) {
      console.error("Error saving room:", error);
      alert("Failed to save room.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'rooms', deletingId));
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting room:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const startNew = () => {
    setEditingRoom({
      id: '',
      categoryId: categories[0]?.id || '',
      roomNumber: '',
      condition: 'Clean',
      status: 'Available',
      floor: '1st Floor'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
        <p className="text-sm font-semibold text-neutral-600">Loading Room Inventory & Live Occupancy...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-neutral-900 text-white text-[11px] font-bold rounded-full uppercase tracking-wider">
              Frontdesk & Admin
            </span>
            <span className="text-xs font-semibold text-neutral-500">
              Live Room Availability Matrix
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">Room Inventory & Occupancy</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Real-time status, active guest assignments, and reservation tracking across all rooms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Multi-date Availability Modal trigger */}
          <button
            onClick={() => setShowIntervalModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition shadow-xs cursor-pointer"
          >
            <CalendarRange className="w-4 h-4" />
            Check Availability Modal
          </button>

          {/* View mode toggle */}
          <div className="flex bg-neutral-200 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewLayout('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewLayout === 'grid' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grid View
            </button>
            <button
              onClick={() => setViewLayout('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewLayout === 'table' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table View
            </button>
          </div>

          <button 
            onClick={startNew} 
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-bold rounded-xl hover:bg-neutral-800 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </button>
        </div>
      </div>

      {/* Date Inspection Bar with Mode Switcher */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <CalendarIcon className="w-5 h-5 text-neutral-700 shrink-0" />
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Availability Inspection Engine</p>
              <p className="text-sm font-extrabold text-neutral-900">
                {inspectionMode === 'single'
                  ? `${format(targetDateObj, 'EEEE, MMMM d, yyyy')} ${isTargetToday ? '(Today)' : ''}`
                  : `${format(startObj, 'MMM d')} → ${format(endObj, 'MMM d, yyyy')} (${nightsCount} Night${nightsCount > 1 ? 's' : ''})`
                }
              </p>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
            <button
              onClick={() => setInspectionMode('single')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                inspectionMode === 'single'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Single Date View
            </button>
            <button
              onClick={() => setInspectionMode('interval')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${
                inspectionMode === 'interval'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              Date Interval Range
            </button>
          </div>
        </div>

        {/* Mode Controls */}
        {inspectionMode === 'single' ? (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-500">Quick Jump:</span>
              <button
                onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                  isTargetToday 
                    ? 'bg-neutral-900 text-white border-neutral-900' 
                    : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setSelectedDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'))}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100 transition cursor-pointer"
              >
                Tomorrow
              </button>
              <button
                onClick={() => setSelectedDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'))}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100 transition cursor-pointer"
              >
                Next Week
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-neutral-600">Select Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-neutral-300 text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-neutral-600">Check-In:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartDate(newStart);
                      if (new Date(newStart) >= new Date(endDate)) {
                        setEndDate(format(addDays(new Date(newStart), 1), 'yyyy-MM-dd'));
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-neutral-300 text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-neutral-600">Check-Out:</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-neutral-300 text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
                  />
                </div>

                <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold">
                  {nightsCount} Night{nightsCount > 1 ? 's' : ''} Stay
                </span>
              </div>

              {/* Interval Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-neutral-400 mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyIntervalPreset('tonight')}
                  className="px-2.5 py-1 text-xs font-bold rounded-md bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100 cursor-pointer"
                >
                  Tonight (1 Nt)
                </button>
                <button
                  type="button"
                  onClick={() => applyIntervalPreset('weekend')}
                  className="px-2.5 py-1 text-xs font-bold rounded-md bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100 cursor-pointer"
                >
                  This Weekend
                </button>
                <button
                  type="button"
                  onClick={() => applyIntervalPreset('3days')}
                  className="px-2.5 py-1 text-xs font-bold rounded-md bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100 cursor-pointer"
                >
                  3 Days
                </button>
                <button
                  type="button"
                  onClick={() => applyIntervalPreset('7days')}
                  className="px-2.5 py-1 text-xs font-bold rounded-md bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100 cursor-pointer"
                >
                  7 Days
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Summary KPI Cards */}
      {inspectionMode === 'single' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Total */}
          <div 
            onClick={() => setStatusFilter('ALL')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              statusFilter === 'ALL' ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm' : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-300 shadow-2xs'
            }`}
          >
            <p className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'ALL' ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Total Rooms
            </p>
            <p className="text-2xl font-extrabold mt-1">{singleSummary.total}</p>
            <p className={`text-[11px] mt-0.5 ${statusFilter === 'ALL' ? 'text-neutral-300' : 'text-neutral-500'}`}>
              {singleSummary.occupancyRate}% Occupancy Rate
            </p>
          </div>

          {/* Available Clean */}
          <div 
            onClick={() => setStatusFilter('Available')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              statusFilter === 'Available' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-neutral-900 border-neutral-200 hover:border-emerald-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'Available' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                Available (Ready)
              </p>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <p className="text-2xl font-extrabold mt-1">{singleSummary.available}</p>
            <p className={`text-[11px] mt-0.5 ${statusFilter === 'Available' ? 'text-emerald-100' : 'text-neutral-500'}`}>
              Vacant & clean to sell
            </p>
          </div>

          {/* Reserved */}
          <div 
            onClick={() => setStatusFilter('Reserved')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              statusFilter === 'Reserved' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-neutral-900 border-neutral-200 hover:border-amber-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'Reserved' ? 'text-amber-100' : 'text-amber-700'}`}>
                Reserved
              </p>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            </div>
            <p className="text-2xl font-extrabold mt-1">{singleSummary.reserved}</p>
            <p className={`text-[11px] mt-0.5 ${statusFilter === 'Reserved' ? 'text-amber-100' : 'text-neutral-500'}`}>
              Confirmed bookings
            </p>
          </div>

          {/* Occupied */}
          <div 
            onClick={() => setStatusFilter('Occupied')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              statusFilter === 'Occupied' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-neutral-900 border-neutral-200 hover:border-rose-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'Occupied' ? 'text-rose-100' : 'text-rose-700'}`}>
                Occupied
              </p>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            </div>
            <p className="text-2xl font-extrabold mt-1">{singleSummary.occupied}</p>
            <p className={`text-[11px] mt-0.5 ${statusFilter === 'Occupied' ? 'text-rose-100' : 'text-neutral-500'}`}>
              Guests checked in
            </p>
          </div>

          {/* Needs Cleaning */}
          <div 
            onClick={() => setStatusFilter('Needs Cleaning')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              statusFilter === 'Needs Cleaning' ? 'bg-yellow-500 text-white border-yellow-500 shadow-sm' : 'bg-white text-neutral-900 border-neutral-200 hover:border-yellow-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'Needs Cleaning' ? 'text-yellow-100' : 'text-yellow-700'}`}>
                Needs Cleaning
              </p>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            </div>
            <p className="text-2xl font-extrabold mt-1">{singleSummary.needsCleaning}</p>
            <p className={`text-[11px] mt-0.5 ${statusFilter === 'Needs Cleaning' ? 'text-yellow-100' : 'text-neutral-500'}`}>
              Housekeeping needed
            </p>
          </div>

          {/* Out of Service */}
          <div 
            onClick={() => setStatusFilter('Out of Service')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              statusFilter === 'Out of Service' ? 'bg-neutral-800 text-white border-neutral-800 shadow-sm' : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-400 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'Out of Service' ? 'text-neutral-300' : 'text-neutral-700'}`}>
                Out of Service
              </p>
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
            </div>
            <p className="text-2xl font-extrabold mt-1">{singleSummary.outOfService}</p>
            <p className={`text-[11px] mt-0.5 ${statusFilter === 'Out of Service' ? 'text-neutral-300' : 'text-neutral-500'}`}>
              Maintenance / Blocked
            </p>
          </div>
        </div>
      ) : (
        /* Interval KPI Summary Cards */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Total Rooms */}
          <div 
            onClick={() => setIntervalStatusFilter('ALL')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              intervalStatusFilter === 'ALL' ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm' : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-300 shadow-2xs'
            }`}
          >
            <p className={`text-[11px] font-bold uppercase tracking-wider ${intervalStatusFilter === 'ALL' ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Total Rooms
            </p>
            <p className="text-2xl font-extrabold mt-1">{intervalSummary.totalRooms}</p>
            <p className={`text-[11px] mt-0.5 ${intervalStatusFilter === 'ALL' ? 'text-neutral-300' : 'text-neutral-500'}`}>
              Across all categories
            </p>
          </div>

          {/* 100% Free Full Stay */}
          <div 
            onClick={() => setIntervalStatusFilter('Available')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              intervalStatusFilter === 'Available' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-neutral-900 border-neutral-200 hover:border-emerald-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${intervalStatusFilter === 'Available' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                100% Free Entire Stay
              </p>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <p className="text-2xl font-extrabold mt-1">{intervalSummary.fullyAvailable}</p>
            <p className={`text-[11px] mt-0.5 ${intervalStatusFilter === 'Available' ? 'text-emerald-100' : 'text-neutral-500'}`}>
              Ready to book {nightsCount} nights
            </p>
          </div>

          {/* Partially Booked */}
          <div 
            onClick={() => setIntervalStatusFilter('Partially Booked')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              intervalStatusFilter === 'Partially Booked' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-neutral-900 border-neutral-200 hover:border-amber-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${intervalStatusFilter === 'Partially Booked' ? 'text-amber-100' : 'text-amber-700'}`}>
                Partially Booked
              </p>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            </div>
            <p className="text-2xl font-extrabold mt-1">{intervalSummary.partiallyBooked}</p>
            <p className={`text-[11px] mt-0.5 ${intervalStatusFilter === 'Partially Booked' ? 'text-amber-100' : 'text-neutral-500'}`}>
              Free for some nights
            </p>
          </div>

          {/* Fully Booked */}
          <div 
            onClick={() => setIntervalStatusFilter('Fully Booked')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              intervalStatusFilter === 'Fully Booked' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-neutral-900 border-neutral-200 hover:border-rose-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${intervalStatusFilter === 'Fully Booked' ? 'text-rose-100' : 'text-rose-700'}`}>
                Fully Booked
              </p>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            </div>
            <p className="text-2xl font-extrabold mt-1">{intervalSummary.fullyBooked}</p>
            <p className={`text-[11px] mt-0.5 ${intervalStatusFilter === 'Fully Booked' ? 'text-rose-100' : 'text-neutral-500'}`}>
              Occupied throughout range
            </p>
          </div>

          {/* Out of Service */}
          <div 
            onClick={() => setIntervalStatusFilter('Out of Service')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              intervalStatusFilter === 'Out of Service' ? 'bg-neutral-800 text-white border-neutral-800 shadow-sm' : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-400 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${intervalStatusFilter === 'Out of Service' ? 'text-neutral-300' : 'text-neutral-700'}`}>
                Out of Service
              </p>
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
            </div>
            <p className="text-2xl font-extrabold mt-1">{intervalSummary.outOfService}</p>
            <p className={`text-[11px] mt-0.5 ${intervalStatusFilter === 'Out of Service' ? 'text-neutral-300' : 'text-neutral-500'}`}>
              Maintenance / Blocked
            </p>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search room #, guest name, reservation code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-neutral-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-xs font-semibold border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-800 focus:outline-hidden"
        >
          <option value="ALL">All Categories ({categories.length})</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Floor Filter */}
        {availableFloors.length > 1 && (
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-800 focus:outline-hidden"
          >
            <option value="ALL">All Floors</option>
            {availableFloors.map(fl => (
              <option key={fl} value={fl}>{fl}</option>
            ))}
          </select>
        )}

        {/* Clear Filters button */}
        {(
          (inspectionMode === 'single' ? statusFilter !== 'ALL' : intervalStatusFilter !== 'ALL') || 
          categoryFilter !== 'ALL' || 
          floorFilter !== 'ALL' || 
          searchTerm
        ) && (
          <button
            onClick={() => {
              setStatusFilter('ALL');
              setIntervalStatusFilter('ALL');
              setCategoryFilter('ALL');
              setFloorFilter('ALL');
              setSearchTerm('');
            }}
            className="px-3 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 rounded-lg transition shrink-0 cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main Room View: Grid vs Table */}
      {viewLayout === 'grid' ? (
        /* GRID / FLOOR LAYOUT VIEW */
        <div className="space-y-8">
          {Object.entries(roomsByFloor).map(([floorName, floorRooms]) => (
            <div key={floorName} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                <Layers className="w-4 h-4 text-neutral-500" />
                <h2 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">{floorName}</h2>
                <span className="text-xs text-neutral-400 font-semibold">({floorRooms.length} rooms)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {floorRooms.map(room => {
                  const cat = categories.find(c => c.id === room.categoryId);

                  if (inspectionMode === 'interval') {
                    const intervalOcc = getRoomIntervalOccupancy(room, bookings, startObj, endObj);
                    
                    const badgeClass = 
                      intervalOcc.status === 'Available'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : intervalOcc.status === 'Partially Booked'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : intervalOcc.status === 'Fully Booked'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-neutral-100 text-neutral-700 border-neutral-300';

                    const dotColor =
                      intervalOcc.status === 'Available'
                        ? 'bg-emerald-500'
                        : intervalOcc.status === 'Partially Booked'
                        ? 'bg-amber-500'
                        : intervalOcc.status === 'Fully Booked'
                        ? 'bg-rose-500'
                        : 'bg-neutral-400';

                    return (
                      <div
                        key={room.id}
                        onClick={() => setInspectingRoom(room)}
                        className="bg-white rounded-2xl border border-neutral-200/90 shadow-2xs hover:shadow-md hover:border-neutral-400 transition-all p-4 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-lg font-black text-neutral-900 group-hover:text-neutral-950">
                              Room {room.roomNumber}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                              {intervalOcc.status === 'Available' ? `Free (${nightsCount} Nts)` : intervalOcc.status}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-neutral-500 mb-3">
                            {cat?.name || 'Standard Room'}
                          </p>
                        </div>

                        {/* Middle: Interval night pills breakdown */}
                        <div className="my-2 bg-neutral-50 rounded-xl p-2.5 border border-neutral-100 text-xs">
                          <div className="flex items-center justify-between text-[10px] font-bold text-neutral-500 uppercase mb-1.5">
                            <span>Nights ({nightsCount} nts)</span>
                            <span className="text-neutral-700 font-bold">{intervalOcc.availableNightsCount} of {intervalOcc.totalNights} Free</span>
                          </div>

                          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none mb-2">
                            {intervalOcc.dayBreakdown.slice(0, 7).map((d, i) => (
                              <div
                                key={i}
                                title={`${d.dateStr}: ${d.isAvailable ? 'Free' : 'Reserved'}`}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex flex-col items-center shrink-0 ${
                                  d.isAvailable
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                              >
                                <span className="text-[9px] uppercase">{format(d.date, 'EEE')}</span>
                                <span className="text-[10px]">{format(d.date, 'd')}</span>
                              </div>
                            ))}
                            {intervalOcc.dayBreakdown.length > 7 && (
                              <span className="text-[10px] font-bold text-neutral-400 self-center pl-0.5">
                                +{intervalOcc.dayBreakdown.length - 7}
                              </span>
                            )}
                          </div>

                          {intervalOcc.status === 'Available' ? (
                            <div className="text-emerald-700 font-medium flex items-center gap-1.5 pt-1.5 border-t border-neutral-200/60">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">100% Free entire stay</span>
                            </div>
                          ) : intervalOcc.conflictingBookings.length > 0 ? (
                            <div className="pt-1.5 border-t border-neutral-200/60 text-[11px] text-neutral-700 truncate">
                              <span className="font-bold text-rose-700">Booked by: </span>
                              <span>{intervalOcc.conflictingBookings[0].guestDetails.firstName} {intervalOcc.conflictingBookings[0].guestDetails.lastName}</span>
                              {intervalOcc.conflictingBookings.length > 1 && (
                                <span className="text-neutral-400 text-[10px] ml-1">
                                  (+{intervalOcc.conflictingBookings.length - 1} more)
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-neutral-600 font-medium flex items-center gap-1.5 pt-1.5 border-t border-neutral-200/60">
                              <AlertCircle className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                              <span>Condition: {room.condition}</span>
                            </div>
                          )}
                        </div>

                        {/* Footer: Quick controls */}
                        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[11px] text-neutral-500">
                          <span className="font-medium">Condition: {room.condition}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRoom(room);
                              }}
                              className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-md hover:bg-neutral-100 cursor-pointer"
                              title="Edit Room"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(room.id);
                              }}
                              className="p-1.5 text-red-400 hover:text-red-700 rounded-md hover:bg-red-50 cursor-pointer"
                              title="Delete Room"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const occInfo = getRoomOccupancyInfo(room, bookings, targetDateObj);

                  return (
                    <div
                      key={room.id}
                      onClick={() => setInspectingRoom(room)}
                      className="bg-white rounded-2xl border border-neutral-200/90 shadow-2xs hover:shadow-md hover:border-neutral-400 transition-all p-4 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
                    >
                      {/* Top bar: Room number & status badge */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-lg font-black text-neutral-900 group-hover:text-neutral-950">
                            Room {room.roomNumber}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${occInfo.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${occInfo.dotColor}`} />
                            {occInfo.label}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-neutral-500 mb-3">
                          {cat?.name || 'Standard Room'}
                        </p>
                      </div>

                      {/* Middle: Active occupant / reservation info */}
                      <div className="my-2 bg-neutral-50 rounded-xl p-2.5 border border-neutral-100 text-xs">
                        {occInfo.activeBooking ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between font-bold text-neutral-900">
                              <span className="truncate">
                                {occInfo.activeBooking.guestDetails.firstName} {occInfo.activeBooking.guestDetails.lastName}
                              </span>
                              {occInfo.activeBooking.isVip && (
                                <span className="text-[9px] bg-amber-400 text-neutral-950 px-1 py-0.2 rounded font-black">
                                  VIP
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                              <span>{occInfo.activeBooking.reservationCode}</span>
                              <span className="font-sans font-bold capitalize text-neutral-700">
                                {occInfo.activeBooking.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-500 flex items-center justify-between pt-1 border-t border-neutral-200/60">
                              <span>In: {format(new Date(occInfo.activeBooking.checkIn), 'MMM d')}</span>
                              <span>Out: {format(new Date(occInfo.activeBooking.checkOut), 'MMM d')}</span>
                            </div>
                          </div>
                        ) : occInfo.status === 'Needs Cleaning' ? (
                          <div className="text-amber-800 flex items-center gap-1.5 font-medium">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>Housekeeping: {room.condition}</span>
                          </div>
                        ) : occInfo.status === 'Out of Service' ? (
                          <div className="text-neutral-600 flex items-center gap-1.5 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                            <span>Out of service / Maintenance</span>
                          </div>
                        ) : (
                          <div className="text-emerald-700 font-medium flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Vacant & Clean (Ready)</span>
                          </div>
                        )}
                      </div>

                      {/* Footer: Quick controls */}
                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[11px] text-neutral-500">
                        <span className="font-medium">Condition: {room.condition}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRoom(room);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-md hover:bg-neutral-100 cursor-pointer"
                            title="Edit Room"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(room.id);
                            }}
                            className="p-1.5 text-red-400 hover:text-red-700 rounded-md hover:bg-red-50 cursor-pointer"
                            title="Delete Room"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredRooms.length === 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-neutral-500">
              <Building2 className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="font-bold text-neutral-800">No rooms match the selected criteria</p>
              <p className="text-xs text-neutral-400 mt-1">Try clearing filters or search terms</p>
            </div>
          )}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                {inspectionMode === 'single' ? (
                  <tr>
                    <th className="px-5 py-3.5 font-bold text-neutral-900">Room #</th>
                    <th className="px-5 py-3.5 font-bold text-neutral-900">Category</th>
                    <th className="px-5 py-3.5 font-bold text-neutral-900">Floor</th>
                    <th className="px-5 py-3.5 font-bold text-neutral-900">Occupancy Status</th>
                    <th className="px-5 py-3.5 font-bold text-neutral-900">Current Guest / Code</th>
                    <th className="px-5 py-3.5 font-bold text-neutral-900">Dates</th>
                    <th className="px-5 py-3.5 font-bold text-neutral-900">Condition</th>
                    <th className="px-5 py-3.5 font-bold text-neutral-900 text-right">Actions</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-5 py-3.5 font-bold text-neutral-900">Room #</th>
                    <th className="px-5 py-3.5 font-bold text-neutral-900">Category</th>
                    <th className="px-5 py-3.5 font-bold text-neutral-900">Floor</th>
                    <th className="px-5 py-3.5 font-bold text-neutral-900">Interval Status</th>
                    <th className="px-5 py-3.5 font-bold text-neutral-900">Free Nights</th>
                    <th className="px-5 py-3.5 font-bold text-neutral-900">Conflicting Bookings</th>
                    <th className="px-5 py-3.5 font-bold text-neutral-900">Condition</th>
                    <th className="px-5 py-3.5 font-bold text-neutral-900 text-right">Actions</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredRooms.map(room => {
                  if (inspectionMode === 'interval') {
                    const intervalOcc = getRoomIntervalOccupancy(room, bookings, startObj, endObj);
                    const badgeClass = 
                      intervalOcc.status === 'Available'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : intervalOcc.status === 'Partially Booked'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : intervalOcc.status === 'Fully Booked'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-neutral-100 text-neutral-700 border-neutral-300';

                    const dotColor =
                      intervalOcc.status === 'Available'
                        ? 'bg-emerald-500'
                        : intervalOcc.status === 'Partially Booked'
                        ? 'bg-amber-500'
                        : intervalOcc.status === 'Fully Booked'
                        ? 'bg-rose-500'
                        : 'bg-neutral-400';

                    return (
                      <tr 
                        key={room.id} 
                        onClick={() => setInspectingRoom(room)}
                        className="hover:bg-neutral-50/80 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3.5 font-black text-neutral-900 text-sm">
                          {room.roomNumber}
                        </td>
                        <td className="px-5 py-3.5 text-neutral-700 font-semibold">
                          {getCategoryName(room.categoryId)}
                        </td>
                        <td className="px-5 py-3.5 text-neutral-500 font-medium">
                          {room.floor || '1st Floor'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                            {intervalOcc.status === 'Available' ? `Free (${nightsCount} Nts)` : intervalOcc.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-neutral-800">
                          <span className="font-bold text-neutral-900">{intervalOcc.availableNightsCount}</span> of {intervalOcc.totalNights} nights free
                        </td>
                        <td className="px-5 py-3.5 text-neutral-600 font-medium">
                          {intervalOcc.conflictingBookings.length > 0 ? (
                            <div>
                              <p className="font-bold text-rose-700">
                                {intervalOcc.conflictingBookings[0].guestDetails.firstName} {intervalOcc.conflictingBookings[0].guestDetails.lastName}
                              </p>
                              <p className="text-[10px] text-neutral-500">
                                {format(new Date(intervalOcc.conflictingBookings[0].checkIn), 'MMM d')} → {format(new Date(intervalOcc.conflictingBookings[0].checkOut), 'MMM d')}
                                {intervalOcc.conflictingBookings.length > 1 && ` (+${intervalOcc.conflictingBookings.length - 1} more)`}
                              </p>
                            </div>
                          ) : (
                            <span className="text-emerald-700 font-medium">None (100% Free)</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            room.condition === 'Clean' ? 'bg-emerald-50 text-emerald-800' : 'bg-yellow-50 text-yellow-800'
                          }`}>
                            {room.condition}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => setEditingRoom(room)} 
                              className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-md hover:bg-neutral-100 cursor-pointer"
                              title="Edit Room"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(room.id)} 
                              className="p-1.5 text-red-400 hover:text-red-700 rounded-md hover:bg-red-50 cursor-pointer"
                              title="Delete Room"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const occInfo = getRoomOccupancyInfo(room, bookings, targetDateObj);

                  return (
                    <tr 
                      key={room.id} 
                      onClick={() => setInspectingRoom(room)}
                      className="hover:bg-neutral-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 font-black text-neutral-900 text-sm">
                        {room.roomNumber}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-700 font-semibold">
                        {getCategoryName(room.categoryId)}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-500 font-medium">
                        {room.floor || '1st Floor'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${occInfo.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${occInfo.dotColor}`} />
                          {occInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-neutral-800">
                        {occInfo.activeBooking ? (
                          <div>
                            <p className="font-bold text-neutral-900">
                              {occInfo.activeBooking.guestDetails.firstName} {occInfo.activeBooking.guestDetails.lastName}
                            </p>
                            <p className="text-[10px] font-mono text-neutral-500">
                              {occInfo.activeBooking.reservationCode}
                            </p>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">None</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-600 font-medium">
                        {occInfo.activeBooking ? (
                          <div>
                            <span>{format(new Date(occInfo.activeBooking.checkIn), 'MMM d')}</span>
                            <span className="text-neutral-400 mx-1">→</span>
                            <span>{format(new Date(occInfo.activeBooking.checkOut), 'MMM d')}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          room.condition === 'Clean' ? 'bg-emerald-50 text-emerald-800' : 'bg-yellow-50 text-yellow-800'
                        }`}>
                          {room.condition}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => setEditingRoom(room)} 
                            className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-md hover:bg-neutral-100 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(room.id)} 
                            className="p-1.5 text-red-400 hover:text-red-700 rounded-md hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Room Detail & Active Reservation Inspection Modal */}
      {inspectingRoom && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {(() => {
              const occInfo = getRoomOccupancyInfo(inspectingRoom, bookings, targetDateObj);
              const cat = categories.find(c => c.id === inspectingRoom.categoryId);
              const b = occInfo.activeBooking;

              return (
                <div>
                  {/* Modal Header */}
                  <div className="p-6 bg-neutral-900 text-white flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                          {inspectingRoom.floor || '1st Floor'}
                        </span>
                        <span className="text-neutral-600">•</span>
                        <span className="text-xs text-neutral-300 font-semibold">{cat?.name}</span>
                      </div>
                      <h2 className="text-2xl font-black text-white">Room {inspectingRoom.roomNumber}</h2>
                    </div>
                    <button 
                      onClick={() => setInspectingRoom(null)} 
                      className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                    {inspectionMode === 'interval' ? (
                      (() => {
                        const intervalOcc = getRoomIntervalOccupancy(inspectingRoom, bookings, startObj, endObj);
                        return (
                          <>
                            {/* Live Interval Occupancy Status Card */}
                            <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200">
                              <div>
                                <p className="text-[11px] font-bold uppercase text-neutral-500">
                                  Interval Status ({format(startObj, 'MMM d')} – {format(endObj, 'MMM d, yyyy')})
                                </p>
                                <p className="text-base font-extrabold text-neutral-900 mt-0.5">
                                  {intervalOcc.availableNightsCount} of {intervalOcc.totalNights} nights available
                                </p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                intervalOcc.status === 'Available'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : intervalOcc.status === 'Partially Booked'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : intervalOcc.status === 'Fully Booked'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                              }`}>
                                {intervalOcc.status}
                              </span>
                            </div>

                            {/* Room Attributes */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                                <span className="text-neutral-500 font-bold">Housekeeping:</span>
                                <p className="text-neutral-900 font-extrabold mt-0.5">{inspectingRoom.condition}</p>
                              </div>
                              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                                <span className="text-neutral-500 font-bold">Base Rate:</span>
                                <p className="text-neutral-900 font-extrabold mt-0.5">{cat?.basePrice?.toLocaleString()} ETB / night</p>
                              </div>
                            </div>

                            {/* Night-by-Night Breakdown */}
                            <div className="border border-neutral-200 rounded-2xl p-4 space-y-3">
                              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                                  Night-by-Night Status ({nightsCount} Nights)
                                </span>
                                <span className="text-xs font-bold text-neutral-500">
                                  {intervalOcc.availableNightsCount} Free
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {intervalOcc.dayBreakdown.map((d, i) => (
                                  <div
                                    key={i}
                                    className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                                      d.isAvailable
                                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                        : 'bg-rose-50/70 border-rose-200 text-rose-900'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold">{format(d.date, 'EEE, MMM d')}</span>
                                      <span className={`w-2 h-2 rounded-full ${d.isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    </div>
                                    <p className="text-[11px] font-semibold mt-1">
                                      {d.isAvailable ? 'Available' : 'Occupied / Reserved'}
                                    </p>
                                    {d.booking && (
                                      <p className="text-[10px] text-rose-700 font-mono truncate mt-0.5">
                                        {d.booking.guestDetails.firstName} {d.booking.guestDetails.lastName}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Conflicting Bookings in this Interval */}
                            {intervalOcc.conflictingBookings.length > 0 ? (
                              <div className="border border-neutral-200 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                                    Overlapping Reservations ({intervalOcc.conflictingBookings.length})
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {intervalOcc.conflictingBookings.map(b => (
                                    <div key={b.id} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1.5 text-xs">
                                      <div className="flex items-center justify-between">
                                        <span className="font-black text-neutral-900">
                                          {b.guestDetails.firstName} {b.guestDetails.lastName}
                                        </span>
                                        <span className="font-mono text-[11px] font-bold text-neutral-600 bg-white px-2 py-0.5 rounded border border-neutral-200">
                                          {b.reservationCode}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-[11px] text-neutral-500">
                                        <span>Stay: {format(new Date(b.checkIn), 'MMM d')} → {format(new Date(b.checkOut), 'MMM d')}</span>
                                        <span className="font-bold text-neutral-700">{b.totalAmount?.toLocaleString()} ETB</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <Link
                                  to={`/admin/reservations`}
                                  className="mt-2 w-full py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-neutral-800 transition"
                                >
                                  Open in Reservations Center <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            ) : (
                              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center text-emerald-900">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                                <p className="text-xs font-bold">100% Free for entire interval!</p>
                                <p className="text-[11px] text-emerald-700 mt-0.5">
                                  No conflicting bookings between {format(startObj, 'MMM d')} and {format(endObj, 'MMM d')}.
                                </p>
                              </div>
                            )}
                          </>
                        );
                      })()
                    ) : (
                      <>
                        {/* Live Occupancy Status Card */}
                        <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200">
                          <div>
                            <p className="text-[11px] font-bold uppercase text-neutral-500">Live Status ({format(targetDateObj, 'MMM d')})</p>
                            <p className="text-base font-extrabold text-neutral-900 mt-0.5">{occInfo.label}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${occInfo.badgeClass}`}>
                            {occInfo.status}
                          </span>
                        </div>

                        {/* Room Attributes */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                            <span className="text-neutral-500 font-bold">Housekeeping:</span>
                            <p className="text-neutral-900 font-extrabold mt-0.5">{inspectingRoom.condition}</p>
                          </div>
                          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                            <span className="text-neutral-500 font-bold">Base Rate:</span>
                            <p className="text-neutral-900 font-extrabold mt-0.5">{cat?.basePrice?.toLocaleString()} ETB / night</p>
                          </div>
                        </div>

                        {/* Booking Details if occupied/reserved */}
                        {b ? (
                          <div className="border border-neutral-200 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                                Current Guest Reservation
                              </span>
                              <span className="font-mono font-bold text-xs bg-neutral-100 px-2 py-0.5 rounded">
                                {b.reservationCode}
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              <p className="text-sm font-black text-neutral-900">
                                {b.guestDetails.firstName} {b.guestDetails.lastName}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-neutral-600">
                                <Phone className="w-3.5 h-3.5 text-neutral-400" />
                                <span>{b.guestDetails.phone}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-neutral-600">
                                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                                <span>{b.guestDetails.email}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100 text-xs">
                              <div>
                                <span className="text-neutral-400 text-[10px] uppercase font-bold">Check-in</span>
                                <p className="font-bold text-neutral-800">{format(new Date(b.checkIn), 'MMM d, yyyy')}</p>
                              </div>
                              <div>
                                <span className="text-neutral-400 text-[10px] uppercase font-bold">Check-out</span>
                                <p className="font-bold text-neutral-800">{format(new Date(b.checkOut), 'MMM d, yyyy')}</p>
                              </div>
                            </div>

                            <div className="pt-2 flex items-center justify-between text-xs">
                              <span className="text-neutral-500">Total Booking Bill:</span>
                              <span className="font-black text-neutral-900">{b.totalAmount?.toLocaleString()} ETB</span>
                            </div>

                            <Link
                              to={`/admin/reservations`}
                              className="mt-2 w-full py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-neutral-800 transition"
                            >
                              View in Reservations Center <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        ) : (
                          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center text-emerald-900">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                            <p className="text-xs font-bold">No active guest staying on this date.</p>
                            <p className="text-[11px] text-emerald-700 mt-0.5">This room is open and available for immediate booking.</p>
                          </div>
                        )}

                        {/* Upcoming Bookings for this room */}
                        {occInfo.upcomingBookings.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                              Upcoming Reservations ({occInfo.upcomingBookings.length})
                            </p>
                            <div className="space-y-1.5">
                              {occInfo.upcomingBookings.slice(0, 3).map(ub => (
                                <div key={ub.id} className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between text-xs">
                                  <div>
                                    <p className="font-bold text-neutral-900">
                                      {ub.guestDetails.firstName} {ub.guestDetails.lastName}
                                    </p>
                                    <p className="text-[10px] text-neutral-500">
                                      {format(new Date(ub.checkIn), 'MMM d')} - {format(new Date(ub.checkOut), 'MMM d')}
                                    </p>
                                  </div>
                                  <span className="font-mono text-[10px] font-bold text-neutral-600 bg-white px-2 py-0.5 rounded border border-neutral-200">
                                    {ub.reservationCode}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        const r = inspectingRoom;
                        setInspectingRoom(null);
                        setEditingRoom(r);
                      }}
                      className="px-4 py-2 text-xs font-bold text-neutral-700 hover:text-neutral-900 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-100 transition"
                    >
                      Edit Room Details
                    </button>
                    <button
                      onClick={() => setInspectingRoom(null)}
                      className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 rounded-xl hover:bg-neutral-800 transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Add / Edit Room Modal */}
      {editingRoom && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-neutral-900 text-white flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Inventory Control</span>
                <h2 className="text-xl font-black text-white">{editingRoom.id ? 'Edit Room Record' : 'Add New Room'}</h2>
              </div>
              <button onClick={() => setEditingRoom(null)} className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Room Number / Name *
                </label>
                <input 
                  type="text" 
                  value={editingRoom.roomNumber} 
                  onChange={e => setEditingRoom({...editingRoom, roomNumber: e.target.value})} 
                  placeholder="e.g. 101, 204, Presidential A"
                  required 
                  className="w-full border-neutral-300 rounded-xl p-3 border text-sm font-medium focus:ring-2 focus:ring-neutral-900 focus:outline-hidden" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Room Category *
                </label>
                <select 
                  value={editingRoom.categoryId} 
                  onChange={e => setEditingRoom({...editingRoom, categoryId: e.target.value})} 
                  className="w-full border-neutral-300 rounded-xl p-3 border text-sm font-semibold focus:ring-2 focus:ring-neutral-900 focus:outline-hidden bg-white"
                >
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name} ({cat.basePrice?.toLocaleString()} ETB)</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Floor / Wing
                </label>
                <input 
                  type="text" 
                  value={editingRoom.floor || ''} 
                  onChange={e => setEditingRoom({...editingRoom, floor: e.target.value})} 
                  placeholder="e.g. 1st Floor, 2nd Floor, Garden Wing"
                  className="w-full border-neutral-300 rounded-xl p-3 border text-sm font-medium focus:ring-2 focus:ring-neutral-900 focus:outline-hidden" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Housekeeping Condition
                  </label>
                  <select 
                    value={editingRoom.condition} 
                    onChange={e => setEditingRoom({...editingRoom, condition: e.target.value as any})} 
                    className="w-full border-neutral-300 rounded-xl p-3 border text-xs font-bold focus:ring-2 focus:ring-neutral-900 focus:outline-hidden bg-white"
                  >
                    {['Clean', 'Dirty', 'Cleaning', 'Inspection Required', 'Maintenance Required'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Status Flag
                  </label>
                  <select 
                    value={editingRoom.status} 
                    onChange={e => setEditingRoom({...editingRoom, status: e.target.value as any})} 
                    className="w-full border-neutral-300 rounded-xl p-3 border text-xs font-bold focus:ring-2 focus:ring-neutral-900 focus:outline-hidden bg-white"
                  >
                    {['Available', 'Reserved', 'Occupied', 'Out of Service', 'Blocked'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100">
                <button 
                  type="button" 
                  onClick={() => setEditingRoom(null)} 
                  className="px-5 py-2.5 font-bold text-xs text-neutral-600 hover:bg-neutral-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white font-bold text-xs rounded-xl hover:bg-neutral-800 disabled:opacity-70 transition cursor-pointer shadow-xs"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Room Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Room from Inventory"
        message="Are you sure you want to delete this room from the inventory? This will remove its entry from front desk room assignment."
        confirmText="Delete Room"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingId(null)}
      />

      {/* Date Interval Availability Modal */}
      {showIntervalModal && (
        <DateIntervalAvailabilityModal
          isOpen={showIntervalModal}
          onClose={() => setShowIntervalModal(false)}
          rooms={rooms}
          categories={categories}
          bookings={bookings}
          halls={halls}
          hallRequests={hallRequests}
          onSelectRoomForBooking={(_room, _startDate, _endDate) => {
            setShowIntervalModal(false);
          }}
          onSelectHallForBooking={(_hall, _startDate, _endDate) => {
            setShowIntervalModal(false);
          }}
        />
      )}
    </div>
  );
}
