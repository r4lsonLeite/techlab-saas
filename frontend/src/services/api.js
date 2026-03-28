import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000', // A base do seu motor Python
});

// Essa parte aqui é o "Segurança": ela pega o Token do bolso (localStorage)
// e coloca no cabeçalho de cada requisição automaticamente.
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('techlab_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;