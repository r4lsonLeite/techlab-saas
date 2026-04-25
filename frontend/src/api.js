// src/services/api.js

const API_URL = 'http://localhost:8000';

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('techlab_token');

  // 🚨 1. VALIDAÇÃO DE TOKEN CENTRALIZADA
  if (!token) {
    alert("Sessão expirada ou não autorizada. Faça login novamente.");
    window.location.href = '/'; // Força a volta para a tela de login
    throw new Error("Sessão expirada.");
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Erro de comunicação com o servidor.");
  }

  // Previne erro ao tentar ler JSON de respostas vazias (ex: exclusão 204)
  if (res.status === 204) return null;

  return res.json();
};

// Utilitário separado para envios de arquivos (FormData), pois não usa 'Content-Type': 'application/json'
export const apiUpload = async (endpoint, formData) => {
  const token = localStorage.getItem('techlab_token');
  if (!token) throw new Error("Sessão expirada.");

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
};