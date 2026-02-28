/* walks.js — walks listing, filtering, modal, and join logic for walks.html */

let currentFilter = 'all';
const joinedWalks = new Set();

// ---- MODAL ----
function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  const dt = new Date(Date.now() + 30 * 60 * 1000);
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  document.getElementById('f-time').value = local;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('modal-overlay').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
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
    const url = filter === 'all' ? '/api/walks' : `/api/walks?type=${filter}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed');
    const walks = await res.json();
    renderWalks(walks);
  } catch {
    grid.innerHTML = `
      <div class="loading-state">
        <div style="font-size:40px;">⚠️</div>
        <p style="color:var(--gray-700);">Could not load walks. Is the server running?</p>
      </div>`;
  }
}

function renderWalks(walks) {
  const grid = document.getElementById('walks-grid');
  if (walks.length === 0) {
    grid.innerHTML = `
      <div class="loading-state" style="grid-column:1/-1;">
        <div style="font-size:48px;">🚶</div>
        <div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--gray-700);">No walks found</div>
        <p>Be the first to post a walk in this category!</p>
        <button class="btn-primary" onclick="openModal()" style="margin-top:16px;">+ Post a Walk</button>
      </div>`;
    return;
  }
  grid.innerHTML = walks.map(walk => buildCardHTML(walk)).join('');
}

function buildCardHTML(walk) {
  const spotsLeft = walk.maxSpots - walk.joinedSpots - 1;
  const fillPct   = Math.round(((walk.joinedSpots + 1) / walk.maxSpots) * 100);
  const isFull    = spotsLeft <= 0;
  const isJoined  = joinedWalks.has(walk.id);
  const tagsHTML  = walk.tags.map(t => `<span class="tag">${t}</span>`).join('');
  const notesHTML = walk.notes ? `<p class="walk-notes">"${walk.notes}"</p>` : '';

  let btnClass = 'btn-join';
  let btnText  = 'Join Walk →';
  if (isJoined)    { btnClass += ' joined'; btnText = '✓ Joined!'; }
  else if (isFull) { btnClass += ' full';   btnText = 'Walk Full'; }

  return `
    <div class="walk-card" id="walk-${walk.id}">
      <div class="walk-card-top">
        <div class="walk-user">
          <div class="avatar ${walk.avatarClass}">${walk.initials}</div>
          <div>
            <div class="walk-user-name">${walk.name}</div>
            <div class="walk-user-year">${walk.year} · UD Verified ✓</div>
          </div>
        </div>
        <span class="walk-type-badge ${walk.typeBadge}">${walk.typeLabel}</span>
      </div>

      <div class="walk-route">
        <span class="walk-route-from">${walk.from}</span>
        <span class="walk-route-arrow">→</span>
        <span class="walk-route-to">${walk.to}</span>
      </div>

      <div class="walk-meta">
        <div class="walk-meta-item">
          <span class="walk-meta-icon">🕐</span>
          ${walk.time}
        </div>
        <div class="walk-meta-item" id="spots-meta-${walk.id}">
          <span class="walk-meta-icon">👥</span>
          ${isFull ? 'Full' : spotsLeft + ' spot' + (spotsLeft !== 1 ? 's' : '') + ' left'}
        </div>
      </div>

      <div class="walk-spots">
        <div class="walk-spots-text">
          <span>Group size</span>
          <strong id="spots-count-${walk.id}">${walk.joinedSpots + 1} / ${walk.maxSpots} people</strong>
        </div>
        <div class="spots-bar">
          <div class="spots-fill" id="spots-fill-${walk.id}" style="width:${fillPct}%"></div>
        </div>
      </div>

      <div class="walk-tags">${tagsHTML}</div>
      ${notesHTML}

      <div class="walk-card-footer">
        <span class="walk-card-time">Posted recently</span>
        <button
          class="${btnClass}"
          id="join-btn-${walk.id}"
          onclick="joinWalk(${walk.id})"
          ${(isFull || isJoined) ? 'disabled' : ''}
        >${btnText}</button>
      </div>
    </div>`;
}

// ---- JOIN WALK ----
async function joinWalk(id) {
  if (joinedWalks.has(id)) return;
  const btn = document.getElementById(`join-btn-${id}`);
  if (!btn || btn.disabled) return;

  btn.disabled = true;
  btn.textContent = 'Joining...';

  try {
    const res  = await fetch(`/api/walks/${id}/join`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      showToast('⚠️ ' + (data.error || 'Could not join walk.'), '', true);
      btn.disabled = false;
      btn.textContent = 'Join Walk →';
      return;
    }

    joinedWalks.add(id);
    const walk     = data.walk;
    const spotsLeft = walk.maxSpots - walk.joinedSpots - 1;
    const fillPct   = Math.round(((walk.joinedSpots + 1) / walk.maxSpots) * 100);

    btn.textContent = '✓ Joined!';
    btn.classList.add('joined');

    const meta = document.getElementById(`spots-meta-${id}`);
    if (meta) meta.innerHTML = `<span class="walk-meta-icon">👥</span> ${spotsLeft > 0 ? spotsLeft + ' spot' + (spotsLeft !== 1 ? 's' : '') + ' left' : 'Full'}`;

    const fill = document.getElementById(`spots-fill-${id}`);
    if (fill) fill.style.width = fillPct + '%';

    const count = document.getElementById(`spots-count-${id}`);
    if (count) count.textContent = `${walk.joinedSpots + 1} / ${walk.maxSpots} people`;

    showToast(`🎉 You joined ${walk.name}'s walk!`, `${walk.from} → ${walk.to} · ${walk.time}`);
  } catch {
    showToast('⚠️ Network error', 'Could not connect to the server.', true);
    btn.disabled = false;
    btn.textContent = 'Join Walk →';
  }
}

// ---- SUBMIT WALK ----
async function submitWalk(e) {
  e.preventDefault();

  const name     = document.getElementById('f-name').value.trim();
  const email    = document.getElementById('f-email').value.trim();
  const year     = document.getElementById('f-year').value;
  const from     = document.getElementById('f-from').value.trim();
  const to       = document.getElementById('f-to').value.trim();
  const isoTime  = document.getElementById('f-time').value;
  const maxSpots = document.getElementById('f-size').value;
  const type     = document.getElementById('f-type').value;
  const notes    = document.getElementById('f-notes').value.trim();

  if (!email.toLowerCase().endsWith('@udel.edu')) {
    showToast('⚠️ UD Email Required', 'Please use your @udel.edu email address.', true);
    return;
  }

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Posting...';

  try {
    const res  = await fetch('/api/walks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, year, from, to, isoTime, maxSpots, type, notes })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast('⚠️ ' + (data.error || 'Could not post walk.'), '', true);
      return;
    }

    document.getElementById('walk-form').reset();
    closeModal();

    currentFilter = 'all';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-filter="all"]').classList.add('active');
    await loadWalks('all');

    showToast('✅ Walk Posted!', `Your walk from ${from} → ${to} is now live.`);
    setTimeout(() => document.getElementById('walks-section').scrollIntoView({ behavior: 'smooth' }), 300);
  } catch {
    showToast('⚠️ Network error', 'Could not connect to the server.', true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Post Walk 🚶';
  }
}

// ---- INIT ----
loadWalks();
