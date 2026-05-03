import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiFetch } from '../services/api'; // Importando o nosso motor seguro!

export default function AdminDashboard() {
  const [metricas, setMetricas] = useState({
    faturamento_total: 0,
    total_vendas_balcao: 0,
    total_servicos_os: 0,
    os_pendentes: 0,
    alertas_estoque: 0
  });

  // 🔴 NOVOS ESTADOS PARA OS GRÁFICOS
  const [dadosFinanceiros, setDadosFinanceiros] = useState([]);
  const [dadosCategorias, setDadosCategorias] = useState([]);

  useEffect(() => {
    carregarDashboard();
  }, []);

  const carregarDashboard = async () => {
    try {
      // Carrega os 4 cartões do topo
      const dadosMetricas = await apiFetch('/dashboard/metricas');
      setMetricas(dadosMetricas);

      // Carrega os Gráficos de Barras e Pizza
      const dadosGraficos = await apiFetch('/dashboard/graficos');
      setDadosFinanceiros(dadosGraficos.financeiro);
      setDadosCategorias(dadosGraficos.categorias);

    } catch (error) {
      console.error("Erro ao carregar o painel:", error);
    }
  };

  const CORES = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0f172a] text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABEÇALHO */}
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Administrativo</h1>
          <p className="text-slate-400 mt-1">Visão estratégica do negócio em tempo real</p>
        </div>

        {/* 1º ANDAR: CARDS (Mantidos iguais) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">💲</div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-blue-400 bg-blue-500/10 p-2 rounded-lg text-xl">📈</span>
              <span className="text-emerald-400 text-sm font-bold flex items-center gap-1">Em Tempo Real</span>
            </div>
            <p className="text-slate-400 text-sm font-medium">Faturamento Total</p>
            <h2 className="text-3xl font-bold text-white mt-1">
              R$ {Number(metricas.faturamento_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </h2>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-2xl shadow-lg shadow-emerald-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl text-white">💰</div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-white bg-white/20 p-2 rounded-lg text-xl">💎</span>
            </div>
            <p className="text-emerald-100 text-sm font-medium">Receita de Serviços (OS)</p>
            <h2 className="text-3xl font-bold text-white mt-1">
              R$ {Number(metricas.total_servicos_os || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </h2>
            <p className="text-emerald-200 text-xs mt-2">Ordens finalizadas</p>
          </div>

          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">📋</div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-yellow-400 bg-yellow-500/10 p-2 rounded-lg text-xl">⏳</span>
            </div>
            <p className="text-slate-400 text-sm font-medium">Ordens Pendentes</p>
            <h2 className="text-3xl font-bold text-white mt-1">{metricas.os_pendentes}</h2>
            <p className="text-yellow-500/80 text-xs mt-2 font-bold">Aparelhos na loja</p>
          </div>

          <div className={`p-6 rounded-2xl border shadow-lg relative overflow-hidden ${metricas.alertas_estoque > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-[#1e293b] border-slate-700'}`}>
            <div className={`absolute top-0 right-0 p-4 opacity-10 text-6xl ${metricas.alertas_estoque > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {metricas.alertas_estoque > 0 ? '⚠️' : '✅'}
            </div>
            <div className="flex justify-between items-start mb-4">
              <span className={`${metricas.alertas_estoque > 0 ? 'text-red-400 bg-red-500/20' : 'text-emerald-400 bg-emerald-500/20'} p-2 rounded-lg text-xl`}>📦</span>
              {metricas.alertas_estoque > 0 && (
                <span className="text-red-500 text-xs font-bold uppercase tracking-wider bg-red-500/20 px-2 py-1 rounded">Atenção</span>
              )}
            </div>
            <p className={`${metricas.alertas_estoque > 0 ? 'text-red-400/80' : 'text-slate-400'} text-sm font-medium`}>Estoque Crítico</p>
            <h2 className={`text-3xl font-bold mt-1 ${metricas.alertas_estoque > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {metricas.alertas_estoque} itens
            </h2>
            <p className={`${metricas.alertas_estoque > 0 ? 'text-red-500/80' : 'text-emerald-500/80'} text-xs mt-2`}>
              {metricas.alertas_estoque > 0 ? 'Necessita reposição' : 'Estoque saudável'}
            </p>
          </div>
        </div>

        {/* 2º ANDAR: GRÁFICOS (AGORA COM DADOS REAIS) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Gráfico de Barras */}
          <div className="lg:col-span-2 bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
            <h3 className="text-slate-300 font-bold mb-6">Receita e Lucro Estimado</h3>
            <div className="h-72 w-full h-80">
              {dadosFinanceiros.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500">Sem vendas registadas neste período.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosFinanceiros} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                    <Tooltip 
                      cursor={{fill: '#334155', opacity: 0.4}}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value) => `R$ ${value.toFixed(2)}`}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="Receita" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                    <Bar dataKey="Lucro" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Gráfico de Pizza */}
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col">
            <h3 className="text-slate-300 font-bold mb-2">Vendas por Categoria</h3>
            <div className="flex-1 w-full flex justify-center items-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={dadosCategorias}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {dadosCategorias.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value) => `R$ ${value.toFixed(2)}`}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}