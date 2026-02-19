/**
 * Collision detection and resolution for N-body simulation.
 *
 * Two modes:
 *  1. Elastic  — perfect elastic collision (energy + momentum conserved)
 *  2. Merger   — bodies merge into one (momentum conserved, mass summed)
 *
 * Collision distance threshold: sum of visual radii.
 */

import { G } from './gravity';

/**
 * Find all colliding pairs among alive bodies.
 * @returns {Array<[number, number]>} pairs of indices
 */
export function detectCollisions(bodies) {
  const pairs = [];
  for (let i = 0; i < bodies.length; i++) {
    if (!bodies[i].isAlive) continue;
    for (let j = i + 1; j < bodies.length; j++) {
      if (!bodies[j].isAlive) continue;
      const dx = bodies[j].position[0] - bodies[i].position[0];
      const dy = bodies[j].position[1] - bodies[i].position[1];
      const dz = bodies[j].position[2] - bodies[i].position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const threshold = bodies[i].radius + bodies[j].radius;
      if (dist < threshold) {
        pairs.push([i, j]);
      }
    }
  }
  return pairs;
}

/**
 * Resolve an elastic collision between two bodies.
 * Uses 3D elastic collision formula along the line of centers.
 * Returns updated [bodyA, bodyB].
 */
export function resolveElastic(bodyA, bodyB) {
  const m1 = bodyA.mass;
  const m2 = bodyB.mass;
  const M = m1 + m2;

  // Relative velocity
  const dvx = bodyA.velocity[0] - bodyB.velocity[0];
  const dvy = bodyA.velocity[1] - bodyB.velocity[1];
  const dvz = bodyA.velocity[2] - bodyB.velocity[2];

  // Line of centers (unit vector)
  const dx = bodyB.position[0] - bodyA.position[0];
  const dy = bodyB.position[1] - bodyA.position[1];
  const dz = bodyB.position[2] - bodyA.position[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-10;
  const nx = dx / dist;
  const ny = dy / dist;
  const nz = dz / dist;

  // Relative velocity along normal
  const dvn = dvx * nx + dvy * ny + dvz * nz;

  // Only resolve if approaching
  if (dvn > 0) return [bodyA, bodyB];

  // Impulse scalar
  const j = (2 * m1 * m2 * dvn) / M;

  return [
    {
      ...bodyA,
      velocity: [
        bodyA.velocity[0] - (j / m1) * nx,
        bodyA.velocity[1] - (j / m1) * ny,
        bodyA.velocity[2] - (j / m1) * nz,
      ],
    },
    {
      ...bodyB,
      velocity: [
        bodyB.velocity[0] + (j / m2) * nx,
        bodyB.velocity[1] + (j / m2) * ny,
        bodyB.velocity[2] + (j / m2) * nz,
      ],
    },
  ];
}

/**
 * Resolve a merger collision.
 * The larger body absorbs the smaller one (or bodyA absorbs bodyB if equal mass).
 * Returns the survivor body (updated) and null for the consumed body.
 * Also returns the merger event position for VFX.
 */
export function resolveMerger(bodyA, bodyB) {
  const totalMass = bodyA.mass + bodyB.mass;

  // Center of mass position
  const newPos = [
    (bodyA.mass * bodyA.position[0] + bodyB.mass * bodyB.position[0]) / totalMass,
    (bodyA.mass * bodyA.position[1] + bodyB.mass * bodyB.position[1]) / totalMass,
    (bodyA.mass * bodyA.position[2] + bodyB.mass * bodyB.position[2]) / totalMass,
  ];

  // Momentum conservation
  const newVel = [
    (bodyA.mass * bodyA.velocity[0] + bodyB.mass * bodyB.velocity[0]) / totalMass,
    (bodyA.mass * bodyA.velocity[1] + bodyB.mass * bodyB.velocity[1]) / totalMass,
    (bodyA.mass * bodyA.velocity[2] + bodyB.mass * bodyB.velocity[2]) / totalMass,
  ];

  // New radius: volume-conserving sphere
  const rA = bodyA.radius;
  const rB = bodyB.radius;
  const newRadius = Math.cbrt(rA * rA * rA + rB * rB * rB);

  // Determine dominant body (larger absorbs smaller)
  const dominant = bodyA.mass >= bodyB.mass ? bodyA : bodyB;
  const consumed = bodyA.mass >= bodyB.mass ? bodyB : bodyA;

  const survivor = {
    ...dominant,
    mass: totalMass,
    radius: newRadius,
    position: newPos,
    velocity: newVel,
    trail: [], // reset trail after merger
    isAlive: true,
  };

  const dead = {
    ...consumed,
    isAlive: false,
    mergedInto: dominant.id,
  };

  return {
    survivor,
    dead,
    mergerPosition: [...newPos],
    impactSpeed: Math.sqrt(
      Math.pow(bodyA.velocity[0] - bodyB.velocity[0], 2) +
        Math.pow(bodyA.velocity[1] - bodyB.velocity[1], 2) +
        Math.pow(bodyA.velocity[2] - bodyB.velocity[2], 2),
    ),
  };
}

/**
 * Process all collisions in the current body array.
 * Returns { newBodies, mergerEvents, dominantIds, deadIds }
 */
export function processCollisions(bodies, mode = 'merge') {
  const pairs = detectCollisions(bodies);
  if (pairs.length === 0) return { newBodies: bodies, mergerEvents: [], dominantIds: [], deadIds: [] };

  // Work on mutable copy of references
  let result = bodies.map((b) => ({ ...b }));
  const mergerEvents = [];
  const dominantIds = [];
  const deadIds = [];

  for (const [i, j] of pairs) {
    if (!result[i].isAlive || !result[j].isAlive) continue;

    if (mode === 'elastic') {
      const [newA, newB] = resolveElastic(result[i], result[j]);
      // Push apart to prevent sticking
      const dx = result[j].position[0] - result[i].position[0];
      const dy = result[j].position[1] - result[i].position[1];
      const dz = result[j].position[2] - result[i].position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-10;
      const overlap = result[i].radius + result[j].radius - dist;
      if (overlap > 0) {
        const push = overlap / 2 / dist;
        newA.position = [
          newA.position[0] - dx * push,
          newA.position[1] - dy * push,
          newA.position[2] - dz * push,
        ];
        newB.position = [
          newB.position[0] + dx * push,
          newB.position[1] + dy * push,
          newB.position[2] + dz * push,
        ];
      }
      result[i] = newA;
      result[j] = newB;
    } else {
      // merger
      const { survivor, dead, mergerPosition, impactSpeed } = resolveMerger(result[i], result[j]);
      mergerEvents.push({ position: mergerPosition, impactSpeed, mass: survivor.mass });

      // Replace dominant body, kill consumed
      if (survivor.id === result[i].id) {
        result[i] = survivor;
        result[j] = dead;
      } else {
        result[j] = survivor;
        result[i] = dead;
      }
      dominantIds.push(survivor.id);
      deadIds.push(dead.id);
    }
  }

  return { newBodies: result, mergerEvents, dominantIds, deadIds };
}
