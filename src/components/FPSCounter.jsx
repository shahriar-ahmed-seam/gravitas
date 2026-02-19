/**
 * FPSCounter — shows frame rate + body count + simulation stats.
 *
 * Uses requestAnimationFrame to sample real FPS,
 * updated once per second to avoid flicker.
 */

import { useEffect, useRef, useState } from 'react';
import { useSimStore } from '../store/useSimStore';

export function FPSCounter() {
  const [fps, setFps] = useState(0);
  const frames = useRef(0);
  const lastTime = useRef(performance.now());

  const bodyCount = useSimStore(
    (s) => s.bodies.filter((b) => b.isAlive).length,
  );
  const simTime = useSimStore((s) => s.simTime);

  useEffect(() => {
    let raf;
    const tick = () => {
      frames.current++;
      const now = performance.now();
      if (now - lastTime.current >= 1000) {
        setFps(frames.current);
        frames.current = 0;
        lastTime.current = now;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  const fpsColor =
    fps >= 55 ? '#39ff8a' : fps >= 30 ? '#ffe66d' : '#ff6b35';

  return (
    <div
      style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 10,
        color: 'rgba(142,232,255,0.6)',
        letterSpacing: '0.1em',
        lineHeight: 1.5,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <span style={{ color: fpsColor, fontWeight: 'bold' }}>{fps}</span> FPS
      &nbsp;·&nbsp;
      <span style={{ color: '#fff' }}>{bodyCount}</span> BODIES
      &nbsp;·&nbsp;
      T={simTime.toFixed(2)}
    </div>
  );
}
