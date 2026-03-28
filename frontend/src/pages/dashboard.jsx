import { useState } from 'react';
import Balcao from './Balcao'; // <-- ESSA É A LINHA QUE ESTÁ FALTANDO!

export default function Dashboard({ onLogout }) {
  // Esse estado controla qual tela está aparecendo no momento
  const [telaAtiva, setTelaAtiva] = useState('balcao');

  return (
    <div className="flex h-screen bg-[#0f172a] text-white font-sans">
      
      {/* MENU LATERAL (SIDEBAR) */}
      <aside className="w-64 bg-[#1e293b] border-r border-slate-700 flex flex-col shadow-2xl">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-emerald-400 tracking-wider">TechLab</h2>
          <p className="text-slate-400 text-sm mt-1">SaaS Management</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setTelaAtiva('balcao')} 
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${telaAtiva === 'balcao' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            🖥️ Recepção
          </button>
          
          <button 
            onClick={() => setTelaAtiva('tecnico')} 
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${telaAtiva === 'tecnico' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            🔧 Bancada Técnica
          </button>
          
          <button 
            onClick={() => setTelaAtiva('estoque')} 
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${telaAtiva === 'estoque' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            📦 Estoque de Peças
          </button>
          
          <button 
            onClick={() => setTelaAtiva('financeiro')} 
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${telaAtiva === 'financeiro' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            💰 Financeiro
          </button>
        </nav>

        {/* BOTÃO DE SAIR */}
        <div className="p-4 border-t border-slate-700">
          <button 
            onClick={onLogout} 
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg font-bold transition-colors border border-red-500/20"
          >
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL (Onde o conteúdo muda) */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white capitalize">
            {telaAtiva === 'balcao' ? 'Recepção e Nova OS' : telaAtiva}
          </h1>
          <p className="text-slate-400 mt-1">Gerencie as informações do seu negócio.</p>
        </header>

       {/* Aqui nós vamos "plugar" as suas telas reais depois */}
        <div className="flex items-center justify-center">
          {telaAtiva === 'balcao' && <Balcao />}
          {telaAtiva === 'tecnico' && <p className="text-slate-400 text-lg">A lista de aparelhos para conserto vai entrar aqui!</p>}
          {telaAtiva === 'estoque' && <p className="text-slate-400 text-lg">A tabela de produtos e telas vai entrar aqui!</p>}
          {telaAtiva === 'financeiro' && <p className="text-slate-400 text-lg">Os gráficos de lucro vão entrar aqui!</p>}
        </div>
      </main>

    </div>
  );
}