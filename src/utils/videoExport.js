/**
 * Canvas recording to WebM using the MediaRecorder API.
 * Returns a promise that resolves when the file is downloaded.
 */
export async function recordCanvas(canvasElement, durationMs = 10000, fps = 60) {
  if (!canvasElement) throw new Error('Canvas element is required');

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const stream = canvasElement.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });

  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      try {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `nbody-sim-${Date.now()}.webm`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    recorder.onerror = reject;
    recorder.start(100); // collect data every 100 ms
    setTimeout(() => recorder.stop(), durationMs);
  });
}
