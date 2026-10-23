/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  EyeOff,
  Layers,
  Moon,
  Scissors,
  Sliders,
  Sun,
  Sunset,
} from 'lucide-react';
import { Viewer3DSettings } from './House3DViewer';

interface Viewer3DControlsProps {
  settings: Viewer3DSettings;
  onUpdateSettings: (newSettings: Partial<Viewer3DSettings>) => void;
  floorCount: number;
  maxBuildingHeight: number;
}

export const Viewer3DControls: React.FC<Viewer3DControlsProps> = ({
  settings,
  onUpdateSettings,
  floorCount,
  maxBuildingHeight,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'cutaway' | 'layers' | 'lighting'>('cutaway');

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-full max-w-[920px] px-4 z-30 transition-all duration-300 pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-center">
        {/* Cinema / Zen Collapse Toggle Pill */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="mb-2 px-3.5 py-1 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full text-xs font-medium border border-slate-700/80 shadow-xl backdrop-blur-md flex items-center gap-1.5 transition"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> Show 3D Dock
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-amber-400" /> Hide Controls (Zen View)
            </>
          )}
        </button>

        {/* Unified Bottom Dock */}
        {!isCollapsed && (
          <div className="w-full bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-2xl overflow-hidden p-3 transition-all animate-in fade-in slide-in-from-bottom-2">
            {/* Dock Navigation Tabs */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
                <button
                  onClick={() => setActiveTab('cutaway')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition ${
                    activeTab === 'cutaway'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" /> Section Cutaway
                </button>
                <button
                  onClick={() => setActiveTab('camera')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition ${
                    activeTab === 'camera'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" /> Camera Views
                </button>
                <button
                  onClick={() => setActiveTab('layers')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition ${
                    activeTab === 'layers'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> Levels & Visibility
                </button>
                <button
                  onClick={() => setActiveTab('lighting')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition ${
                    activeTab === 'lighting'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" /> Lighting & Mood
                </button>
              </div>

              {/* Quick Status / Reset */}
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
                <span>Section: <span className="font-mono text-amber-400 uppercase">{settings.sectionCutMode}</span></span>
                {settings.sectionCutMode !== 'none' && (
                  <button
                    onClick={() => onUpdateSettings({ sectionCutMode: 'none' })}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Reset Cut
                  </button>
                )}
              </div>
            </div>

            {/* Tab 1: Section Cutaway Controls */}
            {activeTab === 'cutaway' && (
              <div className="flex flex-wrap items-center justify-between gap-4 py-1 text-xs">
                {/* Cut mode selector */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <span className="text-slate-400 font-semibold px-2">Cut Plane:</span>
                  {(['none', 'horizontal', 'vertical_x', 'vertical_z'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => onUpdateSettings({ sectionCutMode: mode })}
                      className={`px-2.5 py-1 rounded-md capitalize font-medium transition ${
                        settings.sectionCutMode === mode
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode === 'none' ? 'No Slice' : mode === 'horizontal' ? 'Horizontal (Floor)' : mode === 'vertical_x' ? 'Longitudinal X' : 'Cross Z'}
                    </button>
                  ))}
                </div>

                {/* Adjustable Height / Offset Slider */}
                {settings.sectionCutMode === 'horizontal' && (
                  <div className="flex-1 flex items-center gap-3 min-w-[240px]">
                    <span className="text-slate-300 font-medium whitespace-nowrap">Cut Height:</span>
                    <input
                      type="range"
                      min={0.5}
                      max={maxBuildingHeight + 1.0}
                      step={0.1}
                      value={settings.sectionCutHeight}
                      onChange={(e) => onUpdateSettings({ sectionCutHeight: parseFloat(e.target.value) })}
                      className="flex-1 accent-amber-500 cursor-pointer"
                    />
                    <span className="font-mono text-amber-400 w-14 text-right">
                      {settings.sectionCutHeight.toFixed(1)} m
                    </span>
                  </div>
                )}

                {/* Quick Dollhouse Preset */}
                <button
                  onClick={() =>
                    onUpdateSettings({
                      sectionCutMode: 'horizontal',
                      sectionCutHeight: 1.4,
                      showRoof: false,
                    })
                  }
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg font-medium border border-slate-700 transition"
                  title="Cut at 1.4m height to view furniture from above"
                >
                  🏠 Dollhouse Cut (1.4m)
                </button>
              </div>
            )}

            {/* Tab 2: Camera Views */}
            {activeTab === 'camera' && (
              <div className="flex flex-wrap items-center gap-2 py-1 text-xs">
                <span className="text-slate-400 font-semibold mr-1">Viewpoint:</span>
                {[
                  { id: 'iso', label: 'Isometric 3D' },
                  { id: 'top', label: 'Top (Plan View)' },
                  { id: 'front', label: 'Front Elevation' },
                  { id: 'rear', label: 'Rear Elevation' },
                  { id: 'left', label: 'Left Side' },
                  { id: 'right', label: 'Right Side' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => onUpdateSettings({ cameraPreset: preset.id as any })}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      settings.cameraPreset === preset.id
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}

            {/* Tab 3: Levels & Visibility */}
            {activeTab === 'layers' && (
              <div className="flex flex-wrap items-center justify-between gap-4 py-1 text-xs">
                {/* Floor filter */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <span className="text-slate-400 font-semibold px-2">Isolate Floor:</span>
                  <button
                    onClick={() => onUpdateSettings({ activeFloorFilter: 'all' })}
                    className={`px-2.5 py-1 rounded-md font-medium transition ${
                      settings.activeFloorFilter === 'all'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Floors
                  </button>
                  {Array.from({ length: floorCount }).map((_, f) => (
                    <button
                      key={f}
                      onClick={() => onUpdateSettings({ activeFloorFilter: f })}
                      className={`px-2.5 py-1 rounded-md font-medium transition ${
                        settings.activeFloorFilter === f
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f === 0 ? 'Ground Only' : f === 1 ? '1st Floor' : `Floor ${f + 1}`}
                    </button>
                  ))}
                </div>

                {/* Toggles: Roof, Furniture */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateSettings({ showRoof: !settings.showRoof })}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium border transition ${
                      settings.showRoof
                        ? 'bg-slate-800 text-slate-200 border-slate-700'
                        : 'bg-rose-950/40 text-rose-300 border-rose-800'
                    }`}
                  >
                    {settings.showRoof ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                    Roof / Terrace
                  </button>

                  <button
                    onClick={() => onUpdateSettings({ showFurniture: !settings.showFurniture })}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium border transition ${
                      settings.showFurniture
                        ? 'bg-slate-800 text-slate-200 border-slate-700'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {settings.showFurniture ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                    Furniture Fixtures
                  </button>

                  {/* Wall Opacity slider */}
                  <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Walls:</span>
                    <input
                      type="range"
                      min={0.2}
                      max={1.0}
                      step={0.1}
                      value={settings.wallOpacity}
                      onChange={(e) => onUpdateSettings({ wallOpacity: parseFloat(e.target.value) })}
                      className="w-16 accent-amber-500 cursor-pointer"
                    />
                    <span className="font-mono text-slate-300">{Math.round(settings.wallOpacity * 100)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Lighting & Mood */}
            {activeTab === 'lighting' && (
              <div className="flex items-center gap-3 py-1 text-xs">
                <span className="text-slate-400 font-semibold">Lighting Environment:</span>
                {[
                  { id: 'day', label: 'Daylight Sun', icon: Sun, color: 'text-amber-400' },
                  { id: 'golden_hour', label: 'Golden Hour (Sunset)', icon: Sunset, color: 'text-orange-400' },
                  { id: 'night', label: 'Architectural Night', icon: Moon, color: 'text-indigo-400' },
                ].map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => onUpdateSettings({ lightingMode: mode.id as any })}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium transition ${
                        settings.lightingMode === mode.id
                          ? 'bg-amber-500 text-slate-950 font-bold shadow'
                          : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${settings.lightingMode === mode.id ? 'text-slate-950' : mode.color}`} />
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
