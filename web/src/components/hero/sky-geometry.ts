export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function starPolygon(outer: number, inner: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

function inside(x: number, y: number, poly: [number, number][]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export type SkyBuffers = {
  count: number;
  star: Float32Array;
  origin: Float32Array;
  hist: Float32Array;
  pull: Float32Array;
  rating: Float32Array;
  seed: Float32Array;
};

export function buildSky(ratings: number[]): SkyBuffers {
  const n = ratings.length;
  const rand = seeded(7);
  const poly = starPolygon(3.1, 1.25);
  const star = new Float32Array(n * 3);
  const origin = new Float32Array(n * 3);
  const hist = new Float32Array(n * 3);
  const pull = new Float32Array(n * 3);
  const rating = new Float32Array(n);
  const seed = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    let x = 0;
    let y = 0;
    if (rand() < 0.32) {
      const e = Math.floor(rand() * 10);
      const [ax, ay] = poly[e];
      const [bx, by] = poly[(e + 1) % 10];
      const t = rand();
      x = ax + (bx - ax) * t + (rand() - 0.5) * 0.06;
      y = ay + (by - ay) * t + (rand() - 0.5) * 0.06;
    } else {
      do {
        x = (rand() * 2 - 1) * 3.1;
        y = (rand() * 2 - 1) * 3.1;
      } while (!inside(x, y, poly));
    }
    star.set([x, y - 0.25, (rand() - 0.5) * 0.5], i * 3);

    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const r = 9 + rand() * 6;
    origin.set([r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi) - 4], i * 3);

    rating[i] = ratings[i];
    seed[i] = rand();
  }

  const rowsPerBar = 7;
  const dx = 0.052;
  const dy = 0.08;
  const x0 = -2.2;
  const used = [0, 0, 0, 0, 0];
  const lowIdx: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = Math.min(5, Math.max(1, Math.round(ratings[i])));
    const k = used[s - 1]++;
    const col = Math.floor(k / rowsPerBar);
    const row = k % rowsPerBar;
    const yBar = (s - 3) * 0.72;
    hist.set([x0 + col * dx, yBar + (row - (rowsPerBar - 1) / 2) * dy, (rand() - 0.5) * 0.08], i * 3);
    if (s <= 2) lowIdx.push(i);
  }

  const golden = Math.PI * (3 - Math.sqrt(5));
  const lowCount = lowIdx.length;
  lowIdx.forEach((idx, j) => {
    const r = 2.3 * Math.sqrt((j + 0.5) / lowCount);
    const a = j * golden;
    pull.set([Math.cos(a) * r, Math.sin(a) * r, (rand() - 0.5) * 0.6], idx * 3);
  });
  for (let i = 0; i < n; i++) {
    if (ratings[i] <= 2) continue;
    const a = rand() * Math.PI * 2;
    const r = 4.2 + rand() * 3.5;
    pull.set([Math.cos(a) * r * 1.4, Math.sin(a) * r * 0.8, -3 - rand() * 4], i * 3);
  }

  return { count: n, star, origin, hist, pull, rating, seed };
}
