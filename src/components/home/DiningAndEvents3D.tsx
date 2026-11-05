import React from 'react';
import { UtensilsCrossed, CalendarRange, ArrowRight, Coffee, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MenuItem, Hall } from '../../types';

interface DiningAndEvents3DProps {
  dishes: MenuItem[];
  halls: Hall[];
}

export default function DiningAndEvents3D({ dishes, halls }: DiningAndEvents3DProps) {
  const displayDishes = dishes.length > 0 ? dishes.slice(0, 3) : [
    {
      id: 'dish-1',
      name: 'Special Woliso Tibs',
      description: 'Tender prime beef sautéed with organic rosemary, jalapeños, and spiced clarified butter.',
      price: 450,
      category: 'Main Course',
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'dish-2',
      name: 'Traditional Doro Wot Feast',
      description: 'Slow-simmered chicken drumsticks in rich berbere sauce with hard-boiled eggs and injera.',
      price: 520,
      category: 'Traditional',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'dish-3',
      name: 'Fresh Mango-Avocado Tartare',
      description: 'Locally sourced Woliso avocados with sweet mango cubes and zesty citrus vinaigrette.',
      price: 280,
      category: 'Starters',
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800'
    }
  ];

  const displayHalls = halls.length > 0 ? halls.slice(0, 2) : [
    {
      id: 'grand-ballroom',
      name: 'The Abba Gada Grand Ballroom',
      description: 'State-of-the-art convention hall equipped with 4K projection, professional acoustics, and VIP holding rooms.',
      capacity: 800,
      hourlyRate: 15000,
      imageUrls: ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1000']
    },
    {
      id: 'executive-boardroom',
      name: 'Executive Summit Boardroom',
      description: 'High-level diplomatic and corporate boardroom with video conferencing suites, high-speed fiber, and catering lounge.',
      capacity: 60,
      hourlyRate: 6000,
      imageUrls: ['https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&q=80&w=1000']
    }
  ];

  return (
    <section className="py-24 bg-neutral-900 text-white relative overflow-hidden" id="dining-events">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-amber-400 mb-4">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Dining & Event Spaces</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-6">
            Culinary Excellence & <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-rose-400">Grand Venues</span>
          </h2>
          <p className="text-base sm:text-lg text-neutral-300 leading-relaxed">
            From farm-to-table culinary experiences to grand corporate congresses, explore our dining venues and conference halls.
          </p>
        </div>

        {/* 2-Section Grid: Dining (Left) + Halls (Right) */}
        <div className="grid lg:grid-cols-12 gap-8 items-start mb-12">
          
          {/* Left: Culinary Showcase */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>Signature Culinary Offerings</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">Prepared fresh by our master chefs with local organic ingredients.</p>
              </div>
              <Link
                to="/restaurant"
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
              >
                <span>Full Menu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {displayDishes.map((dish) => (
                <div
                  key={dish.id}
                  className="p-3.5 rounded-2xl bg-neutral-950/70 border border-white/10 hover:border-amber-500/40 transition-all flex items-center gap-4 group"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-800 shrink-0">
                    {dish.imageUrl ? (
                      <img
                        src={dish.imageUrl}
                        alt={dish.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-500">
                        <Coffee className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-white text-sm truncate group-hover:text-amber-300 transition-colors">
                        {dish.name}
                      </h4>
                      <span className="font-mono font-bold text-amber-400 text-xs shrink-0">
                        {dish.price} ETB
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                      {dish.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Event Spaces & Halls */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>Grand Convention Venues</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">Versatile venues equipped with modern AV for weddings and summits.</p>
              </div>
              <Link
                to="/halls"
                className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition"
              >
                <span>All Venues</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-4">
              {displayHalls.map((hall) => {
                const img = hall.imageUrls?.[0] || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1000';
                return (
                  <div
                    key={hall.id}
                    className="rounded-2xl bg-neutral-950/70 border border-white/10 overflow-hidden hover:border-sky-500/40 transition-all group flex flex-col sm:flex-row"
                  >
                    <div className="sm:w-44 h-36 sm:h-auto overflow-hidden bg-neutral-800 relative shrink-0">
                      <img
                        src={img}
                        alt={hall.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1000';
                        }}
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[10px] font-bold text-sky-300 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>Up to {hall.capacity}</span>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-white text-base group-hover:text-sky-300 transition-colors">
                          {hall.name}
                        </h4>
                        <p className="text-xs text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                          {hall.description}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs font-mono text-emerald-400 font-bold">
                          {hall.hourlyRate ? `${hall.hourlyRate.toLocaleString()} ETB / hr` : 'Custom Package'}
                        </span>
                        <Link
                          to="/halls"
                          className="text-xs font-bold text-white hover:text-sky-300 transition"
                        >
                          Reserve Space &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
