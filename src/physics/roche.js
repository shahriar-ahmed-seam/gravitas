/**
 * Roche Limit physics — tidal disruption of bodies.
 *
 * When a smaller body enters the Roche limit of a larger body,
 * it is torn apart by tidal forces. The debris forms a ring
 * around the larger body.
 *
 * Roche limit:  d = R_M * (2 * M_M / M_m)^(1/3)
 *   where R_M = radius of primary, M_M = mass of primary, M_m = mass of secondary
 */

import { G } from './gravity';

/**
 * Compute the Roche limit distance for bodyA (primary) disrupting bodyB (secondary).
 */
export function rocheLimit(primaryMass, primaryRadius, secondaryMass) {
  if (secondaryMass <= 0) return 0;
  return primaryRadius * Math.cbrt((2 * primaryMass) / secondaryMass);
}

/**
 * Check all body pairs for Roche limit violations.
 * Returns an array of disruption events for bodies that should be destroyed.
 *
 * A disruption occurs when:
 *  1. mass ratio >= 10:1 (only massive bodies disrupt smaller ones)
 *  2. distance < Roche limit
 *  3. secondary body is not a star (stars don't tidally disrupt easily)
 */
export function checkRocheDisruptions(bodies) {
  const events = [];
  const alive = bodies.filter((b) => b.isAlive);

  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i];
      const b = alive[j];

      // Determine primary (more massive) and secondary
      const primary = a.mass >= b.mass ? a : b;
      const secondary = a.mass >= b.mass ? b : a;

      // Need at least 10:1 mass ratio for tidal disruption
      if (primary.mass / secondary.mass < 10) continue;

      // Stars don't get tidally disrupted (too dense internally)
      if (secondary.type === 'star') continue;

      const roche = rocheLimit(primary.mass, primary.radius, secondary.mass);
      
      const dx = primary.position[0] - secondary.position[0];
      const dy = primary.position[1] - secondary.position[1];
      const dz = primary.position[2] - secondary.position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < roche && dist > 0) {
        events.push({
          primaryId: primary.id,
          secondaryId: secondary.id,
          primaryPosition: [...primary.position],
          secondaryPosition: [...secondary.position],
          primaryMass: primary.mass,
          secondaryMass: secondary.mass,
          secondaryRadius: secondary.radius,
          secondaryColor: secondary.color,
          orbitRadius: dist,
          // Orbital velocity for ring particles
          orbitalSpeed: Math.sqrt(G * primary.mass / dist),
        });
      }
    }
  }

  return events;
}

/**
 * Generate ring particle initial conditions from a disruption event.
 * Returns an array of particle objects {position, velocity, size, color, life}.
 */
export function generateRingParticles(event, count = 60) {
  const particles = [];
  const { primaryPosition, secondaryPosition, secondaryRadius, orbitalSpeed, secondaryColor } = event;

  // Ring center is at primary position
  const cx = primaryPosition[0];
  const cy = primaryPosition[1];
  const cz = primaryPosition[2];

  // Direction from primary to secondary (this is where the ring forms)
  const dx = secondaryPosition[0] - cx;
  const dy = secondaryPosition[1] - cy;
  const dz = secondaryPosition[2] - cz;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  for (let i = 0; i < count; i++) {
    // Spread particles in a ring at the disruption radius ± some scatter
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const r = dist + (Math.random() - 0.5) * secondaryRadius * 4;
    
    const px = cx + Math.cos(angle) * r;
    const py = cy + (Math.random() - 0.5) * secondaryRadius * 0.5;
    const pz = cz + Math.sin(angle) * r;

    // Orbital velocity (perpendicular to radial direction)
    const speed = orbitalSpeed * (0.8 + Math.random() * 0.4);
    const vx = -Math.sin(angle) * speed;
    const vy = (Math.random() - 0.5) * speed * 0.05;
    const vz = Math.cos(angle) * speed;

    particles.push({
      position: [px, py, pz],
      velocity: [vx, vy, vz],
      size: secondaryRadius * (0.05 + Math.random() * 0.15),
      color: secondaryColor,
      life: 1.0,
      age: 0,
    });
  }

  return particles;
}
