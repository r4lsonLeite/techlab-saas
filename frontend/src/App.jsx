import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

function App() {
  const [estaLogado, setEstaLogado] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('techlab_token');
    if (token) {
      setEstaLogado(true);
    }
  }, []);

  // FUNÇÃO DE LOGOUT
  const handleLogout = () => {
    localStorage.removeItem('techlab_token'); // Remove o token
    setEstaLogado(false); // Volta para a tela de login na hora
  };

  if (!estaLogado) {
    return <Login onLoginSucesso={() => setEstaLogado(true)} />;
  }

  // Passamos a função de logout para o Dashboard usar
  return <Dashboard onLogout={handleLogout} />;
}

export default App;