import React, { useState } from 'react';
import { MenuItem } from '../../types';
import { X, Clock, Flame, Leaf, AlertTriangle, Plus, Minus, ShoppingBag, Check, Zap } from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface ItemDetailModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onOrderNow?: () => void;
}

export default function ItemDetailModal({ item, onClose, onOrderNow }: ItemDetailModalProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [added, setAdded] = useState(false);

  if (!item) return null;

  const handleAddToCart = (openDrawer: boolean = false) => {
    addToCart(item, quantity, notes, openDrawer);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
      if (openDrawer) {
        // Drawer opens via addToCart
      }
    }, 500);
  };

  const handleOrderNow = () => {
    addToCart(item, quantity, notes, false);
    onClose();
    if (onOrderNow) {
      onOrderNow();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Image */}
        <div className="relative aspect-video w-full bg-neutral-100">
          <img 
            src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'} 
            alt={item.name} 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800';
            }}
          />
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="absolute bottom-3 left-3 bg-neutral-900/80 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {item.category}
          </div>

          {!item.isAvailable && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
              <span className="bg-red-600 text-white font-bold px-4 py-2 rounded-lg text-sm uppercase tracking-wide">
                Currently Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 flex-1">
          <div>
            <div className="flex justify-between items-start gap-4">
              <h2 className="text-2xl font-bold text-neutral-900">{item.name}</h2>
              <div className="text-xl font-extrabold text-emerald-700 whitespace-nowrap">
                {item.price} <span className="text-xs font-semibold">ETB</span>
              </div>
            </div>

            <p className="text-neutral-600 text-sm mt-2 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Badges & Prep Time */}
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            {item.prepTimeMinutes && (
              <span className="flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> ~{item.prepTimeMinutes} mins prep
              </span>
            )}
            {item.isSpicy && (
              <span className="flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">
                <Flame className="w-3.5 h-3.5 text-red-600" /> Spicy
              </span>
            )}
            {item.isVegetarian && (
              <span className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                <Leaf className="w-3.5 h-3.5 text-emerald-600" /> Vegetarian
              </span>
            )}
            {item.isHalal && (
              <span className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-800 rounded-full border border-blue-200">
                Halal
              </span>
            )}
            {item.calories && (
              <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full">
                {item.calories} kcal
              </span>
            )}
          </div>

          {/* Ingredients & Allergens */}
          {((item.ingredients && item.ingredients.length > 0) || (item.allergens && item.allergens.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-neutral-100">
              {item.ingredients && item.ingredients.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Key Ingredients</h4>
                  <p className="text-xs text-neutral-700">{item.ingredients.join(', ')}</p>
                </div>
              )}
              {item.allergens && item.allergens.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Allergen Info
                  </h4>
                  <p className="text-xs text-rose-700 font-medium">{item.allergens.join(', ')}</p>
                </div>
              )}
            </div>
          )}

          {/* Special Instructions Input */}
          <div className="pt-3 border-t border-neutral-100">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
              Special Instructions / Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g., Less salt, extra spicy, sauce on the side..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Quantity Selector & Action Buttons */}
          {item.isAvailable && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Select Quantity:</span>
                <div className="flex items-center border border-neutral-300 rounded-lg overflow-hidden bg-neutral-50 shadow-xs">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 text-neutral-600 hover:bg-neutral-200 transition cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 font-bold text-neutral-900 text-sm">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 text-neutral-600 hover:bg-neutral-200 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleAddToCart(false)}
                  disabled={added}
                  className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 border border-emerald-600 cursor-pointer ${
                    added 
                      ? 'bg-emerald-50 text-emerald-800' 
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" /> Added to Cart!
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4 text-emerald-600" /> Add to Cart ({item.price * quantity} ETB)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleOrderNow}
                  className="py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" /> Order Now Directly
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
