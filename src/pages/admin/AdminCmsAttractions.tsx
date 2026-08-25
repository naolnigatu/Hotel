import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { CmsAttraction } from '../../types';
import MediaManager from '../../components/admin/MediaManager';
import ConfirmModal from '../../components/common/ConfirmModal';
import { Loader2, Plus, Pencil, Trash2, X, Save, MapPin } from 'lucide-react';

export default function AdminCmsAttractions() {
  const [attractions, setAttractions] = useState<CmsAttraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<CmsAttraction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAttractions = async () => {
    try {
      const docRef = doc(db, 'settings', 'cms_attractions');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAttractions(docSnap.data().data || []);
      }
    } catch (error) {
      console.error("Error fetching attractions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttractions();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSaving(true);
    
    try {
      const isNew = !editingItem.id;
      const id = isNew ? `attraction_${Date.now()}` : editingItem.id;
      const itemToSave = { ...editingItem, id };
      
      let newAttractions;
      if (isNew) {
        newAttractions = [...attractions, itemToSave];
      } else {
        newAttractions = attractions.map(a => a.id === id ? itemToSave : a);
      }
      
      await setDoc(doc(db, 'settings', 'cms_attractions'), { data: newAttractions });
      setAttractions(newAttractions);
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving attraction:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const newAttractions = attractions.filter(a => a.id !== deletingId);
      await setDoc(doc(db, 'settings', 'cms_attractions'), { data: newAttractions });
      setAttractions(newAttractions);
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting attraction:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Nearby Attractions</h1>
        <button 
          onClick={() => setEditingItem({ id: '', title: '', description: '', distance: '', imageUrl: '', googleMapsUrl: '' })}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Attraction
        </button>
      </div>

      {editingItem ? (
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-neutral-900">{editingItem.id ? 'Edit Attraction' : 'New Attraction'}</h2>
            <button onClick={() => setEditingItem(null)} className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Title</label>
                <input 
                  type="text" required
                  value={editingItem.title}
                  onChange={e => setEditingItem({...editingItem, title: e.target.value})}
                  className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Distance (e.g., '5 km away')</label>
                <input 
                  type="text" required
                  value={editingItem.distance}
                  onChange={e => setEditingItem({...editingItem, distance: e.target.value})}
                  className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
              <textarea 
                required rows={3}
                value={editingItem.description}
                onChange={e => setEditingItem({...editingItem, description: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Google Maps URL (Optional)</label>
              <input 
                type="url"
                value={editingItem.googleMapsUrl}
                onChange={e => setEditingItem({...editingItem, googleMapsUrl: e.target.value})}
                placeholder="https://maps.google.com/..."
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Image</label>
              <div className="max-w-md">
                <MediaManager 
                  currentImageUrl={editingItem.imageUrl}
                  onImageSelected={(url) => setEditingItem({...editingItem, imageUrl: url})}
                  folder="attractions"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Saving...' : 'Save Attraction'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {attractions.map(attraction => (
          <div key={attraction.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col">
            <div className="h-48 bg-neutral-100 relative">
              {attraction.imageUrl ? (
                <img src={attraction.imageUrl} alt={attraction.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400">No Image</div>
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-neutral-900">{attraction.title}</h3>
              </div>
              <p className="text-sm font-medium text-blue-600 mb-3">{attraction.distance}</p>
              <p className="text-sm text-neutral-600 mb-4 line-clamp-3 flex-1">{attraction.description}</p>
              
              <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-neutral-100">
                {attraction.googleMapsUrl && (
                  <a 
                    href={attraction.googleMapsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 text-neutral-600 hover:bg-neutral-50 rounded-lg transition-colors mr-auto"
                    title="View on Maps"
                  >
                    <MapPin className="w-5 h-5" />
                  </a>
                )}
                <button 
                  onClick={() => setEditingItem(attraction)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDeleteClick(attraction.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {attractions.length === 0 && (
          <div className="col-span-full text-center py-12 text-neutral-500 bg-white rounded-xl border border-neutral-200">
            No attractions found.
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Attraction"
        message="Are you sure you want to permanently delete this nearby attraction? It will be removed from the public website immediately."
        confirmText="Delete Attraction"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingId(null)}
      />
    </div>
  );
}
