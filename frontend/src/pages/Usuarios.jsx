import { useState } from 'react';

export default function Usuarios() {
  // Lista de usuários simulada baseada no seu Figma
  const [usuarios] = useState([
    { id: 1, iniciais: 'JS', nome: 'João Silva', cargo: 'Técnico Sênior', email: 'joao.silva@techlab.com', status: 'Ativo', ativas: 4, concluidas: 156, tempo: '2.4h', avaliacao: '4.9', corAvatar: 'bg-emerald-500' },
    { id: 2, iniciais: 'MS', nome: 'Maria Santos', cargo: 'Técnica', email: 'maria.santos@techlab.com', status: 'Ativo', ativas: 3, concluidas: 89, tempo: '2.8h', avaliacao: '4.8', corAvatar: 'bg-blue-500' },
    { id: 3, iniciais: 'PC', nome: 'Pedro Costa', cargo: 'Técnico Júnior', email: 'pedro.costa@techlab.com', status: 'Ativo', ativas: 2, concluidas: 42, tempo: '3.8h', avaliacao: '4.5', corAvatar: 'bg-indigo-500' },
    { id: 4, iniciais: 'AU', nome: 'Admin User', cargo: 'Administrador', email: 'admin@techlab.com', status: 'Ativo', ativas: 0, concluidas: 0, tempo: '-', avaliacao: '-', corAvatar: 'bg-purple-500' },
  ]);

  // Cálculos Automáticos para os KPIs do topo
  const totalUsuarios = usuarios.length;
  const tecnicosAtivos = usuarios.filter(u => u.cargo.includes('Técnic')).length;
  const ordensAtivasTotais = usuarios.reduce((acc, u) => acc + u.ativas, 0);

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0f172a] text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-white">Controle de Usuários</h1>
            <p className="text-slate-400 mt-1">Gerencie técnicos e administradores</p>
          </div>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2">
            <span>+</span> Adicionar Usuário
          </button>
        </div>

        {/* KPIs SUPERIORES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col justify-center">
            <p className="text-slate-400 text-sm font-medium flex items-center gap-2 mb-2">👥 Total de Usuários</p>
            <h2 className="text-3xl font-bold text-white">{totalUsuarios}</h2>
          </div>
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col justify-center">
            <p className="text-slate-400 text-sm font-medium flex items-center gap-2 mb-2">🔧 Técnicos Ativos</p>
            <h2 className="text-3xl font-bold text-white">{tecnicosAtivos}</h2>
          </div>
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col justify-center">
            <p className="text-slate-400 text-sm font-medium flex items-center gap-2 mb-2">⏳ Ordens Ativas</p>
            <h2 className="text-3xl font-bold text-white">{ordensAtivasTotais}</h2>
          </div>
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col justify-center">
            <p className="text-slate-400 text-sm font-medium flex items-center gap-2 mb-2">⭐ Avaliação Média</p>
            <h2 className="text-3xl font-bold text-emerald-400">4.8</h2>
          </div>
        </div>

        {/* GRADE DE CARTÕES DE USUÁRIOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {usuarios.map((user) => (
            <div key={user.id} className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-lg p-6 flex flex-col justify-between hover:border-emerald-500/30 transition-colors group">
              
              {/* Info do Usuário e Status */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg ${user.corAvatar}`}>
                    {user.iniciais}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{user.nome}</h3>
                    <p className="text-emerald-400 text-sm font-medium flex items-center gap-1">
                      {user.cargo.includes('Admin') ? '🛡️' : '👨‍🔧'} {user.cargo}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">{user.email}</p>
                  </div>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {user.status}
                </span>
              </div>

              {/* Estatísticas de Performance (Apenas para Técnicos) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-[#0f172a] p-4 rounded-xl border border-slate-800">
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Ordens Ativas</p>
                  <p className="text-blue-400 font-bold text-lg">{user.ativas}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Concluídas</p>
                  <p className="text-white font-bold text-lg">{user.concluidas}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Tempo Médio</p>
                  <p className="text-white font-bold text-lg">{user.tempo}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Avaliação</p>
                  <p className="text-yellow-400 font-bold text-lg">{user.avaliacao} <span className="text-slate-500 text-xs font-normal">/ 5.0</span></p>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3">
                <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg text-sm font-bold transition-colors">
                  Ver Perfil
                </button>
                <button className="flex-1 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-transparent py-2.5 rounded-lg text-sm font-bold transition-all">
                  Editar
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}