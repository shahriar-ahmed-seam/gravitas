/**
 * AccretionDisk — swirling particle disk around stars and massive bodies.
 *
 * Uses GPU instancing for performance (thousands of tiny particles).
 * Each disk is a flat ring of particles that orbit and swirl with noise.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimStore } from '../store/useSimStore';
import { G } from '../physics/gravity';

const PARTICLES_PER_DISK = 1500;
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function AccretionDisk({ bodyId, mass, radius, color }) {
  const meshRef = useRef();
  const timeRef = useRef(0);

  // Generate initial particle ring positions
  const particles = useMemo(() => {
    const arr = [];
    const innerR = radius * 1.8;
    const outerR = radius * 5.0;

    for (let i = 0; i < PARTICLES_PER_DISK; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Radial distribution biased toward inner region
      const t = Math.pow(Math.random(), 0.6);
      const r = innerR + t * (outerR - innerR);

      // Slight vertical scatter (disk is mostly flat)
      const verticalScatter = (Math.random() - 0.5) * radius * 0.15 * (1 - t * 0.8);

      // Size: inner particles are slightly larger/brighter
      const size = (0.01 + Math.random() * 0.025) * radius * (1.5 - t * 0.7);

      arr.push({
        angle,
        radius: r,
        y: verticalScatter,
        size,
        speed: Math.sqrt(G * mass / r) * (0.9 + Math.random() * 0.2),
        phase: Math.random() * Math.PI * 2,
        brightness: 0.5 + Math.random() * 0.5,
      });
    }
    return arr;
  }, [mass, radius]);

  const baseColor = useMemo(() => new THREE.Color(color), [color]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const body = useSimStore.getState().bodies.find((b) => b.id === bodyId);
    if (!body || !body.isAlive) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    timeRef.current += delta;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      
      // Orbital motion
      p.angle += p.speed * delta;

      const x = body.position[0] + Math.cos(p.angle) * p.radius;
      const y = body.position[1] + p.y + Math.sin(timeRef.current * 0.5 + p.phase) * 0.005;
      const z = body.position[2] + Math.sin(p.angle) * p.radius;

      _dummy.position.set(x, y, z);
      _dummy.scale.setScalar(p.size);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);

      // Color gradient: inner = hot white/blue, outer = body color
      const t = (p.radius - radius * 1.8) / (radius * 3.2);
      const hotInner = new THREE.Color(1.0, 0.9, 0.7);
      _color.copy(hotInner).lerp(baseColor, Math.pow(t, 0.5));
      _color.multiplyScalar(p.brightness);
      mesh.setColorAt(i, _color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, PARTICLES_PER_DISK]}
      frustumCulled={false}
    >
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
