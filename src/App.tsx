/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { SAMPLE_PROJECTS } from './constants/defaults';
import {
  FloorPlanLayout,
  PlotConfig,
  RoomRequirement,
} from './types/house';
import { generateFloorPlan } from './utils/floorPlanGenerator';
import { Navbar, ActiveTab } from './components/Navbar';
import { PlotForm } from './components/ProjectSetup/PlotForm';
import { RoomConfigurator } from './components/ProjectSetup/RoomConfigurator';
import { FloorPlanCanvas } from './components/FloorPlan2D/FloorPlanCanvas';
import { House3DViewer, Viewer3DSettings } from './components/Viewer3D/House3DViewer';
import { Viewer3DControls } from './components/Viewer3D/Viewer3DControls';
import { CostAndBOQPanel } from './components/Estimation/CostAndBOQPanel';
import { ExportModal } from './components/ExportModal';

export default function App() {
  // Load default initial project: 30x40 East Facing Duplex
  const initialProject = SAMPLE_PROJECTS[0];

  const [plot, setPlot] = useState<PlotConfig>(initialProject.plot);
  const [requirements, setRequirements] = useState<RoomRequirement[]>(initialProject.rooms);

  // Navigation & View state
  const [activeTab, setActiveTab] = useState<ActiveTab>('3d_viewer');
  const [isSplitView, setIsSplitView] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<number>(0);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Setup tab subview (plot vs rooms)
  const [setupSubTab, setSetupSubTab] = useState<'plot' | 'rooms'>('plot');

  // 3D Viewer & Clipping Plane state
  const [viewerSettings, setViewerSettings] = useState<Viewer3DSettings>({
    viewMode: 'orbit',
    cameraPreset: 'iso',
    sectionCutMode: 'none',
    sectionCutHeight: 1.4, // 1.4m is standard dollhouse eye level
    sectionCutX: 4.5,
    sectionCutZ: 6.0,
    showRoof: true,
    showFurniture: true,
    activeFloorFilter: 'all',
    lightingMode: 'day',
    showCeiling: true,
    wallOpacity: 1.0,
  });

  // Export Modal state
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Compute 2D Floor Plan layout from Plot & Requirements
  const layout: FloorPlanLayout = useMemo(() => {
    return generateFloorPlan(plot, requirements);
  }, [plot, requirements]);

  // Load a sample project
  const handleLoadSampleProject = (projectId: string) => {
    const found = SAMPLE_PROJECTS.find((p) => p.id === projectId);
    if (found) {
      setPlot({ ...found.plot });
      setRequirements([...found.rooms]);
      setSelectedRoomId(null);
      setSelectedFloor(0);
      setViewerSettings((prev) => ({
        ...prev,
        sectionCutMode: 'none',
        activeFloorFilter: 'all',
        showRoof: true,
      }));
    }
  };

  // Update room dimensions from 2D canvas inspector
  const handleUpdateRoomDimensions = (roomId: string, newW: number, newL: number) => {
    const room = layout.rooms.find((r) => r.id === roomId);
    if (!room) return;

    setRequirements((prev) =>
      prev.map((req) =>
        req.id === room.requirementId
          ? { ...req, preferredWidthM: Math.round(newW * 10) / 10, preferredLengthM: Math.round(newL * 10) / 10 }
          : req
      )
    );
  };

  const handleUpdateViewerSettings = (newSettings: Partial<Viewer3DSettings>) => {
    setViewerSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const maxBuildingHeight = plot.floorCount * plot.floorHeightM + 1.2;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          setIsSplitView(false);
        }}
        plot={plot}
        onLoadSampleProject={handleLoadSampleProject}
        onOpenExport={() => setIsExportOpen(true)}
        isSplitView={isSplitView}
        onToggleSplitView={() => setIsSplitView(!isSplitView)}
      />

      {/* Main View Area */}
      <main className="relative flex-1 w-full h-[calc(100vh-62px)] overflow-hidden">
        {/* VIEW 1: Split View (2D CAD & 3D BIM Side-by-Side) */}
        {isSplitView ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 w-full h-full divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
            {/* Left: 2D Floor Plan Canvas */}
            <div className="relative w-full h-full">
              <FloorPlanCanvas
                plot={plot}
                layout={layout}
                selectedFloor={selectedFloor}
                onSelectFloor={setSelectedFloor}
                selectedRoomId={selectedRoomId}
                onSelectRoom={setSelectedRoomId}
                onUpdateRoomDimensions={handleUpdateRoomDimensions}
              />
            </div>

            {/* Right: 3D House Viewer */}
            <div className="relative w-full h-full">
              <House3DViewer
                plot={plot}
                layout={layout}
                settings={viewerSettings}
                onUpdateSettings={handleUpdateViewerSettings}
                selectedRoomId={selectedRoomId}
                onSelectRoom={setSelectedRoomId}
              />
              <Viewer3DControls
                settings={viewerSettings}
                onUpdateSettings={handleUpdateViewerSettings}
                floorCount={plot.floorCount}
                maxBuildingHeight={maxBuildingHeight}
              />
            </div>
          </div>
        ) : (
          <>
            {/* VIEW 2: Fullscreen 3D BIM Viewer */}
            {activeTab === '3d_viewer' && (
              <div className="relative w-full h-full">
                <House3DViewer
                  plot={plot}
                  layout={layout}
                  settings={viewerSettings}
                  onUpdateSettings={handleUpdateViewerSettings}
                  selectedRoomId={selectedRoomId}
                  onSelectRoom={setSelectedRoomId}
                />
                <Viewer3DControls
                  settings={viewerSettings}
                  onUpdateSettings={handleUpdateViewerSettings}
                  floorCount={plot.floorCount}
                  maxBuildingHeight={maxBuildingHeight}
                />
              </div>
            )}

            {/* VIEW 3: Fullscreen 2D Floor Plan CAD */}
            {activeTab === '2d_cad' && (
              <div className="relative w-full h-full">
                <FloorPlanCanvas
                  plot={plot}
                  layout={layout}
                  selectedFloor={selectedFloor}
                  onSelectFloor={setSelectedFloor}
                  selectedRoomId={selectedRoomId}
                  onSelectRoom={setSelectedRoomId}
                  onUpdateRoomDimensions={handleUpdateRoomDimensions}
                />
              </div>
            )}

            {/* VIEW 4: Plot & Room Requirements Setup */}
            {activeTab === 'plot_and_rooms' && (
              <div className="w-full h-full overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Sub-tabs: Plot Configuration vs Room Planning */}
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <button
                      onClick={() => setSetupSubTab('plot')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                        setupSubTab === 'plot'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      1. Site & Plot Parameters
                    </button>
                    <button
                      onClick={() => setSetupSubTab('rooms')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                        setupSubTab === 'rooms'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      2. Room Requirements ({requirements.length} spaces)
                    </button>
                  </div>

                  {setupSubTab === 'plot' ? (
                    <PlotForm plot={plot} onChangePlot={setPlot} />
                  ) : (
                    <RoomConfigurator
                      plot={plot}
                      requirements={requirements}
                      onChangeRequirements={setRequirements}
                      layout={layout}
                      onRegenerateLayout={() => {
                        // Force state re-evaluation
                        setPlot({ ...plot });
                      }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* VIEW 5: Cost & BOQ Estimation */}
            {activeTab === 'cost_boq' && (
              <div className="w-full h-full overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                  <CostAndBOQPanel plot={plot} layout={layout} />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        plot={plot}
        layout={layout}
        requirements={requirements}
      />
    </div>
  );
}
