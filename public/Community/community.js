/* community.js */

let leaderboardData = [];
let currentSort = 'steps';

// ---- Animated counters ----
function animateCounters() {
  const counters = document.querySelectorAll('.comm-stat-number[data-target]');
  counters.forEach(el => {
    const target = parseInt(el.dataset.target);
    const format = el.dataset.format;
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);

      if (format === 'steps') {
        el.textContent = value.toLocaleString() + suffix;
      } else {
        el.textContent = value.toLocaleString() + suffix;
      }

      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

function assignBadges(user) {
  const badges = [];

  // Example rules
  if (user.walks >= 25) badges.push('Trail Guide');
  if (user.walks >= 10 && user.walks < 25) badges.push('10 Walks');
  if (user.walks >= 100) badges.push('100 Walks');

  if (user.steps >= 50000) badges.push('Campus Explorer');
  if (user.miles >= 50) badges.push('Marathon Walker');

  // If you track walk times, can assign Night Owl / Early Bird
  if (user.walksAfter9PM >= 10) badges.push('Night Owl');
  if (user.walksBefore8AM >= 10) badges.push('Early Bird');

  // Assign to user object
  user.badges = badges;
  user.badge = badges[0] || '';
}
// ---- Load stats from API ----
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    const cards = document.querySelectorAll('.comm-stat-number[data-target]');
    if (cards[0]) cards[0].dataset.target = data.activeStudents;
    if (cards[1]) cards[1].dataset.target = data.walksCompleted;
    
    // Calculate Total Steps instead of Total Walks for cards[2]
    const totalSteps = leaderboardData.reduce((sum, u) => sum + (u.steps || 0), 0);
    if (cards[2]) cards[2].dataset.target = totalSteps;
    
  } catch (e) { /* use defaults */ }
  animateCounters();
}

// ---- Load leaderboard ----
async function loadLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    leaderboardData = await res.json();
    leaderboardData.forEach(assignBadges);
  } catch (e) {
    leaderboardData = [];
  }
  renderLeaderboard();

  // Update steps counter after leaderboard is loaded
  const cards = document.querySelectorAll('.comm-stat-number[data-target]');
  if (cards[2]) {
    const totalSteps = leaderboardData.reduce((sum, u) => sum + (u.steps || 0), 0);
    cards[2].dataset.target = totalSteps;
  }
  
  // Optional: If you also want to update miles dynamically, it would be cards[3]
  if (cards[3]) {
      const totalMiles = leaderboardData.reduce((sum, u) => sum + (u.miles || 0), 0);
      cards[3].dataset.target = totalMiles;
  }
  
  animateCounters();
}


function sortData(data, key) {
  const sorted = [...data];
  if (key === 'badges') {
    sorted.sort((a, b) => (b.badges ? b.badges.length : 0) - (a.badges ? a.badges.length : 0));
  } else {
    sorted.sort((a, b) => (b[key] || 0) - (a[key] || 0));
  }
  return sorted.map((item, i) => ({ ...item, rank: i + 1 }));
}

function getMetricLabel(sort) {
  return { steps: 'Steps', miles: 'Miles', walks: 'Walks', badges: 'Badges' }[sort] || 'Steps';
}

function getMetricValue(item, sort) {
  if (sort === 'steps') return (item.steps || 0).toLocaleString();
  if (sort === 'miles') return (item.miles || 0).toFixed(1);
  if (sort === 'walks') return item.walks || 0;
  if (sort === 'badges') return item.badges ? item.badges.length : 0;
  return 0;
}

function renderLeaderboard() {
  const sorted = sortData(leaderboardData, currentSort);
  const label = getMetricLabel(currentSort);

  // Update column header
  const thMetric = document.getElementById('th-metric');
  if (thMetric) thMetric.textContent = label;

  // Podium (top 3)
  const podium = document.getElementById('podium');
  if (podium && sorted.length >= 3) {
    // Display order: 2nd, 1st, 3rd
    const order = [sorted[1], sorted[0], sorted[2]];
    podium.innerHTML = order.map(p => {
      const isFirst = p.rank === 1;
      return `
        <div class="podium-card ${isFirst ? 'first' : ''}">
          <div class="podium-rank rank-${p.rank}">${p.rank}</div>
          <div class="podium-avatar ${p.avatarClass}">${p.initials}</div>
          <div class="podium-name">${p.name}</div>
          <div class="podium-year">${p.year}</div>
          <div class="podium-metric">${getMetricValue(p, currentSort)}</div>
          <div class="podium-metric-label">${label}</div>
          <div class="podium-badge">${p.badge}</div>
        </div>
      `;
    }).join('');
  }

  // Table
  const tbody = document.getElementById('leaderboard-body');
  if (tbody) {
    tbody.innerHTML = sorted.map(p => {
      const badgesHtml = (p.badges || []).slice(0, 3).map(b =>
        `<span class="td-badge-pill">${b}</span>`
      ).join('') + (p.badges && p.badges.length > 3 ? `<span class="td-badge-pill">+${p.badges.length - 3}</span>` : '');

      return `
        <tr>
          <td class="td-rank ${p.rank <= 3 ? 'top-3' : ''}">${p.rank}</td>
          <td>
            <div class="td-user">
              <div class="td-avatar ${p.avatarClass}">${p.initials}</div>
              <div class="td-user-info">
                <span class="td-user-name">${p.name}</span>
                <span class="td-user-year">${p.year}</span>
              </div>
            </div>
          </td>
          <td class="td-metric">${getMetricValue(p, currentSort)}</td>
          <td><div class="td-badges">${badgesHtml}</div></td>
          <td>
            <div class="td-rating">
              <span class="td-rating-star">★</span> ${p.rating.toFixed(1)}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// ---- Load tips ----
async function loadTips() {
  try {
    const res = await fetch('/api/tips');
    const tips = await res.json();
    const grid = document.getElementById('tips-grid');
    if (grid) {
      grid.innerHTML = tips.map(t => `
        <div class="comm-tip-card">
          <div class="comm-tip-icon">${t.icon}</div>
          <div class="comm-tip-title">${t.title}</div>
          <div class="comm-tip-body">${t.body}</div>
        </div>
      `).join('');
    }
  } catch (e) { /* silent */ }
}

// ---- Tab clicks ----
document.querySelectorAll('.comm-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.comm-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentSort = tab.dataset.sort;
    renderLeaderboard();
  });
});

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadLeaderboard();
  loadTips();
});
