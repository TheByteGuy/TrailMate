
// ... rest of your code (LOCATION_ALIASES, mapboxgl.accessToken, etc.)
// ---- CONFIG ----

let navigationSteps = []; // Store the steps from Mapbox
let lastSpokenStepIndex = -1; // Track which turn was last announced
let isARMode = false;



export const supabase = createClient(
  'https://zsujhugkllbnqidswkgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzdWpodWdrbGxibnFpZHN3a2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDEzMDksImV4cCI6MjA4Nzg3NzMwOX0.uhVV5pfHjADE19ZrSUdvVKGi3ZgmRi9c0VRClCC8NsM'
);

const LOCATION_ALIASES = {
  "Gore Hall": {
    address: "Gore Hall, 114 The Green, Newark, DE 19716",
  },
  "Kirkbride Hall": {
    address: "Kirkbride Lecture Hall, 114 S College Ave, Newark, DE 19716",
  },
  "Smith Hall": {
    address: "Smith Hall, 18 Amstel Ave, Newark, DE 19716",
  },
  "Du Pont Hall": {
    address: "127 The Green, Newark, DE 19716",
  },
  "Spencer Laboratory": {
    address: "Spencer Laboratory, 130 Academy St, Newark, DE 19716",
  },
  "Memorial Hall": {
    address: "170 The Green, Newark, DE 19716",
  },
  "Caesar Rodney Dining Hall": {
    address: "350 Academy St, Newark, DE 19716",
  },
  "Perkins Student Center": {
    address: "325 Academy St, Newark, DE 19716",
  },
  "Morris Library": {
    address: "181 S College Ave, Newark, DE 19717",
  }
  
  // Add more campus favorites here
};

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
  
  // Refresh trending banner whenever walks update
  loadTrendingWalks();
}

const WALK_TYPE_STYLES = {
  night:    { label: '🌙 Night Safety',    class: 'badge-night' },
  morning:  { label: '☀️ Morning',        class: 'badge-morning' },
  study:    { label: '📚 Study Break',    class: 'badge-study' },
  exercise: { label: '🏃 Exercise',       class: 'badge-exercise' },
  casual:   { label: '😊 Casual',        class: 'badge-casual' }
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
        <div class="avatar ${walk.avatarClass || ''}">
          ${walk.initials || getInitials(walk.name)}
        </div>
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
function setupAutocomplete(inputId, onSelect) {
  const input = document.getElementById(inputId);
  let debounce;

  const removeDropdown = () => {
    input.parentElement.querySelector('.location-suggestions')?.remove();
  };

  input.addEventListener('input', async () => {
    const q = input.value.trim();
    
    // 1. IMMEDIATE EXACT MATCH CHECK
    // If they typed the full nickname, resolve it immediately without waiting for the API
    const exactMatchKey = Object.keys(LOCATION_ALIASES).find(
      key => key.toLowerCase() === q.toLowerCase()
    );

    if (exactMatchKey) {
      const data = LOCATION_ALIASES[exactMatchKey];
      onSelect(null); // Reset while fetching
      const coords = await geocodeAddress(data.address);
      onSelect(coords);
      // We don't return here so the dropdown can still show the "Success" state or other options
    } else {
      onSelect(null); 
    }

    // 2. DEBOUNCED SUGGESTIONS (Fallback & Starred)
    clearTimeout(debounce);
    if (q.length < 2) { removeDropdown(); return; }

    debounce = setTimeout(async () => {
      let mapboxFeatures = [];
      try {
        const D_LAT = 0.435;
        const D_LNG = 0.566;
        let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
                  `?access_token=${mapboxgl.accessToken}&limit=5&proximity=${userLocation?.lng || 0},${userLocation?.lat || 0}`;

        const res = await fetch(url);
        const data = await res.json();
        mapboxFeatures = data.features || [];
      } catch (e) { console.error(e); }

      renderDropdown(mapboxFeatures, q);
    }, 300);
  });

  function renderDropdown(features, query) {
    removeDropdown();
    const ul = document.createElement('ul');
    ul.className = 'location-suggestions';
    const lowerQ = query.toLowerCase();

    // A. Show Starred Aliases that START with or CONTAIN the query
    Object.keys(LOCATION_ALIASES).forEach(name => {
      if (name.toLowerCase().includes(lowerQ)) {
        const li = document.createElement('li');
        li.className = 'location-suggestion-item starred-item';
        li.innerHTML = `<span class="sugg-main">⭐ ${name}</span><span class="sugg-sub">Campus Building</span>`;
        
        li.addEventListener('mousedown', async (e) => {
          e.preventDefault();
          const alias = LOCATION_ALIASES[name];
          input.value = alias.address;
          const coords = await geocodeAddress(alias.address);
          onSelect(coords);
          removeDropdown();
        });
        ul.appendChild(li);
      }
    });

    // B. Fallback to Mapbox Results
    features.forEach(f => {
      const li = document.createElement('li');
      li.className = 'location-suggestion-item';
      const main = f.text || f.place_name.split(',')[0];
      const sub = f.place_name.replace(f.text + ', ', '');
      li.innerHTML = `<span class="sugg-main">${main}</span><span class="sugg-sub">${sub}</span>`;

      li.addEventListener('mousedown', e => {
        e.preventDefault();
        input.value = f.place_name;
        onSelect({ lat: f.center[1], lng: f.center[0] });
        removeDropdown();
      });
      ul.appendChild(li);
    });

    if (ul.children.length > 0) input.parentElement.appendChild(ul);
  }

  input.addEventListener('blur', () => setTimeout(removeDropdown, 200));
}

// Utility for the "Behind the Scenes" geocoding
async function geocodeAddress(address) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}&limit=1`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.features?.length) return null;
  const f = data.features[0];
  return { lat: f.center[1], lng: f.center[0] };
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

async function playVoiceAlert(text) {
  const VOICE_ID = "21m00Tcm4lfs74tC97CQ"; // Default "Alice" voice
  const API_KEY = "sk_77d684218c44bd2c252be16c0ace3ee1c9b70964cb8dc1e7"; // Replace with your NEW key

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'xi-api-key': API_KEY // Key must be inside headers
      },
      body: JSON.stringify({ 
        text: text,
        model_id: "eleven_turbo_v2_5", // Fastest model for navigation
        voice_settings: { stability: 0.5, similarity_boost: 0.5 }
      })
    });

    if (!response.ok) throw new Error("ElevenLabs API Limit or Error");

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  } catch (e) {
    console.warn("ElevenLabs failed, using browser fallback", e);
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }
}

function checkNavigationVoice(lng, lat) {
  if (!navigationSteps.length) return;

  // Find if we are within 20 meters (~65 feet) of the next instruction point
  const nextStepIdx = lastSpokenStepIndex + 1;
  if (nextStepIdx >= navigationSteps.length) return;

  const nextStep = navigationSteps[nextStepIdx];
  const [stepLng, stepLat] = nextStep.maneuver.location;

  // Simple distance check (approximate)
  const dist = Math.sqrt(Math.pow(lng - stepLng, 2) + Math.pow(lat - stepLat, 2));
  
  // 0.0002 is roughly 20-25 meters
  if (dist < 0.0002) {
    lastSpokenStepIndex = nextStepIdx;
    playVoiceAlert(nextStep.maneuver.instruction);
  }
}
// Split the route at the user's nearest point: grey behind, green ahead
function updateRouteProgress(lng, lat) {
  if (!routeCoordinates || !walkMap) return;
  const idx = nearestCoordIndex(routeCoordinates, lng, lat);

  // --- NEW: VOICE TRIGGER LOGIC ---
  checkNavigationVoice(lng, lat);
  // --------------------------------

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
      `https://api.mapbox.com/directions/v5/mapbox/walking/${fromLng},${fromLat};${toLng},${toLat}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
    );
    const data = await res.json();
    if (!data.routes?.length) return;

    // --- ADD THIS LINE ---
    navigationSteps = data.routes[0].legs[0].steps; 
    // ---------------------

    const route = data.routes[0].geometry;
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
          // --- ADD THIS LINE BELOW ---
          if (eventType === 'INSERT') {
            playVoiceAlert(`${newRow.username} has joined your route.`);
          }
          // ---------------------------
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
}async function runAIPlanner() {
  const promptInput = document.getElementById('ai-modal-prompt');
  const userPrompt = promptInput.value.trim();

  const now = new Date();
  const localTimeOffset = now.getTimezoneOffset() * 60000;
  const localISOTime = new Date(now.getTime() - localTimeOffset).toISOString().slice(0, 16);
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });

  if (!userPrompt) {
    alert("Please describe your walk first!");
    return;
  }

  const btn = document.getElementById('ai-magic-btn');
  const statusText = document.getElementById('ai-status-text');
  const statusDot = document.querySelector('.ai-status-dot');

  btn.innerHTML = "<span>Planning...</span>";
  btn.disabled = true;
  statusText.innerText = "Gemini is thinking...";
  if (statusDot) statusDot.style.background = "#9b72cb"; 

  try {
    const campusLandmarks = Object.keys(LOCATION_ALIASES).join(", ");
    
    // FETCH FROM YOUR NEW VERCEL API ROUTE
    const response = await fetch('/api/plan-walk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt,
        localISOTime,
        weekday,
        campusLandmarks
      })
    });

    if (!response.ok) throw new Error("Server Error");
    
    // Get the parsed data back from your serverless function
    const aiData = await response.json();
    
    // --- 2. MAP TO HIDDEN FORM ---
    document.getElementById('f-from').value = aiData.from || '';
    document.getElementById('f-to').value = aiData.to || '';
    document.getElementById('f-name').value = aiData.name || 'Brian';
    document.getElementById('f-size').value = aiData.size || '2';
    document.getElementById('f-type').value = aiData.type || 'casual';
    document.getElementById('f-notes').value = aiData.notes || '';
    document.getElementById('f-time').value = aiData.datetime;

    // --- 3. RESOLVE MAP COORDINATES ---
    fromCoords = await geocodeAddress(LOCATION_ALIASES[aiData.from]?.address || aiData.from);
    toCoords = await geocodeAddress(LOCATION_ALIASES[aiData.to]?.address || aiData.to);

    if (!fromCoords || !toCoords) {
        throw new Error("Could not pinpoint buildings.");
    }

    // --- 4. EXECUTE SUBMISSION ---
    const fakeEvent = { preventDefault: () => {} };
    await submitWalk(fakeEvent);

    statusText.innerText = "Walk Posted!";
    if (statusDot) statusDot.style.background = "#34a853"; 
    
    setTimeout(() => {
      closeAIEntry();
      promptInput.value = ""; 
    }, 1500);

  } catch (err) {
    console.error("API Error:", err);
    statusText.innerText = "Error parsing request.";
    if (statusDot) statusDot.style.background = "#d96570";
  } finally {
    btn.innerHTML = "<span>Generate & Post</span> <span class='btn-icon'>🚀</span>";
    btn.disabled = false;
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

async function loadTrendingWalks() {
  try {
    const res = await fetch("http://localhost:3000/api/trending");
    
    // Check if response is ok
    if (!res.ok) {
      console.warn(`Server returned ${res.status}, falling back to Supabase`);
      loadTrendingFromSupabase();
      return;
    }

    // Check content type
    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.warn(`Wrong content type: ${contentType}, falling back to Supabase`);
      loadTrendingFromSupabase();
      return;
    }

    const data = await res.json();
    console.log("Trending routes:", data);
    if (data && data.length > 0) highlightTrendingRoute(data[0]);
  } catch (err) {
    console.warn("Failed to load trending walks from server, falling back to Supabase:", err);
    loadTrendingFromSupabase();
  }
}

async function loadTrendingFromSupabase() {
  try {
    // Get walks sorted by joinedspots (most joined = trending)
    const { data, error } = await supabase
      .from('walks')
      .select('*')
      .order('joinedspots', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (data && data.length > 0) highlightTrendingRoute(data[0]);
  } catch (err) {
    console.error("Failed to load trending walks:", err);
  }
}

function highlightTrendingRoute(walk) {
  // Remove old banner first
  document.querySelector('.trending-banner')?.remove();
  
  // Create a banner showing the most popular walk
  const banner = document.createElement('div');
  banner.className = 'trending-banner';
  banner.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;justify-content:space-between;">
      <div>
        <span style="font-weight:700;font-size:14px;">🔥 Trending Now</span>
        <div style="font-size:13px;color:#fff;margin-top:4px;opacity:0.9;">
          ${walk.name} · ${(walk.joinedspots || 0) + 1}/${walk.maxspots || 1} people
        </div>
      </div>
      <button class="btn-primary" style="white-space:nowrap;font-size:12px;padding:6px 12px;" onclick="this.closest('.trending-banner').remove();">Dismiss</button>
    </div>
  `;
  document.body.insertBefore(banner, document.body.firstChild);
  
  // Auto-remove after 8 seconds
  setTimeout(() => banner.remove(), 8000);
}

loadTrendingWalks();

window.openModal = openModal;
window.closeModal = closeModal;
window.joinWalk = joinWalk;
window.submitWalk = submitWalk;
window.openWalkMap = openWalkMap;
window.closeWalkMap = closeWalkMap;
window.switchMapTheme = switchMapTheme;
window.toggleMapFullscreen = toggleMapFullscreen;
window.endWalk = endWalk;
window.runAIPlanner = runAIPlanner;/* --- ADD TO THE BOTTOM OF walks.js --- */

// 1. Function to open the AI Modal
function openAIEntry() {
  const overlay = document.getElementById('ai-modal-overlay');
  if (overlay) {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    // Focus the textarea for immediate typing
    setTimeout(() => {
      document.getElementById('ai-prompt').focus();
    }, 100);
  }
}

// 2. Function to close the AI Modal
function closeAIEntry() {
  const overlay = document.getElementById('ai-modal-overlay');
  if (overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// 3. ATTACH TO WINDOW (This fixes the 'undefined' errors)
window.openAIEntry = openAIEntry;
window.closeAIEntry = closeAIEntry;
window.runAIPlanner = runAIPlanner;
window.openModal = openModal;
window.closeModal = closeModal;
window.joinWalk = joinWalk;
window.submitWalk = submitWalk;