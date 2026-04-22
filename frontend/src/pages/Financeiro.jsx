import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export default function Financeiro() {
  const [filtro, setFiltro] = useState('Este Ano');
  
  // 🔴 1. ESTADO PARA OS DADOS REAIS DO BACKEND
  const [metricas, setMetricas] = useState({
    faturamento_total: 0,
    total_vendas_balcao: 0,
    total_servicos_os: 0,
    os_pendentes: 0,
    alertas_estoque: 0
  });

  // 🔴 2. FUNÇÃO QUE BUSCA OS DADOS AO ABRIR A TELA
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

  // Dados Mockados baseados no Figma (Vamos substituir no futuro)
  const dadosMensais = [
    { mes: 'Jan', receita: 45000, despesas: 27000, lucro: 18000, margem: '40%', ordens: 84 },
    { mes: 'Fev', receita: 52000, despesas: 31000, lucro: 21000, margem: '40%', ordens: 92 },
    { mes: 'Mar', receita: 48000, despesas: 28500, lucro: 19500, margem: '40%', ordens: 88 },
    { mes: 'Abr', receita: 61000, despesas: 36000, lucro: 25000, margem: '40%', ordens: 105 },
    { mes: 'Mai', receita: 55000, despesas: 32500, lucro: 22500, margem: '40%', ordens: 96 },
    { mes: 'Jun', receita: 67000, despesas: 39000, lucro: 28000, margem: '41.8%', ordens: 112 },
  ];

  const dadosCategoria = [
    { name: 'Telas', receita: 135000, custo: 70000, margem: 48 },
    { name: 'Baterias', receita: 95000, custo: 53000, margem: 44 },
    { name: 'Limpeza', receita: 45000, custo: 28000, margem: 37 },
    { name: 'Conectores', receita: 32000, custo: 21000, margem: 34 },
    { name: 'Câmeras', receita: 21000, custo: 12000, margem: 42 },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0f172a] text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABEÇALHO E FILTROS */}
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Relatórios Financeiros</h1>
            <p className="text-slate-400 mt-1">Análise detalhada de receitas e despesas</p>
          </div>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2">
            <span>📥</span> Exportar Relatório
          </button>
        </div>

        {/* PÍLULAS DE FILTRO */}
        <div className="flex gap-2 mb-6">
          {['Este Mês', 'Últimos 3 Meses', 'Este Ano', 'Personalizado'].map(f => (
            <button 
              key={f} onClick={() => setFiltro(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filtro === f 
                ? 'bg-[#1e293b] text-white border border-slate-500 shadow-md' 
                : 'bg-transparent text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* 1º ANDAR: CARDS CONECTADOS AO BACKEND */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          <div className="bg-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
            <p className="text-blue-200 text-sm font-medium flex items-center gap-2 mb-2">💎 Faturamento Total</p>
            <h2 className="text-3xl font-bold">R$ {Number(metricas.faturamento_total).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
            <p className="text-blue-300 text-xs mt-2">Vendas + Serviços</p>
          </div>
          
          <div className="bg-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-500/20 text-white">
            <p className="text-emerald-200 text-sm font-medium flex items-center gap-2 mb-2">💵 Receita de Serviços</p>
            <h2 className="text-3xl font-bold">R$ {Number(metricas.total_servicos_os).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
            <p className="text-emerald-300 text-xs mt-2">Ordens Concluídas</p>
          </div>

          <div className="bg-purple-600 p-6 rounded-2xl shadow-lg shadow-purple-500/20 text-white">
            <p className="text-purple-200 text-sm font-medium flex items-center gap-2 mb-2">🛍️ Vendas de Balcão</p>
            <h2 className="text-3xl font-bold">R$ {Number(metricas.total_vendas_balcao).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
            <p className="text-purple-300 text-xs mt-2">Acessórios e Avulsos</p>
          </div>

          {/* Transformamos o card vermelho em um painel de alertas da oficina */}
          <div className="bg-red-600 p-6 rounded-2xl shadow-lg shadow-red-500/20 text-white">
            <p className="text-red-200 text-sm font-medium flex items-center gap-2 mb-2">⚠️ Atenção Necessária</p>
            <h2 className="text-3xl font-bold">{metricas.os_pendentes} <span className="text-lg font-normal">OS</span></h2>
            <p className="text-red-300 text-xs mt-2">{metricas.alertas_estoque} peças em falta no estoque</p>
          </div>

        </div>

        {/* 2º ANDAR: GRÁFICO DE ÁREA MENSAL (Mockado) */}
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-300 font-bold mb-6">Análise Financeira Mensal</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dadosMensais} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                <Area type="monotone" dataKey="receita" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorReceita)" name="Receita" />
                <Area type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorDespesa)" name="Despesas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3º ANDAR: GRÁFICO DE BARRAS E MARGEM (Mockado) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
            <h3 className="text-slate-300 font-bold mb-6">Receita por Categoria</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosCategoria} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000}k`} />
                  <RechartsTooltip cursor={{fill: '#334155', opacity: 0.4}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="receita" fill="#10b981" name="Receita" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="custo" fill="#ef4444" name="Custo" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
            <h3 className="text-slate-300 font-bold mb-6">Margem por Categoria</h3>
            <div className="space-y-5">
              {dadosCategoria.map((cat, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{cat.name}</span>
                    <span className="text-emerald-400 font-bold">{cat.margem}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${cat.margem}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4º ANDAR: TABELA DE DETALHAMENTO (Mockado) */}
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h3 className="text-slate-300 font-bold">Detalhamento Mensal</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0f172a] border-b border-slate-700">
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Mês</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Receita</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Despesas</th>
                  <th className="p-4 text-xs font-bold text-emerald-400 uppercase tracking-wider">Lucro Líquido</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Margem</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ordens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {dadosMensais.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 text-sm font-bold text-white">{row.mes}</td>
                    <td className="p-4 text-sm text-slate-300">R$ {row.receita.toLocaleString()}</td>
                    <td className="p-4 text-sm text-red-400">R$ {row.despesas.toLocaleString()}</td>
                    <td className="p-4 text-sm font-bold text-emerald-400">R$ {row.lucro.toLocaleString()}</td>
                    <td className="p-4 text-sm text-slate-300">{row.margem}</td>
                    <td className="p-4 text-sm text-slate-300">{row.ordens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}