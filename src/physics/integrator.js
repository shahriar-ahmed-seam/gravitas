/**
 * Runge-Kutta 4 (RK4) integrator for N-body gravitation.
 *
 * Why RK4?
 *  - 4th-order accuracy → orbit energy is preserved far longer than Euler
 *  - At typical timesteps (dt ≈ 0.001–0.01 sim-years) orbits remain stable
 *    for thousands of revolutions without visible drift
 *  - Preferred over symplectic methods when non-gravitational forces are later added
 *
 * State: for N bodies, positions [x,y,z] and velocities [vx,vy,vz].
 * Only alive bodies contribute to/receive forces.
 */

import { computeAccelerations } from './gravity';

/**
 * Compute the time-derivative of the state given current body positions/velocities.
 * Returns [{dpos:[dx,dy,dz], dvel:[dvx,dvy,dvz]}, ...] indexed by body.
 */
function stateDerivative(bodies) {
  const accs = computeAccelerations(bodies);
  return bodies.map((b, i) => ({
    dpos: b.isAlive ? [...b.velocity] : [0, 0, 0],
    dvel: b.isAlive ? [...accs[i]] : [0, 0, 0],
  }));
}

/**
 * Apply a derivative scaled by dt to a list of bodies.
 * Returns new body array with updated positions and velocities (shallow clone).
 */
function applyDerivative(bodies, deriv, dt) {
  return bodies.map((b, i) => ({
    ...b,
    position: [
      b.position[0] + dt * deriv[i].dpos[0],
      b.position[1] + dt * deriv[i].dpos[1],
      b.position[2] + dt * deriv[i].dpos[2],
    ],
    velocity: [
      b.velocity[0] + dt * deriv[i].dvel[0],
      b.velocity[1] + dt * deriv[i].dvel[1],
      b.velocity[2] + dt * deriv[i].dvel[2],
    ],
  }));
}

/**
 * Perform a single RK4 step over all bodies.
 * @param {Body[]} bodies - current state array
 * @param {number} dt - timestep in simulation units
 * @returns {Body[]} - new state array after one step
 */
export function rk4Step(bodies, dt) {
  // k1 — derivative at current state
  const k1 = stateDerivative(bodies);

  // k2 — derivative at midpoint using k1
  const b2 = applyDerivative(bodies, k1, dt * 0.5);
  const k2 = stateDerivative(b2);

  // k3 — derivative at midpoint using k2
  const b3 = applyDerivative(bodies, k2, dt * 0.5);
  const k3 = stateDerivative(b3);

  // k4 — derivative at full step using k3
  const b4 = applyDerivative(bodies, k3, dt);
  const k4 = stateDerivative(b4);

  // Combine: weighted average (1, 2, 2, 1) / 6
  return bodies.map((b, i) => ({
    ...b,
    position: [
      b.position[0] + (dt / 6) * (k1[i].dpos[0] + 2 * k2[i].dpos[0] + 2 * k3[i].dpos[0] + k4[i].dpos[0]),
      b.position[1] + (dt / 6) * (k1[i].dpos[1] + 2 * k2[i].dpos[1] + 2 * k3[i].dpos[1] + k4[i].dpos[1]),
      b.position[2] + (dt / 6) * (k1[i].dpos[2] + 2 * k2[i].dpos[2] + 2 * k3[i].dpos[2] + k4[i].dpos[2]),
    ],
    velocity: [
      b.velocity[0] + (dt / 6) * (k1[i].dvel[0] + 2 * k2[i].dvel[0] + 2 * k3[i].dvel[0] + k4[i].dvel[0]),
      b.velocity[1] + (dt / 6) * (k1[i].dvel[1] + 2 * k2[i].dvel[1] + 2 * k3[i].dvel[1] + k4[i].dvel[1]),
      b.velocity[2] + (dt / 6) * (k1[i].dvel[2] + 2 * k2[i].dvel[2] + 2 * k3[i].dvel[2] + k4[i].dvel[2]),
    ],
  }));
}

/**
 * Adaptive sub-stepping: if dt is large, split into sub-steps for stability.
 * Maximum recommended dt per sub-step is 0.002.
 */
export function integrateStep(bodies, dt, maxSubDt = 0.002) {
  if (bodies.filter((b) => b.isAlive).length < 2) {
    // Only one/zero alive body — just advance positions with current velocity
    return bodies.map((b) => ({
      ...b,
      position: [
        b.position[0] + dt * b.velocity[0],
        b.position[1] + dt * b.velocity[1],
        b.position[2] + dt * b.velocity[2],
      ],
    }));
  }

  const nSteps = Math.ceil(Math.abs(dt) / maxSubDt);
  const subDt = dt / nSteps;
  let state = bodies;
  for (let s = 0; s < nSteps; s++) {
    state = rk4Step(state, subDt);
  }
  return state;
}
