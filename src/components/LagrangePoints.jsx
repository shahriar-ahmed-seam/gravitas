/**
 * LagrangePoints — visualizes the L1–L5 Lagrange points between the two most
 * massive bodies in the system.
 *
 * Each L-point is rendered as:
 *  - A small glowing sphere
 *  - A text label (L1–L5)
 *  - A dashed line from COM
 */

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { computeLagrangePoints } from '../physics/gravity';
import { useSimStore } from '../store/useSimStore';

const LCOLORS = ['#ff6b6b', '#ffa502', '#eccc68', '#2ed573', '#70a1ff'];
const LNAMES  = ['L1', 'L2', 'L3', 'L4', 'L5'];

export function LagrangePoints() {
  const bodies = useSimStore((s) => s.bodies);

  const points = useMemo(() => {
    const alive = bodies.filter((b) => b.isAlive);
    if (alive.length < 2) return null;

    // Pick two most massive
    const sorted = [...alive].sort((a, b) => b.mass - a.mass);
    const [bA, bB] = sorted;

    try {
      return computeLagrangePoints(bA, bB);
    } catch {
      return null;
    }
  }, [bodies]);

  if (!points) return null;

  return (
    <>
      {points.map((pos, i) => (
        <group key={i} position={pos}>
          {/* Glow marker */}
          <mesh>
            <sphereGeometry args={[0.06, 12, 8]} />
            <meshBasicMaterial
              color={LCOLORS[i]}
              transparent
              opacity={0.7}
            />
          </mesh>

          {/* Outer ring */}
          <mesh>
            <ringGeometry args={[0.10, 0.14, 20]} />
            <meshBasicMaterial
              color={LCOLORS[i]}
              transparent
              opacity={0.4}
              side={2} /* DoubleSide */
            />
          </mesh>

          {/* Label */}
          <Html
            center
            style={{
              color: LCOLORS[i],
              fontSize: '9px',
              fontFamily: "'Share Tech Mono', monospace",
              letterSpacing: '0.1em',
              userSelect: 'none',
              pointerEvents: 'none',
              transform: 'translateY(-18px)',
              textShadow: `0 0 6px ${LCOLORS[i]}`,
            }}
          >
            {LNAMES[i]}
          </Html>
        </group>
      ))}
    </>
  );
}
