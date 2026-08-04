/**
 * ============================================================================
 * PIP'S WAY - GRAPH ENGINE & GEOMETRY MODULE (js/graph.js)
 * ============================================================================
 * Responsible for building the walkable corridor network, performing spatial
 * projections, verifying clear line-of-sight (LOS) obstacle avoidance, and
 * dynamically splicing room entrance nodes into the graph.
 */

/**
 * Converts (x, y) coordinates into a rounded string key for node hash mapping.
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {string} Key string formatted as "X,Y"
 */
export function keyOf(x, y) {
  return Math.round(x) + "," + Math.round(y);
}

/**
 * Calculates Euclidean distance between two nodes in the graph.
 * @param {Object} nodes - Nodes object map { id: {x, y} }
 * @param {string} aId - ID of start node
 * @param {string} bId - ID of target node
 * @returns {number} Distance in pixel units
 */
export function dist(nodes, aId, bId) {
  return Math.hypot(nodes[aId].x - nodes[bId].x, nodes[aId].y - nodes[bId].y);
}

/**
 * Calculates nearest perpendicular projection of point (px, py) onto line segment seg.
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {Object} seg - Segment object with {x1, y1, x2, y2}
 * @returns {Object} {x, y, t, d} where t is parametric position [0..1] and d is distance
 */
export function nearestOnSegment(px, py, seg) {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - seg.x1) * dx + (py - seg.y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const x = seg.x1 + t * dx;
  const y = seg.y1 + t * dy;
  return { x, y, t, d: Math.hypot(px - x, py - y) };
}

/**
 * Checks if line segment (x1,y1)-(x2,y2) intersects rectangle (rx,ry,rw,rh).
 * Used for line-of-sight wall collision detection.
 * @param {number} x1 - Segment start X
 * @param {number} y1 - Segment start Y
 * @param {number} x2 - Segment end X
 * @param {number} y2 - Segment end Y
 * @param {number} rx - Rect X
 * @param {number} ry - Rect Y
 * @param {number} rw - Rect Width
 * @param {number} rh - Rect Height
 * @param {number} shrink - Inset boundary margin
 * @returns {boolean} True if segment intersects rectangle
 */
export function segIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh, shrink = 1) {
  let rx2 = rx + shrink;
  let ry2 = ry + shrink;
  let rw2 = rw - 2 * shrink;
  let rh2 = rh - 2 * shrink;
  if (rw2 <= 0 || rh2 <= 0) {
    rx2 = rx; ry2 = ry; rw2 = rw; rh2 = rh;
  }
  const xmin = rx2, xmax = rx2 + rw2, ymin = ry2, ymax = ry2 + rh2;
  const inside = (px, py) => px >= xmin && px <= xmax && py >= ymin && py <= ymax;
  if (inside(x1, y1) || inside(x2, y2)) return true;

  const ccw = (px, py, qx, qy, rx_, ry_) => (qx - px) * (ry_ - py) - (qy - py) * (rx_ - px);
  const segSeg = (ax, ay, bx, by, cx, cy, dx, dy) => {
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
    [xmin, ymax, xmin, ymin]
  ];
  for (const [ex1, ey1, ex2, ey2] of edges) {
    if (segSeg(x1, y1, x2, y2, ex1, ey1, ex2, ey2)) return true;
  }
  return false;
}

/**
 * Determines whether two points have an unobstructed line of sight.
 * @param {number} x1 - Point 1 X
 * @param {number} y1 - Point 1 Y
 * @param {number} x2 - Point 2 X
 * @param {number} y2 - Point 2 Y
 * @param {string} excludeId - Bounding box ID to exclude (e.g. room's own boundary)
 * @param {Array} visRects - List of obstacle rectangles {id, x, y, w, h}
 * @returns {boolean} True if line of sight is clear
 */
export function hasClearLOS(x1, y1, x2, y2, excludeId, visRects) {
  for (const rect of visRects) {
    if (rect.id === excludeId) continue;
    if (segIntersectsRect(x1, y1, x2, y2, rect.x, rect.y, rect.w, rect.h)) return false;
  }
  return true;
}

/**
 * Builds the complete walkable graph (NODES & ADJ) from pathway lines, room positions,
 * and courtyard obstacles.
 * @param {Array} pathwayData - Polyline network coordinate pairs
 * @param {Array} roomsData - Array of room objects
 * @param {Array} courtyardsData - Array of courtyard obstacle objects
 * @returns {Object} { nodes: {}, adj: {}, visRects: [] }
 */
export function buildGraph(pathwayData, roomsData, courtyardsData) {
  const nodes = {}; // id -> {x, y}
  const adj = {};   // id -> [{to, w}]

  const addNode = (x, y) => {
    const id = keyOf(x, y);
    if (!nodes[id]) nodes[id] = { x, y };
    return id;
  };

  const addEdge = (a, b) => {
    if (a === b) return;
    const w = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
    (adj[a] = adj[a] || []).push({ to: b, w });
    (adj[b] = adj[b] || []).push({ to: a, w });
  };

  const removeEdge = (a, b) => {
    if (adj[a]) adj[a] = adj[a].filter(e => e.to !== b);
    if (adj[b]) adj[b] = adj[b].filter(e => e.to !== a);
  };

  // 1. Construct raw pathway segments
  const pwSegments = [];
  pathwayData.forEach(poly => {
    for (let i = 0; i < poly.length - 1; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[i + 1];
      const aId = addNode(x1, y1);
      const bId = addNode(x2, y2);
      addEdge(aId, bId);
      pwSegments.push({ aId, bId, x1, y1, x2, y2 });
    }
  });

  // 2. Build list of obstacle rectangles for Line-Of-Sight (LOS) validation
  const visRects = [];
  roomsData.forEach(r => {
    if (!r.virtual) visRects.push({ id: r.id, x: r.x, y: r.y, w: r.w, h: r.h });
  });
  courtyardsData.forEach((c, i) => {
    visRects.push({ id: 'courtyard' + i, x: c.x, y: c.y, w: c.w, h: c.h });
  });

  // 3. Project each room entrance node onto nearest clear pathway segment
  const roomProjections = {}; // segIndex -> [{roomId, t, x, y}]
  roomsData.forEach(r => {
    const [px, py] = r.node;
    let best = null;
    let bestSeg = -1;

    pwSegments.forEach((seg, i) => {
      const p = nearestOnSegment(px, py, seg);
      if (best && p.d >= best.d) return;
      if (hasClearLOS(px, py, p.x, p.y, r.id, visRects)) {
        best = p;
        bestSeg = i;
      }
    });

    r._pathwayDist = best ? best.d : 0;
    if (bestSeg >= 0) {
      (roomProjections[bestSeg] = roomProjections[bestSeg] || []).push({
        roomId: r.id,
        t: best.t,
        x: best.x,
        y: best.y
      });
    }
  });

  // 4. Split segments to insert joining room entrance nodes
  pwSegments.forEach((seg, i) => {
    const rooms = roomProjections[i];
    if (!rooms || !rooms.length) return;
    rooms.sort((a, b) => a.t - b.t);

    removeEdge(seg.aId, seg.bId);
    let prevId = seg.aId;

    rooms.forEach(rp => {
      let nodeId;
      if (rp.t <= 0.015) nodeId = seg.aId;
      else if (rp.t >= 0.985) nodeId = seg.bId;
      else nodeId = addNode(rp.x, rp.y);

      if (nodeId !== prevId) addEdge(prevId, nodeId);

      if (!nodes[rp.roomId]) {
        const rm = roomsData.find(r => r.id === rp.roomId);
        nodes[rp.roomId] = { x: rm.node[0], y: rm.node[1] };
      }
      addEdge(rp.roomId, nodeId);
      prevId = nodeId;
    });

    if (prevId !== seg.bId) addEdge(prevId, seg.bId);
  });

  // 5. Ensure all room nodes exist in nodes map
  roomsData.forEach(r => {
    if (!nodes[r.id]) nodes[r.id] = { x: r.node[0], y: r.node[1] };
  });

  return { nodes, adj, visRects };
}
