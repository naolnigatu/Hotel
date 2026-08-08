import React, { useState } from 'react';
import { Booking, RoomCategory, Room } from '../../types';
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
  endOfWeek,
  isWithinInterval
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Sparkles, AlertTriangle, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface ReservationCalendarProps {
  bookings: Booking[];
  rooms: Room[];
  categories: Record<string, RoomCategory>;
  onSelectBooking: (booking: Booking) => void;
}

export default function ReservationCalendar({ bookings, rooms, categories, onSelectBooking }: ReservationCalendarProps) {
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

  const activeBookings = bookings.filter(b => !['Cancelled', 'Rejected'].includes(b.status));

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

    return activeBookings.find(b => {
      if (b.roomId !== roomId) return false;
      return b.checkIn < nextDayTs && b.checkOut > dayTs;
    });
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
      {/* Calendar Top Controls */}
      <div className="p-4 border-b border-neutral-200 flex flex-col md:flex-row items-center justify-between gap-4 bg-neutral-50">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-neutral-600" />
          <h2 className="text-lg font-bold text-neutral-900">
            {calendarView === 'month' && format(currentDate, 'MMMM yyyy')}
            {calendarView === 'week' && `Week of ${format(viewDays[0] || currentDate, 'MMM d, yyyy')}`}
            {calendarView === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-neutral-200 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setCalendarView('day')}
              className={`px-3 py-1.5 rounded-md transition-colors ${calendarView === 'day' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Daily Matrix
            </button>
            <button
              onClick={() => setCalendarView('week')}
              className={`px-3 py-1.5 rounded-md transition-colors ${calendarView === 'week' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Weekly Grid
            </button>
            <button
              onClick={() => setCalendarView('month')}
              className={`px-3 py-1.5 rounded-md transition-colors ${calendarView === 'month' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Monthly Calendar
            </button>
          </div>

          <div className="flex gap-1">
            <button onClick={handlePrev} className="p-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-medium bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100">
              Today
            </button>
            <button onClick={handleNext} className="p-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* View Rendering */}
      {calendarView === 'month' ? (
        <div>
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-100/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center text-xs font-semibold text-neutral-600 uppercase tracking-wider border-r border-neutral-200 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr">
            {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2 border-r border-b border-neutral-100 bg-neutral-50/50 min-h-[110px]" />
            ))}
            
            {viewDays.map(day => {
              const dayTs = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
              const nextDayTs = dayTs + 86400000;

              const dayBookings = activeBookings.filter(b => b.checkIn < nextDayTs && b.checkOut > dayTs);
              const arrivals = activeBookings.filter(b => isSameDay(new Date(b.checkIn), day));
              const departures = activeBookings.filter(b => isSameDay(new Date(b.checkOut), day));

              return (
                <div key={day.toISOString()} className="p-2 border-r border-b border-neutral-100 min-h-[110px] bg-white last:border-r-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isSameDay(day, new Date()) ? 'bg-neutral-900 text-white' : 'text-neutral-700'}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex gap-1 text-[10px]">
                      {arrivals.length > 0 && (
                        <span className="bg-green-100 text-green-800 font-bold px-1 rounded flex items-center" title={`${arrivals.length} arrivals`}>
                          ↓{arrivals.length}
                        </span>
                      )}
                      {departures.length > 0 && (
                        <span className="bg-orange-100 text-orange-800 font-bold px-1 rounded flex items-center" title={`${departures.length} departures`}>
                          ↑{departures.length}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1 mt-1">
                    {dayBookings.slice(0, 3).map(b => (
                      <div 
                        key={b.id} 
                        onClick={() => onSelectBooking(b)}
                        className={`text-[11px] px-1.5 py-1 rounded truncate cursor-pointer font-medium transition-all ${
                          b.status === 'Checked In' ? 'bg-blue-600 text-white' :
                          b.status === 'Approved' ? 'bg-green-100 text-green-900 border border-green-300' :
                          'bg-orange-100 text-orange-900 border border-orange-200'
                        }`}
                        title={`${b.guestDetails.firstName} ${b.guestDetails.lastName} - ${b.status} (Code: ${b.reservationCode})`}
                      >
                        {b.guestDetails.lastName} {b.roomId ? `(Rm ${rooms.find(r => r.id === b.roomId)?.roomNumber})` : ''}
                      </div>
                    ))}
                    {dayBookings.length > 3 && (
                      <div className="text-[10px] text-neutral-500 font-medium px-1">
                        +{dayBookings.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Room-by-Room Matrix View (Weekly or Daily) */
        <div className="overflow-x-auto">
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
                    <td className="p-3 bg-white border-r border-neutral-200 sticky left-0 z-10 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm text-neutral-900">Room {room.roomNumber}</p>
                          <p className="text-xs text-neutral-500">{category?.name || 'Standard'}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          room.status === 'Occupied' ? 'bg-red-100 text-red-800' :
                          room.status === 'Available' ? 'bg-green-100 text-green-800' :
                          room.status === 'Out of Service' ? 'bg-neutral-800 text-white' : 'bg-orange-100 text-orange-800'
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
                              className={`p-2 rounded-lg text-xs font-semibold cursor-pointer shadow-sm transition-transform hover:scale-[1.02] text-left ${
                                booking.status === 'Checked In' ? 'bg-blue-600 text-white' :
                                booking.status === 'Approved' ? 'bg-emerald-600 text-white' :
                                'bg-amber-500 text-white'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold truncate">{booking.guestDetails.lastName}</span>
                                {isArrivalDay && <ArrowDownRight className="w-3.5 h-3.5 text-green-200 shrink-0" title="Check-in today" />}
                                {isDepartureDay && <ArrowUpRight className="w-3.5 h-3.5 text-orange-200 shrink-0" title="Check-out today" />}
                              </div>
                              <p className="text-[10px] opacity-90 font-mono truncate">{booking.reservationCode}</p>
                              <p className="text-[10px] opacity-80 mt-0.5">{booking.status}</p>
                            </div>
                          ) : (
                            <div className="h-full min-h-[50px] flex items-center justify-center text-[10px] text-neutral-300">
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
        </div>
      )}
    </div>
  );
}
