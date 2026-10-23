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
