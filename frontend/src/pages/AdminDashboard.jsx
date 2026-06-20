import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { apiFetch } from '../services/api'; 

export default function AdminDashboard() {
  const [carregando, setCarregando] = useState(true);

 
  const [metricas, setMetricas] = useState({
    faturamento_total: 0,
    lucro_estimado: 0,
    total_servicos_os: 0,
    os_pendentes: 0,
    os_entregues: 0,
    alertas_estoque: 0,
    ticket_medio: 0
  });

 
  const [dadosFinanceiros, setDadosFinanceiros] = useState([]);
  const [dadosCategorias, setDadosCategorias] = useState([]);

 
  const [ultimasOS, setUltimasOS] = useState([]);
  const [produtosCriticos, setProdutosCriticos] = useState([]);

  useEffect(() => {
    carregarDashboard();
  }, []);

  const carregarDashboard = async () => {
    setCarregando(true);
    try {
     
      
      const [dadosMetricas, dadosGraficos, listaOS, listaProdutos] = await Promise.all([
        apiFetch('/dashboard/metricas').catch(() => ({})),
        apiFetch('/dashboard/graficos').catch(() => ({ financeiro: [], categorias: [] })),
        apiFetch('/ordens-servico').catch(() => []),
        apiFetch('/produtos').catch(() => [])
      ]);

      setDadosFinanceiros(dadosGraficos.financeiro || []);
      setDadosCategorias(dadosGraficos.categorias || []);

      
      const osRecentes = [...listaOS].sort((a, b) => b.id - a.id).slice(0, 5);
      setUltimasOS(osRecentes);

      
      
      const criticos = listaProdutos.filter(p => p.estoque_atual <= p.estoque_minimo).slice(0, 5);
      setProdutosCriticos(criticos);

      
      const lucroCalculado = dadosGraficos.financeiro?.reduce((acc, curr) => acc + (curr.Lucro || 0), 0) || 0;
      const osEntregues = listaOS.filter(o => o.status === 'Entregue').length;
      
      setMetricas({
        faturamento_total: dadosMetricas.faturamento_total || 0,
        lucro_estimado: lucroCalculado,
        total_servicos_os: dadosMetricas.total_servicos_os || 0,
        os_pendentes: dadosMetricas.os_pendentes || listaOS.filter(o => o.status !== 'Entregue').length,
        os_entregues: osEntregues,
        alertas_estoque: dadosMetricas.alertas_estoque || criticos.length,
        ticket_medio: dadosGraficos.kpis_extras?.ticket_medio_geral || 0
      });

    } catch (error) {
      console.error("Erro ao carregar o painel:", error);
    } finally {
      setCarregando(false);
    }
  };

  const CORES = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

  if (carregando) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0f172a] text-blue-500 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold tracking-widest uppercase text-sm text-slate-400">Sincronizando Base de Dados...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0f172a] text-white custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-end mb-6 border-b border-slate-700/50 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <span>📊</span> Dashboard Administrativo
            </h1>
            <p className="text-slate-400 mt-1">Visão estratégica em tempo real</p>
          </div>
          <button onClick={carregarDashboard} className="bg-[#1e293b] hover:bg-slate-800 border border-slate-600 text-slate-300 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-lg">
            🔄 Atualizar Dados
          </button>
        </div>

        {/* ================= 1º ANDAR: 6 KPIS PRINCIPAIS ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Faturamento */}
          <div className="bg-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-500/10 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 p-4 opacity-10 text-8xl text-black">💲</div>
            <p className="text-blue-200 text-sm font-medium uppercase tracking-wider mb-1">Faturamento Bruto</p>
            <h2 className="text-4xl font-black text-white">R$ {Number(metricas.faturamento_total).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
            <p className="text-blue-300 text-xs mt-2 font-bold">Vendas + Serviços</p>
          </div>

          {/* Lucro Estimado */}
          <div className="bg-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-500/10 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 p-4 opacity-10 text-8xl text-black">📈</div>
            <p className="text-emerald-200 text-sm font-medium uppercase tracking-wider mb-1">Lucro Estimado (Mês)</p>
            <h2 className="text-4xl font-black text-white">R$ {Number(metricas.lucro_estimado).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
            <p className="text-emerald-200 text-xs mt-2 font-bold">Receita Bruta - Custos (CMV)</p>
          </div>

          {/* Ticket Médio */}
          <div className="bg-purple-600 p-6 rounded-2xl shadow-lg shadow-purple-500/10 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 p-4 opacity-10 text-8xl text-black">🎫</div>
            <p className="text-purple-200 text-sm font-medium uppercase tracking-wider mb-1">Ticket Médio</p>
            <h2 className="text-4xl font-black text-white">R$ {Number(metricas.ticket_medio).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
            <p className="text-purple-300 text-xs mt-2 font-bold">Gasto médio por cliente</p>
          </div>

          {/* OS Pendentes */}
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-amber-500/30 shadow-lg relative overflow-hidden group hover:border-amber-500 transition-colors">
            <div className="absolute top-4 right-4 text-3xl opacity-80 group-hover:scale-110 transition-transform">⏳</div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Aparelhos na Loja</p>
            <h2 className="text-4xl font-black text-amber-400">{metricas.os_pendentes}</h2>
            <p className="text-amber-500/80 text-xs mt-2 font-bold">OS aguardando peça/aprovação</p>
          </div>

          {/* OS Entregues */}
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-blue-500/30 shadow-lg relative overflow-hidden group hover:border-blue-500 transition-colors">
            <div className="absolute top-4 right-4 text-3xl opacity-80 group-hover:scale-110 transition-transform">🤝</div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Serviços Entregues</p>
            <h2 className="text-4xl font-black text-blue-400">{metricas.os_entregues}</h2>
            <p className="text-blue-500/80 text-xs mt-2 font-bold">Aparelhos devolvidos aos clientes</p>
          </div>

          {/* Alerta de Estoque */}
          <div className={`p-6 rounded-2xl border shadow-lg relative overflow-hidden group transition-colors ${metricas.alertas_estoque > 0 ? 'bg-red-500/10 border-red-500/50 hover:border-red-400' : 'bg-[#1e293b] border-emerald-500/30 hover:border-emerald-500'}`}>
            <div className={`absolute top-4 right-4 text-3xl group-hover:scale-110 transition-transform ${metricas.alertas_estoque > 0 ? 'animate-pulse' : ''}`}>
              {metricas.alertas_estoque > 0 ? '🚨' : '📦'}
            </div>
            <p className={`text-sm font-medium uppercase tracking-wider mb-1 ${metricas.alertas_estoque > 0 ? 'text-red-300' : 'text-slate-400'}`}>Estoque Crítico</p>
            <h2 className={`text-4xl font-black ${metricas.alertas_estoque > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {metricas.alertas_estoque}
            </h2>
            <p className={`text-xs mt-2 font-bold ${metricas.alertas_estoque > 0 ? 'text-red-400' : 'text-emerald-500/80'}`}>
              {metricas.alertas_estoque > 0 ? 'Itens precisam de reposição urgente!' : 'Estoque 100% Saudável'}
            </p>
          </div>
        </div>

        {/* ================= 2º ANDAR: GRÁFICOS ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Gráfico de Barras: Receita vs Lucro */}
          <div className="lg:col-span-2 bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
            <h3 className="text-slate-300 font-bold mb-6 flex items-center gap-2"><span>📊</span> Receita Bruta vs Lucro Líquido</h3>
            <div className="h-72 w-full">
              {dadosFinanceiros.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500">Aguardando dados de vendas.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosFinanceiros} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                    <Tooltip 
                      cursor={{fill: '#334155', opacity: 0.4}}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                      formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="Receita" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25} name="Receita Bruta (R$)" />
                    <Bar dataKey="Lucro" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} name="Lucro Líquido (R$)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Gráfico de Pizza: Categorias */}
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col">
            <h3 className="text-slate-300 font-bold mb-2 flex items-center gap-2"><span>🏷️</span> Vendas por Categoria</h3>
            <div className="flex-1 w-full flex justify-center items-center">
              {dadosCategorias.length === 0 ? (
                 <div className="text-slate-500 text-sm">Sem dados de categoria.</div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={dadosCategorias}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={80}
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
                      formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ================= 3º ANDAR: RADAR EM TEMPO REAL ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Tabela: Últimas Entradas na Bancada */}
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-96">
            <h3 className="text-slate-300 font-bold mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><span>📱</span> Recentes na Bancada</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded uppercase tracking-wider">Ao Vivo</span>
            </h3>
            <div className="overflow-y-auto custom-scrollbar pr-2 flex-1 space-y-3">
              {ultimasOS.length === 0 ? (
                <p className="text-slate-500 text-sm text-center mt-10">Nenhuma Ordem de Serviço recente.</p>
              ) : (
                ultimasOS.map((os) => (
                  <div key={os.id} className="bg-[#0f172a] p-3 rounded-xl border border-slate-700/50 flex justify-between items-center hover:border-slate-500 transition-colors">
                    <div className="flex gap-3 items-center">
                      <div className="bg-slate-800 text-slate-300 text-xs font-bold px-2 py-1 rounded">#{os.id}</div>
                      <div>
                        <p className="text-white font-bold text-sm">{os.marca} {os.modelo}</p>
                        <p className="text-slate-400 text-xs truncate w-40">{os.cliente_nome || 'Cliente Balcão'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                        os.status === 'Entregue' ? 'bg-emerald-500/20 text-emerald-400' :
                        os.status === 'Aguardando Cliente' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {os.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Lista: Alerta de Produtos Acabando */}
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-96">
            <h3 className="text-slate-300 font-bold mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><span>🛒</span> Produtos para Comprar</span>
              <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded uppercase tracking-wider">Atenção</span>
            </h3>
            <div className="overflow-y-auto custom-scrollbar pr-2 flex-1 space-y-3">
              {produtosCriticos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <span className="text-5xl mb-2">✅</span>
                  <p className="text-slate-400 text-sm font-bold">Estoque Abastecido</p>
                </div>
              ) : (
                produtosCriticos.map((prod) => (
                  <div key={prod.id} className="bg-[#0f172a] p-3 rounded-xl border border-red-500/20 flex justify-between items-center hover:border-red-500/50 transition-colors">
                    <div>
                      <p className="text-white font-bold text-sm">{prod.nome}</p>
                      <p className="text-slate-400 text-xs">{prod.categoria} | Forn: {prod.fornecedor || 'N/A'}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 font-bold">{prod.estoque_atual} un.</span>
                        <span className="text-slate-500 text-xs">/ min: {prod.estoque_minimo}</span>
                      </div>
                      <span className="text-[10px] text-red-500 mt-1 uppercase tracking-wider">Repor Urgente</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}