import { useState, useEffect } from 'react';
import Balcao from './Balcao';
import Vendas from './Vendas';
import Bancada from './Bancada'; 
import AdminDashboard from './AdminDashboard'; 
import Estoque from './Estoque';
import Usuarios from './Usuarios';
import Financeiro from './Financeiro';
import Configuracoes from './Configuracoes';
import ConsultarOS from './ConsultarOS';

export default function Dashboard({ onLogout }) {

  // SIMULAÇÃO DE CARGO: Altere para 'balcao' ou 'tecnico' para ver a mágica do menu mudando.
  // (No futuro, isso virá automático do token JWT do Python)
  
  const [cargo, setCargo] = useState('balcao'); 
  const [telaAtiva, setTelaAtiva] = useState('entrada-os');
  // Definição das permissões do sistema
const menus = [ 
    { id: 'vendas', titulo: '🛒 Vendas / PDV', papeis: ['adm', 'balcao'] },
    { id: 'entrada-os', titulo: '📝 Entrada de Aparelhos', papeis: ['adm', 'balcao'] },
    { id: 'bancada', titulo: '🔧 Bancada Técnica', papeis: ['adm', 'tecnico'] },
    { id: 'consultar-os', titulo: '🔍 Consultar OS', papeis: ['adm', 'balcao', 'tecnico'] },
    { id: 'estoque', titulo: '📦 Estoque de Peças', papeis: ['adm'] },
    { id: 'usuarios', titulo: '👥 Controle de Equipe', papeis: ['adm'] }, 
    { id: 'financeiro', titulo: '💰 Financeiro', papeis: ['adm'] },
    { id: 'admin-home', titulo: '📊 Visão Geral (ADM)', papeis: ['adm'] },
    { id: 'configuracoes', titulo: '⚙️ Ajustes da Loja', papeis: ['adm'] }, 
  ];

  // Filtra os botões que o usuário atual pode ver
  const menusPermitidos = menus.filter(menu => menu.papeis.includes(cargo));

  return (
    <div className="flex h-screen bg-[#0f172a] text-white font-sans overflow-hidden">
      
      {/* MENU LATERAL */}
      <aside className="w-64 bg-[#1e293b] border-r border-slate-700 flex flex-col shadow-2xl z-10">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-emerald-400 tracking-wider">TechLab</h2>
          <p className="text-slate-400 text-sm mt-1">SaaS Management</p>
        </div>
        
        {/* INFO DO USUÁRIO LOGADO */}
        <div className="px-6 pb-4 border-b border-slate-700/50 mb-4">
          <p className="text-sm text-slate-300">Atendente: <span className="font-bold text-white capitalize">{cargo === 'adm' ? 'Chefe' : 'Ana Paula'}</span></p>
          <p className="text-xs text-emerald-500 font-mono mt-1">Caixa 01 • Nível: {cargo.toUpperCase()}</p>
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
        {/* BOTÃO SAIR NO FINAL DO MENU */}
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
        {telaAtiva === 'configuracoes' && <Configuracoes />}
        {telaAtiva === 'usuarios' && <Usuarios />}
        {telaAtiva === 'admin-home' && <AdminDashboard />} {/* */}
        {telaAtiva === 'entrada-os' && <Balcao />}
        {telaAtiva === 'vendas' && <Vendas />}
        {telaAtiva === 'consultar-os' && <ConsultarOS cargo={cargo} />}
        {telaAtiva === 'bancada' && <Bancada />}
        {telaAtiva === 'estoque' && <div className="p-8 text-slate-400">Tabela de Peças entrará aqui.</div>}
        {telaAtiva === 'financeiro' && <div className="p-8 text-slate-400">Gráficos do ADM entrarão aqui.</div>}
      </main>

    </div>
  );
}