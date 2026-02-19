/**
 * KeyboardCamera — WASD / Arrow key camera movement.
 *
 * Controls:
 *   W / ↑  — move forward (toward where camera looks)
 *   S / ↓  — move backward
 *   A / ←  — strafe left
 *   D / →  — strafe right
 *   Q      — move down (descend)
 *   E      — move up (ascend)
 *   Shift  — hold for 3× speed boost
 *
 * Integrates with OrbitControls — camera movement is applied to both
 * the camera position AND the OrbitControls target so orbiting stays centered.
 */

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimStore } from '../store/useSimStore';

const _forward = new THREE.Vector3();
const _right   = new THREE.Vector3();
const _up      = new THREE.Vector3(0, 1, 0);
const _move    = new THREE.Vector3();

const BASE_SPEED = 5.0;  // units per second
const BOOST_MULT = 3.0;

export function KeyboardCamera() {
  const { camera } = useThree();
  const keysRef = useRef(new Set());
  const cinemaMode = useSimStore((s) => s.cinemaMode);

  useEffect(() => {
    const onDown = (e) => {
      // Don't capture if user is typing in an input/select
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      keysRef.current.add(e.code);
    };
    const onUp = (e) => {
      keysRef.current.delete(e.code);
    };
    const onBlur = () => {
      keysRef.current.clear();
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useFrame((state, delta) => {
    if (cinemaMode) return; // Cinema mode controls camera itself
    const keys = keysRef.current;
    if (keys.size === 0) return;

    const speed = BASE_SPEED * delta * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? BOOST_MULT : 1.0);

    // Forward = camera look direction projected onto XZ (or full 3D)
    camera.getWorldDirection(_forward);
    _right.crossVectors(_forward, _up).normalize();

    _move.set(0, 0, 0);

    // WASD + Arrows
    if (keys.has('KeyW') || keys.has('ArrowUp'))    _move.add(_forward);
    if (keys.has('KeyS') || keys.has('ArrowDown'))   _move.sub(_forward);
    if (keys.has('KeyA') || keys.has('ArrowLeft'))   _move.sub(_right);
    if (keys.has('KeyD') || keys.has('ArrowRight'))  _move.add(_right);
    if (keys.has('KeyE') || keys.has('Space'))       _move.y += 1;
    if (keys.has('KeyQ'))                             _move.y -= 1;

    if (_move.lengthSq() < 0.001) return;

    _move.normalize().multiplyScalar(speed);
    camera.position.add(_move);

    // Also move OrbitControls target so the orbit center follows
    const controls = state.controls;
    if (controls && controls.target) {
      controls.target.add(_move);
    }
  });

  return null;
}
