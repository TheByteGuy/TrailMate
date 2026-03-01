/* app.js — shared utilities for all TrailMate pages */
import { supabase } from './supabase.js';

// ---- NAV SCROLL ----
const navbar = document.getElementById('navbar');

if (navbar) {
  const handleScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  };

  window.addEventListener('scroll', handleScroll);

  // 🔥 Run once immediately so reloads don't break state
  handleScroll();
}

// ---- INTERSECTION OBSERVER (fade-in) ----
const observer = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0.1 }
);
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// ---- TOAST ----
function showToast(title, message, isWarning = false) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast' + (isWarning ? ' toast-warn' : '');
  toast.innerHTML = `
    <div>
      <div style="font-weight:700;margin-bottom:2px;">${title}</div>
      ${message ? `<div style="font-size:12px;opacity:0.7;">${message}</div>` : ''}
    </div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.4s ease both';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}
window.showToast = showToast;

// ---- AUTH NAV ----
async function updateNavForAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  const link = document.getElementById('nav-profile-link');
  const mobileLink = document.getElementById('mobile-nav-profile-link');
  const heroGreeting = document.getElementById('hero-mobile-greeting');
  const heroSubtitleDesktop = document.getElementById('hero-subtitle-desktop');
  if (session) {
    const { data: profile } = await supabase
      .from('profiles').select('username').eq('id', session.user.id).single();
    const username = profile?.username
      || session.user.user_metadata?.username
      || session.user.email?.split('@')[0];
    const text = username ? '@' + username : 'Profile';
    const greetingText = username
      ? `Hi ${username}! Ready for your walk?`
      : 'Hi there! Ready for your walk?';
    const href = '/Profile/profile.html';
    if (link) { link.textContent = text; link.href = href; }
    if (mobileLink) { mobileLink.textContent = text; mobileLink.href = href; }
    if (heroGreeting) { heroGreeting.textContent = greetingText; }
    if (heroSubtitleDesktop) { heroSubtitleDesktop.textContent = greetingText; }
  } else {
    if (link) { link.textContent = 'Log In'; link.href = '/Auth/auth.html'; }
    if (mobileLink) { mobileLink.textContent = 'Log In'; mobileLink.href = '/Auth/auth.html'; }
    if (heroGreeting) { heroGreeting.textContent = 'Hi there! Ready for your walk?'; }
    if (heroSubtitleDesktop) { heroSubtitleDesktop.textContent = 'Hi there! Ready for your walk?'; }
  }
}
updateNavForAuth();

// ---- MOBILE MENU ----
window.closeMobileMenu = function() {
  const menu = document.getElementById('mobile-menu');
  const btn = document.getElementById('nav-hamburger');
  if (menu) menu.classList.remove('open');
  if (btn) { btn.classList.remove('open'); btn.setAttribute('aria-label', 'Open menu'); }
  document.body.style.overflow = '';
};

window.toggleMobileMenu = function() {
  const menu = document.getElementById('mobile-menu');
  const btn = document.getElementById('nav-hamburger');
  if (!menu || !btn) return;
  const isOpen = menu.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  btn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  document.body.style.overflow = isOpen ? 'hidden' : '';
};

// Close on link click
document.querySelectorAll('.mobile-menu-links a').forEach(a => {
  a.addEventListener('click', () => window.closeMobileMenu());
});

// Close on outside click
document.addEventListener('click', e => {
  const menu = document.getElementById('mobile-menu');
  const btn = document.getElementById('nav-hamburger');
  if (menu && menu.classList.contains('open') &&
      !menu.contains(e.target) && btn && !btn.contains(e.target)) {
    window.closeMobileMenu();
  }
});
