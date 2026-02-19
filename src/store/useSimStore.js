/**
 * Global simulation state managed with Zustand.
 *
 * The physics loop lives in PhysicsLoop.jsx (useFrame inside R3F Canvas).
 * It reads/writes to this store at 60 fps without triggering React re-renders
 * for the hot path — only HUD components subscribe to the parts they need.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { getScenario, SCENARIO_LIST } from '../presets/scenarios';
import { integrateStep } from '../physics/integrator';
import { processCollisions } from '../physics/collision';
import { computeEnergies } from '../physics/gravity';
import { checkRocheDisruptions, generateRingParticles } from '../physics/roche';
import { pushStateToURL, loadStateFromURL } from '../utils/urlState';

const TRAIL_MAX_POINTS = 400;
const TRAIL_SAMPLE_DISTANCE = 0.02; // minimum world-space distance between trail points
const ROCHE_DISSOLVE_DURATION = 2.0; // sim-time seconds for dissolve animation

/** Compute visual radius from mass and type */
export function massToRadius(mass, type) {
  if (type === 'star')      return Math.max(0.15, Math.cbrt(mass) * 0.28);
  if (type === 'gas_giant') return Math.max(0.10, Math.cbrt(mass) * 0.55);
  if (type === 'rocky')     return Math.max(0.05, Math.cbrt(mass) * 0.60);
  if (type === 'moon')      return Math.max(0.03, Math.cbrt(mass) * 0.55);
  if (type === 'black_hole') return Math.max(0.12, Math.cbrt(mass) * 0.15);
  return Math.max(0.06, Math.cbrt(mass) * 0.4);
}

// ──────────────────────────────────────────
// Load any URL-baked scenario first
// ──────────────────────────────────────────
const urlState = loadStateFromURL();
const defaultScenario = getScenario('figure8');

function prepBodies(rawBodies) {
  return rawBodies.map((b) => ({
    ...b,
    radius: b.radius ?? massToRadius(b.mass, b.type),
    trail: b.trail ?? [],
    isAlive: b.isAlive !== false,
    mergedInto: b.mergedInto ?? null,
  }));
}

const initialBodies = prepBodies(
  urlState ? urlState.bodies : defaultScenario.bodies,
);

// ──────────────────────────────────────────
// Store definition
// ──────────────────────────────────────────
export const useSimStore = create(
  subscribeWithSelector((set, get) => ({
    // ── Bodies ──────────────────────────────
    bodies: initialBodies,

    // ── Simulation time ──────────────────────
    simTime: 0,
    timeScale: urlState?.timeScale ?? defaultScenario.timeScale ?? 0.3,
    isPaused: false,

    // ── Selection ───────────────────────────
    selectedBodyId: null,

    // ── Physics settings ──────────────────────
    collisionMode: defaultScenario.collisionMode ?? 'merge',
    showSoftening: false,

    // ── Visuals ───────────────────────────────
    showTrails: true,
    showVelocityArrows: false,
    showLagrangePoints: false,
    showEnergyGraph: true,
    cinemaMode: false,
    audioEnabled: false,
    showGrid: false,
    showPredictions: false,
    showGlow: true,
    showMiniMap: true,
    showBodyLabels: false,
    followCOM: false,
    rocheEnabled: true,

    // ── Energy (updated each frame) ───────────
    energy: { KE: 0, PE: 0, total: 0, momentum: [0, 0, 0] },
    energyHistory: [], // [{t, total}, ...] last 200 frames

    // ── Merger events (for VFX) ───────────────
    mergerEvents: [], // [{id, position, mass, impactSpeed, time}]

    // ── Roche disruption events (for ring VFX) ─
    rocheEvents: [], // [{primaryId, secondaryId, ...}]

    // ── Current scenario ──────────────────────
    currentScenarioId: urlState ? null : 'figure8',

    // ═══════════════════════════════════════════
    // ACTIONS
    // ═══════════════════════════════════════════

    /**
     * Called every frame by PhysicsLoop.
     * dt is already multiplied by timeScale.
     */
    tick(dt) {
      const { bodies, isPaused, collisionMode, simTime } = get();
      if (isPaused || dt === 0) return;

      const alive = bodies.filter((b) => b.isAlive);
      if (alive.length === 0) return;

      // 1. Integrate
      const integrated = integrateStep(bodies, dt);

      // 2. Collision detection + resolution
      const { newBodies, mergerEvents, deadIds } = processCollisions(integrated, collisionMode);

      // 3. Update trails
      const withTrails = newBodies.map((b) => {
        if (!b.isAlive) return b;
        const lastPoint = b.trail[b.trail.length - 1];
        let addPoint = !lastPoint;
        if (lastPoint) {
          const dx = b.position[0] - lastPoint[0];
          const dy = b.position[1] - lastPoint[1];
          const dz = b.position[2] - lastPoint[2];
          addPoint = (dx * dx + dy * dy + dz * dz) > TRAIL_SAMPLE_DISTANCE * TRAIL_SAMPLE_DISTANCE;
        }
        if (!addPoint) return b;
        const speed = Math.sqrt(
          b.velocity[0] ** 2 + b.velocity[1] ** 2 + b.velocity[2] ** 2,
        );
        const newTrail = [
          ...b.trail.slice(-(TRAIL_MAX_POINTS - 1)),
          [b.position[0], b.position[1], b.position[2], speed],
        ];
        return { ...b, trail: newTrail };
      });

      // 4. Energy bookkeeping
      const energy = computeEnergies(withTrails.filter((b) => b.isAlive));
      const newHistory = [
        ...get().energyHistory.slice(-199),
        { t: simTime, total: energy.total },
      ];

      // 5. Merger VFX events
      const existingMergers = get().mergerEvents.filter(
        (e) => simTime - e.time < 3.0, // keep events for 3 sim-sec
      );
      const newMergers = mergerEvents.map((e, idx) => ({
        id: `merger-${simTime}-${idx}`,
        position: e.position,
        mass: e.mass,
        impactSpeed: e.impactSpeed,
        time: simTime,
      }));

      // 6. Roche limit checks — tidal disruption (with dissolve animation)
      let finalBodies = withTrails;
      const newRocheEvents = [];

      if (get().rocheEnabled) {
        // Skip bodies already dissolving
        const rocheCandidates = withTrails.filter((b) => b.isAlive && !b.isDissolving);
        const rocheDisruptions = checkRocheDisruptions(rocheCandidates);

        if (rocheDisruptions.length > 0) {
          const dissolvingIds = new Set(rocheDisruptions.map((e) => e.secondaryId));
          finalBodies = finalBodies.map((b) =>
            dissolvingIds.has(b.id)
              ? { ...b, isDissolving: true, dissolveStart: simTime }
              : b
          );

          for (const ev of rocheDisruptions) {
            newRocheEvents.push({
              ...ev,
              id: `roche-${simTime}-${ev.secondaryId}`,
              time: simTime,
            });
          }
        }
      }

      // Kill bodies whose dissolve animation has completed
      finalBodies = finalBodies.map((b) => {
        if (b.isDissolving && simTime - b.dissolveStart >= ROCHE_DISSOLVE_DURATION) {
          return { ...b, isAlive: false, isDissolving: false };
        }
        return b;
      });

      // Keep existing roche events for 30 seconds (for ring lifetime)
      const existingRoche = get().rocheEvents.filter(
        (e) => simTime - e.time < 30,
      );

      set({
        bodies: finalBodies,
        simTime: simTime + dt,
        energy,
        energyHistory: newHistory,
        mergerEvents: [...existingMergers, ...newMergers],
        rocheEvents: [...existingRoche, ...newRocheEvents],
      });
    },

    // ── Time controls ────────────────────────
    togglePause() {
      set((s) => ({ isPaused: !s.isPaused }));
    },

    setTimeScale(scale) {
      set({ timeScale: Math.max(0.05, Math.min(100, scale)) });
    },

    // ── Selection ────────────────────────────
    selectBody(id) {
      set({ selectedBodyId: id });
    },

    // ── Scenario management ──────────────────
    loadScenario(scenarioId) {
      const scenario = getScenario(scenarioId);
      if (!scenario) return;
      set({
        bodies: prepBodies(scenario.bodies),
        simTime: 0,
        timeScale: scenario.timeScale ?? 0.3,
        collisionMode: scenario.collisionMode ?? 'merge',
        selectedBodyId: null,
        mergerEvents: [],
        rocheEvents: [],
        energyHistory: [],
        currentScenarioId: scenarioId,
        isPaused: false,
      });
    },

    // ── Add a new body programmatically ──────
    addBody(bodyDef) {
      const newBody = {
        ...bodyDef,
        radius: bodyDef.radius ?? massToRadius(bodyDef.mass, bodyDef.type),
        trail: [],
        isAlive: true,
        mergedInto: null,
      };
      set((s) => ({ bodies: [...s.bodies, newBody] }));
    },

    // ── Remove a body ─────────────────────────
    removeBody(id) {
      set((s) => ({
        bodies: s.bodies.filter((b) => b.id !== id),
        selectedBodyId: s.selectedBodyId === id ? null : s.selectedBodyId,
      }));
    },

    // ── Reset trails ──────────────────────────
    clearTrails() {
      set((s) => ({
        bodies: s.bodies.map((b) => ({ ...b, trail: [] })),
      }));
    },

    // ── Toggle visibility flags ───────────────
    setShowTrails(v)           { set({ showTrails: v }); },
    setShowVelocityArrows(v)   { set({ showVelocityArrows: v }); },
    setShowLagrangePoints(v)   { set({ showLagrangePoints: v }); },
    setShowEnergyGraph(v)      { set({ showEnergyGraph: v }); },
    setCinemaMode(v)           { set({ cinemaMode: v }); },
    setCollisionMode(v)        { set({ collisionMode: v }); },
    setAudioEnabled(v)         { set({ audioEnabled: v }); },
    setShowGrid(v)             { set({ showGrid: v }); },
    setShowPredictions(v)      { set({ showPredictions: v }); },
    setShowGlow(v)             { set({ showGlow: v }); },
    setShowMiniMap(v)          { set({ showMiniMap: v }); },
    setShowBodyLabels(v)       { set({ showBodyLabels: v }); },
    setFollowCOM(v)            { set({ followCOM: v }); },
    setRocheEnabled(v)         { set({ rocheEnabled: v }); },

    // ── Clear roche events after processing ──
    clearRocheEvents() {
      set({ rocheEvents: [] });
    },

    // ── Focus camera on selected body ────────
    focusSelected() {
      // This is handled by the COMFollower / KeyboardShortcuts
      // For now just a marker; the camera follow logic reads this
      const id = get().selectedBodyId;
      if (!id) return;
      const body = get().bodies.find((b) => b.id === id);
      if (!body) return;
      // Store focused position for external consumers
      set({ _focusTarget: [...body.position] });
    },

    // ── URL sharing ─────────────────────────
    shareURL() {
      const { bodies, timeScale } = get();
      pushStateToURL(bodies.filter((b) => b.isAlive), timeScale);
    },

    // ── Clear a specific merger event ────────
    clearMergerEvent(id) {
      set((s) => ({ mergerEvents: s.mergerEvents.filter((e) => e.id !== id) }));
    },
  })),
);

// Convenience selectors
export const selectBodies        = (s) => s.bodies;
export const selectAliveBodies   = (s) => s.bodies.filter((b) => b.isAlive);
export const selectSelectedBody  = (s) => s.bodies.find((b) => b.id === s.selectedBodyId) ?? null;
export const selectEnergy        = (s) => s.energy;
export const selectIsPaused      = (s) => s.isPaused;
export const selectTimeScale     = (s) => s.timeScale;
export const selectSimTime       = (s) => s.simTime;
export const selectMergerEvents  = (s) => s.mergerEvents;
