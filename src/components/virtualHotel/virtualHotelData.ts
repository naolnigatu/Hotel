export interface HotelArea {
  id: string;
  name: string;
  category: string;
  cameraPos: [number, number, number];
  targetPos: [number, number, number];
  hotspotPos: [number, number, number];
  hotspotTitle: string;
  hotspotBadge: string;
  description: string;
  capabilities: string[];
  ctaText: string;
  ctaLink: string;
  accentColor: string;
}

export const HOTEL_AREAS: HotelArea[] = [
  {
    id: 'reception',
    name: 'Entrance & Grand Reception',
    category: 'Front Desk & Guest Welcome',
    cameraPos: [0, 2.2, 7],
    targetPos: [0, 1.6, -1],
    hotspotPos: [0, 1.8, -0.8],
    hotspotTitle: 'Front Desk & Cloud PMS Terminal',
    hotspotBadge: 'PMS Core Module',
    description: 'Welcome to Woliso Grand Hotel. The reception desk is powered by DigiMenu Cloud PMS with instant 38-second walk-in registration, digital keycards, and live room status matrix.',
    capabilities: [
      'Instant Guest Check-In & Walk-In Registration',
      'Live Room Allocation Matrix with Clean/Dirty status',
      'Automated Guest Folio & Digital Welcome Messaging',
      'Multi-Currency & Local Mobile Payment (telebirr) support'
    ],
    ctaText: 'Launch Front Desk Portal',
    ctaLink: '/dashboard',
    accentColor: '#38bdf8'
  },
  {
    id: 'suite',
    name: 'Deluxe King Suite (Room 304)',
    category: 'Luxury Accommodations',
    cameraPos: [-18, 2.2, 5],
    targetPos: [-18, 1.6, -2],
    hotspotPos: [-18, 1.7, -1.8],
    hotspotTitle: 'Suite 304 & In-Room Experience',
    hotspotBadge: 'Direct Booking Engine',
    description: 'Experience authentic Ethiopian luxury. Handcrafted mahogany furniture, panoramic mountain balcony, plush orthopedic king bed, and private marble jacuzzi bathroom.',
    capabilities: [
      'Direct Guest Online Booking with 0% OTA Commission',
      'Live Availability & Instant Rate Calculation (3,500 ETB / night)',
      'Digital Room Key & QR Check-In Pass',
      'Automated Housekeeping Status Sync on Departure'
    ],
    ctaText: 'Book This Suite (3,500 ETB)',
    ctaLink: '/book',
    accentColor: '#10b981'
  },
  {
    id: 'restaurant',
    name: 'The Abba Gada Restaurant',
    category: 'Fine Dining & Hospitality',
    cameraPos: [18, 2.2, 5],
    targetPos: [18, 1.6, -2],
    hotspotPos: [18, 1.7, -1.5],
    hotspotTitle: 'Dining Floor & Waiter POS',
    hotspotBadge: 'Dining POS System',
    description: 'Experience gourmet dining blending rich traditional Ethiopian dishes with continental specialties. Waiters take table orders on mobile tablets that route directly to the kitchen.',
    capabilities: [
      'Interactive Digital Table Mapping (Terrace, VIP & Main Hall)',
      'Mobile Waiter Ordering with instant station dispatch',
      'One-Click "Charge to Room Folio" with guest verification',
      'Split Billing, Digital Receipts & Daily F&B sales reconciliation'
    ],
    ctaText: 'Explore Restaurant Menu',
    ctaLink: '/restaurant',
    accentColor: '#f59e0b'
  },
  {
    id: 'cafe',
    name: 'Woliso Coffee Bar & Bakery',
    category: 'Artisan Café & Barista Station',
    cameraPos: [18, 2.2, 23],
    targetPos: [18, 1.6, 16],
    hotspotPos: [18, 1.8, 16.5],
    hotspotTitle: 'Artisan Barista Station & Quick POS',
    hotspotBadge: 'High-Velocity Counter POS',
    description: 'Freshly roasted Ethiopian single-origin coffees, handcrafted espresso drinks, and fresh morning pastries. High-velocity counter POS optimized for 15-second customer checkouts.',
    capabilities: [
      'Quick-Tap Beverage & Pastry POS with barcode/QR scanning',
      'Real-Time Inventory Tracking for coffee beans & ingredients',
      'Integrated Cashier Drawer balancing and shift change reports',
      'Takeaway QR codes and contactless mobile payments'
    ],
    ctaText: 'View Café & Breakfast Menu',
    ctaLink: '/restaurant',
    accentColor: '#ec4899'
  },
  {
    id: 'kitchen',
    name: 'Master Kitchen & KDS',
    category: 'Commercial Kitchen Operations',
    cameraPos: [18, 2.2, -13],
    targetPos: [18, 1.6, -20],
    hotspotPos: [18, 1.8, -19.5],
    hotspotTitle: 'Kitchen Display System (KDS) Stations',
    hotspotBadge: 'Real-Time KDS',
    description: 'The heartbeat of our culinary operations. Completely paperless kitchen with overhead digital display screens dividing orders by station (Grill, Pastry, Beverage Bar) with live timers.',
    capabilities: [
      'Zero paper ticket waste: 100% digital station routing',
      'Live cooking timers with color-coded delay warnings',
      'Single-tap ticket completion alerts waiters on the floor',
      'Chef recipe specs & ingredient allergen flags on screen'
    ],
    ctaText: 'View Kitchen Display Module',
    ctaLink: '/dashboard',
    accentColor: '#ef4444'
  },
  {
    id: 'lounge',
    name: 'Executive Boardroom & Analytics Hub',
    category: 'Management & Financial Intelligence',
    cameraPos: [-18, 2.2, 23],
    targetPos: [-18, 1.6, 16],
    hotspotPos: [-18, 1.8, 16.5],
    hotspotTitle: 'Executive Intelligence & Night Audit',
    hotspotBadge: 'Analytics & Security',
    description: 'Executive conference boardroom and operational management hub. Monitor real-time property KPIs: Occupancy rates, Average Daily Rate (ADR), RevPAR, and automated end-of-day night audit.',
    capabilities: [
      'Real-time RevPAR, ADR & Revenue breakdown by department',
      'Automated Night Audit closing out daily ledger and cash drawers',
      'Immutable cryptographic audit trails with IP & device tracking',
      'Multi-Role Row-Level Security (RLS) across 8 staff tiers'
    ],
    ctaText: 'Access Executive Reports',
    ctaLink: '/dashboard',
    accentColor: '#8b5cf6'
  }
];
