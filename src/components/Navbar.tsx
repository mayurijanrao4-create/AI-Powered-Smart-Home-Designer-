/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Box,
  Building2,
  Calculator,
  Columns,
  Compass,
  Download,
  FolderOpen,
  Home,
  Layers,
  Layout,
  Ruler,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { SAMPLE_PROJECTS } from '../constants/defaults';
import { PlotConfig } from '../types/house';

export type ActiveTab = '3d_viewer' | '2d_cad' | 'plot_and_rooms' | 'cost_boq' | 'split_view';

interface NavbarProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  plot: PlotConfig;
  onLoadSampleProject: (projectId: string) => void;
  onOpenExport: () => void;
  isSplitView: boolean;
  onToggleSplitView: () => void;
  onOpenDesignGallery: () => void;
  activeDesignName: string;
  isEditorOpen: boolean;
  onToggleEditor: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onChangeTab,
  plot,
  onLoadSampleProject,
  onOpenExport,
  isSplitView,
  onToggleSplitView,
  onOpenDesignGallery,
  activeDesignName,
  isEditorOpen,
  onToggleEditor,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-30 select-none">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-black">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
              Smart Home Designer
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              BIM 3D Workstation
            </span>
          </div>
          <div className="text-[11px] text-slate-400 truncate max-w-[220px] sm:max-w-none">
            {plot.projectTitle} • <span className="text-amber-400 font-semibold">{activeDesignName}</span>
          </div>
        </div>
      </div>

      {/* Primary Mode Navigation */}
      <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
        {/* Design Gallery Button */}
        <button
          onClick={onOpenDesignGallery}
          className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md hover:from-amber-400 hover:to-amber-500 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>House Options</span>
        </button>

        <button
          onClick={() => onChangeTab('3d_viewer')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition ${
            activeTab === '3d_viewer' && !isSplitView
              ? 'bg-slate-800 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Box className="w-3.5 h-3.5 text-amber-400" />
          <span>3D BIM Model</span>
        </button>

        <button
          onClick={() => onChangeTab('2d_cad')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition ${
            activeTab === '2d_cad' && !isSplitView
              ? 'bg-slate-800 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layout className="w-3.5 h-3.5 text-indigo-400" />
          <span>2D Floor Plan</span>
        </button>

        <button
          onClick={onToggleSplitView}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
            isSplitView
              ? 'bg-indigo-600 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Side-by-side 2D & 3D synchronized view"
        >
          <Columns className="w-3.5 h-3.5" />
          <span>2D & 3D Split</span>
        </button>

        <button
          onClick={() => onChangeTab('plot_and_rooms')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition ${
            activeTab === 'plot_and_rooms'
              ? 'bg-slate-800 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Ruler className="w-3.5 h-3.5 text-emerald-400" />
          <span>Site & Spaces</span>
        </button>

        <button
          onClick={() => onChangeTab('cost_boq')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition ${
            activeTab === 'cost_boq'
              ? 'bg-slate-800 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-amber-400" />
          <span>Cost & BOQ</span>
        </button>
      </nav>

      {/* Editor Dock Toggle & Preset Project Loader & Export CTA */}
      <div className="flex items-center gap-2">
        {/* Toggle BIM Editor Panel */}
        <button
          onClick={onToggleEditor}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
            isEditorOpen
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow'
              : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
          title="Toggle architectural & interior editor inspector"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">BIM Editor</span>
        </button>

        {/* Sample Projects Dropdown */}
        <div className="relative hidden lg:block">
          <select
            onChange={(e) => {
              if (e.target.value) onLoadSampleProject(e.target.value);
            }}
            defaultValue=""
            className="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="" disabled>Load Example Project...</option>
            {SAMPLE_PROJECTS.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold shadow transition"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </header>
  );
};
