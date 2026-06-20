import { useState, useEffect } from 'react';
import dashboard from './pages/dashboard';
import login from './pages/login';

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
    return <login onLoginSucesso={() => setEstaLogado(true)} />;
  }

  return <dashboard onLogout={handleLogout} />;
}

export default App;

