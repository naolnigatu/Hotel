/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AdminLayout from './components/admin/AdminLayout';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Gallery from './pages/Gallery';
import Amenities from './pages/Amenities';
import Attractions from './pages/Attractions';
import Offers from './pages/Offers';
import Halls from './pages/Halls';
import Rooms from './pages/Rooms';
import Book from './pages/Book';
import Restaurant from './pages/Restaurant';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import AdminDashboardIndex from './pages/admin/AdminDashboardIndex';
import AdminCmsHome from './pages/admin/AdminCmsHome';
import AdminCmsAbout from './pages/admin/AdminCmsAbout';
import AdminCmsContact from './pages/admin/AdminCmsContact';
import AdminCmsFooter from './pages/admin/AdminCmsFooter';
import AdminCmsGallery from './pages/admin/AdminCmsGallery';
import AdminCmsPolicies from './pages/admin/AdminCmsPolicies';
import AdminCmsAmenities from './pages/admin/AdminCmsAmenities';
import AdminCmsAttractions from './pages/admin/AdminCmsAttractions';
import AdminCmsOffers from './pages/admin/AdminCmsOffers';
import AdminRooms from './pages/admin/AdminRooms';
import AdminRoomInventory from './pages/admin/AdminRoomInventory';
import AdminReservations from './pages/admin/AdminReservations';
import HousekeepingDashboard from './pages/admin/HousekeepingDashboard';
import AdminHalls from './pages/admin/AdminHalls';
import AdminMenu from './pages/admin/AdminMenu';
import KitchenDashboard from './pages/admin/KitchenDashboard';
import WaiterDashboard from './pages/admin/WaiterDashboard';
import AdminRestaurantSettings from './pages/admin/AdminRestaurantSettings';
import AdminTables from './pages/admin/AdminTables';
import AdminKitchenStations from './pages/admin/AdminKitchenStations';
import AdminStaff from './pages/admin/AdminStaff';
import AdminHotelSettings from './pages/admin/AdminHotelSettings';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import OrderTracker from './pages/OrderTracker';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="amenities" element={<Amenities />} />
              <Route path="attractions" element={<Attractions />} />
              <Route path="offers" element={<Offers />} />
              <Route path="halls" element={<Halls />} />
              <Route path="rooms" element={<Rooms />} />
              <Route path="book" element={<Book />} />
              <Route path="restaurant" element={<Restaurant />} />
              <Route path="restaurant/track" element={<OrderTracker />} />
              <Route path="restaurant/track/:orderId" element={<OrderTracker />} />
              <Route path="privacy" element={<PrivacyPolicy />} />
              <Route path="terms" element={<TermsConditions />} />
              <Route path="login" element={<Login />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardIndex />} />
              <Route path="cms/home" element={<AdminCmsHome />} />
              <Route path="cms/about" element={<AdminCmsAbout />} />
              <Route path="cms/contact" element={<AdminCmsContact />} />
              <Route path="cms/footer" element={<AdminCmsFooter />} />
              <Route path="cms/gallery" element={<AdminCmsGallery />} />
              <Route path="cms/amenities" element={<AdminCmsAmenities />} />
              <Route path="cms/attractions" element={<AdminCmsAttractions />} />
              <Route path="cms/offers" element={<AdminCmsOffers />} />
              <Route path="cms/policies" element={<AdminCmsPolicies />} />
              <Route path="rooms" element={<AdminRooms />} />
              <Route path="room-inventory" element={<AdminRoomInventory />} />
              <Route path="reservations" element={<AdminReservations />} />
              <Route path="housekeeping" element={<HousekeepingDashboard />} />
              <Route path="waiter" element={<WaiterDashboard />} />
              <Route path="halls" element={<AdminHalls />} />
              <Route path="kitchen" element={<KitchenDashboard />} />
              <Route path="menu" element={<AdminMenu />} />
              <Route path="tables" element={<AdminTables />} />
              <Route path="stations" element={<AdminKitchenStations />} />
              <Route path="restaurant-settings" element={<AdminRestaurantSettings />} />
              <Route path="staff" element={<AdminStaff />} />
              <Route path="settings" element={<AdminHotelSettings />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
