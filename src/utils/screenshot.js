/**
 * Screenshot — takes a screenshot of the canvas and downloads it as PNG.
 */

export function takeScreenshot(canvasRef) {
  if (!canvasRef?.current) return;

  // R3F wraps a div, find the actual <canvas>
  const container = canvasRef.current;
  const canvas =
    container instanceof HTMLCanvasElement
      ? container
      : container.querySelector?.('canvas');

  if (!canvas) return;

  try {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `nbody-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.warn('Screenshot failed:', e);
  }
}
