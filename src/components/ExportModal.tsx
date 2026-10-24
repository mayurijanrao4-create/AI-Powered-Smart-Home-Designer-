/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Check,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  Image,
  Layers,
  X,
} from 'lucide-react';
import { DEFAULT_COST_PARAMETERS } from '../constants/defaults';
import {
  FloorPlanLayout,
  PlotConfig,
  RoomRequirement,
} from '../types/house';
import { calculateDetailedEstimate } from '../utils/costEstimator';
import {
  exportProjectToDXF,
  exportProjectToJSON,
  exportProjectToPDF,
} from '../utils/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  plot: PlotConfig;
  layout: FloorPlanLayout;
  requirements: RoomRequirement[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  plot,
  layout,
  requirements,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const estimate = calculateDetailedEstimate(plot, layout, DEFAULT_COST_PARAMETERS);

  const handleExportPDF = () => {
    exportProjectToPDF(plot, layout, requirements, estimate);
    setDownloadSuccess('PDF Proposal successfully generated');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleExportDXF = () => {
    exportProjectToDXF(plot, layout);
    setDownloadSuccess('CAD DXF drawing downloaded');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleExportJSON = () => {
    exportProjectToJSON(plot, layout, requirements);
    setDownloadSuccess('JSON Project data backup saved');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white">Export Project Deliverables</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content options */}
        <div className="p-6 space-y-3">
          {downloadSuccess && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{downloadSuccess}</span>
            </div>
          )}

          {/* Option 1: PDF Proposal */}
          <button
            onClick={handleExportPDF}
            className="w-full p-4 rounded-xl border border-slate-800 hover:border-amber-500 bg-slate-950/60 hover:bg-slate-950 text-left transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Client Proposal Report (PDF)</h4>
                <p className="text-xs text-slate-400">
                  Full 2-page document with specs, room area schedule, BOQ materials & cost estimate.
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
          </button>

          {/* Option 2: CAD DXF */}
          <button
            onClick={handleExportDXF}
            className="w-full p-4 rounded-xl border border-slate-800 hover:border-indigo-500 bg-slate-950/60 hover:bg-slate-950 text-left transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">AutoCAD / Revit DXF Drawing</h4>
                <p className="text-xs text-slate-400">
                  Vector lines for plot boundary, setbacks, and room walls on separate CAD layers.
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
          </button>

          {/* Option 3: JSON Project Backup */}
          <button
            onClick={handleExportJSON}
            className="w-full p-4 rounded-xl border border-slate-800 hover:border-emerald-500 bg-slate-950/60 hover:bg-slate-950 text-left transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Full Project Data (JSON)</h4>
                <p className="text-xs text-slate-400">
                  Structured geometry, room coordinates, and client data for project backup.
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
