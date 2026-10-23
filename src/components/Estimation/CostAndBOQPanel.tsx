/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Building,
  CheckCircle,
  Coins,
  FileSpreadsheet,
  Hammer,
  HelpCircle,
  Percent,
  Ruler,
  Sliders,
} from 'lucide-react';
import { DEFAULT_COST_PARAMETERS } from '../../constants/defaults';
import {
  CostParameters,
  FloorPlanLayout,
  PlotConfig,
} from '../../types/house';
import { calculateDetailedEstimate } from '../../utils/costEstimator';

interface CostAndBOQPanelProps {
  plot: PlotConfig;
  layout: FloorPlanLayout;
}

export const CostAndBOQPanel: React.FC<CostAndBOQPanelProps> = ({ plot, layout }) => {
  const [costParams, setCostParams] = useState<CostParameters>(DEFAULT_COST_PARAMETERS);
  const [showRateTuner, setShowRateTuner] = useState(false);

  const estimate = calculateDetailedEstimate(plot, layout, costParams);

  const formatCurrency = (val: number) => {
    if (plot.currency === 'INR') {
      return `₹${val.toLocaleString('en-IN')}`;
    }
    return `$${val.toLocaleString()}`;
  };

  return (
    <div className="space-y-6 text-xs text-slate-300">
      {/* 1. Header & Total Estimated Cost Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 p-5 rounded-2xl border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-semibold uppercase tracking-wider text-[11px]">
                Preliminary Civil Engineering Estimate
              </span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-mono">
                {plot.currency}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">
              {formatCurrency(estimate.totalEstimatedCost)}
            </h2>
            <div className="text-slate-400 text-xs mt-1">
              Estimated Rate: <span className="text-slate-200 font-mono font-semibold">{formatCurrency(Math.round(estimate.totalEstimatedCost / Math.max(1, estimate.totalBuiltUpAreaSqFt)))} / sq.ft</span> (Built-up Area)
            </div>
          </div>

          <button
            onClick={() => setShowRateTuner(!showRateTuner)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold shadow-lg transition"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            {showRateTuner ? 'Close Rate Tuner' : 'Customize Local Rates'}
          </button>
        </div>
      </div>

      {/* Local Rate Tuner Drawer */}
      {showRateTuner && (
        <div className="bg-slate-900 p-4 rounded-xl border border-amber-500/40 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="font-bold text-sm text-white">Local Material & Labor Rates</h4>
            <button
              onClick={() => setCostParams(DEFAULT_COST_PARAMETERS)}
              className="text-xs text-amber-400 hover:underline"
            >
              Reset to Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Civil Structure (/sq.ft)</label>
              <input
                type="number"
                value={costParams.standardCivilCostPerSqFt}
                onChange={(e) =>
                  setCostParams({
                    ...costParams,
                    standardCivilCostPerSqFt: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Labor Rate (/sq.ft)</label>
              <input
                type="number"
                value={costParams.laborRatePerSqFt}
                onChange={(e) =>
                  setCostParams({
                    ...costParams,
                    laborRatePerSqFt: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Steel Rate (/kg)</label>
              <input
                type="number"
                value={costParams.steelRatePerKg}
                onChange={(e) =>
                  setCostParams({
                    ...costParams,
                    steelRatePerKg: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Cement Bag (50kg)</label>
              <input
                type="number"
                value={costParams.cementRatePerBag}
                onChange={(e) =>
                  setCostParams({
                    ...costParams,
                    cementRatePerBag: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Flooring & Tiling (/sq.ft)</label>
              <input
                type="number"
                value={costParams.flooringRatePerSqFt}
                onChange={(e) =>
                  setCostParams({
                    ...costParams,
                    flooringRatePerSqFt: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Painting (/sq.ft)</label>
              <input
                type="number"
                value={costParams.paintRatePerSqFt}
                onChange={(e) =>
                  setCostParams({
                    ...costParams,
                    paintRatePerSqFt: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. Official Area Statement & Municipal Compliance */}
      <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-white font-semibold text-sm">
          <Ruler className="w-4 h-4 text-amber-400" />
          <span>Architectural Area Statement & RERA Schedule</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Plot Land Area</span>
            <div className="text-base font-bold text-white font-mono mt-0.5">
              {estimate.plotAreaSqFt.toLocaleString()} sq.ft
            </div>
            <div className="text-[10px] text-slate-400">{estimate.plotAreaSqM} sq.m</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ground Coverage</span>
            <div className="text-base font-bold text-white font-mono mt-0.5">
              {estimate.groundCoveragePercentage}%
            </div>
            <div className="text-[10px] text-slate-400">{estimate.groundCoverageSqFt.toLocaleString()} sq.ft</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Carpet Area</span>
            <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
              {estimate.totalCarpetAreaSqFt.toLocaleString()} sq.ft
            </div>
            <div className="text-[10px] text-slate-400">{estimate.totalCarpetAreaSqM} sq.m</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Built-Up Area (BUA)</span>
            <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
              {estimate.totalBuiltUpAreaSqFt.toLocaleString()} sq.ft
            </div>
            <div className="text-[10px] text-slate-400">FAR / FSI: {estimate.fsiRatio}</div>
          </div>
        </div>
      </div>

      {/* 3. Detailed Bill of Quantities (BOQ) */}
      <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-white font-semibold text-sm">
          <FileSpreadsheet className="w-4 h-4 text-amber-400" />
          <span>Structural Materials Bill of Quantities (BOQ)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400">Ready-Mix / Site Concrete</span>
            <div className="text-sm font-bold text-white font-mono mt-1">
              {estimate.concreteVolumeCuM} m³
            </div>
            <span className="text-[10px] text-slate-500">M20 / M25 RCC Structural</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400">Reinforcement TMT Steel</span>
            <div className="text-sm font-bold text-white font-mono mt-1">
              {(estimate.steelWeightKg / 1000).toFixed(2)} Metric Tonnes
            </div>
            <span className="text-[10px] text-slate-500">{estimate.steelWeightKg.toLocaleString()} kg (Fe550D)</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400">Masonry Clay Bricks / AAC</span>
            <div className="text-sm font-bold text-white font-mono mt-1">
              {estimate.bricksCount.toLocaleString()} Pcs
            </div>
            <span className="text-[10px] text-slate-500">External 9″ & Internal 4.5″</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400">Cement Bags (50kg)</span>
            <div className="text-sm font-bold text-white font-mono mt-1">
              {estimate.cementBagsCount.toLocaleString()} Bags
            </div>
            <span className="text-[10px] text-slate-500">PPC / OPC Grade 53</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400">Manufactured Sand (M-Sand)</span>
            <div className="text-sm font-bold text-white font-mono mt-1">
              {estimate.sandVolumeCuFt.toLocaleString()} cu.ft
            </div>
            <span className="text-[10px] text-slate-500">Concrete & Plastering</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400">Coarse Blue Metal Aggregate</span>
            <div className="text-sm font-bold text-white font-mono mt-1">
              {estimate.aggregateVolumeCuFt.toLocaleString()} cu.ft
            </div>
            <span className="text-[10px] text-slate-500">20mm & 12mm Graded</span>
          </div>
        </div>
      </div>

      {/* 4. Cost Breakdown by Category */}
      <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-white font-semibold text-sm">
          <Coins className="w-4 h-4 text-amber-400" />
          <span>Stage-wise Cost Breakdown</span>
        </div>

        <div className="space-y-2">
          {[
            { label: '1. RCC Frame & Structural Concrete', cost: estimate.civilStructureCost, percent: 38 },
            { label: '2. Masonry Walls & 2-Coat Plastering', cost: estimate.masonryAndPlasterCost, percent: 14 },
            { label: '3. Vitrified / Marble Flooring & Skirting', cost: estimate.flooringAndTilingCost, percent: 10 },
            { label: '4. Teak Doors, UPVC Windows & Glass', cost: estimate.doorsWindowsCost, percent: 8 },
            { label: '5. Electrical Wiring, Plumbing & Sanitaryware', cost: estimate.electricalAndPlumbingCost, percent: 10 },
            { label: '6. Premium Emulsion Painting & Weather-proof Exterior', cost: estimate.paintingFinishesCost, percent: 6 },
            { label: '7. Civil Masonry & Carpentry Labor Charges', cost: estimate.laborCost, percent: 14 },
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-slate-300 font-medium">{item.label}</span>
                <div className="w-48 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${item.percent}%` }} />
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-white">{formatCurrency(item.cost)}</div>
                <span className="text-[10px] text-slate-500">{item.percent}% of budget</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Civil Engineering Regulatory & Feasibility Disclaimer */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-slate-400 space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-amber-400 text-xs">
          <AlertTriangle className="w-4 h-4" />
          <span>Engineering Feasibility & Regulatory Disclaimer</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          This preliminary architectural proposal, room area statement, and cost estimate are prepared for early-stage planning and client visualization. Soil bearing capacity (SBC) testing, structural reinforcement design by a licensed structural engineer, and municipal sanction from the local development authority are required prior to commencement of physical excavation or construction.
        </p>
      </div>
    </div>
  );
};
