/* ════════════════════════════════════════════════════════════════
   AR Wayfinding — ar.js
   Features: Accessible route browser · AR camera overlay ·
             Compass fallback · Voice guidance · Obstacle alerts ·
             Auto waypoint advance · Web Speech API
   APIs used: Geolocation · DeviceOrientationEvent · getUserMedia ·
              Canvas 2D · SpeechSynthesis
════════════════════════════════════════════════════════════════ */

'use strict';

// ─────────────────────────────────────────────────────────────────
// ROUTE DATA  (University of Delaware campus)
// ─────────────────────────────────────────────────────────────────
const ROUTES = [
  {
    id: 'library-loop',
    name: 'Library Loop',
    category: 'central',
    description: 'Fully accessible route through the heart of campus connecting Morris Library, The Green, and Trabant Student Center. Smooth pavement with curb cuts at every crossing.',
    distanceMi: 0.4,
    durationMin: 8,
    accessible: true,
    lighting: 'excellent',
    surface: 'paved',
    effort: 'easy',
    tags: ['wheelchair', 'night-safe', 'popular'],
    obstacles: [],
    waypoints: [
      { lat: 39.6780, lng: -75.7529, name: 'Morris Library',        icon: '📚', instruction: 'Start at Morris Library main entrance, face The Green', a11y: 'Automatic doors, ramp on south side', obstacles: [] },
      { lat: 39.6791, lng: -75.7533, name: 'Library Walk',          icon: '🚶', instruction: 'Continue north along Library Walk — smooth paved path', a11y: 'Wide path, no curbs, tactile pavement', obstacles: [] },
      { lat: 39.6800, lng: -75.7537, name: 'The Green',             icon: '🌳', instruction: 'Cross The Green heading north toward Trabant', a11y: 'Paved perimeter path available for mobility aids', obstacles: [] },
      { lat: 39.6813, lng: -75.7541, name: 'Trabant Approach',      icon: '🏛️', instruction: 'Head north — Trabant Student Center straight ahead', a11y: 'Flat paved surface, excellent lighting', obstacles: [] },
      { lat: 39.6825, lng: -75.7546, name: 'Trabant Student Center', icon: '🎯', instruction: 'You have arrived at Trabant Student Center!', a11y: 'Accessible entrance on west side, elevator inside', obstacles: [] },
    ],
  },
  {
    id: 'science-hill',
    name: 'Science Hill Connector',
    category: 'academic',
    description: 'Route through the science buildings. Mostly accessible with one section of uneven pavement near Sharp Lab — a wheelchair-accessible alternate path is available.',
    distanceMi: 0.6,
    durationMin: 12,
    accessible: false,
    lighting: 'good',
    surface: 'mixed',
    effort: 'moderate',
    tags: ['academic', 'daytime'],
    obstacles: ['uneven_pavement'],
    waypoints: [
      { lat: 39.6792, lng: -75.7512, name: 'Gore Hall',   icon: '🏫', instruction: 'Start at Gore Hall, heading south on College Ave', a11y: 'Accessible entrance on north side', obstacles: [] },
      { lat: 39.6785, lng: -75.7507, name: 'Kirkbride Hall', icon: '🔬', instruction: 'Pass Kirkbride Hall on your right — use east walkway for step-free access', a11y: 'Step-free path via east walkway', obstacles: [] },
      { lat: 39.6778, lng: -75.7503, name: 'Sharp Lab',   icon: '⚗️', instruction: 'Caution: uneven pavement section. Wheelchair users take alternate path via Lammot du Pont Lab to the east.', a11y: '⚠️ Uneven section — alternate path east of building', obstacles: ['uneven_pavement'] },
      { lat: 39.6772, lng: -75.7484, name: 'ISE Lab',     icon: '💻', instruction: 'Arrive at ISE Lab Complex', a11y: 'Fully accessible, automatic doors', obstacles: [] },
    ],
  },
  {
    id: 'south-campus-night',
    name: 'South Campus Night Walk',
    category: 'residential',
    description: 'Well-lit residential route through South Campus dorms. Blue-light emergency phones every 100 m. Ideal for evening and late-night walks.',
    distanceMi: 0.5,
    durationMin: 10,
    accessible: true,
    lighting: 'excellent',
    surface: 'paved',
    effort: 'easy',
    tags: ['night-safe', 'residential', 'buddy-recommended'],
    obstacles: [],
    waypoints: [
      { lat: 39.6805, lng: -75.7536, name: 'Perkins Student Center', icon: '🏠', instruction: 'Start at Perkins Student Center main entrance', a11y: 'Fully accessible, ramp at main entrance', obstacles: [] },
      { lat: 39.6795, lng: -75.7530, name: 'Kent Way',               icon: '🔵', instruction: 'Head south on Kent Way — blue emergency phones on left', a11y: 'Wide paved path, excellent lighting', obstacles: [] },
      { lat: 39.6778, lng: -75.7520, name: 'Rodney Complex',         icon: '🍽️', instruction: 'Pass Rodney Dining Hall on your right, continue south', a11y: 'Accessible path, curb cuts at all intersections', obstacles: [] },
      { lat: 39.6756, lng: -75.7510, name: 'Russell Complex',        icon: '🎯', instruction: 'Arrived at Russell Complex!', a11y: 'Fully accessible entrance on north side', obstacles: [] },
    ],
  },
  {
    id: 'newark-connector',
    name: 'Newark Main St Connector',
    category: 'offcampus',
    description: 'Route from campus to Newark Main Street and the train station. Mostly accessible sidewalks with one uneven section near historic buildings.',
    distanceMi: 0.8,
    durationMin: 16,
    accessible: false,
    lighting: 'good',
    surface: 'sidewalk',
    effort: 'moderate',
    tags: ['off-campus', 'train-station'],
    obstacles: ['uneven_pavement'],
    waypoints: [
      { lat: 39.6780, lng: -75.7519, name: 'Memorial Hall Gate', icon: '🚪', instruction: 'Exit campus via Memorial Hall gate on S College Ave', a11y: 'Curb cut at gate exit', obstacles: [] },
      { lat: 39.6765, lng: -75.7520, name: 'S College & E Park', icon: '🚦', instruction: 'Cross at E Park Place — use crosswalk with audio signal', a11y: 'Accessible crosswalk, audio pedestrian signal', obstacles: [] },
      { lat: 39.6756, lng: -75.7528, name: 'Main St & Chapel',   icon: '🏙️', instruction: 'Turn right onto Main Street — some uneven pavement near old buildings', a11y: '⚠️ Uneven pavement near historic storefronts', obstacles: ['uneven_pavement'] },
      { lat: 39.6739, lng: -75.7501, name: 'Newark Train Station', icon: '🚂', instruction: 'Arrived at Newark Amtrak Station!', a11y: 'Fully accessible, elevator to platform', obstacles: [] },
    ],
  },
  {
    id: 'athletic-loop',
    name: 'Athletic Facilities Loop',
    category: 'athletic',
    description: 'Loop around the athletic complex. Fully paved, wide paths, excellent lighting — perfect before or after a game or workout.',
    distanceMi: 0.7,
    durationMin: 14,
    accessible: true,
    lighting: 'excellent',
    surface: 'paved',
    effort: 'easy',
    tags: ['athletic', 'night-safe', 'wheelchair'],
    obstacles: [],
    waypoints: [
      { lat: 39.6765, lng: -75.7460, name: 'Carpenter Sports',   icon: '🏋️', instruction: 'Start at Carpenter Sports Building main entrance', a11y: 'Fully accessible, automatic doors', obstacles: [] },
      { lat: 39.6758, lng: -75.7472, name: 'Bob Carpenter Cntr', icon: '🏟️', instruction: 'Head west toward Bob Carpenter Center', a11y: 'Wide paved path, no obstacles', obstacles: [] },
      { lat: 39.6750, lng: -75.7490, name: 'Delaware Stadium',   icon: '🏈', instruction: 'Pass Delaware Stadium on your right, continue north', a11y: 'Fully accessible perimeter path', obstacles: [] },
      { lat: 39.6765, lng: -75.7460, name: 'Carpenter Sports',   icon: '🏆', instruction: 'Loop complete — back at Carpenter Sports!', a11y: 'Fully accessible return path', obstacles: [] },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// OBSTACLE LABELS
// ─────────────────────────────────────────────────────────────────
const OBSTACLE_LABELS = {
  uneven_pavement: '⚠️ Uneven Pavement',
  construction:    '🚧 Construction Zone',
  low_lighting:    '🌙 Low Lighting',
  stairs:          '🪜 Stairs (no wheelchair)',
};

function obstacleLabel(type) { return OBSTACLE_LABELS[type] || '⚠️ ' + type; }

// ─────────────────────────────────────────────────────────────────
// MAPBOX CONFIG
// ─────────────────────────────────────────────────────────────────
const MAPBOX_TOKEN = 'pk.eyJ1IjoidHlwaWNhbGl0eSIsImEiOiJjbW02cTAyM2swZ205MnFxNnNiMmFiOWp1In0.AyVjTmE5MbPnGquJ_NodiQ';
let mapNavInstance  = null;   // Mapbox GL map for the map tab
let mapNavReady     = false;  // true once style has loaded

// ─────────────────────────────────────────────────────────────────
// APP STATE
// ─────────────────────────────────────────────────────────────────
const state = {
  filter:         'all',
  currentRoute:   null,
  waypointIdx:    0,
  userPos:        null,    // { lat, lng, accuracy }
  heading:        0,       // degrees from true north (0 = N)
  headingReady:   false,
  cameraStream:   null,
  cameraOn:       false,
  voiceOn:        true,
  navTab:         'ar',    // 'ar' | 'map'
  geoWatchId:     null,
  rafId:          null,
  startTime:      null,
  warnedObsIdx:   -1,
};

// ─────────────────────────────────────────────────────────────────
// DOM HELPERS
// ─────────────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderRouteList();
  setupFilters();
  startGeolocation();

  $('detail-back').addEventListener('click',    () => showScreen('list'));
  $('btn-start-ar').addEventListener('click',   () => beginNavigation(true));
  $('btn-start-text').addEventListener('click', () => beginNavigation(false));

  // Close map modal when clicking outside the modal card
  $('map-modal-overlay').addEventListener('click', (e) => {
    if (e.target === $('map-modal-overlay')) closeMapModal();
  });
});

// expose methods needed by inline onclick attributes
window.arApp = {
  toggleVoice,
  toggleCamera,
  cycleNavTab,
  exitNavigation,
  requestOrientationPermission,
  skipPermission,
  closeMapModal,
  fitNavMapToRoute,
};

// ─────────────────────────────────────────────────────────────────
// SCREENS
// ─────────────────────────────────────────────────────────────────
function showScreen(name) {
  $$('.ar-screen').forEach(s => s.classList.remove('is-active'));
  $(`screen-${name}`).classList.add('is-active');

  // Hide main nav during navigation to maximise screen space
  const nav  = $('navbar');
  const mmenu = $('mobile-menu');
  if (nav) nav.style.display = (name === 'navigate') ? 'none' : '';
  if (mmenu && name === 'navigate') mmenu.classList.remove('open');
}

// ─────────────────────────────────────────────────────────────────
// ROUTE LIST
// ─────────────────────────────────────────────────────────────────
function setupFilters() {
  $$('.ar-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('.ar-chip').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      state.filter = chip.dataset.filter;
      renderRouteList();
    });
  });
}

function renderRouteList() {
  let list = ROUTES;
  if (state.filter === 'wheelchair') list = list.filter(r => r.accessible);
  else if (state.filter === 'night') list = list.filter(r => r.tags.includes('night-safe'));
  else if (state.filter === 'quick') list = list.filter(r => r.durationMin <= 10);
  else if (state.filter === 'clear') list = list.filter(r => r.obstacles.length === 0);

  const grid = $('route-grid');
  if (list.length === 0) {
    grid.innerHTML = '<p style="color:var(--gray-400);grid-column:1/-1">No routes match this filter.</p>';
    return;
  }

  grid.innerHTML = list.map(buildRouteCard).join('');
  grid.querySelectorAll('.route-card').forEach(card => {
    card.addEventListener('click', () => showRouteDetail(card.dataset.id));
  });
}

function buildRouteCard(r) {
  const stripe = r.accessible ? 'accessible' : r.obstacles.length === 0 ? 'partial' : 'limited';
  const pill   = r.accessible
    ? '<span class="a11y-pill pill-accessible">♿ Fully Accessible</span>'
    : r.obstacles.length === 0
      ? '<span class="a11y-pill pill-partial">✅ Mostly Accessible</span>'
      : '<span class="a11y-pill pill-limited">⚠️ Limited Access</span>';

  const tags = r.tags.map(t => `<span class="route-tag">${t}</span>`).join('');
  const obs  = r.obstacles.map(o => `<span class="obs-tag">${obstacleLabel(o)}</span>`).join('');

  return `
    <div class="route-card" data-id="${r.id}">
      <div class="route-card-stripe stripe-${stripe}"></div>
      <div class="route-card-body">
        <div class="route-card-top">
          <div class="route-name">${r.name}</div>
          ${pill}
        </div>
        <p class="route-desc">${r.description}</p>
        <div class="route-meta-row">
          <span>📍 ${r.distanceMi} mi</span>
          <span>⏱ ${r.durationMin} min</span>
          <span>🏃 ${cap(r.effort)}</span>
        </div>
        <div class="lighting-row">
          <span style="font-size:13px">💡</span>
          <div class="lighting-track light-${r.lighting}"><div class="lighting-fill"></div></div>
          <span class="lighting-label">${cap(r.lighting)} lighting</span>
        </div>
        <div class="tag-row" style="margin-top:10px">
          ${tags}${obs ? `<span style="flex-basis:100%;height:0"></span>${obs}` : ''}
        </div>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────
// ROUTE DETAIL
// ─────────────────────────────────────────────────────────────────
function showRouteDetail(routeId) {
  const route = ROUTES.find(r => r.id === routeId);
  if (!route) return;
  state.currentRoute = route;

  const a11yItems = [
    route.accessible ? '✅ Wheelchair accessible' : '⚠️ Not fully wheelchair accessible',
    `💡 ${cap(route.lighting)} lighting`,
    `🛣️ ${cap(route.surface)} surface`,
    `🏃 ${cap(route.effort)} effort level`,
    route.obstacles.length === 0 ? '✅ No obstacles reported' : `⚠️ ${route.obstacles.length} obstacle type(s)`,
    `📍 ${route.waypoints.length} waypoints`,
  ];

  const timelineItems = route.waypoints.map((wp, i) => {
    const isLast = i === route.waypoints.length - 1;
    const hasObs = wp.obstacles.length > 0;
    const dotClass = isLast ? 'tl-dot tl-dot-last' : hasObs ? 'tl-dot tl-dot-warn' : 'tl-dot';
    return `
      <div class="tl-item">
        <div class="tl-line"></div>
        <div class="${dotClass}">${wp.icon}</div>
        <div class="tl-content">
          <div class="tl-name">${wp.name}</div>
          <div class="tl-instr">${wp.instruction}</div>
          ${wp.a11y ? `<div class="tl-a11y">♿ ${wp.a11y}</div>` : ''}
          ${wp.obstacles.map(o => `<span class="tl-obs">${obstacleLabel(o)}</span>`).join('')}
        </div>
      </div>`;
  }).join('');

  $('detail-content').innerHTML = `
    <h1 class="detail-hero-name">${route.name}</h1>
    <div class="detail-meta-row">
      <span>📍 ${route.distanceMi} mi</span>
      <span>⏱ ${route.durationMin} min</span>
      <span>🏃 ${cap(route.effort)}</span>
      <span>💡 ${cap(route.lighting)} lighting</span>
    </div>
    <p class="detail-desc">${route.description}</p>

    <div class="a11y-summary">
      <div class="a11y-summary-title">Accessibility Summary</div>
      <div class="a11y-grid">
        ${a11yItems.map(item => `<div class="a11y-item">${item}</div>`).join('')}
      </div>
    </div>

    <div class="timeline-title">Route Waypoints</div>
    <div class="timeline">${timelineItems}</div>`;

  showScreen('detail');
}

// ─────────────────────────────────────────────────────────────────
// NAVIGATION  — start / exit
// ─────────────────────────────────────────────────────────────────
async function beginNavigation(arMode) {
  if (!state.currentRoute) return;

  state.waypointIdx  = 0;
  state.cameraOn     = arMode;
  state.startTime    = Date.now();
  state.warnedObsIdx = -1;
  state.navTab       = 'ar';

  showScreen('navigate');
  buildWaypointDots();
  updateInstruction();

  // iOS compass permission
  if (needsOrientationPermission()) {
    $('perm-overlay').style.display = 'flex';
    return;
  }
  await startCompass();

  if (arMode) {
    const ok = await startCamera();
    if (ok) {
      $('ar-video').style.display  = 'block';
      $('ar-canvas').style.display = 'block';
      $('compass-bg').style.display = 'none';
    } else {
      showCompassView();
    }
  } else {
    showCompassView();
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  startRenderLoop();
  if (state.voiceOn) speak(state.currentRoute.waypoints[0].instruction);
}

function exitNavigation() {
  if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
  stopCamera();
  window.removeEventListener('deviceorientation',         handleOrientation);
  window.removeEventListener('deviceorientationabsolute', handleOrientation);
  window.removeEventListener('resize', resizeCanvas);

  $('arrival-overlay').style.display  = 'none';
  $('obstacle-banner').style.display  = 'none';
  $('perm-overlay').style.display     = 'none';
  $('ar-video').style.display         = 'none';
  $('ar-canvas').style.display        = 'none';
  $('compass-bg').style.display       = 'none';
  $('map-modal-overlay').classList.remove('is-open');
  window.speechSynthesis?.cancel();

  // Destroy map instance
  if (mapNavInstance) { mapNavInstance.remove(); mapNavInstance = null; mapNavReady = false; }

  showScreen('list');
}

// ─────────────────────────────────────────────────────────────────
// CAMERA
// ─────────────────────────────────────────────────────────────────
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    state.cameraStream = stream;
    $('ar-video').srcObject = stream;
    return true;
  } catch {
    return false;
  }
}

function stopCamera() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(t => t.stop());
    state.cameraStream = null;
  }
  $('ar-video').srcObject = null;
}

function showCompassView() {
  $('ar-video').style.display   = 'none';
  $('ar-canvas').style.display  = 'none';
  $('compass-bg').style.display = 'flex';
}

function toggleCamera() {
  if (state.cameraOn) {
    stopCamera();
    state.cameraOn = false;
    showCompassView();
    $('btn-cam').textContent = '📷';
  } else {
    startCamera().then(ok => {
      if (ok) {
        state.cameraOn = true;
        $('ar-video').style.display   = 'block';
        $('ar-canvas').style.display  = 'block';
        $('compass-bg').style.display = 'none';
        $('btn-cam').textContent = '🗺️';
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// COMPASS / ORIENTATION
// ─────────────────────────────────────────────────────────────────
function needsOrientationPermission() {
  return typeof DeviceOrientationEvent !== 'undefined' &&
         typeof DeviceOrientationEvent.requestPermission === 'function';
}

async function requestOrientationPermission() {
  $('perm-overlay').style.display = 'none';
  try {
    const res = await DeviceOrientationEvent.requestPermission();
    if (res === 'granted') {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
      state.headingReady = true;
    }
  } catch { /* ignore */ }
  // continue setup
  await finishNavSetup();
}

async function skipPermission() {
  $('perm-overlay').style.display = 'none';
  await finishNavSetup();
}

async function finishNavSetup() {
  if (state.cameraOn) {
    const ok = await startCamera();
    if (ok) {
      $('ar-video').style.display   = 'block';
      $('ar-canvas').style.display  = 'block';
      $('compass-bg').style.display = 'none';
    } else {
      showCompassView();
    }
  } else {
    showCompassView();
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  startRenderLoop();
  if (state.voiceOn) speak(state.currentRoute.waypoints[0].instruction);
}

async function startCompass() {
  if (needsOrientationPermission()) return; // handled by overlay
  // Prefer absolute heading (Android); fall back to relative
  window.addEventListener('deviceorientationabsolute', handleOrientation, { passive: true });
  window.addEventListener('deviceorientation',         handleOrientation, { passive: true });
  state.headingReady = true;
}

function handleOrientation(e) {
  let h = null;
  if (e.webkitCompassHeading != null)         h = e.webkitCompassHeading; // iOS
  else if (e.absolute && e.alpha != null)      h = (360 - e.alpha) % 360; // Android absolute
  else if (e.alpha != null)                    h = (360 - e.alpha) % 360; // fallback

  if (h !== null) {
    state.heading    = h;
    state.headingReady = true;
    // update compass needle (no-camera mode)
    const wrap = $('compass-needle-wrap');
    if (wrap) wrap.style.transform = `rotate(${h}deg)`;
  }
}

// ─────────────────────────────────────────────────────────────────
// GEOLOCATION
// ─────────────────────────────────────────────────────────────────
function startGeolocation() {
  if (!navigator.geolocation) return;

  // Try to get a quick first fix
  navigator.geolocation.getCurrentPosition(handlePosition, null, { enableHighAccuracy: true, timeout: 8000 });

  state.geoWatchId = navigator.geolocation.watchPosition(
    handlePosition,
    () => updateGPSStatus(null),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 12000 }
  );
}

function handlePosition(pos) {
  state.userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
  updateGPSStatus(pos.coords.accuracy);
  if ($('screen-navigate').classList.contains('is-active')) checkWaypointAdvance();
}

function updateGPSStatus(accuracy) {
  // List-screen badge
  const pulse = $('gps-pulse');
  const text  = $('gps-status-text');
  if (pulse && text) {
    if (accuracy === null) {
      pulse.className = 'gps-pulse weak'; text.textContent = 'No GPS';
    } else if (accuracy < 15) {
      pulse.className = 'gps-pulse good'; text.textContent = `GPS ±${Math.round(accuracy)}m`;
    } else if (accuracy < 50) {
      pulse.className = 'gps-pulse fair'; text.textContent = `GPS ±${Math.round(accuracy)}m`;
    } else {
      pulse.className = 'gps-pulse weak'; text.textContent = `Weak GPS ±${Math.round(accuracy)}m`;
    }
  }

  // Nav-screen dot
  const dot = $('nav-gps-dot');
  if (dot) {
    dot.className = 'gps-dot-sm';
    if      (accuracy === null) dot.classList.add('weak');
    else if (accuracy < 15)     dot.classList.add('good');
    else if (accuracy < 50)     dot.classList.add('fair');
    else                        dot.classList.add('weak');
  }
}

// ─────────────────────────────────────────────────────────────────
// CANVAS / RENDER LOOP
// ─────────────────────────────────────────────────────────────────
function resizeCanvas() {
  const c = $('ar-canvas');
  c.width  = c.offsetWidth;
  c.height = c.offsetHeight;
}

function startRenderLoop() {
  const tick = () => {
    if (!$('screen-navigate').classList.contains('is-active')) return;
    renderFrame();
    state.rafId = requestAnimationFrame(tick);
  };
  state.rafId = requestAnimationFrame(tick);
}

function renderFrame() {
  // Map tab is handled by Mapbox — skip canvas work entirely
  if (state.navTab === 'map') return;
  // Always update compass view if shown
  if ($('compass-bg').style.display !== 'none') updateCompassView();
  if (!state.cameraOn) return;

  const canvas = $('ar-canvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const wp = currentWaypoint();
  if (!wp) return;

  let dist = null, bearing = 0;
  if (state.userPos) {
    dist    = getDistance(state.userPos, wp);
    bearing = getBearing(state.userPos, wp);
  }

  // Arrow angle relative to where device is pointing
  const relAngle = state.headingReady ? ((bearing - state.heading + 360) % 360) : bearing;

  // Colour shifts as user approaches
  let color = '#00539F', glow = 'rgba(0,83,159,0.45)';
  if (dist !== null && dist < 40)  { color = '#FFD200'; glow = 'rgba(255,210,0,0.5)'; }
  if (dist !== null && dist < 12)  { color = '#22c55e'; glow = 'rgba(34,197,94,0.55)'; }

  // 3-D ground-plane AR path + arrow
  const time = Date.now() / 1000;
  draw3DGroundAR(ctx, W, H, relAngle, dist ?? 50, time, color, glow);

  // Distance + bearing HUD floating near the horizon
  if (dist !== null) {
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.shadowBlur  = 14;
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.font        = `bold 26px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.fillStyle   = color;
    ctx.fillText(fmtDist(dist), W / 2, H * 0.34);
    ctx.font        = '13px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle   = 'rgba(255,255,255,0.55)';
    ctx.fillText(`${bearingToCardinal(relAngle)} · ${Math.round(relAngle)}°`, W / 2, H * 0.34 + 22);
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────
// 3-D GROUND-PLANE AR RENDERING
// Perspective-projects a path ribbon + 3-D foreshortened arrow onto
// the camera feed, simulating ground-level AR wayfinding.
// ─────────────────────────────────────────────────────────────────

/**
 * Entry point — draws everything for one frame.
 * @param relAngleDeg  0 = straight ahead, 90 = right, 270/-90 = left
 */
function draw3DGroundAR(ctx, W, H, relAngleDeg, distM, time, color, glow) {
  // Normalise to -180 … +180 (negative = left, positive = right)
  let ang = ((relAngleDeg % 360) + 360) % 360;
  if (ang > 180) ang -= 360;

  // ── Perspective layout ────────────────────────────────────────
  const horizonY  = H * 0.40;          // where the ground meets the sky
  const startX    = W * 0.50;
  const startY    = H * 0.91;          // user's feet (just inside canvas)
  const baseHalfW = W * 0.095;         // ribbon half-width at the base

  // Vanishing point shifts sideways with bearing
  const vpShift = Math.sin(ang * Math.PI / 180) * W * 0.44;
  const vpX     = W * 0.50 + vpShift;
  const vpY     = horizonY;

  // Asymmetric bezier control point for natural-looking curve
  const cpX = startX + (vpX - startX) * 0.35;
  const cpY = startY + (vpY - startY) * 0.50;

  // ── Build ribbon geometry ─────────────────────────────────────
  const ribbon = buildRibbon(startX, startY, cpX, cpY, vpX, vpY, baseHalfW, 54);

  // ── Draw — back to front ──────────────────────────────────────
  drawRibbonFill(ctx, ribbon);
  drawGroundGrid(ctx, ribbon, color);
  drawRibbonEdges(ctx, ribbon, color, glow);
  drawCenterDashes(ctx, ribbon, color, glow, time);
  drawChevrons(ctx, ribbon, color, glow, time);
  draw3DArrow(ctx, startX, startY, vpX, vpY, baseHalfW, color, glow);

  // U-turn hint when target is mostly behind the user
  if (Math.abs(ang) > 115) {
    drawUTurnHint(ctx, W, H, ang, color, glow);
  }
}

// ── Quadratic bezier ribbon ───────────────────────────────────────
function buildRibbon(sx, sy, cpx, cpy, vpx, vpy, hw0, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t  = i / steps;
    const mt = 1 - t;
    const px = mt*mt*sx  + 2*mt*t*cpx + t*t*vpx;
    const py = mt*mt*sy  + 2*mt*t*cpy + t*t*vpy;
    // Tangent
    const tx = 2*mt*(cpx - sx)  + 2*t*(vpx - cpx);
    const ty = 2*mt*(cpy - sy)  + 2*t*(vpy - cpy);
    const tl = Math.sqrt(tx*tx + ty*ty) || 1;
    const nx = -ty / tl,  ny = tx / tl;  // left-hand normal
    const hw = hw0 * Math.pow(1 - t, 0.76);
    pts.push({
      px, py, nx, ny, hw, t,
      lx: px + nx * hw, ly: py + ny * hw,
      rx: px - nx * hw, ry: py - ny * hw,
      tangAngle: Math.atan2(ty, tx),
    });
  }
  return pts;
}

// ── Semi-transparent dark fill for the road surface ───────────────
function drawRibbonFill(ctx, ribbon) {
  const n = ribbon.length;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ribbon[0].lx, ribbon[0].ly);
  for (let i = 1; i < n; i++) ctx.lineTo(ribbon[i].lx, ribbon[i].ly);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(ribbon[i].rx, ribbon[i].ry);
  ctx.closePath();
  // Gradient: more opaque near viewer, fading to transparent at horizon
  const grad = ctx.createLinearGradient(ribbon[0].px, ribbon[0].py, ribbon[n-1].px, ribbon[n-1].py);
  grad.addColorStop(0,   'rgba(0,5,30,0.45)');
  grad.addColorStop(0.6, 'rgba(0,5,30,0.20)');
  grad.addColorStop(1,   'rgba(0,5,30,0.00)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

// ── Perspective grid lines across the ribbon (depth cue) ──────────
function drawGroundGrid(ctx, ribbon, color) {
  const n = ribbon.length;
  const markerTs = [0.18, 0.36, 0.54, 0.70, 0.83];
  for (const t0 of markerTs) {
    const idx = Math.round(t0 * (n - 1));
    const pt  = ribbon[idx];
    if (!pt) continue;
    ctx.save();
    ctx.globalAlpha = 0.28 * (1 - t0 * 0.6);
    ctx.strokeStyle = color;
    ctx.lineWidth   = Math.max(0.5, 1.5 * (1 - t0));
    ctx.lineCap     = 'butt';
    ctx.beginPath();
    ctx.moveTo(pt.lx, pt.ly);
    ctx.lineTo(pt.rx, pt.ry);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Glowing edge lines ────────────────────────────────────────────
function drawRibbonEdges(ctx, ribbon, color, glow) {
  const n = ribbon.length;
  for (const side of ['l', 'r']) {
    const xk = side === 'l' ? 'lx' : 'rx';
    const yk = side === 'l' ? 'ly' : 'ry';

    // Wide soft outer glow
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ribbon[0][xk], ribbon[0][yk]);
    for (let i = 1; i < n; i++) ctx.lineTo(ribbon[i][xk], ribbon[i][yk]);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 8;
    ctx.globalAlpha = 0.18;
    ctx.lineCap     = 'round';
    ctx.stroke();
    ctx.restore();

    // Core bright line with shadow glow
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ribbon[0][xk], ribbon[0][yk]);
    for (let i = 1; i < n; i++) ctx.lineTo(ribbon[i][xk], ribbon[i][yk]);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.2;
    ctx.lineCap     = 'round';
    ctx.shadowBlur  = 16;
    ctx.shadowColor = glow;
    ctx.stroke();
    // Second pass for extra bloom
    ctx.lineWidth  = 0.8;
    ctx.shadowBlur = 30;
    ctx.stroke();
    ctx.restore();
  }
}

// ── Animated centre-lane dashes ───────────────────────────────────
function drawCenterDashes(ctx, ribbon, color, glow, time) {
  const n       = ribbon.length;
  const speed   = 0.52;
  const dashLen = 0.06;
  const gapLen  = 0.04;
  const period  = dashLen + gapLen;
  const offset  = (time * speed) % period;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap     = 'round';
  ctx.shadowBlur  = 10;
  ctx.shadowColor = glow;

  let drawing = false;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const t     = ribbon[i].t;
    const phase = ((t - (-offset)) % period + period) % period;
    const lw    = Math.max(0.6, 2.0 * (1 - t * 0.88));
    ctx.lineWidth = lw;
    if (phase < dashLen) {
      if (!drawing) { ctx.moveTo(ribbon[i].px, ribbon[i].py); drawing = true; }
      else            ctx.lineTo(ribbon[i].px, ribbon[i].py);
    } else {
      if (drawing) { ctx.stroke(); ctx.beginPath(); drawing = false; }
    }
  }
  if (drawing) ctx.stroke();
  ctx.restore();
}

// ── Animated V-chevrons marching toward destination ───────────────
function drawChevrons(ctx, ribbon, color, glow, time) {
  const n      = ribbon.length;
  const count  = 6;
  const speed  = 0.58;
  const offset = (time * speed) % 1;

  for (let c = 0; c < count; c++) {
    const t0 = ((c / count) + offset) % 1;
    if (t0 < 0.03 || t0 > 0.96) continue;

    const idx = Math.round(t0 * (n - 1));
    const pt  = ribbon[idx];
    if (!pt) continue;

    const sz    = pt.hw * 0.78;
    const alpha = (1 - t0) * 0.9;
    const lw    = Math.max(0.5, 2.4 * (1 - t0));

    ctx.save();
    ctx.translate(pt.px, pt.py);
    // Rotate so the V opens backward (tip points forward along path)
    ctx.rotate(pt.tangAngle + Math.PI / 2);
    ctx.globalAlpha  = alpha;
    ctx.strokeStyle  = color;
    ctx.lineWidth    = lw;
    ctx.lineCap      = 'round';
    ctx.lineJoin     = 'round';
    ctx.shadowBlur   = 10;
    ctx.shadowColor  = glow;
    ctx.beginPath();
    ctx.moveTo(-sz,  sz * 0.55);   // left arm (backward)
    ctx.lineTo(0,   -sz * 0.60);   // tip (forward = up in local space)
    ctx.lineTo( sz,  sz * 0.55);   // right arm (backward)
    ctx.stroke();
    ctx.restore();
  }
}

// ── 3-D foreshortened ground arrow at the user's feet ────────────
function draw3DArrow(ctx, sx, sy, vpX, vpY, hw, color, glow) {
  // Forward / lateral unit vectors
  const dx  = vpX - sx, dy  = vpY - sy;
  const len = Math.sqrt(dx*dx + dy*dy) || 1;
  const ux  = dx / len, uy  = dy / len;   // forward (toward VP)
  const nx  = -uy,      ny  =  ux;         // left-hand normal

  // Arrow geometry (all in world-ish units relative to sx,sy)
  const aFwd  = hw * 2.8;   // tip distance ahead
  const aWing = hw * 1.65;  // max half-width at wings
  const sHalf = hw * 0.44;  // shaft half-width
  const sTail = hw * 1.25;  // shaft length (behind center)

  // Key vertices
  const tip  = v(sx + ux * aFwd * 0.60, sy + uy * aFwd * 0.60);
  const rwA  = v(sx + nx * aWing        + ux * aFwd * 0.04, sy + ny * aWing        + uy * aFwd * 0.04);
  const rwB  = v(sx + nx * sHalf        + ux * aFwd * 0.12, sy + ny * sHalf        + uy * aFwd * 0.12);
  const rTail = v(sx + nx * sHalf        - ux * sTail,       sy + ny * sHalf        - uy * sTail);
  const lTail = v(sx - nx * sHalf        - ux * sTail,       sy - ny * sHalf        - uy * sTail);
  const lwB  = v(sx - nx * sHalf        + ux * aFwd * 0.12, sy - ny * sHalf        + uy * aFwd * 0.12);
  const lwA  = v(sx - nx * aWing        + ux * aFwd * 0.04, sy - ny * aWing        + uy * aFwd * 0.04);

  const topFace = [tip, rwA, rwB, rTail, lTail, lwB, lwA];

  // ── Ground shadow (offset down-screen = viewer-side depth) ─────
  const sd = 7;
  ctx.save();
  ctx.beginPath();
  topFace.forEach((p, i) => i ? ctx.lineTo(p.x + sd, p.y + sd) : ctx.moveTo(p.x + sd, p.y + sd));
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.filter    = 'blur(4px)';
  ctx.fill();
  ctx.restore();

  // ── Side face — tail edge visible to viewer ────────────────────
  // "Down" direction in screen space for the extrusion
  const thick = 9;
  const downX = -ux * 0.25;        // slightly backward
  const downY = -uy * 0.25 + 1.0;  // biased toward screen-bottom

  ctx.save();
  // Tail face (the flat end closest to viewer)
  ctx.beginPath();
  ctx.moveTo(rTail.x, rTail.y);
  ctx.lineTo(lTail.x, lTail.y);
  ctx.lineTo(lTail.x + downX * thick, lTail.y + downY * thick);
  ctx.lineTo(rTail.x + downX * thick, rTail.y + downY * thick);
  ctx.closePath();
  ctx.fillStyle = shiftColor(color, -0.48);
  ctx.fill();
  // Right flank
  ctx.beginPath();
  ctx.moveTo(rwA.x, rwA.y); ctx.lineTo(rwB.x, rwB.y); ctx.lineTo(rTail.x, rTail.y);
  ctx.lineTo(rTail.x + downX * thick * 0.7, rTail.y + downY * thick * 0.7);
  ctx.lineTo(rwB.x  + downX * thick * 0.4,  rwB.y  + downY * thick * 0.4);
  ctx.lineTo(rwA.x  + downX * thick * 0.15, rwA.y  + downY * thick * 0.15);
  ctx.closePath();
  ctx.fillStyle = shiftColor(color, -0.38);
  ctx.fill();
  // Left flank
  ctx.beginPath();
  ctx.moveTo(lwA.x, lwA.y); ctx.lineTo(lwB.x, lwB.y); ctx.lineTo(lTail.x, lTail.y);
  ctx.lineTo(lTail.x + downX * thick * 0.7, lTail.y + downY * thick * 0.7);
  ctx.lineTo(lwB.x   + downX * thick * 0.4, lwB.y   + downY * thick * 0.4);
  ctx.lineTo(lwA.x   + downX * thick * 0.15, lwA.y  + downY * thick * 0.15);
  ctx.closePath();
  ctx.fillStyle = shiftColor(color, -0.38);
  ctx.fill();
  ctx.restore();

  // ── Top face ──────────────────────────────────────────────────
  ctx.save();
  ctx.shadowBlur  = 32;
  ctx.shadowColor = glow;
  ctx.beginPath();
  topFace.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath();
  // Gradient tip → tail
  const grad = ctx.createLinearGradient(tip.x, tip.y, (rTail.x + lTail.x) / 2, (rTail.y + lTail.y) / 2);
  grad.addColorStop(0,   shiftColor(color,  0.28));
  grad.addColorStop(0.5, color);
  grad.addColorStop(1,   shiftColor(color, -0.22));
  ctx.fillStyle   = grad;
  ctx.fill();
  ctx.shadowBlur  = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.52)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.restore();
}

// ── U-turn ring for when destination is behind ────────────────────
function drawUTurnHint(ctx, W, H, ang, color, glow) {
  const cx  = W * 0.50, cy = H * 0.54;
  const r   = Math.min(W, H) * 0.10;
  const dir = ang > 0 ? 1 : -1;

  ctx.save();
  ctx.shadowBlur  = 18;
  ctx.shadowColor = glow;
  ctx.strokeStyle = color;
  ctx.lineWidth   = 4.5;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 1.0, Math.PI * 0.0, dir > 0);
  ctx.stroke();
  // Arrowhead at the end of the arc
  const endX = cx + (dir > 0 ? r : -r), endY = cy;
  ctx.beginPath();
  ctx.moveTo(endX - dir * 11, endY - 8);
  ctx.lineTo(endX,             endY);
  ctx.lineTo(endX - dir * 11, endY + 8);
  ctx.stroke();
  ctx.shadowBlur  = 8;
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.font = `bold 14px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillStyle   = color;
  ctx.textAlign   = 'center';
  ctx.fillText(dir > 0 ? 'Turn Right' : 'Turn Left', cx, cy + r + 22);
  ctx.restore();
}

// ── Tiny helpers ──────────────────────────────────────────────────
function v(x, y) { return { x, y }; }

/** Lighten (amt > 0) or darken (amt < 0) a #RRGGBB hex colour. */
function shiftColor(hex, amt) {
  const m = String(hex).match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  let r = parseInt(m[1].slice(0, 2), 16);
  let g = parseInt(m[1].slice(2, 4), 16);
  let b = parseInt(m[1].slice(4, 6), 16);
  r = Math.min(255, Math.max(0, Math.round(r + amt * 255)));
  g = Math.min(255, Math.max(0, Math.round(g + amt * 255)));
  b = Math.min(255, Math.max(0, Math.round(b + amt * 255)));
  return `rgb(${r},${g},${b})`;
}

function updateCompassView() {
  const wp = currentWaypoint();
  if (!wp || !state.userPos) return;

  const bearing  = getBearing(state.userPos, wp);
  const dist     = getDistance(state.userPos, wp);

  // Rotate entire ring opposite to heading so North stays "up"
  const ring = $('compass-ring');
  if (ring && state.headingReady) ring.style.transform = `rotate(${-state.heading}deg)`;

  // Needle points toward waypoint (absolute bearing)
  const needle = $('compass-needle-wrap');
  if (needle) needle.style.transform = `rotate(${bearing}deg)`;

  const lbl = $('compass-label');
  if (lbl) lbl.textContent = fmtDist(dist);

  const bLbl = $('compass-bearing-label');
  if (bLbl) bLbl.textContent = `Heading ${bearingToCardinal(bearing)}`;
}

// ─────────────────────────────────────────────────────────────────
// WAYPOINT LOGIC
// ─────────────────────────────────────────────────────────────────
const ARRIVE_THRESHOLD = 18; // metres
const WARN_THRESHOLD   = 55; // metres (show obstacle warning)

function checkWaypointAdvance() {
  const wp = currentWaypoint();
  if (!wp || !state.userPos) return;

  const dist = getDistance(state.userPos, wp);

  if (dist <= ARRIVE_THRESHOLD) {
    advanceWaypoint();
    return;
  }
  // Approaching obstacle?
  if (wp.obstacles.length && dist <= WARN_THRESHOLD && state.warnedObsIdx !== state.waypointIdx) {
    state.warnedObsIdx = state.waypointIdx;
    showObstacleBanner(wp.obstacles[0]);
  }
}

function advanceWaypoint() {
  const route = state.currentRoute;

  // Mark dot done
  const dot = $(`wpdot-${state.waypointIdx}`);
  if (dot) { dot.classList.remove('current'); dot.classList.add('done'); }

  if (state.waypointIdx >= route.waypoints.length - 1) {
    showArrival(); return;
  }

  state.waypointIdx++;
  const newDot = $(`wpdot-${state.waypointIdx}`);
  if (newDot) newDot.classList.add('current');

  updateInstruction();
  if (state.voiceOn) speak(route.waypoints[state.waypointIdx].instruction);
  // Refresh map route colours to reflect completed segment
  if (mapNavReady) updateNavMapRoute();
}

function buildWaypointDots() {
  const route = state.currentRoute;
  $('wp-dots').innerHTML = route.waypoints
    .map((_, i) => `<div class="wp-dot ${i === 0 ? 'current' : ''}" id="wpdot-${i}"></div>`)
    .join('');
}

function updateInstruction() {
  const wp = currentWaypoint();
  if (!wp) return;
  const route = state.currentRoute;

  $('instr-icon').textContent    = wp.icon;
  $('instr-primary').textContent = wp.instruction;
  $('instr-secondary').textContent =
    `Waypoint ${state.waypointIdx + 1} of ${route.waypoints.length} · ${wp.name}`;
}

function currentWaypoint() {
  return state.currentRoute?.waypoints[state.waypointIdx] ?? null;
}

// ─────────────────────────────────────────────────────────────────
// OBSTACLE BANNER
// ─────────────────────────────────────────────────────────────────
function showObstacleBanner(type) {
  const msgs = {
    uneven_pavement: '⚠️ Uneven pavement ahead — proceed with care',
    construction:    '🚧 Construction zone ahead',
    low_lighting:    '🌙 Low-lighting section ahead',
    stairs:          '🪜 Stairs ahead — no wheelchair access',
  };
  const msg = msgs[type] || '⚠️ Obstacle ahead';
  $('obstacle-icon').textContent = msg.slice(0, 2);
  $('obstacle-text').textContent = msg.slice(3);
  $('obstacle-banner').style.display = 'flex';
  if (state.voiceOn) speak(msg.replace(/^.{2}/, '').trim());
  setTimeout(() => { $('obstacle-banner').style.display = 'none'; }, 7000);
}

// ─────────────────────────────────────────────────────────────────
// ARRIVAL
// ─────────────────────────────────────────────────────────────────
function showArrival() {
  if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
  const route    = state.currentRoute;
  const elapsed  = Math.round((Date.now() - state.startTime) / 60000);
  const distText = `${route.distanceMi} mi`;

  $('arrival-sub').textContent =
    `You completed the ${route.name}!`;
  $('arrival-stats').innerHTML = `
    <div class="arrival-stat">
      <div class="arrival-stat-val">${distText}</div>
      <div class="arrival-stat-lbl">Distance</div>
    </div>
    <div class="arrival-stat">
      <div class="arrival-stat-val">${elapsed || route.durationMin} min</div>
      <div class="arrival-stat-lbl">Time</div>
    </div>
    <div class="arrival-stat">
      <div class="arrival-stat-val">${route.waypoints.length}</div>
      <div class="arrival-stat-lbl">Waypoints</div>
    </div>`;
  $('arrival-overlay').style.display = 'flex';
  if (state.voiceOn)
    speak(`Route complete! You have arrived at ${route.waypoints.at(-1).name}.`);
}

// ─────────────────────────────────────────────────────────────────
// VOICE
// ─────────────────────────────────────────────────────────────────
function speak(text) {
  if (!state.voiceOn || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt  = new SpeechSynthesisUtterance(text);
  utt.rate   = 0.95;
  utt.pitch  = 1.0;
  window.speechSynthesis.speak(utt);
}

function toggleVoice() {
  state.voiceOn = !state.voiceOn;
  $('btn-voice').textContent = state.voiceOn ? '🔊' : '🔇';
  $('btn-voice').classList.toggle('muted', !state.voiceOn);
  if (!state.voiceOn) window.speechSynthesis?.cancel();
}

// ─────────────────────────────────────────────────────────────────
// TAB SWITCHING
// ─────────────────────────────────────────────────────────────────

function cycleNavTab() {
  showNavTab(state.navTab === 'ar' ? 'map' : 'ar');
}

function showNavTab(tab) {
  console.log('[MAP] showNavTab called with:', tab);
  state.navTab = tab;

  // Update pill indicators
  $('tab-dot-ar') .classList.toggle('is-active', tab === 'ar');
  $('tab-dot-map').classList.toggle('is-active', tab === 'map');

  if (tab === 'map') {
    // Open the map modal
    $('map-modal-overlay').classList.add('is-open');

    // Give the modal a frame to render so the container has dimensions
    requestAnimationFrame(() => {
      if (!mapNavInstance) {
        console.log('[MAP] No existing map instance, calling initNavMap()');
        initNavMap();
      } else {
        console.log('[MAP] Map instance exists, calling resize()');
        mapNavInstance.resize();
      }
    });
  } else {
    closeMapModal();
  }
}

function closeMapModal() {
  $('map-modal-overlay').classList.remove('is-open');
  state.navTab = 'ar';
  $('tab-dot-ar') .classList.add('is-active');
  $('tab-dot-map').classList.remove('is-active');
}

// ─────────────────────────────────────────────────────────────────
// NAVIGATION MAP  (Mapbox satellite, top-down)
// ─────────────────────────────────────────────────────────────────

function initNavMap() {
  console.log('[MAP] initNavMap() called');
  const route = state.currentRoute;
  if (!route || typeof mapboxgl === 'undefined') {
    console.error('[MAP] ABORT: route=', !!route, 'mapboxgl=', typeof mapboxgl);
    return;
  }

  mapboxgl.accessToken = MAPBOX_TOKEN;
  const first = route.waypoints[0];
  const container = $('nav-map-tab');
  console.log('[MAP] Container dimensions:', container.offsetWidth, 'x', container.offsetHeight);

  try {
    mapNavInstance = new mapboxgl.Map({
      container:  'nav-map-tab',
      style:      'mapbox://styles/mapbox/satellite-streets-v12',
      center:     [first.lng, first.lat],
      zoom:       17,
      pitch:      0,
      bearing:    state.headingReady ? state.heading : 0,
      antialias:  true,
    });
    console.log('[MAP] Map instance created');
  } catch (e) {
    console.error('[MAP] ERROR creating Map:', e);
    return;
  }

  const geo = new mapboxgl.GeolocateControl({
    positionOptions:   { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserHeading:   true,
    showAccuracyCircle: true,
  });
  mapNavInstance.addControl(geo, 'bottom-right');
  mapNavInstance.addControl(new mapboxgl.NavigationControl({ showCompass: true, showZoom: true }), 'top-right');

  mapNavInstance.on('error', (e) => {
    console.error('[MAP] Mapbox error:', e.error ? e.error.message : e);
  });

  mapNavInstance.on('load', () => {
    console.log('[MAP] Map loaded, canvas:', mapNavInstance.getCanvas().width, 'x', mapNavInstance.getCanvas().height);
    mapNavReady = true;
    drawNavMapRoute();
    fitNavMapToRoute();
    setTimeout(() => { try { geo.trigger(); } catch { /* ignore */ } }, 400);
  });
}

/** Fit the map bounds to show the entire route with padding. */
function fitNavMapToRoute() {
  console.log('[MAP] fitNavMapToRoute() called');
  if (!mapNavInstance || !state.currentRoute) {
    console.warn('[MAP] fitNavMapToRoute ABORT: mapNavInstance=', !!mapNavInstance, 'currentRoute=', !!state.currentRoute);
    return;
  }
  const bounds = new mapboxgl.LngLatBounds();
  state.currentRoute.waypoints.forEach(wp => bounds.extend([wp.lng, wp.lat]));
  console.log('[MAP] Fitting bounds:', JSON.stringify(bounds));
  mapNavInstance.fitBounds(bounds, { padding: 60, maxZoom: 17, duration: 600 });
}

/** Draw (or redraw) the route + waypoint markers on the nav map. */
function drawNavMapRoute() {
  console.log('[MAP] drawNavMapRoute() called, mapNavInstance=', !!mapNavInstance, 'mapNavReady=', mapNavReady);
  if (!mapNavInstance || !mapNavReady) return;
  const route = state.currentRoute;
  if (!route) { console.warn('[MAP] drawNavMapRoute: no currentRoute'); return; }
  console.log('[MAP] Drawing route:', route.name, 'with', route.waypoints.length, 'waypoints, waypointIdx=', state.waypointIdx);

  const allCoords  = route.waypoints.map(wp => [wp.lng, wp.lat]);
  const doneCoords = allCoords.slice(0, state.waypointIdx + 1);   // up to current (inclusive)
  const pendCoords = allCoords.slice(state.waypointIdx);           // current → end

  // ── Helper: upsert source + layer ────────────────────────────
  function setLine(id, coords, paint) {
    const geojson = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } };
    if (mapNavInstance.getSource(id)) {
      mapNavInstance.getSource(id).setData(geojson);
    } else {
      mapNavInstance.addSource(id, { type: 'geojson', data: geojson });
      mapNavInstance.addLayer({ id, type: 'line', source: id, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint });
    }
  }

  // Route casing (dark border for contrast against satellite)
  setLine('nm-pend-casing', pendCoords, { 'line-color': '#001a40', 'line-width': 10, 'line-opacity': 0.65 });
  // Pending segment (UD blue)
  setLine('nm-pending',     pendCoords, { 'line-color': '#00539F', 'line-width': 6,  'line-opacity': 1.0  });
  // Completed segment (green)
  if (doneCoords.length >= 2) {
    setLine('nm-done', doneCoords, { 'line-color': '#22c55e', 'line-width': 5, 'line-opacity': 0.9 });
  }

  // ── Waypoint markers ─────────────────────────────────────────
  const features = route.waypoints.map((wp, i) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [wp.lng, wp.lat] },
    properties: {
      status: i < state.waypointIdx ? 'done' : i === state.waypointIdx ? 'current' : 'pending',
      label:  wp.name,
    },
  }));
  const fcWp = { type: 'FeatureCollection', features };

  if (mapNavInstance.getSource('nm-waypoints')) {
    mapNavInstance.getSource('nm-waypoints').setData(fcWp);
  } else {
    mapNavInstance.addSource('nm-waypoints', { type: 'geojson', data: fcWp });
    // White casing ring
    mapNavInstance.addLayer({
      id: 'nm-wp-casing', type: 'circle', source: 'nm-waypoints',
      paint: { 'circle-radius': 13, 'circle-color': '#ffffff', 'circle-opacity': 0.92 },
    });
    // Coloured fill
    mapNavInstance.addLayer({
      id: 'nm-wp-fill', type: 'circle', source: 'nm-waypoints',
      paint: {
        'circle-radius': 9,
        'circle-color': ['match', ['get', 'status'], 'done', '#22c55e', 'current', '#FFD200', '#00539F'],
      },
    });
    // Label
    mapNavInstance.addLayer({
      id: 'nm-wp-label', type: 'symbol', source: 'nm-waypoints',
      layout: {
        'text-field': ['get', 'label'],
        'text-font':  ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        'text-size':  11,
        'text-offset': [0, 1.8],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(0,0,0,0.75)',
        'text-halo-width': 1.5,
      },
    });
  }

  // Pan to keep current waypoint visible (without forcing zoom level)
  const wp = route.waypoints[state.waypointIdx];
  if (wp) {
    // If the waypoint is already visible, don't pan at all
    const mapBounds = mapNavInstance.getBounds();
    if (!mapBounds.contains([wp.lng, wp.lat])) {
      mapNavInstance.easeTo({ center: [wp.lng, wp.lat], duration: 700 });
    }
  }
}

/** Called after each waypoint advance to update segment colours. */
function updateNavMapRoute() {
  drawNavMapRoute(); // setData() calls inside are efficient — no layer teardown
}

// ─────────────────────────────────────────────────────────────────
// GEO MATH
// ─────────────────────────────────────────────────────────────────
function getBearing(from, to) {
  const φ1 = from.lat * Math.PI / 180;
  const φ2 = to.lat   * Math.PI / 180;
  const Δλ = (to.lng - from.lng) * Math.PI / 180;
  const y  = Math.sin(Δλ) * Math.cos(φ2);
  const x  = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function getDistance(from, to) {
  const R  = 6371000;
  const φ1 = from.lat * Math.PI / 180;
  const φ2 = to.lat   * Math.PI / 180;
  const Δφ = (to.lat - from.lat) * Math.PI / 180;
  const Δλ = (to.lng - from.lng) * Math.PI / 180;
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1609.34).toFixed(2)} mi`;
}

function bearingToCardinal(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function cap(str) { return str.charAt(0).toUpperCase() + str.slice(1); }
