// // // shared/api.js - Centralized API configuration
// // const BASE_URL = "http://156.67.110.77:3000";

// // const API = {
// //     // Base fetch with auth and IP configuration
// //     async fetch(url, options = {}) {
// //         // Agar url /api se shuru ho raha hai toh BASE_URL lagao
// //         const finalUrl = url.startsWith('/api') ? `${BASE_URL}${url}` : url;

// //         const res = await fetch(finalUrl, {
// //             ...options,
// //             credentials: 'include',
// //             headers: {
// //                 'Content-Type': 'application/json',
// //                 ...options.headers
// //             }
// //         });

// //         const data = await res.json();

// //         if (res.status === 401) {
// //             window.location.href = '/login.html';
// //             return;
// //         }

// //         return data;
// //     },

// //     get: (url) => API.fetch(url),

// //     post: (url, body) => API.fetch(url, {
// //         method: 'POST',
// //         body: JSON.stringify(body)
// //     }),

// //     put: (url, body) => API.fetch(url, {
// //         method: 'PUT',
// //         body: JSON.stringify(body)
// //     }),

// //     delete: (url) => API.fetch(url, {
// //         method: 'DELETE'
// //     })
// // };

// // // Current user helper
// // let currentUser = null;
// // async function getCurrentUser() {
// //     if (!currentUser) {
// //         const res = await API.get('/api/auth/me');
// //         if (res && res.success) {
// //             currentUser = res.user;
// //         } else {
// //             window.location.href = '/login.html';
// //         }
// //     }
// //     return currentUser;
// // }

// // // Logout function
// // async function logout() {
// //     await API.post('/api/auth/logout', {});
// //     window.location.href = '/login.html';
// // }

// // // Utility functions
// // function formatNum(n) {
// //     return parseFloat(n || 0).toFixed(2);
// // }

// // function showToast(msg, type = 'success') {
// //     const existing = document.querySelector('.toast');
// //     if (existing) existing.remove();

// //     const toast = document.createElement('div');
// //     toast.className = 'toast';
// //     toast.style.cssText = `
// //         position: fixed; top: 20px; right: 20px; z-index: 9999;
// //         background: ${type === 'success' ? '#00c853' : '#ff5252'};
// //         color: #fff;
// //         padding: 12px 24px; border-radius: 8px;
// //         font-family: Arial, sans-serif; font-size: 0.9rem; font-weight: 500;
// //         box-shadow: 0 4px 20px rgba(0,0,0,0.3);
// //         z-index: 10001;
// //     `;
// //     toast.textContent = msg;
// //     document.body.appendChild(toast);
// //     setTimeout(() => toast.remove(), 3000);
// // }

// // function getISTDate() {
// //     const now = new Date();
// //     return new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
// // }

// // function formatDate(d) {
// //     const date = d || getISTDate();
// //     return date.toLocaleDateString('en-GB', {
// //         day: '2-digit',
// //         month: 'short',
// //         year: 'numeric'
// //     });
// // }

// // Shared API utility - sab pages pe use hoga
// const API = {
//   // Base fetch with auth
//   async fetch(url, options = {}) {
//     const res = await fetch(url, {
//       ...options,
//       credentials: 'include',
//       headers: {
//         'Content-Type': 'application/json',
//         ...options.headers
//       }
//     });
    
//     const data = await res.json();
    
//     if (res.status === 401) {
//       window.location.href = '/login.html';
//       return;
//     }
    
//     return data;
//   },

//   get: (url) => API.fetch(url),
  
//   post: (url, body) => API.fetch(url, { method: 'POST', body: JSON.stringify(body) }),
  
//   put: (url, body) => API.fetch(url, { method: 'PUT', body: JSON.stringify(body) }),
  
//   delete: (url) => API.fetch(url, { method: 'DELETE' })
// };

// // Current user
// let currentUser = null;

// async function getCurrentUser() {
//   if (!currentUser) {
//     const res = await API.get('/api/auth/me');
//     if (res && res.success) {
//       currentUser = res.user;
//     } else {
//       window.location.href = '/login.html';
//     }
//   }
//   return currentUser;
// }

// // Logout
// async function logout() {
//   await API.post('/api/auth/logout', {});
//   window.location.href = '/login.html';
// }

// // Format number
// function formatNum(n) {
//   return parseFloat(n || 0).toFixed(2);
// }

// // Toast notification
// function showToast(msg, type = 'success') {
//   const existing = document.querySelector('.toast');
//   if (existing) existing.remove();
  
//   const toast = document.createElement('div');
//   toast.className = 'toast';
//   toast.style.cssText = `
//     position: fixed; top: 20px; right: 20px; z-index: 9999;
//     background: ${type === 'success' ? '#00c853' : '#ff5252'};
//     color: ${type === 'success' ? '#0a0f0a' : '#fff'};
//     padding: 12px 24px; border-radius: 8px;
//     font-family: 'Noto Sans', sans-serif; font-size: 0.9rem; font-weight: 500;
//     box-shadow: 0 4px 20px rgba(0,0,0,0.3);
//     animation: slideIn 0.3s ease;
//   `;
//   toast.textContent = msg;
//   document.body.appendChild(toast);
//   setTimeout(() => toast.remove(), 3000);
// }

// // IST date helper
// function getISTDate() {
//   const now = new Date();
//   const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
//   return ist;
// }

// function formatDate(d) {
//   const date = d || getISTDate();
//   return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
// }

// // Navigation helper
// function goTo(page) {
//   window.location.href = `/app/${page}`;
// }

// Shared API utility - sab pages pe use hoga
const API = {
  // Base fetch with auth
  async fetch(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const data = await res.json();
    
    if (res.status === 401) {
      window.location.href = '/login.html';
      return;
    }
    
    return data;
  },

  get: (url) => API.fetch(url),
  
  post: (url, body) => API.fetch(url, { method: 'POST', body: JSON.stringify(body) }),
  
  put: (url, body) => API.fetch(url, { method: 'PUT', body: JSON.stringify(body) }),
  
  delete: (url) => API.fetch(url, { method: 'DELETE' })
};

// Current user
let currentUser = null;

async function getCurrentUser() {
  if (!currentUser) {
    const res = await API.get('/api/auth/me');
    if (res && res.success) {
      currentUser = res.user;
    } else {
      window.location.href = '/login.html';
    }
  }
  return currentUser;
}

// Logout
async function logout() {
  await API.post('/api/auth/logout', {});
  window.location.href = '/login.html';
}

// Format number
function formatNum(n) {
  return parseFloat(n || 0).toFixed(2);
}

// Toast notification
function showToast(msg, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 9999;
    background: ${type === 'success' ? '#00c853' : '#ff5252'};
    color: ${type === 'success' ? '#0a0f0a' : '#fff'};
    padding: 12px 24px; border-radius: 8px;
    font-family: 'Noto Sans', sans-serif; font-size: 0.9rem; font-weight: 500;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// IST date helper
function getISTDate() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist;
}

function formatDate(d) {
  const date = d || getISTDate();
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Navigation helper
function goTo(page) {
  window.location.href = `/app/${page}`;
}

// ─── Global ESC Navigation — Sab pages ke liye ────────────────────────────
// Usage: setupEscBack('/pages/home.html')
// Ya: setupEscBack() — history.back() default
function setupEscBack(fallbackUrl) {
  document.addEventListener('keyup', function(e) {
    if (e.key !== 'Escape' && e.keyCode !== 27) return;
    // Modal open hai to close karo, back mat jao
    const openModal = document.querySelector('.modal-bg.show, .modal.show, [class*="modal"][style*="display: flex"]');
    if (openModal) {
      openModal.classList.remove('show');
      openModal.style.display = '';
      return;
    }
    // Input focused hai to ignore (jab tak explicitly chahiye)
    // Navigate back
    if (fallbackUrl) {
      window.location.href = fallbackUrl;
    } else {
      if (history.length > 1) history.back();
      else window.location.href = '/pages/home.html';
    }
  });
}