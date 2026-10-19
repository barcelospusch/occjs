import { Prediction } from "./prediction.js";

/**
 * Generates or retrieves occultation maps for predictions.
 * Equivalent to `generate_map()` from the Python package `lineaSSP`.
 *
 * @param {Array<Object|number|string>|Object|number|string} data - Occultation event(s) or ID(s).
 * @param {Object} [options]
 * @param {string} [options.path] - Local directory path to save map image files (Node.js).
 * @param {string} [options.baseUrl] - Base URL for LineA API.
 * @param {Function} [options.onProgress] - Progress callback (index, total, item).
 * @returns {Promise<Array<Object>|Object>}
 */
export async function generateMap(data, options = {}) {
  if (!data) {
    throw new TypeError("data is required to generate occultation map.");
  }

  const { path: savePath = null, baseUrl, onProgress } = options;
  const isArray = Array.isArray(data);
  const items = isArray ? data : [data];
  const predictionApi = new Prediction(baseUrl ? { baseUrl } : {});

  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const id = typeof item === "object" && item !== null ? item.id : item;

    if (!id) {
      throw new TypeError("Each item must have a valid occultation id.");
    }

    const mapInfo = await predictionApi.getOccultationMap(id);

    let localPath = null;
    if (savePath && mapInfo?.url) {
      try {
        const fs = await import("node:fs/promises");
        const pathModule = await import("node:path");

        const imgRes = await fetch(mapInfo.url);
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const filename =
            mapInfo.filename ||
            `${mapInfo.name || "occultation"}_${mapInfo.occultation || id}.png`.replace(
              /\s+/g,
              "_",
            );
          const outFilePath = pathModule.resolve(savePath, filename);

          await fs.mkdir(savePath, { recursive: true });
          await fs.writeFile(outFilePath, buffer);
          localPath = outFilePath;
        }
      } catch (err) {
        // Saving to disk failed or running in non-node environment
        mapInfo.downloadError = err.message;
      }
    }

    const res = {
      ...mapInfo,
      ...(localPath ? { localPath } : {}),
    };

    results.push(res);
    if (onProgress) {
      onProgress(i + 1, items.length, res);
    }
  }

  return isArray ? results : results[0];
}
