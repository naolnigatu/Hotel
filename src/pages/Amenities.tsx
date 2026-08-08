import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CmsAmenity } from '../types';
import { Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { motion } from 'motion/react';

export default function Amenities() {
  const [amenities, setAmenities] = useState<CmsAmenity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCms = async () => {
      try {
        const docRef = doc(db, 'settings', 'cms_amenities');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAmenities(docSnap.data().data || []);
        }
      } catch (error) {
        console.error("Error fetching amenities:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCms();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-40"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>;
  }

  return (
    <div className="bg-neutral-50 min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-neutral-900 mb-4">Hotel Amenities</h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Enjoy a wide range of facilities designed for your comfort and convenience.
          </p>
        </div>

        {amenities.length === 0 ? (
          <div className="text-center py-20 text-neutral-500">
            No amenities listed at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {amenities.map((amenity, index) => {
              const IconComponent = (Icons as any)[amenity.icon] || Icons.HelpCircle;
              return (
                <motion.div
                  key={amenity.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-100 flex flex-col items-center text-center hover:shadow-md transition-shadow"
                >
                  <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                    <IconComponent className="w-8 h-8 text-neutral-900" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-3">{amenity.title}</h3>
                  <p className="text-neutral-600 leading-relaxed">
                    {amenity.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
