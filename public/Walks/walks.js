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
let currentUserId = null;
let walkMap = null;
let geolocateControl = null;
let activeMapTheme = 'streets';
let currentWalkData = null;
let userLocation = null;   // cached once on modal open
let fromCoords = null;     // set when user picks a suggestion for From
let toCoords = null;       // set when user picks a suggestion for To
let routeCoordinates = null; // full route coords array for progress tracking

// ---- LOCATION BROADCAST STATE ----
let locationInterval = null;
let locationChannel = null;
const participantMarkers = new Map(); // userId -> mapboxgl.Marker

const MAP_STYLES = {
  streets:    { url: 'mapbox://styles/mapbox/streets-v12',          pitch: 45, bearing: -20, buildings: true,  enhance: false },
  'sat-flat': { url: 'mapbox://styles/mapbox/satellite-streets-v12', pitch: 0,  bearing: 0,   buildings: false, enhance: true  },
  'sat-3d':   { url: 'mapbox://styles/mapbox/satellite-streets-v12', pitch: 45, bearing: -20, buildings: true,  enhance: true  }
};

// ---- MODAL ----
function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  const dt = new Date(Date.now() + 30 * 60 * 1000);
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  document.getElementById('f-time').value = local;

  // Pre-fetch location so autocomplete has proximity bias ready
  if (!userLocation) {
    getCurrentLocation().then(loc => { userLocation = loc; }).catch(() => {});
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  fromCoords = null;
  toCoords = null;
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

const WALK_TYPE_STYLES = {
  night:    { label: '🌙 Night Safety',    class: 'badge-night' },
  morning:  { label: '☀️ Morning',        class: 'badge-morning' },
  study:    { label: '📚 Study Break',    class: 'badge-study' },
  exercise: { label: '🏃 Exercise',       class: 'badge-exercise' },
  casual:   { label: '😊 Casual',        class: 'badge-casual' }
};

function buildCardHTML(walk) {
  // 1. Safe fallbacks for Supabase case-insensitivity
  const max = walk.maxSpots ?? walk.maxspots ?? 1;
  const joined = walk.joinedSpots ?? walk.joinedspots ?? 0;
  const left = max - joined - 1, full = left <= 0, myWalk = joinedWalks.has(walk.id);
  const isCreator = currentUserId && walk.created_by === currentUserId;
  
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
        ${(() => {
          const typeInfo = WALK_TYPE_STYLES[walk.type] || { label: 'Walk', class: '' };
          return `<span class="walk-type-badge ${typeInfo.class}">${typeInfo.label}</span>`;
        })()}
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
      <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
        ${isCreator
          ? `<button class="btn-end-walk" onclick="endWalk('${walk.id}')">End Walk 🛑</button>`
          : `<button class="btn-join ${myWalk ? 'joined' : full ? 'full' : ''}" id="join-btn-${walk.id}" onclick="joinWalk('${walk.id}')" ${full || myWalk ? 'disabled' : ''}>
               ${myWalk ? '✓ Joined!' : full ? 'Walk Full' : 'Join Walk →'}
             </button>`
        }
        ${myWalk ? `<button class="btn-view-map" onclick="openWalkMap('${walk.id}')">View Map 🗺️</button>` : ''}
        ${isCreator ? `<button class="btn-view-map" onclick="openWalkMap('${walk.id}')">View Map 🗺️</button>` : ''}
      </div>
    </div>
    </div>`;
}

// ---- LOGIN PROMPT ----
function showLoginPrompt() {
  const container = document.getElementById('toast-container');
  if (!container) { window.location.href = '/Auth/auth.html'; return; }

  container.querySelector('.login-prompt-toast')?.remove();

  const toast = document.createElement('div');
  toast.className = 'toast toast-warn login-prompt-toast';
  toast.style.cssText = 'min-width:260px;';
  toast.innerHTML = `
    <div>
      <div style="font-weight:700;margin-bottom:4px;">Sign in to join walks</div>
      <div style="font-size:12px;opacity:0.8;margin-bottom:10px;">You need a TrailMate account to join a walk.</div>
      <a href="/Auth/auth.html" style="display:inline-block;background:#fff;color:#00539F;font-weight:700;font-size:13px;padding:6px 16px;border-radius:6px;text-decoration:none;">Log In &rarr;</a>
    </div>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.4s ease both';
    setTimeout(() => toast.remove(), 400);
  }, 6000);
}

// ---- JOIN WALK ----
async function joinWalk(id) {
  if (joinedWalks.has(id)) return;

  const btn = document.getElementById(`join-btn-${id}`);
  if (!btn || btn.disabled) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { showLoginPrompt(); return; }

  btn.disabled = true;
  btn.textContent = 'Joining...';

  try {
    // Insert membership row — primary key (walk_id, user_id) rejects duplicates
    const { error: memberError } = await supabase
      .from('walk_members')
      .insert({ walk_id: id, user_id: session.user.id });

    // Code 23505 = unique violation: user already joined on another device
    if (memberError && memberError.code !== '23505') throw memberError;

    const alreadyJoined = memberError?.code === '23505';

    if (!alreadyJoined) {
      // First join — increment the spot count
      const { data: currentWalk, error: fetchError } = await supabase
        .from('walks').select('joinedspots, name').eq('id', id).single();
      if (fetchError) throw fetchError;

      const { data: walk, error: updateError } = await supabase
        .from('walks')
        .update({ joinedspots: (currentWalk.joinedspots || 0) + 1 })
        .eq('id', id).select().single();
      if (updateError) throw updateError;

      window.showToast?.(`Joined ${walk.name}'s walk!`, 'The map is loading...');
    }

    joinedWalks.add(id);
    openWalkMap(id);
    await loadWalks(currentFilter);

  } catch (err) {
    window.showToast?.('Could not join walk', err.message, true);
    btn.disabled = false;
    btn.textContent = 'Join Walk →';
  }
}

// ---- LOAD USER MEMBERSHIPS ----
// Restores joinedWalks from DB on page load / device switch
async function loadUserMemberships() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  currentUserId = session.user.id;
  const { data } = await supabase
    .from('walk_members')
    .select('walk_id')
    .eq('user_id', session.user.id);
  if (data) data.forEach(m => joinedWalks.add(m.walk_id));
}

// ---- LOCATION AUTOCOMPLETE ----
function setupAutocomplete(inputId, onSelect) {
  const input = document.getElementById(inputId);
  let debounce;

  function removeDropdown() {
    input.parentElement.querySelector('.location-suggestions')?.remove();
  }

  input.addEventListener('input', () => {
    onSelect(null); // clear stored coords whenever user edits manually
    clearTimeout(debounce);
    const q = input.value.trim();
    if (q.length < 2) { removeDropdown(); return; }

    debounce = setTimeout(async () => {
      try {
        // ~30 miles in degrees at ~39°N (Delaware area)
        const D_LAT = 0.435;
        const D_LNG = 0.566;

        let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
          `?access_token=${mapboxgl.accessToken}&limit=5&types=address,poi,place,neighborhood`;

        if (userLocation) {
          const { lat, lng } = userLocation;
          url += `&proximity=${lng},${lat}`;
          url += `&bbox=${lng - D_LNG},${lat - D_LAT},${lng + D_LNG},${lat + D_LAT}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        renderDropdown(data.features || []);
      } catch {
        removeDropdown();
      }
    }, 300);
  });

  function renderDropdown(features) {
    removeDropdown();
    if (!features.length) return;

    const ul = document.createElement('ul');
    ul.className = 'location-suggestions';

    features.forEach(f => {
      const li = document.createElement('li');
      li.className = 'location-suggestion-item';
      const main = f.text || f.place_name.split(',')[0];
      const sub  = f.place_name.replace(f.text + ', ', '');
      li.innerHTML =
        `<span class="sugg-main">${main}</span>` +
        `<span class="sugg-sub">${sub}</span>`;

      li.addEventListener('mousedown', e => {
        e.preventDefault(); // keep input focused
        input.value = f.place_name;
        onSelect({ lat: f.center[1], lng: f.center[0] });
        removeDropdown();
      });

      ul.appendChild(li);
    });

    input.parentElement.appendChild(ul);
  }

  input.addEventListener('blur', () => setTimeout(removeDropdown, 200));
}

// ---- SUBMIT WALK ----
async function submitWalk(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn.disabled) return;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Posting...';

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
    // From: use selected autocomplete coords, otherwise fall back to GPS
    let fromlat, fromlng;
    if (fromCoords) {
      fromlat = fromCoords.lat;
      fromlng = fromCoords.lng;
    } else {
      const loc = await getCurrentLocation();
      fromlat = loc.lat;
      fromlng = loc.lng;
    }

    // To: use selected autocomplete coords, otherwise geocode the text
    let tolat, tolng;
    if (toCoords) {
      tolat = toCoords.lat;
      tolng = toCoords.lng;
    } else {
      const geoRes = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(to)}.json?access_token=${mapboxgl.accessToken}`
      );
      const geoData = await geoRes.json();
      if (!geoData.features.length) throw new Error("Destination not found");
      [tolng, tolat] = geoData.features[0].center;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be signed in to post a walk.');

    const { error } = await supabase.from('walks').insert([{
      name, email, year, from, to, isotime, maxspots, type, notes,
      joinedspots: 0,
      fromlat, fromlng, tolat, tolng,
      created_by: session.user.id
    }]);

    if (error) throw error;

    alert("✅ Walk posted!");
    closeModal();
    await loadWalks(currentFilter);

  } catch (err) {
    alert("Error posting walk: " + err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Post Walk 🚶';
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

    currentWalkData = walk;
    document.getElementById('map-modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';

    const sel = document.getElementById('map-theme-select');
    if (sel) sel.value = activeMapTheme;

    if (walkMap) { walkMap.remove(); walkMap = null; }
    initMap(walk);

  } catch (err) {
    alert('Could not load map: ' + err.message);
  }
}

function initMap(walk) {
  const theme = MAP_STYLES[activeMapTheme];

  document.getElementById('walk-map-container')
    .classList.toggle('map-sat-enhance', theme.enhance);

  walkMap = new mapboxgl.Map({
    container: 'walk-map-container',
    style: theme.url,
    center: [walk.fromlng, walk.fromlat],
    zoom: 16,
    pitch: theme.pitch,
    bearing: theme.bearing,
    antialias: true
  });

  geolocateControl = new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserHeading: true,
    showAccuracyCircle: true
  });
  walkMap.addControl(geolocateControl, 'bottom-right');

  // Update route progress coloring on every GPS ping
  geolocateControl.on('geolocate', (e) => {
    updateRouteProgress(e.coords.longitude, e.coords.latitude);
  });

  walkMap.on('style.load', () => {
    if (theme.buildings) {
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
            'interpolate', ['linear'], ['zoom'],
            15, 0, 16, ['get', 'height']
          ],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.7
        }
      }, labelLayerId);
    }

    new mapboxgl.Marker({ color: '#2e86de' })
      .setLngLat([walk.fromlng, walk.fromlat])
      .setPopup(new mapboxgl.Popup().setText(`Start: ${walk.from}`))
      .addTo(walkMap);

    new mapboxgl.Marker({ color: '#e74c3c' })
      .setLngLat([walk.tolng, walk.tolat])
      .setPopup(new mapboxgl.Popup().setText(`Destination: ${walk.to}`))
      .addTo(walkMap);

    drawWalkRoute(walk.fromlng, walk.fromlat, walk.tolng, walk.tolat);

    // Auto-start live GPS tracking
    geolocateControl.trigger();

    // Broadcast own location and show all participants every 5s
    startLocationBroadcast(walk.id);
  });
}

function switchMapTheme(theme) {
  if (!currentWalkData) return;
  activeMapTheme = theme;

  const sel = document.getElementById('map-theme-select');
  if (sel) sel.value = theme;

  if (walkMap) { walkMap.remove(); walkMap = null; }
  initMap(currentWalkData);
}

function toggleMapFullscreen() {
  const modal   = document.querySelector('.map-modal');
  const container = document.getElementById('walk-map-container');
  const btn     = document.getElementById('map-fullscreen-btn');

  const inNativeFs = document.fullscreenElement || document.webkitFullscreenElement;

  if (inNativeFs) {
    // Exit native fullscreen
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    return;
  }

  if (modal.classList.contains('map-fullscreen')) {
    // Exit CSS fullscreen
    modal.classList.remove('map-fullscreen');
    btn.classList.remove('active');
    btn.title = 'Fullscreen';
    walkMap?.resize();
    return;
  }

  // Try native fullscreen first; fall back to CSS fullscreen (iOS)
  const req = container.requestFullscreen || container.webkitRequestFullscreen;
  if (req) {
    req.call(container).catch(() => enterCssFullscreen(modal, btn));
  } else {
    enterCssFullscreen(modal, btn);
  }
}

function enterCssFullscreen(modal, btn) {
  modal.classList.add('map-fullscreen');
  btn.classList.add('active');
  btn.title = 'Exit fullscreen';
  walkMap?.resize();
}

// Keep button state in sync when native fullscreen exits (e.g. via Esc)
['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => {
  document.addEventListener(ev, () => {
    const btn = document.getElementById('map-fullscreen-btn');
    if (!btn) return;
    const inFs = document.fullscreenElement || document.webkitFullscreenElement;
    btn.classList.toggle('active', !!inFs);
    btn.title = inFs ? 'Exit fullscreen' : 'Fullscreen';
    walkMap?.resize();
  });
});

// Returns the index of the closest coordinate in coords[] to (lng, lat)
function nearestCoordIndex(coords, lng, lat) {
  let minDist = Infinity, idx = 0;
  for (let i = 0; i < coords.length; i++) {
    const dx = coords[i][0] - lng, dy = coords[i][1] - lat;
    const d = dx * dx + dy * dy;
    if (d < minDist) { minDist = d; idx = i; }
  }
  return idx;
}

// Split the route at the user's nearest point: grey behind, green ahead
function updateRouteProgress(lng, lat) {
  if (!routeCoordinates || !walkMap) return;
  const idx = nearestCoordIndex(routeCoordinates, lng, lat);

  // LineString needs ≥2 coords
  const toLine = c => c.length > 1 ? c : [c[0], c[0]];

  const traveled  = toLine(routeCoordinates.slice(0, idx + 1));
  const remaining = toLine(routeCoordinates.slice(idx));

  walkMap.getSource('route-traveled')?.setData({
    type: 'Feature', geometry: { type: 'LineString', coordinates: traveled }
  });
  walkMap.getSource('route-remaining')?.setData({
    type: 'Feature', geometry: { type: 'LineString', coordinates: remaining }
  });
}

async function drawWalkRoute(fromLng, fromLat, toLng, toLat) {
  try {
    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/walking/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
    );
    const data = await res.json();
    if (!data.routes?.length) return;

    const route = data.routes[0].geometry; // GeoJSON LineString
    routeCoordinates = route.coordinates;

    // Persist distance so endWalk can credit stats even if map is closed
    const distMeters = data.routes[0].distance;
    currentWalkData.distance_meters = distMeters;
    supabase.from('walks').update({ distance_meters: distMeters }).eq('id', currentWalkData.id);

    // Remove old route layers/sources if they exist
    ['route-traveled', 'route-remaining'].forEach(id => {
      if (walkMap.getLayer(id)) walkMap.removeLayer(id);
      if (walkMap.getSource(id)) walkMap.removeSource(id);
    });

    // Traveled segment — starts as just the start point (will grow with GPS updates)
    walkMap.addSource('route-traveled', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [route.coordinates[0], route.coordinates[0]] } }
    });
    walkMap.addLayer({
      id: 'route-traveled',
      type: 'line',
      source: 'route-traveled',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#9e9e9e', 'line-width': 6, 'line-opacity': 0.75 }
    });

    // Remaining segment — starts as the full route (green)
    walkMap.addSource('route-remaining', {
      type: 'geojson',
      data: { type: 'Feature', geometry: route }
    });
    walkMap.addLayer({
      id: 'route-remaining',
      type: 'line',
      source: 'route-remaining',
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

// ---- LIVE LOCATION BROADCAST ----
async function startLocationBroadcast(walkId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const userId = session.user.id;
  const { data: profile } = await supabase
    .from('profiles').select('username').eq('id', userId).single();
  const username = profile?.username || 'Walker';

  // Clear stale marker refs (map may have been recreated on theme switch)
  participantMarkers.clear();

  async function pushLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
      await supabase.from('walk_locations').upsert({
        walk_id: walkId,
        user_id: userId,
        username,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        updated_at: new Date().toISOString()
      }, { onConflict: 'walk_id,user_id' });
    });
  }

  await pushLocation();

  // Start 5-second interval only if not already running
  if (!locationInterval) {
    locationInterval = setInterval(pushLocation, 5000);
  }

  // Render existing participants already in the walk
  const { data: existing } = await supabase
    .from('walk_locations').select('*').eq('walk_id', walkId);
  existing?.forEach(row => { if (row.user_id !== userId) addOrMoveMarker(row); });

  // Subscribe to realtime only if not already subscribed
  if (!locationChannel) {
    locationChannel = supabase
      .channel(`walk-locations-${walkId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'walk_locations',
        filter: `walk_id=eq.${walkId}`
      }, ({ eventType, new: newRow, old: oldRow }) => {
        if (eventType === 'DELETE') {
          const uid = oldRow?.user_id;
          participantMarkers.get(uid)?.remove();
          participantMarkers.delete(uid);
        } else if (newRow?.user_id !== userId) {
          addOrMoveMarker(newRow);
        }
      })
      .subscribe();
  }
}

function addOrMoveMarker(row) {
  if (!walkMap) return;
  const lngLat = [row.longitude, row.latitude];
  if (participantMarkers.has(row.user_id)) {
    participantMarkers.get(row.user_id).setLngLat(lngLat);
  } else {
    const el = document.createElement('div');
    el.className = 'participant-marker';
    el.textContent = row.username[0].toUpperCase();
    el.title = `@${row.username}`;
    const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat(lngLat)
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(`@${row.username}`))
      .addTo(walkMap);
    participantMarkers.set(row.user_id, marker);
  }
}

async function stopLocationBroadcast() {
  clearInterval(locationInterval);
  locationInterval = null;
  if (locationChannel) {
    await supabase.removeChannel(locationChannel);
    locationChannel = null;
  }
  participantMarkers.forEach(m => m.remove());
  participantMarkers.clear();
  const { data: { session } } = await supabase.auth.getSession();
  if (session && currentWalkData) {
    await supabase.from('walk_locations')
      .delete()
      .eq('walk_id', currentWalkData.id)
      .eq('user_id', session.user.id);
  }
}

// Close map
function closeWalkMap() {
  // Exit native fullscreen if active
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
  }
  // Remove CSS fullscreen
  document.querySelector('.map-modal')?.classList.remove('map-fullscreen');

  document.getElementById('map-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  if (walkMap) { walkMap.remove(); walkMap = null; }
  routeCoordinates = null;
  stopLocationBroadcast();
}

// ---- INIT ----
loadUserMemberships().then(() => loadWalks());

setupAutocomplete('f-from', coords => { fromCoords = coords; });
setupAutocomplete('f-to',   coords => { toCoords   = coords; });

// ---- END WALK (creator only) ----
async function endWalk(id) {
  if (!confirm('End this walk? It will be permanently deleted for everyone.')) return;
  try {
    // Credit steps/miles to every participant before deleting the walk
    const [{ data: walk }, { data: members }] = await Promise.all([
      supabase.from('walks').select('distance_meters, created_by').eq('id', id).single(),
      supabase.from('walk_members').select('user_id').eq('walk_id', id)
    ]);

    if (walk?.distance_meters) {
      const miles = parseFloat((walk.distance_meters / 1609.34).toFixed(2));
      const steps = Math.round(miles * 2000); // ~2 000 steps per mile

      // Deduplicate: members + creator
      const userIds = new Set((members || []).map(m => m.user_id));
      userIds.add(walk.created_by);

      await Promise.all([...userIds].map(userId =>
        supabase.rpc('increment_walk_stats', { p_user_id: userId, p_steps: steps, p_miles: miles })
      ));
    }

    const { error } = await supabase.from('walks').delete().eq('id', id);
    if (error) throw error;
    window.showToast?.('Walk ended', 'Stats updated for all participants!');
    await loadWalks(currentFilter);
  } catch (err) {
    window.showToast?.('Could not end walk', err.message, true);
  }
}

window.openModal = openModal;
window.closeModal = closeModal;
window.joinWalk = joinWalk;
window.submitWalk = submitWalk;
window.openWalkMap = openWalkMap;
window.closeWalkMap = closeWalkMap;
window.switchMapTheme = switchMapTheme;
window.toggleMapFullscreen = toggleMapFullscreen;
window.endWalk = endWalk;