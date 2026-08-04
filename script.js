/**
 * ============================================================================
 * PIP'S WAY - MAIN APPLICATION ENTRY POINT (script.js)
 * ============================================================================
 * Asynchronously loads JSON data dependencies, initializes the graph engine,
 * builds vector map rendering layers, and bootstraps the UI controller.
 */

import { buildGraph } from './js/graph.js';
import { MapRenderer } from './js/renderer.js';
import { UIController } from './js/ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Asynchronously fetch raw data files using clean relative paths
    const [categoriesRes, roomsRes, nodesRes, graphRes] = await Promise.all([
      fetch('data/categories.json'),
      fetch('data/rooms.json'),
      fetch('data/nodes.json'),
      fetch('data/graph.json')
    ]);

    const categories = await categoriesRes.json();
    const rooms = await roomsRes.json();
    const pathway = await nodesRes.json();
    const graphMeta = await graphRes.json();

    // 1. Build walkable node network graph
    const { nodes, adj, visRects } = buildGraph(pathway, rooms, graphMeta.courtyards);

    // 2. Initialize SVG map renderer (support assets/floor-map.png or root floorplan.png.png)
    const svgElement = document.getElementById('floorplan');
    const renderer = new MapRenderer(svgElement);
    const mapImagePath = (await fetch('assets/floor-map.png').then(r => r.ok).catch(() => false))
      ? 'assets/floor-map.png'
      : 'floorplan.png.png';
      
    renderer.initMap(mapImagePath, graphMeta.viewBox || '0 0 1594 2255');

    // 3. Initialize UI Controller
    const ui = new UIController(
      { rooms, categories, nodes, adj, graphMeta, visRects },
      renderer
    );

    // 4. Auto-detect starting location if opened via QR Code scan (?loc=room_id)
    const locParam = new URLSearchParams(window.location.search).get('loc');
    if (locParam && rooms.find(r => r.id === locParam)) {
      ui.pickFrom(locParam);
      ui.showToast("📍 QR detected — you're at " + ui.getLabel(locParam));
    }

  } catch (error) {
    console.error("Failed to initialize Pip's Way Navigator:", error);
  }
});
