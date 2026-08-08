import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { CmsAmenity } from '../../types';
import { Loader2, Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import * as Icons from 'lucide-react';

export default function AdminCmsAmenities() {
  const [amenities, setAmenities] = useState<CmsAmenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<CmsAmenity | null>(null);

  const fetchAmenities = async () => {
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

  useEffect(() => {
    fetchAmenities();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSaving(true);
    
    try {
      const isNew = !editingItem.id;
      const id = isNew ? `amenity_${Date.now()}` : editingItem.id;
      const itemToSave = { ...editingItem, id };
      
      let newAmenities;
      if (isNew) {
        newAmenities = [...amenities, itemToSave];
      } else {
        newAmenities = amenities.map(a => a.id === id ? itemToSave : a);
      }
      
      await setDoc(doc(db, 'settings', 'cms_amenities'), { data: newAmenities });
      setAmenities(newAmenities);
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving amenity:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this amenity?')) return;
    try {
      const newAmenities = amenities.filter(a => a.id !== id);
      await setDoc(doc(db, 'settings', 'cms_amenities'), { data: newAmenities });
      setAmenities(newAmenities);
    } catch (error) {
      console.error("Error deleting amenity:", error);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>;
  }

  // Pre-defined list of common icons
  const commonIcons = ['Wifi', 'Coffee', 'Car', 'Tv', 'Wind', 'Dumbbell', 'Waves', 'Utensils', 'ShieldCheck'];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Amenities</h1>
        <button 
          onClick={() => setEditingItem({ id: '', icon: 'Wifi', title: '', description: '' })}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Amenity
        </button>
      </div>

      {editingItem ? (
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-neutral-900">{editingItem.id ? 'Edit Amenity' : 'New Amenity'}</h2>
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
                <label className="block text-sm font-medium text-neutral-700 mb-1">Icon Name (Lucide React)</label>
                <select 
                  value={editingItem.icon}
                  onChange={e => setEditingItem({...editingItem, icon: e.target.value})}
                  className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500"
                >
                  {commonIcons.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
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

            <div className="flex justify-end pt-4">
              <button 
                type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Saving...' : 'Save Amenity'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {amenities.map(amenity => {
          const IconComponent = (Icons as any)[amenity.icon] || Icons.HelpCircle;
          return (
            <div key={amenity.id} className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                <IconComponent className="w-6 h-6 text-neutral-700" />
              </div>
              <h3 className="font-bold text-lg text-neutral-900 mb-2">{amenity.title}</h3>
              <p className="text-sm text-neutral-600 mb-6 flex-1">{amenity.description}</p>
              
              <div className="flex gap-2 w-full justify-center border-t border-neutral-100 pt-4 mt-auto">
                <button 
                  onClick={() => setEditingItem(amenity)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDelete(amenity.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
        {amenities.length === 0 && (
          <div className="col-span-full text-center py-12 text-neutral-500 bg-white rounded-xl border border-neutral-200">
            No amenities found.
          </div>
        )}
      </div>
    </div>
  );
}
