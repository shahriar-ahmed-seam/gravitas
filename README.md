<div align="center">

<img src="public/favicon.svg" width="76" alt="Gravitas logo" />

# ✦ Gravitas

### A cinematic, physically-accurate 3D gravitational N-body simulator — in the browser.

> *Gravity doesn't ask permission.*

[**Launch the Simulator →**](https://gravitas-kappa.vercel.app/simulation) · [Landing page](https://gravitas-kappa.vercel.app)

![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black)
![Three.js](https://img.shields.io/badge/Three.js-r169-000?logo=three.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

Watch stars, planets, black holes and asteroids orbit in full three-dimensional space —
with tidal heating, Roche-limit disruption, accretion disks, Doppler shifts and more —
rendered through a WebGL pipeline and driven by a fourth-order Runge-Kutta integrator.

---

## Table of Contents

- [What It Does](#what-it-does)
- [The Physics](#the-physics)
  - [Gravity & Integration](#gravity--integration)
  - [Collision Modes](#collision-modes)
  - [Roche Limit & Tidal Disruption](#roche-limit--tidal-disruption)
  - [Tidal Heating](#tidal-heating)
  - [Body Spin & Oblate Spheroid Deformation](#body-spin--oblate-spheroid-deformation)
  - [Doppler Shift](#doppler-shift)
  - [Lagrange Points](#lagrange-points)
- [3D Orbital Mechanics](#3d-orbital-mechanics)
- [Rendering Pipeline](#rendering-pipeline)
  - [Body Shaders](#body-shaders)
  - [Black Hole Renderer](#black-hole-renderer)
  - [Accretion Disks](#accretion-disks)
  - [Trail System](#trail-system)
  - [Post-Processing](#post-processing)
- [Preset Scenarios](#preset-scenarios)
- [Controls & Keyboard Shortcuts](#controls--keyboard-shortcuts)
- [UI Features](#ui-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Performance Notes](#performance-notes)
- [Known Limitations](#known-limitations)
- [Future Updates & Roadmap](#future-updates--roadmap)
- [Why N-Body?](#why-n-body)
- [License](#license)

---

## What It Does

You place gravitational bodies in **3D space** and the simulation solves the full N-body problem in real time: every body exerts gravitational force on every other body across all three axes, the equations are integrated with adaptive sub-stepping RK4, and the results are rendered through a photorealistic WebGL pipeline.

Bodies orbit in inclined, eccentric, and precessing 3D orbits — not flat 2D circles. Rotate the camera and you'll see planets crossing above and below the reference plane, stars tilting their orbital planes, and chaotic trajectories spiraling through all three dimensions.

No approximations. No Barnes-Hut tree. Just raw O(n²) gravity, because for n ≤ ~20 that's exactly what you want.

---

## The Physics

### Gravity & Integration

The gravitational acceleration on body *i* from body *j* is:

$$\vec{a}_i = G \sum_{j \neq i} \frac{m_j (\vec{r}_j - \vec{r}_i)}{(|\vec{r}_j - \vec{r}_i|^2 + \varepsilon^2)^{3/2}}$$

Where:
- **G = 1.0** (simulation units)
- **ε = 0.08** — softening parameter preventing force divergence at close range (the same technique used in cosmological N-body codes)
- All calculations are in full 3D: `position = [x, y, z]`, `velocity = [vx, vy, vz]`

**Integration** uses **4th-order Runge-Kutta (RK4)** with adaptive sub-stepping:
- Maximum sub-step dt = 0.002 simulation seconds
- If the requested timestep exceeds this, it's automatically split into smaller sub-steps
- 4th-order accuracy means orbital energy is preserved for thousands of revolutions without visible drift

**Conserved quantities** tracked each frame:
- **Kinetic energy** — ½mv²
- **Potential energy** — −Gm₁m₂/r
- **Total mechanical energy** — displayed as a real-time sparkline graph
- **Linear momentum** — [px, py, pz] vector

### Collision Modes

Two collision behaviors, toggled from the toolbar:

| Mode | Behavior |
|---|---|
| **Merge** | Bodies combine on contact. Mass is summed, velocity is momentum-conserved, radius follows volume-conservation (r³ = r₁³ + r₂³). A shockwave VFX plays. |
| **Elastic** | Perfect elastic collision along the line of centers. In 3D, this means the velocity component along the collision normal is exchanged while the tangential component is preserved. Energy and momentum are both conserved. |

### Roche Limit & Tidal Disruption

When a small body ventures too close to a much more massive body, tidal forces can tear it apart. The simulation computes the Roche limit:

$$d_{Roche} = R_M \cdot \left(\frac{2 M_M}{M_m}\right)^{1/3}$$

**Conditions for disruption:**
1. Mass ratio must be ≥ 10:1
2. Distance must be less than the Roche limit
3. Stars are immune (too dense internally)

When a body is disrupted, it's destroyed and replaced by a swarm of **GPU-instanced ring particles** (up to 500) that orbit the primary body, forming a planetary ring system. These particles are gravitationally attracted to all remaining bodies and decay over ~120 seconds.

### Tidal Heating

Bodies near massive neighbors experience tidal stress. The simulation computes:

$$\text{tidal force} \propto \frac{M_{neighbor}}{r^3}$$

This drives visual heating effects in the body shaders:
- **Gas giants** develop lava-colored bands and magma hues
- **Rocky bodies** develop volcanic surface cracks with noise-modulated lava overlay
- **Stars** glow hotter with orange-red tidal emission

The heating lerps smoothly for visual polish — no sudden jumps.

### Body Spin & Oblate Spheroid Deformation

Every body has a `spinRate` property controlling its axial rotation speed. Fast-spinning bodies become **oblate spheroids** — flattened at the poles and bulging at the equator:

$$\text{oblateness} = \min(|\omega| \times 0.08, \; 0.25)$$

This is visible with neutron stars (spinRate = 8–10) which appear noticeably wider than they are tall.

### Doppler Shift

Bodies moving toward the camera shift blue; bodies moving away shift red. The simulation computes:

$$\text{shift} = \tanh(v_{radial} \times 0.5) \times 0.25$$

This is purely a visual effect applied to the body's emissive color. It's subtle (capped at 25% intensity) but gives a sense of radial velocity.

### Lagrange Points

For the two most massive bodies in the system, all 5 Lagrange points (L1–L5) are computed and visualized in **full 3D**:

- **L1** — between the bodies, near the smaller one
- **L2** — beyond the smaller body
- **L3** — opposite side of the larger body
- **L4** — 60° ahead (equilateral triangle point)  
- **L5** — 60° behind (equilateral triangle point)

The computation uses cross products to define the orbital plane in 3D, then places L4/L5 perpendicular to the line of centers within that plane. Each point is rendered with a colored sphere + ring + label.

---

## 3D Orbital Mechanics

All 15 preset scenarios use a **`circOrb3D()`** helper that places bodies in circular orbits with arbitrary **inclination** and **longitude of ascending node**:

```
circOrb3D(centerMass, radius, theta, inclination, ascendingNode)
```

- **theta** — angle within the orbital plane (where the body starts)
- **inclination** — tilt of the orbital plane relative to the XZ reference (radians)
- **ascending node** — rotation of the inclined plane around the Y-axis (radians)

This means:
- Planets orbit at different angles, crossing above and below each other
- Binary star pairs can orbit in completely different planes
- Chaotic systems have bodies with Z-velocity components that amplify over time
- The Kozai-Lidov scenario shows inclination-eccentricity exchange in full 3D

**Fling-to-spawn** (Shift+drag) also works in 3D — it projects onto a plane through the origin perpendicular to the current camera direction, so spawned bodies inherit the 3D viewing angle.

---

## Rendering Pipeline

The scene is built with **React Three Fiber** on top of **Three.js**. Bodies are never re-rendered through React's reconciler during simulation — positions are updated imperatively inside `useFrame`, keeping React out of the hot path entirely. Every `<Body>` is wrapped in `React.memo` to prevent reconciler thrashing.

### Body Shaders

All body shaders are custom GLSL and procedurally vary by type:

| Type | Visual |
|---|---|
| **Stars** | Limb-darkening gradient + animated corona pulse + noise-based surface detail. Tidal heating adds orange-red emission. |
| **Gas Giants** | Latitude-banded atmospheric color with temporal shimmer. Tidal heating shifts bands toward lava/magma hues. |
| **Rocky Bodies** | Multi-octave FBM terrain noise + cloud layer. Tidal heating creates volcanic cracks with pulsing lava/magma overlay. |

All shaders include `uTime` for animation and `uTidalHeat` for dynamic tidal glow.

### Black Hole Renderer

Black holes (`type: 'black_hole'`) are rendered with a dedicated component:
- **Event horizon** — pure black sphere (absorbs all light)
- **Inner dark zone** — semi-transparent black sphere at 1.5× radius
- **Photon ring** — glowing torus at 2.6× radius with a custom GLSL shader featuring time-based flickering
- **Inner accretion ring** — thin torus at 1.8× radius with warm orange glow

### Accretion Disks

Stars and black holes with mass ≥ 2.0 automatically display **accretion disks** — 1500 GPU-instanced particles arranged in a flat ring:
- Inner radius: 1.8× body radius
- Outer radius: 5.0× body radius
- Each particle orbits at Keplerian velocity: v = √(GM/r)
- Color gradient: hot white/blue at the inner edge → body's own color at the outer edge
- Additive blending for the characteristic bright glow

### Trail System

Trails record body positions as they move, colored by velocity magnitude:
- **Slow** — cyan
- **Medium** — yellow
- **Fast** — red

Trail alpha tapers toward the tail. Up to 400 points per body, sampled by minimum world-space distance (0.02 units apart) to prevent over-dense trails at low speeds.

### Post-Processing

The post-processing stack (applied in order via `EffectComposer`):

1. **Bloom** — Unreal Engine-style HDR bleed (luminance threshold 0.2, intensity 1.5, radius 0.7)
2. **Vignette** — cinematic edge darkening (offset 0.25, darkness 0.7)
3. **ACES Filmic Tone Mapping** — the same curve used in film and AAA games

Renderer uses `NoToneMapping` to leave tone mapping to the post-processing pipeline. Multisampling is set to 0 for maximum GPU compatibility.

### BodyGlow

Each non-black-hole body is surrounded by a 2D sprite glow effect using a canvas-generated 128×128 radial gradient texture. Stars get a larger, brighter glow; planets get a subtle atmospheric haze.

---

## Preset Scenarios

| # | Scenario | Bodies | Description |
|---|---|---|---|
| 1 | **Figure-8 Choreography** | 3 | The Chenciner-Montgomery solution — 3 equal masses tracing a figure-8. Stable indefinitely. |
| 2 | **Binary Star + Planets** | 4 | Two stars orbiting their center of mass with planets in inclined orbits around the secondary. |
| 3 | **Chaos Theory** | 5 | Five bodies scattered in 3D space. Extreme sensitivity to initial conditions — ejections guaranteed. |
| 4 | **Mini Solar System** | 10 | A central star with 9 planets: inner rockies (Cinder, Vela, Terra, Rust), two gas giants (Jove, Ringed), two ice giants (Glacius, Nereus), and a distant frozen body (Fringe) — each in a unique 3D orbital plane. |
| 5 | **Double Binary** | 4 | Two binary pairs in perpendicular orbital planes, orbiting each other at large separation. |
| 6 | **Inclined Figure-8** | 3 | The figure-8 choreography rotated 30° out of the ecliptic — a spectacular 3D path. |
| 7 | **Gravity Assist** | 2 | A probe flies past a gas giant at an angle, receiving a 3D slingshot. Watch it bend out-of-plane. |
| 8 | **Black Hole System** | 5 | A supermassive black hole with stars and planets in inclined 3D orbits. Features accretion disk & tidal heating. |
| 9 | **Roche Limit Demo** | 4 | Moons in 3D orbits around a gas giant. One is spiraling in — watch for tidal disruption into a ring. |
| 10 | **Trojan Asteroids** | 12 | A star-planet system with L4/L5 asteroid clusters. Each asteroid has its own 3D orbital inclination. |
| 11 | **Pythagorean 3-Body** | 3 | Masses 3, 4, 5 at vertices of a 3D triangle, released from rest. Extremely chaotic. |
| 12 | **Kozai-Lidov Effect** | 3 | A distant perturber on a 70° inclined orbit exchanges inclination and eccentricity with an inner planet. |
| 13 | **Protoplanetary Disk** | 16 | A star + 15 planetesimals at various 3D inclinations. Mergers build planets over time. |
| 14 | **Neutron Star Inspiral** | 2 | Two ultra-dense stars in a tight, inclined orbit. Rapid spin creates visible oblate deformation. |
| 15 | **Hierarchical Triple** | 4 | A tight binary + outer star + circumbinary planet, all in different orbital planes. |

---

## Controls & Keyboard Shortcuts

### Mouse / Touch

| Action | Input |
|---|---|
| Orbit camera | Left-drag |
| Zoom | Scroll wheel / pinch |
| Pan camera | Right-drag / two-finger drag |
| Select body | Click on body |
| Deselect | Click empty space |
| Fling new body | Shift + left-drag on empty space (drag direction = velocity) |

### Keyboard

| Key | Action |
|---|---|
| `Space` | Pause / Resume simulation |
| `W` / `↑` | Move camera forward |
| `S` / `↓` | Move camera backward |
| `A` / `←` | Move camera left |
| `D` / `→` | Move camera right |
| `Q` | Move camera down |
| `E` | Move camera up |
| `Shift` | Hold for faster camera movement |
| `C` | Toggle cinematic auto-orbit |
| `G` | Toggle reference grid |
| `T` | Toggle orbit trails |
| `L` | Toggle Lagrange points |
| `B` | Toggle body labels |
| `M` | Toggle mini-map |
| `H` or `?` | Show keyboard shortcuts overlay |

### Time Controls

- **Pause/Play** button in the bottom toolbar
- **Speed slider** — adjusts `timeScale` from 0.05× to 100×
- **Time Rewind** — snapshots are taken periodically. Use the rewind controls to jump back to previous states.

---

## UI Features

The simulation includes a rich set of toggleable UI features accessible from the top toolbar:

| Feature | Description |
|---|---|
| **Orbit Trails** | Velocity-colored trails showing each body's path history |
| **Velocity Arrows** | Vectors showing each body's current velocity direction and magnitude |
| **Lagrange Points** | L1–L5 markers for the two most massive bodies (full 3D) |
| **Energy Graph** | Real-time sparkline of total mechanical energy |
| **Grid Plane** | Reference grid in the XZ plane with colored axis highlights |
| **Body Glow** | Sprite-based atmospheric glow around each body |
| **Orbit Predictions** | Dashed lines showing predicted future paths (Euler integration) |
| **Body Labels** | Floating name labels above each body |
| **Cinema Mode** | Auto-orbiting camera for hands-off viewing |
| **COM Lock** | Camera tracks the center of mass of the system |
| **Collision Mode** | Toggle between Merge and Elastic collisions |
| **Audio** | Web Audio spatial sound — each body generates a tone based on its mass |
| **Clear Trails** | Reset all trail history |
| **Share URL** | Current body state is encoded into the URL for sharing |
| **Screenshot** | Download a PNG of the current view |
| **Mini-Map** | Radar-style HTML canvas showing body positions from above |
| **FPS Counter** | Real-time frame rate display |
| **Body Editor** | Select a body, then adjust mass/velocity via sliders, split, or delete |

---

## Architecture

```
src/
├── App.jsx                    # Root: ErrorBoundary > Canvas + HUD
├── store/
│   └── useSimStore.js         # Zustand store (all state + tick() action)
├── physics/
│   ├── gravity.js             # Acceleration, energy, Lagrange points (3D)
│   ├── integrator.js          # RK4 + adaptive sub-stepping (3D)
│   ├── collision.js           # Detection + elastic/merge resolution (3D)
│   └── roche.js               # Roche limit, disruption events, ring particles
├── presets/
│   └── scenarios.js           # 15 scenarios with circOrb3D() helper
├── components/
│   ├── Scene.jsx              # R3F Canvas + SceneContent + DragToFling (3D)
│   ├── Body.jsx               # GLSL shaders + spin/oblate/tidal/Doppler
│   ├── BlackHole.jsx          # Event horizon + photon ring renderer
│   ├── AccretionDisk.jsx      # GPU-instanced particle disk
│   ├── RocheRings.jsx         # GPU-instanced ring debris particles
│   ├── BodyGlow.jsx           # Canvas gradient sprite glow
│   ├── Trail.jsx              # Velocity-colored tapered trails
│   ├── VelocityArrow.jsx      # Cylinder+cone velocity vectors
│   ├── LagrangePoints.jsx     # L1–L5 visualization (3D)
│   ├── OrbitPredictor.jsx     # Future orbit dashed lines
│   ├── CollisionEffect.jsx    # Merger shockwave VFX
│   ├── StarField.jsx          # 3-layer parallax background (8600 points)
│   ├── GridPlane.jsx          # GLSL reference grid
│   ├── PostFX.jsx             # Bloom + Vignette + ToneMapping
│   ├── PhysicsLoop.jsx        # useFrame physics driver
│   ├── CinematicCamera.jsx    # OrbitControls + auto-orbit
│   ├── KeyboardCamera.jsx     # WASD/Arrow camera movement
│   ├── COMFollower.jsx        # Center-of-mass camera tracking
│   ├── HUD.jsx                # All UI panels, toolbars, body editor
│   ├── BodyLabels.jsx         # Floating name labels
│   ├── MiniMap.jsx            # HTML canvas radar
│   ├── FPSCounter.jsx         # Performance counter
│   ├── BodyEditor.jsx         # Mass/velocity sliders
│   ├── TimeRewind.jsx         # Snapshot rewind system
│   ├── KeyboardShortcuts.jsx  # Help overlay
│   └── ErrorBoundary.jsx      # React error boundary
└── utils/
    ├── colors.js              # Color utilities
    ├── screenshot.js          # PNG download
    ├── videoExport.js         # Video recording (experimental)
    ├── audio.js               # Web Audio API spatial sound
    └── urlState.js            # URL state encoding/decoding
```

### Key Design Decisions

1. **Imperative position updates** — Body positions are read from `useSimStore.getState()` inside `useFrame` callbacks. This bypasses React's reconciler entirely, keeping the hot loop at native JavaScript speed.

2. **Stable selectors with shallow compare** — Components that do subscribe to the store use memoized selectors that only trigger re-renders when structural data (IDs, types, colors) actually changes, not on every physics tick.

3. **GPU instancing** — Ring particles (Roche) and accretion disk particles use Three.js `instancedMesh` for rendering thousands of objects in a single draw call.

4. **GLSL everywhere** — Body surfaces, grid, photon rings, and more use custom shader materials for effects that would be impossible with standard Three.js materials.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| UI Framework | React | 18.3.1 |
| Build Tool | Vite | 5.4.21 |
| 3D Engine | Three.js | 0.169.0 |
| React 3D | @react-three/fiber | 8.18.0 |
| 3D Helpers | @react-three/drei | 9.122.0 |
| Post-Processing | @react-three/postprocessing + postprocessing | 2.19.1 / 6.38.2 |
| State Management | Zustand | 5.0.1 |
| Audio | Web Audio API | (built-in) |
| Math | Custom RK4 integrator + GLSL shaders | — |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/shahriar-ahmed-seam/gravitas.git
cd gravitas

# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### First Steps

1. **Open the app** — the default Figure-8 scenario loads automatically
2. **Rotate the camera** — left-drag to orbit around the scene. You'll see the 3D orbital planes
3. **Try different scenarios** — open the scenario dropdown in the top-left of the HUD
4. **Recommended first scenarios:**
   - *Mini Solar System* — planets orbiting at different inclinations
   - *Kozai-Lidov Effect* — dramatic 3D orbital resonance
   - *Black Hole System* — accretion disk + tidal heating
   - *Chaos Theory* — chaotic 3D trajectories with ejections
5. **Toggle features** — try enabling Trails, Lagrange Points, Grid, Predictions, and Body Labels
6. **Fling a body** — hold Shift and drag on empty space to create a new body with velocity
7. **Edit bodies** — click a body to select it, then use the Body Editor to adjust mass and velocity

---

## Performance Notes

- The simulation targets **60 FPS** on modern hardware. With 15+ bodies and all visual effects enabled, lower-end GPUs may dip.
- **GPU-critical features**: Bloom post-processing, accretion disks (1500 instanced particles each), ring debris (up to 500 particles).
- **CPU-critical features**: RK4 integration (O(n²) per sub-step), orbit prediction (300 Euler steps every 30 frames).
- If performance is poor, try:
  - Reducing the number of bodies
  - Disabling Orbit Predictions (these run a secondary simulation)
  - Disabling Accretion Disks (many instanced particles)
  - Lowering the time scale

---

## Known Limitations

1. **No relativistic effects** — Orbits use Newtonian gravity. Black hole "lensing" and "accretion" are purely cosmetic.
2. **No tidal torque on spin** — Body spin rates are constant; they don't exchange angular momentum with the orbit.
3. **Energy drift** — RK4 is not symplectic. Over very long simulations (thousands of orbits), total energy will drift slightly. This is physically "correct" for the numerical method but not for the real universe.
4. **Roche disruption is one-way** — Once a body is destroyed, its debris doesn't re-coalesce.
5. **Orbit predictions use Euler** — Predicted orbits (dashed lines) use simple Euler integration for speed, so they diverge from actual orbits for chaotic systems.
6. **No N > ~20 optimization** — All gravity is computed pairwise O(n²). For larger N, a Barnes-Hut tree or FMM would be needed.

---

## Future Updates & Roadmap

Potential areas for future development:

### Physics Enhancements
- **Spin-orbit coupling** — Transfer angular momentum between body rotation and orbital motion
- **Post-Newtonian corrections** — GR effects for tight binary orbits (perihelion precession, gravitational wave energy loss)
- **Viscous disk dynamics** — True angular momentum transport in accretion disks
- **Tidal locking** — Bodies in close orbits gradually synchronize their spin to their orbital period
- **N-body scaling** — Barnes-Hut octree for O(n log n) gravity, enabling 100+ body simulations

### Visual Enhancements
- **Gravitational lensing** — Full-screen distortion shader near massive bodies (scaffolded but currently disabled)
- **Atmosphere rendering** — Volumetric scattering for gas giant atmospheres
- **Asteroid belts** — Dense instanced particle fields for planetary ring systems
- **Emission spectra** — Map body temperature to realistic blackbody color
- **Shadow casting** — Bodies cast shadows on nearby neighbors

### UX Enhancements
- **Custom scenario editor** — GUI for creating and saving custom initial conditions
- **Body creation wizard** — Step-by-step body placement with orbit preview
- **VR/XR support** — Immersive 3D viewing via WebXR
- **Mobile touch gestures** — Dedicated touch controls for tablets
- **Video export** — Record simulation as MP4/WebM (scaffolded in videoExport.js)
- **Multi-language support** — Localized UI text

---

## Why N-Body?

The three-body problem has no general closed-form solution. Henri Poincaré proved this in 1887, and in doing so essentially invented chaos theory. For most initial conditions, the system is **sensitively dependent** on starting state — an infinitesimal nudge to one body's velocity cascades into completely different long-term behavior.

The figure-8 choreography is one of the rare exceptional orbits where stability is analytically proven (Chenciner & Montgomery, 2000). The Kozai-Lidov effect demonstrates how a distant perturber can dramatically alter an inner orbit's inclination and eccentricity through secular resonance. The Pythagorean problem shows how three bodies released from rest at the vertices of a 3-4-5 triangle produced such complex dynamics that its solution wasn't computed until 1967 — using a computer.

This simulation lets you see all of this firsthand. Load the Chaos preset and watch what happens. Rotate the camera and see the orbits weave through three dimensions. It's not a bug. It's the universe.

---

## License

MIT
