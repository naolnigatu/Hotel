import React, { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface MediaManagerProps {
  onImageSelected: (url: string) => void;
  currentImageUrl?: string;
  folder?: string;
}

export default function MediaManager({ onImageSelected, currentImageUrl, folder = 'cms' }: MediaManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1080;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          }, 'image/jpeg', 0.8);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const compressedBlob = await compressImage(file);
      const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, compressedBlob, { contentType: 'image/jpeg' });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(prog);
        },
        (err) => {
          setError(err.message);
          setUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onImageSelected(downloadURL);
          setUploading(false);
          setProgress(0);
        }
      );
    } catch (err: any) {
      setError(err.message || 'Error compressing image');
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      {currentImageUrl ? (
        <div className="relative group rounded-lg overflow-hidden border border-neutral-200">
          <img src={currentImageUrl} alt="Current" className="w-full h-48 object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              type="button"
              onClick={() => onImageSelected('')}
              className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
              title="Remove Image"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            uploading ? 'border-neutral-300 bg-neutral-50' : 'border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-neutral-400 animate-spin mb-3" />
              <p className="text-sm font-medium text-neutral-600">Uploading... {Math.round(progress)}%</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-8 h-8 text-neutral-400 mb-3" />
              <p className="text-sm font-medium text-neutral-900 mb-1">Click to upload image</p>
              <p className="text-xs text-neutral-500">PNG, JPG up to 5MB</p>
            </div>
          )}
        </div>
      )}
      
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
