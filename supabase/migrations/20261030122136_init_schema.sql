-- =============================================================================
-- WOLISO HOTEL MANAGEMENT SYSTEM (HMS) — COMPLETE SCHEMA & RLS
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Profiles (Linked to auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'guest',
  phone text,
  preferences jsonb default '{}'::jsonb,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_email on public.profiles(email);

-- -----------------------------------------------------------------------------
-- 2. Helper function for role checking in RLS
-- -----------------------------------------------------------------------------
create or replace function public.get_current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    case 
      when (auth.jwt() ->> 'email') = 'naolnigatu2025@gmail.com' then 'admin'
      else 'guest'
    end
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.get_current_user_role() = 'admin' 
    or (auth.jwt() ->> 'email') = 'naolnigatu2025@gmail.com';
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.get_current_user_role() in ('admin', 'reception', 'kitchen', 'waiter', 'housekeeping', 'cashier')
    or public.is_admin();
$$;

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role text := 'guest';
begin
  if new.email = 'naolnigatu2025@gmail.com' then
    assigned_role := 'admin';
  elsif (new.raw_app_meta_data->>'role') is not null then
    assigned_role := new.raw_app_meta_data->>'role';
  end if;

  insert into public.profiles (id, email, name, role, phone, preferences, created_at, updated_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', case when assigned_role = 'admin' then 'Naol Nigatu' else 'Guest' end),
    assigned_role,
    new.phone,
    '{}'::jsonb,
    (extract(epoch from now()) * 1000)::bigint,
    (extract(epoch from now()) * 1000)::bigint
  )
  on conflict (id) do update set
    email = excluded.email,
    role = case when public.is_admin() then excluded.role else profiles.role end,
    updated_at = (extract(epoch from now()) * 1000)::bigint;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 3. Staff Members
-- -----------------------------------------------------------------------------
create table if not exists public.staff_members (
  id text primary key,
  uid text,
  email text not null,
  name text not null,
  role text not null,
  phone text,
  is_active boolean not null default true,
  department text,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_staff_role on public.staff_members(role);
create index if not exists idx_staff_uid on public.staff_members(uid);

-- -----------------------------------------------------------------------------
-- 4. Room Categories & Rooms Inventory
-- -----------------------------------------------------------------------------
create table if not exists public.room_categories (
  id text primary key,
  name text not null,
  description text,
  base_price numeric not null default 0,
  amenities text[] default '{}',
  image_urls text[] default '{}',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.rooms (
  id text primary key,
  category_id text not null references public.room_categories(id) on delete cascade,
  room_number text not null unique,
  condition text not null default 'Clean',
  status text not null default 'Available',
  floor text,
  wing text,
  notes text,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_rooms_category on public.rooms(category_id);
create index if not exists idx_rooms_status on public.rooms(status);
create index if not exists idx_rooms_condition on public.rooms(condition);

-- -----------------------------------------------------------------------------
-- 5. Halls & Hall Booking Requests
-- -----------------------------------------------------------------------------
create table if not exists public.halls (
  id text primary key,
  name text not null,
  capacity int not null default 0,
  description text,
  price numeric not null default 0,
  equipment text[] default '{}',
  image_urls text[] default '{}',
  status boolean not null default true,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.hall_requests (
  id text primary key,
  reservation_code text not null unique,
  hall_id text references public.halls(id) on delete cascade,
  hall_name text,
  event_type text,
  organizer_name text,
  email text,
  phone text,
  start_date text,
  end_date text,
  time_slot text,
  number_of_guests int default 1,
  requested_equipment text[] default '{}',
  message text,
  total_estimated_price numeric default 0,
  status text not null default 'Pending',
  admin_notes text,
  guest_id text,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_hall_requests_code on public.hall_requests(reservation_code);
create index if not exists idx_hall_requests_status on public.hall_requests(status);
create index if not exists idx_hall_requests_hall on public.hall_requests(hall_id);

-- -----------------------------------------------------------------------------
-- 6. Bookings (Rooms & Unified Reservations)
-- -----------------------------------------------------------------------------
create table if not exists public.bookings (
  id text primary key,
  reservation_code text not null unique,
  type text not null default 'room',
  guest_id text,
  guest_details jsonb not null default '{}'::jsonb,
  category_id text references public.room_categories(id) on delete set null,
  hall_name text,
  event_type text,
  room_id text,
  number_of_guests int not null default 1,
  special_requests text,
  requested_equipment text[] default '{}',
  is_vip boolean default false,
  booking_source text default 'Online',
  check_in bigint not null,
  check_out bigint not null,
  status text not null default 'Pending',
  total_amount numeric not null default 0,
  payment_method text not null,
  payment_proof_url text,
  transaction_id text,
  payment_rejection_reason text,
  timeline jsonb default '[]'::jsonb,
  notes jsonb default '[]'::jsonb,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_bookings_code on public.bookings(reservation_code);
create index if not exists idx_bookings_category on public.bookings(category_id);
create index if not exists idx_bookings_room on public.bookings(room_id);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_bookings_dates on public.bookings(check_in, check_out);

-- -----------------------------------------------------------------------------
-- 7. Restaurant: Categories, Stations, Menu Items, Tables, Orders, Requests
-- -----------------------------------------------------------------------------
create table if not exists public.menu_categories (
  id text primary key,
  name text not null,
  description text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.kitchen_stations (
  id text primary key,
  name text not null,
  description text,
  display_order int not null default 0,
  is_active boolean not null default true,
  assigned_staff_ids text[] default '{}',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.menu_items (
  id text primary key,
  category text not null,
  category_id text references public.menu_categories(id) on delete set null,
  name text not null,
  description text,
  price numeric not null default 0,
  image_url text,
  is_available boolean not null default true,
  ingredients text[] default '{}',
  allergens text[] default '{}',
  prep_time_minutes int default 15,
  is_spicy boolean default false,
  is_vegetarian boolean default false,
  is_vegan boolean default false,
  is_halal boolean default false,
  calories int,
  kitchen_station_id text references public.kitchen_stations(id) on delete set null,
  kitchen_station_name text,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_menu_items_category on public.menu_items(category_id);
create index if not exists idx_menu_items_station on public.menu_items(kitchen_station_id);

create table if not exists public.restaurant_tables (
  id text primary key,
  table_number text not null unique,
  area text not null,
  capacity int not null default 4,
  qr_code_url text,
  status text not null default 'Available'
);

create table if not exists public.restaurant_orders (
  id text primary key,
  order_number text not null unique,
  type text not null,
  location_ref text not null,
  table_id text,
  table_number text,
  room_number text,
  reservation_code text,
  reservation_id text,
  customer_name text,
  customer_phone text,
  customer_email text,
  arrival_time text,
  customer_uid text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  tax_rate numeric not null default 15,
  tax_amount numeric not null default 0,
  service_charge_rate numeric not null default 5,
  service_charge_amount numeric not null default 0,
  room_service_fee numeric default 0,
  total_amount numeric not null default 0,
  payment_method text not null default 'Cash',
  payment_status text not null default 'Pending',
  payment_proof_url text,
  transaction_id text,
  payment_rejection_reason text,
  status text not null default 'Order Submitted',
  order_notes text,
  kitchen_notes text,
  priority text default 'Normal',
  assigned_waiter_id text,
  assigned_waiter_name text,
  waiter_notes text,
  timeline jsonb default '[]'::jsonb,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_orders_number on public.restaurant_orders(order_number);
create index if not exists idx_orders_status on public.restaurant_orders(status);
create index if not exists idx_orders_payment_status on public.restaurant_orders(payment_status);
create index if not exists idx_orders_created_at on public.restaurant_orders(created_at);
create index if not exists idx_orders_customer on public.restaurant_orders(customer_uid);

create table if not exists public.service_requests (
  id text primary key,
  type text not null,
  location_ref text not null,
  table_id text,
  table_number text,
  room_number text,
  status text not null default 'Pending',
  notes text,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_service_requests_status on public.service_requests(status);
create index if not exists idx_service_requests_created_at on public.service_requests(created_at);

-- -----------------------------------------------------------------------------
-- 8. Housekeeping & Maintenance
-- -----------------------------------------------------------------------------
create table if not exists public.housekeeping_tasks (
  id text primary key,
  room_id text references public.rooms(id) on delete cascade,
  room_number text not null,
  floor text,
  wing text,
  priority text not null default 'Medium',
  status text not null default 'Pending',
  assigned_to_id text,
  assigned_to_name text,
  requested_by text,
  estimated_minutes int default 30,
  started_at bigint,
  completed_at bigint,
  notes text,
  photos text[] default '{}',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_housekeeping_room on public.housekeeping_tasks(room_id);
create index if not exists idx_housekeeping_status on public.housekeeping_tasks(status);

create table if not exists public.maintenance_reports (
  id text primary key,
  room_id text references public.rooms(id) on delete cascade,
  room_number text not null,
  category_id text,
  category text not null,
  description text not null,
  priority text not null default 'Medium',
  status text not null default 'Open',
  photos text[] default '{}',
  reported_by_uid text not null,
  reported_by_name text not null,
  assigned_to_uid text,
  assigned_to_name text,
  resolution_notes text,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_maintenance_room on public.maintenance_reports(room_id);
create index if not exists idx_maintenance_status on public.maintenance_reports(status);

create table if not exists public.housekeeping_logs (
  id text primary key,
  room_id text references public.rooms(id) on delete cascade,
  room_number text not null,
  staff_uid text not null,
  staff_name text not null,
  action text not null,
  previous_status text,
  new_status text,
  notes text,
  timestamp bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_housekeeping_logs_room on public.housekeeping_logs(room_id);

-- -----------------------------------------------------------------------------
-- 9. Notifications, Audit Logs, Settings & Marketing
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id text primary key,
  recipient_uid text,
  recipient_role text,
  title text not null,
  message text not null,
  type text not null,
  related_entity_id text,
  related_entity_type text,
  target_route text,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  is_read boolean not null default false,
  priority text not null default 'Normal',
  event_id text,
  expires_at bigint
);

create index if not exists idx_notifications_recipient on public.notifications(recipient_uid, recipient_role);
create index if not exists idx_notifications_event on public.notifications(event_id);
create index if not exists idx_notifications_created on public.notifications(created_at);

create table if not exists public.audit_logs (
  id text primary key,
  user_id text not null,
  user_name text not null,
  user_role text not null,
  action text not null,
  module text not null,
  details text,
  previous_value text,
  new_value text,
  timestamp bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_audit_logs_user on public.audit_logs(user_id);
create index if not exists idx_audit_logs_module on public.audit_logs(module);
create index if not exists idx_audit_logs_timestamp on public.audit_logs(timestamp);

create table if not exists public.app_settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.announcements (
  id text primary key,
  title text not null,
  paragraph text not null,
  image_url text,
  image_caption text,
  category text not null default 'General',
  is_published boolean not null default true,
  is_pinned boolean not null default false,
  badge text,
  published_by text not null,
  published_by_role text,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  expires_at bigint
);

create index if not exists idx_announcements_pub on public.announcements(is_published, is_pinned);

create table if not exists public.testimonials (
  id text primary key,
  name text not null,
  role text default 'Hotel Guest',
  content text not null,
  rating int not null default 5,
  user_id text,
  user_email text,
  status text not null default 'pending',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.offers (
  id text primary key,
  title text not null,
  description text,
  start_date text,
  end_date text,
  banner_url text,
  active boolean not null default true,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.gallery (
  id text primary key,
  url text not null,
  category text not null default 'Hotel',
  caption text,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.contact_messages (
  id text primary key,
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  status text not null default 'unread',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- -----------------------------------------------------------------------------
-- 10. Enable Realtime Replication
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table 
  public.restaurant_orders, 
  public.service_requests, 
  public.bookings, 
  public.housekeeping_tasks, 
  public.rooms, 
  public.notifications;

-- -----------------------------------------------------------------------------
-- 11. Row-Level Security (RLS) Policies
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.staff_members enable row level security;
alter table public.room_categories enable row level security;
alter table public.rooms enable row level security;
alter table public.halls enable row level security;
alter table public.hall_requests enable row level security;
alter table public.bookings enable row level security;
alter table public.menu_categories enable row level security;
alter table public.kitchen_stations enable row level security;
alter table public.menu_items enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.restaurant_orders enable row level security;
alter table public.service_requests enable row level security;
alter table public.housekeeping_tasks enable row level security;
alter table public.maintenance_reports enable row level security;
alter table public.housekeeping_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;
alter table public.announcements enable row level security;
alter table public.testimonials enable row level security;
alter table public.offers enable row level security;
alter table public.gallery enable row level security;
alter table public.contact_messages enable row level security;

-- PROFILES
create policy "Profiles readable by authenticated" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Profiles update by owner or admin" on public.profiles for update using (auth.uid() = id or public.is_admin());
create policy "Profiles insert on signup" on public.profiles for insert with check (auth.uid() = id or public.is_admin());

-- STAFF
create policy "Staff readable by staff" on public.staff_members for select using (public.is_staff());
create policy "Staff writable by admin" on public.staff_members for all using (public.is_admin());

-- ROOM CATEGORIES & ROOMS
create policy "Categories readable by all" on public.room_categories for select using (true);
create policy "Categories writable by admin" on public.room_categories for all using (public.is_admin());

create policy "Rooms readable by all" on public.rooms for select using (true);
create policy "Rooms writable by staff" on public.rooms for all using (public.is_staff());

-- HALLS & HALL REQUESTS
create policy "Halls readable by all" on public.halls for select using (true);
create policy "Halls writable by staff" on public.halls for all using (public.is_staff());

create policy "Hall requests readable by all" on public.hall_requests for select using (true);
create policy "Hall requests insertable by all" on public.hall_requests for insert with check (true);
create policy "Hall requests updatable by staff" on public.hall_requests for update using (public.is_staff());
create policy "Hall requests deletable by staff" on public.hall_requests for delete using (public.is_staff());

-- BOOKINGS
create policy "Bookings readable by all" on public.bookings for select using (true);
create policy "Bookings insertable by all" on public.bookings for insert with check (true);
create policy "Bookings updatable by staff" on public.bookings for update using (public.is_staff());
create policy "Bookings deletable by admin" on public.bookings for delete using (public.is_admin());

-- MENU & STATIONS
create policy "Menu categories readable by all" on public.menu_categories for select using (true);
create policy "Menu categories writable by admin" on public.menu_categories for all using (public.is_admin());

create policy "Stations readable by all" on public.kitchen_stations for select using (true);
create policy "Stations writable by admin" on public.kitchen_stations for all using (public.is_admin());

create policy "Menu items readable by all" on public.menu_items for select using (true);
create policy "Menu items writable by admin" on public.menu_items for all using (public.is_admin());

-- TABLES
create policy "Tables readable by all" on public.restaurant_tables for select using (true);
create policy "Tables writable by staff" on public.restaurant_tables for all using (public.is_staff());

-- RESTAURANT ORDERS
create policy "Orders readable by all" on public.restaurant_orders for select using (true);
create policy "Orders insertable by all" on public.restaurant_orders for insert with check (true);
create policy "Orders updatable by staff" on public.restaurant_orders for update using (public.is_staff());
create policy "Orders deletable by admin" on public.restaurant_orders for delete using (public.is_admin());

-- SERVICE REQUESTS
create policy "Service requests readable by all" on public.service_requests for select using (true);
create policy "Service requests insertable by all" on public.service_requests for insert with check (true);
create policy "Service requests updatable by staff" on public.service_requests for update using (public.is_staff());
create policy "Service requests deletable by admin" on public.service_requests for delete using (public.is_admin());

-- HOUSEKEEPING & MAINTENANCE
create policy "Tasks readable by staff" on public.housekeeping_tasks for select using (public.is_staff());
create policy "Tasks writable by staff" on public.housekeeping_tasks for all using (public.is_staff());

create policy "Maintenance readable by staff" on public.maintenance_reports for select using (public.is_staff());
create policy "Maintenance writable by staff" on public.maintenance_reports for all using (public.is_staff());

create policy "HK logs readable by staff" on public.housekeeping_logs for select using (public.is_staff());
create policy "HK logs writable by staff" on public.housekeeping_logs for all using (public.is_staff());

-- NOTIFICATIONS
create policy "Notifications select" on public.notifications for select using (
  public.is_staff() or recipient_uid is null or recipient_uid = auth.uid()::text
);
create policy "Notifications insert" on public.notifications for insert with check (true);
create policy "Notifications update" on public.notifications for update using (
  public.is_staff() or recipient_uid = auth.uid()::text
);
create policy "Notifications delete" on public.notifications for delete using (public.is_staff());

-- AUDIT LOGS
create policy "Audit logs readable by admin" on public.audit_logs for select using (public.is_admin());
create policy "Audit logs insertable by staff" on public.audit_logs for insert with check (public.is_staff());

-- SETTINGS, ANNOUNCEMENTS, OFFERS, GALLERY, TESTIMONIALS, MESSAGES
create policy "App settings readable by all" on public.app_settings for select using (true);
create policy "App settings writable by admin" on public.app_settings for all using (public.is_admin());

create policy "Announcements readable by all" on public.announcements for select using (true);
create policy "Announcements writable by staff" on public.announcements for all using (public.is_staff());

create policy "Offers readable by all" on public.offers for select using (true);
create policy "Offers writable by admin" on public.offers for all using (public.is_admin());

create policy "Gallery readable by all" on public.gallery for select using (true);
create policy "Gallery writable by admin" on public.gallery for all using (public.is_admin());

create policy "Testimonials readable by all" on public.testimonials for select using (true);
create policy "Testimonials insertable by auth" on public.testimonials for insert with check (auth.role() = 'authenticated');
create policy "Testimonials writable by admin" on public.testimonials for all using (public.is_admin());

create policy "Contact messages insertable by all" on public.contact_messages for insert with check (true);
create policy "Contact messages manageable by staff" on public.contact_messages for all using (public.is_staff());

-- -----------------------------------------------------------------------------
-- 12. Storage Buckets & Policies
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values 
  ('payment_proofs', 'payment_proofs', true),
  ('menu_images', 'menu_images', true),
  ('room_images', 'room_images', true),
  ('hall_images', 'hall_images', true),
  ('gallery', 'gallery', true),
  ('maintenance_photos', 'maintenance_photos', true),
  ('cms_assets', 'cms_assets', true)
on conflict (id) do nothing;

create policy "Public Access Storage" on storage.objects for select using (true);
create policy "Public Upload Payment Proofs" on storage.objects for insert with check (bucket_id = 'payment_proofs');
create policy "Staff Upload Any Storage" on storage.objects for insert with check (bucket_id in ('payment_proofs', 'menu_images', 'room_images', 'hall_images', 'gallery', 'maintenance_photos', 'cms_assets'));
create policy "Staff Manage Any Storage" on storage.objects for all using (bucket_id in ('payment_proofs', 'menu_images', 'room_images', 'hall_images', 'gallery', 'maintenance_photos', 'cms_assets'));
