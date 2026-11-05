import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { X, CheckCircle2, ArrowRight, Sparkles, Navigation } from 'lucide-react';
import { HotelArea } from './virtualHotelData';

interface HotspotModalProps {
  area: HotelArea | null;
  onClose: () => void;
  onTeleport: (areaId: string) => void;
}

export const HotspotModal: React.FC<HotspotModalProps> = ({ area, onClose, onTeleport }) => {
  if (!area) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        {/* Backdrop for click outside */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-neutral-900/95 border border-white/15 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-white pointer-events-auto overflow-hidden"
          style={{
            boxShadow: `0 20px 60px rgba(0,0,0,0.85), 0 0 40px ${area.accentColor}25`
          }}
        >
          {/* Accent glow on top edge */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5 opacity-80"
            style={{
              background: `linear-gradient(90deg, transparent, ${area.accentColor}, transparent)`
            }}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Badge & Category */}
          <div className="flex items-center gap-2.5 mb-3">
            <span
              className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border"
              style={{
                backgroundColor: `${area.accentColor}15`,
                borderColor: `${area.accentColor}40`,
                color: area.accentColor
              }}
            >
              {area.hotspotBadge}
            </span>
            <span className="text-xs text-neutral-400 font-medium">
              {area.category}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
            {area.hotspotTitle}
          </h3>

          {/* Subtitle / Area Name */}
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Located in: {area.name}
          </p>

          {/* Description */}
          <p className="text-sm text-neutral-300 leading-relaxed mb-5">
            {area.description}
          </p>

          {/* Capabilities List */}
          <div className="space-y-2.5 mb-6 bg-black/40 border border-white/10 rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Integrated DigiMenu Capabilities:
            </p>
            {area.capabilities.map((cap, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-neutral-200">
                <CheckCircle2
                  className="w-4 h-4 flex-shrink-0 mt-0.5"
                  style={{ color: area.accentColor }}
                />
                <span>{cap}</span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              to={area.ctaLink}
              onClick={onClose}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-sm text-neutral-950 transition-all hover:scale-[1.02] shadow-lg cursor-pointer"
              style={{
                backgroundColor: area.accentColor
              }}
            >
              <span>{area.ctaText}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => {
                onTeleport(area.id);
                onClose();
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium text-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Navigation className="w-4 h-4 text-sky-400" />
              <span>Center View</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default HotspotModal;
