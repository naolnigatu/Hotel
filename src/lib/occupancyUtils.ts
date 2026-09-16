import { Room, Booking, Hall, HallBookingRequest } from '../types';
import { isSameDay, startOfDay, endOfDay, addDays, differenceInCalendarDays, format } from 'date-fns';

export type RoomOccupancyStatus = 
  | 'Available' 
  | 'Reserved' 
  | 'Occupied' 
  | 'Needs Cleaning' 
  | 'Out of Service';

export interface RoomOccupancyInfo {
  status: RoomOccupancyStatus;
  label: string;
  badgeClass: string;
  dotColor: string;
  activeBooking: Booking | null;
  upcomingBookings: Booking[];
  isArrivingToday: boolean;
  isDepartingToday: boolean;
}

export type HallOccupancyStatus = 
  | 'Available' 
  | 'Reserved' 
  | 'Occupied' 
  | 'Inactive';

export interface UnifiedHallEvent {
  id: string;
  reservationCode: string;
  hallId: string;
  hallName: string;
  eventType: string;
  organizerName: string;
  email: string;
  phone: string;
  startDate: string;
  endDate?: string;
  timeSlot?: string;
  numberOfGuests: number;
  totalPrice: number;
  status: string;
  startTs: number;
  endTs: number;
  source: 'hall_request' | 'booking';
  rawRequest?: HallBookingRequest;
}

export interface HallOccupancyInfo {
  status: HallOccupancyStatus;
  label: string;
  badgeClass: string;
  dotColor: string;
  activeEvent: UnifiedHallEvent | null;
  upcomingEvents: UnifiedHallEvent[];
  allEvents: UnifiedHallEvent[];
}

/**
 * Normalizes a single HallBookingRequest into a UnifiedHallEvent
 */
export function normalizeHallEvent(req: HallBookingRequest): UnifiedHallEvent {
  const startTs = req.startDate ? new Date(req.startDate).getTime() : req.createdAt;
  const endTs = req.endDate 
    ? new Date(req.endDate).getTime() 
    : startTs + (24 * 60 * 60 * 1000);

  return {
    id: req.id,
    reservationCode: req.reservationCode || `REQ-${req.id.slice(0, 5)}`,
    hallId: req.hallId,
    hallName: req.hallName || 'Hall',
    eventType: req.eventType || 'Event',
    organizerName: req.organizerName || 'Guest Organizer',
    email: req.email || '',
    phone: req.phone || '',
    startDate: req.startDate || '',
    endDate: req.endDate,
    timeSlot: req.timeSlot || 'Full Day',
    numberOfGuests: req.numberOfGuests || 1,
    totalPrice: req.totalEstimatedPrice || 0,
    status: req.status,
    startTs,
    endTs,
    source: 'hall_request',
    rawRequest: req
  };
}

/**
 * Standardize timestamp extraction
 */
function getTimestamp(val: number | string | undefined): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Checks if targetDate is within booking range
 */
export function isBookingActiveOnDate(checkInTs: number, checkOutTs: number, targetDate: Date): boolean {
  const dayStart = startOfDay(targetDate).getTime();
  const dayEnd = endOfDay(targetDate).getTime();

  // If checkIn and checkOut are same or close (same day)
  if (checkOutTs <= checkInTs) {
    return checkInTs >= dayStart && checkInTs <= dayEnd;
  }

  // Booking overlaps day if checkIn is before dayEnd AND checkOut is after dayStart
  return checkInTs <= dayEnd && checkOutTs >= dayStart;
}

/**
 * Compute real-time room occupancy status and booking linkage
 */
export function getRoomOccupancyInfo(
  room: Room, 
  bookings: Booking[], 
  targetDate: Date = new Date()
): RoomOccupancyInfo {
  const roomBookings = bookings.filter(b => 
    (b.roomId === room.id || b.roomId === room.roomNumber) &&
    !['Cancelled', 'Rejected', 'Refunded', 'Draft'].includes(b.status)
  );

  // Active booking for this room on the target date
  const activeBooking = roomBookings.find(b => 
    isBookingActiveOnDate(b.checkIn, b.checkOut, targetDate)
  ) || null;

  // Upcoming future bookings
  const dayEnd = endOfDay(targetDate).getTime();
  const upcomingBookings = roomBookings
    .filter(b => b.checkIn > dayEnd)
    .sort((a, b) => a.checkIn - b.checkIn);

  const isArrivingToday = activeBooking ? isSameDay(new Date(activeBooking.checkIn), targetDate) : false;
  const isDepartingToday = activeBooking ? isSameDay(new Date(activeBooking.checkOut), targetDate) : false;

  // Out of service check
  if (
    room.status === 'Out of Service' || 
    room.status === 'Blocked' || 
    room.condition === 'Maintenance Required' || 
    room.condition === 'Out of Service'
  ) {
    return {
      status: 'Out of Service',
      label: 'Out of Service',
      badgeClass: 'bg-neutral-800 text-white border-neutral-700',
      dotColor: 'bg-neutral-400',
      activeBooking,
      upcomingBookings,
      isArrivingToday,
      isDepartingToday
    };
  }

  // 1. Occupied check (Guest is Checked In or room record marked Occupied)
  if (
    (activeBooking && activeBooking.status === 'Checked In') ||
    room.status === 'Occupied' ||
    room.condition === 'Occupied'
  ) {
    return {
      status: 'Occupied',
      label: isDepartingToday ? 'Occupied (Departing Today)' : 'Occupied',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      dotColor: 'bg-rose-500',
      activeBooking,
      upcomingBookings,
      isArrivingToday,
      isDepartingToday
    };
  }

  // 2. Reserved check (Booking confirmed/approved/pending for target date)
  if (activeBooking) {
    const isApproved = ['Approved', 'Confirmed'].includes(activeBooking.status);
    const label = isArrivingToday 
      ? 'Reserved (Arriving Today)' 
      : isApproved ? 'Reserved (Confirmed)' : 'Reserved (Pending)';

    return {
      status: 'Reserved',
      label,
      badgeClass: isApproved 
        ? 'bg-amber-100 text-amber-900 border-amber-300' 
        : 'bg-orange-50 text-orange-800 border-orange-200',
      dotColor: isApproved ? 'bg-amber-500' : 'bg-orange-400',
      activeBooking,
      upcomingBookings,
      isArrivingToday,
      isDepartingToday
    };
  }

  // 3. Needs Cleaning / Housekeeping check
  const unreadyConditions = [
    'Dirty', 'Needs Cleaning', 'Cleaning In Progress', 'Cleaning', 
    'Awaiting Inspection', 'Inspection Required'
  ];
  if (unreadyConditions.includes(room.condition)) {
    return {
      status: 'Needs Cleaning',
      label: `Vacant (${room.condition})`,
      badgeClass: 'bg-yellow-100 text-yellow-900 border-yellow-300',
      dotColor: 'bg-yellow-500',
      activeBooking: null,
      upcomingBookings,
      isArrivingToday: false,
      isDepartingToday: false
    };
  }

  // 4. Available & Ready
  return {
    status: 'Available',
    label: 'Available (Ready)',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    dotColor: 'bg-emerald-500',
    activeBooking: null,
    upcomingBookings,
    isArrivingToday: false,
    isDepartingToday: false
  };
}

/**
 * Normalizes hall events from both hall_requests and bookings collections
 */
export function extractUnifiedHallEvents(
  bookings: Booking[] = [], 
  hallRequests: HallBookingRequest[] = []
): UnifiedHallEvent[] {
  const events: UnifiedHallEvent[] = [];
  const seenIds = new Set<string>();

  // 1. From hall_requests
  hallRequests.forEach(req => {
    if (['Cancelled', 'Rejected'].includes(req.status)) return;
    seenIds.add(req.id);
    if (req.reservationCode) seenIds.add(req.reservationCode);
    events.push(normalizeHallEvent(req));
  });

  // 2. From bookings where type === 'hall'
  bookings.forEach(b => {
    if (b.type !== 'hall') return;
    if (seenIds.has(b.id) || (b.reservationCode && seenIds.has(b.reservationCode))) return;
    if (['Cancelled', 'Rejected', 'Refunded'].includes(b.status)) return;

    events.push({
      id: b.id,
      reservationCode: b.reservationCode || `RES-${b.id.slice(0, 5)}`,
      hallId: b.categoryId,
      hallName: b.hallName || 'Event Hall',
      eventType: b.eventType || 'Event',
      organizerName: `${b.guestDetails?.firstName || ''} ${b.guestDetails?.lastName || ''}`.trim() || 'Organizer',
      email: b.guestDetails?.email || '',
      phone: b.guestDetails?.phone || '',
      startDate: new Date(b.checkIn).toISOString().split('T')[0],
      endDate: new Date(b.checkOut).toISOString().split('T')[0],
      timeSlot: 'Full Day',
      numberOfGuests: b.numberOfGuests || 1,
      totalPrice: b.totalAmount || 0,
      status: b.status,
      startTs: b.checkIn,
      endTs: b.checkOut,
      source: 'booking'
    });
  });

  return events.sort((a, b) => a.startTs - b.startTs);
}

/**
 * Ensures any list of events or requests is mapped to UnifiedHallEvent[]
 */
export function ensureUnifiedHallEvents(
  eventsOrRequests: (UnifiedHallEvent | HallBookingRequest)[],
  bookings: Booking[] = []
): UnifiedHallEvent[] {
  if (!eventsOrRequests || eventsOrRequests.length === 0) {
    return bookings.length > 0 ? extractUnifiedHallEvents(bookings, []) : [];
  }

  const first = eventsOrRequests[0] as any;
  if (first && first.startTs !== undefined && first.source !== undefined) {
    return eventsOrRequests as UnifiedHallEvent[];
  }

  return extractUnifiedHallEvents(bookings, eventsOrRequests as HallBookingRequest[]);
}

/**
 * Compute real-time Hall occupancy info
 */
export function getHallOccupancyInfo(
  hall: Hall, 
  eventsOrRequests: (UnifiedHallEvent | HallBookingRequest)[], 
  targetDate: Date = new Date(),
  bookings: Booking[] = []
): HallOccupancyInfo {
  if (hall.status === false) {
    return {
      status: 'Inactive',
      label: 'Inactive / Maintenance',
      badgeClass: 'bg-neutral-800 text-white border-neutral-700',
      dotColor: 'bg-neutral-400',
      activeEvent: null,
      upcomingEvents: [],
      allEvents: []
    };
  }

  const allEvents = ensureUnifiedHallEvents(eventsOrRequests, bookings);
  const hallEvents = allEvents.filter(e => e.hallId === hall.id || e.hallName.toLowerCase() === hall.name.toLowerCase());

  // Active event on targetDate
  const activeEvent = hallEvents.find(e => 
    isBookingActiveOnDate(e.startTs, e.endTs, targetDate)
  ) || null;

  const dayEnd = endOfDay(targetDate).getTime();
  const upcomingEvents = hallEvents.filter(e => e.startTs > dayEnd);

  // 1. Occupied / In Event Today
  if (activeEvent) {
    const isApproved = ['Approved', 'Confirmed'].includes(activeEvent.status);
    const isTodayEvent = isSameDay(new Date(activeEvent.startTs), targetDate);

    if (isTodayEvent && isApproved) {
      return {
        status: 'Occupied',
        label: 'In Event Today (Occupied)',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
        dotColor: 'bg-rose-500',
        activeEvent,
        upcomingEvents,
        allEvents: hallEvents
      };
    }

    return {
      status: 'Reserved',
      label: isApproved ? 'Reserved (Confirmed)' : 'Reserved (Pending Approval)',
      badgeClass: isApproved 
        ? 'bg-amber-100 text-amber-900 border-amber-300' 
        : 'bg-orange-50 text-orange-800 border-orange-200',
      dotColor: isApproved ? 'bg-amber-500' : 'bg-orange-400',
      activeEvent,
      upcomingEvents,
      allEvents: hallEvents
    };
  }

  // Check if hall has future reservations
  if (upcomingEvents.length > 0) {
    return {
      status: 'Available',
      label: `Available Today (${upcomingEvents.length} Upcoming)`,
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      dotColor: 'bg-emerald-500',
      activeEvent: null,
      upcomingEvents,
      allEvents: hallEvents
    };
  }

  return {
    status: 'Available',
    label: 'Available (Open to Book)',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    dotColor: 'bg-emerald-500',
    activeEvent: null,
    upcomingEvents: [],
    allEvents: hallEvents
  };
}

/**
 * Summaries for KPI cards
 */
export function getRoomsSummary(rooms: Room[], bookings: Booking[], targetDate: Date = new Date()) {
  let available = 0;
  let occupied = 0;
  let reserved = 0;
  let needsCleaning = 0;
  let outOfService = 0;

  rooms.forEach(room => {
    const info = getRoomOccupancyInfo(room, bookings, targetDate);
    if (info.status === 'Available') available++;
    else if (info.status === 'Occupied') occupied++;
    else if (info.status === 'Reserved') reserved++;
    else if (info.status === 'Needs Cleaning') needsCleaning++;
    else if (info.status === 'Out of Service') outOfService++;
  });

  return {
    total: rooms.length,
    available,
    occupied,
    reserved,
    needsCleaning,
    outOfService,
    occupancyRate: rooms.length > 0 ? Math.round(((occupied + reserved) / rooms.length) * 100) : 0
  };
}

export function getHallsSummary(
  halls: Hall[], 
  eventsOrRequests: (UnifiedHallEvent | HallBookingRequest)[], 
  targetDate: Date = new Date(),
  bookings: Booking[] = []
) {
  let available = 0;
  let occupied = 0;
  let reserved = 0;
  let inactive = 0;

  const allEvents = ensureUnifiedHallEvents(eventsOrRequests, bookings);

  halls.forEach(hall => {
    const info = getHallOccupancyInfo(hall, allEvents, targetDate);
    if (info.status === 'Available') available++;
    else if (info.status === 'Occupied') occupied++;
    else if (info.status === 'Reserved') reserved++;
    else if (info.status === 'Inactive') inactive++;
  });

  return {
    total: halls.length,
    available,
    occupied,
    reserved,
    inactive,
    activeHallsCount: halls.filter(h => h.status !== false).length
  };
}

// ============================================================================
// DATE INTERVAL (RANGE) AVAILABILITY CHECKERS
// ============================================================================

export type RoomIntervalOccupancyStatus = 
  | 'Available' 
  | 'Partially Booked' 
  | 'Fully Booked' 
  | 'Out of Service';

export interface RoomIntervalDay {
  date: Date;
  dateStr: string;
  isAvailable: boolean;
  booking?: Booking;
}

export interface RoomIntervalOccupancy {
  status: RoomIntervalOccupancyStatus;
  label: string;
  badgeClass: string;
  dotColor: string;
  nightsTotal: number;
  nightsAvailable: number;
  nightsBooked: number;
  totalNights: number;
  availableNightsCount: number;
  conflictingBookings: Booking[];
  dayBreakdown: RoomIntervalDay[];
}

/**
 * Calculates room availability across a custom date interval [startDate, endDate]
 */
export function getRoomIntervalOccupancy(
  room: Room,
  bookings: Booking[],
  startDate: Date,
  endDate: Date
): RoomIntervalOccupancy {
  const normStart = startOfDay(startDate);
  const rawEnd = startOfDay(endDate);
  // Ensure at least 1 night
  const normEnd = rawEnd.getTime() <= normStart.getTime() ? addDays(normStart, 1) : rawEnd;
  const nightsTotal = Math.max(1, differenceInCalendarDays(normEnd, normStart));

  // Check out of service condition
  if (
    room.status === 'Out of Service' ||
    room.status === 'Blocked' ||
    room.condition === 'Maintenance Required' ||
    room.condition === 'Out of Service'
  ) {
    return {
      status: 'Out of Service',
      label: 'Out of Service',
      badgeClass: 'bg-neutral-800 text-white border-neutral-700',
      dotColor: 'bg-neutral-400',
      nightsTotal,
      nightsAvailable: 0,
      nightsBooked: 0,
      totalNights: nightsTotal,
      availableNightsCount: 0,
      conflictingBookings: [],
      dayBreakdown: []
    };
  }

  // Active bookings for this room
  const roomBookings = bookings.filter(b => 
    (b.roomId === room.id || b.roomId === room.roomNumber) &&
    !['Cancelled', 'Rejected', 'Refunded', 'Draft'].includes(b.status)
  );

  const dayBreakdown: RoomIntervalDay[] = [];
  const conflictingBookingsSet = new Map<string, Booking>();
  let nightsBooked = 0;

  for (let i = 0; i < nightsTotal; i++) {
    const nightStart = addDays(normStart, i);
    const nightEnd = addDays(nightStart, 1);
    const nightStartTs = nightStart.getTime();
    const nightEndTs = nightEnd.getTime();

    // Check if any booking overlaps this night
    const overlapping = roomBookings.find(b => {
      const bIn = b.checkIn;
      const bOut = b.checkOut;
      return bIn < nightEndTs && bOut > nightStartTs;
    });

    if (overlapping) {
      nightsBooked++;
      conflictingBookingsSet.set(overlapping.id, overlapping);
      dayBreakdown.push({
        date: nightStart,
        dateStr: format(nightStart, 'yyyy-MM-dd'),
        isAvailable: false,
        booking: overlapping
      });
    } else {
      dayBreakdown.push({
        date: nightStart,
        dateStr: format(nightStart, 'yyyy-MM-dd'),
        isAvailable: true
      });
    }
  }

  const nightsAvailable = nightsTotal - nightsBooked;
  const conflictingBookings = Array.from(conflictingBookingsSet.values());

  if (nightsBooked === 0) {
    return {
      status: 'Available',
      label: `Available (${nightsTotal} ${nightsTotal === 1 ? 'Night' : 'Nights'})`,
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      dotColor: 'bg-emerald-500',
      nightsTotal,
      nightsAvailable,
      nightsBooked: 0,
      totalNights: nightsTotal,
      availableNightsCount: nightsAvailable,
      conflictingBookings: [],
      dayBreakdown
    };
  }

  if (nightsBooked === nightsTotal) {
    return {
      status: 'Fully Booked',
      label: 'Fully Booked',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      dotColor: 'bg-rose-500',
      nightsTotal,
      nightsAvailable: 0,
      nightsBooked,
      totalNights: nightsTotal,
      availableNightsCount: 0,
      conflictingBookings,
      dayBreakdown
    };
  }

  return {
    status: 'Partially Booked',
    label: `Partial (${nightsAvailable}/${nightsTotal} Nights Free)`,
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    dotColor: 'bg-amber-500',
    nightsTotal,
    nightsAvailable,
    nightsBooked,
    totalNights: nightsTotal,
    availableNightsCount: nightsAvailable,
    conflictingBookings,
    dayBreakdown
  };
}

/**
 * Summary for all rooms across an interval
 */
export function getRoomsIntervalSummary(
  rooms: Room[],
  bookings: Booking[],
  startDate: Date,
  endDate: Date
) {
  let available = 0;
  let partiallyBooked = 0;
  let fullyBooked = 0;
  let outOfService = 0;

  const normStart = startOfDay(startDate);
  const rawEnd = startOfDay(endDate);
  const normEnd = rawEnd.getTime() <= normStart.getTime() ? addDays(normStart, 1) : rawEnd;
  const nightsTotal = Math.max(1, differenceInCalendarDays(normEnd, normStart));

  rooms.forEach(r => {
    const occ = getRoomIntervalOccupancy(r, bookings, normStart, normEnd);
    if (occ.status === 'Available') available++;
    else if (occ.status === 'Partially Booked') partiallyBooked++;
    else if (occ.status === 'Fully Booked') fullyBooked++;
    else if (occ.status === 'Out of Service') outOfService++;
  });

  return {
    total: rooms.length,
    totalRooms: rooms.length,
    available,
    fullyAvailable: available,
    partiallyBooked,
    fullyBooked,
    outOfService,
    nightsTotal,
    availabilityRate: rooms.length > 0 ? Math.round((available / rooms.length) * 100) : 0
  };
}

export type HallIntervalOccupancyStatus = 
  | 'Available' 
  | 'Partially Booked' 
  | 'Fully Booked' 
  | 'Inactive';

export interface HallIntervalDay {
  date: Date;
  dateStr: string;
  isAvailable: boolean;
  event?: UnifiedHallEvent;
}

export interface HallIntervalOccupancy {
  status: HallIntervalOccupancyStatus;
  label: string;
  badgeClass: string;
  dotColor: string;
  daysTotal: number;
  daysAvailable: number;
  daysBooked: number;
  conflictingEvents: UnifiedHallEvent[];
  dayBreakdown: HallIntervalDay[];
}

/**
 * Calculates event hall availability across a custom date interval [startDate, endDate] (inclusive days)
 */
export function getHallIntervalOccupancy(
  hall: Hall,
  eventsOrRequests: (UnifiedHallEvent | HallBookingRequest)[],
  startDate: Date,
  endDate: Date,
  bookings: Booking[] = []
): HallIntervalOccupancy {
  const normStart = startOfDay(startDate);
  const normEnd = startOfDay(endDate);
  const daysTotal = Math.max(1, differenceInCalendarDays(normEnd, normStart) + 1);

  if (hall.status === false) {
    return {
      status: 'Inactive',
      label: 'Inactive / Closed',
      badgeClass: 'bg-neutral-800 text-white border-neutral-700',
      dotColor: 'bg-neutral-400',
      daysTotal,
      daysAvailable: 0,
      daysBooked: 0,
      conflictingEvents: [],
      dayBreakdown: []
    };
  }

  const allEvents = ensureUnifiedHallEvents(eventsOrRequests, bookings);
  const hallEvents = allEvents.filter(e => 
    (e.hallId === hall.id || e.hallName.toLowerCase() === hall.name.toLowerCase()) &&
    !['Cancelled', 'Rejected'].includes(e.status)
  );

  const dayBreakdown: HallIntervalDay[] = [];
  const conflictingEventsSet = new Map<string, UnifiedHallEvent>();
  let daysBooked = 0;

  for (let i = 0; i < daysTotal; i++) {
    const dayDate = addDays(normStart, i);
    const dayStartTs = startOfDay(dayDate).getTime();
    const dayEndTs = endOfDay(dayDate).getTime();

    const overlapping = hallEvents.find(e => {
      return e.startTs <= dayEndTs && e.endTs >= dayStartTs;
    });

    if (overlapping) {
      daysBooked++;
      conflictingEventsSet.set(overlapping.id, overlapping);
      dayBreakdown.push({
        date: dayDate,
        dateStr: format(dayDate, 'yyyy-MM-dd'),
        isAvailable: false,
        event: overlapping
      });
    } else {
      dayBreakdown.push({
        date: dayDate,
        dateStr: format(dayDate, 'yyyy-MM-dd'),
        isAvailable: true
      });
    }
  }

  const daysAvailable = daysTotal - daysBooked;
  const conflictingEvents = Array.from(conflictingEventsSet.values());

  if (daysBooked === 0) {
    return {
      status: 'Available',
      label: `Available (${daysTotal} ${daysTotal === 1 ? 'Day' : 'Days'})`,
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      dotColor: 'bg-emerald-500',
      daysTotal,
      daysAvailable,
      daysBooked: 0,
      conflictingEvents: [],
      dayBreakdown
    };
  }

  if (daysBooked === daysTotal) {
    return {
      status: 'Fully Booked',
      label: 'Booked Throughout',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      dotColor: 'bg-rose-500',
      daysTotal,
      daysAvailable: 0,
      daysBooked,
      conflictingEvents,
      dayBreakdown
    };
  }

  return {
    status: 'Partially Booked',
    label: `Partial (${daysAvailable}/${daysTotal} Days Free)`,
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    dotColor: 'bg-amber-500',
    daysTotal,
    daysAvailable,
    daysBooked,
    conflictingEvents,
    dayBreakdown
  };
}

/**
 * Summary for all halls across an interval
 */
export function getHallsIntervalSummary(
  halls: Hall[],
  eventsOrRequests: (UnifiedHallEvent | HallBookingRequest)[],
  startDate: Date,
  endDate: Date,
  bookings: Booking[] = []
) {
  let available = 0;
  let partiallyBooked = 0;
  let fullyBooked = 0;
  let inactive = 0;

  const normStart = startOfDay(startDate);
  const normEnd = startOfDay(endDate);
  const daysTotal = Math.max(1, differenceInCalendarDays(normEnd, normStart) + 1);

  halls.forEach(hall => {
    const occ = getHallIntervalOccupancy(hall, eventsOrRequests, normStart, normEnd, bookings);
    if (occ.status === 'Available') available++;
    else if (occ.status === 'Partially Booked') partiallyBooked++;
    else if (occ.status === 'Fully Booked') fullyBooked++;
    else if (occ.status === 'Inactive') inactive++;
  });

  return {
    total: halls.length,
    available,
    partiallyBooked,
    fullyBooked,
    inactive,
    daysTotal,
    activeHallsCount: halls.filter(h => h.status !== false).length
  };
}

