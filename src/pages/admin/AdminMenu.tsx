import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { MenuItem } from '../../types';
import MediaManager from '../../components/admin/MediaManager';
import { Loader2, Plus, Pencil, Trash2, X, Save } from 'lucide-react';

export default function AdminMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    try {
      const q = query(collection(db, 'menu_items'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
      setItems(data);
    } catch (error) {
      console.error("Error fetching menu items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSaving(true);
    
    try {
      const isNew = !editingItem.id;
      const id = isNew ? `mi_${Date.now()}` : editingItem.id;
      const itemToSave = { ...editingItem, id };
      
      await setDoc(doc(db, 'menu_items', id), itemToSave);
      await fetchItems();
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving menu item:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await deleteDoc(doc(db, 'menu_items', id));
      setItems(items.filter(i => i.id !== id));
    } catch (error) {
      console.error("Error deleting menu item:", error);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>;
  }

  const categories = Array.from(new Set(items.map(item => item.category)));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Restaurant Menu</h1>
        <button 
          onClick={() => setEditingItem({ id: '', category: 'Starters', name: '', description: '', price: 0, isAvailable: true })}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {editingItem ? (
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-neutral-900">{editingItem.id ? 'Edit Item' : 'New Item'}</h2>
            <button onClick={() => setEditingItem(null)} className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
                <input 
                  type="text" required
                  value={editingItem.name}
                  onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                  className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Price ($)</label>
                <input 
                  type="number" required min="0" step="0.01"
                  value={editingItem.price || ''}
                  onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value) || 0})}
                  className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
                <input 
                  type="text" required
                  list="categories"
                  value={editingItem.category}
                  onChange={e => setEditingItem({...editingItem, category: e.target.value})}
                  className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                  placeholder="e.g. Starters, Mains, Drinks"
                />
                <datalist id="categories">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editingItem.isAvailable}
                    onChange={e => setEditingItem({...editingItem, isAvailable: e.target.checked})}
                    className="w-5 h-5 text-neutral-900 border-neutral-300 rounded focus:ring-neutral-900"
                  />
                  <span className="font-medium text-neutral-700">Available to Order</span>
                </label>
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
              <label className="block text-sm font-medium text-neutral-700 mb-2">Image</label>
              <div className="max-w-xs">
                <MediaManager 
                  currentImageUrl={editingItem.imageUrl}
                  onImageSelected={(url) => setEditingItem({...editingItem, imageUrl: url})}
                  folder="menu"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Saving...' : 'Save Item'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-6 py-4 font-medium text-neutral-500 text-sm">Image</th>
              <th className="px-6 py-4 font-medium text-neutral-500 text-sm">Name</th>
              <th className="px-6 py-4 font-medium text-neutral-500 text-sm">Category</th>
              <th className="px-6 py-4 font-medium text-neutral-500 text-sm">Price</th>
              <th className="px-6 py-4 font-medium text-neutral-500 text-sm">Status</th>
              <th className="px-6 py-4 font-medium text-neutral-500 text-sm text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-neutral-100 rounded flex items-center justify-center text-neutral-400 text-xs">No img</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-neutral-900">{item.name}</p>
                  <p className="text-sm text-neutral-500 truncate max-w-[200px]">{item.description}</p>
                </td>
                <td className="px-6 py-4 text-sm text-neutral-600">{item.category}</td>
                <td className="px-6 py-4 font-medium text-neutral-900">${item.price.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.isAvailable ? 'Available' : 'Sold Out'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setEditingItem(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                  No menu items found. Add your first item above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
