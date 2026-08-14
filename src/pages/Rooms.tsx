import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { RoomCategory } from '../types';
import { useTranslation } from 'react-i18next';
import { Wind, Tv, ShowerHead, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Rooms() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'room_categories'));
        const catsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as RoomCategory[];
        
        setCategories(catsData);
      } catch (error) {
        console.error("Error fetching room categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-neutral-900 mb-4">{t('rooms')}</h1>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          Discover our range of comfortable and elegant rooms, designed to provide you with the perfect stay.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : categories.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100 flex flex-col transition-transform hover:-translate-y-1 hover:shadow-md">
              <div className="aspect-[4/3] relative">
                <img 
                  src={category.imageUrls?.[0] || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=1000'} 
                  alt={category.name} 
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=1000';
                  }}
                />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-neutral-900">{category.name}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-neutral-900">{category.basePrice} ETB</span>
                    <span className="text-sm text-neutral-500 block">per night</span>
                  </div>
                </div>
                
                <p className="text-neutral-600 text-sm mb-6 flex-1 line-clamp-3">
                  {category.description || 'Experience the perfect blend of comfort and style in our spacious rooms.'}
                </p>
                
                <div className="flex flex-wrap items-center gap-3 text-neutral-500 text-sm mb-6">
                  {category.amenities?.slice(0, 4).map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-neutral-50 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-600 border border-neutral-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
                      {amenity}
                    </div>
                  ))}
                  {(category.amenities?.length || 0) > 4 && (
                    <span className="text-xs font-medium text-neutral-400">
                      +{category.amenities.length - 4} more
                    </span>
                  )}
                </div>
                
                <Link 
                  to={`/book?category=${category.id}`} 
                  className="block w-full py-3 text-center bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors mt-auto"
                >
                  {t('book_now')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-neutral-500">No rooms available at the moment.</p>
        </div>
      )}
    </div>
  );
}
