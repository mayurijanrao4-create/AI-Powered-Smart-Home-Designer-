/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  Compass,
  DollarSign,
  Layers,
  MapPin,
  Ruler,
  Sparkles,
  User,
} from 'lucide-react';
import {
  ARCHITECTURAL_THEMES,
  convertFromMeters,
  convertToMeters,
  formatArea,
  formatDimension,
  SAMPLE_PROJECTS,
} from '../../constants/defaults';
import {
  ArchitecturalStyle,
  CardinalDirection,
  MeasurementUnit,
  PlotConfig,
  PlotShape,
  RoomRequirement,
} from '../../types/house';
import { getBuildableFootprint } from '../../utils/geometry';

interface PlotFormProps {
  plot: PlotConfig;
  onChangePlot: (updated: PlotConfig) => void;
  onApplyArchetype?: (plot: PlotConfig, rooms: RoomRequirement[]) => void;
}

export const PlotForm: React.FC<PlotFormProps> = ({ plot, onChangePlot, onApplyArchetype }) => {
  const footprint = getBuildableFootprint(plot);
  const plotAreaM2 = plot.widthM * plot.lengthM;
  const buildableAreaM2 = footprint.width * footprint.length;

  const handleUnitChange = (newUnit: MeasurementUnit) => {
    onChangePlot({
      ...plot,
      unit: newUnit,
    });
  };

  const updateDimensionInMeters = (
    field: 'widthM' | 'lengthM',
    displayValue: number
  ) => {
    const inMeters = convertToMeters(displayValue, plot.unit);
    onChangePlot({
      ...plot,
      [field]: Math.max(1, inMeters),
    });
  };

  const updateSetbackInMeters = (
    side: 'front' | 'rear' | 'left' | 'right',
    displayValue: number
  ) => {
    const inMeters = convertToMeters(displayValue, plot.unit);
    onChangePlot({
      ...plot,
      setbacks: {
        ...plot.setbacks,
        [side]: Math.max(0, inMeters),
      },
    });
  };

  const currentDisplayWidth = Number(convertFromMeters(plot.widthM, plot.unit).toFixed(1));
  const currentDisplayLength = Number(convertFromMeters(plot.lengthM, plot.unit).toFixed(1));

  return (
    <div className="space-y-6 text-xs text-slate-300">
      {/* 0. 1-Click Residential House Archetypes */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 rounded-2xl p-4 border border-indigo-900/40 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>1-Click Residential Archetype Presets</span>
          </div>
          <span className="text-[11px] text-indigo-300 font-medium">Auto-Populate 1 BHK to 5 BHK</span>
        </div>
        <p className="text-slate-400 text-xs">
          Select an architectural standard configuration to instantly populate dimensions, room requirements, and generate BIM designs:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {SAMPLE_PROJECTS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onApplyArchetype?.(sample.plot, sample.rooms)}
              className="p-2.5 rounded-xl bg-slate-950/90 hover:bg-indigo-900/40 border border-slate-800 hover:border-indigo-500/80 text-left transition group shadow flex flex-col justify-between"
            >
              <div>
                <div className="text-[11px] font-bold text-slate-200 group-hover:text-amber-400 transition truncate">
                  {sample.id === 'starter_1bhk_25x40'
                    ? '1 BHK Starter'
                    : sample.id === 'compact_25x50'
                    ? '2 BHK Standard'
                    : sample.id === '30x50_duplex'
                    ? '3 BHK Duplex'
                    : sample.id === 'luxury_villa_40x60'
                    ? '4 BHK Villa'
                    : '5 BHK Grand Estate'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {sample.plot.floorCount === 1 ? 'Ground Only' : `G+${sample.plot.floorCount - 1} Storeys`}
                </div>
              </div>
              <div className="text-[10px] font-mono text-emerald-400 mt-2 font-semibold">
                {sample.plot.currency === 'INR' ? `₹${(sample.plot.budgetTarget / 100000).toFixed(0)}L` : `$${Math.round(sample.plot.budgetTarget / 1000)}k`}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 1. Client & Project Information */}
      <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-white font-semibold text-sm">
          <User className="w-4 h-4 text-amber-400" />
          <span>Client & Project Details</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Project Name</label>
            <input
              type="text"
              value={plot.projectTitle}
              onChange={(e) => onChangePlot({ ...plot, projectTitle: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              placeholder="e.g. Lotus Residence"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Client Name</label>
            <input
              type="text"
              value={plot.clientName}
              onChange={(e) => onChangePlot({ ...plot, clientName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              placeholder="e.g. Rajesh Kumar"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Site Address / Plot Number</label>
            <input
              type="text"
              value={plot.location}
              onChange={(e) => onChangePlot({ ...plot, location: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              placeholder="e.g. Plot #45, Green Meadows"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Contact Phone</label>
            <input
              type="text"
              value={plot.clientPhone}
              onChange={(e) => onChangePlot({ ...plot, clientPhone: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              placeholder="+91 98765 43210"
            />
          </div>
        </div>
      </div>

      {/* 2. Plot Dimensions & Measurement Unit */}
      <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Ruler className="w-4 h-4 text-amber-400" />
            <span>Plot Geometry & Scale</span>
          </div>

          {/* Unit Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['feet', 'meters', 'inches', 'millimeters'] as MeasurementUnit[]).map((u) => (
              <button
                key={u}
                onClick={() => handleUnitChange(u)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition ${
                  plot.unit === u
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {u === 'feet' ? 'Feet (ft)' : u === 'meters' ? 'Metres (m)' : u === 'inches' ? 'Inches' : 'mm'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              Plot Width ({plot.unit})
            </label>
            <input
              type="number"
              step="0.5"
              value={currentDisplayWidth}
              onChange={(e) => updateDimensionInMeters('widthM', parseFloat(e.target.value) || 1)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              Plot Length ({plot.unit})
            </label>
            <input
              type="number"
              step="0.5"
              value={currentDisplayLength}
              onChange={(e) => updateDimensionInMeters('lengthM', parseFloat(e.target.value) || 1)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Live Area Summary Cards */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-slate-950/90 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[11px]">Total Plot Land Area</span>
            <div className="text-base font-bold text-white mt-0.5">
              {formatArea(plotAreaM2, plot.unit).primary}
            </div>
            <div className="text-[10px] text-slate-500">
              {formatArea(plotAreaM2, plot.unit).secondary}
            </div>
          </div>

          <div className="bg-slate-950/90 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[11px]">Available Buildable Footprint</span>
            <div className="text-base font-bold text-amber-400 mt-0.5">
              {formatArea(buildableAreaM2, plot.unit).primary}
            </div>
            <div className="text-[10px] text-slate-500">
              {formatDimension(footprint.width, plot.unit)} × {formatDimension(footprint.length, plot.unit)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Road, Orientation & Facing */}
      <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-white font-semibold text-sm">
          <Compass className="w-4 h-4 text-amber-400" />
          <span>Road Location & Solar / Vastu Orientation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Road Location</label>
            <select
              value={plot.roadLocation}
              onChange={(e) => onChangePlot({ ...plot, roadLocation: e.target.value as CardinalDirection })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="East">East (Sunrise Road)</option>
              <option value="North">North (Cool Road)</option>
              <option value="West">West (Sunset Road)</option>
              <option value="South">South Road</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Road Width</label>
            <input
              type="number"
              step="1"
              value={Number(convertFromMeters(plot.roadWidthM, plot.unit).toFixed(1))}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 6;
                onChangePlot({ ...plot, roadWidthM: convertToMeters(val, plot.unit) });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">House Facing Direction</label>
            <select
              value={plot.preferredHouseFacing}
              onChange={(e) => onChangePlot({ ...plot, preferredHouseFacing: e.target.value as CardinalDirection })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="East">East (Vastu Recommended)</option>
              <option value="North">North (Prosperity)</option>
              <option value="North-East">North-East (Ishanya)</option>
              <option value="West">West</option>
              <option value="South">South</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Municipal Setbacks */}
      <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Building className="w-4 h-4 text-amber-400" />
            <span>Setbacks & Building Bylaws</span>
          </div>
          <span className="text-[11px] text-slate-400">Unit: {plot.unit}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Front Setback</label>
            <input
              type="number"
              step="0.5"
              value={Number(convertFromMeters(plot.setbacks.front, plot.unit).toFixed(1))}
              onChange={(e) => updateSetbackInMeters('front', parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Rear Setback</label>
            <input
              type="number"
              step="0.5"
              value={Number(convertFromMeters(plot.setbacks.rear, plot.unit).toFixed(1))}
              onChange={(e) => updateSetbackInMeters('rear', parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Left Setback</label>
            <input
              type="number"
              step="0.5"
              value={Number(convertFromMeters(plot.setbacks.left, plot.unit).toFixed(1))}
              onChange={(e) => updateSetbackInMeters('left', parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Right Setback</label>
            <input
              type="number"
              step="0.5"
              value={Number(convertFromMeters(plot.setbacks.right, plot.unit).toFixed(1))}
              onChange={(e) => updateSetbackInMeters('right', parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* 5. Storeys & Architectural Style */}
      <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-white font-semibold text-sm">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Floors & Architectural Palette</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Number of Floors</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { count: 1, label: 'Ground (1)' },
                { count: 2, label: 'G+1 Duplex (2)' },
                { count: 3, label: 'G+2 Villa (3)' },
              ].map((f) => (
                <button
                  key={f.count}
                  type="button"
                  onClick={() => onChangePlot({ ...plot, floorCount: f.count })}
                  className={`py-2 px-1 rounded-lg text-center font-semibold transition ${
                    plot.floorCount === f.count
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Floor-to-Ceiling Height</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={Number(convertFromMeters(plot.floorHeightM, plot.unit).toFixed(1))}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 3.0;
                  onChangePlot({ ...plot, floorHeightM: convertToMeters(val, plot.unit) });
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
              <span className="text-slate-400">{plot.unit}</span>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-400 mb-1 font-medium">Architectural Style & Finishes</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.keys(ARCHITECTURAL_THEMES) as ArchitecturalStyle[]).map((styleKey) => {
                const theme = ARCHITECTURAL_THEMES[styleKey];
                const isSelected = plot.architecturalStyle === styleKey;
                return (
                  <button
                    key={styleKey}
                    type="button"
                    onClick={() => onChangePlot({ ...plot, architecturalStyle: styleKey })}
                    className={`p-2.5 rounded-xl text-left border transition ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between">
                      <span>{theme.name}</span>
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-slate-600"
                        style={{ backgroundColor: theme.accentWallColor }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {theme.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
