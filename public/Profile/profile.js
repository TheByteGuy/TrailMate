/* profile.js — Profile page: view, edit bio, follow/unfollow, search, network */
import { supabase } from '../supabase.js';

// ---- STATE ----
let currentSession = null;
let viewingUserId = null;   // the profile being viewed
let isOwnProfile = false;
let currentNetworkTab = 'following';

// Avatar color classes keyed by charCode % 6
const AVATAR_CLASSES = ['avatar-blue', 'avatar-teal', 'avatar-green', 'avatar-purple', 'avatar-orange', 'avatar-gold'];

function avatarClass(username) {
  if (!username) return 'avatar-blue';
  return AVATAR_CLASSES[username.charCodeAt(0) % AVATAR_CLASSES.length];
}

function initials(username) {
  if (!username) return '?';
  return username.slice(0, 2).toUpperCase();
}

// ---- INIT ----
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  currentSession = session;

  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id');

  if (idParam) {
    // Viewing someone else's profile
    viewingUserId = idParam;
    isOwnProfile = session && session.user.id === idParam;
  } else {
    // Own profile — must be logged in
    if (!session) {
      window.location.href = '/auth.html';
      return;
    }
    viewingUserId = session.user.id;
    isOwnProfile = true;
  }

  await loadProfile(viewingUserId);
  await loadFollowCounts(viewingUserId);
  renderActions();
  await showNetworkTab('following');
}
init();

// ---- LOAD PROFILE ----
async function loadProfile(userId) {
  // For own profile: render immediately from session metadata so the page
  // never shows blank/unknown even if the DB is blocked by RLS.
  if (isOwnProfile && currentSession) {
    const meta = currentSession.user.user_metadata || {};
    const username = meta.username
      || currentSession.user.email?.split('@')[0]
      || 'user';
    renderProfileData({ username, bio: meta.bio || '' });

    // Also try to pull from DB to get saved bio, and upsert row if missing
    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', userId).single();

    if (profile) {
      renderProfileData(profile);
    } else {
      await supabase.from('profiles').upsert(
        { id: currentSession.user.id, username, email: currentSession.user.email },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    }
    return;
  }

  // Viewing someone else's profile
  const { data: profile, error } = await supabase
    .from('profiles').select('*').eq('id', userId).single();

  if (error || !profile) {
    document.getElementById('hero-username').textContent = 'User not found';
    document.getElementById('profile-username').textContent = 'User not found';
    return;
  }

  renderProfileData(profile);
}

function renderProfileData(profile) {
  document.getElementById('hero-username').textContent = '@' + profile.username;
  document.getElementById('hero-subtitle').textContent = profile.bio || 'TrailMate member';

  const avatarEl = document.getElementById('profile-avatar');
  avatarEl.className = 'profile-avatar-lg avatar ' + avatarClass(profile.username);
  avatarEl.textContent = initials(profile.username);

  document.getElementById('profile-username').textContent = '@' + profile.username;
  document.getElementById('profile-bio').textContent = profile.bio || '';
  document.getElementById('bio-textarea').value = profile.bio || '';

  document.getElementById('stat-steps').textContent = (profile.total_steps ?? 0).toLocaleString();
  document.getElementById('stat-miles').textContent = parseFloat(profile.total_miles ?? 0).toFixed(1);
}

// ---- LOAD FOLLOW COUNTS ----
async function loadFollowCounts(userId) {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId)
  ]);

  document.getElementById('stat-followers').textContent = followers ?? 0;
  document.getElementById('stat-following').textContent = following ?? 0;
}

// ---- CHECK IF FOLLOWING ----
async function checkIfFollowing(targetId) {
  if (!currentSession) return false;
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', currentSession.user.id)
    .eq('following_id', targetId)
    .maybeSingle();
  return !!data;
}

// ---- RENDER ACTIONS ----
async function renderActions() {
  const actionsEl = document.getElementById('profile-actions');

  if (isOwnProfile) {
    actionsEl.innerHTML = `
      <button class="btn-edit-bio" onclick="startEditBio()">Edit Bio</button>
      <button class="btn-logout" onclick="handleLogout()">Log Out</button>
    `;
  } else if (currentSession) {
    const following = await checkIfFollowing(viewingUserId);
    actionsEl.innerHTML = following
      ? `<button class="follow-btn unfollow" id="follow-action-btn" onclick="handleUnfollow('${viewingUserId}')">Following ✓</button>`
      : `<button class="follow-btn follow" id="follow-action-btn" onclick="handleFollow('${viewingUserId}')">+ Follow</button>`;
  }
}

// ---- FOLLOW ----
async function handleFollow(targetId) {
  if (!currentSession) { window.location.href = '/auth.html'; return; }

  const btn = document.getElementById('follow-action-btn');
  btn.disabled = true;

  const { error } = await supabase.from('follows').insert({
    follower_id: currentSession.user.id,
    following_id: targetId
  });

  if (error) {
    btn.disabled = false;
    showToastSafe('Error', error.message, true);
    return;
  }

  btn.outerHTML = `<button class="follow-btn unfollow" id="follow-action-btn" onclick="handleUnfollow('${targetId}')">Following ✓</button>`;
  await loadFollowCounts(targetId);
}

// ---- UNFOLLOW ----
async function handleUnfollow(targetId) {
  if (!currentSession) return;

  const btn = document.getElementById('follow-action-btn');
  btn.disabled = true;

  const { error } = await supabase.from('follows')
    .delete()
    .eq('follower_id', currentSession.user.id)
    .eq('following_id', targetId);

  if (error) {
    btn.disabled = false;
    showToastSafe('Error', error.message, true);
    return;
  }

  btn.outerHTML = `<button class="follow-btn follow" id="follow-action-btn" onclick="handleFollow('${targetId}')">+ Follow</button>`;
  await loadFollowCounts(targetId);
}

// ---- SEARCH USERS ----
async function searchUsers() {
  const query = document.getElementById('search-input').value.trim();
  const resultsEl = document.getElementById('search-results');

  if (!query) {
    resultsEl.innerHTML = '<div class="no-results">Enter a username to search.</div>';
    return;
  }

  resultsEl.innerHTML = '<div class="no-results">Searching…</div>';

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, username, bio')
    .ilike('username', `%${query}%`)
    .limit(10);

  if (error || !users || users.length === 0) {
    resultsEl.innerHTML = '<div class="no-results">No users found.</div>';
    return;
  }

  resultsEl.innerHTML = users.map(u => buildUserItem(u)).join('');
}

// ---- LOAD FOLLOWING ----
async function loadFollowing(userId) {
  const { data, error } = await supabase
    .from('follows')
    .select('profiles!follows_following_id_fkey(id, username, bio)')
    .eq('follower_id', userId);

  if (error) return [];
  return data.map(r => r.profiles).filter(Boolean);
}

// ---- LOAD FOLLOWERS ----
async function loadFollowers(userId) {
  const { data, error } = await supabase
    .from('follows')
    .select('profiles!follows_follower_id_fkey(id, username, bio)')
    .eq('following_id', userId);

  if (error) return [];
  return data.map(r => r.profiles).filter(Boolean);
}

// ---- NETWORK TABS ----
async function showNetworkTab(tab) {
  currentNetworkTab = tab;
  const followingTab = document.getElementById('tab-following');
  const followersTab = document.getElementById('tab-followers');
  const networkList = document.getElementById('network-list');

  followingTab.classList.toggle('active', tab === 'following');
  followersTab.classList.toggle('active', tab === 'followers');

  networkList.innerHTML = '<div class="no-results">Loading…</div>';

  const users = tab === 'following'
    ? await loadFollowing(viewingUserId)
    : await loadFollowers(viewingUserId);

  if (!users.length) {
    const label = tab === 'following' ? 'not following anyone yet' : 'no followers yet';
    networkList.innerHTML = `<div class="no-results">This user is ${label}.</div>`;
    return;
  }

  networkList.innerHTML = users.map(u => buildUserItem(u)).join('');
}

// ---- BUILD USER ITEM HTML ----
function buildUserItem(u) {
  const bioText = u.bio ? u.bio.slice(0, 60) + (u.bio.length > 60 ? '…' : '') : 'No bio yet';
  return `
    <div class="user-result-item">
      <div class="avatar ${avatarClass(u.username)}" style="width:40px;height:40px;font-size:15px;flex-shrink:0;">${initials(u.username)}</div>
      <div class="user-result-info">
        <div class="user-result-name">@${u.username}</div>
        <div class="user-result-bio">${bioText}</div>
      </div>
      <a href="/profile.html?id=${u.id}" class="user-result-link">View</a>
    </div>`;
}

// ---- BIO EDITING ----
function startEditBio() {
  document.getElementById('bio-edit-area').classList.add('visible');
  document.getElementById('profile-bio').style.display = 'none';
}

function cancelEditBio() {
  document.getElementById('bio-edit-area').classList.remove('visible');
  document.getElementById('profile-bio').style.display = '';
}

async function saveBio() {
  const text = document.getElementById('bio-textarea').value.trim();

  const { error } = await supabase
    .from('profiles')
    .update({ bio: text })
    .eq('id', viewingUserId);

  if (error) {
    showToastSafe('Error', error.message, true);
    return;
  }

  document.getElementById('profile-bio').textContent = text;
  document.getElementById('hero-subtitle').textContent = text || 'TrailMate member';
  cancelEditBio();
  showToastSafe('Saved', 'Bio updated!');
}

// ---- LOGOUT ----
async function handleLogout() {
  await supabase.auth.signOut();
  window.location.href = '/';
}

// ---- SAFE TOAST ----
function showToastSafe(title, message, isWarning) {
  if (typeof window.showToast === 'function') {
    window.showToast(title, message, isWarning);
  } else {
    if (isWarning) alert('⚠️ ' + title + (message ? ': ' + message : ''));
  }
}

// ---- EXPOSE TO HTML ----
window.searchUsers = searchUsers;
window.showNetworkTab = showNetworkTab;
window.startEditBio = startEditBio;
window.cancelEditBio = cancelEditBio;
window.saveBio = saveBio;
window.handleLogout = handleLogout;
window.handleFollow = handleFollow;
window.handleUnfollow = handleUnfollow;
