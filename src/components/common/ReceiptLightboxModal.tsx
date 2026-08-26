import React, { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, FileText } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface ReceiptLightboxModalProps {
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export default function ReceiptLightboxModal({ imageUrl, title = 'Payment Receipt', onClose }: ReceiptLightboxModalProps) {
  const [scale, setScale] = useState(1);
  useBodyScrollLock(!!imageUrl);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (imageUrl) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  const isPdf = imageUrl === 'pdf' || imageUrl.endsWith('.pdf') || imageUrl.includes('application/pdf');

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.min(3, prev + 0.25));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.max(0.5, prev - 0.25));
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-fade-in select-none overscroll-contain"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div 
        className="w-full max-w-5xl flex items-center justify-between py-2 text-white z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm sm:text-base tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            {title}
          </span>
          <span className="text-xs bg-white/10 px-2.5 py-0.5 rounded-full text-neutral-300">
            In-Page View
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!isPdf && (
            <div className="flex items-center bg-white/10 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-white/20 rounded-lg text-neutral-200 hover:text-white transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1.5 hover:bg-white/20 rounded-lg text-xs font-mono text-neutral-200 hover:text-white transition cursor-pointer px-2"
                title="Reset Zoom"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-white/20 rounded-lg text-neutral-200 hover:text-white transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          )}

          {imageUrl !== 'pdf' && (
            <a
              href={imageUrl}
              download="payment-receipt"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-neutral-200 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Download Receipt"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Save</span>
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-white/20 hover:bg-red-600 rounded-xl text-white transition cursor-pointer ml-1"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div 
        className="flex-1 w-full max-w-5xl flex items-center justify-center overflow-auto p-2"
        onClick={(e) => e.stopPropagation()}
      >
        {isPdf ? (
          <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl space-y-4">
            <FileText className="w-16 h-16 text-emerald-600 mx-auto" />
            <h3 className="text-lg font-bold text-neutral-900">PDF Document Receipt</h3>
            <p className="text-xs text-neutral-600">
              This payment receipt is attached as a PDF document.
            </p>
            {imageUrl !== 'pdf' ? (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
              >
                <Download className="w-4 h-4" /> Open PDF Document
              </a>
            ) : (
              <span className="inline-block px-4 py-2 bg-neutral-100 text-neutral-700 text-xs font-semibold rounded-lg">
                Ready for upload with booking
              </span>
            )}
          </div>
        ) : (
          <div className="relative max-h-[82vh] max-w-full flex items-center justify-center transition-transform duration-150 ease-out">
            <img
              src={imageUrl}
              alt="Payment Receipt Full Screen"
              style={{ transform: `scale(${scale})` }}
              className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-200 cursor-zoom-in"
              onClick={handleZoomIn}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Bottom Hint */}
      <div className="text-neutral-400 text-xs py-1 text-center font-medium">
        Click outside or press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-neutral-300 font-mono text-[10px]">Esc</kbd> to close fullscreen preview
      </div>
    </div>
  );
}
