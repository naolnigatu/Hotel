import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc, 
  query, 
  orderBy, 
  where 
} from 'firebase/firestore';
import { Order, Booking, Role } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { handleFirestoreError, OperationType, logAuditAction } from '../../lib/firestoreUtils';
import { sendNotification } from '../../lib/notificationService';
import CreateOrderModal from '../../components/admin/CreateOrderModal';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { 
  DollarSign, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  Eye, 
  Printer, 
  Download, 
  RefreshCw, 
  Utensils, 
  Building2, 
  Receipt, 
  ArrowUpRight, 
  ShieldCheck, 
  Plus, 
  FileText, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Calendar,
  X
} from 'lucide-react';

export default function CashierDashboard() {
  const { userData } = useAuth();
  const staffId = userData?.uid || 'cashier-uid';
  const staffName = userData?.name || 'Cashier Desk';
  const staffRole = userData?.role || 'cashier';

  // Data states
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'verification' | 'restaurant' | 'reservations' | 'money-flow'>('verification');
  
  // Verification Sub-filter
  const [verificationScope, setVerificationScope] = useState<'all' | 'orders' | 'bookings'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');

  // Modals
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
  // Rejection Modal
  const [rejectionTarget, setRejectionTarget] = useState<{ type: 'order' | 'booking'; id: string; code: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Receipt Modal
  const [receiptItem, setReceiptItem] = useState<{ type: 'order' | 'booking'; data: Order | Booking } | null>(null);

  // Notices
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useBodyScrollLock(!!previewImageUrl || !!rejectionTarget || !!receiptItem);

  useEffect(() => {
    // 1. Real-time listener for restaurant orders
    const qOrders = query(collection(db, 'restaurant_orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      setOrders(list);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'restaurant_orders');
      setLoading(false);
    });

    // 2. Real-time listener for hotel & hall bookings
    const qBookings = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
      setBookings(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'bookings');
    });

    return () => {
      unsubOrders();
      unsubBookings();
    };
  }, []);

  // Filter Items Pending Verification
  const pendingOrderVerifications = useMemo(() => {
    return orders.filter(o => 
      o.paymentStatus === 'Pending Verification' || 
      (o.paymentProofUrl && o.paymentStatus !== 'Paid')
    );
  }, [orders]);

  const pendingBookingVerifications = useMemo(() => {
    return bookings.filter(b => 
      (b.paymentProofUrl && b.status !== 'confirmed' && b.status !== 'checked-in' && b.status !== 'cancelled') ||
      (b.paymentMethod && b.paymentMethod !== 'Pay at Hotel' && b.status === 'pending')
    );
  }, [bookings]);

  // Financial Metrics (Calculated for Today)
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  const metrics = useMemo(() => {
    const todayOrders = orders.filter(o => o.createdAt >= startOfDay);
    const todayBookings = bookings.filter(b => b.createdAt >= startOfDay);

    const paidOrders = orders.filter(o => o.paymentStatus === 'Paid');
    const todayPaidOrders = todayOrders.filter(o => o.paymentStatus === 'Paid');
    
    // Revenue breakdown by payment method for today
    let cashTotal = 0;
    let posTotal = 0;
    let telebirrTotal = 0;
    let cbeBirrTotal = 0;
    let roomChargeTotal = 0;
    let otherTotal = 0;

    todayPaidOrders.forEach(o => {
      const amount = o.totalAmount || 0;
      const method = (o.paymentMethod || '').toLowerCase();
      if (method.includes('cash')) cashTotal += amount;
      else if (method.includes('pos') || method.includes('card')) posTotal += amount;
      else if (method.includes('telebirr')) telebirrTotal += amount;
      else if (method.includes('cbe')) cbeBirrTotal += amount;
      else roomChargeTotal += amount;
    });

    // Room charges
    const pendingRoomCharges = orders
      .filter(o => o.paymentStatus === 'Charged to Room')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const totalCollectedToday = cashTotal + posTotal + telebirrTotal + cbeBirrTotal + otherTotal;
    const totalPendingProofs = pendingOrderVerifications.length + pendingBookingVerifications.length;

    return {
      totalCollectedToday,
      cashTotal,
      posTotal,
      telebirrTotal,
      cbeBirrTotal,
      roomChargeTotal,
      pendingRoomCharges,
      totalPendingProofs,
      todayOrdersCount: todayOrders.length,
      todayPaidOrdersCount: todayPaidOrders.length
    };
  }, [orders, bookings, pendingOrderVerifications, pendingBookingVerifications, startOfDay]);

  // Approve Payment for Order
  const handleApproveOrderPayment = async (order: Order) => {
    setIsProcessing(true);
    try {
      const orderRef = doc(db, 'restaurant_orders', order.id);
      const now = Date.now();
      const updatedTimeline = [
        ...(order.timeline || []),
        {
          status: 'Payment Approved',
          timestamp: now,
          note: `Payment verified & approved by Cashier ${staffName}`,
          updatedBy: staffName
        }
      ];

      await updateDoc(orderRef, {
        paymentStatus: 'Paid',
        timeline: updatedTimeline,
        updatedAt: now
      });

      await logAuditAction(
        staffId,
        staffName,
        staffRole,
        `Approved Payment for Order #${order.orderNumber}`,
        'Cashier',
        `Amount: ${order.totalAmount} ETB, Method: ${order.paymentMethod}`
      );

      // Send confirmation notification to waiter
      if (order.assignedWaiterId) {
        await sendNotification({
          recipientUid: order.assignedWaiterId,
          title: `Payment Verified: #${order.orderNumber}`,
          message: `Cashier approved payment for ${order.locationRef} (${order.totalAmount} ETB).`,
          type: 'payment',
          relatedEntityId: order.id,
          relatedEntityType: 'order',
          targetRoute: '/admin/waiter',
          priority: 'Normal',
          eventId: `pay_verified_${order.id}`
        });
      }

      setNotice({ type: 'success', text: `Payment for Order #${order.orderNumber} successfully approved.` });
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      console.error('Error approving order payment:', err);
      setNotice({ type: 'error', text: 'Failed to approve payment. Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Approve Payment for Booking
  const handleApproveBookingPayment = async (booking: Booking) => {
    setIsProcessing(true);
    try {
      const bookingRef = doc(db, 'bookings', booking.id);
      const now = Date.now();
      const updatedTimeline = [
        ...(booking.timeline || []),
        {
          status: 'Payment Verified',
          timestamp: now,
          notes: `Payment proof verified & confirmed by Cashier ${staffName}`,
          userName: staffName
        }
      ];

      await updateDoc(bookingRef, {
        status: 'confirmed',
        timeline: updatedTimeline,
        updatedAt: now
      });

      await logAuditAction(
        staffId,
        staffName,
        staffRole,
        `Approved Payment for Booking ${booking.reservationCode}`,
        'Cashier',
        `Guest: ${booking.guestDetails.firstName} ${booking.guestDetails.lastName}, Total: ${booking.totalAmount} ETB`
      );

      // Send notification to Reception
      await sendNotification({
        recipientRole: 'reception',
        title: `Payment Verified: ${booking.reservationCode}`,
        message: `Booking for ${booking.guestDetails.firstName} ${booking.guestDetails.lastName} confirmed by Cashier.`,
        type: 'reservation',
        relatedEntityId: booking.id,
        relatedEntityType: 'booking',
        targetRoute: '/admin/reservations',
        priority: 'Normal',
        eventId: `book_pay_verified_${booking.id}`
      });

      setNotice({ type: 'success', text: `Payment for Booking ${booking.reservationCode} verified & confirmed.` });
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      console.error('Error approving booking payment:', err);
      setNotice({ type: 'error', text: 'Failed to verify booking payment.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit Payment Rejection
  const handleRejectPayment = async () => {
    if (!rejectionTarget) return;
    if (!rejectionReason.trim()) {
      setNotice({ type: 'error', text: 'Please provide a clear reason for rejecting the payment proof.' });
      return;
    }

    setIsProcessing(true);
    const now = Date.now();

    try {
      if (rejectionTarget.type === 'order') {
        const order = orders.find(o => o.id === rejectionTarget.id);
        const orderRef = doc(db, 'restaurant_orders', rejectionTarget.id);
        const updatedTimeline = [
          ...(order?.timeline || []),
          {
            status: 'Payment Rejected',
            timestamp: now,
            note: `Payment proof rejected by Cashier ${staffName}. Reason: ${rejectionReason.trim()}`,
            updatedBy: staffName
          }
        ];

        await updateDoc(orderRef, {
          paymentStatus: 'Rejected',
          paymentRejectionReason: rejectionReason.trim(),
          timeline: updatedTimeline,
          updatedAt: now
        });

        await logAuditAction(
          staffId,
          staffName,
          staffRole,
          `Rejected Payment for Order #${rejectionTarget.code}`,
          'Cashier',
          `Reason: ${rejectionReason.trim()}`
        );

        // Notify Waiter / Reception
        await sendNotification({
          recipientRole: 'waiter',
          title: `Payment Proof Rejected: #${rejectionTarget.code}`,
          message: `Reason: ${rejectionReason.trim()}. Please collect valid payment.`,
          type: 'payment',
          relatedEntityId: rejectionTarget.id,
          relatedEntityType: 'order',
          targetRoute: '/admin/waiter',
          priority: 'Urgent',
          eventId: `order_pay_reject_${rejectionTarget.id}`
        });

      } else {
        const booking = bookings.find(b => b.id === rejectionTarget.id);
        const bookingRef = doc(db, 'bookings', rejectionTarget.id);
        const updatedTimeline = [
          ...(booking?.timeline || []),
          {
            status: 'Payment Proof Rejected',
            timestamp: now,
            notes: `Payment proof rejected by Cashier ${staffName}. Reason: ${rejectionReason.trim()}`,
            userName: staffName
          }
        ];

        await updateDoc(bookingRef, {
          status: 'pending',
          paymentRejectionReason: rejectionReason.trim(),
          timeline: updatedTimeline,
          updatedAt: now
        });

        await logAuditAction(
          staffId,
          staffName,
          staffRole,
          `Rejected Payment Proof for Booking ${rejectionTarget.code}`,
          'Cashier',
          `Reason: ${rejectionReason.trim()}`
        );

        // Notify Reception
        await sendNotification({
          recipientRole: 'reception',
          title: `Payment Proof Rejected: ${rejectionTarget.code}`,
          message: `Reason: ${rejectionReason.trim()}. Contact guest for re-upload.`,
          type: 'reservation',
          relatedEntityId: rejectionTarget.id,
          relatedEntityType: 'booking',
          targetRoute: '/admin/reservations',
          priority: 'Urgent',
          eventId: `booking_pay_reject_${rejectionTarget.id}`
        });
      }

      setNotice({ type: 'success', text: `Payment for ${rejectionTarget.code} marked as Rejected.` });
      setRejectionTarget(null);
      setRejectionReason('');
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      console.error('Error rejecting payment:', err);
      setNotice({ type: 'error', text: 'Failed to reject payment.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Mark Order as Paid on the spot (Cash / POS)
  const handleDirectSettleOrder = async (order: Order, method: 'Cash' | 'POS' | 'Telebirr' | 'CBE Birr') => {
    try {
      const orderRef = doc(db, 'restaurant_orders', order.id);
      const now = Date.now();
      const updatedTimeline = [
        ...(order.timeline || []),
        {
          status: 'Payment Collected',
          timestamp: now,
          note: `Settled via ${method} at Cashier Desk by ${staffName}`,
          updatedBy: staffName
        }
      ];

      await updateDoc(orderRef, {
        paymentStatus: 'Paid',
        paymentMethod: method,
        timeline: updatedTimeline,
        updatedAt: now
      });

      await logAuditAction(
        staffId,
        staffName,
        staffRole,
        `Settled Order #${order.orderNumber} via ${method}`,
        'Cashier',
        `Amount: ${order.totalAmount} ETB`
      );

      setNotice({ type: 'success', text: `Order #${order.orderNumber} settled via ${method}.` });
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      console.error('Error settling order:', err);
      setNotice({ type: 'error', text: 'Failed to settle order.' });
    }
  };

  // Filtered Restaurant Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = 
        (o.orderNumber && o.orderNumber.includes(searchQuery)) ||
        (o.customerName && o.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.locationRef && o.locationRef.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.transactionId && o.transactionId.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesMethod = paymentMethodFilter === 'all' || 
        (o.paymentMethod && o.paymentMethod.toLowerCase() === paymentMethodFilter.toLowerCase());

      return matchesSearch && matchesMethod;
    });
  }, [orders, searchQuery, paymentMethodFilter]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const guestName = `${b.guestDetails?.firstName || ''} ${b.guestDetails?.lastName || ''}`.toLowerCase();
      const matchesSearch = 
        (b.reservationCode && b.reservationCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        guestName.includes(searchQuery.toLowerCase()) ||
        (b.transactionId && b.transactionId.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesSearch;
    });
  }, [bookings, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
            <Receipt className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900">Cashier & Finance Desk</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Active Till
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Control money flow, reconcile cash & digital transactions, verify guest payment slips.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCreateOrderOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Take Customer Order (POS)</span>
          </button>
        </div>
      </div>

      {/* Notice Toast */}
      {notice && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs ${
          notice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-neutral-500 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Today's Revenue */}
        <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Today's Receipts</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-neutral-900">
            {metrics.totalCollectedToday.toLocaleString()} <span className="text-sm font-semibold text-neutral-500">ETB</span>
          </div>
          <p className="text-[11px] text-neutral-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{metrics.todayPaidOrdersCount} settled tickets today</span>
          </p>
        </div>

        {/* Metric 2: Pending Verification Slips */}
        <div className={`p-5 rounded-2xl border shadow-2xs space-y-2 transition ${
          metrics.totalPendingProofs > 0 
            ? 'bg-amber-50/70 border-amber-300 text-amber-950' 
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-neutral-500">Pending Proofs</span>
            <div className={`p-1.5 rounded-lg ${metrics.totalPendingProofs > 0 ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-600'}`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black">
            {metrics.totalPendingProofs}
          </div>
          <p className="text-[11px] text-neutral-500">
            {metrics.totalPendingProofs > 0 ? 'Awaiting cashier approval' : 'All payment slips verified'}
          </p>
        </div>

        {/* Metric 3: Cash in Till */}
        <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Cash in Hand</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-neutral-900">
            {metrics.cashTotal.toLocaleString()} <span className="text-sm font-semibold text-neutral-500">ETB</span>
          </div>
          <p className="text-[11px] text-neutral-500">
            POS Cards: {metrics.posTotal.toLocaleString()} ETB
          </p>
        </div>

        {/* Metric 4: Digital (Telebirr & CBE) */}
        <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Mobile & Bank</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-neutral-900">
            {(metrics.telebirrTotal + metrics.cbeBirrTotal).toLocaleString()} <span className="text-sm font-semibold text-neutral-500">ETB</span>
          </div>
          <p className="text-[11px] text-neutral-500">
            Telebirr: {metrics.telebirrTotal} | CBE: {metrics.cbeBirrTotal}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('verification')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'verification'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verification Queue</span>
            {metrics.totalPendingProofs > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-bold">
                {metrics.totalPendingProofs}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('restaurant')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'restaurant'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Restaurant Settle</span>
          </button>

          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'reservations'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Hotel Bookings</span>
          </button>

          <button
            onClick={() => setActiveTab('money-flow')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'money-flow'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Money Flow & Till Summary</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Verification Queue */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-neutral-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-700">Filter Scope:</span>
              <div className="flex gap-1">
                {(['all', 'orders', 'bookings'] as const).map(scope => (
                  <button
                    key={scope}
                    onClick={() => setVerificationScope(scope)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      verificationScope === scope ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {scope === 'all' ? 'All Slips' : scope === 'orders' ? 'Restaurant Orders' : 'Hotel Bookings'}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-neutral-500">
              Showing {pendingOrderVerifications.length + pendingBookingVerifications.length} items needing review
            </span>
          </div>

          {/* Pending Proofs Grid */}
          {pendingOrderVerifications.length === 0 && pendingBookingVerifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-neutral-900">Verification Queue Clear</h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                There are no pending payment receipts or bank slips awaiting cashier action right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Order Verification Cards */}
              {(verificationScope === 'all' || verificationScope === 'orders') &&
                pendingOrderVerifications.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl border border-amber-200/90 shadow-2xs overflow-hidden flex flex-col justify-between">
                    {/* Card Header */}
                    <div className="p-4 border-b border-neutral-100 bg-amber-50/40 flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-neutral-900">#{order.orderNumber}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                            Restaurant Order
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-neutral-700 mt-0.5">{order.locationRef} • {order.customerName}</p>
                      </div>
                      <span className="text-xs font-black text-neutral-900">
                        {order.totalAmount} ETB
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3 flex-1 text-xs">
                      <div className="flex items-center justify-between text-neutral-600">
                        <span>Payment Method:</span>
                        <span className="font-bold text-neutral-900">{order.paymentMethod}</span>
                      </div>

                      {order.transactionId && (
                        <div className="flex items-center justify-between text-neutral-600 bg-neutral-50 p-2 rounded-lg">
                          <span>Transaction Ref:</span>
                          <span className="font-mono font-bold text-neutral-900">{order.transactionId}</span>
                        </div>
                      )}

                      {/* Payment Slip Thumbnail */}
                      {order.paymentProofUrl ? (
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-neutral-500">Payment Slip / Screenshot:</span>
                          <div 
                            onClick={() => setPreviewImageUrl(order.paymentProofUrl || null)}
                            className="relative h-32 w-full rounded-xl overflow-hidden border border-neutral-200 group cursor-pointer bg-neutral-100"
                          >
                            <img 
                              src={order.paymentProofUrl} 
                              alt="Payment Proof" 
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white gap-1.5 font-bold text-xs">
                              <Eye className="w-4 h-4" />
                              <span>View Full Size</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-neutral-50 rounded-xl text-neutral-500 text-center text-xs">
                          No image attached. Customer reported bank reference: <span className="font-bold text-neutral-900">{order.transactionId || 'None'}</span>
                        </div>
                      )}

                      <div className="text-[11px] text-neutral-400">
                        Submitted: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="p-4 bg-neutral-50 border-t border-neutral-100 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setRejectionTarget({ type: 'order', id: order.id, code: `#${order.orderNumber}` })}
                        disabled={isProcessing}
                        className="py-2 px-3 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleApproveOrderPayment(order)}
                        disabled={isProcessing}
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve & Verify</span>
                      </button>
                    </div>
                  </div>
                ))}

              {/* Booking Verification Cards */}
              {(verificationScope === 'all' || verificationScope === 'bookings') &&
                pendingBookingVerifications.map(booking => (
                  <div key={booking.id} className="bg-white rounded-2xl border border-blue-200/90 shadow-2xs overflow-hidden flex flex-col justify-between">
                    {/* Card Header */}
                    <div className="p-4 border-b border-neutral-100 bg-blue-50/40 flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-neutral-900">{booking.reservationCode}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold">
                            {booking.type === 'hall' ? 'Hall Event' : 'Room Booking'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-neutral-700 mt-0.5">
                          {booking.guestDetails.firstName} {booking.guestDetails.lastName}
                        </p>
                      </div>
                      <span className="text-xs font-black text-neutral-900">
                        {booking.totalAmount} ETB
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3 flex-1 text-xs">
                      <div className="flex items-center justify-between text-neutral-600">
                        <span>Payment Method:</span>
                        <span className="font-bold text-neutral-900">{booking.paymentMethod}</span>
                      </div>

                      {booking.transactionId && (
                        <div className="flex items-center justify-between text-neutral-600 bg-neutral-50 p-2 rounded-lg">
                          <span>Transaction Ref:</span>
                          <span className="font-mono font-bold text-neutral-900">{booking.transactionId}</span>
                        </div>
                      )}

                      {/* Payment Slip Thumbnail */}
                      {booking.paymentProofUrl ? (
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-neutral-500">Attached Bank Slip:</span>
                          <div 
                            onClick={() => setPreviewImageUrl(booking.paymentProofUrl || null)}
                            className="relative h-32 w-full rounded-xl overflow-hidden border border-neutral-200 group cursor-pointer bg-neutral-100"
                          >
                            <img 
                              src={booking.paymentProofUrl} 
                              alt="Payment Proof" 
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white gap-1.5 font-bold text-xs">
                              <Eye className="w-4 h-4" />
                              <span>View Full Size</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-neutral-50 rounded-xl text-neutral-500 text-center text-xs">
                          No receipt uploaded. Bank ref: <span className="font-bold text-neutral-900">{booking.transactionId || 'None'}</span>
                        </div>
                      )}

                      <div className="text-[11px] text-neutral-400">
                        Booked: {new Date(booking.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="p-4 bg-neutral-50 border-t border-neutral-100 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setRejectionTarget({ type: 'booking', id: booking.id, code: booking.reservationCode })}
                        disabled={isProcessing}
                        className="py-2 px-3 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject Slip</span>
                      </button>
                      <button
                        onClick={() => handleApproveBookingPayment(booking)}
                        disabled={isProcessing}
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Payment</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Restaurant Orders Cashier Registry */}
      {activeTab === 'restaurant' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-neutral-200">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by order #, table, room, guest..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-400" />
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none"
              >
                <option value="all">All Payment Methods</option>
                <option value="cash">Cash</option>
                <option value="pos">POS Card</option>
                <option value="telebirr">Telebirr</option>
                <option value="cbe birr">CBE Birr</option>
                <option value="charge to room">Room Charge</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Order #</th>
                    <th className="py-3.5 px-4">Location & Guest</th>
                    <th className="py-3.5 px-4">Items</th>
                    <th className="py-3.5 px-4">Total</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Cashier Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-400">
                        No restaurant orders found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.slice(0, 30).map((order) => (
                      <tr key={order.id} className="hover:bg-neutral-50/70 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                          #{order.orderNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-neutral-900">{order.locationRef}</div>
                          <div className="text-[11px] text-neutral-500">{order.customerName || 'Walk-in'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-600">
                          {order.items?.length || 0} items
                        </td>
                        <td className="py-3.5 px-4 font-bold text-neutral-900">
                          {order.totalAmount} ETB
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-neutral-800">{order.paymentMethod || 'Unset'}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            order.paymentStatus === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : order.paymentStatus === 'Charged to Room'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : order.paymentStatus === 'Pending Verification'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : order.paymentStatus === 'Rejected'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}>
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Receipt Print */}
                            <button
                              onClick={() => setReceiptItem({ type: 'order', data: order })}
                              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
                              title="Print / View Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Settle Cash */}
                            {order.paymentStatus !== 'Paid' && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDirectSettleOrder(order, 'Cash')}
                                  className="px-2 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                >
                                  Cash
                                </button>
                                <button
                                  onClick={() => handleDirectSettleOrder(order, 'POS')}
                                  className="px-2 py-1 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                >
                                  POS
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Hotel Bookings Payment Registry */}
      {activeTab === 'reservations' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-neutral-200">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by reservation code, guest name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4">Guest Name</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Total</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4">Booking Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-400">
                        No bookings found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.slice(0, 30).map((booking) => (
                      <tr key={booking.id} className="hover:bg-neutral-50/70 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                          {booking.reservationCode}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-neutral-900">
                            {booking.guestDetails?.firstName} {booking.guestDetails?.lastName}
                          </div>
                          <div className="text-[11px] text-neutral-500">{booking.guestDetails?.phone}</div>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-600">
                          {booking.type === 'hall' ? 'Hall Event' : 'Room Stay'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-neutral-900">
                          {booking.totalAmount} ETB
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-neutral-800">{booking.paymentMethod}</span>
                          {booking.transactionId && (
                            <span className="block text-[10px] font-mono text-neutral-500">Ref: {booking.transactionId}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            booking.status === 'confirmed' || booking.status === 'checked-in'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : booking.status === 'cancelled'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setReceiptItem({ type: 'booking', data: booking })}
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
                            title="Print / View Folio"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Money Flow & Till Summary */}
      {activeTab === 'money-flow' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cashier Till Reconciliation */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Today's Cashier Ledger Breakdown</span>
              </h3>
              
              <div className="divide-y divide-neutral-100 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-neutral-600">Physical Cash in Till:</span>
                  <span className="font-bold text-neutral-900">{metrics.cashTotal.toLocaleString()} ETB</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-neutral-600">POS Card Payments:</span>
                  <span className="font-bold text-neutral-900">{metrics.posTotal.toLocaleString()} ETB</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-neutral-600">Telebirr Mobile Payments:</span>
                  <span className="font-bold text-neutral-900">{metrics.telebirrTotal.toLocaleString()} ETB</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-neutral-600">CBE Birr / Direct Transfer:</span>
                  <span className="font-bold text-neutral-900">{metrics.cbeBirrTotal.toLocaleString()} ETB</span>
                </div>
                <div className="py-3 flex justify-between font-bold text-sm bg-neutral-50 px-3 rounded-xl mt-2">
                  <span>Total Direct Receipts:</span>
                  <span className="text-emerald-700">{metrics.totalCollectedToday.toLocaleString()} ETB</span>
                </div>
              </div>
            </div>

            {/* Room Charges Folio Summary */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>Unsettled Room Charges</span>
              </h3>
              <p className="text-xs text-neutral-500">
                Restaurant orders charged to guest hotel room folios to be settled during check-out.
              </p>

              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-purple-900">Total Room Charges:</span>
                  <div className="text-2xl font-black text-purple-950 mt-1">
                    {metrics.pendingRoomCharges.toLocaleString()} ETB
                  </div>
                </div>
                <div className="p-3 bg-purple-200 text-purple-900 rounded-xl font-bold text-xs">
                  Folio Active
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Fullscreen Image Lightbox */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 bg-neutral-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold">Payment Receipt Preview</h3>
              <button 
                onClick={() => setPreviewImageUrl(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-neutral-100">
              <img 
                src={previewImageUrl} 
                alt="Receipt" 
                className="max-h-[70vh] object-contain rounded-lg shadow-md"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex justify-end">
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Payment Rejection */}
      {rejectionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl overflow-hidden max-w-md w-full shadow-2xl border border-neutral-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-xl">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Reject Payment Proof</h3>
                <p className="text-xs text-neutral-500">Target: {rejectionTarget.code}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600">
              Please enter the reason for rejecting this payment proof. The guest and relevant staff will be notified.
            </p>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Reference number doesn't match bank record, amount paid is less than order total, or receipt image is unreadable..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900"
              />
            </div>

            {/* Quick Reason Chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'Transaction ID not found',
                'Amount mismatch',
                'Unreadable image',
                'Wrong beneficiary account'
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRejectionReason(reason)}
                  className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[11px] font-semibold transition"
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setRejectionTarget(null)}
                className="flex-1 py-2.5 border border-neutral-300 text-neutral-700 font-bold text-xs rounded-xl hover:bg-neutral-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectPayment}
                disabled={isProcessing || !rejectionReason.trim()}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition"
              >
                {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Printable Receipt */}
      {receiptItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl overflow-hidden max-w-md w-full shadow-2xl border border-neutral-200 flex flex-col">
            <div className="p-4 bg-neutral-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold flex items-center gap-2">
                <Printer className="w-4 h-4" />
                <span>Official Receipt / Folio</span>
              </h3>
              <button 
                onClick={() => setReceiptItem(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thermal Slip Content */}
            <div className="p-6 space-y-4 text-xs font-mono bg-neutral-50/50 flex-1 overflow-y-auto">
              <div className="text-center space-y-1 border-b border-dashed border-neutral-300 pb-3">
                <h4 className="font-bold text-sm tracking-wider uppercase">Woliso Hotel & Resort</h4>
                <p className="text-[10px] text-neutral-500">Woliso, Ethiopia • Tel: +251 911 000000</p>
                <p className="text-[10px] text-neutral-500">TIN: 0012345678 • VAT Reg: 15%</p>
              </div>

              {receiptItem.type === 'order' ? (
                (() => {
                  const o = receiptItem.data as Order;
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between text-[11px]">
                        <span>Order #{o.orderNumber}</span>
                        <span>{new Date(o.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="text-[11px]">
                        <div>Location: <span className="font-bold">{o.locationRef}</span></div>
                        <div>Guest: <span className="font-bold">{o.customerName || 'Walk-in'}</span></div>
                        <div>Cashier: <span className="font-bold">{staffName}</span></div>
                      </div>

                      {/* Items */}
                      <div className="border-t border-b border-dashed border-neutral-300 py-2 space-y-1">
                        {o.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.quantity}x {item.name}</span>
                            <span>{item.price * item.quantity} ETB</span>
                          </div>
                        ))}
                      </div>

                      {/* Tax & Total */}
                      <div className="space-y-1 text-right">
                        <div className="flex justify-between text-neutral-500">
                          <span>Subtotal:</span>
                          <span>{o.subtotal} ETB</span>
                        </div>
                        <div className="flex justify-between text-neutral-500">
                          <span>VAT (15% incl.):</span>
                          <span>{o.taxAmount} ETB</span>
                        </div>
                        <div className="flex justify-between font-bold text-sm text-neutral-900 pt-1 border-t border-neutral-200">
                          <span>Total Paid:</span>
                          <span>{o.totalAmount} ETB</span>
                        </div>
                        <div className="flex justify-between text-neutral-500 text-[10px]">
                          <span>Method / Status:</span>
                          <span className="font-bold">{o.paymentMethod} ({o.paymentStatus})</span>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                (() => {
                  const b = receiptItem.data as Booking;
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between text-[11px]">
                        <span>Res #{b.reservationCode}</span>
                        <span>{new Date(b.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="text-[11px]">
                        <div>Guest: <span className="font-bold">{b.guestDetails.firstName} {b.guestDetails.lastName}</span></div>
                        <div>Type: <span className="font-bold">{b.type}</span></div>
                        <div>Cashier: <span className="font-bold">{staffName}</span></div>
                      </div>

                      <div className="border-t border-b border-dashed border-neutral-300 py-2 flex justify-between font-bold text-sm">
                        <span>Total Amount:</span>
                        <span>{b.totalAmount} ETB</span>
                      </div>
                    </div>
                  );
                })()
              )}

              <div className="text-center pt-2 text-[10px] text-neutral-400 border-t border-dashed border-neutral-300">
                Thank you for choosing Woliso Hotel!
              </div>
            </div>

            <div className="p-4 bg-white border-t border-neutral-200 flex justify-between gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Bill</span>
              </button>
              <button
                onClick={() => setReceiptItem(null)}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS Order Modal */}
      <CreateOrderModal 
        isOpen={isCreateOrderOpen}
        onClose={() => setIsCreateOrderOpen(false)}
        onOrderCreated={(order) => {
          setNotice({ type: 'success', text: `Order #${order.orderNumber} successfully registered.` });
          setTimeout(() => setNotice(null), 4000);
        }}
      />
    </div>
  );
}
