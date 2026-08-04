/**
 * ============================================================================
 * PIP'S WAY - A* PATHFINDING ALGORITHM MODULE (js/pathfinding.js)
 * ============================================================================
 * Implements the classic A* (A-Star) shortest-path search algorithm over
 * weighted graphs using an admissible Euclidean distance heuristic.
 */

/**
 * Computes the optimal path from start to goal using the A* algorithm.
 * @param {string} start - Start node ID
 * @param {string} goal - Goal node ID
 * @param {Object} nodes - Graph nodes dictionary { id: {x, y} }
 * @param {Object} adj - Graph adjacency list { id: [{to, w}] }
 * @returns {Array|null} Ordered list of node IDs forming the shortest path, or null if unresolvable
 */
export function astar(start, goal, nodes, adj) {
  if (!nodes[start] || !nodes[goal]) return null;

  const open = new Set([start]);
  const cameFrom = {};
  const g = { [start]: 0 };

  // Admissible Euclidean heuristic estimation to target goal node
  const h = id => Math.hypot(nodes[id].x - nodes[goal].x, nodes[id].y - nodes[goal].y);
  const f = { [start]: h(start) };

  while (open.size > 0) {
    let cur = null;
    let best = Infinity;

    for (const n of open) {
      if ((f[n] ?? Infinity) < best) {
        best = f[n];
        cur = n;
      }
    }

    if (cur === goal) {
      const path = [cur];
      while (cameFrom[cur]) {
        cur = cameFrom[cur];
        path.unshift(cur);
      }
      return path;
    }

    open.delete(cur);

    for (const { to, w } of (adj[cur] || [])) {
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

/**
 * Calculates route statistics: waypoint count, distance in meters, and estimated walk time.
 * @param {Array} path - Node IDs forming the route
 * @param {Object} nodes - Graph nodes dictionary { id: {x, y} }
 * @returns {Object} { steps, meters, mins }
 */
export function computeRouteMetrics(path, nodes) {
  if (!path || path.length < 2) {
    return { steps: 0, meters: 0, mins: 0 };
  }

  let pxDist = 0;
  for (let i = 1; i < path.length; i++) {
    pxDist += Math.hypot(nodes[path[i]].x - nodes[path[i - 1]].x, nodes[path[i]].y - nodes[path[i - 1]].y);
  }

  // 22 pixels per meter scale factor for ground floor layout rendering
  const meters = Math.round(pxDist / 22);
  // Average human walking speed: ~70 meters / min
  const mins = Math.max(1, Math.round(meters / 70));

  return {
    steps: path.length,
    meters,
    mins
  };
}
