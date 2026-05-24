export function computeBiggestSquare(tiles) {
  const dp = new Map();
  let maxSize = 0;
  let maxX = 0, maxY = 0;

  const sorted = [...tiles].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);

  for (const { x, y } of sorted) {
    const top     = dp.get(`${x},${y - 1}`) ?? 0;
    const left    = dp.get(`${x - 1},${y}`) ?? 0;
    const topLeft = dp.get(`${x - 1},${y - 1}`) ?? 0;
    const size = Math.min(top, left, topLeft) + 1;
    dp.set(`${x},${y}`, size);
    if (size > maxSize) { maxSize = size; maxX = x; maxY = y; }
  }

  const result = new Set();
  for (let x = maxX - maxSize + 1; x <= maxX; x++)
    for (let y = maxY - maxSize + 1; y <= maxY; y++)
      result.add(`${x},${y}`);
  return { set: result, side: maxSize };
}

export function computeBiggestEnclosedCluster(tiles) {
  const visited = new Set(tiles.map((t) => `${t.x},${t.y}`));

  const enclosed = new Set();
  for (const { x, y } of tiles) {
    if (
      visited.has(`${x},${y - 1}`) &&
      visited.has(`${x},${y + 1}`) &&
      visited.has(`${x - 1},${y}`) &&
      visited.has(`${x + 1},${y}`)
    ) {
      enclosed.add(`${x},${y}`);
    }
  }

  const seen = new Set();
  let maxSize = 0;

  for (const key of enclosed) {
    if (seen.has(key)) continue;
    const queue = [key];
    seen.add(key);
    let size = 0;
    while (queue.length > 0) {
      const curr = queue.pop();
      size++;
      const [x, y] = curr.split(',').map(Number);
      for (const next of [`${x},${y - 1}`, `${x},${y + 1}`, `${x - 1},${y}`, `${x + 1},${y}`]) {
        if (enclosed.has(next) && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    if (size > maxSize) maxSize = size;
  }

  return maxSize;
}
