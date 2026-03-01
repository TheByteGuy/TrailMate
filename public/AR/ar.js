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
      { lat: 39.6797, lng: -75.7520, name: 'Morris Library',        icon: '📚', instruction: 'Start at Morris Library main entrance, face The Green', a11y: 'Automatic doors, ramp on south side', obstacles: [] },
      { lat: 39.6793, lng: -75.7514, name: 'Library Walk',          icon: '🚶', instruction: 'Continue northeast along Library Walk — smooth paved path', a11y: 'Wide path, no curbs, tactile pavement', obstacles: [] },
      { lat: 39.6789, lng: -75.7511, name: 'The Green',             icon: '🌳', instruction: 'Cross The Green heading north toward Trabant', a11y: 'Paved perimeter path available for mobility aids', obstacles: [] },
      { lat: 39.6800, lng: -75.7511, name: 'Trabant Approach',      icon: '🏛️', instruction: 'Head north — Trabant Student Center straight ahead', a11y: 'Flat paved surface, excellent lighting', obstacles: [] },
      { lat: 39.6810, lng: -75.7511, name: 'Trabant Student Center', icon: '🎯', instruction: 'You have arrived at Trabant Student Center!', a11y: 'Accessible entrance on west side, elevator inside', obstacles: [] },
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
});

// expose methods needed by inline onclick attributes
window.arApp = {
  toggleVoice,
  toggleCamera,
  exitNavigation,
  requestOrientationPermission,
  skipPermission,
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

  state.waypointIdx = 0;
  state.cameraOn    = arMode;
  state.startTime   = Date.now();
  state.warnedObsIdx = -1;

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
  window.speechSynthesis?.cancel();

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

  const cx = W / 2, cy = H / 2 + 20;
  const R  = Math.min(W, H) * 0.27;

  // Soft guide ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R + 4, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Direction arrow
  drawArrow(ctx, cx, cy, relAngle, R * 0.7, color, glow);

  // Distance label below arrow
  if (dist !== null) {
    ctx.save();
    ctx.shadowBlur  = 10;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.font        = 'bold 20px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle   = '#fff';
    ctx.textAlign   = 'center';
    ctx.fillText(fmtDist(dist), cx, cy + R + 30);
    ctx.restore();
  }

  // Cardinal label
  ctx.save();
  ctx.shadowBlur  = 6;
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.font        = '13px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle   = 'rgba(255,255,255,0.6)';
  ctx.textAlign   = 'center';
  ctx.fillText(bearingToCardinal(relAngle), cx, cy + R + 52);
  ctx.restore();
}

function drawArrow(ctx, cx, cy, angleDeg, size, color, glow) {
  const rad = (angleDeg - 90) * Math.PI / 180; // 0° → points up
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad);

  ctx.shadowBlur  = 28;
  ctx.shadowColor = glow;

  // Arrow shape
  ctx.beginPath();
  ctx.moveTo(0,           -size);           // tip
  ctx.lineTo( size * 0.38, size * 0.22);    // right wing
  ctx.lineTo( size * 0.16, size * 0.02);    // right notch
  ctx.lineTo( size * 0.16, size * 0.52);    // right tail
  ctx.lineTo(-size * 0.16, size * 0.52);    // left tail
  ctx.lineTo(-size * 0.16, size * 0.02);    // left notch
  ctx.lineTo(-size * 0.38, size * 0.22);    // left wing
  ctx.closePath();

  ctx.fillStyle   = color;
  ctx.fill();
  ctx.shadowBlur  = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth   = 1.8;
  ctx.stroke();

  ctx.restore();
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
