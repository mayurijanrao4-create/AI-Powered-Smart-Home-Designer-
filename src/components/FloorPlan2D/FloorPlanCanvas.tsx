/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  Compass,
  Download,
  Eye,
  Layers,
  Maximize2,
  Minus,
  Move,
  Plus,
  RotateCcw,
  Ruler,
  ZoomIn,
} from 'lucide-react';
import { ROOM_PALETTES, formatArea, formatDimension } from '../../constants/defaults';
import {
  DoorOpening,
  FloorPlanLayout,
  FurnitureSpec,
  GeneratedRoom,
  MeasurementUnit,
  PlotConfig,
  WindowOpening,
} from '../../types/house';

interface FloorPlanCanvasProps {
  plot: PlotConfig;
  layout: FloorPlanLayout;
  selectedFloor: number;
  onSelectFloor: (floor: number) => void;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  onUpdateRoomDimensions?: (roomId: string, width: number, length: number) => void;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  plot,
  layout,
  selectedFloor,
  onSelectFloor,
  selectedRoomId,
  onSelectRoom,
  onUpdateRoomDimensions,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas pan & zoom state
  const [scale, setScale] = useState<number>(36); // pixels per meter
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Layer toggles
  const [showDimensions, setShowDimensions] = useState(true);
  const [showFurniture, setShowFurniture] = useState(true);
  const [showDoorsWindows, setShowDoorsWindows] = useState(true);
  const [showSetbacks, setShowSetbacks] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Hovered room
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);

  // Filter rooms on current floor
  const activeRooms = layout.rooms.filter((r) => r.floorNumber === selectedFloor);

  // Auto-center canvas on layout changes
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const plotPixelW = plot.widthM * scale;
    const plotPixelL = plot.lengthM * scale;

    setPan({
      x: (rect.width - plotPixelW) / 2,
      y: (rect.height - plotPixelL) / 2,
    });
  }, [plot.widthM, plot.lengthM, scale]);

  // Main 2D Drawing Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = '#0f172a'; // slate-900 CAD drawing workspace
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);

    // 1. Draw Architectural Grid
    if (showGrid) {
      drawGrid(ctx, rect.width, rect.height, pan, scale);
    }

    // 2. Draw Plot Boundary & Surrounding Road
    drawPlotAndRoad(ctx, plot, scale);

    // 3. Draw Setback Guideline
    if (showSetbacks) {
      drawSetbackGuides(ctx, plot, scale);
    }

    // 4. Draw Rooms on Active Floor
    drawFloorRooms(
      ctx,
      activeRooms,
      plot,
      layout,
      scale,
      plot.unit,
      selectedRoomId,
      hoveredRoomId,
      showDimensions,
      showDoorsWindows,
      showFurniture
    );

    // 5. Draw Compass North Arrow
    drawCompass(ctx, plot.orientation, plot.widthM * scale + 35, 30);

    ctx.restore();
  }, [
    plot,
    layout,
    selectedFloor,
    activeRooms,
    scale,
    pan,
    showGrid,
    showSetbacks,
    showDimensions,
    showFurniture,
    showDoorsWindows,
    selectedRoomId,
    hoveredRoomId,
  ]);

  // Mouse interaction for Panning & Room Click Selection
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      // Check if clicked inside a room
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - pan.x;
      const mouseY = e.clientY - rect.top - pan.y;

      const clickedRoom = activeRooms.find((r) => {
        const roomPxX = (layout.originX + r.x) * scale;
        const roomPxY = (layout.originZ + r.z) * scale;
        const roomPxW = r.width * scale;
        const roomPxL = r.length * scale;

        return mouseX >= roomPxX && mouseX <= roomPxX + roomPxW && mouseY >= roomPxY && mouseY <= roomPxY + roomPxL;
      });

      if (clickedRoom) {
        onSelectRoom(clickedRoom.id);
      } else {
        // Start pan if clicked empty space
        setIsPanning(true);
        setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
      return;
    }

    // Room hover detection
    const mouseX = e.clientX - rect.left - pan.x;
    const mouseY = e.clientY - rect.top - pan.y;

    const hovered = activeRooms.find((r) => {
      const roomPxX = (layout.originX + r.x) * scale;
      const roomPxY = (layout.originZ + r.z) * scale;
      const roomPxW = r.width * scale;
      const roomPxL = r.length * scale;

      return mouseX >= roomPxX && mouseX <= roomPxX + roomPxW && mouseY >= roomPxY && mouseY <= roomPxY + roomPxL;
    });

    setHoveredRoomId(hovered ? hovered.id : null);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newScale = Math.min(120, Math.max(12, scale * zoomFactor));
    setScale(newScale);
  };

  const exportCanvasAsPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${plot.projectTitle.replace(/\s+/g, '_')}_2D_FloorPlan_Floor${selectedFloor}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  const selectedRoom = activeRooms.find((r) => r.id === selectedRoomId);

  return (
    <div className="relative flex flex-col h-full bg-slate-950 text-slate-200 select-none overflow-hidden">
      {/* Top Floor Plan Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 z-10">
        {/* Floor Selection Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2">Level:</span>
          {Array.from({ length: plot.floorCount }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => onSelectFloor(idx)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                selectedFloor === idx
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {idx === 0 ? 'Ground Floor' : idx === 1 ? '1st Floor (Duplex)' : `Floor ${idx + 1}`}
            </button>
          ))}
        </div>

        {/* View / Layer Visibility Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setShowDimensions(!showDimensions)}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                showDimensions ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle dimension callouts"
            >
              <Ruler className="w-3.5 h-3.5" /> Dimensions
            </button>

            <button
              onClick={() => setShowFurniture(!showFurniture)}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                showFurniture ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle 2D furniture layouts"
            >
              <Layers className="w-3.5 h-3.5" /> Furniture
            </button>

            <button
              onClick={() => setShowSetbacks(!showSetbacks)}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                showSetbacks ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle setback boundary lines"
            >
              <Eye className="w-3.5 h-3.5" /> Setbacks
            </button>
          </div>

          {/* Export PNG */}
          <button
            onClick={exportCanvasAsPNG}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
            title="Download high-res 2D drawing"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" /> Export PNG
          </button>
        </div>
      </div>

      {/* Main Drawing Area */}
      <div className="relative flex-1 w-full h-full cursor-crosshair overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full block"
        />

        {/* Floating Zoom & Canvas Controls */}
        <div className="absolute bottom-5 right-5 flex flex-col gap-1.5 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl z-20">
          <button
            onClick={() => setScale((s) => Math.min(120, s * 1.2))}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale((s) => Math.max(12, s * 0.8))}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setScale(36);
              if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                setPan({
                  x: (rect.width - plot.widthM * 36) / 2,
                  y: (rect.height - plot.lengthM * 36) / 2,
                });
              }
            }}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Reset Pan & Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Scale & CAD Legend Indicator */}
        <div className="absolute bottom-5 left-5 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 shadow-xl flex items-center gap-4 text-xs z-20">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Engineering Scale</div>
            <div className="font-mono text-slate-200">1m = {Math.round(scale)}px ({formatDimension(1, plot.unit)})</div>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Plot Dimensions</div>
            <div className="font-mono text-amber-400 font-semibold">
              {formatDimension(plot.widthM, plot.unit)} × {formatDimension(plot.lengthM, plot.unit)}
            </div>
          </div>
        </div>

        {/* Selected Room Inspector Panel (Top Right Overlay) */}
        {selectedRoom && (
          <div className="absolute top-4 right-4 w-72 bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border border-amber-500/40 shadow-2xl z-20 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: ROOM_PALETTES[selectedRoom.category]?.stroke || '#F59E0B' }}
                />
                <h4 className="font-bold text-sm text-white">{selectedRoom.name}</h4>
              </div>
              <button
                onClick={() => onSelectRoom(null)}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Carpet Area:</span>
                <span className="font-mono font-semibold text-amber-400">
                  {formatArea(selectedRoom.areaM2, plot.unit).primary} ({formatArea(selectedRoom.areaM2, plot.unit).secondary})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Width × Length:</span>
                <span className="font-mono text-slate-200">
                  {formatDimension(selectedRoom.width, plot.unit)} × {formatDimension(selectedRoom.length, plot.unit)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Doors & Swings:</span>
                <span className="text-slate-200">{selectedRoom.doors.length} openings</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Daylight Windows:</span>
                <span className="text-slate-200">{selectedRoom.windows.length} external units</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Furniture Fixtures:</span>
                <span className="text-slate-200">{selectedRoom.furniture.length} items</span>
              </div>

              {/* Dimension Adjustment Sliders */}
              {onUpdateRoomDimensions && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span>Width</span>
                      <span className="font-mono">{formatDimension(selectedRoom.width, plot.unit)}</span>
                    </div>
                    <input
                      type="range"
                      min={2.0}
                      max={8.0}
                      step={0.1}
                      value={selectedRoom.width}
                      onChange={(e) =>
                        onUpdateRoomDimensions(selectedRoom.id, parseFloat(e.target.value), selectedRoom.length)
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span>Length</span>
                      <span className="font-mono">{formatDimension(selectedRoom.length, plot.unit)}</span>
                    </div>
                    <input
                      type="range"
                      min={2.0}
                      max={8.0}
                      step={0.1}
                      value={selectedRoom.length}
                      onChange={(e) =>
                        onUpdateRoomDimensions(selectedRoom.id, selectedRoom.width, parseFloat(e.target.value))
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Canvas Sub-drawers for pristine CAD graphics
function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pan: { x: number; y: number },
  scale: number
) {
  ctx.save();
  ctx.strokeStyle = '#1e293b'; // slate-800
  ctx.lineWidth = 0.5;

  const gridSize = scale; // 1 meter grid
  const startX = (pan.x % gridSize) - gridSize;
  const startY = (pan.y % gridSize) - gridSize;

  ctx.beginPath();
  for (let x = startX; x < w; x += gridSize) {
    ctx.moveTo(x - pan.x, -pan.y);
    ctx.lineTo(x - pan.x, h - pan.y);
  }
  for (let y = startY; y < h; y += gridSize) {
    ctx.moveTo(-pan.x, y - pan.y);
    ctx.lineTo(w - pan.x, y - pan.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawPlotAndRoad(ctx: CanvasRenderingContext2D, plot: PlotConfig, scale: number) {
  const plotW = plot.widthM * scale;
  const plotL = plot.lengthM * scale;

  ctx.save();

  // Plot Land Area fill
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, plotW, plotL);

  // Exterior Boundary Wall
  ctx.strokeStyle = '#64748b'; // slate-500 compound wall
  ctx.lineWidth = 3.5;
  ctx.strokeRect(0, 0, plotW, plotL);

  // Draw Adjacent Road along roadLocation
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;

  const roadThickness = Math.max(30, plot.roadWidthM * scale * 0.5);

  if (plot.roadLocation === 'North') {
    ctx.fillRect(0, -roadThickness, plotW, roadThickness);
    drawRoadMarkings(ctx, 0, -roadThickness / 2, plotW, -roadThickness / 2, 'horizontal');
    drawTextCentered(ctx, `ROAD (${formatDimension(plot.roadWidthM, plot.unit)})`, plotW / 2, -roadThickness / 2, '#94a3b8');
  } else if (plot.roadLocation === 'South') {
    ctx.fillRect(0, plotL, plotW, roadThickness);
    drawRoadMarkings(ctx, 0, plotL + roadThickness / 2, plotW, plotL + roadThickness / 2, 'horizontal');
    drawTextCentered(ctx, `ROAD (${formatDimension(plot.roadWidthM, plot.unit)})`, plotW / 2, plotL + roadThickness / 2, '#94a3b8');
  } else if (plot.roadLocation === 'East') {
    ctx.fillRect(plotW, 0, roadThickness, plotL);
    drawRoadMarkings(ctx, plotW + roadThickness / 2, 0, plotW + roadThickness / 2, plotL, 'vertical');
    drawTextRotated(ctx, `ROAD (${formatDimension(plot.roadWidthM, plot.unit)})`, plotW + roadThickness / 2, plotL / 2, Math.PI / 2);
  } else if (plot.roadLocation === 'West') {
    ctx.fillRect(-roadThickness, 0, roadThickness, plotL);
    drawRoadMarkings(ctx, -roadThickness / 2, 0, -roadThickness / 2, plotL, 'vertical');
    drawTextRotated(ctx, `ROAD (${formatDimension(plot.roadWidthM, plot.unit)})`, -roadThickness / 2, plotL / 2, -Math.PI / 2);
  }

  // Plot Dimension Annotations
  drawDimensionLine(ctx, 0, -12, plotW, -12, formatDimension(plot.widthM, plot.unit), '#94a3b8');
  drawDimensionLine(ctx, -14, 0, -14, plotL, formatDimension(plot.lengthM, plot.unit), '#94a3b8', true);

  ctx.restore();
}

function drawSetbackGuides(ctx: CanvasRenderingContext2D, plot: PlotConfig, scale: number) {
  const leftPx = plot.setbacks.left * scale;
  const frontPx = plot.setbacks.front * scale;
  const rightPx = (plot.widthM - plot.setbacks.right) * scale;
  const rearPx = (plot.lengthM - plot.setbacks.rear) * scale;

  ctx.save();
  ctx.strokeStyle = '#f59e0b'; // amber dashed line
  ctx.lineWidth = 1.2;
  ctx.setLineDash([6, 4]);

  const bW = rightPx - leftPx;
  const bL = rearPx - frontPx;

  if (bW > 0 && bL > 0) {
    ctx.strokeRect(leftPx, frontPx, bW, bL);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.03)';
    ctx.fillRect(leftPx, frontPx, bW, bL);

    // Setback labels
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = '#d97706';
    ctx.fillText(`Front Setback: ${formatDimension(plot.setbacks.front, plot.unit)}`, leftPx + 6, frontPx - 6);
  }

  ctx.restore();
}

function drawFloorRooms(
  ctx: CanvasRenderingContext2D,
  rooms: GeneratedRoom[],
  plot: PlotConfig,
  layout: FloorPlanLayout,
  scale: number,
  unit: MeasurementUnit,
  selectedRoomId: string | null,
  hoveredRoomId: string | null,
  showDimensions: boolean,
  showDoorsWindows: boolean,
  showFurniture: boolean
) {
  ctx.save();

  // 1. Draw Room Background Fills
  rooms.forEach((room) => {
    const rx = (layout.originX + room.x) * scale;
    const rz = (layout.originZ + room.z) * scale;
    const rw = room.width * scale;
    const rl = room.length * scale;

    const isSelected = room.id === selectedRoomId;
    const isHovered = room.id === hoveredRoomId;

    // Architectural floor hatch or color
    ctx.fillStyle = isSelected
      ? 'rgba(245, 158, 11, 0.22)'
      : isHovered
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(30, 41, 59, 0.75)';

    ctx.fillRect(rx, rz, rw, rl);

    // Wall contour (Outer wall 230mm = ~8px, Interior wall 115mm = ~4px)
    ctx.strokeStyle = isSelected ? '#f59e0b' : '#94a3b8';
    ctx.lineWidth = isSelected ? 3.5 : 2.5;
    ctx.strokeRect(rx, rz, rw, rl);

    // 2. Draw 2D Furniture Symbology
    if (showFurniture && room.furniture) {
      room.furniture.forEach((item) => {
        drawFurnitureItem(ctx, item, rx, rz, rw, rl, scale);
      });
    }

    // 3. Draw Doors and Windows
    if (showDoorsWindows) {
      if (room.doors) {
        room.doors.forEach((door) => drawDoorSymbol(ctx, door, rx, rz, rw, rl, scale));
      }
      if (room.windows) {
        room.windows.forEach((win) => drawWindowSymbol(ctx, win, rx, rz, rw, rl, scale));
      }
    }

    // 4. Room Name & Area Labels
    ctx.save();
    ctx.fillStyle = isSelected ? '#ffffff' : '#f8fafc';
    ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = rx + rw / 2;
    const centerY = rz + rl / 2;

    ctx.fillText(room.name, centerX, centerY - 8);

    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = '#94a3b8';
    const dimText = `${formatDimension(room.width, unit)} × ${formatDimension(room.length, unit)}`;
    ctx.fillText(dimText, centerX, centerY + 6);

    const areaText = formatArea(room.areaM2, unit).primary;
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(areaText, centerX, centerY + 18);
    ctx.restore();

    // 5. Dimension Ticks
    if (showDimensions && isSelected) {
      drawDimensionLine(ctx, rx, rz + rl + 14, rx + rw, rz + rl + 14, formatDimension(room.width, unit), '#f59e0b');
      drawDimensionLine(ctx, rx + rw + 14, rz, rx + rw + 14, rz + rl, formatDimension(room.length, unit), '#f59e0b', true);
    }
  });

  ctx.restore();
}

function drawDoorSymbol(
  ctx: CanvasRenderingContext2D,
  door: DoorOpening,
  rx: number,
  rz: number,
  rw: number,
  rl: number,
  scale: number
) {
  const dPos = door.position * scale;
  const dWidth = door.width * scale;

  ctx.save();
  ctx.strokeStyle = '#38bdf8'; // Sky blue door swing
  ctx.fillStyle = '#0f172a';
  ctx.lineWidth = 1.5;

  if (door.wallSide === 'north') {
    const dx = rx + dPos;
    const dy = rz;
    // Clear wall segment
    ctx.fillRect(dx, dy - 2, dWidth, 4);

    // Door leaf
    ctx.beginPath();
    ctx.moveTo(dx, dy);
    ctx.lineTo(dx, dy + dWidth);
    ctx.stroke();

    // Swing arc (quarter circle)
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(dx, dy, dWidth, 0, Math.PI / 2, false);
    ctx.stroke();
  } else if (door.wallSide === 'south') {
    const dx = rx + dPos;
    const dy = rz + rl;
    ctx.fillRect(dx, dy - 2, dWidth, 4);

    ctx.beginPath();
    ctx.moveTo(dx, dy);
    ctx.lineTo(dx, dy - dWidth);
    ctx.stroke();

    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(dx, dy, dWidth, -Math.PI / 2, 0, false);
    ctx.stroke();
  }

  ctx.restore();
}

function drawWindowSymbol(
  ctx: CanvasRenderingContext2D,
  win: WindowOpening,
  rx: number,
  rz: number,
  rw: number,
  rl: number,
  scale: number
) {
  const wPos = win.position * scale;
  const wWidth = win.width * scale;

  ctx.save();
  ctx.fillStyle = '#94a3b8';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;

  if (win.wallSide === 'north') {
    const wx = rx + wPos - wWidth / 2;
    const wy = rz;
    // Double lines indicating window sill and glass pane
    ctx.strokeRect(wx, wy - 3, wWidth, 6);
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + wWidth, wy);
    ctx.stroke();
  } else if (win.wallSide === 'south') {
    const wx = rx + wPos - wWidth / 2;
    const wy = rz + rl;
    ctx.strokeRect(wx, wy - 3, wWidth, 6);
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + wWidth, wy);
    ctx.stroke();
  } else if (win.wallSide === 'west') {
    const wx = rx;
    const wy = rz + wPos - wWidth / 2;
    ctx.strokeRect(wx - 3, wy, 6, wWidth);
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx, wy + wWidth);
    ctx.stroke();
  } else if (win.wallSide === 'east') {
    const wx = rx + rw;
    const wy = rz + wPos - wWidth / 2;
    ctx.strokeRect(wx - 3, wy, 6, wWidth);
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx, wy + wWidth);
    ctx.stroke();
  }

  ctx.restore();
}

function drawFurnitureItem(
  ctx: CanvasRenderingContext2D,
  item: FurnitureSpec,
  rx: number,
  rz: number,
  rw: number,
  rl: number,
  scale: number
) {
  const fx = rx + rw / 2 + item.x * scale;
  const fz = rz + rl / 2 + item.z * scale;
  const fw = item.width * scale;
  const fl = item.length * scale;

  ctx.save();
  ctx.translate(fx, fz);
  ctx.rotate((item.rotation * Math.PI) / 180);

  ctx.strokeStyle = '#64748b';
  ctx.fillStyle = '#1e293b';
  ctx.lineWidth = 1.2;

  switch (item.type) {
    case 'bed':
      // Mattress & Pillows
      ctx.fillRect(-fw / 2, -fl / 2, fw, fl);
      ctx.strokeRect(-fw / 2, -fl / 2, fw, fl);
      // Pillows
      const pillowW = fw * 0.38;
      const pillowH = fl * 0.22;
      ctx.strokeRect(-fw / 2 + 3, -fl / 2 + 3, pillowW, pillowH);
      ctx.strokeRect(fw / 2 - pillowW - 3, -fl / 2 + 3, pillowW, pillowH);
      // Blanket line
      ctx.beginPath();
      ctx.moveTo(-fw / 2, -fl / 2 + fl * 0.35);
      ctx.lineTo(fw / 2, -fl / 2 + fl * 0.35);
      ctx.stroke();
      break;

    case 'sofa':
      // 3-Seater Sofa base + Armrests
      ctx.fillRect(-fw / 2, -fl / 2, fw, fl);
      ctx.strokeRect(-fw / 2, -fl / 2, fw, fl);
      // Backrest
      ctx.strokeRect(-fw / 2, -fl / 2, fw, fl * 0.3);
      // Armrests
      ctx.strokeRect(-fw / 2, -fl / 2, fw * 0.15, fl);
      ctx.strokeRect(fw / 2 - fw * 0.15, -fl / 2, fw * 0.15, fl);
      break;

    case 'dining_table':
      // Rectangular table + 6 chairs
      ctx.fillRect(-fw / 2, -fl / 2, fw, fl);
      ctx.strokeRect(-fw / 2, -fl / 2, fw, fl);
      // 3 chairs top, 3 chairs bottom
      const chairW = fw * 0.24;
      for (let i = 0; i < 3; i++) {
        const cx = -fw / 2 + i * (fw * 0.35) + 3;
        ctx.strokeRect(cx, -fl / 2 - 5, chairW, 4);
        ctx.strokeRect(cx, fl / 2 + 1, chairW, 4);
      }
      break;

    case 'kitchen_counter':
      // Countertop + Gas Hob burners + Sink basin
      ctx.fillRect(-fw / 2, -fl / 2, fw, fl);
      ctx.strokeRect(-fw / 2, -fl / 2, fw, fl);
      // Hob burners
      ctx.beginPath();
      ctx.arc(-fw * 0.2, 0, 4, 0, Math.PI * 2);
      ctx.arc(-fw * 0.2 + 12, 0, 4, 0, Math.PI * 2);
      ctx.stroke();
      // Sink
      ctx.strokeRect(fw * 0.15, -fl * 0.3, fw * 0.25, fl * 0.6);
      break;

    case 'wc':
      // WC oval basin & tank
      ctx.strokeRect(-fw / 2, -fl / 2, fw, fl * 0.35);
      ctx.beginPath();
      ctx.ellipse(0, fl * 0.15, fw * 0.45, fl * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 'washbasin':
      ctx.strokeRect(-fw / 2, -fl / 2, fw, fl);
      ctx.beginPath();
      ctx.ellipse(0, 0, fw * 0.38, fl * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 'car':
      // Vehicle silhouette in parking bay
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(-fw / 2, -fl / 2, fw, fl);
      // Windshield
      ctx.strokeRect(-fw * 0.4, -fl * 0.25, fw * 0.8, fl * 0.2);
      // Rear windshield
      ctx.strokeRect(-fw * 0.4, fl * 0.18, fw * 0.8, fl * 0.15);
      break;

    case 'pooja_mandir':
      ctx.strokeRect(-fw / 2, -fl / 2, fw, fl);
      // Sacred diya / bell symbol
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.stroke();
      break;

    default:
      ctx.strokeRect(-fw / 2, -fl / 2, fw, fl);
      break;
  }

  ctx.restore();
}

function drawDimensionLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  text: string,
  color: string,
  isVertical = false
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.0;
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Dimension main line
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Architectural 45-degree tick marks
  const tick = 4;
  ctx.beginPath();
  ctx.moveTo(x1 - tick, y1 - tick);
  ctx.lineTo(x1 + tick, y1 + tick);
  ctx.moveTo(x2 - tick, y2 - tick);
  ctx.lineTo(x2 + tick, y2 + tick);
  ctx.stroke();

  // Text label
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  if (isVertical) {
    drawTextRotated(ctx, text, midX - 8, midY, -Math.PI / 2);
  } else {
    ctx.fillText(text, midX, midY - 6);
  }

  ctx.restore();
}

function drawCompass(ctx: CanvasRenderingContext2D, orientation: string, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);

  // Compass Rose Circle
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.stroke();

  // North Arrow
  ctx.fillStyle = '#ef4444'; // Red North
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(5, 0);
  ctx.lineTo(0, -3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(0, 16);
  ctx.lineTo(-5, 0);
  ctx.lineTo(0, 3);
  ctx.closePath();
  ctx.fill();

  // Label 'N'
  ctx.font = 'bold 9px JetBrains Mono, monospace';
  ctx.fillStyle = '#ef4444';
  ctx.textAlign = 'center';
  ctx.fillText('N', 0, -22);

  ctx.restore();
}

function drawRoadMarkings(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dir: 'horizontal' | 'vertical'
) {
  ctx.save();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string
) {
  ctx.save();
  ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawTextRotated(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  rad: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rad);
  ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
