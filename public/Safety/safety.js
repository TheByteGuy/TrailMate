/* safety.js — check-in timer, safe routes, and report form for safety.html */

// ---- CHECK-IN TIMER ----
let timerInterval  = null;
let totalSeconds   = 0;
let remainingSeconds = 0;
let selectedMins   = 0;
const RING_CIRCUMFERENCE = 552.9; // 2 * PI * 88

function selectDuration(mins) {
  selectedMins = mins;
  document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.dur-btn[data-mins="${mins}"]`).classList.add('active');
  document.getElementById('btn-start').disabled = false;

  // Preview the time on the ring
  const secs = mins * 60;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  document.getElementById('timer-display').textContent = `${m}:${s.toString().padStart(2, '0')}`;
  document.getElementById('timer-label').textContent = 'Ready to start';
  setRingOffset(0);
}

function setRingOffset(fraction) {
  // fraction 0 = full ring, fraction 1 = empty ring
  const offset = RING_CIRCUMFERENCE * fraction;
  document.getElementById('timer-ring').style.strokeDashoffset = offset;
}

function startCheckIn() {
  if (!selectedMins) return;

  totalSeconds     = selectedMins * 60;
  remainingSeconds = totalSeconds;

  const card = document.getElementById('checkin-card');
  card.classList.add('state-running');

  // Disable duration buttons while running
  document.querySelectorAll('.dur-btn').forEach(b => b.disabled = true);
  document.querySelectorAll('.checkin-input').forEach(i => i.disabled = true);

  const contactName  = document.getElementById('ci-contact').value.trim();
  const contactPhone = document.getElementById('ci-phone').value.trim();
  const myName       = document.getElementById('ci-name').value.trim();

  document.getElementById('timer-label').textContent = 'Walk in progress';
  document.getElementById('checkin-status').textContent =
    contactName ? `${contactName} will be notified if you don't check in.` : 'Timer is running — tap "I\'m Safe" when you arrive.';

  tick();
  timerInterval = setInterval(tick, 1000);
}

function tick() {
  if (remainingSeconds <= 0) {
    clearInterval(timerInterval);
    triggerAlert();
    return;
  }

  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  document.getElementById('timer-display').textContent = `${m}:${s.toString().padStart(2, '0')}`;

  const fraction = 1 - remainingSeconds / totalSeconds;
  setRingOffset(fraction);

  remainingSeconds--;
}

function markSafe() {
  clearInterval(timerInterval);

  const card = document.getElementById('checkin-card');
  card.classList.remove('state-running', 'state-alert');

  document.getElementById('timer-display').textContent = '✓';
  document.getElementById('timer-label').textContent   = 'Arrived safely!';
  setRingOffset(0);

  const contactName = document.getElementById('ci-contact').value.trim();
  const statusEl    = document.getElementById('checkin-status');
  statusEl.className = 'checkin-status safe';
  statusEl.textContent = contactName
    ? `Great! ${contactName} has been notified you arrived safely.`
    : 'Great! You\'ve checked in safely. Walk complete! 🎉';

  // Reset after 4 seconds
  setTimeout(resetCheckIn, 4000);

  showToast('🎉 Safe arrival confirmed!', 'Your check-in is complete.', false);
}

function cancelCheckIn() {
  clearInterval(timerInterval);
  resetCheckIn();
}

function triggerAlert() {
  const card = document.getElementById('checkin-card');
  card.classList.add('state-alert');

  document.getElementById('timer-display').textContent = '⚠️';
  document.getElementById('timer-label').textContent   = 'Timer expired!';
  setRingOffset(1);

  const contactName = document.getElementById('ci-contact').value.trim();
  const statusEl    = document.getElementById('checkin-status');
  statusEl.className = 'checkin-status alert';
  statusEl.textContent = contactName
    ? `⚠️ Timer expired! ${contactName} has been notified. Please call them immediately.`
    : '⚠️ Timer expired! Please let someone know you\'re safe or call UDPD: (302) 831-2222';

  showToast('⚠️ Check-In Expired!', 'Please confirm you\'re safe.', true);
}

function resetCheckIn() {
  const card = document.getElementById('checkin-card');
  card.classList.remove('state-running', 'state-alert');

  document.querySelectorAll('.dur-btn').forEach(b => b.disabled = false);
  document.querySelectorAll('.checkin-input').forEach(i => i.disabled = false);

  selectedMins     = 0;
  totalSeconds     = 0;
  remainingSeconds = 0;

  document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('timer-display').textContent = '--:--';
  document.getElementById('timer-label').textContent   = 'Select duration';
  document.getElementById('btn-start').disabled = true;

  const statusEl = document.getElementById('checkin-status');
  statusEl.className  = 'checkin-status';
  statusEl.textContent = '';

  setRingOffset(0);
}

// ---- SAFE ROUTES ----
async function loadRoutes() {
  const list = document.getElementById('routes-list');
  try {
    const res    = await fetch('/api/routes');
    const routes = await res.json();
    renderRoutes(routes);
  } catch {
    list.innerHTML = '<p style="color:var(--gray-400);padding:20px;">Could not load routes.</p>';
  }
}

function renderRoutes(routes) {
  const list = document.getElementById('routes-list');
  list.innerHTML = routes.map(route => {
    const lightClass   = route.lighting === 'Excellent' ? 'badge-excellent' : 'badge-good';
    const popularBadge = route.popular   ? '<span class="route-badge badge-popular">Popular</span>' : '';
    const cameraBadge  = route.cameras   ? '<span class="route-badge badge-camera">📹 Cameras</span>' : '';
    return `
      <div class="route-card fade-up">
        <div class="route-icon">🛤️</div>
        <div class="route-info">
          <div class="route-name">${route.name}</div>
          <div class="route-notes">${route.notes}</div>
          <div class="route-badges">
            <span class="route-badge ${lightClass}">💡 ${route.lighting} Lighting</span>
            ${cameraBadge}
            ${popularBadge}
          </div>
        </div>
        <div class="route-distance">${route.distance}</div>
      </div>`;
  }).join('');

  // Re-observe new fade-up elements
  document.querySelectorAll('.route-card.fade-up').forEach(el => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    obs.observe(el);
  });
}


// ---- INIT ----
loadRoutes();

// Handle hash-based scrolling (e.g., /safety.html#routes)
if (window.location.hash) {
  setTimeout(() => {
    const target = document.querySelector(window.location.hash);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  }, 300);
}
