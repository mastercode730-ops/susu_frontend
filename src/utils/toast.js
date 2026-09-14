let styleInjected = false;

function ensureStyle() {
  if (styleInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes toast-in {
      from { opacity: 0; transform: translateY(-10px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .toast-notification {
      animation: toast-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      transition: opacity 0.22s ease, transform 0.22s ease;
    }
    .toast-notification.toast-leaving {
      opacity: 0;
      transform: translateY(-6px) scale(0.97);
    }
  `;
  document.head.appendChild(style);
  styleInjected = true;
}

export const showToast = (msg, type = 'success') => {
  if (typeof document === 'undefined') return;
  ensureStyle();

  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 99999;
    background: ${type === 'success' ? '#00c853' : '#ff5252'};
    color: ${type === 'success' ? '#0a0f0a' : '#fff'};
    padding: 12px 24px; border-radius: 8px;
    font-family: 'Noto Sans', sans-serif; font-size: 0.9rem; font-weight: 500;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    pointer-events: none;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-leaving');
    setTimeout(() => toast.remove(), 220);
  }, 3000);
};
