import { useState } from 'react';
import api from '../services/api';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Usamos o formato que o FastAPI (OAuth2) exige
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', senha);

      const res = await api.post('/token', formData);
      
      // Guarda o "crachá" no navegador para não deslogar ao dar F5
      localStorage.setItem('techlab_token', res.data.access_token);
      
      onLoginSuccess(); // Avisa o App.jsx que entramos!
    } catch (err) {
      setErro('E-mail ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] p-8 rounded-2xl shadow-2xl w-full max-w-md border border-emerald-500/20">
        <h1 className="text-3xl font-bold text-emerald-400 mb-6 text-center">TechLab</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" placeholder="E-mail" 
            className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-700"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Senha" 
            className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-700"
            onChange={(e) => setSenha(e.target.value)}
          />
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg transition-all">
            Entrar no Sistema
          </button>
        </form>
      </div>
    </div>
  );
}