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

  useEffect(() => {
    const token = localStorage.getItem('techlab_token');

    if (token && isTokenValido(token)) {
      setEstaLogado(true);
    } else {
      localStorage.removeItem('techlab_token');
      setEstaLogado(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('techlab_token');
    setEstaLogado(false);
  };

  if (!estaLogado) {
    
    return <Login onLoginSucesso={() => setEstaLogado(true)} />;
  }

  
  return <Dashboard onLogout={handleLogout} />;
}

export default App;