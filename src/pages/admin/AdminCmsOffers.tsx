import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { CmsOffer } from '../../types';
import MediaManager from '../../components/admin/MediaManager';
import { Loader2, Plus, Pencil, Trash2, X, Save } from 'lucide-react';

export default function AdminCmsOffers() {
  const [offers, setOffers] = useState<CmsOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOffer, setEditingOffer] = useState<CmsOffer | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchOffers = async () => {
    try {
      const q = query(collection(db, 'offers'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CmsOffer));
      setOffers(data);
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOffer) return;
    setSaving(true);
    
    try {
      const isNew = !editingOffer.id;
      const id = isNew ? `offer_${Date.now()}` : editingOffer.id;
      const offerToSave = { ...editingOffer, id };
      
      await setDoc(doc(db, 'offers', id), offerToSave);
      await fetchOffers();
      setEditingOffer(null);
    } catch (error) {
      console.error("Error saving offer:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    try {
      await deleteDoc(doc(db, 'offers', id));
      setOffers(offers.filter(o => o.id !== id));
    } catch (error) {
      console.error("Error deleting offer:", error);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Special Offers</h1>
        <button 
          onClick={() => setEditingOffer({ id: '', title: '', description: '', startDate: '', endDate: '', bannerUrl: '', active: true })}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Offer
        </button>
      </div>

      {editingOffer ? (
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-neutral-900">{editingOffer.id ? 'Edit Offer' : 'New Offer'}</h2>
            <button onClick={() => setEditingOffer(null)} className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Title</label>
                <input 
                  type="text" required
                  value={editingOffer.title}
                  onChange={e => setEditingOffer({...editingOffer, title: e.target.value})}
                  className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editingOffer.active}
                    onChange={e => setEditingOffer({...editingOffer, active: e.target.checked})}
                    className="w-5 h-5 text-neutral-900 border-neutral-300 rounded focus:ring-neutral-900"
                  />
                  <span className="font-medium text-neutral-700">Active</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Start Date</label>
                <input 
                  type="date" required
                  value={editingOffer.startDate}
                  onChange={e => setEditingOffer({...editingOffer, startDate: e.target.value})}
                  className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">End Date</label>
                <input 
                  type="date" required
                  value={editingOffer.endDate}
                  onChange={e => setEditingOffer({...editingOffer, endDate: e.target.value})}
                  className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
              <textarea 
                required rows={3}
                value={editingOffer.description}
                onChange={e => setEditingOffer({...editingOffer, description: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Banner Image</label>
              <div className="max-w-md">
                <MediaManager 
                  currentImageUrl={editingOffer.bannerUrl}
                  onImageSelected={(url) => setEditingOffer({...editingOffer, bannerUrl: url})}
                  folder="offers"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Saving...' : 'Save Offer'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map(offer => (
          <div key={offer.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col">
            <div className="h-40 bg-neutral-100 relative">
              {offer.bannerUrl ? (
                <img src={offer.bannerUrl} alt={offer.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400">No Image</div>
              )}
              {!offer.active && (
                <div className="absolute top-2 right-2 bg-neutral-900 text-white text-xs px-2 py-1 rounded">Inactive</div>
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="font-bold text-lg text-neutral-900 mb-1">{offer.title}</h3>
              <p className="text-xs text-neutral-500 mb-3">{offer.startDate} to {offer.endDate}</p>
              <p className="text-sm text-neutral-600 mb-4 line-clamp-3 flex-1">{offer.description}</p>
              
              <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-neutral-100">
                <button 
                  onClick={() => setEditingOffer(offer)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDelete(offer.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {offers.length === 0 && (
          <div className="col-span-full text-center py-12 text-neutral-500 bg-white rounded-xl border border-neutral-200">
            No special offers found. Create one above.
          </div>
        )}
      </div>
    </div>
  );
}
