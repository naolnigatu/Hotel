import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { Booking, Order, OrderTimelineEvent } from '../../types';
import { sendNotification } from '../../lib/notificationService';
import { X, CheckCircle, ShieldCheck, Hotel, UtensilsCrossed, CreditCard, DollarSign, Building2, AlertCircle, Loader2, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const { 
    cartItems, 
    orderType, 
    locationDetails, 
    setLocationDetails,
    subtotal,
    taxAmount,
    serviceChargeAmount,
    applicableRoomServiceFee,
    grandTotal,
    clearCart,
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
  const [orderNotes, setOrderNotes] = useState(locationDetails.orderNotes || '');
  const [paymentMethod, setPaymentMethod] = useState<string>(
    orderType === 'Room Service' ? 'Room Charge' : 'Pay at Counter'
  );

  // Verification & Submission States
  const [verifyingRoom, setVerifyingRoom] = useState(false);
  const [verifiedBooking, setVerifiedBooking] = useState<Booking | null>(null);
  const [roomVerificationError, setRoomVerificationError] = useState('');
  
  const [verifyingTable, setVerifyingTable] = useState(false);
  const [tableVerified, setTableVerified] = useState(false);
  const [tableError, setTableError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Synchronize defaults on modal open
  useEffect(() => {
    if (isOpen) {
      if (locationDetails.tableNumber) setTableNumber(locationDetails.tableNumber);
      if (locationDetails.roomNumber) setRoomNumber(locationDetails.roomNumber);
      if (locationDetails.reservationCode) setReservationCode(locationDetails.reservationCode);
      if (userData?.displayName && !customerName) setCustomerName(userData.displayName);
      if (userData?.phone && !customerPhone) setCustomerPhone(userData.phone);
      if (currentUser?.email && !customerEmail) setCustomerEmail(currentUser.email);
    }
  }, [isOpen]);

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
      setTableError('Please specify your table number.');
      return false;
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
    if (orderType === 'QR Table' || orderType === 'Dine-In') {
      const validTable = await verifyTableValidity();
      if (!validTable) return;
    }

    if (orderType === 'Room Service') {
      const validRoom = await verifyRoomOccupancy();
      if (!validRoom) return;
    }

    if (!customerName.trim()) {
      setSubmitError('Please enter your name.');
      return;
    }

    setSubmitting(true);

    try {
      const orderNumber = `WOL-${Math.floor(100000 + Math.random() * 900000)}`;

      const initialTimeline: OrderTimelineEvent[] = [
        {
          status: 'Order Submitted',
          timestamp: Date.now(),
          note: `Order placed via ${orderType}`,
          updatedBy: customerName
        }
      ];

      // Format order items cleanly
      const orderItemsList = cartItems.map(({ item, quantity, notes }) => ({
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
        orderType === 'QR Table' ? `Table ${tableNumber}` :
        orderType === 'Dine-In' ? `Table ${tableNumber}` :
        'Takeaway / Counter';

      const orderData: Partial<Order> = {
        orderNumber,
        type: orderType,
        locationRef: locationRefStr,
        tableNumber: tableNumber ? tableNumber : undefined,
        roomNumber: roomNumber ? roomNumber : undefined,
        reservationCode: verifiedBooking?.id || reservationCode || undefined,
        reservationId: verifiedBooking?.id || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        customerUid: currentUser?.uid || undefined,
        items: orderItemsList,
        subtotal,
        taxRate: vatRate,
        taxAmount,
        serviceChargeRate: serviceChargeRate,
        serviceChargeAmount,
        roomServiceFee: applicableRoomServiceFee,
        totalAmount: grandTotal,
        paymentMethod,
        paymentStatus: paymentMethod === 'Room Charge' ? 'Charged to Room' : 'Pending',
        status: 'Order Submitted',
        orderNotes: orderNotes.trim(),
        timeline: initialTimeline,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'restaurant_orders'), orderData);

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

      // Clear Cart
      clearCart();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-100 flex flex-col"
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
              {orderType === 'QR Table' && <UtensilsCrossed className="w-4 h-4 text-emerald-600" />}
              Order Type: <span className="text-emerald-700 uppercase">{orderType}</span>
            </span>
            <span className="font-bold text-neutral-900">
              Total: <span className="text-emerald-700 font-extrabold text-sm">{grandTotal} ETB</span>
            </span>
          </div>

          {/* Location Verification Sections */}
          {orderType === 'QR Table' || orderType === 'Dine-In' ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Table Number <span className="text-rose-500">*</span>
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
                  required
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
                  Your Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Abebe Bikila"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +251 911 000000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-2.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Payment Option <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {restaurantSettings.acceptedPaymentMethods.map((method) => {
                if (method === 'Room Charge' && orderType !== 'Room Service') return null;

                let Icon = DollarSign;
                if (method === 'Room Charge') Icon = Hotel;
                else if (method === 'Bank Transfer') Icon = Building2;
                else if (method === 'POS') Icon = CreditCard;
                
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`p-3 rounded-xl border font-bold flex items-center gap-2 transition ${
                      paymentMethod === method
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-emerald-600" /> {method}
                  </button>
                );
              })}
            </div>

            {paymentMethod === 'Bank Transfer' && restaurantSettings.bankDetails && restaurantSettings.bankDetails.length > 0 && (
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-[11px] text-neutral-600 space-y-2">
                {restaurantSettings.bankDetails.map(bank => (
                  <div key={bank.id}>
                    <p className="font-bold text-neutral-900">{bank.bankName}</p>
                    {bank.accountName && <p>Account Name: {bank.accountName}</p>}
                    {bank.accountNumber && <p>Account Number: {bank.accountNumber}</p>}
                    {bank.shortCode && <p className="text-emerald-700 font-semibold">Short Code / Merchant: {bank.shortCode}</p>}
                  </div>
                ))}
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
              className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition flex items-center gap-2 shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting Order...
                </>
              ) : (
                <>
                  Place Order ({grandTotal} ETB)
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
