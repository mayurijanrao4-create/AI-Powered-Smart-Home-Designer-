/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Check,
  CheckCircle2,
  Compass,
  DollarSign,
  Layers,
  Ruler,
  Sparkles,
  X,
} from 'lucide-react';
import { HouseDesignAlternative, PlotConfig } from '../../types/house';

interface DesignComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  designs: HouseDesignAlternative[];
  selectedDesignId: string;
  onSelectDesign: (id: string) => void;
  currency: string;
}

export const DesignComparisonModal: React.FC<DesignComparisonModalProps> = ({
  isOpen,
  onClose,
  designs,
  selectedDesignId,
  onSelectDesign,
  currency,
}) => {
  if (!isOpen || designs.length === 0) return null;

  const formatCost = (val: number) => {
    if (currency === 'INR') {
      return `₹${val.toLocaleString('en-IN')}`;
    }
    return `$${val.toLocaleString()}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base text-white">Compare House Design Alternatives</h3>
              <p className="text-xs text-slate-400">
                Architectural comparison of {designs.length} selected candidate designs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Matrix Table */}
        <div className="flex-1 overflow-auto p-6">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `200px repeat(${designs.length}, minmax(240px, 1fr))`,
            }}
          >
            {/* Header Column */}
            <div className="font-bold text-xs uppercase tracking-wider text-slate-400 self-end pb-3">
              Design Metric
            </div>
            {designs.map((d) => (
              <div
                key={d.id}
                className={`p-4 rounded-xl border flex flex-col justify-between ${
                  d.id === selectedDesignId
                    ? 'bg-amber-500/10 border-amber-500/60'
                    : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono font-bold text-amber-400">
                      {d.styleId.replace('_', ' ')}
                    </span>
                    {d.id === selectedDesignId && (
                      <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm text-white mt-1">{d.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{d.tagline}</p>
                </div>

                <button
                  onClick={() => {
                    onSelectDesign(d.id);
                    onClose();
                  }}
                  className={`mt-4 w-full py-1.5 rounded-lg text-xs font-bold transition ${
                    d.id === selectedDesignId
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow'
                  }`}
                >
                  {d.id === selectedDesignId ? 'Keep Current' : 'Select This Design'}
                </button>
              </div>
            ))}

            {/* Row 1: Estimated Budget */}
            <div className="font-semibold text-xs text-slate-300 py-3 border-t border-slate-800 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              <span>Estimated Budget</span>
            </div>
            {designs.map((d) => (
              <div key={d.id} className="py-3 border-t border-slate-800 font-mono font-bold text-amber-400 text-sm">
                {formatCost(d.estimatedCost)}
              </div>
            ))}

            {/* Row 2: Built-Up Area (BUA) */}
            <div className="font-semibold text-xs text-slate-300 py-3 border-t border-slate-800 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-amber-400" />
              <span>Built-Up Area</span>
            </div>
            {designs.map((d) => (
              <div key={d.id} className="py-3 border-t border-slate-800 text-xs font-mono text-white">
                {d.builtUpAreaSqFt.toLocaleString()} sq.ft
              </div>
            ))}

            {/* Row 3: Usable Carpet Area */}
            <div className="font-semibold text-xs text-slate-300 py-3 border-t border-slate-800">
              Carpet Area
            </div>
            {designs.map((d) => (
              <div key={d.id} className="py-3 border-t border-slate-800 text-xs font-mono text-emerald-400">
                {d.carpetAreaSqFt.toLocaleString()} sq.ft
              </div>
            ))}

            {/* Row 4: Ground Coverage */}
            <div className="font-semibold text-xs text-slate-300 py-3 border-t border-slate-800">
              Ground Coverage
            </div>
            {designs.map((d) => (
              <div key={d.id} className="py-3 border-t border-slate-800 text-xs font-mono text-slate-200">
                {d.groundCoveragePercentage}% of plot
              </div>
            ))}

            {/* Row 5: Circulation Efficiency */}
            <div className="font-semibold text-xs text-slate-300 py-3 border-t border-slate-800">
              Circulation Score
            </div>
            {designs.map((d) => (
              <div key={d.id} className="py-3 border-t border-slate-800 text-xs font-mono text-slate-200">
                <span className="font-bold text-amber-400">{d.circulationEfficiencyScore}/100</span>
              </div>
            ))}

            {/* Row 6: Vastu Alignment Score */}
            <div className="font-semibold text-xs text-slate-300 py-3 border-t border-slate-800 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Vastu Alignment</span>
            </div>
            {designs.map((d) => (
              <div key={d.id} className="py-3 border-t border-slate-800 text-xs font-mono text-emerald-400">
                <span className="font-bold">{d.vastuScore}% Vastu Compliant</span>
              </div>
            ))}

            {/* Row 7: Elevation Features */}
            <div className="font-semibold text-xs text-slate-300 py-3 border-t border-slate-800">
              Elevation & Facade
            </div>
            {designs.map((d) => (
              <div key={d.id} className="py-3 border-t border-slate-800 text-[11px] text-slate-300 space-y-1">
                {d.elevationFeatures.map((ef, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <span className="text-amber-400">•</span>
                    <span>{ef}</span>
                  </div>
                ))}
              </div>
            ))}

            {/* Row 8: Key Highlights */}
            <div className="font-semibold text-xs text-slate-300 py-3 border-t border-slate-800">
              Architectural Highlights
            </div>
            {designs.map((d) => (
              <div key={d.id} className="py-3 border-t border-slate-800 text-[11px] text-slate-300 space-y-1">
                {d.keyHighlights.map((kh, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{kh}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
