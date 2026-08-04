import ROOMS from './data/rooms.json';
import CATS from './data/categories.json';
import PATHWAY from './data/pathway.json';
import COURTYARDS from './data/courtyards.json';

export interface Room {
  id: string;
  name: string;
  x: number | null;
  y: number | null;
  w: number;
  h: number;
  cat: string;
  node: [number, number];
  virtual?: boolean;
}

export interface Courtyard {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NodePoint {
  x: number;
  y: number;
}

export interface AdjEdge {
  to: string;
  w: number;
}

const NODES: Record<string, NodePoint> = {};
const ADJ: Record<string, AdjEdge[]> = {};

function keyOf(x: number, y: number): string {
  return Math.round(x) + "," + Math.round(y);
}

function addNode(x: number, y: number): string {
  const id = keyOf(x, y);
  if (!NODES[id]) NODES[id] = { x, y };
  return id;
}

function addEdge(a: string, b: string): void {
  if (a === b) return;
  const w = Math.hypot(NODES[a].x - NODES[b].x, NODES[a].y - NODES[b].y);
  (ADJ[a] = ADJ[a] || []).push({ to: b, w });
  (ADJ[b] = ADJ[b] || []).push({ to: a, w });
}

function removeEdge(a: string, b: string): void {
  if (ADJ[a]) ADJ[a] = ADJ[a].filter((e) => e.to !== b);
  if (ADJ[b]) ADJ[b] = ADJ[b].filter((e) => e.to !== a);
}

function dist(a: string, b: string): number {
  return Math.hypot(NODES[a].x - NODES[b].x, NODES[a].y - NODES[b].y);
}

interface Segment {
  aId: string;
  bId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const pwSegments: Segment[] = [];
(PATHWAY as [number, number][][]).forEach((poly) => {
  for (let i = 0; i < poly.length - 1; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[i + 1];
    const aId = addNode(x1, y1);
    const bId = addNode(x2, y2);
    addEdge(aId, bId);
    pwSegments.push({ aId, bId, x1, y1, x2, y2 });
  }
});

function nearestOnSegment(px: number, py: number, seg: Segment) {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - seg.x1) * dx + (py - seg.y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const x = seg.x1 + t * dx;
  const y = seg.y1 + t * dy;
  return { x, y, t, d: Math.hypot(px - x, py - y) };
}

interface VisRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const VIS_RECTS: VisRect[] = [];
(ROOMS as Room[]).forEach((r) => {
  if (!r.virtual && r.x !== null && r.y !== null) {
    VIS_RECTS.push({ id: r.id, x: r.x, y: r.y, w: r.w, h: r.h });
  }
});
(COURTYARDS as Courtyard[]).forEach((c, i) =>
  VIS_RECTS.push({ id: 'courtyard' + i, x: c.x, y: c.y, w: c.w, h: c.h })
);

function segIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  shrink = 1
): boolean {
  let rx2 = rx + shrink;
  let ry2 = ry + shrink;
  let rw2 = rw - 2 * shrink;
  let rh2 = rh - 2 * shrink;
  if (rw2 <= 0 || rh2 <= 0) {
    rx2 = rx;
    ry2 = ry;
    rw2 = rw;
    rh2 = rh;
  }
  const xmin = rx2;
  const xmax = rx2 + rw2;
  const ymin = ry2;
  const ymax = ry2 + rh2;
  const inside = (px: number, py: number) =>
    px >= xmin && px <= xmax && py >= ymin && py <= ymax;
  if (inside(x1, y1) || inside(x2, y2)) return true;
  const ccw = (px: number, py: number, qx: number, qy: number, rx_: number, ry_: number) =>
    (qx - px) * (ry_ - py) - (qy - py) * (rx_ - px);
  const segSeg = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
    dx: number,
    dy: number
  ) => {
    const d1 = ccw(cx, cy, dx, dy, ax, ay);
    const d2 = ccw(cx, cy, dx, dy, bx, by);
    const d3 = ccw(ax, ay, bx, by, cx, cy);
    const d4 = ccw(ax, ay, bx, by, dx, dy);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  };
  const edges = [
    [xmin, ymin, xmax, ymin],
    [xmax, ymin, xmax, ymax],
    [xmax, ymax, xmin, ymax],
    [xmin, ymax, xmin, ymin],
  ];
  for (const [ex1, ey1, ex2, ey2] of edges) {
    if (segSeg(x1, y1, x2, y2, ex1, ey1, ex2, ey2)) return true;
  }
  return false;
}

function hasClearLOS(x1: number, y1: number, x2: number, y2: number, excludeId: string): boolean {
  for (const rect of VIS_RECTS) {
    if (rect.id === excludeId) continue;
    if (segIntersectsRect(x1, y1, x2, y2, rect.x, rect.y, rect.w, rect.h)) return false;
  }
  return true;
}

interface RoomProjection {
  roomId: string;
  t: number;
  x: number;
  y: number;
}

const roomProjections: Record<number, RoomProjection[]> = {};
(ROOMS as Room[]).forEach((r) => {
  const [px, py] = r.node;
  let best: { x: number; y: number; t: number; d: number } | null = null;
  let bestSeg = -1;
  pwSegments.forEach((seg, i) => {
    const p = nearestOnSegment(px, py, seg);
    if (best && p.d >= best.d) return;
    if (hasClearLOS(px, py, p.x, p.y, r.id)) {
      best = p;
      bestSeg = i;
    }
  });
  if (bestSeg >= 0 && best) {
    (roomProjections[bestSeg] = roomProjections[bestSeg] || []).push({
      roomId: r.id,
      t: (best as any).t,
      x: (best as any).x,
      y: (best as any).y,
    });
  }
});

pwSegments.forEach((seg, i) => {
  const rooms = roomProjections[i];
  if (!rooms || !rooms.length) return;
  rooms.sort((a, b) => a.t - b.t);
  removeEdge(seg.aId, seg.bId);
  let prevId = seg.aId;
  rooms.forEach((rp) => {
    let nodeId: string;
    if (rp.t <= 0.015) nodeId = seg.aId;
    else if (rp.t >= 0.985) nodeId = seg.bId;
    else nodeId = addNode(rp.x, rp.y);
    if (nodeId !== prevId) addEdge(prevId, nodeId);
    if (!NODES[rp.roomId]) {
      const rm = (ROOMS as Room[]).find((r) => r.id === rp.roomId);
      if (rm) NODES[rp.roomId] = { x: rm.node[0], y: rm.node[1] };
    }
    addEdge(rp.roomId, nodeId);
    prevId = nodeId;
  });
  if (prevId !== seg.bId) addEdge(prevId, seg.bId);
});

(ROOMS as Room[]).forEach((r) => {
  if (!NODES[r.id]) NODES[r.id] = { x: r.node[0], y: r.node[1] };
});

export function astar(start: string, goal: string): string[] | null {
  if (!NODES[start] || !NODES[goal]) return null;
  const open = new Set([start]);
  const cameFrom: Record<string, string> = {};
  const g: Record<string, number> = { [start]: 0 };
  const h = (id: string) => Math.hypot(NODES[id].x - NODES[goal].x, NODES[id].y - NODES[goal].y);
  const f: Record<string, number> = { [start]: h(start) };

  while (open.size) {
    let cur: string | null = null;
    let best = Infinity;
    for (const n of open) {
      if ((f[n] ?? Infinity) < best) {
        best = f[n];
        cur = n;
      }
    }
    if (!cur) break;
    if (cur === goal) {
      const path = [cur];
      while (cameFrom[cur]) {
        cur = cameFrom[cur];
        path.unshift(cur);
      }
      return path;
    }
    open.delete(cur);
    for (const { to, w } of ADJ[cur] || []) {
      const tentative = g[cur] + w;
      if (tentative < (g[to] ?? Infinity)) {
        cameFrom[to] = cur;
        g[to] = tentative;
        f[to] = tentative + h(to);
        open.add(to);
      }
    }
  }
  return null;
}

export interface RouteResult {
  from: string;
  to: string;
  waypoints: Array<{ x: number; y: number; id?: string }>;
  distance: number;
  meters: number;
  minutes: number;
  namedStops: Array<{ id: string; name: string }>;
  stepsCount: number;
}

export function getRoute(fromId: string, toId: string): RouteResult | null {
  const path = astar(fromId, toId);
  if (!path) return null;

  let totalPx = 0;
  for (let i = 1; i < path.length; i++) {
    totalPx += dist(path[i - 1], path[i]);
  }

  const meters = Math.round(totalPx / 22);
  const minutes = Math.max(1, Math.round(meters / 70));

  const waypoints = path.map((id) => ({
    id,
    x: NODES[id].x,
    y: NODES[id].y,
  }));

  const roomsList = ROOMS as Room[];
  const namedStops = path
    .filter((id) => roomsList.some((r) => r.id === id))
    .map((id) => {
      const r = roomsList.find((rm) => rm.id === id);
      return { id, name: r ? r.name : id };
    });

  return {
    from: fromId,
    to: toId,
    waypoints,
    distance: totalPx,
    meters,
    minutes,
    namedStops,
    stepsCount: path.length,
  };
}

export { NODES, ROOMS, CATS, PATHWAY, COURTYARDS };
