-- Seed Initial Hotel Settings
insert into public.app_settings (id, data, updated_at)
values
(
  'hotel',
  '{
    "hotelName": "Woliso Hotel",
    "tagline": "Luxury, Comfort & Authentic Ethiopian Hospitality in Woliso",
    "logoUrl": "/logo.png",
    "address": "Woliso Town, Oromia Regional State, Ethiopia",
    "phonePrimary": "+251 11 341 0000",
    "phoneSecondary": "+251 911 000 111",
    "emailPrimary": "info@wolisohotel.com",
    "emailSecondary": "reservations@wolisohotel.com",
    "googleMapsUrl": "https://maps.google.com",
    "checkInTime": "14:00",
    "checkOutTime": "11:00",
    "currency": "ETB",
    "currencySymbol": "ETB",
    "cancellationPolicy": "Free cancellation up to 48 hours before check-in. Cancellations within 48 hours incur a 1-night penalty.",
    "bookingPolicy": "Full payment or advance deposit required upon booking confirmation.",
    "acceptedPaymentMethods": ["Pay at Hotel", "Bank Transfer", "Telebirr", "CBE Birr", "POS", "Cash"],
    "telebirrNo": "0911223344",
    "telebirrAccountName": "Woliso Hotel Enterprise",
    "cbeBirrNo": "100023456789",
    "cbeBirrAccountName": "Woliso Hotel CBE",
    "bankDetails": [
      {
        "id": "bank_1",
        "bankName": "Commercial Bank of Ethiopia (CBE)",
        "accountName": "Woliso Hotel PLC",
        "accountNumber": "1000123456789"
      },
      {
        "id": "bank_2",
        "bankName": "Awash Bank",
        "accountName": "Woliso Hotel PLC",
        "accountNumber": "01320876543200"
      }
    ],
    "depositEnabled": true,
    "depositType": "percentage",
    "depositValue": 30,
    "depositInstructions": "Please transfer 30% advance deposit via Telebirr or CBE Birr and upload receipt to confirm reservation."
  }'::jsonb,
  (extract(epoch from now()) * 1000)::bigint
),
(
  'restaurant',
  '{
    "vatRate": 15,
    "serviceChargeRate": 5,
    "roomServiceFee": 50,
    "minimumOrderAmount": 0,
    "isRestaurantOpen": true,
    "operatingHours": "6:00 AM - 11:00 PM",
    "acceptedPaymentMethods": ["Cash", "POS", "Bank Transfer", "Telebirr", "CBE Birr", "Charge to Room"],
    "telebirrNo": "0911223344",
    "telebirrAccountName": "Woliso Hotel Food & Beverage",
    "cbeBirrNo": "100023456789",
    "cbeBirrAccountName": "Woliso Hotel F&B CBE",
    "bankDetails": [
      {
        "id": "bank_fnb",
        "bankName": "Commercial Bank of Ethiopia",
        "accountName": "Woliso Hotel Dining",
        "accountNumber": "1000987654321"
      }
    ]
  }'::jsonb,
  (extract(epoch from now()) * 1000)::bigint
)
on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at;

-- Seed Room Categories
insert into public.room_categories (id, name, description, base_price, amenities, image_urls, created_at)
values
(
  'cat_deluxe',
  'Deluxe King Room',
  'Spacious room featuring a plush king-size bed, private balcony overlooking landscaped gardens, high-speed Wi-Fi, and rainfall shower.',
  2400,
  array['King Bed', 'Balcony', 'Free High-Speed Wi-Fi', 'Air Conditioning', 'Flat-screen Smart TV', 'Mini Bar', 'Work Desk'],
  array['https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80'],
  (extract(epoch from now()) * 1000)::bigint
),
(
  'cat_suite',
  'Executive Suite',
  'A luxurious two-room suite offering an expansive living room, separate master bedroom, executive work desk, and jacuzzi tub.',
  4200,
  array['Master King Bed', 'Separate Living Room', 'Jacuzzi', 'VIP Amenities', 'Panoramic Views', 'Espresso Machine', '24/7 Room Service'],
  array['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'],
  (extract(epoch from now()) * 1000)::bigint
),
(
  'cat_standard',
  'Standard Twin Room',
  'Comfortable and modern room with two twin beds, en-suite bathroom, and dedicated workspace. Perfect for business travelers or friends.',
  1800,
  array['Twin Beds', 'Free Wi-Fi', 'En-suite Bathroom', 'Coffee/Tea Maker', 'Daily Housekeeping'],
  array['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'],
  (extract(epoch from now()) * 1000)::bigint
)
on conflict (id) do nothing;

-- Seed Physical Rooms
insert into public.rooms (id, category_id, room_number, condition, status, floor, wing, notes)
values
('room_101', 'cat_standard', '101', 'Clean', 'Available', 'Floor 1', 'West Wing', 'Near elevator'),
('room_102', 'cat_standard', '102', 'Clean', 'Available', 'Floor 1', 'West Wing', 'Quiet garden view'),
('room_103', 'cat_standard', '103', 'Clean', 'Available', 'Floor 1', 'West Wing', 'Accessible bathroom'),
('room_201', 'cat_deluxe', '201', 'Clean', 'Available', 'Floor 2', 'East Wing', 'Corner balcony room'),
('room_202', 'cat_deluxe', '202', 'Clean', 'Available', 'Floor 2', 'East Wing', 'Deluxe garden view'),
('room_203', 'cat_deluxe', '203', 'Clean', 'Available', 'Floor 2', 'East Wing', 'Deluxe city view'),
('room_301', 'cat_suite', '301', 'Clean', 'Available', 'Floor 3', 'Executive Wing', 'Executive Suite with terrace'),
('room_302', 'cat_suite', '302', 'Clean', 'Available', 'Floor 3', 'Executive Wing', 'Presidential penthouse suite')
on conflict (id) do nothing;

-- Seed Halls
insert into public.halls (id, name, capacity, description, price, equipment, image_urls, status)
values
(
  'hall_grand',
  'Abba Gada Grand Ballroom',
  350,
  'Our premier banquet and conference hall with state-of-the-art acoustics, stage lighting, and full catering support for weddings, summits, and banquets.',
  35000,
  array['High-End PA Sound System', 'Wireless Microphones', 'Dual HD Projectors & Screens', 'Stage & Podium', 'Backup Generator', 'High-Speed Wi-Fi'],
  array['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80'],
  true
),
(
  'hall_executive',
  'Bishan Executive Meeting Hall',
  60,
  'Ideal for corporate workshops, board meetings, trainings, and seminars with ergonomic seating and interactive presentation tools.',
  12000,
  array['Smart 85-inch Presentation Display', 'Conference Video Soundbar', 'Ergonomic Executive Chairs', 'Flip Charts & Whiteboards'],
  array['https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=1200&q=80'],
  true
)
on conflict (id) do nothing;

-- Seed Kitchen Stations
insert into public.kitchen_stations (id, name, description, display_order, is_active)
values
('st_grill', 'Traditional & Grill Station', 'Ethiopian traditional dishes, grilled meats, and clay pot stews', 1, true),
('st_hot', 'Hot Kitchen & International', 'Continental pasta, soups, breakfast skillets, and main entrees', 2, true),
('st_bar', 'Bar & Specialty Coffee', 'Ethiopian organic coffee, fresh juices, cocktails, and wines', 3, true),
('st_bakery', 'Bakery & Dessert Station', 'Fresh breads, Ethiopian pastries, and European desserts', 4, true)
on conflict (id) do nothing;

-- Seed Menu Categories
insert into public.menu_categories (id, name, description, display_order, is_active)
values
('mcat_trad', 'Traditional Ethiopian Specialties', 'Authentic culinary favorites prepared with fresh regional spices', 1, true),
('mcat_mains', 'International Mains & Grills', 'Chef-crafted continental dishes and prime steaks', 2, true),
('mcat_coffee', 'Woliso Organic Coffee & Teas', 'Locally sourced highland coffee brewed to perfection', 3, true),
('mcat_drinks', 'Fresh Juices & Beverages', 'Natural freshly pressed juices and soft drinks', 4, true),
('mcat_desserts', 'Pastries & Desserts', 'Artisanal cakes, ice cream, and sweet delights', 5, true)
on conflict (id) do nothing;

-- Seed Menu Items
insert into public.menu_items (id, category, category_id, name, description, price, is_available, is_spicy, is_halal, prep_time_minutes, kitchen_station_id, kitchen_station_name)
values
(
  'item_doro',
  'Traditional Ethiopian Specialties',
  'mcat_trad',
  'Woliso Special Doro Wat',
  'Slow-simmered tender chicken in rich berbere sauce served with farm egg, homemade cottage cheese (ayib), and fresh teff injera.',
  650,
  true,
  true,
  true,
  25,
  'st_grill',
  'Traditional & Grill Station'
),
(
  'item_tibs',
  'Traditional Ethiopian Specialties',
  'mcat_trad',
  'Sizzling Shekla Tibs',
  'Tender cubes of beef or lamb sautéed with rosemary, sweet red onions, garlic, and jalapeños, served sizzling over hot clay coals.',
  580,
  true,
  true,
  true,
  20,
  'st_grill',
  'Traditional & Grill Station'
),
(
  'item_shiro',
  'Traditional Ethiopian Specialties',
  'mcat_trad',
  'Special Shiro Tegabino',
  'Clay pot bubbling chickpea flour stew seasoned with spiced clarified butter or vegan oil, fresh garlic, and green chilies.',
  320,
  true,
  false,
  true,
  15,
  'st_grill',
  'Traditional & Grill Station'
),
(
  'item_coffee',
  'Woliso Organic Coffee & Teas',
  'mcat_coffee',
  'Jebena Traditional Coffee',
  'Freshly roasted organic highland coffee beans brewed in a traditional black clay jebena, served with smoking frankincense and popcorn.',
  80,
  true,
  false,
  true,
  10,
  'st_bar',
  'Bar & Specialty Coffee'
),
(
  'item_spris',
  'Fresh Juices & Beverages',
  'mcat_drinks',
  'Fresh Layered Spris Juice',
  'Thick layers of fresh avocado, mango, papaya, and guava, drizzled with sweet lime.',
  160,
  true,
  false,
  true,
  8,
  'st_bar',
  'Bar & Specialty Coffee'
)
on conflict (id) do nothing;

-- Seed Restaurant Tables
insert into public.restaurant_tables (id, table_number, area, capacity, status)
values
('tbl_1', 'T-01', 'Garden Terrace', 4, 'Available'),
('tbl_2', 'T-02', 'Garden Terrace', 4, 'Available'),
('tbl_3', 'T-03', 'Garden Terrace', 6, 'Available'),
('tbl_4', 'T-04', 'Main Dining Hall', 2, 'Available'),
('tbl_5', 'T-05', 'Main Dining Hall', 4, 'Available'),
('tbl_6', 'T-06', 'Main Dining Hall', 4, 'Available'),
('tbl_7', 'T-07', 'Main Dining Hall', 8, 'Available'),
('tbl_8', 'T-08', 'VIP Lounge', 6, 'Available')
on conflict (id) do nothing;

-- Seed Announcements
insert into public.announcements (id, title, paragraph, category, is_published, is_pinned, published_by, created_at, updated_at)
values
(
  'ann_welcome',
  'Welcome to the New Digital Experience at Woliso Hotel',
  'We are delighted to introduce our brand new digital platform! Guests can now book luxurious rooms, explore event halls, order dining directly to tables or rooms via QR codes, and track their services in real-time.',
  'Facility & Amenities',
  true,
  true,
  'General Management',
  (extract(epoch from now()) * 1000)::bigint,
  (extract(epoch from now()) * 1000)::bigint
)
on conflict (id) do nothing;
