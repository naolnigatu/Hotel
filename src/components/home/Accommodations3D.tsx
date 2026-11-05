import React from 'react';
import { BedDouble, ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RoomCategory } from '../../types';

interface Accommodations3DProps {
  rooms: RoomCategory[];
  title?: string;
  subtitle?: string;
}

export default function Accommodations3D({ rooms, title, subtitle }: Accommodations3DProps) {
  // If no rooms are passed from CMS/DB yet, provide fallback authentic categories
  const displayRooms: RoomCategory[] = rooms.length > 0 ? rooms : [
    {
      id: 'deluxe-king',
      name: 'Deluxe King Room',
      description: 'Elegant room with panoramic mountain views, plush king-size bedding, spacious work desk, and luxury marble bathroom.',
      basePrice: 3500,
      amenities: ['High-Speed WiFi', 'Private Balcony', 'King Bed', 'Complimentary Breakfast'],
      imageUrls: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=1000']
    },
    {
      id: 'executive-suite',
      name: 'Executive Garden Suite',
      description: 'Expansive private suite with separate living salon, outdoor terrace overlooking tropical gardens, and deep soaking tub.',
      basePrice: 5200,
      amenities: ['Private Living Room', 'Garden Terrace', 'Jacuzzi Soaking Tub', 'Minibar'],
      imageUrls: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1000']
    },
    {
      id: 'presidential-suite',
      name: 'Presidential Royal Suite',
      description: 'The pinnacle of luxury hospitality. Features private dining room, conference boardroom, personal butler service, and jacuzzi.',
      basePrice: 8500,
      amenities: ['VIP Butler Service', 'Private Dining Area', 'Jacuzzi', 'Airport Limousine'],
      imageUrls: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=1000']
    }
  ];

  return (
    <section className="py-24 bg-neutral-950 text-white relative overflow-hidden" id="accommodations">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-sky-400 mb-4">
              <BedDouble className="w-3.5 h-3.5" />
              <span>Luxury Guest Suites</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
              {title || 'Immersive Luxury Accommodations'}
            </h2>
            <p className="text-base sm:text-lg text-neutral-400 leading-relaxed">
              {subtitle || 'Each room and suite is thoughtfully curated with handcrafted furniture, tranquil natural light, and modern guest amenities.'}
            </p>
          </div>

          <Link
            to="/rooms"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs transition-colors shrink-0"
          >
            <span>Explore All Accommodations</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 3D Dimensional Room Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayRooms.map((room) => {
            const img = room.imageUrls?.[0] || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=1000';

            return (
              <div
                key={room.id}
                className="group relative rounded-3xl bg-neutral-900/80 border border-white/10 overflow-hidden shadow-xl hover:border-sky-500/40 transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col justify-between"
              >
                {/* Image Frame with Zoom Effect */}
                <div className="relative aspect-[16/11] overflow-hidden bg-neutral-800">
                  <img
                    src={img}
                    alt={room.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=1000';
                    }}
                  />
                  
                  {/* Floating Price Pill */}
                  <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-neutral-950/85 backdrop-blur-md border border-white/15 text-right shadow-lg">
                    <span className="block text-sm font-bold font-mono text-emerald-400">
                      {room.basePrice.toLocaleString()} ETB
                    </span>
                    <span className="text-[10px] text-neutral-400">/ per night</span>
                  </div>

                  {/* Rating / Quality Badge */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-neutral-950/80 backdrop-blur-md border border-white/10 text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                    <BedDouble className="w-3.5 h-3.5 text-sky-400" />
                    <span>Woliso Luxury Collection</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-sky-300 transition-colors mb-2">
                      {room.name}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      {room.description}
                    </p>
                  </div>

                  {/* Room Amenities Quick List */}
                  <div className="space-y-1.5 pt-3 border-t border-white/10">
                    {(room.amenities || ['High-Speed WiFi', 'Balcony', 'Ensuite Bathroom']).slice(0, 3).map((am, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-neutral-300">
                        <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>{am}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 flex items-center gap-3">
                    <Link
                      to={`/book?room=${room.id}`}
                      className="flex-1 py-2.5 text-center rounded-xl bg-white text-neutral-950 font-bold text-xs hover:bg-neutral-200 transition-colors shadow-xs"
                    >
                      Instant Direct Reservation
                    </Link>
                    <Link
                      to="/rooms"
                      className="px-3 py-2.5 rounded-xl border border-white/15 text-neutral-300 hover:text-white text-xs font-semibold hover:bg-white/5 transition-colors"
                      title="View room details"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
