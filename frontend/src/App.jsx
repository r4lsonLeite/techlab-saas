import { useState, useEffect } from 'react';

import Dashboard from './pages/dashboard';
import Login from './pages/login';

const isTokenValido = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

function App() {
  const [estaLogado, setEstaLogado] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('techlab_token');
    setEstaLogado(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('techlab_token');

    if (token && isTokenValido(token)) {
      setEstaLogado(true);
    } else {
      localStorage.removeItem('techlab_token');
      setEstaLogado(false);
    }

    // Qualquer chamada à API que receber 401 (token expirado/inválido no
    // meio da sessão) dispara este evento para devolver o usuário ao login,
    // em vez de deixar a tela travada em erros de "Sessão expirada".
    window.addEventListener('techlab:sessao-expirada', handleLogout);
    return () => window.removeEventListener('techlab:sessao-expirada', handleLogout);
  }, []);

  if (!estaLogado) {
    
    return <Login onLoginSucesso={() => setEstaLogado(true)} />;
  }

  
  return <Dashboard onLogout={handleLogout} />;
}

export default App;