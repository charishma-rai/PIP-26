/**
 * ============================================================================
 * PIP'S WAY - SEARCH & QR FUNCTIONALITY MODULE (js/search.js)
 * ============================================================================
 * Manages search autocomplete dropdowns, room filtering, simulated QR location
 * scanning, and dynamic location QR code generation.
 */

/**
 * Filters rooms by query and renders autocomplete dropdown list.
 * @param {HTMLElement} container - Results dropdown DOM container
 * @param {string} query - Search term entered by user
 * @param {string|null} excludeId - Room ID to exclude from search results
 * @param {Array} rooms - Array of all room objects
 * @param {Object} categories - Categories map with dot colors
 * @param {Function} onPick - Selection callback handler (roomId => void)
 */
export function buildResults(container, query, excludeId, rooms, categories, onPick) {
  container.innerHTML = '';
  const q = query.trim().toLowerCase();

  const list = rooms
    .filter(r => r.id !== excludeId && r.name.toLowerCase().includes(q))
    .slice(0, 40);

  if (!list.length) {
    container.classList.remove('show');
    return;
  }

  list.forEach(r => {
    const item = document.createElement('div');
    item.className = 'result-item';
    const catDot = categories[r.cat]?.dot || '#B79CE0';
    item.innerHTML = `<span class="cat-dot" style="background:${catDot}"></span>${r.name}`;
    item.onclick = () => {
      onPick(r.id);
      container.classList.remove('show');
    };
    container.appendChild(item);
  });

  container.classList.add('show');
}

/**
 * Constructs current page URL with ?loc=<roomId> query parameter.
 * @param {string} roomId - Selected room ID
 * @returns {string} Fully qualified location URL
 */
export function locUrl(roomId) {
  const u = new URL(window.location.href);
  u.searchParams.set('loc', roomId);
  return u.toString();
}

/**
 * Generates location QR codes inside modal dialog container.
 * @param {HTMLElement} gridElement - Container grid element
 * @param {Array} qrTargets - List of room IDs to generate QR codes for
 * @param {Array} rooms - List of room objects
 * @param {Function} getLabel - Helper function to get human-readable room name
 */
export function generateQRCodes(gridElement, qrTargets, rooms, getLabel) {
  if (gridElement.dataset.built) return;

  qrTargets.forEach(id => {
    const cell = document.createElement('div');
    cell.style.textAlign = 'center';

    const box = document.createElement('div');
    box.style.background = '#fff';
    box.style.padding = '8px';
    box.style.borderRadius = '10px';
    box.style.display = 'inline-block';
    cell.appendChild(box);

    const cap = document.createElement('div');
    cap.style.fontWeight = '700';
    cap.style.fontSize = '12.5px';
    cap.style.marginTop = '6px';
    cap.textContent = getLabel(id);
    cell.appendChild(cap);

    gridElement.appendChild(cell);

    if (window.QRCode) {
      new window.QRCode(box, {
        text: locUrl(id),
        width: 120,
        height: 120,
        colorDark: "#4A4258",
        colorLight: "#ffffff"
      });
    }
  });

  gridElement.dataset.built = "1";
}
