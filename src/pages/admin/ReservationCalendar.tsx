import React, { useState } from 'react';
import { Booking, RoomCategory, Room, Hall } from '../../types';
import { UnifiedHallEvent } from '../../lib/occupancyUtils';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths, 
  addDays, 
  subDays, 
  startOfWeek, 
  endOfWeek 
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Building2, 
  Sparkles, 
  ArrowDownRight, 
  ArrowUpRight,
  Users,
  Clock,
  CheckCircle2
} from 'lucide-react';

interface ReservationCalendarProps {
  bookings: Booking[];
  rooms: Room[];
  categories: Record<string, RoomCategory>;
  onSelectBooking: (booking: Booking) => void;
  halls?: Hall[];
  hallEvents?: UnifiedHallEvent[];
  onSelectHallEvent?: (event: UnifiedHallEvent) => void;
}

export default function ReservationCalendar({ 
  bookings, 
  rooms, 
  categories, 
  onSelectBooking,
  halls = [],
  hallEvents = [],
  onSelectHallEvent
}: ReservationCalendarProps) {
  const [resourceType, setResourceType] = useState<'rooms' | 'halls'>('rooms');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrev = () => {
    if (calendarView === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (calendarView === 'week') setCurrentDate(subDays(currentDate, 7));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (calendarView === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (calendarView === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const activeRoomBookings = bookings.filter(b => 
    (b.type === 'room' || !b.type) && !['Cancelled', 'Rejected'].includes(b.status)
  );

  const activeHallEvents = hallEvents.filter(e => 
    !['Cancelled', 'Rejected'].includes(e.status)
  );

  // Determine interval for current view
  let viewDays: Date[] = [];
  if (calendarView === 'month') {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    viewDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  } else if (calendarView === 'week') {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    viewDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  } else {
    // Day view
    viewDays = [currentDate];
  }

  // Find booking for a specific room on a specific day
  const getBookingForRoomAndDay = (roomId: string, day: Date) => {
    const dayTs = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const nextDayTs = dayTs + 86400000;

    return activeRoomBookings.find(b => {
      if (b.roomId !== roomId) return false;
      return b.checkIn < nextDayTs && b.checkOut > dayTs;
    });
  };

  // Find event for a specific hall on a specific day
  const getEventForHallAndDay = (hallId: string, hallName: string, day: Date) => {
    const dayTs = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const nextDayTs = dayTs + 86400000;

    return activeHallEvents.find(e => {
      const matchesHall = e.hallId === hallId || e.hallName.toLowerCase() === hallName.toLowerCase();
      if (!matchesHall) return false;
      return e.startTs < nextDayTs && e.endTs > dayTs;
    });
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
      {/* Calendar Top Controls */}
      <div className="p-4 border-b border-neutral-200 flex flex-col md:flex-row items-center justify-between gap-4 bg-neutral-50">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-neutral-600" />
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              {calendarView === 'month' && format(currentDate, 'MMMM yyyy')}
              {calendarView === 'week' && `Week of ${format(viewDays[0] || currentDate, 'MMM d, yyyy')}`}
              {calendarView === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
            </h2>
            <p className="text-[11px] text-neutral-500 font-medium">
              Showing live {resourceType === 'rooms' ? 'hotel rooms' : 'event halls'} availability & reservations
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Resource Selector: Rooms vs Halls */}
          <div className="flex bg-neutral-200 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setResourceType('rooms')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                resourceType === 'rooms' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Rooms Matrix ({rooms.length})
            </button>
            <button
              onClick={() => setResourceType('halls')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                resourceType === 'halls' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Halls Matrix ({halls.length})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-neutral-200 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setCalendarView('day')}
              className={`px-3 py-1.5 rounded-md transition-colors ${calendarView === 'day' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Daily
            </button>
            <button
              onClick={() => setCalendarView('week')}
              className={`px-3 py-1.5 rounded-md transition-colors ${calendarView === 'week' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setCalendarView('month')}
              className={`px-3 py-1.5 rounded-md transition-colors ${calendarView === 'month' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Monthly
            </button>
          </div>

          {/* Navigation controls */}
          <div className="flex items-center gap-1">
            <button onClick={handlePrev} className="p-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-semibold bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 cursor-pointer">
              Today
            </button>
            <button onClick={handleNext} className="p-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend Indicator Bar */}
      <div className="px-4 py-2 bg-neutral-50/70 border-b border-neutral-200 flex flex-wrap items-center gap-4 text-xs font-medium text-neutral-600">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Available / Open</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Reserved (Approved/Confirmed)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <span>{resourceType === 'rooms' ? 'Occupied (Checked In)' : 'In Event Today'}</span>
        </div>
        {resourceType === 'rooms' && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span>Needs Cleaning</span>
          </div>
        )}
      </div>

      {/* View Rendering */}
      {calendarView === 'month' ? (
        <div>
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-100/60">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2.5 text-center text-xs font-bold text-neutral-600 uppercase tracking-wider border-r border-neutral-200 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr">
            {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2 border-r border-b border-neutral-100 bg-neutral-50/40 min-h-[110px]" />
            ))}
            
            {viewDays.map(day => {
              const dayTs = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
              const nextDayTs = dayTs + 86400000;

              const isCurrentDay = isSameDay(day, new Date());

              // Get day events/bookings based on resourceType
              const dayRoomBookings = activeRoomBookings.filter(b => b.checkIn < nextDayTs && b.checkOut > dayTs);
              const dayHallEvents = activeHallEvents.filter(e => e.startTs < nextDayTs && e.endTs > dayTs);

              return (
                <div 
                  key={day.toISOString()} 
                  className={`p-2 border-r border-b border-neutral-200 min-h-[110px] flex flex-col justify-between transition-colors ${
                    isCurrentDay ? 'bg-amber-50/30' : 'bg-white hover:bg-neutral-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      isCurrentDay ? 'bg-neutral-900 text-white' : 'text-neutral-700'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    <span className="text-[10px] font-semibold text-neutral-400">
                      {resourceType === 'rooms' 
                        ? `${dayRoomBookings.length} booked`
                        : `${dayHallEvents.length} events`}
                    </span>
                  </div>

                  <div className="space-y-1 flex-1 overflow-hidden">
                    {resourceType === 'rooms' ? (
                      <>
                        {dayRoomBookings.slice(0, 3).map(b => (
                          <div
                            key={b.id}
                            onClick={() => onSelectBooking(b)}
                            className={`text-[11px] px-1.5 py-0.5 rounded-md truncate cursor-pointer font-medium transition-all ${
                              b.status === 'Checked In' 
                                ? 'bg-blue-600 text-white shadow-2xs' 
                                : b.status === 'Approved' 
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                            title={`${b.guestDetails.firstName} ${b.guestDetails.lastName} - ${b.status} (${b.reservationCode})`}
                          >
                            {b.guestDetails.lastName} {b.roomId ? `(Rm ${rooms.find(r => r.id === b.roomId)?.roomNumber || b.roomId})` : ''}
                          </div>
                        ))}
                        {dayRoomBookings.length > 3 && (
                          <div className="text-[10px] text-neutral-500 font-bold px-1">
                            +{dayRoomBookings.length - 3} more
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {dayHallEvents.slice(0, 3).map(e => (
                          <div
                            key={e.id}
                            onClick={() => onSelectHallEvent && onSelectHallEvent(e)}
                            className="text-[11px] px-1.5 py-0.5 rounded-md truncate cursor-pointer font-medium bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs"
                            title={`${e.hallName}: ${e.eventType} - ${e.organizerName} (${e.status})`}
                          >
                            <span className="font-bold">{e.hallName}:</span> {e.organizerName}
                          </div>
                        ))}
                        {dayHallEvents.length > 3 && (
                          <div className="text-[10px] text-neutral-500 font-bold px-1">
                            +{dayHallEvents.length - 3} more
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Matrix View (Weekly or Daily) */
        <div className="overflow-x-auto">
          {resourceType === 'rooms' ? (
            /* ROOMS MATRIX */
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-100 border-b border-neutral-200">
                  <th className="p-3 text-xs font-bold text-neutral-700 uppercase tracking-wider w-48 sticky left-0 bg-neutral-100 z-10">
                    Room / Category
                  </th>
                  {viewDays.map(day => (
                    <th key={day.toISOString()} className="p-3 text-center border-l border-neutral-200 min-w-[130px]">
                      <div className="text-xs font-bold text-neutral-900">{format(day, 'EEE, MMM d')}</div>
                      {isSameDay(day, new Date()) && (
                        <span className="text-[10px] bg-neutral-900 text-white px-2 py-0.5 rounded-full font-bold inline-block mt-0.5">
                          TODAY
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {rooms.map(room => {
                  const category = categories[room.categoryId];

                  return (
                    <tr key={room.id} className="hover:bg-neutral-50/50">
                      {/* Room Info Sticky Cell */}
                      <td className="p-3 bg-white border-r border-neutral-200 sticky left-0 z-10 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm text-neutral-900">Room {room.roomNumber}</p>
                            <p className="text-xs text-neutral-500">{category?.name || 'Standard'}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            room.status === 'Occupied' ? 'bg-rose-100 text-rose-800' :
                            room.status === 'Available' ? 'bg-emerald-100 text-emerald-800' :
                            room.status === 'Out of Service' ? 'bg-neutral-800 text-white' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {room.status}
                          </span>
                        </div>
                        {room.condition !== 'Clean' && (
                          <p className="text-[10px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" /> {room.condition}
                          </p>
                        )}
                      </td>

                      {/* Matrix Cells per Day */}
                      {viewDays.map(day => {
                        const booking = getBookingForRoomAndDay(room.id, day);
                        const isArrivalDay = booking && isSameDay(new Date(booking.checkIn), day);
                        const isDepartureDay = booking && isSameDay(new Date(booking.checkOut), day);

                        return (
                          <td key={day.toISOString()} className="p-2 border-l border-neutral-200 text-center align-top relative">
                            {booking ? (
                              <div 
                                onClick={() => onSelectBooking(booking)}
                                className={`p-2 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-transform hover:scale-[1.02] text-left ${
                                  booking.status === 'Checked In' ? 'bg-blue-600 text-white' :
                                  booking.status === 'Approved' ? 'bg-emerald-600 text-white' :
                                  'bg-amber-500 text-white'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold truncate">{booking.guestDetails.lastName}</span>
                                  {isArrivalDay && <ArrowDownRight className="w-3.5 h-3.5 text-emerald-200 shrink-0" title="Check-in today" />}
                                  {isDepartureDay && <ArrowUpRight className="w-3.5 h-3.5 text-amber-200 shrink-0" title="Check-out today" />}
                                </div>
                                <p className="text-[10px] opacity-90 font-mono truncate">{booking.reservationCode}</p>
                                <p className="text-[10px] opacity-80 mt-0.5">{booking.status}</p>
                              </div>
                            ) : (
                              <div className="h-full min-h-[50px] flex items-center justify-center text-[10px] text-emerald-700 font-medium bg-emerald-50/40 rounded-lg">
                                Available
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {rooms.length === 0 && (
                  <tr>
                    <td colSpan={viewDays.length + 1} className="p-8 text-center text-neutral-500 text-sm">
                      No rooms in inventory. Add rooms in Room Inventory to see matrix.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            /* HALLS MATRIX */
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-100 border-b border-neutral-200">
                  <th className="p-3 text-xs font-bold text-neutral-700 uppercase tracking-wider w-56 sticky left-0 bg-neutral-100 z-10">
                    Event Hall / Venue
                  </th>
                  {viewDays.map(day => (
                    <th key={day.toISOString()} className="p-3 text-center border-l border-neutral-200 min-w-[140px]">
                      <div className="text-xs font-bold text-neutral-900">{format(day, 'EEE, MMM d')}</div>
                      {isSameDay(day, new Date()) && (
                        <span className="text-[10px] bg-neutral-900 text-white px-2 py-0.5 rounded-full font-bold inline-block mt-0.5">
                          TODAY
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {halls.map(hall => {
                  return (
                    <tr key={hall.id} className="hover:bg-neutral-50/50">
                      {/* Hall Info Sticky Cell */}
                      <td className="p-3 bg-white border-r border-neutral-200 sticky left-0 z-10 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm text-neutral-900">{hall.name}</p>
                            <p className="text-xs text-neutral-500 flex items-center gap-1">
                              <Users className="w-3 h-3" /> Max {hall.capacity} guests
                            </p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            hall.status === false ? 'bg-neutral-800 text-white' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {hall.status === false ? 'Inactive' : 'Active'}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-neutral-800 mt-1">
                          {hall.price?.toLocaleString()} ETB <span className="font-normal text-neutral-500">/ day</span>
                        </p>
                      </td>

                      {/* Matrix Cells per Day */}
                      {viewDays.map(day => {
                        const event = getEventForHallAndDay(hall.id, hall.name, day);
                        const isEventToday = event && isSameDay(day, new Date());

                        return (
                          <td key={day.toISOString()} className="p-2 border-l border-neutral-200 text-center align-top relative">
                            {event ? (
                              <div 
                                onClick={() => onSelectHallEvent && onSelectHallEvent(event)}
                                className={`p-2.5 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-transform hover:scale-[1.02] text-left ${
                                  isEventToday 
                                    ? 'bg-rose-600 text-white' 
                                    : ['Approved', 'Confirmed'].includes(event.status)
                                      ? 'bg-purple-700 text-white' 
                                      : 'bg-amber-600 text-white'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold truncate">{event.eventType}</span>
                                  <span className="text-[9px] uppercase px-1 py-0.2 bg-white/20 rounded font-bold">
                                    {event.status}
                                  </span>
                                </div>
                                <p className="text-[11px] opacity-95 truncate font-medium">{event.organizerName}</p>
                                <p className="text-[10px] opacity-80 mt-0.5 font-mono truncate">{event.reservationCode}</p>
                                <p className="text-[10px] opacity-75 mt-0.5 flex items-center gap-1">
                                  <Users className="w-3 h-3" /> {event.numberOfGuests} guests • {event.timeSlot || 'Full Day'}
                                </p>
                              </div>
                            ) : (
                              <div className="h-full min-h-[55px] flex items-center justify-center text-[11px] text-emerald-700 font-semibold bg-emerald-50/50 rounded-lg">
                                Available (Open)
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {halls.length === 0 && (
                  <tr>
                    <td colSpan={viewDays.length + 1} className="p-8 text-center text-neutral-500 text-sm">
                      No event halls configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
