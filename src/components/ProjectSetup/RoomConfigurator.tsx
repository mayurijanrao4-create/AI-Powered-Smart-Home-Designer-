/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  ROOM_PALETTES,
  convertFromMeters,
  convertToMeters,
  formatArea,
  formatDimension,
} from '../../constants/defaults';
import {
  FloorPlanLayout,
  PlotConfig,
  RoomCategory,
  RoomRequirement,
} from '../../types/house';
import { validatePlotAndRequirements } from '../../utils/geometry';

interface RoomConfiguratorProps {
  plot: PlotConfig;
  requirements: RoomRequirement[];
  onChangeRequirements: (updated: RoomRequirement[]) => void;
  layout: FloorPlanLayout;
  onRegenerateLayout: () => void;
}

export const RoomConfigurator: React.FC<RoomConfiguratorProps> = ({
  plot,
  requirements,
  onChangeRequirements,
  layout,
  onRegenerateLayout,
}) => {
  const [activeFloorTab, setActiveFloorTab] = useState<number>(0);
  const [isAddingRoom, setIsAddingRoom] = useState(false);

  // New room draft state
  const [newRoomCategory, setNewRoomCategory] = useState<RoomCategory>('bedroom');
  const [newRoomName, setNewRoomName] = useState('New Bedroom');
  const [newRoomWidth, setNewRoomWidth] = useState(3.6);
  const [newRoomLength, setNewRoomLength] = useState(3.4);

  // Feasibility Check
  const validation = validatePlotAndRequirements(plot, requirements);

  const floorRooms = requirements.filter((r) => r.floorNumber === activeFloorTab);

  const handleAddRoom = () => {
    const id = `room_${Date.now()}`;
    const newReq: RoomRequirement = {
      id,
      name: newRoomName || ROOM_PALETTES[newRoomCategory]?.label || 'Custom Room',
      category: newRoomCategory,
      floorNumber: activeFloorTab,
      preferredWidthM: newRoomWidth,
      preferredLengthM: newRoomLength,
      minWidthM: Math.max(1.8, newRoomWidth * 0.85),
      minLengthM: Math.max(1.8, newRoomLength * 0.85),
      furniture: [],
    };

    onChangeRequirements([...requirements, newReq]);
    setIsAddingRoom(false);
  };

  const handleDeleteRoom = (id: string) => {
    onChangeRequirements(requirements.filter((r) => r.id !== id));
  };

  const handleDuplicateRoom = (req: RoomRequirement) => {
    const duplicate: RoomRequirement = {
      ...req,
      id: `room_${Date.now()}`,
      name: `${req.name} (Copy)`,
    };
    onChangeRequirements([...requirements, duplicate]);
  };

  const handleUpdateRoom = (id: string, updates: Partial<RoomRequirement>) => {
    onChangeRequirements(
      requirements.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  return (
    <div className="space-y-6 text-xs text-slate-300">
      {/* 1. Civil Feasibility & Buildable Fit Validation Banner */}
      <div
        className={`rounded-xl p-4 border transition-all ${
          validation.isValid
            ? 'bg-emerald-950/30 border-emerald-800/80'
            : 'bg-rose-950/40 border-rose-800/90'
        }`}
      >
        <div className="flex items-start gap-3">
          {validation.isValid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white">
                {validation.isValid
                  ? 'Spatial Constraints Satisfied'
                  : 'Civil Engineering Fit Notice'}
              </h4>
              <span
                className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${
                  validation.isValid
                    ? 'bg-emerald-900/60 text-emerald-300'
                    : 'bg-rose-900/60 text-rose-300'
                }`}
              >
                Ground Coverage: {Math.round(validation.coverageRatio * 100)}%
              </span>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              {validation.isValid
                ? `The requested room dimensions comfortably fit within the buildable footprint of ${Math.round(
                    validation.buildableArea * 10.7639
                  )} sq.ft with 18% allowance for exterior & interior structural load-bearing walls.`
                : validation.warnings[0]}
            </p>

            {layout.warnings.length > 0 && (
              <div className="pt-2 text-[11px] text-amber-300 space-y-1">
                {layout.warnings.map((w, idx) => (
                  <div key={idx}>• {w}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Floor Level Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          {Array.from({ length: plot.floorCount }).map((_, f) => {
            const countForFloor = requirements.filter((r) => r.floorNumber === f).length;
            return (
              <button
                key={f}
                onClick={() => setActiveFloorTab(f)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeFloorTab === f
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{f === 0 ? 'Ground Floor' : f === 1 ? '1st Floor (Duplex)' : `Floor ${f + 1}`}</span>
                <span className="px-1.5 py-0.5 bg-slate-950/60 rounded text-[10px] font-mono">
                  {countForFloor}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            setIsAddingRoom(true);
            setNewRoomCategory('bedroom');
            setNewRoomName('New Bedroom');
            setNewRoomWidth(3.6);
            setNewRoomLength(3.4);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition"
        >
          <Plus className="w-4 h-4" /> Add Space
        </button>
      </div>

      {/* 3. New Room Modal / Dropdown Box */}
      {isAddingRoom && (
        <div className="bg-slate-900 p-4 rounded-xl border border-amber-500/50 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="font-bold text-sm text-white">Add Space to Floor {activeFloorTab}</h4>
            <button
              onClick={() => setIsAddingRoom(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Room Category</label>
              <select
                value={newRoomCategory}
                onChange={(e) => {
                  const cat = e.target.value as RoomCategory;
                  setNewRoomCategory(cat);
                  setNewRoomName(ROOM_PALETTES[cat]?.label || 'Custom Room');
                  if (ROOM_PALETTES[cat]) {
                    setNewRoomWidth(ROOM_PALETTES[cat].standardW);
                    setNewRoomLength(ROOM_PALETTES[cat].standardL);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {Object.entries(ROOM_PALETTES).map(([catKey, p]) => (
                  <option key={catKey} value={catKey}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Custom Room Label</label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                Width ({plot.unit})
              </label>
              <input
                type="number"
                step="0.1"
                value={Number(convertFromMeters(newRoomWidth, plot.unit).toFixed(1))}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 2;
                  setNewRoomWidth(convertToMeters(val, plot.unit));
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                Length ({plot.unit})
              </label>
              <input
                type="number"
                step="0.1"
                value={Number(convertFromMeters(newRoomLength, plot.unit).toFixed(1))}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 2;
                  setNewRoomLength(convertToMeters(val, plot.unit));
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => setIsAddingRoom(false)}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleAddRoom}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow"
            >
              Confirm Space
            </button>
          </div>
        </div>
      )}

      {/* 4. Room Requirements Card List */}
      <div className="space-y-2.5">
        {floorRooms.length === 0 ? (
          <div className="text-center py-8 bg-slate-900/50 rounded-xl border border-dashed border-slate-800 text-slate-500">
            No rooms added yet on this floor. Click "Add Space" to begin configuring this level.
          </div>
        ) : (
          floorRooms.map((req) => {
            const palette = ROOM_PALETTES[req.category] || ROOM_PALETTES.custom;
            const areaM2 = req.preferredWidthM * req.preferredLengthM;

            return (
              <div
                key={req.id}
                className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition flex flex-wrap items-center justify-between gap-3"
              >
                {/* Room Category & Name */}
                <div className="flex items-center gap-3 min-w-[200px]">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: palette.stroke }}
                  />
                  <div>
                    <h5 className="font-bold text-sm text-white">{req.name}</h5>
                    <span className="text-[11px] text-slate-400 capitalize">
                      {palette.label}
                    </span>
                  </div>
                </div>

                {/* Dimensions & Area */}
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Dimensions</span>
                    <span className="font-mono text-slate-200">
                      {formatDimension(req.preferredWidthM, plot.unit)} × {formatDimension(req.preferredLengthM, plot.unit)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block">Carpet Area</span>
                    <span className="font-mono text-amber-400 font-semibold">
                      {formatArea(areaM2, plot.unit).primary}
                    </span>
                  </div>
                </div>

                {/* Actions: Duplicate, Delete */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDuplicateRoom(req)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    title="Duplicate room"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteRoom(req.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                    title="Delete room"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Recalculate Button */}
      <div className="pt-2">
        <button
          onClick={onRegenerateLayout}
          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg transition text-xs tracking-wide uppercase"
        >
          ⚡ Re-calculate & Update 2D / 3D Layout
        </button>
      </div>
    </div>
  );
};
