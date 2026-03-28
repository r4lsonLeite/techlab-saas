import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [logado, setLogado] = useState(false);

  // Verifica se o usuário já tem o "crachá" guardado no navegador
  useEffect(() => {
    const token = localStorage.getItem('techlab_token');
    if (token) {
      setLogado(true);
    }
  }, []);

  // Se NÃO estiver logado, mostra a tela de Login
  if (!logado) {
    return <Login onLoginSuccess={() => setLogado(true)} />;
  }

  // Se ESTIVER logado, mostra o Dashboard
  return <Dashboard onLogout={() => {
    localStorage.removeItem('techlab_token');
    setLogado(false);
  }} />;
}

export default App;