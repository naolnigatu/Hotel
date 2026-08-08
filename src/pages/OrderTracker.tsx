import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { Order, OrderStatus } from '../types';
import { 
  CheckCircle2, 
  Clock, 
  Utensils, 
  ChefHat, 
  Bell, 
  CheckCheck, 
  XCircle, 
  ArrowLeft, 
  Search, 
  Hotel, 
  UtensilsCrossed, 
  ShoppingBag, 
  PhoneCall, 
  Loader2,
  RefreshCw,
  HandPlatter,
  CreditCard
} from 'lucide-react';

const STATUS_STEPS: OrderStatus[] = [
  'Order Submitted',
  'Kitchen Received',
  'Preparing',
  'Ready',
  'Delivered',
  'Completed'
];

import { sendNotification } from '../lib/notificationService';

export default function OrderTracker() {
  const { orderId } = useParams<{ orderId?: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [requestingService, setRequestingService] = useState(false);

  // Real-time Firestore Listener
  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const unsub = onSnapshot(
      doc(db, 'restaurant_orders', orderId),
      (docSnap) => {
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
          setError('');
        } else {
          setError(`Order with ID "${orderId}" was not found.`);
          setOrder(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching order:', err);
        setError('Failed to load real-time order status.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [orderId]);

  // Handle Search Order by Number or ID
  const handleSearchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setSearchLoading(true);
    setError('');

    try {
      const term = searchInput.trim().toUpperCase();
      
      // Try direct ID match first or search by orderNumber
      const ordersRef = collection(db, 'restaurant_orders');
      const q = query(ordersRef, where('orderNumber', '==', term));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const foundId = snapshot.docs[0].id;
        navigate(`/restaurant/track/${foundId}`);
      } else {
        // Search by doc ID
        navigate(`/restaurant/track/${searchInput.trim()}`);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Could not find order. Please check order number.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleServiceRequest = async (type: 'Call Waiter' | 'Bill Request') => {
    if (!order) return;
    setRequestingService(true);
    try {
       const reqDoc = await addDoc(collection(db, 'service_requests'), {
         type,
         locationRef: order.locationRef,
         tableNumber: order.tableNumber || '',
         roomNumber: order.roomNumber || '',
         status: 'Pending',
         createdAt: Date.now(),
         updatedAt: Date.now()
       });

       const loc = order.tableNumber ? `Table ${order.tableNumber}` : order.roomNumber ? `Room ${order.roomNumber}` : 'Customer';
       await sendNotification({
         recipientRole: 'waiter',
         title: `Service Request: ${type}`,
         message: `${loc} requested "${type}".`,
         type: 'service_request',
         relatedEntityId: reqDoc.id,
         relatedEntityType: 'service_request',
         targetRoute: '/admin/waiter',
         priority: type === 'Bill Request' ? 'Urgent' : 'Important',
         eventId: `srv_req_${reqDoc.id}`
       });
       alert(`${type} requested successfully. Waitstaff will be with you shortly.`);
    } catch (err) {
       console.error("Failed to request service:", err);
       alert("Failed to request service. Please check connection.");
    } finally {
       setRequestingService(false);
    }
  };

  const getStepIndex = (status: string) => {
    if (status === 'Cancelled') return -1;
    if (status === 'Pending') return 0;
    if (status === 'Paid') return 5;
    const index = STATUS_STEPS.indexOf(status as OrderStatus);
    return index >= 0 ? index : 0;
  };

  const currentStepIndex = order ? getStepIndex(order.status) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-neutral-200 pb-5">
        <div>
          <Link to="/restaurant" className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Restaurant Menu
          </Link>
          <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
            <Utensils className="w-7 h-7 text-emerald-600" />
            Live Order Tracker
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Real-time status updates from the kitchen to your table or room.
          </p>
        </div>

        {/* Search Order Bar */}
        <form onSubmit={handleSearchOrder} className="flex gap-2">
          <input
            type="text"
            placeholder="Order # e.g. WOL-102938"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="px-3.5 py-2 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none w-48 bg-white"
          />
          <button
            type="submit"
            disabled={searchLoading}
            className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
          >
            {searchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-8 rounded-2xl text-center space-y-3">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-rose-900">Order Not Found</h3>
          <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
          <Link
            to="/restaurant"
            className="inline-block px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
          >
            Go to Menu & Place Order
          </Link>
        </div>
      ) : order ? (
        <div className="space-y-6">
          {/* Order Identity Card */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                  {order.type}
                </span>
                <span className="text-xs font-bold text-neutral-400">
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h2 className="text-2xl font-black text-neutral-900 mt-2">
                Order #{order.orderNumber || order.id.substring(0, 8)}
              </h2>
              <p className="text-xs text-neutral-600 mt-1 flex items-center gap-2">
                <strong>Location:</strong> {order.locationRef} • <strong>Customer:</strong> {order.customerName}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-neutral-500 uppercase block">Grand Total</span>
              <span className="text-2xl font-black text-emerald-700">{order.totalAmount} ETB</span>
              <span className={`text-[11px] font-bold block mt-0.5 px-2.5 py-0.5 rounded-full inline-block ${
                order.paymentStatus === 'Charged to Room' ? 'bg-purple-100 text-purple-800' :
                order.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {order.paymentMethod} ({order.paymentStatus})
              </span>
            </div>
          </div>

          {/* Cancelled Alert if applicable */}
          {order.status === 'Cancelled' ? (
            <div className="bg-rose-50 border border-rose-300 p-6 rounded-2xl text-center space-y-2">
              <XCircle className="w-10 h-10 text-rose-600 mx-auto" />
              <h3 className="text-xl font-bold text-rose-900">This Order was Cancelled</h3>
              <p className="text-xs text-rose-700">Please contact hotel staff or front desk if you have any questions.</p>
            </div>
          ) : (
            /* Workflow Progress Indicator */
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
                <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-emerald-600" /> Current Status:
                  <span className="text-emerald-700 uppercase font-black">{order.status}</span>
                </h3>
                <span className="text-xs text-neutral-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" /> Live Updates
                </span>
              </div>

              {/* Progress Bar Steps */}
              <div className="relative pt-2 pb-6">
                <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-1 bg-neutral-200 -translate-y-1/2 z-0"></div>
                <div 
                  className="hidden sm:block absolute top-1/2 left-0 h-1 bg-emerald-600 -translate-y-1/2 z-0 transition-all duration-500"
                  style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                ></div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 relative z-10">
                  {STATUS_STEPS.map((stepName, idx) => {
                    const isPassed = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;

                    return (
                      <div key={stepName} className="flex flex-col items-center text-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition ${
                          isCurrent 
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 scale-110 shadow-md' 
                            : isPassed 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-neutral-200 text-neutral-500'
                        }`}>
                          {isPassed ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                        </div>
                        <span className={`text-[11px] font-bold mt-2 ${
                          isCurrent ? 'text-emerald-700' : isPassed ? 'text-neutral-900' : 'text-neutral-400'
                        }`}>
                          {stepName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Order Details & Items Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Items List */}
            <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
              <h3 className="font-bold text-neutral-900 text-sm uppercase tracking-wider border-b border-neutral-100 pb-3">
                Order Items ({order.items.reduce((sum, i) => sum + i.quantity, 0)})
              </h3>

              <div className="divide-y divide-neutral-100">
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-3 flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-emerald-100 text-emerald-800 rounded-md font-extrabold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {item.quantity}x
                      </span>
                      <div>
                        <h4 className="font-bold text-neutral-900 text-sm">{item.name}</h4>
                        {item.notes && (
                          <p className="text-xs text-amber-700 italic mt-0.5">Note: {item.notes}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-neutral-900 text-sm whitespace-nowrap">
                      {item.price * item.quantity} ETB
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="pt-4 border-t border-neutral-200 space-y-1.5 text-xs text-neutral-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-neutral-900">{order.subtotal} ETB</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT ({order.taxRate ?? 15}%)</span>
                  <span className="font-semibold text-neutral-900">{order.taxAmount} ETB</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Charge ({order.serviceChargeRate ?? 5}%)</span>
                  <span className="font-semibold text-neutral-900">{order.serviceChargeAmount} ETB</span>
                </div>
                {Boolean(order.roomServiceFee) && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Room Service Fee</span>
                    <span className="font-semibold">{order.roomServiceFee} ETB</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-neutral-900 pt-2 border-t border-neutral-100">
                  <span>Total Paid/Charged</span>
                  <span className="text-emerald-700 font-extrabold text-base">{order.totalAmount} ETB</span>
                </div>
              </div>
            </div>

            {/* Timeline Events Log */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
              <h3 className="font-bold text-neutral-900 text-sm uppercase tracking-wider border-b border-neutral-100 pb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" /> Status Timeline
              </h3>

              <div className="space-y-3 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-neutral-200">
                {order.timeline && order.timeline.length > 0 ? (
                  order.timeline.map((event, idx) => (
                    <div key={idx} className="relative pl-6 space-y-0.5">
                      <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-emerald-600 ring-2 ring-white"></div>
                      <h5 className="font-bold text-xs text-neutral-900">{event.status}</h5>
                      <p className="text-[11px] text-neutral-500">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {event.updatedBy ? ` • ${event.updatedBy}` : ''}
                      </p>
                      {event.note && <p className="text-[11px] text-neutral-600 italic">{event.note}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-400">No timeline entries recorded yet.</p>
                )}
              </div>

              {/* Frontdesk / Room Service Support Contact */}
              <div className="pt-4 border-t border-neutral-100 space-y-3">
                <p className="font-bold text-xs text-neutral-800 uppercase tracking-wider">Service Actions</p>
                
                <div className="flex flex-col gap-2">
                  {['Dine-In', 'QR Table', 'Room Service'].includes(order.type) && order.status !== 'Completed' && (
                     <button
                       onClick={() => handleServiceRequest('Call Waiter')}
                       disabled={requestingService}
                       className="w-full px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2"
                     >
                       <HandPlatter className="w-4 h-4" /> Call Waiter / Staff
                     </button>
                  )}
                  {['Dine-In', 'QR Table'].includes(order.type) && order.paymentStatus === 'Pending' && (
                     <button
                       onClick={() => handleServiceRequest('Bill Request')}
                       disabled={requestingService}
                       className="w-full px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2"
                     >
                       <CreditCard className="w-4 h-4" /> Request Bill
                     </button>
                  )}
                  <a
                    href="tel:+251911000000"
                    className="w-full px-3 py-2.5 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-neutral-900 font-bold text-xs transition flex items-center justify-center gap-2"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-600" /> Call Front Desk
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
