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
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onChangeTab,
  plot,
  onLoadSampleProject,
  onOpenExport,
  isSplitView,
  onToggleSplitView,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-30 select-none">
      {/* Brand Title */}
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
              Plot-to-3D BIM
            </span>
          </div>
          <div className="text-[11px] text-slate-400 truncate max-w-[260px] sm:max-w-none">
            {plot.projectTitle} • <span className="text-slate-300 font-mono">{plot.clientName || 'Residential Project'}</span>
          </div>
        </div>
      </div>

      {/* Main Mode Navigation Pills */}
      <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
        <button
          onClick={() => onChangeTab('3d_viewer')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition ${
            activeTab === '3d_viewer' && !isSplitView
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>3D BIM Model</span>
        </button>

        <button
          onClick={() => onChangeTab('2d_cad')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition ${
            activeTab === '2d_cad' && !isSplitView
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layout className="w-3.5 h-3.5" />
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
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Site & Spaces</span>
        </button>

        <button
          onClick={() => onChangeTab('cost_boq')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition ${
            activeTab === 'cost_boq'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Cost & BOQ</span>
        </button>
      </nav>

      {/* Preset Project Loader & Export CTA */}
      <div className="flex items-center gap-2">
        {/* Sample Projects Dropdown */}
        <div className="relative">
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
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/10 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
