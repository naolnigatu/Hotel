import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order, OrderStatus, RestaurantSettings, KitchenStation } from '../../types';
import { sendNotification } from '../../lib/notificationService';
import { 
  UtensilsCrossed, Clock, CheckCircle2, ChevronRight, Volume2, VolumeX, AlertCircle, 
  XCircle, Filter, LayoutGrid, Search, Flame, Leaf, MessageSquare, ChefHat
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const KITCHEN_STATUSES: OrderStatus[] = ['Order Submitted', 'Kitchen Received', 'Preparing', 'Ready'];

export default function KitchenDashboard() {
  const { userData } = useAuth();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filterStation, setFilterStation] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'Active' | 'History'>('Active');
  const [loading, setLoading] = useState(true);
  
  // To track new orders for sound
  const prevOrderCount = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Fetch Kitchen Stations
    const qStations = query(collection(db, 'kitchen_stations'), orderBy('displayOrder', 'asc'));
    const unsubStations = onSnapshot(qStations, (snapshot) => {
      const stData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as KitchenStation));
      setStations(stData);
    });

    return () => unsubStations();
  }, []);

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3'); // We'll need a generic notification sound or just synthesize beep
    
    // Fetch Settings
    const unsubSettings = onSnapshot(doc(db, 'app_settings', 'restaurant'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as RestaurantSettings);
      }
    }, (error) => {
      console.error("Error fetching restaurant settings in KitchenDashboard:", error);
    });

    // Fetch Active Orders
    const q = query(
      collection(db, 'restaurant_orders'),
      where('status', 'in', KITCHEN_STATUSES)
    );

    const unsubOrders = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
      
      // Sort by priority then by created time
      ordersData.sort((a, b) => {
        const priorityWeight = { 'Urgent': 3, 'High': 2, 'Normal': 1 };
        const wA = priorityWeight[a.priority || 'Normal'] || 1;
        const wB = priorityWeight[b.priority || 'Normal'] || 1;
        if (wA !== wB) return wB - wA; // Higher priority first
        return a.createdAt - b.createdAt; // Older first
      });

      setActiveOrders(ordersData);
      setLoading(false);

      // Check if new order submitted to play sound
      const newOrdersCount = ordersData.filter(o => o.status === 'Order Submitted').length;
      if (newOrdersCount > prevOrderCount.current && soundEnabled && audioRef.current) {
        // play simple beep using Web Audio API if no file
        playBeep();
      }
      prevOrderCount.current = newOrdersCount;
    }, (error) => {
      console.error("Error fetching kitchen orders:", error);
      setLoading(false);
    });

    return () => {
      unsubSettings();
      unsubOrders();
    };
  }, [soundEnabled]);

  useEffect(() => {
    if (viewMode === 'History') {
      const fetchHistory = async () => {
        const q = query(
          collection(db, 'restaurant_orders'),
          where('status', 'in', ['Completed', 'Delivered', 'Cancelled']),
          orderBy('updatedAt', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        setCompletedOrders(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));
      };
      fetchHistory();
    }
  }, [viewMode]);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch(e) {
      console.log('Audio disabled by browser policy');
    }
  };

  const updateOrderStatus = async (order: Order, newStatus: OrderStatus) => {
    try {
      const orderRef = doc(db, 'restaurant_orders', order.id);
      
      const newTimelineEvent = {
        status: newStatus,
        timestamp: Date.now(),
        updatedBy: userData?.name || 'Kitchen Staff'
      };

      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: Date.now(),
        timeline: [...order.timeline, newTimelineEvent]
      });

      // Send Waiter notification if Ready
      if (newStatus === 'Ready') {
        const loc = order.tableNumber ? `Table ${order.tableNumber}` : order.roomNumber ? `Room ${order.roomNumber}` : 'Takeaway';
        await sendNotification({
          recipientRole: 'waiter',
          title: `Order #${order.id.slice(-6).toUpperCase()} is READY!`,
          message: `Order for ${loc} (${order.items.length} items) is ready for pickup & service.`,
          type: 'order',
          relatedEntityId: order.id,
          relatedEntityType: 'order',
          targetRoute: '/admin/waiter',
          priority: 'Urgent',
          eventId: `ord_ready_${order.id}`
        });
      }

      // Send Guest notification if customerUid exists
      if (order.customerUid) {
        await sendNotification({
          recipientUid: order.customerUid,
          title: `Order Status: ${newStatus}`,
          message: `Your order #${order.id.slice(-6).toUpperCase()} status is now: ${newStatus}.`,
          type: 'order',
          relatedEntityId: order.id,
          relatedEntityType: 'order',
          targetRoute: `/order-tracker?id=${order.id}`,
          priority: newStatus === 'Ready' ? 'Urgent' : 'Normal',
          eventId: `ord_status_${order.id}_${newStatus}`
        });
      }
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to update status. Please check your connection.");
    }
  };

  const cancelOrder = async (order: Order) => {
    const reason = prompt("Enter reason for cancellation:");
    if (reason === null) return;
    
    try {
      const orderRef = doc(db, 'restaurant_orders', order.id);
      const newTimelineEvent = {
        status: 'Cancelled',
        timestamp: Date.now(),
        note: reason,
        updatedBy: userData?.name || 'Kitchen Staff'
      };
      await updateDoc(orderRef, {
        status: 'Cancelled',
        updatedAt: Date.now(),
        timeline: [...order.timeline, newTimelineEvent]
      });
    } catch (err) {
      console.error("Failed to cancel", err);
      alert("Failed to cancel order.");
    }
  };

  const addKitchenNote = async (order: Order) => {
    const note = prompt("Enter an internal kitchen note:");
    if (!note) return;
    
    try {
      const orderRef = doc(db, 'restaurant_orders', order.id);
      const newTimelineEvent = {
        status: order.status,
        timestamp: Date.now(),
        note: `Kitchen Note: ${note}`,
        updatedBy: userData?.name || 'Kitchen Staff'
      };
      await updateDoc(orderRef, {
        kitchenNotes: note,
        updatedAt: Date.now(),
        timeline: [...order.timeline, newTimelineEvent]
      });
    } catch (err) {
      console.error("Failed to add note", err);
      alert("Failed to add kitchen note.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Order Submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Kitchen Received': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Preparing': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Ready': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  const ElapsedTime = ({ start }: { start: number }) => {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 60000));
      }, 30000); // update every 30s
      setElapsed(Math.floor((Date.now() - start) / 60000));
      return () => clearInterval(interval);
    }, [start]);
    
    return (
      <span className={`font-bold flex items-center gap-1 ${elapsed > 30 ? 'text-rose-600' : 'text-neutral-600'}`}>
        <Clock className="w-3.5 h-3.5" /> {elapsed}m
      </span>
    );
  };

  const OrderCard: React.FC<{ order: Order }> = ({ order }) => {
    const nextStatusMap: Record<string, OrderStatus> = {
      'Order Submitted': 'Kitchen Received',
      'Kitchen Received': 'Preparing',
      'Preparing': 'Ready',
      'Ready': 'Completed'
    };
    const actionTextMap: Record<string, string> = {
      'Order Submitted': 'Acknowledge',
      'Kitchen Received': 'Start Prep',
      'Preparing': 'Mark Ready',
      'Ready': 'Complete'
    };

    const nextStatus = nextStatusMap[order.status];

    return (
      <div className={`bg-white rounded-xl shadow-sm border p-4 flex flex-col justify-between ${
        order.priority === 'Urgent' ? 'border-red-400 ring-1 ring-red-400' : 
        order.priority === 'High' ? 'border-orange-400' : 'border-neutral-200'
      }`}>
        <div>
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-extrabold text-neutral-900">#{order.orderNumber}</span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
                {order.priority && order.priority !== 'Normal' && (
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    order.priority === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {order.priority}
                  </span>
                )}
              </div>
              <div className="text-xs text-neutral-500 font-medium flex items-center gap-2">
                <span className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700">{order.type}</span>
                {order.tableNumber && <span>Table {order.tableNumber}</span>}
                {order.roomNumber && <span>Room {order.roomNumber}</span>}
              </div>
            </div>
            <ElapsedTime start={order.createdAt} />
          </div>

          <div className="space-y-2 mb-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm py-1.5 border-b border-neutral-100 last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-neutral-900">{item.quantity}×</span>
                    <span className="font-medium text-neutral-800">{item.name}</span>
                    {item.kitchenStationName && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold border border-blue-100">
                        <ChefHat className="w-3 h-3 text-blue-500" />
                        {item.kitchenStationName}
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <div className="text-xs text-rose-600 mt-0.5 font-medium flex items-start gap-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      {item.notes}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                   {item.isSpicy && <Flame className="w-3.5 h-3.5 text-red-500" />}
                   {item.isVegetarian && <Leaf className="w-3.5 h-3.5 text-emerald-500" />}
                </div>
              </div>
            ))}
          </div>

          {order.orderNotes && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-2 rounded-lg mb-2 flex items-start gap-1.5">
              <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold text-[10px] uppercase block">Customer Note:</span>
                <span>{order.orderNotes}</span>
              </div>
            </div>
          )}
          {order.kitchenNotes && (
            <div className="bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs p-2 rounded-lg mb-4 flex items-start gap-1.5">
              <ChefHat className="w-4 h-4 mt-0.5 flex-shrink-0 text-neutral-600" />
              <div>
                <span className="font-bold text-[10px] uppercase block text-neutral-500">Internal Note:</span>
                <span>{order.kitchenNotes}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-2">
          {viewMode === 'Active' && (
            <>
              {nextStatus && (
                <button 
                  onClick={() => updateOrderStatus(order, nextStatus)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm transition shadow-sm active:scale-95"
                >
                  {actionTextMap[order.status]}
                </button>
              )}
              <button 
                onClick={() => addKitchenNote(order)}
                className="p-2.5 text-neutral-600 hover:bg-neutral-100 rounded-lg transition border border-neutral-200"
                title="Add Kitchen Note"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              {order.status !== 'Ready' && (
                <button 
                  onClick={() => cancelOrder(order)}
                  className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-lg transition border border-transparent hover:border-rose-200"
                  title="Cancel Order"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const columns = [
    { title: 'New', status: 'Order Submitted' },
    { title: 'Accepted', status: 'Kitchen Received' },
    { title: 'Preparing', status: 'Preparing' },
    { title: 'Ready', status: 'Ready' }
  ];

  const filteredActiveOrders = useMemo(() => {
    if (filterStation === 'All') return activeOrders;
    return activeOrders.filter(order => 
      order.items.some(i => i.kitchenStationId === filterStation || i.kitchenStationName === filterStation)
    );
  }, [activeOrders, filterStation]);

  if (!navigator.onLine) {
    return (
      <div className="p-8 text-center text-rose-600">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Kitchen Offline</h2>
        <p>Please check your internet connection.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-100 overflow-hidden">
      {/* Header */}
      <header className="bg-neutral-900 text-white p-4 flex flex-wrap justify-between items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="w-6 h-6 text-emerald-400" />
          <h1 className="text-xl font-bold tracking-tight">KDS - Kitchen Display System</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Station Filter */}
          {stations.length > 0 && (
            <div className="flex items-center gap-1.5 bg-neutral-800 px-3 py-1.5 rounded-lg text-xs border border-neutral-700">
              <ChefHat className="w-3.5 h-3.5 text-emerald-400" />
              <select
                value={filterStation}
                onChange={(e) => setFilterStation(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="All" className="bg-neutral-800 text-white">All Stations</option>
                {stations.map(st => (
                  <option key={st.id} value={st.id} className="bg-neutral-800 text-white">
                    Station: {st.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex bg-neutral-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('Active')}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${viewMode === 'Active' ? 'bg-emerald-600 text-white' : 'text-neutral-400 hover:text-white'}`}
            >
              Active Board
            </button>
            <button
              onClick={() => setViewMode('History')}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${viewMode === 'History' ? 'bg-neutral-600 text-white' : 'text-neutral-400 hover:text-white'}`}
            >
              History
            </button>
          </div>

          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg transition ${soundEnabled ? 'bg-emerald-900/50 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}`}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-auto p-6">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
          </div>
        ) : viewMode === 'Active' ? (
          <div className="flex gap-6 h-full items-start w-max min-w-full">
            {columns.map(col => {
              const columnOrders = filteredActiveOrders.filter(o => o.status === col.status);
              return (
                <div key={col.status} className="w-80 flex-shrink-0 flex flex-col h-full max-h-full">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="font-bold text-neutral-700 uppercase tracking-wider text-sm flex items-center gap-2">
                      {col.title} 
                      <span className="bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full text-xs">
                        {columnOrders.length}
                      </span>
                    </h2>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1">
                    {columnOrders.map(order => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                    {columnOrders.length === 0 && (
                      <div className="text-center py-8 text-neutral-400 text-sm border-2 border-dashed border-neutral-200 rounded-xl">
                        No {col.title.toLowerCase()} orders
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-neutral-200 p-6 h-full overflow-y-auto">
            <h2 className="text-lg font-bold text-neutral-900 mb-6">Recent Completed & Cancelled Orders</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
              {completedOrders.length === 0 && (
                <p className="text-neutral-500 col-span-full">No recent history.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
