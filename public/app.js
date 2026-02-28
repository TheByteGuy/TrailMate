/* app.js — shared utilities for all TrailMate pages */

// ---- NAV SCROLL ----
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });
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
