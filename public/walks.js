/* walks.js — walks listing, filtering, modal, and join logic for walks.html */

// ---- CONFIG ----
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const supabase = createClient(
  'https://zsujhugkllbnqidswkgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzdWpodWdrbGxibnFpZHN3a2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDEzMDksImV4cCI6MjA4Nzg3NzMwOX0.uhVV5pfHjADE19ZrSUdvVKGi3ZgmRi9c0VRClCC8NsM'
);

mapboxgl.accessToken = 'pk.eyJ1IjoidHlwaWNhbGl0eSIsImEiOiJjbW02cTAyM2swZ205MnFxNnNiMmFiOWp1In0.AyVjTmE5MbPnGquJ_NodiQ';

// ---- LOCATION ----
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      }
    );
  });
}

// ---- STATE ----
let currentFilter = 'all';
const joinedWalks = new Set();
let walkMap = null;

// ---- MODAL ----
function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  const dt = new Date(Date.now() + 30 * 60 * 1000);
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  document.getElementById('f-time').value = local;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

// ---- FILTERS ----
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    loadWalks(currentFilter);
  });
});

// ---- LOAD WALKS ----
async function loadWalks(filter = 'all') {
  const grid = document.getElementById('walks-grid');
  grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading walks...</p></div>`;

  try {
    let query = supabase.from('walks').select('*').order('isotime', { ascending: true });
    if (filter !== 'all') query = query.eq('type', filter);

    const { data: walks, error } = await query;

    if (error) throw error;
    renderWalks(walks || []);
  } catch (err) {
    grid.innerHTML = `
      <div class="loading-state">
        <div style="font-size:40px;">⚠️</div>
        <p style="color:var(--gray-700);">Could not load walks. ${err.message}</p>
      </div>`;
  }
}

// ---- RENDER WALKS ----
function renderWalks(walks) {
  const grid = document.getElementById('walks-grid');
  if (!walks || walks.length === 0) {
    grid.innerHTML = `
      <div class="loading-state" style="grid-column:1/-1;">
        <div style="font-size:48px;">🚶</div>
        <div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--gray-700);">No walks found</div>
        <p>Be the first to post a walk in this category!</p>
        <button class="btn-primary" onclick="openModal()" style="margin-top:16px;">+ Post a Walk</button>
      </div>`;
    return;
  }
  grid.innerHTML = walks.map(buildCardHTML).join('');
}

function buildCardHTML(walk) {
  // 1. Safe fallbacks for Supabase case-insensitivity
  const max = walk.maxSpots ?? walk.maxspots ?? 1;
  const joined = walk.joinedSpots ?? walk.joinedspots ?? 0;
  const left = max - joined - 1, full = left <= 0, myWalk = joinedWalks.has(walk.id);
  
  // 2. Compact date/time math
  const d = new Date(walk.isoTime || walk.isotime), now = new Date();
  const diff = Math.round((new Date(d).setHours(0,0,0,0) - new Date(now).setHours(0,0,0,0)) / 864e5);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateStr = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' 
    : (diff > 1 && diff < 7) ? d.toLocaleDateString([], { weekday: 'long' }) 
    : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });

  // 3. Return HTML
  return `
    <div class="walk-card" id="walk-${walk.id}">
      <div class="walk-card-top">
        <div class="walk-user">
          <div class="avatar ${walk.avatarClass || ''}">${walk.initials || '?'}</div>
          <div><div class="walk-user-name">${walk.name}</div><div class="walk-user-year">${walk.year} · UD Verified ✓</div></div>
        </div>
        <span class="walk-type-badge ${walk.typeBadge || ''}">${walk.typeLabel || 'Walk'}</span>
      </div>

      <div class="walk-route"><span class="walk-route-from">${walk.from}</span> → <span class="walk-route-to">${walk.to}</span></div>

      <div class="walk-meta">
        <div class="walk-meta-item"><span class="walk-meta-icon">🕐</span> ${dateStr}, at ${time}</div>
        <div class="walk-meta-item" id="spots-meta-${walk.id}"><span class="walk-meta-icon">👥</span> ${full ? 'Full' : `${left} spot${left !== 1 ? 's' : ''} left`}</div>
      </div>

      <div class="walk-spots">
        <div class="walk-spots-text"><span>Group size</span> <strong id="spots-count-${walk.id}">${joined + 1} / ${max} people</strong></div>
        <div class="spots-bar"><div class="spots-fill" id="spots-fill-${walk.id}" style="width:${Math.round(((joined + 1) / max) * 100)}%"></div></div>
      </div>

      <div class="walk-tags">${walk.tags?.map(t => `<span class="tag">${t}</span>`).join('') || ''}</div>
      ${walk.notes ? `<p class="walk-notes">"${walk.notes}"</p>` : ''}

     <div class="walk-card-footer">
      <span class="walk-card-time">Posted recently</span>
      <button class="btn-join ${myWalk ? 'joined' : full ? 'full' : ''}" id="join-btn-${walk.id}" onclick="joinWalk('${walk.id}')" ${full || myWalk ? 'disabled' : ''}>
        ${myWalk ? '✓ Joined!' : full ? 'Walk Full' : 'Join Walk →'}
      </button>
      ${myWalk ? `<button class="btn-view-map" onclick="openWalkMap('${walk.id}')">View Map 🗺️</button>` : ''}
    </div>
    </div>`;
}

// ---- JOIN WALK ----
async function joinWalk(id) {
  if (joinedWalks.has(id)) return;

  const btn = document.getElementById(`join-btn-${id}`);
  if (!btn || btn.disabled) return;

  const email =
    document.getElementById('f-email')?.value ||
    prompt('Enter your UD email');

  if (!email?.toLowerCase().endsWith('@udel.edu')) {
    alert('UD email required');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Joining...';

  try {
    // 1. Fetch the walk safely without guessing the column capitalization
    const { data: currentWalk, error: fetchError } = await supabase
      .from('walks')
      .select('*') 
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Safely read the lowercase value from the database
    const currentSpots = currentWalk.joinedspots || 0;

    // 3. Update the database using ONLY the lowercase column name
    const { data: walk, error: updateError } = await supabase
      .from('walks')
      .update({ joinedspots: currentSpots + 1 }) 
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    joinedWalks.add(id);

    alert(`🎉 You joined ${walk.name}'s walk!`);

    // Show route immediately
    openWalkMap(id);

    // Optional: reload walks grid
    await loadWalks(currentFilter);

  } catch (err) {
    alert('Could not join walk: ' + err.message);
    btn.disabled = false;
    btn.textContent = 'Join Walk →';
  }
}

// ---- SUBMIT WALK ----
async function submitWalk(e) {
  e.preventDefault();

  const name = document.getElementById('f-name').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const year = document.getElementById('f-year').value;
  const from = document.getElementById('f-from').value.trim();
  const to = document.getElementById('f-to').value.trim();
  const isotime = document.getElementById('f-time').value;
  const maxspots = parseInt(document.getElementById('f-size').value, 10);
  const type = document.getElementById('f-type').value;
  const notes = document.getElementById('f-notes').value.trim();

  try {
    // 🔥 Get current location (START)
    const location = await getCurrentLocation();

    // 🔥 Geocode destination (END)
    const geoRes = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(to)}.json?access_token=${mapboxgl.accessToken}`
    );

    const geoData = await geoRes.json();

    if (!geoData.features.length) {
      throw new Error("Destination not found");
    }

    const [destLng, destLat] = geoData.features[0].center;

    const { error } = await supabase.from('walks').insert([{
      name,
      email,
      year,
      from,
      to,
      isotime,
      maxspots,
      type,
      notes,
      joinedspots: 0,
      fromlat: location.lat,
      fromlng: location.lng,
      tolat: destLat,
      tolng: destLng
    }]);

    if (error) throw error;

    alert("✅ Walk posted!");
    closeModal();
    await loadWalks(currentFilter);

  } catch (err) {
    alert("Error posting walk: " + err.message);
  }
}

// ---- MAPBOX ----
async function openWalkMap(walkId) {
  try {
    const { data: walk, error } = await supabase
      .from('walks')
      .select('*')
      .eq('id', walkId)
      .single();
    if (error) throw error;

    document.getElementById('map-modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';

    if (walkMap) walkMap.remove();

    walkMap = new mapboxgl.Map({
      container: 'walk-map-container',
      style: 'mapbox://styles/mapbox/streets-v12', // realistic style
      center: [walk.fromlng, walk.fromlat],
      zoom: 16,
      pitch: 45,
      bearing: -20,
      antialias: true
    });

    walkMap.on('style.load', () => {
      // 3D buildings
      const layers = walkMap.getStyle().layers;
      const labelLayerId = layers.find(
        layer => layer.type === 'symbol' && layer.layout['text-field']
      )?.id;

      walkMap.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#d6d6d6',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15, 0,
            16, ['get', 'height']
          ],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.7
        }
      }, labelLayerId);

      // Markers
      new mapboxgl.Marker({ color: '#2e86de' })
        .setLngLat([walk.fromlng, walk.fromlat])
        .setPopup(new mapboxgl.Popup().setText(`Start: ${walk.from}`))
        .addTo(walkMap);

      new mapboxgl.Marker({ color: '#e74c3c' })
        .setLngLat([walk.tolng, walk.tolat])
        .setPopup(new mapboxgl.Popup().setText(`Destination: ${walk.to}`))
        .addTo(walkMap);

      // Draw route
      drawWalkRoute(walk.fromlng, walk.fromlat, walk.tolng, walk.tolat);
    });

  } catch (err) {
    alert('Could not load map: ' + err.message);
  }
}

async function drawWalkRoute(fromLng, fromLat, toLng, toLat) {
  try {
    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/walking/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
    );
    const data = await res.json();
    if (!data.routes?.length) return;

    const route = data.routes[0].geometry; // GeoJSON LineString

    // Remove old route if exists
    if (walkMap.getSource('route')) {
      if (walkMap.getLayer('route-line')) walkMap.removeLayer('route-line');
      walkMap.removeSource('route');
    }

    // Add new route
    walkMap.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: route } });

    walkMap.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#1abc9c', 'line-width': 6 }
    });

    // Fit map to route bounds
    const bounds = route.coordinates.reduce(
      (b, coord) => b.extend(coord),
      new mapboxgl.LngLatBounds(route.coordinates[0], route.coordinates[0])
    );
    walkMap.fitBounds(bounds, { padding: 80, maxZoom: 18, pitch: 45, bearing: -20 });

  } catch (err) {
    console.error('Failed to draw route:', err);
  }
}

// Close map
function closeWalkMap() {
  document.getElementById('map-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  if (walkMap) { walkMap.remove(); walkMap = null; }
}

// ---- INIT ----
loadWalks();

window.openModal = openModal;
window.closeModal = closeModal;
window.joinWalk = joinWalk;
window.submitWalk = submitWalk;
window.openWalkMap = openWalkMap;   // if you're using it
window.closeWalkMap = closeWalkMap; // if you're using it