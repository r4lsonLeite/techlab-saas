import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; // Criaremos este a seguir

function App() {
  const [logado, setLogado] = useState(false);

  // Ao abrir o app, verifica se já existe um token salvo
  useEffect(() => {
    const token = localStorage.getItem('techlab_token');
    if (token) setLogado(true);
  }, []);

  if (!logado) {
    return <Login onLoginSuccess={() => setLogado(true)} />;
  }

  return <Dashboard onLogout={() => {
    localStorage.removeItem('techlab_token');
    setLogado(false);
  }} />;
}

export default App;