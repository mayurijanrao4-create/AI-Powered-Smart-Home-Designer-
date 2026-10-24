/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Compass,
  Eye,
  LogOut,
  Maximize2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ARCHITECTURAL_THEMES } from '../../constants/defaults';
import {
  ArchitecturalStyle,
  FloorPlanLayout,
  FurnitureSpec,
  GeneratedRoom,
  PlotConfig,
} from '../../types/house';
import {
  createBacksplashTileTexture,
  createElevationMarkerTexture,
  createFabricTexture,
  createGrassTexture,
  createPaverTexture,
  createStoneCladdingTexture,
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
  explodedOffset: number; // 0 to 6 meters for Revit-style exploded axonometric
  showRoof: boolean;
  showFurniture: boolean;
  showSectionLevels?: boolean; // Revit-style elevation markers in section cut
  activeFloorFilter: number | 'all';
  lightingMode: 'day' | 'golden_hour' | 'night';
  showCeiling: boolean;
  wallOpacity: number; // 0.2 to 1.0
  teleportTargetRoomId?: string | null;
}

interface House3DViewerProps {
  plot: PlotConfig;
  layout: FloorPlanLayout;
  settings: Viewer3DSettings;
  onUpdateSettings: (newSettings: Partial<Viewer3DSettings>) => void;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  selectedFurnitureId?: string | null;
  onSelectFurniture?: (furnitureId: string | null) => void;
}

export const House3DViewer: React.FC<House3DViewerProps> = ({
  plot,
  layout,
  settings,
  onUpdateSettings,
  selectedRoomId,
  onSelectRoom,
  selectedFurnitureId,
  onSelectFurniture,
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

  // First-Person Walkthrough state
  const fpStateRef = useRef({
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    yaw: 0,
    pitch: 0,
    isDragging: false,
    prevMouseX: 0,
    prevMouseY: 0,
  });

  // Active room for walkthrough indicator
  const [currentWalkthroughRoom, setCurrentWalkthroughRoom] = useState<string>('Entrance Foyer');

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
      0.15,
      250
    );
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

    // 5. Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 6. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 2.5;
    controls.maxDistance = 100;
    controls.target.set(plot.widthM / 2, 2.5, plot.lengthM / 2);
    controlsRef.current = controls;

    // 7. Lighting Rig
    const sunLight = new THREE.DirectionalLight('#fff5e6', 2.3);
    sunLight.position.set(30, 42, 28);
    sunLight.castShadow = !isSoftwareGl;
    if (sunLight.castShadow) {
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 0.5;
      sunLight.shadow.camera.far = 130;
      sunLight.shadow.camera.left = -35;
      sunLight.shadow.camera.right = 35;
      sunLight.shadow.camera.top = 35;
      sunLight.shadow.camera.bottom = -35;
      sunLight.shadow.bias = -0.0005;
    }
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const hemiLight = new THREE.HemisphereLight('#87ceeb', '#2c3e50', 0.85);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const ambientLight = new THREE.AmbientLight('#ffffff', 0.45);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // 8. Animation & Render Loop with Walkthrough Kinematics
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // First Person Movement Processing
      if (settings.viewMode === 'first_person' && cameraRef.current) {
        const fp = fpStateRef.current;
        const cam = cameraRef.current;
        const moveSpeed = 3.6 * delta; // 3.6 meters/sec walking speed

        // Direction vectors
        const dir = new THREE.Vector3();
        cam.getWorldDirection(dir);
        dir.y = 0; // Lock to horizontal plane
        dir.normalize();

        const sideDir = new THREE.Vector3(-dir.z, 0, dir.x);

        const newPos = cam.position.clone();

        if (fp.moveForward) newPos.addScaledVector(dir, moveSpeed);
        if (fp.moveBackward) newPos.addScaledVector(dir, -moveSpeed);
        if (fp.moveLeft) newPos.addScaledVector(sideDir, -moveSpeed);
        if (fp.moveRight) newPos.addScaledVector(sideDir, moveSpeed);

        // Basic collision check against plot & building perimeter
        const minX = layout.originX + 0.3;
        const maxX = layout.originX + layout.buildableWidth - 0.3;
        const minZ = layout.originZ + 0.3;
        const maxZ = layout.originZ + layout.buildableLength - 0.3;

        // Keep inside building boundary during walkthrough
        newPos.x = Math.max(minX, Math.min(maxX, newPos.x));
        newPos.z = Math.max(minZ, Math.min(maxZ, newPos.z));

        // Lock eye level height
        const activeFloorIndex = typeof settings.activeFloorFilter === 'number' ? settings.activeFloorFilter : 0;
        newPos.y = activeFloorIndex * plot.floorHeightM + 1.65;

        cam.position.copy(newPos);
      } else if (controlsRef.current) {
        controlsRef.current.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    // 9. Resize Handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // 10. Raycasting selection on click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (e: MouseEvent) => {
      if (settings.viewMode === 'first_person') return; // Don't raycast in walkthrough mode
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      if (houseGroupRef.current) {
        const intersects = raycaster.intersectObjects(houseGroupRef.current.children, true);
        if (intersects.length > 0) {
          // Find closest room ancestor
          let current: THREE.Object3D | null = intersects[0].object;
          while (current && current !== houseGroupRef.current) {
            if (current.userData && current.userData.roomId) {
              onSelectRoom(current.userData.roomId);
              return;
            }
            current = current.parent;
          }
        }
      }
    };

    container.addEventListener('click', handleCanvasClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('click', handleCanvasClick);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Keyboard navigation for first-person walkthrough
  useEffect(() => {
    if (settings.viewMode !== 'first_person') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') fpStateRef.current.moveForward = true;
      if (key === 's' || key === 'arrowdown') fpStateRef.current.moveBackward = true;
      if (key === 'a' || key === 'arrowleft') fpStateRef.current.moveLeft = true;
      if (key === 'd' || key === 'arrowright') fpStateRef.current.moveRight = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') fpStateRef.current.moveForward = false;
      if (key === 's' || key === 'arrowdown') fpStateRef.current.moveBackward = false;
      if (key === 'a' || key === 'arrowleft') fpStateRef.current.moveLeft = false;
      if (key === 'd' || key === 'arrowright') fpStateRef.current.moveRight = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [settings.viewMode]);

  // Mouse look drag for first-person walkthrough
  useEffect(() => {
    const container = mountRef.current;
    if (!container || settings.viewMode !== 'first_person') return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        fpStateRef.current.isDragging = true;
        fpStateRef.current.prevMouseX = e.clientX;
        fpStateRef.current.prevMouseY = e.clientY;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!fpStateRef.current.isDragging || !cameraRef.current) return;
      const dx = e.clientX - fpStateRef.current.prevMouseX;
      const dy = e.clientY - fpStateRef.current.prevMouseY;

      fpStateRef.current.prevMouseX = e.clientX;
      fpStateRef.current.prevMouseY = e.clientY;

      const sensitivity = 0.003;
      const cam = cameraRef.current;

      cam.rotation.order = 'YXZ';
      cam.rotation.y -= dx * sensitivity;
      cam.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, cam.rotation.x - dy * sensitivity));
    };

    const handleMouseUp = () => {
      fpStateRef.current.isDragging = false;
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [settings.viewMode]);

  // Handle Mode Switch between Orbit and First-Person Walkthrough
  useEffect(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    const controls = controlsRef.current;
    const camera = cameraRef.current;

    if (settings.viewMode === 'first_person') {
      controls.enabled = false;

      // Find an entrance or living room to spawn in
      const spawnRoom =
        layout.rooms.find((r) => r.category === 'foyer' || r.category === 'living') ||
        layout.rooms[0];

      if (spawnRoom) {
        const targetX = layout.originX + spawnRoom.x + spawnRoom.width / 2;
        const targetZ = layout.originZ + spawnRoom.z + spawnRoom.length / 2;
        const targetY = 0.45 + spawnRoom.floorNumber * plot.floorHeightM + 1.65;

        camera.position.set(targetX, targetY, targetZ);
        camera.lookAt(targetX, targetY, targetZ + 3.0);
        setCurrentWalkthroughRoom(spawnRoom.name);
      }
    } else {
      controls.enabled = true;
      const centerX = plot.widthM / 2;
      const centerZ = plot.lengthM / 2;
      const targetY = 0.45 + (plot.floorCount * plot.floorHeightM) / 2;
      controls.target.set(centerX, targetY, centerZ);
      controls.update();
    }
  }, [settings.viewMode, layout, plot.widthM, plot.lengthM, plot.floorCount, plot.floorHeightM]);

  // Teleport to room in walkthrough
  const teleportToRoom = (room: GeneratedRoom) => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    const targetX = layout.originX + room.x + room.width / 2;
    const targetZ = layout.originZ + room.z + room.length / 2;
    const targetY = 0.45 + room.floorNumber * plot.floorHeightM + 1.65;

    cam.position.set(targetX, targetY, targetZ);
    cam.lookAt(targetX + (room.width > room.length ? 2 : 0), targetY, targetZ + 2);
    setCurrentWalkthroughRoom(room.name);
  };

  // Update Lighting Mood
  useEffect(() => {
    if (!sunLightRef.current || !hemiLightRef.current || !ambientLightRef.current || !sceneRef.current) return;
    const sun = sunLightRef.current;
    const hemi = hemiLightRef.current;
    const amb = ambientLightRef.current;
    const scene = sceneRef.current;

    if (settings.lightingMode === 'day') {
      sun.color.set('#fff5e6');
      sun.intensity = 2.3;
      sun.position.set(30, 42, 28);
      hemi.color.set('#87ceeb');
      hemi.groundColor.set('#2c3e50');
      hemi.intensity = 0.85;
      amb.intensity = 0.45;
      scene.background = new THREE.Color('#0b0f19');
    } else if (settings.lightingMode === 'golden_hour') {
      sun.color.set('#ff9f43');
      sun.intensity = 2.9;
      sun.position.set(38, 15, 30);
      hemi.color.set('#ffc048');
      hemi.groundColor.set('#5f27cd');
      hemi.intensity = 0.95;
      amb.intensity = 0.5;
      scene.background = new THREE.Color('#1e142b');
    } else if (settings.lightingMode === 'night') {
      sun.color.set('#34495e');
      sun.intensity = 0.35;
      sun.position.set(20, 30, -20);
      hemi.color.set('#1a252f');
      hemi.groundColor.set('#000000');
      hemi.intensity = 0.4;
      amb.intensity = 0.28;
      scene.background = new THREE.Color('#030712');
    }
  }, [settings.lightingMode]);

  // Update Clipping Planes for Section Cutaways
  useEffect(() => {
    const planes: THREE.Plane[] = [];

    if (settings.sectionCutMode === 'horizontal') {
      planes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), settings.sectionCutHeight));
    } else if (settings.sectionCutMode === 'vertical_x') {
      planes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), settings.sectionCutX));
    } else if (settings.sectionCutMode === 'vertical_z') {
      planes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), settings.sectionCutZ));
    }

    clippingPlanesRef.current = planes;

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
    if (!cameraRef.current || !controlsRef.current || settings.viewMode === 'first_person') return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const centerX = plot.widthM / 2;
    const centerZ = plot.lengthM / 2;
    const targetY = 0.45 + (plot.floorCount * plot.floorHeightM) / 2;

    controls.target.set(centerX, targetY, centerZ);

    const dist = Math.max(plot.widthM, plot.lengthM) * 1.85;

    switch (settings.cameraPreset) {
      case 'iso':
        camera.position.set(centerX + dist * 0.72, targetY + dist * 0.72, centerZ + dist * 0.72);
        break;
      case 'top':
        camera.position.set(centerX, targetY + dist * 1.5, centerZ + 0.01);
        break;
      case 'front':
        camera.position.set(centerX, targetY + 1.2, centerZ + dist);
        break;
      case 'rear':
        camera.position.set(centerX, targetY + 1.2, centerZ - dist);
        break;
      case 'left':
        camera.position.set(centerX - dist, targetY + 1.2, centerZ);
        break;
      case 'right':
        camera.position.set(centerX + dist, targetY + 1.2, centerZ);
        break;
    }
    camera.lookAt(centerX, targetY, centerZ);
    controls.update();
  }, [settings.cameraPreset, settings.viewMode, plot.widthM, plot.lengthM, plot.floorCount, plot.floorHeightM]);

  // Build 3D House Geometry
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (houseGroupRef.current) {
      scene.remove(houseGroupRef.current);
      disposeHierarchy(houseGroupRef.current);
      houseGroupRef.current = null;
    }

    const houseGroup = new THREE.Group();
    houseGroup.name = 'HouseRoot';

    const currentStyle = layout.facadeStyle || plot.architecturalStyle;
    const theme = ARCHITECTURAL_THEMES[currentStyle] || ARCHITECTURAL_THEMES.contemporary_indian;

    // Procedural textures
    const woodTex = createWoodTexture();
    const tileTex = createTileTexture(theme.floorTileColor);
    const stoneTex = createStoneCladdingTexture();
    const grassTex = createGrassTexture();
    const paverTex = createPaverTexture();
    const fabricTex = createFabricTexture();
    const backsplashTex = createBacksplashTileTexture();

    // Shared Materials
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

    const stoneCladMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      roughness: 0.75,
      metalness: 0.1,
      clippingPlanes: clippingPlanesRef.current,
    });

    const floorTileMat = new THREE.MeshStandardMaterial({
      map: tileTex,
      roughness: 0.25,
      metalness: 0.1,
      clippingPlanes: clippingPlanesRef.current,
    });

    const woodTrimMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.4,
      metalness: 0.05,
      clippingPlanes: clippingPlanesRef.current,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: theme.glassColor,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.15,
      transmission: isSoftwareGlState ? 0 : 0.85,
      ior: 1.5,
      clippingPlanes: clippingPlanesRef.current,
    });

    const concreteMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      roughness: 0.88,
      metalness: 0.1,
      clippingPlanes: clippingPlanesRef.current,
    });

    const plinthMat = new THREE.MeshStandardMaterial({
      color: '#272d37',
      roughness: 0.9,
      metalness: 0.12,
      clippingPlanes: clippingPlanesRef.current,
    });

    const columnMat = new THREE.MeshStandardMaterial({
      color: theme.accentWallColor || '#334155',
      roughness: 0.75,
      metalness: 0.15,
      clippingPlanes: clippingPlanesRef.current,
    });

    const ceilingMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.92,
      metalness: 0.02,
      clippingPlanes: clippingPlanesRef.current,
    });

    const backsplashMat = new THREE.MeshStandardMaterial({
      map: backsplashTex,
      roughness: 0.2,
      metalness: 0.05,
      clippingPlanes: clippingPlanesRef.current,
    });

    // 1. Build Plot Landscape (Compound wall, gates, pavers, trees)
    buildPlotLandscape(houseGroup, plot, grassTex, paverTex, concreteMat, clippingPlanesRef.current);

    // 2. Build Plinth Foundation & Front Steps (+0.45m step-up from ground level)
    const PLINTH_H = 0.45;
    buildPlinthAndSteps(houseGroup, plot, layout, plinthMat, stoneCladMat, concreteMat, clippingPlanesRef.current);

    // 3. Build Floor by Floor with Exploded Axonometric offset
    const flCount = plot.floorCount;
    for (let f = 0; f < flCount; f++) {
      if (settings.activeFloorFilter !== 'all' && settings.activeFloorFilter !== f) {
        continue;
      }

      const floorRooms = layout.rooms.filter((r) => r.floorNumber === f);
      // Exploded Axonometric Lift: each higher floor lifts up by f * explodedOffset
      const floorElevationY = PLINTH_H + f * plot.floorHeightM + f * settings.explodedOffset;

      const floorGroup = new THREE.Group();
      floorGroup.name = `Floor_${f}`;
      floorGroup.position.set(0, floorElevationY, 0);

      // Floor Plinth / Structural Slab
      const slabGeo = new THREE.BoxGeometry(layout.buildableWidth, 0.18, layout.buildableLength);
      const slabMesh = new THREE.Mesh(slabGeo, floorTileMat);
      slabMesh.position.set(
        layout.originX + layout.buildableWidth / 2,
        0.09,
        layout.originZ + layout.buildableLength / 2
      );
      slabMesh.receiveShadow = true;
      floorGroup.add(slabMesh);

      // Structural RCC Columns (corner pillars and wall junctions)
      buildStructuralColumns(floorGroup, floorRooms, layout, plot.floorHeightM, columnMat, clippingPlanesRef.current);

      // Room Partitions, Realistic Furniture, Doors & Windows
      floorRooms.forEach((room) => {
        build3DRoom(
          floorGroup,
          room,
          layout,
          plot.floorHeightM,
          wallExtMat,
          wallIntMat,
          stoneCladMat,
          woodTrimMat,
          glassMat,
          fabricTex,
          backsplashMat,
          ceilingMat,
          settings.showFurniture,
          settings.showCeiling,
          clippingPlanesRef.current,
          room.id === selectedRoomId
        );
      });

      // Staircase core
      if (f < flCount - 1) {
        const stairRoom = floorRooms.find((r) => r.category === 'staircase');
        if (stairRoom) {
          build3DStaircase(floorGroup, stairRoom, layout, plot.floorHeightM, woodTrimMat, concreteMat, clippingPlanesRef.current);
        }
      }

      houseGroup.add(floorGroup);
    }

    // 4. Roof / Terrace Parapet Slab with Exploded Lift & Water Tank
    if (settings.showRoof && (settings.activeFloorFilter === 'all' || settings.activeFloorFilter === flCount - 1)) {
      const roofElevationY = (flCount) * settings.explodedOffset;
      buildRoofAndParapet(houseGroup, plot, layout, concreteMat, wallExtMat, glassMat, clippingPlanesRef.current, roofElevationY, PLINTH_H);
    }

    // 5. Autodesk Revit-style Architectural Section Elevation Markers & Datum Lines
    if (settings.sectionCutMode !== 'none' || settings.showSectionLevels) {
      buildSectionElevationMarkers(houseGroup, plot, layout, settings, PLINTH_H);
    }

    scene.add(houseGroup);
    houseGroupRef.current = houseGroup;
  }, [
    plot,
    layout,
    settings.wallOpacity,
    settings.showFurniture,
    settings.showRoof,
    settings.showCeiling,
    settings.showSectionLevels,
    settings.activeFloorFilter,
    settings.explodedOffset,
    settings.sectionCutMode,
    settings.sectionCutHeight,
    settings.sectionCutX,
    settings.sectionCutZ,
    selectedRoomId,
    isSoftwareGlState,
  ]);

  // Capture Screenshot
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
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating Badge */}
      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 shadow-xl z-20 text-xs">
        <span className={`w-2.5 h-2.5 rounded-full ${settings.viewMode === 'first_person' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
        <span className="font-bold text-white">
          {settings.viewMode === 'first_person' ? 'First-Person Walkthrough' : '360° BIM Model View'}
        </span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">
          Design: <span className="text-amber-400 font-semibold">{layout.layoutVariantName}</span>
        </span>
        {settings.viewMode === 'first_person' && (
          <>
            <span className="text-slate-500">|</span>
            <span className="text-emerald-300 font-medium">Inside: {currentWalkthroughRoom}</span>
          </>
        )}
      </div>

      {/* Top Right Actions */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        {settings.viewMode === 'first_person' ? (
          <button
            onClick={() => onUpdateSettings({ viewMode: 'orbit' })}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xl transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Exit Walkthrough (Esc)
          </button>
        ) : (
          <>
            <button
              onClick={() => onUpdateSettings({ viewMode: 'first_person' })}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-xl transition"
              title="Enter first-person eye-level interior walkthrough"
            >
              <Eye className="w-3.5 h-3.5" /> Walkthrough Mode
            </button>
            <button
              onClick={takeScreenshot}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold shadow-xl transition"
            >
              📷 Render
            </button>
          </>
        )}
      </div>

      {/* First-Person Walkthrough HUD Overlay */}
      {settings.viewMode === 'first_person' && (
        <>
          {/* Quick Room Teleport Bar (Floating at Top-Center) */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 max-w-[90vw] overflow-x-auto flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-2xl z-20">
            <span className="text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider">
              Teleport to:
            </span>
            {layout.rooms.slice(0, 8).map((room) => (
              <button
                key={room.id}
                onClick={() => teleportToRoom(room)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  currentWalkthroughRoom === room.name
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800/80'
                }`}
              >
                {room.name}
              </button>
            ))}
          </div>

          {/* Desktop Keyboard Helper Badge */}
          <div className="hidden sm:flex absolute bottom-24 left-6 bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-300 z-20 space-y-1 shadow-2xl">
            <div className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" /> Walkthrough Controls
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              [W, A, S, D] or Arrow Keys: Walk
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Click & Drag Mouse: Look around
            </div>
          </div>

          {/* Mobile On-Screen Touch D-Pad */}
          <div className="sm:hidden absolute bottom-20 left-4 z-20 flex flex-col items-center gap-1 bg-slate-900/90 p-2 rounded-2xl border border-slate-800 backdrop-blur-md shadow-2xl">
            <button
              onMouseDown={() => (fpStateRef.current.moveForward = true)}
              onMouseUp={() => (fpStateRef.current.moveForward = false)}
              onTouchStart={() => (fpStateRef.current.moveForward = true)}
              onTouchEnd={() => (fpStateRef.current.moveForward = false)}
              className="p-3 bg-slate-800 active:bg-amber-500 text-white rounded-xl shadow"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              <button
                onMouseDown={() => (fpStateRef.current.moveLeft = true)}
                onMouseUp={() => (fpStateRef.current.moveLeft = false)}
                onTouchStart={() => (fpStateRef.current.moveLeft = true)}
                onTouchEnd={() => (fpStateRef.current.moveLeft = false)}
                className="p-3 bg-slate-800 active:bg-amber-500 text-white rounded-xl shadow"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onMouseDown={() => (fpStateRef.current.moveBackward = true)}
                onMouseUp={() => (fpStateRef.current.moveBackward = false)}
                onTouchStart={() => (fpStateRef.current.moveBackward = true)}
                onTouchEnd={() => (fpStateRef.current.moveBackward = false)}
                className="p-3 bg-slate-800 active:bg-amber-500 text-white rounded-xl shadow"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
              <button
                onMouseDown={() => (fpStateRef.current.moveRight = true)}
                onMouseUp={() => (fpStateRef.current.moveRight = false)}
                onTouchStart={() => (fpStateRef.current.moveRight = true)}
                onTouchEnd={() => (fpStateRef.current.moveRight = false)}
                className="p-3 bg-slate-800 active:bg-amber-500 text-white rounded-xl shadow"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
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
  const plotGeo = new THREE.BoxGeometry(pW + 8, 0.25, pL + 8);
  const plotMesh = new THREE.Mesh(plotGeo, grassMat);
  plotMesh.position.set(pW / 2, -0.125, pL / 2);
  plotMesh.receiveShadow = true;
  group.add(plotMesh);

  // Driveway / Setback Paving
  const driveMat = new THREE.MeshStandardMaterial({
    map: paverTex,
    roughness: 0.8,
    metalness: 0.1,
    clippingPlanes: planes,
  });
  const driveGeo = new THREE.BoxGeometry(pW, 0.03, pL);
  const driveMesh = new THREE.Mesh(driveGeo, driveMat);
  driveMesh.position.set(pW / 2, 0.015, pL / 2);
  driveMesh.receiveShadow = true;
  group.add(driveMesh);

  // Compound Wall (Height 1.5m, Thickness 0.2m)
  const wallH = 1.45;
  const wallThick = 0.2;
  const compMat = new THREE.MeshStandardMaterial({
    color: '#64748b',
    roughness: 0.85,
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

  // Front boundary with Gate Opening & Entrance Pillars
  const gateW = 3.8;
  const frontSegmentW = (pW - gateW) / 2;
  const fWall1 = new THREE.Mesh(new THREE.BoxGeometry(frontSegmentW, wallH, wallThick), compMat);
  fWall1.position.set(frontSegmentW / 2, wallH / 2, wallThick / 2);
  group.add(fWall1);

  const fWall2 = new THREE.Mesh(new THREE.BoxGeometry(frontSegmentW, wallH, wallThick), compMat);
  fWall2.position.set(pW - frontSegmentW / 2, wallH / 2, wallThick / 2);
  group.add(fWall2);

  // Gate Pillars with Lamp Tops
  const pillarGeo = new THREE.BoxGeometry(0.45, 1.8, 0.45);
  const pillarMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.7, clippingPlanes: planes });
  const p1 = new THREE.Mesh(pillarGeo, pillarMat);
  p1.position.set(frontSegmentW, 0.9, wallThick / 2);
  group.add(p1);

  const p2 = new THREE.Mesh(pillarGeo, pillarMat);
  p2.position.set(frontSegmentW + gateW, 0.9, wallThick / 2);
  group.add(p2);

  // Decorative Landscaping: 3D Foliage Trees in garden corners
  add3DTree(group, 1.5, 1.5, planes);
  add3DTree(group, pW - 1.5, 1.5, planes);
}

function add3DTree(parent: THREE.Group, x: number, z: number, planes: THREE.Plane[]) {
  const treeGroup = new THREE.Group();
  treeGroup.position.set(x, 0, z);

  // Trunk
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 1.4, 8),
    new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.9, clippingPlanes: planes })
  );
  trunk.position.y = 0.7;
  trunk.castShadow = true;
  treeGroup.add(trunk);

  // Canopy Spheres
  const foliageMat = new THREE.MeshStandardMaterial({ color: '#2d6a4f', roughness: 0.8, clippingPlanes: planes });
  const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), foliageMat);
  c1.position.y = 1.8;
  c1.castShadow = true;
  treeGroup.add(c1);

  const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 8), foliageMat);
  c2.position.set(0.3, 2.3, 0.2);
  treeGroup.add(c2);

  parent.add(treeGroup);
}

function buildPlinthAndSteps(
  group: THREE.Group,
  plot: PlotConfig,
  layout: FloorPlanLayout,
  plinthMat: THREE.Material,
  stoneMat: THREE.Material,
  concMat: THREE.Material,
  planes: THREE.Plane[]
) {
  const plinthGroup = new THREE.Group();
  plinthGroup.name = 'PlinthFoundation';

  const bW = layout.buildableWidth;
  const bL = layout.buildableLength;
  const oX = layout.originX;
  const oZ = layout.originZ;
  const plinthH = 0.45;

  // 1. Plinth Beam Foundation Solid Core (y: 0 to 0.45m)
  const plinthGeo = new THREE.BoxGeometry(bW + 0.16, plinthH, bL + 0.16);
  const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
  plinthMesh.position.set(oX + bW / 2, plinthH / 2, oZ + bL / 2);
  plinthMesh.receiveShadow = true;
  plinthMesh.castShadow = true;
  plinthGroup.add(plinthMesh);

  // 2. Projecting Stone Coping Band around top edge of plinth
  const copingGeo = new THREE.BoxGeometry(bW + 0.28, 0.05, bL + 0.28);
  const copingMesh = new THREE.Mesh(copingGeo, stoneMat);
  copingMesh.position.set(oX + bW / 2, plinthH - 0.025, oZ + bL / 2);
  plinthGroup.add(copingMesh);

  // 3. Front Entrance Steps (3-tier civil steps leading from ground to +0.45m plinth)
  const stepW = Math.min(2.8, bW * 0.45);
  const stepRise = 0.15;
  const stepTread = 0.32;
  const stepZOffset = oZ + bL + 0.08;
  const stepCenterX = oX + bW * 0.4;

  const stepMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.8,
    metalness: 0.15,
    clippingPlanes: planes,
  });

  // Step 1 (lowest, extends furthest)
  const s1 = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepRise, stepTread * 3), stepMat);
  s1.position.set(stepCenterX, stepRise / 2, stepZOffset + (stepTread * 3) / 2);
  s1.receiveShadow = true;
  plinthGroup.add(s1);

  // Step 2 (middle)
  const s2 = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepRise * 2, stepTread * 2), stepMat);
  s2.position.set(stepCenterX, (stepRise * 2) / 2, stepZOffset + (stepTread * 2) / 2);
  s2.receiveShadow = true;
  plinthGroup.add(s2);

  // Step 3 (top landing)
  const s3 = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepRise * 3, stepTread), stepMat);
  s3.position.set(stepCenterX, (stepRise * 3) / 2, stepZOffset + stepTread / 2);
  s3.receiveShadow = true;
  plinthGroup.add(s3);

  group.add(plinthGroup);
}

function buildStructuralColumns(
  floorGroup: THREE.Group,
  rooms: GeneratedRoom[],
  layout: FloorPlanLayout,
  floorHeight: number,
  columnMat: THREE.Material,
  planes: THREE.Plane[]
) {
  const colGroup = new THREE.Group();
  colGroup.name = 'StructuralColumns';

  const colSize = 0.26;
  const colGeo = new THREE.BoxGeometry(colSize, floorHeight, colSize);

  // Placed at perimeter corners and room intersections
  const columnPoints: Array<[number, number]> = [];
  const bW = layout.buildableWidth;
  const bL = layout.buildableLength;
  const oX = layout.originX;
  const oZ = layout.originZ;

  // Exterior corners
  columnPoints.push([oX, oZ]);
  columnPoints.push([oX + bW, oZ]);
  columnPoints.push([oX, oZ + bL]);
  columnPoints.push([oX + bW, oZ + bL]);

  // Major interior junctions
  rooms.forEach((r) => {
    columnPoints.push([oX + r.x, oZ + r.z]);
    columnPoints.push([oX + r.x + r.width, oZ + r.z + r.length]);
  });

  // Deduplicate points within 0.5m
  const uniquePoints: Array<[number, number]> = [];
  columnPoints.forEach(([px, pz]) => {
    const exists = uniquePoints.some(([ux, uz]) => Math.hypot(ux - px, uz - pz) < 0.4);
    if (!exists) uniquePoints.push([px, pz]);
  });

  uniquePoints.forEach(([cx, cz]) => {
    const col = new THREE.Mesh(colGeo, columnMat);
    col.position.set(cx, floorHeight / 2, cz);
    col.castShadow = true;
    col.receiveShadow = true;
    colGroup.add(col);
  });

  floorGroup.add(colGroup);
}

function build3DRoom(
  parent: THREE.Group,
  room: GeneratedRoom,
  layout: FloorPlanLayout,
  wallHeight: number,
  wallExtMat: THREE.Material,
  wallIntMat: THREE.Material,
  stoneCladMat: THREE.Material,
  woodTrimMat: THREE.Material,
  glassMat: THREE.Material,
  fabricTex: THREE.CanvasTexture,
  backsplashMat: THREE.Material,
  ceilingMat: THREE.Material,
  showFurniture: boolean,
  showCeiling: boolean,
  planes: THREE.Plane[],
  isSelected: boolean
) {
  const roomGroup = new THREE.Group();
  roomGroup.name = `Room_${room.name}`;
  roomGroup.userData = { roomId: room.id, name: room.name, category: room.category };

  const rx = layout.originX + room.x;
  const rz = layout.originZ + room.z;
  const rw = room.width;
  const rl = room.length;
  const wallThick = 0.2;

  // Selected highlight bounding contour
  if (isSelected) {
    const selBoxGeo = new THREE.BoxGeometry(rw, 0.06, rl);
    const selMat = new THREE.MeshBasicMaterial({ color: '#f59e0b', wireframe: true });
    const selMesh = new THREE.Mesh(selBoxGeo, selMat);
    selMesh.position.set(rx + rw / 2, 0.06, rz + rl / 2);
    roomGroup.add(selMesh);
  }

  // Underside Ceiling Slab with warm recessed downlight spotlight fixture
  if (showCeiling) {
    const ceilGeo = new THREE.BoxGeometry(rw, 0.04, rl);
    const ceilMesh = new THREE.Mesh(ceilGeo, ceilingMat);
    ceilMesh.position.set(rx + rw / 2, wallHeight - 0.02, rz + rl / 2);
    roomGroup.add(ceilMesh);

    // Warm LED recessed downlight at room ceiling center
    const spotGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 12);
    const spotMat = new THREE.MeshStandardMaterial({
      color: '#fffbeb',
      emissive: '#fef08a',
      emissiveIntensity: 0.6,
      clippingPlanes: planes,
    });
    const spotMesh = new THREE.Mesh(spotGeo, spotMat);
    spotMesh.position.set(rx + rw / 2, wallHeight - 0.04, rz + rl / 2);
    roomGroup.add(spotMesh);
  }

  // 1. Enclosing Walls with Openings
  // North Wall
  buildWallSegment(
    roomGroup,
    rx,
    rz,
    rx + rw,
    rz,
    wallHeight,
    wallThick,
    rz <= 0.05 ? stoneCladMat : wallExtMat,
    room.doors.filter((d) => d.wallSide === 'north'),
    room.windows.filter((w) => w.wallSide === 'north'),
    woodTrimMat,
    glassMat,
    fabricTex
  );

  // South Wall
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
    glassMat,
    fabricTex
  );

  // West Wall
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
    glassMat,
    fabricTex
  );

  // East Wall
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
    glassMat,
    fabricTex
  );

  // 2. Realistic Interior Furnishings
  if (showFurniture && room.furniture) {
    room.furniture.forEach((item) => {
      buildRealisticFurnitureItem(roomGroup, item, rx + rw / 2, rz + rl / 2, woodTrimMat, glassMat, fabricTex, backsplashMat, planes, wallHeight);
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
  glassMat: THREE.Material,
  fabricTex: THREE.CanvasTexture
) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.1) return;

  const angle = Math.atan2(dz, dx);
  const midX = (x1 + x2) / 2;
  const midZ = (z1 + z2) / 2;

  const hasDoor = doors.length > 0;
  const hasWindow = windows.length > 0;

  // Door Hardware Material
  const handleMat = new THREE.MeshStandardMaterial({
    color: '#d4af37', // brushed brass
    metalness: 0.9,
    roughness: 0.2,
  });

  // Dark aluminium frame material for windows
  const winFrameMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    metalness: 0.7,
    roughness: 0.3,
  });

  // Sill stone material
  const sillStoneMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.6,
    metalness: 0.2,
  });

  if (hasDoor) {
    const door = doors[0];
    const doorW = door.width;
    const doorH = door.height;
    const doorPos = door.position;

    // Left wall section
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

    // Door Sub-assembly (Architrave casing + Leaf + Brass Lever Handle)
    const doorGroup = new THREE.Group();
    doorGroup.position.set(midX - len / 2 + doorPos + doorW / 2, 0, midZ);
    doorGroup.rotation.y = -angle;

    // Timber Architrave Casing (3-sided outer moulding)
    const architraveThick = 0.05;
    const casingL = new THREE.Mesh(new THREE.BoxGeometry(architraveThick, doorH, thickness + 0.02), woodMat);
    casingL.position.set(-doorW / 2 + architraveThick / 2, doorH / 2, 0);
    doorGroup.add(casingL);

    const casingR = new THREE.Mesh(new THREE.BoxGeometry(architraveThick, doorH, thickness + 0.02), woodMat);
    casingR.position.set(doorW / 2 - architraveThick / 2, doorH / 2, 0);
    doorGroup.add(casingR);

    const casingTop = new THREE.Mesh(new THREE.BoxGeometry(doorW, architraveThick, thickness + 0.02), woodMat);
    casingTop.position.set(0, doorH - architraveThick / 2, 0);
    doorGroup.add(casingTop);

    // Door Leaf with recessed panel grooves
    const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.08, doorH - 0.06, 0.045), woodMat);
    doorLeaf.position.set(0, doorH / 2, 0);
    doorLeaf.castShadow = true;
    doorGroup.add(doorLeaf);

    // Modern horizontal groove lines on door leaf
    for (let g = 0; g < 3; g++) {
      const groove = new THREE.Mesh(
        new THREE.BoxGeometry(doorW - 0.16, 0.015, 0.048),
        new THREE.MeshStandardMaterial({ color: '#1a1008', roughness: 0.5 })
      );
      groove.position.set(0, doorH * 0.3 + g * 0.28, 0);
      doorGroup.add(groove);
    }

    // Brass Lever Handle + Escutcheon backplate (on both sides)
    const plateGeo = new THREE.BoxGeometry(0.04, 0.16, 0.055);
    const plate = new THREE.Mesh(plateGeo, handleMat);
    plate.position.set(doorW * 0.32, 1.0, 0);
    doorGroup.add(plate);

    const leverGeo = new THREE.BoxGeometry(0.12, 0.02, 0.08);
    const lever = new THREE.Mesh(leverGeo, handleMat);
    lever.position.set(doorW * 0.32 - 0.04, 1.0, 0);
    doorGroup.add(lever);

    parent.add(doorGroup);

    // Right wall section
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

    // Wall Below window
    const sillWall = new THREE.Mesh(new THREE.BoxGeometry(winW, sillH, thickness), wallMat);
    sillWall.position.set(midX, sillH / 2, midZ);
    sillWall.rotation.y = -angle;
    parent.add(sillWall);

    // Lintel Wall above window
    const lintelH = height - (sillH + winH);
    if (lintelH > 0) {
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(winW, lintelH, thickness), wallMat);
      lintel.position.set(midX, sillH + winH + lintelH / 2, midZ);
      lintel.rotation.y = -angle;
      parent.add(lintel);
    }

    // Window Assembly Group
    const winGroup = new THREE.Group();
    winGroup.position.set(midX, 0, midZ);
    winGroup.rotation.y = -angle;

    // Exterior Projecting Stone Window Sill (with weather drip overhang)
    const sillProj = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.14, 0.05, thickness + 0.1), sillStoneMat);
    sillProj.position.set(0, sillH + 0.025, 0.02);
    sillProj.castShadow = true;
    winGroup.add(sillProj);

    // Outer Dark Aluminium Frame
    const fThick = 0.045;
    // Left & Right frame jambs
    const fL = new THREE.Mesh(new THREE.BoxGeometry(fThick, winH, thickness), winFrameMat);
    fL.position.set(-winW / 2 + fThick / 2, sillH + winH / 2, 0);
    winGroup.add(fL);

    const fR = new THREE.Mesh(new THREE.BoxGeometry(fThick, winH, thickness), winFrameMat);
    fR.position.set(winW / 2 - fThick / 2, sillH + winH / 2, 0);
    winGroup.add(fR);

    // Top & Bottom frame rails
    const fTop = new THREE.Mesh(new THREE.BoxGeometry(winW, fThick, thickness), winFrameMat);
    fTop.position.set(0, sillH + winH - fThick / 2, 0);
    winGroup.add(fTop);

    const fBot = new THREE.Mesh(new THREE.BoxGeometry(winW, fThick, thickness), winFrameMat);
    fBot.position.set(0, sillH + fThick / 2, 0);
    winGroup.add(fBot);

    // Center Vertical Mullion (divides window in 2 vertical halves)
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.035, winH, thickness * 0.9), winFrameMat);
    mullion.position.set(0, sillH + winH / 2, 0);
    winGroup.add(mullion);

    // Horizontal Transom Bar (top ventilator pane line)
    const transom = new THREE.Mesh(new THREE.BoxGeometry(winW, 0.03, thickness * 0.9), winFrameMat);
    transom.position.set(0, sillH + winH * 0.72, 0);
    winGroup.add(transom);

    // High Specular Glass Glazing Pane
    const glass = new THREE.Mesh(new THREE.BoxGeometry(winW - 0.08, winH - 0.08, 0.024), glassMat);
    glass.position.set(0, sillH + winH / 2, 0);
    winGroup.add(glass);

    // Interior Draped Curtains (soft fabric drapes on sides of window)
    const curtainMat = new THREE.MeshStandardMaterial({
      map: fabricTex,
      roughness: 0.9,
      color: '#e2e8f0',
    });
    const curW = 0.22;
    const curH = winH * 1.05;
    const cL = new THREE.Mesh(new THREE.BoxGeometry(curW, curH, 0.05), curtainMat);
    cL.position.set(-winW / 2 + curW / 2, sillH + winH / 2, -thickness / 2 - 0.03);
    winGroup.add(cL);

    const cR = new THREE.Mesh(new THREE.BoxGeometry(curW, curH, 0.05), curtainMat);
    cR.position.set(winW / 2 - curW / 2, sillH + winH / 2, -thickness / 2 - 0.03);
    winGroup.add(cR);

    parent.add(winGroup);

    // Side walls
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

  // Flight 1
  for (let i = 0; i < 8; i++) {
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(stepW, riserH * (i + 1), treadL), woodMat);
    stepMesh.position.set(rx + stepW / 2, (riserH * (i + 1)) / 2, rz + i * treadL + treadL / 2);
    stepMesh.castShadow = true;
    stairGroup.add(stepMesh);
  }

  // Mid landing
  const landingMesh = new THREE.Mesh(
    new THREE.BoxGeometry(stairRoom.width, 0.15, stairRoom.length * 0.25),
    concMat
  );
  landingMesh.position.set(rx + stairRoom.width / 2, floorHeight / 2, rz + stairRoom.length * 0.85);
  stairGroup.add(landingMesh);

  parent.add(stairGroup);
}

function buildRealisticFurnitureItem(
  parent: THREE.Group,
  item: FurnitureSpec,
  centerX: number,
  centerZ: number,
  woodMat: THREE.Material,
  glassMat: THREE.Material,
  fabricTex: THREE.CanvasTexture,
  backsplashMat: THREE.Material,
  planes: THREE.Plane[],
  wallHeight = 3.0
) {
  const fg = new THREE.Group();
  fg.position.set(centerX + item.x, 0, centerZ + item.z);
  fg.rotation.y = (item.rotation * Math.PI) / 180;
  fg.userData = { furnitureId: item.id, type: item.type, name: item.name };

  const fabricMat = new THREE.MeshStandardMaterial({
    map: fabricTex,
    roughness: 0.85,
    metalness: 0.02,
    clippingPlanes: planes,
  });

  const whiteMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.3,
    metalness: 0.05,
    clippingPlanes: planes,
  });

  const metallicMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.25,
    metalness: 0.88,
    clippingPlanes: planes,
  });

  const darkCabinetMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.3,
    metalness: 0.2,
    clippingPlanes: planes,
  });

  switch (item.type) {
    case 'bed': {
      // 1. Solid Wood/Upholstered bed frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(item.width, 0.32, item.length), woodMat);
      frame.position.y = 0.16;
      frame.castShadow = true;
      fg.add(frame);

      // 2. Tufted Headboard
      const headboard = new THREE.Mesh(new THREE.BoxGeometry(item.width, 1.25, 0.14), fabricMat);
      headboard.position.set(0, 0.625, -item.length / 2 + 0.07);
      headboard.castShadow = true;
      fg.add(headboard);

      // 3. Mattress with folded duvet quilt
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(item.width - 0.12, 0.24, item.length - 0.16), whiteMat);
      mattress.position.set(0, 0.44, 0.06);
      fg.add(mattress);

      const duvet = new THREE.Mesh(
        new THREE.BoxGeometry(item.width - 0.1, 0.08, (item.length - 0.2) * 0.65),
        fabricMat
      );
      duvet.position.set(0, 0.58, item.length * 0.15);
      fg.add(duvet);

      // 4. Twin Pillows
      const pGeo = new THREE.BoxGeometry(item.width * 0.38, 0.12, 0.42);
      const pillow1 = new THREE.Mesh(pGeo, whiteMat);
      pillow1.position.set(-item.width * 0.24, 0.62, -item.length / 2 + 0.36);
      fg.add(pillow1);
      const pillow2 = new THREE.Mesh(pGeo, whiteMat);
      pillow2.position.set(item.width * 0.24, 0.62, -item.length / 2 + 0.36);
      fg.add(pillow2);

      // 5. Twin Bedside Nightstands with mini glowing table lamps
      const nW = 0.48;
      const nD = 0.42;
      const nH = 0.48;
      [-item.width / 2 - nW / 2 - 0.06, item.width / 2 + nW / 2 + 0.06].forEach((nx) => {
        const stand = new THREE.Mesh(new THREE.BoxGeometry(nW, nH, nD), woodMat);
        stand.position.set(nx, nH / 2, -item.length / 2 + nD / 2);
        stand.castShadow = true;
        fg.add(stand);

        // Lamp base + shade
        const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 12), metallicMat);
        lampBase.position.set(nx, nH + 0.1, -item.length / 2 + nD / 2);
        fg.add(lampBase);

        const shade = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.15, 0.16, 12),
          new THREE.MeshStandardMaterial({ color: '#fef08a', emissive: '#fef08a', emissiveIntensity: 0.5 })
        );
        shade.position.set(nx, nH + 0.28, -item.length / 2 + nD / 2);
        fg.add(shade);
      });
      break;
    }

    case 'sofa': {
      // Modern L-Sectional Sofa
      const base = new THREE.Mesh(new THREE.BoxGeometry(item.width, 0.42, item.length), fabricMat);
      base.position.y = 0.21;
      base.castShadow = true;
      fg.add(base);

      const back = new THREE.Mesh(new THREE.BoxGeometry(item.width, 0.82, 0.24), fabricMat);
      back.position.set(0, 0.52, -item.length / 2 + 0.12);
      fg.add(back);

      // Armrests
      const armGeo = new THREE.BoxGeometry(0.2, 0.62, item.length);
      const armL = new THREE.Mesh(armGeo, fabricMat);
      armL.position.set(-item.width / 2 + 0.1, 0.38, 0);
      fg.add(armL);
      const armR = new THREE.Mesh(armGeo, fabricMat);
      armR.position.set(item.width / 2 - 0.1, 0.38, 0);
      fg.add(armR);

      // Throw Cushions
      const cushionMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.8 });
      [-item.width * 0.28, item.width * 0.28].forEach((cx) => {
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.12), cushionMat);
        cushion.position.set(cx, 0.55, -item.length / 2 + 0.28);
        cushion.rotation.x = -0.15;
        fg.add(cushion);
      });

      // Low-profile Center Coffee Table
      const coffeeTable = new THREE.Mesh(
        new THREE.BoxGeometry(Math.min(1.2, item.width * 0.6), 0.36, 0.6),
        darkCabinetMat
      );
      coffeeTable.position.set(0, 0.18, item.length / 2 + 0.6);
      coffeeTable.castShadow = true;
      fg.add(coffeeTable);
      break;
    }

    case 'armchair': {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.42, 0.8), fabricMat);
      seat.position.y = 0.21;
      fg.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.82, 0.2), fabricMat);
      back.position.set(0, 0.52, -0.3);
      fg.add(back);
      break;
    }

    case 'dining_table': {
      // 6-Seater Table Top (wood / marble)
      const top = new THREE.Mesh(new THREE.BoxGeometry(item.width, 0.06, item.length), woodMat);
      top.position.y = 0.74;
      top.castShadow = true;
      fg.add(top);

      // 4 Metal Legs
      const legGeo = new THREE.BoxGeometry(0.06, 0.72, 0.06);
      [
        [-item.width / 2 + 0.08, -item.length / 2 + 0.08],
        [item.width / 2 - 0.08, -item.length / 2 + 0.08],
        [-item.width / 2 + 0.08, item.length / 2 - 0.08],
        [item.width / 2 - 0.08, item.length / 2 - 0.08],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, metallicMat);
        leg.position.set(lx, 0.36, lz);
        fg.add(leg);
      });

      // 6 Dining Chairs around the table
      const chairW = 0.45;
      const chairD = 0.45;
      const chairSeatY = 0.45;
      [-item.width * 0.3, 0, item.width * 0.3].forEach((cx) => {
        // Chair on side 1
        const c1Seat = new THREE.Mesh(new THREE.BoxGeometry(chairW, 0.04, chairD), fabricMat);
        c1Seat.position.set(cx, chairSeatY, -item.length / 2 - 0.28);
        fg.add(c1Seat);
        const c1Back = new THREE.Mesh(new THREE.BoxGeometry(chairW, 0.42, 0.04), woodMat);
        c1Back.position.set(cx, chairSeatY + 0.21, -item.length / 2 - 0.5);
        fg.add(c1Back);

        // Chair on side 2
        const c2Seat = new THREE.Mesh(new THREE.BoxGeometry(chairW, 0.04, chairD), fabricMat);
        c2Seat.position.set(cx, chairSeatY, item.length / 2 + 0.28);
        fg.add(c2Seat);
        const c2Back = new THREE.Mesh(new THREE.BoxGeometry(chairW, 0.42, 0.04), woodMat);
        c2Back.position.set(cx, chairSeatY + 0.21, item.length / 2 + 0.5);
        fg.add(c2Back);
      });

      // Suspended Modern Pendant Lamp over dining table
      const pendantCord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.9, 8), metallicMat);
      pendantCord.position.set(0, 2.1, 0);
      fg.add(pendantCord);
      const pendantShade = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.22, 16),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.3, metalness: 0.8 })
      );
      pendantShade.position.set(0, 1.6, 0);
      fg.add(pendantShade);
      break;
    }

    case 'kitchen_counter': {
      // 1. Lower Cabinets & Platform
      const counter = new THREE.Mesh(new THREE.BoxGeometry(item.width, 0.86, item.length), darkCabinetMat);
      counter.position.y = 0.43;
      counter.castShadow = true;
      fg.add(counter);

      // Counter Top Slab (Granite / Quartz 40mm)
      const slabTop = new THREE.Mesh(
        new THREE.BoxGeometry(item.width + 0.04, 0.05, item.length + 0.04),
        new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.15, metalness: 0.1 })
      );
      slabTop.position.set(0, 0.885, 0);
      fg.add(slabTop);

      // Horizontal Bar Handles on lower shutters
      const handleGeo = new THREE.BoxGeometry(0.12, 0.02, 0.02);
      for (let hx = -item.width * 0.35; hx <= item.width * 0.35; hx += item.width * 0.35) {
        const handle = new THREE.Mesh(handleGeo, metallicMat);
        handle.position.set(hx, 0.72, item.length / 2 + 0.02);
        fg.add(handle);
      }

      // 2. Tiled Ceramic Subway Backsplash Wall behind counter
      const splashH = 0.65;
      const splash = new THREE.Mesh(
        new THREE.BoxGeometry(item.width, splashH, 0.04),
        backsplashMat
      );
      splash.position.set(0, 0.91 + splashH / 2, -item.length / 2 + 0.02);
      fg.add(splash);

      // 3. Overhead Wall Cabinets (above backsplash)
      const upperH = 0.68;
      const upperD = 0.36;
      const upperCab = new THREE.Mesh(new THREE.BoxGeometry(item.width, upperH, upperD), woodMat);
      upperCab.position.set(0, 0.91 + splashH + upperH / 2, -item.length / 2 + upperD / 2);
      upperCab.castShadow = true;
      fg.add(upperCab);

      // 4. Stainless Steel Cooker Extractor Chimney Hood
      const hoodW = 0.75;
      const hoodH = 0.28;
      const hoodPyramid = new THREE.Mesh(
        new THREE.BoxGeometry(hoodW, hoodH, 0.48),
        metallicMat
      );
      hoodPyramid.position.set(-item.width * 0.2, 1.65, -item.length / 2 + 0.26);
      fg.add(hoodPyramid);

      // Vertical exhaust flue duct extending to ceiling
      const duct = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, wallHeight - 1.79, 0.22),
        metallicMat
      );
      duct.position.set(-item.width * 0.2, 1.79 + (wallHeight - 1.79) / 2, -item.length / 2 + 0.2);
      fg.add(duct);

      // 5. Gas Cooktop Hob (4 Burners)
      const hobPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.02, 0.44),
        new THREE.MeshStandardMaterial({ color: '#000000', roughness: 0.1, metalness: 0.9 })
      );
      hobPlate.position.set(-item.width * 0.2, 0.92, 0);
      fg.add(hobPlate);

      const burnerGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.025, 12);
      const bMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.9 });
      [
        [-0.12, -0.1],
        [0.12, -0.1],
        [-0.12, 0.1],
        [0.12, 0.1],
      ].forEach(([bx, bz]) => {
        const burner = new THREE.Mesh(burnerGeo, bMat);
        burner.position.set(-item.width * 0.2 + bx, 0.94, bz);
        fg.add(burner);
      });

      // 6. Double Bowl Stainless Steel Sink with swan-neck faucet mixer
      const sinkBowl = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.24, 0.42),
        metallicMat
      );
      sinkBowl.position.set(item.width * 0.22, 0.82, 0);
      fg.add(sinkBowl);

      // Arching Gooseneck Faucet
      const faucetPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 8), metallicMat);
      faucetPipe.position.set(item.width * 0.22, 1.05, -0.15);
      fg.add(faucetPipe);
      break;
    }

    case 'refrigerator': {
      // Tall double-door stainless refrigerator
      const fridge = new THREE.Mesh(
        new THREE.BoxGeometry(item.width, 1.88, item.length),
        new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.85, roughness: 0.2, clippingPlanes: planes })
      );
      fridge.position.y = 0.94;
      fridge.castShadow = true;
      fg.add(fridge);

      // Vertical door seam & handles
      const handleGeo = new THREE.BoxGeometry(0.02, 0.7, 0.03);
      const fHandle = new THREE.Mesh(handleGeo, metallicMat);
      fHandle.position.set(0.05, 1.15, item.length / 2 + 0.02);
      fg.add(fHandle);
      break;
    }

    case 'tv_unit': {
      // Low Media Console
      const credenza = new THREE.Mesh(new THREE.BoxGeometry(item.width, 0.42, item.length), woodMat);
      credenza.position.y = 0.21;
      credenza.castShadow = true;
      fg.add(credenza);

      // TV Acoustic Soundbar
      const soundbar = new THREE.Mesh(
        new THREE.BoxGeometry(item.width * 0.6, 0.06, 0.1),
        new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.3 })
      );
      soundbar.position.set(0, 0.45, 0);
      fg.add(soundbar);

      // Ultra-thin 65" TV Screen with LED backlit aura panel
      const backPanel = new THREE.Mesh(
        new THREE.BoxGeometry(item.width * 0.85, 0.85, 0.02),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5 })
      );
      backPanel.position.set(0, 1.15, -0.06);
      fg.add(backPanel);

      const tvScreen = new THREE.Mesh(
        new THREE.BoxGeometry(item.width * 0.8, 0.76, 0.02),
        new THREE.MeshStandardMaterial({ color: '#020617', roughness: 0.05, metalness: 0.95, clippingPlanes: planes })
      );
      tvScreen.position.set(0, 1.15, -0.04);
      fg.add(tvScreen);

      // Bookshelf column on the side
      const bookGeo = new THREE.BoxGeometry(0.35, 1.4, 0.28);
      const bookShelf = new THREE.Mesh(bookGeo, woodMat);
      bookShelf.position.set(-item.width / 2 + 0.2, 0.7, 0);
      fg.add(bookShelf);
      break;
    }

    case 'rug': {
      const rug = new THREE.Mesh(
        new THREE.BoxGeometry(item.width, 0.015, item.length),
        new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.95, clippingPlanes: planes })
      );
      rug.position.y = 0.01;
      fg.add(rug);
      break;
    }

    case 'plant': {
      // Fluted Ceramic Planter
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.18, 0.48, 16),
        new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25, clippingPlanes: planes })
      );
      pot.position.y = 0.24;
      pot.castShadow = true;
      fg.add(pot);

      // Lush Indoor Leaves (Monstera / Fiddle Leaf)
      const plantLeafMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.6, clippingPlanes: planes });
      for (let l = 0; l < 5; l++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), plantLeafMat);
        const lAngle = (l / 5) * Math.PI * 2;
        leaf.position.set(Math.cos(lAngle) * 0.18, 0.6 + (l % 2) * 0.15, Math.sin(lAngle) * 0.18);
        leaf.scale.set(1.4, 0.4, 1.0);
        fg.add(leaf);
      }
      break;
    }

    case 'wc': {
      // Wall-hung toilet commode
      const commode = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.58), whiteMat);
      commode.position.set(0, 0.25, 0);
      fg.add(commode);

      const seatCover = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.56), whiteMat);
      seatCover.position.set(0, 0.48, 0);
      fg.add(seatCover);

      // Chrome Dual-Flush Actuator Plate on wall
      const flushPlate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.02), metallicMat);
      flushPlate.position.set(0, 0.95, -item.length / 2 + 0.02);
      fg.add(flushPlate);
      break;
    }

    case 'washbasin': {
      // Floating Vanity Cabinet
      const vanity = new THREE.Mesh(new THREE.BoxGeometry(item.width, 0.48, item.length), darkCabinetMat);
      vanity.position.set(0, 0.65, 0);
      vanity.castShadow = true;
      fg.add(vanity);

      // Ceramic Counter Basin
      const basin = new THREE.Mesh(new THREE.BoxGeometry(item.width * 0.75, 0.14, item.length * 0.7), whiteMat);
      basin.position.set(0, 0.94, 0);
      fg.add(basin);

      // Chrome Basin Faucet
      const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), metallicMat);
      faucet.position.set(0, 1.1, -item.length * 0.25);
      fg.add(faucet);

      // Illuminated Backlit LED Vanity Mirror
      const mirrorHalo = new THREE.Mesh(
        new THREE.BoxGeometry(item.width * 0.88, 0.9, 0.03),
        new THREE.MeshStandardMaterial({ color: '#fef08a', emissive: '#fef08a', emissiveIntensity: 0.6 })
      );
      mirrorHalo.position.set(0, 1.6, -item.length / 2 + 0.02);
      fg.add(mirrorHalo);

      const mirror = new THREE.Mesh(
        new THREE.BoxGeometry(item.width * 0.82, 0.84, 0.02),
        new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.95, roughness: 0.05, clippingPlanes: planes })
      );
      mirror.position.set(0, 1.6, -item.length / 2 + 0.04);
      fg.add(mirror);
      break;
    }

    case 'shower_cubicle': {
      // Frameless Tempered Glass Shower Enclosure
      const glass = new THREE.Mesh(new THREE.BoxGeometry(item.width, 2.05, 0.03), glassMat);
      glass.position.set(0, 1.025, 0);
      fg.add(glass);

      // Vertical Chrome Door Pull Handle
      const sHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), metallicMat);
      sHandle.position.set(item.width * 0.35, 1.1, 0.03);
      fg.add(sHandle);

      // Overhead Rainfall Shower Head on Wall Arm
      const showerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8), metallicMat);
      showerArm.position.set(0, 2.15, -0.2);
      showerArm.rotation.x = Math.PI / 2;
      fg.add(showerArm);

      const showerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16), metallicMat);
      showerHead.position.set(0, 2.12, 0);
      fg.add(showerHead);

      // Wall Mixer Valve
      const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12), metallicMat);
      valve.position.set(0, 1.15, -item.length / 2 + 0.03);
      valve.rotation.x = Math.PI / 2;
      fg.add(valve);
      break;
    }

    case 'wardrobe': {
      // Modern full-height 3-door wardrobe with sliding grooves
      const ward = new THREE.Mesh(new THREE.BoxGeometry(item.width, 2.4, item.length), woodMat);
      ward.position.y = 1.2;
      ward.castShadow = true;
      fg.add(ward);

      // Vertical recessed groove line handles
      [-item.width * 0.25, 0, item.width * 0.25].forEach((gx) => {
        const groove = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, 1.2, 0.02),
          new THREE.MeshStandardMaterial({ color: '#1a1008', roughness: 0.4 })
        );
        groove.position.set(gx, 1.2, item.length / 2 + 0.01);
        fg.add(groove);
      });
      break;
    }

    case 'car': {
      // Family SUV vehicle
      const carMat = new THREE.MeshStandardMaterial({
        color: '#0284c7',
        metalness: 0.85,
        roughness: 0.2,
        clippingPlanes: planes,
      });
      const body = new THREE.Mesh(new THREE.BoxGeometry(item.width, 0.72, item.length), carMat);
      body.position.y = 0.55;
      body.castShadow = true;
      fg.add(body);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(item.width - 0.16, 0.58, item.length * 0.55),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.1, metalness: 0.9, clippingPlanes: planes })
      );
      cabin.position.set(0, 1.18, -0.2);
      fg.add(cabin);

      // Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 12);
      const wheelMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.8 });
      [
        [-item.width / 2, 0.28, -item.length * 0.3],
        [item.width / 2, 0.28, -item.length * 0.3],
        [-item.width / 2, 0.28, item.length * 0.3],
        [item.width / 2, 0.28, item.length * 0.3],
      ].forEach(([wx, wy, wz]) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(wx, wy, wz);
        wheel.rotation.z = Math.PI / 2;
        fg.add(wheel);
      });
      break;
    }

    case 'study_desk': {
      const deskTop = new THREE.Mesh(new THREE.BoxGeometry(item.width, 0.05, item.length), woodMat);
      deskTop.position.y = 0.75;
      fg.add(deskTop);

      // Metal Frame Legs
      const legGeo = new THREE.BoxGeometry(0.05, 0.72, item.length * 0.85);
      const l1 = new THREE.Mesh(legGeo, metallicMat);
      l1.position.set(-item.width / 2 + 0.05, 0.36, 0);
      fg.add(l1);
      const l2 = new THREE.Mesh(legGeo, metallicMat);
      l2.position.set(item.width / 2 - 0.05, 0.36, 0);
      fg.add(l2);
      break;
    }

    case 'pooja_mandir': {
      const mandir = new THREE.Mesh(new THREE.BoxGeometry(item.width, 1.5, item.length), woodMat);
      mandir.position.y = 0.75;
      mandir.castShadow = true;
      fg.add(mandir);

      // Brass Shikhara dome finial
      const dome = new THREE.Mesh(
        new THREE.ConeGeometry(item.width * 0.28, 0.35, 12),
        new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 0.9, roughness: 0.2 })
      );
      dome.position.set(0, 1.68, 0);
      fg.add(dome);
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
  planes: THREE.Plane[],
  extraElevationY = 0,
  plinthH = 0.45
) {
  const roofGroup = new THREE.Group();
  roofGroup.name = 'TerraceRoof';

  const totalHeight = plinthH + plot.floorCount * plot.floorHeightM + extraElevationY;
  const bW = layout.buildableWidth;
  const bL = layout.buildableLength;
  const originX = layout.originX;
  const originZ = layout.originZ;

  // Roof Concrete Slab (thickness 0.18m)
  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.6, 0.18, bL + 0.6), concMat);
  roofSlab.position.set(originX + bW / 2, totalHeight + 0.09, originZ + bL / 2);
  roofSlab.castShadow = true;
  roofSlab.receiveShadow = true;
  roofGroup.add(roofSlab);

  // Parapet Perimeter Walls (height 1.05m)
  const parapetH = 1.05;
  const pThick = 0.16;
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

  // Stair Mumty / Headroom
  const mumtyW = 3.2;
  const mumtyL = 3.6;
  const mumtyH = 2.5;
  const mumtyMesh = new THREE.Mesh(new THREE.BoxGeometry(mumtyW, mumtyH, mumtyL), parapetMat);
  mumtyMesh.position.set(originX + mumtyW / 2 + 0.5, totalHeight + 0.18 + mumtyH / 2, originZ + mumtyL / 2 + 1.0);
  mumtyMesh.castShadow = true;
  roofGroup.add(mumtyMesh);

  // Overhead Water Storage Tank on Mumty (Cylindrical HDPE tank with access lid)
  const tankGeo = new THREE.CylinderGeometry(0.65, 0.65, 1.4, 20);
  const tankMat = new THREE.MeshStandardMaterial({
    color: '#0f172a', // Sintex dark HDPE
    roughness: 0.35,
    metalness: 0.2,
    clippingPlanes: planes,
  });
  const tank = new THREE.Mesh(tankGeo, tankMat);
  tank.position.set(originX + mumtyW / 2 + 0.5, totalHeight + 0.18 + mumtyH + 0.7, originZ + mumtyL / 2 + 1.0);
  tank.castShadow = true;
  roofGroup.add(tank);

  parent.add(roofGroup);
}

/**
 * Autodesk Revit-style Architectural Section Datum Lines and Elevation Markers
 */
function buildSectionElevationMarkers(
  parent: THREE.Group,
  plot: PlotConfig,
  layout: FloorPlanLayout,
  settings: Viewer3DSettings,
  plinthH: number
) {
  const markerGroup = new THREE.Group();
  markerGroup.name = 'RevitSectionLevelMarkers';

  const bW = layout.buildableWidth;
  const bL = layout.buildableLength;
  const oX = layout.originX;
  const oZ = layout.originZ;

  // Levels definition
  const levels = [
    { label: 'Ground Level (GL)', elevation: 0.0 },
    { label: 'Plinth Level (PL)', elevation: plinthH },
  ];

  for (let f = 1; f < plot.floorCount; f++) {
    levels.push({
      label: f === 1 ? 'First Floor (L1 FFL)' : `Level ${f + 1} (FFL)`,
      elevation: plinthH + f * plot.floorHeightM + f * settings.explodedOffset,
    });
  }

  const roofElev = plinthH + plot.floorCount * plot.floorHeightM + plot.floorCount * settings.explodedOffset;
  levels.push({ label: 'Roof Terrace Slab', elevation: roofElev });
  levels.push({ label: 'Parapet Top Level', elevation: roofElev + 1.05 });

  // Determine line position based on section cut orientation
  const cutMode = settings.sectionCutMode;
  let lineX1 = oX - 1.5;
  let lineX2 = oX + bW + 1.5;
  let lineZ = oZ + bL / 2;

  if (cutMode === 'vertical_x') {
    lineX1 = settings.sectionCutX;
    lineX2 = settings.sectionCutX;
  } else if (cutMode === 'vertical_z') {
    lineZ = settings.sectionCutZ;
  }

  levels.forEach((lvl) => {
    // 1. Dashed Datum Line across cut plane
    const pts = [
      new THREE.Vector3(oX - 1.2, lvl.elevation, lineZ),
      new THREE.Vector3(oX + bW + 1.2, lvl.elevation, lineZ),
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const lineMat = new THREE.LineDashedMaterial({
      color: '#38bdf8',
      dashSize: 0.4,
      gapSize: 0.25,
      linewidth: 2,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    line.computeLineDistances();
    markerGroup.add(line);

    // 2. Revit Elevation Head Sprite (Left end)
    const spriteTex = createElevationMarkerTexture(lvl.label, lvl.elevation);
    const spriteMat = new THREE.SpriteMaterial({ map: spriteTex, depthTest: false });
    const spriteL = new THREE.Sprite(spriteMat);
    spriteL.position.set(oX - 2.8, lvl.elevation, lineZ);
    spriteL.scale.set(3.2, 0.8, 1);
    markerGroup.add(spriteL);

    // 3. Revit Elevation Head Sprite (Right end)
    const spriteR = new THREE.Sprite(spriteMat);
    spriteR.position.set(oX + bW + 2.8, lvl.elevation, lineZ);
    spriteR.scale.set(3.2, 0.8, 1);
    markerGroup.add(spriteR);
  });

  parent.add(markerGroup);
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
