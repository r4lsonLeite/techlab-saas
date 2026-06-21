import { useState } from 'react';
import { loginFetch } from '../services/api'; // Ajuste o caminho '../services/api' se a pasta for diferente

export default function Login({ onLoginSucesso }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try { 
      // Geralmente no FastAPI o padrão é '/token' ou '/auth/login'
      const dados = await loginFetch('/token', email, senha);
      
      // Salva o token fornecido pelo FastAPI
      localStorage.setItem('techlab_token', dados.access_token);
      
      onLoginSucesso();

    } catch (error) {
      console.error("Erro ao conectar:", error);
      // Pega a mensagem de erro que vem do backend (ex: Senha incorreta) ou erro de rede
      setErro(error.message || 'Erro de conexão. Verifique se as credenciais estão corretas.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        
        {/* LOGO E BOAS-VINDAS */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4 shadow-lg shadow-emerald-500/20">
            <span className="text-3xl">🔧</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">TechLab</h1>
          <p className="text-slate-400">Acesse o painel de gestão da oficina</p>
        </div>

        {/* CARD DO FORMULÁRIO */}
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-2xl p-8 relative overflow-hidden">
          {/* Efeito visual de brilho no topo do card */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-emerald-400"></div>

          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* MENSAGEM DE ERRO */}
            {erro && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 animate-pulse">
                <span>⚠️</span> {erro}
              </div>
            )}

            {/* CAMPO E-MAIL */}
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">E-mail</label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-500">✉️</span>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none transition-colors"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {/* CAMPO SENHA */}
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Senha</label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-500">🔑</span>
                <input 
                  type="password" 
                  required 
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center text-slate-400 cursor-pointer hover:text-white transition-colors">
                <input type="checkbox" className="mr-2 rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-emerald-500" />
                Lembrar de mim
              </label>
              <a href="#" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">Esqueceu a senha?</a>
            </div>

            {/* BOTÃO DE ENTRAR */}
            <button 
              type="submit" 
              disabled={carregando}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2"
            >
              {carregando ? 'Autenticando...' : 'Entrar no Sistema'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-8">
          &copy; 2026 TechLab. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}