export type Role = 'admin' | 'reception' | 'kitchen' | 'waiter' | 'housekeeping' | 'cashier' | 'guest';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  preferences?: Record<string, any>;
  createdAt: number;
}

// Rooms
export type RoomCondition = 
  | 'Clean' 
  | 'Ready' 
  | 'Dirty' 
  | 'Needs Cleaning' 
  | 'Cleaning In Progress' 
  | 'Cleaning' 
  | 'Awaiting Inspection' 
  | 'Inspection Required' 
  | 'Maintenance Required' 
  | 'Out of Service' 
  | 'Occupied';

export type RoomStatus = 'Available' | 'Reserved' | 'Occupied' | 'Out of Service' | 'Blocked';

export interface RoomCategory {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  amenities: string[];
  imageUrls: string[];
}

export interface Room {
  id: string;
  categoryId: string;
  roomNumber: string;
  condition: RoomCondition;
  status: RoomStatus;
  floor?: string;
  wing?: string;
  notes?: string;
}

// Housekeeping & Maintenance
export type HousekeepingPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type HousekeepingTaskStatus = 'Pending' | 'In Progress' | 'Paused' | 'Awaiting Inspection' | 'Completed' | 'Cancelled';

export interface HousekeepingTask {
  id: string;
  roomId: string;
  roomNumber: string;
  floor?: string;
  wing?: string;
  priority: HousekeepingPriority;
  status: HousekeepingTaskStatus;
  assignedToId?: string;
  assignedToName?: string;
  requestedBy?: string; // e.g. "Guest Checkout", "Reception Request", "Daily Cleaning"
  estimatedMinutes?: number;
  startedAt?: number;
  completedAt?: number;
  notes?: string;
  photos?: string[];
  createdAt: number;
  updatedAt: number;
}

export type MaintenanceCategory = 'Plumbing' | 'Electrical' | 'Furniture' | 'Air Conditioning' | 'Television' | 'Internet' | 'Bathroom' | 'Other';
export type MaintenancePriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type MaintenanceStatus = 'Open' | 'In Progress' | 'Resolved' | 'Cancelled';

export interface MaintenanceReport {
  id: string;
  roomId: string;
  roomNumber: string;
  categoryId?: string;
  category: MaintenanceCategory;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  photos?: string[];
  reportedByUid: string;
  reportedByName: string;
  assignedToUid?: string;
  assignedToName?: string;
  resolutionNotes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface HousekeepingLog {
  id: string;
  roomId: string;
  roomNumber: string;
  staffUid: string;
  staffName: string;
  action: string; // e.g. 'Started Cleaning', 'Paused Cleaning', 'Marked Cleaned', 'Inspection Approved', 'Inspection Rejected', 'Reported Maintenance'
  previousStatus: string;
  newStatus: string;
  notes?: string;
  timestamp: number;
}

// Halls
export interface Hall {
  id: string;
  name: string;
  capacity: number;
  description: string;
  price: number;
  equipment: string[];
  imageUrls: string[];
  status: boolean; // active/inactive
}

export interface HallBookingRequest {
  id: string;
  reservationCode: string; // e.g. WH-H78X9A
  hallId: string;
  hallName: string;
  eventType: string; // e.g. 'Meeting / Conference', 'Wedding', 'Workshop', 'Party', 'Other'
  organizerName: string;
  email: string;
  phone: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  timeSlot?: 'Full Day' | 'Morning' | 'Afternoon' | 'Evening' | 'Custom';
  numberOfGuests: number;
  requestedEquipment?: string[];
  message?: string;
  totalEstimatedPrice: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Confirmed';
  adminNotes?: string;
  guestId?: string | null;
  createdAt: number;
  updatedAt?: number;
}

// Bookings
export type BookingType = 'room' | 'hall';
export type BookingStatus = 'Draft' | 'Pending' | 'Deposit Pending' | 'Awaiting Payment Verification' | 'Approved' | 'Rejected' | 'Checked In' | 'Checked Out' | 'Cancelled' | 'No Show' | 'Refunded';

export interface ReservationTimelineEvent {
  status: BookingStatus | 'Created' | 'Payment Proof Uploaded' | 'Payment Verified' | 'Room Assigned' | 'Room Reassigned' | 'Guest Checked In' | 'Guest Checked Out' | 'Cancelled' | 'No Show' | 'Note Added';
  timestamp: number;
  userId?: string;
  userName?: string;
  notes?: string;
}

export interface ReservationNote {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
}

export interface Booking {
  id: string;
  reservationCode: string; // e.g. WH-AB7F4X
  type: BookingType;
  guestId: string | null; // null for guest checkout
  guestDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  categoryId: string; // Room category or Hall ID
  hallName?: string;
  eventType?: string;
  roomId?: string; // Assigned room number (for rooms)
  numberOfGuests: number;
  specialRequests?: string;
  requestedEquipment?: string[];
  isVip?: boolean;
  bookingSource?: 'Online' | 'Walk-in' | 'Phone' | 'Government/VIP';
  checkIn: number; // Timestamp (midnight of check-in date)
  checkOut: number; // Timestamp (midnight of check-out date)
  status: BookingStatus;
  totalAmount: number;
  paymentMethod: string; // 'Pay at Hotel', 'Bank Transfer', 'Cash', 'POS', 'Credit Card'
  paymentProofUrl?: string;
  transactionId?: string;
  paymentRejectionReason?: string;
  timeline: ReservationTimelineEvent[];
  notes?: ReservationNote[];
  createdAt: number;
  updatedAt: number;
}

// Restaurant & Tables
export interface Table {
  id: string;
  tableNumber: string;
  area: string;
  capacity: number;
  qrCodeUrl?: string;
  status: 'Available' | 'Occupied' | 'Reserved';
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt?: number;
}

export interface MenuItem {
  id: string;
  category: string;
  categoryId?: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  ingredients?: string[];
  allergens?: string[];
  prepTimeMinutes?: number;
  isSpicy?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
  calories?: number;
  kitchenStationId?: string;
  kitchenStationName?: string;
}

export type OrderType = 'Dine-In' | 'QR Menu/Dine in' | 'Room Service' | 'Book Meal' | 'Takeaway' | 'Delivery';

export type OrderStatus = 
  | 'Order Submitted' 
  | 'Kitchen Received' 
  | 'Preparing' 
  | 'Ready' 
  | 'Delivered' 
  | 'Completed' 
  | 'Cancelled'
  // Legacy compatibility
  | 'Pending' 
  | 'Paid';

export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  imageUrl?: string;
  category?: string;
  isSpicy?: boolean;
  isVegetarian?: boolean;
  status?: 'Pending' | 'Preparing' | 'Ready';
  kitchenStationId?: string;
  kitchenStationName?: string;
}

export interface OrderTimelineEvent {
  status: string;
  timestamp: number;
  note?: string;
  updatedBy?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  locationRef: string; // Table number or Room number
  tableId?: string;
  tableNumber?: string;
  roomNumber?: string;
  reservationCode?: string;
  reservationId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  arrivalTime?: string;
  customerUid?: string;
  items: OrderItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  serviceChargeRate: number;
  serviceChargeAmount: number;
  roomServiceFee?: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: 'Pending' | 'Paid' | 'Charged to Room' | 'Pending Verification' | 'Rejected' | 'Failed';
  paymentProofUrl?: string;
  transactionId?: string;
  paymentRejectionReason?: string;
  status: OrderStatus;
  orderNotes?: string;
  kitchenNotes?: string;
  priority?: 'Normal' | 'High' | 'Urgent';
  assignedWaiterId?: string;
  assignedWaiterName?: string;
  waiterNotes?: string;
  timeline: OrderTimelineEvent[];
  createdAt: number;
  updatedAt: number;
}

export type ServiceRequestType = 'Call Waiter' | 'Bill Request' | 'Clean Table' | 'Other';
export type ServiceRequestStatus = 'Pending' | 'In Progress' | 'Completed';

export interface ServiceRequest {
  id: string;
  type: ServiceRequestType;
  locationRef: string; // Table number or Room number
  tableId?: string;
  tableNumber?: string;
  roomNumber?: string;
  status: ServiceRequestStatus;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BankDetail {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  shortCode?: string;
}

export interface RestaurantSettings {
  vatRate: number; // e.g., 15%
  serviceChargeRate: number; // e.g., 5%
  roomServiceFee: number; // e.g., 50 ETB
  minimumOrderAmount?: number;
  isRestaurantOpen: boolean;
  operatingHours: string;
  acceptedPaymentMethods: string[];
  bankDetails?: BankDetail[];
  telebirrNo?: string;
  telebirrAccountName?: string;
  cbeBirrNo?: string;
  cbeBirrAccountName?: string;
  kitchenStations?: string[];
}

// Configurable Settings
export interface AppSetting {
  id: string;
  data: Record<string, any>;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
}

export interface Statistic {
  id: string;
  label: string;
  value: string;
}

export interface CmsHome {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  heroVideoUrl?: string;
  heroPrimaryButtonText: string;
  heroPrimaryButtonLink: string;
  featuredSectionTitle: string;
  featuredSectionSubtitle: string;
  roomsSectionTitle?: string;
  roomsSectionSubtitle?: string;
  hallsSectionTitle?: string;
  hallsSectionSubtitle?: string;
  restaurantSectionTitle?: string;
  restaurantSectionSubtitle?: string;
  testimonialsTitle: string;
  testimonialsSubtitle: string;
  testimonials: Testimonial[];
  statistics: Statistic[];
  mapEmbedUrl: string;
}

export interface CmsAbout {
  story: string;
  vision: string;
  mission: string;
  history: string;
  imageUrl: string;
}

export interface CmsFooter {
  copyrightText: string;
  businessHours: string;
}

export interface CmsContact {
  phonePrimary: string;
  phoneSecondary: string;
  emailPrimary: string;
  emailSecondary: string;
  address: string;
  googleMapsUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
}

export interface CmsAmenity {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface CmsAttraction {
  id: string;
  title: string;
  description: string;
  distance: string;
  imageUrl: string;
  googleMapsUrl: string;
}

export interface CmsOffer {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  bannerUrl: string;
  active: boolean;
}

export type AnnouncementCategory = 
  | 'General' 
  | 'Event' 
  | 'Dining & Bar' 
  | 'Maintenance' 
  | 'Special Notice' 
  | 'Facility & Amenities' 
  | 'Seasonal Celebration';

export interface Announcement {
  id: string;
  title: string;
  paragraph: string;
  imageUrl?: string;
  imageCaption?: string;
  category: AnnouncementCategory;
  isPublished: boolean;
  isPinned: boolean;
  badge?: string;
  publishedBy: string;
  publishedByRole?: Role;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
}

export interface GalleryImage {
  id: string;
  url: string;
  category: string;
  caption?: string;
  createdAt: number;
}

export interface KitchenStation {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  assignedStaffIds?: string[];
}

export interface StaffMember {
  id: string;
  uid?: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  isActive: boolean;
  department?: string;
  createdAt: number;
  updatedAt: number;
}

export interface HotelSettings {
  hotelName: string;
  tagline?: string;
  logoUrl?: string;
  address: string;
  phonePrimary: string;
  phoneSecondary?: string;
  emailPrimary: string;
  emailSecondary?: string;
  googleMapsUrl?: string;
  checkInTime: string;
  checkOutTime: string;
  currency: string;
  currencySymbol: string;
  cancellationPolicy?: string;
  bookingPolicy?: string;
  acceptedPaymentMethods: string[];
  bankDetails?: BankDetail[];
  telebirrNo?: string;
  telebirrAccountName?: string;
  cbeBirrNo?: string;
  cbeBirrAccountName?: string;
  depositEnabled?: boolean;
  depositType?: 'percentage' | 'fixed';
  depositValue?: number;
  depositInstructions?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: string;
  module: 'Restaurant' | 'Tables' | 'Menu' | 'Rooms' | 'Reservations' | 'Staff' | 'Hotel Settings' | 'Stations' | 'Housekeeping' | 'CMS' | 'Cashier' | 'Finance';
  details?: string;
  previousValue?: any;
  newValue?: any;
  timestamp: number;
}

export type NotificationType = 
  | 'reservation' 
  | 'booking'
  | 'payment' 
  | 'order' 
  | 'service_request' 
  | 'housekeeping' 
  | 'maintenance' 
  | 'system';

export type NotificationPriority = 'Normal' | 'Important' | 'Urgent';

export interface AppNotification {
  id: string;
  recipientUid?: string;
  recipientRole?: Role;
  title: string;
  message: string;
  type: NotificationType;
  relatedEntityId?: string;
  relatedEntityType?: 'booking' | 'order' | 'service_request' | 'housekeeping_task' | 'maintenance_report' | 'system';
  targetRoute?: string;
  createdAt: number;
  isRead: boolean;
  priority: NotificationPriority;
  eventId?: string;
  expiresAt?: number;
}

