import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { GalleryImage } from '../../types';
import MediaManager from '../../components/admin/MediaManager';
import ConfirmModal from '../../components/common/ConfirmModal';
import { Loader2, Plus, Trash2 } from 'lucide-react';

export default function AdminCmsGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newCategory, setNewCategory] = useState('Rooms');
  const [newCaption, setNewCaption] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchImages = async () => {
    try {
      const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryImage));
      setImages(data);
    } catch (error) {
      console.error("Error fetching gallery images:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleImageUploaded = async (url: string) => {
    if (!url) return;
    setUploading(true);
    
    try {
      const newImage: GalleryImage = {
        id: `img_${Date.now()}`,
        url,
        category: newCategory,
        caption: newCaption,
        createdAt: Date.now()
      };
      
      await setDoc(doc(db, 'gallery', newImage.id), newImage);
      setNewCaption('');
      await fetchImages();
    } catch (error) {
      console.error("Error saving image to gallery:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'gallery', deletingId));
      setImages(images.filter(img => img.id !== deletingId));
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting image:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>;
  }

  const predefinedCategories = ['Rooms', 'Restaurant', 'Exterior', 'Lobby', 'Events'];

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Gallery Management</h1>
      </div>

      <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm mb-12">
        <h2 className="text-lg font-bold text-neutral-900 mb-6">Upload New Image</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
              <select 
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500"
              >
                {predefinedCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                <option value="Other">Other</option>
              </select>
            </div>
            
            {newCategory === 'Other' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Custom Category Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Swimming Pool"
                  className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500"
                  onBlur={(e) => { if(e.target.value) setNewCategory(e.target.value); }}
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Caption (Optional)</label>
              <input 
                type="text" 
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                placeholder="A brief description of the image"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Upload Image</label>
            {uploading ? (
               <div className="flex justify-center items-center h-48 border-2 border-dashed border-neutral-300 rounded-lg bg-neutral-50">
                 <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
               </div>
            ) : (
              <MediaManager 
                onImageSelected={handleImageUploaded} 
                folder="gallery" 
              />
            )}
          </div>
        </div>
      </div>

      <h2 className="text-lg font-bold text-neutral-900 mb-6">Existing Images ({images.length})</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {images.map(image => (
          <div key={image.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden group">
            <div className="aspect-[4/3] bg-neutral-100 relative">
              <img src={image.url} alt={image.caption || 'Gallery Image'} className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleDeleteClick(image.id)}
                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm cursor-pointer"
                  title="Delete Image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-3">
              <span className="inline-block px-2 py-1 bg-neutral-100 text-neutral-700 text-xs font-medium rounded mb-1">{image.category}</span>
              <p className="text-sm text-neutral-600 truncate">{image.caption || 'No caption'}</p>
            </div>
          </div>
        ))}
        {images.length === 0 && (
          <div className="col-span-full text-center py-12 text-neutral-500 bg-white rounded-xl border border-neutral-200">
            No images in the gallery yet. Upload some above.
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Gallery Image"
        message="Are you sure you want to delete this photo from the gallery?"
        confirmText="Delete Image"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingId(null)}
      />
    </div>
  );
}
