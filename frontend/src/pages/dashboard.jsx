import { useState, useEffect } from 'react';
import Balcao from './Balcao';
import Vendas from './Vendas';
import Bancada from './Bancada'; 
import Estoque from './Estoque';
import AdminDashboard from './AdminDashboard'; 
import Usuarios from './Usuarios';
import Financeiro from './Financeiro';
import Configuracoes from './Configuracoes';
import ConsultarOS from './ConsultarOS';

export default function Dashboard({ onLogout }) {
  
  const [cargo, setCargo] = useState(''); 
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [telaAtiva, setTelaAtiva] = useState('');
  
  const [osIdParaAbrir, setOsIdParaAbrir] = useState(null);
  const [osParaPDV, setOsParaPDV] = useState(null);

  useEffect(() => {
    
    const token = localStorage.getItem('techlab_token');
    
    if (token) {
      try {
        
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        setCargo(payload.cargo);
        setNomeUsuario(payload.nome); 

        
        if (payload.cargo === 'balcao') {
          setTelaAtiva('vendas');
        } else if (payload.cargo === 'tecnico') {
          setTelaAtiva('bancada');
        } else {
          setTelaAtiva('admin-home'); 
        }
        
      } catch (e) {
        console.error("Erro ao ler o token de acesso.", e);
      }
    }
  }, []);

  
  if (!cargo) return <div className="h-screen bg-[#0b1120] text-white flex items-center justify-center">Carregando painel...</div>;

const menus = [ 
    { id: 'vendas', titulo: '🛒 Vendas / PDV', papeis: ['admin', 'balcao'] },
    { id: 'entrada-os', titulo: '📝 Entrada de Aparelhos', papeis: ['admin', 'balcao'] },
    { id: 'bancada', titulo: '🔧 Bancada Técnica', papeis: ['admin', 'tecnico'] },
    { id: 'consultar-os', titulo: '🔍 Consultar OS', papeis: ['admin', 'balcao', 'tecnico'] },
    { id: 'estoque', titulo: '📦 Estoque de Peças', papeis: ['admin'] },
    { id: 'usuarios', titulo: '👥 Controle de Equipe', papeis: ['admin'] }, 
    { id: 'financeiro', titulo: '💰 Financeiro', papeis: ['admin'] },
    { id: 'admin-home', titulo: '📊 Visão Geral (ADM)', papeis: ['admin'] },
    { id: 'configuracoes', titulo: '⚙️ Ajustes da Loja', papeis: ['admin'] }, 
  ];

  const menusPermitidos = menus.filter(menu => menu.papeis.includes(cargo));

  const abrirOSNaConsulta = (id) => {
    setOsIdParaAbrir(id);
    setTelaAtiva('consultar-os');
  };

  const abrirPDVComOS = (os) => {
    setOsParaPDV(os);
    setTelaAtiva('vendas');
  };

  return (
    <div className="flex h-screen bg-[#0f172a] text-white font-sans overflow-hidden">
      
      {/* MENU LATERAL */}
      <aside className="w-64 bg-[#1e293b] border-r border-slate-700 flex flex-col shadow-2xl z-10">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-emerald-400 tracking-wider">TechLab</h2>
          <p className="text-slate-400 text-sm mt-1">SaaS Management</p>
        </div>
        
        {/* IDENTIFICAÇÃO DINÂMICA DO USUÁRIO */}
        <div className="px-6 pb-4 border-b border-slate-700/50 mb-4">
          <p className="text-sm text-slate-300">
            Atendente: <span className="font-bold text-white capitalize">{nomeUsuario}</span>
          </p>
          <p className="text-xs text-emerald-500 font-mono mt-1 uppercase">
            Caixa 01 • Nível: {cargo}
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {menusPermitidos.map((menu) => (
            <button 
              key={menu.id}
              onClick={() => setTelaAtiva(menu.id)} 
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                telaAtiva === menu.id 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'text-slate-300 hover:bg-slate-800 border border-transparent'
              }`}
            >
              {menu.titulo}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button 
            onClick={onLogout} 
            className="mt-auto w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-bold py-3 rounded-xl transition-all border border-red-500/20"
          >
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* ÁREA CENTRAL */}
      <main className="flex-1 overflow-y-auto bg-[#0f172a]">
        {telaAtiva === 'entrada-os' && <Balcao abrirOSNaConsulta={abrirOSNaConsulta} />}
        {telaAtiva === 'consultar-os' && <ConsultarOS cargo={cargo} osIdParaAbrir={osIdParaAbrir} setOsIdParaAbrir={setOsIdParaAbrir} abrirPDVComOS={abrirPDVComOS} />}
        {telaAtiva === 'vendas' && <Vendas osParaPDV={osParaPDV} setOsParaPDV={setOsParaPDV} />}
        {telaAtiva === 'configuracoes' && <Configuracoes />}
        {telaAtiva === 'usuarios' && <Usuarios />}
        {telaAtiva === 'admin-home' && <AdminDashboard />}
        {telaAtiva === 'bancada' && <Bancada />}
        {telaAtiva === 'estoque' && <Estoque />}
        {telaAtiva === 'financeiro' && <Financeiro />}
      </main>

    </div>
  );
}