import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { CmsOffer } from '../types';
import { Loader2, Calendar, Tag } from 'lucide-react';
import { motion } from 'motion/react';

export default function Offers() {
  const [offers, setOffers] = useState<CmsOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const q = query(collection(db, 'offers'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CmsOffer));
        setOffers(data.filter(o => o.active));
      } catch (error) {
        console.error("Error fetching offers:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-neutral-900" /></div>;
  }

  return (
    <div className="bg-neutral-50 min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-neutral-900 mb-4">Special Offers</h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Discover our latest promotions and exclusive deals for an unforgettable stay.
          </p>
        </div>

        {offers.length === 0 ? (
          <div className="text-center py-20 text-neutral-500">
            No special offers available at the moment. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {offers.map((offer, index) => (
              <motion.div 
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100 flex flex-col group"
              >
                <div className="aspect-[16/9] relative overflow-hidden bg-neutral-100">
                  {offer.bannerUrl ? (
                    <img src={offer.bannerUrl} alt={offer.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      <Tag className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Valid until {offer.endDate}
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-neutral-900 mb-3">{offer.title}</h3>
                  <p className="text-neutral-600 leading-relaxed flex-1 mb-6">
                    {offer.description}
                  </p>
                  
                  <button className="w-full py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors">
                    Claim Offer
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
