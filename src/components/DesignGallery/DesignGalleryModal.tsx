/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Box,
  Check,
  CheckCircle2,
  Columns,
  Compass,
  DollarSign,
  Eye,
  Layers,
  Layout,
  RefreshCw,
  Ruler,
  Sparkles,
  Footprints,
  X,
} from 'lucide-react';
import { HouseDesignAlternative, PlotConfig } from '../../types/house';
import { DesignComparisonModal } from './DesignComparisonModal';

interface DesignGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  designs: HouseDesignAlternative[];
  selectedDesignId: string;
  onSelectDesign: (id: string) => void;
  onView3D: (id: string) => void;
  onExploreInterior: (id: string) => void;
  onViewFloorPlan: (id: string) => void;
  onRegenerateAlternatives: () => void;
  plot: PlotConfig;
}

export const DesignGalleryModal: React.FC<DesignGalleryModalProps> = ({
  isOpen,
  onClose,
  designs,
  selectedDesignId,
  onSelectDesign,
  onView3D,
  onExploreInterior,
  onViewFloorPlan,
  onRegenerateAlternatives,
  plot,
}) => {
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  if (!isOpen) return null;

  const toggleCompare = (id: string) => {
    setSelectedForCompare((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const formatCost = (val: number) => {
    if (plot.currency === 'INR') {
      return `₹${val.toLocaleString('en-IN')}`;
    }
    return `$${val.toLocaleString()}`;
  };

  const comparedDesigns = designs.filter((d) => selectedForCompare.includes(d.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">AI House Design Alternatives</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                  {designs.length} Options Generated
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Explore distinct architectural configurations calculated for {plot.projectTitle} ({plot.widthM}m × {plot.lengthM}m plot)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Compare trigger button */}
            {selectedForCompare.length >= 2 && (
              <button
                onClick={() => setIsCompareModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition"
              >
                <Columns className="w-3.5 h-3.5" /> Compare ({selectedForCompare.length})
              </button>
            )}

            {/* Regenerate Alternatives */}
            <button
              onClick={onRegenerateAlternatives}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold shadow transition"
              title="Generate new layout variations"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Regenerate Alternatives
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Gallery Content Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {designs.map((design, idx) => {
              const isSelected = design.id === selectedDesignId;
              const isCheckedForCompare = selectedForCompare.includes(design.id);

              return (
                <div
                  key={design.id}
                  className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xl ${
                    isSelected
                      ? 'bg-slate-900 border-amber-500 ring-2 ring-amber-500/30'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Header & Preview Banner */}
                  <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 border-b border-slate-800/80 relative">
                    <div className="flex items-center justify-between pb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        Option #{idx + 1}
                      </span>

                      {isSelected ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Active Design
                        </span>
                      ) : (
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isCheckedForCompare}
                            onChange={() => toggleCompare(design.id)}
                            className="rounded accent-indigo-500"
                          />
                          <span>Compare</span>
                        </label>
                      )}
                    </div>

                    <h4 className="font-extrabold text-sm sm:text-base text-white">{design.name}</h4>
                    <p className="text-xs text-amber-400/90 font-medium mt-0.5">{design.tagline}</p>

                    {/* Quick Metric Pills */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/60 text-xs">
                      <div className="bg-slate-950/90 p-2 rounded-lg border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                          Est. Budget
                        </span>
                        <span className="font-mono font-bold text-amber-400 text-sm">
                          {formatCost(design.estimatedCost)}
                        </span>
                      </div>

                      <div className="bg-slate-950/90 p-2 rounded-lg border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                          Built-Up Area
                        </span>
                        <span className="font-mono font-bold text-white text-sm">
                          {design.builtUpAreaSqFt.toLocaleString()} sq.ft
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body & Architectural Features */}
                  <div className="p-4 space-y-3 text-xs flex-1">
                    <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">
                      {design.description}
                    </p>

                    {/* Key Highlights */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                        Key Highlights
                      </span>
                      {design.keyHighlights.slice(0, 3).map((h, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>

                    {/* Elevation Facade Bullet */}
                    <div className="pt-2 border-t border-slate-800/60">
                      <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                        Elevation Facade
                      </span>
                      <p className="text-[11px] text-slate-400 italic">
                        {design.elevationFeatures[0]}
                      </p>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 space-y-2">
                    {/* View Options: 3D, Interior, 2D */}
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      <button
                        onClick={() => {
                          onSelectDesign(design.id);
                          onView3D(design.id);
                          onClose();
                        }}
                        className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg flex items-center justify-center gap-1 font-semibold transition"
                        title="Inspect 360 Exterior 3D"
                      >
                        <Box className="w-3 h-3 text-amber-400" />
                        <span>3D View</span>
                      </button>

                      <button
                        onClick={() => {
                          onSelectDesign(design.id);
                          onExploreInterior(design.id);
                          onClose();
                        }}
                        className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg flex items-center justify-center gap-1 font-semibold transition"
                        title="Enter first-person interior walkthrough"
                      >
                        <Eye className="w-3 h-3 text-emerald-400" />
                        <span>Walkthrough</span>
                      </button>

                      <button
                        onClick={() => {
                          onSelectDesign(design.id);
                          onViewFloorPlan(design.id);
                          onClose();
                        }}
                        className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg flex items-center justify-center gap-1 font-semibold transition"
                        title="View 2D CAD Floor Plan"
                      >
                        <Layout className="w-3 h-3 text-indigo-400" />
                        <span>Floor Plan</span>
                      </button>
                    </div>

                    {/* Primary Select Button */}
                    <button
                      onClick={() => {
                        onSelectDesign(design.id);
                        onClose();
                      }}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                        isSelected
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md font-bold'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" /> Keep Selected
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-slate-950" /> Select This Design
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            Tip: You can customize any selected design in the 2D CAD editor and 3D BIM workspace before saving.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Close Gallery
          </button>
        </div>
      </div>

      {/* Side-by-side comparison modal */}
      <DesignComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        designs={comparedDesigns.length >= 2 ? comparedDesigns : designs.slice(0, 3)}
        selectedDesignId={selectedDesignId}
        onSelectDesign={onSelectDesign}
        currency={plot.currency}
      />
    </div>
  );
};
