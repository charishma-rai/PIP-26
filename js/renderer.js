/**
 * ============================================================================
 * PIP'S WAY - SVG MAP & ROUTE RENDERER MODULE (js/renderer.js)
 * ============================================================================
 * Handles rendering the interactive vector floor plan, start/destination pins,
 * dynamic A* path line SVG paths, and animated walking mascot.
 */

const NS = "http://www.w3.org/2000/svg";

/**
 * Creates an SVG DOM element with specified attributes.
 * @param {string} tag - SVG tag name (e.g. 'path', 'g', 'circle', 'text')
 * @param {Object} attrs - Attribute key-value pairs
 * @returns {SVGElement} Formatted SVG element
 */
export function createSVGElement(tag, attrs = {}) {
  const element = document.createElementNS(NS, tag);
  for (const key in attrs) {
    element.setAttribute(key, attrs[key]);
  }
  return element;
}

/**
 * Generates an SVG pin marker for start ('from') or target ('to') location.
 * @param {Object} nodes - Graph nodes map { id: {x, y} }
 * @param {string} id - Room / node ID
 * @param {string} kind - 'from' or 'to'
 * @returns {SVGElement} SVG group containing marker pin
 */
export function pinIcon(nodes, id, kind) {
  const n = nodes[id];
  if (!n) return null;

  const color = kind === 'from' ? '#E8A0BF' : '#7FC9AE';
  const g = createSVGElement('g', {
    class: 'pin ' + (kind === 'from' ? 'pin-from' : 'pin-to'),
    transform: `translate(${n.x},${n.y})`
  });

  g.appendChild(createSVGElement('path', {
    d: "M0,-34 C10,-34 17,-27 17,-17 C17,-6 0,4 0,4 C0,4 -17,-6 -17,-17 C-17,-27 -10,-34 0,-34 Z",
    fill: color,
    stroke: '#fff',
    'stroke-width': 2.5
  }));

  g.appendChild(createSVGElement('circle', {
    cx: 0,
    cy: -17,
    r: 6,
    fill: '#fff'
  }));

  return g;
}

export class MapRenderer {
  /**
   * Initializes MapRenderer attached to specified SVG DOM container.
   * @param {SVGElement} svgElement - Target SVG container element
   */
  constructor(svgElement) {
    this.svg = svgElement;
    this.pathLayer = null;
    this.pinLayer = null;
  }

  /**
   * Builds map elements: background image asset, path layer, and pin layer.
   * @param {string} imagePath - Relative path to floorplan image asset
   * @param {string} viewBox - SVG viewBox attribute string (e.g. "0 0 1594 2255")
   */
  initMap(imagePath = 'assets/floor-map.png', viewBox = '0 0 1594 2255') {
    this.svg.innerHTML = '';
    this.svg.setAttribute('viewBox', viewBox);

    // Render floor plan background image
    const bgImage = createSVGElement('image', {
      href: imagePath,
      x: 0,
      y: 0,
      width: '1594',
      height: '2255'
    });
    this.svg.appendChild(bgImage);

    // Layer groups for path rendering and pins
    this.pathLayer = createSVGElement('g', { id: 'pathLayer' });
    this.pinLayer = createSVGElement('g', { id: 'pinLayer' });
    this.svg.appendChild(this.pathLayer);
    this.svg.appendChild(this.pinLayer);
  }

  /**
   * Refreshes location pins for start and destination rooms.
   * @param {string|null} fromId - Start room ID
   * @param {string|null} toId - Destination room ID
   * @param {Object} nodes - Graph nodes map
   */
  refreshPins(fromId, toId, nodes) {
    if (!this.pinLayer) return;
    this.pinLayer.innerHTML = '';

    if (fromId) {
      const pin = pinIcon(nodes, fromId, 'from');
      if (pin) this.pinLayer.appendChild(pin);
    }
    if (toId) {
      const pin = pinIcon(nodes, toId, 'to');
      if (pin) this.pinLayer.appendChild(pin);
    }
  }

  /**
   * Renders computed A* path, animated dash offset transition, and walking mascot.
   * @param {Array} path - Node IDs array
   * @param {Object} nodes - Graph nodes map
   */
  renderRoute(path, nodes) {
    if (!this.pathLayer || !path || path.length < 2) return;
    this.pathLayer.innerHTML = '';

    // Construct SVG path data string d="M x0 y0 L x1 y1..."
    let d = `M ${nodes[path[0]].x} ${nodes[path[0]].y} `;
    for (let i = 1; i < path.length; i++) {
      d += `L ${nodes[path[i]].x} ${nodes[path[i]].y} `;
    }

    const bgPath = createSVGElement('path', { d, class: 'path-line' });
    const dashPath = createSVGElement('path', { d, class: 'path-line-dash' });

    this.pathLayer.appendChild(bgPath);
    this.pathLayer.appendChild(dashPath);

    // Animate stroke draw transition
    requestAnimationFrame(() => {
      const len = bgPath.getTotalLength();
      bgPath.style.strokeDasharray = len;
      bgPath.style.strokeDashoffset = len;
      bgPath.style.transition = 'stroke-dashoffset 1.1s ease';
      requestAnimationFrame(() => {
        bgPath.style.strokeDashoffset = 0;
      });
    });

    // Walking mascot chick ('🐣') animation following path
    const walkerWrap = createSVGElement('g', {});
    const walker = createSVGElement('text', {
      class: 'walker',
      'text-anchor': 'middle',
      dy: '6'
    });
    walker.textContent = "🐣";

    const motion = createSVGElement('animateMotion', {
      dur: '2.2s',
      repeatCount: 'indefinite',
      rotate: 'auto',
      path: d
    });

    walkerWrap.appendChild(walker);
    walkerWrap.appendChild(motion);
    this.pathLayer.appendChild(walkerWrap);
  }

  /**
   * Clears route line rendering from map.
   */
  clearRoute() {
    if (this.pathLayer) {
      this.pathLayer.innerHTML = '';
    }
  }
}
