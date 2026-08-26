import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { db, storage } from '../firebase';
import { doc, onSnapshot, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Order, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import TrackingTabsHeader from '../components/TrackingTabsHeader';
import ReceiptLightboxModal from '../components/common/ReceiptLightboxModal';
import { 
  getRecentOrders, 
  saveRecentOrder, 
  updateRecentOrderStatus, 
  removeRecentOrder, 
  RecentOrder 
} from '../lib/trackingStorage';
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
  CreditCard,
  Sparkles,
  X,
  Building2,
  FileText,
  Eye,
  UploadCloud,
  Hash,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { sendNotification } from '../lib/notificationService';
import CopyButton from '../components/common/CopyButton';

const STATUS_STEPS: OrderStatus[] = [
  'Order Submitted',
  'Kitchen Received',
  'Preparing',
  'Ready',
  'Delivered',
  'Completed'
];

export default function OrderTracker() {
  const { orderId } = useParams<{ orderId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryOrder = searchParams.get('order') || searchParams.get('id') || '';
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [requestingService, setRequestingService] = useState(false);
  const [recentList, setRecentList] = useState<RecentOrder[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string>('');
  const [fullscreenReceiptUrl, setFullscreenReceiptUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofUploadError, setProofUploadError] = useState('');
  const postOrderFileRef = useRef<HTMLInputElement>(null);

  const refreshRecent = () => {
    setRecentList(getRecentOrders());
  };

  useEffect(() => {
    refreshRecent();
  }, []);

  // Fetch logged in user's recent orders if local storage is empty
  useEffect(() => {
    if (currentUser && recentList.length === 0) {
      const fetchUserOrders = async () => {
        try {
          const q = query(collection(db, 'restaurant_orders'), where('customerUid', '==', currentUser.uid));
          const snap = await getDocs(q);
          snap.docs.forEach(docSnap => {
            const data = docSnap.data() as Order;
            saveRecentOrder({
              id: docSnap.id,
              orderNumber: data.orderNumber || docSnap.id.substring(0, 8),
              type: data.type,
              locationRef: data.locationRef,
              totalAmount: data.totalAmount,
              customerName: data.customerName,
              customerPhone: data.customerPhone,
              status: data.status,
              itemsCount: data.items?.reduce((sum, i) => sum + i.quantity, 0) || 0,
              itemsSummary: data.items?.map(i => `${i.quantity}x ${i.name}`).join(', '),
              createdAt: data.createdAt || Date.now()
            });
          });
          refreshRecent();
        } catch (e) {
          console.error('Error fetching user orders:', e);
        }
      };
      fetchUserOrders();
    }
  }, [currentUser]);

  // Determine active order ID from URL or auto-catch from recent orders
  useEffect(() => {
    const targetId = orderId || queryOrder;
    if (targetId) {
      setActiveOrderId(targetId);
    } else {
      const recents = getRecentOrders();
      if (recents.length > 0) {
        // Auto-catch the most recent active order
        const latest = recents[0];
        setActiveOrderId(latest.id);
      } else {
        setLoading(false);
      }
    }
  }, [orderId, queryOrder]);

  // Real-time Firestore Listener
  useEffect(() => {
    if (!activeOrderId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const unsub = onSnapshot(
      doc(db, 'restaurant_orders', activeOrderId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Order;
          const fullOrder = { id: docSnap.id, ...data };
          setOrder(fullOrder);
          setError('');

          // Update recent tracking storage
          saveRecentOrder({
            id: docSnap.id,
            orderNumber: fullOrder.orderNumber || docSnap.id.slice(-6).toUpperCase(),
            type: fullOrder.type,
            locationRef: fullOrder.locationRef,
            totalAmount: fullOrder.totalAmount,
            customerName: fullOrder.customerName,
            customerPhone: fullOrder.customerPhone,
            status: fullOrder.status,
            itemsCount: fullOrder.items?.reduce((s, i) => s + i.quantity, 0) || 0,
            itemsSummary: fullOrder.items?.map(i => `${i.quantity}x ${i.name}`).join(', '),
            createdAt: fullOrder.createdAt || Date.now()
          });
          refreshRecent();
        } else {
          // If not found by doc ID, try searching by orderNumber field
          getDocs(query(collection(db, 'restaurant_orders'), where('orderNumber', '==', activeOrderId.toUpperCase())))
            .then(qSnap => {
              if (!qSnap.empty) {
                const found = qSnap.docs[0];
                const data = found.data() as Order;
                setOrder({ id: found.id, ...data });
                setError('');
              } else {
                setError(`Order "${activeOrderId}" was not found.`);
                setOrder(null);
              }
            })
            .catch(err => {
              console.error('Error finding order by number:', err);
              setError(`Order "${activeOrderId}" was not found.`);
              setOrder(null);
            });
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
  }, [activeOrderId]);

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
        setActiveOrderId(foundId);
        navigate(`/restaurant/track/${foundId}`);
      } else {
        // Search by doc ID
        setActiveOrderId(searchInput.trim());
        navigate(`/restaurant/track/${searchInput.trim()}`);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Could not find order. Please check order number.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectRecent = (rec: RecentOrder) => {
    setActiveOrderId(rec.id);
    navigate(`/restaurant/track/${rec.id}`);
  };

  const handleRemoveRecent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeRecentOrder(id);
    refreshRecent();
    if (activeOrderId === id) {
      setOrder(null);
      setActiveOrderId('');
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

  const handleUploadPostOrderProof = async (file: File) => {
    if (!order) return;
    if (file.size > 5 * 1024 * 1024) {
      setProofUploadError('File size exceeds 5MB limit.');
      return;
    }

    setUploadingProof(true);
    setProofUploadError('');

    try {
      let downloadUrl = '';
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storageRef = ref(storage, `order_receipts/${order.orderNumber || order.id}_${Date.now()}_${safeName}`);
        const uploadTask = await Promise.race([
          uploadBytes(storageRef, file),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Storage timeout')), 4000))
        ]) as any;
        downloadUrl = await getDownloadURL(uploadTask.ref);
      } catch (e) {
        console.warn('Storage fallback to Data URL for tracker:', e);
        downloadUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      }

      if (!downloadUrl) throw new Error('Could not process receipt file.');

      const newTimelineEvent = {
        status: 'Payment Proof Uploaded',
        timestamp: Date.now(),
        note: `Payment receipt uploaded via order tracker (${file.name})`,
        updatedBy: order.customerName || 'Customer'
      };

      const updatedTimeline = [...(order.timeline || []), newTimelineEvent];

      await updateDoc(doc(db, 'restaurant_orders', order.id), {
        paymentProofUrl: downloadUrl,
        paymentStatus: 'Pending Verification',
        timeline: updatedTimeline,
        updatedAt: Date.now()
      });

      // Notify Waiter / Kitchen
      await sendNotification({
        recipientRole: 'waiter',
        title: `Payment Receipt Uploaded: Order #${order.orderNumber || order.id.slice(-6)}`,
        message: `${order.customerName || 'Customer'} uploaded a payment slip for ${order.locationRef}.`,
        type: 'order',
        relatedEntityId: order.id,
        relatedEntityType: 'order',
        targetRoute: '/admin/waiter',
        priority: 'Important',
        eventId: `ord_receipt_${order.id}_${Date.now()}`
      });

      alert('Payment receipt uploaded successfully! Staff will verify it shortly.');
    } catch (err: any) {
      console.error('Error uploading payment proof:', err);
      setProofUploadError(err.message || 'Failed to upload receipt. Please try again.');
    } finally {
      setUploadingProof(false);
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
    <div className="pt-20 pb-16 min-h-screen bg-neutral-50 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Unified Dual-Tab Switcher */}
        <TrackingTabsHeader activeTab="order" />

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-neutral-200 pb-5">
          <div>
            <Link to="/restaurant" className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Restaurant Menu
            </Link>
            <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
              <Utensils className="w-8 h-8 text-emerald-600" />
              Live Order Tracker
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              Real-time kitchen preparation and service status.
            </p>
          </div>

          {/* Search Order Bar */}
          <form onSubmit={handleSearchOrder} className="flex gap-2">
            <input
              type="text"
              placeholder="Order # e.g. ORD-102938"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="px-3.5 py-2.5 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none w-52 bg-white font-mono uppercase"
            />
            <button
              type="submit"
              disabled={searchLoading || !searchInput.trim()}
              className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 disabled:opacity-50"
            >
              {searchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>

        {/* Automatically Caught Recent Orders List */}
        {recentList.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Recent Orders ({recentList.length})
              </span>
              <span className="text-[11px] text-neutral-400">Click any card to track live</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {recentList.map((rec) => {
                const isSelected = activeOrderId === rec.id;
                const isDeliveredOrDone = rec.status === 'Delivered' || rec.status === 'Completed';

                return (
                  <div
                    key={rec.id}
                    onClick={() => handleSelectRecent(rec)}
                    className={`cursor-pointer p-3 rounded-xl border transition-all text-left relative flex flex-col justify-between group ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600 shadow-xs'
                        : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-neutral-900">
                          #{rec.orderNumber || rec.id.slice(-6).toUpperCase()}
                        </span>
                        <CopyButton
                          text={rec.orderNumber || rec.id.slice(-6).toUpperCase()}
                          size="xs"
                          variant="ghost"
                          tooltip="Copy order code"
                        />
                        <span className="text-[10px] uppercase font-bold text-neutral-500 ml-1 px-1.5 py-0.5 bg-neutral-100 rounded">
                          {rec.type}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleRemoveRecent(e, rec.id)}
                        className="text-neutral-400 hover:text-rose-600 p-0.5 rounded transition opacity-0 group-hover:opacity-100"
                        title="Remove from recent list"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-xs text-neutral-600 space-y-0.5 mb-2">
                      {rec.locationRef && <p className="text-[11px] font-medium text-neutral-800">{rec.locationRef}</p>}
                      {rec.itemsSummary && (
                        <p className="text-[11px] text-neutral-500 line-clamp-1 italic">{rec.itemsSummary}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-neutral-100 text-[11px]">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 ${
                        isDeliveredOrDone 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isDeliveredOrDone ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'}`} />
                        {rec.status || 'Submitted'}
                      </span>
                      <span className="font-bold text-neutral-900">{rec.totalAmount?.toLocaleString()} ETB</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading State */}
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
                <div className="flex items-center gap-3 mt-2">
                  <h2 className="text-2xl font-black text-neutral-900">
                    Order #{order.orderNumber || order.id.slice(-6).toUpperCase()}
                  </h2>
                  <CopyButton
                    text={order.orderNumber || order.id.slice(-6).toUpperCase()}
                    variant="neutral"
                    size="sm"
                    label="Copy"
                    showText={true}
                    tooltip="Copy order code"
                  />
                </div>
                <p className="text-xs text-neutral-600 mt-1 flex items-center gap-2">
                  <strong>Location:</strong> {order.locationRef} • <strong>Customer:</strong> {order.customerName}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-neutral-500 uppercase block">Grand Total</span>
                <span className="text-2xl font-black text-emerald-700">{order.totalAmount?.toLocaleString()} ETB</span>
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
                        {(item.price * item.quantity).toLocaleString()} ETB
                      </span>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="pt-4 border-t border-neutral-200 space-y-1.5 text-xs text-neutral-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-neutral-900">{order.subtotal?.toLocaleString()} ETB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT ({order.taxRate ?? 15}%)</span>
                    <span className="font-semibold text-neutral-900">{order.taxAmount?.toLocaleString()} ETB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Charge ({order.serviceChargeRate ?? 5}%)</span>
                    <span className="font-semibold text-neutral-900">{order.serviceChargeAmount?.toLocaleString()} ETB</span>
                  </div>
                  {Boolean(order.roomServiceFee) && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Room Service Fee</span>
                      <span className="font-semibold">{order.roomServiceFee?.toLocaleString()} ETB</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-neutral-900 pt-2 border-t border-neutral-100">
                    <span>Total Paid/Charged</span>
                    <span className="text-emerald-700 font-extrabold text-base">{order.totalAmount?.toLocaleString()} ETB</span>
                  </div>
                </div>

                {/* Payment Proof & Verification Section */}
                <div className="pt-4 border-t border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      Payment & Receipt Verification
                    </h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      order.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                      order.paymentStatus === 'Pending Verification' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                      order.paymentStatus === 'Charged to Room' ? 'bg-purple-100 text-purple-800' :
                      'bg-neutral-100 text-neutral-700'
                    }`}>
                      {order.paymentStatus}
                    </span>
                  </div>

                  <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-xs space-y-2">
                    <div className="flex justify-between items-center text-[11px] text-neutral-600">
                      <span>Payment Method:</span>
                      <span className="font-bold text-neutral-900">{order.paymentMethod}</span>
                    </div>

                    {order.transactionId && (
                      <div className="flex justify-between items-center text-[11px] text-neutral-600 pt-1 border-t border-neutral-200/60">
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3 text-neutral-400" /> Transaction Ref:
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-neutral-900">{order.transactionId}</span>
                          <CopyButton text={order.transactionId} size="xs" variant="neutral" />
                        </div>
                      </div>
                    )}

                    {/* Receipt Display or Upload Prompt */}
                    {order.paymentProofUrl ? (
                      <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          {order.paymentProofUrl !== 'pdf' ? (
                            <img
                              src={order.paymentProofUrl}
                              alt="Payment Proof"
                              className="w-10 h-10 rounded-lg object-cover border border-neutral-200 shrink-0 cursor-pointer hover:opacity-80 transition"
                              onClick={() => setFullscreenReceiptUrl(order.paymentProofUrl || null)}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-xs text-neutral-900">Payment Slip Attached</p>
                            <p className="text-[10px] text-neutral-500">Tap preview to view fullscreen</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setFullscreenReceiptUrl(order.paymentProofUrl || null)}
                          className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-neutral-200 hover:border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Receipt
                        </button>
                      </div>
                    ) : ['Bank Transfer', 'Mobile Banking', 'Telebirr', 'CBE Birr'].includes(order.paymentMethod) ? (
                      <div className="pt-2 border-t border-neutral-200/60 space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-700">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>No receipt slip attached yet. Please upload your transfer confirmation for fast verification.</span>
                        </div>

                        <input
                          ref={postOrderFileRef}
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleUploadPostOrderProof(e.target.files[0]);
                            }
                          }}
                        />

                        <button
                          type="button"
                          disabled={uploadingProof}
                          onClick={() => postOrderFileRef.current?.click()}
                          className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                        >
                          {uploadingProof ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading Receipt...
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-3.5 h-3.5" /> Upload Payment Receipt Slip
                            </>
                          )}
                        </button>
                        {proofUploadError && (
                          <p className="text-[10px] text-rose-600 text-center">{proofUploadError}</p>
                        )}
                      </div>
                    ) : null}
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
        ) : (
          <div className="text-center text-neutral-500 py-12 bg-white rounded-2xl border border-neutral-200 p-8">
            <UtensilsCrossed className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-600 font-medium">No active restaurant orders found.</p>
            <p className="text-xs text-neutral-400 mt-1">Place an order from our restaurant menu or search with an order number above.</p>
            <Link
              to="/restaurant"
              className="inline-block mt-4 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
            >
              Browse Restaurant Menu
            </Link>
          </div>
        )}
      </div>

      {/* In-Page Fullscreen Receipt Lightbox */}
      <ReceiptLightboxModal
        imageUrl={fullscreenReceiptUrl}
        title={`Payment Receipt: ${order?.orderNumber || ''}`}
        onClose={() => setFullscreenReceiptUrl(null)}
      />
    </div>
  );
}
