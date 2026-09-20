import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const FILE_ROOT = API_URL.replace(/\/api$/, '');

const api = axios.create({ baseURL: API_URL, withCredentials: true, timeout: 15000 });

let refreshing = null;

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retried && !original.url?.includes('/auth/refresh') && !original.url?.includes('/auth/login')) {
      original._retried = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh');
        await refreshing;
        refreshing = null;
        return api(original);
      } catch (e) {
        refreshing = null;
        throw e;
      }
    }
    throw error;
  }
);

export const errMsg = (e, fallback = 'Something went wrong') => {
  const d = e?.response?.data;
  if (d?.details?.length) return d.details.map((x) => `${x.field}: ${x.message}`).join(', ');
  return d?.message || fallback;
};

export const coverUrl = (p) => {
  if (!p) return null;
  if (/^https?:\/\//.test(p)) return p;
  return `${FILE_ROOT}${p.startsWith('/') ? '' : '/'}${p}`;
};

export default api;
