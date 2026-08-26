import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../firebase';
import { collection, addDoc, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Booking, Order, OrderTimelineEvent, HotelSettings, BankDetail } from '../../types';
import { sendNotification } from '../../lib/notificationService';
import { cleanFirestoreData } from '../../lib/firestoreUtils';
import { saveRecentOrder } from '../../lib/trackingStorage';
import { 
  X, CheckCircle, ShieldCheck, Hotel, UtensilsCrossed, CreditCard, DollarSign, 
  Building2, AlertCircle, Loader2, FileText, ArrowLeft, UploadCloud, Eye, Trash2, 
  Smartphone, Hash, Info, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CopyButton from '../common/CopyButton';
import ReceiptLightboxModal from '../common/ReceiptLightboxModal';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  useBodyScrollLock(isOpen);
  const { 
    cartItems, 
    selectedCartItems,
    orderType, 
    locationDetails, 
    setLocationDetails,
    subtotal,
    taxAmount,
    serviceChargeAmount,
    applicableRoomServiceFee,
    grandTotal,
    clearCart,
    clearSelectedItems,
    restaurantSettings,
    vatRate,
    serviceChargeRate
  } = useCart();

  const { userData, currentUser } = useAuth();
  const navigate = useNavigate();

  // Form States
  const [tableNumber, setTableNumber] = useState(locationDetails.tableNumber || '');
  const [roomNumber, setRoomNumber] = useState(locationDetails.roomNumber || '');
  const [reservationCode, setReservationCode] = useState(locationDetails.reservationCode || '');
  const [customerName, setCustomerName] = useState(locationDetails.guestName || userData?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState(locationDetails.guestPhone || userData?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(locationDetails.guestEmail || currentUser?.email || '');
  const [arrivalTime, setArrivalTime] = useState('');
  const [orderNotes, setOrderNotes] = useState(locationDetails.orderNotes || '');
  const [paymentMethod, setPaymentMethod] = useState<string>('Pay at Counter');

  // Payment Proof & Bank Info States
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentPreviewUrl, setPaymentPreviewUrl] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [fullscreenReceiptUrl, setFullscreenReceiptUrl] = useState<string | null>(null);
  const [hotelSettings, setHotelSettings] = useState<HotelSettings | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute strictly active payment methods based on restaurant & hotel settings
  const availablePaymentMethods = useMemo(() => {
    const configured = (restaurantSettings.acceptedPaymentMethods && restaurantSettings.acceptedPaymentMethods.length > 0)
      ? restaurantSettings.acceptedPaymentMethods
      : (hotelSettings?.acceptedPaymentMethods && hotelSettings.acceptedPaymentMethods.length > 0)
        ? hotelSettings.acceptedPaymentMethods
        : ['Cash', 'POS', 'Bank Transfer', 'Telebirr'];

    const normalized: { id: string; label: string; icon: any }[] = [];

    configured.forEach(methodKey => {
      const keyLower = methodKey.toLowerCase().trim();
      if (keyLower.includes('cash') || keyLower.includes('counter')) {
        if (!normalized.some(m => m.id === 'Pay at Counter')) {
          normalized.push({ id: 'Pay at Counter', label: 'Cash / Counter', icon: DollarSign });
        }
      } else if (keyLower.includes('room') || keyLower.includes('charge')) {
        // Room charge is only applicable for Room Service orders
        if (orderType === 'Room Service') {
          if (!normalized.some(m => m.id === 'Room Charge')) {
            normalized.push({ id: 'Room Charge', label: 'Charge to Room', icon: Hotel });
          }
        }
      } else if (keyLower.includes('bank') || keyLower.includes('transfer') || keyLower.includes('deposit')) {
        if (!normalized.some(m => m.id === 'Bank Transfer')) {
          normalized.push({ id: 'Bank Transfer', label: 'Bank Transfer', icon: Building2 });
        }
      } else if (keyLower.includes('telebirr')) {
        if (!normalized.some(m => m.id === 'Telebirr')) {
          normalized.push({ id: 'Telebirr', label: 'Telebirr', icon: Smartphone });
        }
      } else if (keyLower.includes('cbe birr') || keyLower.includes('cbebirr')) {
        if (!normalized.some(m => m.id === 'CBE Birr')) {
          normalized.push({ id: 'CBE Birr', label: 'CBE Birr', icon: Building2 });
        }
      } else if (keyLower.includes('mobile')) {
        if (!normalized.some(m => m.id === 'Mobile Banking')) {
          normalized.push({ id: 'Mobile Banking', label: 'Mobile Banking', icon: Smartphone });
        }
      } else if (keyLower.includes('pos') || keyLower.includes('card')) {
        if (!normalized.some(m => m.id === 'POS')) {
          normalized.push({ id: 'POS', label: 'POS / Card', icon: CreditCard });
        }
      } else {
        if (!normalized.some(m => m.id === methodKey)) {
          normalized.push({ id: methodKey, label: methodKey, icon: DollarSign });
        }
      }
    });

    if (normalized.length === 0) {
      normalized.push({ id: 'Pay at Counter', label: 'Pay at Counter', icon: DollarSign });
    }

    return normalized;
  }, [restaurantSettings.acceptedPaymentMethods, hotelSettings?.acceptedPaymentMethods, orderType]);

  // Keep paymentMethod strictly synchronized with active allowed list
  useEffect(() => {
    if (availablePaymentMethods.length > 0) {
      const isValid = availablePaymentMethods.some(m => m.id === paymentMethod);
      if (!isValid) {
        setPaymentMethod(availablePaymentMethods[0].id);
      }
    }
  }, [availablePaymentMethods, paymentMethod]);

  // Dynamic Bank Accounts & Merchant Credentials
  const activeBankDetails: BankDetail[] = useMemo(() => {
    if (restaurantSettings.bankDetails && restaurantSettings.bankDetails.length > 0) {
      return restaurantSettings.bankDetails;
    }
    if (hotelSettings?.bankDetails && hotelSettings.bankDetails.length > 0) {
      return hotelSettings.bankDetails;
    }
    return [];
  }, [restaurantSettings.bankDetails, hotelSettings?.bankDetails]);

  const telebirrNumber = restaurantSettings.telebirrNo || hotelSettings?.telebirrNo;
  const telebirrName = restaurantSettings.telebirrAccountName || hotelSettings?.telebirrAccountName || 'Woliso Hotel';

  const cbeBirrNumber = restaurantSettings.cbeBirrNo || hotelSettings?.cbeBirrNo;
  const cbeBirrName = restaurantSettings.cbeBirrAccountName || hotelSettings?.cbeBirrAccountName || 'Woliso Hotel';

  // Verification & Submission States
  const [verifyingRoom, setVerifyingRoom] = useState(false);
  const [verifiedBooking, setVerifiedBooking] = useState<Booking | null>(null);
  const [roomVerificationError, setRoomVerificationError] = useState('');
  
  const [verifyingTable, setVerifyingTable] = useState(false);
  const [tableVerified, setTableVerified] = useState(false);
  const [tableError, setTableError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Synchronize defaults on modal open and fetch hotel payment settings
  useEffect(() => {
    if (isOpen) {
      if (locationDetails.tableNumber) setTableNumber(locationDetails.tableNumber);
      if (locationDetails.roomNumber) setRoomNumber(locationDetails.roomNumber);
      if (locationDetails.reservationCode) setReservationCode(locationDetails.reservationCode);
      if (userData?.displayName && !customerName) setCustomerName(userData.displayName);
      if (userData?.phone && !customerPhone) setCustomerPhone(userData.phone);
      if (currentUser?.email && !customerEmail) setCustomerEmail(currentUser.email);

      // Fetch hotel general payment settings for rich bank details
      getDoc(doc(db, 'app_settings', 'hotel'))
        .then(snap => {
          if (snap.exists()) {
            setHotelSettings(snap.data() as HotelSettings);
          }
        })
        .catch(err => console.warn('Could not load hotel settings:', err));
    }
  }, [isOpen]);

  // Handle Payment File Selection
  const handleFileChange = (file: File | null) => {
    if (!file) {
      setPaymentFile(null);
      setPaymentPreviewUrl(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Payment proof file exceeds 5MB limit. Please upload a smaller image or PDF.');
      return;
    }

    setPaymentFile(file);
    setSubmitError('');

    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setPaymentPreviewUrl(previewUrl);
    } else {
      setPaymentPreviewUrl('pdf');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Handle Room Verification
  const verifyRoomOccupancy = async () => {
    if (!roomNumber.trim()) {
      setRoomVerificationError('Please enter a room number.');
      return false;
    }

    setVerifyingRoom(true);
    setRoomVerificationError('');
    setVerifiedBooking(null);

    try {
      // Find the room document by room number
      const roomsRef = collection(db, 'rooms');
      const roomQ = query(roomsRef, where('roomNumber', '==', roomNumber));
      const roomSnap = await getDocs(roomQ);
      
      let matchedRoomId = null;
      if (!roomSnap.empty) {
        matchedRoomId = roomSnap.docs[0].id;
      }

      // Find active Checked In bookings
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('status', '==', 'Checked In')
      );
      const snapshot = await getDocs(q);
      const activeBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];

      // Filter by room number
      const roomMatch = activeBookings.find(b => 
        b.roomId === roomNumber ||
        (matchedRoomId && b.roomId === matchedRoomId) ||
        (b as any).roomNumber === roomNumber
      );

      if (!roomMatch) {
        setRoomVerificationError(`Room ${roomNumber} is currently not occupied or not checked in.`);
        setVerifyingRoom(false);
        return false;
      }

      // Reservation code is now strictly required for room charging
      if (!reservationCode.trim()) {
        setRoomVerificationError(`Reservation code is required to authorize room charges.`);
        setVerifyingRoom(false);
        return false;
      }
      
      const codeClean = reservationCode.trim().toUpperCase();
      if (
        roomMatch.id.toUpperCase() !== codeClean && 
        roomMatch.reservationCode?.toUpperCase() !== codeClean
      ) {
        setRoomVerificationError(`Reservation code does not match active guest for Room ${roomNumber}.`);
        setVerifyingRoom(false);
        return false;
      }

      setVerifiedBooking(roomMatch);
      const fullName = `${roomMatch.guestDetails?.firstName || ''} ${roomMatch.guestDetails?.lastName || ''}`.trim();
      if (fullName && !customerName) setCustomerName(fullName);
      if (roomMatch.guestDetails?.phone && !customerPhone) setCustomerPhone(roomMatch.guestDetails.phone);
      setVerifyingRoom(false);
      return true;
    } catch (err) {
      console.error('Room verification error:', err);
      setRoomVerificationError('Failed to verify room occupancy. Please check details.');
      setVerifyingRoom(false);
      return false;
    }
  };

  // Verify Table exists
  const verifyTableValidity = async () => {
    if (!tableNumber.trim()) {
      setTableVerified(true);
      return true;
    }

    setVerifyingTable(true);
    setTableError('');

    try {
      const tablesRef = collection(db, 'restaurant_tables');
      const snapshot = await getDocs(tablesRef);
      const tables = snapshot.docs.map(doc => doc.data());

      if (tables.length > 0) {
        const found = tables.find((t: any) => 
          String(t.tableNumber).toLowerCase() === tableNumber.trim().toLowerCase()
        );
        if (!found) {
          setTableError(`Table "${tableNumber}" was not found in our restaurant system.`);
          setVerifyingTable(false);
          return false;
        }
        if (found.isActive === false || found.status === 'Inactive' || found.status === 'Maintenance' || found.status === 'Out of Service') {
          setTableError(`Table "${tableNumber}" is currently inactive or out of service.`);
          setVerifyingTable(false);
          return false;
        }
      }

      setTableVerified(true);
      setVerifyingTable(false);
      return true;
    } catch (err) {
      console.error('Table verification error:', err);
      setTableError('');
      setTableVerified(true);
      setVerifyingTable(false);
      return true;
    }
  };

  // Submit Order Handler
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitError('');

    // 1. Check Cart Non-Empty
    if (cartItems.length === 0) {
      setSubmitError('Your cart is empty.');
      return;
    }

    if (!restaurantSettings.isRestaurantOpen) {
      setSubmitError('The restaurant is currently closed. We are not accepting new orders.');
      return;
    }

    if (restaurantSettings.minimumOrderAmount && subtotal < restaurantSettings.minimumOrderAmount) {
      setSubmitError(`Minimum order amount is ${restaurantSettings.minimumOrderAmount} ETB.`);
      return;
    }

    // 2. Validate Mode Specific Context
    if (orderType === 'QR Menu/Dine in' || orderType === 'Dine-In') {
      if (tableNumber.trim()) {
        const validTable = await verifyTableValidity();
        if (!validTable) return;
      }
    }

    if (orderType === 'Room Service') {
      const validRoom = await verifyRoomOccupancy();
      if (!validRoom) return;
    }

    if (!customerName.trim()) {
      setSubmitError('Please enter your name.');
      return;
    }

    if (orderType !== 'QR Menu/Dine in' && orderType !== 'Takeaway' && !customerPhone.trim()) {
      setSubmitError('Please enter your phone number.');
      return;
    }

    if (orderType === 'Book Meal' && !arrivalTime.trim()) {
      setSubmitError('Please specify your expected arrival time.');
      return;
    }

    const isTransferPayment = ['Bank Transfer', 'Mobile Banking', 'Telebirr', 'CBE Birr'].includes(paymentMethod);
    if (isTransferPayment && !paymentFile && !transactionId.trim()) {
      setSubmitError('Please upload your payment receipt / transfer screenshot or enter your transaction reference number.');
      return;
    }

    setSubmitting(true);

    try {
      const orderNumber = `WOL-${Math.floor(100000 + Math.random() * 900000)}`;

      // Upload payment proof if provided
      let proofUrl = '';
      if (paymentFile) {
        try {
          const safeFileName = paymentFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const storageRef = ref(storage, `order_receipts/${orderNumber}_${Date.now()}_${safeFileName}`);
          const uploadTask = await Promise.race([
            uploadBytes(storageRef, paymentFile),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Storage timeout')), 4000))
          ]) as any;
          proofUrl = await getDownloadURL(uploadTask.ref);
        } catch (storageErr) {
          console.warn('Storage upload fallback to Data URL:', storageErr);
          // Fallback to data URL
          proofUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(paymentFile);
          });
        }
      }

      const initialTimeline: OrderTimelineEvent[] = [
        {
          status: 'Order Submitted',
          timestamp: Date.now(),
          note: proofUrl 
            ? `Order placed via ${orderType} with payment receipt attached (${paymentMethod})`
            : `Order placed via ${orderType} (${paymentMethod})`,
          updatedBy: customerName
        }
      ];

      // Format order items cleanly (only checked/selected items)
      const activeCartItems = selectedCartItems.length > 0 ? selectedCartItems : cartItems;
      const orderItemsList = activeCartItems.map(({ item, quantity, notes }) => ({
        itemId: item.id,
        name: item.name,
        quantity,
        price: item.price,
        notes: notes || '',
        category: item.category,
        imageUrl: item.imageUrl || '',
        isSpicy: item.isSpicy || false,
        isVegetarian: item.isVegetarian || false,
        kitchenStationId: item.kitchenStationId || '',
        kitchenStationName: item.kitchenStationName || '',
        status: 'Pending' as const
      }));

      const locationRefStr = 
        orderType === 'Room Service' ? `Room ${roomNumber}` :
        (orderType === 'QR Menu/Dine in' || orderType === 'Dine-In' || orderType === 'Book Meal') ? (tableNumber ? `Table ${tableNumber}` : 'Unassigned Table') :
        'Takeaway / Counter';

      const orderData: Partial<Order> = {
        orderNumber,
        type: orderType,
        locationRef: locationRefStr,
        tableNumber: tableNumber ? tableNumber : '',
        roomNumber: roomNumber ? roomNumber : '',
        reservationCode: verifiedBooking?.id || reservationCode || '',
        reservationId: verifiedBooking?.id || '',
        customerName: customerName.trim(),
        customerPhone: (orderType === 'QR Menu/Dine in' || orderType === 'Takeaway') ? '' : customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        arrivalTime: orderType === 'Book Meal' ? arrivalTime : '',
        customerUid: currentUser?.uid || '',
        items: orderItemsList,
        subtotal,
        taxRate: vatRate,
        taxAmount,
        serviceChargeRate: serviceChargeRate,
        serviceChargeAmount,
        roomServiceFee: applicableRoomServiceFee,
        totalAmount: grandTotal,
        paymentMethod,
        paymentStatus: isTransferPayment 
          ? (proofUrl ? 'Pending Verification' : 'Pending') 
          : (paymentMethod === 'Room Charge' ? 'Charged to Room' : 'Pending'),
        paymentProofUrl: proofUrl || '',
        transactionId: transactionId.trim() || '',
        status: 'Order Submitted',
        orderNotes: orderNotes.trim(),
        timeline: initialTimeline,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Save to Firestore with clean payload
      const cleanedData = cleanFirestoreData(orderData);
      const docRef = await addDoc(collection(db, 'restaurant_orders'), cleanedData);

      // Save to local recent tracking cache
      saveRecentOrder({
        id: docRef.id,
        orderNumber,
        type: orderType,
        locationRef: locationRefStr,
        totalAmount: grandTotal,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        status: 'Order Submitted',
        itemsCount: orderItemsList.reduce((sum, item) => sum + item.quantity, 0),
        itemsSummary: orderItemsList.map(i => `${i.quantity}x ${i.name}`).join(', '),
        createdAt: Date.now()
      });

      // Trigger Kitchen notification
      const locLabel = orderType === 'Dine-In' ? `Table ${tableNumber}` : orderType === 'Room Delivery' ? `Room ${roomNumber}` : 'Takeaway';
      await sendNotification({
        recipientRole: 'kitchen',
        title: `New Order #${docRef.id.slice(-6).toUpperCase()} (${locLabel})`,
        message: `${orderItemsList.length} items ordered for ${locLabel}. Total: ${grandTotal.toLocaleString()} ETB.`,
        type: 'order',
        relatedEntityId: docRef.id,
        relatedEntityType: 'order',
        targetRoute: '/admin/kitchen',
        priority: 'Important',
        eventId: `ord_new_${docRef.id}`
      });

      // Save context
      setLocationDetails({
        tableNumber,
        roomNumber,
        reservationCode,
        guestName: customerName,
        guestPhone: customerPhone,
        guestEmail: customerEmail,
        paymentMethod
      });

      // Clear Selected Items from Cart
      clearSelectedItems();
      onClose();

      // Navigate to Order Tracker
      navigate(`/restaurant/track/${docRef.id}`);

    } catch (err: any) {
      console.error('Failed to submit order:', err);
      setSubmitError(err.message || 'Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overscroll-contain">
      <div 
        className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl border border-neutral-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-200 flex justify-between items-center bg-neutral-900 text-white">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-lg">Complete Restaurant Order</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmitOrder} className="p-6 space-y-5 flex-1">
          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              {submitError}
            </div>
          )}

          {/* Mode Confirmation */}
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-800 flex items-center gap-2">
              {orderType === 'Room Service' && <Hotel className="w-4 h-4 text-emerald-600" />}
              {orderType === 'QR Menu/Dine in' && <UtensilsCrossed className="w-4 h-4 text-emerald-600" />}
              Order Type: <span className="text-emerald-700 uppercase">{orderType}</span>
            </span>
            <span className="font-bold text-neutral-900">
              Total: <span className="text-emerald-700 font-extrabold text-sm">{grandTotal} ETB</span>
            </span>
          </div>

          {/* Location Verification Sections */}
          {orderType === 'QR Menu/Dine in' || orderType === 'Dine-In' || orderType === 'Book Meal' ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center justify-between">
                <span>Table Number <span className="text-neutral-400 font-normal normal-case ml-1">(Optional)</span></span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. T-04 or 12"
                  value={tableNumber}
                  onChange={(e) => {
                    setTableNumber(e.target.value);
                    setTableVerified(false);
                  }}
                  className="flex-1 p-2.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={verifyTableValidity}
                  disabled={verifyingTable || !tableNumber.trim()}
                  className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  {verifyingTable ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  Verify
                </button>
              </div>
              {tableError && <p className="text-xs text-rose-600 font-medium mt-1">{tableError}</p>}
              {tableVerified && <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Table Verified!</p>}
              <p className="text-[10px] text-neutral-500 italic">If you don't know your table number, you can leave this blank and take any available seat.</p>
            </div>
          ) : orderType === 'Room Service' ? (
            <div className="space-y-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Hotel className="w-4 h-4 text-emerald-600" /> Room Service Verification
                </h4>
                <span className="text-[11px] text-emerald-700 font-medium">Occupied Room Only</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Room Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 204"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full p-2 text-xs border border-neutral-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Reservation Code / ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RES-1092"
                    value={reservationCode}
                    onChange={(e) => setReservationCode(e.target.value)}
                    className="w-full p-2 text-xs border border-neutral-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <button
                  type="button"
                  onClick={verifyRoomOccupancy}
                  disabled={verifyingRoom || !roomNumber.trim()}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  {verifyingRoom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  Verify Occupancy
                </button>

                {verifiedBooking && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Guest Verified ({verifiedBooking.guestDetails?.firstName} {verifiedBooking.guestDetails?.lastName})
                  </span>
                )}
              </div>

              {roomVerificationError && (
                <p className="text-xs text-rose-600 font-semibold mt-1 bg-white p-2 rounded border border-rose-200">
                  {roomVerificationError}
                </p>
              )}
            </div>
          ) : null}

          {/* Customer Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Contact & Customer Info</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Your First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Abebe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {orderType !== 'QR Menu/Dine in' && orderType !== 'Takeaway' && (
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +251 911 000000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full p-2.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              )}

              {orderType === 'Book Meal' && (
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Expected Arrival Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="w-full p-2.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3 pt-3 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Payment Option <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-neutral-400">
                {availablePaymentMethods.length} option{availablePaymentMethods.length !== 1 ? 's' : ''} available
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {availablePaymentMethods.map((item) => {
                const Icon = item.icon || DollarSign;
                const isSelected = paymentMethod === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(item.id);
                      setSubmitError('');
                    }}
                    className={`p-3 rounded-xl border text-left font-bold flex items-center gap-2 transition ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs ring-1 ring-emerald-500'
                        : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-neutral-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Bank Transfer / Mobile Banking / Telebirr / CBE Birr Instructions & Proof Upload */}
            {['Bank Transfer', 'Mobile Banking', 'Telebirr', 'CBE Birr'].includes(paymentMethod) && (
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-4 animate-fade-in">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-neutral-600">
                    <p className="font-bold text-neutral-900">
                      Payment Details for {paymentMethod}
                    </p>
                    <p className="mt-0.5">
                      Please transfer <span className="font-bold text-emerald-700">{grandTotal.toLocaleString()} ETB</span> using the official account information below, then upload your transaction receipt.
                    </p>
                  </div>
                </div>

                {/* Dynamic Account Details Box */}
                <div className="bg-white p-3.5 rounded-xl border border-neutral-200 divide-y divide-neutral-100 text-xs space-y-2">
                  {/* Telebirr Dedicated Account Display */}
                  {paymentMethod === 'Telebirr' && (
                    <div className="pt-2 first:pt-0">
                      {telebirrNumber ? (
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-bold text-neutral-900 flex items-center gap-1.5">
                              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                              Telebirr Merchant / Phone
                            </p>
                            <p className="text-[11px] text-neutral-500">
                              {telebirrName} • <span className="font-mono font-bold text-neutral-900">{telebirrNumber}</span>
                            </p>
                          </div>
                          <CopyButton text={telebirrNumber} label="Copy" size="xs" variant="neutral" />
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg">
                          Telebirr number has not been configured in admin settings yet. Please ask the waiter or reception for details.
                        </p>
                      )}
                    </div>
                  )}

                  {/* CBE Birr Dedicated Account Display */}
                  {paymentMethod === 'CBE Birr' && (
                    <div className="pt-2 first:pt-0">
                      {cbeBirrNumber ? (
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-bold text-neutral-900 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-purple-600" />
                              CBE Birr Merchant Code / Phone
                            </p>
                            <p className="text-[11px] text-neutral-500">
                              {cbeBirrName} • <span className="font-mono font-bold text-neutral-900">{cbeBirrNumber}</span>
                            </p>
                          </div>
                          <CopyButton text={cbeBirrNumber} label="Copy" size="xs" variant="neutral" />
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg">
                          CBE Birr merchant code has not been configured in admin settings yet. Please ask the waiter or reception for details.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Bank Accounts (For Bank Transfer and Mobile Banking) */}
                  {(paymentMethod === 'Bank Transfer' || paymentMethod === 'Mobile Banking') && (
                    <>
                      {activeBankDetails.length > 0 ? (
                        activeBankDetails.map((bank) => (
                          <div key={bank.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-neutral-900 flex items-center gap-1.5 truncate">
                                <Building2 className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                                {bank.bankName || 'Commercial Bank Account'}
                              </p>
                              <p className="text-[11px] text-neutral-500 truncate">
                                {bank.accountName ? `${bank.accountName} • ` : ''}
                                <span className="font-mono font-bold text-neutral-900">{bank.accountNumber}</span>
                                {bank.shortCode ? ` (${bank.shortCode})` : ''}
                              </p>
                            </div>
                            <CopyButton text={bank.accountNumber} label="Copy" size="xs" variant="neutral" />
                          </div>
                        ))
                      ) : (
                        <div className="py-2 text-center text-neutral-500">
                          <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg">
                            No bank accounts configured in restaurant settings yet. Please contact management or choose Pay at Counter.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* File Upload Dropzone */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-700 flex items-center gap-1">
                      <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                      Upload Payment Proof / Transfer Receipt <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-neutral-400">PNG, JPG, PDF (Max 5MB)</span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                  />

                  {!paymentFile ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition ${
                        isDraggingFile
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                          : 'border-neutral-300 hover:border-emerald-500 hover:bg-white bg-neutral-100/60'
                      }`}
                    >
                      <UploadCloud className="w-7 h-7 text-neutral-400 mb-1" />
                      <p className="text-xs font-bold text-neutral-700">
                        Click to upload or drag & drop transfer receipt
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">
                        Screenshot of mobile banking confirmation or photo of bank deposit slip
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-white border border-emerald-300 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {paymentPreviewUrl && paymentPreviewUrl !== 'pdf' ? (
                          <img
                            src={paymentPreviewUrl}
                            alt="Receipt Preview"
                            className="w-12 h-12 rounded-lg object-cover border border-neutral-200 shrink-0 cursor-pointer hover:opacity-80"
                            onClick={() => setFullscreenReceiptUrl(paymentPreviewUrl)}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="text-xs font-bold text-neutral-900 truncate">{paymentFile.name}</p>
                          <p className="text-[10px] text-neutral-500">{(paymentFile.size / 1024).toFixed(1)} KB • Ready to submit</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {paymentPreviewUrl && (
                          <button
                            type="button"
                            onClick={() => setFullscreenReceiptUrl(paymentPreviewUrl)}
                            className="p-1.5 text-neutral-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                            title="View Fullscreen"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="hidden sm:inline">Preview</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentFile(null);
                            setPaymentPreviewUrl(null);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Remove File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Optional Transaction ID Input */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-neutral-400" />
                    Transaction / Reference ID <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FT24098273948 or CBE-981240"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full p-2 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* General Order Notes */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
              General Kitchen Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Please bring extra cutlery, serve dessert later..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="w-full p-2.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-neutral-600 hover:text-neutral-900 font-bold text-xs"
            >
              Back to Cart
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting Order...
                </>
              ) : (
                <>
                  Place Order ({grandTotal.toLocaleString()} ETB)
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* In-Page Fullscreen Receipt Lightbox */}
      <ReceiptLightboxModal
        imageUrl={fullscreenReceiptUrl}
        title="Payment Receipt Preview"
        onClose={() => setFullscreenReceiptUrl(null)}
      />
    </div>
  );
}
