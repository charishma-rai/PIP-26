/**
 * ============================================================================
 * PIP'S WAY - UI CONTROLLER MODULE (js/ui.js)
 * ============================================================================
 * Manages UI component state, DOM event listeners, modal triggers, toast
 * alerts, floor tab rendering, legend items, and coordinates between search,
 * pathfinding, and map renderer modules.
 */

import { astar, computeRouteMetrics } from './pathfinding.js';
import { buildResults, generateQRCodes } from './search.js';

export class UIController {
  /**
   * Constructs UIController instance.
   * @param {Object} data - Initialized application data { rooms, categories, nodes, adj, graphMeta }
   * @param {MapRenderer} renderer - Initialized MapRenderer instance
   */
  constructor(data, renderer) {
    this.rooms = data.rooms;
    this.categories = data.categories;
    this.nodes = data.nodes;
    this.adj = data.adj;
    this.graphMeta = data.graphMeta;
    this.renderer = renderer;

    this.fromId = null;
    this.toId = null;
    this.toastTimer = null;

    this.bindDOMElements();
    this.initEventListeners();
    this.renderFloorTabs();
    this.renderLegend();
  }

  /**
   * Binds DOM element references.
   */
  bindDOMElements() {
    this.fromInput = document.getElementById('fromInput');
    this.fromResults = document.getElementById('fromResults');
    this.fromChip = document.getElementById('fromChip');

    this.toInput = document.getElementById('toInput');
    this.toResults = document.getElementById('toResults');
    this.toChip = document.getElementById('toChip');

    this.goBtn = document.getElementById('goBtn');
    this.swapBtn = document.getElementById('swapBtn');
    this.qrBtn = document.getElementById('qrBtn');
    this.qrGenBtn = document.getElementById('qrGenBtn');

    this.routeCard = document.getElementById('routeCard');
    this.statSteps = document.getElementById('statSteps');
    this.statDist = document.getElementById('statDist');
    this.statTime = document.getElementById('statTime');
    this.stepsList = document.getElementById('stepsList');

    this.mapSub = document.getElementById('mapSub');
    this.toast = document.getElementById('toast');
    this.lockModal = document.getElementById('lockModal');
    this.lockTitle = document.getElementById('lockTitle');
    this.qrGenModal = document.getElementById('qrGenModal');
    this.qrGenGrid = document.getElementById('qrGenGrid');
    this.floorTabs = document.getElementById('floorTabs');
    this.legend = document.getElementById('legend');
  }

  /**
   * Helper to retrieve room display label by ID.
   * @param {string} id - Room ID
   * @returns {string} Room display name
   */
  getLabel(id) {
    return this.rooms.find(r => r.id === id)?.name || id;
  }

  /**
   * Attaches interactive event listeners.
   */
  initEventListeners() {
    // Search input event listeners
    this.fromInput.addEventListener('input', () =>
      buildResults(this.fromResults, this.fromInput.value, this.toId, this.rooms, this.categories, id => this.pickFrom(id))
    );
    this.fromInput.addEventListener('focus', () =>
      buildResults(this.fromResults, this.fromInput.value, this.toId, this.rooms, this.categories, id => this.pickFrom(id))
    );

    this.toInput.addEventListener('input', () =>
      buildResults(this.toResults, this.toInput.value, this.fromId, this.rooms, this.categories, id => this.pickTo(id))
    );
    this.toInput.addEventListener('focus', () =>
      buildResults(this.toResults, this.toInput.value, this.fromId, this.rooms, this.categories, id => this.pickTo(id))
    );

    // Close dropdowns on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('.search-wrap')) {
        this.fromResults.classList.remove('show');
        this.toResults.classList.remove('show');
      }
    });

    // Swap start and destination
    this.swapBtn.onclick = () => this.swapLocations();

    // Find route button click
    this.goBtn.onclick = () => this.findRoute();

    // Simulate QR detection scan
    this.qrBtn.onclick = () => this.simulateQRScan();

    // Open QR Code generator modal
    this.qrGenBtn.onclick = () => {
      generateQRCodes(this.qrGenGrid, this.graphMeta.qrTargets, this.rooms, id => this.getLabel(id));
      this.qrGenModal.classList.add('show');
    };
  }

  /**
   * Selects starting location room.
   * @param {string} id - Selected room ID
   */
  pickFrom(id) {
    const room = this.rooms.find(x => x.id === id);
    if (room && room.cat === 'stair') {
      this.showLock(id);
      return;
    }
    this.fromId = id;
    this.fromInput.value = '';
    this.renderChip(this.fromChip, id, 'from');
    this.refreshMapState();
    this.tryEnableGo();
  }

  /**
   * Selects destination location room.
   * @param {string} id - Selected room ID
   */
  pickTo(id) {
    const room = this.rooms.find(x => x.id === id);
    if (room && room.cat === 'stair') {
      this.showLock(id);
      return;
    }
    this.toId = id;
    this.toInput.value = '';
    this.renderChip(this.toChip, id, 'to');
    this.refreshMapState();
    this.tryEnableGo();
  }

  /**
   * Renders chosen selection chip UI component.
   */
  renderChip(chipElement, id, kind) {
    chipElement.classList.remove('empty');
    const isFrom = kind === 'from';
    chipElement.innerHTML = `${isFrom ? '📍' : '🎯'} ${this.getLabel(id)} <span class="x" id="clear${isFrom ? 'From' : 'To'}Btn">✕</span>`;

    const clearBtn = chipElement.querySelector(`#clear${isFrom ? 'From' : 'To'}Btn`);
    if (clearBtn) {
      clearBtn.onclick = () => (isFrom ? this.clearFrom() : this.clearTo());
    }
  }

  /**
   * Clears start selection.
   */
  clearFrom() {
    this.fromId = null;
    this.fromChip.className = 'chosen-chip empty';
    this.fromChip.textContent = 'Nothing selected yet';
    this.refreshMapState();
    this.tryEnableGo();
    this.hideRoute();
  }

  /**
   * Clears destination selection.
   */
  clearTo() {
    this.toId = null;
    this.toChip.className = 'chosen-chip empty';
    this.toChip.textContent = 'Nothing selected yet';
    this.refreshMapState();
    this.tryEnableGo();
    this.hideRoute();
  }

  /**
   * Enables or disables 'Find my way' button.
   */
  tryEnableGo() {
    this.goBtn.disabled = !(this.fromId && this.toId);
  }

  /**
   * Swaps starting point and destination.
   */
  swapLocations() {
    const temp = this.fromId;
    this.fromId = this.toId;
    this.toId = temp;

    if (this.fromId) this.renderChip(this.fromChip, this.fromId, 'from');
    else {
      this.fromChip.className = 'chosen-chip empty';
      this.fromChip.textContent = 'Nothing selected yet';
    }

    if (this.toId) this.renderChip(this.toChip, this.toId, 'to');
    else {
      this.toChip.className = 'chosen-chip empty';
      this.toChip.textContent = 'Nothing selected yet';
    }

    this.refreshMapState();
    this.tryEnableGo();
  }

  /**
   * Triggers A* pathfinding and renders calculated route on map.
   */
  findRoute() {
    if (!this.fromId || !this.toId) return;

    const path = astar(this.fromId, this.toId, this.nodes, this.adj);
    if (!path) {
      this.showToast("No route found 😢");
      return;
    }

    // Render path and animated mascot
    this.renderer.renderRoute(path, this.nodes);

    // Compute route metrics
    const metrics = computeRouteMetrics(path, this.nodes);
    this.statSteps.textContent = metrics.steps;
    this.statDist.textContent = metrics.meters;
    this.statTime.textContent = metrics.mins;

    // Build waypoint turn-by-turn stop list
    const namedStops = path.filter(id => this.rooms.find(r => r.id === id));
    this.stepsList.innerHTML = '';
    const majorStops = namedStops.filter((id, i) => i === 0 || i === namedStops.length - 1 || this.rooms.find(r => r.id === id));

    majorStops.forEach((id, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="num">${i + 1}</span> ${this.getLabel(id)}`;
      this.stepsList.appendChild(li);
    });

    this.routeCard.classList.add('show');
    this.mapSub.textContent = `🐣 Following the trail from ${this.getLabel(this.fromId)} to ${this.getLabel(this.toId)}`;
  }

  /**
   * Hides active route details.
   */
  hideRoute() {
    this.routeCard.classList.remove('show');
    this.renderer.clearRoute();
  }

  /**
   * Refreshes map pin markers.
   */
  refreshMapState() {
    this.renderer.refreshPins(this.fromId, this.toId, this.nodes);
  }

  /**
   * Simulates QR location detection scan.
   */
  simulateQRScan() {
    this.qrBtn.innerHTML = "📡 Scanning…";
    this.qrBtn.disabled = true;

    setTimeout(() => {
      const qrTargets = this.graphMeta.qrTargets;
      const pick = qrTargets[Math.floor(Math.random() * qrTargets.length)];
      this.pickFrom(pick);
      this.qrBtn.innerHTML = "📷 Scan QR to detect my location";
      this.qrBtn.disabled = false;
      this.showToast("📍 QR detected — you're at " + this.getLabel(pick));
    }, 750);
  }

  /**
   * Displays multi-floor staircase lock modal.
   * @param {string} stairId - Staircase room ID
   */
  showLock(stairId) {
    this.lockTitle.textContent = this.getLabel(stairId) + " leads upstairs";
    this.lockModal.classList.add('show');
  }

  /**
   * Displays temporary toast notification message.
   * @param {string} msg - Message text
   */
  showToast(msg) {
    this.toast.textContent = msg;
    this.toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.classList.remove('show'), 2400);
  }

  /**
   * Renders floor tab buttons (Ground floor active, upper floors locked).
   */
  renderFloorTabs() {
    this.floorTabs.innerHTML = '';
    ["G", "1", "2", "3", "4"].forEach((f, i) => {
      const btn = document.createElement('button');
      btn.className = 'floor-tab' + (i === 0 ? ' active' : ' locked');
      btn.innerHTML = i === 0 ? "Ground" : ("Floor " + f + (i > 0 ? ' 🔒' : ''));

      if (i > 0) {
        const tip = document.createElement('span');
        tip.className = 'tip';
        tip.textContent = 'Reachable via staircase — coming soon';
        btn.appendChild(tip);
        btn.onclick = () => this.showToast("🔒 Floor " + f + " isn't wired up yet in this proof of concept");
      }
      this.floorTabs.appendChild(btn);
    });
  }

  /**
   * Renders category legend items.
   */
  renderLegend() {
    this.legend.innerHTML = '';
    Object.values(this.categories).forEach(c => {
      const d = document.createElement('div');
      d.className = 'legend-item';
      d.innerHTML = `<span class="legend-dot" style="background:${c.dot}"></span>${c.label}`;
      this.legend.appendChild(d);
    });
  }
}
