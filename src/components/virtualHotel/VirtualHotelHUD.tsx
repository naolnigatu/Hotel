import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  Play, 
  Pause, 
  MapPin, 
  Eye, 
  Layers, 
  Maximize2, 
  Minimize2, 
  HelpCircle, 
  Sparkles,
  BedDouble,
  UtensilsCrossed,
  Coffee,
  ChefHat,
  LineChart,
  Bell
} from 'lucide-react';
import { HotelArea, HOTEL_AREAS } from './virtualHotelData';

interface VirtualHotelHUDProps {
  currentArea: HotelArea;
  activeHotspot: HotelArea | null;
  cameraPosition: [number, number, number];
  isTouring: boolean;
  onToggleTour: () => void;
  onSelectArea: (areaId: string) => void;
  onSelectHotspot: (area: HotelArea) => void;
  onToggleViewMode?: () => void;
  viewMode: '3d' | 'classic';
}

export const VirtualHotelHUD: React.FC<VirtualHotelHUDProps> = ({
  currentArea,
  activeHotspot,
  cameraPosition,
  isTouring,
  onToggleTour,
  onSelectArea,
  onSelectHotspot,
  onToggleViewMode,
  viewMode
}) => {
  const [showMinimap, setShowMinimap] = useState(true);
  const [showControlsHint, setShowControlsHint] = useState(true);

  // Map area icons
  const getAreaIcon = (id: string) => {
    switch (id) {
      case 'reception': return <Bell className="w-4 h-4" />;
      case 'suite': return <BedDouble className="w-4 h-4" />;
      case 'restaurant': return <UtensilsCrossed className="w-4 h-4" />;
      case 'cafe': return <Coffee className="w-4 h-4" />;
      case 'kitchen': return <ChefHat className="w-4 h-4" />;
      case 'lounge': return <LineChart className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  // Radar position mapping: world coordinates [-25, 25] mapped to [0, 100]%
  const mapWorldToRadar = (x: number, z: number) => {
    const minCoord = -25;
    const maxCoord = 25;
    const normX = ((x - minCoord) / (maxCoord - minCoord)) * 100;
    // in 3D, z goes down on screen when positive, up when negative
    const normZ = ((z - minCoord) / (maxCoord - minCoord)) * 100;
    return { x: Math.max(5, Math.min(95, normX)), y: Math.max(5, Math.min(95, normZ)) };
  };

  const userRadar = mapWorldToRadar(cameraPosition[0], cameraPosition[2]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      
      {/* ---------------- TOP BAR ---------------- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pointer-events-auto">
        
        {/* Left: Location Indicator Badge */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 shadow-xl text-white">
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: `${currentArea.accentColor}30`, color: currentArea.accentColor }}
          >
            {getAreaIcon(currentArea.id)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {currentArea.category}
              </span>
              <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: currentArea.accentColor }} />
            </div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              {currentArea.name}
            </h2>
          </div>
        </div>

        {/* Right: Actions & Tour Controls */}
        <div className="flex items-center gap-2">
          {/* Guided Tour Play/Pause */}
          <button
            onClick={onToggleTour}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs backdrop-blur-xl border transition-all cursor-pointer shadow-lg ${
              isTouring
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 hover:bg-amber-500/30'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
            }`}
          >
            {isTouring ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isTouring ? 'Pause Tour' : 'Autopilot Tour'}</span>
          </button>

          {/* View Mode Switcher */}
          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 backdrop-blur-xl transition-all cursor-pointer shadow-lg"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>{viewMode === '3d' ? 'Classic Overview' : '3D Virtual Hotel'}</span>
            </button>
          )}

          {/* Toggle Minimap */}
          <button
            onClick={() => setShowMinimap(!showMinimap)}
            aria-label="Toggle Floor Plan Radar"
            className="w-9 h-9 rounded-xl bg-black/60 hover:bg-black/80 border border-white/15 text-neutral-300 hover:text-white flex items-center justify-center backdrop-blur-xl transition-colors cursor-pointer"
          >
            <Compass className="w-4 h-4 text-sky-400" />
          </button>
        </div>
      </div>

      {/* ---------------- MIDDLE FLOATING HOTSPOT PROMPT (IF PROXIMATE) ---------------- */}
      {activeHotspot && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          className="self-center pointer-events-auto cursor-pointer"
          onClick={() => onSelectHotspot(activeHotspot)}
        >
          <div 
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-neutral-900/90 border border-white/20 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-white hover:scale-105 transition-transform"
            style={{ borderColor: activeHotspot.accentColor }}
          >
            <span 
              className="w-3 h-3 rounded-full animate-ping"
              style={{ backgroundColor: activeHotspot.accentColor }}
            />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                Interactive PMS Hotspot
              </p>
              <p className="text-xs sm:text-sm font-bold text-white">
                Tap to explore {activeHotspot.hotspotTitle}
              </p>
            </div>
            <Sparkles className="w-4 h-4 ml-2" style={{ color: activeHotspot.accentColor }} />
          </div>
        </motion.div>
      )}

      {/* ---------------- BOTTOM SECTION ---------------- */}
      <div className="space-y-4 pointer-events-auto">

        {/* Controls Hint Banner (Collapsible) */}
        <AnimatePresence>
          {showControlsHint && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-black/60 border border-white/10 backdrop-blur-xl text-neutral-300 text-[11px] shadow-lg"
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>
                <strong className="text-white">WASD / Arrows</strong> to Walk •{' '}
                <strong className="text-white">Click & Drag</strong> to Look •{' '}
                <strong className="text-white">Click Beacons</strong> to Discover PMS Tools
              </span>
              <button
                onClick={() => setShowControlsHint(false)}
                className="ml-2 text-neutral-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Room Teleport Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none max-w-full">
          {HOTEL_AREAS.map((area) => {
            const isActive = currentArea.id === area.id;
            return (
              <button
                key={area.id}
                onClick={() => onSelectArea(area.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold backdrop-blur-xl border transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-neutral-950 border-white shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-105'
                    : 'bg-black/50 text-neutral-300 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span style={{ color: isActive ? '#0f172a' : area.accentColor }}>
                  {getAreaIcon(area.id)}
                </span>
                <span>{area.name.split('(')[0].trim()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- CORNER INTERACTIVE MINIMAP RADAR ---------------- */}
      <AnimatePresence>
        {showMinimap && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-24 right-4 sm:bottom-28 sm:right-6 w-44 h-44 sm:w-52 sm:h-52 rounded-2xl bg-neutral-950/80 border border-white/20 backdrop-blur-2xl shadow-2xl p-2.5 pointer-events-auto flex flex-col justify-between overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">
              <span className="flex items-center gap-1 text-sky-400">
                <Compass className="w-3 h-3" />
                Floor Plan Radar
              </span>
              <span className="text-[9px] text-neutral-500">Live GPS</span>
            </div>

            {/* Radar Grid Canvas Area */}
            <div className="relative flex-1 my-1 border border-white/10 rounded-xl bg-black/50 overflow-hidden">
              {/* Radar Rings & Grid Lines */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-[1px] bg-white/10" />
                <div className="h-full w-[1px] bg-white/10 absolute" />
                <div className="w-24 h-24 rounded-full border border-white/10 absolute" />
                <div className="w-12 h-12 rounded-full border border-white/10 absolute" />
              </div>

              {/* Corridor Connections visual */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                {/* Horizontal central hallway */}
                <div className="absolute top-[50%] left-[15%] right-[15%] h-2 -translate-y-1/2 bg-sky-400" />
                {/* North Hallway to Cafe/Lounge */}
                <div className="absolute top-[15%] bottom-[50%] left-[15%] w-2 bg-sky-400" />
                <div className="absolute top-[15%] bottom-[50%] right-[15%] w-2 bg-sky-400" />
                {/* South Hallway to Kitchen */}
                <div className="absolute top-[50%] bottom-[15%] right-[15%] w-2 bg-sky-400" />
              </div>

              {/* Room Clickable Nodes */}
              {HOTEL_AREAS.map((area) => {
                const radarPos = mapWorldToRadar(area.cameraPos[0], area.cameraPos[2]);
                const isSelected = currentArea.id === area.id;

                return (
                  <button
                    key={area.id}
                    onClick={() => onSelectArea(area.id)}
                    title={area.name}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                    style={{ left: `${radarPos.x}%`, top: `${radarPos.y}%` }}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'ring-4 ring-white/50 scale-125'
                          : 'hover:scale-125'
                      }`}
                      style={{ backgroundColor: area.accentColor }}
                    />
                    <span className="hidden group-hover:block absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] bg-black/90 text-white px-1.5 py-0.5 rounded border border-white/20 z-30">
                      {area.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}

              {/* Current User Live Position Indicator */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300"
                style={{ left: `${userRadar.x}%`, top: `${userRadar.y}%` }}
              >
                <div className="w-3 h-3 bg-white rounded-full ring-4 ring-sky-400/60 shadow-[0_0_12px_#38bdf8]" />
              </div>
            </div>

            {/* Coordinates / Instructions */}
            <div className="flex items-center justify-between text-[9px] text-neutral-400 px-1 font-mono">
              <span>X:{cameraPosition[0].toFixed(1)}</span>
              <span className="text-sky-400">Click node to fly</span>
              <span>Z:{cameraPosition[2].toFixed(1)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default VirtualHotelHUD;
