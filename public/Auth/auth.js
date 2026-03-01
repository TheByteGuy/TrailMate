/* auth.js — login / signup logic for auth.html */
import { supabase } from '../supabase.js';

// ---- INIT ----
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.href = '/profile.html';
  }
}
init();

// ---- TAB SWITCHING ----
function switchTab(tab) {
  const loginForm = document.getElementById('form-login');
  const signupForm = document.getElementById('form-signup');
  const loginTab = document.getElementById('tab-login');
  const signupTab = document.getElementById('tab-signup');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
  } else {
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
  }
}

// ---- SIGN UP ----
async function handleSignUp(e) {
  e.preventDefault();

  const username = document.getElementById('signup-username').value.trim();
  const email = username.toLowerCase().replace(/[^a-z0-9._-]/g, '') + '@trailmate.app';
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;
  const btn = document.getElementById('signup-btn');

  if (!username) {
    showToastSafe('Error', 'Username is required', true);
    return;
  }
  if (password !== confirm) {
    showToastSafe('Error', 'Passwords do not match', true);
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating account…';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } }
  });

  if (error) {
    btn.disabled = false;
    btn.textContent = 'Create Account →';
    const msg = error.message.toLowerCase().includes('unique')
      ? 'Username already taken. Try another.'
      : error.message;
    showToastSafe('Sign up failed', msg, true);
    return;
  }

  // Manually create profile row — don't rely solely on a DB trigger
  const user = data?.user;
  if (user) {
    await supabase.from('profiles').upsert(
      { id: user.id, username, email: user.email },
      { onConflict: 'id', ignoreDuplicates: true }
    );
  }

  window.location.href = '/profile.html';
}

// ---- LOG IN ----
async function handleLogIn(e) {
  e.preventDefault();

  const username = document.getElementById('login-username').value.trim();
  const email = username.toLowerCase().replace(/[^a-z0-9._-]/g, '') + '@trailmate.app';
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');

  btn.disabled = true;
  btn.textContent = 'Signing in…';

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    btn.disabled = false;
    btn.textContent = 'Log In →';
    showToastSafe('Login failed', error.message, true);
    return;
  }

  window.location.href = '/profile.html';
}

// ---- SAFE TOAST (may not be available immediately since app.js is parallel module) ----
function showToastSafe(title, message, isWarning) {
  if (typeof window.showToast === 'function') {
    window.showToast(title, message, isWarning);
  } else {
    alert((isWarning ? '⚠️ ' : '') + title + (message ? ': ' + message : ''));
  }
}

// ---- EXPOSE TO HTML ----
window.switchTab = switchTab;
window.handleSignUp = handleSignUp;
window.handleLogIn = handleLogIn;
