/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeneratedRoom, PlotConfig, RoomRequirement } from '../types/house';

export interface BoundingBox2D {
  x: number;
  z: number;
  width: number;
  length: number;
}

export function doBoxesOverlap(a: BoundingBox2D, b: BoundingBox2D, tolerance = 0.05): boolean {
  return (
    a.x < b.x + b.width - tolerance &&
    a.x + a.width - tolerance > b.x &&
    a.z < b.z + b.length - tolerance &&
    a.z + a.length - tolerance > b.z
  );
}

export function getBuildableFootprint(plot: PlotConfig): BoundingBox2D {
  const width = Math.max(0, plot.widthM - plot.setbacks.left - plot.setbacks.right);
  const length = Math.max(0, plot.lengthM - plot.setbacks.front - plot.setbacks.rear);
  
  return {
    x: plot.setbacks.left,
    z: plot.setbacks.front,
    width,
    length,
  };
}

export function validatePlotAndRequirements(
  plot: PlotConfig,
  requirements: RoomRequirement[]
): {
  isValid: boolean;
  warnings: string[];
  totalGroundReqArea: number;
  buildableArea: number;
  coverageRatio: number;
} {
  const warnings: string[] = [];
  const footprint = getBuildableFootprint(plot);
  const buildableArea = footprint.width * footprint.length;

  if (plot.widthM <= 0 || plot.lengthM <= 0) {
    warnings.push('Plot dimensions must be greater than zero.');
  }

  if (footprint.width <= 3 || footprint.length <= 3) {
    warnings.push('Buildable area after setbacks is too narrow (< 3m) for standard residential construction.');
  }

  const groundFloorReqs = requirements.filter((r) => r.floorNumber === 0);
  const totalGroundReqArea = groundFloorReqs.reduce((sum, r) => sum + (r.preferredWidthM * r.preferredLengthM), 0);

  // Accounting for 15% circulation + wall footprint
  const requiredWithWalls = totalGroundReqArea * 1.18;
  const coverageRatio = buildableArea > 0 ? requiredWithWalls / buildableArea : 0;

  if (requiredWithWalls > buildableArea && buildableArea > 0) {
    const excessAreaSqM = requiredWithWalls - buildableArea;
    const excessAreaSqFt = Math.round(excessAreaSqM * 10.7639);
    warnings.push(
      `Ground floor space requirement (${Math.round(requiredWithWalls * 10.7639)} sq.ft with walls) exceeds buildable footprint (${Math.round(buildableArea * 10.7639)} sq.ft) by ${excessAreaSqFt} sq.ft. Consider shifting guest bedroom or study to the 1st floor (duplex) or slightly reducing room dimensions.`
    );
  }

  if (plot.setbacks.front < 1.5) {
    warnings.push('Front setback is less than 1.5m (5 ft). Most municipal bylaws require at least 1.5m to 3.0m for light and ventilation.');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    totalGroundReqArea,
    buildableArea,
    coverageRatio,
  };
}

export function checkRoomOverlap(rooms: GeneratedRoom[]): string[] {
  const issues: string[] = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (rooms[i].floorNumber === rooms[j].floorNumber) {
        if (
          doBoxesOverlap(
            { x: rooms[i].x, z: rooms[i].z, width: rooms[i].width, length: rooms[i].length },
            { x: rooms[j].x, z: rooms[j].z, width: rooms[j].width, length: rooms[j].length }
          )
        ) {
          issues.push(`Room "${rooms[i].name}" overlaps with "${rooms[j].name}" on Floor ${rooms[i].floorNumber}.`);
        }
      }
    }
  }
  return issues;
}
