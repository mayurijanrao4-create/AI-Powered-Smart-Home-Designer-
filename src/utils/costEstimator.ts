/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CostParameters, DetailedEstimate, FloorPlanLayout, PlotConfig } from '../types/house';

export function calculateDetailedEstimate(
  plot: PlotConfig,
  layout: FloorPlanLayout,
  costParams: CostParameters
): DetailedEstimate {
  const plotAreaSqM = plot.widthM * plot.lengthM;
  const plotAreaSqFt = plotAreaSqM * 10.7639;

  const buildableAreaSqM = layout.buildableWidth * layout.buildableLength;
  const buildableAreaSqFt = buildableAreaSqM * 10.7639;

  // Ground floor room area
  const groundRooms = layout.rooms.filter((r) => r.floorNumber === 0);
  const groundCarpetM2 = groundRooms.reduce((sum, r) => sum + r.areaM2, 0);
  const groundBuiltUpM2 = groundCarpetM2 * 1.18; // 18% for exterior/interior walls & structural columns
  const groundCoveragePercentage = plotAreaSqM > 0 ? (groundBuiltUpM2 / plotAreaSqM) * 100 : 0;

  // Total carpet area across all floors
  const totalCarpetAreaSqM = layout.rooms.reduce((sum, r) => sum + r.areaM2, 0);
  const totalCarpetAreaSqFt = totalCarpetAreaSqM * 10.7639;

  // Total built-up area across all floors
  const totalBuiltUpAreaSqM = totalCarpetAreaSqM * 1.18;
  const totalBuiltUpAreaSqFt = totalBuiltUpAreaSqM * 10.7639;

  const fsiRatio = plotAreaSqM > 0 ? totalBuiltUpAreaSqM / plotAreaSqM : 0;

  // Civil Engineering Material Quantities (Empirical Residential RCC Frame Standards)
  // 1. Concrete (M20/M25 grade for footings, plinth beam, columns, roof slab): ~0.06 cu.m per sq.ft of BUA
  const concreteVolumeCuM = Number((totalBuiltUpAreaSqFt * 0.058).toFixed(2));

  // 2. TMT Reinforcement Steel (Fe550D): ~4.0 kg per sq.ft of BUA
  const steelWeightKg = Math.round(totalBuiltUpAreaSqFt * 4.1);

  // 3. Bricks / AAC Blocks (9" outer, 4.5" inner partitions): ~1.35 bricks/sq.ft BUA
  const bricksCount = Math.round(totalBuiltUpAreaSqFt * 1.35 * 10);

  // 4. Cement (50kg bags for concrete + masonry + 2-coat plastering): ~0.42 bags/sq.ft BUA
  const cementBagsCount = Math.round(totalBuiltUpAreaSqFt * 0.42);

  // 5. Sand (M-Sand / Plastering sand): ~1.9 cu.ft per sq.ft BUA
  const sandVolumeCuFt = Math.round(totalBuiltUpAreaSqFt * 1.9);

  // 6. Aggregate (20mm & 10mm crushed blue metal): ~1.35 cu.ft per sq.ft BUA
  const aggregateVolumeCuFt = Math.round(totalBuiltUpAreaSqFt * 1.35);

  // 7. Flooring area: carpet area + 10% cutting wastage
  const flooringAreaSqFt = Math.round(totalCarpetAreaSqFt * 1.1);

  // 8. Plaster & Paint area: ~2.8x of built-up area (internal walls, ceiling, exterior elevation)
  const plasterAndPaintAreaSqFt = Math.round(totalBuiltUpAreaSqFt * 2.85);

  // Cost Item Calculations
  const civilStructureCost = Math.round(totalBuiltUpAreaSqFt * costParams.standardCivilCostPerSqFt);
  const masonryAndPlasterCost = Math.round(bricksCount * costParams.brickRatePerPcs + cementBagsCount * 0.4 * costParams.cementRatePerBag);
  const flooringAndTilingCost = Math.round(flooringAreaSqFt * costParams.flooringRatePerSqFt);
  const doorsWindowsCost = Math.round(totalBuiltUpAreaSqFt * 165); // High-grade wood/UPVC windows and flush doors
  const electricalAndPlumbingCost = Math.round(totalBuiltUpAreaSqFt * 190); // CPVC piping, modular switches, sanitaries
  const paintingFinishesCost = Math.round(plasterAndPaintAreaSqFt * costParams.paintRatePerSqFt);
  const laborCost = Math.round(totalBuiltUpAreaSqFt * costParams.laborRatePerSqFt);

  const totalEstimatedCost =
    civilStructureCost +
    masonryAndPlasterCost +
    flooringAndTilingCost +
    doorsWindowsCost +
    electricalAndPlumbingCost +
    paintingFinishesCost +
    laborCost;

  return {
    plotAreaSqM: Number(plotAreaSqM.toFixed(2)),
    plotAreaSqFt: Math.round(plotAreaSqFt),
    buildableAreaSqM: Number(buildableAreaSqM.toFixed(2)),
    buildableAreaSqFt: Math.round(buildableAreaSqFt),
    groundCoverageSqM: Number(groundBuiltUpM2.toFixed(2)),
    groundCoverageSqFt: Math.round(groundBuiltUpM2 * 10.7639),
    groundCoveragePercentage: Number(groundCoveragePercentage.toFixed(1)),
    totalBuiltUpAreaSqM: Number(totalBuiltUpAreaSqM.toFixed(2)),
    totalBuiltUpAreaSqFt: Math.round(totalBuiltUpAreaSqFt),
    totalCarpetAreaSqM: Number(totalCarpetAreaSqM.toFixed(2)),
    totalCarpetAreaSqFt: Math.round(totalCarpetAreaSqFt),
    fsiRatio: Number(fsiRatio.toFixed(2)),

    concreteVolumeCuM,
    steelWeightKg,
    bricksCount,
    cementBagsCount,
    sandVolumeCuFt,
    aggregateVolumeCuFt,
    flooringAreaSqFt,
    plasterAndPaintAreaSqFt,

    civilStructureCost,
    masonryAndPlasterCost,
    flooringAndTilingCost,
    doorsWindowsCost,
    electricalAndPlumbingCost,
    paintingFinishesCost,
    laborCost,
    totalEstimatedCost,
  };
}
