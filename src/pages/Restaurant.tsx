import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItem, OrderType } from '../types';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useSearchParams, Link } from 'react-router-dom';
import ItemDetailModal from '../components/restaurant/ItemDetailModal';
import CartDrawer from '../components/restaurant/CartDrawer';
import CheckoutModal from '../components/restaurant/CheckoutModal';

import { 
  ShoppingCart, 
  Search, 
  UtensilsCrossed, 
  Hotel, 
  ShoppingBag, 
  Clock, 
  Flame, 
  Leaf, 
  Sparkles, 
  SlidersHorizontal, 
  QrCode, 
  CheckCircle, 
  ArrowRight,
  ShieldCheck,
  X,
  PhoneCall,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function Restaurant() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { 
    orderType, 
    setOrderType, 
    locationDetails, 
    setLocationDetails, 
    totalItemCount, 
    grandTotal, 
    setIsCartOpen,
    restaurantSettings
  } = useCart();

  // Firestore Menu State
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search States
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpicyOnly, setFilterSpicyOnly] = useState(false);
  const [filterVegOnly, setFilterVegOnly] = useState(false);

  // Modal States
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);

  // Table / Room Input States for Modals
  const [tableInput, setTableInput] = useState(locationDetails.tableNumber || '');
  const [roomInput, setRoomInput] = useState(locationDetails.roomNumber || '');
  const [codeInput, setCodeInput] = useState(locationDetails.reservationCode || '');

  // Handle URL Auto-Detection for QR Table Ordering (e.g., ?table=T-04 or ?tableId=4)
  useEffect(() => {
    const tableParam = searchParams.get('table') || searchParams.get('tableId') || searchParams.get('qr');
    if (tableParam) {
      setOrderType('QR Table');
      setLocationDetails({ tableNumber: tableParam });
    }
  }, [searchParams]);

  // Real-time Firestore Menu Listener
  useEffect(() => {
    const q = query(collection(db, 'menu_items'));
    const unsub = onSnapshot(q, (snapshot) => {
      const menuData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MenuItem[];
      setItems(menuData);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to menu items:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Compute Categories
  const categories = useMemo(() => {
    const catSet = new Set(['All', ...items.map(item => item.category)]);
    return Array.from(catSet);
  }, [items]);

  // Filter Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSpicy = !filterSpicyOnly || Boolean(item.isSpicy);
      const matchesVeg = !filterVegOnly || Boolean(item.isVegetarian || item.isVegan);

      return matchesCategory && matchesSearch && matchesSpicy && matchesVeg;
    });
  }, [items, activeCategory, searchQuery, filterSpicyOnly, filterVegOnly]);

  const handleSaveTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableInput.trim()) return;
    setOrderType('QR Table');
    setLocationDetails({ tableNumber: tableInput.trim() });
    setShowTableModal(false);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    setOrderType('Room Service');
    setLocationDetails({ roomNumber: roomInput.trim(), reservationCode: codeInput.trim() });
    setShowRoomModal(false);
  };

  return (
    <div className="bg-neutral-50 min-h-screen pb-24">
      {/* Hero Header */}
      <div className="bg-neutral-900 text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#emerald_500_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" /> Woliso Hotel Dining Experience
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Traditional & Gourmet Cuisine
            </h1>
            <p className="text-neutral-400 text-sm mt-2 max-w-xl leading-relaxed">
              Enjoy fresh Ethiopian traditional delights and international specialties directly at your table or room.
            </p>
          </div>

          {/* Quick Track Order Link */}
          <Link
            to="/restaurant/track"
            className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-neutral-700 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-sm"
          >
            <Clock className="w-4 h-4 text-emerald-400" /> Track Existing Order
          </Link>
        </div>
      </div>

      {/* Mode Selection & Context Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        {!restaurantSettings.isRestaurantOpen && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-sm">Restaurant is Currently Closed</h3>
              <p className="text-xs text-rose-700 mt-0.5">We are currently not accepting new orders. Our regular operating hours are {restaurantSettings.operatingHours}.</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-neutral-200/80 p-4 md:p-6 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mr-1">Ordering Mode:</span>
            
            <button
              onClick={() => setOrderType('Website Order')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                orderType === 'Website Order'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Dine-In / Menu
            </button>

            <button
              onClick={() => {
                setOrderType('QR Table');
                setShowTableModal(true);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                orderType === 'QR Table'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" /> QR Table
            </button>

            <button
              onClick={() => {
                setOrderType('Room Service');
                setShowRoomModal(true);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                orderType === 'Room Service'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <Hotel className="w-3.5 h-3.5" /> Room Service
            </button>

            <button
              onClick={() => setOrderType('Takeaway')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                orderType === 'Takeaway'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Takeaway
            </button>
          </div>

          {/* Context Details Badge */}
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-xs text-emerald-900 font-medium flex items-center gap-3 w-full lg:w-auto justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                {orderType === 'QR Table' && (locationDetails.tableNumber ? `Table Number: ${locationDetails.tableNumber}` : 'Please set table number')}
                {orderType === 'Room Service' && (locationDetails.roomNumber ? `Room Service: Room ${locationDetails.roomNumber}` : 'Please set room number')}
                {orderType === 'Website Order' && 'Digital Dine-in Ordering'}
                {orderType === 'Takeaway' && 'Counter Pickup Order'}
              </span>
            </div>

            {orderType === 'QR Table' && (
              <button onClick={() => setShowTableModal(true)} className="text-emerald-700 font-bold underline hover:text-emerald-900">
                Change
              </button>
            )}
            {orderType === 'Room Service' && (
              <button onClick={() => setShowRoomModal(true)} className="text-emerald-700 font-bold underline hover:text-emerald-900">
                Change
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Menu Filters & Search Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search dishes, drinks, or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dietary Toggles */}
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
            <button
              onClick={() => setFilterSpicyOnly(!filterSpicyOnly)}
              className={`px-3 py-2 rounded-lg border transition flex items-center gap-1 ${
                filterSpicyOnly ? 'bg-red-50 border-red-300 text-red-700 font-bold' : 'bg-white border-neutral-300 hover:bg-neutral-100'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-red-500" /> Spicy
            </button>

            <button
              onClick={() => setFilterVegOnly(!filterVegOnly)}
              className={`px-3 py-2 rounded-lg border transition flex items-center gap-1 ${
                filterVegOnly ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold' : 'bg-white border-neutral-300 hover:bg-neutral-100'
              }`}
            >
              <Leaf className="w-3.5 h-3.5 text-emerald-500" /> Vegetarian
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-neutral-200 hide-scrollbar">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeCategory === category
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-neutral-200 text-center text-neutral-500 shadow-xs">
            <UtensilsCrossed className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-neutral-800">No menu items found</h3>
            <p className="text-xs text-neutral-500 mt-1">Try adjusting your category or search keywords.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedItemForModal(item)}
                className="bg-white rounded-2xl overflow-hidden shadow-xs border border-neutral-200 flex flex-col hover:shadow-md transition cursor-pointer group"
              >
                <div className="aspect-[4/3] relative bg-neutral-100 overflow-hidden">
                  <img
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800';
                    }}
                  />
                  
                  <div className="absolute top-3 right-3 bg-neutral-900/90 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-black shadow-xs">
                    {item.price} ETB
                  </div>

                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                      <span className="bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg uppercase">
                        Unavailable
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{item.category}</span>
                      {item.prepTimeMinutes && (
                        <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> ~{item.prepTimeMinutes}m
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-neutral-900 group-hover:text-emerald-700 transition">
                      {item.name}
                    </h3>

                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-between items-center">
                    <div className="flex gap-1.5">
                      {item.isSpicy && <Flame className="w-3.5 h-3.5 text-red-500" />}
                      {item.isVegetarian && <Leaf className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>

                    <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition flex items-center gap-1">
                      View Dish <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button (Bottom Right) */}
      {totalItemCount > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm transition transform active:scale-95 animate-bounce-short"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 bg-neutral-900 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-extrabold border-2 border-emerald-600">
              {totalItemCount}
            </span>
          </div>
          <span>View Cart</span>
          <span className="bg-emerald-800 px-2.5 py-0.5 rounded-lg text-xs font-extrabold">
            {grandTotal} ETB
          </span>
        </button>
      )}

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItemForModal}
        onClose={() => setSelectedItemForModal(null)}
      />

      {/* Cart Drawer */}
      <CartDrawer
        onProceedToCheckout={() => setShowCheckoutModal(true)}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
      />

      {/* QR Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-emerald-600" /> Set Restaurant Table
              </h3>
              <button onClick={() => setShowTableModal(false)} className="p-1 text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Table Number / ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. T-04 or 12"
                  value={tableInput}
                  onChange={(e) => setTableInput(e.target.value)}
                  className="w-full p-2.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  You can find your table number printed on the table QR stand.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTableModal(false)}
                  className="px-3 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                >
                  Confirm Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room Service Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                <Hotel className="w-5 h-5 text-emerald-600" /> Room Service Order
              </h3>
              <button onClick={() => setShowRoomModal(false)} className="p-1 text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Room Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 204"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  className="w-full p-2.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Reservation Code / ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. RES-1092"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  className="w-full p-2.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-3 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                >
                  Set Room Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
