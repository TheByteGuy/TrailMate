/* community.js — stats, leaderboard, tips, and activity feed for community.html */

// ---- STATS COUNTER ANIMATION ----
function animateCounter(el, target, duration = 1500) {
  const start = Date.now();
  const isFloat = target % 1 !== 0;

  const update = () => {
    const elapsed  = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased    = 1 - Math.pow(1 - progress, 3);
    const value    = Math.round(target * eased);

    el.textContent = isFloat ? target.toFixed(1) + '★' : value.toLocaleString();

    if (progress < 1) requestAnimationFrame(update);
    else {
      el.textContent = isFloat ? target.toFixed(1) + '★' : target.toLocaleString();
      el.classList.remove('counting');
    }
  };

  el.classList.add('counting');
  requestAnimationFrame(update);
}

async function loadStats() {
  try {
    const res   = await fetch('/api/stats');
    const stats = await res.json();

    // Trigger counters when section is visible
    const bannerEl = document.querySelector('.stats-banner');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCounter(document.getElementById('stat-students'), stats.activeStudents);
          animateCounter(document.getElementById('stat-walks'),    stats.walksCompleted);
          animateCounter(document.getElementById('stat-safe'),     stats.safeNights);
          obs.disconnect();
        }
      });
    }, { threshold: 0.3 });
    obs.observe(bannerEl);
  } catch {
    // Silently fail — static placeholders remain
  }
}

// ---- LEADERBOARD ----
async function loadLeaderboard() {
  const list = document.getElementById('leaderboard-list');
  try {
    const res   = await fetch('/api/leaderboard');
    const board = await res.json();
    renderLeaderboard(board);
  } catch {
    list.innerHTML = '<p style="color:var(--gray-400);padding:20px;">Could not load leaderboard.</p>';
  }
}

function renderLeaderboard(board) {
  const list = document.getElementById('leaderboard-list');
  const medals = ['🥇', '🥈', '🥉'];

  list.innerHTML = board.map((entry, i) => `
    <div class="lb-card fade-up" style="transition-delay:${i * 0.06}s;">
      <div class="lb-rank">${medals[i] || entry.rank}</div>
      <div class="avatar lb-avatar ${entry.avatarClass}">${entry.initials}</div>
      <div class="lb-info">
        <div class="lb-name">${entry.name}</div>
        <div class="lb-meta">${entry.year} · UD Verified ✓</div>
      </div>
      <div class="lb-right">
        <div>
          <div class="lb-walks">${entry.walks}</div>
          <div class="lb-walks-label">walks</div>
        </div>
        <div class="lb-badge">${entry.badge}</div>
        <div class="lb-rating">${entry.rating.toFixed(1)} ★</div>
      </div>
    </div>`).join('');

  observeFadeUps(list);
}

// ---- CAMPUS TIPS ----
async function loadTips() {
  const grid = document.getElementById('tips-grid');
  try {
    const res  = await fetch('/api/tips');
    const tips = await res.json();
    renderTips(tips);
  } catch {
    grid.innerHTML = '<p style="color:var(--gray-400);padding:20px;">Could not load tips.</p>';
  }
}

function renderTips(tips) {
  const grid = document.getElementById('tips-grid');
  grid.innerHTML = tips.map((tip, i) => `
    <div class="tip-card fade-up" style="transition-delay:${i * 0.06}s;">
      <div class="tip-icon">${tip.icon}</div>
      <div class="tip-title">${tip.title}</div>
      <div class="tip-body">${tip.body}</div>
    </div>`).join('');

  observeFadeUps(grid);
}

// ---- ACTIVITY FEED ----
async function loadActivity() {
  const feed = document.getElementById('activity-feed');
  try {
    const res   = await fetch('/api/walks');
    const walks = await res.json();
    renderActivity(walks.slice(0, 8));
  } catch {
    feed.innerHTML = '<p style="color:rgba(255,255,255,0.4);padding:20px;">Could not load activity.</p>';
  }
}

function renderActivity(walks) {
  const feed = document.getElementById('activity-feed');
  if (walks.length === 0) {
    feed.innerHTML = '<p style="color:rgba(255,255,255,0.4);padding:20px;">No recent activity.</p>';
    return;
  }

  const timePhrases = ['Just now', '2m ago', '5m ago', '8m ago', '12m ago', '18m ago', '25m ago', '34m ago'];

  feed.innerHTML = walks.map((walk, i) => `
    <div class="activity-item">
      <div class="activity-avatar-sm avatar ${walk.avatarClass}">${walk.initials}</div>
      <div class="activity-text">
        <strong>${walk.name}</strong> posted a walk:
        <span class="activity-route">${walk.from} → ${walk.to}</span>
        · ${walk.typeLabel}
      </div>
      <div class="activity-time">${timePhrases[i] || 'Recently'}</div>
    </div>`).join('');
}

// ---- SHARED: observe fade-up inside a container ----
function observeFadeUps(container) {
  const obs = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.1 }
  );
  container.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
}

// ---- INIT ----
loadStats();
loadLeaderboard();
loadTips();
loadActivity();
