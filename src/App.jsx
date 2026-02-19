/**
 * App — root component.
 *
 * Renders:
 *  <Scene>   — the full-screen R3F canvas with all 3D content
 *  <HUD>     — the React HTML overlay (controls, info panels, toolbar)
 *
 * The canvas ref is threaded through both so the HUD can trigger recording.
 */

import { useRef } from 'react';
import { Scene } from './components/Scene';
import { HUD }   from './components/HUD';
import { ErrorBoundary } from './components/ErrorBoundary';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';

export default function App() {
  const canvasRef = useRef(null);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#000' }}>
      <ErrorBoundary>
        <Scene canvasRef={canvasRef} />
      </ErrorBoundary>
      <HUD canvasRef={canvasRef} />
      <KeyboardShortcuts />
    </div>
  );
}
