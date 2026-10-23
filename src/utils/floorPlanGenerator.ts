/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ROOM_PALETTES } from '../constants/defaults';
import {
  DoorOpening,
  FloorPlanLayout,
  FurnitureSpec,
  GeneratedRoom,
  PlotConfig,
  RoomCategory,
  RoomRequirement,
  WindowOpening,
} from '../types/house';
import { getBuildableFootprint } from './geometry';

export type LayoutStrategy = 'vastu_zoned' | 'open_concept' | 'compact_core';

export function generateFloorPlan(
  plot: PlotConfig,
  requirements: RoomRequirement[],
  strategy: LayoutStrategy = 'vastu_zoned'
): FloorPlanLayout {
  const footprint = getBuildableFootprint(plot);
  const warnings: string[] = [];

  const bW = Math.max(3.5, footprint.width);
  const bL = Math.max(4.0, footprint.length);

  const distinctFloors = Array.from(new Set(requirements.map((r) => r.floorNumber))).sort((a, b) => a - b);
  const allRooms: GeneratedRoom[] = [];

  for (const floorNum of distinctFloors) {
    const floorReqs = requirements.filter((r) => r.floorNumber === floorNum);
    if (floorReqs.length === 0) continue;

    const floorRooms = layoutFloor(floorNum, floorReqs, bW, bL, plot, strategy, warnings);
    allRooms.push(...floorRooms);
  }

  // Calculate layout score
  const totalFloorArea = allRooms.reduce((sum, r) => sum + r.areaM2, 0);
  const footprintArea = bW * bL;
  const layoutScore = Math.min(98, Math.max(72, Math.round(85 + (totalFloorArea / (footprintArea * Math.max(1, distinctFloors.length))) * 10)));

  const strategyNames: Record<LayoutStrategy, string> = {
    vastu_zoned: 'Vastu & Zone-Hierarchical Layout',
    open_concept: 'Open-Concept Living & Courtyard Flow',
    compact_core: 'High-Efficiency Compact Spine Layout',
  };

  return {
    rooms: allRooms,
    floorCount: plot.floorCount,
    buildableWidth: bW,
    buildableLength: bL,
    originX: footprint.x,
    originZ: footprint.z,
    warnings,
    layoutScore,
    layoutVariantName: strategyNames[strategy],
  };
}

function layoutFloor(
  floorNum: number,
  reqs: RoomRequirement[],
  bW: number,
  bL: number,
  plot: PlotConfig,
  strategy: LayoutStrategy,
  warnings: string[]
): GeneratedRoom[] {
  const rooms: GeneratedRoom[] = [];

  // Group rooms by functional hierarchy
  const parkingReq = reqs.find((r) => r.category === 'parking');
  const foyerReq = reqs.find((r) => r.category === 'foyer');
  const livingReq = reqs.find((r) => r.category === 'living');
  const staircaseReq = reqs.find((r) => r.category === 'staircase');
  const diningReq = reqs.find((r) => r.category === 'dining');
  const kitchenReq = reqs.find((r) => r.category === 'kitchen');
  const poojaReq = reqs.find((r) => r.category === 'pooja');
  const bedReqs = reqs.filter((r) => r.category === 'bedroom' || r.category === 'master_bedroom');
  const bathReqs = reqs.filter((r) => r.category === 'bathroom' || r.category === 'attached_toilet');
  const otherReqs = reqs.filter(
    (r) =>
      !['parking', 'foyer', 'living', 'staircase', 'dining', 'kitchen', 'pooja', 'bedroom', 'master_bedroom', 'bathroom', 'attached_toilet'].includes(
        r.category
      )
  );

  // Divide available depth into 3 horizontal zones (front, middle, rear)
  const isGround = floorNum === 0;
  
  // Calculate row heights proportionally
  const frontRatio = isGround && parkingReq ? 0.35 : 0.30;
  const rearRatio = 0.38;
  const middleRatio = 1 - frontRatio - rearRatio;

  const row1Length = bL * frontRatio;
  const row2Length = bL * middleRatio;
  const row3Length = bL * rearRatio;

  const zRow1 = 0;
  const zRow2 = row1Length;
  const zRow3 = row1Length + row2Length;

  // 1. FRONT ZONE (Z: 0 to row1Length)
  if (isGround) {
    if (parkingReq) {
      const parkW = Math.min(bW * 0.42, Math.max(3.0, parkingReq.preferredWidthM));
      const parkL = Math.min(row1Length, Math.max(4.2, parkingReq.preferredLengthM));
      rooms.push(createRoom(parkingReq, 0, 0, parkW, parkL, floorNum, bW, bL));

      const remW = bW - parkW;
      if (livingReq) {
        const livW = remW;
        const livL = row1Length;
        rooms.push(createRoom(livingReq, parkW, 0, livW, livL, floorNum, bW, bL));
      } else if (foyerReq) {
        rooms.push(createRoom(foyerReq, parkW, 0, remW, row1Length, floorNum, bW, bL));
      }
    } else {
      // No parking on ground floor
      if (livingReq && foyerReq) {
        const foyerW = Math.min(2.5, bW * 0.3);
        rooms.push(createRoom(foyerReq, 0, 0, foyerW, row1Length, floorNum, bW, bL));
        rooms.push(createRoom(livingReq, foyerW, 0, bW - foyerW, row1Length, floorNum, bW, bL));
      } else if (livingReq) {
        rooms.push(createRoom(livingReq, 0, 0, bW, row1Length, floorNum, bW, bL));
      }
    }
  } else {
    // Upper Floor Front Zone: Balcony + Study or Master Bed
    const balconyReq = otherReqs.find((r) => r.category === 'balcony');
    const studyReq = otherReqs.find((r) => r.category === 'study');
    
    if (balconyReq) {
      const balcW = bW * 0.45;
      rooms.push(createRoom(balconyReq, 0, 0, balcW, Math.min(row1Length, 1.8), floorNum, bW, bL));
      if (studyReq) {
        rooms.push(createRoom(studyReq, balcW, 0, bW - balcW, row1Length, floorNum, bW, bL));
      } else if (bedReqs.length > 0) {
        const bed = bedReqs[0];
        rooms.push(createRoom(bed, balcW, 0, bW - balcW, row1Length, floorNum, bW, bL));
      }
    } else if (studyReq) {
      rooms.push(createRoom(studyReq, 0, 0, bW * 0.45, row1Length, floorNum, bW, bL));
      if (bedReqs.length > 0) {
        rooms.push(createRoom(bedReqs[0], bW * 0.45, 0, bW * 0.55, row1Length, floorNum, bW, bL));
      }
    }
  }

  // 2. MIDDLE ZONE (Z: zRow2 to zRow3)
  // Dining, Kitchen, Staircase, Pooja
  let currentMiddleX = 0;

  // Staircase placement
  if (staircaseReq) {
    const stairW = Math.min(bW * 0.32, Math.max(2.2, staircaseReq.preferredWidthM));
    rooms.push(createRoom(staircaseReq, 0, zRow2, stairW, row2Length, floorNum, bW, bL));
    currentMiddleX = stairW;
  }

  // Dining
  if (diningReq) {
    const diningW = Math.min(bW * 0.4, Math.max(3.0, diningReq.preferredWidthM));
    rooms.push(createRoom(diningReq, currentMiddleX, zRow2, diningW, row2Length, floorNum, bW, bL));
    currentMiddleX += diningW;
  }

  // Kitchen & Pooja on remaining width
  const remMiddleW = bW - currentMiddleX;
  if (kitchenReq && poojaReq && remMiddleW > 3.8) {
    const poojaW = Math.min(1.8, remMiddleW * 0.35);
    const kitchW = remMiddleW - poojaW;
    rooms.push(createRoom(poojaReq, currentMiddleX, zRow2, poojaW, Math.min(row2Length, 2.0), floorNum, bW, bL));
    rooms.push(createRoom(kitchenReq, currentMiddleX + poojaW, zRow2, kitchW, row2Length, floorNum, bW, bL));
  } else if (kitchenReq) {
    rooms.push(createRoom(kitchenReq, currentMiddleX, zRow2, remMiddleW, row2Length, floorNum, bW, bL));
  } else if (poojaReq) {
    rooms.push(createRoom(poojaReq, currentMiddleX, zRow2, Math.min(remMiddleW, 2.2), row2Length, floorNum, bW, bL));
  }

  // 3. REAR ZONE (Z: zRow3 to bL)
  // Master Bedroom, Additional Bedroom, Attached Bathrooms
  const remainingBeds = bedReqs.filter((b) => !rooms.some((r) => r.requirementId === b.id));
  
  if (remainingBeds.length >= 2) {
    const halfW = bW / 2;
    // Bed 1
    const bed1 = remainingBeds[0];
    const bed1L = row3Length;
    rooms.push(createRoom(bed1, 0, zRow3, halfW, bed1L, floorNum, bW, bL));

    // Bed 2
    const bed2 = remainingBeds[1];
    rooms.push(createRoom(bed2, halfW, zRow3, halfW, row3Length, floorNum, bW, bL));
  } else if (remainingBeds.length === 1) {
    const bed = remainingBeds[0];
    const bedW = bW * 0.65;
    const bathW = bW - bedW;

    rooms.push(createRoom(bed, 0, zRow3, bedW, row3Length, floorNum, bW, bL));

    // Place bathroom in remaining corner
    const bath = bathReqs[0];
    if (bath) {
      rooms.push(createRoom(bath, bedW, zRow3, bathW, row3Length, floorNum, bW, bL));
    }
  } else {
    // Other spaces or baths
    const remainingBaths = bathReqs.filter((b) => !rooms.some((r) => r.requirementId === b.id));
    let xOffset = 0;
    for (const b of remainingBaths) {
      const w = Math.min(2.4, (bW - xOffset) / Math.max(1, remainingBaths.length));
      rooms.push(createRoom(b, xOffset, zRow3, w, row3Length, floorNum, bW, bL));
      xOffset += w;
    }
  }

  // Any remaining unplaced requirements (e.g. utility, store)
  const unplaced = reqs.filter((r) => !rooms.some((placed) => placed.requirementId === r.id));
  for (const extra of unplaced) {
    // If small space like store or bath, fit in free corner or warn
    warnings.push(
      `Room "${extra.name}" could not be automatically slotted into the primary layout grid on Floor ${floorNum}. You can place it on another floor or increase buildable area.`
    );
  }

  return rooms;
}

function createRoom(
  req: RoomRequirement,
  x: number,
  z: number,
  width: number,
  length: number,
  floorNumber: number,
  bW: number,
  bL: number
): GeneratedRoom {
  const areaM2 = Number((width * length).toFixed(2));
  const palette = ROOM_PALETTES[req.category] || ROOM_PALETTES.custom;

  // Calculate doors
  const doors: DoorOpening[] = [];
  // Main door / entrance opening logic
  if (req.category === 'living' || req.category === 'foyer' || req.category === 'parking') {
    doors.push({
      wallSide: 'north',
      position: Math.min(1.0, width * 0.5),
      width: 1.05,
      height: 2.1,
      swingDirection: 'inward',
      label: 'Main Entry',
    });
  } else {
    // Interior door
    doors.push({
      wallSide: z === 0 ? 'south' : 'north',
      position: Math.min(0.8, width * 0.25),
      width: req.category === 'bathroom' || req.category === 'attached_toilet' ? 0.75 : 0.9,
      height: 2.1,
      swingDirection: 'inward',
    });
  }

  // Calculate windows for natural lighting on exterior perimeter walls
  const windows: WindowOpening[] = [];
  const isTouchNorth = z <= 0.05;
  const isTouchSouth = z + length >= bL - 0.05;
  const isTouchWest = x <= 0.05;
  const isTouchEast = x + width >= bW - 0.05;

  if (isTouchNorth && req.category !== 'parking') {
    windows.push({ wallSide: 'north', position: width * 0.5, width: 1.5, height: 1.2, sillHeight: 0.9 });
  } else if (isTouchSouth) {
    windows.push({ wallSide: 'south', position: width * 0.5, width: 1.4, height: 1.2, sillHeight: 0.9 });
  } else if (isTouchWest) {
    windows.push({ wallSide: 'west', position: length * 0.5, width: 1.2, height: 1.2, sillHeight: 0.9 });
  } else if (isTouchEast) {
    windows.push({ wallSide: 'east', position: length * 0.5, width: 1.2, height: 1.2, sillHeight: 0.9 });
  }

  // Generate furniture models according to room category
  const furniture: FurnitureSpec[] = generateFurnitureForRoom(req.category, width, length);

  return {
    id: `gen_${req.id}_fl${floorNumber}`,
    requirementId: req.id,
    name: req.name,
    category: req.category,
    floorNumber,
    x: Number(x.toFixed(2)),
    z: Number(z.toFixed(2)),
    width: Number(width.toFixed(2)),
    length: Number(length.toFixed(2)),
    areaM2,
    doors,
    windows,
    furniture,
    wallHeight: 3.0,
    color: palette.color,
  };
}

function generateFurnitureForRoom(category: RoomCategory, w: number, l: number): FurnitureSpec[] {
  const items: FurnitureSpec[] = [];

  switch (category) {
    case 'living':
      // 3-seater sofa + coffee table + TV credenza
      items.push({
        type: 'sofa',
        name: '3-Seater Sofa Suite',
        x: 0,
        z: -l * 0.2,
        width: Math.min(2.2, w * 0.6),
        length: 0.85,
        rotation: 0,
      });
      items.push({
        type: 'tv_unit',
        name: 'Media Console & Wall Panel',
        x: 0,
        z: l * 0.35,
        width: Math.min(2.0, w * 0.5),
        length: 0.4,
        rotation: 180,
      });
      break;

    case 'master_bedroom':
    case 'bedroom':
      // King / Queen Bed with side tables & Wardrobe
      items.push({
        type: 'bed',
        name: category === 'master_bedroom' ? 'King Size Bed with Headboard' : 'Queen Bed',
        x: 0,
        z: 0,
        width: category === 'master_bedroom' ? 1.9 : 1.6,
        length: 2.1,
        rotation: 0,
      });
      items.push({
        type: 'wardrobe',
        name: 'Full Height Sliding Wardrobe',
        x: w * 0.35,
        z: 0,
        width: 0.6,
        length: Math.min(2.2, l * 0.7),
        rotation: 90,
      });
      break;

    case 'dining':
      // 6-Seater Dining Table with Chairs
      items.push({
        type: 'dining_table',
        name: '6-Seater Hardwood Dining Table',
        x: 0,
        z: 0,
        width: Math.min(1.8, w * 0.55),
        length: Math.min(1.1, l * 0.45),
        rotation: 0,
      });
      break;

    case 'kitchen':
      // L-Shaped Granite Countertop with Cooktop and Sink
      items.push({
        type: 'kitchen_counter',
        name: 'Granite Counter with Hob & Sink',
        x: 0,
        z: -l * 0.35,
        width: Math.min(2.8, w * 0.85),
        length: 0.65,
        rotation: 0,
      });
      break;

    case 'bathroom':
    case 'attached_toilet':
      // Wall hung WC + Vanity Washbasin
      items.push({
        type: 'wc',
        name: 'Wall-Hung Commode',
        x: -w * 0.25,
        z: 0,
        width: 0.45,
        length: 0.65,
        rotation: 90,
      });
      items.push({
        type: 'washbasin',
        name: 'Ceramic Vanity Counter',
        x: w * 0.25,
        z: 0,
        width: 0.6,
        length: 0.45,
        rotation: 270,
      });
      break;

    case 'parking':
      // SUV / Sedan representation
      items.push({
        type: 'car',
        name: 'Family SUV Vehicle',
        x: 0,
        z: 0,
        width: 1.85,
        length: 4.4,
        rotation: 0,
      });
      break;

    case 'study':
      items.push({
        type: 'study_desk',
        name: 'Executive Ergonomic Desk',
        x: 0,
        z: -l * 0.2,
        width: 1.4,
        length: 0.7,
        rotation: 0,
      });
      break;

    case 'pooja':
      items.push({
        type: 'pooja_mandir',
        name: 'Teakwood Pooja Mandapam',
        x: 0,
        z: -l * 0.2,
        width: 1.1,
        length: 0.5,
        rotation: 0,
      });
      break;

    default:
      break;
  }

  return items;
}
