import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Announcement, AnnouncementCategory, CmsContact } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  Megaphone, 
  Search, 
  Calendar, 
  Clock, 
  Pin, 
  Share2, 
  ArrowRight, 
  Sparkles, 
  X, 
  ChevronRight, 
  Tag, 
  Phone,
  UtensilsCrossed,
  Building2,
  CalendarCheck
} from 'lucide-react';
import CopyButton from '../components/common/CopyButton';

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'All', label: 'All News & Updates' },
  { id: 'Event', label: 'Events & Entertainment' },
  { id: 'Dining & Bar', label: 'Dining & Specials' },
  { id: 'Facility & Amenities', label: 'Spa & Wellness' },
  { id: 'Special Notice', label: 'Notices & Advisories' },
  { id: 'Seasonal Celebration', label: 'Holidays & Celebrations' },
  { id: 'General', label: 'General' },
];

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeModalItem, setActiveModalItem] = useState<Announcement | null>(null);
  const [contactData, setContactData] = useState<CmsContact | null>(null);

  useEffect(() => {
    // Fetch hotel contact details
    const fetchContact = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'cms_contact'));
        if (snap.exists()) {
          setContactData(snap.data().data as CmsContact);
        }
      } catch (err) {
        console.error("Error fetching contact:", err);
      }
    };
    fetchContact();

    // Listen to announcements in real-time
    const q = query(collection(db, 'announcements'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Announcement[] = [];
      snapshot.forEach((docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() } as Announcement;
        // Only show published items on public guest view
        if (data.isPublished !== false) {
          list.push(data);
        }
      });

      // Sort: Pinned first, then by date descending
      list.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });

      setAnnouncements(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading announcements:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter list
  const filtered = announcements.filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.paragraph.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.badge && item.badge.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const pinnedItem = filtered.find(item => item.isPinned) || (selectedCategory === 'All' && !searchQuery ? announcements.find(item => item.isPinned) : null);
  const regularItems = pinnedItem && selectedCategory === 'All' && !searchQuery 
    ? filtered.filter(item => item.id !== pinnedItem.id) 
    : filtered;

  return (
    <div className="min-h-screen bg-neutral-50/50 pb-24">
      {/* Hero Header */}
      <section className="bg-neutral-900 text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8 border-b border-neutral-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.15),transparent_50%)]" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-amber-400 border border-white/10">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Official Hotel Communications</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Announcements & News
            </h1>
            <p className="text-base sm:text-lg text-neutral-300 leading-relaxed max-w-2xl">
              Stay informed on upcoming cultural evenings, seasonal culinary menus, wellness retreats, and hotel announcements at Woliso Hotel.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        {/* Search & Category Filter Toolbar */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-neutral-200/80 mb-10 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search news, events, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-900 outline-hidden transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="text-xs font-semibold text-neutral-500 self-start md:self-center">
              Showing <span className="font-bold text-neutral-900">{filtered.length}</span> {filtered.length === 1 ? 'announcement' : 'announcements'}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                    active
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 border-4 border-neutral-900 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-neutral-600">Loading hotel announcements...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-neutral-200 shadow-xs max-w-xl mx-auto space-y-4 my-8">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-400">
              <Megaphone className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900">No Announcements Found</h3>
            <p className="text-sm text-neutral-500">
              {searchQuery || selectedCategory !== 'All' 
                ? 'We could not find announcements matching your filter. Try searching for something else.' 
                : 'There are currently no active announcements. Please check back soon!'}
            </p>
            {(searchQuery || selectedCategory !== 'All') && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                className="px-5 py-2.5 bg-neutral-900 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-12">
            {/* Featured / Pinned Headline Announcement */}
            {pinnedItem && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-neutral-200 shadow-md overflow-hidden grid lg:grid-cols-12 group hover:border-neutral-300 transition-all duration-300"
              >
                {/* Image Section */}
                <div className="lg:col-span-6 relative aspect-[16/10] lg:aspect-auto bg-neutral-900 overflow-hidden">
                  <img
                    src={pinnedItem.imageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200'}
                    alt={pinnedItem.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200';
                    }}
                  />
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2 items-center">
                    <span className="px-3 py-1 bg-amber-500 text-neutral-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-xs flex items-center gap-1.5">
                      <Pin className="w-3.5 h-3.5 fill-current" /> Featured
                    </span>
                    <span className="px-3 py-1 bg-black/75 backdrop-blur-md text-white text-xs font-bold rounded-xl">
                      {pinnedItem.category}
                    </span>
                  </div>
                </div>

                {/* Text Content */}
                <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-neutral-400">
                      <span className="flex items-center gap-1.5 text-neutral-600">
                        <Clock className="w-4 h-4 text-neutral-500" />
                        {new Date(pinnedItem.createdAt).toLocaleDateString(undefined, {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      {pinnedItem.badge && (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-200 text-xs font-extrabold rounded-lg">
                          {pinnedItem.badge}
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight leading-snug group-hover:text-neutral-800 transition">
                      {pinnedItem.title}
                    </h2>

                    <p className="text-neutral-600 text-sm sm:text-base leading-relaxed line-clamp-4 whitespace-pre-line">
                      {pinnedItem.paragraph}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs text-neutral-500">
                      Published by <span className="font-bold text-neutral-800">{pinnedItem.publishedBy}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <CopyButton
                        text={`${window.location.origin}/announcements#${pinnedItem.id}`}
                        variant="ghost"
                        size="sm"
                        label="Share"
                        tooltip="Copy announcement link"
                      />
                      <button
                        onClick={() => setActiveModalItem(pinnedItem)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
                      >
                        Read Full Story
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Grid of Regular Announcements */}
            {regularItems.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {regularItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    id={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                    className="bg-white rounded-3xl border border-neutral-200 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group hover:border-neutral-300"
                  >
                    {/* Picture Banner */}
                    <div className="relative aspect-[16/10] bg-neutral-100 overflow-hidden">
                      <img
                        src={item.imageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1000'}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1000';
                        }}
                      />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center">
                        <span className="px-2.5 py-1 bg-black/75 backdrop-blur-xs text-white text-[11px] font-bold rounded-lg shadow-xs">
                          {item.category}
                        </span>
                        {item.badge && (
                          <span className="px-2.5 py-1 bg-amber-400 text-neutral-950 text-[11px] font-extrabold rounded-lg shadow-xs">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Text Details */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs text-neutral-400">
                          <span className="flex items-center gap-1 font-medium text-neutral-500">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(item.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-[11px]">By {item.publishedBy}</span>
                        </div>

                        <h3 className="text-xl font-bold text-neutral-900 leading-snug line-clamp-2 group-hover:text-neutral-700 transition">
                          {item.title}
                        </h3>

                        <p className="text-neutral-600 text-sm leading-relaxed line-clamp-3 whitespace-pre-line">
                          {item.paragraph}
                        </p>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-2">
                        <CopyButton
                          text={`${window.location.origin}/announcements#${item.id}`}
                          variant="ghost"
                          size="xs"
                          label="Share"
                          tooltip="Copy announcement link"
                        />
                        <button
                          onClick={() => setActiveModalItem(item)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-neutral-900 hover:text-neutral-600 transition cursor-pointer"
                        >
                          Read More <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full Announcement Detail Modal */}
      <AnimatePresence>
        {activeModalItem && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden my-8"
            >
              {/* Modal Picture Header */}
              {activeModalItem.imageUrl && (
                <div className="relative aspect-video max-h-80 bg-neutral-900 overflow-hidden">
                  <img
                    src={activeModalItem.imageUrl}
                    alt={activeModalItem.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200';
                    }}
                  />
                  <button
                    onClick={() => setActiveModalItem(null)}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition cursor-pointer shadow-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  {activeModalItem.imageCaption && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white text-xs">
                      {activeModalItem.imageCaption}
                    </div>
                  )}
                </div>
              )}

              {/* Modal Text Content */}
              <div className="p-6 sm:p-10 space-y-6">
                {!activeModalItem.imageUrl && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setActiveModalItem(null)}
                      className="p-2 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-neutral-900 text-white text-xs font-bold rounded-full">
                      {activeModalItem.category}
                    </span>
                    {activeModalItem.badge && (
                      <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-200 text-xs font-extrabold rounded-full">
                        {activeModalItem.badge}
                      </span>
                    )}
                    {activeModalItem.isPinned && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-900 text-xs font-bold rounded-full flex items-center gap-1">
                        <Pin className="w-3 h-3" /> Pinned
                      </span>
                    )}
                    <span className="text-xs text-neutral-400 ml-auto flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(activeModalItem.createdAt).toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-neutral-900 tracking-tight leading-tight">
                    {activeModalItem.title}
                  </h2>
                </div>

                <div className="border-t border-neutral-100 pt-6">
                  <p className="text-neutral-700 leading-relaxed whitespace-pre-line text-base sm:text-lg">
                    {activeModalItem.paragraph}
                  </p>
                </div>

                {/* Direct Action Link if related to Dining or Booking */}
                <div className="pt-6 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-4 bg-neutral-50 -mx-6 sm:-mx-10 -mb-6 sm:-mb-10 p-6 sm:p-8 rounded-b-3xl">
                  <div className="text-xs text-neutral-500">
                    Published by <strong className="text-neutral-900">{activeModalItem.publishedBy}</strong>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <CopyButton
                      text={`${window.location.origin}/announcements#${activeModalItem.id}`}
                      variant="neutral"
                      size="sm"
                      label="Copy Link"
                      showText={true}
                      tooltip="Copy direct link"
                    />

                    {activeModalItem.category === 'Dining & Bar' ? (
                      <Link
                        to="/restaurant"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs sm:text-sm font-bold rounded-xl transition"
                      >
                        <UtensilsCrossed className="w-4 h-4" /> Explore Restaurant Menu
                      </Link>
                    ) : activeModalItem.category === 'Event' ? (
                      <Link
                        to="/halls"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs sm:text-sm font-bold rounded-xl transition"
                      >
                        <CalendarCheck className="w-4 h-4" /> Halls & Venue Spaces
                      </Link>
                    ) : (
                      <Link
                        to="/rooms"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs sm:text-sm font-bold rounded-xl transition"
                      >
                        <Building2 className="w-4 h-4" /> View Accommodations
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
