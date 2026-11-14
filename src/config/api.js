// Centralized API Configuration for React Frontend
export const API_BASE_URL = 'http://127.0.0.1:8000/api';

export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};
