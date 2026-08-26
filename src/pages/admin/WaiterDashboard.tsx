import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  runTransaction, 
  arrayUnion, 
  orderBy, 
  where 
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { Order, ServiceRequest, OrderStatus } from '../../types';
import { handleFirestoreError, OperationType, logAuditAction } from '../../lib/firestoreUtils';
import { sendNotification } from '../../lib/notificationService';
import { 
  UtensilsCrossed, 
  Bell, 
  CheckCircle, 
  Clock, 
  UserCheck, 
  AlertCircle, 
  Receipt, 
  Sparkles, 
  MessageSquare, 
  PhoneCall, 
  Coffee, 
  ChevronRight, 
  Filter, 
  Search, 
  RefreshCw,
  MapPin,
  DollarSign,
  Eye,
  FileText,
  ShieldCheck,
  Hash,
  Plus
} from 'lucide-react';
import ReceiptLightboxModal from '../../components/common/ReceiptLightboxModal';
import CopyButton from '../../components/common/CopyButton';
import CreateOrderModal from '../../components/admin/CreateOrderModal';

export default function WaiterDashboard() {
  const { userData } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ready' | 'my-orders' | 'requests' | 'all'>('ready');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [waiterNoteInput, setWaiterNoteInput] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);
  const [fullscreenReceiptUrl, setFullscreenReceiptUrl] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);

  const waiterId = auth.currentUser?.uid || userData?.uid || 'anonymous-waiter';
  const waiterName = userData?.name || 'Waiter';

  // Real-time synchronization for orders
  useEffect(() => {
    setLoading(true);
    const ordersRef = collection(db, 'restaurant_orders');
    const qOrders = query(ordersRef, orderBy('createdAt', 'desc'));

    const unsubscribeOrders = onSnapshot(
      qOrders,
      (snapshot) => {
        const orderList: Order[] = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as Order));
        setOrders(orderList);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'restaurant_orders');
        setLoading(false);
      }
    );

    // Real-time synchronization for service requests
    const requestsRef = collection(db, 'service_requests');
    const qRequests = query(requestsRef, orderBy('createdAt', 'desc'));

    const unsubscribeRequests = onSnapshot(
      qRequests,
      (snapshot) => {
        const reqList: ServiceRequest[] = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as ServiceRequest));
        setServiceRequests(reqList);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'service_requests');
      }
    );

    return () => {
      unsubscribeOrders();
      unsubscribeRequests();
    };
  }, []);

  // Clear notices after 4 seconds
  useEffect(() => {
    if (actionError || actionSuccess) {
      const timer = setTimeout(() => {
        setActionError(null);
        setActionSuccess(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actionError, actionSuccess]);

  // Concurrent Waiter Protection: Transactional Order Claiming
  const handleClaimOrder = async (order: Order) => {
    setClaimingOrderId(order.id);
    setActionError(null);
    try {
      const orderRef = doc(db, 'restaurant_orders', order.id);
      
      await runTransaction(db, async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists()) {
          throw new Error('Order no longer exists.');
        }

        const data = orderDoc.data();
        if (data.assignedWaiterId && data.assignedWaiterId !== waiterId) {
          throw new Error(`Order was already claimed by ${data.assignedWaiterName || 'another waiter'}.`);
        }

        transaction.update(orderRef, {
          assignedWaiterId: waiterId,
          assignedWaiterName: waiterName,
          updatedAt: Date.now(),
          timeline: arrayUnion({
            status: `Claimed by Waiter (${waiterName})`,
            timestamp: Date.now(),
            note: `Claimed by ${waiterName}`,
            updatedBy: waiterName
          })
        });
      });

      setActionSuccess(`Successfully claimed Order #${order.orderNumber}`);
      await logAuditAction(
        waiterId,
        waiterName,
        userData?.role || 'waiter',
        `Claimed Order #${order.orderNumber}`,
        'Restaurant',
        `Table/Room: ${order.locationRef}`
      );
    } catch (err: any) {
      setActionError(err.message || 'Failed to claim order.');
    } finally {
      setClaimingOrderId(null);
    }
  };

  // Update order status (Ready -> Delivered -> Completed, etc.)
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setActionError(null);
    try {
      const orderRef = doc(db, 'restaurant_orders', orderId);
      const targetOrder = orders.find(o => o.id === orderId);

      await updateDoc(orderRef, {
        status: newStatus,
        assignedWaiterId: targetOrder?.assignedWaiterId || waiterId,
        assignedWaiterName: targetOrder?.assignedWaiterName || waiterName,
        updatedAt: Date.now(),
        timeline: arrayUnion({
          status: newStatus,
          timestamp: Date.now(),
          note: `Status updated to ${newStatus} by ${waiterName}`,
          updatedBy: waiterName
        })
      });

      setActionSuccess(`Order updated to "${newStatus}"`);
      await logAuditAction(
        waiterId,
        waiterName,
        userData?.role || 'waiter',
        `Updated Order #${targetOrder?.orderNumber || orderId} to ${newStatus}`,
        'Restaurant',
        `Location: ${targetOrder?.locationRef}`
      );

      // Send Testimonial Prompt when Order is Completed
      if (newStatus === 'Completed' && targetOrder?.customerUid) {
        await sendNotification({
          recipientUid: targetOrder.customerUid,
          title: `How was your meal?`,
          message: `Your order #${targetOrder.orderNumber} is complete. Please share your experience and leave a review!`,
          type: 'system',
          targetRoute: `/testimonials/new?source=order&id=${targetOrder.id}`,
          priority: 'Normal',
          eventId: `testim_prompt_ord_${targetOrder.id}`
        });
      }

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `restaurant_orders/${orderId}`);
      setActionError('Failed to update order status.');
    }
  };

  // Add waiter notes
  const handleAddWaiterNote = async (orderId: string) => {
    if (!waiterNoteInput.trim()) return;
    try {
      const orderRef = doc(db, 'restaurant_orders', orderId);
      const noteText = waiterNoteInput.trim();

      await updateDoc(orderRef, {
        waiterNotes: noteText,
        updatedAt: Date.now(),
        timeline: arrayUnion({
          status: 'Note Added',
          timestamp: Date.now(),
          note: `Waiter Note: ${noteText}`,
          updatedBy: waiterName
        })
      });

      setActionSuccess('Note added successfully.');
      setWaiterNoteInput('');
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, waiterNotes: noteText } : null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `restaurant_orders/${orderId}`);
      setActionError('Failed to save waiter note.');
    }
  };

  // Update Service Request status
  const handleUpdateServiceRequest = async (requestId: string, newStatus: 'In Progress' | 'Completed') => {
    try {
      const reqRef = doc(db, 'service_requests', requestId);
      await updateDoc(reqRef, {
        status: newStatus,
        updatedAt: Date.now()
      });
      setActionSuccess(`Service request marked as ${newStatus}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `service_requests/${requestId}`);
    }
  };

  // Waiter approves and marks cash payment as collected
  const handleCollectCashPayment = async (order: Order) => {
    setVerifyingPayment(true);
    setActionError(null);
    try {
      const orderRef = doc(db, 'restaurant_orders', order.id);
      const now = Date.now();
      const newTimeline = [
        ...(order.timeline || []),
        {
          status: 'Payment Received (Cash)',
          timestamp: now,
          note: `Cash payment of ${order.totalAmount} ETB collected & approved by Waiter ${waiterName}`,
          updatedBy: waiterName
        }
      ];

      await updateDoc(orderRef, {
        paymentStatus: 'Paid',
        paymentMethod: 'Cash',
        timeline: newTimeline,
        updatedAt: now
      });

      await logAuditAction(
        waiterId,
        waiterName,
        userData?.role || 'waiter',
        `Approved Cash Payment for Order #${order.orderNumber}`,
        'Restaurant',
        `Amount: ${order.totalAmount} ETB | Location: ${order.locationRef}`
      );

      // Notify Cashier
      await sendNotification({
        recipientRole: 'cashier',
        title: `Cash Collected: #${order.orderNumber}`,
        message: `Waiter ${waiterName} collected ${order.totalAmount} ETB cash for ${order.locationRef}.`,
        type: 'payment',
        relatedEntityId: order.id,
        relatedEntityType: 'order',
        targetRoute: '/admin/cashier',
        priority: 'Normal',
        eventId: `cash_coll_${order.id}_${now}`
      });

      if (selectedOrder?.id === order.id) {
        setSelectedOrder(prev => prev ? {
          ...prev,
          paymentStatus: 'Paid',
          paymentMethod: 'Cash',
          timeline: newTimeline
        } : null);
      }

      setActionSuccess(`Cash payment of ${order.totalAmount} ETB confirmed and marked as Paid for Order #${order.orderNumber}`);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `restaurant_orders/${order.id}`);
      setActionError('Failed to record cash payment. Please check network connection.');
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handleVerifyPayment = async (orderId: string) => {
    setVerifyingPayment(true);
    try {
      const orderRef = doc(db, 'restaurant_orders', orderId);
      const targetOrder = orders.find(o => o.id === orderId);
      const newTimeline = [
        ...(targetOrder?.timeline || []),
        {
          status: 'Payment Verified',
          timestamp: Date.now(),
          note: `Payment slip verified by ${waiterName}`,
          updatedBy: waiterName
        }
      ];

      await updateDoc(orderRef, {
        paymentStatus: 'Paid',
        timeline: newTimeline,
        updatedAt: Date.now()
      });

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          paymentStatus: 'Paid',
          timeline: newTimeline
        });
      }

      setActionSuccess(`Payment verified and marked as Paid for Order #${targetOrder?.orderNumber || orderId.slice(-6)}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `restaurant_orders/${orderId}`);
    } finally {
      setVerifyingPayment(false);
    }
  };

  // Filter calculations
  const readyOrders = orders.filter(o => o.status === 'Ready');
  const myActiveOrders = orders.filter(o => o.assignedWaiterId === waiterId && o.status !== 'Completed' && o.status !== 'Cancelled');
  const pendingRequests = serviceRequests.filter(r => r.status !== 'Completed');

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.locationRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = filterType === 'all' || o.type.toLowerCase().includes(filterType.toLowerCase());

    if (activeTab === 'ready') return o.status === 'Ready' && matchesSearch && matchesType;
    if (activeTab === 'my-orders') return o.assignedWaiterId === waiterId && matchesSearch && matchesType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header & Status Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-neutral-900 text-white rounded-xl">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Waiter & Service Operations</h1>
              <p className="text-sm text-neutral-500">Live order claiming, table/room service & guest calls</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateOrderOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Customer Order</span>
          </button>
          <div className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Active Waiter: <span className="font-bold">{waiterName}</span>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="p-2 rounded-xl text-neutral-600 hover:bg-neutral-100 transition-colors border border-neutral-200"
            title="Refresh feed"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Banners */}
      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-500 font-bold text-xs">Dismiss</button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 font-bold text-xs">Dismiss</button>
        </div>
      )}

      {/* Tabs & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveTab('ready')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'ready' 
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20 shadow-xs' 
              : 'bg-white border-neutral-200 hover:border-neutral-300'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Ready Queue</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
              {readyOrders.length}
            </span>
          </div>
          <div className="text-xl font-bold text-neutral-900">{readyOrders.length} Ready</div>
          <p className="text-xs text-neutral-500 mt-1">Claim & deliver to guests</p>
        </button>

        <button
          onClick={() => setActiveTab('my-orders')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'my-orders' 
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/20 shadow-xs' 
              : 'bg-white border-neutral-200 hover:border-neutral-300'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">My Active Orders</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
              {myActiveOrders.length}
            </span>
          </div>
          <div className="text-xl font-bold text-neutral-900">{myActiveOrders.length} Assigned</div>
          <p className="text-xs text-neutral-500 mt-1">In progress under my care</p>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'requests' 
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400/20 shadow-xs' 
              : 'bg-white border-neutral-200 hover:border-neutral-300'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-800">Guest Service Calls</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white">
              {pendingRequests.length}
            </span>
          </div>
          <div className="text-xl font-bold text-neutral-900">{pendingRequests.length} Pending</div>
          <p className="text-xs text-neutral-500 mt-1">Call Waiter & Bill requests</p>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'all' 
              ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs' 
              : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-900'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'all' ? 'text-neutral-300' : 'text-neutral-500'}`}>All Orders</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${activeTab === 'all' ? 'bg-neutral-700 text-white' : 'bg-neutral-100 text-neutral-800'}`}>
              {orders.length}
            </span>
          </div>
          <div className="text-xl font-bold">{orders.length} Total</div>
          <p className={`text-xs mt-1 ${activeTab === 'all' ? 'text-neutral-400' : 'text-neutral-500'}`}>Full shift history</p>
        </button>
      </div>

      {/* Filter & Search Bar */}
      {activeTab !== 'requests' && (
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text"
              placeholder="Search table, room or order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-900"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-neutral-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 text-sm font-medium rounded-xl px-3 py-2 text-neutral-700 focus:outline-none focus:border-neutral-900"
            >
              <option value="all">All Service Types</option>
              <option value="Dine-In">Table Dine-In</option>
              <option value="QR Menu/Dine in">QR Menu/Dine in Order</option>
              <option value="Book Meal">Book Meal</option>
              <option value="Room Service">Room Service</option>
              <option value="Takeaway">Takeaway</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'requests' ? (
        /* Guest Service Requests Panel */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-600" />
              Active Guest Service Requests
            </h2>
            <span className="text-xs text-neutral-500">Auto-refreshing in real-time</span>
          </div>

          {serviceRequests.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-neutral-200">
              <Bell className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-base font-semibold text-neutral-700">No active service requests</p>
              <p className="text-sm text-neutral-400 mt-1">When guests request waiter service or bills, calls will appear here immediately.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serviceRequests.map((req) => (
                <div 
                  key={req.id}
                  className={`bg-white rounded-2xl border p-5 transition-all shadow-xs relative overflow-hidden ${
                    req.status === 'Pending' 
                      ? 'border-purple-300 ring-2 ring-purple-400/20 bg-gradient-to-br from-purple-50/50 to-white' 
                      : req.status === 'In Progress'
                      ? 'border-blue-300 bg-blue-50/30'
                      : 'border-neutral-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${
                        req.type === 'Bill Request' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {req.type === 'Bill Request' ? <Receipt className="w-5 h-5" /> : <PhoneCall className="w-5 h-5" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{req.type}</span>
                        <h3 className="text-lg font-bold text-neutral-900">{req.locationRef}</h3>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      req.status === 'Pending' 
                        ? 'bg-purple-600 text-white animate-pulse' 
                        : req.status === 'In Progress'
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-200 text-neutral-700'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  {req.notes && (
                    <div className="p-2.5 bg-neutral-100 rounded-xl text-xs text-neutral-700 mb-3 italic">
                      "{req.notes}"
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-neutral-500 pt-3 border-t border-neutral-100 mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>{Math.round((Date.now() - req.createdAt) / 60000)}m ago</span>
                  </div>

                  <div className="flex gap-2">
                    {req.status === 'Pending' && (
                      <button
                        onClick={() => handleUpdateServiceRequest(req.id, 'In Progress')}
                        className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-4 h-4" />
                        Acknowledge & Attend
                      </button>
                    )}
                    {req.status === 'In Progress' && (
                      <button
                        onClick={() => handleUpdateServiceRequest(req.id, 'Completed')}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Orders List & Detail View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Main Orders List */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-neutral-200">
                <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-2" />
                <p className="text-sm text-neutral-500 font-medium">Synchronizing live orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-neutral-200">
                <UtensilsCrossed className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <p className="text-base font-semibold text-neutral-700">No orders found</p>
                <p className="text-sm text-neutral-400 mt-1">There are no orders matching the current filter standard.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => {
                  const isClaimedByMe = order.assignedWaiterId === waiterId;
                  const isUnassigned = !order.assignedWaiterId;

                  return (
                    <div 
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`bg-white rounded-2xl border p-5 transition-all cursor-pointer hover:shadow-md ${
                        selectedOrder?.id === order.id 
                          ? 'border-neutral-900 ring-2 ring-neutral-900/10' 
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-neutral-100">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl font-bold text-sm ${
                            order.type === 'Room Service'
                              ? 'bg-purple-100 text-purple-800'
                              : order.type === 'Takeaway'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {order.locationRef || 'Table'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-900">Order #{order.orderNumber}</span>
                              <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 font-medium">{order.type}</span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span>•</span>
                              <span>{order.items.length} items</span>
                              {order.customerName && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold text-neutral-700">Guest: {order.customerName.split(' ')[0]}</span>
                                </>
                              )}
                              {order.arrivalTime && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold text-rose-600 bg-rose-50 px-1 rounded border border-rose-100">Arriving: {order.arrivalTime}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {/* Order Status Badge */}
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            order.status === 'Ready'
                              ? 'bg-amber-500 text-white animate-pulse'
                              : order.status === 'Delivered'
                              ? 'bg-blue-600 text-white'
                              : order.status === 'Completed'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-neutral-200 text-neutral-800'
                          }`}>
                            {order.status}
                          </span>

                          <span className="font-bold text-neutral-900 text-base">
                            {order.totalAmount} ETB
                          </span>
                        </div>
                      </div>

                      {/* Items Brief */}
                      <div className="py-3 text-xs text-neutral-600 flex flex-wrap gap-2">
                        {order.items.map((item, idx) => (
                          <span key={idx} className="bg-neutral-100 px-2.5 py-1 rounded-lg border border-neutral-200/60 font-medium">
                            {item.quantity}x {item.name}
                          </span>
                        ))}
                      </div>

                      {/* Waiter & Action Footer */}
                      <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          {isClaimedByMe ? (
                            <span className="text-blue-700 font-bold flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              <UserCheck className="w-3.5 h-3.5" />
                              Assigned to You
                            </span>
                          ) : order.assignedWaiterName ? (
                            <span className="text-neutral-500 font-medium">
                              Assigned: <strong className="text-neutral-800">{order.assignedWaiterName}</strong>
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              Unclaimed
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {order.paymentStatus !== 'Paid' && (
                            <button
                              disabled={verifyingPayment}
                              onClick={() => handleCollectCashPayment(order)}
                              title="Guest paid cash directly to waiter"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Cash Received</span>
                            </button>
                          )}

                          {isUnassigned && (
                            <button
                              disabled={claimingOrderId === order.id}
                              onClick={() => handleClaimOrder(order)}
                              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl transition-colors text-xs flex items-center gap-1"
                            >
                              {claimingOrderId === order.id ? 'Claiming...' : 'Claim Order'}
                            </button>
                          )}

                          {order.status === 'Ready' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'Delivered')}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-xs"
                            >
                              Mark Delivered
                            </button>
                          )}

                          {order.status === 'Delivered' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'Completed')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors text-xs"
                            >
                              Mark Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel: Selected Order Detailed View */}
          <div className="lg:col-span-1">
            {selectedOrder ? (
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 sticky top-6 space-y-6 shadow-xs">
                <div className="flex justify-between items-start pb-4 border-b border-neutral-200">
                  <div>
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Order Details</span>
                    <h2 className="text-xl font-bold text-neutral-900">Order #{selectedOrder.orderNumber}</h2>
                    <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      Location: <strong className="text-neutral-800">{selectedOrder.locationRef}</strong>
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="text-neutral-400 hover:text-neutral-600 font-bold text-xs"
                  >
                    Close
                  </button>
                </div>

                {/* Service Type & Payment */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    <span className="text-neutral-400 block mb-0.5">Order Type</span>
                    <span className="font-bold text-neutral-800">{selectedOrder.type}</span>
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    <span className="text-neutral-400 block mb-0.5">Payment Status</span>
                    <span className={`font-bold ${
                      selectedOrder.paymentStatus === 'Paid' ? 'text-emerald-600' : 
                      selectedOrder.paymentStatus === 'Pending Verification' ? 'text-amber-600 animate-pulse' : 'text-neutral-700'
                    }`}>
                      {selectedOrder.paymentStatus} ({selectedOrder.paymentMethod})
                    </span>
                  </div>
                </div>

                {/* Cash Payment Settlement Box for Waiters */}
                {selectedOrder.paymentStatus !== 'Paid' ? (
                  <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50/60 rounded-2xl border border-emerald-200 text-xs space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-2xs">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-emerald-950 text-xs">Collect Cash Payment</h4>
                          <p className="text-[10px] text-emerald-700">Approve cash handed directly to waiter</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-emerald-950">{selectedOrder.totalAmount} ETB</span>
                    </div>

                    <button
                      type="button"
                      disabled={verifyingPayment}
                      onClick={() => handleCollectCashPayment(selectedOrder)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{verifyingPayment ? 'Recording Payment...' : `Confirm Cash Received (${selectedOrder.totalAmount} ETB)`}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between text-emerald-800 font-bold">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Payment Completed</span>
                    </div>
                    <span className="text-emerald-950 font-black">{selectedOrder.totalAmount} ETB ({selectedOrder.paymentMethod || 'Cash'})</span>
                  </div>
                )}

                {/* Digital Payment Proof Review Box (if attached or pending verification) */}
                {(selectedOrder.paymentProofUrl || selectedOrder.transactionId || selectedOrder.paymentStatus === 'Pending Verification') && (
                  <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-amber-700" />
                        Digital Payment Slip
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedOrder.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {selectedOrder.paymentStatus}
                      </span>
                    </div>

                    {selectedOrder.transactionId && (
                      <div className="flex items-center justify-between text-[11px] text-neutral-700 pt-1 border-t border-amber-200/60">
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3 text-neutral-400" /> Transaction Ref:
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-neutral-900">{selectedOrder.transactionId}</span>
                          <CopyButton text={selectedOrder.transactionId} size="xs" variant="neutral" />
                        </div>
                      </div>
                    )}

                    {selectedOrder.paymentProofUrl && (
                      <div className="pt-1 flex items-center justify-between gap-2">
                        <div 
                          onClick={() => setFullscreenReceiptUrl(selectedOrder.paymentProofUrl || null)}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          {selectedOrder.paymentProofUrl !== 'pdf' ? (
                            <img
                              src={selectedOrder.paymentProofUrl}
                              alt="Receipt"
                              className="w-10 h-10 rounded-lg object-cover border border-amber-200 group-hover:opacity-80 transition"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                              <FileText className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-neutral-900 block group-hover:text-amber-800">Receipt Attached</span>
                            <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                              <Eye className="w-3 h-3 text-amber-600" /> Tap to view full screen
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setFullscreenReceiptUrl(selectedOrder.paymentProofUrl || null)}
                          className="px-2.5 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Fullscreen
                        </button>
                      </div>
                    )}

                    {selectedOrder.paymentStatus !== 'Paid' && (
                      <button
                        type="button"
                        disabled={verifyingPayment}
                        onClick={() => handleVerifyPayment(selectedOrder.id)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs disabled:opacity-50"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        {verifyingPayment ? 'Verifying...' : 'Verify Receipt Slip & Mark Paid'}
                      </button>
                    )}
                  </div>
                )}

                {/* Item List */}
                <div>
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Ordered Items</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-neutral-100">
                        <div>
                          <span className="font-bold text-neutral-800">{item.quantity}x</span> {item.name}
                          {item.notes && <span className="block text-[10px] text-amber-700 italic">"{item.notes}"</span>}
                        </div>
                        <span className="font-semibold text-neutral-900">{item.price * item.quantity} ETB</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-neutral-200 mt-3 space-y-1 text-xs">
                    <div className="flex justify-between text-neutral-600">
                      <span>Subtotal</span>
                      <span>{selectedOrder.subtotal || selectedOrder.totalAmount} ETB</span>
                    </div>
                    {selectedOrder.taxAmount > 0 && (
                      <div className="flex justify-between text-neutral-600">
                        <span>VAT Tax</span>
                        <span>{selectedOrder.taxAmount} ETB</span>
                      </div>
                    )}
                    {selectedOrder.serviceChargeAmount > 0 && (
                      <div className="flex justify-between text-neutral-600">
                        <span>Service Charge</span>
                        <span>{selectedOrder.serviceChargeAmount} ETB</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-neutral-900 pt-2 border-t border-neutral-200">
                      <span>Total Amount</span>
                      <span>{selectedOrder.totalAmount} ETB</span>
                    </div>
                  </div>
                </div>

                {/* Waiter Notes Section */}
                <div className="pt-2 border-t border-neutral-200">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Waiter Notes
                  </h3>
                  {selectedOrder.waiterNotes ? (
                    <p className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs italic mb-2">
                      "{selectedOrder.waiterNotes}"
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-400 italic mb-2">No waiter note added yet.</p>
                  )}

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add waiter note..."
                      value={waiterNoteInput}
                      onChange={(e) => setWaiterNoteInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900"
                    />
                    <button
                      onClick={() => handleAddWaiterNote(selectedOrder.id)}
                      className="px-3 py-1.5 bg-neutral-900 text-white font-semibold rounded-xl text-xs hover:bg-neutral-800"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Audit Timeline */}
                <div className="pt-2 border-t border-neutral-200">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Timeline Audit
                  </h3>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {(selectedOrder.timeline || []).map((event, idx) => (
                      <div key={idx} className="text-[11px] text-neutral-600 border-l-2 border-neutral-300 pl-2 py-0.5">
                        <span className="font-semibold text-neutral-800">{event.status}</span>
                        <span className="text-[10px] text-neutral-400 block">
                          {new Date(event.timestamp).toLocaleTimeString()} {event.updatedBy ? `by ${event.updatedBy}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-neutral-100 rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-400">
                <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">Select an order from the list to view detailed items, billing and waiter actions.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* In-Page Fullscreen Receipt Lightbox */}
      <ReceiptLightboxModal
        imageUrl={fullscreenReceiptUrl}
        title={`Payment Receipt: Order #${selectedOrder?.orderNumber || ''}`}
        onClose={() => setFullscreenReceiptUrl(null)}
      />

      {/* POS Order Creation Modal */}
      <CreateOrderModal 
        isOpen={isCreateOrderOpen}
        onClose={() => setIsCreateOrderOpen(false)}
        onOrderCreated={(newOrder) => {
          setActionSuccess(`Order #${newOrder.orderNumber} for ${newOrder.locationRef} successfully created and sent to kitchen!`);
        }}
      />
    </div>
  );
}
