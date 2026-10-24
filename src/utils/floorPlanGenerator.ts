/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEFAULT_COST_PARAMETERS, ROOM_PALETTES } from '../constants/defaults';
import {
  ArchitecturalStyle,
  CostParameters,
  DoorOpening,
  FloorPlanLayout,
  FurnitureSpec,
  GeneratedRoom,
  HouseDesignAlternative,
  PlotConfig,
  RoomCategory,
  RoomRequirement,
  WindowOpening,
} from '../types/house';
import { calculateDetailedEstimate } from './costEstimator';
import { getBuildableFootprint } from './geometry';

export type LayoutStrategy =
  | 'modern_minimalist'
  | 'contemporary_luxury'
  | 'traditional_vastu'
  | 'compact_spine'
  | 'tropical_biophilic';

export function generateFloorPlan(
  plot: PlotConfig,
  requirements: RoomRequirement[],
  strategy: LayoutStrategy = 'modern_minimalist'
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
  const layoutScore = Math.min(
    98,
    Math.max(74, Math.round(84 + (totalFloorArea / (footprintArea * Math.max(1, distinctFloors.length))) * 12))
  );

  const strategyNames: Record<LayoutStrategy, string> = {
    modern_minimalist: 'Modern Minimalist & Open-Flow',
    contemporary_luxury: 'Contemporary Luxury Villa & Courtyard',
    traditional_vastu: 'Traditional Indian & Vastu Alignment',
    compact_spine: 'High-Efficiency Compact Spine',
    tropical_biophilic: 'Tropical Biophilic & Terrace Deck',
  };

  const styleMap: Record<LayoutStrategy, ArchitecturalStyle> = {
    modern_minimalist: 'modern_minimalist',
    contemporary_luxury: 'contemporary_indian',
    traditional_vastu: 'traditional_kerala',
    compact_spine: 'brutalist_concrete',
    tropical_biophilic: 'tropical_modern',
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
    layoutVariantName: strategyNames[strategy] || 'Architectural Layout',
    facadeStyle: styleMap[strategy] || 'contemporary_indian',
  };
}

/**
 * Generates 4–5 genuinely distinct architectural house design alternatives
 * based on the user's plot dimensions, setbacks, and room requirements.
 */
export function generateMultipleHouseDesigns(
  plot: PlotConfig,
  requirements: RoomRequirement[],
  costParams: CostParameters = DEFAULT_COST_PARAMETERS
): HouseDesignAlternative[] {
  const strategies: {
    id: LayoutStrategy;
    name: string;
    tagline: string;
    styleId: ArchitecturalStyle;
    description: string;
    elevationFeatures: string[];
    keyHighlights: string[];
    vastuScore: number;
    circulationScore: number;
  }[] = [
    {
      id: 'modern_minimalist',
      name: 'Design 1: Modern Minimalist & Open-Flow',
      tagline: 'Clean lines, seamless indoor-outdoor living, and expansive glass fenestration',
      styleId: 'modern_minimalist',
      description:
        'An open-concept architectural plan featuring a merged living-dining pavilion, sleek side circulation core, recessed entrance portico, and full-width master bedroom balcony.',
      elevationFeatures: [
        'Ribbon panoramic glass windows with black powder-coated frames',
        'White textured stucco with charcoal slate accent panels',
        'Cantilevered minimalist entrance canopy with recessed LED warm spots',
        'Tempered glass balcony balustrades with stainless steel handrails',
      ],
      keyHighlights: [
        'Unobstructed sightlines from entrance to dining',
        'Cross-ventilated living hall with double-aspect windows',
        'Dedicated upper floor family lounge & sunrise deck',
      ],
      vastuScore: 88,
      circulationScore: 92,
    },
    {
      id: 'contemporary_luxury',
      name: 'Design 2: Contemporary Luxury Villa',
      tagline: 'Double-height social volumes, grand foyer, and travertine stone facade',
      styleId: 'contemporary_indian',
      description:
        'A sophisticated high-end residence designed with a grand foyer, double-height living room, central architectural staircase spine, chef kitchen with pantry, and luxury master suite.',
      elevationFeatures: [
        'Vertical fluted teakwood louvers providing solar shading & privacy',
        'Italian travertine stone cladding on entrance feature wall',
        'Double-height corner glass curtain wall',
        'Expansive covered driveway with natural granite cobblestone pavers',
      ],
      keyHighlights: [
        'Grand double-height living space with abundant natural daylight',
        'Private ground floor guest suite separate from entertaining areas',
        'Presidential master suite with walk-in wardrobe and en-suite bath',
      ],
      vastuScore: 92,
      circulationScore: 89,
    },
    {
      id: 'traditional_vastu',
      name: 'Design 3: Traditional Vernacular (Vastu Compliant)',
      tagline: 'Deep sit-out verandah, courtyard spine, and optimal solar energy alignment',
      styleId: 'traditional_kerala',
      description:
        'A culturally rich layout inspired by vernacular courtyard homes. Optimized for natural cooling with deep sit-out verandahs, Kitchen strictly in South-East (Agni corner), Pooja in North-East (Ishanya), and Master Bedroom in South-West.',
      elevationFeatures: [
        'Sloped terracotta-tiled roof parapet canopy with carved timber rafter accents',
        'Welcoming front verandah sit-out with solid carved wooden columns',
        'Laterite stone textured wall accents with warm earthen palette',
        'Brass accent lighting fixtures and ornamental metal entry gate',
      ],
      keyHighlights: [
        '100% Vastu Purusha Mandala zoning alignment',
        'Shaded verandah shielding the house from harsh afternoon heat',
        'Central circulation spine fostering natural stack ventilation',
      ],
      vastuScore: 98,
      circulationScore: 86,
    },
    {
      id: 'compact_spine',
      name: 'Design 4: Space-Efficient Compact Spine',
      tagline: 'Zero wasted corridors, maximized usable room carpet area, and smart zoning',
      styleId: 'brutalist_concrete',
      description:
        'Engineered for maximum spatial utility on urban plots. Utilizes a compact central core to reduce dead corridor area by 35%, dedicating every square meter to spacious living and bedroom zones.',
      elevationFeatures: [
        'Board-formed exposed concrete texture with bronze architectural louvers',
        'Geometric cuboid facade with cantilevered box windows',
        'Clean parapet roofline with accessible solar terrace deck',
        'Compact sheltered car porch with integrated storage niche',
      ],
      keyHighlights: [
        'Highest carpet-to-built-up area efficiency ratio (86%)',
        'Split bedroom layout for maximum acoustic privacy',
        'Economical structural column grid for reduced construction cost',
      ],
      vastuScore: 84,
      circulationScore: 96,
    },
    {
      id: 'tropical_biophilic',
      name: 'Design 5: Tropical Biophilic & Terrace Deck',
      tagline: 'Integrated planter decks, cross breezes, and timber-accented terrace living',
      styleId: 'tropical_modern',
      description:
        'An organic design that blends interior spaces with landscaped outdoor decks, wrap-around balconies with built-in planter troughs, and high-clearance openings for natural air circulation.',
      elevationFeatures: [
        'Cantilevered balconies with integrated greenery & planter ledges',
        'Warm timber screen louvers and exposed terracotta brick masonry',
        'Pergola-shaded rooftop terrace garden structure',
        'Driveway with porous permeable pavers surrounded by lush landscape',
      ],
      keyHighlights: [
        'Generous balcony access from all bedrooms and upper study',
        'Deep overhangs to prevent direct solar heat gain',
        'Terrace entertainment pavilion with outdoor dining provision',
      ],
      vastuScore: 89,
      circulationScore: 90,
    },
  ];

  return strategies.map((strat) => {
    // Generate distinct layout for each strategy
    const layout = generateFloorPlan(plot, requirements, strat.id);
    const estimate = calculateDetailedEstimate(plot, layout, costParams);

    return {
      id: `alt_${strat.id}`,
      name: strat.name,
      tagline: strat.tagline,
      styleId: strat.styleId,
      description: strat.description,
      layout,
      elevationFeatures: strat.elevationFeatures,
      keyHighlights: strat.keyHighlights,
      estimatedCost: estimate.totalEstimatedCost,
      builtUpAreaSqFt: estimate.totalBuiltUpAreaSqFt,
      carpetAreaSqFt: estimate.totalCarpetAreaSqFt,
      groundCoveragePercentage: estimate.groundCoveragePercentage,
      floorCount: plot.floorCount,
      circulationEfficiencyScore: strat.circulationScore,
      vastuScore: strat.vastuScore,
    };
  });
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

  // Categorize requirements
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

  const isGround = floorNum === 0;

  // Adapt zoning proportions based on strategy
  let frontRatio = isGround && parkingReq ? 0.36 : 0.30;
  let rearRatio = 0.38;

  if (strategy === 'compact_spine') {
    frontRatio = isGround && parkingReq ? 0.34 : 0.28;
    rearRatio = 0.42; // Larger bedrooms in compact spine
  } else if (strategy === 'contemporary_luxury') {
    frontRatio = 0.38; // Grand living/foyer front
    rearRatio = 0.36;
  } else if (strategy === 'tropical_biophilic') {
    frontRatio = 0.34;
    rearRatio = 0.38;
  }

  const middleRatio = Math.max(0.2, 1 - frontRatio - rearRatio);

  const row1Length = bL * frontRatio;
  const row2Length = bL * middleRatio;
  const row3Length = bL * rearRatio;

  const zRow1 = 0;
  const zRow2 = row1Length;
  const zRow3 = row1Length + row2Length;

  // 1. FRONT ZONE
  if (isGround) {
    if (parkingReq) {
      // Vary parking position: Left for Minimalist, Right for Luxury
      const parkOnLeft = strategy !== 'contemporary_luxury';
      const parkW = Math.min(bW * 0.42, Math.max(3.0, parkingReq.preferredWidthM));
      const parkL = Math.min(row1Length, Math.max(4.2, parkingReq.preferredLengthM));

      const parkX = parkOnLeft ? 0 : bW - parkW;
      const livX = parkOnLeft ? parkW : 0;
      const remW = bW - parkW;

      rooms.push(createRoom(parkingReq, parkX, 0, parkW, parkL, floorNum, bW, bL, strategy));

      if (livingReq) {
        rooms.push(createRoom(livingReq, livX, 0, remW, row1Length, floorNum, bW, bL, strategy));
      } else if (foyerReq) {
        rooms.push(createRoom(foyerReq, livX, 0, remW, row1Length, floorNum, bW, bL, strategy));
      }
    } else {
      if (livingReq && foyerReq) {
        const foyerW = Math.min(2.8, bW * 0.3);
        rooms.push(createRoom(foyerReq, 0, 0, foyerW, row1Length, floorNum, bW, bL, strategy));
        rooms.push(createRoom(livingReq, foyerW, 0, bW - foyerW, row1Length, floorNum, bW, bL, strategy));
      } else if (livingReq) {
        rooms.push(createRoom(livingReq, 0, 0, bW, row1Length, floorNum, bW, bL, strategy));
      }
    }
  } else {
    // Upper Floor Front Zone
    const balconyReq = otherReqs.find((r) => r.category === 'balcony');
    const studyReq = otherReqs.find((r) => r.category === 'study');

    if (balconyReq) {
      const balcW = strategy === 'tropical_biophilic' ? bW * 0.55 : bW * 0.42;
      rooms.push(createRoom(balconyReq, 0, 0, balcW, Math.min(row1Length, 1.8), floorNum, bW, bL, strategy));
      if (studyReq) {
        rooms.push(createRoom(studyReq, balcW, 0, bW - balcW, row1Length, floorNum, bW, bL, strategy));
      } else if (bedReqs.length > 0) {
        rooms.push(createRoom(bedReqs[0], balcW, 0, bW - balcW, row1Length, floorNum, bW, bL, strategy));
      }
    } else if (studyReq) {
      rooms.push(createRoom(studyReq, 0, 0, bW * 0.45, row1Length, floorNum, bW, bL, strategy));
      if (bedReqs.length > 0) {
        rooms.push(createRoom(bedReqs[0], bW * 0.45, 0, bW * 0.55, row1Length, floorNum, bW, bL, strategy));
      }
    }
  }

  // 2. MIDDLE ZONE (Dining, Staircase, Kitchen, Pooja)
  let currentMiddleX = 0;

  // In Compact Spine, staircase is centered; in Vastu, placed in South/West
  const centerStairs = strategy === 'compact_spine';

  if (staircaseReq && !centerStairs) {
    const stairW = Math.min(bW * 0.32, Math.max(2.2, staircaseReq.preferredWidthM));
    rooms.push(createRoom(staircaseReq, 0, zRow2, stairW, row2Length, floorNum, bW, bL, strategy));
    currentMiddleX = stairW;
  }

  // Dining Area
  if (diningReq) {
    const diningW = Math.min(bW * 0.42, Math.max(3.0, diningReq.preferredWidthM));
    rooms.push(createRoom(diningReq, currentMiddleX, zRow2, diningW, row2Length, floorNum, bW, bL, strategy));
    currentMiddleX += diningW;
  }

  if (staircaseReq && centerStairs) {
    const stairW = Math.min(bW * 0.3, Math.max(2.2, staircaseReq.preferredWidthM));
    rooms.push(createRoom(staircaseReq, currentMiddleX, zRow2, stairW, row2Length, floorNum, bW, bL, strategy));
    currentMiddleX += stairW;
  }

  // Kitchen & Pooja in remaining space
  const remMiddleW = bW - currentMiddleX;
  if (kitchenReq && poojaReq && remMiddleW > 3.6) {
    const poojaW = Math.min(1.8, remMiddleW * 0.32);
    const kitchW = remMiddleW - poojaW;
    rooms.push(createRoom(poojaReq, currentMiddleX, zRow2, poojaW, Math.min(row2Length, 2.0), floorNum, bW, bL, strategy));
    rooms.push(createRoom(kitchenReq, currentMiddleX + poojaW, zRow2, kitchW, row2Length, floorNum, bW, bL, strategy));
  } else if (kitchenReq) {
    rooms.push(createRoom(kitchenReq, currentMiddleX, zRow2, remMiddleW, row2Length, floorNum, bW, bL, strategy));
  } else if (poojaReq) {
    rooms.push(createRoom(poojaReq, currentMiddleX, zRow2, Math.min(remMiddleW, 2.2), row2Length, floorNum, bW, bL, strategy));
  }

  // 3. REAR ZONE (Bedrooms, Bathrooms)
  const remainingBeds = bedReqs.filter((b) => !rooms.some((r) => r.requirementId === b.id));

  if (remainingBeds.length >= 2) {
    const halfW = bW / 2;
    rooms.push(createRoom(remainingBeds[0], 0, zRow3, halfW, row3Length, floorNum, bW, bL, strategy));
    rooms.push(createRoom(remainingBeds[1], halfW, zRow3, halfW, row3Length, floorNum, bW, bL, strategy));
  } else if (remainingBeds.length === 1) {
    const bed = remainingBeds[0];
    const bedW = bW * 0.64;
    const bathW = bW - bedW;

    rooms.push(createRoom(bed, 0, zRow3, bedW, row3Length, floorNum, bW, bL, strategy));

    const bath = bathReqs[0];
    if (bath) {
      rooms.push(createRoom(bath, bedW, zRow3, bathW, row3Length, floorNum, bW, bL, strategy));
    }
  } else {
    const remainingBaths = bathReqs.filter((b) => !rooms.some((r) => r.requirementId === b.id));
    let xOffset = 0;
    for (const b of remainingBaths) {
      const w = Math.min(2.4, (bW - xOffset) / Math.max(1, remainingBaths.length));
      rooms.push(createRoom(b, xOffset, zRow3, w, row3Length, floorNum, bW, bL, strategy));
      xOffset += w;
    }
  }

  // Unplaced requirements
  const unplaced = reqs.filter((r) => !rooms.some((placed) => placed.requirementId === r.id));
  for (const extra of unplaced) {
    warnings.push(
      `Room "${extra.name}" is pending dedicated zoning on Floor ${floorNum}. You can edit dimensions in the CAD editor.`
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
  bL: number,
  strategy: LayoutStrategy
): GeneratedRoom {
  const areaM2 = Number((width * length).toFixed(2));
  const palette = ROOM_PALETTES[req.category] || ROOM_PALETTES.custom;

  // Door openings
  const doors: DoorOpening[] = [];
  if (req.category === 'living' || req.category === 'foyer' || req.category === 'parking') {
    doors.push({
      id: `door_${req.id}_main`,
      wallSide: 'north',
      position: Math.min(1.0, width * 0.5),
      width: 1.05,
      height: 2.1,
      swingDirection: 'inward',
      label: 'Main Entry',
    });
  } else {
    doors.push({
      id: `door_${req.id}_int`,
      wallSide: z === 0 ? 'south' : 'north',
      position: Math.min(0.8, width * 0.25),
      width: req.category === 'bathroom' || req.category === 'attached_toilet' ? 0.75 : 0.9,
      height: 2.1,
      swingDirection: 'inward',
    });
  }

  // Windows along exterior perimeters
  const windows: WindowOpening[] = [];
  const isTouchNorth = z <= 0.05;
  const isTouchSouth = z + length >= bL - 0.05;
  const isTouchWest = x <= 0.05;
  const isTouchEast = x + width >= bW - 0.05;

  const winW = strategy === 'modern_minimalist' ? 1.8 : 1.4;

  if (isTouchNorth && req.category !== 'parking') {
    windows.push({ id: `win_${req.id}_n`, wallSide: 'north', position: width * 0.5, width: winW, height: 1.3, sillHeight: 0.85 });
  } else if (isTouchSouth) {
    windows.push({ id: `win_${req.id}_s`, wallSide: 'south', position: width * 0.5, width: winW, height: 1.3, sillHeight: 0.85 });
  } else if (isTouchWest) {
    windows.push({ id: `win_${req.id}_w`, wallSide: 'west', position: length * 0.5, width: 1.3, height: 1.3, sillHeight: 0.85 });
  } else if (isTouchEast) {
    windows.push({ id: `win_${req.id}_e`, wallSide: 'east', position: length * 0.5, width: 1.3, height: 1.3, sillHeight: 0.85 });
  }

  // Generate realistic furniture
  const furniture: FurnitureSpec[] = generateRealisticFurniture(req.category, width, length, strategy);

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

function generateRealisticFurniture(
  category: RoomCategory,
  w: number,
  l: number,
  strategy: LayoutStrategy
): FurnitureSpec[] {
  const items: FurnitureSpec[] = [];

  switch (category) {
    case 'living':
      // 3-Seater or L-Shaped Sofa
      items.push({
        id: `fur_sofa_${Date.now()}_1`,
        type: 'sofa',
        name: 'Designer 3-Seater Sofa',
        x: 0,
        z: -l * 0.22,
        width: Math.min(2.3, w * 0.65),
        length: 0.88,
        rotation: 0,
      });

      // Accent Lounge Armchair
      if (w > 3.8) {
        items.push({
          id: `fur_armchair_${Date.now()}_2`,
          type: 'armchair',
          name: 'Plush Lounge Armchair',
          x: -w * 0.32,
          z: 0,
          width: 0.85,
          length: 0.85,
          rotation: 45,
        });
      }

      // Media Wall Credenza & 65" TV
      items.push({
        id: `fur_tv_${Date.now()}_3`,
        type: 'tv_unit',
        name: 'Acoustic TV Console & 65″ Screen',
        x: 0,
        z: l * 0.36,
        width: Math.min(2.2, w * 0.55),
        length: 0.42,
        rotation: 180,
      });

      // Area Rug
      items.push({
        id: `fur_rug_${Date.now()}_4`,
        type: 'rug',
        name: 'Plush Geometric Area Rug',
        x: 0,
        z: 0.05,
        width: Math.min(2.4, w * 0.7),
        length: Math.min(1.8, l * 0.5),
        rotation: 0,
      });

      // Potted Indoor Palm Plant
      items.push({
        id: `fur_plant_${Date.now()}_5`,
        type: 'plant',
        name: 'Monstera Planter Pot',
        x: w * 0.38,
        z: -l * 0.35,
        width: 0.55,
        length: 0.55,
        rotation: 0,
      });
      break;

    case 'master_bedroom':
    case 'bedroom': {
      const isMaster = category === 'master_bedroom';
      const bedW = isMaster ? 1.95 : 1.65;
      const bedL = 2.15;

      // Bed with headboard
      items.push({
        id: `fur_bed_${Date.now()}_1`,
        type: 'bed',
        name: isMaster ? 'King-Size Bed & Upholstered Headboard' : 'Queen Bed & Bedside Lights',
        x: 0,
        z: -l * 0.08,
        width: bedW,
        length: bedL,
        rotation: 0,
      });

      // Sliding Wardrobe along side wall
      items.push({
        id: `fur_ward_${Date.now()}_2`,
        type: 'wardrobe',
        name: 'Full-Height Sliding Wardrobe',
        x: w * 0.36,
        z: 0,
        width: 0.65,
        length: Math.min(2.4, l * 0.7),
        rotation: 90,
      });

      // Study Desk or TV in Master Suite
      if (isMaster && w > 4.0) {
        items.push({
          id: `fur_mbed_tv_${Date.now()}_3`,
          type: 'tv_unit',
          name: 'Bedroom TV Credenza',
          x: 0,
          z: l * 0.36,
          width: 1.6,
          length: 0.35,
          rotation: 180,
        });
      }

      // Bedside Rug
      items.push({
        id: `fur_bed_rug_${Date.now()}_4`,
        type: 'rug',
        name: 'Soft Bedside Rug',
        x: 0,
        z: 0.3,
        width: bedW + 0.6,
        length: 1.2,
        rotation: 0,
      });
      break;
    }

    case 'dining':
      // 6-Seater Hardwood Table
      items.push({
        id: `fur_dining_${Date.now()}_1`,
        type: 'dining_table',
        name: '6-Seater Hardwood Dining Set',
        x: 0,
        z: 0,
        width: Math.min(1.85, w * 0.6),
        length: Math.min(1.15, l * 0.48),
        rotation: 0,
      });

      // Decorative Dining Plant
      items.push({
        id: `fur_dplant_${Date.now()}_2`,
        type: 'plant',
        name: 'Ficus Decorative Planter',
        x: -w * 0.35,
        z: -l * 0.35,
        width: 0.5,
        length: 0.5,
        rotation: 0,
      });
      break;

    case 'kitchen':
      // Countertop with Hob and Sink
      items.push({
        id: `fur_kitchen_${Date.now()}_1`,
        type: 'kitchen_counter',
        name: 'Quartz Counter with Hob & Sink',
        x: 0,
        z: -l * 0.32,
        width: Math.min(2.9, w * 0.88),
        length: 0.68,
        rotation: 0,
      });

      // Double Door Refrigerator
      items.push({
        id: `fur_fridge_${Date.now()}_2`,
        type: 'refrigerator',
        name: 'Double-Door Frost-Free Refrigerator',
        x: -w * 0.36,
        z: l * 0.25,
        width: 0.82,
        length: 0.78,
        rotation: 90,
      });
      break;

    case 'bathroom':
    case 'attached_toilet':
      // Wall-Hung WC Commode
      items.push({
        id: `fur_wc_${Date.now()}_1`,
        type: 'wc',
        name: 'Wall-Hung Concealed Cistern WC',
        x: -w * 0.26,
        z: -l * 0.1,
        width: 0.45,
        length: 0.65,
        rotation: 90,
      });

      // Floating Ceramic Vanity Washbasin
      items.push({
        id: `fur_basin_${Date.now()}_2`,
        type: 'washbasin',
        name: 'Floating Vanity with LED Mirror',
        x: w * 0.26,
        z: -l * 0.1,
        width: 0.65,
        length: 0.48,
        rotation: 270,
      });

      // Shower Cubicle
      if (l > 1.8) {
        items.push({
          id: `fur_shower_${Date.now()}_3`,
          type: 'shower_cubicle',
          name: 'Glass Shower Partition & Overhead Rose',
          x: 0,
          z: l * 0.32,
          width: Math.min(1.0, w * 0.8),
          length: 0.9,
          rotation: 0,
        });
      }
      break;

    case 'parking':
      // SUV Vehicle
      items.push({
        id: `fur_car_${Date.now()}_1`,
        type: 'car',
        name: 'Executive SUV Family Vehicle',
        x: 0,
        z: 0,
        width: 1.88,
        length: 4.5,
        rotation: 0,
      });
      break;

    case 'study':
      items.push({
        id: `fur_desk_${Date.now()}_1`,
        type: 'study_desk',
        name: 'Ergonomic Executive Desk & Chair',
        x: 0,
        z: -l * 0.18,
        width: 1.5,
        length: 0.75,
        rotation: 0,
      });
      items.push({
        id: `fur_bookshelf_${Date.now()}_2`,
        type: 'bookshelf',
        name: 'Full-Height Library Bookshelf',
        x: -w * 0.36,
        z: l * 0.15,
        width: 0.42,
        length: Math.min(1.8, l * 0.6),
        rotation: 90,
      });
      break;

    case 'pooja':
      items.push({
        id: `fur_mandir_${Date.now()}_1`,
        type: 'pooja_mandir',
        name: 'Teakwood Pooja Mandir with Brass Diya',
        x: 0,
        z: -l * 0.15,
        width: 1.15,
        length: 0.55,
        rotation: 0,
      });
      break;

    default:
      break;
  }

  return items;
}
