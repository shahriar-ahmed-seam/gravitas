/**
 * URL state serialization — encode/decode simulation state to/from URL params.
 * This lets you share the exact simulation setup by copying the URL.
 */

export function encodeSimState(bodies, timeScale) {
  const compact = bodies.map((b) => ({
    id: b.id,
    name: b.name,
    type: b.type,
    mass: +b.mass.toFixed(6),
    color: b.color,
    position: b.position.map((v) => +v.toFixed(6)),
    velocity: b.velocity.map((v) => +v.toFixed(6)),
  }));
  const payload = JSON.stringify({ bodies: compact, timeScale });
  return btoa(unescape(encodeURIComponent(payload)));
}

export function decodeSimState(encoded) {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function pushStateToURL(bodies, timeScale) {
  try {
    const encoded = encodeSimState(bodies, timeScale);
    const url = new URL(window.location.href);
    url.searchParams.set('sim', encoded);
    window.history.replaceState({}, '', url.toString());
  } catch {
    /* silent */
  }
}

export function loadStateFromURL() {
  try {
    const url = new URL(window.location.href);
    const encoded = url.searchParams.get('sim');
    if (!encoded) return null;
    return decodeSimState(encoded);
  } catch {
    return null;
  }
}
