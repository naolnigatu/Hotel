import React, { useState, useMemo } from 'react';
import { Room, RoomCategory, Booking, Hall, HallBookingRequest } from '../../types';
import { 
  getRoomIntervalOccupancy, 
  getRoomsIntervalSummary, 
  getHallIntervalOccupancy, 
  getHallsIntervalSummary 
} from '../../lib/occupancyUtils';
import { 
  X, 
  Calendar, 
  CalendarRange, 
  Building2, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Filter, 
  ArrowRight,
  Sparkles,
  BedDouble
} from 'lucide-react';
import { format, addDays, differenceInCalendarDays, startOfDay, nextFriday, nextSunday, isFriday, isSaturday, isSunday } from 'date-fns';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface DateIntervalAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  categories: Record<string, RoomCategory> | RoomCategory[];
  bookings: Booking[];
  halls?: Hall[];
  hallRequests?: HallBookingRequest[];
  onSelectRoomForBooking?: (room: Room, startDate: string, endDate: string) => void;
  onSelectHallForBooking?: (hall: Hall, startDate: string, endDate: string) => void;
}

export default function DateIntervalAvailabilityModal({
  isOpen,
  onClose,
  rooms,
  categories,
  bookings,
  halls = [],
  hallRequests = [],
  onSelectRoomForBooking,
  onSelectHallForBooking
}: DateIntervalAvailabilityModalProps) {
  useBodyScrollLock(isOpen);

  // Normalize category map whether array or dictionary is passed
  const categoryMap: Record<string, RoomCategory> = useMemo(() => {
    if (Array.isArray(categories)) {
      const map: Record<string, RoomCategory> = {};
      categories.forEach(c => {
        if (c?.id) map[c.id] = c;
      });
      return map;
    }
    return categories || {};
  }, [categories]);

  // Default dates: tomorrow to +3 days
  const today = new Date();
  const defaultStart = format(today, 'yyyy-MM-dd');
  const defaultEnd = format(addDays(today, 2), 'yyyy-MM-dd');

  const [startDateStr, setStartDateStr] = useState<string>(defaultStart);
  const [endDateStr, setEndDateStr] = useState<string>(defaultEnd);

  // Active resource tab: 'rooms' | 'halls' | 'all'
  const [resourceTab, setResourceTab] = useState<'all' | 'rooms' | 'halls'>('all');

  // Filter options
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [minGuests, setMinGuests] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const startObj = new Date(`${startDateStr}T00:00:00`);
  const endObj = new Date(`${endDateStr}T00:00:00`);
  
  // Safe nights calculation
  const nightsCount = Math.max(1, differenceInCalendarDays(endObj, startObj));
  const daysCount = Math.max(1, differenceInCalendarDays(endObj, startObj) + 1);

  // Quick preset handlers
  const applyPreset = (preset: 'tonight' | 'weekend' | '3days' | '7days' | 'nextWeek') => {
    const now = new Date();
    if (preset === 'tonight') {
      setStartDateStr(format(now, 'yyyy-MM-dd'));
      setEndDateStr(format(addDays(now, 1), 'yyyy-MM-dd'));
    } else if (preset === 'weekend') {
      const fri = isFriday(now) ? now : nextFriday(now);
      const sun = isSunday(fri) ? fri : nextSunday(fri);
      setStartDateStr(format(fri, 'yyyy-MM-dd'));
      setEndDateStr(format(sun, 'yyyy-MM-dd'));
    } else if (preset === '3days') {
      setStartDateStr(format(now, 'yyyy-MM-dd'));
      setEndDateStr(format(addDays(now, 3), 'yyyy-MM-dd'));
    } else if (preset === '7days') {
      setStartDateStr(format(now, 'yyyy-MM-dd'));
      setEndDateStr(format(addDays(now, 7), 'yyyy-MM-dd'));
    } else if (preset === 'nextWeek') {
      const nextMon = addDays(now, (8 - now.getDay()) % 7 || 7);
      setStartDateStr(format(nextMon, 'yyyy-MM-dd'));
      setEndDateStr(format(addDays(nextMon, 5), 'yyyy-MM-dd'));
    }
  };

  // Summaries
  const roomsSummary = getRoomsIntervalSummary(rooms, bookings, startObj, endObj);
  const hallsSummary = getHallsIntervalSummary(halls, hallRequests, startObj, endObj, bookings);

  // Process room occupancy records
  const processedRooms = rooms.map(room => {
    const occ = getRoomIntervalOccupancy(room, bookings, startObj, endObj);
    const cat = categoryMap[room.categoryId];
    const pricePerNight = cat?.basePrice || 0;
    const totalPrice = pricePerNight * nightsCount;
    return {
      room,
      category: cat,
      occ,
      pricePerNight,
      totalPrice
    };
  });

  // Process hall occupancy records
  const processedHalls = halls.map(hall => {
    const occ = getHallIntervalOccupancy(hall, hallRequests, startObj, endObj, bookings);
    return {
      hall,
      occ
    };
  });

  // Filtered rooms
  const filteredRooms = processedRooms.filter(item => {
    if (onlyAvailable && item.occ.status !== 'Available') return false;
    if (selectedCategoryId !== 'ALL' && item.room.categoryId !== selectedCategoryId) return false;
    if (minGuests > 1 && (item.category as any)?.capacity && (item.category as any).capacity < minGuests) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = item.room.roomNumber.toLowerCase().includes(q);
      const matchCat = item.category?.name.toLowerCase().includes(q);
      if (!matchNum && !matchCat) return false;
    }
    return true;
  });

  // Filtered halls
  const filteredHalls = processedHalls.filter(item => {
    if (onlyAvailable && item.occ.status !== 'Available') return false;
    if (item.hall.capacity && item.hall.capacity < minGuests) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.hall.name.toLowerCase().includes(q);
      const matchDesc = (item.hall.description || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-neutral-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-neutral-800 rounded-2xl text-emerald-400 border border-neutral-700">
              <CalendarRange className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">
                  Date Interval Availability Inspector
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                  Live Engine
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Check 100% free rooms and event halls for any custom check-in & check-out stay or event span.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date Selector & Interval Presets Bar */}
        <div className="bg-neutral-50 p-4 sm:p-5 border-b border-neutral-200 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Start Date */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5">
                Start Date (Check-in)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDateStr}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setStartDateStr(newStart);
                    if (newStart >= endDateStr) {
                      setEndDateStr(format(addDays(new Date(`${newStart}T00:00:00`), 1), 'yyyy-MM-dd'));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5">
                End Date (Check-out)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDateStr}
                  min={format(addDays(new Date(`${startDateStr}T00:00:00`), 1), 'yyyy-MM-dd')}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            {/* Calculated Interval Duration Box */}
            <div className="bg-white p-3 rounded-xl border border-neutral-200 flex flex-col justify-center">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Stay & Event Span</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-base font-black text-neutral-900">
                  {nightsCount} {nightsCount === 1 ? 'Night' : 'Nights'}
                </span>
                <span className="text-neutral-300">•</span>
                <span className="text-xs font-bold text-neutral-600">
                  {daysCount} {daysCount === 1 ? 'Day' : 'Days'}
                </span>
              </div>
              <span className="text-[10px] text-neutral-500 font-medium">
                {format(startObj, 'MMM d')} → {format(endObj, 'MMM d, yyyy')}
              </span>
            </div>

            {/* Guests count input */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5">
                Min. Capacity (Guests)
              </label>
              <input
                type="number"
                min={1}
                max={2000}
                value={minGuests}
                onChange={(e) => setMinGuests(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          {/* Quick Date Range Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold text-neutral-500 mr-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Quick Presets:
            </span>
            <button
              onClick={() => applyPreset('tonight')}
              className="px-2.5 py-1 text-xs font-bold bg-white text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-900 hover:text-white transition"
            >
              Tonight (1 Night)
            </button>
            <button
              onClick={() => applyPreset('weekend')}
              className="px-2.5 py-1 text-xs font-bold bg-white text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-900 hover:text-white transition"
            >
              This Weekend (Fri - Sun)
            </button>
            <button
              onClick={() => applyPreset('3days')}
              className="px-2.5 py-1 text-xs font-bold bg-white text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-900 hover:text-white transition"
            >
              Next 3 Days
            </button>
            <button
              onClick={() => applyPreset('7days')}
              className="px-2.5 py-1 text-xs font-bold bg-white text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-900 hover:text-white transition"
            >
              Next 7 Days (1 Week)
            </button>
            <button
              onClick={() => applyPreset('nextWeek')}
              className="px-2.5 py-1 text-xs font-bold bg-white text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-900 hover:text-white transition"
            >
              Next Mon - Fri
            </button>
          </div>
        </div>

        {/* Live Metrics Radar for Chosen Interval */}
        <div className="px-5 py-3.5 bg-neutral-100/70 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {/* Rooms Radar */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-neutral-200 shadow-2xs">
              <BedDouble className="w-4 h-4 text-neutral-700" />
              <span className="font-bold text-neutral-700">Rooms:</span>
              <span className="font-extrabold text-emerald-700">
                {roomsSummary.available} 100% Free
              </span>
              <span className="text-neutral-300">•</span>
              <span className="font-bold text-amber-700">
                {roomsSummary.partiallyBooked} Partial
              </span>
              <span className="text-neutral-300">•</span>
              <span className="font-bold text-rose-700">
                {roomsSummary.fullyBooked} Booked
              </span>
            </div>

            {/* Halls Radar */}
            {halls.length > 0 && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-neutral-200 shadow-2xs">
                <Users className="w-4 h-4 text-purple-700" />
                <span className="font-bold text-neutral-700">Halls:</span>
                <span className="font-extrabold text-emerald-700">
                  {hallsSummary.available} 100% Free
                </span>
                <span className="text-neutral-300">•</span>
                <span className="font-bold text-amber-700">
                  {hallsSummary.partiallyBooked} Partial
                </span>
                <span className="text-neutral-300">•</span>
                <span className="font-bold text-rose-700">
                  {hallsSummary.fullyBooked} Booked
                </span>
              </div>
            )}
          </div>

          {/* Availability Filter Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyAvailable(!onlyAvailable)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                onlyAvailable 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {onlyAvailable ? 'Showing Only 100% Free Spaces' : 'Showing All (Free & Booked)'}
            </button>
          </div>
        </div>

        {/* Controls and Search Bar */}
        <div className="px-5 py-3 bg-white border-b border-neutral-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Resource tab selector */}
          <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-bold self-start">
            <button
              onClick={() => setResourceTab('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                resourceTab === 'all' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All Spaces ({filteredRooms.length + filteredHalls.length})
            </button>
            <button
              onClick={() => setResourceTab('rooms')}
              className={`px-3 py-1.5 rounded-lg transition ${
                resourceTab === 'rooms' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Rooms ({filteredRooms.length})
            </button>
            {halls.length > 0 && (
              <button
                onClick={() => setResourceTab('halls')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  resourceTab === 'halls' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Event Halls ({filteredHalls.length})
              </button>
            )}
          </div>

          {/* Secondary Filters: Room Category and Search */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            {resourceTab !== 'halls' && (
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-800"
              >
                <option value="ALL">All Categories</option>
                {Object.values(categoryMap).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            )}

            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search number, category, hall..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Results Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-neutral-50/50">
          
          {/* ROOM RESULTS */}
          {(resourceTab === 'all' || resourceTab === 'rooms') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BedDouble className="w-4 h-4 text-neutral-700" />
                  <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                    Hotel Rooms ({filteredRooms.length})
                  </h3>
                </div>
                <span className="text-xs text-neutral-500 font-semibold">
                  Total for {nightsCount} {nightsCount === 1 ? 'Night' : 'Nights'}
                </span>
              </div>

              {filteredRooms.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-neutral-200 text-center space-y-2">
                  <p className="text-sm font-bold text-neutral-700">No rooms match this interval criteria.</p>
                  <p className="text-xs text-neutral-500">
                    Try adjusting your dates, unchecking "Only 100% Free", or lowering capacity.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredRooms.map(({ room, category, occ, pricePerNight, totalPrice }) => (
                    <div
                      key={room.id}
                      className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div>
                        {/* Top info */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div>
                            <span className="text-base font-black text-neutral-900">
                              Room {room.roomNumber}
                            </span>
                            <span className="text-xs text-neutral-400 ml-1.5 font-semibold">
                              ({room.floor || '1st Floor'})
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${occ.badgeClass}`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${occ.dotColor}`} />
                            {occ.status === 'Available' ? '100% Free' : occ.status}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-neutral-600 mb-2">
                          {category?.name || 'Standard Room'} • {category?.basePrice ? `${category.basePrice.toLocaleString()} ETB / night` : 'Standard Rate'}
                        </p>

                        {/* Day by Day Breakdown Strip */}
                        <div className="bg-neutral-50 p-2 rounded-xl border border-neutral-100 my-2">
                          <span className="text-[10px] font-bold text-neutral-500 block mb-1">
                            Night-by-Night Availability:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {occ.dayBreakdown.map((d, i) => (
                              <span
                                key={i}
                                title={d.isAvailable ? 'Available' : `Booked by ${d.booking?.guestDetails.firstName} ${d.booking?.guestDetails.lastName}`}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${
                                  d.isAvailable 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {format(d.date, 'dd')}: {d.isAvailable ? '✓ Free' : '✗ Booked'}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Price Breakdown */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-100 mt-2">
                          <span className="text-neutral-500">
                            ${pricePerNight}/night × {nightsCount}
                          </span>
                          <span className="font-extrabold text-neutral-900 text-sm">
                            ${totalPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="mt-3 pt-2">
                        {occ.status === 'Available' ? (
                          <button
                            onClick={() => {
                              if (onSelectRoomForBooking) {
                                onSelectRoomForBooking(room, startDateStr, endDateStr);
                              }
                              onClose();
                            }}
                            className="w-full py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition flex items-center justify-center gap-1.5"
                          >
                            <span>Book Room {room.roomNumber}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <div className="text-[11px] text-neutral-500 text-center py-1.5 font-semibold bg-neutral-100 rounded-xl">
                            {occ.conflictingBookings.length} conflict(s) during stay
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HALL RESULTS */}
          {(resourceTab === 'all' || resourceTab === 'halls') && halls.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-neutral-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-700" />
                  <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                    Conference & Event Halls ({filteredHalls.length})
                  </h3>
                </div>
                <span className="text-xs text-neutral-500 font-semibold">
                  Event span: {daysCount} {daysCount === 1 ? 'Day' : 'Days'}
                </span>
              </div>

              {filteredHalls.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-neutral-200 text-center space-y-2">
                  <p className="text-sm font-bold text-neutral-700">No event halls match this interval.</p>
                  <p className="text-xs text-neutral-500">
                    Try different event dates or adjust capacity filters.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredHalls.map(({ hall, occ }) => (
                    <div
                      key={hall.id}
                      className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div>
                        {/* Top info */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-base font-black text-neutral-900 truncate">
                            {hall.name}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${occ.badgeClass}`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${occ.dotColor}`} />
                            {occ.status === 'Available' ? '100% Free' : occ.status}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-neutral-600 mb-2">
                          Capacity: {hall.capacity || 100} Guests
                        </p>

                        {/* Day by Day Breakdown Strip */}
                        <div className="bg-neutral-50 p-2 rounded-xl border border-neutral-100 my-2">
                          <span className="text-[10px] font-bold text-neutral-500 block mb-1">
                            Daily Venue Status:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {occ.dayBreakdown.map((d, i) => (
                              <span
                                key={i}
                                title={d.isAvailable ? 'Available' : `Event: ${d.event?.organizerName} (${d.event?.eventType})`}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${
                                  d.isAvailable 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {format(d.date, 'MMM dd')}: {d.isAvailable ? '✓ Open' : '✗ Event'}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-100 mt-2">
                          <span className="text-neutral-500">Rate</span>
                          <span className="font-extrabold text-neutral-900">
                            {hall.price ? `${hall.price.toLocaleString()} ETB` : 'Contact for rate'}
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="mt-3 pt-2">
                        {occ.status === 'Available' ? (
                          <button
                            onClick={() => {
                              if (onSelectHallForBooking) {
                                onSelectHallForBooking(hall, startDateStr, endDateStr);
                              }
                              onClose();
                            }}
                            className="w-full py-2 bg-purple-700 text-white rounded-xl text-xs font-bold hover:bg-purple-800 transition flex items-center justify-center gap-1.5"
                          >
                            <span>Reserve Venue</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <div className="text-[11px] text-neutral-500 text-center py-1.5 font-semibold bg-neutral-100 rounded-xl">
                            {occ.conflictingEvents.length} event(s) already scheduled
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-neutral-200 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            Selected interval: <span className="font-bold text-neutral-800">{format(startObj, 'EEE, MMM d')}</span> to <span className="font-bold text-neutral-800">{format(endObj, 'EEE, MMM d, yyyy')}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-100 text-neutral-800 hover:bg-neutral-200 text-xs font-bold rounded-xl transition"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
}
