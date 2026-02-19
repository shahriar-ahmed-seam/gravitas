/**
 * Trail — renders the orbital path of a celestial body.
 *
 * Implementation:
 *  - Ring buffer of [x, y, z, speed] points is stored in the Zustand body
 *  - We build a THREE.Line with a custom ShaderMaterial for velocity-colored fade
 *  - Colors shift from warm (slow/old) → cool blue (fast/recent)
 *  - Alpha fades from 0 (tail) → 1 (head) for a natural taper
 */

import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { speedToThreeColor } from '../utils/colors';
import { useSimStore } from '../store/useSimStore';

const VERT = /* glsl */`
  attribute float alpha;
  attribute vec3 vertColor;
  varying float vAlpha;
  varying vec3  vColor;

  void main() {
    vAlpha = alpha;
    vColor = vertColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */`
  varying float vAlpha;
  varying vec3  vColor;

  void main() {
    gl_FragColor = vec4(vColor, vAlpha);
  }
`;

export const Trail = memo(function Trail({ bodyId, visible }) {
  const primitiveRef = useRef(null);

  const { line, geo } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const maxPts = 400;
    geo.setAttribute('position',  new THREE.BufferAttribute(new Float32Array(maxPts * 3), 3));
    geo.setAttribute('vertColor', new THREE.BufferAttribute(new Float32Array(maxPts * 3), 3));
    geo.setAttribute('alpha',     new THREE.BufferAttribute(new Float32Array(maxPts),     1));
    geo.setDrawRange(0, 0);

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    return { line, geo };
  }, []);

  useFrame(() => {
    if (!visible) { geo.setDrawRange(0, 0); return; }

    // Read trail imperatively — no React re-render
    const body = useSimStore.getState().bodies.find((b) => b.id === bodyId);
    const trail = body?.trail;

    if (!trail || trail.length < 2) { geo.setDrawRange(0, 0); return; }

    const n = trail.length;
    const speeds = trail.map((p) => p[3] ?? 0);
    const sMin = Math.min(...speeds);
    const sMax = Math.max(...speeds) + 1e-6;

    const posAttr   = geo.attributes.position;
    const colorAttr = geo.attributes.vertColor;
    const alphaAttr = geo.attributes.alpha;

    for (let i = 0; i < n; i++) {
      const [x, y, z, speed = 0] = trail[i];
      posAttr.setXYZ(i, x, y, z);
      const { r, g, b } = speedToThreeColor(speed, sMin, sMax);
      colorAttr.setXYZ(i, r, g, b);
      alphaAttr.setX(i, Math.pow(i / (n - 1), 1.5) * 0.9);
    }

    posAttr.needsUpdate   = true;
    colorAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
    geo.setDrawRange(0, n);
  });

  return <primitive ref={primitiveRef} object={line} />;
});
