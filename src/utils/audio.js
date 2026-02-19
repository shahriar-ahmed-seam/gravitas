/**
 * Spatial audio engine using the Web Audio API.
 *
 * Each body gets:
 *  - A sine/sawtooth oscillator (low hum) with frequency proportional to mass^(-0.3)
 *  - A GainNode whose volume scales with 1/distance^2 from the camera
 *
 * Flyby "whoosh" is triggered externally when relative velocity is high.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bodyNodes = new Map(); // id → { osc, gain, filter }
    this.enabled = false;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.15;
      this.masterGain.connect(this.ctx.destination);
      this.enabled = true;
    } catch {
      console.warn('[AudioEngine] Web Audio API not available');
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /** Register a body and start its ambient hum */
  addBody(id, mass) {
    if (!this.enabled || this.bodyNodes.has(id)) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Massive bodies have lower frequencies (~20–80 Hz range for subs)
    const freq = 30 + 120 * Math.pow(Math.max(mass, 0.001), -0.25);
    osc.type = mass > 0.5 ? 'sine' : 'triangle';
    osc.frequency.value = Math.min(freq, 200);

    filter.type = 'lowpass';
    filter.frequency.value = 300;
    filter.Q.value = 2;

    gainNode.gain.value = 0;

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);
    osc.start();

    this.bodyNodes.set(id, { osc, gain: gainNode, filter });
  }

  /** Update a body's volume based on camera distance */
  updateBody(id, cameraPosition, bodyPosition) {
    if (!this.enabled) return;
    const node = this.bodyNodes.get(id);
    if (!node) return;

    const dx = cameraPosition[0] - bodyPosition[0];
    const dy = cameraPosition[1] - bodyPosition[1];
    const dz = (cameraPosition[2] || 0) - (bodyPosition[2] || 0);
    const distSq = dx * dx + dy * dy + dz * dz;
    const dist = Math.sqrt(distSq) + 1;

    const targetGain = Math.min(0.5 / (dist * dist * 0.05 + 1), 0.4);
    node.gain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
  }

  /** Remove a body's audio nodes */
  removeBody(id) {
    if (!this.enabled) return;
    const node = this.bodyNodes.get(id);
    if (!node) return;
    try {
      node.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      setTimeout(() => {
        node.osc.stop();
        node.osc.disconnect();
        node.gain.disconnect();
        node.filter.disconnect();
      }, 300);
    } catch { /* body already removed */ }
    this.bodyNodes.delete(id);
  }

  /** Play a short impact/merger sound at a given position */
  playMerger(position, cameraPosition) {
    if (!this.enabled) return;
    const dx = cameraPosition[0] - position[0];
    const dy = cameraPosition[1] - position[1];
    const dist = Math.sqrt(dx * dx + dy * dy) + 1;
    const vol = Math.min(0.6 / (dist * 0.2 + 1), 0.6);

    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / this.ctx.sampleRate;
      data[i] = Math.random() * 2 - 1;
      // Exponential decay
      data[i] *= Math.exp(-t * 8);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = vol;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    src.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);
    src.start();
  }

  setMasterVolume(vol) {
    if (!this.enabled) return;
    this.masterGain.gain.setTargetAtTime(
      Math.max(0, Math.min(1, vol)),
      this.ctx.currentTime,
      0.05,
    );
  }

  dispose() {
    if (!this.ctx) return;
    this.bodyNodes.forEach((_, id) => this.removeBody(id));
    this.ctx.close();
    this.ctx = null;
    this.enabled = false;
  }
}

export const audioEngine = new AudioEngine();
