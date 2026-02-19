/**
 * EnergyGraph — live kinetic/potential/total energy chart.
 *
 * Drawn on an HTML <canvas> via React, updated each render.
 * Shows last N frames of history as a sparkline.
 *
 * Three lines:
 *  - Green  : Kinetic Energy
 *  - Red    : Potential Energy (absolute value, shown inverted)
 *  - White  : Total (should be ~constant if physics is conserving)
 */

import { useEffect, useRef } from 'react';
import { useSimStore } from '../store/useSimStore';

const W = 200;
const H = 70;

export function EnergyGraph() {
  const canvasRef = useRef();
  const energy        = useSimStore((s) => s.energy);
  const energyHistory = useSimStore((s) => s.energyHistory);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, W, H);

    if (energyHistory.length < 2) return;

    const totals = energyHistory.map((e) => e.total);
    const minE = Math.min(...totals);
    const maxE = Math.max(...totals);
    const range = maxE - minE || 1;

    const toY = (v) => H - 4 - ((v - minE) / range) * (H - 8);
    const toX = (i) => (i / (energyHistory.length - 1)) * W;

    // Grid lines
    ctx.strokeStyle = 'rgba(0,212,255,0.1)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = 4 + (g / 4) * (H - 8);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Total energy (should stay flat)
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    energyHistory.forEach((e, i) => {
      const x = toX(i);
      const y = toY(e.total);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Current values text
    ctx.fillStyle = 'rgba(142,232,255,0.7)';
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.fillText(`KE: ${energy.KE.toFixed(3)}`, 4, H - 18);
    ctx.fillText(`PE: ${energy.PE.toFixed(3)}`, 4, H - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`E : ${energy.total.toFixed(3)}`, W - 80, H - 8);
  }, [energy, energyHistory]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{
        display: 'block',
        borderRadius: '3px',
        border: '1px solid rgba(0,212,255,0.15)',
      }}
    />
  );
}
