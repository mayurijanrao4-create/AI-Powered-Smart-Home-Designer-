/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Procedural texture generator for Three.js PBR materials
 * Enforces zero-404 directive by generating all architectural textures in memory.
 */
export function createWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base warm wood tone
  ctx.fillStyle = '#b5835a';
  ctx.fillRect(0, 0, 512, 512);

  // Parquet plank stripes
  const plankH = 64;
  for (let y = 0; y < 512; y += plankH) {
    ctx.strokeStyle = '#7c5332';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    // Wood grain waves
    for (let i = 0; i < 20; i++) {
      ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(92, 58, 33, 0.15)' : 'rgba(235, 195, 150, 0.15)';
      ctx.lineWidth = Math.random() * 3 + 1;
      ctx.beginPath();
      const waveY = y + Math.random() * plankH;
      ctx.moveTo(0, waveY);
      ctx.bezierCurveTo(170, waveY + Math.random() * 15 - 7, 340, waveY + Math.random() * 15 - 7, 512, waveY);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createTileTexture(tileColor = '#e2d9cc', groutColor = '#94a3b8'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Grout background
  ctx.fillStyle = groutColor;
  ctx.fillRect(0, 0, 256, 256);

  // 2x2 large format tiles
  const tileSize = 124;
  ctx.fillStyle = tileColor;
  ctx.fillRect(2, 2, tileSize, tileSize);
  ctx.fillRect(130, 2, tileSize, tileSize);
  ctx.fillRect(2, 130, tileSize, tileSize);
  ctx.fillRect(130, 130, tileSize, tileSize);

  // Subtle marble vein
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(10, 20);
  ctx.bezierCurveTo(60, 80, 180, 40, 240, 110);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createStoneCladdingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8a7968';
  ctx.fillRect(0, 0, 256, 256);

  // Travertine / Stacked stone horizontal courses
  const rowH = 32;
  for (let y = 0; y < 256; y += rowH) {
    let x = (y % (rowH * 2) === 0) ? 0 : 24;
    while (x < 256) {
      const blockW = Math.floor(40 + (Math.sin(x * 12 + y) * 20 + 20));
      ctx.fillStyle = (Math.sin(x + y * 3) > 0) ? '#a89886' : '#6f5e4e';
      ctx.fillRect(x, y + 2, blockW - 3, rowH - 4);
      ctx.strokeStyle = '#3e342a';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y + 2, blockW - 3, rowH - 4);
      x += blockW;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#346d3e';
  ctx.fillRect(0, 0, 256, 256);

  // Grass blades noise
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = Math.random() > 0.5 ? '#43894e' : '#2b5832';
    ctx.fillRect(x, y, 2, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createPaverTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 0, 256, 256);

  // Interlocking paving pattern
  const pw = 60;
  const ph = 30;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += ph) {
    const shift = (y / ph) % 2 === 0 ? 0 : pw / 2;
    for (let x = -pw; x < 256 + pw; x += pw) {
      ctx.fillStyle = (x + y) % 5 === 0 ? '#64748b' : '#526075';
      ctx.fillRect(x + shift, y, pw - 2, ph - 2);
      ctx.strokeRect(x + shift, y, pw - 2, ph - 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createFabricTexture(color = '#3b82f6'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let y = 0; y < 128; y += 4) {
    ctx.fillRect(0, y, 128, 1);
  }
  for (let x = 0; x < 128; x += 4) {
    ctx.fillRect(x, 0, 1, 128);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Modern ceramic subway tile texture for kitchen backsplash & bathroom wet areas
 */
export function createBacksplashTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#94a3b8'; // dark grout line
  ctx.fillRect(0, 0, 256, 256);

  const tileW = 60;
  const tileH = 28;
  for (let row = 0; row < 10; row++) {
    const y = row * (tileH + 4);
    const offsetX = (row % 2 === 0) ? 0 : -(tileW / 2);
    for (let x = offsetX; x < 256 + tileW; x += tileW + 4) {
      // Glazed white subway tile with subtle gradient bevel
      const grad = ctx.createLinearGradient(x, y, x, y + tileH);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.85, '#f1f5f9');
      grad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, tileW, tileH);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Revit-style BIM Elevation Level Marker Sprite texture
 * Renders circular datum target symbol with elevation readout and level name
 */
export function createElevationMarkerTexture(label: string, elevationM: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Clear transparent
  ctx.clearRect(0, 0, 512, 128);

  // Background capsule badge for ultra high contrast
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(8, 14, 496, 100, 24);
  ctx.fill();
  ctx.stroke();

  // Revit-style circular datum head
  const cx = 58;
  const cy = 64;
  const r = 26;
  
  // Outer circle
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Alternating filled quadrants (classic Autodesk Revit level symbol)
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, 0, Math.PI / 2);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, Math.PI, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();

  // Crosshairs
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();

  // Level Name Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px ui-sans-serif, system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(label.toUpperCase(), 105, 26);

  // Elevation Dimension Text
  const sign = elevationM >= 0 ? '+' : '';
  const elevFt = (elevationM * 3.28084).toFixed(2);
  const elevStr = `${sign}${elevationM.toFixed(2)} m (${sign}${elevFt}′)`;
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 26px ui-monospace, monospace';
  ctx.fillText(elevStr, 105, 68);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

