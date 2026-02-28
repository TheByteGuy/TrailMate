/* walks.js — walks listing, filtering, modal, and join logic for walks.html */

// ---- CONFIG ----
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const supabase = createClient(
  'https://zsujhugkllbnqidswkgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzdWpodWdrbGxibnFpZHN3a2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDEzMDksImV4cCI6MjA4Nzg3NzMwOX0.uhVV5pfHjADE19ZrSUdvVKGi3ZgmRi9c0VRClCC8NsM'
);

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
  const spotsLeft = walk.maxSpots - walk.joinedSpots - 1;
  const fillPct = Math.round(((walk.joinedSpots + 1) / walk.maxSpots) * 100);
  const isFull = spotsLeft <= 0;
  const isJoined = joinedWalks.has(walk.id);
  const tagsHTML = walk.tags?.map(t => `<span class="tag">${t}</span>`).join('') || '';
  const notesHTML = walk.notes ? `<p class="walk-notes">"${walk.notes}"</p>` : '';

  let btnClass = 'btn-join';
  let btnText = 'Join Walk →';
  if (isJoined) { btnClass += ' joined'; btnText = '✓ Joined!'; }
  else if (isFull) { btnClass += ' full'; btnText = 'Walk Full'; }

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
        <button class="${btnClass}" id="join-btn-${walk.id}" onclick="joinWalk(${walk.id})" ${(isFull || isJoined) ? 'disabled' : ''}>${btnText}</button>
        ${isJoined ? `<button class="btn-view-map" onclick="openWalkMap(${walk.id})">View Map 🗺️</button>` : ''}
      </div>
    </div>`;
}

// ---- JOIN WALK ----
async function joinWalk(id) {
  if (joinedWalks.has(id)) return;

  const btn = document.getElementById(`join-btn-${id}`);
  if (!btn || btn.disabled) return;

  const email = document.getElementById('f-email')?.value || prompt('Enter your UD email');
  if (!email?.toLowerCase().endsWith('@udel.edu')) {
    alert('UD email required');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Joining...';

  try {
    // Increment joinedSpots atomically using Supabase `increment`
    const { data: walk, error } = await supabase
      .from('walks')
      .update({ joinedSpots: supabase.rpc('increment', { column: 'joinedSpots', value: 1 }) })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    joinedWalks.add(id);
    renderWalks([walk]);
    alert(`🎉 You joined ${walk.name}'s walk!`);
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
  const isoTime = document.getElementById('f-time').value;
  const maxSpots = parseInt(document.getElementById('f-size').value, 10);
  const type = document.getElementById('f-type').value;
  const notes = document.getElementById('f-notes').value.trim();

  if (!email.toLowerCase().endsWith('@udel.edu')) {
    alert('UD email required');
    return;
  }

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Posting...';

  try {
    const { data, error } = await supabase.from('walks').insert([{
      name, email, year, from, to, isoTime, maxSpots, type, notes, joinedSpots: 0
    }]);

    if (error) throw error;

    document.getElementById('walk-form').reset();
    closeModal();
    await loadWalks(currentFilter);
    alert('✅ Walk Posted!');
  } catch (err) {
    alert('Error posting walk: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Post Walk 🚶';
  }
}

// ---- MAPBOX ----
async function openWalkMap(walkId) {
  try {
    const { data: walk, error } = await supabase.from('walks').select('*').eq('id', walkId).single();
    if (error) throw error;

    document.getElementById('map-modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';

    if (walkMap) walkMap.remove();

    walkMap = new mapboxgl.Map({
      container: 'walk-map-container',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [walk.fromLng, walk.fromLat],
      zoom: 15
    });

    walkMap.addControl(new mapboxgl.NavigationControl());

    new mapboxgl.Marker({ color: 'blue' })
      .setLngLat([walk.fromLng, walk.fromLat])
      .setPopup(new mapboxgl.Popup().setText(`Start: ${walk.from}`))
      .addTo(walkMap);

    new mapboxgl.Marker({ color: 'red' })
      .setLngLat([walk.toLng, walk.toLat])
      .setPopup(new mapboxgl.Popup().setText(`Destination: ${walk.to}`))
      .addTo(walkMap);

    drawWalkRoute(walk.fromLng, walk.fromLat, walk.toLng, walk.toLat);
  } catch (err) {
    alert('Could not load map: ' + err.message);
  }
}


function closeWalkMap() {
  document.getElementById('map-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  if (walkMap) { walkMap.remove(); walkMap = null; }
}

// ---- INIT ----
loadWalks();