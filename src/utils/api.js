export const API = {
  async fetch(url, options = {}) {
    try {
      const res = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (res.status === 401) {
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return { success: false, message: 'Unauthorized' };
      }

      const data = await res.json();
      return data;
    } catch (e) {
      console.error('API Fetch error:', e);
      return { success: false, message: e.message || 'Network error' };
    }
  },

  get: (url) => API.fetch(url),
  post: (url, body) => API.fetch(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => API.fetch(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (url) => API.fetch(url, { method: 'DELETE' })
};
