import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  orderBy, 
  where 
} from 'firebase/firestore';
import { 
  MenuItem, 
  MenuCategory, 
  Table, 
  Room, 
  Order, 
  OrderItem, 
  OrderType,
  RestaurantSettings 
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { handleFirestoreError, OperationType, logAuditAction } from '../../lib/firestoreUtils';
import { sendNotification } from '../../lib/notificationService';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { 
  Utensils, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  CreditCard, 
  DollarSign, 
  Building2, 
  ShoppingBag, 
  User, 
  Phone, 
  FileText,
  Flame,
  Leaf,
  ChevronRight,
  Send,
  Sparkles
} from 'lucide-react';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: (order: Order) => void;
}

export default function CreateOrderModal({ isOpen, onClose, onOrderCreated }: CreateOrderModalProps) {
  const { userData } = useAuth();
  useBodyScrollLock(isOpen);

  // Form State
  const [orderType, setOrderType] = useState<OrderType>('Dine-In');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [customTableNumber, setCustomTableNumber] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [arrivalTime, setArrivalTime] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  
  // Payment Options
  const [paymentOption, setPaymentOption] = useState<'Pay to Cashier' | 'Cash' | 'POS' | 'Telebirr' | 'CBE Birr' | 'Charge to Room'>('Pay to Cashier');
  const [transactionRef, setTransactionRef] = useState<string>('');

  // Cart & Menu State
  const [cartItems, setCartItems] = useState<{ item: MenuItem; quantity: number; notes: string }[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings>({
    vatRate: 0.15,
    serviceChargeRate: 0,
    roomServiceFee: 50,
    isRestaurantOpen: true,
    operatingHours: '6:00 AM - 11:00 PM',
    acceptedPaymentMethods: ['Cash', 'POS', 'Telebirr', 'CBE Birr', 'Charge to Room']
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // UI & Loading
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const staffId = userData?.uid || 'staff-uid';
  const staffName = userData?.name || 'Staff Member';
  const staffRole = userData?.role || 'waiter';

  useEffect(() => {
    if (!isOpen) return;

    // Load Menu Items
    const unsubMenu = onSnapshot(collection(db, 'menu_items'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
      setMenuItems(list.filter(i => i.isAvailable !== false));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'menu_items');
      setLoading(false);
    });

    // Load Menu Categories
    const unsubCats = onSnapshot(query(collection(db, 'menu_categories'), orderBy('displayOrder', 'asc')), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuCategory));
      setCategories(list.filter(c => c.isActive !== false));
    });

    // Load Tables
    const unsubTables = onSnapshot(collection(db, 'restaurant_tables'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Table));
      setTables(list);
    });

    // Load Rooms
    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Room));
      setRooms(list);
    });

    // Load Restaurant Settings
    const unsubSettings = onSnapshot(doc(db, 'app_settings', 'restaurant'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as RestaurantSettings;
        setRestaurantSettings({
          ...data,
          serviceChargeRate: 0, // Enforced 0% service charge
          vatRate: data.vatRate || 0.15,
          roomServiceFee: data.roomServiceFee ?? 50
        });
      }
    });

    return () => {
      unsubMenu();
      unsubCats();
      unsubTables();
      unsubRooms();
      unsubSettings();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Cart operations
  const handleAddItem = (item: MenuItem) => {
    setCartItems(prev => {
      const existing = prev.find(ci => ci.item.id === item.id);
      if (existing) {
        return prev.map(ci => ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, { item, quantity: 1, notes: '' }];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCartItems(prev => {
      return prev.map(ci => {
        if (ci.item.id === itemId) {
          const newQty = ci.quantity + delta;
          return newQty > 0 ? { ...ci, quantity: newQty } : null;
        }
        return ci;
      }).filter(Boolean) as { item: MenuItem; quantity: number; notes: string }[];
    });
  };

  const handleUpdateItemNotes = (itemId: string, notes: string) => {
    setCartItems(prev => prev.map(ci => ci.item.id === itemId ? { ...ci, notes } : ci));
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems(prev => prev.filter(ci => ci.item.id !== itemId));
  };

  // Financial calculations
  // Price assigned to item is inclusive of VAT (15%).
  // Sum of items price is the itemsTotal.
  const itemsTotal = cartItems.reduce((acc, ci) => acc + (ci.item.price * ci.quantity), 0);
  const roomServiceFee = orderType === 'Room Service' ? (restaurantSettings.roomServiceFee || 50) : 0;
  const totalAmount = itemsTotal + roomServiceFee;
  
  // Tax breakdown (straight percentage: Tax = TotalItems * 15%)
  const taxRate = restaurantSettings.vatRate > 1 ? restaurantSettings.vatRate / 100 : (restaurantSettings.vatRate || 0.15);
  const taxAmount = itemsTotal > 0 ? Math.round(itemsTotal * taxRate) : 0;
  const subtotal = itemsTotal - taxAmount;

  // Filtered menu items
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory || item.categoryId === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);

    if (cartItems.length === 0) {
      setErrorNotice('Please add at least one item to the order.');
      return;
    }

    // Validation per order type
    let locationRef = '';
    let tableNum = '';
    let roomNum = '';

    if (orderType === 'Dine-In' || orderType === 'QR Menu/Dine in') {
      tableNum = selectedTable || customTableNumber.trim();
      if (!tableNum) {
        setErrorNotice('Please select or specify a table number.');
        return;
      }
      locationRef = `Table ${tableNum.replace(/^Table\s*/i, '')}`;
    } else if (orderType === 'Room Service') {
      roomNum = selectedRoom.trim();
      if (!roomNum) {
        setErrorNotice('Please enter or select a room number.');
        return;
      }
      locationRef = `Room ${roomNum.replace(/^Room\s*/i, '')}`;
    } else if (orderType === 'Takeaway') {
      locationRef = 'Takeaway';
    } else if (orderType === 'Book Meal') {
      locationRef = 'Book Meal (Pre-Order)';
      if (!arrivalTime) {
        setErrorNotice('Please specify the expected arrival time for Book Meal.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const orderNumber = Math.floor(100000 + Math.random() * 900000).toString();
      const orderId = `order_${Date.now()}_${orderNumber}`;
      const now = Date.now();

      // Determine Payment Status
      let paymentStatus: Order['paymentStatus'] = 'Pending';
      let finalPaymentMethod = paymentOption;

      if (paymentOption === 'Cash' || paymentOption === 'POS' || paymentOption === 'Telebirr' || paymentOption === 'CBE Birr') {
        paymentStatus = 'Paid';
      } else if (paymentOption === 'Charge to Room') {
        paymentStatus = 'Charged to Room';
      } else {
        paymentStatus = 'Pending';
        finalPaymentMethod = 'Pay to Cashier';
      }

      // Convert cart items to OrderItem
      const formattedItems: OrderItem[] = cartItems.map(ci => ({
        itemId: ci.item.id,
        name: ci.item.name,
        quantity: ci.quantity,
        price: ci.item.price,
        notes: ci.notes.trim() || undefined,
        imageUrl: ci.item.imageUrl,
        category: ci.item.category,
        isSpicy: ci.item.isSpicy,
        isVegetarian: ci.item.isVegetarian,
        kitchenStationId: ci.item.kitchenStationId,
        kitchenStationName: ci.item.kitchenStationName,
        status: 'Pending'
      }));

      const newOrder: Order = {
        id: orderId,
        orderNumber,
        type: orderType,
        locationRef,
        tableNumber: tableNum || undefined,
        roomNumber: roomNum || undefined,
        customerName: customerName.trim() || (orderType === 'Room Service' ? `Guest in ${locationRef}` : 'Walk-in Guest'),
        customerPhone: customerPhone.trim() || undefined,
        arrivalTime: arrivalTime || undefined,
        items: formattedItems,
        subtotal,
        taxRate,
        taxAmount,
        serviceChargeRate: 0,
        serviceChargeAmount: 0,
        roomServiceFee: roomServiceFee || undefined,
        totalAmount,
        paymentMethod: finalPaymentMethod,
        paymentStatus,
        transactionId: transactionRef.trim() || undefined,
        status: 'Order Submitted',
        orderNotes: orderNotes.trim() || undefined,
        assignedWaiterId: staffRole === 'waiter' ? staffId : undefined,
        assignedWaiterName: staffRole === 'waiter' ? staffName : undefined,
        timeline: [
          {
            status: 'Order Created',
            timestamp: now,
            note: `Created via Staff POS by ${staffName} (${staffRole.toUpperCase()})`,
            updatedBy: staffName
          }
        ],
        createdAt: now,
        updatedAt: now
      };

      // Save to Firestore
      await setDoc(doc(db, 'restaurant_orders', orderId), newOrder);

      // Audit Log
      await logAuditAction(
        staffId,
        staffName,
        staffRole,
        `Created Staff Order #${orderNumber}`,
        'Restaurant',
        `Type: ${orderType}, Location: ${locationRef}, Total: ${totalAmount} ETB, Payment: ${paymentStatus}`
      );

      // Notify Kitchen
      await sendNotification({
        recipientRole: 'kitchen',
        title: `New Order #${orderNumber}`,
        message: `${locationRef} (${formattedItems.length} items) - Ordered by ${staffName}`,
        type: 'order',
        relatedEntityId: orderId,
        relatedEntityType: 'order',
        targetRoute: '/admin/kitchen',
        priority: 'Important',
        eventId: `new_order_k_${orderId}`
      });

      // Notify Cashier
      await sendNotification({
        recipientRole: 'cashier',
        title: `Order #${orderNumber} (${paymentStatus})`,
        message: `${locationRef}: ${totalAmount} ETB via ${finalPaymentMethod}`,
        type: 'payment',
        relatedEntityId: orderId,
        relatedEntityType: 'order',
        targetRoute: '/admin/cashier',
        priority: paymentStatus === 'Paid' ? 'Normal' : 'Important',
        eventId: `new_order_c_${orderId}`
      });

      // If Table was selected and status was Available, update table to Occupied
      if (tableNum) {
        const matchingTable = tables.find(t => t.tableNumber === tableNum || t.tableNumber === `Table ${tableNum}`);
        if (matchingTable && matchingTable.status === 'Available') {
          await updateDoc(doc(db, 'restaurant_tables', matchingTable.id), { status: 'Occupied' });
        }
      }

      if (onOrderCreated) {
        onOrderCreated(newOrder);
      }

      onClose();
    } catch (err: any) {
      console.error('Error creating staff order:', err);
      setErrorNotice(err.message || 'Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto overscroll-contain animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-5xl my-4 sm:my-8 overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-neutral-200">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-800 rounded-xl">
              <Utensils className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Take Customer Order
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-normal">
                  Staff POS
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Staff: <span className="font-semibold text-neutral-200">{staffName}</span> ({staffRole})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notice */}
        {errorNotice && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorNotice}</span>
            </div>
            <button onClick={() => setErrorNotice(null)} className="text-red-500 font-bold">Dismiss</button>
          </div>
        )}

        {/* Body Grid: Left = Menu Browser, Right = Cart & Customer / Payment Setup */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          
          {/* LEFT: Menu Selection (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-neutral-200 overflow-hidden bg-neutral-50/50">
            {/* Search & Category Pills */}
            <div className="p-4 border-b border-neutral-200 bg-white space-y-3 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search food, drinks, desserts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 focus:bg-white transition"
                />
              </div>

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('All')}
                  className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === 'All'
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  All Items ({menuItems.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat.name
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {loading ? (
                <div className="py-12 text-center text-neutral-400 text-xs">Loading menu items...</div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="py-12 text-center text-neutral-400 text-xs">No items match your search.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredMenuItems.map((item) => {
                    const inCart = cartItems.find(ci => ci.item.id === item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleAddItem(item)}
                        className={`p-3 bg-white rounded-xl border transition-all cursor-pointer flex justify-between items-start gap-2 shadow-2xs hover:border-neutral-400 select-none ${
                          inCart ? 'border-neutral-900 ring-1 ring-neutral-900/10' : 'border-neutral-200'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-neutral-900 text-xs truncate">{item.name}</h4>
                            {item.isSpicy && <Flame className="w-3 h-3 text-red-500 shrink-0" />}
                            {item.isVegetarian && <Leaf className="w-3 h-3 text-emerald-500 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">{item.description}</p>
                          <span className="font-bold text-neutral-900 text-xs mt-1 block">
                            {item.price} ETB
                          </span>
                        </div>

                        {inCart ? (
                          <div className="flex items-center gap-1 bg-neutral-900 text-white px-2 py-1 rounded-lg text-xs font-bold shrink-0">
                            <span>{inCart.quantity}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="p-1.5 bg-neutral-100 hover:bg-neutral-900 hover:text-white rounded-lg text-neutral-700 transition shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Order Configuration & Cart Details (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col bg-white overflow-hidden">
            <form onSubmit={handleSubmitOrder} className="flex flex-col h-full overflow-hidden">
              
              {/* Scrollable Setup & Items */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                
                {/* 1. Order Type Selection */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-1.5">
                    Order Type
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'Dine-In', label: 'Dine-In', icon: Utensils },
                      { id: 'Room Service', label: 'Room Serv.', icon: Building2 },
                      { id: 'Takeaway', label: 'Takeaway', icon: ShoppingBag },
                      { id: 'Book Meal', label: 'Book Meal', icon: Clock }
                    ].map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setOrderType(type.id as OrderType)}
                        className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          orderType === type.id
                            ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        {React.createElement(type.icon, { className: "w-3.5 h-3.5" })}
                        <span className="text-[10px] font-bold leading-none">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Destination (Table / Room / Time) */}
                <div className="grid grid-cols-2 gap-2.5">
                  {(orderType === 'Dine-In' || orderType === 'QR Menu/Dine in') && (
                    <div className="col-span-2">
                      <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                        Table Number <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={selectedTable}
                          onChange={(e) => {
                            setSelectedTable(e.target.value);
                            if (e.target.value) setCustomTableNumber('');
                          }}
                          className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900"
                        >
                          <option value="">Select Table...</option>
                          {tables.map(t => (
                            <option key={t.id} value={t.tableNumber}>
                              {t.tableNumber} ({t.area} - {t.status})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Or type #..."
                          value={customTableNumber}
                          onChange={(e) => {
                            setCustomTableNumber(e.target.value);
                            if (e.target.value) setSelectedTable('');
                          }}
                          className="w-24 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900"
                        />
                      </div>
                    </div>
                  )}

                  {orderType === 'Room Service' && (
                    <div className="col-span-2">
                      <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                        Room Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 204 or Room 102"
                        value={selectedRoom}
                        onChange={(e) => setSelectedRoom(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                  )}

                  {orderType === 'Book Meal' && (
                    <div className="col-span-2">
                      <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                        Arrival Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={arrivalTime}
                        onChange={(e) => setArrivalTime(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                  )}

                  {/* Customer First Name */}
                  <div className={orderType === 'Takeaway' || orderType === 'Book Meal' ? 'col-span-1' : 'col-span-2'}>
                    <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                      Guest First Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Abebe"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  {(orderType === 'Takeaway' || orderType === 'Book Meal') && (
                    <div className="col-span-1">
                      <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                        Phone {orderType === 'Book Meal' ? <span className="text-red-500">*</span> : <span className="text-neutral-400 font-normal">(Optional)</span>}
                      </label>
                      <input
                        type="tel"
                        placeholder="09..."
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Selected Order Items List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                      Order Basket ({cartItems.reduce((a, b) => a + b.quantity, 0)})
                    </label>
                    {cartItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCartItems([])}
                        className="text-[10px] text-red-600 font-bold hover:underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {cartItems.length === 0 ? (
                    <div className="p-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-200 text-center text-xs text-neutral-400">
                      Click items from the left menu to add to this ticket.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {cartItems.map((ci) => (
                        <div key={ci.item.id} className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-neutral-900 truncate">{ci.item.name}</span>
                            <span className="font-bold text-neutral-900 shrink-0">{ci.item.price * ci.quantity} ETB</span>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-200/50">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(ci.item.id, -1)}
                                className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center font-bold text-xs">{ci.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(ci.item.id, 1)}
                                className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <input
                              type="text"
                              placeholder="Special note (e.g. no onion)..."
                              value={ci.notes}
                              onChange={(e) => handleUpdateItemNotes(ci.item.id, e.target.value)}
                              className="flex-1 px-2 py-1 bg-white border border-neutral-200 rounded-lg text-[11px] focus:outline-none"
                            />

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(ci.item.id)}
                              className="text-neutral-400 hover:text-red-500 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Payment Settlement Option */}
                <div className="pt-2 border-t border-neutral-200 space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                    Payment / Settlement
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'Pay to Cashier', label: 'Pay to Cashier' },
                      { id: 'Cash', label: 'Cash (Paid)' },
                      { id: 'POS', label: 'POS Card (Paid)' },
                      { id: 'Telebirr', label: 'Telebirr' },
                      { id: 'CBE Birr', label: 'CBE Birr' },
                      { id: 'Charge to Room', label: 'Room Charge' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPaymentOption(opt.id as any)}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold text-center transition cursor-pointer ${
                          paymentOption === opt.id
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {(paymentOption === 'Telebirr' || paymentOption === 'CBE Birr') && (
                    <input
                      type="text"
                      placeholder="Transaction reference ID..."
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none"
                    />
                  )}
                </div>

                {/* Order Remarks */}
                <div>
                  <input
                    type="text"
                    placeholder="General order instructions / remarks..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              {/* Sticky Footer: Total & Submit */}
              <div className="p-4 bg-neutral-50 border-t border-neutral-200 space-y-3 shrink-0">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-neutral-500">
                    <span>Subtotal</span>
                    <span>{subtotal.toLocaleString()} ETB</span>
                  </div>
                  <div className="flex justify-between text-neutral-500">
                    <span>VAT (15% inclusive)</span>
                    <span>{taxAmount.toLocaleString()} ETB</span>
                  </div>
                  {roomServiceFee > 0 && (
                    <div className="flex justify-between text-neutral-500">
                      <span>Room Delivery Fee</span>
                      <span>{roomServiceFee} ETB</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-neutral-900 text-base pt-1 border-t border-neutral-200">
                    <span>Total Amount</span>
                    <span>{totalAmount.toLocaleString()} ETB</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || cartItems.length === 0}
                    className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Submitting Ticket...' : `Submit Order (${totalAmount} ETB)`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
