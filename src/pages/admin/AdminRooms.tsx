import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { RoomCategory } from '../../types';
import MediaManager from '../../components/admin/MediaManager';
import ConfirmModal from '../../components/common/ConfirmModal';
import { Loader2, Plus, Pencil, Trash2, X, Save } from 'lucide-react';

export default function AdminRooms() {
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCat, setEditingCat] = useState<RoomCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, 'room_categories'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoomCategory));
      setCategories(data);
    } catch (error) {
      console.error("Error fetching room categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat) return;
    setSaving(true);
    
    try {
      const isNew = !editingCat.id;
      const id = isNew ? `rc_${Date.now()}` : editingCat.id;
      const categoryToSave = { ...editingCat, id };
      
      await setDoc(doc(db, 'room_categories', id), categoryToSave);
      await fetchCategories();
      setEditingCat(null);
    } catch (error) {
      console.error("Error saving room category:", error);
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
      await deleteDoc(doc(db, 'room_categories', deletingId));
      setCategories(categories.filter(c => c.id !== deletingId));
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting category:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Room Categories</h1>
        <button 
          onClick={() => setEditingCat({ id: '', name: '', description: '', basePrice: 0, amenities: [], imageUrls: [] })}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {editingCat ? (
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-neutral-900">{editingCat.id ? 'Edit Category' : 'New Category'}</h2>
            <button onClick={() => setEditingCat(null)} className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
                <input 
                  type="text" required
                  value={editingCat.name}
                  onChange={e => setEditingCat({...editingCat, name: e.target.value})}
                  className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Base Price ($)</label>
                <input 
                  type="number" required min="0" step="0.01"
                  value={editingCat.basePrice || ''}
                  onChange={e => setEditingCat({...editingCat, basePrice: parseFloat(e.target.value) || 0})}
                  className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
              <textarea 
                required rows={3}
                value={editingCat.description}
                onChange={e => setEditingCat({...editingCat, description: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Amenities (comma separated)</label>
              <input 
                type="text"
                value={editingCat.amenities.join(', ')}
                onChange={e => setEditingCat({...editingCat, amenities: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                placeholder="WiFi, AC, TV, Mini-bar"
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Images</label>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {editingCat.imageUrls.map((url, i) => (
                  <div key={i} className="relative shrink-0 w-48 h-32 rounded-lg overflow-hidden border border-neutral-200">
                    <img src={url} alt="Room" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setEditingCat({...editingCat, imageUrls: editingCat.imageUrls.filter((_, idx) => idx !== i)})}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="shrink-0 w-48 h-32">
                  <MediaManager 
                    onImageSelected={(url) => setEditingCat({...editingCat, imageUrls: [...editingCat.imageUrls, url]})}
                    folder="rooms"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(category => (
          <div key={category.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col">
            <div className="h-48 bg-neutral-100 relative">
              {category.imageUrls?.[0] ? (
                <img src={category.imageUrls[0]} alt={category.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400">No Image</div>
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-neutral-900">{category.name}</h3>
                <span className="font-semibold text-neutral-900">${category.basePrice}/night</span>
              </div>
              <p className="text-sm text-neutral-600 mb-4 line-clamp-2 flex-1">{category.description}</p>
              
              <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-neutral-100">
                <button 
                  onClick={() => setEditingCat(category)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDeleteClick(category.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Room Category"
        message="Are you sure you want to delete this room category? This will affect listings in the booking system."
        confirmText="Delete Category"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingId(null)}
      />
    </div>
  );
}
