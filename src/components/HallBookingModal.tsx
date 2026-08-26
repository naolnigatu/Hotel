import React, { useState } from 'react';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Hall, HallBookingRequest, Booking } from '../types';
import { useAuth } from '../context/AuthContext';
import { sendNotification } from '../lib/notificationService';
import { saveRecentReservation } from '../lib/trackingStorage';
import CopyButton from './common/CopyButton';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { 
  X, 
  Calendar, 
  Users, 
  Clock, 
  Building2, 
  Phone, 
  Mail, 
  User, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  Check, 
  ArrowRight,
  HelpCircle,
  DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HallBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedHall: Hall | null;
  allHalls: Hall[];
}

const EVENT_TYPES = [
  'Corporate Meeting / Conference',
  'Wedding Reception',
  'Birthday / Private Party',
  'Workshop / Training Seminar',
  'Exhibition / Trade Fair',
  'Cultural & Community Gathering',
  'Other Event'
];

const TIME_SLOTS = [
  { id: 'Full Day', label: 'Full Day (8:00 AM - 10:00 PM)' },
  { id: 'Morning', label: 'Morning Slot (8:00 AM - 1:00 PM)' },
  { id: 'Afternoon', label: 'Afternoon Slot (1:00 PM - 6:00 PM)' },
  { id: 'Evening', label: 'Evening Slot (6:00 PM - 11:00 PM)' }
];

export default function HallBookingModal({
  isOpen,
  onClose,
  selectedHall,
  allHalls
}: HallBookingModalProps) {
  useBodyScrollLock(isOpen);
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  const [activeHall, setActiveHall] = useState<Hall | null>(selectedHall);
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [startDate, setStartDate] = useState('');
  const [durationDays, setDurationDays] = useState(1);
  const [timeSlot, setTimeSlot] = useState<'Full Day' | 'Morning' | 'Afternoon' | 'Evening'>('Full Day');
  const [numberOfGuests, setNumberOfGuests] = useState<number>(selectedHall?.capacity ? Math.min(50, selectedHall.capacity) : 50);
  
  // Organizer details
  const [fullName, setFullName] = useState(userData?.name || '');
  const [email, setEmail] = useState(userData?.email || currentUser?.email || '');
  const [phone, setPhone] = useState(userData?.phone || '');
  const [message, setMessage] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedRequest, setSubmittedRequest] = useState<HallBookingRequest | null>(null);

  // Sync active hall if prop changes
  React.useEffect(() => {
    if (selectedHall) {
      setActiveHall(selectedHall);
      if (selectedHall.equipment && selectedHall.equipment.length > 0) {
        setSelectedEquipment(selectedHall.equipment);
      }
      if (selectedHall.capacity) {
        setNumberOfGuests(prev => Math.min(prev || 50, selectedHall.capacity));
      }
    } else if (allHalls.length > 0 && !activeHall) {
      setActiveHall(allHalls[0]);
    }
  }, [selectedHall, allHalls]);

  if (!isOpen) return null;

  const currentHall = activeHall || allHalls[0] || null;
  const dailyPrice = currentHall?.price || 0;
  const estimatedTotal = dailyPrice * Math.max(1, durationDays);

  const toggleEquipment = (eq: string) => {
    setSelectedEquipment(prev => 
      prev.includes(eq) ? prev.filter(item => item !== eq) : [...prev, eq]
    );
  };

  const generateHallReservationCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'WH-H';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHall) {
      setError('Please select a hall venue.');
      return;
    }
    if (!startDate) {
      setError('Please select an event date.');
      return;
    }
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError('Please provide your name, email, and phone number so we can reach you.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const reservationCode = generateHallReservationCode();
      const requestId = `hall_req_${Date.now()}`;
      
      // Calculate dates
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = startTimestamp + (durationDays * 24 * 60 * 60 * 1000);

      const requestPayload: HallBookingRequest = {
        id: requestId,
        reservationCode,
        hallId: currentHall.id,
        hallName: currentHall.name,
        eventType,
        organizerName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        startDate,
        timeSlot,
        numberOfGuests: Number(numberOfGuests) || 1,
        requestedEquipment: selectedEquipment,
        message: message.trim(),
        totalEstimatedPrice: estimatedTotal,
        status: 'Pending',
        guestId: currentUser?.uid || null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 1. Save to hall_requests collection
      await setDoc(doc(db, 'hall_requests', requestId), requestPayload);

      // 2. Also register in standard bookings collection with type 'hall' for seamless unified administration & tracking
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || 'Guest';
      const lastName = nameParts.slice(1).join(' ') || 'Organizer';

      const bookingPayload: Booking = {
        id: requestId,
        reservationCode,
        type: 'hall',
        guestId: currentUser?.uid || null,
        guestDetails: {
          firstName,
          lastName,
          email: email.trim().toLowerCase(),
          phone: phone.trim()
        },
        categoryId: currentHall.id,
        hallName: currentHall.name,
        eventType,
        numberOfGuests: Number(numberOfGuests) || 1,
        specialRequests: `[Event: ${eventType}] [Time: ${timeSlot}] ${message.trim() ? `Note: ${message.trim()}` : ''}`,
        requestedEquipment: selectedEquipment,
        bookingSource: 'Online',
        checkIn: startTimestamp,
        checkOut: endTimestamp,
        status: 'Pending',
        totalAmount: estimatedTotal,
        paymentMethod: 'Pay at Hotel',
        timeline: [
          {
            status: 'Created',
            timestamp: Date.now(),
            userName: fullName.trim(),
            notes: `Hall reservation request submitted online for ${currentHall.name} (${eventType}).`
          }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await setDoc(doc(db, 'bookings', requestId), bookingPayload);

      // 3. Save to local recent reservation tracking cache
      saveRecentReservation({
        id: requestId,
        code: reservationCode,
        categoryName: currentHall.name,
        guestName: fullName.trim(),
        guestPhone: phone.trim(),
        guestEmail: email.trim(),
        checkIn: startTimestamp,
        checkOut: endTimestamp,
        totalAmount: estimatedTotal,
        status: 'Pending',
        numberOfGuests: Number(numberOfGuests) || 1,
        createdAt: Date.now()
      });

      // 4. Send notification to Reception & Admin
      await sendNotification({
        recipientRole: 'reception',
        title: `New Hall Request: ${currentHall.name}`,
        message: `${fullName.trim()} requested ${currentHall.name} for ${eventType} on ${startDate} (${numberOfGuests} guests).`,
        type: 'booking',
        relatedEntityId: requestId,
        relatedEntityType: 'booking',
        targetRoute: '/admin/halls',
        priority: 'Important',
        eventId: `hall_req_${reservationCode}`
      });

      setSubmittedRequest(requestPayload);
    } catch (err: any) {
      console.error('Error submitting hall reservation:', err);
      setError(err.message || 'Failed to submit hall request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmittedRequest(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-neutral-200 my-8 overscroll-contain">
        
        {/* Modal Header */}
        <div className="bg-neutral-900 text-white p-6 sm:p-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-neutral-800 rounded-xl text-neutral-300">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                {submittedRequest ? 'Reservation Request Sent' : 'Book Event Hall / Space'}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                {submittedRequest 
                  ? 'Your request is pending manager review' 
                  : 'Submit your request for instant review & confirmation'}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {submittedRequest ? (
          /* SUCCESS SCREEN */
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Pending Admin Approval
              </span>
              <h3 className="text-2xl font-bold text-neutral-900">Request Successfully Received!</h3>
              <p className="text-sm text-neutral-600 max-w-md mx-auto mt-2">
                Thank you, <strong>{submittedRequest.organizerName}</strong>. We have received your booking request for <strong>{submittedRequest.hallName}</strong>. Our events manager will review and approve your schedule shortly.
              </p>
            </div>

            {/* Prominent Reservation Code Box with Copy Button */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 max-w-md mx-auto text-left relative overflow-hidden">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Hall Reservation Code
                  </span>
                  <p className="text-2xl sm:text-3xl font-black font-mono text-neutral-900 tracking-wider mt-0.5">
                    {submittedRequest.reservationCode}
                  </p>
                </div>
                <div className="shrink-0">
                  <CopyButton
                    text={submittedRequest.reservationCode}
                    label="Copy Code"
                    copiedLabel="Code Copied!"
                    showText={true}
                    variant="dark"
                    size="md"
                    className="shadow-sm"
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-200/80 grid grid-cols-2 gap-2 text-xs text-neutral-600">
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Event Date</span>
                  <span className="font-semibold text-neutral-800">{submittedRequest.startDate}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Guests & Type</span>
                  <span className="font-semibold text-neutral-800">{submittedRequest.numberOfGuests} Guests ({submittedRequest.eventType})</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Est. Total</span>
                  <span className="font-bold text-emerald-700">{submittedRequest.totalEstimatedPrice?.toLocaleString()} ETB</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Contact Email</span>
                  <span className="font-semibold text-neutral-800 truncate block">{submittedRequest.email}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Save your reservation code to check approval status or upload advance payment documents at any time.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  handleResetAndClose();
                  navigate(`/track-reservation?code=${encodeURIComponent(submittedRequest.reservationCode)}`);
                }}
                className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-sm"
              >
                Track Request Status <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-3 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 rounded-xl font-medium text-sm transition"
              >
                Close & Browse More
              </button>
            </div>
          </div>
        ) : (
          /* BOOKING FORM */
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Hall Selection Banner */}
            <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {currentHall?.imageUrls?.[0] ? (
                  <img 
                    src={currentHall.imageUrls[0]} 
                    alt={currentHall.name} 
                    className="w-14 h-14 rounded-xl object-cover border border-neutral-200 shrink-0" 
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-neutral-200 flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-neutral-500" />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-neutral-900 text-base">{currentHall?.name || 'Select Venue'}</h4>
                  <div className="flex items-center gap-3 text-xs text-neutral-600 mt-0.5">
                    <span className="flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5 text-neutral-500" /> Up to {currentHall?.capacity} guests
                    </span>
                    <span>•</span>
                    <span className="font-bold text-neutral-900">{dailyPrice.toLocaleString()} ETB / day</span>
                  </div>
                </div>
              </div>

              {allHalls.length > 1 && (
                <select
                  value={currentHall?.id || ''}
                  onChange={(e) => {
                    const found = allHalls.find(h => h.id === e.target.value);
                    if (found) setActiveHall(found);
                  }}
                  className="text-xs font-semibold py-2 px-3 bg-white border border-neutral-300 rounded-xl focus:ring-neutral-900 focus:border-neutral-900 w-full sm:w-auto"
                >
                  {allHalls.map(h => (
                    <option key={h.id} value={h.id}>{h.name} (Max {h.capacity})</option>
                  ))}
                </select>
              )}
            </div>

            {/* Event Specification Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                1. Event Details & Scheduling
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    Event Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full text-xs p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 bg-white"
                  >
                    {EVENT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    Expected Number of Guests <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                    <input
                      type="number"
                      min={1}
                      max={currentHall?.capacity ? currentHall.capacity * 1.2 : 500}
                      value={numberOfGuests || ''}
                      onChange={(e) => setNumberOfGuests(parseInt(e.target.value) || 0)}
                      required
                      placeholder="e.g. 80"
                      className="w-full pl-10 pr-3 py-2.5 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
                    />
                  </div>
                  {currentHall && numberOfGuests > currentHall.capacity && (
                    <p className="text-[11px] text-amber-600 font-semibold mt-1">
                      ⚠️ Note: Exceeds standard seated capacity of {currentHall.capacity}.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    Event Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full pl-10 pr-3 py-2.5 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    Duration (Days) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)}
                    className="w-full text-xs p-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 bg-white"
                  >
                    {[1, 2, 3, 4, 5, 7, 10, 14].map(d => (
                      <option key={d} value={d}>{d} {d === 1 ? 'Day' : 'Days'}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    Preferred Time Slot
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value as any)}
                    className="w-full text-xs p-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 bg-white"
                  >
                    {TIME_SLOTS.map(slot => (
                      <option key={slot.id} value={slot.id}>{slot.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Equipment & Facilities checklist */}
            {currentHall?.equipment && currentHall.equipment.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
                  2. Requested Equipment & Setup
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {currentHall.equipment.map((eq) => {
                    const isSelected = selectedEquipment.includes(eq);
                    return (
                      <button
                        key={eq}
                        type="button"
                        onClick={() => toggleEquipment(eq)}
                        className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition text-left ${
                          isSelected 
                            ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs' 
                            : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-white text-neutral-900' : 'border border-neutral-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="truncate">{eq}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Organizer Contact Info */}
            <div className="space-y-4 pt-2 border-t border-neutral-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                3. Organizer Contact Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="Abebe Kebede"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="abebe@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="+251 91 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Special Requests / Message for Event Coordinator
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Mention any custom table arrangements, coffee break catering, stage requirements, or dietary needs..."
                  className="w-full p-3 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
                />
              </div>
            </div>

            {/* Estimated Pricing Summary & Submit Footer */}
            <div className="pt-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                  Estimated Total ({durationDays} {durationDays === 1 ? 'Day' : 'Days'})
                </span>
                <span className="text-2xl font-black text-neutral-900">
                  {estimatedTotal.toLocaleString()} <span className="text-sm font-bold text-neutral-500">ETB</span>
                </span>
                <span className="text-[10px] text-neutral-400 block">No advance payment charged yet. Admin reviews schedule first.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 text-neutral-600 hover:text-neutral-900 font-bold text-xs rounded-xl hover:bg-neutral-100 transition w-full sm:w-auto"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-7 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md disabled:opacity-60 w-full sm:w-auto"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting Request...
                    </>
                  ) : (
                    <>
                      Submit Reservation Request <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
