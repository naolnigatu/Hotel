# Woliso Hotel - System Architecture & Implementation Plan

## 1. System Overview
Woliso Hotel requires a robust, scalable, and elegant platform serving guests (hotel booking, event halls, restaurant ordering) and hotel staff (reception, kitchen, waiters, housekeeping, admin). The system is a single-page application (PWA) built with React, Vite, Tailwind CSS, and Firebase, designed to compete with international hotel standards while remaining practical for the Ethiopian hospitality context.

## 2. Roles & Permissions
- **Admin**: Full access to all dashboards, reporting, CMS, business rules configuration, and user management.
- **Receptionist**: Manages room and hall bookings, check-ins/check-outs, payment verification, and the reception calendar.
- **Kitchen (Chef)**: Real-time view of restaurant and room service orders. Can update order status (Pending -> Preparing -> Ready).
- **Waiter**: Manages table orders, delivers food, and handles restaurant payments.
- **Housekeeping**: Views room status and updates condition (Dirty, Cleaning, Clean, Inspection Required, Maintenance Required).
- **Guest / Customer**: Can book rooms/halls, order food, view history, save profiles, and receive notifications. (Supports both Registered and Guest checkouts).

## 3. Core Modules & Pages
### Public / Guest Facing
- `*` **Home**: Hero section, featured rooms, amenities, location (CMS Driven).
- `/rooms`: Room listing, filters, details.
- `/halls`: Event hall listing, capacities, equipment, booking.
- `/book`: Booking flow (dates, selection, guest/registered checkout).
- `/restaurant`: Digital menu, category filters, ordering.
- `/order/table/:tableId`: QR code table ordering system.
- `/order/room/:roomId`: Room service ordering (requires guest verification).
- `/guest/dashboard`: My bookings, my orders, saved profiles, receipts, notifications.

### Staff / Admin Dashboards (`/admin/*`)
- `/admin/dashboard`: Revenue, occupancy, trends, and staff performance analytics.
- `/admin/reception`: Reception Calendar (arrivals, departures, current guests), booking queue, payment verification.
- `/admin/halls`: Hall management and reservation approval.
- `/admin/kitchen`: Real-time Kanban board for food orders.
- `/admin/waiter`: Table statuses, serving queue.
- `/admin/housekeeping`: Grid of rooms with granular cleaning statuses.
- `/admin/rooms`: CRUD for rooms, categories, maintenance mode, dynamic pricing.
- `/admin/menu`: CRUD for restaurant menu items.
- `/admin/tables`: QR Table management.
- `/admin/cms`: Website content management (Hero, About, Contact, Policies).
- `/admin/settings`: Configurable business rules (Payment methods, taxes, statuses).

## 4. Firestore Schema (Future-Proof & Modular)

### `users`
- `uid` (string, document ID)
- `email` (string)
- `name` (string)
- `role` (enum: 'admin', 'reception', 'kitchen', 'waiter', 'housekeeping', 'guest')
- `phone` (string)
- `preferences` (map)
- `createdAt` (timestamp)

### `settings` (Configurable Business Rules & CMS)
- `id` (string: 'payment_methods', 'hotel_info', 'booking_policies', 'cms_home', etc.)
- `data` (map: flexible configuration data)

### `rooms` & `room_categories`
- **Categories**: `id`, `name`, `description`, `basePrice`, `amenities`, `imageUrls`
- **Rooms**: `id`, `categoryId`, `roomNumber`, `condition` (enum: 'Clean', 'Dirty', 'Cleaning', 'Inspection Required', 'Maintenance Required'), `status` (enum: 'Available', 'Reserved', 'Occupied', 'Out of Service', 'Blocked')

### `halls`
- `id` (string)
- `name`, `capacity`, `description`, `price`, `equipment` (array), `imageUrls` (array)
- `status` (boolean)

### `bookings` (Rooms & Halls)
- `id` (string)
- `type` (enum: 'room', 'hall')
- `guestId` (string, ref `users` or null for guest checkout)
- `guestDetails` (map: name, email, phone)
- `resourceId` (string, ref `rooms` or `halls`)
- `checkIn`, `checkOut` (timestamp)
- `status` (enum: 'Draft', 'Pending', 'Deposit Pending', 'Awaiting Payment Verification', 'Approved', 'Rejected', 'Checked In', 'Checked Out', 'Cancelled', 'No Show', 'Refunded')
- `totalAmount` (number)
- `paymentMethod` (string, from settings)
- `paymentProofUrl` (string, optional)

### `tables`
- `id` (string)
- `tableNumber` (string)
- `area` (string)
- `capacity` (number)
- `qrCodeUrl` (string)
- `status` (string)

### `menu_items`
- `id`, `category`, `name`, `description`, `price`, `imageUrl`, `isAvailable`

### `orders`
- `id` (string)
- `type` (enum: 'Dine-In', 'QR Table', 'Room Service', 'Website Order', 'Takeaway', 'Delivery')
- `locationRef` (string: table ID or room ID)
- `items` (array)
- `totalAmount` (number)
- `status` (enum: 'Pending', 'Preparing', 'Ready', 'Delivered', 'Paid', 'Cancelled')
- `createdAt` (timestamp)

## 5. Implementation Roadmap

### Phase 1: Foundation & Architecture (Current)
- Initialize project structure, types, and Firebase services.
- Establish role-based routing and authentication.
- Set up global state/context for Auth and Settings.
- Write initial Firestore security rules.

### Phase 2: CMS & Public Website
- Implement dynamic fetching of website content from `settings`.
- Build Landing, About, Contact, and Hall informational pages.

### Phase 3: Advanced Booking & Payment Workflow
- Build Room/Hall listing and Date picker availability engine.
- Implement Guest vs Registered checkout flows.
- Build Reception Dashboard with Calendar view.
- Implement Payment Verification workflow (proof upload, approval).

### Phase 4: Omnichannel Restaurant System
- Implement Table Management and QR generation.
- Build Menu and Shopping Cart.
- Create real-time Kitchen and Waiter dashboards.
- Support Room Service verification.

### Phase 5: Operations & Analytics
- Build Housekeeping matrix.
- Implement Admin Analytics Dashboard.
- Integrate Firebase Cloud Messaging (FCM) for notifications.
- Polish animations, responsiveness, and PWA capabilities.
