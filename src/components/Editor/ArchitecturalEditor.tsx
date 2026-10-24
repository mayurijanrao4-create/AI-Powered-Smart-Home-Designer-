/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  DoorOpen,
  Eye,
  Layers,
  Move,
  Plus,
  Redo,
  RotateCw,
  Ruler,
  Save,
  Sliders,
  Trash2,
  Undo,
} from 'lucide-react';
import { ARCHITECTURAL_THEMES, ROOM_PALETTES, formatArea, formatDimension } from '../../constants/defaults';
import {
  ArchitecturalStyle,
  DoorOpening,
  FloorPlanLayout,
  FurnitureSpec,
  FurnitureType,
  GeneratedRoom,
  PlotConfig,
  RoomCategory,
  WindowOpening,
} from '../../types/house';

interface ArchitecturalEditorProps {
  plot: PlotConfig;
  layout: FloorPlanLayout;
  onUpdateLayout: (updatedLayout: FloorPlanLayout) => void;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  selectedFurnitureId: string | null;
  onSelectFurniture: (furnitureId: string | null) => void;
  onSaveAsNewAlternative?: (name: string) => void;
}

export const ArchitecturalEditor: React.FC<ArchitecturalEditorProps> = ({
  plot,
  layout,
  onUpdateLayout,
  selectedRoomId,
  onSelectRoom,
  selectedFurnitureId,
  onSelectFurniture,
  onSaveAsNewAlternative,
}) => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'furniture' | 'openings' | 'finishes'>('rooms');
  const [newVariantName, setNewVariantName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Undo / Redo history stacks
  const [history, setHistory] = useState<FloorPlanLayout[]>([]);
  const [redoStack, setRedoStack] = useState<FloorPlanLayout[]>([]);

  const pushState = (newLayout: FloorPlanLayout) => {
    setHistory((prev) => [...prev, layout]);
    setRedoStack([]);
    onUpdateLayout(newLayout);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoStack((r) => [layout, ...r]);
    setHistory((h) => h.slice(0, h.length - 1));
    onUpdateLayout(prev);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory((h) => [...h, layout]);
    setRedoStack((r) => r.slice(1));
    onUpdateLayout(next);
  };

  const selectedRoom = layout.rooms.find((r) => r.id === selectedRoomId);

  // Room dimension update
  const handleUpdateRoomDim = (roomId: string, width: number, length: number) => {
    const updatedRooms = layout.rooms.map((r) => {
      if (r.id === roomId) {
        const areaM2 = Number((width * length).toFixed(2));
        return { ...r, width: Math.max(1.8, width), length: Math.max(1.8, length), areaM2 };
      }
      return r;
    });

    pushState({
      ...layout,
      rooms: updatedRooms,
    });
  };

  // Room position update
  const handleUpdateRoomPos = (roomId: string, x: number, z: number) => {
    const updatedRooms = layout.rooms.map((r) => {
      if (r.id === roomId) {
        return { ...r, x: Math.max(0, x), z: Math.max(0, z) };
      }
      return r;
    });

    pushState({
      ...layout,
      rooms: updatedRooms,
    });
  };

  // Add new furniture to selected room
  const handleAddFurniture = (type: FurnitureType, name: string, w = 1.6, l = 2.0) => {
    if (!selectedRoom) return;

    const newFur: FurnitureSpec = {
      id: `fur_custom_${Date.now()}`,
      type,
      name,
      x: 0,
      z: 0,
      width: w,
      length: l,
      rotation: 0,
    };

    const updatedRooms = layout.rooms.map((r) => {
      if (r.id === selectedRoom.id) {
        return {
          ...r,
          furniture: [...r.furniture, newFur],
        };
      }
      return r;
    });

    pushState({ ...layout, rooms: updatedRooms });
  };

  // Delete furniture
  const handleDeleteFurniture = (furId: string) => {
    if (!selectedRoom) return;
    const updatedRooms = layout.rooms.map((r) => {
      if (r.id === selectedRoom.id) {
        return {
          ...r,
          furniture: r.furniture.filter((f) => f.id !== furId),
        };
      }
      return r;
    });
    pushState({ ...layout, rooms: updatedRooms });
  };

  // Rotate furniture
  const handleRotateFurniture = (furId: string) => {
    if (!selectedRoom) return;
    const updatedRooms = layout.rooms.map((r) => {
      if (r.id === selectedRoom.id) {
        return {
          ...r,
          furniture: r.furniture.map((f) =>
            f.id === furId ? { ...f, rotation: (f.rotation + 90) % 360 } : f
          ),
        };
      }
      return r;
    });
    pushState({ ...layout, rooms: updatedRooms });
  };

  // Move furniture inside room
  const handleMoveFurniture = (furId: string, dx: number, dz: number) => {
    if (!selectedRoom) return;
    const updatedRooms = layout.rooms.map((r) => {
      if (r.id === selectedRoom.id) {
        return {
          ...r,
          furniture: r.furniture.map((f) =>
            f.id === furId ? { ...f, x: Number((f.x + dx).toFixed(2)), z: Number((f.z + dz).toFixed(2)) } : f
          ),
        };
      }
      return r;
    });
    pushState({ ...layout, rooms: updatedRooms });
  };

  // Change architectural theme / finishes
  const handleChangeTheme = (style: ArchitecturalStyle) => {
    pushState({
      ...layout,
      facadeStyle: style,
    });
  };

  // Validation Warnings
  const validationIssues: string[] = [];
  layout.rooms.forEach((r) => {
    if (r.width < 2.0 || r.length < 2.0) {
      validationIssues.push(`"${r.name}" dimension is below minimum acceptable living clearance (2.0m).`);
    }
    if (r.x + r.width > layout.buildableWidth + 0.1 || r.z + r.length > layout.buildableLength + 0.1) {
      validationIssues.push(`"${r.name}" encroaches beyond legal setback buildable boundary.`);
    }
  });

  return (
    <div className="bg-slate-900 border-l border-slate-800 text-slate-200 h-full flex flex-col overflow-hidden text-xs select-none">
      {/* Top Header with Undo / Redo / Save */}
      <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-white">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>BIM Design Editor</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
          {onSaveAsNewAlternative && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow transition"
              title="Save current edited layout as new alternative"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save As</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor Sub-Tabs */}
      <div className="flex items-center border-b border-slate-800 bg-slate-950 text-slate-400">
        <button
          onClick={() => setActiveTab('rooms')}
          className={`flex-1 py-2 text-center font-bold border-b-2 transition ${
            activeTab === 'rooms' ? 'border-amber-500 text-white' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Spaces
        </button>
        <button
          onClick={() => setActiveTab('furniture')}
          className={`flex-1 py-2 text-center font-bold border-b-2 transition ${
            activeTab === 'furniture' ? 'border-amber-500 text-white' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Furniture
        </button>
        <button
          onClick={() => setActiveTab('openings')}
          className={`flex-1 py-2 text-center font-bold border-b-2 transition ${
            activeTab === 'openings' ? 'border-amber-500 text-white' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Doors/Wins
        </button>
        <button
          onClick={() => setActiveTab('finishes')}
          className={`flex-1 py-2 text-center font-bold border-b-2 transition ${
            activeTab === 'finishes' ? 'border-amber-500 text-white' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Finishes
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Validation Alert if issues exist */}
        {validationIssues.length > 0 && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl space-y-1 text-[11px] text-rose-300">
            <div className="flex items-center gap-1.5 font-bold text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>BIM Architectural Notice</span>
            </div>
            {validationIssues.map((issue, idx) => (
              <div key={idx}>• {issue}</div>
            ))}
          </div>
        )}

        {/* TAB 1: Spaces & Room Dimensions */}
        {activeTab === 'rooms' && (
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Select Room to Edit Dimensions
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {layout.rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition ${
                    room.id === selectedRoomId
                      ? 'bg-amber-500/15 border-amber-500 text-white font-bold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: ROOM_PALETTES[room.category]?.stroke || '#F59E0B' }}
                    />
                    <span>{room.name}</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {formatArea(room.areaM2, plot.unit).primary}
                  </span>
                </button>
              ))}
            </div>

            {selectedRoom && (
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3 mt-3 animate-in fade-in">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 font-bold text-white">
                  <span>{selectedRoom.name} Parameters</span>
                  <span className="text-amber-400 font-mono text-xs">
                    {formatDimension(selectedRoom.width, plot.unit)} × {formatDimension(selectedRoom.length, plot.unit)}
                  </span>
                </div>

                {/* Width Slider */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Width (X-axis)</span>
                    <span className="font-mono text-white">{selectedRoom.width.toFixed(1)} m</span>
                  </div>
                  <input
                    type="range"
                    min={2.0}
                    max={8.0}
                    step={0.1}
                    value={selectedRoom.width}
                    onChange={(e) => handleUpdateRoomDim(selectedRoom.id, parseFloat(e.target.value), selectedRoom.length)}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Length Slider */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Length (Z-axis)</span>
                    <span className="font-mono text-white">{selectedRoom.length.toFixed(1)} m</span>
                  </div>
                  <input
                    type="range"
                    min={2.0}
                    max={8.0}
                    step={0.1}
                    value={selectedRoom.length}
                    onChange={(e) => handleUpdateRoomDim(selectedRoom.id, selectedRoom.width, parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Position Offset Sliders */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-slate-400 block mb-1">Position X</span>
                    <input
                      type="number"
                      step={0.1}
                      value={selectedRoom.x}
                      onChange={(e) => handleUpdateRoomPos(selectedRoom.id, parseFloat(e.target.value) || 0, selectedRoom.z)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-center font-mono text-white"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Position Z</span>
                    <input
                      type="number"
                      step={0.1}
                      value={selectedRoom.z}
                      onChange={(e) => handleUpdateRoomPos(selectedRoom.id, selectedRoom.x, parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-center font-mono text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Furniture Management */}
        {activeTab === 'furniture' && (
          <div className="space-y-4">
            {!selectedRoom ? (
              <div className="text-center py-8 text-slate-500 bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                Please select a room in 2D or 3D view to inspect and arrange its furniture items.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{selectedRoom.name} Furniture</span>
                  <span className="text-[11px] text-slate-400">{selectedRoom.furniture.length} items</span>
                </div>

                {/* Existing Furniture List */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedRoom.furniture.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-white text-[11px]">{item.name}</div>
                        <span className="text-[10px] text-slate-400 capitalize">
                          Rotation: {item.rotation}°
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRotateFurniture(item.id!)}
                          className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                          title="Rotate 90 degrees"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFurniture(item.id!)}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                          title="Delete furniture"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Furniture Catalog */}
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    + Add Furniture Component
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { type: 'sofa', name: 'Lounge Sofa', w: 2.1, l: 0.9 },
                      { type: 'armchair', name: 'Armchair', w: 0.85, l: 0.85 },
                      { type: 'bed', name: 'Queen Bed', w: 1.6, l: 2.0 },
                      { type: 'dining_table', name: 'Dining Set', w: 1.6, l: 1.0 },
                      { type: 'tv_unit', name: 'TV Console', w: 1.8, l: 0.4 },
                      { type: 'study_desk', name: 'Work Desk', w: 1.4, l: 0.7 },
                      { type: 'wardrobe', name: 'Wardrobe', w: 0.6, l: 1.8 },
                      { type: 'plant', name: 'Potted Plant', w: 0.5, l: 0.5 },
                      { type: 'rug', name: 'Area Rug', w: 2.2, l: 1.6 },
                    ].map((f) => (
                      <button
                        key={f.name}
                        onClick={() => handleAddFurniture(f.type as any, f.name, f.w, f.l)}
                        className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-left transition text-[11px] flex items-center justify-between"
                      >
                        <span>{f.name}</span>
                        <Plus className="w-3 h-3 text-amber-400" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Doors & Windows Openings */}
        {activeTab === 'openings' && (
          <div className="space-y-3">
            {!selectedRoom ? (
              <div className="text-center py-8 text-slate-500 bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                Select a room to configure its doors and daylight windows.
              </div>
            ) : (
              <div className="space-y-3">
                <span className="font-bold text-white">{selectedRoom.name} Openings</span>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                    Doors ({selectedRoom.doors.length})
                  </span>
                  {selectedRoom.doors.map((d, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px] text-slate-300">
                      <span>Wall: {d.wallSide.toUpperCase()}</span>
                      <span className="font-mono">{d.width}m wide</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                    Daylight Windows ({selectedRoom.windows.length})
                  </span>
                  {selectedRoom.windows.map((w, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px] text-slate-300">
                      <span>Wall: {w.wallSide.toUpperCase()}</span>
                      <span className="font-mono">{w.width}m × {w.height}m</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Materials & Architectural Style */}
        {activeTab === 'finishes' && (
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Architectural Material Finish & Facade
            </span>

            <div className="space-y-2">
              {(Object.keys(ARCHITECTURAL_THEMES) as ArchitecturalStyle[]).map((st) => {
                const theme = ARCHITECTURAL_THEMES[st];
                const isActive = (layout.facadeStyle || plot.architecturalStyle) === st;

                return (
                  <button
                    key={st}
                    onClick={() => handleChangeTheme(st)}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500 text-white font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{theme.name}</div>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{theme.description}</p>
                    </div>

                    <div
                      className="w-4 h-4 rounded-full border border-slate-600 shrink-0"
                      style={{ backgroundColor: theme.accentWallColor }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Save as New Alternative Modal */}
      {showSaveModal && (
        <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2 animate-in fade-in">
          <label className="text-[11px] text-slate-300 font-bold block">Save As Custom Alternative</label>
          <input
            type="text"
            placeholder="e.g. Design 6: Customized Spacious Duplex"
            value={newVariantName}
            onChange={(e) => setNewVariantName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowSaveModal(false)}
              className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (newVariantName.trim() && onSaveAsNewAlternative) {
                  onSaveAsNewAlternative(newVariantName.trim());
                  setShowSaveModal(false);
                }
              }}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
            >
              Save Alternative
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
