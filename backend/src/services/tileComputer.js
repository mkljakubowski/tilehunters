import polyline from '@mapbox/polyline';

export function latLonToTile(lat, lon, zoom) {
  const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor(
    (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI)
    / 2 * Math.pow(2, zoom)
  );
  return { x, y };
}

/**
 * Grid traversal (DDA-like) from tile (x0,y0) to (x1,y1).
 * Returns all tile coordinates the segment passes through.
 */
export function lineTiles(x0, y0, x1, y1) {
  const tiles = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;

  let x = x0;
  let y = y0;
  let err = dx - dy;

  // limit iterations to avoid infinite loops in degenerate cases
  const maxSteps = dx + dy + 1;
  for (let i = 0; i <= maxSteps; i++) {
    tiles.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return tiles;
}

export function computeTilesForPolyline(encodedPolyline, zoom = 14) {
  if (!encodedPolyline || encodedPolyline.length === 0) {
    return [];
  }

  let coords;
  try {
    coords = polyline.decode(encodedPolyline);
  } catch (e) {
    console.warn('Failed to decode polyline:', e.message);
    return [];
  }

  const tileSet = new Set();

  for (let i = 0; i < coords.length; i++) {
    const [lat, lon] = coords[i];
    const tile = latLonToTile(lat, lon, zoom);
    tileSet.add(`${tile.x},${tile.y}`);

    if (i > 0) {
      const [prevLat, prevLon] = coords[i - 1];
      const prevTile = latLonToTile(prevLat, prevLon, zoom);
      const tiles = lineTiles(prevTile.x, prevTile.y, tile.x, tile.y);
      for (const t of tiles) {
        tileSet.add(`${t.x},${t.y}`);
      }
    }
  }

  return Array.from(tileSet).map((key) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  });
}
