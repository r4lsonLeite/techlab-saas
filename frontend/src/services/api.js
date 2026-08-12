// Em desenvolvimento local (npm run dev), aponta por padrão para o backend
// rodando em localhost. Em produção, defina VITE_API_URL no ambiente de
// build (Vercel etc.) para apontar para o backend real.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://techlab-6vnh.onrender.com';
const API_URL = API_BASE_URL;

// Extrai a mensagem de erro do corpo da resposta da API. O FastAPI devolve
// JSON no formato {"detail": "..."}; se o corpo não for JSON (ex: erro de
// proxy/gateway), cai para o texto puro.
const extrairMensagemErro = async (res) => {
  const texto = await res.text();
  try {
    const json = JSON.parse(texto);
    if (typeof json.detail === 'string') return json.detail;
    if (Array.isArray(json.detail)) return json.detail.map(d => d.msg).join(', ');
    return texto;
  } catch {
    return texto || `Erro ${res.status} de comunicação com o servidor.`;
  }
};

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
    throw new Error(await extrairMensagemErro(res));
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

  if (res.status === 401) {
    localStorage.removeItem('techlab_token');
    window.dispatchEvent(new Event('techlab:sessao-expirada'));
  }

  if (!res.ok) {
    throw new Error(await extrairMensagemErro(res));
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

  if (res.status === 401) {
    localStorage.removeItem('techlab_token');
    window.dispatchEvent(new Event('techlab:sessao-expirada'));
  }

  if (!res.ok) throw new Error(await extrairMensagemErro(res));
  return res.json();
};

