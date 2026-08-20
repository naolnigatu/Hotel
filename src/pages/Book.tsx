import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, query, getDocs, addDoc, serverTimestamp, where, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { RoomCategory, Booking, Room, HotelSettings } from '../types';
import { format, addDays, startOfDay } from 'date-fns';
import { Loader2, Calendar, Users, ArrowRight, CheckCircle2, Upload, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

import { sendNotification } from '../lib/notificationService';

export default function Book() {
  const [searchParams] = useSearchParams();
  const preSelectedCategoryId = searchParams.get('category');
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [checkIn, setCheckIn] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState<string>(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [guests, setGuests] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<RoomCategory | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  
  const [guestDetails, setGuestDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pay at Hotel');
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [hotelSettings, setHotelSettings] = useState<HotelSettings | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [reservationCode, setReservationCode] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'room_categories'));
        const catsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoomCategory));
        setCategories(catsData);
        if (preSelectedCategoryId) {
          const preSelected = catsData.find(c => c.id === preSelectedCategoryId);
          if (preSelected) setSelectedCategory(preSelected);
        }

        const settingsDoc = await getDoc(doc(db, 'app_settings', 'hotel'));
        if (settingsDoc.exists()) {
          setHotelSettings(settingsDoc.data() as HotelSettings);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [preSelectedCategoryId]);

  const checkAvailability = async (category: RoomCategory) => {
    setCheckingAvailability(true);
    setAvailabilityError('');
    try {
      const inDate = startOfDay(new Date(checkIn)).getTime();
      const outDate = startOfDay(new Date(checkOut)).getTime();

      if (inDate >= outDate) {
        setAvailabilityError('Check-out date must be after check-in date.');
        setCheckingAvailability(false);
        return false;
      }

      if (inDate < startOfDay(new Date()).getTime()) {
        setAvailabilityError('Check-in date cannot be in the past.');
        setCheckingAvailability(false);
        return false;
      }

      // Count total rooms in category (that are not out of service)
      const roomsQ = query(collection(db, 'rooms'), where('categoryId', '==', category.id), where('status', '!=', 'Out of Service'));
      const roomsSnap = await getDocs(roomsQ);
      const totalRooms = roomsSnap.size;

      // Find overlapping bookings for this category
      const bookingsQ = query(collection(db, 'bookings'), where('categoryId', '==', category.id));
      const bookingsSnap = await getDocs(bookingsQ);
      
      let overlappingCount = 0;
      bookingsSnap.forEach(doc => {
        const b = doc.data() as Booking;
        if (['Cancelled', 'Rejected', 'Refunded'].includes(b.status)) return;
        
        // Overlap logic: booking.checkIn < reqCheckOut && booking.checkOut > reqCheckIn
        if (b.checkIn < outDate && b.checkOut > inDate) {
          overlappingCount++;
        }
      });

      if (totalRooms - overlappingCount > 0) {
        setCheckingAvailability(false);
        return true;
      } else {
        setAvailabilityError('No rooms available in this category for the selected dates. Please try different dates or another room category.');
        setCheckingAvailability(false);
        return false;
      }
    } catch (err) {
      console.error(err);
      setAvailabilityError('Failed to check availability.');
      setCheckingAvailability(false);
      return false;
    }
  };

  const handleNextStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) {
      setAvailabilityError('Please select a room category.');
      return;
    }
    const isAvailable = await checkAvailability(selectedCategory);
    if (isAvailable) {
      setStep(2);
    }
  };

  const calculateTotal = () => {
    if (!selectedCategory) return 0;
    const inDate = startOfDay(new Date(checkIn)).getTime();
    const outDate = startOfDay(new Date(checkOut)).getTime();
    const days = Math.max(1, (outDate - inDate) / (1000 * 60 * 60 * 24));
    return selectedCategory.basePrice * days;
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `WH-${result}`;
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const inDate = startOfDay(new Date(checkIn)).getTime();
      const outDate = startOfDay(new Date(checkOut)).getTime();
      
      // Re-verify availability to prevent race conditions during checkout
      const roomsQ = query(collection(db, 'rooms'), where('categoryId', '==', selectedCategory!.id), where('status', '!=', 'Out of Service'));
      const roomsSnap = await getDocs(roomsQ);
      const totalRooms = roomsSnap.size;

      const bookingsQ = query(collection(db, 'bookings'), where('categoryId', '==', selectedCategory!.id));
      const bookingsSnap = await getDocs(bookingsQ);
      
      let overlappingCount = 0;
      bookingsSnap.forEach(doc => {
        const b = doc.data() as Booking;
        if (['Cancelled', 'Rejected', 'Refunded'].includes(b.status)) return;
        if (b.checkIn < outDate && b.checkOut > inDate) {
          overlappingCount++;
        }
      });

      if (totalRooms - overlappingCount <= 0) {
        alert('We are sorry, but this room category just sold out for your selected dates. Please try another date or category.');
        setStep(1);
        setSubmitting(false);
        return;
      }

      const code = generateCode();
      
      let proofUrl = '';
      if ((paymentMethod === 'Bank Transfer' || paymentMethod === 'Deposit / ቀብድ') && paymentFile) {
        try {
          const storageRef = ref(storage, `payment_proofs/${code}_${paymentFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
          const uploadTask = await Promise.race([
            uploadBytes(storageRef, paymentFile),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Storage timeout')), 4000))
          ]) as any;
          proofUrl = await getDownloadURL(uploadTask.ref);
        } catch {
          // Robust Base64 fallback if cloud storage is blocked or slow
          proofUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(paymentFile);
          });
        }
      }

      const isAwaitingVerification = paymentMethod === 'Bank Transfer' || paymentMethod === 'Deposit / ቀብድ';

      const newBooking: Omit<Booking, 'id'> = {
        reservationCode: code,
        type: 'room',
        guestId: null,
        guestDetails,
        categoryId: selectedCategory!.id,
        numberOfGuests: guests,
        specialRequests,
        checkIn: inDate,
        checkOut: outDate,
        status: isAwaitingVerification ? 'Awaiting Payment Verification' : 'Pending',
        totalAmount: calculateTotal(),
        paymentMethod,
        paymentProofUrl: proofUrl,
        timeline: [{
          status: 'Created',
          timestamp: Date.now(),
          notes: `Booking created via portal. Payment method: ${paymentMethod}`
        }],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const createdDocRef = await addDoc(collection(db, 'bookings'), newBooking);

      // Trigger reception notification
      await sendNotification({
        recipientRole: 'reception',
        title: 'New Online Reservation',
        message: `New reservation ${code} received from ${guestDetails.firstName} ${guestDetails.lastName} (${selectedCategory?.name}).`,
        type: paymentMethod === 'Bank Transfer' ? 'payment' : 'reservation',
        relatedEntityId: createdDocRef.id,
        relatedEntityType: 'booking',
        targetRoute: '/admin/reservations',
        priority: paymentMethod === 'Bank Transfer' ? 'Important' : 'Normal',
        eventId: `res_new_${code}`,
      });

      setReservationCode(code);
      setStep(3);
    } catch (err) {
      console.error(err);
      alert('Failed to submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="bg-neutral-50 min-h-screen py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center text-neutral-500 hover:text-neutral-900 mb-8 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-100">
            <h1 className="text-3xl font-bold text-neutral-900 mb-8">Make a Reservation</h1>
            
            <form onSubmit={handleNextStep1} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Check-In Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} required min={format(new Date(), 'yyyy-MM-dd')} className="w-full pl-10 pr-3 py-3 border border-neutral-300 rounded-lg focus:ring-neutral-900 focus:border-neutral-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Check-Out Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} required min={format(addDays(new Date(checkIn || new Date()), 1), 'yyyy-MM-dd')} className="w-full pl-10 pr-3 py-3 border border-neutral-300 rounded-lg focus:ring-neutral-900 focus:border-neutral-900" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Number of Guests</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input type="number" value={guests || ''} onChange={e => setGuests(parseInt(e.target.value) || 1)} required min={1} max={10} className="w-full pl-10 pr-3 py-3 border border-neutral-300 rounded-lg focus:ring-neutral-900 focus:border-neutral-900" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Room Category</label>
                {categories.length === 0 ? (
                  <div className="p-4 bg-neutral-50 rounded-lg text-center text-neutral-500">
                    No room categories available at the moment.
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {categories.map(cat => (
                      <div 
                        key={cat.id} 
                        onClick={() => setSelectedCategory(cat)}
                        className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${selectedCategory?.id === cat.id ? 'border-neutral-900 bg-neutral-900/5' : 'border-neutral-200 hover:border-neutral-300'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="font-bold text-neutral-900">{cat.name}</h3>
                          <span className="font-bold text-neutral-900">{cat.basePrice} ETB</span>
                        </div>
                        <p className="text-sm text-neutral-500 line-clamp-1">{cat.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {availabilityError && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium">
                  {availabilityError}
                </div>
              )}

              <button type="submit" disabled={checkingAvailability} className="w-full flex items-center justify-center py-4 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors disabled:opacity-70">
                {checkingAvailability ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowRight className="w-5 h-5 mr-2" />}
                Continue to Guest Details
              </button>
            </form>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-100">
            <div className="flex items-center gap-4 mb-8">
              <button type="button" onClick={() => setStep(1)} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">← Back</button>
              <h1 className="text-3xl font-bold text-neutral-900">Guest Details & Payment</h1>
            </div>

            <div className="bg-neutral-50 p-6 rounded-xl mb-8 flex flex-wrap justify-between items-center gap-4">
              <div>
                <p className="text-sm text-neutral-500">Selected Room</p>
                <p className="font-bold text-neutral-900">{selectedCategory?.name}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Dates</p>
                <p className="font-bold text-neutral-900">{format(new Date(checkIn), 'MMM d, yyyy')} - {format(new Date(checkOut), 'MMM d, yyyy')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-500">Total Amount</p>
                <p className="text-2xl font-bold text-neutral-900">{calculateTotal()} ETB</p>
              </div>
            </div>

            <form onSubmit={handleSubmitBooking} className="space-y-6">
              <h2 className="text-xl font-bold text-neutral-900">Guest Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">First Name</label>
                  <input type="text" value={guestDetails.firstName} onChange={e => setGuestDetails({...guestDetails, firstName: e.target.value})} required className="w-full border-neutral-300 rounded-lg p-3 border focus:ring-neutral-900 focus:border-neutral-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Last Name</label>
                  <input type="text" value={guestDetails.lastName} onChange={e => setGuestDetails({...guestDetails, lastName: e.target.value})} required className="w-full border-neutral-300 rounded-lg p-3 border focus:ring-neutral-900 focus:border-neutral-900" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Email Address</label>
                  <input type="email" value={guestDetails.email} onChange={e => setGuestDetails({...guestDetails, email: e.target.value})} required className="w-full border-neutral-300 rounded-lg p-3 border focus:ring-neutral-900 focus:border-neutral-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Phone Number</label>
                  <input type="tel" value={guestDetails.phone} onChange={e => setGuestDetails({...guestDetails, phone: e.target.value})} required className="w-full border-neutral-300 rounded-lg p-3 border focus:ring-neutral-900 focus:border-neutral-900" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Special Requests (Optional)</label>
                <textarea rows={3} value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} className="w-full border-neutral-300 rounded-lg p-3 border focus:ring-neutral-900 focus:border-neutral-900" placeholder="Any specific requirements?"></textarea>
              </div>

              <h2 className="text-xl font-bold text-neutral-900 pt-4 border-t border-neutral-100">Payment Details</h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  'Pay at Hotel',
                  ...(hotelSettings?.depositEnabled ? ['Deposit / ቀብድ'] : []),
                  'Bank Transfer'
                ].map(method => (
                  <div 
                    key={method} 
                    onClick={() => setPaymentMethod(method)}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${paymentMethod === method ? 'border-neutral-900 bg-neutral-900/5' : 'border-neutral-200 hover:border-neutral-300'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${paymentMethod === method ? 'border-neutral-900' : 'border-neutral-300'}`}>
                        {paymentMethod === method && <div className="w-3 h-3 rounded-full bg-neutral-900" />}
                      </div>
                      <span className="font-bold text-neutral-900 text-sm">{method}</span>
                    </div>
                  </div>
                ))}
              </div>

              {paymentMethod === 'Deposit / ቀብድ' && hotelSettings?.depositEnabled && (
                <div className="bg-amber-50/60 p-6 rounded-xl border border-amber-200/80 space-y-4">
                  <h3 className="font-bold text-amber-950 flex items-center gap-2">
                    Deposit (ቀብድ) Requirement
                  </h3>
                  <p className="text-sm text-amber-900">
                    A deposit is required to confirm your room reservation.
                  </p>
                  <div className="bg-white p-4 rounded-lg border border-amber-200 font-medium text-sm space-y-1">
                    <p className="text-neutral-700">
                      Deposit Amount:{' '}
                      <span className="font-bold text-neutral-900">
                        {hotelSettings.depositType === 'fixed'
                          ? `${hotelSettings.depositValue || 0} ETB`
                          : `${((calculateTotal() * (hotelSettings.depositValue || 0)) / 100).toFixed(0)} ETB (${hotelSettings.depositValue}% of total ${calculateTotal()} ETB)`}
                      </span>
                    </p>
                    {hotelSettings.depositInstructions && (
                      <p className="text-xs text-neutral-600 pt-2 border-t border-neutral-100 mt-2">
                        {hotelSettings.depositInstructions}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {(paymentMethod === 'Bank Transfer' || paymentMethod === 'Deposit / ቀብድ') && (
                <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200">
                  <h3 className="font-bold text-neutral-900 mb-2">Payment Details</h3>
                  <p className="text-sm text-neutral-600 mb-4">Please make your payment to one of the accounts below and upload your proof of transfer.</p>
                  
                  <div className="space-y-3 mb-4">
                    {hotelSettings?.bankDetails && hotelSettings.bankDetails.length > 0 ? (
                      hotelSettings.bankDetails.map((bank, i) => (
                        <div key={i} className="bg-white p-4 rounded-lg border border-neutral-200">
                          <p className="font-bold text-neutral-900 text-sm">{bank.bankName}</p>
                          <p className="font-mono text-xs text-neutral-700">Account Name: {bank.accountName}</p>
                          <p className="font-mono text-sm font-semibold text-neutral-900">Account No: {bank.accountNumber}</p>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white p-4 rounded-lg border border-neutral-200">
                        <p className="font-mono text-neutral-900">Bank: Commercial Bank of Ethiopia</p>
                        <p className="font-mono text-neutral-900">Account Name: Woliso Hotel</p>
                        <p className="font-mono text-neutral-900">Account Number: 1000123456789</p>
                      </div>
                    )}

                    {hotelSettings?.telebirrNo && (
                      <div className="bg-white p-4 rounded-lg border border-neutral-200">
                        <p className="font-bold text-neutral-900 text-sm">Telebirr Mobile Money</p>
                        {hotelSettings.telebirrAccountName && <p className="font-mono text-xs text-neutral-700">Account Name: {hotelSettings.telebirrAccountName}</p>}
                        <p className="font-mono text-sm font-semibold text-neutral-900">Number: {hotelSettings.telebirrNo}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Upload Payment Receipt (Proof)</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-300 border-dashed rounded-lg bg-white">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-neutral-400" />
                        <div className="flex text-sm text-neutral-600 justify-center">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-neutral-900 hover:text-neutral-700 focus-within:outline-none">
                            <span>Upload a file</span>
                            <input type="file" required className="sr-only" accept="image/*,.pdf" onChange={e => {
                              const file = e.target.files?.[0] || null;
                              if (file && file.size > 5 * 1024 * 1024) {
                                alert('File size exceeds 5MB limit. Please upload a smaller file (under 5MB).');
                                e.target.value = '';
                                setPaymentFile(null);
                                return;
                              }
                              setPaymentFile(file);
                            }} />
                          </label>
                        </div>
                        <p className="text-xs text-neutral-500">{paymentFile ? paymentFile.name : 'PNG, JPG, PDF up to 5MB'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" disabled={submitting || ((paymentMethod === 'Bank Transfer' || paymentMethod === 'Deposit / ቀብድ') && !paymentFile)} className="w-full flex items-center justify-center py-4 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors disabled:opacity-70 mt-6">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                Confirm Booking
              </button>
            </form>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-12 rounded-2xl shadow-sm border border-neutral-100 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-4">Reservation Request Sent!</h1>
            <p className="text-lg text-neutral-600 mb-8 max-w-lg mx-auto">
              Thank you for choosing Woliso Hotel. Your reservation request has been received and is being processed.
            </p>
            
            <div className="bg-neutral-50 p-6 rounded-xl inline-block mb-8 border border-neutral-200">
              <p className="text-sm text-neutral-500 mb-1">Your Reservation Code</p>
              <p className="text-3xl font-mono font-bold text-neutral-900 tracking-wider">{reservationCode}</p>
            </div>

            <p className="text-neutral-500 text-sm mb-8">Please save this code for future reference. We will contact you shortly to confirm your booking.</p>

            <button onClick={() => navigate('/')} className="px-8 py-4 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors">
              Return to Home
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
