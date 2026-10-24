/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { DEFAULT_COST_PARAMETERS, SAMPLE_PROJECTS } from './constants/defaults';
import {
  FloorPlanLayout,
  HouseDesignAlternative,
  PlotConfig,
  RoomRequirement,
} from './types/house';
import { generateFloorPlan, generateMultipleHouseDesigns } from './utils/floorPlanGenerator';
import { Navbar, ActiveTab } from './components/Navbar';
import { PlotForm } from './components/ProjectSetup/PlotForm';
import { RoomConfigurator } from './components/ProjectSetup/RoomConfigurator';
import { FloorPlanCanvas } from './components/FloorPlan2D/FloorPlanCanvas';
import { House3DViewer, Viewer3DSettings } from './components/Viewer3D/House3DViewer';
import { Viewer3DControls } from './components/Viewer3D/Viewer3DControls';
import { CostAndBOQPanel } from './components/Estimation/CostAndBOQPanel';
import { ExportModal } from './components/ExportModal';
import { DesignGalleryModal } from './components/DesignGallery/DesignGalleryModal';
import { ArchitecturalEditor } from './components/Editor/ArchitecturalEditor';

export default function App() {
  const initialProject = SAMPLE_PROJECTS[0];

  const [plot, setPlot] = useState<PlotConfig>(initialProject.plot);
  const [requirements, setRequirements] = useState<RoomRequirement[]>(initialProject.rooms);

  // Generate initial 4-5 design alternatives
  const initialAlternatives = useMemo(() => {
    return generateMultipleHouseDesigns(initialProject.plot, initialProject.rooms, DEFAULT_COST_PARAMETERS);
  }, []);

  const [designAlternatives, setDesignAlternatives] = useState<HouseDesignAlternative[]>(initialAlternatives);
  const [selectedDesignId, setSelectedDesignId] = useState<string>(initialAlternatives[0].id);

  // Map of customized layouts per design ID to preserve edits
  const [customizedLayouts, setCustomizedLayouts] = useState<Record<string, FloorPlanLayout>>({});

  // Active Layout
  const activeDesign = designAlternatives.find((d) => d.id === selectedDesignId) || designAlternatives[0];
  const currentLayout: FloorPlanLayout = customizedLayouts[selectedDesignId] || activeDesign.layout;

  // Navigation & View state
  const [activeTab, setActiveTab] = useState<ActiveTab>('3d_viewer');
  const [isSplitView, setIsSplitView] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<number>(0);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);

  // Setup tab subview (plot vs rooms)
  const [setupSubTab, setSetupSubTab] = useState<'plot' | 'rooms'>('plot');

  // Modals & Panels state
  const [isDesignGalleryOpen, setIsDesignGalleryOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // 3D Viewer & Section Cutaway state
  const [viewerSettings, setViewerSettings] = useState<Viewer3DSettings>({
    viewMode: 'orbit',
    cameraPreset: 'iso',
    sectionCutMode: 'none',
    sectionCutHeight: 1.4,
    sectionCutX: 4.5,
    sectionCutZ: 6.0,
    explodedOffset: 0,
    showRoof: true,
    showFurniture: true,
    activeFloorFilter: 'all',
    lightingMode: 'day',
    showCeiling: true,
    wallOpacity: 1.0,
  });

  // Generate 4-5 House Designs when requested
  const handleGenerateHouseDesigns = () => {
    const generated = generateMultipleHouseDesigns(plot, requirements, DEFAULT_COST_PARAMETERS);
    setDesignAlternatives(generated);
    if (generated.length > 0) {
      setSelectedDesignId(generated[0].id);
      setCustomizedLayouts({}); // reset custom overlays on fresh generation
    }
    setIsDesignGalleryOpen(true);
  };

  // Load sample project
  const handleLoadSampleProject = (projectId: string) => {
    const found = SAMPLE_PROJECTS.find((p) => p.id === projectId);
    if (found) {
      setPlot({ ...found.plot });
      setRequirements([...found.rooms]);
      setSelectedRoomId(null);
      setSelectedFloor(0);

      const generated = generateMultipleHouseDesigns(found.plot, found.rooms, DEFAULT_COST_PARAMETERS);
      setDesignAlternatives(generated);
      setSelectedDesignId(generated[0].id);
      setCustomizedLayouts({});

      setViewerSettings((prev) => ({
        ...prev,
        sectionCutMode: 'none',
        explodedOffset: 0,
        activeFloorFilter: 'all',
        showRoof: true,
        viewMode: 'orbit',
      }));
    }
  };

  // Update layout from architectural editor
  const handleUpdateLayout = (updated: FloorPlanLayout) => {
    setCustomizedLayouts((prev) => ({
      ...prev,
      [selectedDesignId]: updated,
    }));
  };

  // Update room dimensions from 2D canvas inspector
  const handleUpdateRoomDimensions = (roomId: string, newW: number, newL: number) => {
    const updatedRooms = currentLayout.rooms.map((r) => {
      if (r.id === roomId) {
        return {
          ...r,
          width: Math.max(1.8, Math.round(newW * 10) / 10),
          length: Math.max(1.8, Math.round(newL * 10) / 10),
          areaM2: Number((newW * newL).toFixed(2)),
        };
      }
      return r;
    });

    handleUpdateLayout({
      ...currentLayout,
      rooms: updatedRooms,
    });
  };

  // Save customized design as new alternative
  const handleSaveAsNewAlternative = (name: string) => {
    const newId = `alt_custom_${Date.now()}`;
    const newAlternative: HouseDesignAlternative = {
      ...activeDesign,
      id: newId,
      name,
      tagline: 'Customized User Architectural BIM Variant',
      description: `BIM model customized by user with tailored room configurations, openings, and furniture placements.`,
      layout: { ...currentLayout },
    };

    setDesignAlternatives((prev) => [...prev, newAlternative]);
    setSelectedDesignId(newId);
    setCustomizedLayouts((prev) => ({
      ...prev,
      [newId]: { ...currentLayout },
    }));
  };

  const handleUpdateViewerSettings = (newSettings: Partial<Viewer3DSettings>) => {
    setViewerSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const maxBuildingHeight = plot.floorCount * plot.floorHeightM + 1.2;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Header Navbar */}
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
        onOpenDesignGallery={() => setIsDesignGalleryOpen(true)}
        activeDesignName={activeDesign.name}
        isEditorOpen={isEditorOpen}
        onToggleEditor={() => setIsEditorOpen(!isEditorOpen)}
      />

      {/* Main Workspace */}
      <main className="relative flex-1 w-full h-[calc(100vh-62px)] flex overflow-hidden">
        {/* Workspace Central Area */}
        <div className="flex-1 relative h-full overflow-hidden">
          {/* VIEW 1: Split View (2D & 3D Side-by-Side) */}
          {isSplitView ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 w-full h-full divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
              <div className="relative w-full h-full">
                <FloorPlanCanvas
                  plot={plot}
                  layout={currentLayout}
                  selectedFloor={selectedFloor}
                  onSelectFloor={setSelectedFloor}
                  selectedRoomId={selectedRoomId}
                  onSelectRoom={setSelectedRoomId}
                  onUpdateRoomDimensions={handleUpdateRoomDimensions}
                />
              </div>

              <div className="relative w-full h-full">
                <House3DViewer
                  plot={plot}
                  layout={currentLayout}
                  settings={viewerSettings}
                  onUpdateSettings={handleUpdateViewerSettings}
                  selectedRoomId={selectedRoomId}
                  onSelectRoom={setSelectedRoomId}
                  selectedFurnitureId={selectedFurnitureId}
                  onSelectFurniture={setSelectedFurnitureId}
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
              {/* VIEW 2: 3D BIM Viewer (Orbit & First-Person Walkthrough) */}
              {activeTab === '3d_viewer' && (
                <div className="relative w-full h-full">
                  <House3DViewer
                    plot={plot}
                    layout={currentLayout}
                    settings={viewerSettings}
                    onUpdateSettings={handleUpdateViewerSettings}
                    selectedRoomId={selectedRoomId}
                    onSelectRoom={setSelectedRoomId}
                    selectedFurnitureId={selectedFurnitureId}
                    onSelectFurniture={setSelectedFurnitureId}
                  />
                  <Viewer3DControls
                    settings={viewerSettings}
                    onUpdateSettings={handleUpdateViewerSettings}
                    floorCount={plot.floorCount}
                    maxBuildingHeight={maxBuildingHeight}
                  />
                </div>
              )}

              {/* VIEW 3: 2D Floor Plan CAD Canvas */}
              {activeTab === '2d_cad' && (
                <div className="relative w-full h-full">
                  <FloorPlanCanvas
                    plot={plot}
                    layout={currentLayout}
                    selectedFloor={selectedFloor}
                    onSelectFloor={setSelectedFloor}
                    selectedRoomId={selectedRoomId}
                    onSelectRoom={setSelectedRoomId}
                    onUpdateRoomDimensions={handleUpdateRoomDimensions}
                  />
                </div>
              )}

              {/* VIEW 4: Site & Room Requirements Setup */}
              {activeTab === 'plot_and_rooms' && (
                <div className="w-full h-full overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
                  <div className="max-w-4xl mx-auto space-y-6">
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
                      <PlotForm
                        plot={plot}
                        onChangePlot={setPlot}
                        onApplyArchetype={(newPlot, newRooms) => {
                          setPlot({ ...newPlot });
                          setRequirements([...newRooms]);
                          setSelectedRoomId(null);
                          setSelectedFloor(0);

                          const generated = generateMultipleHouseDesigns(newPlot, newRooms, DEFAULT_COST_PARAMETERS);
                          setDesignAlternatives(generated);
                          if (generated.length > 0) {
                            setSelectedDesignId(generated[0].id);
                            setCustomizedLayouts({});
                          }

                          setViewerSettings((prev) => ({
                            ...prev,
                            sectionCutMode: 'none',
                            explodedOffset: 0,
                            activeFloorFilter: 'all',
                            showRoof: true,
                            viewMode: 'orbit',
                          }));
                        }}
                      />
                    ) : (
                      <RoomConfigurator
                        plot={plot}
                        requirements={requirements}
                        onChangeRequirements={setRequirements}
                        layout={currentLayout}
                        onRegenerateLayout={() => handleGenerateHouseDesigns()}
                        onGenerateHouseDesigns={handleGenerateHouseDesigns}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* VIEW 5: Cost & BOQ Estimation */}
              {activeTab === 'cost_boq' && (
                <div className="w-full h-full overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
                  <div className="max-w-4xl mx-auto">
                    <CostAndBOQPanel plot={plot} layout={currentLayout} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* BIM Architectural Editor Sidebar (Toggled via Navbar) */}
        {isEditorOpen && (
          <aside className="w-80 sm:w-96 h-full shrink-0 shadow-2xl z-30 transition-all animate-in slide-in-from-right">
            <ArchitecturalEditor
              plot={plot}
              layout={currentLayout}
              onUpdateLayout={handleUpdateLayout}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
              selectedFurnitureId={selectedFurnitureId}
              onSelectFurniture={setSelectedFurnitureId}
              onSaveAsNewAlternative={handleSaveAsNewAlternative}
            />
          </aside>
        )}
      </main>

      {/* 4–5 House Design Alternatives Selection Gallery Modal */}
      <DesignGalleryModal
        isOpen={isDesignGalleryOpen}
        onClose={() => setIsDesignGalleryOpen(false)}
        designs={designAlternatives}
        selectedDesignId={selectedDesignId}
        onSelectDesign={(id) => setSelectedDesignId(id)}
        onView3D={(id) => {
          setSelectedDesignId(id);
          setActiveTab('3d_viewer');
          setViewerSettings((prev) => ({ ...prev, viewMode: 'orbit' }));
        }}
        onExploreInterior={(id) => {
          setSelectedDesignId(id);
          setActiveTab('3d_viewer');
          setViewerSettings((prev) => ({ ...prev, viewMode: 'first_person' }));
        }}
        onViewFloorPlan={(id) => {
          setSelectedDesignId(id);
          setActiveTab('2d_cad');
        }}
        onRegenerateAlternatives={handleGenerateHouseDesigns}
        plot={plot}
      />

      {/* Export Deliverables Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        plot={plot}
        layout={currentLayout}
        requirements={requirements}
      />
    </div>
  );
}
