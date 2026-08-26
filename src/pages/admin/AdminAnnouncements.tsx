import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Announcement, AnnouncementCategory } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../lib/auditLogger';
import MediaManager from '../../components/admin/MediaManager';
import CopyButton from '../../components/common/CopyButton';
import ConfirmModal from '../../components/common/ConfirmModal';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { 
  Megaphone, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Save, 
  Eye, 
  Pin, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Image as ImageIcon,
  ExternalLink,
  Tag,
  AlertCircle
} from 'lucide-react';

const CATEGORIES: AnnouncementCategory[] = [
  'General',
  'Event',
  'Dining & Bar',
  'Maintenance',
  'Special Notice',
  'Facility & Amenities',
  'Seasonal Celebration'
];

const INITIAL_SAMPLE_ANNOUNCEMENTS: Omit<Announcement, 'id'>[] = [
  {
    title: "Weekend Traditional Coffee Ceremony & Live Acoustic Oromo Music",
    paragraph: "Join us every Friday and Saturday evening at the Garden Pavilion for an authentic Ethiopian coffee ceremony roasted fresh before your eyes, accompanied by traditional acoustic melodies and light refreshments.\n\nAll hotel guests receive complimentary traditional popcorn (fendisha) and herbal tea. Special dinner buffet available starting from 6:30 PM.",
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=1200",
    imageCaption: "Traditional Ethiopian coffee brewing at the Garden Pavilion",
    category: "Event",
    isPublished: true,
    isPinned: true,
    badge: "Every Weekend",
    publishedBy: "Hotel Management",
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2
  },
  {
    title: "Woliso Natural Thermal Spring & Spa Weekend Wellness Package",
    paragraph: "Relax and rejuvenate in our natural mineral-rich thermal water pools and signature aromatherapy steam rooms. This month, enjoy a 20% discount on all full-body massage sessions when booked alongside any deluxe suite reservation.\n\nPlease contact our front desk or spa reception to reserve your preferred wellness slot.",
    imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
    imageCaption: "Thermal hydrotherapy pool and wellness lounge",
    category: "Facility & Amenities",
    isPublished: true,
    isPinned: false,
    badge: "Wellness Special",
    publishedBy: "Spa Director",
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5
  },
  {
    title: "Executive Chef's New Seasonal Dining Menu Now Available",
    paragraph: "Our culinary team has unveiled an exquisite new à la carte dinner menu featuring organic ingredients sourced directly from local highland farms in Oromia. Highlights include slow-braised Lamb Shank with rosemary jus, fresh Tilapia fillet, and handcrafted pastries.\n\nRoom service orders and table reservations can be placed directly through the hotel website or by dialing extension 102.",
    imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1200",
    imageCaption: "Signature gourmet dishes at Woliso Hotel Restaurant",
    category: "Dining & Bar",
    isPublished: true,
    isPinned: false,
    badge: "New Menu",
    publishedBy: "Executive Chef",
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 7
  }
];

export default function AdminAnnouncements() {
  const { userData, currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Partial<Announcement> | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [previewItem, setPreviewItem] = useState<Announcement | null>(null);
  const [deletingItem, setDeletingItem] = useState<Announcement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Lock body scroll when modals are open
  useBodyScrollLock(!!editingItem || !!previewItem || showSeedModal);

  useEffect(() => {
    const q = query(collection(db, 'announcements'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Announcement[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Announcement);
      });
      // Sort: Pinned first, then by createdAt desc
      list.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      setAnnouncements(list);
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to announcements:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStartNew = () => {
    setEditingItem({
      id: '',
      title: '',
      paragraph: '',
      imageUrl: '',
      imageCaption: '',
      category: 'General',
      isPublished: true,
      isPinned: false,
      badge: '',
      publishedBy: userData?.name || 'Hotel Management',
    });
  };

  const handleSeedDefaults = async () => {
    setShowSeedModal(false);
    setSaving(true);
    try {
      for (const sample of INITIAL_SAMPLE_ANNOUNCEMENTS) {
        const id = `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await setDoc(doc(db, 'announcements', id), {
          ...sample,
          id,
          publishedBy: userData?.name || sample.publishedBy
        });
      }
      setStatusMessage({ type: 'success', text: 'Sample announcements published successfully!' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Error seeding announcements:", err);
      setStatusMessage({ type: 'error', text: 'Failed to seed announcements.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.title?.trim() || !editingItem.paragraph?.trim()) {
      alert("Please fill in both the Title and the Paragraph.");
      return;
    }

    setSaving(true);
    try {
      const isNew = !editingItem.id;
      const id = isNew ? `ann_${Date.now()}` : editingItem.id!;
      const now = Date.now();

      const payload: Announcement = {
        id,
        title: editingItem.title.trim(),
        paragraph: editingItem.paragraph.trim(),
        imageUrl: editingItem.imageUrl?.trim() || '',
        imageCaption: editingItem.imageCaption?.trim() || '',
        category: (editingItem.category as AnnouncementCategory) || 'General',
        isPublished: editingItem.isPublished ?? true,
        isPinned: editingItem.isPinned ?? false,
        badge: editingItem.badge?.trim() || '',
        publishedBy: editingItem.publishedBy || userData?.name || 'Hotel Management',
        publishedByRole: userData?.role || 'admin',
        createdAt: editingItem.createdAt || now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'announcements', id), payload);

      await logAuditAction(
        currentUser?.uid || 'admin',
        userData?.name || 'Admin',
        userData?.role || 'admin',
        isNew ? 'Create Announcement' : 'Update Announcement',
        'Announcements',
        `Announcement "${payload.title}" (${payload.category}) ${payload.isPublished ? 'published' : 'saved as draft'}.`
      );

      setStatusMessage({ 
        type: 'success', 
        text: isNew ? 'Announcement published successfully!' : 'Announcement updated successfully!' 
      });
      setTimeout(() => setStatusMessage(null), 4000);
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving announcement:", error);
      setStatusMessage({ type: 'error', text: 'Failed to save announcement. Please check your connection.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (announcement: Announcement) => {
    try {
      const newStatus = !announcement.isPublished;
      await setDoc(doc(db, 'announcements', announcement.id), {
        ...announcement,
        isPublished: newStatus,
        updatedAt: Date.now()
      });

      await logAuditAction(
        currentUser?.uid || 'admin',
        userData?.name || 'Admin',
        userData?.role || 'admin',
        newStatus ? 'Publish Announcement' : 'Unpublish Announcement',
        'Announcements',
        `Changed "${announcement.title}" status to ${newStatus ? 'Published' : 'Draft'}.`
      );
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    try {
      const newPinned = !announcement.isPinned;
      await setDoc(doc(db, 'announcements', announcement.id), {
        ...announcement,
        isPinned: newPinned,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error("Error toggling pin:", err);
    }
  };

  const handleDelete = (announcement: Announcement) => {
    setDeletingItem(announcement);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'announcements', deletingItem.id));
      await logAuditAction(
        currentUser?.uid || 'admin',
        userData?.name || 'Admin',
        userData?.role || 'admin',
        'Delete Announcement',
        'Announcements',
        `Deleted announcement "${deletingItem.title}".`
      );
      setStatusMessage({ type: 'success', text: `Announcement "${deletingItem.title}" was deleted.` });
      setTimeout(() => setStatusMessage(null), 3000);
      setDeletingItem(null);
    } catch (err) {
      console.error("Error deleting announcement:", err);
      setStatusMessage({ type: 'error', text: 'Failed to delete announcement. Please check permissions.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter announcements
  const filteredAnnouncements = announcements.filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.paragraph.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.badge && item.badge.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesStatus = 
      selectedStatus === 'All' ? true :
      selectedStatus === 'Published' ? item.isPublished :
      selectedStatus === 'Draft' ? !item.isPublished :
      selectedStatus === 'Pinned' ? item.isPinned : true;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-neutral-500 text-xs font-bold uppercase tracking-wider">
            <Megaphone className="w-4 h-4 text-neutral-900" />
            <span>Public Communications & CMS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            Hotel Announcements
          </h1>
          <p className="text-sm text-neutral-600 max-w-2xl">
            Publish news, events, notices, and updates with high-resolution pictures, bold titles, and formatted paragraphs for your guests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {announcements.length === 0 && !loading && (
            <button
              onClick={() => setShowSeedModal(true)}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-sm font-semibold rounded-xl transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              Load Sample News
            </button>
          )}
          <a
            href="/announcements"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-sm font-medium rounded-xl transition"
          >
            <ExternalLink className="w-4 h-4" />
            Live Guest View
          </a>
          <button
            onClick={handleStartNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Announcement
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-medium ${
          statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Edit / Create Modal or Slide-in Drawer */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 overscroll-contain">
            {/* Modal Header */}
            <div className="px-6 sm:px-8 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {editingItem.id ? 'Edit Announcement' : 'New Hotel Announcement'}
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Provide picture, title, and descriptive paragraph
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Announcement Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Weekend Traditional Coffee Ceremony & Live Music"
                  value={editingItem.title || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 font-semibold focus:bg-white focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-hidden transition"
                />
              </div>

              {/* Category & Badge */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editingItem.category || 'General'}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as AnnouncementCategory })}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 font-medium focus:bg-white focus:ring-2 focus:ring-neutral-900 outline-hidden"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Optional Badge / Highlight Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Live Tonight, Special Offer, Important Notice"
                    value={editingItem.badge || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, badge: e.target.value })}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-sm focus:bg-white focus:ring-2 focus:ring-neutral-900 outline-hidden"
                  />
                </div>
              </div>

              {/* Image Section */}
              <div className="space-y-3 bg-neutral-50 p-5 rounded-2xl border border-neutral-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Announcement Picture / Banner
                  </label>
                  <span className="text-[11px] text-neutral-500">Supports high-res photo URLs or Media Upload</span>
                </div>

                <div className="space-y-3">
                  <MediaManager
                    currentImageUrl={editingItem.imageUrl || ''}
                    onImageSelected={(url) => setEditingItem({ ...editingItem, imageUrl: url })}
                    folder="announcements"
                  />

                  {editingItem.imageUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-900 aspect-video max-h-48">
                      <img
                        src={editingItem.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setEditingItem({ ...editingItem, imageUrl: '' })}
                        className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-lg transition"
                        title="Remove Image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                      Photo Caption (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Garden Pavilion setting during evening hours"
                      value={editingItem.imageCaption || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, imageCaption: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-800 focus:ring-1 focus:ring-neutral-900 outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Paragraph / Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Announcement Paragraph / Details <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-neutral-400">Line breaks will be preserved in display</span>
                </div>
                <textarea
                  required
                  rows={6}
                  placeholder="Type the full announcement message, event details, timings, special perks, or advisory notes here..."
                  value={editingItem.paragraph || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, paragraph: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-sm leading-relaxed focus:bg-white focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-hidden transition"
                />
              </div>

              {/* Author and Toggles */}
              <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-neutral-100">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Publisher / Signature
                  </label>
                  <input
                    type="text"
                    value={editingItem.publishedBy || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, publishedBy: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-800"
                  />
                </div>

                <div className="flex items-center sm:justify-center">
                  <label className="flex items-center gap-2.5 cursor-pointer bg-neutral-50 hover:bg-neutral-100 p-2.5 rounded-xl border border-neutral-200 w-full transition">
                    <input
                      type="checkbox"
                      checked={editingItem.isPublished ?? true}
                      onChange={(e) => setEditingItem({ ...editingItem, isPublished: e.target.checked })}
                      className="w-4 h-4 text-neutral-900 rounded border-neutral-300 focus:ring-neutral-900"
                    />
                    <div className="text-left">
                      <p className="text-xs font-bold text-neutral-900">Publish Immediately</p>
                      <p className="text-[10px] text-neutral-500">Visible to website visitors</p>
                    </div>
                  </label>
                </div>

                <div className="flex items-center sm:justify-center">
                  <label className="flex items-center gap-2.5 cursor-pointer bg-neutral-50 hover:bg-neutral-100 p-2.5 rounded-xl border border-neutral-200 w-full transition">
                    <input
                      type="checkbox"
                      checked={editingItem.isPinned ?? false}
                      onChange={(e) => setEditingItem({ ...editingItem, isPinned: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded border-neutral-300 focus:ring-amber-500"
                    />
                    <div className="text-left">
                      <p className="text-xs font-bold text-neutral-900">Pin to Top</p>
                      <p className="text-[10px] text-neutral-500">Feature as primary headline</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-5 py-2.5 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : (editingItem.id ? 'Save Changes' : 'Publish Announcement')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 overscroll-contain">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-100">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-neutral-900" /> Guest View Preview
              </span>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-neutral-500 hover:text-neutral-900 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              {previewItem.imageUrl && (
                <div className="rounded-2xl overflow-hidden aspect-video bg-neutral-100 border border-neutral-200 relative">
                  <img
                    src={previewItem.imageUrl}
                    alt={previewItem.title}
                    className="w-full h-full object-cover"
                  />
                  {previewItem.imageCaption && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs text-white text-xs px-4 py-2">
                      {previewItem.imageCaption}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-neutral-900 text-white text-xs font-bold rounded-full">
                  {previewItem.category}
                </span>
                {previewItem.badge && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-full">
                    {previewItem.badge}
                  </span>
                )}
                {previewItem.isPinned && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-900 text-xs font-bold rounded-full flex items-center gap-1">
                    <Pin className="w-3 h-3" /> Pinned
                  </span>
                )}
                <span className="text-xs text-neutral-400 ml-auto flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(previewItem.createdAt).toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 leading-tight">
                {previewItem.title}
              </h2>

              <p className="text-neutral-700 leading-relaxed whitespace-pre-line text-sm sm:text-base border-t border-neutral-100 pt-4">
                {previewItem.paragraph}
              </p>

              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                <span>Published by: <strong>{previewItem.publishedBy}</strong></span>
                <span className={previewItem.isPublished ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                  {previewItem.isPublished ? '● Published' : '○ Draft'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 focus:bg-white focus:ring-2 focus:ring-neutral-900 outline-hidden transition"
          />
        </div>

        {/* Category & Status Filter */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-600">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-800"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 ml-2">
            <span>Status:</span>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-800"
          >
            <option value="All">All Statuses</option>
            <option value="Published">Published Only</option>
            <option value="Draft">Drafts Only</option>
            <option value="Pinned">Pinned Only</option>
          </select>
        </div>
      </div>

      {/* Announcements List Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <div className="w-8 h-8 border-3 border-neutral-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-neutral-500 font-medium">Loading hotel announcements...</p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="bg-white rounded-3xl border border-neutral-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-400">
            <Megaphone className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900">No Announcements Found</h3>
            <p className="text-sm text-neutral-500 max-w-md mx-auto mt-1">
              {searchQuery || selectedCategory !== 'All' || selectedStatus !== 'All' 
                ? 'Try adjusting your search criteria or category filters.' 
                : 'Click "Create Announcement" or "Load Sample News" to publish your first hotel announcement.'}
            </p>
          </div>
          {announcements.length === 0 && (
            <button
              onClick={() => setShowSeedModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Load Sample Announcements
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAnnouncements.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-3xl border overflow-hidden transition-all duration-200 flex flex-col group ${
                item.isPinned 
                  ? 'border-amber-300 shadow-md ring-1 ring-amber-200' 
                  : 'border-neutral-200 shadow-xs hover:shadow-md'
              }`}
            >
              {/* Picture Header */}
              <div className="relative aspect-video bg-neutral-100 overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-50 text-neutral-400 gap-1.5 p-4 text-center">
                    <ImageIcon className="w-8 h-8 stroke-1" />
                    <span className="text-xs font-medium">No picture attached</span>
                  </div>
                )}

                {/* Top Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center">
                  <span className="px-2.5 py-1 bg-black/75 backdrop-blur-xs text-white text-[11px] font-bold rounded-lg shadow-xs">
                    {item.category}
                  </span>
                  {item.badge && (
                    <span className="px-2.5 py-1 bg-amber-400 text-neutral-900 text-[11px] font-extrabold rounded-lg shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Pin Badge */}
                {item.isPinned && (
                  <div className="absolute top-3 right-3 bg-amber-500 text-white p-1.5 rounded-lg shadow-xs" title="Pinned Announcement">
                    <Pin className="w-3.5 h-3.5 fill-current" />
                  </div>
                )}

                {/* Published status badge */}
                <div className="absolute bottom-3 left-3">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs ${
                    item.isPublished ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-neutral-300'
                  }`}>
                    {item.isPublished ? '● Published' : '○ Draft'}
                  </span>
                </div>
              </div>

              {/* Text Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                    <span>By: {item.publishedBy || 'Management'}</span>
                  </div>

                  <h3 className="text-lg font-bold text-neutral-900 line-clamp-2 leading-snug group-hover:text-neutral-700 transition">
                    {item.title}
                  </h3>

                  <p className="text-neutral-600 text-sm line-clamp-3 leading-relaxed">
                    {item.paragraph}
                  </p>
                </div>

                {/* Card Controls / Actions */}
                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTogglePublish(item)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        item.isPublished 
                          ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200' 
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {item.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => handleTogglePin(item)}
                      className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                        item.isPinned ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'
                      }`}
                      title={item.isPinned ? 'Unpin' : 'Pin to Top'}
                    >
                      <Pin className={`w-4 h-4 ${item.isPinned ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingItem}
        title="Delete Announcement"
        message={`Are you sure you want to permanently delete "${deletingItem?.title}"? This action cannot be undone and will remove it from the website immediately.`}
        confirmText="Delete Announcement"
        cancelText="Keep"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingItem(null)}
      />

      {/* Seed Sample News Confirmation Modal */}
      <ConfirmModal
        isOpen={showSeedModal}
        title="Load Sample News"
        message="Would you like to publish initial sample announcements and event notices for Woliso Hotel? You can edit or remove them anytime."
        confirmText="Load Sample News"
        cancelText="Cancel"
        variant="info"
        isLoading={saving}
        onConfirm={handleSeedDefaults}
        onClose={() => setShowSeedModal(false)}
      />
    </div>
  );
}
