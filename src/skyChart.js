/**
 * Generate a sky‑chart image with a marker at the target star.
 * This implementation uses the CDS `hips2fits` service to obtain a static image
 * of the requested sky region and draws a simple cross‑hair marker at the centre.
 * It replaces the previous `generateAladinChart` (Aladin‑Lite based) and
 * `exportSkyChart` (also CDS‑based) functions, providing a single entry point.
 *
 * @param {number} ra   Right Ascension in decimal degrees.
 * @param {number} dec  Declination in decimal degrees.
 * @param {object} [options] Optional configuration.
 * @param {number} [options.width=800]   Width of the generated PNG in pixels.
 * @param {number} [options.height=600]  Height of the generated PNG in pixels.
 * @param {number} [options.fov=0.5]    Field‑of‑view in degrees (size of the cut‑out).
 * @param {string} [options.survey='P/DSS2/color']  HiPS survey identifier.
 * @param {string} [options.format='png']   Image format returned by the service.
 * @returns {Promise<string>} Promise resolving to a `data:image/png;base64,…` URL.
 */
export async function generateSkyChart(ra, dec, options = {}) {
  const width = options.width || 800;
  const height = options.height || 600;
  const fov = options.fov || 0.5; // degrees
  const survey = options.survey || 'P/DSS2/color';
  const format = options.format || 'png';

  // Build the CDS hips2fits request URL.
  const params = new URLSearchParams({
    hips: survey,
    ra: ra.toString(),
    dec: dec.toString(),
    fov: fov.toString(),
    width: width.toString(),
    height: height.toString(),
    projection: 'TAN',
    format,
  });

  const url = `https://alasky.cds.unistra.fr/hips-image-services/hips2fits?${params.toString()}`;

  // Fetch the image.
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to retrieve sky chart (status ${resp.status})`);
  }
  const blob = await resp.blob();

  // Load the image into an <img> element.
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = 'Anonymous'; // needed for canvas export
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = URL.createObjectURL(blob);
  });

  // Draw the image and a centre marker onto a temporary canvas.
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  // Marker (yellow cross‑hair) at the centre.
  const markerSize = Math.min(width, height) * 0.02; // 2 % of smaller side
  const cx = width / 2;
  const cy = height / 2;
  ctx.strokeStyle = 'yellow';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - markerSize, cy);
  ctx.lineTo(cx + markerSize, cy);
  ctx.moveTo(cx, cy - markerSize);
  ctx.lineTo(cx, cy + markerSize);
  ctx.stroke();

  // Convert canvas to PNG data‑URL.
  const dataURL = canvas.toDataURL('image/png');

  // Clean up the temporary object URL.
  URL.revokeObjectURL(img.src);

  return dataURL;
}
