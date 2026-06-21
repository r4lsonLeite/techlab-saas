export const API_BASE_URL = 'https://techlab-6vnh.onrender.com'; 
const API_URL = 'https://techlab-6vnh.onrender.com';

// ==============================
// CORREÇÃO: FUNÇÃO EXCLUSIVA PARA LOGIN
// ==============================
// Esta função não exige token e formata os dados no padrão OAuth2 do FastAPI.
export const loginFetch = async (endpoint, email, senha) => {
  const params = new URLSearchParams();
  params.append('username', email); // FastAPI exige o nome 'username'
  params.append('password', senha);

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded', // Padrão obrigatório de login do FastAPI
    },
    body: params
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Erro de comunicação com o servidor.");
  }

  return res.json();
};

// ==============================
// FUNÇÃO PARA AS DEMAIS ROTAS (MANTIDA A PROTEÇÃO)
// ==============================
export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('techlab_token');

  if (!token) {
    // Retirado o window.location.href automático para evitar loops na tela de erro
    throw new Error("Sessão expirada. Faça login novamente.");
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

  if (res.status === 204) return null;

  return res.json();
};

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

