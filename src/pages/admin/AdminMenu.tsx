import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { MenuItem, MenuCategory, KitchenStation } from '../../types';
import MediaManager from '../../components/admin/MediaManager';
import { useAuth } from '../../context/AuthContext';
import { handleFirestoreError, OperationType, logAuditAction } from '../../lib/firestoreUtils';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Save, 
  UtensilsCrossed, 
  ChefHat, 
  FolderPlus, 
  Search, 
  Layers, 
  Clock, 
  Flame, 
  Leaf, 
  Check, 
  Filter,
  ArrowUpDown,
  Tag,
  AlertCircle
} from 'lucide-react';

export default function AdminMenu() {
  const { userData } = useAuth();
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items');

  // Firestore Data State
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form States
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStation, setFilterStation] = useState<string>('All');
  const [filterAvailability, setFilterAvailability] = useState<'All' | 'Available' | 'Sold Out'>('All');

  // Notice & Saving States
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form helper for ingredients / allergens
  const [ingredientsText, setIngredientsText] = useState('');
  const [allergensText, setAllergensText] = useState('');

  // Category Form State
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    displayOrder: 1,
    isActive: true
  });

  // Listen to menu_items
  useEffect(() => {
    const qItems = query(collection(db, 'menu_items'));
    const unsubItems = onSnapshot(qItems, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as MenuItem[];
      setItems(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'menu_items');
    });

    return () => unsubItems();
  }, []);

  // Listen to menu_categories
  useEffect(() => {
    const qCategories = query(collection(db, 'menu_categories'), orderBy('displayOrder', 'asc'));
    const unsubCategories = onSnapshot(qCategories, async (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as MenuCategory[];

      setCategories(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'menu_categories');
      setLoading(false);
    });

    return () => unsubCategories();
  }, []);

  // Listen to kitchen_stations
  useEffect(() => {
    const qStations = query(collection(db, 'kitchen_stations'), orderBy('displayOrder', 'asc'));
    const unsubStations = onSnapshot(qStations, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as KitchenStation[];
      setStations(data);
    }, (error) => {
      console.error("Error loading stations in AdminMenu:", error);
    });

    return () => unsubStations();
  }, []);

  // Auto-seed default categories if database is completely empty
  useEffect(() => {
    const seedInitialCategories = async () => {
      if (!loading && categories.length === 0) {
        try {
          const defaultCats = [
            { name: 'Starters & Appetizers', description: 'Fresh salads, soups, and appetizing finger foods', displayOrder: 1 },
            { name: 'Traditional Ethiopian', description: 'Authentic local dishes including Tibs, Doro Wat, and Beyaynetu', displayOrder: 2 },
            { name: 'Main Courses', description: 'Steaks, poultry, pasta, grilled meats, and seafood', displayOrder: 3 },
            { name: 'Desserts & Pastries', description: 'Sweet delicacies, cakes, and ice cream', displayOrder: 4 },
            { name: 'Hot Beverages', description: 'Ethiopian specialty coffee, herbal teas, and hot chocolate', displayOrder: 5 },
            { name: 'Cold Drinks & Juices', description: 'Fresh squeezed juices, smoothies, and soft drinks', displayOrder: 6 },
            { name: 'Alcoholic & Cocktails', description: 'Wines, beers, premium spirits, and signature cocktails', displayOrder: 7 }
          ];

          for (const cat of defaultCats) {
            const catId = `cat_${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
            await setDoc(doc(db, 'menu_categories', catId), {
              id: catId,
              name: cat.name,
              description: cat.description,
              displayOrder: cat.displayOrder,
              isActive: true,
              createdAt: Date.now()
            }, { merge: true });
          }
        } catch (e) {
          console.error("Could not seed default categories:", e);
        }
      }
    };

    seedInitialCategories();
  }, [loading, categories.length]);

  // Handle opening Item Modal
  const handleOpenAddItem = () => {
    const defaultCat = categories.length > 0 ? categories[0].name : 'Starters & Appetizers';
    const defaultCatId = categories.length > 0 ? categories[0].id : '';
    const defaultStation = stations.length > 0 ? stations[0] : null;

    setEditingItem({
      id: '',
      name: '',
      category: defaultCat,
      categoryId: defaultCatId,
      description: '',
      price: 0,
      isAvailable: true,
      imageUrl: '',
      kitchenStationId: defaultStation?.id || '',
      kitchenStationName: defaultStation?.name || '',
      prepTimeMinutes: 15,
      isSpicy: false,
      isVegetarian: false,
      isVegan: false,
      isHalal: false,
      ingredients: [],
      allergens: []
    });
    setIngredientsText('');
    setAllergensText('');
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem({ ...item });
    setIngredientsText((item.ingredients || []).join(', '));
    setAllergensText((item.allergens || []).join(', '));
  };

  // Handle saving Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim()) return;
    setSaving(true);

    try {
      const isNew = !editingItem.id;
      const id = isNew ? `item_${Date.now()}` : editingItem.id;
      
      // Parse ingredients & allergens
      const parsedIngredients = ingredientsText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      
      const parsedAllergens = allergensText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      // Resolve Station Name if stationId selected
      let stationName = editingItem.kitchenStationName || '';
      if (editingItem.kitchenStationId) {
        const matched = stations.find(s => s.id === editingItem.kitchenStationId);
        if (matched) stationName = matched.name;
      } else {
        stationName = '';
      }

      // Resolve Category ID if category name selected
      let matchedCatId = editingItem.categoryId || '';
      const matchedCat = categories.find(c => c.name.toLowerCase() === editingItem.category.toLowerCase());
      if (matchedCat) {
        matchedCatId = matchedCat.id;
      }

      const itemToSave: MenuItem = {
        ...editingItem,
        id,
        name: editingItem.name.trim(),
        category: editingItem.category.trim(),
        categoryId: matchedCatId,
        description: editingItem.description.trim(),
        price: Number(editingItem.price) || 0,
        isAvailable: editingItem.isAvailable ?? true,
        imageUrl: editingItem.imageUrl || '',
        kitchenStationId: editingItem.kitchenStationId || '',
        kitchenStationName: stationName,
        prepTimeMinutes: Number(editingItem.prepTimeMinutes) || 15,
        isSpicy: Boolean(editingItem.isSpicy),
        isVegetarian: Boolean(editingItem.isVegetarian),
        isVegan: Boolean(editingItem.isVegan),
        isHalal: Boolean(editingItem.isHalal),
        ingredients: parsedIngredients,
        allergens: parsedAllergens
      };

      await setDoc(doc(db, 'menu_items', id), itemToSave);

      // Also ensure this category exists in menu_categories
      if (!matchedCat && editingItem.category.trim()) {
        const newCatId = `cat_${Date.now()}`;
        await setDoc(doc(db, 'menu_categories', newCatId), {
          id: newCatId,
          name: editingItem.category.trim(),
          displayOrder: categories.length + 1,
          isActive: true,
          createdAt: Date.now()
        }, { merge: true });
      }

      await logAuditAction(
        userData?.uid || 'admin',
        userData?.name || 'Admin Staff',
        userData?.role || 'admin',
        `${isNew ? 'Created' : 'Updated'} Menu Item "${editingItem.name}" (${itemToSave.price} ETB)`,
        'Menu',
        `Category: ${itemToSave.category}, Station: ${itemToSave.kitchenStationName || 'None'}`
      );

      setNotice({ type: 'success', text: `Menu item "${editingItem.name}" saved successfully.` });
      setEditingItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'menu_items');
      setNotice({ type: 'error', text: 'Failed to save menu item.' });
    } finally {
      setSaving(false);
    }
  };

  // Handle deleting Item
  const handleDeleteItem = async (item: MenuItem) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}" from the menu?`)) return;
    try {
      await deleteDoc(doc(db, 'menu_items', item.id));
      await logAuditAction(
        userData?.uid || 'admin',
        userData?.name || 'Admin Staff',
        userData?.role || 'admin',
        `Deleted Menu Item "${item.name}"`,
        'Menu'
      );
      setNotice({ type: 'success', text: `Item "${item.name}" removed.` });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `menu_items/${item.id}`);
      setNotice({ type: 'error', text: 'Failed to delete menu item.' });
    }
  };

  // Category Management Handlers
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      displayOrder: categories.length + 1,
      isActive: true
    });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: MenuCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description || '',
      displayOrder: cat.displayOrder || 1,
      isActive: cat.isActive !== false
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;
    setSaving(true);

    try {
      const catId = editingCategory ? editingCategory.id : `cat_${Date.now()}`;
      const payload: MenuCategory = {
        id: catId,
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
        displayOrder: Number(categoryForm.displayOrder) || 1,
        isActive: categoryForm.isActive,
        createdAt: editingCategory?.createdAt || Date.now()
      };

      await setDoc(doc(db, 'menu_categories', catId), payload, { merge: true });

      // If renaming an existing category, update items that were under old name
      if (editingCategory && editingCategory.name !== categoryForm.name.trim()) {
        const itemsToUpdate = items.filter(i => i.category === editingCategory.name || i.categoryId === editingCategory.id);
        for (const itm of itemsToUpdate) {
          await setDoc(doc(db, 'menu_items', itm.id), {
            ...itm,
            category: categoryForm.name.trim(),
            categoryId: catId
          }, { merge: true });
        }
      }

      await logAuditAction(
        userData?.uid || 'admin',
        userData?.name || 'Admin Staff',
        userData?.role || 'admin',
        `${editingCategory ? 'Updated' : 'Created'} Menu Category "${categoryForm.name}"`,
        'Menu',
        `Order: ${categoryForm.displayOrder}, Active: ${categoryForm.isActive}`
      );

      setNotice({ type: 'success', text: `Category "${categoryForm.name}" saved.` });
      setIsCategoryModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'menu_categories');
      setNotice({ type: 'error', text: 'Failed to save menu category.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (cat: MenuCategory) => {
    const attachedItems = items.filter(i => i.category === cat.name || i.categoryId === cat.id);
    if (attachedItems.length > 0) {
      const proceed = window.confirm(
        `Category "${cat.name}" has ${attachedItems.length} menu items attached.\nDeleting it will not delete the items, but their category label may become unmanaged. Proceed?`
      );
      if (!proceed) return;
    } else {
      if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    }

    try {
      await deleteDoc(doc(db, 'menu_categories', cat.id));
      await logAuditAction(
        userData?.uid || 'admin',
        userData?.name || 'Admin Staff',
        userData?.role || 'admin',
        `Deleted Menu Category "${cat.name}"`,
        'Menu'
      );
      setNotice({ type: 'success', text: `Category "${cat.name}" deleted.` });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `menu_categories/${cat.id}`);
      setNotice({ type: 'error', text: 'Failed to delete category.' });
    }
  };

  // Quick Create Category directly from Item form
  const handleQuickCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCategoryName.trim()) return;

    try {
      const newCatId = `cat_${Date.now()}`;
      const newName = quickCategoryName.trim();
      
      const payload: MenuCategory = {
        id: newCatId,
        name: newName,
        displayOrder: categories.length + 1,
        isActive: true,
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'menu_categories', newCatId), payload);

      if (editingItem) {
        setEditingItem({
          ...editingItem,
          category: newName,
          categoryId: newCatId
        });
      }

      setQuickCategoryName('');
      setShowQuickCategoryModal(false);
      setNotice({ type: 'success', text: `Created category "${newName}" and applied to current item.` });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'menu_categories');
      setNotice({ type: 'error', text: 'Failed to create category.' });
    }
  };

  // Toggle item availability in-place
  const handleToggleItemAvailability = async (item: MenuItem) => {
    try {
      const updatedStatus = !item.isAvailable;
      await setDoc(doc(db, 'menu_items', item.id), {
        ...item,
        isAvailable: updatedStatus
      }, { merge: true });
      
      setNotice({ 
        type: 'success', 
        text: `"${item.name}" marked as ${updatedStatus ? 'Available' : 'Sold Out'}.` 
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `menu_items/${item.id}`);
    }
  };

  // Filtered Menu Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.ingredients || []).some(ing => ing.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = filterCategory === 'All' || item.category === filterCategory;
      
      const matchesStation = filterStation === 'All' || 
        (filterStation === 'Unassigned' && !item.kitchenStationId) ||
        item.kitchenStationId === filterStation ||
        item.kitchenStationName === filterStation;

      const matchesAvail = 
        filterAvailability === 'All' ? true :
        filterAvailability === 'Available' ? Boolean(item.isAvailable) :
        !item.isAvailable;

      return matchesSearch && matchesCat && matchesStation && matchesAvail;
    });
  }, [items, searchQuery, filterCategory, filterStation, filterAvailability]);

  // Distinct category names list from DB + items
  const allCategoryNames = useMemo(() => {
    const set = new Set(categories.map(c => c.name));
    items.forEach(i => { if (i.category) set.add(i.category); });
    return Array.from(set);
  }, [categories, items]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Banner & Action Header */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-neutral-900 text-white rounded-xl shadow-xs">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Restaurant Menu Management</h1>
            <p className="text-sm text-neutral-500">
              Manage food & beverage catalog, categories, pricing (ETB), and station routing
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenAddCategory}
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-sm font-bold transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-neutral-600" />
            + Add Category
          </button>
          <button 
            onClick={handleOpenAddItem}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Add Menu Item
          </button>
        </div>
      </div>

      {/* Notifications Notice */}
      {notice && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between transition-all ${
          notice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="font-bold text-xs hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => setActiveTab('items')}
          className={`pb-3 px-6 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'items'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          Menu Items ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 px-6 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'categories'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <Layers className="w-4 h-4" />
          Menu Categories ({categories.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MENU ITEMS VIEW                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'items' && (
        <div className="space-y-6">
          {/* Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search item, ingredient..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                >
                  <option value="All">All Categories ({allCategoryNames.length})</option>
                  {allCategoryNames.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Station Filter */}
              <div>
                <select
                  value={filterStation}
                  onChange={(e) => setFilterStation(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                >
                  <option value="All">All Stations</option>
                  {stations.map(st => (
                    <option key={st.id} value={st.id}>Station: {st.name}</option>
                  ))}
                  <option value="Unassigned">Unassigned Station</option>
                </select>
              </div>

              {/* Availability Filter */}
              <div>
                <select
                  value={filterAvailability}
                  onChange={(e) => setFilterAvailability(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                >
                  <option value="All">All Availability</option>
                  <option value="Available">Available for Ordering</option>
                  <option value="Sold Out">Sold Out / Hidden</option>
                </select>
              </div>
            </div>

            {/* Category Quick Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-neutral-400 font-bold uppercase tracking-wider text-[10px] mr-1 shrink-0">Quick Filter:</span>
              <button
                onClick={() => setFilterCategory('All')}
                className={`px-3 py-1 rounded-full font-bold transition shrink-0 cursor-pointer ${
                  filterCategory === 'All' 
                    ? 'bg-neutral-900 text-white' 
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                All ({items.length})
              </button>
              {categories.map(cat => {
                const count = items.filter(i => i.category === cat.name || i.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCategory(cat.name)}
                    className={`px-3 py-1 rounded-full font-bold transition shrink-0 cursor-pointer ${
                      filterCategory === cat.name 
                        ? 'bg-neutral-900 text-white' 
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Items Table / List */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-5 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">Item</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">Category</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">Station</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">Price (ETB)</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-sm">
                  {filteredItems.map(item => {
                    const assignedStation = stations.find(s => s.id === item.kitchenStationId) || 
                      (item.kitchenStationName ? { name: item.kitchenStationName } : null);

                    return (
                      <tr key={item.id} className="hover:bg-neutral-50/80 transition-colors">
                        {/* Item Photo & Details */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt={item.name} 
                                className="w-14 h-14 rounded-xl object-cover border border-neutral-200 shrink-0" 
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-14 h-14 bg-neutral-100 border border-neutral-200 rounded-xl flex items-center justify-center text-neutral-400 text-xs font-medium shrink-0">
                                No img
                              </div>
                            )}
                            <div className="min-w-0 max-w-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-neutral-900 truncate">{item.name}</span>
                                {item.isSpicy && <Flame className="w-3.5 h-3.5 text-red-500 shrink-0" title="Spicy" />}
                                {item.isVegetarian && <Leaf className="w-3.5 h-3.5 text-emerald-500 shrink-0" title="Vegetarian" />}
                              </div>
                              <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">{item.description}</p>
                              {item.prepTimeMinutes ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 mt-1 font-semibold">
                                  <Clock className="w-3 h-3" /> ~{item.prepTimeMinutes} mins
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-100 text-neutral-800 rounded-lg text-xs font-bold border border-neutral-200">
                            <Tag className="w-3 h-3 text-neutral-500" />
                            {item.category}
                          </span>
                        </td>

                        {/* Station */}
                        <td className="px-5 py-4">
                          {assignedStation ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 rounded-lg text-xs font-bold border border-blue-200">
                              <ChefHat className="w-3.5 h-3.5 text-blue-600" />
                              {assignedStation.name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 text-neutral-400 rounded text-[11px] font-medium">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Price */}
                        <td className="px-5 py-4 font-bold text-neutral-900 whitespace-nowrap">
                          {Number(item.price).toLocaleString()} <span className="text-xs font-semibold text-neutral-500">ETB</span>
                        </td>

                        {/* Status Toggle */}
                        <td className="px-5 py-4">
                          <button
                            onClick={() => handleToggleItemAvailability(item)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                              item.isAvailable 
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                            title="Click to toggle availability"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${item.isAvailable ? 'bg-emerald-600' : 'bg-red-600'}`} />
                            {item.isAvailable ? 'Available' : 'Sold Out'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={() => handleOpenEditItem(item)} 
                              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Menu Item"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteItem(item)} 
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                        <UtensilsCrossed className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                        <p className="font-semibold text-neutral-700">No menu items found</p>
                        <p className="text-xs text-neutral-400 mt-1">
                          {searchQuery || filterCategory !== 'All' || filterStation !== 'All'
                            ? 'Try resetting your search filters.'
                            : 'Click "+ Add Menu Item" above to add food or drinks to your menu.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MENU CATEGORIES VIEW                                               */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Configured Categories</h2>
              <p className="text-xs text-neutral-500">
                Organize menu items into customer-facing sections and set display priority order
              </p>
            </div>
            <button
              onClick={handleOpenAddCategory}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const itemCount = items.filter(i => i.category === cat.name || i.categoryId === cat.id).length;
              return (
                <div 
                  key={cat.id} 
                  className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-3 relative hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        Display Order #{cat.displayOrder}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        cat.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {cat.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-neutral-900 mt-1">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{cat.description}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-600">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditCategory(cat)}
                        className="p-1.5 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Category"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {categories.length === 0 && (
              <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-neutral-200">
                <FolderPlus className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-neutral-800">No categories created yet</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                  Add categories like "Starters", "Traditional Ethiopian", "Main Dishes", "Pastries", or "Beverages" to categorize your dishes.
                </p>
                <button
                  onClick={handleOpenAddCategory}
                  className="mt-4 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Your First Category
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT MENU ITEM                                             */}
      {/* ========================================================================= */}
      {editingItem && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-neutral-200 max-w-2xl w-full p-6 space-y-6 shadow-2xl my-8">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-neutral-900" />
                <h2 className="text-lg font-bold text-neutral-900">
                  {editingItem.id ? 'Edit Menu Item' : 'New Menu Item'}
                </h2>
              </div>
              <button 
                onClick={() => setEditingItem(null)} 
                className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              {/* Row 1: Name & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">
                    Dish / Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Special Beef Tibs, Shiro Wat, Avocado Salad"
                    value={editingItem.name}
                    onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">
                    Price (ETB) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g. 350"
                    value={editingItem.price || ''}
                    onChange={e => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Category & Station */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category Selector with Quick Add */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block font-bold text-neutral-700 uppercase">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowQuickCategoryModal(true)}
                      className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> New Category
                    </button>
                  </div>
                  <select
                    value={editingItem.category}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const matched = categories.find(c => c.name === selectedName);
                      setEditingItem({
                        ...editingItem,
                        category: selectedName,
                        categoryId: matched?.id || ''
                      });
                    }}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  >
                    {allCategoryNames.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    {allCategoryNames.length === 0 && (
                      <option value="Starters & Appetizers">Starters & Appetizers</option>
                    )}
                  </select>
                </div>

                {/* Station Selector */}
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1 flex items-center justify-between">
                    <span>Assigned Station</span>
                    {stations.length === 0 && (
                      <span className="text-[10px] text-amber-600 normal-case font-medium">
                        No stations defined in KDS yet
                      </span>
                    )}
                  </label>
                  <select
                    value={editingItem.kitchenStationId || ''}
                    onChange={(e) => {
                      const stationId = e.target.value;
                      const matched = stations.find(s => s.id === stationId);
                      setEditingItem({
                        ...editingItem,
                        kitchenStationId: stationId,
                        kitchenStationName: matched ? matched.name : ''
                      });
                    }}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  >
                    <option value="">-- No Specific Station (All / Default) --</option>
                    {stations.map(st => (
                      <option key={st.id} value={st.id}>
                        🍳 {st.name} {st.isActive ? '' : '(Inactive)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Description */}
              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe the dish ingredients, preparation style, flavors..."
                  value={editingItem.description}
                  onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-xs text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                />
              </div>

              {/* Row 4: Prep Time, Dietary Flags, Availability */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-neutral-700">Prep Time:</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="15"
                      value={editingItem.prepTimeMinutes || 15}
                      onChange={e => setEditingItem({ ...editingItem, prepTimeMinutes: parseInt(e.target.value) || 15 })}
                      className="w-16 px-2 py-1 bg-white border border-neutral-200 rounded-lg text-xs font-bold text-center text-neutral-900"
                    />
                    <span className="text-neutral-500 font-medium">mins</span>
                  </div>

                  <div className="h-4 w-px bg-neutral-200 hidden sm:block" />

                  <label className="flex items-center gap-1.5 font-bold text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingItem.isSpicy || false}
                      onChange={e => setEditingItem({ ...editingItem, isSpicy: e.target.checked })}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                    />
                    <Flame className="w-3.5 h-3.5 text-red-500" /> Spicy
                  </label>

                  <label className="flex items-center gap-1.5 font-bold text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingItem.isVegetarian || false}
                      onChange={e => setEditingItem({ ...editingItem, isVegetarian: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <Leaf className="w-3.5 h-3.5 text-emerald-500" /> Vegetarian
                  </label>

                  <label className="flex items-center gap-1.5 font-bold text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingItem.isHalal || false}
                      onChange={e => setEditingItem({ ...editingItem, isHalal: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    Halal
                  </label>
                </div>

                <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
                  <span className="font-bold text-neutral-800">Available on Restaurant Menu</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingItem.isAvailable}
                      onChange={e => setEditingItem({ ...editingItem, isAvailable: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Row 5: Ingredients & Allergens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">
                    Ingredients (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Beef sirloin, rosemary, garlic, butter, berbere"
                    value={ingredientsText}
                    onChange={e => setIngredientsText(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-xs text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">
                    Allergens (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dairy, Gluten, Peanuts, Eggs"
                    value={allergensText}
                    onChange={e => setAllergensText(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-xs text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 6: Image Selection */}
              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1.5">
                  Item Photo
                </label>
                <div className="max-w-sm">
                  <MediaManager
                    currentImageUrl={editingItem.imageUrl}
                    onImageSelected={(url) => setEditingItem({ ...editingItem, imageUrl: url })}
                    folder="restaurant_menu"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-neutral-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving Item...' : 'Save Menu Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT MENU CATEGORY                                         */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-neutral-200 max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-neutral-900" />
                <h2 className="text-base font-bold text-neutral-900">
                  {editingCategory ? 'Edit Menu Category' : 'Create Menu Category'}
                </h2>
              </div>
              <button 
                onClick={() => setIsCategoryModalOpen(false)} 
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Traditional Ethiopian, Pastries & Desserts, Cocktails"
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description shown to guests under category section..."
                  value={categoryForm.description}
                  onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-xs text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">
                  Display Order Priority
                </label>
                <input
                  type="number"
                  min="1"
                  value={categoryForm.displayOrder}
                  onChange={e => setCategoryForm({ ...categoryForm, displayOrder: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Lower numbers appear first on the guest restaurant menu tabs.
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <div>
                  <span className="font-bold text-neutral-800 block">Active Status</span>
                  <span className="text-[10px] text-neutral-400">Show this category on the restaurant menu</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryForm({ ...categoryForm, isActive: !categoryForm.isActive })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    categoryForm.isActive 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-neutral-200 text-neutral-600'
                  }`}
                >
                  {categoryForm.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: QUICK CREATE CATEGORY (From Item Form)                           */}
      {/* ========================================================================= */}
      {showQuickCategoryModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-2xl border border-neutral-200 max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-2.5">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-emerald-600" />
                Add New Category
              </h3>
              <button 
                onClick={() => setShowQuickCategoryModal(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Traditional Ethiopian, Desserts"
                  value={quickCategoryName}
                  onChange={e => setQuickCategoryName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickCategoryModal(false)}
                  className="px-3 py-2 bg-neutral-100 text-neutral-700 rounded-xl font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl font-semibold text-xs"
                >
                  Create & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
