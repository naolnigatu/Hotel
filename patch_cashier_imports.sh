sed -i 's/where } from '\''firebase\/firestore'\'';/where, getDocs } from '\''firebase\/firestore'\'';/' src/pages/admin/CashierDashboard.tsx
sed -i 's/import { Order, Booking, Role } from '\''..\/..\/types'\'';/import { Order, Booking, Role, Room, RoomCategory } from '\''..\/..\/types'\'';/' src/pages/admin/CashierDashboard.tsx
