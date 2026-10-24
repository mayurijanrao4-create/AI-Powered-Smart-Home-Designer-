/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import { formatArea, formatDimension } from '../constants/defaults';
import { DetailedEstimate, FloorPlanLayout, PlotConfig, RoomRequirement } from '../types/house';

export function exportProjectToPDF(
  plot: PlotConfig,
  layout: FloorPlanLayout,
  requirements: RoomRequirement[],
  estimate: DetailedEstimate
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  // PAGE 1: ARCHITECTURAL BRIEF & SPECIFICATIONS
  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(245, 158, 11); // amber-500
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('AI-POWERED SMART HOME DESIGNER', margin, 14);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Preliminary Residential Architectural Plan & Civil Feasibility Report', margin, 22);

  // Project & Client Metadata
  let y = 42;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`PROJECT: ${plot.projectTitle.toUpperCase()}`, margin, y);

  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Client: ${plot.clientName} | Phone: ${plot.clientPhone}`, margin, y);
  y += 5;
  doc.text(`Site Location: ${plot.location}`, margin, y);
  y += 5;
  doc.text(`Generated: ${new Date().toLocaleDateString()} | Design Style: ${plot.architecturalStyle.replace('_', ' ').toUpperCase()}`, margin, y);

  y += 8;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  // Plot & Area Summary Table
  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. PLOT & ZONING PARTICULARS', margin, y);

  y += 6;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 34, 'F');
  doc.rect(margin, y, contentWidth, 34, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  const col1 = margin + 4;
  const col2 = margin + contentWidth / 2 + 4;

  doc.text(`Plot Dimensions: ${formatDimension(plot.widthM, plot.unit)} x ${formatDimension(plot.lengthM, plot.unit)}`, col1, y + 6);
  doc.text(`Plot Area: ${estimate.plotAreaSqFt.toLocaleString()} sq.ft (${estimate.plotAreaSqM} sq.m)`, col1, y + 13);
  doc.text(`Road Facing: ${plot.roadLocation} (${formatDimension(plot.roadWidthM, plot.unit)} wide)`, col1, y + 20);
  doc.text(`House Facing: ${plot.preferredHouseFacing}`, col1, y + 27);

  doc.text(`Front Setback: ${formatDimension(plot.setbacks.front, plot.unit)}`, col2, y + 6);
  doc.text(`Rear Setback: ${formatDimension(plot.setbacks.rear, plot.unit)}`, col2, y + 13);
  doc.text(`Side Setbacks (L/R): ${formatDimension(plot.setbacks.left, plot.unit)} / ${formatDimension(plot.setbacks.right, plot.unit)}`, col2, y + 20);
  doc.text(`Buildable Footprint: ${estimate.buildableAreaSqFt.toLocaleString()} sq.ft`, col2, y + 27);

  // Area Schedule
  y += 42;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. CIVIL ENGINEERING AREA STATEMENT', margin, y);

  y += 6;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 24, 'F');
  doc.rect(margin, y, contentWidth, 24, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Carpet Area: ${estimate.totalCarpetAreaSqFt.toLocaleString()} sq.ft (${estimate.totalCarpetAreaSqM} sq.m)`, col1, y + 6);
  doc.text(`Total Built-Up Area (BUA): ${estimate.totalBuiltUpAreaSqFt.toLocaleString()} sq.ft (${estimate.totalBuiltUpAreaSqM} sq.m)`, col1, y + 13);
  doc.text(`Ground Coverage: ${estimate.groundCoveragePercentage}% (${estimate.groundCoverageSqFt.toLocaleString()} sq.ft)`, col2, y + 6);
  doc.text(`Floor Area Ratio (FAR / FSI): ${estimate.fsiRatio}`, col2, y + 13);
  doc.text(`Number of Storeys: ${plot.floorCount === 1 ? 'Ground Only' : plot.floorCount === 2 ? 'G+1 Duplex' : `G+${plot.floorCount - 1}`}`, col1, y + 20);

  // Room Schedule
  y += 32;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. ROOM-WISE CARPET AREA SCHEDULE', margin, y);

  y += 6;
  // Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Level', margin + 3, y + 4.5);
  doc.text('Room Name', margin + 25, y + 4.5);
  doc.text('Category', margin + 85, y + 4.5);
  doc.text('Dimensions (W x L)', margin + 125, y + 4.5);
  doc.text('Carpet Area', margin + 165, y + 4.5);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  layout.rooms.slice(0, 10).forEach((room, idx) => {
    const bgFill = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(bgFill, bgFill, bgFill);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.rect(margin, y, contentWidth, 6, 'S');

    doc.text(room.floorNumber === 0 ? 'Ground' : `Floor ${room.floorNumber}`, margin + 3, y + 4.2);
    doc.text(room.name, margin + 25, y + 4.2);
    doc.text(room.category.replace('_', ' '), margin + 85, y + 4.2);
    doc.text(`${formatDimension(room.width, plot.unit)} x ${formatDimension(room.length, plot.unit)}`, margin + 125, y + 4.2);
    doc.text(formatArea(room.areaM2, plot.unit).primary, margin + 165, y + 4.2);
    y += 6;
  });

  // PAGE 2: BILL OF QUANTITIES & COST ESTIMATE
  doc.addPage();

  // Page 2 Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CIVIL ENGINEERING BILL OF QUANTITIES (BOQ) & COST ESTIMATE', margin, 14);

  y = 32;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text('4. ESTIMATED MATERIAL CONSUMPTION', margin, y);

  y += 6;
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('Material Description', margin + 4, y + 4.5);
  doc.text('Empirical Quantity', margin + 100, y + 4.5);
  doc.text('Unit of Measurement', margin + 150, y + 4.5);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  const materials = [
    { name: 'RCC Ready-Mix / Site Concrete (M20/M25)', qty: `${estimate.concreteVolumeCuM} m³`, unit: 'Cubic Metres' },
    { name: 'TMT Reinforcement Steel (Fe550D Grade)', qty: `${estimate.steelWeightKg.toLocaleString()} kg`, unit: 'Metric Tonnes / kg' },
    { name: 'Standard Red Bricks / AAC Blocks (9" & 4.5")', qty: `${estimate.bricksCount.toLocaleString()} Pcs`, unit: 'Number of units' },
    { name: 'Structural Grade Cement (50kg Bags)', qty: `${estimate.cementBagsCount.toLocaleString()} Bags`, unit: 'PPC / OPC Bags' },
    { name: 'M-Sand for Concrete & 2-Coat Plaster', qty: `${estimate.sandVolumeCuFt.toLocaleString()} cu.ft`, unit: 'Cubic Feet' },
    { name: 'Graded Coarse Aggregate (20mm / 12mm)', qty: `${estimate.aggregateVolumeCuFt.toLocaleString()} cu.ft`, unit: 'Cubic Feet' },
    { name: 'Vitrified Tiles / Granite Flooring Area', qty: `${estimate.flooringAreaSqFt.toLocaleString()} sq.ft`, unit: 'Square Feet' },
    { name: 'Interior & Exterior Plaster and Paint Area', qty: `${estimate.plasterAndPaintAreaSqFt.toLocaleString()} sq.ft`, unit: 'Square Feet' },
  ];

  materials.forEach((m, idx) => {
    const bgFill = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(bgFill, bgFill, bgFill);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.rect(margin, y, contentWidth, 6, 'S');

    doc.text(m.name, margin + 4, y + 4.2);
    doc.text(m.qty, margin + 100, y + 4.2);
    doc.text(m.unit, margin + 150, y + 4.2);
    y += 6;
  });

  // Cost Itemization
  y += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('5. STAGE-WISE ESTIMATED COST SUMMARY', margin, y);

  y += 6;
  const costRows = [
    { name: '1. Civil RCC Structure (Footings, Plinth, Columns, Slabs)', val: estimate.civilStructureCost },
    { name: '2. Masonry Walls & 2-Coat Plastering', val: estimate.masonryAndPlasterCost },
    { name: '3. Vitrified / Marble Flooring & Tiling', val: estimate.flooringAndTilingCost },
    { name: '4. Teak Doors, UPVC Windows & Hardware', val: estimate.doorsWindowsCost },
    { name: '5. Electrical Conduit, Wiring & Plumbing Fixtures', val: estimate.electricalAndPlumbingCost },
    { name: '6. Emulsion Painting & Weatherproof Exterior Facade', val: estimate.paintingFinishesCost },
    { name: '7. Civil Masonry & Site Labor Charges', val: estimate.laborCost },
  ];

  costRows.forEach((c, idx) => {
    const shade = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(shade, shade, shade);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.rect(margin, y, contentWidth, 6, 'S');
    doc.setFont('helvetica', 'normal');
    doc.text(c.name, margin + 4, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(`${plot.currency} ${c.val.toLocaleString()}`, margin + 140, y + 4.2);
    y += 6;
  });

  // Total Cost Highlight
  y += 4;
  doc.setFillColor(245, 158, 11);
  doc.rect(margin, y, contentWidth, 10, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL PRELIMINARY ESTIMATED BUDGET:', margin + 4, y + 6.8);
  doc.text(`${plot.currency} ${estimate.totalEstimatedCost.toLocaleString()}`, margin + 130, y + 6.8);

  // Disclaimer
  y += 18;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('NOTICE & DISCLAIMER: This document constitutes a preliminary conceptual planning proposal and feasibility estimate.', margin, y);
  y += 4;
  doc.text('It does not replace licensed structural engineering calculations, soil bearing capacity reports, or official municipal sanction.', margin, y);

  doc.save(`${plot.projectTitle.replace(/\s+/g, '_')}_Proposal_Report.pdf`);
}

/**
 * Generate standard CAD DXF string containing walls, room bounds, setbacks, and annotations
 * Importable directly into AutoCAD, Revit, and SketchUp!
 */
export function generateDXF(plot: PlotConfig, layout: FloorPlanLayout): string {
  let dxf = '';
  // DXF Header
  dxf += '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1014\n0\nENDSEC\n';
  
  // DXF Tables (Layers)
  dxf += '0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n';
  dxf += '0\nLAYER\n2\nPLOT_BOUNDARY\n70\n0\n62\n7\n6\nCONTINUOUS\n0\n';
  dxf += '0\nLAYER\n2\nSETBACKS\n70\n0\n62\n1\n6\nDASHED\n0\n';
  dxf += '0\nLAYER\n2\nROOM_WALLS\n70\n0\n62\n4\n6\nCONTINUOUS\n0\n';
  dxf += '0\nENDTAB\n0\nENDSEC\n';

  // DXF Entities
  dxf += '0\nSECTION\n2\nENTITIES\n';

  // 1. Plot Boundary
  dxf += createDXFPolyline([
    [0, 0],
    [plot.widthM, 0],
    [plot.widthM, plot.lengthM],
    [0, plot.lengthM],
  ], 'PLOT_BOUNDARY');

  // 2. Setback Boundary
  dxf += createDXFPolyline([
    [plot.setbacks.left, plot.setbacks.front],
    [plot.widthM - plot.setbacks.right, plot.setbacks.front],
    [plot.widthM - plot.setbacks.right, plot.lengthM - plot.setbacks.rear],
    [plot.setbacks.left, plot.lengthM - plot.setbacks.rear],
  ], 'SETBACKS');

  // 3. Rooms
  layout.rooms.forEach((room) => {
    const rx = layout.originX + room.x;
    const rz = layout.originZ + room.z;
    dxf += createDXFPolyline([
      [rx, rz],
      [rx + room.width, rz],
      [rx + room.width, rz + room.length],
      [rx, rz + room.length],
    ], 'ROOM_WALLS');

    // Room Label Text
    dxf += `0\nTEXT\n8\nROOM_WALLS\n10\n${(rx + room.width / 2).toFixed(2)}\n20\n${(rz + room.length / 2).toFixed(2)}\n40\n0.35\n1\n${room.name}\n`;
  });

  dxf += '0\nENDSEC\n0\nEOF\n';
  return dxf;
}

function createDXFPolyline(points: [number, number][], layer: string): string {
  let s = `0\nPOLYLINE\n8\n${layer}\n66\n1\n70\n1\n`;
  for (const pt of points) {
    s += `0\nVERTEX\n8\n${layer}\n10\n${pt[0].toFixed(3)}\n20\n${pt[1].toFixed(3)}\n30\n0.0\n`;
  }
  s += '0\nSEQEND\n';
  return s;
}

export function exportProjectToDXF(plot: PlotConfig, layout: FloorPlanLayout) {
  const dxfContent = generateDXF(plot, layout);
  const blob = new Blob([dxfContent], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${plot.projectTitle.replace(/\s+/g, '_')}_CAD_Drawing.dxf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportProjectToJSON(plot: PlotConfig, layout: FloorPlanLayout, requirements: RoomRequirement[]) {
  const data = {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    plot,
    requirements,
    layout,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${plot.projectTitle.replace(/\s+/g, '_')}_ProjectData.json`;
  a.click();
  URL.revokeObjectURL(url);
}
