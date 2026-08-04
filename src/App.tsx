import React, { useEffect, useState, useRef } from 'react';
import ROOMS_DATA from '../lib/data/rooms.json';
import CATS_DATA from '../lib/data/categories.json';
import COURTYARDS_DATA from '../lib/data/courtyards.json';
import { QRScannerModal } from './components/QRScannerModal';

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

export interface Category {
  label: string;
  color: string;
  dot: string;
}

export interface RouteResponse {
  from: string;
  to: string;
  waypoints: Array<{ x: number; y: number; id?: string }>;
  distance: number;
  meters: number;
  minutes: number;
  namedStops: Array<{ id: string; name: string }>;
  stepsCount: number;
}

export const App: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>(ROOMS_DATA as Room[]);
  const [cats, setCats] = useState<Record<string, Category>>(CATS_DATA as Record<string, Category>);

  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);

  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');

  const [showFromResults, setShowFromResults] = useState(false);
  const [showToResults, setShowToResults] = useState(false);

  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const [stairLockId, setStairLockId] = useState<string | null>(null);
  const [activeFloor, setActiveFloor] = useState('G');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [mapSubText, setMapSubText] = useState('Tap any room to preview · search on the left to route');

  const toastTimerRef = useRef<number | null>(null);

  // Fetch initial data from API endpoints (with fallback to imported JSON)
  useEffect(() => {
    fetch('/api/rooms')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setRooms(data); })
      .catch(() => {});

    fetch('/api/categories')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setCats(data); })
      .catch(() => {});
  }, []);

  // Auto-detect ?loc= roomId on initial page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loc = params.get('loc');
    if (loc) {
      const match = rooms.find((r) => r.id === loc);
      if (match) {
        if (match.cat === 'stair') {
          showLock(loc);
        } else {
          setFromId(loc);
          showToast(`📍 QR detected — you're at ${match.name}`);
        }
      }
    }
  }, [rooms]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 2600);
  };

  const showLock = (stairId: string) => {
    setStairLockId(stairId);
  };

  const roomLabel = (id: string | null) => {
    if (!id) return '';
    return rooms.find((r) => r.id === id)?.name || id;
  };

  const pickFrom = (id: string) => {
    const target = rooms.find((r) => r.id === id);
    if (target?.cat === 'stair') {
      showLock(id);
      return;
    }
    setFromId(id);
    setFromQuery('');
    setShowFromResults(false);
    setRouteResult(null);
  };

  const pickTo = (id: string) => {
    const target = rooms.find((r) => r.id === id);
    if (target?.cat === 'stair') {
      showLock(id);
      return;
    }
    setToId(id);
    setToQuery('');
    setShowToResults(false);
    setRouteResult(null);
  };

  const clearFrom = () => {
    setFromId(null);
    setRouteResult(null);
  };

  const clearTo = () => {
    setToId(null);
    setRouteResult(null);
  };

  const swapLocations = () => {
    const prevFrom = fromId;
    setFromId(toId);
    setToId(prevFrom);
    setRouteResult(null);
  };

  const handleFindRoute = async () => {
    if (!fromId || !toId) return;
    setIsLoadingRoute(true);
    try {
      const res = await fetch(`/api/route?from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}`);
      if (!res.ok) {
        showToast('No route found 😢');
        setRouteResult(null);
        return;
      }
      const data: RouteResponse = await res.json();
      setRouteResult(data);
      setMapSubText(`🐣 Following the trail from ${roomLabel(fromId)} to ${roomLabel(toId)}`);
    } catch (err) {
      showToast('Error finding route 😢');
      setRouteResult(null);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const previewRoom = (id: string) => {
    const r = rooms.find((x) => x.id === id);
    if (!r) return;
    if (r.cat === 'stair') {
      showLock(id);
      return;
    }
    setMapSubText(`📌 ${r.name}`);
  };

  const filteredFromRooms = rooms
    .filter((r) => r.id !== toId && r.name.toLowerCase().includes(fromQuery.trim().toLowerCase()))
    .slice(0, 40);

  const filteredToRooms = rooms
    .filter((r) => r.id !== fromId && r.name.toLowerCase().includes(toQuery.trim().toLowerCase()))
    .slice(0, 40);

  // SVG Path calculation
  let pathD = '';
  if (routeResult && routeResult.waypoints.length > 0) {
    pathD = `M ${routeResult.waypoints[0].x} ${routeResult.waypoints[0].y} ` +
      routeResult.waypoints.slice(1).map((pt) => `L ${pt.x} ${pt.y}`).join(' ');
  }

  const fromRoom = rooms.find((r) => r.id === fromId);
  const toRoom = rooms.find((r) => r.id === toId);

  return (
    <div>
      {/* Top Bar */}
      <div className="topbar">
        <div className="brand">
          <div className="brand-badge">🐣</div>
          <div>
            <h1>Pip's Way</h1>
            <p>Smart Department Navigator · Proof of Concept</p>
          </div>
        </div>
        <div className="floor-tabs">
          {['G', '1', '2', '3', '4'].map((f, i) => (
            <button
              key={f}
              className={`floor-tab ${i === 0 ? 'active' : 'locked'}`}
              onClick={() => {
                if (i > 0) showToast(`🔒 Floor ${f} isn't wired up yet in this proof of concept`);
              }}
            >
              {i === 0 ? 'Ground' : `Floor ${f} 🔒`}
              {i > 0 && <span className="tip">Reachable via staircase — coming soon</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="layout">
        {/* Left Panel */}
        <div className="card">
          <div className="panel-title">🧭 Plan your route</div>

          {/* Starting Location Input */}
          <div className="field-label">📍 I am starting at…</div>
          <div className="search-wrap">
            <input
              className="search-input"
              placeholder="Search a room, e.g. Store Room"
              value={fromQuery}
              onChange={(e) => { setFromQuery(e.target.value); setShowFromResults(true); }}
              onFocus={() => setShowFromResults(true)}
            />
            {showFromResults && filteredFromRooms.length > 0 && (
              <div className="search-results show">
                {filteredFromRooms.map((r) => (
                  <div
                    key={r.id}
                    className="result-item"
                    onClick={() => pickFrom(r.id)}
                  >
                    <span className="cat-dot" style={{ background: cats[r.cat]?.dot || '#B79CE0' }} />
                    {r.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {fromId ? (
            <div className="chosen-chip">
              📍 {roomLabel(fromId)} <span className="x" onClick={clearFrom}>✕</span>
            </div>
          ) : (
            <div className="chosen-chip empty">Nothing selected yet</div>
          )}

          <button className="qr-btn" onClick={() => setIsScannerOpen(true)}>
            📷 Scan QR to detect my location
          </button>
          <a
            className="qr-btn"
            href="/api/qr-sheet"
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginTop: '8px' }}
          >
            🖨️ Generate location QR codes
          </a>

          {/* Swap Button */}
          <div className="swap-row">
            <button className="swap-btn" title="Swap" onClick={swapLocations}>
              ⇅
            </button>
          </div>

          {/* Destination Input */}
          <div className="field-label">🎯 I want to go to…</div>
          <div className="search-wrap">
            <input
              className="search-input"
              placeholder="Search a room, e.g. AIML Lab 2"
              value={toQuery}
              onChange={(e) => { setToQuery(e.target.value); setShowToResults(true); }}
              onFocus={() => setShowToResults(true)}
            />
            {showToResults && filteredToRooms.length > 0 && (
              <div className="search-results show">
                {filteredToRooms.map((r) => (
                  <div
                    key={r.id}
                    className="result-item"
                    onClick={() => pickTo(r.id)}
                  >
                    <span className="cat-dot" style={{ background: cats[r.cat]?.dot || '#B79CE0' }} />
                    {r.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {toId ? (
            <div className="chosen-chip">
              🎯 {roomLabel(toId)} <span className="x" onClick={clearTo}>✕</span>
            </div>
          ) : (
            <div className="chosen-chip empty">Nothing selected yet</div>
          )}

          {/* Find Route Button */}
          <button
            className="go-btn"
            disabled={!fromId || !toId || isLoadingRoute}
            onClick={handleFindRoute}
          >
            {isLoadingRoute ? '🐾 Finding route…' : '🐾 Find my way'}
          </button>

          {/* Route Stats & Steps Card */}
          {routeResult && (
            <div className="route-card show">
              <div className="field-label">Route found</div>
              <div className="route-stats">
                <div className="stat">
                  <b>{routeResult.stepsCount}</b>
                  <span>waypoints</span>
                </div>
                <div className="stat">
                  <b>{routeResult.meters}</b>
                  <span>meters~</span>
                </div>
                <div className="stat">
                  <b>{routeResult.minutes}</b>
                  <span>min walk</span>
                </div>
              </div>
              <ol className="steps">
                {routeResult.namedStops.map((stop, i) => (
                  <li key={stop.id + i}>
                    <span className="num">{i + 1}</span> {stop.name}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Category Legend */}
          <div className="legend">
            {Object.entries(cats).map(([key, cat]) => (
              <div key={key} className="legend-item">
                <span className="legend-dot" style={{ background: cat.dot }} />
                {cat.label}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Map */}
        <div className="card map-card">
          <div className="map-header">
            <h2>Ground Floor</h2>
            <div className="sub">{mapSubText}</div>
          </div>
          <div className="map-scroll">
            <svg id="floorplan" viewBox="0 0 1594 2255" xmlns="http://www.w3.org/2000/svg">
              {/* Floorplan PNG Image */}
              <image href="/floorplan.png" x="0" y="0" width="1594" height="2255" />

              {/* Invisible Clickable Room Hitboxes */}
              <g id="roomHitboxes">
                {rooms.map((r) => {
                  if (r.virtual || r.x === null || r.y === null) return null;
                  return (
                    <rect
                      key={r.id}
                      x={r.x}
                      y={r.y}
                      width={r.w}
                      height={r.h}
                      fill="transparent"
                      className="room-rect"
                      onClick={() => previewRoom(r.id)}
                    >
                      <title>{r.name}</title>
                    </rect>
                  );
                })}
              </g>

              {/* Animated Path Layer */}
              {pathD && (
                <g id="pathLayer">
                  <path d={pathD} className="path-line" />
                  <path d={pathD} className="path-line-dash" />
                  <g>
                    <text className="walker" textAnchor="middle" dy="6">
                      🐣
                    </text>
                    <animateMotion dur="2.2s" repeatCount="indefinite" rotate="auto" path={pathD} />
                  </g>
                </g>
              )}

              {/* Map Pins Layer */}
              <g id="pinLayer">
                {fromRoom && (
                  <g className="pin pin-from" transform={`translate(${fromRoom.node[0]},${fromRoom.node[1]})`}>
                    <path
                      d="M0,-34 C10,-34 17,-27 17,-17 C17,-6 0,4 0,4 C0,4 -17,-6 -17,-17 C-17,-27 -10,-34 0,-34 Z"
                      fill="#E8A0BF"
                      stroke="#fff"
                      strokeWidth="2.5"
                    />
                    <circle cx="0" cy="-17" r="6" fill="#fff" />
                  </g>
                )}
                {toRoom && (
                  <g className="pin pin-to" transform={`translate(${toRoom.node[0]},${toRoom.node[1]})`}>
                    <path
                      d="M0,-34 C10,-34 17,-27 17,-17 C17,-6 0,4 0,4 C0,4 -17,-6 -17,-17 C-17,-27 -10,-34 0,-34 Z"
                      fill="#7FC9AE"
                      stroke="#fff"
                      strokeWidth="2.5"
                    />
                    <circle cx="0" cy="-17" r="6" fill="#fff" />
                  </g>
                )}
              </g>
            </svg>
          </div>
        </div>
      </div>

      <footer>
        Ground floor is a live proof of concept · graph-based A* pathfinding · architecture scales to all 5 floors, with stairwells linking each level 🌿
      </footer>

      {/* Staircase Lock Modal */}
      {stairLockId && (
        <div className="lock-modal show" onClick={() => setStairLockId(null)}>
          <div className="lock-box" onClick={(e) => e.stopPropagation()}>
            <div className="emoji">🔒🪜</div>
            <h3>{roomLabel(stairLockId)} leads upstairs</h3>
            <p>
              Multi-floor routing is on the roadmap — for this proof of concept, only the Ground Floor graph is wired up.
            </p>
            <button onClick={() => setStairLockId(null)}>Got it</button>
          </div>
        </div>
      )}

      {/* Camera QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(scannedId) => pickFrom(scannedId)}
        rooms={rooms.filter((r) => r.cat !== 'stair')}
      />

      {/* Toast Notification */}
      {toastMsg && <div className="toast show">{toastMsg}</div>}
    </div>
  );
};
