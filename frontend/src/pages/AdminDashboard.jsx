import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  // DADOS FALSOS (Mock) PARA OS GRÁFICOS
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
  
  // Cores para o Gráfico de Pizza
  const CORES = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0f172a] text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABEÇALHO */}
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Administrativo</h1>
          <p className="text-slate-400 mt-1">Visão estratégica do negócio</p>
        </div>

        {/* 1º ANDAR: CARDS DE INDICADORES GERAIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Receita */}
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">💲</div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-blue-400 bg-blue-500/10 p-2 rounded-lg text-xl">📈</span>
              <span className="text-emerald-400 text-sm font-bold flex items-center gap-1">↗ +12.5%</span>
            </div>
            <p className="text-slate-400 text-sm font-medium">Receita Mensal (Junho)</p>
            <h2 className="text-3xl font-bold text-white mt-1">R$ 67.000</h2>
          </div>

          {/* Lucro Líquido (Destaque Verde do Figma) */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-2xl shadow-lg shadow-emerald-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl text-white">💰</div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-white bg-white/20 p-2 rounded-lg text-xl">💎</span>
              <span className="text-emerald-100 text-sm font-bold flex items-center gap-1">↗ +15.2%</span>
            </div>
            <p className="text-emerald-100 text-sm font-medium">Lucro Líquido</p>
            <h2 className="text-3xl font-bold text-white mt-1">R$ 28.000</h2>
            <p className="text-emerald-200 text-xs mt-2">Margem de 41.8%</p>
          </div>

          {/* Ordens Pendentes */}
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">📋</div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-yellow-400 bg-yellow-500/10 p-2 rounded-lg text-xl">⏳</span>
              <span className="text-red-400 text-sm font-bold flex items-center gap-1">↘ -5.3%</span>
            </div>
            <p className="text-slate-400 text-sm font-medium">Ordens Pendentes</p>
            <h2 className="text-3xl font-bold text-white mt-1">23</h2>
            <p className="text-yellow-500/80 text-xs mt-2 font-bold">5 urgentes</p>
          </div>

          {/* Estoque Crítico (Alerta Vermelho) */}
          <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/30 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl text-red-500">⚠️</div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-red-400 bg-red-500/20 p-2 rounded-lg text-xl">📦</span>
              <span className="text-red-500 text-xs font-bold uppercase tracking-wider bg-red-500/20 px-2 py-1 rounded">Atenção</span>
            </div>
            <p className="text-red-400/80 text-sm font-medium">Estoque Crítico</p>
            <h2 className="text-3xl font-bold text-red-400 mt-1">8 itens</h2>
            <p className="text-red-500/80 text-xs mt-2">Necessita reposição</p>
          </div>
        </div>

        {/* 2º ANDAR: GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Gráfico de Barras (Ocupa 2 colunas) */}
          <div className="lg:col-span-2 bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
            <h3 className="text-slate-300 font-bold mb-6">Receita e Lucro (Últimos 6 meses)</h3>
            <div className="h-72 w-full">
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

          {/* Gráfico de Pizza (Ocupa 1 coluna) */}
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

        {/* 3º ANDAR: INDICADORES EXTRAS (Opcional do Figma) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 flex flex-col justify-center">
            <p className="text-slate-400 text-sm mb-1">Taxa de Conclusão</p>
            <div className="flex items-end gap-3 mb-2">
              <h3 className="text-2xl font-bold text-white">94.2%</h3>
              <span className="text-emerald-400 text-xs font-bold mb-1">+2.1%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '94.2%' }}></div>
            </div>
          </div>

          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 flex flex-col justify-center">
            <p className="text-slate-400 text-sm mb-1">Tempo Médio de Reparo</p>
            <div className="flex items-end gap-3 mb-1">
              <h3 className="text-2xl font-bold text-white">2.4h</h3>
              <span className="text-emerald-400 text-xs font-bold mb-1">-0.3h</span>
            </div>
            <p className="text-slate-500 text-xs">Melhoria de 11% este mês</p>
          </div>

          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 flex flex-col justify-center">
            <p className="text-slate-400 text-sm mb-1">Satisfação do Cliente</p>
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              4.8 <span className="text-slate-500 text-sm font-normal">/ 5.0</span>
            </h3>
            <div className="flex text-yellow-400 text-lg">
              ★★★★★ <span className="text-slate-600"></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}