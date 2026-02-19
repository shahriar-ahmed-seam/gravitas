/**
 * CollisionEffect — an expanding shockwave ring emitted when two bodies merge.
 *
 * The ring expands outward from the merger position over ~2 seconds,
 * fading out in opacity. Multiple simultaneous mergers are handled via
 * the mergerEvents array in the store.
 */

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimStore, selectMergerEvents } from '../store/useSimStore';

const DURATION = 2.2; // seconds (wall clock)

function ShockWave({ event }) {
  const ringRef = useRef();
  const startTime = useRef(Date.now());
  const [dead, setDead] = useState(false);

  useFrame(() => {
    if (!ringRef.current || dead) return;
    const elapsed = (Date.now() - startTime.current) / 1000;
    if (elapsed > DURATION) {
      setDead(true);
      return;
    }
    const t = elapsed / DURATION;
    const radius = t * Math.min(event.mass * 1.5 + 1.5, 6);
    const opacity = Math.pow(1 - t, 1.5) * 0.9;
    ringRef.current.scale.setScalar(radius);
    ringRef.current.material.opacity = opacity;
  });

  if (dead) return null;

  return (
    <mesh
      ref={ringRef}
      position={event.position}
    >
      <ringGeometry args={[0.9, 1.0, 64]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.9}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function SecondaryRing({ event, delay, color }) {
  const ringRef = useRef();
  const startTime = useRef(Date.now() + delay * 1000);
  const [started, setStarted] = useState(false);
  const [dead, setDead] = useState(false);

  useFrame(() => {
    const now = Date.now();
    if (!started) {
      if (now < startTime.current) return;
      setStarted(true);
    }
    if (!ringRef.current || dead) return;
    const elapsed = (now - startTime.current) / 1000;
    if (elapsed > DURATION * 0.7) { setDead(true); return; }
    const t = elapsed / (DURATION * 0.7);
    const radius = t * Math.min(event.mass + 1, 4);
    const opacity = Math.pow(1 - t, 2) * 0.5;
    ringRef.current.scale.setScalar(radius);
    ringRef.current.material.opacity = opacity;
  });

  if (dead || !started) return null;

  return (
    <mesh ref={ringRef} position={event.position}>
      <ringGeometry args={[0.88, 1.0, 48]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

export function CollisionEffects() {
  const mergerEvents = useSimStore(selectMergerEvents);

  return (
    <>
      {mergerEvents.map((event) => (
        <group key={event.id}>
          <ShockWave event={event} />
          <SecondaryRing event={event} delay={0.1} color="#ff6b35" />
          <SecondaryRing event={event} delay={0.25} color="#ffe066" />
        </group>
      ))}
    </>
  );
}
