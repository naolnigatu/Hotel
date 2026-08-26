import React from 'react';
import { useCart } from '../../context/CartContext';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, UtensilsCrossed, Hotel, ShoppingCart, CheckSquare, Square, Check } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface CartDrawerProps {
  onProceedToCheckout: () => void;
}

export default function CartDrawer({ onProceedToCheckout }: CartDrawerProps) {
  const { 
    cartItems, 
    selectedItemIds,
    selectedCartItems,
    isCartOpen, 
    setIsCartOpen, 
    toggleSelectItem,
    selectAllItems,
    deselectAllItems,
    updateQuantity, 
    updateItemNotes,
    removeFromCart, 
    clearCart,
    orderType,
    subtotal,
    vatRate,
    serviceChargeRate,
    taxAmount,
    serviceChargeAmount,
    applicableRoomServiceFee,
    grandTotal,
    totalItemCount,
    selectedItemCount
  } = useCart();

  useBodyScrollLock(isCartOpen);

  if (!isCartOpen) return null;

  const isAllSelected = cartItems.length > 0 && selectedItemIds.length === cartItems.length;
  const isNoneSelected = selectedItemIds.length === 0;

  const handleCheckout = () => {
    if (selectedCartItems.length === 0 && cartItems.length > 0) {
      // If none selected, auto-select all
      selectAllItems();
    }
    setIsCartOpen(false);
    onProceedToCheckout();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in overscroll-contain">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-neutral-200 flex justify-between items-center bg-neutral-900 text-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-lg">Your Order Cart</h2>
            <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
            </span>
          </div>

          <button 
            onClick={() => setIsCartOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Banner & Selection Bar */}
        <div className="bg-emerald-50 px-5 py-2.5 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
          <span className="font-semibold flex items-center gap-1.5">
            {orderType === 'QR Table' && <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-600" />}
            {orderType === 'Room Service' && <Hotel className="w-3.5 h-3.5 text-emerald-600" />}
            Mode: <strong className="uppercase font-bold">{orderType}</strong>
          </span>
          {applicableRoomServiceFee > 0 && (
            <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              +{applicableRoomServiceFee} ETB Room Service
            </span>
          )}
        </div>

        {/* Bulk Selection Toggle Bar (When cart has items) */}
        {cartItems.length > 0 && (
          <div className="px-5 py-2 bg-neutral-100 border-b border-neutral-200 flex items-center justify-between text-xs text-neutral-700">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={isAllSelected ? deselectAllItems : selectAllItems}
                className="flex items-center gap-1.5 font-bold hover:text-neutral-900 transition cursor-pointer text-emerald-800"
              >
                {isAllSelected ? (
                  <>
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 text-neutral-400" />
                    <span>Select All ({cartItems.length})</span>
                  </>
                )}
              </button>
            </div>

            <span className="text-[11px] font-semibold text-neutral-500">
              {selectedCartItems.length} of {cartItems.length} selected for checkout
            </span>
          </div>
        )}

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-16 text-neutral-500 space-y-3">
              <ShoppingCart className="w-12 h-12 text-neutral-300 mx-auto" />
              <p className="font-semibold text-neutral-700">Your cart is currently empty</p>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                Explore our menu items and add your favorite food or drinks to order!
              </p>
            </div>
          ) : (
            cartItems.map(({ item, quantity, notes }) => {
              const isSelected = selectedItemIds.includes(item.id);

              return (
                <div 
                  key={item.id} 
                  className={`p-3.5 rounded-xl border transition-all flex gap-3 items-start ${
                    isSelected 
                      ? 'bg-emerald-50/30 border-emerald-300 shadow-xs' 
                      : 'bg-neutral-50/80 border-neutral-200 opacity-60'
                  }`}
                >
                  {/* Item Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleSelectItem(item.id)}
                    className="mt-1 text-emerald-700 hover:text-emerald-900 transition flex-shrink-0 cursor-pointer"
                    title={isSelected ? 'Unselect from current order' : 'Select for current order'}
                  >
                    {isSelected ? (
                      <div className="w-5 h-5 bg-emerald-600 text-white rounded flex items-center justify-center shadow-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-white border-2 border-neutral-300 rounded hover:border-neutral-400" />
                    )}
                  </button>

                  <img 
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'} 
                    alt={item.name} 
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800';
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-1">
                      <h4 className="font-bold text-neutral-900 text-sm truncate">{item.name}</h4>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-neutral-400 hover:text-rose-600 transition p-0.5 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs text-emerald-700 font-bold mt-0.5">
                      {item.price} ETB
                    </div>

                    {/* Quantity & Item Subtotal */}
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-neutral-200">
                      <div className="flex items-center border border-neutral-300 rounded-md bg-white overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.id, quantity - 1)}
                          className="px-2 py-0.5 text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 font-bold text-xs text-neutral-900">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, quantity + 1)}
                          className="px-2 py-0.5 text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs font-extrabold text-neutral-900">
                        {item.price * quantity} ETB
                      </span>
                    </div>

                    {/* Item note input */}
                    <input
                      type="text"
                      placeholder="Note e.g. Extra spicy..."
                      value={notes || ''}
                      onChange={(e) => updateItemNotes(item.id, e.target.value)}
                      className="mt-2 w-full text-[11px] px-2 py-1 border border-neutral-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Totals & Checkout */}
        {cartItems.length > 0 && (
          <div className="p-5 border-t border-neutral-200 bg-neutral-50 space-y-3">
            <div className="space-y-1.5 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>
                  {selectedCartItems.length < cartItems.length 
                    ? `Selected Items (${selectedItemCount} items)` 
                    : 'Items Subtotal'}
                </span>
                <span className="font-semibold text-neutral-900">{subtotal} ETB</span>
              </div>
              <div className="flex justify-between">
                <span>VAT Tax ({vatRate}%)</span>
                <span className="font-semibold text-neutral-900">{taxAmount} ETB</span>
              </div>
              <div className="flex justify-between">
                <span>Service Charge ({serviceChargeRate}%)</span>
                <span className="font-semibold text-neutral-900">{serviceChargeAmount} ETB</span>
              </div>
              {applicableRoomServiceFee > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Room Delivery Fee</span>
                  <span className="font-semibold">{applicableRoomServiceFee} ETB</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-neutral-200 text-sm font-bold text-neutral-900">
                <span>
                  {selectedCartItems.length < cartItems.length ? 'Selected Total' : 'Grand Total'}
                </span>
                <span className="text-emerald-700 text-lg font-extrabold">{grandTotal} ETB</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={clearCart}
                className="px-3 py-3 border border-neutral-300 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Clear
              </button>

              <button
                onClick={handleCheckout}
                disabled={isNoneSelected && cartItems.length > 0}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {selectedCartItems.length < cartItems.length && selectedCartItems.length > 0 ? (
                  <>
                    Order Selected ({selectedItemCount}) <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Proceed to Checkout <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
