export interface RecentOrder {
  id: string;
  orderNumber: string;
  type: string;
  locationRef?: string;
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  status?: string;
  itemsCount?: number;
  itemsSummary?: string;
  createdAt: number;
}

export interface RecentReservation {
  code: string;
  id: string;
  categoryName?: string;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  checkIn?: number;
  checkOut?: number;
  numberOfGuests?: number;
  totalAmount?: number;
  status?: string;
  createdAt: number;
}

const ORDERS_KEY = 'woliso_recent_orders';
const RESERVATIONS_KEY = 'woliso_recent_reservations';

export function getRecentOrders(): RecentOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed: RecentOrder[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) : [];
  } catch (e) {
    console.error('Failed to read recent orders:', e);
    return [];
  }
}

export function saveRecentOrder(order: RecentOrder): void {
  try {
    const current = getRecentOrders();
    const filtered = current.filter(o => o.id !== order.id && o.orderNumber !== order.orderNumber);
    const updated = [order, ...filtered].slice(0, 15);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save recent order:', e);
  }
}

export function updateRecentOrderStatus(orderId: string, status: string, orderNumber?: string): void {
  try {
    const current = getRecentOrders();
    const updated = current.map(o => {
      if (o.id === orderId || (orderNumber && o.orderNumber === orderNumber)) {
        return { ...o, status };
      }
      return o;
    });
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update recent order status:', e);
  }
}

export function removeRecentOrder(id: string): void {
  try {
    const current = getRecentOrders();
    const updated = current.filter(o => o.id !== id && o.orderNumber !== id);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to remove recent order:', e);
  }
}

export function getRecentReservations(): RecentReservation[] {
  try {
    const raw = localStorage.getItem(RESERVATIONS_KEY);
    if (!raw) return [];
    const parsed: RecentReservation[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) : [];
  } catch (e) {
    console.error('Failed to read recent reservations:', e);
    return [];
  }
}

export function saveRecentReservation(res: RecentReservation): void {
  try {
    const current = getRecentReservations();
    const filtered = current.filter(r => r.code !== res.code && r.id !== res.id);
    const updated = [res, ...filtered].slice(0, 15);
    localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save recent reservation:', e);
  }
}

export function updateRecentReservationStatus(codeOrId: string, status: string): void {
  try {
    const current = getRecentReservations();
    const updated = current.map(r => {
      if (r.code === codeOrId || r.id === codeOrId) {
        return { ...r, status };
      }
      return r;
    });
    localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update recent reservation status:', e);
  }
}

export function removeRecentReservation(codeOrId: string): void {
  try {
    const current = getRecentReservations();
    const updated = current.filter(r => r.code !== codeOrId && r.id !== codeOrId);
    localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to remove recent reservation:', e);
  }
}
