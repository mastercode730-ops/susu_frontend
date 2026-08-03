export const showToast = (msg, type = 'success') => {
  if (typeof document === 'undefined') return;
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
  setTimeout(() => toast.remove(), 3000);
};
