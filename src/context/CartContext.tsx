import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { MenuItem, OrderType, OrderItem, RestaurantSettings, BankDetail } from '../types';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface CartItem {
  item: MenuItem;
  quantity: number;
  notes?: string;
  selected?: boolean;
}

export interface LocationDetails {
  tableNumber: string;
  tableId: string;
  roomNumber: string;
  reservationCode: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  orderNotes: string;
  paymentMethod: string;
}

interface CartContextType {
  cartItems: CartItem[];
  selectedItemIds: string[];
  selectedCartItems: CartItem[];
  orderType: OrderType;
  locationDetails: LocationDetails;
  isCartOpen: boolean;
  
  // Settings
  restaurantSettings: RestaurantSettings;

  // Tax and rates
  vatRate: number; // 15%
  serviceChargeRate: number; // 5%
  roomServiceFee: number; // 50 ETB

  // Calculations (based on selected items, or all if none unselected)
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  applicableRoomServiceFee: number;
  grandTotal: number;
  totalItemCount: number;
  selectedItemCount: number;

  // Actions
  setIsCartOpen: (open: boolean) => void;
  setOrderType: (type: OrderType) => void;
  addToCart: (item: MenuItem, quantity?: number, notes?: string, openDrawer?: boolean) => void;
  quickAddToCart: (item: MenuItem) => void;
  toggleSelectItem: (itemId: string) => void;
  selectAllItems: () => void;
  deselectAllItems: () => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateItemNotes: (itemId: string, notes: string) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  clearSelectedItems: () => void;
  
  setLocationDetails: (details: Partial<LocationDetails>) => void;
  resetLocationDetails: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'woliso_restaurant_cart';
const MODE_STORAGE_KEY = 'woliso_restaurant_mode';
const LOCATION_STORAGE_KEY = 'woliso_restaurant_location';

const DEFAULT_SETTINGS: RestaurantSettings = {
  vatRate: 15,
  serviceChargeRate: 5,
  roomServiceFee: 50,
  minimumOrderAmount: 0,
  isRestaurantOpen: true,
  operatingHours: '6:00 AM - 11:00 PM',
  acceptedPaymentMethods: ['Cash', 'Pay at Counter', 'POS', 'Bank Transfer', 'Room Charge'],
  bankDetails: [
    {
      id: 'cbe',
      bankName: 'Commercial Bank of Ethiopia (CBE)',
      accountName: 'Woliso Hotel Plc',
      accountNumber: '1000 1234 5678 9'
    },
    {
      id: 'telebirr',
      bankName: 'Telebirr',
      accountName: 'Woliso Hotel Plc',
      accountNumber: '789012',
      shortCode: '789012'
    }
  ]
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_settings', 'restaurant'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRestaurantSettings(prev => ({
          ...prev,
          ...data
        }));
      }
    }, (error) => {
      console.error("Error fetching restaurant settings:", error);
    });
    return () => unsub();
  }, []);

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [orderType, setOrderTypeState] = useState<OrderType>(() => {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY);
      return (saved as OrderType) || 'Website Order';
    } catch {
      return 'Website Order';
    }
  });

  const [locationDetails, setLocationDetailsState] = useState<LocationDetails>(() => {
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      tableNumber: '',
      tableId: '',
      roomNumber: '',
      reservationCode: '',
      guestName: '',
      guestPhone: '',
      guestEmail: '',
      orderNotes: '',
      paymentMethod: 'Pay at Counter'
    };
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() => {
    return cartItems.map(i => i.item.id);
  });

  // Keep selected items synchronized when cart items change
  useEffect(() => {
    setSelectedItemIds(prev => {
      const currentIds = cartItems.map(i => i.item.id);
      // Keep existing valid selections, plus new items default to selected
      const retained = prev.filter(id => currentIds.includes(id));
      const newlyAdded = currentIds.filter(id => !prev.includes(id));
      return [...retained, ...newlyAdded];
    });
  }, [cartItems.length]);

  // Selected Cart Items (items that are currently checked)
  const selectedCartItems = useMemo(() => {
    if (selectedItemIds.length === 0) return [];
    return cartItems.filter(i => selectedItemIds.includes(i.item.id));
  }, [cartItems, selectedItemIds]);

  // Default Tax Rates (from settings)
  const vatRate = restaurantSettings.vatRate;
  const serviceChargeRate = restaurantSettings.serviceChargeRate;
  const roomServiceFee = restaurantSettings.roomServiceFee;

  // Save Cart to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
  }, [cartItems]);

  // Save Order Mode to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(MODE_STORAGE_KEY, orderType);
    } catch (e) {
      console.error('Failed to save order mode:', e);
    }
  }, [orderType]);

  // Save Location Details
  useEffect(() => {
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationDetails));
    } catch (e) {
      console.error('Failed to save location details:', e);
    }
  }, [locationDetails]);

  // Calculations based on active selected items (or all if none deselected)
  const subtotal = useMemo(() => {
    const targetItems = selectedCartItems.length > 0 ? selectedCartItems : cartItems;
    return targetItems.reduce((sum, item) => sum + item.item.price * item.quantity, 0);
  }, [selectedCartItems, cartItems]);

  const taxAmount = useMemo(() => {
    return Math.round(subtotal * (vatRate / 100));
  }, [subtotal, vatRate]);

  const serviceChargeAmount = useMemo(() => {
    return Math.round(subtotal * (serviceChargeRate / 100));
  }, [subtotal, serviceChargeRate]);

  const applicableRoomServiceFee = useMemo(() => {
    return orderType === 'Room Service' ? roomServiceFee : 0;
  }, [orderType, roomServiceFee]);

  const grandTotal = useMemo(() => {
    return subtotal + taxAmount + serviceChargeAmount + applicableRoomServiceFee;
  }, [subtotal, taxAmount, serviceChargeAmount, applicableRoomServiceFee]);

  const totalItemCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const selectedItemCount = useMemo(() => {
    return selectedCartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedCartItems]);

  // Actions
  const setOrderType = (type: OrderType) => {
    setOrderTypeState(type);
    if (type === 'Room Service' && locationDetails.paymentMethod === 'Pay at Counter') {
      setLocationDetailsState(prev => ({ ...prev, paymentMethod: 'Room Charge' }));
    }
  };

  const addToCart = (item: MenuItem, quantity: number = 1, notes?: string, openDrawer: boolean = true) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(i => i.item.id === item.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
          notes: notes !== undefined ? notes : updated[existingIndex].notes
        };
        return updated;
      } else {
        return [...prev, { item, quantity, notes, selected: true }];
      }
    });

    setSelectedItemIds(prev => prev.includes(item.id) ? prev : [...prev, item.id]);

    if (openDrawer) {
      setIsCartOpen(true);
    }
  };

  const quickAddToCart = (item: MenuItem) => {
    addToCart(item, 1, undefined, false);
  };

  const toggleSelectItem = (itemId: string) => {
    setSelectedItemIds(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const selectAllItems = () => {
    setSelectedItemIds(cartItems.map(i => i.item.id));
  };

  const deselectAllItems = () => {
    setSelectedItemIds([]);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCartItems(prev => prev.map(i => i.item.id === itemId ? { ...i, quantity } : i));
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCartItems(prev => prev.map(i => i.item.id === itemId ? { ...i, notes } : i));
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(i => i.item.id !== itemId));
    setSelectedItemIds(prev => prev.filter(id => id !== itemId));
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedItemIds([]);
  };

  const clearSelectedItems = () => {
    setCartItems(prev => prev.filter(i => !selectedItemIds.includes(i.item.id)));
    setSelectedItemIds([]);
  };

  const setLocationDetails = (details: Partial<LocationDetails>) => {
    setLocationDetailsState(prev => ({ ...prev, ...details }));
  };

  const resetLocationDetails = () => {
    setLocationDetailsState({
      tableNumber: '',
      tableId: '',
      roomNumber: '',
      reservationCode: '',
      guestName: '',
      guestPhone: '',
      guestEmail: '',
      orderNotes: '',
      paymentMethod: 'Pay at Counter'
    });
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      selectedItemIds,
      selectedCartItems,
      orderType,
      locationDetails,
      isCartOpen,
      restaurantSettings,
      vatRate,
      serviceChargeRate,
      roomServiceFee,
      subtotal,
      taxAmount,
      serviceChargeAmount,
      applicableRoomServiceFee,
      grandTotal,
      totalItemCount,
      selectedItemCount,
      setIsCartOpen,
      setOrderType,
      addToCart,
      quickAddToCart,
      toggleSelectItem,
      selectAllItems,
      deselectAllItems,
      updateQuantity,
      updateItemNotes,
      removeFromCart,
      clearCart,
      clearSelectedItems,
      setLocationDetails,
      resetLocationDetails
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
