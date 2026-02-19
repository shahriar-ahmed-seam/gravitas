/**
 * BodyGlow — additive billboard glow sprite around each body.
 *
 * Uses a canvas-generated radial gradient texture so it renders
 * as a soft circle, not a square.
 */

import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimStore } from '../store/useSimStore';

// Shared radial gradient texture — created once, reused by all glows
let _glowTexture = null;
function getGlowTexture() {
  if (_glowTexture) return _glowTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0.0, 'rgba(255,255,255,1.0)');
  gradient.addColorStop(0.15, 'rgba(255,255,255,0.7)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.25)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.05)');
  gradient.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  _glowTexture = new THREE.CanvasTexture(canvas);
  _glowTexture.needsUpdate = true;
  return _glowTexture;
}

export const BodyGlow = memo(function BodyGlow({ bodyId, color, radius, type }) {
  const spriteRef = useRef();

  const glowColor = useMemo(() => new THREE.Color(color), [color]);
  const scale = type === 'star' ? radius * 5 : radius * 2.5;
  const intensity = type === 'star' ? 0.55 : 0.25;
  const tex = useMemo(() => getGlowTexture(), []);

  useFrame(() => {
    if (!spriteRef.current) return;
    const body = useSimStore.getState().bodies.find((b) => b.id === bodyId);
    if (!body || !body.isAlive) {
      spriteRef.current.visible = false;
      return;
    }
    spriteRef.current.visible = true;
    spriteRef.current.position.set(...body.position);
  });

  return (
    <sprite ref={spriteRef} scale={[scale, scale, 1]}>
      <spriteMaterial
        map={tex}
        color={glowColor}
        transparent
        opacity={intensity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  );
});
