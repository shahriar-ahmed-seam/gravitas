/**
 * GridPlane — optional reference grid in the ecliptic plane (z=0).
 *
 * Fades out beyond a radius for a clean look.
 * Activatable from the toolbar.
 */

import { useMemo } from 'react';
import * as THREE from 'three';

const GRID_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const GRID_FRAG = /* glsl */ `
  varying vec3 vWorldPos;
  uniform float uGridSize;
  uniform vec3  uColor;

  void main() {
    vec2 coord = vWorldPos.xz / uGridSize;
    vec2 grid  = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
    float line = min(grid.x, grid.y);
    float alpha = 1.0 - min(line, 1.0);

    // Fade with distance from origin
    float dist = length(vWorldPos.xz);
    alpha *= smoothstep(60.0, 20.0, dist) * 0.25;

    // Axis highlights
    float axisX = 1.0 - min(abs(vWorldPos.z) / (uGridSize * 0.3), 1.0);
    float axisZ = 1.0 - min(abs(vWorldPos.x) / (uGridSize * 0.3), 1.0);

    vec3 col = uColor;
    if (axisX > 0.8 && abs(vWorldPos.z) < uGridSize * 0.15) col = vec3(1.0, 0.3, 0.3);
    if (axisZ > 0.8 && abs(vWorldPos.x) < uGridSize * 0.15) col = vec3(0.3, 0.3, 1.0);

    gl_FragColor = vec4(col, alpha);
  }
`;

export function GridPlane() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: GRID_VERT,
        fragmentShader: GRID_FRAG,
        uniforms: {
          uGridSize: { value: 2.0 },
          uColor: { value: new THREE.Color(0x00aaff) },
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} material={mat}>
      <planeGeometry args={[120, 120, 1, 1]} />
    </mesh>
  );
}
