# Woliso Hotel & Resort — Hotel Management System (HMS)

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

An enterprise-grade, full-stack Hotel Management, Room Booking, Event Hall Reservation, and Restaurant Ordering platform built for **Woliso Hotel & Resort** (Woliso, Ethiopia).

---

## 🌟 Key Features

### 🛎️ 1. Guest & Customer Experience
* **Digital Room Booking**: Browse luxury room categories (Standard, Deluxe, Presidential, Executive Suite), filter by amenities and pricing, real-time availability check, and instant reservation generation.
* **Event Hall Reservation**: Request bookings for conference and wedding halls with customizable equipment packages (projectors, sound systems, stage lighting).
* **QR Table & Room Service Ordering**: Scan QR codes at restaurant tables or hotel rooms to order directly from the digital menu with live subtotal, VAT, and service charge calculations.
* **Live Order & Reservation Tracker**: Track food prep status (Pending $\to$ Preparing $\to$ Ready $\to$ Delivered) and room reservation verification via reservation codes.
* **Guest Portal**: Manage personal bookings, food orders, activity history, and submit guest reviews/testimonials.
* **Dynamic CMS Pages**: Fully manageable pages for Home Hero, About Us, Amenities, Nearby Attractions, Special Offers, Photo Gallery, Contact Us, and Hotel Policies.

### 🏢 2. Multi-Department Operations & Staff Portals
* **Admin Dashboard**: Real-time business metrics, revenue charts, occupancy rates, and multi-department analytics powered by Recharts.
* **Reception & Front Desk**: Reception calendar, room allocations, walk-in guest check-ins, guest checkout management, and payment verification queue.
* **Kitchen Display System (KDS)**: Real-time Kanban board for chefs categorized by kitchen stations (Hot Kitchen, Cold Kitchen, Beverage Bar, Bakery).
* **Waiter & Server Console**: Table management grid, active dining orders, instant service requests (call waiter, request bill), and table turnaround.
* **Housekeeping Console**: Room cleanliness state tracking (`Clean`, `Dirty`, `Cleaning`, `Inspection Required`, `Maintenance Required`) with floor/wing filters and maintenance incident reporting.
* **Cashier Terminal**: POS cashier screen with invoice generation, multiple payment gateways (Cash, Telebirr, CBE Birr, Bank Transfer), split bills, and transaction auditing.
* **User & Staff RBAC**: Granular role-based access control protecting all administrative endpoints.

### 🛡️ 3. Security, Auditing & Offline Support
* **PostgreSQL Row-Level Security (RLS)**: Enforced database-level security policies for all 24 entities.
* **Enterprise Audit Logging**: Comprehensive audit trail recording staff actions, status updates, and configuration changes.
* **Progressive Web App (PWA)**: Installable on Android, iOS, Windows, and macOS with service worker offline caching.

---

## 🏗️ Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│     (Vite 6, TypeScript, Tailwind CSS v4, Lucide)     │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
         PostgREST / Auth         Type-Safe ORM
                │                        │
                ▼                        ▼
┌──────────────────────────────┐  ┌──────────────────────┐
│       Supabase Backend       │  │      Prisma ORM      │
│  • PostgreSQL 17 + RLS       │  │  • schema.prisma     │
│  • Supabase Auth & JWT       │  │  • @prisma/client    │
│  • Storage (Receipts/Photos) │  │  • Multi-Schema Auth │
│  • Realtime WebSocket PubSub │  │  • Prisma Studio     │
└──────────────────────────────┘  └──────────────────────┘
```

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript 5.8, Vite 6 |
| **Styling & UI** | Tailwind CSS v4, Lucide React, Framer Motion |
| **Data Visualizations** | Recharts (Revenue, occupancy, order trends) |
| **Backend & Database** | Supabase (PostgreSQL 17 with Row-Level Security) |
| **ORM & Relational Models** | Prisma ORM 6.19 (`schema.prisma` with multiSchema) |
| **Realtime Engine** | Supabase Realtime (WebSocket publications) |
| **PWA Engine** | Vite Plugin PWA, Workbox Service Worker |

---

## 🗄️ Database Models (Prisma & PostgreSQL)

The system is modeled across **24 relational entities** in [`prisma/schema.prisma`](file:///c:/Users/ebawa/Desktop/HMS/Hotel/prisma/schema.prisma):

| Domain | Models |
| :--- | :--- |
| **Auth & Users** | `Profile`, `StaffMember` |
| **Rooms & Lodging** | `RoomCategory`, `Room`, `Booking` |
| **Event Halls** | `Hall`, `HallRequest` |
| **Restaurant & Dining** | `MenuCategory`, `KitchenStation`, `MenuItem`, `RestaurantTable`, `RestaurantOrder`, `ServiceRequest` |
| **Housekeeping & Facilities** | `HousekeepingTask`, `MaintenanceReport`, `HousekeepingLog` |
| **Operational & Marketing** | `Notification`, `AuditLog`, `AppSetting`, `Announcement`, `Testimonial`, `Offer`, `GalleryItem`, `ContactMessage` |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18+ (tested on Node v20 & v26)
* **npm** or **bun**
* **Docker Desktop** (optional, for local Supabase) or a hosted **[Supabase](https://supabase.com)** account

### 1. Clone the Repository
```bash
git clone https://github.com/naolnigatu/Hotel.git
cd Hotel
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local` (and `.env`):
```bash
cp .env.example .env.local
```

Set your Supabase credentials in `.env.local`:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Direct PostgreSQL URL for Prisma ORM
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
```

### 4. Generate Prisma Client
```bash
npm run prisma:generate
```

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Prisma & Database Commands

| Command | Action |
| :--- | :--- |
| `npm run prisma:generate` | Generates type-safe TypeScript Prisma Client from `schema.prisma`. |
| `npm run prisma:push` | Synchronizes the Prisma schema directly with the PostgreSQL database. |
| `npm run prisma:studio` | Launches Prisma Studio GUI at `http://localhost:5555` to browse data. |

---

## 📦 Build & Production

To create an optimized production build:
```bash
npm run build
```

To preview the production bundle locally:
```bash
npm run preview
```

---

## 👥 Default Roles & Credentials

During initial seeding, the following default roles and administrative privileges are established:

* **Administrator**: `naolnigatu2025@gmail.com` (Full administrative rights)
* **Roles Available**:
  * `admin` — Full platform management, analytics, and settings
  * `reception` — Front desk, reservations, check-in/out
  * `kitchen` — Kitchen order display, order statuses
  * `waiter` — Dining floor, tables, order delivery
  * `housekeeping` — Room statuses, cleaning queues, maintenance
  * `cashier` — POS terminal, bill generation, payment verification
  * `guest` — Public guest booking, ordering, and profile

---

## 📄 License
This project is proprietary software developed for Woliso Hotel & Resort. All rights reserved.
