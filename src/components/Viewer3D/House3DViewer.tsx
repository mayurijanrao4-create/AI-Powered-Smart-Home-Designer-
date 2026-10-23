/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ARCHITECTURAL_THEMES } from '../../constants/defaults';
import {
  ArchitecturalStyle,
  FloorPlanLayout,
  FurnitureSpec,
  GeneratedRoom,
  PlotConfig,
} from '../../types/house';
import {
  createGrassTexture,
  createPaverTexture,
  createTileTexture,
  createWoodTexture,
} from '../../utils/proceduralTextures';

export interface Viewer3DSettings {
  viewMode: 'orbit' | 'first_person';
  cameraPreset: 'iso' | 'top' | 'front' | 'rear' | 'left' | 'right';
  sectionCutMode: 'none' | 'horizontal' | 'vertical_x' | 'vertical_z';
  sectionCutHeight: number; // 0 to 12 meters
  sectionCutX: number;
  sectionCutZ: number;
  showRoof: boolean;
  showFurniture: boolean;
  activeFloorFilter: number | 'all';
  lightingMode: 'day' | 'golden_hour' | 'night';
  showCeiling: boolean;
  wallOpacity: number; // 0.2 to 1.0
}

interface House3DViewerProps {
  plot: PlotConfig;
  layout: FloorPlanLayout;
  settings: Viewer3DSettings;
  onUpdateSettings: (newSettings: Partial<Viewer3DSettings>) => void;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
}

export const House3DViewer: React.FC<House3DViewerProps> = ({
  plot,
  layout,
  settings,
  onUpdateSettings,
  selectedRoomId,
  onSelectRoom,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const houseGroupRef = useRef<THREE.Group | null>(null);
  const clippingPlanesRef = useRef<THREE.Plane[]>([]);

  // Lighting references
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);

  // Software GL detection flag
  const [isSoftwareGlState, setIsSoftwareGlState] = useState(false);

  // Initialize Three.js Scene & Renderer
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    // 1. Detect software WebGL
    const glProbe = document.createElement('canvas').getContext('webgl2');
    let isSoftwareGl = false;
    if (glProbe) {
      const ext = glProbe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : glProbe.RENDERER;
      const gpu = String(glProbe.getParameter(param));
      glProbe.getExtension('WEBGL_lose_context')?.loseContext();
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } else {
      isSoftwareGl = true;
    }
    setIsSoftwareGlState(isSoftwareGl);

    // 2. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b0f19');
    scene.fog = new THREE.FogExp2('#0b0f19', 0.012);
    sceneRef.current = scene;

    // 3. Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.2,
      200
    );
    // Initial isometric position
    camera.position.set(22, 16, 26);
    cameraRef.current = camera;

    // 4. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 5. Environment Map Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 6. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.03; // Don't go below ground
    controls.minDistance = 3;
    controls.maxDistance = 80;
    controls.target.set(plot.widthM / 2, 2.5, plot.lengthM / 2);
    controlsRef.current = controls;

    // 7. Lighting Rig
    const sunLight = new THREE.DirectionalLight('#fff5e6', 2.2);
    sunLight.position.set(30, 40, 25);
    sunLight.castShadow = !isSoftwareGl;
    if (sunLight.castShadow) {
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 0.5;
      sunLight.shadow.camera.far = 120;
      sunLight.shadow.camera.left = -30;
      sunLight.shadow.camera.right = 30;
      sunLight.shadow.camera.top = 30;
      sunLight.shadow.camera.bottom = -30;
      sunLight.shadow.bias = -0.0005;
    }
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const hemiLight = new THREE.HemisphereLight('#87ceeb', '#2c3e50', 0.85);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const ambientLight = new THREE.AmbientLight('#ffffff', 0.4);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // 8. Animation & Render Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Lighting Mood
  useEffect(() => {
    if (!sunLightRef.current || !hemiLightRef.current || !ambientLightRef.current || !sceneRef.current) return;
    const sun = sunLightRef.current;
    const hemi = hemiLightRef.current;
    const amb = ambientLightRef.current;
    const scene = sceneRef.current;

    if (settings.lightingMode === 'day') {
      sun.color.set('#fff5e6');
      sun.intensity = 2.2;
      sun.position.set(30, 40, 25);
      hemi.color.set('#87ceeb');
      hemi.groundColor.set('#2c3e50');
      hemi.intensity = 0.85;
      amb.intensity = 0.45;
      scene.background = new THREE.Color('#0b0f19');
    } else if (settings.lightingMode === 'golden_hour') {
      sun.color.set('#ff9f43');
      sun.intensity = 2.8;
      sun.position.set(38, 15, 30);
      hemi.color.set('#ffc048');
      hemi.groundColor.set('#5f27cd');
      hemi.intensity = 0.95;
      amb.intensity = 0.5;
      scene.background = new THREE.Color('#1e142b');
    } else if (settings.lightingMode === 'night') {
      sun.color.set('#34495e');
      sun.intensity = 0.3;
      sun.position.set(20, 30, -20);
      hemi.color.set('#1a252f');
      hemi.groundColor.set('#000000');
      hemi.intensity = 0.4;
      amb.intensity = 0.25;
      scene.background = new THREE.Color('#030712');
    }
  }, [settings.lightingMode]);

  // Update Clipping Planes for Section Cutaways
  useEffect(() => {
    const planes: THREE.Plane[] = [];

    if (settings.sectionCutMode === 'horizontal') {
      // Cut from top downward at sectionCutHeight
      planes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), settings.sectionCutHeight));
    } else if (settings.sectionCutMode === 'vertical_x') {
      // Longitudinal section along width
      planes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), settings.sectionCutX));
    } else if (settings.sectionCutMode === 'vertical_z') {
      // Cross section along length
      planes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), settings.sectionCutZ));
    }

    clippingPlanesRef.current = planes;

    // Apply clipping planes to all materials in the house group
    if (houseGroupRef.current) {
      houseGroupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => {
              mat.clippingPlanes = planes;
              mat.clipShadows = true;
              mat.needsUpdate = true;
            });
          } else if (mesh.material) {
            mesh.material.clippingPlanes = planes;
            mesh.material.clipShadows = true;
            mesh.material.needsUpdate = true;
          }
        }
      });
    }
  }, [settings.sectionCutMode, settings.sectionCutHeight, settings.sectionCutX, settings.sectionCutZ]);

  // Update Camera View Preset
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const centerX = plot.widthM / 2;
    const centerZ = plot.lengthM / 2;
    const targetY = (plot.floorCount * plot.floorHeightM) / 2;

    controls.target.set(centerX, targetY, centerZ);

    const dist = Math.max(plot.widthM, plot.lengthM) * 1.8;

    switch (settings.cameraPreset) {
      case 'iso':
        camera.position.set(centerX + dist * 0.7, targetY + dist * 0.7, centerZ + dist * 0.7);
        break;
      case 'top':
        camera.position.set(centerX, targetY + dist * 1.5, centerZ + 0.01);
        break;
      case 'front':
        camera.position.set(centerX, targetY + 1.5, centerZ + dist);
        break;
      case 'rear':
        camera.position.set(centerX, targetY + 1.5, centerZ - dist);
        break;
      case 'left':
        camera.position.set(centerX - dist, targetY + 1.5, centerZ);
        break;
      case 'right':
        camera.position.set(centerX + dist, targetY + 1.5, centerZ);
        break;
    }
    camera.lookAt(centerX, targetY, centerZ);
    controls.update();
  }, [settings.cameraPreset, plot.widthM, plot.lengthM, plot.floorCount, plot.floorHeightM]);

  // Build 3D House Geometry whenever Plot, Layout, Theme, or Visibility changes
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Remove old house group
    if (houseGroupRef.current) {
      scene.remove(houseGroupRef.current);
      disposeHierarchy(houseGroupRef.current);
      houseGroupRef.current = null;
    }

    const houseGroup = new THREE.Group();
    houseGroup.name = 'HouseRoot';

    const theme = ARCHITECTURAL_THEMES[plot.architecturalStyle] || ARCHITECTURAL_THEMES.contemporary_indian;

    // Shared procedural textures
    const woodTex = createWoodTexture();
    const tileTex = createTileTexture(theme.floorTileColor);
    const grassTex = createGrassTexture();
    const paverTex = createPaverTexture();

    // Shared PBR Materials
    const wallExtMat = new THREE.MeshStandardMaterial({
      color: theme.exteriorWallColor,
      roughness: 0.85,
      metalness: 0.05,
      clippingPlanes: clippingPlanesRef.current,
      clipShadows: true,
      transparent: settings.wallOpacity < 1,
      opacity: settings.wallOpacity,
    });

    const wallIntMat = new THREE.MeshStandardMaterial({
      color: theme.interiorWallColor,
      roughness: 0.9,
      metalness: 0.02,
      clippingPlanes: clippingPlanesRef.current,
      clipShadows: true,
      transparent: settings.wallOpacity < 1,
      opacity: settings.wallOpacity,
    });

    const floorTileMat = new THREE.MeshStandardMaterial({
      map: tileTex,
      roughness: 0.25,
      metalness: 0.1,
      clippingPlanes: clippingPlanesRef.current,
      clipShadows: true,
    });

    const woodTrimMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.4,
      metalness: 0.05,
      clippingPlanes: clippingPlanesRef.current,
      clipShadows: true,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: theme.glassColor,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.1,
      transmission: isSoftwareGlState ? 0 : 0.85,
      ior: 1.5,
      clippingPlanes: clippingPlanesRef.current,
    });

    const concreteMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      roughness: 0.9,
      metalness: 0.1,
      clippingPlanes: clippingPlanesRef.current,
      clipShadows: true,
    });

    // 1. Plot Base & Landscaping
    buildPlotLandscape(houseGroup, plot, grassTex, paverTex, concreteMat, clippingPlanesRef.current);

    // 2. Build Floor by Floor
    const flCount = plot.floorCount;
    for (let f = 0; f < flCount; f++) {
      if (settings.activeFloorFilter !== 'all' && settings.activeFloorFilter !== f) {
        continue;
      }

      const floorRooms = layout.rooms.filter((r) => r.floorNumber === f);
      const floorElevationY = f * plot.floorHeightM;

      const floorGroup = new THREE.Group();
      floorGroup.name = `Floor_${f}`;
      floorGroup.position.set(0, floorElevationY, 0);

      // Floor Plinth Slab (150mm thick)
      const slabGeo = new THREE.BoxGeometry(layout.buildableWidth, 0.18, layout.buildableLength);
      const slabMesh = new THREE.Mesh(slabGeo, floorTileMat);
      slabMesh.position.set(
        layout.originX + layout.buildableWidth / 2,
        0.09,
        layout.originZ + layout.buildableLength / 2
      );
      slabMesh.receiveShadow = true;
      floorGroup.add(slabMesh);

      // Room Partitions, Doors, Windows, and Furniture
      floorRooms.forEach((room) => {
        build3DRoom(
          floorGroup,
          room,
          layout,
          plot.floorHeightM,
          wallExtMat,
          wallIntMat,
          woodTrimMat,
          glassMat,
          settings.showFurniture,
          clippingPlanesRef.current,
          room.id === selectedRoomId
        );
      });

      // Staircase connecting to next floor
      if (f < flCount - 1) {
        const stairRoom = floorRooms.find((r) => r.category === 'staircase');
        if (stairRoom) {
          build3DStaircase(floorGroup, stairRoom, layout, plot.floorHeightM, woodTrimMat, concreteMat, clippingPlanesRef.current);
        }
      }

      houseGroup.add(floorGroup);
    }

    // 3. Roof / Terrace Parapet Slab
    if (settings.showRoof && (settings.activeFloorFilter === 'all' || settings.activeFloorFilter === flCount - 1)) {
      buildRoofAndParapet(houseGroup, plot, layout, concreteMat, wallExtMat, glassMat, clippingPlanesRef.current);
    }

    scene.add(houseGroup);
    houseGroupRef.current = houseGroup;
  }, [
    plot,
    layout,
    settings.wallOpacity,
    settings.showFurniture,
    settings.showRoof,
    settings.activeFloorFilter,
    selectedRoomId,
    isSoftwareGlState,
  ]);

  // Capture High-Res 3D Screenshot
  const takeScreenshot = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    const renderer = rendererRef.current;
    renderer.render(sceneRef.current, cameraRef.current);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${plot.projectTitle.replace(/\s+/g, '_')}_3D_Perspective.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Top Floating Info / Compass Badge */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 shadow-xl z-10 text-xs">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        <span className="font-semibold text-slate-200">Interactive 3D BIM Viewer</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">Facing: <span className="text-amber-400 font-mono">{plot.preferredHouseFacing}</span></span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">Floors: <span className="text-amber-400 font-mono">{plot.floorCount === 1 ? 'Ground Only' : plot.floorCount === 2 ? 'G+1 (Duplex)' : `G+${plot.floorCount - 1}`}</span></span>
      </div>

      {/* Top Right Quick Actions: Screenshot, Reset Camera */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={takeScreenshot}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold shadow-xl transition"
          title="Capture 3D Render"
        >
          📷 Capture 3D Render
        </button>
      </div>
    </div>
  );
};

// 3D Builder Sub-functions
function buildPlotLandscape(
  group: THREE.Group,
  plot: PlotConfig,
  grassTex: THREE.CanvasTexture,
  paverTex: THREE.CanvasTexture,
  concreteMat: THREE.Material,
  planes: THREE.Plane[]
) {
  const pW = plot.widthM;
  const pL = plot.lengthM;

  // Ground Grass Land
  const grassMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.9,
    metalness: 0.05,
    clippingPlanes: planes,
  });
  const plotGeo = new THREE.BoxGeometry(pW + 6, 0.2, pL + 6);
  const plotMesh = new THREE.Mesh(plotGeo, grassMat);
  plotMesh.position.set(pW / 2, -0.1, pL / 2);
  plotMesh.receiveShadow = true;
  group.add(plotMesh);

  // Driveway / Setback Paving
  const driveMat = new THREE.MeshStandardMaterial({
    map: paverTex,
    roughness: 0.8,
    metalness: 0.1,
    clippingPlanes: planes,
  });
  const driveGeo = new THREE.BoxGeometry(pW, 0.02, pL);
  const driveMesh = new THREE.Mesh(driveGeo, driveMat);
  driveMesh.position.set(pW / 2, 0.01, pL / 2);
  driveMesh.receiveShadow = true;
  group.add(driveMesh);

  // Compound Boundary Wall (Height 1.5m, Thickness 0.15m)
  const wallH = 1.4;
  const wallThick = 0.18;
  const compMat = new THREE.MeshStandardMaterial({
    color: '#64748b',
    roughness: 0.9,
    clippingPlanes: planes,
  });

  // Left boundary
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallH, pL), compMat);
  leftWall.position.set(wallThick / 2, wallH / 2, pL / 2);
  leftWall.castShadow = true;
  group.add(leftWall);

  // Right boundary
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallH, pL), compMat);
  rightWall.position.set(pW - wallThick / 2, wallH / 2, pL / 2);
  rightWall.castShadow = true;
  group.add(rightWall);

  // Rear boundary
  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(pW, wallH, wallThick), compMat);
  rearWall.position.set(pW / 2, wallH / 2, pL - wallThick / 2);
  rearWall.castShadow = true;
  group.add(rearWall);

  // Front boundary with Gate Opening
  const gateW = 3.6;
  const frontSegmentW = (pW - gateW) / 2;
  const fWall1 = new THREE.Mesh(new THREE.BoxGeometry(frontSegmentW, wallH, wallThick), compMat);
  fWall1.position.set(frontSegmentW / 2, wallH / 2, wallThick / 2);
  group.add(fWall1);

  const fWall2 = new THREE.Mesh(new THREE.BoxGeometry(frontSegmentW, wallH, wallThick), compMat);
  fWall2.position.set(pW - frontSegmentW / 2, wallH / 2, wallThick / 2);
  group.add(fWall2);
}

function build3DRoom(
  parent: THREE.Group,
  room: GeneratedRoom,
  layout: FloorPlanLayout,
  wallHeight: number,
  wallExtMat: THREE.Material,
  wallIntMat: THREE.Material,
  woodTrimMat: THREE.Material,
  glassMat: THREE.Material,
  showFurniture: boolean,
  planes: THREE.Plane[],
  isSelected: boolean
) {
  const roomGroup = new THREE.Group();
  roomGroup.name = `Room_${room.name}`;

  const rx = layout.originX + room.x;
  const rz = layout.originZ + room.z;
  const rw = room.width;
  const rl = room.length;
  const wallThick = 0.2; // 200mm standard wall

  // Highlight border if selected
  if (isSelected) {
    const selBoxGeo = new THREE.BoxGeometry(rw, 0.05, rl);
    const selMat = new THREE.MeshBasicMaterial({ color: '#f59e0b', wireframe: true });
    const selMesh = new THREE.Mesh(selBoxGeo, selMat);
    selMesh.position.set(rx + rw / 2, 0.05, rz + rl / 2);
    roomGroup.add(selMesh);
  }

  // 1. Four Room Enclosing Walls (with door & window openings)
  // North Wall (Z = rz)
  buildWallSegment(
    roomGroup,
    rx,
    rz,
    rx + rw,
    rz,
    wallHeight,
    wallThick,
    wallExtMat,
    room.doors.filter((d) => d.wallSide === 'north'),
    room.windows.filter((w) => w.wallSide === 'north'),
    woodTrimMat,
    glassMat
  );

  // South Wall (Z = rz + rl)
  buildWallSegment(
    roomGroup,
    rx,
    rz + rl,
    rx + rw,
    rz + rl,
    wallHeight,
    wallThick,
    wallExtMat,
    room.doors.filter((d) => d.wallSide === 'south'),
    room.windows.filter((w) => w.wallSide === 'south'),
    woodTrimMat,
    glassMat
  );

  // West Wall (X = rx)
  buildWallSegment(
    roomGroup,
    rx,
    rz,
    rx,
    rz + rl,
    wallHeight,
    wallThick,
    wallIntMat,
    room.doors.filter((d) => d.wallSide === 'west'),
    room.windows.filter((w) => w.wallSide === 'west'),
    woodTrimMat,
    glassMat
  );

  // East Wall (X = rx + rw)
  buildWallSegment(
    roomGroup,
    rx + rw,
    rz,
    rx + rw,
    rz + rl,
    wallHeight,
    wallThick,
    wallIntMat,
    room.doors.filter((d) => d.wallSide === 'east'),
    room.windows.filter((w) => w.wallSide === 'east'),
    woodTrimMat,
    glassMat
  );

  // 2. 3D Furniture Items
  if (showFurniture && room.furniture) {
    room.furniture.forEach((item) => {
      build3DFurnitureItem(roomGroup, item, rx + rw / 2, rz + rl / 2, woodTrimMat, planes);
    });
  }

  parent.add(roomGroup);
}

function buildWallSegment(
  parent: THREE.Group,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  height: number,
  thickness: number,
  wallMat: THREE.Material,
  doors: GeneratedRoom['doors'],
  windows: GeneratedRoom['windows'],
  woodMat: THREE.Material,
  glassMat: THREE.Material
) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.1) return;

  const angle = Math.atan2(dz, dx);
  const midX = (x1 + x2) / 2;
  const midZ = (z1 + z2) / 2;

  // Solid wall segment representation
  // If doors or windows present, split into lintel, sill, and jambs
  const hasDoor = doors.length > 0;
  const hasWindow = windows.length > 0;

  if (hasDoor) {
    const door = doors[0];
    const doorW = door.width;
    const doorH = door.height;
    const doorPos = door.position;

    // Wall before door
    if (doorPos > 0.1) {
      const w1 = new THREE.Mesh(new THREE.BoxGeometry(doorPos, height, thickness), wallMat);
      w1.position.set(midX - (len / 2 - doorPos / 2), height / 2, midZ);
      w1.rotation.y = -angle;
      w1.castShadow = true;
      w1.receiveShadow = true;
      parent.add(w1);
    }

    // Lintel above door
    const lintelH = height - doorH;
    if (lintelH > 0) {
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, lintelH, thickness), wallMat);
      lintel.position.set(midX - len / 2 + doorPos + doorW / 2, doorH + lintelH / 2, midZ);
      lintel.rotation.y = -angle;
      lintel.castShadow = true;
      parent.add(lintel);
    }

    // Door Leaf & Frame
    const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.05, doorH - 0.05, 0.04), woodMat);
    doorLeaf.position.set(midX - len / 2 + doorPos + doorW / 2, doorH / 2, midZ);
    doorLeaf.rotation.y = -angle;
    parent.add(doorLeaf);

    // Wall after door
    const remLen = len - (doorPos + doorW);
    if (remLen > 0.1) {
      const w2 = new THREE.Mesh(new THREE.BoxGeometry(remLen, height, thickness), wallMat);
      w2.position.set(midX + len / 2 - remLen / 2, height / 2, midZ);
      w2.rotation.y = -angle;
      w2.castShadow = true;
      w2.receiveShadow = true;
      parent.add(w2);
    }
  } else if (hasWindow) {
    const win = windows[0];
    const winW = win.width;
    const winH = win.height;
    const sillH = win.sillHeight;
    const winPos = win.position;

    // Sill below window
    const sill = new THREE.Mesh(new THREE.BoxGeometry(winW, sillH, thickness), wallMat);
    sill.position.set(midX, sillH / 2, midZ);
    sill.rotation.y = -angle;
    parent.add(sill);

    // Lintel above window
    const lintelH = height - (sillH + winH);
    if (lintelH > 0) {
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(winW, lintelH, thickness), wallMat);
      lintel.position.set(midX, sillH + winH + lintelH / 2, midZ);
      lintel.rotation.y = -angle;
      parent.add(lintel);
    }

    // Glass pane & frame
    const glass = new THREE.Mesh(new THREE.BoxGeometry(winW - 0.04, winH - 0.04, 0.03), glassMat);
    glass.position.set(midX, sillH + winH / 2, midZ);
    glass.rotation.y = -angle;
    parent.add(glass);

    // Side jambs
    const sideW = (len - winW) / 2;
    if (sideW > 0.1) {
      const jamb1 = new THREE.Mesh(new THREE.BoxGeometry(sideW, height, thickness), wallMat);
      jamb1.position.set(midX - len / 2 + sideW / 2, height / 2, midZ);
      jamb1.rotation.y = -angle;
      parent.add(jamb1);

      const jamb2 = new THREE.Mesh(new THREE.BoxGeometry(sideW, height, thickness), wallMat);
      jamb2.position.set(midX + len / 2 - sideW / 2, height / 2, midZ);
      jamb2.rotation.y = -angle;
      parent.add(jamb2);
    }
  } else {
    // Solid Continuous Wall
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, height, thickness), wallMat);
    wall.position.set(midX, height / 2, midZ);
    wall.rotation.y = -angle;
    wall.castShadow = true;
    wall.receiveShadow = true;
    parent.add(wall);
  }
}

function build3DStaircase(
  parent: THREE.Group,
  stairRoom: GeneratedRoom,
  layout: FloorPlanLayout,
  floorHeight: number,
  woodMat: THREE.Material,
  concMat: THREE.Material,
  planes: THREE.Plane[]
) {
  const stairGroup = new THREE.Group();
  stairGroup.name = 'DogLeggedStaircase';

  const rx = layout.originX + stairRoom.x;
  const rz = layout.originZ + stairRoom.z;
  const numSteps = 16;
  const riserH = floorHeight / numSteps;
  const treadL = stairRoom.length / (numSteps / 2);
  const stepW = stairRoom.width * 0.46;

  // Flight 1 (Steps 1 to 8)
  for (let i = 0; i < 8; i++) {
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(stepW, riserH * (i + 1), treadL), woodMat);
    stepMesh.position.set(rx + stepW / 2, (riserH * (i + 1)) / 2, rz + i * treadL + treadL / 2);
    stepMesh.castShadow = true;
    stairGroup.add(stepMesh);
  }

  // Mid-landing slab
  const landingMesh = new THREE.Mesh(
    new THREE.BoxGeometry(stairRoom.width, 0.15, stairRoom.length * 0.25),
    concMat
  );
  landingMesh.position.set(rx + stairRoom.width / 2, floorHeight / 2, rz + stairRoom.length * 0.85);
  stairGroup.add(landingMesh);

  parent.add(stairGroup);
}

function build3DFurnitureItem(
  parent: THREE.Group,
  item: FurnitureSpec,
  centerX: number,
  centerZ: number,
  woodMat: THREE.Material,
  planes: THREE.Plane[]
) {
  const fg = new THREE.Group();
  fg.position.set(centerX + item.x, 0, centerZ + item.z);
  fg.rotation.y = (item.rotation * Math.PI) / 180;

  const fabricMat = new THREE.MeshStandardMaterial({
    color: '#3b82f6',
    roughness: 0.7,
    clippingPlanes: planes,
  });

  const whiteMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.3,
    clippingPlanes: planes,
  });

  switch (item.type) {
    case 'bed': {
      // Bed base + headboard + mattress + pillows
      const base = new THREE.Mesh(new THREE.BoxGeometry(item.width, 0.35, item.length), woodMat);
      base.position.y = 0.175;
      base.castShadow = true;
      fg.add(base);

      const headboard = new THREE.Mesh(new THREE.BoxGeometry(item.width, 1.05, 0.1), woodMat);
      headboard.position.set(0, 0.525, -item.length / 2 + 0.05);
      headboard.castShadow = true;
      fg.add(headboard);

      const mattress = new THREE.Mesh(
        new THREE.BoxGeometry(item.width - 0.1, 0.22, item.length - 0.15),
        whiteMat
      );
      mattress.position.set(0, 0.45, 0.05);
      fg.add(mattress);
      break;
    }

    case 'sofa': {
      // 3-Seater Sofa base + backrest + armrests
      const base = new THREE.Mesh(new THREE.BoxGeometry(item.width, 0.42, item.length), fabricMat);
      base.position.y = 0.21;
      base.castShadow = true;
      fg.add(base);

      const back = new THREE.Mesh(new THREE.BoxGeometry(item.width, 0.8, 0.2), fabricMat);
      back.position.set(0, 0.5, -item.length / 2 + 0.1);
      fg.add(back);
      break;
    }

    case 'dining_table': {
      // Hardwood Dining Table Top + 4 Legs
      const top = new THREE.Mesh(new THREE.BoxGeometry(item.width, 0.06, item.length), woodMat);
      top.position.y = 0.74;
      top.castShadow = true;
      fg.add(top);

      const legGeo = new THREE.BoxGeometry(0.06, 0.72, 0.06);
      const leg1 = new THREE.Mesh(legGeo, woodMat);
      leg1.position.set(-item.width / 2 + 0.08, 0.36, -item.length / 2 + 0.08);
      fg.add(leg1);
      const leg2 = new THREE.Mesh(legGeo, woodMat);
      leg2.position.set(item.width / 2 - 0.08, 0.36, -item.length / 2 + 0.08);
      fg.add(leg2);
      const leg3 = new THREE.Mesh(legGeo, woodMat);
      leg3.position.set(-item.width / 2 + 0.08, 0.36, item.length / 2 - 0.08);
      fg.add(leg3);
      const leg4 = new THREE.Mesh(legGeo, woodMat);
      leg4.position.set(item.width / 2 - 0.08, 0.36, item.length / 2 - 0.08);
      fg.add(leg4);
      break;
    }

    case 'kitchen_counter': {
      // Granite platform + under-counter cabinets
      const counter = new THREE.Mesh(
        new THREE.BoxGeometry(item.width, 0.86, item.length),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.2, clippingPlanes: planes })
      );
      counter.position.y = 0.43;
      counter.castShadow = true;
      fg.add(counter);
      break;
    }

    case 'wc': {
      const commode = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.6), whiteMat);
      commode.position.y = 0.22;
      fg.add(commode);
      break;
    }

    case 'car': {
      // Sleek SUV car representation
      const carMat = new THREE.MeshStandardMaterial({
        color: '#0284c7',
        metalness: 0.8,
        roughness: 0.2,
        clippingPlanes: planes,
      });
      const body = new THREE.Mesh(new THREE.BoxGeometry(item.width, 0.7, item.length), carMat);
      body.position.y = 0.55;
      body.castShadow = true;
      fg.add(body);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(item.width - 0.15, 0.55, item.length * 0.55),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.1, clippingPlanes: planes })
      );
      cabin.position.set(0, 1.15, -0.2);
      fg.add(cabin);
      break;
    }

    default:
      break;
  }

  parent.add(fg);
}

function buildRoofAndParapet(
  parent: THREE.Group,
  plot: PlotConfig,
  layout: FloorPlanLayout,
  concMat: THREE.Material,
  parapetMat: THREE.Material,
  glassMat: THREE.Material,
  planes: THREE.Plane[]
) {
  const roofGroup = new THREE.Group();
  roofGroup.name = 'TerraceRoof';

  const totalHeight = plot.floorCount * plot.floorHeightM;
  const bW = layout.buildableWidth;
  const bL = layout.buildableLength;
  const originX = layout.originX;
  const originZ = layout.originZ;

  // Roof Reinforced Concrete Slab (thickness 0.18m)
  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.6, 0.18, bL + 0.6), concMat);
  roofSlab.position.set(originX + bW / 2, totalHeight + 0.09, originZ + bL / 2);
  roofSlab.castShadow = true;
  roofSlab.receiveShadow = true;
  roofGroup.add(roofSlab);

  // Parapet Perimeter Walls (height 1.0m, thickness 0.15m)
  const parapetH = 1.0;
  const pThick = 0.15;
  const parapetY = totalHeight + 0.18 + parapetH / 2;

  // North Parapet
  const pNorth = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.6, parapetH, pThick), parapetMat);
  pNorth.position.set(originX + bW / 2, parapetY, originZ - 0.3 + pThick / 2);
  roofGroup.add(pNorth);

  // South Parapet
  const pSouth = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.6, parapetH, pThick), parapetMat);
  pSouth.position.set(originX + bW / 2, parapetY, originZ + bL + 0.3 - pThick / 2);
  roofGroup.add(pSouth);

  // West Parapet
  const pWest = new THREE.Mesh(new THREE.BoxGeometry(pThick, parapetH, bL + 0.6), parapetMat);
  pWest.position.set(originX - 0.3 + pThick / 2, parapetY, originZ + bL / 2);
  roofGroup.add(pWest);

  // East Parapet
  const pEast = new THREE.Mesh(new THREE.BoxGeometry(pThick, parapetH, bL + 0.6), parapetMat);
  pEast.position.set(originX + bW + 0.3 - pThick / 2, parapetY, originZ + bL / 2);
  roofGroup.add(pEast);

  // Overhead Stair Mumty / Cabin & Water Tank
  const mumtyW = 3.0;
  const mumtyL = 3.6;
  const mumtyH = 2.4;
  const mumtyMesh = new THREE.Mesh(new THREE.BoxGeometry(mumtyW, mumtyH, mumtyL), parapetMat);
  mumtyMesh.position.set(originX + mumtyW / 2 + 0.5, totalHeight + 0.18 + mumtyH / 2, originZ + mumtyL / 2 + 1.0);
  mumtyMesh.castShadow = true;
  roofGroup.add(mumtyMesh);

  parent.add(roofGroup);
}

function disposeHierarchy(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else if (mesh.material) {
        mesh.material.dispose();
      }
    }
  });
}
