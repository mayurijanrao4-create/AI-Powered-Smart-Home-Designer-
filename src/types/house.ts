/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MeasurementUnit = 'meters' | 'feet' | 'inches' | 'millimeters';

export type CardinalDirection = 
  | 'North' 
  | 'South' 
  | 'East' 
  | 'West' 
  | 'North-East' 
  | 'North-West' 
  | 'South-East' 
  | 'South-West';

export type PlotShape = 'rectangular' | 'skewed' | 'trapezoidal';

export type ArchitecturalStyle =
  | 'contemporary_indian'
  | 'modern_minimalist'
  | 'tropical_modern'
  | 'brutalist_concrete'
  | 'traditional_kerala';

export type RoomCategory =
  | 'living'
  | 'master_bedroom'
  | 'bedroom'
  | 'kitchen'
  | 'dining'
  | 'bathroom'
  | 'attached_toilet'
  | 'pooja'
  | 'study'
  | 'utility'
  | 'store'
  | 'balcony'
  | 'staircase'
  | 'parking'
  | 'foyer'
  | 'terrace'
  | 'custom';

export type FurnitureType =
  | 'bed'
  | 'sofa'
  | 'dining_table'
  | 'kitchen_counter'
  | 'wardrobe'
  | 'wc'
  | 'washbasin'
  | 'tv_unit'
  | 'car'
  | 'study_desk'
  | 'pooja_mandir'
  | 'refrigerator'
  | 'shower_cubicle'
  | 'armchair'
  | 'plant'
  | 'rug'
  | 'bookshelf';

export interface FurnitureSpec {
  id?: string;
  type: FurnitureType;
  name: string;
  x: number; // offset relative to room center in meters
  z: number;
  width: number;
  length: number;
  rotation: number; // 0, 45, 90, 180, 270
}

export interface DoorOpening {
  id?: string;
  wallSide: 'north' | 'south' | 'east' | 'west';
  position: number; // distance from wall start in meters
  width: number;
  height: number;
  swingDirection?: 'inward' | 'outward';
  label?: string;
}

export interface WindowOpening {
  id?: string;
  wallSide: 'north' | 'south' | 'east' | 'west';
  position: number;
  width: number;
  height: number;
  sillHeight: number;
}

export interface RoomRequirement {
  id: string;
  name: string;
  category: RoomCategory;
  floorNumber: number; // 0 for Ground, 1 for 1st, 2 for 2nd
  preferredWidthM: number;
  preferredLengthM: number;
  minWidthM: number;
  minLengthM: number;
  hasAttachedBath?: boolean;
  needsVentilation?: boolean;
  priorityOrder?: number;
  furniture: FurnitureType[];
  notes?: string;
}

export interface GeneratedRoom {
  id: string;
  requirementId: string;
  name: string;
  category: RoomCategory;
  floorNumber: number;
  x: number; // in meters relative to buildable origin
  z: number;
  width: number;
  length: number;
  areaM2: number;
  doors: DoorOpening[];
  windows: WindowOpening[];
  furniture: FurnitureSpec[];
  wallHeight: number;
  color: string;
}

export interface Setbacks {
  front: number; // meters
  rear: number;
  left: number;
  right: number;
}

export interface PlotConfig {
  clientName: string;
  projectTitle: string;
  clientPhone: string;
  location: string;
  unit: MeasurementUnit;
  widthM: number; // stored in meters
  lengthM: number; // stored in meters
  shape: PlotShape;
  roadLocation: CardinalDirection;
  roadWidthM: number;
  orientation: CardinalDirection; // Facing of the plot
  preferredHouseFacing: CardinalDirection;
  setbacks: Setbacks;
  floorCount: number; // 1 = Ground Only, 2 = G+1 (Duplex), 3 = G+2
  floorHeightM: number;
  architecturalStyle: ArchitecturalStyle;
  budgetTarget: number; // in local currency (e.g. INR or USD)
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  notes: string;
}

export interface MaterialThemeConfig {
  id: ArchitecturalStyle;
  name: string;
  description: string;
  exteriorWallColor: string;
  interiorWallColor: string;
  accentWallColor: string;
  floorTileColor: string;
  floorMaterialType: 'marble' | 'vitrified' | 'wood' | 'terracotta';
  woodTrimColor: string;
  roofTileColor: string;
  windowFrameColor: string;
  glassColor: string;
}

export interface CostParameters {
  standardCivilCostPerSqFt: number; // base RCC + brick + plaster
  finishingCostPerSqFt: number;
  laborRatePerSqFt: number;
  steelRatePerKg: number;
  cementRatePerBag: number;
  brickRatePerPcs: number;
  flooringRatePerSqFt: number;
  paintRatePerSqFt: number;
}

export interface DetailedEstimate {
  plotAreaSqM: number;
  plotAreaSqFt: number;
  buildableAreaSqM: number;
  buildableAreaSqFt: number;
  groundCoverageSqM: number;
  groundCoverageSqFt: number;
  groundCoveragePercentage: number;
  totalBuiltUpAreaSqM: number;
  totalBuiltUpAreaSqFt: number;
  totalCarpetAreaSqM: number;
  totalCarpetAreaSqFt: number;
  fsiRatio: number;
  
  // Material quantities
  concreteVolumeCuM: number;
  steelWeightKg: number;
  bricksCount: number;
  cementBagsCount: number;
  sandVolumeCuFt: number;
  aggregateVolumeCuFt: number;
  flooringAreaSqFt: number;
  plasterAndPaintAreaSqFt: number;

  // Cost items
  civilStructureCost: number;
  masonryAndPlasterCost: number;
  flooringAndTilingCost: number;
  doorsWindowsCost: number;
  electricalAndPlumbingCost: number;
  paintingFinishesCost: number;
  laborCost: number;
  totalEstimatedCost: number;
}

export interface FloorPlanLayout {
  rooms: GeneratedRoom[];
  floorCount: number;
  buildableWidth: number;
  buildableLength: number;
  originX: number; // offset inside plot
  originZ: number;
  warnings: string[];
  layoutScore: number;
  layoutVariantName: string;
  facadeStyle?: ArchitecturalStyle;
}

export interface HouseDesignAlternative {
  id: string;
  name: string;
  tagline: string;
  styleId: ArchitecturalStyle;
  description: string;
  layout: FloorPlanLayout;
  elevationFeatures: string[];
  keyHighlights: string[];
  estimatedCost: number;
  builtUpAreaSqFt: number;
  carpetAreaSqFt: number;
  groundCoveragePercentage: number;
  floorCount: number;
  circulationEfficiencyScore: number;
  vastuScore: number;
}
