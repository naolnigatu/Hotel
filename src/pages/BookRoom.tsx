import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, query, getDocs, addDoc, serverTimestamp, where, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { RoomCategory, Booking, Room, HotelSettings } from '../types';
import { format, addDays, startOfDay } from 'date-fns';
import { Loader2, Calendar, Users, ArrowRight, CheckCircle2, Upload, ArrowLeft, X, FileText, Maximize2, Eye, Smartphone, Building2, CreditCard } from 'lucide-react';
import { motion } from 'motion/react';

import { sendNotification } from '../lib/notificationService';
import { cleanFirestoreData } from '../lib/firestoreUtils';
import { saveRecentReservation } from '../lib/trackingStorage';
import CopyButton from '../components/common/CopyButton';
import ReceiptLightboxModal from '../components/common/ReceiptLightboxModal';

export default function Book() {
  const [searchParams] = useSearchParams();
  const preSelectedCategoryId = searchParams.get('category');
  const navigate = useNavigate();
  const { currentUser } = useAuth();

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
  const [paymentPreviewUrl, setPaymentPreviewUrl] = useState<string | null>(null);
  const [fullscreenReceiptUrl, setFullscreenReceiptUrl] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transactionId, setTransactionId] = useState('');
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
          const settingsData = settingsDoc.data() as HotelSettings;
          setHotelSettings(settingsData);
          if (settingsData.acceptedPaymentMethods && settingsData.acceptedPaymentMethods.length > 0) {
            setPaymentMethod(prev => {
              if (settingsData.acceptedPaymentMethods.includes(prev)) return prev;
              return settingsData.acceptedPaymentMethods[0];
            });
          }
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
      const roomsQ = query(collection(db, 'rooms'), where('categoryId', '==', category.id));
      const roomsSnap = await getDocs(roomsQ);
      
      let totalRooms = 0;
      roomsSnap.forEach(doc => {
        if (doc.data().status !== 'Out of Service') {
          totalRooms++;
        }
      });

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

      if (totalRooms === 0) {
        setAvailabilityError('No physical rooms have been added to this category in the inventory yet. (Admin: Please add rooms in the Room Inventory section).');
        setCheckingAvailability(false);
        return false;
      }

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
      const roomsQ = query(collection(db, 'rooms'), where('categoryId', '==', selectedCategory!.id));
      const roomsSnap = await getDocs(roomsQ);
      
      let totalRooms = 0;
      roomsSnap.forEach(doc => {
        if (doc.data().status !== 'Out of Service') {
          totalRooms++;
        }
      });

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
      const requiresPaymentProof = ['Bank Transfer', 'Deposit / ቀብድ', 'Telebirr', 'CBE Birr', 'Mobile Banking'].includes(paymentMethod);

      if (requiresPaymentProof && paymentFile) {
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

      const isAwaitingVerification = requiresPaymentProof;

      const newBooking: Omit<Booking, 'id'> = {
        reservationCode: code,
        type: 'room',
        guestId: currentUser?.uid || null,
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
        transactionId: transactionId || null,
        timeline: [{
          status: 'Created',
          timestamp: Date.now(),
          notes: `Booking created via portal. Payment method: ${paymentMethod}`
        }],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const createdDocRef = await addDoc(collection(db, 'bookings'), cleanFirestoreData(newBooking));

      // Save to local recent tracking cache
      saveRecentReservation({
        code,
        id: createdDocRef.id,
        categoryName: selectedCategory?.name || 'Room',
        guestName: `${guestDetails.firstName} ${guestDetails.lastName}`.trim(),
        guestPhone: guestDetails.phone,
        guestEmail: guestDetails.email,
        checkIn: new Date(checkIn).getTime(),
        checkOut: new Date(checkOut).getTime(),
        numberOfGuests: Number(guests),
        totalAmount: calculateTotal(),
        status: isAwaitingVerification ? 'Awaiting Payment Verification' : 'Pending',
        createdAt: Date.now()
      });

      // Trigger reception notification
      await sendNotification({
        recipientRole: 'reception',
        title: 'New Online Reservation',
        message: `New reservation ${code} received from ${guestDetails.firstName} ${guestDetails.lastName} (${selectedCategory?.name}).`,
        type: requiresPaymentProof ? 'payment' : 'reservation',
        relatedEntityId: createdDocRef.id,
        relatedEntityType: 'booking',
        targetRoute: '/admin/reservations',
        priority: requiresPaymentProof ? 'Important' : 'Normal',
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
                  ...(hotelSettings?.acceptedPaymentMethods?.length 
                    ? hotelSettings.acceptedPaymentMethods 
                    : ['Pay at Hotel', 'Mobile Banking', 'Bank Transfer', 'CBE Birr', 'Telebirr']),
                  ...(hotelSettings?.depositEnabled && !hotelSettings?.acceptedPaymentMethods?.includes('Deposit / ቀብድ') ? ['Deposit / ቀብድ'] : [])
                ].map(method => (
                  <div 
                    key={method} 
                    onClick={() => setPaymentMethod(method)}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${paymentMethod === method ? 'border-neutral-900 bg-neutral-900/5 ring-1 ring-neutral-900' : 'border-neutral-200 hover:border-neutral-300'}`}
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

              {['Bank Transfer', 'Deposit / ቀብድ', 'Telebirr', 'CBE Birr', 'Mobile Banking'].includes(paymentMethod) && (
                <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-neutral-900">Payment Accounts & Transfer Info</h3>
                    <span className="text-xs bg-neutral-200 font-bold px-2.5 py-1 rounded-full text-neutral-800">
                      {paymentMethod}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 mb-4">Please make your payment to the specific account details below and upload your receipt.</p>
                  
                  <div className="space-y-3 mb-5">
                    {paymentMethod === 'Telebirr' ? (
                      hotelSettings?.telebirrNo ? (
                        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                              <Smartphone className="w-4 h-4 text-emerald-600" />
                              Telebirr Mobile Money
                            </span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">
                              Pay via App or *127#
                            </span>
                          </div>
                          {hotelSettings.telebirrAccountName && (
                            <div className="flex items-center justify-between text-xs text-neutral-600">
                              <span>Account Name:</span>
                              <span className="font-semibold text-neutral-900">{hotelSettings.telebirrAccountName}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                            <span className="text-xs text-neutral-600">Telebirr Number:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-black text-neutral-900">{hotelSettings.telebirrNo}</span>
                              <CopyButton text={hotelSettings.telebirrNo} size="sm" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white p-4 rounded-xl border border-neutral-200 text-sm text-neutral-500">
                          Telebirr account details are currently being updated by management.
                        </div>
                      )
                    ) : paymentMethod === 'CBE Birr' ? (
                      hotelSettings?.cbeBirrNo ? (
                        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                              <Smartphone className="w-4 h-4 text-purple-600" />
                              CBE Birr Mobile Wallet / Merchant
                            </span>
                            <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded">
                              Pay via CBE Birr App or *847#
                            </span>
                          </div>
                          {hotelSettings.cbeBirrAccountName && (
                            <div className="flex items-center justify-between text-xs text-neutral-600">
                              <span>Merchant Name:</span>
                              <span className="font-semibold text-neutral-900">{hotelSettings.cbeBirrAccountName}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                            <span className="text-xs text-neutral-600">CBE Birr Phone / Code:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-black text-neutral-900">{hotelSettings.cbeBirrNo}</span>
                              <CopyButton text={hotelSettings.cbeBirrNo} size="sm" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white p-4 rounded-xl border border-neutral-200 text-sm text-neutral-500">
                          CBE Birr account details are currently being updated by management.
                        </div>
                      )
                    ) : (
                      /* Mobile Banking & Bank Transfer / Deposit */
                      hotelSettings?.bankDetails && hotelSettings.bankDetails.length > 0 ? (
                        hotelSettings.bankDetails.map((bank, i) => (
                          <div key={bank.id || i} className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-neutral-700" />
                                {bank.bankName}
                              </span>
                              <span className="text-[10px] bg-neutral-100 text-neutral-700 font-bold px-2 py-0.5 rounded">
                                {bank.shortCode ? bank.shortCode : 'Bank Account'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-neutral-600">
                              <span>Account Name:</span>
                              <span className="font-semibold text-neutral-900">{bank.accountName}</span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                              <span className="text-xs text-neutral-600">Account Number:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-black text-neutral-900">{bank.accountNumber}</span>
                                <CopyButton text={bank.accountNumber} size="sm" />
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 text-sm text-amber-900">
                          Bank account numbers have not been configured in hotel settings yet. Please contact reception to obtain current transfer details.
                        </div>
                      )
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-bold text-neutral-800">
                          Upload Payment Receipt (Proof) <span className="text-red-500">*</span>
                        </label>
                        {paymentPreviewUrl && (
                          <button
                            type="button"
                            onClick={() => setFullscreenReceiptUrl(paymentPreviewUrl)}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50 px-2.5 py-1 rounded-lg transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Full Screen
                          </button>
                        )}
                      </div>

                      {/* Hidden Native File Input */}
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0] || null;
                          if (file && file.size > 5 * 1024 * 1024) {
                            alert('File size exceeds 5MB limit. Please upload a smaller file (under 5MB).');
                            e.target.value = '';
                            setPaymentFile(null);
                            setPaymentPreviewUrl(null);
                            return;
                          }
                          setPaymentFile(file);
                          if (file && file.type.startsWith('image/')) {
                            setPaymentPreviewUrl(URL.createObjectURL(file));
                          } else if (file && file.type === 'application/pdf') {
                            setPaymentPreviewUrl('pdf');
                          } else {
                            setPaymentPreviewUrl(null);
                          }
                        }} 
                      />
                      
                      {!paymentPreviewUrl ? (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingFile(true);
                          }}
                          onDragLeave={() => setIsDraggingFile(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingFile(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                alert('File size exceeds 5MB limit.');
                                return;
                              }
                              setPaymentFile(file);
                              if (file.type.startsWith('image/')) {
                                setPaymentPreviewUrl(URL.createObjectURL(file));
                              } else if (file.type === 'application/pdf') {
                                setPaymentPreviewUrl('pdf');
                              }
                            }
                          }}
                          className={`flex flex-col items-center justify-center p-6 sm:p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                            isDraggingFile 
                              ? 'border-emerald-600 bg-emerald-50/50' 
                              : 'border-neutral-300 bg-white hover:bg-neutral-50/80 hover:border-neutral-400'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                            <Upload className="w-6 h-6 text-neutral-500" />
                          </div>
                          <p className="text-sm font-bold text-neutral-900 mb-1 text-center">
                            Click to upload receipt or drag and drop
                          </p>
                          <p className="text-xs text-neutral-500 text-center">
                            PNG, JPG, JPEG or PDF (up to 5MB)
                          </p>
                        </div>
                      ) : (
                        <div className="border border-neutral-200 rounded-xl bg-white p-4 relative shadow-xs">
                          {/* Close / Remove button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentFile(null);
                              setPaymentPreviewUrl(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="absolute top-3 right-3 z-10 p-1.5 bg-neutral-900/80 hover:bg-red-600 text-white rounded-lg shadow-md transition cursor-pointer"
                            title="Remove attachment"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {paymentPreviewUrl === 'pdf' ? (
                            <div 
                              onClick={() => setFullscreenReceiptUrl('pdf')}
                              className="flex items-center justify-center h-44 bg-neutral-50 rounded-lg border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition"
                            >
                              <div className="text-center p-4">
                                <FileText className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                                <span className="text-xs font-bold text-neutral-800 line-clamp-1">{paymentFile?.name}</span>
                                <span className="text-[11px] text-emerald-700 font-semibold mt-1 inline-flex items-center gap-1">
                                  <Eye className="w-3 h-3" /> Click to view details
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div 
                              onClick={() => setFullscreenReceiptUrl(paymentPreviewUrl)}
                              className="relative h-52 w-full rounded-lg bg-neutral-900/5 overflow-hidden group cursor-pointer border border-neutral-100 flex items-center justify-center"
                              title="Click to view full screen"
                            >
                              <img 
                                src={paymentPreviewUrl} 
                                alt="Payment Proof" 
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs backdrop-blur-xs">
                                <Maximize2 className="w-4 h-4" />
                                <span>Click to View Full Screen</span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-100">
                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Receipt Attached
                            </span>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-xs font-bold text-neutral-600 hover:text-neutral-900 underline cursor-pointer"
                            >
                              Change file
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Transaction ID / Reference Number (Optional)
                      </label>
                      <input 
                        type="text" 
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        className="w-full border-neutral-300 rounded-lg focus:ring-neutral-900 focus:border-neutral-900 text-sm px-3.5 py-2.5 border bg-white"
                        placeholder="e.g. FT2308..."
                      />
                    </div>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={submitting || (['Bank Transfer', 'Deposit / ቀብድ', 'Telebirr', 'CBE Birr', 'Mobile Banking'].includes(paymentMethod) && !paymentFile)} 
                className="w-full flex items-center justify-center py-4 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors disabled:opacity-70 mt-6 cursor-pointer"
              >
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
            
            <div className="bg-neutral-50 p-6 rounded-2xl inline-flex flex-col items-center justify-center mb-8 border border-neutral-200 shadow-xs max-w-sm w-full mx-auto">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">Your Reservation Code</p>
              <div className="flex items-center gap-3 my-1">
                <p className="text-3xl sm:text-4xl font-mono font-black text-neutral-900 tracking-wider">{reservationCode}</p>
                <CopyButton
                  text={reservationCode}
                  label="Copy"
                  copiedLabel="Copied!"
                  showText={false}
                  variant="dark"
                  size="md"
                  tooltip="Copy reservation code"
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">Click the copy icon to quickly copy this code.</p>
            </div>

            <p className="text-neutral-500 text-sm mb-8">Please save this code for future reference. We will contact you shortly to confirm your booking.</p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => navigate(`/track-reservation?code=${encodeURIComponent(reservationCode)}`)} className="px-8 py-4 bg-white border border-neutral-200 text-neutral-900 rounded-xl font-medium hover:bg-neutral-50 transition-colors w-full sm:w-auto">
                Track Status
              </button>
              <button onClick={() => navigate('/')} className="px-8 py-4 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors w-full sm:w-auto">
                Return to Home
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* In-Page Fullscreen Receipt Viewer Modal */}
      <ReceiptLightboxModal
        imageUrl={fullscreenReceiptUrl}
        title="Uploaded Payment Receipt"
        onClose={() => setFullscreenReceiptUrl(null)}
      />
    </div>
  );
}
