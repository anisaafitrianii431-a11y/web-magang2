import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const dariLogin = error.config?.url?.endsWith('/login');
    if (error.response?.status === 401 && !dariLogin) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Ambil pesan error paling informatif dari respons Laravel
export const pesanError = (err, cadangan) => {
  const data = err.response?.data;
  if (data?.errors) return Object.values(data.errors).flat()[0];
  return data?.message || cadangan;
};

export default api;