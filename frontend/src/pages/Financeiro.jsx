import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { apiFetch } from '../services/api'; 

export default function Financeiro() {
  const [filtro, setFiltro] = useState('Este Mês');
  
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [metricas, setMetricas] = useState({
    faturamento_total: 0,
    total_vendas_balcao: 0,
    total_servicos_os: 0,
    os_pendentes: 0,
    alertas_estoque: 0
  });

  const [graficos, setGraficos] = useState({
    financeiro: [],
    categorias: [],
    ranking_produtos: [],
    kpis_extras: { ticket_medio_geral: 0, tempo_medio_reparo_horas: 0 }
  });

  // --- ESTADOS DA EQUIPE E FECHAMENTO DE MÊS ---
  const [equipe, setEquipe] = useState([]);
  const [descontos, setDescontos] = useState({}); // Guarda os vales/quebras de cada funcionário

  useEffect(() => {
    const carregarDados = async () => {
      setCarregando(true);
      setErro(null);
      
      try {
        const [dadosMetricas, dadosGraficos, dadosEquipe] = await Promise.all([
          apiFetch('/dashboard/metricas'),
          apiFetch('/dashboard/graficos'),
          apiFetch('/usuarios')
        ]);

        setMetricas(dadosMetricas);
        setGraficos(dadosGraficos);
        setEquipe(dadosEquipe);
      } catch (err) {
        console.error("Erro ao carregar relatórios:", err);
        setErro(err.message || "Falha ao carregar os dados financeiros.");
      } finally {
        setCarregando(false);
      }
    };
    
    carregarDados();
  }, [filtro]); // Recarrega se o filtro mudar (se o backend já suportar)

  // --- FUNÇÕES DE INTERAÇÃO ---
  const handleExportar = () => {
    window.print(); // Abre a tela de impressão do navegador (pode salvar como PDF)
  };

  const handleDescontoChange = (usuarioId, valor) => {
    setDescontos(prev => ({
      ...prev,
      [usuarioId]: Number(valor)
    }));
  };

  if (carregando) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0f172a] text-emerald-500 space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold tracking-widest uppercase text-sm">Calculando DRE e Comissões...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0f172a] text-red-500">
        <div className="bg-red-500/10 p-8 rounded-2xl border border-red-500/30 text-center max-w-md">
          <span className="text-5xl block mb-4">🚨</span>
          <h2 className="text-xl font-bold mb-2">Erro no Relatório</h2>
          <p className="text-sm text-red-400 mb-6">{erro}</p>
          <button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold">Tentar Novamente</button>
        </div>
      </div>
    );
  }

  const dadosFinanceiros = graficos.financeiro || [];
  const dadosCategoria = graficos.categorias || [];

  // Cálculos Totais da Folha de Pagamento
  let totalComissoesBrutas = 0;
  let totalDescontosAplicados = 0;
  let totalLiquidoAPagar = 0;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0f172a] text-white custom-scrollbar print-area">
      
      {/* Estilo embutido para limpar a tela na hora de imprimir / gerar PDF */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .bg-\\[\\#1e293b\\] { background-color: #f1f5f9 !important; border-color: #cbd5e1 !important; color: black !important; }
          .text-white { color: black !important; }
          .text-slate-400 { color: #475569 !important; }
          input { border: 1px solid #000 !important; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABEÇALHO E FILTROS */}
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Relatórios Financeiros</h1>
            <p className="text-slate-400 mt-1">Análise detalhada de DRE, receitas e comissões da equipe</p>
          </div>
          <button onClick={handleExportar} className="no-print bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2">
            <span>🖨️</span> Exportar / Imprimir
          </button>
        </div>

        {/* PÍLULAS DE FILTRO */}
        <div className="flex gap-2 mb-6 no-print">
          {['Este Mês', 'Últimos 3 Meses', 'Últimos 6 Meses', 'Este Ano'].map(f => (
            <button 
              key={f} onClick={() => setFiltro(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filtro === f 
                ? 'bg-blue-600 text-white shadow-md border-blue-500' 
                : 'bg-transparent text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* 1º ANDAR: CARDS PRINCIPAIS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
            <p className="text-blue-200 text-sm font-medium flex items-center gap-2 mb-2">💎 Faturamento Total</p>
            <h2 className="text-3xl font-bold">R$ {Number(metricas.faturamento_total).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
            <p className="text-blue-300 text-xs mt-2">Balcão + Serviços</p>
          </div>
          <div className="bg-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-500/20 text-white">
            <p className="text-emerald-200 text-sm font-medium flex items-center gap-2 mb-2">💵 Receita de Serviços</p>
            <h2 className="text-3xl font-bold">R$ {Number(metricas.total_servicos_os).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
            <p className="text-emerald-300 text-xs mt-2">Vindo das OS Entregues</p>
          </div>
          <div className="bg-purple-600 p-6 rounded-2xl shadow-lg shadow-purple-500/20 text-white">
            <p className="text-purple-200 text-sm font-medium flex items-center gap-2 mb-2">🎫 Ticket Médio Geral</p>
            <h2 className="text-3xl font-bold">R$ {Number(graficos.kpis_extras?.ticket_medio_geral || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
            <p className="text-purple-300 text-xs mt-2">Gasto médio por cliente</p>
          </div>
          <div className="bg-[#1e293b] border border-slate-700 p-6 rounded-2xl shadow-lg text-white">
            <p className="text-slate-400 text-sm font-medium flex items-center gap-2 mb-2">⏱️ Tempo Médio de Reparo</p>
            <h2 className="text-3xl font-bold text-amber-400">{graficos.kpis_extras?.tempo_medio_reparo_horas || 0} <span className="text-lg font-normal text-slate-500">horas</span></h2>
            <p className="text-slate-500 text-xs mt-2">Da bancada à entrega</p>
          </div>
        </div>

        {/* 2º ANDAR: GESTÃO DE COMISSÕES DA EQUIPE (MOVIDO PARA CIMA PELA IMPORTÂNCIA) */}
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex justify-between items-center">
            <div>
              <h3 className="text-slate-300 font-bold text-lg flex items-center gap-2"><span>👥</span> Folha de Pagamento & Fechamento de Comissões</h3>
              <p className="text-slate-500 text-xs mt-1">Insira vales, adiantamentos ou peças quebradas na coluna de Descontos.</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Período de Apuração</p>
              <p className="text-emerald-400 font-bold">{filtro}</p>
            </div>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0f172a] border-b border-slate-700">
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Funcionário</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Desempenho</th>
                  <th className="p-4 text-xs font-bold text-blue-400 uppercase tracking-wider">Comissão Bruta</th>
                  <th className="p-4 text-xs font-bold text-red-400 uppercase tracking-wider">Vales / Quebras (R$)</th>
                  <th className="p-4 text-xs font-bold text-emerald-400 uppercase tracking-wider text-right">Total a Pagar Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {equipe.length === 0 && (
                  <tr><td colSpan="5" className="p-6 text-center text-slate-500">Nenhum funcionário encontrado.</td></tr>
                )}
                {equipe.map((membro) => {
                  const isTecnico = membro.cargo === 'tecnico';
                  const isBalcao = membro.cargo === 'balcao';
                  
                  let produtividade = 'Acesso Administrativo';
                  let comissaoBruta = 0;

                  // Lógica de visualização
                  if (isTecnico) {
                    produtividade = `${membro.reparos_concluidos || 0} reparos concluídos`;
                    comissaoBruta = membro.comissao_reparos || 0;
                  } else if (isBalcao) {
                    produtividade = `${membro.vendas_realizadas || 0} vendas finalizadas`;
                    comissaoBruta = membro.comissao_vendas || 0;
                  }

                  // Cálculos da linha
                  const descontoAplicado = descontos[membro.id] || 0;
                  const comissaoLiquida = Math.max(0, comissaoBruta - descontoAplicado);

                  // Acumulando para o Rodapé
                  totalComissoesBrutas += Number(comissaoBruta);
                  totalDescontosAplicados += Number(descontoAplicado);
                  totalLiquidoAPagar += Number(comissaoLiquida);

                  return (
                    <tr key={membro.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white border border-slate-600">
                            {membro.nome ? membro.nome.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="text-white font-bold">{membro.nome}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{membro.cargo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-300">{produtividade}</td>
                      <td className="p-4 text-sm font-bold text-blue-400">
                        R$ {Number(comissaoBruta).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </td>
                      <td className="p-4">
                        <div className="relative w-32 no-print">
                          <span className="absolute left-3 top-2.5 text-slate-500 text-sm">R$</span>
                          <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            placeholder="0,00"
                            value={descontos[membro.id] || ''}
                            onChange={(e) => handleDescontoChange(membro.id, e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0f172a] text-red-400 font-bold border border-slate-600 focus:border-red-500 outline-none"
                          />
                        </div>
                        {/* Texto apenas para impressão */}
                        <span className="hidden print:block text-red-500 font-bold">
                           - R$ {Number(descontoAplicado).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-4 text-lg font-bold text-emerald-400 text-right">
                        R$ {Number(comissaoLiquida).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* RODAPÉ COM OS TOTAIS GERAIS */}
              <tfoot>
                <tr className="bg-[#0f172a] border-t-2 border-slate-600">
                  <td colSpan="2" className="p-4 text-right text-slate-400 font-bold uppercase text-xs tracking-wider">Totais da Folha:</td>
                  <td className="p-4 text-sm font-black text-blue-400">R$ {totalComissoesBrutas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                  <td className="p-4 text-sm font-black text-red-400">- R$ {totalDescontosAplicados.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                  <td className="p-4 text-xl font-black text-emerald-400 text-right">R$ {totalLiquidoAPagar.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 3º ANDAR: GRÁFICO DE ÁREA MENSAL (DRE REAL) */}
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg mt-8">
          <h3 className="text-slate-300 font-bold mb-6">DRE Mensal (Receitas vs Custos)</h3>
          <div className="h-80 w-full">
            {dadosFinanceiros.length === 0 ? (
               <div className="h-full flex items-center justify-center text-slate-500">Sem dados financeiros para o período.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosFinanceiros} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                    formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  <Area type="monotone" dataKey="Receita" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorReceita)" name="Receita Total" />
                  <Area type="monotone" dataKey="Custo" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCusto)" name="Custos (CMV)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 4º ANDAR: CATEGORIAS E RANKING */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 page-break-before">
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
            <h3 className="text-slate-300 font-bold mb-6">Faturamento por Categoria</h3>
            <div className="h-64 w-full">
              {dadosCategoria.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500">Sem vendas no período.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosCategoria} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                    <RechartsTooltip cursor={{fill: '#334155', opacity: 0.4}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                    <Bar dataKey="value" fill="#3b82f6" name="Receita (R$)" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg overflow-y-auto custom-scrollbar h-full">
            <h3 className="text-slate-300 font-bold mb-6 flex items-center gap-2"><span>🏆</span> Top 5 Produtos Mais Vendidos</h3>
            <div className="space-y-4">
              {graficos.ranking_produtos?.length === 0 ? (
                 <p className="text-slate-500 text-center mt-10">Nenhum produto vendido ainda.</p>
              ) : (
                graficos.ranking_produtos?.map((prod, index) => (
                  <div key={index} className="bg-[#0f172a] p-4 rounded-xl border border-slate-700 flex justify-between items-center hover:border-blue-500/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-black text-slate-600 w-6 text-center">{index + 1}</span>
                      <div>
                        <h4 className="text-white font-medium text-sm line-clamp-1" title={prod.nome}>{prod.nome}</h4>
                        <p className="text-slate-400 text-xs mt-0.5">{prod.qtd} unidades vendidas</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-emerald-400 font-bold text-sm">R$ {Number(prod.receita).toFixed(2)}</p>
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