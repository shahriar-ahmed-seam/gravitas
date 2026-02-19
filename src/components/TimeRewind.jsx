/**
 * TimeRewind — snapshot & rewind system.
 *
 * Periodically saves simulation state snapshots.
 * User can rewind to any saved snapshot.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSimStore } from '../store/useSimStore';

const MAX_SNAPSHOTS = 60; // ~60 seconds of snapshots at 1/sec
const SNAPSHOT_INTERVAL_MS = 1000;

// Module-level snapshot buffer (not in React state for perf)
let snapshots = [];
let snapshotCursor = -1;

export function useTimeRewind() {
  const intervalRef = useRef(null);

  // Auto-snapshot every second
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const { bodies, simTime, isPaused } = useSimStore.getState();
      if (isPaused) return;

      const snapshot = {
        simTime,
        bodies: bodies.map((b) => ({
          ...b,
          position: [...b.position],
          velocity: [...b.velocity],
          trail: [], // Don't store trails in snapshots (too heavy)
        })),
      };

      // Trim if we've rewound and then continued
      if (snapshotCursor >= 0 && snapshotCursor < snapshots.length - 1) {
        snapshots = snapshots.slice(0, snapshotCursor + 1);
      }

      snapshots.push(snapshot);
      if (snapshots.length > MAX_SNAPSHOTS) {
        snapshots.shift();
      }
      snapshotCursor = snapshots.length - 1;
    }, SNAPSHOT_INTERVAL_MS);

    return () => clearInterval(intervalRef.current);
  }, []);

  const rewind = useCallback((steps = 5) => {
    if (snapshots.length === 0) return;
    snapshotCursor = Math.max(0, snapshotCursor - steps);
    const snap = snapshots[snapshotCursor];
    if (!snap) return;

    useSimStore.setState({
      bodies: snap.bodies.map((b) => ({ ...b, trail: [] })),
      simTime: snap.simTime,
      isPaused: true,
      mergerEvents: [],
    });
  }, []);

  const forward = useCallback((steps = 5) => {
    if (snapshots.length === 0) return;
    snapshotCursor = Math.min(snapshots.length - 1, snapshotCursor + steps);
    const snap = snapshots[snapshotCursor];
    if (!snap) return;

    useSimStore.setState({
      bodies: snap.bodies.map((b) => ({ ...b, trail: [] })),
      simTime: snap.simTime,
      isPaused: true,
      mergerEvents: [],
    });
  }, []);

  const snapshotCount = snapshots.length;
  const currentIndex = snapshotCursor;

  return { rewind, forward, snapshotCount, currentIndex };
}

export function TimeRewindControls() {
  const { rewind, forward, snapshotCount, currentIndex } = useTimeRewind();
  
  if (snapshotCount === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: 'rgba(0,8,20,0.75)',
        borderRadius: 6,
        border: '1px solid rgba(0,200,255,0.15)',
        backdropFilter: 'blur(10px)',
        pointerEvents: 'all',
      }}
    >
      <button className="hud-btn" onClick={() => rewind(5)} title="Rewind 5 snapshots">
        ⏪
      </button>
      <button className="hud-btn" onClick={() => rewind(1)} title="Rewind 1 snapshot">
        ◀
      </button>
      <span
        style={{
          fontSize: 9,
          color: 'rgba(142,232,255,0.5)',
          minWidth: 50,
          textAlign: 'center',
        }}
      >
        {currentIndex + 1}/{snapshotCount}
      </span>
      <button className="hud-btn" onClick={() => forward(1)} title="Forward 1 snapshot">
        ▶
      </button>
      <button className="hud-btn" onClick={() => forward(5)} title="Forward 5 snapshots">
        ⏩
      </button>
    </div>
  );
}
