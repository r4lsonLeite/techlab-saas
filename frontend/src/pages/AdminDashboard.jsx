import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  // 🔴 ESTADO PARA OS DADOS REAIS DO BACKEND
  const [metricas, setMetricas] = useState({
    faturamento_total: 0,
    total_vendas_balcao: 0,
    total_servicos_os: 0,
    os_pendentes: 0,
    alertas_estoque: 0
  });

  // 🔴 BUSCA AS MÉTRICAS AO ABRIR A TELA
  useEffect(() => {
    const carregarMetricas = async () => {
      const token = localStorage.getItem('techlab_token');
      try {
        const res = await fetch('http://localhost:8000/dashboard/metricas', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setMetricas(await res.json());
        }
      } catch (error) {
        console.error("Erro ao carregar métricas:", error);
      }
    };
    carregarMetricas();
  }, []);

  // DADOS FALSOS (Mock) PARA OS GRÁFICOS (Vamos conectar ao backend no futuro)
  const dadosFinanceiros = [
    { name: 'Jan', Receita: 45000, Lucro: 18000 },
    { name: 'Fev', Receita: 52000, Lucro: 21000 },
    { name: 'Mar', Receita: 48000, Lucro: 19500 },
    { name: 'Abr', Receita: 61000, Lucro: 25000 },
    { name: 'Mai', Receita: 55000, Lucro: 22000 },
    { name: 'Jun', Receita: 67000, Lucro: 28000 },
  ];

  const dadosCategorias = [
    { name: 'Telas', value: 45 },
    { name: 'Baterias', value: 28 },
    { name: 'Conectores', value: 12 },
    { name: 'Limpeza/Desox.', value: 15 },
  ];
  
  const CORES = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0f172a] text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABEÇALHO */}
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Administrativo</h1>
          <p className="text-slate-400 mt-1">Visão estratégica do negócio em tempo real</p>
        </div>

        {/* 1º ANDAR: CARDS CONECTADOS AO BACKEND */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Receita Total */}
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">💲</div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-blue-400 bg-blue-500/10 p-2 rounded-lg text-xl">📈</span>
              <span className="text-emerald-400 text-sm font-bold flex items-center gap-1">Em Tempo Real</span>
            </div>
            <p className="text-slate-400 text-sm font-medium">Faturamento Total</p>
            <h2 className="text-3xl font-bold text-white mt-1">
              R$ {Number(metricas.faturamento_total).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </h2>
          </div>

          {/* Receita de Serviços (Substituindo Lucro Líquido provisoriamente) */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-2xl shadow-lg shadow-emerald-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl text-white">💰</div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-white bg-white/20 p-2 rounded-lg text-xl">💎</span>
            </div>
            <p className="text-emerald-100 text-sm font-medium">Receita de Serviços (OS)</p>
            <h2 className="text-3xl font-bold text-white mt-1">
              R$ {Number(metricas.total_servicos_os).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </h2>
            <p className="text-emerald-200 text-xs mt-2">Ordens finalizadas</p>
          </div>

          {/* Ordens Pendentes */}
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">📋</div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-yellow-400 bg-yellow-500/10 p-2 rounded-lg text-xl">⏳</span>
            </div>
            <p className="text-slate-400 text-sm font-medium">Ordens Pendentes</p>
            <h2 className="text-3xl font-bold text-white mt-1">{metricas.os_pendentes}</h2>
            <p className="text-yellow-500/80 text-xs mt-2 font-bold">Aparelhos na loja</p>
          </div>

          {/* Estoque Crítico */}
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

        {/* 2º ANDAR: GRÁFICOS (Mantidos iguais ao seu código original) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
            <h3 className="text-slate-300 font-bold mb-6">Receita e Lucro (Últimos 6 meses)</h3>
            <div className="h-72 w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosFinanceiros} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                  <Tooltip 
                    cursor={{fill: '#334155', opacity: 0.4}}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="Receita" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="Lucro" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col">
            <h3 className="text-slate-300 font-bold mb-2">Distribuição por Categoria</h3>
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