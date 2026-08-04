# Pip's Way · Smart Department Navigator 🐣

A modular, graph-based indoor floor navigation web application designed for campus/building navigation. This project implements vector-based SVG map rendering, dynamic graph construction with perpendicular corridor projection, obstacle line-of-sight checking, and A* shortest-path routing algorithm.

---

## 📁 Directory & Module Structure

```
Project/
│── index.html              # Main HTML5 application entry point
│── styles.css              # Design system CSS tokens & UI styling
│── script.js              # Application bootstrapper (loads JSON & initializers)
│── original-prototype.html # Backup copy of single-file prototype
│── js/
│     ├── graph.js          # Graph construction, geometry, LOS check & segment projection
│     ├── pathfinding.js    # Pure A* shortest path search algorithm & route metrics
│     ├── renderer.js       # SVG floor plan map, pins & animated path line rendering
│     ├── search.js         # Room autocomplete search engine & QR code generator
│     └── ui.js             # UI Controller, DOM event handlers & state management
│── data/
│     ├── categories.json   # Taxonomy of room categories & pastel color tokens
│     ├── rooms.json        # 37 room definitions (coordinates, door nodes & labels)
│     ├── nodes.json        # Hand-traced walkable corridor pathway network
│     └── graph.json        # Courtyard obstacle boundaries & map metadata
│── assets/
│     └── floor-map.png     # Floor plan map graphic asset
└── README.md               # Technical project documentation
```

---

## ⚙️ How Node-Based Navigation Works

Indoor navigation differs from GPS because satellite signals cannot reliably penetrate multistory buildings. Pip's Way solves this using a **node-based graph representation**:

1. **Walkable Corridor Network (`data/nodes.json`)**: Pre-mapped polylines represent walkable hallways across the building envelope.
2. **Room Entrance Nodes (`data/rooms.json`)**: Each room has an assigned "door node" coordinate `[x, y]`.
3. **Graph Assembly (`js/graph.js`)**:
   - Corridor lines are parsed into graph nodes and weighted edges $w = \sqrt{\Delta x^2 + \Delta y^2}$.
   - Every room entrance is dynamically projected onto the nearest walkable corridor segment.
   - **Line-of-Sight (LOS) Filtering**: A line segment intersection check (`hasClearLOS`) ensures room door nodes never connect through walls or courtyard obstacles.
   - If a projected point falls mid-corridor, the segment is automatically split, connecting the room cleanly to the hallway network.

---

## 🧮 How Shortest-Path Routing Works (A* Algorithm)

Route planning uses the **A* (A-Star)** pathfinding algorithm implemented in `js/pathfinding.js`:

### Mathematical Formulation
For any graph node $n$:
$$f(n) = g(n) + h(n)$$

- $g(n)$: Exact path cost from the starting room to node $n$.
- $h(n)$: Admissible Euclidean distance heuristic from node $n$ to the destination room $g$:
  $$h(n) = \sqrt{(x_n - x_g)^2 + (y_n - y_g)^2}$$
- $f(n)$: Total estimated route cost through node $n$.

A* guarantees finding the shortest walkable path while exploring the minimal number of nodes.

---

## 📷 QR Code Location Detection

Pip's Way supports physical QR code location tags:
- **Generation**: Each room QR encodes a URL appended with `?loc=<room_id>`.
- **Auto-Detection**: Opening the URL (e.g. from a mobile camera scan) automatically populates "I am starting at…" with the scanned location without requiring manual typing.

---

## 🚀 How to Run Locally & Deploy

Because this project is built using native HTML5, CSS3, and modern ES Modules JavaScript, **no Node.js, npm build tools, or backend servers are required**.

### Local Execution
To satisfy browser security policies for local `fetch()` requests of JSON data, run a simple static web server:

#### Option 1: VS Code Live Server Extension
1. Open the project folder in VS Code.
2. Right-click `index.html` and select **Open with Live Server**.

#### Option 2: Python HTTP Server (Command Line)
```bash
python -m http.server 8000
```
Open `http://localhost:8000` in your web browser.

#### Option 3: Node `npx serve`
```bash
npx serve .
```

### Static Hosting Deployment
You can deploy this repository directly to any static web host:
- **GitHub Pages**: Enable Pages in repository settings pointing to main branch.
- **Netlify / Vercel**: Import repository without build commands.

---

## 🌿 Technical Specifications & Maintenance
- **Language**: JavaScript (ES6+ Modules), HTML5, CSS3.
- **Dependencies**: QRCode.js (`qrcode.min.js` via CDN for QR code rendering).
- **Scalability**: Graph architecture easily scales to multi-floor maps by adding floor node layers connected via staircase transition edges.
