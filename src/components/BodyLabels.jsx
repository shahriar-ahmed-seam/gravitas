/**
 * BodyLabels — floating HTML name labels above each body.
 *
 * Uses drei's Html component for automatic billboard text.
 * Shows body name, and optionally mass when selected.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useSimStore } from '../store/useSimStore';

function BodyLabel({ bodyId, name, color }) {
  const groupRef = useRef();

  useFrame(() => {
    if (!groupRef.current) return;
    const body = useSimStore.getState().bodies.find((b) => b.id === bodyId);
    if (!body || !body.isAlive) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;
    groupRef.current.position.set(
      body.position[0],
      body.position[1] + body.radius + 0.25,
      body.position[2],
    );
  });

  return (
    <group ref={groupRef}>
      <Html
        center
        distanceFactor={12}
        style={{
          color,
          fontSize: 9,
          fontFamily: "'Share Tech Mono', monospace",
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          textShadow: `0 0 6px ${color}40, 0 1px 3px rgba(0,0,0,0.8)`,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        {name}
      </Html>
    </group>
  );
}

export function BodyLabels() {
  const bodies = useSimStore((s) => s.bodies);
  const alive = bodies.filter((b) => b.isAlive);

  return (
    <>
      {alive.map((b) => (
        <BodyLabel key={b.id} bodyId={b.id} name={b.name} color={b.color} />
      ))}
    </>
  );
}
